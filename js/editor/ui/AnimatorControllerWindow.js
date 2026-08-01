// js/editor/ui/AnimatorControllerWindow.js
import { clearAssetCache, getFileHandleForPath } from '../../engine/AssetUtils.js';

/**
 * AnimatorControllerWindow.js
 *
 * This module manages the Animator Controller window, including its state,
 * UI interactions (like graph rendering, node dragging), and file operations
 * for .ceanim assets.
 */

// Module-level state
let dom = {};
let projectsDirHandle = null;
let updateWindowMenuUI = () => {}; // Placeholder for the callback

let currentControllerHandle = null;
let currentControllerData = null;
let graphView = null;
let nodesContainer = null;
let connectionsLayer = null;
let graphContent = null;

let isDraggingNode = false;
let dragNodeInfo = {};
let isConnecting = false;
let connectionSource = null;

let isPanning = false;
let lastPanPos = { x: 0, y: 0 };
let viewOffset = { x: 0, y: 0 };

let selectedState = null;
let selectedTransition = null;

// This function is exported and called from other modules (like the asset browser)
// to open a controller asset in this window.
export async function openAnimatorController(fileHandle) {
    try {
        // Ensure panel is visible
        if (dom.animatorControllerPanel.classList.contains('hidden')) {
            dom.animatorControllerPanel.classList.remove('hidden');
            updateWindowMenuUI();
        }

        let file = await fileHandle.getFile();
        let content = await file.text();

        // Safety check for empty files (just created)
        if (!content || content.trim() === "") {
            console.warn(`[AnimatorController] Archivo vacío detectado para '${fileHandle.name}', esperando 100ms...`);
            await new Promise(r => setTimeout(r, 100));
            file = await fileHandle.getFile();
            content = await file.text();
            if (!content || content.trim() === "") {
                throw new Error("El archivo está vacío.");
            }
        }

        currentControllerData = JSON.parse(content);
        currentControllerHandle = fileHandle;

        // Update UI
        const nameLabel = document.getElementById('current-anim-ctrl-name');
        if (nameLabel) nameLabel.textContent = fileHandle.name;

        const overlay = document.getElementById('animator-controller-overlay');
        if (overlay) overlay.classList.add('hidden');

        console.log(`Cargado controlador: ${fileHandle.name}`, currentControllerData);

        // Ensure default mapping exists
        if (!currentControllerData.movementMapping) {
            const L = window.Localization;
            currentControllerData.movementMapping = {
                "4": L.get('PARADO', "Parado"),
                "1": L.get('ARRIBA', "Arriba"),
                "7": L.get('ABAJO', "Abajo"),
                "3": L.get('IZQUIERDA', "Izquierda"),
                "5": L.get('DERECHA', "Derecha")
            };
        }

        await populateAnimationsList();
        renderAnimatorGraph();
    } catch (error) {
        console.error(`Error al cargar el controlador '${fileHandle.name}':`, error);
        const L = window.Localization;
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CARGAR_CTRL', 'No se pudo cargar el controlador.'));
    }
}


function renderAnimatorGraph() {
    if (!currentControllerData || !graphView) return;

    // Show/hide overlay
    const overlay = document.getElementById('animator-controller-overlay');
    if (overlay) overlay.classList.add('hidden');

    nodesContainer.innerHTML = '';
    connectionsLayer.innerHTML = '';

    currentControllerData.states.forEach(state => {
        const node = document.createElement('div');
        node.className = 'anim-state-node';
        node.textContent = state.name;
        node.style.left = `${state.position.x}px`;
        node.style.top = `${state.position.y}px`;
        node.dataset.name = state.name;

        if (state.name === currentControllerData.entryState) {
            node.classList.add('entry-state');
        }

        // State interactions
        node.style.touchAction = 'none';
        node.addEventListener('pointerdown', (e) => {
            if (e.button === 0 && !isConnecting) {
                selectState(state);
                isDraggingNode = true;
                node.setPointerCapture(e.pointerId);
                dragNodeInfo = {
                    node: node,
                    state: state,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: state.position.x,
                    origY: state.position.y,
                    pointerId: e.pointerId
                };
                e.stopPropagation();
            }
        });

        node.addEventListener('click', (e) => {
            if (isConnecting && connectionSource) {
                addTransition(connectionSource.name, state.name);
                stopConnecting();
                e.stopPropagation();
            }
        });

        node.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showNodeContextMenu(e, state);
        });

        nodesContainer.appendChild(node);
    });

    renderTransitions();
    populateStatesList();
}

