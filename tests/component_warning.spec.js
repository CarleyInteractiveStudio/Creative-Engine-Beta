
import { test, expect } from '@playwright/test';

test('Component dependency warning and auto-repair', async ({ page }) => {
    // 1. Go to editor
    await page.goto('http://localhost:8080/editor.html?project=TestProject');

    // Wait for editor to be ready
    await page.waitForFunction(() => window.editorInitialized === true);

    // 2. Create a Materia with Movement but NO Rigidbody2D
    await page.evaluate(() => {
        const mtr = window.MateriaFactory.createEmptyMateria('TestPlayer');
        const movement = new window.Components.Movement(mtr);
        movement.useRigidbody = true;
        mtr.addComponent(movement);
        window.SceneManager.currentScene.addMateria(mtr);
        window.updateHierarchy();
        window.selectMateria(mtr);
    });

    // 3. Press Play
    await page.click('#btn-play');

    // 4. Check console for the warning
    const consoleTab = page.locator('[data-tab="console-content"]');
    await consoleTab.click();

    const warning = page.locator('.console-msg.log-error', { hasText: 'no tiene Rigidbody2D' });
    await expect(warning).toBeVisible();

    // 5. Check for Auto Repair button
    const repairBtn = warning.locator('.console-action-btn.special');
    await expect(repairBtn).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'verification/console_system_repair.png' });

    // 6. Click Auto Repair
    await repairBtn.click();

    // 7. Check for confirmation dialog
    const confirmBtn = page.locator('.dialog-footer .primary-btn, .dialog-footer .approve-btn').filter({ hasText: 'Aceptar' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 8. Verify component was added
    const hasRigidbody = await page.evaluate(() => {
        const mtr = window.SceneManager.currentScene.findMateriaByName('TestPlayer');
        return !!mtr.getComponentByName('Rigidbody2D');
    });

    expect(hasRigidbody).toBe(true);
});
