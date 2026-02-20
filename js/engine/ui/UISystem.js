import * as Components from '../Components.js';
import * as SceneManager from '../SceneManager.js';
import { InputManager as Input } from '../Input.js';
import * as UITransformUtils from '../UITransformUtils.js';

let activeScene = null;
let hoveredButton = null;
let hoveredTriggers = new Set();
let pressedTriggers = new Set();
let originalSpriteCache = new WeakMap(); // Cache original sprites for sprite swap

export function initialize(scene) {
    activeScene = scene;
    hoveredTriggers.clear();
    pressedTriggers.clear();
}

export function update(deltaTime) {
    if (!activeScene) return;

    handleButtonStates();
    handleEventTriggers();
    checkForClicks();
}

function handleButtonStates() {
    if (!activeScene) return;
    const canvases = activeScene.findAllMateriasWithComponent(Components.Canvas);
    const mousePos = Input.getMousePosition();
    let currentHoveredButton = null;

    for (const canvasMateria of canvases) {
        if (!canvasMateria.isActive) continue;
        const canvas = canvasMateria.getComponent(Components.Canvas);
        const buttons = activeScene.findAllMateriasWithComponent(Components.Button, canvasMateria);

        for (const buttonMateria of buttons) {
            if (!buttonMateria.isActive) continue;

            const button = buttonMateria.getComponent(Components.Button);
            const image = buttonMateria.getComponent(Components.UIImage);
            const animator = buttonMateria.getComponent(Components.AnimatorController);

            if (image && !originalSpriteCache.has(button)) {
                originalSpriteCache.set(button, image.source);
            }

            if (!button.interactable) {
                if (button.transition === 'Color Tint' && image) image.color = button.colors.disabledColor;
                else if (button.transition === 'Sprite Swap' && image && button.spriteSwap.disabledSprite) {
                    image.source = button.spriteSwap.disabledSprite;
                    image.loadSprite(window.projectsDirHandle);
                } else if (button.transition === 'Animation' && animator && button.animationTriggers.disabledTrigger) {
                    animator.play(button.animationTriggers.disabledTrigger);
                }
                continue;
            }

            const screenRect = UITransformUtils.getScreenRect(buttonMateria, canvas);
            const isHovered = mousePos.x >= screenRect.x && mousePos.x <= screenRect.x + screenRect.width &&
                            mousePos.y >= screenRect.y && mousePos.y <= screenRect.y + screenRect.height;

            if (isHovered) {
                currentHoveredButton = button;
                if (button.transition === 'Sprite Swap' && image && button.spriteSwap.highlightedSprite) {
                    image.source = button.spriteSwap.highlightedSprite;
                    image.loadSprite(window.projectsDirHandle);
                } else if (button.transition === 'Animation' && animator && button.animationTriggers.highlightedTrigger) {
                    animator.play(button.animationTriggers.highlightedTrigger);
                }
                break;
            } else {
                if (button.transition === 'Color Tint' && image) image.color = button.colors.normalColor;
                else if (button.transition === 'Sprite Swap' && image) {
                    const originalSprite = originalSpriteCache.get(button);
                    if (image.source !== originalSprite) {
                        image.source = originalSprite;
                        image.loadSprite(window.projectsDirHandle);
                    }
                }
            }
        }
        if (currentHoveredButton) break;
    }

    if (hoveredButton && hoveredButton !== currentHoveredButton) {
        // Mouse left the previously hovered button
        const image = hoveredButton.materia.getComponent(Components.UIImage);
        const animator = hoveredButton.materia.getComponent(Components.AnimatorController);
        if (hoveredButton.interactable) {
            if (hoveredButton.transition === 'Color Tint' && image) image.color = hoveredButton.colors.normalColor;
            else if (hoveredButton.transition === 'Sprite Swap' && image) {
                const originalSprite = originalSpriteCache.get(hoveredButton);
                if (image.source !== originalSprite) {
                    image.source = originalSprite;
                    image.loadSprite(window.projectsDirHandle);
                }
            } else if (hoveredButton.transition === 'Animation' && animator && hoveredButton.animationTriggers.highlightedTrigger) {
                // Typically you'd have a "Normal" trigger, but for now, we do nothing to revert
            }
        }
    }
    hoveredButton = currentHoveredButton;
}

