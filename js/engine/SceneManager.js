// SceneManager.js
// This file will contain all the logic for managing scenes.

import { Leyes } from './Leyes.js';

import { Transform, SpriteRenderer, CreativeScript, Camera, Animator } from './Components.js';
import { Materia } from './Materia.js';

export class Scene {
    constructor() {
        this.materias = [];
    }

    addMateria(materia) {
        if (materia instanceof Materia) {
            this.materias.push(materia);
        }
    }

    findMateriaById(id) {
        // Helper function for recursive search
        const findRecursive = (id, materias) => {
            for (const materia of materias) {
                if (materia.id === id) {
                    return materia;
                }
                if (materia.children && materia.children.length > 0) {
                    const found = findRecursive(id, materia.children);
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        };

        return findRecursive(id, this.materias);
    }

    getRootMaterias() {
        return this.materias.filter(m => m.parent === null);
    }

    findFirstCamera() {
        // This might still be useful for simple cases or editor preview.
        return this.getAllMaterias().find(m => m.getComponent(Camera));
    }

    findAllCameras() {
        return this.getAllMaterias().filter(m => m.getComponent(Camera));
    }

    getAllMaterias() {
        let all = [];
        for (const root of this.getRootMaterias()) {
            all = all.concat(this.getMateriasRecursive(root));
        }
        return all;
    }

    findNodeByFlag(key, value) {
        return this.materias.find(m => m.getFlag(key) === value);
    }

    getMateriasRecursive(materia) {
        let materias = [materia];
        for (const child of materia.children) {
            materias = materias.concat(this.getMateriasRecursive(child));
        }
        return materias;
    }

    removeMateria(materiaId) {
        const materiaToRemove = this.findMateriaById(materiaId);
        if (!materiaToRemove) {
            console.warn(`Materia with id ${materiaId} not found for removal.`);
            return;
        }

        // If it's a child, simply remove it from its parent's list of children.
        // The object and its descendants will be garbage collected if not referenced elsewhere.
        if (materiaToRemove.parent) {
            materiaToRemove.parent.removeChild(materiaToRemove);
        } else {
            // If it's a root object, remove it from the scene's main list.
            const index = this.materias.findIndex(m => m.id === materiaId);
            if (index > -1) {
                this.materias.splice(index, 1);
            }
        }
    }
}

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
            parentId: materia.parent ? materia.parent.id : null,
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
    const materiaMap = new Map();

    // Pass 1: Create all materias and map them by ID
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

                // Post-creation loading for specific components
                if (newLey instanceof SpriteRenderer) {
                    await newLey.loadSprite(projectsDirHandle);
                }
                if (newLey instanceof CreativeScript) {
                    await newLey.load(projectsDirHandle);
                }
                if (newLey instanceof Animator) {
                    await newLey.loadController(projectsDirHandle);
                }
            }
        }
        newScene.addMateria(newMateria);
        materiaMap.set(newMateria.id, newMateria);
    }

    // Pass 2: Re-establish parent-child relationships
    for (const materiaData of sceneData.materias) {
        if (materiaData.parentId !== null) {
            const child = materiaMap.get(materiaData.id);
            const parent = materiaMap.get(materiaData.parentId);
            if (child && parent) {
                parent.addChild(child);
            }
        }
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


function createDefaultScene() {
    const scene = new Scene();

    // Create the root node
    const rootNode = new Materia('Scene');
    scene.addMateria(rootNode);

    // Create the camera
    const cameraNode = new Materia('Main Camera');
    const cameraComponent = new Camera(cameraNode);
    cameraNode.addComponent(cameraComponent);

    rootNode.addChild(cameraNode);
    scene.addMateria(cameraNode);

    return scene;
}

export async function initialize(projectsDirHandle) {
    const defaultSceneName = 'default.ceScene';
    const projectName = new URLSearchParams(window.location.search).get('project');
    const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
    const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

    // Check if any scene file exists
    let sceneFileToLoad = null;
    for await (const entry of assetsHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
            sceneFileToLoad = entry.name;
            break; // Found one, load it
        }
    }

    if (sceneFileToLoad) {
        console.log(`Encontrada escena existente: ${sceneFileToLoad}. Cargando...`);
        return await loadScene(sceneFileToLoad, assetsHandle, projectsDirHandle);
    } else {
        // If no scene files exist, create a default one with a camera
        console.warn("No se encontró ninguna escena en el proyecto. Creando una nueva por defecto con una cámara.");
        try {
            const fileHandle = await assetsHandle.getFileHandle(defaultSceneName, { create: true });
            const writable = await fileHandle.createWritable();

            const defaultScene = createDefaultScene();
            const sceneData = serializeScene(defaultScene);

            await writable.write(JSON.stringify(sceneData, null, 2));
            await writable.close();

            console.log(`Escena por defecto '${defaultSceneName}' creada con éxito.`);
            return await loadScene(defaultSceneName, assetsHandle, projectsDirHandle);
        } catch (createError) {
            console.error(`Error al crear la escena por defecto:`, createError);
        }
    }
}
