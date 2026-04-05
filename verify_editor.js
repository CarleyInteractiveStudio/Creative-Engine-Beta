const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  // Go to the editor
  await page.goto('http://localhost:8080/editor.html');
  await page.waitForLoadState('networkidle');

  // Open the Code tab
  await page.click('button:has-text("Code")');
  await page.waitForTimeout(1000);

  // Type some code to see line numbers
  await page.click('.cm-content');
  await page.keyboard.type('// Line 1\n// Line 2\n// Line 3');
  await page.waitForTimeout(500);

  // Take a screenshot of the editor area
  await page.screenshot({ path: 'verification/editor_lines.png' });

  // Test Undo button
  const undoBtn = await page.locator('#btn-undo');
  await undoBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'verification/editor_undo.png' });

  await browser.close();
})();
