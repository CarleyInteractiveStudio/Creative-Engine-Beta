// js/editor/GameFloatingWindow.js

import { Renderer } from '../engine/Renderer.js';

let floatingWindow = null;
let gameRenderer = null;
let animationFrameId = null;

let currentSceneManager = null;
let currentPhysicsSystem = null;
let currentUiSystem = null;

export function isFloatingGameWindowOpen() {
    return floatingWindow && !floatingWindow.closed;
}

export function openFloatingGameWindow(SceneManager, physicsSystem, uiSystem) {
    if (isFloatingGameWindowOpen()) {
        floatingWindow.focus();
        return;
    }

    currentSceneManager = SceneManager;
    currentPhysicsSystem = physicsSystem;
    currentUiSystem = uiSystem;

    const windowFeatures = 'width=800,height=600,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no';
    floatingWindow = window.open('', 'Creative Engine - Game', windowFeatures);

    if (!floatingWindow) {
        console.error("No se pudo abrir la ventana flotante. Revisa si tu navegador está bloqueando las ventanas emergentes.");
        return;
    }

    floatingWindow.document.title = 'Creative Engine - Game';
    floatingWindow.document.body.style.margin = '0';
    floatingWindow.document.body.style.overflow = 'hidden';
    floatingWindow.document.body.style.backgroundColor = '#222';

    // Copy styles from the main document
    Array.from(document.styleSheets).forEach(styleSheet => {
        try {
            const cssRules = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('');
            const style = floatingWindow.document.createElement('style');
            style.textContent = cssRules;
            floatingWindow.document.head.appendChild(style);
        } catch (e) {
            // Ignore cross-origin stylesheets
        }
    });

    const canvas = floatingWindow.document.createElement('canvas');
    canvas.id = 'floating-game-canvas';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    floatingWindow.document.body.appendChild(canvas);

    gameRenderer = new Renderer(canvas, false, true);

    function gameLoop(timestamp) {
        if (!isFloatingGameWindowOpen()) return;

        // Basic game loop logic, similar to the main editor loop
        gameRenderer.resize();
        if (currentSceneManager.currentScene) {
            gameRenderer.drawScene(currentSceneManager.currentScene, currentSceneManager.currentScene.findFirstCamera(), true);
        }

        animationFrameId = floatingWindow.requestAnimationFrame(gameLoop);
    }

    animationFrameId = floatingWindow.requestAnimationFrame(gameLoop);

    floatingWindow.addEventListener('beforeunload', () => {
        closeFloatingGameWindow();
    });
}

export function closeFloatingGameWindow() {
    if (animationFrameId) {
        floatingWindow.cancelAnimationFrame(animationFrameId);
    }
    if (floatingWindow && !floatingWindow.closed) {
        floatingWindow.close();
    }
    floatingWindow = null;
    gameRenderer = null;
    animationFrameId = null;
    currentSceneManager = null;
    currentPhysicsSystem = null;
    currentUiSystem = null;
}
