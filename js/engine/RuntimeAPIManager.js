// js/engine/RuntimeAPIManager.js

/**
 * @module RuntimeAPIManager
 * @description Gestiona las APIs de las librerías que están disponibles durante el juego.
 */

let availableAPIs = {};

/**
 * Actualiza el registro de APIs disponibles.
 * Esto es llamado por el editor cuando se cargan las librerías.
 * @param {object} apiObject - El objeto que contiene todas las APIs de runtime, con los nombres de las librerías como claves.
 */
export function updateAPIs(apiObject) {
    availableAPIs = apiObject;
    console.log("RuntimeAPIManager actualizado con las APIs de las librerías:", Object.keys(availableAPIs));
}

/**
 * Devuelve el registro completo de APIs.
 * Utilizado por el transpiler para saber qué funciones de librerías están disponibles.
 * @returns {object} El objeto de APIs.
 */
export function getAPIs() {
    return availableAPIs;
}
