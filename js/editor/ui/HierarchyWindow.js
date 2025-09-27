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

// Module-level state and dependencies
let dom = {};
let SceneManager = null;
let getSelectedMateria = () => null;
let selectMateriaCallback = () => {};
let isDraggingFromHierarchy = false;
let showContextMenuCallback = () => {};
let projectsDirHandle = null; // Needed for drag-drop from assets
let updateInspector = () => {}; // To refresh inspector after rename/delete

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
function createBaseMateria(name, parent = null) {
    const newMateria = new Materia(name);
    newMateria.addComponent(new Components.Transform(newMateria));

    if (parent) {
        parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }

    updateHierarchy();
    selectMateriaCallback(newMateria.id);
    return newMateria;
}

function createTilemapObject(parent = null) {
    const newMateria = new Materia('Tilemap');
    newMateria.addComponent(new Components.Transform(newMateria));
    newMateria.addComponent(new Components.Tilemap(newMateria));
    newMateria.addComponent(new Components.TilemapRenderer(newMateria));

    if (parent) {
        parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }

    updateHierarchy();
    selectMateriaCallback(newMateria.id);
    return newMateria;
}

function createLightObject(name, lightComponent, parent = null) {
    const newMateria = new Materia(name);
    newMateria.addComponent(new Components.Transform(newMateria));
    newMateria.addComponent(new lightComponent(newMateria));

    if (parent) {
        parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }

    updateHierarchy();
    selectMateriaCallback(newMateria.id);
    return newMateria;
}

function createCameraObject(parent = null) {
    const newMateria = new Materia('Cámara');
    newMateria.addComponent(new Components.Transform(newMateria));
    newMateria.addComponent(new Components.Camera(newMateria));

    if (parent) {
        parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }

    updateHierarchy();
    selectMateriaCallback(newMateria.id);
    return newMateria;
}

export function duplicateSelectedMateria() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const newMateria = selectedMateria.clone();
    newMateria.name = `${selectedMateria.name} (Clone)`;
    // Add to the same parent as the original, or to the root if it has no parent.
    if (selectedMateria.parent) {
        selectedMateria.parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }
    updateHierarchy();
    selectMateriaCallback(newMateria.id); // Select the new clone
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

