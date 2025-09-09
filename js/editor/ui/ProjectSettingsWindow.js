// js/editor/ui/ProjectSettingsWindow.js

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
        if(showAlert) alert("El directorio del proyecto no está disponible.");
        return;
    }

    // Gather data from UI if the modal is open
    if (dom.projectSettingsModal.classList.contains('is-open')) {
        currentProjectConfig.appName = dom.settingsAppName.value;
        currentProjectConfig.authorName = dom.settingsAuthorName.value;
        currentProjectConfig.appVersion = dom.settingsAppVersion.value;
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
    }

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const configFileHandle = await projectHandle.getFileHandle('project.ceconfig', { create: true });
        const writable = await configFileHandle.createWritable();
        await writable.write(JSON.stringify(currentProjectConfig, null, 2));
        await writable.close();
        console.log("Configuración del proyecto guardada.");
        if(showAlert) alert("¡Configuración guardada!");
    } catch (error) {
        console.error("Error al guardar la configuración del proyecto:", error);
        if(showAlert) alert("No se pudo guardar la configuración.");
    }
}

function populateLayerLists() {
    if (!currentProjectConfig.layers) return;

    const createLayerItem = (name, index, type) => {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.textContent = `${index}: ${name}`;

        if (index > 0) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-layer-btn';
            removeBtn.textContent = '×';
            removeBtn.title = 'Quitar layer';
            removeBtn.addEventListener('click', () => {
                if (confirm(`¿Estás seguro de que quieres quitar el layer '${name}'?`)) {
                    if (type === 'sorting') {
                        currentProjectConfig.layers.sortingLayers.splice(index, 1);
                    } else {
                        currentProjectConfig.layers.collisionLayers.splice(index, 1);
                    }
                    populateLayerLists();
                }
            });
            item.appendChild(removeBtn);
        }
        return item;
    };

    dom.settingsSortingLayerList.innerHTML = '';
    currentProjectConfig.layers.sortingLayers.forEach((name, index) => {
        dom.settingsSortingLayerList.appendChild(createLayerItem(name, index, 'sorting'));
    });

    dom.settingsCollisionLayerList.innerHTML = '';
    currentProjectConfig.layers.collisionLayers.forEach((name, index) => {
        dom.settingsCollisionLayerList.appendChild(createLayerItem(name, index, 'collision'));
    });
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
                populateLayerLists();
            }
        });
    }

    if (dom.addCollisionLayerBtn) {
        dom.addCollisionLayerBtn.addEventListener('click', () => {
            const newName = dom.newCollisionLayerName.value.trim();
            if (newName && !currentProjectConfig.layers.collisionLayers.includes(newName)) {
                currentProjectConfig.layers.collisionLayers.push(newName);
                dom.newCollisionLayerName.value = '';
                populateLayerLists();
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

    if (dom.settingsAppName) dom.settingsAppName.value = currentProjectConfig.appName;
    if (dom.settingsAuthorName) dom.settingsAuthorName.value = currentProjectConfig.authorName;
    if (dom.settingsAppVersion) dom.settingsAppVersion.value = currentProjectConfig.appVersion;
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

    populateLayerLists();
}
