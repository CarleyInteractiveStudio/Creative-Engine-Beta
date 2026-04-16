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
        this.targetMinFps = 30;

        this.lastOptimizationCheck = 0;
        this.frameTimeHistory = 30; // Average over 30 frames

        // Intelligent Frame Analyzer
        this.lastStableSnapshots = [];
        this.maxSnapshots = 5;
        this.frameAnalysisResults = null;
    }

    updateConfig(config) {
        this.targetMaxFps = config.maxFps || 0; // 0 = no limit
        this.targetMinFps = config.minFps || 30;
        console.log(`[PerformanceMonitor] Config updated: MaxFPS=${this.targetMaxFps}, MinFPS=${this.targetMinFps}`);
    }

    recordFrame(dt) {
        const now = performance.now();
        this.lastFrameTimes.push(dt);
        if (this.lastFrameTimes.length > this.frameTimeHistory) {
            this.lastFrameTimes.shift();
        }

        const avgDt = this.lastFrameTimes.reduce((a, b) => a + b, 0) / this.lastFrameTimes.length;
        this.fps = 1 / avgDt;

        // Check for optimization every 500ms
        if (now - this.lastOptimizationCheck > 500) {
            this.checkPerformance();
            this.lastOptimizationCheck = now;
        }
    }

    checkPerformance() {
        // Optimization logic
        if (this.fps < this.targetMinFps + 5) {
            this.analyzeFramePerformance();
            this.increaseOptimization();
        } else if (this.fps > this.targetMinFps + 15) {
            this.decreaseOptimization();
            this.recordStableSnapshot();
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
            const msg = `[Optimizer] CAUSA DETECTADA: ${c.msg}`;
            if (window.logToUIConsole) {
                window.logToUIConsole({
                    message: msg,
                    isSystemString: true,
                    isOptimizer: true,
                    culpritType: c.type,
                    culpritData: c
                }, 'warn');
            } else {
                console.warn(msg);
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
        if (this.optimizationLevel >= 3) return;
        this.optimizationLevel++;
        this.applyOptimization();
    }

    decreaseOptimization() {
        if (this.optimizationLevel <= 0) return;
        this.optimizationLevel--;
        this.applyOptimization();
    }

    applyOptimization() {
        const msg = (Localization.get('OPT_LEVEL_NOTICE') || 'Optimization Level: {level} (FPS: {fps})')
            .replace('{level}', this.optimizationLevel)
            .replace('{fps}', Math.round(this.fps));

        console.warn(`[PerformanceMonitor] ${msg}`);

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
