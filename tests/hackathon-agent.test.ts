import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createHackathonsHandler, createAgentRunHandler, createInterestHandler, createMyInterestsHandler, createHackathonsStatusHandler } from '../agents/hackathon/apiHandlers';
import { buildHackathonWhere, parseHackathonListParams, type HackathonListResult } from '../agents/hackathon/apiQuery';
import type { ApiRequest, ApiResponse } from '../agents/hackathon/apiTypes';
import { loadAgentConfig } from '../agents/hackathon/config';
import { dedupeHackathons, makeDedupeKey } from '../agents/hackathon/dedupe';
import { detectPrice, extractDocument } from '../agents/hackathon/extract';
import { createHttpClient } from '../agents/hackathon/httpClient';
import { canonicalCity, normalizeDate, normalizeHackathon } from '../agents/hackathon/normalize';
import { runHackathonAgent } from '../agents/hackathon/run';
import { emptyRawHackathon, rawHackathonSchema } from '../agents/hackathon/schemas';
import { DEFAULT_SOURCES } from '../agents/hackathon/sources/defaults';
import { discoverConfigured, parseConfiguredDocuments } from '../agents/hackathon/sources/_shared';
import { hasMeaningfulChange } from '../agents/hackathon/store';
import type { AgentConfig, AgentRunResult, HttpClient, HttpResponse, NormalizedHackathon, SourceDocument } from '../agents/hackathon/types';
import { isAggregatorUrl, stripTrackingUrl, verifyOfficialUrl } from '../agents/hackathon/verify';

const response = (url: string, body: string, contentType = 'text/html', status = 200): HttpResponse => ({
  status, url, finalUrl: url, body, contentType, headers: new Headers(), fromCache: false,
});

const fakeHttp = (handler: (url: string) => HttpResponse | Promise<HttpResponse>): HttpClient => ({
  get: async (url) => handler(url),
  request: async (url, options) => {
    if ((options?.method ?? 'GET') !== 'GET') throw new Error('Unexpected non-GET request');
    return handler(url);
  },
});

const agentConfig = (): AgentConfig => ({
  publicUrl: 'https://knot.example', userAgent: 'KnotBot/1.0', requestTimeoutMs: 1000, retries: 0, domainDelayMs: 0,
  sources: [], caps: { maxSources: 2, maxQueries: 4, maxDocumentsPerSource: 4, maxDetailPagesPerSource: 0, maxItemsPerRun: 20, maxResponseBytes: 1_000_000, concurrency: 1 },
  searchProvider: null, searchApiKey: null, anthropicApiKey: null, anthropicModel: 'test', enableLlmFallback: false,
});

const normalized = (patch: Partial<NormalizedHackathon> = {}): NormalizedHackathon => ({
  dedupeKey: makeDedupeKey('AI Hackathon', '2026-12-01T04:30:00.000Z', 'Bengaluru'), title: 'AI Hackathon',
  description: null, organizer: null, mode: 'offline', city: 'Bengaluru', area: null, state: null, country: null,
  venue: null, latitude: 12.9352, longitude: 77.6245, locationPrecision: 'city',
  startDate: '2026-12-01T04:30:00.000Z', endDate: null, registrationDeadline: null, timezone: 'Asia/Kolkata',
  startTimeKnown: true, endTimeKnown: false, isFree: null, priceAmount: null, currency: null, prizePool: null,
  tags: [], eligibility: null, teamSize: null, imageUrl: null, officialUrl: 'https://organizer.example/event',
  officialUrlVerified: true, sourceUrl: 'https://devpost.com/event', sourcePlatform: 'Devpost',
  sources: [{ platform: 'Devpost', url: 'https://devpost.com/event', firstSeenAt: '2026-11-01T00:00:00.000Z', lastCheckedAt: '2026-11-01T00:00:00.000Z', extractionMethod: 'json-ld' }],
  extractionMethod: 'json-ld', status: 'upcoming', ...patch,
});

test('price detection requires explicit evidence and preserves unknown or conflicting values', () => {
  assert.deepEqual(detectPrice({ text: 'Registration is free for everyone.' }), { isFree: true, priceAmount: null, currency: null });
  assert.deepEqual(detectPrice({ text: 'The fee is ₹1,500.' }), { isFree: false, priceAmount: 1500, currency: 'INR' });
  assert.deepEqual(detectPrice({ text: 'Join us for a great event.' }), { isFree: null, priceAmount: null, currency: null });
  assert.equal(detectPrice({ isFree: true, priceAmount: 500 }).isFree, null);
  assert.equal(detectPrice({ text: 'Free for members only; tickets are ₹500.' }).isFree, false);
});

