/**
 * NetworkMonitor.js
 *
 * Módulo para rastrear el consumo de datos de internet en tiempo real.
 */

class NetworkMonitor {
    constructor() {
        this.totalBytesDownloaded = 0;
        this.bytesLastSecond = 0;
        this.history = []; // Historial de consumo por segundo
        this._lastUpdateTime = performance.now();
        this._intervalId = null;
        this._callbacks = new Set();

        this.limitMB = Infinity;
        this.isThrottling = false;
        this.heavyAssetThreshold = 2 * 1024 * 1024; // 2MB por defecto

        this.start();
    }

    start() {
        if (this._intervalId) return;
        this._intervalId = setInterval(() => this._tick(), 1000);
    }

    stop() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    recordDownload(bytes, assetPath = null) {
        if (typeof bytes !== 'number' || isNaN(bytes)) return;
        this.totalBytesDownloaded += bytes;
        this.bytesLastSecond += bytes;

        // Alerta de asset pesado
        if (assetPath && bytes > this.heavyAssetThreshold) {
            const sizeMB = (bytes / 1048576).toFixed(2);
            console.warn(`[Network] Asset pesado detectado: ${assetPath} (${sizeMB} MB). Considere optimizarlo.`);
            if (window.logToUIConsole) {
                window.logToUIConsole({
                    message: `Asset pesado: ${assetPath.split('/').pop()} (${sizeMB} MB)`,
                    scriptName: 'Network'
                }, 'warning');
            }
        }

        // Comprobar límite
        if (this.totalBytesDownloaded / 1048576 > this.limitMB) {
            console.warn(`[Network] Límite de datos alcanzado: ${this.limitMB} MB`);
            this.isThrottling = true;
        }
    }

    _tick() {
        const now = performance.now();
        this.history.push({
            time: now,
            bytes: this.bytesLastSecond
        });

        // Mantener solo los últimos 60 segundos
        if (this.history.length > 60) this.history.shift();

        this._notify(this.bytesLastSecond, this.totalBytesDownloaded);
        this.bytesLastSecond = 0;
        this._lastUpdateTime = now;
    }

    subscribe(callback) {
        this._callbacks.add(callback);
        return () => this._callbacks.delete(callback);
    }

    _notify(currentSpeed, total) {
        this._callbacks.forEach(cb => cb(currentSpeed, total));
    }

    getStats() {
        return {
            currentSpeed: this.bytesLastSecond,
            totalDownloaded: this.totalBytesDownloaded,
            limitMB: this.limitMB,
            isThrottling: this.isThrottling,
            cacheSize: 0 // Se actualizará desde AssetUtils si es posible
        };
    }

    setLimit(mb) {
        this.limitMB = mb || Infinity;
    }
}

// Singleton
export const networkMonitor = new NetworkMonitor();
window._NetworkMonitor = networkMonitor;
