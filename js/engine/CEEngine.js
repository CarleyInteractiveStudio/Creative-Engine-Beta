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


function getCollisionEnter(tag = null) {
    return physicsSystem ? physicsSystem.getCollisionEnter(tag) : [];
}

function getCollisionStay(tag = null) {
    return physicsSystem ? physicsSystem.getCollisionStay(tag) : [];
}

function getCollisionExit(tag = null) {
    return physicsSystem ? physicsSystem.getCollisionExit(tag) : [];
}

// --- The Public API Object ---
// This object will be exposed to the user scripts.
// We can add more global functions here in the future.
const engineAPIs = {
    find: find,
    getCollisionEnter: getCollisionEnter,
    getCollisionStay: getCollisionStay,
    getCollisionExit: getCollisionExit,

    // Spanish aliases
    buscar: find,
    alEntrarEnColision: getCollisionEnter,
    alPermanecerEnColision: getCollisionStay,
    alSalirDeColision: getCollisionExit,
};

export function getAPIs() {
    return engineAPIs;
}
