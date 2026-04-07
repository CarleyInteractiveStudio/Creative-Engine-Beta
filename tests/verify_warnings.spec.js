import { test, expect } from '@playwright/test';

test('Verify missing component warnings in Inspector', async ({ page }) => {
  // Go to the editor (assuming local server is running on 8080)
  await page.goto('http://localhost:8080/editor.html?project=TestProject');

  // Wait for the engine to load
  await page.waitForFunction(() => window.SceneManager && window.SceneManager.currentScene);

  // 1. Create a Materia and add Movement component
  await page.evaluate(() => {
    const mtr = window.createMateria();
    mtr.name = "TestObject";
    // We assume window.Components is available as I saw it in other files
    const Movement = window.Components.Movement;
    const m = new Movement(mtr);
    m.useRigidbody = true; // This should trigger the warning if Rigidbody2D is missing
    mtr.addComponent(m);
    window.SceneManager.currentScene.addMateria(mtr);
    window.selectMateria(mtr.id);
    window.updateInspector();
  });

  // 2. Check if the warning box appears in the inspector
  const warningBox = page.locator('.inspector-warning-box');
  await expect(warningBox).toBeVisible();

  // 3. Verify the text contains "Rigidbody2D"
  await expect(warningBox).toContainText('Rigidbody2D');

  // 4. Click the "Reparar" button
  const repairBtn = warningBox.locator('button.warning-btn');
  await expect(repairBtn).toBeVisible();
  await repairBtn.click();

  // 5. Verify the warning is gone and Rigidbody2D is added
  await expect(warningBox).not.toBeVisible();

  const hasRigidbody = await page.evaluate(() => {
    const mtr = window.getSelectedMateria();
    return !!mtr.getComponentByName('Rigidbody2D');
  });
  expect(hasRigidbody).toBe(true);
});
