// --- Module for Scene View Interactions and Gizmos ---

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

// Module State
let activeTool = 'move'; // 'move', 'rotate', 'scale', 'pan'
let isDragging = false;
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

    const checkHit = (targetX, targetY) => {
        return Math.abs(worldMouse.x - targetX) < handleHitboxSize / 2 && Math.abs(worldMouse.y - targetY) < handleHitboxSize / 2;
    };

    const selectedLight = selectedMateria.getComponent(Components.Light);
    if (selectedLight && selectedLight.type === 'Area' && selectedLight.shape === 'Custom') {
        const lightTransform = selectedMateria.getComponent(Components.Transform);
        const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);
        const handleHitboxSize = 12 / zoom;
        const size = selectedLight.range || 1;

        for (let i = 0; i < selectedLight.vertices.length; i++) {
            const vert = selectedLight.vertices[i];
            // Vertex position in world space
            const worldVertX = lightTransform.x + vert.x * size;
            const worldVertY = lightTransform.y + vert.y * size;

            if (Math.abs(worldMouse.x - worldVertX) < handleHitboxSize / 2 && Math.abs(worldMouse.y - worldVertY) < handleHitboxSize / 2) {
                return `light-vertex-${i}`;
            }
        }
    }


    switch (activeTool) {
        case 'move':
            // Central square hit detection
            const squareHitboxSize = 10 / zoom;
            if (Math.abs(worldMouse.x - centerX) < squareHitboxSize / 2 && Math.abs(worldMouse.y - centerY) < squareHitboxSize / 2) {
                return 'move-xy';
            }

            // Axis arrows hit detection
            if (Math.abs(worldMouse.y - centerY) < handleHitboxSize / 2 && worldMouse.x > centerX && worldMouse.x < centerX + gizmoSize) return 'move-x';
            if (Math.abs(worldMouse.x - centerX) < handleHitboxSize / 2 && worldMouse.y < centerY && worldMouse.y > centerY - gizmoSize) return 'move-y';
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

                const boxCollider = selectedMateria.getComponent(Components.BoxCollider);
                const width = (boxCollider ? boxCollider.width : 100) * transform.scale.x;
                const height = (boxCollider ? boxCollider.height : 100) * transform.scale.y;

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
    const dy = (currentMousePos.y - lastMousePosition.y) / renderer.camera.effectiveZoom;

    if (dragState.handle.startsWith('light-vertex-')) {
        const light = dragState.materia.getComponent(Components.Light);
        if (light) {
            const index = parseInt(dragState.handle.split('-')[2], 10);
            const size = light.range || 1;
            if (light.vertices[index]) {
                // We divide by size to keep the vertex position relative/normalized
                light.vertices[index].x += dx / size;
                light.vertices[index].y += dy / size;
            }
        }
    }

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

    lastMousePosition = { ...currentMousePos };
    updateInspector();
}

function handleEditorInteractions() {
    if (!renderer || !renderer.camera) return;

    if (isDragging) {
        handleGizmoDrag();
    }

    // Pan logic has been moved to a direct event handler on mousedown.

    // Zoom logic
    const scrollDelta = InputManager.getScrollDelta();
    if (scrollDelta !== 0 && getActiveView() === 'scene-content') {
        const zoomFactor = 1.1;
        if (scrollDelta > 0) {
            renderer.camera.zoom /= zoomFactor;
        } else {
            renderer.camera.zoom *= zoomFactor;
        }

        // Clamp zoom to avoid issues
        renderer.camera.zoom = Math.max(0.1, Math.min(renderer.camera.zoom, 20.0));

        if (typeof updateScene === 'function') {
            updateScene(renderer, false);
        }
    }
}

