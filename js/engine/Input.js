/**
 * @fileoverview Manages all user input, including keyboard and mouse.
 * Provides a simple static API for querying input states.
 */

class InputManager {
    static _gameWindows = new Set();
    static _keys = new Map();
    static _keysDown = new Set();
    static _keysUp = new Set();

    static _mouseButtons = new Map();
    static _buttonsDown = new Set();
    static _buttonsUp = new Set();

    static _mousePosition = { x: 0, y: 0 };
    static _mousePositionInCanvas = { x: 0, y: 0 };
    static _mouseDelta = { x: 0, y: 0 };
    static _buttonsDownTime = new Map();
    static _canvasRect = null;
    static _sceneCanvas = null;
    static _gameCanvas = null;
    static _activeCanvas = null;
    static _isGameRunning = false;

    static get sceneCanvas() { return this._sceneCanvas; }
    static get gameCanvas() { return this._gameCanvas; }
    static get activeCanvas() { return this._activeCanvas; }

    // Long Press State
    static _longPressTimeoutId = null;
    static _longPressStartPosition = { x: 0, y: 0 };
    static LONG_PRESS_DURATION = 750; // ms
    static LONG_PRESS_TOLERANCE = 10; // pixels

    /**
     * Initializes the InputManager. Attaches listeners to the window and canvas elements.
     * @param {HTMLCanvasElement} [sceneCanvas=null] The canvas for the editor's scene view.
     * @param {HTMLCanvasElement} [gameCanvas=null] The canvas for the game view.
     */
    static initialize(sceneCanvas = null, gameCanvas = null) {
        if (this.initialized) return;

        // Keyboard listeners are global
        this._mainEventListenerTarget = window;
        this.attachWindow(window);

        // Save references to both canvases so we can switch the active one when in play mode
        this._sceneCanvas = sceneCanvas;
        this._gameCanvas = gameCanvas;
        // Default active canvas is the scene so the editor works normally
        this._activeCanvas = sceneCanvas || gameCanvas || null;

        if (sceneCanvas) {
            this.attachCanvas(sceneCanvas);
        }
        if (gameCanvas) {
            this.attachCanvas(gameCanvas);
        }


        this.initialized = true;
        console.log("InputManager Initialized for Mouse and Touch on relevant canvases.");
    }

    /**
     * Updates the state of keys and mouse buttons.
     * This should be called once per frame, before any game logic.
     */
    static update() {
        this._keysDown.clear();
        this._keysUp.clear();
        this._buttonsDown.clear();
        this._buttonsUp.clear();
        this._mouseDelta.x = 0;
        this._mouseDelta.y = 0;

        // Use the currently active canvas (scene or game) to compute canvas-relative positions
        if (this._activeCanvas) {
             this._canvasRect = this._activeCanvas.getBoundingClientRect();
        } else {
             this._canvasRect = null;
        }
    }

    // Expose programmatic control for which canvas should be considered active
    static setActiveCanvas(canvas) {
        this._activeCanvas = canvas;
        // If this is a new canvas, ensure it has the necessary listeners
        this.attachCanvas(canvas);

        try {
            const id = canvas && canvas.id ? canvas.id : (canvas && canvas.tagName ? canvas.tagName : 'unknown');
            console.log(`[InputManager] Active canvas set to: ${id}`);
        } catch (e) {}
    }

    /**
     * Updates the reference to the primary game canvas.
     * @param {HTMLCanvasElement} canvas
     */
    static setGameCanvas(canvas) {
        this._gameCanvas = canvas;
        if (canvas) this.attachCanvas(canvas);
    }

    /**
     * Attaches mouse and touch listeners to a specific canvas.
     * @param {HTMLCanvasElement} canvas
     */
    static attachCanvas(canvas) {
        if (!canvas || canvas._ceInputAttached) return;

        // Mouse
        canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
        canvas.addEventListener('mousedown', (e) => {
            this._activeCanvas = e.currentTarget;
            e.currentTarget.focus();
            this._onMouseDown(e);
        });
        canvas.addEventListener('mouseup', this._onMouseUp.bind(this));

        // Track pointer enter/leave
        canvas.addEventListener('mouseenter', (e) => { this._activeCanvas = e.currentTarget; });
        canvas.addEventListener('mouseleave', (e) => {
            if (this._activeCanvas === e.currentTarget) {
                this._activeCanvas = this._sceneCanvas || null;
            }
        });

        // Touch
        canvas.addEventListener('touchstart', (e) => {
            this._activeCanvas = e.currentTarget;
            this._onTouchStart(e);
        }, { passive: false });
        canvas.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
        canvas.addEventListener('touchcancel', this._onTouchEnd.bind(this), { passive: false });

        if (typeof canvas.tabIndex !== 'number' || canvas.tabIndex < 0) canvas.tabIndex = 0;

        canvas._ceInputAttached = true;
    }

