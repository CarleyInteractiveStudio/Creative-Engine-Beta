// js/editor/ui/ProjectSettingsWindow.js

import { showNotification } from './DialogWindow.js';

let dom = {};
let projectsDirHandle = null;
let currentProjectConfig = {};
let getPreferences = null;

function updateRendererModeOptions(projectType) {
    const rendererSelect = dom.settingsRendererMode;
    if (!rendererSelect) return;

    const currentVal = rendererSelect.value;
    rendererSelect.innerHTML = '';

    const L = window.Localization;

    let options = [];
    if (projectType === '2d') {
        options = [
            { value: 'canvas2d', text: L?.get('SIMPLE_2D') || '2D Tradicional (Canvas)' },
            { value: 'realista', text: L?.get('AVANZADO_LUCES') || 'Avanzado (Iluminación y Noche/Día)' }
        ];
    } else {
        options = [
            { value: '3d-mode', text: L?.get('MODE_3D') || '3D Moderno (WebGL)' }
        ];
    }

    options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt.value;
        el.textContent = opt.text;
        rendererSelect.appendChild(el);
    });

    // Ensure value is valid for new options
    if (options.some(opt => opt.value === currentVal)) {
        rendererSelect.value = currentVal;
    } else {
        rendererSelect.value = options[0]?.value || '';
    }
}

// This function will be called from the main editor.js to initialize the module
export function initialize(editorDom, editorProjectsDirHandle, config, getPrefsFunc) {
    dom = editorDom;
    projectsDirHandle = editorProjectsDirHandle;
    currentProjectConfig = config;
    getPreferences = getPrefsFunc;

    setupEventListeners();
}

