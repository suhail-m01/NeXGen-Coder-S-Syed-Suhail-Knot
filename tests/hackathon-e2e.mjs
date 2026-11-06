import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';
await mkdir('artifacts/hackathons', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(15_000);
const page = await context.newPage();
const errors = [];
const requests = [];
const interestRequests = [];
let failList = true;
let listDelay = 450;
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
let checks = 0;
const check = (name, condition = true) => { assert.ok(condition, name); checks += 1; console.log(`✓ ${name}`); };
const fixtures = [
  {
    id: '2bc5c4f5-114d-4f85-a1b5-c43150b9d02f', title: 'Bengaluru AI Builders Hackathon', description: 'Build useful AI tools with a supportive community.', organizer: 'AI Collective', mode: 'offline', city: 'Bengaluru', area: 'Koramangala', state: 'Karnataka', country: 'India', venue: 'Community Innovation Hub', latitude: 12.9352, longitude: 77.6245, locationPrecision: 'city', startDate: '2027-01-16T04:30:00.000Z', endDate: '2027-01-17T12:30:00.000Z', registrationDeadline: '2027-01-10T18:29:59.000Z', timezone: 'Asia/Kolkata', startTimeKnown: true, endTimeKnown: true, isFree: null, priceAmount: null, currency: null, prizePool: null, tags: ['AI', 'Beginner friendly'], eligibility: null, teamSize: '2–4 people', imageUrl: null, officialUrl: 'https://organizer.example/ai', officialUrlVerified: true, sourceUrl: 'https://devpost.com/ai', sourcePlatform: 'Devpost', status: 'upcoming', lastCheckedAt: '2026-11-05T06:00:00.000Z',
  },
  {
    id: '3bc5c4f5-114d-4f85-a1b5-c43150b9d02f', title: 'Online Climate Hack', description: 'A remote sprint for practical climate prototypes.', organizer: 'Climate Hackers', mode: 'online', city: null, area: null, state: null, country: null, venue: null, latitude: null, longitude: null, locationPrecision: 'none', startDate: '2027-02-06T04:30:00.000Z', endDate: null, registrationDeadline: null, timezone: 'Asia/Kolkata', startTimeKnown: true, endTimeKnown: false, isFree: true, priceAmount: 0, currency: 'INR', prizePool: 'Source-reported prizes', tags: ['Climate'], eligibility: null, teamSize: null, imageUrl: null, officialUrl: 'https://organizer.example/climate', officialUrlVerified: false, sourceUrl: 'https://mlh.io/climate', sourcePlatform: 'MLH', status: 'upcoming', lastCheckedAt: '2026-11-05T06:00:00.000Z',
  },
];
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

await context.route('**/api/hackathons**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (/\/api\/hackathons\/[^/]+\/interest$/.test(url.pathname)) {
    const id = url.pathname.split('/')[3];
    const hackathon = fixtures.find((item) => item.id === id);
    interestRequests.push({ id, headers: request.headers(), body: request.postDataJSON() });
    await json(route, { interestId: `interest-${interestRequests.length}`, officialUrl: hackathon.officialUrl, officialUrlVerified: hackathon.officialUrlVerified, saved: false });
    return;
  }
  if (url.pathname === '/api/hackathons/interests') {
    await json(route, { data: [fixtures[0]] });
    return;
  }
  if (url.pathname !== '/api/hackathons') return route.continue();
  requests.push(Object.fromEntries(url.searchParams));
  if (listDelay) await new Promise((resolve) => setTimeout(resolve, listDelay));
  if (failList) { await json(route, { error: 'Mock feed unavailable.' }, 503); return; }
  const city = url.searchParams.get('city');
  const area = url.searchParams.get('area');
  const mode = url.searchParams.get('mode');
  const price = url.searchParams.get('price');
  const query = (url.searchParams.get('q') ?? '').toLowerCase();
  let data = fixtures.filter((item) => (!city || item.city?.toLowerCase() === city.toLowerCase()) && (!area || item.area?.toLowerCase() === area.toLowerCase()) && (!mode || mode === 'all' || item.mode === mode) && (!price || price === 'all' || price === 'free' && item.isFree === true || price === 'paid' && item.isFree === false) && (!query || `${item.title} ${item.description}`.toLowerCase().includes(query)));
  if (city === 'Mysuru') data = [];
  const pageNumber = Number(url.searchParams.get('page') ?? '1');
  const limit = Number(url.searchParams.get('limit') ?? '12');
  const total = data.length;
  data = data.slice((pageNumber - 1) * limit, pageNumber * limit);
  await json(route, { data, meta: { page: pageNumber, limit, total, totalPages: Math.ceil(total / limit), lastUpdated: '2026-11-05T06:00:00.000Z' }, facets: { locations: [{ city: 'Bengaluru', area: 'Koramangala' }, { city: null, area: null }] } });
});
await context.route('https://organizer.example/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Official hackathon</title><h1>Official hackathon site</h1>' }));

