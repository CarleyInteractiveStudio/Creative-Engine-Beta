import * as SceneManager from './SceneManager.js';
import { Camera, Transform, PointLight2D, SpotLight2D, FreeformLight2D, SpriteLight2D, Tilemap, Grid, Canvas, CanvasScaler, SpriteRenderer, TilemapRenderer, TextureRender, UITransform, UIImage, UIText } from './Components.js';
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
            this.ctx.restore();
            return;
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

    drawCanvas(canvasMateria, isGameView) {
        if (!canvasMateria.isActive) return;

        const canvasComponent = canvasMateria.getComponent(Canvas);
        if (!canvasComponent) return;

        // Dispatch to the correct rendering method based on the canvas mode.
        // The core logic for WYSIWYG is now handled inside drawScreenSpaceUI for both editor and game.
        if (canvasComponent.renderMode === 'Screen Space') {
            this.drawScreenSpaceUI(canvasMateria);
        } else { // World Space
            this.drawWorldSpaceUI(canvasMateria);
        }
    }

    _drawUIElementAndChildren(element, parentRect) {
        if (!element.isActive) return;

        const uiTransform = element.getComponent(UITransform);
        if (!uiTransform) return;

        const anchorMin = getAnchorPercentages(uiTransform.anchorPreset);

        // X Calculation remains straightforward (left-to-right)
        const anchorMinX_fromLeft = parentRect.width * anchorMin.x;
        const pivotPosX_fromLeft = anchorMinX_fromLeft + uiTransform.position.x;
        const rectX_fromLeft = pivotPosX_fromLeft - (uiTransform.size.width * uiTransform.pivot.x);
        const finalX = parentRect.x + rectX_fromLeft;

        // Y Calculation uses the consistent Y-UP data model and converts to Y-DOWN render coordinates
        const rectY_fromTop = parentRect.height * (1 - anchorMin.y) - uiTransform.position.y - (uiTransform.size.height * (1 - uiTransform.pivot.y));
        const finalY = parentRect.y + rectY_fromTop;
        const drawWidth = uiTransform.size.width;
        const drawHeight = uiTransform.size.height;

        const currentRect = { x: finalX, y: finalY, width: drawWidth, height: drawHeight };

        // --- Drawing Logic ---
        this.ctx.save();
        // Apply rotation around the pivot point
        const pivotX = finalX + (drawWidth * uiTransform.pivot.x);
        const pivotY = finalY + (drawHeight * uiTransform.pivot.y);
        this.ctx.translate(pivotX, pivotY);
        this.ctx.rotate(uiTransform.rotation * Math.PI / 180);
        this.ctx.translate(-pivotX, -pivotY);

        const uiImage = element.getComponent(UIImage);
        const uiText = element.getComponent(UIText);
        const textureRender = element.getComponent(TextureRender);

        if (uiImage) {
            this.ctx.fillStyle = uiImage.color;
            this.ctx.fillRect(finalX, finalY, drawWidth, drawHeight);
            if (uiImage.sprite && uiImage.sprite.complete) {
                this.ctx.drawImage(uiImage.sprite, finalX, finalY, drawWidth, drawHeight);
            }
        } else if (textureRender) {
             this.ctx.save();
            this.ctx.translate(finalX, finalY);
            if (textureRender.texture && textureRender.texture.complete) {
                this.ctx.fillStyle = this.ctx.createPattern(textureRender.texture, 'repeat');
            } else {
                this.ctx.fillStyle = textureRender.color;
            }

            if (textureRender.shape === 'Rectangle') {
                this.ctx.fillRect(0, 0, drawWidth, drawHeight);
            } else if (textureRender.shape === 'Circle') {
                this.ctx.beginPath();
                this.ctx.arc(drawWidth / 2, drawHeight / 2, drawWidth / 2, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        if (uiText) {
            this._drawUIText(uiText, finalX, finalY, drawWidth, drawHeight);
        }

        this.ctx.restore(); // Restore from rotation transform

        // --- Recursion ---
        for (const child of element.children) {
            this._drawUIElementAndChildren(child, currentRect);
        }
    }

    drawScreenSpaceUI(canvasMateria) {
        this.beginUI(); // Resets transform to screen space

        const scaler = canvasMateria.getComponent(CanvasScaler);
        if (!scaler) {
            // A Screen Space Canvas requires a CanvasScaler to function.
            this.end();
            return;
        }

        const sourceRect = {
            width: scaler.referenceResolution.x,
            height: scaler.referenceResolution.y
        };
        const targetRect = {
            width: this.canvas.width,
            height: this.canvas.height
        };

        // Use the centralized utility to get letterboxing parameters
        const { scale, offsetX, offsetY } = calculateLetterbox(sourceRect, targetRect);

        // This is the virtual canvas area, which is the parent rect for all direct children
        const canvasRect = {
            x: 0,
            y: 0,
            width: sourceRect.width,
            height: sourceRect.height
        };

        this.ctx.save();
        // Apply the letterbox transformation to the entire UI
        this.ctx.translate(offsetX, offsetY);
        this.ctx.scale(scale, scale);

        // Clip drawing to the scaled canvas area
        this.ctx.beginPath();
        this.ctx.rect(0, 0, sourceRect.width, sourceRect.height);
        this.ctx.clip();

        // Recursively draw all children within the scaled, virtual canvas
        for (const child of canvasMateria.children) {
            this._drawUIElementAndChildren(child, canvasRect);
        }

        this.ctx.restore(); // Restores from the letterbox transform
        this.end();
    }

    drawWorldSpaceUI(canvasMateria) {
        const canvasComponent = canvasMateria.getComponent(Canvas);
        const canvasTransform = canvasMateria.getComponent(Transform);
        if (!canvasComponent || !canvasTransform) return;

        // NOTE: This will fail if the Canvas component doesn't have a `.size` property.
        // This is a known issue from the refactoring and will be addressed separately if it causes problems.
        const size = canvasComponent.size;
        if (!size) {
             console.error("World Space Canvas requires a 'size' property, which was removed. This needs to be fixed.");
             return;
        }

        this.ctx.save();
        const worldPos = canvasTransform.position;

        const canvasRect = {
            x: worldPos.x - size.x / 2,
            y: worldPos.y - size.y / 2,
            width: size.x,
            height: size.y
        };

        // Clip rendering to the bounds of the world-space canvas
        this.ctx.beginPath();
        this.ctx.rect(canvasRect.x, canvasRect.y, canvasRect.width, canvasRect.height);
        this.ctx.clip();

        // Recursively draw children relative to the world-space canvas rectangle
        for (const child of canvasMateria.children) {
            this._drawUIElementAndChildren(child, canvasRect);
        }

        this.ctx.restore();
    }
}

console.log("Renderer.js loaded");
