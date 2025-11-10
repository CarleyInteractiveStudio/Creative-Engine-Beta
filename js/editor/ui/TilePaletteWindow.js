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

async function selectImage() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: 'Images', accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] } }],
            multiple: false
        });

        // We need to resolve the path relative to the project root
        // This is a simplification; a real implementation might need a more robust path resolver.
        // For now, let's assume assets are in a predictable location.
        // A better approach would be to get the relative path from the project root handle.
        const relativePath = `Assets/${fileHandle.name}`; // This is a weak assumption
        await loadImage(relativePath);
        currentPalette.imagePath = relativePath;
        isDirty = true;

    } catch (err) {
        console.log("User cancelled file picker or an error occurred.", err);
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

        drawGrid();

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
    }
}