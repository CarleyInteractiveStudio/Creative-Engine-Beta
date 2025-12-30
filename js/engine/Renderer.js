import * as SceneManager from './SceneManager.js';
import * as Components from './Components.js';

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

    drawTilemap(tilemapRenderer, transform, grid, tilemap) {
        if (!tilemap || !transform || !grid) return;

        this.ctx.save();
        this.ctx.translate(transform.position.x, transform.position.y);
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

    drawSprite(spriteRenderer, transform) {
        const { sprite, color, spriteSheet, spriteName } = spriteRenderer;
        if (!sprite || !sprite.complete || sprite.naturalWidth === 0) {
            // Draw a white placeholder if the sprite is missing but the component exists
            this.ctx.save();
            this.ctx.translate(transform.position.x, transform.position.y);
            this.ctx.rotate(transform.rotation * Math.PI / 180);
            this.ctx.fillStyle = 'white';
            const placeholderSize = 50;
            this.ctx.fillRect(-placeholderSize / 2, -placeholderSize / 2, placeholderSize, placeholderSize);
            this.ctx.restore();
            return;
        }

        const { x: scaleX, y: scaleY } = transform.scale;

        this.ctx.save();
        this.ctx.translate(transform.position.x, transform.position.y);
        this.ctx.rotate(transform.rotation * Math.PI / 180);

        if (spriteSheet && spriteName && spriteSheet.sprites[spriteName]) {
            const spriteData = spriteSheet.sprites[spriteName];
            const { x, y, width, height } = spriteData.rect;

            // Adjust for pivot
            const pivotX = spriteData.pivot ? spriteData.pivot.x : 0.5;
            const pivotY = spriteData.pivot ? spriteData.pivot.y : 0.5;
            const finalWidth = width * scaleX;
            const finalHeight = height * scaleY;

            this.ctx.drawImage(sprite, x, y, width, height, -finalWidth * pivotX, -finalHeight * pivotY, finalWidth, finalHeight);
        } else {
            const finalWidth = sprite.naturalWidth * scaleX;
            const finalHeight = sprite.naturalHeight * scaleY;
            this.ctx.drawImage(sprite, -finalWidth / 2, -finalHeight / 2, finalWidth, finalHeight);
        }

        this.ctx.restore();
    }

    drawUIText(uiText, transform) {
        const { text, font, size, color } = uiText;

        this.ctx.save();
        this.ctx.translate(transform.position.x, transform.position.y);
        this.ctx.rotate(transform.rotation * Math.PI / 180);

        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px ${font}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, 0, 0);

        this.ctx.restore();
    }

    updateScene(scene, editorCamera = null) {
        const gameCameraMateria = scene.getActiveCamera();
        const cameraToUse = this.isEditor ? editorCamera : gameCameraMateria;

        this.clear(cameraToUse ? cameraToUse.getComponent(Components.Camera) : null);

        // 1. Group renderables by their canvas
        const canvasMap = new Map(); // Maps Canvas Materia -> children
        const orphans = []; // Objects not belonging to any canvas

        for (const materia of scene.getAllMaterias()) {
            if (!materia.isActive) continue;

            const hasRenderer = materia.getComponent(Components.SpriteRenderer) || materia.getComponent(Components.UIText) || materia.getComponent(Components.TilemapRenderer);
            if (!hasRenderer) continue;

            const parentCanvasMateria = materia.findParentMateriaWithComponent(Components.Canvas);

            if (parentCanvasMateria) {
                if (!canvasMap.has(parentCanvasMateria)) {
                    canvasMap.set(parentCanvasMateria, []);
                }
                canvasMap.get(parentCanvasMateria).push(materia);
            } else {
                orphans.push(materia);
            }
        }

        // --- 2. WORLD SPACE PASS ---
        this.beginWorld(cameraToUse);

        // Draw orphans
        for (const materia of orphans) {
            this.drawMateria(materia, scene);
        }

        // Draw World Space Canvases and their children
        for (const [canvasMateria, children] of canvasMap.entries()) {
            const canvasComponent = canvasMateria.getComponent(Components.Canvas);
            if (canvasComponent.renderMode === 'World Space') {
                const transform = canvasMateria.getComponent(Components.Transform);
                if (!transform) continue;

                this.ctx.save();

                // Apply clipping mask for the canvas
                const { x, y } = transform.position;
                const { x: scaleX, y: scaleY } = transform.localScale;
                const rotation = transform.rotation * (Math.PI / 180);

                this.ctx.translate(x, y);
                this.ctx.rotate(rotation);
                this.ctx.beginPath();
                this.ctx.rect(-scaleX / 2, -scaleY / 2, scaleX, scaleY);
                this.ctx.clip();

                // Undo the transformation so children are drawn in correct world space
                this.ctx.rotate(-rotation);
                this.ctx.translate(-x, -y);

                // Draw children
                for (const child of children) {
                    this.drawMateria(child, scene);
                }

                this.ctx.restore();
            }
        }

        this.end(); // End world space drawing

        // --- 3. SCREEN SPACE PASS ---
        this.beginUI();

        for (const [canvasMateria, children] of canvasMap.entries()) {
            const canvasComponent = canvasMateria.getComponent(Components.Canvas);
            if (canvasComponent.renderMode === 'Screen Space') {
                const transform = canvasMateria.getComponent(Components.Transform);
                if (!transform) continue;

                this.ctx.save();

                // Apply clipping mask for the canvas in screen space
                const { x, y } = transform.position; // Position is now in screen coordinates
                const { x: scaleX, y: scaleY } = transform.localScale;
                 const rotation = transform.rotation * (Math.PI / 180);

                this.ctx.translate(x, y);
                this.ctx.rotate(rotation);
                this.ctx.beginPath();
                this.ctx.rect(-scaleX / 2, -scaleY / 2, scaleX, scaleY);
                this.ctx.clip();

                // Undo the transformation for children
                this.ctx.rotate(-rotation);
                this.ctx.translate(-x, -y);

                // Draw children
                for (const child of children) {
                    this.drawMateria(child, scene);
                }

                this.ctx.restore();
            }
        }

        this.end(); // End UI space drawing
    }

    // Helper to draw any renderable components on a Materia
    drawMateria(materia, scene) {
        const transform = materia.getComponent(Components.Transform);
        if (!transform) return;

        const spriteRenderer = materia.getComponent(Components.SpriteRenderer);
        if (spriteRenderer) this.drawSprite(spriteRenderer, transform);

        const uiText = materia.getComponent(Components.UIText);
        if (uiText) this.drawUIText(uiText, transform);

    const tilemapRenderer = materia.getComponent(Components.TilemapRenderer);
    if (tilemapRenderer) {
        const tilemap = materia.getComponent(Components.Tilemap);
        let grid = null;
        if (materia.parent) {
            const parentMateria = (typeof materia.parent === 'number')
                ? scene.findMateriaById(materia.parent)
                : materia.parent;

            if (parentMateria) {
                grid = parentMateria.getComponent(Components.Grid);
            }
        }

        if (tilemap && grid) {
            this.drawTilemap(tilemapRenderer, transform, grid, tilemap);
        }
    }
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
}

console.log("Renderer.js loaded");
