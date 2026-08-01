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

        if (!data || !data.blocks) return code;

        // 1. Declarar Variables (Locales al script)
        const variables = data.blocks.filter(b => b.type === 'variable-decl');
        variables.forEach(v => {
            const val = v.inputs.value || 0;
            code += `variable ${v.inputs.name || 'v'} = ${this.formatValue(val)};\n`;
        });
        if (variables.length > 0) code += "\n";

        // 2. Definir Funciones Personalizadas
        const functions = data.blocks.filter(b => b.type === 'function-decl' || b.name === 'Nueva Función');
        functions.forEach(func => {
            const funcName = func.inputs.name || 'miFuncion';
            code += `${funcName}() {\n`;
            const nextId = this.getNextBlockId(func, data) || func.nextBlockId;
            code += this.generateBlockChain(nextId, data, "    ");
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
            const nextId = this.getNextBlockId(event, data) || event.nextBlockId;
            code += this.generateBlockChain(nextId, data, "    ");
            code += "}\n\n";
        });

        return code;
    }

    static getNextBlockId(block, data) {
        if (block.nextBlockId) return block.nextBlockId;
        if (data && data.connections) {
            const conn = data.connections.find(c => c.fromId === block.id && (c.fromPort === 'next' || c.fromPort === 'output'));
            if (conn) return conn.toId;
        }
        return null;
    }

    static getBranchBlockId(block, data) {
        if (block.branchId) return block.branchId;
        if (data && data.connections) {
            const conn = data.connections.find(c => c.fromId === block.id && c.fromPort === 'branch');
            if (conn) return conn.toId;
        }
        return null;
    }

    static getElseBlockId(block, data) {
        if (block.elseId) return block.elseId;
        if (data && data.connections) {
            const conn = data.connections.find(c => c.fromId === block.id && c.fromPort === 'else');
            if (conn) return conn.toId;
        }
        return null;
    }

    static resolveBlockInputValue(blockId, portName, data) {
        if (!data) return null;

        const block = data.blocks.find(b => b.id === blockId);
        if (!block) return null;

        // 1. Check if there's a node connection pointing to this block and port
        if (data.connections) {
            const conn = data.connections.find(c => c.toId === blockId && c.toPort === portName);
            if (conn) {
                const sourceBlock = data.blocks.find(b => b.id === conn.fromId);
                if (sourceBlock) {
                    return this.generateBlockValueCode(sourceBlock, data);
                }
            }
        }

        // 2. Check for implicit vertical neighbors if this is a math/operator block and no connections exist
        const bName = block.name;
        if (bName === 'Sumar' || bName === 'Restar' || bName === 'Multiplicar' || bName === 'Dividir' || bName === 'Asignar Variable') {
            const neighbors = this.findVerticalNeighborBlocks(block, data);

            if (bName === 'Asignar Variable' && portName === 'value') {
                // If it's Asignar Variable, find the neighbor block immediately above it
                const above = neighbors.filter(n => n.y < block.y);
                if (above.length > 0) {
                    const topBlock = above[above.length - 1];
                    return this.generateBlockValueCode(topBlock, data);
                }
            } else {
                // For math blocks, find the two neighbors directly above
                const above = neighbors.filter(n => n.y < block.y);
                if (above.length >= 2) {
                    const bBlock = above[above.length - 1];
                    const aBlock = above[above.length - 2];
                    if (portName === 'a') return this.generateBlockValueCode(aBlock, data);
                    if (portName === 'b') return this.generateBlockValueCode(bBlock, data);
                }
            }
        }

        // 3. Fallback to default block inputs
        const inputs = block.inputs || {};
        if (inputs[portName] !== undefined) {
            return this.formatValue(inputs[portName]);
        }

        return null;
    }

    static findVerticalNeighborBlocks(block, data) {
        if (!data || !data.blocks) return [];
        const neighbors = data.blocks.filter(b => b.id !== block.id && Math.abs(b.x - block.x) < 120);
        neighbors.sort((a, b) => a.y - b.y);
        return neighbors;
    }

    static generateBlockChain(startId, data, indent = "") {
        let chainCode = "";
        let currentId = startId;
        while (currentId) {
            const block = data.blocks.find(b => b.id === currentId);
            if (!block) break;

            const actionCode = this.generateActionCode(block, data, indent);
            if (actionCode) {
                chainCode += `${indent}${actionCode}\n`;
            }
            currentId = this.getNextBlockId(block, data) || block.nextBlockId;
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
        if (typeof val === 'string' && isNaN(val) && val !== 'true' && val !== 'false' && !val.startsWith('"') && !val.startsWith('{') && !val.startsWith('(')) {
            return `"${val}"`;
        }
        return val;
    }

    static generateActionCode(action, data, indent = "") {
        const inputs = action.inputs || {};
        const val = (v) => this.formatValue(v);

        switch (action.name) {
            case 'Destruir': return `destruir(materia);`;
            case 'Imprimir': {
                const msg = this.resolveBlockInputValue(action.id, 'message', data) || val(inputs.message);
                return `imprimir(${msg});`;
            }
            case 'Esperar': {
                const secs = this.resolveBlockInputValue(action.id, 'seconds', data) || val(inputs.seconds);
                return `esperar(${secs});`;
            }

            // Movimiento
            case 'Fijar X': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `posicion.x = ${v};`;
            }
            case 'Fijar Y': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `posicion.y = ${v};`;
            }
            case 'Fijar Z': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `posicion.z = ${v};`;
            }
            case 'Fijar Rotación': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `rotacion = ${v};`;
            }
            case 'Mirar Hacia': {
                const tgt = this.resolveBlockInputValue(action.id, 'target', data) || val(inputs.target);
                return `variable _tgt = buscarMateria(${tgt}); si (_tgt) { mirarHacia(_tgt.posicion.x, _tgt.posicion.y); }`;
            }

            // Física
            case 'Fijar Velocidad X': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.velocity.x = ${v}; }`;
            }
            case 'Fijar Velocidad Y': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.velocity.y = ${v}; }`;
            }
            case 'Aplicar Fuerza': {
                const xVal = this.resolveBlockInputValue(action.id, 'x', data) || val(inputs.x);
                const yVal = this.resolveBlockInputValue(action.id, 'y', data) || val(inputs.y);
                return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.applyForce(${xVal}, ${yVal}); }`;
            }
            case 'Aplicar Impulso': {
                const xVal = this.resolveBlockInputValue(action.id, 'x', data) || val(inputs.x);
                const yVal = this.resolveBlockInputValue(action.id, 'y', data) || val(inputs.y);
                return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.applyLinearImpulse(${xVal}, ${yVal}); }`;
            }
            case 'Fijar Gravedad': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.gravityScale = ${v}; }`;
            }
            case 'Fijar Rebote': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `variable _body = obtenerComponente("RigidBody2D"); si (_body) { _body.restitution = ${v}; }`;
            }

            // Apariencia
            case 'Mostrar': return `activo = verdadero;`;
            case 'Ocultar': return `activo = falso;`;
            case 'Fijar Escala X': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `escala.x = ${v};`;
            }
            case 'Fijar Escala Y': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `escala.y = ${v};`;
            }
            case 'Fijar Opacidad': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `variable _rend = obtenerComponente("SpriteRenderer"); si (_rend) { _rend.alpha = ${v}; }`;
            }
            case 'Cambiar Color': {
                const col = this.resolveBlockInputValue(action.id, 'color', data) || val(inputs.color);
                return `variable _rend = obtenerComponente("SpriteRenderer"); si (_rend) { _rend.color = ${col}; }`;
            }
            case 'Voltear': return `variable _rend = obtenerComponente("SpriteRenderer"); si (_rend) { _rend.flip${(inputs.axis || 'x').toUpperCase()} = ${inputs.state || 'true'}; }`;
            case 'Animacion': {
                const name = this.resolveBlockInputValue(action.id, 'name', data) || val(inputs.name);
                return `variable _anim = obtenerComponente("Animator"); si (_anim) { _anim.play(${name}); }`;
            }

            // Sonido
            case 'Audio': {
                const snd = this.resolveBlockInputValue(action.id, 'sound', data) || val(inputs.sound);
                return `variable _snd = obtenerComponente("AudioSource"); si (_snd) { await _snd.setSourcePath(${snd}); _snd.reproducir(); _snd.loop = ${inputs.action === 'loop'}; }`;
            }
            case 'Detener Sonidos': return `variable _snd = obtenerComponente("AudioSource"); si (_snd) { _snd.detener(); }`;
            case 'Establecer Volumen': {
                const vol = this.resolveBlockInputValue(action.id, 'volume', data) || val(inputs.volume);
                return `variable _snd = obtenerComponente("AudioSource"); si (_snd) { _snd.volume = ${vol}; }`;
            }

            // Control
            case 'Repetir': {
                const times = this.resolveBlockInputValue(action.id, 'times', data) || val(inputs.times);
                let forCode = `para (variable i = 0; i < ${times}; i += 1) {\n`;
                const branchId = this.getBranchBlockId(action, data) || action.branchId;
                forCode += this.generateBlockChain(branchId, data, indent + "    ");
                forCode += `${indent}}`;
                return forCode;
            }
            case 'Mientras': {
                const condVal = this.resolveBlockInputValue(action.id, 'condition', data) || `(${val(inputs.var1)} ${inputs.op || '=='} ${val(inputs.var2)})`;
                let whileCode = `mientras (${condVal}) {\n`;
                const branchId = this.getBranchBlockId(action, data) || action.branchId;
                whileCode += this.generateBlockChain(branchId, data, indent + "    ");
                whileCode += `${indent}}`;
                return whileCode;
            }
            case 'Si': {
                const condVal = this.resolveBlockInputValue(action.id, 'condition', data) || `(${val(inputs.var1)} ${inputs.op || '=='} ${val(inputs.var2)})`;
                let ifCode = `si (${condVal}) {\n`;
                const branchId = this.getBranchBlockId(action, data) || action.branchId;
                ifCode += this.generateBlockChain(branchId, data, indent + "    ");
                const elseId = this.getElseBlockId(action, data) || action.elseId;
                if (elseId) {
                    ifCode += `\n${indent}} si no {\n`;
                    ifCode += this.generateBlockChain(elseId, data, indent + "    ");
                }
                ifCode += `${indent}}`;
                return ifCode;
            }
            case 'Esperar Hasta': {
                const condVal = this.resolveBlockInputValue(action.id, 'condition', data) || `(${val(inputs.var1)} ${inputs.op || '=='} ${val(inputs.var2)})`;
                return `mientras (!(${condVal})) { esperar(0.01); }`;
            }
            case 'Detener Todo': return `detenerTodo();`;

            // Mensajería
            case 'Enviar Mensaje': {
                const msg = this.resolveBlockInputValue(action.id, 'message', data) || val(inputs.message);
                return `enviarMensaje(${msg});`;
            }
            case 'Enviar a Objeto': {
                const tgt = this.resolveBlockInputValue(action.id, 'target', data) || val(inputs.target);
                const msg = this.resolveBlockInputValue(action.id, 'message', data) || val(inputs.message);
                return `variable _tgt = buscarMateria(${tgt}); si (_tgt) { _tgt.enviarMensaje(${msg}); }`;
            }

            // Variables
            case 'Asignar Variable': {
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `${inputs.name || 'miVar'} = ${v};`;
            }
            case 'Establecer Global': {
                const name = this.resolveBlockInputValue(action.id, 'name', data) || val(inputs.name);
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `establecerGlobal(${name}, ${v});`;
            }

            // RPG
            case 'Mostrar Diálogo': {
                const speaker = this.resolveBlockInputValue(action.id, 'speaker', data) || val(inputs.speaker);
                const txt = this.resolveBlockInputValue(action.id, 'text', data) || val(inputs.text);
                return `mostrarDialogo(${speaker}, ${txt});`;
            }
            case 'Añadir Misión': {
                const id = this.resolveBlockInputValue(action.id, 'id', data) || val(inputs.id);
                return `misiones.agregar(${id});`;
            }
            case 'Completar Misión': {
                const id = this.resolveBlockInputValue(action.id, 'id', data) || val(inputs.id);
                return `misiones.completar(${id});`;
            }
            case 'Dar Item': {
                const item = this.resolveBlockInputValue(action.id, 'item', data) || val(inputs.item);
                const qty = this.resolveBlockInputValue(action.id, 'qty', data) || val(inputs.qty);
                return `inventario.agregar(${item}, ${qty});`;
            }

            // Listas
            case 'Lista Añadir': {
                const list = this.resolveBlockInputValue(action.id, 'list', data) || val(inputs.list);
                const v = this.resolveBlockInputValue(action.id, 'value', data) || val(inputs.value);
                return `variable _lst = obtenerGlobal(${list}); si (_lst && _lst.push) { _lst.push(${v}); }`;
            }
            case 'Lista Obtener': {
                const list = this.resolveBlockInputValue(action.id, 'list', data) || val(inputs.list);
                const idx = this.resolveBlockInputValue(action.id, 'index', data) || val(inputs.index);
                const res = inputs.result || 'miRes';
                return `${res} = obtenerGlobal(${list})[${idx}];`;
            }
            case 'Lista Longitud': {
                const list = this.resolveBlockInputValue(action.id, 'list', data) || val(inputs.list);
                const res = inputs.result || 'miRes';
                return `${res} = obtenerGlobal(${list}).length;`;
            }
            case 'Lista Borrar': {
                const list = this.resolveBlockInputValue(action.id, 'list', data) || val(inputs.list);
                const idx = this.resolveBlockInputValue(action.id, 'index', data) || val(inputs.index);
                return `obtenerGlobal(${list}).splice(${idx}, 1);`;
            }

            // Escena & Cámara
            case 'Crear Objeto': {
                const prefab = this.resolveBlockInputValue(action.id, 'prefab', data) || val(inputs.prefab);
                const xVal = this.resolveBlockInputValue(action.id, 'x', data) || val(inputs.x);
                const yVal = this.resolveBlockInputValue(action.id, 'y', data) || val(inputs.y);
                return `await crear(${prefab}, ${xVal}, ${yVal});`;
            }
            case 'Cargar Escena': {
                const scene = this.resolveBlockInputValue(action.id, 'scene', data) || val(inputs.scene);
                return `cargarEscena(${scene});`;
            }
            case 'Cámara Pos': {
                const xVal = this.resolveBlockInputValue(action.id, 'x', data) || val(inputs.x);
                const yVal = this.resolveBlockInputValue(action.id, 'y', data) || val(inputs.y);
                return `camara.posicion.x = ${xVal}; camara.posicion.y = ${yVal};`;
            }
            case 'Cámara Zoom': {
                const z = this.resolveBlockInputValue(action.id, 'zoom', data) || val(inputs.zoom);
                return `camara.zoom = ${z};`;
            }

            case 'Llamar Función': {
                const name = inputs.name || 'miFuncion';
                return `${name}();`;
            }

            // Let's treat value-producing blocks placed as actions (usually implicit assignment if followed by c)
            case 'Sumar':
            case 'Restar':
            case 'Multiplicar':
            case 'Dividir': {
                const expr = this.generateBlockValueCode(action, data);
                // See if there is a variable assignment below it in the neighborhood
                const neighbors = this.findVerticalNeighborBlocks(action, data);
                const below = neighbors.filter(n => n.y > action.y);
                if (below.length > 0) {
                    const firstBelow = below[0];
                    if (firstBelow.name === 'Asignar Variable' || firstBelow.type === 'variable-decl') {
                        // The value will be captured implicitly by that block, so we don't need to output code here
                        return `// Cálculo implícito: ${expr}`;
                    }
                }
                return `// Operación: ${expr};`;
            }

            default:
                return `// Acción: ${action.name}`;
        }
    }

    static generateBlockValueCode(block, data) {
        if (!block) return '0';
        const inputs = block.inputs || {};
        const val = (v) => this.formatValue(v);

        switch (block.name) {
            case 'Sumar':
            case 'Restar':
            case 'Multiplicar':
            case 'Dividir': {
                const opMap = { 'Sumar': '+', 'Restar': '-', 'Multiplicar': '*', 'Dividir': '/' };
                const aVal = this.resolveBlockInputValue(block.id, 'a', data) || val(inputs.a !== undefined ? inputs.a : 0);
                const bVal = this.resolveBlockInputValue(block.id, 'b', data) || val(inputs.b !== undefined ? inputs.b : 0);
                return `(${aVal} ${opMap[block.name]} ${bVal})`;
            }
            case 'Comparar':
            case 'Mayor que':
            case 'Menor que':
            case 'Igual que': {
                const opMap = { 'Comparar': inputs.op || '==', 'Mayor que': '>', 'Menor que': '<', 'Igual que': '==' };
                const aVal = this.resolveBlockInputValue(block.id, 'a', data) || val(inputs.var1 !== undefined ? inputs.var1 : (inputs.a !== undefined ? inputs.a : ''));
                const bVal = this.resolveBlockInputValue(block.id, 'b', data) || val(inputs.var2 !== undefined ? inputs.var2 : (inputs.b !== undefined ? inputs.b : ''));
                return `(${aVal} ${opMap[block.name]} ${bVal})`;
            }
            case 'Mayor o igual que': return `(${this.resolveBlockInputValue(block.id, 'a', data) || val(inputs.a || '')} >= ${this.resolveBlockInputValue(block.id, 'b', data) || val(inputs.b || '')})`;
            case 'Menor o igual que': return `(${this.resolveBlockInputValue(block.id, 'a', data) || val(inputs.a || '')} <= ${this.resolveBlockInputValue(block.id, 'b', data) || val(inputs.b || '')})`;
            case 'Diferente de': return `(${this.resolveBlockInputValue(block.id, 'a', data) || val(inputs.a || '')} != ${this.resolveBlockInputValue(block.id, 'b', data) || val(inputs.b || '')})`;

            case 'Y':
            case 'O':
            case 'NO': {
                const opMap = { 'Y': '&&', 'O': '||', 'NO': '!' };
                const aVal = this.resolveBlockInputValue(block.id, 'a', data) || val(inputs.var1 !== undefined ? inputs.var1 : (inputs.a !== undefined ? inputs.a : ''));
                if (block.name === 'NO') return `!(${aVal})`;
                const bVal = this.resolveBlockInputValue(block.id, 'b', data) || val(inputs.var2 !== undefined ? inputs.var2 : (inputs.b !== undefined ? inputs.b : ''));
                return `(${aVal} ${opMap[block.name]} ${bVal})`;
            }

            // Sensors/Inputs
            case 'Estado Tecla':
            case 'Tecla Presionada':
                return `tecla(${val(inputs.key || 'space')})`;
            case 'Boton Raton':
            case 'Ratón Presionado':
                return `raton(${inputs.button || 0})`;
            case 'Posicion Raton':
                return `{ x: ratonX(), y: ratonY() }`;
            case 'Cronometro':
                return `tiempo()`;
            case 'Distancia':
                return `distancia(posicion.x, posicion.y, buscarMateria(${val(inputs.target)}).posicion.x, buscarMateria(${val(inputs.target)}).posicion.y)`;

            // Variables
            case 'Obtener Variable':
                return `${inputs.name || 'miVar'}`;
            case 'Obtener Global':
                return `obtenerGlobal(${val(inputs.name || 'miGlobal')})`;

            default:
                return '0';
        }
    }
}
