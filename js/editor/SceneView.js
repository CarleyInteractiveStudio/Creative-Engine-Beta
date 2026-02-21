function checkUIGizmoHit(canvasPos) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria || !renderer) return null;

    const uiTransform = selectedMateria.getComponent(Components.UITransform);
    if (!uiTransform) return null;

    const parentCanvasMateria = selectedMateria.findAncestorWithComponent(Components.Canvas);
    if (!parentCanvasMateria) return null;

    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);

    // Bounding box of the UI element in world space
    const rectCache = new Map();
    const rect = getAbsoluteRect(selectedMateria, rectCache);


    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    const zoom = renderer.camera.effectiveZoom;
    const gizmoSize = 60 / zoom;
    const handleHitboxSize = 12 / zoom;

    const checkHit = (targetX, targetY) => {
        return Math.abs(worldMouse.x - targetX) < handleHitboxSize / 2 && Math.abs(worldMouse.y - targetY) < handleHitboxSize / 2;
    };


    switch (activeTool) {
        case 'move':
            if (Math.abs(worldMouse.y - centerY) < handleHitboxSize / 2 && worldMouse.x > centerX && worldMouse.x < centerX + gizmoSize) return 'ui-move-x';
            // Corrected Y-axis hit detection to be in the negative world Y direction (upwards on screen)
            if (Math.abs(worldMouse.x - centerX) < handleHitboxSize / 2 && worldMouse.y < centerY && worldMouse.y > centerY - gizmoSize) return 'ui-move-y';
             // Central square hit detection
            const squareHitboxSize = 10 / zoom;
            if (Math.abs(worldMouse.x - centerX) < squareHitboxSize / 2 && Math.abs(worldMouse.y - centerY) < squareHitboxSize / 2) {
                return 'ui-move-xy';
            }
            break;
        case 'scale':
            const handles = [
                { x: rect.x, y: rect.y, name: 'ui-scale-tl' },
                { x: rect.x + rect.width, y: rect.y, name: 'ui-scale-tr' },
                { x: rect.x, y: rect.y + rect.height, name: 'ui-scale-bl' },
                { x: rect.x + rect.width, y: rect.y + rect.height, name: 'ui-scale-br' },
                 { x: rect.x + rect.width / 2, y: rect.y, name: 'ui-scale-t' },
                { x: rect.x + rect.width / 2, y: rect.y + rect.height, name: 'ui-scale-b' },
                { x: rect.x, y: rect.y + rect.height / 2, name: 'ui-scale-l' },
                { x: rect.x + rect.width, y: rect.y + rect.height / 2, name: 'ui-scale-r' },
            ];
            for (const handle of handles) {
                if (checkHit(handle.x, handle.y)) return handle.name;
            }
            break;
    }


    return null;
}

function drawUIGizmos(renderer, materia) {
    if (!materia || !renderer) return;

    // A Canvas itself should not draw a UI gizmo, it uses the Canvas gizmo.
    if (materia.getComponent(Components.Canvas)) return;

    const uiTransform = materia.getComponent(Components.UITransform);
    if (!uiTransform) return;

    const parentCanvasMateria = materia.findAncestorWithComponent(Components.Canvas);
    if (!parentCanvasMateria) return;

    const { ctx, camera } = renderer;
    const zoom = camera.effectiveZoom;

    // --- Gizmo settings ---
    const GIZMO_SIZE = 60 / zoom;
    const HANDLE_THICKNESS = 2 / zoom;
    const ARROW_HEAD_SIZE = 8 / zoom;
    const SCALE_BOX_SIZE = 8 / zoom;

    // Bounding box of the UI element in world space
    const rectCache = new Map();
    const rect = getAbsoluteRect(materia, rectCache);

    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    ctx.save();

    // Draw selection outline
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 2 / zoom]);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.setLineDash([]);


    switch (activeTool) {
        case 'move':
            ctx.lineWidth = HANDLE_THICKNESS;

            // Y-Axis (Green)
            ctx.strokeStyle = '#00ff00';
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX, centerY - GIZMO_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - GIZMO_SIZE);
            ctx.lineTo(centerX - ARROW_HEAD_SIZE / 2, centerY - GIZMO_SIZE + ARROW_HEAD_SIZE);
            ctx.lineTo(centerX + ARROW_HEAD_SIZE / 2, centerY - GIZMO_SIZE + ARROW_HEAD_SIZE);
            ctx.closePath();
            ctx.fillStyle = '#00ff00';
            ctx.fill();

            // X-Axis (Red)
            ctx.strokeStyle = '#ff0000';
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + GIZMO_SIZE, centerY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX + GIZMO_SIZE, centerY);
            ctx.lineTo(centerX + GIZMO_SIZE - ARROW_HEAD_SIZE, centerY - ARROW_HEAD_SIZE / 2);
            ctx.lineTo(centerX + GIZMO_SIZE - ARROW_HEAD_SIZE, centerY + ARROW_HEAD_SIZE / 2);
            ctx.closePath();
            ctx.fillStyle = '#ff0000';
            ctx.fill();

            // XY-Plane Handle (Central Square)
            const SQUARE_SIZE = 10 / zoom;
            ctx.fillStyle = 'rgba(0, 100, 255, 0.7)';
            ctx.fillRect(centerX - SQUARE_SIZE / 2, centerY - SQUARE_SIZE / 2, SQUARE_SIZE, SQUARE_SIZE);
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(centerX - SQUARE_SIZE / 2, centerY - SQUARE_SIZE / 2, SQUARE_SIZE, SQUARE_SIZE);
            break;

        case 'scale':
            const handles = [
                { x: rect.x, y: rect.y }, // Top-left
                { x: rect.x + rect.width, y: rect.y }, // Top-right
                { x: rect.x, y: rect.y + rect.height }, // Bottom-left
                { x: rect.x + rect.width, y: rect.y + rect.height }, // Bottom-right
                { x: rect.x + rect.width / 2, y: rect.y }, // Top
                { x: rect.x + rect.width / 2, y: rect.y + rect.height }, // Bottom
                { x: rect.x, y: rect.y + rect.height / 2 }, // Left
                { x: rect.x + rect.width, y: rect.y + rect.height / 2 }, // Right
            ];
             ctx.fillStyle = '#0090ff';
            const halfBox = SCALE_BOX_SIZE / 2;
            handles.forEach(handle => {
                ctx.fillRect(handle.x - halfBox, handle.y - halfBox, SCALE_BOX_SIZE, SCALE_BOX_SIZE);
            });
            break;
    }

    ctx.restore();
}
// --- Module for Scene View Interactions and Gizmos ---

import * as VerificationSystem from './ui/VerificationSystem.js';
import { getAbsoluteRect, getClosestAnchorPoint, getAnchorPosition } from '../engine/UITransformUtils.js';
import { TerrenoEditorWindow } from './ui/TerrenoEditorWindow.js';

// Dependencies from editor.js
let dom;
let renderer;
let InputManager;
let getSelectedMateria;
let selectMateria;
let updateInspector;
let Components;
let updateScene;
let getActiveView;
let SceneManager;
let getPreferences;
let getSelectedTile;
let setPaletteActiveTool = null;

// Module State
let activeTool = 'move'; // 'move', 'rotate', 'scale', 'pan', 'tile-brush', 'tile-eraser', 'terrain-brush'
let showGizmoIcons = true;
let isAddingLayer = false;
let isDragging = false;
let lastSelectedId = -1;
let lastPaintedCoords = { col: -1, row: -1 };
// isPanning is no longer needed as a module-level state
let lastMousePosition = { x: 0, y: 0 };
let dragState = {}; // To hold info about the current drag operation
// debugDeltas is no longer needed

// --- Core Functions ---

function screenToWorld(screenX, screenY) {
    if (!renderer || !renderer.camera) return { x: 0, y: 0 };
    const worldX = (screenX - renderer.canvas.width / 2) / renderer.camera.effectiveZoom + renderer.camera.x;
    const worldY = (screenY - renderer.canvas.height / 2) / renderer.camera.effectiveZoom + renderer.camera.y;
    return { x: worldX, y: worldY };
}

function getRotateRadius(materia, transform, zoom) {
    const dims = getMateriaDimensions(materia);
    const w = dims.width * Math.abs(transform.scale.x);
    const h = dims.height * Math.abs(transform.scale.y);
    // Use the diagonal to surround the object
    const baseRadius = Math.sqrt(w * w + h * h) / 2;
    // Strictly proportional padding (10%)
    const padding = baseRadius * 0.1;
    // Very small minimum radius in world units
    const minRadius = 5;
    return Math.max(minRadius, baseRadius + padding);
}

function getMateriaDimensions(materia) {
    if (!materia) return { width: 50, height: 50 };

    const spriteRenderer = materia.getComponent(Components.SpriteRenderer);
    if (spriteRenderer && spriteRenderer.sprite && spriteRenderer.sprite.complete && spriteRenderer.sprite.naturalWidth > 0) {
        let w = spriteRenderer.sprite.naturalWidth;
        let h = spriteRenderer.sprite.naturalHeight;
        if (spriteRenderer.spriteSheet && spriteRenderer.spriteName && spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName]) {
            const rect = spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName].rect;
            if (rect) {
                w = rect.width;
                h = rect.height;
            }
        }
        return { width: w, height: h };
    }

    const textureRender = materia.getComponent(Components.TextureRender);
    if (textureRender) {
        if (textureRender.shape === 'Circle') return { width: textureRender.radius * 2, height: textureRender.radius * 2 };
        return { width: textureRender.width, height: textureRender.height };
    }

    const boxCollider = materia.getComponent(Components.BoxCollider2D);
    if (boxCollider) {
        return { width: boxCollider.size.x, height: boxCollider.size.y };
    }

    const uiTransform = materia.getComponent(Components.UITransform);
    if (uiTransform) {
        return { width: uiTransform.size.width, height: uiTransform.size.height };
    }

    return { width: 50, height: 50 };
}