test('date normalization keeps offsets, source timezone and day-only precision', () => {
  assert.equal(normalizeDate('2026-12-01T10:00:00+05:30', null)?.iso, '2026-12-01T04:30:00.000Z');
  assert.equal(normalizeDate('2026-12-01T10:00:00', 'Asia/Kolkata')?.iso, '2026-12-01T04:30:00.000Z');
  assert.equal(normalizeDate('2026-12-01', 'Asia/Kolkata')?.timeKnown, false);
  assert.equal(normalizeDate('2026-12-01T10:00:00', null), null);
  assert.equal(normalizeDate('not-a-date', 'Asia/Kolkata'), null);
});

test('city and location normalization are canonical and explicitly approximate', () => {
  assert.equal(canonicalCity('Bangalore'), 'Bengaluru');
  const raw = { ...emptyRawHackathon('https://devpost.com/ai', 'Devpost'), title: 'Bengaluru AI Hackathon', city: 'Bangalore', country: 'India', startDate: '2026-12-01T10:00:00', mode: 'offline' as const };
  const result = normalizeHackathon(raw, { now: new Date('2026-11-01T00:00:00Z'), extractionMethod: 'json-ld' });
  assert.equal(result.city, 'Bengaluru');
  assert.equal(result.locationPrecision, 'city');
  assert.equal(result.startDate, '2026-12-01T04:30:00.000Z');
  assert.equal(result.isFree, null);
  assert.equal(result.priceAmount, null);
});

test('dedupe merges exact and fuzzy records while retaining provenance', () => {
  const first = normalized();
  const second = normalized({
    title: 'AI Hackathon 2026', dedupeKey: 'different-key', description: 'Source-supported description',
    sourcePlatform: 'Devfolio', sourceUrl: 'https://devfolio.co/ai', officialUrlVerified: false,
    sources: [{ platform: 'Devfolio', url: 'https://devfolio.co/ai', firstSeenAt: '2026-11-02T00:00:00.000Z', lastCheckedAt: '2026-11-02T00:00:00.000Z', extractionMethod: 'api' }], extractionMethod: 'api',
  });
  const result = dedupeHackathons([first, second]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.sources.length, 2);
  assert.equal(result[0]?.description, 'Source-supported description');
  assert.equal(result[0]?.officialUrlVerified, true);
  assert.equal(dedupeHackathons([first, normalized({ title: 'Different Robotics Challenge', dedupeKey: 'robotics' })]).length, 2);
});

test('URL cleanup and verification distinguish organizer domains from aggregators and dead links', async () => {
  assert.equal(stripTrackingUrl('https://example.com/event?utm_source=x&id=4#details'), 'https://example.com/event?id=4');
  assert.equal(isAggregatorUrl('https://devpost.com/event'), true);
  const http = fakeHttp((url) => {
    if (url.includes('dead')) return response(url, 'gone', 'text/html', 404);
    if (url.includes('spam')) return response(url, 'This domain is for sale. Casino betting.');
    return response(url, '<html>Official event</html>');
  });
  assert.deepEqual(await verifyOfficialUrl('https://organizer.example/event?utm_medium=social', http), { officialUrl: 'https://organizer.example/event', officialUrlVerified: true });
  assert.deepEqual(await verifyOfficialUrl('https://devpost.com/event', http), { officialUrl: 'https://devpost.com/event', officialUrlVerified: false });
  assert.equal(await verifyOfficialUrl('https://dead.example/event', http), null);
  assert.equal(await verifyOfficialUrl('https://spam.example/event', http), null);
});

test('JSON-LD is preferred and unknown values are not inferred', () => {
  const document: SourceDocument = {
    url: 'https://devpost.com/event', finalUrl: 'https://devpost.com/event', sourcePlatform: 'Devpost', contentType: 'text/html',
    body: `<html><head><meta property="og:title" content="Wrong fallback"><script type="application/ld+json">${JSON.stringify({ '@type': 'Event', name: 'Structured AI Hackathon', startDate: '2026-12-01T10:00:00+05:30', eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode', location: { '@type': 'VirtualLocation', url: 'https://organizer.example/live' }, organizer: { name: 'AI Collective' }, offers: { price: 0, priceCurrency: 'INR', url: 'https://organizer.example/register' } })}</script></head><body><h1>CSS fallback</h1></body></html>`,
  };
  const result = extractDocument(document);
  assert.equal(result.method, 'json-ld');
  assert.equal(result.data.title, 'Structured AI Hackathon');
  assert.equal(result.data.mode, 'online');
  assert.equal(result.data.isFree, true);
  assert.equal(result.data.city, null);
  assert.equal(result.data.eligibility, null);
});

