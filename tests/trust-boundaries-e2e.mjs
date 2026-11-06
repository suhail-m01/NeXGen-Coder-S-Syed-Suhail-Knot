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

async function signUpMinor(name, email, returnTo) {
  await goto(`/auth?returnTo=${encodeURIComponent(returnTo)}&action=continue`);
  await page.getByRole('button', { name: '16–17', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Guardian email').fill('guardian@example.com');
  await page.getByLabel('Password', { exact: true }).fill('TestPass!234');
  await page.locator('form .consent-check input').check();
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${base}${returnTo}`);
  await page.waitForLoadState('networkidle');
}

try {
  await goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle' });

  check('agent panel reports configuration instead of simulating a scan', await page.getByText('HACKATHON AGENT STATUS', { exact: true }).isVisible() && await page.getByText('Agent status is not configured here', { exact: true }).first().isVisible());
  check('agent panel has no fake scan, latency, or verification claims', await page.getByRole('button', { name: 'Scan Portals Now' }).count() === 0 && await page.getByText('100% Verified', { exact: true }).count() === 0 && await page.getByText('0s SYNC LATENCY', { exact: true }).count() === 0);

  await goto('/hackathons');
  await page.locator('.hackathon-card').first().waitFor();
  check('hackathon cards do not offer a native Squad Apply action', await page.getByRole('link', { name: 'Squad Apply', exact: true }).count() === 0 && await page.getByRole('link', { name: 'View details', exact: true }).first().isVisible());
  check('guest outbound handoff is labelled Interested rather than registration', await page.getByRole('link', { name: /Interested.*official site/i }).first().isVisible() && await page.getByRole('link', { name: /Register on official site/i }).count() === 0);

  await goto('/events/unstop-nits-hacks-9');
  check('external event exposes visible sample disclosure', await page.getByText('Sample event — not a verified live listing', { exact: true }).isVisible());
  check('external event has no native Squad Apply action', await page.locator('.unstop-register-btn').count() === 0 && await page.getByRole('button', { name: 'Register Now (Solo / Team)' }).count() === 0);
  check('external event retains an external participation path', await page.locator('.participation-card').getByRole('button', { name: 'Sign in to register', exact: true }).isVisible());

  await goto('/events/unstop-nits-hacks-9?teamCode=TEAM-EXTERNAL');
  check('external team-code link cannot open native registration/ticket modal', await page.locator('.unstop-modal').count() === 0 && await page.getByText('View Ticket & Team Dashboard', { exact: true }).count() === 0);

  await signUpMinor('Minor Privacy Check', 'minor-privacy@example.com', '/events/sample-ai-builders');
  await page.locator('.team-synergy-matrix').waitFor();
  check('minor name is not injected into public team planning view', await page.locator('.event-main').getByText('Minor Privacy Check', { exact: true }).count() === 0);
  check('team planner starts at transparent zero role coverage', await page.locator('.synergy-badge').isVisible() && await page.locator('.synergy-percentage').textContent() === '0%');
  await page.locator('.synergy-slot-card').first().getByRole('button', { name: 'Claim', exact: true }).click();
  check('claiming a local planning role uses an anonymous local label', await page.getByText('You (local draft)', { exact: true }).isVisible() && await page.locator('.event-main').getByText('Minor Privacy Check', { exact: true }).count() === 0);
  check('local planner does not display fictional real-looking teammates', await page.getByText('Aarav Patel', { exact: true }).count() === 0 && await page.getByText('Suhail Syed', { exact: true }).count() === 0);
  check('commute tool discloses browser-only scope', await page.getByText('Browser-only storage:', { exact: true }).isVisible());
  check('commute samples contain no legacy real-looking hosts', await page.getByText('Rohit K.', { exact: true }).count() === 0 && await page.getByText('Priya Verma', { exact: true }).count() === 0 && await page.getByText('Vikram Joshi', { exact: true }).count() === 0);

  check('no uncaught browser exceptions', errors.length === 0);
  console.log(`\n${checks} trust-boundary browser checks passed.`);
} finally {
  await browser.close();
}
