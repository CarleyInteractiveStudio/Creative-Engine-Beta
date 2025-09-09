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
let extractFramesFromSheetCallback;
let updateSceneCallback;
let updateAssetBrowserCallback;
let isScanningForComponents = false;
let currentProjectConfig; // To access layers

const markdownConverter = new showdown.Converter();

const availableComponents = {
    'Renderizado': [Components.SpriteRenderer],
    'Animación': [Components.Animator],
    'Cámara': [Components.Camera],
    'Físicas': [Components.Rigidbody, Components.BoxCollider],
    'UI': [Components.RectTransform, Components.UIImage, Components.UICanvas],
    'Scripting': [Components.CreativeScript]
};

// --- Initialization ---
export function initialize(dependencies) {
    dom = dependencies.dom;
    projectsDirHandle = dependencies.projectsDirHandle;
    currentDirectoryHandle = dependencies.currentDirectoryHandle;
    getSelectedMateria = dependencies.getSelectedMateria;
    getSelectedAsset = dependencies.getSelectedAsset;
    openSpriteSelectorCallback = dependencies.openSpriteSelectorCallback;
    saveAssetMetaCallback = dependencies.saveAssetMetaCallback;
    extractFramesFromSheetCallback = dependencies.extractFramesFromSheetCallback;
    updateSceneCallback = dependencies.updateSceneCallback;
    updateAssetBrowserCallback = dependencies.updateAssetBrowserCallback;
    currentProjectConfig = dependencies.currentProjectConfig;

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

    if (e.target.matches('#materia-active-toggle')) {
        selectedMateria.isActive = e.target.checked;
        updateSceneCallback();
    } else if (e.target.matches('#materia-name-input')) {
         selectedMateria.name = e.target.value;
         // We need a way to tell the hierarchy to update itself.
         // For now, this will be handled by the next full update.
         // A dedicated callback would be better.
    } else if (e.target.matches('#materia-layer-select')) {
        selectedMateria.layer = e.target.value;
    }
}