export async function saveProjectConfig(showAlert = true) {
    if (!projectsDirHandle) {
        if(showAlert) window.Dialogs.showNotification(
            window.Localization?.get('ERROR') || 'Error',
            window.Localization?.get('ERROR_DIRECTORIO_NO_DISPONIBLE') || 'El directorio del proyecto no está disponible.'
        );
        return;
    }

    // Gather data from UI if the modal is open
    if (!dom.projectSettingsModal.classList.contains('hidden')) {
        currentProjectConfig.appName = dom.settingsAppName.value;
        currentProjectConfig.authorName = dom.settingsAuthorName.value;
        currentProjectConfig.appVersion = dom.settingsAppVersion.value;

        // Basic config (Locked, but synced for safety)
        currentProjectConfig.rendererMode = dom.settingsRendererMode.value;

        // Advanced Graphics
        currentProjectConfig.graphicMode = document.getElementById('settings-graphic-mode')?.value || 'Realistic';
        currentProjectConfig.realismLevel = parseInt(document.getElementById('settings-realism-slider')?.value) || 50;
        currentProjectConfig.realismFilter = document.getElementById('settings-realism-filter')?.checked || false;

        // Optimizations
        currentProjectConfig.optiCameraCulling = document.getElementById('settings-opti-camera')?.checked || false;
        currentProjectConfig.optiShadowDistance = parseInt(document.getElementById('settings-opti-shadow-dist')?.value) || 2000;
        currentProjectConfig.optiLODDistance = parseInt(document.getElementById('settings-opti-lod-dist')?.value) || 3000;

        currentProjectConfig.maxFps = parseInt(dom.settingsMaxFps.value) || 0;
        currentProjectConfig.forceFps = dom.settingsForceFps.checked;
        currentProjectConfig.minFps = parseInt(dom.settingsMinFps.value) || 30;
        currentProjectConfig.ramLimit = parseInt(dom.settingsRamLimit.value) || 2048;
        currentProjectConfig.cpuLimit = parseInt(dom.settingsCpuLimit.value) || 100;
        currentProjectConfig.netLimit = parseInt(document.getElementById('settings-net-limit')?.value) || 0;
        currentProjectConfig.slowNetMode = document.getElementById('settings-slow-net')?.checked || false;
        currentProjectConfig.autoOptimize = document.getElementById('settings-auto-optimize') ? document.getElementById('settings-auto-optimize').checked : true;
        currentProjectConfig.maxOptimizationLevel = document.getElementById('settings-max-opt-level') ? parseInt(document.getElementById('settings-max-opt-level').value) : 3;

        // Aplicar límite al monitor de red
        import('../../engine/NetworkMonitor.js').then(({ networkMonitor }) => {
            networkMonitor.setLimit(currentProjectConfig.netLimit || Infinity);
        });

        // Note: The mask type is saved via the AmbienteControlWindow, not here.
        currentProjectConfig.showEngineLogo = dom.settingsShowEngineLogo.checked;
        currentProjectConfig.keystore.pass = dom.settingsKeystorePass.value;
        currentProjectConfig.keystore.alias = dom.settingsKeyAlias.value;
        currentProjectConfig.keystore.aliasPass = dom.settingsKeyPass.value;

        currentProjectConfig.splashLogos = [];
        const logoItems = dom.settingsLogoList.querySelectorAll('.logo-list-item');
        logoItems.forEach(item => {
            currentProjectConfig.splashLogos.push({
                path: item.dataset.path,
                duration: item.querySelector('input[type=range]').value
            });
        });

        // Save Tags
        const tagItems = dom.settingsTagList.querySelectorAll('.layer-item');
        currentProjectConfig.tags = Array.from(tagItems).map(item => item.querySelector('span').textContent);

        // Save Layers
        const layerInputs = dom.settingsLayerList.querySelectorAll('input[type=text]');
        const newLayers = Array.from(layerInputs).map(input => input.value);
        // We only update sorting layers for now as it's the main one used for rendering logic
        currentProjectConfig.layers.sortingLayers = newLayers;
    }

    // NEW: Always sync Editor Preferences before saving to persist them per project
    if (getPreferences) {
        currentProjectConfig.preferences = getPreferences();
    }

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const configFileHandle = await projectHandle.getFileHandle('project.ceconfig', { create: true });
        const writable = await configFileHandle.createWritable();
        await writable.write(JSON.stringify(currentProjectConfig, null, 2));
        await writable.close();

        // Sync FPS/Optimization settings to PerformanceMonitor
        if (window.EngineAPI && window.EngineAPI.getPerformanceMonitor) {
            const pm = window.EngineAPI.getPerformanceMonitor();
            if (pm) pm.updateConfig(currentProjectConfig);
        }

        if(showAlert) window.Dialogs.showNotification(
            window.Localization?.get('EXITO') || 'Éxito',
            window.Localization?.get('CONFIG_GUARDADA') || '¡Configuración guardada!'
        );
    } catch (error) {
        console.error("Error al guardar la configuración del proyecto:", error);
        if(showAlert) window.Dialogs.showNotification(
            window.Localization?.get('ERROR') || 'Error',
            window.Localization?.get('ERROR_GUARDAR_CONFIG') || 'No se pudo guardar la configuración.'
        );
    }
}

