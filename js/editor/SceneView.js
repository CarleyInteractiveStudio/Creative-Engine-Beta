import { world3DToScreen, drawLineClipped } from '../engine/MathUtils.js';
// --- Module for Scene View Interactions and Gizmos ---

import { getAbsoluteRect, getClosestAnchorPoint, getAnchorPosition } from '../engine/UITransformUtils.js';
import { TerrenoEditorWindow } from './ui/TerrenoEditorWindow.js';
import { getCurrentDirectoryHandle, getCurrentDirectoryPath } from './ui/AssetBrowserWindow.js';
import * as MateriaFactory from './MateriaFactory.js';
import { WeightPainter } from './WeightPainter.js';
import { broadcastUpdate } from './CollaborationSystem.js';
import { Gizmos } from '../engine/Gizmos.js';
import { CarleyMath } from '../carley-world/CarleyMath.js';

function isProject3D(config) {
    if (!config) return false;
    return config.projectType === '3d' ||
           config.rendererMode === '3d-mode' ||
           config.rendererMode === 'hybrid-3d' ||
           config.rendererMode === 'anime-3d' ||
           config.rendererMode === 'realista';
}

// Dependencies from editor.js
let dom;
let renderer;
let InputManager;
let getSelectedMateria;
let selectMateria;
let updateInspector;
let updateAssetBrowser;
let Components;
let Components3D;
let updateScene;
let getActiveView;
let SceneManager;
let getPreferences;
let getSelectedTile;
let setPaletteActiveTool = null;
let getCurrentProjectConfig;
let getDeltaTime;

// Module State
let activeTool = 'move'; // 'move', 'rotate', 'scale', 'pan', 'tile-brush', 'tile-eraser', 'terrain-brush', 'weight-painter'
let showGizmoIcons = true;
let isAddingLayer = false;
let isDragging = false;
let isNavigating3D = false;
let lastSelectedId = -1;
let lastPaintedCoords = { col: -1, row: -1 };
// isPanning is no longer needed as a module-level state
let lastMousePosition = { x: 0, y: 0 };
let showContextMenuCallback = () => {};
let dragState = {}; // To hold info about the current drag operation
// debugDeltas is no longer needed

// --- Core Functions ---

export function screenToWorld(screenX, screenY) {
    if (!renderer || !renderer.camera) return { x: 0, y: 0 };
    const worldX = (screenX - renderer.canvas.width / 2) / renderer.camera.effectiveZoom + renderer.camera.x;
    // World Y increases upwards (+Y UP)
    const worldY = (renderer.canvas.height / 2 - screenY) / renderer.camera.effectiveZoom + renderer.camera.y;
    return { x: worldX, y: worldY };
}

export function getMouseRay3D(screenX, screenY) {
    const r3d = window._Renderer3D;
    const glm = window.glMatrix;
    if (!r3d || !r3d.lastProjectionMatrix || !r3d.lastViewMatrix || !glm) return null;

    const canvas = r3d.canvas;
    const rect = canvas.getBoundingClientRect();

    // Normalize coordinates to NDC
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    // Standard unproject expects Y to be flipped from screen space
    const y = 1 - ((screenY - rect.top) / rect.height) * 2;

    const invProj = glm.mat4.create();
    glm.mat4.invert(invProj, r3d.lastProjectionMatrix);
    const invView = glm.mat4.create();
    glm.mat4.invert(invView, r3d.lastViewMatrix);

    const unproject = (nx, ny, nz) => {
        const clipPos = glm.vec4.fromValues(nx, ny, nz, 1.0);
        const viewPos = glm.vec4.create();
        glm.vec4.transformMat4(viewPos, clipPos, invProj);
        glm.vec4.scale(viewPos, viewPos, 1.0 / viewPos[3]);
        const worldPos = glm.vec4.create();
        glm.vec4.transformMat4(worldPos, viewPos, invView);
        return glm.vec3.fromValues(worldPos[0], worldPos[1], worldPos[2]);
    };

    const nearPt = unproject(x, y, -1.0);
    const farPt = unproject(x, y, 1.0);

    const dir = glm.vec3.create();
    glm.vec3.subtract(dir, farPt, nearPt);
    glm.vec3.normalize(dir, dir);

    return { origin: nearPt, direction: dir };
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

    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);

    if (is3D) {
        return check3DGizmoHit(canvasPos, selectedMateria);
    }

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
        // Y-Axis handle is now upwards (+Y)
        if (Math.abs(worldMouse.x - centerX) < handleHitboxSize / 2 && worldMouse.y > centerY && worldMouse.y < centerY + gizmoSize) return 'move-y';
    }

    if (activeTool === 'scale-axis') {
        // X-Axis square head
        if (Math.abs(worldMouse.y - centerY) < handleHitboxSize / 2 && worldMouse.x > centerX + gizmoSize - handleHitboxSize / 2 && worldMouse.x < centerX + gizmoSize + handleHitboxSize / 2) return 'scale-axis-x';
        // Y-Axis square head (+Y is UP)
        if (Math.abs(worldMouse.x - centerX) < handleHitboxSize / 2 && worldMouse.y > centerY + gizmoSize - handleHitboxSize / 2 && worldMouse.y < centerY + gizmoSize + handleHitboxSize / 2) return 'scale-axis-y';
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
    // In +Y UP, top has higher Y
    const viewTop = camera.y + (canvas.height / 2 / zoom);
    const viewBottom = camera.y - (canvas.height / 2 / zoom);

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
        const startY = Math.floor(viewBottom / step) * step;
        const endY = Math.ceil(viewTop / step) * step;
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

    // Y-Axis (Green) - Pointing UP (+Y)
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY + GIZMO_SIZE);
    ctx.stroke();
    // Arrow head for Y
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + GIZMO_SIZE);
    ctx.lineTo(centerX - ARROW_HEAD_SIZE / 2, centerY + GIZMO_SIZE - ARROW_HEAD_SIZE);
    ctx.lineTo(centerX + ARROW_HEAD_SIZE / 2, centerY + GIZMO_SIZE - ARROW_HEAD_SIZE);
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

    // Y-Axis (Green) - Pointing UP (+Y)
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY + GIZMO_SIZE);
    ctx.stroke();
    // Square head for Y
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(centerX - SCALE_BOX_SIZE / 2, centerY + GIZMO_SIZE - SCALE_BOX_SIZE / 2, SCALE_BOX_SIZE, SCALE_BOX_SIZE);

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
            // Corrected Y-axis hit detection to be in the positive world Y direction (upwards on screen)
            if (Math.abs(worldMouse.x - centerX) < handleHitboxSize / 2 && worldMouse.y > centerY && worldMouse.y < centerY + gizmoSize) return 'ui-move-y';
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

            // Y-Axis (Green) - Pointing UP (+Y)
            ctx.strokeStyle = '#00ff00';
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX, centerY + GIZMO_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX, centerY + GIZMO_SIZE);
            ctx.lineTo(centerX - ARROW_HEAD_SIZE / 2, centerY + GIZMO_SIZE - ARROW_HEAD_SIZE);
            ctx.lineTo(centerX + ARROW_HEAD_SIZE / 2, centerY + GIZMO_SIZE - ARROW_HEAD_SIZE);
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

