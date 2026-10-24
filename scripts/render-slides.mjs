import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(resolve('deliverables/Knot_Product_Source.html')).href, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.pdf({
  path: 'deliverables/Knot_Product.pdf',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await browser.close();
console.log('Rendered deliverables/Knot_Product.pdf');
