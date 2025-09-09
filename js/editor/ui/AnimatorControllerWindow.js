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
let isDraggingNode = false;
let dragNodeInfo = {};

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

        // Visually mark the item as selected in the panel's list of controllers
        const controllerAssetsList = dom.animatorControllerPanel.querySelector('#animator-controllers-list .list-content');
        controllerAssetsList.querySelectorAll('.asset-list-item').forEach(i => i.classList.remove('active'));
        const itemInList = controllerAssetsList.querySelector(`[data-name="${fileHandle.name}"]`);
        if (itemInList) {
            itemInList.classList.add('active');
        }

        console.log(`Cargado controlador: ${fileHandle.name}`, currentControllerData);
        renderAnimatorGraph();
    } catch (error) {
        console.error(`Error al cargar el controlador '${fileHandle.name}':`, error);
        alert("No se pudo cargar el controlador.");
    }
}


function renderAnimatorGraph() {
    if (!currentControllerData || !graphView) return;

    graphView.innerHTML = ''; // Clear previous state
    currentControllerData.states.forEach(state => {
        const node = document.createElement('div');
        node.className = 'graph-node';
        node.textContent = state.name;
        node.style.left = `${state.position.x}px`;
        node.style.top = `${state.position.y}px`;
        node.dataset.name = state.name;

        if (state.name === currentControllerData.entryState) {
            node.classList.add('entry-state');
        }

        graphView.appendChild(node);
    });
    updateGraphData();
}

function updateGraphData() {
    if (graphView && currentControllerData) {
        graphView.dataset.controllerContent = JSON.stringify(currentControllerData, null, 2);
    }
}

async function saveAnimatorController() {
    if (!currentControllerHandle) {
        alert("No hay ningún controlador seleccionado para guardar.");
        return;
    }
    try {
        const contentToSave = graphView.dataset.controllerContent;
        const writable = await currentControllerHandle.createWritable();
        await writable.write(contentToSave);
        await writable.close();
        alert(`Controlador '${currentControllerHandle.name}' guardado con éxito.`);
    } catch (error) {
        console.error("Error al guardar el controlador:", error);
        alert("No se pudo guardar el controlador.");
    }
}

async function createNewAnimatorController() {
    const controllerName = prompt("Nombre del nuevo controlador de animación:", "NewAnimator");
    if (!controllerName) return;

    const fileName = `${controllerName}.ceanim`;
    const defaultContent = {
        name: controllerName,
        entryState: "Idle",
        states: [{
            name: "Idle",
            animationAsset: "",
            speed: 1.0,
            position: { x: 100, y: 100 }
        }],
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
        // After creating, refresh the panel to show the new controller
        await populateControllerList();

    } catch (error) {
        console.error("Error al crear el controlador de animación:", error);
        alert("No se pudo crear el archivo del controlador.");
    }
}

async function populateControllerList() {
    const controllerAssetsList = dom.animatorControllerPanel.querySelector('#animator-controllers-list .list-content');
    controllerAssetsList.innerHTML = 'Buscando...';

    const controllerFiles = [];
    async function findFiles(dirHandle) {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.ceanim')) {
                controllerFiles.push({ name: entry.name, handle: entry });
            } else if (entry.kind === 'directory') {
                await findFiles(entry);
            }
        }
    }

    const projectName = new URLSearchParams(window.location.search).get('project');
    const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
    await findFiles(projectHandle);

    controllerAssetsList.innerHTML = '';
    controllerFiles.forEach(fileInfo => {
        const item = document.createElement('div');
        item.textContent = fileInfo.name;
        item.className = 'asset-list-item';
        item.dataset.name = fileInfo.name;
        item.addEventListener('click', () => openAnimatorController(fileInfo.handle));
        controllerAssetsList.appendChild(item);
    });
}


// Initialization function, called from editor.js
export function initialize(dependencies) {
    dom = dependencies.dom;
    projectsDirHandle = dependencies.projectsDirHandle;
    updateWindowMenuUI = dependencies.updateWindowMenuUI;

    console.log("Initializing Animator Controller Window...");

    if (dom.animatorControllerPanel) {
        graphView = dom.animatorControllerPanel.querySelector('.graph-view');
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
                // If we are showing the panel, populate the lists
                await populateControllerList();
                // TODO: Populate the animation assets list as well
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
}
