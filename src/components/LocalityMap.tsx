import { MapPin, Navigation } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventCoordinates } from '../domain/geo';
import { eventDistance, eventTypeLabel, formatEventDate } from '../domain/events';
import { localityById } from '../domain/localities';
import type { KnotEvent, Locality } from '../domain/types';

export function LocalityMap({ events, origin }: { events: KnotEvent[]; origin: Locality | null }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const groups = useMemo(() => {
    const mapped = events.map((event) => {
      const locality = localityById(event.venue?.localityId);
      const coordinates = eventCoordinates(event, locality);
      return coordinates ? { event, locality, coordinates } : null;
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    const buckets = new Map<string, typeof mapped>();
    mapped.forEach((item) => {
      const key = item.event.venue?.localityId ?? item.event.id;
      buckets.set(key, [...(buckets.get(key) ?? []), item]);
    });
    return Array.from(buckets.values());
  }, [events]);
  const all = groups.flat();
  const lats = all.map((item) => item.coordinates.latitude);
  const lons = all.map((item) => item.coordinates.longitude);
  if (origin) { lats.push(origin.latitude); lons.push(origin.longitude); }
  const minLat = Math.min(...lats, 12.82), maxLat = Math.max(...lats, 13.15);
  const minLon = Math.min(...lons, 77.45), maxLon = Math.max(...lons, 77.80);
  const latSpan = Math.max(0.08, maxLat - minLat), lonSpan = Math.max(0.08, maxLon - minLon);
  const position = (lat: number, lon: number) => ({
    left: `${8 + ((lon - minLon) / lonSpan) * 84}%`,
    top: `${8 + ((maxLat - lat) / latSpan) * 84}%`,
  });
  const selected = all.find((item) => item.event.id === selectedId)?.event ?? null;
  const unmapped = events.filter((event) => event.mode !== 'online' && !eventCoordinates(event, localityById(event.venue?.localityId))).length;

  return (
    <div className="map-layout">
      <div className="locality-map" role="region" aria-label="Event locality map">
        <svg className="map-texture" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-40 520 C160 460 220 550 410 420 S760 280 1040 340" />
          <path d="M100 -40 C180 140 340 170 400 330 S500 600 660 740" />
          <path d="M-20 180 C230 220 350 100 600 180 S820 350 1020 250" />
          <path d="M240 -30 C250 190 180 380 300 730" />
          <path d="M760 -30 C680 200 790 410 710 730" />
        </svg>
        <div className="map-watermark"><Navigation size={16} /> Bengaluru · locality view</div>
        {origin && <div className="origin-marker" style={position(origin.latitude, origin.longitude)} title={`Your area: ${origin.name}`}><span /></div>}
        {groups.map((group) => {
          const first = group[0];
          const point = position(first.coordinates.latitude, first.coordinates.longitude);
          return <button
            key={first.event.venue?.localityId ?? first.event.id}
            className={`map-pin ${selectedId === first.event.id ? 'map-pin--selected' : ''}`}
            style={point}
            onClick={() => setSelectedId(first.event.id)}
            aria-label={`${group.length} event${group.length > 1 ? 's' : ''} in ${first.locality?.name ?? 'this area'}`}
          ><MapPin size={18} />{group.length > 1 && <strong>{group.length}</strong>}</button>;
        })}
        {groups.length === 0 && <div className="map-empty"><MapPin size={25} /><strong>No mappable events</strong><span>Try online events or clear a filter.</span></div>}
        <div className="map-legend"><span><i className="legend-dot legend-dot--event" /> Event area</span><span><i className="legend-dot legend-dot--origin" /> Your area</span></div>
      </div>
      {selected && <div className="map-preview">
        <button className="map-preview__close" onClick={() => setSelectedId(null)} aria-label="Close event preview">×</button>
        <span className="eyebrow">{eventTypeLabel(selected.eventType)} · {selected.venue?.locationPrecision} location</span>
        <Link to={`/events/${selected.id}`}><strong>{selected.title}</strong></Link>
        <span>{formatEventDate(selected.startAt)}</span>
        <span>{selected.venue?.name}{origin ? ` · ${eventDistance(selected, origin)?.toFixed(1) ?? '—'} km` : ''}</span>
      </div>}
      {unmapped > 0 && <p className="map-note">{unmapped} event{unmapped > 1 ? 's have' : ' has'} no precise map location. See {unmapped > 1 ? 'them' : 'it'} in the list.</p>}
    </div>
  );
}
