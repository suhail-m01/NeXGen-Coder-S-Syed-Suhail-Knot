import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';
await mkdir('artifacts/demo-video', { recursive: true });
await mkdir('deliverables', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: 'artifacts/demo-video', size: { width: 1280, height: 720 } },
});
context.setDefaultTimeout(25_000);
const page = await context.newPage();
let captionTitle = 'Knot';
let captionSubtitle = 'Discovery → participation → community';
let captionIndex = 1;

async function paintCaption() {
  await page.evaluate(({ title, subtitle, index }) => {
    let caption = document.getElementById('knot-demo-caption');
    if (!caption) {
      caption = document.createElement('div');
      caption.id = 'knot-demo-caption';
      caption.setAttribute('aria-hidden', 'true');
      document.body.appendChild(caption);
    }
    caption.style.cssText = 'position:fixed;z-index:99999;left:24px;right:24px;bottom:20px;pointer-events:none;background:linear-gradient(120deg,rgba(24,15,48,.96),rgba(54,35,89,.96));color:white;border:1px solid rgba(255,255,255,.2);border-radius:18px;padding:16px 22px;box-shadow:0 16px 50px rgba(20,10,40,.35);font-family:Inter,Arial,sans-serif;display:flex;align-items:center;gap:18px;';
    caption.innerHTML = `<span style="display:grid;place-items:center;min-width:40px;height:40px;border-radius:12px;background:#ff8b68;color:#211332;font-weight:900">${String(index).padStart(2, '0')}</span><div><div style="font-size:21px;line-height:1.2;font-weight:850;letter-spacing:-.02em">${title}</div><div style="font-size:13px;line-height:1.45;margin-top:4px;color:#ded5ef">${subtitle}</div></div><span style="margin-left:auto;font-size:12px;color:#ffab8f;font-weight:800;white-space:nowrap">KNOT • PRODUCT TOUR</span>`;
  }, { title: captionTitle, subtitle: captionSubtitle, index: captionIndex });
}

