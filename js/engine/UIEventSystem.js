// UIEventSystem.js

import { InputManager } from './Input.js';
import * as SceneManager from './SceneManager.js';
import { RectTransform, UIButton } from './Components.js';

class UIEventSystem {
    constructor() {
        if (UIEventSystem.instance) {
            return UIEventSystem.instance;
        }
        this.hoveredElement = null;
        this.pressedElement = null;
        UIEventSystem.instance = this;
    }

    update() {
        const mousePos = InputManager.getMousePosition();
        const isMouseDown = InputManager.getMouseButtonDown(0);
        const isMouseUp = InputManager.getMouseButtonUp(0);

        let currentHover = null;
        const interactableElements = this.getInteractableElements();

        // Iterate backwards to check top-most elements first
        for (let i = interactableElements.length - 1; i >= 0; i--) {
            const element = interactableElements[i];
            if (this.isPointerOver(element, mousePos)) {
                currentHover = element;
                break;
            }
        }

        // Handle hover state changes
        if (currentHover !== this.hoveredElement) {
            if (this.hoveredElement) {
                // Dispatch mouse exit event
                this.dispatch(this.hoveredElement, 'pointer-exit');
            }
            if (currentHover) {
                // Dispatch mouse enter event
                this.dispatch(currentHover, 'pointer-enter');
            }
            this.hoveredElement = currentHover;
        }

        // Handle press and click states
        if (isMouseDown && this.hoveredElement) {
            this.pressedElement = this.hoveredElement;
            this.dispatch(this.pressedElement, 'pointer-down');
        }

        if (isMouseUp) {
            if (this.pressedElement) {
                this.dispatch(this.pressedElement, 'pointer-up');
                if (this.pressedElement === this.hoveredElement) {
                    // This is a click
                    this.dispatch(this.pressedElement, 'click');
                }
                this.pressedElement = null;
            }
        }
    }

    getInteractableElements() {
        // This is a simplified version. A real implementation would be more optimized.
        const interactables = [];
        SceneManager.currentScene.materias.forEach(materia => {
            if (materia.isActive && materia.getComponent(UIButton)) {
                interactables.push(materia);
            }
        });

        // We need to sort them by render order (which is already done by layer sorting for rendering)
        // For now, we assume the default array order is sufficient, but this will need to be improved.
        return interactables;
    }

    isPointerOver(materia, mousePos) {
        const rectTransform = materia.getComponent(RectTransform);
        if (!rectTransform) return false;

        // This is a simplified check for screen-space overlay.
        // It doesn't account for anchors, pivots, or camera-space UI yet.
        const left = rectTransform.x - (rectTransform.width * rectTransform.pivot.x);
        const right = left + rectTransform.width;
        const top = rectTransform.y - (rectTransform.height * rectTransform.pivot.y);
        const bottom = top + rectTransform.height;

        return mousePos.x >= left && mousePos.x <= right && mousePos.y >= top && mousePos.y <= bottom;
    }

    dispatch(materia, eventType) {
        const button = materia.getComponent(UIButton);
        if (!button) return;

        switch (eventType) {
            case 'pointer-enter':
                button.currentState = 'hover';
                break;
            case 'pointer-exit':
                button.currentState = 'normal';
                break;
            case 'pointer-down':
                button.currentState = 'pressed';
                break;
            case 'pointer-up':
                button.currentState = this.hoveredElement === materia ? 'hover' : 'normal';
                break;
            case 'click':
                button.onClick.forEach(callback => callback());
                break;
        }
    }
}

// Export a singleton instance
export const uiEventSystem = new UIEventSystem();