function checkGizmoHit(canvasPos) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria || !renderer) return null;

    const transform = selectedMateria.getComponent(Components.Transform);
    if (!transform) return null;

    const centerX = transform.x;
    const centerY = transform.y;

    const zoom = renderer.camera.effectiveZoom;
    const gizmoSize = 60 / zoom;
    const handleHitboxSize = 12 / zoom;
    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);

    // 1. Check SCALE HANDLES (High Priority in Universal mode)
    if (activeTool === 'scale' || activeTool === 'universal') {
        const rad = -transform.rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const lx = (worldMouse.x - centerX) * cos - (worldMouse.y - centerY) * sin;
        const ly = (worldMouse.x - centerX) * sin + (worldMouse.y - centerY) * cos;

        const dims = getMateriaDimensions(selectedMateria);
        const w = dims.width * Math.abs(transform.scale.x);
        const h = dims.height * Math.abs(transform.scale.y);

        const spriteRenderer = selectedMateria.getComponent(Components.SpriteRenderer);
        let pivotX = 0.5, pivotY = 0.5;
        if (spriteRenderer) {
            pivotX = spriteRenderer.pivot?.x ?? 0.5;
            pivotY = spriteRenderer.pivot?.y ?? 0.5;
            if (spriteRenderer.spriteSheet && spriteRenderer.spriteName && spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName]) {
                const spriteData = spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName];
                if (spriteData.pivot) {
                    pivotX = spriteData.pivot.x ?? pivotX;
                    pivotY = spriteData.pivot.y ?? pivotY;
                }
            }
        }
        const drawX = -w * pivotX;
        const drawY = -h * pivotY;

        const handles = [
            { x: drawX, y: drawY, name: 'scale-tl' }, { x: drawX + w / 2, y: drawY, name: 'scale-t' }, { x: drawX + w, y: drawY, name: 'scale-tr' },
            { x: drawX, y: drawY + h / 2, name: 'scale-l' }, { x: drawX + w, y: drawY + h / 2, name: 'scale-r' },
            { x: drawX, y: drawY + h, name: 'scale-bl' }, { x: drawX + w / 2, y: drawY + h, name: 'scale-b' }, { x: drawX + w, y: drawY + h, name: 'scale-br' }
        ];

        let bestHandle = null;
        let minScore = Infinity;

        for (let i = 0; i < handles.length; i++) {
            const handle = handles[i];
            const dx = lx - handle.x;
            const dy = ly - handle.y;
            const isMidpoint = i === 1 || i === 3 || i === 4 || i === 6;

            // Larger hitbox for midpoint handles to make them easier to grab
            const currentHitbox = isMidpoint ? handleHitboxSize * 1.5 : handleHitboxSize;

            if (Math.abs(dx) < currentHitbox / 2 && Math.abs(dy) < currentHitbox / 2) {
                // Score combines distance and prioritize midpoints significantly if mouse is near axis
                let score = (dx * dx + dy * dy);

                if (isMidpoint) {
                    // EXTREMELY high priority for midpoints if mouse is close to the local axis.
                    // This prevents accidental corner grabs when clicking near the middle of an edge.
                    const axisDist = handle.x === 0 ? Math.abs(dx) : Math.abs(dy);
                    if (axisDist < handleHitboxSize * 0.6) {
                        score *= 0.01;
                    } else {
                        score *= 0.1;
                    }
                }

                if (score < minScore) {
                    minScore = score;
                    bestHandle = handle.name;
                }
            }
        }
        if (bestHandle) return bestHandle;
    }

    // 2. Check ROTATE circle
    if (activeTool === 'rotate' || activeTool === 'universal') {
        const radius = getRotateRadius(selectedMateria, transform, zoom);
        const dist = Math.sqrt(Math.pow(worldMouse.x - centerX, 2) + Math.pow(worldMouse.y - centerY, 2));
        if (Math.abs(dist - radius) < handleHitboxSize / 2) return 'rotate';
    }

    // 3. Check MOVE axes (Lower priority than specific handles)
    if (activeTool === 'move' || activeTool === 'universal') {
        // Central square hit detection
        const squareHitboxSize = 10 / zoom;
        if (Math.abs(worldMouse.x - centerX) < squareHitboxSize / 2 && Math.abs(worldMouse.y - centerY) < squareHitboxSize / 2) {
            return 'move-xy';
        }

        // Axis arrows hit detection
        if (Math.abs(worldMouse.y - centerY) < handleHitboxSize / 2 && worldMouse.x > centerX && worldMouse.x < centerX + gizmoSize) return 'move-x';
        if (Math.abs(worldMouse.x - centerX) < handleHitboxSize / 2 && worldMouse.y < centerY && worldMouse.y > centerY - gizmoSize) return 'move-y';
    }

    if (activeTool === 'scale-axis') {
        // X-Axis square head
        if (Math.abs(worldMouse.y - centerY) < handleHitboxSize / 2 && worldMouse.x > centerX + gizmoSize - handleHitboxSize / 2 && worldMouse.x < centerX + gizmoSize + handleHitboxSize / 2) return 'scale-axis-x';
        // Y-Axis square head
        if (Math.abs(worldMouse.x - centerX) < handleHitboxSize / 2 && worldMouse.y < centerY - gizmoSize + handleHitboxSize / 2 && worldMouse.y > centerY - gizmoSize - handleHitboxSize / 2) return 'scale-axis-y';
    }

    return null;
}

function checkCameraGizmoHit(canvasPos) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria || !renderer) return null;

    const cameraComponent = selectedMateria.getComponent(Components.Camera);
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!cameraComponent || !transform || cameraComponent.projection !== 'Orthographic') {
        return null;
    }

    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);
    const rad = -transform.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const localMouseX = (worldMouse.x - transform.x) * cos - (worldMouse.y - transform.y) * sin;
    const localMouseY = (worldMouse.x - transform.x) * sin + (worldMouse.y - transform.y) * cos;

    const aspect = renderer.canvas.width / renderer.canvas.height;
    const size = cameraComponent.orthographicSize;
    const halfHeight = size;
    const halfWidth = size * aspect;

    const handleHitboxSize = 10 / renderer.camera.effectiveZoom;
    const halfHitbox = handleHitboxSize / 2;

    const handles = [
        { x: 0, y: 0, name: 'camera-move' },
        { x: -halfWidth, y: -halfHeight, name: 'camera-resize-tl' },
        { x: halfWidth, y: -halfHeight, name: 'camera-resize-tr' },
        { x: -halfWidth, y: halfHeight, name: 'camera-resize-bl' },
        { x: halfWidth, y: halfHeight, name: 'camera-resize-br' },
    ];

    for (const handle of handles) {
        if ( localMouseX >= handle.x - halfHitbox && localMouseX <= handle.x + halfHitbox &&
             localMouseY >= handle.y - halfHitbox && localMouseY <= handle.y + halfHitbox ) {
            return handle.name;
        }
    }
    return null;
}

function handleEditorInteractions() {
    // This function is now largely a placeholder.
    // Panning, zooming, and gizmo dragging are all handled by direct, dynamic event listeners
    // to improve performance and reliability.
}

function drawEditorGrid() {
    const prefs = getPreferences();
    if (!prefs.showSceneGrid) return;

    const { ctx, camera, canvas } = renderer;
    if (!camera) return;

    const zoom = camera.effectiveZoom;

    // --- Adaptive Grid Algorithm ---
    const TARGET_SPACING_PX = 80;
    const SUBDIVISIONS = 10;
    const MIN_SPACING_PX_MINOR = 8;

    // 1. Calculate ideal world step
    const idealWorldStep = TARGET_SPACING_PX / zoom;

    // 2. Find the "nicest" number
    const magnitude = Math.pow(10, Math.floor(Math.log10(idealWorldStep)));
    const normalizedStep = idealWorldStep / magnitude;

    let multiplier = 1;
    if (normalizedStep < 1.5) multiplier = 1;
    else if (normalizedStep < 3.5) multiplier = 2;
    else if (normalizedStep < 7.5) multiplier = 5;
    else multiplier = 10;

    // 3. Determine final grid spacing
    const majorGridStep = multiplier * magnitude;
    const minorGridStep = majorGridStep / SUBDIVISIONS;

    // --- Drawing Logic ---
    const viewLeft = camera.x - (canvas.width / 2 / zoom);
    const viewRight = camera.x + (canvas.width / 2 / zoom);
    const viewTop = camera.y - (canvas.height / 2 / zoom);
    const viewBottom = camera.y + (canvas.height / 2 / zoom);

    ctx.save();
    ctx.lineWidth = 1 / zoom;

    // Function to draw a set of grid lines
    const drawLines = (step, color) => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        const startX = Math.floor(viewLeft / step) * step;
        const endX = Math.ceil(viewRight / step) * step;
        for (let x = startX; x <= endX; x += step) {
            ctx.moveTo(x, viewTop);
            ctx.lineTo(x, viewBottom);
        }
        const startY = Math.floor(viewTop / step) * step;
        const endY = Math.ceil(viewBottom / step) * step;
        for (let y = startY; y <= endY; y += step) {
            ctx.moveTo(viewLeft, y);
            ctx.lineTo(viewRight, y);
        }
        ctx.stroke();
    };

    // Draw minor grid lines (if they are not too crowded)
    if (minorGridStep * zoom > MIN_SPACING_PX_MINOR) {
        drawLines(minorGridStep, 'rgba(255, 255, 255, 0.05)');
    }

    // Draw major grid lines
    drawLines(majorGridStep, 'rgba(255, 255, 255, 0.1)');

    // Draw world origin axes (X and Y)
    ctx.lineWidth = 2 / zoom;
    // Y-Axis (Green)
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, viewTop);
    ctx.lineTo(0, viewBottom);
    ctx.stroke();
    // X-Axis (Red)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.moveTo(viewLeft, 0);
    ctx.lineTo(viewRight, 0);
    ctx.stroke();

    ctx.restore();
}

function drawMoveGizmo(ctx, centerX, centerY, zoom, GIZMO_SIZE, HANDLE_THICKNESS, ARROW_HEAD_SIZE) {
    ctx.lineWidth = HANDLE_THICKNESS;

    // Y-Axis (Green)
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - GIZMO_SIZE);
    ctx.stroke();
    // Arrow head for Y
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - GIZMO_SIZE);
    ctx.lineTo(centerX - ARROW_HEAD_SIZE / 2, centerY - GIZMO_SIZE + ARROW_HEAD_SIZE);
    ctx.lineTo(centerX + ARROW_HEAD_SIZE / 2, centerY - GIZMO_SIZE + ARROW_HEAD_SIZE);
    ctx.closePath();
    ctx.fillStyle = '#00ff00';
    ctx.fill();


    // X-Axis (Red)
    ctx.strokeStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + GIZMO_SIZE, centerY);
    ctx.stroke();
    // Arrow head for X
    ctx.beginPath();
    ctx.moveTo(centerX + GIZMO_SIZE, centerY);
    ctx.lineTo(centerX + GIZMO_SIZE - ARROW_HEAD_SIZE, centerY - ARROW_HEAD_SIZE / 2);
    ctx.lineTo(centerX + GIZMO_SIZE - ARROW_HEAD_SIZE, centerY + ARROW_HEAD_SIZE / 2);
    ctx.closePath();
    ctx.fillStyle = '#ff0000';
    ctx.fill();

    // XY-Plane Handle (Central Square)
    const SQUARE_SIZE = 10 / zoom;
    ctx.fillStyle = 'rgba(0, 100, 255, 0.7)';
    ctx.fillRect(centerX - SQUARE_SIZE / 2, centerY - SQUARE_SIZE / 2, SQUARE_SIZE, SQUARE_SIZE);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(centerX - SQUARE_SIZE / 2, centerY - SQUARE_SIZE / 2, SQUARE_SIZE, SQUARE_SIZE);
}

