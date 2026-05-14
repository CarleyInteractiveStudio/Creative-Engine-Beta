// js/editor/ui/VisualScriptingWindow.js

import { VisualScriptingCore } from '../VisualScriptingCore.js';
import * as CodeEditor from '../CodeEditorWindow.js';

let dom;
let blocks = [];
let draggingBlock = null;
let currentMateria = null;

export function initialize(dependencies) {
    dom = dependencies.dom;
    createWindow();

    // Expose for integration
    window.VisualScriptingWindow = {
        loadBlocks: (blocksData, integrated = false) => {
            if (integrated) {
                // Redirect to integrated workspace
                const container = document.getElementById('vs-integrated-blocks-container');
                const connections = document.getElementById('vs-integrated-connections-layer');
                if (!container || !connections) return;

                blocks = blocksData;
                renderAllBlocks(container, connections);
                updateActiveVarsList();
                document.getElementById('vs-integrated-hint').style.display = blocks.length > 0 ? 'none' : 'block';
            } else {
                blocks = blocksData;
                renderAllBlocks(document.getElementById('vs-blocks-container'), document.getElementById('vs-connections-layer'));
                updateActiveVarsList();
            }
        },
        getBlocksData: () => blocks
    };
}

function renderAllBlocks(container, svg) {
    container.innerHTML = '';
    svg.innerHTML = '';
    blocks.forEach(b => renderBlock(b, container, svg));
    updateConnections(svg);
}

function createWindow() {
    if (document.getElementById('visual-scripting-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'visual-scripting-panel';
    panel.className = 'editor-panel floating-panel hidden';
    panel.style.width = '800px';
    panel.style.height = '600px';

    panel.innerHTML = `
        <div class="panel-header">
            <span data-i18n="SCRIPTING_VISUAL">Scripting Visual</span>
            <div class="panel-header-controls">
                <button id="vs-save-btn" class="panel-tool-btn primary-btn">Aplicar Lógica</button>
                <button class="close-panel-btn" data-panel="visual-scripting-panel">&times;</button>
            </div>
        </div>
        <div class="panel-content no-padding vs-layout">
            <div id="vs-toolbox">
                <div class="vs-toolbox-section">
                    <h4>Eventos</h4>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Empezar">🚀 Al Empezar</div>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Actualizar">🔄 Al Actualizar</div>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Hacer Click">🖱️ Al Hacer Click</div>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Chocar">💥 Al Chocar</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4>Acciones</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Mover">🏃 Mover</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Rotar">🔄 Rotar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Escalar">📐 Escalar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Cambiar Color">🎨 Cambiar Color</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Activar">✅ Activar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Desactivar">❌ Desactivar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Crear Objeto">✨ Crear Objeto</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Destruir">🗑️ Destruir</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Reproducir Sonido">🎵 Reprod. Sonido</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Establecer Volumen">🔊 Establ. Volumen</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Imprimir">💬 Imprimir</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Esperar">⏳ Esperar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Cargar Escena">🗺️ Cargar Escena</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Siguiente Escena">🔜 Sig. Escena</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Reiniciar Escena">🔄 Reiniciar Escena</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4>Física</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Aplicar Fuerza">💥 Aplicar Fuerza</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Establecer Velocidad">🚀 Establ. Velocidad</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Raycast">📡 Raycast</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4>Variables</h4>
                    <div class="vs-draggable-item" data-type="variable-decl" data-name="Crear Variable">📦 Crear Variable</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Asignar Variable">📝 Asignar Variable</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Operación Matemática">🧮 Operación Mat.</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Sumar a Variable">➕ Sumar a Var</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Establecer Global">🌎 Establecer Global</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4>Interfaz (UI)</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Cambiar Texto">🔤 Cambiar Texto</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Cambiar Imagen">🖼️ Cambiar Imagen</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4>Sistemas de Juego</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Añadir a Inventario">🎒 Añadir a Inv.</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Quitar de Inventario">🗑️ Quitar de Inv.</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Mostrar Diálogo">💬 Mostrar Diálogo</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Empezar Misión">📜 Empezar Misión</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4>Lógica</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Si">⚖️ Si (Condición)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Repetir">🔁 Repetir (For)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Mientras">♾️ Mientras (While)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Si Tecla">⌨️ Si Tecla</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Número al Azar">🎲 Número al Azar</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4>Funciones</h4>
                    <div class="vs-draggable-item" data-type="function-decl" data-name="Nueva Función">🛠️ Nueva Función</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Llamar Función">📞 Llamar Función</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4>Variables Activas</h4>
                    <div id="vs-active-vars-list" style="font-size: 0.85em; opacity: 0.8; padding: 5px;">
                        Ninguna
                    </div>
                </div>
            </div>
            <div id="vs-workspace">
                <svg id="vs-connections-layer"></svg>
                <div id="vs-blocks-container"></div>
                <div id="vs-workspace-hint">Arrastra eventos aquí para empezar</div>
            </div>
        </div>
    `;

    document.getElementById('editor-main-content').appendChild(panel);
    setupWorkspace();
}

function setupWorkspace() {
    const workspace = document.getElementById('vs-workspace');
    const toolboxItems = document.querySelectorAll('.vs-draggable-item');

    toolboxItems.forEach(item => {
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('block-type', item.dataset.type);
            e.dataTransfer.setData('block-name', item.dataset.name);
        });
    });

    workspace.addEventListener('dragover', (e) => e.preventDefault());
    workspace.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('block-type');
        const name = e.dataTransfer.getData('block-name');

        const rect = workspace.getBoundingClientRect();
        addBlock(type, name, e.clientX - rect.left, e.clientY - rect.top);
    });

    document.getElementById('vs-save-btn').onclick = applyLogic;

    // Setup integrated toolbox if exists
    const integratedToolbox = document.getElementById('vs-integrated-toolbox');
    if (integratedToolbox) {
        const originalToolbox = document.getElementById('vs-toolbox');
        integratedToolbox.innerHTML = originalToolbox.innerHTML;

        const workspace = document.getElementById('vs-integrated-workspace-inner');
        workspace.addEventListener('dragover', (e) => e.preventDefault());
        workspace.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('block-type');
            const name = e.dataTransfer.getData('block-name');
            const rect = workspace.getBoundingClientRect();
            addBlock(type, name, e.clientX - rect.left, e.clientY - rect.top, true);
        });

        // Re-attach dragstart to new toolbox items
        integratedToolbox.querySelectorAll('.vs-draggable-item').forEach(item => {
            item.draggable = true;
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('block-type', item.dataset.type);
                e.dataTransfer.setData('block-name', item.dataset.name);
            });
        });
    }
}

