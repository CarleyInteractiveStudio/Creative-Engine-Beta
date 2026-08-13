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
import { Localization } from './Localization.js';

export class StandaloneRuntime {
    constructor(canvasId) {
        window.CE_Standalone_Runtime = this;
        this.canvas = document.getElementById(canvasId);
        this.renderer = null;
        this.physicsSystem = null;
        this.lastTime = 0;
        this.config = null;
        this.deltaTime = 0;
        this.frameCount = 0;

        // Scratch canvas for tinting sprites
        this.scratchCanvas = document.createElement('canvas');
        this.scratchCtx = this.scratchCanvas.getContext('2d');
    }

    async start() {
        console.log("Standalone Runtime Starting...");
        setStandaloneMode(true);

        // 0. Initialize Localization
        try {
            await Localization.init();
        } catch (e) {
            console.warn("Localization init failed in standalone", e);
        }

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
        window.currentProjectConfig = this.config;

        // Initialize Performance Monitor with config
        const perfMonitor = EngineAPI.getPerformanceMonitor();
        if (perfMonitor) {
            perfMonitor.updateConfig(this.config);
        }

        // Apply App Name and Icon to document
        if (this.config.appName) document.title = this.config.appName;
        if (this.config.appIcon) {
            let favicon = document.querySelector('link[rel="icon"]');
            if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                document.head.appendChild(favicon);
            }
            favicon.href = await getURLForAssetPath(this.config.appIcon);
        }

        // 2. Initialize subsystems
        this.renderer = new Renderer(this.canvas, false, true);
        InputManager.initialize(this.canvas, this.canvas);
        InputManager.setupDefaultVirtualControls();

        // --- Splash Screen Phase ---
        const hasSplashes = this.config.splashScreens && (this.config.splashScreens.show || this.config.splashScreens.showEngineLogo);
        const engineLogoEnabled = this.config.showEngineLogo || (this.config.splashScreens && this.config.splashScreens.showEngineLogo);

        if (hasSplashes || engineLogoEnabled) {
            await this.playSplashScreens();
        }

        // --- Resource Preloading Phase ---
        if (this.config.resourceLoadingMode === 'preload') {
            await this.preloadAllResources();
        }

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
            scene.physicsSystem = this.physicsSystem; // Link for components
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

        // 4. Initial Resize
        if (this.renderer) this.renderer.resize();

