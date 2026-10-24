import localityData from './localities.json';
import type { Locality } from './types';

const cityAnchor = (id: string, name: string, latitude: number, longitude: number): Locality => ({
  id, name, aliases: [], city: name, country: 'IN', latitude, longitude,
  geocode: {
    source: 'Knot curated approximate city-centre anchor; not a neighbourhood geocode',
    osmPlaceId: null, displayName: `${name}, India · approximate city centre`,
    resultType: 'city', boundingBox: [], geocodedAt: '2026-10-24T00:00:00.000Z',
  },
});

/** City-level discovery anchors deliberately do not invent neighbourhood precision. */
export const indiaCityAnchors: Locality[] = [
  cityAnchor('city-new-delhi', 'New Delhi', 28.6139, 77.2090),
  cityAnchor('city-mumbai', 'Mumbai', 19.0760, 72.8777),
  cityAnchor('city-hyderabad', 'Hyderabad', 17.3850, 78.4867),
  cityAnchor('city-chennai', 'Chennai', 13.0827, 80.2707),
  cityAnchor('city-pune', 'Pune', 18.5204, 73.8567),
  cityAnchor('city-kolkata', 'Kolkata', 22.5726, 88.3639),
  cityAnchor('city-ahmedabad', 'Ahmedabad', 23.0225, 72.5714),
  cityAnchor('city-jaipur', 'Jaipur', 26.9124, 75.7873),
  cityAnchor('city-kochi', 'Kochi', 9.9312, 76.2673),
  cityAnchor('city-indore', 'Indore', 22.7196, 75.8577),
  cityAnchor('city-coimbatore', 'Coimbatore', 11.0168, 76.9558),
  cityAnchor('city-lucknow', 'Lucknow', 26.8467, 80.9462),
  cityAnchor('city-chandigarh', 'Chandigarh', 30.7333, 76.7794),
];

export const localities = [...localityData as Locality[], ...indiaCityAnchors];

export const localityById = (id: string | null | undefined) =>
  localities.find((locality) => locality.id === id) ?? null;

export const DEFAULT_LOCALITY_ID = 'koramangala';

export const localityOptionLabel = (locality: Locality) => locality.geocode.resultType === 'city' ? `${locality.name} · approximate city centre` : `${locality.name}, ${locality.city}`;
