import { Activity, AlertCircle, CheckCircle2, Cpu, Layers, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getHackathonsStatus, type HackathonStatus } from '../features/hackathons/api';

function statusLabel(status: HackathonStatus | null, loading: boolean, error: string): string {
  if (loading && !status) return 'Checking Hackathon agent status…';
  if (error && !status) return 'Agent status unavailable';
  switch (status?.lastStatus) {
    case 'completed': return 'Last agent run completed';
    case 'running': return 'Agent run in progress';
    case 'failed': return 'Last agent run failed';
    case 'idle': return 'No agent run recorded';
    case 'unconfigured': return 'Agent status is not configured here';
    default: return 'Agent status unavailable';
  }
}

export function AutonomousHarvesterBar() {
  const [status, setStatus] = useState<HackathonStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshStatus = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const next = await getHackathonsStatus(signal);
      setStatus(next);
    } catch (reason) {
      if (signal?.aborted) return;
      setError(reason instanceof Error ? reason.message : 'Hackathon agent status is unavailable.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshStatus(controller.signal);
    return () => controller.abort();
  }, [refreshStatus]);

  const sources = Object.entries(status?.perSource ?? {});
  const healthy = status?.lastStatus === 'completed';

  return (
    <section className="autonomous-harvester-bar" aria-label="Hackathon agent status">
      <div className="harvester-header">
        <div className="harvester-live-indicator">
          <span className="harvester-pulse-dot" aria-hidden="true" />
          <span className="harvester-badge-text">HACKATHON AGENT STATUS</span>
          <span className="harvester-latency-badge">NO SIMULATED SYNC</span>
        </div>

        <div className="harvester-stats-strip">
          <span className="stat-pill"><Cpu size={13} /> {status?.totalUpcoming ?? 0} database listings</span>
          <span className="stat-pill"><Layers size={13} /> {sources.length} reporting sources</span>
          <span className="stat-pill">
            {healthy ? <CheckCircle2 size={13} /> : <Activity size={13} />}
            {statusLabel(status, loading, error)}
          </span>
        </div>

        <button
          type="button"
          className={`harvester-scan-btn ${loading ? 'is-scanning' : ''}`}
          onClick={() => void refreshStatus()}
          disabled={loading}
          title="Refresh the reported agent status; this does not start a source run"
        >
          <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
          {loading ? 'Refreshing status…' : 'Refresh status'}
        </button>
      </div>

      <div className="harvester-ticker-row">
        <div className="ticker-label"><Activity size={13} /><span>Reported state:</span></div>
        <div className="ticker-viewport">
          <div className="ticker-item active-ticker-item" role="status">
            <strong className="ticker-title">{statusLabel(status, loading, error)}</strong>
            <span className="ticker-meta">
              {status?.lastRunAt
                ? `Last recorded run: ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(status.lastRunAt))}`
                : 'No run timestamp is available.'}
              {' '}Source claims are not independent verification.
            </span>
          </div>
        </div>
        {sources.length > 0 && (
          <div className="portals-badges-group" aria-label="Database listings by source">
            {sources.map(([name, count]) => <span key={name} className="portal-mini-pill">{name}: {count}</span>)}
          </div>
        )}
      </div>

      {error && (
        <div className="harvester-scan-progress" role="alert">
          <p className="scan-step-text"><AlertCircle size={13} /> {error} No discovery run was started.</p>
        </div>
      )}
    </section>
  );
}
