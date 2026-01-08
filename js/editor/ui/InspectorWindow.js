import * as Components from '../../engine/Components.js';
import * as UITransformUtils from '../../engine/UITransformUtils.js';
import { getURLForAssetPath } from '../../engine/AssetUtils.js';
import * as SpriteSlicer from './SpriteSlicerWindow.js';
import { getCustomComponentDefinitions } from '../EngineAPIExtension.js';
import * as CES_Transpiler from '../../editor/CES_Transpiler.js';
import { showPrompt, showNotification } from './DialogWindow.js';

// --- Module State ---
let dom;
let projectsDirHandle;
let currentDirectoryHandle;
let getSelectedMateria;
let getSelectedAsset;
let openSpriteSelectorCallback;
let saveAssetMetaCallback;
let extractFramesFromSheetCallback;
let updateSceneCallback;
let updateAssetBrowserCallback;
let createAssetCallback;
let isScanningForComponents = false;
let getCurrentProjectConfig = () => ({}); // To access layers
let enterAddTilemapLayerMode = () => {}; // Callback to notify SceneView

const markdownConverter = new showdown.Converter();

const availableComponents = {
    'Renderizado': [Components.SpriteRenderer, Components.TextureRender],
    'Tilemap': [Components.Grid, Components.Tilemap, Components.TilemapRenderer],
    'Iluminación': [Components.PointLight2D, Components.SpotLight2D, Components.FreeformLight2D, Components.SpriteLight2D],
    'Animación': [Components.Animator, Components.AnimatorController],
    'Cámara': [Components.Camera],
    'Físicas': [Components.Rigidbody2D, Components.BoxCollider2D, Components.CapsuleCollider2D, Components.TilemapCollider2D],
    'UI': [Components.UITransform, Components.UIImage, Components.UIText, Components.Canvas, Components.Button],
    'Scripting': [Components.CreativeScript]
};

// --- Initialization ---
export function initialize(dependencies) {
    dom = dependencies.dom;
    dom.cullingMaskDropdown = document.getElementById('culling-mask-dropdown');
    projectsDirHandle = dependencies.projectsDirHandle;
    currentDirectoryHandle = dependencies.currentDirectoryHandle;
    getSelectedMateria = dependencies.getSelectedMateria;
    getSelectedAsset = dependencies.getSelectedAsset;
    openSpriteSelectorCallback = dependencies.openSpriteSelectorCallback;
    saveAssetMetaCallback = dependencies.saveAssetMetaCallback;
    extractFramesFromSheetCallback = dependencies.extractFramesFromSheetCallback;
    updateSceneCallback = dependencies.updateSceneCallback;
    updateAssetBrowserCallback = dependencies.updateAssetBrowserCallback;
    createAssetCallback = dependencies.createAssetCallback;
    getCurrentProjectConfig = dependencies.getCurrentProjectConfig;
    enterAddTilemapLayerMode = dependencies.enterAddTilemapLayerMode;

    // The inspector is mostly updated by other modules, but we can set up a general event listener for inputs.
    dom.inspectorContent.addEventListener('input', handleInspectorInput);
    dom.inspectorContent.addEventListener('change', (e) => {
        if (e.target.matches('.prop-input')) {
            handleInspectorInput(e); // Route checkbox/select changes to the main handler
        } else {
            handleInspectorChange(e); // Handle other specific changes (toggles, etc.)
        }
    });
    dom.inspectorContent.addEventListener('click', handleInspectorClick);

    // Add drag and drop listeners for Materia assignment
    dom.inspectorContent.addEventListener('dragover', (e) => {
        if (e.target.closest('.materia-dropper')) {
            e.preventDefault();
            e.target.closest('.materia-dropper').classList.add('drag-over');
        }
    });
    dom.inspectorContent.addEventListener('dragleave', (e) => {
        if (e.target.closest('.materia-dropper')) {
            e.target.closest('.materia-dropper').classList.remove('drag-over');
        }
    });
    dom.inspectorContent.addEventListener('drop', handleInspectorDrop);
}

// --- Event Handlers ---

