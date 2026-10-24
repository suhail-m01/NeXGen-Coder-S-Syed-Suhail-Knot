import type { KnotEvent, Locality } from './types';

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

export function eventCoordinates(event: KnotEvent, locality: Locality | null) {
  if (event.venue?.latitude !== null && event.venue?.longitude !== null && event.venue) {
    return { latitude: event.venue.latitude, longitude: event.venue.longitude };
  }
  if (locality && event.venue?.locationPrecision === 'locality') {
    return { latitude: locality.latitude, longitude: locality.longitude };
  }
  return null;
}

export function distanceForEvent(event: KnotEvent, origin: Locality | null, eventLocality: Locality | null) {
  if (!origin || event.mode === 'online') return null;
  if (!event.venue || ['city', 'none'].includes(event.venue.locationPrecision)) return null;
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