function drawRotateGizmo(ctx, centerX, centerY, zoom, ROTATE_RADIUS, HANDLE_THICKNESS) {
    ctx.lineWidth = HANDLE_THICKNESS;
    ctx.strokeStyle = '#0000ff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, ROTATE_RADIUS, 0, 2 * Math.PI);
    ctx.stroke();
}

function drawScaleGizmo(ctx, materia, transform, zoom, SCALE_BOX_SIZE, HANDLE_THICKNESS) {
    const dims = getMateriaDimensions(materia);
    const w = dims.width * Math.abs(transform.scale.x);
    const h = dims.height * Math.abs(transform.scale.y);
    const rad = transform.rotation * Math.PI / 180;

    const spriteRenderer = materia.getComponent(Components.SpriteRenderer);
    let pivotX = 0.5;
    let pivotY = 0.5;

    if (spriteRenderer) {
        pivotX = spriteRenderer.pivot?.x ?? 0.5;
        pivotY = spriteRenderer.pivot?.y ?? 0.5;

        if (spriteRenderer.spriteSheet && spriteRenderer.spriteName && spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName]) {
            const spriteData = spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName];
            if (spriteData.pivot) {
                pivotX = spriteData.pivot.x ?? pivotX;
                pivotY = spriteData.pivot.y ?? pivotY;
            }
        }
    }

    const drawX = -w * pivotX;
    const drawY = -h * pivotY;

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.rotate(rad);

    // Draw bounding box
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(drawX, drawY, w, h);
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1 / zoom;
    const halfBox = SCALE_BOX_SIZE / 2;

    const handles = [
        { x: drawX, y: drawY }, { x: drawX + w / 2, y: drawY }, { x: drawX + w, y: drawY },
        { x: drawX, y: drawY + h / 2 }, { x: drawX + w, y: drawY + h / 2 },
        { x: drawX, y: drawY + h }, { x: drawX + w / 2, y: drawY + h }, { x: drawX + w, y: drawY + h }
    ];

    handles.forEach(pos => {
        ctx.fillRect(pos.x - halfBox, pos.y - halfBox, SCALE_BOX_SIZE, SCALE_BOX_SIZE);
        ctx.strokeRect(pos.x - halfBox, pos.y - halfBox, SCALE_BOX_SIZE, SCALE_BOX_SIZE);
    });

    ctx.restore();
}

function drawScaleAxisGizmo(ctx, centerX, centerY, zoom, GIZMO_SIZE, HANDLE_THICKNESS, SCALE_BOX_SIZE) {
     ctx.lineWidth = HANDLE_THICKNESS;

    // Y-Axis (Green)
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - GIZMO_SIZE);
    ctx.stroke();
    // Square head for Y
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(centerX - SCALE_BOX_SIZE / 2, centerY - GIZMO_SIZE - SCALE_BOX_SIZE / 2, SCALE_BOX_SIZE, SCALE_BOX_SIZE);

    // X-Axis (Red)
    ctx.strokeStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + GIZMO_SIZE, centerY);
    ctx.stroke();
    // Square head for X
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(centerX + GIZMO_SIZE - SCALE_BOX_SIZE / 2, centerY - SCALE_BOX_SIZE / 2, SCALE_BOX_SIZE, SCALE_BOX_SIZE);
}

function drawGizmos(renderer, materia) {
    if (!materia || !renderer) return;

    const transform = materia.getComponent(Components.Transform);
    if (!transform) return;

    const { ctx, camera } = renderer;
    const zoom = camera.effectiveZoom;

    // --- Gizmo settings ---
    const GIZMO_SIZE = 60 / zoom; // Size in world units, adjusted for zoom
    const HANDLE_THICKNESS = 2 / zoom;
    const ARROW_HEAD_SIZE = 8 / zoom;
    const SCALE_BOX_SIZE = 8 / zoom;


    // Center of the object in world space
    const centerX = transform.x;
    const centerY = transform.y;

    const dynamicRotateRadius = getRotateRadius(materia, transform, zoom);

    ctx.save();

    if (activeTool === 'move') {
        drawMoveGizmo(ctx, centerX, centerY, zoom, GIZMO_SIZE, HANDLE_THICKNESS, ARROW_HEAD_SIZE);
    } else if (activeTool === 'rotate') {
        drawRotateGizmo(ctx, centerX, centerY, zoom, dynamicRotateRadius, HANDLE_THICKNESS);
    } else if (activeTool === 'scale') {
        drawScaleGizmo(ctx, materia, transform, zoom, SCALE_BOX_SIZE, HANDLE_THICKNESS);
    } else if (activeTool === 'scale-axis') {
        drawScaleAxisGizmo(ctx, centerX, centerY, zoom, GIZMO_SIZE, HANDLE_THICKNESS, SCALE_BOX_SIZE);
    } else if (activeTool === 'universal') {
        drawMoveGizmo(ctx, centerX, centerY, zoom, GIZMO_SIZE, HANDLE_THICKNESS, ARROW_HEAD_SIZE);
        drawRotateGizmo(ctx, centerX, centerY, zoom, dynamicRotateRadius, HANDLE_THICKNESS);
        drawScaleGizmo(ctx, materia, transform, zoom, SCALE_BOX_SIZE, HANDLE_THICKNESS);
    }

    ctx.restore();
}


// --- Public API ---

export function getActiveTool() {
    return activeTool;
}

export function setActiveTool(toolName) {
    if (toolName === activeTool) return;
    activeTool = toolName;
    const toolActiveBtn = document.getElementById('tool-active');
    const activeBtnInDropdown = document.getElementById(`tool-${toolName}`);

    document.querySelectorAll('.tool-dropdown-content .toolbar-btn').forEach(btn => btn.classList.remove('active'));
    if (activeBtnInDropdown) {
        activeBtnInDropdown.classList.add('active');
    }

    if (toolActiveBtn && activeBtnInDropdown) {
        toolActiveBtn.innerHTML = activeBtnInDropdown.innerHTML.split(' ')[0];
        toolActiveBtn.title = activeBtnInDropdown.title;
    }
    activeTool = toolName;
    // Notify the TilePaletteWindow of the change, if the function is available
    if (setPaletteActiveTool) {
        setPaletteActiveTool(toolName);
    }
}

