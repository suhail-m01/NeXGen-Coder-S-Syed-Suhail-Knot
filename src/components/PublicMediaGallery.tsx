import { ExternalLink, Image, ShieldCheck } from 'lucide-react';
import type { KnotEvent } from '../domain/types';
import { useApp } from '../state/AppContext';
import { MediaImage } from './MediaLibrary';

export function PublicMediaGallery({ event }: { event: KnotEvent }) {
  const { data } = useApp();
  const media = data.mediaAssets.filter((asset) => asset.eventId === event.id && asset.status === 'published');
  const sponsors = event.sponsors ?? [];
  if (!media.length && !sponsors.length) return null;
  return <>
    {sponsors.length > 0 && <section className="event-section"><div className="section-title-row"><h2>Event sponsors</h2><Image /></div><p className="field-note">Sponsor names and links are organizer-provided claims.</p><div className="public-sponsors">{sponsors.map((sponsor) => { const logo = data.mediaAssets.find((asset) => asset.id === sponsor.logoAssetId && asset.status === 'published' && asset.kind === 'sponsor_logo'); return <a key={sponsor.id} href={sponsor.url} target="_blank" rel="noreferrer">{logo && <MediaImage asset={logo} />}<span><strong>{sponsor.name}</strong><small>Visit sponsor <ExternalLink /></small></span></a>; })}</div></section>}
    {media.some((asset) => asset.kind !== 'sponsor_logo') && <section className="event-section"><div className="section-title-row"><h2>Event media & recap</h2><Image /></div><div className="public-media-grid">{media.filter((asset) => asset.kind !== 'sponsor_logo').map((asset) => <figure key={asset.id}><MediaImage asset={asset} /><figcaption><strong>{asset.title}</strong><span>{asset.kind === 'recap_photo' ? 'Recap photo' : 'Event image'} · organizer consent basis recorded</span></figcaption></figure>)}</div><p className="field-note"><ShieldCheck /> Publication records an organizer consent declaration; it is not independent identity or consent verification.</p></section>}
  </>;
}
