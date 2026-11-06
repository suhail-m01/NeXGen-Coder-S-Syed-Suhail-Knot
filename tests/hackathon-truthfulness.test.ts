import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createHackathonsHandler,
  createInterestHandler,
  createHackathonsStatusHandler,
} from '../agents/hackathon/apiHandlers';
import { loadSourceConfig } from '../agents/hackathon/config';
import {
  CURATED_HACKATHON_SNAPSHOT_AT,
  filterLiveSeedHackathons,
  LIVE_VERIFIED_HACKATHONS,
} from '../src/features/hackathons/liveSeed';

function responseMock() {
  return {
    statusCode: 200,
    body: undefined as any,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; },
  };
}

const request = (query: Record<string, string> = {}, method = 'GET') => ({
  method,
  query,
  headers: { host: 'localhost:5174' },
});

test('curated fallback keeps fixed time and never claims URL verification', () => {
  const first = filterLiveSeedHackathons({});
  const second = filterLiveSeedHackathons({});
  assert.equal(first.meta.lastUpdated, CURATED_HACKATHON_SNAPSHOT_AT);
  assert.equal(second.meta.lastUpdated, CURATED_HACKATHON_SNAPSHOT_AT);
  assert.equal(first.meta.dataMode, 'curated_fallback');
  assert.ok(first.data.every((item) => item.lastCheckedAt === CURATED_HACKATHON_SNAPSHOT_AT));
  assert.ok(LIVE_VERIFIED_HACKATHONS.every((item) => item.officialUrlVerified === false));
});

test('curated fallback does not broaden city, area, or date filters', () => {
  assert.deepEqual(filterLiveSeedHackathons({ city: 'not-a-real-city' }).data, []);
  assert.deepEqual(filterLiveSeedHackathons({ area: 'not-a-real-area' }).data, []);
  assert.deepEqual(filterLiveSeedHackathons({ from: '2099-01-01' }).data, []);
});

test('list API returns 503 instead of silently substituting fallback data', async () => {
  const res = responseMock();
  const handler = createHackathonsHandler({ list: async () => { throw new Error('database unavailable'); } });
  await handler(request() as any, res as any);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /temporarily unavailable/i);
  assert.equal(res.body.data, undefined);
});

test('status API reports unavailable without a fake run or timestamp', async () => {
  const res = responseMock();
  const handler = createHackathonsStatusHandler({ getStatus: async () => { throw new Error('schema unavailable'); } });
  await handler(request() as any, res as any);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.lastRunAt, null);
  assert.equal(res.body.lastStatus, 'unavailable');
  assert.equal(res.body.totalUpcoming, 0);
});

test('interest API does not manufacture persistence for curated-only identifiers', async () => {
  const res = responseMock();
  const handler = createInterestHandler();
  await handler(request({ id: 'live-1' }, 'POST') as any, res as any);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.officialUrl, undefined);
  assert.notEqual(res.body.saved, true);
});

test('reviewed source records still require explicit runtime opt-in', () => {
  const withoutOptIn = loadSourceConfig({} as NodeJS.ProcessEnv);
  assert.ok(withoutOptIn.every((source) => source.enabled === false));
  const withOptIn = loadSourceConfig({ HACKATHON_ENABLED_SOURCES: 'devpost' } as NodeJS.ProcessEnv);
  assert.equal(withOptIn.find((source) => source.id === 'devpost')?.enabled, true);
  assert.deepEqual(withOptIn.filter((source) => source.enabled).map((source) => source.id), ['devpost']);
});
