import * as SceneManager from '../../engine/SceneManager.ts';
import { Materia } from '../../engine/Materia.ts';

// Type Definitions
interface DomElements {
    assetGridView: HTMLElement;
    assetFolderTree: HTMLElement;
    contextMenu: HTMLElement;
    currentSceneName: HTMLElement;
}

interface CurrentDirectory {
    handle: FileSystemDirectoryHandle | null;
    path: string;
}

// Callback function types
type SelectMateriaCallback = (materia: Materia | null) => void;
type UpdateInspectorForAssetCallback = (name: string, path: string) => Promise<void>;
type OpenScriptInEditorCallback = (name: string) => Promise<void>;
type OpenAnimationAssetFromModuleCallback = (name: string, handle: FileSystemDirectoryHandle) => Promise<void>;
type OpenAnimatorControllerCallback = (fileHandle: FileSystemFileHandle) => Promise<void>;
type ImportPackageCallback = (fileHandle: FileSystemFileHandle) => Promise<void>;
type ShowContextMenuCallback = (menu: HTMLElement, event: MouseEvent) => void;
type CreateNewScriptCallback = (handle: FileSystemDirectoryHandle) => Promise<void>;
type ExportPackageCallback = (folderName: string) => Promise<void>;
type UpdateHierarchyCallback = () => void;

interface AssetBrowserDependencies {
    dom: DomElements;
    projectsDirHandle: FileSystemDirectoryHandle;
    currentDirectoryHandle: CurrentDirectory;
    selectMateria: SelectMateriaCallback;
    updateInspectorForAsset: UpdateInspectorForAssetCallback;
    openScriptInEditor: OpenScriptInEditorCallback;
    openAnimationAssetFromModule: OpenAnimationAssetFromModuleCallback;
    openAnimatorController: OpenAnimatorControllerCallback;
    importPackage: ImportPackageCallback;
    showContextMenu: ShowContextMenuCallback;
    createNewScript: CreateNewScriptCallback;
    exportPackage: ExportPackageCallback;
    updateHierarchy: UpdateHierarchyCallback;
}

// Module-level variables
let dom: DomElements;
let projectsDirHandle: FileSystemDirectoryHandle | null = null;
let currentDirectoryHandle: CurrentDirectory;
let selectMateriaCallback: SelectMateriaCallback = () => {};
let updateInspectorForAssetCallback: UpdateInspectorForAssetCallback = async () => {};
let openScriptInEditorCallback: OpenScriptInEditorCallback = async () => {};
let openAnimationAssetFromModuleCallback: OpenAnimationAssetFromModuleCallback = async () => {};
let openAnimatorControllerCallback: OpenAnimatorControllerCallback = async () => {};
let importPackageCallback: ImportPackageCallback = async () => {};
let showContextMenuCallback: ShowContextMenuCallback = () => {};
let createNewScriptCallback: CreateNewScriptCallback = async () => {};
let exportPackageCallback: ExportPackageCallback = async () => {};
let updateHierarchyCallback: UpdateHierarchyCallback = () => {};


