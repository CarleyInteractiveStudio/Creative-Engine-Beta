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

        const events = data.blocks.filter(b => b.type === 'event');

        events.forEach(event => {
            const eventName = this.mapEventName(event.name);
            code += `${eventName} {\n`;

            // Seguir la cadena de acciones conectadas
            let currentActionId = event.nextBlockId;
            while (currentActionId) {
                const action = data.blocks.find(b => b.id === currentActionId);
                if (!action) break;

                code += `    ${this.generateActionCode(action, data)}\n`;
                currentActionId = action.nextBlockId;
            }

            code += "}\n\n";
        });

        return code;
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

    static generateActionCode(action, data) {
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

            default:
                return `// Acción desconocida: ${action.name}`;
        }
    }
}