function drawGizmos(renderer, materia, proj = null, view = null, cw = null, ch = null) {
    if (!materia || !renderer) return;

    const transform = materia.getComponent(Components.Transform);
    if (!transform) return;

    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);

    if (is3D) {
        draw3DGizmos(materia, proj, view, cw, ch);
        return;
    }

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
        const iconImg = activeBtnInDropdown.querySelector('.ce-icon');
        if (iconImg) {
            toolActiveBtn.innerHTML = iconImg.outerHTML;
        } else {
            toolActiveBtn.innerHTML = activeBtnInDropdown.innerHTML.split(' ')[0];
        }
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
    showContextMenuCallback = dependencies.showContextMenuCallback;
    updateInspector = dependencies.updateInspectorCallback;
    updateAssetBrowser = dependencies.updateAssetBrowserCallback;
    Components = dependencies.Components;
    Components3D = dependencies.Components3D;
    updateScene = dependencies.updateScene;
    getActiveView = dependencies.getActiveView;
    SceneManager = dependencies.SceneManager;
    getPreferences = dependencies.getPreferences;
    getSelectedTile = dependencies.getSelectedTile;
    setPaletteActiveTool = dependencies.setPaletteActiveTool;
    getCurrentProjectConfig = dependencies.getCurrentProjectConfig;
    getDeltaTime = dependencies.getDeltaTime;

    window.WeightPainter = new WeightPainter(this);

    // --- Gizmo Drag Handlers (defined at a higher scope) ---
    const onGizmoDrag = (moveEvent) => {
        moveEvent.preventDefault();
        if (!dragState.materia) return;

        const transform = dragState.materia.getComponent(Components.Transform);
        const uiTransform = dragState.materia.getComponent(Components.UITransform);

        // Total delta from start of drag
        const canvas = dom.sceneCanvas;
        const rect = canvas.getBoundingClientRect();
        const currentMouseWorld = screenToWorld(moveEvent.clientX - rect.left, moveEvent.clientY - rect.top);

        const config = getCurrentProjectConfig();
        const is3D = isProject3D(config);

        // In 3D, we'll use a better projection for axes
        const totalDx = (currentMouseWorld.x - dragState.initialMouseWorld.x);
        const totalDy = (currentMouseWorld.y - dragState.initialMouseWorld.y);

        const glm = window.glMatrix;

        const prefs = getPreferences ? getPreferences() : {};
        const snapEnabled = prefs.snapping === true;
        const snapSize = parseFloat(prefs.gridSize) || 1;

        switch (dragState.handle) {
            case 'camera-move':
                transform.x = dragState.initialTransform.x + totalDx;
                transform.y = dragState.initialTransform.y + totalDy;
                break;
            case 'move-x':
            case 'move-y':
            case 'move-z':
                {
                    if (is3D && glm) {
                        const ray = getMouseRay3D(moveEvent.clientX, moveEvent.clientY);
                        if (!ray) break;

                        // 1. Determine world axis vector
                        const isY = dragState.handle === 'move-y';
                        const localAxis = dragState.handle === 'move-x' ? [1,0,0] : (isY ? [0,1,0] : [0,0,1]);
                        const q = glm.quat.create();
                        glm.quat.fromEuler(q, dragState.initialTransform.rotationX || 0, dragState.initialTransform.rotationY || 0, dragState.initialTransform.rotationZ || 0);
                        const worldAxis = glm.vec3.create();
                        glm.vec3.transformQuat(worldAxis, localAxis, q);

                        // 2. Find closest points between the world axis line and the mouse ray
                        // Line 1 (Axis): P = P0 + u * v  (v is worldAxis)
                        // Line 2 (Ray): Q = Q0 + v * w   (w is ray direction)
                        const p0 = glm.vec3.fromValues(dragState.initialTransform.x, dragState.initialTransform.y, dragState.initialTransform.z || 0);
                        const v = worldAxis;
                        const q0 = ray.origin;
                        const w = ray.direction;

                        // Solving for u (distance along axis)
                        const w1 = glm.vec3.create();
                        glm.vec3.subtract(w1, p0, q0);
                        const a = glm.vec3.dot(v, v);
                        const b = glm.vec3.dot(v, w);
                        const c = glm.vec3.dot(w, w);
                        const d = glm.vec3.dot(v, w1);
                        const e = glm.vec3.dot(w, w1);
                        const denom = a * c - b * b;

                        if (Math.abs(denom) > 1e-6) {
                            const u = (b * e - c * d) / denom;
                            const deltaU = u - (dragState.initialU || 0);

                            let nextPos = [p0[0] + v[0] * deltaU, p0[1] + v[1] * deltaU, p0[2] + v[2] * deltaU];

                            if (snapEnabled) {
                                nextPos[0] = Math.round(nextPos[0] / snapSize) * snapSize;
                                nextPos[1] = Math.round(nextPos[1] / snapSize) * snapSize;
                                nextPos[2] = Math.round(nextPos[2] / snapSize) * snapSize;
                            }

                            transform.x = nextPos[0];
                            transform.y = nextPos[1];
                            transform.z = nextPos[2];
                        }
                    } else {
                        if (dragState.handle === 'move-x') transform.x = dragState.initialTransform.x + (snapEnabled ? Math.round(totalDx / snapSize) * snapSize : totalDx);
                        if (dragState.handle === 'move-y') transform.y = dragState.initialTransform.y + (snapEnabled ? Math.round(totalDy / snapSize) * snapSize : totalDy);
                    }
                }
                break;
            case 'move-xy':
                {
                    if (is3D && glm) {
                        const ray = getMouseRay3D(moveEvent.clientX, moveEvent.clientY);
                        if (!ray) break;

                        // Create a plane parallel to camera view passing through initial transform
                        const cam = renderer.camera;
                        const camQ = glm.quat.create();
                        glm.quat.fromEuler(camQ, cam.rotation.x, cam.rotation.y, 0);
                        const planeNormal = glm.vec3.fromValues(0, 0, 1);
                        glm.vec3.transformQuat(planeNormal, planeNormal, camQ);

                        const planePoint = glm.vec3.fromValues(dragState.initialTransform.x, dragState.initialTransform.y, dragState.initialTransform.z || 0);

                        // Ray-Plane intersection: t = (p0 - l0) . n / (l . n)
                        const l0 = ray.origin;
                        const l = ray.direction;
                        const p0 = planePoint;
                        const n = planeNormal;

                        const denom = glm.vec3.dot(l, n);
                        if (Math.abs(denom) > 1e-6) {
                            const p0_l0 = glm.vec3.create();
                            glm.vec3.subtract(p0_l0, p0, l0);
                            const t = glm.vec3.dot(p0_l0, n) / denom;

                            const intersection = glm.vec3.create();
                            glm.vec3.scaleAndAdd(intersection, l0, l, t);

                            let nextPos = [
                                intersection[0] + (dragState.offsetFromRay ? dragState.offsetFromRay[0] : 0),
                                intersection[1] + (dragState.offsetFromRay ? dragState.offsetFromRay[1] : 0),
                                intersection[2] + (dragState.offsetFromRay ? dragState.offsetFromRay[2] : 0)
                            ];

                            if (snapEnabled) {
                                nextPos[0] = Math.round(nextPos[0] / snapSize) * snapSize;
                                nextPos[1] = Math.round(nextPos[1] / snapSize) * snapSize;
                                nextPos[2] = Math.round(nextPos[2] / snapSize) * snapSize;
                            }

                            transform.x = nextPos[0];
                            transform.y = nextPos[1];
                            transform.z = nextPos[2];
                        }
                    } else {
                        let nextX = dragState.initialTransform.x + totalDx;
                        let nextY = dragState.initialTransform.y + totalDy;
                        if (snapEnabled) {
                            nextX = Math.round(nextX / snapSize) * snapSize;
                            nextY = Math.round(nextY / snapSize) * snapSize;
                        }
                        transform.x = nextX;
                        transform.y = nextY;
                    }
                }
                break;
            case 'scale-x':
            case 'scale-y':
            case 'scale-z':
                {
                    const screenDx = moveEvent.clientX - dragState.initialMousePos.x;
                    const screenDy = moveEvent.clientY - dragState.initialMousePos.y;
                    const amount = (screenDx - screenDy) / 100;
                    const newScale = { ...transform.localScale };
                    if (dragState.handle === 'scale-x') newScale.x = Math.max(0.01, dragState.initialTransform.scale.x + amount);
                    if (dragState.handle === 'scale-y') newScale.y = Math.max(0.01, dragState.initialTransform.scale.y + amount);
                    if (dragState.handle === 'scale-z') newScale.z = Math.max(0.01, (dragState.initialTransform.scale.z || 1) + amount);
                    transform.localScale = newScale;
                }
                break;
            case 'scale-all':
                {
                    const screenDxTotal = moveEvent.clientX - dragState.initialMousePos.x;
                    const screenDyTotal = moveEvent.clientY - dragState.initialMousePos.y;
                    const avgScaleFactor = 1 + (screenDxTotal - screenDyTotal) / 200;
                    transform.localScale = {
                        x: Math.max(0.01, dragState.initialTransform.scale.x * avgScaleFactor),
                        y: Math.max(0.01, dragState.initialTransform.scale.y * avgScaleFactor),
                        z: Math.max(0.01, (dragState.initialTransform.scale.z || 1) * avgScaleFactor)
                    };
                }
                break;
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
                 uiTransform.position.y -= dy;
                 break;
            case 'ui-move-xy':
                {
                    const parentCanvasMateria = dragState.materia.findAncestorWithComponent(Components.Canvas);
                    if (!uiTransform || !parentCanvasMateria) break;

                    const rectCache = new Map();
                    // 1. Calculate the element's desired new absolute center position
                    const oldRect = getAbsoluteRect(dragState.materia, rectCache);
                    const desiredCenterX = (oldRect.x + oldRect.width / 2) + dx;
                    const desiredCenterY = (oldRect.y + oldRect.height / 2) - dy;

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
            case 'ui-scale-b': uiTransform.size.height += dy; uiTransform.position.y -= dy / 2; break;
            case 'ui-scale-t': uiTransform.size.height -= dy; uiTransform.position.y -= dy / 2; break;
            case 'ui-scale-tr':
                uiTransform.size.width += dx; uiTransform.position.x += dx / 2;
                uiTransform.size.height -= dy; uiTransform.position.y -= dy / 2;
                break;
            case 'ui-scale-tl':
                uiTransform.size.width -= dx; uiTransform.position.x += dx / 2;
                uiTransform.size.height -= dy; uiTransform.position.y -= dy / 2;
                break;
            case 'ui-scale-br':
                uiTransform.size.width += dx; uiTransform.position.x += dx / 2;
                uiTransform.size.height += dy; uiTransform.position.y -= dy / 2;
                break;
            case 'ui-scale-bl':
                uiTransform.size.width -= dx; uiTransform.position.x += dx / 2;
                uiTransform.size.height += dy; uiTransform.position.y -= dy / 2;
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
                        // Axis Y is pointing UP on screen (+Y world)
                        // Moving mouse up (positive world dy) should increase scale.
                        newScale.y += (ldy * 2) / dims.height;
                    }
                    transform.scale = newScale;
                }
                break;
            case 'rotate': {
                const worldMouse = screenToWorld(moveEvent.clientX - dom.sceneCanvas.getBoundingClientRect().left, moveEvent.clientY - dom.sceneCanvas.getBoundingClientRect().top);
                let newRot = Math.atan2(worldMouse.y - transform.y, worldMouse.x - transform.x) * 180 / Math.PI;
                if (snapEnabled) {
                    const snapDeg = 15; // standard rotation snap
                    newRot = Math.round(newRot / snapDeg) * snapDeg;
                }
                transform.rotation = newRot;
                break;
            }
        }

        // --- Collider Gizmo Logic ---
        const boxCollider = dragState.materia.getComponent(Components.BoxCollider2D);
        if (boxCollider && dragState.handle.startsWith('collider-')) {
            const rad = -transform.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            // Mouse deltas in collider local space (+Y UP)
            const localDx = (dx * cos + dy * sin) / (Math.abs(transform.scale.x) || 1);
            const localDy = (dx * sin - dy * cos) / (Math.abs(transform.scale.y) || 1);

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

        // --- Circle Collider Gizmo Logic ---
        const circleCollider = dragState.materia.getComponent(Components.CircleCollider2D);
        if (circleCollider && dragState.handle.startsWith('collider-circle-')) {
            const rad = -transform.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const scaleFac = Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y)) || 1;
            const localDx = (dx * cos + dy * sin) / scaleFac;
            const localDy = (dx * sin - dy * cos) / scaleFac;

            switch (dragState.handle) {
                case 'collider-circle-handle':
                    // Arrastrar desde el borde para cambiar radio
                    circleCollider.radius = Math.max(1, circleCollider.radius + localDx);
                    break;
                case 'collider-circle-center':
                    // Arrastrar centro para cambiar offset
                    circleCollider.offset.x += localDx;
                    circleCollider.offset.y += localDy;
                    break;
            }
        }

        // --- Capsule Collider Gizmo Logic ---
        const capsuleCollider = dragState.materia.getComponent(Components.CapsuleCollider2D);
        if (capsuleCollider && dragState.handle.startsWith('collider-capsule-')) {
            const rad = -transform.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const localDx = (dx * cos + dy * sin) / (Math.abs(transform.scale.x) || 1);
            const localDy = (dx * sin - dy * cos) / (Math.abs(transform.scale.y) || 1);

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
        if (updateScene) updateScene();

        // Broadcast movement
        broadcastUpdate({
            op: 'MOVE',
            id: dragState.materia.id,
            pos: { x: transform.x, y: transform.y }
        });
    };

    const onGizmoDragEnd = () => {
        isDragging = false;
        dragState = {};
        window.removeEventListener('mousemove', onGizmoDrag);
        window.removeEventListener('mouseup', onGizmoDragEnd);
    };

    window.addEventListener('mouseup', e => {
        if (e.button === 2) isNavigating3D = false;
    });

    let rightClickStartTime = 0;
    let rightClickStartPos = { x: 0, y: 0 };

    // Setup event listeners
    const sceneCanvases = [dom.sceneCanvas];
    if (dom.sceneCanvas3d) sceneCanvases.push(dom.sceneCanvas3d);

    sceneCanvases.forEach(canvas => {
        canvas.addEventListener('mousedown', e => {
            if (e.button === 2) {
                isNavigating3D = true;
                rightClickStartTime = performance.now();
                rightClickStartPos = { x: e.clientX, y: e.clientY };
            }
        });

        canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            e.stopPropagation();

            // Prevent context menu if we are navigating the 3D scene
            const heldKeys = ['w', 'a', 's', 'd', 'q', 'e', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            const isHoldingNavKey = heldKeys.some(k => InputManager.getKey(k));

            const timeSinceClick = performance.now() - rightClickStartTime;
            const mouseMoveDist = Math.hypot(e.clientX - rightClickStartPos.x, e.clientY - rightClickStartPos.y);

            // If right click was held for long, moved significantly, or navigation keys are held, it was navigation.
            const isNavigating = isHoldingNavKey || timeSinceClick > 250 || mouseMoveDist > 10;

            if (isNavigating) return;

            const rect = canvas.getBoundingClientRect();
            const canvasPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

            const config = getCurrentProjectConfig();
            const is3D = isProject3D(config);

            let targetId = null;
            if (is3D) {
                const renderer3D = window._Renderer3D;
                if (renderer3D) {
                    targetId = renderer3D.pick(SceneManager.currentScene, null, canvasPos.x, canvasPos.y, { editorCamera: renderer.camera });
                }
            } else {
                targetId = pick2D(canvasPos);
            }

            if (targetId !== null) {
                selectMateria(targetId);
            } else {
                selectMateria(null);
            }

            const menu = document.getElementById('hierarchy-context-menu');
            if (menu && showContextMenuCallback) {
                // We need to set the global project type state for the menu
                const projectType = window.currentProjectConfig?.projectType || '2d';
                const is3DProject = projectType === '3d';

                const updateDisabledState = (el, disabled) => {
                    el.classList.toggle('disabled', disabled);
                    el.style.display = 'block';
                    const children = el.querySelectorAll('li, span, ul');
                    children.forEach(child => child.classList.toggle('disabled', disabled));
                };

                menu.querySelectorAll('.only-3d').forEach(el => updateDisabledState(el, !is3DProject));
                menu.querySelectorAll('.only-2d').forEach(el => updateDisabledState(el, is3DProject));

                // Set context materia for HierarchyWindow actions
                // We rely on editor.js or HierarchyWindow.js to handle the actual context reference if needed,
                // but since we just selected the object, context actions will naturally apply to it.

                showContextMenuCallback(menu, e);
            }
        });
    });

    // Also prevent on containers to be double-safe
    const containers = document.querySelectorAll('.canvas-container');
    containers.forEach(container => {
        container.addEventListener('contextmenu', e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    const toggleGizmosBtn = document.getElementById('btn-toggle-gizmos');
    if (toggleGizmosBtn) {
        toggleGizmosBtn.addEventListener('click', () => {
            showGizmoIcons = !showGizmoIcons;
            toggleGizmosBtn.classList.toggle('active', showGizmoIcons);
            updateScene();
        });
    }

    // --- Drag and Drop Sprite Creation ---
    sceneCanvases.forEach(canvas => {
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow a drop
            canvas.classList.add('drag-over-scene');
        });

        canvas.addEventListener('dragleave', () => {
            canvas.classList.remove('drag-over-scene');
        });

        canvas.addEventListener('drop', async (e) => {
            e.preventDefault();
            canvas.classList.remove('drag-over-scene');

            const rect = canvas.getBoundingClientRect();
            const canvasPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            const worldPos = screenToWorld(canvasPos.x, canvasPos.y);

            // Handle external files from OS
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                let currentDirHandle = getCurrentDirectoryHandle();
                let currentPath = getCurrentDirectoryPath() || 'Assets';

                // Fallback to root Assets if no directory is selected
                if (!currentDirHandle) {
                    try {
                        const projectName = new URLSearchParams(window.location.search).get('project') || 'TestProject';
                        const projectsDir = window.projectsDirHandle || projectsDirHandle;
                        if (!projectsDir) throw new Error("No projects directory handle available.");

                        const projectHandle = await projectsDir.getDirectoryHandle(projectName, { create: true });
                        currentDirHandle = await projectHandle.getDirectoryHandle('Assets', { create: true });
                        currentPath = 'Assets';
                    } catch (err) {
                        console.error("[SceneView] Error al obtener el directorio raíz de Assets:", err);
                    }
                }

                if (currentDirHandle) {
                    for (const file of e.dataTransfer.files) {
                        try {
                            const targetFileHandle = await currentDirHandle.getFileHandle(file.name, { create: true });
                            const writable = await targetFileHandle.createWritable();
                            await writable.write(file);
                            await writable.close();

                            // Instantiate in scene if it's a video or image
                            const lowerName = file.name.toLowerCase();
                            const assetPath = currentPath + '/' + file.name;

                            if (lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || lowerName.endsWith('.ogv')) {
                                // Find existing Canvas or create one
                                let parentCanvas = SceneManager.currentScene.getAllMaterias().find(m => m.getComponent(Components.Canvas));
                                if (!parentCanvas) {
                                    parentCanvas = MateriaFactory.createCanvasObject();
                                }

                                const newMateria = MateriaFactory.createBaseMateria(MateriaFactory.generateUniqueName(file.name), parentCanvas);
                                newMateria.removeComponent(Components.Transform);
                                const uiTransform = new Components.UITransform(newMateria);
                                uiTransform.position = { x: worldPos.x, y: worldPos.y }; // Placeholder position
                                newMateria.addComponent(uiTransform);

                                const videoPlayer = new Components.VideoPlayer(newMateria);
                                await videoPlayer.setSourcePath(assetPath);
                                newMateria.addComponent(videoPlayer);

                                // Initialize size if possible
                                if (videoPlayer.videoWidth > 0) {
                                    videoPlayer.syncSizeToUITransform();
                                }
                            }
                        } catch (err) {
                            console.error("Error al importar archivo desde OS:", err);
                        }
                    }
                    if (updateAssetBrowser) await updateAssetBrowser();
                    console.log("Archivos importados con éxito.");
                }
                return;
            }

            try {
                const dataText = e.dataTransfer.getData('text/plain');
                if (!dataText) return;
                const data = JSON.parse(dataText);

                let newMateria = null;

                if (data.type === 'sprite') {
                    // Create a new Materia at the drop position
                    newMateria = new Materia(data.spriteName);
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
                } else if (data.type === 'Asset' && data.name.endsWith('.ceprefab')) {
                    newMateria = await SceneManager.instantiatePrefabFromPath(data.path, worldPos.x, worldPos.y);
                } else if (data.type === 'Asset' && (data.name.endsWith('.mp4') || data.name.endsWith('.webm') || data.name.endsWith('.ogv'))) {
                    // Find existing Canvas or create one
                    let parentCanvas = SceneManager.currentScene.getAllMaterias().find(m => m.getComponent(Components.Canvas));
                    if (!parentCanvas) {
                        parentCanvas = MateriaFactory.createCanvasObject();
                    }

                    newMateria = MateriaFactory.createBaseMateria(MateriaFactory.generateUniqueName(data.name), parentCanvas);
                    newMateria.removeComponent(Components.Transform);
                    const uiTransform = new Components.UITransform(newMateria);
                    uiTransform.position = { x: worldPos.x, y: worldPos.y };
                    newMateria.addComponent(uiTransform);

                    const videoPlayer = new Components.VideoPlayer(newMateria);
                    await videoPlayer.setSourcePath(data.path);
                    newMateria.addComponent(videoPlayer);

                    // Initialize size if possible
                    if (videoPlayer.videoWidth > 0) {
                        videoPlayer.syncSizeToUITransform();
                    }
                }

                if (newMateria) {
                    // Si el juego está en marcha, inicializar scripts inmediatamente
                    if (window.isGameRunning) {
                        console.log(`[SceneView] Inicializando scripts para nuevo objeto '${newMateria.name}' en tiempo de ejecución.`);
                        const initScriptsRecursive = async (mtr) => {
                            for (const ley of mtr.leyes) {
                                if (ley instanceof Components.CreativeScript) {
                                    await ley.initializeInstance();
                                    if (ley.isInitialized) {
                                        try { ley.start(); } catch(e) {}
                                        try { ley.onEnable(); } catch(e) {}
                                    }
                                } else if (ley instanceof Components.AnimatorController) {
                                    await ley.initialize(window.projectsDirHandle);
                                } else if (ley instanceof Components.Animator) {
                                    if (!mtr.getComponent(Components.AnimatorController)) {
                                        await ley.loadAnimationClip(window.projectsDirHandle);
                                        if (ley.playOnAwake) ley.play();
                                    }
                                } else if (ley instanceof Components.Terreno2D) {
                                    await ley.loadTextures(window.projectsDirHandle);
                                }

                                if (!(ley instanceof Components.CreativeScript) && typeof ley.start === 'function') {
                                    try { await ley.start(); } catch(e) {}
                                }
                            }
                            for (const child of mtr.children) {
                                await initScriptsRecursive(child);
                            }
                        };
                        await initScriptsRecursive(newMateria);
                    }

                    // Refresh UI
                    selectMateria(newMateria);
                    updateInspector();
                }
            } catch (error) {
                console.error("Error al soltar el sprite:", error);
            }
        });
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

        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case 'w': setActiveTool('move'); break;
            case 'e': setActiveTool('rotate'); break;
            case 'r': setActiveTool('scale'); break;
            case 'v': setActiveTool('sculpt'); break;
            case 'm': setActiveTool('multi'); break;
        }
    });

    sceneCanvases.forEach(canvas => {
        canvas.addEventListener('wheel', (event) => {
        event.preventDefault(); // Stop the browser from scrolling the page

        if (!renderer || !renderer.camera) return;

        const config = getCurrentProjectConfig();
        const is3D = isProject3D(config);

        const scrollDelta = event.deltaY;
        const zoomFactor = getPreferences().zoomSpeed || 1.1;

        if (is3D && window.glMatrix) {
            const cam = renderer.camera;
            const glm = window.glMatrix;
            const moveDir = glm.vec3.create();
            moveDir[2] = scrollDelta > 0 ? 1 : -1;

            const rotationQuat = glm.quat.create();
            glm.quat.fromEuler(rotationQuat, cam.rotation.x, cam.rotation.y, 0);

            const rotatedDir = glm.vec3.create();
            glm.vec3.transformQuat(rotatedDir, moveDir, rotationQuat);

            const zoomSpeed = 200; // Physical movement in 3D
            cam.x += rotatedDir[0] * zoomSpeed;
            cam.y += rotatedDir[1] * zoomSpeed;
            cam.z += rotatedDir[2] * zoomSpeed;
        } else {
            if (scrollDelta < 0) { // Zoom in
                renderer.camera.zoom *= zoomFactor;
            } else { // Zoom out
                renderer.camera.zoom /= zoomFactor;
            }
            // Clamp zoom to avoid issues - expanded limits for more flexibility
            renderer.camera.zoom = Math.max(0.001, Math.min(renderer.camera.zoom, 1000.0));
        }
    }, { passive: false });

    canvas.addEventListener('mousedown', (e) => {
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
                        tilemap.activeLayerIndex = tilemap.layers.length - 1;
                        updateInspector();
                    }
                }
            }
            // Exit mode on any click (left or right)
            exitAddLayerMode();
            return;
        }

        // --- Panning Logic (Middle click or Right-click in 2D) ---
        const config = getCurrentProjectConfig();
        const is3D = isProject3D(config);

        // --- Sculpting Logic ---
        if (activeTool === 'sculpt' && e.button === 0 && is3D) {
            const ray = getMouseRay3D(e.clientX, e.clientY);
            const hit = ray ? SceneManager.currentScene.physicsSystem.raycast3D(ray.origin, ray.direction) : null;

            // Only proceed with sculpting if we hit a mesh or terrain
            const isSculptable = hit && hit.materia && (
                hit.materia.getComponent(Components3D.Terreno3D) ||
                hit.materia.getComponent(Components3D.MeshRenderer3D) ||
                hit.materia.getComponent(Components3D.SkinnedMeshRenderer3D)
            );

            if (isSculptable) {
                e.preventDefault();
                e.stopPropagation();

                const sculpt = (event) => {
                    const r = getMouseRay3D(event.clientX, event.clientY);
                    if (!r) return;

                    const h = SceneManager.currentScene.physicsSystem.raycast3D(r.origin, r.direction);
                    if (h && h.materia) {
                        const terrain = h.materia.getComponent(Components3D.Terreno3D);
                        if (terrain) {
                            const localHit = h.localPoint;
                            const tSettings = window.TerrenoEditorWindow?.settings || {};
                            const brushSize = tSettings.brushSize || 50;
                            const brushStrength = tSettings.brushStrength || 50;
                            const activeTab = tSettings.activeTab || 'sculpt';

                            const gridX = ((localHit[0] + terrain.size.x / 2) / terrain.size.x) * terrain.resolution;
                            const gridZ = ((localHit[2] + terrain.size.z / 2) / terrain.size.z) * terrain.resolution;
                            const radius = (brushSize / terrain.size.x) * terrain.resolution;

                            for (let z = Math.floor(gridZ - radius); z <= Math.ceil(gridZ + radius); z++) {
                                for (let x = Math.floor(gridX - radius); x <= Math.ceil(gridX + radius); x++) {
                                    if (x < 0 || x > terrain.resolution || z < 0 || z > terrain.resolution) continue;
                                    const dx = x - gridX; const dz = z - gridZ;

                                    // Shape Check
                                    let dist = 0;
                                    if (tSettings.brushShape === 'square') dist = Math.max(Math.abs(dx), Math.abs(dz));
                                    else dist = Math.sqrt(dx * dx + dz * dz);

                                    if (dist < radius) {
                                        const falloff = tSettings.brushShape === 'mountain' ? Math.pow(1.0 - (dist / radius), 2.0) : (1.0 - (dist / radius));
                                        const power = (brushStrength / 10) * falloff;

                                        if (activeTab === 'sculpt') {
                                            const mode = tSettings.sculptMode;
                                            if (mode === 'elevate') {
                                                const sign = event.shiftKey ? 1 : -1; // Shift to lower
                                                terrain.setHeight(x, z, terrain.getHeight(x, z) + sign * power);
                                            } else if (mode === 'smooth') {
                                                terrain.smoothHeight(x, z, power * 0.1);
                                            } else if (mode === 'hole') {
                                                terrain.setHole(Math.floor(x), Math.floor(z), !event.shiftKey);
                                            }
                                        } else if (activeTab === 'paint') {
                                            const rgb = renderer.hexToRgb(tSettings.paintColor);
                                            terrain.setPaintColor(x, z, rgb[0], rgb[1], rgb[2]);
                                        }
                                    }
                                }
                            }

                            if (activeTab === 'trees' && event.type === 'mousedown') {
                                // Simple Tree Placement
                                const treePrefab = tSettings.treePrefab || 'Assets/DefaultTree.ceprefab';
                                SceneManager.instantiatePrefabFromPath(treePrefab).then(tree => {
                                    if (tree) {
                                        tree.getComponent(Components.Transform).position = hit.point;
                                        tree.setParent(hit.materia, true);
                                    }
                                });
                            } else if (activeTab === 'vegetation') {
                                // Add to grass list
                                terrain.grass.push({
                                    type: tSettings.grassType,
                                    pos: hit.localPoint,
                                    rot: { x: 0, y: Math.random() * 360, z: 0 },
                                    scale: 1.0 + Math.random() * 0.5
                                });
                            }

                            terrain.isDirty = true;
                            return;
                        }

                        const renderer = h.materia.getComponent(Components3D.MeshRenderer3D) || h.materia.getComponent(Components3D.SkinnedMeshRenderer3D);
                        if (renderer && renderer.cpuPositions) {
                            const brushSize = window.TerrenoEditorWindow?.settings?.brushSize || 50;
                            const brushStrength = window.TerrenoEditorWindow?.settings?.brushStrength || 50;
                            const strength = brushStrength / 10;
                            const radius = brushSize;
                            const localHit = h.localPoint;

                            let changed = false;
                            for (let i = 0; i < renderer.cpuPositions.length; i += 3) {
                                const vx = renderer.cpuPositions[i];
                                const vy = renderer.cpuPositions[i+1];
                                const vz = renderer.cpuPositions[i+2];
                                const dx = vx - localHit[0]; const dy = vy - localHit[1]; const dz = vz - localHit[2];
                                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

                                if (dist < radius) {
                                    const falloff = 1.0 - (dist / radius);
                                    renderer.cpuPositions[i] -= r.direction.x * strength * falloff;
                                    renderer.cpuPositions[i+1] -= r.direction.y * strength * falloff;
                                    renderer.cpuPositions[i+2] -= r.direction.z * strength * falloff;
                                    changed = true;
                                }
                            }
                            if (changed) renderer.isDirty = true;
                        }
                    }
                };

                const onSculptMove = (moveEvent) => sculpt(moveEvent);
                const onSculptEnd = () => {
                    window.removeEventListener('mousemove', onSculptMove);
                    window.removeEventListener('mouseup', onSculptEnd);
                };

                window.addEventListener('mousemove', onSculptMove);
                window.addEventListener('mouseup', onSculptEnd);
                sculpt(e);
                return;
            }
        }

        if (e.button === 1 || (e.button === 2 && !is3D)) {
            e.preventDefault();
            canvas.style.cursor = 'grabbing';
            let lastPos = { x: e.clientX, y: e.clientY };

            const onPanMove = (moveEvent) => {
                moveEvent.preventDefault();
                const dx = moveEvent.clientX - lastPos.x;
                const dy = moveEvent.clientY - lastPos.y;
                if (renderer && renderer.camera) {
                    renderer.camera.x -= dx / renderer.camera.effectiveZoom;
                    // In +Y UP, moving mouse down (positive dy) should increase camera Y
                    // so that the world appears to follow the mouse down.
                    renderer.camera.y += dy / renderer.camera.effectiveZoom;
                }
                lastPos = { x: moveEvent.clientX, y: moveEvent.clientY };
            };
            const onPanEnd = (upEvent) => {
                upEvent.preventDefault();
                canvas.style.cursor = 'grab';
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

        // --- Weight Painter Logic (Left-click) ---
        if (e.button === 0 && activeTool === 'weight-painter') {
            e.stopPropagation();
            const wp = window.WeightPainter;
            if (!wp) return;

            const paintStep = (event) => {
                const selectedMateria = getSelectedMateria();
                if (!selectedMateria) return;
                const skeleton = selectedMateria.getComponent(Components.SkeletonRenderer);
                if (!skeleton) return;

                const rect = dom.sceneCanvas.getBoundingClientRect();
                const worldMouse = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);

                wp.paint(worldMouse, skeleton);
                if (updateScene) updateScene(renderer, false);
            };

            paintStep(e);

            const onPaintMove = (moveEvent) => paintStep(moveEvent);
            const onPaintEnd = () => {
                window.removeEventListener('mousemove', onPaintMove);
                window.removeEventListener('mouseup', onPaintEnd);
            };

            window.addEventListener('mousemove', onPaintMove);
            window.addEventListener('mouseup', onPaintEnd);
            return;
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
            const canvasPos = InputManager.getMousePositionInCanvas();

            // Click and Hold for Focus logic
            const clickStartTime = performance.now();
            const startMousePos = { x: e.clientX, y: e.clientY };

            const onPotentialFocusEnd = () => {
                const duration = performance.now() - clickStartTime;
                const dist = Math.hypot(InputManager.getMousePosition().x - startMousePos.x, InputManager.getMousePosition().y - startMousePos.y);
                if (duration > 500 && dist < 10) {
                     focusOnSelectedMateria();
                }
                window.removeEventListener('mouseup', onPotentialFocusEnd);
            };
            window.addEventListener('mouseup', onPotentialFocusEnd);

            // 3D Object Picking
            const config = getCurrentProjectConfig();
            const is3D = isProject3D(config);

            if (!isAddingLayer && activeTool !== 'pan') {
                const hitHandle = checkCameraGizmoHit(canvasPos) || checkGizmoHit(canvasPos) || checkBoxColliderGizmoHit(canvasPos) || checkCircleColliderGizmoHit(canvasPos) || checkCapsuleColliderGizmoHit(canvasPos) || checkUIGizmoHit(canvasPos);

                // Only pick new object if we didn't hit a gizmo handle
                if (!hitHandle) {
                    let pickedId = null;
                    if (is3D) {
                        const renderer3D = window._Renderer3D;
                        if (renderer3D) {
                            pickedId = renderer3D.pick(SceneManager.currentScene, null, canvasPos.x, canvasPos.y, { editorCamera: renderer.camera });
                        }
                    } else {
                        pickedId = pick2D(canvasPos);
                    }

                    if (pickedId !== null) {
                        selectMateria(pickedId);
                    } else {
                        selectMateria(null);
                        return;
                    }
                }
            }

            if (!getSelectedMateria() || activeTool === 'pan') return;

            const hitHandle = checkCameraGizmoHit(canvasPos) || checkGizmoHit(canvasPos) || checkBoxColliderGizmoHit(canvasPos) || checkCircleColliderGizmoHit(canvasPos) || checkCapsuleColliderGizmoHit(canvasPos) || checkUIGizmoHit(canvasPos);

            if (hitHandle) {
                e.stopPropagation();
                isDragging = true;
                const transform = selectedMateria.getComponent(Components.Transform);
                const initialX = transform ? transform.x : 0;
                const initialY = transform ? transform.y : 0;
                const initialZ = transform ? (transform.z || 0) : 0;

                let offsetFromRay = [0, 0, 0];
                let initialU = 0; // Initial distance along axis
                if (is3D && window.glMatrix) {
                    const ray = getMouseRay3D(e.clientX, e.clientY);
                    if (ray) {
                        const glm = window.glMatrix;
                        const p0 = [initialX, initialY, initialZ];

                        if (hitHandle === 'move-xy') {
                            // Calculate offset from ray intersection with move plane
                            const camQ = glm.quat.create();
                            glm.quat.fromEuler(camQ, renderer.camera.rotation.x, renderer.camera.rotation.y, 0);
                            const planeNormal = glm.vec3.fromValues(0, 0, 1);
                            glm.vec3.transformQuat(planeNormal, planeNormal, camQ);

                            const denom = glm.vec3.dot(ray.direction, planeNormal);
                            if (Math.abs(denom) > 1e-6) {
                                const p0_l0 = glm.vec3.create();
                                glm.vec3.subtract(p0_l0, p0, ray.origin);
                                const t = glm.vec3.dot(p0_l0, planeNormal) / denom;
                                const intersection = glm.vec3.create();
                                glm.vec3.scaleAndAdd(intersection, ray.origin, ray.direction, t);
                                glm.vec3.subtract(offsetFromRay, p0, intersection);
                            }
                        } else if (hitHandle.startsWith('move-')) {
                            // Calculate initial 'u' for axis handles
                            const isY = hitHandle === 'move-y';
                            const localAxis = hitHandle === 'move-x' ? [1,0,0] : (isY ? [0,-1,0] : [0,0,1]);
                            const q = glm.quat.create();
                            glm.quat.fromEuler(q, transform.rotationX || 0, transform.rotationY || 0, transform.rotationZ || 0);
                            const worldAxis = glm.vec3.create();
                            glm.vec3.transformQuat(worldAxis, localAxis, q);

                            const v = worldAxis;
                            const q0 = ray.origin;
                            const w = ray.direction;
                            const w1 = glm.vec3.create();
                            glm.vec3.subtract(w1, p0, q0);
                            const a = glm.vec3.dot(v, v);
                            const b = glm.vec3.dot(v, w);
                            const c = glm.vec3.dot(w, w);
                            const d = glm.vec3.dot(v, w1);
                            const e = glm.vec3.dot(w, w1);
                            const denom = a * c - b * b;
                            if (Math.abs(denom) > 1e-6) {
                                initialU = (b * e - c * d) / denom;
                            }
                        }
                    }
                }

                dragState = {
                    handle: hitHandle,
                    materia: selectedMateria,
                    initialTransform: transform ? {
                        x: initialX,
                        y: initialY,
                        z: initialZ,
                        rotation: transform.rotation,
                        scale: { x: transform.scale.x, y: transform.scale.y, z: transform.scale.z || 1 }
                    } : null,
                    initialMouseWorld: screenToWorld(canvasPos.x, canvasPos.y),
                    initialMousePos: { x: e.clientX, y: e.clientY },
                    offsetFromRay: offsetFromRay,
                    initialU: initialU
                };
                lastMousePosition = { x: e.clientX, y: e.clientY };


                // Attach the predefined handlers
                window.addEventListener('mousemove', onGizmoDrag);
                window.addEventListener('mouseup', onGizmoDragEnd);
            }
        }
    });
    });

}

