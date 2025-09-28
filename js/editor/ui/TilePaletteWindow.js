import { getURLForAssetPath } from '../../engine/AssetUtils.js';

let dom = {};
let projectsDirHandle = null;
let currentPalette = {
    imagePath: '',
    tileWidth: 32,
    tileHeight: 32,
    columns: 0,
    rows: 0
};
let currentFileHandle = null;
let selectedTileId = -1;
let isDirty = false;

// --- Public API ---

export function initialize(editorDom, projDirHandle) {
    dom = {
        panel: editorDom.tilePalettePanel,
        assetName: editorDom.paletteAssetName,
        saveBtn: editorDom.paletteSaveBtn,
        selectImageBtn: editorDom.paletteSelectImageBtn,
        imageName: editorDom.paletteImageName,
        tileWidthInput: editorDom.paletteTileWidth,
        tileHeightInput: editorDom.paletteTileHeight,
        selectedTileIdSpan: editorDom.paletteSelectedTileId,
        viewContainer: editorDom.paletteViewContainer,
        gridCanvas: editorDom.paletteGridCanvas,
        tilesetImage: editorDom.paletteTilesetImage,
        overlay: editorDom.palettePanelOverlay,
        previewCanvas: document.getElementById('palette-tile-preview'),
    };
    projectsDirHandle = projDirHandle;

    setupEventListeners();
}

export async function createNewPalette(name, dirHandle) {
    const content = {
        imagePath: "",
        tileWidth: 32,
        tileHeight: 32
    };

    try {
        const fileHandle = await dirHandle.getFileHandle(name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(content, null, 2));
        await writable.close();
        console.log(`Created new palette: ${name}`);
        await openPalette(fileHandle);
    } catch (error) {
        console.error(`Error creating new palette file ${name}:`, error);
        alert(`Failed to create palette: ${error.message}`);
    }
}

export async function openPalette(fileHandle) {
    if (isDirty) {
        if (!confirm("You have unsaved changes in the current palette. Do you want to discard them?")) {
            return;
        }
    }

    try {
        const file = await fileHandle.getFile();
        const content = await file.text();
        const data = JSON.parse(content);

        currentFileHandle = fileHandle;
        currentPalette = {
            imagePath: data.imagePath || '',
            tileWidth: data.tileWidth || 32,
            tileHeight: data.tileHeight || 32,
            columns: 0, // Will be calculated after image loads
            rows: 0
        };
        isDirty = false;
        selectedTileId = -1;

        dom.panel.classList.remove('hidden');
        dom.overlay.style.display = 'none';
        dom.assetName.textContent = file.name;
        dom.tileWidthInput.value = currentPalette.tileWidth;
        dom.tileHeightInput.value = currentPalette.tileHeight;
        dom.selectedTileIdSpan.textContent = '-';
        drawPreview(); // Clear preview on open

        if (currentPalette.imagePath) {
            await loadImage(currentPalette.imagePath);
        } else {
            dom.tilesetImage.src = '';
            dom.imageName.textContent = 'Ninguna';
            clearGrid();
        }
    } catch (error) {
        console.error(`Error opening palette ${fileHandle.name}:`, error);
        alert(`Could not open palette: ${error.message}`);
    }
}

export function getSelectedTile() {
    return selectedTileId;
}


// --- Internal Logic ---

function setupEventListeners() {
    dom.saveBtn.addEventListener('click', saveCurrentPalette);
    dom.selectImageBtn.addEventListener('click', selectImage);

    dom.tileWidthInput.addEventListener('change', () => {
        currentPalette.tileWidth = parseInt(dom.tileWidthInput.value, 10);
        isDirty = true;
        drawGrid();
    });
    dom.tileHeightInput.addEventListener('change', () => {
        currentPalette.tileHeight = parseInt(dom.tileHeightInput.value, 10);
        isDirty = true;
        drawGrid();
    });

    dom.gridCanvas.addEventListener('mousedown', handleCanvasClick);
}

