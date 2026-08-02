// js/engine/PerformanceMonitor.js

import * as SceneManager from './SceneManager.js';
import * as Components from './Components.js';
import { Localization } from './Localization.js';

export class PerformanceMonitor {
    constructor(engine) {
        this.engine = engine;
        this.fps = 0;
        this.lastFrameTimes = [];
        this.isOptimizing = false;
        this.optimizationLevel = 0; // 0: None, 1: Low, 2: High, 3: Extreme

        this.targetMaxFps = 60;
        this.forceFps = false;
        this.targetMinFps = 30;

        this.lastOptimizationCheck = 0;
        this.frameTimeHistory = 30; // Average over 30 frames
        this.warmupFrames = 100; // Wait 100 frames before first optimization check
        this.framesTracked = 0;

        // Intelligent Frame Analyzer
        this.lastStableSnapshots = [];
        this.maxSnapshots = 5;
        this.frameAnalysisResults = null;
        this.hasNotifiedOptimization = false;
    }

    updateConfig(config) {
        this.targetMaxFps = config.maxFps || 0; // 0 = no limit
        this.forceFps = !!config.forceFps;
        this.targetMinFps = config.minFps || 30;
        this.autoOptimize = config.autoOptimize !== undefined ? !!config.autoOptimize : true;
        this.maxOptimizationLevel = config.maxOptimizationLevel !== undefined ? parseInt(config.maxOptimizationLevel) : 3;

        // Auto-Mobile Optimization Profile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            console.log(`[PerformanceMonitor] Mobile detected. Applying performance profile...`);
            if (this.targetMaxFps === 0 || this.targetMaxFps > 60) this.targetMaxFps = 60;
            this.targetMinFps = Math.max(this.targetMinFps, 30);
            this.forceFps = false; // Disable busy-wait loops on mobile to save battery
        }

        console.log(`[PerformanceMonitor] Config updated: MaxFPS=${this.targetMaxFps}, ForceFPS=${this.forceFps}, MinFPS=${this.targetMinFps}`);

