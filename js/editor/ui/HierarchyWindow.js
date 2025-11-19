// js/editor/ui/HierarchyWindow.js

/**
 * HierarchyWindow.js
 *
 * This module manages the Hierarchy panel in the editor. It is responsible for:
 * - Rendering the list of Materias (game objects) in the current scene.
 * - Handling user interactions like selection, drag-and-drop re-parenting,
 *   and the right-click context menu.
 */

import { Materia } from '../../engine/Materia.js';
import * as Components from '../../engine/Components.js';
import { showConfirmation } from './DialogWindow.js';

// Module-level state and dependencies
let dom = {};
let SceneManager = null;
let getSelectedMateria = () => null;
let selectMateriaCallback = () => {};
let isDraggingFromHierarchy = false;
let showContextMenuCallback = () => {};
let projectsDirHandle = null; // Needed for drag-drop from assets
let updateInspector = () => {}; // To refresh inspector after rename/delete
let contextMateriaId = null; // ID of the materia under the context menu

// The main update function for this module, which is exported
export function updateHierarchy() {
    if (!dom.hierarchyContent || !SceneManager.currentScene) return;

    const selectedMateria = getSelectedMateria();
    dom.hierarchyContent.innerHTML = '';
    const rootMaterias = SceneManager.currentScene.getRootMaterias();

    if (rootMaterias.length === 0) {
        dom.hierarchyContent.innerHTML = `<p class="empty-message">La escena está vacía.<br>Click derecho para crear un objeto.</p>`;
        return;
    }

    const selectedId = selectedMateria ? selectedMateria.id : null;

    function renderNode(materia, container, depth) {
        const item = document.createElement('div');
        item.className = 'hierarchy-item';
        if (!materia.isActive) {
            item.classList.add('disabled');
        }
        item.dataset.id = materia.id;
        item.draggable = true;
        item.style.marginLeft = `${depth * 18}px`;

        // Add toggle arrow if the materia has children
        if (materia.children && materia.children.length > 0) {
            const toggle = document.createElement('span');
            toggle.className = 'toggle';
            if (!materia.isCollapsed) {
                toggle.classList.add('open');
            }
            item.appendChild(toggle);
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = materia.name;
        item.appendChild(nameSpan);

        if (materia.id === selectedId) {
            item.classList.add('active');
        }

        container.appendChild(item);

        // Only render children if the parent is not collapsed
        if (!materia.isCollapsed && materia.children && materia.children.length > 0) {
            materia.children.forEach(child => {
                renderNode(child, container, depth + 1);
            });
        }
    }

    rootMaterias.forEach(materia => renderNode(materia, dom.hierarchyContent, 0));
}

// --- Hierarchy Creation Functions ---
function generateUniqueName(baseName) {
    const allMaterias = SceneManager.currentScene.getAllMaterias();
    const existingNames = new Set(allMaterias.map(m => m.name));

    if (!existingNames.has(baseName)) {
        return baseName;
    }

    let counter = 1;
    let newName = `${baseName} (${counter})`;
    while (existingNames.has(newName)) {
        counter++;
        newName = `${baseName} (${counter})`;
    }
    return newName;
}

function createBaseMateria(name, parent = null) {
    const newMateria = new Materia(name);
    newMateria.addComponent(new Components.Transform(newMateria));

    if (parent) {
        parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }
    return newMateria;
}

function createTilemapObject(parent = null) {
    const gridName = generateUniqueName('Grid');
    const gridMateria = createBaseMateria(gridName, parent);
    gridMateria.addComponent(new Components.Grid(gridMateria));

    const tilemapName = generateUniqueName('Tilemap');
    const tilemapMateria = createBaseMateria(tilemapName, gridMateria);
    tilemapMateria.addComponent(new Components.Tilemap(tilemapMateria));
    tilemapMateria.addComponent(new Components.TilemapRenderer(tilemapMateria));

    return gridMateria; // Select the parent Grid object
}

function createLightObject(name, lightComponent, parent = null) {
    const newMateria = createBaseMateria(generateUniqueName(name), parent);
    newMateria.addComponent(new lightComponent(newMateria));
    return newMateria;
}

function createCameraObject(parent = null) {
    const newMateria = createBaseMateria(generateUniqueName('Cámara'), parent);
    newMateria.addComponent(new Components.Camera(newMateria));
    return newMateria;
}

export function duplicateSelectedMateria() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const newMateria = selectedMateria.clone();
    newMateria.name = `${selectedMateria.name} (Clone)`;
    if (selectedMateria.parent) {
        selectedMateria.parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }
    updateHierarchy();
    selectMateriaCallback(newMateria.id);
}


// Initialization function, called from editor.js
export function initialize(dependencies) {
    dom = dependencies.dom;
    SceneManager = dependencies.SceneManager;
    selectMateriaCallback = dependencies.selectMateriaCallback;
    showContextMenuCallback = dependencies.showContextMenuCallback;
    projectsDirHandle = dependencies.projectsDirHandle;
    getSelectedMateria = dependencies.getSelectedMateria;
    updateInspector = dependencies.updateInspector;

    console.log("Initializing Hierarchy Window...");
    setupEventListeners();
}

