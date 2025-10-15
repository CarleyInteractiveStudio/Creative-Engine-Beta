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
            "name": "Eventos",
            "colour": "50",
            "contents": [
                 { "kind": "block", "type": "event_start" }
            ]
        },
        {
            "kind": "category",
            "name": "Control",
            "colour": "%{BKY_LOGIC_HUE}",
            "contents": [
                { "kind": "block", "type": "controls_if" },
                { "kind": "block", "type": "controls_repeat_ext" },
                { "kind": "block", "type": "wait_seconds" }
            ]
        },
        {
            "kind": "category",
            "name": "Movimiento",
            "colour": "%{BKY_PROCEDURES_HUE}",
            "contents": [
                { "kind": "block", "type": "move_forward" },
                { "kind": "block", "type": "turn_right" },
                { "kind": "block", "type": "go_to_xy" }
            ]
        },
        {
            "kind": "category",
            "name": "Apariencia",
            "colour": "260",
            "contents": [
                { "kind": "block", "type": "change_costume" },
                { "kind": "block", "type": "show" },
                { "kind": "block", "type": "hide" }
            ]
        },
        {
            "kind": "category",
            "name": "Sonido",
            "colour": "300",
            "contents": [
                { "kind": "block", "type": "play_sound" }
            ]
        },
        {
            "kind": "category",
            "name": "Sensores",
            "colour": "180",
            "contents": [
                { "kind": "block", "type": "on_collision" }
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
            this.setColour("%{BKY_PROCEDURES_HUE}");
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
            this.setColour("%{BKY_PROCEDURES_HUE}");
            this.setTooltip("Gira el objeto a la derecha un número de grados.");
        }
    };

    Blockly.Blocks['event_start'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("Al iniciar el juego");
            this.setNextStatement(true, null);
            this.setColour(50);
            this.setTooltip("Este bloque se ejecuta una sola vez al comenzar el juego.");
        }
    };

    Blockly.Blocks['wait_seconds'] = {
        init: function() {
            this.appendValueInput("SECONDS")
                .setCheck("Number")
                .appendField("esperar");
            this.appendDummyInput()
                .appendField("segundos");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setInputsInline(true);
            this.setColour("%{BKY_LOGIC_HUE}");
            this.setTooltip("Pausa la ejecución durante un número de segundos.");
        }
    };

    Blockly.Blocks['go_to_xy'] = {
        init: function() {
            this.appendValueInput("X")
                .setCheck("Number")
                .appendField("ir a x:");
            this.appendValueInput("Y")
                .setCheck("Number")
                .appendField("y:");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setInputsInline(true);
            this.setColour("%{BKY_PROCEDURES_HUE}");
            this.setTooltip("Mueve el objeto a una posición específica.");
        }
    };

    Blockly.Blocks['change_costume'] = {
        init: function() {
            this.appendValueInput("COSTUME")
                .setCheck("String")
                .appendField("cambiar disfraz a");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
            this.setTooltip("Cambia la apariencia del objeto.");
        }
    };

    Blockly.Blocks['show'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("mostrar");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
            this.setTooltip("Hace que el objeto sea visible.");
        }
    };

    Blockly.Blocks['hide'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("ocultar");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(260);
            this.setTooltip("Hace que el objeto sea invisible.");
        }
    };

    Blockly.Blocks['play_sound'] = {
        init: function() {
            this.appendValueInput("SOUND")
                .setCheck("String")
                .appendField("reproducir sonido");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip("Reproduce un archivo de sonido.");
        }
    };

    Blockly.Blocks['on_collision'] = {
        init: function() {
            this.appendValueInput("TARGET")
                .setCheck("String")
                .appendField("al chocar con objeto de tipo");
            this.appendStatementInput("DO")
                .appendField("hacer");
            this.setColour(180);
            this.setTooltip("Se ejecuta cuando este objeto choca con otro.");
        }
    };
}


// --- Public API ---

/**
 * Initializes the Blockly workspace.
 * @param {HTMLElement} containerDiv The div where the entire Blockly UI will be injected.
 */
export function initialize(containerDiv) {
    if (workspace) {
        // Already initialized
        return;
    }

    defineCustomBlocks();

    // Let Blockly handle the DOM injection, including the toolbox.
    workspace = Blockly.inject(containerDiv, {
        toolbox: toolboxJson,
        theme: Blockly.Themes.Zelos,
        renderer: 'zelos',
        media: 'https://unpkg.com/blockly/media/'
    });

    console.log("Blockly editor (PFC) initialized correctly.");
}

/**
 * Resizes the Blockly workspace to fit its container.
 */
export function resizeWorkspace() {
    if (workspace) {
        Blockly.svgResize(workspace);
    }
}
