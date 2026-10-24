import { Image, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { deleteMediaBlob, getMediaBlob, normalizeImage, putMediaBlob } from '../data/mediaStore';
import { makeId } from '../data/repository';
import type { EventSponsor, KnotEvent, MediaAsset } from '../domain/types';
import { useApp } from '../state/AppContext';

export function useMediaUrl(assetId: string | null | undefined) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true; let objectUrl = '';
    setUrl('');
    if (!assetId) return;
    void getMediaBlob(assetId).then((blob) => {
      if (!blob || !active) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => { if (active) setUrl(''); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId]);
  return url;
}

export function MediaImage({ asset, className = '' }: { asset: MediaAsset; className?: string }) {
  const url = useMediaUrl(asset.id);
  return url ? <img className={className} src={url} alt={asset.altText} /> : <div className={`media-placeholder ${className}`} role="img" aria-label={asset.altText}><Image /><span>Optimized image unavailable</span></div>;
}

export function MediaLibrary({ event }: { event: KnotEvent }) {
  const { data, updateEventOperations, registerMediaAsset, setMediaStatus, removeMediaAsset } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<MediaAsset['kind']>('event_image');
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [consentBasis, setConsentBasis] = useState<MediaAsset['consentBasis']>('not_applicable');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorUrl, setSponsorUrl] = useState('');
  const [logoAssetId, setLogoAssetId] = useState('');
  const assets = data.mediaAssets.filter((asset) => asset.eventId === event.id && asset.status !== 'removed');
  const publishedLogos = assets.filter((asset) => asset.kind === 'sponsor_logo' && asset.status === 'published');
  const upload = async () => {
    if (!file) { setMessage('Choose an image file.'); return; }
    setPending(true); setMessage('');
    let asset: MediaAsset | null = null;
    try {
      const normalized = await normalizeImage(file);
      asset = registerMediaAsset(event.id, {
        kind, title, altText, consentBasis: kind === 'sponsor_logo' ? 'not_applicable' : consentBasis,
        mimeType: normalized.mimeType, sizeBytes: normalized.blob.size, width: normalized.width, height: normalized.height,
      });
      await putMediaBlob(asset.id, normalized.blob);
      setFile(null); setTitle(''); setAltText('');
      const input = document.getElementById('event-media-file') as HTMLInputElement | null; if (input) input.value = '';
      setMessage('Optimized image saved as a private draft. Review and publish it explicitly.');
    } catch (reason) {
      if (asset) { try { removeMediaAsset(asset.id); } catch { /* retain the original storage error */ } }
      setMessage(reason instanceof Error ? reason.message : 'Could not store this image.');
    } finally { setPending(false); }
  };
  const addSponsor = () => {
    try {
      const sponsor: EventSponsor = { id: makeId('sponsor'), name: sponsorName.trim(), url: sponsorUrl.trim(), logoAssetId: logoAssetId || null };
      updateEventOperations(event.id, { sponsors: [...(event.sponsors ?? []), sponsor] }, 'Sponsor library updated');
      setSponsorName(''); setSponsorUrl(''); setLogoAssetId(''); setMessage('Sponsor added.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not add sponsor.'); }
  };
  return <div className="media-studio">
    <section className="panel"><div className="panel__heading"><div><span className="eyebrow">Persistent local media · indexedDB blobs</span><h2>Event images & recap photos</h2><p>Uploads are normalized to WebP, capped at 1600 px and 1.5 MB, stripped of metadata and saved as drafts.</p></div><Upload /></div><div className="media-upload-form"><div className="form-grid"><label>Image file<input id="event-media-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(input) => setFile(input.target.files?.[0] ?? null)} /></label><label>Media kind<select value={kind} onChange={(input) => { const value = input.target.value as MediaAsset['kind']; setKind(value); if (value === 'sponsor_logo') setConsentBasis('not_applicable'); }}><option value="event_image">Event image</option><option value="recap_photo">Recap photo</option><option value="sponsor_logo">Sponsor logo</option></select></label><label>Title<input value={title} onChange={(input) => setTitle(input.target.value)} /></label><label>Alternative text<input value={altText} onChange={(input) => setAltText(input.target.value)} placeholder="Describe content, not participant identities" /></label>{kind !== 'sponsor_logo' && <label>Photo consent basis<select value={consentBasis} onChange={(input) => setConsentBasis(input.target.value as MediaAsset['consentBasis'])}><option value="not_applicable">No recognizable people</option><option value="adult_only_declared">Organizer declares adult photo consent</option><option value="guardian_consent_declared">Organizer declares documented guardian photo consent</option></select></label>}</div><button className="button button--primary" disabled={pending} onClick={() => void upload()}><Upload /> {pending ? 'Optimizing…' : 'Save private draft'}</button></div>{message && <p className="settings-note" role="status">{message}</p>}<div className="privacy-callout"><ShieldCheck /><div><strong>Consent declarations are not independent verification</strong><p>Do not name recognizable participants in alt text. Guardian-photo-consent declarations require production evidence and safeguarding review before real activation.</p></div></div><div className="media-library-grid">{assets.map((asset) => <article className="media-asset" key={asset.id}><MediaImage asset={asset} /><div><span className="eyebrow">{asset.kind.replaceAll('_', ' ')} · {asset.status}</span><h3>{asset.title}</h3><p>{Math.ceil(asset.sizeBytes / 1024)} KB · {asset.width}×{asset.height} · {asset.consentBasis.replaceAll('_', ' ')}</p><div className="button-row"><button className="button button--secondary button--small" onClick={() => { try { setMediaStatus(asset.id, asset.status === 'published' ? 'draft' : 'published'); setMessage(asset.status === 'published' ? 'Media returned to draft.' : 'Media published with its recorded consent basis.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not update media.'); } }}>{asset.status === 'published' ? 'Unpublish' : 'Publish'}</button><button className="button button--ghost button--small" onClick={() => { try { removeMediaAsset(asset.id); void deleteMediaBlob(asset.id); setMessage('Media taken down and local blob deletion requested.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not take down media.'); } }}><Trash2 /> Take down</button></div></div></article>)}{!assets.length && <div className="mini-empty">No event media yet.</div>}</div></section>
    <section className="panel"><div className="panel__heading"><div><span className="eyebrow">Reusable event operations</span><h2>Sponsor library</h2><p>Sponsor names and links are organizer claims. Logos must first be published from this event’s media library.</p></div><Image /></div><div className="form-grid"><label>Sponsor name<input value={sponsorName} onChange={(input) => setSponsorName(input.target.value)} /></label><label>Sponsor URL<input type="url" value={sponsorUrl} onChange={(input) => setSponsorUrl(input.target.value)} placeholder="https://…" /></label><label>Published logo <span>Optional</span><select value={logoAssetId} onChange={(input) => setLogoAssetId(input.target.value)}><option value="">No logo</option>{publishedLogos.map((asset) => <option key={asset.id} value={asset.id}>{asset.title}</option>)}</select></label></div><button className="button button--primary" onClick={addSponsor}><Plus /> Add sponsor</button><div className="sponsor-admin-list">{(event.sponsors ?? []).map((sponsor) => <article key={sponsor.id}><span><strong>{sponsor.name}</strong><small>{sponsor.url}</small></span><button className="icon-button" aria-label={`Remove ${sponsor.name}`} onClick={() => { try { updateEventOperations(event.id, { sponsors: (event.sponsors ?? []).filter((item) => item.id !== sponsor.id) }, 'Sponsor removed'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not remove sponsor.'); } }}><Trash2 /></button></article>)}{!(event.sponsors ?? []).length && <div className="mini-empty">No sponsors added.</div>}</div></section>
  </div>;
}