function pick2D(canvasPos) {
    if (!renderer || !SceneManager.currentScene) return null;
    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);

    // Iterate in reverse to pick the topmost object
    const allMaterias = SceneManager.currentScene.getAllMaterias().reverse();

    for (const materia of allMaterias) {
        if (!materia.isActive) continue;

        const transform = materia.getComponent(Components.Transform);
        if (!transform) continue;

        const dims = getMateriaDimensions(materia);
        const w = dims.width * Math.abs(transform.scale.x);
        const h = dims.height * Math.abs(transform.scale.y);

        // Simple AABB hit detection for 2D
        const rad = -transform.rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const lx = (worldMouse.x - transform.x) * cos - (worldMouse.y - transform.y) * sin;
        const ly = (worldMouse.x - transform.x) * sin + (worldMouse.y - transform.y) * cos;

        if (lx >= -w/2 && lx <= w/2 && ly >= -h/2 && ly <= h/2) {
            return materia.id;
        }
    }
    return null;
}

export function enterAddLayerMode() {
    isAddingLayer = true;
    dom.sceneCanvas.style.cursor = 'copy';
}

function exitAddLayerMode() {
    isAddingLayer = false;
    dom.sceneCanvas.style.cursor = 'default';
}

function handle3DCameraNavigation() {
    if (!renderer || !renderer.camera) return;
    const glm = window.glMatrix;
    if (!glm) return;

    const cam = renderer.camera;
    const dt = (typeof getDeltaTime === 'function' ? getDeltaTime() : 0.016) || 0.016;

    const config = getCurrentProjectConfig();
    const is2DLocked = config.viewMode === '2d';

    if (is2DLocked) {
        cam.rotation.x = 0;
        cam.rotation.y = 0;
        cam.rotation.z = 0;

        if (InputManager.getMouseButton(1) || InputManager.getMouseButton(2)) {
            const delta = InputManager.getMouseDelta();
            const moveScale = (cam.z || 500) / 800;
            cam.x -= delta.x * moveScale;
            cam.y += delta.y * moveScale;
        }
        return;
    }

    // Fly Mode active when Right Click is held (ONLY if interaction started on scene canvas)
    const isFlying = InputManager.getMouseButton(2) && isNavigating3D;

    if (isFlying) {
        // Smooth Fly Navigation Speed
        const baseSpeed = 400;
        const speedMultiplier = InputManager.getKey('Shift') ? 4.0 : 1.0;
        const speed = baseSpeed * speedMultiplier * dt;
        const rotSpeed = 0.15;

        // --- 1. Rotation (Mouse Look) ---
        const delta = InputManager.getMouseDelta();
        if (Math.abs(delta.x) < 200 && Math.abs(delta.y) < 200) {
            const prefs = typeof getPreferences === 'function' ? getPreferences() : {};
            const invX = prefs.invertXAxis === true ? -1 : 1;
            const invY = prefs.invertYAxis === true ? -1 : 1;

            cam.rotation.y -= delta.x * rotSpeed * invX;
            cam.rotation.x -= delta.y * rotSpeed * invY;
            cam.rotation.x = Math.max(-89.9, Math.min(89.9, cam.rotation.x));
        }

        // --- 2. FPS-Style Movement (WASD + Arrows, relative to look direction) ---
        const rotX = CarleyMath.mat4Identity();
        const rotY = CarleyMath.mat4Identity();
        CarleyMath.mat4RotationX(rotX, cam.rotation.x);
        CarleyMath.mat4RotationY(rotY, cam.rotation.y);

        const worldRotMat = CarleyMath.mat4Identity();
        CarleyMath.mat4Multiply(worldRotMat, rotY, rotX); // Yaw first, then Pitch for camera world matrix

        // Column 2 (indices 8, 9, 10) is the camera's local backward direction in world space.
        // Therefore, localForward is negative of Column 2.
        const localForward = glm.vec3.fromValues(-worldRotMat[8], -worldRotMat[9], -worldRotMat[10]);
        glm.vec3.normalize(localForward, localForward);

        // Column 0 (indices 0, 1, 2) is the camera's local right direction in world space.
        const localRight = glm.vec3.fromValues(worldRotMat[0], worldRotMat[1], worldRotMat[2]);
        glm.vec3.normalize(localRight, localRight);

        const finalMove = glm.vec3.create();

        // W/S: Move along look direction (localForward)
        if (InputManager.getKey('w') || InputManager.getKey('ArrowUp')) {
            glm.vec3.scaleAndAdd(finalMove, finalMove, localForward, speed);
        }
        if (InputManager.getKey('s') || InputManager.getKey('ArrowDown')) {
            glm.vec3.scaleAndAdd(finalMove, finalMove, localForward, -speed);
        }

        // A/D: Move horizontally along side direction (localRight)
        if (InputManager.getKey('a') || InputManager.getKey('ArrowLeft')) {
            glm.vec3.scaleAndAdd(finalMove, finalMove, localRight, -speed);
        }
        if (InputManager.getKey('d') || InputManager.getKey('ArrowRight')) {
            glm.vec3.scaleAndAdd(finalMove, finalMove, localRight, speed);
        }

        // Q/E: Move vertically in world space (Standard Unity style)
        if (InputManager.getKey('e')) cam.y += speed;
        if (InputManager.getKey('q')) cam.y -= speed;

        // Apply final translation vector to camera position
        cam.x += finalMove[0];
        cam.y += finalMove[1];
        cam.z += finalMove[2];

        dom.sceneCanvas.style.cursor = 'crosshair';
        updateScene();
    } else {
        if (dom.sceneCanvas.style.cursor === 'crosshair') dom.sceneCanvas.style.cursor = 'default';
    }
}