function addBlock(type, name, x, y, integrated = false) {
    const id = 'block-' + Date.now();
    const block = { id, type, name, x, y, inputs: {}, nextBlockId: null, branchId: null };

    // Default inputs for new blocks
    if (name === 'Crear Variable' || name === 'Asignar Variable' || name === 'Sumar a Variable' || name === 'Establecer Global') {
        block.inputs.name = 'miVar';
        block.inputs.value = 0;
        block.inputs.scope = (name === 'Establecer Global') ? 'global' : 'local';
    } else if (name === 'Si' || name === 'Mientras') {
        block.inputs.var1 = 'miVar';
        block.inputs.op = '==';
        block.inputs.var2 = 10;
    } else if (name === 'Repetir') {
        block.inputs.times = 10;
    } else if (name === 'Si Tecla') {
        block.inputs.key = 'Space';
    } else if (name === 'Nueva Función' || name === 'Llamar Función') {
        block.inputs.name = 'miFuncion';
    } else if (name === 'Rotar') {
        block.inputs.angle = 10;
    } else if (name === 'Escalar') {
        block.inputs.x = 1.1;
        block.inputs.y = 1.1;
    } else if (name === 'Cambiar Color') {
        block.inputs.color = '#ff0000';
    } else if (name === 'Crear Objeto') {
        block.inputs.prefab = 'Assets/Player.ceprefab';
        block.inputs.x = 0;
        block.inputs.y = 0;
    } else if (name === 'Reproducir Sonido') {
        block.inputs.sound = 'Assets/fx.wav';
    } else if (name === 'Establecer Volumen') {
        block.inputs.volume = 0.5;
    } else if (name === 'Aplicar Fuerza' || name === 'Establecer Velocidad') {
        block.inputs.x = 0;
        block.inputs.y = -500;
    } else if (name === 'Raycast') {
        block.inputs.dirX = 1;
        block.inputs.dirY = 0;
        block.inputs.dist = 100;
        block.inputs.resultVar = 'hit';
    } else if (name === 'Número al Azar') {
        block.inputs.name = 'miVar';
        block.inputs.min = 1;
        block.inputs.max = 10;
    } else if (name === 'Operación Matemática') {
        block.inputs.name = 'miVar';
        block.inputs.op = '+';
        block.inputs.value = 1;
    } else if (name === 'Cambiar Texto') {
        block.inputs.target = 'TextoPuntaje';
        block.inputs.text = 'Score: 0';
    } else if (name === 'Añadir a Inventario' || name === 'Quitar de Inventario') {
        block.inputs.item = 'Poción';
        block.inputs.count = 1;
    } else if (name === 'Mostrar Diálogo') {
        block.inputs.speaker = 'Carl';
        block.inputs.text = '¡Hola aventurero!';
    } else if (name === 'Empezar Misión') {
        block.inputs.id = 'mision_1';
        block.inputs.title = 'El Rescate';
    }

    blocks.push(block);
    const container = integrated ? document.getElementById('vs-integrated-blocks-container') : document.getElementById('vs-blocks-container');
    const svg = integrated ? document.getElementById('vs-integrated-connections-layer') : document.getElementById('vs-connections-layer');

    renderBlock(block, container, svg);
    const hint = integrated ? document.getElementById('vs-integrated-hint') : document.getElementById('vs-workspace-hint');
    if (hint) hint.style.display = 'none';
}