function handleInspectorDrop(e) {
    const dropper = e.target.closest('.materia-dropper');
    if (!dropper) return;

    e.preventDefault();
    dropper.classList.remove('drag-over');

    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    let data;
    try {
        data = JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch {
        return; // Not valid JSON
    }

    if (data.type === 'Materia') {
        const droppedMateriaId = parseInt(data.id, 10);

        const scriptName = dropper.dataset.scriptName;
        const propName = dropper.dataset.prop;

        const script = selectedMateria.getComponents(Components.CreativeScript).find(s => s.scriptName === scriptName);
        if (script) {
            script.publicVars[propName] = droppedMateriaId;
        } else {
            // Handle onClick event materia drop
            const button = selectedMateria.getComponent(Components.Button);
            if (button && propName.startsWith('onClick')) {
                const parts = propName.split('.');
                const index = parseInt(parts[1], 10);
                if (!isNaN(index) && button.onClick[index]) {
                    button.onClick[index].targetMateriaId = droppedMateriaId;
                }
            }
        }

        updateInspector(); // Re-render to show the new name
    }
}


function handleInspectorInput(e) {
    if (!e.target.matches('.prop-input')) return;

    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const componentName = e.target.dataset.component;
    const propPath = e.target.dataset.prop;
    let value;
    if (e.target.type === 'checkbox') {
        value = e.target.checked;
    } else {
        value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    }

    if (componentName === 'CreativeScript') {
        const scriptName = e.target.dataset.scriptName;
        const script = selectedMateria.getComponents(Components.CreativeScript).find(s => s.scriptName === scriptName);
        if (script) {
            script.publicVars[propPath] = value;
        }
        return;
    }

    if (componentName === 'CustomComponent') {
        const componentId = e.target.dataset.componentId; // Unique identifier if multiple custom components
        const component = selectedMateria.leyes.find(ley => ley instanceof Components.CustomComponent && ley.id == componentId);
        if (component) {
            component.publicVars[propPath] = value;
        }
        return;
    }

    const ComponentClass = Components[componentName];
    if (!ComponentClass) return;

    const component = selectedMateria.getComponent(ComponentClass);
    if (!component) return;

    if (propPath === 'simplifiedSize') {
        component.cellSize.x = value;
        component.cellSize.y = value;
        return; // Early return to avoid nested property logic
    }

    // Handle nested properties like scale.x
    const props = propPath.split('.');
    let current = component;
    for (let i = 0; i < props.length - 1; i++) {
        current = current[props[i]];
    }
    current[props[props.length - 1]] = value;
}

async function handleInspectorChange(e) {
    const selectedMateria = getSelectedMateria();
    const selectedAsset = getSelectedAsset();

    // --- Asset Inspector Logic ---
    if (selectedAsset) {
        if (e.target.matches('#texture-type')) {
            const selectedType = e.target.value;
            const isSprite = selectedType === 'Sprite (2D and UI)';
            const isAnimSheet = selectedType === 'Animation Sheet';
            const isTexture = selectedType === 'Texture';

            const spriteSettings = dom.inspectorContent.querySelector('#sprite-settings-container');
            const animSettings = dom.inspectorContent.querySelector('#animation-sheet-settings-container');

            if (spriteSettings) spriteSettings.classList.toggle('hidden', !isSprite);
            if (animSettings) animSettings.classList.toggle('hidden', !isAnimSheet);

            // Textures reuse some of the advanced settings, so we don't hide the whole container,
            // but we ensure specific parts are correctly shown/hidden.
            if (isTexture) {
                if (spriteSettings) spriteSettings.classList.remove('hidden');
            }

            return;
        }
        if (e.target.matches('#sprite-mode')) {
            const showButton = e.target.value === 'Multiple';
            const btnContainer = dom.inspectorContent.querySelector('#sprite-editor-btn-container');
            if (btnContainer) btnContainer.classList.toggle('hidden', !showButton);
            return;
        }
    }

    // --- Materia Inspector Logic ---
    if (!selectedMateria) return;

    let needsUpdate = false;

    if (e.target.matches('#grid-simplified-toggle')) {
        const grid = selectedMateria.getComponent(Components.Grid);
        if (grid) {
            grid.isSimplified = e.target.checked;
            needsUpdate = true;
        }
    } else if (e.target.matches('#tilemap-manual-size-toggle')) {
        const tilemap = selectedMateria.getComponent(Components.Tilemap);
        if (tilemap) {
            tilemap.manualSize = e.target.checked;
            needsUpdate = true;
        }
    } else if (e.target.matches('#materia-active-toggle')) {
        selectedMateria.isActive = e.target.checked;
        updateSceneCallback(); // This triggers a visual update in the scene/hierarchy
        needsUpdate = true;
    } else if (e.target.matches('#materia-name-input')) {
         selectedMateria.name = e.target.value;
         updateSceneCallback();
         needsUpdate = true;
    } else if (e.target.matches('#materia-layer-select')) {
        const selectedValue = e.target.value;
        if (selectedValue === 'edit_layers') {
            // Open the project settings modal
            if (dom.projectSettingsModal) {
                dom.projectSettingsModal.classList.add('is-open');
            }
            // Revert selection in dropdown
            e.target.value = selectedMateria.layer;
        } else {
            selectedMateria.layer = parseInt(selectedValue, 10);
        }
        needsUpdate = true;
    } else if (e.target.matches('#materia-tag-select')) {
        const selectedValue = e.target.value;
        if (selectedValue === 'add_new_tag') {
            showPrompt("Nuevo Tag", "Introduce el nombre para el nuevo tag:", async (newTagName) => {
                if (newTagName && newTagName.trim() !== '') {
                    const config = getCurrentProjectConfig();
                    if (!config.tags.includes(newTagName)) {
                        config.tags.push(newTagName);
                        await saveProjectConfig();
                        selectedMateria.tag = newTagName;
                        showNotification('Éxito', `Tag "${newTagName}" añadido y seleccionado.`);
                        updateInspector();
                    } else {
                        showNotification('Aviso', `El tag "${newTagName}" ya existe.`);
                        // Revert selection in dropdown
                        e.target.value = selectedMateria.tag;
                    }
                } else {
                    // User cancelled or entered empty string, revert selection
                    e.target.value = selectedMateria.tag;
                }
            });
        } else {
            selectedMateria.tag = selectedValue;
        }
        needsUpdate = true; // This will be handled by the async prompt callback
    }

    if (e.target.matches('.inspector-re-render')) {
        const componentName = e.target.dataset.component;
        const propPath = e.target.dataset.prop;
        const value = e.target.value;

        const ComponentClass = Components[componentName];
        if (ComponentClass) {
            const component = selectedMateria.getComponent(ComponentClass);
            if (component) {
                // This logic is simple, assuming no nested properties for re-render items
                component[propPath] = value;
                needsUpdate = true;
            }
        }
    }

    if (needsUpdate) {
        // Use a slight delay to allow the value to update before re-rendering
        setTimeout(updateInspector, 0);
    }
}

function handleInspectorClick(e) {
    const selectedMateria = getSelectedMateria();

    if (e.target.closest('[data-component="UIText"][data-prop="fontAssetPath"]')) {
        const component = selectedMateria.getComponent(Components.UIText);
        if (component) {
            openSpriteSelectorCallback(async (fileHandle, fullPath) => {
                component.fontAssetPath = fullPath;
                await component.loadFont(projectsDirHandle);
                updateInspector();
                updateSceneCallback();
            }, {
                filter: ['.ttf', '.otf', '.woff', '.woff2'],
                title: 'Seleccionar Fuente'
            });
        }
        return; // Stop further processing for this click
    }

    // --- Drag and Drop for Asset Fields ---
    if (e.target.matches('.asset-dropper, .asset-dropper *')) {
        const dropper = e.target.closest('.asset-dropper');

        dropper.ondragover = (ev) => {
            ev.preventDefault();
            dropper.classList.add('drag-over');
        };
        dropper.ondragleave = () => {
            dropper.classList.remove('drag-over');
        };
        dropper.ondrop = async (ev) => {
            ev.preventDefault();
            dropper.classList.remove('drag-over');
            const data = JSON.parse(ev.dataTransfer.getData('text/plain'));
            const expectedTypes = dropper.dataset.assetType.split(',');
            const fileExtension = `.${data.name.split('.').pop()}`;

            if (expectedTypes.includes(fileExtension)) {
                if (selectedMateria) {
                    const componentName = dropper.dataset.component;
                    const component = selectedMateria.getComponent(Components[componentName]);
                    if (component) {
                        // Special handling for SpriteRenderer
                        if (component instanceof Components.SpriteRenderer) {
                            await component.setSourcePath(data.path, projectsDirHandle);
                        } else {
                            const propName = dropper.dataset.prop;
                            component[propName] = data.path;
                        }

                        // If it's a tilemap, trigger the palette reload
                        if (component instanceof Components.Tilemap) {
                            const renderer = selectedMateria.getComponent(Components.TilemapRenderer);
                            if (renderer) {
                                await renderer.loadPalette(projectsDirHandle);
                            }
                        }

                        updateInspector();
                        updateSceneCallback();
                    }
                }
            } else {
                window.Dialogs.showNotification('Asset Incorrecto', `Se esperaba un archivo de tipo ${expectedTypes.join(', ')}.`);
            }
        };
    }


    if (e.target.matches('#add-component-btn')) {
        showAddComponentModal();
    }

    if (e.target.matches('.sprite-select-btn')) {
        const componentName = e.target.dataset.component;
        if (componentName && openSpriteSelectorCallback) {
            openSpriteSelectorCallback(componentName);
        }
    }

    if (e.target.matches('#culling-mask-btn')) {
        const camera = selectedMateria.getComponent(Components.Camera);
        if (camera) {
            showCullingMaskDropdown(camera, e.target);
        }
    }

    // --- Tilemap Layer Management ---
    if (e.target.matches('[data-action="add-layer"]')) {
        const tilemap = selectedMateria.getComponent(Components.Tilemap);
        if (tilemap) {
            tilemap.addLayer();
            updateInspector();
        }
    }

    if (e.target.matches('[data-action="remove-layer"]')) {
        const tilemap = selectedMateria.getComponent(Components.Tilemap);
        if (tilemap) {
            if (tilemap.layers.length > 1) {
                tilemap.removeLayer(tilemap.activeLayerIndex);
                updateInspector();
            } else {
                window.Dialogs.showNotification('Acción no permitida', 'No se puede eliminar la última capa.');
            }
        }
    }

    if (e.target.matches('[data-action="select-layer"]')) {
        const tilemap = selectedMateria.getComponent(Components.Tilemap);
        const index = parseInt(e.target.dataset.index, 10);
        if (tilemap && !isNaN(index)) {
            tilemap.activeLayerIndex = index;
            updateInspector();
        }
    }

    if (e.target.matches('[data-action="generate-colliders"]')) {
        const collider = selectedMateria.getComponent(Components.TilemapCollider2D);
        if (collider) {
            collider.generate();
            updateInspector(); // Refresh to show new collider count and for visualizer
        }
    }

    if (e.target.matches('.anchor-grid-button')) {
        const preset = e.target.dataset.preset;
        const uiTransform = selectedMateria.getComponent(Components.UITransform);
        if (uiTransform) {
            uiTransform.anchorPreset = preset;
            uiTransform.pivot = UITransformUtils.getPivotForAnchorPreset(preset);
            updateInspector();
        }
    }

    if (e.target.matches('[data-action="add-layer"]')) {
        const tilemap = selectedMateria.getComponent(Components.Tilemap);
        if (tilemap) {
            enterAddTilemapLayerMode();
        }
    }

    if (e.target.matches('[data-action="remove-layer"]')) {
        const tilemap = selectedMateria.getComponent(Components.Tilemap);
        if (tilemap) {
            if (tilemap.layers.length > 1) {
                tilemap.removeLayer(tilemap.activeLayerIndex);
                updateInspector();
            } else {
                window.Dialogs.showNotification('Acción no permitida', 'No se puede eliminar la última capa.');
            }
        }
    }

    if (e.target.matches('[data-action="select-layer"]')) {
        const tilemap = selectedMateria.getComponent(Components.Tilemap);
        const index = parseInt(e.target.dataset.index, 10);
        if (tilemap && !isNaN(index)) {
            tilemap.activeLayerIndex = index;
            updateInspector();
        }
    }

    if (e.target.matches('[data-action="add-onclick-event"]')) {
        const button = selectedMateria.getComponent(Components.Button);
        if (button) {
            button.onClick.push({
                targetMateriaId: null,
                scriptName: '',
                functionName: ''
            });
            updateInspector();
        }
    }

    if (e.target.matches('[data-action="remove-onclick-event"]')) {
        const button = selectedMateria.getComponent(Components.Button);
        const index = parseInt(e.target.dataset.index, 10);
        if (button && !isNaN(index)) {
            button.onClick.splice(index, 1);
            updateInspector();
        }
    }
}

function getCullingMaskText(mask) {
    if (mask === -1) return 'Everything';
    if (mask === 0) return 'Nothing';

    const config = getCurrentProjectConfig();
    const layers = config.layers.sortingLayers;
    const selectedLayers = [];
    layers.forEach((name, index) => {
        if ((mask & (1 << index)) !== 0) {
            selectedLayers.push(name);
        }
    });

    if (selectedLayers.length <= 3) {
        return selectedLayers.join(', ');
    } else {
        return 'Mixed...';
    }
}

function showCullingMaskDropdown(camera, button) {
    const dropdown = dom.cullingMaskDropdown;
    dropdown.innerHTML = ''; // Clear previous content

    const config = getCurrentProjectConfig();
    const layers = config.layers.sortingLayers;

    const createCheckbox = (name, index, isChecked) => {
        const item = document.createElement('div');
        item.className = 'culling-mask-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isChecked;
        checkbox.id = `layer-checkbox-${index}`;
        checkbox.dataset.layerIndex = index;

        const label = document.createElement('label');
        label.htmlFor = `layer-checkbox-${index}`;
        label.textContent = name;

        item.appendChild(checkbox);
        item.appendChild(label);

        checkbox.addEventListener('change', () => {
            const layerBit = 1 << index;
            if (checkbox.checked) {
                camera.cullingMask |= layerBit; // Add layer
            } else {
                camera.cullingMask &= ~layerBit; // Remove layer
            }
            updateInspector(); // Re-render inspector to show updated mask value (optional)
        });
        return item;
    };

    // Add "Everything" and "Nothing" options
    const everythingItem = document.createElement('div');
    everythingItem.className = 'culling-mask-item separator';
    everythingItem.textContent = 'Everything';
    everythingItem.onclick = () => { camera.cullingMask = -1; updateInspector(); };
    dropdown.appendChild(everythingItem);

    const nothingItem = document.createElement('div');
    nothingItem.className = 'culling-mask-item';
    nothingItem.textContent = 'Nothing';
    nothingItem.onclick = () => { camera.cullingMask = 0; updateInspector(); };
    dropdown.appendChild(nothingItem);


    layers.forEach((name, index) => {
        if (!name) return;
        const isChecked = (camera.cullingMask & (1 << index)) !== 0;
        dropdown.appendChild(createCheckbox(name, index, isChecked));
    });

    const rect = button.getBoundingClientRect();
    dropdown.style.display = 'block';
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom}px`;
}


// --- Core Functions ---
export async function updateInspector() {
    if (!dom.inspectorContent) return;
    dom.inspectorContent.innerHTML = '';

    const selectedMateria = getSelectedMateria();
    const selectedAsset = getSelectedAsset();

    if (selectedMateria) {
        await updateInspectorForMateria(selectedMateria);
    } else if (selectedAsset) {
        await updateInspectorForAsset(selectedAsset.name, selectedAsset.path);
    } else {
        dom.inspectorContent.innerHTML = '<p class="inspector-placeholder">Nada seleccionado</p>';
    }
}

function renderPublicVarInput(variable, currentValue, componentType, identifier) {
    let commonAttrs = `class="prop-input" data-prop="${variable.name}"`;
    if (componentType === 'CreativeScript') {
        commonAttrs += ` data-component="CreativeScript" data-script-name="${identifier}"`;
    } else if (componentType === 'CustomComponent') {
        commonAttrs += ` data-component="CustomComponent" data-component-id="${identifier}"`;
    }

    switch (variable.type) {
        case 'number':
        case 'numero':
            return `<input type="number" ${commonAttrs} value="${currentValue}">`;
        case 'string':
        case 'texto':
            return `<input type="text" ${commonAttrs} value="${currentValue}">`;
        case 'boolean':
        case 'booleano':
            return `<input type="checkbox" ${commonAttrs} ${currentValue ? 'checked' : ''}>`;
        case 'Materia':
            {
                let displayName = 'None (Materia)';
                if (typeof currentValue === 'number') {
                    // We need access to the SceneManager here. Let's assume it's available globally for now.
                    // This is not ideal, but it's a quick solution for the UI.
                    const SceneManager = window.SceneManager; // A bit of a hack, but necessary here.
                    const materia = SceneManager.currentScene.findMateriaById(currentValue);
                    if (materia) {
                        displayName = materia.name;
                    }
                }
                return `<div class="materia-dropper" ${commonAttrs} data-asset-type="Materia">${displayName}</div>`;
            }
        default:
            // Para 'any' o tipos desconocidos, usar un campo de texto
            return `<input type="text" ${commonAttrs} value="${currentValue}">`;
    }
}


async function updateInspectorForMateria(selectedMateria) {
    const config = getCurrentProjectConfig();

    // Name input and active toggle
    dom.inspectorContent.innerHTML = `
        <div class="inspector-materia-header">
            <input type="checkbox" id="materia-active-toggle" title="Activar/Desactivar Materia" ${selectedMateria.isActive ? 'checked' : ''}>
            <input type="text" id="materia-name-input" value="${selectedMateria.name}">
        </div>
        <div class="tag-layer-container">
            <div class="inspector-row">
                <label for="materia-tag-select">Tag</label>
                <select id="materia-tag-select"></select>
            </div>
            <div class="inspector-row">
                <label for="materia-layer-select">Layer</label>
                <select id="materia-layer-select"></select>
            </div>
        </div>
    `;

    // Populate Tags Dropdown
    const tagSelect = dom.inspectorContent.querySelector('#materia-tag-select');
    if (tagSelect && config.tags) {
        config.tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            if (selectedMateria.tag === tag) {
                option.selected = true;
            }
            tagSelect.appendChild(option);
        });
        // Add a separator and the "Add Tag..." option
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '──────────';
        tagSelect.appendChild(separator);
        const addTagOption = document.createElement('option');
        addTagOption.value = 'add_new_tag';
        addTagOption.textContent = 'Añadir Tag...';
        tagSelect.appendChild(addTagOption);
    }

    // Populate Layers Dropdown
    const layerSelect = dom.inspectorContent.querySelector('#materia-layer-select');
    if (layerSelect && config.layers && config.layers.sortingLayers) {
        config.layers.sortingLayers.forEach((layerName, index) => {
            if (!layerName) return; // Skip empty layer names
            const option = document.createElement('option');
            option.value = index; // The value is the layer's index
            option.textContent = `${index}: ${layerName}`;
            if (selectedMateria.layer === index) {
                option.selected = true;
            }
            layerSelect.appendChild(option);
        });
        // Add a separator and the "Edit Layers..." option
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '──────────';
        layerSelect.appendChild(separator);
        const addLayerOption = document.createElement('option');
        addLayerOption.value = 'edit_layers';
        addLayerOption.textContent = 'Editar Layers...';
        layerSelect.appendChild(addLayerOption);
    }

    const componentIcons = {
        Transform: '✥', Rigidbody2D: '🏋️', BoxCollider2D: '🟩', CapsuleCollider2D: '💊', SpriteRenderer: '🖼️',
        Animator: '🏃', AnimatorController: '🕹️', Camera: '📷', CreativeScript: '📜',
        UITransform: '⎚', UICanvas: '🖼️', UIImage: '🏞️', PointLight2D: '💡', SpotLight2D: '🔦', FreeformLight2D: '✏️', SpriteLight2D: '🎇',
        Grid: '▦'
    };

    const componentsWrapper = document.createElement('div');
    componentsWrapper.className = 'inspector-components-wrapper';
    console.log('2. Created componentsWrapper. Looping through components...');

    selectedMateria.leyes.forEach((ley, index) => {
        console.log(`[DEBUG] Inspector: Intentando renderizar componente #${index}: ${ley.constructor.name}`);
        let componentHTML = '';
        const componentName = ley.constructor.name;
        const icon = componentIcons[componentName] || '⚙️';
        const iconHTML = `<span class="component-icon">${icon}</span>`;

        if (ley instanceof Components.TextureRender) {
            let dimensionsHTML = '';
            if (ley.shape === 'Rectangle' || ley.shape === 'Triangle' || ley.shape === 'Capsule') {
                dimensionsHTML = `
                    <div class="prop-row-multi">
                        <label>Dimensions</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="TextureRender" data-prop="width" value="${ley.width}" title="Width">
                            <input type="number" class="prop-input" step="1" data-component="TextureRender" data-prop="height" value="${ley.height}" title="Height">
                        </div>
                    </div>
                `;
            } else if (ley.shape === 'Circle') {
                dimensionsHTML = `
                    <div class="prop-row-multi">
                        <label>Radius</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="TextureRender" data-prop="radius" value="${ley.radius}" title="Radius">
                        </div>
                    </div>
                `;
            }

            componentHTML = `
                <div class="component-header">${iconHTML}<h4>Texture Render</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Shape</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="TextureRender" data-prop="shape">
                                <option value="Rectangle" ${ley.shape === 'Rectangle' ? 'selected' : ''}>Rectangle</option>
                                <option value="Circle" ${ley.shape === 'Circle' ? 'selected' : ''}>Circle</option>
                                <option value="Triangle" ${ley.shape === 'Triangle' ? 'selected' : ''}>Triangle</option>
                                <option value="Capsule" ${ley.shape === 'Capsule' ? 'selected' : ''}>Capsule</option>
                            </select>
                        </div>
                    </div>
                    ${dimensionsHTML}
                    <div class="prop-row-multi">
                        <label>Color</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="TextureRender" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    <div class="inspector-row">
                        <label>Texture</label>
                        <div class="asset-dropper" data-component="TextureRender" data-prop="texturePath" data-asset-type=".png,.jpg,.jpeg" title="Arrastra un asset de imagen aquí">
                            <span class="asset-dropper-text">${ley.texturePath || 'None'}</span>
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Transform) {
            console.log('  - Is Transform component.');
            if (selectedMateria.getComponent(Components.UITransform)) {
                console.log('  - UITransform also exists, skipping render of Transform.');
                return;
            }
            componentHTML = `
            <div class="component-inspector">
                <div class="component-header">${iconHTML}<h4>Transform</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Position</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="localPosition.x" value="${ley.localPosition.x}" title="Local Position X">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="localPosition.y" value="${ley.localPosition.y}" title="Local Position Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Rotation</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="localRotation" value="${ley.localRotation || 0}" title="Local Rotation Z">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Scale</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="localScale.x" value="${ley.localScale.x}" title="Local Scale X">
                            <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="localScale.y" value="${ley.localScale.y}" title="Local Scale Y">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.UITransform) {
            const presets = [
                'top-left', 'top-center', 'top-right',
                'middle-left', 'middle-center', 'middle-right',
                'bottom-left', 'bottom-center', 'bottom-right'
            ];
            const anchorGrid = presets.map(p => `
                <button
                    class="anchor-grid-button ${ley.anchorPreset === p ? 'active' : ''}"
                    data-preset="${p}"
                    title="${p}">
                </button>
            `).join('');

            componentHTML = `
            <div class="component-header">${iconHTML}<h4>UI Transform</h4></div>
            <div class="component-content">
                 <div class="anchor-grid-container">
                    ${anchorGrid}
                </div>
                <div class="prop-row-multi">
                    <label>Position</label>
                    <div class="prop-inputs">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="position.x" value="${ley.position.x}" title="Position X">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="position.y" value="${ley.position.y}" title="Position Y">
                    </div>
                </div>
                <div class="prop-row-multi">
                    <label>Size</label>
                    <div class="prop-inputs">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="size.width" value="${ley.size.width}" title="Width">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="size.height" value="${ley.size.height}" title="Height">
                    </div>
                </div>
                 <div class="prop-row-multi">
                    <label>Pivot</label>
                    <div class="prop-inputs">
                        <input type="number" class="prop-input" step="0.1" min="0" max="1" data-component="UITransform" data-prop="pivot.x" value="${ley.pivot.x}" title="Pivot X">
                        <input type="number" class="prop-input" step="0.1" min="0" max="1" data-component="UITransform" data-prop="pivot.y" value="${ley.pivot.y}" title="Pivot Y">
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.UIImage) {
            const previewImg = ley.sprite.src ? `<img src="${ley.sprite.src}" alt="Preview">` : 'None';
            componentHTML = `<div class="component-header">${iconHTML}<h4>UI Image</h4></div>
            <div class="component-content">
                <div class="prop-row-multi"><label>Source</label><div class="sprite-dropper"><div class="sprite-preview">${previewImg}</div><button class="sprite-select-btn" data-component="UIImage">🎯</button></div></div>
                <div class="prop-row-multi"><label>Color</label><input type="color" class="prop-input" data-component="UIImage" data-prop="color" value="${ley.color}"></div>
            </div>`;
        } else if (ley instanceof Components.UIText) {
            const fontName = ley.fontAssetPath ? ley.fontAssetPath.split('/').pop() : 'Default';
            componentHTML = `
                <div class="component-header"><span class="component-icon">📝</span><h4>UI Text</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Text</label>
                        <textarea class="prop-input" data-component="UIText" data-prop="text" rows="3">${ley.text}</textarea>
                    </div>
                    <div class="inspector-row">
                        <label>Font</label>
                        <div class="asset-dropper" data-component="UIText" data-prop="fontAssetPath" data-asset-type=".ttf,.otf,.woff,.woff2" title="Haz clic para seleccionar o arrastra una fuente aquí">
                            <span class="asset-dropper-text">${fontName}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Font Size</label>
                        <input type="number" class="prop-input" data-component="UIText" data-prop="fontSize" value="${ley.fontSize}" min="1">
                    </div>
                    <div class="prop-row-multi">
                        <label>Color</label>
                        <input type="color" class="prop-input" data-component="UIText" data-prop="color" value="${ley.color}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Alignment</label>
                        <select class="prop-input" data-component="UIText" data-prop="horizontalAlign">
                            <option value="left" ${ley.horizontalAlign === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${ley.horizontalAlign === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${ley.horizontalAlign === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label>Transform</label>
                        <select class="prop-input" data-component="UIText" data-prop="textTransform">
                            <option value="none" ${ley.textTransform === 'none' ? 'selected' : ''}>None</option>
                            <option value="uppercase" ${ley.textTransform === 'uppercase' ? 'selected' : ''}>UPPERCASE</option>
                            <option value="lowercase" ${ley.textTransform === 'lowercase' ? 'selected' : ''}>lowercase</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Canvas) {
            const isWorldSpace = ley.renderMode === 'World Space';
            componentHTML = `
                <div class="component-header"><span class="component-icon">🖼️</span><h4>Canvas</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Render Mode</label>
                        <select class="prop-input inspector-re-render" data-component="Canvas" data-prop="renderMode">
                            <option value="Screen Space" ${!isWorldSpace ? 'selected' : ''}>Screen Space</option>
                            <option value="World Space" ${isWorldSpace ? 'selected' : ''}>World Space</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label>Size</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Canvas" data-prop="size.x" value="${ley.size.x}" ${!isWorldSpace ? 'disabled' : ''}>
                            <input type="number" class="prop-input" data-component="Canvas" data-prop="size.y" value="${ley.size.y}" ${!isWorldSpace ? 'disabled' : ''}>
                        </div>
                    </div>
                </div>`;
        } else if (ley instanceof Components.Button) {
            const isColorTint = ley.transition === 'Color Tint';
            componentHTML = `
                <div class="component-header"><span class="component-icon">🖲️</span><h4>Button</h4></div>
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Button" data-prop="interactable" ${ley.interactable ? 'checked' : ''}>
                        <label>Interactable</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label>Transition</label>
                        <select class="prop-input inspector-re-render" data-component="Button" data-prop="transition">
                            <option value="None" ${!isColorTint ? 'selected' : ''}>None</option>
                            <option value="Color Tint" ${isColorTint ? 'selected' : ''}>Color Tint</option>
                        </select>
                    </div>
                    <div id="color-tint-settings" style="display: ${isColorTint ? 'block' : 'none'};">
                        <div class="prop-row-multi">
                            <label>Normal Color</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.normalColor" value="${ley.colors.normalColor}">
                        </div>
                        <div class="prop-row-multi">
                            <label>Pressed Color</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.pressedColor" value="${ley.colors.pressedColor}">
                        </div>
                        <div class="prop-row-multi">
                            <label>Disabled Color</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.disabledColor" value="${ley.colors.disabledColor}">
                        </div>
                    </div>
                     <div class="inspector-section-header">
                        <span>On Click ()</span>
                    </div>
                    <div class="onclick-event-list">
                        ${ley.onClick.map((event, index) => {
                            let targetName = 'None (Materia)';
                            let functionsDropdown = '<option value="">No Function</option>';

                            if (event.targetMateriaId) {
                                const targetMateria = window.SceneManager.currentScene.findMateriaById(event.targetMateriaId);
                                if (targetMateria) {
                                    targetName = targetMateria.name;
                                    const scripts = targetMateria.getComponents(Components.CreativeScript);
                                    if (scripts.length > 0) {
                                        // For simplicity, we'll use the first script for now.
                                        // A more robust solution would let the user choose the script.
                                        const metadata = CES_Transpiler.getScriptMetadata(scripts[0].scriptName);
                                        if (metadata && metadata.publicFunctions) {
                                            functionsDropdown = metadata.publicFunctions.map(funcName =>
                                                `<option value="${funcName}" ${event.functionName === funcName ? 'selected' : ''}>${funcName}</option>`
                                            ).join('');
                                        }
                                    }
                                }
                            }

                            return `
                            <div class="onclick-event-item" data-event-index="${index}">
                                <div class="materia-dropper" data-prop="onClick.${index}.targetMateriaId" title="Arrastra una Materia con un script aquí.">${targetName}</div>
                                <select class="prop-input" data-component="Button" data-prop="onClick.${index}.functionName">
                                    ${functionsDropdown}
                                </select>
                                <button class="remove-event-btn" data-action="remove-onclick-event" data-index="${index}">-</button>
                            </div>
                            `;
                        }).join('')}
                    </div>
                    <button class="add-event-btn" data-action="add-onclick-event">+</button>
                </div>
            `;
        }
        else if (ley instanceof Components.SpriteRenderer) {
            let spriteSelectorHTML = '';
            // If a .ceSprite asset is loaded, show the dropdown to select a specific sprite
            if (ley.spriteSheet && ley.spriteSheet.sprites && Object.keys(ley.spriteSheet.sprites).length > 0) {
                const options = Object.keys(ley.spriteSheet.sprites)
                    .map(spriteName => `<option value="${spriteName}" ${ley.spriteName === spriteName ? 'selected' : ''}>${spriteName}</option>`)
                    .join('');

                spriteSelectorHTML = `
                    <div class="inspector-row">
                        <label for="sprite-name-select">Sprite</label>
                        <select id="sprite-name-select" class="prop-input inspector-re-render" data-component="SpriteRenderer" data-prop="spriteName">
                            ${options}
                        </select>
                    </div>
                `;
            }

            componentHTML = `
                <div class="component-header">${iconHTML}<h4>Sprite Renderer</h4></div>
                <div class="component-content">
                    <div class="inspector-row">
                        <label>Source</label>
                        <div class="asset-dropper" data-component="SpriteRenderer" data-prop="source" data-asset-type=".png,.jpg,.jpeg,.ceSprite" title="Arrastra un asset de imagen o .ceSprite aquí">
                            <span class="asset-dropper-text">${ley.spriteAssetPath || ley.source || 'None'}</span>
                        </div>
                    </div>
                    ${spriteSelectorHTML}
                    <div class="inspector-row">
                        <label>Color</label>
                        <input type="color" class="prop-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color}">
                    </div>
                </div>`;
        }
        else if (ley instanceof Components.CreativeScript) {
            let publicVarsHTML = '';
            const metadata = CES_Transpiler.getScriptMetadata(ley.scriptName);

            if (metadata && metadata.publicVars) {
                for (const pv of metadata.publicVars) {
                    const currentValue = ley.publicVars[pv.name] ?? pv.defaultValue;
                    publicVarsHTML += `
                        <div class="prop-row-multi">
                            <label>${pv.name}</label>
                            ${renderPublicVarInput(pv, currentValue, 'CreativeScript', ley.scriptName)}
                        </div>
                    `;
                }
            }

            componentHTML = `
                <div class="component-header">${iconHTML}<h4><a href="#">${ley.scriptName}</a></h4></div>
                <div class="component-content">
                    ${publicVarsHTML || '<p class="field-description">Este script no tiene variables públicas.</p>'}
                </div>
            `;
        } else if (ley instanceof Components.Animator) {
            componentHTML = `
                <div class="component-header">${iconHTML}<h4>Animator</h4></div>
                <div class="component-content">
                    <div class="inspector-row">
                        <label>Animation Clip</label>
                        <div class="asset-dropper" data-component="Animator" data-prop="animationClipPath" data-asset-type=".ceanimclip,.cea" title="Arrastra un .ceanimclip o .cea aquí">
                            <span class="asset-dropper-text">${ley.animationClipPath || 'None'}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Speed</label>
                        <input type="number" class="prop-input" step="1" min="0" data-component="Animator" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Animator" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label>Loop</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Animator" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label>Play On Awake</label>
                    </div>
                </div>`;
        } else if (ley instanceof Components.AnimatorController) {
            let statesListHTML = '<p class="field-description">Asigna un Controller para ver sus estados.</p>';
            if (ley.controller && ley.states.size > 0) {
                statesListHTML = '<ul>';
                for (const stateName of ley.states.keys()) {
                    statesListHTML += `<li>${stateName}</li>`;
                }
                statesListHTML += '</ul>';
            }
            componentHTML = `
                <div class="component-header">${iconHTML}<h4>Animator Controller</h4></div>
                <div class="component-content">
                    <div class="inspector-row">
                        <label>Controller</label>
                        <div class="asset-dropper" data-component="AnimatorController" data-prop="controllerPath" data-asset-type=".ceanim" title="Arrastra un asset .ceanim aquí">
                            <span class="asset-dropper-text">${ley.controllerPath || 'None'}</span>
                        </div>
                    </div>
                    <div class="inspector-field-group">
                        <label>States</label>
                        ${statesListHTML}
                    </div>
                </div>`;
        } else if (ley instanceof Components.Camera) {
            const projection = ley.projection || 'Perspective';
            const clearFlags = ley.clearFlags || 'SolidColor';

            componentHTML = `
                <div class="component-header">${iconHTML}<h4>Camera</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Depth</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Camera" data-prop="depth" value="${ley.depth || 0}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Clear Flags</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="Camera" data-prop="clearFlags">
                                <option value="SolidColor" ${clearFlags === 'SolidColor' ? 'selected' : ''}>Solid Color</option>
                                <option value="Skybox" ${clearFlags === 'Skybox' ? 'selected' : ''}>Skybox</option>
                                <option value="DontClear" ${clearFlags === 'DontClear' ? 'selected' : ''}>Don't Clear</option>
                            </select>
                        </div>
                    </div>

                    <div class="prop-row-multi" style="display: ${clearFlags === 'SolidColor' ? 'flex' : 'none'};">
                        <label>Background</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="Camera" data-prop="backgroundColor" value="${ley.backgroundColor || '#1e293b'}">
                        </div>
                    </div>

                    <div class="prop-row-multi">
                        <label>Culling Mask</label>
                        <div class="prop-inputs">
                            <button id="culling-mask-btn" class="prop-input-button">${getCullingMaskText(ley.cullingMask)}</button>
                        </div>
                    </div>

                    <div class="prop-row-multi">
                        <label>Projection</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="Camera" data-prop="projection">
                                <option value="Perspective" ${projection === 'Perspective' ? 'selected' : ''}>Perspective</option>
                                <option value="Orthographic" ${projection === 'Orthographic' ? 'selected' : ''}>Orthographic</option>
                            </select>
                        </div>
                    </div>

                    <div class="prop-row-multi" style="display: ${projection === 'Perspective' ? 'flex' : 'none'};">
                        <label>Field of View</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Camera" data-prop="fov" value="${ley.fov || 60}" min="1" max="179">
                        </div>
                    </div>

                     <div class="prop-row-multi" style="display: ${projection === 'Orthographic' ? 'flex' : 'none'};">
                        <label>Size</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Camera" data-prop="orthographicSize" value="${ley.orthographicSize || 5}" min="0.1">
                        </div>
                    </div>

                    <div class="prop-row-multi">
                        <label>Clipping Planes</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" placeholder="Near" data-component="Camera" data-prop="nearClipPlane" value="${ley.nearClipPlane || 0.1}" title="Near Clip Plane">
                            <input type="number" class="prop-input" placeholder="Far" data-component="Camera" data-prop="farClipPlane" value="${ley.farClipPlane || 1000}" title="Far Clip Plane">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.PointLight2D) {
            console.log('  - Is PointLight2D component.');
            componentHTML = `
            <div class="component-inspector">
                <div class="component-header">${iconHTML}<h4>Point Light 2D</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Color</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="PointLight2D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Intensity</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" min="0" data-component="PointLight2D" data-prop="intensity" value="${ley.intensity}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Radius</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="10" min="0" data-component="PointLight2D" data-prop="radius" value="${ley.radius}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.SpotLight2D) {
            console.log('  - Is SpotLight2D component.');
            componentHTML = `
            <div class="component-inspector">
                <div class="component-header">${iconHTML}<h4>Spot Light 2D</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Color</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="SpotLight2D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Intensity</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" min="0" data-component="SpotLight2D" data-prop="intensity" value="${ley.intensity}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Radius</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="10" min="0" data-component="SpotLight2D" data-prop="radius" value="${ley.radius}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Angle</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" min="1" max="180" data-component="SpotLight2D" data-prop="angle" value="${ley.angle}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.FreeformLight2D) {
            console.log('  - Is FreeformLight2D component.');
            componentHTML = `
            <div class="component-inspector">
                <div class="component-header">${iconHTML}<h4>Freeform Light 2D</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Color</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="FreeformLight2D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Intensity</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" min="0" data-component="FreeformLight2D" data-prop="intensity" value="${ley.intensity}">
                        </div>
                    </div>
                    <hr>
                    <p class="field-description">La edición de vértices se implementará en una futura actualización.</p>
                </div>
            </div>`;
        } else if (ley instanceof Components.Tilemap) {
            // Safeguard against corrupted layer data from old scene files
            if (!ley.layers || !Array.isArray(ley.layers)) {
                componentHTML = `
                    <div class="component-header">
                        <span class="component-icon">🗺️</span><h4>Tilemap</h4>
                    </div>
                    <div class="component-content">
                        <p class="error-message">Los datos de las capas del Tilemap están corruptos. Vuelva a guardar la escena para intentar repararlos.</p>
                    </div>
                `;
            } else {
                let sizeInputHTML = '';
                if (ley.manualSize) {
                    sizeInputHTML = `
                        <div class="prop-row-multi">
                            <label>Size</label>
                            <div class="prop-inputs">
                                <input type="number" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="width" value="${ley.width}" title="Width">
                                <input type="number" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="height" value="${ley.height}" title="Height">
                            </div>
                        </div>
                    `;
                } else {
                    sizeInputHTML = `
                        <div class="prop-row-multi">
                            <label>Size</label>
                            <div class="prop-inputs">
                                <input type="number" class="prop-input" value="${ley.width}" readonly title="Width">
                                <input type="number" class="prop-input" value="${ley.height}" readonly title="Height">
                            </div>
                        </div>
                    `;
                }

                componentHTML = `
                    <div class="component-header">
                        <span class="component-icon">🗺️</span><h4>Tilemap</h4>
                    </div>
                    <div class="component-content">
                        <div class="checkbox-field">
                            <input type="checkbox" id="tilemap-manual-size-toggle" data-component="Tilemap" ${ley.manualSize ? 'checked' : ''}>
                            <label for="tilemap-manual-size-toggle">Tamaño Manual</label>
                        </div>
                        ${sizeInputHTML}
                        <hr>
                        <div class="layer-manager-ui">
                            <div class="layer-list-header">
                                <h5>Capas</h5>
                                <div class="layer-controls">
                                    <button class="layer-btn add" data-action="add-layer" title="Añadir Capa">+</button>
                                    <button class="layer-btn remove" data-action="remove-layer" title="Eliminar Capa Seleccionada">-</button>
                                </div>
                            </div>
                            <div class="layer-list">
                                ${ley.layers.map((layer, index) => `
                                    <div class="layer-item ${index === ley.activeLayerIndex ? 'active' : ''}" data-action="select-layer" data-index="${index}">
                                        <span>Capa ${index} (X: ${layer.position ? layer.position.x : 'N/A'}, Y: ${layer.position ? layer.position.y : 'N/A'})</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }
        } else if (ley instanceof Components.TilemapRenderer) {
            componentHTML = `
                <div class="component-header">
                    <span class="component-icon">🖌️</span><h4>Tilemap Renderer</h4>
                </div>
                <div class="component-content">
                    <p class="field-description">Este componente renderiza un Tilemap en la escena. No tiene propiedades editables.</p>
                </div>
            `;
        } else if (ley instanceof Components.TilemapCollider2D) {
            const tilemap = selectedMateria.getComponent(Components.Tilemap);
            let layerOptions = '<option value="-1">Ninguna</option>';
            if (tilemap) {
                layerOptions = tilemap.layers.map((layer, index) =>
                    `<option value="${index}" ${ley.sourceLayerIndex === index ? 'selected' : ''}>${index}: ${layer.name}</option>`
                ).join('');
            }

            componentHTML = `
                <div class="component-header">
                    <span class="component-icon">▦</span><h4>Tilemap Collider 2D</h4>
                </div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label for="collider-source-layer">Capa de Origen</label>
                        <select id="collider-source-layer" class="prop-input" data-component="TilemapCollider2D" data-prop="sourceLayerIndex">
                            ${layerOptions}
                        </select>
                    </div>
                    <hr>
                    <button class="primary-btn" data-action="generate-colliders" style="width: 100%;">Generar Colisionadores</button>
                    <p class="field-description" style="margin-top: 8px;">Colisionadores generados: ${ley.generatedColliders.length}</p>
                </div>
            `;
        } else if (ley instanceof Components.Grid) {
            // Ensure cellSize exists before trying to access its properties
            const cellSize = ley.cellSize || { x: 32, y: 32 };

            // Add a temporary, UI-only property to the component instance for the toggle state
            if (ley.isSimplified === undefined) {
                ley.isSimplified = (cellSize.x === cellSize.y);
            }

            let sizeInputHTML = '';
            if (ley.isSimplified) {
                sizeInputHTML = `
                    <div class="prop-row-multi">
                        <label>Cell Size</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" min="1" data-component="Grid" data-prop="simplifiedSize" value="${cellSize.x}">
                        </div>
                    </div>
                `;
            } else {
                sizeInputHTML = `
                    <div class="prop-row-multi">
                        <label>Cell Size</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" min="1" data-component="Grid" data-prop="cellSize.x" value="${cellSize.x}" title="X">
                            <input type="number" class="prop-input" step="1" min="1" data-component="Grid" data-prop="cellSize.y" value="${cellSize.y}" title="Y">
                        </div>
                    </div>
                `;
            }

            componentHTML = `
            <div class="component-inspector">
                <div class="component-header">${iconHTML}<h4>Grid</h4></div>
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" id="grid-simplified-toggle" data-component="Grid" ${ley.isSimplified ? 'checked' : ''}>
                        <label for="grid-simplified-toggle">Simplificado</label>
                    </div>
                    ${sizeInputHTML}
                </div>
            </div>`;
        } else if (ley instanceof Components.CapsuleCollider2D) {
            componentHTML = `
            <div class="component-inspector">
                <div class="component-header">${iconHTML}<h4>Capsule Collider 2D</h4></div>
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CapsuleCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label>Is Trigger</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label>Offset</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="Offset X">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="Offset Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Size</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="size.x" value="${ley.size.x}" title="Size X">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="size.y" value="${ley.size.y}" title="Size Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Direction</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="CapsuleCollider2D" data-prop="direction">
                                <option value="Vertical" ${ley.direction === 'Vertical' ? 'selected' : ''}>Vertical</option>
                                <option value="Horizontal" ${ley.direction === 'Horizontal' ? 'selected' : ''}>Horizontal</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.SpriteLight2D) {
            console.log('  - Is SpriteLight2D component.');
            const previewImg = ley.sprite.src ? `<img src="${ley.sprite.src}" alt="Preview">` : 'None';
            componentHTML = `
            <div class="component-inspector">
                <div class="component-header">${iconHTML}<h4>Sprite Light 2D</h4></div>
                <div class="component-content">
                     <div class="prop-row-multi">
                        <label>Sprite</label>
                        <div class="sprite-dropper">
                            <div class="sprite-preview">${previewImg}</div>
                            <button class="sprite-select-btn" data-component="SpriteLight2D">🎯</button>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Color</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="SpriteLight2D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Intensity</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" min="0" data-component="SpriteLight2D" data-prop="intensity" value="${ley.intensity}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.Rigidbody2D) {
            const rigidbody = ley; // Rename for clarity as suggested in review
            componentHTML = `
            <div class="component-inspector">
                <div class="component-header">${iconHTML}<h4>Rigidbody 2D</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Body Type</label>
                        <select class="prop-input" data-component="Rigidbody2D" data-prop="bodyType">
                            <option value="Dynamic" ${rigidbody.bodyType === 'Dynamic' ? 'selected' : ''}>Dynamic</option>
                            <option value="Kinematic" ${rigidbody.bodyType === 'Kinematic' ? 'selected' : ''}>Kinematic</option>
                            <option value="Static" ${rigidbody.bodyType === 'Static' ? 'selected' : ''}>Static</option>
                        </select>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Rigidbody2D" data-prop="simulated" ${rigidbody.simulated ? 'checked' : ''}>
                        <label>Simulated</label>
                    </div>
                    <div class="inspector-field-group">
                        <div class="prop-row-multi">
                            <label>Mass</label>
                            <input type="number" class="prop-input" step="0.1" data-component="Rigidbody2D" data-prop="mass" value="${rigidbody.mass}">
                        </div>
                        <div class="prop-row-multi">
                            <label>Gravity Scale</label>
                            <input type="number" class="prop-input" step="0.1" data-component="Rigidbody2D" data-prop="gravityScale" value="${rigidbody.gravityScale}">
                        </div>
                    </div>
                    <div class="inspector-field-group">
                        <label>Constraints</label>
                        <div class="checkbox-field" style="padding-left: 10px;">
                            <input type="checkbox" class="prop-input" data-component="Rigidbody2D" data-prop="constraints.freezeRotation" ${rigidbody.constraints.freezeRotation ? 'checked' : ''}>
                            <label>Freeze Rotation Z</label>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.CustomComponent) {
            let publicVarsHTML = '';
            if (ley.definition && ley.definition.metadata && ley.definition.metadata.publicVars) {
                for (const pv of ley.definition.metadata.publicVars) {
                    const currentValue = ley.publicVars[pv.name] ?? pv.defaultValue;
                     publicVarsHTML += `
                        <div class="prop-row-multi">
                            <label>${pv.name}</label>
                            ${renderPublicVarInput(pv, currentValue, 'CustomComponent', ley.id)}
                        </div>
                    `;
                }
            }
            componentHTML = `
                <div class="component-header"><span class="component-icon">⚙️</span><h4>${ley.definition.nombre}</h4></div>
                <div class="component-content">
                    ${publicVarsHTML || '<p class="field-description">Este componente no tiene propiedades públicas.</p>'}
                </div>
            `;
        } else if (ley instanceof Components.BoxCollider2D) {
            componentHTML = `
            <div class="component-inspector">
                <div class="component-header">${iconHTML}<h4>Box Collider 2D</h4></div>
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="BoxCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label>Is Trigger</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label>Offset</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="Offset X">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="Offset Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Size</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="size.x" value="${ley.size.x}" title="Size X">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="size.y" value="${ley.size.y}" title="Size Y">
                        </div>
                    </div>
                </div>
            </div>`;
        }


        if (componentHTML) {
            const componentWrapper = document.createElement('div');
            componentWrapper.className = 'component-inspector';
            componentWrapper.innerHTML = componentHTML;

            // This is a robust way to append the contents of the wrapper
            while(componentWrapper.firstChild) {
                componentsWrapper.appendChild(componentWrapper.firstChild);
            }
        }
    });

    console.log('6. Finished component loop. Appending main wrapper to DOM.');
    dom.inspectorContent.appendChild(componentsWrapper);

    const addComponentBtn = document.createElement('button');
    addComponentBtn.id = 'add-component-btn';
    addComponentBtn.className = 'add-component-btn';
    addComponentBtn.textContent = 'Añadir Ley';
    dom.inspectorContent.appendChild(addComponentBtn);
    console.log('7. Inspector update complete.');
}


async function updateInspectorForAsset(assetName, assetPath) {
    if (!assetName) {
        dom.inspectorContent.innerHTML = `<p class="inspector-placeholder">Selecciona un asset</p>`;
        return;
    }

    dom.inspectorContent.innerHTML = `<h4>Asset: ${assetName}</h4>`;

    const selectedAssetEl = dom.assetGridView.querySelector('.grid-item.active');
    if (selectedAssetEl && selectedAssetEl.dataset.kind === 'directory') {
        dom.inspectorContent.innerHTML += `<p>Tipo: Carpeta</p>`;
        return;
    }

    try {
        const dirHandle = currentDirectoryHandle();
        if (!dirHandle) {
            dom.inspectorContent.innerHTML = `<p class="inspector-placeholder error-message">Directorio de assets no disponible</p>`;
            return;
        }

        const fileHandle = await dirHandle.getFileHandle(assetName);
        const file = await fileHandle.getFile();
        const content = await file.text();

        if (assetName.endsWith('.ces')) {
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.className = 'language-javascript';
            code.textContent = content;
            pre.appendChild(code);
            dom.inspectorContent.appendChild(pre);
        } else if (assetName.endsWith('.md')) {
            const html = markdownConverter.makeHtml(content);
            const preview = document.createElement('div');
            preview.className = 'markdown-preview';
            preview.innerHTML = html;
            dom.inspectorContent.appendChild(preview);
        } else if (assetName.endsWith('.png') || assetName.endsWith('.jpg') || assetName.endsWith('.jpeg')) {
            let metaData = {};
            try {
                const metaFileHandle = await dirHandle.getFileHandle(`${assetName}.meta`);
                const metaFile = await metaFileHandle.getFile();
                metaData = JSON.parse(await metaFile.text());
            } catch (e) { /* Meta file doesn't exist, use defaults. */ }

            // Set default values for new properties
            metaData.textureType = metaData.textureType || 'Sprite (2D and UI)';
            metaData.spriteMode = metaData.spriteMode || 'Single';
            metaData.pixelsPerUnit = metaData.pixelsPerUnit || 100;
            metaData.meshType = metaData.meshType || 'Tight';
            metaData.tag = metaData.tag || '';
            metaData.filterMode = metaData.filterMode || 'Point';
            metaData.wrapMode = metaData.wrapMode || 'Clamp';
            metaData.maxSize = metaData.maxSize || 2048;
            metaData.compression = metaData.compression || 'Normal';
            metaData.animSpeed = metaData.animSpeed || 10;
            metaData.animColumns = metaData.animColumns || 1;
            metaData.animRows = metaData.animRows || 1;

            const settingsContainer = document.createElement('div');
            settingsContainer.className = 'asset-settings';
            settingsContainer.innerHTML = `
                <div class="inspector-section">
                    <label for="texture-type">Texture Type</label>
                    <select id="texture-type" class="inspector-re-render-asset">
                        <option value="Sprite (2D and UI)" ${metaData.textureType === 'Sprite (2D and UI)' ? 'selected' : ''}>Sprite (2D and UI)</option>
                        <option value="Animation Sheet" ${metaData.textureType === 'Animation Sheet' ? 'selected' : ''}>Animation Sheet</option>
                        <option value="Texture" ${metaData.textureType === 'Texture' ? 'selected' : ''}>Texture</option>
                    </select>
                </div>

                <div id="sprite-settings-container" class="${metaData.textureType === 'Animation Sheet' || metaData.textureType === 'Texture' ? 'hidden' : ''}">
                    <fieldset class="inspector-section">
                        <legend>Sprite (2D and UI)</legend>

                        <div class="inspector-row">
                            <label for="sprite-mode">Sprite Mode</label>
                            <select id="sprite-mode" class="inspector-re-render-asset">
                                <option value="Single" ${metaData.spriteMode === 'Single' ? 'selected' : ''}>Single</option>
                                <option value="Multiple" ${metaData.spriteMode === 'Multiple' ? 'selected' : ''}>Multiple</option>
                            </select>
                        </div>

                        <div class="inspector-row">
                            <label for="pixels-per-unit">Pixels Per Unit</label>
                            <input type="number" id="pixels-per-unit" value="${metaData.pixelsPerUnit}">
                        </div>

                        <div class="inspector-row">
                            <label for="mesh-type">Mesh Type</label>
                            <select id="mesh-type">
                                <option value="Full Rect" ${metaData.meshType === 'Full Rect' ? 'selected' : ''}>Full Rect</option>
                                <option value="Tight" ${metaData.meshType === 'Tight' ? 'selected' : ''}>Tight</option>
                            </select>
                        </div>

                        <div class="inspector-row">
                            <label for="texture-tag">Tag</label>
                            <input type="text" id="texture-tag" value="${metaData.tag}" placeholder="Untagged">
                        </div>

                        <hr>

                        <div id="sprite-editor-btn-container" class="${metaData.spriteMode !== 'Multiple' ? 'hidden' : ''}">
                             <button id="sprite-editor-btn" class="primary-btn" style="width: 100%;">Sprite Editor</button>
                        </div>
                    </fieldset>

                    <fieldset class="inspector-section">
                        <legend>Advanced</legend>
                        <div class="inspector-row">
                            <label for="filter-mode">Filter Mode</label>
                            <select id="filter-mode">
                                <option value="Point" ${metaData.filterMode === 'Point' ? 'selected' : ''}>Point (no filter)</option>
                                <option value="Bilinear" ${metaData.filterMode === 'Bilinear' ? 'selected' : ''}>Bilinear</option>
                                <option value="Trilinear" ${metaData.filterMode === 'Trilinear' ? 'selected' : ''}>Trilinear</option>
                            </select>
                        </div>
                        <div class="inspector-row">
                            <label for="wrap-mode">Wrap Mode</label>
                            <select id="wrap-mode">
                                <option value="Repeat" ${metaData.wrapMode === 'Repeat' ? 'selected' : ''}>Repeat</option>
                                <option value="Clamp" ${metaData.wrapMode === 'Clamp' ? 'selected' : ''}>Clamp</option>
                            </select>
                        </div>
                         <hr>
                        <div class="inspector-row">
                            <label for="max-size">Max Size</label>
                            <select id="max-size">
                                <option value="32" ${metaData.maxSize === 32 ? 'selected' : ''}>32</option>
                                <option value="64" ${metaData.maxSize === 64 ? 'selected' : ''}>64</option>
                                <option value="128" ${metaData.maxSize === 128 ? 'selected' : ''}>128</option>
                                <option value="256" ${metaData.maxSize === 256 ? 'selected' : ''}>256</option>
                                <option value="512" ${metaData.maxSize === 512 ? 'selected' : ''}>512</option>
                                <option value="1024" ${metaData.maxSize === 1024 ? 'selected' : ''}>1024</option>
                                <option value="2048" ${metaData.maxSize === 2048 ? 'selected' : ''}>2048</option>
                                <option value="4096" ${metaData.maxSize === 4096 ? 'selected' : ''}>4096</option>
                                <option value="8192" ${metaData.maxSize === 8192 ? 'selected' : ''}>8192</option>
                            </select>
                        </div>
                         <div class="inspector-row">
                            <label for="compression-quality">Compression</label>
                            <select id="compression-quality">
                                <option value="None" ${metaData.compression === 'None' ? 'selected' : ''}>None</option>
                                <option value="Low" ${metaData.compression === 'Low' ? 'selected' : ''}>Low Quality</option>
                                <option value="Normal" ${metaData.compression === 'Normal' ? 'selected' : ''}>Normal Quality</option>
                                <option value="High" ${metaData.compression === 'High' ? 'selected' : ''}>High Quality</option>
                            </select>
                        </div>
                    </fieldset>
                </div>

                <div id="animation-sheet-settings-container" class="${metaData.textureType !== 'Animation Sheet' ? 'hidden' : ''}">
                    <fieldset class="inspector-section bubble-style">
                        <legend>Animation Preview</legend>
                        <div class="anim-preview-bubble">
                            <canvas id="anim-preview-canvas" width="128" height="128"></canvas>
                            <div class="anim-preview-controls">
                                <button id="anim-preview-play">▶️</button>
                                <button id="anim-preview-stop">⏹️</button>
                                <input type="number" id="anim-preview-speed" value="${metaData.animSpeed || 10}" min="1" title="FPS">
                            </div>
                        </div>
                    </fieldset>
                    <fieldset class="inspector-section">
                        <legend>Slicing</legend>
                        <div class="inspector-row">
                            <label for="anim-columns">Columns</label>
                            <input type="number" id="anim-columns" value="${metaData.animColumns || 1}" min="1">
                        </div>
                        <div class="inspector-row">
                            <label for="anim-rows">Rows</label>
                            <input type="number" id="anim-rows" value="${metaData.animRows || 1}" min="1">
                        </div>
                         <button id="create-anim-asset-btn" class="primary-btn" style="width: 100%; margin-top: 10px;">Crear Asset de Animación (.cea)</button>
                    </fieldset>
                </div>

                <button id="save-meta-btn" class="primary-btn" style="width: 100%; margin-top: 10px;">Aplicar</button>
                <hr>
                <div class="preview-container"><img id="inspector-preview-img" src="" alt="Preview"></div>
            `;
            dom.inspectorContent.appendChild(settingsContainer);

            // --- Event Listeners for this specific inspector ---
            // The main 'change' handler (handleInspectorChange) will now manage this via event delegation.

            const spriteEditorBtn = document.getElementById('sprite-editor-btn');
            if (spriteEditorBtn) {
                spriteEditorBtn.addEventListener('click', () => {
                    const dirHandle = currentDirectoryHandle();
                    if (dirHandle) {
                        dirHandle.getFileHandle(assetName).then(fileHandle => {
                            SpriteSlicer.open(fileHandle, dirHandle, saveAssetMetaCallback);
                        });
                    }
                });
            }

            document.getElementById('save-meta-btn').addEventListener('click', async () => {
                const maxSize = parseInt(document.getElementById('max-size').value, 10);
                const compressionQuality = document.getElementById('compression-quality').value;

                // --- Image Optimization Logic ---
                if (typeof imageCompression !== 'undefined' && compressionQuality !== 'None') {
                    try {
                        const originalFileHandle = await dirHandle.getFileHandle(assetName);
                        const originalFile = await originalFileHandle.getFile();

                        const options = {
                            maxSizeMB: 2, // A reasonable default limit
                            maxWidthOrHeight: maxSize,
                            useWebWorker: true,
                        };

                        switch(compressionQuality) {
                            case 'Low': options.initialQuality = 0.4; break;
                            case 'Normal': options.initialQuality = 0.6; break;
                            case 'High': options.initialQuality = 0.8; break;
                        }

                        console.log(`Comprimiendo '${assetName}' con las opciones:`, options);
                        const compressedFile = await imageCompression(originalFile, options);
                        console.log(`Compresión finalizada. Tamaño original: ${originalFile.size / 1024} KB, Tamaño comprimido: ${compressedFile.size / 1024} KB`);

                        // Overwrite the original file with the compressed version
                        const writable = await originalFileHandle.createWritable();
                        await writable.write(compressedFile);
                        await writable.close();
                        console.log(`Archivo '${assetName}' sobrescrito con la versión optimizada.`);

                    } catch (error) {
                        console.error("Error durante la optimización de la imagen:", error);
                        window.Dialogs.showNotification('Error de Optimización', `No se pudo optimizar la imagen: ${error.message}`);
                        return; // Stop if optimization fails
                    }
                }

                // --- Metadata Saving Logic (runs after optimization) ---
                let currentMetaData = {};
                try {
                    const metaFileHandle = await dirHandle.getFileHandle(`${assetName}.meta`);
                    const metaFile = await metaFileHandle.getFile();
                    currentMetaData = JSON.parse(await metaFile.text());
                } catch (e) { /* no-op, will create a new one */ }

                currentMetaData.textureType = document.getElementById('texture-type').value;

                if (currentMetaData.textureType === 'Texture') {
                    currentMetaData.wrapMode = 'Repeat';
                    // We can also save other relevant properties for textures here if needed in the future
                } else if (currentMetaData.textureType === 'Sprite (2D and UI)') {
                    currentMetaData.spriteMode = document.getElementById('sprite-mode').value;
                    currentMetaData.pixelsPerUnit = parseFloat(document.getElementById('pixels-per-unit').value) || 100;
                    currentMetaData.meshType = document.getElementById('mesh-type').value;
                    currentMetaData.tag = document.getElementById('texture-tag').value;
                    currentMetaData.filterMode = document.getElementById('filter-mode').value;
                    currentMetaData.wrapMode = document.getElementById('wrap-mode').value;
                    currentMetaData.maxSize = maxSize;
                    currentMetaData.compression = compressionQuality;
                } else {
                    currentMetaData.animSpeed = parseInt(document.getElementById('anim-preview-speed').value, 10) || 10;
                    currentMetaData.animColumns = parseInt(document.getElementById('anim-columns').value, 10) || 1;
                    currentMetaData.animRows = parseInt(document.getElementById('anim-rows').value, 10) || 1;
                }

                await saveAssetMetaCallback(assetName, currentMetaData, dirHandle);
                window.Dialogs.showNotification('Éxito', 'Optimización y metadatos del asset aplicados.');

                // Refresh the asset browser and inspector to show the new file size/preview
                updateAssetBrowserCallback();
                updateInspector();
            });

            // --- Animation Preview Logic ---
            if (metaData.textureType === 'Animation Sheet') {
                const canvas = document.getElementById('anim-preview-canvas');
                const playBtn = document.getElementById('anim-preview-play');
                const stopBtn = document.getElementById('anim-preview-stop');
                const speedInput = document.getElementById('anim-preview-speed');
                const colsInput = document.getElementById('anim-columns');
                const rowsInput = document.getElementById('anim-rows');
                const ctx = canvas.getContext('2d');

                let animState = { isPlaying: false, frame: 0, lastTime: 0, animId: null, image: new Image() };

                const drawFrame = () => {
                    const img = animState.image;
                    if (!img.src || img.naturalWidth === 0) return;

                    const cols = parseInt(colsInput.value, 10) || 1;
                    const rows = parseInt(rowsInput.value, 10) || 1;
                    const frameWidth = img.naturalWidth / cols;
                    const frameHeight = img.naturalHeight / rows;
                    const totalFrames = cols * rows;

                    const currentCol = animState.frame % cols;
                    const currentRow = Math.floor(animState.frame / cols);

                    const sx = currentCol * frameWidth;
                    const sy = currentRow * frameHeight;

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    // Draw with aspect ratio correction
                    const canvasAspect = canvas.width / canvas.height;
                    const frameAspect = frameWidth / frameHeight;
                    let drawWidth, drawHeight, dx, dy;

                    if (canvasAspect > frameAspect) { // Canvas is wider
                        drawHeight = canvas.height;
                        drawWidth = drawHeight * frameAspect;
                        dx = (canvas.width - drawWidth) / 2;
                        dy = 0;
                    } else { // Canvas is taller or same aspect
                        drawWidth = canvas.width;
                        drawHeight = drawWidth / frameAspect;
                        dx = 0;
                        dy = (canvas.height - drawHeight) / 2;
                    }
                    ctx.drawImage(img, sx, sy, frameWidth, frameHeight, dx, dy, drawWidth, drawHeight);
                };

                const loop = (timestamp) => {
                    if (!animState.isPlaying) return;

                    const speed = parseInt(speedInput.value, 10) || 10;
                    const totalFrames = (parseInt(colsInput.value, 10) || 1) * (parseInt(rowsInput.value, 10) || 1);

                    if (timestamp - animState.lastTime > (1000 / speed)) {
                        animState.lastTime = timestamp;
                        animState.frame = (animState.frame + 1) % totalFrames;
                        drawFrame();
                    }
                    animState.animId = requestAnimationFrame(loop);
                };

                playBtn.addEventListener('click', () => {
                    if (animState.isPlaying) return;
                    animState.isPlaying = true;
                    animState.lastTime = performance.now();
                    animState.animId = requestAnimationFrame(loop);
                });

                stopBtn.addEventListener('click', () => {
                    animState.isPlaying = false;
                    cancelAnimationFrame(animState.animId);
                    animState.frame = 0;
                    drawFrame();
                });

                getURLForAssetPath(assetPath, projectsDirHandle).then(url => {
                    if(url) {
                        animState.image.src = url;
                        animState.image.onload = () => drawFrame();
                    }
                });

                document.getElementById('create-anim-asset-btn').addEventListener('click', async () => {
                    if (!createAssetCallback) {
                        console.error("createAssetCallback no está disponible.");
                        return;
                    }

                    const speed = parseInt(document.getElementById('anim-preview-speed').value, 10) || 10;
                    const cols = parseInt(document.getElementById('anim-columns').value, 10) || 1;
                    const rows = parseInt(document.getElementById('anim-rows').value, 10) || 1;

                    const imageUrl = await getURLForAssetPath(assetPath, projectsDirHandle);
                    if (!imageUrl) {
                        window.Dialogs.showNotification("Error", "No se pudo cargar la imagen para crear la animación.");
                        return;
                    }

                    const frames = await extractFramesFromImage(imageUrl, cols, rows);

                    const animAssetName = `${assetName.split('.')[0]}.cea`;
                    const animData = {
                        name: animAssetName,
                        animations: [{
                            name: "default",
                            speed: speed,
                            loop: true,
                            frames: frames
                        }]
                    };

                    await createAssetCallback(animAssetName, JSON.stringify(animData, null, 2), dirHandle);
                    window.Dialogs.showNotification("Éxito", `Asset de animación "${animAssetName}" creado.`);
                    if(updateAssetBrowserCallback) updateAssetBrowserCallback();
                });
            }

            const imgElement = document.getElementById('inspector-preview-img');
            if (imgElement && assetPath) {
                const url = await getURLForAssetPath(assetPath, projectsDirHandle);
                if (url) imgElement.src = url;
            }
        } else if (assetName.endsWith('.cea')) {
            const animData = JSON.parse(content);
            const anim = animData.animations[0]; // Assume first animation

            const previewContainer = document.createElement('div');
            previewContainer.className = 'inspector-anim-preview';

            const frameCount = document.createElement('p');
            frameCount.textContent = `Fotogramas: ${anim.frames.length}`;

            const timeline = document.createElement('div');
            timeline.className = 'mini-timeline';
            anim.frames.forEach(frameSrc => {
                const img = document.createElement('img');
                img.src = frameSrc; // These are data URLs from the .cea file
                timeline.appendChild(img);
            });

            const controls = document.createElement('div');
            const playBtn = document.createElement('button');
            playBtn.textContent = '▶️ Play';

            let isPlaying = false;
            let playbackId = null;
            let currentFrame = 0;

            playBtn.addEventListener('click', () => {
                isPlaying = !isPlaying;
                if (isPlaying) {
                    playBtn.textContent = '⏹️ Stop';
                    let lastTime = performance.now();

                    function loop(time) {
                        if (!isPlaying) return;
                        if (time - lastTime > (1000 / anim.speed)) {
                            lastTime = time;
                            currentFrame = (currentFrame + 1) % anim.frames.length;
                            timeline.childNodes.forEach((node, i) => node.style.border = i === currentFrame ? '2px solid var(--accent-color)' : 'none');
                        }
                       playbackId = requestAnimationFrame(loop);
                    }
                    playbackId = requestAnimationFrame(loop);

                } else {
                    playBtn.textContent = '▶️ Play';
                    cancelAnimationFrame(playbackId);
                    timeline.childNodes.forEach(node => node.style.border = 'none');
                }
            });

            controls.appendChild(playBtn);
            previewContainer.appendChild(frameCount);
            previewContainer.appendChild(timeline);
            previewContainer.appendChild(controls);
            dom.inspectorContent.appendChild(previewContainer);

        } else if (assetName.endsWith('.cep')) {
            try {
                const zip = await JSZip.loadAsync(file);
                const manifestFile = zip.file('manifest.json');
                if (manifestFile) {
                    const manifestContent = await manifestFile.async('string');
                    const manifestData = JSON.parse(manifestContent);

                    const packageInfo = document.createElement('div');
                    packageInfo.className = 'asset-settings';
                    packageInfo.innerHTML = `
                        <label>Tipo de Paquete</label>
                        <input type="text" value="${manifestData.type === 'project' ? 'Proyecto Completo' : 'Asset'}" readonly>
                        <label>Descripción</label>
                        <textarea readonly rows="5">${manifestData.description || 'Sin descripción.'}</textarea>
                    `;
                    dom.inspectorContent.appendChild(packageInfo);
                } else {
                    dom.inspectorContent.innerHTML += `<p class="error-message">Este paquete .cep no es válido (falta manifest.json).</p>`;
                }
            } catch(e) {
                console.error("Error al leer el paquete .cep:", e);
                dom.inspectorContent.innerHTML += `<p class="error-message">No se pudo leer el archivo del paquete.</p>`;
            }

        } else if (assetName.endsWith('.ceui')) {
            const preview = document.createElement('div');
            preview.className = 'asset-preview';
            preview.innerHTML = `
                <img src="image/Paquete.png" class="asset-preview-icon">
                <p><strong>UI Asset</strong></p>
                <p>Doble-click en el Navegador para abrir en el Editor de UI.</p>
            `;
            dom.inspectorContent.appendChild(preview);
        } else if (assetName.endsWith('.ceanim')) {
            const preview = document.createElement('div');
            preview.className = 'asset-preview';
            preview.innerHTML = `
                <img src="image/animacion_controler.svg" class="asset-preview-icon">
                <p><strong>Animation Controller</strong></p>
                <p>Doble-click en el Navegador para abrir en el Editor de Animación.</p>
            `;
            dom.inspectorContent.appendChild(preview);
        } else if (assetName.endsWith('.ceScene')) {
            const preview = document.createElement('div');
            preview.className = 'asset-preview';
            preview.innerHTML = `
                <span class="asset-preview-icon" style="font-size: 48px;">🎬</span>
                <p><strong>Scene</strong></p>
                <p>Doble-click en el Navegador para abrir la escena.</p>
            `;
            dom.inspectorContent.appendChild(preview);
        } else if (assetName.endsWith('.cmel')) {
            const materialData = JSON.parse(content);
            const settingsContainer = document.createElement('div');
            settingsContainer.className = 'asset-settings';
            let html = '';
            for (const key in materialData) {
                html += `<label>${key}</label><input type="text" value="${materialData[key]}" readonly>`;
            }
            settingsContainer.innerHTML = html;
            dom.inspectorContent.appendChild(settingsContainer);
        } else if (assetName.endsWith('.celib')) {
            const libData = JSON.parse(content);
            const preview = document.createElement('div');
            preview.className = 'asset-preview'; // Reutilizamos el estilo

            const iconSrc = libData.library_icon_base64 || 'image/Paquete.png';

            preview.innerHTML = `
                <img src="${iconSrc}" class="asset-preview-icon" style="width: 64px; height: 64px; border-radius: 5px;">
                <h3 style="margin-top: 10px; margin-bottom: 5px;">${libData.name || 'Librería sin nombre'}</h3>
                <p style="font-size: 0.9em; color: var(--color-text-secondary);">${libData.author || 'Autor desconocido'}</p>
                <hr style="margin: 10px 0;">
                <p>${libData.description || 'Sin descripción.'}</p>
                <p style="margin-top: 15px; font-style: italic; font-size: 0.8em;">Doble-click en el Navegador para abrir en el panel de Librerías.</p>
            `;
            dom.inspectorContent.appendChild(preview);
        } else if (assetName.endsWith('.sprt')) {
            const spriteSheetData = JSON.parse(content);
            const texturePath = spriteSheetData.texturePath;

            const previewContainer = document.createElement('div');
            previewContainer.className = 'sprt-preview-container';
            previewContainer.innerHTML = `<p><strong>Textura:</strong> ${texturePath}</p>`;

            const spriteGrid = document.createElement('div');
            spriteGrid.className = 'sprt-preview-grid';

            // Cargar la imagen de textura
            const imageUrl = await getURLForAssetPath(`Assets/${texturePath}`, projectsDirHandle);
            if (imageUrl) {
                const img = new Image();
                img.onload = () => {
                    for (const spriteName in spriteSheetData.sprites) {
                        const spriteData = spriteSheetData.sprites[spriteName];
                        const rect = spriteData.rect;

                        const spriteContainer = document.createElement('div');
                        spriteContainer.className = 'sprt-preview-item';

                        const canvas = document.createElement('canvas');
                        canvas.width = rect.width;
                        canvas.height = rect.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

                        const nameLabel = document.createElement('span');
                        nameLabel.textContent = spriteName;

                        spriteContainer.appendChild(canvas);
                        spriteContainer.appendChild(nameLabel);
                        spriteGrid.appendChild(spriteContainer);
                    }
                };
                img.src = imageUrl;
            } else {
                spriteGrid.innerHTML = `<p class="error-message">No se pudo cargar la imagen de textura: ${texturePath}</p>`;
            }

            previewContainer.appendChild(spriteGrid);
            dom.inspectorContent.appendChild(previewContainer);
        } else if (assetName.endsWith('.ceSprite')) {
            await renderCeSpriteInspector(content, dirHandle, assetPath);
        } else {
             dom.inspectorContent.innerHTML += `<p>No hay vista previa disponible para este tipo de archivo.</p>`;
        }

    } catch (error) {
        console.error(`Error al leer el asset '${assetName}':`, error);
        dom.inspectorContent.innerHTML += `<p class="error-message">No se pudo cargar el contenido del asset.</p>`;
    }
}

export async function showAddComponentModal() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    dom.componentList.innerHTML = '';
    const existingComponents = new Set(selectedMateria.leyes.map(ley => ley.constructor));
    const existingCustomComponents = new Set(selectedMateria.leyes
        .filter(ley => ley instanceof Components.CustomComponent)
        .map(ley => ley.definition.nombre)
    );
    const existingScripts = new Set(selectedMateria.leyes.filter(ley => ley instanceof Components.CreativeScript).map(ley => ley.scriptName));

    // --- 1. Render Built-in Components ---
    for (const category in availableComponents) {
        if (category === 'Scripting') continue;
        const categoryHeader = document.createElement('h4');
        categoryHeader.textContent = category;
        dom.componentList.appendChild(categoryHeader);

        availableComponents[category].forEach(ComponentClass => {
            if (existingComponents.has(ComponentClass)) return;
            const componentItem = document.createElement('div');
            componentItem.className = 'component-item';
            componentItem.textContent = ComponentClass.name;
            componentItem.addEventListener('click', () => {
                const newComponent = new ComponentClass(selectedMateria);
                selectedMateria.addComponent(newComponent);

                // If a UI component is added, ensure it has a UITransform
                // and remove the standard Transform to avoid conflicts.
                if (newComponent instanceof Components.UIImage || newComponent instanceof Components.UIText || newComponent instanceof Components.Button) {
                    if (!selectedMateria.getComponent(Components.UITransform)) {
                        const existingTransform = selectedMateria.getComponent(Components.Transform);
                        if (existingTransform) {
                            selectedMateria.removeComponent(Components.Transform);
                        }
                        selectedMateria.addComponent(new Components.UITransform(selectedMateria));
                    }
                }

                dom.addComponentModal.classList.remove('is-open');
                updateInspector();
            });
            dom.componentList.appendChild(componentItem);
        });
    }

    // --- 2. Render Custom Components ---
    const customComponentDefinitions = getCustomComponentDefinitions();
    if (customComponentDefinitions.size > 0) {
        const customHeader = document.createElement('h4');
        customHeader.textContent = 'Componentes Personalizados';
        dom.componentList.appendChild(customHeader);

        for (const [name, definition] of customComponentDefinitions.entries()) {
            if (existingCustomComponents.has(name)) continue;

            const componentItem = document.createElement('div');
            componentItem.className = 'component-item';
            componentItem.textContent = name;
            componentItem.addEventListener('click', () => {
                const newComponent = new Components.CustomComponent(definition);
                selectedMateria.addComponent(newComponent);
                dom.addComponentModal.classList.remove('is-open');
                updateInspector();
            });
            dom.componentList.appendChild(componentItem);
        }
    }


    // --- 3. Show the modal Immediately ---
    dom.addComponentModal.classList.add('is-open');

    // --- 3. Find and Render Custom Scripts Asynchronously ---
    const scriptsCategoryHeader = document.createElement('h4');
    scriptsCategoryHeader.textContent = 'Scripts';
    dom.componentList.appendChild(scriptsCategoryHeader);

    const placeholder = document.createElement('p');
    placeholder.className = 'script-scan-status';
    dom.componentList.appendChild(placeholder);

    if (!projectsDirHandle) {
        placeholder.textContent = "No se ha seleccionado un directorio de proyecto.";
        return;
    }
    if (isScanningForComponents) {
        placeholder.textContent = 'Escaneo de scripts ya en progreso...';
        return;
    }

    isScanningForComponents = true;
    placeholder.textContent = 'Buscando scripts...';

    try {
        const scriptFiles = [];
        async function findScriptFiles(dirHandle) {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.ces')) {
                    scriptFiles.push(entry);
                } else if (entry.kind === 'directory') {
                    try {
                        await findScriptFiles(entry);
                    } catch (e) {
                        console.warn(`No se pudo acceder al directorio '${entry.name}'. Saltando.`);
                    }
                }
            }
        }

        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
        await findScriptFiles(assetsHandle);

        placeholder.remove();

        if (scriptFiles.length === 0) {
            dom.componentList.appendChild(Object.assign(document.createElement('p'), { textContent: "No se encontraron scripts (.ces) en la carpeta Assets." }));
        } else {
            scriptFiles.forEach(fileHandle => {
                if (existingScripts.has(fileHandle.name)) return;
                const componentItem = document.createElement('div');
                componentItem.className = 'component-item';
                componentItem.textContent = fileHandle.name;
                componentItem.addEventListener('click', () => {
                    const newScript = new Components.CreativeScript(selectedMateria, fileHandle.name);
                    selectedMateria.addComponent(newScript);
                    dom.addComponentModal.classList.remove('is-open');
                    updateInspector();
                });
                dom.componentList.appendChild(componentItem);
            });
        }
    } catch (error) {
        console.error("Error crítico durante el escaneo de scripts:", error);
        placeholder.textContent = "Error al buscar scripts.";
        placeholder.className += ' error-message';
    } finally {
        isScanningForComponents = false;
    }
}

