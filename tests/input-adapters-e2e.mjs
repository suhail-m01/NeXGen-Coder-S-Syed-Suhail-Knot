import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
context.setDefaultTimeout(30_000);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
let checks = 0;
const check = (name, condition = true) => { assert.ok(condition, name); checks += 1; console.log(`✓ ${name}`); };

try {
  await page.route('https://public.example/event', (route) => route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' },
    body: `<!doctype html><html><head><meta property="og:title" content="Public URL AI Meetup"><script type="application/ld+json">${JSON.stringify({ '@type': 'Event', name: 'Public URL AI Meetup', startDate: '2026-12-14T18:00:00+05:30', description: 'A public community event imported for review.', location: { name: 'Public Community Hall, Indiranagar' }, offers: { url: 'https://public.example/register' } })}</script></head><body><main><h1>Public URL AI Meetup</h1><p>Free for everyone. Register at https://public.example/register</p></main></body></html>`,
  }));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}/auth?returnTo=%2Fadd&action=add%20an%20event`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '18 and over', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Input Adapter Tester');
  await page.getByLabel('Email address').fill('adapters@example.com');
  await page.getByLabel('Password', { exact: true }).fill('TestPass!234');
  await page.locator('form .consent-check input').check();
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${base}/add`);
  await page.locator('.paste-panel').waitFor();

  await page.getByLabel(/Public event URL/).fill('https://public.example/event');
  await page.getByRole('button', { name: 'Fetch text' }).click();
  await page.waitForFunction(() => document.querySelector('.paste-panel > textarea')?.value.includes('Public URL AI Meetup'));
  const urlEvidence = await page.locator('.paste-panel > textarea').inputValue();
  check('public URL import reads permitted HTML and JSON-LD into private evidence', urlEvidence.includes('Title: Public URL AI Meetup') && urlEvidence.includes('Start: 2026-12-14T18:00:00+05:30'));
  await page.getByRole('button', { name: /Read and create draft/ }).click();
  await page.locator('.draft-review').waitFor();
  check('public URL evidence creates a reviewable extraction draft', (await page.getByLabel(/Event title/).inputValue()).includes('Public URL AI Meetup'));
  check('URL draft remains private until human review', await page.getByText('Private source evidence', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'Start over' }).click();
  await page.locator('.paste-panel > textarea').fill('');

  const posterData = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1400; canvas.height = 760;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#111111'; context.textBaseline = 'top';
    context.font = 'bold 62px Arial'; context.fillText('Bengaluru AI Hackathon', 70, 65);
    context.font = '46px Arial';
    const lines = ['Date: 14/11/2026', 'Time: 6 PM onwards', 'Venue: Community Hall, Koramangala', 'Free for everyone', 'Register: https://example.com/ai-hackathon'];
    lines.forEach((line, index) => context.fillText(line, 70, 190 + index * 100));
    return canvas.toDataURL('image/png');
  });
  await page.locator('input[type="file"]').setInputFiles({ name: 'event-poster.png', mimeType: 'image/png', buffer: Buffer.from(posterData.split(',')[1], 'base64') });
  await page.waitForFunction(() => document.querySelector('.paste-panel > textarea')?.value.toLowerCase().includes('hackathon'), null, { timeout: 120_000 });
  const ocrEvidence = await page.locator('.paste-panel > textarea').inputValue();
  check('real local OCR extracts poster text without a remote recognition service', /bengaluru/i.test(ocrEvidence) && /14\/11\/2026/.test(ocrEvidence) && /example\.com/i.test(ocrEvidence));
  check('OCR completion asks for human field and contact review', await page.getByText(/Local English OCR completed/).isVisible());
  await page.getByRole('button', { name: /Read and create draft/ }).click();
  await page.locator('.draft-review').waitFor();
  check('OCR evidence enters the same private human-review draft flow', await page.locator('.evidence-panel pre').getByText(/Bengaluru/i).isVisible());
  check('OCR extraction does not auto-publish an event', await page.getByRole('button', { name: /Submit for human review/ }).isVisible());

  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByLabel(/Public event URL/).fill('http://127.0.0.1/private-event');
  await page.getByRole('button', { name: 'Fetch text' }).click();
  await page.getByText(/Local-network and private-host URLs are not accepted/).waitFor();
  check('private-network URL targets are rejected before fetching', true);
  check('no unexpected browser runtime or console errors in URL/OCR flows', errors.length === 0);
  console.log(`\n${checks} Instant Add adapter checks passed.`);
} catch (error) {
  await page.screenshot({ path: 'artifacts/input-adapters-failure.png', fullPage: true }).catch(() => {});
  console.error('Browser errors:', errors);
  throw error;
} finally { await browser.close(); }
