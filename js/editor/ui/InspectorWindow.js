import * as Components from '../../engine/Components.js';
import * as UITransformUtils from '../../engine/UITransformUtils.js';
import { getURLForAssetPath } from '../../engine/AssetUtils.js';
import * as SpriteSlicer from './SpriteSlicerWindow.js';
import { getCustomComponentDefinitions } from '../EngineAPIExtension.js';
import * as CES_Transpiler from '../../editor/CES_Transpiler.js';
import { showPrompt, showNotification } from './DialogWindow.js';
import { TerrenoEditorWindow } from './TerrenoEditorWindow.js';
import { broadcastUpdate } from '../CollaborationSystem.js';

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
    'CAT_ANIMACION': [Components.Animator, Components.AnimatorController, Components.Bone, Components.SkeletonRenderer, Components.IKManager2D],
    'CAT_AUDIO': [Components.AudioSource],
    'CAT_FISICAS': [Components.Rigidbody2D, Components.BoxCollider2D, Components.PlatformEffector2D, Components.CapsuleCollider2D, Components.CircleCollider2D, Components.PolygonCollider2D, Components.TilemapCollider2D, Components.TerrenoCollider2D, Components.LineCollider2D],
    'CAT_CAMARA': [Components.Camera],
    'CAT_3D': [Components.MeshRenderer3D, Components.DirectionalLight3D, Components.PointLight3D, Components.SpotLight3D],
    'CAT_UI': [Components.UITransform, Components.UIImage, Components.UIText, Components.Canvas, Components.Button, Components.VideoPlayer, Components.ProgressBar, Components.VerticalLayoutGroup, Components.HorizontalLayoutGroup, Components.GridLayoutGroup, Components.ContentSizeFitter],
    'CAT_BASICO': [Components.Movement, Components.CameraFollow, Components.ProjectileLauncher, Components.AutoDestroy, Components.Health, Components.Attack, Components.Patrol, Components.ParticleSystem, Components.RaycastSource, Components.BasicAI, Components.Suspension, Components.VehicleTopDown, Components.PlaneController, Components.HelicopterController, Components.SceneLoader],
    'CAT_SCRIPTING': [Components.CreativeScript]
};

