// --- Module for Scene View Interactions and Gizmos ---

// Dependencies from editor.js
let dom;
let renderer;
let gizmoContext; // NEW: 2D context for drawing gizmos
let InputManager;
let getSelectedMateria;
let selectMateria;
let updateInspector;
let Components;
let updateScene;
let getActiveView;
let SceneManager;

// Module State
let activeTool = 'move';
let isDragging = false;
let lastMousePosition = { x: 0, y: 0 };
let dragState = {};

// --- Core Functions ---

function screenToWorld(screenX, screenY) {
    if (!renderer || !renderer.camera) return { x: 0, y: 0 };
    const worldX = (screenX - renderer.canvas.width / 2) / renderer.camera.zoom + renderer.camera.x;
    const worldY = (screenY - renderer.canvas.height / 2) / renderer.camera.zoom + renderer.camera.y;
    return { x: worldX, y: worldY };
}

function checkGizmoHit(canvasPos) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria || !renderer || !renderer.camera) return null;

    const transform = selectedMateria.getComponent(Components.Transform);
    if (!transform) return null;

    const centerX = transform.x;
    const centerY = transform.y;

    const zoom = renderer.camera.zoom;
    const gizmoSize = 60 / zoom;
    const handleHitboxSize = 12 / zoom;
    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);

    switch (activeTool) {
        case 'move':
            const squareHitboxSize = 10 / zoom;
            if (Math.abs(worldMouse.x - centerX) < squareHitboxSize / 2 && Math.abs(worldMouse.y - centerY) < squareHitboxSize / 2) return 'move-xy';
            if (Math.abs(worldMouse.y - centerY) < handleHitboxSize / 2 && worldMouse.x > centerX && worldMouse.x < centerX + gizmoSize) return 'move-x';
            if (Math.abs(worldMouse.x - centerX) < handleHitboxSize / 2 && worldMouse.y > centerY && worldMouse.y < centerY + gizmoSize) return 'move-y'; // Note: Y is inverted in 2D canvas vs world
            break;
        case 'rotate':
            const radius = gizmoSize * 0.6;
            const dist = Math.sqrt(Math.pow(worldMouse.x - centerX, 2) + Math.pow(worldMouse.y - centerY, 2));
            if (Math.abs(dist - radius) < handleHitboxSize / 2) return 'rotate';
            break;
        case 'scale':
            // Simplified scale hit detection for now
            const scaleHandleSize = 15 / zoom;
            if (Math.abs(worldMouse.x - (centerX + gizmoSize)) < scaleHandleSize/2 && Math.abs(worldMouse.y - centerY) < scaleHandleSize/2) return 'scale-x';
            if (Math.abs(worldMouse.x - centerX) < scaleHandleSize/2 && Math.abs(worldMouse.y - (centerY + gizmoSize)) < scaleHandleSize/2) return 'scale-y';
            break;
    }
    return null;
}

function handleGizmoDrag() {
    if (!dragState.materia || !renderer.camera) return;

    const transform = dragState.materia.getComponent(Components.Transform);
    const currentMousePos = InputManager.getMousePosition();
    const dx = (currentMousePos.x - lastMousePosition.x) / renderer.camera.zoom;
    const dy = (currentMousePos.y - lastMousePosition.y) / renderer.camera.zoom;

    switch (dragState.handle) {
        case 'move-x': transform.x += dx; break;
        case 'move-y': transform.y += dy; break;
        case 'move-xy': transform.x += dx; transform.y += dy; break;
        case 'rotate':
            const worldMouse = screenToWorld(currentMousePos.x, currentMousePos.y);
            const angle = Math.atan2(worldMouse.y - transform.y, worldMouse.x - transform.x) * 180 / Math.PI;
            transform.rotation = angle;
            break;
        case 'scale-x': transform.scale.x += dx / 100; break;
        case 'scale-y': transform.scale.y += dy / 100; break;
    }

    lastMousePosition = { ...currentMousePos };
    updateInspector();
}

function handleEditorInteractions() {
    if (!renderer || !renderer.camera) return;

    if (isDragging) {
        handleGizmoDrag();
    }

    const scrollDelta = InputManager.getScrollDelta();
    if (scrollDelta !== 0 && getActiveView() === 'scene-content') {
        const zoomFactor = 1.1;
        if (scrollDelta > 0) {
            renderer.camera.zoom /= zoomFactor;
        } else {
            renderer.camera.zoom *= zoomFactor;
        }
        renderer.camera.zoom = Math.max(0.1, Math.min(renderer.camera.zoom, 20.0));
    }
}

function applyCameraTransform(ctx, camera) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
}

