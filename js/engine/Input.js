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
    static _scrollDelta = 0;

    // Long Press State
    static _longPressTimeoutId = null;
    static _longPressStartPosition = { x: 0, y: 0 };
    static LONG_PRESS_DURATION = 750; // ms
    static LONG_PRESS_TOLERANCE = 10; // pixels

    /**
     * Initializes the InputManager. Attaches listeners to the window.
     * @param {HTMLCanvasElement} [canvas=null] Optional canvas element to calculate relative mouse positions.
     */
    static initialize(canvas = null) {
        if (this.initialized) return;

        // Keyboard
        window.addEventListener('keydown', this._onKeyDown.bind(this));
        window.addEventListener('keyup', this._onKeyUp.bind(this));

        // Mouse
        window.addEventListener('mousemove', this._onMouseMove.bind(this));
        window.addEventListener('mousedown', this._onMouseDown.bind(this));
        window.addEventListener('mouseup', this._onMouseUp.bind(this));
        window.addEventListener('wheel', this._onWheel.bind(this));

        // Touch
        window.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
        window.addEventListener('touchcancel', this._onTouchEnd.bind(this), { passive: false });


        if (canvas) {
            this._canvas = canvas; // Store canvas reference
            this._canvasRect = canvas.getBoundingClientRect();
        }

        this.initialized = true;
        console.log("InputManager Initialized for Mouse and Touch.");
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
        this._scrollDelta = 0;

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
        this._updatePointerPosition(event.clientX, event.clientY);
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
            this._updatePointerPosition(touch.clientX, touch.clientY);
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
            this._updatePointerPosition(touch.clientX, touch.clientY);

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
    static _updatePointerPosition(clientX, clientY) {
        this._mousePosition.x = clientX;
        this._mousePosition.y = clientY;

        if (this._canvasRect) {
            this._mousePositionInCanvas.x = clientX - this._canvasRect.left;
            this._mousePositionInCanvas.y = clientY - this._canvasRect.top;
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
        this._scrollDelta = event.deltaY;
    }

    /**
     * Gets the scroll wheel delta for the current frame.
     * @returns {number} The vertical scroll amount.
     */
    static getScrollDelta() {
        return this._scrollDelta;
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
