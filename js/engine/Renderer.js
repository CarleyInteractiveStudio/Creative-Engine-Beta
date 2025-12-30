// js/engine/Renderer.js

import * as SceneManager from './SceneManager.js';
import { Camera, Transform, SpriteRenderer, TilemapRenderer, TextureRender, PointLight2D, SpotLight2D, FreeformLight2D, SpriteLight2D, Tilemap, Grid, Canvas, UIImage, UIButton, UIText } from './Components.js';

export class Renderer {
    constructor(canvas, isEditor = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isEditor = isEditor;
        this.renderingMode = 'canvas2d'; // Default mode

        this.lightMapCanvas = document.createElement('canvas');
        this.lightMapCtx = this.lightMapCanvas.getContext('2d');
        this.ambientLight = '#1a1a2a';

        if (this.isEditor) {
            this.camera = { x: 0, y: 0, zoom: 1.0, effectiveZoom: 1.0 };
        } else {
            this.camera = null;
        }

        this.resize();
    }

    setAmbientLight(color) { this.ambientLight = color; }
    setRenderingMode(mode) { this.renderingMode = mode; }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        if (this.renderingMode === 'realista') {
            this.lightMapCanvas.width = this.canvas.width;
            this.lightMapCanvas.height = this.canvas.height;
        }
    }

    clear(cameraComponent) {
        if (cameraComponent && cameraComponent.clearFlags === 'DontClear') return;

        const clearColor = (cameraComponent && cameraComponent.clearFlags === 'SolidColor')
            ? cameraComponent.backgroundColor
            : '#000000'; // Default clear color

        this.ctx.fillStyle = clearColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    updateScene(scene, cameraMateria) {
        // 1. Gather all Canvases from the scene
        const allCanvases = scene.getMateriasWithComponent(Canvas);
        const worldSpaceCanvases = allCanvases.filter(m => m.getComponent(Canvas).renderMode === 'WorldSpace');
        const screenSpaceCanvases = allCanvases.filter(m => m.getComponent(Canvas).renderMode === 'ScreenSpace');

        // 2. Render World Space
        this._drawWorldSpace(scene, cameraMateria, worldSpaceCanvases);

        // 3. Render Screen Space UI on top
        this._drawScreenSpace(scene, screenSpaceCanvases);
    }

    _drawWorldSpace(scene, cameraMateria, worldSpaceCanvases) {
        this.ctx.save();

        const cameraComponent = cameraMateria ? cameraMateria.getComponent(Camera) : null;
        this.clear(cameraComponent);

        // --- Apply Camera Transform ---
        let activeCamera, transform;
        if (cameraMateria) { // Game camera
            const cameraTransform = cameraMateria.getComponent(Transform);
            let effectiveZoom = 1.0;
             if (cameraComponent.projection === 'Orthographic') {
                effectiveZoom = this.canvas.height / (cameraComponent.orthographicSize * 2 || 1);
            } else {
                effectiveZoom = 1 / Math.tan(cameraComponent.fov * 0.5 * Math.PI / 180);
            }
            activeCamera = { x: cameraTransform.x, y: cameraTransform.y, effectiveZoom };
            transform = cameraTransform;
        } else if (this.isEditor) { // Editor camera
            this.camera.effectiveZoom = this.camera.zoom;
            activeCamera = this.camera;
            transform = { rotation: 0 };
        } else {
            this.ctx.restore();
            return; // No camera, nothing to render
        }

        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(activeCamera.effectiveZoom, activeCamera.effectiveZoom);
        this.ctx.rotate(-(transform.rotation || 0) * Math.PI / 180);
        this.ctx.translate(-activeCamera.x, -activeCamera.y);

        // --- Gather & Sort World-Space Renderables ---
        const worldRenderables = [
            ...scene.getMateriasWithComponent(SpriteRenderer),
            ...scene.getMateriasWithComponent(TilemapRenderer),
            ...scene.getMateriasWithComponent(TextureRender)
        ].filter(m => !m.findParentMateriaWithComponent(Canvas)); // Exclude UI elements for now

        // Add WorldSpace UI elements to the same list to be sorted and rendered
        worldSpaceCanvases.forEach(canvasMateria => {
            worldRenderables.push(...canvasMateria.getDescendants());
        });

        worldRenderables.sort((a, b) => {
            const transformA = a.getComponent(Transform);
            const transformB = b.getComponent(Transform);
            return (transformA ? transformA.y : 0) - (transformB ? transformB.y : 0);
        });

        // --- Lighting Pass (if applicable) ---
        let lights = [];
        if (this.renderingMode === 'realista') {
            lights = scene.getMateriasWithComponent(PointLight2D, SpotLight2D, FreeformLight2D, SpriteLight2D);
            this._beginLights();
            lights.forEach(lightMateria => this._drawLight(lightMateria));
        }

        // --- Main Draw Loop for World Space ---
        worldRenderables.forEach(materia => {
            if (!materia.isActiveInHierarchy()) return;

            // --- Culling Logic ---
            if (cameraComponent) { // Only cull if there's a game camera
                // Layer Mask Culling
                const objectLayerBit = 1 << materia.layer;
                if ((cameraComponent.cullingMask & objectLayerBit) === 0) {
                    return; // Skip rendering this object
                }
            }
             this._renderComponent(materia);
        });

        if (this.renderingMode === 'realista' && lights.length > 0) {
            this._endLights();
        }

        this.ctx.restore();
    }

    _drawScreenSpace(scene, screenSpaceCanvases) {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset for UI overlay

        screenSpaceCanvases.forEach(canvasMateria => {
            if (!canvasMateria.isActiveInHierarchy()) return;

            const canvasComponent = canvasMateria.getComponent(Canvas);
            const canvasTransform = canvasMateria.getComponent(Transform);
            if (!canvasComponent || !canvasTransform) return;

            // In ScreenSpace, the canvas's world position defines the anchor point on the screen.
            // Its size dictates the clipping area.
            const canvasBounds = {
                x: canvasTransform.x - (canvasComponent.width * canvasTransform.scale.x / 2),
                y: canvasTransform.y - (canvasComponent.height * canvasTransform.scale.y / 2),
                width: canvasComponent.width * canvasTransform.scale.x,
                height: canvasComponent.height * canvasTransform.scale.y
            };

            this.ctx.save();
            // Apply clipping for this canvas
            this.ctx.beginPath();
            this.ctx.rect(canvasBounds.x, canvasBounds.y, canvasBounds.width, canvasBounds.height);
            this.ctx.clip();

            const uiElements = canvasMateria.getDescendants();
            uiElements.forEach(uiMateria => {
                if(uiMateria.isActiveInHierarchy()) {
                    this._renderComponent(uiMateria, true); // Pass true for isUI
                }
            });

            this.ctx.restore(); // Remove clipping
        });

        this.ctx.restore();
    }

    _renderComponent(materia, isUI = false) {
        // This function acts as a dispatcher based on the components found.
        // The order matters if a Materia has multiple renderable components.
        const spriteRenderer = materia.getComponent(SpriteRenderer);
        if (spriteRenderer && spriteRenderer.image) {
            this._drawSprite(spriteRenderer);
            return;
        }

        const tilemapRenderer = materia.getComponent(TilemapRenderer);
        if (tilemapRenderer) {
            this._drawTilemap(tilemapRenderer);
            return;
        }

        const textureRender = materia.getComponent(TextureRender);
        if (textureRender) {
            this._drawTextureRender(textureRender);
            return;
        }

        // UI Components
        const uiImage = materia.getComponent(UIImage);
        if (uiImage && uiImage.image) {
            this._drawUIImage(uiImage);
            return;
        }

        const uiButton = materia.getComponent(UIButton);
        if (uiButton) {
            // A button is a composite of other UI elements (like UIImage and UIText).
            // We don't draw it directly. Instead, its child components will be
            // found and rendered individually by this same _renderComponent function.
            // We just need to stop further rendering for this specific materia pass.
            return;
        }

        const uiText = materia.getComponent(UIText);
        if(uiText) {
            this._drawUIText(uiText);
            return;
        }
    }

    // --- Specific Drawing Implementations ---

    _drawSprite(spriteRenderer) {
        const transform = spriteRenderer.materia.getComponent(Transform);
        if (!transform || !spriteRenderer.image || !spriteRenderer.image.complete || spriteRenderer.image.naturalWidth === 0) return;

        this.ctx.save();
        this.ctx.translate(transform.x, transform.y);
        this.ctx.rotate(transform.rotation * Math.PI / 180);
        this.ctx.scale(transform.scale.x, transform.scale.y);

        // Flip rendering context if needed
        if (spriteRenderer.flipX) this.ctx.scale(-1, 1);
        if (spriteRenderer.flipY) this.ctx.scale(1, -1);

        this.ctx.globalAlpha = spriteRenderer.opacity;
        this.ctx.fillStyle = spriteRenderer.color;

        const pivot = spriteRenderer.pivot;
        const width = spriteRenderer.rect.w;
        const height = spriteRenderer.rect.h;
        const destX = -width * pivot.x;
        const destY = -height * pivot.y;

        // Use tinting logic
        // 1. Draw the sprite portion to a temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(spriteRenderer.image, spriteRenderer.rect.x, spriteRenderer.rect.y, width, height, 0, 0, width, height);

        // 2. Apply the color tint
        tempCtx.globalCompositeOperation = 'source-atop';
        tempCtx.fillStyle = spriteRenderer.color;
        tempCtx.fillRect(0, 0, width, height);

        // 3. Draw the tinted result to the main canvas
        this.ctx.drawImage(tempCanvas, destX, destY, width, height);

        this.ctx.restore();
    }

    _drawTilemap(tilemapRenderer) {
        const tilemap = tilemapRenderer.materia.getComponent(Tilemap);
        const transform = tilemapRenderer.materia.getComponent(Transform);
        const grid = tilemapRenderer.materia.parent?.getComponent(Grid);

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

    _drawTextureRender(textureRender) {
        const transform = textureRender.materia.getComponent(Transform);
        if (!transform) return;

        this.ctx.save();
        this.ctx.translate(transform.x, transform.y);
        this.ctx.rotate(transform.rotation * Math.PI / 180);

        this.ctx.fillStyle = textureRender.color;
        this.ctx.strokeStyle = textureRender.borderColor;
        this.ctx.lineWidth = textureRender.borderWidth;

        const width = transform.scale.x;
        const height = transform.scale.y;

        this.ctx.beginPath();
        switch (textureRender.shape) {
            case 'Rectangle':
                this.ctx.rect(-width / 2, -height / 2, width, height);
                break;
            case 'Circle':
                this.ctx.arc(0, 0, width / 2, 0, 2 * Math.PI);
                break;
            case 'Capsule':
                const radius = Math.min(width, height) / 2;
                const rectHeight = height - 2 * radius;
                this.ctx.moveTo(-width / 2 + radius, -height / 2);
                this.ctx.lineTo(width / 2 - radius, -height / 2);
                this.ctx.arc(width / 2 - radius, -height / 2 + radius, radius, -Math.PI / 2, Math.PI / 2);
                this.ctx.lineTo(-width / 2 + radius, height / 2);
                this.ctx.arc(-width / 2 + radius, -height / 2 + radius, radius, Math.PI / 2, -Math.PI / 2);
                break;
        }
        this.ctx.closePath();

        if (textureRender.isFilled) this.ctx.fill();
        if (textureRender.borderWidth > 0) this.ctx.stroke();

        this.ctx.restore();
    }

    // --- UI Drawing ---
    _drawUIImage(uiImage) {
        const transform = uiImage.materia.getComponent(Transform);
        if (!transform || !uiImage.image) return;

        const bounds = this._getComponentBounds(transform);
        this.ctx.globalAlpha = uiImage.opacity;
        this.ctx.drawImage(uiImage.image, bounds.x, bounds.y, bounds.width, bounds.height);
        this.ctx.globalAlpha = 1.0;
    }

    _drawUIText(uiText) {
        const transform = uiText.materia.getComponent(Transform);
        if (!transform) return;

        const bounds = this._getComponentBounds(transform);

        this.ctx.fillStyle = uiText.color;
        this.ctx.font = `${uiText.fontSize}px ${uiText.font}`;
        this.ctx.textAlign = uiText.horizontalAlign;
        this.ctx.textBaseline = uiText.verticalAlign;

        let x = bounds.x;
        if (uiText.horizontalAlign === 'center') x += bounds.width / 2;
        if (uiText.horizontalAlign === 'right') x += bounds.width;

        let y = bounds.y;
        if (uiText.verticalAlign === 'middle') y += bounds.height / 2;
        if (uiText.verticalAlign === 'bottom') y += bounds.height;

        this.ctx.fillText(uiText.text, x, y);
    }

    _getComponentBounds(transform) {
        return {
            x: transform.x - (transform.scale.x / 2),
            y: transform.y - (transform.scale.y / 2),
            width: transform.scale.x,
            height: transform.scale.y
        };
    }

    // --- Lighting Methods ---
    _beginLights() {
        if (this.lightMapCanvas.width === 0 || this.lightMapCanvas.height === 0) return;
        this.lightMapCtx.save();
        this.lightMapCtx.setTransform(this.ctx.getTransform());
        this.lightMapCtx.globalCompositeOperation = 'source-over';
        this.lightMapCtx.fillStyle = this.ambientLight;
        // Use a large rect to fill the entire transformed (rotated, scaled) viewport
        this.lightMapCtx.fillRect(-10000, -10000, 20000, 20000);
        this.lightMapCtx.globalCompositeOperation = 'lighter';
    }

    _drawLight(lightMateria) {
        const transform = lightMateria.getComponent(Transform);
        if (!transform) return;

        const pointLight = lightMateria.getComponent(PointLight2D);
        if (pointLight) this._drawPointLight(pointLight, transform);

        const spotLight = lightMateria.getComponent(SpotLight2D);
        if (spotLight) this._drawSpotLight(spotLight, transform);

        const freeformLight = lightMateria.getComponent(FreeformLight2D);
        if (freeformLight) this._drawFreeformLight(freeformLight, transform);

        const spriteLight = lightMateria.getComponent(SpriteLight2D);
        if (spriteLight) this._drawSpriteLight(spriteLight, transform);
    }

    _drawPointLight(light, transform) {
        const { x, y } = transform;
        const { radius, color, intensity } = light;
        const gradient = this.lightMapCtx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `${color}FF`);
        gradient.addColorStop(1, `${color}00`);
        this.lightMapCtx.fillStyle = gradient;
        this.lightMapCtx.globalAlpha = intensity;
        this.lightMapCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        this.lightMapCtx.globalAlpha = 1.0;
    }

     _drawSpotLight(light, transform) {
        const { x, y, rotation } = transform;
        const { radius, color, intensity, angle } = light;
        const directionRad = ((rotation - 90) * Math.PI) / 180;
        const coneAngleRad = (angle * Math.PI) / 180;
        const startAngle = directionRad - coneAngleRad / 2;
        const endAngle = directionRad + coneAngleRad / 2;

        const gradient = this.lightMapCtx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `${color}FF`);
        gradient.addColorStop(1, `${color}00`);

        this.lightMapCtx.fillStyle = gradient;
        this.lightMapCtx.globalAlpha = intensity;
        this.lightMapCtx.beginPath();
        this.lightMapCtx.moveTo(x, y);
        this.lightMapCtx.arc(x, y, radius, startAngle, endAngle);
        this.lightMapCtx.closePath();
        this.lightMapCtx.fill();
        this.lightMapCtx.globalAlpha = 1.0;
    }

     _drawFreeformLight(light, transform) {
        const { x, y, rotation } = transform;
        const { vertices, color, intensity } = light;
        if (!vertices || vertices.length < 3) return;

        this.lightMapCtx.save();
        this.lightMapCtx.translate(x, y);
        this.lightMapCtx.rotate(rotation * Math.PI / 180);
        this.lightMapCtx.beginPath();
        this.lightMapCtx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            this.lightMapCtx.lineTo(vertices[i].x, vertices[i].y);
        }
        this.lightMapCtx.closePath();
        this.lightMapCtx.fillStyle = color;
        this.lightMapCtx.globalAlpha = intensity;
        this.lightMapCtx.fill();
        this.lightMapCtx.restore();
        this.lightMapCtx.globalAlpha = 1.0;
    }

     _drawSpriteLight(light, transform) {
        const { x, y, rotation, scale } = transform;
        const { sprite, color, intensity } = light;
        if (!sprite || !sprite.complete || sprite.naturalWidth === 0) return;

        const width = sprite.naturalWidth * scale.x;
        const height = sprite.naturalHeight * scale.y;

        this.lightMapCtx.save();
        this.lightMapCtx.translate(x, y);
        this.lightMapCtx.rotate(rotation * Math.PI / 180);
        this.lightMapCtx.globalAlpha = intensity;
        this.lightMapCtx.drawImage(sprite, -width / 2, -height / 2, width, height);
        this.lightMapCtx.fillStyle = color;
        this.lightMapCtx.globalCompositeOperation = 'multiply';
        this.lightMapCtx.fillRect(-width / 2, -height / 2, width, height);
        this.lightMapCtx.restore();
        this.lightMapCtx.globalAlpha = 1.0;
    }

    _endLights() {
        this.lightMapCtx.restore();
        if (this.lightMapCanvas.width > 0 && this.lightMapCanvas.height > 0) {
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.globalCompositeOperation = 'multiply';
            this.ctx.drawImage(this.lightMapCanvas, 0, 0);
            this.ctx.restore();
        }
    }
}
