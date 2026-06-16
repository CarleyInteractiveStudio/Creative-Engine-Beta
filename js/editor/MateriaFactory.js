// js/editor/MateriaFactory.js

import { Materia } from '../engine/Materia.js';
import * as Components from '../engine/Components.js';
import * as SceneManager from '../engine/SceneManager.js';

async function ensure3D() {
    if (!window.Components3D) window.Components3D = await import('../engine/Components3D.js');
    return window.Components3D;
}

export function generateUniqueName(baseName) {
    const existingNames = new Set(SceneManager.currentScene.getAllMaterias().map(m => m.name));
    if (!existingNames.has(baseName)) return baseName;
    let counter = 1;
    while (existingNames.has(`${baseName} (${counter})`)) counter++;
    return `${baseName} (${counter})`;
}

export function createBaseMateria(name, parent = null, useUITransform = false) {
    const mtr = new Materia(name);
    mtr.addComponent(useUITransform ? new Components.UITransform(mtr) : new Components.Transform(mtr));
    if (parent) parent.addChild(mtr);
    else SceneManager.currentScene.addMateria(mtr);
    return mtr;
}

export function createCanvasObject() {
    const mtr = createBaseMateria(generateUniqueName('Canvas'));
    mtr.addComponent(new Components.Canvas(mtr));
    return mtr;
}

export function createImageObject(parent) {
    const mtr = new Materia(generateUniqueName('Image'));
    mtr.addComponent(new Components.UITransform(mtr));
    mtr.addComponent(new Components.UIImage(mtr));
    parent.addChild(mtr);
    return mtr;
}

// --- 3D Objects ---

export async function createCubeObject(parent = null, color = '#ffffff') {
    const C3D = await ensure3D();
    const mtr = createBaseMateria(generateUniqueName('Cubo'), parent);
    mtr.getComponent(Components.Transform).localScale = { x: 100, y: 100, z: 100 };
    const renderer = new C3D.MeshRenderer3D(mtr);
    renderer.color = color;
    mtr.addComponent(renderer);
    return mtr;
}

export async function createSphereObject(parent = null) {
    const C3D = await ensure3D();
    const mtr = createBaseMateria(generateUniqueName('Esfera'), parent);
    mtr.getComponent(Components.Transform).localScale = { x: 100, y: 100, z: 100 };
    const renderer = new C3D.MeshRenderer3D(mtr);
    renderer.meshType = 'Sphere';
    mtr.addComponent(renderer);
    return mtr;
}

export async function createTriangle3DObject(parent = null) {
    const C3D = await ensure3D();
    const mtr = createBaseMateria(generateUniqueName('Triángulo'), parent);
    mtr.getComponent(Components.Transform).localScale = { x: 100, y: 100, z: 100 };
    const renderer = new C3D.MeshRenderer3D(mtr);
    renderer.meshType = 'Triangle';
    mtr.addComponent(renderer);
    return mtr;
}

export async function createCapsule3DObject(parent = null) {
    const C3D = await ensure3D();
    const mtr = createBaseMateria(generateUniqueName('Cápsula'), parent);
    mtr.getComponent(Components.Transform).localScale = { x: 100, y: 100, z: 100 };
    const renderer = new C3D.MeshRenderer3D(mtr);
    renderer.meshType = 'Capsule';
    mtr.addComponent(renderer);
    return mtr;
}

export async function createPlane3DObject(parent = null) {
    const C3D = await ensure3D();
    const mtr = createBaseMateria(generateUniqueName('Plano'), parent);
    mtr.getComponent(Components.Transform).localScale = { x: 100, y: 1, z: 100 };
    const renderer = new C3D.MeshRenderer3D(mtr);
    renderer.meshType = 'Plane';
    mtr.addComponent(renderer);
    return mtr;
}

export async function createDirectionalLight3D(parent = null) {
    const C3D = await ensure3D();
    const mtr = createBaseMateria(generateUniqueName('Luz Direccional'), parent);
    mtr.addComponent(new C3D.DirectionalLight3D(mtr));
    return mtr;
}

