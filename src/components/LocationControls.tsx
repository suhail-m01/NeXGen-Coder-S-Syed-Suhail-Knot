import { LocateFixed, MapPin } from 'lucide-react';
import { useState } from 'react';
import { haversineKm } from '../domain/geo';
import { localities, localityById } from '../domain/localities';
import { useApp } from '../state/AppContext';

export function LocationControls({ light = false }: { light?: boolean }) {
  const { filters, setFilters } = useApp();
  const [message, setMessage] = useState('');
  const selected = localityById(filters.localityId);

  const chooseLocality = (localityId: string) => {
    setFilters({ ...filters, localityId });
    setMessage('');
  };

  const nearMe = () => {
    setMessage('Requesting location…');
    if (!navigator.geolocation) {
      setMessage('Location is unavailable. Choose your area instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const nearest = [...localities].sort((a, b) =>
        haversineKm(position.coords.latitude, position.coords.longitude, a.latitude, a.longitude) -
        haversineKm(position.coords.latitude, position.coords.longitude, b.latitude, b.longitude))[0];
      setFilters({ ...filters, localityId: nearest.id });
      setMessage(`Nearest known area: ${nearest.name}. Your live location was not saved.`);
    }, () => setMessage('Location permission was not available. Choose your area instead.'), { timeout: 8000, maximumAge: 300000 });
  };

  return (
    <div className={`location-controls ${light ? 'location-controls--light' : ''}`}>
      <div className="locality-select">
        <MapPin size={17} />
        <select value={selected?.id ?? ''} onChange={(event) => chooseLocality(event.target.value)} aria-label="Choose your locality">
          {localities.map((locality) => <option key={locality.id} value={locality.id}>{locality.name}</option>)}
        </select>
      </div>
      <button className="near-me" onClick={nearMe}><LocateFixed size={17} /> Near me</button>
      <label className="radius-select">Within
        <select value={filters.radiusKm} onChange={(event) => setFilters({ ...filters, radiusKm: Number(event.target.value) })}>
          {[3, 5, 10, 25].map((radius) => <option key={radius} value={radius}>{radius} km</option>)}
        </select>
      </label>
      {message && <span className="location-message" role="status">{message}</span>}
    </div>
  );
}
