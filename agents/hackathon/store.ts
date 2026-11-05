import type { JSONValue, Sql } from 'postgres';
import { getDatabase } from './db';
import { dedupeHackathons, isFuzzyDuplicate, mergeHackathons } from './dedupe';
import type { AgentRunResult, HackathonMode, HackathonStatus, NormalizedHackathon, SourceListing, SourceRunStat } from './types';

const iso = (value: unknown): string => value instanceof Date ? value.toISOString() : String(value);
const nullableIso = (value: unknown): string | null => value === null || value === undefined ? null : iso(value);
const nullableNumber = (value: unknown): number | null => value === null || value === undefined ? null : Number(value);
const nullableBoolean = (value: unknown): boolean | null => value === null || value === undefined ? null : Boolean(value);
const jsonValue = (value: unknown): JSONValue => JSON.parse(JSON.stringify(value)) as JSONValue;

function rowToHackathon(row: Record<string, unknown>): NormalizedHackathon {
  return {
    id: String(row.id), dedupeKey: String(row.dedupe_key), title: String(row.title),
    description: row.description === null ? null : String(row.description), organizer: row.organizer === null ? null : String(row.organizer),
    mode: String(row.mode) as HackathonMode, city: row.city === null ? null : String(row.city), area: row.area === null ? null : String(row.area),
    state: row.state === null ? null : String(row.state), country: row.country === null ? null : String(row.country),
    venue: row.venue === null ? null : String(row.venue), latitude: nullableNumber(row.latitude), longitude: nullableNumber(row.longitude),
    locationPrecision: String(row.location_precision) as NormalizedHackathon['locationPrecision'],
    startDate: iso(row.start_date), endDate: nullableIso(row.end_date), registrationDeadline: nullableIso(row.registration_deadline),
    timezone: row.timezone === null ? null : String(row.timezone), startTimeKnown: Boolean(row.start_time_known), endTimeKnown: Boolean(row.end_time_known),
    isFree: nullableBoolean(row.is_free), priceAmount: nullableNumber(row.price_amount), currency: row.currency === null ? null : String(row.currency),
    prizePool: row.prize_pool === null ? null : String(row.prize_pool), tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    eligibility: row.eligibility === null ? null : String(row.eligibility), teamSize: row.team_size === null ? null : String(row.team_size),
    imageUrl: row.image_url === null ? null : String(row.image_url), officialUrl: String(row.official_url), officialUrlVerified: Boolean(row.official_url_verified),
    sourceUrl: String(row.source_url), sourcePlatform: String(row.source_platform),
    sources: (Array.isArray(row.sources) ? row.sources : []) as SourceListing[], extractionMethod: String(row.extraction_method) as NormalizedHackathon['extractionMethod'],
    status: String(row.status) as HackathonStatus,
  };
}

function databaseValues(item: NormalizedHackathon, sql: Sql, now: string) {
  return {
    dedupe_key: item.dedupeKey, title: item.title, description: item.description, organizer: item.organizer,
    mode: item.mode, city: item.city, area: item.area, state: item.state, country: item.country, venue: item.venue,
    latitude: item.latitude, longitude: item.longitude, location_precision: item.locationPrecision,
    start_date: item.startDate, end_date: item.endDate, registration_deadline: item.registrationDeadline,
    timezone: item.timezone, start_time_known: item.startTimeKnown, end_time_known: item.endTimeKnown,
    is_free: item.isFree, price_amount: item.priceAmount, currency: item.currency, prize_pool: item.prizePool,
    tags: item.tags, eligibility: item.eligibility, team_size: item.teamSize, image_url: item.imageUrl,
    official_url: item.officialUrl, official_url_verified: item.officialUrlVerified,
    source_url: item.sourceUrl, source_platform: item.sourcePlatform, sources: sql.json(jsonValue(item.sources)),
    extraction_method: item.extractionMethod, status: item.status, last_checked_at: now,
    last_meaningful_change_at: now, updated_at: now,
  };
}

const MEANINGFUL_FIELDS = ['dedupeKey', 'title', 'description', 'organizer', 'mode', 'city', 'area', 'state', 'country', 'venue', 'latitude', 'longitude', 'locationPrecision', 'startDate', 'endDate', 'registrationDeadline', 'timezone', 'startTimeKnown', 'endTimeKnown', 'isFree', 'priceAmount', 'currency', 'prizePool', 'tags', 'eligibility', 'teamSize', 'imageUrl', 'officialUrl', 'officialUrlVerified', 'sourceUrl', 'sourcePlatform', 'extractionMethod', 'status'] as const;

export function hasMeaningfulChange(previous: NormalizedHackathon, next: NormalizedHackathon): boolean {
  return MEANINGFUL_FIELDS.some((field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field]));
}

