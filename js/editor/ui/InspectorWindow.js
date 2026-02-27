import * as Components from '../../engine/Components.js';
import * as UITransformUtils from '../../engine/UITransformUtils.js';
import { getURLForAssetPath } from '../../engine/AssetUtils.js';
import * as SpriteSlicer from './SpriteSlicerWindow.js';
import { getCustomComponentDefinitions } from '../EngineAPIExtension.js';
import * as CES_Transpiler from '../../editor/CES_Transpiler.js';
import { showPrompt, showNotification } from './DialogWindow.js';
import { TerrenoEditorWindow } from './TerrenoEditorWindow.js';

// --- Module State ---
let dom;
let projectsDirHandle;
let currentDirectoryHandle;
let getSelectedMateria;
let getSelectedAsset;
let openAssetSelectorCallback;
let saveAssetMetaCallback;
let extractFramesFromSheetCallback;
let updateSceneCallback;
let updateAssetBrowserCallback;
let createAssetCallback;
let onAssetOpened;
let isScanningForComponents = false;
let getCurrentProjectConfig = () => ({}); // To access layers
let enterAddTilemapLayerMode = () => {}; // Callback to notify SceneView

const markdownConverter = new showdown.Converter();

const availableComponents = {
    'CAT_RENDERIZADO': [Components.SpriteRenderer, Components.TextureRender, Components.DrawingOrder],
    'CAT_MAPA': [Components.Grid, Components.Tilemap, Components.TilemapRenderer, Components.Parallax, Components.Terreno2D],
    'CAT_ILUMINACION': [Components.PointLight2D, Components.SpotLight2D, Components.FreeformLight2D, Components.SpriteLight2D],
    'CAT_UTILIDADES': [Components.Gyzmo],
    'CAT_ANIMACION': [Components.Animator, Components.AnimatorController],
    'CAT_AUDIO': [Components.AudioSource],
    'CAT_FISICAS': [Components.Rigidbody2D, Components.BoxCollider2D, Components.CapsuleCollider2D, Components.PolygonCollider2D, Components.TilemapCollider2D, Components.TerrenoCollider2D, Components.LineCollider2D],
    'CAT_CAMARA': [Components.Camera],
    'CAT_UI': [Components.UITransform, Components.UIImage, Components.UIText, Components.Canvas, Components.Button, Components.VideoPlayer, Components.VerticalLayoutGroup, Components.HorizontalLayoutGroup, Components.GridLayoutGroup, Components.ContentSizeFitter],
    'CAT_BASICO': [Components.Movement, Components.CameraFollow, Components.ProjectileLauncher, Components.AutoDestroy, Components.Health, Components.Patrol, Components.ParticleSystem, Components.RaycastSource, Components.BasicAI, Components.VehicleController, Components.WheelSuspension],
    'CAT_SCRIPTING': [Components.CreativeScript]
};

const componentIcons = {
    Transform: 'move', Rigidbody2D: 'weight', BoxCollider2D: 'square', CapsuleCollider2D: 'pill', PolygonCollider2D: 'hexagon', SpriteRenderer: 'image',
    Animator: 'run', AnimatorController: 'gamepad', AudioSource: 'music', VideoPlayer: 'video', Camera: 'camera', CreativeScript: 'scroll',
    UITransform: 'box', UICanvas: 'image', UIImage: 'image', PointLight2D: 'lightbulb', SpotLight2D: 'flashlight', FreeformLight2D: 'pencil', SpriteLight2D: 'sparkles',
    Grid: 'grid', Tilemap: 'map', TilemapRenderer: 'brush', TilemapCollider2D: 'grid',
    Terreno2D: 'mountain', TerrenoCollider2D: 'mountain',
    Button: 'mouse-pointer', UIText: 'type', Canvas: 'image',
    VerticalLayoutGroup: 'layers', HorizontalLayoutGroup: 'layers', GridLayoutGroup: 'grid', ContentSizeFitter: 'maximize',
    Movement: 'run', CameraFollow: 'video', Parallax: 'mountain-snow', DrawingOrder: 'layers', ProjectileLauncher: 'rocket', AutoDestroy: 'timer', Health: 'heart', Patrol: 'route',
    Water: 'bucket', LineCollider2D: 'route',
    'ParticleSystem': 'sparkles',
    'Gyzmo': 'target',
    'RaycastSource': 'route',
    'BasicAI': 'bot',
    'VehicleController': 'truck',
    'WheelSuspension': 'disc'
};

const fileIcons = {
    png: 'image', jpg: 'image', jpeg: 'image',
    mp3: 'music', wav: 'music',
    mp4: 'video', webm: 'video', ogv: 'video',
    ceprefab: 'box',
    ceScene: 'clapperboard',
    ces: 'scroll',
    chc: 'bot',
    cea: 'clapperboard'
};

const getIconHTML = (iconName) => {
    if (!iconName) return '';
    if (iconName.startsWith('<')) return iconName;
    const path = iconName.includes('/') ? iconName : `icons/${iconName}.svg`;
    return `<img src="${path}" class="ce-icon">`;
};

const typeExtensionMap = {
    'Sprite': ['.png', '.jpg', '.jpeg', '.ceSprite'],
    'sprite': ['.png', '.jpg', '.jpeg', '.ceSprite'],
    'Audio': ['.mp3', '.wav'],
    'audio': ['.mp3', '.wav'],
    'Video': ['.mp4', '.webm', '.ogv'],
    'video': ['.mp4', '.webm', '.ogv'],
    'Prefab': ['.ceprefab'],
    'prefab': ['.ceprefab'],
    'Scene': ['.ceScene'],
    'escena': ['.ceScene'],
    'Font': ['.ttf', '.otf', '.woff', '.woff2'],
    'Animation': ['.ceanimclip', '.cea'],
    'animacion': ['.ceanimclip', '.cea'],
    'AnimatorController': ['.ceanim'],
    'controlador': ['.ceanim'],
    'CreativeScript': ['.ces', '.chc'],
    'script': ['.ces', '.chc'],
    'UI': ['.ceui'],
    'ui': ['.ceui'],
    'UIImage': ['.png', '.jpg', '.jpeg', '.ceSprite']
};

// --- Initialization ---
export function initialize(dependencies) {
    dom = dependencies.dom;
    dom.cullingMaskDropdown = document.getElementById('culling-mask-dropdown');
    projectsDirHandle = dependencies.projectsDirHandle;
    currentDirectoryHandle = dependencies.currentDirectoryHandle;
    getSelectedMateria = dependencies.getSelectedMateria;
    getSelectedAsset = dependencies.getSelectedAsset;
    openAssetSelectorCallback = dependencies.openAssetSelectorCallback;
    saveAssetMetaCallback = dependencies.saveAssetMetaCallback;
    extractFramesFromSheetCallback = dependencies.extractFramesFromSheetCallback;
    updateSceneCallback = dependencies.updateSceneCallback;
    updateAssetBrowserCallback = dependencies.updateAssetBrowserCallback;
    createAssetCallback = dependencies.createAssetCallback;
    onAssetOpened = dependencies.onAssetOpened;
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

    // Add drag and drop listeners for Property Droppers
    dom.inspectorContent.addEventListener('dragover', (e) => {
        const dropper = e.target.closest('.property-dropper');
        if (dropper) {
            e.preventDefault();
            dropper.classList.add('drag-over');
        }
    });
    dom.inspectorContent.addEventListener('dragleave', (e) => {
        const dropper = e.target.closest('.property-dropper');
        if (dropper) {
            dropper.classList.remove('drag-over');
        }
    });
    dom.inspectorContent.addEventListener('drop', handleInspectorDrop);
}

// --- Event Handlers ---

