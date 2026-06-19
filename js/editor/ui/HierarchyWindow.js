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
import {
    createBaseMateria, generateUniqueName, createPanelObject, createTextObject, createButtonObject,
    createTerrenoObject, createTerreno3DObject, createAudioObject, createVideoObject, createWaterObject,
    createLineColliderObject, createProgressBarObject, createCombatantObject, createScrollViewObject,
    createCubeObject, createSphereObject, createCapsule3DObject, createPlane3DObject, createTriangle3DObject,
    createDirectionalLight3D, createPointLight3D, createSpotLight3D,
    createDefaultCharacter,
    createTestCircuit,
    createMovementUITemplate, createMainMenuTemplate, createLevelManagerTemplate,
    createInventoryUITemplate
} from '../MateriaFactory.js';
import { broadcastUpdate } from '../CollaborationSystem.js';

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
let creationPosition = null; // Position where a new object should be created

// The main update function for this module, which is exported
export function updateHierarchy() {
    if (!dom.hierarchyContent || !SceneManager.currentScene) return;
    const L = window.Localization;

    const selectedMateria = getSelectedMateria();
    dom.hierarchyContent.innerHTML = '';
    const rootMaterias = SceneManager.currentScene.getRootMaterias();

    if (rootMaterias.length === 0) {
        dom.hierarchyContent.innerHTML = `<p class="empty-message" data-i18n="ESCENA_VACIA">${L.get('ESCENA_VACIA', 'La escena está vacía.<br>Click derecho para crear un objeto.')}</p>`;
        return;
    }

    const selectedId = selectedMateria ? selectedMateria.id : null;

    function renderNode(materia, container, depth, isInsidePrefab = false) {
        const item = document.createElement('div');
        item.className = 'hierarchy-item';

        const prefabStatus = isInsidePrefab || !!materia.prefabPath;

        if (!materia.isActive) {
            item.classList.add('disabled');
        }
        if (materia.prefabPath) {
            item.classList.add('prefab');
        } else if (isInsidePrefab) {
            item.classList.add('prefab-descendant');
        }

        // --- Accessory Detection & Color Highlight ---
        const nameLower = materia.name.toLowerCase();
        const isAccessory = nameLower.includes('ropa') ||
                           nameLower.includes('cloth') ||
                           nameLower.includes('acc') ||
                           nameLower.includes('capa') ||
                           nameLower.includes('hat') ||
                           materia.getComponentByName('ProceduralChain3D') ||
                           materia.getComponentByName('ClothRenderer3D');

        if (isAccessory) {
            item.classList.add('hierarchy-accessory');
            item.style.color = '#ffcc00'; // Golden highlight for accessories
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
                renderNode(child, container, depth + 1, prefabStatus);
            });
        }
    }

    rootMaterias.forEach(materia => renderNode(materia, dom.hierarchyContent, 0));
}

// --- Hierarchy Creation Functions ---
function createTilemapObject(parent = null) {
    const L = window.Localization;
    // Create the parent Grid object
    const gridMateria = createBaseMateria(generateUniqueName(L.get('GRID', 'Grid')), parent);
    gridMateria.addComponent(new Components.Grid(gridMateria));

    // Create the child Tilemap object
    const tilemapMateria = createBaseMateria(generateUniqueName(L.get('TILEMAP', 'Tilemap')), gridMateria); // Pass gridMateria as parent
    tilemapMateria.addComponent(new Components.Tilemap(tilemapMateria));
    tilemapMateria.addComponent(new Components.TilemapRenderer(tilemapMateria));

    // The function returns the parent Grid, which is what should be selected
    return gridMateria;
}

function createLightObject(name, lightComponent, parent = null) {
    const L = window.Localization;
    const newMateria = createBaseMateria(generateUniqueName(L.get(name.toUpperCase().replace(' ', '_'), name)), parent);
    newMateria.addComponent(new lightComponent(newMateria));
    return newMateria;
}

