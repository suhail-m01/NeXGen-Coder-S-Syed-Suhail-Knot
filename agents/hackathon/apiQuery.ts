import { getDatabase } from './db';

export class InputError extends Error {}

export interface HackathonListParams {
  city: string | null;
  area: string | null;
  mode: 'online' | 'offline' | 'hybrid' | 'all';
  from: string | null;
  to: string | null;
  price: 'free' | 'paid' | 'all';
  q: string | null;
  sort: 'soonest' | 'relevance' | 'latest';
  page: number;
  limit: number;
}

type QueryValue = string | string[] | undefined;
type SqlValue = string | number | boolean | null;
const one = (value: QueryValue): string | undefined => Array.isArray(value) ? value[0] : value;
const text = (value: QueryValue, name: string, max: number): string | null => {
  const result = one(value)?.trim();
  if (!result) return null;
  if (result.length > max) throw new InputError(`${name} is too long.`);
  return result;
};
const integer = (value: QueryValue, name: string, fallback: number, max: number): number => {
  const raw = one(value);
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) throw new InputError(`${name} must be a positive integer.`);
  const parsed = Number(raw);
  if (parsed < 1 || parsed > max) throw new InputError(`${name} must be between 1 and ${max}.`);
  return parsed;
};

function dateValue(value: QueryValue, name: 'from' | 'to'): string | null {
  const raw = text(value, name, 40);
  if (!raw) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    const calendar = new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])));
    if (calendar.getUTCFullYear() !== Number(dateOnly[1]) || calendar.getUTCMonth() + 1 !== Number(dateOnly[2]) || calendar.getUTCDate() !== Number(dateOnly[3])) throw new InputError(`${name} must be a valid calendar date.`);
  }
  const normalized = dateOnly ? `${raw}T${name === 'from' ? '00:00:00.000' : '23:59:59.999'}Z` : raw;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) throw new InputError(`${name} must be an ISO date or datetime.`);
  return date.toISOString();
}

export function parseHackathonListParams(query: Record<string, QueryValue>): HackathonListParams {
  const mode = one(query.mode) ?? 'all';
  const price = one(query.price) ?? 'all';
  const sort = one(query.sort) ?? 'soonest';
  if (!['online', 'offline', 'hybrid', 'all'].includes(mode)) throw new InputError('Invalid mode.');
  if (!['free', 'paid', 'all'].includes(price)) throw new InputError('Invalid price.');
  if (!['soonest', 'relevance', 'latest'].includes(sort)) throw new InputError('Invalid sort.');
  const from = dateValue(query.from, 'from');
  const to = dateValue(query.to, 'to');
  if (from && to && from > to) throw new InputError('from must not be after to.');
  return {
    city: text(query.city, 'city', 120), area: text(query.area, 'area', 120),
    mode: mode as HackathonListParams['mode'], from, to, price: price as HackathonListParams['price'],
    q: text(query.q, 'q', 120), sort: sort as HackathonListParams['sort'],
    page: integer(query.page, 'page', 1, 1000), limit: integer(query.limit, 'limit', 12, 48),
  };
}

export function buildHackathonWhere(params: HackathonListParams): { sql: string; values: SqlValue[] } {
  const clauses = [`status <> 'ended'`, `coalesce(end_date, start_date) >= now()`];
  const values: SqlValue[] = [];
  const add = (clause: (index: number) => string, value: SqlValue) => {
    values.push(value);
    clauses.push(clause(values.length));
  };
  if (params.city) add((i) => `lower(city) = lower($${i})`, params.city);
  if (params.area) add((i) => `lower(area) = lower($${i})`, params.area);
  if (params.mode !== 'all') add((i) => `mode = $${i}`, params.mode);
  if (params.price !== 'all') add((i) => `is_free = $${i}`, params.price === 'free');
  if (params.from) add((i) => `coalesce(end_date, start_date) >= $${i}::timestamptz`, params.from);
  if (params.to) add((i) => `start_date <= $${i}::timestamptz`, params.to);
  if (params.q) add((i) => `to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(organizer,'') || ' ' || coalesce(array_to_string(tags,' '),'')) @@ websearch_to_tsquery('english', $${i})`, params.q);
  return { sql: clauses.join(' and '), values };
}

export interface HackathonDto {
  id: string;
  title: string;
  description: string | null;
  organizer: string | null;
  mode: 'online' | 'offline' | 'hybrid';
  city: string | null;
  area: string | null;
  state: string | null;
  country: string | null;
  venue: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: string;
  startDate: string;
  endDate: string | null;
  registrationDeadline: string | null;
  timezone: string | null;
  startTimeKnown: boolean;
  endTimeKnown: boolean;
  isFree: boolean | null;
  priceAmount: number | null;
  currency: string | null;
  prizePool: string | null;
  tags: string[];
  eligibility: string | null;
  teamSize: string | null;
  imageUrl: string | null;
  officialUrl: string;
  officialUrlVerified: boolean;
  sourceUrl: string;
  sourcePlatform: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  lastCheckedAt: string;
}

