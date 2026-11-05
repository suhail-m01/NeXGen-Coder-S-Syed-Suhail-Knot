import { localities } from '../../domain/localities';
import { haversineKm } from '../../domain/geo';

export interface HackathonLocationOption { label: string; city: string; area: string; }

export function hackathonLocationOptions(facets: { city: string | null; area: string | null }[] = []): HackathonLocationOption[] {
  const options: HackathonLocationOption[] = [];
  const seen = new Set<string>();
  const add = (city: string, area = '') => {
    const label = area ? `${area}, ${city}` : city;
    const key = label.toLowerCase();
    if (!seen.has(key)) { seen.add(key); options.push({ label, city, area }); }
  };
  for (const locality of localities) add(locality.city, locality.geocode.resultType === 'city' ? '' : locality.name);
  for (const facet of facets) if (facet.city) add(facet.city, facet.area ?? '');
  return options.sort((a, b) => a.label.localeCompare(b.label)).slice(0, 200);
}

export function nearestHackathonCity(latitude: number, longitude: number): string | null {
  let nearest: { city: string; distance: number } | null = null;
  for (const locality of localities) {
    const distance = haversineKm(latitude, longitude, locality.latitude, locality.longitude);
    if (!nearest || distance < nearest.distance) nearest = { city: locality.city, distance };
  }
  return nearest && nearest.distance <= 150 ? nearest.city : null;
}

export function parseHackathonLocation(value: string, options: HackathonLocationOption[]): { city: string; area: string } {
  const normalized = value.trim().toLowerCase();
  const match = options.find((option) => option.label.toLowerCase() === normalized);
  if (match) return { city: match.city, area: match.area };
  return { city: value.trim(), area: '' };
}
