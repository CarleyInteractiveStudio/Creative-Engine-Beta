// js/editor/ui/SceneView.js

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
    dom.sceneCanvas.addEventListener('mouseleave', handleMouseLeave);
}

// --- Public API ---
export function getActiveTool() {
    return activeTool;
}

export function setActiveTool(toolName) {
    activeTool = toolName;
    console.log(`SceneView tool active: ${toolName}`);
}

export function update(deltaTime) {
    // Main logic is event-driven
}

// --- Event Handlers & Internal Logic ---

function handleMouseDown(e) {
    lastMousePosition = { x: e.clientX, y: e.clientY };
    const paletteTool = TilePaletteWindow.getActiveTool();

    // Do nothing if a gizmo or pan tool is active in the scene view
    if (activeTool !== 'move') return;

    const selectedMateria = getSelectedMateria();
    if (!selectedMateria || !selectedMateria.getComponent(Components.Tilemap)) {
        return; // Only process tile tools if a tilemap is selected
    }

    const grid = getSelectedGrid();
    if (!grid) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const gridPos = worldToGrid(worldPos, grid);


    switch (paletteTool) {
        case 'tile-brush':
        case 'tile-eraser':
            isPainting = true;
            paintTile(gridPos); // Paint on the first click
            break;
        case 'tile-rect-fill':
            rectStartGridPos = gridPos;
            isDrawingRect = true;
            break;
        case 'tile-bucket-fill':
            floodFill(gridPos);
            break;
    }

    if (e.button === 1) { // Middle mouse button for panning
        isPanning = true;
        dom.sceneCanvas.style.cursor = 'grabbing';
    }
}


function handleMouseMove(e) {
    currentMousePosition = { x: e.clientX, y: e.clientY };

    if (isDrawingRect) {
        // Visual feedback is handled in the drawOverlay function
        return;
    }

    if (isPainting) {
        const grid = getSelectedGrid();
        if (grid) {
            const worldPos = screenToWorld(e.clientX, e.clientY);
            const gridPos = worldToGrid(worldPos, grid);
            paintTile(gridPos);
        }
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
        const grid = getSelectedGrid();
        if (grid) {
            const endWorldPos = screenToWorld(e.clientX, e.clientY);
            fillTileRect(endWorldPos, grid);
        }
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
    isPainting = false;
    // Don't reset isDrawingRect here, user might want to drag outside canvas
}

function handleMouseWheel(e) {
    e.preventDefault();
    if (!renderer || !renderer.camera) return;

    const zoomSpeed = 0.1;
    const zoomFactor = e.deltaY > 0 ? 1 - zoomSpeed : 1 + zoomSpeed;

    renderer.camera.zoom *= zoomFactor;
}

function getSelectedTilemapInfo() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return null;

    const tilemap = selectedMateria.getComponent(Components.Tilemap);
    if (!tilemap) return null;

    const grid = findParentGrid(selectedMateria);
    if (!grid) {
        console.warn("Selected Tilemap does not have a Grid parent.");
        return null;
    }
    return { tilemap, grid };
}

function paintTile(gridPos) {
    const info = getSelectedTilemapInfo();
    if (!info) return;

    const { tilemap } = info;
    const tileKey = `${gridPos.x},${gridPos.y}`;
    const tool = TilePaletteWindow.getActiveTool();
    const selectedTileId = TilePaletteWindow.getSelectedTile();

    switch (tool) {
        case 'tile-brush':
            if (selectedTileId !== -1) {
                // Only update if the tile is different
                if (tilemap.tileData.get(tileKey) !== selectedTileId) {
                    tilemap.tileData.set(tileKey, selectedTileId);
                }
            }
            break;
        case 'tile-eraser':
            if (tilemap.tileData.has(tileKey)) {
                tilemap.tileData.delete(tileKey);
            }
            break;
    }
}

function fillTileRect(endWorldPos, grid) {
    const tilemap = getSelectedMateria() ? getSelectedMateria().getComponent(Components.Tilemap) : null;
    if (!tilemap) {
        isDrawingRect = false;
        return;
    }

    const endGridPos = worldToGrid(endWorldPos, grid);
    const selectedTileId = TilePaletteWindow.getSelectedTile();
    if (selectedTileId === -1) return;

    const startX = Math.min(rectStartGridPos.x, endGridPos.x);
    const startY = Math.min(rectStartGridPos.y, endGridPos.y);
    const endX = Math.max(rectStartGridPos.x, endGridPos.x);
    const endY = Math.max(rectStartGridPos.y, endGridPos.y);

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            tilemap.tileData.set(`${x},${y}`, selectedTileId);
        }
    }
    console.log(`Filled rectangle from (${startX},${startY}) to (${endX},${endY})`);
}

