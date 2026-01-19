// js/editor/GameFloatingWindow.js

import { Renderer } from '../engine/Renderer.js';
import { InputManager } from '../engine/Input.js';
import * as Components from '../engine/Components.js';
import * as MathUtils from '../engine/MathUtils.js';

let gameWindow = null;
let gameRenderer = null;
let sceneManager = null;
let physicsSystem = null;
let uiSystem = null;
let gameLoopId = null;
let lastFrameTime = 0;
let deltaTime = 0;
let isRunning = false;
let currentProjectConfig = {}; // To hold a copy of the project config

// --- Game Loop Logic (Adapted from editor.js) ---

const FIXED_DELTA = 1 / 50; // 50 Hz fixed updates
let fixedAccumulator = 0;

function runGameLoop() {
    if (!isRunning || !sceneManager || !sceneManager.currentScene) return;

    // Fixed update for scripts
    fixedAccumulator += deltaTime;
    while (fixedAccumulator >= FIXED_DELTA) {
        for (const materia of sceneManager.currentScene.getAllMaterias()) {
            if (!materia.isActive) continue;
            const scripts = materia.getComponents(Components.CreativeScript);
            for (const script of scripts) {
                try {
                    script.fixedUpdate(FIXED_DELTA);
                } catch (e) {
                    console.error(`Error in floating window fixedUpdate() for script '${script.scriptName}' on '${materia.name}':`, e);
                }
            }
        }
        fixedAccumulator -= FIXED_DELTA;
    }

    // Update physics
    if (physicsSystem) {
        physicsSystem.update(deltaTime);
    }

    // Update all game objects scripts
    for (const materia of sceneManager.currentScene.getAllMaterias()) {
        if (!materia.isActive) continue;
        materia.update(deltaTime);
    }
}

function updateScene() {
    if (!isRunning || !gameRenderer || !sceneManager || !sceneManager.currentScene) return;

    const materiasToRender = sceneManager.currentScene.getAllMaterias()
        .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpriteRenderer));
    const tilemapsToRender = sceneManager.currentScene.getAllMaterias()
        .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.TilemapRenderer));
     const canvasesToRender = sceneManager.currentScene.getAllMaterias()
        .filter(m => m.getComponent(Components.Canvas)); // Will filter by render mode inside drawCanvas

    const drawObjects = (cameraForCulling) => {
        const aspect = gameRenderer.canvas.width / gameRenderer.canvas.height;
        const cameraViewBox = cameraForCulling ? MathUtils.getCameraViewBox(cameraForCulling, aspect) : null;

        // Draw Sprites
        for (const materia of materiasToRender) {
            if (!materia.isActive) continue;
            // Simplified culling for floating window
            if (cameraForCulling) {
                const cameraComponent = cameraForCulling.getComponent(Components.Camera);
                const objectLayerBit = 1 << materia.layer;
                if ((cameraComponent.cullingMask & objectLayerBit) === 0) continue;
            }
            gameRenderer.drawSprite(materia.getComponent(Components.SpriteRenderer));
        }
        // Draw Tilemaps
        for (const materia of tilemapsToRender) {
             if (!materia.isActive) continue;
             if (cameraForCulling) {
                const cameraComponent = cameraForCulling.getComponent(Components.Camera);
                const objectLayerBit = 1 << materia.layer;
                if ((cameraComponent.cullingMask & objectLayerBit) === 0) continue;
            }
            gameRenderer.drawTilemap(materia.getComponent(Components.TilemapRenderer));
        }

    };

     const handleRender = (camera) => {
        gameRenderer.beginWorld(camera);
        drawObjects(camera);
        gameRenderer.end();
    };

    // --- Main Render Execution ---
    const cameras = sceneManager.currentScene.findAllCameras()
        .sort((a, b) => a.getComponent(Components.Camera).depth - b.getComponent(Components.Camera).depth);

    if (cameras.length > 0) {
        cameras.forEach(handleRender);
    } else {
        // If no world cameras, just clear the background
        gameRenderer.clear();
    }

    // --- UI Overlay Pass ---
    // Draw screen-space canvases on top of everything
    for (const materia of canvasesToRender) {
        if (materia.isActive) {
            gameRenderer.drawCanvas(materia, true); // isGameView = true
        }
    }
}


function floatingWindowLoop(timestamp) {
    if (lastFrameTime > 0) {
        deltaTime = (timestamp - lastFrameTime) / 1000;
    }
    lastFrameTime = timestamp;

    if (gameRenderer) {
        gameRenderer.resize();
        runGameLoop();
        updateScene();
    }

    InputManager.update();

    if (gameWindow && !gameWindow.closed) {
        gameLoopId = requestAnimationFrame(floatingWindowLoop);
    } else {
        // Window was closed by the user, perform cleanup
        closeFloatingGameWindow();
    }
}

export function openFloatingGameWindow(currentSceneManager, currentPhysicsSystem, currentUiSystem, projConfig) {
    if (gameWindow && !gameWindow.closed) {
        gameWindow.focus();
        return;
    }

    sceneManager = currentSceneManager;
    physicsSystem = currentPhysicsSystem;
    uiSystem = currentUiSystem;
    currentProjectConfig = projConfig; // Store the config

    const initialWidth = 1280;
    const initialHeight = 720;
    gameWindow = window.open('', 'CreativeEngineGame', `width=${initialWidth},height=${initialHeight},resizable=yes,scrollbars=no`);

    if (!gameWindow) {
        alert("La ventana emergente fue bloqueada por el navegador. Por favor, permite las ventanas emergentes para este sitio.");
        return;
    }

    // Setup the window's document
    gameWindow.document.title = "Game Preview";
    gameWindow.document.body.style.margin = "0";
    gameWindow.document.body.style.overflow = "hidden";
    gameWindow.document.body.style.backgroundColor = "#000";
    const canvas = gameWindow.document.createElement('canvas');
    canvas.id = 'floating-game-canvas';
    gameWindow.document.body.appendChild(canvas);

    // Initialize systems for the new window
    gameRenderer = new Renderer(canvas, false, true);
    InputManager.initialize(null, canvas, gameWindow);
    InputManager.setGameRunning(true);

    isRunning = true;
    lastFrameTime = performance.now();
    gameLoopId = requestAnimationFrame(floatingWindowLoop);

    gameWindow.addEventListener('beforeunload', () => {
        closeFloatingGameWindow();
    });
}

export function closeFloatingGameWindow() {
    if (!isRunning) return;

    isRunning = false;
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    if (gameWindow && !gameWindow.closed) {
        gameWindow.close();
    }

    // Clean up references to avoid memory leaks
    InputManager.setGameRunning(false);
    gameWindow = null;
    gameRenderer = null;
    sceneManager = null;
    physicsSystem = null;
    uiSystem = null;
    console.log("Floating game window closed and resources cleaned up.");
}

export function isFloatingGameWindowOpen() {
    return gameWindow && !gameWindow.closed;
}

export function resizeFloatingWindow(width, height) {
    if (isFloatingGameWindowOpen()) {
        // The numbers are estimates for the browser's UI chrome.
        const chromeWidth = gameWindow.outerWidth - gameWindow.innerWidth;
        const chromeHeight = gameWindow.outerHeight - gameWindow.innerHeight;
        gameWindow.resizeTo(width + chromeWidth, height + chromeHeight);
    }
}
