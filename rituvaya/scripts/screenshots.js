// Drives the web preview with headless Chromium and captures key screens.
// Usage: node scripts/screenshots.js [baseUrl] [outDir]
const path = require('path');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:8081';
const OUT = process.argv[3] || path.join(__dirname, '..', 'docs', 'screenshots');
const VIEWPORT = { width: 390, height: 844 };

async function main() {
  const { chromium } = require('playwright');
  // CHROMIUM_PATH lets a sandbox with a pre-installed browser skip the download.
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-GB', timezoneId: 'Asia/Dubai' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  fs.mkdirSync(OUT, { recursive: true });
  const shot = async (name) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
    console.log('shot', name);
  };
  const dismissDevToast = async () => {
    // Expo's dev overlay can cover the tab bar; record it and close it so the walkthrough continues.
    const toast = page.locator('#error-toast');
    if ((await toast.count()) && (await toast.locator('div').count())) {
      const text = await toast.innerText().catch(() => '');
      if (text.trim()) errors.push(`dev-toast: ${text.trim()}`);
      const close = toast.locator('div[role="button"], button').last();
      if (await close.count()) await close.click().catch(() => undefined);
    }
  };
  const diagnose = async (locator) => {
    const box = await locator.boundingBox();
    if (!box) return 'no bounding box';
    return page.evaluate(({ x, y }) => {
      const chain = [];
      let node = document.elementFromPoint(x, y);
      while (node && chain.length < 10) {
        const cs = getComputedStyle(node);
        chain.push(`${node.tagName}.${String(node.className || '').slice(0, 50)} pe=${cs.pointerEvents} pos=${cs.position} text=${(node.textContent || '').slice(0, 24).replace(/\n/g, ' ')}`);
        node = node.parentElement;
      }
      return chain.join('\n   ');
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  };
  const clickLocator = async (locator, opts = {}) => {
    await dismissDevToast();
    await locator.waitFor({ timeout: opts.timeout ?? 15000 });
    try {
      await locator.click({ timeout: opts.clickTimeout ?? 8000 });
    } catch (error) {
      console.log('click intercepted, hit chain:\n   ' + (await diagnose(locator)));
      errors.push(`click-intercepted: ${String(error).split('\n')[0]}`);
      await locator.click({ timeout: 5000, force: true });
    }
  };
  // Chromium hit-tests <button> descendants as the button itself, so prefer role-based targets.
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const click = async (text, opts = {}) => {
    const candidates = [
      page.getByRole('button', { name: text, exact: true }),
      page.getByRole('tab', { name: text, exact: true }),
      page.getByRole('radio', { name: text, exact: true }),
      page.getByRole('button', { name: new RegExp(`^${escape(text)}`) }),
      page.getByText(text, { exact: opts.exact ?? true }),
    ];
    for (const candidate of candidates) {
      const visible = candidate.filter({ visible: true });
      if (await visible.count()) return clickLocator(visible.first(), opts);
    }
    return clickLocator(page.getByText(text, { exact: opts.exact ?? true }).first(), opts);
  };

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 240000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 240000 });
  await page.waitForSelector('text=Choose your language', { timeout: 240000 });
  await shot('01-onboarding-language');
  await click('Next');
  await page.getByPlaceholder('Your name').fill('Tarek');
  await shot('02-onboarding-name');
  await click('Next');
  await shot('03-onboarding-day');
  await click('Set Breakfast');
  await click('Next');
  await page.getByPlaceholder('Amount').fill('2500');
  await shot('04-onboarding-hydration');
  await click('Next');
  await page.getByPlaceholder('e.g. Vitamin D, Magnesium').fill('vit d');
  await shot('05-onboarding-catalog');
  await click('Vitamin D3');
  await shot('06-onboarding-item-details');
  await click('Next');
  await shot('07-onboarding-schedule');
  await click('Save');
  await page.waitForSelector('text=Your routine preview', { timeout: 15000 });
  await shot('08-onboarding-preview');
  await click('Next');
  await shot('09-onboarding-notifications');
  await click('Start using Rituvaya');
  await page.getByText('Water', { exact: true }).first().waitFor({ timeout: 20000 });
  await shot('11-today-first-item');

  // Load demo data for richer screens.
  await click('Settings');
  await shot('12-settings');
  await click('Export my data');
  await click('Load demo data');
  await page.waitForTimeout(1500);
  await shot('13-settings-data');
  await page.getByRole('button', { name: 'Go back' }).first().click();
  await page.waitForTimeout(500);
  await click('Today');
  await page.waitForTimeout(800);
  await shot('14-today-demo');
  // Mark the next dose as taken and capture the undo toast.
  const taken = page.getByRole('button', { name: /as taken$/ }).first();
  if (await taken.count()) {
    await taken.click();
    await page.waitForTimeout(400);
    await shot('15-today-taken-undo');
  }
  // Dose action sheet from an overdue row.
  const overdueRow = page.getByRole('button', { name: /^Open Vitamin D3 \(Demo\)/ }).first();
  if (await overdueRow.count()) {
    await clickLocator(overdueRow);
    await page.waitForTimeout(500);
    await shot('15b-dose-actions');
    await clickLocator(page.getByRole('button', { name: 'Close' }).last());
    await page.waitForTimeout(400);
  }
  await click('My Routine');
  await shot('16-routine');
  // Adding an item: the header arrow must step back through the flow, not dismiss
  // it and lose what was typed, and must never be a dead button.
  await clickLocator(page.getByRole('button', { name: 'Add item' }).first());
  await page.getByPlaceholder('e.g. Vitamin D, Magnesium').fill('Ashwagandha');
  await click('Enter manually');
  await page.getByText('More details').first().waitFor({ timeout: 10000 });
  await shot('16b-add-item-details');
  await clickLocator(page.getByRole('button', { name: 'Go back' }).first());
  await page.waitForTimeout(600);
  if (!(await page.getByPlaceholder('e.g. Vitamin D, Magnesium').isVisible().catch(() => false))) {
    errors.push('add-item: header back did not return to the catalog step');
  }
  await clickLocator(page.getByRole('button', { name: 'Go back' }).first());
  await page.waitForTimeout(600);
  if (await page.getByText('New item', { exact: true }).first().isVisible().catch(() => false)) {
    errors.push('add-item: header back did not leave the add-item sheet');
  }
  await clickLocator(page.getByRole('button', { name: /Vitamin D3 \(Demo\)/ }).first());
  await page.waitForTimeout(600);
  await shot('17-item-detail');
  await click('Edit schedule');
  await page.waitForTimeout(600);
  await shot('17b-edit-schedule');
  await click('Add a time');
  await page.waitForTimeout(400);
  await shot('17c-add-time');
  await clickLocator(page.getByRole('button', { name: 'Close' }).last());
  await page.waitForTimeout(300);
  await clickLocator(page.getByRole('button', { name: 'Go back' }).last());
  await page.waitForTimeout(400);
  await clickLocator(page.getByRole('button', { name: 'Go back' }).first());
  await click('History');
  await page.waitForTimeout(600);
  await shot('18-history-calendar');
  await click('Week');
  await shot('19-history-week');
  await click('Today');
  await clickLocator(page.getByRole('button', { name: 'Open hydration' }).first());
  await page.waitForTimeout(600);
  await shot('20-hydration');
  await clickLocator(page.getByTestId('hydration').getByRole('button', { name: 'Add 250 ml' }).first());
  await page.waitForTimeout(900);
  await shot('21-hydration-added');
  await clickLocator(page.getByTestId('hydration').getByRole('button', { name: 'Go back' }).first());

  // Reminder settings and notification status.
  await click('Settings');
  await click('Reminder settings');
  await page.waitForTimeout(500);
  await shot('21b-reminder-settings');
  // Insistent mode hides the repeat controls it overrides, and says plainly that
  // it is still a notification rather than an alarm.
  await click('Insistent');
  await page.waitForTimeout(700);
  if (await page.getByText('Minutes between reminders', { exact: true }).first().isVisible().catch(() => false)) {
    errors.push('reminders: insistent mode still shows the repeat controls it ignores');
  }
  await shot('21b2-reminder-insistent');
  await click('Standard');
  await page.waitForTimeout(500);
  await clickLocator(page.getByRole('button', { name: 'Go back' }).last());
  await page.waitForTimeout(300);
  await click('Notification status');
  await page.waitForTimeout(500);
  await shot('21c-notification-status');
  await clickLocator(page.getByRole('button', { name: 'Go back' }).last());
  await page.waitForTimeout(300);

  // Dark theme.
  await click('Appearance');
  await click('Dark');
  await page.waitForTimeout(400);
  await shot('22-settings-dark');
  await click('Today');
  await page.waitForTimeout(600);
  await shot('23-today-dark');
  await click('Settings');
  await click('Appearance');
  await click('Light');

  // Arabic RTL.
  await click('Language');
  await click('العربية');
  await page.waitForTimeout(800);
  await shot('24-settings-arabic');
  await click('اليوم');
  await page.waitForTimeout(800);
  await shot('25-today-arabic');
  await click('روتيني');
  await page.waitForTimeout(600);
  await shot('26-routine-arabic');
  await click('الإعدادات');
  await click('اللغة');
  await click('Deutsch');
  await page.waitForTimeout(600);
  await click('Heute');
  await page.waitForTimeout(600);
  await shot('27-today-german');
  await click('Routine');
  await shot('28-routine-german');
  await click('Optionen');
  await click('Sprache');
  await click('English');

  fs.writeFileSync(path.join(OUT, 'console-errors.txt'), errors.join('\n'));
  console.log('console errors:', errors.length);
  errors.slice(0, 20).forEach((e) => console.log(' -', e.slice(0, 300)));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
