
import * as SceneManager from './SceneManager.js';
import { Camera, Transform, PointLight2D, SpotLight2D, FreeformLight2D, SpriteLight2D, Tilemap, Grid, Canvas, SpriteRenderer, TilemapRenderer, TextureRender, UITransform, UIImage, UIText } from './Components.js';
import { getAnchorPercentages, calculateLetterbox } from './UITransformUtils.js';
export class Renderer {
    constructor(canvas, isEditor = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isEditor = isEditor;

        this.lightMapCanvas = document.createElement('canvas');
        this.lightMapCtx = this.lightMapCanvas.getContext('2d');
        this.ambientLight = '#1a1a2a'; // A dark blue/purple for ambient light

        if (this.isEditor) {
            this.camera = { x: 0, y: 0, zoom: 1.0, effectiveZoom: 1.0 };
        } else {
            this.camera = null;
        }
        this.resize();
    }

    _drawUIText(uiText, drawX, drawY, drawWidth, drawHeight) {
        this.ctx.save();
        this.ctx.font = `${uiText.fontSize}px ${uiText.fontFamily || 'sans-serif'}`;
        this.ctx.fillStyle = uiText.color;
        this.ctx.textAlign = uiText.horizontalAlign;
        this.ctx.textBaseline = 'middle';

        let textToRender = uiText.text;
        if (uiText.textTransform === 'uppercase') {
            textToRender = textToRender.toUpperCase();
        } else if (uiText.textTransform === 'lowercase') {
            textToRender = textToRender.toLowerCase();
        }

        let textX = drawX;
        if (uiText.horizontalAlign === 'center') {
            textX += drawWidth / 2;
        } else if (uiText.horizontalAlign === 'right') {
            textX += drawWidth;
        }

        const textY = drawY + drawHeight / 2;
        this.ctx.fillText(textToRender, textX, textY);
        this.ctx.restore();
    }


    setAmbientLight(color) {
        this.ambientLight = color;
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.lightMapCanvas.width = this.canvas.width;
        this.lightMapCanvas.height = this.canvas.height;
    }

    clear(cameraComponent) {
        if (cameraComponent && cameraComponent.clearFlags === 'DontClear') {
            return;
        }
        if (cameraComponent && cameraComponent.clearFlags === 'SolidColor') {
            this.ctx.fillStyle = cameraComponent.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    beginWorld(cameraMateria = null) {
        this.ctx.save();
        let activeCamera, transform;

        if (cameraMateria) {
            const cameraComponent = cameraMateria.getComponent(Camera);
            const cameraTransform = cameraMateria.getComponent(Transform);
            this.clear(cameraComponent);

            let effectiveZoom = 1.0;
            if (cameraComponent.projection === 'Orthographic') {
                effectiveZoom = this.canvas.height / (cameraComponent.orthographicSize * 2 || 1);
            } else {
                effectiveZoom = 1 / Math.tan(cameraComponent.fov * 0.5 * Math.PI / 180);
            }
            activeCamera = { x: cameraTransform.x, y: cameraTransform.y, effectiveZoom };
            transform = cameraTransform;
        } else if (this.isEditor) {
            this.clear(null);
            this.camera.effectiveZoom = this.camera.zoom;
            activeCamera = this.camera;
            transform = { rotation: 0 };
        } else {
            this.clear(null);
            activeCamera = { x: 0, y: 0, effectiveZoom: 1.0 };
            transform = { rotation: 0 };
        }

        if (!activeCamera) {
            this.ctx.restore();
            return;
        }

        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(activeCamera.effectiveZoom, activeCamera.effectiveZoom);
        const rotationInRadians = (transform.rotation || 0) * Math.PI / 180;
        this.ctx.rotate(-rotationInRadians);
        this.ctx.translate(-activeCamera.x, -activeCamera.y);
    }

    beginUI() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    end() {
        this.ctx.restore();
    }

    // ... (drawRect, drawImage, drawText, drawTilemap, and light functions remain unchanged)

    _drawUIElementAndChildren(element, parentRect) {
        // ... (this function remains unchanged)
    }

    drawScreenSpaceUI(canvasMateria) {
        this.beginUI();
        const canvasComponent = canvasMateria.getComponent(Canvas);
        if (!canvasComponent) {
            this.end();
            return;
        }

        const refRes = canvasComponent.referenceResolution;
        const screenRect = { width: this.canvas.width, height: this.canvas.height };

        const { scale, offsetX, offsetY } = calculateLetterbox(refRes, screenRect);

        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);
        this.ctx.scale(scale, scale);

        const virtualCanvasRect = { x: 0, y: 0, width: refRes.width, height: refRes.height };

        this.ctx.beginPath();
        this.ctx.rect(virtualCanvasRect.x, virtualCanvasRect.y, virtualCanvasRect.width, virtualCanvasRect.height);
        this.ctx.clip();

        for (const child of canvasMateria.children) {
            this._drawUIElementAndChildren(child, virtualCanvasRect);
        }

        if (!this.isEditor) {
            this.ctx.strokeStyle = '#FF00FF';
            this.ctx.lineWidth = 2 / scale;
            this.ctx.strokeRect(virtualCanvasRect.x, virtualCanvasRect.y, virtualCanvasRect.width, virtualCanvasRect.height);
        }

        this.ctx.restore();
        this.end();
    }

    drawWorldSpaceUI(canvasMateria) {
        const canvasComponent = canvasMateria.getComponent(Canvas);
        const canvasTransform = canvasMateria.getComponent(Transform);
        if (!canvasComponent || !canvasTransform) return;

        this.ctx.save();
        const worldPos = canvasTransform.position;
        const size = canvasComponent.size;

        const canvasWorldRect = {
            x: worldPos.x - size.x / 2,
            y: worldPos.y - size.y / 2,
            width: size.x,
            height: size.y
        };

        this.ctx.beginPath();
        this.ctx.rect(canvasWorldRect.x, canvasWorldRect.y, canvasWorldRect.width, canvasWorldRect.height);
        this.ctx.clip();

        if (this.isEditor && canvasComponent.renderMode === 'Screen Space') {
            const refRes = canvasComponent.referenceResolution;
            const targetRect = { width: canvasWorldRect.width, height: canvasWorldRect.height };
            const { scale, offsetX, offsetY } = calculateLetterbox(refRes, targetRect);

            this.ctx.save();
            this.ctx.translate(canvasWorldRect.x + offsetX, canvasWorldRect.y + offsetY);
            this.ctx.scale(scale, scale);

            const virtualCanvasRect = { x: 0, y: 0, width: refRes.width, height: refRes.height };
            for (const child of canvasMateria.children) {
                this._drawUIElementAndChildren(child, virtualCanvasRect);
            }
            this.ctx.restore();
        } else {
            for (const child of canvasMateria.children) {
                this._drawUIElementAndChildren(child, canvasWorldRect);
            }
        }

        if (!this.isEditor) {
            this.ctx.strokeStyle = '#FF00FF';
            // In game view, editor camera might not exist, so we need a fallback.
            const zoom = this.camera ? this.camera.effectiveZoom : 1.0;
            this.ctx.lineWidth = 2 / zoom;
            this.ctx.strokeRect(canvasWorldRect.x, canvasWorldRect.y, canvasWorldRect.width, canvasWorldRect.height);
        }

        this.ctx.restore();
    }
}