async function goto(path) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
}

async function closePopup(popup) {
  if (popup && !popup.isClosed()) await popup.close();
}

try {
  const navigation = page.goto(`${base}/hackathons`, { waitUntil: 'networkidle' });
  await page.locator('.hackathon-skeleton').first().waitFor();
  check('loading skeleton renders before results');
  await navigation;
  await page.getByRole('heading', { name: 'We couldn’t load hackathons' }).waitFor();
  check('API failure renders a useful error state', await page.getByText('Mock feed unavailable.').isVisible());
  failList = false;
  errors.length = 0; // The initial 503 is an intentional error-state fixture.
  listDelay = 0;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.locator('.hackathon-card').first().waitFor();
  check('retry works without changing filters', await page.locator('.hackathon-card').count() === 2);
  check('flagged desktop navigation is present', await page.locator('.desktop-nav').getByRole('link', { name: 'Hackathons', exact: true }).isVisible());
  check('last source check is visible', await page.getByText(/Last source check/).isVisible());
  check('unknown price remains explicit', await page.getByText('Price not stated', { exact: true }).isVisible());
  check('unverified official site is not presented as verified', await page.getByText('Official site not independently verified', { exact: true }).isVisible());
  check('correction report opens a draft without claiming submission', (await page.getByRole('link', { name: /Report incorrect info/ }).first().getAttribute('title'))?.includes('no report is sent automatically'));
  check('card retains Save button for My Interests', await page.getByRole('button', { name: 'Save', exact: true }).first().isVisible());
  const outboundLink = page.getByRole('link', { name: /Interested.*official site/i }).first();
  check('outbound link uses a new tab', await outboundLink.getAttribute('target') === '_blank');
  check('outbound link severs opener/referrer', (await outboundLink.getAttribute('rel')) === 'noopener noreferrer');

  const modeRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.get('mode') === 'online');
  await page.getByLabel('Mode', { exact: true }).selectOption('online');
  await modeRequest;
  check('Online toggle reaches the API filter');
  const freeRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.get('price') === 'free');
  await page.getByRole('button', { name: 'Free', exact: true }).click();
  await freeRequest;
  check('Free price toggle reaches the API filter');
  const todayRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.has('from') && new URL(request.url()).searchParams.has('to'));
  await page.getByLabel('Date range', { exact: true }).selectOption('today');
  await todayRequest;
  check('Today preset supplies bounded from/to values');
  await page.getByRole('button', { name: /Reset filters/ }).click();
  await page.locator('.hackathon-card').first().waitFor();
  const searchRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.get('q') === 'AI');
  await page.getByLabel('Search hackathons', { exact: true }).fill('AI');
  await searchRequest;
  check('search input reaches the API with relevance');
  await page.getByRole('button', { name: /Reset filters/ }).click();
  await page.locator('.hackathon-card').first().waitFor();

  await page.getByLabel('Filter by city or neighbourhood').fill('Mysuru');
  await page.getByRole('heading', { name: 'No hackathons match these filters' }).waitFor();
  check('empty city search renders an honest empty state');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.locator('.hackathon-card').first().waitFor();

  await context.grantPermissions(['geolocation'], { origin: base });
  await context.setGeolocation({ latitude: 12.9352, longitude: 77.6245 });
  await page.getByRole('button', { name: /Use my location/ }).click();
  await page.getByText(/Showing the Bengaluru city anchor/).waitFor();
  check('geolocation resolves to a labelled city anchor');
  await page.getByRole('button', { name: /Reset filters/ }).click();
  await page.locator('.hackathon-card').first().waitFor();

  const guestPopupPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: /Interested.*official site/i }).first().click();
  const guestPopup = await guestPopupPromise;
  await guestPopup.waitForURL('https://organizer.example/ai');
  check('guest Interested records the click and opens the official URL', interestRequests.at(-1)?.body.context === 'web');
  check('guest handoff has no window opener', await guestPopup.evaluate(() => window.opener === null));
  await closePopup(guestPopup);
  check('guest receives a non-blocking sign-in suggestion', await page.getByText(/Sign in to keep Interested hackathons/).isVisible());
  await page.screenshot({ path: 'artifacts/hackathons/discovery-desktop.png', fullPage: true });

  await goto('/hackathons/interests');
  check('guest My Interests suggests sign-in', await page.getByRole('heading', { name: 'My Interests' }).isVisible() && await page.locator('#main-content').getByRole('link', { name: 'Sign in', exact: true }).isVisible());
  await page.locator('#main-content').getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('button', { name: '18 and over', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Hackathon Tester');
  await page.getByLabel('Email address').fill('hackathons@example.com');
  await page.getByLabel('Password', { exact: true }).fill('TestPass!234');
  await page.locator('.consent-check input').check();
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${base}/hackathons/interests`);
  await page.locator('.avatar').waitFor();
  await page.waitForFunction(() => { try { return Boolean(JSON.parse(localStorage.getItem('knot.product.data.v1') ?? '{}').session?.userId); } catch { return false; } });
  await goto('/hackathons');
  const accountPopupPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: /Interested.*official site/i }).first().click();
  const accountPopup = await accountPopupPromise;
  await accountPopup.waitForURL('https://organizer.example/ai');
  await closePopup(accountPopup);
  await page.getByText(/Saved to your local My Interests list/).waitFor();
  check('signed-in local interest receives a device-save state');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('knot_hackathon_interests_v1') ?? '{}'));
  check('signed-in local interest is persisted without guest behavioural storage', Object.values(stored).flat().includes(fixtures[0].id));
  await goto('/hackathons/interests');
  await page.locator('.hackathon-card').waitFor();
  check('My Interests displays the saved listing', await page.getByRole('heading', { name: 'Bengaluru AI Builders Hackathon' }).isVisible());

  await goto('/');
  check('home includes Hackathons near you when flagged', await page.getByRole('heading', { name: 'Hackathons near you' }).isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  await goto('/hackathons');
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  check('mobile navigation includes the same single Hackathons destination', await page.locator('#mobile-navigation').getByRole('link', { name: 'Hackathons', exact: true }).isVisible());
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  check('mobile cards and filters do not overflow horizontally', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.screenshot({ path: 'artifacts/hackathons/discovery-mobile.png', fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  const oldRoutes = ['/', '/search', '/events/sample-ai-builders', '/auth', '/publish', '/host', '/add', '/plan', '/organizer', '/admin', '/communities', '/communities/community-sample-ai-collective', '/profile', '/not-a-real-route'];
  for (const route of oldRoutes) {
    const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
    check(`old route smoke ${route}`, response?.status() === 200);
  }
  check('no browser runtime or console errors', errors.length === 0, errors.join('\n'));
  console.log(`\n${checks} Hackathon browser checks passed.`);
} finally {
  await browser.close();
}
