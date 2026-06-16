// js/engine/PerformanceAPI.js
// A small bridge to avoid circular dependencies between CEEngine and other core classes

let perfMonitor = null;

export function setPerformanceMonitor(monitor) {
    perfMonitor = monitor;
}

export function getPerformanceMonitor() {
    return perfMonitor;
}
