
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/editor.html');

  // Wait for editor to load
  await page.waitForSelector('#menubar');

  // Open Project Settings
  await page.click('text=File');
  await page.click('text=Configuración de Proyecto');

  // Wait for the panel to be visible
  await page.waitForSelector('.floating-panel:visible');

  // Take screenshot of settings
  await page.screenshot({ path: '/home/jules/verification/settings_fix.png' });

  // Close settings
  await page.click('.close-panel-btn');

  // Open Preferences
  await page.click('text=Edit');
  await page.click('text=Preferencias');
  await page.waitForSelector('.floating-panel:visible');
  await page.screenshot({ path: '/home/jules/verification/preferences_fix.png' });

  await browser.close();
})();
