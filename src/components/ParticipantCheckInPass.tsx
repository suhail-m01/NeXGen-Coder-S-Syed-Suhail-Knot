import { Download, QrCode, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkInPayload } from '../domain/checkin';
import type { KnotEvent, Registration } from '../domain/types';

export function ParticipantCheckInPass({ event, registration }: { event: KnotEvent; registration: Registration }) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const token = registration.checkInToken;

  useEffect(() => {
    if (!token) { setError('This older registration has not received a local pass token yet. Reload the workspace or use organizer check-in.'); return; }
    let active = true;
    import('qrcode').then(({ toDataURL }) => toDataURL(checkInPayload(token), {
      width: 232, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#211a3d', light: '#ffffff' },
    })).then((url) => { if (active) setDataUrl(url); })
      .catch(() => { if (active) setError('The QR image could not be generated. Your manual fallback code remains available.'); });
    return () => { active = false; };
  }, [token]);

  if (!token) return null;
  return <section className="checkin-pass" aria-label="Your QR check-in pass">
    <div className="checkin-pass__heading"><QrCode /><div><strong>Your check-in pass</strong><span>{event.title}</span></div></div>
    {dataUrl ? <img src={dataUrl} alt={`QR check-in pass for ${event.title}`} width="232" height="232" /> : <div className="checkin-pass__loading">{error || 'Generating your secure QR pass…'}</div>}
    {dataUrl && <a className="button button--secondary button--small" href={dataUrl} download={`${event.slug}-check-in.png`}><Download /> Save pass</a>}
    <details><summary>Manual fallback code</summary><code>{token}</code></details>
    <p><ShieldCheck />The QR contains a random pass token, not your email or profile. Show it only to this event’s organizer.</p>
  </section>;
}
