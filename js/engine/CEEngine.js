// js/engine/CEEngine.js

import * as SceneManager from './SceneManager.js';

let physicsSystem = null;
let currentDeltaTime = 0;

export function initialize(dependencies) {
    physicsSystem = dependencies.physicsSystem;
}

export function update(dt) {
    currentDeltaTime = dt;
    checkMemory();
}

let lastOptimizationTime = 0;
function checkMemory() {
    if (!window.performance || !window.performance.memory) return;

    const now = performance.now();
    if (now - lastOptimizationTime < 10000) return; // Optimize at most every 10 seconds

    const memory = window.performance.memory;
    const usedMB = memory.usedJSHeapSize / 1048576;

    // We need access to the config, but CEEngine is engine-side.
    // For now we use a default or look for a global if available.
    const limitMB = window.currentProjectConfig ? (window.currentProjectConfig.ramLimit || 2048) : 2048;

    if (usedMB > limitMB * 0.8) {
        console.warn(`[Engine] RAM usage high (${Math.round(usedMB)}MB). Triggering optimization...`);
        optimize();
        lastOptimizationTime = now;
    }
}

export function optimize() {
    // 1. Clear AssetUtils cache (if it had one, currently it doesn't cache heavily)
    // 2. Clear Scratch Canvases in editor.js if we could access them
    // 3. For now, we'll just log and maybe suggest GC if in a supported env
    if (window.gc) {
        window.gc();
    }
}

function getDeltaTime() {
    return currentDeltaTime;
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
    // Si solo se pasa un argumento y es un string, asumimos que es el tag
    if (tag === null && typeof materia === 'string') {
        tag = materia;
        materia = null; // El sistema lo resolverá al objeto que llama si es posible, o fallará elegantemente
    }
    return physicsSystem.getCollisionInfo(materia, 'enter', 'collision', tag);
}

function getCollisionStay(materia, tag = null) {
    if (!physicsSystem) return [];
    if (tag === null && typeof materia === 'string') {
        tag = materia;
        materia = null;
    }
    return physicsSystem.getCollisionInfo(materia, 'stay', 'collision', tag);
}

function getCollisionExit(materia, tag = null) {
    if (!physicsSystem) return [];
    if (tag === null && typeof materia === 'string') {
        tag = materia;
        materia = null;
    }
    return physicsSystem.getCollisionInfo(materia, 'exit', 'collision', tag);
}

/**
 * Comprueba si un objeto está tocando a otro con un tag específico.
 * Busca tanto en colisiones físicas como en gatillos (triggers), y tanto
 * en el frame de inicio como en los de permanencia.
 */
function isTouchingTag(materia, tag = null) {
    if (!physicsSystem) return false;
    if (tag === null && typeof materia === 'string') {
        tag = materia;
        materia = null;
    }

    // Comprobar tanto frame de inicio como de permanencia, y tanto colisiones como triggers
    const enterCol = physicsSystem.getCollisionInfo(materia, 'enter', null, tag);
    if (enterCol.length > 0) return true;
    const stayCol = physicsSystem.getCollisionInfo(materia, 'stay', null, tag);
    if (stayCol.length > 0) return true;

    return false;
}

function raycast(origin, direction, maxDistance = Infinity, tag = null) {
    if (!physicsSystem) return null;
    return physicsSystem.raycast(origin, direction, maxDistance, tag);
}

// --- The Public API Object ---
// This object will be exposed to the user scripts.
// We can add more global functions here in the future.
const engineAPIs = {
    find: find,
    getCollisionEnter: getCollisionEnter,
    getCollisionStay: getCollisionStay,
    getCollisionExit: getCollisionExit,
    isTouchingTag: isTouchingTag,
    raycast: raycast,

    // Spanish aliases
    buscar: find,
    alEntrarEnColision: getCollisionEnter,
    alPermanecerEnColision: getCollisionStay,
    alSalirDeColision: getCollisionExit,
    estaTocandoTag: isTouchingTag,
    lanzarRayo: raycast,
    getDeltaTime: getDeltaTime,
    obtenerDeltaTime: getDeltaTime,
};

export function getAPIs() {
    return engineAPIs;
}
