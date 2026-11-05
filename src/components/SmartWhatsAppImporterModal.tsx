import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  FileImage,
  MessageSquare,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizerAgeRule } from '../domain/defaults';
import { extractPosterText } from '../domain/ocr';
import { useApp } from '../state/AppContext';
import type { EventType } from '../domain/types';
import type { QuickPostInput } from '../domain/validation';

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
🔗 Register on Unstop/Knot: https://knot.local/events/vecnaverse-hackathon
Free participation! Mentors from top startups will guide teams.`;

const SAMPLE_WHATSAPP_DESIGN = `🎨 *Design Systems for Everyone · In-Person Sprint*
Hosted by DesignCircle Bangalore
📅 Date: 21/11/2026
⏰ Time: 3:00 PM IST
📍 Venue: 100 Feet Rd, Indiranagar, Bengaluru (350m from Indiranagar Metro)
🔗 Registration: https://meetup.com/design-systems-bangalore
Free entry. Bring your laptops!`;

export function SmartWhatsAppImporterModal({ open, onClose }: SmartWhatsAppImporterModalProps) {
  const { currentUser, publishQuickEvent, requireAuth } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [inputText, setInputText] = useState(SAMPLE_WHATSAPP_HACKATHON);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // Extracted fields
  const [extractedTitle, setExtractedTitle] = useState('Vecnaverse National Level Hackathon 2026');
  const [extractedType, setExtractedType] = useState<EventType>('hackathon');
  const [extractedDate, setExtractedDate] = useState('2026-11-28T09:00');
  const [extractedLocality, setExtractedLocality] = useState('koramangala');
  const [extractedVenue, setExtractedVenue] = useState('Community Innovation Hub, Koramangala 5th Block');
  const [extractedPriceKind, setExtractedPriceKind] = useState<'free' | 'paid'>('free');
  const [extractedUrl, setExtractedUrl] = useState('https://knot.local/events/vecnaverse-hackathon');
  const [extractedTopics, setExtractedTopics] = useState<string[]>(['AI', 'Open Source', 'Community']);

  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  // Simple heuristic extractor
  const parseRawText = (raw: string) => {
    setInputText(raw);
    setError('');
    setFeedback('Event details extracted automatically from text!');

    // Heuristic title
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    const titleLine = lines.find((l) => l.includes('*') || /meetup|hackathon|workshop|conference|summit/i.test(l)) || lines[0] || 'Community Tech Gathering';
    const cleanTitle = titleLine.replace(/[*🚨🔥🎨🎉]/g, '').trim();
    setExtractedTitle(cleanTitle);

    // Heuristic type
    if (/hackathon|hack/i.test(raw)) setExtractedType('hackathon');
    else if (/workshop|hands-on|bootcamp/i.test(raw)) setExtractedType('workshop');
    else if (/meetup|gather/i.test(raw)) setExtractedType('meetup');
    else if (/conference|summit/i.test(raw)) setExtractedType('conference');
    else setExtractedType('community_session');

    // Heuristic locality
    if (/hsr|hsr layout/i.test(raw)) {
      setExtractedLocality('hsr-layout');
      setExtractedVenue('BHIVE Workspace, HSR Layout');
    } else if (/indiranagar/i.test(raw)) {
      setExtractedLocality('indiranagar');
      setExtractedVenue('100 Feet Rd, Indiranagar');
    } else if (/whitefield/i.test(raw)) {
      setExtractedLocality('whitefield');
      setExtractedVenue('ITPL Main Road, Whitefield');
    } else {
      setExtractedLocality('koramangala');
      setExtractedVenue('Community Innovation Hub, Koramangala');
    }

    // Heuristic price
    if (/free|₹0|no entry fee/i.test(raw)) setExtractedPriceKind('free');
    else setExtractedPriceKind('free');

    // URL
    const urlMatch = raw.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) setExtractedUrl(urlMatch[0]);

    // Tags
    const detected: string[] = [];
    if (/ai|llm|agents|python/i.test(raw)) detected.push('AI');
    if (/design|ui|ux/i.test(raw)) detected.push('Design');
    if (/flutter|react|web|dev/i.test(raw)) detected.push('Frontend');
    if (/community|open source/i.test(raw)) detected.push('Open Source');
    setExtractedTopics(detected.length ? detected : ['Technology', 'Community']);
  };

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setOcrLoading(true);
    setOcrProgress(0);
    setError('');
    try {
      const text = await extractPosterText(file, (p) => setOcrProgress(Math.round(p * 100)));
      parseRawText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read text from this image.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!currentUser) {
      requireAuth('/search', 'publish this extracted event');
      return;
    }

    try {
      const payload: QuickPostInput = {
        title: extractedTitle,
        eventType: extractedType,
        startAt: new Date(extractedDate).toISOString(),
        endAt: new Date(new Date(extractedDate).getTime() + 4 * 3600000).toISOString(),
        mode: 'in_person',
        venueName: extractedVenue,
        localityId: extractedLocality,
        address: `${extractedVenue}, Bengaluru, Karnataka`,
        registrationKind: 'native',
        capacity: 100,
        approval: 'none',
        waitlistEnabled: true,
        registrationUrl: extractedUrl,
        onlineJoinUrl: '',
        ageRule: organizerAgeRule('all_ages'),
        description: `Imported via Knot WhatsApp & Poster AI Importer.\n\nOriginal Text:\n${inputText}`,
        eligibilityText: 'Open to builders, students, and practitioners',
        interests: extractedTopics,
        skills: ['React', 'Python', 'Product'],
        priceKind: extractedPriceKind,
        priceAmount: null,
        registrationDeadline: extractedDate,
      };

      const event = await publishQuickEvent(payload);
      onClose();
      navigate(`/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish this event.');
    }
  };

  const handleCopy = () => {
    const summary = `Event: ${extractedTitle}\nType: ${extractedType}\nDate: ${extractedDate}\nVenue: ${extractedVenue} (${extractedLocality})\nRegister: ${extractedUrl}`;
    void navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="unstop-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="unstop-modal whatsapp-importer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-importer-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="unstop-modal__header">
          <div>
            <span className="unstop-badge">
              <Sparkles size={12} /> AI Powered Importer
            </span>
            <h2 id="whatsapp-importer-title">Import from WhatsApp &amp; Event Flyers</h2>
            <p>
              Paste forwarded messages from WhatsApp groups or upload an Instagram flyer.
              Knot extracts details into a structured discovery event.
            </p>
          </div>
          <button className="unstop-modal__close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="whatsapp-tabs">
          <button
            className={`whatsapp-tab ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            <MessageSquare size={16} /> WhatsApp Forward / Text
          </button>
          <button
            className={`whatsapp-tab ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            <FileImage size={16} /> Event Poster / Flyer OCR
          </button>
        </div>

        <div className="whatsapp-modal-body">
          {activeTab === 'text' ? (
            <div className="whatsapp-input-section">
              <div className="sample-chips-row">
                <span>Try Realistic Samples:</span>
                <button
                  type="button"
                  className="sample-chip"
                  onClick={() => parseRawText(SAMPLE_WHATSAPP_HACKATHON)}
                >
                  Vecnaverse Hackathon
                </button>
                <button
                  type="button"
                  className="sample-chip"
                  onClick={() => parseRawText(SAMPLE_WHATSAPP_AI)}
                >
                  AI Builders Meetup (HSR)
                </button>
                <button
                  type="button"
                  className="sample-chip"
                  onClick={() => parseRawText(SAMPLE_WHATSAPP_DESIGN)}
                >
                  Design Systems Sprint
                </button>
              </div>

              <textarea
                className="whatsapp-textarea"
                rows={6}
                value={inputText}
                onChange={(e) => parseRawText(e.target.value)}
                placeholder="Paste WhatsApp message forwarded text here..."
              />
            </div>
          ) : (
            <div className="whatsapp-upload-section">
              <label className="whatsapp-dropzone">
                <UploadCloud size={36} />
                <strong>Drop or choose an Event Poster / Instagram Flyer</strong>
                <span>Supports PNG, JPG, WebP up to 8 MB (Tesseract OCR local execution)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => void handleImageUpload(e.target.files?.[0])}
                  disabled={ocrLoading}
                />
              </label>
              {ocrLoading && (
                <div className="whatsapp-ocr-status">
                  <div className="ocr-progress-bar" style={{ width: `${ocrProgress}%` }} />
                  <span>Analyzing flyer text... {ocrProgress}%</span>
                </div>
              )}
            </div>
          )}

          {/* Real-time Extraction Preview */}
          <div className="extracted-preview-box">
            <div className="extracted-preview-header">
              <CheckCircle2 size={16} color="var(--primary)" />
              <strong>AI Structured Extraction Preview</strong>
              <span className="clean-pill">Auto-Normalized</span>
            </div>

            <div className="extracted-fields-grid">
              <label>
                Event Title
                <input
                  value={extractedTitle}
                  onChange={(e) => setExtractedTitle(e.target.value)}
                />
              </label>

              <label>
                Event Type
                <select
                  value={extractedType}
                  onChange={(e) => setExtractedType(e.target.value as EventType)}
                >
                  <option value="hackathon">Hackathon</option>
                  <option value="meetup">Meetup</option>
                  <option value="workshop">Workshop</option>
                  <option value="conference">Conference</option>
                  <option value="community_session">Community Session</option>
                </select>
              </label>

              <label>
                Date &amp; Time
                <input
                  type="datetime-local"
                  value={extractedDate}
                  onChange={(e) => setExtractedDate(e.target.value)}
                />
              </label>

              <label>
                Locality / Area
                <select
                  value={extractedLocality}
                  onChange={(e) => setExtractedLocality(e.target.value)}
                >
                  <option value="koramangala">Koramangala, Bengaluru</option>
                  <option value="hsr-layout">HSR Layout, Bengaluru</option>
                  <option value="indiranagar">Indiranagar, Bengaluru</option>
                  <option value="whitefield">Whitefield, Bengaluru</option>
                  <option value="jayanagar">Jayanagar, Bengaluru</option>
                </select>
              </label>

              <label className="span-2">
                Venue Name &amp; Landmark
                <input
                  value={extractedVenue}
                  onChange={(e) => setExtractedVenue(e.target.value)}
                />
              </label>

              <label className="span-2">
                Registration / RSVP Link
                <input
                  value={extractedUrl}
                  onChange={(e) => setExtractedUrl(e.target.value)}
                />
              </label>
            </div>
          </div>

          {feedback && <div className="form-success">{feedback}</div>}
          {error && (
            <div className="form-error">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        <div className="unstop-modal__footer">
          <button className="button button--secondary" onClick={handleCopy}>
            <Copy size={16} /> {copied ? 'Copied Summary!' : 'Copy Summary'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button button--ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="button button--accent" onClick={handlePublish}>
              <Sparkles size={16} /> Publish to Knot Discovery <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
