// js/editor/ui/VisualScriptingWindow.js

import { VisualScriptingCore } from '../VisualScriptingCore.js';
import { transpile } from '../CES_Transpiler.js';

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
            <div id="vs-toolbox-container" style="display: flex; flex-direction: column; width: 220px; background: rgba(10,10,12,0.6); border-right: 1px solid rgba(255,255,255,0.1);">
                <div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <input type="text" id="vs-search-blocks" placeholder="🔍 Buscar bloque..." style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 6px 10px; border-radius: 20px; font-size: 0.85em; outline: none;">
                </div>
                <div id="vs-toolbox">
                <div class="vs-toolbox-section">
                    <h4 style="color: #4c97ff;">🔵 Movimiento</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar X">Fijar X a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar Y">Fijar Y a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar Z">Fijar Z a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar Rotación">Fijar Rotación a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Mirar Hacia">👀 Mirar Hacia</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #8a2be2;">⚛️ Física</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar Velocidad X">Velocidad X a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar Velocidad Y">Velocidad Y a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Aplicar Fuerza">Aplicar Fuerza</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Aplicar Impulso">Aplicar Impulso</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar Gravedad">Fijar Gravedad</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar Rebote">Fijar Rebote</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #9966ff;">🟣 Apariencia</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Mostrar">Mostrar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Ocultar">Ocultar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar Escala X">Fijar Escala X a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar Escala Y">Fijar Escala Y a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Fijar Opacidad">Fijar Opacidad a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Cambiar Color">🎨 Cambiar Color</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Voltear">↔️ Voltear (Flip)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Animacion">🎬 Animación</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #cf63cf;">🔊 Sonido</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Audio">Reproducir Audio</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Detener Sonidos">Detener Sonidos</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Establecer Volumen">🔊 Establ. Volumen</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #ffd500;">🟡 Eventos</h4>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Empezar">🚀 Al Empezar</div>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Actualizar">🔄 Al Actualizar</div>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Hacer Click">🖱️ Al Hacer Click</div>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Chocar">💥 Al Colisionar</div>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Salir Colision">🔙 Al Salir Colisión</div>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Gatillar">⚡ Al Entrar Gatillo</div>
                    <div class="vs-draggable-item" data-type="event" data-name="Al Recibir Mensaje">📩 Al Recibir Mensaje</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #ffab19;">🟠 Mensajería</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Enviar Mensaje">📢 Enviar Mensaje</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Enviar a Objeto">📧 Enviar a Objeto</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #ffab19;">🟠 Control</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Esperar">⏳ Esperar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Repetir">🔁 Repetir (Para)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Mientras">♾️ Mientras</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Si">⚖️ Si (Condición)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Esperar Hasta">⏳ Esperar Hasta Que...</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Detener Todo">🛑 Detener Todo</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #4cbfe6;">🐳 Sensores</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Distancia">Distancia a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Estado Tecla">⌨️ Tecla Presionada?</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Eje Entrada">🎮 Eje de Entrada (-1 a 1)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Boton Raton">🖱️ Ratón Presionado?</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Posicion Raton">📍 Posición Ratón</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Cronometro">⏱️ Cronómetro</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Raycast">📡 Raycast</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Obtener Propiedad">🔍 Obtener Propiedad de...</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #00ced1;">📏 Vectores</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Crear Vector">Crear Vector (X, Y)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Vector Sumar">Vector + Vector</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Vector Distancia">Distancia entre Puntos</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Vector Normalizar">Normalizar Vector</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Vector Magnitud">Magnitud (Largo)</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #40bf4a;">🟢 Operadores</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Sumar">➕ Sumar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Restar">➖ Restar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Multiplicar">✖️ Multiplicar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Dividir">➗ Dividir</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Mayor que">👉 Mayor que (&gt;)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Menor que">👈 Menor que (&lt;)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Igual que">🤝 Igual que (==)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Mayor o igual que">👉 Mayor o igual (&gt;=)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Menor o igual que">👈 Menor o igual (&lt;=)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Diferente de">≠ Diferente de (!=)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Y">🧠 Y (&&)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="O">🧠 O (||)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="NO">🧠 NO (!)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Operación Matemática">🧮 Calcular (+ - * /)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Número al Azar">🎲 Número al Azar</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Comparar">Comparar (> < =)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Logica">🧠 Y / O / NO</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Mate Avanzada">📐 Mate (Sen/Cos/Abs...)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Limitar (Clamp)">📏 Limitar (Clamp)</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Unir Texto">🔗 Unir Texto</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Propiedad Sistema">⚙️ Propiedad Sistema (FPS/Delta)</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #ff8c1a;">📦 Variables</h4>
                    <div class="vs-draggable-item" data-type="variable-decl" data-name="Crear Variable">📦 Crear Variable</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Asignar Variable">Fijar variable a</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Establecer Global">🌎 Establecer Global</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #ff6680;">📜 Listas</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Lista Añadir">Añadir a lista</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Lista Obtener">Obtener de lista</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Lista Longitud">Longitud de lista</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Lista Borrar">Borrar de lista</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #ff4500;">🎭 RPG & Diálogos</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Mostrar Diálogo">Mostrar Diálogo</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Añadir Misión">Añadir Misión</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Completar Misión">Completar Misión</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Dar Item">Dar Item a Inventario</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4 style="color: #0e639c;">🗺️ Escena & Cámara</h4>
                    <div class="vs-draggable-item" data-type="action" data-name="Crear Objeto">✨ Crear Objeto</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Destruir">🗑️ Destruir</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Cargar Escena">🗺️ Cargar Escena</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Cámara Pos">📍 Cámara Posición</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Cámara Zoom">🔍 Cámara Zoom</div>
                </div>
                <div class="vs-toolbox-section">
                    <h4>Funciones</h4>
                    <div class="vs-draggable-item" data-type="function-decl" data-name="Nueva Función">🛠️ Nueva Función</div>
                    <div class="vs-draggable-item" data-type="action" data-name="Llamar Función">📞 Llamar Función</div>
                </div>
                <div class="vs-toolbox-section" id="vs-favorites-section" style="display: none;">
                    <h4 style="color: #f1c40f;">⭐ Favoritos</h4>
                    <div id="vs-favorites-list"></div>
                </div>
                <div class="vs-toolbox-section">
                    <h4>Variables Activas</h4>
                    <div id="vs-active-vars-list" style="font-size: 0.85em; opacity: 0.8; padding: 5px;">
                        Ninguna
                    </div>
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
    updateFavoritesList();
}

