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
import { Transform } from '../../engine/Components.js';

// Module-level state and dependencies
let dom = {};
let SceneManager = null;
let getSelectedMateria = () => null;
let selectMateriaCallback = () => {};
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
        item.style.paddingLeft = `${depth * 18}px`;
        const nameSpan = document.createElement('span');
        nameSpan.textContent = materia.name;
        item.appendChild(nameSpan);

        if (materia.id === selectedId) {
            item.classList.add('active');
        }

        container.appendChild(item);

        if (materia.children && materia.children.length > 0) {
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
    newMateria.addComponent(new Transform(newMateria));

    if (parent) {
        parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }

    updateHierarchy();
    selectMateriaCallback(newMateria.id);
    return newMateria;
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
    const hierarchyContent = dom.hierarchyContent;
    if (!hierarchyContent) return;

    // --- Drag and Drop from Assets to Hierarchy ---
    hierarchyContent.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        hierarchyContent.classList.add('drag-over');
    });

    hierarchyContent.addEventListener('dragleave', () => {
        hierarchyContent.classList.remove('drag-over');
    });

    hierarchyContent.addEventListener('drop', async (e) => {
        e.preventDefault();
        hierarchyContent.classList.remove('drag-over');
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));

        if (data.path && (data.path.endsWith('.png') || data.path.endsWith('.jpg'))) {
            const newMateria = new Materia(data.name.split('.')[0]);
            newMateria.addComponent(new Transform(newMateria));
            // A 'SpriteRenderer' component would be added here, but we are keeping this minimal for now.
            // The user can add it manually via the inspector.

            SceneManager.currentScene.addMateria(newMateria);
            updateHierarchy();
            selectMateriaCallback(newMateria.id);
            console.log(`Creada nueva Materia '${newMateria.name}' desde el asset '${data.name}'.`);
        }
    });

    // --- Hierarchy Item Selection & Reparenting Drag/Drop ---
    hierarchyContent.addEventListener('click', (e) => {
        const item = e.target.closest('.hierarchy-item');
        if (item) {
            const materiaId = parseInt(item.dataset.id, 10);
            selectMateriaCallback(materiaId);
        }
    });

    hierarchyContent.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.hierarchy-item');
        if (item) {
            e.dataTransfer.setData('text/plain', item.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    hierarchyContent.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetItem = e.target.closest('.hierarchy-item');
        const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);

        if (targetItem && !isNaN(draggedId)) {
            const targetId = parseInt(targetItem.dataset.id, 10);
            if (draggedId !== targetId) {
                const draggedMateria = SceneManager.currentScene.findMateriaById(draggedId);
                const targetMateria = SceneManager.currentScene.findMateriaById(targetId);
                if (draggedMateria && targetMateria) {
                    targetMateria.addChild(draggedMateria);
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
            const materiaId = parseInt(item.dataset.id, 10);
            const selectedMateria = getSelectedMateria();
            if (selectedMateria?.id !== materiaId) {
                selectMateriaCallback(materiaId);
            }
        } else {
            selectMateriaCallback(null);
        }
        // Look up the menu just-in-time to avoid race conditions on startup
        const menu = document.getElementById('hierarchy-context-menu');
        showContextMenuCallback(menu, e);
    });

    // We need to check if the menu exists before adding a listener to it
    const hierarchyMenu = document.getElementById('hierarchy-context-menu');
    if (hierarchyMenu) {
        hierarchyMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            // Pass null to the callback to hide all context menus
            showContextMenuCallback(null);

            const selectedMateria = getSelectedMateria();

            switch (action) {
                case 'create-empty':
                    createBaseMateria('Materia Vacio', selectedMateria);
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
                            selectMateriaCallback(null); // Deselect first
                            SceneManager.currentScene.removeMateria(idToDelete);
                            updateHierarchy();
                            updateInspector();
                        }
                    }
                    break;
            }
        });
    }
}