async function handleInspectorDrop(e) {
    const dropper = e.target.closest('.property-dropper');
    if (!dropper) return;

    const L = window.Localization;
    e.preventDefault();
    dropper.classList.remove('drag-over');

    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    let data;
    try {
        data = JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch {
        return;
    }

    const expectedType = dropper.dataset.expectedType;
    const componentName = dropper.dataset.component;
    const propName = dropper.dataset.prop;
    const scriptName = dropper.dataset.scriptName;
    const componentId = dropper.dataset.componentId;

    let valueToAssign = null;
    let isValid = false;

    if (data.type === 'Materia') {
        const droppedMateriaId = parseInt(data.id, 10);
        const droppedMateria = window.SceneManager.currentScene.findMateriaById(droppedMateriaId);

        if (!droppedMateria) return;

        if (expectedType === 'Materia' || expectedType === 'any') {
            valueToAssign = droppedMateriaId;
            isValid = true;
        } else if (expectedType === 'Tag' || expectedType === 'tag') {
            valueToAssign = droppedMateria.tag;
            isValid = true;
        } else if (expectedType === 'Layer' || expectedType === 'layer') {
            valueToAssign = droppedMateria.layer;
            isValid = true;
        } else {
            // --- Smart Component Search ---
            const typeToSearch = {
                'Sprite': Components.SpriteRenderer,
                'sprite': Components.SpriteRenderer,
                'Audio': Components.AudioSource,
                'audio': Components.AudioSource,
                'Animation': Components.Animator,
                'animacion': Components.Animator,
                'AnimatorController': Components.AnimatorController,
                'controlador': Components.AnimatorController,
                'UI': Components.UITransform,
                'ui': Components.UITransform,
                'UIImage': Components.UIImage,
                'imagen': Components.UIImage,
                'CreativeScript': Components.CreativeScript,
                'script': Components.CreativeScript,
                'Rigidbody2D': Components.Rigidbody2D,
                'fisica': Components.Rigidbody2D,
                'Camera': Components.Camera,
                'camara': Components.Camera,
                'RaycastSource': Components.RaycastSource,
                'rallo': Components.RaycastSource,
                'BasicAI': Components.BasicAI,
                'iaBasica': Components.BasicAI,
                'VehicleController': Components.VehicleController,
                'WheelSuspension': Components.WheelSuspension,
                'VideoPlayer': Components.VideoPlayer,
                'video': Components.VideoPlayer
            }[expectedType] || Components[expectedType];

            if (typeToSearch) {
                const component = droppedMateria.getComponent(typeToSearch);
                if (component) {
                    valueToAssign = droppedMateriaId;
                    isValid = true;
                } else {
                    // Si no encuentra el componente exacto, buscamos si tiene alguno que empiece por el nombre (para alias)
                    const found = droppedMateria.leyes.find(l => l.constructor.name === expectedType || l.constructor.name.toLowerCase() === expectedType.toLowerCase());
                    if (found) {
                        valueToAssign = droppedMateriaId;
                        isValid = true;
                    } else {
                        window.Dialogs.showNotification(L.get('COMPONENTE_FALTANTE', 'Componente Faltante'), L.get('OBJETO_SIN_COMPONENTE', "El objeto '{name}' no tiene un componente compatible con '{type}'.").replace('{name}', droppedMateria.name).replace('{type}', expectedType));
                    }
                }
            } else if (componentIcons[expectedType]) {
                const component = droppedMateria.getComponent(Components[expectedType]);
                if (component) {
                    valueToAssign = droppedMateriaId;
                    isValid = true;
                } else {
                    window.Dialogs.showNotification(L.get('COMPONENTE_FALTANTE', 'Componente Faltante'), L.get('OBJETO_SIN_COMPONENTE_EXACTO', "El objeto '{name}' no tiene un componente {type}.").replace('{name}', droppedMateria.name).replace('{type}', expectedType));
                }
            }
        }
    } else if (data.type === 'Asset') {
        if (data.kind === 'directory') {
             window.Dialogs.showNotification(L.get('ACCION_NO_PERMITIDA', 'Acción no permitida'), L.get('ERROR_ASIGNAR_CARPETA', 'No se pueden asignar carpetas a variables.'));
             return;
        }
        const fileExtension = `.${data.name.split('.').pop()}`.toLowerCase();

        if (typeExtensionMap[expectedType]) {
            if (typeExtensionMap[expectedType].includes(fileExtension)) {
                valueToAssign = data.path;
                isValid = true;
            } else {
                window.Dialogs.showNotification(L.get('TIPO_INCORRECTO', 'Tipo Incorrecto'), L.get('ERROR_TIPO_ARCHIVO', 'Se esperaba un archivo de tipo {types}.').replace('{types}', typeExtensionMap[expectedType].join(', ')));
            }
        } else if (expectedType === 'Materia' || expectedType === 'any') {
            valueToAssign = data.path;
            isValid = true;
        } else if (componentIcons[expectedType]) {
             window.Dialogs.showNotification(L.get('TIPO_INCORRECTO', 'Tipo Incorrecto'), L.get('ERROR_ESPERABA_ESCENA_COMPONENTE', 'Se esperaba un objeto de escena con el componente {type}.').replace('{type}', expectedType));
        }
    }

    if (isValid && valueToAssign !== null) {
        // Find the target component instance
        let targetComponent;
        if (componentName === 'CreativeScript') {
             targetComponent = selectedMateria.getComponents(Components.CreativeScript).find(s => s.scriptName === scriptName);
        } else if (componentName === 'CustomComponent') {
             targetComponent = selectedMateria.leyes.find(ley => ley instanceof Components.CustomComponent && ley.id == componentId);
        } else if (componentName) {
             targetComponent = selectedMateria.getComponent(Components[componentName]);
        } else {
             // Handle special cases without explicit componentName in dropper (like nested props)
             if (propName && propName.startsWith('onClick')) {
                 const button = selectedMateria.getComponent(Components.Button);
                 if (button) {
                     const parts = propName.split('.');
                     const index = parseInt(parts[1], 10);
                     if (!isNaN(index) && button.onClick[index]) {
                         button.onClick[index].targetMateriaId = valueToAssign;
                         updateInspector();
                         return;
                     }
                 }
             }
        }

        if (targetComponent) {
            const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
            if (targetComponent instanceof Components.CreativeScript || targetComponent instanceof Components.CustomComponent) {
                targetComponent.publicVars[propName] = valueToAssign;
            } else if ((targetComponent instanceof Components.SpriteRenderer || targetComponent instanceof Components.UIImage || targetComponent instanceof Components.SpriteLight2D || targetComponent instanceof Components.AudioSource || targetComponent instanceof Components.VideoPlayer) && propName === 'source') {
                const hadSource = !!(targetComponent.source || (targetComponent.spriteAssetPath && targetComponent.spriteAssetPath !== ''));
                await targetComponent.setSourcePath(valueToAssign, currentDirHandle);

                // If this is a new assignment or replacing a blank one, reset scale to 1:1
                // to avoid confusion with the 50x50 placeholder size
                if (!hadSource && targetComponent instanceof Components.SpriteRenderer) {
                    const transform = selectedMateria.getComponent(Components.Transform);
                    if (transform) {
                        transform.localScale = { x: 1, y: 1 };
                    }
                }
            } else {
                // Generic property assignment
                const props = propName.split('.');
                let current = targetComponent;
                for (let i = 0; i < props.length - 1; i++) {
                    if (!current[props[i]]) current[props[i]] = {};
                    current = current[props[i]];
                }
                current[props[props.length - 1]] = valueToAssign;
            }

            // Post-assignment logic
            if (targetComponent instanceof Components.Tilemap) {
                const renderer = selectedMateria.getComponent(Components.TilemapRenderer);
                if (renderer) await renderer.loadPalette(currentDirHandle);
            }
            if (targetComponent instanceof Components.UIText && propName === 'fontAssetPath') {
                await targetComponent.loadFont(currentDirHandle);
            }
            if (targetComponent instanceof Components.Animator && propName === 'animationClipPath') {
                await targetComponent.loadAnimationClip(currentDirHandle);
            }
            if (targetComponent instanceof Components.AnimatorController && propName === 'controllerPath') {
                await targetComponent.loadController(currentDirHandle);
                const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
                if (isGame && targetComponent.controller && targetComponent.controller.entryState) {
                    targetComponent.play(targetComponent.controller.entryState);
                } else if (targetComponent.controller && targetComponent.controller.entryState) {
                    // Just set state in editor to show first frame
                    targetComponent.currentStateName = targetComponent.controller.entryState;
                    const state = targetComponent.states.get(targetComponent.currentStateName);
                    if (state && state.animationClip && targetComponent.animator) {
                        targetComponent.animator.animationClipPath = state.animationClip;
                        await targetComponent.animator.loadAnimationClip(currentDirHandle);
                    }
                }
            }

            updateInspector();
            if (updateSceneCallback) updateSceneCallback();
        }
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
    } else if (e.target.type === 'number' || e.target.type === 'range') {
        value = parseFloat(e.target.value);
    } else {
        value = e.target.value;
    }

    if (componentName === 'CreativeScript') {
        const scriptName = e.target.dataset.scriptName;
        const script = selectedMateria.getComponents(Components.CreativeScript).find(s => s.scriptName === scriptName);
        if (script) {
            const props = propPath.split('.');
            let current = script.publicVars;
            for (let i = 0; i < props.length - 1; i++) {
                if (!current[props[i]] || typeof current[props[i]] !== 'object') current[props[i]] = {};
                current = current[props[i]];
            }
            current[props[props.length - 1]] = value;
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

    if (componentName === 'BasicAI' && propPath === 'detectionTagsString') {
        component.detectionTags = value.split(',').map(s => s.trim()).filter(s => s !== '');
        return;
    }
    if (componentName === 'WheelSuspension' && propPath === 'gripTagsString') {
        component.gripTags = value.split(',').map(s => s.trim()).filter(s => s !== '');
        return;
    }

    if (componentName === 'WheelSuspension' && propPath.startsWith('constraintAxis.')) {
        const axis = propPath.split('.')[1];
        component.constraintAxis[axis] = value;
        return;
    }

    // Handle nested properties like scale.x
    const props = propPath.split('.');
    let current = component;
    for (let i = 0; i < props.length - 1; i++) {
        current = current[props[i]];
    }
    current[props[props.length - 1]] = value;

    // After updating the property, trigger a scene update to reflect changes visually.
    if (updateSceneCallback) {
        updateSceneCallback();
    }

    // Special handling for Water component: regenerate particles when size changes
    if (componentName === 'Water' && (propPath === 'width' || propPath === 'height')) {
        component.generateParticles();
    }

    // Synchronize color inputs if one was changed
    if (propPath === 'color' && (e.target.type === 'color' || e.target.classList.contains('hex-input'))) {
        const parent = e.target.closest('.prop-inputs');
        if (parent) {
            const other = parent.querySelector(e.target.type === 'color' ? '.hex-input' : 'input[type="color"]');
            if (other) other.value = value;
        }
    }

     // --- DYNAMIC UI LOGIC for Canvas ---
    if (componentName === 'Canvas' && propPath === 'renderMode') {
        const componentContent = e.target.closest('.component-content');
        if (componentContent) {
            const worldSpaceProps = componentContent.querySelector('[data-canvas-props="world"]');
            const screenSpaceProps = componentContent.querySelectorAll('[data-canvas-props="screen"]');

            if (worldSpaceProps && screenSpaceProps.length > 0) {
                const isWorld = value === 'World Space';
                worldSpaceProps.style.display = isWorld ? 'flex' : 'none';
                screenSpaceProps.forEach(el => {
                    el.style.display = isWorld ? 'none' : 'flex';
                });
            }
        }
    }
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
            showPrompt(L.get('NUEVO_TAG', 'Nuevo Tag'), L.get('INTRODUCE_NOMBRE_TAG', 'Introduce el nombre para el nuevo tag:'), async (newTagName) => {
                if (newTagName && newTagName.trim() !== '') {
                    const config = getCurrentProjectConfig();
                    if (!config.tags.includes(newTagName)) {
                        config.tags.push(newTagName);
                        await saveProjectConfig();
                        selectedMateria.tag = newTagName;
                        showNotification(L.get('EXITO', 'Éxito'), `${L.get('TAG_ANADIDO', 'Tag "{tag}" añadido y seleccionado.').replace('{tag}', newTagName)}`);
                        updateInspector();
                    } else {
                        showNotification(L.get('AVISO', 'Aviso'), `${L.get('TAG_EXISTE', 'El tag "{tag}" ya existe.').replace('{tag}', newTagName)}`);
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
    const L = window.Localization;

    if (e.target.closest('.property-dropper')) {
        const dropper = e.target.closest('.property-dropper');
        const expectedType = dropper.dataset.expectedType;
        const componentName = dropper.dataset.component;
        const propName = dropper.dataset.prop;
        const scriptName = dropper.dataset.scriptName;
        const componentId = dropper.dataset.componentId;

        if (typeExtensionMap[expectedType] || expectedType === 'Materia' || expectedType === 'any' || componentIcons[expectedType]) {
            if (openAssetSelectorCallback) {
                 openAssetSelectorCallback(async (fileHandle, fullPath) => {
                    const fakeEvent = {
                        target: dropper,
                        preventDefault: () => {},
                        dataTransfer: {
                            getData: () => JSON.stringify({ type: 'Asset', name: fileHandle.name, path: fullPath })
                        }
                    };
                    await handleInspectorDrop(fakeEvent);
                }, {
                    filter: typeExtensionMap[expectedType] || [],
                    title: `${L.get('SELECCIONAR', 'Seleccionar')} ${expectedType}`
                });
            }
        } else if (componentIcons[expectedType]) {
             window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('HINT_ASIGNAR_COMPONENTE', 'Para asignar un {expectedType}, arrastra un objeto de la jerarquía que tenga dicho componente.').replace('{expectedType}', expectedType));
        }
        return;
    }


    if (e.target.matches('#add-component-btn')) {
        showAddComponentModal();
    }

    if (e.target.closest('[data-action="reset-sprite-scale"]')) {
        const selectedMateria = getSelectedMateria();
        const transform = selectedMateria.getComponent(Components.Transform);
        if (transform) {
            transform.localScale = { x: 1, y: 1 };
            updateInspector();
            if (updateSceneCallback) updateSceneCallback();
        }
    }

    if (e.target.closest('[data-action="center-sprite-pivot"]')) {
        const selectedMateria = getSelectedMateria();
        const spriteRenderer = selectedMateria.getComponent(Components.SpriteRenderer);
        if (spriteRenderer) {
            spriteRenderer.pivot = { x: 0.5, y: 0.5 };
            updateInspector();
            if (updateSceneCallback) updateSceneCallback();
        }
    }

    if (e.target.closest('[data-action="auto-pivot-sprite"]')) {
        const selectedMateria = getSelectedMateria();
        const sr = selectedMateria.getComponent(Components.SpriteRenderer);
        if (sr && sr.sprite && (sr.sprite.naturalWidth > 0 || sr.sprite.width > 0)) {
            const pivot = calculateAutoPivot(sr.sprite);
            sr.pivot = pivot;
            updateInspector();
            if (updateSceneCallback) updateSceneCallback();
        }
    }

    if (e.target.closest('[data-action="sync-video-size"]')) {
        const selectedMateria = getSelectedMateria();
        const leyIndex = parseInt(e.target.closest('[data-action="sync-video-size"]').dataset.leyIndex, 10);
        const videoPlayer = selectedMateria.leyes[leyIndex];
        if (videoPlayer instanceof Components.VideoPlayer) {
            videoPlayer.syncSizeToUITransform();
            updateInspector();
            if (updateSceneCallback) updateSceneCallback();
        }
    }

    if (e.target.closest('[data-action="auto-pivot-ui"]')) {
        const selectedMateria = getSelectedMateria();
        const uiTrans = selectedMateria.getComponent(Components.UITransform);
        const uiImg = selectedMateria.getComponent(Components.UIImage);
        if (uiTrans && uiImg && uiImg.sprite && (uiImg.sprite.naturalWidth > 0 || uiImg.sprite.width > 0)) {
            const pivot = calculateAutoPivot(uiImg.sprite);
            uiTrans.pivot = pivot;
            updateInspector();
            if (updateSceneCallback) updateSceneCallback();
        }
    }

    if (e.target.matches('.remove-component-btn')) {
        const index = parseInt(e.target.dataset.leyIndex, 10);
        if (selectedMateria && !isNaN(index)) {
            const ley = selectedMateria.leyes[index];
            if (ley) {
                // Prevent removing Transform if it's the only transform-like component
                const isTransform = ley.constructor.name === 'Transform';
                const isUITransform = ley.constructor.name === 'UITransform';

                if (isTransform || isUITransform) {
                     const hasOtherTransform = selectedMateria.leyes.some(l =>
                        (isTransform && l.constructor.name === 'UITransform') ||
                        (isUITransform && l.constructor.name === 'Transform')
                     );

                     if (!hasOtherTransform) {
                        window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('ERROR_BORRAR_TRANSFORM', 'No puedes eliminar el componente de transformación base.'));
                        return;
                     }
                }

                selectedMateria.removeComponentByInstance(ley);
                updateInspector();
                if (updateSceneCallback) updateSceneCallback();
            }
        }
    }

    if (e.target.closest('.light-color-swatch')) {
        const swatch = e.target.closest('.light-color-swatch');
        const color = swatch.dataset.color;
        const componentName = swatch.dataset.component;
        if (selectedMateria) {
            const component = selectedMateria.getComponent(Components[componentName]);
            if (component) {
                component.color = color;
                updateInspector();
                if (updateSceneCallback) updateSceneCallback();
                if (typeof window.setSceneDirty === 'function') window.setSceneDirty(true);
            }
        }
        return;
    }

    if (e.target.matches('.sprite-select-btn')) {
        const componentName = e.target.dataset.component;
        if (componentName && openAssetSelectorCallback) {
            openAssetSelectorCallback(async (fileHandle, path) => {
                const component = selectedMateria.getComponent(Components[componentName]);
                if (component) {
                    const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
                    await component.setSourcePath(path, currentDirHandle);
                    updateInspector();
                    updateSceneCallback();
                }
            }, {
                filter: ['image'],
                title: `Seleccionar Sprite para ${componentName}`
            });
        }
    }

    if (e.target.matches('#culling-mask-btn')) {
        const camera = selectedMateria.getComponent(Components.Camera);
        if (camera) {
            showCullingMaskDropdown(camera, e.target);
        }
    }

    // --- Tilemap Layer Management ---

    // --- LineCollider2D Management ---
    if (e.target.matches('[data-action="line-add-point"]')) {
        const ley = selectedMateria.getComponent(Components.LineCollider2D);
        if (ley) {
            const last = ley.points[ley.points.length - 1] || { x: 0, y: 0 };
            ley.points.push({ x: last.x + 20, y: last.y });
            updateInspector();
            if (updateSceneCallback) updateSceneCallback();
        }
    }

    if (e.target.matches('[data-action="line-remove-point"]')) {
        const ley = selectedMateria.getComponent(Components.LineCollider2D);
        const index = parseInt(e.target.dataset.index, 10);
        if (ley && !isNaN(index) && ley.points.length > 2) {
            ley.points.splice(index, 1);
            updateInspector();
            if (updateSceneCallback) updateSceneCallback();
        }
    }

    // --- RaycastSource (Rallo) Management ---
    if (e.target.matches('[data-action="rallo-add-ray"]')) {
        const rallo = selectedMateria.getComponent(Components.RaycastSource);
        if (rallo) {
            rallo.rays.push({ angle: 0, length: 200 });
            updateInspector();
            if (updateSceneCallback) updateSceneCallback();
        }
    }

    if (e.target.matches('[data-action="rallo-remove-ray"]')) {
        const rallo = selectedMateria.getComponent(Components.RaycastSource);
        const index = parseInt(e.target.dataset.index, 10);
        if (rallo && !isNaN(index)) {
            rallo.rays.splice(index, 1);
            updateInspector();
            if (updateSceneCallback) updateSceneCallback();
        }
    }

    if (e.target.matches('[data-action="generate-colliders"]')) {
        const collider = selectedMateria.getComponent(Components.TilemapCollider2D) || selectedMateria.getComponent(Components.TerrenoCollider2D);
        if (collider) {
            collider.generate();
            updateInspector(); // Refresh to show new collider count and for visualizer
        }
    }

    if (e.target.matches('.anchor-grid-button')) {
        const anchorPoint = parseInt(e.target.dataset.anchor, 10);
        const uiTransform = selectedMateria.getComponent(Components.UITransform);
        const parentCanvasMateria = selectedMateria.findAncestorWithComponent(Components.Canvas);

        if (uiTransform && parentCanvasMateria && !isNaN(anchorPoint)) {
            // --- Logic to keep the element visually stationary ---
            const rectCache = new Map();

            // 1. Get current absolute center of the UI element
            const oldRect = UITransformUtils.getAbsoluteRect(selectedMateria, rectCache);
            const oldCenterX = oldRect.x + oldRect.width / 2;
            const oldCenterY = oldRect.y + oldRect.height / 2;

            // 2. Get the new anchor's absolute position
            const parentRect = UITransformUtils.getAbsoluteRect(parentCanvasMateria, rectCache);
            const newAnchorPos = UITransformUtils.getAnchorPosition(anchorPoint, parentRect);

            // 3. Calculate the new offset
            const newOffsetX = oldCenterX - newAnchorPos.x;
            const newOffsetY = oldCenterY - newAnchorPos.y;

            // 4. Apply the new anchor and the calculated offset
            uiTransform.anchorPoint = anchorPoint;
            uiTransform.position.x = newOffsetX;
            uiTransform.position.y = newOffsetY;

            updateInspector();
            updateSceneCallback();
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
                const collider = selectedMateria.getComponent(Components.TilemapCollider2D);
                if (collider) collider.generateMesh();
                updateInspector();
            } else {
                window.Dialogs.showNotification(L.get('ACCION_NO_PERMITIDA', 'Acción no permitida'), L.get('ERROR_BORRAR_ULTIMA_CAPA', 'No se puede eliminar la última capa.'));
            }
        }
    }

    if (e.target.closest('[data-action="select-layer"]')) {
        const item = e.target.closest('[data-action="select-layer"]');
        const tilemap = selectedMateria.getComponent(Components.Tilemap);
        const index = parseInt(item.dataset.index, 10);
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

    if (e.target.matches('[data-action="parallax-match-sprite"]')) {
        const index = parseInt(e.target.dataset.leyIndex, 10);
        const parallax = selectedMateria.leyes[index];
        const spriteRenderer = selectedMateria.getComponent(Components.SpriteRenderer);
        const transform = selectedMateria.getComponent(Components.Transform);

        if (parallax && spriteRenderer && spriteRenderer.sprite && spriteRenderer.sprite.naturalWidth > 0) {
            parallax.mirroring.x = spriteRenderer.sprite.naturalWidth * transform.scale.x;
            parallax.mirroring.y = spriteRenderer.sprite.naturalHeight * transform.scale.y;
            updateInspector();
            updateSceneCallback();
        } else {
            window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('ERROR_NECESITA_SPRITE_RENDERER', 'Se necesita un SpriteRenderer con una imagen cargada.'));
        }
    }

    // --- Terrain Layer Management ---
    if (e.target.matches('[data-action="terrain-add-layer"]')) {
        const terreno = selectedMateria.getComponent(Components.Terreno2D);
        if (terreno) {
            openAssetSelectorCallback(async (fileHandle, path) => {
                terreno.addLayer(path);
                const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
                await terreno.loadTextures(currentDirHandle);
                updateInspector();
            }, { filter: ['image'], title: L.get('SELECCIONAR_TEXTURA_CAPA', 'Seleccionar Textura para Capa') });
        }
    }

    if (e.target.matches('[data-action="terrain-remove-layer"]')) {
        const terreno = selectedMateria.getComponent(Components.Terreno2D);
        const index = parseInt(e.target.dataset.index, 10);
        if (terreno && !isNaN(index)) {
            terreno.removeLayer(index);
            const collider = selectedMateria.getComponent(Components.TerrenoCollider2D);
            if (collider) collider.generateColliders();
            updateInspector();
        }
    }

    // --- Gyzmo Layer Management ---
    if (e.target.matches('[data-action="gyzmo-add-layer"]')) {
        const gyzmo = selectedMateria.getComponent(Components.Gyzmo);
        if (gyzmo) {
            gyzmo.addLayer();
            updateInspector();
        }
    }

    if (e.target.matches('[data-action="gyzmo-remove-layer"]')) {
        const gyzmo = selectedMateria.getComponent(Components.Gyzmo);
        const index = parseInt(e.target.dataset.index, 10);
        if (gyzmo && !isNaN(index)) {
            gyzmo.removeLayer(index);
            updateInspector();
        }
    }

    if (e.target.closest('[data-action="terrain-layer-texture"]')) {
        const dropper = e.target.closest('[data-action="terrain-layer-texture"]');
        const lIdx = parseInt(dropper.dataset.layerIndex, 10);
        const terreno = selectedMateria.getComponent(Components.Terreno2D);

        if (terreno && !isNaN(lIdx)) {
            openAssetSelectorCallback(async (fileHandle, path) => {
                terreno.layers[lIdx].texturePath = path;
                const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
                await terreno.loadTextures(currentDirHandle);
                updateInspector();
            }, { filter: ['image'], title: L.get('CAMBIAR_TEXTURA_CAPA', 'Cambiar Textura de Capa') });
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
    everythingItem.onclick = (e) => { e.stopPropagation(); camera.cullingMask = -1; updateInspector(); };
    dropdown.appendChild(everythingItem);

    const nothingItem = document.createElement('div');
    nothingItem.className = 'culling-mask-item';
    nothingItem.textContent = 'Nothing';
    nothingItem.onclick = (e) => { e.stopPropagation(); camera.cullingMask = 0; updateInspector(); };
    dropdown.appendChild(nothingItem);


    layers.forEach((name, index) => {
        if (!name) return;
        const isChecked = (camera.cullingMask & (1 << index)) !== 0;
        dropdown.appendChild(createCheckbox(name, index, isChecked));
    });

    const rect = button.getBoundingClientRect();
    dropdown.style.display = 'block';
    dropdown.style.position = 'fixed';
    dropdown.style.zIndex = '3000';
    dropdown.style.maxHeight = ''; // Reset for measurement
    dropdown.style.overflowY = '';

    const menuHeight = dropdown.offsetHeight;
    const windowHeight = window.innerHeight;
    let left = rect.left;
    let top = rect.bottom;

    if (top + menuHeight > windowHeight - 10) {
        top = rect.top - menuHeight;
    }

    if (top < 5 || menuHeight > windowHeight - 20) {
        top = 5;
        dropdown.style.maxHeight = `${windowHeight - 20}px`;
        dropdown.style.overflowY = 'auto';
    }

    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
}


// --- Core Functions ---

/**
 * Periodically refreshes the values of visible inspector fields without re-rendering the entire UI.
 * This is used to provide live feedback while the game is running.
 */
export function refreshInspectorValues() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    // Update Materia general properties
    const activeToggle = document.getElementById('materia-active-toggle');
    if (activeToggle && document.activeElement !== activeToggle) {
        activeToggle.checked = selectedMateria.isActive;
    }
    const nameInput = document.getElementById('materia-name-input');
    if (nameInput && document.activeElement !== nameInput) {
        nameInput.value = selectedMateria.name;
    }

    // Update all property inputs
    const inputs = dom.inspectorContent.querySelectorAll('.prop-input');
    inputs.forEach(input => {
        // Skip if the user is currently interacting with this input
        if (document.activeElement === input) return;

        const componentName = input.dataset.component;
        const propPath = input.dataset.prop;
        const scriptName = input.dataset.scriptName;
        const componentId = input.dataset.componentId;

        let targetComponent;
        if (componentName === 'CreativeScript') {
             targetComponent = selectedMateria.getComponents(Components.CreativeScript).find(s => s.scriptName === scriptName);
        } else if (componentName === 'CustomComponent') {
             targetComponent = selectedMateria.leyes.find(ley => ley instanceof Components.CustomComponent && ley.id == componentId);
        } else if (componentName) {
             targetComponent = selectedMateria.getComponent(Components[componentName]);
        }

        if (targetComponent) {
            let value;
            if (componentName === 'CreativeScript' || componentName === 'CustomComponent') {
                value = targetComponent.publicVars[propPath];
            } else {
                const props = propPath.split('.');
                let current = targetComponent;
                for (let i = 0; i < props.length; i++) {
                    if (current === undefined || current === null) break;
                    current = current[props[i]];
                }
                value = current;
            }

            if (value !== undefined) {
                if (input.type === 'checkbox') {
                    if (input.checked !== !!value) input.checked = !!value;
                } else if (input.type === 'color') {
                    if (input.value !== value) input.value = value;
                } else if (input.type === 'number' || input.type === 'range') {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        // Avoid updating if the difference is negligible to prevent cursor jumps
                        if (Math.abs(parseFloat(input.value) - numValue) > 0.0001) {
                            input.value = numValue.toFixed(3).replace(/\.?0+$/, '');
                        }
                    }
                } else {
                    if (input.value !== String(value)) input.value = String(value);
                }
            }
        }
    });
}

export async function updateInspector() {
    if (!dom.inspectorContent) return;

    // Guardar la posición del scroll antes de limpiar
    const savedScrollTop = dom.inspectorContent.scrollTop;

    dom.inspectorContent.innerHTML = '';

    const selectedMateria = getSelectedMateria();
    const selectedAsset = getSelectedAsset();

    if (selectedMateria) {
        await updateInspectorForMateria(selectedMateria);
    } else if (selectedAsset) {
        await updateInspectorForAsset(selectedAsset.name, selectedAsset.path);
    } else {
        dom.inspectorContent.innerHTML = `<p class="inspector-placeholder" data-i18n="NADA_SELECCIONADO">${window.Localization.get('NADA_SELECCIONADO', 'Nada seleccionado')}</p>`;
    }

    // Restaurar la posición del scroll con un pequeño retraso para asegurar que el DOM se haya renderizado
    requestAnimationFrame(() => {
        if (dom.inspectorContent) dom.inspectorContent.scrollTop = savedScrollTop;
        // Doble verificación para casos asíncronos pesados
        setTimeout(() => {
            if (dom.inspectorContent && dom.inspectorContent.scrollTop !== savedScrollTop) {
                dom.inspectorContent.scrollTop = savedScrollTop;
            }
        }, 50);
    });
}

function renderComponentHeader(title, icon, leyIndex, canRemove = true) {
    const iconHTML = getIconHTML(icon);
    return `
        <div class="component-header" data-ley-index="${leyIndex}">
            <div class="component-header-main">
                <span class="component-icon">${iconHTML}</span>
                <h4>${title}</h4>
            </div>
            <div class="component-header-controls">
                ${canRemove ? `<button class="remove-component-btn" title="Eliminar Componente" data-ley-index="${leyIndex}">&times;</button>` : ''}
            </div>
        </div>
    `;
}

function renderLightColorPresets(componentName) {
    const presets = [
        { color: '#ffffff', name: 'Blanco' },
        { color: '#ffff00', name: 'Amarillo' },
        { color: '#ffcc00', name: 'Oro' },
        { color: '#ff6600', name: 'Naranja' },
        { color: '#ff0000', name: 'Rojo' },
        { color: '#00ff00', name: 'Verde' },
        { color: '#00ccff', name: 'Cian' },
        { color: '#0000ff', name: 'Azul' },
        { color: '#9900ff', name: 'Violeta' }
    ];

    return `
        <div class="prop-row-multi">
            <label>Presets</label>
            <div class="light-color-swatches" style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px;">
                ${presets.map(p => `
                    <div class="light-color-swatch"
                         data-color="${p.color}"
                         data-component="${componentName}"
                         title="${p.name}"
                         style="width: 20px; height: 20px; background-color: ${p.color}; border: 1px solid #555; cursor: pointer; border-radius: 3px;">
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderPropertyDropper(type, currentValue, commonAttrs) {
    let displayName = 'None';
    let icon = 'help-circle';

    // Handle Materia object or ID
    let value = currentValue;
    if (value && typeof value === 'object' && value.id !== undefined) {
        value = value.id;
    }

    const isEmpty = value === null || value === undefined || value === '';

    if (!isEmpty) {
        if (typeof value === 'number') {
            // Assume Scene Object ID
            const materia = window.SceneManager.currentScene.findMateriaById(value);
            displayName = materia ? materia.name : `Objeto #${value}`;
            // If type is a specific component, use its icon, otherwise use generic Materia icon
            icon = componentIcons[type] || componentIcons[type.charAt(0).toUpperCase() + type.slice(1)] || 'move';

            // Overrides for common types if icon not found in map
            if (icon === 'move' || icon === 'help-circle') {
                const lowerType = type.toLowerCase();
                if (lowerType === 'sprite') icon = 'image';
                else if (lowerType === 'audio') icon = 'music';
                else if (lowerType === 'video') icon = 'video';
                else if (lowerType === 'prefab') icon = 'box';
                else if (lowerType === 'scene' || lowerType === 'escena') icon = 'clapperboard';
            }
        } else if (typeof value === 'string') {
            // Assume Asset Path
            displayName = currentValue.split('/').pop();
            const ext = currentValue.split('.').pop().toLowerCase();
            icon = fileIcons[ext] || 'file';

            // Check if it's a reference to a Materia by name (old system)
            if ((type === 'Materia' || type === 'materia' || type === 'mtr') && !currentValue.includes('/')) {
                icon = 'move';
            }
        }
    } else {
        const L = window.Localization;
        const lowerType = type.toLowerCase();
        displayName = `${L.get('NINGUNO', 'Ninguno')} (${type})`;

        icon = componentIcons[type] || componentIcons[type.charAt(0).toUpperCase() + type.slice(1)] || 'help-circle';

        if (lowerType === 'sprite') icon = 'image';
        else if (lowerType === 'audio') icon = 'music';
        else if (lowerType === 'prefab') icon = 'box';
        else if (lowerType === 'scene' || lowerType === 'escena') icon = 'clapperboard';
        else if (lowerType === 'materia' || lowerType === 'mtr') icon = 'move';
    }

    const iconHTML = getIconHTML(icon);

    // Ensure commonAttrs includes the class but doesn't double it
    if (!commonAttrs.includes('class=')) {
        commonAttrs += ' class="property-dropper"';
    } else {
        commonAttrs = commonAttrs.replace('class="', 'class="property-dropper ');
    }

    if (isEmpty) commonAttrs = commonAttrs.replace('class="', 'class="empty ');

    return `
        <div ${commonAttrs} data-expected-type="${type}">
            <div class="dropper-main">
                <span class="dropper-icon">${iconHTML}</span>
                <span class="dropper-name" title="${currentValue || ''}">${displayName}</span>
            </div>
        </div>
    `;
}

function renderActionInput(variable, currentValue, componentType, identifier) {
    const L = window.Localization;
    const val = currentValue || { targetId: null, functionName: '' };

    let commonAttrs = `data-prop="${variable.name}"`;
    if (componentType === 'CreativeScript') {
        commonAttrs += ` data-component="CreativeScript" data-script-name="${identifier}"`;
    } else if (componentType === 'CustomComponent') {
        commonAttrs += ` data-component="CustomComponent" data-component-id="${identifier}"`;
    }

    let functionsDropdown = `<option value="">-- ${L.get('SIN_FUNCION', 'Sin Función')} --</option>`;

    if (val.targetId && window.SceneManager.currentScene) {
        const targetMateria = window.SceneManager.currentScene.findMateriaById(val.targetId);
        if (targetMateria) {
            const scripts = targetMateria.getComponents(Components.CreativeScript);
            let allFunctions = [];
            scripts.forEach(s => {
                const metadata = CES_Transpiler.getScriptMetadata(s.scriptName);
                if (metadata && metadata.publicFunctions) {
                    allFunctions = allFunctions.concat(metadata.publicFunctions);
                }
            });
            functionsDropdown += allFunctions.map(f => `<option value="${f}" ${val.functionName === f ? 'selected' : ''}>${f}</option>`).join('');
        }
    }

    return `
        <div class="action-input-group" style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
            ${renderPropertyDropper('Materia', val.targetId, `class="prop-input" ${commonAttrs.replace(`data-prop="${variable.name}"`, `data-prop="${variable.name}.targetId"`)}`)}
            <select class="prop-input" ${commonAttrs.replace(`data-prop="${variable.name}"`, `data-prop="${variable.name}.functionName"`)}>
                ${functionsDropdown}
            </select>
        </div>
    `;
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
        case 'Color':
            return `<input type="color" ${commonAttrs} value="${currentValue || '#ffffff'}">`;
        case 'Vector2':
            return `
                <div class="prop-inputs">
                    <input type="number" class="prop-input" ${commonAttrs.replace(`data-prop="${variable.name}"`, `data-prop="${variable.name}.x"`)} value="${currentValue?.x || 0}" title="X">
                    <input type="number" class="prop-input" ${commonAttrs.replace(`data-prop="${variable.name}"`, `data-prop="${variable.name}.y"`)} value="${currentValue?.y || 0}" title="Y">
                </div>
            `;
        case 'Tag':
            {
                const config = getCurrentProjectConfig();
                const tags = config.tags || ['Untagged'];
                return `
                    <select ${commonAttrs}>
                        ${tags.map(t => `<option value="${t}" ${currentValue === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                `;
            }
        case 'Layer':
            {
                const config = getCurrentProjectConfig();
                const layers = config.layers?.sortingLayers || ['Default'];
                return `
                    <select ${commonAttrs}>
                        ${layers.map((l, i) => l ? `<option value="${i}" ${currentValue == i ? 'selected' : ''}>${i}: ${l}</option>` : '').join('')}
                    </select>
                `;
            }
        case 'Sprite':
        case 'sprite':
        case 'Audio':
        case 'audio':
        case 'Prefab':
        case 'prefab':
        case 'Scene':
        case 'scene':
        case 'escena':
        case 'Materia':
        case 'materia':
        case 'mtr':
        case 'Animation':
        case 'animacion':
        case 'AnimatorController':
        case 'controlador':
        case 'UI':
        case 'ui':
        case 'UIImage':
        case 'imagen':
        case 'CreativeScript':
        case 'script':
            return renderPropertyDropper(variable.type, currentValue, commonAttrs);
        case 'Action':
            return renderActionInput(variable, currentValue, componentType, identifier);
        default:
            // Check if it's a component type
            if (componentIcons[variable.type]) {
                return renderPropertyDropper(variable.type, currentValue, commonAttrs);
            }
            // Para 'any' o tipos desconocidos, usar un campo de texto
            return `<input type="text" ${commonAttrs} value="${currentValue}">`;
    }
}


async function updateInspectorForMateria(selectedMateria) {
    const config = getCurrentProjectConfig();
    const L = window.Localization;

    // Name input and active toggle
    dom.inspectorContent.innerHTML = `
        <div class="inspector-materia-header">
            <input type="checkbox" id="materia-active-toggle" title="${L.get('ACTIVAR_DESACTIVAR_MATERIA', 'Activar/Desactivar Materia')}" ${selectedMateria.isActive ? 'checked' : ''}>
            <input type="text" id="materia-name-input" value="${selectedMateria.name}">
        </div>
        <div class="tag-layer-container">
            <div class="inspector-row">
                <label for="materia-tag-select" data-i18n="TAG">Tag</label>
                <select id="materia-tag-select"></select>
            </div>
            <div class="inspector-row">
                <label for="materia-layer-select" data-i18n="LAYER">Layer</label>
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
        addTagOption.dataset.i18n = 'ADD_TAG_ELLIPSIS';
        addTagOption.textContent = L.get('ADD_TAG_ELLIPSIS', 'Añadir Tag...');
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
        addLayerOption.dataset.i18n = 'EDIT_LAYERS_ELLIPSIS';
        addLayerOption.textContent = L.get('EDIT_LAYERS_ELLIPSIS', 'Editar Layers...');
        layerSelect.appendChild(addLayerOption);
    }


    const componentsWrapper = document.createElement('div');
    componentsWrapper.className = 'inspector-components-wrapper';
    console.log('2. Created componentsWrapper. Looping through components...');

    selectedMateria.leyes.forEach((ley, index) => {
        console.log(`[DEBUG] Inspector: Intentando renderizar componente #${index}: ${ley.constructor.name}`);
        let componentHTML = '';
        const componentName = ley.constructor.name;
        const icon = componentIcons[componentName] || 'settings';
        const iconHTML = `<span class="component-icon">${getIconHTML(icon)}</span>`;

        if (ley instanceof Components.TextureRender) {
            let dimensionsHTML = '';
            if (ley.shape === 'Rectangle' || ley.shape === 'Triangle' || ley.shape === 'Capsule') {
                dimensionsHTML = `
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Dimensions')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="TextureRender" data-prop="width" value="${ley.width}" title="${L.get('PROP_WIDTH', 'Width')}">
                            <input type="number" class="prop-input" step="1" data-component="TextureRender" data-prop="height" value="${ley.height}" title="${L.get('PROP_HEIGHT', 'Height')}">
                        </div>
                    </div>
                `;
            } else if (ley.shape === 'Circle') {
                dimensionsHTML = `
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_RADIUS">${L.get('PROP_RADIUS', 'Radius')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="TextureRender" data-prop="radius" value="${ley.radius}" title="${L.get('PROP_RADIUS', 'Radius')}">
                        </div>
                    </div>
                `;
            }

            componentHTML = `
                ${renderComponentHeader(L.get('TEXTURE_RENDER', "Texture Render"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_SHAPE">${L.get('PROP_SHAPE', 'Shape')}</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="TextureRender" data-prop="shape">
                                <option value="Rectangle" ${ley.shape === 'Rectangle' ? 'selected' : ''}>${L.get('RECTANGLE', 'Rectangle')}</option>
                                <option value="Circle" ${ley.shape === 'Circle' ? 'selected' : ''}>${L.get('CIRCLE', 'Circle')}</option>
                                <option value="Triangle" ${ley.shape === 'Triangle' ? 'selected' : ''}>${L.get('TRIANGLE', 'Triangle')}</option>
                                <option value="Capsule" ${ley.shape === 'Capsule' ? 'selected' : ''}>${L.get('CAPSULE', 'Capsule')}</option>
                            </select>
                        </div>
                    </div>
                    ${dimensionsHTML}
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="TextureRender" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" class="prop-input hex-input" data-component="TextureRender" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="PROP_TEXTURE">${L.get('PROP_TEXTURE', 'Texture')}</label>
                        ${renderPropertyDropper('Sprite', ley.texturePath, 'data-component="TextureRender" data-prop="texturePath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" class="prop-input" step="1" data-component="TextureRender" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.VerticalLayoutGroup || ley instanceof Components.HorizontalLayoutGroup) {
            const isVertical = ley instanceof Components.VerticalLayoutGroup;
            const compName = isVertical ? 'VerticalLayoutGroup' : 'HorizontalLayoutGroup';
            const title = isVertical ? L.get('VERTICAL_LAYOUT_GROUP', "Vertical Layout Group") : L.get('HORIZONTAL_LAYOUT_GROUP', "Horizontal Layout Group");
            componentHTML = `
                ${renderComponentHeader(title, icon, index)}
                <div class="component-content">
                    <div class="inspector-section-header"><span>${L.get('PADDING', 'Padding')}</span></div>
                    <div class="prop-row-multi">
                        <span>L</span><input type="number" class="prop-input" data-component="${compName}" data-prop="padding.left" value="${ley.padding.left}">
                        <span>R</span><input type="number" class="prop-input" data-component="${compName}" data-prop="padding.right" value="${ley.padding.right}">
                    </div>
                    <div class="prop-row-multi">
                        <span>T</span><input type="number" class="prop-input" data-component="${compName}" data-prop="padding.top" value="${ley.padding.top}">
                        <span>B</span><input type="number" class="prop-input" data-component="${compName}" data-prop="padding.bottom" value="${ley.padding.bottom}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('SPACING', 'Espaciado')}</label>
                        <input type="number" class="prop-input" data-component="${compName}" data-prop="spacing" value="${ley.spacing}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.GridLayoutGroup) {
            componentHTML = `
                ${renderComponentHeader(L.get('GRID_LAYOUT_GROUP', "Grid Layout Group"), icon, index)}
                <div class="component-content">
                    <div class="inspector-section-header"><span>${L.get('PADDING', 'Padding')}</span></div>
                    <div class="prop-row-multi">
                        <span>L</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.left" value="${ley.padding.left}">
                        <span>R</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.right" value="${ley.padding.right}">
                    </div>
                    <div class="prop-row-multi">
                        <span>T</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.top" value="${ley.padding.top}">
                        <span>B</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.bottom" value="${ley.padding.bottom}">
                    </div>
                    <div class="inspector-section-header"><span>${L.get('CELL_SIZE', 'Tamaño Celda')}</span></div>
                    <div class="prop-row-multi">
                        <span>W</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="cellSize.width" value="${ley.cellSize.width}">
                        <span>H</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="cellSize.height" value="${ley.cellSize.height}">
                    </div>
                    <div class="inspector-section-header"><span>${L.get('SPACING', 'Espaciado')}</span></div>
                    <div class="prop-row-multi">
                        <span>X</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="spacing.x" value="${ley.spacing.x}">
                        <span>Y</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="spacing.y" value="${ley.spacing.y}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.ContentSizeFitter) {
             componentHTML = `
                ${renderComponentHeader(L.get('CONTENT_SIZE_FITTER', "Content Size Fitter"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('HORIZONTAL_FIT', 'Horizontal Fit')}</label>
                        <select class="prop-input" data-component="ContentSizeFitter" data-prop="horizontalFit">
                            <option value="Unconstrained" ${ley.horizontalFit === 'Unconstrained' ? 'selected' : ''}>${L.get('UNCONSTRAINED', 'Unconstrained')}</option>
                            <option value="Preferred Size" ${ley.horizontalFit === 'Preferred Size' ? 'selected' : ''}>${L.get('PREFERRED_SIZE', 'Preferred Size')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('VERTICAL_FIT', 'Vertical Fit')}</label>
                        <select class="prop-input" data-component="ContentSizeFitter" data-prop="verticalFit">
                            <option value="Unconstrained" ${ley.verticalFit === 'Unconstrained' ? 'selected' : ''}>${L.get('UNCONSTRAINED', 'Unconstrained')}</option>
                            <option value="Preferred Size" ${ley.verticalFit === 'Preferred Size' ? 'selected' : ''}>${L.get('PREFERRED_SIZE', 'Preferred Size')}</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.VideoPlayer) {
            componentHTML = `
                ${renderComponentHeader(L.get('VIDEO_PLAYER', "Video Player"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="VIDEO_SOURCE">${L.get('VIDEO_SOURCE', 'Video Source')}</label>
                        ${renderPropertyDropper('Video', ley.source, 'data-component="VideoPlayer" data-prop="source"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="VOLUMEN">${L.get('VOLUMEN', 'Volumen')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" data-component="VideoPlayer" data-prop="volume" value="${ley.volume}" min="0" max="1" step="0.01" style="flex-grow: 1;">
                            <span style="min-width: 30px; text-align: right;">${Math.round(ley.volume * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                         <label data-i18n="PLAYBACK_RATE">${L.get('PLAYBACK_RATE', 'Velocidad')}</label>
                         <input type="number" class="prop-input" data-component="VideoPlayer" data-prop="playbackRate" value="${ley.playbackRate}" step="0.1" min="0.1">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="VideoPlayer" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label data-i18n="BUCLE_LOOP">${L.get('BUCLE_LOOP', 'Bucle (Loop)')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="VideoPlayer" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label data-i18n="REPRODUCIR_AL_EMPEZAR">${L.get('REPRODUCIR_AL_EMPEZAR', 'Reproducir al Empezar')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="VideoPlayer" data-prop="muted" ${ley.muted ? 'checked' : ''}>
                        <label data-i18n="SILENCIAR">${L.get('SILENCIAR', 'Silenciado')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PRELOAD">${L.get('PRELOAD', 'Precarga')}</label>
                        <select class="prop-input" data-component="VideoPlayer" data-prop="preload">
                            <option value="auto" ${ley.preload === 'auto' ? 'selected' : ''}>Auto</option>
                            <option value="metadata" ${ley.preload === 'metadata' ? 'selected' : ''}>Metadata</option>
                            <option value="none" ${ley.preload === 'none' ? 'selected' : ''}>None</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SCALING_MODE">${L.get('SCALING_MODE', 'Escalado')}</label>
                        <select class="prop-input" data-component="VideoPlayer" data-prop="scalingMode">
                            <option value="Fit" ${ley.scalingMode === 'Fit' ? 'selected' : ''}>Fit</option>
                            <option value="Stretch" ${ley.scalingMode === 'Stretch' ? 'selected' : ''}>Stretch</option>
                            <option value="Fill" ${ley.scalingMode === 'Fill' ? 'selected' : ''}>Fill</option>
                        </select>
                    </div>
                    <button class="primary-btn inspector-action-btn" data-action="sync-video-size" data-ley-index="${index}" style="width: 100%; margin-top: 10px; font-weight: bold; border-radius: 4px;" title="${L.get('AJUSTAR_TAMANO_VIDEO_DESC', 'Ajusta el tamaño del objeto UI para que coincida con la resolución nativa del video.')}">${L.get('AJUSTAR_TAMANO_AL_VIDEO', 'Ajustar Tamaño al Video')}</button>
                </div>
            `;
        } else if (ley instanceof Components.Health) {
            componentHTML = `
                ${renderComponentHeader(L.get('HEALTH_COMPONENT', "Vida (Health)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('MAX_HEALTH', 'Vida Máxima')}</label>
                        <input type="number" class="prop-input" step="1" min="1" data-component="Health" data-prop="maxHealth" value="${ley.maxHealth}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('CURRENT_HEALTH', 'Vida Actual')}</label>
                        <input type="number" class="prop-input" step="1" min="0" data-component="Health" data-prop="currentHealth" value="${ley.currentHealth}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Health" data-prop="destroyOnDeath" ${ley.destroyOnDeath ? 'checked' : ''}>
                        <label>${L.get('DESTROY_ON_DEATH', 'Destruir al morir')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Patrol) {
            componentHTML = `
                ${renderComponentHeader(L.get('PATROL_COMPONENT', "Patrulla (Patrol)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" class="prop-input" step="1" data-component="Patrol" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('DISTANCE', 'Distancia')}</label>
                        <input type="number" class="prop-input" step="1" data-component="Patrol" data-prop="distance" value="${ley.distance}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('PAUSE_TIME', 'Tiempo Pausa (s)')}</label>
                        <input type="number" class="prop-input" step="0.1" min="0" data-component="Patrol" data-prop="pauseTime" value="${ley.pauseTime}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Patrol" data-prop="horizontal" ${ley.horizontal ? 'checked' : ''}>
                        <label>${L.get('HORIZONTAL', 'Horizontal')}</label>
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
                ${renderComponentHeader(L.get('TRANSFORM', "Posición (Transform)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_POSITION">${L.get('PROP_POSITION', 'Position')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="localPosition.x" value="${ley.localPosition.x}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="localPosition.y" value="${ley.localPosition.y}" title="Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ROTATION">${L.get('PROP_ROTATION', 'Rotation')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="localRotation" value="${ley.localRotation || 0}" title="Z">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_SCALE">${L.get('PROP_SCALE', 'Scale')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="localScale.x" value="${ley.localScale.x}" title="X">
                            <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="localScale.y" value="${ley.localScale.y}" title="Y">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.PolygonCollider2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('POLYGON_COLLIDER_2D', "Polygon Collider 2D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="PolygonCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label>${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label>${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="PolygonCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="PolygonCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="inspector-field-group">
                        <label>${L.get('VERTICES', 'Vértices')} (${ley.vertices?.length || 0})</label>
                        <p class="field-description">${L.get('VERTICES_DESC', 'La edición manual de vértices se habilitará próximamente. Actualmente se genera automáticamente para terrenos.')}</p>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.UITransform) {
            let anchorGridHTML = '';
            const anchorTitles = [
                L.get('TOP_LEFT', 'Top Left'), L.get('TOP_CENTER', 'Top Center'), L.get('TOP_RIGHT', 'Top Right'),
                L.get('MIDDLE_LEFT', 'Middle Left'), L.get('MIDDLE_CENTER', 'Middle Center'), L.get('MIDDLE_RIGHT', 'Middle Right'),
                L.get('BOTTOM_LEFT', 'Bottom Left'), L.get('BOTTOM_CENTER', 'Bottom Center'), L.get('BOTTOM_RIGHT', 'Bottom Right')
            ];
            for (let i = 0; i < 9; i++) {
                anchorGridHTML += `
                    <button
                        class="anchor-grid-button ${ley.anchorPoint === i ? 'active' : ''}"
                        data-anchor="${i}"
                        title="${anchorTitles[i]}">
                    </button>
                `;
            }

            componentHTML = `
            ${renderComponentHeader(L.get('UI_TRANSFORM', "UI Transform"), icon, index)}
            <div class="component-content">
                 <div class="anchor-grid-container">
                    ${anchorGridHTML}
                </div>
                <div class="prop-row-multi">
                    <label>${L.get('POSITION', 'Position')}</label>
                    <div class="prop-inputs">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="position.x" value="${ley.position.x}" title="${L.get('POSITION_X_OFFSET', 'Position X Offset')}">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="position.y" value="${ley.position.y}" title="${L.get('POSITION_Y_OFFSET', 'Position Y Offset')}">
                    </div>
                </div>
                <div class="prop-row-multi">
                    <label>${L.get('SIZE', 'Size')}</label>
                    <div class="prop-inputs">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="size.width" value="${ley.size.width}" title="${L.get('WIDTH', 'Width')}">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="size.height" value="${ley.size.height}" title="${L.get('HEIGHT', 'Height')}">
                    </div>
                </div>
                <div class="prop-row-multi">
                    <label>${L.get('PIVOT', 'Pivot')}</label>
                    <div class="prop-inputs">
                        <input type="number" class="prop-input" step="0.01" data-component="UITransform" data-prop="pivot.x" value="${ley.pivot?.x ?? 0.5}" title="${L.get('PIVOT_X', 'Pivot X')}">
                        <input type="number" class="prop-input" step="0.01" data-component="UITransform" data-prop="pivot.y" value="${ley.pivot?.y ?? 0.5}" title="${L.get('PIVOT_Y', 'Pivot Y')}">
                        <button class="small-btn" data-action="auto-pivot-ui" title="${L.get('AUTO_PIVOT_DESC', 'Ajustar al Contenido (Auto-Pivot)')}" style="font-size: 10px; padding: 2px 4px;">AUTO</button>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.UIImage) {
            componentHTML = `${renderComponentHeader(L.get('UI_IMAGE', "UI Image"), icon, index)}
            <div class="component-content">
                <div class="inspector-row">
                    <label>${L.get('SOURCE', 'Source')}</label>
                    ${renderPropertyDropper('Sprite', ley.source, 'data-component="UIImage" data-prop="source"')}
                </div>
                <div class="prop-row-multi">
                    <label>${L.get('COLOR', 'Color')}</label>
                    <div class="prop-inputs">
                        <input type="color" class="prop-input" data-component="UIImage" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                        <input type="text" class="prop-input hex-input" data-component="UIImage" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.UIText) {
            const fontName = ley.fontAssetPath ? ley.fontAssetPath.split('/').pop() : L.get('DEFAULT', 'Default');
            componentHTML = `
                ${renderComponentHeader(L.get('UI_TEXT', "UI Text"), "type", index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('TEXT', 'Text')}</label>
                        <textarea class="prop-input" data-component="UIText" data-prop="text" rows="3">${ley.text}</textarea>
                    </div>
                    <div class="inspector-row">
                        <label>${L.get('FONT', 'Font')}</label>
                        ${renderPropertyDropper('Font', ley.fontAssetPath, 'data-component="UIText" data-prop="fontAssetPath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('FONT_SIZE', 'Font Size')}</label>
                        <input type="number" class="prop-input" data-component="UIText" data-prop="fontSize" value="${ley.fontSize}" min="1">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="UIText" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" class="prop-input hex-input" data-component="UIText" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('ALIGNMENT', 'Alignment')}</label>
                        <select class="prop-input" data-component="UIText" data-prop="horizontalAlign">
                            <option value="left" ${ley.horizontalAlign === 'left' ? 'selected' : ''}>${L.get('LEFT', 'Left')}</option>
                            <option value="center" ${ley.horizontalAlign === 'center' ? 'selected' : ''}>${L.get('CENTER', 'Center')}</option>
                            <option value="right" ${ley.horizontalAlign === 'right' ? 'selected' : ''}>${L.get('RIGHT', 'Right')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('TRANSFORM', 'Transform')}</label>
                        <select class="prop-input" data-component="UIText" data-prop="textTransform">
                            <option value="none" ${ley.textTransform === 'none' ? 'selected' : ''}>${L.get('NONE', 'None')}</option>
                            <option value="uppercase" ${ley.textTransform === 'uppercase' ? 'selected' : ''}>${L.get('UPPERCASE', 'UPPERCASE')}</option>
                            <option value="lowercase" ${ley.textTransform === 'lowercase' ? 'selected' : ''}>${L.get('LOWERCASE', 'lowercase')}</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Canvas) {
            const isWorldSpace = ley.renderMode === 'World Space';
            const ssResolution = ley.referenceResolution || { width: 800, height: 600 };

            componentHTML = `
                ${renderComponentHeader(L.get('CANVAS', "Canvas"), "image", index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('RENDER_MODE', 'Render Mode')}</label>
                        <select class="prop-input inspector-re-render" data-component="Canvas" data-prop="renderMode">
                            <option value="Screen Space" ${!isWorldSpace ? 'selected' : ''}>${L.get('SCREEN_SPACE', 'Screen Space')}</option>
                            <option value="World Space" ${isWorldSpace ? 'selected' : ''}>${L.get('WORLD_SPACE', 'World Space')}</option>
                        </select>
                    </div>

                    <!-- World Space Properties -->
                    <div class="prop-row-multi" data-canvas-props="world" style="display: ${isWorldSpace ? 'flex' : 'none'};">
                        <label>${L.get('SIZE', 'Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Canvas" data-prop="size.x" value="${ley.size.x}">
                            <input type="number" class="prop-input" data-component="Canvas" data-prop="size.y" value="${ley.size.y}">
                        </div>
                    </div>

                    <!-- Screen Space Properties -->
                    <div class="prop-row-multi" data-canvas-props="screen" style="display: ${!isWorldSpace ? 'flex' : 'none'};">
                        <label>${L.get('REFERENCE_RES', 'Reference Res')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Canvas" data-prop="referenceResolution.width" value="${ssResolution.width}">
                            <input type="number" class="prop-input" data-component="Canvas" data-prop="referenceResolution.height" value="${ssResolution.height}">
                        </div>
                    </div>
                     <div class="prop-row-multi" data-canvas-props="screen" style="display: ${!isWorldSpace ? 'flex' : 'none'};">
                        <label>${L.get('SCREEN_MATCH', 'Screen Match')}</label>
                         <select class="prop-input" data-component="Canvas" data-prop="screenMatchMode">
                            <option value="Match Width Or Height" ${ley.screenMatchMode === 'Match Width Or Height' ? 'selected' : ''}>${L.get('MATCH_WIDTH_HEIGHT', 'Match Width Or Height')}</option>
                        </select>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Canvas" data-prop="showGrid" ${ley.showGrid ? 'checked' : ''}>
                        <label>${L.get('SHOW_GRID_GIZMO', 'Show Grid Gizmo')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Canvas" data-prop="scaleChildren" ${ley.scaleChildren ? 'checked' : ''}>
                        <label>${L.get('SCALE_CHILDREN', 'Scale Children')}</label>
                    </div>
                </div>`;
        } else if (ley instanceof Components.Button) {
            const isColorTint = ley.transition === 'Color Tint';
            const isSpriteSwap = ley.transition === 'Sprite Swap';
            const isAnimation = ley.transition === 'Animation';
            componentHTML = `
                ${renderComponentHeader(L.get('BUTTON', "Button"), "mouse-pointer", index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Button" data-prop="interactable" ${ley.interactable ? 'checked' : ''}>
                        <label>${L.get('INTERACTABLE', 'Interactable')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label>${L.get('TRANSITION', 'Transition')}</label>
                        <select class="prop-input inspector-re-render" data-component="Button" data-prop="transition">
                            <option value="None" ${ley.transition === 'None' ? 'selected' : ''}>${L.get('NONE', 'None')}</option>
                            <option value="Color Tint" ${isColorTint ? 'selected' : ''}>${L.get('COLOR_TINT', 'Color Tint')}</option>
                            <option value="Sprite Swap" ${isSpriteSwap ? 'selected' : ''}>${L.get('SPRITE_SWAP', 'Sprite Swap')}</option>
                            <option value="Animation" ${isAnimation ? 'selected' : ''}>${L.get('ANIMATION', 'Animation')}</option>
                        </select>
                    </div>
                    <div id="color-tint-settings" style="display: ${isColorTint ? 'block' : 'none'};">
                        <div class="prop-row-multi">
                            <label>${L.get('NORMAL_COLOR', 'Normal Color')}</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.normalColor" value="${ley.colors.normalColor}">
                        </div>
                        <div class="prop-row-multi">
                            <label>${L.get('PRESSED_COLOR', 'Pressed Color')}</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.pressedColor" value="${ley.colors.pressedColor}">
                        </div>
                        <div class="prop-row-multi">
                            <label>${L.get('DISABLED_COLOR', 'Disabled Color')}</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.disabledColor" value="${ley.colors.disabledColor}">
                        </div>
                    </div>
                    <div id="sprite-swap-settings" style="display: ${isSpriteSwap ? 'block' : 'none'};">
                        <div class="inspector-row">
                            <label>${L.get('HIGHLIGHTED_SPRITE', 'Highlighted Sprite')}</label>
                            ${renderPropertyDropper('Sprite', ley.spriteSwap.highlightedSprite, 'data-component="Button" data-prop="spriteSwap.highlightedSprite"')}
                        </div>
                        <div class="inspector-row">
                            <label>${L.get('PRESSED_SPRITE', 'Pressed Sprite')}</label>
                            ${renderPropertyDropper('Sprite', ley.spriteSwap.pressedSprite, 'data-component="Button" data-prop="spriteSwap.pressedSprite"')}
                        </div>
                        <div class="inspector-row">
                            <label>${L.get('DISABLED_SPRITE', 'Disabled Sprite')}</label>
                            ${renderPropertyDropper('Sprite', ley.spriteSwap.disabledSprite, 'data-component="Button" data-prop="spriteSwap.disabledSprite"')}
                        </div>
                    </div>
                    <div id="animation-settings" style="display: ${isAnimation ? 'block' : 'none'};">
                        <div class="prop-row-multi">
                            <label>${L.get('HIGHLIGHTED_TRIGGER', 'Highlighted Trigger')}</label>
                            <input type="text" class="prop-input" data-component="Button" data-prop="animationTriggers.highlightedTrigger" value="${ley.animationTriggers.highlightedTrigger}">
                        </div>
                        <div class="prop-row-multi">
                            <label>${L.get('PRESSED_TRIGGER', 'Pressed Trigger')}</label>
                            <input type="text" class="prop-input" data-component="Button" data-prop="animationTriggers.pressedTrigger" value="${ley.animationTriggers.pressedTrigger}">
                        </div>
                        <div class="prop-row-multi">
                            <label>${L.get('DISABLED_TRIGGER', 'Disabled Trigger')}</label>
                            <input type="text" class="prop-input" data-component="Button" data-prop="animationTriggers.disabledTrigger" value="${ley.animationTriggers.disabledTrigger}">
                        </div>
                    </div>
                     <div class="inspector-section-header">
                        <span>${L.get('ON_CLICK', 'On Click ()')}</span>
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
                                ${renderPropertyDropper('Materia', event.targetMateriaId, `data-prop="onClick.${index}.targetMateriaId"`)}
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
                        <label for="sprite-name-select" data-i18n="SPRITE">Sprite</label>
                        <select id="sprite-name-select" class="prop-input inspector-re-render" data-component="SpriteRenderer" data-prop="spriteName">
                            ${options}
                        </select>
                    </div>
                `;
            }

            componentHTML = `
                ${renderComponentHeader("Sprite Renderer", icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="PROP_SOURCE">${L.get('PROP_SOURCE', 'Source')}</label>
                        ${renderPropertyDropper('Sprite', ley.spriteAssetPath || ley.source, 'data-component="SpriteRenderer" data-prop="source"')}
                    </div>
                    ${spriteSelectorHTML}
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" class="prop-input hex-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_OPACITY">${L.get('PROP_OPACITY', 'Opacity')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" data-component="SpriteRenderer" data-prop="opacity" value="${ley.opacity ?? 1}" min="0" max="1" step="0.01" style="flex-grow: 1;" oninput="this.nextElementSibling.innerText = Math.round(this.value * 100) + '%'">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.opacity ?? 1) * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_PIVOT">${L.get('PROP_PIVOT', 'Pivot')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.01" data-component="SpriteRenderer" data-prop="pivot.x" value="${ley.pivot?.x ?? 0.5}" title="Pivot X">
                            <input type="number" class="prop-input" step="0.01" data-component="SpriteRenderer" data-prop="pivot.y" value="${ley.pivot?.y ?? 0.5}" title="Pivot Y">
                            <button class="small-btn" data-action="center-sprite-pivot" title="Centrar Pivot (0.5, 0.5)">${getIconHTML('target')}</button>
                            <button class="small-btn" data-action="auto-pivot-sprite" title="Ajustar al Contenido (Auto-Pivot)" style="font-size: 10px; padding: 2px 4px;">AUTO</button>
                        </div>
                    </div>
                    <div class="inspector-row">
                        <label></label>
                        <button class="inspector-btn" data-action="reset-sprite-scale" style="width: 100%; margin-top: 4px;" data-i18n="PROP_RESET_SCALE">${L.get('PROP_RESET_SCALE', 'Restablecer Escala (1:1)')}</button>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" class="prop-input" step="1" data-component="SpriteRenderer" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
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
                ${renderComponentHeader(`<a href="#">${ley.scriptName}</a>`, icon, index)}
                <div class="component-content">
                    ${publicVarsHTML || '<p class="field-description">Este script no tiene variables públicas.</p>'}
                </div>
            `;
        } else if (ley instanceof Components.Animator) {
            componentHTML = `
                ${renderComponentHeader(L.get('ANIMATOR', "Animator"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label>${L.get('ANIMATION_CLIP', 'Animation Clip')}</label>
                        ${renderPropertyDropper('Animation', ley.animationClipPath, 'data-component="Animator" data-prop="animationClipPath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('SPEED', 'Speed')}</label>
                        <input type="number" class="prop-input" step="1" min="0" data-component="Animator" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Animator" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label>${L.get('LOOP', 'Loop')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Animator" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label>${L.get('PLAY_ON_AWAKE', 'Play On Awake')}</label>
                    </div>
                </div>`;
        } else if (ley instanceof Components.AnimatorController) {
            let statesListHTML = `<p class="field-description">${L.get('HINT_ASIGNAR_CONTROLADOR', 'Asigna un Controller para ver sus estados.')}</p>`;
            if (ley.controller && ley.states.size > 0) {
                statesListHTML = '<ul>';
                for (const stateName of ley.states.keys()) {
                    statesListHTML += `<li>${stateName}</li>`;
                }
                statesListHTML += '</ul>';
            }
            componentHTML = `
                ${renderComponentHeader(L.get('ANIMATOR_CONTROLLER', "Animator Controller"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label>${L.get('CONTROLLER', 'Controller')}</label>
                        ${renderPropertyDropper('AnimatorController', ley.controllerPath, 'data-component="AnimatorController" data-prop="controllerPath"')}
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="AnimatorController" data-prop="smartMode" ${ley.smartMode ? 'checked' : ''}>
                        <label>${L.get('SMART_MODE_DIRECTIONS', 'Modo Inteligente (Direcciones)')}</label>
                    </div>

                    <div class="inspector-section-header"><span>${L.get('RESPONSE_CONFIG', 'Configuración de Respuesta')}</span></div>
                    <div class="prop-row-multi">
                        <label title="${L.get('DEADZONE_DESC', 'Movimiento mínimo para activar dirección')}">${L.get('DEADZONE', 'Sensibilidad (Deadzone)')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" max="1" data-component="AnimatorController" data-prop="deadZone" value="${ley.deadZone ?? 0.1}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('START_DELAY_DESC', 'Tiempo de espera para empezar animación')}">${L.get('START_DELAY', 'Retraso Inicio (s)')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="startDelay" value="${ley.startDelay ?? 0.02}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('STOP_DELAY_DESC', 'Tiempo de espera para volver a parado')}">${L.get('STOP_DELAY', 'Retraso Parada (s)')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="stopDelay" value="${ley.stopDelay ?? 0.02}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('DIRECTION_DELAY_DESC', 'Tiempo de espera para cambiar dirección')}">${L.get('DIRECTION_DELAY', 'Retraso Giro (s)')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="directionDelay" value="${ley.directionDelay ?? 0.05}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('STOP_BUFFER_DESC', 'Tiempo que la animación sigue activa tras soltar')}">${L.get('STOP_BUFFER', 'Buffer Inercia (s)')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="stopBuffer" value="${ley.stopBuffer ?? 0.05}">
                    </div>

                    <div class="inspector-field-group">
                        <label>${L.get('STATES', 'States')}</label>
                        ${statesListHTML}
                    </div>
                </div>`;
        } else if (ley instanceof Components.Camera) {
            const projection = ley.projection || 'Perspective';
            const clearFlags = ley.clearFlags || 'SolidColor';

            componentHTML = `
                ${renderComponentHeader(L.get('CAMERA', "Camera"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('DEPTH', 'Depth')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Camera" data-prop="depth" value="${ley.depth || 0}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('CLEAR_FLAGS', 'Clear Flags')}</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="Camera" data-prop="clearFlags">
                                <option value="SolidColor" ${clearFlags === 'SolidColor' ? 'selected' : ''}>${L.get('SOLID_COLOR', 'Solid Color')}</option>
                                <option value="Skybox" ${clearFlags === 'Skybox' ? 'selected' : ''}>${L.get('SKYBOX', 'Skybox')}</option>
                                <option value="DontClear" ${clearFlags === 'DontClear' ? 'selected' : ''}>${L.get('DONT_CLEAR', "Don't Clear")}</option>
                            </select>
                        </div>
                    </div>

                    <div class="prop-row-multi" style="display: ${clearFlags === 'SolidColor' ? 'flex' : 'none'};">
                        <label>${L.get('BACKGROUND', 'Background')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="Camera" data-prop="backgroundColor" value="${ley.backgroundColor || '#1e293b'}">
                        </div>
                    </div>

                    <div class="prop-row-multi">
                        <label>${L.get('CULLING_MASK', 'Culling Mask')}</label>
                        <div class="prop-inputs">
                            <button id="culling-mask-btn" class="prop-input-button">${getCullingMaskText(ley.cullingMask)}</button>
                        </div>
                    </div>

                     <div class="prop-row-multi">
                        <label>${L.get('SIZE_ZOOM', 'Size (Zoom)')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Camera" data-prop="orthographicSize" value="${ley.orthographicSize || 5}" min="0.1">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.PointLight2D) {
            console.log('  - Is PointLight2D component.');
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('POINT_LIGHT_2D', "Point Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="PointLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" class="prop-input hex-input" data-component="PointLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    ${renderLightColorPresets("PointLight2D")}
                    <div class="prop-row-multi">
                        <label>${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="PointLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="PointLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('RADIUS', 'Radius')}</label>
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
                ${renderComponentHeader(L.get('SPOT_LIGHT_2D', "Spot Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="SpotLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" class="prop-input hex-input" data-component="SpotLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    ${renderLightColorPresets("SpotLight2D")}
                    <div class="prop-row-multi">
                        <label>${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="SpotLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="SpotLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('RADIUS', 'Radius')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="10" min="0" data-component="SpotLight2D" data-prop="radius" value="${ley.radius}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('ANGLE', 'Angle')}</label>
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
                ${renderComponentHeader(L.get('FREEFORM_LIGHT_2D', "Freeform Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="FreeformLight2D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    ${renderLightColorPresets("FreeformLight2D")}
                    <div class="prop-row-multi">
                        <label>${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="FreeformLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="FreeformLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                    <hr>
                    <p class="field-description">${L.get('VERTICES_EDIT_FUTURE', 'La edición de vértices se implementará en una futura actualización.')}</p>
                </div>
            </div>`;
        } else if (ley instanceof Components.Tilemap) {
            // Safeguard against corrupted layer data from old scene files
            if (!ley.layers || !Array.isArray(ley.layers)) {
                componentHTML = `
                    ${renderComponentHeader('Tilemap', 'map', index)}
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
                    ${renderComponentHeader(L.get('TILEMAP', 'Tilemap'), 'map', index)}
                    <div class="component-content">
                        <div class="checkbox-field">
                            <input type="checkbox" id="tilemap-manual-size-toggle" data-component="Tilemap" ${ley.manualSize ? 'checked' : ''}>
                            <label for="tilemap-manual-size-toggle">${L.get('MANUAL_SIZE', 'Tamaño Manual')}</label>
                        </div>
                        ${sizeInputHTML}
                        <hr>
                        <div class="layer-manager-ui">
                            <div class="layer-list-header">
                                <h5>${L.get('LAYERS', 'Capas')}</h5>
                                <div class="layer-controls">
                                    <button class="layer-btn add" data-action="add-layer" title="${L.get('ADD_LAYER', 'Añadir Capa')}">+</button>
                                    <button class="layer-btn remove" data-action="remove-layer" title="${L.get('REMOVE_SELECTED_LAYER', 'Eliminar Capa Seleccionada')}">-</button>
                                </div>
                            </div>
                            <div class="layer-list">
                                ${ley.layers.map((layer, index) => `
                                    <div class="layer-item ${index === ley.activeLayerIndex ? 'active' : ''}" data-action="select-layer" data-index="${index}">
                                        <div class="layer-item-main">
                                            <span>${L.get('LAYER', 'Capa')} ${index}</span>
                                            ${index === ley.activeLayerIndex ? `
                                                <div class="layer-pos-inputs">
                                                    <input type="number" class="prop-input small" step="1" data-component="Tilemap" data-prop="layers.${index}.position.x" value="${layer.position.x}" title="${L.get('LAYER_OFFSET_X', 'Layer Offset X')}">
                                                    <input type="number" class="prop-input small" step="1" data-component="Tilemap" data-prop="layers.${index}.position.y" value="${layer.position.y}" title="${L.get('LAYER_OFFSET_Y', 'Layer Offset Y')}">
                                                </div>
                                            ` : `
                                                <span class="layer-info">(X: ${layer.position.x}, Y: ${layer.position.y})</span>
                                            `}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }
        } else if (ley instanceof Components.TilemapRenderer) {
            componentHTML = `
                ${renderComponentHeader('Tilemap Renderer', 'brush', index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>Order in Layer</label>
                        <input type="number" class="prop-input" step="1" data-component="TilemapRenderer" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
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
                ${renderComponentHeader(L.get('TILEMAP_COLLIDER_2D', 'Tilemap Collider 2D'), 'grid', index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label for="collider-source-layer">${L.get('SOURCE_LAYER', 'Capa de Origen')}</label>
                        <select id="collider-source-layer" class="prop-input" data-component="TilemapCollider2D" data-prop="sourceLayerIndex">
                            ${layerOptions}
                        </select>
                    </div>
                    <hr>
                    <button class="primary-btn" data-action="generate-colliders" style="width: 100%;">${L.get('GENERATE_COLLIDERS', 'Generar Colisionadores')}</button>
                    <p class="field-description" style="margin-top: 8px;">${L.get('COLLIDERS_GENERATED', 'Colisionadores generados')}: ${ley.generatedColliders.length}</p>
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
                ${renderComponentHeader(L.get('GRID', "Grid"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" id="grid-simplified-toggle" data-component="Grid" ${ley.isSimplified ? 'checked' : ''}>
                        <label for="grid-simplified-toggle">${L.get('SIMPLIFIED', 'Simplificado')}</label>
                    </div>
                    ${sizeInputHTML}
                </div>
            </div>`;
        } else if (ley instanceof Components.CapsuleCollider2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('CAPSULE_COLLIDER_2D', "Capsule Collider 2D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CapsuleCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label>${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label>${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('SIZE', 'Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="size.x" value="${ley.size.x}" title="${L.get('SIZE_X', 'Size X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="size.y" value="${ley.size.y}" title="${L.get('SIZE_Y', 'Size Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('DIRECTION', 'Direction')}</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="CapsuleCollider2D" data-prop="direction">
                                <option value="Vertical" ${ley.direction === 'Vertical' ? 'selected' : ''}>${L.get('VERTICAL', 'Vertical')}</option>
                                <option value="Horizontal" ${ley.direction === 'Horizontal' ? 'selected' : ''}>${L.get('HORIZONTAL', 'Horizontal')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.SpriteLight2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('SPRITE_LIGHT_2D', "Sprite Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label>${L.get('SPRITE', 'Sprite')}</label>
                        ${renderPropertyDropper('Sprite', ley.source, 'data-component="SpriteLight2D" data-prop="source"')}
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="SpriteLight2D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    ${renderLightColorPresets("SpriteLight2D")}
                    <div class="prop-row-multi">
                        <label>${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="SpriteLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="SpriteLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.Rigidbody2D) {
            const rigidbody = ley; // Rename for clarity as suggested in review
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader("Rigidbody 2D", icon, index)}
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
                        <div class="prop-row-multi">
                            <label>Rebote (Bounciness)</label>
                            <input type="number" class="prop-input" step="0.1" min="0" max="1" data-component="Rigidbody2D" data-prop="rebote" value="${rigidbody.rebote || 0}">
                        </div>
                        <div class="prop-row-multi">
                            <label>Angular Drag</label>
                            <input type="number" class="prop-input" step="0.01" min="0" data-component="Rigidbody2D" data-prop="angularDrag" value="${rigidbody.angularDrag || 0}">
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
                ${renderComponentHeader(ley.definition.nombre, 'settings', index)}
                <div class="component-content">
                    ${publicVarsHTML || '<p class="field-description">Este componente no tiene propiedades públicas.</p>'}
                </div>
            `;
        } else if (ley instanceof Components.DrawingOrder) {
            componentHTML = `
                ${renderComponentHeader(L.get('DRAWING_ORDER_COMPONENT', "Orden de Dibujo"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('ORDER', 'Orden')}</label>
                        <input type="number" class="prop-input" step="1" data-component="DrawingOrder" data-prop="order" value="${ley.order || 0}">
                    </div>
                    <p class="field-description">${L.get('DRAWING_ORDER_DESC', 'Valores altos delante, bajos detrás. Sobrescribe el orden por defecto.')}</p>
                </div>
            `;
        } else if (ley instanceof Components.BoxCollider2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('BOX_COLLIDER_2D', "Box Collider 2D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="BoxCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label>${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label>${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('SIZE', 'Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="size.x" value="${ley.size.x}" title="${L.get('SIZE_X', 'Size X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="size.y" value="${ley.size.y}" title="${L.get('SIZE_Y', 'Size Y')}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.Movement) {
            componentHTML = `
                ${renderComponentHeader(L.get('MOVEMENT_BASIC', "Movimiento (Básico)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('KEYS_UP_DOWN', 'Teclas (Arriba/Abajo)')}</label>
                        <div class="prop-inputs">
                            <input type="text" class="prop-input" data-component="Movement" data-prop="upKey" value="${ley.upKey}" title="${L.get('UP', 'Arriba')}">
                            <input type="text" class="prop-input" data-component="Movement" data-prop="downKey" value="${ley.downKey}" title="${L.get('DOWN', 'Abajo')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('KEYS_LEFT_RIGHT', 'Teclas (Izq/Der)')}</label>
                        <div class="prop-inputs">
                            <input type="text" class="prop-input" data-component="Movement" data-prop="leftKey" value="${ley.leftKey}" title="${L.get('LEFT', 'Izquierda')}">
                            <input type="text" class="prop-input" data-component="Movement" data-prop="rightKey" value="${ley.rightKey}" title="${L.get('RIGHT', 'Derecha')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('JUMP_KEY', 'Tecla Salto')}</label>
                        <input type="text" class="prop-input" data-component="Movement" data-prop="jumpKey" value="${ley.jumpKey}">
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label>${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" class="prop-input" data-component="Movement" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('JUMP_FORCE', 'Fuerza Salto')}</label>
                        <input type="number" class="prop-input" data-component="Movement" data-prop="jumpForce" value="${ley.jumpForce}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Movement" data-prop="useRigidbody" ${ley.useRigidbody ? 'checked' : ''}>
                        <label>${L.get('USE_RIGIDBODY', 'Usar Rigidbody')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('GROUND_TAG', 'Tag del Suelo')}</label>
                        <input type="text" class="prop-input" data-component="Movement" data-prop="groundTag" value="${ley.groundTag || 'Ground'}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.ProjectileLauncher) {
            componentHTML = `
                ${renderComponentHeader(L.get('PROJECTILE_LAUNCHER', "Lanzador de Proyectiles"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label>${L.get('PROJECTILE_PREFAB', 'Prefab Proyectil')}</label>
                        <div class="file-picker">
                            <input type="text" class="prop-input" data-component="ProjectileLauncher" data-prop="projectilePrefab" value="${ley.projectilePrefab}" placeholder="${L.get('HINT_ARRIASTRA_PREFAB', 'Arrastra un .ceprefab aquí')}">
                            <button class="panel-tool-btn" onclick="window.openAssetSelector((h, p) => { const input = this.previousElementSibling; input.value = p; input.dispatchEvent(new Event('change', { bubbles: true })); }, '.ceprefab')">...</button>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('FIRE_KEY', 'Tecla Disparo')}</label>
                        <input type="text" class="prop-input" data-component="ProjectileLauncher" data-prop="fireKey" value="${ley.fireKey}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('FIRE_RATE', 'Cadencia (segs)')}</label>
                        <input type="number" class="prop-input" step="0.1" min="0" data-component="ProjectileLauncher" data-prop="fireRate" value="${ley.fireRate}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" class="prop-input" step="1" data-component="ProjectileLauncher" data-prop="projectileSpeed" value="${ley.projectileSpeed}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="ProjectileLauncher" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="ProjectileLauncher" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                        </div>
                    </div>
                     <div class="prop-row-multi">
                        <label>${L.get('DIRECTION', 'Dirección')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="ProjectileLauncher" data-prop="direction.x" value="${ley.direction.x}" title="X">
                            <input type="number" class="prop-input" step="0.1" data-component="ProjectileLauncher" data-prop="direction.y" value="${ley.direction.y}" title="Y">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.AutoDestroy) {
            componentHTML = `
                ${renderComponentHeader(L.get('AUTO_DESTROY_COMPONENT', "Destrucción Automática"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('DELAY_SECS', 'Retraso (segs)')}</label>
                        <input type="number" class="prop-input" step="0.1" min="0" data-component="AutoDestroy" data-prop="delay" value="${ley.delay}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.CameraFollow) {
             componentHTML = `
                ${renderComponentHeader(L.get('CAMERA_FOLLOW_COMPONENT', "Seguimiento Cámara"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label>${L.get('TARGET', 'Objetivo')}</label>
                        ${renderPropertyDropper('Materia', ley.target ? ley.target.id : null, 'data-component="CameraFollow" data-prop="target"')}
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('SMOOTHNESS', 'Suavidad')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" max="1" data-component="CameraFollow" data-prop="smoothness" value="${ley.smoothness}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="CameraFollow" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="CameraFollow" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                        </div>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CameraFollow" data-prop="followX" ${ley.followX ? 'checked' : ''}>
                        <label>${L.get('FOLLOW_X', 'Seguir X')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CameraFollow" data-prop="followY" ${ley.followY ? 'checked' : ''}>
                        <label>${L.get('FOLLOW_Y', 'Seguir Y')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.ParticleSystem) {
            componentHTML = `
                ${renderComponentHeader(L.get('PARTICLE_SYSTEM', "Sistema de Partículas"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label>${L.get('PARTICLE_PREFAB', 'Prefab Partícula')}</label>
                        ${renderPropertyDropper('Prefab', ley.prefabPath, 'data-component="ParticleSystem" data-prop="prefabPath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('MAX_PARTICLES', 'Max Partículas')}</label>
                        <input type="number" class="prop-input" step="1" min="1" data-component="ParticleSystem" data-prop="maxParticles" value="${ley.maxParticles}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('EMISSION_RATE', 'Emisión (part/seg)')}</label>
                        <input type="number" class="prop-input" step="1" min="0" data-component="ParticleSystem" data-prop="emissionRate" value="${ley.emissionRate}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('LIFETIME', 'Vida (seg)')}</label>
                        <input type="number" class="prop-input" step="0.1" min="0" data-component="ParticleSystem" data-prop="lifetime" value="${ley.lifetime}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" class="prop-input" step="1" data-component="ParticleSystem" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('SPREAD', 'Dispersión (spread)')}</label>
                        <input type="number" class="prop-input" step="1" min="0" max="360" data-component="ParticleSystem" data-prop="spread" value="${ley.spread}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="ParticleSystem" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label>${L.get('LOOP', 'Loop')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="ParticleSystem" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label>${L.get('PLAY_ON_AWAKE', 'Play On Awake')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Parallax) {
            componentHTML = `
                ${renderComponentHeader(L.get('PARALLAX_COMPONENT', "Parallax (Avanzado)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('SCROLL_FACTOR', 'Scroll Factor X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.01" data-component="Parallax" data-prop="scrollFactor.x" value="${ley.scrollFactor.x}" title="X">
                            <input type="number" class="prop-input" step="0.01" data-component="Parallax" data-prop="scrollFactor.y" value="${ley.scrollFactor.y}" title="Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('REPEAT_INFINITE', 'Repetir (Infinito)')}</label>
                        <div class="prop-inputs" style="display: flex; align-items: center; gap: 10px; justify-content: flex-start;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="checkbox" class="prop-input" data-component="Parallax" data-prop="repeatX" ${ley.repeatX ? 'checked' : ''} id="parallax-repeat-x-${index}">
                                <label for="parallax-repeat-x-${index}" style="font-size: 10px; margin: 0;">${L.get('HORIZONTAL', 'Horizontal')}</label>
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="checkbox" class="prop-input" data-component="Parallax" data-prop="repeatY" ${ley.repeatY ? 'checked' : ''} id="parallax-repeat-y-${index}">
                                <label for="parallax-repeat-y-${index}" style="font-size: 10px; margin: 0;">${L.get('VERTICAL', 'Vertical')}</label>
                            </div>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('MIRRORING_XY', 'Mirroring X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Parallax" data-prop="mirroring.x" value="${ley.mirroring.x}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="Parallax" data-prop="mirroring.y" value="${ley.mirroring.y}" title="Y">
                        </div>
                    </div>
                    <button class="panel-tool-btn" style="width:100%; margin-bottom: 8px;" data-action="parallax-match-sprite" data-ley-index="${index}">${L.get('MATCH_MIRRORING_SPRITE', 'Ajustar Mirroring al Sprite')}</button>
                    <div class="prop-row-multi">
                        <label>${L.get('OFFSET_XY', 'Offset X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Parallax" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="Parallax" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('AUTOSCROLL_XY', 'Autoscroll X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Parallax" data-prop="autoscroll.x" value="${ley.autoscroll.x}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="Parallax" data-prop="autoscroll.y" value="${ley.autoscroll.y}" title="Y">
                        </div>
                    </div>
                    <p class="field-description">${L.get('PARALLAX_DESC', 'Scroll Factor: 0 = Pegado a cámara. 1 = Mundo real.<br>Mirroring: Tamaño de repetición (0 = no repite).')}</p>
                </div>
            `;
        } else if (ley instanceof Components.Terreno2D) {
            const settings = TerrenoEditorWindow.settings;
            componentHTML = `
                ${renderComponentHeader(L.get('TERRAIN_2D_COMPONENT', "Terreno 2D (Píxeles)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('CANVAS_SIZE', 'Canvas Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Terreno2D" data-prop="width" value="${ley.width}" title="${L.get('WIDTH', 'Width')}">
                            <input type="number" class="prop-input" data-component="Terreno2D" data-prop="height" value="${ley.height}" title="${L.get('HEIGHT', 'Height')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('BASE_COLOR', 'Color Base')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="Terreno2D" data-prop="baseColor" value="${ley.baseColor || '#4a4a4a'}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" class="prop-input" step="1" data-component="Terreno2D" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
                    <button class="panel-tool-btn" style="width:100%; margin-bottom: 8px;" onclick="const t = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.Terreno2D); t.maskCtx.clearRect(0,0,t.width,t.height); window.updateScene();">${L.get('CLEAR_ALL', 'Limpiar Todo')}</button>
                    <hr>
                    <h5>${L.get('TERRAIN_BRUSH', 'Pincel de Terreno')}</h5>
                    <div class="prop-row-multi">
                        <label>${L.get('MODE', 'Modo')}</label>
                        <select class="terrain-tool-input" onchange="window.TerrenoEditorWindow.setMode(this.value)">
                            <option value="draw" ${settings.mode === 'draw' ? 'selected' : ''}>${L.get('DRAW_TERRAIN', 'Dibujar Terreno')}</option>
                            <option value="erase" ${settings.mode === 'erase' ? 'selected' : ''}>${L.get('ERASE_TERRAIN', 'Borrar Terreno')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('SIZE', 'Tamaño')}</label>
                        <input type="range" min="1" max="200" value="${settings.brushSize}" oninput="window.TerrenoEditorWindow.setBrushSize(this.value); this.nextElementSibling.innerText = this.value;">
                        <span style="min-width: 30px; text-align: right;">${settings.brushSize}</span>
                    </div>
                    <hr>
                    <div class="layer-manager-ui">
                        <div class="layer-list-header">
                            <h5>${L.get('FILL_TEXTURES', 'Texturas de Relleno')}</h5>
                            <button class="layer-btn add" data-action="terrain-add-layer" title="${L.get('ADD_LAYER', 'Añadir Capa')}">+</button>
                        </div>
                        <div class="layer-list">
                            ${ley.layers.map((layer, lIdx) => `
                            <div class="layer-item ${lIdx === settings.selectedLayer ? 'active' : ''}" onclick="window.TerrenoEditorWindow.setSelectedLayer(${lIdx}); window.updateInspector();">
                                    <div style="flex-grow:1;">
                                        ${renderPropertyDropper('Sprite', layer.texturePath, `data-action="terrain-layer-texture" data-layer-index="${lIdx}"`)}
                                    </div>
                                    <button class="layer-btn remove" data-action="terrain-remove-layer" data-index="${lIdx}">-</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <p class="field-description">${L.get('TERRAIN_BRUSH_DESC', 'Dibuja libremente en la escena con la herramienta de pincel de terreno activada. Las texturas rellenarán las zonas pintadas.')}</p>
                </div>
            `;
        } else if (ley instanceof Components.TerrenoCollider2D) {
            const isPolygon = ley.mode === 'Polygon';
            componentHTML = `
                ${renderComponentHeader(L.get('TERRAIN_COLLIDER_2D', "Terreno Collider 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('MODE', 'Modo')}</label>
                        <select class="prop-input inspector-re-render" data-component="TerrenoCollider2D" data-prop="mode">
                            <option value="Rectangles" ${ley.mode === 'Rectangles' ? 'selected' : ''}>${L.get('RECTANGLES_GRID', 'Rectángulos (Grilla)')}</option>
                            <option value="Polygon" ${ley.mode === 'Polygon' ? 'selected' : ''}>${L.get('POLYGON_EXACT', 'Polígono (Exacto)')}</option>
                        </select>
                    </div>
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="TerrenoCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label>${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <div class="prop-row-multi" style="display: ${isPolygon ? 'none' : 'flex'};">
                        <label>${L.get('RESOLUTION', 'Resolución')}</label>
                        <input type="number" class="prop-input" step="1" min="4" max="64" data-component="TerrenoCollider2D" data-prop="resolution" value="${ley.resolution || 16}">
                    </div>
                    <div class="prop-row-multi" style="display: ${isPolygon ? 'flex' : 'none'};">
                        <label>${L.get('SIMPLICITY', 'Simplicidad')}</label>
                        <input type="number" class="prop-input" step="0.5" min="0" data-component="TerrenoCollider2D" data-prop="simplifyTolerance" value="${ley.simplifyTolerance || 2.0}">
                    </div>
                    <p class="field-description">${isPolygon ? L.get('POLYGON_SIMPLICITY_DESC', 'Mayor simplicidad = menos puntos en el polígono.') : L.get('GRID_RESOLUTION_DESC', 'Cuanto menor sea la resolución, más precisos serán los rectángulos.')}</p>
                    <hr>
                    <button class="primary-btn" data-action="generate-colliders" style="width: 100%;">${L.get('REGENERATE_COLLISIONS', 'Regenerar Colisiones')}</button>
                    <p class="field-description" style="margin-top: 8px;">
                        ${isPolygon ? `${L.get('ISLANDS_POLYGONS', 'Islas (Polígonos)')}: ${ley.generatedPolygons?.length || 0}` : `${L.get('RECTANGLES', 'Rectángulos')}: ${ley.generatedColliders?.length || 0}`}
                    </p>
                </div>
            `;
        } else if (ley instanceof Components.Gyzmo) {
            componentHTML = `
                ${renderComponentHeader(L.get('GYZMO_AREAS', "Gyzmo (Áreas)"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Gyzmo" data-prop="showInGame" ${ley.showInGame ? 'checked' : ''}>
                        <label>${L.get('SHOW_IN_GAME_GLOBAL', 'Mostrar en Juego (Global)')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" class="prop-input" step="1" data-component="Gyzmo" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
                    <hr>
                    <div class="layer-manager-ui">
                        <div class="layer-list-header">
                            <h5>${L.get('RECTANGLES', 'Rectángulos')}</h5>
                            <button class="layer-btn add" data-action="gyzmo-add-layer" title="${L.get('ADD_RECTANGLE', 'Añadir Rectángulo')}">+</button>
                        </div>
                        <div class="layer-list">
                            ${ley.layers.map((layer, lIdx) => `
                                <div class="layer-item" style="flex-direction: column; align-items: stretch; gap: 5px; padding: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <input type="text" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.name" value="${layer.name || ''}" style="flex-grow: 1; margin-right: 5px;" placeholder="${L.get('NAME', 'Nombre')}">
                                        <button class="layer-btn remove" data-action="gyzmo-remove-layer" data-index="${lIdx}">-</button>
                                    </div>
                                    <div class="prop-row-multi">
                                        <label>${L.get('POS_XY', 'Pos (X/Y)')}</label>
                                        <div class="prop-inputs">
                                            <input type="number" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.x" value="${layer.x}" title="X">
                                            <input type="number" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.y" value="${layer.y}" title="Y">
                                        </div>
                                    </div>
                                    <div class="prop-row-multi">
                                        <label>${L.get('SIZE_WH', 'Size (W/H)')}</label>
                                        <div class="prop-inputs">
                                            <input type="number" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.width" value="${layer.width}" title="${L.get('WIDTH', 'Width')}">
                                            <input type="number" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.height" value="${layer.height}" title="${L.get('HEIGHT', 'Height')}">
                                        </div>
                                    </div>
                                    <div class="prop-row-multi">
                                        <label>${L.get('COLOR', 'Color')}</label>
                                        <div class="prop-inputs">
                                            <input type="color" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.color" value="${layer.color || '#00ff00'}">
                                        </div>
                                    </div>
                                    <div class="checkbox-field">
                                        <input type="checkbox" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.showInGame" ${layer.showInGame ? 'checked' : ''}>
                                        <label>${L.get('VISIBLE_IN_GAME', 'Visible en Juego')}</label>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.RaycastSource) {
            componentHTML = `
                ${renderComponentHeader(L.get('RAYCAST_SOURCE', "Raycast Source (Rallo)"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="RaycastSource" data-prop="showGizmo" ${ley.showGizmo ? 'checked' : ''}>
                        <label data-i18n="SHOW_RAYS">${L.get('SHOW_RAYS', 'Mostrar Rayos')}</label>
                    </div>
                    <div class="inspector-section-header">
                        <span data-i18n="RAYS">${L.get('RAYS', 'Rayos')}</span>
                        <button class="layer-btn add" data-action="rallo-add-ray">+</button>
                    </div>
                    <div class="layer-list">
                        ${ley.rays.map((ray, rIdx) => `
                            <div class="layer-item" style="flex-direction: column; align-items: stretch; gap: 5px; padding: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>${L.get('RAY', 'Rayo')} ${rIdx}</span>
                                    <button class="layer-btn remove" data-action="rallo-remove-ray" data-index="${rIdx}">-</button>
                                </div>
                                <div class="prop-row-multi">
                                    <label data-i18n="ANGLE">${L.get('ANGLE', 'Ángulo')}</label>
                                    <input type="number" class="prop-input" data-component="RaycastSource" data-prop="rays.${rIdx}.angle" value="${ray.angle}">
                                </div>
                                <div class="prop-row-multi">
                                    <label data-i18n="LENGTH">${L.get('LENGTH', 'Longitud')}</label>
                                    <input type="number" class="prop-input" data-component="RaycastSource" data-prop="rays.${rIdx}.length" value="${ray.length}">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Water) {
            componentHTML = `
                ${renderComponentHeader(L.get('WATER', "Water (Agua)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Dimensions')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Water" data-prop="width" value="${ley.width}" title="${L.get('PROP_WIDTH', 'Width')}">
                            <input type="number" class="prop-input" data-component="Water" data-prop="height" value="${ley.height}" title="${L.get('PROP_HEIGHT', 'Height')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <input type="color" class="prop-input" data-component="Water" data-prop="color" value="${ley.color}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_WATER_DENSITY">${L.get('PROP_WATER_DENSITY', 'Density')}</label>
                        <input type="number" class="prop-input" data-component="Water" data-prop="density" value="${ley.density}" step="0.1">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_VISCOSITY">${L.get('PROP_VISCOSITY', 'Viscosity')}</label>
                        <input type="range" class="prop-input" data-component="Water" data-prop="viscosity" value="${ley.viscosity}" min="0" max="1" step="0.01">
                    </div>
                    <hr>
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Water" data-prop="showTides" ${ley.showTides ? 'checked' : ''}>
                        <label data-i18n="PROP_SHOW_MAREAS">${L.get('PROP_SHOW_MAREAS', 'Simular Mareas')}</label>
                    </div>
                    <div class="prop-row-multi" style="display: ${ley.showTides ? 'flex' : 'none'};">
                        <label data-i18n="PROP_TIDE_AMPLITUDE">${L.get('PROP_TIDE_AMPLITUDE', 'Amplitud')}</label>
                        <input type="number" class="prop-input" data-component="Water" data-prop="tideAmplitude" value="${ley.tideAmplitude}">
                    </div>
                    <button class="primary-btn" onclick="const w = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.Water); w.generateParticles(); window.updateScene();" style="width: 100%; margin-top: 10px;" data-i18n="REGENERAR_PARTICULAS">${L.get('REGENERAR_PARTICULAS', 'Regenerar Partículas')}</button>
                </div>
            `;
        } else if (ley instanceof Components.LineCollider2D) {
            componentHTML = `
                ${renderComponentHeader(L.get('LINE_COLLIDER', "Line Collider 2D"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="LineCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="PROP_IS_TRIGGER">${L.get('PROP_IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <div class="inspector-section-header">
                        <span data-i18n="PROP_POINTS">${L.get('PROP_POINTS', 'Puntos')}</span>
                        <button class="layer-btn add" data-action="line-add-point" data-i18n="PROP_ADD_POINT" title="${L.get('PROP_ADD_POINT', 'Añadir Punto')}">+</button>
                    </div>
                    <div class="layer-list" style="max-height: 200px; overflow-y: auto;">
                        ${ley.points.map((p, pIdx) => `
                            <div class="layer-item" style="gap: 5px; padding: 5px;">
                                <span style="min-width: 20px;">${pIdx}:</span>
                                <div class="prop-inputs">
                                    <input type="number" class="prop-input" data-component="LineCollider2D" data-prop="points.${pIdx}.x" value="${p.x}" title="X">
                                    <input type="number" class="prop-input" data-component="LineCollider2D" data-prop="points.${pIdx}.y" value="${p.y}" title="Y">
                                </div>
                                <button class="layer-btn remove" data-action="line-remove-point" data-index="${pIdx}" title="${L.get('BORRAR_PUNTO', 'Borrar punto')}">&times;</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.AudioSource) {
            componentHTML = `
                ${renderComponentHeader(L.get('AUDIO_SOURCE', "Audio Source"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="AUDIO_CLIP">${L.get('AUDIO_CLIP', 'Audio Clip')}</label>
                        ${renderPropertyDropper('Audio', ley.source, 'data-component="AudioSource" data-prop="source"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="VOLUMEN">${L.get('VOLUMEN', 'Volumen')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" data-component="AudioSource" data-prop="volume" value="${ley.volume}" min="0" max="1" step="0.01" style="flex-grow: 1;">
                            <span style="min-width: 30px; text-align: right;">${Math.round(ley.volume * 100)}%</span>
                        </div>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="AudioSource" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label data-i18n="BUCLE_LOOP">${L.get('BUCLE_LOOP', 'Bucle (Loop)')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="AudioSource" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label data-i18n="REPRODUCIR_AL_EMPEZAR">${L.get('REPRODUCIR_AL_EMPEZAR', 'Reproducir al Empezar')}</label>
                    </div>

                    <div class="inspector-section-header"><span data-i18n="AUDIO_ESPACIAL">${L.get('AUDIO_ESPACIAL', 'Audio Espacial')}</span></div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="AudioSource" data-prop="spatial" ${ley.spatial ? 'checked' : ''}>
                        <label data-i18n="ACTIVAR_AUDIO_ESPACIAL">${L.get('ACTIVAR_AUDIO_ESPACIAL', 'Activar Audio Espacial')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DISTANCIA_MINIMA">${L.get('DISTANCIA_MINIMA', 'Distancia Mínima')}</label>
                        <input type="number" class="prop-input" data-component="AudioSource" data-prop="minDistance" value="${ley.minDistance}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DISTANCIA_MAXIMA">${L.get('DISTANCIA_MAXIMA', 'Distancia Máxima')}</label>
                        <input type="number" class="prop-input" data-component="AudioSource" data-prop="maxDistance" value="${ley.maxDistance}">
                    </div>

                    <div class="inspector-section-header"><span data-i18n="RANGO_REPRODUCCION">${L.get('RANGO_REPRODUCCION', 'Rango de Reproducción')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="INICIO_SEG">${L.get('INICIO_SEG', 'Inicio (seg)')}</label>
                        <input type="number" class="prop-input" data-component="AudioSource" data-prop="playbackStart" value="${ley.playbackStart}" step="0.1" min="0">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FIN_SEG">${L.get('FIN_SEG', 'Fin (seg, 0=fin)')}</label>
                        <input type="number" class="prop-input" data-component="AudioSource" data-prop="playbackEnd" value="${ley.playbackEnd}" step="0.1" min="0">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.VehicleController) {
            componentHTML = `
                ${renderComponentHeader(L.get('VEHICLE_CONTROLLER', "Controlador de Vehículo"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('TYPE', 'Tipo')}</label>
                        <select class="prop-input" data-component="VehicleController" data-prop="vehicleType">
                            <option value="Car" ${ley.vehicleType === 'Car' ? 'selected' : ''}>Auto</option>
                            <option value="Plane" ${ley.vehicleType === 'Plane' ? 'selected' : ''}>Avión</option>
                            <option value="Helicopter" ${ley.vehicleType === 'Helicopter' ? 'selected' : ''}>Helicóptero</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('POWER', 'Potencia')}</label>
                        <input type="number" class="prop-input" data-component="VehicleController" data-prop="power" value="${ley.power}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('MAX_SPEED', 'Velocidad Máxima')}</label>
                        <input type="number" class="prop-input" data-component="VehicleController" data-prop="maxSpeed" value="${ley.maxSpeed}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('MASS', 'Peso (Masa)')}</label>
                        <input type="number" class="prop-input" data-component="VehicleController" data-prop="mass" value="${ley.mass}">
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span>${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label>${L.get('ACCELERATE', 'Acelerar')}</label>
                        <input type="text" class="prop-input" data-component="VehicleController" data-prop="accelerateKey" value="${ley.accelerateKey}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('BRAKE', 'Frenar')}</label>
                        <input type="text" class="prop-input" data-component="VehicleController" data-prop="brakeKey" value="${ley.brakeKey}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('LEFT', 'Izquierda')}</label>
                        <input type="text" class="prop-input" data-component="VehicleController" data-prop="leftKey" value="${ley.leftKey}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('RIGHT', 'Derecha')}</label>
                        <input type="text" class="prop-input" data-component="VehicleController" data-prop="rightKey" value="${ley.rightKey}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Fuerza Giro</label>
                        <input type="number" class="prop-input" data-component="VehicleController" data-prop="turnSpeed" value="${ley.turnSpeed}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Inclinación (Pitch)</label>
                        <input type="number" class="prop-input" data-component="VehicleController" data-prop="pitchStrength" value="${ley.pitchStrength}" step="0.1">
                    </div>
                    ${ley.vehicleType === 'Helicopter' ? `
                        <div class="prop-row-multi">
                            <label>${L.get('UP', 'Subir')}</label>
                            <input type="text" class="prop-input" data-component="VehicleController" data-prop="upKey" value="${ley.upKey}">
                        </div>
                        <div class="prop-row-multi">
                            <label>${L.get('DOWN', 'Bajar')}</label>
                            <input type="text" class="prop-input" data-component="VehicleController" data-prop="downKey" value="${ley.downKey}">
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (ley instanceof Components.WheelSuspension) {
            componentHTML = `
                ${renderComponentHeader(L.get('WHEEL_SUSPENSION', "Suspensión de Rueda"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label>${L.get('STIFFNESS', 'Dureza (K)')}</label>
                        <input type="number" class="prop-input" data-component="WheelSuspension" data-prop="stiffness" value="${ley.stiffness}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('DAMPING', 'Amortiguación (D)')}</label>
                        <input type="number" class="prop-input" data-component="WheelSuspension" data-prop="damping" value="${ley.damping}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('REST_LENGTH', 'Largo Reposo')}</label>
                        <input type="number" class="prop-input" data-component="WheelSuspension" data-prop="restLength" value="${ley.restLength}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('WHEEL_RADIUS', 'Radio Rueda')}</label>
                        <input type="number" class="prop-input" data-component="WheelSuspension" data-prop="wheelRadius" value="${ley.wheelRadius}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('GRIP', 'Agarre (Grip)')}</label>
                        <input type="number" class="prop-input" data-component="WheelSuspension" data-prop="grip" value="${ley.grip}" step="0.1">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('GRIP_TAGS', 'Tags Suelo')}</label>
                        <input type="text" class="prop-input" data-component="WheelSuspension" data-prop="gripTagsString" value="${(ley.gripTags || []).join(', ')}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Eje (X, Y)</label>
                        <div class="multi-input">
                            <input type="number" class="prop-input" data-component="WheelSuspension" data-prop="constraintAxis.x" value="${ley.constraintAxis.x}" step="0.1">
                            <input type="number" class="prop-input" data-component="WheelSuspension" data-prop="constraintAxis.y" value="${ley.constraintAxis.y}" step="0.1">
                        </div>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="WheelSuspension" data-prop="showGizmo" ${ley.showGizmo ? 'checked' : ''}>
                        <label>${L.get('SHOW_GIZMO', 'Mostrar Gizmo')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.BasicAI) {
            const renderAIFuncInput = (propName, label) => {
                let inputHTML = `<input type="text" class="prop-input" data-component="BasicAI" data-prop="${propName}" value="${ley[propName] || ''}" placeholder="${L.get('EXAMPLE_AI_FUNC', 'ej: alDetectarEnemigo')}">`;

                if (ley.scriptTarget) {
                    const targetMateria = window.SceneManager.currentScene.findMateriaById(ley.scriptTarget);
                    if (targetMateria) {
                        const scripts = targetMateria.getComponents(Components.CreativeScript);
                        let allFunctions = [];
                        scripts.forEach(s => {
                            const metadata = CES_Transpiler.getScriptMetadata(s.scriptName);
                            if (metadata && metadata.publicFunctions) {
                                allFunctions = allFunctions.concat(metadata.publicFunctions);
                            }
                        });

                        if (allFunctions.length > 0) {
                            inputHTML = `
                                <select class="prop-input" data-component="BasicAI" data-prop="${propName}">
                                    <option value="">${L.get('SELECT_FUNCTION', '-- Seleccionar Función --')}</option>
                                    ${allFunctions.map(f => `<option value="${f}" ${ley[propName] === f ? 'selected' : ''}>${f}</option>`).join('')}
                                </select>
                            `;
                        }
                    }
                }
                return `
                    <div class="prop-row-multi">
                        <label>${label}</label>
                        ${inputHTML}
                    </div>
                `;
            };

            componentHTML = `
                ${renderComponentHeader(L.get('BASIC_AI', "IA Básica"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="TARGET">${L.get('TARGET', 'Objetivo')}</label>
                        ${renderPropertyDropper('Materia', ley.target, 'data-component="BasicAI" data-prop="target"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="BEHAVIOR">${L.get('BEHAVIOR', 'Comportamiento')}</label>
                        <select class="prop-input" data-component="BasicAI" data-prop="behavior">
                            <option value="Follow" ${ley.behavior === 'Follow' ? 'selected' : ''} data-i18n="FOLLOW">${L.get('FOLLOW', 'Seguir')}</option>
                            <option value="Escape" ${ley.behavior === 'Escape' ? 'selected' : ''} data-i18n="ESCAPE">${L.get('ESCAPE', 'Escapar')}</option>
                            <option value="Wander" ${ley.behavior === 'Wander' ? 'selected' : ''} data-i18n="WANDER">${L.get('WANDER', 'Vagar')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MOVEMENT_TYPE">${L.get('MOVEMENT_TYPE', 'Tipo Movimiento')}</label>
                        <select class="prop-input" data-component="BasicAI" data-prop="movementType">
                            <option value="Top-Down" ${ley.movementType === 'Top-Down' ? 'selected' : ''} data-i18n="TOP_DOWN">Top-Down</option>
                            <option value="Platformer" ${ley.movementType === 'Platformer' ? 'selected' : ''} data-i18n="PLATFORMER">${L.get('PLATFORMER', 'Plataformas')}</option>
                            <option value="Fighter" ${ley.movementType === 'Fighter' ? 'selected' : ''}>Fighter (Smash)</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPEED">${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('STOP_DISTANCE', 'Distancia Parada')}</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="stopDistance" value="${ley.stopDistance}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('ATTACK_DISTANCE', 'Distancia Ataque')}</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="attackDistance" value="${ley.attackDistance}">
                    </div>
                    <div class="prop-row-multi">
                        <label>${L.get('JUMP_FORCE', 'Fuerza Salto')}</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="jumpForce" value="${ley.jumpForce}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="BasicAI" data-prop="autoRotate" ${ley.autoRotate ? 'checked' : ''}>
                        <label data-i18n="AUTO_ROTATE">${L.get('AUTO_ROTATE', 'Rotación Automática')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="BasicAI" data-prop="obstacleAvoidance" ${ley.obstacleAvoidance ? 'checked' : ''}>
                        <label data-i18n="OBSTACLE_AVOIDANCE">${L.get('OBSTACLE_AVOIDANCE', 'Esquivar Obstáculos')}</label>
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span>Steering (Rayos)</span></div>
                    <div class="prop-row-multi">
                        <label>Num Rayos</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="rayCount" value="${ley.rayCount}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Apertura Rayos</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="raySpread" value="${ley.raySpread}">
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span data-i18n="DETECTION_AND_FUNCTIONS">${L.get('DETECTION_AND_FUNCTIONS', 'Detección y Funciones')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="DETECTION_DISTANCE">${L.get('DETECTION_DISTANCE', 'Distancia Detección')}</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="detectionDistance" value="${ley.detectionDistance}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DETECTION_TAGS">${L.get('DETECTION_TAGS', 'Tags de Detección')}</label>
                        <input type="text" class="prop-input" data-component="BasicAI" data-prop="detectionTagsString" value="${(ley.detectionTags || []).join(', ')}" placeholder="Player, Enemy...">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="EXECUTE_ON">${L.get('EXECUTE_ON', 'Ejecutar en')}</label>
                        ${renderPropertyDropper('Materia', ley.scriptTarget, 'data-component="BasicAI" data-prop="scriptTarget"')}
                    </div>
                    ${renderAIFuncInput('onTargetSeen', L.get('ON_TARGET_SEEN', 'Al ver Objetivo'))}
                    ${renderAIFuncInput('onTargetLost', L.get('ON_TARGET_LOST', 'Al perder Objetivo'))}
                    ${renderAIFuncInput('onTargetNear', L.get('ON_TARGET_NEAR', 'Al estar cerca'))}
                    ${renderAIFuncInput('onAttackRange', L.get('ON_ATTACK_RANGE', 'Rango Ataque'))}
                </div>
            `;
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
    addComponentBtn.dataset.i18n = 'ADD_LEY';
    addComponentBtn.textContent = L.get('ADD_LEY', 'Añadir Ley');
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

        if (assetName.endsWith('.ceprefab')) {
            const L = window.Localization;
            let prefabData;
            try {
                prefabData = JSON.parse(content);
            } catch (e) {
                dom.inspectorContent.innerHTML += `<p class="error-message">${L.get('ERROR_READ_PREFAB_JSON', 'Error al leer el prefab: JSON inválido.')}</p>`;
                return;
            }

            const container = document.createElement('div');
            container.className = 'prefab-inspector-view';

            const title = document.createElement('h5');
            title.textContent = `Prefab: ${prefabData.name}`;
            title.style.margin = "10px 0";
            title.style.borderBottom = "1px solid #444";
            title.style.paddingBottom = "5px";
            container.appendChild(title);

            const sectionHierarchy = document.createElement('div');
            sectionHierarchy.className = 'inspector-section';
            sectionHierarchy.innerHTML = `<label>${L.get('STRUCTURE', 'Estructura')}</label>`;
            const hierarchyList = document.createElement('div');
            hierarchyList.className = 'prefab-hierarchy-list';
            hierarchyList.style.background = '#1a1a1a';
            hierarchyList.style.padding = '5px';
            hierarchyList.style.borderRadius = '4px';
            hierarchyList.style.maxHeight = '150px';
            hierarchyList.style.overflowY = 'auto';

            function renderPrefabNode(data, depth) {
                const item = document.createElement('div');
                item.className = 'hierarchy-item-static';
                item.style.paddingLeft = `${depth * 15}px`;
                item.style.fontSize = '0.9em';
                item.style.color = '#ccc';
                item.style.padding = '2px 0';
                item.innerHTML = `<span>${data.name}</span>`;
                hierarchyList.appendChild(item);

                if (data.children && Array.isArray(data.children)) {
                    data.children.forEach(child => renderPrefabNode(child, depth + 1));
                }
            }

            renderPrefabNode(prefabData, 0);
            sectionHierarchy.appendChild(hierarchyList);
            container.appendChild(sectionHierarchy);

            const sectionComponents = document.createElement('div');
            sectionComponents.className = 'inspector-section';
            sectionComponents.innerHTML = `<label>${L.get('ROOT_COMPONENTS', 'Componentes (Objeto Raíz)')}</label>`;
            const compList = document.createElement('div');
            compList.style.background = '#1a1a1a';
            compList.style.padding = '5px';
            compList.style.borderRadius = '4px';

            if (prefabData.leyes && Array.isArray(prefabData.leyes)) {
                prefabData.leyes.forEach(ley => {
                    const leyEl = document.createElement('div');
                    leyEl.style.fontSize = '0.85em';
                    leyEl.style.padding = '4px 8px';
                    leyEl.style.marginBottom = '2px';
                    leyEl.style.background = '#252525';
                    leyEl.style.borderRadius = '2px';
                    leyEl.style.display = 'flex';
                    leyEl.style.justifyContent = 'space-between';

                    const typeName = ley.type === 'CustomComponent' ? ley.definitionName : ley.type;
                    leyEl.innerHTML = `<span>${typeName}</span> <span style="opacity: 0.5; font-size: 0.8em;">${ley.type === 'CustomComponent' ? 'CHC' : L.get('ENGINE', 'Motor')}</span>`;
                    compList.appendChild(leyEl);
                });
            }
            sectionComponents.appendChild(compList);
            container.appendChild(sectionComponents);

            const openBtn = document.createElement('button');
            openBtn.className = 'primary-btn';
            openBtn.style.width = '100%';
            openBtn.style.marginTop = '10px';
            openBtn.textContent = L.get('EDIT_PREFAB', 'Editar Prefab');
            openBtn.onclick = () => {
                if (typeof onAssetOpened === 'function') {
                    onAssetOpened(assetName, fileHandle, dirHandle);
                }
            };
            container.appendChild(openBtn);

            dom.inspectorContent.appendChild(container);

        } else if (assetName.endsWith('.ces')) {
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
                    <fieldset class="inspector-section">
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
                const L = window.Localization;
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
                        window.Dialogs.showNotification(L.get('ERROR_OPTIMIZACION', 'Error de Optimización'), `${L.get('ERROR_OPTIMIZAR_IMAGEN', 'No se pudo optimizar la imagen')}: ${error.message}`);
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
                window.Dialogs.showNotification(L.get('EXITO', 'Éxito'), L.get('ASSET_META_APLICADOS', 'Optimización y metadatos del asset aplicados.'));

                // Refresh the asset browser and inspector to show the new file size/preview
                updateAssetBrowserCallback();
                updateInspector();
            });

            // --- Animation Preview Logic ---
            if (metaData.textureType === 'Animation Sheet') {
                const canvas = document.getElementById('anim-preview-canvas');
                const playBtn = document.getElementById('anim-preview-play');
                const stopBtn = document.getElementById('anim-preview-stop');
            if (playBtn) playBtn.innerHTML = getIconHTML('play');
            if (stopBtn) stopBtn.innerHTML = getIconHTML('stop');
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
                    const L = window.Localization;
                    if (!createAssetCallback) {
                        console.error("createAssetCallback no está disponible.");
                        return;
                    }

                    const speed = parseInt(document.getElementById('anim-preview-speed').value, 10) || 10;
                    const cols = parseInt(document.getElementById('anim-columns').value, 10) || 1;
                    const rows = parseInt(document.getElementById('anim-rows').value, 10) || 1;

                    const imageUrl = await getURLForAssetPath(assetPath, projectsDirHandle);
                    if (!imageUrl) {
                        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CARGAR_IMAGEN_ANIM', "No se pudo cargar la imagen para crear la animación."));
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
                    window.Dialogs.showNotification(L.get('EXITO', 'Éxito'), `${L.get('EXITO_CREAR_ANIM_ASSET', 'Asset de animación "{name}" creado.').replace('{name}', animAssetName)}`);
                    if(updateAssetBrowserCallback) updateAssetBrowserCallback();
                });
            }

            const imgElement = document.getElementById('inspector-preview-img');
            if (imgElement && assetPath) {
                const url = await getURLForAssetPath(assetPath, projectsDirHandle);
                if (url) imgElement.src = url;
            }
        } else if (assetName.endsWith('.cea')) {
            let animData;
            try {
                animData = JSON.parse(content);
            } catch (e) {
                dom.inspectorContent.innerHTML += `<p class="error-message">Error al parsear archivo de animación (.cea)</p>`;
                return;
            }

            // Handle both legacy and new format
            const anim = (animData.animations && animData.animations.length > 0) ? animData.animations[0] : animData;

            if (!anim || !anim.frames) {
                dom.inspectorContent.innerHTML += `<p class="error-message">Formato de animación inválido o sin fotogramas.</p>`;
                return;
            }

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
            playBtn.innerHTML = `${getIconHTML('play')} Play`;

            let isPlaying = false;
            let playbackId = null;
            let currentFrame = 0;

            playBtn.addEventListener('click', () => {
                isPlaying = !isPlaying;
                if (isPlaying) {
                    playBtn.innerHTML = `${getIconHTML('stop')} Stop`;
                    let lastTime = performance.now();

                    function loop(time) {
                        if (!isPlaying) return;
                        if (time - lastTime > (1000 / (anim.speed || 10))) {
                            lastTime = time;
                            currentFrame = (currentFrame + 1) % anim.frames.length;
                            timeline.childNodes.forEach((node, i) => node.style.border = i === currentFrame ? '2px solid var(--accent-color)' : 'none');
                        }
                       playbackId = requestAnimationFrame(loop);
                    }
                    playbackId = requestAnimationFrame(loop);

                } else {
                    playBtn.innerHTML = `${getIconHTML('play')} Play`;
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
                <span class="asset-preview-icon" style="display: block; width: 48px; height: 48px; margin: 0 auto;">${getIconHTML('clapperboard')}</span>
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
        } else if (assetName.endsWith('.mp3') || assetName.endsWith('.wav')) {
            await renderAudioInspector(assetName, assetPath);
        } else if (assetName.endsWith('.mp4') || assetName.endsWith('.webm') || assetName.endsWith('.ogv')) {
            await renderVideoInspector(assetName, assetPath);
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
    const L = window.Localization;
    for (const category in availableComponents) {
        if (category === 'CAT_SCRIPTING') continue;

        const categoryWrapper = document.createElement('div');
        categoryWrapper.className = 'component-category-wrapper';

        const categoryHeader = document.createElement('h4');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `<span class="category-toggle open"></span>${L.get(category, category)}`;

        const categoryContent = document.createElement('div');
        categoryContent.className = 'category-content';

        categoryHeader.addEventListener('click', () => {
            const isOpen = categoryContent.style.display !== 'none';
            categoryContent.style.display = isOpen ? 'none' : 'block';
            categoryHeader.querySelector('.category-toggle').classList.toggle('open', !isOpen);
        });

        availableComponents[category].forEach(ComponentClass => {
            const isPresent = existingComponents.has(ComponentClass);
            const componentItem = document.createElement('div');
            componentItem.className = `component-item ${isPresent ? 'already-added' : ''}`;
            componentItem.innerHTML = `
                <span>${ComponentClass.name}</span>
                ${isPresent ? `<span class="component-item-indicator">${getIconHTML('check')}</span>` : ''}
            `;

            componentItem.addEventListener('click', () => {
                if (isPresent) {
                    window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('COMPONENTE_YA_EXISTE', 'Este componente ya está en el objeto.'));
                    return;
                }
                const newComponent = new ComponentClass(selectedMateria);
                selectedMateria.addComponent(newComponent);

                // Initialization for specific components
                if (newComponent instanceof Components.AnimatorController) {
                    const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
                    newComponent.initialize(currentDirHandle);
                }

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
            categoryContent.appendChild(componentItem);
        });

        categoryWrapper.appendChild(categoryHeader);
        categoryWrapper.appendChild(categoryContent);
        dom.componentList.appendChild(categoryWrapper);
    }

    // --- 2. Render Custom Components ---
    const customComponentDefinitions = getCustomComponentDefinitions();
    if (customComponentDefinitions.size > 0) {
        const categoryWrapper = document.createElement('div');
        categoryWrapper.className = 'component-category-wrapper';

        const categoryHeader = document.createElement('h4');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `<span class="category-toggle open"></span>${L.get('COMPONENTES_PERSONALIZADOS', 'Componentes Personalizados')}`;

        const categoryContent = document.createElement('div');
        categoryContent.className = 'category-content';

        categoryHeader.addEventListener('click', () => {
            const isOpen = categoryContent.style.display !== 'none';
            categoryContent.style.display = isOpen ? 'none' : 'block';
            categoryHeader.querySelector('.category-toggle').classList.toggle('open', !isOpen);
        });

        for (const [name, definition] of customComponentDefinitions.entries()) {
            const isPresent = existingCustomComponents.has(name);
            const componentItem = document.createElement('div');
            componentItem.className = `component-item ${isPresent ? 'already-added' : ''}`;
            componentItem.innerHTML = `
                <span>${name}</span>
                ${isPresent ? `<span class="component-item-indicator">${getIconHTML('check')}</span>` : ''}
            `;

            componentItem.addEventListener('click', () => {
                if (isPresent) {
                    window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('COMPONENTE_YA_EXISTE', 'Este componente ya está en el objeto.'));
                    return;
                }
                const newComponent = new Components.CustomComponent(definition);
                selectedMateria.addComponent(newComponent);
                dom.addComponentModal.classList.remove('is-open');
                updateInspector();
            });
            categoryContent.appendChild(componentItem);
        }
        categoryWrapper.appendChild(categoryHeader);
        categoryWrapper.appendChild(categoryContent);
        dom.componentList.appendChild(categoryWrapper);
    }


    // --- 3. Show the modal Immediately ---
    dom.addComponentModal.classList.add('is-open');

    // --- 3. Find and Render Custom Scripts Asynchronously ---
    const scriptsCategoryWrapper = document.createElement('div');
    scriptsCategoryWrapper.className = 'component-category-wrapper';

    const scriptsHeader = document.createElement('h4');
    scriptsHeader.className = 'category-header';
    scriptsHeader.innerHTML = `<span class="category-toggle open"></span>${L.get('SCRIPTS', 'Scripts')}`;

    const scriptsContent = document.createElement('div');
    scriptsContent.className = 'category-content';

    scriptsHeader.addEventListener('click', () => {
        const isOpen = scriptsContent.style.display !== 'none';
        scriptsContent.style.display = isOpen ? 'none' : 'block';
        scriptsHeader.querySelector('.category-toggle').classList.toggle('open', !isOpen);
    });

    scriptsCategoryWrapper.appendChild(scriptsHeader);
    scriptsCategoryWrapper.appendChild(scriptsContent);
    dom.componentList.appendChild(scriptsCategoryWrapper);

    const placeholder = document.createElement('p');
    placeholder.className = 'script-scan-status';
    scriptsContent.appendChild(placeholder);

    if (!projectsDirHandle) {
        placeholder.textContent = "No se ha seleccionado un directorio de proyecto.";
        return;
    }
    if (isScanningForComponents) {
        placeholder.textContent = L.get('ESCANEO_PROGRESO', 'Escaneo de scripts ya en progreso...');
        return;
    }

    isScanningForComponents = true;
    placeholder.textContent = L.get('BUSCANDO_SCRIPTS', 'Buscando scripts...');

    try {
        const scriptFiles = [];
        async function findScriptFiles(dirHandle) {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && (entry.name.endsWith('.ces') || entry.name.endsWith('.chc'))) {
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
            scriptsContent.appendChild(Object.assign(document.createElement('p'), { textContent: L.get('SIN_SCRIPTS_HINT', "No se encontraron scripts (.ces) en la carpeta Assets.") }));
        } else {
            scriptFiles.forEach(fileHandle => {
                const isPresent = existingScripts.has(fileHandle.name);
                const componentItem = document.createElement('div');
                componentItem.className = `component-item ${isPresent ? 'already-added' : ''}`;
                componentItem.innerHTML = `
                    <span>${fileHandle.name}</span>
                ${isPresent ? `<span class="component-item-indicator">${getIconHTML('check')}</span>` : ''}
                `;

                componentItem.addEventListener('click', () => {
                    // For scripts, we might want to allow multiple instances?
                    // Usually it's better to avoid it unless necessary.
                    if (isPresent) {
                        window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('SCRIPT_YA_EXISTE', 'Este script ya está en el objeto.'));
                        return;
                    }
                    const newScript = new Components.CreativeScript(selectedMateria, fileHandle.name);
                    selectedMateria.addComponent(newScript);
                    dom.addComponentModal.classList.remove('is-open');
                    updateInspector();
                });
                scriptsContent.appendChild(componentItem);
            });
        }
    } catch (error) {
        console.error("Error crítico durante el escaneo de scripts:", error);
        placeholder.textContent = L.get('ERROR_BUSCAR_SCRIPTS', "Error al buscar scripts.");
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
            gallery.innerHTML = `<p class="error-message">${L.get('ERROR_LOAD_SOURCE_IMAGE', 'Could not load source image.')}</p>`;
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
        dom.inspectorContent.innerHTML += `<p class="error-message">${L.get('ERROR_PARSE_CESPRITE', 'Failed to parse .ceSprite file.')}</p>`;
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
        const L = window.Localization;
        if (selectedFrames.length === 0) {
            window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('ERROR_ANADIR_FRAME', "Añade al menos un frame a la animación."));
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
        showNotification(window.Localization.get('ERROR', 'Error'), window.Localization.get('ERROR_GUARDAR_CONFIG', 'No se pudo guardar la configuración del proyecto.'));
    }
}

async function renderAudioInspector(assetName, assetPath) {
    const L = window.Localization;
    const url = await getURLForAssetPath(assetPath, projectsDirHandle);
    if (!url) {
        dom.inspectorContent.innerHTML += `<p class="error-message">${L.get('ERROR_GET_AUDIO_URL', 'No se pudo obtener la URL del audio.')}</p>`;
        return;
    }

    const container = document.createElement('div');
    container.className = 'asset-settings';
    container.innerHTML = `
        <div class="inspector-section">
            <label>${L.get('AUDIO_PREVIEW', 'Audio Preview')}</label>
            <div class="audio-preview-bubble" style="padding: 15px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 10px;">
                <audio id="inspector-audio-player" controls style="width: 100%;">
                    <source src="${url}" type="audio/${assetName.split('.').pop()}">
                    ${L.get('ERROR_NATIVO_AUDIO', 'Tu navegador no soporta el elemento de audio.')}
                </audio>
                <div class="audio-info" style="margin-top: 10px; font-size: 0.85em; opacity: 0.8; display: flex; justify-content: space-between;">
                    <span><b>${L.get('FORMAT', 'Formato')}:</b> ${assetName.split('.').pop().toUpperCase()}</span>
                    <span id="audio-duration-display">${L.get('DURATION', 'Duración')}: ${L.get('LOADING', 'Cargando...')}</span>
                </div>
            </div>
        </div>
        <div class="inspector-section">
            <label>${L.get('ACTIONS', 'Acciones')}</label>
            <p class="field-description">${L.get('HINT_ARRASTRAR_AUDIO', 'Puedes arrastrar este archivo a un componente Audio Source para usarlo.')}</p>
        </div>
    `;

    dom.inspectorContent.appendChild(container);

    const player = document.getElementById('inspector-audio-player');
    const durationDisplay = document.getElementById('audio-duration-display');

    player.onloadedmetadata = () => {
        const mins = Math.floor(player.duration / 60);
        const secs = Math.floor(player.duration % 60);
        durationDisplay.textContent = `Duración: ${mins}:${secs.toString().padStart(2, '0')}`;
    };
}

async function renderVideoInspector(assetName, assetPath) {
    const L = window.Localization;
    const url = await getURLForAssetPath(assetPath, projectsDirHandle);
    if (!url) {
        dom.inspectorContent.innerHTML += `<p class="error-message">No se pudo obtener la URL del video.</p>`;
        return;
    }

    const container = document.createElement('div');
    container.className = 'asset-settings';
    container.innerHTML = `
        <div class="inspector-section">
            <label>${L.get('OPTIMIZACION_Y_CALIDAD', 'Optimization & Quality')}</label>
            <div class="inspector-row" style="margin-top: 8px;">
                <label>${L.get('CALIDAD', 'Calidad')}</label>
                <select id="video-quality-select" class="prop-input" style="flex-grow: 1;">
                    <option value="original">${L.get('ORIGINAL_SIN_CAMBIOS', 'Original (Sin cambios)')}</option>
                    <option value="high">${L.get('ALTA_1080P', 'Alta (1080p)')}</option>
                    <option value="medium">${L.get('MEDIA_720P', 'Media (720p)')}</option>
                    <option value="low">${L.get('BAJA_480P', 'Baja (480p)')}</option>
                </select>
            </div>
            <p class="field-description" style="font-size: 0.8em; opacity: 0.6; margin-top: 8px;">
                ${L.get('OPCIONES_CALIDAD_DESC', '* Las opciones de calidad se aplicarán al exportar el juego para optimizar el rendimiento y espacio.')}
            </p>
            <button id="btn-apply-video-meta" class="primary-btn" style="width: 100%; margin-top: 10px; height: 32px; font-weight: bold; border-radius: 4px;">${L.get('APLICAR_CONFIGURACION', 'Aplicar Configuración')}</button>
        </div>

        <div class="inspector-section">
            <label>${L.get('ACCIONES', 'Acciones')}</label>
            <p class="field-description">${L.get('HINT_ARRASTRAR_VIDEO', 'Puedes arrastrar este archivo a un componente Video Player para usarlo.')}</p>
        </div>

        <hr style="border:none; border-top: 1px solid var(--border-color); margin: 15px 0;">

        <div class="preview-container" style="padding: 0; background: var(--bg-primary); border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; align-items: center; border: 1px solid var(--border-color); margin-top: 10px; width: 100%; box-sizing: border-box;">
            <div style="width: 100%; background: #000; display: flex; justify-content: center; align-items: center; min-height: 150px; position: relative; overflow: hidden;">
                <video id="inspector-video-player" style="max-width: 100%; max-height: 250px; display: block; background: #000;">
                    <source src="${url}" type="video/${assetName.split('.').pop()}">
                    ${L.get('ERROR_NATIVO_VIDEO', 'Tu navegador no soporta el elemento de video.')}
                </video>
            </div>

            <!-- Custom Controls -->
            <div class="video-custom-controls" style="width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px 15px; background: var(--bg-tertiary); border-top: 1px solid var(--border-color); box-sizing: border-box;">
                <button id="v-btn-rewind" title="${L.get('RETROCEDER_5S', 'Retroceder 5s')}" style="background:none; border:none; cursor:pointer; padding:4px; display:flex; opacity: 0.8; color: var(--text-primary);">${getIconHTML('skip-back')}</button>
                <button id="v-btn-play-pause" title="${L.get('REPRODUCIR_PAUSA', 'Reproducir/Pausa')}" style="background:none; border:none; cursor:pointer; padding:4px; display:flex; opacity: 0.8; color: var(--text-primary);">${getIconHTML('play')}</button>
                <button id="v-btn-forward" title="${L.get('ADELANTAR_5S', 'Adelantar 5s')}" style="background:none; border:none; cursor:pointer; padding:4px; display:flex; opacity: 0.8; color: var(--text-primary);">${getIconHTML('skip-forward')}</button>

                <div style="flex-grow: 1;"></div>

                <div class="volume-control" style="display: flex; align-items: center; gap: 8px;">
                    <span id="v-icon-volume" style="display:flex; opacity: 0.7;">${getIconHTML('volume-2')}</span>
                    <input type="range" id="v-input-volume" min="0" max="1" step="0.1" value="1" style="width: 60px; height: 4px; cursor: pointer; accent-color: var(--accent-color);">
                </div>
            </div>

            <div class="video-info" style="width: 100%; padding: 8px 15px; background: var(--bg-secondary); font-size: 0.8em; opacity: 0.7; display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); box-sizing: border-box; color: var(--text-secondary);">
                <span id="video-res-display">${L.get('RESOLUCION', 'Resolución')}: ...</span>
                <span id="video-duration-display">${L.get('DURACION', 'Duración')}: ...</span>
                <span>${assetName.split('.').pop().toUpperCase()}</span>
            </div>
        </div>
    `;

    dom.inspectorContent.appendChild(container);

    const player = document.getElementById('inspector-video-player');
    const resDisplay = document.getElementById('video-res-display');
    const durationDisplay = document.getElementById('video-duration-display');

    // Controls logic
    const btnPlayPause = document.getElementById('v-btn-play-pause');
    const btnRewind = document.getElementById('v-btn-rewind');
    const btnForward = document.getElementById('v-btn-forward');
    const inputVolume = document.getElementById('v-input-volume');
    const iconVolume = document.getElementById('v-icon-volume');

    [btnPlayPause, btnRewind, btnForward].forEach(btn => {
        btn.onmouseenter = () => btn.style.opacity = '1';
        btn.onmouseleave = () => btn.style.opacity = '0.8';
    });

    btnPlayPause.onclick = () => {
        if (player.paused) {
            player.play();
            btnPlayPause.innerHTML = getIconHTML('pause');
        } else {
            player.pause();
            btnPlayPause.innerHTML = getIconHTML('play');
        }
    };

    btnRewind.onclick = () => { player.currentTime = Math.max(0, player.currentTime - 5); };
    btnForward.onclick = () => { player.currentTime = Math.min(player.duration, player.currentTime + 5); };

    inputVolume.oninput = (e) => {
        const vol = parseFloat(e.target.value);
        player.volume = vol;
        player.muted = vol === 0;
        iconVolume.innerHTML = getIconHTML(vol === 0 ? 'volume-x' : 'volume-2');
    };

    player.onended = () => {
        btnPlayPause.innerHTML = getIconHTML('play');
    };

    player.onloadedmetadata = () => {
        resDisplay.textContent = `Resolución: ${player.videoWidth}x${player.videoHeight}`;
        const mins = Math.floor(player.duration / 60);
        const secs = Math.floor(player.duration % 60);
        durationDisplay.textContent = `Duración: ${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Load existing metadata
    const dirHandle = currentDirectoryHandle();
    try {
        const metaFileHandle = await dirHandle.getFileHandle(assetName + '.meta');
        const metaFile = await metaFileHandle.getFile();
        const meta = JSON.parse(await metaFile.text());
        if (meta.quality) document.getElementById('video-quality-select').value = meta.quality;
    } catch(e) {}

    document.getElementById('btn-apply-video-meta').onclick = async () => {
        const quality = document.getElementById('video-quality-select').value;
        const meta = { quality };
        await saveAssetMetaCallback(assetName, meta, dirHandle);
        showNotification(window.Localization.get('EXITO', 'Éxito'), window.Localization.get('CAMBIOS_APLICADOS', "Cambios aplicados correctamente."));
    };
}

/**
 * Analiza una imagen para encontrar el recuadro que contiene píxeles no transparentes
 * y devuelve el pivote que centraría ese recuadro.
 */
function calculateAutoPivot(image) {
    const canvas = document.createElement('canvas');
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let minX = width, minY = height, maxX = -1, maxY = -1;
    let found = false;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 10) { // Umbral de transparencia
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }

    if (!found) return { x: 0.5, y: 0.5 };

    // El centro geométrico de los píxeles visibles
    const centerX = (minX + maxX + 1) / 2;
    const centerY = (minY + maxY + 1) / 2;

    return {
        x: parseFloat((centerX / width).toFixed(4)),
        y: parseFloat((centerY / height).toFixed(4))
    };
}
