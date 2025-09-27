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
let getPreferences;
let getSelectedTile;

// Module State
let activeTool = 'move'; // 'move', 'rotate', 'scale', 'pan', 'tile-brush', 'tile-eraser'
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
    const ROTATE_RADIUS = GIZMO_SIZE * 0.8;
    const SCALE_BOX_SIZE = 8 / zoom;


    // Center of the object in world space
    const centerX = transform.x;
    const centerY = transform.y;

    ctx.save();
    // No need to translate the whole context, we'll draw using world coords.

    // --- Draw based on active tool ---
    switch (activeTool) {
        case 'move':
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
            ctx.fillStyle = 'rgba(0, 100, 255, 0.7)'; // Semi-transparent blue
            ctx.fillRect(centerX - SQUARE_SIZE / 2, centerY - SQUARE_SIZE / 2, SQUARE_SIZE, SQUARE_SIZE);
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(centerX - SQUARE_SIZE / 2, centerY - SQUARE_SIZE / 2, SQUARE_SIZE, SQUARE_SIZE);
            break;

        case 'rotate':
            ctx.lineWidth = HANDLE_THICKNESS;
            ctx.strokeStyle = '#0000ff'; // Blue for rotation
            ctx.beginPath();
            ctx.arc(centerX, centerY, ROTATE_RADIUS, 0, 2 * Math.PI);
            ctx.stroke();
            break;

        case 'scale':
             ctx.lineWidth = HANDLE_THICKNESS;
             ctx.strokeStyle = '#ffffff'; // White for scale handles
             const halfBox = SCALE_BOX_SIZE / 2;
             // Draw 4 boxes at the corners relative to the object's center
             const corners = [
                 { x: centerX - halfBox, y: centerY - halfBox },
                 { x: centerX + GIZMO_SIZE - halfBox, y: centerY - halfBox },
                 { x: centerX - halfBox, y: centerY + GIZMO_SIZE - halfBox },
                 { x: centerX + GIZMO_SIZE, y: centerY + GIZMO_SIZE }
             ];
            // This is a simplified version. A real implementation would rotate with the object.
            // For now, axis-aligned boxes.
            ctx.fillStyle = '#ffffff';
            ctx.strokeRect(centerX - halfBox, centerY - halfBox, SCALE_BOX_SIZE, SCALE_BOX_SIZE); // Center handle
            ctx.strokeRect(centerX + GIZMO_SIZE - halfBox, centerY - halfBox, SCALE_BOX_SIZE, SCALE_BOX_SIZE); // Right
            ctx.strokeRect(centerX - halfBox, centerY + GIZMO_SIZE - halfBox, SCALE_BOX_SIZE, SCALE_BOX_SIZE); // Top
            break;
    }

    ctx.restore();
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
    SceneManager = dependencies.SceneManager;
    getPreferences = dependencies.getPreferences;
    getSelectedTile = dependencies.getSelectedTile; // New dependency

    // Setup event listeners
    dom.sceneCanvas.addEventListener('contextmenu', e => e.preventDefault());

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

        // Clamp zoom to avoid issues
        renderer.camera.zoom = Math.max(0.1, Math.min(renderer.camera.zoom, 20.0));
    }, { passive: false });

    dom.sceneCanvas.addEventListener('mousedown', (e) => {
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
        if (e.button === 0 && (activeTool === 'tile-brush' || activeTool === 'tile-eraser')) {
            e.stopPropagation();
            paintTile(e); // Paint on the first click

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

        // --- Gizmo Dragging Logic (Left-click) ---
        if (e.button === 0) {
            const selectedMateria = getSelectedMateria();
            if (!selectedMateria || activeTool === 'pan') return;

            const canvasPos = InputManager.getMousePositionInCanvas();
            const hitHandle = checkCameraGizmoHit(canvasPos) || checkGizmoHit(canvasPos);

            if (hitHandle) {
                e.stopPropagation();
                isDragging = true;
                dragState = { handle: hitHandle, materia: selectedMateria };
                lastMousePosition = { x: e.clientX, y: e.clientY };

                if (hitHandle.startsWith('scale-')) {
                    const transform = selectedMateria.getComponent(Components.Transform);
                    const boxCollider = selectedMateria.getComponent(Components.BoxCollider);
                    dragState.unscaledWidth = boxCollider ? boxCollider.width : 100;
                    dragState.unscaledHeight = boxCollider ? boxCollider.height : 100;
                }

                const onGizmoDrag = (moveEvent) => {
                    moveEvent.preventDefault();
                    if (!dragState.materia) return;

                    const transform = dragState.materia.getComponent(Components.Transform);
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
                        case 'rotate': {
                            const worldMouse = screenToWorld(moveEvent.clientX - dom.sceneCanvas.getBoundingClientRect().left, moveEvent.clientY - dom.sceneCanvas.getBoundingClientRect().top);
                            transform.rotation = Math.atan2(worldMouse.y - transform.y, worldMouse.x - transform.x) * 180 / Math.PI;
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

                window.addEventListener('mousemove', onGizmoDrag);
                window.addEventListener('mouseup', onGizmoDragEnd);
            }
        }
    });

    document.getElementById('tool-move').addEventListener('click', () => setActiveTool('move'));
    document.getElementById('tool-pan').addEventListener('click', () => setActiveTool('pan'));
    document.getElementById('tool-scale').addEventListener('click', () => setActiveTool('scale'));
    document.getElementById('tool-rotate').addEventListener('click', () => setActiveTool('rotate'));
    document.getElementById('tool-tile-brush').addEventListener('click', () => setActiveTool('tile-brush'));
    document.getElementById('tool-tile-eraser').addEventListener('click', () => setActiveTool('tile-eraser'));
}

export function update() {
    // This will be called from the main editorLoop
    handleEditorInteractions();

    const selectedMateria = getSelectedMateria();
    const currentSelectedId = selectedMateria ? selectedMateria.id : -1;

    // Check if selection has changed
    if (currentSelectedId !== lastSelectedId) {
        const hasTilemap = selectedMateria && selectedMateria.getComponent(Components.Tilemap);

        // Show/hide tilemap-specific tools
        document.querySelectorAll('.tilemap-tool, .tilemap-tool-divider').forEach(el => {
            el.style.display = hasTilemap ? 'block' : 'none';
        });

        // If the selected object is not a tilemap, switch back to a default tool
        if (!hasTilemap && (activeTool === 'tile-brush' || activeTool === 'tile-eraser')) {
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
    if (activeTool !== 'tile-brush' && activeTool !== 'tile-eraser') return;

    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const tilemap = selectedMateria.getComponent(Components.Tilemap);
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!tilemap || !transform) return;

    const { ctx } = renderer;
    const { tileWidth, tileHeight, columns, rows } = tilemap;
    const mousePos = InputManager.getMousePositionInCanvas();
    const worldMouse = screenToWorld(mousePos.x, mousePos.y);

    // Calculate mouse position relative to the tilemap's origin (top-left corner)
    const mapWidth = columns * tileWidth;
    const mapHeight = rows * tileHeight;
    const mapTopLeftX = transform.x - mapWidth / 2;
    const mapTopLeftY = transform.y - mapHeight / 2;

    const mouseInMapX = worldMouse.x - mapTopLeftX;
    const mouseInMapY = worldMouse.y - mapTopLeftY;

    // Calculate the column and row under the cursor
    const col = Math.floor(mouseInMapX / tileWidth);
    const row = Math.floor(mouseInMapY / tileHeight);

    // Check if the cursor is within the tilemap bounds
    if (col >= 0 && col < columns && row >= 0 && row < rows) {
        const cursorX = mapTopLeftX + col * tileWidth;
        const cursorY = mapTopLeftY + row * tileHeight;

        ctx.save();
        if (activeTool === 'tile-brush') {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Green for brush
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        } else { // Eraser
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // Red for eraser
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        }
        ctx.lineWidth = 2 / renderer.camera.effectiveZoom;
        ctx.fillRect(cursorX, cursorY, tileWidth, tileHeight);
        ctx.strokeRect(cursorX, cursorY, tileWidth, tileHeight);
        ctx.restore();
    }
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

    // Draw tile painting cursor
    drawTileCursor();

    // Draw tilemap colliders
    drawTilemapColliders();
}

function drawTilemapColliders() {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const collider = selectedMateria.getComponent(Components.TilemapCollider2D);
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!collider || !transform) return;

    const { ctx } = renderer;

    ctx.save();
    // Apply the main transform of the tilemap object
    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation * Math.PI / 180);

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'; // Bright green for physics shapes
    ctx.lineWidth = 2 / renderer.camera.effectiveZoom;
    ctx.setLineDash([6 / renderer.camera.effectiveZoom, 4 / renderer.camera.effectiveZoom]); // Dashed line

    collider.generatedColliders.forEach(rect => {
        // The rect coordinates are already relative to the tilemap's center
        ctx.strokeRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
    });

    ctx.restore();
}

function paintTile(event) {
    const selectedMateria = getSelectedMateria();
    if (!selectedMateria) return;

    const tilemap = selectedMateria.getComponent(Components.Tilemap);
    const transform = selectedMateria.getComponent(Components.Transform);
    if (!tilemap || !transform) return;

    const { tileWidth, tileHeight, columns, rows } = tilemap;

    const rect = dom.sceneCanvas.getBoundingClientRect();
    const canvasPos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const worldMouse = screenToWorld(canvasPos.x, canvasPos.y);

    const mapWidth = columns * tileWidth;
    const mapHeight = rows * tileHeight;
    const mapTopLeftX = transform.x - mapWidth / 2;
    const mapTopLeftY = transform.y - mapHeight / 2;

    const mouseInMapX = worldMouse.x - mapTopLeftX;
    const mouseInMapY = worldMouse.y - mapTopLeftY;

    const col = Math.floor(mouseInMapX / tileWidth);
    const row = Math.floor(mouseInMapY / tileHeight);

    // Prevent re-painting the same tile in a single drag motion
    if (col === lastPaintedCoords.col && row === lastPaintedCoords.row) {
        return;
    }

    if (col >= 0 && col < columns && row >= 0 && row < rows) {
        const tileIdToPaint = (activeTool === 'tile-brush') ? getSelectedTile() : -1;

        if (tileIdToPaint === undefined || tileIdToPaint === null) {
            console.warn("No tile selected in the palette to paint with.");
            return;
        }

        // Use the active layer index from the component
        tilemap.setTile(tilemap.activeLayerIndex, col, row, tileIdToPaint);
        lastPaintedCoords = { col, row };
        SceneManager.setSceneDirty(true);
    }
}
