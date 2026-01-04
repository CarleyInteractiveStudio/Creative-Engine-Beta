import * as SceneManager from './SceneManager.js';
import { Camera, Transform, PointLight2D, SpotLight2D, FreeformLight2D, SpriteLight2D, Tilemap, Grid, Canvas, SpriteRenderer, TilemapRenderer, TextureRender, UIPosition, Image } from './Components.js';

export class Renderer {
    constructor(canvas, isEditor = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isEditor = isEditor;

        this.lightMapCanvas = document.createElement('canvas');
        this.lightMapCtx = this.lightMapCanvas.getContext('2d');
        this.ambientLight = '#1a1a2a'; // A dark blue/purple for ambient light

        // The editor renderer gets its own persistent camera for navigation.
        // The game renderer will still get its camera from the scene.
        if (this.isEditor) {
            this.camera = {
                x: 0,
                y: 0,
                zoom: 1.0,
                effectiveZoom: 1.0 // Start with a 1:1 zoom
            };
        } else {
            this.camera = null; // Game camera is set per-frame
        }

        this.resize();
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
            return; // Do nothing
        }
        if (cameraComponent && cameraComponent.clearFlags === 'SolidColor') {
            this.ctx.fillStyle = cameraComponent.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Default clear for skybox (not implemented) or no camera
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    beginWorld(cameraMateria = null) {
        this.ctx.save();

        let activeCamera, transform;

        if (cameraMateria) { // Game view rendering with a specific scene camera
            const cameraComponent = cameraMateria.getComponent(Camera);
            const cameraTransform = cameraMateria.getComponent(Transform);

            this.clear(cameraComponent); // Clear based on this camera's flags

            let effectiveZoom = 1.0;
            if (cameraComponent.projection === 'Orthographic') {
                effectiveZoom = this.canvas.height / (cameraComponent.orthographicSize * 2 || 1);
            } else { // Perspective
                effectiveZoom = 1 / Math.tan(cameraComponent.fov * 0.5 * Math.PI / 180);
            }

            activeCamera = { x: cameraTransform.x, y: cameraTransform.y, effectiveZoom };
            transform = cameraTransform;

        } else if (this.isEditor) { // Editor view rendering with its own navigation camera
            this.clear(null); // Always do a default clear for editor background
            this.camera.effectiveZoom = this.camera.zoom;
            activeCamera = this.camera;
            transform = { rotation: 0 }; // Editor camera doesn't rotate
        } else {
            // Fallback for game view with no camera found - clear and do nothing.
            this.clear(null);
            this.ctx.restore(); // balance the save()
            return;
        }

        if (!activeCamera) {
            this.ctx.restore();
            return;
        }

        // Apply transformations
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(activeCamera.effectiveZoom, activeCamera.effectiveZoom);

        const rotationInRadians = (transform.rotation || 0) * Math.PI / 180;
        this.ctx.rotate(-rotationInRadians); // Negative to rotate the world opposite to camera

        this.ctx.translate(-activeCamera.x, -activeCamera.y);

    }

    beginUI() {
        this.ctx.save();
        // Reset transform to identity for screen-space UI rendering
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    end() {
        this.ctx.restore();
    }

    drawRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
    }

    // Placeholder for now
    drawImage(image, x, y, width, height) {
        this.ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
    }

    drawText(text, x, y, color, fontSize, textTransform) {
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px sans-serif`;
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

        // Robustly find the parent Grid object, whether it's a direct reference or an ID
        let gridMateria = null;
        const parent = tilemapRenderer.materia.parent;
        if (parent) {
            if (typeof parent === 'object' && typeof parent.getComponent === 'function') {
                gridMateria = parent; // Parent is already a Materia object
            } else if (typeof parent === 'number') {
                gridMateria = SceneManager.currentScene.findMateriaById(parent); // Parent is an ID
            }
        }
        const grid = gridMateria ? gridMateria.getComponent(Grid) : null;

        if (!tilemap || !transform || !grid) {
            return;
        }

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

                    this.ctx.drawImage(
                        image,
                        dx, dy,
                        grid.cellSize.x, grid.cellSize.y
                    );
                }
            }
        }

        this.ctx.restore();
    }

    // --- Lighting Methods ---

    beginLights() {
        // Use the same transformation as the world for the lightmap
        this.lightMapCtx.save();
        this.lightMapCtx.setTransform(this.ctx.getTransform());

        // Clear the lightmap to the ambient color
        this.lightMapCtx.fillStyle = this.ambientLight;
        this.lightMapCtx.fillRect(-99999, -99999, 199998, 199998); // A huge rect to cover the whole transformed space
    }

    drawPointLight(light, transform) {
        const ctx = this.lightMapCtx;
        const radius = light.radius;
        const color = light.color; // Assuming hex format for now
        const intensity = light.intensity;

        const gradient = ctx.createRadialGradient(transform.x, transform.y, 0, transform.x, transform.y, radius);

        // This creates a standard additive light falloff
        gradient.addColorStop(0, `${color}FF`); // Full color at center
        gradient.addColorStop(0.3, `${color}CC`);
        gradient.addColorStop(0.6, `${color}66`);
        gradient.addColorStop(1, `${color}00`); // Transparent at edge

        ctx.globalCompositeOperation = 'lighter'; // Additive blending for lights
        ctx.fillStyle = gradient;
        ctx.globalAlpha = intensity;
        ctx.fillRect(transform.x - radius, transform.y - radius, radius * 2, radius * 2);
        ctx.globalAlpha = 1.0; // Reset alpha
    }

    drawSpotLight(light, transform) {
        const ctx = this.lightMapCtx;
        const { x, y, rotation } = transform;
        const { radius, color, intensity, angle } = light;

        // Convert angles to radians for canvas API
        // The rotation from the transform component needs to be offset by -90 degrees because canvas arc starts from the 3 o'clock position.
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

        ctx.globalAlpha = 1.0; // Reset alpha
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

        // Draw the sprite
        ctx.drawImage(sprite, -width / 2, -height / 2, width, height);

        // Overlay a color tint
        ctx.fillStyle = color;
        ctx.globalCompositeOperation = 'multiply'; // "Multiply" is great for tinting
        ctx.fillRect(-width / 2, -height / 2, width, height);

        ctx.restore();
        ctx.globalAlpha = 1.0; // Reset alpha
    }

    endLights() {
        this.lightMapCtx.restore(); // Restore transform on lightmap

        // Guard against drawing a 0-size canvas, which causes an error on startup
        if (this.lightMapCanvas.width === 0 || this.lightMapCanvas.height === 0) {
            return;
        }

        // Composite the lightmap onto the main canvas
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for screen space drawing
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.drawImage(this.lightMapCanvas, 0, 0);
        this.ctx.restore(); // Restores composite operation and transform
    }

    drawWorldSpaceCanvas(canvasMateria) {
        const canvasTransform = canvasMateria.getComponent(Transform);
        if (!canvasTransform) return;

        // Recursive function to draw all UI elements under a canvas
        const drawUIElement = (materia) => {
            if (!materia.isActive) return;

            const image = materia.getComponent(Image);
            const uiPosition = materia.getComponent(UIPosition);

            if (image && uiPosition) {
                // Calculate world position by combining canvas transform and UI position
                // This treats UIPosition's x/y as a local offset from the canvas's pivot.
                const worldX = canvasTransform.position.x + uiPosition.x;
                const worldY = canvasTransform.position.y + uiPosition.y;
                const worldWidth = uiPosition.width;
                const worldHeight = uiPosition.height;

                this.ctx.save();
                this.ctx.globalAlpha = image.opacity;

                // Translate to the final world position to handle drawing
                this.ctx.translate(worldX, worldY);
                // Note: This simplified version doesn't account for canvas or UI element rotation yet.

                const hasSource = image.sprite && image.sprite.complete && image.sprite.naturalWidth > 0;

                if (hasSource) {
                    // Draw the image centered at the new origin
                    this.ctx.drawImage(image.sprite, -worldWidth / 2, -worldHeight / 2, worldWidth, worldHeight);

                    // Apply color tint if needed
                    if (image.color.toLowerCase() !== '#ffffff') {
                        this.ctx.globalCompositeOperation = 'multiply';
                        this.ctx.fillStyle = image.color;
                        this.ctx.fillRect(-worldWidth / 2, -worldHeight / 2, worldWidth, worldHeight);
                    }
                } else {
                    // If no source, just draw a colored rectangle
                    this.ctx.fillStyle = image.color;
                    this.ctx.fillRect(-worldWidth / 2, -worldHeight / 2, worldWidth, worldHeight);
                }

                this.ctx.restore();
            }

            // Draw children recursively
            if (materia.children) {
                materia.children.forEach(drawUIElement);
            }
        };

        // Start the recursive drawing from the canvas's direct children
        if (canvasMateria.children) {
            canvasMateria.children.forEach(drawUIElement);
        }
    }

    renderUI(scene) {
        if (!scene) return;

        const canvases = scene.getAllMaterias().filter(m => m.getComponent(Canvas));

        for (const canvasMateria of canvases) {
            if (!canvasMateria.isActive) continue;

            const canvas = canvasMateria.getComponent(Canvas);
            if (canvas.renderMode === 'Screen Space') {
                this.drawScreenSpaceUI(canvasMateria);
            } else { // 'World Space'
                this.drawWorldSpaceCanvas(canvasMateria);
            }
        }
    }

    drawScreenSpaceUI(canvasMateria) {
        this.beginUI();

        // Recursive function to draw all UI elements under a canvas
        const drawUIElement = (materia) => {
            if (!materia.isActive) return;

            const image = materia.getComponent(Components.Image);
            const rectTransform = materia.getComponent(Components.UIPosition);

            if (image && rectTransform) {
                this.ctx.save();
                this.ctx.globalAlpha = image.opacity;

                const hasSource = image.sprite && image.sprite.complete && image.sprite.naturalWidth > 0;

                if (hasSource) {
                    // Draw the base image if it exists
                    this.ctx.drawImage(image.sprite, rectTransform.x, rectTransform.y, rectTransform.width, rectTransform.height);

                    // Apply color tint by multiplying on top, unless it's pure white
                    if (image.color.toLowerCase() !== '#ffffff') {
                        this.ctx.globalCompositeOperation = 'multiply';
                        this.ctx.fillStyle = image.color;
                        this.ctx.fillRect(rectTransform.x, rectTransform.y, rectTransform.width, rectTransform.height);
                    }
                } else {
                    // If there's no source image, just draw a tinted rectangle
                    this.ctx.fillStyle = image.color;
                    this.ctx.fillRect(rectTransform.x, rectTransform.y, rectTransform.width, rectTransform.height);
                }

                this.ctx.restore();
            }

            // Draw children
            if (materia.children) {
                materia.children.forEach(drawUIElement);
            }
        };

        // Start drawing from the children of the canvas
        if (canvasMateria.children) {
            canvasMateria.children.forEach(drawUIElement);
        }

        this.end();
    }

    drawTextureInRect(textureRender, transform) {
        const pos = transform.position;
        const scale = transform.localScale;

        this.ctx.save();
        this.ctx.translate(pos.x, pos.y);
        this.ctx.scale(scale.x, scale.y);

        if (textureRender.texture && textureRender.texture.complete) {
            const pattern = this.ctx.createPattern(textureRender.texture, 'repeat');
            this.ctx.fillStyle = pattern;
        } else {
            this.ctx.fillStyle = textureRender.color;
        }

        if (textureRender.shape === 'Rectangle') {
            this.ctx.fillRect(-textureRender.width / 2, -textureRender.height / 2, textureRender.width, textureRender.height);
        } else if (textureRender.shape === 'Circle') {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, textureRender.radius, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        // Add other shapes if needed

        this.ctx.restore();
    }
}

console.log("Renderer.js loaded");
