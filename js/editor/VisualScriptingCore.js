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

            case 'Rotar':
                return `rotar(${inputs.angle || 0});`;

            case 'Escalar':
                return `escala.x = ${inputs.x || 1}; escala.y = ${inputs.y || 1};`;

            case 'Cambiar Color':
                return `variable _rend = obtenerComponente("SpriteRenderer"); si (_rend) { _rend.color = "${inputs.color || '#ffffff'}"; }`;

            case 'Activar':
                return `activo = verdadero;`;

            case 'Desactivar':
                return `activo = falso;`;

            case 'Crear Objeto':
                return `await crear("${inputs.prefab || ''}", ${inputs.x || 0}, ${inputs.y || 0});`;

            case 'Reproducir Sonido':
                if (inputs.sound) {
                    return `variable _snd = obtenerComponente("AudioSource"); si (_snd) { await _snd.setSourcePath("${inputs.sound}"); _snd.reproducir(); }`;
                }
                return `variable _snd = obtenerComponente("AudioSource"); si (_snd) { _snd.reproducir(); }`;

            case 'Establecer Volumen':
                return `variable _snd = obtenerComponente("AudioSource"); si (_snd) { _snd.volume = ${inputs.volume || 1}; }`;

            case 'Cargar Escena':
                return `cargarEscena("${inputs.scene || ''}");`;

            case 'Siguiente Escena':
                return `cargarSiguienteEscena();`;

            case 'Reiniciar Escena':
                return `reiniciarEscena();`;

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

            case 'Aplicar Fuerza':
                return `si (obtenerComponente("Rigidbody2D")) { obtenerComponente("Rigidbody2D").aplicarFuerza(${inputs.x || 0}, ${inputs.y || 0}); }`;

            case 'Establecer Velocidad':
                return `si (obtenerComponente("Rigidbody2D")) { obtenerComponente("Rigidbody2D").establecerVelocidad(${inputs.x || 0}, ${inputs.y || 0}); }`;

            case 'Número al Azar':
                return `${inputs.name} = azar(${inputs.min || 0}, ${inputs.max || 100});`;

            case 'Operación Matemática':
                if (inputs.op === 'Seno') return `${inputs.name} = seno(${this.formatValue(inputs.value)});`;
                if (inputs.op === 'Coseno') return `${inputs.name} = coseno(${this.formatValue(inputs.value)});`;
                if (inputs.op === 'Distancia') return `${inputs.name} = distancia(posicion.x, posicion.y, ${this.formatValue(inputs.value)}.x, ${this.formatValue(inputs.value)}.y);`;
                return `${inputs.name} ${inputs.op || '+='} ${this.formatValue(inputs.value)};`;

            case 'Raycast':
                return `variable ${inputs.resultVar || 'hit'} = raycast(posicion.x, posicion.y, ${inputs.dirX || 1}, ${inputs.dirY || 0}, ${inputs.dist || 100});`;

            case 'Cambiar Texto':
                return `variable _txtObj = buscarMateria("${inputs.target}"); si (_txtObj) { variable _txtComp = _txtObj.obtenerComponente("UIText"); si (_txtComp) { _txtComp.text = "${inputs.text}"; } }`;

            case 'Cambiar Imagen':
                return `variable _imgObj = buscarMateria("${inputs.target}"); si (_imgObj) { variable _imgComp = _imgObj.obtenerComponente("UIImage"); si (_imgComp) { await _imgComp.setImagePath("${inputs.image}"); } }`;

            case 'Si':
                let ifCode = `si (${inputs.var1} ${inputs.op || '=='} ${this.formatValue(inputs.var2)}) {\n`;
                ifCode += this.generateBlockChain(action.branchId, data, indent + "    ");
                ifCode += `${indent}}`;
                return ifCode;

            case 'Repetir':
                let forCode = `para (variable i = 0; i < ${inputs.times || 10}; i += 1) {\n`;
                forCode += this.generateBlockChain(action.branchId, data, indent + "    ");
                forCode += `${indent}}`;
                return forCode;

            case 'Mientras':
                let whileCode = `mientras (${inputs.var1} ${inputs.op || '=='} ${this.formatValue(inputs.var2)}) {\n`;
                whileCode += this.generateBlockChain(action.branchId, data, indent + "    ");
                whileCode += `${indent}}`;
                return whileCode;

            case 'Si Tecla':
                let ifKey = `si (tecla("${inputs.key || 'Space'}")) {\n`;
                ifKey += this.generateBlockChain(action.branchId, data, indent + "    ");
                ifKey += `${indent}}`;
                return ifKey;

            default:
                return `// Acción desconocida: ${action.name}`;
        }
    }
}
