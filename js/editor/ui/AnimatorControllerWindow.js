// js/editor/ui/AnimatorControllerWindow.js

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

let isDraggingNode = false;
let dragNodeInfo = {};
let isConnecting = false;
let connectionSource = null;

// This function is exported and called from other modules (like the asset browser)
// to open a controller asset in this window.
export async function openAnimatorController(fileHandle) {
    try {
        // Ensure panel is visible
        if (dom.animatorControllerPanel.classList.contains('hidden')) {
            dom.animatorControllerPanel.classList.remove('hidden');
            updateWindowMenuUI();
        }

        const file = await fileHandle.getFile();
        const content = await file.text();
        currentControllerData = JSON.parse(content);
        currentControllerHandle = fileHandle;

        // Update UI
        const nameLabel = document.getElementById('current-anim-ctrl-name');
        if (nameLabel) nameLabel.textContent = fileHandle.name;

        const overlay = document.getElementById('animator-controller-overlay');
        if (overlay) overlay.classList.add('hidden');

        console.log(`Cargado controlador: ${fileHandle.name}`, currentControllerData);
        renderAnimatorGraph();
    } catch (error) {
        console.error(`Error al cargar el controlador '${fileHandle.name}':`, error);
        window.Dialogs.showNotification('Error', 'No se pudo cargar el controlador.');
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
        node.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !isConnecting) {
                isDraggingNode = true;
                dragNodeInfo = {
                    node: node,
                    state: state,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: state.position.x,
                    origY: state.position.y
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
            drawArrow(fromState.position, toState.position);
        }
    });
}

function drawArrow(fromPos, toPos) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    // Offset to center of nodes (assuming node size ~100x40)
    const ox = 50, oy = 20;
    line.setAttribute('x1', fromPos.x + ox);
    line.setAttribute('y1', fromPos.y + oy);
    line.setAttribute('x2', toPos.x + ox);
    line.setAttribute('y2', toPos.y + oy);
    line.setAttribute('class', 'anim-transition-line');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    connectionsLayer.appendChild(line);
}

function addTransition(from, to) {
    if (!currentControllerData.transitions) currentControllerData.transitions = [];
    // Avoid duplicates
    if (currentControllerData.transitions.some(t => t.from === from && t.to === to)) return;

    currentControllerData.transitions.push({
        from: from,
        to: to,
        hasExitTime: true,
        conditions: []
    });
    renderAnimatorGraph();
}

function showNodeContextMenu(e, state) {
    const menu = document.getElementById('anim-node-context-menu');
    if (!menu) return;

    menu.style.display = 'block';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    // Clear and add items
    menu.innerHTML = '';
    const addItem = (label, action) => {
        const li = document.createElement('li');
        li.textContent = label;
        li.onclick = () => { action(); menu.style.display = 'none'; };
        menu.appendChild(li);
    };

    addItem('Establecer como Principal', () => {
        currentControllerData.entryState = state.name;
        renderAnimatorGraph();
    });

    addItem('Conectar', () => {
        startConnecting(state);
    });

    addItem('Eliminar Estado', () => {
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
    renderAnimatorGraph();
}

async function populateAnimationsList() {
    const list = dom.animatorControllerPanel.querySelector('#animator-assets-list .list-content');
    list.innerHTML = '';

    const animFiles = [];
    async function findAnims(dirHandle, path = 'Assets') {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.cea')) {
                animFiles.push({ name: entry.name, path: `${path}/${entry.name}` });
            } else if (entry.kind === 'directory') {
                await findAnims(entry, `${path}/${entry.name}`);
            }
        }
    }

    const projectName = new URLSearchParams(window.location.search).get('project');
    const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
    await findAnims(projectHandle);

    animFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'asset-list-item';
        item.textContent = file.name;
        item.draggable = true;
        item.dataset.path = file.path;
        list.appendChild(item);
    });
}

function populateStatesList() {
    const list = dom.animatorControllerPanel.querySelector('#animator-states-list .list-content');
    list.innerHTML = '';

    if (!currentControllerData) return;

    currentControllerData.states.forEach(state => {
        const item = document.createElement('div');
        item.className = 'state-list-item';
        item.innerHTML = `
            <span class="state-name">${state.name}</span>
            <span class="state-anim">${state.animationAsset ? state.animationAsset.split('/').pop() : 'Ninguana'}</span>
        `;
        item.onclick = () => selectState(state);
        list.appendChild(item);
    });
}

