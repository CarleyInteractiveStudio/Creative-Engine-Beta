import { getURLForAssetPath } from '../../engine/AssetUtils.js';
import { showNotification, showConfirmation } from './DialogWindow.js';

let dom = {};
let projectsDirHandle = null;
let currentPalette = null; // Will hold the entire loaded palette asset content
let currentFileHandle = null;
let selectedTileId = -1;
let activeTool = 'tile-brush'; // Default tool

// --- Public API ---

export function initialize(editorDom, projDirHandle) {
    dom = {
        panel: editorDom.tilePalettePanel,
        assetName: editorDom.paletteAssetName, // This is now palette-file-name
        fileNameSpan: editorDom.paletteFileName,
        saveBtn: editorDom.paletteSaveBtn,
        loadBtn: editorDom.paletteLoadBtn,
        selectedTileIdSpan: editorDom.paletteSelectedTileId,
        viewContainer: editorDom.paletteViewContainer,
        gridCanvas: editorDom.paletteGridCanvas,
        tilesetImage: editorDom.paletteTilesetImage,
        overlay: editorDom.palettePanelOverlay,
        verticalToolbar: editorDom.paletteToolsVertical,
    };
    projectsDirHandle = projDirHandle;

    // Initially, the panel is in its "empty" state
    dom.overlay.style.display = 'flex';
    dom.saveBtn.style.display = 'none';

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
        showNotification('Error', `Failed to create palette: ${error.message}`);
    }
}

export async function openPalette(fileHandle) {
    try {
        const file = await fileHandle.getFile();
        const content = await file.text();
        currentPalette = JSON.parse(content);
        currentFileHandle = fileHandle;

        selectedTileId = -1; // Reset selection

        dom.panel.classList.remove('hidden');
        dom.overlay.style.display = 'none';
        dom.fileNameSpan.textContent = file.name;
        dom.selectedTileIdSpan.textContent = '-';
        dom.saveBtn.style.display = 'inline-block';

        if (currentPalette.imagePath) {
            await loadImage(currentPalette.imagePath);
        } else {
            dom.tilesetImage.style.display = 'none';
            showNotification('Paleta Inválida', 'El archivo de paleta no especifica una imagen de tileset.');
            clearGrid();
        }
    } catch (error) {
        console.error(`Error opening palette ${fileHandle.name}:`, error);
        showNotification('Error', `No se pudo abrir la paleta: ${error.message}`);
        currentPalette = null;
        currentFileHandle = null;
        dom.fileNameSpan.textContent = 'Error';
    }
}

export function getSelectedTile() {
    return selectedTileId;
}

export function getActiveTool() {
    return activeTool;
}


// --- Internal Logic ---

function setupEventListeners() {
    // dom.saveBtn.addEventListener('click', saveCurrentPalette);
    dom.loadBtn.addEventListener('click', async () => {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Creative Engine Palette',
                    accept: { 'application/json': ['.cepalette'] }
                }],
                multiple: false,
            });
            await openPalette(fileHandle);
        } catch (err) {
            console.log("User cancelled file picker or error occurred:", err);
        }
    });

    dom.verticalToolbar.addEventListener('click', (e) => {
        const toolBtn = e.target.closest('.tool-btn');
        if (toolBtn) {
            // Remove active class from all buttons
            dom.verticalToolbar.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            // Add active class to the clicked button
            toolBtn.classList.add('active');
            // Update the active tool state
            activeTool = toolBtn.dataset.tool;
            console.log(`Tile palette tool changed to: ${activeTool}`);
        }
    });

    dom.gridCanvas.addEventListener('mousedown', handleCanvasClick);
}

async function saveCurrentPalette() {
    // This function is kept for future use but is not active in this iteration.
    // The save button is hidden by default.
    if (!currentFileHandle || !currentPalette) return;
    try {
        const writable = await currentFileHandle.createWritable();
        await writable.write(JSON.stringify(currentPalette, null, 2));
        await writable.close();
        showNotification('Éxito', 'Paleta guardada exitosamente.');
    } catch (error) {
        console.error("Error saving palette:", error);
        showNotification('Error', `Failed to save palette: ${error.message}`);
    }
}

async function loadImage(imagePath) {
    try {
        const imageUrl = await getURLForAssetPath(imagePath, projectsDirHandle);
        if (!imageUrl) throw new Error(`Could not create URL for ${imagePath}`);

        dom.tilesetImage.src = imageUrl;
        dom.tilesetImage.style.display = 'block';

        // Wait for the image to load to get its dimensions
        await new Promise((resolve, reject) => {
            dom.tilesetImage.onload = resolve;
            dom.tilesetImage.onerror = reject;
        });

        drawGrid();

    } catch (error) {
        console.error(`Error loading tileset image '${imagePath}':`, error);
        showNotification('Error', `Could not load image: ${error.message}`);
        dom.tilesetImage.style.display = 'none';
    }
}

function drawGrid() {
    const img = dom.tilesetImage;
    if (!img.src || !img.complete || img.naturalWidth === 0 || !currentPalette) {
        clearGrid();
        return;
    }

    const { naturalWidth, naturalHeight } = img;
    const { tileWidth, tileHeight } = currentPalette;

    dom.gridCanvas.width = naturalWidth;
    dom.gridCanvas.height = naturalHeight;

    const ctx = dom.gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, naturalWidth, naturalHeight);

    // Calculate grid columns and rows and store them for selection logic
    const columns = Math.floor(naturalWidth / tileWidth);
    const rows = Math.floor(naturalHeight / tileHeight);
    currentPalette.columns = columns; // Cache for use in click handler
    currentPalette.rows = rows;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= columns; i++) {
        const x = i * tileWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, naturalHeight);
        ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
        const y = i * tileHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(naturalWidth, y);
        ctx.stroke();
    }

    // Highlight selected tile
    if (selectedTileId !== -1) {
        const col = selectedTileId % columns;
        const row = Math.floor(selectedTileId / columns);
        const x = col * tileWidth;
        const y = row * tileHeight;

        ctx.strokeStyle = 'rgba(255, 215, 0, 1)'; // Gold color
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, tileWidth - 3, tileHeight - 3);
    }
}

function clearGrid() {
    dom.gridCanvas.getContext('2d').clearRect(0, 0, dom.gridCanvas.width, dom.gridCanvas.height);
}

function handleCanvasClick(event) {
    if (!currentPalette || !currentPalette.columns || !currentPalette.rows) return;

    const rect = dom.gridCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Adjust for the scroll position of the container
    const viewContainer = dom.viewContainer;
    const scrollX = viewContainer.scrollLeft;
    const scrollY = viewContainer.scrollTop;

    const col = Math.floor((x + scrollX) / currentPalette.tileWidth);
    const row = Math.floor((y + scrollY) / currentPalette.tileHeight);


    if (col >= 0 && col < currentPalette.columns && row >= 0 && row < currentPalette.rows) {
        const clickedId = row * currentPalette.columns + col;
        selectedTileId = (selectedTileId === clickedId) ? -1 : clickedId; // Toggle selection
        dom.selectedTileIdSpan.textContent = selectedTileId === -1 ? '-' : selectedTileId;
        console.log(`Selected tile ID: ${selectedTileId}`);
        drawGrid(); // Redraw to show selection change
    }
}