export function focusOnSelectedMateria() {
    const materia = getSelectedMateria();
    if (!materia || !renderer || !renderer.camera) return;

    const transform = materia.getComponent(Components.Transform);
    if (!transform) return;

    const cam = renderer.camera;
    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);

    const C3D = window.Components3D || Components3D;
    const meshRenderer = C3D ? materia.getComponent(C3D.MeshRenderer3D) : null;

    let size = 50;
    if (meshRenderer) {
        // Now using standardized size 1.0 primitives
        size = Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y), Math.abs(transform.scale.z || 1));
    } else {
        const dims = getMateriaDimensions(materia);
        size = Math.max(dims.width * Math.abs(transform.scale.x), dims.height * Math.abs(transform.scale.y));
    }

    if (is3D) {
        // Position camera at a distance relative to size
        const distance = Math.max(150, size * 3.0);
        cam.x = transform.x;
        cam.y = transform.y + (size * 0.4);
        cam.z = (transform.z || 0) + distance;

        // Reset rotation to look at the object
        cam.rotation.x = -15; // Pitch down 15 degrees (+Y UP)
        cam.rotation.y = 0;
    } else {
        cam.x = transform.x;
        cam.y = transform.y;
        // Adjust zoom to fit object
        const targetZoom = Math.max(0.1, Math.min(2.0, 400 / (size || 1)));
        cam.zoom = targetZoom;
    }
    updateScene();
}

export function update() {
    // This will be called from the main editorLoop
    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);

    if (is3D && !window.isGameRunning && getActiveView() === 'scene-content') {
        handle3DCameraNavigation();

        // F key to focus
        if (InputManager.getKeyDown('f')) {
            focusOnSelectedMateria();
        }
    } else {
        handleEditorInteractions();
    }

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

function drawFrustumCullingGizmos(proj = null, view = null, cw = null, ch = null) {
    if (!SceneManager || !renderer) return;
    const scene = SceneManager.currentScene;
    if (!scene) return;

    const allMaterias = scene.getAllMaterias();
    const { ctx } = renderer;

    allMaterias.forEach(materia => {
        if (!materia.isActive) return;
        const cameraComponent = materia.getComponent(Components.Camera);
        if (!cameraComponent) return;

        const transform = materia.getComponent(Components.Transform);
        if (!transform) return;

        // Draw visual "culling distance" sphere or box
        const lodDist = scene.ambiente.optiLODDistance || 10000;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.strokeStyle = 'rgba(0, 255, 100, 0.2)';
        ctx.lineWidth = 1;

        // Draw a simple 3D ring at the LOD distance to visualize the "Optimized Zone"
        for(let a=0; a<Math.PI*2; a+=0.5) {
            const p1 = {
                x: transform.x + Math.cos(a) * lodDist,
                y: transform.y,
                z: transform.z + Math.sin(a) * lodDist
            };
            const p2 = {
                x: transform.x + Math.cos(a+0.5) * lodDist,
                y: transform.y,
                z: transform.z + Math.sin(a+0.5) * lodDist
            };
            const s1 = world3DToScreen(p1, proj, view, cw, ch);
            const s2 = world3DToScreen(p2, proj, view, cw, ch);
            if (s1 && s2) {
                ctx.beginPath();
                ctx.moveTo(s1.x, s1.y);
                ctx.lineTo(s2.x, s2.y);
                ctx.stroke();
            }
        }
        ctx.restore();
    });
}