function renderBlock(block, container, svg) {
    if (!container) container = document.getElementById('vs-blocks-container');
    if (!svg) svg = document.getElementById('vs-connections-layer');

    const el = document.createElement('div');
    el.className = `vs-block ${block.type}-block`;
    el.id = block.id;
    el.style.left = block.x + 'px';
    el.style.top = block.y + 'px';

    let inputsHtml = '';
    if (block.name === 'Imprimir') {
        inputsHtml = `<input type="text" placeholder="Mensaje..." onchange="window.vs_updateInput('${block.id}', 'message', this.value)">`;
    } else if (block.name === 'Esperar') {
        inputsHtml = `<input type="number" value="1" step="0.1" onchange="window.vs_updateInput('${block.id}', 'seconds', this.value)"> seg`;
    } else if (block.name === 'Mover') {
        inputsHtml = `
            X: <input type="number" value="5" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'x', this.value)">
            Y: <input type="number" value="0" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'y', this.value)">
        `;
    } else if (block.name === 'Rotar') {
        inputsHtml = `Ang: <input type="number" value="${block.inputs.angle}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'angle', this.value)">`;
    } else if (block.name === 'Escalar') {
        inputsHtml = `
            X: <input type="number" value="${block.inputs.x}" step="0.1" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'x', this.value)">
            Y: <input type="number" value="${block.inputs.y}" step="0.1" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'y', this.value)">
        `;
    } else if (block.name === 'Cambiar Color') {
        inputsHtml = `<input type="color" value="${block.inputs.color}" onchange="window.vs_updateInput('${block.id}', 'color', this.value)">`;
    } else if (block.name === 'Crear Objeto') {
        inputsHtml = `
            <input type="text" value="${block.inputs.prefab || ''}" placeholder="Ruta..." style="width:70px" onchange="window.vs_updateInput('${block.id}', 'prefab', this.value)">
            X: <input type="number" value="${block.inputs.x}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'x', this.value)">
            Y: <input type="number" value="${block.inputs.y}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'y', this.value)">
        `;
    } else if (block.name === 'Reproducir Sonido') {
        inputsHtml = `<input type="text" value="${block.inputs.sound || ''}" placeholder="Ruta..." onchange="window.vs_updateInput('${block.id}', 'sound', this.value)">`;
    } else if (block.name === 'Cargar Escena') {
        inputsHtml = `<input type="text" value="${block.inputs.scene || ''}" placeholder="nombre o index" onchange="window.vs_updateInput('${block.id}', 'scene', this.value)">`;
    } else if (block.name === 'Establecer Volumen') {
        inputsHtml = `<input type="range" min="0" max="1" step="0.1" value="${block.inputs.volume}" onchange="window.vs_updateInput('${block.id}', 'volume', this.value)">`;
    } else if (block.name === 'Aplicar Fuerza' || block.name === 'Establecer Velocidad') {
        inputsHtml = `
            X: <input type="number" value="${block.inputs.x}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'x', this.value)">
            Y: <input type="number" value="${block.inputs.y}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'y', this.value)">
        `;
    } else if (block.name === 'Número al Azar') {
        inputsHtml = `
            Var: <input type="text" value="${block.inputs.name}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'name', this.value)">
            Min: <input type="number" value="${block.inputs.min}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'min', this.value)">
            Max: <input type="number" value="${block.inputs.max}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'max', this.value)">
        `;
    } else if (block.name === 'Raycast') {
        inputsHtml = `
            Dist: <input type="number" value="${block.inputs.dist}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'dist', this.value)">
            Var: <input type="text" value="${block.inputs.resultVar}" style="width:45px" onchange="window.vs_updateInput('${block.id}', 'resultVar', this.value)">
        `;
    } else if (block.name === 'Operación Matemática') {
        inputsHtml = `
            <input type="text" value="${block.inputs.name}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'name', this.value)">
            <select onchange="window.vs_updateInput('${block.id}', 'op', this.value)">
                <option value="+" ${block.inputs.op === '+' ? 'selected' : ''}>+</option>
                <option value="-" ${block.inputs.op === '-' ? 'selected' : ''}>-</option>
                <option value="*" ${block.inputs.op === '*' ? 'selected' : ''}>*</option>
                <option value="/" ${block.inputs.op === '/' ? 'selected' : ''}>/</option>
                <option value="Seno" ${block.inputs.op === 'Seno' ? 'selected' : ''}>Seno</option>
                <option value="Coseno" ${block.inputs.op === 'Coseno' ? 'selected' : ''}>Coseno</option>
                <option value="Distancia" ${block.inputs.op === 'Distancia' ? 'selected' : ''}>Distancia</option>
            </select>
            <input type="text" value="${block.inputs.value}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'value', this.value)">
        `;
    } else if (block.name === 'Cambiar Texto') {
        inputsHtml = `
            Obj: <input type="text" value="${block.inputs.target}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'target', this.value)">
            Txt: <input type="text" value="${block.inputs.text}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'text', this.value)">
        `;
    } else if (block.name === 'Cambiar Imagen') {
        inputsHtml = `
            Obj: <input type="text" value="${block.inputs.target}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'target', this.value)">
            Img: <input type="text" value="${block.inputs.image}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'image', this.value)">
        `;
    } else if (block.name === 'Añadir a Inventario' || block.name === 'Quitar de Inventario') {
        inputsHtml = `
            Item: <input type="text" value="${block.inputs.item}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'item', this.value)">
            Cant: <input type="number" value="${block.inputs.count}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'count', this.value)">
        `;
    } else if (block.name === 'Mostrar Diálogo') {
        inputsHtml = `
            Nom: <input type="text" value="${block.inputs.speaker}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'speaker', this.value)">
            Txt: <input type="text" value="${block.inputs.text}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'text', this.value)">
        `;
    } else if (block.name === 'Empezar Misión') {
        inputsHtml = `
            ID: <input type="text" value="${block.inputs.id}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'id', this.value)">
            Tít: <input type="text" value="${block.inputs.title}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'title', this.value)">
        `;
    } else if (block.name === 'Crear Variable' || block.name === 'Asignar Variable' || block.name === 'Sumar a Variable' || block.name === 'Establecer Global') {
        const scopeOptions = block.name === 'Crear Variable' ? '' : `
            <select onchange="window.vs_updateInput('${block.id}', 'scope', this.value)">
                <option value="local" ${block.inputs.scope === 'local' ? 'selected' : ''}>Local</option>
                <option value="global" ${block.inputs.scope === 'global' ? 'selected' : ''}>Global</option>
            </select>
        `;
        inputsHtml = `
            ${scopeOptions}
            N: <input type="text" value="${block.inputs.name}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'name', this.value)">
            V: <input type="text" value="${block.inputs.value}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'value', this.value)">
        `;
    } else if (block.name === 'Nueva Función' || block.name === 'Llamar Función') {
        inputsHtml = `Nombre: <input type="text" value="${block.inputs.name}" style="width:80px" onchange="window.vs_updateInput('${block.id}', 'name', this.value)">`;
    } else if (block.name === 'Si' || block.name === 'Mientras') {
        inputsHtml = `
            <input type="text" value="${block.inputs.var1}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'var1', this.value)">
            <select onchange="window.vs_updateInput('${block.id}', 'op', this.value)">
                <option value="==" ${block.inputs.op === '==' ? 'selected' : ''}>==</option>
                <option value=">" ${block.inputs.op === '>' ? 'selected' : ''}>&gt;</option>
                <option value="<" ${block.inputs.op === '<' ? 'selected' : ''}>&lt;</option>
                <option value="!=" ${block.inputs.op === '!=' ? 'selected' : ''}>!=</option>
            </select>
            <input type="text" value="${block.inputs.var2}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'var2', this.value)">
        `;
    } else if (block.name === 'Repetir') {
        inputsHtml = `Veces: <input type="number" value="${block.inputs.times}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'times', this.value)">`;
    } else if (block.name === 'Si Tecla') {
        inputsHtml = `<input type="text" value="${block.inputs.key}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'key', this.value)">`;
    }

    let branchHtml = '';
    if (block.name === 'Si' || block.name === 'Si Tecla' || block.name === 'Mientras' || block.name === 'Repetir') {
        branchHtml = `<div class="vs-block-connector-branch" title="Cuerpo del bucle/condición" onclick="window.vs_startConnection('${block.id}', 'branch')">🌿</div>`;
    }

    el.innerHTML = `
        <div class="vs-block-header">${block.name}</div>
        <div class="vs-block-body">${inputsHtml}</div>
        <div class="vs-block-connector-out" title="Siguiente" onclick="window.vs_startConnection('${block.id}', 'next')"></div>
        ${branchHtml}
        <div class="vs-block-connector-in" title="Anterior" onclick="window.vs_endConnection('${block.id}')"></div>
        <div class="vs-block-delete" onclick="window.vs_deleteBlock('${block.id}')">&times;</div>
    `;

    // Make block draggable within workspace
    el.onmousedown = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.classList.contains('vs-block-connector-out')) return;
        const rect = el.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const move = (moveE) => {
            const workspace = el.closest('#vs-workspace, #vs-integrated-workspace-inner');
            const wsRect = workspace.getBoundingClientRect();
            block.x = moveE.clientX - wsRect.left - offsetX;
            block.y = moveE.clientY - wsRect.top - offsetY;
            el.style.left = block.x + 'px';
            el.style.top = block.y + 'px';
            updateConnections(workspace.querySelector('svg'));
        };

        const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    container.appendChild(el);
}

