import * as SceneManager from './SceneManager.js';
import { Camera, Transform } from './Components.js';

export class Renderer {
    constructor(canvas, isEditor = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = null; // Will be assigned from the scene
        this.isEditor = isEditor;
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

        const sceneCameraMateria = SceneManager.currentScene.findFirstCamera();
        let cameraComponent;
        let cameraTransform;

        if (sceneCameraMateria) {
            cameraComponent = sceneCameraMateria.getComponent(Camera);
            cameraTransform = sceneCameraMateria.getComponent(Transform);
        }

        // The editor renderer creates a default camera if none exists.
        // The game renderer will have a null camera and won't render.
        if (!cameraComponent && this.isEditor) {
            cameraComponent = { orthographicSize: 500, zoom: 1.0 }; // A dummy for default view
            cameraTransform = { x: 0, y: 0 };
        }

        this.camera = cameraComponent ? {
            ...cameraComponent,
            x: cameraTransform.x,
            y: cameraTransform.y,
            // Game view zoom is determined by ortho size, editor can have its own zoom
            effectiveZoom: this.isEditor ? cameraComponent.zoom : (this.canvas.height / (cameraComponent.orthographicSize * 2))
        } : null;

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
