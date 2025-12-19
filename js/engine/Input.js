/**
 * @fileoverview Manages all user input, including keyboard and mouse.
 * Provides a simple static API for querying input states.
 */

class InputManager {
    static _keys = new Map();
    static _keysDown = new Set();
    static _keysUp = new Set();

    static _mouseButtons = new Map();
    static _buttonsDown = new Set();
    static _buttonsUp = new Set();

    static _mousePosition = { x: 0, y: 0 };
    static _mousePositionInCanvas = { x: 0, y: 0 };
    static _canvasRect = null;

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
        window.addEventListener('keydown', this._onKeyDown.bind(this));
        window.addEventListener('keyup', this._onKeyUp.bind(this));
        window.addEventListener('wheel', this._onWheel.bind(this), { passive: false });

        const setupCanvasListeners = (canvas) => {
            if (!canvas) return;
            // Mouse
            canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
            canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
            canvas.addEventListener('mouseup', this._onMouseUp.bind(this));

            // Touch
            canvas.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
            canvas.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
            canvas.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
            canvas.addEventListener('touchcancel', this._onTouchEnd.bind(this), { passive: false });
        };

        if (sceneCanvas) {
            this._canvas = sceneCanvas; // Primary canvas for editor focus
            setupCanvasListeners(sceneCanvas);
        }
        if (gameCanvas) {
            setupCanvasListeners(gameCanvas);
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

        if (this._canvas) {
             this._canvasRect = this._canvas.getBoundingClientRect();
        }
    }

    // Keyboard Methods
    static _onKeyDown(event) {
        const key = event.key;
        if (!this._keys.get(key)) {
            this._keysDown.add(key);
        }
        this._keys.set(key, true);
    }

    static _onKeyUp(event) {
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
        }
        this._mouseButtons.set(button, true);
    }

    static _onPointerUp(button) {
        this._mouseButtons.set(button, false);
        this._buttonsUp.add(button);
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

    static _onWheel(event) {
        // If the scroll event is on the scene canvas, we do nothing here.
        // The dedicated listener in `SceneView.js` will handle it, including preventDefault.
        if (this._canvas && this._canvas.contains(event.target)) {
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
