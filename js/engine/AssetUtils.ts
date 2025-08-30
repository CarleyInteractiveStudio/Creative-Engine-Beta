export async function getURLForAssetPath(path: string, projectsDirHandle: FileSystemDirectoryHandle): Promise<string | null> {
    if (!projectsDirHandle || !path) return null;
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        if (!projectName) {
            console.error("Project name not found in URL.");
            return null;
        }
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

        let currentHandle: FileSystemDirectoryHandle = projectHandle;
        const parts = path.split('/').filter(p => p);
        const fileName = parts.pop();

        if (!fileName) {
            console.error("Invalid asset path, no file name found.");
            return null;
        }

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
