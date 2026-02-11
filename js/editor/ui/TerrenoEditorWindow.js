
import * as SceneManager from '../../engine/SceneManager.js';
import * as Components from '../../engine/Components.js';

export const TerrenoEditorWindow = {
    settings: {
        brushSize: 50,
        brushStrength: 100,
        mode: 'draw', // 'draw', 'erase'
        selectedLayer: 0
    },

    initialize(dependencies) {
        this.dom = dependencies.dom;
        this.updateInspector = dependencies.updateInspector;

        // Listen for tool changes to show/hide specialized terrain UI if needed
        // but for now we'll just keep the settings in memory and use them in SceneView.
    },

    setMode(mode) {
        this.settings.mode = mode;
        console.log(`Modo de terreno: ${mode}`);
    },

    setBrushSize(size) {
        this.settings.brushSize = parseFloat(size);
    },

    setBrushStrength(strength) {
        this.settings.brushStrength = parseFloat(strength);
    },

    setSelectedLayer(index) {
        this.settings.selectedLayer = parseInt(index);
    }
};