function drawCameraGizmos(renderer, proj = null, view = null, cw = null, ch = null) {
    if (!SceneManager || !renderer) return;
    const scene = SceneManager.currentScene;
    if (!scene) return;

    const { ctx, canvas } = renderer;
    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);
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
        const glm = window.glMatrix;

        ctx.save();
        ctx.strokeStyle = isSelected ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = is3D ? 2 : 1 / renderer.camera.effectiveZoom;

        if (!is3D) {
            ctx.translate(transform.x, transform.y);
            ctx.rotate(transform.rotation * Math.PI / 180);
            ctx.scale(1, -1);
        }

        const r3d = window._Renderer3D;
        const _proj = proj || r3d?.lastProjectionMatrix;
        const _view = view || r3d?.lastViewMatrix;
        const _cw = cw || r3d?.canvas?.width;
        const _ch = ch || r3d?.canvas?.height;

        if (cameraComponent.projection === 'Orthographic') {
            const size = cameraComponent.orthographicSize;
            const halfHeight = size;
            const halfWidth = size * aspect;

            if (is3D) {
                const z = transform.z || 0;
                const p1 = { x: transform.x - halfWidth, y: transform.y - halfHeight, z };
                const p2 = { x: transform.x + halfWidth, y: transform.y - halfHeight, z };
                const p3 = { x: transform.x + halfWidth, y: transform.y + halfHeight, z };
                const p4 = { x: transform.x - halfWidth, y: transform.y + halfHeight, z };

                const clr = isSelected ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.4)';
                drawLineClipped(ctx, p1, p2, clr, 2, _proj, _view, _cw, _ch);
                drawLineClipped(ctx, p2, p3, clr, 2, _proj, _view, _cw, _ch);
                drawLineClipped(ctx, p3, p4, clr, 2, _proj, _view, _cw, _ch);
                drawLineClipped(ctx, p4, p1, clr, 2, _proj, _view, _cw, _ch);
            } else {
                ctx.beginPath();
                ctx.rect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
                ctx.stroke();
            }

            // --- Draw Interactive Handles (only for selected camera) ---
            if (isSelected && !is3D) {
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

        } else if (is3D && glm) { // 3D Perspective Frustum
            const fovRad = cameraComponent.fov * Math.PI / 180;
            const near = cameraComponent.nearClipPlane;
            const far = Math.min(cameraComponent.farClipPlane, 10000); // Increased limit further for professional feel
            const nearH = Math.tan(fovRad / 2) * near;
            const nearW = nearH * aspect;
            const farH = Math.tan(fovRad / 2) * far;
            const farW = farH * aspect;

            const q = glm.quat.create();
            glm.quat.fromEuler(q, transform.rotationX || 0, transform.rotationY || 0, transform.rotationZ || 0);

            const project = (lx, ly, lz) => {
                const worldPos = glm.vec3.create();
                glm.vec3.transformQuat(worldPos, [lx, ly, -lz], q); // Cameras look towards -Z in many conventions, check ours
                return world3DToScreen({ x: transform.x + worldPos[0], y: transform.y + worldPos[1], z: (transform.z || 0) + worldPos[2] }, _proj, _view, _cw, _ch);
            };

            const projectRaw = (lx, ly, lz) => {
                const worldPos = glm.vec3.create();
                glm.vec3.transformQuat(worldPos, [lx, ly, -lz], q);
                return { x: transform.x + worldPos[0], y: transform.y + worldPos[1], z: (transform.z || 0) + worldPos[2] };
            };

            const n1 = projectRaw(-nearW, nearH, near), n2 = projectRaw(nearW, nearH, near), n3 = projectRaw(nearW, -nearH, near), n4 = projectRaw(-nearW, -nearH, near);
            const f1 = projectRaw(-farW, farH, far), f2 = projectRaw(farW, farH, far), f3 = projectRaw(farW, -farH, far), f4 = projectRaw(-farW, -farH, far);

            const clr = isSelected ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.4)';
            const drawL = (p1, p2) => drawLineClipped(ctx, p1, p2, clr, is3D ? 2 : 1 / renderer.camera.effectiveZoom, _proj, _view, _cw, _ch);

            // Near plane
            drawL(n1, n2); drawL(n2, n3); drawL(n3, n4); drawL(n4, n1);
            // Far plane
            drawL(f1, f2); drawL(f2, f3); drawL(f3, f4); drawL(f4, f1);
            // Connecting lines
            drawL(n1, f1); drawL(n2, f2); drawL(n3, f3); drawL(n4, f4);
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

    // Transform world mouse to tilemap local space (accounting for rotation and scale)
    const relX = worldMouse.x - transform.x;
    const relY = worldMouse.y - transform.y;
    const rad = -transform.rotation * Math.PI / 180;
    const localMouseX = (relX * Math.cos(rad) - relY * Math.sin(rad)) / (transform.scale.x || 1);
    const localMouseY = (relX * Math.sin(rad) + relY * Math.cos(rad)) / (transform.scale.y || 1);

    const layerWidth = width * cellSize.x;
    const layerHeight = height * cellSize.y;

    for (const layer of tilemap.layers) {
        const layerOffsetX = layer.position.x * layerWidth;
        const layerOffsetY = layer.position.y * layerHeight;

        const layerTopLeftX = layerOffsetX - layerWidth / 2;
        const layerTopY = layerOffsetY + layerHeight / 2;

        const col = Math.floor((localMouseX - layerTopLeftX) / cellSize.x);
        // localMouseY is world +Y UP. Row 0 is at layerTopY.
        const row = Math.floor((layerTopY - localMouseY) / cellSize.y);

        if (col >= 0 && col < width && row >= 0 && row < height) {
            ctx.save();
            ctx.translate(transform.x, transform.y);
            ctx.rotate(transform.rotation * Math.PI / 180);
            ctx.lineWidth = 2 / renderer.camera.effectiveZoom;

            const drawCursor = (c, r) => {
                // We draw in +Y UP world space directly
                // In +Y UP world context, strokeRect(x,y,w,h) draws from Y downwards?
                // Actually, if we are in world context (scale(1, -1)), it draws from Y UPWARDS.
                // Because Renderer.js beginWorld: scale(zoom, -zoom).
                const tx = layerTopLeftX + c * cellSize.x;
                const ty = layerTopY - (r + 1) * cellSize.y;
                ctx.fillRect(tx, ty, cellSize.x, cellSize.y);
                ctx.strokeRect(tx, ty, cellSize.x, cellSize.y);
            };

            if (activeTool === 'tile-brush' || activeTool === 'tile-rectangle-fill') {
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
                ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';

                const selectedTiles = getSelectedTile();
                if (selectedTiles && selectedTiles.length > 0) {
                    for (const tile of selectedTiles) {
                        drawCursor(col + tile.offsetX, row + tile.offsetY);
                    }
                } else {
                    drawCursor(col, row);
                }
            } else if (activeTool === 'tile-bucket') {
                ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
                ctx.fillStyle = 'rgba(100, 255, 100, 0.2)';
                drawCursor(col, row);
            } else { // eraser
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                drawCursor(col, row);
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
    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);
    const zoom = camera.effectiveZoom;
    const prefs = getPreferences();
    const isSceneGridVisible = prefs.showSceneGrid;

    const { cellSize } = grid;
    if (cellSize.x <= 0 || cellSize.y <= 0) return;

    ctx.save();
    if (is3D) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Screen Space for overlay
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)';

        const gridRange = 20; // Number of cells around object

        const r3d = window._Renderer3D;
        const proj = r3d?.lastProjectionMatrix;
        const view = r3d?.lastViewMatrix;
        const cw = r3d?.canvas?.width, ch = r3d?.canvas?.height;

        // Use local bounds for the component grid to ensure rotation is applied correctly
        const startX = -(gridRange * cellSize.x);
        const endX = (gridRange * cellSize.x);
        const startY = -(gridRange * cellSize.y);
        const endY = (gridRange * cellSize.y);

        const rad = (transform.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);

        const drawLine3D = (p1World, p2World) => {
            const p1 = world3DToScreen(p1World, proj, view, cw, ch);
            const p2 = world3DToScreen(p2World, proj, view, cw, ch);
            if (p1 && p2) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        };

        const getPt = (lx, ly) => {
            const rx = lx * cos - ly * sin;
            const ry = lx * sin + ly * cos;
            return { x: transform.x + rx, y: transform.y + ry, z: transform.z || 0 };
        };

        for (let x = startX; x <= endX; x += cellSize.x) {
            drawLine3D(getPt(x, startY), getPt(x, endY));
        }
        for (let y = startY; y <= endY; y += cellSize.y) {
            drawLine3D(getPt(startX, y), getPt(endX, y));
        }
    } else {
        const viewLeft = camera.x - (canvas.width / 2 / zoom);
        const viewRight = camera.x + (canvas.width / 2 / zoom);
        // In +Y UP, top has higher Y
        const viewTop = camera.y + (canvas.height / 2 / zoom);
        const viewBottom = camera.y - (canvas.height / 2 / zoom);

        ctx.lineWidth = 1 / zoom;
        ctx.strokeStyle = isSceneGridVisible ? 'rgba(0, 100, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();

        const startX = Math.floor((viewLeft - transform.x) / cellSize.x) * cellSize.x + transform.x;
        const endX = Math.ceil((viewRight - transform.x) / cellSize.x) * cellSize.x + transform.x;
        for (let x = startX; x <= endX; x += cellSize.x) {
            ctx.moveTo(x, viewTop);
            ctx.lineTo(x, viewBottom);
        }

        const startY = Math.floor((viewBottom - transform.y) / cellSize.y) * cellSize.y + transform.y;
        const endY = Math.ceil((viewTop - transform.y) / cellSize.y) * cellSize.y + transform.y;
        for (let y = startY; y <= endY; y += cellSize.y) {
            ctx.moveTo(viewLeft, y);
            ctx.lineTo(viewRight, y);
        }
        ctx.stroke();
    }
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

function getGizmoScale(center, customProj = null, customView = null, cw = null, ch = null) {
    const r3d = window._Renderer3D;
    if (!r3d || !renderer || !renderer.camera) return 1.0;
    const glm = window.glMatrix;

    // Use the actual view matrix for projected distance calculation
    const view = customView || r3d.lastViewMatrix;
    const worldPos = glm.vec4.fromValues(center.x, center.y, center.z || 0, 1.0);
    const viewPos = glm.vec4.create();
    glm.vec4.transformMat4(viewPos, worldPos, view);

    // View-space Z is the distance from camera plane.
    // In our convention, camera looks towards -Z in view space.
    let dist = -viewPos[2];

    // Base scale on distance. 800 is a magic constant for 'normal' size.
    let gizmoScale = Math.abs(dist) / 800;

    // Minimum scale to keep it selectable, and maximum to avoid screen flooding
    return Math.max(0.1, Math.min(gizmoScale, 10.0));
}

function getMateriaAxes(materia) {
    const transform = materia.transform || materia.getComponentByName?.('Transform') || materia.getComponent?.('Transform');
    const glm = window.glMatrix;
    if (!transform) {
        return {
            x: glm.vec3.fromValues(1, 0, 0),
            y: glm.vec3.fromValues(0, 1, 0),
            z: glm.vec3.fromValues(0, 0, 1),
            worldCenter: [0, 0, 0]
        };
    }

    let matrix = transform.worldMatrix;
    if (!matrix) {
        // Build a temporary world matrix from the transform values
        const translationMat = CarleyMath.mat4Identity();
        const rotationMat = CarleyMath.mat4Identity();
        const scaleMat = CarleyMath.mat4Identity();

        const pos = transform.position || { x: transform.x || 0, y: transform.y || 0, z: transform.z || 0 };

        let rot = { x: 0, y: 0, z: 0 };
        if (transform.rotation && typeof transform.rotation === 'object') {
            rot = { x: transform.rotation.x || 0, y: transform.rotation.y || 0, z: transform.rotation.z || 0 };
        } else {
            rot = {
                x: transform.rotationX !== undefined ? transform.rotationX : 0,
                y: transform.rotationY !== undefined ? transform.rotationY : 0,
                z: transform.rotationZ !== undefined ? transform.rotationZ : (transform.rotation || 0)
            };
        }

        const scl = transform.scale || { x: transform.scaleX || 1, y: transform.scaleY || 1, z: transform.scaleZ || 1 };

        CarleyMath.mat4Translation(translationMat, pos);
        CarleyMath.mat4RotationYXZ(rotationMat, rot.x, rot.y, rot.z);
        CarleyMath.mat4Scale(scaleMat, scl);

        matrix = CarleyMath.mat4Identity();
        CarleyMath.mat4Multiply(matrix, translationMat, rotationMat);
        CarleyMath.mat4Multiply(matrix, matrix, scaleMat);
    }

    // Extract basis vectors from world matrix columns
    const xAxis = glm.vec3.fromValues(matrix[0], matrix[1], matrix[2]);
    const yAxis = glm.vec3.fromValues(matrix[4], matrix[5], matrix[6]);
    const zAxis = glm.vec3.fromValues(matrix[8], matrix[9], matrix[10]);

    glm.vec3.normalize(xAxis, xAxis);
    glm.vec3.normalize(yAxis, yAxis);
    glm.vec3.normalize(zAxis, zAxis);

    return { x: xAxis, y: yAxis, z: zAxis, worldCenter: [matrix[12], matrix[13], matrix[14]] };
}

