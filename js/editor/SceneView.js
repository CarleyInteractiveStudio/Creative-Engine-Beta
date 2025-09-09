// --- Module for Scene View Interactions and Gizmos ---

// Dependencies from editor.js
let dom;
let renderer;
let InputManager;
let getSelectedMateria;
let selectMateria;
let updateInspector;
let Components;

// Module State
let activeTool = 'move'; // 'move', 'rotate', 'scale', 'pan'
let isDragging = false;
let isPanning = false;
let lastMousePosition = { x: 0, y: 0 };
let dragState = {}; // To hold info about the current drag operation

// --- Core Functions ---

function screenToWorld(screenX, screenY) {
    if (!renderer || !renderer.camera) return { x: 0, y: 0 };
    const worldX = (screenX - renderer.canvas.width / 2) / renderer.camera.effectiveZoom + renderer.camera.x;
    const worldY = (screenY - renderer.canvas.height / 2) / -renderer.camera.effectiveZoom + renderer.camera.y;
    return { x: worldX, y: worldY };
}

function checkGizmoHit(canvasPos) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria || !renderer) return null;

    const transform = selectedMateria.getComponent(Components.Transform);
    if (!transform) return null;

    const boxCollider = selectedMateria.getComponent(Components.BoxCollider);
    const width = (boxCollider ? boxCollider.width : 100) * transform.scale.x;
    const height = (boxCollider ? boxCollider.height : 100) * transform.scale.y;
    const centerX = transform.x + width / 2;
    const centerY = transform.y - height / 2;

    const zoom = renderer.camera.effectiveZoom;
    const gizmoSize = 60 / zoom;
    const handleHitboxSize = 12 / zoom;
    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);

    const checkHit = (targetX, targetY) => {
        return Math.abs(worldMouse.x - targetX) < handleHitboxSize / 2 && Math.abs(worldMouse.y - targetY) < handleHitboxSize / 2;
    };

    switch (activeTool) {
        case 'move':
            const planeOffset = gizmoSize * 0.2;
            const planeSize = gizmoSize * 0.3;
            if (worldMouse.x > centerX + planeOffset && worldMouse.x < centerX + planeOffset + planeSize &&
                worldMouse.y > centerY + planeOffset && worldMouse.y < centerY + planeOffset + planeSize) {
                return 'move-xy';
            }

            if (checkHit(centerX, centerY)) return 'move-xy';
            if (Math.abs(worldMouse.y - centerY) < handleHitboxSize / 2 && worldMouse.x > centerX && worldMouse.x < centerX + gizmoSize + handleHitboxSize) return 'move-x';
            if (Math.abs(worldMouse.x - centerX) < handleHitboxSize / 2 && worldMouse.y > centerY && worldMouse.y < centerY + gizmoSize + handleHitboxSize) return 'move-y';
            break;
        case 'rotate':
            const radius = gizmoSize * 0.6;
            const dist = Math.sqrt(Math.pow(worldMouse.x - centerX, 2) + Math.pow(worldMouse.y - centerY, 2));
            if (Math.abs(dist - radius) < handleHitboxSize / 2) return 'rotate';
            break;
        case 'scale':
            {
                const rad = transform.rotation * Math.PI / 180;
                const cos = Math.cos(-rad);
                const sin = Math.sin(-rad);
                const localMouseX = (worldMouse.x - centerX) * cos - (worldMouse.y - centerY) * sin;
                const localMouseY = (worldMouse.x - centerX) * sin + (worldMouse.y - centerY) * cos;

                const hx = width / 2;
                const hy = height / 2;
                const handleHitboxSizeLocal = 12 / zoom;

                const handles = [
                    { x: -hx, y: hy, name: 'scale-tl' },
                    { x: hx, y: hy, name: 'scale-tr' },
                    { x: hx, y: -hy, name: 'scale-br' },
                    { x: -hx, y: -hy, name: 'scale-bl' },
                ];

                for (const handle of handles) {
                    if (Math.abs(localMouseX - handle.x) < handleHitboxSizeLocal / 2 && Math.abs(localMouseY - handle.y) < handleHitboxSizeLocal / 2) {
                        return handle.name;
                    }
                }
            }
            break;
    }
    return null;
}

function handleGizmoDrag() {
    if (!dragState.materia) return;

    const transform = dragState.materia.getComponent(Components.Transform);
    const currentMousePos = InputManager.getMousePosition();
    const dx = (currentMousePos.x - lastMousePosition.x) / renderer.camera.effectiveZoom;
    const dy = (currentMousePos.y - lastMousePosition.y) / -renderer.camera.effectiveZoom;

    switch (dragState.handle) {
        case 'move-x':
            transform.x += dx;
            break;
        case 'move-y':
            transform.y += dy;
            break;
        case 'move-xy':
            transform.x += dx;
            transform.y += dy;
            break;
        case 'rotate':
            {
                const boxCollider = dragState.materia.getComponent(Components.BoxCollider);
                const width = (boxCollider ? boxCollider.width : 100) * transform.scale.x;
                const height = (boxCollider ? boxCollider.height : 100) * transform.scale.y;
                const centerX = transform.x + width / 2;
                const centerY = transform.y - height / 2;

                const worldMouse = screenToWorld(currentMousePos.x, currentMousePos.y);
                const angle = Math.atan2(worldMouse.y - centerY, worldMouse.x - centerX) * 180 / Math.PI;
                transform.rotation = angle;
            }
            break;
        case 'scale-tr':
        case 'scale-tl':
        case 'scale-br':
        case 'scale-bl':
            {
                const boxCollider = dragState.materia.getComponent(Components.BoxCollider);
                const width = (boxCollider ? boxCollider.width : 100) * transform.scale.x;
                const height = (boxCollider ? boxCollider.height : 100) * transform.scale.y;
                const centerX = transform.x + width / 2;
                const centerY = transform.y - height / 2;

                const worldMouse = screenToWorld(currentMousePos.x, currentMousePos.y);
                const rad = -transform.rotation * Math.PI / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const localMouseX = (worldMouse.x - centerX) * cos - (worldMouse.y - centerY) * sin;
                const localMouseY = (worldMouse.x - centerX) * sin + (worldMouse.y - centerY) * cos;

                const unscaledWidth = (dragState.unscaledWidth || 100);
                const unscaledHeight = (dragState.unscaledHeight || 100);

                let newScaleX = Math.abs(localMouseX / (unscaledWidth / 2)) || 0.01;
                let newScaleY = Math.abs(localMouseY / (unscaledHeight / 2)) || 0.01;

                transform.scale.x = newScaleX;
                transform.scale.y = newScaleY;
            }
            break;
    }

    lastMousePosition = currentMousePos;
    updateInspector();
}

