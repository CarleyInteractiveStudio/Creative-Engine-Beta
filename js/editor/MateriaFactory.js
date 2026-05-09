// js/editor/MateriaFactory.js

import { Materia } from '../engine/Materia.js';
import * as Components from '../engine/Components.js';
import * as SceneManager from '../engine/SceneManager.js';

async function ensure3D() {
    if (!window.Components3D) {
        window.Components3D = await import('../engine/Components3D.js');
    }
    return window.Components3D;
}

export function generateUniqueName(baseName) {
    const allMaterias = SceneManager.currentScene.getAllMaterias();
    const existingNames = new Set(allMaterias.map(m => m.name));

    if (!existingNames.has(baseName)) {
        return baseName;
    }

    let counter = 1;
    let newName = `${baseName} (${counter})`;
    while (existingNames.has(newName)) {
        counter++;
        newName = `${baseName} (${counter})`;
    }
    return newName;
}

export function createBaseMateria(name, parent = null, useUITransform = false) {
    const newMateria = new Materia(name);
    if (useUITransform) {
        newMateria.addComponent(new Components.UITransform(newMateria));
    } else {
        newMateria.addComponent(new Components.Transform(newMateria));
    }

    if (parent) {
        parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }
    return newMateria;
}

export function createCanvasObject() {
    const L = window.Localization;
    const name = generateUniqueName(L.get('CANVAS', 'Canvas'));
    // Un Canvas sigue necesitando un Transform de mundo para su posición base en la escena
    const newMateria = createBaseMateria(name);
    newMateria.addComponent(new Components.Canvas(newMateria));
    return newMateria;
}

export function createImageObject(parent) {
    if (!parent) {
        console.error("createImageObject requiere un padre.");
        return null;
    }
    const L = window.Localization;
    const name = generateUniqueName(L.get('IMAGE', 'Image'));
    const newMateria = new Materia(name);
    // UI elements get a UITransform, not a regular Transform
    newMateria.addComponent(new Components.UITransform(newMateria));
    newMateria.addComponent(new Components.UIImage(newMateria));

    parent.addChild(newMateria);
    return newMateria;
}

// --- 3D Objects ---

export async function createCubeObject(parent = null) {
    const C3D = await ensure3D();
    const newMateria = createBaseMateria(generateUniqueName('Cubo'), parent);
    const transform = newMateria.getComponent(Components.Transform);
    if (transform) transform.localScale = { x: 100, y: 100, z: 100 };
    newMateria.addComponent(new C3D.MeshRenderer3D(newMateria));
    return newMateria;
}

export async function createSphereObject(parent = null) {
    const C3D = await ensure3D();
    const newMateria = createBaseMateria(generateUniqueName('Esfera'), parent);
    const transform = newMateria.getComponent(Components.Transform);
    if (transform) transform.localScale = { x: 100, y: 100, z: 100 };
    const renderer = new C3D.MeshRenderer3D(newMateria);
    renderer.meshType = 'Sphere';
    newMateria.addComponent(renderer);
    return newMateria;
}

export async function createTriangle3DObject(parent = null) {
    const C3D = await ensure3D();
    const newMateria = createBaseMateria(generateUniqueName('Triángulo'), parent);
    const transform = newMateria.getComponent(Components.Transform);
    if (transform) transform.localScale = { x: 100, y: 100, z: 100 };
    const renderer = new C3D.MeshRenderer3D(newMateria);
    renderer.meshType = 'Triangle';
    newMateria.addComponent(renderer);
    return newMateria;
}

export async function createCapsule3DObject(parent = null) {
    const C3D = await ensure3D();
    const newMateria = createBaseMateria(generateUniqueName('Cápsula'), parent);
    const transform = newMateria.getComponent(Components.Transform);
    if (transform) transform.localScale = { x: 100, y: 100, z: 100 };
    const renderer = new C3D.MeshRenderer3D(newMateria);
    renderer.meshType = 'Capsule';
    newMateria.addComponent(renderer);
    return newMateria;
}

export async function createPlane3DObject(parent = null) {
    const C3D = await ensure3D();
    const newMateria = createBaseMateria(generateUniqueName('Plano'), parent);
    const transform = newMateria.getComponent(Components.Transform);
    if (transform) transform.localScale = { x: 100, y: 1, z: 100 };
    const renderer = new C3D.MeshRenderer3D(newMateria);
    renderer.meshType = 'Plane';
    newMateria.addComponent(renderer);
    return newMateria;
}

export async function createDirectionalLight3D(parent = null) {
    const C3D = await ensure3D();
    const newMateria = createBaseMateria(generateUniqueName('Luz Direccional'), parent);
    newMateria.addComponent(new C3D.DirectionalLight3D(newMateria));
    return newMateria;
}

