// js/editor/FCodeEditor.js

// This module will handle the logic for the Blockly-based "PFC" editor.

// --- Module State ---
let workspace = null;

// --- Blockly Toolbox Definition (in JSON format) ---
const toolboxJson = {
    "kind": "categoryToolbox",
    "contents": [
        {
            "kind": "category",
            "name": "Control",
            "colour": "%{BKY_LOGIC_HUE}",
            "contents": [
                {
                    "kind": "block",
                    "type": "controls_if"
                },
                {
                    "kind": "block",
                    "type": "controls_repeat_ext"
                }
            ]
        },
        {
            "kind": "category",
            "name": "Movimiento",
            "colour": "210",
            "contents": [
                {
                    "kind": "block",
                    "type": "move_forward"
                },
                {
                    "kind": "block",
                    "type": "turn_right"
                }
            ]
        },
        {
            "kind": "category",
            "name": "Eventos",
            "colour": "120",
            "contents": [
                 {
                    "kind": "block",
                    "type": "event_start"
                }
            ]
        }
    ]
};

// --- Custom Block Definitions ---
// We need to define the custom blocks used in the toolbox, like 'move_forward'.
function defineCustomBlocks() {
    Blockly.Blocks['move_forward'] = {
        init: function() {
            this.appendValueInput("DISTANCE")
                .setCheck("Number")
                .appendField("Mover hacia adelante");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip("Mueve el objeto hacia adelante una cierta distancia.");
        }
    };

    Blockly.Blocks['turn_right'] = {
        init: function() {
            this.appendValueInput("DEGREES")
                .setCheck("Number")
                .appendField("Girar a la derecha");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip("Gira el objeto a la derecha un número de grados.");
        }
    };

    Blockly.Blocks['event_start'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("Al iniciar el juego");
            this.setNextStatement(true, null);
            this.setColour(120);
            this.setTooltip("Este bloque se ejecuta una sola vez al comenzar el juego.");
        }
    };
}


// --- Public API ---

/**
 * Initializes the Blockly workspace.
 * @param {HTMLElement} workspaceDiv The div where the main workspace will be injected.
 * @param {HTMLElement} toolboxDiv The div that will be used as the toolbox.
 */
export function initialize(workspaceDiv, toolboxDiv) {
    if (workspace) {
        // Already initialized
        return;
    }

    defineCustomBlocks();

    // For the toolbox, we will manually create the flyout from our JSON definition.
    // This gives us more control over styling and behavior.
    toolboxDiv.innerHTML = ''; // Clear placeholder
    toolboxJson.contents.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'blockly-toolbox-category';
        categoryDiv.textContent = category.name;
        categoryDiv.style.backgroundColor = category.colour;
        toolboxDiv.appendChild(categoryDiv);
    });

    // Inject the main workspace
    workspace = Blockly.inject(workspaceDiv, {
        toolbox: toolboxJson,
        theme: Blockly.Themes.Zelos,
        renderer: 'zelos',
        media: 'https://unpkg.com/blockly/media/'
    });

    console.log("Blockly editor (PFC) initialized.");
}

/**
 * Resizes the Blockly workspace to fit its container.
 */
export function resizeWorkspace() {
    if (workspace) {
        Blockly.svgResize(workspace);
    }
}
