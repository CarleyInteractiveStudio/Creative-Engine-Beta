import { showConfirmation } from '../editor/ui/DialogWindow.js';
import { Leyes } from './Leyes.js';
import { Transform, SpriteRenderer, CreativeScript, Camera, Animator, AnimatorController, Tilemap, TilemapRenderer, TilemapCollider2D, CustomComponent } from './Components.js';
import { Materia } from './Materia.js';
import { getCustomComponentDefinitions } from '../editor/EngineAPIExtension.js';
import { getComponent } from './ComponentRegistry.js';

export class Scene {
    constructor() {
        this.materias = [];
        this.ambiente = {
            luzAmbiental: '#1a1a2a',
            tiempo: 6.0, // 6:00 AM
            cicloAutomatico: false,
            duracionDia: 60, // 60 segundos por día
            nocheDiaColor: '#000033', // Color del filtro de oscuridad
            nocheDiaOpacidad: 0.0,    // Opacidad actual del filtro
            nocheDiaIntensidad: 0.8,   // Multiplicador global de opacidad máxima
            capasExcluidas: []        // Índices de sorting layers que no se ven afectados por la oscuridad
        };
    }

    addMateria(materia) {
        this.materias.push(materia);
        materia.scene = this;
    }

    removeMateria(materia) {
        const index = this.materias.indexOf(materia);
        if (index !== -1) {
            this.materias.splice(index, 1);
        }
    }

    getAllMaterias() {
        const all = [];
        const traverse = (m) => {
            all.push(m);
            m.children.forEach(traverse);
        };
        this.materias.forEach(traverse);
        return all;
    }

    findMateriaById(id) {
        return this.getAllMaterias().find(m => m.id === id);
    }

    getRootMaterias() {
        return this.materias;
    }

    createMateria(name) {
        const newMateria = new Materia(name);
        newMateria.addComponent(new Transform(newMateria));
        this.addMateria(newMateria);
        return newMateria;
    }
}

let currentScene = new Scene();

export { currentScene };

export let currentSceneFileHandle = null;
let isSceneDirty = false;

export function setCurrentScene(scene) {
    currentScene = scene;
}

export function setCurrentSceneFileHandle(handle) {
    currentSceneFileHandle = handle;
}

export function setSceneDirty(dirty) {
    isSceneDirty = dirty;
}

export function getIsSceneDirty() {
    return isSceneDirty;
}

export function createNewScene() {
    currentScene = new Scene();
    return currentScene;
}

export async function saveScene(scene, fileHandle) {
    const serialized = serializeScene(scene);
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(serialized, null, 2));
    await writable.close();
}

export async function loadScene(fileHandle, projectsDirHandle) {
    const file = await fileHandle.getFile();
    const contents = await file.text();
    const sceneData = JSON.parse(contents);
    currentScene = await deserializeScene(sceneData, projectsDirHandle);
    return currentScene;
}

export function serializeScene(scene) {
    const serializeMateria = (m) => {
        return {
            id: m.id,
            name: m.name,
            tag: m.tag,
            isActive: m.isActive,
            parentId: m.parent ? m.parent.id : null,
            leyes: m.leyes.map(l => {
                const leyData = {
                    type: l.constructor.name,
                    properties: { ...l }
                };
                delete leyData.properties.materia; // Don't serialize circular reference

                // Special handling for components with non-serializable data
                if (l instanceof SpriteRenderer) {
                    delete leyData.properties.sprite;
                    delete leyData.properties.spriteSheet;
                } else if (l instanceof CreativeScript) {
                    leyData.scriptName = l.scriptName;
                    leyData.publicVars = l.publicVars;
                    delete leyData.properties.instance;
                    delete leyData.properties.isInitialized;
                } else if (l instanceof Tilemap) {
                    // Convert Map to Array for JSON
                    leyData.properties.layers = l.layers.map(layer => ({
                        ...layer,
                        tileData: Array.from(layer.tileData.entries())
                    }));
                } else if (l instanceof TilemapCollider2D) {
                    // Convert Map to Array for JSON
                    leyData.properties._cachedMesh = Array.from(l._cachedMesh.entries());
                } else if (l instanceof TilemapRenderer) {
                    // Don't serialize the cache
                    delete leyData.properties.imageCache;
                    delete leyData.properties.animFramesCache;
                    delete leyData.properties.clipsCache;
                } else if (l instanceof CustomComponent) {
                    leyData.definitionName = l.definitionName;
                    leyData.publicVars = l.publicVars;
                    delete leyData.properties.instance;
                    delete leyData.properties._definition;
                }
                return leyData;
            })
        };
    };

    return {
        ambiente: scene.ambiente,
        materias: scene.getAllMaterias().map(serializeMateria)
    };
}

export async function deserializeScene(sceneData, projectsDirHandle) {
    const newScene = new Scene();
    const materiaMap = new Map();

    // Load ambiente settings, providing defaults for older scenes
    if (sceneData.ambiente) {
        newScene.ambiente = { ...newScene.ambiente, ...sceneData.ambiente };
    }

    // Pass 1: Create all materias and map them by ID
    for (const materiaData of sceneData.materias) {
        const newMateria = new Materia(materiaData.name);
        newMateria.id = materiaData.id;
        newMateria.tag = materiaData.tag || 'Untagged';
        newMateria.isActive = materiaData.isActive !== undefined ? materiaData.isActive : true;
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
                                } else {
                                    layer.tileData = new Map();
                                }
                            });
                        }
                    } else if (leyData.type === 'TilemapCollider2D') {
                        Object.assign(newLey, leyData.properties);
                        if (newLey._cachedMesh && Array.isArray(newLey._cachedMesh)) {
                            newLey._cachedMesh = new Map(newLey._cachedMesh);
                        } else {
                            newLey._cachedMesh = new Map();
                        }
                    } else if (leyData.type === 'TilemapRenderer') {
                        Object.assign(newLey, leyData.properties);
                        newLey.imageCache = new Map();
                        newLey.animFramesCache = new Map();
                        newLey.clipsCache = new Map();
                    } else {
                        Object.assign(newLey, leyData.properties);
                    }

                    newMateria.addComponent(newLey);
                }
            }
        }

        // Pass 1.2: Post-creation loading for this Materia's components
        for (const ley of newMateria.leyes) {
            if (ley instanceof SpriteRenderer) {
                await ley.loadSprite(projectsDirHandle);
            }
            if (ley instanceof CreativeScript) {
                await ley.load(projectsDirHandle);
            }
            if (ley instanceof Animator) {
                await ley.loadAnimationClip(projectsDirHandle);
            }
            if (ley instanceof AnimatorController) {
                await ley.loadController(projectsDirHandle);
            }
            if (ley instanceof TilemapRenderer) {
                await ley.loadAnimatedTileClips(projectsDirHandle);
            }
        }

        materiaMap.set(newMateria.id, newMateria);
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

    return newScene;
}
