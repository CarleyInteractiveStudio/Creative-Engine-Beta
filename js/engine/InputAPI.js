// js/engine/InputAPI.js

import { InputManager } from './Input.js';

/**
 * Checks if a key is currently being held down.
 * @param {string} key - The key to check (e.g., 'w', 'a', 'space').
 * @returns {boolean} True if the key is held down.
 */
function isKeyPressed(key) {
    return InputManager.isKeyPressed(key.toLowerCase());
}

/**
 * Checks if a key was pressed down on this frame.
 * @param {string} key - The key to check.
 * @returns {boolean} True if the key was just pressed.
 */
function isKeyJustPressed(key) {
    return InputManager.isKeyJustPressed(key.toLowerCase());
}

/**
 * Checks if a key was released on this frame.
 * @param {string} key - The key to check.
 * @returns {boolean} True if the key was just released.
 */
function isKeyReleased(key) {
    return InputManager.isKeyReleased(key.toLowerCase());
}

// --- The Public API Object ---
const inputAPI = {
    isKeyPressed: isKeyPressed,
    isKeyJustPressed: isKeyJustPressed,
    isKeyReleased: isKeyReleased,

    // Spanish aliases
    teclaPresionada: isKeyPressed,
    teclaRecienPresionada: isKeyJustPressed,
    teclaLiberada: isKeyReleased,
};

export function getAPIs() {
    return inputAPI;
}
