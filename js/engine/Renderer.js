import * as SceneManager from './SceneManager.js';
import * as PerformanceAPI from './PerformanceAPI.js';
import { Camera, Transform, PointLight2D, SpotLight2D, FreeformLight2D, SpriteLight2D, Tilemap, Grid, Canvas, SpriteRenderer, TilemapRenderer, TextureRender, UITransform, UIImage, UIText, DrawingOrder, Terreno2D, Gyzmo, Animator, UIEventTrigger, VideoPlayer, Water, LineCollider2D, Bone, SkeletonRenderer, UIMask, UIScrollRect, UICollider } from './Components.js';
import { getAbsoluteRect, calculateLetterbox } from './UITransformUtils.js';
export class Renderer {
    constructor(canvas, isEditor = false, isGameView = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isEditor = isEditor;
        this.isGameView = isGameView;

        this.lightMapCanvas = document.createElement('canvas');
        this.lightMapCtx = this.lightMapCanvas.getContext('2d');
        this.allLightsCanvas = document.createElement('canvas');
        this.allLightsCtx = this.allLightsCanvas.getContext('2d');
        this.lightBufferCanvas = document.createElement('canvas');
        this.lightBufferCtx = this.lightBufferCanvas.getContext('2d');
        this.ambientLight = '#1a1a2a'; // A dark blue/purple for ambient light

        if (this.isEditor) {
            this.camera = { x: 0, y: 0, z: 1000, rotation: { x: 0, y: 0, z: 0 }, zoom: 1.0, effectiveZoom: 1.0 };
        } else {
            this.camera = null;
        }
        this.resize();
    }

    _drawUIText(uiText, drawX, drawY, drawWidth, drawHeight) {
        this.ctx.save();
        this.ctx.font = `${uiText.fontSize}px ${uiText.fontFamily || 'sans-serif'}`;
        this.ctx.fillStyle = uiText.color;
        this.ctx.textAlign = uiText.horizontalAlign;
        this.ctx.textBaseline = 'middle';

        let textToRender = uiText.text;
        if (uiText.textTransform === 'uppercase') {
            textToRender = textToRender.toUpperCase();
        } else if (uiText.textTransform === 'lowercase') {
            textToRender = textToRender.toLowerCase();
        }

        let textX = drawX;
        if (uiText.horizontalAlign === 'center') {
            textX += drawWidth / 2;
        } else if (uiText.horizontalAlign === 'right') {
            textX += drawWidth;
        }

        const textY = drawY + drawHeight / 2;
        this.ctx.fillText(textToRender, textX, textY);
        this.ctx.restore();
    }


    setAmbientLight(color) {
        this.ambientLight = color;
    }

    setCanvas(newCanvas) {
        this.canvas = newCanvas;
        this.ctx = newCanvas.getContext('2d');
        this.resize();
    }

    resize() {
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        
        // Safety check for client dimensions
        const clientWidth = this.canvas.clientWidth || this.canvas.width || 800;
        const clientHeight = this.canvas.clientHeight || this.canvas.height || 600;

        this.canvas.width = clientWidth;
        this.canvas.height = clientHeight;
        this.lightMapCanvas.width = this.canvas.width;
        this.lightMapCanvas.height = this.canvas.height;
        this.allLightsCanvas.width = this.canvas.width;
        this.allLightsCanvas.height = this.canvas.height;
        
        const rendererType = this.isEditor ? 'EDITOR' : 'GAME';
        const containerElement = this.canvas.parentElement;

        let containerDisplay = "block";
        let containerVisible = true;

        if (containerElement) {
            try {
                const win = containerElement.ownerDocument.defaultView || window;
                const style = win.getComputedStyle(containerElement);
                containerDisplay = style.display;
                containerVisible = containerElement.offsetParent !== null;
            } catch (e) {
                // Fallback for cross-window or other issues
            }
        }
        
        // Removed noisy resize log
    }


    clear(cameraComponent) {
        if (cameraComponent && cameraComponent.clearFlags === 'DontClear') {
            return;
        }

        const rect = (cameraComponent && cameraComponent.rect) ? cameraComponent.rect : { x: 0, y: 0, w: 1, h: 1 };
        const x = rect.x * this.canvas.width;
        const y = rect.y * this.canvas.height;
        const w = rect.w * this.canvas.width;
        const h = rect.h * this.canvas.height;

        if (cameraComponent && cameraComponent.clearFlags === 'SolidColor') {
            this.ctx.fillStyle = cameraComponent.backgroundColor;
            this.ctx.fillRect(x, y, w, h);
        } else if (!cameraComponent && this.isEditor && !this.isGameView) {
            // In editor mode with no specific camera, clear to transparent to show CSS background
            this.ctx.clearRect(x, y, w, h);
        } else {
            this.ctx.clearRect(x, y, w, h);
        }
    }

    beginWorld(cameraMateria = null) {
        this.ctx.save();
        let activeCamera, transform;

        if (cameraMateria) {
            const cameraComponent = cameraMateria.getComponent(Camera);
            const cameraTransform = cameraMateria.getComponent(Transform);
            const rect = cameraComponent.rect || { x: 0, y: 0, w: 1, h: 1 };

            this.clear(cameraComponent);

            // Set Clip region for this camera
            const cx = rect.x * this.canvas.width;
            const cy = rect.y * this.canvas.height;
            const cw = rect.w * this.canvas.width;
            const ch = rect.h * this.canvas.height;

            this.ctx.beginPath();
            this.ctx.rect(cx, cy, cw, ch);
            this.ctx.clip();

            let effectiveZoom = 1.0;
            if (cameraComponent.projection === 'Orthographic') {
                effectiveZoom = ch / (cameraComponent.orthographicSize * 2 || 1);
            } else {
                effectiveZoom = 1 / Math.tan(cameraComponent.fov * 0.5 * Math.PI / 180);
            }
            let cameraX = cameraTransform.x;
            let cameraY = cameraTransform.y;
            if (cameraComponent.shakeOffset) {
                cameraX += cameraComponent.shakeOffset.x;
                cameraY += cameraComponent.shakeOffset.y;
            }
            activeCamera = { x: cameraX, y: cameraY, effectiveZoom, rect: { cx, cy, cw, ch } };
            transform = cameraTransform;
        } else if (this.isEditor) {
            this.clear(null);
            this.camera.effectiveZoom = this.camera.zoom;
            activeCamera = this.camera;
            transform = { rotation: 0 };
        } else {
            this.clear(null);
            activeCamera = { x: 0, y: 0, effectiveZoom: 1.0 };
            transform = { rotation: 0 };
        }

        if (!activeCamera) {
            this.ctx.restore();
            return;
        }

        this.camera = activeCamera;

        if (activeCamera.rect) {
            this.ctx.translate(activeCamera.rect.cx + activeCamera.rect.cw / 2, activeCamera.rect.cy + activeCamera.rect.ch / 2);
        } else {
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        }
        this.ctx.scale(activeCamera.effectiveZoom, -activeCamera.effectiveZoom);
        const rotationInRadians = (transform.rotation || 0) * Math.PI / 180;
        this.ctx.rotate(rotationInRadians);
        this.ctx.translate(-activeCamera.x, -activeCamera.y);
    }