export async function saveHackathons(input: NormalizedHackathon[]): Promise<{ saved: number; items: NormalizedHackathon[]; errors: string[] }> {
  if (!input.length) return { saved: 0, items: [], errors: [] };
  const sql = getDatabase();
  const items = dedupeHackathons(input);
  const timestamps = items.map((item) => new Date(item.startDate).getTime());
  const min = new Date(Math.min(...timestamps) - 86_400_000).toISOString();
  const max = new Date(Math.max(...timestamps) + 86_400_000).toISOString();
  const existingRows = await sql<Record<string, unknown>[]>`select * from public.hackathons where start_date between ${min} and ${max} order by updated_at desc limit 5000`;
  const existing = existingRows.map(rowToHackathon);
  const byKey = new Map(existing.map((item) => [item.dedupeKey, item]));
  const savedItems: NormalizedHackathon[] = [];
  const errors: string[] = [];
  let saved = 0;
  for (const candidate of items) {
    try {
      const exact = byKey.get(candidate.dedupeKey);
      const fuzzy = exact ?? existing.find((item) => isFuzzyDuplicate(item, candidate));
      const merged = fuzzy ? mergeHackathons(fuzzy, candidate) : candidate;
      const now = new Date().toISOString();
      const values = databaseValues(merged, sql, now);
      if (fuzzy && !hasMeaningfulChange(fuzzy, merged)) delete (values as { last_meaningful_change_at?: string | null }).last_meaningful_change_at;
      if (fuzzy?.id) {
        await sql`update public.hackathons set ${sql(values)} where id = ${fuzzy.id}`;
        merged.id = fuzzy.id;
      } else {
        const inserted = await sql<{ id: string }[]>`insert into public.hackathons ${sql(values)} returning id`;
        merged.id = inserted[0]?.id;
      }
      byKey.set(merged.dedupeKey, merged);
      if (!existing.some((item) => item.id === merged.id)) existing.push(merged);
      savedItems.push(merged);
      saved += 1;
    } catch (error) {
      errors.push(`${candidate.title}: ${error instanceof Error ? error.message : 'database upsert failed'}`);
    }
  }
  return { saved, items: savedItems, errors };
}

export async function createAgentRun(trigger: 'manual' | 'cron' | 'local', sources: string[]): Promise<string> {
  const sql = getDatabase();
  const rows = await sql<{ id: string }[]>`
    insert into public.agent_runs (kind, status, trigger_source, sources, started_at)
    values ('run', 'running', ${trigger}, ${sql.json(sources)}, now()) returning id`;
  if (!rows[0]) throw new Error('Could not create the agent run record.');
  return rows[0].id;
}

export async function refreshHackathonLifecycle(now: Date = new Date()): Promise<void> {
  try {
    const sql = getDatabase();
    const isoNow = now.toISOString();
    await sql`
      update public.hackathons
      set status = 'ended', updated_at = ${isoNow}
      where status <> 'ended' and coalesce(end_date, start_date) < ${isoNow}::timestamptz - interval '2 hours'
    `;
    await sql`
      update public.hackathons
      set status = 'ongoing', updated_at = ${isoNow}
      where status = 'upcoming' and start_date <= ${isoNow}::timestamptz and coalesce(end_date, start_date + interval '24 hours') >= ${isoNow}::timestamptz
    `;
  } catch {
    // Database lifecycle refresh is isolated if DB is not configured or offline.
  }
}

export async function finishAgentRun(runId: string, result: AgentRunResult): Promise<void> {
  const sql = getDatabase();
  await sql`
    update public.agent_runs set status = ${result.status}, items_found = ${result.itemsFound}, items_saved = ${result.itemsSaved},
      errors = ${sql.json(result.errors)}, stats = ${sql.json(jsonValue({ sources: result.sources }))}, finished_at = ${result.finishedAt}
    where id = ${runId} and kind = 'run'`;
  await refreshHackathonLifecycle();
}

export async function consumeRequestedCities(runId: string): Promise<string[]> {
  const sql = getDatabase();
  return sql.begin(async (transaction) => {
    const rows = await transaction<{ id: string; requested_city: string }[]>`
      select id, requested_city from public.agent_runs
      where kind = 'city_request' and status = 'queued'
      order by created_at for update skip locked limit 100`;
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    await transaction`update public.agent_runs set status = 'consumed', requested_by_run_id = ${runId}, finished_at = now() where id = any(${ids})`;
    return [...new Set(rows.map((row) => row.requested_city.trim()).filter(Boolean))];
  });
}

export async function queueRequestedCity(city: string): Promise<void> {
  const normalized = city.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (normalized.length < 2) return;
  const sql = getDatabase();
  await sql`
    insert into public.agent_runs (kind, status, trigger_source, requested_city)
    select 'city_request', 'queued', 'user_search', ${normalized}
    where not exists (
      select 1 from public.agent_runs where kind = 'city_request' and status = 'queued' and lower(requested_city) = lower(${normalized})
    )`;
}

export type { SourceRunStat };
