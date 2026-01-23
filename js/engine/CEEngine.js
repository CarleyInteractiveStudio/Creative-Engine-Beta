// js/engine/CEEngine.js

import * as SceneManager from './SceneManager.js';
import { CoroutineManagerInstance } from './CoroutineManager.js';

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

/**
 * Starts a sequence (coroutine) on a script instance.
 * @param {object} scriptInstance The 'this' context from the script.
 * @param {string} sequenceName The name of the sequence method to start.
 * @param {any[]} args The arguments to pass to the sequence.
 */
function startSequence(scriptInstance, sequenceName, ...args) {
    if (!scriptInstance || typeof scriptInstance[sequenceName] !== 'function') {
        console.error(`Sequence '${sequenceName}' not found on the script instance.`);
        return;
    }
    const generator = scriptInstance[sequenceName](...args);
    CoroutineManagerInstance.start(generator);
}

// --- The Public API Object ---
// This object will be exposed to the user scripts.
// We can add more global functions here in the future.
const engineAPIs = {
    find: find,
    getCollisionEnter: getCollisionEnter,
    getCollisionStay: getCollisionStay,
    getCollisionExit: getCollisionExit,
    startSequence: startSequence,

    // Spanish aliases
    buscar: find,
    alEntrarEnColision: getCollisionEnter,
    alPermanecerEnColision: getCollisionStay,
    alSalirDeColision: getCollisionExit,
    iniciarSecuencia: startSequence,
};

export function getAPIs() {
    return engineAPIs;
}
