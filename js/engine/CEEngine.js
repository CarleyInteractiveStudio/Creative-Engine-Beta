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


function getCollisionEnter(materia, tag = null) {
    if (!physicsSystem) return [];
    let collisions = physicsSystem.getCollisionInfo(materia, 'enter', 'collision');
    if (tag) {
        collisions = collisions.filter(c => c.materia.tag === tag);
    }
    return collisions;
}

function getCollisionStay(materia, tag = null) {
    if (!physicsSystem) return [];
    let collisions = physicsSystem.getCollisionInfo(materia, 'stay', 'collision');

    // --- START DEBUG LOGS ---
    console.log(`[Physics API] getCollisionStay called for "${materia.name}". Looking for tag: "${tag}".`);
    console.log('[Physics API] Collisions found before filtering:', collisions);
    // --- END DEBUG LOGS ---

    if (tag) {
        collisions = collisions.filter(c => {
            // --- START DEBUG LOGS ---
            console.log(`[Physics API] Filtering collision with "${c.materia.name}". Its tag is "${c.materia.tag}". Comparison result: ${c.materia.tag === tag}`);
            // --- END DEBUG LOGS ---
            return c.materia.tag === tag;
        });
    }
    return collisions;
}

function getCollisionExit(materia, tag = null) {
    if (!physicsSystem) return [];
    let collisions = physicsSystem.getCollisionInfo(materia, 'exit', 'collision');
    if (tag) {
        collisions = collisions.filter(c => c.materia.tag === tag);
    }
    return collisions;
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