function setupWorkspace() {
    const workspace = document.getElementById('vs-workspace');
    const toolboxItems = document.querySelectorAll('.vs-draggable-item');

    if (workspace) {
        workspace.addEventListener('dragover', (e) => e.preventDefault());
        workspace.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('block-type');
            const name = e.dataTransfer.getData('block-name');

            const rect = workspace.getBoundingClientRect();
            addBlock(type, name, e.clientX - rect.left, e.clientY - rect.top);
        });
    }

    toolboxItems.forEach(item => {
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('block-type', item.dataset.type);
            e.dataTransfer.setData('block-name', item.dataset.name);
        });
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            window.vs_toggleFavorite(item.dataset.name);
        });
    });

    const saveBtn = document.getElementById('vs-save-btn');
    if (saveBtn) saveBtn.onclick = applyLogic;

    const searchInput = document.getElementById('vs-search-blocks');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.vs-draggable-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                const section = item.closest('.vs-toolbox-section');
                if (text.includes(query)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });

            // Hide sections with no visible items
            document.querySelectorAll('.vs-toolbox-section').forEach(section => {
                if (section.id === 'vs-favorites-section') return;
                const visibleItems = section.querySelectorAll('.vs-draggable-item[style="display: block;"]').length;
                const totalItems = section.querySelectorAll('.vs-draggable-item').length;
                section.style.display = (visibleItems === 0 && query !== '') ? 'none' : 'block';
            });
        });
    }

    // Setup integrated toolbox if exists
    const integratedToolbox = document.getElementById('vs-integrated-toolbox');
    if (integratedToolbox) {
        const originalToolbox = document.getElementById('vs-toolbox');
        if (originalToolbox) integratedToolbox.innerHTML = originalToolbox.innerHTML;

        const intWorkspace = document.getElementById('vs-integrated-workspace-inner');
        if (intWorkspace) {
            intWorkspace.addEventListener('dragover', (e) => e.preventDefault());
            intWorkspace.addEventListener('drop', (e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('block-type');
                const name = e.dataTransfer.getData('block-name');
                const rect = intWorkspace.getBoundingClientRect();
                addBlock(type, name, e.clientX - rect.left, e.clientY - rect.top, true);
            });
        }

        // Re-attach dragstart to new toolbox items
        integratedToolbox.querySelectorAll('.vs-draggable-item').forEach(item => {
            item.draggable = true;
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('block-type', item.dataset.type);
                e.dataTransfer.setData('block-name', item.dataset.name);
            });
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                window.vs_toggleFavorite(item.dataset.name);
            });
        });
    }
}

