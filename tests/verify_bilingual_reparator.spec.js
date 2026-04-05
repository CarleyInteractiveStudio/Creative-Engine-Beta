const { test, expect } = require('@playwright/test');

test('Verify Bilingual Auto Reparator (English Support)', async ({ page }) => {
  await page.goto('http://localhost:8080/editor.html?project=BilingualTest');

  // Wait for loading to finish
  await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });

  // 1. Change language to English in Preferences
  await page.click('#menu-preferences');
  await page.waitForSelector('#preferences-modal', { state: 'visible' });
  await page.selectOption('#prefs-lang', 'en');
  await page.click('#prefs-save');
  await page.waitForSelector('#preferences-modal', { state: 'hidden' });

  // 2. Open a script and type broken English code
  // Let's create a new script via console for predictability
  await page.evaluate(() => {
      window.ceCreateAsset('TestReparator.ces', 'update(delta) {\n    position.x += 5\n}');
  });
  await page.waitForTimeout(1000);

  // Click the script in Asset Browser to open it
  await page.click('.grid-item[data-name="TestReparator.ces"]');
  await page.waitForTimeout(500);

  // 3. Trigger Reparation (simulating a run attempt or clicking the "Creative Code" button if it exists)
  // In this engine, reparation often triggers when clicking "Run" if there are errors,
  // or via the rocket icon button in the editor toolbar.
  const creativeCodeBtn = page.locator('#btn-creative-code');
  if (await creativeCodeBtn.isVisible()) {
      await creativeCodeBtn.click();
  } else {
      // Fallback: trigger via console
      await page.evaluate(async () => {
          const code = 'update(delta) {\n    posicion.x += 5\n}'; // 'posicion' is Spanish, should be fixed to 'position' or detected
          const result = await window.AutoReparator.repair(code, 'TestReparator.ces');
          window.ceUpdateScriptContent('TestReparator.ces', result.code);
      });
  }

  await page.waitForTimeout(2000);

  // 4. Check if code was repaired with English keywords/comments
  const editorContent = await page.evaluate(() => {
      return window.ceGetScriptContent('TestReparator.ces');
  });

  console.log("Repaired Code:", editorContent);

  // It should have 'go motor;' (header) and correctly inferred 'position'
  expect(editorContent).toContain('go motor;');
  expect(editorContent).toContain('position.x');

  await page.screenshot({ path: 'reparator_verification.png' });
});
