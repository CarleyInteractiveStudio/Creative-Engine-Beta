const { test, expect } = require('@playwright/test');

test('Check Animation Editor Import Button', async ({ page }) => {
    // Go to the editor page
    await page.goto('http://localhost:8080/editor.html?project=TestProject');

    // Wait for the loading overlay to disappear
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });

    // Open Animation Panel
    await page.click('#menu-window-animation');

    // Check if the import button is visible
    const importBtn = page.locator('#animation-import-btn');
    await expect(importBtn).toBeVisible();

    // Click it (it should show a notification if no animation is loaded)
    await importBtn.click();

    // Check if a notification appears (since we didn't load an animation)
    const notification = page.locator('.notification');
    // We might need to wait for it
    await expect(notification).toBeVisible();
    await expect(notification).toContainText('No hay ningún asset de animación cargado');
});
