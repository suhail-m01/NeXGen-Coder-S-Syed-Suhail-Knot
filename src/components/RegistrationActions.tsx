import { Check, Clock3, XCircle } from 'lucide-react';
import { waitlistPosition } from '../domain/registration';
import type { KnotEvent, Registration } from '../domain/types';
import { useApp } from '../state/AppContext';

export function RegistrationActions({ event, registration, onMessage, onError }: {
  event: KnotEvent;
  registration: Registration;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { data, reviewRegistration, checkInRegistration } = useApp();
  const fail = (reason: unknown) => onError(reason instanceof Error ? reason.message : 'The registration action could not be completed.');

  const review = (decision: 'approve' | 'reject') => {
    try {
      const result = reviewRegistration(registration.id, decision);
      onError('');
      onMessage(result === 'approved' ? 'Registration approved and confirmed.' : result === 'waitlisted' ? 'Registration reviewed. Confirmed capacity is full, so the applicant joined the waitlist.' : 'Registration review completed; the record was not accepted.');
    } catch (reason) { fail(reason); }
  };

  if (registration.status === 'pending') return <div className="registration-review-actions">
    <button className="button button--primary button--small" onClick={() => review('approve')}><Check /> Approve</button>
    <button className="button button--danger button--small" onClick={() => { if (window.confirm('Reject this pending registration?')) review('reject'); }}><XCircle /> Reject</button>
  </div>;

  if (registration.status === 'waitlisted') {
    const position = waitlistPosition(data.registrations, registration.id);
    return <div className="registration-review-actions"><span className="waitlist-position"><Clock3 />{position ? `#${position}` : 'Waitlisted'}</span><button className="button button--danger button--small" onClick={() => { if (window.confirm('Remove this waitlist entry?')) review('reject'); }}><XCircle /> Remove</button></div>;
  }

  if (registration.status === 'attended') return <span className="checked-in"><Check /> Checked in</span>;
  if (!['registered', 'approved'].includes(registration.status)) return <span className="muted-action">No actions</span>;

  const canCheckIn = Date.now() >= new Date(event.startAt).getTime() - 2 * 3_600_000
    && Date.now() <= new Date(event.endAt ?? event.startAt).getTime() + 12 * 3_600_000;
  return <button className="button button--secondary button--small" disabled={!canCheckIn} title={canCheckIn ? 'Record organizer check-in' : 'Check-in opens two hours before the event'} onClick={() => {
    try { checkInRegistration(registration.id); onError(''); onMessage('Organizer check-in recorded.'); }
    catch (reason) { fail(reason); }
  }}>Check in</button>;
}