function handleEventTriggers() {
    if (!activeScene) return;
    const canvases = activeScene.findAllMateriasWithComponent(Components.Canvas);
    const mousePos = Input.getMousePosition();
    const mouseDelta = Input.getMouseDelta();
    const currentHoveredTriggers = new Set();

    for (const canvasMateria of canvases) {
        if (!canvasMateria.isActive) continue;
        const canvas = canvasMateria.getComponent(Components.Canvas);
        const triggers = activeScene.findAllMateriasWithComponent(Components.UIEventTrigger, canvasMateria);

        for (const triggerMateria of triggers) {
            if (!triggerMateria.isActive) continue;
            const trigger = triggerMateria.getComponent(Components.UIEventTrigger);
            if (!trigger.interactable) continue;

            const screenRect = UITransformUtils.getScreenRect(triggerMateria, canvas);
            const isHovered = mousePos.x >= screenRect.x && mousePos.x <= screenRect.x + screenRect.width &&
                            mousePos.y >= screenRect.y && mousePos.y <= screenRect.y + screenRect.height;

            if (isHovered) {
                currentHoveredTriggers.add(trigger);
            }
        }
    }

    const eventData = {
        position: mousePos,
        delta: mouseDelta,
        duration: 0,
        localScroll: { x: 0, y: 0 } // Potential future use
    };

    // Enter events
    for (const trigger of currentHoveredTriggers) {
        if (!hoveredTriggers.has(trigger)) {
            dispatchUIEvent(trigger, 'onPointerEnter', eventData);
        }
    }

    // Exit events
    for (const trigger of hoveredTriggers) {
        if (!currentHoveredTriggers.has(trigger)) {
            dispatchUIEvent(trigger, 'onPointerExit', eventData);
        }
    }

    hoveredTriggers = currentHoveredTriggers;

    // Down events
    if (Input.getMouseButtonDown(0)) {
        for (const trigger of hoveredTriggers) {
            pressedTriggers.add(trigger);
            dispatchUIEvent(trigger, 'onPointerDown', eventData);
        }
    }

    // Drag and Hold events
    if (Input.getMouseButton(0)) {
        eventData.duration = Input.getMouseButtonDuration(0);
        for (const trigger of pressedTriggers) {
            // Drag
            if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
                dispatchUIEvent(trigger, 'onPointerDrag', eventData);
            }
            // Hold
            if (eventData.duration > 0.5) {
                 dispatchUIEvent(trigger, 'onPointerHold', eventData);
            }
        }
    }

    // Up and Click events
    if (Input.getMouseButtonUp(0)) {
        for (const trigger of pressedTriggers) {
            dispatchUIEvent(trigger, 'onPointerUp', eventData);
            if (hoveredTriggers.has(trigger)) {
                dispatchUIEvent(trigger, 'onPointerClick', eventData);
            }
        }
        pressedTriggers.clear();
    }
}

function dispatchUIEvent(trigger, eventName, eventData = {}) {
    if (!trigger || !trigger.events) return;

    // Calculate local position relative to the trigger's center if possible
    const triggerMateria = trigger.materia;
    const canvasMateria = triggerMateria.findAncestorWithComponent(Components.Canvas);
    if (canvasMateria) {
        const canvas = canvasMateria.getComponent(Components.Canvas);
        const screenRect = UITransformUtils.getScreenRect(triggerMateria, canvas);
        if (screenRect) {
            eventData.localHoldPosition = {
                x: eventData.position.x - (screenRect.x + screenRect.width / 2),
                y: eventData.position.y - (screenRect.y + screenRect.height / 2)
            };
            // Normalized position (-1 to 1)
            eventData.normalizedPosition = {
                x: eventData.localHoldPosition.x / (screenRect.width / 2),
                y: eventData.localHoldPosition.y / (screenRect.height / 2)
            };
        }
    }

    const eventList = trigger.events[eventName];
    if (eventList && eventList.length > 0) {
        for (const event of eventList) {
            executeUIEvent(event, eventData);
        }
    }

    // Also try to call method on scripts directly if they exist
    const scripts = trigger.materia.getComponents(Components.CreativeScript);
    for (const script of scripts) {
        if (script.instance) {
            // Check for English name
            if (typeof script.instance[eventName] === 'function') {
                script.instance[eventName](eventData);
            }
            // Check for Spanish name
            const spanishName = eventNameAliases[eventName];
            if (spanishName && typeof script.instance[spanishName] === 'function') {
                script.instance[spanishName](eventData);
            }
        }
    }
}

const eventNameAliases = {
    'onPointerDown': 'alPresionar',
    'onPointerUp': 'alSoltar',
    'onPointerEnter': 'alEntrar',
    'onPointerExit': 'alSalir',
    'onPointerClick': 'alHacerClick',
    'onPointerDrag': 'alDeslizar',
    'onPointerHold': 'alMantener'
};

function executeUIEvent(event, eventData) {
    if (!event.targetMateriaId || !event.functionName) return;
    const targetMateria = activeScene.findMateriaById(event.targetMateriaId);
    if (!targetMateria) return;
    const scripts = targetMateria.getComponents(Components.CreativeScript);
    if (scripts.length === 0) return;
    const targetScript = scripts.find(s => s.scriptName === event.scriptName) || scripts[0];
    const scriptInstance = targetScript.instance;
    if (scriptInstance && typeof scriptInstance[event.functionName] === 'function') {
        scriptInstance[event.functionName](eventData);
    }
}

function checkForClicks() {
    if (!Input.getMouseButtonDown(0) || !hoveredButton) {
        return;
    }

    const button = hoveredButton;
    const buttonMateria = button.materia;
    const image = buttonMateria.getComponent(Components.UIImage);
    const animator = buttonMateria.getComponent(Components.AnimatorController);

    if (button.transition === 'Color Tint' && image) {
        image.color = button.colors.pressedColor;
        setTimeout(() => { if (button.interactable) image.color = button.colors.normalColor; }, 150);
    } else if (button.transition === 'Sprite Swap' && image && button.spriteSwap.pressedSprite) {
        image.source = button.spriteSwap.pressedSprite;
        image.loadSprite(window.projectsDirHandle);
        setTimeout(() => {
            if (button.interactable && hoveredButton === button && button.spriteSwap.highlightedSprite) {
                image.source = button.spriteSwap.highlightedSprite;
                image.loadSprite(window.projectsDirHandle);
            }
        }, 150);
    } else if (button.transition === 'Animation' && animator && button.animationTriggers.pressedTrigger) {
        animator.play(button.animationTriggers.pressedTrigger);
    }

    // --- Execute onClick Events ---
    if (button.onClick && button.onClick.length > 0) {
        for (const event of button.onClick) {
            executeUIEvent(event);
        }
    }
}
