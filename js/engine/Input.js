/**
 * @fileoverview Manages all user input, including keyboard and mouse.
 * Provides a simple static API for querying input states.
 */

class InputManager {
    static _gameWindows = new Set();
    static _keys = new Map();
    static _keysDown = new Set();
    static _keysUp = new Set();

    static _gamepads = [];
    static _gamepadStates = new Map(); // index -> state object

    static _mouseButtons = new Map();
    static _buttonsDown = new Set();
    static _buttonsUp = new Set();

    static _mousePosition = { x: 0, y: 0 };
    static _mousePositionInCanvas = { x: 0, y: 0 };
    static _mouseDelta = { x: 0, y: 0 };
    static _mouseWheelDelta = { x: 0, y: 0 };
    static _buttonsDownTime = new Map();
    static _canvasRect = null;
    static _sceneCanvas = null;
    static _gameCanvas = null;
    static _activeCanvas = null;
    static _isGameRunning = false;

    static get sceneCanvas() { return this._sceneCanvas; }
    static get gameCanvas() { return this._gameCanvas; }
    static get activeCanvas() { return this._activeCanvas; }

    // Mobile Virtual Controls
    static _virtualKeys = new Map();
    static _hasVirtualControls = false;

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
        this._mouseWheelDelta.x = 0;
        this._mouseWheelDelta.y = 0;

        this._pollGamepads();

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
        targetWindow.addEventListener('blur', this._onBlur.bind(this));
        targetWindow.addEventListener('focus', this._onBlur.bind(this));

        // Listen for mouse events on the window to ensure we catch releases outside the canvas
        targetWindow.addEventListener('mousedown', this._onWindowMouseDown.bind(this));
        targetWindow.addEventListener('mouseup', this._onWindowMouseUp.bind(this));

