import * as Components from '../Components.js';
import * as SceneManager from '../SceneManager.js';
import * as Input from '../Input.js';
import * as UITransformUtils from '../UITransformUtils.js';

let activeScene = null;
let hoveredButton = null;

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
        // We need the actual canvas element to get its dimensions
        const canvasElement = document.getElementById(canvas.renderMode === 'Screen Space' ? 'game-canvas' : 'scene-canvas');
        if (!canvasElement) continue;

        const canvasRect = canvasElement.getBoundingClientRect();
        const canvasSize = { width: canvasRect.width, height: canvasRect.height };

        const buttons = activeScene.findAllMateriasWithComponent(Components.Button, canvasMateria);

        for (const buttonMateria of buttons) {
            if (!buttonMateria.isActive) continue;

            const button = buttonMateria.getComponent(Components.Button);
            const image = buttonMateria.getComponent(Components.UIImage); // Needed for visual feedback

            if (!button.interactable) {
                if (image && image.color !== button.colors.disabledColor) {
                    image.color = button.colors.disabledColor;
                }
                continue;
            }

            const uiTransform = buttonMateria.getComponent(Components.UITransform);
            const screenRect = UITransformUtils.getScreenRect(uiTransform, canvas, canvasSize);

            const isHovered = mousePos.x >= screenRect.x &&
                            mousePos.x <= screenRect.x + screenRect.width &&
                            mousePos.y >= screenRect.y &&
                            mousePos.y <= screenRect.y + screenRect.height;


            if (isHovered) {
                currentHoveredButton = button;
                break;
            }
        }
        if (currentHoveredButton) break;
    }

    if (hoveredButton && hoveredButton !== currentHoveredButton) {
        // Mouse left the previously hovered button
        const image = hoveredButton.materia.getComponent(Components.UIImage);
        if (image && hoveredButton.interactable) {
            image.color = hoveredButton.colors.normalColor;
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
    if (image) {
        image.color = button.colors.pressedColor;
        setTimeout(() => {
            if (button.interactable) {
                 image.color = (hoveredButton === button) ? button.colors.normalColor : button.colors.normalColor;
            }
        }, 150);
    }

    // --- Execute onClick Events ---
    if (button.onClick && button.onClick.length > 0) {
        console.log(`Button "${buttonMateria.name}" clicked. Executing ${button.onClick.length} event(s).`);

        for (const event of button.onClick) {
            if (!event.targetMateriaId || !event.functionName) {
                console.warn("Skipping incomplete onClick event on button:", buttonMateria.name);
                continue;
            }

            const targetMateria = activeScene.findMateriaById(event.targetMateriaId);
            if (!targetMateria) {
                console.error(`Target Materia with ID ${event.targetMateriaId} not found for onClick event.`);
                continue;
            }

            const scripts = targetMateria.getComponents(Components.CreativeScript);
            if (scripts.length === 0) {
                console.error(`Target Materia "${targetMateria.name}" has no scripts attached.`);
                continue;
            }

            // Find the correct script if multiple are attached
            const targetScript = scripts.find(s => s.scriptName === event.scriptName) || scripts[0];
            const scriptInstance = targetScript.instance;

            if (!scriptInstance) {
                console.error(`Script instance on "${targetMateria.name}" is not initialized. Make sure the game is running.`);
                continue;
            }

            if (typeof scriptInstance[event.functionName] === 'function') {
                try {
                    scriptInstance[event.functionName]();
                } catch (e) {
                    console.error(`Error executing function "${event.functionName}" from onClick event on Materia "${targetMateria.name}":`, e);
                }
            } else {
                console.error(`Function "${event.functionName}" not found on script "${targetScript.scriptName}" on Materia "${targetMateria.name}".`);
            }
        }
    }
}
