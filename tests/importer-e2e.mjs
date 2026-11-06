import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(20_000);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let checks = 0;
const check = (name, condition = true) => { assert.ok(condition, name); checks += 1; console.log(`✓ ${name}`); };
const goto = async (path) => page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
const readData = () => page.evaluate(() => JSON.parse(localStorage.getItem('knot.product.data.v1')));

async function signUpAdult() {
  await goto('/auth?returnTo=%2Fsearch&action=continue');
  await page.getByRole('button', { name: '18 and over', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Importer Adult');
  await page.getByLabel('Email address').fill('importer-adult@example.com');
  await page.getByLabel('Password', { exact: true }).fill('TestPass!234');
  await page.locator('form .consent-check input').check();
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${base}/search`);
  await page.waitForLoadState('networkidle');
}

try {
  await goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await signUpAdult();
  await page.getByRole('button', { name: 'Open WhatsApp & Poster Importer' }).click();
  const modal = page.locator('.whatsapp-importer-modal');
  await modal.waitFor();
  check('importer is explicitly rule-based and review-gated', await modal.getByText('Rule-based draft importer', { exact: true }).isVisible() && await modal.getByRole('button', { name: 'Submit for human review' }).isVisible());

  const onlineText = 'Online AI Workshop\nDate: 14/11/2026\nTime: 10:00 AM\nMode: Online via Zoom';
  await modal.locator('textarea').fill(onlineText);
  await modal.getByRole('button', { name: 'Submit for human review' }).click();
  check('online draft without registration/joining link is blocked', await modal.getByText('An online event requires a registration or joining link.', { exact: true }).isVisible());
  check('blocked online draft creates no submission', ((await readData())?.submissions ?? []).length === 0);

  const raw = 'Vecnaverse Review Hackathon\nDate: 28/11/2026 to 29/11/2026\nTime: 9:00 AM IST\nVenue: Community Innovation Hub, Koramangala 5th Block, Bengaluru\nPrize Pool: ₹1,50,000 + Swags\nRegister: https://unstop.com/';
  await modal.locator('textarea').fill(raw);
  await page.waitForFunction(() => document.querySelector('.whatsapp-importer-modal input[type="datetime-local"]')?.value === '2026-11-28T09:00');
  check('supplied date is extracted instead of retaining a default', await modal.locator('input[type="datetime-local"]').inputValue() === '2026-11-28T09:00');
  check('full source venue is preserved', (await modal.getByLabel('Venue Name & Landmark').inputValue()).includes('Community Innovation Hub, Koramangala 5th Block'));
  check('prize pool does not become free or paid ticket evidence', await modal.getByLabel('Price Evidence').inputValue() === 'unknown');
  check('locality is inferred from evidence', await modal.getByLabel('Locality / Area').inputValue() === 'koramangala');

  await modal.getByRole('button', { name: 'Submit for human review' }).click();
  await modal.getByText(/is pending human review/).waitFor();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('knot.product.data.v1'))?.submissions?.[0]?.status === 'pending_review');
  const data = await readData();
  const submission = data.submissions[0];
  check('submission is pending review with confirmed structured fields', submission.status === 'pending_review' && submission.draft.startDatetime.value.startsWith('2026-11-28') && submission.draft.venueName.value.includes('Community Innovation Hub') && submission.draft.localityId.value === 'koramangala');
  check('submission preserves unknown price and private raw evidence', submission.draft.price.value.kind === 'unknown' && submission.rawText.includes('Prize Pool'));
  check('no public event or native registration is created', !data.events.some((event) => event.title === 'Vecnaverse Review Hackathon') && !data.registrations.some((registration) => registration.eventId === submission.canonicalEventId));
  check('no uncaught browser exceptions', errors.length === 0);
  console.log(`\n${checks} conservative-importer browser checks passed.`);
} finally {
  await browser.close();
}
