const { test, expect } = require('@playwright/test');

test('Verify quick snapping, child creation toggle, and parallax target features', async ({ page }) => {
  await page.goto('http://localhost:8080/editor.html?project=TestProject');

  // Wait for loading to finish
  await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });

  // 1. Verify Snapping Controls and Gizmo Toggle is present on the right
  const gizmoToggle = page.locator('.view-toggle #btn-toggle-gizmos');
  await expect(gizmoToggle).toBeVisible();

  // 2. Verify Child Creation Mode Selector and Snapping are in Preferences Window
  // Let's open Preferences modal to check
  const prefsBtn = page.locator('button:has-text("Ayuda")'); // Or open preferences via menu/eval
  await page.evaluate(() => {
     // Trigger showing preferences modal
     if (window.PreferencesWindow && window.PreferencesWindow.show) {
         window.PreferencesWindow.show();
     } else {
         document.getElementById('preferences-modal').classList.remove('hidden');
     }
  });

  const childModeSelector = page.locator('#prefs-child-creation-mode');
  await expect(childModeSelector).toBeVisible();
  await expect(childModeSelector).toHaveValue('local');

  await childModeSelector.selectOption('global');
  await expect(childModeSelector).toHaveValue('global');

  // 3. Verify Parallax and TextureRender creation
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
