const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/editor.html');

  // Open Hierarchy context menu
  await page.click('#hierarchy-list', { button: 'right' });

  // Wait for menu
  await page.waitForSelector('.context-menu', { state: 'visible' });

  // Hover over "Crear" (which is index 4 now: Renombrar, Borrar, Duplicar, HR, Crear)
  const crearItem = await page.locator('.context-menu li:has-text("Crear")');
  await crearItem.hover();

  // Wait for submenu
  await page.waitForSelector('.submenu', { state: 'visible' });

  // Capture the full menu and submenu
  await page.screenshot({ path: 'final_check_menu.png' });

  await browser.close();
})();
