// js/editor/ui/AssetImportModalWindow.js
import { showNotification } from './DialogWindow.js';
import { CMModelConverter } from '../../engine/CMModelConverter.js';
import { createFloatingPanel, bringToFront } from '../FloatingPanelManager.js';

let modalElement = null;
let currentFiles = []; // Array of File or FileHandle objects
let selectedFileIndices = new Set();
let selectedFileIndex = 0; // Currently focused file for preview
let targetDirHandle = null;
let onCompleteCallback = null;

// Sub-mesh selection tracking
let selectedSubMeshIndex = null; // null = entire model, number = specific mesh index

// Material asset creation state
let currentMaterialData = null;

// Sprite sheet preview animation state
let previewAnimFrame = 0;
let previewAnimTimer = null;
let isPreviewPlaying = true;
let currentImageObj = null;

// 3D WebGL Turntable Preview State
let currentCMData = null;
let currentConvertedModel = null;
let preview3DAngle = 0;
let preview3DPitch = 0.3; // Orbit pitch angle (radians)
let preview3DZoom = 1.0;  // Zoom scale multiplier
let preview3DPanX = 0;    // Center X offset
let preview3DPanY = 0;    // Center Y offset
let preview3DTimer = null;
let preview3DAutoRotate = true; // Auto-rotation toggle
let preview3DMode = 'solid_white'; // 'wireframe_green', 'solid_white', 'textured'
let textureImageMap = new Map(); // texture URI / name -> HTMLImageElement
let isOrbitDragging = false;
let lastMousePos = { x: 0, y: 0 };