function check3DGizmoHit(canvasPos, materia) {
    const r3d = window._Renderer3D;
    const proj = r3d?.lastProjectionMatrix;
    const view = r3d?.lastViewMatrix;
    const cw = r3d?.canvas?.width, ch = r3d?.canvas?.height;

    const axes = getMateriaAxes(materia);
    const center = { x: axes.worldCenter[0], y: axes.worldCenter[1], z: axes.worldCenter[2] };

    const screenPos = world3DToScreen(center, proj, view, cw, ch);
    if (!screenPos) return null;

    const gizmoScale = getGizmoScale(center, proj, view, cw, ch);
    const hitRadius = 25;
    const gizmoLen = 80 * gizmoScale;

    const checkHandle = (worldAxis) => {
        const axisEnd = { x: center.x + worldAxis[0] * gizmoLen, y: center.y + worldAxis[1] * gizmoLen, z: center.z + worldAxis[2] * gizmoLen };
        const screenEnd = world3DToScreen(axisEnd, proj, view, cw, ch);
        if (!screenEnd) return false;
        const dx = canvasPos.x - screenEnd.x;
        const dy = canvasPos.y - screenEnd.y;
        return Math.hypot(dx, dy) < hitRadius;
    };

    if (activeTool === 'move' || activeTool === 'universal' || activeTool === 'scale') {
        const dx = canvasPos.x - screenPos.x;
        const dy = canvasPos.y - screenPos.y;
        if (Math.hypot(dx, dy) < 20) return activeTool === 'scale' ? 'scale-all' : 'move-xy';

        if (checkHandle(axes.x, 'X')) return activeTool === 'scale' ? 'scale-x' : 'move-x';
        if (checkHandle(axes.y, 'Y')) return activeTool === 'scale' ? 'scale-y' : 'move-y';
        if (checkHandle(axes.z, 'Z')) return activeTool === 'scale' ? 'scale-z' : 'move-z';
    } else if (activeTool === 'rotate') {
        let closestAxis = null;
        let minDistance = 15; // Hit radius
        const radius = 60 * gizmoScale;
        const segments = 16;
        for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                let offset = { x: 0, y: 0, z: 0 };
                if (axisIndex === 0) {
                    offset = { x: 0, y: cos * radius, z: sin * radius };
                } else if (axisIndex === 1) {
                    offset = { x: cos * radius, y: 0, z: sin * radius };
                } else {
                    offset = { x: cos * radius, y: sin * radius, z: 0 };
                }
                const worldOffset = {
                    x: axes.x[0] * offset.x + axes.y[0] * offset.y + axes.z[0] * offset.z,
                    y: axes.x[1] * offset.x + axes.y[1] * offset.y + axes.z[1] * offset.z,
                    z: axes.x[2] * offset.x + axes.y[2] * offset.y + axes.z[2] * offset.z
                };
                const pWorld = { x: center.x + worldOffset.x, y: center.y + worldOffset.y, z: center.z + worldOffset.z };
                const pScreen = world3DToScreen(pWorld, proj, view, cw, ch);
                if (pScreen) {
                    const dist = Math.hypot(canvasPos.x - pScreen.x, canvasPos.y - pScreen.y);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestAxis = axisIndex === 0 ? 'rotate-x' : (axisIndex === 1 ? 'rotate-y' : 'rotate-z');
                    }
                }
            }
        }
        if (closestAxis) return closestAxis;
    }
    return null;
}