function renderTransitions() {
    connectionsLayer.innerHTML = '';
    if (!currentControllerData.transitions) return;

    currentControllerData.transitions.forEach(trans => {
        const fromState = currentControllerData.states.find(s => s.name === trans.from);
        const toState = currentControllerData.states.find(s => s.name === trans.to);
        if (fromState && toState) {
            drawArrow(fromState.position, toState.position, trans);
        }
    });
}

function drawArrow(fromPos, toPos, trans) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'anim-transition-group');
    if (selectedTransition === trans) g.classList.add('selected');

    // Thick invisible line for better hit detection
    const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const ox = 50, oy = 20;
    hitLine.setAttribute('x1', fromPos.x + ox);
    hitLine.setAttribute('y1', fromPos.y + oy);
    hitLine.setAttribute('x2', toPos.x + ox);
    hitLine.setAttribute('y2', toPos.y + oy);
    hitLine.setAttribute('stroke', 'transparent');
    hitLine.setAttribute('stroke-width', '15');
    hitLine.style.cursor = 'pointer';

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromPos.x + ox);
    line.setAttribute('y1', fromPos.y + oy);
    line.setAttribute('x2', toPos.x + ox);
    line.setAttribute('y2', toPos.y + oy);
    line.setAttribute('class', 'anim-transition-line');
    line.setAttribute('marker-end', 'url(#arrowhead)');

    g.appendChild(hitLine);
    g.appendChild(line);

    g.addEventListener('click', (e) => {
        e.stopPropagation();
        selectTransition(trans);
    });

    connectionsLayer.appendChild(g);
}

function addTransition(from, to) {
    if (!currentControllerData.transitions) currentControllerData.transitions = [];
    // Avoid duplicates
    if (currentControllerData.transitions.some(t => t.from === from && t.to === to)) return;

    currentControllerData.transitions.push({
        from: from,
        to: to,
        hasExitTime: true,
        duration: 0.3, // Default crossfade duration
        conditions: []
    });
    renderAnimatorGraph();
}

function showNodeContextMenu(e, state) {
    const menu = document.getElementById('anim-node-context-menu');
    if (!menu) return;

    menu.classList.add('visible');
    menu.style.display = 'block';
    menu.style.position = 'fixed';
    menu.style.zIndex = '999999';
    menu.style.maxHeight = '';
    menu.style.overflowY = '';

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = e.clientX;
    let top = e.clientY;

    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth - 5;
    if (top + menuHeight > windowHeight) top = windowHeight - menuHeight - 5;

    if (top < 5 || menuHeight > windowHeight - 10) {
        if (top < 5) top = 5;
        menu.style.maxHeight = `${windowHeight - (top + 10)}px`;
        menu.style.overflowY = 'auto';
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    // Clear and add items
    menu.innerHTML = '';
    const ul = document.createElement('ul');
    menu.appendChild(ul);

    const L = window.Localization;
    const addItem = (label, action) => {
        const li = document.createElement('li');
        li.textContent = label;
        li.onclick = () => { action(); menu.style.display = 'none'; menu.classList.remove('visible'); };
        ul.appendChild(li);
    };

    addItem(L.get('CONTEXT_SET_PRINCIPAL', 'Establecer como Principal'), () => {
        currentControllerData.entryState = state.name;
        renderAnimatorGraph();
    });

    addItem(L.get('CONTEXT_CONECTAR', 'Conectar'), () => {
        startConnecting(state);
    });

    addItem(L.get('CONTEXT_ELIMINAR_ESTADO', 'Eliminar Estado'), () => {
        deleteState(state.name);
    });
}

function startConnecting(state) {
    isConnecting = true;
    connectionSource = state;
    graphView.classList.add('is-connecting');
}

function stopConnecting() {
    isConnecting = false;
    connectionSource = null;
    graphView.classList.remove('is-connecting');
}

function deleteState(stateName) {
    currentControllerData.states = currentControllerData.states.filter(s => s.name !== stateName);
    if (currentControllerData.transitions) {
        currentControllerData.transitions = currentControllerData.transitions.filter(t => t.from !== stateName && t.to !== stateName);
    }
    if (currentControllerData.entryState === stateName) {
        currentControllerData.entryState = currentControllerData.states.length > 0 ? currentControllerData.states[0].name : "";
    }
    if (selectedState && selectedState.name === stateName) selectedState = null;
    renderAnimatorGraph();
}

function selectTransition(trans) {
    selectedTransition = trans;
    selectedState = null;
    renderTransitions(); // Update selection highlight
    nodesContainer.querySelectorAll('.anim-state-node').forEach(n => n.classList.remove('selected'));
    updateStateInspector();
}

async function populateAnimationsList() {
    const list = dom.animatorControllerPanel.querySelector('#animator-assets-list .list-content');
    if (!list) return;
    list.innerHTML = '';

    const animFiles = [];
    async function findAnims(dirHandle, path = '') {
        for await (const entry of dirHandle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file' && (entry.name.endsWith('.cea') || entry.name.endsWith('.ceanimclip'))) {
                animFiles.push({ name: entry.name, path: entryPath });
            } else if (entry.kind === 'directory') {
                await findAnims(entry, entryPath);
            }
        }
    }

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
        const projectHandle = await currentDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
        await findAnims(assetsHandle, 'Assets');
    } catch (e) {
        console.error("Error populating animations list:", e);
    }

    animFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'asset-list-item';
        item.textContent = file.name;
        item.draggable = true;
        item.dataset.path = file.path;

        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'animation',
                path: file.path
            }));
            e.dataTransfer.effectAllowed = 'copy';
        });

        list.appendChild(item);
    });
}