        if (config.slowNetMode) {
            console.log(`[PerformanceMonitor] Slow connection mode active. Increasing default optimization.`);
            this.optimizationLevel = Math.max(this.optimizationLevel, 1);
            this.applyOptimization();
        }
    }

    recordFrame(dt) {
        const now = performance.now();
        this.framesTracked++;
        this.lastFrameTimes.push(dt);
        if (this.lastFrameTimes.length > this.frameTimeHistory) {
            this.lastFrameTimes.shift();
        }

        const avgDt = this.lastFrameTimes.reduce((a, b) => a + b, 0) / this.lastFrameTimes.length;
        this.fps = 1 / avgDt;

        // Check for optimization every 500ms
        if (now - this.lastOptimizationCheck > 500 && this.framesTracked > this.warmupFrames) {
            this.checkPerformance();
            this.lastOptimizationCheck = now;
        }
    }

    checkPerformance() {
        // Do not automatically trigger optimizations if disabled!
        if (this.autoOptimize === false) return;

        // Optimization logic
        // Only trigger optimization if FPS falls below the absolute target minimum,
        // to prevent micro-stutters from triggering persistent optimization cycles.
        if (this.fps < this.targetMinFps) {
            this.analyzeFramePerformance();
            this.increaseOptimization();
        }
    }

    recordStableSnapshot() {
        if (!SceneManager.currentScene) return;

        const snapshot = this.capturePerformanceData();
        this.lastStableSnapshots.push(snapshot);
        if (this.lastStableSnapshots.length > this.maxSnapshots) {
            this.lastStableSnapshots.shift();
        }
    }

    capturePerformanceData() {
        const scene = SceneManager.currentScene;
        const materias = scene.getAllMaterias();

        const data = {
            timestamp: performance.now(),
            fps: this.fps,
            materiaCount: materias.length,
            activeCount: materias.filter(m => m.isActive).length,
            componentStats: {},
            lightCount: 0,
            particleCount: 0,
            physicsCount: 0
        };

        materias.forEach(m => {
            if (!m.isActive) return;
            m.leyes.forEach(ley => {
                const name = ley.constructor.name;
                data.componentStats[name] = (data.componentStats[name] || 0) + 1;

                if (name.includes('Light')) data.lightCount++;
                if (name === 'ParticleSystem') data.particleCount++;
                if (name === 'Rigidbody2D' && ley.bodyType === 'Dynamic') data.physicsCount++;
            });
        });

        return data;
    }

    analyzeFramePerformance() {
        if (this.lastStableSnapshots.length === 0) return;

        const current = this.capturePerformanceData();
        const stable = this.lastStableSnapshots[this.lastStableSnapshots.length - 1];

        const culprits = [];

        // Compare counts
        if (current.lightCount > stable.lightCount * 1.5) culprits.push({ type: 'Light', msg: 'Aumento súbito de luces' });
        if (current.physicsCount > stable.physicsCount * 1.5) culprits.push({ type: 'Rigidbody2D', msg: 'Demasiados objetos físicos activos' });
        if (current.particleCount > stable.particleCount * 2) culprits.push({ type: 'ParticleSystem', msg: 'Saturación de partículas' });

        // Check for specific components that might be leaking or growing
        for (const [name, count] of Object.entries(current.componentStats)) {
            const stableCount = stable.componentStats[name] || 0;
            if (count > stableCount + 20 && count > stableCount * 2) {
                culprits.push({ type: name, msg: `Exceso de componentes '${name}'` });
            }
        }

        if (culprits.length > 0) {
            this.frameAnalysisResults = culprits;
            this.reportCulprits(culprits);
        }
    }

    reportCulprits(culprits) {
        culprits.forEach(c => {
            const msg = `> Optimizador: Detectada causa "${c.msg}". Ejecutando ajuste de nivel ${this.optimizationLevel}...`;
            console.warn(`[PerformanceMonitor] ${c.msg}`);
            if (window.logToUIConsole) {
                window.logToUIConsole({
                    message: msg,
                    isSystemString: true,
                    isOptimizer: true,
                    culpritType: c.type,
                    culpritData: c
                }, 'info');
            }
        });
    }

    /**
     * Performs a surgical optimization based on the detected culprit.
     * @param {string} type The type of component causing the issue.
     */
    surgicalOptimize(type) {
        console.log(`[PerformanceMonitor] Optimización quirúrgica para: ${type}`);

        const scene = SceneManager.currentScene;
        if (!scene) return;

        const materias = scene.getAllMaterias();

        switch(type) {
            case 'Light':
            case 'PointLight2D':
            case 'SpotLight2D':
                // Reduce range and intensity of distant lights
                const cam = scene.findFirstCamera();
                const camPos = cam ? cam.getComponent(Components.Transform).position : { x: 0, y: 0 };

                materias.forEach(m => {
                    const l = m.getComponent(Components.PointLight2D) || m.getComponent(Components.SpotLight2D);
                    if (l) {
                        const t = m.getComponent(Components.Transform);
                        const dist = Math.hypot(t.x - camPos.x, t.y - camPos.y);
                        if (dist > 1000) {
                            l.intensity *= 0.5;
                            l.radius *= 0.8;
                        }
                    }
                });
                break;

            case 'ParticleSystem':
                // Cut emission rates in half
                materias.forEach(m => {
                    const ps = m.getComponent(Components.ParticleSystem);
                    if (ps) ps.emissionRate *= 0.5;
                });
                break;

            case 'Rigidbody2D':
                // Increase sleep threshold or disable distant physics
                materias.forEach(m => {
                    const rb = m.getComponent(Components.Rigidbody2D);
                    if (rb && rb.bodyType === 'Dynamic') {
                        // For now, let's just make them sleep if they are slow
                        if (Math.abs(rb.velocity.x) < 0.1 && Math.abs(rb.velocity.y) < 0.1) {
                            rb.velocity = { x: 0, y: 0 };
                        }
                    }
                });
                break;

            default:
                // Generic component reduction if too many
                if (materias.length > 500) {
                    console.warn("[PerformanceMonitor] Demasiadas materias, se recomienda usar Prefabs y Pooling.");
                }
                break;
        }

        this.increaseOptimization();
    }

    increaseOptimization() {
        const maxLevel = this.maxOptimizationLevel !== undefined ? this.maxOptimizationLevel : 3;
        if (this.optimizationLevel >= maxLevel) return;
        this.optimizationLevel++;
        this.applyOptimization();
    }

    decreaseOptimization() {
        if (this.optimizationLevel <= 0) return;
        this.optimizationLevel--;
        this.applyOptimization();
    }

    applyOptimization() {
        let levelDesc = "Normal";
        if (this.optimizationLevel === 1) levelDesc = "Ajuste de física";
        else if (this.optimizationLevel === 2) levelDesc = "Reducción de luces y partículas";
        else if (this.optimizationLevel === 3) levelDesc = "Simplificación de mapa y terreno";

        const msg = `> Optimizador: Se ha optimizado el juego aplicando "${levelDesc}" (Nivel ${this.optimizationLevel}).`;

        if (this.optimizationLevel > 0 && !this.hasNotifiedOptimization) {
            this.hasNotifiedOptimization = true;
            console.warn(`[PerformanceMonitor] Optimization Level ${this.optimizationLevel} applied. FPS: ${Math.round(this.fps)}`);
            if (window.logToUIConsole) {
                window.logToUIConsole({
                    message: msg,
                    isSystemString: true,
                    isOptimizer: true
                }, 'info');
            }
        }

        // 1. Notify scripts via event
        if (this.optimizationLevel >= 2) {
            this.notifyScripts();
        }

        // 2. Engine-level tweaks
        // We'll use these levels in the main loops and physics
    }

    notifyScripts() {
        if (!SceneManager.currentScene) return;

        SceneManager.currentScene.getAllMaterias().forEach(m => {
            if (!m.isActive) return;
            m.leyes.forEach(ley => {
                if (ley instanceof Components.CreativeScript && ley.instance) {
                    try {
                        if (typeof ley.instance.alBajoRendimiento === 'function') {
                            ley.instance.alBajoRendimiento(this.optimizationLevel);
                        } else if (typeof ley.instance.onLowPerformance === 'function') {
                            ley.instance.onLowPerformance(this.optimizationLevel);
                        }
                    } catch (e) {
                        // Ignore errors in user scripts during optimization
                    }
                }
            });
        });
    }

    getPhysicsSubSteps() {
        if (this.optimizationLevel === 0) return 4;
        if (this.optimizationLevel === 1) return 2;
        return 1; // Level 2 and 3
    }

    getShouldThrottleLights() {
        return this.optimizationLevel >= 2;
    }

    getParticleThrottle() {
        if (this.optimizationLevel === 0) return 1.0;
        if (this.optimizationLevel === 1) return 0.7;
        if (this.optimizationLevel === 2) return 0.4;
        return 0.1; // Level 3: Extreme
    }

    getShouldSimplifyWater() {
        return this.optimizationLevel >= 2;
    }

    getShouldReduceMapDetail() {
        return this.optimizationLevel >= 3;
    }

    getTextureQuality() {
        if (this.optimizationLevel >= 2) return 'low';
        return 'high';
    }
}