    // Call this when entering/exiting play mode so InputManager can default to the game canvas
    static setGameRunning(isRunning) {
        this._isGameRunning = !!isRunning;
        if (this._isGameRunning) {
            if (this._gameCanvas) {
                this._activeCanvas = this._gameCanvas;
                console.log('[InputManager] Game running: routing input to game canvas.');
            }
        } else {
            this._activeCanvas = this._sceneCanvas || this._activeCanvas;
            console.log('[InputManager] Game stopped: routing input back to scene canvas.');
        }
    }

    /**
     * Attaches input listeners to a specific window.
     * Useful for multi-window setups.
     * @param {Window} targetWindow
     */
    static attachWindow(targetWindow) {
        if (!targetWindow) return;

        // Track external windows that are dedicated to the game
        if (targetWindow !== window) {
            this._gameWindows.add(targetWindow);
        }

        targetWindow.addEventListener('keydown', this._onKeyDown.bind(this));
        targetWindow.addEventListener('keyup', this._onKeyUp.bind(this));
        targetWindow.addEventListener('wheel', this._onWheel.bind(this), { passive: false });

        // Also listen for mouse move on the window to track position even when not over canvas
        targetWindow.addEventListener('mousemove', (e) => {
            this._mousePosition.x = e.clientX;
            this._mousePosition.y = e.clientY;
        });
    }

    /**
     * Removes input listeners from a specific window.
     * @param {Window} targetWindow
     */
    static detachWindow(targetWindow) {
        if (!targetWindow) return;

        this._gameWindows.delete(targetWindow);

        targetWindow.removeEventListener('keydown', this._onKeyDown.bind(this));
        targetWindow.removeEventListener('keyup', this._onKeyUp.bind(this));
        targetWindow.removeEventListener('wheel', this._onWheel.bind(this));
    }

    // Keyboard Methods
    static _onKeyDown(event) {
        // If the engine is playing, ignore keyboard input unless:
        // 1. It comes from an external game window
        // 2. The active canvas is the game canvas (integrated mode)
        const isFromGameWindow = this._gameWindows.has(event.view);
        if (this._isGameRunning && !isFromGameWindow && this._activeCanvas !== this._gameCanvas) return;

        const key = event.key;
        if (!this._keys.get(key)) {
            this._keysDown.add(key);
        }
        this._keys.set(key, true);
    }

    static _onKeyUp(event) {
        const isFromGameWindow = this._gameWindows.has(event.view);
        if (this._isGameRunning && !isFromGameWindow && this._activeCanvas !== this._gameCanvas) return;

        const key = event.key;
        this._keys.set(key, false);
        this._keysUp.add(key);
    }

    /**
     * Checks if a key is currently being held down.
     * @param {string} key The key to check (e.g., 'w', 'a', 'Space').
     * @returns {boolean} True if the key is pressed.
     */
    static getKey(key) {
        return !!this._keys.get(key);
    }

    /**
     * Checks if a key was pressed down during the current frame.
     * @param {string} key The key to check.
     * @returns {boolean} True if the key was just pressed.
     */
    static getKeyDown(key) {
        return this._keysDown.has(key);
    }

    /**
     * Checks if a key was released during the current frame.
     * @param {string} key The key to check.
     * @returns {boolean} True if the key was just released.
     */
    static getKeyUp(key) {
        return this._keysUp.has(key);
    }

    static getPressedKeys() {
        const pressed = [];
        for (const [key, isPressed] of this._keys.entries()) {
            if (isPressed) {
                pressed.push(key);
            }
        }
        return pressed;
    }

    // --- Pointer (Mouse + Touch) Methods ---

    static _onMouseMove(event) {
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        this._updatePointerPosition(event.clientX, event.clientY, rect);
    }

    static _onMouseDown(event) {
        this._onPointerDown(event.button);
    }

    static _onMouseUp(event) {
        this._onPointerUp(event.button);
    }