const componentIcons = {
    MeshRenderer3D: 'box', DirectionalLight3D: 'sun', PointLight3D: 'lightbulb', SpotLight3D: 'flashlight',
    Transform: 'move', Rigidbody2D: 'weight', BoxCollider2D: 'square', PlatformEffector2D: 'square', CapsuleCollider2D: 'pill', CircleCollider2D: 'disc', PolygonCollider2D: 'hexagon', SpriteRenderer: 'image',
    Animator: 'run', AnimatorController: 'gamepad', AudioSource: 'music', VideoPlayer: 'video', Camera: 'camera', CreativeScript: 'scroll', SceneLoader: 'clapperboard',
    UITransform: 'box', UICanvas: 'image', UIImage: 'image', PointLight2D: 'lightbulb', SpotLight2D: 'flashlight', FreeformLight2D: 'pencil', SpriteLight2D: 'sparkles',
    Grid: 'grid', Tilemap: 'map', TilemapRenderer: 'brush', TilemapCollider2D: 'grid',
    Terreno2D: 'mountain', TerrenoCollider2D: 'mountain',
    Button: 'mouse-pointer', UIText: 'type', Canvas: 'image',
    VerticalLayoutGroup: 'layers', HorizontalLayoutGroup: 'layers', GridLayoutGroup: 'grid', ContentSizeFitter: 'maximize',
    Movement: 'run', CameraFollow: 'video', Parallax: 'mountain-snow', DrawingOrder: 'layers', ProjectileLauncher: 'rocket', AutoDestroy: 'timer', Health: 'heart', Attack: 'target', Patrol: 'route',
    Water: 'bucket', LineCollider2D: 'route', ProgressBar: 'maximize',
    'ParticleSystem': 'sparkles',
    'Gyzmo': 'target',
    'RaycastSource': 'route',
    'BasicAI': 'bot',
    'Suspension': 'wrench',
    'VehicleTopDown': 'rocket',
    'PlaneController': 'rocket',
    'HelicopterController': 'rocket',
    'Bone': 'bone',
    'SkeletonRenderer': 'layout',
    'IKManager2D': 'mouse-pointer'
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
        if (isNaN(value)) value = 0;
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

    // Broadcast property update
    broadcastUpdate({
        op: 'UPDATE_PROP',
        id: selectedMateria.id,
        compType: componentName,
        prop: propPath,
        value: value
    });

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

        // --- Handle Clear Button ---
        if (e.target.closest('.dropper-clear-btn')) {
            e.stopPropagation();
            let targetComponent;
            if (componentName === 'CreativeScript') {
                 targetComponent = selectedMateria.getComponents(Components.CreativeScript).find(s => s.scriptName === scriptName);
            } else if (componentName === 'CustomComponent') {
                 targetComponent = selectedMateria.leyes.find(ley => ley instanceof Components.CustomComponent && ley.id == componentId);
            } else if (componentName) {
                 targetComponent = selectedMateria.getComponent(Components[componentName]);
            }

            if (targetComponent) {
                if (targetComponent instanceof Components.CreativeScript || targetComponent instanceof Components.CustomComponent) {
                    targetComponent.publicVars[propName] = null;
                } else {
                    const props = propName.split('.');
                    let current = targetComponent;
                    for (let i = 0; i < props.length - 1; i++) {
                        current = current[props[i]];
                    }
                    current[props[props.length - 1]] = null;
                }
                updateInspector();
                if (updateSceneCallback) updateSceneCallback();
            }
            return;
        }

        const isSceneObjectReference = (expectedType === 'Materia' || expectedType === 'mtr' || componentIcons[expectedType]);

        if (typeExtensionMap[expectedType] || expectedType === 'any') {
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
        } else if (isSceneObjectReference) {
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
                if (collider) collider.generate();
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

    if (e.target.closest('[data-action="toggle-effector-edge"]')) {
        const edgeEl = e.target.closest('[data-action="toggle-effector-edge"]');
        const edgeKey = edgeEl.dataset.edge;
        const leyIndex = parseInt(edgeEl.dataset.leyIndex, 10);
        if (selectedMateria && !isNaN(leyIndex)) {
            const effector = selectedMateria.leyes[leyIndex];
            if (effector instanceof Components.PlatformEffector2D) {
                effector[edgeKey] = !effector[edgeKey];
                updateInspector();
                if (typeof window.setSceneDirty === 'function') window.setSceneDirty(true);
            }
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
                    // Solo asignar si es un formato hexadecimal válido para evitar errores de consola
                    if (typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value)) {
                        if (input.value !== value) input.value = value;
                    }
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

function renderDependencyWarning(componentName, missingComponent) {
    const L = window.Localization;
    const msg = L.get('SUGERENCIA_COMPONENTE', 'Además, parece que te falta el componente {comp}. ¿Quieres añadirlo?').replace('{comp}', missingComponent);

    return `
        <div class="inspector-warning-box">
            <div class="warning-header">
                ${getIconHTML('alert-circle')}
                <span>${L.get('AVISO', 'Aviso')}</span>
            </div>
            <div class="warning-text">${msg}</div>
            <button class="warning-btn" onclick="const mtr = window.getSelectedMateria(); if(mtr) { const Comp = window.Components['${missingComponent}']; if(Comp) { mtr.addComponent(new Comp(mtr)); window.updateInspector(); window.updateScene(); } }">
                ${L.get('REPARAR', 'Reparar')}
            </button>
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
    const L = window.Localization;
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
        const lowerType = type.toLowerCase();
        displayName = `${L.get('NINGUNO', 'Ninguno')} (${L.get(type.toUpperCase()) !== type.toUpperCase() ? L.get(type.toUpperCase()) : type})`;

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
            ${!isEmpty ? `<button class="dropper-clear-btn" title="${L.get('LIMPIAR', 'Limpiar')}">&times;</button>` : ''}
        </div>
    `;
}

function getFunctionOptionsHTML(targetMateria, currentValue) {
    const L = window.Localization;
    let options = [];

    // 1. Integrated Component Actions
    targetMateria.leyes.forEach(comp => {
        const actionable = comp.constructor.actionableMethods;
        if (actionable) {
            const compName = comp.constructor.name;
            for (const [method, aliases] of Object.entries(actionable)) {
                const label = `${compName}.${method}`;
                options.push({ value: label, text: label, group: L.get('COMPONENTE', 'Component') });
            }
        }
    });

    // 2. Custom Scripts
    targetMateria.getComponents(Components.CreativeScript).forEach(s => {
        const metadata = CES_Transpiler.getScriptMetadata(s.scriptName);
        if (metadata && metadata.publicFunctions) {
            metadata.publicFunctions.forEach(f => {
                options.push({ value: f, text: f, group: s.scriptName });
            });
        }
    });

    let html = `<option value="">${L.get('SIN_FUNCION', 'No Function')}</option>`;
    if (options.length > 0) {
        const groups = {};
        options.forEach(opt => {
            if (!groups[opt.group]) groups[opt.group] = [];
            groups[opt.group].push(opt);
        });

        for (const [groupName, opts] of Object.entries(groups)) {
            html += `<optgroup label="${groupName}">`;
            html += opts.map(o => `<option value="${o.value}" ${currentValue === o.value ? 'selected' : ''}>${o.text}</option>`).join('');
            html += `</optgroup>`;
        }
    }
    return html;
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

    if (val.targetId !== null && val.targetId !== undefined && window.SceneManager.currentScene) {
        const targetMateria = window.SceneManager.currentScene.findMateriaById(val.targetId);
        if (targetMateria) {
            functionsDropdown = getFunctionOptionsHTML(targetMateria, val.functionName);
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
        case 'Vector3':
            return `
                <div class="prop-inputs">
                    <input type="number" class="prop-input" ${commonAttrs.replace(`data-prop="${variable.name}"`, `data-prop="${variable.name}.x"`)} value="${currentValue?.x || 0}" title="X">
                    <input type="number" class="prop-input" ${commonAttrs.replace(`data-prop="${variable.name}"`, `data-prop="${variable.name}.y"`)} value="${currentValue?.y || 0}" title="Y">
                    <input type="number" class="prop-input" ${commonAttrs.replace(`data-prop="${variable.name}"`, `data-prop="${variable.name}.z"`)} value="${currentValue?.z || 0}" title="Z">
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
                <label for="materia-tag-select" data-i18n="TAG">${L.get('TAG', 'Tag')}</label>
                <select id="materia-tag-select"></select>
            </div>
            <div class="inspector-row">
                <label for="materia-layer-select" data-i18n="LAYER">${L.get('LAYER', 'Layer')}</label>
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

    selectedMateria.leyes.forEach((ley, index) => {
        try {
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
                                <option value="Rectangle" ${ley.shape === 'Rectangle' ? 'selected' : ''} data-i18n="RECTANGLE">${L.get('RECTANGLE', 'Rectangle')}</option>
                                <option value="Circle" ${ley.shape === 'Circle' ? 'selected' : ''} data-i18n="CIRCLE">${L.get('CIRCLE', 'Circle')}</option>
                                <option value="Triangle" ${ley.shape === 'Triangle' ? 'selected' : ''} data-i18n="TRIANGLE">${L.get('TRIANGLE', 'Triangle')}</option>
                                <option value="Capsule" ${ley.shape === 'Capsule' ? 'selected' : ''} data-i18n="CAPSULE">${L.get('CAPSULE', 'Capsule')}</option>
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
            const title = isVertical ? L.get('VERTICAL_LAYOUT', "Vertical Layout") : L.get('HORIZONTAL_LAYOUT', "Horizontal Layout");
            componentHTML = `
                ${renderComponentHeader(title, icon, index)}
                <div class="component-content">
                    <div class="inspector-section-header"><span data-i18n="PADDING">${L.get('PADDING', 'Padding')}</span></div>
                    <div class="prop-row-multi">
                        <span>L</span><input type="number" class="prop-input" data-component="${compName}" data-prop="padding.left" value="${ley.padding.left}">
                        <span>R</span><input type="number" class="prop-input" data-component="${compName}" data-prop="padding.right" value="${ley.padding.right}">
                    </div>
                    <div class="prop-row-multi">
                        <span>T</span><input type="number" class="prop-input" data-component="${compName}" data-prop="padding.top" value="${ley.padding.top}">
                        <span>B</span><input type="number" class="prop-input" data-component="${compName}" data-prop="padding.bottom" value="${ley.padding.bottom}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPACING">${L.get('SPACING', 'Espaciado')}</label>
                        <input type="number" class="prop-input" data-component="${compName}" data-prop="spacing" value="${ley.spacing}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.GridLayoutGroup) {
            componentHTML = `
                ${renderComponentHeader(L.get('GRID_LAYOUT', "Grid Layout"), icon, index)}
                <div class="component-content">
                    <div class="inspector-section-header"><span data-i18n="PADDING">${L.get('PADDING', 'Padding')}</span></div>
                    <div class="prop-row-multi">
                        <span>L</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.left" value="${ley.padding.left}">
                        <span>R</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.right" value="${ley.padding.right}">
                    </div>
                    <div class="prop-row-multi">
                        <span>T</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.top" value="${ley.padding.top}">
                        <span>B</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="padding.bottom" value="${ley.padding.bottom}">
                    </div>
                    <div class="inspector-section-header"><span data-i18n="CELL_SIZE">${L.get('CELL_SIZE', 'Cell Size')}</span></div>
                    <div class="prop-row-multi">
                        <span>W</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="cellSize.width" value="${ley.cellSize.width}">
                        <span>H</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="cellSize.height" value="${ley.cellSize.height}">
                    </div>
                    <div class="inspector-section-header"><span data-i18n="SPACING">${L.get('SPACING', 'Espaciado')}</span></div>
                    <div class="prop-row-multi">
                        <span>X</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="spacing.x" value="${ley.spacing.x}">
                        <span>Y</span><input type="number" class="prop-input" data-component="GridLayoutGroup" data-prop="spacing.y" value="${ley.spacing.y}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.ContentSizeFitter) {
             componentHTML = `
                ${renderComponentHeader(L.get('SIZE_FITTER', "Size Fitter"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="HORIZONTAL_FIT">${L.get('HORIZONTAL_FIT', 'Horizontal Fit')}</label>
                        <select class="prop-input" data-component="ContentSizeFitter" data-prop="horizontalFit">
                            <option value="Unconstrained" ${ley.horizontalFit === 'Unconstrained' ? 'selected' : ''} data-i18n="UNCONSTRAINED">${L.get('UNCONSTRAINED', 'Unconstrained')}</option>
                            <option value="Preferred Size" ${ley.horizontalFit === 'Preferred Size' ? 'selected' : ''} data-i18n="PREFERRED_SIZE">${L.get('PREFERRED_SIZE', 'Preferred Size')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="VERTICAL_FIT">${L.get('VERTICAL_FIT', 'Vertical Fit')}</label>
                        <select class="prop-input" data-component="ContentSizeFitter" data-prop="verticalFit">
                            <option value="Unconstrained" ${ley.verticalFit === 'Unconstrained' ? 'selected' : ''} data-i18n="UNCONSTRAINED">${L.get('UNCONSTRAINED', 'Unconstrained')}</option>
                            <option value="Preferred Size" ${ley.verticalFit === 'Preferred Size' ? 'selected' : ''} data-i18n="PREFERRED_SIZE">${L.get('PREFERRED_SIZE', 'Preferred Size')}</option>
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
                            <option value="auto" ${ley.preload === 'auto' ? 'selected' : ''} data-i18n="AUTO">Auto</option>
                            <option value="metadata" ${ley.preload === 'metadata' ? 'selected' : ''} data-i18n="METADATA">Metadata</option>
                            <option value="none" ${ley.preload === 'none' ? 'selected' : ''} data-i18n="NONE">None</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SCALING_MODE">${L.get('SCALING_MODE', 'Escalado')}</label>
                        <select class="prop-input" data-component="VideoPlayer" data-prop="scalingMode">
                            <option value="Fit" ${ley.scalingMode === 'Fit' ? 'selected' : ''} data-i18n="FIT">Fit</option>
                            <option value="Stretch" ${ley.scalingMode === 'Stretch' ? 'selected' : ''} data-i18n="STRETCH">Stretch</option>
                            <option value="Fill" ${ley.scalingMode === 'Fill' ? 'selected' : ''} data-i18n="FILL">Fill</option>
                        </select>
                    </div>
                    <button class="primary-btn inspector-action-btn" data-action="sync-video-size" data-ley-index="${index}" style="width: 100%; margin-top: 10px; font-weight: bold; border-radius: 4px;" title="${L.get('AJUSTAR_TAMANO_VIDEO_DESC', 'Ajusta el tamaño del objeto UI para que coincida con la resolución nativa del video.')}">${L.get('AJUSTAR_TAMANO_AL_VIDEO', 'Ajustar Tamaño al Video')}</button>
                </div>
            `;
        } else if (ley instanceof Components.Health) {
            let warningHTML = '';
            if (ley.deathAnimation && !selectedMateria.getComponentByName('Animator')) {
                warningHTML = renderDependencyWarning('Health', 'Animator');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('HEALTH_COMPONENT', "Vida (Health)"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_HEALTH">${L.get('MAX_HEALTH', 'Vida Máxima')}</label>
                        <input type="number" class="prop-input" step="1" min="1" data-component="Health" data-prop="maxHealth" value="${ley.maxHealth}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="CURRENT_HEALTH">${L.get('CURRENT_HEALTH', 'Vida Actual')}</label>
                        <input type="number" class="prop-input" step="1" min="0" data-component="Health" data-prop="currentHealth" value="${ley.currentHealth}">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="DEATH_ANIMATION">${L.get('DEATH_ANIMATION', 'Animación Muerte')}</label>
                        ${renderPropertyDropper('Animation', ley.deathAnimation, 'data-component="Health" data-prop="deathAnimation"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FREEZE_FRAME">${L.get('FREEZE_FRAME', 'Fotograma Congelado')}</label>
                        <input type="number" class="prop-input" step="1" min="-1" data-component="Health" data-prop="freezeFrame" value="${ley.freezeFrame}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DESTRUCTION_DELAY">${L.get('DESTRUCTION_DELAY', 'Tiempo Desaparición')}</label>
                        <input type="number" class="prop-input" step="0.1" min="-1" data-component="Health" data-prop="destructionDelay" value="${ley.destructionDelay}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Health" data-prop="disableMovementOnDeath" ${ley.disableMovementOnDeath ? 'checked' : ''}>
                        <label data-i18n="DISABLE_MOVEMENT">${L.get('DISABLE_MOVEMENT', 'Desactivar Movimiento')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Health" data-prop="destroyOnDeath" ${ley.destroyOnDeath ? 'checked' : ''}>
                        <label data-i18n="DESTROY_ON_DEATH">${L.get('DESTROY_ON_DEATH', 'Destruir al morir')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Attack) {
            let warningHTML = '';
            if (ley.attacks.some(atk => atk.sound) && !selectedMateria.getComponentByName('AudioSource')) {
                warningHTML = renderDependencyWarning('Attack', 'AudioSource');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('ATTACK_COMPONENT', "Ataque (Attack)"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="inspector-row">
                        <label data-i18n="COLLIDER_MATERIA">${L.get('COLLIDER_MATERIA', 'Materia Colisionador')}</label>
                        ${renderPropertyDropper('Materia', ley.colliderMateria, 'data-component="Attack" data-prop="colliderMateria"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="COOLDOWN">${L.get('COOLDOWN', 'Enfriamiento')}</label>
                        <input type="number" class="prop-input" step="0.1" min="0" data-component="Attack" data-prop="cooldown" value="${ley.cooldown}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="CYCLE_KEY">${L.get('CYCLE_KEY', 'Tecla Ciclo')}</label>
                        <input type="text" class="prop-input" data-component="Attack" data-prop="cycleKey" value="${ley.cycleKey || ''}">
                    </div>
                    <div class="inspector-section-header">
                        <span data-i18n="ATTACKS">${L.get('ATTACKS', 'Ataques')}</span>
                    </div>
                    <div class="layer-list">
                        ${ley.attacks.map((atk, aIdx) => `
                            <div class="layer-item" style="flex-direction: column; align-items: stretch; gap: 5px; padding: 10px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>${L.get('ATTACK', 'Ataque')} ${aIdx}</strong>
                                    <button class="layer-btn remove" onclick="const atk = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.Attack); atk.attacks.splice(${aIdx}, 1); window.updateInspector();">-</button>
                                </div>
                                <div class="prop-row-multi">
                                    <label>Key</label>
                                    <input type="text" class="prop-input" data-component="Attack" data-prop="attacks.${aIdx}.key" value="${atk.key || ''}">
                                </div>
                                <div class="inspector-row">
                                    <label>Anim</label>
                                    ${renderPropertyDropper('Animation', atk.animation, `data-component="Attack" data-prop="attacks.${aIdx}.animation"`)}
                                </div>
                                <div class="inspector-row">
                                    <label>Sound</label>
                                    ${renderPropertyDropper('Audio', atk.sound, `data-component="Attack" data-prop="attacks.${aIdx}.sound"`)}
                                </div>
                                <div class="prop-row-multi">
                                    <label>${L.get('DAMAGE', 'Daño')}</label>
                                    <input type="number" class="prop-input" data-component="Attack" data-prop="attacks.${aIdx}.damage" value="${atk.damage}">
                                </div>
                                <div class="prop-row-multi">
                                    <label>${L.get('PUSH_FORCE', 'Empuje')}</label>
                                    <input type="number" class="prop-input" data-component="Attack" data-prop="attacks.${aIdx}.pushForce" value="${atk.pushForce}">
                                </div>
                                <div class="prop-row-multi">
                                    <label>${L.get('DURATION', 'Duración')}</label>
                                    <input type="number" class="prop-input" step="0.05" data-component="Attack" data-prop="attacks.${aIdx}.duration" value="${atk.duration}">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="add-event-btn" onclick="const atk = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.Attack); atk.attacks.push({key: 'j', animation: '', damage: 10, pushForce: 5, duration: 0.2}); window.updateInspector();">+</button>
                </div>
            `;
        } else if (ley instanceof Components.ProgressBar) {
            componentHTML = `
                ${renderComponentHeader(L.get('PROGRESS_BAR', "Barra de Progreso"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="TARGET_MATERIA">${L.get('TARGET_MATERIA', 'Materia Objetivo')}</label>
                        ${renderPropertyDropper('Materia', ley.targetMateria, 'data-component="ProgressBar" data-prop="targetMateria"')}
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="FILL_MATERIA">${L.get('FILL_MATERIA', 'Materia Relleno')}</label>
                        ${renderPropertyDropper('Materia', ley.fillMateria, 'data-component="ProgressBar" data-prop="fillMateria"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FULL_SIZE">${L.get('FULL_SIZE', 'Tamaño Total')}</label>
                        <input type="number" class="prop-input" data-component="ProgressBar" data-prop="fullSize" value="${ley.fullSize}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ORIENTATION">${L.get('ORIENTATION', 'Orientación')}</label>
                        <select class="prop-input" data-component="ProgressBar" data-prop="orientation">
                            <option value="Horizontal" ${ley.orientation === 'Horizontal' ? 'selected' : ''} data-i18n="HORIZONTAL">${L.get('HORIZONTAL', 'Horizontal')}</option>
                            <option value="Vertical" ${ley.orientation === 'Vertical' ? 'selected' : ''} data-i18n="VERTICAL">${L.get('VERTICAL', 'Vertical')}</option>
                        </select>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="ProgressBar" data-prop="isSceneLoading" ${ley.isSceneLoading ? 'checked' : ''}>
                        <label data-i18n="USE_AS_LOADING_BAR">${L.get('USE_AS_LOADING_BAR', 'Usar como Barra de Carga')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="ProgressBar" data-prop="interactable" ${ley.interactable ? 'checked' : ''}>
                        <label data-i18n="INTERACTABLE">${L.get('INTERACTABLE', 'Interactuable (Slider)')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="VALUE">${L.get('VALUE', 'Valor')}</label>
                        <input type="number" class="prop-input" data-component="ProgressBar" data-prop="value" value="${ley.value}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_VALUE">${L.get('MAX_VALUE', 'Valor Máximo')}</label>
                        <input type="number" class="prop-input" data-component="ProgressBar" data-prop="maxValue" value="${ley.maxValue}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.UIScrollRect) {
            componentHTML = `
                ${renderComponentHeader(L.get('SCROLL_RECT', "Rect de Desplazamiento"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="CONTENT_MATERIA">${L.get('CONTENT_MATERIA', 'Materia de Contenido')}</label>
                        ${renderPropertyDropper('Materia', ley.contentMateria, 'data-component="UIScrollRect" data-prop="contentMateria"')}
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="UIScrollRect" data-prop="horizontal" ${ley.horizontal ? 'checked' : ''}>
                        <label data-i18n="HORIZONTAL">${L.get('HORIZONTAL', 'Horizontal')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="UIScrollRect" data-prop="vertical" ${ley.vertical ? 'checked' : ''}>
                        <label data-i18n="VERTICAL">${L.get('VERTICAL', 'Vertical')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SCROLL_SENSITIVITY">${L.get('SCROLL_SENSITIVITY', 'Sensibilidad')}</label>
                        <input type="number" class="prop-input" step="0.1" data-component="UIScrollRect" data-prop="scrollSensitivity" value="${ley.scrollSensitivity}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="INERTIA">${L.get('INERTIA', 'Inercia')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" max="1" data-component="UIScrollRect" data-prop="inertia" value="${ley.inertia}">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="V_SCROLLBAR">${L.get('V_SCROLLBAR', 'Barra Vertical')}</label>
                        ${renderPropertyDropper('Materia', ley.verticalScrollbar, 'data-component="UIScrollRect" data-prop="verticalScrollbar"')}
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="H_SCROLLBAR">${L.get('H_SCROLLBAR', 'Barra Horizontal')}</label>
                        ${renderPropertyDropper('Materia', ley.horizontalScrollbar, 'data-component="UIScrollRect" data-prop="horizontalScrollbar"')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.UIMask) {
            componentHTML = `
                ${renderComponentHeader(L.get('UI_MASK', "Máscara UI"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="UIMask" data-prop="showGizmo" ${ley.showGizmo ? 'checked' : ''}>
                        <label data-i18n="SHOW_GIZMO">${L.get('SHOW_GIZMO', 'Mostrar Gizmo')}</label>
                    </div>
                    <p class="info-text">${L.get('MASK_INFO', 'Recorta los elementos hijos dentro del área de este objeto.')}</p>
                </div>
            `;
        } else if (ley instanceof Components.UICollider) {
            componentHTML = `
                ${renderComponentHeader(L.get('UI_COLLIDER', "Colisionador UI"), icon, index)}
                <div class="component-content">
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="UICollider" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Es Gatillo (Trigger)')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Patrol) {
            componentHTML = `
                ${renderComponentHeader(L.get('PATROL_COMPONENT', "Patrulla (Patrol)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="VELOCIDAD">${L.get('VELOCIDAD', 'Velocidad')}</label>
                        <input type="number" class="prop-input" step="1" data-component="Patrol" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DISTANCE">${L.get('DISTANCE', 'Distancia')}</label>
                        <input type="number" class="prop-input" step="1" data-component="Patrol" data-prop="distance" value="${ley.distance}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PAUSE_TIME">${L.get('PAUSE_TIME', 'Tiempo Pausa (s)')}</label>
                        <input type="number" class="prop-input" step="0.1" min="0" data-component="Patrol" data-prop="pauseTime" value="${ley.pauseTime}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Patrol" data-prop="horizontal" ${ley.horizontal ? 'checked' : ''}>
                        <label data-i18n="HORIZONTAL">${L.get('HORIZONTAL', 'Horizontal')}</label>
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span>${L.get('ANIMATIONS', 'Animaciones')}</span></div>
                    <div class="prop-row-multi">
                        <label>Idle</label>
                        <input type="text" class="prop-input" data-component="Patrol" data-prop="idleAnim" value="${ley.idleAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Move</label>
                        <input type="text" class="prop-input" data-component="Patrol" data-prop="moveAnim" value="${ley.moveAnim || ''}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Transform) {
            if (selectedMateria.getComponent(Components.UITransform)) {
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
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="localPosition.z" value="${ley.localPosition.z || 0}" title="Z">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ROTATION">${L.get('PROP_ROTATION', 'Rotation')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="localRotation.x" value="${ley.localRotation?.x || 0}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="localRotation.y" value="${ley.localRotation?.y || 0}" title="Y">
                            <input type="number" class="prop-input" step="1" data-component="Transform" data-prop="localRotation.z" value="${(typeof ley.localRotation === 'number' ? ley.localRotation : ley.localRotation?.z) || 0}" title="Z">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_SCALE">${L.get('PROP_SCALE', 'Scale')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="localScale.x" value="${ley.localScale.x}" title="X">
                            <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="localScale.y" value="${ley.localScale.y}" title="Y">
                            <input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="localScale.z" value="${ley.localScale.z || 1}" title="Z">
                        </div>
                    </div>
                    <div class="inspector-section-header"><span>${L.get('ORIENTATION', 'Orientación')}</span></div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Transform" data-prop="flipX" ${ley.flipX ? 'checked' : ''}>
                        <label data-i18n="PROP_FLIP_X">${L.get('PROP_FLIP_X', 'Voltear Horizontal')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Transform" data-prop="flipY" ${ley.flipY ? 'checked' : ''}>
                        <label data-i18n="PROP_FLIP_Y">${L.get('PROP_FLIP_Y', 'Voltear Vertical')}</label>
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
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="PolygonCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="PolygonCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="inspector-field-group">
                        <label data-i18n="VERTICES">${L.get('VERTICES', 'Vértices')} (${ley.vertices?.length || 0})</label>
                        <p class="field-description" data-i18n="VERTICES_DESC">${L.get('VERTICES_DESC', 'La edición manual de vértices se habilitará próximamente. Actualmente se genera automáticamente para terrenos.')}</p>
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
                 <div class="inspector-row">
                    <label data-i18n="ANCHOR_POINT">${L.get('ANCHOR_POINT', 'Punto de Anclaje')}</label>
                    <div class="anchor-grid-container">
                        ${anchorGridHTML}
                    </div>
                </div>
                <div class="prop-row-multi">
                    <label data-i18n="POSICION">${L.get('POSICION', 'Position')}</label>
                    <div class="prop-inputs">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="position.x" value="${ley.position.x}" title="${L.get('POSITION_X_OFFSET', 'Position X Offset')}">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="position.y" value="${ley.position.y}" title="${L.get('POSITION_Y_OFFSET', 'Position Y Offset')}">
                    </div>
                </div>
                <div class="prop-row-multi">
                    <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                    <div class="prop-inputs">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="size.width" value="${ley.size.width}" title="${L.get('WIDTH', 'Width')}">
                        <input type="number" class="prop-input" step="1" data-component="UITransform" data-prop="size.height" value="${ley.size.height}" title="${L.get('HEIGHT', 'Height')}">
                    </div>
                </div>
                <div class="prop-row-multi">
                    <label data-i18n="PROP_PIVOT">${L.get('PROP_PIVOT', 'Pivot')}</label>
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
                    <label data-i18n="SOURCE">${L.get('SOURCE', 'Source')}</label>
                    ${renderPropertyDropper('Sprite', ley.source, 'data-component="UIImage" data-prop="source"')}
                </div>
                <div class="prop-row-multi">
                    <label data-i18n="COLOR">${L.get('COLOR', 'Color')}</label>
                    <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="UIImage" data-prop="color" value="${ley.color && ley.color.startsWith('#') ? ley.color : '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                        <input type="text" class="prop-input hex-input" data-component="UIImage" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                    </div>
                </div>
                    <div class="prop-row-multi">
                        <label data-i18n="OPACITY">${L.get('OPACITY', 'Opacidad')}</label>
                        <input type="range" class="prop-input" min="0" max="1" step="0.01" data-component="UIImage" data-prop="opacity" value="${ley.opacity !== undefined ? ley.opacity : 1.0}">
                    </div>
            </div>`;
        } else if (ley instanceof Components.UIText) {
            const fontName = ley.fontAssetPath ? ley.fontAssetPath.split('/').pop() : L.get('DEFAULT', 'Default');
            componentHTML = `
                ${renderComponentHeader(L.get('UI_TEXT', "UI Text"), "type", index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="TEXTO">${L.get('TEXTO', 'Text')}</label>
                        <textarea class="prop-input" data-component="UIText" data-prop="text" rows="3">${ley.text}</textarea>
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="FONT">${L.get('FONT', 'Font')}</label>
                        ${renderPropertyDropper('Font', ley.fontAssetPath, 'data-component="UIText" data-prop="fontAssetPath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FONT_SIZE">${L.get('FONT_SIZE', 'Font Size')}</label>
                        <input type="number" class="prop-input" data-component="UIText" data-prop="fontSize" value="${ley.fontSize}" min="1">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="UIText" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" class="prop-input hex-input" data-component="UIText" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ALIGNMENT">${L.get('ALIGNMENT', 'Alignment')}</label>
                        <select class="prop-input" data-component="UIText" data-prop="horizontalAlign">
                            <option value="left" ${ley.horizontalAlign === 'left' ? 'selected' : ''}>${L.get('LEFT', 'Left')}</option>
                            <option value="center" ${ley.horizontalAlign === 'center' ? 'selected' : ''}>${L.get('CENTER', 'Center')}</option>
                            <option value="right" ${ley.horizontalAlign === 'right' ? 'selected' : ''}>${L.get('RIGHT', 'Right')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TRANSFORM">${L.get('TRANSFORM', 'Transform')}</label>
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
                        <label data-i18n="RENDER_MODE">${L.get('RENDER_MODE', 'Render Mode')}</label>
                        <select class="prop-input inspector-re-render" data-component="Canvas" data-prop="renderMode">
                            <option value="Screen Space" ${!isWorldSpace ? 'selected' : ''} data-i18n="SCREEN_SPACE">${L.get('SCREEN_SPACE', 'Screen Space')}</option>
                            <option value="World Space" ${isWorldSpace ? 'selected' : ''} data-i18n="WORLD_SPACE">${L.get('WORLD_SPACE', 'World Space')}</option>
                        </select>
                    </div>

                    <!-- World Space Properties -->
                    <div class="prop-row-multi" data-canvas-props="world" style="display: ${isWorldSpace ? 'flex' : 'none'};">
                        <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Canvas" data-prop="size.x" value="${ley.size.x}">
                            <input type="number" class="prop-input" data-component="Canvas" data-prop="size.y" value="${ley.size.y}">
                        </div>
                    </div>

                    <!-- Screen Space Properties -->
                    <div class="prop-row-multi" data-canvas-props="screen" style="display: ${!isWorldSpace ? 'flex' : 'none'};">
                        <label data-i18n="REFERENCE_RES">${L.get('REFERENCE_RES', 'Reference Res')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Canvas" data-prop="referenceResolution.width" value="${ssResolution.width}">
                            <input type="number" class="prop-input" data-component="Canvas" data-prop="referenceResolution.height" value="${ssResolution.height}">
                        </div>
                    </div>
                     <div class="prop-row-multi" data-canvas-props="screen" style="display: ${!isWorldSpace ? 'flex' : 'none'};">
                        <label data-i18n="SCREEN_MATCH">${L.get('SCREEN_MATCH', 'Screen Match')}</label>
                         <select class="prop-input" data-component="Canvas" data-prop="screenMatchMode">
                            <option value="Match Width Or Height" ${ley.screenMatchMode === 'Match Width Or Height' ? 'selected' : ''} data-i18n="MATCH_WIDTH_HEIGHT">${L.get('MATCH_WIDTH_HEIGHT', 'Match Width Or Height')}</option>
                        </select>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Canvas" data-prop="showGrid" ${ley.showGrid ? 'checked' : ''}>
                        <label data-i18n="SHOW_GRID_GIZMO">${L.get('SHOW_GRID_GIZMO', 'Show Grid Gizmo')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Canvas" data-prop="scaleChildren" ${ley.scaleChildren ? 'checked' : ''}>
                        <label data-i18n="SCALE_CHILDREN">${L.get('SCALE_CHILDREN', 'Scale Children')}</label>
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
                        <label data-i18n="INTERACTABLE">${L.get('INTERACTABLE', 'Interactable')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="TRANSITION">${L.get('TRANSITION', 'Transition')}</label>
                        <select class="prop-input inspector-re-render" data-component="Button" data-prop="transition">
                            <option value="None" ${ley.transition === 'None' ? 'selected' : ''} data-i18n="NONE">${L.get('NONE', 'None')}</option>
                            <option value="Color Tint" ${isColorTint ? 'selected' : ''} data-i18n="COLOR_TINT">${L.get('COLOR_TINT', 'Color Tint')}</option>
                            <option value="Sprite Swap" ${isSpriteSwap ? 'selected' : ''} data-i18n="SPRITE_SWAP">${L.get('SPRITE_SWAP', 'Sprite Swap')}</option>
                            <option value="Animation" ${isAnimation ? 'selected' : ''} data-i18n="ANIMATION">${L.get('ANIMATION', 'Animation')}</option>
                        </select>
                    </div>
                    <div id="color-tint-settings" style="display: ${isColorTint ? 'block' : 'none'};">
                        <div class="prop-row-multi">
                            <label data-i18n="NORMAL_COLOR">${L.get('NORMAL_COLOR', 'Normal Color')}</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.normalColor" value="${ley.colors.normalColor}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="PRESSED_COLOR">${L.get('PRESSED_COLOR', 'Pressed Color')}</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.pressedColor" value="${ley.colors.pressedColor}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="DISABLED_COLOR">${L.get('DISABLED_COLOR', 'Disabled Color')}</label>
                            <input type="color" class="prop-input" data-component="Button" data-prop="colors.disabledColor" value="${ley.colors.disabledColor}">
                        </div>
                    </div>
                    <div id="sprite-swap-settings" style="display: ${isSpriteSwap ? 'block' : 'none'};">
                        <div class="inspector-row">
                            <label data-i18n="HIGHLIGHTED_SPRITE">${L.get('HIGHLIGHTED_SPRITE', 'Highlighted Sprite')}</label>
                            ${renderPropertyDropper('Sprite', ley.spriteSwap.highlightedSprite, 'data-component="Button" data-prop="spriteSwap.highlightedSprite"')}
                        </div>
                        <div class="inspector-row">
                            <label data-i18n="PRESSED_SPRITE">${L.get('PRESSED_SPRITE', 'Pressed Sprite')}</label>
                            ${renderPropertyDropper('Sprite', ley.spriteSwap.pressedSprite, 'data-component="Button" data-prop="spriteSwap.pressedSprite"')}
                        </div>
                        <div class="inspector-row">
                            <label data-i18n="DISABLED_SPRITE">${L.get('DISABLED_SPRITE', 'Disabled Sprite')}</label>
                            ${renderPropertyDropper('Sprite', ley.spriteSwap.disabledSprite, 'data-component="Button" data-prop="spriteSwap.disabledSprite"')}
                        </div>
                    </div>
                    <div id="animation-settings" style="display: ${isAnimation ? 'block' : 'none'};">
                        <div class="prop-row-multi">
                            <label data-i18n="HIGHLIGHTED_TRIGGER">${L.get('HIGHLIGHTED_TRIGGER', 'Highlighted Trigger')}</label>
                            <input type="text" class="prop-input" data-component="Button" data-prop="animationTriggers.highlightedTrigger" value="${ley.animationTriggers.highlightedTrigger}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="PRESSED_TRIGGER">${L.get('PRESSED_TRIGGER', 'Pressed Trigger')}</label>
                            <input type="text" class="prop-input" data-component="Button" data-prop="animationTriggers.pressedTrigger" value="${ley.animationTriggers.pressedTrigger}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="DISABLED_TRIGGER">${L.get('DISABLED_TRIGGER', 'Disabled Trigger')}</label>
                            <input type="text" class="prop-input" data-component="Button" data-prop="animationTriggers.disabledTrigger" value="${ley.animationTriggers.disabledTrigger}">
                        </div>
                    </div>
                     <div class="inspector-section-header">
                        <span data-i18n="ON_CLICK">${L.get('ON_CLICK', 'On Click ()')}</span>
                    </div>
                    <div class="onclick-event-list">
                        ${ley.onClick.map((event, index) => {
                            let functionsDropdown = `<option value="">${L.get('SIN_FUNCION', 'No Function')}</option>`;

                            if (event.targetMateriaId !== null && event.targetMateriaId !== undefined) {
                                const targetMateria = window.SceneManager.currentScene.findMateriaById(event.targetMateriaId);
                                if (targetMateria) {
                                    functionsDropdown = getFunctionOptionsHTML(targetMateria, event.functionName);
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
        else if (ley instanceof Components.CircleCollider2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('CIRCLE_COLLIDER_2D', "Circle Collider 2D"), 'disc', index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CircleCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="CircleCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="CircleCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RADIUS">${L.get('RADIUS', 'Radius')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="CircleCollider2D" data-prop="radius" value="${ley.radius}" title="${L.get('RADIUS', 'Radius')}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.SpriteRenderer) {
            let spriteSelectorHTML = '';
            // If a .ceSprite asset is loaded, show the dropdown to select a specific sprite
            if (ley.spriteSheet && ley.spriteSheet.sprites && Object.keys(ley.spriteSheet.sprites).length > 0) {
                const options = Object.keys(ley.spriteSheet.sprites)
                    .map(spriteName => `<option value="${spriteName}" ${ley.spriteName === spriteName ? 'selected' : ''}>${spriteName}</option>`)
                    .join('');

                spriteSelectorHTML = `
                    <div class="inspector-row">
                        <label for="sprite-name-select" data-i18n="SPRITE">${L.get('SPRITE', 'Sprite')}</label>
                        <select id="sprite-name-select" class="prop-input inspector-re-render" data-component="SpriteRenderer" data-prop="spriteName">
                            ${options}
                        </select>
                    </div>
                `;
            }

            componentHTML = `
                ${renderComponentHeader(L.get('SPRITE_RENDERER', "Sprite Renderer"), icon, index)}
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
                        <label data-i18n="ANIMATION_CLIP">${L.get('ANIMATION_CLIP', 'Animation Clip')}</label>
                        ${renderPropertyDropper('Animation', ley.animationClipPath, 'data-component="Animator" data-prop="animationClipPath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPEED">${L.get('SPEED', 'Speed')}</label>
                        <input type="number" class="prop-input" step="1" min="0" data-component="Animator" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Animator" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label data-i18n="LOOP">${L.get('LOOP', 'Loop')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Animator" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label data-i18n="REPRODUCIR_AL_EMPEZAR">${L.get('REPRODUCIR_AL_EMPEZAR', 'Play On Awake')}</label>
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
                        <label data-i18n="CONTROLLER">${L.get('CONTROLLER', 'Controller')}</label>
                        ${renderPropertyDropper('AnimatorController', ley.controllerPath, 'data-component="AnimatorController" data-prop="controllerPath"')}
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="AnimatorController" data-prop="smartMode" ${ley.smartMode ? 'checked' : ''}>
                        <label data-i18n="SMART_MODE_DIRECTIONS">${L.get('SMART_MODE_DIRECTIONS', 'Modo Inteligente (Direcciones)')}</label>
                    </div>

                    <div class="inspector-section-header"><span data-i18n="RESPONSE_CONFIG">${L.get('RESPONSE_CONFIG', 'Configuración de Respuesta')}</span></div>
                    <div class="prop-row-multi">
                        <label title="${L.get('DEADZONE_DESC', 'Movimiento mínimo para activar dirección')}" data-i18n="DEADZONE">${L.get('DEADZONE', 'Sensibilidad (Deadzone)')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" max="1" data-component="AnimatorController" data-prop="deadZone" value="${ley.deadZone ?? 0.1}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('START_DELAY_DESC', 'Tiempo de espera para empezar animación')}" data-i18n="START_DELAY">${L.get('START_DELAY', 'Retraso Inicio (s)')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="startDelay" value="${ley.startDelay ?? 0.02}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('STOP_DELAY_DESC', 'Tiempo de espera para volver a parado')}" data-i18n="STOP_DELAY">${L.get('STOP_DELAY', 'Retraso Parada (s)')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="stopDelay" value="${ley.stopDelay ?? 0.02}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('DIRECTION_DELAY_DESC', 'Tiempo de espera para cambiar dirección')}" data-i18n="DIRECTION_DELAY">${L.get('DIRECTION_DELAY', 'Retraso Giro (s)')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="directionDelay" value="${ley.directionDelay ?? 0.05}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="${L.get('STOP_BUFFER_DESC', 'Tiempo que la animación sigue activa tras soltar')}" data-i18n="STOP_BUFFER">${L.get('STOP_BUFFER', 'Buffer Inercia (s)')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" data-component="AnimatorController" data-prop="stopBuffer" value="${ley.stopBuffer ?? 0.05}">
                    </div>

                    <div class="inspector-field-group">
                        <label data-i18n="STATES">${L.get('STATES', 'States')}</label>
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
                        <label data-i18n="DEPTH">${L.get('DEPTH', 'Depth')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Camera" data-prop="depth" value="${ley.depth || 0}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="CLEAR_FLAGS">${L.get('CLEAR_FLAGS', 'Clear Flags')}</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="Camera" data-prop="clearFlags">
                                <option value="SolidColor" ${clearFlags === 'SolidColor' ? 'selected' : ''} data-i18n="SOLID_COLOR">${L.get('SOLID_COLOR', 'Solid Color')}</option>
                                <option value="Skybox" ${clearFlags === 'Skybox' ? 'selected' : ''} data-i18n="SKYBOX">${L.get('SKYBOX', 'Skybox')}</option>
                                <option value="DontClear" ${clearFlags === 'DontClear' ? 'selected' : ''} data-i18n="DONT_CLEAR">${L.get('DONT_CLEAR', "Don't Clear")}</option>
                            </select>
                        </div>
                    </div>

                    <div class="prop-row-multi" style="display: ${clearFlags === 'SolidColor' ? 'flex' : 'none'};">
                        <label data-i18n="BACKGROUND">${L.get('BACKGROUND', 'Background')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="Camera" data-prop="backgroundColor" value="${ley.backgroundColor || '#1e293b'}">
                        </div>
                    </div>

                    <div class="prop-row-multi">
                        <label data-i18n="CULLING_MASK">${L.get('CULLING_MASK', 'Culling Mask')}</label>
                        <div class="prop-inputs">
                            <button id="culling-mask-btn" class="prop-input-button">${getCullingMaskText(ley.cullingMask)}</button>
                        </div>
                    </div>

                    <div class="prop-row-multi">
                        <label data-i18n="PROJECTION">Proyección</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="Camera" data-prop="projection">
                                <option value="Orthographic" ${projection === 'Orthographic' ? 'selected' : ''}>2D (Ortográfica)</option>
                                <option value="Perspective" ${projection === 'Perspective' ? 'selected' : ''}>3D (Perspectiva)</option>
                            </select>
                        </div>
                    </div>

                    <div class="prop-row-multi" style="display: ${projection === 'Perspective' ? 'flex' : 'none'};">
                        <label data-i18n="FOV">Campo de Visión (FOV)</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Camera" data-prop="fov" value="${ley.fov || 60}" min="1" max="179">
                        </div>
                    </div>

                     <div class="prop-row-multi" style="display: ${projection === 'Orthographic' ? 'flex' : 'none'};">
                        <label data-i18n="SIZE_ZOOM">${L.get('SIZE_ZOOM', 'Size (Zoom)')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Camera" data-prop="orthographicSize" value="${ley.orthographicSize || 5}" min="0.1">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.PointLight2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('POINT_LIGHT_2D', "Point Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="PointLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" class="prop-input hex-input" data-component="PointLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    ${renderLightColorPresets("PointLight2D")}
                    <div class="prop-row-multi">
                        <label data-i18n="INTENSITY">${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="PointLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LIGHT_FILTER">${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="PointLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RADIUS">${L.get('RADIUS', 'Radius')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="10" min="0" data-component="PointLight2D" data-prop="radius" value="${ley.radius}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.SpotLight2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('SPOT_LIGHT_2D', "Spot Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="SpotLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="width: 30px; padding: 0; border: none; height: 20px;">
                            <input type="text" class="prop-input hex-input" data-component="SpotLight2D" data-prop="color" value="${ley.color || '#ffffff'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                    ${renderLightColorPresets("SpotLight2D")}
                    <div class="prop-row-multi">
                        <label data-i18n="INTENSITY">${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="SpotLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LIGHT_FILTER">${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="SpotLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RADIUS">${L.get('RADIUS', 'Radius')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="10" min="0" data-component="SpotLight2D" data-prop="radius" value="${ley.radius}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ANGLE">${L.get('ANGLE', 'Angle')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" min="1" max="180" data-component="SpotLight2D" data-prop="angle" value="${ley.angle}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.FreeformLight2D) {
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('FREEFORM_LIGHT_2D', "Freeform Light 2D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="FreeformLight2D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    ${renderLightColorPresets("FreeformLight2D")}
                    <div class="prop-row-multi">
                        <label data-i18n="INTENSITY">${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="FreeformLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LIGHT_FILTER">${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="FreeformLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                    <hr>
                    <p class="field-description" data-i18n="VERTICES_EDIT_FUTURE">${L.get('VERTICES_EDIT_FUTURE', 'La edición de vértices se implementará en una futura actualización.')}</p>
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
                            <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                            <div class="prop-inputs">
                                <input type="number" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="width" value="${ley.width}" title="Width">
                                <input type="number" class="prop-input" step="1" min="1" data-component="Tilemap" data-prop="height" value="${ley.height}" title="Height">
                            </div>
                        </div>
                    `;
                } else {
                    sizeInputHTML = `
                        <div class="prop-row-multi">
                            <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
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
                            <label for="tilemap-manual-size-toggle" data-i18n="MANUAL_SIZE">${L.get('MANUAL_SIZE', 'Tamaño Manual')}</label>
                        </div>
                        ${sizeInputHTML}
                        <hr>
                        <div class="layer-manager-ui">
                            <div class="layer-list-header">
                                <h5 data-i18n="LAYERS">${L.get('LAYERS', 'Capas')}</h5>
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
                ${renderComponentHeader(L.get('TILEMAP_RENDERER', 'Tilemap Renderer'), 'brush', index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" class="prop-input" step="1" data-component="TilemapRenderer" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.TilemapCollider2D) {
            const tilemap = selectedMateria.getComponent(Components.Tilemap);
            let layerOptions = `<option value="-1">${L.get('NINGUNA', 'Ninguna')}</option>`;
            if (tilemap) {
                layerOptions = tilemap.layers.map((layer, index) =>
                    `<option value="${index}" ${ley.sourceLayerIndex === index ? 'selected' : ''}>${index}: ${layer.name}</option>`
                ).join('');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('TILEMAP_COLLIDER_2D', 'Tilemap Collider 2D'), 'grid', index)}
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input inspector-re-render" data-component="TilemapCollider2D" data-prop="usarTodasLasCapas" ${ley.usarTodasLasCapas ? 'checked' : ''}>
                        <label data-i18n="USE_ALL_LAYERS">${L.get('USE_ALL_LAYERS', 'Usar todas las capas')}</label>
                    </div>
                    <div class="prop-row-multi" style="display: ${ley.usarTodasLasCapas ? 'none' : 'flex'};">
                        <label for="collider-source-layer" data-i18n="SOURCE_LAYER">${L.get('SOURCE_LAYER', 'Capa de Origen')}</label>
                        <select id="collider-source-layer" class="prop-input" data-component="TilemapCollider2D" data-prop="sourceLayerIndex">
                            ${layerOptions}
                        </select>
                    </div>
                    <hr>
                    <button class="primary-btn" data-action="generate-colliders" style="width: 100%;" data-i18n="GENERATE_COLLIDERS">${L.get('GENERATE_COLLIDERS', 'Generar Colisionadores')}</button>
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
                        <label data-i18n="CELL_SIZE">${L.get('CELL_SIZE', 'Cell Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" min="1" data-component="Grid" data-prop="simplifiedSize" value="${cellSize.x}">
                        </div>
                    </div>
                `;
            } else {
                sizeInputHTML = `
                    <div class="prop-row-multi">
                        <label data-i18n="CELL_SIZE">${L.get('CELL_SIZE', 'Cell Size')}</label>
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
                        <label for="grid-simplified-toggle" data-i18n="SIMPLIFIED">${L.get('SIMPLIFIED', 'Simplificado')}</label>
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
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="size.x" value="${ley.size.x}" title="${L.get('SIZE_X', 'Size X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="CapsuleCollider2D" data-prop="size.y" value="${ley.size.y}" title="${L.get('SIZE_Y', 'Size Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="DIRECTION">${L.get('DIRECTION', 'Direction')}</label>
                        <div class="prop-inputs">
                            <select class="prop-input inspector-re-render" data-component="CapsuleCollider2D" data-prop="direction">
                                <option value="Vertical" ${ley.direction === 'Vertical' ? 'selected' : ''} data-i18n="VERTICAL">${L.get('VERTICAL', 'Vertical')}</option>
                                <option value="Horizontal" ${ley.direction === 'Horizontal' ? 'selected' : ''} data-i18n="HORIZONTAL">${L.get('HORIZONTAL', 'Horizontal')}</option>
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
                        <label data-i18n="SPRITE">${L.get('SPRITE', 'Sprite')}</label>
                        ${renderPropertyDropper('Sprite', ley.source, 'data-component="SpriteLight2D" data-prop="source"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="SpriteLight2D" data-prop="color" value="${ley.color}">
                        </div>
                    </div>
                    ${renderLightColorPresets("SpriteLight2D")}
                    <div class="prop-row-multi">
                        <label data-i18n="INTENSITY">${L.get('INTENSITY', 'Intensidad')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.1" min="0" max="10" data-component="SpriteLight2D" data-prop="intensity" value="${ley.intensity}">
                            <span style="min-width: 30px; text-align: right;">${ley.intensity}</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LIGHT_FILTER">${L.get('LIGHT_FILTER', 'Filtro Luz')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" step="0.01" min="0" max="1" data-component="SpriteLight2D" data-prop="filtroOpacidad" value="${ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0}">
                            <span style="min-width: 30px; text-align: right;">${Math.round((ley.filtroOpacidad !== undefined ? ley.filtroOpacidad : 1.0) * 100)}%</span>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.Rigidbody2D) {
            let warningHTML = '';
            if (ley.bodyType !== 'Static' && !selectedMateria.leyes.some(l => l.constructor.name.includes('Collider2D'))) {
                warningHTML = `
                    <div class="inspector-warning-box">
                        <div class="warning-header">${getIconHTML('alert-circle')} <span>${L.get('AVISO', 'Aviso')}</span></div>
                        <div class="warning-text">${L.get('RIGIDBODY_COLLIDER_WARNING', 'El Rigidbody necesita un Colisionador para interactuar físicamente.')}</div>
                        <button class="warning-btn" onclick="const mtr = window.getSelectedMateria(); if(mtr) { mtr.addComponent(new window.Components.BoxCollider2D(mtr)); window.updateInspector(); window.updateScene(); }">
                            + BoxCollider2D
                        </button>
                    </div>
                `;
            }

            const rigidbody = ley; // Rename for clarity as suggested in review
            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('RIGIDBODY_2D', "Rigidbody 2D"), icon, index)}
                <div class="component-content" style="padding-top:0;">${warningHTML}</div>
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="BODY_TYPE">${L.get('BODY_TYPE', 'Body Type')}</label>
                        <select class="prop-input" data-component="Rigidbody2D" data-prop="bodyType">
                            <option value="Dynamic" ${rigidbody.bodyType === 'Dynamic' ? 'selected' : ''} data-i18n="DYNAMIC">Dynamic</option>
                            <option value="Kinematic" ${rigidbody.bodyType === 'Kinematic' ? 'selected' : ''} data-i18n="KINEMATIC">Kinematic</option>
                            <option value="Static" ${rigidbody.bodyType === 'Static' ? 'selected' : ''} data-i18n="STATIC">Static</option>
                        </select>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Rigidbody2D" data-prop="simulated" ${rigidbody.simulated ? 'checked' : ''}>
                        <label data-i18n="ACTIVO">${L.get('ACTIVO', 'Simulated')}</label>
                    </div>
                    <div class="inspector-field-group">
                        <div class="prop-row-multi">
                            <label data-i18n="MASS">${L.get('MASS', 'Mass')}</label>
                            <input type="number" class="prop-input" step="0.1" data-component="Rigidbody2D" data-prop="mass" value="${rigidbody.mass}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="GRAVITY_SCALE">${L.get('GRAVITY_SCALE', 'Gravity Scale')}</label>
                            <input type="number" class="prop-input" step="0.1" data-component="Rigidbody2D" data-prop="gravityScale" value="${rigidbody.gravityScale}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="BOUNCINESS">${L.get('BOUNCINESS', 'Rebote (Bounciness)')}</label>
                            <input type="number" class="prop-input" step="0.1" min="0" max="1" data-component="Rigidbody2D" data-prop="rebote" value="${rigidbody.rebote || 0}">
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="DAMPING">${L.get('DAMPING', 'Angular Drag')}</label>
                            <input type="number" class="prop-input" step="0.01" min="0" data-component="Rigidbody2D" data-prop="angularDrag" value="${rigidbody.angularDrag || 0}">
                        </div>
                    </div>
                    <div class="inspector-field-group">
                        <label data-i18n="CONSTRAINTS">${L.get('CONSTRAINTS', 'Constraints')}</label>
                        <div class="checkbox-field" style="padding-left: 10px;">
                            <input type="checkbox" class="prop-input" data-component="Rigidbody2D" data-prop="constraints.freezeRotation" ${rigidbody.constraints.freezeRotation ? 'checked' : ''}>
                            <label data-i18n="FREEZE_ROTATION">${L.get('FREEZE_ROTATION', 'Freeze Rotation Z')}</label>
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
                        <label data-i18n="ORDER">${L.get('ORDER', 'Orden')}</label>
                        <input type="number" class="prop-input" step="1" data-component="DrawingOrder" data-prop="order" value="${ley.order || 0}">
                    </div>
                    <p class="field-description" data-i18n="DRAWING_ORDER_DESC">${L.get('DRAWING_ORDER_DESC', 'Valores altos delante, bajos detrás. Sobrescribe el orden por defecto.')}</p>
                </div>
            `;
        } else if (ley instanceof Components.BoxCollider2D) {
            let warningHTML = '';
            if (!selectedMateria.getComponentByName('Rigidbody2D')) {
                warningHTML = renderDependencyWarning('BoxCollider2D', 'Rigidbody2D');
            }

            componentHTML = `
            <div class="component-inspector">
                ${renderComponentHeader(L.get('BOX_COLLIDER_2D', "Box Collider 2D"), icon, index)}
                <div class="component-content" style="padding-top:0;">${warningHTML}</div>
                <div class="component-content">
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="BoxCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <hr>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="offset.x" value="${ley.offset.x}" title="${L.get('OFFSET_X', 'Offset X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="offset.y" value="${ley.offset.y}" title="${L.get('OFFSET_Y', 'Offset Y')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_DIMENSIONS">${L.get('PROP_DIMENSIONS', 'Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="size.x" value="${ley.size.x}" title="${L.get('SIZE_X', 'Size X')}">
                            <input type="number" class="prop-input" step="0.1" data-component="BoxCollider2D" data-prop="size.y" value="${ley.size.y}" title="${L.get('SIZE_Y', 'Size Y')}">
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (ley instanceof Components.Movement) {
            let warningHTML = '';
            if (ley.useRigidbody && !selectedMateria.getComponentByName('Rigidbody2D')) {
                warningHTML = renderDependencyWarning('Movement', 'Rigidbody2D');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('MOVEMENT_BASIC', "Movimiento (Básico)"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="inspector-section-header"><span>${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_UP_DOWN">${L.get('KEYS_UP_DOWN', 'Teclas (Arriba/Abajo)')}</label>
                        <div class="prop-inputs">
                            <input type="text" class="prop-input" data-component="Movement" data-prop="upKey" value="${ley.upKey}" title="${L.get('UP', 'Arriba')}">
                            <input type="text" class="prop-input" data-component="Movement" data-prop="downKey" value="${ley.downKey}" title="${L.get('DOWN', 'Abajo')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_LEFT_RIGHT">${L.get('KEYS_LEFT_RIGHT', 'Teclas (Izq/Der)')}</label>
                        <div class="prop-inputs">
                            <input type="text" class="prop-input" data-component="Movement" data-prop="leftKey" value="${ley.leftKey}" title="${L.get('LEFT', 'Izquierda')}">
                            <input type="text" class="prop-input" data-component="Movement" data-prop="rightKey" value="${ley.rightKey}" title="${L.get('RIGHT', 'Derecha')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="JUMP_KEY">${L.get('JUMP_KEY', 'Tecla Salto')}</label>
                        <input type="text" class="prop-input" data-component="Movement" data-prop="jumpKey" value="${ley.jumpKey}">
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span>${L.get('SETTINGS', 'Configuración')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPEED">${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" class="prop-input" data-component="Movement" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="JUMP_FORCE">${L.get('JUMP_FORCE', 'Fuerza Salto')}</label>
                        <input type="number" class="prop-input" data-component="Movement" data-prop="jumpForce" value="${ley.jumpForce}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="Movement" data-prop="useRigidbody" ${ley.useRigidbody ? 'checked' : ''}>
                        <label data-i18n="USE_RIGIDBODY">${L.get('USE_RIGIDBODY', 'Usar Rigidbody')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="GROUND_TAG">${L.get('GROUND_TAG', 'Tag del Suelo')}</label>
                        <input type="text" class="prop-input" data-component="Movement" data-prop="groundTag" value="${ley.groundTag || 'Ground'}">
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span>${L.get('SOUNDS', 'Sonidos')}</span></div>
                    <div class="inspector-row">
                        <label>Sonido Mov</label>
                        ${renderPropertyDropper('Audio', ley.moveSound, 'data-component="Movement" data-prop="moveSound"')}
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Salto</label>
                        ${renderPropertyDropper('Audio', ley.jumpSound, 'data-component="Movement" data-prop="jumpSound"')}
                    </div>
                    <hr>
                    <div class="inspector-section-header"><span>${L.get('ANIMATIONS', 'Animaciones')}</span></div>
                    <div class="prop-row-multi">
                        <label>Idle</label>
                        <input type="text" class="prop-input" data-component="Movement" data-prop="idleAnim" value="${ley.idleAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Run</label>
                        <input type="text" class="prop-input" data-component="Movement" data-prop="runAnim" value="${ley.runAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Jump</label>
                        <input type="text" class="prop-input" data-component="Movement" data-prop="jumpAnim" value="${ley.jumpAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Fall</label>
                        <input type="text" class="prop-input" data-component="Movement" data-prop="fallAnim" value="${ley.fallAnim || ''}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.ProjectileLauncher) {
            let warningHTML = '';
            if (ley.fireSound && !selectedMateria.getComponentByName('AudioSource')) {
                warningHTML = renderDependencyWarning('ProjectileLauncher', 'AudioSource');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('PROJECTILE_LAUNCHER_COMPONENT', "Lanzador de Proyectiles"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="inspector-row">
                        <label data-i18n="PROJECTILE_PREFAB">${L.get('PROJECTILE_PREFAB', 'Prefab Proyectil')}</label>
                        <div class="file-picker">
                            <input type="text" class="prop-input" data-component="ProjectileLauncher" data-prop="projectilePrefab" value="${ley.projectilePrefab}" placeholder="${L.get('HINT_ARRIASTRA_PREFAB', 'Arrastra un .ceprefab aquí')}">
                            <button class="panel-tool-btn" onclick="window.openAssetSelector((h, p) => { const input = this.previousElementSibling; input.value = p; input.dispatchEvent(new Event('change', { bubbles: true })); }, '.ceprefab')">...</button>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FIRE_KEY">${L.get('FIRE_KEY', 'Tecla Disparo')}</label>
                        <input type="text" class="prop-input" data-component="ProjectileLauncher" data-prop="fireKey" value="${ley.fireKey}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="FIRE_RATE">${L.get('FIRE_RATE', 'Cadencia (segs)')}</label>
                        <input type="number" class="prop-input" step="0.1" min="0" data-component="ProjectileLauncher" data-prop="fireRate" value="${ley.fireRate}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPEED">${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" class="prop-input" step="1" data-component="ProjectileLauncher" data-prop="projectileSpeed" value="${ley.projectileSpeed}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="ProjectileLauncher" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="ProjectileLauncher" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                        </div>
                    </div>
                     <div class="prop-row-multi">
                        <label data-i18n="DIRECTION">${L.get('DIRECTION', 'Dirección')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="ProjectileLauncher" data-prop="direction.x" value="${ley.direction.x}" title="X">
                            <input type="number" class="prop-input" step="0.1" data-component="ProjectileLauncher" data-prop="direction.y" value="${ley.direction.y}" title="Y">
                        </div>
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="FIRE_SOUND">${L.get('FIRE_SOUND', 'Sonido Disparo')}</label>
                        ${renderPropertyDropper('Audio', ley.fireSound, 'data-component="ProjectileLauncher" data-prop="fireSound"')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.AutoDestroy) {
            componentHTML = `
                ${renderComponentHeader(L.get('AUTO_DESTROY_COMPONENT', "Destrucción Automática"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="DELAY_SECS">${L.get('DELAY_SECS', 'Retraso (segs)')}</label>
                        <input type="number" class="prop-input" step="0.1" min="0" data-component="AutoDestroy" data-prop="delay" value="${ley.delay}">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.CameraFollow) {
             componentHTML = `
                ${renderComponentHeader(L.get('CAMERA_FOLLOW_COMPONENT', "Seguimiento Cámara"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="TARGET">${L.get('TARGET', 'Objetivo')}</label>
                        ${renderPropertyDropper('Materia', ley.target, 'data-component="CameraFollow" data-prop="target"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SMOOTHNESS">${L.get('SMOOTHNESS', 'Suavidad')}</label>
                        <input type="number" class="prop-input" step="0.01" min="0" max="1" data-component="CameraFollow" data-prop="smoothness" value="${ley.smoothness}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET">${L.get('OFFSET', 'Offset')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="CameraFollow" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="CameraFollow" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                        </div>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CameraFollow" data-prop="followX" ${ley.followX ? 'checked' : ''}>
                        <label data-i18n="FOLLOW_X">${L.get('FOLLOW_X', 'Seguir X')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="CameraFollow" data-prop="followY" ${ley.followY ? 'checked' : ''}>
                        <label data-i18n="FOLLOW_Y">${L.get('FOLLOW_Y', 'Seguir Y')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.ParticleSystem) {
            componentHTML = `
                ${renderComponentHeader(L.get('PARTICLE_SYSTEM', "Sistema de Partículas"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="PARTICLE_PREFAB">${L.get('PARTICLE_PREFAB', 'Prefab Partícula')}</label>
                        ${renderPropertyDropper('Prefab', ley.prefabPath, 'data-component="ParticleSystem" data-prop="prefabPath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_PARTICLES">${L.get('MAX_PARTICLES', 'Max Partículas')}</label>
                        <input type="number" class="prop-input" step="1" min="1" data-component="ParticleSystem" data-prop="maxParticles" value="${ley.maxParticles}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="EMISSION_RATE">${L.get('EMISSION_RATE', 'Emisión (part/seg)')}</label>
                        <input type="number" class="prop-input" step="1" min="0" data-component="ParticleSystem" data-prop="emissionRate" value="${ley.emissionRate}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LIFETIME">${L.get('LIFETIME', 'Vida (seg)')}</label>
                        <input type="number" class="prop-input" step="0.1" min="0" data-component="ParticleSystem" data-prop="lifetime" value="${ley.lifetime}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPEED">${L.get('SPEED', 'Velocidad')}</label>
                        <input type="number" class="prop-input" step="1" data-component="ParticleSystem" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SPREAD">${L.get('SPREAD', 'Dispersión (spread)')}</label>
                        <input type="number" class="prop-input" step="1" min="0" max="360" data-component="ParticleSystem" data-prop="spread" value="${ley.spread}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="ParticleSystem" data-prop="loop" ${ley.loop ? 'checked' : ''}>
                        <label data-i18n="LOOP">${L.get('LOOP', 'Loop')}</label>
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="ParticleSystem" data-prop="playOnAwake" ${ley.playOnAwake ? 'checked' : ''}>
                        <label data-i18n="REPRODUCIR_AL_EMPEZAR">${L.get('REPRODUCIR_AL_EMPEZAR', 'Play On Awake')}</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Parallax) {
            componentHTML = `
                ${renderComponentHeader(L.get('PARALLAX_COMPONENT', "Parallax (Avanzado)"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="SCROLL_FACTOR">${L.get('SCROLL_FACTOR', 'Scroll Factor X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.01" data-component="Parallax" data-prop="scrollFactor.x" value="${ley.scrollFactor.x}" title="X">
                            <input type="number" class="prop-input" step="0.01" data-component="Parallax" data-prop="scrollFactor.y" value="${ley.scrollFactor.y}" title="Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="REPEAT_INFINITE">${L.get('REPEAT_INFINITE', 'Repetir (Infinito)')}</label>
                        <div class="prop-inputs" style="display: flex; align-items: center; gap: 10px; justify-content: flex-start;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="checkbox" class="prop-input" data-component="Parallax" data-prop="repeatX" ${ley.repeatX ? 'checked' : ''} id="parallax-repeat-x-${index}">
                                <label for="parallax-repeat-x-${index}" style="font-size: 10px; margin: 0;" data-i18n="HORIZONTAL">${L.get('HORIZONTAL', 'Horizontal')}</label>
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="checkbox" class="prop-input" data-component="Parallax" data-prop="repeatY" ${ley.repeatY ? 'checked' : ''} id="parallax-repeat-y-${index}">
                                <label for="parallax-repeat-y-${index}" style="font-size: 10px; margin: 0;" data-i18n="VERTICAL">${L.get('VERTICAL', 'Vertical')}</label>
                            </div>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MIRRORING_XY">${L.get('MIRRORING_XY', 'Mirroring X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Parallax" data-prop="mirroring.x" value="${ley.mirroring.x}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="Parallax" data-prop="mirroring.y" value="${ley.mirroring.y}" title="Y">
                        </div>
                    </div>
                    <button class="panel-tool-btn" style="width:100%; margin-bottom: 8px;" data-action="parallax-match-sprite" data-ley-index="${index}" data-i18n="MATCH_MIRRORING_SPRITE">${L.get('MATCH_MIRRORING_SPRITE', 'Ajustar Mirroring al Sprite')}</button>
                    <div class="prop-row-multi">
                        <label data-i18n="OFFSET_XY">${L.get('OFFSET_XY', 'Offset X/Y')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="1" data-component="Parallax" data-prop="offset.x" value="${ley.offset.x}" title="X">
                            <input type="number" class="prop-input" step="1" data-component="Parallax" data-prop="offset.y" value="${ley.offset.y}" title="Y">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="AUTOSCROLL_XY">${L.get('AUTOSCROLL_XY', 'Autoscroll X/Y')}</label>
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
                        <label data-i18n="CANVAS_SIZE">${L.get('CANVAS_SIZE', 'Canvas Size')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Terreno2D" data-prop="width" value="${ley.width}" title="${L.get('WIDTH', 'Width')}">
                            <input type="number" class="prop-input" data-component="Terreno2D" data-prop="height" value="${ley.height}" title="${L.get('HEIGHT', 'Height')}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="BASE_COLOR">${L.get('BASE_COLOR', 'Color Base')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="Terreno2D" data-prop="baseColor" value="${ley.baseColor || '#4a4a4a'}">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_ORDER_IN_LAYER">${L.get('PROP_ORDER_IN_LAYER', 'Order in Layer')}</label>
                        <input type="number" class="prop-input" step="1" data-component="Terreno2D" data-prop="orderInLayer" value="${ley.orderInLayer || 0}">
                    </div>
                    <button class="panel-tool-btn" style="width:100%; margin-bottom: 8px;" onclick="const t = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.Terreno2D); t.maskCtx.clearRect(0,0,t.width,t.height); window.updateScene();" data-i18n="BORRAR_TODO">${L.get('BORRAR_TODO', 'Limpiar Todo')}</button>
                    <hr>
                    <h5 data-i18n="TERRAIN_BRUSH">${L.get('TERRAIN_BRUSH', 'Pincel de Terreno')}</h5>
                    <div class="prop-row-multi">
                        <label data-i18n="MODE">${L.get('MODE', 'Modo')}</label>
                        <select class="terrain-tool-input" onchange="window.TerrenoEditorWindow.setMode(this.value)">
                            <option value="draw" ${settings.mode === 'draw' ? 'selected' : ''} data-i18n="DRAW_TERRAIN">${L.get('DRAW_TERRAIN', 'Dibujar Terreno')}</option>
                            <option value="erase" ${settings.mode === 'erase' ? 'selected' : ''} data-i18n="ERASE_TERRAIN">${L.get('ERASE_TERRAIN', 'Borrar Terreno')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="SIZE">${L.get('SIZE', 'Tamaño')}</label>
                        <input type="range" min="1" max="200" value="${settings.brushSize}" oninput="window.TerrenoEditorWindow.setBrushSize(this.value); this.nextElementSibling.innerText = this.value;">
                        <span style="min-width: 30px; text-align: right;">${settings.brushSize}</span>
                    </div>
                    <hr>
                    <div class="layer-manager-ui">
                        <div class="layer-list-header">
                            <h5 data-i18n="FILL_TEXTURES">${L.get('FILL_TEXTURES', 'Texturas de Relleno')}</h5>
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
                        <label data-i18n="MODE">${L.get('MODE', 'Modo')}</label>
                        <select class="prop-input inspector-re-render" data-component="TerrenoCollider2D" data-prop="mode">
                            <option value="Rectangles" ${ley.mode === 'Rectangles' ? 'selected' : ''}>${L.get('RECTANGLES_GRID', 'Rectángulos (Grilla)')}</option>
                            <option value="Polygon" ${ley.mode === 'Polygon' ? 'selected' : ''}>${L.get('POLYGON_EXACT', 'Polígono (Exacto)')}</option>
                        </select>
                    </div>
                    <div class="checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="TerrenoCollider2D" data-prop="isTrigger" ${ley.isTrigger ? 'checked' : ''}>
                        <label data-i18n="IS_TRIGGER">${L.get('IS_TRIGGER', 'Is Trigger')}</label>
                    </div>
                    <div class="prop-row-multi" style="display: ${isPolygon ? 'none' : 'flex'};">
                        <label data-i18n="RESOLUTION">${L.get('RESOLUTION', 'Resolución')}</label>
                        <input type="number" class="prop-input" step="1" min="4" max="64" data-component="TerrenoCollider2D" data-prop="resolution" value="${ley.resolution || 16}">
                    </div>
                    <div class="prop-row-multi" style="display: ${isPolygon ? 'flex' : 'none'};">
                        <label data-i18n="SIMPLICITY">${L.get('SIMPLICITY', 'Simplicidad')}</label>
                        <input type="number" class="prop-input" step="0.5" min="0" data-component="TerrenoCollider2D" data-prop="simplifyTolerance" value="${ley.simplifyTolerance || 2.0}">
                    </div>
                    <p class="field-description" data-i18n="${isPolygon ? 'POLYGON_SIMPLICITY_DESC' : 'GRID_RESOLUTION_DESC'}">${isPolygon ? L.get('POLYGON_SIMPLICITY_DESC', 'Mayor simplicidad = menos puntos en el polígono.') : L.get('GRID_RESOLUTION_DESC', 'Cuanto menor sea la resolución, más precisos serán los rectángulos.')}</p>
                    <hr>
                    <button class="primary-btn" data-action="generate-colliders" style="width: 100%;" data-i18n="REGENERATE_COLLISIONS">${L.get('REGENERATE_COLLISIONS', 'Regenerar Colisiones')}</button>
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
                        <label data-i18n="SHOW_IN_GAME_GLOBAL">${L.get('SHOW_IN_GAME_GLOBAL', 'Mostrar en Juego (Global)')}</label>
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
                                        <label data-i18n="POS_XY">${L.get('POS_XY', 'Pos (X/Y)')}</label>
                                        <div class="prop-inputs">
                                            <input type="number" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.x" value="${layer.x}" title="X">
                                            <input type="number" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.y" value="${layer.y}" title="Y">
                                        </div>
                                    </div>
                                    <div class="prop-row-multi">
                                        <label data-i18n="SIZE_WH">${L.get('SIZE_WH', 'Size (W/H)')}</label>
                                        <div class="prop-inputs">
                                            <input type="number" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.width" value="${layer.width}" title="${L.get('WIDTH', 'Width')}">
                                            <input type="number" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.height" value="${layer.height}" title="${L.get('HEIGHT', 'Height')}">
                                        </div>
                                    </div>
                                    <div class="prop-row-multi">
                                        <label data-i18n="COLOR">${L.get('COLOR', 'Color')}</label>
                                        <div class="prop-inputs">
                                            <input type="color" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.color" value="${layer.color || '#00ff00'}">
                                        </div>
                                    </div>
                                    <div class="checkbox-field">
                                        <input type="checkbox" class="prop-input" data-component="Gyzmo" data-prop="layers.${lIdx}.showInGame" ${layer.showInGame ? 'checked' : ''}>
                                        <label data-i18n="VISIBLE_IN_GAME">${L.get('VISIBLE_IN_GAME', 'Visible en Juego')}</label>
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
        } else if (ley instanceof Components.PlatformEffector2D) {
            componentHTML = `
                ${renderComponentHeader(L.get('PLATFORM_EFFECTOR', "Platform Effector 2D"), 'square', index)}
                <div class="component-content">
                    <div class="effector-ui-container" style="display: flex; flex-direction: column; align-items: center; gap: 15px; padding: 10px;">
                        <div class="effector-square-preview" style="position: relative; width: 100px; height: 100px; background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.1);">
                            <!-- Top Edge -->
                            <div class="effector-edge top ${ley.blockUp ? 'blocked' : 'passable'}"
                                 data-action="toggle-effector-edge" data-edge="blockUp" data-ley-index="${index}"
                                 style="position: absolute; top: -4px; left: 0; width: 100%; height: 8px; cursor: pointer; transition: background 0.2s;"></div>
                            <!-- Bottom Edge -->
                            <div class="effector-edge bottom ${ley.blockDown ? 'blocked' : 'passable'}"
                                 data-action="toggle-effector-edge" data-edge="blockDown" data-ley-index="${index}"
                                 style="position: absolute; bottom: -4px; left: 0; width: 100%; height: 8px; cursor: pointer; transition: background 0.2s;"></div>
                            <!-- Left Edge -->
                            <div class="effector-edge left ${ley.blockLeft ? 'blocked' : 'passable'}"
                                 data-action="toggle-effector-edge" data-edge="blockLeft" data-ley-index="${index}"
                                 style="position: absolute; top: 0; left: -4px; width: 8px; height: 100%; cursor: pointer; transition: background 0.2s;"></div>
                            <!-- Right Edge -->
                            <div class="effector-edge right ${ley.blockRight ? 'blocked' : 'passable'}"
                                 data-action="toggle-effector-edge" data-edge="blockRight" data-ley-index="${index}"
                                 style="position: absolute; top: 0; right: -4px; width: 8px; height: 100%; cursor: pointer; transition: background 0.2s;"></div>

                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.7em; opacity: 0.5; text-align: center; pointer-events: none;">
                                ${L.get('CLICK_EDGES', 'Click edges to toggle')}
                            </div>
                        </div>

                        <div style="width: 100%;">
                            <div class="checkbox-field">
                                <input type="checkbox" class="prop-input" data-component="PlatformEffector2D" data-prop="useOneWay" ${ley.useOneWay ? 'checked' : ''}>
                                <label data-i18n="USE_ONE_WAY">${L.get('USE_ONE_WAY', 'Use One Way')}</label>
                            </div>
                            <div class="prop-row-multi">
                                <label data-i18n="SURFACE_ARC">${L.get('SURFACE_ARC', 'Surface Arc')}</label>
                                <input type="number" class="prop-input" data-component="PlatformEffector2D" data-prop="surfaceArc" value="${ley.surfaceArc}" min="0" max="360">
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    .effector-edge.blocked { background: #ff4444; box-shadow: 0 0 5px #ff4444; z-index: 2; }
                    .effector-edge.passable { background: #44ff44; opacity: 0.3; z-index: 1; }
                    .effector-edge:hover { opacity: 1 !important; filter: brightness(1.2); }
                </style>
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
        } else if (ley instanceof Components.Suspension) {
            componentHTML = `
                ${renderComponentHeader(L.get('SUSPENSION', "Suspensión"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="CHASSIS">${L.get('CHASSIS', 'Chasis')}</label>
                        ${renderPropertyDropper('Materia', ley.chasis, 'data-component="Suspension" data-prop="chasis"')}
                    </div>
                    <div class="inspector-section-header"><span data-i18n="SPRING_SETTINGS">${L.get('SPRING_SETTINGS', 'Configuración de Muelle')}</span></div>
                    <div class="prop-row-multi">
                        <label title="K" data-i18n="STIFFNESS">${L.get('STIFFNESS', 'Dureza')}</label>
                        <input type="number" class="prop-input" data-component="Suspension" data-prop="dureza" value="${ley.dureza}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="D" data-i18n="DAMPING">${L.get('DAMPING', 'Amortiguación')}</label>
                        <input type="number" class="prop-input" data-component="Suspension" data-prop="amortiguacion" value="${ley.amortiguacion}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="REST_LENGTH">${L.get('REST_LENGTH', 'Largo Reposo')}</label>
                        <input type="number" class="prop-input" data-component="Suspension" data-prop="longitudReposo" value="${ley.longitudReposo}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="CONSTRAINT_AXIS">${L.get('CONSTRAINT_AXIS', 'Eje (Local)')}</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" data-component="Suspension" data-prop="eje.x" value="${ley.eje.x}" title="X">
                            <input type="number" class="prop-input" data-component="Suspension" data-prop="eje.y" value="${ley.eje.y}" title="Y">
                        </div>
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Susp</label>
                        ${renderPropertyDropper('Audio', ley.suspensionSound, 'data-component="Suspension" data-prop="suspensionSound"')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.VehicleSideView2D) {
            componentHTML = `
                ${renderComponentHeader(L.get('VEHICLE_SIDE_VIEW_2D', "Vehículo Lateral 2D"), icon, index)}
                <div class="component-content">
                    <div class="inspector-section-header"><span data-i18n="WHEELS">${L.get('WHEELS', 'Ruedas')}</span></div>
                    <div class="inspector-row">
                        <p class="field-description" style="font-size: 0.8em; opacity: 0.7;">Si la lista está vacía, se detectarán automáticamente los hijos con el componente 'Suspensión'.</p>
                    </div>
                    <div class="inspector-section-header"><span data-i18n="ENGINE_SETTINGS">${L.get('ENGINE_SETTINGS', 'Configuración de Motor')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="POWER">${L.get('POWER', 'Potencia')}</label>
                        <input type="number" class="prop-input" data-component="VehicleSideView2D" data-prop="potenciaMotor" value="${ley.potenciaMotor}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_SPEED">${L.get('MAX_SPEED', 'Velocidad Máx')}</label>
                        <input type="number" class="prop-input" data-component="VehicleSideView2D" data-prop="velocidadMaxima" value="${ley.velocidadMaxima}">
                    </div>
                    <div class="prop-row">
                        <label title="Resistencia al rodamiento o freno motor (0-1)" data-i18n="MOTOR_BRAKE">${L.get('MOTOR_BRAKE', 'Freno Motor')}</label>
                        <input type="number" step="0.01" min="0" max="1" class="prop-input" data-component="VehicleSideView2D" data-prop="frenadoMotor" value="${ley.frenadoMotor}">
                    </div>
                    <div class="prop-row">
                        <label title="Controla cuánto se inclina el chasis al acelerar" data-i18n="PITCH_STRENGTH">${L.get('PITCH_STRENGTH', 'Inclinación')}</label>
                        <input type="number" step="0.1" class="prop-input" data-component="VehicleSideView2D" data-prop="fuerzaInclinacion" value="${ley.fuerzaInclinacion}">
                    </div>
                    <div class="prop-row">
                        <label title="Control manual de giro en el aire" data-i18n="AIR_TURN">${L.get('AIR_TURN', 'Giro Aire')}</label>
                        <input type="number" class="prop-input" data-component="VehicleSideView2D" data-prop="controlAire" value="${ley.controlAire}">
                    </div>
                    <div class="prop-row">
                        <label title="Estabilización automática en el aire (0-1)" data-i18n="AUTO_STABILIZE">${L.get('AUTO_STABILIZE', 'Auto-Estabilizar')}</label>
                        <input type="number" step="0.1" min="0" max="1" class="prop-input" data-component="VehicleSideView2D" data-prop="estabilidadAire" value="${ley.estabilidadAire}">
                    </div>
                    <div class="prop-row">
                        <label title="Recuperación de posición horizontal en suelo (0-1)" data-i18n="GROUND_CENTERING">${L.get('GROUND_CENTERING', 'Centrado Suelo')}</label>
                        <input type="number" step="0.1" min="0" max="1" class="prop-input" data-component="VehicleSideView2D" data-prop="recuperacionGiro" value="${ley.recuperacionGiro}">
                    </div>

                    <div class="inspector-section-header"><span data-i18n="CONTROLS">${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="ACCELERATE_KEY">${L.get('ACCELERATE_KEY', 'Tecla Acelerar')}</label>
                        <input type="text" class="prop-input" data-component="VehicleSideView2D" data-prop="teclaAcelerar" value="${ley.teclaAcelerar}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="BRAKE_KEY">${L.get('BRAKE_KEY', 'Tecla Frenar')}</label>
                        <input type="text" class="prop-input" data-component="VehicleSideView2D" data-prop="teclaFrenar" value="${ley.teclaFrenar}">
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Motor</label>
                        ${renderPropertyDropper('Audio', ley.motorSound, 'data-component="VehicleSideView2D" data-prop="motorSound"')}
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.VehicleTopDown) {
            let warningHTML = '';
            if ((ley.engineSound || ley.brakeSound) && !selectedMateria.getComponentByName('AudioSource')) {
                warningHTML = renderDependencyWarning('VehicleTopDown', 'AudioSource');
            }
            if (!selectedMateria.getComponentByName('Rigidbody2D')) {
                warningHTML += renderDependencyWarning('VehicleTopDown', 'Rigidbody2D');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('VEHICLE_TOPDOWN', "Vehicle TopDown"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="VehicleTopDown" data-prop="autoAcelerar" ${ley.autoAcelerar ? 'checked' : ''}>
                        <label data-i18n="AUTO_ACCELERATE">${L.get('AUTO_ACCELERATE', 'Auto-Acelerar')}</label>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="POWER">${L.get('POWER', 'Potencia')}</label>
                        <input type="number" class="prop-input" data-component="VehicleTopDown" data-prop="potencia" value="${ley.potencia}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_SPEED">${L.get('MAX_SPEED', 'Velocidad Máx')}</label>
                        <input type="number" class="prop-input" data-component="VehicleTopDown" data-prop="velocidadMaxima" value="${ley.velocidadMaxima}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TURN_SPEED">${L.get('TURN_SPEED', 'Velocidad Giro')}</label>
                        <input type="number" class="prop-input" data-component="VehicleTopDown" data-prop="velocidadGiro" value="${ley.velocidadGiro}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="0: Agarre total, 1: Hielo" data-i18n="DRIFT_INTENSITY">${L.get('DRIFT_INTENSITY', 'Intensidad Derrape')}</label>
                        <div class="prop-inputs">
                            <input type="range" class="prop-input" data-component="VehicleTopDown" data-prop="intensidadDerrape" value="${ley.intensidadDerrape}" min="0" max="1" step="0.01" style="flex-grow: 1;">
                            <span style="min-width: 30px; text-align: right;">${Math.round(ley.intensidadDerrape * 100)}%</span>
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MOTOR_BRAKE">${L.get('MOTOR_BRAKE', 'Freno Motor')}</label>
                        <input type="number" step="0.01" min="0" max="1" class="prop-input" data-component="VehicleTopDown" data-prop="frenadoMotor" value="${ley.frenadoMotor}">
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Motor</label>
                        ${renderPropertyDropper('Audio', ley.engineSound, 'data-component="VehicleTopDown" data-prop="engineSound"')}
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Freno</label>
                        ${renderPropertyDropper('Audio', ley.brakeSound, 'data-component="VehicleTopDown" data-prop="brakeSound"')}
                    </div>

                    <div class="inspector-section-header"><span>${L.get('ANIMATIONS', 'Animaciones')}</span></div>
                    <div class="prop-row-multi">
                        <label>Idle</label>
                        <input type="text" class="prop-input" data-component="VehicleTopDown" data-prop="idleAnim" value="${ley.idleAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Drive</label>
                        <input type="text" class="prop-input" data-component="VehicleTopDown" data-prop="driveAnim" value="${ley.driveAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Reverse</label>
                        <input type="text" class="prop-input" data-component="VehicleTopDown" data-prop="reverseAnim" value="${ley.reverseAnim || ''}">
                    </div>

                    <div class="inspector-section-header"><span data-i18n="CONTROLS">${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_LEFT_RIGHT">${L.get('KEYS_LEFT_RIGHT', 'Giro (Izq/Der)')}</label>
                        <div class="prop-inputs">
                            <input type="text" class="prop-input" data-component="VehicleTopDown" data-prop="teclaIzquierda" value="${ley.teclaIzquierda}" title="Izquierda">
                            <input type="text" class="prop-input" data-component="VehicleTopDown" data-prop="teclaDerecha" value="${ley.teclaDerecha}" title="Derecha">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_ACCEL_BRAKE">${L.get('KEYS_ACCEL_BRAKE', 'Acel/Freno')}</label>
                        <div class="prop-inputs">
                            <input type="text" class="prop-input" data-component="VehicleTopDown" data-prop="teclaAcelerar" value="${ley.teclaAcelerar}" title="Acelerar">
                            <input type="text" class="prop-input" data-component="VehicleTopDown" data-prop="teclaFrenar" value="${ley.teclaFrenar}" title="Frenar">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.PlaneController) {
            let warningHTML = '';
            if ((ley.engineSound || ley.takeoffSound) && !selectedMateria.getComponentByName('AudioSource')) {
                warningHTML = renderDependencyWarning('PlaneController', 'AudioSource');
            }
            if (!selectedMateria.getComponentByName('Rigidbody2D')) {
                warningHTML += renderDependencyWarning('PlaneController', 'Rigidbody2D');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('PLANE_CONTROLLER', "Plane Controller"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="inspector-section-header"><span data-i18n="FLIGHT_SETTINGS">${L.get('FLIGHT_SETTINGS', 'Configuración de Vuelo')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="THRUST">${L.get('THRUST', 'Potencia Motor')}</label>
                        <input type="number" class="prop-input" data-component="PlaneController" data-prop="potenciaMotor" value="${ley.potenciaMotor}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_SPEED">${L.get('MAX_SPEED', 'Velocidad Máx')}</label>
                        <input type="number" class="prop-input" data-component="PlaneController" data-prop="velocidadMaxima" value="${ley.velocidadMaxima}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="Velocidad necesaria para empezar a subir" data-i18n="TAKEOFF_SPEED">${L.get('TAKEOFF_SPEED', 'Velocidad Despegue')}</label>
                        <input type="number" class="prop-input" data-component="PlaneController" data-prop="velocidadDespegue" value="${ley.velocidadDespegue}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="Multiplicador de fuerza ascendente" data-i18n="LIFT_FORCE">${L.get('LIFT_FORCE', 'Sustentación')}</label>
                        <input type="number" step="0.1" class="prop-input" data-component="PlaneController" data-prop="fuerzaSustentacion" value="${ley.fuerzaSustentacion}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TURN_AGILITY">${L.get('TURN_AGILITY', 'Agilidad Giro')}</label>
                        <input type="number" class="prop-input" data-component="PlaneController" data-prop="agilidadGiro" value="${ley.agilidadGiro}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="Resistencia al aire (0-1)" data-i18n="AIR_DRAG">${L.get('AIR_DRAG', 'Arrastre Aire')}</label>
                        <input type="number" step="0.01" min="0" max="1" class="prop-input" data-component="PlaneController" data-prop="arrastreAire" value="${ley.arrastreAire}">
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Motor</label>
                        ${renderPropertyDropper('Audio', ley.engineSound, 'data-component="PlaneController" data-prop="engineSound"')}
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Despegue</label>
                        ${renderPropertyDropper('Audio', ley.takeoffSound, 'data-component="PlaneController" data-prop="takeoffSound"')}
                    </div>

                    <div class="inspector-section-header"><span>${L.get('ANIMATIONS', 'Animaciones')}</span></div>
                    <div class="prop-row-multi">
                        <label>Idle</label>
                        <input type="text" class="prop-input" data-component="PlaneController" data-prop="idleAnim" value="${ley.idleAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Fly</label>
                        <input type="text" class="prop-input" data-component="PlaneController" data-prop="flyAnim" value="${ley.flyAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Ground</label>
                        <input type="text" class="prop-input" data-component="PlaneController" data-prop="groundAnim" value="${ley.groundAnim || ''}">
                    </div>

                    <div class="inspector-section-header"><span data-i18n="CONTROLS">${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_POWER_BRAKE">${L.get('KEYS_POWER_BRAKE', 'Potencia/Freno')}</label>
                        <div class="prop-inputs">
                            <input type="text" class="prop-input" data-component="PlaneController" data-prop="teclaPotencia" value="${ley.teclaPotencia}" title="Potencia">
                            <input type="text" class="prop-input" data-component="PlaneController" data-prop="teclaFreno" value="${ley.teclaFreno}" title="Freno">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEY_BRAKE_SPACE">${L.get('KEY_BRAKE_SPACE', 'Freno (Espacio)')}</label>
                        <input type="text" class="prop-input" data-component="PlaneController" data-prop="teclaBotonFreno" value="${ley.teclaBotonFreno}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_PITCH">${L.get('KEYS_PITCH', 'Inclinación (Nariz)')}</label>
                        <div class="prop-inputs">
                            <input type="text" class="prop-input" data-component="PlaneController" data-prop="teclaNarizArriba" value="${ley.teclaNarizArriba}" title="Arriba">
                            <input type="text" class="prop-input" data-component="PlaneController" data-prop="teclaNarizAbajo" value="${ley.teclaNarizAbajo}" title="Abajo">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.HelicopterController) {
            let warningHTML = '';
            if (ley.engineSound && !selectedMateria.getComponentByName('AudioSource')) {
                warningHTML = renderDependencyWarning('HelicopterController', 'AudioSource');
            }
            if (!selectedMateria.getComponentByName('Rigidbody2D')) {
                warningHTML += renderDependencyWarning('HelicopterController', 'Rigidbody2D');
            }

            componentHTML = `
                ${renderComponentHeader(L.get('HELICOPTER_CONTROLLER', "Helicopter Controller"), icon, index)}
                <div class="component-content">
                    ${warningHTML}
                    <div class="inspector-section-header"><span data-i18n="HELICOPTER_SETTINGS">${L.get('HELICOPTER_SETTINGS', 'Configuración de Helicóptero')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="MOTOR_POWER">${L.get('MOTOR_POWER', 'Potencia Motor')}</label>
                        <input type="number" class="prop-input" data-component="HelicopterController" data-prop="potenciaMotor" value="${ley.potenciaMotor}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="Fuerza base de sustentación" data-i18n="TAKEOFF_POWER">${L.get('TAKEOFF_POWER', 'Potencia Despegue')}</label>
                        <input type="number" class="prop-input" data-component="HelicopterController" data-prop="potenciaDespegue" value="${ley.potenciaDespegue}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="MAX_SPEED">${L.get('MAX_SPEED', 'Velocidad Máx')}</label>
                        <input type="number" class="prop-input" data-component="HelicopterController" data-prop="velocidadMaxima" value="${ley.velocidadMaxima}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TURN_AGILITY">${L.get('TURN_AGILITY', 'Agilidad Giro')}</label>
                        <input type="number" class="prop-input" data-component="HelicopterController" data-prop="agilidadGiro" value="${ley.agilidadGiro}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input inspector-re-render" data-component="HelicopterController" data-prop="autoEstabilizar" ${ley.autoEstabilizar ? 'checked' : ''}>
                        <label data-i18n="AUTO_STABILIZE">${L.get('AUTO_STABILIZE', 'Auto-Estabilizar')}</label>
                    </div>
                    <div class="prop-row-multi" style="display: ${ley.autoEstabilizar ? 'flex' : 'none'};">
                        <label title="Fuerza de auto-nivelación" data-i18n="STABILITY">${L.get('STABILITY', 'Estabilidad')}</label>
                        <input type="number" step="0.1" class="prop-input" data-component="HelicopterController" data-prop="estabilidad" value="${ley.estabilidad}">
                    </div>
                    <div class="prop-row-multi">
                        <label title="Resistencia al aire (0-1)" data-i18n="AIR_DRAG">${L.get('AIR_DRAG', 'Arrastre Aire')}</label>
                        <input type="number" step="0.01" min="0" max="1" class="prop-input" data-component="HelicopterController" data-prop="arrastreAire" value="${ley.arrastreAire}">
                    </div>
                    <div class="inspector-row">
                        <label>Sonido Motor</label>
                        ${renderPropertyDropper('Audio', ley.engineSound, 'data-component="HelicopterController" data-prop="engineSound"')}
                    </div>

                    <div class="inspector-section-header"><span>${L.get('ANIMATIONS', 'Animaciones')}</span></div>
                    <div class="prop-row-multi">
                        <label>Idle</label>
                        <input type="text" class="prop-input" data-component="HelicopterController" data-prop="idleAnim" value="${ley.idleAnim || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label>Fly</label>
                        <input type="text" class="prop-input" data-component="HelicopterController" data-prop="flyAnim" value="${ley.flyAnim || ''}">
                    </div>

                    <div class="inspector-section-header"><span data-i18n="CONTROLS">${L.get('CONTROLS', 'Controles')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_THRUST_DESCEND">${L.get('KEYS_THRUST_DESCEND', 'Subir/Bajar')}</label>
                        <div class="prop-inputs">
                            <input type="text" class="prop-input" data-component="HelicopterController" data-prop="teclaPotencia" value="${ley.teclaPotencia}" title="Subir">
                            <input type="text" class="prop-input" data-component="HelicopterController" data-prop="teclaDescenso" value="${ley.teclaDescenso}" title="Bajar">
                        </div>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="KEYS_TURN">${L.get('KEYS_TURN', 'Girar (A/D)')}</label>
                        <div class="prop-inputs">
                            <input type="text" class="prop-input" data-component="HelicopterController" data-prop="teclaGiroIzquierda" value="${ley.teclaGiroIzquierda}" title="Izquierda">
                            <input type="text" class="prop-input" data-component="HelicopterController" data-prop="teclaGiroDerecha" value="${ley.teclaGiroDerecha}" title="Derecha">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.Bone) {
            componentHTML = `
                ${renderComponentHeader(L.get('BONE', "Hueso"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="LONGITUD">${L.get('LONGITUD', 'Longitud')}</label>
                        <input type="number" class="prop-input" data-component="Bone" data-prop="length" value="${ley.length}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="GROSOR">${L.get('GROSOR', 'Grosor')}</label>
                        <input type="number" class="prop-input" data-component="Bone" data-prop="thickness" value="${ley.thickness}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_COLOR">${L.get('PROP_COLOR', 'Color')}</label>
                        <div class="prop-inputs">
                            <input type="color" class="prop-input" data-component="Bone" data-prop="color" value="${ley.color || '#00ff00'}">
                            <input type="text" class="prop-input hex-input" data-component="Bone" data-prop="color" value="${ley.color || '#00ff00'}" style="flex-grow: 1; font-family: monospace;">
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.SkeletonRenderer) {
            componentHTML = `
                ${renderComponentHeader(L.get('SKELETON_RENDERER', "Esqueleto"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="IMAGEN">${L.get('IMAGEN', 'Imagen')}</label>
                        ${renderPropertyDropper('Sprite', ley.source, 'data-component="SkeletonRenderer" data-prop="source"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="PROP_OPACITY">${L.get('PROP_OPACITY', 'Opacidad')}</label>
                        <input type="range" class="prop-input" data-component="SkeletonRenderer" data-prop="opacity" value="${ley.opacity}" min="0" max="1" step="0.01">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="VERTICES">${L.get('VERTICES', 'Vértices')}</label>
                        <span class="field-value">${ley.mesh.vertices.length / 2}</span>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="HUESOS_ASIGNADOS">${L.get('HUESOS_ASIGNADOS', 'Huesos Asignados')}</label>
                        <span class="field-value">${ley.bones.length}</span>
                    </div>
                    <button class="panel-tool-btn" style="width:100%; margin-top: 8px;" onclick="const s = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.SkeletonRenderer); s.bones = window.SceneManager.currentScene.getAllMaterias().filter(m => m.getComponentByName('Bone')).map(m => m.name || m.id); window.updateInspector();" data-i18n="AUTO_ASIGNAR_HUESOS">${L.get('AUTO_ASIGNAR_HUESOS', 'Auto-Asignar Huesos')}</button>
                    <p class="field-description" data-i18n="AUTO_ASIGNAR_HUESOS_DESC">${L.get('AUTO_ASIGNAR_HUESOS_DESC', 'Asigna automáticamente todos los objetos con componente \'Bone\' de la escena a este renderizador.')}</p>
                    <hr>
                    <button class="primary-btn" style="width:100%;" onclick="const s = window.SceneManager.currentScene.findMateriaById(${selectedMateria.id}).getComponent(window.Components.SkeletonRenderer); const scene = window.SceneManager.currentScene; s.bindPoses = s.bones.map(key => { let b; if(typeof key === 'number') b = scene.findMateriaById(key); else b = s.materia.findChildByName(key, true); if(!b) return null; const t = b.getComponentByName('Transform'); return { x: t.x, y: t.y, rotation: t.rotation, scale: { ...t.scale } }; }); window.Dialogs.showNotification(window.Localization.get('EXITO', 'Éxito'), window.Localization.get('POSE_CAPTURADA', 'Pose base capturada.'));" data-i18n="CAPTURAR_POSE_BASE">${L.get('CAPTURAR_POSE_BASE', 'Capturar Pose Base (Bind Pose)')}</button>
                    <hr>
                    <div class="weight-painter-ui">
                        <button class="panel-tool-btn ${window.SceneView?.getActiveTool() === 'weight-painter' ? 'active' : ''}" style="width: 100%; margin-bottom: 10px;" onclick="const tool = window.SceneView.getActiveTool() === 'weight-painter' ? 'move' : 'weight-painter'; window.SceneView.setActiveTool(tool); window.updateInspector();">
                            ${window.SceneView?.getActiveTool() === 'weight-painter' ? L.get('DETENER_PINTADO', 'Detener Pintado') : L.get('PINTAR_PESOS', 'Pintar Pesos')}
                        </button>
                        <div class="prop-row-multi">
                            <label data-i18n="HUESO">${L.get('HUESO', 'Hueso')}</label>
                            <select class="prop-input" onchange="window.WeightPainter.selectedBone = this.value;">
                                <option value="">-- ${L.get('SELECCIONAR', 'Seleccionar')} --</option>
                                ${ley.bones.map(b => `<option value="${b}" ${window.WeightPainter?.selectedBone === b ? 'selected' : ''}>${b}</option>`).join('')}
                            </select>
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="SIZE">${L.get('SIZE', 'Tamaño')}</label>
                            <input type="range" min="1" max="200" value="${window.WeightPainter?.brushSize || 50}" oninput="window.WeightPainter.brushSize = parseFloat(this.value); this.nextElementSibling.innerText = this.value;">
                            <span style="min-width: 30px; text-align: right;">${window.WeightPainter?.brushSize || 50}</span>
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="FUERZA">${L.get('FUERZA', 'Fuerza')}</label>
                            <input type="range" min="0" max="1" step="0.01" value="${window.WeightPainter?.strength || 0.5}" oninput="window.WeightPainter.strength = parseFloat(this.value); this.nextElementSibling.innerText = Math.round(this.value * 100) + '%';">
                            <span style="min-width: 30px; text-align: right;">${Math.round((window.WeightPainter?.strength || 0.5) * 100)}%</span>
                        </div>
                        <div class="prop-row-multi">
                            <label data-i18n="MODO">${L.get('MODO', 'Modo')}</label>
                            <select class="prop-input" onchange="window.WeightPainter.mode = this.value;">
                                <option value="add" ${window.WeightPainter?.mode === 'add' ? 'selected' : ''} data-i18n="ANADIR">${L.get('ANADIR', 'Añadir')}</option>
                                <option value="subtract" ${window.WeightPainter?.mode === 'subtract' ? 'selected' : ''} data-i18n="RESTAR">${L.get('RESTAR', 'Restar')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.IKManager2D) {
            componentHTML = `
                ${renderComponentHeader(L.get('IK_MANAGER_2D', "IK Manager 2D"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="OBJETIVO_TARGET">${L.get('OBJETIVO_TARGET', 'Objetivo (Target)')}</label>
                        ${renderPropertyDropper('Materia', ley.target, 'data-component="IKManager2D" data-prop="target"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="LARGO_CADENA">${L.get('LARGO_CADENA', 'Largo Cadena')}</label>
                        <input type="number" class="prop-input" data-component="IKManager2D" data-prop="chainLength" value="${ley.chainLength}" min="1">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ITERACIONES">${L.get('ITERACIONES', 'Iteraciones')}</label>
                        <input type="number" class="prop-input" data-component="IKManager2D" data-prop="iterations" value="${ley.iterations}" min="1">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TOLERANCIA">${L.get('TOLERANCIA', 'Tolerancia')}</label>
                        <input type="number" class="prop-input" data-component="IKManager2D" data-prop="tolerance" value="${ley.tolerance}" step="0.01" min="0.01">
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.SceneLoader) {
            componentHTML = `
                ${renderComponentHeader(L.get('SCENE_LOADER', "Cargar Escena"), icon, index)}
                <div class="component-content">
                    <div class="inspector-row">
                        <label data-i18n="SCENE_PATH">${L.get('SCENE_PATH', 'Ruta de Escena')}</label>
                        ${renderPropertyDropper('Scene', ley.scenePath, 'data-component="SceneLoader" data-prop="scenePath"')}
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TRIGGER_TAG">${L.get('TRIGGER_TAG', 'Tag Activador')}</label>
                        <input type="text" class="prop-input" data-component="SceneLoader" data-prop="triggerTag" value="${ley.triggerTag || ''}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="TRIGGER_KEY">${L.get('TRIGGER_KEY', 'Tecla Activadora')}</label>
                        <input type="text" class="prop-input" data-component="SceneLoader" data-prop="triggerKey" value="${ley.triggerKey || ''}">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="BUTTON_MATERIA">${L.get('BUTTON_MATERIA', 'Materia Botón')}</label>
                        ${renderPropertyDropper('Materia', ley.buttonMateria, 'data-component="SceneLoader" data-prop="buttonMateria"')}
                    </div>
                    <p class="field-description">${L.get('SCENE_LOADER_DESC', 'Carga una escena cuando el jugador colisiona, se presiona una tecla o se clica en el botón asignado.')}</p>
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
                            <option value="Fighter" ${ley.movementType === 'Fighter' ? 'selected' : ''} data-i18n="FIGHTER">${L.get('FIGHTER', 'Fighter (Smash)')}</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="VELOCIDAD">${L.get('VELOCIDAD', 'Velocidad')}</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="speed" value="${ley.speed}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="STOP_DISTANCE">${L.get('STOP_DISTANCE', 'Distancia Parada')}</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="stopDistance" value="${ley.stopDistance}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="ATTACK_DISTANCE">${L.get('ATTACK_DISTANCE', 'Distancia Ataque')}</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="attackDistance" value="${ley.attackDistance}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="JUMP_FORCE">${L.get('JUMP_FORCE', 'Fuerza Salto')}</label>
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
                    <div class="inspector-section-header"><span data-i18n="STEERING_RAYS">${L.get('STEERING_RAYS', 'Steering (Rayos)')}</span></div>
                    <div class="prop-row-multi">
                        <label data-i18n="RAY_COUNT">${L.get('RAY_COUNT', 'Num Rayos')}</label>
                        <input type="number" class="prop-input" data-component="BasicAI" data-prop="rayCount" value="${ley.rayCount}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="RAY_SPREAD">${L.get('RAY_SPREAD', 'Apertura Rayos')}</label>
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
                        <input type="text" class="prop-input" data-component="BasicAI" data-prop="detectionTagsString" value="${(ley.detectionTags || []).join(', ')}" placeholder="${L.get('DETECTION_TAGS_HINT', 'Player, Enemy...')}">
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
        } else if (ley instanceof Components.MeshRenderer3D) {
            componentHTML = `
                ${renderComponentHeader(L.get('MESH_RENDERER_3D', "Mesh Renderer 3D"), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="MESH_TYPE">Tipo de Malla</label>
                        <select class="prop-input" data-component="MeshRenderer3D" data-prop="meshType">
                            <option value="Cube" ${ley.meshType === 'Cube' ? 'selected' : ''}>Cubo</option>
                            <option value="Sphere" ${ley.meshType === 'Sphere' ? 'selected' : ''}>Esfera</option>
                            <option value="Plane" ${ley.meshType === 'Plane' ? 'selected' : ''}>Plano</option>
                        </select>
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="COLOR">Color</label>
                        <input type="color" class="prop-input" data-component="MeshRenderer3D" data-prop="color" value="${ley.color}">
                    </div>
                    <div class="checkbox-field padded-checkbox-field">
                        <input type="checkbox" class="prop-input" data-component="MeshRenderer3D" data-prop="isUnlit" ${ley.isUnlit ? 'checked' : ''}>
                        <label data-i18n="UNLIT">Sin Luces (Unlit)</label>
                    </div>
                </div>
            `;
        } else if (ley instanceof Components.DirectionalLight3D || ley instanceof Components.PointLight3D || ley instanceof Components.SpotLight3D) {
            const isDir = ley instanceof Components.DirectionalLight3D;
            const isSpot = ley instanceof Components.SpotLight3D;
            const type = isDir ? 'DirectionalLight3D' : (isSpot ? 'SpotLight3D' : 'PointLight3D');

            componentHTML = `
                ${renderComponentHeader(L.get(type.toUpperCase(), type), icon, index)}
                <div class="component-content">
                    <div class="prop-row-multi">
                        <label data-i18n="COLOR">Color</label>
                        <input type="color" class="prop-input" data-component="${type}" data-prop="color" value="${ley.color}">
                    </div>
                    <div class="prop-row-multi">
                        <label data-i18n="INTENSITY">Intensidad</label>
                        <input type="number" class="prop-input" step="0.1" data-component="${type}" data-prop="intensity" value="${ley.intensity}">
                    </div>
                    ${isDir ? `
                    <div class="prop-row-multi">
                        <label data-i18n="DIRECTION">Dirección</label>
                        <div class="prop-inputs">
                            <input type="number" class="prop-input" step="0.1" data-component="${type}" data-prop="direction.x" value="${ley.direction.x}">
                            <input type="number" class="prop-input" step="0.1" data-component="${type}" data-prop="direction.y" value="${ley.direction.y}">
                            <input type="number" class="prop-input" step="0.1" data-component="${type}" data-prop="direction.z" value="${ley.direction.z}">
                        </div>
                    </div>
                    ` : `
                    <div class="prop-row-multi">
                        <label data-i18n="RANGE">Rango</label>
                        <input type="number" class="prop-input" data-component="${type}" data-prop="range" value="${ley.range}">
                    </div>
                    `}
                    ${isSpot ? `
                    <div class="prop-row-multi">
                        <label data-i18n="ANGLE">Ángulo</label>
                        <input type="number" class="prop-input" data-component="${type}" data-prop="angle" value="${ley.angle}">
                    </div>
                    ` : ''}
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
        } catch (e) {
            console.error(`Error rendering component ${index}:`, e);
            const errorWrapper = document.createElement('div');
            errorWrapper.className = 'component-inspector error';
            errorWrapper.innerHTML = `<div class="component-header"><h4>Error: ${ley.constructor.name}</h4></div><div class="component-content"><p>Error rendering this component. Check console for details.</p></div>`;
            componentsWrapper.appendChild(errorWrapper);
        }
    });

    dom.inspectorContent.appendChild(componentsWrapper);

    const addComponentBtn = document.createElement('button');
    addComponentBtn.id = 'add-component-btn';
    addComponentBtn.className = 'add-component-btn';
    addComponentBtn.dataset.i18n = 'ADD_LEY';
    addComponentBtn.textContent = L.get('ADD_LEY', 'Añadir Ley');
    dom.inspectorContent.appendChild(addComponentBtn);
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
        const L = window.Localization;
        const dirHandle = currentDirectoryHandle();
        if (!dirHandle) {
            dom.inspectorContent.innerHTML = `<p class="inspector-placeholder error-message">Directorio de assets no disponible</p>`;
            return;
        }

        const fileHandle = await dirHandle.getFileHandle(assetName);
        const file = await fileHandle.getFile();
        const lowerName = assetName.toLowerCase();

        if (lowerName.endsWith('.ceprefab')) {
            const content = await file.text();
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
            sectionHierarchy.innerHTML = `<label data-i18n="STRUCTURE">${L.get('STRUCTURE', 'Estructura')}</label>`;
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
            sectionComponents.innerHTML = `<label data-i18n="ROOT_COMPONENTS">${L.get('ROOT_COMPONENTS', 'Componentes (Objeto Raíz)')}</label>`;
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

        } else if (lowerName.endsWith('.ces') || lowerName.endsWith('.txt')) {
            const content = await file.text();
            const pre = document.createElement('pre');
            pre.style.maxHeight = '400px';
            pre.style.overflow = 'auto';
            pre.style.background = '#1a1a1a';
            pre.style.padding = '10px';
            pre.style.borderRadius = '4px';
            const code = document.createElement('code');
            code.className = lowerName.endsWith('.ces') ? 'language-javascript' : '';
            code.textContent = content;
            pre.appendChild(code);
            dom.inspectorContent.appendChild(pre);
        } else if (lowerName.endsWith('.md')) {
            const content = await file.text();
            const html = markdownConverter.makeHtml(content);
            const preview = document.createElement('div');
            preview.className = 'markdown-preview';
            preview.innerHTML = html;
            dom.inspectorContent.appendChild(preview);
        } else if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
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
                    <label for="texture-type" data-i18n="TEXTURE_TYPE">${L.get('TEXTURE_TYPE', 'Texture Type')}</label>
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
                            <label for="sprite-mode" data-i18n="SPRITE_MODE">${L.get('SPRITE_MODE', 'Sprite Mode')}</label>
                            <select id="sprite-mode" class="inspector-re-render-asset">
                                <option value="Single" ${metaData.spriteMode === 'Single' ? 'selected' : ''} data-i18n="SINGLE">${L.get('SINGLE', 'Single')}</option>
                                <option value="Multiple" ${metaData.spriteMode === 'Multiple' ? 'selected' : ''} data-i18n="MULTIPLE">${L.get('MULTIPLE', 'Multiple')}</option>
                            </select>
                        </div>

                        <div class="inspector-row">
                            <label for="pixels-per-unit" data-i18n="PIXELS_PER_UNIT">${L.get('PIXELS_PER_UNIT', 'Pixels Per Unit')}</label>
                            <input type="number" id="pixels-per-unit" value="${metaData.pixelsPerUnit}">
                        </div>

                        <div class="inspector-row">
                            <label for="mesh-type" data-i18n="MESH_TYPE">${L.get('MESH_TYPE', 'Mesh Type')}</label>
                            <select id="mesh-type">
                                <option value="Full Rect" ${metaData.meshType === 'Full Rect' ? 'selected' : ''} data-i18n="FULL_RECT">Full Rect</option>
                                <option value="Tight" ${metaData.meshType === 'Tight' ? 'selected' : ''} data-i18n="TIGHT">Tight</option>
                            </select>
                        </div>

                        <div class="inspector-row">
                            <label for="texture-tag" data-i18n="TAG">${L.get('TAG', 'Tag')}</label>
                            <input type="text" id="texture-tag" value="${metaData.tag}" placeholder="${L.get('UNTAGGED', 'Untagged')}">
                        </div>

                        <hr>

                        <div id="sprite-editor-btn-container" class="${metaData.spriteMode !== 'Multiple' ? 'hidden' : ''}">
                             <button id="sprite-editor-btn" class="primary-btn" style="width: 100%;" data-i18n="SPRITE_EDITOR">Sprite Editor</button>
                        </div>
                    </fieldset>

                    <fieldset class="inspector-section">
                        <legend data-i18n="ADVANCED">${L.get('ADVANCED', 'Advanced')}</legend>
                        <div class="inspector-row">
                            <label for="filter-mode" data-i18n="FILTER_MODE">${L.get('FILTER_MODE', 'Filter Mode')}</label>
                            <select id="filter-mode">
                                <option value="Point" ${metaData.filterMode === 'Point' ? 'selected' : ''}>Point (no filter)</option>
                                <option value="Bilinear" ${metaData.filterMode === 'Bilinear' ? 'selected' : ''}>Bilinear</option>
                                <option value="Trilinear" ${metaData.filterMode === 'Trilinear' ? 'selected' : ''}>Trilinear</option>
                            </select>
                        </div>
                        <div class="inspector-row">
                            <label for="wrap-mode" data-i18n="WRAP_MODE">${L.get('WRAP_MODE', 'Wrap Mode')}</label>
                            <select id="wrap-mode">
                                <option value="Repeat" ${metaData.wrapMode === 'Repeat' ? 'selected' : ''}>Repeat</option>
                                <option value="Clamp" ${metaData.wrapMode === 'Clamp' ? 'selected' : ''}>Clamp</option>
                            </select>
                        </div>
                         <hr>
                        <div class="inspector-row">
                            <label for="max-size" data-i18n="MAX_SIZE">${L.get('MAX_SIZE', 'Max Size')}</label>
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
                            <label for="compression-quality" data-i18n="COMPRESSION">${L.get('COMPRESSION', 'Compression')}</label>
                            <select id="compression-quality">
                                <option value="None" ${metaData.compression === 'None' ? 'selected' : ''} data-i18n="NONE">None</option>
                                <option value="Low" ${metaData.compression === 'Low' ? 'selected' : ''} data-i18n="LOW_QUALITY">Low Quality</option>
                                <option value="Normal" ${metaData.compression === 'Normal' ? 'selected' : ''} data-i18n="NORMAL_QUALITY">Normal Quality</option>
                                <option value="High" ${metaData.compression === 'High' ? 'selected' : ''} data-i18n="HIGH_QUALITY">High Quality</option>
                            </select>
                        </div>
                    </fieldset>
                </div>

                <div id="animation-sheet-settings-container" class="${metaData.textureType !== 'Animation Sheet' ? 'hidden' : ''}">
                    <fieldset class="inspector-section">
                        <legend data-i18n="ANIMATION_PREVIEW">${L.get('ANIMATION_PREVIEW', 'Animation Preview')}</legend>
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
                        <legend data-i18n="SLICING">${L.get('SLICING', 'Slicing')}</legend>
                        <div class="inspector-row">
                            <label for="anim-columns" data-i18n="COLUMNS">${L.get('COLUMNS', 'Columns')}</label>
                            <input type="number" id="anim-columns" value="${metaData.animColumns || 1}" min="1">
                        </div>
                        <div class="inspector-row">
                            <label for="anim-rows" data-i18n="ROWS">${L.get('ROWS', 'Rows')}</label>
                            <input type="number" id="anim-rows" value="${metaData.animRows || 1}" min="1">
                        </div>
                         <button id="create-anim-asset-btn" class="primary-btn" style="width: 100%; margin-top: 10px;" data-i18n="CREATE_ANIM_ASSET">${L.get('CREATE_ANIM_ASSET', 'Crear Asset de Animación (.cea)')}</button>
                    </fieldset>
                </div>

                <button id="save-meta-btn" class="primary-btn" style="width: 100%; margin-top: 10px;" data-i18n="APPLY">${L.get('APPLY', 'Aplicar')}</button>
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
        } else if (lowerName.endsWith('.cea')) {
            let animData;
            try {
                const content = await file.text();
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

        } else if (lowerName.endsWith('.cep')) {
            try {
                const zip = await JSZip.loadAsync(file);
                const manifestFile = zip.file('manifest.json');
                if (manifestFile) {
                    const manifestContent = await manifestFile.async('string');
                    const manifestData = JSON.parse(manifestContent);

                    const packageInfo = document.createElement('div');
                    packageInfo.className = 'asset-settings';
                    packageInfo.innerHTML = `
                        <label data-i18n="PACKAGE_TYPE">${L.get('PACKAGE_TYPE', 'Tipo de Paquete')}</label>
                        <input type="text" value="${manifestData.type === 'project' ? 'Proyecto Completo' : 'Asset'}" readonly>
                        <label data-i18n="DESCRIPTION">${L.get('DESCRIPTION', 'Descripción')}</label>
                        <textarea readonly rows="5">${manifestData.description || L.get('SIN_DESCRIPCION', 'Sin descripción.')}</textarea>
                    `;
                    dom.inspectorContent.appendChild(packageInfo);
                } else {
                    dom.inspectorContent.innerHTML += `<p class="error-message">Este paquete .cep no es válido (falta manifest.json).</p>`;
                }
            } catch(e) {
                console.error("Error al leer el paquete .cep:", e);
                dom.inspectorContent.innerHTML += `<p class="error-message">No se pudo leer el archivo del paquete.</p>`;
            }

        } else if (lowerName.endsWith('.ceui')) {
            const preview = document.createElement('div');
            preview.className = 'asset-preview';
            preview.innerHTML = `
                <img src="image/Paquete.png" class="asset-preview-icon">
                <p><strong>UI Asset</strong></p>
                <p data-i18n="OPEN_UI_EDITOR_HINT">${L.get('OPEN_UI_EDITOR_HINT', 'Doble-click en el Navegador para abrir en el Editor de UI.')}</p>
            `;
            dom.inspectorContent.appendChild(preview);
        } else if (lowerName.endsWith('.ceanim')) {
            const preview = document.createElement('div');
            preview.className = 'asset-preview';
            preview.innerHTML = `
                <img src="image/animacion_controler.svg" class="asset-preview-icon">
                <p><strong>Animation Controller</strong></p>
                <p data-i18n="OPEN_ANIM_EDITOR_HINT">${L.get('OPEN_ANIM_EDITOR_HINT', 'Doble-click en el Navegador para abrir en el Editor de Animación.')}</p>
            `;
            dom.inspectorContent.appendChild(preview);
        } else if (lowerName.endsWith('.cescene')) {
            const preview = document.createElement('div');
            preview.className = 'asset-preview';
            preview.innerHTML = `
                <span class="asset-preview-icon" style="display: block; width: 48px; height: 48px; margin: 0 auto;">${getIconHTML('clapperboard')}</span>
                <p><strong>Scene</strong></p>
                <p data-i18n="OPEN_SCENE_HINT">${L.get('OPEN_SCENE_HINT', 'Doble-click en el Navegador para abrir la escena.')}</p>
            `;
            dom.inspectorContent.appendChild(preview);
        } else if (lowerName.endsWith('.cmel')) {
            const content = await file.text();
            const materialData = JSON.parse(content);
            const settingsContainer = document.createElement('div');
            settingsContainer.className = 'asset-settings';
            let html = '';
            for (const key in materialData) {
                html += `<label>${key}</label><input type="text" value="${materialData[key]}" readonly>`;
            }
            settingsContainer.innerHTML = html;
            dom.inspectorContent.appendChild(settingsContainer);
        } else if (lowerName.endsWith('.celib')) {
            const content = await file.text();
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
        } else if (lowerName.endsWith('.sprt')) {
            const content = await file.text();
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
        } else if (lowerName.endsWith('.cesprite')) {
            const content = await file.text();
            await renderCeSpriteInspector(content, dirHandle, assetPath);
        } else if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav')) {
            await renderAudioInspector(assetName, assetPath);
        } else if (lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || lowerName.endsWith('.ogv')) {
            await renderVideoInspector(assetName, assetPath);
        } else {
             dom.inspectorContent.innerHTML += `
                <div class="unknown-file-info" style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <p style="margin-bottom: 10px; opacity: 0.7;">No hay vista previa disponible para este tipo de archivo.</p>
                    <div style="font-size: 0.9em; display: grid; grid-template-columns: auto 1fr; gap: 8px 15px;">
                        <span style="opacity: 0.5;">Tamaño:</span>
                        <span>${(file.size / 1024).toFixed(2)} KB</span>
                        <span style="opacity: 0.5;">Modificado:</span>
                        <span>${new Date(file.lastModified).toLocaleString()}</span>
                        <span style="opacity: 0.5;">MIME:</span>
                        <span>${file.type || 'unknown'}</span>
                    </div>
                </div>
             `;
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
            const L = window.Localization;
            const isPresent = existingComponents.has(ComponentClass);
            const componentItem = document.createElement('div');
            componentItem.className = `component-item ${isPresent ? 'already-added' : ''}`;
            let compTitle = ComponentClass.name;
            if (compTitle === 'Transform') compTitle = L.get('TRANSFORM', 'Posición (Transform)');
            else if (compTitle === 'UITransform') compTitle = L.get('UI_TRANSFORM', 'Transformación UI');
            else if (L.get(compTitle.toUpperCase()) !== compTitle.toUpperCase()) compTitle = L.get(compTitle.toUpperCase());
            else if (compTitle === 'Rigidbody2D') compTitle = L.get('RIGIDBODY_2D', 'Rigidbody 2D');
            else if (compTitle === 'SceneLoader') compTitle = L.get('SCENE_LOADER', 'Cargar Escena');
            else if (compTitle === 'BasicAI') compTitle = L.get('BASIC_AI', 'IA Básica');

            componentItem.innerHTML = `
                <span>${compTitle}</span>
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
    const L = window.Localization;
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
            <label data-i18n="AUDIO_PREVIEW">${L.get('AUDIO_PREVIEW', 'Audio Preview')}</label>
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
            <label data-i18n="ACTIONS">${L.get('ACTIONS', 'Acciones')}</label>
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
            <label data-i18n="OPTIMIZATION_QUALITY">${L.get('OPTIMIZACION_Y_CALIDAD', 'Optimization & Quality')}</label>
            <div class="inspector-row" style="margin-top: 8px;">
                <label data-i18n="QUALITY">${L.get('CALIDAD', 'Calidad')}</label>
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
            <label data-i18n="ACTIONS">${L.get('ACCIONES', 'Acciones')}</label>
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
