// js/engine/RuntimeAPIManager.js

/**
 * @module RuntimeAPIManager
 * @description Gestiona las APIs de las librerías que están disponibles en tiempo de ejecución para los scripts .ces.
 */

const registeredAPIs = new Map();

/**
 * Registra las funciones exportadas por una librería.
 * @param {string} libraryName - El nombre de la librería (ej: "MiLibreriaDeFisicas").
 * @param {object} apiObject - El objeto devuelto por el script de la librería, que contiene las funciones a exponer.
 */
export function registerAPI(libraryName, apiObject) {
    if (registeredAPIs.has(libraryName)) {
        console.warn(`La librería '${libraryName}' ya está registrada. Se va a sobreescribir su API.`);
    }
    registeredAPIs.set(libraryName, apiObject);
    console.log(`API registrada para la librería en tiempo de ejecución: '${libraryName}'`);
}

/**
 * Finds which registered API (from a given list) contains a specific function.
 * @param {string} functionName - The name of the function to search for.
 * @param {string[]} importedAPIs - An array of API names that the script has imported.
 * @returns {string|null} The name of the API that contains the function, or null if not found.
 */
export function findFunctionInAPIs(functionName, importedAPIs) {
    for (const apiName of importedAPIs) {
        const apiObject = registeredAPIs.get(apiName);
        if (apiObject && typeof apiObject[functionName] === 'function') {
            return apiName;
        }
    }
    return null;
}

/**
 * Obtiene el objeto API para una librería específica.
 * @param {string} libraryName - El nombre de la librería.
 * @returns {object | undefined} El objeto API o undefined si no se encuentra.
 */
export function getAPI(libraryName) {
    return registeredAPIs.get(libraryName);
}

/**
 * Devuelve un mapa con todas las APIs registradas.
 * Utilizado por el transpilador para saber qué funciones de librerías están disponibles.
 * @returns {Map<string, object>} El mapa de APIs.
 */
export function getAPIs() {
    return registeredAPIs;
}

/**
 * Limpia todas las APIs registradas.
 * Es útil al cambiar de proyecto o recargar el editor.
 */
export function clearAPIs() {
    registeredAPIs.clear();
    console.log("Todas las APIs de tiempo de ejecución han sido eliminadas.");
}

// --- Game Memory & Global Variables ---
const gameMemory = new Map();

/**
 * Establece una variable global en la memoria del juego.
 * @param {string} key
 * @param {any} value
 */
export function setGlobal(key, value) {
    gameMemory.set(key, value);
}

/**
 * Obtiene una variable global de la memoria del juego.
 * @param {string} key
 * @returns {any}
 */
export function getGlobal(key) {
    return gameMemory.get(key);
}

/**
 * Guarda un dato de forma persistente en el disco del navegador.
 * @param {string} key
 * @param {any} value
 */
export function saveToDisk(key, value) {
    try {
        localStorage.setItem(`ce_save_${key}`, JSON.stringify(value));
    } catch (e) {
        console.error("Error al guardar en disco:", e);
    }
}

/**
 * Carga un dato persistente del disco del navegador.
 * @param {string} key
 * @returns {any}
 */
export function loadFromDisk(key) {
    try {
        const data = localStorage.getItem(`ce_save_${key}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("Error al cargar de disco:", e);
        return null;
    }
}

let uiSystem = null;
export function setUISystem(ui) { uiSystem = ui; }
export function getUISystem() { return uiSystem; }