export function initialize(dependencies) {
    dom = dependencies.dom;
    renderer = dependencies.renderer;
    InputManager = dependencies.InputManager;
    getSelectedMateria = dependencies.getSelectedMateria;
    selectMateria = dependencies.selectMateria;
    updateInspector = dependencies.updateInspectorCallback;
    Components = dependencies.Components;
    updateScene = dependencies.updateScene;
    getActiveView = dependencies.getActiveView;
    SceneManager = dependencies.SceneManager;
    getPreferences = dependencies.getPreferences;
    getSelectedTile = dependencies.getSelectedTile;
    setPaletteActiveTool = dependencies.setPaletteActiveTool;

    // --- Gizmo Drag Handlers (defined at a higher scope) ---
    const onGizmoDrag = (moveEvent) => {
        moveEvent.preventDefault();
        if (!dragState.materia) return;

        const transform = dragState.materia.getComponent(Components.Transform);
        const uiTransform = dragState.materia.getComponent(Components.UITransform);
        const dx = (moveEvent.clientX - lastMousePosition.x) / renderer.camera.effectiveZoom;
        const dy = (moveEvent.clientY - lastMousePosition.y) / renderer.camera.effectiveZoom;

        switch (dragState.handle) {
            case 'camera-move': transform.x += dx; transform.y += dy; break;
            case 'move-x': transform.x += dx; break;
            case 'move-y': transform.y += dy; break;
            case 'move-xy': transform.x += dx; transform.y += dy; break;
            case 'camera-resize-tl': case 'camera-resize-tr': case 'camera-resize-bl': case 'camera-resize-br': {
                const cam = dragState.materia.getComponent(Components.Camera);
                if (!cam) break;
                const worldMouse = screenToWorld(moveEvent.clientX - dom.sceneCanvas.getBoundingClientRect().left, moveEvent.clientY - dom.sceneCanvas.getBoundingClientRect().top);
                const rad = -transform.rotation * Math.PI / 180;
                const cos = Math.cos(rad), sin = Math.sin(rad);
                const localMouseX = (worldMouse.x - transform.x) * cos - (worldMouse.y - transform.y) * sin;
                const localMouseY = (worldMouse.x - transform.x) * sin + (worldMouse.y - transform.y) * cos;
                const aspect = renderer.canvas.width / renderer.canvas.height;
                cam.orthographicSize = Math.max(0.1, Math.max(Math.abs(localMouseY), Math.abs(localMouseX) / aspect));
                break;
            }
            case 'ui-move-x':
                 uiTransform.position.x += dx;
                 break;
            case 'ui-move-y':
                 uiTransform.position.y += dy;
                 break;
            case 'ui-move-xy':
                {
                    const parentCanvasMateria = dragState.materia.findAncestorWithComponent(Components.Canvas);
                    if (!uiTransform || !parentCanvasMateria) break;

                    const rectCache = new Map();
                    // 1. Calculate the element's desired new absolute center position
                    const oldRect = getAbsoluteRect(dragState.materia, rectCache);
                    const desiredCenterX = (oldRect.x + oldRect.width / 2) + dx;
                    const desiredCenterY = (oldRect.y + oldRect.height / 2) + dy;

                    // 2. Determine the closest anchor point based on the new position
                    const parentRect = getAbsoluteRect(parentCanvasMateria, rectCache);
                    const positionInParentCoords = { x: desiredCenterX - parentRect.x, y: desiredCenterY - parentRect.y };
                    const newAnchorPoint = getClosestAnchorPoint(positionInParentCoords, { width: parentRect.width, height: parentRect.height });

                    // 3. Calculate the new position offset relative to the *new* anchor point
                    const newAnchorPos = getAnchorPosition(newAnchorPoint, parentRect);
                    const newOffsetX = desiredCenterX - newAnchorPos.x;
                    const newOffsetY = desiredCenterY - newAnchorPos.y;

                    // 4. Apply both the new anchor and the new offset simultaneously
                    uiTransform.anchorPoint = newAnchorPoint;
                    uiTransform.position.x = newOffsetX;
                    uiTransform.position.y = newOffsetY;

                    break;
                }

            // --- UI Scaling with new Offset-based logic ---
            case 'ui-scale-r': uiTransform.size.width += dx; uiTransform.position.x += dx / 2; break;
            case 'ui-scale-l': uiTransform.size.width -= dx; uiTransform.position.x += dx / 2; break;
            case 'ui-scale-b': uiTransform.size.height += dy; uiTransform.position.y += dy / 2; break;
            case 'ui-scale-t': uiTransform.size.height -= dy; uiTransform.position.y += dy / 2; break;
            case 'ui-scale-tr':
                uiTransform.size.width += dx; uiTransform.position.x += dx / 2;
                uiTransform.size.height -= dy; uiTransform.position.y += dy / 2;
                break;
            case 'ui-scale-tl':
                uiTransform.size.width -= dx; uiTransform.position.x += dx / 2;
                uiTransform.size.height -= dy; uiTransform.position.y += dy / 2;
                break;
            case 'ui-scale-br':
                uiTransform.size.width += dx; uiTransform.position.x += dx / 2;
                uiTransform.size.height += dy; uiTransform.position.y += dy / 2;
                break;
            case 'ui-scale-bl':
                uiTransform.size.width -= dx; uiTransform.position.x += dx / 2;
                uiTransform.size.height += dy; uiTransform.position.y += dy / 2;
                break;

            // --- Normal Scaling logic (Incremental Delta-based like BoxCollider2D) ---
            case 'scale-tl': case 'scale-tr': case 'scale-bl': case 'scale-br':
            case 'scale-t': case 'scale-b': case 'scale-l': case 'scale-r':
                {
                    const dims = getMateriaDimensions(dragState.materia);
                    const rad = -transform.rotation * Math.PI / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    const ldx = dx * cos - dy * sin;
                    const ldy = dx * sin + dy * cos;

                    let factorX = 0, factorY = 0;
                    if (dragState.handle.includes('r')) factorX = 1;
                    else if (dragState.handle.includes('l')) factorX = -1;
                    if (dragState.handle.includes('b')) factorY = 1;
                    else if (dragState.handle.includes('t')) factorY = -1;

                    const newScale = transform.scale;
                    if (factorX !== 0) {
                        newScale.x += (ldx * factorX) / dims.width;
                    }
                    if (factorY !== 0) {
                        newScale.y += (ldy * factorY) / dims.height;
                    }
                    transform.scale = newScale;

                    // Shift center by half of the local delta in the dragged axis to keep the opposite side fixed
                    const localShiftX = factorX !== 0 ? ldx / 2 : 0;
                    const localShiftY = factorY !== 0 ? ldy / 2 : 0;

                    // Convert local shift back to world units
                    const worldRad = transform.rotation * Math.PI / 180;
                    const wcos = Math.cos(worldRad), wsin = Math.sin(worldRad);
                    transform.x += localShiftX * wcos - localShiftY * wsin;
                    transform.y += localShiftX * wsin + localShiftY * wcos;
                }
                break;

            case 'scale-axis-x':
            case 'scale-axis-y':
                {
                    const dims = getMateriaDimensions(dragState.materia);
                    const rad = -transform.rotation * Math.PI / 180;
                    const ldx = dx * Math.cos(rad) - dy * Math.sin(rad);
                    const ldy = dx * Math.sin(rad) + dy * Math.cos(rad);

                    const newScale = transform.scale;
                    if (dragState.handle === 'scale-axis-x') {
                        newScale.x += (ldx * 2) / dims.width;
                    } else {
                        // Axis Y is pointing UP on screen (negative world Y)
                        // Moving mouse up (negative dy) should increase scale.
                        // factorY for Y-axis handle is effectively -1.
                        newScale.y -= (ldy * 2) / dims.height;
                    }
                    transform.scale = newScale;
                }
                break;
            case 'rotate': {
                const worldMouse = screenToWorld(moveEvent.clientX - dom.sceneCanvas.getBoundingClientRect().left, moveEvent.clientY - dom.sceneCanvas.getBoundingClientRect().top);
                transform.rotation = Math.atan2(worldMouse.y - transform.y, worldMouse.x - transform.x) * 180 / Math.PI;
                break;
            }
        }

        // --- Collider Gizmo Logic ---
        const boxCollider = dragState.materia.getComponent(Components.BoxCollider2D);
        if (boxCollider && dragState.handle.startsWith('collider-')) {
            const rad = -transform.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const localDx = dx * cos - dy * sin;
            const localDy = dx * sin + dy * cos;

            switch (dragState.handle) {
                case 'collider-top':
                    boxCollider.size.y += localDy;
                    boxCollider.offset.y += localDy / 2;
                    break;
                case 'collider-bottom':
                    boxCollider.size.y -= localDy;
                    boxCollider.offset.y += localDy / 2;
                    break;
                case 'collider-right':
                    boxCollider.size.x += localDx;
                    boxCollider.offset.x += localDx / 2;
                    break;
                case 'collider-left':
                    boxCollider.size.x -= localDx;
                    boxCollider.offset.x += localDx / 2;
                    break;
                case 'collider-tr':
                    boxCollider.size.y += localDy;
                    boxCollider.offset.y += localDy / 2;
                    boxCollider.size.x += localDx;
                    boxCollider.offset.x += localDx / 2;
                    break;
                 case 'collider-tl':
                    boxCollider.size.y += localDy;
                    boxCollider.offset.y += localDy / 2;
                    boxCollider.size.x -= localDx;
                    boxCollider.offset.x += localDx / 2;
                    break;
                case 'collider-br':
                    boxCollider.size.y -= localDy;
                    boxCollider.offset.y += localDy / 2;
                    boxCollider.size.x += localDx;
                    boxCollider.offset.x += localDx / 2;
                    break;
                case 'collider-bl':
                    boxCollider.size.y -= localDy;
                    boxCollider.offset.y += localDy / 2;
                    boxCollider.size.x -= localDx;
                    boxCollider.offset.x += localDx / 2;
                    break;
            }
        }

        // --- Capsule Collider Gizmo Logic ---
        const capsuleCollider = dragState.materia.getComponent(Components.CapsuleCollider2D);
        if (capsuleCollider && dragState.handle.startsWith('collider-capsule-')) {
            const rad = -transform.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const localDx = dx * cos - dy * sin;
            const localDy = dx * sin + dy * cos;

            switch (dragState.handle) {
                case 'collider-capsule-top':
                    capsuleCollider.size.y += localDy;
                    capsuleCollider.offset.y += localDy / 2;
                    break;
                case 'collider-capsule-bottom':
                    capsuleCollider.size.y -= localDy;
                    capsuleCollider.offset.y += localDy / 2;
                    break;
                case 'collider-capsule-right':
                    capsuleCollider.size.x += localDx;
                    capsuleCollider.offset.x += localDx / 2;
                    break;
                case 'collider-capsule-left':
                    capsuleCollider.size.x -= localDx;
                    capsuleCollider.offset.x += localDx / 2;
                    break;
            }
        }


        lastMousePosition = { x: moveEvent.clientX, y: moveEvent.clientY };
        updateInspector();
    };

    const onGizmoDragEnd = () => {
        isDragging = false;
        dragState = {};
        window.removeEventListener('mousemove', onGizmoDrag);
        window.removeEventListener('mouseup', onGizmoDragEnd);
    };

    // Setup event listeners
    dom.sceneCanvas.addEventListener('contextmenu', e => e.preventDefault());

    const toggleGizmosBtn = document.getElementById('btn-toggle-gizmos');
    if (toggleGizmosBtn) {
        toggleGizmosBtn.addEventListener('click', () => {
            showGizmoIcons = !showGizmoIcons;
            toggleGizmosBtn.classList.toggle('active', showGizmoIcons);
            updateScene();
        });
    }

    // --- Drag and Drop Sprite Creation ---
    dom.sceneCanvas.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow a drop
        dom.sceneCanvas.classList.add('drag-over-scene');
    });

    dom.sceneCanvas.addEventListener('dragleave', () => {
        dom.sceneCanvas.classList.remove('drag-over-scene');
    });

    dom.sceneCanvas.addEventListener('drop', async (e) => {
        e.preventDefault();
        dom.sceneCanvas.classList.remove('drag-over-scene');

        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));

            const rect = dom.sceneCanvas.getBoundingClientRect();
            const canvasPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            const worldPos = screenToWorld(canvasPos.x, canvasPos.y);

            if (data.type === 'sprite') {
                // Create a new Materia at the drop position
                const newMateria = new Materia(data.spriteName);
                newMateria.addComponent(new Components.Transform(newMateria));
                const transform = newMateria.getComponent(Components.Transform);
                transform.x = worldPos.x;
                transform.y = worldPos.y;

                // Add and configure the SpriteRenderer
                const spriteRenderer = new Components.SpriteRenderer(newMateria);
                await spriteRenderer.setSourcePath(data.assetPath, window.projectsDirHandle); // This will load the .ceSprite
                spriteRenderer.spriteName = data.spriteName; // Set the specific sprite to render
                newMateria.addComponent(spriteRenderer);

                SceneManager.currentScene.addMateria(newMateria);

                // Refresh UI
                selectMateria(newMateria);
                updateInspector();
            } else if (data.type === 'Asset' && data.name.endsWith('.ceprefab')) {
                const newMateria = await SceneManager.instantiatePrefabFromPath(data.path, worldPos.x, worldPos.y);
                if (newMateria) {
                    selectMateria(newMateria);
                    updateInspector();
                }
            }
        } catch (error) {
            console.error("Error al soltar el sprite:", error);
        }
    });


    // Event Delegation for Toolbar Tools
    const toolDropdown = document.querySelector('.tool-dropdown-content');
    if (toolDropdown) {
        toolDropdown.addEventListener('click', (e) => {
            const toolBtn = e.target.closest('.toolbar-btn');
            if (toolBtn && toolBtn.id.startsWith('tool-')) {
                const toolName = toolBtn.id.substring('tool-'.length);
                console.log(`[DIAGNÓSTICO] Clic en botón de herramienta detectado. Herramienta: '${toolName}'`);
                setActiveTool(toolName);
            }
        });
    }


    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isAddingLayer) {
            exitAddLayerMode();
        }
    });

    dom.sceneCanvas.addEventListener('wheel', (event) => {
        event.preventDefault(); // Stop the browser from scrolling the page

        if (!renderer || !renderer.camera) return;

        const scrollDelta = event.deltaY;
        const zoomFactor = getPreferences().zoomSpeed || 1.1;

        if (scrollDelta < 0) { // Zoom in
            renderer.camera.zoom *= zoomFactor;
        } else { // Zoom out
            renderer.camera.zoom /= zoomFactor;
        }

        // Clamp zoom to avoid issues - expanded limits for more flexibility
        renderer.camera.zoom = Math.max(0.001, Math.min(renderer.camera.zoom, 1000.0));
    }, { passive: false });

    dom.sceneCanvas.addEventListener('mousedown', (e) => {
        // --- Layer Placement Logic ---
        if (isAddingLayer) {
            e.stopPropagation();
            if (e.button === 0) { // Left-click to place
                // Find where the preview would place the layer and add it
                // (This re-uses the preview logic, which could be optimized later)
                const selectedMateria = getSelectedMateria();
                const tilemap = selectedMateria?.getComponent(Components.Tilemap);
                const transform = selectedMateria?.getComponent(Components.Transform);
                const grid = selectedMateria?.parent?.getComponent(Components.Grid);

                if (tilemap && transform && grid) {
                    const layerWidth = tilemap.width * grid.cellSize.x;
                    const layerHeight = tilemap.height * grid.cellSize.y;
                    const mousePos = InputManager.getMousePositionInCanvas();
                    const worldMouse = screenToWorld(mousePos.x, mousePos.y);

                    let closestSnap = null;
                    let minDistance = Infinity;

                    for (const layer of tilemap.layers) {
                        const snapPositions = [
                            { x: layer.position.x, y: layer.position.y - 1 },
                            { x: layer.position.x, y: layer.position.y + 1 },
                            { x: layer.position.x - 1, y: layer.position.y },
                            { x: layer.position.x + 1, y: layer.position.y }
                        ];

                        for (const pos of snapPositions) {
                            if (tilemap.layers.some(l => l.position.x === pos.x && l.position.y === pos.y)) continue;
                            const snapWorldX = transform.x + pos.x * layerWidth;
                            const snapWorldY = transform.y + pos.y * layerHeight;
                            const distance = Math.hypot(worldMouse.x - snapWorldX, worldMouse.y - snapWorldY);
                            if (distance < minDistance) {
                                minDistance = distance;
                                closestSnap = pos;
                            }
                        }
                    }
                    if (closestSnap) {
                        tilemap.addLayer(closestSnap.x, closestSnap.y);
                        updateInspector();
                    }
                }
            }
            // Exit mode on any click (left or right)
            exitAddLayerMode();
            return;
        }

        // --- Panning Logic (Middle or Right-click) ---
        if (e.button === 1 || e.button === 2) {
            e.preventDefault();
            dom.sceneCanvas.style.cursor = 'grabbing';
            let lastPos = { x: e.clientX, y: e.clientY };

            const onPanMove = (moveEvent) => {
                moveEvent.preventDefault();
                const dx = moveEvent.clientX - lastPos.x;
                const dy = moveEvent.clientY - lastPos.y;
                if (renderer && renderer.camera) {
                    renderer.camera.x -= dx / renderer.camera.effectiveZoom;
                    renderer.camera.y -= dy / renderer.camera.effectiveZoom;
                }
                lastPos = { x: moveEvent.clientX, y: moveEvent.clientY };
            };
            const onPanEnd = (upEvent) => {
                upEvent.preventDefault();
                dom.sceneCanvas.style.cursor = 'grab';
                window.removeEventListener('mousemove', onPanMove);
                window.removeEventListener('mouseup', onPanEnd);
            };
            window.addEventListener('mousemove', onPanMove);
            window.addEventListener('mouseup', onPanEnd);
            return;
        }

        // --- Tile Painting Logic (Left-click) ---
        if (e.button === 0 && (activeTool === 'tile-brush' || activeTool === 'tile-eraser' || activeTool === 'tile-bucket' || activeTool === 'tile-rectangle-fill')) {
            e.stopPropagation();
            paintTile(e); // Paint on the first click

            if (activeTool === 'tile-bucket') return; // Bucket is single click

            const onPaintMove = (moveEvent) => {
                paintTile(moveEvent);
            };

            const onPaintEnd = () => {
                lastPaintedCoords = { col: -1, row: -1 }; // Reset for next paint stroke
                window.removeEventListener('mousemove', onPaintMove);
                window.removeEventListener('mouseup', onPaintEnd);
            };

            window.addEventListener('mousemove', onPaintMove);
            window.addEventListener('mouseup', onPaintEnd);
            return; // Stop further execution to prevent gizmo logic
        }

        // --- Terrain Brush Logic (Left-click) ---
        if (e.button === 0 && activeTool === 'terrain-brush') {
            e.stopPropagation();
            lastMousePosition = { x: e.clientX, y: e.clientY };

            const useBrush = (event) => {
                const selectedMateria = getSelectedMateria();
                if (!selectedMateria) return;
                const terreno = selectedMateria.getComponent(Components.Terreno2D);
                if (!terreno) return;

                const rect = dom.sceneCanvas.getBoundingClientRect();
                const worldMouse = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
                const settings = TerrenoEditorWindow.settings;

                // Dibujar o borrar terreno según el modo o si se pulsa Shift
                const isErase = (settings.mode === 'erase') || event.shiftKey;
                terreno.paint(worldMouse.x, worldMouse.y, settings.brushSize, isErase, settings.selectedLayer);

                if (updateScene) updateScene(renderer, false);

                lastMousePosition = { x: event.clientX, y: event.clientY };
            };

            useBrush(e);

            const onBrushMove = (moveEvent) => {
                useBrush(moveEvent);
            };

            const onBrushEnd = () => {
                window.removeEventListener('mousemove', onBrushMove);
                window.removeEventListener('mouseup', onBrushEnd);
            };

            window.addEventListener('mousemove', onBrushMove);
            window.addEventListener('mouseup', onBrushEnd);
            return;
        }

        // --- Gizmo Dragging Logic (Left-click) ---
        if (e.button === 0) {
            const selectedMateria = getSelectedMateria();
            if (!selectedMateria || activeTool === 'pan') return;

            const canvasPos = InputManager.getMousePositionInCanvas();
            const hitHandle = checkCameraGizmoHit(canvasPos) || checkGizmoHit(canvasPos) || checkBoxColliderGizmoHit(canvasPos) || checkCapsuleColliderGizmoHit(canvasPos) || checkUIGizmoHit(canvasPos);

            if (hitHandle) {
                e.stopPropagation();
                isDragging = true;
                const transform = selectedMateria.getComponent(Components.Transform);
                dragState = {
                    handle: hitHandle,
                    materia: selectedMateria,
                    initialTransform: transform ? {
                        x: transform.x,
                        y: transform.y,
                        rotation: transform.rotation,
                        scale: { x: transform.scale.x, y: transform.scale.y }
                    } : null,
                    initialMouseWorld: screenToWorld(canvasPos.x, canvasPos.y)
                };
                lastMousePosition = { x: e.clientX, y: e.clientY };


                // Attach the predefined handlers
                window.addEventListener('mousemove', onGizmoDrag);
                window.addEventListener('mouseup', onGizmoDragEnd);
            }
        }
    });

}