function extractFramesFromImage(imageUrl, cols, rows) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;

        img.onload = () => {
            const frames = [];
            const frameWidth = img.naturalWidth / cols;
            const frameHeight = img.naturalHeight / rows;
            const canvas = document.createElement('canvas');
            canvas.width = frameWidth;
            canvas.height = frameHeight;
            const ctx = canvas.getContext('2d');

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    ctx.clearRect(0, 0, frameWidth, frameHeight);
                    const sx = c * frameWidth;
                    const sy = r * frameHeight;
                    ctx.drawImage(img, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
                    frames.push(canvas.toDataURL('image/png'));
                }
            }
            resolve(frames);
        };
        img.onerror = () => reject(new Error("No se pudo cargar la imagen para extraer los fotogramas."));
    });
}

async function renderCeSpriteInspector(content, dirHandle, assetPath) {
    try {
        const spriteAsset = JSON.parse(content);
        const sourceImageName = spriteAsset.sourceImage;
        const sprites = spriteAsset.sprites;

        const container = document.createElement('div');
        container.className = 'cesprite-inspector';

        const sourceImageLabel = document.createElement('p');
        sourceImageLabel.innerHTML = `<strong>Source Image:</strong> ${sourceImageName}`;
        container.appendChild(sourceImageLabel);

        const createAnimButton = document.createElement('button');
        createAnimButton.textContent = 'Crear Animación';
        createAnimButton.className = 'primary-btn';
        createAnimButton.style.width = '100%';
        createAnimButton.style.marginTop = '10px';
        createAnimButton.addEventListener('click', () => openAnimationCreatorModal(spriteAsset, sourceImageUrl));
        container.appendChild(createAnimButton);

        const gallery = document.createElement('div');
        gallery.className = 'cesprite-gallery';
        container.appendChild(gallery);

        dom.inspectorContent.appendChild(container);

        const sourceImageUrl = await getURLForAssetPath(`Assets/${sourceImageName}`, projectsDirHandle);
        if (!sourceImageUrl) {
            gallery.innerHTML = '<p class="error-message">Could not load source image.</p>';
            return;
        }

        const img = new Image();
        img.onload = () => {
            for (const spriteName in sprites) {
                const spriteData = sprites[spriteName];
                const rect = spriteData.rect;

                const spriteItem = document.createElement('div');
                spriteItem.className = 'gallery-item';
                spriteItem.draggable = true; // Make it draggable
                spriteItem.addEventListener('dragstart', (e) => {
                    const dragData = {
                        type: 'sprite',
                        assetPath: assetPath, // The path to the .ceSprite file
                        spriteName: spriteName
                    };
                    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                });


                const canvas = document.createElement('canvas');
                canvas.width = rect.width;
                canvas.height = rect.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

                spriteItem.appendChild(canvas);
                gallery.appendChild(spriteItem);
            }
        };
        img.src = sourceImageUrl;

    } catch (error) {
        console.error("Failed to render .ceSprite inspector:", error);
        dom.inspectorContent.innerHTML += `<p class="error-message">Failed to parse .ceSprite file.</p>`;
    }
}
function openAnimationCreatorModal(spriteAsset, sourceImageUrl) {
    const modal = dom.animationFromSpriteModal;
    const gallery = dom.animSpriteSelectionGallery;
    const timeline = dom.animSpriteTimeline;
    const createBtn = dom.animSpriteCreateBtn;
    const clearBtn = dom.animSpriteClearBtn;
    const closeBtn = modal.querySelector('.close-panel-btn');

    gallery.innerHTML = '';
    timeline.innerHTML = '';
    let selectedFrames = [];

    const sourceImage = new Image();
    sourceImage.onload = () => {
        // Populate the selection gallery
        for (const spriteName in spriteAsset.sprites) {
            const spriteData = spriteAsset.sprites[spriteName];
            const rect = spriteData.rect;

            const canvas = document.createElement('canvas');
            canvas.width = rect.width;
            canvas.height = rect.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(sourceImage, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.appendChild(canvas);
            galleryItem.addEventListener('click', () => {
                addFrameToTimeline(canvas.toDataURL(), spriteName);
            });
            gallery.appendChild(galleryItem);
        }
    };
    sourceImage.src = sourceImageUrl;

    function addFrameToTimeline(imageDataUrl, spriteName) {
        const frameDiv = document.createElement('div');
        frameDiv.className = 'timeline-frame';
        const img = document.createElement('img');
        img.src = imageDataUrl;
        frameDiv.appendChild(img);
        timeline.appendChild(frameDiv);
        selectedFrames.push({ spriteName: spriteName, dataUrl: imageDataUrl });
    }

    // --- Event Listeners (cloned to avoid duplicates) ---
    const newCreateBtn = createBtn.cloneNode(true);
    createBtn.parentNode.replaceChild(newCreateBtn, createBtn);
    newCreateBtn.addEventListener('click', async () => {
        if (selectedFrames.length === 0) {
            window.Dialogs.showNotification("Aviso", "Añade al menos un frame a la animación.");
            return;
        }

        const animName = prompt("Nombre para el nuevo clip de animación:", "New Animation");
        if (!animName) return;

        const animClipAsset = {
            name: animName,
            speed: 10, // Default speed
            loop: true,
            frames: selectedFrames.map(frame => ({
                spriteAssetPath: `Assets/${spriteAsset.sourceImage.replace(/\.[^/.]+$/, ".ceSprite")}`,
                spriteName: frame.spriteName
            }))
        };

        const assetName = `${animName}.ceanimclip`;
        const dirHandle = currentDirectoryHandle();
        await createAssetCallback(assetName, JSON.stringify(animClipAsset, null, 2), dirHandle);
        updateAssetBrowserCallback();
        modal.classList.add('hidden');
    });

    const newClearBtn = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
    newClearBtn.addEventListener('click', () => {
        timeline.innerHTML = '';
        selectedFrames = [];
    });

    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.classList.remove('hidden');
}

// Helper function to save the project configuration, adapted from ProjectSettingsWindow
async function saveProjectConfig() {
    if (!projectsDirHandle) {
        console.error("No se puede guardar la configuración: el directorio del proyecto no está disponible.");
        return;
    }
    const config = getCurrentProjectConfig();
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const configFileHandle = await projectHandle.getFileHandle('project.ceconfig', { create: true });
        const writable = await configFileHandle.createWritable();
        await writable.write(JSON.stringify(config, null, 2));
        await writable.close();
        console.log("Configuración del proyecto guardada desde el Inspector.");
    } catch (error) {
        console.error("Error al guardar la configuración del proyecto desde el Inspector:", error);
        showNotification('Error', 'No se pudo guardar la configuración del proyecto.');
    }
}
