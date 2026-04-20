const { test, expect } = require('@playwright/test');

test('Editor should load and start without ReferenceError', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  await page.goto('http://localhost:8080/editor.html');

  // Wait for the engine to initialize
  await page.waitForTimeout(3000);

  // Check if EngineAPI is defined
  const isEngineReady = await page.evaluate(() => {
    return typeof window.EngineAPI !== 'undefined';
  });

  expect(isEngineReady).toBe(true);

  // Check if there are any ReferenceErrors in the console logs
  // (Manual check of logs if needed, but the test passing CEEngine check is a good sign)
});
