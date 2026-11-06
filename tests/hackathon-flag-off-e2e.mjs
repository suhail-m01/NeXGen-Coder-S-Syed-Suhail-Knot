import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5176';
const browser = await chromium.launch({ headless: true });
let checks = 0;
const check = (name, condition) => {
  assert.ok(condition, name);
  checks += 1;
  console.log(`✓ ${name}`);
};

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const apiRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('/api/hackathons')) apiRequests.push(request.url());
  });

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  check('flag-off home keeps public discovery', (await page.locator('h1').innerText()).includes('Find events'));
  check('flag-off home removes agent and Hackathon home surfaces', await page.getByText('HACKATHON AGENT STATUS', { exact: true }).count() === 0 && await page.getByRole('heading', { name: 'Hackathons near you' }).count() === 0);
  check('flag-off desktop navigation has no Hackathons destination', await page.locator('.desktop-nav').getByRole('link', { name: 'Hackathons', exact: true }).count() === 0);
  check('flag-off home makes no Hackathon API requests', apiRequests.length === 0);
  check('ordinary event cards remain available', await page.locator('.event-card').count() > 0);

  await page.goto(`${base}/hackathons`, { waitUntil: 'networkidle' });
  check('flag-off direct Hackathon route is not mounted', await page.locator('.hackathons-page').count() === 0 && await page.getByRole('heading', { name: 'This page isn’t on the map.' }).isVisible());
  check('flag-off smoke has no browser errors', errors.length === 0);
  console.log(`\n${checks} flag-off browser checks passed.`);
} finally {
  await browser.close();
}
