const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/index.html');
  await page.click('#btn-start');

  // Open Asset Selector via Animation Editor -> Import
  await page.click('#menu-window-animation-editor');
  await page.waitForSelector('#animation-editor-window', { state: 'visible' });
  await page.click('#animation-import-btn');

  // Wait for Asset Selector
  await page.waitForSelector('#asset-selector-modal', { state: 'visible' });

  // Check for multi-select button
  const confirmBtn = await page.$('#import-confirm-btn');
  console.log('Confirm button exists:', !!confirmBtn);

  await page.screenshot({ path: '/home/jules/verification/asset_selector_multi.png' });
  await browser.close();
})();