export async function createPointLight3D(parent = null) {
    const C3D = await ensure3D();
    const mtr = createBaseMateria(generateUniqueName('Luz Punto 3D'), parent);
    mtr.addComponent(new C3D.PointLight3D(mtr));
    return mtr;
}

export async function createSpotLight3D(parent = null) {
    const C3D = await ensure3D();
    const mtr = createBaseMateria(generateUniqueName('Luz Focal 3D'), parent);
    mtr.addComponent(new C3D.SpotLight3D(mtr));
    return mtr;
}

export async function createSkinnedMeshObject(modelPath, parent = null) {
    const C3D = await ensure3D();
    const { ModelLoader3D } = await import('../engine/ModelLoader3D.js');
    const modelData = await ModelLoader3D.loadModel(modelPath, window.projectsDirHandle);
    if (!modelData) return null;

    const rootName = modelPath.split('/').pop().split('.')[0];
    const rootMateria = createBaseMateria(generateUniqueName(rootName), parent);
    const nodeMaterias = [];

    if (modelData.nodes) {
        for (const node of modelData.nodes) {
            const nodeMtr = new Materia(node.name);
            nodeMtr.addComponent(new Components.Transform(nodeMtr));
            const t = nodeMtr.getComponent(Components.Transform);
            t.localPosition = { x: node.translation[0], y: node.translation[1], z: node.translation[2] };
            t.localScale = { x: node.scale[0], y: node.scale[1], z: node.scale[2] };
            nodeMaterias.push(nodeMtr);
        }

        for (let i = 0; i < modelData.nodes.length; i++) {
            const node = modelData.nodes[i];
            const nodeMtr = nodeMaterias[i];
            if (node.children) node.children.forEach(childIdx => nodeMaterias[childIdx].setParent(nodeMtr, false));
            if (node.mesh !== undefined) {
                const primitive = modelData.meshes[node.mesh].primitives[0];
                const renderer = new C3D.SkinnedMeshRenderer3D(nodeMtr);
                renderer.modelPath = modelPath;
                if (window._Renderer3D) {
                    const gl = window._Renderer3D.gl;
                    renderer.indexCount = primitive.indices ? primitive.indices.length : primitive.positions.length / 3;
                    renderer.buffers = {
                        positions: gl.createBuffer(), indices: primitive.indices ? gl.createBuffer() : null,
                        normals: primitive.normals ? gl.createBuffer() : null, joints: primitive.joints ? gl.createBuffer() : null,
                        weights: primitive.weights ? gl.createBuffer() : null
                    };
                    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.positions); gl.bufferData(gl.ARRAY_BUFFER, primitive.positions, gl.STATIC_DRAW);
                    if (renderer.buffers.indices) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.buffers.indices); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, primitive.indices, gl.STATIC_DRAW); }
                    if (renderer.buffers.normals) { gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.normals); gl.bufferData(gl.ARRAY_BUFFER, primitive.normals, gl.STATIC_DRAW); }
                    if (renderer.buffers.joints) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.joints); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(primitive.joints), gl.STATIC_DRAW);
                        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.weights); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(primitive.weights), gl.STATIC_DRAW);
                    }
                    if (node.skin !== undefined) {
                        const skin = modelData.skins[node.skin];
                        renderer.skeleton = { joints: skin.joints.map(idx => nodeMaterias[idx].id), inverseBindMatrices: skin.inverseBindMatrices };
                    }
                    renderer.isLoaded = true;
                }
                nodeMtr.addComponent(renderer);
            }
        }
        nodeMaterias.forEach(m => { if (!m.parent) m.setParent(rootMateria, false); });
    } else {
        const renderer = new C3D.SkinnedMeshRenderer3D(rootMateria);
        renderer.modelPath = modelPath;
        if (window._Renderer3D) {
            const gl = window._Renderer3D.gl;
            renderer.indexCount = modelData.indices ? modelData.indices.length : modelData.positions.length / 3;
            renderer.buffers = { positions: gl.createBuffer(), indices: modelData.indices ? gl.createBuffer() : null, normals: modelData.normals ? gl.createBuffer() : null };
            gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.positions); gl.bufferData(gl.ARRAY_BUFFER, modelData.positions, gl.STATIC_DRAW);
            if (renderer.buffers.indices) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.buffers.indices); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW); }
            if (renderer.buffers.normals) { gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.normals); gl.bufferData(gl.ARRAY_BUFFER, modelData.normals, gl.STATIC_DRAW); }
            renderer.isLoaded = true;
        }
        rootMateria.addComponent(renderer);
    }

    if (modelData.animations?.length > 0) {
        const animator = new C3D.Animator3D(rootMateria);
        animator.animations = modelData.animations.map(a => ({ ...a, channels: a.channels.map(c => ({ ...c, node: nodeMaterias[c.node]?.id || rootMateria.id })) }));
        rootMateria.addComponent(animator);
        animator.play();
    }
    return rootMateria;
}

