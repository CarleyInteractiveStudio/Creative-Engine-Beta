import * as Components from '../../engine/Components.js';
import { getURLForAssetPath } from '../../engine/AssetUtils.js';

// --- Module State ---
let dom;
let projectsDirHandle;
let currentDirectoryHandle;
let getSelectedMateria;
let getSelectedAsset;
let openSpriteSelectorCallback;
let saveAssetMetaCallback;
let updateSceneCallback;
let updateAssetBrowserCallback;
let isScanningForComponents = false;
let getCurrentProjectConfig = () => ({}); // To access layers

const markdownConverter = new showdown.Converter();

const availableComponents = {
    'Renderizado': [Components.SpriteRenderer],
    'Tilemap': [Components.Tilemap, Components.TilemapRenderer],
    'Iluminación': [Components.PointLight2D, Components.SpotLight2D, Components.FreeformLight2D, Components.SpriteLight2D],
    'Animación': [Components.Animator],
    'Cámara': [Components.Camera],
    'Físicas': [Components.Rigidbody, Components.BoxCollider, Components.TilemapCollider2D],
    'UI': [Components.RectTransform, Components.UIImage, Components.UICanvas],
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
    updateSceneCallback = dependencies.updateSceneCallback;
    updateAssetBrowserCallback = dependencies.updateAssetBrowserCallback;
    getCurrentProjectConfig = dependencies.getCurrentProjectConfig;

    // The inspector is mostly updated by other modules, but we can set up a general event listener for inputs.
    dom.inspectorContent.addEventListener('input', handleInspectorInput);
    dom.inspectorContent.addEventListener('change', handleInspectorChange); // For dropdowns/checkboxes
    dom.inspectorContent.addEventListener('click', handleInspectorClick);
}

// --- Event Handlers ---
function handleInspectorInput(e) {
    if (!e.target.matches('.prop-input')) return;

    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const componentName = e.target.dataset.component;
    const propPath = e.target.dataset.prop;
    let value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;

    const ComponentClass = Components[componentName];
    if (!ComponentClass) return;

    const component = selectedMateria.getComponent(ComponentClass);
    if (!component) return;

    // Handle nested properties like scale.x
    const props = propPath.split('.');
    let current = component;
    for (let i = 0; i < props.length - 1; i++) {
        current = current[props[i]];
    }
    current[props[props.length - 1]] = value;
}