function addBlock(type, name, x, y, integrated = false) {
    const id = 'block-' + Date.now();
    const block = { id, type, name, x, y, inputs: {}, nextBlockId: null, branchId: null };

    // Default inputs for new blocks
    if (name === 'Crear Variable' || name === 'Asignar Variable' || name === 'Establecer Global') {
        block.inputs.name = 'miVar';
        block.inputs.value = 0;
    } else if (name === 'Fijar X') {
        block.inputs.value = 100;
    } else if (name === 'Fijar Y') {
        block.inputs.value = 100;
    } else if (name === 'Fijar Rotación') {
        block.inputs.value = 90;
    } else if (name === 'Fijar Escala X' || name === 'Fijar Escala Y' || name === 'Fijar Z') {
        block.inputs.value = 1;
    } else if (name === 'Fijar Velocidad X' || name === 'Fijar Velocidad Y' || name === 'Fijar Gravedad' || name === 'Fijar Rebote') {
        block.inputs.value = 0;
    } else if (name === 'Aplicar Fuerza' || name === 'Aplicar Impulso') {
        block.inputs.x = 0;
        block.inputs.y = 10;
    } else if (name === 'Crear Vector') {
        block.inputs.x = 0;
        block.inputs.y = 0;
        block.inputs.result = 'miVec';
    } else if (name === 'Vector Sumar') {
        block.inputs.vec1 = 'vecA';
        block.inputs.vec2 = 'vecB';
        block.inputs.result = 'vecRes';
    } else if (name === 'Vector Distancia') {
        block.inputs.x1 = 0; block.inputs.y1 = 0;
        block.inputs.x2 = 100; block.inputs.y2 = 100;
        block.inputs.result = 'dist';
    } else if (name === 'Vector Normalizar' || name === 'Vector Magnitud') {
        block.inputs.vec = 'miVec';
        block.inputs.result = 'res';
    } else if (name === 'Mostrar Diálogo') {
        block.inputs.speaker = 'Carl';
        block.inputs.text = '¡Hola!';
    } else if (name === 'Añadir Misión' || name === 'Completar Misión') {
        block.inputs.id = 'mision_1';
    } else if (name === 'Dar Item') {
        block.inputs.item = 'Poción';
        block.inputs.qty = 1;
    } else if (name === 'Fijar Opacidad') {
        block.inputs.value = 0.5;
    } else if (['Sumar', 'Restar', 'Multiplicar', 'Dividir', 'Mayor que', 'Menor que', 'Igual que', 'Mayor o igual que', 'Menor o igual que', 'Diferente de', 'Y', 'O', 'NO'].includes(name)) {
        block.inputs.a = 0;
        block.inputs.b = 0;
        if (name === 'Y' || name === 'O' || name === 'NO') {
            block.inputs.a = 'true';
            block.inputs.b = 'true';
        }
    } else if (name === 'Si' || name === 'Mientras' || name === 'Comparar' || name === 'Esperar Hasta') {
        block.inputs.var1 = 'miVar';
        block.inputs.op = '==';
        block.inputs.var2 = 10;
        if (name === 'Comparar') block.inputs.result = 'resultado';
    } else if (name === 'Repetir') {
        block.inputs.times = 10;
    } else if (name === 'Estado Tecla') {
        block.inputs.key = 'Space';
    } else if (name === 'Boton Raton') {
        block.inputs.button = '0';
    } else if (name === 'Posicion Raton') {
        block.inputs.varX = 'mouseX';
        block.inputs.varY = 'mouseY';
    } else if (name === 'Nueva Función' || name === 'Llamar Función') {
        block.inputs.name = 'miFuncion';
    } else if (name === 'Cambiar Color') {
        block.inputs.color = '#ff0000';
    } else if (name === 'Crear Objeto') {
        block.inputs.prefab = 'Assets/Player.ceprefab';
        block.inputs.x = 0;
        block.inputs.y = 0;
    } else if (name === 'Audio') {
        block.inputs.sound = 'Assets/fx.wav';
        block.inputs.action = 'play';
    } else if (name === 'Establecer Volumen') {
        block.inputs.volume = 0.5;
    } else if (name === 'Mirar Hacia') {
        block.inputs.target = 'miObjetivo';
    } else if (name === 'Distancia') {
        block.inputs.target = 'Player';
        block.inputs.result = 'dist';
    } else if (name === 'Voltear') {
        block.inputs.axis = 'x';
        block.inputs.state = 'true';
    } else if (name === 'Animacion') {
        block.inputs.name = 'Caminar';
    } else if (name === 'Limitar (Clamp)') {
        block.inputs.name = 'miVar';
        block.inputs.min = 0;
        block.inputs.max = 100;
    } else if (name === 'Logica') {
        block.inputs.var1 = 'miVar';
        block.inputs.op = 'Y';
        block.inputs.var2 = 'otraVar';
        block.inputs.result = 'resultado';
    } else if (name === 'Mate Avanzada') {
        block.inputs.name = 'miVar';
        block.inputs.op = 'seno';
        block.inputs.value = 45;
    } else if (name === 'Lista Añadir') {
        block.inputs.list = 'miLista';
        block.inputs.value = 'item';
    } else if (name === 'Lista Obtener') {
        block.inputs.list = 'miLista';
        block.inputs.index = 0;
        block.inputs.result = 'item';
    } else if (name === 'Lista Longitud') {
        block.inputs.list = 'miLista';
        block.inputs.result = 'len';
    } else if (name === 'Lista Borrar') {
        block.inputs.list = 'miLista';
        block.inputs.index = 0;
    } else if (name === 'Al Recibir Mensaje' || name === 'Enviar Mensaje') {
        block.inputs.message = 'miMensaje';
    } else if (name === 'Enviar a Objeto') {
        block.inputs.target = 'Player';
        block.inputs.message = 'danio';
    } else if (name === 'Eje Entrada') {
        block.inputs.axis = 'Horizontal';
        block.inputs.result = 'movX';
    } else if (name === 'Obtener Propiedad') {
        block.inputs.target = 'Materia';
        block.inputs.prop = 'posicion.x';
        block.inputs.result = 'val';
    } else if (name === 'Unir Texto') {
        block.inputs.text1 = 'Hola ';
        block.inputs.text2 = 'Mundo';
        block.inputs.result = 'saludo';
    } else if (name === 'Propiedad Sistema') {
        block.inputs.prop = 'fps';
        block.inputs.result = 'miFPS';
    } else if (name === 'Cámara Pos') {
        block.inputs.x = 0;
        block.inputs.y = 0;
    } else if (name === 'Cámara Zoom') {
        block.inputs.zoom = 1;
    } else if (name === 'Cronometro') {
        block.inputs.result = 'tiempo';
    } else if (name === 'Operación Matemática') {
        block.inputs.name = 'miVar';
        block.inputs.op = '+';
        block.inputs.value = 1;
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
    let typeClass = `${block.type}-block`;
    if (block.name === 'Si' || block.name === 'Mientras' || block.name === 'Repetir' || block.name === 'Esperar Hasta') {
        typeClass = 'control-block';
    } else if (['Distancia', 'Estado Tecla', 'Boton Raton', 'Posicion Raton', 'Cronometro', 'Raycast', 'Eje Entrada', 'Obtener Propiedad'].includes(block.name)) {
        typeClass = 'sensor-block';
    } else if (['Operación Matemática', 'Número al Azar', 'Comparar', 'Logica', 'Mate Avanzada', 'Limitar (Clamp)', 'Unir Texto', 'Propiedad Sistema'].includes(block.name)) {
        typeClass = 'operator-block';
    } else if (['Asignar Variable', 'Establecer Global'].includes(block.name)) {
        typeClass = 'variable-block';
    } else if (block.name.startsWith('Lista ')) {
        typeClass = 'list-block';
    } else if (['Fijar Velocidad X', 'Fijar Velocidad Y', 'Aplicar Fuerza', 'Aplicar Impulso', 'Fijar Gravedad', 'Fijar Rebote'].includes(block.name)) {
        typeClass = 'physics-block';
    } else if (block.name.startsWith('Vector ')) {
        typeClass = 'vector-block';
    } else if (['Mostrar Diálogo', 'Añadir Misión', 'Completar Misión', 'Dar Item'].includes(block.name)) {
        typeClass = 'rpg-block';
    }

    el.className = `vs-block ${typeClass}`;
    el.id = block.id;
    el.style.left = block.x + 'px';
    el.style.top = block.y + 'px';

    let inputsHtml = '';
    if (block.name === 'Imprimir') {
        inputsHtml = `<input type="text" placeholder="Mensaje..." onchange="window.vs_updateInput('${block.id}', 'message', this.value)">`;
    } else if (block.name === 'Esperar') {
        inputsHtml = `<input type="number" value="1" step="0.1" onchange="window.vs_updateInput('${block.id}', 'seconds', this.value)"> seg`;
    } else if (['Fijar X', 'Fijar Y', 'Fijar Z', 'Fijar Rotación', 'Fijar Escala X', 'Fijar Escala Y', 'Fijar Opacidad', 'Fijar Velocidad X', 'Fijar Velocidad Y', 'Fijar Gravedad', 'Fijar Rebote'].includes(block.name)) {
        inputsHtml = `<input type="text" value="${block.inputs.value}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'value', this.value)">`;
    } else if (block.name === 'Aplicar Fuerza' || block.name === 'Aplicar Impulso') {
        inputsHtml = `X: <input type="number" value="${block.inputs.x}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'x', this.value)"> Y: <input type="number" value="${block.inputs.y}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'y', this.value)">`;
    } else if (block.name === 'Crear Vector') {
        inputsHtml = `X: <input type="number" value="${block.inputs.x}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'x', this.value)"> Y: <input type="number" value="${block.inputs.y}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'y', this.value)"> -> <input type="text" value="${block.inputs.result}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">`;
    } else if (block.name === 'Vector Sumar') {
        inputsHtml = `<input type="text" value="${block.inputs.vec1}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'vec1', this.value)"> + <input type="text" value="${block.inputs.vec2}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'vec2', this.value)"> -> <input type="text" value="${block.inputs.result}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">`;
    } else if (block.name === 'Vector Distancia') {
        inputsHtml = `P1(${block.inputs.x1},${block.inputs.y1}) P2(${block.inputs.x2},${block.inputs.y2}) -> <input type="text" value="${block.inputs.result}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">`;
    } else if (block.name === 'Vector Normalizar' || block.name === 'Vector Magnitud') {
        inputsHtml = `Vec: <input type="text" value="${block.inputs.vec}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'vec', this.value)"> -> <input type="text" value="${block.inputs.result}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">`;
    } else if (block.name === 'Mostrar Diálogo') {
        inputsHtml = `Quién: <input type="text" value="${block.inputs.speaker}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'speaker', this.value)"> Texto: <input type="text" value="${block.inputs.text}" style="width:80px" onchange="window.vs_updateInput('${block.id}', 'text', this.value)">`;
    } else if (block.name === 'Añadir Misión' || block.name === 'Completar Misión') {
        inputsHtml = `ID: <input type="text" value="${block.inputs.id}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'id', this.value)">`;
    } else if (block.name === 'Dar Item') {
        inputsHtml = `Item: <input type="text" value="${block.inputs.item}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'item', this.value)"> x<input type="number" value="${block.inputs.qty}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'qty', this.value)">`;
    } else if (block.name === 'Al Recibir Mensaje' || block.name === 'Enviar Mensaje') {
        inputsHtml = `Msg: <input type="text" value="${block.inputs.message}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'message', this.value)">`;
    } else if (block.name === 'Enviar a Objeto') {
        inputsHtml = `Obj: <input type="text" value="${block.inputs.target}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'target', this.value)"> Msg: <input type="text" value="${block.inputs.message}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'message', this.value)">`;
    } else if (block.name === 'Eje Entrada') {
        inputsHtml = `Eje: <input type="text" value="${block.inputs.axis}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'axis', this.value)"> -> <input type="text" value="${block.inputs.result}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">`;
    } else if (block.name === 'Obtener Propiedad') {
        inputsHtml = `Obj: <input type="text" value="${block.inputs.target}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'target', this.value)"> P: <input type="text" value="${block.inputs.prop}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'prop', this.value)"> -> <input type="text" value="${block.inputs.result}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">`;
    } else if (block.name === 'Unir Texto') {
        inputsHtml = `T1: <input type="text" value="${block.inputs.text1}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'text1', this.value)"> T2: <input type="text" value="${block.inputs.text2}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'text2', this.value)"> -> <input type="text" value="${block.inputs.result}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">`;
    } else if (block.name === 'Propiedad Sistema') {
        inputsHtml = `P: <select onchange="window.vs_updateInput('${block.id}', 'prop', this.value)">
            <option value="fps" ${block.inputs.prop === 'fps' ? 'selected' : ''}>FPS</option>
            <option value="delta" ${block.inputs.prop === 'delta' ? 'selected' : ''}>Delta Time</option>
        </select> -> <input type="text" value="${block.inputs.result}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">`;
    } else if (block.name === 'Cambiar Color') {
        inputsHtml = `<input type="color" value="${block.inputs.color}" onchange="window.vs_updateInput('${block.id}', 'color', this.value)">`;
    } else if (block.name === 'Crear Objeto') {
        inputsHtml = `
            <input type="text" value="${block.inputs.prefab || ''}" placeholder="Ruta..." style="width:70px" onchange="window.vs_updateInput('${block.id}', 'prefab', this.value)">
            X: <input type="number" value="${block.inputs.x}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'x', this.value)">
            Y: <input type="number" value="${block.inputs.y}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'y', this.value)">
        `;
    } else if (block.name === 'Cargar Escena') {
        inputsHtml = `<input type="text" value="${block.inputs.scene || ''}" placeholder="nombre o index" onchange="window.vs_updateInput('${block.id}', 'scene', this.value)">`;
    } else if (block.name === 'Establecer Volumen') {
        inputsHtml = `<input type="range" min="0" max="1" step="0.1" value="${block.inputs.volume}" onchange="window.vs_updateInput('${block.id}', 'volume', this.value)">`;
    } else if (block.name === 'Número al Azar') {
        inputsHtml = `
            Var: <input type="text" value="${block.inputs.name}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'name', this.value)">
            Min: <input type="number" value="${block.inputs.min}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'min', this.value)">
            Max: <input type="number" value="${block.inputs.max}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'max', this.value)">
        `;
    } else if (block.name === 'Comparar') {
        inputsHtml = `
            <input type="text" value="${block.inputs.var1}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'var1', this.value)">
            <select onchange="window.vs_updateInput('${block.id}', 'op', this.value)">
                <option value="==" ${block.inputs.op === '==' ? 'selected' : ''}>==</option>
                <option value=">" ${block.inputs.op === '>' ? 'selected' : ''}>&gt;</option>
                <option value="<" ${block.inputs.op === '<' ? 'selected' : ''}>&lt;</option>
                <option value="!=" ${block.inputs.op === '!=' ? 'selected' : ''}>!=</option>
            </select>
            <input type="text" value="${block.inputs.var2}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'var2', this.value)">
            -> <input type="text" value="${block.inputs.result}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">
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
    } else if (block.name === 'Crear Variable' || block.name === 'Asignar Variable' || block.name === 'Establecer Global') {
        inputsHtml = `
            N: <input type="text" value="${block.inputs.name}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'name', this.value)">
            V: <input type="text" value="${block.inputs.value}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'value', this.value)">
        `;
    } else if (block.name === 'Nueva Función' || block.name === 'Llamar Función') {
        inputsHtml = `Nombre: <input type="text" value="${block.inputs.name}" style="width:80px" onchange="window.vs_updateInput('${block.id}', 'name', this.value)">`;
    } else if (['Sumar', 'Restar', 'Multiplicar', 'Dividir', 'Mayor que', 'Menor que', 'Igual que', 'Mayor o igual que', 'Menor o igual que', 'Diferente de', 'Y', 'O', 'NO'].includes(block.name)) {
        const signMap = {
            'Sumar': '+', 'Restar': '-', 'Multiplicar': '*', 'Dividir': '/',
            'Mayor que': '>', 'Menor que': '<', 'Igual que': '==',
            'Mayor o igual que': '>=', 'Menor o igual que': '<=', 'Diferente de': '!=',
            'Y': 'Y', 'O': 'O', 'NO': 'NO'
        };
        const sign = signMap[block.name];
        if (block.name === 'NO') {
            inputsHtml = `no <input type="text" value="${block.inputs.a}" style="width:50px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:3px; text-align:center;" onchange="window.vs_updateInput('${block.id}', 'a', this.value)">`;
        } else {
            inputsHtml = `
                <input type="text" value="${block.inputs.a}" style="width:40px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:3px; text-align:center;" onchange="window.vs_updateInput('${block.id}', 'a', this.value)">
                <strong>${sign}</strong>
                <input type="text" value="${block.inputs.b}" style="width:40px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:3px; text-align:center;" onchange="window.vs_updateInput('${block.id}', 'b', this.value)">
            `;
        }
    } else if (block.name === 'Si' || block.name === 'Mientras') {
        inputsHtml = `
            <div class="vs-scratch-diagonal-slot" style="display:inline-flex; align-items:center; background: rgba(0,0,0,0.5); border: 1.5px solid #ffab19; padding: 3px 12px; border-radius: 2px; clip-path: polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%); gap: 5px;">
                <input type="text" value="${block.inputs.var1}" style="width:40px; border:none; background:transparent; color:#fff; text-align:center;" onchange="window.vs_updateInput('${block.id}', 'var1', this.value)">
                <select style="background:transparent; border:none; color:#ffab19; font-weight:bold; cursor:pointer;" onchange="window.vs_updateInput('${block.id}', 'op', this.value)">
                    <option value="==" ${block.inputs.op === '==' ? 'selected' : ''}>==</option>
                    <option value=">" ${block.inputs.op === '>' ? 'selected' : ''}>&gt;</option>
                    <option value="<" ${block.inputs.op === '<' ? 'selected' : ''}>&lt;</option>
                    <option value="!=" ${block.inputs.op === '!=' ? 'selected' : ''}>!=</option>
                </select>
                <input type="text" value="${block.inputs.var2}" style="width:40px; border:none; background:transparent; color:#fff; text-align:center;" onchange="window.vs_updateInput('${block.id}', 'var2', this.value)">
            </div>
        `;
    } else if (block.name === 'Repetir') {
        inputsHtml = `Veces: <input type="number" value="${block.inputs.times}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'times', this.value)">`;
    } else if (block.name === 'Mirar Hacia') {
        inputsHtml = `Obj: <input type="text" value="${block.inputs.target}" style="width:80px" onchange="window.vs_updateInput('${block.id}', 'target', this.value)">`;
    } else if (block.name === 'Distancia') {
        inputsHtml = `
            Obj: <input type="text" value="${block.inputs.target}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'target', this.value)">
            -> <input type="text" value="${block.inputs.result}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">
        `;
    } else if (block.name === 'Voltear') {
        inputsHtml = `
            Eje: <select onchange="window.vs_updateInput('${block.id}', 'axis', this.value)">
                <option value="x" ${block.inputs.axis === 'x' ? 'selected' : ''}>X</option>
                <option value="y" ${block.inputs.axis === 'y' ? 'selected' : ''}>Y</option>
            </select>
            Val: <select onchange="window.vs_updateInput('${block.id}', 'state', this.value)">
                <option value="true" ${block.inputs.state === 'true' ? 'selected' : ''}>Si</option>
                <option value="false" ${block.inputs.state === 'false' ? 'selected' : ''}>No</option>
            </select>
        `;
    } else if (block.name === 'Animacion') {
        inputsHtml = `
            Nom: <input type="text" value="${block.inputs.name}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'name', this.value)">
        `;
    } else if (block.name === 'Audio') {
        inputsHtml = `
            Arc: <input type="text" value="${block.inputs.sound}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'sound', this.value)">
            <select onchange="window.vs_updateInput('${block.id}', 'action', this.value)">
                <option value="play" ${block.inputs.action === 'play' ? 'selected' : ''}>Play</option>
                <option value="loop" ${block.inputs.action === 'loop' ? 'selected' : ''}>Loop</option>
            </select>
        `;
    } else if (block.name === 'Limitar (Clamp)') {
        inputsHtml = `
            V: <input type="text" value="${block.inputs.name}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'name', this.value)">
            [<input type="number" value="${block.inputs.min}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'min', this.value)">
            ,<input type="number" value="${block.inputs.max}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'max', this.value)">]
        `;
    } else if (block.name === 'Mate Avanzada') {
        inputsHtml = `
            <input type="text" value="${block.inputs.name}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'name', this.value)">
            <select onchange="window.vs_updateInput('${block.id}', 'op', this.value)">
                <option value="seno" ${block.inputs.op === 'seno' ? 'selected' : ''}>Seno</option>
                <option value="coseno" ${block.inputs.op === 'coseno' ? 'selected' : ''}>Coseno</option>
                <option value="abs" ${block.inputs.op === 'abs' ? 'selected' : ''}>Absoluto</option>
                <option value="raiz" ${block.inputs.op === 'raiz' ? 'selected' : ''}>Raíz</option>
            </select>
            <input type="text" value="${block.inputs.value}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'value', this.value)">
        `;
    } else if (block.name === 'Logica') {
        inputsHtml = `
            <input type="text" value="${block.inputs.var1}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'var1', this.value)">
            <select onchange="window.vs_updateInput('${block.id}', 'op', this.value)">
                <option value="Y" ${block.inputs.op === 'Y' ? 'selected' : ''}>Y</option>
                <option value="O" ${block.inputs.op === 'O' ? 'selected' : ''}>O</option>
                <option value="NO" ${block.inputs.op === 'NO' ? 'selected' : ''}>NO</option>
            </select>
            <input type="text" value="${block.inputs.var2}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'var2', this.value)">
            -> <input type="text" value="${block.inputs.result}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">
        `;
    } else if (block.name === 'Esperar Hasta') {
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
    } else if (block.name === 'Lista Añadir' || block.name === 'Lista Borrar' || block.name === 'Lista Obtener' || block.name === 'Lista Longitud') {
        let extra = '';
        if (block.name === 'Lista Añadir') extra = `Val: <input type="text" value="${block.inputs.value}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'value', this.value)">`;
        if (block.name === 'Lista Borrar' || block.name === 'Lista Obtener') extra = `Idx: <input type="number" value="${block.inputs.index}" style="width:30px" onchange="window.vs_updateInput('${block.id}', 'index', this.value)">`;
        if (block.name === 'Lista Obtener' || block.name === 'Lista Longitud') extra += ` -> <input type="text" value="${block.inputs.result}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">`;

        inputsHtml = `Lista: <input type="text" value="${block.inputs.list}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'list', this.value)"> ${extra}`;
    } else if (block.name === 'Cámara Pos') {
        inputsHtml = `X: <input type="text" value="${block.inputs.x}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'x', this.value)"> Y: <input type="text" value="${block.inputs.y}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'y', this.value)">`;
    } else if (block.name === 'Cámara Zoom') {
        inputsHtml = `Z: <input type="text" value="${block.inputs.zoom}" style="width:35px" onchange="window.vs_updateInput('${block.id}', 'zoom', this.value)">`;
    } else if (block.name === 'Cronometro') {
        inputsHtml = `-> <input type="text" value="${block.inputs.result}" style="width:50px" onchange="window.vs_updateInput('${block.id}', 'result', this.value)">`;
    } else if (block.name === 'Estado Tecla') {
        inputsHtml = `Tecla: <input type="text" value="${block.inputs.key}" style="width:60px" onchange="window.vs_updateInput('${block.id}', 'key', this.value)">`;
    } else if (block.name === 'Boton Raton') {
        inputsHtml = `
            Botón: <select onchange="window.vs_updateInput('${block.id}', 'button', this.value)">
                <option value="0" ${block.inputs.button === '0' ? 'selected' : ''}>Izq</option>
                <option value="1" ${block.inputs.button === '1' ? 'selected' : ''}>Der</option>
            </select>
        `;
    } else if (block.name === 'Posicion Raton') {
        inputsHtml = `
            X-> <input type="text" value="${block.inputs.varX}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'varX', this.value)">
            Y-> <input type="text" value="${block.inputs.varY}" style="width:40px" onchange="window.vs_updateInput('${block.id}', 'varY', this.value)">
        `;
    }

    let branchHtml = '';
    if (block.name === 'Si' || block.name === 'Mientras' || block.name === 'Repetir' || block.name === 'Esperar Hasta') {
        branchHtml = `<div class="vs-block-connector-branch" title="Cuerpo del bucle/condición" onclick="window.vs_startConnection('${block.id}', 'branch')">🌿</div>`;
        if (block.name === 'Si') {
            branchHtml += `<div class="vs-block-connector-branch else-branch" title="Si no (Else)" onclick="window.vs_startConnection('${block.id}', 'else')">🟠</div>`;
        }
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
    const uniqueVars = [...new Set(vars)];

    if (uniqueVars.length === 0) {
        list.innerHTML = 'Ninguna';
    } else {
        list.innerHTML = uniqueVars.map(v => `
            <div class="vs-var-chip" title="Haz clic para copiar" onclick="window.vs_copyVarName('${v}')">${v}</div>
        `).join('');
    }
}

window.vs_copyVarName = (name) => {
    // Ideally, this could auto-fill the last focused input
    if (window.lastFocusedVsInput) {
        window.lastFocusedVsInput.value = name;
        window.lastFocusedVsInput.dispatchEvent(new Event('change'));
    }
};

// Track last focused input in VS workspace
document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.closest('#vs-workspace, #vs-integrated-workspace-inner')) {
        window.lastFocusedVsInput = e.target;
    }
});

window.vs_toggleFavorite = (blockName) => {
    const favorites = JSON.parse(localStorage.getItem('vs-favorites') || '[]');
    const index = favorites.indexOf(blockName);
    if (index === -1) {
        favorites.push(blockName);
    } else {
        favorites.splice(index, 1);
    }
    localStorage.setItem('vs-favorites', JSON.stringify(favorites));
    updateFavoritesList();
};

function updateFavoritesList() {
    const favorites = JSON.parse(localStorage.getItem('vs-favorites') || '[]');
    const container = document.getElementById('vs-favorites-section');
    const list = document.getElementById('vs-favorites-list');

    if (favorites.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = '';

    favorites.forEach(name => {
        // Find original toolbox item to clone its data
        const original = document.querySelector(`.vs-draggable-item[data-name="${name}"]`);
        if (original) {
            const clone = original.cloneNode(true);
            clone.classList.add('is-favorite');
            clone.innerHTML = '⭐ ' + clone.innerHTML;
            list.appendChild(clone);

            clone.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('block-type', clone.dataset.type);
                e.dataTransfer.setData('block-name', clone.dataset.name);
            });
        }
    });
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
        } else if (connectionType === 'else') {
            source.elseId = id;
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
        if (b.elseId === id) b.elseId = null;
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
        if (block.elseId) {
            drawConnection(block.x + 20, block.y + 105, block.elseId, '#ff5722', svg);
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
    const tempScriptName = currentMateria ? `${currentMateria.name}_VisualScript` : 'VisualScript';

    // Validate generated CES code
    const validation = transpile(cesCode, tempScriptName);
    const L = window.Localization;

    if (validation.errors && validation.errors.length > 0) {
        // Construct a highly detailed error list
        let errorMsg = `<div style="text-align: left; max-height: 250px; overflow-y: auto; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid var(--border-color); margin-top: 10px;">`;
        validation.errors.forEach(err => {
            errorMsg += `<p style="color: #ff4d4d; margin: 4px 0;">🔴 <strong>Línea ${err.line || '?'}:</strong> ${err.message}</p>`;
        });
        errorMsg += `</div>`;

        // Show compile failure rejection dialog using our custom dialog window helper
        window.Dialogs.showCustomDialog(
            L.get('ERROR_GUARDAR', 'No se pudo guardar la lógica'),
            `<div style="text-align: center; color: var(--color-text);">
                <p style="font-weight: bold; margin-bottom: 10px;">${L.get('ERROR_LOGICA_VISUAL', 'La lógica visual tiene errores de traducción o sintaxis.')}</p>
                <p style="font-size: 0.9em; opacity: 0.8; margin-bottom: 15px;">Tus cambios han sido RECHAZADOS para evitar fallos críticos al ejecutar el juego. Por favor, revisa las conexiones o variables del bloque con error.</p>
                ${errorMsg}
            </div>`
        );
        console.error("[VisualScripting] Cambios rechazados por errores de traducción:", validation.errors);
        return;
    }

    window.Dialogs.showNotification(L.get('EXITO', 'Éxito'), "Lógica visual verificada y guardada sin ningún error de sintaxis.");

    // Optionally open the code view to show what happened
    if (window._CodeEditor) {
        // We could create a special 'visual.ces' file or similar
    }
}
