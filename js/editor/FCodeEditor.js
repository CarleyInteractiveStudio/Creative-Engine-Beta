// js/editor/FCodeEditor.js

// This module will handle the logic for the Blockly-based "PFC" editor.
import { insertCodeAtCursor, getEditor } from './CodeEditorWindow.js';

// --- Module State ---
let workspace = null;

// --- Blockly Toolbox Definition (in JSON format) ---
const toolboxJson = {
    "kind": "categoryToolbox",
    "search": {
        "enabled": true,
        "placeholder": "Buscar bloque..."
    },
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
                { "kind": "block", "type": "wait_seconds" },
                { "kind": "block", "type": "math_number", "fields": { "NUM": 100 } }
            ]
        },
        {
            "kind": "category",
            "name": "Movimiento",
            "colour": "%{BKY_PROCEDURES_HUE}",
            "contents": [
                { "kind": "block", "type": "move_forward" },
                { "kind": "block", "type": "turn_right" },
                { "kind": "block", "type": "go_to_xy" },
                { "kind": "block", "type": "set_rotation" },
                { "kind": "block", "type": "change_rotation" }
            ]
        },
        {
            "kind": "category",
            "name": "Apariencia",
            "colour": "260",
            "contents": [
                { "kind": "block", "type": "change_costume" },
                { "kind": "block", "type": "show" },
                { "kind": "block", "type": "hide" },
                { "kind": "block", "type": "set_size" },
                { "kind": "block", "type": "change_size" }
            ]
        },
        {
            "kind": "category",
            "name": "Sonido",
            "colour": "300",
            "contents": [
                { "kind": "block", "type": "play_sound" },
                { "kind": "block", "type": "play_sound_and_wait" },
                { "kind": "block", "type": "stop_all_sounds" }
            ]
        },
        {
            "kind": "category",
            "name": "Sensores",
            "colour": "180",
            "contents": [
                { "kind": "block", "type": "on_collision" },
                { "kind": "block", "type": "key_pressed" }
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
            this.appendValueInput("VOLUME")
                .setCheck("Number")
                .appendField("a volumen");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setInputsInline(true);
            this.setColour(300);
            this.setTooltip("Reproduce un archivo de sonido a un volumen específico (0-100).");
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

    Blockly.Blocks['set_rotation'] = {
        init: function() {
            this.appendValueInput("DEGREES")
                .setCheck("Number")
                .appendField("fijar rotación a");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour("%{BKY_PROCEDURES_HUE}");
            this.setTooltip("Fija la rotación del objeto a un valor específico en grados.");
        }
    };

    Blockly.Blocks['change_rotation'] = {
        init: function() {
            this.appendValueInput("DEGREES")
                .setCheck("Number")
                .appendField("girar");
            this.appendDummyInput()
                .appendField("grados");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setInputsInline(true);
            this.setColour("%{BKY_PROCEDURES_HUE}");
            this.setTooltip("Suma un valor a la rotación actual del objeto.");
        }
    };

    Blockly.Blocks['set_size'] = {
        init: function() {
            this.appendValueInput("SIZE")
                .setCheck("Number")
                .appendField("fijar tamaño al");
            this.appendDummyInput()
                .appendField("%");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setInputsInline(true);
            this.setColour(260);
            this.setTooltip("Fija el tamaño del objeto como un porcentaje de su tamaño original.");
        }
    };

    Blockly.Blocks['change_size'] = {
        init: function() {
            this.appendValueInput("SIZE")
                .setCheck("Number")
                .appendField("sumar al tamaño");
            this.appendDummyInput()
                .appendField("%");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setInputsInline(true);
            this.setColour(260);
            this.setTooltip("Añade un porcentaje al tamaño actual del objeto.");
        }
    };

    Blockly.Blocks['play_sound_and_wait'] = {
        init: function() {
            this.appendValueInput("SOUND")
                .setCheck("String")
                .appendField("reproducir sonido y esperar");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip("Reproduce un sonido y espera a que termine antes de continuar.");
        }
    };

    Blockly.Blocks['stop_all_sounds'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("detener todos los sonidos");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(300);
            this.setTooltip("Detiene todos los sonidos que se estén reproduciendo.");
        }
    };

    Blockly.Blocks['key_pressed'] = {
        init: function() {
            this.appendValueInput("KEY")
                .setCheck("String")
                .appendField("¿tecla");
            this.appendDummyInput()
                .appendField("presionada?");
            this.setOutput(true, "Boolean");
            this.setInputsInline(true);
            this.setColour(180);
            this.setTooltip("Devuelve verdadero si la tecla especificada está siendo presionada.");
        }
    };
}

