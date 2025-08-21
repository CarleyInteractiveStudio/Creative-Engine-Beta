// SceneManager.js
// This file will contain all the logic for managing scenes.

import { Leyes } from './Leyes.js';

import { Transform, SpriteRenderer, CreativeScript, UICanvas, Camera } from './Components.js';
import { Materia } from './Materia.js';

export class Scene { constructor() { this.materias = []; } addMateria(materia) { if (materia instanceof Materia) { this.materias.push(materia); } } findMateriaById(id) { return this.materias.find(m => m.id === id); } getRootMaterias() { return this.materias.filter(m => m.parent === null); } findFirstCanvas() { return this.materias.find(m => m.getComponent(UICanvas)); } findFirstCamera() { return this.materias.find(m => m.getComponent(Camera)); } }

export let currentScene = new Scene();
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

export function serializeScene(scene) {
    const sceneData = {
        materias: []
    };
    for (const materia of scene.materias) {
        const materiaData = {
            id: materia.id,
            name: materia.name,
            leyes: []
        };
        for (const ley of materia.leyes) {
            const leyData = {
                type: ley.constructor.name,
                properties: {}
            };
            // Copy properties, but not the 'materia' back-reference
            for (const key in ley) {
                if (key !== 'materia' && typeof ley[key] !== 'function') {
                    leyData.properties[key] = ley[key];
                }
            }
            materiaData.leyes.push(leyData);
        }
        sceneData.materias.push(materiaData);
    }
    return sceneData;
}

import { getComponent } from './ComponentRegistry.js';

export async function deserializeScene(sceneData, projectsDirHandle) {
    const newScene = new Scene();
    for (const materiaData of sceneData.materias) {
        const newMateria = new Materia(materiaData.name);
        newMateria.id = materiaData.id;
        newMateria.leyes = []; // Clear default transform

        for (const leyData of materiaData.leyes) {
            const ComponentClass = getComponent(leyData.type);
            if (ComponentClass) {
                const newLey = new ComponentClass(newMateria);
                Object.assign(newLey, leyData.properties);
                newMateria.addComponent(newLey);

                // If the component is a SpriteRenderer, load its sprite.
                if (newLey instanceof SpriteRenderer) {
                    await newLey.loadSprite(projectsDirHandle);
                }
                // Also handle CreativeScript loading here
                if (newLey instanceof CreativeScript) {
                    await newLey.load(projectsDirHandle);
                }
                // Also handle Animator loading here
                if (newLey instanceof Animator) {
                    await newLey.loadController(projectsDirHandle);
                }
            }
        }
        newScene.addMateria(newMateria);
    }
    return newScene;
}

export async function loadScene(fileName, directoryHandle, projectsDirHandle) {
    if(isSceneDirty) {
        if(!confirm("Tienes cambios sin guardar en la escena actual. ¿Estás seguro de que quieres continuar? Se perderán los cambios.")) {
            return;
        }
    }
    try {
        const fileHandle = await directoryHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const content = await file.text();
        const sceneData = JSON.parse(content);

        currentScene = await deserializeScene(sceneData, projectsDirHandle); // Await the async deserialization
        currentSceneFileHandle = fileHandle;

        return {
            scene: currentScene,
            fileHandle: currentSceneFileHandle
        }
    } catch (error) {
        console.error(`Error al cargar la escena '${fileName}':`, error);
    }
}

export function createSprite(name, imagePath) {
    const newMateria = new Materia(name);
    const spriteRenderer = new SpriteRenderer(newMateria);
    spriteRenderer.setSourcePath(imagePath);
    // Note: The sprite will be loaded when the scene is rendered or the component is updated in the editor.
    newMateria.addComponent(spriteRenderer);
    currentScene.addMateria(newMateria);
    return newMateria;
}

export async function getURLForAssetPath(path, projectsDirHandle) {
    if (!projectsDirHandle || !path) return null;
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

        let currentHandle = projectHandle;
        const parts = path.split('/').filter(p => p); // Filter out empty strings from path
        const fileName = parts.pop();

        for (const part of parts) {
            currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        const fileHandle = await currentHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
    } catch (error) {
        console.error(`Could not create URL for asset path: ${path}`, error);
        return null;
    }
}

export async function initialize(projectsDirHandle) {
    const defaultSceneName = 'default.ceScene';
    const assetsHandle = await projectsDirHandle.getDirectoryHandle('assets', { create: true });
    try {
        const fileHandle = await assetsHandle.getFileHandle(defaultSceneName);
        return await loadScene(defaultSceneName, assetsHandle, projectsDirHandle);
    } catch (error) {
        // If the file doesn't exist, create it
        if (error.name === 'NotFoundError') {
            try {
                const fileHandle = await assetsHandle.getFileHandle(defaultSceneName, { create: true });
                const writable = await fileHandle.createWritable();
                const defaultContent = {
                    materias: [] // An empty scene
                };
                await writable.write(JSON.stringify(defaultContent, null, 2));
                await writable.close();
                return await loadScene(defaultSceneName, assetsHandle, projectsDirHandle);
            } catch (createError) {
                console.error(`Error al crear la escena por defecto:`, createError);
            }
        } else {
            console.error(`Error al inicializar el SceneManager:`, error);
        }
    }
}