function drawEditorGrid() {
    const GRID_SIZE = 50;
    if (!renderer.gl || !renderer.camera) return;

    const { camera, canvas } = renderer;
    const zoom = camera.effectiveZoom;
    const scaledGridSize = GRID_SIZE * zoom;
    if (scaledGridSize < 10) return;

    const viewLeft = camera.x - (canvas.width / 2 / zoom);
    const viewRight = camera.x + (canvas.width / 2 / zoom);
    const viewTop = camera.y - (canvas.height / 2 / zoom);
    const viewBottom = camera.y + (canvas.height / 2 / zoom);

    const startX = Math.floor(viewLeft / GRID_SIZE) * GRID_SIZE;
    const endX = Math.ceil(viewRight / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(viewTop / GRID_SIZE) * GRID_SIZE;
    const endY = Math.ceil(viewBottom / GRID_SIZE) * GRID_SIZE;

    const vertices = [];
    for (let x = startX; x <= endX; x += GRID_SIZE) {
        vertices.push(x, viewTop, x, viewBottom);
    }
    for (let y = startY; y <= endY; y += GRID_SIZE) {
        vertices.push(viewLeft, y, viewRight, y);
    }

    const projectionMatrix = MathUtils.createMat4();
    const halfW = (canvas.width / 2) / zoom;
    const halfH = (canvas.height / 2) / zoom;
    MathUtils.ortho(projectionMatrix, -halfW, halfW, -halfH, halfH, -1, 100);
    MathUtils.translateMat4(projectionMatrix, projectionMatrix, [-camera.x, -camera.y, 0]);

    const modelViewMatrix = MathUtils.createMat4(); // Identity for grid

    renderer.drawLines(vertices, [0.2, 0.2, 0.2, 1.0], projectionMatrix, modelViewMatrix);
}

function drawGizmos(renderer, materia) {
    if (!materia || !renderer.gl) return;

    const transform = materia.getComponent(Components.Transform);
    if (!transform) return;

    const { camera, canvas } = renderer;
    const zoom = camera.effectiveZoom;

    const projectionMatrix = MathUtils.createMat4();
    const halfW = (canvas.width / 2) / zoom;
    const halfH = (canvas.height / 2) / zoom;
    MathUtils.ortho(projectionMatrix, -halfW, halfH, -halfH, halfH, -1, 100);
    MathUtils.translateMat4(projectionMatrix, projectionMatrix, [-camera.x, -camera.y, 0]);

    const modelViewMatrix = MathUtils.createMat4();
    MathUtils.translateMat4(modelViewMatrix, modelViewMatrix, [transform.x, transform.y, 0]);

    const GIZMO_SIZE = 60 / zoom;
    const ARROW_HEAD_SIZE = 8 / zoom;

    switch (activeTool) {
        case 'move':
            const x_axis = [0, 0, GIZMO_SIZE, 0];
            const y_axis = [0, 0, 0, GIZMO_SIZE];
            // For now, arrows will be simple lines. A full implementation would use triangles.
            renderer.drawLines(x_axis, [1, 0, 0, 1], projectionMatrix, modelViewMatrix);
            renderer.drawLines(y_axis, [0, 1, 0, 1], projectionMatrix, modelViewMatrix);
            break;
        case 'rotate':
            const circle = [];
            const segments = 32;
            const radius = GIZMO_SIZE * 0.8;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                circle.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
            renderer.drawLineLoop(circle, [0, 0, 1, 1], projectionMatrix, modelViewMatrix);
            break;
    }
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
    updateScene = dependencies.updateScene;
    getActiveView = dependencies.getActiveView;

    // Setup event listeners
    dom.sceneCanvas.addEventListener('contextmenu', e => e.preventDefault());

    dom.sceneCanvas.addEventListener('mousedown', (e) => {
        // --- Panning Logic (Middle or Right-click) ---
        // This uses a self-contained set of event listeners for the drag operation.
        if (e.button === 1 || e.button === 2) {
            e.preventDefault(); // Prevent default middle-click/context-menu actions
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
            return; // Stop processing to avoid conflicts
        }

        // --- Gizmo Dragging Logic (Left-click) ---
        if (e.button === 0) {
            const selectedMateria = getSelectedMateria();
            if (selectedMateria && activeTool !== 'pan') {
                const canvasPos = InputManager.getMousePositionInCanvas();
                const hitHandle = checkGizmoHit(canvasPos);
                if (hitHandle) {
                    isDragging = true;
                    dragState = { handle: hitHandle, materia: selectedMateria };
                    lastMousePosition = { ...InputManager.getMousePosition() };

                    if (hitHandle.startsWith('scale-')) {
                        const transform = selectedMateria.getComponent(Components.Transform);
                        const boxCollider = selectedMateria.getComponent(Components.BoxCollider);
                        dragState.unscaledWidth = (boxCollider ? boxCollider.width : 100);
                        dragState.unscaledHeight = (boxCollider ? boxCollider.height : 100);
                    }
                    e.stopPropagation();
                }
            }
        }
    });

    // This listener only needs to handle the end of a gizmo drag now.
    window.addEventListener('mouseup', (e) => {
        if (isDragging) {
            isDragging = false;
            dragState = {};
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

function drawCameraGizmos(renderer) {
    if (!SceneManager || !renderer.gl) return;

    const scene = SceneManager.currentScene;
    if (!scene) return;

    const { camera, canvas } = renderer;
    const allMaterias = scene.getAllMaterias();
    const aspect = canvas.width / canvas.height;

    const projectionMatrix = MathUtils.createMat4();
    const halfW = (canvas.width / 2) / camera.effectiveZoom;
    const halfH = (canvas.height / 2) / camera.effectiveZoom;
    MathUtils.ortho(projectionMatrix, -halfW, halfH, -halfH, halfH, -1, 100);
    MathUtils.translateMat4(projectionMatrix, projectionMatrix, [-camera.x, -camera.y, 0]);

    allMaterias.forEach(materia => {
        if (!materia.isActive) return;
        const cameraComponent = materia.getComponent(Components.Camera);
        if (!cameraComponent) return;
        const transform = materia.getComponent(Components.Transform);
        if (!transform) return;

        const modelViewMatrix = MathUtils.createMat4();
        MathUtils.translateMat4(modelViewMatrix, modelViewMatrix, [transform.x, transform.y, 0]);
        MathUtils.rotateMat4(modelViewMatrix, modelViewMatrix, transform.rotation * Math.PI / 180, [0, 0, 1]);

        if (cameraComponent.projection === 'Orthographic') {
            const size = cameraComponent.orthographicSize;
            const halfHeight = size;
            const halfWidth = size * aspect;
            const vertices = [ -halfWidth, -halfHeight, halfWidth, -halfHeight, halfWidth, halfHeight, -halfWidth, halfHeight ];
            renderer.drawLineLoop(vertices, [0.8, 0.8, 1, 1], projectionMatrix, modelViewMatrix);
        }
    });
}

function drawLightGizmos(renderer) {
    if (!SceneManager || !renderer.gl) return;
    const scene = SceneManager.currentScene;
    if (!scene) return;

    const { camera, canvas } = renderer;
    const allLights = scene.getAllMaterias().filter(m => m.getComponent(Components.Light));

    const projectionMatrix = MathUtils.createMat4();
    const halfW = (canvas.width / 2) / camera.effectiveZoom;
    const halfH = (canvas.height / 2) / camera.effectiveZoom;
    MathUtils.ortho(projectionMatrix, -halfW, halfH, -halfH, halfH, -1, 100);
    MathUtils.translateMat4(projectionMatrix, projectionMatrix, [-camera.x, -camera.y, 0]);

    allLights.forEach(materia => {
        const light = materia.getComponent(Components.Light);
        const transform = materia.getComponent(Components.Transform);
        if (!light || !transform) return;

        const modelViewMatrix = MathUtils.createMat4();
        MathUtils.translateMat4(modelViewMatrix, modelViewMatrix, [transform.x, transform.y, 0]);

        const color = [1, 1, 0, 1]; // Yellow for gizmos

        switch (light.type) {
            case 'Point':
                const circle = [];
                const segments = 32;
                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    circle.push(Math.cos(angle) * light.range, Math.sin(angle) * light.range);
                }
                renderer.drawLineLoop(circle, color, projectionMatrix, modelViewMatrix);
                break;
        }
    });
}

export function drawOverlay() {
    // This will be called from updateScene to draw grid/gizmos
    if (!renderer) return;
    drawEditorGrid();

    // Draw gizmo for the selected object
    if (getSelectedMateria()) {
        drawGizmos(renderer, getSelectedMateria());
    }

    // Draw gizmos for all cameras in the scene
    drawCameraGizmos(renderer);

    // Draw gizmos for all lights in the scene
    drawLightGizmos(renderer);
}
