import * as SceneManager from './SceneManager.ts';
import { Camera, Transform } from './Components.ts';

interface ICamera {
    orthographicSize: number;
    zoom: number;
    x: number;
    y: number;
    effectiveZoom: number;
}

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    camera: ICamera | null;
    isEditor: boolean;

    constructor(canvas: HTMLCanvasElement, isEditor: boolean = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        this.camera = null; // Will be assigned from the scene
        this.isEditor = isEditor;
        this.resize();
    }

    resize(): void {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    beginWorld(): void {
        this.ctx.save();

        const sceneCameraMateria = SceneManager.currentScene.findFirstCamera();
        let cameraComponent: any;
        let cameraTransform: any;

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

    beginUI(): void {
        this.ctx.save();
        // Reset transform to identity for screen-space UI rendering
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    end(): void {
        this.ctx.restore();
    }

    drawRect(x: number, y: number, width: number, height: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
    }

    drawImage(image: HTMLImageElement, x: number, y: number, width: number, height: number): void {
        this.ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
    }

    drawText(text: string, x: number, y: number, color: string, fontSize: number, textTransform: string): void {
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