async function saveCurrentPalette() {
    if (!currentFileHandle) {
        alert("No palette file is currently open. Cannot save.");
        return;
    }

    const dataToSave = {
        imagePath: currentPalette.imagePath,
        tileWidth: currentPalette.tileWidth,
        tileHeight: currentPalette.tileHeight
    };

    try {
        const writable = await currentFileHandle.createWritable();
        await writable.write(JSON.stringify(dataToSave, null, 2));
        await writable.close();
        isDirty = false;
        console.log(`Palette saved: ${currentFileHandle.name}`);
        alert("Paleta guardada exitosamente.");
    } catch (error) {
        console.error("Error saving palette:", error);
        alert(`Failed to save palette: ${error.message}`);
    }
}

async function openImagePickerModal() {
    return new Promise(async (resolve) => {
        const modal = document.getElementById('sprite-selector-modal');
        if (!modal) {
            console.error("Sprite selector modal not found in DOM.");
            return resolve(null);
        }
        const grid = modal.querySelector('#sprite-selector-grid');
        const title = modal.querySelector('h2');
        if (!grid || !title) {
            console.error("Modal content (grid or title) not found.");
            return resolve(null);
        }
        const originalTitle = title.textContent;

        title.textContent = 'Seleccionar Imagen para Paleta';
        grid.innerHTML = ''; // Clear previous content

        const imageFiles = [];
        async function findImages(dirHandle, path = '') {
            for await (const entry of dirHandle.values()) {
                const entryPath = path ? `${path}/${entry.name}` : entry.name;
                if (entry.kind === 'file' && (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg'))) {
                    imageFiles.push({ name: entry.name, path: entryPath });
                } else if (entry.kind === 'directory') {
                    // We need to get the directory handle to recurse
                    const nestedDirHandle = await dirHandle.getDirectoryHandle(entry.name);
                    await findImages(nestedDirHandle, entryPath);
                }
            }
        }

        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            if (!projectName) throw new Error("Could not determine project name from URL.");
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            await findImages(projectHandle, '');

            if (imageFiles.length === 0) {
                alert("No se encontraron imágenes (.png, .jpg) en el proyecto.");
                return resolve(null);
            }

            const closeAndResolve = (result) => {
                modal.classList.remove('is-open');
                grid.innerHTML = '';
                title.textContent = originalTitle;
                // Clean up the specific click listener for the close button
                const closeButton = modal.querySelector('.close-button');
                if (closeButton) {
                    closeButton.onclick = null;
                }
                resolve(result);
            };

            imageFiles.forEach(imgFile => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'sprite-selector-item';
                imgContainer.style.textAlign = 'center';
                imgContainer.style.cursor = 'pointer';

                const img = document.createElement('img');
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.display = 'block';
                img.style.margin = '0 auto 5px';
                getURLForAssetPath(imgFile.path, projectsDirHandle).then(url => { if (url) img.src = url; });

                const nameLabel = document.createElement('span');
                nameLabel.textContent = imgFile.name;
                nameLabel.style.wordBreak = 'break-all';


                imgContainer.appendChild(img);
                imgContainer.appendChild(nameLabel);

                imgContainer.addEventListener('click', () => {
                    closeAndResolve(imgFile.path);
                });
                grid.appendChild(imgContainer);
            });

            const closeButton = modal.querySelector('.close-button');
            if (closeButton) {
                closeButton.onclick = () => closeAndResolve(null);
            }
            modal.classList.add('is-open');

        } catch (error) {
            console.error("Error building image picker:", error);
            alert(`Could not open image picker: ${error.message}`);
            resolve(null);
        }
    });
}

async function selectImage() {
    try {
        const relativePath = await openImagePickerModal();

        if (relativePath) {
            await loadImage(relativePath);
            currentPalette.imagePath = relativePath;
            isDirty = true;
        }

    } catch (err) {
        console.log("Error in the image selection process.", err);
    }
}