function populateTagsAndLayers() {
    if (!currentProjectConfig.layers || !currentProjectConfig.tags) return;

    // --- Populate Tags ---
    const tagList = dom.settingsTagList;
    tagList.innerHTML = '';
    currentProjectConfig.tags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'layer-item';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = tag;
        item.appendChild(nameSpan);

        if (tag !== 'Untagged') {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-layer-btn';
            removeBtn.textContent = '×';
            removeBtn.title = window.Localization?.get('QUITAR_TAG') || 'Quitar tag';
            removeBtn.addEventListener('click', () => {
                const index = currentProjectConfig.tags.indexOf(tag);
                if (index > -1) {
                    currentProjectConfig.tags.splice(index, 1);
                    populateTagsAndLayers();
                }
            });
            item.appendChild(removeBtn);
        }
        tagList.appendChild(item);
    });

    // --- Populate Layers ---
    const layerList = dom.settingsLayerList;
    layerList.innerHTML = '';
    const totalLayers = 32;
    const builtInLayers = ['Default', 'TransparentFX', 'Ignore Raycast', '', 'Water', 'UI'];
    // standard 2D layers to suggest if empty
    const default2DLayers = {
        6: 'Background',
        7: 'Midground',
        8: 'Foreground',
        9: 'Player',
        10: 'Enemy',
        11: 'NPC',
        12: 'Items',
        13: 'VFX',
        14: 'TopLayer'
    };

    for (let i = 0; i < totalLayers; i++) {
        const item = document.createElement('div');
        item.className = 'layer-item';

        const label = document.createElement('span');
        label.textContent = `Layer ${i}:`;
        item.appendChild(label);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentProjectConfig.layers.sortingLayers[i] || '';

        // Disable editing for built-in layers for safety
        if (i < builtInLayers.length && builtInLayers[i]) {
            input.value = builtInLayers[i];
            input.disabled = true;
        }
        // User layers start at index 8 in Unity, good practice
        else if (i < 8) {
             input.disabled = true;
        }


        item.appendChild(input);
        layerList.appendChild(item);
    }
}

