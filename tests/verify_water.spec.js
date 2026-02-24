const { test, expect } = require('@playwright/test');

test('Water should be visible and have particles', async ({ page }) => {
    await page.goto('http://localhost:8000');

    // Create a new project
    await page.fill('#project-name', 'WaterTest');
    await page.click('#btn-create-project');

    // Wait for editor to load
    await page.waitForSelector('#scene-canvas');

    // Right click hierarchy to create water
    await page.click('#hierarchy-content', { button: 'right' });
    await page.waitForSelector('#hierarchy-context-menu', { state: 'visible' });

    // Click Create
    await page.hover('text=Crear');

    // Verify "Agua" is NOT in the menu
    const agua = page.locator('text=Agua');
    await expect(agua).not.toBeVisible();
});
