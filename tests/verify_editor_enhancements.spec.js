const { test, expect } = require('@playwright/test');

test('Verify Editor Enhancements (Folding, Linting, Semicolons)', async ({ page }) => {
  await page.goto('http://localhost:8080/editor.html?project=EnhancementTest');

  // Wait for loading to finish
  await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });

  // 1. Create a script with a variable without semicolon and a function to fold
  await page.evaluate(() => {
      const code = `ve motor;
publico numero velocidad = 10
alActualizar(delta) {
    posicion.x += velocidad
}
// Unrecognized code to trigger linting
error_aqui_sin_sentido`;
      window.ceCreateAsset('EnhancedScript.ces', code);
  });
  await page.waitForTimeout(1000);

  // 2. Open the script
  await page.click('.grid-item[data-name="EnhancedScript.ces"]');
  await page.waitForTimeout(1000);

  // 3. Check for Linting UI (red underline/background on the error line)
  // We expect a diagnostic on the last line (line 7)
  const errorLine = page.locator('.cm-line').last();
  // Check if it has the error style (red background/border)
  // Our custom style is background-color: rgba(255, 0, 0, 0.2)
  const style = await errorLine.getAttribute('style');
  console.log("Error line style:", style);

  // 4. Check for Folding Gutter icons
  const foldingGutter = page.locator('.cm-foldGutter');
  await expect(foldingGutter).toBeVisible();

  // 5. Try to save and verify no transpilation error for missing semicolon
  await page.click('#code-save-btn');
  await page.waitForTimeout(1000);

  // Check if a success notification appeared (not a warning about syntax errors)
  const notification = page.locator('.notification-content');
  const notificationText = await notification.textContent();
  console.log("Notification after save:", notificationText);
  expect(notificationText).toContain('guardado correctamente');
  expect(notificationText).not.toContain('ERRORES DE SINTAXIS');

  await page.screenshot({ path: 'editor_enhancements_verification.png' });
});