function setupEventListeners() {
    const hierarchyPanel = dom.hierarchyPanel;
    const hierarchyContent = dom.hierarchyContent;
    if (!hierarchyPanel || !hierarchyContent) return;

    // --- Drag and Drop Listeners (on the whole panel) ---
    hierarchyPanel.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow drop
        if (isDraggingFromHierarchy) {
            e.dataTransfer.dropEffect = 'move';
        } else {
            e.dataTransfer.dropEffect = 'copy';
        }
        hierarchyPanel.classList.add('drag-over');
    });

    hierarchyPanel.addEventListener('dragleave', (e) => {
        // Prevent flickering when moving over child elements
        if (e.currentTarget.contains(e.relatedTarget)) return;
        hierarchyPanel.classList.remove('drag-over');
    });

    // --- Item-specific listeners (on the content div via event delegation) ---
    hierarchyContent.addEventListener('click', (e) => {
        // Handle clicks on the toggle arrow
        if (e.target.classList.contains('toggle')) {
            const item = e.target.closest('.hierarchy-item');
            if (item) {
                const materiaId = parseInt(item.dataset.id, 10);
                const materia = SceneManager.currentScene.findMateriaById(materiaId);
                if (materia) {
                    materia.isCollapsed = !materia.isCollapsed;
                    updateHierarchy();
                }
            }
            return; // Stop further processing
        }

        // Handle clicks for selection
        const item = e.target.closest('.hierarchy-item');
        if (item) {
            selectMateriaCallback(parseInt(item.dataset.id, 10));
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

    hierarchyContent.addEventListener('dragend', (e) => {
        isDraggingFromHierarchy = false;
    });

    // --- The single, robust, unified drop handler ---
    hierarchyPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        hierarchyPanel.classList.remove('drag-over');
        isDraggingFromHierarchy = false; // Reset state regardless
        const dataText = e.dataTransfer.getData('text/plain');
        const targetItem = e.target.closest('.hierarchy-item');

        // Helper for async asset logic
        const handleAssetDrop = async (data) => {
            const newMateria = new Materia(data.name.split('.')[0]);
            newMateria.addComponent(new Transform(newMateria));
            SceneManager.currentScene.addMateria(newMateria);
            updateHierarchy();
            selectMateriaCallback(newMateria.id);
        };

        let data;
        try {
            data = JSON.parse(dataText);
        } catch (error) {
            data = dataText; // Not JSON, assume it's a plain ID
        }

        if (typeof data === 'object' && data !== null && data.path) {
            // It's an asset drop
            handleAssetDrop(data);
        } else {
            // It's a hierarchy re-parenting drop
            const draggedId = parseInt(data, 10);
            if (isNaN(draggedId)) return;

            const draggedMateria = SceneManager.currentScene.findMateriaById(draggedId);
            if (!draggedMateria) return;

            if (targetItem) {
                // Parenting logic
                const targetId = parseInt(targetItem.dataset.id, 10);
                if (draggedId !== targetId) {
                    const targetMateria = SceneManager.currentScene.findMateriaById(targetId);
                    if (targetMateria && !draggedMateria.isAncestorOf(targetMateria)) {
                        targetMateria.addChild(draggedMateria);
                        updateHierarchy();
                    }
                }
            } else {
                // Un-parenting logic
                if (draggedMateria.parent) {
                    draggedMateria.parent.removeChild(draggedMateria);
                    SceneManager.currentScene.addMateria(draggedMateria);
                    updateHierarchy();
                }
            }
        }
    });

    // --- Context Menu ---
    hierarchyContent.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const item = e.target.closest('.hierarchy-item');
        if (item) {
            selectMateriaCallback(parseInt(item.dataset.id, 10));
        } else {
            selectMateriaCallback(null);
        }

        const menu = document.getElementById('hierarchy-context-menu');
        const hasSelection = !!getSelectedMateria();

        menu.querySelector('[data-action="duplicate"]').classList.toggle('disabled', !hasSelection);
        menu.querySelector('[data-action="rename"]').classList.toggle('disabled', !hasSelection);
        menu.querySelector('[data-action="delete"]').classList.toggle('disabled', !hasSelection);

        showContextMenuCallback(menu, e);
    });

    // --- Menu click listener ---
    const hierarchyMenu = document.getElementById('hierarchy-context-menu');
    if (hierarchyMenu) {
        hierarchyMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action || e.target.classList.contains('disabled')) return;

            showContextMenuCallback(null);
            const selectedMateria = getSelectedMateria();

            switch (action) {
                case 'create-empty':
                    createBaseMateria('Materia Vacio', selectedMateria);
                    break;
                case 'create-camera':
                    createCameraObject(selectedMateria);
                    break;
                case 'create-tilemap':
                    createTilemapObject(selectedMateria);
                    break;
                case 'create-point-light':
                    createLightObject('Point Light', Components.PointLight2D, selectedMateria);
                    break;
                case 'create-spot-light':
                    createLightObject('Spot Light', Components.SpotLight2D, selectedMateria);
                    break;
                case 'create-freeform-light':
                    createLightObject('Freeform Light', Components.FreeformLight2D, selectedMateria);
                    break;
                case 'create-sprite-light':
                    createLightObject('Sprite Light', Components.SpriteLight2D, selectedMateria);
                    break;
                case 'rename':
                    if (selectedMateria) {
                        const newName = prompt(`Renombrar '${selectedMateria.name}':`, selectedMateria.name);
                        if (newName && newName.trim() !== '') {
                            selectedMateria.name = newName.trim();
                            updateHierarchy();
                            updateInspector();
                        }
                    }
                    break;
                case 'delete':
                    if (selectedMateria) {
                        if (confirm(`¿Estás seguro de que quieres eliminar '${selectedMateria.name}'? Esta acción no se puede deshacer.`)) {
                            const idToDelete = selectedMateria.id;
                            selectMateriaCallback(null);
                            SceneManager.currentScene.removeMateria(idToDelete);
                            updateHierarchy();
                            updateInspector();
                        }
                    }
                    break;
                case 'duplicate':
                    duplicateSelectedMateria();
                    break;
            }
        });
    }
}