export function initializeAssetBrowser(dependencies: AssetBrowserDependencies): void {
    dom = dependencies.dom;
    projectsDirHandle = dependencies.projectsDirHandle;
    currentDirectoryHandle = dependencies.currentDirectoryHandle;
    selectMateriaCallback = dependencies.selectMateria;
    updateInspectorForAssetCallback = dependencies.updateInspectorForAsset;
    openScriptInEditorCallback = dependencies.openScriptInEditor;
    openAnimationAssetFromModuleCallback = dependencies.openAnimationAssetFromModule;
    openAnimatorControllerCallback = dependencies.openAnimatorController;
    importPackageCallback = dependencies.importPackage;
    showContextMenuCallback = dependencies.showContextMenu;
    createNewScriptCallback = dependencies.createNewScript;
    exportPackageCallback = dependencies.exportPackage;
    updateHierarchyCallback = dependencies.updateHierarchy;

    const gridView = dom.assetGridView;

    gridView.addEventListener('dragstart', (e: DragEvent) => {
        const item = (e.target as HTMLElement).closest('.grid-item') as HTMLElement;
        if (item) {
            e.dataTransfer!.setData('text/plain', JSON.stringify({
                name: item.dataset.name,
                kind: item.dataset.kind,
                path: item.dataset.path
            }));
            e.dataTransfer!.effectAllowed = 'copy';
        }
    });

    gridView.addEventListener('dblclick', async (e: MouseEvent) => {
        const item = (e.target as HTMLElement).closest('.grid-item') as HTMLElement;
        if (!item) return;

        const name = item.dataset.name!;
        const kind = item.dataset.kind;
        const path = item.dataset.path!;
        const handle = currentDirectoryHandle.handle!;

        if (kind === 'directory') {
            currentDirectoryHandle.handle = await handle.getDirectoryHandle(name);
            currentDirectoryHandle.path = path;
            updateAssetBrowser();
        } else if (name.endsWith('.ces')) {
            await openScriptInEditorCallback(name);
        } else if (name.endsWith('.cea')) {
            await openAnimationAssetFromModuleCallback(name, handle);
        } else if (name.endsWith('.ceanim')) {
            const fileHandle = await handle.getFileHandle(name);
            await openAnimatorControllerCallback(fileHandle);
        } else if (name.endsWith('.ceScene')) {
            const sceneData = await SceneManager.loadScene(name, handle, projectsDirHandle!);
            if (sceneData) {
                SceneManager.setCurrentScene(sceneData.scene);
                SceneManager.setCurrentSceneFileHandle(sceneData.fileHandle);
                dom.currentSceneName.textContent = name.replace('.ceScene', '');
                updateHierarchyCallback();
                selectMateriaCallback(null);
                SceneManager.setSceneDirty(false);
            }
        } else if (name.endsWith('.cep')) {
            const fileHandle = await handle.getFileHandle(name);
            await importPackageCallback(fileHandle);
        } else if (name.endsWith('.cmel')) {
            await updateInspectorForAssetCallback(name, path);
        }
    });

    gridView.addEventListener('click', (e: MouseEvent) => {
        const exportAssetBtn = document.getElementById('menu-export-asset') as HTMLElement;
        const item = (e.target as HTMLElement).closest('.grid-item') as HTMLElement;

        gridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));

        if (item) {
            item.classList.add('active');
            selectMateriaCallback(null);

            if (item.dataset.kind === 'directory') {
                exportAssetBtn.classList.remove('disabled');
            } else {
                exportAssetBtn.classList.add('disabled');
            }
        } else {
             selectMateriaCallback(null);
             exportAssetBtn.classList.add('disabled');
        }
    });

    gridView.addEventListener('contextmenu', async (e: MouseEvent) => {
        e.preventDefault();
        const item = (e.target as HTMLElement).closest('.grid-item') as HTMLElement;
        const exportOption = dom.contextMenu.querySelector('[data-action="export-package"]') as HTMLElement;
        const exportDivider = dom.contextMenu.querySelector('.folder-only-divider') as HTMLElement;

        if (item && item.dataset.kind === 'directory') {
            gridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            await updateInspectorForAssetCallback(item.dataset.name!, item.dataset.path!);
            exportOption.style.display = 'block';
            exportDivider.style.display = 'block';
        } else if (item) {
            gridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            await updateInspectorForAssetCallback(item.dataset.name!, item.dataset.path!);
            exportOption.style.display = 'none';
            exportDivider.style.display = 'none';
        } else {
            exportOption.style.display = 'none';
            exportDivider.style.display = 'none';
        }

        showContextMenuCallback(dom.contextMenu, e);
    });

    dom.contextMenu.addEventListener('click', async (e: MouseEvent) => {
        const action = (e.target as HTMLElement).dataset.action;
        if (!action) return;
        dom.contextMenu.style.display = 'none';

        const selectedAsset = dom.assetGridView.querySelector('.grid-item.active') as HTMLElement;

        if (action === 'create-script') {
            await createNewScriptCallback(currentDirectoryHandle.handle!);
        } else if (action === 'create-folder') {
            const folderName = prompt("New folder name:");
            if (folderName) {
                try {
                    await currentDirectoryHandle.handle!.getDirectoryHandle(folderName, { create: true });
                    await updateAssetBrowser();
                } catch (err) {
                    console.error("Error creating folder:", err);
                    alert("Could not create folder.");
                }
            }
        } else if (action === 'delete') {
            if (selectedAsset) {
                const assetName = selectedAsset.dataset.name!;
                if (confirm(`Are you sure you want to delete '${assetName}'?`)) {
                    try {
                        await currentDirectoryHandle.handle!.removeEntry(assetName, { recursive: true });
                        await updateAssetBrowser();
                    } catch (err) {
                        console.error(`Error deleting '${assetName}':`, err);
                        alert(`Could not delete asset.`);
                    }
                }
            } else {
                alert("Please select an asset to delete.");
            }
        } else if (action === 'export-package') {
             if (selectedAsset && selectedAsset.dataset.kind === 'directory') {
                await exportPackageCallback(selectedAsset.dataset.name!);
             } else {
                alert("Please select a folder to export.");
             }
        }
    });

    console.log("Asset Browser module initialized.");
}

