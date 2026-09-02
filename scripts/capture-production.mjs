import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import worker from '../dist/server/index.js';

const root = process.cwd();
const screenshots = join(root, 'docs', 'screenshots');
await mkdir(screenshots, { recursive: true });

const mime = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const browser = await chromium.launch({
  headless: true,
  executablePath:
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const errors = [];

async function render(viewport, name, interact) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${name}: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  await page.route('http://hyperrisk.local/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') {
      const response = await worker.fetch(
        new Request(route.request().url()),
        {},
        {
          waitUntil() {},
          passThroughOnException() {},
        },
      );
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: Buffer.from(await response.arrayBuffer()),
      });
      return;
    }
    try {
      const body = await readFile(join(root, 'dist', 'client', url.pathname));
      await route.fulfill({
        status: 200,
        contentType: mime[extname(url.pathname)] ?? 'application/octet-stream',
        body,
      });
    } catch {
      await route.fulfill({ status: 404, body: 'Not found' });
    }
  });
  await page.goto('http://hyperrisk.local/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  if (interact) await interact(page);
  await page.screenshot({
    path: join(screenshots, `${name}.png`),
    fullPage: true,
  });
  const report = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    horizontalOverflow:
      document.documentElement.scrollWidth > window.innerWidth,
    heading: document.querySelector('h1')?.textContent,
    bodyTextLength: document.body.innerText.length,
  }));
  await context.close();
  return report;
}

const desktop = await render({ width: 1440, height: 1000 }, 'overview-desktop');
const stress = await render(
  { width: 1440, height: 900 },
  'stress-desktop',
  async (page) => {
    await page.getByRole('button', { name: 'Stress test' }).click();
    await page.getByRole('button', { name: 'Crypto crash' }).click();
    await page.waitForTimeout(100);
  },
);
const mobile = await render({ width: 390, height: 844 }, 'overview-mobile');
await browser.close();

console.log(JSON.stringify({ desktop, stress, mobile, errors }, null, 2));
if (
  errors.length ||
  desktop.horizontalOverflow ||
  stress.horizontalOverflow ||
  mobile.horizontalOverflow
)
  process.exitCode = 1;