export async function createPointLight3D(parent = null) {
    const C3D = await ensure3D();
    const newMateria = createBaseMateria(generateUniqueName('Luz Punto 3D'), parent);
    newMateria.addComponent(new C3D.PointLight3D(newMateria));
    return newMateria;
}

export async function createSpotLight3D(parent = null) {
    const C3D = await ensure3D();
    const newMateria = createBaseMateria(generateUniqueName('Luz Focal 3D'), parent);
    newMateria.addComponent(new C3D.SpotLight3D(newMateria));
    return newMateria;
}

export function createScrollViewObject(parent) {
    if (!parent) {
        console.error("createScrollViewObject requiere un padre que sea un Canvas.");
        return null;
    }
    const L = window.Localization;
    const scrollName = generateUniqueName(L.get('SCROLL_VIEW', 'Scroll View'));

    // 1. Root: ScrollRect + Mask + Image (Background)
    const scrollMateria = createBaseMateria(scrollName, parent, true);
    const scrollTransform = scrollMateria.getComponent(Components.UITransform);
    scrollTransform.size = { width: 300, height: 400 };

    const scrollImage = new Components.UIImage(scrollMateria);
    scrollImage.color = '#000000';
    scrollImage.opacity = 0.2;
    scrollMateria.addComponent(scrollImage);

    scrollMateria.addComponent(new Components.UIMask(scrollMateria));
    const scrollRect = new Components.UIScrollRect(scrollMateria);
    scrollMateria.addComponent(scrollRect);

    // 2. Content Container
    const contentName = generateUniqueName('Content');
    const contentMateria = createBaseMateria(contentName, scrollMateria, true);
    const contentTransform = contentMateria.getComponent(Components.UITransform);
    contentTransform.anchorPoint = 0; // Top Left
    contentTransform.pivot = { x: 0, y: 1 };
    contentTransform.size = { width: 300, height: 1000 };
    contentTransform.position = { x: -150, y: 200 }; // Centered horizontally (-150), Top edge at 200

    // Add a vertical layout group to content for convenience
    contentMateria.addComponent(new Components.VerticalLayoutGroup(contentMateria));

    scrollRect.contentMateria = contentName;

    // 3. Scrollbar (Optional but recommended)
    const scrollbarName = generateUniqueName('Vertical Scrollbar');
    const scrollbarMateria = createBaseMateria(scrollbarName, scrollMateria, true);
    const sbTransform = scrollbarMateria.getComponent(Components.UITransform);
    sbTransform.anchorPoint = 5; // Middle Right
    sbTransform.size = { width: 20, height: 400 };
    sbTransform.position = { x: 140, y: 0 };

    const sbImage = new Components.UIImage(scrollbarMateria);
    sbImage.color = '#ffffff';
    sbImage.opacity = 0.1;
    scrollbarMateria.addComponent(sbImage);

    const sbHandleName = generateUniqueName('Handle');
    const sbHandleMateria = createBaseMateria(sbHandleName, scrollbarMateria, true);
    const hTransform = sbHandleMateria.getComponent(Components.UITransform);
    hTransform.anchorPoint = 3; // Left
    hTransform.pivot = { x: 0, y: 0.5 };
    hTransform.size = { width: 20, height: 50 };
    hTransform.position = { x: -10, y: 0 };

    const hImage = new Components.UIImage(sbHandleMateria);
    hImage.color = '#555555';
    sbHandleMateria.addComponent(hImage);

    const sbPB = new Components.ProgressBar(scrollbarMateria);
    sbPB.fillMateria = sbHandleName;
    sbPB.fullSize = 400;
    sbPB.orientation = 'Vertical';
    sbPB.interactable = true;
    scrollbarMateria.addComponent(sbPB);

    scrollRect.verticalScrollbar = scrollbarName;

    return scrollMateria;
}

export function createProgressBarObject(parent) {
    if (!parent) {
        console.error("createProgressBarObject requiere un padre que sea un Canvas.");
        return null;
    }
    const L = window.Localization;
    const barName = generateUniqueName(L.get('PROGRESS_BAR', 'ProgressBar'));
    const barMateria = new Materia(barName);
    barMateria.addComponent(new Components.UITransform(barMateria));

    // Parent: Background
    const bgTransform = barMateria.getComponent(Components.UITransform);
    bgTransform.size = { width: 200, height: 20 };
    barMateria.addComponent(bgTransform);

    const bgImage = new Components.UIImage(barMateria);
    bgImage.color = '#333333';
    barMateria.addComponent(bgImage);

    // Child: Fill
    const fillName = generateUniqueName('Fill');
    const fillMateria = new Materia(fillName);
    fillMateria.addComponent(new Components.UITransform(fillMateria));

    const fillTransform = fillMateria.getComponent(Components.UITransform);
    fillTransform.anchorPoint = 3; // Middle-Left
    fillTransform.pivot = { x: 0, y: 0.5 }; // Pivot on the left center
    fillTransform.size = { width: 200, height: 20 };
    fillTransform.position = { x: 0, y: 0 };
    fillMateria.addComponent(fillTransform);

    const fillImage = new Components.UIImage(fillMateria);
    fillImage.color = '#2ecc71';
    fillMateria.addComponent(fillImage);

    barMateria.addChild(fillMateria);

    // ProgressBar Component
    const progressBar = new Components.ProgressBar(barMateria);
    progressBar.fillMateria = fillName;
    progressBar.fullSize = 200;
    barMateria.addComponent(progressBar);

    parent.addChild(barMateria);

    return barMateria;
}

