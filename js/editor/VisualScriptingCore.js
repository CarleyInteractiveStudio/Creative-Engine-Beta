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
            let eventName = this.mapEventName(event.name);
            if (event.name === 'Al Recibir Mensaje') {
                eventName = `alRecibirMensaje("${event.inputs.message || 'miMensaje'}")`;
            }
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
        const val = (v) => this.formatValue(v);

        switch (action.name) {
            case 'Destruir': return `destruir(materia);`;
            case 'Imprimir': return `imprimir(${val(inputs.message)});`;
            case 'Esperar': return `esperar(${val(inputs.seconds)});`;

            // Movimiento
            case 'Fijar X': return `posicion.x = ${val(inputs.value)};`;
            case 'Fijar Y': return `posicion.y = ${val(inputs.value)};`;
            case 'Fijar Z': return `posicion.z = ${val(inputs.value)};`;
            case 'Fijar Rotación': return `rotacion = ${val(inputs.value)};`;
            case 'Mirar Hacia': return `variable _tgt = buscarMateria(${val(inputs.target)}); si (_tgt) { mirarHacia(_tgt.posicion.x, _tgt.posicion.y); }`;

            // Física
            case 'Fijar Velocidad X': return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.velocity.x = ${val(inputs.value)}; }`;
            case 'Fijar Velocidad Y': return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.velocity.y = ${val(inputs.value)}; }`;
            case 'Aplicar Fuerza': return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.applyForce(${val(inputs.x)}, ${val(inputs.y)}); }`;
            case 'Aplicar Impulso': return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.applyLinearImpulse(${val(inputs.x)}, ${val(inputs.y)}); }`;
            case 'Fijar Gravedad': return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.gravityScale = ${val(inputs.value)}; }`;
            case 'Fijar Rebote': return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.restitution = ${val(inputs.value)}; }`;

            // Apariencia
            case 'Mostrar': return `activo = verdadero;`;
            case 'Ocultar': return `activo = falso;`;
            case 'Fijar Escala X': return `escala.x = ${val(inputs.value)};`;
            case 'Fijar Escala Y': return `escala.y = ${val(inputs.value)};`;
            case 'Fijar Opacidad': return `variable _rend = obtenerComponente("SpriteRenderer"); si (_rend) { _rend.alpha = ${val(inputs.value)}; }`;
            case 'Cambiar Color': return `variable _rend = obtenerComponente("SpriteRenderer"); si (_rend) { _rend.color = ${val(inputs.color)}; }`;
            case 'Voltear': return `variable _rend = obtenerComponente("SpriteRenderer"); si (_rend) { _rend.flip${(inputs.axis || 'x').toUpperCase()} = ${inputs.state || 'true'}; }`;
            case 'Animacion': return `variable _anim = obtenerComponente("Animator"); si (_anim) { _anim.play(${val(inputs.name)}); }`;

            // Sonido
            case 'Audio': return `variable _snd = obtenerComponente("AudioSource"); si (_snd) { await _snd.setSourcePath(${val(inputs.sound)}); _snd.reproducir(); _snd.loop = ${inputs.action === 'loop'}; }`;
            case 'Detener Sonidos': return `variable _snd = obtenerComponente("AudioSource"); si (_snd) { _snd.detener(); }`;
            case 'Establecer Volumen': return `variable _snd = obtenerComponente("AudioSource"); si (_snd) { _snd.volume = ${val(inputs.volume)}; }`;

            // Control
            case 'Repetir':
                let forCode = `para (variable i = 0; i < ${val(inputs.times)}; i += 1) {\n`;
                forCode += this.generateBlockChain(action.branchId, data, indent + "    ");
                forCode += `${indent}}`;
                return forCode;
            case 'Mientras':
                let whileCode = `mientras (${val(inputs.var1)} ${inputs.op || '=='} ${val(inputs.var2)}) {\n`;
                whileCode += this.generateBlockChain(action.branchId, data, indent + "    ");
                whileCode += `${indent}}`;
                return whileCode;
            case 'Si':
                let ifCode = `si (${val(inputs.var1)} ${inputs.op || '=='} ${val(inputs.var2)}) {\n`;
                ifCode += this.generateBlockChain(action.branchId, data, indent + "    ");
                if (action.elseId) {
                    ifCode += `\n${indent}} si no {\n`;
                    ifCode += this.generateBlockChain(action.elseId, data, indent + "    ");
                }
                ifCode += `${indent}}`;
                return ifCode;
            case 'Esperar Hasta':
                return `mientras (!(${val(inputs.var1)} ${inputs.op || '=='} ${val(inputs.var2)})) { esperar(0.01); }`;
            case 'Detener Todo': return `detenerTodo();`;

            // Mensajería
            case 'Enviar Mensaje': return `enviarMensaje(${val(inputs.message)});`;
            case 'Enviar a Objeto': return `variable _tgt = buscarMateria(${val(inputs.target)}); si (_tgt) { _tgt.enviarMensaje(${val(inputs.message)}); }`;

            // Sensores
            case 'Distancia': return `${inputs.result} = distancia(posicion.x, posicion.y, buscarMateria(${val(inputs.target)}).posicion.x, buscarMateria(${val(inputs.target)}).posicion.y);`;
            case 'Estado Tecla': return `variable ${inputs.result || 'presionada'} = tecla(${val(inputs.key)});`;
            case 'Eje Entrada': return `${inputs.result} = obtenerEje(${val(inputs.axis)});`;
            case 'Boton Raton': return `variable ${inputs.result || 'click'} = raton(${inputs.button});`;
            case 'Posicion Raton': return `${inputs.varX} = ratonX(); ${inputs.varY} = ratonY();`;
            case 'Cronometro': return `${inputs.result} = tiempo();`;
            case 'Raycast': return `variable ${inputs.resultVar || 'hit'} = raycast(posicion.x, posicion.y, ${inputs.dirX || 1}, ${inputs.dirY || 0}, ${val(inputs.dist)});`;
            case 'Obtener Propiedad': return `${inputs.result} = buscarMateria(${val(inputs.target)}).${inputs.prop};`;

            // Vectores
            case 'Crear Vector': return `${inputs.result} = { x: ${val(inputs.x)}, y: ${val(inputs.y)} };`;
            case 'Vector Sumar': return `${inputs.result} = { x: ${val(inputs.vec1)}.x + ${val(inputs.vec2)}.x, y: ${val(inputs.vec1)}.y + ${val(inputs.vec2)}.y };`;
            case 'Vector Distancia': return `${inputs.result} = distancia(${val(inputs.x1)}, ${val(inputs.y1)}, ${val(inputs.x2)}, ${val(inputs.y2)});`;
            case 'Vector Normalizar': return `${inputs.result} = normalizar(${val(inputs.vec)});`;
            case 'Vector Magnitud': return `${inputs.result} = magnitud(${val(inputs.vec)});`;

            // Operadores
            case 'Operación Matemática': return `${inputs.name} = ${val(inputs.name)} ${inputs.op || '+'} ${val(inputs.value)};`;
            case 'Número al Azar': return `${inputs.name} = azar(${val(inputs.min)}, ${val(inputs.max)});`;
            case 'Comparar': return `${inputs.result} = (${val(inputs.var1)} ${inputs.op} ${val(inputs.var2)});`;
            case 'Logica':
                let logOp = inputs.op === 'Y' ? '&&' : (inputs.op === 'O' ? '||' : '!');
                if (logOp === '!') return `${inputs.result} = !${val(inputs.var1)};`;
                return `${inputs.result} = (${val(inputs.var1)} ${logOp} ${val(inputs.var2)});`;
            case 'Mate Avanzada':
                let mOp = inputs.op === 'seno' ? 'seno' : (inputs.op === 'coseno' ? 'coseno' : (inputs.op === 'abs' ? 'abs' : 'raiz'));
                return `${inputs.name} = ${mOp}(${val(inputs.value)});`;
            case 'Limitar (Clamp)': return `${inputs.name} = limitar(${val(inputs.name)}, ${val(inputs.min)}, ${val(inputs.max)});`;
            case 'Unir Texto': return `${inputs.result} = ${val(inputs.text1)} + ${val(inputs.text2)};`;
            case 'Propiedad Sistema': return `${inputs.result} = motor.${inputs.prop};`;

            // Variables
            case 'Asignar Variable':
                return `${inputs.name} = ${val(inputs.value)};`;
            case 'Establecer Global':
                return `establecerGlobal(${val(inputs.name)}, ${val(inputs.value)});`;

            // RPG
            case 'Mostrar Diálogo': return `mostrarDialogo(${val(inputs.speaker)}, ${val(inputs.text)});`;
            case 'Añadir Misión': return `misiones.agregar(${val(inputs.id)});`;
            case 'Completar Misión': return `misiones.completar(${val(inputs.id)});`;
            case 'Dar Item': return `inventario.agregar(${val(inputs.item)}, ${val(inputs.qty)});`;

            // Listas
            case 'Lista Añadir': return `variable _lst = obtenerGlobal(${val(inputs.list)}); si (_lst && _lst.push) { _lst.push(${val(inputs.value)}); }`;
            case 'Lista Obtener': return `${inputs.result} = obtenerGlobal(${val(inputs.list)})[${val(inputs.index)}];`;
            case 'Lista Longitud': return `${inputs.result} = obtenerGlobal(${val(inputs.list)}).length;`;
            case 'Lista Borrar': return `obtenerGlobal(${val(inputs.list)}).splice(${val(inputs.index)}, 1);`;

            // Escena & Cámara
            case 'Crear Objeto': return `await crear(${val(inputs.prefab)}, ${val(inputs.x)}, ${val(inputs.y)});`;
            case 'Cargar Escena': return `cargarEscena(${val(inputs.scene)});`;
            case 'Cámara Pos': return `camara.posicion.x = ${val(inputs.x)}; camara.posicion.y = ${val(inputs.y)};`;
            case 'Cámara Zoom': return `camara.zoom = ${val(inputs.zoom)};`;

            case 'Llamar Función': return `${inputs.name}();`;

            default:
                return `// Acción desconocida: ${action.name}`;
        }
    }
}
