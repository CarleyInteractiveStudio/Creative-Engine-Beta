// js/editor/ui/AssetImportModalWindow.js
import { showNotification } from './DialogWindow.js';
import { CMModelConverter } from '../../engine/CMModelConverter.js';

let modalElement = null;
let currentFiles = []; // Array of File or FileHandle objects
let selectedFileIndices = new Set();
let selectedFileIndex = 0; // Currently focused file for preview
let targetDirHandle = null;
let onCompleteCallback = null;

// Sprite sheet preview animation state
let previewAnimFrame = 0;
let previewAnimTimer = null;
let isPreviewPlaying = true;
let currentImageObj = null;

// 3D WebGL Turntable Preview State
let currentCMData = null;
let preview3DAngle = 0;
let preview3DTimer = null;

export function initializeAssetImportModal() {
    if (document.getElementById('asset-import-modal')) return;

    modalElement = document.createElement('div');
    modalElement.id = 'asset-import-modal';
    modalElement.className = 'modal';
    modalElement.style.display = 'none';
    modalElement.innerHTML = `
        <div class="modal-content asset-import-modal-content" style="width: 980px; max-width: 95vw; height: 700px; max-height: 92vh; display: flex; flex-direction: column; padding: 0; background: #1e1e24; color: #e0e0e0; border-radius: 8px; overflow: hidden; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.7);">
            <!-- Header -->
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #18181c; border-bottom: 1px solid #2d2d35;">
                <h3 style="margin: 0; font-size: 1.1rem; color: #4da6ff; display: flex; align-items: center; gap: 8px;">
                    <img src="icons/box.svg" class="ce-icon" style="width: 20px; height: 20px;"> Importador de Assets 3D y Modelos (.CM / GLTF)
                </h3>
                <button class="close-button" id="import-modal-close" style="background: none; border: none; color: #888; font-size: 1.4rem; cursor: pointer;">&times;</button>
            </div>

            <!-- Body (3 Columns: File List + Settings + Live Preview) -->
            <div style="display: flex; flex: 1; overflow: hidden;">
                <!-- Left Sidebar: File List -->
                <div style="width: 250px; background: #141418; border-right: 1px solid #2d2d35; display: flex; flex-direction: column;">
                    <div style="padding: 10px 15px; border-bottom: 1px solid #2d2d35; display: flex; justify-content: space-between; align-items: center; background: #1a1a20;">
                        <span style="font-size: 0.85rem; font-weight: bold; color: #aaa;">Archivos (<span id="import-file-count">0</span>)</span>
                        <div>
                            <button id="import-select-all" style="background: none; border: none; color: #4da6ff; font-size: 0.75rem; cursor: pointer; padding: 2px 4px;">Todos</button>
                            <span style="color: #444;">|</span>
                            <button id="import-deselect-all" style="background: none; border: none; color: #888; font-size: 0.75rem; cursor: pointer; padding: 2px 4px;">Ninguno</button>
                        </div>
                    </div>
                    <div id="import-file-list" style="flex: 1; overflow-y: auto; padding: 8px;">
                        <!-- List items injected dynamically -->
                    </div>
                </div>

                <!-- Center: Inspector Settings -->
                <div style="width: 350px; padding: 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; background: #1e1e24; border-right: 1px solid #2d2d35;">
                    <div style="border-bottom: 1px solid #2d2d35; padding-bottom: 6px;">
                        <h4 style="margin: 0; font-size: 0.95rem; color: #fff;">Configuración de Importación</h4>
                        <p style="margin: 4px 0 0 0; font-size: 0.78rem; color: #888;" id="import-selection-subtitle">Modificando selección actual</p>
                    </div>

                    <!-- Option 1: Asset Type -->
                    <div class="import-field-group">
                        <label style="font-size: 0.82rem; font-weight: bold; color: #ccc; display: block; margin-bottom: 4px;">Tipo de Asset / Modelo:</label>
                        <select id="import-img-type" style="width: 100%; padding: 7px 10px; background: #121215; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.85rem;">
                            <option value="Model3D">Modelo 3D (.CM / GLTF / GLB)</option>
                            <option value="Sprite">Sprite (2D/3D Quad)</option>
                            <option value="Textura">Textura Albedo (Superficie 3D)</option>
                            <option value="Normal Map">Normal Map (Relieve 3D)</option>
                            <option value="Hoja de Animacion">Hoja de Animación (Sprite Sheet)</option>
                        </select>
                    </div>

                    <!-- Model 3D Options (Dynamic) -->
                    <div id="import-model3d-options" style="display: flex; background: #141418; padding: 12px; border-radius: 6px; border: 1px solid #333; gap: 8px; flex-direction: column;">
                        <span style="font-size: 0.8rem; font-weight: bold; color: #4da6ff;">Ajustes de Conversión Carley Model (.CM)</span>
                        <label style="font-size: 0.75rem; color: #ccc; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="import-normalize-blender" checked style="cursor: pointer;">
                            Normalizar Rotaciones de Blender (Z-Up -> Y-Up)
                        </label>
                        <label style="font-size: 0.75rem; color: #ccc; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="import-extract-textures" checked style="cursor: pointer;">
                            Extraer Texturas Integradas (.png/.jpg)
                        </label>
                        <label style="font-size: 0.75rem; color: #ccc; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="import-extract-anims" checked style="cursor: pointer;">
                            Extraer Clips de Animación (.cea3d)
                        </label>
                    </div>

                    <!-- Sprite Sheet Controls (Dynamic) -->
                    <div id="import-spritesheet-options" style="display: none; background: #141418; padding: 12px; border-radius: 6px; border: 1px solid #333; gap: 10px; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.8rem; font-weight: bold; color: #4da6ff;">Ajustes de Hoja de Animación</span>
                            <button id="import-auto-slice-btn" style="padding: 2px 8px; background: #007acc; border: none; color: #fff; border-radius: 3px; font-size: 0.72rem; cursor: pointer;">Auto-Detección</button>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <div style="flex: 1;">
                                <label style="font-size: 0.75rem; color: #aaa; display: block; margin-bottom: 2px;">Columnas (X):</label>
                                <input type="number" id="import-sheet-cols" value="4" min="1" max="64" style="width: 100%; padding: 5px; background: #0d0d10; border: 1px solid #3a3a45; color: #fff; border-radius: 3px; font-size: 0.82rem;">
                            </div>
                            <div style="flex: 1;">
                                <label style="font-size: 0.75rem; color: #aaa; display: block; margin-bottom: 2px;">Filas (Y):</label>
                                <input type="number" id="import-sheet-rows" value="4" min="1" max="64" style="width: 100%; padding: 5px; background: #0d0d10; border: 1px solid #3a3a45; color: #fff; border-radius: 3px; font-size: 0.82rem;">
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <div style="flex: 1;">
                                <label style="font-size: 0.75rem; color: #aaa; display: block; margin-bottom: 2px;">Velocidad FPS:</label>
                                <input type="number" id="import-sheet-fps" value="12" min="1" max="60" style="width: 100%; padding: 5px; background: #0d0d10; border: 1px solid #3a3a45; color: #fff; border-radius: 3px; font-size: 0.82rem;">
                            </div>
                        </div>
                    </div>

                    <!-- Option 2: GR & Tag -->
                    <div style="display: flex; gap: 10px;">
                        <div class="import-field-group" style="flex: 1;">
                            <label style="font-size: 0.82rem; font-weight: bold; color: #ccc; display: block; margin-bottom: 4px;">GR (Render Group):</label>
                            <select id="import-gr-layer" style="width: 100%; padding: 7px 10px; background: #121215; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.85rem;">
                                <!-- Dynamically populated -->
                            </select>
                        </div>
                        <div class="import-field-group" style="flex: 1;">
                            <label style="font-size: 0.82rem; font-weight: bold; color: #ccc; display: block; margin-bottom: 4px;">Tag (Etiqueta):</label>
                            <select id="import-tag" style="width: 100%; padding: 7px 10px; background: #121215; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.85rem;">
                                <!-- Dynamically populated -->
                            </select>
                        </div>
                    </div>

                    <!-- Option 3: Max Resolution Optimization -->
                    <div class="import-field-group">
                        <label style="font-size: 0.82rem; font-weight: bold; color: #ccc; display: block; margin-bottom: 4px;">Optimización de Calidad (Máx. Píxeles):</label>
                        <select id="import-max-resolution" style="width: 100%; padding: 7px 10px; background: #121215; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.85rem;">
                            <option value="original">Original (Sin Redimensionar)</option>
                            <option value="2048">2048 x 2048 px</option>
                            <option value="1024">1024 x 1024 px</option>
                            <option value="512">512 x 512 px</option>
                            <option value="256">256 x 256 px</option>
                            <option value="128">128 x 128 px</option>
                        </select>
                    </div>

                    <!-- Option 4: Target Location & New Folder -->
                    <div class="import-field-group">
                        <label style="font-size: 0.82rem; font-weight: bold; color: #ccc; display: block; margin-bottom: 4px;">Carpeta Destino:</label>
                        <div style="display: flex; gap: 6px;">
                            <select id="import-target-folder" style="flex: 1; padding: 7px 10px; background: #121215; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.85rem;">
                                <option value="Assets">Assets/</option>
                            </select>
                            <button id="import-new-folder-btn" style="padding: 7px 10px; background: #2b2b36; border: 1px solid #3a3a45; color: #4da6ff; border-radius: 4px; cursor: pointer; font-size: 0.78rem; font-weight: bold; white-space: nowrap;">
                                + Carpeta
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Right: Live Visual Preview & WebGL 3D Turntable Player -->
                <div style="flex: 1; padding: 18px; display: flex; flex-direction: column; background: #16161a; gap: 12px; align-items: center; justify-content: center;">
                    <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.85rem; font-weight: bold; color: #aaa;">Vista Previa 3D / 2D en Tiempo Real</span>
                        <span id="import-img-dimensions" style="font-size: 0.78rem; color: #4da6ff;">0 x 0 px</span>
                    </div>

                    <!-- Interactive Canvas Container -->
                    <div style="width: 100%; flex: 1; background: #0d0d10; border: 1px solid #2d2d35; border-radius: 6px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background-image: radial-gradient(#222 1px, transparent 1px); background-size: 16px 16px;">
                        <canvas id="import-preview-canvas" style="max-width: 95%; max-height: 95%; object-fit: contain; image-rendering: pixelated;"></canvas>
                    </div>

                    <!-- Animation Playback Controls (Visible for Sprite Sheets) -->
                    <div id="import-anim-controls" style="display: none; width: 100%; justify-content: center; align-items: center; gap: 10px; padding: 6px; background: #1c1c22; border-radius: 4px; border: 1px solid #2a2a32;">
                        <button id="import-play-pause-btn" style="padding: 4px 12px; background: #007acc; border: none; color: #fff; border-radius: 3px; font-size: 0.78rem; cursor: pointer; font-weight: bold;">Pausar</button>
                        <span id="import-frame-counter" style="font-size: 0.78rem; color: #aaa; font-family: monospace;">Frame: 1 / 16</span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div style="padding: 12px 20px; background: #18181c; border-top: 1px solid #2d2d35; display: flex; justify-content: flex-end; gap: 10px;">
                <button id="import-cancel-btn" style="padding: 8px 16px; background: #2d2d35; border: none; color: #ccc; border-radius: 4px; cursor: pointer; font-size: 0.88rem;">Cancelar</button>
                <button id="import-confirm-btn" style="padding: 8px 20px; background: #007acc; border: none; color: #fff; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.88rem; box-shadow: 0 2px 8px rgba(0,122,204,0.4);">
                    Importar (<span id="import-confirm-count">0</span>)
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modalElement);
    setupEvents();
}

function setupEvents() {
    document.getElementById('import-modal-close').onclick = hideModal;
    document.getElementById('import-cancel-btn').onclick = hideModal;

    document.getElementById('import-select-all').onclick = () => {
        selectedFileIndices = new Set(currentFiles.map((_, i) => i));
        renderFileList();
    };

    document.getElementById('import-deselect-all').onclick = () => {
        selectedFileIndices.clear();
        renderFileList();
    };

    document.getElementById('import-new-folder-btn').onclick = createNewFolder;
    document.getElementById('import-confirm-btn').onclick = executeImport;

    const imgTypeSelect = document.getElementById('import-img-type');
    imgTypeSelect.onchange = () => {
        const type = imgTypeSelect.value;
        const isSheet = type === 'Hoja de Animacion';
        const isModel = type === 'Model3D';

        document.getElementById('import-spritesheet-options').style.display = isSheet ? 'flex' : 'none';
        document.getElementById('import-anim-controls').style.display = isSheet ? 'flex' : 'none';
        document.getElementById('import-model3d-options').style.display = isModel ? 'flex' : 'none';

        if (isSheet && currentImageObj) {
            autoSliceSpriteSheet();
        }
        updatePreview();
    };

    document.getElementById('import-sheet-cols').oninput = updatePreview;
    document.getElementById('import-sheet-rows').oninput = updatePreview;
    document.getElementById('import-sheet-fps').oninput = updatePreview;

    document.getElementById('import-auto-slice-btn').onclick = () => {
        if (currentImageObj) autoSliceSpriteSheet();
    };

    document.getElementById('import-play-pause-btn').onclick = () => {
        isPreviewPlaying = !isPreviewPlaying;
        document.getElementById('import-play-pause-btn').textContent = isPreviewPlaying ? 'Pausar' : 'Reproducir';
    };
}

function hideModal() {
    if (previewAnimTimer) clearInterval(previewAnimTimer);
    if (preview3DTimer) clearInterval(preview3DTimer);
    if (modalElement) {
        modalElement.classList.remove('is-open');
        modalElement.style.display = 'none';
    }
}

async function populateFolders(projectsDirHandle) {
    const folderSelect = document.getElementById('import-target-folder');
    folderSelect.innerHTML = '<option value="Assets">Assets/</option>';

    if (!projectsDirHandle) return;

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

        async function collectFolders(handle, path) {
            for await (const entry of handle.values()) {
                if (entry.kind === 'directory') {
                    const fullPath = `${path}/${entry.name}`;
                    const opt = document.createElement('option');
                    opt.value = fullPath;
                    opt.textContent = fullPath + '/';
                    folderSelect.appendChild(opt);
                    await collectFolders(entry, fullPath);
                }
            }
        }
        await collectFolders(assetsHandle, 'Assets');
    } catch (e) {
        console.warn("[AssetImportModal] Error loading folder tree:", e);
    }
}

function populateDropdowns() {
    const grSelect = document.getElementById('import-gr-layer');
    const tagSelect = document.getElementById('import-tag');

    grSelect.innerHTML = '';
    tagSelect.innerHTML = '';

    const config = window.currentProjectConfig || {};

    const sortingLayers = config.layers?.sortingLayers || [
        'Default', 'TransparentFX', 'Ignore Raycast', 'UI', 'Agua', 'Background', 'Midground',
        'Foreground', 'Player', 'Enemy', 'Terrain', '3D_Models', 'Effects', 'Skybox', 'GUI', 'Custom_1', 'Custom_2'
    ];

    sortingLayers.forEach((layer, idx) => {
        if (!layer) return;
        const opt = document.createElement('option');
        opt.value = layer;
        opt.textContent = `GR ${idx}: ${layer}`;
        grSelect.appendChild(opt);
    });

    const tags = config.tags || ['Untagged', 'Player', 'Enemy', 'Ground', 'Bullet', 'Item', 'Obstacle', 'Water', 'NPC', 'Trigger'];
    tags.forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = tag;
        tagSelect.appendChild(opt);
    });
}

function renderFileList() {
    const container = document.getElementById('import-file-list');
    container.innerHTML = '';

    document.getElementById('import-file-count').textContent = currentFiles.length;
    document.getElementById('import-confirm-count').textContent = selectedFileIndices.size;

    const subtitle = document.getElementById('import-selection-subtitle');
    subtitle.textContent = `${selectedFileIndices.size} de ${currentFiles.length} archivo(s) seleccionado(s)`;

    currentFiles.forEach((f, idx) => {
        const fileName = f.name || f.fileHandle?.name || `Archivo ${idx + 1}`;
        const isSelected = selectedFileIndices.has(idx);
        const isFocused = selectedFileIndex === idx;

        const item = document.createElement('div');
        item.style.padding = '8px 10px';
        item.style.marginBottom = '4px';
        item.style.borderRadius = '4px';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.style.fontSize = '0.82rem';
        item.style.background = isFocused ? '#254a6b' : (isSelected ? '#1e3850' : '#18181d');
        item.style.border = isFocused ? '1px solid #00a8ff' : (isSelected ? '1px solid #4da6ff' : '1px solid transparent');
        item.style.color = isSelected ? '#fff' : '#aaa';

        item.innerHTML = `
            <input type="checkbox" ${isSelected ? 'checked' : ''} style="cursor: pointer;">
            <img src="icons/file.svg" class="ce-icon" style="width: 14px; height: 14px; opacity: 0.7;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${fileName}</span>
        `;

        item.onclick = (e) => {
            selectedFileIndex = idx;
            if (e.target.tagName !== 'INPUT') {
                if (selectedFileIndices.has(idx)) selectedFileIndices.delete(idx);
                else selectedFileIndices.add(idx);
            } else {
                if (e.target.checked) selectedFileIndices.add(idx);
                else selectedFileIndices.delete(idx);
            }
            renderFileList();
            loadFocusedFileForPreview();
        };

        container.appendChild(item);
    });
}

async function loadFocusedFileForPreview() {
    if (currentFiles.length === 0 || selectedFileIndex < 0 || selectedFileIndex >= currentFiles.length) {
        currentImageObj = null;
        currentCMData = null;
        updatePreview();
        return;
    }

    const item = currentFiles[selectedFileIndex];
    let fileObj = item;
    if (item.getFile) {
        fileObj = await item.getFile();
    }

    const fileName = fileObj.name || 'file.png';
    const lowerName = fileName.toLowerCase();

    // 1. If 3D Model (.gltf / .glb)
    if (lowerName.endsWith('.gltf') || lowerName.endsWith('.glb')) {
        document.getElementById('import-img-type').value = 'Model3D';
        document.getElementById('import-spritesheet-options').style.display = 'none';
        document.getElementById('import-anim-controls').style.display = 'none';
        document.getElementById('import-model3d-options').style.display = 'flex';

        try {
            const converted = await CMModelConverter.convertGLTFToCM(fileObj, fileName);
            currentCMData = converted.cmData;
            document.getElementById('import-img-dimensions').textContent = `3D: ${currentCMData.meshes.length} Sub-Malla(s)`;
            update3DTurntablePreview();
        } catch (e) {
            console.error("Error al convertir modelo 3D para vista previa:", e);
            currentCMData = null;
            updatePreview();
        }
        return;
    }

    // 2. Image File
    if (fileObj.type && !fileObj.type.startsWith('image/')) {
        currentImageObj = null;
        currentCMData = null;
        updatePreview();
        return;
    }

    const url = URL.createObjectURL(fileObj);
    const img = new Image();
    img.onload = () => {
        URL.revokeObjectURL(url);
        currentImageObj = img;
        currentCMData = null;
        document.getElementById('import-img-dimensions').textContent = `${img.width} x ${img.height} px`;

        const imgTypeSelect = document.getElementById('import-img-type');
        if (imgTypeSelect.value === 'Hoja de Animacion') {
            autoSliceSpriteSheet();
        }
        updatePreview();
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
        currentImageObj = null;
        currentCMData = null;
        updatePreview();
    };
    img.src = url;
}

function update3DTurntablePreview() {
    if (preview3DTimer) clearInterval(preview3DTimer);

    const canvas = document.getElementById('import-preview-canvas');
    if (!canvas || !currentCMData) return;

    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    preview3DAngle = 0;
    const drawTurntableFrame = () => {
        ctx.clearRect(0, 0, 320, 320);

        // Simple Wireframe 3D Projection Turntable for CM Model
        ctx.save();
        ctx.translate(160, 160);
        ctx.strokeStyle = '#00a8ff';
        ctx.lineWidth = 1.5;

        const rad = (preview3DAngle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        if (currentCMData.meshes) {
            for (const mesh of currentCMData.meshes) {
                for (const primitive of mesh.primitives) {
                    const positions = primitive.positions;
                    if (!positions || positions.length < 6) continue;

                    ctx.beginPath();
                    const step = positions.length > 3000 ? 18 : 6;
                    for (let i = 0; i < positions.length; i += step) {
                        const x = positions[i];
                        const y = positions[i + 1];
                        const z = positions[i + 2];

                        // Rotate Y-axis turntable
                        const rotX = x * cos - z * sin;
                        const rotZ = x * sin + z * cos;

                        // Perspective projection
                        const scale = 220 / (250 + rotZ);
                        const projX = rotX * scale;
                        const projY = -y * scale;

                        if (i === 0) ctx.moveTo(projX, projY);
                        else ctx.lineTo(projX, projY);
                    }
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
        preview3DAngle = (preview3DAngle + 1.5) % 360;
    };

    drawTurntableFrame();
    preview3DTimer = setInterval(drawTurntableFrame, 30);
}

function autoSliceSpriteSheet() {
    if (!currentImageObj) return;

    const width = currentImageObj.width;
    const height = currentImageObj.height;

    let cols = 4;
    let rows = 4;

    if (width === height) {
        cols = 4; rows = 4;
    } else if (width > height) {
        cols = Math.round(width / (height / 2)) || 4;
        rows = 2;
    } else {
        rows = Math.round(height / (width / 2)) || 4;
        cols = 2;
    }

    document.getElementById('import-sheet-cols').value = Math.max(1, cols);
    document.getElementById('import-sheet-rows').value = Math.max(1, rows);
}

function updatePreview() {
    if (previewAnimTimer) clearInterval(previewAnimTimer);
    if (preview3DTimer) clearInterval(preview3DTimer);

    const canvas = document.getElementById('import-preview-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const imgType = document.getElementById('import-img-type').value;

    if (imgType === 'Model3D' && currentCMData) {
        update3DTurntablePreview();
        return;
    }

    if (!currentImageObj) {
        canvas.width = 300;
        canvas.height = 200;
        ctx.clearRect(0, 0, 300, 200);
        ctx.fillStyle = '#666';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin Vista Previa de Imagen / Modelo', 150, 105);
        return;
    }

    if (imgType !== 'Hoja de Animacion') {
        canvas.width = currentImageObj.width;
        canvas.height = currentImageObj.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(currentImageObj, 0, 0);
        return;
    }

    // Sprite Sheet Animated Preview Logic
    const cols = parseInt(document.getElementById('import-sheet-cols').value, 10) || 1;
    const rows = parseInt(document.getElementById('import-sheet-rows').value, 10) || 1;
    const fps = parseInt(document.getElementById('import-sheet-fps').value, 10) || 12;

    const frameWidth = Math.floor(currentImageObj.width / cols);
    const frameHeight = Math.floor(currentImageObj.height / rows);

    canvas.width = frameWidth;
    canvas.height = frameHeight;

    const totalFrames = cols * rows;
    previewAnimFrame = 0;

    const drawFrame = () => {
        const frameIdx = previewAnimFrame % totalFrames;
        const col = frameIdx % cols;
        const row = Math.floor(frameIdx / cols);

        ctx.clearRect(0, 0, frameWidth, frameHeight);
        ctx.drawImage(
            currentImageObj,
            col * frameWidth, row * frameHeight, frameWidth, frameHeight,
            0, 0, frameWidth, frameHeight
        );

        const counter = document.getElementById('import-frame-counter');
        if (counter) counter.textContent = `Frame: ${frameIdx + 1} / ${totalFrames}`;

        if (isPreviewPlaying) {
            previewAnimFrame++;
        }
    };

    drawFrame();
    previewAnimTimer = setInterval(drawFrame, 1000 / fps);
}

async function createNewFolder() {
    const folderName = prompt('Nombre de la nueva carpeta:');
    if (!folderName || !folderName.trim()) return;

    const cleanName = folderName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const folderSelect = document.getElementById('import-target-folder');
    const parentPath = folderSelect.value;
    const newFolderPath = `${parentPath}/${cleanName}`;

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        let currentHandle = await window.projectsDirHandle.getDirectoryHandle(projectName);

        const parts = parentPath.split('/');
        for (const part of parts) {
            if (part) currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        await currentHandle.getDirectoryHandle(cleanName, { create: true });

        const opt = document.createElement('option');
        opt.value = newFolderPath;
        opt.textContent = newFolderPath + '/';
        folderSelect.appendChild(opt);
        folderSelect.value = newFolderPath;

        showNotification('Carpeta Creada', `Carpeta '${cleanName}' creada exitosamente.`);
    } catch (e) {
        console.error("Error al crear carpeta:", e);
        showNotification('Error', `No se pudo crear la carpeta: ${e.message}`);
    }
}

async function resizeImageIfNeeded(file, maxRes) {
    if (maxRes === 'original') return file;

    const maxDim = parseInt(maxRes, 10);
    if (isNaN(maxDim) || maxDim <= 0) return file;

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            if (img.width <= maxDim && img.height <= maxDim) {
                resolve(file); // No resize needed
                return;
            }

            let w = img.width;
            let h = img.height;
            if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
            } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            canvas.toBlob((blob) => {
                if (blob) {
                    const resizedFile = new File([blob], file.name, { type: file.type || 'image/png' });
                    resolve(resizedFile);
                } else {
                    resolve(file);
                }
            }, file.type || 'image/png');
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };
        img.src = url;
    });
}

async function executeImport() {
    if (selectedFileIndices.size === 0) {
        showNotification('Aviso', 'Selecciona al menos un archivo para importar.');
        return;
    }

    const imgType = document.getElementById('import-img-type').value;
    const grLayer = document.getElementById('import-gr-layer').value;
    const tag = document.getElementById('import-tag').value;
    const maxRes = document.getElementById('import-max-resolution').value;
    const targetFolder = document.getElementById('import-target-folder').value;

    const filesToImport = Array.from(selectedFileIndices).map(idx => currentFiles[idx]);

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        let targetHandle = await window.projectsDirHandle.getDirectoryHandle(projectName);

        const parts = targetFolder.split('/');
        for (const part of parts) {
            if (part) targetHandle = await targetHandle.getDirectoryHandle(part, { create: true });
        }

        for (const item of filesToImport) {
            let fileObj = item;
            if (item.getFile) {
                fileObj = await item.getFile();
            }

            const fileName = fileObj.name;
            const lowerName = fileName.toLowerCase();

            // 1. Process 3D Model Conversion (.gltf / .glb -> .cm)
            if (lowerName.endsWith('.gltf') || lowerName.endsWith('.glb')) {
                const baseName = fileName.split('.')[0];
                const cmFileName = `${baseName}.cm`;

                const converted = await CMModelConverter.convertGLTFToCM(fileObj, fileName);

                // Write .cm file
                const cmHandle = await targetHandle.getFileHandle(cmFileName, { create: true });
                const cmWritable = await cmHandle.createWritable();
                await cmWritable.write(JSON.stringify(converted.cmData, null, 2));
                await cmWritable.close();

                // Write extracted textures
                if (document.getElementById('import-extract-textures').checked && converted.textures) {
                    for (const tex of converted.textures) {
                        const texHandle = await targetHandle.getFileHandle(tex.name, { create: true });
                        const texWritable = await texHandle.createWritable();
                        await texWritable.write(tex.blob);
                        await texWritable.close();
                    }
                }

                // Write extracted animation clips (.cea3d)
                if (document.getElementById('import-extract-anims').checked && converted.animations) {
                    for (const anim of converted.animations) {
                        const animHandle = await targetHandle.getFileHandle(anim.name, { create: true });
                        const animWritable = await animHandle.createWritable();
                        await animWritable.write(JSON.stringify(anim.data, null, 2));
                        await animWritable.close();
                    }
                }

                // Write .cm.meta file
                const metaData = {
                    assetType: 'CarleyModel',
                    layer: grLayer,
                    tag: tag,
                    importDate: new Date().toISOString()
                };

                const metaHandle = await targetHandle.getFileHandle(`${cmFileName}.meta`, { create: true });
                const metaWritable = await metaHandle.createWritable();
                await metaWritable.write(JSON.stringify(metaData, null, 2));
                await metaWritable.close();

                continue;
            }

            // 2. Process Image / Texture
            const processedFile = await resizeImageIfNeeded(fileObj, maxRes);

            const fileHandle = await targetHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(processedFile);
            await writable.close();

            const cols = parseInt(document.getElementById('import-sheet-cols').value, 10) || 1;
            const rows = parseInt(document.getElementById('import-sheet-rows').value, 10) || 1;
            const fps = parseInt(document.getElementById('import-sheet-fps').value, 10) || 12;

            const metaData = {
                imageType: imgType,
                layer: grLayer,
                tag: tag,
                maxResolution: maxRes,
                spriteSheet: imgType === 'Hoja de Animacion' ? { columns: cols, rows: rows, fps: fps } : null,
                importDate: new Date().toISOString()
            };

            const metaHandle = await targetHandle.getFileHandle(`${fileName}.meta`, { create: true });
            const metaWritable = await metaHandle.createWritable();
            await metaWritable.write(JSON.stringify(metaData, null, 2));
            await metaWritable.close();
        }

        hideModal();
        showNotification('Importación Completada', `${filesToImport.length} asset(s) convertidos e importados en '${targetFolder}/'`);

        if (typeof onCompleteCallback === 'function') {
            onCompleteCallback();
        }
    } catch (e) {
        console.error("Error en la importación de assets:", e);
        showNotification('Error de Importación', e.message);
    }
}

export async function showAssetImportModal(files, defaultTargetDirHandle = null, onComplete = null) {
    initializeAssetImportModal();

    currentFiles = Array.from(files);
    selectedFileIndices = new Set(currentFiles.map((_, i) => i));
    selectedFileIndex = 0;
    targetDirHandle = defaultTargetDirHandle;
    onCompleteCallback = onComplete;

    populateDropdowns();
    await populateFolders(window.projectsDirHandle);
    renderFileList();
    loadFocusedFileForPreview();

    modalElement.style.display = 'flex';
    modalElement.classList.add('is-open');
}