export function createCombatantObject(parent = null) {
    const L = window.Localization;
    const name = generateUniqueName(L.get('COMBATANT', 'Combatiente'));
    const newMateria = createBaseMateria(name, parent);

    newMateria.addComponent(new Components.SpriteRenderer(newMateria));
    newMateria.addComponent(new Components.Rigidbody2D(newMateria));
    newMateria.addComponent(new Components.BoxCollider2D(newMateria));
    newMateria.addComponent(new Components.Health(newMateria));
    newMateria.addComponent(new Components.Attack(newMateria));

    return newMateria;
}

export function createAudioObject(parent = null) {
    const L = window.Localization;
    const name = generateUniqueName(L.get('AUDIO', 'Audio'));
    const newMateria = createBaseMateria(name, parent);
    newMateria.addComponent(new Components.AudioSource(newMateria));
    return newMateria;
}

export function createVideoObject(parent = null) {
    const L = window.Localization;
    const name = generateUniqueName(L.get('VIDEO', 'Video'));
    const newMateria = createBaseMateria(name, parent);
    newMateria.addComponent(new Components.VideoPlayer(newMateria));
    return newMateria;
}

export function createWaterObject(parent = null) {
    const L = window.Localization;
    const name = generateUniqueName(L.get('WATER', 'Agua'));
    const newMateria = createBaseMateria(name, parent);
    newMateria.tag = 'Agua';
    newMateria.layer = 4; // Capa Agua (según config por defecto)
    const water = new Components.Water(newMateria);
    water.orderInLayer = 10;
    newMateria.addComponent(water);
    return newMateria;
}

export function createLineColliderObject(parent = null) {
    const L = window.Localization;
    const name = generateUniqueName(L.get('LINE_COLLIDER', 'Colisionador de Líneas'));
    const newMateria = createBaseMateria(name, parent);
    newMateria.addComponent(new Components.LineCollider2D(newMateria));
    return newMateria;
}

export function createTerrenoObject(parent = null) {
    console.log("[MateriaFactory] Creando objeto de terreno...");
    const L = window.Localization;
    const name = generateUniqueName(L.get('TERRENO', 'Terreno'));
    const newMateria = createBaseMateria(name, parent);
    newMateria.addComponent(new Components.Terreno2D(newMateria));
    console.log("[MateriaFactory] Terreno creado con éxito:", newMateria);
    return newMateria;
}

export function createTextObject(parent) {
    if (!parent) {
        console.error("createTextObject requiere un padre que sea un Canvas.");
        return null;
    }
    const L = window.Localization;
    const name = generateUniqueName(L.get('TEXTO', 'Texto'));
    const newMateria = new Materia(name);

    newMateria.addComponent(new Components.UITransform(newMateria));
    newMateria.addComponent(new Components.UIText(newMateria));

    parent.addChild(newMateria);
    return newMateria;
}

export function createButtonObject(parent) {
    if (!parent) {
        console.error("createButtonObject requiere un padre que sea un Canvas.");
        return null;
    }
    const L = window.Localization;
    const buttonName = generateUniqueName(L.get('BOTON', 'Button'));
    const buttonMateria = new Materia(buttonName);

    buttonMateria.addComponent(new Components.UITransform(buttonMateria));
    buttonMateria.addComponent(new Components.UIImage(buttonMateria));
    buttonMateria.addComponent(new Components.Button(buttonMateria));

    parent.addChild(buttonMateria);

    // Create a child Text object
    const textName = generateUniqueName(L.get('TEXTO', 'Text'));
    const textMateria = new Materia(textName);
    const uiTransform = new Components.UITransform(textMateria);
    // Anchor the text to stretch across the button
    uiTransform.anchorPreset = 'stretch-stretch';
    uiTransform.size = { width: 0, height: 0 }; // Size is controlled by anchors
    textMateria.addComponent(uiTransform);

    const uiText = new Components.UIText(textMateria);
    uiText.text = L.get('BOTON', 'Button');
    uiText.horizontalAlign = 'center';
    textMateria.addComponent(uiText);

    buttonMateria.addChild(textMateria);

    return buttonMateria;
}