    beginUI() {
        this.ctx.save();
        // Restablecer transformaciones para evitar que el zoom de la cámara afecte la UI
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Aplicar un escalado uniforme para la UI si es necesario
        const uiScale = 1; // Ajustar este valor según sea necesario
        this.ctx.scale(uiScale, uiScale);
    }

    end() {
        this.ctx.restore();
    }

    drawRect(x, y, width, height, color) {
        if (window._PerformanceMetrics) {
            window._PerformanceMetrics.texturesDrawn = (window._PerformanceMetrics.texturesDrawn || 0) + 1;
        }
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
    }

    drawImage(image, x, y, width, height) {
        // Safe check for negative dimensions
        if (width === 0 || height === 0) return;

        if (window._PerformanceMetrics) {
            window._PerformanceMetrics.spritesDrawn = (window._PerformanceMetrics.spritesDrawn || 0) + 1;
        }

        this.ctx.save();
        this.ctx.translate(x, y);
        // Counter-flip Y because of global world scale(1, -1)
        this.ctx.scale(width < 0 ? -1 : 1, height < 0 ? 1 : -1);
        this.ctx.drawImage(image, -Math.abs(width) / 2, -Math.abs(height) / 2, Math.abs(width), Math.abs(height));
        this.ctx.restore();
    }

