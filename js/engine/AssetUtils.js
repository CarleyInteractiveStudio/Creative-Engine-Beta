let isStandalone = false;

export function setStandaloneMode(value) {
    isStandalone = value;
}

const assetUrlCache = new Map();
const assetPromiseCache = new Map();

/**
 * Clears the cached URL for a specific asset path, or clears the entire cache if no path is provided.
 * Use this when an asset has been modified and needs to be reloaded.
 * @param {string} [path] - The asset path to invalidate.
 */
export function clearAssetCache(path) {
    if (path) {
        const url = assetUrlCache.get(path);
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
        assetUrlCache.delete(path);
        // Also remove leading slash variant if it exists, for robustness
        if (path.startsWith('/')) {
            assetUrlCache.delete(path.substring(1));
        } else {
            assetUrlCache.delete('/' + path);
        }
    } else {
        assetUrlCache.forEach(url => {
            if (url && typeof url === 'string' && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        assetUrlCache.clear();
    }
}

/**
 * Monitorización de red global.
 */
async function recordFetch(response, path = null) {
    if (!response) return;
    try {
        const { networkMonitor } = await import('./NetworkMonitor.js');
        const contentLength = response.headers.get('content-length');
        if (contentLength) networkMonitor.recordDownload(parseInt(contentLength), path);
    } catch (e) {}
}

export { recordFetch };

export async function getURLForAssetPath(path, projectsDirHandle) {
    if (!path) return null;

    // --- Data, Blob, and HTTP URL Support ---
    if (path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    // --- Automatic Cache System for Remote Assets (HTTP/S) ---
    if (path.startsWith('http')) {
        try {
            const cache = await caches.open('ce-asset-cache');
            const cachedResponse = await cache.match(path);
            if (cachedResponse) {
                const blob = await cachedResponse.blob();
                return URL.createObjectURL(blob);
            }
            // If not in cache, fetch and store
            const response = await fetch(path);
            if (response.ok) {
                await recordFetch(response.clone(), path);
                await cache.put(path, response.clone());
                const blob = await response.blob();
                return URL.createObjectURL(blob);
            }
        } catch (e) {
            console.error("[Cache] Error gestionando caché remota:", e);
        }
        return path;
    }

    // Check completed cache first
    if (assetUrlCache.has(path)) {
        return assetUrlCache.get(path);
    }

    // Check ongoing request cache
    if (assetPromiseCache.has(path)) {
        return assetPromiseCache.get(path);
    }

    const effectiveHandle = projectsDirHandle || window.projectsDirHandle;

    if (isStandalone && !effectiveHandle) {
        // In real standalone mode (not preview), we assume assets are served relative to the root
        return path;
    }

    if (!effectiveHandle) return null;

    // Create a new promise for this path
    const loadPromise = (async () => {
        try {
            // --- Network Optimization Logic ---
            const config = window.currentProjectConfig;
            const { networkMonitor } = await import('./NetworkMonitor.js');

            if (config && config.slowNetMode) {
                // En modo red lenta, priorizamos archivos críticos o pequeños
                const ext = path.split('.').pop().toLowerCase();
                const criticalExts = ['ces', 'json', 'ceconfig', 'cescene'];

                if (!criticalExts.includes(ext)) {
                    // Si no es crítico, añadimos una pequeña espera para no saturar la red
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            if (networkMonitor.isThrottling) {
                // Si el límite se excedió, lanzamos error o esperamos mucho
                throw new Error("Network limit reached. Throttling active.");
            }

            const projectName = new URLSearchParams(window.location.search).get('project');
            let projectHandle;

            // --- Shared Extensions Support ---
            if (path.startsWith('Extensions/')) {
                try {
                    // Try to access root Extensions first
                    projectHandle = await effectiveHandle.getDirectoryHandle('Extensions', { create: true });
                } catch (e) {
                    console.warn("[AssetUtils] Fallback to project-local Extensions directory.");
                    try {
                        const projH = await effectiveHandle.getDirectoryHandle(projectName);
                        projectHandle = await projH.getDirectoryHandle('Extensions', { create: true });
                    } catch(e2) {
                        projectHandle = await effectiveHandle.getDirectoryHandle(projectName);
                    }
                }
            } else {
                projectHandle = await effectiveHandle.getDirectoryHandle(projectName);
            }

            let currentHandle = projectHandle;
            const parts = path.split('/').filter(p => p);
            const fileName = parts.pop();

            // If we are in the shared 'Extensions' directory, the path starts with 'Extensions/'
            // so we must skip the first part if it matches the directory we already obtained.
            const startIdx = (path.startsWith('Extensions/') && projectHandle.name === 'Extensions') ? 1 : 0;

            for (let i = startIdx; i < parts.length; i++) {
                currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
            }

            const fileHandle = await currentHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();

            // --- Custom Icon Logic ---
            if (fileName.toLowerCase().endsWith('.cesprite')) {
                const preview = await generateSpritePreview(file, currentHandle);
                assetUrlCache.set(path, preview);
                return preview;
            }

            if (fileName.toLowerCase().endsWith('.celib')) {
                const content = await file.text();
                const libData = JSON.parse(content);
                if (libData.icon_base64) {
                    const dataUrl = `data:image/png;base64,${libData.icon_base64}`;
                    assetUrlCache.set(path, dataUrl);
                    return dataUrl;
                }
            }

            // --- Default Logic ---
            const url = URL.createObjectURL(file);
            assetUrlCache.set(path, url);
            return url;

        } catch (error) {
            if (error.name === 'NotFoundError') {
                if (typeof window !== 'undefined' && window.logToUIConsole) {
                    window.logToUIConsole({
                        message: `NotFoundError: El asset '${path}' no existe.`,
                        scriptName: null
                    }, 'error', true);
                }
            }
            console.error(`Could not create URL for asset path: ${path}`, error);
            return null;
        } finally {
            // Remove from promise cache once finished (it's now in assetUrlCache or failed)
            assetPromiseCache.delete(path);
        }
    })();

    assetPromiseCache.set(path, loadPromise);
    return loadPromise;
}

async function generateSpritePreview(spriteFile, directoryHandle) {
    return new Promise(async (resolve, reject) => {
        try {
            const content = await spriteFile.text();
            const data = JSON.parse(content);

            const sourceImageName = data.sourceImage;
            const sprites = Object.values(data.sprites);

            if (!sourceImageName || sprites.length === 0) {
                // Resolve with a default icon if data is missing
                resolve('image/Paquete.png'); // A known default image
                return;
            }

            const firstSprite = sprites[0];
            const rect = firstSprite.rect;

            let imageFileHandle;
            try {
                imageFileHandle = await directoryHandle.getFileHandle(sourceImageName);
            } catch (e) {
                console.warn(`[AssetUtils] Source image not found in the same directory as .ceSprite, falling back to Assets root:`, e);
                const rootHandle = projectsDirHandle || window.projectsDirHandle;
                if (rootHandle) {
                    const projectName = new URLSearchParams(window.location.search).get('project');
                    const projectHandle = await rootHandle.getDirectoryHandle(projectName);
                    const assetsDir = await projectHandle.getDirectoryHandle('Assets');
                    imageFileHandle = await assetsDir.getFileHandle(sourceImageName);
                } else {
                    throw e;
                }
            }
            const imageFile = await imageFileHandle.getFile();
            const imageURL = URL.createObjectURL(imageFile);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = rect.width;
                canvas.height = rect.height;
                const ctx = canvas.getContext('2d');

                ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

                URL.revokeObjectURL(imageURL); // Clean up the object URL
                resolve(canvas.toDataURL());
            };
            img.onerror = () => {
                URL.revokeObjectURL(imageURL);
                console.error("Failed to load source image for sprite preview.");
                resolve('image/Paquete.png'); // Fallback on image load error
            };
            img.src = imageURL;

        } catch (error) {
            console.error("Error generating sprite preview:", error);
            resolve('image/Paquete.png'); // Fallback on any error
        }
    });
}

export async function getFileHandleForPath(path, rootDirHandle) {
    if (!rootDirHandle || !path) return null;

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        let projectHandle;

        if (path.startsWith('Extensions/')) {
            try {
                projectHandle = await rootDirHandle.getDirectoryHandle('Extensions', { create: true });
            } catch (e) {
                try {
                    const projH = await rootDirHandle.getDirectoryHandle(projectName);
                    projectHandle = await projH.getDirectoryHandle('Extensions', { create: true });
                } catch(e2) {
                    projectHandle = await rootDirHandle.getDirectoryHandle(projectName);
                }
            }
        } else {
            projectHandle = await rootDirHandle.getDirectoryHandle(projectName);
        }

        let currentHandle = projectHandle;
        const parts = path.split('/').filter(p => p);
        const fileName = parts.pop();

        const startIdx = (path.startsWith('Extensions/') && projectHandle.name === 'Extensions') ? 1 : 0;

        for (let i = startIdx; i < parts.length; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
        }

        const fileHandle = await currentHandle.getFileHandle(fileName);
        return fileHandle;

    } catch (error) {
        if (error.name === 'NotFoundError') {
            console.log(`File handle not found for path: ${path} (normal if extension or asset is not yet downloaded)`);
        } else {
            console.error(`Could not get file handle for path: ${path}`, error);
        }
        return null; // Return null to indicate failure
    }
}
