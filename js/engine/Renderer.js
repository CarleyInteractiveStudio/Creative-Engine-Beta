import * as SceneManager from './SceneManager.js';
import { Camera, Transform, BoxCollider, Light } from './Components.js';
import * as MathUtils from './MathUtils.js';

export class Renderer {
    constructor(canvas, isEditor = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isEditor = isEditor;

        // Lighting System
        this.lightMapCanvas = document.createElement('canvas');
        this.lightMapCtx = this.lightMapCanvas.getContext('2d');
        this.ambientColor = 'rgba(10, 10, 25, 0.95)';

        if (this.isEditor) {
            this.camera = { x: 0, y: 0, zoom: 1.0, effectiveZoom: 1.0 };
        } else {
            this.camera = null;
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
        if (cameraComponent && cameraComponent.clearFlags === 'DontClear') return;
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
            const effectiveZoom = this.canvas.height / (cameraComponent.orthographicSize * 2 || 1);
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
        this.ctx.rotate(-(transform.rotation || 0) * Math.PI / 180);
        this.ctx.translate(-activeCamera.x, -activeCamera.y);
    }

    end() {
        this.ctx.restore();
    }

    drawLights(lights, allMaterias, camera) {
        const lCtx = this.lightMapCtx;
        if (!camera) return;

        lCtx.globalCompositeOperation = 'source-over';
        lCtx.fillStyle = this.ambientColor;
        lCtx.fillRect(0, 0, lCtx.canvas.width, lCtx.canvas.height);
        lCtx.globalCompositeOperation = 'lighter';

        for (const lightMateria of lights) {
            const light = lightMateria.getComponent(Light);
            const transform = lightMateria.getComponent(Transform);
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
                // ... Area light drawing logic ...
            }
        }

        lCtx.globalCompositeOperation = 'destination-out';
        const shadowCasters = allMaterias.filter(m => m.getComponent(BoxCollider));
        for (const lightMateria of lights) {
            const light = lightMateria.getComponent(Light);
            const lightTransform = lightMateria.getComponent(Transform);
            if (!light.castShadows || !lightTransform) continue;
            const lightPos = { x: lightTransform.x, y: lightTransform.y };

            for (const caster of shadowCasters) {
                if (caster === lightMateria) continue;
                const vertices = MathUtils.getBoxColliderVertices(caster);
                if (!vertices) continue;
                const shadowPolygon = MathUtils.calculateShadowPolygon(lightPos, vertices, light.range * 2);
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
            lCtx.filter = 'blur(8px)';
            lCtx.drawImage(lCtx.canvas, 0, 0);
            lCtx.filter = 'none';
        }
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.drawImage(this.lightMapCanvas, 0, 0);
        this.ctx.restore();
    }
}

console.log("Renderer.js loaded");
