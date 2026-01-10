import * as Components from '../Components.js';
import * as SceneManager from '../SceneManager.js';
import * as Input from '../Input.js';
import * as UITransformUtils from '../UITransformUtils.js';

let activeScene = null;
let hoveredButton = null;
let originalSpriteCache = new WeakMap(); // Cache original sprites for sprite swap

export function initialize(scene) {
    activeScene = scene;
}

export function update(deltaTime) {
    if (!activeScene) return;

    handleButtonStates();
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
        const canvasElement = document.getElementById(canvas.renderMode === 'Screen Space' ? 'game-canvas' : 'scene-canvas');
        if (!canvasElement) continue;

        const canvasRect = canvasElement.getBoundingClientRect();
        const canvasSize = { width: canvasRect.width, height: canvasRect.height };
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
                    image.loadSprite(SceneManager.projectsDirHandle);
                } else if (button.transition === 'Animation' && animator && button.animationTriggers.disabledTrigger) {
                    animator.play(button.animationTriggers.disabledTrigger);
                }
                continue;
            }

            const uiTransform = buttonMateria.getComponent(Components.UITransform);
            const screenRect = UITransformUtils.getScreenRect(uiTransform, canvas, canvasSize);
            const isHovered = mousePos.x >= screenRect.x && mousePos.x <= screenRect.x + screenRect.width &&
                            mousePos.y >= screenRect.y && mousePos.y <= screenRect.y + screenRect.height;

            if (isHovered) {
                currentHoveredButton = button;
                if (button.transition === 'Sprite Swap' && image && button.spriteSwap.highlightedSprite) {
                    image.source = button.spriteSwap.highlightedSprite;
                    image.loadSprite(SceneManager.projectsDirHandle);
                } else if (button.transition === 'Animation' && animator && button.animationTriggers.highlightedTrigger) {
                    animator.play(button.animationTriggers.highlightedTrigger);
                }
                break;
            } else {
                if (button.transition === 'Color Tint' && image) image.color = button.colors.normalColor;
                else if (button.transition === 'Sprite Swap' && image) {
                    image.source = originalSpriteCache.get(button);
                    image.loadSprite(SceneManager.projectsDirHandle);
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
                image.source = originalSpriteCache.get(hoveredButton);
                image.loadSprite(SceneManager.projectsDirHandle);
            } else if (hoveredButton.transition === 'Animation' && animator && hoveredButton.animationTriggers.highlightedTrigger) {
                // Typically you'd have a "Normal" trigger, but for now, we do nothing to revert
            }
        }
    }
    hoveredButton = currentHoveredButton;
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
        image.loadSprite(SceneManager.projectsDirHandle);
        setTimeout(() => {
            if (button.interactable && hoveredButton === button && button.spriteSwap.highlightedSprite) {
                image.source = button.spriteSwap.highlightedSprite;
                image.loadSprite(SceneManager.projectsDirHandle);
            }
        }, 150);
    } else if (button.transition === 'Animation' && animator && button.animationTriggers.pressedTrigger) {
        animator.play(button.animationTriggers.pressedTrigger);
    }

    // --- Execute onClick Events ---
    if (button.onClick && button.onClick.length > 0) {
        for (const event of button.onClick) {
            if (!event.targetMateriaId || !event.functionName) continue;
            const targetMateria = activeScene.findMateriaById(event.targetMateriaId);
            if (!targetMateria) continue;
            const scripts = targetMateria.getComponents(Components.CreativeScript);
            if (scripts.length === 0) continue;
            const targetScript = scripts.find(s => s.scriptName === event.scriptName) || scripts[0];
            const scriptInstance = targetScript.instance;
            if (scriptInstance && typeof scriptInstance[event.functionName] === 'function') {
                scriptInstance[event.functionName]();
            }
        }
    }
}
