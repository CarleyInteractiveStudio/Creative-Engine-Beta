import { getURLForAssetPath, getFileHandleForPath } from '../../engine/AssetUtils.js';
let allTiles = [];
import { showNotification, showConfirmation, showSelection } from './DialogWindow.js';

const PALETTE_TILE_SIZE = 32;
let dom = {};
let projectsDirHandle = null;
let openAssetSelectorCallback = null;
let setActiveToolCallback = null;
let currentPalette = null; // Will hold the entire loaded palette asset content
let currentFileHandle = null;
let selectedTileId = -1;
let selectedGridCoord = null; // For deleting tiles in organize mode
let activeTool = 'tile-brush'; // Default tool
let isOrganizeMode = false;

// Viewport state for the infinite grid
let cameraOffset = { x: 0, y: 0 };
let cameraZoom = 1.0;
let isPanning = false;
let lastPanPosition = { x: 0, y: 0 };

// Rectangle selection state
let isDrawingRect = false;
let rectStartPoint = null;
let rectCurrentPoint = null;
let selectedTileIds = [];


// --- Public API ---

export function initialize(dependencies) {
    dom = {
        panel: dependencies.dom.tilePalettePanel,
        fileNameSpan: dependencies.dom.paletteFileName,
        saveBtn: dependencies.dom.paletteSaveBtn,
        loadBtn: dependencies.dom.paletteLoadBtn,
        editBtn: dependencies.dom.paletteEditBtn,
        selectedTileIdSpan: dependencies.dom.paletteSelectedTileId,
        viewContainer: dependencies.dom.paletteViewContainer,
        gridCanvas: dependencies.dom.paletteGridCanvas,
        overlay: dependencies.dom.palettePanelOverlay,
        organizeSidebar: dependencies.dom.paletteOrganizeSidebar,
        newTileBtn: dependencies.dom.paletteNewTileBtn,
        deleteTileBtn: dependencies.dom.paletteDeleteTileBtn,
        spritePackList: dependencies.dom.paletteSpritePackList,
    };
    projectsDirHandle = dependencies.projectsDirHandle;
    openAssetSelectorCallback = dependencies.openAssetSelectorCallback;
    setActiveToolCallback = dependencies.setActiveToolCallback;


    // Initially, the panel is in its "empty" state
    dom.overlay.style.display = 'flex';
    dom.saveBtn.style.display = 'none'; // Will be shown when a palette is open

    setupEventListeners();
}

export async function createNewPalette(name, dirHandle) {
    const content = {
        name: name.replace('.cepalette', ''),
        tiles: {},
        paintOrder: [] // Array of coords "x,y" to maintain order in paint mode
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
        let paletteData = JSON.parse(content);
        currentFileHandle = fileHandle;

        // --- Compatibility Check & Conversion ---
        if (paletteData.spritePacks) { // This is a legacy palette
            console.log("Legacy palette detected. Converting to new format in memory.");
            const newTiles = {};
            // This is a simplified conversion. A real one would need to load
            // the sprite packs and assign coordinates. For now, we'll just
            // create the new structure. The user will need to re-organize.
            paletteData = {
                name: paletteData.name || file.name.replace('.cepalette', ''),
                tiles: {}, // User will need to re-populate this.
            };
            showNotification('Paleta Actualizada', 'Formato de paleta antiguo detectado. Se ha actualizado al nuevo formato. Por favor, organiza y guarda la paleta.');
        }

        currentPalette = paletteData;

        if (!currentPalette.paintOrder) {
            currentPalette.paintOrder = Object.keys(currentPalette.tiles);
        }

        allTiles = [];

        for (const coord of currentPalette.paintOrder) {
            if (currentPalette.tiles[coord]) {
                const tileData = currentPalette.tiles[coord];
                const image = new Image();
                image.src = tileData.imageData;
                await image.decode();

                allTiles.push({
                    ...tileData,
                    coord: coord,
                    image: image
                });
            }
        }

        selectedTileId = -1;
        dom.panel.classList.remove('hidden');
        dom.overlay.style.display = 'none';
        dom.fileNameSpan.textContent = file.name;
        dom.selectedTileIdSpan.textContent = '-';
        dom.saveBtn.style.display = 'inline-block';
        dom.editBtn.disabled = false;

        drawTiles(); // Redraw with the loaded tiles

    } catch (error) {
        console.error(`Error opening palette ${fileHandle.name}:`, error);
        showNotification('Error', `No se pudo abrir la paleta: ${error.message}`);
        currentPalette = null;
        currentFileHandle = null;
        dom.fileNameSpan.textContent = 'Error';
    }
}

