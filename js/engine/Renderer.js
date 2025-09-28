import * as SceneManager from './SceneManager.js';
import { Camera, Transform, PointLight2D, SpotLight2D, FreeformLight2D, SpriteLight2D, Tilemap } from './Components.js';

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

        // The palette now must contain an array of tile definitions
        if (!tilemap || !transform || !tilemapRenderer.tileSheet || !tilemapRenderer.palette || !tilemapRenderer.palette.tiles) {
            return;
        }

        const { tileWidth, tileHeight, columns, rows, layers } = tilemap;
        const { tileSheet } = tilemapRenderer;
        const tiles = tilemapRenderer.palette.tiles;

        // Save context state before applying tilemap-specific transform
        this.ctx.save();

        // Position the tilemap based on its transform component
        this.ctx.translate(transform.x, transform.y);
        this.ctx.rotate(transform.rotation * Math.PI / 180);

        const mapWidth = columns * tileWidth;
        const mapHeight = rows * tileHeight;

        // Offset by half the map size so the transform's (x,y) is the center
        this.ctx.translate(-mapWidth / 2, -mapHeight / 2);

        // Iterate through each layer object and draw its data grid
        for (const layer of layers) {
            const gridData = layer.data;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < columns; c++) {
                    const tileId = gridData[r][c];

                    if (tileId === -1) {
                        continue; // Skip empty tiles
                    }

                    // Find the specific tile definition from the palette using its ID.
                    // A Map would be faster, but for typical palette sizes, this is fine.
                    const tile = tiles.find(t => t.id === tileId);

                    if (!tile) {
                        continue; // Skip if tile definition is missing for this ID
                    }

                    // Source rectangle from the palette's tile definition
                    const sx = tile.x;
                    const sy = tile.y;
                    const sWidth = tile.width;
                    const sHeight = tile.height;

                    // Destination x/y on the canvas, based on the uniform grid
                    const dx = c * tileWidth;
                    const dy = r * tileHeight;

                    this.ctx.drawImage(
                        tileSheet,
                        sx, sy,           // Source x, y, width, height from palette
                        sWidth, sHeight,
                        dx, dy,           // Destination x, y on the canvas
                        tileWidth, tileHeight  // Destination width, height are uniform grid size
                    );
                }
            }
        }

        // Restore context state
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
}

console.log("Renderer.js loaded");
