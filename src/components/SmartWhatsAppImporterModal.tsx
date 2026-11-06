import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  FileImage,
  LockKeyhole,
  MessageSquare,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { localities } from '../domain/localities';
import { extractPosterText } from '../domain/ocr';
import { parseInstantText } from '../domain/parser';
import { validWebUrl } from '../domain/validation';
import { useApp } from '../state/AppContext';
import type { EventMode, EventType, Price } from '../domain/types';

export interface SmartWhatsAppImporterModalProps {
  open: boolean;
  onClose: () => void;
}

const SAMPLE_WHATSAPP_AI = `🚨 *BANGALORE AI & DEV MEETUP #4* 🚨
Hey builders! GDG Bengaluru is hosting a hands-on AI Agents workshop this Saturday.
📅 Date: 14/11/2026
⏰ Time: 10:00 AM – 2:00 PM IST
📍 Venue: BHIVE Workspace, HSR Layout, Sector 6, Bengaluru
🎟️ Price: Free entry (limited to 50 seats)
🔗 RSVP: https://gdg.community.dev/events/ai-meetup-bangalore
Topics: LLMs, LangChain, React, Python. Open to all student & professional builders!`;

const SAMPLE_WHATSAPP_HACKATHON = `🔥 *VECNAVERSE NATIONAL LEVEL HACKATHON 2026* 🔥
Theme: Hyperlocal Event Discovery & Community Engagement
📅 Date: 28/11/2026 to 29/11/2026
⏰ Time: 9:00 AM IST onwards
📍 Venue: Community Innovation Hub, Koramangala 5th Block, Bengaluru
👥 Teams: 2 to 4 members
💰 Prize Pool: ₹1,50,000 + Swags
🔗 Register: https://unstop.com/
Free participation! Mentors from top startups will guide teams.`;

const SAMPLE_WHATSAPP_DESIGN = `🎨 *Design Systems for Everyone · In-Person Sprint*
Hosted by DesignCircle Bangalore
📅 Date: 21/11/2026
⏰ Time: 3:00 PM IST
📍 Venue: 100 Feet Rd, Indiranagar, Bengaluru (350m from Indiranagar Metro)
🔗 Registration: https://meetup.com/design-systems-bangalore
Free entry. Bring your laptops!`;

function localDateTimeValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function inferredLocality(raw: string): string {
  const text = raw.toLowerCase();
  return localities.find((locality) =>
    text.includes(locality.name.toLowerCase()) ||
    locality.aliases.some((alias) => alias.length > 2 && text.includes(alias.toLowerCase()))
  )?.id ?? '';
}