    drawText(text, x, y, color, fontSize, fontFamily, textTransform) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(1, -1); // Counter-flip text
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px ${fontFamily || 'sans-serif'}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let transformedText = text;
        if (textTransform === 'uppercase') {
            transformedText = text.toUpperCase();
        } else if (textTransform === 'lowercase') {
            transformedText = text.toLowerCase();
        }
        this.ctx.fillText(transformedText, 0, 0);
        this.ctx.restore();
    }

    drawGyzmo(gyzmo) {
        const transform = gyzmo.materia.getComponent(Transform);
        if (!transform) return;

        const isEditor = this.isEditor;
        const showInGameGlobal = gyzmo.showInGame;

        this.ctx.save();
        this.ctx.translate(transform.x, transform.y);
        this.ctx.rotate(transform.rotation * Math.PI / 180);
        // Counter-flip locally since world scale is (1, -1)
        this.ctx.scale(transform.scale.x, -transform.scale.y);

        const zoom = this.camera?.effectiveZoom || 1;

        for (const layer of gyzmo.layers) {
            if (!isEditor && (!showInGameGlobal || !layer.showInGame)) continue;

            const { x, y, width, height, color, name } = layer;

            // Draw rectangle
            this.ctx.globalAlpha = isEditor ? 0.3 : 0.5;
            this.ctx.fillStyle = color || '#00ff00';
            this.ctx.fillRect(x - width / 2, y - height / 2, width, height);

            // Draw border
            this.ctx.globalAlpha = 0.8;
            this.ctx.strokeStyle = color || '#00ff00';
            this.ctx.lineWidth = 2 / zoom;
            this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);

            if (isEditor) {
                // Draw name tag
                this.ctx.save();
                this.ctx.translate(x, y - height / 2 - (5 / zoom));
                this.ctx.scale(1, -1);
                this.ctx.globalAlpha = 1.0;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = `${12 / zoom}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(name || "Área", 0, 0);
                this.ctx.restore();
            }
        }

        this.ctx.restore();
        this.ctx.globalAlpha = 1.0;
    }

    drawBone(bone) {
        if (!this.isEditor) return;

        const transform = bone.materia.getComponent(Transform);
        if (!transform) return;

        const zoom = this.camera?.effectiveZoom || 1;
        const { length, color, thickness } = bone;

        this.ctx.save();
        this.ctx.translate(transform.x, transform.y);
        this.ctx.rotate(transform.rotation * Math.PI / 180);
        this.ctx.scale(1, -1);

        // Draw bone shape (a diamond/triangle starting from origin)
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(length * 0.1, -thickness / zoom);
        this.ctx.lineTo(length, 0);
        this.ctx.lineTo(length * 0.1, thickness / zoom);
        this.ctx.closePath();

        this.ctx.fillStyle = color || '#00ff00';
        this.ctx.globalAlpha = 0.6;
        this.ctx.fill();

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1 / zoom;
        this.ctx.stroke();

        // Draw joint circle
        this.ctx.beginPath();
        this.ctx.arc(0, 0, (thickness * 1.5) / zoom, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();

        this.ctx.restore();
    }

    drawSkeleton(skeleton) {
        const transform = skeleton.materia.getComponent(Transform);
        if (!transform || !skeleton.mesh || !skeleton.bones.length) return;

        const { ctx } = this;
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(1, -1);
        ctx.translate(-transform.x, -transform.y);
        const mesh = skeleton.mesh;
        const bindPoses = skeleton.bindPoses;

        if (!skeleton._boneMateriaCache || skeleton._boneMateriaCache.length !== skeleton.bones.length) {
            skeleton._updateBoneCache();
        }

        const boneTransforms = skeleton._boneMateriaCache.map(mtr => mtr ? mtr.getComponent(Transform) : null);

        // Compute deformed vertices in WORLD space
        const deformedVertices = [];
        for (let i = 0; i < mesh.vertices.length; i += 2) {
            const vx = mesh.vertices[i];
            const vy = mesh.vertices[i+1];
            const weights = mesh.weights[i/2] || [];

            let finalX = 0, finalY = 0;
            let totalWeight = 0;

            for (const w of weights) {
                const boneTrans = boneTransforms[w.boneIndex];
                const bindPose = bindPoses[w.boneIndex];
                if (!boneTrans || !bindPose) continue;

                // 1. Vertex local to skeleton root -> Vertex local to bone (using bind pose)
                // We assume vertices are relative to skeleton transform at bind time
                const dx = vx - (bindPose.x - transform.x);
                const dy = vy - (bindPose.y - transform.y);
                const radBind = -bindPose.rotation * Math.PI / 180;
                const cosB = Math.cos(radBind), sinB = Math.sin(radBind);
                const lx = (dx * cosB - dy * sinB) / (bindPose.scale?.x || 1);
                const ly = (dx * sinB + dy * cosB) / (bindPose.scale?.y || 1);

                // 2. Vertex local to bone -> Vertex in world space (using current bone transform)
                const radBone = boneTrans.rotation * Math.PI / 180;
                const cosA = Math.cos(radBone), sinA = Math.sin(radBone);

                const tx = (lx * (boneTrans.scale?.x || 1) * cosA - ly * (boneTrans.scale?.y || 1) * sinA) + boneTrans.x;
                const ty = (lx * (boneTrans.scale?.x || 1) * sinA + ly * (boneTrans.scale?.y || 1) * cosA) + boneTrans.y;

                finalX += tx * w.weight;
                finalY += ty * w.weight;
                totalWeight += w.weight;
            }

            if (totalWeight === 0) {
                // Fallback to skeleton local -> world
                const radSkel = transform.rotation * Math.PI / 180;
                const cosS = Math.cos(radSkel), sinS = Math.sin(radSkel);
                deformedVertices.push(
                    (vx * transform.scale.x * cosS - vy * transform.scale.y * sinS) + transform.x,
                    (vx * transform.scale.x * sinS + vy * transform.scale.y * cosS) + transform.y
                );
            } else {
                deformedVertices.push(finalX / totalWeight, finalY / totalWeight);
            }
        }

        const img = skeleton._texture;
        const hasTexture = img && img.complete && img.naturalWidth > 0;

        // Render Mesh - Context is already in World Space (via beginWorld)
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const i0 = mesh.indices[i];
            const i1 = mesh.indices[i+1];
            const i2 = mesh.indices[i+2];

            const v0 = { x: deformedVertices[i0*2], y: deformedVertices[i0*2+1], u: mesh.uvs[i0*2], v: mesh.uvs[i0*2+1] };
            const v1 = { x: deformedVertices[i1*2], y: deformedVertices[i1*2+1], u: mesh.uvs[i1*2], v: mesh.uvs[i1*2+1] };
            const v2 = { x: deformedVertices[i2*2], y: deformedVertices[i2*2+1], u: mesh.uvs[i2*2], v: mesh.uvs[i2*2+1] };

            if (hasTexture) {
                this._drawTexturedTriangle(img, v0, v1, v2);
            } else {
                this._drawSolidTriangle(v0, v1, v2, skeleton.color || '#ffffff');
            }
        }
        ctx.restore();
    }

    drawWater(water, x = null, y = null) {
        const transform = water.materia.getComponent(Transform);
        if (!transform) return;

        const perfMonitor = PerformanceAPI.getPerformanceMonitor();
        if (perfMonitor && perfMonitor.getShouldSimplifyWater()) {
             // In Extreme optimization, just draw a simple rectangle for water
             const ctx = this.ctx;
             ctx.save();
             const drawX = x !== null ? x : transform.x;
             const drawY = y !== null ? y : transform.y;
             ctx.translate(drawX, drawY);
             ctx.rotate(transform.rotation * Math.PI / 180);
            ctx.scale(transform.scale.x, -transform.scale.y);
             ctx.fillStyle = water.color || 'rgba(52, 152, 219, 0.5)';
             ctx.fillRect(-water.width/2, -water.height/2, water.width, water.height);
             ctx.restore();
             return;
        }

        // Culling: Si el agua está fuera de la cámara, no procesar renderizado
        if (this.camera && water.bounds) {
            const b = water.bounds;
            const cam = this.camera;
            const aspect = this.canvas.width / (this.canvas.height || 1);
            const ez = cam.effectiveZoom || 1.0;
            const viewH = (this.canvas.height / ez);
            const viewW = viewH * aspect;

            // Check if bounds overlap with camera viewport
            if (b.maxX < cam.x - viewW/2 || b.minX > cam.x + viewW/2 ||
                b.maxY < cam.y - viewH/2 || b.minY > cam.y + viewH/2) {
                return;
            }
        }

        const { ctx } = this;
        ctx.save();

        const isWorld = water._initializedWorldSpace;
        if (!isWorld) {
            const drawX = x !== null ? x : transform.x;
            const drawY = y !== null ? y : transform.y;
            ctx.translate(drawX, drawY);
            ctx.rotate(transform.rotation * Math.PI / 180);
            ctx.scale(transform.scale.x, -transform.scale.y);
        }

        const bounds = water.bounds;
        const w = Math.ceil(bounds.maxX - bounds.minX);
        const h = Math.ceil(bounds.maxY - bounds.minY);

        if (w <= 0 || h <= 0) { ctx.restore(); return; }

        // 1. Inicializar buffers lazily (Aumentado para acomodar mareas y evitar re-escalado)
        const margin = 60;
        const bufferW = Math.ceil(w + margin);
        const bufferH = Math.ceil(h + margin);

        if (!this._waterBuffer) {
            this._waterBuffer = document.createElement('canvas');
            this._particleBuffer = document.createElement('canvas');
        }

        // Solo re-escalar si es significativamente diferente para ahorrar performance
        if (!this._waterBufferCtx || Math.abs(this._waterBuffer.width - bufferW) > 100 || Math.abs(this._waterBuffer.height - bufferH) > 100 || this._waterBuffer.width < bufferW || this._waterBuffer.height < bufferH) {
            this._waterBuffer.width = this._particleBuffer.width = Math.min(2048, bufferW);
            this._waterBuffer.height = this._particleBuffer.height = Math.min(2048, bufferH);
            this._waterBufferCtx = this._waterBuffer.getContext('2d');
            this._particleBufferCtx = this._particleBuffer.getContext('2d');
        }

        if (!this._waterParticleSprite) {
            this._waterParticleSprite = document.createElement('canvas');
            this._waterParticleSprite.width = 64;
            this._waterParticleSprite.height = 64;
            const pCtx = this._waterParticleSprite.getContext('2d');
            const grad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'white');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            pCtx.fillStyle = grad;
            pCtx.fillRect(0, 0, 64, 64);
        }

        const bCtx = this._waterBufferCtx;
        const pCtx = this._particleBufferCtx;

        pCtx.clearRect(0, 0, bufferW, bufferH);
        bCtx.clearRect(0, 0, bufferW, bufferH);

        // 2. Dibujar partículas RÁPIDO
        const pr = water._particleRadius || 14;
        const pSize = pr * 3.5; // Dibujar un poco más grande para mejor solapamiento
        const pOffset = pSize / 2;

        pCtx.fillStyle = 'white';
        for (let i = 0; i < water.particles.length; i++) {
            const p = water.particles[i];
            // Solo dibujar si está dentro de los límites del buffer actual (en caso de recorte)
            const dx = p.x - bounds.minX;
            const dy = p.y - bounds.minY;
            if (dx >= 0 && dx <= bufferW && dy >= 0 && dy <= bufferH) {
                pCtx.drawImage(this._waterParticleSprite, dx - pOffset, dy - pOffset, pSize, pSize);
            }
        }

        // 3. Aplicar Blur (Metaball pre-pass)
        const canUseFilter = typeof bCtx.filter === 'string';
        bCtx.save();
        // Blur moderado combinado con el degradado radial de la partícula
        if (canUseFilter) bCtx.filter = 'blur(6px)';
        bCtx.drawImage(this._particleBuffer, 0, 0);
        bCtx.restore();

        // 4. Colorear
        bCtx.save();
        bCtx.globalCompositeOperation = 'source-in';
        bCtx.fillStyle = water.color || 'rgba(52, 152, 219, 0.8)';
        bCtx.fillRect(0, 0, this._waterBuffer.width, this._waterBuffer.height);
        bCtx.restore();

        // 5. Dibujar buffer final con Contraste (Metaball effect)
        ctx.save();
        // Contraste alto para crear bordes sólidos y fusionar partículas
        // Ajustado para que el agua se vea más "gruesa" y no se encoja tanto
        const contrastVal = this.isEditor ? 25 : 35;
        if (canUseFilter) ctx.filter = `contrast(${contrastVal}) brightness(1.1) saturate(1.2)`;
        else ctx.globalAlpha = 0.8;

        if (isWorld) {
            ctx.drawImage(this._waterBuffer, bounds.minX, bounds.minY, bufferW, bufferH);
        } else {
            // Local space draw
            ctx.drawImage(this._waterBuffer, bounds.minX, bounds.minY, bufferW, bufferH);
        }
        ctx.restore();

        if (this.isEditor) {
            const zoom = this.camera?.effectiveZoom || 1;

            // Feedback visual del área (siempre visible en el editor)
            ctx.save();
            if (isWorld) {
                ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
                ctx.fillRect(bounds.minX, bounds.minY, bufferW, bufferH);
                ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)'; // Increased visibility
                ctx.lineWidth = 1 / zoom;
                ctx.strokeRect(bounds.minX, bounds.minY, bufferW, bufferH);
            } else {
                ctx.fillStyle = 'rgba(52, 152, 219, 0.3)'; // Increased visibility
                ctx.fillRect(-water.width / 2, -water.height / 2, water.width, water.height);
                ctx.strokeStyle = '#3498db'; // Solid blue border
                ctx.lineWidth = 2 / zoom;
                ctx.strokeRect(-water.width / 2, -water.height / 2, water.width, water.height);
            }
            ctx.restore();

            // Dibujar el punto de origen de la materia de agua
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            const dotX = isWorld ? transform.x : 0;
            const dotY = isWorld ? transform.y : 0;
            ctx.arc(dotX, dotY, 5 / zoom, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.translate(dotX, dotY - 10 / zoom);
            ctx.scale(1, -1);
            ctx.font = `${10 / zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText("Water Source", 0, 0);
            ctx.restore();
        }

        ctx.restore();
    }

    drawLineCollider(collider, x = null, y = null) {
        const transform = collider.materia.getComponent(Transform);
        if (!transform || !collider.points || collider.points.length < 2) return;

        const drawX = x !== null ? x : transform.x;
        const drawY = y !== null ? y : transform.y;

        const { ctx, camera } = this;
        const zoom = camera ? camera.effectiveZoom : 1.0;

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(transform.rotation * Math.PI / 180);
        ctx.scale(transform.scale.x, -transform.scale.y);

        ctx.beginPath();
        ctx.moveTo(collider.points[0].x, collider.points[0].y);
        for (let i = 1; i < collider.points.length; i++) {
            ctx.lineTo(collider.points[i].x, collider.points[i].y);
        }

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();

        // Draw handles in editor
        if (this.isEditor) {
            ctx.fillStyle = '#ffffff';
            const s = 6 / zoom;
            for (const p of collider.points) {
                ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
            }
        }

        ctx.restore();
    }

    drawTerreno2D(terreno) {
        const transform = terreno.materia.getComponent(Transform);
        if (!transform || !terreno.layers) return;

        const perfMonitor = PerformanceAPI.getPerformanceMonitor();
        const quality = perfMonitor ? perfMonitor.getTextureQuality() : 'high';

        this.ctx.save();
        this.ctx.translate(transform.x, transform.y);
        this.ctx.rotate(transform.rotation * Math.PI / 180);
        this.ctx.scale(transform.scale.x, -transform.scale.y);

        const w = terreno.width;
        const h = terreno.height;

        if (!this._terrainBuffer) {
            this._terrainBuffer = document.createElement('canvas');
            this._terrainBufferCtx = this._terrainBuffer.getContext('2d');
        }
        this._terrainBuffer.width = w;
        this._terrainBuffer.height = h;
        const bCtx = this._terrainBufferCtx;

        for (let l = 0; l < terreno.layers.length; l++) {
            const layer = terreno.layers[l];
            if (!layer.maskCanvas) continue;

            const img = terreno.getImageForLayer(l);
            bCtx.clearRect(0, 0, w, h);

            // Skip non-base layers if extreme optimization is active
            if (quality === 'low' && l > 0 && perfMonitor && perfMonitor.getShouldReduceMapDetail()) continue;

            if (img && img.complete && img.naturalWidth > 0) {
                if (!layer._cachedPattern || layer._cachedPatternSrc !== img.src || layer._cachedPatternCtx !== bCtx) {
                    layer._cachedPattern = bCtx.createPattern(img, 'repeat');
                    layer._cachedPatternSrc = img.src;
                    layer._cachedPatternCtx = bCtx;
                }
                bCtx.fillStyle = layer._cachedPattern;
                bCtx.fillRect(0, 0, w, h);
            } else if (l === 0) {
                bCtx.fillStyle = terreno.baseColor || '#4a4a4a';
                bCtx.fillRect(0, 0, w, h);
            }

            // Clip this layer to its own mask
            bCtx.globalCompositeOperation = 'destination-in';
            bCtx.drawImage(layer.maskCanvas, 0, 0);
            bCtx.globalCompositeOperation = 'source-over';

            this.ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1.0;
            // Use this.drawImage to handle local Y counter-flip
            this.drawImage(this._terrainBuffer, 0, 0, w, h);
        }
        this.ctx.globalAlpha = 1.0;

        if (this.isEditor) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1 / (this.camera?.effectiveZoom || 1);
            this.ctx.strokeRect(x, y, w, h);
        }

        this.ctx.restore();
    }

    _drawSolidTriangle(v0, v1, v2, color) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(v0.x, v0.y);
        ctx.lineTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    _drawTexturedTriangle(img, v0, v1, v2) {
        const ctx = this.ctx;
        const x0 = v0.x, y0 = v0.y, u0 = v0.u * img.width, v0_uv = v0.v * img.height;
        const x1 = v1.x, y1 = v1.y, u1 = v1.u * img.width, v1_uv = v1.v * img.height;
        const x2 = v2.x, y2 = v2.y, u2 = v2.u * img.width, v2_uv = v2.v * img.height;

        const delta = u0 * v1_uv + v0_uv * u2 + u1 * v2_uv - v1_uv * u2 - v0_uv * u1 - u0 * v2_uv;
        if (delta === 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.clip();

        const a = (x0 * v1_uv + v0_uv * x2 + x1 * v2_uv - v1_uv * x2 - v0_uv * x1 - x0 * v2_uv) / delta;
        const b = (u0 * x1 + x0 * u2 + u1 * x2 - x1 * u2 - x0 * u1 - u0 * x2) / delta;
        const c = (u0 * v1_uv * x2 + v0_uv * x1 * u2 + x0 * u1 * v2_uv - x0 * v1_uv * u2 - v0_uv * u1 * x2 - u0 * x1 * v2_uv) / delta;
        const d = (y0 * v1_uv + v0_uv * y2 + y1 * v2_uv - v1_uv * y2 - v0_uv * y1 - y0 * v2_uv) / delta;
        const e = (u0 * y1 + y0 * u2 + u1 * y2 - y1 * u2 - y0 * u1 - u0 * y2) / delta;
        const f = (u0 * v1_uv * y2 + v0_uv * y1 * u2 + y0 * u1 * v2_uv - y0 * v1_uv * u2 - v0_uv * u1 * y2 - u0 * y1 * v2_uv) / delta;

        ctx.transform(a, d, b, e, c, f);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
    }

    drawTilemap(tilemapRenderer) {
        const tilemap = tilemapRenderer.materia.getComponent(Tilemap);
        const transform = tilemapRenderer.materia.getComponent(Transform);
        let gridMateria = null;
        const parent = tilemapRenderer.materia.parent;
        if (parent) {
            if (typeof parent === 'object' && typeof parent.getComponent === 'function') {
                gridMateria = parent;
            } else if (typeof parent === 'number') {
                gridMateria = SceneManager.currentScene.findMateriaById(parent);
            }
        }
        const grid = gridMateria ? gridMateria.getComponent(Grid) : null;
        if (!tilemap || !transform || !grid) return;

        this.ctx.save();
        this.ctx.translate(transform.x, transform.y);
        this.ctx.rotate(transform.rotation * Math.PI / 180);
        // Pre-flip Y scale for the entire tilemap renderer to avoid saving/restoring canvas context per tile
        this.ctx.scale(transform.scale.x, -transform.scale.y);

        const mapTotalWidth = tilemap.width * grid.cellSize.x;
        const mapTotalHeight = tilemap.height * grid.cellSize.y;

        let animator = tilemapRenderer.materia.getComponent(Animator);
        if (!animator) {
            animator = tilemapRenderer.materia.getComponentInParent(Animator);
        }
        if (!animator) {
            animator = tilemapRenderer.materia.getComponentInChildren(Animator);
        }

        // Camera culling parameters
        const cw = this.camera ? (this.camera.rect ? this.camera.rect.cw : this.canvas.width) : this.canvas.width;
        const ch = this.camera ? (this.camera.rect ? this.camera.rect.ch : this.canvas.height) : this.canvas.height;
        const zoom = this.camera ? this.camera.effectiveZoom : 1.0;
        const camX = this.camera ? this.camera.x : 0;
        const camY = this.camera ? this.camera.y : 0;

        const worldWidth = cw / zoom;
        const worldHeight = ch / zoom;
        const padding = 100; // 100 world units extra padding to prevent edge clipping

        const camMinX = camX - worldWidth / 2 - padding;
        const camMaxX = camX + worldWidth / 2 + padding;
        const camMinY = camY - worldHeight / 2 - padding;
        const camMaxY = camY + worldHeight / 2 + padding;

        for (const layer of tilemap.layers) {
            const layerOffsetX = layer.position.x * mapTotalWidth;
            const layerOffsetY = layer.position.y * mapTotalHeight;
            for (const [coord, tileData] of layer.tileData.entries()) {
                // Parse coordinates once and cache them on tileData to avoid high GC pressure/RAM allocation rate
                if (tileData.x === undefined || tileData.y === undefined) {
                    const [tx, ty] = coord.split(',').map(Number);
                    tileData.x = tx;
                    tileData.y = ty;
                }
                const x = tileData.x;
                const y = tileData.y;

                // Comprobar límites: los azulejos fuera del ancho/alto del Tilemap no se dibujan
                if (x < 0 || x >= tilemap.width || y < 0 || y >= tilemap.height) continue;

                const centerX = layerOffsetX + (x * grid.cellSize.x) - (mapTotalWidth / 2) + (grid.cellSize.x / 2);
                // In world space (+Y UP), Row 0 is at visual Top.
                // World Center Y of Map is transform.y. Map Height is mapTotalHeight.
                // Top Y of Map = transform.y + mapTotalHeight / 2.
                // Row y center world Y = (Top Y of layer) - (y * cellHeight) - (cellHeight / 2).
                // Top Y of layer = transform.y + mapTotalHeight / 2 + layerOffsetY.
                const worldCenterY = (mapTotalHeight / 2) - (y * grid.cellSize.y) - (grid.cellSize.y / 2) + layerOffsetY;

                // Viewport/Camera Culling
                const tileWorldX = transform.x + centerX * transform.scale.x;
                const tileWorldY = transform.y + worldCenterY * transform.scale.y;
                const marginX = (grid.cellSize.x * Math.abs(transform.scale.x)) / 2;
                const marginY = (grid.cellSize.y * Math.abs(transform.scale.y)) / 2;

                if (tileWorldX + marginX < camMinX || tileWorldX - marginX > camMaxX ||
                    tileWorldY + marginY < camMinY || tileWorldY - marginY > camMaxY) {
                    continue; // Culled (off-screen)
                }

                let image = null;

                if (tileData.type === 'animation' && animator) {
                    const clip = tilemapRenderer.getAnimationClip(tileData.animationPath);
                    if (clip && clip.frames) {
                        const frameIndex = animator.currentFrame % clip.frames.length;
                        const frameDataURL = clip.frames[frameIndex];
                        if (frameDataURL) {
                            image = tilemapRenderer.getImageForTile({ imageData: frameDataURL });
                        }
                    } else {
                        image = tilemapRenderer.getImageForTile(tileData);
                    }
                } else {
                    image = tilemapRenderer.getImageForTile(tileData);
                }

                if (image && image.complete && image.naturalWidth > 0) {
                    if (window._PerformanceMetrics) {
                        window._PerformanceMetrics.tilesDrawn = (window._PerformanceMetrics.tilesDrawn || 0) + 1;
                    }

                    // Directly draw image onto the Y-flipped transformed canvas context (no save/restore per tile)
                    const drawW = grid.cellSize.x + 0.5;
                    const drawH = grid.cellSize.y + 0.5;
                    this.ctx.drawImage(
                        image,
                        centerX - drawW / 2,
                        -worldCenterY - drawH / 2,
                        drawW,
                        drawH
                    );
                }
            }
        }
        this.ctx.restore();
    }

    beginLights(filtroColor = null, filtroOpacidad = 1.0) {
        // Prepare main lightmap with ambient filter
        this.lightMapCtx.save();
        this.lightMapCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.lightMapCtx.globalCompositeOperation = 'source-over';

        const baseColor = filtroColor || this.ambientLight;
        this.lightMapCtx.fillStyle = '#ffffff'; // White = No filter
        this.lightMapCtx.fillRect(0, 0, this.lightMapCanvas.width, this.lightMapCanvas.height);

        this.lightMapCtx.globalAlpha = filtroOpacidad;
        this.lightMapCtx.fillStyle = baseColor;
        this.lightMapCtx.fillRect(0, 0, this.lightMapCanvas.width, this.lightMapCanvas.height);
        this.lightMapCtx.globalAlpha = 1.0;
        this.lightMapCtx.restore();

        // Prepare temporary lights buffer
        this.allLightsCtx.save();
        this.allLightsCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.allLightsCtx.clearRect(0, 0, this.allLightsCanvas.width, this.allLightsCanvas.height);
        this.allLightsCtx.setTransform(this.ctx.getTransform());
    }

    _getLightMapColor(hexColor, filtroOpacidad) {
        // Hex to RGB
        const r2 = parseInt(hexColor.slice(1,3), 16);
        const g2 = parseInt(hexColor.slice(3,5), 16);
        const b2 = parseInt(hexColor.slice(5,7), 16);

        // Lerp from White (255,255,255) to Color based on filtroOpacidad
        const r = Math.round(255 + (r2 - 255) * filtroOpacidad);
        const g = Math.round(255 + (g2 - 255) * filtroOpacidad);
        const b = Math.round(255 + (b2 - 255) * filtroOpacidad);

        return `rgb(${r},${g},${b})`;
    }

    drawPointLight(light, transform) {
        if (window._PerformanceMetrics) {
            window._PerformanceMetrics.lightsDrawn = (window._PerformanceMetrics.lightsDrawn || 0) + 1;
        }
        const ctx = this.allLightsCtx;
        const { radius, color, intensity, filtroOpacidad = 1 } = light;
        const drawColor = this._getLightMapColor(color, filtroOpacidad);

        const gradient = ctx.createRadialGradient(transform.x, transform.y, 0, transform.x, transform.y, radius);
        gradient.addColorStop(0, drawColor);
        gradient.addColorStop(1, 'rgba(0,0,0,0)'); // Fade to transparent black (no effect in lighter)

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradient;
        ctx.globalAlpha = intensity;
        ctx.fillRect(transform.x - radius, transform.y - radius, radius * 2, radius * 2);
        ctx.globalAlpha = 1.0;
    }

    drawSpotLight(light, transform) {
        if (window._PerformanceMetrics) {
            window._PerformanceMetrics.lightsDrawn = (window._PerformanceMetrics.lightsDrawn || 0) + 1;
        }
        const ctx = this.allLightsCtx;
        const { x, y, rotation } = transform;
        const { radius, color, intensity, angle, filtroOpacidad = 1 } = light;
        const drawColor = this._getLightMapColor(color, filtroOpacidad);

        const directionRad = ((rotation - 90) * Math.PI) / 180;
        const coneAngleRad = (angle * Math.PI) / 180;
        const startAngle = directionRad - coneAngleRad / 2;
        const endAngle = directionRad + coneAngleRad / 2;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, drawColor);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradient;
        ctx.globalAlpha = intensity;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    drawFreeformLight(light, transform) {
        if (window._PerformanceMetrics) {
            window._PerformanceMetrics.lightsDrawn = (window._PerformanceMetrics.lightsDrawn || 0) + 1;
        }
        const ctx = this.allLightsCtx;
        const { x, y, rotation } = transform;
        const { vertices, color, intensity, filtroOpacidad = 1 } = light;
        if (!vertices || vertices.length < 3) return;

        const drawColor = this._getLightMapColor(color, filtroOpacidad);

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
        ctx.fillStyle = drawColor;
        ctx.globalAlpha = intensity;
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }

    drawSpriteLight(light, transform) {
        if (window._PerformanceMetrics) {
            window._PerformanceMetrics.lightsDrawn = (window._PerformanceMetrics.lightsDrawn || 0) + 1;
        }
        const ctx = this.allLightsCtx;
        const { x, y, rotation, scale } = transform;
        const { sprite, color, intensity, filtroOpacidad = 1 } = light;
        if (!sprite || !sprite.complete || sprite.naturalWidth === 0) return;

        const drawColor = this._getLightMapColor(color, filtroOpacidad);
        const width = Math.ceil(sprite.naturalWidth * scale.x);
        const height = Math.ceil(sprite.naturalHeight * scale.y);

        // Use buffer to colorize the sprite light properly
        this.lightBufferCanvas.width = width;
        this.lightBufferCanvas.height = height;
        this.lightBufferCtx.clearRect(0, 0, width, height);
        this.lightBufferCtx.drawImage(sprite, 0, 0, width, height);
        this.lightBufferCtx.globalCompositeOperation = 'source-in';
        this.lightBufferCtx.fillStyle = drawColor;
        this.lightBufferCtx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity;
        ctx.drawImage(this.lightBufferCanvas, -width / 2, -height / 2, width, height);
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }

    endLights() {
        this.allLightsCtx.restore();

        if (this.allLightsCanvas.width > 0 && this.allLightsCanvas.height > 0 &&
            this.lightMapCanvas.width > 0 && this.lightMapCanvas.height > 0) {

            // Composite allLightsCanvas onto lightMapCanvas
            // This makes lights OVERWRITE the ambient filter instead of mixing with it
            this.lightMapCtx.save();
            this.lightMapCtx.setTransform(1, 0, 0, 1, 0, 0);
            this.lightMapCtx.globalCompositeOperation = 'source-over';
            this.lightMapCtx.drawImage(this.allLightsCanvas, 0, 0);
            this.lightMapCtx.restore();
        }

        if (this.lightMapCanvas.width === 0 || this.lightMapCanvas.height === 0) return;

        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.drawImage(this.lightMapCanvas, 0, 0);
        this.ctx.restore();
    }

    drawCanvas(canvasMateria) {
        if (!canvasMateria.isActive) return;
        const canvas = canvasMateria.getComponent(Canvas);
        
        if (this.isEditor) {
            this.drawWorldSpaceUI(canvasMateria);
        } else {
            // In game view, respect the renderMode properly
            console.log(`%c[drawCanvas GAME] renderMode="${canvas.renderMode}"`, 'color: #00FF00;');
            if (canvas.renderMode === 'Screen Space') {
                this.drawScreenSpaceUI(canvasMateria);
            } else {
                this.drawWorldSpaceUI(canvasMateria);
            }
        }
    }

    drawVideoPlayer(videoPlayer, x, y, width, height) {
        const video = videoPlayer._video;
        if (!video) return;

        // Si estamos en el editor y no está reproduciendo, intentamos mostrar el primer frame
        if (this.isEditor && video.paused && video.currentTime === 0) {
            // Se asume que video.load() ya se llamó
        }

        this.ctx.save();

        let drawX = x;
        let drawY = y;
        let drawWidth = width;
        let drawHeight = height;

        // Implementación de Scaling Modes
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            const aspect = video.videoWidth / video.videoHeight;
            const targetAspect = width / height;

            if (videoPlayer.scalingMode === 'Fit') {
                if (targetAspect > aspect) {
                    drawWidth = height * aspect;
                    drawX = x + (width - drawWidth) / 2;
                } else {
                    drawHeight = width / aspect;
                    drawY = y + (height - drawHeight) / 2;
                }
            } else if (videoPlayer.scalingMode === 'Fill') {
                this.ctx.beginPath();
                this.ctx.rect(x, y, width, height);
                this.ctx.clip();
                if (targetAspect > aspect) {
                    drawHeight = width / aspect;
                    drawY = y + (height - drawHeight) / 2;
                } else {
                    drawWidth = height * aspect;
                    drawX = x + (width - drawWidth) / 2;
                }
            }
            // 'Stretch' es el default (usar width/height directamente)
        }

        try {
            this.ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
        } catch (e) {
            // El video puede no estar listo para drawImage
            if (this.isEditor) {
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(x, y, width, height);
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Video Loading...', x + width / 2, y + height / 2);
            }
        }

        this.ctx.restore();
    }

    _drawUIElementAndChildren(element, rectCache, scaleX = 1, scaleY = 1, scaleChildren = true) {
        if (!element.isActive) return;

        const uiTransform = element.getComponent(UITransform);
        if (uiTransform) { // Only draw elements that have a UITransform
            if (window._PerformanceMetrics) {
                window._PerformanceMetrics.uiElementsDrawn = (window._PerformanceMetrics.uiElementsDrawn || 0) + 1;
            }
            const absoluteRect = getAbsoluteRect(element, rectCache);
            let { x, y, width, height } = absoluteRect;

            // If scaleChildren is false, apply inverse scale locally to compensate for global canvas scale
            if (!scaleChildren && (scaleX !== 1 || scaleY !== 1)) {
                this.ctx.save();
                // Translate to the element center
                this.ctx.translate(x + width / 2, y + height / 2);
                // Apply inverse scale
                this.ctx.scale(1 / scaleX, 1 / scaleY);
                // Translate back
                this.ctx.translate(-(x + width / 2), -(y + height / 2));
            }

            // Drawing Logic for the current element
            const uiImage = element.getComponent(UIImage);
            const uiMask = element.getComponent(UIMask) || element.getComponent(UIScrollRect);
            const uiText = element.getComponent(UIText);
            const videoPlayer = element.getComponent(VideoPlayer);
            const uiEventTrigger = element.getComponent(UIEventTrigger);

            if (this.isEditor) {
                const uiCollider = element.getComponent(UICollider);
                if ((uiEventTrigger && uiEventTrigger.showGizmo) || (uiMask && uiMask.showGizmo) || uiCollider) {
                    this.ctx.save();
                    this.ctx.strokeStyle = uiCollider ? 'rgba(0, 255, 0, 0.8)' : 'rgba(0, 255, 255, 0.8)';
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(x, y, width, height);
                    if (uiEventTrigger || uiMask) {
                        this.ctx.fillStyle = uiCollider ? 'rgba(0, 255, 0, 0.05)' : 'rgba(0, 255, 255, 0.1)';
                        this.ctx.fillRect(x, y, width, height);
                    }
                    this.ctx.restore();
                }
            }
            const textureRender = element.getComponent(TextureRender);

            if (uiMask) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.rect(x, y, width, height);
                this.ctx.clip();
            }

            if (videoPlayer) {
                this.drawVideoPlayer(videoPlayer, x, y, width, height);
            } else if (uiImage) {
                this.ctx.save();
                this.ctx.globalAlpha *= uiImage.opacity !== undefined ? uiImage.opacity : 1.0;
                if (uiImage.sprite && uiImage.sprite.complete && uiImage.sprite.naturalWidth > 0) {
                     this.ctx.drawImage(uiImage.sprite, x, y, width, height);
                } else {
                    this.ctx.fillStyle = uiImage.color;
                    this.ctx.fillRect(x, y, width, height);
                }
                this.ctx.restore();
                if (uiImage.isError) {
                    this.ctx.strokeStyle = 'red';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(x, y, width, height);
                }
            } else if (textureRender) {
                this.ctx.save();
                this.ctx.translate(x, y);
                if (textureRender.texture && textureRender.texture.complete) {
                    if (!textureRender._cachedPattern || textureRender._cachedPatternSrc !== textureRender.texture.src || textureRender._cachedPatternCtx !== this.ctx) {
                        textureRender._cachedPattern = this.ctx.createPattern(textureRender.texture, 'repeat');
                        textureRender._cachedPatternSrc = textureRender.texture.src;
                        textureRender._cachedPatternCtx = this.ctx;
                    }
                    this.ctx.fillStyle = textureRender._cachedPattern;
                } else {
                    this.ctx.fillStyle = textureRender.color;
                }
                if (textureRender.shape === 'Rectangle') {
                    this.ctx.fillRect(0, 0, width, height);
                } else if (textureRender.shape === 'Circle') {
                    this.ctx.beginPath();
                    this.ctx.arc(width / 2, height / 2, width / 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
                this.ctx.restore();
            }

            if (uiText) {
                this._drawUIText(uiText, x, y, width, height);
            }

            if (uiMask) {
                // We keep the clip active for children, so we don't restore here yet.
                // Instead, we will restore after drawing children.
            }

            // Restore context if we applied inverse scale
            if (!scaleChildren && (scaleX !== 1 || scaleY !== 1)) {
                this.ctx.restore();
            }
        }

        // Recursion for children
        const sortedChildren = [...element.children].sort((a, b) => {
            const orderA = (a.getComponent(DrawingOrder)?.order || 0);
            const orderB = (b.getComponent(DrawingOrder)?.order || 0);
            return orderA - orderB;
        });

        for (const child of sortedChildren) {
            this._drawUIElementAndChildren(child, rectCache, scaleX, scaleY, scaleChildren);
        }

        if (uiTransform && (element.getComponent(UIMask) || element.getComponent(UIScrollRect))) {
            this.ctx.restore(); // Restore clip
        }
    }

    drawScreenSpaceUI(canvasMateria) {
        this.beginUI();
        const canvasComponent = canvasMateria.getComponent(Canvas);
        if (!canvasComponent) { this.end(); return; }

        const refRes = canvasComponent.referenceResolution || { width: 800, height: 600 };
        const screenRect = { width: this.canvas.width, height: this.canvas.height };

        // Calculate scale to fill the entire screen (independent X and Y scale)
        const scaleX = screenRect.width / refRes.width;
        const scaleY = screenRect.height / refRes.height;
        const scaleChildren = canvasComponent.scaleChildren || false; // New property: whether to scale child elements
        
        console.log(`%c[drawScreenSpaceUI] screenRect=(${screenRect.width}x${screenRect.height}), refRes=(${refRes.width}x${refRes.height}), scaleX=${scaleX.toFixed(3)}, scaleY=${scaleY.toFixed(3)}, scaleChildren=${scaleChildren}`, 'color: #00FF00; font-weight: bold;');

        this.ctx.save();
        // ALWAYS scale to fill the screen
        this.ctx.scale(scaleX, scaleY);

        // The virtual canvas rect - ALWAYS (0, 0) for Screen Space
        const virtualCanvasRect = { x: 0, y: 0, width: refRes.width, height: refRes.height };
        this.ctx.beginPath();
        this.ctx.rect(virtualCanvasRect.x, virtualCanvasRect.y, virtualCanvasRect.width, virtualCanvasRect.height);
        this.ctx.clip();


        // Seed the cache with the virtual canvas rectangle at (0, 0)
        const rectCache = new Map();
        rectCache.set(canvasMateria.id, virtualCanvasRect);

        for (const child of canvasMateria.children) {
            this._drawUIElementAndChildren(child, rectCache, scaleX, scaleY, scaleChildren);
        }

        this.ctx.restore();
        this.end();
    }

    drawWorldSpaceUI(canvasMateria) {
        const canvasComponent = canvasMateria.getComponent(Canvas);
        const canvasTransform = canvasMateria.getComponent(Transform);
        if (!canvasComponent || !canvasTransform) return;

        // DEBUG LOG - Important to see when WorldSpace is called for Screen Space canvas
        if (canvasComponent.renderMode === 'Screen Space' && !this.isEditor) {
            console.warn(`%c[WARNING] drawWorldSpaceUI called for Screen Space canvas "${canvasMateria.name}" in GAME!`, 'color: #FF0000; font-weight: bold;');
        }

        this.ctx.save();

        // Counter-flip Y for UI in world space
        this.ctx.translate(canvasTransform.x, canvasTransform.y);
        this.ctx.scale(1, -1);
        this.ctx.translate(-canvasTransform.x, -canvasTransform.y);

        // The rectCache will get the initial rect from the canvas itself via getAbsoluteRect.
        const rectCache = new Map();
        const canvasWorldRect = getAbsoluteRect(canvasMateria, rectCache);

        this.ctx.beginPath();
        this.ctx.rect(canvasWorldRect.x, canvasWorldRect.y, canvasWorldRect.width, canvasWorldRect.height);
        this.ctx.clip();

        // This is a special case for the editor to achieve WYSIWYG for Screen Space canvases.
        if (this.isEditor && canvasComponent.renderMode === 'Screen Space') {
            const refRes = canvasComponent.referenceResolution || { width: 800, height: 600 };
            const targetRect = { width: canvasWorldRect.width, height: canvasWorldRect.height };
            const { scale, offsetX, offsetY } = calculateLetterbox(refRes, targetRect);

            this.ctx.save();
            // We apply the letterbox transform relative to the canvas's world position.
            this.ctx.translate(canvasWorldRect.x + offsetX, canvasWorldRect.y + offsetY); // Y-Down
            this.ctx.scale(scale, scale);

            // We need a new cache here because the coordinate system has changed.
            const screenSpaceCache = new Map();
            // We "trick" the calculation by putting a fake rect for the canvas in the cache,
            // representing the scaled, virtual screen.
            const virtualCanvasRect = { x: 0, y: 0, width: refRes.width, height: refRes.height };
            screenSpaceCache.set(canvasMateria.id, virtualCanvasRect);

            for (const child of canvasMateria.children) {
                this._drawUIElementAndChildren(child, screenSpaceCache, 1, 1, true);
            }
            this.ctx.restore();
        } else {
            // For 'World Space' canvases, the logic is direct.
            for (const child of canvasMateria.children) {
                this._drawUIElementAndChildren(child, rectCache, 1, 1, true);
            }
        }

        this.ctx.restore();
    }
}
