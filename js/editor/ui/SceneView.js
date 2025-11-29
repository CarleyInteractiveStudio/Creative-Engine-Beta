import * as Components from '../../engine/Components.js';
import * as TilePaletteWindow from './TilePaletteWindow.js';

let dom;
let renderer;
let InputManager;
let SceneManager;
let getSelectedMateria;
let activeTool = 'move'; // Default editor tool
let isPanning = false;
let isPainting = false;
let isDrawingRect = false; // For the rectangle fill tool
let rectStartGridPos = { x: 0, y: 0 }; // Store the start grid cell
let currentMousePosition = { x: 0, y: 0 }; // For overlay drawing
let lastMousePosition = { x: 0, y: 0 };

// --- Initialization ---
export function initialize(dependencies) {
    dom = dependencies.dom;
    renderer = dependencies.renderer;
    InputManager = dependencies.InputManager;
    SceneManager = dependencies.SceneManager;
    getSelectedMateria = dependencies.getSelectedMateria;

    dom.sceneCanvas.addEventListener('mousedown', handleMouseDown);
    dom.sceneCanvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.sceneCanvas.addEventListener('wheel', handleMouseWheel, { passive: false });
    dom.sceneCanvas.addEventListener('mouseleave', handleMouseLeave); // Stop painting if mouse leaves
}

// --- Public API ---
export function getActiveTool() {
    // This now serves as a general tool getter, not just for gizmos
    return activeTool;
}

export function setActiveTool(toolName) {
    activeTool = toolName;
    console.log(`SceneView tool active: ${toolName}`);
}

export function update(deltaTime) {
    // The main editor loop can call this, though most logic is event-driven
    handlePanning();
}

// --- Event Handlers & Internal Logic ---

function handleMouseDown(e) {
    lastMousePosition = { x: e.clientX, y: e.clientY };
    const paletteTool = TilePaletteWindow.getActiveTool();

    if (paletteTool === 'tile-rect-fill') {
        const selectedMateria = getSelectedMateria();
        if (!selectedMateria) return;
        const transform = selectedMateria.getComponent(Components.Transform);
        const grid = getSelectedGrid();
        if (!transform || !grid) return;

        const startWorldPos = screenToWorld(e.clientX, e.clientY);
        const localPos = {
            x: startWorldPos.x - transform.position.x,
            y: startWorldPos.y - transform.position.y
        };
        rectStartGridPos = worldToGrid(localPos, grid);
        isDrawingRect = true;
        return;
    }

    const tileTools = ['tile-brush', 'tile-eraser'];
    if (tileTools.includes(paletteTool)) {
        isPainting = true;
        paintTile(e); // Paint on the first click
        return;
    }

    if (e.button === 1) { // Middle mouse button for panning
        isPanning = true;
        dom.sceneCanvas.style.cursor = 'grabbing';
    }
}


function handleMouseMove(e) {
    currentMousePosition = { x: e.clientX, y: e.clientY };
    if (isDrawingRect) {
        // The visual feedback for the rectangle will be handled in the render loop.
        // We just need to trigger redraws, which the loop does automatically.
        return;
    }
    if (isPainting) {
        paintTile(e);
    } else if (isPanning) {
        const dx = e.clientX - lastMousePosition.x;
        const dy = e.clientY - lastMousePosition.y;
        lastMousePosition = { x: e.clientX, y: e.clientY };

        if (renderer && renderer.camera) {
            renderer.camera.x -= dx / renderer.camera.effectiveZoom;
            renderer.camera.y += dy / renderer.camera.effectiveZoom;
        }
    }
}

function handleMouseUp(e) {
    if (isDrawingRect) {
        const endWorldPos = screenToWorld(e.clientX, e.clientY);
        fillTileRect(endWorldPos);
        isDrawingRect = false;
    }
    if (isPainting) {
        isPainting = false;
    }
    if (isPanning) {
        isPanning = false;
        dom.sceneCanvas.style.cursor = 'grab';
    }
}

function handleMouseLeave() {
    // Stop painting if the mouse leaves the canvas to prevent weird artifacts
    isPainting = false;
}


function handleMouseWheel(e) {
    e.preventDefault();
    if (!renderer || !renderer.camera) return;

    const zoomSpeed = 0.1;
    const zoomFactor = e.deltaY > 0 ? 1 - zoomSpeed : 1 + zoomSpeed;

    renderer.camera.zoom *= zoomFactor;
    // Add clamping for zoom if necessary
}

function handlePanning() {
    // This is now handled directly in handleMouseMove to be more responsive
}

