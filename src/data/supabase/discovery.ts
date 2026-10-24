import type { EventFilters, KnotEvent, Locality } from '../../domain/types';
import { cloudError, getSupabase } from './client';
import { cloudRowToEvent, type CloudEventRow } from './mappers';

export type DiscoveryCursor = Record<string, unknown>;
type Row = Record<string, unknown>;

const object = (value: unknown): Row => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Row : {};
const number = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const nullableNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const INDIA_OFFSET = '+05:30';

function indiaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function shiftDateKey(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function indiaInstant(dateKey: string, time = '00:00:00.000') {
  return new Date(`${dateKey}T${time}${INDIA_OFFSET}`).toISOString();
}

/** India launch time windows are calculated once and sent as absolute instants. */
export function discoveryTimeWindow(filters: EventFilters, now = new Date()) {
  const today = indiaDateKey(now);
  if (filters.time === 'custom') {
    return {
      from: filters.customFrom ? indiaInstant(filters.customFrom) : undefined,
      to: filters.customTo ? indiaInstant(filters.customTo, '23:59:59.999') : undefined,
    };
  }
  if (filters.time === 'any') return {};
  if (filters.time === 'today') return { from: indiaInstant(today), to: indiaInstant(today, '23:59:59.999') };
  if (filters.time === 'tonight') return { from: indiaInstant(today, '17:00:00.000'), to: indiaInstant(today, '23:59:59.999') };
  if (filters.time === 'tomorrow') {
    const tomorrow = shiftDateKey(today, 1);
    return { from: indiaInstant(tomorrow), to: indiaInstant(tomorrow, '23:59:59.999') };
  }
  if (filters.time === 'next7') return { from: indiaInstant(today), to: indiaInstant(shiftDateKey(today, 7), '23:59:59.999') };
  const day = new Date(`${today}T12:00:00Z`).getUTCDay();
  const saturday = shiftDateKey(today, day === 0 ? 6 : day === 6 ? 0 : 6 - day);
  return { from: indiaInstant(saturday), to: indiaInstant(shiftDateKey(saturday, 1), '23:59:59.999') };
}

export function cloudDiscoveryFilterPayload(filters: EventFilters, origin: Locality | null, now = new Date()): Row {
  const window = discoveryTimeWindow(filters, now);
  return {
    query: filters.query.trim(),
    eventType: filters.eventType,
    mode: filters.mode,
    price: filters.price ?? 'all',
    source: filters.source ?? '',
    team: filters.team ?? 'all',
    interest: filters.interest,
    skill: filters.skill,
    ageRule: filters.ageRule,
    ageBand: filters.ageBand ?? '',
    onlyJoinable: filters.onlyJoinable,
    sort: filters.sort,
    ...window,
    ...(origin ? { latitude: origin.latitude, longitude: origin.longitude, radiusKm: filters.radiusKm } : {}),
    ...(filters.maxTravelMinutes ? { maxTravelMinutes: filters.maxTravelMinutes } : {}),
  };
}

export interface CloudDiscoveryItem {
  event: KnotEvent;
  distanceKm: number | null;
  relevance: number;
  fitScore: number;
}

export interface CloudDiscoveryPage {
  items: CloudDiscoveryItem[];
  events: KnotEvent[];
  total: number;
  hasMore: boolean;
  nextCursor: DiscoveryCursor | null;
  pageSize: number;
}

export async function cloudSearchEvents(
  filters: EventFilters,
  origin: Locality | null,
  cursor: DiscoveryCursor | null = null,
  limit = 24,
  now = new Date(),
): Promise<CloudDiscoveryPage> {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const { data, error } = await getSupabase().rpc('knot_search_events', {
    p_filters: cloudDiscoveryFilterPayload(filters, origin, now),
    p_cursor: cursor,
    p_limit: safeLimit,
  });
  if (error) throw cloudError(error);
  const body = object(data);
  const items = (Array.isArray(body.events) ? body.events : []).map((value) => {
    const item = object(value);
    return {
      event: cloudRowToEvent(object(item.event) as CloudEventRow),
      distanceKm: nullableNumber(item.distanceKm),
      relevance: number(item.relevance),
      fitScore: number(item.fitScore),
    };
  });
  return {
    items,
    events: items.map((item) => item.event),
    total: Math.max(0, number(body.total)),
    hasMore: body.hasMore === true,
    nextCursor: body.nextCursor && typeof body.nextCursor === 'object' && !Array.isArray(body.nextCursor) ? body.nextCursor as Row : null,
    pageSize: Math.max(1, Math.min(50, number(body.pageSize, safeLimit))),
  };
}

export interface CloudDiscoveryOverview {
  categories: Array<{ eventType: KnotEvent['eventType']; count: number }>;
  trending: Array<{
    eventId: string;
    slug: string;
    title: string;
    startAt: string;
    confirmedNative: number | null;
    saves: number | null;
    going: number | null;
    score: number;
  }>;
}

export async function cloudDiscoveryOverview(): Promise<CloudDiscoveryOverview> {
  const { data, error } = await getSupabase().rpc('knot_discovery_overview');
  if (error) throw cloudError(error);
  const body = object(data);
  const categories = (Array.isArray(body.categories) ? body.categories : []).map((value) => {
    const item = object(value);
    return { eventType: String(item.eventType) as KnotEvent['eventType'], count: number(item.count) };
  });
  const trending = (Array.isArray(body.trending) ? body.trending : []).map((value) => {
    const item = object(value);
    return {
      eventId: String(item.eventId ?? ''), slug: String(item.slug ?? ''), title: String(item.title ?? ''), startAt: String(item.startAt ?? ''),
      confirmedNative: nullableNumber(item.confirmedNative), saves: nullableNumber(item.saves), going: nullableNumber(item.going), score: number(item.score),
    };
  });
  return { categories, trending };
}
