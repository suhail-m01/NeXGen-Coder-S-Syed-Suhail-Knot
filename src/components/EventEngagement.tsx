import { Award, BookOpen, CalendarDays, CheckCircle2, ExternalLink, FileText, Flag, MessageCircle, Send, ShieldCheck, Trophy, Users } from 'lucide-react';
import { useState } from 'react';
import { formatEventDate } from '../domain/events';
import { canManageEvent, certificateEligible } from '../domain/operations';
import { isConfirmedNative } from '../domain/registration';
import type { AttendeeQuestion, KnotEvent, Registration } from '../domain/types';
import { useApp } from '../state/AppContext';
import { PublicMediaGallery } from './PublicMediaGallery';

export function EventEngagement({ event, registration }: { event: KnotEvent; registration?: Registration }) {
  const {
    data, currentUser, toggleGoing, askQuestion, submitProject, submitReport, submitClaim, issueCertificate,
  } = useApp();
  const [question, setQuestion] = useState('');
  const [questionVisibility, setQuestionVisibility] = useState<AttendeeQuestion['visibility']>('public');
  const [projectOpen, setProjectOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [roundId, setRoundId] = useState('');
  const [showcase, setShowcase] = useState(false);
  const [reportReason, setReportReason] = useState('Incorrect event details');
  const [reportDetails, setReportDetails] = useState('');
  const [minorSafety, setMinorSafety] = useState(false);
  const [claimEvidence, setClaimEvidence] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const confirmed = Boolean(registration && isConfirmedNative(registration));
  const canAsk = Boolean(registration && !['cancelled', 'rejected', 'opened_externally'].includes(registration.status));
  const manager = canManageEvent(currentUser, event);
  const going = data.going.some((item) => item.userId === currentUser?.id && item.eventId === event.id);
  const goingCount = data.going.filter((item) => item.eventId === event.id).length;
  const ownSubmission = data.projectSubmissions.find((item) => item.eventId === event.id && item.userId === currentUser?.id);
  const certificate = data.certificates.find((item) => item.eventId === event.id && item.userId === currentUser?.id);
  const past = new Date(event.endAt ?? event.startAt).getTime() <= Date.now();
  const eventQuestions = data.questions.filter((item) => item.eventId === event.id && item.status === 'answered' && (item.visibility === 'public' || confirmed || manager || item.askerId === currentUser?.id) && !(event.faqs ?? []).some((faq) => faq.question === item.body && faq.answer === item.answer));
  const ownQuestions = data.questions.filter((item) => item.eventId === event.id && item.askerId === currentUser?.id && item.status === 'open');
  const publicProjects = data.projectSubmissions.filter((submission) => {
    if (submission.eventId !== event.id || !submission.showcase || !['shortlisted', 'winner'].includes(submission.status)) return false;
    const author = data.users.find((user) => user.id === submission.userId);
    return event.showcaseEnabled && author?.ageBand === '18_plus';
  });
  const showProjects = event.eventType === 'hackathon' || event.eventType === 'competition' || Boolean(event.rounds?.length) || Boolean(event.submissionDeadline);

  const run = (action: () => void, success: string) => {
    setError(''); setMessage('');
    try { action(); setMessage(success); } catch (reason) { setError(reason instanceof Error ? reason.message : 'The action could not be completed.'); }
  };

  const downloadCertificate = () => {
    if (!certificate || !currentUser) return;
    const content = [
      'KNOT — ORGANIZER-CHECKED-IN PARTICIPATION RECORD', '',
      `Participant: ${currentUser.name}`, `Event: ${event.title}`,
      `Organizer: ${event.organizerName}`, `Event date: ${formatEventDate(event.startAt, true)}`,
      `Issued: ${formatEventDate(certificate.issuedAt, true)}`, `Verification code: ${certificate.verificationCode}`, '',
      'This records organizer check-in only. It does not certify skill, employment, external registration or a prize.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${event.slug}-participation.txt`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="page-container event-engagement">
    {(event.accessibilityNotes || event.codeOfConduct) && <section className="event-section"><h2>Access & conduct</h2>{event.accessibilityNotes && <p><strong>Accessibility:</strong> {event.accessibilityNotes}</p>}{event.codeOfConduct && <p><strong>Code of conduct:</strong> {event.codeOfConduct}</p>}</section>}

    {Boolean(event.rounds?.length) && <section className="event-section"><div className="section-title-row"><h2>Rounds & deadlines</h2><span>Registration, event and submission times stay distinct</span></div><div className="operations-timeline">{event.rounds!.map((round) => <article key={round.id}><span>{formatEventDate(round.startAt)}</span><div><h3>{round.title}</h3><p>{round.description}</p><small>Ends {formatEventDate(round.endAt)}{round.submissionDeadline ? ` · Submissions close ${formatEventDate(round.submissionDeadline)}` : ''}</small></div></article>)}</div></section>}

    {Boolean(event.sessions?.length) && <section className="event-section"><h2>Agenda & speakers</h2><div className="agenda-list">{event.sessions!.map((session) => <article key={session.id}><CalendarDays /><div><h3>{session.title}</h3><p>{session.speaker || 'Speaker to be announced'} · {session.location || 'Location to be announced'}</p><small>{formatEventDate(session.startAt)} – {formatEventDate(session.endAt)}</small></div></article>)}</div></section>}

    {Boolean(event.resources?.length) && <section className="event-section"><h2>Participant resource centre</h2><div className="resource-grid">{event.resources!.filter((resource) => resource.visibility === 'public' || confirmed || manager).map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer"><BookOpen /><span><strong>{resource.title}</strong><small>{resource.kind.replaceAll('_', ' ')} · {resource.visibility === 'public' ? 'Public' : 'Confirmed participants'}</small></span><ExternalLink /></a>)}</div>{!confirmed && event.resources!.some((resource) => resource.visibility === 'participant_only') && !manager && <p className="field-note">Some resources are visible only to confirmed native participants.</p>}</section>}

    {(Boolean(event.faqs?.length) || eventQuestions.length > 0) && <section className="event-section"><h2>FAQs</h2><div className="faq-list">{event.faqs?.filter((faq) => faq.visibility === 'public' || confirmed || manager).map((faq) => <details key={faq.id}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}{eventQuestions.map((item) => <details key={item.id}><summary>{item.body}</summary><p>{item.answer}</p></details>)}</div></section>}

    <section className="event-section engagement-actions"><div><Users /><span><strong>Self-declared going</strong><small>This is an interest record, never a registration or public minor identity.</small></span></div><button className={`button button--small ${going ? 'button--secondary' : 'button--ghost'}`} onClick={() => run(() => toggleGoing(event.id), going ? 'Going record removed.' : 'Added as self-declared going—not a registration.')}>{going ? 'Going ✓' : 'I’m going'}</button>{goingCount >= 5 && <span>{goingCount} self-declared going records</span>}</section>

    <section className="event-section"><div className="section-title-row"><h2>Attendee question inbox</h2><MessageCircle /></div><p>Ask about this event without opening unrestricted private messaging. Public answers never display the asker’s identity.</p>{canAsk ? <div className="question-form"><textarea rows={3} value={question} onChange={(input) => setQuestion(input.target.value)} placeholder="What do you need to know about this event?" /><div className="form-grid"><label>Answer visibility<select value={questionVisibility} onChange={(input) => setQuestionVisibility(input.target.value as AttendeeQuestion['visibility'])}><option value="public">Public FAQ after organizer answer</option><option value="participant_only">Participants only</option></select></label><button className="button button--secondary button--small" onClick={() => run(() => { askQuestion(event.id, question, questionVisibility); setQuestion(''); }, 'Question sent to the organizer inbox.')}><Send /> Send question</button></div></div> : <p className="field-note">A native participation record or self-confirmed external registration is required to ask an attendee question.</p>}{ownQuestions.length > 0 && <div className="pending-questions"><strong>Your open questions</strong>{ownQuestions.map((item) => <p key={item.id}>{item.body}</p>)}</div>}</section>

    {showProjects && <section className="event-section"><div className="section-title-row"><h2>Projects & results</h2><Trophy /></div>{ownSubmission ? <div className="own-project"><span className={`submission-status submission-status--${ownSubmission.status === 'winner' ? 'published' : ownSubmission.status === 'not_selected' ? 'rejected' : 'pending_review'}`}>{ownSubmission.status.replaceAll('_', ' ')}</span><h3>{ownSubmission.title}</h3><p>{ownSubmission.description}</p><small>Showcase consent: {ownSubmission.showcase ? 'given' : 'not given'} · Public display also requires organizer publication and adult identity rules.</small>{data.projectScores.filter((score) => score.submissionId === ownSubmission.id).map((score) => <blockquote key={score.id}>Innovation {score.innovation}/5 · Execution {score.execution}/5 · Impact {score.impact}/5{score.feedback && <p>{score.feedback}</p>}</blockquote>)}</div> : confirmed ? !projectOpen ? <button className="button button--secondary" onClick={() => setProjectOpen(true)}><FileText /> Submit a project</button> : <div className="project-form"><div className="form-grid"><label>Project title<input value={title} onChange={(input) => setTitle(input.target.value)} /></label>{Boolean(event.rounds?.length) && <label>Round<select value={roundId} onChange={(input) => setRoundId(input.target.value)}><option value="">General event submission</option>{event.rounds!.map((round) => <option value={round.id} key={round.id}>{round.title}</option>)}</select></label>}</div><label>Description<textarea rows={4} value={description} onChange={(input) => setDescription(input.target.value)} /></label><label>Repository URL<input type="url" value={repositoryUrl} onChange={(input) => setRepositoryUrl(input.target.value)} placeholder="https://github.com/…" /></label><div className="form-grid"><label>Video URL <span>Optional</span><input type="url" value={videoUrl} onChange={(input) => setVideoUrl(input.target.value)} /></label><label>Document URL <span>Optional</span><input type="url" value={documentUrl} onChange={(input) => setDocumentUrl(input.target.value)} /></label></div><label className="consent-check"><input type="checkbox" checked={showcase} onChange={(input) => setShowcase(input.target.checked)} /><span>Allow this project to appear in the public showcase if the organizer shortlists it and opens the showcase.</span></label><button className="button button--primary" onClick={() => run(() => submitProject({ eventId: event.id, roundId: roundId || null, title, description, repositoryUrl, videoUrl, documentUrl, showcase }), 'Project submitted with its own deadline and showcase-consent record.')}>Submit project</button></div> : <p className="field-note">Project submission requires a confirmed native registration.</p>}{publicProjects.length > 0 && <div className="showcase-grid">{publicProjects.map((project) => <article key={project.id}><span className="eyebrow">{project.status === 'winner' ? 'Winner' : 'Shortlisted project'}</span><h3>{project.title}</h3><p>{project.description}</p><div>{project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer">Repository <ExternalLink /></a>}{project.videoUrl && <a href={project.videoUrl} target="_blank" rel="noreferrer">Video <ExternalLink /></a>}{project.documentUrl && <a href={project.documentUrl} target="_blank" rel="noreferrer">Document <ExternalLink /></a>}</div></article>)}</div>}</section>}

    {past && event.recap && <section className="event-section recap-section"><span className="eyebrow">Post-event recap</span><h2>What happened</h2><p>{event.recap}</p><small>Text and outcomes are organizer-provided; attendance and impact claims require separate evidence.</small></section>}

    <PublicMediaGallery event={event} />

    {registration && certificateEligible(registration, event) && <section className="event-section certificate-card"><Award /><div><h2>Participation record</h2><p>Your organizer check-in and the event end are both recorded. This certificate does not claim a skill or prize.</p>{certificate ? <><code>Verification: {certificate.verificationCode}</code><button className="button button--secondary button--small" onClick={downloadCertificate}>Download participation record</button></> : <button className="button button--primary button--small" onClick={() => run(() => issueCertificate(event.id), 'Attendance-based participation record issued.')}>Issue my participation record</button>}</div></section>}

    <section className="event-section trust-actions"><div><ShieldCheck /><span><strong>Corrections, claims and safety</strong><small>Organizer/source claims never become blanket event-safety verification.</small></span></div>{currentUser?.ageBand === '18_plus' && currentUser.id !== event.organizerId && <details><summary>Claim this event as an organizer</summary><textarea rows={3} value={claimEvidence} onChange={(input) => setClaimEvidence(input.target.value)} placeholder="Describe your organizer relationship and evidence for privileged review." /><button className="button button--secondary button--small" onClick={() => run(() => { submitClaim(event.id, claimEvidence); setClaimEvidence(''); }, 'Claim submitted for privileged review.')}>Submit organizer claim</button></details>}<details><summary><Flag /> Report a problem</summary><label>Reason<select value={reportReason} onChange={(input) => setReportReason(input.target.value)}><option>Incorrect event details</option><option>Suspicious or unsafe listing</option><option>Source or registration problem</option><option>Minor safety concern</option><option>Other</option></select></label><textarea rows={3} value={reportDetails} onChange={(input) => setReportDetails(input.target.value)} placeholder="Give reviewers specific, non-sensitive details." /><label className="consent-check"><input type="checkbox" checked={minorSafety} onChange={(input) => setMinorSafety(input.target.checked)} /><span>This concerns a minor’s immediate safety and needs the priority safeguarding queue.</span></label><button className="button button--secondary button--small" onClick={() => run(() => { submitReport({ eventId: event.id, targetType: 'event', reason: reportReason, details: reportDetails, priority: minorSafety ? 'minor_safety' : 'standard' }); setReportDetails(''); }, 'Report sent to the trust queue. Minor-safety reports have a four-hour handling target, not a guaranteed resolution time.')}>Send report</button></details></section>

    {(message || error) && <div className={`page-container ${error ? 'form-error' : 'form-success'}`} role={error ? 'alert' : 'status'}>{error ? <Flag /> : <CheckCircle2 />}{error || message}</div>}
  </div>;
}