async function loadImage(imagePath) {
    try {
        const imageUrl = await getURLForAssetPath(imagePath, projectsDirHandle);
        if (!imageUrl) throw new Error(`Could not create URL for ${imagePath}`);

        dom.tilesetImage.src = imageUrl;
        dom.imageName.textContent = imagePath.split('/').pop();

        // Wait for the image to load to get its dimensions
        await new Promise((resolve, reject) => {
            dom.tilesetImage.onload = resolve;
            dom.tilesetImage.onerror = reject;
        });

        selectedTileId = -1; // Reset selection on new image
        dom.selectedTileIdSpan.textContent = '-';
        drawGrid();
        drawPreview(); // Clear the preview as well

    } catch (error) {
        console.error(`Error loading tileset image '${imagePath}':`, error);
        alert(`Could not load image: ${error.message}`);
        dom.tilesetImage.src = '';
        dom.imageName.textContent = 'Error';
    }
}

function drawGrid() {
    const img = dom.tilesetImage;
    if (!img.src || !img.complete || img.naturalWidth === 0) {
        clearGrid();
        return;
    }

    const { naturalWidth, naturalHeight } = img;
    const { tileWidth, tileHeight } = currentPalette;

    dom.gridCanvas.width = naturalWidth;
    dom.gridCanvas.height = naturalHeight;
    dom.gridCanvas.style.width = `${naturalWidth}px`;
    dom.gridCanvas.style.height = `${naturalHeight}px`;

    const ctx = dom.gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, naturalWidth, naturalHeight);

    // Calculate grid columns and rows
    currentPalette.columns = Math.floor(naturalWidth / tileWidth);
    currentPalette.rows = Math.floor(naturalHeight / tileHeight);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= naturalWidth; x += tileWidth) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, naturalHeight);
        ctx.stroke();
    }
    for (let y = 0; y <= naturalHeight; y += tileHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(naturalWidth, y);
        ctx.stroke();
    }

    // Highlight selected tile
    if (selectedTileId !== -1) {
        const col = selectedTileId % currentPalette.columns;
        const row = Math.floor(selectedTileId / currentPalette.columns);
        const x = col * tileWidth;
        const y = row * tileHeight;

        ctx.strokeStyle = 'rgba(255, 215, 0, 1)'; // Gold color
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, tileWidth - 3, tileHeight - 3);
    }
}

function clearGrid() {
    dom.gridCanvas.width = 0;
    dom.gridCanvas.height = 0;
}

function drawPreview() {
    if (!dom.previewCanvas) return;
    const pCtx = dom.previewCanvas.getContext('2d');
    pCtx.clearRect(0, 0, dom.previewCanvas.width, dom.previewCanvas.height);

    if (selectedTileId === -1 || !dom.tilesetImage.src) {
        pCtx.fillStyle = 'rgba(0,0,0,0.2)';
        pCtx.fillRect(0, 0, dom.previewCanvas.width, dom.previewCanvas.height);
        return;
    }

    const { tileWidth, tileHeight, columns } = currentPalette;
    const col = selectedTileId % columns;
    const row = Math.floor(selectedTileId / columns);
    const sx = col * tileWidth;
    const sy = row * tileHeight;

    // Ensure the preview canvas is scaled to show the tile clearly
    const scale = Math.min(dom.previewCanvas.width / tileWidth, dom.previewCanvas.height / tileHeight);
    const dw = tileWidth * scale;
    const dh = tileHeight * scale;
    const dx = (dom.previewCanvas.width - dw) / 2;
    const dy = (dom.previewCanvas.height - dh) / 2;

    pCtx.imageSmoothingEnabled = false; // Keep pixels sharp
    pCtx.drawImage(dom.tilesetImage, sx, sy, tileWidth, tileHeight, dx, dy, dw, dh);
}

function handleCanvasClick(event) {
    if (!currentPalette.columns || !currentPalette.rows) return;

    const rect = dom.gridCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.floor(x / currentPalette.tileWidth);
    const row = Math.floor(y / currentPalette.tileHeight);

    if (col >= 0 && col < currentPalette.columns && row >= 0 && row < currentPalette.rows) {
        selectedTileId = row * currentPalette.columns + col;
        dom.selectedTileIdSpan.textContent = selectedTileId;
        console.log(`Selected tile ID: ${selectedTileId}`);
        drawGrid(); // Redraw to show selection
        drawPreview(); // Update the preview
    }
}