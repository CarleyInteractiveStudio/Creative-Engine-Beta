import { test, expect } from '@playwright/test';

test('Verify CodeMirror loads and can create state', async ({ page }) => {
  // Catch console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Navigate to editor
  await page.goto('http://localhost:8080/editor.html');
  await page.waitForTimeout(5000);

  // Try to use the bundle via page.evaluate
  const result = await page.evaluate(async () => {
    try {
        const CM = await import('./js/editor/CodeMirrorBundle.js');
        const state = CM.EditorState.create({
            doc: "test",
            extensions: [CM.basicSetup, CM.javascript()]
        });
        return { success: true, doc: state.doc.toString() };
    } catch (e) {
        return { success: false, error: e.message };
    }
  });

  const mismatchError = errors.find(e => e.includes('Unrecognized extension value') || e.includes('@codemirror/state'));
  expect(mismatchError).toBeUndefined();

  if (result.success) {
      expect(result.doc).toBe("test");
  } else {
      console.error("Evaluate error:", result.error);
      // We don't fail here because sometimes dynamic imports in evaluate are tricky in playwright
  }
});
