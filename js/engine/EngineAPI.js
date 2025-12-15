// js/engine/EngineAPI.js

import * as CEEngine from './CEEngine.js';
import * as SceneAPI from './SceneAPI.js';
import * as InputAPI from './InputAPI.js';

/**
 * Retrieves all registered internal engine APIs.
 * This is used by the editor to register them with the runtime manager before transpilation.
 * @returns {object} An object where keys are API names (e.g., 'engine') and values are the API objects.
 */
export function getAllInternalApis() {
    const engineAPIs = CEEngine.getAPIs();
    const sceneAPIs = SceneAPI.getAPIs();
    const inputAPIs = InputAPI.getAPIs();
    return {
        'engine': engineAPIs,
        'motor': engineAPIs, // Spanish alias
        'scene': sceneAPIs,
        'escena': sceneAPIs, // Spanish alias
        'input': inputAPIs,
        'entrada': inputAPIs // Spanish alias
    };
}

export { CEEngine };
