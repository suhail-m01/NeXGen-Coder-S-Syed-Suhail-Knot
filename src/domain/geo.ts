import type { KnotEvent, Locality } from './types';
import { localities, localityById } from './localities';

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const lat1 = radians(aLat);
  const lat2 = radians(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function eventCoordinates(event: KnotEvent, locality: Locality | null): { latitude: number; longitude: number } | null {
  if (
    event.venue &&
    typeof event.venue.latitude === 'number' &&
    typeof event.venue.longitude === 'number' &&
    !Number.isNaN(event.venue.latitude) &&
    !Number.isNaN(event.venue.longitude)
  ) {
    return { latitude: event.venue.latitude, longitude: event.venue.longitude };
  }
  const loc = locality ?? localityById(event.venue?.localityId);
  if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    return { latitude: loc.latitude, longitude: loc.longitude };
  }
  if (event.venue?.city) {
    const cityNorm = event.venue.city.toLowerCase().trim();
    const cityMatch = localities.find(
      (l) => l.city.toLowerCase() === cityNorm || l.name.toLowerCase() === cityNorm
    );
    if (cityMatch && typeof cityMatch.latitude === 'number' && typeof cityMatch.longitude === 'number') {
      return { latitude: cityMatch.latitude, longitude: cityMatch.longitude };
    }
  }
  return null;
}

export function distanceForEvent(event: KnotEvent, origin: Locality | null, eventLocality: Locality | null) {
  if (!origin || event.mode === 'online') return null;
  if (!event.venue || event.venue.locationPrecision === 'none') return null;
  const coordinates = eventCoordinates(event, eventLocality);
  if (!coordinates) return null;
  return haversineKm(origin.latitude, origin.longitude, coordinates.latitude, coordinates.longitude);
}

export function distanceBand(distanceKm: number | null) {
  if (distanceKm === null) return null;
  if (distanceKm < 3) return 'very close';
  if (distanceKm < 8) return 'nearby';
  if (distanceKm <= 15) return 'across town';
  return 'far';
}
