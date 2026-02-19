// js/engine/StandaloneRuntime.js
import { Renderer } from './Renderer.js';
import { PhysicsSystem } from './Physics.js';
import * as SceneManager from './SceneManager.js';
import * as UISystem from './ui/UISystem.js';
import { InputManager } from './Input.js';
import * as EngineAPI from './EngineAPI.js';
import * as RuntimeAPIManager from './RuntimeAPIManager.js';
import * as Components from './Components.js';
import { setStandaloneMode } from './AssetUtils.js';

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

        // 1. Load config
        try {
            const configResp = await fetch('project.ceconfig');
            this.config = await configResp.json();
        } catch (e) {
            console.error("Failed to load project.ceconfig", e);
            this.config = {};
        }

        // 2. Initialize subsystems
        this.renderer = new Renderer(this.canvas, false, true);
        InputManager.initialize(this.canvas, this.canvas);

        // 3. Load Main Scene
        try {
            // Determine which scene to load (default to first one if not specified)
            const sceneToLoad = this.config.startScene || 'default.ceScene';
            const sceneResp = await fetch(`Assets/${sceneToLoad}`);
            if (!sceneResp.ok) throw new Error(`Could not find start scene: ${sceneToLoad}`);

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
                        const response = await fetch(`lib/${libName}.celib`);
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

    drawScene(camera) {
        if (!this.renderer || !SceneManager.currentScene) return;

        const scene = SceneManager.currentScene;
        const materias = scene.getAllMaterias();

        // 1. Filter and Sort Geometry
        const materiasToRender = materias
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpriteRenderer))
            .sort((a, b) => a.getComponent(Components.Transform).y - b.getComponent(Components.Transform).y);

        const textureRenderersToRender = materias
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.TextureRender));

        const tilemapsToRender = materias
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.TilemapRenderer));

        const canvasesToRender = materias
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.Canvas));

        // 2. Filter Lights
        const allLights = {
            point: materias.filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.PointLight2D)),
            spot: materias.filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpotLight2D)),
            freeform: materias.filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.FreeformLight2D)),
            sprite: materias.filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpriteLight2D))
        };

        const ctx = this.renderer.ctx;

        const drawObjects = () => {
            // Draw Sprites
            for (const materia of materiasToRender) {
                if (!materia.isActive) continue;
                const sr = materia.getComponent(Components.SpriteRenderer);
                const transform = materia.getComponent(Components.Transform);

                if (sr.sprite && sr.sprite.complete && sr.sprite.naturalWidth > 0) {
                    const img = sr.sprite;
                    let sx = 0, sy = 0, sWidth = img.naturalWidth, sHeight = img.naturalHeight;
                    let pivotX = sr.pivot?.x ?? 0.5;
                    let pivotY = sr.pivot?.y ?? 0.5;

                    if (sr.spriteSheet && sr.spriteName && sr.spriteSheet.sprites[sr.spriteName]) {
                        const spriteData = sr.spriteSheet.sprites[sr.spriteName];
                        sx = spriteData.rect.x;
                        sy = spriteData.rect.y;
                        sWidth = spriteData.rect.width;
                        sHeight = spriteData.rect.height;
                        // Component pivot already contains the correct value or override
                    }

                    const worldPos = transform.position;
                    const worldScale = transform.scale;

                    ctx.save();
                    ctx.translate(worldPos.x, worldPos.y);
                    ctx.rotate(transform.rotation * Math.PI / 180);
                    ctx.scale(worldScale.x, worldScale.y);
                    const opacity = typeof sr.opacity === 'number' ? sr.opacity : parseFloat(sr.opacity || 1);
                    ctx.globalAlpha = isNaN(opacity) ? 1.0 : opacity;

                    const color = sr.color || '#ffffff';
                    const isWhite = color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff';

                    if (!isWhite) {
                        // Tinting logic using scratch canvas
                        this.scratchCanvas.width = Math.ceil(sWidth);
                        this.scratchCanvas.height = Math.ceil(sHeight);
                        this.scratchCtx.clearRect(0, 0, this.scratchCanvas.width, this.scratchCanvas.height);
                        this.scratchCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

                        this.scratchCtx.globalCompositeOperation = 'source-atop';
                        this.scratchCtx.fillStyle = color;
                        this.scratchCtx.fillRect(0, 0, this.scratchCanvas.width, this.scratchCanvas.height);
                        this.scratchCtx.globalCompositeOperation = 'source-over';

                        ctx.drawImage(this.scratchCanvas, 0, 0, sWidth, sHeight, -sWidth * pivotX, -sHeight * pivotY, sWidth, sHeight);
                    } else {
                        ctx.drawImage(img, sx, sy, sWidth, sHeight, -sWidth * pivotX, -sHeight * pivotY, sWidth, sHeight);
                    }
                    ctx.restore();
                }
            }

            // Draw Texture Renderers
            for (const materia of textureRenderersToRender) {
                if (!materia.isActive) continue;
                const tr = materia.getComponent(Components.TextureRender);
                const transform = materia.getComponent(Components.Transform);
                const worldPos = transform.position;

                ctx.save();
                ctx.translate(worldPos.x, worldPos.y);
                ctx.rotate(transform.rotation * Math.PI / 180);
                ctx.scale(transform.scale.x, transform.scale.y);

                if (tr.texture && tr.texture.complete) {
                    ctx.fillStyle = ctx.createPattern(tr.texture, 'repeat');
                } else {
                    ctx.fillStyle = tr.color;
                }

                if (tr.shape === 'Rectangle') {
                    ctx.fillRect(-tr.width / 2, -tr.height / 2, tr.width, tr.height);
                } else if (tr.shape === 'Circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, tr.radius, 0, 2 * Math.PI);
                    ctx.fill();
                } else if (tr.shape === 'Triangle') {
                    ctx.beginPath();
                    ctx.moveTo(0, -tr.height / 2);
                    ctx.lineTo(-tr.width / 2, tr.height / 2);
                    ctx.lineTo(tr.width / 2, tr.height / 2);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            }

            // Draw Tilemaps
            for (const materia of tilemapsToRender) {
                if (materia.isActive) this.renderer.drawTilemap(materia.getComponent(Components.TilemapRenderer));
            }

            // Draw UI Canvases
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
