
const { test, expect } = require('@playwright/test');

test.describe('UIText Rendering Test', () => {
  test('should create a UIText object and render it correctly', async ({ page }) => {
    // Navigate to the editor
    await page.goto('http://localhost:8000/editor.html?project=test-project');

    // Wait for the editor to be fully initialized
    await page.waitForFunction(() => window.editorInitialized);

    // Right-click on the hierarchy panel to open the context menu
    await page.locator('#hierarchy-panel').click({ button: 'right' });
    await page.waitForSelector('#hierarchy-context-menu', { state: 'visible' });

    // Create a new Canvas
    await page.hover('[data-action="create"]');
    await page.hover('[data-action="create-ui"]');
    await page.click('[data-action="create-canvas"]');

    // Right-click on the Canvas to add a UIText element
    await page.locator('text=Canvas').click({ button: 'right' });
    await page.waitForSelector('#hierarchy-context-menu', { state: 'visible' });
    await page.hover('[data-action="create"]');
    await page.hover('[data-action="create-ui"]');
    await page.click('[data-action="create-text"]');

    // Select the Text object to show its properties in the inspector
    await page.locator('text=Text').click();

    // Verify the inspector shows the UIText component properties
    await expect(page.locator('#inspector-panel')).toContainText('UIText');
    await expect(page.locator('textarea[data-prop="text"]')).toHaveValue('Hello World');
    await expect(page.locator('input[data-prop="color"]')).toHaveValue('#ffffff');
    await expect(page.locator('input[data-prop="fontSize"]')).toHaveValue('24');

    // Change the text to something unique for the screenshot
    await page.locator('textarea[data-prop="text"]').fill('UITEXT TEST');

    // Take a screenshot to visually verify the text rendering
    await page.screenshot({ path: 'test-results/ui-text-render.png' });

    console.log('UIText object created and inspector verified. Screenshot taken.');
  });
});