export function createScrollViewObject(parent) {
    if (!parent) return null;
    const mtr = createBaseMateria(generateUniqueName('Scroll View'), parent, true);
    mtr.getComponent(Components.UITransform).size = { width: 300, height: 400 };
    mtr.addComponent(new Components.UIImage(mtr));
    mtr.addComponent(new Components.UIMask(mtr));
    mtr.addComponent(new Components.UIScrollRect(mtr));
    return mtr;
}

export function createProgressBarObject(parent) {
    if (!parent) return null;
    const mtr = createBaseMateria(generateUniqueName('ProgressBar'), parent, true);
    mtr.addComponent(new Components.UIImage(mtr));
    mtr.addComponent(new Components.ProgressBar(mtr));
    return mtr;
}

export function createCombatantObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Combatiente'), parent);
    mtr.addComponent(new Components.SpriteRenderer(mtr));
    mtr.addComponent(new Components.Rigidbody2D(mtr));
    mtr.addComponent(new Components.BoxCollider2D(mtr));
    mtr.addComponent(new Components.Health(mtr));
    mtr.addComponent(new Components.Attack(mtr));
    return mtr;
}

export function createAudioObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Audio'), parent);
    mtr.addComponent(new Components.AudioSource(mtr));
    return mtr;
}

export function createVideoObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Video'), parent);
    mtr.addComponent(new Components.VideoPlayer(mtr));
    return mtr;
}

export function createWaterObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Agua'), parent);
    mtr.tag = 'Agua'; mtr.layer = 4;
    mtr.addComponent(new Components.Water(mtr));
    return mtr;
}

export function createLineColliderObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Colisionador de Líneas'), parent);
    mtr.addComponent(new Components.LineCollider2D(mtr));
    return mtr;
}

export function createTerrenoObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Terreno'), parent);
    mtr.addComponent(new Components.Terreno2D(mtr));
    return mtr;
}

export function createTextObject(parent) {
    if (!parent) return null;
    const mtr = createBaseMateria(generateUniqueName('Texto'), parent, true);
    mtr.addComponent(new Components.UIText(mtr));
    return mtr;
}

export function createButtonObject(parent) {
    if (!parent) return null;
    const mtr = createBaseMateria(generateUniqueName('Button'), parent, true);
    mtr.addComponent(new Components.UIImage(mtr));
    mtr.addComponent(new Components.Button(mtr));
    return mtr;
}

export function createPanelObject(parent) {
    if (!parent) return null;
    const mtr = createBaseMateria(generateUniqueName('Panel'), parent, true);
    mtr.addComponent(new Components.UIImage(mtr));
    return mtr;
}

export function getOrCreateCanvas() {
    const allMaterias = SceneManager.currentScene.getAllMaterias();
    const existingCanvas = allMaterias.find(m => m.getComponent(Components.Canvas));
    if (existingCanvas) return existingCanvas;
    return createCanvasObject();
}

export function createMovementUITemplate() {
    const canvas = getOrCreateCanvas();
    const group = createBaseMateria(generateUniqueName('Control de Movimiento'), canvas, true);
    group.getComponent(Components.UITransform).anchorPreset = 'stretch-stretch';
    const joyArea = createPanelObject(group); joyArea.name = "JoystickArea";
    const controller = new Components.UIController(joyArea);
    controller.type = 'Joystick'; joyArea.addComponent(controller);
    return group;
}

