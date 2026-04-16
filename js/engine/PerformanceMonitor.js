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
            this.increaseOptimization();
        } else if (this.fps > this.targetMinFps + 15) {
            this.decreaseOptimization();
        }
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