function drawEditorGrid(ctx, camera) {
    const GRID_SIZE = 50;
    if (!camera) return;
    const zoom = camera.zoom;

    ctx.save();
    applyCameraTransform(ctx, camera);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1 / zoom;

    const viewLeft = camera.x - (ctx.canvas.width / 2 / zoom);
    const viewRight = camera.x + (ctx.canvas.width / 2 / zoom);
    const viewTop = camera.y - (ctx.canvas.height / 2 / zoom);
    const viewBottom = camera.y + (ctx.canvas.height / 2 / zoom);

    const startX = Math.floor(viewLeft / GRID_SIZE) * GRID_SIZE;
    const endX = Math.ceil(viewRight / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(viewTop / GRID_SIZE) * GRID_SIZE;
    const endY = Math.ceil(viewBottom / GRID_SIZE) * GRID_SIZE;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += GRID_SIZE) {
        ctx.moveTo(x, viewTop);
        ctx.lineTo(x, viewBottom);
    }
    for (let y = startY; y <= endY; y += GRID_SIZE) {
        ctx.moveTo(viewLeft, y);
        ctx.lineTo(viewRight, y);
    }
    ctx.stroke();
    ctx.restore();
}

function drawGizmos(ctx, camera, materia) {
    if (!materia || !camera) return;
    const transform = materia.getComponent(Components.Transform);
    if (!transform) return;

    const zoom = camera.zoom;
    const GIZMO_SIZE = 60 / zoom;
    const HANDLE_THICKNESS = 2 / zoom;
    const ARROW_HEAD_SIZE = 8 / zoom;
    const centerX = transform.x;
    const centerY = transform.y;

    ctx.save();
    applyCameraTransform(ctx, camera);

    // ... (rest of gizmo drawing logic using ctx)
    ctx.lineWidth = HANDLE_THICKNESS;

    // Y-Axis (Green)
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY + GIZMO_SIZE);
    ctx.stroke();

    // X-Axis (Red)
    ctx.strokeStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + GIZMO_SIZE, centerY);
    ctx.stroke();

    ctx.restore();
}

function drawCameraGizmos(ctx, camera) {
    if (!SceneManager || !camera) return;
    const scene = SceneManager.currentScene;
    if (!scene) return;

    const allMaterias = scene.getAllMaterias();
    const aspect = ctx.canvas.width / ctx.canvas.height;

    ctx.save();
    applyCameraTransform(ctx, camera);

    allMaterias.forEach(materia => {
        if (!materia.isActive) return;
        const cameraComponent = materia.getComponent(Components.Camera);
        if (!cameraComponent) return;

        const transform = materia.getComponent(Components.Transform);
        if (!transform) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation * Math.PI / 180);

        const size = cameraComponent.orthographicSize;
        const halfHeight = size;
        const halfWidth = size * aspect;
        ctx.beginPath();
        ctx.rect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
        ctx.stroke();

        ctx.restore();
    });
    ctx.restore();
}

// --- Public API ---
export function getActiveTool() { return activeTool; }
export function setActiveTool(toolName) {
    activeTool = toolName;
    const toolActiveBtn = document.getElementById('tool-active');
    const activeBtnInDropdown = document.getElementById(`tool-${toolName}`);

    document.querySelectorAll('.tool-dropdown-content .toolbar-btn').forEach(btn => btn.classList.remove('active'));
    if (activeBtnInDropdown) activeBtnInDropdown.classList.add('active');

    if (toolActiveBtn && activeBtnInDropdown) {
        toolActiveBtn.innerHTML = activeBtnInDropdown.innerHTML.split(' ')[0];
        toolActiveBtn.title = activeBtnInDropdown.title;
    }
}

