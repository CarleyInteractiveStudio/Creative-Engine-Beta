import * as SceneManager from './SceneManager.js';
import * as Components from './Components.js';

export function renderUI(rendererInstance) {
    if (!rendererInstance || !SceneManager.currentScene) return;

    const canvases = SceneManager.currentScene.materias.filter(m => m.getComponent(Components.UICanvas));

    for (const canvasMateria of canvases) {
        rendererInstance.beginUI();

        const allChildren = canvasMateria.getChildrenRecursive();

        for (const materia of allChildren) {
            if (!materia.isActive) continue;

            const rectTransform = materia.getComponent(Components.RectTransform);
            if (!rectTransform) continue;

            const worldRect = rectTransform.getWorldRect(rendererInstance.canvas);

            const uiImage = materia.getComponent(Components.UIImage);
            if (uiImage && uiImage.sprite && uiImage.sprite.complete && uiImage.sprite.naturalWidth > 0) {
                rendererInstance.ctx.globalAlpha = uiImage.color.a || 1;
                rendererInstance.ctx.fillStyle = uiImage.color;
                rendererInstance.ctx.fillRect(worldRect.x, worldRect.y, worldRect.width, worldRect.height);
                rendererInstance.ctx.drawImage(uiImage.sprite, worldRect.x, worldRect.y, worldRect.width, worldRect.height);
                 rendererInstance.ctx.globalAlpha = 1;
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

        rendererInstance.end();
    }
}
