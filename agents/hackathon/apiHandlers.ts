import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { InputError, listHackathons, parseHackathonListParams, rowToHackathonDto, type HackathonListResult } from './apiQuery';
import type { ApiRequest, ApiResponse } from './apiTypes';
import { getDatabase } from './db';
import { rateLimit } from './rateLimit';
import type { RunAgentOptions } from './run';
import { queueRequestedCity } from './store';
import type { AgentRunResult } from './types';

const header = (request: ApiRequest, name: string): string | undefined => {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};
const requestIp = (request: ApiRequest): string => header(request, 'x-forwarded-for')?.split(',')[0].trim() || request.socket?.remoteAddress || 'unknown';

function allowRate(request: ApiRequest, response: ApiResponse, scope: string, limit: number, windowMs: number): boolean {
  const result = rateLimit(requestIp(request), scope, limit, windowMs);
  if (result.allowed) return true;
  response.setHeader('Retry-After', result.retryAfter);
  response.status(429).json({ error: 'Too many requests. Please retry shortly.' });
  return false;
}

function sameOrigin(request: ApiRequest): boolean {
  const fetchSite = header(request, 'sec-fetch-site');
  if (fetchSite === 'cross-site') return false;
  const origin = header(request, 'origin');
  const host = header(request, 'host');
  if (!origin || !host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}

export function createHackathonsHandler(deps: {
  list?: (params: Parameters<typeof listHackathons>[0]) => Promise<HackathonListResult>;
  queueCity?: (city: string) => Promise<void>;
} = {}) {
  const list = deps.list ?? listHackathons;
  const queueCity = deps.queueCity ?? queueRequestedCity;
  return async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      response.status(405).json({ error: 'Method not allowed.' });
      return;
    }
    if (!allowRate(request, response, 'hackathons-read', 120, 60_000)) return;
    try {
      const params = parseHackathonListParams(request.query || {});
      const result = await list(params);
      if (params.city && result.meta.total === 0) await queueCity(params.city).catch(() => undefined);
      response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof InputError) {
        response.status(400).json({ error: error.message });
      } else {
        console.error('Hackathons read failed', error);
        response.status(503).json({ error: 'Hackathon discovery is temporarily unavailable. Curated fallback can be opened explicitly in the UI.' });
      }
    }
  };
}

export interface HackathonStatusResult {
  lastRunAt: string | null;
  lastStatus: string;
  totalUpcoming: number;
  perSource: Record<string, number>;
}

async function queryHackathonStatus(): Promise<HackathonStatusResult> {
  const sql = getDatabase();
  const runRows = await sql<{ finished_at: Date | null; started_at: Date; status: string }[]>`
    select started_at, finished_at, status from public.agent_runs
    where kind = 'run' order by created_at desc limit 1
  `;
  const countRows = await sql<{ count: number }[]>`
    select count(*)::int as count from public.hackathons where status in ('upcoming', 'ongoing')
  `;
  const sourceRows = await sql<{ source_platform: string; count: number }[]>`
    select source_platform, count(*)::int as count from public.hackathons
    where status in ('upcoming', 'ongoing') group by source_platform
  `;

  const lastRun = runRows[0];
  return {
    lastRunAt: lastRun?.finished_at?.toISOString() || lastRun?.started_at?.toISOString() || null,
    lastStatus: lastRun?.status || 'idle',
    totalUpcoming: countRows[0]?.count ?? 0,
    perSource: Object.fromEntries(sourceRows.map((row) => [row.source_platform, row.count])),
  };
}

export function createHackathonsStatusHandler(deps: { getStatus?: () => Promise<HackathonStatusResult> } = {}) {
  const getStatus = deps.getStatus ?? queryHackathonStatus;
  return async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      response.status(405).json({ error: 'Method not allowed.' });
      return;
    }
    if (!allowRate(request, response, 'hackathons-status-read', 60, 60_000)) return;
    try {
      const status = await getStatus();
      response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      response.status(200).json(status);
    } catch (error) {
      console.error('Hackathon status unavailable', error);
      response.status(503).json({
        lastRunAt: null,
        lastStatus: 'unavailable',
        totalUpcoming: 0,
        perSource: {},
      });
    }
  };
}

class InterestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function optionalUserId(request: ApiRequest): Promise<string | null> {
  const authorization = header(request, 'authorization');
  if (!authorization) return null;
  if (!authorization.startsWith('Bearer ')) throw new InterestError('Invalid authorization header.', 401);
  const token = authorization.slice(7).trim();
  if (!token) throw new InterestError('Invalid access token.', 401);
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new InterestError('Authenticated interest saving is not configured.', 503);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new InterestError('The sign-in session is invalid or expired.', 401);
  return data.user.id;
}

interface InterestResult {
  interestId: string;
  officialUrl: string;
  officialUrlVerified: boolean;
  saved: boolean;
}

async function recordInterest(id: string, userId: string | null, context: 'web' | 'home' | 'my_interests'): Promise<InterestResult> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid) {
    try {
      const db = getDatabase();
      const rows = await db<{ id: string; official_url: string; official_url_verified: boolean; status: string }[]>`
        select id, official_url, official_url_verified, status from public.hackathons where id = ${id} limit 1`;
      const hackathon = rows[0];
      if (hackathon) {
        if (hackathon.status === 'ended') throw new InterestError('This hackathon has ended.', 410);
        if (context === 'my_interests' && !userId) throw new InterestError('Sign in to save to My Interests.', 401);
        const inserted = userId
          ? await db<{ id: string }[]>`
            insert into public.hackathon_interests (hackathon_id, user_id, interest_context)
            values (${id}, ${userId}, ${context})
            on conflict (hackathon_id, user_id) where user_id is not null
            do update set clicked_at = now(), interest_context = excluded.interest_context
            returning id`
          : await db<{ id: string }[]>`
            insert into public.hackathon_interests (hackathon_id, user_id, interest_context)
            values (${id}, null, ${context}) returning id`;
        if (inserted[0]) {
          return { interestId: inserted[0].id, officialUrl: hackathon.official_url, officialUrlVerified: hackathon.official_url_verified, saved: Boolean(userId) };
        }
      }
    } catch (dbErr) {
      if (dbErr instanceof InterestError) throw dbErr;
      console.warn('Postgres hackathon interest recording unavailable:', dbErr);
      throw new InterestError('Interest recording is temporarily unavailable.', 503);
    }
  }

  // Curated records never claim server-side interest persistence.
  // The browser may still open the original official URL and save a local interest.
  throw new InterestError('Hackathon not found.', 404);
}

export function createInterestHandler(deps: {
  userId?: (request: ApiRequest) => Promise<string | null>;
  record?: (id: string, userId: string | null, context: 'web' | 'home' | 'my_interests') => Promise<InterestResult>;
} = {}) {
  const userId = deps.userId ?? optionalUserId;
  const record = deps.record ?? recordInterest;
  return async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      response.status(405).json({ error: 'Method not allowed.' });
      return;
    }
    if (!sameOrigin(request)) { response.status(403).json({ error: 'Cross-site interest submissions are not accepted.' }); return; }
    if (!allowRate(request, response, 'hackathons-interest', 20, 60_000)) return;
    try {
      const id = z.string().min(1).max(128).parse(Array.isArray(request.query.id) ? request.query.id[0] : request.query.id);
      const rawBody = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body ?? {};
      const body = z.object({ context: z.enum(['web', 'home', 'my_interests']).default('web') }).strict().parse(rawBody);
      const accountId = await userId(request);
      const result = await record(id, accountId, body.context);
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) response.status(400).json({ error: 'A valid hackathon id and interest context are required.' });
      else if (error instanceof SyntaxError) response.status(400).json({ error: 'Invalid JSON body.' });
      else if (error instanceof InterestError) response.status(error.status).json({ error: error.message });
      else {
        console.error('Hackathon interest failed', error);
        response.status(503).json({ error: 'Interest could not be recorded. Please retry.' });
      }
    }
  };
}

