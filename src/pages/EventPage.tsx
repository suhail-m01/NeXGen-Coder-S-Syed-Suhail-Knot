import { AlertTriangle, ArrowLeft, ArrowUpRight, Bookmark, CalendarDays, Check, CheckCircle2, Clock3, Download, ExternalLink, Flag, Info, Link2, MapPin, Share2, ShieldCheck, Users, Video } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AgeBadge, FitBadge, SampleBadge } from '../components/Badges';
import { EventCard } from '../components/EventCard';
import { LocalityMap } from '../components/LocalityMap';
import { ParticipantCheckInPass } from '../components/ParticipantCheckInPass';
import { ageRuleLabel, participationDecision } from '../domain/age';
import { eventDistance, eventModeLabel, eventToICS, eventTypeLabel, formatEventDate, participationFit, priceLabel } from '../domain/events';
import { localityById } from '../domain/localities';
import { waitlistPosition } from '../domain/registration';
import { canManageEvent, registrationAnswerErrors } from '../domain/operations';
import type { RegistrationStatus } from '../domain/types';
import { useApp } from '../state/AppContext';

const EventEngagement = lazy(() => import('../components/EventEngagement').then((module) => ({ default: module.EventEngagement })));

export function EventPage() {
  const { eventId } = useParams();
  const { data, currentUser, filters, toggleSave, participate, selfConfirmExternal, toggleFollow, cancelRegistration } = useApp();
  const event = data.events.find((candidate) => candidate.id === eventId || candidate.slug === eventId);
  const [selfDeclared, setSelfDeclared] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  if (!event) return <div className="page-container"><div className="empty-state"><h1>Event not found</h1><p>It may have been removed or the link may be incorrect.</p><Link className="button button--primary" to="/search">Back to discovery</Link></div></div>;
  if (event.visibility === 'private' && !canManageEvent(currentUser, event)) return <div className="page-container"><div className="empty-state"><ShieldCheck size={30} /><h1>Private event</h1><p>Only authorized event managers can open this private operations listing.</p><Link className="button button--primary" to="/search">Back to discovery</Link></div></div>;

  const origin = localityById(filters.localityId);
  const fit = participationFit(currentUser, event, origin);
  const distance = eventDistance(event, origin);
  const decision = participationDecision(currentUser, event);
  const saved = data.saves.some((save) => save.userId === currentUser?.id && save.eventId === event.id);
  const following = data.follows.some((follow) => follow.userId === currentUser?.id && follow.communityId === event.communityId);
  const registration = data.registrations.find((item) => item.userId === currentUser?.id && item.eventId === event.id && !['cancelled', 'rejected'].includes(item.status));
  const primaryListing = event.listings.find((listing) => listing.isPrimary) ?? event.listings[0];
  const externalHost = event.registration.externalUrl ? new URL(event.registration.externalUrl).hostname.replace('www.', '') : primaryListing?.source ?? 'original site';
  const nextEvent = data.events.find((candidate) => candidate.communityId === event.communityId && candidate.id !== event.id && new Date(candidate.startAt).getTime() > Date.now());
  const lastCheckedHours = Math.max(0, Math.floor((Date.now() - new Date(event.lastCheckedAt).getTime()) / 3_600_000));
  const position = registration ? waitlistPosition(data.registrations, registration.id) : null;
  const nativeCopy = registration?.kind === 'native' ? nativeRegistrationCopy(registration.status, position) : null;
  const canCancel = registration?.kind === 'native' && ['registered', 'approved', 'pending', 'waitlisted'].includes(registration.status);

  const register = () => {
    const nextAnswerErrors = event.registration.kind === 'native' ? registrationAnswerErrors(event.registration.questions ?? [], answers) : {};
    setAnswerErrors(nextAnswerErrors);
    if (Object.keys(nextAnswerErrors).length) { setMessage('Complete the required registration answers before continuing.'); return; }
    const result = participate(event, selfDeclared, answers);
    const messages: Record<string, string> = {
      answers_required: 'Complete the required registration answers before continuing.',
      opened_externally: `Opened ${externalHost}. Knot has recorded a handoff, not a completed registration.`,
      open_blocked: 'Your browser blocked the registration tab. Allow pop-ups or use the original-listing link below; no handoff was recorded.',
      registered: 'You are registered. It has been added to My Plan.',
      pending: 'Your registration is pending organizer review.',
      waitlisted: 'You joined the waitlist. This is not a confirmed registration.',
      duplicate: 'You already have a participation record for this event.',
      check_rule: 'Confirm that you meet the stated age rule before continuing.',
      cannot_join: 'Your self-declared age band is outside this event’s rule.',
      needs_consent: 'Guardian consent must be completed before participation.',
      not_open_yet: event.registrationOpensAt && new Date(event.registrationOpensAt).getTime() > Date.now()
        ? `Registration opens ${formatEventDate(event.registrationOpensAt, true)}.`
        : 'Native minor participation is not open until the organizer safety gate is complete.',
      closed: 'Registration is closed for this event.',
    };
    setMessage(messages[result] ?? '');
  };

  const downloadCalendar = () => {
    const blob = new Blob([eventToICS(event)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${event.slug}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Calendar file downloaded. Check the event time and timezone in your calendar.');
  };

  const share = async () => {
    const shareData = { title: event.title, text: `${event.title} — ${formatEventDate(event.startAt)}. Details on Knot.`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`); setMessage('Share text and event link copied.'); }
    } catch { /* A dismissed share sheet needs no error state. */ }
  };

  return (
    <div className="event-page">
      <div className="page-container event-page__breadcrumb"><Link to="/search"><ArrowLeft size={16} /> Back to discovery</Link><span>/</span><span>{eventTypeLabel(event.eventType)}</span></div>
      <section className="event-hero">
        <div className="page-container event-hero__inner">
          <div className="event-hero__main">
            <div className="event-hero__badges"><span className="event-type">{eventTypeLabel(event.eventType)}</span>{event.isSample && <SampleBadge />}<AgeBadge rule={event.ageRule} />{event.status === 'stale' && <span className="badge badge--warning">Source may be stale</span>}{event.status === 'cancelled' && <span className="badge badge--warning">Cancelled</span>}</div>
            <h1>{event.title}</h1>
            <p>{event.tagline}</p>
            <Link to={`/communities/${event.communityId}`} className="organizer-line"><span className="organizer-line__avatar">{event.organizerName.slice(0, 1)}</span><span>Hosted by <strong>{event.organizerName}</strong></span><ArrowUpRight size={15} /></Link>
          </div>
          <div className="event-hero__date"><span>{new Intl.DateTimeFormat('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(new Date(event.startAt))}</span><strong>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }).format(new Date(event.startAt))}</strong><span>{new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(event.startAt))} IST</span></div>
        </div>
      </section>

      <div className="page-container event-layout">
        <div className="event-main">
          {event.isSample && <div className="sample-callout"><FlaskIcon /><div><strong>This is sample event data</strong><p>It exists to test the product experience and is not a real event announcement.</p></div></div>}
          <section className="event-section">
            <h2>Why this event</h2><p className="event-description">{event.description}</p>
            <div className="tag-list">{event.interests.map((interest) => <span key={interest}>{interest}</span>)}{event.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          </section>

          <section className="event-section">
            <h2>Participation details</h2>
            <div className="detail-grid">
              <div><Users /><span><strong>Who can join</strong>{ageRuleLabel(event.ageRule)}{event.eligibilityText ? ` · ${event.eligibilityText}` : ' · Other eligibility not stated'}</span></div>
              <div><ShieldCheck /><span><strong>Team format</strong>{event.team.mode === 'team' ? `Teams of ${event.team.minSize}–${event.team.maxSize}` : event.team.mode === 'solo' ? 'Solo participation' : event.team.mode === 'solo_or_team' ? 'Solo or team' : 'Team rule not stated'}</span></div>
              <div><CheckCircle2 /><span><strong>Experience</strong>{event.experienceLevel === 'all' ? 'All experience levels' : event.experienceLevel === 'not_stated' ? 'Not stated' : event.experienceLevel}</span></div>
              <div><Flag /><span><strong>Price</strong>{priceLabel(event)}{event.price.note ? ` · ${event.price.note}` : ''}</span></div>
            </div>
          </section>

          <section className="event-section">
            <h2>Timeline</h2>
            <div className="timeline">
              {event.registrationDeadline && <div><span className="timeline__dot" /><div><strong>Registration closes</strong><span>{formatEventDate(event.registrationDeadline, true)}</span></div></div>}
              <div><span className="timeline__dot timeline__dot--active" /><div><strong>Event starts</strong><span>{formatEventDate(event.startAt, true)}</span></div></div>
              {event.endAt && <div><span className="timeline__dot" /><div><strong>Event ends</strong><span>{formatEventDate(event.endAt, true)}</span></div></div>}
              {event.submissionDeadline && <div><span className="timeline__dot" /><div><strong>Submission deadline</strong><span>{formatEventDate(event.submissionDeadline, true)}</span></div></div>}
            </div>
          </section>

          {event.prizes.length > 0 && <section className="event-section"><h2>Prizes & rewards</h2><ul className="prize-list">{event.prizes.map((prize) => <li key={prize}><Check size={17} />{prize}</li>)}</ul></section>}

          {event.mode !== 'online' && <section className="event-section"><h2>Location</h2><div className="venue-card"><MapPin /><div><strong>{event.venue?.name ?? 'Location pending'}</strong><p>{event.venue?.address}</p><span>{event.venue?.locationPrecision === 'locality' ? 'Area marker — exact venue pin not confirmed' : `${event.venue?.locationPrecision} location`}{distance !== null ? ` · about ${distance.toFixed(1)} km from ${origin?.name}` : ''}</span></div></div><LocalityMap events={[event]} origin={origin} /></section>}

          <section className="event-section source-section">
            <div className="section-title-row"><h2>Source & freshness</h2><span className="freshness"><span className="live-dot" /> Checked {lastCheckedHours < 1 ? 'within the last hour' : `${lastCheckedHours}h ago`}</span></div>
            <p>Knot keeps canonical event details connected to their original listings. Source-linked does not mean safety-verified.</p>
            <div className="listing-list">{event.listings.map((listing) => <div className="listing-row" key={listing.id}><div><Link2 size={17} /><span><strong>{listing.source}{listing.isPrimary ? ' · Primary' : ''}</strong><small>First seen {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(listing.firstDiscoveredAt))} · {listing.confidence} confidence</small></span></div>{listing.originalUrl.startsWith('http') ? <a href={listing.originalUrl} target="_blank" rel="noreferrer">Original listing <ExternalLink size={14} /></a> : <span className="native-source">Knot native</span>}</div>)}</div>
            {event.revisions.length > 0 && <div className="revision-list"><h3>Change history</h3>{event.revisions.map((revision) => <div key={revision.id}><Clock3 size={15} /><span><strong>{revision.summary}</strong><small>{formatEventDate(revision.at, true)}</small></span></div>)}</div>}
          </section>
        </div>

        <aside className="participation-card">
          <div className="participation-card__price"><span>{priceLabel(event)}</span><small>{eventModeLabel(event.mode)}</small></div>
          <div className="participation-card__meta"><span><CalendarDays />{formatEventDate(event.startAt, true)}</span><span>{event.mode === 'online' ? <Video /> : <MapPin />}{event.mode === 'online' ? 'Online event' : event.venue?.name}</span>{event.registrationDeadline && <span><Clock3 />Register by {formatEventDate(event.registrationDeadline)}</span>}{event.registration.kind === 'native' && <span><Users />{event.registration.capacity === null ? 'Open capacity' : `Capacity ${event.registration.capacity}`}{event.registration.approval === 'manual' ? ' · Organizer review' : ''}{event.registration.waitlistEnabled ? ' · Waitlist available' : ''}</span>}</div>
          {fit.label && <div className={`fit-explanation fit-explanation--${fit.label}`}><FitBadge label={fit.label} /><ul>{fit.reasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}</ul></div>}
          {!currentUser && <div className="auth-note"><Info size={16} /><span>You can browse freely. Sign-in is required only when you register, join, save or publish.</span></div>}
          {event.status === 'cancelled' && <div className="eligibility-notice"><AlertTriangle size={18} /><span>This event was cancelled by its organizer. Existing records are preserved for reference.</span></div>}
          {decision === 'check_rule' && currentUser && <label className="check-rule"><input type="checkbox" checked={selfDeclared} onChange={(input) => setSelfDeclared(input.target.checked)} /><span>I confirm that I meet the age rule: <strong>{ageRuleLabel(event.ageRule)}</strong>. This is self-declared.</span></label>}
          {!registration && event.registration.kind === 'native' && (event.registration.questions?.length ?? 0) > 0 && <div className="registration-questions"><h3>Registration questions</h3><p>Your answers are private operational data for this event’s organizer, not public profile or behavioural analytics.</p>{event.registration.questions!.map((question) => <label key={question.id}>{question.label}{question.required && <em>Required</em>}{question.kind === 'long_text' ? <textarea rows={3} value={answers[question.id] ?? ''} onChange={(input) => setAnswers({ ...answers, [question.id]: input.target.value })} /> : question.kind === 'single_choice' ? <select value={answers[question.id] ?? ''} onChange={(input) => setAnswers({ ...answers, [question.id]: input.target.value })}><option value="">Choose an answer</option>{question.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input value={answers[question.id] ?? ''} onChange={(input) => setAnswers({ ...answers, [question.id]: input.target.value })} />}{answerErrors[question.id] && <small className="field-error">{answerErrors[question.id]}</small>}</label>)}</div>}
          {registration ? <div className="registration-state">{['pending', 'waitlisted'].includes(registration.status) ? <Clock3 /> : <CheckCircle2 />}<div><strong>{registration.status === 'opened_externally' ? 'Registration page opened' : registration.status === 'self_confirmed_registered' ? 'Registration self-confirmed' : registration.status === 'registered' ? 'You’re registered' : nativeCopy?.title ?? registration.status}</strong><p>{registration.kind === 'external' ? 'External registration is completed on the original platform.' : nativeCopy?.body ?? 'Your native participation record is in My Plan.'}</p></div></div> : <>
            {decision === 'cannot_join' || decision === 'needs_consent' || decision === 'not_open_yet' || decision === 'closed' ? <div className="eligibility-notice"><AlertTriangle size={18} /><span>{decision === 'cannot_join' ? 'This event’s age rule does not include your age band. You can still read its public details.' : decision === 'needs_consent' ? 'Guardian consent is required before participation.' : decision === 'not_open_yet' ? (event.registrationOpensAt && new Date(event.registrationOpensAt).getTime() > Date.now() ? `Registration opens ${formatEventDate(event.registrationOpensAt, true)}.` : 'Native minor participation is not open yet.') : 'Registration is currently closed.'}</span></div> : <button className="button button--primary button--full button--large" onClick={register}>{decision === 'auth_required' ? 'Sign in to register' : event.registration.kind === 'external' ? `Register on ${externalHost}` : decision === 'check_rule' ? 'Confirm & register' : 'Register on Knot'}<ArrowUpRight size={18} /></button>}
          </>}
          {canCancel && registration && <button className="button button--ghost button--full" onClick={() => { if (window.confirm(registration.status === 'waitlisted' ? 'Leave this waitlist?' : 'Cancel this native participation record?')) { cancelRegistration(registration.id); setMessage(registration.status === 'waitlisted' ? 'You left the waitlist.' : 'Your native participation record was cancelled. Any available confirmed spot was handled by the waitlist rules.'); } }}>Cancel {registration.status === 'waitlisted' ? 'waitlist entry' : registration.status === 'pending' ? 'registration request' : 'registration'}</button>}
          {registration?.kind === 'external' && registration.status === 'opened_externally' && <button className="button button--secondary button--full" onClick={() => { selfConfirmExternal(event.id); setMessage('Marked as self-confirmed by you. Knot cannot verify the external registration.'); }}>I completed external registration</button>}
          {registration?.kind === 'native' && ['registered', 'approved', 'checked_in', 'attended'].includes(registration.status) && event.onlineJoinUrl && <a className="button button--accent button--full" href={event.onlineJoinUrl} target="_blank" rel="noreferrer">Open joining link <ExternalLink size={16} /></a>}
          {registration?.kind === 'native' && ['registered', 'approved'].includes(registration.status) && <ParticipantCheckInPass event={event} registration={registration} />}
          <div className="participation-actions"><button className={saved ? 'is-saved' : ''} onClick={() => toggleSave(event.id)}><Bookmark fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved' : 'Save'}</button><button onClick={downloadCalendar}><Download /> Calendar</button><button onClick={share}><Share2 /> Share</button></div>
          <button className="follow-button" onClick={() => toggleFollow(event.communityId)}><Users size={16} />{following ? `Following ${event.organizerName}` : `Follow ${event.organizerName}`}</button>
          {message && <div className="action-message" role="status">{message}</div>}
          <p className="participation-card__footnote">External clicks are handoffs, not proof of registration. Age information is self-declared.</p>
        </aside>
      </div>

      <Suspense fallback={<div className="page-container"><p>Loading participation tools…</p></div>}><EventEngagement event={event} registration={registration} /></Suspense>

      {nextEvent && <section className="page-container next-event-section"><div className="section-heading"><div><span className="eyebrow">Keep the connection</span><h2>Next from {event.organizerName}</h2></div></div><div className="event-grid event-grid--single"><EventCard event={nextEvent} compact /></div></section>}
    </div>
  );
}

function nativeRegistrationCopy(status: RegistrationStatus, position: number | null) {
  if (status === 'pending') return { title: 'Registration pending', body: 'Organizer review is pending. This is not a confirmed registration.' };
  if (status === 'approved') return { title: 'Registration approved', body: 'The organizer approved your registration. Your native spot is confirmed.' };
  if (status === 'waitlisted') return { title: position ? `Waitlist position ${position}` : 'You’re waitlisted', body: 'This is not a confirmed registration. Promotion depends on a confirmed spot opening.' };
  if (status === 'checked_in') return { title: 'Checked in', body: 'The organizer recorded your check-in.' };
  if (status === 'attended') return { title: 'Organizer check-in recorded', body: 'Attendance is verified only by this organizer check-in record.' };
  return { title: status.replaceAll('_', ' '), body: 'Your native participation record is in My Plan.' };
}

function FlaskIcon() {
  return <Info size={22} />;
}
