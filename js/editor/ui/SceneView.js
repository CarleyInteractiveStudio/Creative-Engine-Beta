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
let isResizingGizmo = false;
let resizingGizmoInfo = null;


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
    const worldPos = screenToWorld(e.clientX, e.clientY);

    // Gizmo Resizing
    const selectedMateria = getSelectedMateria();
    if (selectedMateria) {
        const gizmo = selectedMateria.getComponent(Components.Gizmo);
        if (gizmo) {
            const handle = getHandleAt(worldPos, selectedMateria);
            if (handle) {
                isResizingGizmo = true;
                resizingGizmoInfo = {
                    materia: selectedMateria,
                    handle: handle,
                    initialPos: worldPos,
                    initialSize: { ...gizmo.size },
                    initialMateriaPos: { ...selectedMateria.getComponent(Components.Transform).position }
                };
                return; // Stop other actions
            }
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

    if (isResizingGizmo) {
        const { materia, handle, initialPos, initialSize, initialMateriaPos } = resizingGizmoInfo;
        const gizmo = materia.getComponent(Components.Gizmo);
        const transform = materia.getComponent(Components.Transform);
        const worldPos = screenToWorld(e.clientX, e.clientY);

        const dx = worldPos.x - initialPos.x;
        const dy = worldPos.y - initialPos.y;

        // Rotate delta to match gizmo's local space
        const rad = -transform.rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const localDx = dx * cos - dy * sin;
        const localDy = dx * sin + dy * cos;

        let newWidth = initialSize.x;
        let newHeight = initialSize.y;
        let posOffsetX = 0;
        let posOffsetY = 0;

        if (handle.includes('right')) {
            newWidth += localDx;
            posOffsetX += localDx / 2;
        }
        if (handle.includes('left')) {
            newWidth -= localDx;
            posOffsetX += localDx / 2;
        }
        if (handle.includes('bottom')) {
            newHeight += localDy;
            posOffsetY += localDy / 2;
        }
        if (handle.includes('top')) {
            newHeight -= localDy;
            posOffsetY += localDy / 2;
        }

        gizmo.size.x = Math.max(0, newWidth);
        gizmo.size.y = Math.max(0, newHeight);

        // Adjust position to keep the gizmo centered
        const finalPosOffsetX = posOffsetX * cos + posOffsetY * sin;
        const finalPosOffsetY = -posOffsetX * sin + posOffsetY * cos;

        transform.position = {
            x: initialMateriaPos.x + finalPosOffsetX,
            y: initialMateriaPos.y + finalPosOffsetY
        };

        return;
    }


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
    if (isResizingGizmo) {
        isResizingGizmo = false;
        resizingGizmoInfo = null;
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
    const grid = getSelectedGrid();
    const paletteTool = TilePaletteWindow.getActiveTool();
    const tileTools = ['tile-brush', 'tile-eraser', 'tile-rect-fill'];

    // --- Draw Gizmos ---
    const allMaterias = SceneManager.currentScene.getAllMaterias();
    const selectedMateria = getSelectedMateria();

    for (const materia of allMaterias) {
        if (!materia.isActive) continue;

        const gizmo = materia.getComponent(Components.Gizmo);
        if (!gizmo) continue;

        // Determine if the gizmo should be drawn
        const isSelected = (materia === selectedMateria);
        if (isSelected || gizmo.alwaysVisibleInEditor) {
            const transform = materia.getComponent(Components.Transform);
            if (!transform) continue;

            const worldPos = transform.position;
            const worldRot = transform.rotation;
            const width = gizmo.size.x;
            const height = gizmo.size.y;

            ctx.save();
            ctx.translate(worldPos.x, worldPos.y);
            ctx.rotate(worldRot * Math.PI / 180);

            ctx.strokeStyle = isSelected ? 'yellow' : gizmo.color;
            ctx.lineWidth = (isSelected ? 2 : 1) / renderer.camera.effectiveZoom;
            ctx.strokeRect(-width / 2, -height / 2, width, height);

            if (isSelected) {
                const handleSize = 8 / renderer.camera.effectiveZoom;
                ctx.fillStyle = 'yellow';
                const handles = getResizeHandles(width, height, handleSize);
                for (const handle in handles) {
                    const pos = handles[handle];
                    ctx.fillRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
                }
            }

            ctx.restore();
        }
    }


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


function getResizeHandles(width, height) {
    const halfW = width / 2;
    const halfH = height / 2;
    return {
        'top-left': { x: -halfW, y: -halfH },
        'top-center': { x: 0, y: -halfH },
        'top-right': { x: halfW, y: -halfH },
        'middle-left': { x: -halfW, y: 0 },
        'middle-right': { x: halfW, y: 0 },
        'bottom-left': { x: -halfW, y: halfH },
        'bottom-center': { x: 0, y: halfH },
        'bottom-right': { x: halfW, y: halfH }
    };
}

function getHandleAt(worldPos, materia) {
    const gizmo = materia.getComponent(Components.Gizmo);
    const transform = materia.getComponent(Components.Transform);
    if (!gizmo || !transform) return null;

    const handleSize = 8 / renderer.camera.effectiveZoom;
    const handles = getResizeHandles(gizmo.size.x, gizmo.size.y);

    for (const name in handles) {
        const handleLocalPos = handles[name];

        // Rotate handle position to world space
        const rad = transform.rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const handleWorldX = transform.position.x + handleLocalPos.x * cos - handleLocalPos.y * sin;
        const handleWorldY = transform.position.y + handleLocalPos.x * sin + handleLocalPos.y * cos;

        if (
            worldPos.x >= handleWorldX - handleSize / 2 &&
            worldPos.x <= handleWorldX + handleSize / 2 &&
            worldPos.y >= handleWorldY - handleSize / 2 &&
            worldPos.y <= handleWorldY + handleSize / 2
        ) {
            return name;
        }
    }

    return null;
}
