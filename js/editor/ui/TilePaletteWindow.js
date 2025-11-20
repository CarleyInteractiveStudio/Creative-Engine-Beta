import { getURLForAssetPath } from '../../engine/AssetUtils.js';
import { showNotification, showConfirmation } from './DialogWindow.js';

let dom = {};
let projectsDirHandle = null;
let openAssetSelectorCallback = null;
let currentPalette = null;
let currentFileHandle = null;
let selectedTileId = -1;
let activeTool = 'tile-brush';

export function initialize(dependencies) {
    dom = {
        panel: dependencies.dom.tilePalettePanel,
        fileNameSpan: dependencies.dom.paletteFileName,
        saveBtn: dependencies.dom.paletteSaveBtn,
        loadBtn: dependencies.dom.paletteLoadBtn,
        tilesetNameSpan: dependencies.dom.paletteTilesetName,
        assignTilesetBtn: dependencies.dom.paletteAssignTilesetBtn,
        selectedTileIdSpan: dependencies.dom.paletteSelectedTileId,
        viewContainer: dependencies.dom.paletteViewContainer,
        gridCanvas: dependencies.dom.paletteGridCanvas,
        cursorOverlay: dependencies.dom.paletteCursorOverlay,
        tilesetImage: dependencies.dom.paletteTilesetImage,
        overlay: dependencies.dom.palettePanelOverlay,
        verticalToolbar: dependencies.dom.paletteToolsVertical,
    };
    projectsDirHandle = dependencies.projectsDirHandle;
    openAssetSelectorCallback = dependencies.openAssetSelectorCallback;

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
            dom.tilesetNameSpan.textContent = currentPalette.imagePath.split('/').pop();
            await loadImage(currentPalette.imagePath);
        } else {
            dom.tilesetNameSpan.textContent = 'Ninguno';
            dom.tilesetImage.style.display = 'none';
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
    dom.saveBtn.addEventListener('click', saveCurrentPalette);
    dom.loadBtn.addEventListener('click', () => {
        openAssetSelectorCallback('file', (fileHandle) => {
            if (fileHandle.name.endsWith('.cepalette')) {
                openPalette(fileHandle);
            } else {
                showNotification('Error', 'Por favor, selecciona un archivo .cepalette.');
            }
        });
    });

    dom.assignTilesetBtn.addEventListener('click', () => {
        if (!currentPalette) {
            showNotification('Aviso', 'Por favor, carga primero un archivo de paleta.');
            return;
        }
        openAssetSelectorCallback('image', (fileHandle, dirHandle) => {
            // We need to determine the relative path from the project root
            // This is a simplification; a more robust solution would trace the path.
            const imagePath = `Assets/${fileHandle.name}`;
            currentPalette.imagePath = imagePath;
            dom.tilesetNameSpan.textContent = fileHandle.name;
            loadImage(imagePath);
        });
    });

    dom.verticalToolbar.addEventListener('click', (e) => {
        const toolBtn = e.target.closest('.tool-btn');
        if (toolBtn) {
            dom.verticalToolbar.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            toolBtn.classList.add('active');
            activeTool = toolBtn.dataset.tool;
        }
    });

    dom.viewContainer.addEventListener('mousemove', handleMouseMoveInPalette);
    dom.viewContainer.addEventListener('mouseleave', handleMouseLeavePalette);
    dom.viewContainer.addEventListener('mousedown', handleCanvasClick);
}

async function saveCurrentPalette() {
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
    if (!img.src || !img.complete || img.naturalWidth === 0 || !currentPalette) return;

    const { naturalWidth, naturalHeight } = img;
    const { tileWidth, tileHeight } = currentPalette;
    currentPalette.columns = Math.floor(naturalWidth / tileWidth);
    currentPalette.rows = Math.floor(naturalHeight / tileHeight);

    // The grid is now just a selection highlight, so clear and redraw only that.
    const ctx = dom.gridCanvas.getContext('2d');
    dom.gridCanvas.width = naturalWidth;
    dom.gridCanvas.height = naturalHeight;
    ctx.clearRect(0, 0, dom.gridCanvas.width, dom.gridCanvas.height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= currentPalette.columns; i++) {
        const x = i * tileWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, naturalHeight);
        ctx.stroke();
    }
    for (let i = 0; i <= currentPalette.rows; i++) {
        const y = i * tileHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(naturalWidth, y);
        ctx.stroke();
    }

    if (selectedTileId !== -1) {
        const col = selectedTileId % currentPalette.columns;
        const row = Math.floor(selectedTileId / currentPalette.columns);
        const x = col * tileWidth;
        const y = row * tileHeight;

        ctx.strokeStyle = 'rgba(255, 215, 0, 1)'; // Gold
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, tileWidth - 3, tileHeight - 3);
    }
}

function clearGrid() {
    dom.gridCanvas.getContext('2d').clearRect(0, 0, dom.gridCanvas.width, dom.gridCanvas.height);
    dom.cursorOverlay.style.display = 'none';
}

function handleMouseMoveInPalette(event) {
    if (!currentPalette) return;
    const { tileWidth, tileHeight } = currentPalette;
    const rect = dom.viewContainer.getBoundingClientRect();
    const x = event.clientX - rect.left + dom.viewContainer.scrollLeft;
    const y = event.clientY - rect.top + dom.viewContainer.scrollTop;

    const col = Math.floor(x / tileWidth);
    const row = Math.floor(y / tileHeight);

    if (col >= 0 && col < currentPalette.columns && row >= 0 && row < currentPalette.rows) {
        dom.cursorOverlay.style.display = 'block';
        dom.cursorOverlay.style.left = `${col * tileWidth}px`;
        dom.cursorOverlay.style.top = `${row * tileHeight}px`;
        dom.cursorOverlay.style.width = `${tileWidth}px`;
        dom.cursorOverlay.style.height = `${tileHeight}px`;
    } else {
        dom.cursorOverlay.style.display = 'none';
    }
}

function handleMouseLeavePalette() {
    dom.cursorOverlay.style.display = 'none';
}

function handleCanvasClick(event) {
    if (!currentPalette || !currentPalette.columns || !currentPalette.rows) return;

    const rect = dom.viewContainer.getBoundingClientRect();
    const x = event.clientX - rect.left + dom.viewContainer.scrollLeft;
    const y = event.clientY - rect.top + dom.viewContainer.scrollTop;

    const col = Math.floor(x / currentPalette.tileWidth);
    const row = Math.floor(y / currentPalette.tileHeight);

    if (col >= 0 && col < currentPalette.columns && row >= 0 && row < currentPalette.rows) {
        const clickedId = row * currentPalette.columns + col;
        selectedTileId = (selectedTileId === clickedId) ? -1 : clickedId;
        dom.selectedTileIdSpan.textContent = selectedTileId === -1 ? '-' : selectedTileId;
        drawGrid(); // Redraw selection highlight
    }
}