import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

Object.assign(globalThis, { WebSocket });

if (process.env.KNOT_RUN_CLOUD_TESTS !== '1') throw new Error('Set KNOT_RUN_CLOUD_TESTS=1 for read-only remote discovery checks.');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
}));
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) throw new Error('Publishable Supabase configuration is required.');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let checks = 0;
const pass = (message: string) => { checks += 1; console.log(`✓ ${message}`); };

type Row = Record<string, unknown>;
const object = (value: unknown): Row => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Row : {};
async function search(filters: Row, cursor: Row | null = null, limit = 2) {
  const { data, error } = await client.rpc('knot_search_events', { p_filters: filters, p_cursor: cursor, p_limit: limit });
  if (error) throw error;
  return object(data);
}

const baseGeo = { latitude: 12.9352, longitude: 77.6245, radiusKm: 5 };
const cases: Array<{ sort: string; filters: Row }> = [
  { sort: 'soonest', filters: {} },
  { sort: 'newest', filters: {} },
  { sort: 'closing', filters: {} },
  { sort: 'nearest', filters: baseGeo },
  { sort: 'best_fit', filters: {} },
  { sort: 'relevance', filters: { query: 'desgin' } },
];

for (const testCase of cases) {
  const ids: string[] = [];
  let cursor: Row | null = null;
  let expectedTotal = -1;
  for (let page = 0; page < 12; page += 1) {
    const body = await search({ ...testCase.filters, sort: testCase.sort }, cursor, 2);
    const events = Array.isArray(body.events) ? body.events : [];
    if (expectedTotal < 0) expectedTotal = Number(body.total);
    assert.equal(Number(body.total), expectedTotal, `${testCase.sort}: total changed between cursors`);
    for (const value of events) ids.push(String(object(object(value).event).id));
    if (body.hasMore !== true) {
      assert.equal(events.length <= 2, true);
      break;
    }
    assert.ok(body.nextCursor && typeof body.nextCursor === 'object', `${testCase.sort}: hasMore requires a cursor`);
    cursor = object(body.nextCursor);
    assert.equal(events.length, 2, `${testCase.sort}: full page expected before next cursor`);
    if (page === 11) assert.fail(`${testCase.sort}: pagination did not terminate within bound`);
  }
  assert.equal(ids.length, expectedTotal, `${testCase.sort}: cursor pages omit rows`);
  assert.equal(new Set(ids).size, ids.length, `${testCase.sort}: cursor pages duplicate rows`);
  pass(`${testCase.sort} keyset pagination returns ${ids.length} unique rows without omissions`);
}

const typo = await search({ query: 'desgin', sort: 'relevance' }, null, 5);
const typoEvents = Array.isArray(typo.events) ? typo.events : [];
assert.match(String(object(object(typoEvents[0]).event).title), /Design Systems/);
assert.ok(Number(object(typoEvents[0]).relevance) > Number(object(typoEvents[1]).relevance));
pass('typo tolerance ranks the title match above secondary document matches');

const geo = await search({ ...baseGeo, sort: 'nearest' }, null, 10);
for (const value of Array.isArray(geo.events) ? geo.events : []) assert.ok(Number(object(value).distanceKm) <= 5);
assert.ok(Number(geo.total) > 0 && Number(geo.total) <= 6);
pass('geo search stays inside the requested radius and reports finite distances');

const { data: overviewData, error: overviewError } = await client.rpc('knot_discovery_overview');
if (overviewError) throw overviewError;
const overview = object(overviewData);
const categories = Array.isArray(overview.categories) ? overview.categories.map(object) : [];
assert.equal(categories.reduce((sum, item) => sum + Number(item.count), 0), 6);
for (const value of Array.isArray(overview.trending) ? overview.trending.map(object) : []) {
  for (const key of ['confirmedNative', 'saves', 'going']) assert.ok(value[key] === null || Number(value[key]) >= 5, `${key} leaked a small group`);
}
pass('catalog-wide category totals and aggregate suppression match the aligned sample truth');

const travel = await client.rpc('knot_search_events', { p_filters: { maxTravelMinutes: 60 }, p_cursor: null, p_limit: 2 });
assert.match(travel.error?.message ?? '', /TRAVEL_TIME_REQUIRES_ROUTING/);
const onlineTravel = await search({ mode: 'online', maxTravelMinutes: 60 }, null, 2);
assert.equal(Number(onlineTravel.total), 0);
const invalidLimit = await client.rpc('knot_search_events', { p_filters: {}, p_cursor: null, p_limit: 51 });
assert.match(invalidLimit.error?.message ?? '', /INVALID_PAGE_SIZE/);
pass('travel-time and page-size guards fail explicitly instead of changing meaning');

const privateSignals = await client.from('knot_interest_signals').select('*');
assert.equal(privateSignals.data?.length ?? 0, 0);
pass('anonymous role cannot read private behavioural signals');

console.log(`\n${checks} read-only remote discovery checks passed.`);