        // 5. Start Loop
        this.lastTime = performance.now();
        this.fixedAccumulator = 0;
        this.FIXED_DELTA = 1 / 50;
        requestAnimationFrame(this.loop.bind(this));
    }

    loop(timestamp) {
        this.frameCount++;
        // --- FPS Control ---
        const perfMonitor = EngineAPI.getPerformanceMonitor();
        const targetMaxFps = perfMonitor ? perfMonitor.targetMaxFps : 0;

        if (targetMaxFps > 0) {
            const frameTime = 1000 / targetMaxFps;
            if (timestamp - this.lastTime < frameTime) {
                requestAnimationFrame(this.loop.bind(this));
                return;
            }
        }

        this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        if (perfMonitor) {
            perfMonitor.recordFrame(this.deltaTime);
        }

        // --- Fixed Update Loop ---
        const subSteps = perfMonitor ? perfMonitor.getPhysicsSubSteps() : 4;
        this.fixedAccumulator += this.deltaTime;
        while (this.fixedAccumulator >= this.FIXED_DELTA) {
            if (this.physicsSystem) this.physicsSystem.update(this.FIXED_DELTA, subSteps);

            if (SceneManager.currentScene) {
                SceneManager.currentScene.getAllMaterias().forEach(m => {
                    if (m.isActive) {
                        for (const ley of m.leyes) {
                            if (ley.isActive && typeof ley.fixedUpdate === 'function') {
                                try { ley.fixedUpdate(this.FIXED_DELTA); } catch(e) {}
                            }
                        }
                    }
                });
            }
            this.fixedAccumulator -= this.FIXED_DELTA;
        }

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

    async preloadAllResources() {
        return new Promise(async (resolve) => {
            const container = document.createElement('div');
            container.id = 'preload-container';
            container.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#111; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:10001; color:white; font-family:sans-serif; transition: opacity 0.5s;';
            document.body.appendChild(container);

            const title = document.createElement('h2');
            title.textContent = (window.Localization?.get('CARGANDO_RECURSOS') || 'Cargando recursos...');
            container.appendChild(title);

            const progressBar = document.createElement('div');
            progressBar.style.cssText = 'width:300px; height:10px; background:#333; border-radius:5px; margin-top:20px; overflow:hidden; border:1px solid #444;';
            const progressFill = document.createElement('div');
            progressFill.style.cssText = 'width:0%; height:100%; background:#3498db; transition: width 0.1s;';
            progressBar.appendChild(progressFill);
            container.appendChild(progressBar);

            const statusText = document.createElement('p');
            statusText.style.cssText = 'margin-top:10px; font-size:0.8rem; color:#888;';
            container.appendChild(statusText);

            try {
                // 1. Collect initial assets to load
                const scenesToScan = this.config.allScenes || [];
                const startScene = this.config.startScene || 'default.ceScene';
                if (!scenesToScan.includes(startScene)) scenesToScan.push(startScene);

                const assetsToLoad = new Set();

                // Add app icon
                if (this.config.appIcon) assetsToLoad.add(this.config.appIcon);

                // Add splash screens
                if (this.config.splashScreens && this.config.splashScreens.list) {
                    this.config.splashScreens.list.forEach(s => {
                        if (s.path) assetsToLoad.add(s.path);
                        if (s.sound) assetsToLoad.add(s.sound);
                    });
                }

                // Add scenes
                scenesToScan.forEach(scenePath => {
                    const path = scenePath.startsWith('Assets/') ? scenePath : `Assets/${scenePath}`;
                    assetsToLoad.add(path);
                });

                // Helper to extract nested asset paths starting with "Assets/" from any JSON/string
                const extractAssetsFromStringOrObject = (obj, set) => {
                    if (typeof obj === 'string') {
                        if (obj.startsWith('Assets/')) {
                            set.add(obj);
                        }
                    } else if (obj && typeof obj === 'object') {
                        for (const key in obj) {
                            if (obj.hasOwnProperty(key)) {
                                extractAssetsFromStringOrObject(obj[key], set);
                            }
                        }
                    }
                };

                // Queue of assets to process/scan for sub-dependencies (recursive scanning)
                const scannedAssets = new Set();
                const queue = [...assetsToLoad];
                let queueIndex = 0;

                while (queueIndex < queue.length) {
                    const assetPath = queue[queueIndex++];
                    if (scannedAssets.has(assetPath)) continue;
                    scannedAssets.add(assetPath);

                    const ext = assetPath.split('.').pop().toLowerCase();
                    if (['cescene', 'ceanim', 'cea', 'cesprite'].includes(ext)) {
                        statusText.textContent = `Analizando dependencias de: ${assetPath}`;
                        try {
                            const url = await getURLForAssetPath(assetPath);
                            if (url) {
                                const resp = await fetch(url);
                                if (resp.ok) {
                                    const data = await resp.json();

                                    // Extract all strings starting with Assets/
                                    const localAssets = new Set();
                                    extractAssetsFromStringOrObject(data, localAssets);

                                    // Special cases (like spritesheet source image which might not start with Assets/)
                                    if (ext === 'cesprite' && data.sourceImage) {
                                        const sourceImgPath = data.sourceImage.startsWith('Assets/') ? data.sourceImage : `Assets/${data.sourceImage}`;
                                        localAssets.add(sourceImgPath);
                                    }

                                    for (const loc of localAssets) {
                                        if (!assetsToLoad.has(loc)) {
                                            assetsToLoad.add(loc);
                                            queue.push(loc);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn("Failed to scan asset for dependencies:", assetPath, e);
                        }
                    }
                }

                // 2. Load everything
                const total = assetsToLoad.size;
                let current = 0;

                for (const assetPath of assetsToLoad) {
                    current++;
                    const percent = (current / total) * 100;
                    progressFill.style.width = `${percent}%`;
                    statusText.textContent = `Cargando: ${assetPath} (${current}/${total})`;

                    try {
                        const url = await getURLForAssetPath(assetPath);
                        if (url) {
                            // Determine type and preload accordingly
                            const ext = assetPath.split('.').pop().toLowerCase();
                            if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
                                await new Promise((res) => {
                                    const img = new Image();
                                    img.onload = res;
                                    img.onerror = res;
                                    img.src = url;
                                });
                            } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                                await new Promise((res) => {
                                    const audio = new Audio();
                                    audio.oncanplaythrough = res;
                                    audio.onerror = res;
                                    audio.src = url;
                                    audio.load();
                                    // Fallback for some browsers that won't fire canplaythrough without user interaction
                                    setTimeout(res, 500);
                                });
                            } else {
                                // Just fetch the file to put it in browser cache
                                await fetch(url).catch(() => {});
                            }
                        }
                    } catch (e) { console.warn("Preload failed for:", assetPath, e); }
                }

            } catch (error) {
                console.error("Preload process failed:", error);
            } finally {
                container.style.opacity = '0';
                setTimeout(() => {
                    container.remove();
                    resolve();
                }, 500);
            }
        });
    }

    async playSplashScreens() {
        return new Promise(async (resolve) => {
            const container = document.createElement('div');
            container.id = 'splash-container';
            container.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:black; display:flex; align-items:center; justify-content:center; z-index:10000; transition: opacity 0.5s;';
            document.body.appendChild(container);

            container.style.flexDirection = 'column';

            const img = document.createElement('img');
            img.style.cssText = 'max-width:80%; max-height:70%; opacity:0; transition: opacity 0.8s; object-fit: contain;';
            container.appendChild(img);

            const splashText = document.createElement('div');
            splashText.style.cssText = 'color: white; font-size: 1.5rem; margin-top: 30px; opacity: 0; transition: opacity 0.8s; font-family: sans-serif; text-align: center;';
            container.appendChild(splashText);

            const splashes = (this.config.splashScreens && this.config.splashScreens.list) ? [...this.config.splashScreens.list] : [];

            // Default Engine Splash if requested (either in splashScreens obj or root config)
            const engineLogoEnabled = this.config.showEngineLogo || (this.config.splashScreens && this.config.splashScreens.showEngineLogo);

            if (engineLogoEnabled) {
                splashes.unshift({
                    path: 'engine/Logo_C.png',
                    duration: (this.config.splashScreens && this.config.splashScreens.engineLogoDuration) || 3,
                    sound: 'engine/startup.wav',
                    isEngineLogo: true
                });
            }

            for (const splash of splashes) {
                // Determine URL
                let url;
                if (splash.path === 'engine/Logo_C.png') {
                    url = 'image/Logo_C.png'; // In standalone build we should ensure this exists
                } else {
                    url = await getURLForAssetPath(splash.path);
                }

                img.src = url;

                if (splash.isEngineLogo) {
                    splashText.textContent = (window.navigator.language.startsWith('es') || this.config.language === 'es')
                        ? 'Hecho con Creative Engine'
                        : 'Made with Creative Engine';
                } else {
                    splashText.textContent = '';
                }

                // Sound
                if (splash.sound) {
                    try {
                        let soundUrl;
                        if (splash.sound === 'engine/startup.wav') {
                            soundUrl = 'musica/startup.wav';
                        } else if (splash.sound === 'engine/splash.mp3') {
                            soundUrl = 'musica/splash.mp3';
                        } else {
                            soundUrl = await getURLForAssetPath(splash.sound);
                        }
                        const audio = new Audio(soundUrl);
                        audio.play().catch(e => console.warn("Splash sound failed to play", e));
                    } catch(e) {}
                }

                // Fade In
                await new Promise(r => setTimeout(r, 100));
                img.style.opacity = '1';
                splashText.style.opacity = '1';

                // Wait duration
                await new Promise(r => setTimeout(r, (splash.duration || 3) * 1000));

                // Fade Out
                img.style.opacity = '0';
                splashText.style.opacity = '0';
                await new Promise(r => setTimeout(r, 800));
            }

            container.style.opacity = '0';
            setTimeout(() => {
                container.remove();
                resolve();
            }, 500);
        });
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
                m.getComponent(Components.Terreno2D) ||
                m.getComponent(Components.VideoPlayer) ||
                m.getComponent(Components.Water) ||
                m.getComponent(Components.LineCollider2D) ||
                m.getComponent(Components.SkeletonRenderer) ||
                m.getComponent(Components.Bone)
            ))
            .sort((a, b) => {
                const drawingOrderA = a.getComponent(Components.DrawingOrder);
                const drawingOrderB = b.getComponent(Components.DrawingOrder);
                const valA = drawingOrderA ? drawingOrderA.order : 0;
                const valB = drawingOrderB ? drawingOrderB.order : 0;
                if (valA !== valB) return valA - valB;

                if (a.isAncestorOf(b)) return -1;
                if (b.isAncestorOf(a)) return 1;

                const rendererA = a.getComponent(Components.SpriteRenderer) || a.getComponent(Components.TextureRender) || a.getComponent(Components.TilemapRenderer) || a.getComponent(Components.Terreno2D) || a.getComponent(Components.Water) || a.getComponent(Components.LineCollider2D) || a.getComponent(Components.SkeletonRenderer) || a.getComponent(Components.Bone);
                const rendererB = b.getComponent(Components.SpriteRenderer) || b.getComponent(Components.TextureRender) || b.getComponent(Components.TilemapRenderer) || b.getComponent(Components.Terreno2D) || b.getComponent(Components.Water) || b.getComponent(Components.LineCollider2D) || b.getComponent(Components.SkeletonRenderer) || b.getComponent(Components.Bone);
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

                ctx.save();

                // --- Apply Layer Settings ---
                const layerSettings = SceneManager.currentScene.layerSettings ? SceneManager.currentScene.layerSettings[materia.layer] : null;
                if (layerSettings) {
                    if (layerSettings.visible === false) {
                        ctx.restore();
                        continue;
                    }
                    if (layerSettings.opacity !== undefined) ctx.globalAlpha *= layerSettings.opacity;
                    if (layerSettings.pixelated !== undefined) {
                        ctx.imageSmoothingEnabled = !layerSettings.pixelated;
                    }
                }

                const transform = materia.getComponent(Components.Transform);
                const parallax = materia.getComponent(Components.Parallax);
                const sr = materia.getComponent(Components.SpriteRenderer);
                const tr = materia.getComponent(Components.TextureRender);
                const tmr = materia.getComponent(Components.TilemapRenderer);
                const vp = materia.getComponent(Components.VideoPlayer);
                const water = materia.getComponent(Components.Water);
                const lineCollider = materia.getComponent(Components.LineCollider2D);
                const skeleton = materia.getComponent(Components.SkeletonRenderer);
                const bone = materia.getComponent(Components.Bone);
                const terreno2D = materia.getComponent(Components.Terreno2D);

                // --- Parallax Displacement ---
                let worldPosition = transform.position;
                if (parallax) {
                    let targetX = 0;
                    let targetY = 0;
                    let hasTarget = false;
                    if (parallax.targetMateria) {
                        let targetObj = null;
                        const scene = this.scene || (materia.scene || window.SceneManager?.currentScene);
                        if (scene) {
                            if (typeof parallax.targetMateria === 'number') {
                                targetObj = scene.findMateriaById(parallax.targetMateria);
                            } else if (typeof parallax.targetMateria === 'string') {
                                targetObj = scene.findMateriaByName(parallax.targetMateria) || materia.findChildByName(parallax.targetMateria, true);
                            }
                        }
                        if (targetObj) {
                            const targetTransform = targetObj.getComponentByName ? targetObj.getComponentByName('Transform') : targetObj.getComponent(Components.Transform);
                            if (targetTransform) {
                                targetX = targetTransform.x;
                                targetY = targetTransform.y;
                                hasTarget = true;
                                if (parallax._initialTargetPosition === null) {
                                    parallax._initialTargetPosition = { x: targetX, y: targetY };
                                }
                            }
                        }
                    }
                    if (parallax._initialPosition === null) {
                        parallax._initialPosition = { x: transform.position.x, y: transform.position.y };
                    }

                    if (hasTarget && parallax._initialTargetPosition !== null && parallax._initialPosition !== null) {
                        const deltaX = targetX - parallax._initialTargetPosition.x;
                        const deltaY = targetY - parallax._initialTargetPosition.y;
                        worldPosition = {
                            x: parallax._initialPosition.x + (deltaX * (1 - parallax.scrollFactor.x)) + parallax.offset.x + (parallax._autoOffset ? parallax._autoOffset.x : 0),
                            y: parallax._initialPosition.y + (deltaY * (1 - parallax.scrollFactor.y)) + parallax.offset.y + (parallax._autoOffset ? parallax._autoOffset.y : 0)
                        };
                    } else {
                        worldPosition = {
                            x: worldPosition.x + parallax.offset.x + (parallax._autoOffset ? parallax._autoOffset.x : 0),
                            y: worldPosition.y + parallax.offset.y + (parallax._autoOffset ? parallax._autoOffset.y : 0)
                        };
                    }
                }

                // Culling
                if (cameraViewBox) {
                    const isRepeating = !!parallax;
                    if (!isRepeating) {
                        const objectBounds = MathUtils.getOOB(materia, worldPosition);
                        if (objectBounds && !MathUtils.checkIntersection(cameraViewBox, objectBounds)) {
                            ctx.restore();
                            continue;
                        }
                    }
                    const cameraComponent = cameraMateria.getComponent(Components.Camera);
                    const mLayers = materia.layers || [materia.layer || 0];
                    const isVisible = mLayers.some(l => (cameraComponent.cullingMask & (1 << l)) !== 0);
                    if (!isVisible) {
                        ctx.restore();
                        continue;
                    }
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
                    ctx.scale(worldScale.x, -worldScale.y);
                    ctx.drawImage(sourceImg, sourceSX, sourceSY, sourceSW, sourceSH, -sWidth * pivotX, -sHeight * pivotY, sWidth, sHeight);
                    ctx.restore();
                    if (window._PerformanceMetrics) {
                        window._PerformanceMetrics.spritesDrawn = (window._PerformanceMetrics.spritesDrawn || 0) + 1;
                    }
                } else if (tr) {
                    const worldScale = transform.scale, worldRotation = transform.rotation;
                    const dWidth = tr.width * worldScale.x, dHeight = tr.height * worldScale.y;
                    const mirrorX = parallax && parallax.mirroring ? parallax.mirroring.x : 0, mirrorY = parallax && parallax.mirroring ? parallax.mirroring.y : 0;

                    const drawTex = (tx = 0, ty = 0) => {
                        if (window._PerformanceMetrics) {
                            window._PerformanceMetrics.texturesDrawn = (window._PerformanceMetrics.texturesDrawn || 0) + 1;
                        }
                        ctx.save();
                        ctx.translate(worldPosition.x + tx, worldPosition.y + ty);
                        ctx.rotate(worldRotation * Math.PI / 180);
                        ctx.scale(worldScale.x, -worldScale.y);
                        if (tr.texture && tr.texture.complete) {
                            if (tr.wrapMode === 'Repeat') {
                                if (!tr._cachedPattern || tr._cachedPatternSrc !== tr.texture.src || tr._cachedPatternCtx !== ctx) {
                                    tr._cachedPattern = ctx.createPattern(tr.texture, 'repeat');
                                    tr._cachedPatternSrc = tr.texture.src;
                                    tr._cachedPatternCtx = ctx;
                                }
                                ctx.fillStyle = tr._cachedPattern;
                                if (tr.shape === 'Rectangle') ctx.fillRect(-tr.width / 2, -tr.height / 2, tr.width, tr.height);
                                else if (tr.shape === 'Circle') { ctx.beginPath(); ctx.arc(0, 0, tr.radius, 0, 2 * Math.PI); ctx.fill(); }
                                else if (tr.shape === 'Triangle') { ctx.beginPath(); ctx.moveTo(0, -tr.height / 2); ctx.lineTo(-tr.width / 2, tr.height / 2); ctx.lineTo(tr.width / 2, tr.height / 2); ctx.closePath(); ctx.fill(); }
                            } else {
                                // Clamp mode (fijar borde): draw as a stretched image
                                if (tr.shape === 'Rectangle') {
                                    ctx.drawImage(tr.texture, -tr.width / 2, -tr.height / 2, tr.width, tr.height);
                                } else {
                                    ctx.save();
                                    if (tr.shape === 'Circle') {
                                        ctx.beginPath(); ctx.arc(0, 0, tr.radius, 0, 2 * Math.PI); ctx.clip();
                                    } else if (tr.shape === 'Triangle') {
                                        ctx.beginPath(); ctx.moveTo(0, -tr.height / 2); ctx.lineTo(-tr.width / 2, tr.height / 2); ctx.lineTo(tr.width / 2, tr.height / 2); ctx.closePath(); ctx.clip();
                                    }
                                    ctx.drawImage(tr.texture, -tr.width / 2, -tr.height / 2, tr.width, tr.height);
                                    ctx.restore();
                                }
                            }
                        } else {
                            ctx.fillStyle = tr.color;
                            if (tr.shape === 'Rectangle') ctx.fillRect(-tr.width / 2, -tr.height / 2, tr.width, tr.height);
                            else if (tr.shape === 'Circle') { ctx.beginPath(); ctx.arc(0, 0, tr.radius, 0, 2 * Math.PI); ctx.fill(); }
                            else if (tr.shape === 'Triangle') { ctx.beginPath(); ctx.moveTo(0, -tr.height / 2); ctx.lineTo(-tr.width / 2, tr.height / 2); ctx.lineTo(tr.width / 2, tr.height / 2); ctx.closePath(); ctx.fill(); }
                        }
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
                } else if (terreno2D) {
                    this.renderer.drawTerreno2D(terreno2D);
                } else if (water) {
                    this.renderer.drawWater(water, worldPosition.x, worldPosition.y);
                } else if (lineCollider) {
                    this.renderer.drawLineCollider(lineCollider, worldPosition.x, worldPosition.y);
                } else if (skeleton) {
                    this.renderer.drawSkeleton(skeleton);
                } else if (bone) {
                    this.renderer.drawBone(bone);
                }

                ctx.restore();
            }

            for (const materia of canvasesToRender) {
                this.renderer.drawCanvas(materia);
            }
        };

        const drawLights = (lights) => {
            if (this.config.rendererMode !== 'realista') return;

            // Performance Optimization: Throttle lights if optimization level is high
            const perfMonitor = EngineAPI.getPerformanceMonitor();
            if (perfMonitor && perfMonitor.getShouldThrottleLights()) {
                if (this.frameCount % 2 !== 0) {
                    if (this.renderer.lightMapCanvas.width > 0) {
                        this.renderer.ctx.save();
                        this.renderer.ctx.setTransform(1, 0, 0, 1, 0, 0);
                        this.renderer.ctx.globalCompositeOperation = 'multiply';
                        this.renderer.ctx.drawImage(this.renderer.lightMapCanvas, 0, 0);
                        this.renderer.ctx.restore();
                        return;
                    }
                }
            }

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