function addLogoToList(fileOrPath, duration = 5) {
    const listItem = document.createElement('div');
    listItem.className = 'logo-list-item';

    const img = document.createElement('img');
    const fileName = document.createElement('span');
    fileName.className = 'logo-filename';

    if (typeof fileOrPath === 'string') {
        fileName.textContent = fileOrPath;
        listItem.dataset.path = fileOrPath;
        img.src = 'icons/box.svg';
    } else {
        fileName.textContent = fileOrPath.name;
        listItem.dataset.path = fileOrPath.name;
        fileOrPath.getFile().then(file => {
            img.src = URL.createObjectURL(file);
        });
    }

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 1;
    slider.max = 10;
    slider.value = duration;
    const durationLabel = document.createElement('span');
    durationLabel.textContent = `${slider.value}s`;
    slider.addEventListener('input', () => {
        durationLabel.textContent = `${slider.value}s`;
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = window.Localization?.get('QUITAR') || 'Quitar';
    removeBtn.className = 'danger-btn';
    removeBtn.addEventListener('click', () => {
        listItem.remove();
    });

    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(durationLabel);

    listItem.appendChild(img);
    listItem.appendChild(fileName);
    listItem.appendChild(sliderContainer);
    listItem.appendChild(removeBtn);

    dom.settingsLogoList.appendChild(listItem);
}

function setupEventListeners() {
    document.getElementById('menu-project-settings').addEventListener('click', () => {
        populateCameraList();
        dom.projectSettingsModal.classList.remove('hidden'); window.bringToFront(dom.projectSettingsModal);
    });

    if (dom.settingsOptimizeMemBtn) {
        dom.settingsOptimizeMemBtn.addEventListener('click', () => {
            import('../../engine/CEEngine.js').then(CEEngine => {
                CEEngine.optimize();
            });
        });
    }

    const clearCacheBtn = document.getElementById('settings-clear-cache-btn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', async () => {
            try {
                const deleted = await caches.delete('ce-asset-cache');
                if (deleted) {
                    window.Dialogs.showNotification("Caché", "La caché de activos ha sido limpiada con éxito.");
                    updateCacheStatus();
                }
            } catch (e) {
                console.error("Error al limpiar caché:", e);
            }
        });
    }

    const realismSlider = document.getElementById('settings-realism-slider');
    if (realismSlider) {
        realismSlider.addEventListener('input', (e) => {
            const valDisp = document.getElementById('settings-realism-value');
            if (valDisp) valDisp.textContent = e.target.value + '%';
        });
    }

    const graphicModeSelect = document.getElementById('settings-graphic-mode');
    const realisticOptions = document.getElementById('settings-realistic-options');
    if (graphicModeSelect) {
        graphicModeSelect.addEventListener('change', (e) => {
            if (realisticOptions) {
                realisticOptions.style.display = (e.target.value === 'Anime') ? 'none' : 'block';
            }
        });
    }

    if (dom.settingsSaveBtn) {
        dom.settingsSaveBtn.addEventListener('click', async () => {
            const oldType = currentProjectConfig.projectType;
            await saveProjectConfig(true);
            const newType = document.getElementById('settings-project-type').value;

            if (oldType !== newType) {
                // If project type changed, we might need a reload or a deep UI refresh
                window.location.reload();
            }
        });
    }

    if (dom.settingsShowEngineLogo) {
        dom.settingsShowEngineLogo.addEventListener('click', (e) => {
            if (!e.target.checked) {
                e.preventDefault();
                dom.engineLogoConfirmModal.classList.add('is-open');
            }
        });
    }

    if (dom.confirmDisableLogoBtn) {
        dom.confirmDisableLogoBtn.addEventListener('click', () => {
            dom.settingsShowEngineLogo.checked = false;
            dom.engineLogoConfirmModal.classList.remove('is-open');
        });
    }

    if (dom.cancelDisableLogoBtn) {
        dom.cancelDisableLogoBtn.addEventListener('click', () => {
            dom.engineLogoConfirmModal.classList.remove('is-open');
        });
    }

    if (dom.settingsIconPickerBtn) {
        dom.settingsIconPickerBtn.addEventListener('click', async () => {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{ description: 'Images', accept: { 'image/png': ['.png'] } }],
                    multiple: false
                });
                currentProjectConfig.iconPath = fileHandle.name;
                const file = await fileHandle.getFile();
                dom.settingsIconPreview.src = URL.createObjectURL(file);
                dom.settingsIconPreview.style.display = 'block';
            } catch (err) {
                // User cancelled file picker
            }
        });
    }

    if (dom.settingsKeystorePickerBtn) {
        dom.settingsKeystorePickerBtn.addEventListener('click', async () => {
            try {
                const [fileHandle] = await window.showOpenFilePicker({ multiple: false });
                currentProjectConfig.keystore.path = fileHandle.name;
                dom.settingsKeystorePath.value = fileHandle.name;
            } catch (err) {
                // User cancelled file picker
            }
        });
    }

    if (dom.settingsAddLogoBtn) {
        dom.settingsAddLogoBtn.addEventListener('click', async () => {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{ description: 'Images', accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] } }],
                    multiple: false
                });
                addLogoToList(fileHandle);
            } catch (err) {
                // User cancelled file picker
            }
        });
    }

    if (dom.addSortingLayerBtn) {
        dom.addSortingLayerBtn.addEventListener('click', () => {
            const newName = dom.newSortingLayerName.value.trim();
            if (newName && !currentProjectConfig.layers.sortingLayers.includes(newName)) {
                currentProjectConfig.layers.sortingLayers.push(newName);
                dom.newSortingLayerName.value = '';
                populateTagsAndLayers();
            }
        });
    }

    if (dom.addCollisionLayerBtn) {
        dom.addCollisionLayerBtn.addEventListener('click', () => {
            const newName = dom.newCollisionLayerName.value.trim();
            if (newName && !currentProjectConfig.layers.collisionLayers.includes(newName)) {
                currentProjectConfig.layers.collisionLayers.push(newName);
                dom.newCollisionLayerName.value = '';
                populateTagsAndLayers(); // Rerender the whole list
            }
        });
    }

    if (dom.addTagBtn) {
        dom.addTagBtn.addEventListener('click', () => {
            const newTagName = dom.newTagName.value.trim();
            if (newTagName && !currentProjectConfig.tags.includes(newTagName)) {
                currentProjectConfig.tags.push(newTagName);
                dom.newTagName.value = '';
                populateTagsAndLayers(); // Rerender the tag list
            }
        });
    }

    if (dom.keystoreCreateBtn) {
        dom.keystoreCreateBtn.addEventListener('click', () => {
            dom.keystoreCreateModal.classList.add('is-open');
        });
    }

    // --- Collaboration Listeners ---
    const p2pBtn = document.getElementById('settings-collab-p2p-btn');
    const proBtn = document.getElementById('settings-collab-pro-btn');
    const stopCollabBtn = document.getElementById('settings-collab-stop-btn');

    if (p2pBtn) {
        p2pBtn.addEventListener('click', () => {
            dom.projectSettingsModal.classList.add('hidden');
            // Trigger local hosting in CollaborationSystem
            const hostMenuBtn = document.getElementById('menu-collab-host');
            // CollaborationSystem.js startHosting is private, but we can trigger the menu click
            // Actually, we'll need to expose a public method in CollaborationSystem.
            if (window._CollabSystem && window._CollabSystem.startHosting) {
                window._CollabSystem.startHosting();
            }
        });
    }

    if (proBtn) {
        proBtn.addEventListener('click', () => {
            dom.projectSettingsModal.classList.add('hidden');
            if (window._CollabSystem && window._CollabSystem.startHFHosting) {
                window._CollabSystem.startHFHosting();
            }
        });
    }

    if (stopCollabBtn) {
        stopCollabBtn.addEventListener('click', () => {
            if (window._CollabSystem && window._CollabSystem.stopCollaboration) {
                window._CollabSystem.stopCollaboration();
            }
        });
    }

    if (dom.ksGenerateBtn) {
        dom.ksGenerateBtn.addEventListener('click', () => {
            const dname = `CN=${dom.ksCn.value}, OU=${dom.ksOu.value}, O=${dom.ksO.value}, L=${dom.ksL.value}, ST=${dom.ksSt.value}, C=${dom.ksC.value}`;
            const command = `keytool -genkey -v -keystore ${dom.ksFilename.value} -alias ${dom.ksAlias.value} -keyalg RSA -keysize 2048 -validity ${dom.ksValidity.value * 365} -storepass ${dom.ksStorepass.value} -keypass ${document.getElementById('ks-password').value} -dname "${dname}"`;
            dom.ksCommandTextarea.value = command;
            dom.ksCommandOutput.classList.remove('hidden');
        });
    }
}

