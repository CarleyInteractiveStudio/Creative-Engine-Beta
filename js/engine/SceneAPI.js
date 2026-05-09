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

/**
 * Sets visual properties for a specific layer.
 * @param {number|string} layer - The layer index or name.
 * @param {object} settings - { opacity: 0-1, visible: boolean, pixelated: boolean }
 */
function setLayerSettings(layer, settings) {
    if (!SceneManager.currentScene) return;

    let index = -1;
    if (typeof layer === 'number') {
        index = layer;
    } else {
        const config = window.currentProjectConfig;
        if (config && config.layers && config.layers.sortingLayers) {
            index = config.layers.sortingLayers.indexOf(layer);
        }
    }

    if (index >= 0) {
        SceneManager.currentScene.layerSettings[index] = {
            ... (SceneManager.currentScene.layerSettings[index] || { opacity: 1, visible: true, pixelated: false }),
            ...settings
        };
    }
}

/**
 * Configures the 3D Sky system.
 * @param {object} settings - { skyMode: 'None'|'Gradient', skyColor: hex, horizonColor: hex, groundColor: hex }
 */
function setSkySettings(settings) {
    if (!SceneManager.currentScene || !SceneManager.currentScene.ambiente) return;
    Object.assign(SceneManager.currentScene.ambiente, settings);
}

/**
 * Configures advanced graphics settings.
 * @param {object} settings - { graphicMode: 'Realistic'|'Anime', realismLevel: 0-100, realismFilter: boolean }
 */
function setGraphicsSettings(settings) {
    if (!SceneManager.currentScene || !SceneManager.currentScene.ambiente) return;
    Object.assign(SceneManager.currentScene.ambiente, settings);
}

/**
 * Configures rendering optimizations.
 * @param {object} settings - { optiCameraCulling: boolean, optiLODDistance: number }
 */
function setOptimizationSettings(settings) {
    if (!SceneManager.currentScene || !SceneManager.currentScene.ambiente) return;
    Object.assign(SceneManager.currentScene.ambiente, settings);
}

// --- The Public API Object ---
const sceneAPI = {
    setLayerSettings: setLayerSettings,
    setAmbientLight: setAmbientLight,
    setSkySettings: setSkySettings,
    setGraphicsSettings: setGraphicsSettings,
    setOptimizationSettings: setOptimizationSettings,
    setTime: setTime,
    instantiatePrefab: SceneManager.instanciarPrefab,
    loadScene: SceneManager.loadSceneByPath,

    // Spanish aliases
    configurarCapa: setLayerSettings,
    establecerLuzAmbiental: setAmbientLight,
    configurarCielo: setSkySettings,
    configurarGraficos: setGraphicsSettings,
    configurarOptimizacion: setOptimizationSettings,
    establecerHora: setTime,
    instanciarPrefab: SceneManager.instanciarPrefab,
    cargarEscena: SceneManager.loadSceneByPath,

    get loadingProgress() { return SceneManager.loadingProgress || 0; },
    get progresoCarga() { return SceneManager.loadingProgress || 0; }
};

export function getAPIs() {
    return sceneAPI;
}

/**
 * Carga la escena siguiente en la lista de escenas del proyecto.
 */
async function loadNextScene() {
    const config = window.currentProjectConfig;
    if (!config || !config.scenes) return;

    const currentPath = SceneManager.currentScenePath;
    const currentIndex = config.scenes.indexOf(currentPath);

    if (currentIndex !== -1 && currentIndex < config.scenes.length - 1) {
        return SceneManager.loadSceneByPath(config.scenes[currentIndex + 1]);
    }
}

/**
 * Reinicia la escena actual.
 */
async function restartScene() {
    return SceneManager.loadSceneByPath(SceneManager.currentScenePath);
}

// Actualizar el objeto API (se exporta como referencia, así que mutamos la const si es posible o añadimos al objeto exportado)
Object.assign(sceneAPI, {
    loadNextScene,
    restartScene,
    cargarSiguienteEscena: loadNextScene,
    reiniciarEscena: restartScene
});