export function getSelectedTile() {
    // Case 1: Rectangle tool is active for multi-tile selection (creating a "stamp")
    if (activeTool === 'tile-rectangle-fill' && selectedTileIds.length > 0) {
        const selectedTiles = selectedTileIds.map(id => allTiles[id]).filter(Boolean);
        if (selectedTiles.length === 0) return [];

        // Find the top-left coordinate of the selection's bounding box
        let minX = Infinity;
        let minY = Infinity;
        selectedTiles.forEach(tile => {
            const [x, y] = tile.coord.split(',').map(Number);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
        });

        // Return tile data with relative coordinates from the top-left corner
        return selectedTiles.map(tile => {
            const [x, y] = tile.coord.split(',').map(Number);
            return {
                spriteName: tile.spriteName,
                imageData: tile.imageData,
                relX: x - minX,
                relY: y - minY
            };
        });
    }
    // Case 2: Standard brush tool for single-tile selection
    else if (activeTool === 'tile-brush' && selectedTileId !== -1 && allTiles[selectedTileId]) {
        const tile = allTiles[selectedTileId];
        // Return in a consistent format with relative coords
        return [{
            spriteName: tile.spriteName,
            imageData: tile.imageData,
            relX: 0,
            relY: 0
        }];
    }

    // Default: No valid selection
    return []; // Return an empty array for consistency
}

export function getActiveTool() {
    return activeTool;
}

