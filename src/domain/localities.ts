import localityData from './localities.json';
import type { Locality } from './types';

export const localities = localityData as Locality[];

export const localityById = (id: string | null | undefined) =>
  localities.find((locality) => locality.id === id) ?? null;

export const DEFAULT_LOCALITY_ID = 'koramangala';
