const { test, expect } = require('@playwright/test');

test('verify beforeunload dialog when scene is dirty', async ({ page }) => {
    // Go to the editor with a test project
    await page.goto('http://localhost:8080/editor.html?project=TestProject');

    // Wait for the editor to initialize
    await page.waitForFunction(() => window.editorInitialized === true, { timeout: 15000 });

    // Force a dirty state via a global variable if possible, or by interacting with the UI.
    // Let's use the UI to be more realistic.
    // Create a new Sprite to make the scene dirty.
    await page.click('#menu-hierarchy-btn');
    const createBtn = page.locator('#hierarchy-context-menu [data-action="create-sprite"]');
    // We need to trigger a context menu first to see the button usually,
    // but the HierarchyWindow.js handles actions if we click it.
    // Actually, let's just set the dirty flag directly for a more reliable test of the intercepter.
    await page.evaluate(() => {
        window.SceneManager.setSceneDirty(true);
    });

    // Listen for the dialog
    let dialogAppeared = false;
    page.on('dialog', async dialog => {
        if (dialog.type() === 'beforeunload') {
            dialogAppeared = true;
            await dialog.accept(); // Or dismiss
        }
    });

    // Try to reload
    try {
        await page.reload({ timeout: 5000 });
    } catch (e) {
        // Reload might fail if we don't handle the dialog correctly in the test environment
    }

    expect(dialogAppeared).toBe(true);
});
