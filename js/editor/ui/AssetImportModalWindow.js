// js/editor/ui/AssetImportModalWindow.js
import { showNotification } from './DialogWindow.js';

let modalElement = null;
let currentFiles = []; // Array of File or FileHandle objects
let selectedFileIndices = new Set();
let targetDirHandle = null;
let onCompleteCallback = null;

export function initializeAssetImportModal() {
    if (document.getElementById('asset-import-modal')) return;

    modalElement = document.createElement('div');
    modalElement.id = 'asset-import-modal';
    modalElement.className = 'modal';
    modalElement.style.display = 'none';
    modalElement.innerHTML = `
        <div class="modal-content asset-import-modal-content" style="width: 850px; max-width: 95vw; height: 600px; max-height: 90vh; display: flex; flex-direction: column; padding: 0; background: #1e1e24; color: #e0e0e0; border-radius: 8px; overflow: hidden; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.7);">
            <!-- Header -->
            <div class="modal-header" style="display: flex; justify-space-between; align-items: center; padding: 12px 20px; background: #18181c; border-bottom: 1px solid #2d2d35;">
                <h3 style="margin: 0; font-size: 1.1rem; color: #4da6ff; display: flex; align-items: center; gap: 8px;">
                    <img src="icons/box.svg" class="ce-icon" style="width: 20px; height: 20px;"> Importador de Assets 3D
                </h3>
                <button class="close-button" id="import-modal-close" style="background: none; border: none; color: #888; font-size: 1.4rem; cursor: pointer;">&times;</button>
            </div>

            <!-- Body (Sidebar + Inspector) -->
            <div style="display: flex; flex: 1; overflow: hidden;">
                <!-- Left Sidebar: File List -->
                <div style="width: 280px; background: #141418; border-right: 1px solid #2d2d35; display: flex; flex-direction: column;">
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

                <!-- Right Inspector / Settings Panel -->
                <div style="flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: #1e1e24;">
                    <div style="border-bottom: 1px solid #2d2d35; padding-bottom: 8px; margin-bottom: 4px;">
                        <h4 style="margin: 0; font-size: 0.95rem; color: #fff;">Configuración de Importación</h4>
                        <p style="margin: 4px 0 0 0; font-size: 0.78rem; color: #888;" id="import-selection-subtitle">Modificando selección actual</p>
                    </div>

                    <!-- Option 1: Image Type -->
                    <div class="import-field-group">
                        <label style="font-size: 0.85rem; font-weight: bold; color: #ccc; display: block; margin-bottom: 6px;">Tipo de Imagen 3D:</label>
                        <select id="import-img-type" style="width: 100%; padding: 8px 10px; background: #121215; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.88rem;">
                            <option value="Sprite">Sprite (2D/3D Quad)</option>
                            <option value="Textura">Textura Albedo (Superficie 3D)</option>
                            <option value="Normal Map">Normal Map (Relieve 3D)</option>
                            <option value="Hoja de Animacion">Hoja de Animación (Sprite Sheet)</option>
                        </select>
                    </div>

                    <!-- Option 2: GR (Grupos de Renderizado / Layer) & Tag -->
                    <div style="display: flex; gap: 12px;">
                        <div class="import-field-group" style="flex: 1;">
                            <label style="font-size: 0.85rem; font-weight: bold; color: #ccc; display: block; margin-bottom: 6px;">GR (Grupo de Renderizado):</label>
                            <select id="import-gr-layer" style="width: 100%; padding: 8px 10px; background: #121215; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.88rem;">
                                <!-- Dynamically populated -->
                            </select>
                        </div>
                        <div class="import-field-group" style="flex: 1;">
                            <label style="font-size: 0.85rem; font-weight: bold; color: #ccc; display: block; margin-bottom: 6px;">Tag (Etiqueta):</label>
                            <select id="import-tag" style="width: 100%; padding: 8px 10px; background: #121215; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.88rem;">
                                <!-- Dynamically populated -->
                            </select>
                        </div>
                    </div>

                    <!-- Option 3: Max Resolution Optimization (Unity style) -->
                    <div class="import-field-group">
                        <label style="font-size: 0.85rem; font-weight: bold; color: #ccc; display: block; margin-bottom: 6px;">Optimización de Calidad (Máx. Píxeles):</label>
                        <select id="import-max-resolution" style="width: 100%; padding: 8px 10px; background: #121215; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.88rem;">
                            <option value="original">Original (Sin Redimensionar)</option>
                            <option value="2048">2048 x 2048 px</option>
                            <option value="1024">1024 x 1024 px</option>
                            <option value="512">512 x 512 px</option>
                            <option value="256">256 x 256 px</option>
                            <option value="128">128 x 128 px</option>
                        </select>
                    </div>

                    <!-- Option 4: Target Location & New Folder -->
                    <div class="import-field-group" style="margin-top: 4px;">
                        <label style="font-size: 0.85rem; font-weight: bold; color: #ccc; display: block; margin-bottom: 6px;">Carpeta Destino:</label>
                        <div style="display: flex; gap: 8px;">
                            <select id="import-target-folder" style="flex: 1; padding: 8px 10px; background: #121215; border: 1px solid #3a3a45; color: #fff; border-radius: 4px; font-size: 0.88rem;">
                                <option value="Assets">Assets/</option>
                            </select>
                            <button id="import-new-folder-btn" style="padding: 8px 12px; background: #2b2b36; border: 1px solid #3a3a45; color: #4da6ff; border-radius: 4px; cursor: pointer; font-size: 0.82rem; font-weight: bold; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                                + Crear Carpeta
                            </button>
                        </div>
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
}

function hideModal() {
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

        const item = document.createElement('div');
        item.style.padding = '8px 10px';
        item.style.marginBottom = '4px';
        item.style.borderRadius = '4px';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.style.fontSize = '0.82rem';
        item.style.background = isSelected ? '#1e3850' : '#18181d';
        item.style.border = isSelected ? '1px solid #4da6ff' : '1px solid transparent';
        item.style.color = isSelected ? '#fff' : '#aaa';

        item.innerHTML = `
            <input type="checkbox" ${isSelected ? 'checked' : ''} style="cursor: pointer;">
            <img src="icons/file.svg" class="ce-icon" style="width: 14px; height: 14px; opacity: 0.7;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${fileName}</span>
        `;

        item.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') {
                if (selectedFileIndices.has(idx)) selectedFileIndices.delete(idx);
                else selectedFileIndices.add(idx);
            } else {
                if (e.target.checked) selectedFileIndices.add(idx);
                else selectedFileIndices.delete(idx);
            }
            renderFileList();
        };

        container.appendChild(item);
    });
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
            const processedFile = await resizeImageIfNeeded(fileObj, maxRes);

            // Write file
            const fileHandle = await targetHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(processedFile);
            await writable.close();

            // Write .meta with 3D import configuration metadata
            const metaData = {
                imageType: imgType,
                layer: grLayer,
                tag: tag,
                maxResolution: maxRes,
                importDate: new Date().toISOString()
            };

            const metaHandle = await targetHandle.getFileHandle(`${fileName}.meta`, { create: true });
            const metaWritable = await metaHandle.createWritable();
            await metaWritable.write(JSON.stringify(metaData, null, 2));
            await metaWritable.close();
        }

        hideModal();
        showNotification('Importación Completada', `${filesToImport.length} asset(s) importados en '${targetFolder}/'`);

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
    targetDirHandle = defaultTargetDirHandle;
    onCompleteCallback = onComplete;

    populateDropdowns();
    await populateFolders(window.projectsDirHandle);
    renderFileList();

    modalElement.style.display = 'flex';
    modalElement.classList.add('is-open');
}
