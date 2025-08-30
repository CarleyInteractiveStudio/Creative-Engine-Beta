/**
 * @fileoverview Manages all user input, including keyboard and mouse.
 * Provides a simple static API for querying input states.
 */

class InputManager {
    static _keys: Map<string, boolean> = new Map();
    static _keysDown: Set<string> = new Set();
    static _keysUp: Set<string> = new Set();

    static _mouseButtons: Map<number, boolean> = new Map();
    static _buttonsDown: Set<number> = new Set();
    static _buttonsUp: Set<number> = new Set();

    static _mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    static _mousePositionInCanvas: { x: number, y: number } = { x: 0, y: 0 };
    static _canvasRect: DOMRect | null = null;
    static _scrollDelta: number = 0;
    static _canvas: HTMLCanvasElement | null = null;

    // Long Press State
    static _longPressTimeoutId: number | null = null;
    static _longPressStartPosition: { x: number, y: number } = { x: 0, y: 0 };
    static LONG_PRESS_DURATION: number = 750; // ms
    static LONG_PRESS_TOLERANCE: number = 10; // pixels

    static initialized: boolean = false;

    /**
     * Initializes the InputManager. Attaches listeners to the window.
     * @param {HTMLCanvasElement} [canvas=null] Optional canvas element to calculate relative mouse positions.
     */
    static initialize(canvas: HTMLCanvasElement | null = null) {
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
    static _onKeyDown(event: KeyboardEvent) {
        const key = event.key;
        if (!this._keys.get(key)) {
            this._keysDown.add(key);
        }
        this._keys.set(key, true);
    }

    static _onKeyUp(event: KeyboardEvent) {
        const key = event.key;
        this._keys.set(key, false);
        this._keysUp.add(key);
    }

    /**
     * Checks if a key is currently being held down.
     * @param {string} key The key to check (e.g., 'w', 'a', 'Space').
     * @returns {boolean} True if the key is pressed.
     */
    static getKey(key: string): boolean {
        return !!this._keys.get(key);
    }

    /**
     * Checks if a key was pressed down during the current frame.
     * @param {string} key The key to check.
     * @returns {boolean} True if the key was just pressed.
     */
    static getKeyDown(key: string): boolean {
        return this._keysDown.has(key);
    }

    /**
     * Checks if a key was released during the current frame.
     * @param {string} key The key to check.
     * @returns {boolean} True if the key was just released.
     */
    static getKeyUp(key: string): boolean {
        return this._keysUp.has(key);
    }

    static getPressedKeys(): string[] {
        const pressed: string[] = [];
        for (const [key, isPressed] of this._keys.entries()) {
            if (isPressed) {
                pressed.push(key);
            }
        }
        return pressed;
    }

    // --- Pointer (Mouse + Touch) Methods ---

    static _onMouseMove(event: MouseEvent) {
        this._updatePointerPosition(event.clientX, event.clientY);
    }

    static _onMouseDown(event: MouseEvent) {
        this._onPointerDown(event.button);
    }

    static _onMouseUp(event: MouseEvent) {
        this._onPointerUp(event.button);
    }

    static _onTouchStart(event: TouchEvent) {
        event.preventDefault();
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            this._updatePointerPosition(touch.clientX, touch.clientY);
            this._onPointerDown(0); // Treat all touches as left-click

            // Start long-press timer
            this._longPressStartPosition = { x: touch.clientX, y: touch.clientY };
            this._clearLongPressTimer();
            this._longPressTimeoutId = window.setTimeout(() => {
                this._handleLongPress(event.target);
            }, this.LONG_PRESS_DURATION);
        }
    }

    static _onTouchMove(event: TouchEvent) {
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

    static _onTouchEnd(event: TouchEvent) {
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

    static _handleLongPress(targetElement: EventTarget | null) {
        console.log("Long press detected!");
        this._longPressTimeoutId = null;

        if (targetElement instanceof HTMLElement) {
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
    }

    // Unified handlers
    static _updatePointerPosition(clientX: number, clientY: number) {
        this._mousePosition.x = clientX;
        this._mousePosition.y = clientY;

        if (this._canvasRect) {
            this._mousePositionInCanvas.x = clientX - this._canvasRect.left;
            this._mousePositionInCanvas.y = clientY - this._canvasRect.top;
        }
    }

    static _onPointerDown(button: number) {
        if (!this._mouseButtons.get(button)) {
            this._buttonsDown.add(button);
        }
        this._mouseButtons.set(button, true);
    }

    static _onPointerUp(button: number) {
        this._mouseButtons.set(button, false);
        this._buttonsUp.add(button);
    }

    /**
     * Checks if a mouse button is currently being held down.
     * @param {number} button The button to check (0: Left, 1: Middle, 2: Right).
     * @returns {boolean} True if the button is pressed.
     */
    static getMouseButton(button: number): boolean {
        return !!this._mouseButtons.get(button);
    }

    /**
     * Checks if a mouse button was pressed down during the current frame.
     * @param {number} button The button to check.
     * @returns {boolean} True if the button was just pressed.
     */
    static getMouseButtonDown(button: number): boolean {
        return this._buttonsDown.has(button);
    }

    /**
     * Checks if a mouse button was released during the current frame.
     * @param {number} button The button to check.
     * @returns {boolean} True if the button was just released.
     */
    static getMouseButtonUp(button: number): boolean {
        return this._buttonsUp.has(button);
    }

    /**
     * Gets the mouse position relative to the viewport.
     * @returns {{x: number, y: number}}
     */
    static getMousePosition(): { x: number, y: number } {
        return this._mousePosition;
    }

    /**
     * Gets the mouse position relative to the scene canvas.
     * @returns {{x: number, y: number}}
     */
    static getMousePositionInCanvas(): { x: number, y: number } {
        return this._mousePositionInCanvas;
    }

    static _onWheel(event: WheelEvent) {
        this._scrollDelta = event.deltaY;
    }

    /**
     * Gets the scroll wheel delta for the current frame.
     * @returns {number} The vertical scroll amount.
     */
    static getScrollDelta(): number {
        return this._scrollDelta;
    }

    /**
     * Converts a screen (canvas) position to world coordinates.
     * @param {any} camera The scene camera.
     * @param {HTMLCanvasElement} canvas The scene canvas.
     * @returns {{x: number, y: number}}
     */
    static getMouseWorldPosition(camera: any, canvas: HTMLCanvasElement): { x: number, y: number } {
        if (!canvas || !camera) return { x: 0, y: 0 };
        const canvasPos = this._mousePositionInCanvas;

        const worldX = (canvasPos.x - canvas.width / 2) / camera.effectiveZoom + camera.x;
        const worldY = (canvasPos.y - canvas.height / 2) / camera.effectiveZoom + camera.y;

        return { x: worldX, y: worldY };
    }
}

// Make it available as a global for scripts, and export for modules
(window as any).Input = InputManager;
export { InputManager };
