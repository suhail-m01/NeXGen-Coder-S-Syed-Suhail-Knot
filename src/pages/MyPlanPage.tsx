import { ArrowRight, Bookmark, CalendarDays, CheckCircle2, Download, MapPin, MessageSquareText, Star, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { communitiesFromEvents } from '../domain/communities';
import { eventToICS, formatEventDate, priceLabel } from '../domain/events';
import { localityById } from '../domain/localities';
import { useApp } from '../state/AppContext';
import type { KnotEvent, Registration } from '../domain/types';

const statusLabel = (status: Registration['status']) => ({
  opened_externally: 'External site opened · not registered on Knot',
  self_confirmed_registered: 'Self-confirmed externally · not independently verified',
  registered: 'Registered on Knot', pending: 'Registration pending', approved: 'Approved',
  waitlisted: 'Waitlisted', rejected: 'Not accepted', cancelled: 'Cancelled', checked_in: 'Checked in', attended: 'Organizer check-in recorded',
})[status];

function PlanEvent({ event, registration, onFeedback, feedbackGiven }: { event: KnotEvent; registration?: Registration; onFeedback: (rating: number, comment: string) => void; feedbackGiven: boolean }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const past = new Date(event.endAt ?? event.startAt).getTime() < Date.now();
  const download = () => {
    const url = URL.createObjectURL(new Blob([eventToICS(event)], { type: 'text/calendar' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${event.slug}.ics`; anchor.click(); URL.revokeObjectURL(url);
  };
  return <article className="plan-event">
    <div className="plan-event__date"><CalendarDays /><span>{formatEventDate(event.startAt)}</span></div>
    <div className="plan-event__main"><Link to={`/events/${event.id}`}><h3>{event.title}</h3></Link><p><MapPin size={14} />{event.mode === 'online' ? 'Online' : `${event.venue?.name.replace('Sample venue · ', '')}, ${localityById(event.venue?.localityId)?.name ?? 'Bengaluru'}`}</p>{registration && <span className={`registration-status registration-status--${registration.status}`}><CheckCircle2 size={14} />{statusLabel(registration.status)}</span>}</div>
    <div className="plan-event__side"><span>{priceLabel(event)}</span><div><button className="icon-button" onClick={download} title="Download calendar"><Download size={17} /></button><Link className="icon-button" to={`/events/${event.id}`} title="Open event"><ArrowRight size={17} /></Link></div></div>
    {past && registration && ['registered', 'approved', 'checked_in', 'attended', 'self_confirmed_registered'].includes(registration.status) && <div className="plan-feedback">{feedbackGiven ? <span><CheckCircle2 /> Feedback shared. Thank you.</span> : !feedbackOpen ? <button className="text-button" onClick={() => setFeedbackOpen(true)}><MessageSquareText size={16} /> Share post-event feedback</button> : <div className="feedback-form"><strong>How was this event?</strong><div className="rating-buttons" aria-label="Rating">{[1, 2, 3, 4, 5].map((value) => <button key={value} className={rating >= value ? 'selected' : ''} onClick={() => setRating(value)} aria-label={`${value} star${value > 1 ? 's' : ''}`}><Star fill="currentColor" /></button>)}</div><textarea rows={3} value={comment} onChange={(item) => setComment(item.target.value)} placeholder="What should the organizer keep or improve?" /><small>{registration.status === 'attended' ? 'Your organizer check-in is recorded.' : 'You registered, but attendance is not independently verified.'}</small>{error && <span className="field-error">{error}</span>}<div className="button-row"><button className="button button--primary button--small" onClick={() => { try { onFeedback(rating, comment); setFeedbackOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save feedback.'); } }}>Send feedback</button><button className="button button--ghost button--small" onClick={() => setFeedbackOpen(false)}>Cancel</button></div></div>}</div>}
  </article>;
}

export function MyPlanPage() {
  const { currentUser, data, toggleFollow, submitFeedback } = useApp();
  const [tab, setTab] = useState<'schedule' | 'saved' | 'following'>('schedule');
  const communities = useMemo(() => communitiesFromEvents(data.events), [data.events]);
  if (!currentUser) return <Navigate to="/auth?returnTo=%2Fplan&action=view%20your%20plan" replace />;

  const registrations = data.registrations.filter((item) => item.userId === currentUser.id);
  const registrationItems = registrations.map((registration) => ({ registration, event: data.events.find((event) => event.id === registration.eventId) })).filter((item): item is { registration: Registration; event: KnotEvent } => Boolean(item.event)).sort((a, b) => a.event.startAt.localeCompare(b.event.startAt));
  const upcoming = registrationItems.filter((item) => new Date(item.event.endAt ?? item.event.startAt).getTime() >= Date.now() && !['cancelled', 'rejected'].includes(item.registration.status));
  const past = registrationItems.filter((item) => new Date(item.event.endAt ?? item.event.startAt).getTime() < Date.now());
  const saved = data.events.filter((event) => data.saves.some((save) => save.userId === currentUser.id && save.eventId === event.id));
  const followed = communities.filter((community) => data.follows.some((follow) => follow.userId === currentUser.id && follow.communityId === community.id));

  return <div className="page-container plan-page">
    <div className="page-heading"><div><span className="eyebrow">Your Knot</span><h1>My plan</h1><p>Registrations, saved possibilities and communities you want to return to.</p></div><Link to="/search" className="button button--primary">Find something to join <ArrowRight size={17} /></Link></div>
    <div className="plan-stats"><div><strong>{upcoming.length}</strong><span>Upcoming participation records</span></div><div><strong>{saved.length}</strong><span>Saved events</span></div><div><strong>{followed.length}</strong><span>Followed communities</span></div></div>
    <div className="plan-tabs" role="tablist"><button className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}><CalendarDays /> Schedule <span>{registrations.length}</span></button><button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}><Bookmark /> Saved <span>{saved.length}</span></button><button className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}><Users /> Following <span>{followed.length}</span></button></div>
    {tab === 'schedule' && <div className="plan-schedule">
      <section><div className="section-mini-heading"><h2>Coming up</h2><span>External handoffs are clearly separated from confirmed native registrations.</span></div>{upcoming.length ? <div className="plan-event-list">{upcoming.map(({ event, registration }) => <PlanEvent key={registration.id} event={event} registration={registration} feedbackGiven={false} onFeedback={() => undefined} />)}</div> : <EmptyState icon={<CalendarDays />} title="Your schedule is open" body="Save an event or complete a participation action to build your plan." action={<Link className="button button--primary" to="/search">Explore events</Link>} />}</section>
      {past.length > 0 && <section><div className="section-mini-heading"><h2>Past events & feedback</h2><span>Feedback never turns a registration into verified attendance.</span></div><div className="plan-event-list">{past.map(({ event, registration }) => <PlanEvent key={registration.id} event={event} registration={registration} feedbackGiven={data.feedback.some((item) => item.eventId === event.id && item.userId === currentUser.id)} onFeedback={(rating, comment) => submitFeedback(event.id, rating, comment)} />)}</div></section>}
    </div>}
    {tab === 'saved' && (saved.length ? <div className="event-grid">{saved.map((event) => <EventCard key={event.id} event={event} />)}</div> : <EmptyState icon={<Bookmark />} title="No saved events yet" body="Use the bookmark on any event card. Saving requires an account; browsing does not." action={<Link className="button button--primary" to="/search">Find events</Link>} />)}
    {tab === 'following' && (followed.length ? <div className="community-grid">{followed.map((community) => <article className="community-card" key={community.id}><div className="community-card__avatar">{community.name.slice(0, 1)}</div><span className="eyebrow">{community.isSample ? 'Sample community' : 'Community'}</span><h3>{community.name}</h3><p>{community.description}</p><div className="community-card__tags">{community.interests.slice(0, 3).map((interest) => <span key={interest}>{interest}</span>)}</div><div className="community-card__footer"><Link to={`/communities/${community.id}`}>Open community <ArrowRight size={15} /></Link><button className="text-button" onClick={() => toggleFollow(community.id)}>Unfollow</button></div></article>)}</div> : <EmptyState icon={<Users />} title="Follow a community to see it here" body="Open a community from any event and follow it for an easier return path." action={<Link className="button button--primary" to="/search">Discover communities</Link>} />)}
  </div>;
}
