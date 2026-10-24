import type { EventFilters, GoingRecord, KnotEvent, Registration, SavedEvent } from './types';

export const DISCOVERY_PAGE_SIZE = 24;
export const PUBLIC_AGGREGATE_THRESHOLD = 5;

const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();

/** Bounded edit distance keeps local typo tolerance predictable on small catalogs. */
export function editDistanceWithin(left: string, right: string, maximum: number): boolean {
  if (Math.abs(left.length - right.length) > maximum) return false;
  if (left === right) return true;
  if (!left || !right) return false;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= right.length; j += 1) {
      const value = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      current[j] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > maximum) return false;
    previous = current;
  }
  return previous[right.length] <= maximum;
}

function tokenScore(query: string, candidate: string) {
  if (candidate === query) return 1;
  if (candidate.startsWith(query) || query.startsWith(candidate)) return 0.92;
  const allowed = query.length <= 3 ? 0 : query.length <= 7 ? 1 : 2;
  return allowed > 0 && editDistanceWithin(query, candidate, allowed) ? 0.78 : 0;
}

/**
 * Returns zero for no match and a deterministic positive relevance score otherwise.
 * Multi-word queries require every query token to match; exact phrases rank highest.
 */
export function eventSearchScore(event: KnotEvent, rawQuery: string): number {
  const phrase = normalize(rawQuery);
  if (!phrase) return 1;
  const haystack = normalize([
    event.title, event.summary, event.description, event.organizerName,
    event.eventType.replaceAll('_', ' '), ...event.interests, ...event.skills,
  ].join(' '));
  if (haystack.includes(phrase)) return phrase.includes(' ') ? 3 : 2;
  const candidates = haystack.split(' ').filter(Boolean);
  let score = 0;
  for (const queryToken of phrase.split(' ')) {
    let best = 0;
    for (const candidate of candidates) {
      if (Math.abs(candidate.length - queryToken.length) > 2 && !candidate.startsWith(queryToken)) continue;
      best = Math.max(best, tokenScore(queryToken, candidate));
      if (best === 1) break;
    }
    if (best === 0) return 0;
    score += best;
  }
  return score / phrase.split(' ').length;
}

export interface DiscoveryPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextPage: number | null;
}

export function paginateDiscovery<T>(items: T[], page = 1, pageSize = DISCOVERY_PAGE_SIZE): DiscoveryPage<T> {
  const safeSize = Math.max(1, Math.min(100, Math.floor(pageSize)));
  const safePage = Math.max(1, Math.floor(page));
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize), total: items.length, page: safePage, pageSize: safeSize,
    hasMore: start + safeSize < items.length, nextPage: start + safeSize < items.length ? safePage + 1 : null,
  };
}

export interface CategoryDiscoveryStat {
  eventType: KnotEvent['eventType'];
  count: number;
}

export interface TrendingDiscoveryItem {
  event: KnotEvent;
  confirmedNative: number | null;
  saves: number | null;
  going: number | null;
  score: number;
}

const suppressed = (count: number) => count >= PUBLIC_AGGREGATE_THRESHOLD ? count : null;

/** Only aggregate counts at or above the disclosure threshold are exposed. */
export function discoveryOverview(
  events: KnotEvent[], registrations: Registration[], saves: SavedEvent[], going: GoingRecord[], now = new Date(),
) {
  const eligible = events.filter((event) => ['published', 'changed', 'stale'].includes(event.status)
    && (event.visibility ?? 'public') === 'public' && new Date(event.endAt ?? event.startAt).getTime() >= now.getTime());
  const categoryMap = new Map<KnotEvent['eventType'], number>();
  for (const event of eligible) categoryMap.set(event.eventType, (categoryMap.get(event.eventType) ?? 0) + 1);
  const categories: CategoryDiscoveryStat[] = [...categoryMap.entries()]
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((left, right) => right.count - left.count || left.eventType.localeCompare(right.eventType));

  const trending: TrendingDiscoveryItem[] = eligible.filter((event) => !event.isSample).map((event) => {
    const confirmed = registrations.filter((item) => item.eventId === event.id && item.kind === 'native'
      && ['registered', 'approved', 'checked_in', 'attended'].includes(item.status)).length;
    const saveCount = saves.filter((item) => item.eventId === event.id).length;
    const goingCount = going.filter((item) => item.eventId === event.id).length;
    const disclosedConfirmed = suppressed(confirmed);
    const disclosedSaves = suppressed(saveCount);
    const disclosedGoing = suppressed(goingCount);
    // Small groups neither create a public trend nor leak a precise count.
    if (disclosedConfirmed === null && disclosedSaves === null && disclosedGoing === null) return null;
    return {
      event, confirmedNative: disclosedConfirmed, saves: disclosedSaves, going: disclosedGoing,
      score: confirmed * 4 + saveCount * 2 + goingCount,
    } satisfies TrendingDiscoveryItem;
  }).filter((item): item is TrendingDiscoveryItem => Boolean(item))
    .sort((left, right) => right.score - left.score || left.event.startAt.localeCompare(right.event.startAt));
  return { categories, trending };
}

export function queryRelevanceCompare(left: KnotEvent, right: KnotEvent, filters: EventFilters) {
  return eventSearchScore(right, filters.query) - eventSearchScore(left, filters.query);
}
