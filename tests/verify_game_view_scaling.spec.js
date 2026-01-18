const { test, expect } = require('@playwright/test');

test.describe('Game View UI Scaling Verification', () => {
  let server;

  test.beforeAll(async () => {
    // Iniciar un servidor local para servir editor.html
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
        if (filePath.endsWith('.js')) {
            contentType = 'application/javascript';
        } else if (filePath.endsWith('.css')) {
            contentType = 'text/css';
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    await new Promise(resolve => server.listen(8000, resolve));
    console.log('Servidor de prueba iniciado en http://localhost:8000');
  });

  test.afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    console.log('Servidor de prueba detenido.');
  });

  test('Game view correctly scales a Screen Space canvas', async ({ page }) => {
    await page.goto('http://localhost:8000/editor.html');

    // Esperar a que el editor esté completamente inicializado
    await page.waitForFunction(() => window.editorInitialized);

    // 1. Crear programáticamente una escena con un Canvas y una Imagen UI
    await page.evaluate(() => {
        const { SceneManager, MateriaFactory, Components } = window;
        SceneManager.clearScene();

        // Crear un Canvas 'Screen Space'
        const canvasMateria = MateriaFactory.createCanvasObject();
        canvasMateria.getComponent(Components.Canvas).referenceResolution = { width: 1024, height: 768 };

        // Crear una imagen que ocupe la mitad superior de la pantalla
        const imageMateria = MateriaFactory.createImageObject(canvasMateria);
        const imageTransform = imageMateria.getComponent(Components.UITransform);
        imageTransform.anchorPoint = 1; // Ancla arriba-centro
        imageTransform.position = { x: 0, y: 0 };
        imageTransform.size = { width: 1024, height: 384 }; // La mitad de la altura de referencia

        const uiImage = imageMateria.getComponent(Components.UIImage);
        uiImage.color = '#ff00ff'; // Un color brillante para que sea fácil de ver

        window.updateHierarchy();
    });

    // 2. Cambiar a la pestaña "Juego"
    await page.click('button[data-view="game-content"]');

    // Darle un momento para que el canvas se redimensione y renderice
    await page.waitForTimeout(500);

    // 3. Tomar una captura de pantalla para la verificación visual
    await page.screenshot({ path: 'tests/output/game_view_scaling_screenspace.png' });

    console.log('Captura de pantalla de Screen Space guardada en tests/output/game_view_scaling_screenspace.png');
  });

  test('Game view correctly scales a World Space canvas', async ({ page }) => {
    await page.goto('http://localhost:8000/editor.html');
    await page.waitForFunction(() => window.editorInitialized);

    // 1. Crear una escena con un Canvas 'World Space'
    await page.evaluate(() => {
        const { SceneManager, MateriaFactory, Components } = window;
        SceneManager.clearScene();

        // Crear un Canvas y configurarlo a 'World Space'
        const canvasMateria = MateriaFactory.createCanvasObject();
        const canvasComponent = canvasMateria.getComponent(Components.Canvas);
        canvasComponent.renderMode = 'World Space';
        canvasComponent.size = { x: 400, y: 300 }; // Un tamaño diferente para probar el escalado

        // Crear una imagen que ocupe el cuadrante inferior derecho
        const imageMateria = MateriaFactory.createImageObject(canvasMateria);
        const imageTransform = imageMateria.getComponent(Components.UITransform);
        imageTransform.anchorPoint = 8; // Ancla abajo-derecha
        imageTransform.position = { x: 0, y: 0 };
        imageTransform.size = { width: 200, height: 150 };

        const uiImage = imageMateria.getComponent(Components.UIImage);
        uiImage.color = '#00ffff'; // Cian

        window.updateHierarchy();
    });

    // 2. Cambiar a la pestaña "Juego"
    await page.click('button[data-view="game-content"]');
    await page.waitForTimeout(500);

    // 3. Tomar captura de pantalla
    await page.screenshot({ path: 'tests/output/game_view_scaling_worldspace.png' });
    console.log('Captura de pantalla de World Space guardada en tests/output/game_view_scaling_worldspace.png');
  });
});
