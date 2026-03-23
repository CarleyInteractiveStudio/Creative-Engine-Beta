import * as Components from '../Components.js';
import * as SceneManager from '../SceneManager.js';
import { InputManager as Input } from '../Input.js';
import * as UITransformUtils from '../UITransformUtils.js';
import * as RuntimeAPIManager from '../RuntimeAPIManager.js';

let activeScene = null;
let hoveredButton = null;
let hoveredTriggers = new Set();
let pressedTriggers = new Set();
let activeSlider = null;
let activeScroll = null;

let gamepadFocusedMateria = null;
let gamepadCooldown = 0;
let originalSpriteCache = new WeakMap(); // Cache original sprites for sprite swap

export function initialize(scene) {
    activeScene = scene;
    hoveredTriggers.clear();
    pressedTriggers.clear();
    gamepadFocusedMateria = null;
    RuntimeAPIManager.setUISystem({ checkUIOverlap });
}

export function update(deltaTime) {
    if (!activeScene) return;

    if (gamepadCooldown > 0) gamepadCooldown -= deltaTime;

    handleGamepadNavigation();
    handleButtonStates();
    handleEventTriggers();
    handleSliders();
    handleScrolls();
    checkForClicks();
}

function handleGamepadNavigation() {
    if (!activeScene || Input.getConnectedGamepadCount() === 0) return;

    const moveX = Input.getGamepadAxis('LeftX') || (Input.getGamepadButton('Right') ? 1 : (Input.getGamepadButton('Left') ? -1 : 0));
    const moveY = Input.getGamepadAxis('LeftY') || (Input.getGamepadButton('Down') ? 1 : (Input.getGamepadButton('Up') ? -1 : 0));

    if (gamepadCooldown <= 0 && (Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5)) {
        navigateWithGamepad(moveX, moveY);
        gamepadCooldown = 0.2; // Cooldown to prevent rapid jumping
    }

    if (Input.getGamepadButtonDown('A') || Input.getGamepadButtonDown('Cross')) {
        if (gamepadFocusedMateria) {
            const button = gamepadFocusedMateria.getComponent(Components.Button);
            if (button && button.interactable) {
                hoveredButton = button; // Temporarily simulate hover for click logic
                checkForClicks();
            }
        }
    }
}

