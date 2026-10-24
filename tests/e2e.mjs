import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
let checks = 0;
const check = (name, condition = true) => { assert.ok(condition, name); checks += 1; console.log(`✓ ${name}`); };
const goto = async (path) => { await page.goto(`${base}${path}`, { waitUntil: 'networkidle' }); };

async function signUp(name, email, returnTo = '/') {
  await goto(`/auth?returnTo=${encodeURIComponent(returnTo)}&action=continue`);
  await page.getByRole('button', { name: '18 and over', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('TestPass!234');
  await page.locator('.consent-check input').check();
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${base}${returnTo}`);
}

async function signIn(email, returnTo = '/') {
  await goto(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('TestPass!234');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${base}${returnTo}`);
}

async function signOut() {
  await goto('/profile');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL(`${base}/`);
}

try {
  await goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  check('guest home renders public event discovery', (await page.locator('h1').innerText()).includes('Find events'));
  check('guest home has sample event cards', await page.locator('.event-card').count() >= 6);
  await page.screenshot({ path: 'artifacts/home-desktop-top.png' });

  await goto('/search');
  check('public search requires no account', await page.getByText('Public browsing, practical filters, original sources and no login wall.').isVisible());
  check('search returns events', await page.locator('.event-card').count() > 0);
  await page.locator('.filter-grid label').filter({ hasText: 'Interest' }).locator('select').selectOption({ label: 'Design' });
  check('interest filter updates result cards', await page.locator('.event-card').count() > 0);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  check('map view renders geocoded locality pins', await page.locator('.map-pin').count() > 0);
  await page.screenshot({ path: 'artifacts/search-map-desktop.png' });

  await goto('/events/sample-ai-builders');
  check('event source ledger is visible', await page.getByRole('heading', { name: 'Source & freshness' }).isVisible());
  check('sample event is explicitly labelled', await page.getByText('This is sample event data').isVisible());
  await page.screenshot({ path: 'artifacts/event-desktop.png' });
  await page.getByRole('button', { name: 'Sign in to register' }).click();
  await page.waitForURL(/\/auth\?/);
  check('external Register action is authentication-gated', page.url().includes('returnTo='));

  await page.getByRole('button', { name: '18 and over', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Organizer One');
  await page.getByLabel('Email address').fill('organizer@example.com');
  await page.getByLabel('Password', { exact: true }).fill('TestPass!234');
  await page.locator('.consent-check input').check();
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${base}/events/sample-ai-builders`);
  await page.getByRole('heading', { name: 'Bengaluru AI Builders Hackathon' }).waitFor();
  check('account creation returns to the original event', await page.getByRole('heading', { name: 'Bengaluru AI Builders Hackathon' }).isVisible());

  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Register on example.com' }).click();
  const popup = await popupPromise;
  await popup.close();
  await page.getByText('Registration page opened', { exact: true }).waitFor();
  check('external action records a handoff rather than a registration', await page.getByText('Registration page opened', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'I completed external registration' }).click();
  check('external completion stays self-confirmed', await page.getByText('Registration self-confirmed', { exact: true }).isVisible());

  await goto('/events/sample-design-systems');
  await page.getByRole('button', { name: 'Register on Knot', exact: true }).click();
  check('native registration succeeds', await page.getByText('You’re registered', { exact: true }).isVisible());
  await page.locator('.participation-actions button').first().click();
  check('save action persists in the participation card', await page.getByRole('button', { name: 'Saved', exact: true }).isVisible());

  await goto('/plan');
  check('My Plan contains native and external participation records', await page.locator('.plan-event').count() >= 2);
  check('My Plan distinguishes self-confirmed external status', await page.getByText(/Self-confirmed externally/).isVisible());

  await goto('/publish');
  await page.getByLabel(/Event title/).fill('E2E Community Design Sprint');
  await page.getByLabel(/Venue name/).fill('Original Test Venue');
  await page.getByLabel(/Who can join/).selectOption('all_ages');
  await page.locator('.publish-sidebar__actions button[type="submit"]').click();
  await page.waitForURL(/\/events\/event-/);
  const publishedUrl = page.url();
  const publishedPath = new URL(publishedUrl).pathname;
  check('Quick Post publishes a native event', await page.getByRole('heading', { name: 'E2E Community Design Sprint' }).isVisible());
  await page.locator('.listing-row strong').first().waitFor();
  check('new event has a Knot source listing', (await page.locator('.listing-row strong').first().innerText()).includes('Knot'));

  await goto('/organizer');
  check('organizer dashboard lists owned event', await page.locator('.event-management__heading h2').getByText('E2E Community Design Sprint', { exact: true }).isVisible());
  await page.screenshot({ path: 'artifacts/organizer-desktop.png' });

  await signOut();
  await signUp('Participant Two', 'participant@example.com', publishedPath);
  await page.getByRole('button', { name: 'Register on Knot', exact: true }).click();
  check('second account can register for the published event', await page.getByText('You’re registered', { exact: true }).isVisible());
  await signOut();

  await signIn('organizer@example.com', '/organizer');
  await page.locator('.organizer-tabs button').nth(1).click();
  check('organizer sees operational native registration', await page.getByText('Participant Two', { exact: true }).isVisible());
  const checkIn = page.getByRole('button', { name: 'Check in', exact: true });
  check('future event check-in is not falsely available', await checkIn.isDisabled());
  await page.locator('.organizer-tabs button').nth(0).click();
  await page.locator('.venue-editor label').nth(0).locator('input').fill('Updated Test Venue');
  await page.getByRole('button', { name: 'Save venue change' }).click();
  await page.getByText(/Venue updated/).waitFor();
  check('venue update confirms revision and notifications', await page.getByText(/Venue updated/).isVisible());
  await goto(publishedPath);
  check('public event shows the revised venue', await page.getByText('Updated Test Venue', { exact: true }).first().isVisible());
  check('public event preserves change history', await page.getByText('Venue changed to Updated Test Venue', { exact: true }).isVisible());
  await signOut();

  await signIn('participant@example.com', '/');
  await page.locator('.notification-button').click();
  check('affected participant receives a material-change notification', await page.getByText('Venue changed', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await page.locator('.drawer-header .icon-button').click();

  await goto('/add');
  await page.getByRole('button', { name: 'Insert labelled sample text' }).click();
  await page.getByRole('button', { name: /Read and create draft/ }).click();
  await page.locator('.draft-review').waitFor();
  check('Instant Add creates a reviewable draft', await page.getByRole('heading', { name: 'Confirm the extracted details' }).isVisible());
  await page.getByRole('button', { name: /Submit for human review/ }).click();
  check('Instant Add enters pending review without publishing', await page.getByText('Your draft is in the queue').isVisible());
  check('pending review is explicit', await page.getByText('Status: pending review').isVisible());

  await goto('/communities/community-sample-ai-collective');
  await page.getByRole('button', { name: /Team formation/ }).click();
  await page.getByRole('button', { name: 'Create team post', exact: true }).click();
  await page.getByLabel('Your role').fill('Product designer');
  await page.getByLabel('Looking for').fill('One frontend teammate');
  await page.getByRole('button', { name: 'Publish team post' }).click();
  check('adult can create a team-formation post', await page.getByRole('heading', { name: 'Product designer' }).isVisible());
  await signOut();

  await signIn('organizer@example.com', '/communities/community-sample-ai-collective');
  await page.getByRole('button', { name: /Team formation/ }).click();
  await page.getByRole('button', { name: 'Request to join' }).click();
  await page.locator('.modal-card textarea').fill('I can build the frontend and prototype quickly.');
  await page.getByRole('button', { name: /Send request/ }).click();
  check('team request is pending until accepted', await page.getByText('Request pending', { exact: true }).isVisible());
  await signOut();

  await signIn('participant@example.com', '/communities/community-sample-ai-collective');
  await page.getByRole('button', { name: /Team formation/ }).click();
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  check('team owner can accept a request', await page.getByText('accepted', { exact: true }).isVisible());
  check('contact handoff appears only after acceptance', await page.getByText('Contact: organizer@example.com', { exact: true }).isVisible());

  await goto('/profile');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export my data' }).click();
  const download = await downloadPromise;
  check('profile exports portable JSON data', download.suggestedFilename() === 'knot-my-data.json');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(base, { waitUntil: 'networkidle' });
  check('mobile bottom navigation is visible', await mobilePage.locator('.mobile-bottom-nav').isVisible());
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('mobile home has no horizontal page overflow', overflow <= 1);
  await mobilePage.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
  await mobilePage.goto(`${base}/search`, { waitUntil: 'networkidle' });
  const searchOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('mobile search has no horizontal page overflow', searchOverflow <= 1);
  await mobilePage.screenshot({ path: 'artifacts/search-mobile-top.png' });
  await mobile.close();

  check('no browser runtime or console errors in the tested desktop flow', errors.length === 0);
  console.log(`\n${checks} browser checks passed.`);
} catch (error) {
  console.error(error);
  await page.screenshot({ path: 'artifacts/e2e-failure.png', fullPage: true }).catch(() => undefined);
  console.error('Failure URL:', page.url());
  console.error('Browser errors:', errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
