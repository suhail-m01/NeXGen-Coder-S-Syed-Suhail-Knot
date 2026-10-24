import { AlertCircle, ArrowRight, Check, CheckCircle2, ChevronRight, FileCheck2, FileText, GitMerge, Globe2, Info, Link2, LockKeyhole, MessageSquareWarning, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { normalizeTitle, normalizeUrl } from '../domain/dedupe';
import { eventTypeLabel, formatEventDate } from '../domain/events';
import { localities } from '../domain/localities';
import { canReviewSubmissions } from '../domain/permissions';
import { editsFromSubmission, type SubmissionReviewEdits } from '../domain/review';
import { sourcePermissionLabel } from '../domain/sources';
import type { EventMode, EventType, IngestionMethod, SourceRecord, Submission } from '../domain/types';
import { useApp } from '../state/AppContext';

const toInput = (iso: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const statusLabel = (status: Submission['status']) => status.replaceAll('_', ' ');

export function AdminPage() {
  const { currentUser, data, approveSubmission, moderateSubmission, mergeSubmission, updateSourceRecord, importFederatedEvents } = useApp();
  const [tab, setTab] = useState<'review' | 'sources' | 'trust'>('review');
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [selectedId, setSelectedId] = useState('');
  const [edits, setEdits] = useState<SubmissionReviewEdits | null>(null);
  const [note, setNote] = useState('');
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState('');
  const [message, setMessage] = useState('');
  const [publishedId, setPublishedId] = useState('');
  const [error, setError] = useState('');
  const [sourceDraft, setSourceDraft] = useState<SourceRecord | null>(null);
  const [importSourceId, setImportSourceId] = useState('');
  const [importJson, setImportJson] = useState('');

  const submissions = useMemo(() => data.submissions.filter((submission) => submission.status !== 'draft').sort((a, b) => {
    const order: Record<Submission['status'], number> = { pending_review: 0, needs_info: 1, published: 2, merged: 3, rejected: 4, draft: 5 };
    return order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt);
  }), [data.submissions]);
  const queue = submissions.filter((submission) => statusFilter === 'all' || submission.status === statusFilter);
  const selected = queue.find((submission) => submission.id === selectedId) ?? queue[0] ?? null;

  useEffect(() => {
    if (!selected) { setEdits(null); return; }
    const next = editsFromSubmission(selected);
    setEdits({ ...next, startAt: toInput(next.startAt) });
    setNote(selected.review?.note ?? '');
    setMergeOpen(false); setMergeTarget(''); setError('');
  }, [selected?.id]);

  const duplicates = useMemo(() => {
    if (!edits) return [];
    const title = normalizeTitle(edits.title);
    const registrationUrl = edits.registrationUrl.trim();
    return data.events.filter((event) => {
      const sameTitle = title.length > 3 && normalizeTitle(event.title) === title;
      const sameUrl = registrationUrl.length > 8 && event.listings.some((listing) => normalizeUrl(listing.originalUrl) === normalizeUrl(registrationUrl));
      return sameTitle || sameUrl;
    });
  }, [data.events, edits]);

  if (!currentUser) return <Navigate to="/auth?returnTo=%2Fadmin&action=review%20event%20submissions" replace />;
  if (!canReviewSubmissions(currentUser)) return <div className="page-container"><EmptyState icon={<LockKeyhole />} title="Reviewer access required" body="This local workspace only allows its owner or an explicitly assigned admin to inspect private submissions and source records." action={<Link className="button button--primary" to="/">Return home</Link>} /></div>;

  const patchEdits = (patch: Partial<SubmissionReviewEdits>) => setEdits((previous) => previous ? { ...previous, ...patch } : previous);
  const normalizedEdits = () => {
    if (!edits) return null;
    const start = new Date(edits.startAt);
    return { ...edits, startAt: Number.isFinite(start.getTime()) ? start.toISOString() : edits.startAt };
  };
  const succeed = (text: string) => { setMessage(text); setPublishedId(''); setError(''); setSelectedId(''); setMergeOpen(false); };
  const fail = (reason: unknown) => { setError(reason instanceof Error ? reason.message : 'The review action could not be completed.'); setMessage(''); setPublishedId(''); };

  const approve = () => {
    if (!selected || !normalizedEdits()) return;
    try {
      const event = approveSubmission(selected.id, normalizedEdits()!, note);
      succeed(`${event.title} was published as a canonical event.`);
      setPublishedId(event.id);
    } catch (reason) { fail(reason); }
  };

  const moderate = (action: 'needs_info' | 'rejected') => {
    if (!selected) return;
    try { moderateSubmission(selected.id, action, note); succeed(action === 'needs_info' ? 'Information request sent to the submitter.' : 'Submission rejected without publication.'); }
    catch (reason) { fail(reason); }
  };

  const merge = () => {
    if (!selected || !normalizedEdits() || !mergeTarget) { setError('Choose a canonical event to merge into.'); return; }
    try { mergeSubmission(selected.id, mergeTarget, normalizedEdits()!, note); succeed('Submission merged. The canonical event fields were preserved and its source history was updated.'); }
    catch (reason) { fail(reason); }
  };

  const saveSource = () => {
    if (!sourceDraft) return;
    try {
      updateSourceRecord(sourceDraft.id, {
        permission: sourceDraft.permission, active: sourceDraft.active, approvedMethods: sourceDraft.approvedMethods,
        evidenceUrl: sourceDraft.evidenceUrl, notes: sourceDraft.notes,
      });
      setSourceDraft(null); setMessage(`${sourceDraft.name} source record updated.`); setError('');
    } catch (reason) { fail(reason); }
  };

  const pendingCount = submissions.filter((submission) => submission.status === 'pending_review').length;
  const needsInfoCount = submissions.filter((submission) => submission.status === 'needs_info').length;

  return <div className="page-container admin-page">
    <div className="page-heading"><div><span className="eyebrow">Local workspace owner</span><h1>Review & source governance</h1><p>Publish only reviewed submissions, preserve canonical events and make source permission explicit.</p></div><span className="local-pill"><ShieldCheck size={14} /> Privileged local tools</span></div>
    <div className="organizer-stats admin-stats"><div><FileText /><span><strong>{pendingCount}</strong>Pending review</span></div><div><MessageSquareWarning /><span><strong>{needsInfoCount}</strong>Needs information</span></div><div><FileCheck2 /><span><strong>{submissions.filter((item) => ['published', 'merged'].includes(item.status)).length}</strong>Reviewed into catalog</span></div><div><Globe2 /><span><strong>{data.sources.filter((source) => source.active).length}</strong>Active source records</span></div></div>
    <div className="organizer-tabs"><button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}><FileCheck2 /> Review queue <span>{pendingCount}</span></button><button className={tab === 'sources' ? 'active' : ''} onClick={() => setTab('sources')}><Globe2 /> Source records <span>{data.sources.length}</span></button><button className={tab === 'trust' ? 'active' : ''} onClick={() => setTab('trust')}><ShieldCheck /> Trust & claims <span>{data.reports.filter((item) => item.status === 'open').length + data.claims.filter((item) => item.status === 'pending').length}</span></button></div>
    {message && <div className="form-success"><CheckCircle2 />{message}{publishedId && <Link to={`/events/${publishedId}`} className="text-button">Open event <ArrowRight size={14} /></Link>}</div>}
    {error && <div className="form-error"><AlertCircle />{error}</div>}

    {tab === 'review' && <>
      <div className="review-toolbar"><label>Review status<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setSelectedId(''); }}><option value="pending_review">Pending review</option><option value="needs_info">Needs information</option><option value="published">Published</option><option value="merged">Merged</option><option value="rejected">Rejected</option><option value="all">All submitted</option></select></label><span>Draft submissions remain private to their submitter and never appear here.</span></div>
      {!selected ? <EmptyState icon={<FileCheck2 />} title={statusFilter === 'pending_review' ? 'The review queue is clear' : 'No submissions in this view'} body="New Instant Add submissions will appear here only after the submitter sends them for human review." action={statusFilter !== 'all' ? <button className="button button--secondary" onClick={() => setStatusFilter('all')}>View all submissions</button> : undefined} /> : <div className="review-layout">
        <aside className="review-queue">{queue.map((submission) => {
          const submitter = data.users.find((user) => user.id === submission.submitterId);
          return <button key={submission.id} className={`review-queue__item ${selected.id === submission.id ? 'selected' : ''}`} onClick={() => setSelectedId(submission.id)}><div><span className={`submission-status submission-status--${submission.status}`}>{statusLabel(submission.status)}</span><ChevronRight /></div><h3>{submission.draft.title.value || 'Untitled submission'}</h3><p>{submitter?.name ?? 'Former workspace user'} · {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(submission.createdAt))}</p></button>;
        })}</aside>
        <section className="review-editor">
          <div className="review-editor__heading"><div><span className="eyebrow">Submission {selected.id.slice(-10)}</span><h2>{selected.draft.title.value || 'Untitled submission'}</h2></div><span className={`submission-status submission-status--${selected.status}`}>{statusLabel(selected.status)}</span></div>
          {selected.review && <div className="review-outcome"><Info /><div><strong>Last review: {selected.review.action.replaceAll('_', ' ')}</strong><p>{selected.review.note || 'No review note.'}</p><small>{formatEventDate(selected.review.at, true)}</small></div>{selected.canonicalEventId && <Link to={`/events/${selected.canonicalEventId}`}>Canonical event <ArrowRight /></Link>}</div>}
          {['pending_review', 'needs_info'].includes(selected.status) && edits ? <>
            <details className="private-evidence"><summary><LockKeyhole /> View private submission evidence</summary><p>Visible only in this privileged review workflow. Never copied automatically into the public event.</p><pre>{selected.rawText}</pre></details>
            <div className="form-grid review-fields">
              <label className="field-span-2">Reviewed title<input value={edits.title} onChange={(event) => patchEdits({ title: event.target.value })} /></label>
              <label>Event type<select value={edits.eventType} onChange={(event) => patchEdits({ eventType: event.target.value as EventType })}>{(['hackathon', 'workshop', 'meetup', 'conference', 'summit', 'competition', 'webinar', 'community_session', 'other'] as EventType[]).map((type) => <option key={type} value={type}>{eventTypeLabel(type)}</option>)}</select></label>
              <label>Start date & time<input type="datetime-local" value={edits.startAt} onChange={(event) => patchEdits({ startAt: event.target.value })} /></label>
              <label>Mode<select value={edits.mode} onChange={(event) => patchEdits({ mode: event.target.value as EventMode })}><option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option></select></label>
              <label>Venue <span>Required unless online</span><input value={edits.venueName} onChange={(event) => patchEdits({ venueName: event.target.value })} /></label>
              {edits.mode !== 'online' && <label>Locality<select value={edits.localityId} onChange={(event) => patchEdits({ localityId: event.target.value })}>{localities.map((locality) => <option key={locality.id} value={locality.id}>{locality.name}</option>)}</select></label>}
              <label>Organizer <span>Optional; do not infer</span><input value={edits.organizerName} onChange={(event) => patchEdits({ organizerName: event.target.value })} placeholder="Organizer not stated" /></label>
              <label className="field-span-2">Original or registration URL<input type="url" value={edits.registrationUrl} onChange={(event) => patchEdits({ registrationUrl: event.target.value })} /></label>
              <label className="field-span-2">Public summary<textarea rows={4} value={edits.summary} onChange={(event) => patchEdits({ summary: event.target.value })} /></label>
            </div>
            {duplicates.length > 0 && <div className="duplicate-warning"><GitMerge /><div><strong>{duplicates.length} possible canonical match{duplicates.length > 1 ? 'es' : ''}</strong><p>Merge to preserve the existing event and add this listing instead of creating a duplicate.</p>{duplicates.slice(0, 4).map((event) => <button key={event.id} className="text-button" onClick={() => { setMergeOpen(true); setMergeTarget(event.id); }}>{event.title} <GitMerge size={14} /></button>)}</div></div>}
            <label className="review-note">Review note <span>Shared with the submitter for requests and outcomes</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What was checked, changed or still needed?" /></label>
            {mergeOpen && <div className="merge-panel"><GitMerge /><div><h3>Merge into a canonical event</h3><p>The target event’s details stay intact. Only a new listing and merge revision are added.</p><label>Target event<select value={mergeTarget} onChange={(event) => setMergeTarget(event.target.value)}><option value="">Choose an event</option>{[...duplicates, ...data.events.filter((event) => !duplicates.some((duplicate) => duplicate.id === event.id))].map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><button className="button button--primary button--small" onClick={merge}><GitMerge /> Confirm merge</button></div></div>}
            <div className="review-actions"><button className="button button--primary" onClick={approve}><Check /> Approve & publish</button><button className="button button--secondary" onClick={() => setMergeOpen(!mergeOpen)}><GitMerge /> Merge</button><button className="button button--secondary" onClick={() => moderate('needs_info')}><MessageSquareWarning /> Request info</button><button className="button button--danger" onClick={() => { if (window.confirm('Reject this submission without publishing it?')) moderate('rejected'); }}><XCircle /> Reject</button></div>
          </> : !selected.review && <EmptyState title="No review outcome yet" body="This submission is awaiting review." />}
        </section>
      </div>}
    </>}

    {tab === 'sources' && <div className="sources-section">
      <div className="privacy-callout"><ShieldCheck /><div><strong>Permission gate before collection</strong><p>Platform and open-web records start disabled. Approving a record stores evidence and permitted methods; this milestone still contains no live external connector.</p></div></div>
      {sourceDraft && <section className="source-editor"><div className="section-mini-heading"><div><h2>Review {sourceDraft.name}</h2><p>Record what is permitted. Do not use approval to imply a connector exists.</p></div><button className="button button--ghost button--small" onClick={() => setSourceDraft(null)}>Close</button></div><div className="form-grid"><label>Permission<select value={sourceDraft.permission} onChange={(event) => setSourceDraft({ ...sourceDraft, permission: event.target.value as SourceRecord['permission'] })}><option value="review_required">Review required</option><option value="approved">Approved with evidence</option><option value="blocked">Blocked</option></select></label><label>Permission or terms evidence URL<input type="url" value={sourceDraft.evidenceUrl ?? ''} onChange={(event) => setSourceDraft({ ...sourceDraft, evidenceUrl: event.target.value })} placeholder="https://official-source.example/permission" /></label></div><fieldset className="interest-field"><legend>Approved collection methods</legend><div className="choice-chips">{(['manual', 'link_only', 'api', 'open_web'] as IngestionMethod[]).map((method) => <button type="button" key={method} className={sourceDraft.approvedMethods.includes(method) ? 'selected' : ''} onClick={() => setSourceDraft({ ...sourceDraft, approvedMethods: sourceDraft.approvedMethods.includes(method) ? sourceDraft.approvedMethods.filter((item) => item !== method) : [...sourceDraft.approvedMethods, method] })}>{method.replaceAll('_', ' ')}</button>)}</div></fieldset><label className="consent-check"><input type="checkbox" checked={sourceDraft.active} onChange={(event) => setSourceDraft({ ...sourceDraft, active: event.target.checked })} /><span>Mark this source configuration active. No fetch or crawl is started by this setting.</span></label><label>Review notes<textarea rows={3} value={sourceDraft.notes} onChange={(event) => setSourceDraft({ ...sourceDraft, notes: event.target.value })} /></label><button className="button button--primary" onClick={saveSource}><Check /> Save source review</button></section>}
      <section className="panel federated-import"><div className="panel__heading"><div><span className="eyebrow">Permissioned adapter boundary</span><h2>Import reviewed JSON feed</h2><p>No crawler is started. Up to 50 validated records enter pending human review; nothing auto-publishes.</p></div></div><div className="form-grid"><label>External source<select value={importSourceId} onChange={(event) => setImportSourceId(event.target.value)}><option value="">Choose a source</option>{data.sources.filter((source) => ['platform', 'open_web'].includes(source.kind)).map((source) => <option value={source.id} key={source.id}>{source.name} · {source.active ? 'active' : 'disabled'}</option>)}</select></label></div><label>JSON event array<textarea rows={6} value={importJson} onChange={(event) => setImportJson(event.target.value)} placeholder='[{"title":"Reviewed community event","startAt":"2026-12-01T04:30:00.000Z","originalUrl":"https://example.com/event"}]' /></label><button className="button button--secondary" onClick={() => { try { const count = importFederatedEvents(importSourceId, importJson); setMessage(`${count} federated records entered pending review.`); setError(''); setImportJson(''); } catch (reason) { fail(reason); } }}><GitMerge /> Validate & queue import</button></section>
      <div className="source-grid">{data.sources.map((source) => <article className="source-card" key={source.id}><div className="source-card__heading"><div className="source-card__icon">{source.kind === 'platform' || source.kind === 'open_web' ? <Globe2 /> : <Link2 />}</div><div><h3>{source.name}</h3><span>{source.kind.replaceAll('_', ' ')}</span></div><span className={`source-status source-status--${source.active ? 'active' : 'inactive'}`}>{source.active ? 'Active' : 'Disabled'}</span></div><div className="source-card__badges"><span className={`source-permission source-permission--${source.permission}`}>{sourcePermissionLabel(source.permission)}</span>{source.approvedMethods.map((method) => <span key={method}>{method.replaceAll('_', ' ')}</span>)}</div><p>{source.notes}</p>{source.evidenceUrl && <a href={source.evidenceUrl} target="_blank" rel="noreferrer">Permission evidence <ArrowRight /></a>}<div className="source-card__footer"><span>{source.lastReviewedAt ? `Reviewed ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(source.lastReviewedAt))}` : 'Not reviewed'}</span>{['platform', 'open_web'].includes(source.kind) && <button className="button button--secondary button--small" onClick={() => setSourceDraft({ ...source, approvedMethods: [...source.approvedMethods] })}>Review permissions</button>}</div></article>)}</div>
    </div>}

    {tab === 'trust' && <div className="trust-admin"><div className="insights-grid"><div><span>Open minor-safety reports</span><strong>{data.reports.filter((item) => item.status === 'open' && item.priority === 'minor_safety').length}</strong><small>Four-hour handling target; no resolution guarantee</small></div><div><span>Pending organizer claims</span><strong>{data.claims.filter((item) => item.status === 'pending').length}</strong><small>Claims are not blanket safety verification</small></div><div><span>Adult / minor accounts</span><strong>{data.users.filter((user) => user.ageBand === '18_plus').length} / {data.users.filter((user) => user.ageBand !== '18_plus').length}</strong><small>Aggregate counts only</small></div><div><span>Public catalog events</span><strong>{data.events.filter((event) => (event.visibility ?? 'public') === 'public').length}</strong><small>{data.events.filter((event) => event.isSample).length} labelled sample records</small></div></div><section className="panel"><div className="panel__heading"><div><span className="eyebrow">Corrections, takedowns and safeguarding</span><h2>Report queue</h2></div></div>{data.reports.length ? data.reports.slice().sort((a, b) => (a.priority === 'minor_safety' ? -1 : 1) - (b.priority === 'minor_safety' ? -1 : 1) || b.createdAt.localeCompare(a.createdAt)).map((report) => <TrustReportItem key={report.id} reportId={report.id} />) : <div className="mini-empty">No trust reports.</div>}</section><section className="panel"><div className="panel__heading"><div><span className="eyebrow">Approved-edit protection</span><h2>Organizer claims</h2></div></div>{data.claims.length ? data.claims.map((claim) => <ClaimItem key={claim.id} claimId={claim.id} />) : <div className="mini-empty">No organizer claims.</div>}</section><section className="panel"><div className="panel__heading"><div><span className="eyebrow">Sensitive-action history</span><h2>Audit records</h2><p>New consent, operations, judging and trust actions are recorded without password hashes.</p></div></div><div className="audit-list">{data.auditRecords.slice(-50).reverse().map((record) => <div key={record.id}><code>{record.action}</code><span>{record.targetType} · {record.details}</span><time>{formatEventDate(record.createdAt, true)}</time></div>)}{!data.auditRecords.length && <div className="mini-empty">No expansion audit records yet. Existing submission/source records retain their own review history.</div>}</div></section></div>}
  </div>;
}

