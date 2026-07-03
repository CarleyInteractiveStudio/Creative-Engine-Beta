// js/engine/3d/CEEngine3D.js
// Specialized Engine API for 3D Engine.

import { PerformanceMonitor } from '../PerformanceMonitor.js';
import * as PerformanceAPI from '../PerformanceAPI.js';
import * as MathUtils from './MathUtils3D.js';
import * as RuntimeAPIManager from '../RuntimeAPIManager.js';

let physicsSystem = null;
let currentDeltaTime = 0;
let performanceMonitor = null;
let currentScene = null;

export function initialize(dependencies) {
    physicsSystem = dependencies.physicsSystem;
    currentScene = dependencies.scene;
    if (!performanceMonitor) {
        performanceMonitor = new PerformanceMonitor(this);
        PerformanceAPI.setPerformanceMonitor(performanceMonitor);
    }
}

export function update(dt) {
    currentDeltaTime = dt;
    if (performanceMonitor) performanceMonitor.recordFrame(dt);
}

const engineAPIs = {
    getDeltaTime: () => currentDeltaTime,
    raycast: (origin, dir, dist) => physicsSystem?.raycast3D(origin, dir, dist),
    find: (name) => currentScene?.findMateriaByName(name),
    setGlobal: RuntimeAPIManager.setGlobal,
    getGlobal: RuntimeAPIManager.getGlobal
};

export function getAPIs() { return engineAPIs; }
