import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
context.setDefaultTimeout(15_000);
context.setDefaultNavigationTimeout(30_000);
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

async function submitInstantSample() {
  await goto('/add');
  await page.getByRole('button', { name: 'Insert labelled sample text' }).click();
  await page.getByRole('button', { name: /Read and create draft/ }).click();
  await page.locator('.draft-review').waitFor();
  await page.getByRole('button', { name: /Submit for human review/ }).click();
  await page.getByText('Your draft is in the queue').waitFor();
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
  await page.locator('.knot-leaflet-pin').first().waitFor();
  check('map view renders geocoded Leaflet event pins', await page.locator('.knot-leaflet-pin').count() > 0);
  check('map includes the configured basemap attribution', await page.locator('.leaflet-control-attribution').isVisible());
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

  const popupPromise = context.waitForEvent('page', { timeout: 15_000 });
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
  await page.getByText('Your draft is in the queue').waitFor();
  check('Instant Add enters pending review without publishing', await page.getByText('Your draft is in the queue').isVisible());
  check('pending review is explicit', await page.getByText('Status: pending review').isVisible());
  await submitInstantSample();
  await submitInstantSample();

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

  await goto('/admin');
  check('ordinary accounts cannot open privileged review tools', await page.getByRole('heading', { name: 'Reviewer access required' }).isVisible());
  await signOut();
  await signIn('organizer@example.com', '/admin');
  await page.locator('.review-queue__item').nth(2).waitFor();
  check('workspace owner sees three pending submissions', await page.locator('.review-queue__item').count() === 3);
  check('private evidence is collapsed by default', !(await page.locator('.private-evidence pre').isVisible()));
  await page.locator('.private-evidence summary').click();
  check('privileged reviewer can inspect private evidence', await page.locator('.private-evidence pre').isVisible());
  await page.locator('.private-evidence summary').click();
  await page.screenshot({ path: 'artifacts/admin-review-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await goto('/admin');
  await page.locator('.review-editor').waitFor();
  const adminOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('mobile review workspace has no horizontal page overflow', adminOverflow <= 1);
  await page.screenshot({ path: 'artifacts/admin-review-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto('/admin');

  await page.locator('.review-note textarea').fill('Checked the supplied timing, venue, age wording and source link.');
  await page.getByRole('button', { name: 'Approve & publish' }).click();
  await page.getByText(/was published as a canonical event/).waitFor();
  check('reviewer can edit and approve a submission into a canonical event', await page.getByText(/was published as a canonical event/).isVisible());
  const approvedHref = await page.locator('.form-success a').getAttribute('href');
  assert.ok(approvedHref);
  await goto(approvedHref);
  check('approved community submission becomes publicly discoverable', await page.getByRole('heading', { name: 'Bengaluru Product & AI Meetup' }).isVisible());
  check('raw private submission prose is not copied to the public event', !(await page.locator('body').innerText()).includes('Meet product builders for practical demos'));

  await goto('/admin');
  await page.getByLabel('Original or registration URL').fill('https://community.example.com/product-ai-meetup');
  await page.locator('.duplicate-warning .text-button').first().click();
  await page.getByRole('button', { name: 'Confirm merge' }).click();
  await page.getByText(/Submission merged/).waitFor();
  check('reviewer can merge a duplicate while preserving the canonical event', await page.getByText(/Submission merged/).isVisible());
  await goto(approvedHref);
  check('canonical merge retains both distinct source listings', await page.locator('.listing-row').count() === 2);

  await goto('/admin');
  await page.locator('.review-note textarea').fill('Please provide an official organizer contact and confirm the venue.');
  await page.getByRole('button', { name: 'Request info' }).click();
  await page.getByText('Information request sent to the submitter.').waitFor();
  check('reviewer can request more information without publishing', await page.getByText('Information request sent to the submitter.').isVisible());
  await page.locator('.review-toolbar select').selectOption('needs_info');
  await page.locator('.review-outcome').waitFor();
  await page.locator('.review-note textarea').fill('Rejected after the requested official details were not available for this test record.');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await page.getByText('Submission rejected without publication.').waitFor();
  check('reviewer can reject a needs-information submission', await page.getByText('Submission rejected without publication.').isVisible());
  await page.locator('.review-toolbar select').selectOption('rejected');
  await page.locator('.review-outcome').waitFor();
  check('rejection outcome and review note remain auditable', await page.getByText('Last review: rejected', { exact: true }).isVisible());

  await page.locator('.organizer-tabs button').nth(1).click();
  const unstopSource = page.locator('.source-card').filter({ hasText: 'Unstop' });
  await unstopSource.waitFor();
  const unstopText = (await unstopSource.innerText()).toLowerCase();
  check('external platform source remains disabled pending permission review', unstopText.includes('review required') && unstopText.includes('disabled'));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/source-records-desktop.png', fullPage: true });
  await signOut();

  await signIn('participant@example.com', '/organizer');
  await page.locator('.organizer-tabs button').nth(2).click();
  check('submitter sees all three review outcomes', await page.locator('.submission-list article').count() === 3 && await page.locator('.submission-status--published').isVisible() && await page.locator('.submission-status--merged').isVisible() && await page.locator('.submission-status--rejected').isVisible());
  await goto('/');
  await page.locator('.notification-button').click();
  check('review actions close the loop with submitter notifications', await page.getByText('Submission published', { exact: true }).isVisible() && await page.getByText('Submission merged', { exact: true }).isVisible() && await page.getByText('Submission needs information', { exact: true }).isVisible() && await page.getByText('Submission not published', { exact: true }).isVisible());
  await page.locator('.drawer-header .icon-button').click();

  await signOut();
  await signIn('organizer@example.com', '/publish');
  await page.getByLabel(/Event title/).fill('E2E Reviewed Prototype Clinic');
  await page.getByLabel(/Venue name/).fill('Reviewed Operations Venue');
  await page.getByLabel(/Confirmed capacity/).fill('1');
  await page.getByLabel('Registration review').selectOption('manual');
  await page.getByLabel(/Who can join/).selectOption('all_ages');
  check('waitlist can be enabled for a finite-capacity native event', await page.getByLabel(/Enable a waitlist/).isChecked());
  await page.locator('.publish-sidebar__actions button[type="submit"]').click();
  await page.waitForURL(/\/events\/event-/);
  const reviewedEventPath = new URL(page.url()).pathname;
  await page.getByRole('heading', { name: 'E2E Reviewed Prototype Clinic' }).waitFor();
  check('Quick Post publishes manual review, capacity and waitlist policy', (await page.locator('.participation-card__meta').innerText()).includes('Capacity 1') && (await page.locator('.participation-card__meta').innerText()).includes('Organizer review'));

  await signOut();
  await signIn('participant@example.com', reviewedEventPath);
  await page.getByRole('button', { name: 'Register on Knot', exact: true }).click();
  await page.getByText('Registration pending', { exact: true }).waitFor();
  check('manual registration starts pending rather than confirmed', await page.getByText('Registration pending', { exact: true }).isVisible());
  await signOut();
  await signUp('Participant Three', 'participant-three@example.com', reviewedEventPath);
  await page.getByRole('button', { name: 'Register on Knot', exact: true }).click();
  await page.getByText('Registration pending', { exact: true }).waitFor();
  await signOut();
  await signUp('Participant Four', 'participant-four@example.com', reviewedEventPath);
  await page.getByRole('button', { name: 'Register on Knot', exact: true }).click();
  await page.getByText('Registration pending', { exact: true }).waitFor();
  await signOut();

  await signIn('organizer@example.com', '/organizer');
  await page.locator('.organizer-tabs button').nth(1).click();
  await page.locator('.dashboard-event-select select').selectOption({ label: 'E2E Reviewed Prototype Clinic' });
  await page.locator('.data-table tbody tr').nth(2).waitFor();
  const participantRow = (name) => page.locator('.data-table tbody tr').filter({ hasText: name });
  check('organizer sees three distinct pending applications', await page.locator('.data-table .registration-status--pending').count() === 3);
  page.once('dialog', (dialog) => dialog.accept());
  await participantRow('Participant Four').getByRole('button', { name: 'Reject', exact: true }).click();
  await participantRow('Participant Four').locator('.registration-status--rejected').waitFor();
  check('organizer can reject a pending registration', await participantRow('Participant Four').locator('.registration-status--rejected').isVisible());
  await participantRow('Participant Two').getByRole('button', { name: 'Approve', exact: true }).click();
  await participantRow('Participant Two').locator('.registration-status--approved').waitFor();
  check('first approval confirms the available capacity', await participantRow('Participant Two').locator('.registration-status--approved').isVisible());
  await participantRow('Participant Three').getByRole('button', { name: 'Approve', exact: true }).click();
  await participantRow('Participant Three').locator('.registration-status--waitlisted').waitFor();
  check('approval at full capacity branches to waitlisted', await participantRow('Participant Three').locator('.waitlist-position').getByText('#1', { exact: true }).isVisible());
  await page.screenshot({ path: 'artifacts/registration-review-desktop.png', fullPage: true });
  await page.locator('.organizer-tabs button').nth(0).click();
  check('capacity summary counts only the confirmed registration', (await page.locator('.management-facts').innerText()).includes('1/1'));
  await page.screenshot({ path: 'artifacts/registration-capacity-desktop.png', fullPage: true });
  await signOut();

  await signIn('participant-three@example.com', reviewedEventPath);
  await page.getByText('Waitlist position 1', { exact: true }).waitFor();
  check('waitlisted participant sees position and non-confirmation', await page.getByText('This is not a confirmed registration. Promotion depends on a confirmed spot opening.', { exact: true }).isVisible());
  check('waitlisted participant does not receive a QR check-in pass', await page.locator('.checkin-pass').count() === 0);
  await signOut();
  await signIn('participant@example.com', reviewedEventPath);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancel registration', exact: true }).click();
  await page.getByText(/Your native participation record was cancelled/).waitFor();
  check('confirmed participant can cancel their native registration', await page.getByRole('button', { name: 'Register on Knot', exact: true }).isVisible());
  await signOut();
  await signIn('participant-three@example.com', reviewedEventPath);
  await page.getByText('Registration approved', { exact: true }).waitFor();
  check('oldest waitlisted participant is promoted after cancellation', await page.getByText('Registration approved', { exact: true }).isVisible());
  await page.locator('.notification-button').click();
  check('waitlist promotion sends a distinct confirmation notification', await page.getByText('Waitlist promoted', { exact: true }).isVisible());
  await page.locator('.drawer-header .icon-button').click();

  await signOut();
  await signIn('organizer@example.com', '/publish');
  const localInput = (minutesFromNow) => {
    const date = new Date(Date.now() + minutesFromNow * 60_000);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  };
  await page.getByLabel(/Event title/).fill('E2E QR Check-in Session');
  await page.getByLabel(/Venue name/).fill('QR Operations Venue');
  await page.getByLabel(/Starts/).fill(localInput(60));
  await page.getByLabel(/Ends/).fill(localInput(180));
  await page.getByLabel(/Registration deadline/).fill('');
  await page.getByLabel(/Who can join/).selectOption('all_ages');
  await page.locator('.publish-sidebar__actions button[type="submit"]').click();
  await page.waitForURL(/\/events\/event-/);
  const qrEventPath = new URL(page.url()).pathname;
  await signOut();
  await signIn('participant@example.com', qrEventPath);
  await page.getByRole('button', { name: 'Register on Knot', exact: true }).click();
  await page.getByText('You’re registered', { exact: true }).waitFor();
  const qrPass = page.locator('.checkin-pass img');
  await qrPass.waitFor();
  const qrDataUrl = await qrPass.getAttribute('src');
  assert.ok(qrDataUrl?.startsWith('data:image/png;base64,'));
  check('confirmed participant receives a locally generated QR pass', await qrPass.isVisible());
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  await page.screenshot({ path: 'artifacts/participant-qr-pass.png', fullPage: true });
  await signOut();

  await signIn('organizer@example.com', '/organizer');
  await page.locator('.organizer-tabs button').nth(1).click();
  await page.locator('.dashboard-event-select select').selectOption({ label: 'E2E QR Check-in Session' });
  await page.getByRole('button', { name: 'Open QR check-in' }).click();
  await page.locator('.qr-file-input').setInputFiles({ name: 'participant-pass.png', mimeType: 'image/png', buffer: qrBuffer });
  await page.locator('.qr-scan-result--checked_in').waitFor();
  check('organizer scanner decodes the real participant QR image', await page.getByText('Check-in recorded for Participant Two.', { exact: true }).isVisible());
  await page.locator('.data-table .registration-status--attended').waitFor();
  check('QR scan creates the organizer-attended state', await page.locator('.data-table .registration-status--attended').isVisible());
  await page.locator('.qr-file-input').setInputFiles({ name: 'participant-pass.png', mimeType: 'image/png', buffer: qrBuffer });
  await page.locator('.qr-scan-result--duplicate').waitFor();
  check('scanning the same QR again is handled as a duplicate', await page.getByText(/Duplicate scan: Participant Two was already checked in/).isVisible());
  check('duplicate scan does not increase attendance records', await page.locator('.data-table .registration-status--attended').count() === 1 && await page.locator('.organizer-stats > div').nth(3).locator('strong').innerText() === '1');
  await page.screenshot({ path: 'artifacts/qr-duplicate-scan.png', fullPage: true });

  await page.locator('.dashboard-event-select select').selectOption({ label: 'E2E Reviewed Prototype Clinic' });
  await page.locator('.qr-file-input').setInputFiles({ name: 'participant-pass.png', mimeType: 'image/png', buffer: qrBuffer });
  await page.locator('.qr-scan-result--wrong_event').waitFor();
  check('a valid pass cannot be used for the wrong event', await page.getByText(/belongs to a different event/).isVisible());
  await page.getByLabel('Manual pass code').fill('not-a-valid-pass');
  await page.getByRole('button', { name: 'Check in code' }).click();
  await page.locator('.qr-scan-result--invalid').waitFor();
  check('malformed manual codes are rejected without check-in', await page.getByText('No valid Knot check-in pass was found.', { exact: true }).isVisible());

  await page.getByRole('button', { name: /Communications/ }).click();
  await page.locator('.compact-select select').selectOption({ label: 'E2E Reviewed Prototype Clinic' });
  check('confirmed announcement preview excludes cancelled and rejected records', await page.getByText('1 matching native participant', { exact: true }).isVisible() && await page.getByText('1 in-app recipient after opt-outs · 0 opted out', { exact: true }).isVisible());
  await page.getByLabel(/^Subject/).fill('Clinic logistics briefing');
  await page.getByLabel(/^Message/).fill('Please bring your prototype and arrive ten minutes early.');
  check('organizer can inspect the live recipient preview', await page.locator('.announcement-preview').getByRole('heading', { name: 'Clinic logistics briefing' }).isVisible());
  await page.getByRole('button', { name: 'Send in-app announcement' }).click();
  await page.locator('.communication-composer .form-success').waitFor();
  check('targeted announcement writes an honest in-app delivery ledger', await page.locator('.announcement-record').count() === 1 && (await page.locator('.announcement-record').innerText()).includes('1/1 recipients'));
  await page.screenshot({ path: 'artifacts/organizer-communications-desktop.png', fullPage: true });
  await signOut();
  await signIn('participant-three@example.com', '/');
  await page.locator('.notification-button').click();
  check('targeted participant receives the organizer announcement', await page.locator('.notification-drawer').getByText('Clinic logistics briefing', { exact: true }).isVisible());
  await page.locator('.drawer-header .icon-button').click();
  await goto('/profile');
  await page.getByLabel(/Receive organizer announcements in Knot/).uncheck();
  await page.getByRole('button', { name: 'Save notification preference' }).click();
  await page.reload({ waitUntil: 'networkidle' });
  check('participant announcement opt-out persists', !(await page.getByLabel(/Receive organizer announcements in Knot/).isChecked()));
  await signOut();

  await signIn('organizer@example.com', '/organizer');
  await page.getByRole('button', { name: /Communications/ }).click();
  await page.locator('.compact-select select').selectOption({ label: 'E2E Reviewed Prototype Clinic' });
  check('audience preview separates matching participants from opted-out recipients', await page.getByText('1 matching native participant', { exact: true }).isVisible() && await page.getByText('0 in-app recipients after opt-outs · 1 opted out', { exact: true }).isVisible());
  await page.getByLabel(/^Subject/).fill('Opted-out announcement should not send');
  await page.getByLabel(/^Message/).fill('This message must not create a participant notification.');
  await page.getByRole('button', { name: 'Send in-app announcement' }).click();
  await page.locator('.communication-composer .form-error').waitFor();
  check('an all-opted-out audience blocks the send', await page.getByText('Everyone in this audience has opted out. No announcement was sent.', { exact: true }).isVisible());
  check('blocked send does not add a delivery-ledger record', await page.locator('.announcement-record').count() === 1);
  await page.setViewportSize({ width: 390, height: 844 });
  const communicationsOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('mobile organizer communications has no horizontal page overflow', communicationsOverflow <= 1);
  await page.screenshot({ path: 'artifacts/organizer-communications-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signOut();
  await signIn('participant-three@example.com', '/');
  await page.locator('.notification-button').click();
  check('opted-out participant receives no second announcement notification', await page.locator('.notification-drawer').getByText('Clinic logistics briefing', { exact: true }).isVisible() && await page.locator('.notification-drawer').getByText('Opted-out announcement should not send', { exact: true }).count() === 0);
  await page.locator('.drawer-header .icon-button').click();

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
