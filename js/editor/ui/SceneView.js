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
        const rectCache = new Map();
        const materiaRect = UITransformUtils.getAbsoluteRect(selectedMateria, renderer, rectCache);

        const canvasRect = dom.sceneCanvas.getBoundingClientRect();
        const mousePos = { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top };

        if (mousePos.x >= materiaRect.x && mousePos.x <= materiaRect.x + materiaRect.width &&
            mousePos.y >= materiaRect.y && mousePos.y <= materiaRect.y + materiaRect.height) {

            isDraggingUI = true;
            draggedMateria = selectedMateria;
            dragOffset = {
                x: mousePos.x - materiaRect.x,
                y: mousePos.y - materiaRect.y,
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
        const parent = SceneManager.currentScene.getMateriaById(draggedMateria.parent);
        if (!uiTransform || !parent) {
            isDraggingUI = false;
            draggedMateria = null;
            return;
        }

        const canvasRect = dom.sceneCanvas.getBoundingClientRect();
        const mousePos = { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top };

        // Calculate the new top-left position of the element
        const newRectX = mousePos.x - dragOffset.x;
        const newRectY = mousePos.y - dragOffset.y;

        // We need the parent's absolute rect to calculate the new relative position
        const rectCache = new Map();
        const parentRect = UITransformUtils.getAbsoluteRect(parent, renderer, rectCache);

        // --- Invert the getAbsoluteRect logic to solve for uiTransform.position ---
        const anchorMin = UITransformUtils.getAnchorPercentages(uiTransform.anchorPreset);

        // Solve for X
        const parentX = parentRect.x;
        const rectX_fromLeft = newRectX - parentX;
        const pivotPosX_fromLeft = rectX_fromLeft + (uiTransform.size.width * uiTransform.pivot.x);
        const anchorMinX_fromLeft = parentRect.width * anchorMin.x;
        uiTransform.position.x = pivotPosX_fromLeft - anchorMinX_fromLeft;

        // Solve for Y (Y-UP logic conversion)
        const parentY = parentRect.y;
        const rectY_fromTop = newRectY - parentY;
        const pivotPosY_fromTop = rectY_fromTop + (uiTransform.size.height * uiTransform.pivot.y);
        const anchorMinY_fromBottom = parentRect.height * anchorMin.y;
        uiTransform.position.y = (parentRect.height - pivotPosY_fromTop) - anchorMinY_fromBottom;

        return; // Prevent other actions while dragging
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
        // --- Recalculate anchor preset based on final position ---
        const uiTransform = draggedMateria.getComponent(Components.UITransform);
        const parent = SceneManager.currentScene.getMateriaById(draggedMateria.parent);

        if (uiTransform && parent) {
            const rectCache = new Map();
            const parentRect = UITransformUtils.getAbsoluteRect(parent, renderer, rectCache);

            // The position we need is the element's pivot point, relative to the parent's top-left corner.
            const pivotPoint = {
                x: uiTransform.position.x,
                y: parentRect.height - uiTransform.position.y // Convert back to Y-Down for preset calculation
            };

            // This part of the logic might need refinement, as getAnchorPresetFromPosition expects a rect size.
            // For now, we assume the parent rect is the reference.
            const newPreset = UITransformUtils.getAnchorPresetFromPosition(pivotPoint, parentRect);

            uiTransform.anchorPreset = newPreset;
            // The pivot should also be updated to match the new anchor.
            uiTransform.pivot = UITransformUtils.getPivotForAnchorPreset(newPreset);

            // After changing the anchor, we must recalculate the position value
            // so the element doesn't jump.
            const canvasRect = dom.sceneCanvas.getBoundingClientRect();
            const mousePos = { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top };
            const newRectX = mousePos.x - dragOffset.x;
            const newRectY = mousePos.y - dragOffset.y;

            const newAnchorMin = UITransformUtils.getAnchorPercentages(uiTransform.anchorPreset);
            const parentX = parentRect.x;
            const rectX_fromLeft = newRectX - parentX;
            const pivotPosX_fromLeft = rectX_fromLeft + (uiTransform.size.width * uiTransform.pivot.x);
            const anchorMinX_fromLeft = parentRect.width * newAnchorMin.x;
            uiTransform.position.x = pivotPosX_fromLeft - anchorMinX_fromLeft;

            const parentY = parentRect.y;
            const rectY_fromTop = newRectY - parentY;
            const pivotPosY_fromTop = rectY_fromTop + (uiTransform.size.height * uiTransform.pivot.y);
            const anchorMinY_fromBottom = parentRect.height * newAnchorMin.y;
            uiTransform.position.y = (parentRect.height - pivotPosY_fromTop) - anchorMinY_fromBottom;

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

    ctx.save(); // Save the current (likely world-space) transform state.

    let topLeft, canvasSize;

    if (parentCanvas.renderMode === 'Screen Space') {
        // For Screen Space, we draw in screen coordinates (pixels).
        // We must reset the context's transform.
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        topLeft = { x: 0, y: 0 };
        canvasSize = { x: renderer.canvas.width, y: renderer.canvas.height };

        // Line width is in pixels, no need for zoom correction.
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);

    } else { // World Space (original logic)
        canvasSize = parentCanvas.size;
        const canvasPos = parentTransform.position;
        const halfWidth = canvasSize.x / 2;
        const halfHeight = canvasSize.y / 2;
        topLeft = { x: canvasPos.x - halfWidth, y: canvasPos.y - halfHeight };

        // Line width needs to be adjusted for camera zoom to appear constant.
        ctx.lineWidth = 2 / renderer.camera.effectiveZoom;
        ctx.setLineDash([6 / renderer.camera.effectiveZoom, 4 / renderer.camera.effectiveZoom]);
    }

    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';

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

    ctx.restore(); // Restore the original transform state.
}

// --- UI Dragging Helper Functions --- (Obsolete functions removed after refactor)
