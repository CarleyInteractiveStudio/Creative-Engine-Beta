import * as Components from '../../engine/Components.js';
import { getURLForAssetPath } from '../../engine/AssetUtils.js';
import * as SpriteSlicer from './SpriteSlicerWindow.js';

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

const markdownConverter = new showdown.Converter();

const availableComponents = {
    'Renderizado': [Components.SpriteRenderer],
    'Tilemap': [Components.Grid, Components.Tilemap, Components.TilemapRenderer, Components.TilemapCollider2D],
    'Iluminación': [Components.PointLight2D, Components.SpotLight2D, Components.FreeformLight2D, Components.SpriteLight2D],
    'Animación': [Components.Animator],
    'Cámara': [Components.Camera],
    'Físicas': [Components.Rigidbody2D, Components.BoxCollider2D, Components.CompositeCollider2D],
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
    extractFramesFromSheetCallback = dependencies.extractFramesFromSheetCallback;
    updateSceneCallback = dependencies.updateSceneCallback;
    updateAssetBrowserCallback = dependencies.updateAssetBrowserCallback;
    createAssetCallback = dependencies.createAssetCallback;
    getCurrentProjectConfig = dependencies.getCurrentProjectConfig;

    dom.inspectorContent.addEventListener('input', handleInspectorInput);
    dom.inspectorContent.addEventListener('change', handleInspectorChange);
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
    if (isNaN(value)) return;

    const ComponentClass = Components[componentName];
    if (!ComponentClass) return;
    const component = selectedMateria.getComponent(ComponentClass);
    if (!component) return;

    const props = propPath.split('.');
    let current = component;
    for (let i = 0; i < props.length - 1; i++) {
        current = current[props[i]];
    }
    current[props[props.length - 1]] = value;
}

async function handleInspectorChange(e) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;
    let needsUpdate = false;

    if (e.target.matches('#materia-active-toggle')) {
        selectedMateria.isActive = e.target.checked;
        needsUpdate = true;
    } else if (e.target.matches('#materia-name-input')) {
         selectedMateria.name = e.target.value;
         needsUpdate = true;
    } else if (e.target.matches('#materia-layer-select')) {
        selectedMateria.layer = parseInt(e.target.value, 10);
    } else if (e.target.matches('#materia-tag-select')) {
        selectedMateria.tag = e.target.value;
    }

    if (e.target.matches('.inspector-re-render')) {
        const componentName = e.target.dataset.component;
        const propPath = e.target.dataset.prop;
        const value = e.target.value;
        const ComponentClass = Components[componentName];
        if (ComponentClass) {
            const component = selectedMateria.getComponent(ComponentClass);
            if (component) {
                component[propPath] = value;
                needsUpdate = true;
            }
        }
    }

    if (needsUpdate) {
        updateSceneCallback();
        setTimeout(updateInspector, 0);
    }
}

function handleInspectorClick(e) {
    const selectedMateria = getSelectedMateria();

    if (e.target.matches('#add-component-btn')) {
        showAddComponentModal();
    }
    if (e.target.matches('[data-action="generate-colliders"]')) {
        const collider = selectedMateria.getComponent(Components.TilemapCollider2D);
        if (collider) {
            collider.generate();
            updateInspector();
        }
    }
}

// --- Core Functions ---
export async function updateInspector() {
    if (!dom.inspectorContent) return;
    dom.inspectorContent.innerHTML = '';

    const selectedMateria = getSelectedMateria();
    if (selectedMateria) {
        await updateInspectorForMateria(selectedMateria);
    } else {
        dom.inspectorContent.innerHTML = '<p class="inspector-placeholder">Nada seleccionado</p>';
    }
}

async function updateInspectorForMateria(materia) {
    const config = getCurrentProjectConfig();
    dom.inspectorContent.innerHTML = `
        <div class="inspector-materia-header">
            <input type="checkbox" id="materia-active-toggle" title="Activar/Desactivar Materia" ${materia.isActive ? 'checked' : ''}>
            <input type="text" id="materia-name-input" value="${materia.name}">
        </div>`;

    const componentsWrapper = document.createElement('div');
    componentsWrapper.className = 'inspector-components-wrapper';

    materia.leyes.forEach(ley => {
        let componentHTML = '';
        const componentName = ley.constructor.name;

        if (ley instanceof Components.Transform) {
            componentHTML = `
                <div class="component-header"><h4>Transform</h4></div>
                <div class="component-content">
                    <div class="prop-row-multi"><label>Position</label><div class="prop-inputs">
                        <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="position.x" value="${ley.position.x}">
                        <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="position.y" value="${ley.position.y}">
                    </div></div>
                    <div class="prop-row-multi"><label>Rotation</label><div class="prop-inputs">
                        <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="rotation" value="${ley.rotation || 0}">
                    </div></div>
                    <div class="prop-row-multi"><label>Scale</label><div class="prop-inputs">
                        <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.x" value="${ley.scale.x}">
                        <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.y" value="${ley.scale.y}">
                    </div></div>
                </div>`;
        } else if (ley instanceof Components.Grid) {
            componentHTML = `
                <div class="component-header"><h4>Grid</h4></div>
                <div class="component-content">
                     <div class="prop-row-multi"><label>Cell Size</label><div class="prop-inputs">
                        <input type="number" class="prop-input" step="1" min="1" data-component="Grid" data-prop="cellSize.x" value="${ley.cellSize.x}">
                        <input type="number" class="prop-input" step="1" min="1" data-component="Grid" data-prop="cellSize.y" value="${ley.cellSize.y}">
                    </div></div>
                </div>`;
        } else if (ley instanceof Components.Tilemap) {
            componentHTML = `
                <div class="component-header"><h4>Tilemap</h4></div>
                <div class="component-content">
                     <div class="prop-row-multi"><label>Size</label><div class="prop-inputs">
                        <input type="number" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="width" value="${ley.width}">
                        <input type="number" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="height" value="${ley.height}">
                    </div></div>
                </div>`;
        } else if (ley instanceof Components.TilemapRenderer) {
            componentHTML = `<div class="component-header"><h4>Tilemap Renderer</h4></div>`;
        } else if (ley instanceof Components.TilemapCollider2D) {
            componentHTML = `
                <div class="component-header"><h4>Tilemap Collider 2D</h4></div>
                <div class="component-content">
                    <button class="primary-btn" data-action="generate-colliders" style="width: 100%;">Generar Colisionadores</button>
                    <p class="field-description" style="margin-top: 8px;">Colisionadores generados: ${ley.generatedColliders.length}</p>
                </div>`;
        }
        // Add other components here as needed, keeping them simple.

        if (componentHTML) {
            const el = document.createElement('div');
            el.className = 'component-inspector';
            el.innerHTML = componentHTML;
            componentsWrapper.appendChild(el);
        }
    });

    dom.inspectorContent.appendChild(componentsWrapper);
    dom.inspectorContent.innerHTML += `<button id="add-component-btn" class="add-component-btn">Añadir Ley</button>`;
}

export async function showAddComponentModal() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;
    dom.componentList.innerHTML = '';
    const existingComponents = new Set(selectedMateria.leyes.map(ley => ley.constructor));

    for (const category in availableComponents) {
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
                dom.addComponentModal.classList.remove('is-open');
                updateInspector();
            });
            dom.componentList.appendChild(componentItem);
        });
    }
    dom.addComponentModal.classList.add('is-open');
}