function selectState(state) {
    // Highlight in graph and list
    nodesContainer.querySelectorAll('.anim-state-node').forEach(n => n.classList.remove('selected'));
    const node = nodesContainer.querySelector(`[data-name="${state.name}"]`);
    if (node) node.classList.add('selected');

    // Show properties (optional, maybe later)
    console.log("Selected state:", state);
}

function updateGraphData() {
    if (graphView && currentControllerData) {
        graphView.dataset.controllerContent = JSON.stringify(currentControllerData, null, 2);
    }
}

async function saveAnimatorController() {
    if (!currentControllerHandle || !currentControllerData) {
        window.Dialogs.showNotification('Error', 'No hay ningún controlador seleccionado para guardar.');
        return;
    }
    try {
        const writable = await currentControllerHandle.createWritable();
        await writable.write(JSON.stringify(currentControllerData, null, 2));
        await writable.close();
        window.Dialogs.showNotification('Éxito', `Controlador '${currentControllerHandle.name}' guardado.`);
    } catch (error) {
        console.error("Error al guardar el controlador:", error);
        window.Dialogs.showNotification('Error', 'No se pudo guardar el controlador.');
    }
}

async function createNewAnimatorController() {
    window.Dialogs.showPrompt(
        'Nuevo Controlador',
        'Introduce el nombre para el nuevo controlador de animación:',
        async (controllerName) => {
            if (!controllerName) return;

            const fileName = `${controllerName}.ceanim`;
            const defaultContent = {
                name: controllerName,
                entryState: "Parado",
                smartMode: true,
                states: [
                    { name: "Parado", animationAsset: "", speed: 1.0, position: { x: 300, y: 200 } },
                    { name: "Arriba", animationAsset: "", speed: 1.0, position: { x: 300, y: 50 } },
                    { name: "Abajo", animationAsset: "", speed: 1.0, position: { x: 300, y: 350 } },
                    { name: "Izquierda", animationAsset: "", speed: 1.0, position: { x: 100, y: 200 } },
                    { name: "Derecha", animationAsset: "", speed: 1.0, position: { x: 500, y: 200 } }
                ],
                transitions: []
            };

            try {
                const projectName = new URLSearchParams(window.location.search).get('project');
                const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
                const assetsHandle = await projectHandle.getDirectoryHandle('Assets', { create: true });

                const fileHandle = await assetsHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(defaultContent, null, 2));
                await writable.close();

                console.log(`Creado nuevo controlador: ${fileName}`);
                // After creating, open it
                await openAnimatorController(fileHandle);

            } catch (error) {
                console.error("Error al crear el controlador de animación:", error);
                window.Dialogs.showNotification('Error', 'No se pudo crear el archivo del controlador.');
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

    // Toolbar button listeners
    const newBtn = document.getElementById('anim-ctrl-new-btn');
    if (newBtn) {
        newBtn.addEventListener('click', createNewAnimatorController);
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
            }, { extensions: ['.ceanim'] });
        });
    }

    // Graph interactions
    window.addEventListener('mousemove', (e) => {
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
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

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

    window.addEventListener('mouseup', () => {
        isDraggingNode = false;
    });

    graphView.addEventListener('click', (e) => {
        if (isConnecting) {
             // If clicked empty space, stop connecting
             if (e.target === graphView || e.target === connectionsLayer || e.target === nodesContainer) {
                 stopConnecting();
             }
        }
    });

    // Add state button
    const addStateBtn = document.getElementById('anim-state-add-btn');
    if (addStateBtn) {
        addStateBtn.addEventListener('click', () => {
            window.Dialogs.showPrompt('Nuevo Estado', 'Nombre del estado:', (name) => {
                if (name) {
                    currentControllerData.states.push({
                        name: name,
                        animationAsset: "",
                        speed: 1.0,
                        position: { x: 50, y: 50 }
                    });
                    renderAnimatorGraph();
                }
            });
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
            const animData = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (animData.path && animData.path.endsWith('.cea')) {
                state.animationAsset = animData.path;
                renderAnimatorGraph();
            }
        }
    });
}