test('strict extraction schema rejects unsupported fields and invalid modes', () => {
  const raw = emptyRawHackathon('https://example.com/event', 'Example');
  assert.throws(() => rawHackathonSchema.parse({ ...raw, invented: true }));
  assert.throws(() => rawHackathonSchema.parse({ ...raw, mode: 'sometimes-online' }));
});

test('robots.txt disallows protected paths, permits public paths and caches responses', async (t) => {
  let robotsHits = 0;
  let publicHits = 0;
  let privateHits = 0;
  const server = createServer((request, reply) => {
    if (request.url === '/robots.txt') { robotsHits += 1; reply.end('User-agent: *\nDisallow: /private'); return; }
    if (request.url === '/private') { privateHits += 1; reply.end('private'); return; }
    if (request.url === '/public') { publicHits += 1; reply.writeHead(200, { 'content-type': 'text/html' }); reply.end('<h1>Public</h1>'); return; }
    reply.writeHead(404); reply.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;
  const http = createHttpClient(agentConfig());
  await assert.rejects(http.get(`${origin}/private`, { allowPrivateHosts: true }), /Robots.txt disallows/);
  const first = await http.get(`${origin}/public`, { allowPrivateHosts: true });
  const second = await http.get(`${origin}/public`, { allowPrivateHosts: true });
  assert.equal(first.status, 200);
  assert.equal(second.fromCache, true);
  assert.equal(privateHits, 0);
  assert.equal(publicHits, 1);
  assert.equal(robotsHits, 1);
  await assert.rejects(http.get(`${origin}/public`), /HTTPS is required|Private/);
});

test('one failing source does not stop a run and the run is recorded', async () => {
  const config = agentConfig();
  const devpost = DEFAULT_SOURCES.find((source) => source.id === 'devpost')!;
  const mlh = DEFAULT_SOURCES.find((source) => source.id === 'mlh')!;
  config.sources = [
    { ...devpost, enabled: true, permissionEvidence: 'https://permission.example/devpost', approvedMethods: ['api'], discoveryUrls: ['https://devpost.com/api/events'] },
    { ...mlh, enabled: true, permissionEvidence: 'https://permission.example/mlh', approvedMethods: ['api'], discoveryUrls: ['https://mlh.io/api/events'] },
  ];
  const http = fakeHttp((url) => {
    if (url.includes('mlh.io')) throw new Error('MLH unavailable');
    if (url.includes('api/events')) return response(url, JSON.stringify([{ title: 'Run Isolation Hackathon', startDate: '2026-12-01T10:00:00+05:30', city: 'Bengaluru', url: 'https://organizer.example/run' }]), 'application/json');
    return response(url, '<html>Official</html>');
  });
  let finished: AgentRunResult | null = null;
  const result = await runHackathonAgent({
    config, http, now: new Date('2026-11-01T00:00:00Z'),
    store: {
      createRun: async () => 'run-test', consumeCities: async () => [],
      save: async (items) => ({ saved: items.length, items, errors: [] }),
      finishRun: async (_id, value) => { finished = value; },
    },
  });
  assert.equal(result.status, 'completed_with_errors');
  assert.equal(result.itemsSaved, 1);
  assert.equal(result.sources.find((source) => source.source === 'devpost')?.parsed, 1);
  assert.match(result.sources.find((source) => source.source === 'mlh')?.error ?? '', /MLH unavailable/);
  assert.equal((finished as AgentRunResult | null)?.runId, 'run-test');
});

test('API filter parsing and SQL clauses preserve free/paid/unknown semantics', () => {
  const params = parseHackathonListParams({ city: 'Bengaluru', mode: 'offline', price: 'free', from: '2026-12-01', to: '2026-12-31', q: 'AI', page: '2', limit: '12', sort: 'relevance' });
  const where = buildHackathonWhere(params);
  assert.match(where.sql, /lower\(city\) = lower\(\$\d+\)/);
  assert.match(where.sql, /is_free = \$\d+/);
  assert.equal(where.values.filter((value) => value === true).length, 1);
  assert.equal(params.page, 2);
  assert.equal(parseHackathonListParams({ price: 'paid' }).price, 'paid');
  assert.throws(() => parseHackathonListParams({ limit: '49' }), /between 1 and 48/);
  assert.throws(() => parseHackathonListParams({ mode: 'sometimes' }), /Invalid mode/);
  assert.throws(() => parseHackathonListParams({ from: '2026-12-02', to: '2026-12-01' }), /must not be after/);
  assert.throws(() => parseHackathonListParams({ from: '2026-02-31' }), /valid calendar date|ISO date/);
});

function mockResponse(): ApiResponse & { statusCode: number; body: unknown; headers: Record<string, string | number> } {
  const result = {
    statusCode: 200, body: null as unknown, headers: {} as Record<string, string | number>,
    status(code: number) { result.statusCode = code; return result; },
    json(body: unknown) { result.body = body; return result; },
    setHeader(name: string, value: string | number) { result.headers[name] = value; return result; },
    end(body?: string) { result.body = body; return result; },
  };
  return result;
}

const listResult: HackathonListResult = {
  data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0, lastUpdated: null }, facets: { locations: [] },
};

test('GET handler applies filters, caching and queues an explicitly searched empty city', async () => {
  let queued: string | null = null;
  const handler = createHackathonsHandler({ list: async () => listResult, queueCity: async (city) => { queued = city; } });
  const request: ApiRequest = { method: 'GET', query: { city: 'Mysuru' }, headers: { 'x-forwarded-for': '203.0.113.10' } };
  const res = mockResponse();
  await handler(request, res);
  assert.equal(res.statusCode, 200);
  assert.equal(queued, 'Mysuru');
  assert.match(String(res.headers['Cache-Control']), /s-maxage=300/);
});

test('anonymous interest records the click and returns only the server-selected official URL', async () => {
  let recordedUser: string | null | undefined;
  const handler = createInterestHandler({
    userId: async () => null,
    record: async (_id, userId) => {
      recordedUser = userId;
      return { interestId: 'interest-1', officialUrl: 'https://organizer.example/official', officialUrlVerified: true, saved: false };
    },
  });
  const request: ApiRequest = {
    method: 'POST', query: { id: '2bc5c4f5-114d-4f85-a1b5-c43150b9d02f' }, headers: { 'x-forwarded-for': '203.0.113.11' },
    body: { context: 'web', officialUrl: 'https://attacker.example' } as unknown as { context: string },
  };
  const res = mockResponse();
  await handler(request, res);
  assert.equal(res.statusCode, 400, 'unexpected fields are rejected');
  request.body = { context: 'web' };
  await handler(request, res);
  assert.equal(res.statusCode, 200);
  assert.equal(recordedUser, null);
  assert.equal((res.body as { officialUrl: string }).officialUrl, 'https://organizer.example/official');
});

test('manual runner requires the configured secret', async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-secret-with-at-least-16-characters';
  try {
    const runResult: AgentRunResult = { runId: 'run-1', status: 'completed', itemsFound: 0, itemsSaved: 0, sources: [], errors: [], startedAt: '2026-11-01T00:00:00Z', finishedAt: '2026-11-01T00:00:01Z' };
    const handler = createAgentRunHandler({ run: async () => runResult });
    const unauthorized = mockResponse();
    await handler({ method: 'POST', query: {}, headers: {} }, unauthorized);
    assert.equal(unauthorized.statusCode, 401);
    const authorized = mockResponse();
    await handler({ method: 'POST', query: {}, headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }, authorized);
    assert.equal(authorized.statusCode, 200);
    assert.equal((authorized.body as AgentRunResult).runId, 'run-1');
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test('source configuration remains disabled until explicit permission evidence exists', () => {
  const config = loadAgentConfig({ HACKATHON_ENABLED_SOURCES: 'devpost' });
  const devpost = config.sources.find((source) => source.id === 'devpost');
  assert.equal(devpost?.enabled, true);
  assert.equal(devpost?.permissionEvidence, null);
});

test('API pagination follows authorized next links within the document cap', async () => {
  const requested: string[] = [];
  const http = fakeHttp((url) => {
    requested.push(url);
    const page = new URL(url).searchParams.get('page') ?? '1';
    return response(url, JSON.stringify({ events: [{ title: `Paged Hackathon ${page}`, startDate: '2026-12-01T10:00:00+05:30', url: `https://organizer.example/${page}` }], next: page === '1' ? '/api/events?page=2' : null }), 'application/json');
  });
  const source = { ...DEFAULT_SOURCES.find((item) => item.id === 'devpost')!, baseUrl: 'https://source.example', discoveryUrls: ['https://source.example/api/events?page=1'], approvedMethods: ['api' as const] };
  const context = { config: source, http, queries: [], now: new Date('2026-11-01T00:00:00Z'), maxDocuments: 3, maxDetailPages: 0, apiKey: null, authorizedSourceHosts: ['source.example'] };
  const documents = await discoverConfigured(context);
  const parsed = await parseConfiguredDocuments(documents, context);
  assert.equal(documents.length, 2);
  assert.equal(parsed.length, 2);
  assert.deepEqual(requested, ['https://source.example/api/events?page=1', 'https://source.example/api/events?page=2']);
});

test('meaningful changes exclude a provenance-only recheck', () => {
  const previous = normalized();
  const checked = normalized({ sources: [...previous.sources, { platform: 'MLH', url: 'https://mlh.io/event', firstSeenAt: '2026-11-02T00:00:00Z', lastCheckedAt: '2026-11-02T00:00:00Z', extractionMethod: 'api' }] });
  assert.equal(hasMeaningfulChange(previous, checked), false);
  assert.equal(hasMeaningfulChange(previous, normalized({ title: 'Changed hackathon title' })), true);
});

test('My Interests requires an account and uses the authenticated user selected by the server', async () => {
  let selectedUser = '';
  const handler = createMyInterestsHandler({ userId: async (request) => request.headers.authorization === 'Bearer valid' ? 'user-1' : null, list: async (userId) => { selectedUser = userId; return []; } });
  const anonymous = mockResponse();
  await handler({ method: 'GET', query: {}, headers: { 'x-forwarded-for': '203.0.113.12' } }, anonymous);
  assert.equal(anonymous.statusCode, 401);
  const authenticated = mockResponse();
  await handler({ method: 'GET', query: {}, headers: { authorization: 'Bearer valid', 'x-forwarded-for': '203.0.113.13' } }, authenticated);
  assert.equal(authenticated.statusCode, 200);
  assert.equal(selectedUser, 'user-1');
  assert.equal(authenticated.headers['Cache-Control'], 'no-store');
});

test('sharding partitions sources and sourceIds filters to specified platforms', async () => {
  const config = agentConfig();
  config.caps.maxSources = 10;
  const devfolio = DEFAULT_SOURCES.find((s) => s.id === 'devfolio')!;
  const unstop = DEFAULT_SOURCES.find((s) => s.id === 'unstop')!;
  const mlh = DEFAULT_SOURCES.find((s) => s.id === 'mlh')!;
  config.sources = [
    { ...devfolio, enabled: true, permissionEvidence: 'https://devfolio.co/terms', approvedMethods: ['api'], discoveryUrls: [] },
    { ...unstop, enabled: true, permissionEvidence: 'https://unstop.com/terms-of-use', approvedMethods: ['api'], discoveryUrls: [] },
    { ...mlh, enabled: true, permissionEvidence: 'https://mlh.io/robots.txt', approvedMethods: ['html'], discoveryUrls: [] },
  ];

  const http = fakeHttp((url) => response(url, '[]', 'application/json'));
  const fakeStore = {
    createRun: async () => 'shard-run',
    consumeCities: async () => [],
    save: async () => ({ saved: 0, items: [], errors: [] }),
    finishRun: async () => {},
  };

  const shardResult = await runHackathonAgent({
    config,
    http,
    store: fakeStore,
    shard: { index: 0, total: 2 },
  });
  assert.equal(shardResult.status, 'completed');
  // First shard gets even indices (0 and 2: devfolio, mlh)
  assert.deepEqual(
    shardResult.sources.map((s) => s.source),
    ['devfolio', 'mlh']
  );

  const filteredResult = await runHackathonAgent({
    config,
    http,
    store: fakeStore,
    sourceIds: ['unstop'],
  });
  assert.equal(filteredResult.status, 'completed');
  assert.deepEqual(
    filteredResult.sources.map((s) => s.source),
    ['unstop']
  );
});

test('GET /api/hackathons/status returns lastRunAt, lastStatus, totalUpcoming, and perSource counts without secrets', async () => {
  const handler = createHackathonsStatusHandler({
    getStatus: async () => ({
      lastRunAt: '2026-11-05T12:00:00.000Z',
      lastStatus: 'completed',
      totalUpcoming: 24,
      perSource: { Devfolio: 20, Unstop: 4 },
    }),
  });

  const res = mockResponse();
  await handler({ method: 'GET', query: {}, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  const body = res.body as { lastRunAt: string; lastStatus: string; totalUpcoming: number; perSource: Record<string, number> };
  assert.equal(body.lastRunAt, '2026-11-05T12:00:00.000Z');
  assert.equal(body.lastStatus, 'completed');
  assert.equal(body.totalUpcoming, 24);
  assert.equal(body.perSource.Devfolio, 20);
  assert.equal(body.perSource.Unstop, 4);
});
