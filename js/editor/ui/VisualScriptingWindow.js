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
                    <div class="vs-draggable-item" data-type="action" data-name="Destruir">🗑️ Destruir</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Imprimir">💬 Imprimir</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Esperar">⏳ Esperar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Reproducir Sonido">🎵 Reproducir Sonido</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Cargar Escena">🗺️ Cargar Escena</div>
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
}

function addBlock(type, name, x, y) {
    const id = 'block-' + Date.now();
    const block = { id, type, name, x, y, inputs: {}, nextBlockId: null };
    blocks.push(block);
    renderBlock(block);
    document.getElementById('vs-workspace-hint').style.display = 'none';
}

function renderBlock(block) {
    const container = document.getElementById('vs-blocks-container');
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
    } else if (block.name === 'Cargar Escena') {
        inputsHtml = `<input type="text" placeholder="nombre.ceScene" onchange="window.vs_updateInput('${block.id}', 'scene', this.value)">`;
    }

    el.innerHTML = `
        <div class="vs-block-header">${block.name}</div>
        <div class="vs-block-body">${inputsHtml}</div>
        <div class="vs-block-connector-out" onclick="window.vs_startConnection('${block.id}')"></div>
        <div class="vs-block-connector-in" onclick="window.vs_endConnection('${block.id}')"></div>
        <div class="vs-block-delete" onclick="window.vs_deleteBlock('${block.id}')">&times;</div>
    `;

    // Make block draggable within workspace
    el.onmousedown = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.classList.contains('vs-block-connector-out')) return;
        const rect = el.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const move = (moveE) => {
            const wsRect = document.getElementById('vs-workspace').getBoundingClientRect();
            block.x = moveE.clientX - wsRect.left - offsetX;
            block.y = moveE.clientY - wsRect.top - offsetY;
            el.style.left = block.x + 'px';
            el.style.top = block.y + 'px';
            updateConnections();
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

window.vs_updateInput = (blockId, key, value) => {
    const block = blocks.find(b => b.id === blockId);
    if (block) block.inputs[key] = value;
};

window.vs_startConnection = (id) => {
    connectionSourceId = id;
    document.getElementById('vs-workspace').classList.add('connecting');
};

window.vs_endConnection = (id) => {
    if (!connectionSourceId || connectionSourceId === id) return;

    const source = blocks.find(b => b.id === connectionSourceId);
    if (source) {
        source.nextBlockId = id;
        updateConnections();
    }

    connectionSourceId = null;
    document.getElementById('vs-workspace').classList.remove('connecting');
};

window.vs_deleteBlock = (id) => {
    blocks = blocks.filter(b => b.id !== id);
    blocks.forEach(b => { if (b.nextBlockId === id) b.nextBlockId = null; });
    const el = document.getElementById(id);
    if (el) el.remove();
    updateConnections();
};

function updateConnections() {
    const svg = document.getElementById('vs-connections-layer');
    svg.innerHTML = '';

    blocks.forEach(block => {
        if (block.nextBlockId) {
            const target = blocks.find(b => b.id === block.nextBlockId);
            if (target) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                // Estimating connector positions
                line.setAttribute('x1', block.x + 180);
                line.setAttribute('y1', block.y + 30);
                line.setAttribute('x2', target.x);
                line.setAttribute('y2', target.y + 30);
                line.setAttribute('stroke', '#0e639c');
                line.setAttribute('stroke-width', '3');
                svg.appendChild(line);
            }
        }
    });
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