    static _onTouchStart(event) {
        event.preventDefault();
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            const canvas = event.currentTarget;
            const rect = canvas.getBoundingClientRect();
            this._updatePointerPosition(touch.clientX, touch.clientY, rect);
            this._onPointerDown(0); // Treat all touches as left-click

            // Start long-press timer
            this._longPressStartPosition = { x: touch.clientX, y: touch.clientY };
            this._clearLongPressTimer();
            this._longPressTimeoutId = setTimeout(() => {
                this._handleLongPress(event.target);
            }, this.LONG_PRESS_DURATION);
        }
    }

    static _onTouchMove(event) {
        event.preventDefault();
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            const canvas = event.currentTarget;
            const rect = canvas.getBoundingClientRect();
            this._updatePointerPosition(touch.clientX, touch.clientY, rect);

            // Cancel long press if finger moves too far
            const dx = Math.abs(touch.clientX - this._longPressStartPosition.x);
            const dy = Math.abs(touch.clientY - this._longPressStartPosition.y);
            if (dx > this.LONG_PRESS_TOLERANCE || dy > this.LONG_PRESS_TOLERANCE) {
                this._clearLongPressTimer();
            }
        }
    }

    static _onTouchEnd(event) {
        event.preventDefault();
        this._clearLongPressTimer();
        this._onPointerUp(0); // Treat all touches as left-click
    }

    static _clearLongPressTimer() {
        if (this._longPressTimeoutId) {
            clearTimeout(this._longPressTimeoutId);
            this._longPressTimeoutId = null;
        }
    }

    static _handleLongPress(targetElement) {
        console.log("Long press detected!");
        this._longPressTimeoutId = null;
        // Create a new MouseEvent to simulate a right-click (contextmenu)
        const contextMenuEvent = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 2,
            buttons: 0,
            clientX: this._mousePosition.x,
            clientY: this._mousePosition.y
        });
        targetElement.dispatchEvent(contextMenuEvent);
    }

    // Unified handlers
    static _updatePointerPosition(clientX, clientY, canvasRect) {
        this._mouseDelta.x += clientX - this._mousePosition.x;
        this._mouseDelta.y += clientY - this._mousePosition.y;

        this._mousePosition.x = clientX;
        this._mousePosition.y = clientY;

        if (canvasRect) {
            this._mousePositionInCanvas.x = clientX - canvasRect.left;
            this._mousePositionInCanvas.y = clientY - canvasRect.top;
        }
    }

    static _onPointerDown(button) {
        if (!this._mouseButtons.get(button)) {
            this._buttonsDown.add(button);
            this._buttonsDownTime.set(button, performance.now());
        }
        this._mouseButtons.set(button, true);
    }

    static _onPointerUp(button) {
        this._mouseButtons.set(button, false);
        this._buttonsUp.add(button);
        this._buttonsDownTime.delete(button);
    }

    /**
     * Checks if a mouse button is currently being held down.
     * @param {number} button The button to check (0: Left, 1: Middle, 2: Right).
     * @returns {boolean} True if the button is pressed.
     */
    static getMouseButton(button) {
        return !!this._mouseButtons.get(button);
    }

    /**
     * Checks if a mouse button was pressed down during the current frame.
     * @param {number} button The button to check.
     * @returns {boolean} True if the button was just pressed.
     */
    static getMouseButtonDown(button) {
        return this._buttonsDown.has(button);
    }

    /**
     * Checks if a mouse button was released during the current frame.
     * @param {number} button The button to check.
     * @returns {boolean} True if the button was just released.
     */
    static getMouseButtonUp(button) {
        return this._buttonsUp.has(button);
    }

    /**
     * Gets the mouse position relative to the viewport.
     * @returns {{x: number, y: number}}
     */
    static getMousePosition() {
        return this._mousePosition;
    }

    /**
     * Gets the mouse position relative to the scene canvas.
     * @returns {{x: number, y: number}}
     */
    static getMousePositionInCanvas() {
        return this._mousePositionInCanvas;
    }

    /**
     * Gets the mouse movement delta since the last frame.
     * @returns {{x: number, y: number}}
     */
    static getMouseDelta() {
        return this._mouseDelta;
    }

    /**
     * Gets how many seconds a mouse button has been held down.
     * @param {number} button
     * @returns {number} Time in seconds.
     */
    static getMouseButtonDuration(button) {
        if (!this._mouseButtons.get(button)) return 0;
        const startTime = this._buttonsDownTime.get(button);
        return startTime ? (performance.now() - startTime) / 1000 : 0;
    }

    static _onWheel(event) {
        // If the scroll event is on one of the canvases, we do nothing here.
        // The dedicated listener in `SceneView.js` (for editor) or standalone logic will handle it.
        if ((this._sceneCanvas && this._sceneCanvas.contains(event.target)) ||
            (this._gameCanvas && this._gameCanvas.contains(event.target))) {
            return;
        }

        // For the rest of the UI, we check if the target is a scrollable panel.
        let target = event.target;
        while (target && target !== document.body) {
            if (target.scrollHeight > target.clientHeight) {
                // This is a scrollable UI panel (e.g., Inspector). Let the browser handle the scroll.
                return;
            }
            target = target.parentElement;
        }

        // If we're here, the scroll happened on a non-scrollable part of the UI.
        // We prevent the default action (scrolling the whole page).
        event.preventDefault();
    }


    /**
     * Converts a screen (canvas) position to world coordinates.
     * @param {Camera} camera The scene camera.
     * @param {HTMLCanvasElement} canvas The scene canvas.
     * @returns {{x: number, y: number}}
     */
    static getMouseWorldPosition(camera, canvas) {
        if (!canvas || !camera) return { x: 0, y: 0 };
        const canvasPos = this._mousePositionInCanvas;

        const worldX = (canvasPos.x - canvas.width / 2) / camera.effectiveZoom + camera.x;
        const worldY = (canvasPos.y - canvas.height / 2) / camera.effectiveZoom + camera.y;

        return { x: worldX, y: worldY };
    }
}

// Ensure it's a singleton-like static class
InputManager.initialized = false;

// Make it available as a global for scripts, and export for modules
window.Input = InputManager;
export { InputManager };