function draw3DGizmos(materia, customProj = null, customView = null, customCw = null, customCh = null) {
    const r3d = window._Renderer3D;
    if (!r3d) return;

    const transform = materia.transform || materia.getComponentByName?.('Transform') || materia.getComponent?.('Transform');
    if (!transform) return;

    // Use current rendering matrices for correct projection
    const proj = customProj || r3d.lastProjectionMatrix;
    const view = customView || r3d.lastViewMatrix;
    const cw = customCw || r3d.canvas.width;
    const ch = customCh || r3d.canvas.height;

    const axes = getMateriaAxes(materia);
    const center = { x: axes.worldCenter[0], y: axes.worldCenter[1], z: axes.worldCenter[2] };

    const screenPos = world3DToScreen(center, proj, view, cw, ch);
    if (!screenPos) return;

    const { ctx } = renderer;
    const gizmoScale = getGizmoScale(center, proj, view, cw, ch);

    // GIZMO_SIZE is the line length in world units. It scales with distance to appear constant on screen.
    const GIZMO_SIZE = 80 * gizmoScale;
    // ARROW_SIZE is the handle size in constant screen PIXELS.
    const ARROW_SIZE = 18;

    const prefs = typeof getPreferences === 'function' ? getPreferences() : {};
    const showBlueSkeleton = prefs.showBlueSkeletonGizmo !== false;
    const showSeeThrough = prefs.showSeeThroughGizmo !== false && !showBlueSkeleton;

    console.log(`[SceneView] draw3DGizmos: showBlueSkeleton=${showBlueSkeleton}, showSeeThrough=${showSeeThrough}`);
    if (showBlueSkeleton || showSeeThrough) {
        const C3D = window.Components3D || Components3D;
        console.log(`[SceneView] C3D is: ${C3D ? 'defined' : 'undefined'}`);
        if (C3D) {
            const meshRenderer = materia.getComponent(C3D.MeshRenderer3D) ||
                                 materia.getComponentByName?.('CarleyMeshRenderer3D') ||
                                 materia.getComponent?.('CarleyMeshRenderer3D') ||
                                 materia.getComponentByName?.('CarleySkinnedMeshRenderer3D') ||
                                 materia.getComponent?.('CarleySkinnedMeshRenderer3D');
            console.log(`[SceneView] meshRenderer is: ${meshRenderer ? meshRenderer.constructor.name : 'null/undefined'}`);
            // Unit meshes in WebGL are typically defined from -1 to 1, meaning their local diameter/span is 2.0.
            // Therefore, to match their visual size on screen, we scale the wireframe size by 2.0.
            const scale = { x: transform.scale.x * 2, y: transform.scale.y * 2, z: (transform.scale.z || 1) * 2 };
            const rotation = { x: transform.rotationX || 0, y: transform.rotationY || 0, z: transform.rotationZ || 0 };

            const clr = showBlueSkeleton ? 'rgba(0, 102, 255, 1.0)' : 'rgba(0, 255, 255, 0.9)';
            const clrFallback = showBlueSkeleton ? 'rgba(0, 102, 255, 0.7)' : 'rgba(0, 255, 255, 0.6)';

            console.log(`[SceneView] Drawing with clr=${clr}, scale=${JSON.stringify(scale)}, rotation=${JSON.stringify(rotation)}, center=${JSON.stringify(center)}`);

            if (meshRenderer && meshRenderer.meshType) {
                console.log(`[SceneView] Drawing wireframe for meshType: ${meshRenderer.meshType}`);
                if (meshRenderer.meshType === 'Cube') Gizmos.drawWireCube(ctx, center, scale, rotation, clr, proj, view, cw, ch);
                else if (meshRenderer.meshType === 'Sphere') Gizmos.drawWireSphere(ctx, center, Math.max(scale.x, scale.y, scale.z) * 0.5, rotation, clr, proj, view, cw, ch);
                else if (meshRenderer.meshType === 'Plane') Gizmos.drawWirePlane(ctx, center, { x: scale.x, z: scale.z }, rotation, clr, proj, view, cw, ch);
                else if (meshRenderer.meshType === 'Triangle') Gizmos.drawWireTriangle(ctx, center, { x: scale.x, y: scale.y }, rotation, clr, proj, view, cw, ch);
                else if (meshRenderer.meshType === 'Capsule') Gizmos.drawWireCapsule(ctx, center, Math.max(scale.x, scale.z) * 0.25, scale.y, rotation, clr, proj, view, cw, ch);
                else Gizmos.drawWireCube(ctx, center, scale, rotation, clr, proj, view, cw, ch);
            } else {
                // For any other object, draw a beautiful 3D bounding box overlay based on its scale
                console.log(`[SceneView] Bounding box fallback`);
                const size = scale.x === 2 && scale.y === 2 && scale.z === 2 ? { x: 100, y: 100, z: 100 } : scale;
                Gizmos.drawWireCube(ctx, center, size, rotation, clrFallback, proj, view, cw, ch);
            }
        }
    }

    if (materia.getComponent(Components.Camera)) {
        drawCameraGizmos(renderer, proj, view, cw, ch);
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const drawAxis = (worldAxis, color) => {
        const endPos = { x: center.x + worldAxis[0] * GIZMO_SIZE, y: center.y + worldAxis[1] * GIZMO_SIZE, z: center.z + worldAxis[2] * GIZMO_SIZE };

        // Draw clipped line for the axis stem
        drawLineClipped(ctx, center, endPos, color, 3, proj, view, cw, ch);

        const endScreen = world3DToScreen(endPos, proj, view, cw, ch);
        if (!endScreen) return;

        // Draw arrowhead only if it's not overlapping too much with the center
        const screenDist = Math.hypot(endScreen.x - screenPos.x, endScreen.y - screenPos.y);
        if (screenDist < ARROW_SIZE) return;

        const angle = Math.atan2(endScreen.y - screenPos.y, endScreen.x - screenPos.x);
        ctx.save();
        ctx.translate(endScreen.x, endScreen.y);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        if (activeTool === 'scale') {
            ctx.rect(-ARROW_SIZE/2, -ARROW_SIZE/2, ARROW_SIZE, ARROW_SIZE);
        } else {
            ctx.moveTo(ARROW_SIZE, 0);
            ctx.lineTo(0, -ARROW_SIZE / 2);
            ctx.lineTo(0, ARROW_SIZE / 2);
            ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
    };

    if (activeTool === 'move' || activeTool === 'universal' || activeTool === 'scale') {
        drawAxis(axes.x, '#ff4444'); // X (Red)
        drawAxis(axes.y, '#44ff44'); // Y (Green)
        drawAxis(axes.z, '#4444ff'); // Z (Blue)

        // Center handle
        ctx.fillStyle = activeTool === 'scale' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath(); ctx.arc(screenPos.x, screenPos.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    } else if (activeTool === 'rotate') {
        // Draw 3D rotation circles!
        const drawRotationCircle = (axisIndex, color) => {
            const segments = 40;
            const radius = 60 * gizmoScale;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            let first = true;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                let offset = { x: 0, y: 0, z: 0 };
                if (axisIndex === 0) { // X-axis (Y-Z plane)
                    offset = { x: 0, y: cos * radius, z: sin * radius };
                } else if (axisIndex === 1) { // Y-axis (X-Z plane)
                    offset = { x: cos * radius, y: 0, z: sin * radius };
                } else { // Z-axis (X-Y plane)
                    offset = { x: cos * radius, y: sin * radius, z: 0 };
                }
                const worldOffset = {
                    x: axes.x[0] * offset.x + axes.y[0] * offset.y + axes.z[0] * offset.z,
                    y: axes.x[1] * offset.x + axes.y[1] * offset.y + axes.z[1] * offset.z,
                    z: axes.x[2] * offset.x + axes.y[2] * offset.y + axes.z[2] * offset.z
                };
                const pWorld = { x: center.x + worldOffset.x, y: center.y + worldOffset.y, z: center.z + worldOffset.z };
                const pScreen = world3DToScreen(pWorld, proj, view, cw, ch);
                if (pScreen) {
                    if (first) {
                        ctx.moveTo(pScreen.x, pScreen.y);
                        first = false;
                    } else {
                        ctx.lineTo(pScreen.x, pScreen.y);
                    }
                }
            }
            ctx.stroke();
        };

        drawRotationCircle(0, '#ff4444'); // X (Red)
        drawRotationCircle(1, '#44ff44'); // Y (Green)
        drawRotationCircle(2, '#4444ff'); // Z (Blue)

        // Center dot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath(); ctx.arc(screenPos.x, screenPos.y, 4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

export function drawOverlay(customProj = null, customView = null) {
    // This will be called from updateScene to draw grid/gizmos
    if (!renderer) return;

    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);
    const is3DActive = is3D && config.viewMode !== '2d';

    // Capture matrices at the start of the overlay pass to ensure consistency
    const r3d = window._Renderer3D;
    const proj = customProj || r3d?.lastProjectionMatrix;
    const view = customView || r3d?.lastViewMatrix;
    const cw = r3d?.canvas?.width, ch = r3d?.canvas?.height;

    if (is3D) {
        // Reset 2D transform to Screen Space for 3D-projected gizmos
        renderer.ctx.save();
        renderer.ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
        drawEditorGrid();
    }

    if (!is3DActive) {
        drawComponentGrids();
        drawLayerPlacementPreview();
    }

    // Draw gizmo for the selected object
    if (getSelectedMateria()) {
        drawGizmos(renderer, getSelectedMateria(), proj, view, cw, ch);

        // Project Gyzmo rectangles if in 3D
        if (is3DActive) {
            const gyzmo = getSelectedMateria().getComponent(Components.Gyzmo);
            if (gyzmo) draw3DGyzmoRects(gyzmo, proj, view, cw, ch);
        }
    }

    // Draw gizmos for all cameras in the scene
    drawCameraGizmos(renderer, proj, view, cw, ch);

    // Frustum Visualizer for Optimization Mode
    if (config.optiCameraCulling) {
        drawFrustumCullingGizmos(proj, view, cw, ch);
    }

    if (is3D) {
        drawOrientationGizmo();
        draw3DGrid();
    }

    // Draw Icons (Audio, Camera, etc)
    if (showGizmoIcons) {
        drawGizmoIcons(proj, view, cw, ch);
    }

    if (!is3DActive) {
        // Draw tile painting cursor
        drawTileCursor();

        // Draw tilemap colliders
        drawTilemapColliders(proj, view, cw, ch);

        // Draw terrain colliders
        drawTerrenoColliders(proj, view, cw, ch);

        // Draw physics colliders for selected object
        drawPhysicsGizmos(proj, view, cw, ch);
    }

    draw3DPhysicsGizmos(proj, view, cw, ch);

    if (!is3DActive) {
        // Draw outline for selected Tilemap
        drawTilemapOutline(proj, view, cw, ch);

        // Draw Canvas gizmos
        drawCanvasGizmos();
        drawUIGizmos(renderer, getSelectedMateria());

        drawRaycastGizmos();

        drawTerrainBrushGizmo();
        drawWeightPainterGizmo();

        drawBasicAIGizmos();
    }

    if (is3D) {
        renderer.ctx.restore();
    }
}

function drawOrientationGizmo() {
    const prefs = getPreferences();
    if (prefs.showOrientationGizmo === false) return;

    const { ctx, camera } = renderer;
    if (!camera || !window.glMatrix) return;

    const glm = window.glMatrix;
    const padding = 65;
    const size = 35;
    const centerX = padding; // Moved to TOP LEFT as requested
    const centerY = padding;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const q = glm.quat.create();
    // We want to transform world axes into camera-relative screen space.
    // Invert the camera's world rotation to get the view rotation.
    glm.quat.fromEuler(q, camera.rotation.x, camera.rotation.y, 0);
    glm.quat.invert(q, q);

    // Orientation Compass (+Y is UP)
    const axes = [
        { vec: [1, 0, 0], color: '#ff4444', label: 'X' },
        { vec: [0, 1, 0], color: '#44ff44', label: 'Y' },
        { vec: [0, 0, 1], color: '#4444ff', label: 'Z' },
        { vec: [-1, 0, 0], color: '#882222', label: '-X' },
        { vec: [0, -1, 0], color: '#228822', label: '-Y' },
        { vec: [0, 0, -1], color: '#222288', label: '-Z' }
    ];

    // Project and calculate depth
    const projected = axes.map(a => {
        const rotated = glm.vec3.create();
        glm.vec3.transformQuat(rotated, a.vec, q);
        return { ...a, px: rotated[0], py: rotated[1], pz: rotated[2] };
    });

    // Sort by depth (Z) so closer axes draw over further ones
    projected.sort((a, b) => a.pz - b.pz);

    projected.forEach(a => {
        const endX = centerX + a.px * size;
        const endY = centerY - a.py * size; // Flip Y because screen space is Y-down

        const isNegative = a.label.startsWith('-');

        // Draw line with rounded ends for a polished look
        ctx.strokeStyle = a.color;
        ctx.lineWidth = isNegative ? 1 : 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw small circle at the end (Unity style)
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(endX, endY, isNegative ? 2 : 4, 0, Math.PI * 2);
        ctx.fill();

        if (!isNegative) {
            // Draw label with a small background for better readability
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Push label slightly beyond the axis end
            const labelX = endX + a.px * 12;
            const labelY = endY + a.py * 12;
            ctx.fillText(a.label, labelX, labelY);
        }
    });

    ctx.restore();
}

function drawWeightPainterGizmo() {
    if (activeTool !== 'weight-painter' || !renderer || !window.WeightPainter) return;
    const wp = window.WeightPainter;
    const mousePos = InputManager.getMousePositionInCanvas();
    const worldMouse = screenToWorld(mousePos.x, mousePos.y);
    wp.drawBrush(renderer.ctx, worldMouse, renderer.camera.effectiveZoom);
}

const iconCache = new Map();
function getCachedIcon(path) {
    if (iconCache.has(path)) return iconCache.get(path);
    const img = new Image();
    img.src = path;
    iconCache.set(path, img);
    return img;
}

function drawGizmoIcons(proj = null, view = null, cw = null, ch = null) {
    if (!SceneManager || !renderer || !SceneManager.currentScene) return;

    const { ctx, camera } = renderer;
    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);
    const zoom = camera.effectiveZoom;
    const allMaterias = SceneManager.currentScene.getAllMaterias();

    const BASE_ICON_SIZE = 32;

    allMaterias.forEach(materia => {
        if (!materia.isActive) return;

        const transform = materia.getComponent(Components.Transform);
        if (!transform) return;

        let iconPath = null;
        if (materia.getComponent(Components.AudioSource)) {
            iconPath = 'icons/music.svg';
        } else if (materia.getComponent(Components.Camera)) {
            iconPath = 'icons/camera.svg';
        } else if (materia.getComponent(Components.VideoPlayer)) {
            iconPath = 'icons/video.svg';
        } else if (Components3D && materia.getComponent(Components3D.DirectionalLight3D)) {
            iconPath = 'icons/sparkles.svg';
        } else if (Components3D && materia.getComponent(Components3D.PointLight3D)) {
            iconPath = 'icons/lightbulb.svg';
        } else if (Components3D && materia.getComponent(Components3D.SpotLight3D)) {
            iconPath = 'icons/flashlight.svg';
        }

        if (iconPath) {
            const iconImg = getCachedIcon(iconPath);
            if (iconImg.complete && iconImg.naturalWidth > 0) {
                let screenPos;
                let scale = 1.0;
                if (is3D) {
                    const worldPos = { x: transform.x, y: transform.y, z: transform.z || 0 };
                    screenPos = world3DToScreen(worldPos, proj, view, cw, ch);
                    // Use standard gizmo scale logic to make icons smaller at distance
                    scale = 1.0 / getGizmoScale(worldPos, proj, view, cw, ch);
                    // Limit max size
                    scale = Math.min(1.0, scale);
                } else {
                    screenPos = {
                        x: transform.x,
                        y: transform.y
                    };
                }

                if (screenPos) {
                    ctx.save();
                    ctx.translate(screenPos.x, screenPos.y);
                    ctx.globalAlpha = 0.8;
                    const size = (is3D ? BASE_ICON_SIZE * scale : BASE_ICON_SIZE / zoom);
                    ctx.drawImage(iconImg, -size / 2, -size / 2, size, size);
                    ctx.restore();
                }
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

function draw3DGyzmoRects(gyzmo) {
    const transform = gyzmo.materia.getComponent(Components.Transform);
    if (!transform) return;

    const { ctx } = renderer;

    const r3d = window._Renderer3D;
    const proj = r3d?.lastProjectionMatrix;
    const view = r3d?.lastViewMatrix;
    const cw = r3d?.canvas?.width, ch = r3d?.canvas?.height;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const rotation = {
        x: transform.rotationX || 0,
        y: transform.rotationY || 0,
        z: transform.rotationZ || 0
    };
    const glm = window.glMatrix;
    const q = glm.quat.create();
    glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

    for (const layer of gyzmo.layers) {
        const { x: lx, y: ly, width, height, color } = layer;
        const hw = width / 2;
        const hh = height / 2;

        const getPt = (ox, oy) => {
            const localPos = [(lx + ox) * transform.scale.x, (ly + oy) * transform.scale.y, 0];
            const rotated = glm.vec3.create();
            glm.vec3.transformQuat(rotated, localPos, q);
            return { x: transform.x + rotated[0], y: transform.y + rotated[1], z: (transform.z || 0) + rotated[2] };
        };

        const pts = [getPt(-hw, -hh), getPt(hw, -hh), getPt(hw, hh), getPt(-hw, hh)];
        const clr = color || '#00ff00';

        // Draw edges with clipping
        for (let i = 0; i < 4; i++) {
            drawLineClipped(ctx, pts[i], pts[(i + 1) % 4], clr, 2, proj, view, cw, ch);
        }

        // LENIENT FILL: only if all corners are in front of camera
        const screenPts = pts.map(p => world3DToScreen(p, proj, view, cw, ch));
        if (screenPts.every(p => p !== null)) {
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = clr;
            ctx.beginPath();
            ctx.moveTo(screenPts[0].x, screenPts[0].y);
            for (let i = 1; i < 4; i++) ctx.lineTo(screenPts[i].x, screenPts[i].y);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
    ctx.restore();
}

function drawBasicAIGizmos() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const ai = selectedMateria.getComponent(Components.BasicAI);
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!ai || !transform) return;

    const { ctx, camera } = renderer;
    const zoom = camera.effectiveZoom;

    ctx.save();
    ctx.translate(transform.x, transform.y);

    // Draw detection distance
    ctx.beginPath();
    ctx.arc(0, 0, ai.detectionDistance, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.lineWidth = 1 / zoom;
    ctx.stroke();

    // Draw stop distance
    ctx.beginPath();
    ctx.arc(0, 0, ai.stopDistance, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.3)';
    ctx.setLineDash([]);
    ctx.stroke();

    // Draw steering rays
    if (ai.obstacleAvoidance) {
        // En el editor, los rayos salen en la dirección de rotación actual
        ctx.rotate(transform.rotation * Math.PI / 180);
        const startAngle = -ai.raySpread / 2;
        const step = ai.rayCount > 1 ? ai.raySpread / (ai.rayCount - 1) : 0;

        ctx.lineWidth = 1 / zoom;
        for (let i = 0; i < ai.rayCount; i++) {
            const angle = (startAngle + step * i) * Math.PI / 180;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * ai.rayLength, Math.sin(angle) * ai.rayLength);
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.stroke();
        }
    }

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

function checkCircleColliderGizmoHit(canvasPos) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria || !renderer) return null;

    const circleCollider = selectedMateria.getComponent(Components.CircleCollider2D);
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!circleCollider || !transform) return null;

    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);

    const rad = -transform.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const localMouseX = (worldMouse.x - (transform.x + circleCollider.offset.x)) * cos - (worldMouse.y - (transform.y + circleCollider.offset.y)) * sin;
    const localMouseY = (worldMouse.x - (transform.x + circleCollider.offset.x)) * sin + (worldMouse.y - (transform.y + circleCollider.offset.y)) * cos;

    const radius = circleCollider.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y));
    const handleHitboxSize = 10 / renderer.camera.effectiveZoom;

    // Check center hit
    if (Math.hypot(localMouseX, localMouseY) < handleHitboxSize / 2) {
        return 'collider-circle-center';
    }

    // Check radius handle hit (at local X = radius)
    if (Math.abs(localMouseX - radius) < handleHitboxSize / 2 && Math.abs(localMouseY) < handleHitboxSize / 2) {
        return 'collider-circle-handle';
    }

    return null;
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
        { x: 0, y: -halfHeight, name: 'collider-top' },
        { x: 0, y: halfHeight, name: 'collider-bottom' },
        { x: halfWidth, y: 0, name: 'collider-right' },
        { x: -halfWidth, y: 0, name: 'collider-left' },
        { x: -halfWidth, y: -halfHeight, name: 'collider-tl' },
        { x: halfWidth, y: -halfHeight, name: 'collider-tr' },
        { x: -halfWidth, y: halfHeight, name: 'collider-bl' },
        { x: halfWidth, y: halfHeight, name: 'collider-br' }
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
            { x: 0, y: -height / 2, name: 'collider-capsule-top' },
            { x: 0, y: height / 2, name: 'collider-capsule-bottom' },
            { x: width / 2, y: 0, name: 'collider-capsule-right' },
            { x: -width / 2, y: 0, name: 'collider-capsule-left' }
        ];
    } else { // Horizontal
        handles = [
            { x: width / 2, y: 0, name: 'collider-capsule-right' },
            { x: -width / 2, y: 0, name: 'collider-capsule-left' },
            { x: 0, y: -height / 2, name: 'collider-capsule-top' },
            { x: 0, y: height / 2, name: 'collider-capsule-bottom' }
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

function draw3DPhysicsGizmos(proj = null, view = null, cw = null, ch = null) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!transform) return;

    const C3D = window.Components3D || Components3D;
    if (!C3D) return;

    const { ctx } = renderer;
    const center = { x: transform.x, y: transform.y, z: transform.z || 0 };

    const box = selectedMateria.getComponent(C3D.BoxCollider3D);
    const rotation = { x: transform.rotationX || 0, y: transform.rotationY || 0, z: transform.rotationZ || 0 };

    if (box) {
        const worldSize = {
            x: box.size.x * Math.abs(transform.scale.x),
            y: box.size.y * Math.abs(transform.scale.y),
            z: box.size.z * Math.abs(transform.scale.z)
        };
        const worldCenter = {
            x: center.x + box.offset.x,
            y: center.y + box.offset.y,
            z: center.z + box.offset.z
        };
        Gizmos.drawWireCube(ctx, worldCenter, worldSize, rotation, 'rgba(0, 255, 0, 0.8)', proj, view, cw, ch);
    }

    const sphere = selectedMateria.getComponent(C3D.SphereCollider3D);
    if (sphere) {
        const worldRadius = sphere.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y), Math.abs(transform.scale.z));
        const worldCenter = {
            x: center.x + sphere.offset.x,
            y: center.y + sphere.offset.y,
            z: center.z + sphere.offset.z
        };
        Gizmos.drawWireSphere(ctx, worldCenter, worldRadius, rotation, 'rgba(0, 255, 0, 0.8)', proj, view, cw, ch);
    }

    const capsule = selectedMateria.getComponent(C3D.CapsuleCollider3D);
    if (capsule) {
        const worldRadius = capsule.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.z));
        const worldHeight = capsule.height * Math.abs(transform.scale.y);
        const worldCenter = {
            x: center.x + capsule.offset.x,
            y: center.y + capsule.offset.y,
            z: center.z + capsule.offset.z
        };
        Gizmos.drawWireCapsule(ctx, worldCenter, worldRadius, worldHeight, rotation, 'rgba(0, 255, 0, 0.8)', proj, view, cw, ch);
    }

    const plane = selectedMateria.getComponent(C3D.PlaneCollider3D);
    if (plane) {
        const worldCenter = {
            x: center.x + plane.offset.x,
            y: center.y + plane.offset.y,
            z: center.z + plane.offset.z
        };
        Gizmos.drawWirePlane(ctx, worldCenter, { x: 500, z: 500 }, rotation, 'rgba(0, 255, 0, 0.5)', proj, view, cw, ch);
    }
}

function drawPhysicsGizmos(proj = null, view = null, cw = null, ch = null) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const transform = selectedMateria.getComponent(Components.Transform);
    if (!transform) return;

    const { ctx, camera } = renderer;
    if (!ctx || !camera) return;

    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);

    // Helper for 3D projected lines
    const strokeRect3D = (cx, cy, w, h, z, rot) => {
        const hw = w / 2;
        const hh = h / 2;
        const rad = rot * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);

        const getPt = (lx, ly) => {
            const rx = lx * cos - ly * sin;
            const ry = lx * sin + ly * cos;
            return world3DToScreen({ x: cx + rx, y: cy + ry, z }, proj, view, cw, ch);
        };

        const p1 = getPt(-hw, -hh), p2 = getPt(hw, -hh), p3 = getPt(hw, hh), p4 = getPt(-hw, hh);
        if (p1 && p2 && p3 && p4) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
            ctx.closePath(); ctx.stroke();
        }
    };

    // Draw BoxCollider2D
    const boxCollider = selectedMateria.getComponent(Components.BoxCollider2D);
    if (boxCollider) {
        const width = boxCollider.size.x * transform.scale.x;
        const height = boxCollider.size.y * transform.scale.y;
        const centerX = transform.x + boxCollider.offset.x;
        const centerY = transform.y + boxCollider.offset.y;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = is3D ? 2 : 2 / camera.effectiveZoom;

        if (is3D) {
            strokeRect3D(centerX, centerY, width, height, transform.z || 0, transform.rotation);
        } else {
            ctx.translate(centerX, centerY);
            ctx.rotate(transform.rotation * Math.PI / 180);
            ctx.scale(1, -1);
            ctx.strokeRect(-width / 2, -height / 2, width, height);
        }
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
        ctx.scale(1, -1);

        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 2 / camera.effectiveZoom;
        ctx.setLineDash([]);
        drawCapsulePath(ctx, width, height, capsuleCollider.direction);
        ctx.stroke();

        const handleSize = 8 / camera.effectiveZoom;
        const halfHandle = handleSize / 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';

        let handles = (capsuleCollider.direction === 'Vertical')
            ? [{ x: 0, y: -height / 2 }, { x: 0, y: height / 2 }, { x: width / 2, y: 0 }, { x: -width / 2, y: 0 }]
            : [{ x: width / 2, y: 0 }, { x: -width / 2, y: 0 }, { x: 0, y: -height / 2 }, { x: 0, y: height / 2 }];

        handles.forEach(handle => ctx.fillRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize));

        ctx.restore();
    }


    // Draw CircleCollider2D
    const circleCollider = selectedMateria.getComponent(Components.CircleCollider2D);
    if (circleCollider) {
        const radius = circleCollider.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y));
        const centerX = transform.x + circleCollider.offset.x;
        const centerY = transform.y + circleCollider.offset.y;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(transform.rotation * Math.PI / 180);
        ctx.scale(1, -1);

        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 2 / camera.effectiveZoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        const handleSize = 8 / camera.effectiveZoom;
        const halfHandle = handleSize / 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';

        // Central Handle
        ctx.fillRect(-halfHandle, -halfHandle, handleSize, handleSize);
        // Radius Handle
        ctx.fillRect(radius - halfHandle, -halfHandle, handleSize, handleSize);

        ctx.restore();
    }
}


