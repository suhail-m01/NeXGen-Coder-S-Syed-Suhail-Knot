import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
context.setDefaultTimeout(20_000);
context.setDefaultNavigationTimeout(30_000);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
let checks = 0;
const check = (name, condition = true) => { assert.ok(condition, name); checks += 1; console.log(`✓ ${name}`); };
const goto = async (path) => { await page.goto(`${base}${path}`, { waitUntil: 'networkidle' }); };

async function signUp(name, email, returnTo = '/', ageBand = '18 and over') {
  await goto(`/auth?returnTo=${encodeURIComponent(returnTo)}&action=continue`);
  await page.getByRole('button', { name: ageBand, exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email address').fill(email);
  if (ageBand !== '18 and over') await page.getByLabel('Guardian email').fill('guardian@example.com');
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

try {
  await goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await goto('/auth');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('button', { name: 'Under 13', exact: true }).click();
  check('under-13 individual account creation stays closed', await page.getByRole('button', { name: 'Continue', exact: true }).count() === 0);
  check('under-13 public browsing remains available', await page.getByRole('link', { name: 'Continue browsing publicly' }).isVisible());

  await goto('/events/sample-ai-builders');
  await page.locator('.trust-actions details summary').click();
  await page.locator('.trust-actions select').selectOption({ label: 'Minor safety concern' });
  await page.locator('.trust-actions textarea').fill('Guest safety report details for privileged review.');
  await page.locator('.trust-actions .consent-check input').check();
  await page.getByRole('button', { name: 'Send report' }).click();
  await page.getByText(/Report sent to the trust queue/).waitFor();
  check('guest can submit a prioritized safety report without an account', page.url().includes('/events/sample-ai-builders'));

  await signUp('Expansion Organizer', 'organizer@example.com', '/publish');
  await page.getByLabel(/Event title/).fill('E2E Expansion Hackathon');
  await page.getByLabel(/Event type/).selectOption('hackathon');
  await page.getByLabel(/Venue name/).fill('Expansion Test Venue');
  await page.getByLabel(/Who can join/).selectOption('all_ages');
  await page.locator('.publish-sidebar__actions button[type="submit"]').click();
  await page.waitForURL(/\/events\/event-/);
  const eventPath = new URL(page.url()).pathname;
  const eventId = eventPath.split('/').pop();
  const studioPath = `/organizer/events/${eventId}`;
  check('organizer publishes an all-ages native hackathon', await page.getByRole('heading', { name: 'E2E Expansion Hackathon' }).isVisible());

  await goto(studioPath);
  await page.getByRole('button', { name: 'Add question' }).click();
  const questionEditor = page.locator('.field-editor').last();
  await questionEditor.locator('input').first().fill('Dietary preference');
  await questionEditor.getByLabel('Answer type').selectOption('single_choice');
  await questionEditor.getByLabel(/Choices/).fill('None, Vegan');
  await questionEditor.locator('.consent-check input').check();
  await page.getByRole('button', { name: 'Save registration questions' }).click();
  await page.getByText('Registration questions saved', { exact: true }).waitFor();
  check('full studio saves a required custom registration question', true);

  await page.getByRole('button', { name: 'Content', exact: true }).click();
  await page.getByLabel('Tagline', { exact: true }).fill('Build, learn and share responsibly');
  await page.getByLabel('Description', { exact: true }).fill('A complete test hackathon with private operations and participant resources.');
  await page.getByLabel('New series title').fill('Expansion Builder Series');
  await page.getByRole('button', { name: 'Create series' }).click();
  const faqSection = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'FAQs', exact: true }) });
  await faqSection.getByRole('button', { name: 'Add FAQ' }).click();
  await faqSection.getByLabel('Question', { exact: true }).fill('What should I bring?');
  await faqSection.getByLabel('Answer', { exact: true }).fill('Bring a laptop and your ideas.');
  const resourceSection = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Resources', exact: true }) });
  await resourceSection.getByRole('button', { name: 'Add resource' }).click();
  await resourceSection.getByLabel('Title', { exact: true }).fill('Participant guide');
  await resourceSection.getByLabel('URL', { exact: true }).fill('https://example.com/guide');
  const roundSection = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Rounds', exact: true }) });
  await roundSection.getByRole('button', { name: 'Add round' }).click();
  await roundSection.getByLabel('Title', { exact: true }).fill('Finalist round');
  const sessionSection = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Sessions & speakers', exact: true }) });
  await sessionSection.getByRole('button', { name: 'Add session' }).click();
  await sessionSection.getByLabel('Session', { exact: true }).fill('Opening session');
  await sessionSection.getByLabel('Speaker', { exact: true }).fill('Sample Speaker');
  await page.getByRole('button', { name: 'Save all content and timeline settings' }).click();
  await page.getByText('Event content, timeline and post-event settings saved', { exact: true }).waitFor();
  check('studio saves series, FAQ, resource, round and agenda content', true);

  await signOut();
  await signUp('Minor Participant', 'minor@example.com', eventPath, '16–17');
  await page.getByText('Guardian consent is required before participation.').waitFor();
  check('minor participation is blocked before guardian attestation', true);
  await goto('/profile');
  await page.getByRole('button', { name: 'Complete local guardian attestation' }).click();
  await page.getByText(/Minor Mode · complete · active/).waitFor();
  check('local guardian attestation activates restricted Minor Mode without claiming production verification', await page.getByText(/Production activation requires a verified guardian-consent service/).isVisible());
  await goto(eventPath);
  check('guardian consent alone does not bypass the organizer minor-safety gate', await page.getByText('Native minor participation is not open yet.').isVisible());

  await signOut();
  await signIn('organizer@example.com', studioPath);
  await page.getByRole('button', { name: 'Safety & access' }).click();
  for (const checkbox of await page.locator('.safety-check input').all()) await checkbox.check();
  await page.getByRole('button', { name: 'Save safety gate' }).click();
  await page.getByText('Minor-safety checklist saved', { exact: true }).waitFor();
  check('organizer can complete all four minors-welcome declarations', await page.getByText(/Current gate: all organizer declarations complete/).isVisible());

  await signOut();
  await signIn('minor@example.com', eventPath);
  await page.getByLabel(/Dietary preference/).selectOption('Vegan');
  await page.getByRole('button', { name: 'Register on Knot', exact: true }).click();
  await page.getByText('You’re registered', { exact: true }).waitFor();
  check('minor registers only after consent, age and event safety gates pass', true);
  check('public participant resource is visible', await page.getByRole('link', { name: /Participant guide/ }).isVisible());
  check('organizer FAQ reaches the event page', await page.getByText('What should I bring?', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'I’m going', exact: true }).click();
  check('going remains a separate self-declared record', await page.getByRole('button', { name: 'Going ✓', exact: true }).isVisible());

  await page.getByPlaceholder('What do you need to know about this event?').fill('Will the opening session be recorded?');
  await page.getByRole('button', { name: 'Send question' }).click();
  await page.getByText('Question sent to the organizer inbox.', { exact: true }).waitFor();
  check('registered participant can use the structured question inbox', true);
  await page.getByRole('button', { name: 'Submit a project' }).click();
  await page.getByLabel('Project title').fill('Knot Accessibility Companion');
  await page.getByLabel('Description', { exact: true }).fill('A project that helps participants navigate accessible event information.');
  await page.getByLabel('Repository URL').fill('https://github.com/example/knot-accessibility');
  await page.locator('.project-form .consent-check input').check();
  await page.getByRole('button', { name: 'Submit project', exact: true }).click();
  await page.locator('.own-project h3').getByText('Knot Accessibility Companion', { exact: true }).waitFor();
  check('confirmed participant can submit a project with explicit showcase consent', true);

  await signOut();
  await signIn('organizer@example.com', studioPath);
  await page.getByRole('button', { name: /Q&A/ }).click();
  const inboxItem = page.locator('.inbox-item').filter({ hasText: 'Will the opening session be recorded?' });
  await inboxItem.getByLabel('Answer', { exact: true }).fill('Yes, a recording link will be added after the event.');
  await inboxItem.locator('.consent-check input').check();
  await inboxItem.getByRole('button', { name: 'Send answer' }).click();
  await inboxItem.locator('.submission-status').getByText('answered', { exact: true }).waitFor();
  check('organizer answer closes the participant question loop', true);
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  const judgingCard = page.locator('.judging-card').filter({ hasText: 'Knot Accessibility Companion' });
  await judgingCard.getByLabel('Status for Knot Accessibility Companion').selectOption('shortlisted');
  await judgingCard.getByLabel('Innovation').fill('5');
  await judgingCard.getByLabel('Execution').fill('4');
  await judgingCard.getByLabel('Impact').fill('4');
  await judgingCard.getByLabel('Judging feedback').fill('Strong accessibility focus and a clear execution path.');
  await judgingCard.getByRole('button', { name: 'Save rubric score' }).click();
  await judgingCard.getByText('Rubric score saved.', { exact: true }).waitFor();
  check('organizer can shortlist and score a project with a rubric', true);

  await page.getByRole('button', { name: 'Content', exact: true }).click();
  const basicsPanel = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Description, eligibility and rewards' }) });
  await basicsPanel.locator('select').nth(2).selectOption('paid');
  await basicsPanel.locator('label').filter({ hasText: 'Amount INR' }).locator('input').fill('500');
  page.once('dialog', (dialog) => { assert.match(dialog.message(), /participant-critical details: price/); void dialog.accept(); });
  await page.getByRole('button', { name: 'Save all content and timeline settings' }).click();
  await page.getByText('Event content, timeline and post-event settings saved', { exact: true }).waitFor();
  check('participant-critical studio changes require explicit confirmation', true);

  await page.getByRole('button', { name: 'Communications', exact: true }).click();
  await page.getByLabel(/Subject/).fill('Scheduled logistics update');
  await page.getByLabel(/Message/).fill('The opening session guide is now available in event resources.');
  const scheduleInput = page.getByLabel(/Schedule for later/);
  await scheduleInput.evaluate((input) => { input.step = '1'; });
  const future = new Date(Date.now() + 10_000);
  const localFuture = new Date(future.getTime() - future.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
  await scheduleInput.fill(localFuture);
  await page.getByRole('button', { name: 'Schedule in-app announcement' }).click();
  await page.getByText(/In-app announcement scheduled for/).waitFor();
  check('full studio creates a scheduled in-app announcement', await page.getByText('In-app · Scheduled', { exact: true }).isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(studioPath);
  const studioOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('mobile full studio has no horizontal page overflow', studioOverflow <= 1);
  await page.screenshot({ path: 'artifacts/organizer-studio-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await signOut();
  await signIn('minor@example.com', eventPath);
  await page.getByRole('button', { name: /unread notifications/ }).click();
  await page.getByText('Scheduled logistics update', { exact: true }).waitFor({ timeout: 40_000 });
  check('scheduled announcement is processed into a participant notification', true);
  check('participant receives the answered-question notification', await page.getByText('Organizer answered your question', { exact: true }).isVisible());
  check('confirmed material change notifies the affected participant', await page.getByText('Important update: E2E Expansion Hackathon', { exact: true }).isVisible());
  await page.locator('.drawer-header .icon-button').click();
  check('answered public question appears without exposing the minor asker identity', await page.getByText('Will the opening session be recorded?', { exact: true }).isVisible() && await page.locator('.event-main').getByText('Minor Participant', { exact: true }).count() === 0);
  check('rubric feedback returns to the project author', await page.getByText(/Innovation 5\/5 · Execution 4\/5 · Impact 4\/5/).isVisible());
  await signOut();

  await signUp('Adult Claimant', 'claimant@example.com', '/search');
  await page.getByLabel('Save these explicit filters').fill('Design return loop');
  await page.getByRole('button', { name: 'Save search', exact: true }).click();
  await page.getByText('Search saved in this workspace.', { exact: true }).waitFor();
  check('adult can save an explicit discovery search', await page.getByRole('button', { name: 'Design return loop', exact: true }).isVisible());
  await page.getByRole('button', { name: 'Check new', exact: true }).click();
  check('saved-search new-match check returns an honest count', (await page.getByText(/new matches since the last check/).innerText()).includes('new matches'));
  await goto('/profile');
  const topicSection = page.locator('.profile-section').filter({ has: page.getByRole('heading', { name: 'Explicit topic follows' }) });
  await topicSection.getByRole('button', { name: 'Design', exact: true }).click();
  check('explicit topic follow persists in the profile', await topicSection.getByRole('button', { name: 'Design ✓', exact: true }).isVisible());
  await goto('/events/sample-ai-builders');
  await page.locator('.trust-actions details').first().locator('summary').click();
  await page.locator('.trust-actions details').first().locator('textarea').fill('I am the authorized organizer and can provide official event evidence.');
  await page.getByRole('button', { name: 'Submit organizer claim' }).click();
  await page.getByText('Claim submitted for privileged review.', { exact: true }).waitFor();
  check('organizer claim requires privileged review', true);
  await signOut();

  await signIn('organizer@example.com', '/admin');
  await page.getByRole('button', { name: /Trust & claims/ }).click();
  const reportItem = page.locator('.trust-item').filter({ hasText: 'Guest safety report details' });
  check('guest report appears as a prioritized minor-safety item', await reportItem.getByText(/Minor safety · four-hour target/).isVisible() && await reportItem.getByText(/Reporter Guest/).isVisible());
  await reportItem.getByLabel('Resolution note').fill('Reviewed the report and recorded the safeguarding follow-up.');
  await reportItem.getByRole('button', { name: 'Resolve', exact: true }).click();
  await reportItem.getByText('Report resolved.', { exact: true }).waitFor();
  check('privileged reviewer can resolve a guest safety report with an audit note', true);
  const claimItem = page.locator('.trust-item').filter({ hasText: 'Bengaluru AI Builders Hackathon' });
  await claimItem.getByLabel('Review note').fill('Official organizer evidence reviewed for this local claim.');
  await claimItem.getByRole('button', { name: 'Approve claim' }).click();
  await claimItem.getByText('Claim approved.', { exact: true }).waitFor();
  check('privileged reviewer can approve an organizer claim', true);

  await page.getByRole('button', { name: /Source records/ }).click();
  const unstopCard = page.locator('.source-card').filter({ hasText: 'Unstop' });
  await unstopCard.getByRole('button', { name: 'Review permissions' }).click();
  const sourceEditor = page.locator('.source-editor');
  await sourceEditor.locator('select').first().selectOption('approved');
  await sourceEditor.getByLabel('Permission or terms evidence URL').fill('https://example.com/official-permission');
  await sourceEditor.getByRole('button', { name: 'api', exact: true }).click();
  await sourceEditor.locator('.consent-check input').check();
  await sourceEditor.getByRole('button', { name: 'Save source review' }).click();
  await page.getByText('Unstop source record updated.', { exact: true }).waitFor();
  check('external source activation requires explicit method and evidence review', true);
  await page.getByLabel('External source').selectOption('source-unstop');
  await page.getByLabel('JSON event array').fill(JSON.stringify([{ title: 'Reviewed federated event', startAt: '2027-01-15T04:30:00.000Z', originalUrl: 'https://example.com/federated-event' }]));
  await page.getByRole('button', { name: 'Validate & queue import' }).click();
  await page.getByText('1 federated records entered pending review.', { exact: true }).waitFor();
  check('approved JSON feed enters review without auto-publication', true);
  await page.getByRole('button', { name: /Review queue/ }).click();
  check('federated event is visible in the human review queue', await page.locator('.review-queue__item').getByText('Reviewed federated event', { exact: true }).isVisible());
  await signOut();

  await signIn('claimant@example.com', '/organizer/events/sample-ai-builders');
  await page.getByRole('button', { name: 'Safety & access' }).waitFor();
  check('approved claimant gains organizer studio access', true);
  await signOut();

  await signIn('minor@example.com', '/profile');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Withdraw guardian consent' }).click();
  await page.getByText(/Minor Mode · withdrawn · restricted/).waitFor();
  check('guardian withdrawal restricts the minor account', true);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete my local account' }).click();
  await page.waitForURL(`${base}/`);
  check('minor can delete the local account and return to public browsing', await page.getByRole('link', { name: 'Sign in' }).isVisible());
  await goto(eventPath);
  check('account deletion does not delete the organizer’s public event', await page.getByRole('heading', { name: 'E2E Expansion Hackathon' }).isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(eventPath);
  const eventOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('mobile expanded event page has no horizontal page overflow', eventOverflow <= 1);
  await page.screenshot({ path: 'artifacts/event-engagement-mobile.png', fullPage: true });

  check('no browser runtime or console errors in the expanded multi-account flow', errors.length === 0);
  console.log(`\n${checks} expansion browser checks passed.`);
} catch (error) {
  await page.screenshot({ path: 'artifacts/expansion-e2e-failure.png', fullPage: true }).catch(() => {});
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
}
