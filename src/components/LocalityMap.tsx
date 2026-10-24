import { List, LocateFixed, MapPin, Minus, Navigation, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Map as LeafletMap, circleMarker, divIcon, latLngBounds, layerGroup, marker as leafletMarker, tileLayer,
  type LayerGroup,
} from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { eventCoordinates } from '../domain/geo';
import { eventDistance, eventTypeLabel, formatEventDate } from '../domain/events';
import { localityById } from '../domain/localities';
import { clusterByGrid, pointInViewport, type MapViewport } from '../domain/map';
import type { KnotEvent, Locality } from '../domain/types';

const tileUrl = import.meta.env?.VITE_TILE_URL?.trim() || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const tileAttribution = import.meta.env?.VITE_TILE_ATTRIBUTION?.trim() || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
const zoomForSpan = (span: number) => Math.max(2, Math.min(18, Math.round(Math.log2(360 / Math.max(0.02, span * 1.35)))));

export function LocalityMap({ events, origin }: { events: KnotEvent[]; origin: Locality | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewportOverride, setViewportOverride] = useState<MapViewport | null>(null);
  const [areaResults, setAreaResults] = useState<KnotEvent[] | null>(null);
  const [tileError, setTileError] = useState(false);
  const mapped = useMemo(() => events.map((event) => {
    const locality = localityById(event.venue?.localityId);
    const coordinates = eventCoordinates(event, locality);
    return coordinates ? { event, locality, coordinates } : null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)), [events]);
  const baseViewport = useMemo<MapViewport>(() => {
    const points = mapped.map((item) => item.coordinates);
    if (origin) points.push({ latitude: origin.latitude, longitude: origin.longitude });
    if (!points.length) return { latitude: 20.5937, longitude: 78.9629, span: 24 };
    const lats = points.map((point) => point.latitude); const lons = points.map((point) => point.longitude);
    const minLat = Math.min(...lats); const maxLat = Math.max(...lats); const minLon = Math.min(...lons); const maxLon = Math.max(...lons);
    return { latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2, span: Math.max(0.12, (maxLat - minLat) * 1.25, ((maxLon - minLon) / 1.35) * 1.25) };
  }, [mapped, origin]);
  const viewport = viewportOverride ?? baseViewport;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new LeafletMap(containerRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true });
    mapRef.current = map;
    map.setView([baseViewport.latitude, baseViewport.longitude], zoomForSpan(baseViewport.span));
    const tiles = tileLayer(tileUrl, { attribution: tileAttribution, maxZoom: 19, detectRetina: true }).addTo(map);
    tiles.on('tileerror', () => setTileError(true));
    tiles.on('load', () => setTileError(false));
    const sync = () => {
      const center = map.getCenter(); const bounds = map.getBounds();
      setViewportOverride({ latitude: center.lat, longitude: center.lng, span: Math.max(0.001, bounds.getNorth() - bounds.getSouth()) });
      setAreaResults(null);
    };
    map.on('moveend zoomend', sync);
    map.whenReady(() => window.setTimeout(() => map.invalidateSize(), 0));
    return () => {
      map.off('moveend zoomend', sync);
      map.remove();
      mapRef.current = null;
    };
  // Leaflet owns the map lifecycle; React receives viewport changes as state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setViewportOverride(null); setAreaResults(null); setSelectedId(null);
    if (mapped.length) {
      const bounds = latLngBounds(mapped.map((item) => [item.coordinates.latitude, item.coordinates.longitude]));
      if (origin) bounds.extend([origin.latitude, origin.longitude]);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
    } else if (origin) map.setView([origin.latitude, origin.longitude], 11);
    else map.setView([20.5937, 78.9629], 4);
  }, [mapped, origin]);

  const visible = useMemo(() => mapped.filter((item) => pointInViewport(item.coordinates, viewport)), [mapped, viewport]);
  const groups = useMemo(() => clusterByGrid(visible, (item) => item.coordinates, viewport.span / 7), [visible, viewport.span]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer: LayerGroup = layerGroup().addTo(map);
    if (origin && pointInViewport(origin, viewport)) {
      circleMarker([origin.latitude, origin.longitude], { radius: 9, color: '#247da8', weight: 2, fillColor: '#65b8df', fillOpacity: 0.45 })
        .addTo(layer).bindTooltip(`Your approximate area: ${origin.name}`);
    }
    for (const group of groups) {
      const first = group[0];
      const latitude = group.reduce((sum, item) => sum + item.coordinates.latitude, 0) / group.length;
      const longitude = group.reduce((sum, item) => sum + item.coordinates.longitude, 0) / group.length;
      const icon = divIcon({
        className: 'knot-leaflet-icon',
        html: `<span class="knot-leaflet-pin">${group.length > 1 ? `<strong>${group.length}</strong>` : ''}</span>`,
        iconSize: [38, 38], iconAnchor: [19, 36],
      });
      leafletMarker([latitude, longitude], { icon, keyboard: true, title: `${group.length} event${group.length > 1 ? 's' : ''} near ${first.locality?.name ?? 'this area'}`, alt: 'Event cluster' })
        .addTo(layer).on('click', () => setSelectedId(first.event.id));
    }
    return () => { layer.remove(); };
  }, [groups, origin, viewport]);

  const selected = mapped.find((item) => item.event.id === selectedId)?.event ?? null;
  const unmapped = events.filter((event) => event.mode !== 'online' && !eventCoordinates(event, localityById(event.venue?.localityId))).length;
  const pan = (x: number, y: number) => { mapRef.current?.panBy([x, y], { animate: true }); setSelectedId(null); };
  const reset = () => {
    const map = mapRef.current;
    if (!map) return;
    if (mapped.length) map.fitBounds(latLngBounds(mapped.map((item) => [item.coordinates.latitude, item.coordinates.longitude])), { padding: [35, 35], maxZoom: 13 });
    else map.setView([baseViewport.latitude, baseViewport.longitude], zoomForSpan(baseViewport.span));
    setAreaResults(null); setSelectedId(null);
  };

  return <div className="map-layout">
    <div className="map-toolbar" aria-label="Map viewport controls"><div><button className="icon-button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Plus /></button><button className="icon-button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Minus /></button><button className="icon-button" aria-label="Reset map viewport" onClick={reset}><LocateFixed /></button></div><div><button className="button button--ghost button--small" onClick={() => pan(-180, 0)}>← West</button><button className="button button--ghost button--small" onClick={() => pan(0, -180)}>North</button><button className="button button--ghost button--small" onClick={() => pan(0, 180)}>South</button><button className="button button--ghost button--small" onClick={() => pan(180, 0)}>East →</button></div><button className="button button--primary button--small" onClick={() => setAreaResults(visible.map((item) => item.event))}><Search /> Search this area</button></div>
    <div className="map-stage"><div className="locality-map real-basemap" ref={containerRef} role="region" aria-label="Event map with OpenStreetMap basemap">
      <div className="map-watermark"><Navigation size={16} /> {origin ? `${origin.name} · ${origin.city}` : 'India · loaded-event viewport'}</div>
      {tileError && <div className="map-tile-warning" role="status">Basemap tiles are unavailable. Event markers and the accessible list still work.</div>}
      {!groups.length && <div className="map-empty"><MapPin size={25} /><strong>No loaded events in this viewport</strong><span>Pan, zoom out or clear a filter.</span></div>}
      <div className="map-legend"><span><i className="legend-dot legend-dot--event" /> Event cluster</span><span><i className="legend-dot legend-dot--origin" /> Your area</span></div>
    </div>
    {selected && <div className="map-preview"><button className="map-preview__close" onClick={() => setSelectedId(null)} aria-label="Close event preview">×</button><span className="eyebrow">{eventTypeLabel(selected.eventType)} · {selected.venue?.locationPrecision} location</span><Link to={`/events/${selected.id}`}><strong>{selected.title}</strong></Link><span>{formatEventDate(selected.startAt)}</span><span>{selected.venue?.name}{origin ? ` · ${eventDistance(selected, origin)?.toFixed(1) ?? '—'} km` : ''}</span></div>}
    </div><section className="map-area-results" aria-label="Accessible map event list"><div><List /><span><strong>{areaResults ? `${areaResults.length} events in the searched viewport` : 'Accessible map list'}</strong><small>{areaResults ? 'Viewport filter applied to currently loaded events.' : 'Use Search this area after panning or zooming.'}</small></span></div>{areaResults && <div>{areaResults.length ? areaResults.map((event) => <Link key={event.id} to={`/events/${event.id}`}>{event.title}<span>{event.venue?.city ?? 'Online'} · {formatEventDate(event.startAt)}</span></Link>) : <p>No loaded events match this viewport.</p>}</div>}</section>
    <p className="map-note">Basemap tiles and attribution are provided through the configured tile URL. Only the approximate map viewport is requested; Knot does not send account details or precise GPS coordinates.</p>
    {unmapped > 0 && <p className="map-note">{unmapped} event{unmapped > 1 ? 's have' : ' has'} no precise map location. See {unmapped > 1 ? 'them' : 'it'} in the list.</p>}
  </div>;
}
