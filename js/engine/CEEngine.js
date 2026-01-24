// js/engine/CEEngine.js

import * as SceneManager from './SceneManager.js';
import { Materia } from './Materia.js';
import { loadTextAsset } from './AssetUtils.js';
import { Transform } from './Components.js';

let physicsSystem = null;

export function initialize(dependencies) {
    physicsSystem = dependencies.physicsSystem;
}

/**
 * Finds a Materia in the current scene by its name.
 * @param {string} name The name of the Materia to find.
 * @returns {import('./Materia.js').Materia | null} The found Materia or null.
 */
function find(name) {
    return SceneManager.currentScene ? SceneManager.currentScene.findMateriaByName(name) : null;
}


function getCollisionEnter(materia, tag = null) {
    if (!physicsSystem) return [];
    // Ahora pasamos el tag directamente al sistema de físicas para un filtrado eficiente.
    return physicsSystem.getCollisionInfo(materia, 'enter', 'collision', tag);
}

function getCollisionStay(materia, tag = null) {
    if (!physicsSystem) return [];
    // Ahora pasamos el tag directamente al sistema de físicas para un filtrado eficiente.
    return physicsSystem.getCollisionInfo(materia, 'stay', 'collision', tag);
}

function getCollisionExit(materia, tag = null) {
    if (!physicsSystem) return [];
    // Ahora pasamos el tag directamente al sistema de físicas para un filtrado eficiente.
    return physicsSystem.getCollisionInfo(materia, 'exit', 'collision', tag);
}

async function instantiate(prefabPath, position = null, parent = null) {
    if (!prefabPath || typeof prefabPath !== 'string') {
        console.error("motor.instanciar() requiere la ruta al archivo .cePrefab como una cadena de texto.");
        return null;
    }

    const prefabContent = await loadTextAsset(prefabPath);
    if (!prefabContent) {
        console.error(`No se pudo cargar el prefab de la ruta: ${prefabPath}`);
        return null;
    }

    try {
        const prefabData = JSON.parse(prefabContent);
        const newMateria = Materia.deserialize(prefabData);

        // Set position if provided
        if (position) {
            const transform = newMateria.getComponent(Transform);
            if (transform) {
                transform.position.x = position.x;
                transform.position.y = position.y;
            }
        }

        // Add to scene or parent
        if (parent && parent.addChild) {
            parent.addChild(newMateria);
        } else {
            SceneManager.currentScene.addMateria(newMateria);
        }

        return newMateria;

    } catch (error) {
        console.error(`Error al instanciar el prefab de la ruta: ${prefabPath}`, error);
        return null;
    }
}

// --- The Public API Object ---
// This object will be exposed to the user scripts.
// We can add more global functions here in the future.
const engineAPIs = {
    instantiate: instantiate,
    find: find,
    getCollisionEnter: getCollisionEnter,
    getCollisionStay: getCollisionStay,
    getCollisionExit: getCollisionExit,

    // Spanish aliases
    instanciar: instantiate,
    buscar: find,
    alEntrarEnColision: getCollisionEnter,
    alPermanecerEnColision: getCollisionStay,
    alSalirDeColision: getCollisionExit,
};

export function getAPIs() {
    return engineAPIs;
}
