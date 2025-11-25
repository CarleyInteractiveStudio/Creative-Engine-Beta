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
let selectedGridCoord = null; // For deleting tiles in organize mode
let activeTool = 'tile-brush'; // Default tool
let isOrganizeMode = false;

// Viewport state for the infinite grid
let cameraOffset = { x: 0, y: 0 };
let cameraZoom = 1.0;
let isPanning = false;
let lastPanPosition = { x: 0, y: 0 };

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
        verticalToolbar: dependencies.dom.paletteToolsVertical,
        organizeSidebar: dependencies.dom.paletteOrganizeSidebar,
        associateSpriteBtn: dependencies.dom.paletteAssociateSpriteBtn,
        disassociateSpriteBtn: dependencies.dom.paletteDisassociateSpriteBtn,
        deleteSpriteBtn: dependencies.dom.paletteDeleteSpriteBtn,
        spritePackList: dependencies.dom.paletteSpritePackList,
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
        tiles: {},
        associatedSpritePacks: [],
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
                associatedSpritePacks: paletteData.spritePacks
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
    if (selectedTileId !== -1 && allTiles[selectedTileId]) {
        const tile = allTiles[selectedTileId];
        return {
            spriteName: tile.spriteName,
            imageData: tile.imageData
        };
    }
    return null;
}

export function getActiveTool() {
    return activeTool;
}


// --- Internal Logic ---

