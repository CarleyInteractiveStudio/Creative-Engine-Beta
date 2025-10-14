// --- Module for the F Code Editor (Blockly) ---

let workspace = null;

// --- 1. Custom Block Definitions ---

// Define the JSON for the custom blocks.
Blockly.defineBlocksWithJsonArray([
    // Block for 'On Scene Start' event
    {
        "type": "event_on_start",
        "message0": "Al iniciar la escena",
        "nextStatement": null,
        "colour": "#4C97FF", // Event block color
        "tooltip": "Ejecuta el código adjunto cuando la escena comienza.",
        "helpUrl": ""
    },
    // Block for 'Move to (x, y)'
    {
        "type": "motion_moveto",
        "message0": "Mover a x: %1 y: %2",
        "args0": [
            { "type": "input_value", "name": "X", "check": "Number" },
            { "type": "input_value", "name": "Y", "check": "Number" }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": "#4C97FF", // Motion block color
        "tooltip": "Mueve el objeto a las coordenadas especificadas.",
        "helpUrl": ""
    },
    // Block for 'Show/Hide'
    {
        "type": "looks_showhide",
        "message0": "%1 el objeto",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "ACTION",
                "options": [
                    ["Mostrar", "SHOW"],
                    ["Ocultar", "HIDE"]
                ]
            }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": "#9966FF", // Looks block color
        "tooltip": "Muestra u oculta el objeto en la escena.",
        "helpUrl": ""
    }
]);


// --- 2. Custom Block Code Generators ---

// Generator for 'On Scene Start'
Blockly.JavaScript['event_on_start'] = function(block) {
    var statements_code = Blockly.JavaScript.statementToCode(block, 'NEXT');
    // In a real engine, this would be part of a class method like `start()`
    var code = 'function onStart() {\n' + statements_code + '}\n';
    return code;
};

// Generator for 'Move to (x, y)'
Blockly.JavaScript['motion_moveto'] = function(block) {
    var value_x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_ATOMIC) || 0;
    var value_y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_ATOMIC) || 0;
    // In a real engine, 'this' would refer to the script component instance.
    var code = `this.gameObject.transform.position.x = ${value_x};\nthis.gameObject.transform.position.y = ${value_y};\n`;
    return code;
};

// Generator for 'Show/Hide'
Blockly.JavaScript['looks_showhide'] = function(block) {
    var dropdown_action = block.getFieldValue('ACTION');
    var isVisible = (dropdown_action === 'SHOW');
    // Assuming the object has a 'visible' or 'enabled' property
    var code = `this.gameObject.visible = ${isVisible};\n`;
    return code;
};


/**
 * Initializes the Blockly workspace.
 * @param {HTMLElement} blocklyDiv The div element to inject Blockly into.
 */
export function initialize(blocklyDiv) {
    if (workspace || !blocklyDiv) {
        return;
    }

    // Updated toolbox with the new custom blocks
    const toolbox = {
        "kind": "flyoutToolbox",
        "contents": [
            {
                "kind": "category",
                "name": "Eventos",
                "colour": "#4C97FF",
                "contents": [
                    { "kind": "block", "type": "event_on_start" }
                ]
            },
            {
                "kind": "category",
                "name": "Movimiento",
                "colour": "#4C97FF",
                "contents": [
                    { "kind": "block", "type": "motion_moveto" }
                ]
            },
            {
                "kind": "category",
                "name": "Apariencia",
                "colour": "#9966FF",
                "contents": [
                    { "kind": "block", "type": "looks_showhide" }
                ]
            },
             {
                "kind": "category",
                "name": "Control",
                "colour": "#FFAB19",
                "contents": [
                     { "kind": "block", "type": "controls_if" }
                ]
            },
            {
                "kind": "category",
                "name": "Lógica",
                "colour": "#4CBFE6",
                "contents": [
                    { "kind": "block", "type": "logic_compare" }
                ]
            },
            {
                "kind": "category",
                "name": "Valores",
                "colour": "#59C059",
                "contents": [
                    { "kind": "block", "type": "math_number" },
                    { "kind": "block", "type": "text" }
                ]
            }
        ]
    };

    workspace = Blockly.inject(blocklyDiv, {
        toolbox: toolbox,
        renderer: 'zelos' // Modern renderer that looks good
    });

    console.log("Blockly workspace initialized with custom blocks.");
}

/**
 * Generates JavaScript code from the workspace and displays it.
 * @param {HTMLElement} previewElement The <pre><code> element to display the code in.
 */
export function generateCode(previewElement) {
    if (workspace && previewElement) {
        const code = Blockly.JavaScript.workspaceToCode(workspace);
        previewElement.textContent = code;
        // If using a syntax highlighter like Prism or highlight.js, you would call it here.
        // e.g., Prism.highlightElement(previewElement);
    }
}

/**
 * Toggles the visibility of the code preview panel.
 * @param {HTMLElement} previewPanel The panel element to show/hide.
 * @param {HTMLElement} previewCodeElement The <code> element for the code.
 */
export function toggleCodePreview(previewPanel, previewCodeElement) {
    if (!previewPanel) return;

    const isVisible = previewPanel.style.display !== 'none';
    if (isVisible) {
        previewPanel.style.display = 'none';
    } else {
        previewPanel.style.display = 'block';
        generateCode(previewCodeElement); // Generate/update code when showing
    }
}
