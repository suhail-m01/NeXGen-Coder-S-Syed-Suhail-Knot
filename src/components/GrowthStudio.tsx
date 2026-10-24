import { BarChart3, Copy, Download, Plus, QrCode, Share2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildReturnCohorts, referralChannelStats } from '../domain/growth';
import { formatEventDate } from '../domain/events';
import type { KnotEvent, ReferralCampaign } from '../domain/types';
import { useApp } from '../state/AppContext';

const referralUrl = (event: KnotEvent, campaign: ReferralCampaign) => `${window.location.origin}/events/${event.id}?ref=${encodeURIComponent(campaign.token)}`;

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return; }
  const input = document.createElement('textarea');
  input.value = value; document.body.appendChild(input); input.select();
  document.execCommand('copy'); input.remove();
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3) {
  const words = text.split(/\s+/); let line = ''; let lineNumber = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y + lineNumber * lineHeight); line = word; lineNumber += 1;
      if (lineNumber >= maxLines - 1) break;
    } else line = candidate;
  }
  context.fillText(line.length > 90 ? `${line.slice(0, 87)}…` : line, x, y + lineNumber * lineHeight);
}

function ReferralLink({ event, campaign }: { event: KnotEvent; campaign: ReferralCampaign }) {
  const [qr, setQr] = useState('');
  const [message, setMessage] = useState('');
  const url = referralUrl(event, campaign);
  useEffect(() => { void QRCode.toDataURL(url, { width: 280, margin: 2 }).then(setQr); }, [url]);
  const downloadCard = () => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
    const context = canvas.getContext('2d'); if (!context) return;
    const gradient = context.createLinearGradient(0, 0, 1200, 630); gradient.addColorStop(0, '#211334'); gradient.addColorStop(1, '#6546bd');
    context.fillStyle = gradient; context.fillRect(0, 0, 1200, 630);
    context.fillStyle = '#ff9878'; context.font = '700 28px Arial'; context.fillText('KNOT · FIND YOUR NEXT EVENT', 72, 90);
    context.fillStyle = '#ffffff'; context.font = '700 62px Arial'; wrapCanvasText(context, event.title, 72, 210, 980, 72, 3);
    context.fillStyle = '#ddd2ee'; context.font = '28px Arial'; context.fillText(formatEventDate(event.startAt), 72, 465);
    context.fillText(`${event.organizerName} · ${campaign.label}`, 72, 515);
    context.fillStyle = '#ffffff'; context.font = '700 24px Arial'; context.fillText('Open the event link to review rules and registration.', 72, 575);
    const anchor = document.createElement('a'); anchor.href = canvas.toDataURL('image/png'); anchor.download = `${event.slug}-${campaign.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-share-card.png`; anchor.click();
  };
  return <article className="referral-card"><div><span className="eyebrow">{campaign.active ? 'Active channel' : 'Inactive'}</span><h3>{campaign.label}</h3><p>Aggregate session opens and native conversions only.</p></div><label>Share URL<input readOnly value={url} onFocus={(input) => input.target.select()} /></label><div className="button-row"><button className="button button--secondary button--small" onClick={() => { void copyText(url).then(() => setMessage('Link copied.')).catch(() => setMessage('Select and copy the URL manually.')); }}><Copy /> Copy link</button><button className="button button--secondary button--small" onClick={downloadCard}><Download /> Share card</button>{qr && <a className="button button--ghost button--small" href={qr} download={`${event.slug}-${campaign.id}-qr.png`}><QrCode /> QR PNG</a>}</div>{qr && <img className="referral-qr" src={qr} alt={`QR code for the ${campaign.label} event referral link`} />}{message && <small role="status">{message}</small>}</article>;
}

export function GrowthStudio({ event }: { event: KnotEvent }) {
  const { data, currentUser, createReferralCampaign } = useApp();
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState('');
  const campaigns = data.referralCampaigns.filter((campaign) => campaign.eventId === event.id);
  const stats = referralChannelStats(event.id, data.referralCampaigns, data.referralVisits, data.registrations);
  const cohorts = currentUser ? buildReturnCohorts(data.events, data.registrations, data.users, currentUser.id) : [];
  return <div className="growth-studio">
    <section className="panel"><div className="panel__heading"><div><span className="eyebrow">Distribution with honest attribution</span><h2>Referral channels & share tools</h2><p>Each link records a session-deduplicated aggregate open. Native confirmations and external handoffs remain separate.</p></div><Share2 /></div><div className="form-grid"><label>New channel label<input value={label} onChange={(input) => setLabel(input.target.value)} placeholder="e.g. Instagram, college newsletter" /></label><button className="button button--primary" onClick={() => { try { createReferralCampaign(event.id, label); setLabel(''); setMessage('Referral channel created.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not create channel.'); } }}><Plus /> Create channel</button></div>{message && <p role="status" className="settings-note">{message}</p>}<div className="referral-grid">{campaigns.map((campaign) => <ReferralLink key={campaign.id} event={event} campaign={campaign} />)}{!campaigns.length && <div className="mini-empty">No referral channels yet. Create one to generate a real link, QR code and share card.</div>}</div>{stats.length > 0 && <div className="table-scroll"><table className="data-table"><thead><tr><th>Channel</th><th>Aggregate opens</th><th>Confirmed native</th><th>Native conversion</th><th>External handoffs</th></tr></thead><tbody>{stats.map((row) => <tr key={row.campaign.id}><td>{row.campaign.label}</td><td>{row.visits}</td><td>{row.nativeRegistrations}</td><td>{row.nativeConversionRate === null ? 'No opens yet' : `${row.nativeConversionRate}%`}</td><td>{row.externalHandoffs} · not registrations</td></tr>)}</tbody></table></div>}</section>
    <section className="panel"><div className="panel__heading"><div><span className="eyebrow">Explicit adult opt-in · verified attendance only</span><h2>60-day return cohorts</h2><p>Same-organizer returns after a first verified native attendance. External self-reports and minors are excluded.</p></div><BarChart3 /></div><div className="table-scroll"><table className="data-table"><thead><tr><th>First-attendance cohort</th><th>Eligible adults</th><th>Returned within 60 days</th><th>Rate</th><th>Window</th></tr></thead><tbody>{cohorts.map((row) => <tr key={row.cohort}><td>{row.cohort}</td><td>{row.status === 'suppressed' ? '<5 · suppressed' : row.eligibleAdults}</td><td>{row.status === 'suppressed' ? 'Suppressed' : row.returnedAdults}</td><td>{row.returnRate === null ? 'Not reported' : `${row.returnRate}%`}</td><td>{row.status === 'pending' ? 'Still maturing' : row.status === 'suppressed' ? 'Privacy threshold' : 'Complete'}</td></tr>)}</tbody></table>{!cohorts.length && <div className="mini-empty">No eligible adult return cohorts yet. Adults can opt in from Profile; only organizer-recorded attendance qualifies.</div>}</div><div className="privacy-callout"><ShieldCheck /><div><strong>No behavioural claim without a usable cohort</strong><p>Groups under five are suppressed. Pending 60-day windows have no rate. This is reporting, not proof of long-term community impact.</p></div></div></section>
  </div>;
}
