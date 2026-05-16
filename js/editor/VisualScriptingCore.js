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
            'Al Chocar': 'alEntrarEnColision(otro)',
            'Al Salir Colision': 'alSalirDeColision(otro)',
            'Al Gatillar': 'alEntrarEnGatillo(otro)',
            'Al Salir Gatillar': 'alSalirDeGatillo(otro)'
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
                if (inputs.relative === 'false') {
                    return `posicion.x = ${x}; posicion.y = ${y};`;
                }
                return `posicion.x += ${x}; posicion.y += ${y};`;

            case 'Rotar':
                if (inputs.relative === 'false') {
                    return `rotacion = ${inputs.angle || 0};`;
                }
                return `rotar(${inputs.angle || 0});`;

            case 'Escalar':
                return `escala.x = ${inputs.x || 1}; escala.y = ${inputs.y || 1};`;

            case 'Mirar Hacia':
                return `variable _tgt = buscarMateria("${inputs.target}"); si (_tgt) { mirarHacia(_tgt.posicion.x, _tgt.posicion.y); }`;

            case 'Seguir Objetivo':
                return `variable _tgt = buscarMateria("${inputs.target}"); si (_tgt) { posicion.x = interpolar(posicion.x, _tgt.posicion.x, ${inputs.smooth || 0.1}); posicion.y = interpolar(posicion.y, _tgt.posicion.y, ${inputs.smooth || 0.1}); }`;

            case 'Obtener Propiedad':
                return `${inputs.varName || 'v'} = ${inputs.property || 'posicion.x'};`;

            case 'Cambiar Color':
                return `variable _rend = obtenerComponente("SpriteRenderer"); si (_rend) { _rend.color = "${inputs.color || '#ffffff'}"; }`;

            case 'Opacidad':
                return `variable _rend = obtenerComponente("SpriteRenderer"); si (_rend) { _rend.alpha = ${inputs.alpha || 1}; }`;

            case 'Voltear':
                return `variable _rend = obtenerComponente("SpriteRenderer"); si (_rend) { _rend.flip${(inputs.axis || 'x').toUpperCase()} = ${inputs.state || 'true'}; }`;

            case 'Animacion':
                return `variable _anim = obtenerComponente("Animator"); si (_anim) { _anim.${inputs.action || 'play'}("${inputs.name}"); }`;

            case 'Audio':
                return `variable _snd = obtenerComponente("AudioSource"); si (_snd) { ${inputs.action === 'stop' ? '_snd.detener();' : `await _snd.setSourcePath("${inputs.sound}"); _snd.reproducir(); _snd.loop = ${inputs.action === 'loop'};`} }`;

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

            case 'Limitar (Clamp)':
                return `${inputs.name} = limitar(${inputs.name}, ${inputs.min || 0}, ${inputs.max || 100});`;

            case 'Llamar Función':
                return `${inputs.name}();`;

            case 'Aplicar Fuerza':
                return `si (obtenerComponente("Rigidbody2D")) { obtenerComponente("Rigidbody2D").aplicarFuerza(${inputs.x || 0}, ${inputs.y || 0}); }`;

            case 'Establecer Velocidad':
                return `si (obtenerComponente("Rigidbody2D")) { obtenerComponente("Rigidbody2D").establecerVelocidad(${inputs.x || 0}, ${inputs.y || 0}); }`;

            case 'Torque':
                return `si (obtenerComponente("Rigidbody2D")) { obtenerComponente("Rigidbody2D").aplicarTorque(${inputs.force || 0}); }`;

            case 'Gravedad':
                return `si (obtenerComponente("Rigidbody2D")) { obtenerComponente("Rigidbody2D").gravityScale = ${inputs.scale || 1}; }`;

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

            case 'Añadir a Inventario':
                return `variable _inv = obtenerComponente("Inventario"); si (_inv) { _inv.agregarItem("${inputs.item}", ${inputs.count || 1}); }`;

            case 'Quitar de Inventario':
                return `variable _inv = obtenerComponente("Inventario"); si (_inv) { _inv.quitarItem("${inputs.item}", ${inputs.count || 1}); }`;

            case 'Mostrar Diálogo':
                return `variable _dial = obtenerComponente("SistemaDialogos"); si (_dial) { _dial.iniciarDialogo([{hablante: "${inputs.speaker}", texto: "${inputs.text}"}]); }`;

            case 'Empezar Misión':
                return `variable _quest = obtenerComponente("GestorMisiones"); si (_quest) { _quest.iniciarMision("${inputs.id}", "${inputs.title}", []); }`;

            case 'Si':
                let ifCode = `si (${inputs.var1} ${inputs.op || '=='} ${this.formatValue(inputs.var2)}) {\n`;
                ifCode += this.generateBlockChain(action.branchId, data, indent + "    ");
                ifCode += `${indent}}`;
                return ifCode;

            case 'Logica':
                let logOp = inputs.op === 'Y' ? '&&' : (inputs.op === 'O' ? '||' : '!');
                if (logOp === '!') return `${inputs.result} = !${inputs.var1};`;
                return `${inputs.result} = ${inputs.var1} ${logOp} ${inputs.var2};`;

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

            case 'Esperar Hasta':
                let waitUntil = `mientras (!(${inputs.var1} ${inputs.op || '=='} ${this.formatValue(inputs.var2)})) {\n    esperar(0.1);\n}\n`;
                waitUntil += this.generateBlockChain(action.branchId, data, indent);
                return waitUntil;

            case 'Estado Tecla':
                let keyFn = inputs.state === 'pulsada' ? 'tecla' : (inputs.state === 'bajada' ? 'teclaBajada' : 'teclaSoltada');
                let ifKey = `si (${keyFn}("${inputs.key || 'Space'}")) {\n`;
                ifKey += this.generateBlockChain(action.branchId, data, indent + "    ");
                ifKey += `${indent}}`;
                return ifKey;

            case 'Boton Raton':
                let mouseFn = inputs.state === 'pulsada' ? 'raton' : (inputs.state === 'bajada' ? 'ratonBajado' : 'ratonSoltado');
                let ifMouse = `si (${mouseFn}(${inputs.button || 0})) {\n`;
                ifMouse += this.generateBlockChain(action.branchId, data, indent + "    ");
                ifMouse += `${indent}}`;
                return ifMouse;

            case 'Posicion Raton':
                return `${inputs.varX} = ratonX(); ${inputs.varY} = ratonY();`;

            case 'Buscar Objeto':
                let findFn = inputs.by === 'nombre' ? 'buscarMateria' : 'buscarMateriaPorTag';
                return `variable ${inputs.result} = ${findFn}("${inputs.value}");`;

            case 'Vibrar':
                return `vibrar(${inputs.intensity || 1}, ${inputs.duration || 0.2});`;

            default:
                return `// Acción desconocida: ${action.name}`;
        }
    }
}