export function initializeAssetImportModal() {
    if (document.getElementById('asset-import-modal')) return;

    const modalContentHTML = `
        <div class="asset-import-container" style="display: flex; flex-direction: column; height: 100%; width: 100%; background: #1e1e24; color: #e0e0e0; border-radius: 0 0 8px 8px; overflow: hidden;">

            <!-- Body (3 Columns: File List + Settings + Live Preview) -->
            <div style="display: flex; flex: 1; overflow: hidden;">
                <!-- Left Sidebar: File List & Expandable 3D Hierarchy -->
                <div style="width: 270px; background: #141418; border-right: 1px solid #2d2d35; display: flex; flex-direction: column;">
                    <div style="padding: 10px 15px; border-bottom: 1px solid #2d2d35; display: flex; flex-direction: column; gap: 6px; background: #1a1a20;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.85rem; font-weight: bold; color: #aaa;">Archivos (<span id="import-file-count">0</span>)</span>
                            <div>
                                <button id="import-select-all" style="background: none; border: none; color: #4da6ff; font-size: 0.75rem; cursor: pointer; padding: 2px 4px;">Todos</button>
                                <span style="color: #444;">|</span>
                                <button id="import-deselect-all" style="background: none; border: none; color: #888; font-size: 0.75rem; cursor: pointer; padding: 2px 4px;">Ninguno</button>
                            </div>
                        </div>
                        <button id="import-add-files-btn" style="width: 100%; padding: 5px 8px; background: #254a6b; border: 1px solid #00a8ff; color: #fff; border-radius: 4px; font-size: 0.78rem; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 4px;">
                            <span style="font-size: 1rem; line-height: 1;">+</span> Agregar Archivos / Modelos
                        </button>
                        <input type="file" id="import-file-picker-input" multiple style="display: none;" accept=".gltf,.glb,.obj,.mtl,.cm,.png,.jpg,.jpeg,.mp3,.wav,.ceScene,.cea,.ceanim,.ceprefab">
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
                            <option value="PintadoMaterial">Material 3D ("Pintado" Sphere)</option>
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
                            <input type="checkbox" id="import-normalize-blender" style="cursor: pointer;">
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
                        <div style="margin-top: 4px; border-top: 1px solid #282830; padding-top: 6px;">
                            <label style="font-size: 0.78rem; font-weight: bold; color: #ff9f43; display: block; margin-bottom: 4px;">Configuración de Polígonos (Optimización):</label>
                            <select id="import-poly-reduction" style="width: 100%; padding: 5px 8px; background: #0d0d10; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.78rem;">
                                <option value="1.0">Original 100% (Sin Reducción)</option>
                                <option value="0.75">Optimizado 75% Polígonos</option>
                                <option value="0.50">Ligero 50% Polígonos (Media Carga)</option>
                                <option value="0.25">Ultra Rápido 25% Polígonos (Bajo Peso)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Material "Pintado" Options (Dynamic) -->
                    <div id="import-material-options" style="display: none; background: #141418; padding: 12px; border-radius: 6px; border: 1px solid #333; gap: 10px; flex-direction: column;">
                        <span style="font-size: 0.8rem; font-weight: bold; color: #ff9f43;">Propiedades del Material ("Pintado")</span>
                        <div>
                            <label style="font-size: 0.75rem; color: #aaa; display: block; margin-bottom: 2px;">Color Principal (Albedo):</label>
                            <input type="color" id="import-mat-color" value="#00a8ff" style="width: 100%; height: 32px; background: none; border: 1px solid #3a3a45; border-radius: 4px; cursor: pointer;">
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <div style="flex: 1;">
                                <label style="font-size: 0.75rem; color: #aaa; display: block; margin-bottom: 2px;">Transparencia (Alfa):</label>
                                <input type="range" id="import-mat-alpha" min="0" max="1" step="0.01" value="1.0" style="width: 100%;">
                            </div>
                            <div style="flex: 1;">
                                <label style="font-size: 0.75rem; color: #aaa; display: block; margin-bottom: 2px;">Brillo / Especular:</label>
                                <input type="range" id="import-mat-shininess" min="0" max="1" step="0.01" value="0.5" style="width: 100%;">
                            </div>
                        </div>
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

                    <!-- Option 3: Max Resolution Optimization (Hidden for 3D Models / Materials) -->
                    <div class="import-field-group" id="import-max-resolution-group">
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
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.85rem; font-weight: bold; color: #aaa;">Vista Previa 3D / 2D</span>
                            <!-- 3D Render Mode Select -->
                            <select id="import-3d-render-mode" style="display: none; padding: 2px 6px; background: #121215; border: 1px solid #3a3a45; color: #4da6ff; border-radius: 4px; font-size: 0.75rem;">
                                <option value="solid_white">Modelo Sólido Blanco (Sin Triángulos)</option>
                                <option value="wireframe_green">Malla de Triángulos (Verde)</option>
                                <option value="textured">Modelo Texturizado (Con Texturas Extraídas)</option>
                            </select>
                            <label id="import-3d-autorotate-label" style="display: none; font-size: 0.75rem; color: #aaa; cursor: pointer; user-select: none; align-items: center; gap: 4px;">
                                <input type="checkbox" id="import-3d-autorotate-cb" checked style="cursor: pointer;"> Giro Auto.
                            </label>
                        </div>
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

    modalElement = createFloatingPanel('asset-import-modal', {
        title: 'Importador de Assets 3D y Modelos (.CM / GLTF)',
        content: modalContentHTML,
        width: 980,
        height: 700,
        top: 60,
        left: 120
    });
    modalElement.style.display = 'none';

    setupEvents();
}

function setupEvents() {
    const closeBtn = modalElement.querySelector('.close-panel-btn');
    if (closeBtn) closeBtn.onclick = hideModal;

    document.getElementById('import-cancel-btn').onclick = hideModal;

    document.getElementById('import-select-all').onclick = () => {
        selectedFileIndices = new Set(currentFiles.map((_, i) => i));
        renderFileList();
    };

    document.getElementById('import-deselect-all').onclick = () => {
        selectedFileIndices.clear();
        renderFileList();
    };

    const addFilesBtn = document.getElementById('import-add-files-btn');
    const filePickerInput = document.getElementById('import-file-picker-input');

    if (addFilesBtn && filePickerInput) {
        addFilesBtn.onclick = () => filePickerInput.click();
        filePickerInput.onchange = (e) => {
            if (e.target.files && e.target.files.length > 0) {
                appendFilesToImport(Array.from(e.target.files));
                filePickerInput.value = ''; // Reset input
            }
        };
    }

    const autoRotateCb = document.getElementById('import-3d-autorotate-cb');
    if (autoRotateCb) {
        autoRotateCb.onchange = () => {
            preview3DAutoRotate = autoRotateCb.checked;
        };
    }

    const polyReductionSelect = document.getElementById('import-poly-reduction');
    if (polyReductionSelect) {
        polyReductionSelect.onchange = () => {
            loadFocusedFileForPreview();
        };
    }

    document.getElementById('import-new-folder-btn').onclick = createNewFolder;
    document.getElementById('import-confirm-btn').onclick = executeImport;

    const imgTypeSelect = document.getElementById('import-img-type');
    imgTypeSelect.onchange = () => {
        const type = imgTypeSelect.value;
        const isSheet = type === 'Hoja de Animacion';
        const isModel = type === 'Model3D';
        const isMaterial = type === 'PintadoMaterial';

        document.getElementById('import-spritesheet-options').style.display = isSheet ? 'flex' : 'none';
        document.getElementById('import-anim-controls').style.display = isSheet ? 'flex' : 'none';
        document.getElementById('import-model3d-options').style.display = isModel ? 'flex' : 'none';
        document.getElementById('import-material-options').style.display = isMaterial ? 'flex' : 'none';
        document.getElementById('import-max-resolution-group').style.display = (isModel || isMaterial) ? 'none' : 'block';

        if (isSheet && currentImageObj) {
            autoSliceSpriteSheet();
        }
        updatePreview();
    };

    document.getElementById('import-mat-color').oninput = updatePreview;
    document.getElementById('import-mat-alpha').oninput = updatePreview;
    document.getElementById('import-mat-shininess').oninput = updatePreview;

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

    const renderModeSelect = document.getElementById('import-3d-render-mode');
    if (renderModeSelect) {
        renderModeSelect.onchange = () => {
            preview3DMode = renderModeSelect.value;
            if (currentCMData) {
                update3DTurntablePreview();
            }
        };
    }

    // Drag and Drop files directly into the modal window
    // Interactive 3D Orbit Camera Controls (Mouse Drag & Zoom)
    const previewCanvas = document.getElementById('import-preview-canvas');
    if (previewCanvas) {
        previewCanvas.addEventListener('mousedown', (e) => {
            if (!currentCMData) return;
            isOrbitDragging = true;
            lastMousePos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (!isOrbitDragging || !currentCMData) return;

            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;

            // Pure relative camera rotation relative to screen orientation (no panning)
            preview3DAngle = (preview3DAngle + dx * 0.6) % 360;
            preview3DPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, preview3DPitch + dy * 0.008));

            lastMousePos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            isOrbitDragging = false;
        });

        previewCanvas.addEventListener('wheel', (e) => {
            if (!currentCMData) return;
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            preview3DZoom = Math.max(0.2, Math.min(6.0, preview3DZoom * zoomFactor));
        });

        previewCanvas.addEventListener('contextmenu', (e) => {
            if (currentCMData) e.preventDefault();
        });
    }

    const container = modalElement.querySelector('.asset-import-container');
    container.addEventListener('dragover', (e) => {
        if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            container.style.border = '2px dashed #00a8ff';
        }
    });

    container.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.style.border = 'none';
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.style.border = 'none';

        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            appendFilesToImport(Array.from(e.dataTransfer.files));
        }
    });
}

function appendFilesToImport(newFiles) {
    if (!newFiles || newFiles.length === 0) return;

    const startIdx = currentFiles.length;
    currentFiles.push(...newFiles);
    newFiles.forEach((_, i) => selectedFileIndices.add(startIdx + i));
    selectedFileIndex = startIdx;

    renderFileList();
    loadFocusedFileForPreview();
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
        const is3DModel = fileName.toLowerCase().endsWith('.gltf') || fileName.toLowerCase().endsWith('.glb') || fileName.toLowerCase().endsWith('.cm');

        const itemContainer = document.createElement('div');
        itemContainer.style.marginBottom = '4px';

        const item = document.createElement('div');
        item.style.padding = '8px 10px';
        item.style.borderRadius = '4px';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.style.fontSize = '0.82rem';
        item.style.background = isFocused ? '#254a6b' : (isSelected ? '#1e3850' : '#18181d');
        item.style.border = isFocused ? '1px solid #00a8ff' : (isSelected ? '1px solid #4da6ff' : '1px solid transparent');
        item.style.color = isSelected ? '#fff' : '#aaa';

        const expandBtnHTML = is3DModel ? `<span class="import-expand-tree" style="font-size: 0.75rem; color: #4da6ff; cursor: pointer; user-select: none;">▼</span>` : '';

        item.innerHTML = `
            ${expandBtnHTML}
            <input type="checkbox" class="import-file-checkbox" ${isSelected ? 'checked' : ''} style="cursor: pointer;">
            <img src="${is3DModel ? 'icons/box.svg' : 'icons/file.svg'}" class="ce-icon" style="width: 14px; height: 14px; opacity: 0.8;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; font-weight: ${isFocused ? 'bold' : 'normal'}">${fileName}</span>
        `;

        const checkbox = item.querySelector('.import-file-checkbox');
        checkbox.onclick = (e) => {
            e.stopPropagation();
            if (checkbox.checked) {
                selectedFileIndices.add(idx);
            } else {
                selectedFileIndices.delete(idx);
            }
            document.getElementById('import-confirm-count').textContent = selectedFileIndices.size;
            document.getElementById('import-selection-subtitle').textContent = `${selectedFileIndices.size} de ${currentFiles.length} archivo(s) seleccionado(s)`;
        };

        item.onclick = (e) => {
            if (e.target.classList.contains('import-expand-tree') || e.target.classList.contains('import-file-checkbox')) return;

            selectedFileIndex = idx;
            selectedSubMeshIndex = null; // Reset sub-mesh to main model on model re-select

            renderFileList();
            loadFocusedFileForPreview();
        };

        itemContainer.appendChild(item);

        // Expandable Sub-mesh, Texture & Animation Hierarchy Tree for 3D models
        if (is3DModel && isFocused && currentCMData) {
            const hierarchyTree = document.createElement('div');
            hierarchyTree.className = 'import-submesh-tree';
            hierarchyTree.style.marginLeft = '20px';
            hierarchyTree.style.marginTop = '4px';
            hierarchyTree.style.display = 'flex';
            hierarchyTree.style.flexDirection = 'column';
            hierarchyTree.style.gap = '2px';

            if (currentCMData.meshes) {
                currentCMData.meshes.forEach((mesh, mIdx) => {
                    const subItem = document.createElement('div');
                    const isSubFocused = selectedSubMeshIndex === mIdx;

                    subItem.style.padding = '4px 8px';
                    subItem.style.borderRadius = '3px';
                    subItem.style.cursor = 'pointer';
                    subItem.style.fontSize = '0.76rem';
                    subItem.style.display = 'flex';
                    subItem.style.alignItems = 'center';
                    subItem.style.gap = '6px';
                    subItem.style.background = isSubFocused ? 'rgba(0, 168, 255, 0.25)' : '#121216';
                    subItem.style.border = isSubFocused ? '1px solid #00a8ff' : '1px solid #282830';
                    subItem.style.color = isSubFocused ? '#4da6ff' : '#bbb';

                    subItem.innerHTML = `
                        <span style="color: #666;">└</span>
                        <img src="icons/layers.svg" class="ce-icon" style="width: 12px; height: 12px; opacity: 0.7;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${mesh.name || `Sub-Malla ${mIdx + 1}`}</span>
                    `;

                    subItem.onclick = (e) => {
                        e.stopPropagation();
                        selectedSubMeshIndex = mIdx;
                        renderFileList();
                        update3DTurntablePreview();
                    };

                    hierarchyTree.appendChild(subItem);
                });
            }

            if (currentConvertedModel && currentConvertedModel.textures && currentConvertedModel.textures.length > 0) {
                currentConvertedModel.textures.forEach((tex) => {
                    const texItem = document.createElement('div');
                    texItem.style.padding = '3px 8px';
                    texItem.style.fontSize = '0.74rem';
                    texItem.style.display = 'flex';
                    texItem.style.alignItems = 'center';
                    texItem.style.gap = '6px';
                    texItem.style.color = '#a0e0a0';
                    texItem.style.cursor = 'pointer';

                    texItem.innerHTML = `
                        <span style="color: #666;">└</span>
                        <img src="icons/file.svg" class="ce-icon" style="width: 11px; height: 11px; opacity: 0.8;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">[Textura] ${tex.name}</span>
                    `;

                    texItem.onclick = (e) => {
                        e.stopPropagation();
                        if (preview3DTimer) clearInterval(preview3DTimer);
                        const texImg = textureImageMap.get(tex.name) || textureImageMap.get(tex.uri);
                        if (texImg && texImg.complete) {
                            currentImageObj = texImg;
                            document.getElementById('import-img-type').value = 'Textura';
                            document.getElementById('import-3d-render-mode').style.display = 'none';
                            document.getElementById('import-3d-autorotate-label').style.display = 'none';
                            updatePreview();
                        }
                    };

                    hierarchyTree.appendChild(texItem);
                });
            }

            if (currentConvertedModel && currentConvertedModel.animations && currentConvertedModel.animations.length > 0) {
                currentConvertedModel.animations.forEach((anim) => {
                    const animItem = document.createElement('div');
                    animItem.style.padding = '3px 8px';
                    animItem.style.fontSize = '0.74rem';
                    animItem.style.display = 'flex';
                    animItem.style.alignItems = 'center';
                    animItem.style.gap = '6px';
                    animItem.style.color = '#ffb366';

                    animItem.innerHTML = `
                        <span style="color: #666;">└</span>
                        <img src="icons/play.svg" class="ce-icon" style="width: 11px; height: 11px; opacity: 0.8;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">[Animación] ${anim.name}</span>
                    `;
                    hierarchyTree.appendChild(animItem);
                });
            }

            const expandBtn = item.querySelector('.import-expand-tree');
            if (expandBtn) {
                expandBtn.onclick = (e) => {
                    e.stopPropagation();
                    const isHidden = hierarchyTree.style.display === 'none';
                    hierarchyTree.style.display = isHidden ? 'flex' : 'none';
                    expandBtn.textContent = isHidden ? '▼' : '►';
                };
            }

            itemContainer.appendChild(hierarchyTree);
        }

        container.appendChild(itemContainer);
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

    // 1. If 3D Model (.gltf / .glb / .obj)
    if (lowerName.endsWith('.gltf') || lowerName.endsWith('.glb') || lowerName.endsWith('.obj')) {
        document.getElementById('import-img-type').value = 'Model3D';
        document.getElementById('import-spritesheet-options').style.display = 'none';
        document.getElementById('import-anim-controls').style.display = 'none';
        document.getElementById('import-model3d-options').style.display = 'flex';
        document.getElementById('import-3d-render-mode').style.display = 'inline-block';
        document.getElementById('import-3d-autorotate-label').style.display = 'inline-flex';

        try {
            const polyRatio = parseFloat(document.getElementById('import-poly-reduction')?.value || '1.0');
            const normalizeBlender = document.getElementById('import-normalize-blender')?.checked !== false;

            // Check companion files in current import queue
            const companionMap = new Map();
            for (const f of currentFiles) {
                const fn = (f.name || f.fileHandle?.name || '').toLowerCase();
                companionMap.set(fn, f);
                const baseFn = fn.split('/').pop();
                if (baseFn) companionMap.set(baseFn, f);
            }

            let mtlText = null;
            if (lowerName.endsWith('.obj')) {
                const baseObjName = fileName.split('.')[0];
                const mtlItem = companionMap.get(`${baseObjName.toLowerCase()}.mtl`);
                if (mtlItem) {
                    let mtlObj = mtlItem;
                    if (mtlItem.getFile) mtlObj = await mtlItem.getFile();
                    mtlText = await mtlObj.text();
                }
            }

            const converted = await CMModelConverter.convertGLTFToCM(fileObj, fileName, polyRatio, normalizeBlender, mtlText, companionMap);
            currentCMData = converted.cmData;
            currentConvertedModel = converted;

            // Cache extracted texture images for 3D preview
            textureImageMap.clear();
            if (converted.textures && converted.textures.length > 0) {
                for (const tex of converted.textures) {
                    if (!tex.blob) continue;
                    const img = new Image();
                    const texUrl = URL.createObjectURL(tex.blob);
                    img.src = texUrl;
                    textureImageMap.set(tex.name, img);
                    if (tex.uri) {
                        textureImageMap.set(tex.uri, img);
                        const baseUri = tex.uri.split('/').pop();
                        if (baseUri) textureImageMap.set(baseUri, img);
                    }
                }
                // Switch turntable preview to textured mode when textures are present
                preview3DMode = 'textured';
                const renderModeSel = document.getElementById('import-3d-render-mode');
                if (renderModeSel) renderModeSel.value = 'textured';
            }

            document.getElementById('import-img-dimensions').textContent = `3D: ${currentCMData.meshes.length} Sub-Malla(s)`;
            renderFileList();
            update3DTurntablePreview();
        } catch (e) {
            console.error("Error al convertir modelo 3D para vista previa:", e);
            currentCMData = null;
            updatePreview();
        }
        return;
    } else {
        document.getElementById('import-3d-render-mode').style.display = 'none';
        document.getElementById('import-3d-autorotate-label').style.display = 'none';
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

function updateMaterialSpherePreview() {
    if (preview3DTimer) clearInterval(preview3DTimer);

    const canvas = document.getElementById('import-preview-canvas');
    if (!canvas) return;

    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const colorHex = document.getElementById('import-mat-color').value || '#00a8ff';
    const alpha = parseFloat(document.getElementById('import-mat-alpha').value) || 1.0;
    const shininess = parseFloat(document.getElementById('import-mat-shininess').value) || 0.5;

    ctx.clearRect(0, 0, 300, 300);

    // Render 3D shaded sphere representation
    const radius = 90;
    const cx = 150;
    const cy = 150;

    const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 5, cx, cy, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(shininess * 0.4, colorHex);
    grad.addColorStop(1, '#050508');

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2d2d35';
    ctx.stroke();
    ctx.restore();

    document.getElementById('import-img-dimensions').textContent = `Material 3D ("Pintado")`;
}

function update3DTurntablePreview() {
    if (preview3DTimer) clearInterval(preview3DTimer);

    const canvas = document.getElementById('import-preview-canvas');
    if (!canvas || !currentCMData) return;

    canvas.width = 360;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    const meshesToRender = (selectedSubMeshIndex !== null && currentCMData.meshes[selectedSubMeshIndex]) ?
        [currentCMData.meshes[selectedSubMeshIndex]] : currentCMData.meshes;

    const subMeshName = selectedSubMeshIndex !== null && currentCMData.meshes[selectedSubMeshIndex] ?
        currentCMData.meshes[selectedSubMeshIndex].name : 'Modelo Completo';

    document.getElementById('import-img-dimensions').textContent = `3D: ${subMeshName} (${meshesToRender.length} mesh)`;

    // Calculate AABB for auto-framing isolated sub-mesh or full model
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const mesh of meshesToRender) {
        for (const primitive of mesh.primitives) {
            const pos = primitive.positions;
            if (!pos) continue;
            for (let i = 0; i < pos.length; i += 3) {
                minX = Math.min(minX, pos[i]); maxX = Math.max(maxX, pos[i]);
                minY = Math.min(minY, pos[i + 1]); maxY = Math.max(maxY, pos[i + 1]);
                minZ = Math.min(minZ, pos[i + 2]); maxZ = Math.max(maxZ, pos[i + 2]);
            }
        }
    }

    const sizeX = maxX - minX || 1;
    const sizeY = maxY - minY || 1;
    const sizeZ = maxZ - minZ || 1;
    const maxDimension = Math.max(sizeX, sizeY, sizeZ);
    const fitScale = 140 / maxDimension;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    preview3DAngle = 0;
    const drawTurntableFrame = () => {
        ctx.clearRect(0, 0, 360, 360);

        ctx.save();
        ctx.translate(180, 180);

        const rad = (preview3DAngle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Light direction for shading
        const lightDir = [0.577, 0.577, 0.577];

        const isWireframeGreen = preview3DMode === 'wireframe_green';
        const isSolidWhite = preview3DMode === 'solid_white';
        const isTextured = preview3DMode === 'textured';

        const pitchCos = Math.cos(preview3DPitch);
        const pitchSin = Math.sin(preview3DPitch);

        for (const mesh of meshesToRender) {
            for (const primitive of mesh.primitives) {
                const positions = primitive.positions;
                const normals = primitive.normals;
                const indices = primitive.indices;
                if (!positions || positions.length < 6) continue;

                // Check texture mapping
                let loadedImg = null;
                if (isTextured) {
                    const matIdx = primitive.materialIndex !== undefined ? primitive.materialIndex : primitive.material;
                    if (matIdx !== undefined && currentCMData && currentCMData.materials && currentCMData.materials[matIdx]) {
                        const mat = currentCMData.materials[matIdx];
                        if (mat && mat.texturePath) {
                            const tPath = mat.texturePath;
                            loadedImg = textureImageMap.get(tPath) || textureImageMap.get(tPath.split('/').pop());
                        }
                    }
                    if (!loadedImg && textureImageMap.size > 0) {
                        loadedImg = textureImageMap.values().next().value;
                    }
                }

                const scale = fitScale * preview3DZoom;

                // Collect projected triangles with dynamic LOD sampling for high-poly models
                const triangles = [];
                const totalTriangles = indices ? indices.length / 3 : 0;
                const triStep = totalTriangles > 15000 ? (isOrbitDragging ? 4 : 2) : 1;

                if (indices && indices.length >= 3) {
                    for (let i = 0; i < indices.length; i += triStep * 3) {
                        const i0 = indices[i] * 3;
                        const i1 = indices[i + 1] * 3;
                        const i2 = indices[i + 2] * 3;

                        if (i2 + 2 >= positions.length) continue;

                        const v0 = [positions[i0] - centerX, positions[i0 + 1] - centerY, positions[i0 + 2] - centerZ];
                        const v1 = [positions[i1] - centerX, positions[i1 + 1] - centerY, positions[i1 + 2] - centerZ];
                        const v2 = [positions[i2] - centerX, positions[i2 + 1] - centerY, positions[i2 + 2] - centerZ];

                        // 1. Pitch (X-axis) tilt applied first in model local space
                        const rx0 = [v0[0], v0[1] * pitchCos - v0[2] * pitchSin, v0[1] * pitchSin + v0[2] * pitchCos];
                        const rx1 = [v1[0], v1[1] * pitchCos - v1[2] * pitchSin, v1[1] * pitchSin + v1[2] * pitchCos];
                        const rx2 = [v2[0], v2[1] * pitchCos - v2[2] * pitchSin, v2[1] * pitchSin + v2[2] * pitchCos];

                        // 2. Turntable Yaw (Y-axis) rotation around screen vertical axis
                        const r0 = [rx0[0] * cos - rx0[2] * sin, rx0[1], rx0[0] * sin + rx0[2] * cos];
                        const r1 = [rx1[0] * cos - rx1[2] * sin, rx1[1], rx1[0] * sin + rx1[2] * cos];
                        const r2 = [rx2[0] * cos - rx2[2] * sin, rx2[1], rx2[0] * sin + rx2[2] * cos];

                        const avgZ = (r0[2] + r1[2] + r2[2]) / 3;

                        // Back-face culling check in screen-space
                        const p0 = [r0[0] * scale * (300 / (300 + r0[2])), -r0[1] * scale * (300 / (300 + r0[2]))];
                        const p1 = [r1[0] * scale * (300 / (300 + r1[2])), -r1[1] * scale * (300 / (300 + r1[2]))];
                        const p2 = [r2[0] * scale * (300 / (300 + r2[2])), -r2[1] * scale * (300 / (300 + r2[2]))];

                        // Cross product to test winding order (allow double-sided rendering to prevent hollow gaps)
                        const crossZ = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
                        const isBackFace = crossZ >= 0;

                        // Calculate normal & directional lighting
                        let intensity = 0.85;
                        if (normals && i0 + 2 < normals.length) {
                            const nx0 = normals[i0];
                            const nx1 = normals[i0 + 1] * pitchCos - normals[i0 + 2] * pitchSin;
                            const nx2 = normals[i0 + 1] * pitchSin + normals[i0 + 2] * pitchCos;

                            const nx = nx0 * cos - nx2 * sin;
                            const ny = nx1;
                            const nz = nx0 * sin + nx2 * cos;

                            const dot = nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2];
                            intensity = Math.max(0.35, Math.min(1.0, dot * 0.65 + 0.35));
                        }

                        const uvs = primitive.uvs;
                        let uv0 = null, uv1 = null, uv2 = null;
                        if (uvs && (indices[i] * 2 + 1) < uvs.length) {
                            uv0 = [uvs[indices[i] * 2], uvs[indices[i] * 2 + 1]];
                            uv1 = [uvs[indices[i + 1] * 2], uvs[indices[i + 1] * 2 + 1]];
                            uv2 = [uvs[indices[i + 2] * 2], uvs[indices[i + 2] * 2 + 1]];
                        }

                        triangles.push({ p0, p1, p2, uv0, uv1, uv2, avgZ, intensity });
                    }
                }

                // Sort triangles back-to-front (Painter's algorithm)
                triangles.sort((a, b) => b.avgZ - a.avgZ);

                if (triangles.length > 0) {
                    for (const tri of triangles) {
                        if (isWireframeGreen) {
                            ctx.beginPath();
                            ctx.moveTo(tri.p0[0], tri.p0[1]);
                            ctx.lineTo(tri.p1[0], tri.p1[1]);
                            ctx.lineTo(tri.p2[0], tri.p2[1]);
                            ctx.closePath();
                            ctx.strokeStyle = '#00ff66';
                            ctx.lineWidth = 1.0;
                            ctx.stroke();
                        } else if (isSolidWhite || !loadedImg || !loadedImg.complete || !loadedImg.width || !tri.uv0) {
                            ctx.beginPath();
                            ctx.moveTo(tri.p0[0], tri.p0[1]);
                            ctx.lineTo(tri.p1[0], tri.p1[1]);
                            ctx.lineTo(tri.p2[0], tri.p2[1]);
                            ctx.closePath();
                            const val = Math.floor(tri.intensity * 190 + 65);
                            const fillCol = `rgb(${val}, ${val}, ${val})`;
                            ctx.fillStyle = fillCol;
                            ctx.strokeStyle = fillCol;
                            ctx.lineWidth = 1.2;
                            ctx.lineJoin = 'round';
                            ctx.fill();
                            ctx.stroke();
                        } else if (isTextured) {
                            // 3. Model with Extracted Textures (Affine UV Triangle Mapping)
                            if (loadedImg && loadedImg.complete && loadedImg.width > 0 && tri.uv0) {
                                const imgW = loadedImg.width;
                                const imgH = loadedImg.height;

                                const u0 = tri.uv0[0] * imgW, v0 = (1 - tri.uv0[1]) * imgH;
                                const u1 = tri.uv1[0] * imgW, v1 = (1 - tri.uv1[1]) * imgH;
                                const u2 = tri.uv2[0] * imgW, v2 = (1 - tri.uv2[1]) * imgH;

                                const x0 = tri.p0[0], y0 = tri.p0[1];
                                const x1 = tri.p1[0], y1 = tri.p1[1];
                                const x2 = tri.p2[0], y2 = tri.p2[1];

                                const denom = (u0 * (v1 - v2) - v0 * (u1 - u2) + (u1 * v2 - u2 * v1));

                                ctx.save();
                                ctx.beginPath();
                                ctx.moveTo(x0, y0);
                                ctx.lineTo(x1, y1);
                                ctx.lineTo(x2, y2);
                                ctx.closePath();
                                ctx.clip();

                                if (Math.abs(denom) > 0.00001) {
                                    const a = (x0 * (v1 - v2) - v0 * (x1 - x2) + (x1 * v2 - x2 * v1)) / denom;
                                    const b = (y0 * (v1 - v2) - v0 * (y1 - y2) + (y1 * v2 - y2 * v1)) / denom;
                                    const c = (u0 * (x1 - x2) - x0 * (u1 - u2) + (u1 * x2 - u2 * x1)) / denom;
                                    const d = (u0 * (y1 - y2) - y0 * (u1 - u2) + (u1 * y2 - u2 * y1)) / denom;
                                    const e = (x0 * (u1 * v2 - u2 * v1) - u0 * (x1 * v2 - x2 * v1) + v0 * (x1 * u2 - x2 * u1)) / denom;
                                    const f = (y0 * (u1 * v2 - u2 * v1) - u0 * (y1 * v2 - y2 * v1) + v0 * (y1 * u2 - y2 * u1)) / denom;

                                    ctx.transform(a, b, c, d, e, f);
                                    ctx.globalAlpha = tri.intensity;
                                    ctx.drawImage(loadedImg, 0, 0);
                                } else {
                                    const val = Math.floor(tri.intensity * 190 + 65);
                                    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
                                    ctx.fill();
                                }
                                ctx.restore();
                            } else {
                                ctx.beginPath();
                                ctx.moveTo(tri.p0[0], tri.p0[1]);
                                ctx.lineTo(tri.p1[0], tri.p1[1]);
                                ctx.lineTo(tri.p2[0], tri.p2[1]);
                                ctx.closePath();
                                const val = Math.floor(tri.intensity * 190 + 65);
                                const fillCol = `rgb(${val}, ${val}, ${val})`;
                                ctx.fillStyle = fillCol;
                                ctx.strokeStyle = fillCol;
                                ctx.lineWidth = 1.2;
                                ctx.lineJoin = 'round';
                                ctx.fill();
                                ctx.stroke();
                            }
                        }
                    }
                } else {
                    // Fallback for unindexed geometry
                    ctx.beginPath();
                    ctx.strokeStyle = isWireframeGreen ? '#00ff66' : '#ffffff';
                    ctx.lineWidth = 1.2;
                    const step = positions.length > 3000 ? 18 : 6;
                    for (let i = 0; i < positions.length; i += step) {
                        const x = (positions[i] - centerX) * scale;
                        const y = (positions[i + 1] - centerY) * scale;
                        const z = (positions[i + 2] - centerZ) * scale;

                        const ryX = x * cos - z * sin;
                        const ryZ = x * sin + z * cos;

                        const rotX = ryX;
                        const rotY = y * pitchCos - ryZ * pitchSin;
                        const rotZ = y * pitchSin + ryZ * pitchCos;

                        const projFactor = 300 / (300 + rotZ);
                        const projX = rotX * projFactor + preview3DPanX;
                        const projY = -rotY * projFactor + preview3DPanY;

                        if (i === 0) ctx.moveTo(projX, projY);
                        else ctx.lineTo(projX, projY);
                    }
                    ctx.stroke();
                }
            }
        }

        ctx.restore();

        if (preview3DAutoRotate && !isOrbitDragging) {
            preview3DAngle = (preview3DAngle + 1.5) % 360;
        }
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

    if (imgType === 'PintadoMaterial') {
        updateMaterialSpherePreview();
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
        let targetHandle = null;
        if (targetDirHandle) {
            targetHandle = targetDirHandle;
        } else if (window.projectsDirHandle && projectName) {
            try {
                targetHandle = await window.projectsDirHandle.getDirectoryHandle(projectName);
                const parts = targetFolder.split('/');
                for (const part of parts) {
                    if (part) targetHandle = await targetHandle.getDirectoryHandle(part, { create: true });
                }
            } catch (err) {
                console.warn("[AssetImportModalWindow] Target dir resolution via projectsDirHandle failed:", err);
            }
        }

        for (const item of filesToImport) {
            let fileObj = item;
            if (item.getFile) {
                fileObj = await item.getFile();
            }

            const fileName = fileObj.name;
            const lowerName = fileName.toLowerCase();

            // 1. Process 3D Model Conversion (.gltf / .glb / .obj -> .cm)
            if (lowerName.endsWith('.gltf') || lowerName.endsWith('.glb') || lowerName.endsWith('.obj')) {
                const baseName = fileName.split('.')[0];
                const cmFileName = `${baseName}.cm`;

                const polyRatio = parseFloat(document.getElementById('import-poly-reduction')?.value || '1.0');
                const normalizeBlender = document.getElementById('import-normalize-blender')?.checked !== false;

                // Map companion files in current import queue
                const companionMap = new Map();
                for (const f of currentFiles) {
                    const fn = (f.name || f.fileHandle?.name || '').toLowerCase();
                    companionMap.set(fn, f);
                    const baseFn = fn.split('/').pop();
                    if (baseFn) companionMap.set(baseFn, f);
                }

                let mtlText = null;
                if (lowerName.endsWith('.obj')) {
                    const baseObjName = fileName.split('.')[0];
                    const mtlItem = companionMap.get(`${baseObjName.toLowerCase()}.mtl`);
                    if (mtlItem) {
                        let mtlObj = mtlItem;
                        if (mtlItem.getFile) mtlObj = await mtlItem.getFile();
                        mtlText = await mtlObj.text();
                    }
                }

                const converted = await CMModelConverter.convertGLTFToCM(fileObj, fileName, polyRatio, normalizeBlender, mtlText, companionMap);

                // Write .cm file
                const cmHandle = await targetHandle.getFileHandle(cmFileName, { create: true });
                const cmWritable = await cmHandle.createWritable();
                await cmWritable.write(JSON.stringify(converted.cmData, null, 2));
                await cmWritable.close();

                // Write extracted textures and automatically generate .ceMaterial files for the model
                if (document.getElementById('import-extract-textures').checked && converted.textures) {
                    for (const tex of converted.textures) {
                        if (!tex.blob) continue;
                        const texHandle = await targetHandle.getFileHandle(tex.name, { create: true });
                        const texWritable = await texHandle.createWritable();
                        await texWritable.write(tex.blob);
                        await texWritable.close();

                        // Write .meta file for texture
                        const texMetaHandle = await targetHandle.getFileHandle(`${tex.name}.meta`, { create: true });
                        const texMetaWritable = await texMetaHandle.createWritable();
                        await texMetaWritable.write(JSON.stringify({ imageType: 'Textura', layer: grLayer, tag: tag, importDate: new Date().toISOString() }, null, 2));
                        await texMetaWritable.close();

                        // Generate linked .ceMaterial for the texture
                        const matName = `${tex.name.split('.')[0]}_Material.ceMaterial`;
                        const materialData = {
                            formatVersion: '1.0',
                            assetType: 'CarleyMaterial',
                            name: tex.name.split('.')[0],
                            texturePath: `${targetFolder}/${tex.name}`,
                            albedoColor: '#ffffff',
                            alpha: 1.0,
                            shininess: 0.5,
                            layer: grLayer,
                            tag: tag
                        };

                        const matHandle = await targetHandle.getFileHandle(matName, { create: true });
                        const matWritable = await matHandle.createWritable();
                        await matWritable.write(JSON.stringify(materialData, null, 2));
                        await matWritable.close();
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

            // 2. Process Material ("Pintado" Asset)
            if (imgType === 'PintadoMaterial') {
                const baseName = fileName.split('.')[0];
                const matFileName = `${baseName}.ceMaterial`;

                const colorHex = document.getElementById('import-mat-color').value || '#00a8ff';
                const alpha = parseFloat(document.getElementById('import-mat-alpha').value) || 1.0;
                const shininess = parseFloat(document.getElementById('import-mat-shininess').value) || 0.5;

                const materialData = {
                    formatVersion: '1.0',
                    assetType: 'CarleyMaterial',
                    name: baseName,
                    albedoColor: colorHex,
                    alpha: alpha,
                    shininess: shininess,
                    layer: grLayer,
                    tag: tag
                };

                const matHandle = await targetHandle.getFileHandle(matFileName, { create: true });
                const matWritable = await matHandle.createWritable();
                await matWritable.write(JSON.stringify(materialData, null, 2));
                await matWritable.close();

                const metaHandle = await targetHandle.getFileHandle(`${matFileName}.meta`, { create: true });
                const metaWritable = await metaHandle.createWritable();
                await metaWritable.write(JSON.stringify({ assetType: 'CarleyMaterial', importDate: new Date().toISOString() }, null, 2));
                await metaWritable.close();

                continue;
            }

            // 3. Process Image / Texture
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

    const newFiles = Array.from(files || []);

    // If modal is already open, append incoming files to existing hierarchy list
    const isAlreadyOpen = modalElement.style.display === 'flex' && !modalElement.classList.contains('hidden');

    if (isAlreadyOpen && currentFiles.length > 0) {
        appendFilesToImport(newFiles);
    } else {
        currentFiles = newFiles;
        selectedFileIndices = new Set(currentFiles.map((_, i) => i));
        selectedFileIndex = 0;
        targetDirHandle = defaultTargetDirHandle;
        onCompleteCallback = onComplete;

        populateDropdowns();
        await populateFolders(window.projectsDirHandle);
        renderFileList();
        loadFocusedFileForPreview();
    }

    modalElement.style.display = 'flex';
    modalElement.classList.remove('hidden');
    modalElement.classList.add('is-open');
    bringToFront(modalElement);
}
