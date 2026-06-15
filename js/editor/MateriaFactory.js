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

export async function createSkinnedMeshObject(modelPath, parent = null) {
    const C3D = await ensure3D();
    const { ModelLoader3D } = await import('../engine/ModelLoader3D.js');

    const modelData = await ModelLoader3D.loadModel(modelPath, window.projectsDirHandle);
    if (!modelData) return null;

    const rootName = modelPath.split('/').pop().split('.')[0];
    const rootMateria = createBaseMateria(generateUniqueName(rootName), parent);

    const nodeMaterias = [];

    // 1. Create Materias for each node
    if (modelData.nodes) {
        for (let i = 0; i < modelData.nodes.length; i++) {
            const node = modelData.nodes[i];
            const nodeMtr = new Materia(node.name);
            nodeMtr.addComponent(new Components.Transform(nodeMtr));
            const transform = nodeMtr.getComponent(Components.Transform);
            transform.localPosition = { x: node.translation[0], y: node.translation[1], z: node.translation[2] };
            transform.localRotation = { x: 0, y: 0, z: 0 };
            transform.localScale = { x: node.scale[0], y: node.scale[1], z: node.scale[2] };

            nodeMaterias.push(nodeMtr);
        }

        // 2. Setup Hierarchy and Meshes
        for (let i = 0; i < modelData.nodes.length; i++) {
            const node = modelData.nodes[i];
            const nodeMtr = nodeMaterias[i];

            if (node.children) {
                node.children.forEach(childIdx => {
                    nodeMaterias[childIdx].setParent(nodeMtr, false);
                });
            }

            if (node.mesh !== undefined) {
                const meshData = modelData.meshes[node.mesh];
                const primitive = meshData.primitives[0];

                const renderer = new C3D.SkinnedMeshRenderer3D(nodeMtr);
                renderer.modelPath = modelPath;
                renderer.isLoaded = false;

                if (window._Renderer3D) {
                    const gl = window._Renderer3D.gl;
                    renderer.indexCount = primitive.indices ? primitive.indices.length : primitive.positions.length / 3;
                    renderer.buffers = {
                        positions: gl.createBuffer(),
                        indices: primitive.indices ? gl.createBuffer() : null,
                        normals: primitive.normals ? gl.createBuffer() : null,
                        joints: primitive.joints ? gl.createBuffer() : null,
                        weights: primitive.weights ? gl.createBuffer() : null
                    };

                    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.positions);
                    gl.bufferData(gl.ARRAY_BUFFER, primitive.positions, gl.STATIC_DRAW);

                    if (renderer.buffers.indices) {
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.buffers.indices);
                        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, primitive.indices, gl.STATIC_DRAW);
                    }

                    if (renderer.buffers.normals) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.normals);
                        gl.bufferData(gl.ARRAY_BUFFER, primitive.normals, gl.STATIC_DRAW);
                    }

                    if (renderer.buffers.joints) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.joints);
                        const jointsF32 = primitive.joints instanceof Float32Array ? primitive.joints : new Float32Array(primitive.joints);
                        gl.bufferData(gl.ARRAY_BUFFER, jointsF32, gl.STATIC_DRAW);

                        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.weights);
                        const weightsF32 = primitive.weights instanceof Float32Array ? primitive.weights : new Float32Array(primitive.weights);
                        gl.bufferData(gl.ARRAY_BUFFER, weightsF32, gl.STATIC_DRAW);
                    }

                    if (node.skin !== undefined) {
                        const skin = modelData.skins[node.skin];
                        renderer.skeleton = {
                            joints: skin.joints.map(idx => nodeMaterias[idx].id),
                            inverseBindMatrices: skin.inverseBindMatrices
                        };
                    }
                    renderer.isLoaded = true;
                }
                nodeMtr.addComponent(renderer);
            }
        }

        // 3. Parent top-level nodes to rootMateria
        for (let i = 0; i < modelData.nodes.length; i++) {
            if (!nodeMaterias[i].parent) {
                nodeMaterias[i].setParent(rootMateria, false);
            }
        }
    } else {
        // Flat model (OBJ)
        const renderer = new C3D.SkinnedMeshRenderer3D(rootMateria);
        renderer.modelPath = modelPath;
        if (window._Renderer3D) {
            const gl = window._Renderer3D.gl;
            renderer.indexCount = modelData.indices ? modelData.indices.length : modelData.positions.length / 3;
            renderer.buffers = {
                positions: gl.createBuffer(),
                indices: modelData.indices ? gl.createBuffer() : null,
                normals: modelData.normals ? gl.createBuffer() : null
            };
            gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.positions);
            gl.bufferData(gl.ARRAY_BUFFER, modelData.positions, gl.STATIC_DRAW);
            if (renderer.buffers.indices) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.buffers.indices);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
            }
            if (renderer.buffers.normals) {
                gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.normals);
                gl.bufferData(gl.ARRAY_BUFFER, modelData.normals, gl.STATIC_DRAW);
            }
            renderer.isLoaded = true;
        }
        rootMateria.addComponent(renderer);
    }

    if (modelData.animations && modelData.animations.length > 0) {
        const animator = new C3D.Animator3D(rootMateria);
        animator.animations = modelData.animations.map(a => ({
            ...a,
            channels: a.channels.map(c => ({
                ...c,
                node: nodeMaterias[c.node] ? nodeMaterias[c.node].id : rootMateria.id
            }))
        }));
        rootMateria.addComponent(animator);
        animator.play();
    }

    return rootMateria;
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

    // 1. Contenedor del Joystick (Área de Arrastre)
    const joyArea = createPanelObject(group);
    joyArea.name = "JoystickArea";
    const areaTrans = joyArea.getComponent(Components.UITransform);
    areaTrans.anchorPreset = 'bottom-left';
    areaTrans.position = { x: 150, y: 150 };
    areaTrans.size = { width: 250, height: 250 };
    joyArea.getComponent(Components.UIImage).opacity = 0.05; // Almost invisible

    // 2. Fondo del Joystick
    const joyBg = createPanelObject(joyArea);
    joyBg.name = "JoystickBg";
    const bgTrans = joyBg.getComponent(Components.UITransform);
    bgTrans.size = { width: 150, height: 150 };
    const bgImg = joyBg.getComponent(Components.UIImage);
    bgImg.color = '#ffffff';
    bgImg.opacity = 0.2;

    // 3. El Punto (Handle)
    const handle = createPanelObject(joyBg);
    handle.name = "JoystickHandle";
    const hTrans = handle.getComponent(Components.UITransform);
    hTrans.size = { width: 70, height: 70 };
    const hImg = handle.getComponent(Components.UIImage);
    hImg.color = '#0e639c';
    hImg.opacity = 0.8;

    // Añadir el Controlador
    const controller = new Components.UIController(joyArea);
    controller.type = 'Joystick';
    controller.joystickRadius = 75;
    joyArea.addComponent(controller);

    // 4. Botón de Acción a la Derecha
    const btnJump = createButtonObject(group);
    btnJump.name = "BotonSalto";
    const jumpTrans = btnJump.getComponent(Components.UITransform);
    jumpTrans.anchorPreset = 'bottom-right';
    jumpTrans.position = { x: -100, y: 150 };
    jumpTrans.size = { width: 100, height: 100 };

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