export function initialize(dependencies) {
    dom = dependencies.dom;
    renderer = dependencies.renderer;
    gizmoContext = dependencies.gizmoContext;
    InputManager = dependencies.InputManager;
    getSelectedMateria = dependencies.getSelectedMateria;
    selectMateria = dependencies.selectMateria;
    updateInspector = dependencies.updateInspector;
    Components = dependencies.Components;
    updateScene = dependencies.updateScene;
    getActiveView = dependencies.getActiveView;
    SceneManager = dependencies.SceneManager;

    // The main canvas for WebGL rendering should handle input
    const inputCanvas = dom.sceneCanvas;

    inputCanvas.addEventListener('contextmenu', e => e.preventDefault());
    inputCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 1 || e.button === 2) {
            e.preventDefault();
            inputCanvas.style.cursor = 'grabbing';
            let lastPos = { x: e.clientX, y: e.clientY };
            const onPanMove = (moveEvent) => {
                const dx = moveEvent.clientX - lastPos.x;
                const dy = moveEvent.clientY - lastPos.y;
                if (renderer && renderer.camera) {
                    renderer.camera.x -= dx / renderer.camera.zoom;
                    renderer.camera.y -= dy / renderer.camera.zoom;
                }
                lastPos = { x: moveEvent.clientX, y: moveEvent.clientY };
            };
            const onPanEnd = () => {
                inputCanvas.style.cursor = 'grab';
                window.removeEventListener('mousemove', onPanMove);
                window.removeEventListener('mouseup', onPanEnd);
            };
            window.addEventListener('mousemove', onPanMove);
            window.addEventListener('mouseup', onPanEnd);
            return;
        }
        if (e.button === 0) {
            // Gizmo hit detection needs to use mouse position relative to the canvas
            const rect = inputCanvas.getBoundingClientRect();
            const canvasPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            const hitHandle = checkGizmoHit(canvasPos);
            if (hitHandle) {
                isDragging = true;
                dragState = { handle: hitHandle, materia: getSelectedMateria() };
                lastMousePosition = { x: e.clientX, y: e.clientY };
                e.stopPropagation();
            }
        }
    });
    window.addEventListener('mouseup', () => { isDragging = false; dragState = {}; });

    document.getElementById('tool-move').addEventListener('click', () => setActiveTool('move'));
    document.getElementById('tool-pan').addEventListener('click', () => setActiveTool('pan'));
    document.getElementById('tool-scale').addEventListener('click', () => setActiveTool('scale'));
    document.getElementById('tool-rotate').addEventListener('click', () => setActiveTool('rotate'));
}

export function update() {
    handleEditorInteractions();
}

export function drawOverlay(ctx, camera) {
    if (!ctx || !camera) return;
    drawEditorGrid(ctx, camera);
    if (getSelectedMateria()) {
        drawGizmos(ctx, camera, getSelectedMateria());
    }
    drawCameraGizmos(ctx, camera);
    drawLightGizmos(ctx, camera);
}

function drawLightGizmos(ctx, camera) {
    if (!SceneManager || !camera) return;
    const scene = SceneManager.currentScene;
    if (!scene) return;

    const allLights = scene.getAllMaterias().filter(m => m.hasComponent(Components.Light));

    ctx.save();
    applyCameraTransform(ctx, camera);

    allLights.forEach(materia => {
        if (!materia.isActive) return;
        const light = materia.getComponent(Components.Light);
        const transform = materia.getComponent(Components.Transform);

        ctx.save();
        ctx.translate(transform.x, transform.y);

        if (light.type === 'Point') {
            // Draw range circle
            ctx.strokeStyle = 'rgba(255, 255, 100, 0.5)';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.beginPath();
            ctx.arc(0, 0, light.range, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (light.type === 'Directional') {
            // Draw arrow
            ctx.rotate(light.direction * Math.PI / 180);
            ctx.strokeStyle = 'rgba(255, 255, 100, 0.8)';
            ctx.lineWidth = 2 / camera.zoom;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(50 / camera.zoom, 0);
            ctx.lineTo(40 / camera.zoom, -10 / camera.zoom);
            ctx.moveTo(50 / camera.zoom, 0);
            ctx.lineTo(40 / camera.zoom, 10 / camera.zoom);
            ctx.stroke();
        } else if (light.type === 'Polygon' && getSelectedMateria() === materia) {
            ctx.strokeStyle = 'rgba(255, 100, 255, 0.9)';
            ctx.lineWidth = 2 / camera.zoom;
            ctx.beginPath();
            light.vertices.forEach((v, i) => {
                if (i === 0) {
                    ctx.moveTo(v.x, v.y);
                } else {
                    ctx.lineTo(v.x, v.y);
                }
            });
            if (light.vertices.length > 1) {
                ctx.closePath();
            }
            ctx.stroke();

            // Draw handles
            light.vertices.forEach(v => {
                ctx.beginPath();
                ctx.arc(v.x, v.y, 5 / camera.zoom, 0, 2 * Math.PI);
                ctx.fillStyle = 'magenta';
                ctx.fill();
            });
        }

        ctx.restore();
    });

    ctx.restore();

    // Draw icons separately so they are not affected by rotation/scale
    ctx.save();
    applyCameraTransform(ctx, camera);
    allLights.forEach(materia => {
        if (!materia.isActive) return;
        const light = materia.getComponent(Components.Light);
        const transform = materia.getComponent(Components.Transform);
        if (light.type === 'Point') {
            ctx.font = `${24 / camera.zoom}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💡', transform.x, transform.y);
        }
    });
    ctx.restore();
}
