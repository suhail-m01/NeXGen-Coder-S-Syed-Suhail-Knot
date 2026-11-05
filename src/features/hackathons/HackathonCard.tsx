import { ArrowUpRight, CalendarDays, CheckCircle2, Flag, Info, MapPin, Users, Video } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { useApp } from '../../state/AppContext';
import { recordHackathonInterest, reportHackathonUrl } from './api';
import { formatHackathonPrice, formatHackathonRange, hackathonLocation } from './format';
import { saveLocalHackathonInterest } from './interestStore';
import type { Hackathon, InterestContext } from './types';

interface HackathonCardProps {
  hackathon: Hackathon;
  context?: InterestContext;
  compact?: boolean;
  onGuestContinue?: () => void;
  onSaved?: (id: string) => void;
}

export function HackathonCard({ hackathon, context = 'web', compact = false, onGuestContinue, onSaved }: HackathonCardProps) {
  const { currentUser } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const start = new Date(hackathon.startDate);
  const day = new Intl.DateTimeFormat('en-IN', { day: '2-digit', timeZone: hackathon.timezone ?? 'UTC' }).format(start);
  const month = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: hackathon.timezone ?? 'UTC' }).format(start);

  const handleInterested = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setMessage('');
    setHandoffUrl(null);
    // Open in the user gesture before the network request so popup blockers do not block a valid handoff.
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    setBusy(true);
    try {
      const result = await recordHackathonInterest(hackathon.id, context);
      if (currentUser && !result.saved) {
        saveLocalHackathonInterest(currentUser.id, hackathon.id);
        onSaved?.(hackathon.id);
      }
      if (popup && !popup.closed) {
        popup.location.href = result.officialUrl;
        popup.focus();
      } else {
        setHandoffUrl(result.officialUrl);
      }
      if (currentUser) setMessage(result.saved ? 'Interested saved. Opening the official site.' : 'Interested saved on this device. Opening the official site.');
      else {
        setMessage('Opening the official site. Sign in to keep this in My Interests.');
        onGuestContinue?.();
      }
    } catch (caught) {
      popup?.close();
      setError(caught instanceof Error ? caught.message : 'Interest could not be recorded. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`hackathon-card ${compact ? 'hackathon-card--compact' : ''}`} aria-labelledby={`hackathon-title-${hackathon.id}`}>
      {hackathon.imageUrl && !imageFailed && <div className="hackathon-card__media"><img src={hackathon.imageUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} /></div>}
      <div className="hackathon-card__content">
        <div className="hackathon-card__topline"><span className="hackathon-card__type">{hackathon.status === 'ongoing' ? 'Happening now' : 'Hackathon'}</span><span className="hackathon-card__source">via {hackathon.sourcePlatform}</span></div>
        <div className="hackathon-card__heading">
          <div className="hackathon-card__date" aria-hidden="true"><strong>{day}</strong><span>{month}</span></div>
          <div><h3 id={`hackathon-title-${hackathon.id}`}>{hackathon.title}</h3><p className="hackathon-card__organizer">{hackathon.organizer ?? 'Organizer not stated'}</p></div>
        </div>
        {!compact && hackathon.description && <p className="hackathon-card__description">{hackathon.description}</p>}
        <div className="hackathon-card__meta">
          <span><CalendarDays size={15} />{formatHackathonRange(hackathon)}</span>
          <span>{hackathon.mode === 'online' ? <Video size={15} /> : <MapPin size={15} />}{hackathonLocation(hackathon)}</span>
          {hackathon.teamSize && <span><Users size={15} />{hackathon.teamSize} <small>(source-reported)</small></span>}
        </div>
        {hackathon.tags.length > 0 && <div className="hackathon-card__tags">{hackathon.tags.slice(0, compact ? 2 : 4).map((tag) => <span key={tag}>{tag}</span>)}</div>}
        <div className="hackathon-card__footer"><span className={`hackathon-card__price ${hackathon.isFree === true ? 'is-free' : ''}`}>{formatHackathonPrice(hackathon)}</span><a className="button button--primary button--small" href={hackathon.officialUrl} target="_blank" rel="noopener noreferrer" onClick={handleInterested} aria-busy={busy}>{busy ? 'Recording…' : 'Interested'}<ArrowUpRight size={15} /></a></div>
        <div className="hackathon-card__trust"><span>{hackathon.officialUrlVerified ? <><CheckCircle2 size={13} /> Organizer-domain link checked</> : <><Info size={13} /> Official site not independently verified</>}</span><a href={reportHackathonUrl(hackathon)} className="hackathon-card__report" title="Opens a draft correction email; no report is sent automatically"><Flag size={12} /> Report incorrect info</a></div>
        {(message || error || handoffUrl) && <div className={`hackathon-card__handoff ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error || message}{handoffUrl && <a href={handoffUrl} target="_blank" rel="noopener noreferrer" onClick={handleInterested}>Open official site <ArrowUpRight size={13} /></a>}</div>}
      </div>
    </article>
  );
}