function handleInspectorClick(e) {
    const selectedMateria = getSelectedMateria();

    if (e.target.matches('#add-component-btn')) {
        showAddComponentModal();
    }

    if (e.target.matches('.sprite-select-btn')) {
        const componentName = e.target.dataset.component;
        if (componentName && openSpriteSelectorCallback) {
            openSpriteSelectorCallback(componentName);
        }
    }
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
    // Name input and active toggle
    dom.inspectorContent.innerHTML = `
        <div class="inspector-materia-header">
            <input type="checkbox" id="materia-active-toggle" title="Activar/Desactivar Materia" ${selectedMateria.isActive ? 'checked' : ''}>
            <input type="text" id="materia-name-input" value="${selectedMateria.name}">
        </div>
        <div class="inspector-row">
            <label for="materia-layer-select">Layer</label>
            <select id="materia-layer-select"></select>
        </div>
    `;

    const layerSelect = dom.inspectorContent.querySelector('#materia-layer-select');
    if (layerSelect) {
        currentProjectConfig.layers.sortingLayers.forEach(layerName => {
            const option = document.createElement('option');
            option.value = layerName;
            option.textContent = layerName;
            if (selectedMateria.layer === layerName) {
                option.selected = true;
            }
            layerSelect.appendChild(option);
        });
    }

    const componentIcons = {
        Transform: '✥', Rigidbody: '🏋️', BoxCollider: '🟩', SpriteRenderer: '🖼️',
        Animator: '🏃', Camera: '📷', CreativeScript: 'image/Script.png',
        RectTransform: '⎚', UICanvas: '🖼️', UIImage: '🏞️'
    };

    const componentsWrapper = document.createElement('div');
    componentsWrapper.className = 'inspector-components-wrapper';

    selectedMateria.leyes.forEach(ley => {
        let componentHTML = '';
        const componentName = ley.constructor.name;
        const icon = componentIcons[componentName] || '⚙️';
        const iconHTML = icon.includes('.png') ? `<img src="${icon}" class="component-icon">` : `<span class="component-icon">${icon}</span>`;

        if (ley instanceof Components.Transform) {
            if (selectedMateria.getComponent(Components.RectTransform)) return;
            componentHTML = `<div class="component-header">${iconHTML}<h4>Transform</h4></div>
            <div class="component-grid">
                <div class="prop-row"><label>X</label><input type="number" class="prop-input" step="1" data-component="Transform" data-prop="x" value="${ley.x.toFixed(0)}"></div>
                <div class="prop-row"><label>Y</label><input type="number" class="prop-input" step="1" data-component="Transform" data-prop="y" value="${ley.y.toFixed(0)}"></div>
                <div class="prop-row"><label>Rotation</label><input type="number" class="prop-input" step="1" data-component="Transform" data-prop="rotation" value="${(ley.rotation || 0).toFixed(0)}"></div>
                <div class="prop-row"><label>Scale X</label><input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.x" value="${ley.scale.x.toFixed(1)}"></div>
                <div class="prop-row"><label>Scale Y</label><input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.y" value="${ley.scale.y.toFixed(1)}"></div>
            </div>`;
        } else if (ley instanceof Components.RectTransform) {
             componentHTML = `<div class="component-header">${iconHTML}<h4>Rect Transform</h4></div>
            <div class="component-grid">
                <div class="prop-row"><label>X</label><input type="number" class="prop-input" data-component="RectTransform" data-prop="x" value="${ley.x.toFixed(0)}"></div>
                <div class="prop-row"><label>Y</label><input type="number" class="prop-input" data-component="RectTransform" data-prop="y" value="${ley.y.toFixed(0)}"></div>
                <div class="prop-row"><label>Width</label><input type="number" class="prop-input" data-component="RectTransform" data-prop="width" value="${ley.width.toFixed(0)}"></div>
                <div class="prop-row"><label>Height</label><input type="number" class="prop-input" data-component="RectTransform" data-prop="height" value="${ley.height.toFixed(0)}"></div>
            </div>`;
        } else if (ley instanceof Components.UIImage) {
            const previewImg = ley.sprite.src ? `<img src="${ley.sprite.src}" alt="Preview">` : 'None';
            componentHTML = `<div class="component-header">${iconHTML}<h4>UI Image</h4></div>
            <div class="component-grid">
                <label>Source</label>
                <div class="sprite-dropper">
                    <div class="sprite-preview" data-component="UIImage" data-prop="source">${previewImg}</div>
                    <button class="sprite-select-btn" data-component="UIImage">🎯</button>
                </div>
                <label>Color</label><input type="color" class="prop-input" data-component="UIImage" data-prop="color" value="${ley.color}">
            </div>`;
        }
        else if (ley instanceof Components.SpriteRenderer) {
            const previewImg = ley.sprite.src ? `<img src="${ley.sprite.src}" alt="Preview">` : 'None';
            componentHTML = `<div class="component-header">${iconHTML}<h4>Sprite Renderer</h4></div>
            <div class="component-grid">
                <label>Sprite</label>
                <div class="sprite-dropper">
                    <div class="sprite-preview" data-component="SpriteRenderer" data-prop="source">${previewImg}</div>
                    <button class="sprite-select-btn" data-component="SpriteRenderer">🎯</button>
                </div>
                <label>Color</label><input type="color" class="prop-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color}">
            </div>`;
        }
        else if (ley instanceof Components.CreativeScript) {
            componentHTML = `<div class="component-header">${iconHTML}<h4>${ley.scriptName}</h4></div>`;
        } else if (ley instanceof Components.Animator) {
            componentHTML = `<div class="component-header">${iconHTML}<h4>Animator</h4></div><p>Controller: ${ley.controllerPath || 'None'}</p>`;
        } else if (ley instanceof Components.Camera) {
            componentHTML = `<div class="component-header">${iconHTML}<h4>Camera</h4></div>
            <div class="component-grid"><label>Size</label><input type="number" class="prop-input" data-component="Camera" data-prop="orthographicSize" value="${ley.orthographicSize}"></div>`;
        }

        componentsWrapper.innerHTML += componentHTML;
    });
    dom.inspectorContent.appendChild(componentsWrapper);

    const addComponentBtn = document.createElement('button');
    addComponentBtn.id = 'add-component-btn';
    addComponentBtn.className = 'add-component-btn';
    addComponentBtn.textContent = 'Añadir Ley';
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
                await extractFramesFromSheetCallback(assetPath, metaData, animName, dirHandle);
                if (updateAssetBrowserCallback) {
                    await updateAssetBrowserCallback();
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