export function populateUI(config) {
    currentProjectConfig = config;

    // Add default rendererMode if not present (for backward compatibility)
    if (!currentProjectConfig.rendererMode) {
        currentProjectConfig.rendererMode = 'canvas2d'; // Default to simple mode
    }

    if (dom.settingsAppName) dom.settingsAppName.value = currentProjectConfig.appName;
    if (dom.settingsAuthorName) dom.settingsAuthorName.value = currentProjectConfig.authorName;
    if (dom.settingsAppVersion) dom.settingsAppVersion.value = currentProjectConfig.appVersion;

    const typeSelect = document.getElementById('settings-project-type');
    if (typeSelect) {
        typeSelect.value = currentProjectConfig.projectType || '2d';
        typeSelect.disabled = true; // Permanent lock
        updateRendererModeOptions(typeSelect.value);
    }

    if (dom.settingsRendererMode) {
        dom.settingsRendererMode.value = currentProjectConfig.rendererMode;
        dom.settingsRendererMode.disabled = false; // Unlocked for flexible 2D modes
    }

    // Advanced Graphics sync
    const graphicModeEl = document.getElementById('settings-graphic-mode');
    const settingsRealisticOptions = document.getElementById('settings-realistic-options');
    if (graphicModeEl) {
        graphicModeEl.value = currentProjectConfig.graphicMode || 'Realistic';
        if (settingsRealisticOptions) {
            settingsRealisticOptions.style.display = (graphicModeEl.value === 'Anime') ? 'none' : 'block';
        }
    }

    const realismSlider = document.getElementById('settings-realism-slider');
    if (realismSlider) {
        realismSlider.value = currentProjectConfig.realismLevel !== undefined ? currentProjectConfig.realismLevel : 50;
        const valDisp = document.getElementById('settings-realism-value');
        if (valDisp) valDisp.textContent = realismSlider.value + '%';
    }

    const realismFilter = document.getElementById('settings-realism-filter');
    if (realismFilter) realismFilter.checked = !!currentProjectConfig.realismFilter;

    // Optimizations sync
    const optiCam = document.getElementById('settings-opti-camera');
    if (optiCam) optiCam.checked = !!currentProjectConfig.optiCameraCulling;

    const shadowDist = document.getElementById('settings-opti-shadow-dist');
    if (shadowDist) shadowDist.value = currentProjectConfig.optiShadowDistance || 2000;

    const lodDist = document.getElementById('settings-opti-lod-dist');
    if (lodDist) lodDist.value = currentProjectConfig.optiLODDistance || 3000;

    if (dom.settingsMaxFps) dom.settingsMaxFps.value = currentProjectConfig.maxFps !== undefined ? currentProjectConfig.maxFps : 60;
    if (dom.settingsForceFps) dom.settingsForceFps.checked = !!currentProjectConfig.forceFps;
    if (dom.settingsMinFps) dom.settingsMinFps.value = currentProjectConfig.minFps !== undefined ? currentProjectConfig.minFps : 30;
    if (dom.settingsRamLimit) dom.settingsRamLimit.value = currentProjectConfig.ramLimit || 2048;
    if (dom.settingsCpuLimit) dom.settingsCpuLimit.value = currentProjectConfig.cpuLimit || 100;

    const netLimitEl = document.getElementById('settings-net-limit');
    if (netLimitEl) netLimitEl.value = currentProjectConfig.netLimit || 0;

    const slowNetEl = document.getElementById('settings-slow-net');
    if (slowNetEl) slowNetEl.checked = !!currentProjectConfig.slowNetMode;

    const autoOptimizeEl = document.getElementById('settings-auto-optimize');
    if (autoOptimizeEl) autoOptimizeEl.checked = currentProjectConfig.autoOptimize !== undefined ? !!currentProjectConfig.autoOptimize : true;

    const maxOptLevelEl = document.getElementById('settings-max-opt-level');
    if (maxOptLevelEl) maxOptLevelEl.value = currentProjectConfig.maxOptimizationLevel !== undefined ? currentProjectConfig.maxOptimizationLevel : 3;

    // Sincronizar monitor al cargar
    import('../../engine/NetworkMonitor.js').then(({ networkMonitor }) => {
        networkMonitor.setLimit(currentProjectConfig.netLimit || Infinity);
    });
    if (dom.settingsShowEngineLogo) dom.settingsShowEngineLogo.checked = currentProjectConfig.showEngineLogo;
    if (dom.settingsKeystorePath) dom.settingsKeystorePath.value = currentProjectConfig.keystore.path;

    if (dom.settingsIconPreview && currentProjectConfig.iconPath) {
        dom.settingsIconPreview.style.display = 'block';
        dom.settingsIconPreview.src = 'icons/box.svg';
    }

    populateCameraList();
    updateCacheStatus();

    dom.settingsLogoList.innerHTML = '';
    if (currentProjectConfig.splashLogos && currentProjectConfig.splashLogos.length > 0) {
        currentProjectConfig.splashLogos.forEach(logoData => {
            addLogoToList(logoData.path, logoData.duration);
        });
    }

    populateTagsAndLayers();
}

