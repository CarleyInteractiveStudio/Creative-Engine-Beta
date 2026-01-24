// SceneManager.js
// This file will contain all the logic for managing scenes.

import { showConfirmation } from '../editor/ui/DialogWindow.js';
import { Leyes } from './Leyes.js';

import { Transform, SpriteRenderer, CreativeScript, Camera, Animator, Tilemap, TilemapRenderer, CustomComponent } from './Components.js';
import { Materia } from './Materia.js';
import { getCustomComponentDefinitions } from '../editor/EngineAPIExtension.js';
import { getAllInternalApis } from './EngineAPI.js';


export class Scene {
    constructor(engineAPI = null) {
        this.materias = [];
        this.engine = engineAPI || getAllInternalApis(); // Store the engine API
        this.ambiente = {
            luzAmbiental: '#1a1a2a',
            hora: '6',
            cicloAutomatico: false,
            duracionDia: '60',
            mascaraTipo: 'ninguna'
        };
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

    clone() {
        const newScene = new Scene(this.engine);
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
    currentScene = new Scene(); // It will get the default engine API
    currentSceneFileHandle = null;
    isSceneDirty = false;
    console.log("Scene cleared.");
}

export function serializeScene(scene, dom) {
    const sceneData = {
        ambiente: {
            luzAmbiental: dom ? dom.ambienteLuzAmbiental.value : '#1a1a2a',
            hora: dom ? dom.ambienteTiempo.value : '6',
            cicloAutomatico: dom ? dom.ambienteCicloAutomatico.checked : false,
            duracionDia: dom ? dom.ambienteDuracionDia.value : '60',
            mascaraTipo: dom ? dom.ambienteMascaraTipo.value : 'ninguna'
        },
        materias: []
    };

    // Usar getAllMaterias para asegurar que todos los nodos, incluidos los hijos, se serializan.
    for (const materia of scene.getAllMaterias()) {
        const materiaData = {
            id: materia.id,
            name: materia.name,
            tag: materia.tag, // <-- GUARDAR EL TAG
            parentId: materia.parent ? materia.parent.id : null,
            leyes: []
        };
        for (const ley of materia.leyes) {
            if (ley instanceof CustomComponent) {
                const customLeyData = {
                    type: 'CustomComponent',
                    definitionName: ley.definition.nombre,
                    publicVars: ley.publicVars
                };
                materiaData.leyes.push(customLeyData);
            } else if (ley instanceof CreativeScript) {
                // Use the new serialize method for CreativeScripts
                const scriptData = ley.serialize();
                materiaData.leyes.push(scriptData);
            } else {
                const leyData = {
                    type: ley.constructor.name,
                    properties: {}
                };
                for (const key in ley) {
                    if (key !== 'materia' && typeof ley[key] !== 'function') {
                        if (ley.constructor.name === 'Tilemap' && key === 'layers') {
                            leyData.properties[key] = ley[key].map(layer => ({
                                ...layer,
                                tileData: Array.from(layer.tileData.entries())
                            }));
                        } else if (ley.constructor.name === 'TilemapCollider2D' && key === '_cachedMesh') {
                            leyData.properties[key] = Array.from(ley[key].entries());
                        } else if (ley.constructor.name === 'TilemapRenderer' && key === 'imageCache') {
                            leyData.properties[key] = [];
                        } else {
                            leyData.properties[key] = ley[key];
                        }
                    }
                }
                materiaData.leyes.push(leyData);
            }
        }
        sceneData.materias.push(materiaData);
    }
    return sceneData;
}

import { getComponent } from './ComponentRegistry.js';

export async function deserializeScene(sceneData, projectsDirHandle) {
    const engineAPI = getAllInternalApis();
    const newScene = new Scene(engineAPI);
    const materiaMap = new Map();

    // Load ambiente settings, providing defaults for older scenes
    if (sceneData.ambiente) {
        newScene.ambiente = { ...newScene.ambiente, ...sceneData.ambiente };
    }

    // Pass 1: Create all materias and map them by ID
    for (const materiaData of sceneData.materias) {
        const newMateria = new Materia(materiaData.name);
        newMateria.id = materiaData.id;
        newMateria.tag = materiaData.tag || 'Untagged'; // <-- CARGAR EL TAG
        newMateria.leyes = []; // Clear default transform

        for (const leyData of materiaData.leyes) {
            if (leyData.type === 'CustomComponent') {
                const definition = getCustomComponentDefinitions().get(leyData.definitionName);
                if (definition) {
                    const newLey = new CustomComponent(definition);
                    newLey.publicVars = leyData.publicVars || {};
                    newMateria.addComponent(newLey);
                } else {
                    console.warn(`No se encontró la definición para el componente personalizado '${leyData.definitionName}' en la Materia '${materiaData.name}'. El componente no será cargado.`);
                }
            } else {
                const ComponentClass = getComponent(leyData.type);
                if (ComponentClass) {
                    const newLey = new ComponentClass(newMateria);

                    if (leyData.type === 'Tilemap') {
                        Object.assign(newLey, leyData.properties);
                    if (newLey.layers && Array.isArray(newLey.layers)) {
                        newLey.layers.forEach((layer, index) => {
                            if (layer.tileData && Array.isArray(layer.tileData)) {
                                layer.tileData = new Map(layer.tileData);
                                console.log(`[DeserializeScene] Tilemap Layer ${index} de ${materiaData.name}: ${layer.tileData.size} tiles deserializados.`);
                            } else {
                                layer.tileData = new Map();
                                console.warn(`[DeserializeScene] TileData para la capa ${index} en Materia '${materiaData.name}' no es válida o está en formato antiguo. Inicializada como vacía.`);
                            }
                        });
                    }
                } else if (leyData.type === 'TilemapCollider2D') {
                    console.log(`[DeserializeScene] Deserializando TilemapCollider2D _cachedMesh para ${materiaData.name}. LeyData:`, leyData);
                    Object.assign(newLey, leyData.properties);
                    // Correctly deserialize the _cachedMesh back into a Map
                    if (newLey._cachedMesh && Array.isArray(newLey._cachedMesh)) {
                        newLey._cachedMesh = new Map(newLey._cachedMesh);
                        console.log(`[DeserializeScene] TilemapCollider2D _cachedMesh para ${materiaData.name}: ${newLey._cachedMesh.size} entradas deserializadas.`);
                    } else {
                        newLey._cachedMesh = new Map();
                        console.warn(`[DeserializeScene] _cachedMesh para TilemapCollider2D en Materia '${materiaData.name}' no es válida. Inicializada como vacía.`);
                    }
                } else if (leyData.type === 'TilemapRenderer') {
                    console.log(`[DeserializeScene] Deserializando TilemapRenderer para ${materiaData.name}.`);
                    Object.assign(newLey, leyData.properties);
                    // Always re-initialize imageCache as an empty Map on load.
                    // It will be populated as tiles are rendered.
                    newLey.imageCache = new Map();
                } else {
                    Object.assign(newLey, leyData.properties);
                }

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
        }
        materiaMap.set(newMateria.id, newMateria);
        // Only add root materias to the scene's top-level array
        if (materiaData.parentId === null) {
            newScene.addMateria(newMateria);
        }
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

    // Pass 3: Final setup after all objects and relationships are established
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
    spriteRenderer.setSourcePath(imagePath);
    // Note: The sprite will be loaded when the scene is rendered or the component is updated in the editor.
    newMateria.addComponent(spriteRenderer);
    currentScene.addMateria(newMateria);
    return newMateria;
}


function createDefaultScene() {
    const scene = new Scene(); // Gets default API

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
    const params = new URLSearchParams(window.location.search);
    const projectName = params.get('project');
    const sceneToLoadFromURL = params.get('scene');

    const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
    const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

    // --- Priority 1: Load scene from URL parameter ---
    if (sceneToLoadFromURL) {
        try {
            console.log(`Intentando cargar la escena desde el parámetro URL: ${sceneToLoadFromURL}`);
            const fileHandle = await assetsHandle.getFileHandle(sceneToLoadFromURL, { create: false });
            return await loadScene(fileHandle, projectsDirHandle);
        } catch (e) {
            console.error(`No se pudo cargar la escena '${sceneToLoadFromURL}' especificada en la URL. Buscando una escena por defecto.`);
        }
    }

    // --- Priority 2: Find any existing scene ---
    let sceneFileToLoad = null;
    for await (const entry of assetsHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
            sceneFileToLoad = entry.name;
            break;
        }
    }

    if (sceneFileToLoad) {
        console.log(`Encontrada escena existente: ${sceneFileToLoad}. Cargando...`);
        const fileHandle = await assetsHandle.getFileHandle(sceneFileToLoad);
        return await loadScene(fileHandle, projectsDirHandle);
    }

    // --- Priority 3: Create a default scene ---
    console.warn("No se encontró ninguna escena en el proyecto. Creando una nueva por defecto con una cámara.");
    try {
        const fileHandle = await assetsHandle.getFileHandle(defaultSceneName, { create: true });
        const writable = await fileHandle.createWritable();
        const defaultScene = createDefaultScene();
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