let connectionSourceId = null;
let connectionType = 'next'; // 'next' or 'branch'

window.vs_updateInput = (blockId, key, value) => {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
        block.inputs[key] = value;
        if (key === 'name' && (block.type === 'variable-decl' || block.type === 'action')) {
            updateActiveVarsList();
        }
    }
};

function updateActiveVarsList() {
    const list = document.getElementById('vs-active-vars-list');
    if (!list) return;

    const vars = blocks.filter(b => b.type === 'variable-decl').map(b => b.inputs.name);
    if (vars.length === 0) {
        list.innerHTML = 'Ninguna';
    } else {
        list.innerHTML = [...new Set(vars)].map(v => `<div class="vs-var-chip">${v}</div>`).join('');
    }
}

window.vs_startConnection = (id, type = 'next') => {
    connectionSourceId = id;
    connectionType = type;
    const block = document.getElementById(id);
    const workspace = block.closest('#vs-workspace, #vs-integrated-workspace-inner');
    workspace.classList.add('connecting');
};

window.vs_endConnection = (id) => {
    if (!connectionSourceId || connectionSourceId === id) return;

    const block = document.getElementById(id);
    const workspace = block.closest('#vs-workspace, #vs-integrated-workspace-inner');

    const source = blocks.find(b => b.id === connectionSourceId);
    if (source) {
        if (connectionType === 'branch') {
            source.branchId = id;
        } else {
            source.nextBlockId = id;
        }
        updateConnections(workspace.querySelector('svg'));
    }

    connectionSourceId = null;
    workspace.classList.remove('connecting');
};

