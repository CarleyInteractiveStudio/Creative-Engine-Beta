// js/engine/CEEngine.js

import * as SceneManager from './SceneManager.js';

/**
 * Finds a Materia in the current scene by its name.
 * @param {string} name The name of the Materia to find.
 * @returns {import('./Materia.js').Materia | null} The found Materia or null.
 */
function find(name) {
    return SceneManager.currentScene ? SceneManager.currentScene.findMateriaByName(name) : null;
}


// --- The Public API Object ---
// This object will be exposed to the user scripts.
// We can add more global functions here in the future.
const engineAPIs = {
    find: find,
    // Spanish alias
    buscar: find,
};

export function getAPIs() {
    return engineAPIs;
}
