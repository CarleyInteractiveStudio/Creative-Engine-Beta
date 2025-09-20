import * as SceneManager from './SceneManager.js';
import { Camera, Transform } from './Components.js';

export class Renderer {
    constructor(canvas, isEditor = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isEditor = isEditor;

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
}

console.log("Renderer.js loaded");