/**
 * Plantilla: Sistema de Inventario UI
 */
export async function createDefaultCharacter(parent = null) {
    const C3D = await ensure3D();
    const root = createBaseMateria('Personaje Humanoide', parent);
    const transform = root.getComponent(Components.Transform);
    transform.localPosition = { x: 0, y: -10, z: 0 };

    // 1. Hierarchal Bone Structure (Skeleton)
    const hip = createBaseMateria('Cadera', root);
    hip.getComponent(Components.Transform).localPosition = { x: 0, y: 100, z: 0 };

    const torso = createBaseMateria('Torso', hip);
    torso.getComponent(Components.Transform).localPosition = { x: 0, y: 30, z: 0 };

    const head = createBaseMateria('Cabeza', torso);
    head.getComponent(Components.Transform).localPosition = { x: 0, y: 40, z: 0 };

    const eyeL = createBaseMateria('Ojo_I', head);
    eyeL.getComponent(Components.Transform).localPosition = { x: -8, y: 5, z: 12 };
    const eyeR = createBaseMateria('Ojo_D', head);
    eyeR.getComponent(Components.Transform).localPosition = { x: 8, y: 5, z: 12 };

    const armL = createBaseMateria('Brazo_I', torso);
    armL.getComponent(Components.Transform).localPosition = { x: -30, y: 0, z: 0 };
    const handL = createBaseMateria('Mano_I', armL);
    handL.getComponent(Components.Transform).localPosition = { x: 0, y: -30, z: 0 };

    const armR = createBaseMateria('Brazo_D', torso);
    armR.getComponent(Components.Transform).localPosition = { x: 30, y: 0, z: 0 };
    const handR = createBaseMateria('Mano_D', armR);
    handR.getComponent(Components.Transform).localPosition = { x: 0, y: -30, z: 0 };

    const legL = createBaseMateria('Pierna_I', hip);
    legL.getComponent(Components.Transform).localPosition = { x: -15, y: -20, z: 0 };
    const footL = createBaseMateria('Pie_I', legL);
    footL.getComponent(Components.Transform).localPosition = { x: 0, y: -80, z: 0 };

    const legR = createBaseMateria('Pierna_D', hip);
    legR.getComponent(Components.Transform).localPosition = { x: 15, y: -20, z: 0 };
    const footR = createBaseMateria('Pie_D', legR);
    footR.getComponent(Components.Transform).localPosition = { x: 0, y: -80, z: 0 };

    // 2. Skinned Mesh Data (Minimal Humanoid Quad-Mesh)
    const renderer = new C3D.SkinnedMeshRenderer3D(root);

    // Joint IDs for weights
    const jointIds = [hip.id, torso.id, head.id, armL.id, handL.id, armR.id, handR.id, legL.id, footL.id, legR.id, footR.id];

    // We create a simple boxy mesh (24 vertices) and weight each vertex to the nearest bone
    const pos = new Float32Array(24 * 3);
    const joints = new Float32Array(24 * 4);
    const weights = new Float32Array(24 * 4);
    for(let i=0; i<24; i++) {
        // Vertex pos (normalized box)
        pos[i*3] = ((i%2)-0.5)*40; pos[i*3+1] = (Math.floor(i/2)%2)*100; pos[i*3+2] = (Math.floor(i/4)%2-0.5)*20;
        // Assign to torso mostly for this simple example
        joints[i*4] = 1; weights[i*4] = 1.0;
    }

    if (window._Renderer3D) {
        const gl = window._Renderer3D.gl;
        renderer.buffers = {
            positions: gl.createBuffer(),
            joints: gl.createBuffer(),
            weights: gl.createBuffer()
        };
        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.positions);
        gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.joints);
        gl.bufferData(gl.ARRAY_BUFFER, joints, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.weights);
        gl.bufferData(gl.ARRAY_BUFFER, weights, gl.STATIC_DRAW);

        renderer.indexCount = 24;
        renderer.skeleton = { joints: jointIds, inverseBindMatrices: new Float32Array(jointIds.length * 16) };
        // Pre-fill inverseBindMatrices with identity
        for(let i=0; i<jointIds.length; i++) renderer.skeleton.inverseBindMatrices.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], i*16);

        renderer.cpuPositions = pos;
        renderer.isLoaded = true;
    }

    root.addComponent(renderer);

    // 3. Component Systems
    root.addComponent(new C3D.Rigidbody3D(root));
    const rb = root.getComponent(C3D.Rigidbody3D);
    if(rb) rb.drag = 0.1;

    root.addComponent(new C3D.BoxCollider3D(root));
    const col = root.getComponent(C3D.BoxCollider3D);
    if(col) col.size = { x: 50, y: 180, z: 50 };

    root.addComponent(new C3D.HumanoidPhysics3D(root));
    root.addComponent(new C3D.ThirdPersonController3D(root));
    root.addComponent(new C3D.HealthController3D(root));
    root.addComponent(new C3D.MovementControl3D(root));

    // Register bones in HumanoidPhysics3D
    const hp = root.getComponent(C3D.HumanoidPhysics3D);
    if(hp) {
        hp.leftLegChain = [hip, legL, footL];
        hp.rightLegChain = [hip, legR, footR];
    }

    return root;
}