window.vs_deleteBlock = (id) => {
    const el = document.getElementById(id);
    const workspace = el.closest('#vs-workspace, #vs-integrated-workspace-inner');
    const svg = workspace.querySelector('svg');

    blocks = blocks.filter(b => b.id !== id);
    blocks.forEach(b => {
        if (b.nextBlockId === id) b.nextBlockId = null;
        if (b.branchId === id) b.branchId = null;
    });
    if (el) el.remove();
    updateConnections(svg);
    updateActiveVarsList();
};

function updateConnections(svg) {
    if (!svg) svg = document.getElementById('vs-connections-layer');
    svg.innerHTML = '';

    blocks.forEach(block => {
        if (block.nextBlockId) {
            drawConnection(block.x + 180, block.y + 30, block.nextBlockId, '#0e639c', svg);
        }
        if (block.branchId) {
            drawConnection(block.x + 180, block.y + 60, block.branchId, '#4caf50', svg);
        }
    });

    function drawConnection(x1, y1, targetId, color, targetSvg) {
        const target = blocks.find(b => b.id === targetId);
        if (target) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', target.x);
            line.setAttribute('y2', target.y + 30);
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', '3');
            targetSvg.appendChild(line);
        }
    }
}

async function applyLogic() {
    const cesCode = VisualScriptingCore.translateToCES({ blocks });
    console.log("Generated CES from Visual Scripting:\n", cesCode);

    const L = window.Localization;
    window.Dialogs.showNotification(L.get('EXITO', 'Éxito'), "Lógica visual aplicada y traducida a CES.");

    // Optionally open the code view to show what happened
    if (window._CodeEditor) {
        // We could create a special 'visual.ces' file or similar
    }
}