export function enterAddLayerMode() {
    isAddingLayer = true;
    dom.sceneCanvas.style.cursor = 'copy';
}

function exitAddLayerMode() {
    isAddingLayer = false;
    dom.sceneCanvas.style.cursor = 'default';
}

export function update() {
    // This will be called from the main editorLoop
    handleEditorInteractions();

    const selectedMateria = getSelectedMateria();
    const currentSelectedId = selectedMateria ? selectedMateria.id : -1;

    // Check if selection has changed
    if (currentSelectedId !== lastSelectedId) {
        let hasTilemap = false;
        if (selectedMateria) {
            // Check the selected materia itself
            hasTilemap = selectedMateria.getComponent(Components.Tilemap) !== null;
            // If not found, check its direct children
            if (!hasTilemap && selectedMateria.children) {
                hasTilemap = selectedMateria.children.some(child => child.getComponent(Components.Tilemap) !== null);
            }
        }

        // Show/hide tilemap-specific tools
        document.querySelectorAll('.tilemap-tool, .tilemap-tool-divider').forEach(el => {
            el.style.display = hasTilemap ? 'block' : 'none';
        });

        // If the selected object is not a tilemap, switch back to a default tool
        if (!hasTilemap && (activeTool === 'tile-brush' || activeTool === 'tile-eraser' || activeTool === 'tile-bucket' || activeTool === 'tile-rectangle-fill')) {
            setActiveTool('move');
        }

        lastSelectedId = currentSelectedId;
    }
}

function drawCameraGizmos(renderer) {
    if (!SceneManager || !renderer) return;
    const scene = SceneManager.currentScene;
    if (!scene) return;

    const { ctx, canvas } = renderer;
    const allMaterias = scene.getAllMaterias();
    const aspect = canvas.width / canvas.height;
    const selectedMateria = getSelectedMateria();

    allMaterias.forEach(materia => {
        if (!materia.isActive) return;
        const cameraComponent = materia.getComponent(Components.Camera);
        if (!cameraComponent) return;

        const transform = materia.getComponent(Components.Transform);
        if (!transform) return;

        const isSelected = selectedMateria && selectedMateria.id === materia.id;

        ctx.save();

        // --- Draw Camera Wireframe ---
        ctx.strokeStyle = isSelected ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1 / renderer.camera.effectiveZoom;

        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation * Math.PI / 180);

        if (cameraComponent.projection === 'Orthographic') {
            const size = cameraComponent.orthographicSize;
            const halfHeight = size;
            const halfWidth = size * aspect;

            ctx.beginPath();
            ctx.rect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
            ctx.stroke();

            // --- Draw Interactive Handles (only for selected camera) ---
            if (isSelected) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
                const handleSize = 8 / renderer.camera.effectiveZoom;
                const halfHandle = handleSize / 2;

                const handles = [
                    { x: 0, y: 0, name: 'move' },
                    { x: -halfWidth, y: -halfHeight, name: 'resize-tl' },
                    { x: halfWidth, y: -halfHeight, name: 'resize-tr' },
                    { x: -halfWidth, y: halfHeight, name: 'resize-bl' },
                    { x: halfWidth, y: halfHeight, name: 'resize-br' },
                ];

                handles.forEach(handle => {
                    ctx.fillRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize);
                });
            }

        } else { // Perspective logic remains the same
            const fovRad = cameraComponent.fov * Math.PI / 180;
            const near = cameraComponent.nearClipPlane;
            const far = cameraComponent.farClipPlane;
            const nearHalfHeight = Math.tan(fovRad / 2) * near;
            const nearHalfWidth = nearHalfHeight * aspect;
            const farHalfHeight = Math.tan(fovRad / 2) * far;
            const farHalfWidth = farHalfHeight * aspect;

            ctx.beginPath();
            ctx.moveTo(-nearHalfWidth, -nearHalfHeight); ctx.lineTo(nearHalfWidth, -nearHalfHeight); ctx.lineTo(nearHalfWidth, nearHalfHeight); ctx.lineTo(-nearHalfWidth, nearHalfHeight); ctx.closePath();
            ctx.moveTo(-farHalfWidth, -farHalfHeight); ctx.lineTo(farHalfWidth, -farHalfHeight); ctx.lineTo(farHalfWidth, farHalfHeight); ctx.lineTo(-farHalfWidth, farHalfHeight); ctx.closePath();
            ctx.moveTo(-nearHalfWidth, -nearHalfHeight); ctx.lineTo(-farHalfWidth, -farHalfHeight);
            ctx.moveTo(nearHalfWidth, -nearHalfHeight); ctx.lineTo(farHalfWidth, -farHalfHeight);
            ctx.moveTo(nearHalfWidth, nearHalfHeight); ctx.lineTo(farHalfWidth, farHalfHeight);
            ctx.moveTo(-nearHalfWidth, nearHalfHeight); ctx.lineTo(-farHalfWidth, farHalfHeight);
            ctx.stroke();
        }

        ctx.restore();
    });
}