export async function createTestCircuit(parent = null) {
    const root = createBaseMateria('Circuito_Pruebas', parent);
    const L = window.Localization;

    // 1. Ground Plane
    const ground = await createPlane3DObject(root);
    ground.name = "Suelo";
    ground.getComponent(Components.Transform).localScale = { x: 2000, y: 1, z: 2000 };

    // 2. Stairs
    const stairsRoot = createBaseMateria('Escaleras', root);
    for(let i=0; i<10; i++) {
        const step = await createCubeObject(stairsRoot);
        step.name = `Escalon_${i}`;
        const t = step.getComponent(Components.Transform);
        t.localPosition = { x: 0, y: -i * 20, z: i * 40 }; // -Y is UP
        t.localScale = { x: 200, y: 20, z: 40 };
    }

    // 3. Narrow Corridor
    const corridor = createBaseMateria('Pasillo_Estrecho', root);
    const wallL = await createCubeObject(corridor);
    wallL.name = "Pared_I";
    const tL = wallL.getComponent(Components.Transform);
    tL.localPosition = { x: -45, y: -100, z: 500 };
    tL.localScale = { x: 10, y: 200, z: 400 };

    const wallR = await createCubeObject(corridor);
    wallR.name = "Pared_D";
    const tR = wallR.getComponent(Components.Transform);
    tR.localPosition = { x: 45, y: -100, z: 500 };
    tR.localScale = { x: 10, y: 200, z: 400 };

    // 4. Obstacles
    const obstacles = createBaseMateria('Obstaculos', root);
    const box = await createCubeObject(obstacles);
    box.localPosition = { x: 200, y: -25, z: 200 };
    box.localScale = { x: 50, y: 50, z: 50 };

    return root;
}

