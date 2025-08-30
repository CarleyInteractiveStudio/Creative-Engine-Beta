// --- Inspector Module ---

import * as SceneManager from '../../engine/SceneManager.ts';
import * as Components from '../../engine/Components.ts';

// --- Module-level State ---
let dom: any = {};
let projectsDirHandle: FileSystemDirectoryHandle | null = null;
let currentDirectoryHandle: any | null = null;
let selectedMateria: any | null = null;
let currentProjectConfig: any = {};
let markdownConverter: any = null;

// Forward declaration for circular dependency
let showAddComponentModal: () => void = () => {};

// --- Private Functions ---

async function _updateInspectorForAsset(assetName: string, assetPath: string): Promise<void> {
    if (!assetName) {
        dom.inspectorContent.innerHTML = `<p class="inspector-placeholder">Selecciona un asset</p>`;
        return;
    }

    dom.inspectorContent.innerHTML = `<h4>Asset: ${assetName}</h4>`;

    try {
        const fileHandle = await currentDirectoryHandle.handle.getFileHandle(assetName);
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
        } else if (assetName.endsWith('.png') || assetName.endsWith('.jpg')) {
            let metaData: any = { textureType: 'Sprite (2D and UI)' }; // Default
            try {
                const metaFileHandle = await currentDirectoryHandle.handle.getFileHandle(`${assetName}.meta`);
                const metaFile = await metaFileHandle.getFile();
                metaData = JSON.parse(await metaFile.text());
            } catch (e) {
                // Meta file doesn't exist, will be created on first change.
            }

            const settingsContainer = document.createElement('div');
            settingsContainer.className = 'asset-settings';
            settingsContainer.innerHTML = `
                <label for="texture-type">Texture Type</label>
                <select id="texture-type" data-asset-name="${assetName}">
                    <option value="Default" ${metaData.textureType === 'Default' ? 'selected' : ''}>Default</option>
                    <option value="Sprite (2D and UI)" ${metaData.textureType === 'Sprite (2D and UI)' ? 'selected' : ''}>Sprite (2D and UI)</option>
                    <option value="Normal Map" ${metaData.textureType === 'Normal Map' ? 'selected' : ''}>Normal Map</option>
                </select>
                <hr>
                <div class="preview-container">
                    <img id="inspector-preview-img" src="" alt="Preview">
                </div>
            `;
            dom.inspectorContent.appendChild(settingsContainer);
            const imgElement = document.getElementById('inspector-preview-img') as HTMLImageElement;
            if (imgElement && assetPath) {
                const url = await SceneManager.getURLForAssetPath(assetPath, projectsDirHandle);
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
            anim.frames.forEach((frameSrc: string) => {
                const img = document.createElement('img');
                img.src = frameSrc; // These are data URLs from the .cea file
                timeline.appendChild(img);
            });

            const controls = document.createElement('div');
            const playBtn = document.createElement('button');
            playBtn.textContent = '▶️ Play';

            let isPlaying = false;
            let playbackId: number | null = null;
            let currentFrame = 0;

            playBtn.addEventListener('click', () => {
                isPlaying = !isPlaying;
                if (isPlaying) {
                    playBtn.textContent = '⏹️ Stop';
                    let lastTime = performance.now();

                    function loop(time: number) {
                        if (!isPlaying) return;
                        if (time - lastTime > (1000 / anim.speed)) {
                            lastTime = time;
                            currentFrame = (currentFrame + 1) % anim.frames.length;
                            timeline.childNodes.forEach((node, i) => (node as HTMLElement).style.border = i === currentFrame ? '2px solid var(--accent-color)' : 'none');
                        }
                       playbackId = requestAnimationFrame(loop);
                    }
                    playbackId = requestAnimationFrame(loop);

                } else {
                    playBtn.textContent = '▶️ Play';
                    if (playbackId) cancelAnimationFrame(playbackId);
                    timeline.childNodes.forEach(node => (node as HTMLElement).style.border = 'none');
                }
            });

            controls.appendChild(playBtn);
            previewContainer.appendChild(frameCount);
            previewContainer.appendChild(timeline);
            previewContainer.appendChild(controls);
            dom.inspectorContent.appendChild(previewContainer);

        } else if (assetName.endsWith('.cep')) {
            try {
                const zip = await (window as any).JSZip.loadAsync(file);
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


// --- Public API ---

export async function updateInspector(currentSelectedMateria: any): Promise<void> {
    selectedMateria = currentSelectedMateria; // Update internal state
    if (!dom.inspectorContent) return;
    dom.inspectorContent.innerHTML = '';
    if (!selectedMateria) {
        const selectedAsset = dom.assetGridView.querySelector('.grid-item.active');
        if(selectedAsset) {
            await _updateInspectorForAsset(selectedAsset.dataset.name, selectedAsset.dataset.path);
        } else {
            dom.inspectorContent.innerHTML = '<p class="inspector-placeholder">Nada seleccionado</p>';
        }
        return;
    }

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
        currentProjectConfig.layers.sortingLayers.forEach((layerName: string) => {
            const option = document.createElement('option');
            option.value = layerName;
            option.textContent = layerName;
            if (selectedMateria.layer === layerName) {
                option.selected = true;
            }
            layerSelect.appendChild(option);
        });
        layerSelect.addEventListener('change', (e: any) => {
            if (selectedMateria) {
                selectedMateria.layer = e.target.value;
            }
        });
    }

    const componentIcons: { [key: string]: string } = {
        Transform: '✥', Rigidbody: '🏋️', BoxCollider: '🟩', SpriteRenderer: '🖼️',
        Animator: '🏃', Camera: '📷', CreativeScript: 'image/Script.png',
        RectTransform: '⎚', UICanvas: '🖼️', UIImage: '🏞️'
    };

    const componentsWrapper = document.createElement('div');
    componentsWrapper.className = 'inspector-components-wrapper';

    selectedMateria.leyes.forEach((ley: any) => {
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
    addComponentBtn.addEventListener('click', () => showAddComponentModal());
    dom.inspectorContent.appendChild(addComponentBtn);
}

export function initializeInspector(dependencies: any): void {
    dom = dependencies.dom;
    projectsDirHandle = dependencies.projectsDirHandle;
    currentDirectoryHandle = dependencies.currentDirectoryHandle;
    currentProjectConfig = dependencies.currentProjectConfig;
    markdownConverter = dependencies.markdownConverter;
    showAddComponentModal = dependencies.showAddComponentModal;

    console.log("Inspector module initialized.");
}
