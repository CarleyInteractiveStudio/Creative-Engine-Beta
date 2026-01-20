// Placeholder for a bundled Creative Engine Runtime
// In a real build process, this file would be generated automatically.

// For now, we will manually include the necessary modules.
// This is a temporary solution to make the build functional.

import { Renderer } from '../js/engine/Renderer.js';
import * as SceneManager from '../js/engine/SceneManager.js';
import * as Components from '../js/engine/Components.js';
import { Materia } from '../js/engine/Materia.js';
import * as InputManager from '../js/engine/Input.js';
import * as PhysicsSystem from '../js/engine/Physics.js';
import * as UISystem from '../js/engine/ui/UISystem.js';

window.CreativeEngine = {
    Renderer,
    SceneManager,
    Components,
    Materia,
    InputManager,
    PhysicsSystem,
    UISystem
};