function drawTileCursor() {
    if (activeTool !== 'tile-brush' && activeTool !== 'tile-eraser' && activeTool !== 'tile-bucket' && activeTool !== 'tile-rectangle-fill') return;

    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const tilemap = selectedMateria.getComponent(Components.Tilemap);
    const transform = selectedMateria.getComponent(Components.Transform);
    const tilemapRenderer = selectedMateria.getComponent(Components.TilemapRenderer);
    if (!tilemap || !transform || !tilemapRenderer) return;

    const grid = selectedMateria.parent?.getComponent(Components.Grid);
    if (!grid) return;

    const { ctx } = renderer;
    const { cellSize } = grid;
    const { width, height } = tilemap;
    const mousePos = InputManager.getMousePositionInCanvas();
    const worldMouse = screenToWorld(mousePos.x, mousePos.y);

    // World position of the tilemap's center
    const tilemapCenterX = transform.x;
    const tilemapCenterY = transform.y;

    const layerWidth = width * cellSize.x;
    const layerHeight = height * cellSize.y;

    for (const layer of tilemap.layers) {
        const layerOffsetX = layer.position.x * layerWidth;
        const layerOffsetY = layer.position.y * layerHeight;

        const layerTopLeftX = tilemapCenterX + layerOffsetX - layerWidth / 2;
        const layerTopLeftY = tilemapCenterY + layerOffsetY - layerHeight / 2;

        const mouseInLayerX = worldMouse.x - layerTopLeftX;
        const mouseInLayerY = worldMouse.y - layerTopLeftY;

        const col = Math.floor(mouseInLayerX / cellSize.x);
        const row = Math.floor(mouseInLayerY / cellSize.y);

        if (col >= 0 && col < width && row >= 0 && row < height) {
            ctx.save();
            ctx.lineWidth = 2 / renderer.camera.effectiveZoom;

            if (activeTool === 'tile-brush' || activeTool === 'tile-rectangle-fill') {
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
                ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';

                const selectedTiles = getSelectedTile();
                if (selectedTiles && selectedTiles.length > 0) {
                    for (const tile of selectedTiles) {
                        const tx = layerTopLeftX + (col + tile.offsetX) * cellSize.x;
                        const ty = layerTopLeftY + (row + tile.offsetY) * cellSize.y;
                        ctx.fillRect(tx, ty, cellSize.x, cellSize.y);
                        ctx.strokeRect(tx, ty, cellSize.x, cellSize.y);
                    }
                } else {
                    const cursorX = layerTopLeftX + col * cellSize.x;
                    const cursorY = layerTopLeftY + row * cellSize.y;
                    ctx.fillRect(cursorX, cursorY, cellSize.x, cellSize.y);
                    ctx.strokeRect(cursorX, cursorY, cellSize.x, cellSize.y);
                }
            } else if (activeTool === 'tile-bucket') {
                ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
                ctx.fillStyle = 'rgba(100, 255, 100, 0.2)';
                const cursorX = layerTopLeftX + col * cellSize.x;
                const cursorY = layerTopLeftY + row * cellSize.y;
                ctx.fillRect(cursorX, cursorY, cellSize.x, cellSize.y);
                ctx.strokeRect(cursorX, cursorY, cellSize.x, cellSize.y);
            } else { // eraser
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                const cursorX = layerTopLeftX + col * cellSize.x;
                const cursorY = layerTopLeftY + row * cellSize.y;
                ctx.fillRect(cursorX, cursorY, cellSize.x, cellSize.y);
                ctx.strokeRect(cursorX, cursorY, cellSize.x, cellSize.y);
            }
            ctx.restore();
            // Stop after finding the first layer under the cursor
            break;
        }
    }
}

function drawComponentGrids() {
    if (!SceneManager || !renderer) return;
    const scene = SceneManager.currentScene;
    const selectedMateria = getSelectedMateria();
    if (!scene || !selectedMateria) return;

    // Find the Grid component in the selected materia or its parents
    let gridMateria = selectedMateria;
    let grid = gridMateria.getComponent(Components.Grid);
    while (!grid && gridMateria.parent) {
        gridMateria = gridMateria.parent;
        grid = gridMateria.getComponent(Components.Grid);
    }

    if (!grid) return; // No grid found in the hierarchy of the selected object

    const transform = gridMateria.getComponent(Components.Transform);
    if (!transform) return;

    const { ctx, camera, canvas } = renderer;
    const zoom = camera.effectiveZoom;
    const prefs = getPreferences();
    const isSceneGridVisible = prefs.showSceneGrid;

    const { cellSize } = grid;
    if (cellSize.x <= 0 || cellSize.y <= 0) return;

    const viewLeft = camera.x - (canvas.width / 2 / zoom);
    const viewRight = camera.x + (canvas.width / 2 / zoom);
    const viewTop = camera.y - (canvas.height / 2 / zoom);
    const viewBottom = camera.y + (canvas.height / 2 / zoom);

    ctx.save();
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = isSceneGridVisible ? 'rgba(0, 100, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();

    const startX = Math.floor((viewLeft - transform.x) / cellSize.x) * cellSize.x + transform.x;
    const endX = Math.ceil((viewRight - transform.x) / cellSize.x) * cellSize.x + transform.x;
    for (let x = startX; x <= endX; x += cellSize.x) {
        ctx.moveTo(x, viewTop);
        ctx.lineTo(x, viewBottom);
    }

    const startY = Math.floor((viewTop - transform.y) / cellSize.y) * cellSize.y + transform.y;
    const endY = Math.ceil((viewBottom - transform.y) / cellSize.y) * cellSize.y + transform.y;
    for (let y = startY; y <= endY; y += cellSize.y) {
        ctx.moveTo(viewLeft, y);
        ctx.lineTo(viewRight, y);
    }

    ctx.stroke();
    ctx.restore();
}

function drawLayerPlacementPreview() {
    if (!isAddingLayer) return;

    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const tilemap = selectedMateria.getComponent(Components.Tilemap);
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!tilemap || !transform) return;

    const grid = selectedMateria.parent?.getComponent(Components.Grid);
    if (!grid) return;

    const { ctx, camera } = renderer;
    const { cellSize } = grid;
    const { width, height, layers } = tilemap;

    const layerWidth = width * cellSize.x;
    const layerHeight = height * cellSize.y;

    const mousePos = InputManager.getMousePositionInCanvas();
    const worldMouse = screenToWorld(mousePos.x, mousePos.y);

    // Find the closest layer and the snap position
    let closestSnap = null;
    let minDistance = Infinity;

    for (const layer of layers) {
        const layerCenterX = transform.x + layer.position.x * layerWidth;
        const layerCenterY = transform.y + layer.position.y * layerHeight;

        const snapPositions = [
            { x: layer.position.x, y: layer.position.y - 1 }, // Top
            { x: layer.position.x, y: layer.position.y + 1 }, // Bottom
            { x: layer.position.x - 1, y: layer.position.y }, // Left
            { x: layer.position.x + 1, y: layer.position.y }  // Right
        ];

        for (const pos of snapPositions) {
            // Check if a layer already exists at this position
            if (layers.some(l => l.position.x === pos.x && l.position.y === pos.y)) {
                continue;
            }

            const snapWorldX = transform.x + pos.x * layerWidth;
            const snapWorldY = transform.y + pos.y * layerHeight;
            const distance = Math.hypot(worldMouse.x - snapWorldX, worldMouse.y - snapWorldY);

            if (distance < minDistance) {
                minDistance = distance;
                closestSnap = pos;
            }
        }
    }

    if (closestSnap) {
        const previewX = transform.x + closestSnap.x * layerWidth;
        const previewY = transform.y + closestSnap.y * layerHeight;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 2 / camera.effectiveZoom;

        ctx.beginPath();
        ctx.rect(previewX - layerWidth / 2, previewY - layerHeight / 2, layerWidth, layerHeight);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

export function drawOverlay() {
    // This will be called from updateScene to draw grid/gizmos
    if (!renderer) return;
    drawEditorGrid();
    drawComponentGrids();
    drawLayerPlacementPreview();

    // Draw gizmo for the selected object
    if (getSelectedMateria()) {
        drawGizmos(renderer, getSelectedMateria());
    }

    // Draw gizmos for all cameras in the scene
    drawCameraGizmos(renderer);

    // Draw Icons (Audio, Camera, etc)
    if (showGizmoIcons) {
        drawGizmoIcons();
    }

    // Draw tile painting cursor
    drawTileCursor();

    // Draw tilemap colliders
    drawTilemapColliders();

    // Draw terrain colliders
    drawTerrenoColliders();

    // Draw physics colliders for selected object
    drawPhysicsGizmos();

    // Draw outline for selected Tilemap
    drawTilemapOutline();

    // Draw Canvas gizmos
    drawCanvasGizmos();
    drawUIGizmos(renderer, getSelectedMateria());

    drawRaycastGizmos();

    drawTerrainBrushGizmo();
}

const iconCache = new Map();
function getCachedIcon(path) {
    if (iconCache.has(path)) return iconCache.get(path);
    const img = new Image();
    img.src = path;
    iconCache.set(path, img);
    return img;
}

function drawGizmoIcons() {
    if (!SceneManager || !renderer || !SceneManager.currentScene) return;

    const { ctx, camera } = renderer;
    const zoom = camera.effectiveZoom;
    const allMaterias = SceneManager.currentScene.getAllMaterias();

    const ICON_SIZE = 32 / zoom;

    allMaterias.forEach(materia => {
        if (!materia.isActive) return;

        const transform = materia.getComponent(Components.Transform);
        if (!transform) return;

        let iconPath = null;
        if (materia.getComponent(Components.AudioSource)) {
            iconPath = 'icons/music.svg';
        } else if (materia.getComponent(Components.Camera)) {
            iconPath = 'icons/camera.svg';
        }

        if (iconPath) {
            const iconImg = getCachedIcon(iconPath);
            if (iconImg.complete && iconImg.naturalWidth > 0) {
                ctx.save();
                ctx.globalAlpha = 0.8;
                ctx.drawImage(iconImg, transform.x - ICON_SIZE / 2, transform.y - ICON_SIZE / 2, ICON_SIZE, ICON_SIZE);
                ctx.restore();
            }
        }
    });
}

function drawRaycastGizmos() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const raycastSource = selectedMateria.getComponent(Components.RaycastSource);
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!raycastSource || !transform || !raycastSource.showGizmo) return;

    const { ctx, camera } = renderer;
    const zoom = camera.effectiveZoom;

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation * Math.PI / 180);

    ctx.lineWidth = 1.5 / zoom;

    raycastSource.rays.forEach(ray => {
        const startX = ray.offset?.x || 0;
        const startY = ray.offset?.y || 0;
        const rad = (ray.angle || 0) * Math.PI / 180;
        const dirX = Math.cos(rad);
        const dirY = Math.sin(rad);
        const length = ray.length ?? 0;

        const endX = startX + dirX * length;
        const endY = startY + dirY * length;

        // Draw ray line
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)'; // Cyan
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw ray head (small dot at the end)
        ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
        const dotSize = 4 / zoom;
        ctx.beginPath();
        ctx.arc(endX, endY, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

function drawTerrainBrushGizmo() {
    if (activeTool !== 'terrain-brush' || !renderer) return;

    const selectedMateria = getSelectedMateria();
    if (!selectedMateria || !selectedMateria.getComponent(Components.Terreno2D)) return;

    const mousePos = InputManager.getMousePositionInCanvas();
    const worldMouse = screenToWorld(mousePos.x, mousePos.y);
    const settings = TerrenoEditorWindow.settings;
    const zoom = renderer.camera.effectiveZoom;

    const { ctx } = renderer;
    ctx.save();
    ctx.beginPath();
    ctx.arc(worldMouse.x, worldMouse.y, settings.brushSize, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();

    // Draw center crosshair
    const cs = 5 / zoom;
    ctx.beginPath();
    ctx.moveTo(worldMouse.x - cs, worldMouse.y);
    ctx.lineTo(worldMouse.x + cs, worldMouse.y);
    ctx.moveTo(worldMouse.x, worldMouse.y - cs);
    ctx.lineTo(worldMouse.x, worldMouse.y + cs);
    ctx.stroke();

    ctx.restore();
}

function checkBoxColliderGizmoHit(canvasPos) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria || !renderer) return null;

    const boxCollider = selectedMateria.getComponent(Components.BoxCollider2D);
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!boxCollider || !transform) return null;

    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);

    // Transform mouse position to the collider's local space
    const rad = -transform.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const localMouseX = (worldMouse.x - (transform.x + boxCollider.offset.x)) * cos - (worldMouse.y - (transform.y + boxCollider.offset.y)) * sin;
    const localMouseY = (worldMouse.x - (transform.x + boxCollider.offset.x)) * sin + (worldMouse.y - (transform.y + boxCollider.offset.y)) * cos;

    const width = boxCollider.size.x * transform.scale.x;
    const height = boxCollider.size.y * transform.scale.y;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const handleHitboxSize = 10 / renderer.camera.effectiveZoom;
    const halfHitbox = handleHitboxSize / 2;

    const handles = [
        { x: 0, y: halfHeight, name: 'collider-top' },
        { x: 0, y: -halfHeight, name: 'collider-bottom' },
        { x: halfWidth, y: 0, name: 'collider-right' },
        { x: -halfWidth, y: 0, name: 'collider-left' },
        { x: -halfWidth, y: halfHeight, name: 'collider-tl' },
        { x: halfWidth, y: halfHeight, name: 'collider-tr' },
        { x: -halfWidth, y: -halfHeight, name: 'collider-bl' },
        { x: halfWidth, y: -halfHeight, name: 'collider-br' }
    ];

    for (const handle of handles) {
        if ( localMouseX >= handle.x - halfHitbox && localMouseX <= handle.x + halfHitbox &&
             localMouseY >= handle.y - halfHitbox && localMouseY <= handle.y + halfHitbox ) {
            return handle.name;
        }
    }

    return null;
}