function createCameraObject(parent = null) {
    const L = window.Localization;
    const newMateria = createBaseMateria(generateUniqueName(L.get('CAMARA', 'Cámara')), parent);
    newMateria.addComponent(new Components.Camera(newMateria));
    return newMateria;
}

export function duplicateSelectedMateria() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;
    const L = window.Localization;

    const newMateria = selectedMateria.clone();
    newMateria.name = `${selectedMateria.name} (${L.get('CLON', 'Clon')})`;
    // Add to the same parent as the original, or to the root if it has no parent.
    if (selectedMateria.parent) {
        selectedMateria.parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }

    // Initialize and start if game is running
    if (window.isGameRunning || window.CE_Standalone_Scripts) {
        (async () => {
            for (const ley of newMateria.leyes) {
                if (ley instanceof Components.AnimatorController) {
                    await ley.initialize(window.projectsDirHandle);
                } else if (ley instanceof Components.CreativeScript) {
                    await ley.initializeInstance();
                }
                if (typeof ley.start === 'function') {
                    await ley.start();
                }
            }
        })();
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

export function setContextMateria(materia) {
    contextMateria = materia;
}

export function setCreationPosition(pos) {
    creationPosition = pos;
}

function applyCreationPosition(m) {
    if (!m || !creationPosition) return;
    const transform = m.getComponent(Components.Transform);
    const uiTransform = m.getComponent(Components.UITransform);
    if (transform) {
        transform.x = creationPosition.x;
        transform.y = creationPosition.y;
        if (creationPosition.z !== undefined) transform.z = creationPosition.z;
    } else if (uiTransform) {
        uiTransform.position.x = creationPosition.x;
        uiTransform.position.y = creationPosition.y;
    }
}

export async function handleContextMenuAction(action) {
    const selectedMateria = getSelectedMateria();
    const L = window.Localization;
    // For actions on existing items, we MUST use the materia that was under the cursor
    // when the context menu was opened. This prevents race conditions if selection changes.
    // The `contextMateria` is now a direct reference, set during the 'contextmenu' event.
    let newMateria = null;
    let shouldUpdate = false;

    const isCreationAction = !action.includes('rename') && !action.includes('delete') && !action.includes('duplicate');

    switch (action) {
        case 'create-empty':
            // Parenting uses the selected materia, which is intuitive.
            newMateria = createBaseMateria(generateUniqueName(L.get('MATERIA_VACIA', 'Materia Vacía')), selectedMateria);
            break;
        case 'create-audio':

            newMateria = createAudioObject(selectedMateria);
            break;
        case 'create-video':
            {

                let parentForNewVideo = selectedMateria;
                let parentCanvasMateria = null;

                if (parentForNewVideo) {
                    if (parentForNewVideo.getComponent(Components.Canvas)) {
                        parentCanvasMateria = parentForNewVideo;
                    } else if (parentForNewVideo.getComponent(Components.UITransform)) {
                        parentCanvasMateria = parentForNewVideo.findAncestorWithComponent(Components.Canvas);
                    } else {
                        parentForNewVideo = null;
                    }
                }

                // If we don't have a canvas, create a new one at the root.
                if (!parentCanvasMateria) {
                    parentCanvasMateria = createBaseMateria(generateUniqueName(L.get('CANVAS', 'Canvas')), null);
                    parentCanvasMateria.addComponent(new Components.Canvas(parentCanvasMateria));
                    parentForNewVideo = parentCanvasMateria;
                }

                newMateria = createBaseMateria(generateUniqueName(L.get('VIDEO', 'Video')), parentForNewVideo);
                newMateria.removeComponent(Components.Transform); // UI elements use UITransform
                newMateria.addComponent(new Components.UITransform(newMateria));
                newMateria.addComponent(new Components.VideoPlayer(newMateria));
            }
            break;
        case 'create-water':

            newMateria = createWaterObject(selectedMateria);
            break;
        case 'create-line-collider':

            newMateria = createLineColliderObject(selectedMateria);
            break;
        case 'create-combatant':

            newMateria = createCombatantObject(selectedMateria);
            break;
        case 'create-camera':
            newMateria = createCameraObject(selectedMateria);
            break;
        case 'create-humanoid-character':
            newMateria = await createDefaultCharacter(selectedMateria);
            break;
        case 'create-test-circuit':
            newMateria = await createTestCircuit(selectedMateria);
            break;
        case 'create-bone':

            newMateria = createBaseMateria(generateUniqueName(L.get('BONE', 'Hueso')), selectedMateria);
            newMateria.addComponent(new Components.Bone(newMateria));
            break;
        case 'create-skeleton':

            newMateria = createBaseMateria(generateUniqueName(L.get('SKELETON', 'Esqueleto')), selectedMateria);
            newMateria.addComponent(new Components.SkeletonRenderer(newMateria));
            break;
        case 'create-ik-manager':

            newMateria = createBaseMateria(generateUniqueName(L.get('IK_MANAGER', 'Gestor IK')), selectedMateria);
            newMateria.addComponent(new Components.IKManager2D(newMateria));
            break;
        case 'create-sprite':

            newMateria = createBaseMateria(generateUniqueName(L.get('SPRITE', 'Sprite')), selectedMateria);
            newMateria.addComponent(new Components.SpriteRenderer(newMateria));
            break;
        case 'create-rectangle':

            newMateria = createBaseMateria(generateUniqueName(L.get('RECTANGULO', 'Rectangle')), selectedMateria);
            newMateria.addComponent(new Components.TextureRender(newMateria));
            break;
        case 'create-circle':

            newMateria = createBaseMateria(generateUniqueName(L.get('CIRCULO', 'Circle')), selectedMateria);
            const textureRender = new Components.TextureRender(newMateria);
            textureRender.shape = 'Circle';
            newMateria.addComponent(textureRender);
            break;
        case 'create-triangle-2d':

            newMateria = createBaseMateria(generateUniqueName(L.get('TRIANGULO', 'Triangle')), selectedMateria);
            const textureRenderTri = new Components.TextureRender(newMateria);
            textureRenderTri.shape = 'Triangle';
            newMateria.addComponent(textureRenderTri);
            break;
        case 'create-capsule':

            newMateria = createBaseMateria(generateUniqueName(L.get('CAPSULA', 'Capsule')), selectedMateria);
            const textureRenderCapsule = new Components.TextureRender(newMateria);
            textureRenderCapsule.shape = 'Capsule';
            newMateria.addComponent(textureRenderCapsule);
            newMateria.addComponent(new Components.CapsuleCollider2D(newMateria));
            break;
        case 'create-tilemap':

            newMateria = createTilemapObject(selectedMateria);
            break;
        case 'create-terrain':

            console.log("[Hierarchy] Iniciando creación de terreno...");
            newMateria = createTerrenoObject(selectedMateria);
            break;
        case 'create-terrain-3d':
            newMateria = await createTerreno3DObject(selectedMateria);
            break;
        case 'create-parallax':

            newMateria = createBaseMateria(generateUniqueName(L.get('PARALLAX', 'Parallax')), selectedMateria);
            newMateria.addComponent(new Components.SpriteRenderer(newMateria));
            newMateria.addComponent(new Components.DrawingOrder(newMateria));
            const p = new Components.Parallax(newMateria);
            p.scrollFactor = { x: 0.5, y: 0.5 };
            newMateria.addComponent(p);
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
        case 'create-canvas':

            newMateria = createBaseMateria(generateUniqueName(L.get('CANVAS', 'Canvas')), selectedMateria);
            newMateria.addComponent(new Components.Canvas(newMateria));
            break;
        case 'create-ui-image':
            {


                let parentForNewImage = selectedMateria; // The item we right-clicked on
                let parentCanvasMateria = null;

                if (parentForNewImage) {
                    // Is the selected item a canvas itself?
                    if (parentForNewImage.getComponent(Components.Canvas)) {
                        parentCanvasMateria = parentForNewImage;
                    }
                    // Is it a UI element inside a canvas?
                    else if (parentForNewImage.getComponent(Components.UITransform)) {
                        parentCanvasMateria = parentForNewImage.findAncestorWithComponent(Components.Canvas);
                    }
                    // If it's a regular Materia, we don't want to child the UI element to it.
                    else {
                        parentForNewImage = null;
                    }
                }

                // If after all that we don't have a canvas, create a new one at the root.
                if (!parentCanvasMateria) {
                    parentCanvasMateria = createBaseMateria(generateUniqueName(L.get('CANVAS', 'Canvas')), null);
                    parentCanvasMateria.addComponent(new Components.Canvas(parentCanvasMateria));
                    // The new UI element should be a child of this new canvas, not what was previously selected.
                    parentForNewImage = parentCanvasMateria;
                }

                // If we started with no selection, parentForNewImage is null. Let's parent to the canvas.
                if (!parentForNewImage) {
                    parentForNewImage = parentCanvasMateria;
                }


                newMateria = createBaseMateria(generateUniqueName(L.get('IMAGE', 'Imagen')), parentForNewImage);
                newMateria.removeComponent(Components.Transform); // UI elements use UITransform
                newMateria.addComponent(new Components.UITransform(newMateria));
                newMateria.addComponent(new Components.UIImage(newMateria));
            }
            break;
        case 'create-ui-panel':
            {

                let parentCanvas = selectedMateria;
                if (parentCanvas && !parentCanvas.getComponent(Components.Canvas)) {
                    parentCanvas = parentCanvas.findAncestorWithComponent(Components.Canvas);
                }
                if (!parentCanvas) {
                    parentCanvas = createBaseMateria(generateUniqueName(L.get('CANVAS', 'Canvas')), null);
                    parentCanvas.addComponent(new Components.Canvas(parentCanvas));
                }
                newMateria = createPanelObject(parentCanvas);
            }
            break;
        case 'create-ui-text':
            {

                let parentCanvas = selectedMateria;
                if (parentCanvas && !parentCanvas.getComponent(Components.Canvas)) {
                    parentCanvas = parentCanvas.findAncestorWithComponent(Components.Canvas);
                }
                if (!parentCanvas) {
                    parentCanvas = createBaseMateria(generateUniqueName(L.get('CANVAS', 'Canvas')), null);
                    parentCanvas.addComponent(new Components.Canvas(parentCanvas));
                }
                newMateria = createTextObject(parentCanvas);
            }
            break;
        case 'create-ui-button':
            {

                let parentCanvas = selectedMateria;
                if (parentCanvas && !parentCanvas.getComponent(Components.Canvas)) {
                    parentCanvas = parentCanvas.findAncestorWithComponent(Components.Canvas);
                }
                if (!parentCanvas) {
                    parentCanvas = createBaseMateria(generateUniqueName(L.get('CANVAS', 'Canvas')), null);
                    parentCanvas.addComponent(new Components.Canvas(parentCanvas));
                }
                newMateria = createButtonObject(parentCanvas);
            }
            break;
        case 'create-ui-progress-bar':
            {

                let parentCanvas = selectedMateria;
                if (parentCanvas && !parentCanvas.getComponent(Components.Canvas)) {
                    parentCanvas = parentCanvas.findAncestorWithComponent(Components.Canvas);
                }
                if (!parentCanvas) {
                    parentCanvas = createBaseMateria(generateUniqueName(L.get('CANVAS', 'Canvas')), null);
                    parentCanvas.addComponent(new Components.Canvas(parentCanvas));
                }
                newMateria = createProgressBarObject(parentCanvas);
            }
            break;
        case 'create-ui-scroll-view':
            {

                let parentCanvas = selectedMateria;
                if (parentCanvas && !parentCanvas.getComponent(Components.Canvas)) {
                    parentCanvas = parentCanvas.findAncestorWithComponent(Components.Canvas);
                }
                if (!parentCanvas) {
                    parentCanvas = createBaseMateria(generateUniqueName(L.get('CANVAS', 'Canvas')), null);
                    parentCanvas.addComponent(new Components.Canvas(parentCanvas));
                }
                newMateria = createScrollViewObject(parentCanvas);
            }
            break;
        // --- 3D Creation Actions ---
        case 'create-cube':
            newMateria = await createCubeObject(selectedMateria);
            break;
        case 'create-sphere':
            newMateria = await createSphereObject(selectedMateria);
            break;
        case 'create-capsule-3d':
            newMateria = await createCapsule3DObject(selectedMateria);
            break;
        case 'create-plane-3d':
            newMateria = await createPlane3DObject(selectedMateria);
            break;
        case 'create-triangle-3d':
            newMateria = await createTriangle3DObject(selectedMateria);
            break;
        case 'create-dir-light-3d':
            newMateria = await createDirectionalLight3D(selectedMateria);
            break;
        case 'create-point-light-3d':
            newMateria = await createPointLight3D(selectedMateria);
            break;
        case 'create-spot-light-3d':
            newMateria = await createSpotLight3D(selectedMateria);
            break;
        case 'import-model-3d':
            {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.glb,.gltf,.obj';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const currentDirHandle = getCurrentDirectoryHandle();
                    if (!currentDirHandle) {
                        alert(L.get('SELECCIONAR_CARPETA_IMPORTAR') || "Selecciona primero una carpeta en el navegador de assets.");
                        return;
                    }

                    const targetFileHandle = await currentDirHandle.getFileHandle(file.name, { create: true });
                    const writable = await targetFileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();

                    const assetPath = (getCurrentDirectoryPath() || 'Assets') + '/' + file.name;
                    await updateAssetBrowser();

                    const { createSkinnedMeshObject } = await import('../MateriaFactory.js');
                    const m = await createSkinnedMeshObject(assetPath, selectedMateria);
                    if (m) {
                        applyCreationPosition(m);
                        updateHierarchy();
                        selectMateriaCallback(m.id);
                    }
                };
                input.click();
            }
            return;

        // --- Templates ---
        case 'template-ui-movement':
            newMateria = createMovementUITemplate();
            break;
        case 'template-main-menu':
            newMateria = createMainMenuTemplate();
            break;
        case 'template-level-manager':
            newMateria = createLevelManagerTemplate();
            break;
        case 'template-inventory':
            newMateria = createInventoryUITemplate();
            break;

        case 'create-ui-health-bar':
            {

                let parentCanvas = selectedMateria;
                if (parentCanvas && !parentCanvas.getComponent(Components.Canvas)) {
                    parentCanvas = parentCanvas.findAncestorWithComponent(Components.Canvas);
                }
                if (!parentCanvas) {
                    parentCanvas = createBaseMateria(generateUniqueName(L.get('CANVAS', 'Canvas')), null);
                    parentCanvas.addComponent(new Components.Canvas(parentCanvas));
                }

                (async () => {
                    const prefab = await SceneManager.instantiatePrefabFromPath('Assets/HealthBar.ceprefab');
                    if (prefab) {
                        prefab.setParent(parentCanvas, true);
                        applyCreationPosition(prefab);
                        updateHierarchy();
                        selectMateriaCallback(prefab.id);
                    }
                })();
                return; // Logic handled inside async block
            }
            break;

        case 'rename':
            if (contextMateria) { // Use contextMateria
                const newName = prompt(`${L.get('RENOMBRAR')} '${contextMateria.name}':`, contextMateria.name);
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

                broadcastUpdate({ op: 'DELETE', id: idToDelete });

                SceneManager.currentScene.removeMateria(idToDelete);
                updateHierarchy();
                updateInspector();
            }
            break;
        case 'duplicate':
            if (contextMateria) { // Use contextMateria
                const newDuplicatedMateria = contextMateria.clone();
                newDuplicatedMateria.name = `${contextMateria.name} (${L.get('CLON', 'Clon')})`;
                if (contextMateria.parent) {
                    contextMateria.parent.addChild(newDuplicatedMateria);
                } else {
                    SceneManager.currentScene.addMateria(newDuplicatedMateria);
                }

                // Initialize and start if game is running
                if (window.isGameRunning || window.CE_Standalone_Scripts) {
                    (async () => {
                        for (const ley of newDuplicatedMateria.leyes) {
                            if (ley instanceof Components.AnimatorController) {
                                await ley.initialize(window.projectsDirHandle);
                            } else if (ley instanceof Components.CreativeScript) {
                                await ley.initializeInstance();
                            }
                            if (typeof ley.start === 'function') {
                                await ley.start();
                            }
                        }
                    })();
                }

                // Set as the newMateria so it gets selected after creation
                newMateria = newDuplicatedMateria;
            }
            break;
    }

    // Centralized update for creation and rename actions
    if (newMateria) {
        // Apply creation position if available
        if (isCreationAction) {
            applyCreationPosition(newMateria);
        }

        // Broadcast creation
        broadcastUpdate({
            op: 'CREATE',
            data: SceneManager.serializeMateria(newMateria, true)
        });

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
            // Use 'copyMove' to be more explicit and compatible with 'copy' dropEffect
            e.dataTransfer.effectAllowed = 'copyMove';
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
            if (data.name.endsWith('.ceprefab')) {
                const newMateria = await SceneManager.instantiatePrefabFromPath(data.path);
                if (newMateria) {
                    if (targetItem) {
                        const targetId = parseInt(targetItem.dataset.id, 10);
                        const targetMateria = SceneManager.currentScene.findMateriaById(targetId);
                        if (targetMateria) newMateria.setParent(targetMateria, true);
                    }
                    updateHierarchy();
                    selectMateriaCallback(newMateria.id);
                }
                return;
            }

            const newMateria = new Materia(data.name.split('.')[0]);
            newMateria.addComponent(new Components.Transform(newMateria));
            if (targetItem) {
                const targetId = parseInt(targetItem.dataset.id, 10);
                const targetMateria = SceneManager.currentScene.findMateriaById(targetId);
                if (targetMateria) newMateria.setParent(targetMateria, true);
            } else {
                SceneManager.currentScene.addMateria(newMateria);
            }
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
            const draggedId = (typeof data === 'object' && data !== null) ? parseInt(data.id, 10) : parseInt(data, 10);
            if (isNaN(draggedId)) return;

            const draggedMateria = SceneManager.currentScene.findMateriaById(draggedId);
            if (!draggedMateria) return;

            if (targetItem) {
                // Parenting logic
                const targetId = parseInt(targetItem.dataset.id, 10);
                if (draggedId !== targetId) {
                    const targetMateria = SceneManager.currentScene.findMateriaById(targetId);
                    if (targetMateria && !draggedMateria.isAncestorOf(targetMateria)) {
                        draggedMateria.setParent(targetMateria, true);
                        updateHierarchy();
                    }
                }
            } else {
                // Un-parenting logic
                if (draggedMateria.parent) {
                    draggedMateria.setParent(null, true);
                    updateHierarchy();
                }
            }
        }
    });

    // --- Context Menu ---
    hierarchyContent.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const item = e.target.closest('.hierarchy-item');

        // If clicking in hierarchy, clear the scene creation position
        creationPosition = null;

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

        // Enable/Disable options based on Project Type
        const projectType = window.currentProjectConfig?.projectType || '2d';
        const is3DProject = projectType === '3d';

        const updateDisabledState = (el, disabled) => {
            el.classList.toggle('disabled', disabled);
            el.style.display = 'block';
            // Recursively update children to ensure full grey-out and interaction prevention
            const children = el.querySelectorAll('li, span, ul');
            children.forEach(child => {
                child.classList.toggle('disabled', disabled);
            });
        };

        menu.querySelectorAll('.only-3d').forEach(el => {
            updateDisabledState(el, !is3DProject);
        });

        menu.querySelectorAll('.only-2d').forEach(el => {
            updateDisabledState(el, is3DProject);
        });

        showContextMenuCallback(menu, e);
    });

    // --- Menu click listener is now centralized in editor.js ---
}