function floodFill(startGridPos) {
    const info = getSelectedTilemapInfo();
    if (!info) return;

    const { tilemap } = info;
    const newTileId = TilePaletteWindow.getSelectedTile();
    if (newTileId === -1) return;

    const startKey = `${startGridPos.x},${startGridPos.y}`;
    const targetTileId = tilemap.tileData.get(startKey); // Can be undefined

    if (targetTileId === newTileId) {
        return; // No work to do
    }

    const queue = [startGridPos];
    const visited = new Set([startKey]);

    while (queue.length > 0) {
        const { x, y } = queue.shift();

        // Set the new tile
        tilemap.tileData.set(`${x},${y}`, newTileId);

        // Check neighbors
        const neighbors = [
            { x: x + 1, y: y }, // Right
            { x: x - 1, y: y }, // Left
            { x: x, y: y + 1 }, // Down
            { x: x, y: y - 1 }  // Up
        ];

        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (visited.has(neighborKey)) {
                continue;
            }

            const neighborTileId = tilemap.tileData.get(neighborKey);
            if (neighborTileId === targetTileId) {
                visited.add(neighborKey);
                queue.push(neighbor);
            }
        }
    }
    console.log(`Flood filled starting from (${startGridPos.x},${startGridPos.y})`);
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
    // Assume parent is a Materia object, not an ID, based on engine structure
    const parentMateria = materia.parent;
    if (!parentMateria) return null;

    return parentMateria.getComponent(Components.Grid);
}

function worldToGrid(worldPos, grid) {
    // Assuming grid component has cellSize property
    const gridX = Math.floor(worldPos.x / grid.cellSize.x);
    const gridY = Math.floor(worldPos.y / grid.cellSize.y);
    return { x: gridX, y: gridY };
}

function screenToWorld(screenX, screenY) {
    if (!renderer || !renderer.camera) return { x: 0, y: 0 };
    const rect = dom.sceneCanvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;

    const worldX = (x / renderer.camera.effectiveZoom) + renderer.camera.x - (rect.width / 2 / renderer.camera.effectiveZoom);
    const worldY = (y / renderer.camera.effectiveZoom) + renderer.camera.y - (rect.height / 2 / renderer.camera.effectiveZoom);

    return { x: worldX, y: worldY };
}

export function drawOverlay() {
    if (!renderer) return;
    const grid = getSelectedGrid();
    if (!grid) return;

    if (isDrawingRect) {
        // Start position is already in grid coordinates. Convert back to world space for drawing.
        const startWorldX = rectStartGridPos.x * grid.cellSize.x;
        const startWorldY = rectStartGridPos.y * grid.cellSize.y;

        // Current mouse position is in screen space. Convert to world, then to grid.
        const currentWorldPos = screenToWorld(currentMousePosition.x, currentMousePosition.y);
        const currentGridPos = worldToGrid(currentWorldPos, grid);

        // Determine the boundaries for drawing. +1 ensures the entire cell is covered.
        const rectStartX = Math.min(rectStartGridPos.x, currentGridPos.x);
        const rectStartY = Math.min(rectStartGridPos.y, currentGridPos.y);
        const rectEndX = Math.max(rectStartGridPos.x, currentGridPos.x);
        const rectEndY = Math.max(rectStartGridPos.y, currentGridPos.y);

        const worldX = rectStartX * grid.cellSize.x;
        const worldY = rectStartY * grid.cellSize.y;
        const worldWidth = (rectEndX - rectStartX + 1) * grid.cellSize.x;
        const worldHeight = (rectEndY - rectStartY + 1) * grid.cellSize.y;

        // Use renderer's context to draw directly on the canvas
        const ctx = renderer.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(100, 150, 255, 0.4)'; // Semi-transparent blue
        ctx.strokeStyle = 'rgba(180, 210, 255, 1)'; // Lighter blue for border
        ctx.lineWidth = 2 / renderer.camera.effectiveZoom; // Make line width scale with zoom

        ctx.beginPath();
        ctx.rect(worldX, worldY, worldWidth, worldHeight);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}