const iso = (value: unknown): string => value instanceof Date ? value.toISOString() : String(value);
const optionalIso = (value: unknown): string | null => value === null || value === undefined ? null : iso(value);
const optionalNumber = (value: unknown): number | null => value === null || value === undefined ? null : Number(value);

export function rowToHackathonDto(row: Record<string, unknown>): HackathonDto {
  return {
    id: String(row.id), title: String(row.title), description: row.description === null ? null : String(row.description),
    organizer: row.organizer === null ? null : String(row.organizer), mode: String(row.mode) as HackathonDto['mode'],
    city: row.city === null ? null : String(row.city), area: row.area === null ? null : String(row.area),
    state: row.state === null ? null : String(row.state), country: row.country === null ? null : String(row.country),
    venue: row.venue === null ? null : String(row.venue), latitude: optionalNumber(row.latitude), longitude: optionalNumber(row.longitude),
    locationPrecision: String(row.location_precision), startDate: iso(row.start_date), endDate: optionalIso(row.end_date),
    registrationDeadline: optionalIso(row.registration_deadline), timezone: row.timezone === null ? null : String(row.timezone),
    startTimeKnown: Boolean(row.start_time_known), endTimeKnown: Boolean(row.end_time_known),
    isFree: row.is_free === null || row.is_free === undefined ? null : Boolean(row.is_free), priceAmount: optionalNumber(row.price_amount),
    currency: row.currency === null ? null : String(row.currency), prizePool: row.prize_pool === null ? null : String(row.prize_pool),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [], eligibility: row.eligibility === null ? null : String(row.eligibility),
    teamSize: row.team_size === null ? null : String(row.team_size), imageUrl: row.image_url === null ? null : String(row.image_url),
    officialUrl: String(row.official_url), officialUrlVerified: Boolean(row.official_url_verified), sourceUrl: String(row.source_url),
    sourcePlatform: String(row.source_platform), status: String(row.status) as HackathonDto['status'], lastCheckedAt: iso(row.last_checked_at),
  };
}

const SELECT_FIELDS = `id,title,description,organizer,mode,city,area,state,country,venue,latitude,longitude,location_precision,start_date,end_date,registration_deadline,timezone,start_time_known,end_time_known,is_free,price_amount,currency,prize_pool,tags,eligibility,team_size,image_url,official_url,official_url_verified,source_url,source_platform,status,last_checked_at`;

export async function listHackathons(params: HackathonListParams) {
  const db = getDatabase();
  const where = buildHackathonWhere(params);
  // Relevance is parameterized separately below; user input is never interpolated into SQL.
  const values = [...where.values];
  let orderBy = 'start_date asc, id';
  if (params.sort === 'latest') orderBy = 'start_date desc, id';
  if (params.sort === 'relevance' && params.q) {
    values.push(params.q);
    orderBy = `ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(organizer,'')), websearch_to_tsquery('english', $${values.length})) desc, start_date asc, id`;
  }
  const limitIndex = values.length + 1;
  const offsetIndex = values.length + 2;
  values.push(params.limit, (params.page - 1) * params.limit);
  const [rows, counts, facets, freshness] = await Promise.all([
    db.unsafe<Record<string, unknown>[]>(`select ${SELECT_FIELDS} from public.hackathons where ${where.sql} order by ${orderBy} limit $${limitIndex} offset $${offsetIndex}`, values),
    db.unsafe<{ total: number }[]>(`select count(*)::int as total from public.hackathons where ${where.sql}`, where.values),
    db.unsafe<{ city: string | null; area: string | null }[]>(`select distinct city, area from public.hackathons where status <> 'ended' and (city is not null or area is not null) order by city, area limit 200`),
    db.unsafe<{ last_updated: Date | string | null }[]>(`select max(last_checked_at) as last_updated from public.hackathons`),
  ]);
  return {
    data: rows.map(rowToHackathonDto),
    meta: {
      page: params.page, limit: params.limit, total: counts[0]?.total ?? 0,
      totalPages: Math.ceil((counts[0]?.total ?? 0) / params.limit),
      lastUpdated: freshness[0]?.last_updated ? iso(freshness[0].last_updated) : null,
    },
    facets: {
      locations: facets.map((facet) => ({ city: facet.city, area: facet.area })),
    },
  };
}

export type HackathonListResult = Awaited<ReturnType<typeof listHackathons>>;
