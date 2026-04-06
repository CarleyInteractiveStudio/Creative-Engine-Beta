const { test, expect } = require('@playwright/test');

test('Verify Engine Starts and CodeMirror loads without errors', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:8080/editor.html?project=StartupTest');

  // Wait for loading to finish or timeout
  await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });

  console.log("Captured errors:", errors);

  // Filter out the auth bridge error which is expected if not logged in
  const criticalErrors = errors.filter(e => !e.includes('auth bridge') && !e.includes('active session'));

  expect(criticalErrors).toEqual([]);

  await page.screenshot({ path: 'startup_verification.png' });
});
