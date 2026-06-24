const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.addInitScript(() => {
    window.showDirectoryPicker = null;
  });

  await page.goto('http://localhost:8080/editor.html');
  await page.waitForFunction(() => window.editorInitialized === true, { timeout: 15000 });

  await page.evaluate(async () => {
    let m = window.SceneManager.currentScene.getAllMaterias().find(m => m.name === 'TestObject');
    if (!m) {
        const { createBaseMateria } = await import('./js/editor/MateriaFactory.js');
        m = createBaseMateria('TestObject');
        const { Transform, Gyzmo, SpriteRenderer } = await import('./js/engine/Components.js');
        const t = m.getComponent(Transform);
        t.x = 0; t.y = 50;

        const g = new Gyzmo(m);
        g.layers = [{ x: 0, y: 0, width: 100, height: 100, color: '#00ff00', name: 'Area UP' }];
        m.addComponent(g);

        // Add a sprite to verify upright orientation
        const sr = new SpriteRenderer(m);
        // Using a placeholder image or engine logo
        sr.sprite = new Image();
        sr.sprite.src = 'image/Logo_C.png';
        m.addComponent(sr);

        window.SceneManager.currentScene.addMateria(m);
        window.updateScene();
    }
    window.selectMateria(m.id);
    window.updateScene();
  });

  await page.waitForTimeout(2000); // Wait for logo to load
  await page.screenshot({ path: '/home/jules/verification/final_check_v4.png' });

  await browser.close();
})();
