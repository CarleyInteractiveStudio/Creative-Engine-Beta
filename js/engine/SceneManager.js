// SceneManager.js
// This file will contain all the logic for managing scenes.

import { Leyes } from './Leyes.js';

import { Transform, SpriteRenderer, CreativeScript, Camera, Animator, AnimatorController, AudioSource, Tilemap, TilemapRenderer, CustomComponent, Terreno2D, Gyzmo } from './Components.js';
import { Materia } from './Materia.js';

let customComponentProvider = null;

export function setCustomComponentProvider(provider) {
    customComponentProvider = provider;
}

export class Scene {
    constructor() {
        this.materias = [];
        this.ambiente = {
            luzAmbiental: '#1a1a2a',
            nocheDiaColor: '#0a0a28',
            nocheDiaOpacidad: 1.0,
            nocheDiaIntensidad: 0.8,   // Default to 80% as requested
            capasExcluidas: [],
            hora: '6',
            cicloAutomatico: false,
            duracionDia: '60'
        };
    }

    addMateria(materia) {
        if (materia instanceof Materia) {
            this.materias.push(materia);
            this._setMateriaSceneRecursive(materia);
        }
    }

    _setMateriaSceneRecursive(materia) {
        materia.scene = this;
        for (const child of materia.children) {
            this._setMateriaSceneRecursive(child);
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

    findMateriaByName(name) {
        const findRecursive = (name, materias) => {
            for (const materia of materias) {
                if (materia.name === name) {
                    return materia;
                }
                if (materia.children && materia.children.length > 0) {
                    const found = findRecursive(name, materia.children);
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        };

        return findRecursive(name, this.materias);
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

    findAllMateriasWithComponent(componentClass, rootMateria = null) {
        const materias = rootMateria ? this.getMateriasRecursive(rootMateria) : this.getAllMaterias();
        return materias.filter(m => m.getComponent(componentClass));
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
        if (materiaToRemove.parent) {
            materiaToRemove.parent.removeChild(materiaToRemove);
        } else {
            // If it's a root object, remove it from the scene's main list.
            const index = this.materias.findIndex(m => m.id === materiaId);
            if (index > -1) {
                this.materias.splice(index, 1);
            }
        }

        // --- BUG FIX: Call destroy() to prevent memory leaks (subscriptions, timers, etc) ---
        materiaToRemove.destroy();
    }

    clone() {
        const newScene = new Scene();
        newScene.ambiente = JSON.parse(JSON.stringify(this.ambiente));

        // Clone all root materias. The Materia.clone method is recursive.
        for (const rootMateria of this.getRootMaterias()) {
            newScene.addMateria(rootMateria.clone(true)); // Preserve IDs
        }

        // After cloning, we need to re-establish the object references for parents.
        const allNewMaterias = newScene.getAllMaterias();
        const materiaMap = new Map(allNewMaterias.map(m => [m.id, m]));

        for (const materia of allNewMaterias) {
            if (materia.parent !== null && typeof materia.parent === 'number') {
                materia.parent = materiaMap.get(materia.parent) || null;
            }
        }


        return newScene;
    }

    /**
     * Re-carga todos los assets necesarios para los componentes en la escena.
     * Útil después de restaurar una escena desde un snapshot o cargarla por primera vez.
     */
    async loadAllAssets(projectsDirHandle) {
        const promises = [];
        for (const materia of this.getAllMaterias()) {
            for (const ley of materia.leyes) {
                const className = ley.constructor.name;
                if (className === 'SpriteRenderer') {
                    if (ley.spriteAssetPath) {
                        promises.push(ley.loadSpriteSheet(projectsDirHandle));
                    } else if (ley.source) {
                        promises.push(ley.loadSprite(projectsDirHandle));
                    }
                } else if (className === 'Animator') {
                    if (ley.animationClipPath) {
                        promises.push(ley.loadAnimationClip(projectsDirHandle));
                    }
                } else if (className === 'AnimatorController') {
                    if (ley.controllerPath) {
                        promises.push(ley.initialize(projectsDirHandle));
                    }
                } else if (className === 'Terreno2D') {
                    promises.push(ley.loadTextures(projectsDirHandle));
                }
            }
        }
        await Promise.allSettled(promises);
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

export function clearScene() {
    currentScene = new Scene();
    currentSceneFileHandle = null;
    isSceneDirty = false;
    console.log("Scene cleared.");
}

/**
 * Serializa una Materia (objeto) a un objeto JSON, opcionalmente de forma recursiva.
 */
export function serializeMateria(materia, recursive = false) {
    const materiaData = {
        id: materia.id,
        name: materia.name,
        tag: materia.tag,
        prefabPath: materia.prefabPath || null,
        parentId: materia.parent ? (typeof materia.parent === 'number' ? materia.parent : materia.parent.id) : null,
        leyes: []
    };

    for (const ley of materia.leyes) {
        if (ley instanceof CustomComponent) {
            const customLeyData = {
                type: 'CustomComponent',
                definitionName: ley.definition.nombre,
                publicVars: JSON.parse(JSON.stringify(ley.publicVars || {}))
            };
            materiaData.leyes.push(customLeyData);
        } else {
            const leyData = {
                type: ley.constructor.name,
                properties: {}
            };
            for (const key in ley) {
                // Exclude circular references and non-serializable properties
                if (key !== 'materia' && key !== 'scriptInstance' && typeof ley[key] !== 'function') {
                    if (ley.constructor.name === 'Tilemap' && key === 'layers') {
                        leyData.properties[key] = ley[key].map(layer => ({
                            ...layer,
                            tileData: Array.from(layer.tileData.entries())
                        }));
                    } else if (ley.constructor.name === 'Terreno2D' && (key === 'maskCanvas' || key === 'maskCtx' || key === 'imageCache')) {
                        // Skip internal properties
                        continue;
                    } else if (ley.constructor.name === 'TilemapCollider2D' && key === '_cachedMesh') {
                        leyData.properties[key] = Array.from(ley[key].entries());
                    } else if (ley.constructor.name === 'TilemapRenderer' && (key === 'imageCache' || key === 'clipCache')) {
                        leyData.properties[key] = [];
                    } else if (ley.constructor.name === 'AnimatorController' && (key === 'states' || key === 'controller' || key === 'animator' || key === 'projectsDirHandle' || key === 'isLoading' || key === 'isError')) {
                        continue;
                    } else if (ley.constructor.name === 'Animator' && (key === 'animationClip' || key === 'spriteRenderer' || key === 'projectsDirHandle' || key === 'isLoading' || key === 'isError' || key === 'isPlaying')) {
                        continue;
                    } else if ((ley.constructor.name === 'SpriteRenderer' || ley.constructor.name === 'UIImage') && (key === 'sprite' || key === 'spriteSheet' || key === 'isLoading' || key === 'isError')) {
                        continue;
                    } else if (ley.constructor.name === 'TextureRender' && key === 'texture') {
                        continue;
                    } else if (key.startsWith('_')) {
                        // Skip "private" or internal state properties
                        continue;
                    } else if (ley[key] instanceof Materia) {
                        leyData.properties[key] = { __materiaId: ley[key].id };
                    } else {
                        leyData.properties[key] = ley[key];
                    }
                }
            }
            materiaData.leyes.push(leyData);
        }
    }

    if (recursive && materia.children && materia.children.length > 0) {
        materiaData.children = materia.children.map(child => serializeMateria(child, true));
    }

    return materiaData;
}

export function serializeScene(scene, dom) {
    const sceneData = {
        ambiente: {
            luzAmbiental: scene.ambiente.luzAmbiental || '#1a1a2a',
            nocheDiaColor: scene.ambiente.nocheDiaColor || '#0a0a28',
            nocheDiaOpacidad: scene.ambiente.nocheDiaOpacidad !== undefined ? scene.ambiente.nocheDiaOpacidad : 1.0,
            nocheDiaIntensidad: scene.ambiente.nocheDiaIntensidad !== undefined ? scene.ambiente.nocheDiaIntensidad : 0.8,
            capasExcluidas: scene.ambiente.capasExcluidas || [],
            hora: scene.ambiente.hora || '6',
            cicloAutomatico: scene.ambiente.cicloAutomatico || false,
            duracionDia: scene.ambiente.duracionDia || '60'
        },
        materias: []
    };

    // Usar getAllMaterias para asegurar que todos los nodos, incluidos los hijos, se serializan.
    for (const materia of scene.getAllMaterias()) {
        sceneData.materias.push(serializeMateria(materia, false));
    }
    return sceneData;
}

import { getComponent } from './ComponentRegistry.js';

async function _deserializeMateriaRecursive(materiaData, projectsDirHandle, materiaMap) {
    const newMateria = new Materia(materiaData.name);
    // Note: Do not override ID here if we are instantiating a prefab in an existing scene,
    // unless we are loading a full scene.

    newMateria.tag = materiaData.tag || 'Untagged';
    newMateria.prefabPath = materiaData.prefabPath || null;
    newMateria.leyes = [];

    for (const leyData of materiaData.leyes) {
        if (leyData.type === 'CustomComponent') {
            let definition = null;
            if (customComponentProvider && typeof customComponentProvider.get === 'function') {
                definition = customComponentProvider.get(leyData.definitionName);
            } else if (window.CE_Custom_Components) {
                definition = window.CE_Custom_Components[leyData.definitionName];
            }

            if (definition) {
                const newLey = new CustomComponent(definition);
                newLey.publicVars = leyData.publicVars || {};
                newMateria.addComponent(newLey);
            }
        } else {
            const ComponentClass = getComponent(leyData.type);
            if (ComponentClass) {
                const newLey = new ComponentClass(newMateria);
                if (leyData.type === 'Tilemap') {
                    Object.assign(newLey, leyData.properties);
                    if (newLey.layers && Array.isArray(newLey.layers)) {
                        newLey.layers.forEach(layer => {
                            layer.tileData = new Map(layer.tileData || []);
                        });
                    }
                } else if (leyData.type === 'Terreno2D') {
                    Object.assign(newLey, leyData.properties);
                    // Re-hidratar capas
                    if (newLey.layers) {
                        for (const layer of newLey.layers) {
                            newLey._initializeLayerCanvas(layer);
                        }
                    }
                } else if (leyData.type === 'TilemapCollider2D') {
                    Object.assign(newLey, leyData.properties);
                    newLey._cachedMesh = new Map(newLey._cachedMesh || []);
                } else if (leyData.type === 'TilemapRenderer' || leyData.type === 'Terreno2D') {
                    Object.assign(newLey, leyData.properties);
                    newLey.imageCache = new Map();
                    if (leyData.type === 'TilemapRenderer') newLey.clipCache = new Map();
                } else if (leyData.type === 'AnimatorController') {
                    Object.assign(newLey, leyData.properties);
                    newLey.states = new Map();
                } else {
                    Object.assign(newLey, leyData.properties);
                }

                newMateria.addComponent(newLey);

                if (newLey instanceof SpriteRenderer) await newLey.loadSprite(projectsDirHandle);
                if (newLey instanceof CreativeScript) await newLey.load(projectsDirHandle);
                if (newLey instanceof Animator) await newLey.loadAnimationClip(projectsDirHandle);
                if (newLey instanceof AnimatorController) await newLey.initialize(projectsDirHandle);
                if (newLey instanceof Terreno2D) await newLey.loadTextures(projectsDirHandle);
                if (newLey instanceof AudioSource) { /* AudioSource handles its own loading on play or start */ }
            }
        }
    }

    // Recursively deserialize children if they are stored hierarchically (common in prefabs)
    if (materiaData.children && Array.isArray(materiaData.children)) {
        for (const childData of materiaData.children) {
            const child = await _deserializeMateriaRecursive(childData, projectsDirHandle, materiaMap);
            newMateria.addChild(child);
        }
    }

    if (materiaMap) materiaMap.set(materiaData.id, newMateria);
    return newMateria;
}

export async function deserializeScene(sceneData, projectsDirHandle) {
    const newScene = new Scene();
    const materiaMap = new Map();

    if (sceneData.ambiente) {
        newScene.ambiente = { ...newScene.ambiente, ...sceneData.ambiente };
    }

    for (const materiaData of sceneData.materias) {
        const newMateria = await _deserializeMateriaRecursive(materiaData, projectsDirHandle, materiaMap);
        newMateria.id = materiaData.id; // Preserve ID for scene load
        if (materiaData.parentId === null) {
            newScene.addMateria(newMateria);
        }
    }

    for (const materiaData of sceneData.materias) {
        if (materiaData.parentId !== null) {
            const child = materiaMap.get(materiaData.id);
            const parent = materiaMap.get(materiaData.parentId);
            if (child && parent) {
                parent.addChild(child);
            }
        }
    }

    // Pass 3: Resolve Materia references in component properties
    for (const materia of materiaMap.values()) {
        for (const ley of materia.leyes) {
            for (const key in ley) {
                if (ley[key] && typeof ley[key] === 'object' && ley[key].__materiaId !== undefined) {
                    const targetId = ley[key].__materiaId;
                    ley[key] = materiaMap.get(targetId) || null;
                }
            }
        }
    }

    // Pass 4: Final setup after all objects and relationships are established
    for (const materia of materiaMap.values()) {
        // If a materia has a Tilemap, its renderer needs to be marked as dirty
        // to ensure it re-draws the loaded tiles on the next frame.
        if (materia.getComponent(Tilemap)) {
            const renderer = materia.getComponent(TilemapRenderer);
            if (renderer) {
                renderer.setDirty();
            }
        }
    }

    return newScene;
}

export async function loadScene(fileHandle, projectsDirHandle) {
    try {
        const file = await fileHandle.getFile();
        const content = await file.text();
        const sceneData = JSON.parse(content);

        const scene = await deserializeScene(sceneData, projectsDirHandle);

        return {
            scene: scene,
            fileHandle: fileHandle
        };
    } catch (error) {
        console.error(`Error al cargar la escena '${fileHandle.name}':`, error);
        return null;
    }
}

export function createSprite(name, imagePath) {
    const newMateria = new Materia(name);
    const spriteRenderer = new SpriteRenderer(newMateria);
    spriteRenderer.setSourcePath(imagePath, window.projectsDirHandle);
    // Note: The sprite will be loaded when the scene is rendered or the component is updated in the editor.
    newMateria.addComponent(spriteRenderer);
    currentScene.addMateria(newMateria);
    return newMateria;
}

/**
 * Carga un archivo de Prefab (.ceprefab) y lo instancia en la escena.
 */
export async function instanciarPrefabDesdeRuta(path, x, y) {
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        let currentHandle = await window.projectsDirHandle.getDirectoryHandle(projectName);
        const parts = path.split('/');
        const fileName = parts.pop();

        for (const part of parts) {
            if (part && part !== 'Assets') {
                currentHandle = await currentHandle.getDirectoryHandle(part);
            } else if (part === 'Assets') {
                currentHandle = await currentHandle.getDirectoryHandle('Assets');
            }
        }

        const fileHandle = await currentHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const content = await file.text();
        const prefabData = JSON.parse(content);

        const newMateria = await instanciarPrefab(prefabData, x, y);
        if (newMateria) {
            newMateria.prefabPath = path;
        }
        return newMateria;
    } catch (error) {
        console.error(`Error al instanciar prefab desde ruta '${path}':`, error);
        return null;
    }
}

// Alias en inglés
export const instantiatePrefabFromPath = instanciarPrefabDesdeRuta;

/**
 * Crea una copia de una Materia (objeto) existente y la añade a la escena actual.
 * @param {Materia} original - El objeto a copiar.
 * @param {number} [x] - Posición X opcional.
 * @param {number} [y] - Posición Y opcional.
 * @returns {Materia} La nueva instancia creada.
 */
export function instanciar(original, x, y) {
    if (!original || !(original instanceof Materia)) {
        console.error("instanciar: Se requiere una Materia válida para copiar.");
        return null;
    }
    const copia = original.clone(false); // false = generar nuevos IDs
    if (x !== undefined && y !== undefined) {
        const transform = copia.getComponent(Transform);
        if (transform) transform.position = { x, y };
    }
    currentScene.addMateria(copia);
    return copia;
}

// Alias en inglés
export const instantiate = instanciar;

/**
 * Crea una nueva Materia a partir de un objeto JSON (Prefab).
 */
export async function instanciarPrefab(prefabData, x, y) {
    if (!prefabData) return null;

    // A prefab can be a single materia object or a mini-scene structure
    const materiaData = prefabData.materias ? prefabData.materias[0] : prefabData;

    const newMateria = await _deserializeMateriaRecursive(materiaData, window.projectsDirHandle);

    if (x !== undefined && y !== undefined) {
        const transform = newMateria.getComponent(Transform);
        if (transform) transform.position = { x, y };
    }

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
        const fileHandle = await assetsHandle.getFileHandle(sceneFileToLoad);
        return await loadScene(fileHandle, projectsDirHandle);
    } else {
        // If no scene files exist, create a default one with a camera
        console.warn("No se encontró ninguna escena en el proyecto. Creando una nueva por defecto con una cámara.");
        try {
            const fileHandle = await assetsHandle.getFileHandle(defaultSceneName, { create: true });
            const writable = await fileHandle.createWritable();

            const defaultScene = createDefaultScene();
            // Pass a null DOM object for default scene creation
            const sceneData = serializeScene(defaultScene, null);

            await writable.write(JSON.stringify(sceneData, null, 2));
            await writable.close();

            console.log(`Escena por defecto '${defaultSceneName}' creada con éxito.`);
            const newFileHandle = await assetsHandle.getFileHandle(defaultSceneName);
            return await loadScene(newFileHandle, projectsDirHandle);
        } catch (createError) {
            console.error(`Error al crear la escena por defecto:`, createError);
        }
    }
}