export function createMainMenuTemplate() {
    const canvas = getOrCreateCanvas();
    const menu = createPanelObject(canvas); menu.name = "MenuPrincipal";
    return menu;
}

export function createLevelManagerTemplate() {
    const manager = createBaseMateria(generateUniqueName('GestorNiveles'));
    manager.addComponent(new Components.BoxCollider2D(manager));
    manager.getComponent(Components.BoxCollider2D).isTrigger = true;
    manager.tag = "Finish";
    return manager;
}

export function createInventoryUITemplate() {
    const canvas = getOrCreateCanvas();
    const invPanel = createPanelObject(canvas); invPanel.name = "PanelInventario";
    return invPanel;
}

export async function createDefaultCharacter(parent = null) {
    const C3D = await ensure3D();
    const root = createBaseMateria('Personaje Humanoide', parent);
    const transform = root.getComponent(Components.Transform);
    transform.position = { x: 0, y: -90, z: 0 };

    const hip = createBaseMateria('Cadera', root);
    const torso = createBaseMateria('Torso', hip);
    torso.getComponent(Components.Transform).localPosition = { x: 0, y: -30, z: 0 };
    const neck = createBaseMateria('Cuello', torso);
    neck.getComponent(Components.Transform).localPosition = { x: 0, y: -35, z: 0 };
    const head = createBaseMateria('Cabeza', neck);
    head.getComponent(Components.Transform).localPosition = { x: 0, y: -15, z: 0 };
    const eyeL = createBaseMateria('Ojo_I', head); eyeL.getComponent(Components.Transform).localPosition = { x: -8, y: -5, z: 12 };
    const eyeR = createBaseMateria('Ojo_D', head); eyeR.getComponent(Components.Transform).localPosition = { x: 8, y: -5, z: 12 };
    const armL = createBaseMateria('Brazo_I', torso); armL.getComponent(Components.Transform).localPosition = { x: -30, y: -5, z: 0 };
    const handL = createBaseMateria('Mano_I', armL); handL.getComponent(Components.Transform).localPosition = { x: 0, y: 45, z: 0 };
    const armR = createBaseMateria('Brazo_D', torso); armR.getComponent(Components.Transform).localPosition = { x: 30, y: -5, z: 0 };
    const handR = createBaseMateria('Mano_D', armR); handR.getComponent(Components.Transform).localPosition = { x: 0, y: 45, z: 0 };
    const legL = createBaseMateria('Pierna_I', hip); legL.getComponent(Components.Transform).localPosition = { x: -15, y: 10, z: 0 };
    const footL = createBaseMateria('Pie_I', legL); footL.getComponent(Components.Transform).localPosition = { x: 0, y: 80, z: 0 };
    const legR = createBaseMateria('Pierna_D', hip); legR.getComponent(Components.Transform).localPosition = { x: 15, y: 10, z: 0 };
    const footR = createBaseMateria('Pie_D', legR); footR.getComponent(Components.Transform).localPosition = { x: 0, y: 80, z: 0 };

    const jointsOrder = [hip, torso, neck, head, eyeL, eyeR, armL, handL, armR, handR, legL, footL, legR, footR];
    const meshData = { positions: [], joints: [], weights: [], indices: [] };
    const addBox = (pos, size, boneIdx) => {
        const hw = size.x/2, hh = size.y/2, hd = size.z/2, start = meshData.positions.length/3;
        const v = [-hw,-hh,-hd, hw,-hh,-hd, hw,hh,-hd, -hw,hh,-hd, -hw,-hh,hd, hw,-hh,hd, hw,hh,hd, -hw,hh,hd];
        for(let i=0; i<v.length; i+=3) {
            meshData.positions.push(v[i]+pos.x, v[i+1]+pos.y, v[i+2]+pos.z);
            meshData.joints.push(boneIdx,0,0,0); meshData.weights.push(1,0,0,0);
        }
        [0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 2,3,7, 2,7,6, 0,4,7, 0,7,3, 1,2,6, 1,6,5].forEach(i => meshData.indices.push(i+start));
    };
    addBox({x:0, y:0, z:0}, {x:35, y:25, z:20}, 0); addBox({x:0, y:-30, z:0}, {x:40, y:45, z:25}, 1); addBox({x:0, y:-65, z:0}, {x:12, y:25, z:12}, 2);
    addBox({x:0, y:-85, z:0}, {x:25, y:25, z:25}, 3); addBox({x:-8, y:-90, z:12}, {x:5, y:5, z:5}, 4); addBox({x:8, y:-90, z:12}, {x:5, y:5, z:5}, 5);
    addBox({x:-35, y:-30, z:0}, {x:12, y:45, z:12}, 6); addBox({x:-35, y:5, z:0}, {x:10, y:12, z:12}, 7); addBox({x:35, y:-30, z:0}, {x:12, y:45, z:12}, 8);
    addBox({x:35, y:5, z:0}, {x:10, y:12, z:12}, 9); addBox({x:-15, y:40, z:0}, {x:16, y:60, z:16}, 10); addBox({x:-15, y:75, z:5}, {x:18, y:10, z:28}, 11);
    addBox({x:15, y:40, z:0}, {x:16, y:60, z:16}, 12); addBox({x:15, y:75, z:5}, {x:18, y:10, z:28}, 13);

    const renderer = new C3D.SkinnedMeshRenderer3D(root);
    renderer.color = '#ffdbac';
    if (window._Renderer3D?.gl) {
        const gl = window._Renderer3D.gl;
        renderer.buffers = { positions: gl.createBuffer(), indices: gl.createBuffer(), joints: gl.createBuffer(), weights: gl.createBuffer() };
        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.positions); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.positions), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.buffers.indices); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(meshData.indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.joints); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.joints), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffers.weights); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.weights), gl.STATIC_DRAW);
        renderer.indexCount = meshData.indices.length;
        renderer.skeleton = { joints: jointsOrder.map(m => m.id), inverseBindMatrices: new Float32Array(jointsOrder.length * 16) };
        const glm = window.glMatrix;
        jointsOrder.forEach((m, i) => {
            const inv = glm.mat4.create(); glm.mat4.invert(inv, m.getComponent(Components.Transform).worldMatrix);
            renderer.skeleton.inverseBindMatrices.set(inv, i * 16);
        });
        renderer.cpuPositions = new Float32Array(meshData.positions);
        renderer.isLoaded = true;
    }
    root.addComponent(renderer);
    root.addComponent(new C3D.Rigidbody3D(root));
    const rb = root.getComponent(C3D.Rigidbody3D); rb.drag = 0.05; rb.angularDrag = 0.1;
    root.addComponent(new C3D.BoxCollider3D(root));
    root.getComponent(C3D.BoxCollider3D).size = { x: 45, y: 190, z: 45 };
    root.addComponent(new C3D.HumanoidPhysics3D(root));
    root.addComponent(new C3D.ThirdPersonController3D(root));
    root.addComponent(new C3D.HealthController3D(root));
    root.addComponent(new C3D.MovementControl3D(root));

    const camMtr = createBaseMateria('Camara_3ra_Persona', root);
    camMtr.getComponent(Components.Transform).localPosition = { x: 0, y: -150, z: 450 };
    camMtr.addComponent(new Components.Camera(camMtr));
    const cam = camMtr.getComponent(Components.Camera); cam.projection = 'Perspective'; cam.fov = 65;
    camMtr.addComponent(new C3D.CameraControl3D(camMtr));
    return root;
}

export async function createTestCircuit(parent = null) {
    const root = createBaseMateria('Circuito_Test', parent);
    const ground = await createPlane3DObject(root);
    ground.getComponent(Components.Transform).localScale = { x: 5000, y: 1, z: 5000 };
    ground.getComponent(window.Components3D.MeshRenderer3D).color = '#1a3c1a';
    for (let i = 0; i < 5; i++) {
        const step = await createCubeObject(root, '#555555');
        const t = step.getComponent(Components.Transform);
        t.localPosition = { x: 0, y: -i * 20, z: 200 + i * 50 };
        t.localScale = { x: 200, y: 20, z: 50 };
    }
    return root;
}