export function SmartWhatsAppImporterModal({ open, onClose }: SmartWhatsAppImporterModalProps) {
  const { currentUser, createSubmission, submitSubmission, requireAuth } = useApp();
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [inputText, setInputText] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedTitle, setExtractedTitle] = useState('');
  const [extractedType, setExtractedType] = useState<EventType | ''>('');
  const [extractedMode, setExtractedMode] = useState<EventMode | ''>('');
  const [extractedDate, setExtractedDate] = useState('');
  const [extractedLocality, setExtractedLocality] = useState('');
  const [extractedVenue, setExtractedVenue] = useState('');
  const [extractedPriceKind, setExtractedPriceKind] = useState<Price['kind']>('unknown');
  const [extractedPriceAmount, setExtractedPriceAmount] = useState('');
  const [extractedUrl, setExtractedUrl] = useState('');
  const [extractedTopics, setExtractedTopics] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState('');

  if (!open) return null;

  const parseRawText = (raw: string) => {
    setInputText(raw);
    setError('');
    setSubmittedId('');
    const draft = parseInstantText(raw);
    setExtractedTitle(draft.title.value?.replace(/[*🚨🔥🎨🎉]/g, '').trim() ?? '');
    setExtractedType(draft.eventType.value ?? '');
    setExtractedMode(draft.mode.value ?? '');
    setExtractedDate(localDateTimeValue(draft.startDatetime.value));
    setExtractedLocality(inferredLocality(raw));
    setExtractedVenue(draft.venueName.value ?? '');
    setExtractedPriceKind(draft.price.value.kind);
    setExtractedPriceAmount(draft.price.value.amountInr?.toString() ?? '');
    setExtractedUrl(draft.registrationUrl.value ?? '');
    setExtractedTopics(draft.skills.value);
    setFeedback(raw.trim()
      ? 'Draft updated from supported evidence. Review every field; nothing is saved or public yet.'
      : '');
  };

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setOcrLoading(true);
    setOcrProgress(0);
    setError('');
    try {
      const text = await extractPosterText(file, (progress) => setOcrProgress(Math.round(progress * 100)));
      parseRawText(text);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not read text from this image.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      requireAuth('/search', 'submit this extracted event for review');
      return;
    }
    setError('');
    const title = extractedTitle.trim();
    const venueName = extractedVenue.trim();
    const registrationUrl = extractedUrl.trim();
    const start = new Date(extractedDate).getTime();
    if (title.length < 5 || !extractedType || !extractedMode || !Number.isFinite(start)) {
      setError('Confirm a title, event type, mode, and valid start date before submitting.');
      return;
    }
    if (start <= Date.now()) {
      setError('Choose a future event start, or correct the extracted date.');
      return;
    }
    if (extractedMode !== 'online' && (!venueName || !extractedLocality)) {
      setError('An in-person or hybrid event needs its extracted venue and a reviewed locality. Unknown values must not be guessed.');
      return;
    }
    if (extractedMode === 'online' && !registrationUrl) {
      setError('An online event requires a registration or joining link.');
      return;
    }
    if (registrationUrl && !validWebUrl(registrationUrl)) {
      setError('Enter a valid HTTP(S) registration or official event link.');
      return;
    }
    if (extractedPriceKind === 'paid' && extractedPriceAmount && Number(extractedPriceAmount) <= 0) {
      setError('Use a positive paid amount, or leave the amount blank when it is not stated.');
      return;
    }

    setSubmitting(true);
    try {
      const created = createSubmission(inputText);
      const price: Price = {
        kind: extractedPriceKind,
        amountInr: extractedPriceKind === 'free' ? 0 : extractedPriceKind === 'paid' && extractedPriceAmount ? Number(extractedPriceAmount) : null,
        note: extractedPriceKind === 'unknown' ? 'Price not stated in the source' : extractedPriceKind === 'paid' && !extractedPriceAmount ? 'Paid; amount not stated' : 'Confirmed by submitter',
      };
      submitSubmission(created.id, {
        title,
        startAt: new Date(extractedDate).toISOString(),
        venueName: venueName || null,
        registrationUrl: registrationUrl || null,
        eventType: extractedType,
        mode: extractedMode,
        price,
        localityId: extractedLocality || null,
      });
      setSubmittedId(created.id);
      setFeedback('Submitted for human review. This event is not public and no native registration was created.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit this draft for review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    const summary = `Event: ${extractedTitle || 'Not confirmed'}\nType: ${extractedType || 'Not detected'}\nMode: ${extractedMode || 'Not detected'}\nDate: ${extractedDate || 'Not detected'}\nVenue: ${extractedVenue || 'Not detected'}\nPrice: ${extractedPriceKind === 'unknown' ? 'Not stated' : extractedPriceKind}\nRegister: ${extractedUrl || 'Not detected'}`;
    void navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="unstop-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="unstop-modal whatsapp-importer-modal" role="dialog" aria-modal="true" aria-labelledby="whatsapp-importer-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="unstop-modal__header">
          <div>
            <span className="unstop-badge"><Sparkles size={12} /> Rule-based draft importer</span>
            <h2 id="whatsapp-importer-title">Import from WhatsApp &amp; Event Flyers</h2>
            <p>Extract supported details, correct uncertain fields, and submit a private draft for human review. Nothing publishes automatically.</p>
          </div>
          <button className="unstop-modal__close" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
        </div>

        <div className="whatsapp-tabs">
          <button type="button" className={`whatsapp-tab ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}><MessageSquare size={16} /> WhatsApp Forward / Text</button>
          <button type="button" className={`whatsapp-tab ${activeTab === 'image' ? 'active' : ''}`} onClick={() => setActiveTab('image')}><FileImage size={16} /> Event Poster / Flyer OCR</button>
        </div>

        <div className="whatsapp-modal-body">
          {activeTab === 'text' ? (
            <div className="whatsapp-input-section">
              <div className="sample-chips-row">
                <span>Labelled sample templates:</span>
                <button type="button" className="sample-chip" onClick={() => parseRawText(SAMPLE_WHATSAPP_HACKATHON)}>Hackathon sample</button>
                <button type="button" className="sample-chip" onClick={() => parseRawText(SAMPLE_WHATSAPP_AI)}>HSR meetup sample</button>
                <button type="button" className="sample-chip" onClick={() => parseRawText(SAMPLE_WHATSAPP_DESIGN)}>Design sprint sample</button>
              </div>
              <textarea className="whatsapp-textarea" rows={6} value={inputText} onChange={(event) => parseRawText(event.target.value)} placeholder="Paste WhatsApp or forwarded event text here…" />
            </div>
          ) : (
            <div className="whatsapp-upload-section">
              <label className="whatsapp-dropzone">
                <UploadCloud size={36} />
                <strong>Drop or choose an Event Poster / Instagram Flyer</strong>
                <span>PNG, JPG or WebP up to 8 MB · local Tesseract OCR</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleImageUpload(event.target.files?.[0])} disabled={ocrLoading} />
              </label>
              {ocrLoading && <div className="whatsapp-ocr-status"><div className="ocr-progress-bar" style={{ width: `${ocrProgress}%` }} /><span>Reading flyer text locally… {ocrProgress}%</span></div>}
            </div>
          )}

          <div className="reader-limits"><LockKeyhole size={16} /><span>Original text stays private submission evidence. It is not copied into a public event description.</span></div>

          <div className="extracted-preview-box">
            <div className="extracted-preview-header">
              <CheckCircle2 size={16} color="var(--primary)" />
              <strong>Evidence-based extraction preview</strong>
              <span className="clean-pill">Review required</span>
            </div>
            <div className="extracted-fields-grid">
              <label>Event Title<input value={extractedTitle} onChange={(event) => setExtractedTitle(event.target.value)} placeholder="Required; not detected automatically" /></label>
              <label>Event Type<select value={extractedType} onChange={(event) => setExtractedType(event.target.value as EventType | '')}><option value="">Not detected — choose</option><option value="hackathon">Hackathon</option><option value="meetup">Meetup</option><option value="workshop">Workshop</option><option value="conference">Conference</option><option value="summit">Summit</option><option value="community_session">Community Session</option><option value="other">Other</option></select></label>
              <label>Date &amp; Time<input type="datetime-local" value={extractedDate} onChange={(event) => setExtractedDate(event.target.value)} /></label>
              <label>Mode<select value={extractedMode} onChange={(event) => setExtractedMode(event.target.value as EventMode | '')}><option value="">Not detected — choose</option><option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option></select></label>
              <label>Locality / Area<select value={extractedLocality} onChange={(event) => setExtractedLocality(event.target.value)}><option value="">Not detected — review required</option>{localities.map((locality) => <option key={locality.id} value={locality.id}>{locality.name}, {locality.city}</option>)}</select></label>
              <label>Price Evidence<select value={extractedPriceKind} onChange={(event) => setExtractedPriceKind(event.target.value as Price['kind'])}><option value="unknown">Not stated</option><option value="free">Free (explicitly stated)</option><option value="paid">Paid</option></select></label>
              <label className="span-2">Venue Name &amp; Landmark<input value={extractedVenue} onChange={(event) => setExtractedVenue(event.target.value)} placeholder="Preserved only when explicit venue evidence exists" /></label>
              {extractedPriceKind === 'paid' && <label>Paid Amount INR <span>Optional if not stated</span><input type="number" min="0" value={extractedPriceAmount} onChange={(event) => setExtractedPriceAmount(event.target.value)} /></label>}
              <label className="span-2">Registration / RSVP / Joining Link<input type="url" value={extractedUrl} onChange={(event) => setExtractedUrl(event.target.value)} placeholder="Required for online events" /></label>
            </div>
            <p className="field-note">Detected skills: {extractedTopics.length ? extractedTopics.join(', ') : 'none supported by the evidence'}.</p>
          </div>

          {feedback && <div className="form-success" role="status">{feedback}</div>}
          {submittedId && <div className="form-success" role="status"><CheckCircle2 size={16} /> Private submission {submittedId} is pending human review. It is not a public event.</div>}
          {error && <div className="form-error" role="alert"><AlertCircle size={16} /> {error}</div>}
        </div>

        <div className="unstop-modal__footer">
          <button type="button" className="button button--secondary" onClick={handleCopy} disabled={!inputText.trim()}><Copy size={16} /> {copied ? 'Copied Summary!' : 'Copy Summary'}</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="button button--ghost" onClick={onClose}>Close</button>
            {!submittedId && <button type="button" className="button button--accent" onClick={() => void handleSubmit()} disabled={submitting || !inputText.trim()}><Sparkles size={16} /> {submitting ? 'Submitting draft…' : 'Submit for human review'} <ArrowRight size={16} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}