export function setActiveTool(toolName) {
    // This function allows external modules to set the palette's active tool.
    // Ensure the tool is valid for the palette.
    const validTools = ['tile-brush', 'tile-rectangle-fill', 'tile-eraser', 'organize'];
    if (!validTools.includes(toolName)) return;

    // Don't do anything if organize mode is active and a paint tool is selected
    if (isOrganizeMode && toolName !== 'organize') return;

    activeTool = toolName;

    // Update the UI of the tool bubble inside the palette
    const toolBubble = dom.panel.querySelector('.tool-bubble');
    if (toolBubble) {
        toolBubble.querySelectorAll('.tool-btn').forEach(btn => {
            if (btn.dataset.tool === toolName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Reset selections if the tool changes to a paint tool
    if (toolName === 'tile-brush' || toolName === 'tile-rectangle-fill') {
        selectedTileId = -1;
        selectedTileIds = [];
        dom.selectedTileIdSpan.textContent = '-';
        drawTiles();
    }
}


// --- Internal Logic ---

function setupEventListeners() {
    dom.saveBtn.addEventListener('click', saveCurrentPalette);
    dom.loadBtn.addEventListener('click', async () => {
        openAssetSelectorCallback(async (fileHandle) => {
            await openPalette(fileHandle);
        }, ['.cepalette']);
    });

    dom.newTileBtn.addEventListener('click', () => {
        if (!currentPalette) return;

        openAssetSelectorCallback(async (fileHandle, fullPath) => {
            try {
                const spriteFile = await fileHandle.getFile();
                const spriteData = JSON.parse(await spriteFile.text());

                // Now, open a sprite selector window/modal to pick a sprite from the pack
                window.Dialogs.showSpriteSelector(spriteData, async (selectedSpriteName) => {
                    const spriteInfo = spriteData.sprites[selectedSpriteName];
                    if (!spriteInfo) return;

                    // Create an image from the source
                    const sourceImage = new Image();
                    const imageUrl = await getURLForAssetPath(`Assets/${spriteData.sourceImage}`, projectsDirHandle);
                    sourceImage.src = imageUrl;
                    await sourceImage.decode();

                    // Create a canvas to extract the sprite image data
                    const canvas = document.createElement('canvas');
                    canvas.width = spriteInfo.rect.width;
                    canvas.height = spriteInfo.rect.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(
                        sourceImage,
                        spriteInfo.rect.x, spriteInfo.rect.y,
                        spriteInfo.rect.width, spriteInfo.rect.height,
                        0, 0,
                        spriteInfo.rect.width, spriteInfo.rect.height
                    );
                    const imageData = canvas.toDataURL();

                    // Find the first available coordinate in the grid
                    let x = 0, y = 0;
                    const existingCoords = new Set(Object.keys(currentPalette.tiles));
                    while (existingCoords.has(`${x},${y}`)) {
                        x++;
                        if (x > 20) { // arbitrary limit to prevent infinite loops
                            x = 0;
                            y++;
                        }
                    }
                    const coord = `${x},${y}`;

                    const newTileData = { spriteName: selectedSpriteName, imageData };
                    currentPalette.tiles[coord] = newTileData;

                    const image = new Image();
                    image.src = imageData;
                    await image.decode();
                    allTiles.push({ ...newTileData, coord, image });

                    drawTiles();
                    showNotification('Éxito', `Tile '${selectedSpriteName}' añadido a la paleta.`);
                });

            } catch (error) {
                console.error(`Error adding new tile:`, error);
                showNotification('Error', `No se pudo añadir el tile: ${error.message}`);
            }
        }, ['.ceSprite']);
    });

    dom.deleteTileBtn.addEventListener('click', () => {
        if (!isOrganizeMode || !selectedGridCoord) {
            showNotification('Aviso', 'Selecciona un tile en la rejilla para eliminar.');
            return;
        }

        showConfirmation('Confirmar Eliminación', `¿Estás seguro de que quieres eliminar el tile en [${selectedGridCoord}]?`, () => {
            delete currentPalette.tiles[selectedGridCoord];
            allTiles = allTiles.filter(tile => tile.coord !== selectedGridCoord);
            selectedGridCoord = null; // Deselect
            drawTiles();
        });
    });

    const toolBubble = dom.panel.querySelector('.tool-bubble');
    if (toolBubble) {
        toolBubble.addEventListener('click', (e) => {
            const toolBtn = e.target.closest('.tool-btn');
            if (!toolBtn) return;

            const newTool = toolBtn.dataset.tool;

            // If the organize button is clicked, just toggle the mode
            if (newTool === 'organize') {
                toggleOrganizeMode();
                return; // Stop further processing for this click
            }

            // --- Logic for tool switching ---
            if (newTool !== activeTool) {
                // Reset selections when tool changes
                selectedTileId = -1;
                selectedTileIds = [];
                dom.selectedTileIdSpan.textContent = '-'; // Update counter on tool change
            }

            activeTool = newTool;

            // Update UI
            toolBubble.querySelectorAll('.tool-btn:not([data-tool="organize"])').forEach(btn => btn.classList.remove('active'));
            toolBtn.classList.add('active');

            // Redraw to clear visual selection artifacts
            drawTiles();
        });
    }

    dom.gridCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    dom.gridCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    dom.gridCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    dom.gridCanvas.addEventListener('mouseleave', handleCanvasMouseLeave);
    dom.gridCanvas.addEventListener('wheel', handleCanvasWheel, { passive: false });

    dom.spritePackList.addEventListener('click', (e) => {
        if (e.target.matches('.sidebar-sprite-preview')) {
            dom.spritePackList.querySelectorAll('.sidebar-sprite-preview').forEach(img => img.classList.remove('selected'));
            e.target.classList.add('selected');

            // Deactivate delete tool when a new sprite is selected for painting
            activeTool = null;
            dom.gridCanvas.style.cursor = 'grab';
        }
    });

}

function toggleOrganizeMode() {
    isOrganizeMode = !isOrganizeMode;

    // Reset selections when changing mode
    selectedTileId = -1;
    selectedTileIds = [];
    dom.selectedTileIdSpan.textContent = '-';
    selectedGridCoord = null;

    dom.panel.classList.toggle('organize-mode-active', isOrganizeMode);
    dom.editBtn.classList.toggle('active', isOrganizeMode);

    dom.organizeSidebar.classList.toggle('hidden', !isOrganizeMode);

    // Hide/show relevant parts of the main toolbar bubble
    dom.panel.querySelector('.tool-bubble').querySelectorAll('[data-tool="tile-brush"], [data-tool="tile-rectangle-fill"], [data-tool="tile-eraser"]').forEach(btn => {
        btn.style.display = isOrganizeMode ? 'none' : 'flex';
    });

    dom.gridCanvas.style.cursor = isOrganizeMode ? 'grab' : 'crosshair';

    if (isOrganizeMode) {
        activeTool = null; // No tool is active in organize mode initially
    } else {
        // When returning to Paint Mode, select the brush by default
        const toolBubble = dom.panel.querySelector('.tool-bubble');
        if (toolBubble) {
            toolBubble.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            const brushBtn = toolBubble.querySelector('[data-tool="tile-brush"]');
            if (brushBtn) {
                brushBtn.classList.add('active');
            }
        }
        activeTool = 'tile-brush';
    }
    drawTiles();
}

async function saveCurrentPalette() {
    if (!currentFileHandle || !currentPalette) return;
    try {
        // Update the paintOrder array based on the current `allTiles` order
        currentPalette.paintOrder = allTiles.map(tile => tile.coord);

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
    if (allTiles.length === 0) return -1;

    const TILE_SIZE = PALETTE_TILE_SIZE;
    const PADDING = 2;
    const TOTAL_CELL_SIZE = TILE_SIZE + PADDING;

    let minX = Infinity;
    let minY = Infinity;
    allTiles.forEach(tile => {
        const [x, y] = tile.coord.split(',').map(Number);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
    });

    // This is the robust way to calculate mouse coords inside a scrolled element.
    // 1. Get the bounding box of the scrollable container.
    const rect = dom.viewContainer.getBoundingClientRect();
    // 2. Calculate mouse position relative to the container's top-left corner.
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    // 3. Add the container's scroll offsets to get the absolute position on the canvas.
    const canvasX = mouseX + dom.viewContainer.scrollLeft;
    const canvasY = mouseY + dom.viewContainer.scrollTop;

    const col = Math.floor(canvasX / TOTAL_CELL_SIZE);
    const row = Math.floor(canvasY / TOTAL_CELL_SIZE);

    const gridX = col + minX;
    const gridY = row + minY;
    const coord = `${gridX},${gridY}`;

    return allTiles.findIndex(tile => tile.coord === coord);
}

function handleCanvasMouseDown(event) {
    if (event.button === 1 && isOrganizeMode) {
        isPanning = true;
        lastPanPosition = { x: event.clientX, y: event.clientY };
        dom.gridCanvas.style.cursor = 'move';
        event.preventDefault();
        return;
    }

    if (event.button === 0) {
        if (isOrganizeMode) {
            const gridSize = PALETTE_TILE_SIZE * cameraZoom;
            const rect = dom.gridCanvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            const worldX = (mouseX - cameraOffset.x);
            const worldY = (mouseY - cameraOffset.y);
            const gridX = Math.floor(worldX / gridSize);
            const gridY = Math.floor(worldY / gridSize);
            const coord = `${gridX},${gridY}`;

            // In organize mode, clicking a tile selects it for deletion.
            if (currentPalette.tiles[coord]) {
                selectedGridCoord = coord;
                drawTiles(); // Redraw to show selection highlight
            }

        } else { // Paint Mode
            if (activeTool === 'tile-brush') {
                // MY CHANGE: Clear multi-select when using single-select brush
                selectedTileIds = [];

                const clickedIndex = getTileIndexFromEvent(event);
                if (clickedIndex >= 0 && clickedIndex < allTiles.length) {
                    selectedTileId = (selectedTileId === clickedIndex) ? -1 : clickedIndex;
                    // Use "1 Tile" for consistency with rectangle selection counter
                    dom.selectedTileIdSpan.textContent = selectedTileId === -1 ? '-' : '1 Tile';
                    if (selectedTileId !== -1 && setActiveToolCallback) {
                        setActiveToolCallback('tile-brush');
                    }
                    drawTiles();
                }
            } else if (activeTool === 'tile-rectangle-fill') {
                // MY CHANGE: Clear single-select when using multi-select rect
                selectedTileId = -1;
                selectedTileIds = [];

                isDrawingRect = true;
                // Manual calculation for scroll-proof coordinates
                const rect = dom.viewContainer.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                rectStartPoint = {
                    x: mouseX + dom.viewContainer.scrollLeft,
                    y: mouseY + dom.viewContainer.scrollTop
                };

                dom.selectedTileIdSpan.textContent = '-';
                drawTiles();
            }
        }
    }
}

function handleCanvasMouseMove(event) {
    if (isPanning) {
        const dx = event.clientX - lastPanPosition.x;
        const dy = event.clientY - lastPanPosition.y;
        lastPanPosition = { x: event.clientX, y: event.clientY };
        cameraOffset.x += dx;
        cameraOffset.y += dy;
        drawTiles();
        return;
    }

    if (isDrawingRect) {
        const rect = dom.viewContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        rectCurrentPoint = {
            x: mouseX + dom.viewContainer.scrollLeft,
            y: mouseY + dom.viewContainer.scrollTop
        };
        drawTiles();
    }
}

function handleCanvasMouseUp(event) {
    if (event.button === 1 && isPanning) {
        isPanning = false;
        dom.gridCanvas.style.cursor = isOrganizeMode ? 'grab' : 'crosshair';
        event.preventDefault();
        return;
    }

    if (isDrawingRect) {
        isDrawingRect = false;
        const rect = dom.viewContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const rectEndPoint = {
            x: mouseX + dom.viewContainer.scrollLeft,
            y: mouseY + dom.viewContainer.scrollTop
        };

        const selectionRect = {
            x1: Math.min(rectStartPoint.x, rectEndPoint.x),
            y1: Math.min(rectStartPoint.y, rectEndPoint.y),
            x2: Math.max(rectStartPoint.x, rectEndPoint.x),
            y2: Math.max(rectStartPoint.y, rectEndPoint.y)
        };

        const TILE_SIZE = PALETTE_TILE_SIZE;
        const PADDING = 2;
        const TOTAL_CELL_SIZE = TILE_SIZE + PADDING;
        let minX = Infinity, minY = Infinity;
        allTiles.forEach(t => {
            const [x, y] = t.coord.split(',').map(Number);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
        });

        selectedTileIds = [];
        allTiles.forEach((tile, index) => {
            const [gridX, gridY] = tile.coord.split(',').map(Number);
            const tileRect = {
                x1: (gridX - minX) * TOTAL_CELL_SIZE,
                y1: (gridY - minY) * TOTAL_CELL_SIZE,
                x2: ((gridX - minX) * TOTAL_CELL_SIZE) + TOTAL_CELL_SIZE,
                y2: ((gridY - minY) * TOTAL_CELL_SIZE) + TOTAL_CELL_SIZE
            };

            // MY CHANGE: Use intersection for selection
            if (selectionRect.x1 < tileRect.x2 && selectionRect.x2 > tileRect.x1 &&
                selectionRect.y1 < tileRect.y2 && selectionRect.y2 > tileRect.y1) {
                selectedTileIds.push(index);
            }
        });

        // MY CHANGE: Use "Tiles" for counter consistency
        if (selectedTileIds.length === 0) {
            dom.selectedTileIdSpan.textContent = '-';
        } else {
            dom.selectedTileIdSpan.textContent = `${selectedTileIds.length} Tiles`;
        }

        rectStartPoint = null;
        rectCurrentPoint = null;
        drawTiles();
    }
}

function handleCanvasMouseLeave(event) {
    if (isPanning) {
        isPanning = false;
        dom.gridCanvas.style.cursor = isOrganizeMode ? 'grab' : 'crosshair';
    }
}

function handleCanvasWheel(event) {
    if (!isOrganizeMode) return;
    event.preventDefault();

    const zoomIntensity = 0.1;
    const scroll = event.deltaY < 0 ? 1 : -1;
    const zoomAmount = Math.exp(scroll * zoomIntensity);

    const rect = dom.gridCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const worldX = (mouseX - cameraOffset.x) / cameraZoom;
    const worldY = (mouseY - cameraOffset.y) / cameraZoom;

    cameraZoom *= zoomAmount;
    cameraZoom = Math.max(0.2, Math.min(cameraZoom, 3));

    cameraOffset.x = mouseX - worldX * cameraZoom;
    cameraOffset.y = mouseY - worldY * cameraZoom;

    drawTiles();
}

function drawTiles() {
    if (isOrganizeMode) {
        drawOrganizeMode();
    } else {
        drawPaintMode();
    }
}

function drawPaintMode() {
    const ctx = dom.gridCanvas.getContext('2d');
    const TILE_SIZE = PALETTE_TILE_SIZE;
    const PADDING = 2;
    const TOTAL_CELL_SIZE = TILE_SIZE + PADDING;

    if (allTiles.length === 0) {
        ctx.clearRect(0, 0, dom.gridCanvas.width, dom.gridCanvas.height);
        dom.gridCanvas.width = dom.viewContainer.clientWidth;
        dom.gridCanvas.height = dom.viewContainer.clientHeight;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.textAlign = 'center';
        ctx.fillText("Esta paleta está vacía.", dom.gridCanvas.width / 2, 50);
        ctx.fillText("Entra en 'Modo Edición' para asociar sprites y añadirlos.", dom.gridCanvas.width / 2, 70);
        return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    allTiles.forEach(tile => {
        const [x, y] = tile.coord.split(',').map(Number);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });

    const gridWidth = (maxX - minX + 1);
    const gridHeight = (maxY - minY + 1);
    const canvasWidth = gridWidth * TOTAL_CELL_SIZE;
    const canvasHeight = gridHeight * TOTAL_CELL_SIZE;

    dom.gridCanvas.width = Math.max(dom.viewContainer.clientWidth, canvasWidth);
    dom.gridCanvas.height = Math.max(dom.viewContainer.clientHeight, canvasHeight);
    ctx.clearRect(0, 0, dom.gridCanvas.width, dom.gridCanvas.height);

    const gridColor = 'rgba(255, 255, 255, 0.1)';

    allTiles.forEach((tile, index) => {
        const [gridX, gridY] = tile.coord.split(',').map(Number);
        const x = (gridX - minX) * TOTAL_CELL_SIZE;
        const y = (gridY - minY) * TOTAL_CELL_SIZE;

        // Reset stroke style for every tile to draw the grid border correctly
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TOTAL_CELL_SIZE, TOTAL_CELL_SIZE);

        ctx.drawImage(tile.image, x + PADDING / 2, y + PADDING / 2, TILE_SIZE, TILE_SIZE);

        // MERGED CHANGE: Using concise version from main but with my multi-tool logic
        const isSelected = (activeTool === 'tile-brush' && index === selectedTileId) ||
                           (activeTool === 'tile-rectangle-fill' && selectedTileIds.includes(index));

        if (isSelected) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + PADDING / 2, y + PADDING / 2, TILE_SIZE, TILE_SIZE);
        }
    });

    // Draw the selection rectangle preview
    if (isDrawingRect && rectStartPoint && rectCurrentPoint) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Dashed line for preview
        const rectWidth = rectCurrentPoint.x - rectStartPoint.x;
        const rectHeight = rectCurrentPoint.y - rectStartPoint.y;
        ctx.strokeRect(rectStartPoint.x, rectStartPoint.y, rectWidth, rectHeight);
        ctx.setLineDash([]); // Reset line dash
    }
}

function drawOrganizeMode() {
    const canvas = dom.gridCanvas;
    const ctx = canvas.getContext('2d');

    // Ensure canvas fills the container
    canvas.width = dom.viewContainer.clientWidth;
    canvas.height = dom.viewContainer.clientHeight;

    // Background color
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-background-deep').trim();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Grid Drawing ---
    const gridSize = PALETTE_TILE_SIZE * cameraZoom;
    const gridColor = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    const startX = cameraOffset.x % gridSize;
    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    const startY = cameraOffset.y % gridSize;
    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // --- Tile Drawing ---
    if (currentPalette && currentPalette.tiles) {
        for (const coord in currentPalette.tiles) {
            const tile = allTiles.find(t => t.coord === coord);
            if (tile && tile.image) {
                const [x, y] = coord.split(',').map(Number);
                const screenX = cameraOffset.x + x * gridSize;
                const screenY = cameraOffset.y + y * gridSize;

                // Simple culling
                if (screenX > -gridSize && screenX < canvas.width && screenY > -gridSize && screenY < canvas.height) {
                    ctx.drawImage(tile.image, screenX, screenY, gridSize, gridSize);

                    if (coord === selectedGridCoord) {
                        ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(screenX + 1, screenY + 1, gridSize - 2, gridSize - 2);
                    }
                }
            }
        }
    }
}
