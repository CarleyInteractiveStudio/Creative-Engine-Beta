const { test, expect } = require('@playwright/test');

test('Verify Asset Browser hides extensions and Help menu has Documentation', async ({ page }) => {
  await page.goto('http://localhost:8080/editor.html?project=TestProject');

  // Wait for loading to finish
  await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });

  // 1. Verify Help Menu
  const helpBtn = page.locator('button:has-text("Ayuda")');
  await helpBtn.click();
  const docsBtn = page.locator('#menu-docs');
  await expect(docsBtn).toBeVisible();
  await expect(docsBtn).toHaveText(/Documentación/);

  // 2. Verify Asset Browser (create a dummy file first via script if needed, or just check existing)
  // Let's use the console to create a file
  await page.evaluate(async () => {
    if (window.ceCreateAsset) {
      await window.ceCreateAsset('TestScript.ces', '// test');
    }
  });

  // Give it a moment to refresh
  await page.waitForTimeout(1000);

  // Check the grid item text
  const gridItem = page.locator('.grid-item[data-name="TestScript.ces"] .name');
  await expect(gridItem).toBeVisible();
  await expect(gridItem).toHaveText('TestScript');
  await expect(gridItem).not.toHaveText('TestScript.ces');

  await page.screenshot({ path: 'final_verification.png' });
});
