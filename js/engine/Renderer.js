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

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    beginWorld() {
        this.ctx.save();

        if (this.isEditor) {
            // The editor uses its own persistent camera. We just need to update its effectiveZoom.
            // This is a simple zoom model. A more advanced one might be logarithmic.
            this.camera.effectiveZoom = this.camera.zoom;
        } else {
            // The game view renderer still finds the camera from the scene.
            const sceneCameraMateria = SceneManager.currentScene.findFirstCamera();
            if (sceneCameraMateria) {
                const cameraComponent = sceneCameraMateria.getComponent(Camera);
                const cameraTransform = sceneCameraMateria.getComponent(Transform);
                this.camera = {
                    ...cameraComponent,
                    x: cameraTransform.x,
                    y: cameraTransform.y,
                    effectiveZoom: (this.canvas.height / (cameraComponent.orthographicSize * 2))
                };
            } else {
                this.camera = null; // No camera in scene, game view is blank.
            }
        }

        if (!this.camera) {
            // If there's no camera, we still need to save the context so end() works
            // but we don't apply any transformations.
            return;
        }

        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.effectiveZoom, this.camera.effectiveZoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
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