function populateStatesList() {
    const list = dom.animatorControllerPanel.querySelector('#animator-states-list .list-content');
    list.innerHTML = '';

    if (!currentControllerData) return;
    const L = window.Localization;

    currentControllerData.states.forEach(state => {
        const item = document.createElement('div');
        item.className = 'state-list-item';
        item.innerHTML = `
            <span class="state-name">${state.name}</span>
            <span class="state-anim">${state.animationClip ? state.animationClip.split('/').pop() : L.get('NINGUNA', 'Ninguna')}</span>
        `;
        item.onclick = () => selectState(state);
        list.appendChild(item);
    });
}

function selectState(state) {
    selectedState = state;
    selectedTransition = null;
    renderTransitions(); // Clear transition selection

    // Highlight in graph and list
    nodesContainer.querySelectorAll('.anim-state-node').forEach(n => n.classList.remove('selected'));
    const node = nodesContainer.querySelector(`[data-name="${state.name}"]`);
    if (node) node.classList.add('selected');

    const stateItems = dom.animatorControllerPanel.querySelectorAll('.state-list-item');
    stateItems.forEach(item => {
        item.classList.toggle('selected', item.querySelector('.state-name').textContent === state.name);
    });

    updateStateInspector();
}

function updateStateInspector() {
    const container = dom.animatorControllerPanel.querySelector('#animator-state-inspector .list-content');
    if (!container) return;
    const L = window.Localization;

    const globalSettingsHTML = `
        <div class="inspector-section">
            <div class="inspector-section-header">
                <span data-i18n="CONFIG_GLOBAL">${L.get('CONFIG_GLOBAL', 'Configuración Global')}</span>
            </div>
            <div class="checkbox-field" title="Cambia automáticamente entre animaciones según la dirección de movimiento.">
                <input type="checkbox" id="anim-ctrl-smart-mode-toggle" ${currentControllerData.smartMode ? 'checked' : ''}>
                <label for="anim-ctrl-smart-mode-toggle" data-i18n="SMART_MODE_DIRECTIONS">${L.get('SMART_MODE_DIRECTIONS', 'Modo Inteligente (Direcciones)')}</label>
            </div>
        </div>
        <hr>
    `;

    if (!selectedState && !selectedTransition) {
        container.innerHTML = `
            ${globalSettingsHTML}
            <div class="panel-overlay-message" style="position: static; padding: 20px;">
                <p data-i18n="HINT_SELECCIONA_ELEMENTO">${L.get('HINT_SELECCIONA_ELEMENTO', 'Selecciona un estado o transición para editar.')}</p>
            </div>
        `;

        container.querySelector('#anim-ctrl-smart-mode-toggle').onchange = (e) => {
            currentControllerData.smartMode = e.target.checked;
        };
        return;
    }

    if (selectedTransition) {
        container.innerHTML = `
            ${globalSettingsHTML}
            <div class="inspector-section">
                <div class="inspector-section-header">
                    <span>Transición: ${selectedTransition.from} &rarr; ${selectedTransition.to}</span>
                </div>
                <div class="inspector-row">
                    <label>Duración (s)</label>
                    <input type="number" id="anim-trans-duration" value="${selectedTransition.duration !== undefined ? selectedTransition.duration : 0.3}" step="0.05" min="0">
                </div>
                <div class="checkbox-field">
                    <input type="checkbox" id="anim-trans-exit-time" ${selectedTransition.hasExitTime ? 'checked' : ''}>
                    <label for="anim-trans-exit-time">Esperar a que termine (Exit Time)</label>
                </div>
                <button class="primary-btn remove-btn" id="anim-trans-delete-btn" style="width: 100%; margin-top: 10px;">Eliminar Transición</button>
            </div>
        `;

        container.querySelector('#anim-trans-duration').oninput = (e) => {
            selectedTransition.duration = parseFloat(e.target.value) || 0;
        };
        container.querySelector('#anim-trans-exit-time').onchange = (e) => {
            selectedTransition.hasExitTime = e.target.checked;
        };
        container.querySelector('#anim-trans-delete-btn').onclick = () => {
            currentControllerData.transitions = currentControllerData.transitions.filter(t => t !== selectedTransition);
            selectedTransition = null;
            renderAnimatorGraph();
            updateStateInspector();
        };
        return;
    }

    container.innerHTML = `
        ${globalSettingsHTML}
        <div class="inspector-section">
            <div class="inspector-row">
                <label data-i18n="PROP_NOMBRE">${L.get('PROP_NOMBRE', 'Nombre')}</label>
                <input type="text" id="anim-state-name" value="${selectedState.name}">
            </div>
            <div class="inspector-row">
                <label data-i18n="PROP_ANIMACION">${L.get('PROP_ANIMACION', 'Animación')}</label>
                <div class="file-picker">
                    <input type="text" id="anim-state-asset" value="${selectedState.animationClip || ''}" readonly>
                    <button id="anim-state-asset-btn">...</button>
                </div>
            </div>
            <div class="inspector-row">
                <label data-i18n="PROP_VELOCIDAD">${L.get('PROP_VELOCIDAD', 'Velocidad')}</label>
                <input type="number" id="anim-state-speed" value="${selectedState.speed !== undefined ? selectedState.speed : 12.0}" step="0.1">
            </div>
            <div class="inspector-row">
                <label data-i18n="PROP_FRAME_INICIO">${L.get('PROP_FRAME_INICIO', 'Fotograma Inicio')}</label>
                <input type="number" id="anim-state-start" value="${selectedState.startFrame || 0}" min="0">
            </div>
            <div class="inspector-row">
                <label data-i18n="PROP_FRAME_FIN">${L.get('PROP_FRAME_FIN', 'Fotograma Fin')}</label>
                <input type="number" id="anim-state-end" value="${selectedState.endFrame !== undefined ? selectedState.endFrame : -1}" min="-1">
            </div>
            <div class="checkbox-field">
                <input type="checkbox" id="anim-state-loop" ${selectedState.loop !== false ? 'checked' : ''}>
                <label for="anim-state-loop" data-i18n="PROP_LOOP">${L.get('PROP_LOOP', 'Bucle (Loop)')}</label>
            </div>
            <div class="checkbox-field">
                <input type="checkbox" id="anim-state-flip-x" ${selectedState.flipX ? 'checked' : ''}>
                <label for="anim-state-flip-x" data-i18n="PROP_VOLTEAR_H">${L.get('PROP_VOLTEAR_H', 'Voltear Horizontal')}</label>
            </div>
            <div class="checkbox-field">
                <input type="checkbox" id="anim-state-flip-y" ${selectedState.flipY ? 'checked' : ''}>
                <label for="anim-state-flip-y" data-i18n="PROP_VOLTEAR_V">${L.get('PROP_VOLTEAR_V', 'Voltear Vertical')}</label>
            </div>
            <hr>
            <div class="inspector-section-header">
                <span data-i18n="MAPEO_MOVIMIENTO">${L.get('MAPEO_MOVIMIENTO', 'Mapeo de Movimiento')}</span>
            </div>
            <p class="field-description" data-i18n="HINT_MAPEO_MOVIMIENTO">${L.get('HINT_MAPEO_MOVIMIENTO', 'Asigna este estado a una dirección del personaje.')}</p>
            <div class="direction-grid-container">
                <div class="direction-grid" id="anim-direction-grid">
                    ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                        const isAssigned = currentControllerData.movementMapping[i] === selectedState.name;
                        const iconNames = ['arrow-up-left', 'arrow-up', 'arrow-up-right', 'arrow-left', 'stop', 'arrow-right', 'arrow-down-left', 'arrow-down', 'arrow-down-right'];
                        const labels = [
                            L.get('NW', 'Noroeste'), L.get('N', 'Norte'), L.get('NE', 'Noreste'),
                            L.get('W', 'Oeste'), L.get('STOP', 'Quieto'), L.get('E', 'Este'),
                            L.get('SW', 'Suroeste'), L.get('S', 'Sur'), L.get('SE', 'Sureste')
                        ];
                        const iconHTML = `<img src="icons/${iconNames[i]}.svg" class="ce-icon" style="width: 20px; height: 20px;">`;
                        return `<div class="direction-cell ${isAssigned ? 'active' : ''}" data-index="${i}" title="${labels[i]}">${iconHTML}</div>`;
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    // Listeners for inspector
    container.querySelector('#anim-state-name').oninput = (e) => {
        const oldName = selectedState.name;
        const newName = e.target.value;
        if (!newName || newName === oldName) return;

        // Update name in mapping
        for (let key in currentControllerData.movementMapping) {
            if (currentControllerData.movementMapping[key] === oldName) {
                currentControllerData.movementMapping[key] = newName;
            }
        }
        // Update transitions
        currentControllerData.transitions.forEach(t => {
            if (t.from === oldName) t.from = newName;
            if (t.to === oldName) t.to = newName;
        });
        if (currentControllerData.entryState === oldName) currentControllerData.entryState = newName;

        selectedState.name = newName;
        renderAnimatorGraph();
        populateStatesList();
    };

    container.querySelector('#anim-state-asset-btn').onclick = () => {
        window.openAssetSelector(async (handle, path) => {
            if (handle) {
                selectedState.animationClip = path;

                // Automatically detect frame count
                try {
                    const file = await handle.getFile();
                    const content = await file.text();
                    const data = JSON.parse(content);
                    const anim = (data.animations && data.animations.length > 0) ? data.animations[0] : data;

                    if (anim && anim.frames) {
                        selectedState.endFrame = anim.frames.length - 1;
                        if (anim.speed) selectedState.speed = anim.speed;
                        if (anim.loop !== undefined) selectedState.loop = anim.loop;
                    }
                } catch (e) {
                    console.warn("[AnimatorController] No se pudo leer el archivo de animación para autoconfiguración:", e);
                }

                updateStateInspector();
                populateStatesList();
            }
        }, { filter: ['.cea', '.ceanimclip'] });
    };

    container.querySelector('#anim-state-speed').oninput = (e) => {
        selectedState.speed = parseFloat(e.target.value) || 12.0;
    };

    container.querySelector('#anim-state-start').oninput = (e) => {
        selectedState.startFrame = parseInt(e.target.value) || 0;
    };

    container.querySelector('#anim-state-end').oninput = (e) => {
        selectedState.endFrame = parseInt(e.target.value);
        if (isNaN(selectedState.endFrame)) selectedState.endFrame = -1;
    };

    container.querySelector('#anim-state-loop').onchange = (e) => {
        selectedState.loop = e.target.checked;
    };

    container.querySelector('#anim-state-flip-x').onchange = (e) => {
        selectedState.flipX = e.target.checked;
    };

    container.querySelector('#anim-state-flip-y').onchange = (e) => {
        selectedState.flipY = e.target.checked;
    };

    container.querySelector('#anim-ctrl-smart-mode-toggle').onchange = (e) => {
        currentControllerData.smartMode = e.target.checked;
    };

    container.querySelector('#anim-direction-grid').onclick = (e) => {
        const cell = e.target.closest('.direction-cell');
        if (!cell) return;

        const index = cell.dataset.index;
        const isCurrentlySet = currentControllerData.movementMapping[index] === selectedState.name;

        if (isCurrentlySet) {
            delete currentControllerData.movementMapping[index];
        } else {
            currentControllerData.movementMapping[index] = selectedState.name;
        }
        updateStateInspector();
    };
}

function updateGraphData() {
    if (graphView && currentControllerData) {
        graphView.dataset.controllerContent = JSON.stringify(currentControllerData, null, 2);
    }
}

async function saveAnimatorController() {
    const L = window.Localization;
    if (!currentControllerHandle || !currentControllerData) {
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_SIN_CTRL_GUARDAR', 'No hay ningún controlador seleccionado para guardar.'));
        return;
    }

    const savedName = currentControllerHandle.name;
    const savedPath = `Assets/${savedName}`;

    try {
        let writable;
        try {
            writable = await currentControllerHandle.createWritable();
        } catch (e) {
            if (e.name === 'InvalidStateError' || e.name === 'NotFoundError') {
                console.warn(`[AnimatorController] Handle stale, trying to re-acquire for '${savedPath}'`);
                const freshHandle = await getFileHandleForPath(savedPath, window.projectsDirHandle);
                if (freshHandle) {
                    currentControllerHandle = freshHandle;
                    writable = await currentControllerHandle.createWritable();
                } else {
                    throw e;
                }
            } else {
                throw e;
            }
        }

        await writable.write(JSON.stringify(currentControllerData, null, 2));
        await writable.close();

        // Invalidate cache for the saved file so refresh() picks up the new version
        clearAssetCache(savedPath);

        // Hot-reload: Notify components in the scene
        if (window.SceneManager && window.SceneManager.currentScene) {
            const allMaterias = window.SceneManager.currentScene.getAllMaterias();
            allMaterias.forEach(m => {
                const controller = m.getComponentByName('AnimatorController');
                if (controller && controller.controllerPath &&
                   (controller.controllerPath.includes(savedName))) {
                    controller.refresh();
                }
            });
        }

        window.Dialogs.showNotification(L.get('EXITO', 'Éxito'), `${L.get('EXITO_CTRL_GUARDADO', 'Controlador guardado correctamente')}: ${savedName}`);

    } catch (error) {
        console.error("Error al guardar el controlador:", error);
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_GUARDAR_CTRL', 'No se pudo guardar el controlador. Intenta abrirlo de nuevo.'));
    }
}

async function createNewAnimatorController() {
    const L = window.Localization;
    window.Dialogs.showPrompt(
        L.get('TITULO_NUEVO_CONTROLADOR', 'Nuevo Controlador'),
        L.get('PROMPT_NOMBRE_CTRL', 'Introduce el nombre para el nuevo controlador de animación:'),
        async (controllerName) => {
            if (!controllerName) return;

            const fileName = `${controllerName}.ceanim`;
            const defaultContent = {
                name: controllerName,
                entryState: L.get('PARADO', "Parado"),
                smartMode: true,
                states: [
                    { name: L.get('PARADO', "Parado"), animationClip: "", speed: 12.0, position: { x: 300, y: 200 }, flipX: false, flipY: false },
                    { name: L.get('ARRIBA', "Arriba"), animationClip: "", speed: 12.0, position: { x: 300, y: 50 }, flipX: false, flipY: false },
                    { name: L.get('ABAJO', "Abajo"), animationClip: "", speed: 12.0, position: { x: 300, y: 350 }, flipX: false, flipY: false },
                    { name: L.get('IZQUIERDA', "Izquierda"), animationClip: "", speed: 12.0, position: { x: 100, y: 200 }, flipX: false, flipY: false },
                    { name: L.get('DERECHA', "Derecha"), animationClip: "", speed: 12.0, position: { x: 500, y: 200 }, flipX: false, flipY: false }
                ],
                transitions: [],
                movementMapping: {
                    "4": L.get('PARADO', "Parado"),
                    "1": L.get('ARRIBA', "Arriba"),
                    "7": L.get('ABAJO', "Abajo"),
                    "3": L.get('IZQUIERDA', "Izquierda"),
                    "5": L.get('DERECHA', "Derecha")
                }
            };

            try {
                const projectName = new URLSearchParams(window.location.search).get('project');
                const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
                const projectHandle = await currentDirHandle.getDirectoryHandle(projectName);
                const assetsHandle = await projectHandle.getDirectoryHandle('Assets', { create: true });

                const fileHandle = await assetsHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(defaultContent, null, 2));
                await writable.close();

                console.log(`Creado nuevo controlador: ${fileName}`);

        // Re-acquire fresh handle to avoid InvalidStateError on some browsers
        const freshHandle = await assetsHandle.getFileHandle(fileName);

                // After creating, open it
        await openAnimatorController(freshHandle);

            } catch (error) {
                console.error("Error al crear el controlador de animación:", error);
                window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_ARCHIVO_CTRL', 'No se pudo crear el archivo del controlador.'));
            }
        },
        'NewAnimator'
    );
}


// Initialization function, called from editor.js
export function initialize(dependencies) {
    dom = dependencies.dom;
    projectsDirHandle = dependencies.projectsDirHandle;
    updateWindowMenuUI = dependencies.updateWindowMenuUI;

    console.log("Initializing Animator Controller Window...");

    if (dom.animatorControllerPanel) {
        graphView = dom.animatorControllerPanel.querySelector('#animator-graph-view');
        graphContent = dom.animatorControllerPanel.querySelector('#animator-graph-content');
        nodesContainer = dom.animatorControllerPanel.querySelector('#anim-nodes-container');
        connectionsLayer = dom.animatorControllerPanel.querySelector('#animator-connections-layer');

        // Setup SVG arrow markers
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#888');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        connectionsLayer.appendChild(defs);
    }

    setupEventListeners();
}

function setupEventListeners() {
    // Window Menu listener
    const menuButton = document.getElementById('menu-window-animator');
    if (menuButton) {
        menuButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation(); // Avoid double-toggle from editor.js generic listener
            const panel = dom.animatorControllerPanel;
            const isHiding = panel.classList.toggle('hidden');
            updateWindowMenuUI();

            if (!isHiding) {
                await populateAnimationsList();

                // If nothing is open, show overlay
                const overlay = document.getElementById('animator-controller-overlay');
                if (overlay) {
                    if (currentControllerHandle) overlay.classList.add('hidden');
                    else overlay.classList.remove('hidden');
                }
            }
        });
    }

    // --- Layout Resizers ---
    initAnimResizer(document.getElementById('anim-resizer-left'), 'left');
    initAnimResizer(document.getElementById('anim-resizer-right'), 'right');
    initAnimResizer(document.getElementById('anim-resizer-v-left'), 'v-left');

    function initAnimResizer(resizer, type) {
        if (!resizer) return;
        resizer.style.touchAction = 'none';
        resizer.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            resizer.setPointerCapture(e.pointerId);
            const startX = e.clientX;
            const startY = e.clientY;
            const leftSidebar = dom.animatorControllerPanel.querySelector('#animator-left-sidebar');
            const rightSidebar = dom.animatorControllerPanel.querySelector('#animator-right-sidebar');
            const assetsList = dom.animatorControllerPanel.querySelector('#animator-assets-list');

            const startWidthLeft = leftSidebar ? leftSidebar.offsetWidth : 250;
            const startWidthRight = rightSidebar ? rightSidebar.offsetWidth : 250;
            const startHeightTop = assetsList ? assetsList.offsetHeight : 150;

            const onPointerMove = (moveEvent) => {
                if (type === 'left') {
                    const newWidth = startWidthLeft + (moveEvent.clientX - startX);
                    if (leftSidebar) leftSidebar.style.width = `${Math.max(100, newWidth)}px`;
                } else if (type === 'right') {
                    const newWidth = startWidthRight - (moveEvent.clientX - startX);
                    if (rightSidebar) rightSidebar.style.width = `${Math.max(150, newWidth)}px`;
                } else if (type === 'v-left') {
                    const newHeight = startHeightTop + (moveEvent.clientY - startY);
                    if (assetsList) {
                        assetsList.style.flex = 'none';
                        assetsList.style.height = `${Math.max(50, newHeight)}px`;
                    }
                }
            };

            const onPointerUp = (upEvent) => {
                resizer.releasePointerCapture(upEvent.pointerId);
                resizer.removeEventListener('pointermove', onPointerMove);
                resizer.removeEventListener('pointerup', onPointerUp);
                resizer.removeEventListener('pointercancel', onPointerUp);
            };

            resizer.addEventListener('pointermove', onPointerMove);
            resizer.addEventListener('pointerup', onPointerUp);
            resizer.addEventListener('pointercancel', onPointerUp);
        });
    }

    // Toolbar button listeners
    const newBtn = document.getElementById('anim-ctrl-new-btn');
    const quickCreateBtn = document.getElementById('btn-create-anim-ctrl-quick');
    const quickOpenBtn = document.getElementById('btn-open-anim-ctrl-quick');

    if (newBtn) {
        newBtn.addEventListener('click', createNewAnimatorController);
    }

    if (quickCreateBtn) {
        quickCreateBtn.addEventListener('click', createNewAnimatorController);
    }

    if (quickOpenBtn) {
        quickOpenBtn.addEventListener('click', () => {
            window.openAssetSelector((handle) => {
                if (handle) openAnimatorController(handle);
            }, { filter: ['.ceanim'] });
        });
    }

    const saveBtn = document.getElementById('anim-ctrl-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAnimatorController);
    }

    const openBtn = document.getElementById('anim-ctrl-open-btn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            window.openAssetSelector((handle) => {
                if (handle) openAnimatorController(handle);
            }, { filter: ['.ceanim'] });
        });
    }

    // Graph interactions
    graphView.style.touchAction = 'none';
    graphView.addEventListener('pointerdown', (e) => {
        // Allow left-click panning (button 0) as well for better accessibility, but ensure we aren't clicking a node
        const isOnBackground = e.target === graphView || e.target === connectionsLayer || e.target === nodesContainer || e.target === graphContent;

        if (((e.button === 1 || (e.button === 0 && (e.altKey || isOnBackground))) || e.pointerType === 'touch') && !isConnecting) {
            isPanning = true;
            graphView.setPointerCapture(e.pointerId);
            lastPanPos = { x: e.clientX, y: e.clientY };
            graphView.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    window.addEventListener('pointermove', (e) => {
        if (isPanning) {
            const dx = e.clientX - lastPanPos.x;
            const dy = e.clientY - lastPanPos.y;
            viewOffset.x += dx;
            viewOffset.y += dy;
            lastPanPos = { x: e.clientX, y: e.clientY };
            graphContent.style.transform = `translate(${viewOffset.x}px, ${viewOffset.y}px)`;
            return;
        }

        if (isDraggingNode && dragNodeInfo.node) {
            const dx = (e.clientX - dragNodeInfo.startX);
            const dy = (e.clientY - dragNodeInfo.startY);
            dragNodeInfo.state.position.x = dragNodeInfo.origX + dx;
            dragNodeInfo.state.position.y = dragNodeInfo.origY + dy;
            dragNodeInfo.node.style.left = `${dragNodeInfo.state.position.x}px`;
            dragNodeInfo.node.style.top = `${dragNodeInfo.state.position.y}px`;
            renderTransitions();
        }

        if (isConnecting && connectionSource) {
            renderTransitions();
            const rect = graphView.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) - viewOffset.x;
            const mouseY = (e.clientY - rect.top) - viewOffset.y;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const ox = 50, oy = 20;
            line.setAttribute('x1', connectionSource.position.x + ox);
            line.setAttribute('y1', connectionSource.position.y + oy);
            line.setAttribute('x2', mouseX);
            line.setAttribute('y2', mouseY);
            line.setAttribute('stroke', '#aaa');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '5,5');
            connectionsLayer.appendChild(line);
        }
    });

    window.addEventListener('pointerup', (e) => {
        if (isDraggingNode && dragNodeInfo.node) {
            dragNodeInfo.node.releasePointerCapture(dragNodeInfo.pointerId);
        }
        isDraggingNode = false;
        if (isPanning) {
            isPanning = false;
            graphView.releasePointerCapture(e.pointerId);
            graphView.style.cursor = '';
        }
    });

    graphView.addEventListener('click', (e) => {
        if (isConnecting) {
             // If clicked empty space, stop connecting
             if (e.target === graphView || e.target === connectionsLayer || e.target === nodesContainer || e.target === graphContent) {
                 stopConnecting();
             }
        } else {
            if (e.target === graphView || e.target === connectionsLayer || e.target === nodesContainer || e.target === graphContent) {
                selectedState = null;
                selectedTransition = null;
                renderTransitions();
                nodesContainer.querySelectorAll('.anim-state-node').forEach(n => n.classList.remove('selected'));
                updateStateInspector();
            }
        }
    });

    graphView.addEventListener('contextmenu', (e) => {
        if (e.target === graphView || e.target === connectionsLayer || e.target === nodesContainer) {
            e.preventDefault();
            showGraphContextMenu(e);
        }
    });

    // Add state button
    const addStateBtn = document.getElementById('anim-state-add-btn');
    if (addStateBtn) {
        addStateBtn.addEventListener('click', () => {
            addNewStatePrompt(50, 50);
        });
    }

    // Drag and Drop animations from left list to nodes
    nodesContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    nodesContainer.addEventListener('drop', (e) => {
        const node = e.target.closest('.anim-state-node');
        if (node) {
            const stateName = node.dataset.name;
            const state = currentControllerData.states.find(s => s.name === stateName);
            try {
                const animData = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (animData.path && (animData.path.endsWith('.cea') || animData.path.endsWith('.ceanimclip'))) {
                    state.animationClip = animData.path;
                    renderAnimatorGraph();
                    if (selectedState === state) updateStateInspector();
                }
            } catch (err) {
                console.error("[AnimatorController] Error parsing drop data:", err);
            }
        }
    });
}

function addNewStatePrompt(x, y) {
    if (!currentControllerData) return;
    const L = window.Localization;
    window.Dialogs.showPrompt(L.get('TITULO_NUEVO_ESTADO', 'Nuevo Estado'), L.get('PROMPT_NOMBRE_ESTADO', 'Nombre del estado:'), (name) => {
        if (name) {
            currentControllerData.states.push({
                name: name,
                animationClip: "",
                speed: 12.0,
                position: { x: x, y: y },
                flipX: false,
                flipY: false
            });
            renderAnimatorGraph();
        }
    });
}

function showGraphContextMenu(e) {
    if (!currentControllerData) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.display = 'block';
    menu.style.position = 'fixed';
    menu.style.zIndex = '3000';

    document.body.appendChild(menu); // Append first to measure offsetHeight

    const menuWidth = 200; // Expected width
    const menuHeight = 50; // Expected height (approx)
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = e.clientX;
    let top = e.clientY;

    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth - 5;
    if (top + menuHeight > windowHeight) top = windowHeight - menuHeight - 5;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    const L = window.Localization;
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.textContent = L.get('CONTEXT_CREAR_ESTADO', 'Crear Estado');
    li.onclick = (event) => {
        event.stopPropagation();
        const rect = graphView.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        addNewStatePrompt(x, y);
        menu.remove();
        document.removeEventListener('mousedown', onMouseDown);
    };
    ul.appendChild(li);
    menu.appendChild(ul);

    // Close menu when clicking outside
    const onMouseDown = (event) => {
        if (!menu.contains(event.target)) {
            menu.remove();
            document.removeEventListener('mousedown', onMouseDown);
        }
    };
    setTimeout(() => document.addEventListener('mousedown', onMouseDown), 10);
}
