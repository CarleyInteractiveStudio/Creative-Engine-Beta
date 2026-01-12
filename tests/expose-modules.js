// This script is injected by Playwright's add_init_script
// It's a workaround to expose ES module exports to the window object
// so that they can be accessed from page.evaluate()

import * as MateriaFactory from '/js/editor/MateriaFactory.js';
import * as SceneManager from '/js/engine/SceneManager.js';
import * as Components from '/js/engine/Components.js';

// These are functions, not modules, defined in editor.js
// We can't import them, but we can wait for them to be defined.
document.addEventListener('DOMContentLoaded', () => {
    // Expose modules
    window.MateriaFactory = MateriaFactory;
    window.SceneManager = SceneManager;
    window.Components = Components;

    // Expose functions from editor.js scope (these will be available after editor.js runs)
    // We assume selectMateria, updateHierarchy, updateInspector are defined in the global scope for the test
});
