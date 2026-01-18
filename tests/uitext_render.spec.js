
const { test, expect } = require('@playwright/test');

test.describe('UIText Rendering Test', () => {
  let server;

  test.beforeAll(async () => {
    const http = require('http');
    const fs = require('fs');
    const path = require('path');

    server = http.createServer((req, res) => {
      const filePath = path.join(__dirname, '..', req.url === '/' ? 'editor.html' : req.url);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end(JSON.stringify(err));
          return;
        }
        let contentType = 'text/html';
        if (filePath.endsWith('.js')) contentType = 'application/javascript';
        else if (filePath.endsWith('.css')) contentType = 'text/css';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    await new Promise(resolve => server.listen(8000, resolve));
    console.log('Test server started at http://localhost:8000');
  });

  test.afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    console.log('Test server stopped.');
  });

  test('should create a UIText object and render it correctly', async ({ page }) => {
    await page.goto('http://localhost:8000/editor.html');

    // Wait for the editor to be fully initialized
    await page.waitForFunction(() => window.editorInitialized);

    // 1. Programmatically create a scene with a Canvas and a UIText element
    const textElementDetails = await page.evaluate(() => {
        const { SceneManager, MateriaFactory, Components, selectMateria } = window;
        SceneManager.clearScene();

        // Create a Canvas
        const canvasMateria = MateriaFactory.createCanvasObject();
        canvasMateria.getComponent(Components.Canvas).referenceResolution = { width: 800, height: 600 };

        // Create a Text object and modify its properties
        const textMateria = MateriaFactory.createTextObject(canvasMateria);
        const uiText = textMateria.getComponent(Components.UIText);
        uiText.text = 'UITEXT VERIFICATION';
        uiText.fontSize = 48;
        uiText.color = '#00ff00'; // Bright green

        const uiTransform = textMateria.getComponent(Components.UITransform);
        uiTransform.size = { width: 600, height: 100 };
        uiTransform.position = { x: 0, y: 0 };
        uiTransform.anchorPoint = 4; // Center anchor

        window.updateHierarchy();
        selectMateria(textMateria); // Select the text materia to update the inspector

        return {
            id: textMateria.id,
            text: uiText.text,
            fontSize: uiText.fontSize,
            color: uiText.color
        };
    });

    // 2. Verify the inspector is showing the correct data for the new text object
    await expect(page.locator('#inspector-panel')).toContainText('UIText');
    await expect(page.locator('textarea[data-prop="text"]')).toHaveValue(textElementDetails.text);
    await expect(page.locator('input[data-prop="color"]')).toHaveValue(textElementDetails.color);
    await expect(page.locator('input[data-prop="fontSize"]')).toHaveValue(String(textElementDetails.fontSize));

    // 3. Take a screenshot to visually verify the text rendering in the scene view
    await page.screenshot({ path: 'tests/output/ui-text-render-verification.png' });

    console.log('UIText object created and inspector verified. Screenshot taken for visual confirmation.');
  });
});