export async function updateAssetBrowser(): Promise<void> {
    if (!projectsDirHandle || !dom.assetFolderTree || !dom.assetGridView) return;

    const folderTreeContainer = dom.assetFolderTree;
    const gridViewContainer = dom.assetGridView as HTMLElement & { directoryHandle?: FileSystemDirectoryHandle };
    folderTreeContainer.innerHTML = '';

    const projectName = new URLSearchParams(window.location.search).get('project')!;
    const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
    const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

    if (!currentDirectoryHandle.handle) {
         currentDirectoryHandle.handle = assetsHandle;
         currentDirectoryHandle.path = 'Assets';
    }

    async function handleDropOnFolder(targetFolderHandle: FileSystemDirectoryHandle, targetPath: string, droppedData: { path: string, name: string, kind: string }): Promise<void> {
        console.log(`Dropped ${droppedData.path} on ${targetPath}`);
        try {
            const sourcePath = droppedData.path;
            const sourceParts = sourcePath.split('/').filter(p => p);
            const sourceFileName = sourceParts.pop()!;

            let sourceDirHandle: FileSystemDirectoryHandle = projectHandle;
            for(const part of sourceParts) {
                if(part) sourceDirHandle = await sourceDirHandle.getDirectoryHandle(part);
            }

            const sourceFileHandle = await sourceDirHandle.getFileHandle(sourceFileName);
            const file = await sourceFileHandle.getFile();

            const newFileHandle = await targetFolderHandle.getFileHandle(sourceFileName, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(file);
            await writable.close();

            await sourceDirHandle.removeEntry(sourceFileName);
            await updateAssetBrowser();

        } catch (error) {
            console.error("Error moving file:", error);
            alert("Could not move file.");
        }
    }

    async function populateGridView(dirHandle: FileSystemDirectoryHandle, dirPath: string): Promise<void> {
        gridViewContainer.innerHTML = '';
        gridViewContainer.directoryHandle = dirHandle;
        gridViewContainer.dataset.path = dirPath;

        const entries: FileSystemHandle[] = [];
        for await (const entry of dirHandle.values()) {
            entries.push(entry);
        }

        if (entries.length === 0) {
            gridViewContainer.innerHTML = '<p class="empty-folder-message">Folder is empty</p>';
            return;
        }

        for (const entry of entries) {
            const item = document.createElement('div');
            item.className = 'grid-item';
            item.draggable = true;
            item.dataset.name = entry.name;
            item.dataset.kind = entry.kind;
            const fullPath = `${dirPath}/${entry.name}`;
            item.dataset.path = fullPath;

            const iconContainer = document.createElement('div');
            iconContainer.className = 'icon';

            const imgIcon = document.createElement('img');
            imgIcon.className = 'icon-preview';

            if (entry.kind === 'directory') {
                const folderHandle = entry as FileSystemDirectoryHandle;
                iconContainer.textContent = '📁';
                let childrenNames: string[] = [];
                for await (const child of folderHandle.values()) {
                    childrenNames.push(child.name);
                }
                if (childrenNames.length > 0) {
                    item.title = `Contents: ${childrenNames.join(', ')}`;
                } else {
                    item.title = "Empty folder";
                }
                item.addEventListener('dragover', (e: DragEvent) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'move'; item.classList.add('drag-over'); });
                item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
                item.addEventListener('drop', async (e: DragEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    item.classList.remove('drag-over');
                    const droppedData = JSON.parse(e.dataTransfer!.getData('text/plain')!);
                    await handleDropOnFolder(folderHandle, fullPath, droppedData);
                });
            } else if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg')) {
                SceneManager.getURLForAssetPath(fullPath, projectsDirHandle!).then(url => {
                    if (url) {
                        imgIcon.src = url;
                        iconContainer.appendChild(imgIcon);
                    } else {
                        iconContainer.textContent = '🖼️';
                    }
                });
            } else if (entry.name.endsWith('.ces')) {
                imgIcon.src = 'image/Script.png';
                iconContainer.appendChild(imgIcon);
            } else if (entry.name.endsWith('.cea')) {
                imgIcon.src = 'image/cea.png';
                iconContainer.appendChild(imgIcon);
            } else if (entry.name.endsWith('.ceanim')) {
                imgIcon.src = 'image/animacion_controler.svg';
                iconContainer.appendChild(imgIcon);
            } else if (entry.name.endsWith('.cep')) {
                imgIcon.src = 'image/Paquete.png';
                iconContainer.appendChild(imgIcon);
            } else if (entry.name.endsWith('.cmel')) {
                iconContainer.textContent = '🎨';
            } else if (entry.name.endsWith('.ceScene')) {
                iconContainer.textContent = '🎬';
            } else {
                iconContainer.textContent = '📄';
            }

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = entry.name;

            item.appendChild(iconContainer);
            item.appendChild(name);
            gridViewContainer.appendChild(item);
        }
    }

    async function populateFolderTree(dirHandle: FileSystemDirectoryHandle, currentPath: string, container: HTMLElement, depth: number = 0): Promise<void> {
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item';
        folderItem.textContent = dirHandle.name;
        folderItem.style.paddingLeft = `${depth * 15 + 5}px`;
        folderItem.dataset.path = currentPath;

        if (currentDirectoryHandle.handle && dirHandle.isSameEntry(currentDirectoryHandle.handle)) {
            folderItem.classList.add('active');
        }

        folderItem.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            currentDirectoryHandle.handle = dirHandle;
            currentDirectoryHandle.path = currentPath;
            updateAssetBrowser();
        });

        folderItem.addEventListener('dragover', (e: DragEvent) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'move'; folderItem.classList.add('drag-over'); });
        folderItem.addEventListener('dragleave', () => folderItem.classList.remove('drag-over'));
        folderItem.addEventListener('drop', async (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            folderItem.classList.remove('drag-over');
            const droppedData = JSON.parse(e.dataTransfer!.getData('text/plain')!);
            await handleDropOnFolder(dirHandle, currentPath, droppedData);
        });

        container.appendChild(folderItem);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'folder-children';
        folderItem.appendChild(childrenContainer);

        try {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    await populateFolderTree(entry as FileSystemDirectoryHandle, `${currentPath}/${entry.name}`, childrenContainer, depth + 1);
                }
            }
        } catch(e) {
            console.warn(`Could not iterate directory ${dirHandle.name}. Permissions issue?`, e);
        }
    }

    try {
        await populateFolderTree(assetsHandle, 'Assets', folderTreeContainer);
        await populateGridView(currentDirectoryHandle.handle!, currentDirectoryHandle.path);
    } catch (error) {
        console.error("Error updating asset browser:", error);
        gridViewContainer.innerHTML = '<p class="error-message">Could not load project assets.</p>';
    }
}
