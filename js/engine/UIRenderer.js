import * as SceneManager from './SceneManager.js';
import * as Components from './Components.js';

export function renderUI(rendererInstance) {
    if (!rendererInstance || !SceneManager.currentScene) return;

    const canvases = SceneManager.currentScene.materias.filter(m => m.getComponent(Components.UICanvas));

    if (canvases.length === 0) return;

    rendererInstance.beginUI();

    for (const canvasMateria of canvases) {
        const allChildren = canvasMateria.getChildrenRecursive();

        // Also render the canvas itself if it has an image
        const canvasImage = canvasMateria.getComponent(Components.UIImage);
        if (canvasImage) {
            allChildren.unshift(canvasMateria);
        }

        for (const materia of allChildren) {
            if (!materia.isActive) continue;

            const rectTransform = materia.getComponent(Components.RectTransform);
            if (!rectTransform) continue;

            const worldRect = rectTransform.getWorldRect(rendererInstance.canvas);

            const uiImage = materia.getComponent(Components.UIImage);
            if (uiImage && uiImage.sprite && uiImage.sprite.complete && uiImage.sprite.naturalWidth > 0) {
                const ctx = rendererInstance.ctx;
                ctx.save();
                // Draw the image
                ctx.drawImage(uiImage.sprite, worldRect.x, worldRect.y, worldRect.width, worldRect.height);

                // Apply tint
                if (uiImage.color !== '#ffffff') { // Don't tint if color is white
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.fillStyle = uiImage.color;
                    ctx.fillRect(worldRect.x, worldRect.y, worldRect.width, worldRect.height);
                }

                ctx.restore(); // Restores globalCompositeOperation and other states
            }

            const uiText = materia.getComponent(Components.UIText);
            if (uiText) {
                rendererInstance.ctx.fillStyle = uiText.color;
                rendererInstance.ctx.font = uiText.font;
                rendererInstance.ctx.textAlign = uiText.align;
                rendererInstance.ctx.textBaseline = uiText.verticalAlign;

                let x = worldRect.x;
                if (uiText.align === 'center') {
                    x += worldRect.width / 2;
                } else if (uiText.align === 'right') {
                    x += worldRect.width;
                }

                let y = worldRect.y;
                if (uiText.verticalAlign === 'middle') {
                    y += worldRect.height / 2;
                } else if (uiText.verticalAlign === 'bottom') {
                    y += worldRect.height;
                }

                rendererInstance.ctx.fillText(uiText.text, x, y);
            }
        }
    }
    rendererInstance.end();
}
