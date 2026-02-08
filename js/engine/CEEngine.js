// js/engine/CEEngine.js

import * as SceneManager from './SceneManager.js';

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

/**
 * Instantiates a prefab from a given path.
 * @param {string} prefabPath The project-relative path to the .ceprefab file.
 * @returns {Promise<import('./Materia.js').Materia | null>} The instantiated Materia or null.
 */
async function instantiatePrefab(prefabPath) {
    if (!SceneManager.currentScene) return null;

    try {
        const url = await window.AssetUtils.getURLForAssetPath(prefabPath, window.projectsDirHandle);
        if (!url) throw new Error("Could not resolve prefab URL");

        const response = await fetch(url);
        const prefabData = await response.json();
        const newMateria = await SceneManager.deserializeMateria(prefabData, window.projectsDirHandle);

        if (newMateria) {
            SceneManager.currentScene.addMateria(newMateria);
            return newMateria;
        }
    } catch (error) {
        console.error(`Error instantiating prefab at '${prefabPath}':`, error);
    }
    return null;
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

// --- The Public API Object ---
// This object will be exposed to the user scripts.
// We can add more global functions here in the future.
const engineAPIs = {
    find: find,
    instantiatePrefab: instantiatePrefab,
    getCollisionEnter: getCollisionEnter,
    getCollisionStay: getCollisionStay,
    getCollisionExit: getCollisionExit,

    // Spanish aliases
    buscar: find,
    instanciarPrefab: instantiatePrefab,
    alEntrarEnColision: getCollisionEnter,
    alPermanecerEnColision: getCollisionStay,
    alSalirDeColision: getCollisionExit,
};

export function getAPIs() {
    return engineAPIs;
}
