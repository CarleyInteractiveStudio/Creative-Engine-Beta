const { test, expect } = require('@playwright/test');

test('Verify quick snapping, child creation toggle, and parallax target features', async ({ page }) => {
  await page.goto('http://localhost:8080/editor.html?project=TestProject');

  // Wait for loading to finish
  await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });

  // 1. Verify Snapping Controls presence and functionality
  const snapToggle = page.locator('#btn-snap-toggle');
  await expect(snapToggle).toBeVisible();

  const snapInput = page.locator('#input-snap-grid-size');
  await expect(snapInput).toBeVisible();

  // Click snap toggle and verify active state/sync
  await snapToggle.click();
  await expect(snapToggle).toHaveClass(/active/);

  // 2. Verify Child Creation Mode Selector presence and toggling
  const childModeSelector = page.locator('#select-child-creation-mode');
  await expect(childModeSelector).toBeVisible();
  await expect(childModeSelector).toHaveValue('local');

  await childModeSelector.selectOption('global');
  await expect(childModeSelector).toHaveValue('global');

  // Verify window global state updated
  const globalMode = await page.evaluate(() => window.childCreationMode);
  expect(globalMode).toBe('global');

  // 3. Verify Parallax and TextureRender creation
  // Let's create a parallax object using page.evaluate to simulate creation
  await page.evaluate(() => {
    const parent = null;
    const mtr = window.MateriaFactory.createBaseMateria('ParallaxTest', parent, false, true);
    const trComp = new window.Components.TextureRender(mtr);
    trComp.wrapMode = 'Repeat';
    mtr.addComponent(trComp);
    const p = new window.Components.Parallax(mtr);
    mtr.addComponent(p);
    window.SceneManager.currentScene.addMateria(mtr);
  });

  // Give a moment
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'features_verification.png' });
});
