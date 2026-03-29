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
        assetUrlCache.delete(path);
        // Also remove leading slash variant if it exists, for robustness
        if (path.startsWith('/')) {
            assetUrlCache.delete(path.substring(1));
        } else {
            assetUrlCache.delete('/' + path);
        }
    } else {
        assetUrlCache.clear();
    }
}

export async function getURLForAssetPath(path, projectsDirHandle) {
    if (!path) return null;

    // --- Data, Blob, and HTTP URL Support ---
    if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) {
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
            const projectName = new URLSearchParams(window.location.search).get('project');
            const projectHandle = await effectiveHandle.getDirectoryHandle(projectName);

            let currentHandle = projectHandle;
            const parts = path.split('/').filter(p => p);
            const fileName = parts.pop();

            for (const part of parts) {
                currentHandle = await currentHandle.getDirectoryHandle(part);
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

            const imageFileHandle = await directoryHandle.getFileHandle(sourceImageName);
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
        const projectHandle = await rootDirHandle.getDirectoryHandle(projectName);

        let currentHandle = projectHandle;
        const parts = path.split('/').filter(p => p);
        const fileName = parts.pop();

        for (const part of parts) {
            currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        const fileHandle = await currentHandle.getFileHandle(fileName);
        return fileHandle;

    } catch (error) {
        console.error(`Could not get file handle for path: ${path}`, error);
        return null; // Return null to indicate failure
    }
}
