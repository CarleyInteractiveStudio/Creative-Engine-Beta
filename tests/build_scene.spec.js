const { test, expect } = require('@playwright/test');

test('builds the main game scene programmatically', async ({ page }) => {
  await page.goto('http://localhost:8000/editor.html');

  // Wait for the editor to be fully initialized
  await page.waitForFunction(() => window.editorInitialized);

  // Use page.evaluate to run code in the browser context
  await page.evaluate(async () => {
    const { MateriaFactory, SceneManager, Components } = window;

    // Create a new scene
    const scene = new SceneManager.Scene();
    SceneManager.setCurrentScene(scene);

    // --- Create Game Objects using MateriaFactory ---
    const fondo = MateriaFactory.createMateria({ name: 'Fondo' });
    const paredArriba = MateriaFactory.createMateria({ name: 'ParedArriba' });
    const paredAbajo = MateriaFactory.createMateria({ name: 'ParedAbajo' });
    const paredIzquierda = MateriaFactory.createMateria({ name: 'ParedIzquierda' });
    const paredDerecha = MateriaFactory.createMateria({ name: 'ParedDerecha' });
    const jugador = MateriaFactory.createMateria({ name: 'Jugador', tag: 'Player' });
    const llave = MateriaFactory.createMateria({ name: 'Llave', tag: 'Llave' });
    const puerta = MateriaFactory.createMateria({ name: 'Puerta', tag: 'Puerta' });

    // --- Configure Components ---
    // Fondo
    const fondoTransform = fondo.getComponent(Components.Transform);
    fondoTransform.position = { x: 0, y: 0 };
    fondoTransform.scale = { x: 50, y: 37.5 };
    const fondoRenderer = fondo.addComponent(Components.SpriteRenderer);
    fondoRenderer.spriteAssetPath = 'E2E_TestGame/Assets/images/gfx/Overworld.ceSprite';
    fondoRenderer.spriteName = 'grass';

    // ParedArriba
    const paredArribaTransform = paredArriba.getComponent(Components.Transform);
    paredArribaTransform.position = { x: 0, y: -292 };
    paredArribaTransform.scale = { x: 50, y: 1 };
    const paredArribaRenderer = paredArriba.addComponent(Components.SpriteRenderer);
    paredArribaRenderer.spriteAssetPath = 'E2E_TestGame/Assets/images/gfx/Overworld.ceSprite';
    paredArribaRenderer.spriteName = 'wall';
    const paredArribaCollider = paredArriba.addComponent(Components.BoxCollider2D);
    paredArribaCollider.size = { x: 800, y: 16 };

    // ParedAbajo
    const paredAbajoTransform = paredAbajo.getComponent(Components.Transform);
    paredAbajoTransform.position = { x: 0, y: 292 };
    paredAbajoTransform.scale = { x: 50, y: 1 };
    const paredAbajoRenderer = paredAbajo.addComponent(Components.SpriteRenderer);
    paredAbajoRenderer.spriteAssetPath = 'E2E_TestGame/Assets/images/gfx/Overworld.ceSprite';
    paredAbajoRenderer.spriteName = 'wall';
    const paredAbajoCollider = paredAbajo.addComponent(Components.BoxCollider2D);
    paredAbajoCollider.size = { x: 800, y: 16 };

    // ParedIzquierda
    const paredIzquierdaTransform = paredIzquierda.getComponent(Components.Transform);
    paredIzquierdaTransform.position = { x: -392, y: 0 };
    paredIzquierdaTransform.scale = { x: 1, y: 37.5 };
    const paredIzquierdaRenderer = paredIzquierda.addComponent(Components.SpriteRenderer);
    paredIzquierdaRenderer.spriteAssetPath = 'E2E_TestGame/Assets/images/gfx/Overworld.ceSprite';
    paredIzquierdaRenderer.spriteName = 'wall';
    const paredIzquierdaCollider = paredIzquierda.addComponent(Components.BoxCollider2D);
    paredIzquierdaCollider.size = { x: 16, y: 600 };

    // ParedDerecha
    const paredDerechaTransform = paredDerecha.getComponent(Components.Transform);
    paredDerechaTransform.position = { x: 392, y: 0 };
    paredDerechaTransform.scale = { x: 1, y: 37.5 };
    const paredDerechaRenderer = paredDerecha.addComponent(Components.SpriteRenderer);
    paredDerechaRenderer.spriteAssetPath = 'E2E_TestGame/Assets/images/gfx/Overworld.ceSprite';
    paredDerechaRenderer.spriteName = 'wall';
    const paredDerechaCollider = paredDerecha.addComponent(Components.BoxCollider2D);
    paredDerechaCollider.size = { x: 16, y: 600 };

    // Jugador
    const jugadorTransform = jugador.getComponent(Components.Transform);
    jugadorTransform.position = { x: -300, y: -200 };
    const jugadorRenderer = jugador.addComponent(Components.SpriteRenderer);
    jugadorRenderer.spriteAssetPath = 'E2E_TestGame/Assets/images/gfx/character.ceSprite';
    jugadorRenderer.spriteName = 'player_down';
    const jugadorRb = jugador.addComponent(Components.Rigidbody2D);
    jugadorRb.gravityScale = 0;
    const jugadorCollider = jugador.addComponent(Components.BoxCollider2D);
    jugadorCollider.size = { x: 16, y: 16 };
    const jugadorScript = jugador.addComponent(Components.CreativeScript);
    jugadorScript.scriptName = 'ControladorJugador.ces';

    // Llave
    const llaveTransform = llave.getComponent(Components.Transform);
    llaveTransform.position = { x: 300, y: 200 };
    const llaveRenderer = llave.addComponent(Components.SpriteRenderer);
    llaveRenderer.spriteAssetPath = 'E2E_TestGame/Assets/images/gfx/objects.ceSprite';
    llaveRenderer.spriteName = 'key';
    const llaveCollider = llave.addComponent(Components.BoxCollider2D);
    llaveCollider.isTrigger = true;
    llaveCollider.size = { x: 16, y: 16 };

    // Puerta
    const puertaTransform = puerta.getComponent(Components.Transform);
    puertaTransform.position = { x: 350, y: -250 };
    const puertaRenderer = puerta.addComponent(Components.SpriteRenderer);
    puertaRenderer.spriteAssetPath = 'E2E_TestGame/Assets/images/gfx/objects.ceSprite';
    puertaRenderer.spriteName = 'door';
    const puertaCollider = puerta.addComponent(Components.BoxCollider2D);
    puertaCollider.isTrigger = true;
    puertaCollider.size = { x: 16, y: 16 };

    // --- Add Materias to Scene ---
    scene.addMateria(fondo);
    scene.addMateria(paredArriba);
    scene.addMateria(paredAbajo);
    scene.addMateria(paredIzquierda);
    scene.addMateria(paredDerecha);
    scene.addMateria(jugador);
    scene.addMateria(llave);
    scene.addMateria(puerta);

    // --- Save the Scene ---
    window.SceneManager.setCurrentSceneFileHandle(null); // Ensure it saves as a new file
    await window.saveScene();
  });

  // After saving, the browser will show a "Save As" dialog.
  // We need to handle this to save the file to the correct location.
  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => window.saveScene())
  ]);

  await download.saveAs('E2E_TestGame/Assets/sc_mapa_principal.ceScene');

});
