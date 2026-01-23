// js/editor/ui/ProjectSettingsWindow.js

import { showNotification } from './DialogWindow.js';

let dom = {};
let projectsDirHandle = null;
let currentProjectConfig = {};

// This function will be called from the main editor.js to initialize the module
export function initialize(editorDom, editorProjectsDirHandle, config) {
    dom = editorDom;
    projectsDirHandle = editorProjectsDirHandle;
    currentProjectConfig = config;

    console.log("Initializing Project Settings Window...");
    setupEventListeners();
}

async function saveProjectConfig(showAlert = true) {
    if (!projectsDirHandle) {
        if(showAlert) showNotification('Error', 'El directorio del proyecto no está disponible.');
        return;
    }

    // Gather data from UI if the modal is open
    if (dom.projectSettingsModal.classList.contains('is-open')) {
        currentProjectConfig.appName = dom.settingsAppName.value;
        currentProjectConfig.authorName = dom.settingsAuthorName.value;
        currentProjectConfig.appVersion = dom.settingsAppVersion.value;
        currentProjectConfig.rendererMode = dom.settingsRendererMode.value;
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

        // Save Agent Types
        const agentTypeItems = dom.settingsAgentTypeList.querySelectorAll('.layer-item');
        currentProjectConfig.agentTypes = Array.from(agentTypeItems).map(item => item.querySelector('span').textContent);

        // Save Layers
        const layerInputs = dom.settingsLayerList.querySelectorAll('input[type=text]');
        const newLayers = Array.from(layerInputs).map(input => input.value);
        // We only update sorting layers for now as it's the main one used for rendering logic
        currentProjectConfig.layers.sortingLayers = newLayers;
    }

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const configFileHandle = await projectHandle.getFileHandle('project.ceconfig', { create: true });
        const writable = await configFileHandle.createWritable();
        await writable.write(JSON.stringify(currentProjectConfig, null, 2));
        await writable.close();
        console.log("Configuración del proyecto guardada.");
        if(showAlert) showNotification('Éxito', '¡Configuración guardada!');
    } catch (error) {
        console.error("Error al guardar la configuración del proyecto:", error);
        if(showAlert) showNotification('Error', 'No se pudo guardar la configuración.');
    }
}

function populateTagsAndLayers() {
    // Ensure agentTypes exists for backward compatibility
    if (!currentProjectConfig.agentTypes) {
        currentProjectConfig.agentTypes = [];
    }
    if (!currentProjectConfig.layers || !currentProjectConfig.tags) return;

    // --- Populate Agent Types ---
    const agentTypeList = dom.settingsAgentTypeList;
    agentTypeList.innerHTML = '';
    currentProjectConfig.agentTypes.forEach(agentType => {
        const item = document.createElement('div');
        item.className = 'layer-item';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = agentType;
        item.appendChild(nameSpan);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-layer-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Quitar tipo de agente';
        removeBtn.addEventListener('click', () => {
            const index = currentProjectConfig.agentTypes.indexOf(agentType);
            if (index > -1) {
                currentProjectConfig.agentTypes.splice(index, 1);
                populateTagsAndLayers(); // A bit inefficient, but simple and robust
            }
        });
        item.appendChild(removeBtn);
        agentTypeList.appendChild(item);
    });


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
            removeBtn.title = 'Quitar tag';
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
        img.src = 'image/Paquete.png';
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
    removeBtn.textContent = 'Quitar';
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
        dom.projectSettingsModal.classList.add('is-open');
    });

    if (dom.settingsSaveBtn) {
        dom.settingsSaveBtn.addEventListener('click', () => saveProjectConfig(true));
    }

    if (dom.settingsShowEngineLogo) {
        dom.settingsShowEngineLogo.addEventListener('click', (e) => {
            if (!e.target.checked) {
                e.preventDefault();
                dom.engineLogoConfirmModal.classList.add('is-open');
            }
        });
    }

    if (dom.addAgentTypeBtn) {
        dom.addAgentTypeBtn.addEventListener('click', () => {
            const newAgentTypeName = dom.newAgentTypeName.value.trim();
            if (newAgentTypeName && !currentProjectConfig.agentTypes.includes(newAgentTypeName)) {
                currentProjectConfig.agentTypes.push(newAgentTypeName);
                dom.newAgentTypeName.value = '';
                populateTagsAndLayers(); // Rerender the list
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
                console.log("User cancelled file picker.", err);
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
                console.log("User cancelled file picker.", err);
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
                console.log("User cancelled file picker.", err);
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
    if (dom.settingsRendererMode) dom.settingsRendererMode.value = currentProjectConfig.rendererMode;
    if (dom.settingsShowEngineLogo) dom.settingsShowEngineLogo.checked = currentProjectConfig.showEngineLogo;
    if (dom.settingsKeystorePath) dom.settingsKeystorePath.value = currentProjectConfig.keystore.path;

    if (dom.settingsIconPreview && currentProjectConfig.iconPath) {
        dom.settingsIconPreview.style.display = 'block';
        dom.settingsIconPreview.src = 'image/Paquete.png';
    }

    dom.settingsLogoList.innerHTML = '';
    if (currentProjectConfig.splashLogos && currentProjectConfig.splashLogos.length > 0) {
        currentProjectConfig.splashLogos.forEach(logoData => {
            addLogoToList(logoData.path, logoData.duration);
        });
    }

    populateTagsAndLayers();
}
