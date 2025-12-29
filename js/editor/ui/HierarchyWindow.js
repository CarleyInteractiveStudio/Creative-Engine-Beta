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
import { createBaseMateria, generateUniqueName } from '../MateriaFactory.js';

// Module-level state and dependencies
let dom = {};
let SceneManager = null;
let getSelectedMateria = () => null;
let selectMateriaCallback = () => {};
let isDraggingFromHierarchy = false;
let showContextMenuCallback = () => {};
let projectsDirHandle = null; // Needed for drag-drop from assets
let updateInspector = () => {}; // To refresh inspector after rename/delete
let contextMateria = null; // DIRECT REFERENCE to the materia under the context menu

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
function createTilemapObject(parent = null) {
    // Create the parent Grid object
    const gridMateria = createBaseMateria(generateUniqueName('Grid'), parent);
    gridMateria.addComponent(new Components.Grid(gridMateria));

    // Create the child Tilemap object
    const tilemapMateria = createBaseMateria(generateUniqueName('Tilemap'), gridMateria); // Pass gridMateria as parent
    tilemapMateria.addComponent(new Components.Tilemap(tilemapMateria));
    tilemapMateria.addComponent(new Components.TilemapRenderer(tilemapMateria));

    // The function returns the parent Grid, which is what should be selected
    return gridMateria;
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

export function handleContextMenuAction(action) {
    const selectedMateria = getSelectedMateria();
    // For actions on existing items, we MUST use the materia that was under the cursor
    // when the context menu was opened. This prevents race conditions if selection changes.
    // The `contextMateria` is now a direct reference, set during the 'contextmenu' event.
    let newMateria = null;
    let shouldUpdate = false;

    switch (action) {
        case 'create-empty':
            // Parenting uses the selected materia, which is intuitive.
            newMateria = createBaseMateria(generateUniqueName('Mater Vacío'), selectedMateria);
            break;
        case 'create-audio':
            newMateria = createBaseMateria(generateUniqueName('Audio'), selectedMateria);
            newMateria.addComponent(new Components.AudioSource(newMateria));
            break;
        case 'create-camera':
            newMateria = createCameraObject(selectedMateria);
            break;
        case 'create-sprite':
            newMateria = createBaseMateria(generateUniqueName('Sprite'), selectedMateria);
            newMateria.addComponent(new Components.SpriteRenderer(newMateria));
            break;
        case 'create-rectangle':
            newMateria = createBaseMateria(generateUniqueName('Rectangle'), selectedMateria);
            newMateria.addComponent(new Components.TextureRender(newMateria));
            break;
        case 'create-circle':
            newMateria = createBaseMateria(generateUniqueName('Circle'), selectedMateria);
            const textureRender = new Components.TextureRender(newMateria);
            textureRender.shape = 'Circle';
            newMateria.addComponent(textureRender);
            break;
        case 'create-triangle':
            newMateria = createBaseMateria(generateUniqueName('Triangle'), selectedMateria);
            const textureRenderTri = new Components.TextureRender(newMateria);
            textureRenderTri.shape = 'Triangle';
            newMateria.addComponent(textureRenderTri);
            break;
        case 'create-capsule':
            newMateria = createBaseMateria(generateUniqueName('Capsule'), selectedMateria);
            const textureRenderCapsule = new Components.TextureRender(newMateria);
            textureRenderCapsule.shape = 'Capsule';
            newMateria.addComponent(textureRenderCapsule);
            newMateria.addComponent(new Components.CapsuleCollider2D(newMateria));
            break;
        case 'create-tilemap':
            newMateria = createTilemapObject(selectedMateria);
            break;
        case 'create-point-light':
            newMateria = createLightObject('Point Light', Components.PointLight2D, selectedMateria);
            break;
        case 'create-spot-light':
            newMateria = createLightObject('Spot Light', Components.SpotLight2D, selectedMateria);
            break;
        case 'create-freeform-light':
            newMateria = createLightObject('Freeform Light', Components.FreeformLight2D, selectedMateria);
            break;
        case 'create-sprite-light':
            newMateria = createLightObject('Sprite Light', Components.SpriteLight2D, selectedMateria);
            break;
        case 'create-ui-canvas':
            newMateria = MateriaFactory.createCanvasObject();
            break;
        case 'create-ui-image':
            newMateria = MateriaFactory.createImageObject();
            break;

        case 'rename':
            if (contextMateria) { // Use contextMateria
                const newName = prompt(`Renombrar '${contextMateria.name}':`, contextMateria.name);
                if (newName && newName.trim() !== '') {
                    contextMateria.name = newName.trim();
                    shouldUpdate = true;
                }
            }
            break;
        case 'delete':
            if (contextMateria) {
                // Direct deletion without confirmation as requested
                const idToDelete = contextMateria.id;
                const currentlySelected = getSelectedMateria();
                if (currentlySelected && currentlySelected.id === idToDelete) {
                    selectMateriaCallback(null);
                }
                SceneManager.currentScene.removeMateria(idToDelete);
                updateHierarchy();
                updateInspector();
            }
            break;
        case 'duplicate':
            if (contextMateria) { // Use contextMateria
                const newDuplicatedMateria = contextMateria.clone();
                newDuplicatedMateria.name = `${contextMateria.name} (Clone)`;
                if (contextMateria.parent) {
                    contextMateria.parent.addChild(newDuplicatedMateria);
                } else {
                    SceneManager.currentScene.addMateria(newDuplicatedMateria);
                }
                // Set as the newMateria so it gets selected after creation
                newMateria = newDuplicatedMateria;
            }
            break;
    }

    // Centralized update for creation and rename actions
    if (newMateria) {
        // For new objects, update hierarchy and then select the new one.
        // A timeout is used to prevent a race condition where the Inspector tries
        // to render the new object before the editor state is fully updated.
        updateHierarchy();
        setTimeout(() => {
            selectMateriaCallback(newMateria.id);
        }, 0);
    } else if (shouldUpdate) {
        // For other actions like rename, just update the UI.
        updateHierarchy();
        updateInspector();
    }
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
            const materiaId = item.dataset.id;
            const dragData = {
                type: 'Materia',
                id: materiaId
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
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

        // Determine the contextMateria from the right-clicked item. This is the crucial step.
        if (item) {
            const materiaId = parseInt(item.dataset.id, 10);
            // Find the materia object *at the moment of the right-click* and store the reference
            contextMateria = SceneManager.currentScene.findMateriaById(materiaId);
            // Also update the selection to match the right-clicked item. This is intuitive for the user.
            selectMateriaCallback(materiaId);
        } else {
            contextMateria = null; // Clicked on empty space
            selectMateriaCallback(null);
        }

        const menu = document.getElementById('hierarchy-context-menu');
        const hasContext = contextMateria !== null;

        // Enable/disable options based on whether an item was right-clicked
        menu.querySelector('[data-action="duplicate"]').classList.toggle('disabled', !hasContext);
        menu.querySelector('[data-action="rename"]').classList.toggle('disabled', !hasContext);
        menu.querySelector('[data-action="delete"]').classList.toggle('disabled', !hasContext);

        showContextMenuCallback(menu, e);
    });

    // --- Menu click listener is now centralized in editor.js ---
}
