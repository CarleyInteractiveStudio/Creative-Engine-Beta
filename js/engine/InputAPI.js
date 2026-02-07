// js/engine/InputAPI.js

import { InputManager } from './Input.js';

/**
 * Checks if a key is currently being held down.
 * @param {string} key - The key to check (e.g., 'w', 'a', 'space').
 * @returns {boolean} True if the key is held down.
 */
function isKeyPressed(key) {
    return InputManager.getKey(key.toLowerCase());
}

/**
 * Checks if a key was pressed down on this frame.
 * @param {string} key - The key to check.
 * @returns {boolean} True if the key was just pressed.
 */
function isKeyJustPressed(key) {
    return InputManager.getKeyDown(key.toLowerCase());
}

/**
 * Checks if a key was released on this frame.
 * @param {string} key - The key to check.
 * @returns {boolean} True if the key was just released.
 */
function isKeyReleased(key) {
    return InputManager.getKeyUp(key.toLowerCase());
}

/**
 * Checks if a mouse button is currently being held down.
 * @param {number} button - 0: Left, 1: Middle, 2: Right.
 */
function isMouseButtonPressed(button) {
    return InputManager.getMouseButton(button);
}

function isMouseButtonJustPressed(button) {
    return InputManager.getMouseButtonDown(button);
}

function isMouseButtonReleased(button) {
    return InputManager.getMouseButtonUp(button);
}

function getMousePosition() {
    return InputManager.getMousePositionInCanvas();
}

// --- The Public API Object ---
const inputAPI = {
    isKeyPressed: isKeyPressed,
    isKeyJustPressed: isKeyJustPressed,
    isKeyReleased: isKeyReleased,
    isMouseButtonPressed: isMouseButtonPressed,
    isMouseButtonJustPressed: isMouseButtonJustPressed,
    isMouseButtonReleased: isMouseButtonReleased,
    getMousePosition: getMousePosition,

    // Spanish aliases
    tecla: isKeyPressed, // Alias for ease of use in CHC
    teclaPresionada: isKeyPressed,
    teclaRecienPresionada: isKeyJustPressed,
    teclaLiberada: isKeyReleased,
    botonMousePresionado: isMouseButtonPressed,
    botonMouseRecienPresionado: isMouseButtonJustPressed,
    botonMouseLiberado: isMouseButtonReleased,
    obtenerPosicionMouse: getMousePosition,
};

export function getAPIs() {
    return inputAPI;
}
