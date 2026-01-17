
import * as SceneManager from './SceneManager.js';
import { Camera, Transform, PointLight2D, SpotLight2D, FreeformLight2D, SpriteLight2D, Tilemap, Grid, Canvas, SpriteRenderer, TilemapRenderer, TextureRender, UITransform, UIImage, UIText } from './Components.js';
import { getAbsoluteRect, calculateLetterbox } from './UITransformUtils.js';
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

    drawRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
    }

    drawImage(image, x, y, width, height) {
        this.ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
    }

    drawText(text, x, y, color, fontSize, fontFamily, textTransform) {
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px ${fontFamily || 'sans-serif'}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let transformedText = text;
        if (textTransform === 'uppercase') {
            transformedText = text.toUpperCase();
        } else if (textTransform === 'lowercase') {
            transformedText = text.toLowerCase();
        }
        this.ctx.fillText(transformedText, x, y);
    }

    drawTilemap(tilemapRenderer) {
        const tilemap = tilemapRenderer.materia.getComponent(Tilemap);
        const transform = tilemapRenderer.materia.getComponent(Transform);
        let gridMateria = null;
        const parent = tilemapRenderer.materia.parent;
        if (parent) {
            if (typeof parent === 'object' && typeof parent.getComponent === 'function') {
                gridMateria = parent;
            } else if (typeof parent === 'number') {
                gridMateria = SceneManager.currentScene.findMateriaById(parent);
            }
        }
        const grid = gridMateria ? gridMateria.getComponent(Grid) : null;
        if (!tilemap || !transform || !grid) return;

        this.ctx.save();
        this.ctx.translate(transform.x, transform.y);
        this.ctx.rotate(transform.rotation * Math.PI / 180);
        const mapTotalWidth = tilemap.width * grid.cellSize.x;
        const mapTotalHeight = tilemap.height * grid.cellSize.y;

        for (const layer of tilemap.layers) {
            const layerOffsetX = layer.position.x * mapTotalWidth;
            const layerOffsetY = layer.position.y * mapTotalHeight;
            for (const [coord, tileData] of layer.tileData.entries()) {
                const image = tilemapRenderer.getImageForTile(tileData);
                if (image && image.complete && image.naturalWidth > 0) {
                    const [x, y] = coord.split(',').map(Number);
                    const dx = layerOffsetX + (x * grid.cellSize.x) - (mapTotalWidth / 2);
                    const dy = layerOffsetY + (y * grid.cellSize.y) - (mapTotalHeight / 2);
                    this.ctx.drawImage(image, dx, dy, grid.cellSize.x, grid.cellSize.y);
                }
            }
        }
        this.ctx.restore();
    }

    beginLights() {
        this.lightMapCtx.save();
        this.lightMapCtx.setTransform(this.ctx.getTransform());
        this.lightMapCtx.fillStyle = this.ambientLight;
        this.lightMapCtx.fillRect(-99999, -99999, 199998, 199998);
    }

    drawPointLight(light, transform) {
        const ctx = this.lightMapCtx;
        const { radius, color, intensity } = light;
        const gradient = ctx.createRadialGradient(transform.x, transform.y, 0, transform.x, transform.y, radius);
        gradient.addColorStop(0, `${color}FF`);
        gradient.addColorStop(0.3, `${color}CC`);
        gradient.addColorStop(0.6, `${color}66`);
        gradient.addColorStop(1, `${color}00`);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradient;
        ctx.globalAlpha = intensity;
        ctx.fillRect(transform.x - radius, transform.y - radius, radius * 2, radius * 2);
        ctx.globalAlpha = 1.0;
    }

    drawSpotLight(light, transform) {
        const ctx = this.lightMapCtx;
        const { x, y, rotation } = transform;
        const { radius, color, intensity, angle } = light;
        const directionRad = ((rotation - 90) * Math.PI) / 180;
        const coneAngleRad = (angle * Math.PI) / 180;
        const startAngle = directionRad - coneAngleRad / 2;
        const endAngle = directionRad + coneAngleRad / 2;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `${color}FF`);
        gradient.addColorStop(0.3, `${color}CC`);
        gradient.addColorStop(0.6, `${color}66`);
        gradient.addColorStop(1, `${color}00`);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradient;
        ctx.globalAlpha = intensity;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    drawFreeformLight(light, transform) {
        const ctx = this.lightMapCtx;
        const { x, y, rotation } = transform;
        const { vertices, color, intensity } = light;
        if (!vertices || vertices.length < 3) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = color;
        ctx.globalAlpha = intensity;
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }

    drawSpriteLight(light, transform) {
        const ctx = this.lightMapCtx;
        const { x, y, rotation, scale } = transform;
        const { sprite, color, intensity } = light;
        if (!sprite || !sprite.complete || sprite.naturalWidth === 0) return;

        const width = sprite.naturalWidth * scale.x;
        const height = sprite.naturalHeight * scale.y;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity;
        ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
        ctx.fillStyle = color;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }

    endLights() {
        this.lightMapCtx.restore();
        if (this.lightMapCanvas.width === 0 || this.lightMapCanvas.height === 0) return;
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.drawImage(this.lightMapCanvas, 0, 0);
        this.ctx.restore();
    }

    drawCanvas(canvasMateria) {
        if (!canvasMateria.isActive) return;
        const canvas = canvasMateria.getComponent(Canvas);
        if (this.isEditor) {
            this.drawWorldSpaceUI(canvasMateria);
        } else {
            if (canvas.renderMode === 'Screen Space') {
                this.drawScreenSpaceUI(canvasMateria);
            } else {
                this.drawWorldSpaceUI(canvasMateria);
            }
        }
    }

    _drawUIElementAndChildren(element, rectCache) {
        if (!element.isActive) return;

        const uiTransform = element.getComponent(UITransform);
        if (uiTransform) { // Only draw elements that have a UITransform
            const absoluteRect = getAbsoluteRect(element, rectCache);
            const { x, y, width, height } = absoluteRect;

            // Drawing Logic for the current element
            const uiImage = element.getComponent(UIImage);
            const uiText = element.getComponent(UIText);
            const textureRender = element.getComponent(TextureRender);

            if (uiImage) {
                this.ctx.fillStyle = uiImage.color;
                this.ctx.fillRect(x, y, width, height);
                if (uiImage.sprite && uiImage.sprite.complete && uiImage.sprite.naturalWidth > 0) {
                     this.ctx.drawImage(uiImage.sprite, x, y, width, height);
                }
            } else if (textureRender) {
                this.ctx.save();
                this.ctx.translate(x, y);
                if (textureRender.texture && textureRender.texture.complete) {
                    this.ctx.fillStyle = this.ctx.createPattern(textureRender.texture, 'repeat');
                } else {
                    this.ctx.fillStyle = textureRender.color;
                }
                if (textureRender.shape === 'Rectangle') {
                    this.ctx.fillRect(0, 0, width, height);
                } else if (textureRender.shape === 'Circle') {
                    this.ctx.beginPath();
                    this.ctx.arc(width / 2, height / 2, width / 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
                this.ctx.restore();
            }

            if (uiText) {
                this._drawUIText(uiText, x, y, width, height);
            }
        }

        // Recursion for children
        for (const child of element.children) {
            this._drawUIElementAndChildren(child, rectCache);
        }
    }

    drawScreenSpaceUI(canvasMateria) {
        this.beginUI();
        const canvasComponent = canvasMateria.getComponent(Canvas);
        if (!canvasComponent) { this.end(); return; }

        const refRes = canvasComponent.referenceResolution || { width: 800, height: 600 };
        const screenRect = { width: this.canvas.width, height: this.canvas.height };

        const { scale, offsetX, offsetY } = calculateLetterbox(refRes, screenRect);

        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);
        this.ctx.scale(scale, scale);

        // The virtual canvas rect is now just for clipping
        const virtualCanvasRect = { x: 0, y: 0, width: refRes.width, height: refRes.height };
        this.ctx.beginPath();
        this.ctx.rect(virtualCanvasRect.x, virtualCanvasRect.y, virtualCanvasRect.width, virtualCanvasRect.height);
        this.ctx.clip();

        // The calculation logic is now self-contained in getAbsoluteRect.
        // We create a cache and "seed" it with the canvas's virtual rectangle.
        const rectCache = new Map();
        rectCache.set(canvasMateria.id, virtualCanvasRect);

        for (const child of canvasMateria.children) {
            this._drawUIElementAndChildren(child, rectCache);
        }

        this.ctx.restore();
        this.end();
    }

    drawWorldSpaceUI(canvasMateria) {
        const canvasComponent = canvasMateria.getComponent(Canvas);
        const canvasTransform = canvasMateria.getComponent(Transform);
        if (!canvasComponent || !canvasTransform) return;

        this.ctx.save();

        // The rectCache will get the initial rect from the canvas itself via getAbsoluteRect.
        const rectCache = new Map();
        const canvasWorldRect = getAbsoluteRect(canvasMateria, rectCache);

        this.ctx.beginPath();
        this.ctx.rect(canvasWorldRect.x, canvasWorldRect.y, canvasWorldRect.width, canvasWorldRect.height);
        this.ctx.clip();

        // This is a special case for the editor to achieve WYSIWYG for Screen Space canvases.
        if (this.isEditor && canvasComponent.renderMode === 'Screen Space') {
            const refRes = canvasComponent.referenceResolution || { width: 800, height: 600 };
            const targetRect = { width: canvasWorldRect.width, height: canvasWorldRect.height };
            const { scale, offsetX, offsetY } = calculateLetterbox(refRes, targetRect);

            this.ctx.save();
            // We apply the letterbox transform relative to the canvas's world position.
            this.ctx.translate(canvasWorldRect.x + offsetX, canvasWorldRect.y + offsetY); // Y-Down
            this.ctx.scale(scale, scale);

            // We need a new cache here because the coordinate system has changed.
            const screenSpaceCache = new Map();
            // We "trick" the calculation by putting a fake rect for the canvas in the cache,
            // representing the scaled, virtual screen.
            const virtualCanvasRect = { x: 0, y: 0, width: refRes.width, height: refRes.height };
            screenSpaceCache.set(canvasMateria.id, virtualCanvasRect);

            for (const child of canvasMateria.children) {
                this._drawUIElementAndChildren(child, screenSpaceCache);
            }
            this.ctx.restore();
        } else {
            // For 'World Space' canvases, the logic is direct.
            for (const child of canvasMateria.children) {
                this._drawUIElementAndChildren(child, rectCache);
            }
        }

        this.ctx.restore();
    }
}