async function listSavedInterests(userId: string) {
  const db = getDatabase();
  const rows = await db<Record<string, unknown>[]>`
    select h.* from public.hackathon_interests i
    join public.hackathons h on h.id = i.hackathon_id
    where i.user_id = ${userId} and h.status <> 'ended'
    order by i.clicked_at desc limit 200`;
  return rows.map(rowToHackathonDto);
}

export function createMyInterestsHandler(deps: {
  userId?: (request: ApiRequest) => Promise<string | null>;
  list?: (userId: string) => Promise<unknown[]>;
} = {}) {
  const userId = deps.userId ?? optionalUserId;
  const list = deps.list ?? listSavedInterests;
  return async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      response.status(405).json({ error: 'Method not allowed.' });
      return;
    }
    if (!allowRate(request, response, 'hackathons-interests-read', 60, 60_000)) return;
    try {
      const accountId = await userId(request);
      if (!accountId) { response.status(401).json({ error: 'Sign in to view My Interests.' }); return; }
      const data = await list(accountId);
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json({ data });
    } catch (error) {
      if (error instanceof InterestError) response.status(error.status).json({ error: error.message });
      else {
        console.error('Hackathon interests read failed', error);
        response.status(503).json({ error: 'My Interests is temporarily unavailable.' });
      }
    }
  };
}

function secretMatches(provided: string | undefined, expected: string): boolean {
  if (!provided?.startsWith('Bearer ')) return false;
  const actual = Buffer.from(provided.slice(7));
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}

export function createAgentRunHandler(deps: { run?: (options: RunAgentOptions) => Promise<AgentRunResult> } = {}) {
  const run: (options: RunAgentOptions) => Promise<AgentRunResult> = deps.run ?? (async (options) => {
    const { runHackathonAgent } = await import('./run');
    return runHackathonAgent(options);
  });
  return async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
    if (!['GET', 'POST'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, POST');
      response.status(405).json({ error: 'Method not allowed.' });
      return;
    }
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 16) { response.status(503).json({ error: 'CRON_SECRET is not configured.' }); return; }
    if (!secretMatches(header(request, 'authorization'), secret)) { response.status(401).json({ error: 'Unauthorized.' }); return; }
    if (!sameOrigin(request)) { response.status(403).json({ error: 'Cross-site triggers are not accepted.' }); return; }
    const trigger = header(request, 'x-vercel-cron') ? 'cron' : 'manual';

    let shard: { index: number; total: number } | undefined;
    const shardParam = request.query.shard ? Number(Array.isArray(request.query.shard) ? request.query.shard[0] : request.query.shard) : undefined;
    const ofParam = request.query.of ? Number(Array.isArray(request.query.of) ? request.query.of[0] : request.query.of) : undefined;
    if (shardParam !== undefined && ofParam !== undefined && ofParam > 0) {
      shard = { index: Math.max(0, Math.min(shardParam, ofParam - 1)), total: ofParam };
    }
    const sourcesParam = request.query.sources ? (Array.isArray(request.query.sources) ? request.query.sources[0] : request.query.sources) : undefined;
    const sourceIds = sourcesParam ? sourcesParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : undefined;

    try {
      const result = await run({ trigger, shard, sourceIds });
      response.setHeader('Cache-Control', 'no-store');
      response.status(result.status === 'failed' ? 500 : 200).json(result);
    } catch (error) {
      console.error('Hackathon agent could not be started', error);
      response.status(500).json({ error: 'The Hackathon agent could not be started. Check server configuration and function logs.' });
    }
  };
}

export type { RunAgentOptions, AgentRunResult };
