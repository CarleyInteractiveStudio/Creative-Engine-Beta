// js/engine/AnimationAPI.js

// js/engine/AnimationAPI.js

import * as Components from './Components.js';

let currentMateria = null;

function setCurrentMateriaContext(materia) {
    currentMateria = materia;
}

/**
 * Plays an animation state on the current Materia.
 * The Materia must have an AnimatorController component.
 * @param {string} stateName The name of the animation state to play.
 */
function play(stateName) {
    if (!currentMateria) {
        console.error('ce.animation.play: No se pudo determinar el objeto actual del script.');
        return;
    }

    const controller = currentMateria.getComponent(Components.AnimatorController);
    if (controller) {
        controller.play(stateName);
    } else {
        console.warn(`ce.animation.play: El objeto '${currentMateria.name}' no tiene un componente AnimatorController.`);
    }
}

/**
 * The public API object that will be exposed to user scripts.
 */
const animationAPI = {
    play
};

// Export the functions for the EngineAPI to manage
export function getAPIs() {
    return animationAPI;
}

export function setCurrentMateria(materia) {
    setCurrentMateriaContext(materia);
}
