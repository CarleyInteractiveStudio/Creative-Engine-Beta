import { getURLForAssetPath } from '../../engine/AssetUtils.js';
let allTiles = [];
import { showNotification, showConfirmation } from './DialogWindow.js';

let dom = {};
let projectsDirHandle = null;
let openAssetSelectorCallback = null;
let currentPalette = null; // Will hold the entire loaded palette asset content
let currentFileHandle = null;
let selectedTileId = -1;
let activeTool = 'tile-brush'; // Default tool

// --- Public API ---

export function initialize(dependencies) {
    dom = {
        panel: dependencies.dom.tilePalettePanel,
        fileNameSpan: dependencies.dom.paletteFileName,
        saveBtn: dependencies.dom.paletteSaveBtn,
        loadBtn: dependencies.dom.paletteLoadBtn,
        addSpriteBtn: dependencies.dom.paletteAddSpriteBtn,
        editBtn: dependencies.dom.paletteEditBtn,
        deleteBtn: dependencies.dom.paletteDeleteSpriteBtn,
        selectedTileIdSpan: dependencies.dom.paletteSelectedTileId,
        viewContainer: dependencies.dom.paletteViewContainer,
        gridCanvas: dependencies.dom.paletteGridCanvas,
        tilesetImage: dependencies.dom.paletteTilesetImage,
        overlay: dependencies.dom.palettePanelOverlay,
        verticalToolbar: dependencies.dom.paletteToolsVertical,
    };
    projectsDirHandle = dependencies.projectsDirHandle;
    openAssetSelectorCallback = dependencies.openAssetSelectorCallback;

    // Initially, the panel is in its "empty" state
    dom.overlay.style.display = 'flex';
    dom.saveBtn.style.display = 'none'; // Will be shown when a palette is open

    setupEventListeners();
}

export async function createNewPalette(name, dirHandle) {
    const content = {
        name: name.replace('.cepalette', ''),
        spritePacks: [] // This will hold paths to .ceSprite files
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

        if (currentPalette.spritePacks && Array.isArray(currentPalette.spritePacks)) {
            await loadAndDisplaySpritePacks();
        } else {
            // Handle legacy palette formats or empty palettes
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
    // Return the full tile object, which is more useful for the scene view painter
    return selectedTileId !== -1 ? allTiles[selectedTileId] : null;
}

export function getActiveTool() {
    return activeTool;
}


// --- Internal Logic ---

function setupEventListeners() {
    dom.saveBtn.addEventListener('click', saveCurrentPalette);
    dom.loadBtn.addEventListener('click', async () => {
        try {
            // This should use the custom asset selector, not the OS picker.
            // For now, leaving it as is, but this is a point for future improvement.
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

    dom.addSpriteBtn.addEventListener('click', () => {
        if (!currentPalette || !openAssetSelectorCallback) {
            showNotification('Error', 'Carga una paleta antes de añadir sprites.');
            return;
        }
        openAssetSelectorCallback('.ceSprite', async (fileHandle, fullPath) => {
            if (!currentPalette.spritePacks.includes(fullPath)) {
                currentPalette.spritePacks.push(fullPath);
                await saveCurrentPalette();
                // Reload the palette to show the new sprites
                await openPalette(currentFileHandle);
            } else {
                showNotification('Aviso', 'Este paquete de sprites ya está en la paleta.');
            }
        });
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

function clearGrid() {
    dom.gridCanvas.getContext('2d').clearRect(0, 0, dom.gridCanvas.width, dom.gridCanvas.height);
}

function handleCanvasClick(event) {
    const TILE_SIZE = 64;
    const PADDING = 5;
    const canvasWidth = dom.viewContainer.clientWidth;
    // Ensure tilesPerRow is at least 1 to avoid division by zero
    const tilesPerRow = Math.max(1, Math.floor(canvasWidth / (TILE_SIZE + PADDING)));

    const rect = dom.gridCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const scrollX = dom.viewContainer.scrollLeft;
    const scrollY = dom.viewContainer.scrollTop;

    const col = Math.floor((x + scrollX) / (TILE_SIZE + PADDING));
    const row = Math.floor((y + scrollY) / (TILE_SIZE + PADDING));

    const clickedIndex = row * tilesPerRow + col;

    if (clickedIndex >= 0 && clickedIndex < allTiles.length) {
        selectedTileId = (selectedTileId === clickedIndex) ? -1 : clickedIndex;
        dom.selectedTileIdSpan.textContent = selectedTileId === -1 ? '-' : allTiles[selectedTileId].spriteName;
        console.log(`Selected tile index: ${selectedTileId}`);
        drawTiles(); // Redraw to show selection change
    }
}

async function loadAndDisplaySpritePacks() {
    allTiles = [];
    const ctx = dom.gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, dom.gridCanvas.width, dom.gridCanvas.height);

    if (currentPalette.spritePacks.length === 0) {
        dom.overlay.style.display = 'flex';
        return;
    } else {
        dom.overlay.style.display = 'none';
    }

    // Create a cache for source images to avoid reloading them multiple times
    const imageCache = new Map();

    for (const packPath of currentPalette.spritePacks) {
        try {
            const packFileHandle = await projectsDirHandle.getFileHandle(packPath, { create: false });
            const packFile = await packFileHandle.getFile();
            const packContent = await packFile.text();
            const packData = JSON.parse(packContent);

            // Load the source image for this pack if not already cached
            if (!imageCache.has(packData.sourceImage)) {
                const sourceImagePath = `Assets/${packData.sourceImage}`;
                const imageUrl = await getURLForAssetPath(sourceImagePath, projectsDirHandle);
                if (!imageUrl) continue;

                const image = new Image();
                await new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = reject;
                    image.src = imageUrl;
                });
                imageCache.set(packData.sourceImage, image);
            }

            const sourceImage = imageCache.get(packData.sourceImage);

            // Add all sprites from this pack to the flat list
            for (const spriteName in packData.sprites) {
                const spriteData = packData.sprites[spriteName];
                allTiles.push({
                    id: `${packPath}|${spriteName}`, // Unique ID for the tile
                    spriteAssetPath: packPath,
                    spriteName: spriteName,
                    sourceImage: sourceImage,
                    rect: spriteData.rect
                });
            }
        } catch (error) {
            console.error(`Error loading sprite pack '${packPath}':`, error);
            showNotification('Error', `Could not load sprite pack: ${packPath}`);
        }
    }

    drawTiles();
}

function drawTiles() {
    const ctx = dom.gridCanvas.getContext('2d');
    const TILE_SIZE = 64; // Display size in the palette
    const PADDING = 5;
    const canvasWidth = dom.viewContainer.clientWidth;
    const tilesPerRow = Math.floor(canvasWidth / (TILE_SIZE + PADDING));

    const numRows = Math.ceil(allTiles.length / tilesPerRow);
    const canvasHeight = numRows * (TILE_SIZE + PADDING);

    dom.gridCanvas.width = canvasWidth;
    dom.gridCanvas.height = canvasHeight;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    allTiles.forEach((tile, index) => {
        const row = Math.floor(index / tilesPerRow);
        const col = index % tilesPerRow;
        const x = col * (TILE_SIZE + PADDING);
        const y = row * (TILE_SIZE + PADDING);

        // Draw the sprite clipped from its source image
        ctx.drawImage(
            tile.sourceImage,
            tile.rect.x, tile.rect.y, tile.rect.width, tile.rect.height,
            x, y, TILE_SIZE, TILE_SIZE
        );

        // Draw selection highlight
        if (index === selectedTileId) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        }
    });
}
