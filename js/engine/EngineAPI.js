// js/engine/EngineAPI.js

import * as RuntimeAPIManager from './RuntimeAPIManager.js';
import * as CEEngine from './CEEngine.js';
import * as AmbienteAPI from './AmbienteAPI.js';

/**
 * Initializes and registers all engine-level APIs for the scripting runtime.
 * This acts as a central hub for all APIs that will be exposed to .ces scripts.
 *
 * @param {object} dependencies - An object containing dependencies needed by the APIs.
 * @param {import('./Physics.js').PhysicsSystem} dependencies.physicsSystem - The main physics system instance.
 * @param {object} dependencies.dom - A cache of DOM elements.
 * @param {import('./Renderer.js').Renderer} dependencies.editorRenderer - The editor's renderer instance.
 * @param {import('./Renderer.js').Renderer} dependencies.gameRenderer - The game's renderer instance.
 * @param {function} dependencies.iniciarCiclo - Function to start the day/night cycle.
 * @param {function} dependencies.detenerCiclo - Function to stop the day/night cycle.
 */
export function initialize(dependencies) {
    // Initialize individual APIs that require setup
    CEEngine.engineAPI.initialize(dependencies.physicsSystem);
    AmbienteAPI.initialize({
        dom: dependencies.dom,
        editorRenderer: dependencies.editorRenderer,
        gameRenderer: dependencies.gameRenderer,
        iniciarCiclo: dependencies.iniciarCiclo,
        detenerCiclo: dependencies.detenerCiclo
    });

    // Register APIs with the RuntimeAPIManager
    RuntimeAPIManager.registerAPI('ce.engine', CEEngine.getAPIs());
    RuntimeAPIManager.registerAPI('ce.ambiente', AmbienteAPI.AmbienteAPI);

    // Future APIs can be initialized and registered here.
}

/**
 * Sets the current Materia context for all relevant APIs before a script's update call.
 * @param {import('./Materia.js').Materia} materia
 */
export function setCurrentMateria(materia) {
    CEEngine.engineAPI.setCurrentMateria(materia);
    // Future APIs that need context can have their context set here.
}
