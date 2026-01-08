// js/engine/UISystem.js
import * as Components from './Components.js';
import { Scene } from './SceneManager.js';
import { InputManager } from './Input.js';
import * as UITransformUtils from './UITransformUtils.js';

export class UISystem {
    /**
     * @param {Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
    }

    update() {
        this.checkUIInteractions();
    }

    checkUIInteractions() {
        const canvases = this.scene.getAllMaterias().filter(m => m.getComponent(Components.Canvas) && m.isActive);
        if (canvases.length === 0) return;

        const pointerPos = InputManager.getMousePositionInCanvas();
        const isPointerDown = InputManager.getMouseButton(0);

        const canvasComponent = canvases[0].getComponent(Components.Canvas);
        const canvasElement = document.getElementById('game-canvas');
        if (!canvasElement) return;

        const canvasSize = { width: canvasElement.clientWidth, height: canvasElement.clientHeight };

        const buttons = this.scene.getAllMaterias().filter(m => m.getComponent(Components.Button) && m.isActive);

        for (const buttonMateria of buttons) {
            const button = buttonMateria.getComponent(Components.Button);
            const uiTransform = buttonMateria.getComponent(Components.UITransform);
            const uiImage = buttonMateria.getComponent(Components.UIImage);

            if (!button || !uiTransform || !uiImage) continue;

            const isOver = UITransformUtils.isPointerOverUIElement(uiTransform, canvasComponent, pointerPos, canvasSize);

            if (!button.interactable) {
                uiImage.color = button.colors.disabledColor;
                continue;
            }

            if (isOver && isPointerDown) {
                uiImage.color = button.colors.pressedColor;
            } else if (isOver) {
                const normalColor = button.colors.normalColor;
                const r = parseInt(normalColor.slice(1, 3), 16) * 0.9;
                const g = parseInt(normalColor.slice(3, 5), 16) * 0.9;
                const b = parseInt(normalColor.slice(5, 7), 16) * 0.9;
                uiImage.color = `#${Math.floor(r).toString(16).padStart(2, '0')}${Math.floor(g).toString(16).padStart(2, '0')}${Math.floor(b).toString(16).padStart(2, '0')}`;
            } else {
                uiImage.color = button.colors.normalColor;
            }
        }
    }
}
