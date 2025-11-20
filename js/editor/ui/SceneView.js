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
        const startWorldPos = screenToWorld(e.clientX, e.clientY);
        const grid = getSelectedGrid();
        if (!grid) return;

        rectStartGridPos = worldToGrid(startWorldPos, grid);
        isDrawingRect = true;
        return;
    }

    const tileTools = ['tile-brush', 'tile-eraser', 'tile-bucket-fill'];
    if (tileTools.includes(paletteTool)) {
        if (paletteTool === 'tile-bucket-fill') {
            paintTile(e); // Paint only once for bucket fill
        } else {
            isPainting = true;
            paintTile(e); // Paint on first click for brush/eraser
        }
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
    if (!tilemap) return;

    // The grid component is now only for visual alignment, but we still need its cell size.
    const grid = findParentGrid(selectedMateria) || getSelectedMateria().getComponent(Components.Grid);
    if (!grid) {
        console.warn("No Grid component found on the selected object or its parent.");
        return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const gridX = Math.floor(worldPos.x / grid.cellSize.x);
    const gridY = Math.floor(worldPos.y / grid.cellSize.y);

    const activeTool = getActiveTool(); // Use the general active tool

    if (activeTool === 'tile-brush') {
        const spriteInfo = TilePaletteWindow.getSelectedSpriteInfo();
        if (spriteInfo) {
            tilemap.setTile(gridX, gridY, spriteInfo);
        }
    } else if (activeTool === 'tile-eraser') {
        tilemap.setTile(gridX, gridY, null); // Set to null to erase
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
    const gridX = Math.floor(worldPos.x / grid.cellWidth);
    const gridY = Math.floor(worldPos.y / grid.cellHeight);
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

    // --- 1. Dibujar la Rejilla Infinita ---
    const grid = getSelectedGrid();
    if (grid) {
        const ctx = renderer.ctx;
        const cam = renderer.camera;

        const viewWidth = renderer.canvas.width / cam.effectiveZoom;
        const viewHeight = renderer.canvas.height / cam.effectiveZoom;

        const startX = cam.x - viewWidth / 2;
        const startY = cam.y - viewHeight / 2;
        const endX = cam.x + viewWidth / 2;
        const endY = cam.y + viewHeight / 2;

        const gridStartX = Math.floor(startX / grid.cellWidth) * grid.cellWidth;
        const gridStartY = Math.floor(startY / grid.cellHeight) * grid.cellHeight;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1 / cam.effectiveZoom;

        // Vertical lines
        for (let x = gridStartX; x < endX; x += grid.cellWidth) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = gridStartY; y < endY; y += grid.cellHeight) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // --- 2. Dibujar el Rectángulo de Relleno ---
    if (isDrawingRect) {
        const grid = getSelectedGrid();
        if (!grid) return;

        // Start position is already in grid coordinates. Convert back to world space for drawing.
        const startWorldX = rectStartGridPos.x * grid.cellWidth;
        const startWorldY = rectStartGridPos.y * grid.cellHeight;

        // Current mouse position is in screen space. Convert to world, then to grid.
        const currentWorldPos = screenToWorld(currentMousePosition.x, currentMousePosition.y);
        const currentGridPos = worldToGrid(currentWorldPos, grid);

        // End position of the rectangle is the corner of the grid cell under the mouse.
        const endWorldX = (currentGridPos.x + 1) * grid.cellWidth;
        const endWorldY = (currentGridPos.y + 1) * grid.cellHeight;

        // Determine top-left and bottom-right corners for drawing
        const rectX = Math.min(startWorldX, endWorldX);
        const rectY = Math.min(startWorldY, endWorldY);
        const rectWidth = Math.abs(startWorldX - endWorldX);
        const rectHeight = Math.abs(startWorldY - endWorldY);

        // Use renderer's context to draw directly on the canvas
        const ctx = renderer.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(100, 150, 255, 0.4)'; // Semi-transparent blue
        ctx.strokeStyle = 'rgba(180, 210, 255, 1)'; // Lighter blue for border
        ctx.lineWidth = 2 / renderer.camera.zoom; // Make line width scale with zoom

        ctx.beginPath();
        ctx.rect(rectX, rectY, rectWidth, rectHeight);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}
