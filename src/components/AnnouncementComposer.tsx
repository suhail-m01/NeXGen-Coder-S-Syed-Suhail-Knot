import { AlertCircle, CheckCircle2, Eye, Megaphone, Send, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { announcementAudienceLabels, announcementKindLabels, resolveAnnouncementAudience } from '../domain/announcements';
import { formatEventDate } from '../domain/events';
import type { AnnouncementAudience, AnnouncementKind, KnotEvent } from '../domain/types';
import { useApp } from '../state/AppContext';

export function AnnouncementComposer({ event }: { event: KnotEvent }) {
  const { data, sendAnnouncement } = useApp();
  const [kind, setKind] = useState<AnnouncementKind>('general');
  const [audience, setAudience] = useState<AnnouncementAudience>('confirmed');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const resolution = useMemo(
    () => resolveAnnouncementAudience(event.id, audience, data.registrations, data.users),
    [event.id, audience, data.registrations, data.users],
  );
  const history = useMemo(
    () => data.announcements.filter((announcement) => announcement.eventId === event.id),
    [data.announcements, event.id],
  );

  useEffect(() => { setMessage(''); setError(''); }, [event.id]);

  const submit = (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setMessage(''); setError('');
    try {
      const sent = sendAnnouncement(event.id, { kind, audience, subject, body, scheduledFor: scheduledFor || null });
      setMessage(sent.status === 'scheduled' ? `In-app announcement scheduled for ${formatEventDate(sent.scheduledFor!, true)}. Recipients and opt-outs will be checked again at delivery time.` : `In-app announcement sent to ${sent.recipientCount} of ${sent.audienceCount} matching participants. ${sent.optedOutCount} opted out.`);
      setSubject(''); setBody(''); setScheduledFor('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send the announcement.');
    }
  };

  return <div className="communications-layout">
    <section className="panel communication-composer">
      <div className="panel__heading"><div><span className="eyebrow">Targeted communication</span><h2><Megaphone size={21} /> New announcement</h2><p>Preview the exact audience and message before creating in-app delivery records.</p></div></div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>Update type<select value={kind} onChange={(change) => { setKind(change.target.value as AnnouncementKind); setError(''); setMessage(''); }}>{Object.entries(announcementKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Audience<select value={audience} onChange={(change) => { setAudience(change.target.value as AnnouncementAudience); setError(''); setMessage(''); }}>{Object.entries(announcementAudienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="audience-preview"><Users size={19} /><div><strong>{resolution.audienceCount} matching native {resolution.audienceCount === 1 ? 'participant' : 'participants'}</strong><span>{resolution.recipients.length} in-app {resolution.recipients.length === 1 ? 'recipient' : 'recipients'} after opt-outs · {resolution.optedOutCount} opted out</span></div></div>
        <p className="field-note">Rejected, cancelled and external-handoff records are not active native participants. Duplicate registrations resolve to one recipient.</p>
        <label>Subject<input value={subject} maxLength={100} onChange={(change) => { setSubject(change.target.value); setError(''); setMessage(''); }} placeholder="A clear, specific update" /><small>{subject.length}/100 characters</small></label>
        <label>Message<textarea value={body} maxLength={1200} onChange={(change) => { setBody(change.target.value); setError(''); setMessage(''); }} placeholder="Write only what this audience needs to know." /><small>{body.length}/1,200 characters</small></label>
        <label>Schedule for later <span>Optional · in-app only</span><input type="datetime-local" value={scheduledFor} onChange={(change) => { setScheduledFor(change.target.value); setError(''); setMessage(''); }} /><small>Leave blank to write notifications now. Recipient quiet hours can delay visibility.</small></label>
        <div className="announcement-preview"><span className="eyebrow"><Eye size={14} /> Live recipient preview</span><h3>{subject.trim() || 'Your subject will appear here'}</h3><p>{body.trim() || 'Your message will appear here before anything is sent.'}</p><small>{event.title} · {announcementKindLabels[kind]} · In-app notification</small></div>
        <div className="form-actions"><button className="button button--primary" type="submit"><Send size={16} /> {scheduledFor && new Date(scheduledFor).getTime() > Date.now() ? 'Schedule in-app announcement' : 'Send in-app announcement'}</button><span>In-app scheduling and quiet hours are local. No email, SMS or WhatsApp delivery is active.</span></div>
        {message && <div className="form-success" role="status"><CheckCircle2 size={17} />{message}</div>}
        {error && <div className="form-error" role="alert"><AlertCircle size={17} />{error}</div>}
      </form>
    </section>
    <aside className="panel communication-history">
      <div className="panel__heading"><div><span className="eyebrow">Delivery ledger</span><h2>Sent in this local workspace</h2><p>Sent means in-app records were written; it does not prove reading or external delivery.</p></div></div>
      {history.length === 0 ? <div className="mini-empty">No organizer announcements for this event yet.</div> : <div className="announcement-history">{history.map((announcement) => <article className="announcement-record" key={announcement.id}><div><span className={`status-pill ${announcement.status === 'sent' ? 'status-pill--success' : ''}`}>In-app · {announcement.status === 'sent' ? 'Sent' : 'Scheduled'}</span><time>{formatEventDate(announcement.sentAt ?? announcement.scheduledFor ?? announcement.createdAt, true)}</time></div><span className="eyebrow">{announcementKindLabels[announcement.kind]} · {announcementAudienceLabels[announcement.audience]}</span><h3>{announcement.subject}</h3><p>{announcement.body}</p><footer>{announcement.recipientCount}/{announcement.audienceCount} {announcement.status === 'scheduled' ? 'planned recipients' : 'recipients'} · {announcement.optedOutCount} opted out</footer></article>)}</div>}
      <div className="info-box"><strong>Material changes stay separate.</strong><p>Cancellation and venue-change notices use their own guarded operational path and are not disabled by the optional announcement preference.</p></div>
    </aside>
  </div>;
}