function paintTile(e) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const tilemap = selectedMateria.getComponent(Components.Tilemap);
    const transform = selectedMateria.getComponent(Components.Transform);
    const grid = getSelectedGrid(); // Use the general getter

    if (!tilemap || !transform || !grid) {
        return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);
    // Convert to local position relative to the Tilemap's transform
    const localPos = {
        x: worldPos.x - transform.position.x,
        y: worldPos.y - transform.position.y
    };

    const gridPos = worldToGrid(localPos, grid);

    // Bounds check
    if (gridPos.x < 0 || gridPos.x >= tilemap.width || gridPos.y < 0 || gridPos.y >= tilemap.height) {
        return; // Outside of the defined tilemap area
    }

    const tileKey = `${gridPos.x},${gridPos.y}`;
    const tool = TilePaletteWindow.getActiveTool();

    if (tool === 'tile-brush') {
        const selectedTiles = TilePaletteWindow.getSelectedTile(); // Returns an array of tiles
        if (selectedTiles && selectedTiles.length > 0) {
            // For the brush, we only use the first selected tile.
            const tileToPaint = selectedTiles[0];
            tilemap.tileData.set(tileKey, {
                spriteName: tileToPaint.spriteName,
                imageData: tileToPaint.imageData
            });
        }
    } else if (tool === 'tile-eraser') {
        if (tilemap.tileData.has(tileKey)) {
            tilemap.tileData.delete(tileKey);
        }
    }

    const tilemapRenderer = selectedMateria.getComponent(Components.TilemapRenderer);
    if (tilemapRenderer) {
        tilemapRenderer.setDirty();
    }
}


function fillTileRect(endWorldPos) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;
    const tilemap = selectedMateria.getComponent(Components.Tilemap);
    const transform = selectedMateria.getComponent(Components.Transform);
    const grid = getSelectedGrid();

    if (!tilemap || !transform || !grid) {
        isDrawingRect = false;
        return;
    }

    const localPos = {
        x: endWorldPos.x - transform.position.x,
        y: endWorldPos.y - transform.position.y
    };
    const endGridPos = worldToGrid(localPos, grid);
    const selectedTiles = TilePaletteWindow.getSelectedTile();
    if (!selectedTiles || selectedTiles.length === 0) {
        isDrawingRect = false;
        return;
    }
    const tileToPaint = selectedTiles[0];

    // Determine loop bounds and clamp them to the tilemap dimensions
    const startX = Math.max(0, Math.min(rectStartGridPos.x, endGridPos.x));
    const startY = Math.max(0, Math.min(rectStartGridPos.y, endGridPos.y));
    const endX = Math.min(tilemap.width - 1, Math.max(rectStartGridPos.x, endGridPos.x));
    const endY = Math.min(tilemap.height - 1, Math.max(rectStartGridPos.y, endGridPos.y));

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            // Final check just in case the loop bounds are weird
            if (x >= 0 && x < tilemap.width && y >= 0 && y < tilemap.height) {
                tilemap.tileData.set(`${x},${y}`, {
                    spriteName: tileToPaint.spriteName,
                    imageData: tileToPaint.imageData
                });
            }
        }
    }

    const tilemapRenderer = getSelectedMateria()?.getComponent(Components.TilemapRenderer);
    if (tilemapRenderer) {
        tilemapRenderer.setDirty();
    }

    console.log(`Filled rectangle from (${startX},${startY}) to (${endX},${endY})`);
}

function getSelectedGrid() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return null;

    let grid = selectedMateria.getComponent(Components.Grid);
    if (grid) return grid;

    return findParentGrid(selectedMateria);
}

function findParentGrid(materia) {
    if (!materia.parent) return null;
    const parentMateria = SceneManager.currentScene.findMateriaById(materia.parent);
    if (!parentMateria) return null;

    const grid = parentMateria.getComponent(Components.Grid);
    return grid ? grid : null; // Only return if the component exists
}

function worldToGrid(worldPos, grid) {
    // Correctly reference the cellSize object properties
    const gridX = Math.floor(worldPos.x / grid.cellSize.x);
    const gridY = Math.floor(worldPos.y / grid.cellSize.y);
    return { x: gridX, y: gridY };
}

function screenToWorld(screenX, screenY) {
    if (!renderer || !renderer.camera) return { x: 0, y: 0 };
    const rect = dom.sceneCanvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;

    const worldX = (x - rect.width / 2) / renderer.camera.zoom + renderer.camera.x;
    const worldY = (y - rect.height / 2) / -renderer.camera.zoom + renderer.camera.y;
    return { x: worldX, y: worldY };
}

