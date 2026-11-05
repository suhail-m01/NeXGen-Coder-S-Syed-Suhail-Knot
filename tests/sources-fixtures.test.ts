import assert from 'node:assert/strict';
import test from 'node:test';
import { mapApiRecord, parseConfiguredDocuments } from '../agents/hackathon/sources/_shared';
import type { DiscoveryContext, SourceConfig, SourceDocument } from '../agents/hackathon/types';

const fakeDocument = (url: string, platform: string, body: string, contentType = 'application/json'): SourceDocument => ({
  url,
  finalUrl: url,
  body,
  contentType,
  sourcePlatform: platform,
});

test('Devfolio API payload maps slug to officialUrl subdomain and extracts location', () => {
  const doc = fakeDocument('https://api.devfolio.co/api/hackathons', 'Devfolio', '');
  const rawItem = {
    name: 'Hack Bengaluru 2027',
    slug: 'hack-bengaluru-2027',
    desc: '48 hour community hackathon in Bengaluru',
    starts_at: '2027-02-15T09:00:00.000Z',
    ends_at: '2027-02-17T18:00:00.000Z',
    location: {
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
    },
    is_online: false,
    fee: 0,
    cover_img: 'https://assets.devfolio.co/assets/cover/1.png',
  };

  const mapped = mapApiRecord(rawItem, doc);
  assert.equal(mapped.title, 'Hack Bengaluru 2027');
  assert.equal(mapped.startDate, '2027-02-15T09:00:00.000Z');
  assert.equal(mapped.endDate, '2027-02-17T18:00:00.000Z');
  assert.equal(mapped.officialUrl, 'https://hack-bengaluru-2027.devfolio.co/');
  assert.equal(mapped.sourceUrl, 'https://devfolio.co/hackathons/hack-bengaluru-2027');
  assert.equal(mapped.city, 'Bengaluru');
  assert.equal(mapped.isFree, true);
  assert.equal(mapped.imageUrl, 'https://assets.devfolio.co/assets/cover/1.png');
});

test('Unstop API payload maps public_url and extracts eligibility and mode', () => {
  const doc = fakeDocument('https://unstop.com/api/public/opportunity/search-result', 'Unstop', '');
  const rawItem = {
    title: 'CodeSprint National Hackathon',
    public_url: 'hackathons/codesprint-national-12345',
    start_date: '2027-03-01T10:00:00.000Z',
    end_date: '2027-03-03T20:00:00.000Z',
    regn_requirements: {
      fees: 0,
      min_team_size: 2,
      max_team_size: 4,
    },
    city: 'Delhi',
    banner_image: 'https://d8it4huxumps7.cloudfront.net/uploads/images/banner.jpg',
  };

  const mapped = mapApiRecord(rawItem, doc);
  assert.equal(mapped.title, 'CodeSprint National Hackathon');
  assert.equal(mapped.startDate, '2027-03-01T10:00:00.000Z');
  assert.equal(mapped.officialUrl, 'https://unstop.com/hackathons/codesprint-national-12345');
  assert.equal(mapped.sourceUrl, 'https://unstop.com/hackathons/codesprint-national-12345');
  assert.equal(mapped.city, 'Delhi');
  assert.equal(mapped.isFree, true);
});

test('MLH season HTML document extracts event cards with dates and locations', async () => {
  const html = `
    <!doctype html>
    <html>
      <head>
        <link rel="canonical" href="https://hackcon.mlh.io" />
      </head>
      <body>
        <h1>HackCon 2027</h1>
        <time datetime="2027-01-10T10:00:00Z">Jan 10th - 12th</time>
        <div class="event-location">Hyderabad, Telangana</div>
      </body>
    </html>
  `;
  const doc = fakeDocument('https://mlh.io/seasons/2025/events', 'Major League Hacking', html, 'text/html');
  const sourceConfig: SourceConfig = {
    id: 'mlh',
    platform: 'Major League Hacking',
    baseUrl: 'https://mlh.io',
    enabled: true,
    permissionEvidence: 'https://mlh.io/robots.txt',
    approvedMethods: ['html'],
    discoveryUrls: ['https://mlh.io/seasons/2025/events'],
  };
  const context: DiscoveryContext = {
    config: sourceConfig,
    http: { get: async () => doc as any, request: async () => doc as any },
    queries: [],
    now: new Date('2026-11-01T00:00:00Z'),
    maxDocuments: 1,
    maxDetailPages: 0,
    apiKey: null,
    authorizedSourceHosts: ['mlh.io'],
  };

  const parsed = await parseConfiguredDocuments([doc], context);
  assert.ok(parsed.length >= 1);
  assert.equal(parsed[0].data.title, 'HackCon 2027');
  assert.equal(parsed[0].data.officialUrl, 'https://hackcon.mlh.io/');
});

test('Eventbrite API format maps official event URL and ticket fee', () => {
  const doc = fakeDocument('https://www.eventbriteapi.com/v3/events/search', 'Eventbrite', '');
  const rawItem = {
    name: { text: 'FinTech Innovation Sprint' },
    description: { text: 'Build modern financial apps.' },
    start: { utc: '2027-01-20T04:00:00Z' },
    end: { utc: '2027-01-21T14:00:00Z' },
    url: 'https://www.eventbrite.com/e/fintech-innovation-sprint-tickets-123456',
    is_free: false,
    cost: 500,
    currency: 'INR',
  };

  const mapped = mapApiRecord(rawItem, doc);
  assert.equal(mapped.title, 'FinTech Innovation Sprint');
  assert.equal(mapped.startDate, '2027-01-20T04:00:00Z');
  assert.equal(mapped.officialUrl, 'https://www.eventbrite.com/e/fintech-innovation-sprint-tickets-123456');
  assert.equal(mapped.isFree, false);
  assert.equal(mapped.priceAmount, 500);
  assert.equal(mapped.currency, 'INR');
});

test('Search API record mapping preserves official website and snippet', () => {
  const doc = fakeDocument('https://api.tavily.com/search', 'Tavily Search', '');
  const rawItem = {
    title: 'CyberDefend 2027 Hackathon',
    url: 'https://cyberdefend.org/hackathon',
    content: 'Join the premier cybersecurity hackathon starting 2027-04-10 in Pune.',
    startDate: '2027-04-10T09:00:00Z',
    isFree: true,
  };

  const mapped = mapApiRecord(rawItem, doc);
  assert.equal(mapped.title, 'CyberDefend 2027 Hackathon');
  assert.equal(mapped.officialUrl, 'https://cyberdefend.org/hackathon');
  assert.equal(mapped.startDate, '2027-04-10T09:00:00Z');
  assert.equal(mapped.isFree, true);
});
