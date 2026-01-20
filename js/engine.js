
// --- Engine Entry Point ---

// Core
import * as SceneManager from './engine/SceneManager.js';
import { Renderer } from './engine/Renderer.js';
import { PhysicsSystem } from './engine/Physics.js';
import { InputManager } from './engine/Input.js';
import { Materia } from './engine/Materia.js';
import * as Components from './engine/Components.js';
import * as MathUtils from './engine/MathUtils.js';
import * as AssetUtils from './engine/AssetUtils.js';
import * as RuntimeAPIManager from './engine/RuntimeAPIManager.js';

// UI
import * as UISystem from './engine/ui/UISystem.js';
import * as UITransformUtils from './engine/UITransformUtils.js';

// Export all modules as a single Engine object
export const Engine = {
    SceneManager,
    Renderer,
    PhysicsSystem,
    InputManager,
    Materia,
    Components,
    MathUtils,
    AssetUtils,
    RuntimeAPIManager,
    UISystem,
    UITransformUtils
};
