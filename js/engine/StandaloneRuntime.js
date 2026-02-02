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

            // Load and instantiate scripts
            for (const materia of scene.getAllMaterias()) {
                const scripts = materia.getComponents(Components.CreativeScript);
                for (const script of scripts) {
                    // In standalone, scripts need to be pre-loaded or loaded dynamically
                    // For now, let's assume we have a mechanism for this.
                    await script.initializeInstance();
                    if (script.isInitialized) {
                        script.start();
                        script.onEnable();
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

        // 1. Geometry
        const spriteRenderers = materias.filter(m => m.getComponent(Components.SpriteRenderer));
        const tilemaps = materias.filter(m => m.getComponent(Components.TilemapRenderer));
        const textureRenderers = materias.filter(m => m.getComponent(Components.TextureRender));

        // 2. Lights (simplified for now, using project setting would be better)
        const lights = {
            point: materias.filter(m => m.getComponent(Components.PointLight2D)),
            spot: materias.filter(m => m.getComponent(Components.SpotLight2D)),
            freeform: materias.filter(m => m.getComponent(Components.FreeformLight2D)),
            sprite: materias.filter(m => m.getComponent(Components.SpriteLight2D))
        };

        const ctx = this.renderer.ctx;

        // Draw sprites
        spriteRenderers.sort((a, b) => a.getComponent(Components.Transform).y - b.getComponent(Components.Transform).y)
            .forEach(m => {
                if (!m.isActive) return;
                const sr = m.getComponent(Components.SpriteRenderer);
                const t = m.getComponent(Components.Transform);
                if (sr.sprite && sr.sprite.complete && sr.sprite.naturalWidth > 0) {
                    const worldPos = t.position;
                    const worldScale = t.scale;
                    const dWidth = sr.sprite.naturalWidth * worldScale.x;
                    const dHeight = sr.sprite.naturalHeight * worldScale.y;

                    ctx.save();
                    ctx.translate(worldPos.x, worldPos.y);
                    ctx.rotate(t.rotation * Math.PI / 180);
                    ctx.drawImage(sr.sprite, -dWidth/2, -dHeight/2, dWidth, dHeight);
                    ctx.restore();
                }
            });

        // Draw tilemaps
        tilemaps.forEach(m => {
            if (m.isActive) this.renderer.drawTilemap(m.getComponent(Components.TilemapRenderer));
        });

        // Draw UI
        materias.filter(m => m.getComponent(Components.Canvas)).forEach(m => {
            this.renderer.drawCanvas(m);
        });
    }
}