function TrustReportItem({ reportId }: { reportId: string }) {
  const { data, reviewReport } = useApp();
  const report = data.reports.find((item) => item.id === reportId)!;
  const event = data.events.find((item) => item.id === report.eventId);
  const reporter = data.users.find((item) => item.id === report.reporterId);
  const [note, setNote] = useState(report.resolutionNote ?? '');
  const [message, setMessage] = useState('');
  const review = (status: 'resolved' | 'dismissed') => { try { reviewReport(report.id, status, note); setMessage(`Report ${status}.`); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not review report.'); } };
  return <article className={`trust-item ${report.priority === 'minor_safety' ? 'trust-item--priority' : ''}`}><div><span className={`submission-status submission-status--${report.status === 'open' ? 'pending_review' : report.status === 'resolved' ? 'published' : 'rejected'}`}>{report.status}</span>{report.priority === 'minor_safety' && <span className="badge badge--warning">Minor safety · four-hour target</span>}</div><h3>{report.reason}</h3><p>{report.details}</p><small>{event?.title ?? report.targetType} · Reporter {reporter?.name ?? (report.reporterId ? 'Former user' : 'Guest')} · {formatEventDate(report.createdAt)}</small>{report.status === 'open' ? <><label>Resolution note<textarea rows={2} value={note} onChange={(input) => setNote(input.target.value)} /></label><div className="button-row"><button className="button button--secondary button--small" onClick={() => review('resolved')}>Resolve</button><button className="button button--ghost button--small" onClick={() => review('dismissed')}>Dismiss</button></div></> : <p>{report.resolutionNote}</p>}{message && <small>{message}</small>}</article>;
}

function ClaimItem({ claimId }: { claimId: string }) {
  const { data, reviewClaim } = useApp();
  const claim = data.claims.find((item) => item.id === claimId)!;
  const event = data.events.find((item) => item.id === claim.eventId);
  const claimant = data.users.find((item) => item.id === claim.userId);
  const [note, setNote] = useState(claim.reviewNote ?? '');
  const [message, setMessage] = useState('');
  const review = (decision: 'approved' | 'rejected') => { try { reviewClaim(claim.id, decision, note); setMessage(`Claim ${decision}.`); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not review claim.'); } };
  return <article className="trust-item"><span className={`submission-status submission-status--${claim.status === 'pending' ? 'pending_review' : claim.status === 'approved' ? 'published' : 'rejected'}`}>{claim.status}</span><h3>{event?.title ?? 'Event claim'}</h3><p>{claim.evidence}</p><small>Claimant: {claimant?.name ?? 'Former user'} · {formatEventDate(claim.createdAt)}</small>{claim.status === 'pending' ? <><label>Review note<textarea rows={2} value={note} onChange={(input) => setNote(input.target.value)} /></label><div className="button-row"><button className="button button--primary button--small" onClick={() => review('approved')}>Approve claim</button><button className="button button--danger button--small" onClick={() => review('rejected')}>Reject claim</button></div></> : <p>{claim.reviewNote}</p>}{message && <small>{message}</small>}</article>;
}
