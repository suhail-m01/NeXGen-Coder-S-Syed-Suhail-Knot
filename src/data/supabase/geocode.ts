import type { GeocodedLocation } from '../../domain/types';
import { cloudError, getSupabase } from './client';

export type GeocodeCandidate = GeocodedLocation;

export interface GeocodeResult {
  candidate: GeocodeCandidate | null;
  attribution: string;
  note: string;
  cache: 'hit' | 'miss' | 'not_stored';
}

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const { data, error } = await getSupabase().functions.invoke('knot-geocode', { body: { query } });
  if (error) throw cloudError(error);
  const candidate = data?.candidate;
  if (candidate !== null && (!candidate || !Number.isFinite(candidate.latitude) || !Number.isFinite(candidate.longitude) || typeof candidate.displayName !== 'string')) {
    throw new Error('The geocoder returned an invalid candidate. Keep the locality-area marker and try again.');
  }
  return data as GeocodeResult;
}
