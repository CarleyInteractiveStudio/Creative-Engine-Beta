import { getURLForAssetPath, getFileHandleForPath } from '../../engine/AssetUtils.js';
let allTiles = [];
import { showNotification, showConfirmation } from './DialogWindow.js';

const PALETTE_TILE_SIZE = 32;
let dom = {};
let projectsDirHandle = null;
let openAssetSelectorCallback = null;
let currentPalette = null; // Will hold the entire loaded palette asset content
let currentFileHandle = null;
let selectedTileId = -1;
let activeTool = 'tile-brush'; // Default tool
let isOrganizeMode = false;
let draggedTileIndex = -1;
let dropTargetIndex = -1;

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
            dom.editBtn.disabled = allTiles.length === 0;
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

    dom.editBtn.addEventListener('click', toggleOrganizeMode);

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

    dom.gridCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    dom.gridCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    dom.gridCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    dom.gridCanvas.addEventListener('mouseleave', handleCanvasMouseLeave);
}

function toggleOrganizeMode() {
    isOrganizeMode = !isOrganizeMode;
    dom.editBtn.classList.toggle('active', isOrganizeMode);
    dom.gridCanvas.style.cursor = isOrganizeMode ? 'grab' : 'crosshair';

    if (isOrganizeMode) {
        // Disable other tools
        dom.verticalToolbar.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.disabled = true;
        });
        activeTool = null;
    } else {
        // Re-enable tools and set default
        dom.verticalToolbar.querySelectorAll('.tool-btn').forEach(btn => btn.disabled = false);
        const defaultTool = dom.verticalToolbar.querySelector('[data-tool="tile-brush"]');
        if (defaultTool) {
            defaultTool.classList.add('active');
            activeTool = 'tile-brush';
        }
    }
}

