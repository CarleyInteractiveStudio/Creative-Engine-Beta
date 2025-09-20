import * as MathUtils from '../engine/MathUtils.js';

// Dependencies from editor.js, set during initialization
let renderer;
let InputManager;
let getSelectedMateria;
let Components;
let SceneManager;

let activeTool = 'move';

// --- Core Functions ---

function getProjectionMatrix() {
    const { camera, gl } = renderer;
    const projectionMatrix = MathUtils.createMat4();
    const halfW = (gl.canvas.width / 2) / camera.effectiveZoom;
    const halfH = (gl.canvas.height / 2) / camera.effectiveZoom;
    MathUtils.ortho(projectionMatrix, -halfW, halfH, -halfH, halfH, -100, 100);
    MathUtils.translateMat4(projectionMatrix, projectionMatrix, [-camera.x, -camera.y, 0]);
    return projectionMatrix;
}

function drawEditorGrid() {
    const GRID_SIZE = 50;
    const { camera, canvas } = renderer;
    const zoom = camera.effectiveZoom;

    if (GRID_SIZE * zoom < 10) return;

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

    const projectionMatrix = getProjectionMatrix();
    const modelViewMatrix = MathUtils.createMat4(); // Identity matrix
    renderer.drawLines(vertices, [0.2, 0.2, 0.2, 1.0], projectionMatrix, modelViewMatrix);
}

function drawSelectionBox(transform, spriteRenderer) {
    const projectionMatrix = getProjectionMatrix();
    const modelViewMatrix = MathUtils.createMat4();
    MathUtils.translateMat4(modelViewMatrix, modelViewMatrix, [transform.x, transform.y, 0]);
    MathUtils.rotateMat4(modelViewMatrix, modelViewMatrix, transform.rotation * Math.PI / 180, [0, 0, 1]);

    let w = 100;
    let h = 100;
    if (spriteRenderer && spriteRenderer.sprite && spriteRenderer.sprite.naturalWidth) {
        w = spriteRenderer.sprite.naturalWidth * transform.scale.x;
        h = spriteRenderer.sprite.naturalHeight * transform.scale.y;
    }

    const halfW = w / 2;
    const halfH = h / 2;
    const vertices = [-halfW, -halfH, halfW, -halfH, halfW, halfH, -halfW, halfH];

    renderer.drawLineLoop(vertices, [1, 0, 1, 1], projectionMatrix, modelViewMatrix);
}


function drawGizmos(materia) {
    const transform = materia.getComponent(Components.Transform);
    if (!transform) return;

    const projectionMatrix = getProjectionMatrix();
    const modelViewMatrix = MathUtils.createMat4();
    MathUtils.translateMat4(modelViewMatrix, modelViewMatrix, [transform.x, transform.y, 0]);

    const GIZMO_SIZE = 60 / renderer.camera.effectiveZoom;

    if (activeTool === 'move') {
        // X-axis (red)
        renderer.drawLines([0, 0, GIZMO_SIZE, 0], [1, 0, 0, 1], projectionMatrix, modelViewMatrix);
        // Y-axis (green)
        renderer.drawLines([0, 0, 0, GIZMO_SIZE], [0, 1, 0, 1], projectionMatrix, modelViewMatrix);
    } else if (activeTool === 'rotate') {
        const circle = [];
        for (let i = 0; i <= 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            circle.push(Math.cos(angle) * GIZMO_SIZE, Math.sin(angle) * GIZMO_SIZE);
        }
        renderer.drawLineLoop(circle, [0, 0, 1, 1], projectionMatrix, modelViewMatrix);
    }
}

function drawLightGizmos() {
    if (!SceneManager) return;
    const scene = SceneManager.currentScene;
    if (!scene) return;

    const allLights = scene.getAllMaterias().filter(m => m.getComponent(Components.Light));
    const projectionMatrix = getProjectionMatrix();

    allLights.forEach(materia => {
        const light = materia.getComponent(Components.Light);
        const transform = materia.getComponent(Components.Transform);
        if (!light || !transform) return;

        const modelViewMatrix = MathUtils.createMat4();
        MathUtils.translateMat4(modelViewMatrix, modelViewMatrix, [transform.x, transform.y, 0]);
        const color = [1, 1, 0, 0.5]; // Semi-transparent yellow

        if (light.type === 'Point') {
            const circle = [];
            for (let i = 0; i <= 32; i++) {
                const angle = (i / 32) * Math.PI * 2;
                circle.push(Math.cos(angle) * light.range, Math.sin(angle) * light.range);
            }
            renderer.drawLineLoop(circle, color, projectionMatrix, modelViewMatrix);
        }
        // TODO: Add gizmos for other light types
    });
}


// --- Public API ---

export function drawOverlay() {
    if (!renderer || !renderer.gl) return; // Only run for WebGL renderer

    const gl = renderer.gl;
    gl.disable(gl.DEPTH_TEST);

    drawEditorGrid();

    const selected = getSelectedMateria();
    if (selected) {
        const transform = selected.getComponent(Components.Transform);
        const spriteRenderer = selected.getComponent(Components.SpriteRenderer);
        if (transform) {
            drawSelectionBox(transform, spriteRenderer);
            drawGizmos(selected);
        }
    }

    drawLightGizmos();

    gl.enable(gl.DEPTH_TEST);
}

export function initialize(dependencies) {
    renderer = dependencies.renderer;
    InputManager = dependencies.InputManager;
    getSelectedMateria = dependencies.getSelectedMateria;
    Components = dependencies.Components;
    SceneManager = dependencies.SceneManager;
    // Other dependencies can be added here if needed
}

export function update() {
    if (!renderer || !renderer.camera) return;

    // Handle camera zoom
    const scrollDelta = InputManager.getScrollDelta();
    if (scrollDelta !== 0) {
        const zoomFactor = 1.1;
        renderer.camera.zoom *= (scrollDelta > 0) ? 1 / zoomFactor : zoomFactor;
        renderer.camera.zoom = Math.max(0.1, Math.min(renderer.camera.zoom, 20.0));
    }
    // Pan and other interactions are handled in editor.js for now
}

export function setActiveTool(toolName) {
    activeTool = toolName;
}

export function getActiveTool() {
    return activeTool;
}
