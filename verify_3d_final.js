const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:8000/editor.html');

  // Wait for initialization
  await page.waitForFunction(() => window.editorInitialized === true, { timeout: 30000 });
  console.log('Editor initialized');

  // Set project type to 3D
  await page.evaluate(() => {
    window.currentProjectConfig.projectType = '3d';
    window.currentProjectConfig.rendererMode = '3d-mode';
    if (window.updateScene) window.updateScene(window._Renderer3D, true);
  });

  // Open Hierarchy Context Menu on empty space to find 'Generar Circuito'
  const canvas = await page.$('#scene-canvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + 100, box.y + 100, { button: 'right' });

  // Wait for menu
  await page.waitForSelector('#hierarchy-context-menu', { state: 'visible' });
  console.log('Context menu visible');

  // Trigger circuit generation
  await page.evaluate(async () => {
    const action = 'create-test-circuit';
    if (window.HierarchyWindow) {
        window.HierarchyWindow.handleContextMenuAction(action);
    } else {
        const { createTestCircuit } = await import('./js/editor/MateriaFactory.js');
        await createTestCircuit();
    }
  });

  console.log('Circuit generation triggered');
  await page.waitForTimeout(3000); // Wait for async creation and rendering

  // Screenshot of the scene with the new circuit
  await page.screenshot({ path: '3d_final_verify.png' });
  console.log('Screenshot saved: 3d_final_verify.png');

  // Verify skybox colors
  await page.evaluate(() => {
    const SceneManager = window.SceneManager;
    if (SceneManager.currentScene) {
      SceneManager.currentScene.ambiente.skyMode = 'Gradient';
      SceneManager.currentScene.ambiente.skyColor = '#1a2a6c';
      SceneManager.currentScene.ambiente.horizonColor = '#b21f1f';
      SceneManager.currentScene.ambiente.groundColor = '#000000';
    }
    if (window.updateScene) window.updateScene(window._Renderer3D, true);
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '3d_skybox_verify.png' });
  console.log('Screenshot saved: 3d_skybox_verify.png');

  await browser.close();
})();