// --- Code Generators ---
function defineCodeGenerators() {
    if (!Blockly.JavaScript) {
        Blockly.JavaScript = new Blockly.Generator('JavaScript');
    }
    const JS = Blockly.JavaScript;

    JS['event_start'] = function(block) {
        return 'function start() {\n' + JS.statementToCode(block, 'DO') + '}\n';
    };

    JS['move_forward'] = function(block) {
        const distance = JS.valueToCode(block, 'DISTANCE', JS.ORDER_ATOMIC) || '0';
        return `this.materia.getComponent("Transform").x += ${distance};\n`;
    };

    JS['turn_right'] = function(block) {
        const degrees = JS.valueToCode(block, 'DEGREES', JS.ORDER_ATOMIC) || '0';
        return `this.materia.getComponent("Transform").rotation += ${degrees};\n`;
    };

    JS['go_to_xy'] = function(block) {
        const x = JS.valueToCode(block, 'X', JS.ORDER_ATOMIC) || '0';
        const y = JS.valueToCode(block, 'Y', JS.ORDER_ATOMIC) || '0';
        return `this.materia.getComponent("Transform").x = ${x};\nthis.materia.getComponent("Transform").y = ${y};\n`;
    };

    JS['set_rotation'] = function(block) {
        const degrees = JS.valueToCode(block, 'DEGREES', JS.ORDER_ATOMIC) || '0';
        return `this.materia.getComponent("Transform").rotation = ${degrees};\n`;
    };

    JS['change_rotation'] = function(block) {
        const degrees = JS.valueToCode(block, 'DEGREES', JS.ORDER_ATOMIC) || '0';
        return `this.materia.getComponent("Transform").rotation += ${degrees};\n`;
    };

    JS['show'] = function(block) {
        return 'this.materia.getComponent("SpriteRenderer").enabled = true;\n';
    };

    JS['hide'] = function(block) {
        return 'this.materia.getComponent("SpriteRenderer").enabled = false;\n';
    };

    JS['change_costume'] = function(block) {
        const costume = JS.valueToCode(block, 'COSTUME', JS.ORDER_ATOMIC) || '""';
        return `this.materia.getComponent("SpriteRenderer").spriteName = ${costume};\n`;
    };

    JS['set_size'] = function(block) {
        const size = JS.valueToCode(block, 'SIZE', JS.ORDER_ATOMIC) || '100';
        return `this.materia.getComponent("Transform").scale = { x: ${size} / 100, y: ${size} / 100 };\n`;
    };

    JS['change_size'] = function(block) {
        const size = JS.valueToCode(block, 'SIZE', JS.ORDER_ATOMIC) || '0';
        return `this.materia.getComponent("Transform").scale.x += ${size} / 100;\nthis.materia.getComponent("Transform").scale.y += ${size} / 100;\n`;
    };

    JS['key_pressed'] = function(block) {
        const key = JS.valueToCode(block, 'KEY', JS.ORDER_ATOMIC) || '""';
        return [`Input.isKeyPressed(${key})`, JS.ORDER_ATOMIC];
    };

    // --- Placeholder Generators for blocks that need more engine features ---
    JS['wait_seconds'] = function(block) {
        const seconds = JS.valueToCode(block, 'SECONDS', JS.ORDER_ATOMIC) || '0';
        return `// Engine.wait(${seconds}); // Funcionalidad no implementada en el motor\n`;
    };
    JS['play_sound'] = function(block) {
        const sound = JS.valueToCode(block, 'SOUND', JS.ORDER_ATOMIC) || '""';
        const volume = JS.valueToCode(block, 'VOLUME', JS.ORDER_ATOMIC) || '100';
        return `// Audio.play(${sound}, { volume: ${volume} / 100 }); // Funcionalidad no implementada en el motor\n`;
    };
    JS['play_sound_and_wait'] = function(block) {
        const sound = JS.valueToCode(block, 'SOUND', JS.ORDER_ATOMIC) || '""';
        return `// await Audio.playAndWait(${sound}); // Funcionalidad no implementada en el motor\n`;
    };
    JS['stop_all_sounds'] = function(block) {
        return `// Audio.stopAll(); // Funcionalidad no implementada en el motor\n`;
    };
    JS['on_collision'] = function(block) {
        const target = JS.valueToCode(block, 'TARGET', JS.ORDER_ATOMIC) || '""';
        const statements = JS.statementToCode(block, 'DO');
        return `function onCollision(collider) {\n// if (collider.tag === ${target}) {\n${statements}// }\n}\n`;
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

    defineCodeGenerators();

    // Event listener for syncing blocks to code in "Ambos" mode
    workspace.addChangeListener(event => {
        // We only care about blocks being created directly on the main workspace
        // This corresponds to a drag-from-toolbox event
        if (event.type === Blockly.Events.BLOCK_CREATE && event.group === '') {
            const codeEditor = getEditor();
            if (codeEditor && document.body.dataset.editorMode === 'Ambos') {
                const block = workspace.getBlockById(event.blockId);
                if (block) {
                    const code = Blockly.JavaScript.blockToCode(block);
                    insertCodeAtCursor(code);
                    // Immediately delete the block from the visual workspace
                    // to keep it clean, as the representation is now in the code.
                    block.dispose(true);
                }
            }
        }
    });

    // Add search functionality to the toolbox
    const searchInput = document.querySelector('.blocklySearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

            if (!searchTerm) {
                workspace.updateToolbox(toolboxJson);
                return;
            }

            const filteredToolbox = {
                "kind": "categoryToolbox",
                "contents": []
            };

            toolboxJson.contents.forEach(category => {
                const filteredBlocks = category.contents.filter(block => {
                    const blockType = block.type.toLowerCase();
                    return blockType.includes(searchTerm);
                });

                if (filteredBlocks.length > 0) {
                    filteredToolbox.contents.push({
                        ...category,
                        "contents": filteredBlocks
                    });
                }
            });

            workspace.updateToolbox(filteredToolbox);
        });
    }

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