function navigateWithGamepad(x, y) {
    const canvases = activeScene.findAllMateriasWithComponent(Components.Canvas);
    let allInteractables = [];

    for (const canvasMateria of canvases) {
        if (!canvasMateria.isActive) continue;
        const buttons = activeScene.findAllMateriasWithComponent(Components.Button, canvasMateria);
        const sliders = activeScene.findAllMateriasWithComponent(Components.ProgressBar, canvasMateria);
        allInteractables.push(...buttons.filter(b => b.isActive && b.getComponent(Components.Button).interactable));
        allInteractables.push(...sliders.filter(s => s.isActive && s.getComponent(Components.ProgressBar).interactable));
    }

    if (allInteractables.length === 0) return;

    if (!gamepadFocusedMateria) {
        gamepadFocusedMateria = allInteractables[0];
        return;
    }

    const currentRect = UITransformUtils.getScreenRect(gamepadFocusedMateria, gamepadFocusedMateria.findAncestorWithComponent(Components.Canvas).getComponent(Components.Canvas));
    const currentCenter = { x: currentRect.x + currentRect.width / 2, y: currentRect.y + currentRect.height / 2 };

    let bestMatch = null;
    let minScore = Infinity;

    for (const target of allInteractables) {
        if (target === gamepadFocusedMateria) continue;

        const targetRect = UITransformUtils.getScreenRect(target, target.findAncestorWithComponent(Components.Canvas).getComponent(Components.Canvas));
        const targetCenter = { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height / 2 };

        const dx = targetCenter.x - currentCenter.x;
        const dy = targetCenter.y - currentCenter.y;

        // Check if the target is in the correct general direction
        const isCorrectDirection = (Math.abs(x) > Math.abs(y)) ? (Math.sign(dx) === Math.sign(x)) : (Math.sign(dy) === Math.sign(y));

        if (isCorrectDirection) {
            // Distance score (prefer items in the movement axis)
            const score = (Math.abs(x) > Math.abs(y)) ? (Math.abs(dx) + Math.abs(dy) * 2) : (Math.abs(dy) + Math.abs(dx) * 2);
            if (score < minScore) {
                minScore = score;
                bestMatch = target;
            }
        }
    }

    if (bestMatch) {
        gamepadFocusedMateria = bestMatch;
    }
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
            const isMouseHovered = mousePos.x >= screenRect.x && mousePos.x <= screenRect.x + screenRect.width &&
                            mousePos.y >= screenRect.y && mousePos.y <= screenRect.y + screenRect.height;
            const isGamepadFocused = gamepadFocusedMateria === buttonMateria;
            const isHovered = isMouseHovered || isGamepadFocused;

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
    if (typeof event === 'function') {
        event(eventData);
        return;
    }
    if (!event || !event.targetMateriaId || !event.functionName) return;
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

function handleSliders() {
    if (!activeScene) return;
    const sliders = activeScene.findAllMateriasWithComponent(Components.ProgressBar);
    const mousePos = Input.getMousePosition();
    const isMouseDown = Input.getMouseButton(0);

    if (!isMouseDown) {
        activeSlider = null;
    }

    if (activeSlider) {
        const slider = activeSlider.getComponent(Components.ProgressBar);
        const canvasMateria = activeSlider.findAncestorWithComponent(Components.Canvas);
        const canvas = canvasMateria.getComponent(Components.Canvas);
        const screenRect = UITransformUtils.getScreenRect(activeSlider, canvas);

        let newValue;
        if (slider.orientation === 'Horizontal') {
            const ratio = (mousePos.x - screenRect.x) / screenRect.width;
            newValue = ratio * slider.maxValue;
        } else {
            const ratio = 1 - (mousePos.y - screenRect.y) / screenRect.height;
            newValue = ratio * slider.maxValue;
        }
        slider.value = Math.max(0, Math.min(slider.maxValue, newValue));

        const scrollRect = activeSlider.getComponentInParent(Components.UIScrollRect);
        if (scrollRect) {
            if (scrollRect.verticalScrollbar === activeSlider || scrollRect.verticalScrollbar === activeSlider.id || scrollRect.verticalScrollbar === activeSlider.name) {
                scrollRect.scrollPosition.y = slider.value;
            }
            if (scrollRect.horizontalScrollbar === activeSlider || scrollRect.horizontalScrollbar === activeSlider.id || scrollRect.horizontalScrollbar === activeSlider.name) {
                scrollRect.scrollPosition.x = slider.value;
            }
        }
        return;
    }

    for (const sliderMateria of sliders) {
        const slider = sliderMateria.getComponent(Components.ProgressBar);
        if (!slider.interactable || !sliderMateria.isActive) continue;

        const canvasMateria = sliderMateria.findAncestorWithComponent(Components.Canvas);
        if (!canvasMateria) continue;
        const canvas = canvasMateria.getComponent(Components.Canvas);

        const screenRect = UITransformUtils.getScreenRect(sliderMateria, canvas);
        const isMouseHovered = mousePos.x >= screenRect.x && mousePos.x <= screenRect.x + screenRect.width &&
                        mousePos.y >= screenRect.y && mousePos.y <= screenRect.y + screenRect.height;
        const isGamepadFocused = gamepadFocusedMateria === sliderMateria;
        const isHovered = isMouseHovered || isGamepadFocused;

        if (isHovered && Input.getMouseButtonDown(0)) {
            activeSlider = sliderMateria;
            break;
        }
    }
}

function handleScrolls() {
    if (!activeScene) return;
    const scrolls = activeScene.findAllMateriasWithComponent(Components.UIScrollRect);
    const mousePos = Input.getMousePosition();
    const mouseDelta = Input.getMouseDelta();
    const wheel = Input.getMouseWheel();
    const isMouseDown = Input.getMouseButton(0);

    if (!isMouseDown) activeScroll = null;

    if (activeScroll) {
        const scroll = activeScroll.getComponent(Components.UIScrollRect);
        if (scroll.horizontal) {
            scroll.scrollPosition.x -= mouseDelta.x;
            scroll._velocity.x = -mouseDelta.x / (1/60);
        }
        if (scroll.vertical) {
            scroll.scrollPosition.y -= mouseDelta.y;
            scroll._velocity.y = -mouseDelta.y / (1/60);
        }
        return;
    }

    for (const scrollMateria of scrolls) {
        if (!scrollMateria.isActive) continue;
        const scroll = scrollMateria.getComponent(Components.UIScrollRect);
        const canvasMateria = scrollMateria.findAncestorWithComponent(Components.Canvas);
        if (!canvasMateria) continue;
        const canvas = canvasMateria.getComponent(Components.Canvas);

        const screenRect = UITransformUtils.getScreenRect(scrollMateria, canvas);
        const isHovered = mousePos.x >= screenRect.x && mousePos.x <= screenRect.x + screenRect.width &&
                        mousePos.y >= screenRect.y && mousePos.y <= screenRect.y + screenRect.height;

        // Wheel scroll
        if (isHovered && (wheel.x !== 0 || wheel.y !== 0)) {
            if (scroll.horizontal) scroll.scrollPosition.x += wheel.y * scroll.scrollSensitivity;
            if (scroll.vertical) scroll.scrollPosition.y += wheel.y * scroll.scrollSensitivity;
        }

        // Drag scroll
        if (isHovered && Input.getMouseButtonDown(0)) {
            activeScroll = scrollMateria;
            break;
        }
    }
}

/**
 * Comprueba si dos elementos UI se solapan en pantalla.
 */
export function checkUIOverlap(mtrA, mtrB) {
    const canvasA = mtrA.findAncestorWithComponent(Components.Canvas);
    const canvasB = mtrB.findAncestorWithComponent(Components.Canvas);
    if (!canvasA || !canvasB) return false;

    const rectA = UITransformUtils.getScreenRect(mtrA, canvasA.getComponent(Components.Canvas));
    const rectB = UITransformUtils.getScreenRect(mtrB, canvasB.getComponent(Components.Canvas));

    return rectA.x < rectB.x + rectB.width &&
           rectA.x + rectA.width > rectB.x &&
           rectA.y < rectB.y + rectB.height &&
           rectA.y + rectA.height > rectB.y;
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
