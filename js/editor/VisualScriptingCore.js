// js/editor/VisualScriptingCore.js

import { transpile } from './CES_Transpiler.js';

export class VisualScriptingCore {
    constructor() {
        this.blocks = [];
        this.connections = [];
    }

    /**
     * Translates the visual block structure into executable CES code.
     * @param {Object} data - The visual scripting data structure.
     * @returns {string} - Generated CES code.
     */
    static translateToCES(data) {
        let code = "ve motor;\n\n";

        // 1. Declarar Variables (Locales al script)
        const variables = data.blocks.filter(b => b.type === 'variable-decl');
        variables.forEach(v => {
            const val = v.inputs.value || 0;
            code += `variable ${v.inputs.name || 'v'} = ${this.formatValue(val)};\n`;
        });
        if (variables.length > 0) code += "\n";

        // 2. Definir Funciones Personalizadas
        const functions = data.blocks.filter(b => b.type === 'function-decl');
        functions.forEach(func => {
            code += `${func.inputs.name || 'miFuncion'}() {\n`;
            code += this.generateBlockChain(func.nextBlockId, data, "    ");
            code += "}\n\n";
        });

        // 3. Eventos Principales
        const events = data.blocks.filter(b => b.type === 'event');
        events.forEach(event => {
            const eventName = this.mapEventName(event.name);
            code += `${eventName} {\n`;
            code += this.generateBlockChain(event.nextBlockId, data, "    ");
            code += "}\n\n";
        });

        return code;
    }

    static generateBlockChain(startId, data, indent = "") {
        let chainCode = "";
        let currentId = startId;
        while (currentId) {
            const block = data.blocks.find(b => b.id === currentId);
            if (!block) break;

            chainCode += `${indent}${this.generateActionCode(block, data, indent)}\n`;
            currentId = block.nextBlockId;
        }
        return chainCode;
    }

    static mapEventName(visualName) {
        const map = {
            'Al Empezar': 'alEmpezar()',
            'Al Actualizar': 'alActualizar(delta)',
            'Al Hacer Click': 'alHacerClick()',
            'Al Chocar': 'alEntrarEnColision(otro)'
        };
        return map[visualName] || visualName;
    }

    static formatValue(val) {
        if (typeof val === 'string' && isNaN(val)) return `"${val}"`;
        return val;
    }

    static generateActionCode(action, data, indent = "") {
        const inputs = action.inputs || {};

        switch (action.name) {
            case 'Destruir':
                const target = inputs.target || 'materia';
                return `destruir(${target});`;

            case 'Imprimir':
                return `imprimir("${inputs.message || ''}");`;

            case 'Esperar':
                return `esperar(${inputs.seconds || 1});`;

            case 'Mover':
                const x = inputs.x || 0;
                const y = inputs.y || 0;
                return `posicion.x += ${x}; posicion.y += ${y};`;

            case 'Reproducir Sonido':
                return `fuenteDeAudio.reproducir();`;

            case 'Cargar Escena':
                return `cargarEscena("${inputs.scene || ''}");`;

            case 'Asignar Variable':
                if (inputs.scope === 'global') {
                    return `establecerGlobal("${inputs.name}", ${this.formatValue(inputs.value)});`;
                }
                return `${inputs.name} = ${this.formatValue(inputs.value)};`;

            case 'Establecer Global':
                return `establecerGlobal("${inputs.name}", ${this.formatValue(inputs.value)});`;

            case 'Sumar a Variable':
                return `${inputs.name} += ${this.formatValue(inputs.value)};`;

            case 'Llamar Función':
                return `${inputs.name}();`;

            case 'Si':
                let ifCode = `si (${inputs.var1} ${inputs.op || '=='} ${this.formatValue(inputs.var2)}) {\n`;
                ifCode += this.generateBlockChain(action.branchId, data, indent + "    ");
                ifCode += `${indent}}`;
                return ifCode;

            default:
                return `// Acción desconocida: ${action.name}`;
        }
    }
}
