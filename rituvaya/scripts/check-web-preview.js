// Serves dist/ under a sub-path and checks the relocatable build boots there.
// Usage: node scripts/check-web-preview.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const PREFIX = '/preview/abc123';
const PORT = 8082;
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (!url.startsWith(PREFIX)) {
    res.writeHead(404);
    res.end('outside prefix: ' + url);
    return;
  }
  let rel = url.slice(PREFIX.length);
  if (rel === '' || rel === '/') rel = '/index.html';
  const file = path.join(dist, rel);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('missing ' + rel);
    return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

async function main() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  for (const variant of [`${PREFIX}`, `${PREFIX}/`, `${PREFIX}/index.html`]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    const missing = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    page.on('response', (r) => r.status() >= 400 && missing.push(`${r.status()} ${r.url()}`));
    await page.goto(`http://localhost:${PORT}${variant}`, { waitUntil: 'networkidle', timeout: 120000 });
    const ok = await page.getByText('Choose your language').first().isVisible({ timeout: 30000 }).catch(() => false);
    let navigated = false;
    if (ok) {
      await page.getByRole('button', { name: 'Next' }).first().click();
      navigated = await page.getByText('What should we call you?').first().isVisible({ timeout: 10000 }).catch(() => false);
    }
    console.log(`${variant}: boot=${ok} navigate=${navigated} url=${page.url()} errors=${errors.length} missing=${missing.length}`);
    errors.slice(0, 5).forEach((e) => console.log('   err:', e));
    missing.slice(0, 5).forEach((m) => console.log('   missing:', m));
    await page.close();
  }
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
