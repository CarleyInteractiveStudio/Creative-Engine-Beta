async function generateSpritePreview(spriteFile, projectHandle) {
    try {
        const content = await spriteFile.text();
        const data = JSON.parse(content);

        if (!data.sourceImage || !data.sprites || data.sprites.length === 0) {
            return null;
        }

        const sourcePath = data.sourceImage;
        const firstSpriteRect = data.sprites[0].rect;

        let imageHandle = projectHandle;
        const pathParts = sourcePath.split('/').filter(p => p);
        const imageName = pathParts.pop();

        for (const part of pathParts) {
            imageHandle = await imageHandle.getDirectoryHandle(part);
        }
        imageHandle = await imageHandle.getFileHandle(imageName);

        if (!imageHandle) {
            console.error(`Source image not found for sprite preview: ${sourcePath}`);
            return null;
        }

        const imageFile = await imageHandle.getFile();
        const imageBitmap = await createImageBitmap(imageFile);

        const canvas = document.createElement('canvas');
        canvas.width = firstSpriteRect.width;
        canvas.height = firstSpriteRect.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            imageBitmap,
            firstSpriteRect.x,
            firstSpriteRect.y,
            firstSpriteRect.width,
            firstSpriteRect.height,
            0, 0,
            firstSpriteRect.width,
            firstSpriteRect.height
        );

        return canvas.toDataURL();

    } catch (error) {
        console.error("Error generating sprite preview:", error);
        return null;
    }
}


export async function getURLForAssetPath(path, projectsDirHandle) {
    if (!projectsDirHandle || !path) return null;
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

        let currentHandle = projectHandle;
        const parts = path.split('/').filter(p => p);
        if (parts.length === 0) return null;
        const fileName = parts.pop();
        if (!fileName) return null;

        for (const part of parts) {
            currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        const fileHandle = await currentHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const extension = fileName.split('.').pop().toLowerCase();

        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
             return URL.createObjectURL(file);
        } else if (extension === 'cesprite') {
            return await generateSpritePreview(file, projectHandle);
        }

        // For other types, we don't generate a URL
        return null;

    } catch (error) {
        // This can happen if a file is deleted but the UI hasn't updated, which is normal.
        // console.warn(`Could not create URL for asset path: ${path}`, error);
        return null;
    }
}