export function createInventoryUITemplate() {
    const canvas = getOrCreateCanvas();
    const L = window.Localization;

    const invPanel = createPanelObject(canvas);
    invPanel.name = "PanelInventario";
    const trans = invPanel.getComponent(Components.UITransform);
    trans.anchorPreset = 'center-middle';
    trans.size = { width: 400, height: 300 };

    const titulo = createTextObject(invPanel);
    titulo.name = "TituloInventario";
    const titComp = titulo.getComponent(Components.UIText);
    titComp.text = "INVENTARIO";
    titComp.horizontalAlign = 'center';
    const titTrans = titulo.getComponent(Components.UITransform);
    titTrans.position = { x: 0, y: 120 };

    const grid = createBaseMateria("GridItems", invPanel, true);
    const gridTrans = grid.getComponent(Components.UITransform);
    gridTrans.size = { width: 350, height: 200 };
    grid.addComponent(new Components.GridLayoutGroup(grid));

    // Crear 8 espacios de ejemplo
    for(let i=0; i<8; i++) {
        const slot = createPanelObject(grid);
        slot.name = "Slot_" + i;
        const slotImg = slot.getComponent(Components.UIImage);
        slotImg.opacity = 0.3;
    }

    console.log("[SmartTemplate] Sistema de Inventario UI creado.");
    return invPanel;
}
