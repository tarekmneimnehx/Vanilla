// Debug helper: reports which element intercepts clicks on a given text in the web preview.
const BASE = process.argv[2] || 'http://localhost:8081';
const TEXT = process.argv[3] || 'Vitamin D3 (Demo)';

async function main() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 240000 });
  await page.getByText('My Routine', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  const target = page.getByText(TEXT).first();
  const box = await target.boundingBox();
  console.log('box', box);
  const info = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    const chain = [];
    let node = el;
    while (node && chain.length < 12) {
      const cs = getComputedStyle(node);
      chain.push(`${node.tagName}.${(node.className || '').toString().slice(0, 60)} pe=${cs.pointerEvents} pos=${cs.position} z=${cs.zIndex} text=${(node.textContent || '').slice(0, 30).replace(/\n/g, ' ')}`);
      node = node.parentElement;
    }
    return chain;
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  console.log(info.join('\n'));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