function checkCapsuleColliderGizmoHit(canvasPos) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria || !renderer) return null;

    const capsuleCollider = selectedMateria.getComponent(Components.CapsuleCollider2D);
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!capsuleCollider || !transform) return null;

    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);

    const rad = -transform.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const localMouseX = (worldMouse.x - (transform.x + capsuleCollider.offset.x)) * cos - (worldMouse.y - (transform.y + capsuleCollider.offset.y)) * sin;
    const localMouseY = (worldMouse.x - (transform.x + capsuleCollider.offset.x)) * sin + (worldMouse.y - (transform.y + capsuleCollider.offset.y)) * cos;

    const width = capsuleCollider.size.x * transform.scale.x;
    const height = capsuleCollider.size.y * transform.scale.y;

    const handleHitboxSize = 10 / renderer.camera.effectiveZoom;
    const halfHitbox = handleHitboxSize / 2;

    let handles = [];
    if (capsuleCollider.direction === 'Vertical') {
        handles = [
            { x: 0, y: height / 2, name: 'collider-capsule-top' },
            { x: 0, y: -height / 2, name: 'collider-capsule-bottom' },
            { x: width / 2, y: 0, name: 'collider-capsule-right' },
            { x: -width / 2, y: 0, name: 'collider-capsule-left' }
        ];
    } else { // Horizontal
        handles = [
            { x: width / 2, y: 0, name: 'collider-capsule-right' },
            { x: -width / 2, y: 0, name: 'collider-capsule-left' },
            { x: 0, y: height / 2, name: 'collider-capsule-top' },
            { x: 0, y: -height / 2, name: 'collider-capsule-bottom' }
        ];
    }

    for (const handle of handles) {
        if ( localMouseX >= handle.x - halfHitbox && localMouseX <= handle.x + halfHitbox &&
             localMouseY >= handle.y - halfHitbox && localMouseY <= handle.y + halfHitbox ) {
            return handle.name;
        }
    }

    return null;
}

function drawCapsulePath(ctx, width, height, direction) {
    ctx.beginPath();
    if (direction === 'Vertical') {
        const radius = width / 2;
        const straightHeight = Math.max(0, height - width);
        const halfStraight = straightHeight / 2;

        ctx.arc(0, -halfStraight, radius, Math.PI, 0);
        ctx.lineTo(radius, halfStraight);
        ctx.arc(0, halfStraight, radius, 0, Math.PI);
        ctx.closePath();
    } else { // Horizontal
        const radius = height / 2;
        const straightWidth = Math.max(0, width - height);
        const halfStraight = straightWidth / 2;

        ctx.arc(halfStraight, 0, radius, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-halfStraight, radius);
        ctx.arc(-halfStraight, 0, radius, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
    }
}

function drawPhysicsGizmos() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const transform = selectedMateria.getComponent(Components.Transform);
    if (!transform) return;

    const { ctx, camera } = renderer;
    if (!ctx || !camera) return;

    // Draw BoxCollider2D
    const boxCollider = selectedMateria.getComponent(Components.BoxCollider2D);
    if (boxCollider) {
        const width = boxCollider.size.x * transform.scale.x;
        const height = boxCollider.size.y * transform.scale.y;
        const centerX = transform.x + boxCollider.offset.x;
        const centerY = transform.y + boxCollider.offset.y;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(transform.rotation * Math.PI / 180);

        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 2 / camera.effectiveZoom;
        ctx.setLineDash([]);
        ctx.strokeRect(-width / 2, -height / 2, width, height);

        const handleSize = 8 / camera.effectiveZoom;
        const halfHandle = handleSize / 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';

        const handles = [
            { x: 0, y: height / 2 }, { x: 0, y: -height / 2 },
            { x: width / 2, y: 0 }, { x: -width / 2, y: 0 },
            { x: -width / 2, y: height / 2 }, { x: width / 2, y: height / 2 },
            { x: -width / 2, y: -height / 2 }, { x: width / 2, y: -height / 2 }
        ];
        handles.forEach(handle => ctx.fillRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize));

        ctx.restore();
    }

    // Draw CapsuleCollider2D
    const capsuleCollider = selectedMateria.getComponent(Components.CapsuleCollider2D);
    if (capsuleCollider) {
        const width = capsuleCollider.size.x * transform.scale.x;
        const height = capsuleCollider.size.y * transform.scale.y;
        const centerX = transform.x + capsuleCollider.offset.x;
        const centerY = transform.y + capsuleCollider.offset.y;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(transform.rotation * Math.PI / 180);

        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 2 / camera.effectiveZoom;
        ctx.setLineDash([]);
        drawCapsulePath(ctx, width, height, capsuleCollider.direction);
        ctx.stroke();

        const handleSize = 8 / camera.effectiveZoom;
        const halfHandle = handleSize / 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';

        let handles = (capsuleCollider.direction === 'Vertical')
            ? [{ x: 0, y: height / 2 }, { x: 0, y: -height / 2 }, { x: width / 2, y: 0 }, { x: -width / 2, y: 0 }]
            : [{ x: width / 2, y: 0 }, { x: -width / 2, y: 0 }, { x: 0, y: height / 2 }, { x: 0, y: -height / 2 }];

        handles.forEach(handle => ctx.fillRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize));

        ctx.restore();
    }
}


function drawTilemapOutline() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    // Find the Tilemap component on the selected object or its children
    let tilemap = selectedMateria.getComponent(Components.Tilemap);
    let tilemapMateria = selectedMateria;
    if (!tilemap) {
        const childWithTilemap = selectedMateria.children.find(c => c.getComponent(Components.Tilemap));
        if (childWithTilemap) {
            tilemap = childWithTilemap.getComponent(Components.Tilemap);
            tilemapMateria = childWithTilemap;
        }
    }
    if (!tilemap) return;

    // Find the Grid component in the parent
    const grid = tilemapMateria.parent?.getComponent(Components.Grid);
    if (!grid) return;

    const transform = tilemapMateria.getComponent(Components.Transform);
    if (!transform) return;

    const { ctx, camera } = renderer;
    const { cellSize } = grid;
    const { width, height } = tilemap;

    const layerWidth = width * cellSize.x;
    const layerHeight = height * cellSize.y;

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation * Math.PI / 180);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2 / camera.effectiveZoom;

    for (const layer of tilemap.layers) {
        const offsetX = layer.position.x * layerWidth;
        const offsetY = layer.position.y * layerHeight;
        ctx.strokeRect(offsetX - layerWidth / 2, offsetY - layerHeight / 2, layerWidth, layerHeight);
    }

    ctx.restore();
}

