const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/index.html');
  await page.click('#btn-start');

  // Wait for main editor to load
  await page.waitForSelector('#menu-window-animation-editor');

  // Click menu item
  await page.click('#menu-window-animation-editor');

  // Wait for Animation Editor window
  await page.waitForSelector('#animation-editor-window', { state: 'visible' });

  // Check for Import button
  const importBtn = await page.$('#anim-import-btn');
  console.log('Import button exists:', !!importBtn);
  if (importBtn) {
    console.log('Import button text:', await importBtn.innerText());
  }

  await page.screenshot({ path: '/home/jules/verification/animation_editor_import.png' });
  await browser.close();
})();
