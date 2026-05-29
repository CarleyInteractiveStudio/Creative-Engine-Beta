
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Cargando el editor...");
  await page.goto('http://localhost:8080/editor.html');

  // Esperar a que el motor se inicialice (usando la bandera global expuesta en editor.js)
  await page.waitForFunction(() => window.editorInitialized === true, { timeout: 10000 });
  console.log("Editor inicializado.");

  // Verificar que el Renderer3D se haya instanciado
  const isRenderer3DLoaded = await page.evaluate(() => {
    return window._Renderer3D !== undefined;
  });

  if (isRenderer3DLoaded) {
    console.log("✅ Renderer3D (Creative 3D Render) cargado correctamente.");
  } else {
    console.error("❌ Renderer3D no encontrado.");
    process.exit(1);
  }

  // Verificar que el canvas 3D esté presente y visible
  const isCanvas3DVisible = await page.isVisible('#scene-canvas-3d');
  if (isCanvas3DVisible) {
    console.log("✅ Canvas 3D es visible.");
  } else {
    console.error("❌ Canvas 3D no es visible.");
    process.exit(1);
  }

  // Tomar una captura para verificar visualmente (aunque el agente no la vea directamente, sirve de registro)
  await page.screenshot({ path: 'verify_3d_render.png' });
  console.log("Captura guardada en verify_3d_render.png");

  await browser.close();
})();
