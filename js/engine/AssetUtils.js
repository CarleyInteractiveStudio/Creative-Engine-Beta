export async function getURLForAssetPath(path, projectsDirHandle) {
    // If no path is provided, there's nothing to do.
    if (!path) return null;

    // --- Fallback for Test Environment or missing handle ---
    // If we don't have the directory handle, assume the path is a valid relative URL.
    // This allows tests (which run from a local server) to load assets directly.
    if (!projectsDirHandle) {
        return path;
    }

    // --- Standard Logic using File System Access API ---
    try {
        const projectName = new URLSearchParams(window.location.search).get('project') || 'TestProject'; // Default for safety
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

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
            return await generateSpritePreview(file, currentHandle);
        }

        if (fileName.toLowerCase().endsWith('.celib')) {
            const content = await file.text();
            const libData = JSON.parse(content);
            if (libData.icon_base64) {
                return `data:image/png;base64,${libData.icon_base64}`;
            }
        }

        // --- Default Logic ---
        // For images or other files that can be displayed directly.
        return URL.createObjectURL(file);

    } catch (error) {
        console.error(`Could not create URL for asset path: ${path}`, error);
        return null; // Return null to indicate failure
    }
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