function setupEventListeners() {
    dom.saveBtn.addEventListener('click', saveCurrentPalette);
    dom.loadBtn.addEventListener('click', async () => {
        openAssetSelectorCallback('.cepalette', async (fileHandle) => {
            await openPalette(fileHandle);
        });
    });

    dom.associateSpriteBtn.addEventListener('click', () => {
        if (!currentPalette) return;
        openAssetSelectorCallback('.ceSprite', async (fileHandle, fullPath) => {
            if (!currentPalette.associatedSpritePacks.includes(fullPath)) {
                currentPalette.associatedSpritePacks.push(fullPath);
                await loadAndDisplayAssociatedSprites();
            } else {
                showNotification('Aviso', 'Este paquete de sprites ya está asociado.');
            }
        });
    });

    dom.deleteSpriteBtn.addEventListener('click', () => {
        if (isOrganizeMode && selectedGridCoord && currentPalette.tiles[selectedGridCoord]) {
            delete currentPalette.tiles[selectedGridCoord];
            const tileIndex = allTiles.findIndex(t => t.coord === selectedGridCoord);
            if (tileIndex > -1) {
                allTiles.splice(tileIndex, 1);
            }
            selectedGridCoord = null;
            dom.deleteSpriteBtn.disabled = true;
            drawTiles();
        }
    });

    dom.disassociateSpriteBtn.addEventListener('click', () => {
        if (!currentPalette || currentPalette.associatedSpritePacks.length === 0) {
            showNotification('Aviso', 'No hay paquetes de sprites asociados para eliminar.');
            return;
        }

        // For simplicity, we'll just remove the last one for now.
        // A better implementation would show a list to the user.
        showConfirmation('Desasociar Sprite', `¿Estás seguro de que quieres desasociar el último paquete de sprites añadido?`, () => {
            currentPalette.associatedSpritePacks.pop();
            loadAndDisplayAssociatedSprites();
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
    dom.gridCanvas.addEventListener('wheel', handleCanvasWheel, { passive: false });

    dom.spritePackList.addEventListener('click', (e) => {
        if (e.target.matches('.sidebar-sprite-preview')) {
            dom.spritePackList.querySelectorAll('.sidebar-sprite-preview').forEach(img => img.classList.remove('selected'));
            e.target.classList.add('selected');
        }
    });

    // --- Drag and Drop from Sidebar ---
    let draggedSpriteData = null;

    dom.spritePackList.addEventListener('dragstart', (e) => {
        if (e.target.matches('.sidebar-sprite-preview')) {
            draggedSpriteData = {
                spriteName: e.target.dataset.spriteName,
                imageData: e.target.dataset.imageData
            };
            e.dataTransfer.effectAllowed = 'copy';
        }
    });

    dom.gridCanvas.addEventListener('dragover', (e) => {
        if (isOrganizeMode && draggedSpriteData) {
            e.preventDefault(); // Allow the drop
        }
    });

    dom.gridCanvas.addEventListener('drop', (e) => {
        if (!isOrganizeMode || !draggedSpriteData) return;
        e.preventDefault();

        const gridSize = 32 * cameraZoom;
        const rect = dom.gridCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - cameraOffset.x);
        const worldY = (mouseY - cameraOffset.y);

        const gridX = Math.floor(worldX / gridSize);
        const gridY = Math.floor(worldY / gridSize);
        const coord = `${gridX},${gridY}`;

        currentPalette.tiles[coord] = draggedSpriteData;

        const existingTileIndex = allTiles.findIndex(t => t.coord === coord);
        if (existingTileIndex > -1) allTiles.splice(existingTileIndex, 1);

        const image = new Image();
        image.src = draggedSpriteData.imageData;
        image.onload = () => {
            allTiles.push({ ...draggedSpriteData, coord, image });
            drawTiles();
        };

        draggedSpriteData = null; // Reset
    });
}

function toggleOrganizeMode() {
    isOrganizeMode = !isOrganizeMode;
    dom.panel.classList.toggle('organize-mode-active', isOrganizeMode);
    dom.editBtn.classList.toggle('active', isOrganizeMode);

    dom.organizeSidebar.classList.toggle('hidden', !isOrganizeMode);
    dom.verticalToolbar.classList.toggle('hidden', isOrganizeMode);

    dom.gridCanvas.style.cursor = isOrganizeMode ? 'grab' : 'crosshair';

    if (isOrganizeMode) {
        activeTool = null;
        loadAndDisplayAssociatedSprites(); // Load sprites when entering mode
    } else {
        const defaultTool = dom.verticalToolbar.querySelector('[data-tool="tile-brush"]');
        if (defaultTool) {
            defaultTool.classList.add('active');
            activeTool = 'tile-brush';
        }
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
    if (event.button === 1 && isOrganizeMode) {
        isPanning = true;
        lastPanPosition = { x: event.clientX, y: event.clientY };
        dom.gridCanvas.style.cursor = 'move';
        event.preventDefault();
        return;
    }

    if (event.button === 0) {
        if (isOrganizeMode) {
            const gridSize = 32 * cameraZoom;
            const rect = dom.gridCanvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            const worldX = (mouseX - cameraOffset.x);
            const worldY = (mouseY - cameraOffset.y);
            const gridX = Math.floor(worldX / gridSize);
            const gridY = Math.floor(worldY / gridSize);
            const coord = `${gridX},${gridY}`;

            const selectedSprite = dom.spritePackList.querySelector('.selected');

            if (selectedSprite) {
                // Place a new tile
                const newTileData = { spriteName: selectedSprite.dataset.spriteName, imageData: selectedSprite.dataset.imageData };
                currentPalette.tiles[coord] = newTileData;
                const existingTileIndex = allTiles.findIndex(t => t.coord === coord);
                if (existingTileIndex > -1) allTiles.splice(existingTileIndex, 1);
                const image = new Image();
                image.src = newTileData.imageData;
                image.onload = () => {
                    allTiles.push({ ...newTileData, coord, image });
                    drawTiles();
                };
            } else {
                // Select an existing tile
                if (currentPalette.tiles[coord]) {
                    selectedGridCoord = coord;
                    dom.deleteSpriteBtn.disabled = false;
                } else {
                    selectedGridCoord = null;
                    dom.deleteSpriteBtn.disabled = true;
                }
                drawTiles();
            }
        } else {
            // Paint mode selection logic
            const clickedIndex = getTileIndexFromEvent(event);
            if (clickedIndex >= 0 && clickedIndex < allTiles.length) {
                 selectedTileId = (selectedTileId === clickedIndex) ? -1 : clickedIndex;
                 dom.selectedTileIdSpan.textContent = selectedTileId === -1 ? '-' : (allTiles[selectedTileId]?.spriteName || '-');
                 drawTiles();
            }
        }
    }
}

async function loadAndDisplayAssociatedSprites() {
    dom.spritePackList.innerHTML = '';
    if (!currentPalette || !currentPalette.associatedSpritePacks) return;

    const imageCache = new Map();

    for (const packPath of currentPalette.associatedSpritePacks) {
        try {
            const packFileHandle = await getFileHandleForPath(packPath, projectsDirHandle);
            const packFile = await packFileHandle.getFile();
            const packData = JSON.parse(await packFile.text());

            let sourceImage = imageCache.get(packData.sourceImage);
            if (!sourceImage) {
                const sourceImagePath = `Assets/${packData.sourceImage}`;
                const imageUrl = await getURLForAssetPath(sourceImagePath, projectsDirHandle);
                if (!imageUrl) continue;
                sourceImage = new Image();
                sourceImage.src = imageUrl;
                await sourceImage.decode();
                imageCache.set(packData.sourceImage, sourceImage);
            }

            for (const spriteName in packData.sprites) {
                const spriteData = packData.sprites[spriteName];
                const canvas = document.createElement('canvas');
                const tempSize = 64; // Sidebar preview size
                canvas.width = tempSize;
                canvas.height = tempSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(
                    sourceImage,
                    spriteData.rect.x, spriteData.rect.y,
                    spriteData.rect.width, spriteData.rect.height,
                    0, 0, tempSize, tempSize
                );

                const img = new Image();
                img.src = canvas.toDataURL();
                img.title = `${spriteName}\n(${packPath})`;
                img.dataset.spriteName = spriteName;
                img.dataset.spritePackPath = packPath;
                img.dataset.imageData = img.src;
                img.classList.add('sidebar-sprite-preview');
                img.draggable = true; // Enable dragging
                dom.spritePackList.appendChild(img);
            }

        } catch (error) {
            console.error(`Error loading associated sprite pack ${packPath}:`, error);
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

        drawTiles(); // Redraw with the new offset
        return;
    }
}

function handleCanvasMouseUp(event) {
    if (event.button === 1 && isPanning) {
        isPanning = false;
        dom.gridCanvas.style.cursor = isOrganizeMode ? 'grab' : 'crosshair';
        event.preventDefault();
        return;
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
    const PADDING = 0;
    const canvasWidth = dom.viewContainer.clientWidth;
    const tilesPerRow = Math.max(1, Math.floor(canvasWidth / (PALETTE_TILE_SIZE + PADDING)));

    const numRows = Math.ceil(allTiles.length / tilesPerRow);
    const canvasHeight = numRows * (PALETTE_TILE_SIZE + PADDING);

    dom.gridCanvas.width = canvasWidth;
    dom.gridCanvas.height = Math.max(dom.viewContainer.clientHeight, canvasHeight);
    ctx.clearRect(0, 0, dom.gridCanvas.width, dom.gridCanvas.height);

    allTiles.forEach((tile, index) => {
        const row = Math.floor(index / tilesPerRow);
        const col = index % tilesPerRow;
        const x = col * (PALETTE_TILE_SIZE + PADDING);
        const y = row * (PALETTE_TILE_SIZE + PADDING);

        ctx.drawImage(
            tile.image, // Use the pre-loaded image object
            x, y, PALETTE_TILE_SIZE, PALETTE_TILE_SIZE
        );

        if (index === selectedTileId) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1.5, y + 1.5, PALETTE_TILE_SIZE - 3, PALETTE_TILE_SIZE - 3);
        }
    });
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
    const gridSize = 32 * cameraZoom;
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