function drawTilemapOutline(proj = null, view = null, cw = null, ch = null) {
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
    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);
    const { cellSize } = grid;
    const { width, height } = tilemap;

    const layerWidth = width * cellSize.x;
    const layerHeight = height * cellSize.y;

    if (is3D) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;

        const drawRect3D = (x, y, w, h) => {
            const hw = w / 2;
            const hh = h / 2;

            // Apply object rotation to the corners locally before adding world position
            const rad = (transform.rotation || 0) * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);

            const getCorner = (lx, ly) => {
                const rx = lx * cos - ly * sin;
                const ry = lx * sin + ly * cos;
                return world3DToScreen({ x: x + rx, y: y + ry, z: transform.z || 0 }, proj, view, cw, ch);
            };

            const p1 = getCorner(-hw, -hh);
            const p2 = getCorner(hw, -hh);
            const p3 = getCorner(hw, hh);
            const p4 = getCorner(-hw, hh);

            if (p1 && p2 && p3 && p4) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
                ctx.closePath();
                ctx.stroke();
            }
        };

        for (const layer of tilemap.layers) {
            // offsetX/Y are local to the transform center
            const localX = layer.position.x * layerWidth;
            const localY = layer.position.y * layerHeight;

            // In 3D pass, we need to apply world position correctly
            const worldX = transform.x + localX;
            const worldY = transform.y + localY;
            drawRect3D(worldX, worldY, layerWidth, layerHeight);
        }
    } else {
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation * Math.PI / 180);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2 / camera.effectiveZoom;

        for (const layer of tilemap.layers) {
            const offsetX = layer.position.x * layerWidth;
            const offsetY = layer.position.y * layerHeight;
            // Draw layer bounds in +Y UP space
            ctx.strokeRect(offsetX - layerWidth / 2, offsetY - layerHeight / 2, layerWidth, layerHeight);
        }
        ctx.restore();
    }
}

function drawTerrenoColliders(proj = null, view = null, cw = null, ch = null) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const collider = selectedMateria.getComponent(Components.TerrenoCollider2D);
    const transform = selectedMateria.getComponent(Components.Transform);

    if (!collider || !transform) return;

    if (collider.isDirty) {
        collider.generate();
    }

    const { ctx, camera } = renderer;
    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);

    const drawLine3D = (p1World, p2World) => {
        const p1 = world3DToScreen(p1World, proj, view, cw, ch);
        const p2 = world3DToScreen(p2World, proj, view, cw, ch);
        if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    };

    const drawRect3D = (cx, cy, w, h) => {
        const hw = w / 2, hh = h / 2;
        const rad = (transform.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const getPt = (lx, ly) => {
            const rx = lx * cos - ly * sin;
            const ry = lx * sin + ly * cos;
            return { x: transform.x + rx, y: transform.y + ry, z: transform.z || 0 };
        };
        const p1 = getPt(cx - hw, cy - hh), p2 = getPt(cx + hw, cy - hh), p3 = getPt(cx + hw, cy + hh), p4 = getPt(cx - hw, cy + hh);
        drawLine3D(p1, p2); drawLine3D(p2, p3); drawLine3D(p3, p4); drawLine3D(p4, p1);
    };

    ctx.save();
    if (!is3D) {
        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation * Math.PI / 180);
        ctx.scale(transform.scale.x, transform.scale.y);
    }

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = is3D ? 2 : 2 / camera.effectiveZoom;
    if (!is3D) ctx.setLineDash([4 / camera.effectiveZoom, 4 / camera.effectiveZoom]);

    // Draw based on mode to avoid visual clutter from old data
    if (collider.mode === 'Rectangles') {
        for (const rect of collider.generatedColliders) {
            if (is3D) {
                drawRect3D(rect.x, rect.y, rect.width, rect.height);
            } else {
                ctx.strokeRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
            }
        }
    } else if (collider.mode === 'Polygon') {
        const polysToDraw = (collider.debugPolygons && collider.debugPolygons.length > 0)
            ? collider.debugPolygons
            : collider.generatedPolygons;

        if (polysToDraw) {
            for (const poly of polysToDraw) {
                if (poly.vertices && poly.vertices.length > 2) {
                    if (is3D) {
                        const rad = (transform.rotation || 0) * Math.PI / 180;
                        const cos = Math.cos(rad), sin = Math.sin(rad);
                        for (let i = 0; i < poly.vertices.length; i++) {
                            const v1 = poly.vertices[i];
                            const v2 = poly.vertices[(i + 1) % poly.vertices.length];
                            const p1 = {
                                x: transform.x + (v1.x * cos - v1.y * sin),
                                y: transform.y + (v1.x * sin + v1.y * cos),
                                z: transform.z || 0
                            };
                            const p2 = {
                                x: transform.x + (v2.x * cos - v2.y * sin),
                                y: transform.y + (v2.x * sin + v2.y * cos),
                                z: transform.z || 0
                            };
                            drawLine3D(p1, p2);
                        }
                    } else {
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
    }

    ctx.restore();
}

function drawTilemapColliders(proj = null, view = null, cw = null, ch = null) {
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
    const config = getCurrentProjectConfig();
    const is3D = isProject3D(config);
    const { cellSize } = grid;

    const drawColliderRect = (rx, ry, rw, rh) => {
        if (is3D) {
            // Tiles in Tilemap are local to the Tilemap center.
            // We need to apply rotation manually since we are in screen-space overlay
            const rad = (transform.rotation || 0) * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);

            const getPt = (lx, ly) => {
                const rx_loc = lx * cos - ly * sin;
                const ry_loc = lx * sin + ly * cos;
                return world3DToScreen({ x: transform.x + rx_loc, y: transform.y + ry_loc, z: transform.z || 0 }, proj, view, cw, ch);
            };

            const p1 = getPt(rx, ry), p2 = getPt(rx + rw, ry), p3 = getPt(rx + rw, ry + rh), p4 = getPt(rx, ry + rh);
            if (p1 && p2 && p3 && p4) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
                ctx.closePath(); ctx.stroke();
            }
        } else {
            // In 2D, the context is already translated to transform.x, transform.y
            ctx.strokeRect(rx, ry, rw, rh);
        }
    };

    ctx.save();
    if (!is3D) {
        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation * Math.PI / 180);
        ctx.scale(transform.scale.x, transform.scale.y);
    }

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = is3D ? 2 : 2 / camera.effectiveZoom;
    if (!is3D) ctx.setLineDash([6 / camera.effectiveZoom, 4 / camera.effectiveZoom]);

    const layerWidth = tilemap.width * cellSize.x;
    const layerHeight = tilemap.height * cellSize.y;

    for (let i = 0; i < tilemap.layers.length; i++) {
        const layer = tilemap.layers[i];
        if (!collider.useAllLayers && i !== collider.sourceLayerIndex) continue;

        const rects = collider.getMeshForLayer(i);
        const layerOffsetX = layer.position.x * layerWidth;
        const layerOffsetY = layer.position.y * layerHeight;
        const layerTopLeftX = layerOffsetX - layerWidth / 2;
        const layerTopLeftY = layerOffsetY + layerHeight / 2;

        const layerTopY = layerOffsetY + layerHeight / 2;

        for (const rect of rects) {
            // rect coordinates are relative to the Tilemap center (local)
            const rectX = layerTopLeftX + rect.col * cellSize.x;
            // Row 0 is Top (+Y). Bottom Y of rect = TopY - (row + height) * cellSize
            const rectY = layerTopY - (rect.row + rect.height) * cellSize.y;
            const rectWidth = rect.width * cellSize.x;
            const rectHeight = rect.height * cellSize.y;
            drawColliderRect(rectX, rectY, rectWidth, rectHeight);
        }
    }
    ctx.restore();
}

function bucketFill(layer, col, row, replacementTile, width, height) {
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

        if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;

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
        return;
    }

    let grid = tilemapMateria.getComponent(Components.Grid);
    if (!grid && tilemapMateria.parent) {
        grid = (typeof tilemapMateria.parent.getComponent === 'function')
            ? tilemapMateria.parent.getComponent(Components.Grid)
            : SceneManager.currentScene.findMateriaById(tilemapMateria.parent)?.getComponent(Components.Grid);
    }

    if (!grid) {
        return;
    }

    const { cellSize } = grid;
    const { width, height } = tilemap;
    const rect = dom.sceneCanvas.getBoundingClientRect();
    const canvasPos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);

    // Transform world mouse to tilemap local space (accounting for rotation)
    const relX = worldMouse.x - transform.x;
    const relY = worldMouse.y - transform.y;
    const rad = -transform.rotation * Math.PI / 180;
    const localMouseX = (relX * Math.cos(rad) - relY * Math.sin(rad)) / (transform.scale.x || 1);
    const localMouseY = (relX * Math.sin(rad) + relY * Math.cos(rad)) / (transform.scale.y || 1);

    const layerWidth = width * cellSize.x;
    const layerHeight = height * cellSize.y;

    // --- Logic for Eraser ---
    if (activeTool === 'tile-eraser') {
        let erasedSomething = false;
        let lastCoord = null;

        tilemap.layers.forEach(l => {
            const coords = getCoordsInLayer(l);
            const c = coords.col;
            const r = coords.row;

            if (c >= 0 && c < width && r >= 0 && r < height) {
                const key = `${c},${r}`;
                if (l.tileData.has(key)) {
                    l.tileData.delete(key);
                    erasedSomething = true;
                }
                lastCoord = { col: c, row: r };
            }
        });

        if (lastCoord) {
            if (lastCoord.col === lastPaintedCoords.col && lastCoord.row === lastPaintedCoords.row && !erasedSomething) return;
            lastPaintedCoords = lastCoord;
        }

        if (erasedSomething) {
            tilemapRenderer.setDirty();
            const collider = tilemapMateria.getComponent(Components.TilemapCollider2D);
            if (collider) collider.isDirty = true;
        }
        return;
    }

    // --- Logic for Painting (Brush/Bucket) ---
    let layer = null;
    let col = -1;
    let row = -1;

    // Helper to calculate coords in a specific layer
    const getCoordsInLayer = (l) => {
        const layerOffsetX = l.position.x * layerWidth;
        const layerOffsetY = l.position.y * layerHeight;
        const layerTopLeftX = layerOffsetX - layerWidth / 2;
        const layerTopY = layerOffsetY + layerHeight / 2;
        return {
            col: Math.floor((localMouseX - layerTopLeftX) / cellSize.x),
            row: Math.floor((layerTopY - localMouseY) / cellSize.y)
        };
    };

    // 1. Try active layer first
    const activeL = tilemap.layers[tilemap.activeLayerIndex];
    if (activeL) {
        const coords = getCoordsInLayer(activeL);
        if (coords.col >= 0 && coords.col < width && coords.row >= 0 && coords.row < height) {
            layer = activeL;
            col = coords.col;
            row = coords.row;
        }
    }

    // 2. If not over active layer, find which layer the mouse is over
    if (!layer) {
        for (let i = 0; i < tilemap.layers.length; i++) {
            if (i === tilemap.activeLayerIndex) continue;
            const l = tilemap.layers[i];
            const coords = getCoordsInLayer(l);
            if (coords.col >= 0 && coords.col < width && coords.row >= 0 && coords.row < height) {
                layer = l;
                col = coords.col;
                row = coords.row;
                // Switch active layer automatically for better feedback
                tilemap.activeLayerIndex = i;
                if (updateInspector) updateInspector();
                break;
            }
        }
    }

    if (layer) {
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
                } else {
                    return;
                }
            } else if (activeTool === 'tile-bucket') {
                const selectedTiles = getSelectedTile();
                if (selectedTiles && selectedTiles.length > 0) {
                    const tileToPaint = selectedTiles[0];
                    bucketFill(layer, col, row, tileToPaint, width, height);

                    if (tileToPaint.type === 'animation' && !tilemapMateria.getComponent(Components.Animator)) {
                        tilemapMateria.addComponent(new Components.Animator(tilemapMateria));
                        updateInspector();
                    }
                }
            }

            lastPaintedCoords = { col, row };
            tilemapRenderer.setDirty();

            // After painting, find the collider and mark it dirty
            const collider = tilemapMateria.getComponent(Components.TilemapCollider2D);
            if (collider) {
                collider.isDirty = true;
            }

            return;
        }
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

function draw3DGrid() {
    const prefs = getPreferences();
    if (!prefs.showSceneGrid) return;

    const { ctx, camera } = renderer;
    if (!camera) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Screen Space

    // Infinite grid is now handled by Renderer3D shader.
    // This function can remain as a placeholder or draw auxiliary editor lines.

    ctx.restore();
}
