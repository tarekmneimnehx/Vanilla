// Renders the app mark (an original abstract botanical orb) into every PNG the
// project needs, using headless Chromium via Playwright.
// Run: node scripts/generate-icons.js
const path = require('path');
const fs = require('fs');

const JADE = '#286653';
const CREAM = '#F7F5EF';

function mark(fill, opacity = 1) {
  return `
    <g transform="translate(512 512)" opacity="${opacity}">
      <path d="M -70 -300 C 150 -300 300 -140 300 60 C 300 230 170 320 0 320 C -170 320 -300 210 -300 40 C -300 -130 -240 -300 -70 -300 Z" fill="${fill}"/>
      <path d="M 30 -140 C 130 -120 215 -30 200 120 C 110 135 20 90 -5 -5 C -15 -60 0 -125 30 -140 Z" fill="${fill === CREAM ? JADE : CREAM}" opacity="0.92"/>
      <circle cx="-120" cy="150" r="46" fill="${fill === CREAM ? JADE : CREAM}" opacity="0.55"/>
    </g>`;
}

const svgs = {
  'icon.png': { size: 1024, svg: `<rect width="1024" height="1024" fill="${JADE}"/><circle cx="512" cy="512" r="410" fill="${CREAM}" opacity="0.10"/>${mark(CREAM)}` },
  'android-icon-foreground.png': { size: 1024, svg: `<g transform="translate(512 512) scale(0.62) translate(-512 -512)">${mark(CREAM)}</g>` },
  'android-icon-background.png': { size: 1024, svg: `<rect width="1024" height="1024" fill="${JADE}"/>` },
  'android-icon-monochrome.png': { size: 1024, svg: `<g transform="translate(512 512) scale(0.62) translate(-512 -512)"><g transform="translate(512 512)"><path d="M -70 -300 C 150 -300 300 -140 300 60 C 300 230 170 320 0 320 C -170 320 -300 210 -300 40 C -300 -130 -240 -300 -70 -300 Z" fill="#FFFFFF"/></g></g>` },
  'splash-icon.png': { size: 512, svg: `<g transform="scale(0.5)">${mark(JADE)}</g>` },
  'notification-icon.png': { size: 96, svg: `<g transform="scale(0.09375)"><g transform="translate(512 512)"><path d="M -70 -300 C 150 -300 300 -140 300 60 C 300 230 170 320 0 320 C -170 320 -300 210 -300 40 C -300 -130 -240 -300 -70 -300 Z" fill="#FFFFFF"/><path d="M 30 -140 C 130 -120 215 -30 200 120 C 110 135 20 90 -5 -5 C -15 -60 0 -125 30 -140 Z" fill="#000000" opacity="1"/></g></g>` },
  'favicon.png': { size: 64, svg: `<rect width="1024" height="1024" rx="220" fill="${JADE}" transform="scale(0.0625)"/><g transform="scale(0.0625)">${mark(CREAM)}</g>` },
};

async function main() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const outDir = path.join(__dirname, '..', 'assets');
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, spec] of Object.entries(svgs)) {
    const size = spec.size;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${spec.svg}</svg>`;
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await page.screenshot({ path: path.join(outDir, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('Wrote', name);
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
