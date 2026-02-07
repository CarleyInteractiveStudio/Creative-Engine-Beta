// js/engine/SceneAPI.js

import * as SceneManager from './SceneManager.js';

/**
 * Sets the ambient light color for the entire scene.
 * @param {string} color - The color in a format compatible with CSS (e.g., '#RRGGBB', 'rgb(r,g,b)').
 */
function setAmbientLight(color) {
    if (SceneManager.currentScene && SceneManager.currentScene.ambiente) {
        SceneManager.currentScene.ambiente.luzAmbiental = color;
    } else {
        console.warn('SceneAPI.setAmbientLight: No current scene or ambiente properties found.');
    }
}

/**
 * Sets the time of day for the scene's day/night cycle.
 * @param {number} time - A value between 0 and 23.99 representing the hour of the day.
 */
function setTime(time) {
    if (SceneManager.currentScene && SceneManager.currentScene.ambiente) {
        // Clamp the value to be within a 24-hour cycle
        const clampedTime = Math.max(0, Math.min(23.99, time));
        SceneManager.currentScene.ambiente.hora = clampedTime;
    } else {
        console.warn('SceneAPI.setTime: No current scene or ambiente properties found.');
    }
}

// --- The Public API Object ---
const sceneAPI = {
    setAmbientLight: setAmbientLight,
    setTime: setTime,
    instantiatePrefab: SceneManager.instanciarPrefab,

    // Spanish aliases
    establecerLuzAmbiental: setAmbientLight,
    establecerHora: setTime,
    instanciarPrefab: SceneManager.instanciarPrefab,
};

export function getAPIs() {
    return sceneAPI;
}