async function caption(index, title, subtitle) {
  captionIndex = index; captionTitle = title; captionSubtitle = subtitle;
  await paintCaption();
}
async function goto(path) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  await paintCaption();
}
async function signUp(name, email, returnTo, ageBand = '18 and over') {
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
  await paintCaption();
}
async function signIn(email, returnTo) {
  await goto(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('TestPass!234');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${base}${returnTo}`);
  await page.waitForLoadState('networkidle');
  await paintCaption();
}
async function signOut() {
  await goto('/profile');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL(`${base}/`);
  await paintCaption();
}
async function section(index, seconds, title, subtitle, action) {
  const started = Date.now();
  await caption(index, title, subtitle);
  await action();
  const remaining = seconds * 1000 - (Date.now() - started);
  if (remaining > 0) await page.waitForTimeout(remaining);
}

try {
  await section(1, 10, 'Discover without a login wall', 'Locality, interests, skills, price, age and source context—public by default.', async () => {
    await goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await paintCaption();
    await goto('/search');
    await page.locator('.filter-grid label').filter({ hasText: 'Interest' }).locator('select').selectOption({ label: 'Design' });
  });

  await section(2, 10, 'Every event keeps its source and confidence', 'Sample data is labelled. Unknown details stay unknown; external clicks are not registrations.', async () => {
    await goto('/events/sample-ai-builders');
    await page.getByRole('heading', { name: 'Source & freshness' }).scrollIntoViewIfNeeded();
  });

  let eventPath;
  let studioPath;
  await section(3, 15, 'Publish a real participation flow', 'Quick Post creates a native event with explicit age, registration and capacity rules.', async () => {
    await signUp('Demo Organizer', 'organizer@example.com', '/publish');
    await page.getByLabel(/Event title/).fill('Knot Demo Hackathon');
    await page.getByLabel(/Event type/).selectOption('hackathon');
    await page.getByLabel(/Venue name/).fill('Knot Demo Venue');
    await page.getByLabel(/Who can join/).selectOption('all_ages');
    await page.locator('.publish-sidebar__actions button[type="submit"]').click();
    await page.waitForURL(/\/events\/event-/);
    eventPath = new URL(page.url()).pathname;
    studioPath = `/organizer/events/${eventPath.split('/').pop()}`;
    await paintCaption();
  });

  await section(4, 15, 'One studio for the full event lifecycle', 'Custom questions, minor-safety declarations, resources, rounds, judging and communication.', async () => {
    await goto(studioPath);
    await page.getByRole('button', { name: 'Add question' }).click();
    const editor = page.locator('.field-editor').last();
    await editor.locator('input').first().fill('Dietary preference');
    await editor.locator('.consent-check input').check();
    await page.getByRole('button', { name: 'Save registration questions' }).click();
    await page.getByText('Registration questions saved', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Safety & access' }).click();
    for (const checkbox of await page.locator('.safety-check input').all()) await checkbox.check();
    await page.getByRole('button', { name: 'Save safety gate' }).click();
    await page.getByText('Minor-safety checklist saved', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Content', exact: true }).click();
    const faq = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'FAQs', exact: true }) });
    await faq.getByRole('button', { name: 'Add FAQ' }).click();
    await faq.getByLabel('Question', { exact: true }).fill('Who can participate?');
    await faq.getByLabel('Answer', { exact: true }).fill('Eligible participants with the required consent and registration.');
    await page.getByRole('button', { name: 'Save all content and timeline settings' }).click();
    await page.getByText('Event content, timeline and post-event settings saved', { exact: true }).waitFor();
  });

  await section(5, 20, 'Minor Mode is restrictive by design', 'Guardian attestation + age eligibility + organizer safety checklist. No behavioural learning.', async () => {
    await signOut();
    await signUp('Demo Participant', 'minor@example.com', eventPath, '16–17');
    await goto('/profile');
    await page.getByRole('button', { name: 'Complete local guardian attestation' }).click();
    await page.getByText(/Minor Mode · complete · active/).waitFor();
    await goto(eventPath);
    await page.getByLabel(/Dietary preference/).fill('Vegan');
    await page.getByRole('button', { name: 'Register on Knot', exact: true }).click();
    await page.getByText('You’re registered', { exact: true }).waitFor();
  });

  await section(6, 15, 'Participation continues beyond registration', 'Private operational answers, attendee Q&A and project submission with independent showcase consent.', async () => {
    await page.getByPlaceholder('What do you need to know about this event?').fill('Where can we find the participant guide?');
    await page.getByRole('button', { name: 'Send question' }).click();
    await page.getByText('Question sent to the organizer inbox.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Submit a project' }).click();
    await page.getByLabel('Project title').fill('Knot Community Companion');
    await page.getByLabel('Description', { exact: true }).fill('A demo project connecting accessible event information and community return.');
    await page.getByLabel('Repository URL').fill('https://github.com/example/knot-demo');
    await page.getByRole('button', { name: 'Submit project', exact: true }).click();
    await page.locator('.own-project h3').waitFor();
  });

  await section(7, 17, 'Organizers close the loop', 'Answer questions, score projects, share referral links and send honest in-app updates.', async () => {
    await signOut();
    await signIn('organizer@example.com', studioPath);
    await page.getByRole('button', { name: /Q&A/ }).click();
    const inbox = page.locator('.inbox-item').first();
    await inbox.getByLabel('Answer', { exact: true }).fill('The guide is available in event resources.');
    await inbox.getByRole('button', { name: 'Send answer' }).click();
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    const judging = page.locator('.judging-card').first();
    await judging.getByLabel('Innovation').fill('5');
    await judging.getByLabel('Execution').fill('4');
    await judging.getByLabel('Impact').fill('5');
    await judging.getByLabel('Judging feedback').fill('Clear community value and an accessible participation path.');
    await judging.getByRole('button', { name: 'Save rubric score' }).click();
    await page.getByRole('button', { name: 'Communications', exact: true }).click();
    await page.getByLabel(/Subject/).fill('Welcome, participants');
    await page.getByLabel(/Message/).fill('Your participant guide and project resources are ready.');
    await page.getByRole('button', { name: 'Send in-app announcement' }).click();
    await page.getByText(/In-app announcement sent to/).waitFor();
    await page.getByRole('button', { name: 'Growth', exact: true }).click();
    await page.getByLabel('New channel label').fill('Demo community newsletter');
    await page.getByRole('button', { name: 'Create channel' }).click();
    await page.locator('.referral-qr').waitFor();
    await page.locator('.referral-qr').scrollIntoViewIfNeeded();
  });

  await section(8, 10, 'Participants return to one honest plan', 'Answers, organizer updates, registration state, deadlines and attendance history stay connected.', async () => {
    await signOut();
    await signIn('minor@example.com', eventPath);
    await page.getByRole('button', { name: /unread notifications/ }).click();
    await page.getByText('Welcome, participants', { exact: true }).waitFor();
    await page.locator('.drawer-header .icon-button').click();
    await goto('/plan');
  });

  await section(9, 8, 'Discovery → participation → community', '53 domain tests • 165 Chromium checks • referrals, media, series, teams and privacy-safe return cohorts.', async () => {
    await signOut();
    await goto('/search?view=map');
    await page.getByRole('button', { name: 'Search this area', exact: true }).click();
  });
} catch (error) {
  await page.screenshot({ path: 'artifacts/demo-failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  const video = page.video();
  await context.close();
  if (video) await video.saveAs('artifacts/knot-demo-raw.webm');
  await browser.close();
}
console.log('Recorded artifacts/knot-demo-raw.webm');