function handleEditorInteractions() {
    if (!renderer || !renderer.camera) return;

    if (isDragging) {
        handleGizmoDrag();
    }

    // Pan logic
    if (isPanning) {
        const currentMousePosition = InputManager.getMousePosition();
        const dx = currentMousePosition.x - lastMousePosition.x;
        const dy = currentMousePosition.y - lastMousePosition.y;

        renderer.camera.x -= dx / renderer.camera.effectiveZoom;
        renderer.camera.y -= dy / renderer.camera.effectiveZoom;

        lastMousePosition = currentMousePosition;
        // The main loop will call updateScene, so this immediate call might be redundant
        // but can provide smoother feedback.
        if (typeof updateScene === 'function') {
            updateScene(renderer, false);
        }
    }

    // Zoom logic
    const scrollDelta = InputManager.getScrollDelta();
    if (scrollDelta !== 0 && getActiveView() === 'scene-content') {
        renderer.camera.zoom(scrollDelta > 0 ? 1.1 : 0.9);
        if (typeof updateScene === 'function') {
            updateScene(renderer, false);
        }
    }
}

function drawEditorGrid() {
    const GRID_SIZE = 50;
    const { ctx, camera, canvas } = renderer;
    if (!camera) return;

    const zoom = camera.effectiveZoom;
    const scaledGridSize = GRID_SIZE * zoom;

    // Don't draw if grid lines are too close or too far
    if (scaledGridSize < 10) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1 / zoom;

    // Calculate world coordinates of the view boundaries
    const viewLeft = camera.x - (canvas.width / 2 / zoom);
    const viewRight = camera.x + (canvas.width / 2 / zoom);
    const viewTop = camera.y - (canvas.height / 2 / zoom);
    const viewBottom = camera.y + (canvas.height / 2 / zoom);

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

function drawGizmos() {
    // Logic to draw transform gizmos for the selected materia
}


// --- Public API ---

export function getActiveTool() {
    return activeTool;
}

export function setActiveTool(toolName) {
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
    console.log(`Herramienta activa: ${activeTool}`);
}

export function initialize(dependencies) {
    dom = dependencies.dom;
    renderer = dependencies.renderer;
    InputManager = dependencies.InputManager;
    getSelectedMateria = dependencies.getSelectedMateria;
    selectMateria = dependencies.selectMateria;
    updateInspector = dependencies.updateInspector;
    Components = dependencies.Components;
    const updateScene = dependencies.updateScene;
    const getActiveView = dependencies.getActiveView;

    // Setup event listeners
    dom.sceneCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            const selectedMateria = getSelectedMateria();
            if (selectedMateria && activeTool !== 'pan') {
                const canvasPos = InputManager.getMousePositionInCanvas();
                const hitHandle = checkGizmoHit(canvasPos);
                if (hitHandle) {
                    isDragging = true;
                    dragState = { handle: hitHandle, materia: selectedMateria };
                    lastMousePosition = InputManager.getMousePosition();

                    if (hitHandle.startsWith('scale-')) {
                        const transform = selectedMateria.getComponent(Components.Transform);
                        const boxCollider = selectedMateria.getComponent(Components.BoxCollider);
                        dragState.unscaledWidth = (boxCollider ? boxCollider.width : 100);
                        dragState.unscaledHeight = (boxCollider ? boxCollider.height : 100);
                    }
                    e.stopPropagation();
                    return;
                }
            }
        }
        if (e.button === 2 || (e.button === 0 && activeTool === 'pan')) {
            isPanning = true;
            lastMousePosition = InputManager.getMousePosition();
            dom.sceneCanvas.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            dragState = {};
        }
        if (isPanning) {
            isPanning = false;
            dom.sceneCanvas.style.cursor = 'grab';
        }
    });

    document.getElementById('tool-move').addEventListener('click', () => setActiveTool('move'));
    document.getElementById('tool-pan').addEventListener('click', () => setActiveTool('pan'));
    document.getElementById('tool-scale').addEventListener('click', () => setActiveTool('scale'));
    document.getElementById('tool-rotate').addEventListener('click', () => setActiveTool('rotate'));
}

export function update() {
    // This will be called from the main editorLoop
    handleEditorInteractions();
}

export function drawOverlay() {
    // This will be called from updateScene to draw grid/gizmos
    if (!renderer) return;
    drawEditorGrid();
    if (getSelectedMateria()) {
        // drawGizmos(renderer, getSelectedMateria());
    }
}
