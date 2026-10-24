import { Bookmark, CalendarDays, MapPin, Users, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { eventDistance, eventModeLabel, eventTypeLabel, formatEventDate, participationFit, priceLabel } from '../domain/events';
import { localityById } from '../domain/localities';
import { useApp } from '../state/AppContext';
import type { KnotEvent } from '../domain/types';
import { AgeBadge, FitBadge, SampleBadge } from './Badges';

const accents: Record<KnotEvent['eventType'], string> = {
  hackathon: '#7357d9', workshop: '#e66a3d', meetup: '#16866d', conference: '#3467c9',
  summit: '#ad5a92', competition: '#bd7b17', webinar: '#397f9e', community_session: '#59853b', other: '#64748b',
};

export function EventCard({ event, compact = false }: { event: KnotEvent; compact?: boolean }) {
  const { currentUser, filters, data, toggleSave } = useApp();
  const origin = localityById(filters.localityId);
  const distance = eventDistance(event, origin);
  const fit = participationFit(currentUser, event, origin);
  const saved = data.saves.some((save) => save.userId === currentUser?.id && save.eventId === event.id);
  const start = new Date(event.startAt);
  const day = new Intl.DateTimeFormat('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }).format(start);
  const month = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }).format(start);
  const location = event.mode === 'online' ? 'Online' : event.venue ? `${event.venue.name.replace('Sample venue · ', '')}` : 'Location pending';

  return (
    <article className={`event-card ${compact ? 'event-card--compact' : ''}`} style={{ '--event-accent': accents[event.eventType] } as CSSProperties}>
      <div className="event-card__accent" />
      <div className="event-card__topline">
        <span className="event-type">{eventTypeLabel(event.eventType)}</span>
        <div className="event-card__badges">{event.isSample && <SampleBadge />}</div>
      </div>
      <div className="event-card__body">
        <div className="date-tile" aria-hidden="true"><strong>{day}</strong><span>{month}</span></div>
        <div className="event-card__heading">
          <Link to={`/events/${event.id}`} className="event-card__title">{event.title}</Link>
          <span className="event-card__organizer">{event.organizerName}</span>
        </div>
        <button className={`icon-button save-button ${saved ? 'is-saved' : ''}`} onClick={() => toggleSave(event.id)} aria-label={saved ? `Remove ${event.title} from saved events` : `Save ${event.title}`} title={saved ? 'Saved' : 'Save event'}>
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      {!compact && <p className="event-card__summary">{event.summary}</p>}
      <div className="event-card__meta">
        <span><CalendarDays size={15} />{formatEventDate(event.startAt)}</span>
        <span>{event.mode === 'online' ? <Video size={15} /> : <MapPin size={15} />}{location}{distance !== null ? ` · ${distance.toFixed(1)} km` : ''}</span>
        {event.team.mode === 'team' && <span><Users size={15} />Teams {event.team.minSize}–{event.team.maxSize}</span>}
      </div>
      <div className="event-card__footer">
        <div className="event-card__tags"><AgeBadge rule={event.ageRule} /><FitBadge label={fit.label} /></div>
        <span className={`price ${event.price.kind === 'free' ? 'price--free' : ''}`}>{priceLabel(event)}</span>
      </div>
      <span className="sr-only">{eventModeLabel(event.mode)}</span>
    </article>
  );
}
