import { test, expect } from '@playwright/test';

test('Verify Phase 4 Scripting Enhancements', async ({ page }) => {
  await page.goto('http://localhost:8080/editor.html');
  await page.waitForTimeout(5000);

  const result = await page.evaluate(async () => {
    try {
        // Test Global Variables System
        const engine = window.RuntimeAPIManager;
        if (!engine) return { success: false, error: "RuntimeAPIManager not found" };

        engine.setGlobal("test_points", 100);
        const val = engine.getGlobal("test_points");

        // Test Visual Scripting Translation (Manual Check of logic)
        const VS = window.VisualScriptingCore;
        if (!VS) return { success: false, error: "VisualScriptingCore not found" };

        const testData = {
            blocks: [
                { id: 'b1', type: 'variable-decl', inputs: { name: 'vida', value: 100 }, nextBlockId: null },
                { id: 'b2', type: 'event', name: 'Al Empezar', nextBlockId: 'b3' },
                { id: 'b3', type: 'action', name: 'Asignar Variable', inputs: { name: 'vida', value: 50, scope: 'local' }, nextBlockId: null }
            ]
        };
        const code = VS.translateToCES(testData);

        return {
            success: val === 100,
            codeGenerated: code.includes('variable vida = 100') && code.includes('vida = 50')
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
  });

  expect(result.success).toBe(true);
  expect(result.codeGenerated).toBe(true);
});
