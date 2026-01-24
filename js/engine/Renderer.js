import * as SceneManager from './SceneManager.js';
import { Camera, Transform, PointLight2D, SpotLight2D, FreeformLight2D, SpriteLight2D, Tilemap, Grid, Canvas, SpriteRenderer, TilemapRenderer, TextureRender, UITransform, UIImage, UIText, ParticleSystem } from './Components.js';
import { getAbsoluteRect, calculateLetterbox } from './UITransformUtils.js';
export class Renderer {
    constructor(canvas, isEditor = false, isGameView = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isEditor = isEditor;
        this.isGameView = isGameView;

        this.lightMapCanvas = document.createElement('canvas');
        this.lightMapCtx = this.lightMapCanvas.getContext('2d');
        this.ambientLight = '#1a1a2a'; // A dark blue/purple for ambient light

        if (this.isEditor) {
            this.camera = { x: 0, y: 0, zoom: 1.0, effectiveZoom: 1.0 };
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

    resize() {
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.lightMapCanvas.width = this.canvas.width;
        this.lightMapCanvas.height = this.canvas.height;
        
        const rendererType = this.isEditor ? 'EDITOR' : 'GAME';
        const containerElement = this.canvas.parentElement;
        const containerDisplay = window.getComputedStyle(containerElement).display;
        const containerVisible = containerElement.offsetParent !== null;
        
        console.log(`%c[resize ${rendererType}] canvas="${this.canvas.id}", clientSize=(${this.canvas.clientWidth}x${this.canvas.clientHeight}), canvasSize=(${this.canvas.width}x${this.canvas.height}), containerDisplay="${containerDisplay}", visible=${containerVisible}`, `color: ${this.isEditor ? '#FF6600' : '#00FF00'};`);
    }

    clear(cameraComponent) {
        if (cameraComponent && cameraComponent.clearFlags === 'DontClear') {
            return;
        }
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

            let effectiveZoom = 1.0;
            if (cameraComponent.projection === 'Orthographic') {
                effectiveZoom = this.canvas.height / (cameraComponent.orthographicSize * 2 || 1);
            } else {
                effectiveZoom = 1 / Math.tan(cameraComponent.fov * 0.5 * Math.PI / 180);
            }
            activeCamera = { x: cameraTransform.x, y: cameraTransform.y, effectiveZoom };
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

        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(activeCamera.effectiveZoom, activeCamera.effectiveZoom);
        const rotationInRadians = (transform.rotation || 0) * Math.PI / 180;
        this.ctx.rotate(-rotationInRadians);
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
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
    }

    drawImage(image, x, y, width, height) {
        this.ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
    }

    drawText(text, x, y, color, fontSize, fontFamily, textTransform) {
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
        this.ctx.fillText(transformedText, x, y);
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

    beginLights() {
        this.lightMapCtx.save();
        this.lightMapCtx.setTransform(this.ctx.getTransform());
        this.lightMapCtx.fillStyle = this.ambientLight;
        this.lightMapCtx.fillRect(-99999, -99999, 199998, 199998);
    }

    drawPointLight(light, transform) {
        const ctx = this.lightMapCtx;
        const { radius, color, intensity } = light;
        const gradient = ctx.createRadialGradient(transform.x, transform.y, 0, transform.x, transform.y, radius);
        gradient.addColorStop(0, `${color}FF`);
        gradient.addColorStop(0.3, `${color}CC`);
        gradient.addColorStop(0.6, `${color}66`);
        gradient.addColorStop(1, `${color}00`);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradient;
        ctx.globalAlpha = intensity;
        ctx.fillRect(transform.x - radius, transform.y - radius, radius * 2, radius * 2);
        ctx.globalAlpha = 1.0;
    }

    drawSpotLight(light, transform) {
        const ctx = this.lightMapCtx;
        const { x, y, rotation } = transform;
        const { radius, color, intensity, angle } = light;
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
        ctx.globalAlpha = 1.0;
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
        ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
        ctx.fillStyle = color;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }

    endLights() {
        this.lightMapCtx.restore();
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

    _drawUIElementAndChildren(element, rectCache, scaleX = 1, scaleY = 1, scaleChildren = true) {
        if (!element.isActive) return;

        const uiTransform = element.getComponent(UITransform);
        if (uiTransform) { // Only draw elements that have a UITransform
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
            const uiText = element.getComponent(UIText);
            const textureRender = element.getComponent(TextureRender);

            if (uiImage) {
                this.ctx.fillStyle = uiImage.color;
                this.ctx.fillRect(x, y, width, height);
                if (uiImage.sprite && uiImage.sprite.complete && uiImage.sprite.naturalWidth > 0) {
                     this.ctx.drawImage(uiImage.sprite, x, y, width, height);
                }
            } else if (textureRender) {
                this.ctx.save();
                this.ctx.translate(x, y);
                if (textureRender.texture && textureRender.texture.complete) {
                    this.ctx.fillStyle = this.ctx.createPattern(textureRender.texture, 'repeat');
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

            // Draw gizmo (visible outline) in game view to show UI boundaries
            if (!this.isEditor) {
                this.ctx.save();
                this.ctx.strokeStyle = '#00FF00';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, width, height);
                // Draw corner markers
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fillRect(x - 4, y - 4, 8, 8); // Top-left
                this.ctx.fillStyle = '#00FF00';
                this.ctx.fillRect(x + width - 4, y - 4, 8, 8); // Top-right
                this.ctx.fillStyle = '#0000FF';
                this.ctx.fillRect(x - 4, y + height - 4, 8, 8); // Bottom-left
                this.ctx.restore();
            }

            // Restore context if we applied inverse scale
            if (!scaleChildren && (scaleX !== 1 || scaleY !== 1)) {
                this.ctx.restore();
            }
        }

        // Recursion for children
        for (const child of element.children) {
            this._drawUIElementAndChildren(child, rectCache, scaleX, scaleY, scaleChildren);
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

        // Draw canvas outline in game view
        if (!this.isEditor) {
            this.ctx.save();
            this.ctx.strokeStyle = '#FFFF00';
            const lineWidth = 3 / scaleX;
            this.ctx.lineWidth = lineWidth;
            this.ctx.strokeRect(0, 0, refRes.width, refRes.height);
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
            this.ctx.fillRect(0, 0, refRes.width, refRes.height);
            this.ctx.restore();
        }

        // Seed the cache with the virtual canvas rectangle at (0, 0)
        const rectCache = new Map();
        rectCache.set(canvasMateria.id, virtualCanvasRect);

        for (const child of canvasMateria.children) {
            this._drawUIElementAndChildren(child, rectCache, scaleX, scaleY, scaleChildren);
        }

        this.ctx.restore();
        this.end();
    }

    _drawParticleSystems(ctx, scene) {
        const materias = scene.getAllMaterias();
        for (const materia of materias) {
            if (!materia.isActive) continue;

            const particleSystem = materia.getComponent(ParticleSystem);
            if (particleSystem && particleSystem._isPlaying) {
                ctx.save();
                for (const particle of particleSystem._particles) {
                    if (!particle.isActive) continue;

                    if (particleSystem.texture) {
                        // Draw texture
                        ctx.globalAlpha = particle.color.a;
                        ctx.drawImage(
                            particleSystem.texture,
                            particle.position.x - particle.size / 2,
                            particle.position.y - particle.size / 2,
                            particle.size,
                            particle.size
                        );
                        ctx.globalAlpha = 1.0;
                    } else {
                        // Draw square fallback
                        ctx.fillStyle = particle.color;
                        ctx.fillRect(
                            particle.position.x - particle.size / 2,
                            particle.position.y - particle.size / 2,
                            particle.size,
                            particle.size
                        );
                    }
                }
                ctx.restore();
            }
        }
    }

    _drawSprite(spriteRenderer, transform) {
        const image = spriteRenderer.sprite;
        let sX = 0, sY = 0, sWidth = image.naturalWidth, sHeight = image.naturalHeight;
        let pivotX = 0.5, pivotY = 0.5;

        // Check for sprite sheet data
        if (spriteRenderer.spriteSheet && spriteRenderer.spriteName) {
            const spriteData = spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName];
            if (spriteData) {
                sX = spriteData.rect.x;
                sY = spriteData.rect.y;
                sWidth = spriteData.rect.width;
                sHeight = spriteData.rect.height;
                pivotX = spriteData.pivot.x;
                pivotY = spriteData.pivot.y;
            }
        }

        const dWidth = sWidth * transform.scale.x;
        const dHeight = sHeight * transform.scale.y;

        // Apply pivot point for correct rotation and positioning
        const dx = -dWidth * pivotX;
        const dy = -dHeight * pivotY;

        this.ctx.drawImage(image, sX, sY, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }

    _drawTextureRender(textureRender, transform) {
        this.ctx.scale(transform.scale.x, transform.scale.y);
        // Pivot is assumed to be center for TextureRender
        const dx = -textureRender.width / 2;
        const dy = -textureRender.height / 2;

        if (textureRender.texture && textureRender.texture.complete) {
            this.ctx.fillStyle = this.ctx.createPattern(textureRender.texture, 'repeat');
        } else {
            this.ctx.fillStyle = textureRender.color;
        }

        if (textureRender.shape === 'Rectangle') {
            this.ctx.fillRect(dx, dy, textureRender.width, textureRender.height);
        } else if (textureRender.shape === 'Circle') {
            this.ctx.beginPath();
            // We use width for radius to maintain consistency
            this.ctx.arc(0, 0, textureRender.width / 2, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    drawScene(scene, activeCameraMateria, isGameView = false) {
        const cameraComponent = activeCameraMateria ? activeCameraMateria.getComponent(Camera) : null;
        this.clear(cameraComponent);

        // --- 1. World Rendering Pass ---
        this.beginWorld(activeCameraMateria);

        const materias = scene.getAllMaterias();

        // --- 1a. Render Solid Objects (Sprites, Tilemaps, etc.) ---
        for (const materia of materias) {
            if (!materia.isActive || materia.getComponent(Canvas)) continue;

            const transform = materia.getComponent(Transform);
            if (!transform) continue;

            const spriteRenderer = materia.getComponent(SpriteRenderer);
            const tilemapRenderer = materia.getComponent(TilemapRenderer);
            const textureRender = materia.getComponent(TextureRender);

            if (spriteRenderer || tilemapRenderer || textureRender) {
                this.ctx.save();
                this.ctx.translate(transform.position.x, transform.position.y);
                this.ctx.rotate(transform.rotation * Math.PI / 180);

                if (spriteRenderer && spriteRenderer.sprite && spriteRenderer.sprite.complete && spriteRenderer.sprite.naturalWidth > 0) {
                    this._drawSprite(spriteRenderer, transform);
                }
                if (textureRender) {
                    this._drawTextureRender(textureRender, transform);
                }
                if (tilemapRenderer) {
                    // Pass transform so it can be used for scaling
                    this.drawTilemap(tilemapRenderer, transform);
                }
                this.ctx.restore();
            }
        }

        // --- 1b. Particle System Pass (drawn on top of solids, but affected by lights) ---
        this._drawParticleSystems(this.ctx, scene);

        // --- 1c. Lighting Pass (blended over all world objects) ---
        this.beginLights();
        for (const materia of materias) {
            if (!materia.isActive) continue;
            const transform = materia.getComponent(Transform);
            if (!transform) continue;

            const pointLight = materia.getComponent(PointLight2D);
            if (pointLight) this.drawPointLight(pointLight, transform);

            const spotLight = materia.getComponent(SpotLight2D);
            if (spotLight) this.drawSpotLight(spotLight, transform);

            const freeformLight = materia.getComponent(FreeformLight2D);
            if (freeformLight) this.drawFreeformLight(freeformLight, transform);

            const spriteLight = materia.getComponent(SpriteLight2D);
            if (spriteLight) this.drawSpriteLight(spriteLight, transform);
        }
        this.endLights();

        this.end(); // End World Pass

        // --- 2. UI Pass (drawn last, on top of everything) ---
        for (const materia of materias) {
             if (materia.isActive && materia.getComponent(Canvas)) {
                this.drawCanvas(materia);
            }
        }
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
