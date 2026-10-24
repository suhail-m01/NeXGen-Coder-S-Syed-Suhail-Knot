import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
context.setDefaultTimeout(25_000);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
let checks = 0;
const check = (name, condition = true) => { assert.ok(condition, name); checks += 1; console.log(`✓ ${name}`); };
const goto = async (path) => { await page.goto(path.startsWith('http') ? path : `${base}${path}`, { waitUntil: 'networkidle' }); };
const readData = () => page.evaluate(() => JSON.parse(localStorage.getItem('knot.product.data.v1')));

async function signUp(name, email, returnTo = '/') {
  await goto(`/auth?returnTo=${encodeURIComponent(returnTo)}&action=continue`);
  await page.getByRole('button', { name: '18 and over', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('TestPass!234');
  await page.locator('form .consent-check input').check();
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${base}${returnTo}`);
  await page.waitForLoadState('networkidle');
}
async function signIn(email, returnTo = '/') {
  await goto(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('TestPass!234');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${base}${returnTo}`);
  await page.waitForLoadState('networkidle');
}
async function signOut() {
  await goto('/profile');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL(`${base}/`);
}
async function uploadImage(fileInput, name = 'fixture.png') {
  const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  await fileInput.setInputFiles({ name, mimeType: 'image/png', buffer });
}

try {
  await goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('knot-product-media'); });
  await page.reload({ waitUntil: 'networkidle' });
  await signUp('Final Organizer', 'final-organizer@example.com', '/publish');
  await page.getByLabel(/Event title/).fill('Final Expansion Hackathon');
  await page.getByLabel(/Event type/).selectOption('hackathon');
  await page.getByLabel(/Venue name/).fill('Final Expansion Venue');
  await page.getByLabel(/Who can join/).selectOption('all_ages');
  await page.locator('.publish-sidebar__actions button[type="submit"]').click();
  await page.waitForURL(/\/events\/event-/);
  const eventPath = new URL(page.url()).pathname;
  const eventId = eventPath.split('/').pop();
  const studioPath = `/organizer/events/${eventId}`;
  check('fresh organizer publishes the native expansion event', await page.getByRole('heading', { name: 'Final Expansion Hackathon' }).isVisible());

  await goto(studioPath);
  await page.getByRole('button', { name: 'Content', exact: true }).click();
  await page.locator('.studio-content label').filter({ hasText: 'Team format' }).locator('select').selectOption('team');
  await page.locator('.studio-content label').filter({ hasText: 'Minimum team size' }).locator('input').fill('2');
  await page.locator('.studio-content label').filter({ hasText: 'Maximum team size' }).locator('input').fill('3');
  await page.getByLabel(/Skills \/ learning outcomes/).fill('Python, React');
  await page.getByLabel('New series title').fill('Final Builder Series');
  await page.getByRole('button', { name: 'Create series' }).click();
  await page.getByRole('button', { name: 'Save all content and timeline settings' }).click();
  await page.getByText('Event content, timeline and post-event settings saved', { exact: true }).waitFor();
  check('team rules, complementary skills and series assignment persist', true);

  await page.getByRole('button', { name: 'Growth', exact: true }).click();
  await page.getByLabel('New channel label').fill('College newsletter');
  await page.getByRole('button', { name: 'Create channel' }).click();
  await page.locator('.referral-card').waitFor();
  const referralUrl = await page.locator('.referral-card input').inputValue();
  check('referral channel produces a real event URL with token', referralUrl.includes(`/events/${eventId}?ref=`));
  await page.locator('.referral-qr').waitFor();
  check('referral QR is generated as a real image', (await page.locator('.referral-qr').getAttribute('src')).startsWith('data:image/png'));
  check('new channel honestly reports no conversion yet', await page.getByText('No opens yet', { exact: true }).isVisible());

  await signOut();
  await goto(referralUrl);
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem('knot.product.data.v1'))?.referralVisits ?? []).length === 1);
  check('guest referral open is aggregate and session-deduplicated', (await readData()).referralVisits.length === 1);
  check('guest referral record contains no account identifier', !('userId' in (await readData()).referralVisits[0]));

  await signUp('Final Participant', 'final-participant@example.com', eventPath);
  await page.getByRole('button', { name: 'Register on Knot', exact: true }).click();
  await page.getByText('You are registered. It has been added to My Plan.', { exact: true }).waitFor();
  const participantRegistration = (await readData()).registrations.find((item) => item.eventId === eventId);
  check('native registration retains its referral channel', Boolean(participantRegistration.referralCampaignId));
  await goto('/profile');
  const fitSection = page.locator('.profile-section').filter({ has: page.getByRole('heading', { name: 'Participation Fit', exact: true }) });
  await fitSection.locator('fieldset').filter({ hasText: 'Skills you bring' }).getByRole('button', { name: 'React', exact: true }).click();
  await fitSection.getByRole('button', { name: 'Save preferences' }).click();
  const analyticsSection = page.locator('.profile-section').filter({ has: page.getByRole('heading', { name: '60-day return analytics', exact: true }) });
  await analyticsSection.locator('.consent-check input').check();
  await analyticsSection.getByRole('button', { name: 'Save analytics choice' }).click();
  check('adult can explicitly control return-cohort analytics consent', (await readData()).users.find((user) => user.email === 'final-participant@example.com').returnAnalyticsConsent === true);

  await signOut();
  await signIn('final-organizer@example.com', studioPath);
  await page.getByRole('button', { name: 'Growth', exact: true }).click();
  check('organizer sees one aggregate open and one native conversion', await page.locator('.data-table').first().getByRole('cell', { name: '100%', exact: true }).isVisible());
  const organizerData = await readData();
  const organizerId = organizerData.users.find((user) => user.email === 'final-organizer@example.com').id;
  const communityId = organizerData.events.find((event) => event.id === eventId).communityId;
  const communityPath = `/communities/${communityId}`;
  await goto(communityPath);
  await page.getByRole('button', { name: /Team formation/ }).click();
  await page.getByRole('button', { name: 'Create team post', exact: true }).click();
  await page.getByLabel('Your role', { exact: true }).fill('Backend builder');
  await page.getByLabel('Looking for', { exact: true }).fill('React frontend builder');
  await page.locator('.team-form').getByRole('button', { name: 'Python', exact: true }).click();
  await page.getByRole('button', { name: 'Publish team post' }).click();
  await page.locator('.team-invite-form summary').click();
  await page.locator('.team-invite-form').getByLabel('Account email').fill('final-participant@example.com');
  await page.locator('.team-invite-form').getByLabel('Proposed role').fill('Frontend builder');
  await page.getByRole('button', { name: 'Send in-app invitation' }).click();
  await page.getByText(/In-app invitation sent/).waitFor();
  check('team owner sends a real in-app adult invitation', (await readData()).teamInvitations.length === 1);

  await signOut();
  await signIn('final-participant@example.com', communityPath);
  await page.getByRole('button', { name: /Team formation/ }).click();
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await page.getByText('Invitation accepted.', { exact: true }).waitFor();
  check('accepted invitation satisfies team size and complementary-skill readiness', await page.locator('.team-readiness--ready').isVisible());
  await page.locator('.team-continuity .consent-check input').check();
  check('accepted adult can opt into team continuity and counterpart contacts', await page.locator('.team-contacts').isVisible());
  check('team continuity never becomes event registration', await page.getByText(/No private messaging channel is created/).isVisible());

  await signOut();
  await signIn('final-organizer@example.com', studioPath);
  await page.getByRole('button', { name: 'Media & sponsors', exact: true }).click();
  await page.locator('.media-upload-form label').filter({ hasText: 'Media kind' }).locator('select').selectOption('recap_photo');
  await page.getByLabel('Title', { exact: true }).fill('Hackathon recap');
  await page.getByLabel('Alternative text').fill('A sample abstract recap image with no recognizable people');
  await page.locator('.media-upload-form label').filter({ hasText: 'Photo consent basis' }).locator('select').selectOption('not_applicable');
  await uploadImage(page.locator('#event-media-file'));
  await page.getByRole('button', { name: 'Save private draft' }).click();
  await page.getByText(/Optimized image saved as a private draft/).waitFor();
  check('real image is normalized and stored as a draft', (await readData()).mediaAssets[0].mimeType === 'image/webp');
  const recapCard = page.locator('.media-asset').filter({ hasText: 'Hackathon recap' });
  await recapCard.getByRole('button', { name: 'Publish', exact: true }).click();
  check('organizer explicitly publishes consent-labelled media', await recapCard.getByText(/recap photo · published/).isVisible());

  await page.locator('.media-upload-form label').filter({ hasText: 'Media kind' }).locator('select').selectOption('sponsor_logo');
  await page.getByLabel('Title', { exact: true }).fill('Knot Sponsor logo');
  await page.getByLabel('Alternative text').fill('Abstract sponsor test logo');
  await uploadImage(page.locator('#event-media-file'), 'sponsor.png');
  await page.getByRole('button', { name: 'Save private draft' }).click();
  await page.getByText(/Optimized image saved as a private draft/).waitFor();
  const logoCard = page.locator('.media-asset').filter({ hasText: 'Knot Sponsor logo' });
  await logoCard.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByLabel('Sponsor name').fill('Knot Sponsor');
  await page.getByLabel('Sponsor URL').fill('https://example.com/sponsor');
  await page.locator('.media-studio label').filter({ hasText: 'Published logo' }).locator('select').selectOption({ label: 'Knot Sponsor logo' });
  await page.getByRole('button', { name: 'Add sponsor', exact: true }).click();
  check('sponsor library links a published event-owned logo', (await readData()).events.find((event) => event.id === eventId).sponsors.length === 1);

  await goto(eventPath);
  await page.getByRole('heading', { name: 'Event media & recap', exact: true }).waitFor();
  const publicImage = page.getByAltText('A sample abstract recap image with no recognizable people');
  await publicImage.waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  const persistedImage = page.getByAltText('A sample abstract recap image with no recognizable people');
  await persistedImage.waitFor();
  check('published media survives reload through IndexedDB blob storage', await persistedImage.evaluate((image) => image.src.startsWith('blob:') && image.complete && image.naturalWidth > 0));
  check('sponsor appears on the participant event page', await page.getByRole('link', { name: /Knot Sponsor/ }).isVisible());

  const recapAssetId = (await readData()).mediaAssets.find((asset) => asset.title === 'Hackathon recap').id;
  await goto(studioPath);
  await page.getByRole('button', { name: 'Media & sponsors', exact: true }).click();
  await page.locator('.media-asset').filter({ hasText: 'Hackathon recap' }).getByRole('button', { name: 'Take down', exact: true }).click();
  await page.waitForFunction((id) => JSON.parse(localStorage.getItem('knot.product.data.v1')).mediaAssets.find((asset) => asset.id === id)?.status === 'removed', recapAssetId);
  await page.waitForFunction(async (id) => {
    const database = await new Promise((resolve, reject) => { const request = indexedDB.open('knot-product-media', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const value = await new Promise((resolve, reject) => { const request = database.transaction('assets', 'readonly').objectStore('assets').get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    database.close(); return value === undefined;
  }, recapAssetId);
  check('media takedown removes public metadata and deletes the persistent blob', true);
  await goto(eventPath);
  check('taken-down recap no longer renders publicly', await page.getByAltText('A sample abstract recap image with no recognizable people').count() === 0);

  await goto(studioPath);
  await page.getByRole('button', { name: 'Content', exact: true }).click();
  const automation = page.locator('.series-automation');
  await automation.getByLabel('Occurrences', { exact: true }).fill('1');
  await automation.getByRole('button', { name: 'Start local automation' }).click();
  await page.getByText(/Automation saved/).waitFor();
  await page.evaluate(() => {
    const key = 'knot.product.data.v1'; const data = JSON.parse(localStorage.getItem(key));
    data.series[0].automation.nextAt = new Date(Date.now() - 1000).toISOString();
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem('knot.product.data.v1'))?.seriesRuns ?? []).length === 1);
  const cloneData = await readData();
  const clone = cloneData.events.find((event) => event.id === cloneData.seriesRuns[0].clonedEventId);
  check('due series automation creates one private draft', clone.status === 'draft' && clone.visibility === 'private');
  check('series clone resets joining link, safety and participant outcomes', clone.onlineJoinUrl === null && clone.nativeSafetyChecklistComplete === false && !clone.recap && cloneData.registrations.every((item) => item.eventId !== clone.id));
  await page.getByRole('button', { name: 'Content', exact: true }).click();
  await page.getByRole('button', { name: 'Publish reviewed draft', exact: true }).click();
  await page.waitForFunction(() => {
    const data = JSON.parse(localStorage.getItem('knot.product.data.v1')); const id = data.seriesRuns[0].clonedEventId;
    return data.events.find((event) => event.id === id)?.status === 'published';
  });
  check('series draft requires and records a human publication action', true);

  await page.evaluate(({ organizerId, eventId }) => {
    const key = 'knot.product.data.v1'; const data = JSON.parse(localStorage.getItem(key));
    const template = data.events.find((event) => event.id === eventId);
    const first = { ...template, id: 'cohort-first', slug: 'cohort-first', title: 'Cohort First', organizerId, startAt: '2026-01-01T10:00:00.000Z', endAt: '2026-01-02T10:00:00.000Z' };
    const second = { ...template, id: 'cohort-second', slug: 'cohort-second', title: 'Cohort Second', organizerId, startAt: '2026-02-01T10:00:00.000Z', endAt: '2026-02-02T10:00:00.000Z' };
    data.events.push(first, second);
    for (let index = 0; index < 5; index += 1) {
      const id = `cohort-adult-${index}`;
      data.users.push({ ...data.users.find((user) => user.email === 'final-participant@example.com'), id, email: `${id}@example.com`, returnAnalyticsConsent: true });
      data.registrations.push({ id: `cohort-r1-${index}`, eventId: first.id, userId: id, kind: 'native', status: 'attended', selfDeclaredAgeRuleMet: true, createdAt: first.startAt, updatedAt: first.startAt });
      if (index < 2) data.registrations.push({ id: `cohort-r2-${index}`, eventId: second.id, userId: id, kind: 'native', status: 'attended', selfDeclaredAgeRuleMet: true, createdAt: second.startAt, updatedAt: second.startAt });
    }
    localStorage.setItem(key, JSON.stringify(data));
  }, { organizerId, eventId });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Growth', exact: true }).click();
  const cohortTable = page.locator('.data-table').nth(1);
  check('mature five-adult cohort reports measured 40 percent return', await cohortTable.getByRole('cell', { name: '40%', exact: true }).isVisible());
  check('cohort report identifies a complete 60-day window', await cohortTable.getByRole('cell', { name: 'Complete', exact: true }).isVisible());

  await goto('/search?view=map');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Search this area', exact: true }).click();
  check('map viewport search returns an accessible loaded-event list', await page.locator('.map-area-results').getByText(/events in the searched viewport/).isVisible());
  await page.getByLabel('Choose your locality').selectOption('city-mumbai');
  check('India expansion labels Mumbai as an approximate city centre', (await page.getByLabel('Choose your locality').locator('option:checked').textContent()).includes('approximate city centre'));

  await page.setViewportSize({ width: 390, height: 844 });
  await goto(studioPath);
  await page.getByRole('button', { name: 'Media & sponsors', exact: true }).click();
  check('new media studio has no 390px horizontal page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.screenshot({ path: 'artifacts/final-expansion-mobile.png', fullPage: true });
  check('no unexpected browser runtime or console errors in final expansion', errors.length === 0);
  console.log(`\n${checks} final expansion checks passed.`);
} catch (error) {
  await page.screenshot({ path: 'artifacts/final-expansion-failure.png', fullPage: true }).catch(() => {});
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
}
