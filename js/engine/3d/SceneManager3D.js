// js/engine/3d/SceneManager3D.js
// Independent Scene Manager for the 3D Engine.

import { Materia3D } from './Materia3D.js';
import { Scene3D } from './Scene3D.js';
import * as Components3D from './Components3D.js';

export let currentScene = new Scene3D();
export let currentSceneFileHandle = null;
export let isSceneDirty = false;

export function setCurrentScene(scene) {
    currentScene = scene;
}

export function setCurrentSceneFileHandle(fileHandle) {
    currentSceneFileHandle = fileHandle;
}

export function setSceneDirty(dirty) {
    isSceneDirty = dirty;
}

export function serializeMateria(materia, recursive = false) {
    const materiaData = {
        id: materia.id,
        name: materia.name,
        isActive: materia.isActive,
        layer: materia.layer,
        tag: materia.tag,
        prefabPath: materia.prefabPath || null,
        parentId: materia.parent ? (typeof materia.parent === 'number' ? materia.parent : materia.parent.id) : null,
        leyes: []
    };

    for (const ley of materia.leyes) {
        const leyData = {
            type: ley.constructor.name,
            properties: {}
        };
        for (const key in ley) {
            if (key !== 'materia' && typeof ley[key] !== 'function' && !key.startsWith('_')) {
                if (ley[key] instanceof Materia3D) {
                    leyData.properties[key] = { __materiaId: ley[key].id };
                } else {
                    leyData.properties[key] = ley[key];
                }
            }
        }
        materiaData.leyes.push(leyData);
    }

    if (recursive && materia.children && materia.children.length > 0) {
        materiaData.children = materia.children.map(child => serializeMateria(child, true));
    }

    return materiaData;
}

export function serializeScene(scene) {
    const sceneData = {
        ambiente: JSON.parse(JSON.stringify(scene.ambiente)),
        materias: []
    };
    for (const materia of scene.getAllMaterias()) {
        sceneData.materias.push(serializeMateria(materia, false));
    }
    return sceneData;
}

export async function deserializeScene(sceneData) {
    const newScene = new Scene3D();
    newScene.ambiente = { ...newScene.ambiente, ...sceneData.ambiente };
    const materiaMap = new Map();

    // Pass 1: Create all materias
    for (const mData of sceneData.materias) {
        const m = new Materia3D(mData.name);
        m.id = mData.id;
        m.isActive = mData.isActive;
        m.layer = mData.layer;
        m.tag = mData.tag;
        m.prefabPath = mData.prefabPath;
        materiaMap.set(m.id, m);
        if (mData.parentId === null) newScene.addMateria(m);
    }

    // Pass 2: Hierarchy and Components
    for (const mData of sceneData.materias) {
        const m = materiaMap.get(mData.id);
        if (mData.parentId !== null) {
            const parent = materiaMap.get(mData.parentId);
            if (parent) m.setParent(parent, false);
        }

        for (const lData of mData.leyes) {
            const CompClass = (await import('./Components3D.js'))[lData.type];
            if (CompClass) {
                const ley = new CompClass(m);
                Object.assign(ley, lData.properties);
                m.addComponent(ley);
            }
        }
    }

    return newScene;
}

export async function loadScene(fileHandle) {
    try {
        const file = await fileHandle.getFile();
        const content = await file.text();
        const sceneData = JSON.parse(content);
        const scene = await deserializeScene(sceneData);
        return { scene, fileHandle };
    } catch (e) {
        console.error("Error loading 3D scene:", e);
        return null;
    }
}

export function createDefaultScene() {
    const scene = new Scene3D();
    const root = new Materia3D('Scene');
    scene.addMateria(root);

    const camObj = new Materia3D('Main Camera');
    const cam = new Components3D.Camera3D(camObj);
    camObj.addComponent(cam);
    const camTrans = new Components3D.Transform3D(camObj);
    camTrans.localPosition = { x: 0, y: 150, z: 500 };
    camTrans.localRotation = { x: 15, y: 180, z: 0 };
    camObj.addComponent(camTrans);
    root.addChild(camObj);

    const lightObj = new Materia3D('Directional Light');
    const light = new Components3D.DirectionalLight3D(lightObj);
    lightObj.addComponent(light);
    const lightTrans = new Components3D.Transform3D(lightObj);
    lightTrans.localRotation = { x: 50, y: -30, z: 0 };
    lightObj.addComponent(lightTrans);
    root.addChild(lightObj);

    return scene;
}

export async function initialize(projectsDirHandle) {
    const defaultSceneName = 'default3d.ceScene';
    const projectName = new URLSearchParams(window.location.search).get('project');
    if (!projectName) return null;

    let assetsHandle;
    try {
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        assetsHandle = await projectHandle.getDirectoryHandle('Assets', { create: true });
    } catch (e) { return null; }

    let sceneFileToLoad = null;
    for await (const entry of assetsHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
            sceneFileToLoad = entry.name;
            break;
        }
    }

    if (sceneFileToLoad) {
        const fileHandle = await assetsHandle.getFileHandle(sceneFileToLoad);
        return await loadScene(fileHandle);
    } else {
        try {
            const fileHandle = await assetsHandle.getFileHandle(defaultSceneName, { create: true });
            const scene = createDefaultScene();
            const data = serializeScene(scene);
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            return { scene, fileHandle };
        } catch (e) { return null; }
    }
}
