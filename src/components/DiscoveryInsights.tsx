import { BarChart3, ShieldCheck, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isCloudProvider } from '../data/supabase/client';
import { cloudDiscoveryOverview, type CloudDiscoveryOverview } from '../data/supabase/discovery';
import { discoveryOverview } from '../domain/discovery';
import { eventTypeLabel } from '../domain/events';
import { useApp } from '../state/AppContext';

export function DiscoveryInsights() {
  const { data, setFilters, filters } = useApp();
  const localOverview = discoveryOverview(data.events, data.registrations, data.saves, data.going);
  const [remote, setRemote] = useState<CloudDiscoveryOverview | null>(null);
  const [remoteError, setRemoteError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!isCloudProvider) return;
    let active = true;
    cloudDiscoveryOverview()
      .then((value) => { if (active) { setRemote(value); setRemoteError(''); } })
      .catch((reason: unknown) => { if (active) setRemoteError(reason instanceof Error ? reason.message : 'Aggregate overview unavailable.'); });
    return () => { active = false; };
  }, [revision]);

  const categories = isCloudProvider ? remote?.categories ?? [] : localOverview.categories;
  const trendingCount = isCloudProvider ? remote?.trending.length ?? 0 : localOverview.trending.length;
  return <section className="discovery-insights" aria-label="Catalog overview">
    <div className="discovery-insights__heading"><div><span className="eyebrow"><BarChart3 size={14} /> Aggregate discovery</span><h2>Browse the catalog by type</h2></div><span>Counts describe listings, not attendance.{isCloudProvider && <button className="button button--ghost button--small" onClick={() => setRevision((value) => value + 1)}>Refresh aggregates</button>}</span></div>
    {isCloudProvider && remoteError && <p role="alert">Cloud aggregate overview unavailable: {remoteError}</p>}
    <div className="discovery-category-stats">{categories.slice(0, 6).map((item) => <button key={item.eventType} className={filters.eventType === item.eventType ? 'active' : ''} onClick={() => setFilters({ ...filters, eventType: item.eventType })}><span>{eventTypeLabel(item.eventType)}</span><strong>{item.count}</strong></button>)}</div>
    <div className="discovery-trending"><div><TrendingUp size={17} /><span><strong>Aggregate trends</strong><small>Native confirmations, saves and self-declared Going stay separate. Groups below five are suppressed.</small></span></div>
      {isCloudProvider ? (trendingCount ? <div>{remote!.trending.slice(0, 3).map((item) => <Link to={`/events/${item.eventId}`} key={item.eventId}><strong>{item.title}</strong><small>{item.confirmedNative !== null ? `${item.confirmedNative} confirmed native` : 'Confirmed-native count suppressed'} · {item.saves !== null ? `${item.saves} saves` : 'Save count suppressed'}</small></Link>)}</div> : <p>No non-sample event has enough aggregate activity for a public trend yet.</p>)
        : (localOverview.trending.length ? <div>{localOverview.trending.slice(0, 3).map((item) => <Link to={`/events/${item.event.id}`} key={item.event.id}><strong>{item.event.title}</strong><small>{item.confirmedNative !== null ? `${item.confirmedNative} confirmed native` : 'Confirmed-native count suppressed'} · {item.saves !== null ? `${item.saves} saves` : 'Save count suppressed'}</small></Link>)}</div> : <p>No non-sample event has enough aggregate activity for a public trend yet.</p>)}
    </div>
    <p className="discovery-privacy"><ShieldCheck size={14} /> No per-user activity, external clicks or self-confirmed external registrations become public trend evidence.</p>
  </section>;
}
