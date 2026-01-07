import * as Components from '../../engine/Components.js';
import * as TilePaletteWindow from './TilePaletteWindow.js';
import * as UITransformUtils from '../../engine/UITransformUtils.js';

let dom;
let renderer;
let InputManager;
let SceneManager;
let getSelectedMateria;
let updateInspectorCallback;
let activeTool = 'move'; // Default editor tool
let isPanning = false;
let isPainting = false;
let isDrawingRect = false; // For the rectangle fill tool
let isDraggingUI = false;
let draggedMateria = null;
let dragOffset = { x: 0, y: 0 };
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
    updateInspectorCallback = dependencies.updateInspectorCallback;

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

    // --- UI Dragging Logic ---
    const selectedMateria = getSelectedMateria();
    if (activeTool === 'move' && selectedMateria && selectedMateria.getComponent(Components.UITransform)) {
        const worldPos = screenToWorld(e.clientX, e.clientY);

        if (isPointInMateria(worldPos, selectedMateria)) {
            isDraggingUI = true;
            draggedMateria = selectedMateria;
            const worldPivotPos = getMateriaWorldPivotPosition(draggedMateria);
            dragOffset = {
                x: worldPos.x - worldPivotPos.x,
                y: worldPos.y - worldPivotPos.y
            };
            return;
        }
    }

    const paletteTool = TilePaletteWindow.getActiveTool();

    if (paletteTool === 'tile-rect-fill') {
        const startWorldPos = screenToWorld(e.clientX, e.clientY);
        const grid = getSelectedGrid();
        if (!grid) return;

        rectStartGridPos = worldToGrid(startWorldPos, grid);
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

    if (isDraggingUI) {
        const uiTransform = draggedMateria.getComponent(Components.UITransform);
        if (!uiTransform) {
            isDraggingUI = false;
            draggedMateria = null;
            return;
        }

        const newMouseWorldPos = screenToWorld(e.clientX, e.clientY);
        const newWorldPivotPos = {
            x: newMouseWorldPos.x - dragOffset.x,
            y: newMouseWorldPos.y - dragOffset.y
        };

        const parent = SceneManager.currentScene.getMateriaById(draggedMateria.parent);
        const parentCanvas = parent.getComponent(Components.Canvas);
        const parentTransform = parent.getComponent(Components.Transform);

        if (parentCanvas && parentTransform && parentCanvas.renderMode === 'World Space') {
            const anchorPointWorld = getAnchorPointWorld(uiTransform.anchorPreset, parentTransform.position, parentCanvas.size);

            uiTransform.position = {
                x: newWorldPivotPos.x - anchorPointWorld.x,
                y: newWorldPivotPos.y - anchorPointWorld.y
            };
        }
        return;
    }

    if (isDrawingRect) {
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

async function handleMouseUp(e) {
    if (isDraggingUI) {
        const uiTransform = draggedMateria.getComponent(Components.UITransform);
        const parent = SceneManager.currentScene.getMateriaById(draggedMateria.parent);
        const parentCanvas = parent.getComponent(Components.Canvas);
        const parentTransform = parent.getComponent(Components.Transform);

        if (uiTransform && parentCanvas && parentTransform && parentCanvas.renderMode === 'World Space') {
            const finalWorldPivotPos = getMateriaWorldPivotPosition(draggedMateria);

            const canvasSize = parentCanvas.size;
            const canvasPos = parentTransform.position;
            const canvasTopLeft = {
                x: canvasPos.x - canvasSize.x / 2,
                y: canvasPos.y - canvasSize.y / 2,
            };

            const relativePos = {
                x: finalWorldPivotPos.x - canvasTopLeft.x,
                y: finalWorldPivotPos.y - canvasTopLeft.y,
            };

            const newPreset = UITransformUtils.getAnchorPresetFromPosition(relativePos, canvasSize);

            uiTransform.anchorPreset = newPreset;
            uiTransform.pivot = UITransformUtils.getPivotForAnchorPreset(newPreset);

            const newAnchorPointWorld = getAnchorPointWorld(newPreset, canvasPos, canvasSize);
            uiTransform.position = {
                x: finalWorldPivotPos.x - newAnchorPointWorld.x,
                y: finalWorldPivotPos.y - newAnchorPointWorld.y
            };

            if (updateInspectorCallback) {
                await updateInspectorCallback();
            }
        }

        isDraggingUI = false;
        draggedMateria = null;
    }

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
    if (!tilemap) return;

    const grid = findParentGrid(selectedMateria);
    if (!grid) {
        // No need to warn every mouse move, just exit.
        return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const gridPos = worldToGrid(worldPos, grid);
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
    const tilemap = getSelectedMateria()?.getComponent(Components.Tilemap);
    const grid = getSelectedGrid();
    if (!tilemap || !grid) {
        isDrawingRect = false;
        return;
    }

    const endGridPos = worldToGrid(endWorldPos, grid);
    const selectedTiles = TilePaletteWindow.getSelectedTile(); // This is now an array
    if (!selectedTiles || selectedTiles.length === 0) {
        isDrawingRect = false;
        return;
    }

    // For the rectangle fill, we will only use the first tile in the selection.
    // The multi-tile "stamp" tool will be implemented separately.
    const tileToPaint = selectedTiles[0];

    const startX = Math.min(rectStartGridPos.x, endGridPos.x);
    const startY = Math.min(rectStartGridPos.y, endGridPos.y);
    const endX = Math.max(rectStartGridPos.x, endGridPos.x);
    const endY = Math.max(rectStartGridPos.y, endGridPos.y);

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            tilemap.tileData.set(`${x},${y}`, {
                spriteName: tileToPaint.spriteName,
                imageData: tileToPaint.imageData
            });
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
    const parentMateria = SceneManager.currentScene.getMateriaById(materia.parent);
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
    const selectedMateria = getSelectedMateria();

    // --- Draw UI Anchor Gizmo ---
    if (selectedMateria && selectedMateria.getComponent(Components.UITransform)) {
        drawUIAnchorGizmo(ctx, selectedMateria);
    }


    const grid = getSelectedGrid();
    const paletteTool = TilePaletteWindow.getActiveTool();
    const tileTools = ['tile-brush', 'tile-eraser', 'tile-rect-fill'];


    // --- Draw Rectangle Selection Preview ---
    if (isDrawingRect && grid) {
        // Correctly use cellSize.x and cellSize.y
        const startWorldX = rectStartGridPos.x * grid.cellSize.x;
        const startWorldY = rectStartGridPos.y * grid.cellSize.y;

        const currentWorldPos = screenToWorld(currentMousePosition.x, currentMousePosition.y);
        const currentGridPos = worldToGrid(currentWorldPos, grid);

        const endWorldX = (currentGridPos.x + (currentGridPos.x >= rectStartGridPos.x ? 1 : 0)) * grid.cellSize.x;
        const endWorldY = (currentGridPos.y + (currentGridPos.y >= rectStartGridPos.y ? 1 : 0)) * grid.cellSize.y;


        const rectX = Math.min(startWorldX, endWorldX);
        const rectY = Math.min(startWorldY, endWorldY);
        const rectWidth = Math.abs(startWorldX - endWorldX);
        const rectHeight = Math.abs(startWorldY - endWorldY);

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
    // --- Draw Hover Highlight for Brush and Eraser ---
    else if (tileTools.includes(paletteTool) && grid && !isDrawingRect) {
        const worldPos = screenToWorld(currentMousePosition.x, currentMousePosition.y);
        const gridPos = worldToGrid(worldPos, grid);

        const cellWorldX = gridPos.x * grid.cellSize.x;
        const cellWorldY = gridPos.y * grid.cellSize.y;

        ctx.save();
        if (paletteTool === 'tile-eraser') {
            ctx.fillStyle = 'rgba(255, 80, 80, 0.4)'; // Red for eraser
            ctx.strokeStyle = 'rgba(255, 150, 150, 1)';
        } else {
            ctx.fillStyle = 'rgba(255, 255, 100, 0.4)'; // Yellow for brush
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

function drawUIAnchorGizmo(ctx, selectedMateria) {
    const uiTransform = selectedMateria.getComponent(Components.UITransform);
    if (!uiTransform || !selectedMateria.parent) return;

    const parent = SceneManager.currentScene.getMateriaById(selectedMateria.parent);
    if (!parent) return;

    const parentCanvas = parent.getComponent(Components.Canvas);
    const parentTransform = parent.getComponent(Components.Transform);

    if (!parentCanvas || !parentTransform) return;

    // For now, we only support World Space UI Gizmos as it's the most common for layout.
    // Screen space would require a different rendering path.
    if (parentCanvas.renderMode !== 'World Space') return;

    const canvasSize = parentCanvas.size;
    const canvasPos = parentTransform.position;

    const halfWidth = canvasSize.x / 2;
    const halfHeight = canvasSize.y / 2;

    const topLeft = { x: canvasPos.x - halfWidth, y: canvasPos.y - halfHeight };

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 2 / renderer.camera.effectiveZoom;
    ctx.setLineDash([6 / renderer.camera.effectiveZoom, 4 / renderer.camera.effectiveZoom]);

    // Draw vertical lines
    ctx.beginPath();
    ctx.moveTo(topLeft.x + canvasSize.x / 3, topLeft.y);
    ctx.lineTo(topLeft.x + canvasSize.x / 3, topLeft.y + canvasSize.y);
    ctx.moveTo(topLeft.x + 2 * canvasSize.x / 3, topLeft.y);
    ctx.lineTo(topLeft.x + 2 * canvasSize.x / 3, topLeft.y + canvasSize.y);
    ctx.stroke();

    // Draw horizontal lines
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y + canvasSize.y / 3);
    ctx.lineTo(topLeft.x + canvasSize.x, topLeft.y + canvasSize.y / 3);
    ctx.moveTo(topLeft.x, topLeft.y + 2 * canvasSize.y / 3);
    ctx.lineTo(topLeft.x + canvasSize.x, topLeft.y + 2 * canvasSize.y / 3);
    ctx.stroke();

    ctx.restore();
}

// --- UI Dragging Helper Functions ---

function getMateriaWorldPivotPosition(materia) {
    const uiTransform = materia.getComponent(Components.UITransform);
    const parent = SceneManager.currentScene.getMateriaById(materia.parent);
    if (!uiTransform || !parent) return { x: 0, y: 0 };

    const parentCanvas = parent.getComponent(Components.Canvas);
    const parentTransform = parent.getComponent(Components.Transform);
    if (!parentCanvas || !parentTransform) return { x: 0, y: 0 };

    const anchorPointWorld = getAnchorPointWorld(uiTransform.anchorPreset, parentTransform.position, parentCanvas.size);

    return {
        x: anchorPointWorld.x + uiTransform.position.x,
        y: anchorPointWorld.y + uiTransform.position.y
    };
}


function getAnchorPointWorld(preset, canvasWorldPos, canvasSize) {
    const anchor = UITransformUtils.getPivotForAnchorPreset(preset); // Re-use this logic

    const canvasTopLeft = {
        x: canvasWorldPos.x - canvasSize.x / 2,
        y: canvasWorldPos.y - canvasSize.y / 2
    };

    return {
        x: canvasTopLeft.x + (canvasSize.x * anchor.x),
        y: canvasTopLeft.y + (canvasSize.y * anchor.y)
    };
}


function isPointInMateria(worldPoint, materia) {
    const uiTransform = materia.getComponent(Components.UITransform);
    if (!uiTransform) return false;

    const worldPivotPos = getMateriaWorldPivotPosition(materia);

    const halfWidth = uiTransform.size.width / 2;
    const halfHeight = uiTransform.size.height / 2;

    const topLeft = {
        x: worldPivotPos.x - (uiTransform.size.width * uiTransform.pivot.x),
        y: worldPivotPos.y - (uiTransform.size.height * uiTransform.pivot.y)
    };

    return (
        worldPoint.x >= topLeft.x &&
        worldPoint.x <= topLeft.x + uiTransform.size.width &&
        worldPoint.y >= topLeft.y &&
        worldPoint.y <= topLeft.y + uiTransform.size.height
    );
}