function populateCameraList() {
    const cameraList = document.getElementById('settings-camera-list');
    if (!cameraList || !window.SceneManager.currentScene) return;

    const allMaterias = window.SceneManager.currentScene.getAllMaterias();
    const cameraMaterias = allMaterias.filter(m => m.getComponent(window.Components.Camera));

    cameraList.innerHTML = '';

    if (cameraMaterias.length === 0) {
        cameraList.innerHTML = `<p class="field-description">${window.Localization?.get('SIN_CAMARAS_HINT') || 'No hay cámaras en esta escena.'}</p>`;
        return;
    }

    cameraMaterias.forEach(materia => {
        const camera = materia.getComponent(window.Components.Camera);
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.style.flexDirection = 'column';
        item.style.alignItems = 'stretch';
        item.style.gap = '8px';
        item.style.padding = '12px';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = materia.name;
        nameSpan.style.fontWeight = 'bold';

        const toggleContainer = document.createElement('div');
        toggleContainer.style.display = 'flex';
        toggleContainer.style.alignItems = 'center';
        toggleContainer.style.gap = '10px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = materia.isActive;
        checkbox.title = 'Activar/Desactivar Cámara';
        checkbox.addEventListener('change', () => {
            materia.isActive = checkbox.checked;
            if (window.updateScene) window.updateScene();
        });

        const soloBtn = document.createElement('button');
        soloBtn.className = 'panel-tool-btn';
        soloBtn.textContent = window.Localization?.get('SOLO') || 'Solo';
        soloBtn.style.fontSize = '10px';
        soloBtn.addEventListener('click', () => {
            cameraMaterias.forEach(cm => cm.isActive = (cm.id === materia.id));
            populateCameraList();
            if (window.updateScene) window.updateScene();
        });

        toggleContainer.appendChild(soloBtn);
        toggleContainer.appendChild(checkbox);
        header.appendChild(nameSpan);
        header.appendChild(toggleContainer);
        item.appendChild(header);

        // Viewport Rect UI
        const rectContainer = document.createElement('div');
        rectContainer.style.display = 'grid';
        rectContainer.style.gridTemplateColumns = '1fr 1fr';
        rectContainer.style.gap = '5px';
        rectContainer.style.fontSize = '11px';

        const createField = (label, prop) => {
            const group = document.createElement('div');
            group.style.display = 'flex';
            group.style.alignItems = 'center';
            group.style.gap = '4px';
            const lb = document.createElement('span');
            lb.textContent = label;
            lb.style.opacity = '0.7';
            const input = document.createElement('input');
            input.type = 'number';
            input.step = '0.05';
            input.min = '0';
            input.max = '1';
            input.value = camera.rect[prop];
            input.className = 'prop-input';
            input.style.width = '100%';
            input.addEventListener('input', () => {
                camera.rect[prop] = parseFloat(input.value) || 0;
                if (window.updateScene) window.updateScene();
            });
            group.appendChild(lb);
            group.appendChild(input);
            return group;
        };

        rectContainer.appendChild(createField('X', 'x'));
        rectContainer.appendChild(createField('Y', 'y'));
        rectContainer.appendChild(createField('W', 'w'));
        rectContainer.appendChild(createField('H', 'h'));

        const rectLabel = document.createElement('div');
        rectLabel.textContent = 'Viewport Rect (0-1):';
        rectLabel.style.fontSize = '10px';
        rectLabel.style.opacity = '0.6';
        rectLabel.style.marginBottom = '-2px';

        item.appendChild(rectLabel);
        item.appendChild(rectContainer);

        cameraList.appendChild(item);
    });
}

async function updateCacheStatus() {
    const statusEl = document.getElementById('settings-cache-status');
    if (!statusEl) return;

    try {
        const cache = await caches.open('ce-asset-cache');
        const keys = await cache.keys();
        let totalSize = 0;

        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }

        const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        statusEl.textContent = `Caché: ${keys.length} archivos (${sizeMB} MB)`;
    } catch (e) {
        statusEl.textContent = "Caché: No disponible";
    }
}