async function saveCurrentPalette() {
    if (!currentFileHandle || !currentPalette) return;
    try {
        // Update the palette object with the current tile order
        currentPalette.tiles = allTiles.map(tile => ({
            spriteAssetPath: tile.spriteAssetPath,
            spriteName: tile.spriteName
        }));

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

function getTileIndexFromEvent(event) {
    const PADDING = 0;
    const canvasWidth = dom.viewContainer.clientWidth;
    const tilesPerRow = Math.max(1, Math.floor(canvasWidth / (PALETTE_TILE_SIZE + PADDING)));
    const rect = dom.gridCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const scrollX = dom.viewContainer.scrollLeft;
    const scrollY = dom.viewContainer.scrollTop;
    const col = Math.floor((x + scrollX) / (PALETTE_TILE_SIZE + PADDING));
    const row = Math.floor((y + scrollY) / (PALETTE_TILE_SIZE + PADDING));
    return row * tilesPerRow + col;
}

function handleCanvasMouseDown(event) {
    const clickedIndex = getTileIndexFromEvent(event);

    if (clickedIndex < 0 || clickedIndex >= allTiles.length) return;

    if (isOrganizeMode) {
        draggedTileIndex = clickedIndex;
        dom.gridCanvas.style.cursor = 'grabbing';
    } else {
        selectedTileId = (selectedTileId === clickedIndex) ? -1 : clickedIndex;
        dom.selectedTileIdSpan.textContent = selectedTileId === -1 ? '-' : allTiles[selectedTileId].spriteName;
        drawTiles(); // Redraw to show selection change
    }
}

function handleCanvasMouseMove(event) {
    if (draggedTileIndex === -1) return;

    dropTargetIndex = getTileIndexFromEvent(event);
    if (dropTargetIndex >= allTiles.length) {
        dropTargetIndex = -1; // Invalid target
    }
    drawTiles(); // Redraw to show the drop indicator
}

function handleCanvasMouseUp(event) {
    if (draggedTileIndex === -1) return;

    const dropIndex = getTileIndexFromEvent(event);
    if (dropIndex >= 0 && dropIndex < allTiles.length && draggedTileIndex !== dropIndex) {
        // Perform the reorder
        const itemToMove = allTiles.splice(draggedTileIndex, 1)[0];
        allTiles.splice(dropIndex, 0, itemToMove);
    }

    // Reset drag state
    draggedTileIndex = -1;
    dropTargetIndex = -1;
    dom.gridCanvas.style.cursor = 'grab';
    drawTiles();
    // Mark the palette as dirty so it can be saved
    // (This will be implemented in the saving step)
}

function handleCanvasMouseLeave(event) {
    if (draggedTileIndex !== -1) {
        // Cancel the drag if the mouse leaves the canvas
        draggedTileIndex = -1;
        dropTargetIndex = -1;
        dom.gridCanvas.style.cursor = 'grab';
        drawTiles();
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
    const availableSprites = new Map();

    for (const packPath of currentPalette.spritePacks) {
        try {
            const packFileHandle = await getFileHandleForPath(packPath, projectsDirHandle);
            if (!packFileHandle) throw new Error(`File handle for ${packPath} not found.`);

            const packFile = await packFileHandle.getFile();
            const packContent = await packFile.text();
            const packData = JSON.parse(packContent);

            if (!imageCache.has(packData.sourceImage)) {
                const sourceImagePath = `Assets/${packData.sourceImage}`;
                const imageUrl = await getURLForAssetPath(sourceImagePath, projectsDirHandle);
                if (!imageUrl) continue;

                const image = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = imageUrl;
                });
                imageCache.set(packData.sourceImage, image);
            }
            const sourceImage = imageCache.get(packData.sourceImage);

            for (const spriteName in packData.sprites) {
                const spriteData = packData.sprites[spriteName];
                const id = `${packPath}|${spriteName}`;
                availableSprites.set(id, {
                    id,
                    spriteAssetPath: packPath,
                    spriteName,
                    sourceImage,
                    rect: spriteData.rect
                });
            }
        } catch (error) {
            console.error(`Error loading sprite pack '${packPath}':`, error);
            showNotification('Error', `Could not load sprite pack: ${packPath}`);
        }
    }

    if (currentPalette.tiles && currentPalette.tiles.length > 0) {
        // Load tiles in the saved order
        currentPalette.tiles.forEach(tileInfo => {
            const id = `${tileInfo.spriteAssetPath}|${tileInfo.spriteName}`;
            if (availableSprites.has(id)) {
                allTiles.push(availableSprites.get(id));
                availableSprites.delete(id); // Remove to avoid duplication
            }
        });
        // Add any new sprites that weren't in the saved order
        allTiles.push(...availableSprites.values());
    } else {
        // Legacy palette or new palette, just add all found sprites
        allTiles = Array.from(availableSprites.values());
    }

    drawTiles();
}

function drawTiles() {
    const ctx = dom.gridCanvas.getContext('2d');
    const PADDING = 0;
    const canvasWidth = dom.viewContainer.clientWidth;
    const tilesPerRow = Math.floor(canvasWidth / (PALETTE_TILE_SIZE + PADDING));

    const numRows = Math.ceil(allTiles.length / tilesPerRow);
    const canvasHeight = numRows * (PALETTE_TILE_SIZE + PADDING);

    dom.gridCanvas.width = canvasWidth;
    dom.gridCanvas.height = canvasHeight;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    allTiles.forEach((tile, index) => {
        const row = Math.floor(index / tilesPerRow);
        const col = index % tilesPerRow;
        const x = col * (PALETTE_TILE_SIZE + PADDING);
        const y = row * (PALETTE_TILE_SIZE + PADDING);

        // Draw the sprite clipped from its source image
        ctx.drawImage(
            tile.sourceImage,
            tile.rect.x, tile.rect.y, tile.rect.width, tile.rect.height,
            x, y, PALETTE_TILE_SIZE, PALETTE_TILE_SIZE
        );

        // Draw selection highlight
        if (index === selectedTileId && !isOrganizeMode) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, PALETTE_TILE_SIZE, PALETTE_TILE_SIZE);
        }

        // Handle drag and drop visuals
        if (isOrganizeMode) {
            if (index === draggedTileIndex) {
                ctx.globalAlpha = 0.5; // Make the dragged tile semi-transparent
                ctx.drawImage(
                    tile.sourceImage,
                    tile.rect.x, tile.rect.y, tile.rect.width, tile.rect.height,
                    x, y, PALETTE_TILE_SIZE, PALETTE_TILE_SIZE
                );
                ctx.globalAlpha = 1.0;
            }
            if (index === dropTargetIndex && dropTargetIndex !== draggedTileIndex) {
                 // Draw a drop indicator
                ctx.fillStyle = 'rgba(0, 150, 255, 0.5)';
                ctx.fillRect(x, y, PALETTE_TILE_SIZE, PALETTE_TILE_SIZE);
            }
        }
    });
}
