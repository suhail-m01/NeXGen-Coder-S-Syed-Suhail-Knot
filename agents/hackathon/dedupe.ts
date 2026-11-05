import { createHash } from 'node:crypto';
import type { NormalizedHackathon } from './types';

const normalizeTitle = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value: string): Set<string> => new Set(normalizeTitle(value).split(' ').filter((token) => token.length > 1 && !/^\d{4}$/.test(token) && !['the', 'and', 'for', 'with', 'hackathon', 'india'].includes(token)));

export function makeDedupeKey(title: string, startDate: string, city: string | null): string {
  return createHash('sha256').update(`${normalizeTitle(title)}|${startDate}|${(city ?? 'online').toLowerCase()}`).digest('hex');
}

function similarity(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return normalizeTitle(a) === normalizeTitle(b) ? 1 : 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / new Set([...left, ...right]).size;
}

export function isFuzzyDuplicate(a: NormalizedHackathon, b: NormalizedHackathon): boolean {
  if (a.dedupeKey === b.dedupeKey) return true;
  const samePlace = a.mode === 'online' && b.mode === 'online' || Boolean(a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase());
  if (!samePlace || Math.abs(new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) > 86_400_000) return false;
  return similarity(a.title, b.title) >= 0.72;
}

const QUALITY = { api: 5, 'json-ld': 4, opengraph: 3, css: 2, llm: 1 } as const;
const MERGE_FIELDS = [
  'description', 'organizer', 'mode', 'city', 'area', 'state', 'country', 'venue', 'latitude', 'longitude',
  'endDate', 'registrationDeadline', 'timezone', 'isFree', 'priceAmount', 'currency', 'prizePool', 'eligibility',
  'teamSize', 'imageUrl', 'locationPrecision', 'startTimeKnown', 'endTimeKnown',
] as const;

export function mergeHackathons(existing: NormalizedHackathon, incoming: NormalizedHackathon): NormalizedHackathon {
  const merged: NormalizedHackathon = { ...existing, sources: [...existing.sources], tags: [...existing.tags] };
  const existingQuality = QUALITY[existing.extractionMethod];
  const incomingQuality = QUALITY[incoming.extractionMethod];
  for (const field of MERGE_FIELDS) {
    const value = incoming[field];
    const current = merged[field];
    const present = value !== null && value !== undefined;
    const betterDescription = field !== 'description' || typeof value !== 'string' || typeof current !== 'string' || value.length > current.length;
    if (present && (current === null || current === undefined || incomingQuality > existingQuality || (incomingQuality === existingQuality && betterDescription))) {
      Object.assign(merged, { [field]: value });
    }
  }
  merged.tags = [...new Map([...existing.tags, ...incoming.tags].map((tag) => [tag.toLowerCase(), tag])).values()].slice(0, 30);
  const sourceMap = new Map([...existing.sources, ...incoming.sources].map((source) => [`${source.platform}|${source.url}`, source]));
  merged.sources = [...sourceMap.values()];
  merged.sourcePlatform = incomingQuality >= existingQuality ? incoming.sourcePlatform : existing.sourcePlatform;
  merged.sourceUrl = incomingQuality >= existingQuality ? incoming.sourceUrl : existing.sourceUrl;
  merged.extractionMethod = incomingQuality >= existingQuality ? incoming.extractionMethod : existing.extractionMethod;
  if (!existing.officialUrlVerified && incoming.officialUrlVerified) {
    merged.officialUrl = incoming.officialUrl;
    merged.officialUrlVerified = true;
  } else if (existing.officialUrlVerified === incoming.officialUrlVerified && incomingQuality > existingQuality) {
    merged.officialUrl = incoming.officialUrl;
  }
  merged.status = incoming.status;
  return merged;
}

export function dedupeHackathons(items: NormalizedHackathon[]): NormalizedHackathon[] {
  const merged: NormalizedHackathon[] = [];
  const byKey = new Map<string, number>();
  for (const item of items) {
    const exactIndex = byKey.get(item.dedupeKey);
    const fuzzyIndex = exactIndex ?? merged.findIndex((candidate) => isFuzzyDuplicate(candidate, item));
    if (fuzzyIndex >= 0 && merged[fuzzyIndex]) {
      const combined = mergeHackathons(merged[fuzzyIndex], item);
      merged[fuzzyIndex] = combined;
      byKey.set(combined.dedupeKey, fuzzyIndex);
      byKey.set(item.dedupeKey, fuzzyIndex);
    } else {
      byKey.set(item.dedupeKey, merged.length);
      merged.push(item);
    }
  }
  return merged;
}
