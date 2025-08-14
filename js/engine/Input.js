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

    /**
     * Initializes the InputManager. Attaches listeners to the window.
     * @param {HTMLCanvasElement} [canvas=null] Optional canvas element to calculate relative mouse positions.
     */
    static initialize(canvas = null) {
        if (this.initialized) return;

        window.addEventListener('keydown', this._onKeyDown.bind(this));
        window.addEventListener('keyup', this._onKeyUp.bind(this));
        window.addEventListener('mousemove', this._onMouseMove.bind(this));
        window.addEventListener('mousedown', this._onMouseDown.bind(this));
        window.addEventListener('mouseup', this._onMouseUp.bind(this));

        if (canvas) {
            this._canvasRect = canvas.getBoundingClientRect();
        }

        this.initialized = true;
        console.log("InputManager Initialized.");
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

    // Mouse Methods
    static _onMouseMove(event) {
        this._mousePosition.x = event.clientX;
        this._mousePosition.y = event.clientY;

        if (this._canvasRect) {
            this._mousePositionInCanvas.x = event.clientX - this._canvasRect.left;
            this._mousePositionInCanvas.y = event.clientY - this._canvasRect.top;
        }
    }

    static _onMouseDown(event) {
        const button = event.button;
        if (!this._mouseButtons.get(button)) {
            this._buttonsDown.add(button);
        }
        this._mouseButtons.set(button, true);
    }



    static _onMouseUp(event) {
        const button = event.button;
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
}

// Ensure it's a singleton-like static class
InputManager.initialized = false;

// Make it available as a global for scripts, and export for modules
window.Input = InputManager;
export { InputManager };
