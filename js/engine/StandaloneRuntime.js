// js/engine/StandaloneRuntime.js
import { Renderer } from './Renderer.js';
import { PhysicsSystem } from './Physics.js';
import * as SceneManager from './SceneManager.js';
import * as UISystem from './ui/UISystem.js';
import { InputManager } from './Input.js';
import * as EngineAPI from './EngineAPI.js';
import * as MathUtils from './MathUtils.js';
import * as RuntimeAPIManager from './RuntimeAPIManager.js';
import * as Components from './Components.js';
import { setStandaloneMode, getURLForAssetPath } from './AssetUtils.js';

export class StandaloneRuntime {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.renderer = null;
        this.physicsSystem = null;
        this.lastTime = 0;
        this.config = null;
        this.deltaTime = 0;

        // Scratch canvas for tinting sprites
        this.scratchCanvas = document.createElement('canvas');
        this.scratchCtx = this.scratchCanvas.getContext('2d');
    }

    async start() {
        console.log("Standalone Runtime Starting...");
        setStandaloneMode(true);

        // 1. Load config (if not already provided by preview)
        if (!this.config) {
            try {
                const configResp = await fetch('project.json');
                this.config = await configResp.json();
            } catch (e) {
                console.error("Failed to load project.json", e);
                this.config = {};
            }
        }

        // 2. Initialize subsystems
        this.renderer = new Renderer(this.canvas, false, true);
        InputManager.initialize(this.canvas, this.canvas);

        // 3. Load Main Scene
        try {
            // Determine which scene to load
            let sceneToLoad = this.config.startScene || 'default.ceScene';

            // Resolve scene URL using AssetUtils to support handles in preview mode
            let scenePath = sceneToLoad.startsWith('Assets/') ? sceneToLoad : `Assets/${sceneToLoad}`;
            let sceneUrl = await getURLForAssetPath(scenePath);
            let sceneResp = await fetch(sceneUrl);

            if (!sceneResp.ok) {
                console.warn(`Could not find configured start scene: ${sceneToLoad}. Trying fallbacks...`);
                // Try from the allScenes list if available
                if (this.config.allScenes && this.config.allScenes.length > 0) {
                    for (const fallback of this.config.allScenes) {
                        if (fallback === sceneToLoad) continue;
                        scenePath = fallback.startsWith('Assets/') ? fallback : `Assets/${fallback}`;
                        sceneUrl = await getURLForAssetPath(scenePath);
                        sceneResp = await fetch(sceneUrl);
                        if (sceneResp.ok) {
                            sceneToLoad = fallback;
                            break;
                        }
                    }
                }
            }

            if (!sceneResp.ok) throw new Error(`Could not find any playable scene. (Configured: ${sceneToLoad})`);

            const sceneData = await sceneResp.json();
            const scene = await SceneManager.deserializeScene(sceneData, null);
            SceneManager.setCurrentScene(scene);

            this.physicsSystem = new PhysicsSystem(scene);
            UISystem.initialize(scene);
            EngineAPI.CEEngine.initialize({ physicsSystem: this.physicsSystem });

            // Register internal APIs
            const internalApis = EngineAPI.getAllInternalApis();
            for (const [name, apiObject] of Object.entries(internalApis)) {
                RuntimeAPIManager.registerAPI(name, apiObject);
            }

            // Load external libraries
            await this.loadStandaloneLibraries();

            // Load and instantiate scripts and components
            for (const materia of scene.getAllMaterias()) {
                for (const ley of materia.leyes) {
                    if (ley instanceof Components.CreativeScript) {
                        await ley.initializeInstance();
                        if (ley.isInitialized) {
                            try { ley.start(); } catch(e) {}
                            try { ley.onEnable(); } catch(e) {}
                        }
                    } else if (ley instanceof Components.AnimatorController) {
                        await ley.initialize(null); // null handle for standalone
                    } else if (ley instanceof Components.Animator) {
                        if (!materia.getComponent(Components.AnimatorController)) {
                            await ley.loadAnimationClip(null);
                        }
                    }

                    if (!(ley instanceof Components.CreativeScript) && typeof ley.start === 'function') {
                        try { await ley.start(); } catch(e) {}
                    }
                }
            }

        } catch (e) {
            console.error("Failed to load scene", e);
        }

        // 4. Start Loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    loop(timestamp) {
        this.deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (this.physicsSystem) this.physicsSystem.update(this.deltaTime);
        UISystem.update(this.deltaTime);
        EngineAPI.CEEngine.update(this.deltaTime);

        if (SceneManager.currentScene) {
            SceneManager.currentScene.getAllMaterias().forEach(m => {
                if (m.isActive) m.update(this.deltaTime);
            });

            this.renderer.resize();

            const cameras = SceneManager.currentScene.findAllCameras()
                .sort((a, b) => a.getComponent(Components.Camera).depth - b.getComponent(Components.Camera).depth);

            if (cameras.length > 0) {
                cameras.forEach(cam => {
                    this.renderer.beginWorld(cam);
                    this.drawScene(cam);
                    this.renderer.end();
                });
            } else {
                this.renderer.clear();
            }
        }

        InputManager.update();
        requestAnimationFrame(this.loop.bind(this));
    }

    async loadStandaloneLibraries() {
        try {
            // In standalone, we might want to have a list of libraries in the config
            // For now, we try to fetch from lib/ directory
            // This is limited because we can't easily list files on a web server without a directory listing enabled.
            // A better way is to include a list of libraries in project.ceconfig during build.
            if (this.config.libraries && Array.isArray(this.config.libraries)) {
                for (const libName of this.config.libraries) {
                    try {
                        const libPath = `lib/${libName}.celib`;
                        const libUrl = await getURLForAssetPath(libPath);
                        const response = await fetch(libUrl);
                        if (response.ok) {
                            const libData = await response.json();
                            if (libData.api_access && libData.api_access.runtime_accessible) {
                                const scriptContent = decodeURIComponent(escape(atob(libData.script_base64)));
                                const engineAPI = EngineAPI.getEngineAPI();
                                const apiObject = (new Function('engine', scriptContent))(engineAPI);
                                if (apiObject && typeof apiObject === 'object') {
                                    RuntimeAPIManager.registerAPI(libData.name, apiObject);
                                    console.log(`Standalone library '${libData.name}' loaded.`);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(`Failed to load standalone library ${libName}:`, e);
                    }
                }
            }
        } catch (e) {
            console.error("Error loading standalone libraries:", e);
        }
    }

    drawScene(cameraMateria) {
        if (!this.renderer || !SceneManager.currentScene) return;

        const scene = SceneManager.currentScene;
        const materias = scene.getAllMaterias();
        const ctx = this.renderer.ctx;

        const aspect = this.canvas.width / this.canvas.height;
        const cameraViewBox = cameraMateria ? MathUtils.getCameraViewBox(cameraMateria, aspect) : null;
        const viewport = cameraViewBox ? MathUtils.getBoundsFromCorners(cameraViewBox) : null;
        const camTransform = cameraMateria ? cameraMateria.getComponent(Components.Transform) : null;

        // 1. Filter and Sort Geometry (including inter-layer sorting like in editor)
        const allInLayer = materias
            .filter(m => m.getComponent(Components.Transform) && (
                m.getComponent(Components.SpriteRenderer) ||
                m.getComponent(Components.TextureRender) ||
                m.getComponent(Components.TilemapRenderer) ||
                m.getComponent(Components.VideoPlayer) ||
                m.getComponent(Components.Water) ||
                m.getComponent(Components.LineCollider2D)
            ))
            .sort((a, b) => {
                const drawingOrderA = a.getComponent(Components.DrawingOrder);
                const drawingOrderB = b.getComponent(Components.DrawingOrder);
                const valA = drawingOrderA ? drawingOrderA.order : 0;
                const valB = drawingOrderB ? drawingOrderB.order : 0;
                if (valA !== valB) return valA - valB;

                if (a.isAncestorOf(b)) return -1;
                if (b.isAncestorOf(a)) return 1;

                const rendererA = a.getComponent(Components.SpriteRenderer) || a.getComponent(Components.TextureRender) || a.getComponent(Components.TilemapRenderer);
                const rendererB = b.getComponent(Components.SpriteRenderer) || b.getComponent(Components.TextureRender) || b.getComponent(Components.TilemapRenderer);
                const orderA = rendererA ? (rendererA.orderInLayer || 0) : 0;
                const orderB = rendererB ? (rendererB.orderInLayer || 0) : 0;
                if (orderA !== orderB) return orderA - orderB;

                // Parallax priority (Force backdrop if on same orderInLayer)
                const isParallaxA = !!a.getComponent(Components.Parallax);
                const isParallaxB = !!b.getComponent(Components.Parallax);
                if (isParallaxA !== isParallaxB) return isParallaxA ? -1 : 1;

                const transformA = a.getComponent(Components.Transform);
                const transformB = b.getComponent(Components.Transform);
                return (transformA ? transformA.y : 0) - (transformB ? transformB.y : 0);
            });

        const canvasesToRender = materias.filter(m => m.getComponent(Components.Canvas));

        // 2. Filter Lights
        const allLights = {
            point: materias.filter(m => m.isActive && m.getComponent(Components.PointLight2D)),
            spot: materias.filter(m => m.isActive && m.getComponent(Components.SpotLight2D)),
            freeform: materias.filter(m => m.isActive && m.getComponent(Components.FreeformLight2D)),
            sprite: materias.filter(m => m.isActive && m.getComponent(Components.SpriteLight2D))
        };

        const drawObjects = () => {
            for (const materia of allInLayer) {
                if (!materia.isActive) continue;

                const transform = materia.getComponent(Components.Transform);
                const parallax = materia.getComponent(Components.Parallax);
                const sr = materia.getComponent(Components.SpriteRenderer);
                const tr = materia.getComponent(Components.TextureRender);
                const tmr = materia.getComponent(Components.TilemapRenderer);
                const vp = materia.getComponent(Components.VideoPlayer);
                const water = materia.getComponent(Components.Water);
                const lineCollider = materia.getComponent(Components.LineCollider2D);

                // --- Parallax Displacement ---
                let worldPosition = transform.position;
                if (parallax && camTransform) {
                     worldPosition = {
                         x: worldPosition.x + (camTransform.x * (1 - parallax.scrollFactor.x)) + parallax.offset.x + (parallax._autoOffset ? parallax._autoOffset.x : 0),
                         y: worldPosition.y + (camTransform.y * (1 - parallax.scrollFactor.y)) + parallax.offset.y + (parallax._autoOffset ? parallax._autoOffset.y : 0)
                     };
                }

                // Culling
                if (cameraViewBox) {
                    const isRepeating = parallax && (parallax.repeatX || parallax.repeatY || parallax.mirroring.x > 0 || parallax.mirroring.y > 0);
                    if (!isRepeating) {
                        const objectBounds = MathUtils.getOOB(materia, worldPosition);
                        if (objectBounds && !MathUtils.checkIntersection(cameraViewBox, objectBounds)) continue;
                    }
                    const cameraComponent = cameraMateria.getComponent(Components.Camera);
                    if ((cameraComponent.cullingMask & (1 << materia.layer)) === 0) continue;
                }

                if (vp) {
                    const video = vp._video;
                    const w = (video && video.videoWidth > 0) ? video.videoWidth : 100;
                    const h = (video && video.videoHeight > 0) ? video.videoHeight : 100;
                    const worldScale = transform.scale;
                    const dWidth = w * Math.abs(worldScale.x);
                    const dHeight = h * Math.abs(worldScale.y);

                    ctx.save();
                    ctx.translate(worldPosition.x, worldPosition.y);
                    ctx.rotate(transform.rotation * Math.PI / 180);
                    this.renderer.drawVideoPlayer(vp, -dWidth / 2, -dHeight / 2, dWidth, dHeight);
                    ctx.restore();
                } else if (sr && sr.sprite && sr.sprite.complete && sr.sprite.naturalWidth > 0) {
                    const img = sr.sprite;
                    let sx = 0, sy = 0, sWidth = img.naturalWidth, sHeight = img.naturalHeight;
                    let pivotX = sr.pivot?.x ?? 0.5, pivotY = sr.pivot?.y ?? 0.5;

                    if (sr.spriteSheet && sr.spriteName && sr.spriteSheet.sprites[sr.spriteName]) {
                        const spriteData = sr.spriteSheet.sprites[sr.spriteName];
                        sx = spriteData.rect.x; sy = spriteData.rect.y;
                        sWidth = spriteData.rect.width; sHeight = spriteData.rect.height;
                    }

                    const worldScale = transform.scale;
                    const worldRotation = transform.rotation;
                    const dWidth = sWidth * Math.abs(worldScale.x);
                    const dHeight = sHeight * Math.abs(worldScale.y);
                    const dx = -dWidth * pivotX, dy = -dHeight * pivotY;

                    const opacity = typeof sr.opacity === 'number' ? sr.opacity : parseFloat(sr.opacity || 1);
                    const color = sr.color || '#ffffff';
                    const isWhite = color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff';

                    let sourceImg = img, sourceSX = sx, sourceSY = sy, sourceSW = sWidth, sourceSH = sHeight;
                    if (!isWhite) {
                        this.scratchCanvas.width = Math.ceil(sWidth); this.scratchCanvas.height = Math.ceil(sHeight);
                        this.scratchCtx.clearRect(0, 0, this.scratchCanvas.width, this.scratchCanvas.height);
                        this.scratchCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
                        this.scratchCtx.globalCompositeOperation = 'source-atop';
                        this.scratchCtx.fillStyle = color;
                        this.scratchCtx.fillRect(0, 0, this.scratchCanvas.width, this.scratchCanvas.height);
                        this.scratchCtx.globalCompositeOperation = 'source-over';
                        sourceImg = this.scratchCanvas; sourceSX = 0; sourceSY = 0; sourceSW = sWidth; sourceSH = sHeight;
                    }

                    ctx.save();
                    ctx.globalAlpha = isNaN(opacity) ? 1.0 : opacity;
                    ctx.translate(worldPosition.x, worldPosition.y);
                    ctx.rotate(worldRotation * Math.PI / 180);
                    ctx.scale(worldScale.x, worldScale.y);
                    ctx.drawImage(sourceImg, sourceSX, sourceSY, sourceSW, sourceSH, -sWidth * pivotX, -sHeight * pivotY, sWidth, sHeight);
                    ctx.restore();
                } else if (tr) {
                    const worldScale = transform.scale, worldRotation = transform.rotation;
                    const dWidth = tr.width * worldScale.x, dHeight = tr.height * worldScale.y;
                    const mirrorX = parallax ? parallax.mirroring.x : 0, mirrorY = parallax ? parallax.mirroring.y : 0;

                    const drawTex = (tx = 0, ty = 0) => {
                        ctx.save();
                        ctx.translate(worldPosition.x + tx, worldPosition.y + ty);
                        ctx.rotate(worldRotation * Math.PI / 180);
                        ctx.scale(worldScale.x, worldScale.y);
                        if (tr.texture && tr.texture.complete) {
                            ctx.fillStyle = ctx.createPattern(tr.texture, 'repeat');
                        } else {
                            ctx.fillStyle = tr.color;
                        }
                        if (tr.shape === 'Rectangle') ctx.fillRect(-tr.width / 2, -tr.height / 2, tr.width, tr.height);
                        else if (tr.shape === 'Circle') { ctx.beginPath(); ctx.arc(0, 0, tr.radius, 0, 2 * Math.PI); ctx.fill(); }
                        else if (tr.shape === 'Triangle') { ctx.beginPath(); ctx.moveTo(0, -tr.height / 2); ctx.lineTo(-tr.width / 2, tr.height / 2); ctx.lineTo(tr.width / 2, tr.height / 2); ctx.closePath(); ctx.fill(); }
                        ctx.restore();
                    };

                    if ((mirrorX > 0 || mirrorY > 0) && viewport) {
                        const stepX = mirrorX || dWidth, stepY = mirrorY || dHeight;
                        const startX = mirrorX > 0 ? Math.floor((viewport.left - worldPosition.x + dWidth / 2) / stepX) * stepX : 0;
                        const endX = mirrorX > 0 ? Math.ceil((viewport.right - worldPosition.x + dWidth / 2) / stepX) * stepX + stepX : dWidth;
                        const startY = mirrorY > 0 ? Math.floor((viewport.top - worldPosition.y + dHeight / 2) / stepY) * stepY : 0;
                        const endY = mirrorY > 0 ? Math.ceil((viewport.bottom - worldPosition.y + dHeight / 2) / stepY) * stepY + stepY : dHeight;
                        for (let tx = startX; tx < endX; tx += stepX) {
                            for (let ty = startY; ty < endY; ty += stepY) {
                                drawTex(tx, ty);
                                if (mirrorY === 0) break;
                            }
                            if (mirrorX === 0) break;
                        }
                    } else {
                        drawTex();
                    }
                } else if (tmr) {
                    this.renderer.drawTilemap(tmr);
                } else if (water) {
                    this.renderer.drawWater(water, worldPosition.x, worldPosition.y);
                } else if (lineCollider) {
                    this.renderer.drawLineCollider(lineCollider, worldPosition.x, worldPosition.y);
                }
            }

            for (const materia of canvasesToRender) {
                this.renderer.drawCanvas(materia);
            }
        };

        const drawLights = (lights) => {
            if (this.config.rendererMode !== 'realista') return;

            this.renderer.beginLights();
            lights.point.forEach(m => {
                if (m.isActive) this.renderer.drawPointLight(m.getComponent(Components.PointLight2D), m.getComponent(Components.Transform));
            });
            lights.spot.forEach(m => {
                if (m.isActive) this.renderer.drawSpotLight(m.getComponent(Components.SpotLight2D), m.getComponent(Components.Transform));
            });
            lights.freeform.forEach(m => {
                if (m.isActive) this.renderer.drawFreeformLight(m.getComponent(Components.FreeformLight2D), m.getComponent(Components.Transform));
            });
            lights.sprite.forEach(m => {
                if (m.isActive) this.renderer.drawSpriteLight(m.getComponent(Components.SpriteLight2D), m.getComponent(Components.Transform));
            });
            this.renderer.endLights();
        };

        // Execution of render passes
        drawObjects();
        drawLights(allLights);
    }
}
