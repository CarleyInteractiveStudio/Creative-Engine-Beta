// js/engine/CEEngine.js

import * as SceneManager from './SceneManager.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import * as PerformanceAPI from './PerformanceAPI.js';
import * as AssetUtils from './AssetUtils.js';
import * as Components from './Components.js';
import * as MathUtils from './MathUtils.js';
import * as RuntimeAPIManager from './RuntimeAPIManager.js';

let physicsSystem = null;
let currentDeltaTime = 0;
let performanceMonitor = null;

export function initialize(dependencies) {
    physicsSystem = dependencies.physicsSystem;
    if (!performanceMonitor) {
        performanceMonitor = new PerformanceMonitor(this);
        PerformanceAPI.setPerformanceMonitor(performanceMonitor);
    }
}

export function update(dt) {
    currentDeltaTime = dt;
    if (performanceMonitor) {
        performanceMonitor.recordFrame(dt);
    }
    checkMemory();
}

export function getPerformanceMonitor() {
    return performanceMonitor;
}

let lastOptimizationTime = 0;
function checkMemory() {
    if (!window.performance || !window.performance.memory) return;

    const now = performance.now();
    if (now - lastOptimizationTime < 10000) return; // Optimize at most every 10 seconds

    const memory = window.performance.memory;
    const usedMB = memory.usedJSHeapSize / 1048576;

    // Guard: Sandbox memory reporting is highly capped in browsers (often report ~30MB heap).
    // Do not trigger aggressive/heavy engine-level optimizations unless used RAM is at least 150MB,
    // to prevent artificial performance degradation on sandboxed runtimes.
    if (usedMB < 150) return;

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
    console.log("[Engine] Optimización manual de memoria iniciada...");

    // 1. Clear AssetUtils cache
    AssetUtils.clearAssetCache();

    // 2. Suggest GC if in a supported env
    if (window.gc) {
        window.gc();
    }

    // 3. Trigger deep optimization in all components
    if (SceneManager.currentScene) {
        SceneManager.currentScene.getAllMaterias().forEach(m => {
                const terrain = m.getComponent(Components.Terreno2D);
                if (terrain && terrain.imageCache) {
                    // Clear terrain texture cache if it gets too large
                    if (terrain.imageCache.size > 5) {
                        terrain.imageCache.clear();
                    }
                }
            });
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

    // Soporte para argumentos desglosados (x, y, dirX, dirY, dist)
    if (arguments.length >= 5 && typeof arguments[0] === 'number') {
        const x = arguments[0];
        const y = arguments[1];
        const dx = arguments[2];
        const dy = arguments[3];
        const dist = arguments[4];
        const t = arguments[5] || null;
        return physicsSystem.raycast({x, y}, {x: dx, y: dy}, dist, t);
    }

    return physicsSystem.raycast(origin, direction, maxDistance, tag);
}

function circleCast(origin, direction, radius, maxDistance = Infinity, tag = null) {
    if (!physicsSystem) return null;

    if (arguments.length >= 6 && typeof arguments[0] === 'number') {
        const x = arguments[0];
        const y = arguments[1];
        const dx = arguments[2];
        const dy = arguments[3];
        const r = arguments[4];
        const dist = arguments[5];
        const t = arguments[6] || null;
        return physicsSystem.circleCast({x, y}, {x: dx, y: dy}, r, dist, t);
    }

    return physicsSystem.circleCast(origin, direction, radius, maxDistance, tag);
}

function checkUIOverlap(mtrA, mtrB) {
    const ui = RuntimeAPIManager.getUISystem();
    if (ui && typeof ui.checkUIOverlap === 'function') {
        return ui.checkUIOverlap(mtrA, mtrB);
    }
    return false;
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
    circleCast: circleCast,

    // Spanish aliases
    buscar: find,
    alEntrarEnColision: getCollisionEnter,
    alPermanecerEnColision: getCollisionStay,
    alSalirDeColision: getCollisionExit,
    estaTocandoTag: isTouchingTag,
    lanzarRayo: raycast,
    lanzarCirculo: circleCast,
    checkUIOverlap: checkUIOverlap,
    solapamientoUI: checkUIOverlap,
    getDeltaTime: getDeltaTime,
    obtenerDeltaTime: getDeltaTime,

    // Global Variables & Persistence
    setGlobal: RuntimeAPIManager.setGlobal,
    getGlobal: RuntimeAPIManager.getGlobal,
    saveToDisk: RuntimeAPIManager.saveToDisk,
    loadFromDisk: RuntimeAPIManager.loadFromDisk,

    // Spanish Aliases
    establecerGlobal: RuntimeAPIManager.setGlobal,
    obtenerGlobal: RuntimeAPIManager.getGlobal,
    guardarEnDisco: RuntimeAPIManager.saveToDisk,
    cargarDeDisco: RuntimeAPIManager.loadFromDisk,

    // Math Utils
    random: MathUtils.random,
    azar: MathUtils.random,
    sin: MathUtils.seno,
    seno: MathUtils.seno,
    cos: MathUtils.coseno,
    coseno: MathUtils.coseno,
    distance: MathUtils.distancia,
    distancia: MathUtils.distancia,
};

export function getAPIs() {
    return engineAPIs;
}