function handleContextMenuAction(action) {
    const selectedMateria = getSelectedMateria();
    const contextMateria = contextMateriaId ? SceneManager.currentScene.findMateriaById(contextMateriaId) : null;
    let newMateria = null;
    let shouldUpdate = false;

    // Use selectedMateria as the parent for new objects
    const parentForNewObject = selectedMateria;

    switch (action) {
        case 'create-empty':
            newMateria = createBaseMateria(generateUniqueName('Mater Vacío'), parentForNewObject);
            break;
        case 'create-audio':
            newMateria = createBaseMateria(generateUniqueName('Audio'), parentForNewObject);
            newMateria.addComponent(new Components.AudioSource(newMateria));
            break;
        case 'create-camera':
            newMateria = createCameraObject(parentForNewObject);
            break;
        case 'create-tilemap':
            newMateria = createTilemapObject(parentForNewObject);
            break;
        case 'create-point-light':
            newMateria = createLightObject('Point Light', Components.PointLight2D, parentForNewObject);
            break;
        case 'create-spot-light':
            newMateria = createLightObject('Spot Light', Components.SpotLight2D, parentForNewObject);
            break;
        case 'create-freeform-light':
            newMateria = createLightObject('Freeform Light', Components.FreeformLight2D, parentForNewObject);
            break;
        case 'create-sprite-light':
            newMateria = createLightObject('Sprite Light', Components.SpriteLight2D, parentForNewObject);
            break;

        case 'rename':
            if (contextMateria) {
                const newName = prompt(`Renombrar '${contextMateria.name}':`, contextMateria.name);
                if (newName && newName.trim() !== '') {
                    contextMateria.name = newName.trim();
                    shouldUpdate = true;
                }
            }
            break;
        case 'delete':
            if (contextMateria) {
                showConfirmation(
                    'Confirmar Eliminación',
                    `¿Estás seguro de que quieres eliminar '${contextMateria.name}'? Esta acción no se puede deshacer.`,
                    () => {
                        const idToDelete = contextMateria.id;
                        selectMateriaCallback(null);
                        SceneManager.currentScene.removeMateria(idToDelete);
                        updateHierarchy();
                        updateInspector();
                    }
                );
            }
            break;
        case 'duplicate':
            if (contextMateria) {
                const newDuplicatedMateria = contextMateria.clone();
                newDuplicatedMateria.name = `${contextMateria.name} (Clone)`;
                if (contextMateria.parent) {
                    contextMateria.parent.addChild(newDuplicatedMateria);
                } else {
                    SceneManager.currentScene.addMateria(newDuplicatedMateria);
                }
                newMateria = newDuplicatedMateria;
            }
            break;
    }

    if (newMateria) {
        updateHierarchy();
        selectMateriaCallback(newMateria.id);
    } else if (shouldUpdate) {
        updateHierarchy();
        updateInspector();
    }
}

function setupEventListeners() {
    const hierarchyPanel = dom.hierarchyPanel;
    const hierarchyContent = dom.hierarchyContent;
    if (!hierarchyPanel || !hierarchyContent) return;

    // Drag and Drop Listeners
    hierarchyPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = isDraggingFromHierarchy ? 'move' : 'copy';
        hierarchyPanel.classList.add('drag-over');
    });

    hierarchyPanel.addEventListener('dragleave', (e) => {
        if (!hierarchyPanel.contains(e.relatedTarget)) {
            hierarchyPanel.classList.remove('drag-over');
        }
    });

    hierarchyPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        hierarchyPanel.classList.remove('drag-over');
        const dataText = e.dataTransfer.getData('text/plain');
        const targetItem = e.target.closest('.hierarchy-item');

        if (isDraggingFromHierarchy) {
            isDraggingFromHierarchy = false;
            const draggedId = parseInt(dataText, 10);
            if (isNaN(draggedId)) return;
            const draggedMateria = SceneManager.currentScene.findMateriaById(draggedId);
            if (!draggedMateria) return;

            const targetMateria = targetItem ? SceneManager.currentScene.findMateriaById(parseInt(targetItem.dataset.id, 10)) : null;

            if (targetMateria && draggedId !== targetMateria.id && !draggedMateria.isAncestorOf(targetMateria)) {
                targetMateria.addChild(draggedMateria);
            } else if (!targetItem) {
                if (draggedMateria.parent) {
                    draggedMateria.parent.removeChild(draggedMateria);
                    SceneManager.currentScene.addMateria(draggedMateria);
                }
            }
            updateHierarchy();
        }
        // Asset drop logic can be added here if needed
    });

    // Item-specific listeners
    hierarchyContent.addEventListener('click', (e) => {
        const item = e.target.closest('.hierarchy-item');
        if (!item) return;

        const materiaId = parseInt(item.dataset.id, 10);
        const materia = SceneManager.currentScene.findMateriaById(materiaId);

        if (e.target.classList.contains('toggle')) {
            if (materia) {
                materia.isCollapsed = !materia.isCollapsed;
                updateHierarchy();
            }
        } else {
            selectMateriaCallback(materiaId);
        }
    });

    hierarchyContent.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.hierarchy-item');
        if (item) {
            e.dataTransfer.setData('text/plain', item.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
            isDraggingFromHierarchy = true;
        }
    });

    // Context Menu
    hierarchyContent.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const item = e.target.closest('.hierarchy-item');
        contextMateriaId = item ? parseInt(item.dataset.id, 10) : null;

        // Select the item under the cursor for context
        selectMateriaCallback(contextMateriaId);

        const menu = document.getElementById('hierarchy-context-menu');
        const hasSelection = contextMateriaId !== null;

        menu.querySelectorAll('[data-action]').forEach(el => {
            const requiresSelection = ['rename', 'delete', 'duplicate'].includes(el.dataset.action);
            if (requiresSelection) {
                el.classList.toggle('disabled', !hasSelection);
            }
        });

        showContextMenuCallback(menu, e);
    });

    const hierarchyMenu = document.getElementById('hierarchy-context-menu');
    if (hierarchyMenu) {
        hierarchyMenu.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target || target.classList.contains('disabled')) return;
            showContextMenuCallback(null); // Hide menu
            handleContextMenuAction(target.dataset.action);
        });
    }
}