export function drawOverlay() {
    if (!renderer) return;
    const ctx = renderer.ctx;
    const grid = getSelectedGrid(); // This now finds the grid for the selected materia or its parent
    const paletteTool = TilePaletteWindow.getActiveTool();
    const tileTools = ['tile-brush', 'tile-eraser', 'tile-rect-fill'];

    // --- 1. Draw Infinite Grid Gizmo ---
    if (grid) {
        const camera = renderer.camera;
        const zoom = camera.zoom;
        const cellWidth = grid.cellSize.x;
        const cellHeight = grid.cellSize.y;

        // Save context state
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1 / zoom;

        // Get canvas dimensions in world space
        const worldView = {
            x1: camera.x - (renderer.canvas.width / 2) / zoom,
            y1: camera.y - (renderer.canvas.height / 2) / zoom,
            x2: camera.x + (renderer.canvas.width / 2) / zoom,
            y2: camera.y + (renderer.canvas.height / 2) / zoom
        };

        // Calculate start and end points for grid lines
        const startX = Math.floor(worldView.x1 / cellWidth) * cellWidth;
        const endX = Math.ceil(worldView.x2 / cellWidth) * cellWidth;
        const startY = Math.floor(worldView.y1 / cellHeight) * cellHeight;
        const endY = Math.ceil(worldView.y2 / cellHeight) * cellHeight;

        // Draw vertical lines
        for (let x = startX; x <= endX; x += cellWidth) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = startY; y <= endY; y += cellHeight) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }

        ctx.restore();
    }


    // --- 2. Draw Tilemap Bounds Gizmo ---
    const selectedMateria = getSelectedMateria();
    if (selectedMateria) {
        const tilemap = selectedMateria.getComponent(Components.Tilemap);
        const transform = selectedMateria.getComponent(Components.Transform); // Get the transform
        if (tilemap && grid && transform) {
            const boundsWidth = tilemap.width * grid.cellSize.x;
            const boundsHeight = tilemap.height * grid.cellSize.y;

            // The position should be based on the object's transform
            const posX = transform.position.x;
            const posY = transform.position.y;

            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)'; // Yellow for bounds
            ctx.lineWidth = 2 / renderer.camera.zoom;
            // Make the dash pattern scale with zoom to look consistent
            ctx.setLineDash([6 / renderer.camera.zoom, 4 / renderer.camera.zoom]);
            ctx.strokeRect(posX, posY, boundsWidth, boundsHeight);
            ctx.restore();
        }
    }

    // --- 3. Draw Tool-specific Overlays (Rectangle, Hover Highlight) ---
    const transform = selectedMateria ? selectedMateria.getComponent(Components.Transform) : null;
    const tilemap = selectedMateria ? selectedMateria.getComponent(Components.Tilemap) : null;

    if (isDrawingRect && grid && transform) {
        const startLocalX = rectStartGridPos.x * grid.cellSize.x;
        const startLocalY = rectStartGridPos.y * grid.cellSize.y;

        const currentWorldPos = screenToWorld(currentMousePosition.x, currentMousePosition.y);
        const currentLocalPos = { x: currentWorldPos.x - transform.position.x, y: currentWorldPos.y - transform.position.y };
        const currentGridPos = worldToGrid(currentLocalPos, grid);

        const endLocalX = (currentGridPos.x + (currentGridPos.x >= rectStartGridPos.x ? 1 : 0)) * grid.cellSize.x;
        const endLocalY = (currentGridPos.y + (currentGridPos.y >= rectStartGridPos.y ? 1 : 0)) * grid.cellSize.y;

        const rectX = transform.position.x + Math.min(startLocalX, endLocalX);
        const rectY = transform.position.y + Math.min(startLocalY, endLocalY);
        const rectWidth = Math.abs(startLocalX - endLocalX);
        const rectHeight = Math.abs(startLocalY - endLocalY);

        ctx.save();
        ctx.fillStyle = 'rgba(100, 150, 255, 0.4)';
        ctx.strokeStyle = 'rgba(180, 210, 255, 1)';
        ctx.lineWidth = 2 / renderer.camera.zoom;

        ctx.beginPath();
        ctx.rect(rectX, rectY, rectWidth, rectHeight);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    else if (tileTools.includes(paletteTool) && grid && transform && tilemap && !isDrawingRect) {
        const worldPos = screenToWorld(currentMousePosition.x, currentMousePosition.y);
        const localPos = { x: worldPos.x - transform.position.x, y: worldPos.y - transform.position.y };
        const gridPos = worldToGrid(localPos, grid);

        // Only draw the hover cell if it's within the tilemap bounds
        if (gridPos.x >= 0 && gridPos.x < tilemap.width && gridPos.y >= 0 && gridPos.y < tilemap.height) {
            const cellWorldX = transform.position.x + gridPos.x * grid.cellSize.x;
            const cellWorldY = transform.position.y + gridPos.y * grid.cellSize.y;

            ctx.save();
            if (paletteTool === 'tile-eraser') {
                ctx.fillStyle = 'rgba(255, 80, 80, 0.4)';
                ctx.strokeStyle = 'rgba(255, 150, 150, 1)';
            } else {
                ctx.fillStyle = 'rgba(255, 255, 100, 0.4)';
                ctx.strokeStyle = 'rgba(255, 255, 180, 1)';
            }
            ctx.lineWidth = 2 / renderer.camera.zoom;

            ctx.beginPath();
            ctx.rect(cellWorldX, cellWorldY, grid.cellSize.x, grid.cellSize.y);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
}
