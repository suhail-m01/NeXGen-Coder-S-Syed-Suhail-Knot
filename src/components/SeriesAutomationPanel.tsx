import { CalendarClock, ExternalLink, Play, Plus, ShieldCheck, Square } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatEventDate } from '../domain/events';
import type { KnotEvent } from '../domain/types';
import { useApp } from '../state/AppContext';

const inputValue = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export function SeriesAutomationPanel({ event }: { event: KnotEvent }) {
  const { data, configureSeriesAutomation, stopSeriesAutomation, publishSeriesDraft } = useApp();
  const ownedSeries = data.series.filter((item) => item.organizerId === event.organizerId);
  const [seriesId, setSeriesId] = useState(event.seriesId ?? ownedSeries[0]?.id ?? '');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [nextAt, setNextAt] = useState(inputValue(new Date(Date.now() + 30 * 86_400_000)));
  const [occurrences, setOccurrences] = useState('3');
  const [message, setMessage] = useState('');
  const series = ownedSeries.find((item) => item.id === (event.seriesId || seriesId));
  const runs = data.seriesRuns.filter((run) => run.templateEventId === event.id || run.clonedEventId === event.id);
  return <div className="series-automation"><hr /><div className="section-mini-heading"><div><h3><CalendarClock /> Series draft automation</h3><p>Runs when this browser workspace opens or every 30 seconds while open. It does not run as a server job while closed.</p></div></div>
    <div className="form-grid"><label>Series<select value={seriesId} onChange={(input) => setSeriesId(input.target.value)}><option value="">Choose a series</option>{ownedSeries.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Frequency<select value={frequency} onChange={(input) => setFrequency(input.target.value as typeof frequency)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label>First draft occurrence<input type="datetime-local" value={nextAt} onChange={(input) => setNextAt(input.target.value)} /></label><label>Occurrences<input type="number" min="1" max="24" value={occurrences} onChange={(input) => setOccurrences(input.target.value)} /></label></div>
    <div className="button-row"><button className="button button--primary button--small" onClick={() => { try { configureSeriesAutomation(seriesId, event.id, frequency, new Date(nextAt).toISOString(), Number(occurrences)); setMessage('Automation saved. Due occurrences become private drafts for human review.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not configure automation.'); } }}><Play /> Start local automation</button>{series?.automation?.active && <button className="button button--ghost button--small" onClick={() => { try { stopSeriesAutomation(series.id); setMessage('Automation stopped.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not stop automation.'); } }}><Square /> Stop</button>}</div>
    {series?.automation && <p className="settings-note"><strong>{series.automation.active ? 'Active' : 'Stopped'}:</strong> {series.automation.occurrencesRemaining} remaining · next {formatEventDate(series.automation.nextAt)} · maximum three catch-up drafts per processing pass.</p>}{message && <p role="status" className="settings-note">{message}</p>}
    <div className="privacy-callout"><ShieldCheck /><div><strong>Clones never copy participant outcomes</strong><p>Registrations, passes, submissions, scores and consent records are separate repository collections. New drafts also reset the minor-safety checklist, joining link, recap and showcase.</p></div></div>
    {runs.length > 0 && <div className="series-runs"><h4>Automation history</h4>{runs.map((run) => { const clone = data.events.find((item) => item.id === run.clonedEventId); return <article key={run.id}><span><strong>{clone?.title ?? 'Removed draft'}</strong><small>{formatEventDate(run.scheduledFor)} · {clone?.status ?? 'removed'}</small></span>{clone && <><Link className="button button--ghost button--small" to={`/organizer/events/${clone.id}`}>Open <ExternalLink /></Link>{clone.status === 'draft' && <button className="button button--secondary button--small" onClick={() => { try { publishSeriesDraft(clone.id); setMessage('Series draft published.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not publish draft.'); } }}><Plus /> Publish reviewed draft</button>}</>}</article>; })}</div>}
  </div>;
}
