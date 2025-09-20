import * as SceneManager from './SceneManager.js';
import { Camera, Transform, BoxCollider } from './Components.js';
import * as MathUtils from './MathUtils.js';

export class Renderer {
    constructor(canvas, isEditor = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isEditor = isEditor;

        // Lighting System
        this.lightMapCanvas = document.createElement('canvas');
        this.lightMapCtx = this.lightMapCanvas.getContext('2d');
        this.ambientColor = 'rgba(10, 10, 25, 0.95)'; // A dark blue for ambient night

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

        // Match lightmap canvas size
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

    // --- Lighting Methods ---

    drawLights(lights, allMaterias, camera) {
        const lCtx = this.lightMapCtx;
        if (!camera) return;

        // 1. Fill the entire lightmap with the ambient color
        lCtx.globalCompositeOperation = 'source-over';
        lCtx.fillStyle = this.ambientColor;
        lCtx.fillRect(0, 0, lCtx.canvas.width, lCtx.canvas.height);

        // 2. Use 'lighter' blending for lights to add them together
        lCtx.globalCompositeOperation = 'lighter';

        for (const lightMateria of lights) {
            const light = lightMateria.getComponent(Components.Light);
            const transform = lightMateria.getComponent(Components.Transform);
            if (!light || !transform) continue;

            const screenX = (transform.x - camera.x) * camera.effectiveZoom + lCtx.canvas.width / 2;
            const screenY = (transform.y - camera.y) * camera.effectiveZoom + lCtx.canvas.height / 2;
            const screenRadius = light.range * camera.effectiveZoom;
            if (screenRadius <= 0) continue;

            const lightColorHex = Math.round(light.intensity * 255).toString(16).padStart(2, '0');
            lCtx.fillStyle = `${light.color}${lightColorHex}`;

            if (light.type === 'Point') {
                const gradient = lCtx.createRadialGradient(screenX, screenY, 0, screenX, screenY, screenRadius);
                gradient.addColorStop(0, `${light.color}${lightColorHex}`);
                gradient.addColorStop(1, `${light.color}00`);
                lCtx.fillStyle = gradient;

                lCtx.beginPath();
                lCtx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                lCtx.fill();
            } else if (light.type === 'Area') {
                lCtx.save();
                lCtx.translate(screenX, screenY);
                const rotationRad = transform.rotation * Math.PI / 180;
                lCtx.rotate(rotationRad);

                const size = light.range * camera.effectiveZoom;

                lCtx.beginPath();
                switch(light.shape) {
                    case 'Box':
                        lCtx.rect(-size / 2, -size / 2, size, size);
                        break;
                    case 'Circle':
                    default:
                        lCtx.arc(0, 0, size / 2, 0, Math.PI * 2);
                        break;
                }
                lCtx.fill();
                lCtx.restore();
            } else if (light.type === 'Directional') {
                // For directional, we can add a tint to the whole lightmap
                // The intensity affects the alpha of this overlay.
                lCtx.globalCompositeOperation = 'source-atop'; // Affects existing light/dark areas
                lCtx.fillStyle = `rgba(255, 255, 255, ${light.intensity * 0.1})`; // Add a subtle white wash
                lCtx.fillRect(0, 0, lCtx.canvas.width, lCtx.canvas.height);
                lCtx.globalCompositeOperation = 'lighter'; // Set it back for other lights
            }
        }

        // 3. Cut out shadows from the lights
        lCtx.globalCompositeOperation = 'destination-out';
        const shadowCasters = allMaterias.filter(m => m.getComponent(Components.BoxCollider));

        for (const lightMateria of lights) {
            const light = lightMateria.getComponent(Components.Light);
            const lightTransform = lightMateria.getComponent(Transform);
            if (!light.castShadows || !lightTransform) continue;

            const lightPos = { x: lightTransform.x, y: lightTransform.y };

            for (const caster of shadowCasters) {
                if (caster === lightMateria) continue; // A light shouldn't cast a shadow from itself

                const vertices = MathUtils.getBoxColliderVertices(caster);
                if (!vertices) continue;

                const shadowPolygon = MathUtils.calculateShadowPolygon(lightPos, vertices, light.range * 2);

                // Convert world-space shadow polygon to screen-space for drawing
                const screenPolygon = shadowPolygon.map(p => ({
                    x: (p.x - camera.x) * camera.effectiveZoom + lCtx.canvas.width / 2,
                    y: (p.y - camera.y) * camera.effectiveZoom + lCtx.canvas.height / 2,
                }));

                lCtx.fillStyle = 'rgba(0,0,0,1)';
                lCtx.beginPath();
                lCtx.moveTo(screenPolygon[0].x, screenPolygon[0].y);
                for (let i = 1; i < screenPolygon.length; i++) {
                    lCtx.lineTo(screenPolygon[i].x, screenPolygon[i].y);
                }
                lCtx.closePath();
                lCtx.fill();
            }
        }
    }

    applyLighting(config) {
        const lCtx = this.lightMapCtx;
        const shadowQuality = config?.graphics?.shadowQuality || 'hard';

        if (shadowQuality === 'soft') {
            // Applying a blur filter. Note: this can be slow.
            // A more optimized approach might use multiple smaller canvases or shaders.
            lCtx.filter = 'blur(8px)';
            // Draw the canvas onto itself to apply the filter
            lCtx.drawImage(lCtx.canvas, 0, 0);
            lCtx.filter = 'none'; // Reset filter
        }

        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Use screen space
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.drawImage(this.lightMapCanvas, 0, 0);
        this.ctx.globalCompositeOperation = 'source-over'; // Reset
        this.ctx.restore();
    }
}

console.log("Renderer.js loaded");
