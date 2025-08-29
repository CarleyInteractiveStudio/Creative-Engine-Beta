export async function getURLForAssetPath(path, projectsDirHandle) {
    if (!projectsDirHandle || !path) return null;
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

        let currentHandle = projectHandle;
        const parts = path.split('/').filter(p => p); // Filter out empty strings from path
        const fileName = parts.pop();

        for (const part of parts) {
            currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        const fileHandle = await currentHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
    } catch (error) {
        console.error(`Could not create URL for asset path: ${path}`, error);
        return null;
    }
}
