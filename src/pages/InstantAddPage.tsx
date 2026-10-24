import { AlertCircle, ArrowRight, CheckCircle2, ClipboardPaste, FileSearch, Info, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LoadingButton } from '../components/LoadingButton';
import { normalizeTitle } from '../domain/dedupe';
import { eventTypeLabel } from '../domain/events';
import { readPublicEventPage } from '../domain/inputAdapters';
import { extractPosterText } from '../domain/ocr';
import { useApp } from '../state/AppContext';
import type { Confidence, Submission } from '../domain/types';

const sampleText = `Bengaluru Product & AI Meetup\nDate: 14/11/2026\nTime: 6 PM onwards\nVenue: Sample Community Hall, Koramangala\nOpen to: 18+\nFree for everyone\nRegister: https://example.com/product-ai-meetup\nMeet product builders for practical demos and a community discussion.`;

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <span className={`confidence confidence--${confidence}`}>{confidence === 'missing' ? 'Needs input' : `${confidence} confidence`}</span>;
}

export function InstantAddPage() {
  const { currentUser, data, createSubmission, submitSubmission } = useApp();
  const [rawText, setRawText] = useState('');
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [venueName, setVenueName] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [inputMessage, setInputMessage] = useState('');

  const duplicates = useMemo(() => {
    if (!submission || !title.trim()) return [];
    return data.events.filter((event) => normalizeTitle(event.title) === normalizeTitle(title) || (startAt && event.startAt.slice(0, 10) === startAt.slice(0, 10) && normalizeTitle(event.title).includes(normalizeTitle(title).split(' ')[0] ?? '___')));
  }, [data.events, submission, title, startAt]);

  if (!currentUser) return <Navigate to="/auth?returnTo=%2Fadd&action=add%20an%20event" replace />;
  if (currentUser.ageBand !== '18_plus') return <div className="page-container"><div className="empty-state"><h1>Event submission is adult-only</h1><p>Public discovery remains available without an account.</p></div></div>;

  const fetchPublicPage = async () => {
    setError(''); setInputMessage(''); setUrlLoading(true);
    try {
      const evidence = await readPublicEventPage(sourceUrl);
      setRawText(evidence);
      setInputMessage('Public page text imported. Review the evidence below, then create a draft; nothing is public yet.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read this public page.'); }
    finally { setUrlLoading(false); }
  };

  const readPoster = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setInputMessage(''); setOcrLoading(true); setOcrProgress(0);
    try {
      const text = await extractPosterText(file, setOcrProgress);
      setRawText(text);
      setInputMessage('Local English OCR completed. Check names, dates, URLs and any personal contact details before creating a review draft.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read this poster.'); }
    finally { setOcrLoading(false); }
  };

  const readText = () => {
    setError(''); setLoading(true);
    window.setTimeout(() => {
      try {
        const created = createSubmission(rawText);
        setSubmission(created);
        setTitle(created.draft.title.value ?? '');
        setStartAt(created.draft.startDatetime.value ? created.draft.startDatetime.value.slice(0, 16) : '');
        setVenueName(created.draft.venueName.value ?? '');
        setRegistrationUrl(created.draft.registrationUrl.value ?? '');
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read this text.'); }
      finally { setLoading(false); }
    }, 350);
  };

  const submitForReview = () => {
    if (!submission) return;
    if (!title.trim() || !startAt || (!venueName.trim() && !registrationUrl.trim())) {
      setError('Confirm a title, start date, and either a venue or registration/joining link before submitting.');
      return;
    }
    submitSubmission(submission.id, {
      title: title.trim(), startAt: new Date(startAt).toISOString(),
      venueName: venueName.trim() || null, registrationUrl: registrationUrl.trim() || null,
    });
    setSubmitted(true); setError('');
  };

  return (
    <div className="page-container instant-add-page">
      <div className="page-heading"><div><span className="eyebrow">Instant Add</span><h1>Turn a forwarded message into a useful event draft</h1><p>Knot extracts only what it can support with evidence. You review uncertain fields before anything enters the review queue.</p></div><span className="local-pill"><LockKeyhole size={14} /> Original text stays private</span></div>
      {!submission ? <div className="instant-add-layout">
        <section className="paste-panel">
          <div className="paste-panel__heading"><ClipboardPaste /><div><h2>Paste event text</h2><p>WhatsApp forwards, email announcements and plain-text poster content work best.</p></div></div>
          <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} rows={14} placeholder="Paste the event title, date, time, venue, eligibility, registration link and other details here…" />
          <div className="paste-panel__footer"><button className="text-button" onClick={() => setRawText(sampleText)}>Insert labelled sample text</button><span>{rawText.length} characters</span></div>
          <div className="input-adapters"><div><label>Public event URL <span>Optional · CORS permitting</span><div className="input-with-action"><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://public-site.example/event" /><LoadingButton loading={urlLoading} className="button button--secondary button--small" onClick={fetchPublicPage}>Fetch text</LoadingButton></div></label><label>Poster or screenshot <span>Local English OCR · up to 8 MB</span><input type="file" accept="image/png,image/jpeg,image/webp,image/bmp" disabled={ocrLoading} onChange={(event) => void readPoster(event.target.files?.[0])} /></label>{ocrLoading && <div className="ocr-progress" role="status">Reading poster locally… {Math.round(ocrProgress * 100)}%</div>}</div><p>Public pages are fetched without account credentials. Private networks are rejected, and Knot does not bypass CORS. Poster images and original evidence stay private to you and reviewers; inspect personal contact details before submitting.</p></div>
          {inputMessage && <div className="action-message" role="status">{inputMessage}</div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <LoadingButton loading={loading} className="button button--primary button--full button--large" onClick={readText}><Sparkles size={18} /> Read and create draft <ArrowRight size={18} /></LoadingButton>
          <div className="reader-limits"><Info size={16} /><span>Pasted text, user-given public pages and local poster OCR all require your review and then human review before publication. Blocked pages and unreadable images produce errors—not invented fields.</span></div>
        </section>
        <aside className="instant-add-rules"><h3>What Knot will not invent</h3><ul><li><CheckCircle2 /> Missing price never becomes “Free”</li><li><CheckCircle2 /> “Free for members” stays conditional</li><li><CheckCircle2 /> Class or grade wording never becomes a numeric age</li><li><CheckCircle2 /> Missing dates and venues are highlighted</li><li><CheckCircle2 /> Possible duplicates appear before review</li></ul><div><ShieldCheck /><span>Community submissions are not organizer confirmations.</span></div></aside>
      </div> : submitted ? <div className="submission-success"><div className="success-icon"><CheckCircle2 /></div><span className="eyebrow">Submitted for human review</span><h1>Your draft is in the queue</h1><p>It is <strong>not public yet</strong>. A reviewer can approve, edit, merge, reject or request more information. The original message remains private evidence.</p><div className="submission-reference"><span>Submission reference</span><strong>{submission.id}</strong><span>Status: pending review</span></div><div className="button-row button-row--center"><Link className="button button--primary" to="/search">Back to discovery</Link><button className="button button--secondary" onClick={() => { setSubmission(null); setSubmitted(false); setRawText(''); }}>Add another event</button></div></div> : <div className="draft-layout">
        <section className="draft-review">
          <div className="draft-review__heading"><FileSearch /><div><span className="eyebrow">One review screen</span><h2>Confirm the extracted details</h2><p>Low-confidence and missing fields are highlighted. Your edits are recorded as submitter confirmations.</p></div></div>
          <div className="extraction-summary"><div><span>Event type</span><strong>{submission.draft.eventType.value ? eventTypeLabel(submission.draft.eventType.value) : 'Not detected'}</strong><ConfidenceBadge confidence={submission.draft.eventType.confidence} /></div><div><span>Mode</span><strong>{submission.draft.mode.value?.replace('_', ' ')}</strong><ConfidenceBadge confidence={submission.draft.mode.confidence} /></div><div><span>Price</span><strong>{submission.draft.price.value.kind === 'free' ? 'Free' : submission.draft.price.value.kind === 'paid' ? 'Paid' : 'Not stated'}</strong><ConfidenceBadge confidence={submission.draft.price.confidence} /></div><div><span>Age rule</span><strong>{submission.draft.ageRule.value.mode === 'not_stated' ? 'Not stated' : submission.draft.ageRule.value.ruleText}</strong><ConfidenceBadge confidence={submission.draft.ageRule.confidence} /></div></div>
          <div className="form-grid">
            <label className="field-span-2">Event title <ConfidenceBadge confidence={submission.draft.title.confidence} /><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>Start date & time <ConfidenceBadge confidence={submission.draft.startDatetime.confidence} /><input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /><small>{submission.draft.startDatetime.evidence || 'No supported date evidence found. Please choose it explicitly.'}</small></label>
            <label>Venue or area <ConfidenceBadge confidence={submission.draft.venueName.confidence} /><input value={venueName} onChange={(event) => setVenueName(event.target.value)} placeholder="Required for an in-person event" /></label>
            <label className="field-span-2">Registration or official link <ConfidenceBadge confidence={submission.draft.registrationUrl.confidence} /><input type="url" value={registrationUrl} onChange={(event) => setRegistrationUrl(event.target.value)} placeholder="https://original-site.com/event" /></label>
          </div>
          {submission.draft.price.value.note && <div className="draft-note"><AlertCircle size={17} /><span>{submission.draft.price.value.note}</span></div>}
          {submission.draft.ageRule.confidence === 'low' && <div className="draft-note"><AlertCircle size={17} /><span>{submission.draft.ageRule.evidence}. The age rule remains “not stated” and needs review.</span></div>}
          {duplicates.length > 0 && <div className="duplicate-warning"><AlertCircle /><div><strong>Possible duplicate{duplicates.length > 1 ? 's' : ''} found</strong><p>Check whether this is the same real-world event before continuing.</p>{duplicates.map((event) => <Link key={event.id} to={`/events/${event.id}`}>{event.title} <ArrowRight size={14} /></Link>)}</div></div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="draft-actions"><button className="button button--secondary" onClick={() => setSubmission(null)}>Start over</button><button className="button button--primary" onClick={submitForReview}>Submit for human review <ArrowRight size={17} /></button></div>
        </section>
        <aside className="evidence-panel"><LockKeyhole /><h3>Private source evidence</h3><p>Only reviewers should inspect the original submission. It is not a public event description.</p><pre>{submission.rawText}</pre><div className="evidence-panel__status"><span className="live-dot" /> Draft saved in local review storage</div></aside>
      </div>}
    </div>
  );
}