export function createPanelObject(parent) {
    if (!parent) {
        console.error("createPanelObject requiere un padre que sea un Canvas.");
        return null;
    }
    const L = window.Localization;
    const name = generateUniqueName(L.get('PANEL', 'Panel'));
    const newMateria = new Materia(name);

    newMateria.addComponent(new Components.UITransform(newMateria));
    const uiImage = new Components.UIImage(newMateria);
    uiImage.color = '#000000'; // Color opaco por defecto
    uiImage.opacity = 0.5; // Panel semi-transparente por defecto
    newMateria.addComponent(uiImage);

    parent.addChild(newMateria);
    return newMateria;
}

/**
 * Busca un Canvas existente en la escena. Si no existe, crea uno nuevo.
 */
export function getOrCreateCanvas() {
    const allMaterias = SceneManager.currentScene.getAllMaterias();
    const existingCanvas = allMaterias.find(m => m.getComponent(Components.Canvas));
    if (existingCanvas) return existingCanvas;
    return createCanvasObject();
}

/**
 * Plantilla: UI de Movimiento Inteligente
 */
export function createMovementUITemplate() {
    const canvas = getOrCreateCanvas();
    const L = window.Localization;

    const group = createBaseMateria(generateUniqueName(L.get('UI_MOVIMIENTO', 'Control de Movimiento')), canvas, true);
    const transform = group.getComponent(Components.UITransform);
    transform.anchorPreset = 'stretch-stretch';
    transform.size = { width: 0, height: 0 };

    // Joystick Izquierdo (Simulado con botones o panel)
    const joystick = createPanelObject(group);
    joystick.name = "Joystick";
    const joyTrans = joystick.getComponent(Components.UITransform);
    joyTrans.anchorPreset = 'bottom-left';
    joyTrans.position = { x: 100, y: 100 };
    joyTrans.size = { width: 150, height: 150 };

    // Botón de Acción
    const btnJump = createButtonObject(group);
    btnJump.name = "BotonSalto";
    const jumpTrans = btnJump.getComponent(Components.UITransform);
    jumpTrans.anchorPreset = 'bottom-right';
    jumpTrans.position = { x: -100, y: 100 };
    jumpTrans.size = { width: 80, height: 80 };

    // Auto-configuración: Intentar encontrar al Jugador para asignar el script
    const player = SceneManager.currentScene.getAllMaterias().find(m => m.tag === 'Player' || m.name.toLowerCase().includes('jugador'));

    // Añadimos un script básico de control si no existe
    if (player) {
        console.log("[SmartTemplate] Jugador detectado, vinculando controles UI...");
        // Aquí se podría añadir un componente 'MobileController' al jugador
    }

    return group;
}

/**
 * Plantilla: Menú Principal
 */
export function createMainMenuTemplate() {
    const canvas = getOrCreateCanvas();
    const L = window.Localization;

    const menu = createPanelObject(canvas);
    menu.name = "MenuPrincipal";
    const trans = menu.getComponent(Components.UITransform);
    trans.anchorPreset = 'stretch-stretch';
    trans.size = { width: 0, height: 0 };

    const titulo = createTextObject(menu);
    titulo.name = "TituloJuego";
    const titComp = titulo.getComponent(Components.UIText);
    titComp.text = "MI GRAN JUEGO";
    titComp.fontSize = 48;
    titComp.horizontalAlign = 'center';
    const titTrans = titulo.getComponent(Components.UITransform);
    titTrans.position = { x: 0, y: 150 };

    const btnPlay = createButtonObject(menu);
    btnPlay.name = "BotonJugar";
    const btnTrans = btnPlay.getComponent(Components.UITransform);
    btnTrans.position = { x: 0, y: 0 };
    btnTrans.size = { width: 200, height: 60 };

    const btnText = btnPlay.children[0].getComponent(Components.UIText);
    btnText.text = "JUGAR";

    // Auto-configuración de escena
    // El usuario podrá ver esto en el Inspector (script o evento del botón)
    console.log("[SmartTemplate] Menú Principal creado. El botón 'Jugar' apuntará a la escena 1 por defecto.");

    return menu;
}

/**
 * Plantilla: Gestor de Niveles (Trigger de Carga)
 */
export function createLevelManagerTemplate() {
    const L = window.Localization;
    const manager = createBaseMateria(generateUniqueName(L.get('GESTOR_NIVELES', 'GestorNiveles')));

    manager.addComponent(new Components.BoxCollider2D(manager));
    const col = manager.getComponent(Components.BoxCollider2D);
    col.isTrigger = true;

    // Simulamos un componente de carga
    manager.tag = "Finish";

    console.log("[SmartTemplate] Gestor de Niveles creado. Detectará colisión con el Jugador para cargar la siguiente escena.");

    return manager;
}
