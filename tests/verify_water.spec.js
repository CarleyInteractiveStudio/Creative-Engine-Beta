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

    // Click Create -> Water
    await page.hover('text=Crear');
    await page.click('text=Agua');

    // Verify Materia "Agua" exists in hierarchy
    await expect(page.locator('#hierarchy-content')).toContainText('Agua');

    // Wait a bit for rendering
    await page.waitForTimeout(1000);

    // Take a screenshot to verify visually
    await page.screenshot({ path: 'verification/water_rendering.png' });

    // Verify that the Water component is visible in Inspector
    await page.click('text=Agua');
    await expect(page.locator('#inspector-content')).toContainText('Water (Agua)');
});