        // Also listen for mouse move on the window to track position even when not over canvas
        targetWindow.addEventListener('mousemove', (e) => {
            // Update delta even when moving outside the canvas while a button is likely pressed
            const dx = e.clientX - this._mousePosition.x;
            const dy = e.clientY - this._mousePosition.y;

            // Prevent huge deltas on first move or window focus
            if (Math.abs(dx) < 2000 && Math.abs(dy) < 2000) {
                this._mouseDelta.x += dx;
                this._mouseDelta.y += dy;
            }

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
        targetWindow.removeEventListener('mousedown', this._onWindowMouseDown.bind(this));
        targetWindow.removeEventListener('mouseup', this._onWindowMouseUp.bind(this));
    }

    // Keyboard Methods
    static _onKeyDown(event) {
        if (event.target.matches('input, textarea, select')) return;

        // If the engine is playing, ignore keyboard input unless:
        // 1. It comes from an external game window
        // 2. The active canvas is a game canvas (integrated mode)
        const isFromGameWindow = this._gameWindows.has(event.view);

        // In hybrid mode, both gameCanvas and gameCanvas3d are valid for game input
        const isGameCanvas = (this._activeCanvas && (this._activeCanvas.id === 'game-canvas' || this._activeCanvas.id === 'game-canvas-3d'));

        if (this._isGameRunning && !isFromGameWindow && !isGameCanvas) return;

        const key = event.key;
        const keysToSet = key.length === 1 ? [key.toLowerCase(), key.toUpperCase()] : [key];
        for (const k of keysToSet) {
            if (!this._keys.get(k)) {
                this._keysDown.add(k);
            }
            this._keys.set(k, true);
        }
    }

    static _onKeyUp(event) {
        if (event.target.matches('input, textarea, select')) return;

        // For robustness and to avoid any keys getting stuck (such as the crouch key),
        // we always register the keyup event to set key state to false,
        // even if focus/active canvas conditions are not fully met.
        const key = event.key;
        const keysToSet = key.length === 1 ? [key.toLowerCase(), key.toUpperCase()] : [key];
        for (const k of keysToSet) {
            this._keys.set(k, false);
            this._keysUp.add(k);
        }

        const isFromGameWindow = this._gameWindows.has(event.view);
        const isGameCanvas = (this._activeCanvas && (this._activeCanvas.id === 'game-canvas' || this._activeCanvas.id === 'game-canvas-3d'));

        if (this._isGameRunning && !isFromGameWindow && !isGameCanvas) return;
    }

    /**
     * Checks if a key is currently being held down.
     * @param {string} key The key to check (e.g., 'w', 'a', 'Space').
     * @returns {boolean} True if the key is pressed.
     */
    static getKey(key) {
        const normalized = this.normalizeKeyName(key);
        // Direct match
        if (this._keys.get(normalized) || this._virtualKeys.get(normalized)) return true;
        // Case-insensitive match for single characters (A-Z)
        if (normalized.length === 1) {
            return !!this._keys.get(normalized.toLowerCase()) || !!this._keys.get(normalized.toUpperCase()) ||
                   !!this._virtualKeys.get(normalized.toLowerCase()) || !!this._virtualKeys.get(normalized.toUpperCase());
        }
        return false;
    }

    /**
     * Checks if a key was pressed down during the current frame.
     * @param {string} key The key to check.
     * @returns {boolean} True if the key was just pressed.
     */
    static getKeyDown(key) {
        const normalized = this.normalizeKeyName(key);
        if (this._keysDown.has(normalized)) return true;
        if (normalized.length === 1) {
            return this._keysDown.has(normalized.toLowerCase()) || this._keysDown.has(normalized.toUpperCase());
        }
        return false;
    }

    /**
     * Checks if a key was released during the current frame.
     * @param {string} key The key to check.
     * @returns {boolean} True if the key was just released.
     */
    static getKeyUp(key) {
        const normalized = this.normalizeKeyName(key);
        if (this._keysUp.has(normalized)) return true;
        if (normalized.length === 1) {
            return this._keysUp.has(normalized.toLowerCase()) || this._keysUp.has(normalized.toUpperCase());
        }
        return false;
    }

    /**
     * Normalizes a key name to support Spanish and friendly names.
     * @param {string} key
     * @returns {string}
     */
    static normalizeKeyName(key) {
        if (!key || typeof key !== 'string') return '';
        const k = key.toLowerCase();
        const map = {
            'espacio': ' ',
            'space': ' ',
            'enter': 'Enter',
            'intro': 'Enter',
            'escape': 'Escape',
            'esc': 'Escape',
            'flecha_arriba': 'ArrowUp',
            'up': 'ArrowUp',
            'flecha_abajo': 'ArrowDown',
            'down': 'ArrowDown',
            'flecha_izquierda': 'ArrowLeft',
            'left': 'ArrowLeft',
            'flecha_derecha': 'ArrowRight',
            'right': 'ArrowRight',
            'shift': 'Shift',
            'mayus': 'Shift',
            'control': 'Control',
            'ctrl': 'Control',
            'alt': 'Alt',
            'tab': 'Tab',
            'retroceso': 'Backspace',
            'backspace': 'Backspace',
            'suprimir': 'Delete',
            'delete': 'Delete'
        };

        if (map[k]) return map[k];

        // Handle a-z (ensure single character if it was a-z)
        if (k.length === 1) return k;

        return key; // Fallback to original
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

    // --- Gamepad Methods ---

    static _pollGamepads() {
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        this._gamepads = gps;

        for (let i = 0; i < gps.length; i++) {
            const gp = gps[i];
            if (!gp) continue;

            let state = this._gamepadStates.get(i);
            if (!state) {
                state = {
                    buttons: new Array(gp.buttons.length).fill(false),
                    buttonsDown: new Set(),
                    buttonsUp: new Set(),
                    axes: new Array(gp.axes.length).fill(0)
                };
                this._gamepadStates.set(i, state);
            }

            state.buttonsDown.clear();
            state.buttonsUp.clear();

            for (let b = 0; b < gp.buttons.length; b++) {
                const pressed = gp.buttons[b].pressed;
                if (pressed && !state.buttons[b]) {
                    state.buttonsDown.add(b);
                } else if (!pressed && state.buttons[b]) {
                    state.buttonsUp.add(b);
                }
                state.buttons[b] = pressed;
            }

            for (let a = 0; a < gp.axes.length; a++) {
                // Apply small deadzone
                let val = gp.axes[a];
                if (Math.abs(val) < 0.1) val = 0;
                state.axes[a] = val;
            }
        }
    }

    static _getGamepadButtonIndex(name) {
        const map = {
            'a': 0, 'cross': 0,
            'b': 1, 'circle': 1,
            'x': 2, 'square': 2,
            'y': 3, 'triangle': 3,
            'lb': 4, 'l1': 4,
            'rb': 5, 'r1': 5,
            'lt': 6, 'l2': 6,
            'rt': 7, 'r2': 7,
            'back': 8, 'select': 8, 'share': 8,
            'start': 9, 'options': 9,
            'lsb': 10, 'l3': 10,
            'rsb': 11, 'r3': 11,
            'up': 12, 'arriba': 12,
            'down': 13, 'abajo': 13,
            'left': 14, 'izquierda': 14,
            'right': 15, 'derecha': 15,
            'home': 16, 'guide': 16
        };
        return map[name.toLowerCase()];
    }

    /**
     * Checks if a gamepad button is currently pressed.
     */
    static getGamepadButton(button, gamepadIndex = 0) {
        const state = this._gamepadStates.get(gamepadIndex);
        if (!state) return false;

        const index = typeof button === 'string' ? this._getGamepadButtonIndex(button) : button;
        return !!state.buttons[index];
    }

    static getGamepadButtonDown(button, gamepadIndex = 0) {
        const state = this._gamepadStates.get(gamepadIndex);
        if (!state) return false;

        const index = typeof button === 'string' ? this._getGamepadButtonIndex(button) : button;
        return state.buttonsDown.has(index);
    }

    static getGamepadButtonUp(button, gamepadIndex = 0) {
        const state = this._gamepadStates.get(gamepadIndex);
        if (!state) return false;

        const index = typeof button === 'string' ? this._getGamepadButtonIndex(button) : button;
        return state.buttonsUp.has(index);
    }

    /**
     * Gets the value of a gamepad axis (-1 to 1).
     */
    static getGamepadAxis(axis, gamepadIndex = 0) {
        const state = this._gamepadStates.get(gamepadIndex);
        if (!state) return 0;

        let index = axis;
        if (typeof axis === 'string') {
            const map = {
                'leftx': 0, 'izquierdax': 0,
                'lefty': 1, 'izquierday': 1,
                'rightx': 2, 'derechax': 2,
                'righty': 3, 'derechay': 3
            };
            index = map[axis.toLowerCase()];
        }
        return state.axes[index] || 0;
    }

    // Spanish Aliases
    static mandoBotonPresionado(boton, mando = 0) { return this.getGamepadButton(boton, mando); }
    static mandoBotonRecienPresionado(boton, mando = 0) { return this.getGamepadButtonDown(boton, mando); }
    static mandoBotonLiberado(boton, mando = 0) { return this.getGamepadButtonUp(boton, mando); }
    static mandoEje(eje, mando = 0) { return this.getGamepadAxis(eje, mando); }

    static isGamepadConnected(index = 0) {
        return !!this._gamepads[index];
    }

    static getConnectedGamepadCount() {
        return this._gamepads.filter(gp => !!gp).length;
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

    static _onBlur() {
        this.clearAllInputs();
        console.log('[InputManager] Focus lost: All inputs released.');
    }

    /**
     * Resets all input states (keys, buttons, deltas).
     */
    static clearAllInputs() {
        this._virtualKeys.clear();
        this._keys.clear();
        this._mouseButtons.clear();
        this._keysDown.clear();
        this._buttonsDown.clear();
        this._buttonsUp.clear();
        this._keysUp.clear();
        this._mouseDelta.x = 0;
        this._mouseDelta.y = 0;
        this._mouseWheelDelta.x = 0;
        this._mouseWheelDelta.y = 0;
    }

    static _onWindowMouseDown(event) {
        // Only trigger if not already handled by canvas (optional, but avoids double counts)
        // Actually, _onPointerDown handles double clicks via Map
        this._onPointerDown(event.button);
    }

    static _onWindowMouseUp(event) {
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
        // Only prevent default if we are NOT scrolling a UI panel
        if (event.target.closest('.panel-content')) {
            // Let the UI scroll naturally
        } else {
            event.preventDefault();
        }

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
            // Reset delta on press to avoid jumps from previous frames
            this._mouseDelta.x = 0;
            this._mouseDelta.y = 0;
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
     * Gets the mouse wheel delta since the last frame.
     * @returns {{x: number, y: number}}
     */
    static getMouseWheel() {
        return this._mouseWheelDelta;
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
        this._mouseWheelDelta.x += event.deltaX;
        this._mouseWheelDelta.y += event.deltaY;

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
        // World Y increases upwards (+Y UP)
        const worldY = (canvas.height / 2 - canvasPos.y) / camera.effectiveZoom + camera.y;

        return { x: worldX, y: worldY };
    }

    // --- Virtual Controls Support ---

    static setupDefaultVirtualControls() {
        if (this._hasVirtualControls) return;

        // Detect mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;

        console.log("[InputManager] Injecting default virtual controls for mobile...");

        const container = document.createElement('div');
        container.id = 'ce-virtual-controls';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 0;
            width: 100%;
            height: 180px;
            pointer-events: none;
            z-index: 10000;
            display: flex;
            justify-content: space-between;
            padding: 0 20px;
            box-sizing: border-box;
            user-select: none;
            -webkit-user-select: none;
        `;

        // Left Side: D-Pad
        const dpad = document.createElement('div');
        dpad.style.cssText = `
            position: relative;
            width: 150px;
            height: 150px;
            pointer-events: auto;
        `;

        const createKeyBtn = (label, key, top, left, width, height) => {
            const btn = document.createElement('div');
            btn.textContent = label;
            btn.style.cssText = `
                position: absolute;
                top: ${top};
                left: ${left};
                width: ${width};
                height: ${height};
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.4);
                border-radius: 12px;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 20px;
                backdrop-filter: blur(5px);
            `;

            const press = () => {
                if (!this._virtualKeys.get(key)) {
                    this._keysDown.add(key);
                }
                this._virtualKeys.set(key, true);
                btn.style.background = 'rgba(255, 255, 255, 0.5)';
            };

            const release = () => {
                this._virtualKeys.set(key, false);
                this._keysUp.add(key);
                btn.style.background = 'rgba(255, 255, 255, 0.2)';
            };

            btn.addEventListener('touchstart', (e) => { e.preventDefault(); press(); });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); release(); });
            btn.addEventListener('touchcancel', (e) => { e.preventDefault(); release(); });

            return btn;
        };

        dpad.appendChild(createKeyBtn('↑', 'ArrowUp', '0', '50px', '50px', '50px'));
        dpad.appendChild(createKeyBtn('↓', 'ArrowDown', '100px', '50px', '50px', '50px'));
        dpad.appendChild(createKeyBtn('←', 'ArrowLeft', '50px', '0', '50px', '50px'));
        dpad.appendChild(createKeyBtn('→', 'ArrowRight', '50px', '100px', '50px', '50px'));

        // Right Side: Action Buttons
        const actions = document.createElement('div');
        actions.style.cssText = `
            position: relative;
            width: 150px;
            height: 150px;
            pointer-events: auto;
        `;

        actions.appendChild(createKeyBtn('A', ' ', '50px', '80px', '60px', '60px')); // Jump/Space
        actions.appendChild(createKeyBtn('B', 'Control', '80px', '10px', '60px', '60px')); // Action

        container.appendChild(dpad);
        container.appendChild(actions);
        document.body.appendChild(container);

        this._hasVirtualControls = true;
    }
}

// Ensure it's a singleton-like static class
InputManager.initialized = false;

// Make it available as a global for scripts, and export for modules
window.Input = InputManager;
export { InputManager };
