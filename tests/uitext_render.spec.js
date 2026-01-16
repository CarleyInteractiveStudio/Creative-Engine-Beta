
const { test, expect } = require('@playwright/test');

test.describe('UIText Rendering Test', () => {
  test('should create a UIText object and verify its properties', async ({ page }) => {
    // Listen for all console events and log them to the test's console
    page.on('console', msg => {
      console.log(`BROWSER LOG: ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    page.on('pageerror', error => {
        console.log(`BROWSER ERROR: ${error.message}`);
    });

    // Navigate to the editor
    await page.goto('http://localhost:8000/editor.html?project=TestProject');

    // Wait for the core engine components to be available on the window object
    await page.waitForFunction(() => window.MateriaFactory && window.SceneManager);

    // Use page.evaluate to interact with the engine programmatically
    const uiTextState = await page.evaluate(async () => {
      const { MateriaFactory, SceneManager, Components } = window;
      const scene = SceneManager.currentScene;

      // 1. Create a Canvas
      const canvasMateria = MateriaFactory.createCanvasObject();

      // 2. Create a UIText element as a child of the Canvas
      const textMateria = MateriaFactory.createTextObject(canvasMateria);
      textMateria.name = 'MyText';

      const uiTextComponent = textMateria.getComponent(Components.UIText);

      // 3. Return the initial state of the component for verification
      return {
        text: uiTextComponent.text,
        color: uiTextComponent.color,
        fontSize: uiTextComponent.fontSize,
        name: textMateria.name
      };
    });

    // 4. Assert the initial properties of the UIText component
    expect(uiTextState.name).toBe('MyText');
    expect(uiTextState.text).toBe('Hello World');
    expect(uiTextState.color).toBe('#ffffff');
    expect(uiTextState.fontSize).toBe(24);

    console.log('UIText object created and its properties verified programmatically.');
  });
});