function drawTerrenoColliders() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const collider = selectedMateria.getComponent(Components.TerrenoCollider2D);
    const transform = selectedMateria.getComponent(Components.Transform);

    if (!collider || !transform) return;

    if (collider.isDirty) {
        collider.generate();
    }

    const { ctx, camera } = renderer;

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation * Math.PI / 180);

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = 2 / camera.effectiveZoom;
    ctx.setLineDash([4 / camera.effectiveZoom, 4 / camera.effectiveZoom]);

    // Draw based on mode to avoid visual clutter from old data
    if (collider.mode === 'Rectangles') {
        for (const rect of collider.generatedColliders) {
            ctx.strokeRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
        }
    } else if (collider.mode === 'Polygon') {
        // Draw the full polygon outlines for a cleaner look
        const polysToDraw = (collider.debugPolygons && collider.debugPolygons.length > 0)
            ? collider.debugPolygons
            : collider.generatedPolygons;

        if (polysToDraw) {
            for (const poly of polysToDraw) {
                if (poly.vertices && poly.vertices.length > 2) {
                    ctx.beginPath();
                    ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
                    for (let i = 1; i < poly.vertices.length; i++) {
                        ctx.lineTo(poly.vertices[i].x, poly.vertices[i].y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        }
    }

    ctx.restore();
}

function drawTilemapColliders() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    let colliderMateria = null;
    let collider = selectedMateria.getComponent(Components.TilemapCollider2D);

    if (collider) {
        colliderMateria = selectedMateria;
    } else if (selectedMateria.children && selectedMateria.children.length > 0) {
        const childWithCollider = selectedMateria.children.find(c => c.getComponent(Components.TilemapCollider2D));
        if (childWithCollider) {
            collider = childWithCollider.getComponent(Components.TilemapCollider2D);
            colliderMateria = childWithCollider;
        }
    }

    if (!collider || !colliderMateria) return;

    const transform = colliderMateria.getComponent(Components.Transform);
    const tilemap = colliderMateria.getComponent(Components.Tilemap);
    const grid = colliderMateria.parent?.getComponent(Components.Grid);

    if (!transform || !tilemap || !grid) return;

    const { ctx, camera } = renderer;
    const { cellSize } = grid;

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation * Math.PI / 180);

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = 2 / camera.effectiveZoom;
    ctx.setLineDash([6 / camera.effectiveZoom, 4 / camera.effectiveZoom]);

    const layerWidth = tilemap.width * cellSize.x;
    const layerHeight = tilemap.height * cellSize.y;

    for (let i = 0; i < tilemap.layers.length; i++) {
        const layer = tilemap.layers[i];
        // Use the new safe accessor method to prevent crashes
        const rects = collider.getMeshForLayer(i);

        const layerOffsetX = layer.position.x * layerWidth;
        const layerOffsetY = layer.position.y * layerHeight;
        const layerTopLeftX = layerOffsetX - layerWidth / 2;
        const layerTopLeftY = layerOffsetY - layerHeight / 2;

        for (const rect of rects) {
            const rectX = layerTopLeftX + rect.col * cellSize.x;
            const rectY = layerTopLeftY + rect.row * cellSize.y;
            const rectWidth = rect.width * cellSize.x;
            const rectHeight = rect.height * cellSize.y;
            ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        }
    }
    ctx.restore();
}

function bucketFill(layer, col, row, replacementTile) {
    const targetTile = layer.tileData.get(`${col},${row}`);
    if (isSameTile(targetTile, replacementTile)) return;

    const queue = [[col, row]];
    const visited = new Set();
    const maxTiles = 5000;

    while (queue.length > 0 && visited.size < maxTiles) {
        const [cx, cy] = queue.shift();
        const key = `${cx},${cy}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const currentTile = layer.tileData.get(key);
        if (isSameTile(currentTile, targetTile)) {
            layer.tileData.set(key, {
                spriteName: replacementTile.spriteName,
                imageData: replacementTile.imageData,
                type: replacementTile.type,
                animationPath: replacementTile.animationPath
            });

            queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
    }
}

function isSameTile(tileA, tileB) {
    if (!tileA && !tileB) return true;
    if (!tileA || !tileB) return false;
    return tileA.spriteName === tileB.spriteName && tileA.imageData === tileB.imageData;
}

function paintTile(event) {
    const selectedMateria = getSelectedMateria();
    const L = window.Localization;
    if (!selectedMateria) {
        VerificationSystem.updateStatus(null, false, L.get('ERROR_NO_OBJETO_SELECT', "Error: No hay ningún objeto seleccionado."));
        return;
    }

    let tilemapMateria = selectedMateria;
    let tilemap = tilemapMateria.getComponent(Components.Tilemap);

    if (!tilemap) {
        const childWithTilemap = tilemapMateria.children.find(c => c.getComponent(Components.Tilemap));
        if (childWithTilemap) {
            tilemapMateria = childWithTilemap;
            tilemap = childWithTilemap.getComponent(Components.Tilemap);
        }
    }

    const transform = tilemapMateria.getComponent(Components.Transform);
    const tilemapRenderer = tilemapMateria.getComponent(Components.TilemapRenderer);

    if (!tilemap || !transform || !tilemapRenderer) {
        VerificationSystem.updateStatus(null, false, L.get('ERROR_TILEMAP_INVALIDO', "Error: El objeto seleccionado o sus hijos no contienen un Tilemap válido."));
        return;
    }

    const grid = selectedMateria.parent?.getComponent(Components.Grid);
    if (!grid) {
        VerificationSystem.updateStatus(null, false, L.get('ERROR_GRID_FALTANTE', "Error: El objeto padre del Tilemap no tiene un componente Grid."));
        return;
    }

    const { cellSize } = grid;
    const { width, height } = tilemap;
    const rect = dom.sceneCanvas.getBoundingClientRect();
    const canvasPos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);
    const tilemapCenterX = transform.x;
    const tilemapCenterY = transform.y;
    const layerWidth = width * cellSize.x;
    const layerHeight = height * cellSize.y;

    for (const layer of tilemap.layers) {
        const layerOffsetX = layer.position.x * layerWidth;
        const layerOffsetY = layer.position.y * layerHeight;
        const layerTopLeftX = tilemapCenterX + layerOffsetX - layerWidth / 2;
        const layerTopLeftY = tilemapCenterY + layerOffsetY - layerHeight / 2;
        const mouseInLayerX = worldMouse.x - layerTopLeftX;
        const mouseInLayerY = worldMouse.y - layerTopLeftY;
        const col = Math.floor(mouseInLayerX / cellSize.x);
        const row = Math.floor(mouseInLayerY / cellSize.y);

        if (col >= 0 && col < width && row >= 0 && row < height) {
            if (col === lastPaintedCoords.col && row === lastPaintedCoords.row) return;

            const key = `${col},${row}`;
            if (activeTool === 'tile-brush' || activeTool === 'tile-rectangle-fill') {
                const tilesToPaint = getSelectedTile();
                if (tilesToPaint && tilesToPaint.length > 0) {
                    let hasAnimation = false;
                    for (const tile of tilesToPaint) {
                        const targetKey = `${col + tile.offsetX},${row + tile.offsetY}`;
                        layer.tileData.set(targetKey, {
                            spriteName: tile.spriteName,
                            imageData: tile.imageData,
                            type: tile.type,
                            animationPath: tile.animationPath
                        });
                        if (tile.type === 'animation') hasAnimation = true;
                    }

                    if (hasAnimation && !tilemapMateria.getComponent(Components.Animator)) {
                        tilemapMateria.addComponent(new Components.Animator(tilemapMateria));
                        updateInspector();
                    }

                    VerificationSystem.updateStatus(tilesToPaint[0], true, L.get('STATUS_TILE_PINTADO', "¡Tile Pintado!"), `${L.get('DETALLE_COORDENADAS', 'Coordenadas')}: [${col}, ${row}]`);
                } else {
                    VerificationSystem.updateStatus(null, false, L.get('ERROR_SIN_TILE_PALETA', "Error: No hay ningún tile seleccionado en la paleta."));
                    return;
                }
            } else if (activeTool === 'tile-bucket') {
                const selectedTiles = getSelectedTile();
                if (selectedTiles && selectedTiles.length > 0) {
                    const tileToPaint = selectedTiles[0];
                    bucketFill(layer, col, row, tileToPaint);

                    if (tileToPaint.type === 'animation' && !tilemapMateria.getComponent(Components.Animator)) {
                        tilemapMateria.addComponent(new Components.Animator(tilemapMateria));
                        updateInspector();
                    }

                    VerificationSystem.updateStatus(tileToPaint, true, L.get('STATUS_AREA_RELLENADA', "¡Área Rellenada!"), `${L.get('DETALLE_COORDENADAS', 'Coordenadas')}: [${col}, ${row}]`);
                }
            } else if (activeTool === 'tile-eraser') {
                layer.tileData.delete(key);
                VerificationSystem.updateStatus(null, true, L.get('STATUS_TILE_BORRADO', "Tile Borrado"), `${L.get('DETALLE_COORDENADAS', 'Coordenadas')}: [${col}, ${row}]`);
            }

            lastPaintedCoords = { col, row };
            tilemapRenderer.setDirty();

            // After painting, find the collider and regenerate its mesh
            const collider = tilemapMateria.getComponent(Components.TilemapCollider2D);
            if (collider) {
                collider.generateMesh();
            }

            return;
        }
    }
    VerificationSystem.updateStatus(null, false, L.get('INFO_CLICK_FUERA_TILEMAP', "Info: El clic no cayó dentro de los límites de ninguna capa del tilemap."));
}

function drawCanvasGizmos() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    let canvasToShow = null;

    // Case 1: The selected object itself is a Canvas
    if (selectedMateria.getComponent(Components.Canvas)) {
        canvasToShow = selectedMateria;
    }
    // Case 2: The selected object is a UI element (child of a Canvas)
    else if (selectedMateria.getComponent(Components.UITransform)) {
        // Find the root canvas for this UI element
        canvasToShow = selectedMateria.findAncestorWithComponent(Components.Canvas);
    }

    if (!canvasToShow) return;

    const canvasComponent = canvasToShow.getComponent(Components.Canvas);
    const transform = canvasToShow.getComponent(Components.Transform);
    if (!canvasComponent || !transform) return;

    const { ctx, camera } = renderer;
    const pos = transform.position;

    ctx.save();
    ctx.lineWidth = 2 / camera.effectiveZoom;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.setLineDash([10 / camera.effectiveZoom, 5 / camera.effectiveZoom]);

    let gizmoWidth, gizmoHeight;

    if (canvasComponent.renderMode === 'World Space') {
        gizmoWidth = canvasComponent.size.x;
        gizmoHeight = canvasComponent.size.y;
    } else { // Screen Space
        // Use the referenceResolution for the gizmo size.
        gizmoWidth = canvasComponent.referenceResolution.width;
        gizmoHeight = canvasComponent.referenceResolution.height;
    }

    ctx.strokeRect(pos.x - gizmoWidth / 2, pos.y - gizmoHeight / 2, gizmoWidth, gizmoHeight);

    // --- Draw 3x3 Grid ---
    if (canvasComponent.showGrid) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'; // Semi-transparent green
        ctx.lineWidth = 1 / camera.effectiveZoom;
        ctx.setLineDash([]); // Solid line

        const startX = pos.x - gizmoWidth / 2;
        const startY = pos.y - gizmoHeight / 2;

        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(startX + gizmoWidth / 3, startY);
        ctx.lineTo(startX + gizmoWidth / 3, startY + gizmoHeight);
        ctx.moveTo(startX + (2 * gizmoWidth) / 3, startY);
        ctx.lineTo(startX + (2 * gizmoWidth) / 3, startY + gizmoHeight);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(startX, startY + gizmoHeight / 3);
        ctx.lineTo(startX + gizmoWidth, startY + gizmoHeight / 3);
        ctx.moveTo(startX, startY + (2 * gizmoHeight) / 3);
        ctx.lineTo(startX + gizmoWidth, startY + (2 * gizmoHeight) / 3);
        ctx.stroke();
    }

    ctx.restore();
}