function handleInspectorChange(e) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    let needsUpdate = false;

    if (e.target.matches('#materia-active-toggle')) {
        selectedMateria.isActive = e.target.checked;
        updateSceneCallback(); // This triggers a visual update in the scene/hierarchy
        needsUpdate = true;
    } else if (e.target.matches('#materia-name-input')) {
         selectedMateria.name = e.target.value;
         // A dedicated callback to update hierarchy would be ideal
         updateSceneCallback();
         needsUpdate = true;
    } else if (e.target.matches('#materia-layer-select')) {
        selectedMateria.layer = parseInt(e.target.value, 10);
        needsUpdate = true;
    } else if (e.target.matches('#materia-tag-select')) {
        selectedMateria.tag = e.target.value;
        needsUpdate = true;
    }

    // Handle component property changes that require a re-render of the inspector
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
            const expectedType = dropper.dataset.assetType;

            if (data.name.endsWith(expectedType)) {
                if (selectedMateria) {
                    const componentName = dropper.dataset.component;
                    const propName = dropper.dataset.prop;
                    const component = selectedMateria.getComponent(Components[componentName]);
                    if (component) {
                        component[propName] = data.path; // Set the asset path

                        // If it's a tilemap, trigger the palette reload
                        if (component instanceof Components.Tilemap) {
                            const renderer = selectedMateria.getComponent(Components.TilemapRenderer);
                            if (renderer) {
                                await renderer.loadPalette(projectsDirHandle);
                            }
                        }

                        updateInspector(); // Redraw the inspector to show the new path
                    }
                }
            } else {
                alert(`Asset incorrecto. Se esperaba un archivo ${expectedType}.`);
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
                alert("No se puede eliminar la última capa.");
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

async function updateInspectorForMateria(selectedMateria) {
    console.log('--- INSPECTOR UPDATE ---');
    console.log('1. Updating for Materia:', selectedMateria.name, `(ID: ${selectedMateria.id})`);

    const config = getCurrentProjectConfig();

    // Name input and active toggle
    dom.inspectorContent.innerHTML = `
        <div class="inspector-materia-header">
            <input type="checkbox" id="materia-active-toggle" title="Activar/Desactivar Materia" ${selectedMateria.isActive ? 'checked' : ''}>
            <input type="text" id="materia-name-input" value="${selectedMateria.name}">
        </div>
        <div class="inspector-row">
            <label for="materia-tag-select">Tag</label>
            <select id="materia-tag-select"></select>
        </div>
        <div class="inspector-row">
            <label for="materia-layer-select">Layer</label>
            <select id="materia-layer-select"></select>
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
    }

    const componentIcons = {
        Transform: '✥', Rigidbody: '🏋️', BoxCollider: '🟩', SpriteRenderer: '🖼️',
        Animator: '🏃', Camera: '📷', CreativeScript: 'image/Script.png',
        RectTransform: '⎚', UICanvas: '🖼️', UIImage: '🏞️', PointLight2D: '💡', SpotLight2D: '🔦', FreeformLight2D: '✏️', SpriteLight2D: '🎇'
    };

    const componentsWrapper = document.createElement('div');
    componentsWrapper.className = 'inspector-components-wrapper';
    console.log('2. Created componentsWrapper. Looping through components...');

    selectedMateria.leyes.forEach((ley, index) => {
        console.log(`3. Processing component #${index}: ${ley.constructor.name}`);
        let componentHTML = '';
        const componentName = ley.constructor.name;
        const icon = componentIcons[componentName] || '⚙️';
        const iconHTML = icon.includes('.png') ? `<img src="${icon}" class="component-icon">` : `<span class="component-icon">${icon}</span>`;

        if (ley instanceof Components.Transform) {
            console.log('  - Is Transform component.');
            if (selectedMateria.getComponent(Components.RectTransform)) {
                console.log('  - RectTransform also exists, skipping render of Transform.');
                return;
            }
            componentHTML = `
            <div class="component-inspector">
                <div class="component-header">${iconHTML}<h4>Transform</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Position</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="x" value="${ley.x}" title="Position X">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="y" value="${ley.y}" title="Position Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Rotation</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="rotation" value="${ley.rotation || 0}" title="Rotation Z">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Scale</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.x" value="${ley.scale.x}" title="Scale X">
                            <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.y" value="${ley.scale.y}" title="Scale Y">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.RectTransform) {
             console.log('  - Is RectTransform component.');
             componentHTML = `<div class="component-header">${iconHTML}<h4>Rect Transform</h4></div>
            <div class="component-content">
                <div class="prop-row-multi"><label>X</label><input type="number" class="prop-input" data-component="RectTransform" data-prop="x" value="${ley.x}"></div>
                <div class="prop-row-multi"><label>Y</label><input type="number" class="prop-input" data-component="RectTransform" data-prop="y" value="${ley.y}"></div>
                <div class="prop-row-multi"><label>Width</label><input type="number" class="prop-input" data-component="RectTransform" data-prop="width" value="${ley.width}"></div>
                <div class="prop-row-multi"><label>Height</label><input type="number" class="prop-input" data-component="RectTransform" data-prop="height" value="${ley.height}"></div>
            </div>`;
        } else if (ley instanceof Components.UIImage) {
            const previewImg = ley.sprite.src ? `<img src="${ley.sprite.src}" alt="Preview">` : 'None';
            componentHTML = `<div class="component-header">${iconHTML}<h4>UI Image</h4></div>
            <div class="component-content">
                <div class="prop-row-multi"><label>Source</label><div class="sprite-dropper"><div class="sprite-preview">${previewImg}</div><button class="sprite-select-btn" data-component="UIImage">🎯</button></div></div>
                <div class="prop-row-multi"><label>Color</label><input type="color" class="prop-input" data-component="UIImage" data-prop="color" value="${ley.color}"></div>
            </div>`;
        }
        else if (ley instanceof Components.SpriteRenderer) {
            const previewImg = ley.sprite.src ? `<img src="${ley.sprite.src}" alt="Preview">` : 'None';
            let spriteSelectorHTML = '';

            // Si hay una hoja de sprites cargada, muestra el desplegable para seleccionar un sprite
            if (ley.spriteSheet && Object.keys(ley.spriteSheet.sprites).length > 0) {
                const options = Object.keys(ley.spriteSheet.sprites).map(spriteName =>
                    `<option value="${spriteName}" ${ley.spriteName === spriteName ? 'selected' : ''}>${spriteName}</option>`
                ).join('');

                spriteSelectorHTML = `
                    <div class="prop-row-multi">
                        <label for="sprite-name-select">Sprite</label>
                        <div class="prop-inputs">
                            <select id="sprite-name-select" class="prop-input inspector-re-render" data-component="SpriteRenderer" data-prop="spriteName">
                                ${options}
                            </select>
                        </div>
                    </div>
                `;
            }

            componentHTML = `<div class="component-header">${iconHTML}<h4>Sprite Renderer</h4></div>
             <div class="component-content">
                <div class="prop-row-multi">
                    <label>Source</label>
                    <div class="sprite-dropper">
                        <div class="sprite-preview">${previewImg}</div>
                        <button class="sprite-select-btn" data-component="SpriteRenderer">🎯</button>
                    </div>
                </div>
                ${spriteSelectorHTML}
                <div class="prop-row-multi">
                    <label>Color</label>
                    <input type="color" class="prop-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color}">
                </div>
            </div>`;
        }
        else if (ley instanceof Components.CreativeScript) {
            componentHTML = `<div class="component-header">${iconHTML}<h4>${ley.scriptName}</h4></div>`;
        } else if (ley instanceof Components.Animator) {
            componentHTML = `<div class="component-header">${iconHTML}<h4>Animator</h4></div><div class="component-content"><p>Controller: ${ley.controllerPath || 'None'}</p></div>`;
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
            componentHTML = `
                <div class="component-header">
                    <span class="component-icon">🗺️</span><h4>Tilemap</h4>
                </div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Palette</label>
                        <div class="asset-dropper" data-component="Tilemap" data-prop="palettePath" data-asset-type=".cepalette" title="Arrastra un asset de Paleta de Tiles (.cepalette) aquí">
                            <span class="asset-dropper-text">${ley.palettePath || 'None'}</span>
                        </div>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label>Tile Size</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="tileWidth" value="${ley.tileWidth}" title="Tile Width">
                            <input type="number" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="tileHeight" value="${ley.tileHeight}" title="Tile Height">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>Grid Size</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="columns" value="${ley.columns}" title="Columns">
                            <input type="number" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="rows" value="${ley.rows}" title="Rows">
                        </div>
                    </div>
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
                                    <span>${layer.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
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
            } catch (e) { /* Meta file doesn't exist, it will be created on first change. */ }

            metaData.importType = metaData.importType || 'Sprite (2D/UI)';
            metaData.grid = metaData.grid || { columns: 1, rows: 1 };

            const settingsContainer = document.createElement('div');
            settingsContainer.className = 'asset-settings';
            settingsContainer.innerHTML = `
                <label for="import-type">Tipo de Importación</label>
                <select id="import-type">
                    <option value="Sprite (2D/UI)" ${metaData.importType === 'Sprite (2D/UI)' ? 'selected' : ''}>Sprite (2D/UI)</option>
                    <option value="Animation Sheet" ${metaData.importType === 'Animation Sheet' ? 'selected' : ''}>Hoja de Animación</option>
                </select>
                <div id="animation-sheet-settings" class="sub-settings ${metaData.importType === 'Animation Sheet' ? '' : 'hidden'}">
                    <hr>
                    <h4>Configuración de Hoja de Sprites</h4>
                    <div class="prop-row"><label for="sprite-columns">Columnas</label><input type="number" id="sprite-columns" min="1" value="${metaData.grid.columns}"></div>
                    <div class="prop-row"><label for="sprite-rows">Filas</label><input type="number" id="sprite-rows" min="1" value="${metaData.grid.rows}"></div>
                    <button id="extract-frames-btn" style="width: 100%; margin-top: 10px;">Extraer Fotogramas</button>
                </div>
                <hr>
                <button id="save-meta-btn" class="primary-btn" style="width: 100%; margin-top: 10px;">Aplicar</button>
                <hr>
                <div class="preview-container"><img id="inspector-preview-img" src="" alt="Preview"></div>
            `;
            dom.inspectorContent.appendChild(settingsContainer);

            // --- Event Listeners for this specific inspector ---
            document.getElementById('import-type').addEventListener('change', (e) => {
                document.getElementById('animation-sheet-settings').classList.toggle('hidden', e.target.value !== 'Animation Sheet');
            });

            document.getElementById('save-meta-btn').addEventListener('click', async () => {
                metaData.importType = document.getElementById('import-type').value;
                if (metaData.importType === 'Animation Sheet') {
                    metaData.grid.columns = parseInt(document.getElementById('sprite-columns').value, 10) || 1;
                    metaData.grid.rows = parseInt(document.getElementById('sprite-rows').value, 10) || 1;
                }
                const dirHandle = currentDirectoryHandle();
                await saveAssetMetaCallback(assetName, metaData, dirHandle);
                alert("Metadatos guardados.");
            });

            document.getElementById('extract-frames-btn')?.addEventListener('click', async () => {
                const animName = prompt("Nombre para el nuevo Asset de Animación:", assetName.split('.')[0]);
                if (!animName) return;

                metaData.grid.columns = parseInt(document.getElementById('sprite-columns').value, 10) || 1;
                metaData.grid.rows = parseInt(document.getElementById('sprite-rows').value, 10) || 1;

                const dirHandle = currentDirectoryHandle();
                if (!dirHandle) {
                    alert("No se pudo obtener el directorio actual.");
                    return;
                }

                try {
                    // 1. Load the image
                    const imageUrl = await getURLForAssetPath(assetPath, projectsDirHandle);
                    if (!imageUrl) throw new Error("No se pudo obtener la URL de la imagen.");

                    const img = new Image();
                    img.crossOrigin = "Anonymous";

                    const imageLoadPromise = new Promise((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = () => reject(new Error("No se pudo cargar la imagen de la hoja de sprites."));
                        img.src = imageUrl;
                    });
                    await imageLoadPromise;

                    // 2. Extract frames
                    const frames = [];
                    const frameWidth = img.naturalWidth / metaData.grid.columns;
                    const frameHeight = img.naturalHeight / metaData.grid.rows;

                    const canvas = document.createElement('canvas');
                    canvas.width = frameWidth;
                    canvas.height = frameHeight;
                    const ctx = canvas.getContext('2d');

                    for (let r = 0; r < metaData.grid.rows; r++) {
                        for (let c = 0; c < metaData.grid.columns; c++) {
                            ctx.clearRect(0, 0, frameWidth, frameHeight);
                            const sx = c * frameWidth;
                            const sy = r * frameHeight;
                            ctx.drawImage(img, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
                            frames.push(canvas.toDataURL());
                        }
                    }

                    // 3. Create .cea content
                    const ceaContent = {
                        animations: [{
                            name: animName,
                            frames: frames,
                            speed: 10, // Default speed
                            loop: true // Default loop
                        }]
                    };

                    // 4. Save the new .cea file
                    const fileName = `${animName}.cea`;
                    const newFileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                    const writable = await newFileHandle.createWritable();
                    await writable.write(JSON.stringify(ceaContent, null, 2));
                    await writable.close();

                    console.log(`Creado el asset de animación: ${fileName}`);
                    alert(`Se ha creado el archivo de animación '${fileName}' con ${frames.length} fotogramas.`);

                    // 5. Refresh asset browser
                    if (updateAssetBrowserCallback) {
                        await updateAssetBrowserCallback();
                    }

                } catch (error) {
                    console.error("Error al extraer fotogramas:", error);
                    alert(`No se pudieron extraer los fotogramas: ${error.message}`);
                }
            });

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

                if (newComponent instanceof Components.UIImage || newComponent instanceof Components.UICanvas) {
                    if (!selectedMateria.getComponent(Components.RectTransform)) {
                        const existingTransform = selectedMateria.getComponent(Components.Transform);
                        if (existingTransform) selectedMateria.removeComponent(Components.Transform);
                        selectedMateria.addComponent(new Components.RectTransform(selectedMateria));
                    }
                }
                dom.addComponentModal.classList.remove('is-open');
                updateInspector();
            });
            dom.componentList.appendChild(componentItem);
        });
    }

    // --- 2. Show the modal Immediately ---
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