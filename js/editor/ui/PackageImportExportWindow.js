// Contains all logic for the Package Import/Export modals and functionality
import { showNotification, showPrompt } from './DialogWindow.js';

let dom;
let exportContext; // This will be passed from editor.js
let exportFileHandleMap = new Map();
let getCurrentDirectoryHandle;
let updateAssetBrowser;
let projectsDirHandle;

function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function populateFileTree(container, dirHandle, pathPrefix = '') {
    exportFileHandleMap.clear(); // Clear the map before populating

    async function buildTree(currentDir, prefix) {
        for await (const entry of currentDir.values()) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'file-tree-item';
            itemDiv.style.paddingLeft = `${prefix.split('/').filter(p=>p).length * 20}px`;
            const currentPath = `${prefix}${entry.name}`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.dataset.path = currentPath;
            exportFileHandleMap.set(currentPath, entry); // Store handle in map

            const label = document.createElement('label');
            label.textContent = ` ${entry.kind === 'directory' ? '📁' : '📄'} ${entry.name}`;

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            container.appendChild(itemDiv);

            if (entry.kind === 'directory') {
                await buildTree(entry, `${currentPath}/`);
            }
        }
    }

    await buildTree(dirHandle, pathPrefix);
}

async function exportPackage(filesToExport, manifest) {
    if (!filesToExport || filesToExport.length === 0) {
        showNotification('Error', 'No se seleccionaron archivos para exportar.');
        return;
    }
    console.log(`Exportando paquete con ${filesToExport.length} entradas.`);
    try {
        const zip = new JSZip();
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));

        for (const fileInfo of filesToExport) {
            if (fileInfo.handle.kind === 'file') {
                const file = await fileInfo.handle.getFile();
                zip.file(fileInfo.path, file);
            }
        }

        const content = await zip.generateAsync({type: 'blob'});
        downloadBlob(content, exportContext.fileName);
        console.log("Paquete exportado con éxito.");
        dom.packageFileTreeModal.classList.remove('is-open');

    } catch(error) {
        console.error(`Error al exportar el paquete:`, error);
        showNotification('Error', 'No se pudo exportar el paquete.');
    }
};

async function confirmImport(zip, dirHandle) {
    const checkedItems = dom.packageFileTreeContainer.querySelectorAll('input[type=checkbox]:checked');
    console.log(`Importando ${checkedItems.length} archivos...`);

    try {
        for (const item of checkedItems) {
            const path = item.dataset.path;
            const zipEntry = zip.file(path);

            if (zipEntry && !zipEntry.dir) {
                const pathParts = path.split('/').filter(p => p);
                const fileName = pathParts.pop();

                let currentDirHandle = dirHandle; // Start from the provided asset folder

                // Create directories if they don't exist
                for (const part of pathParts) {
                    currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true });
                }

                const newFileHandle = await currentDirHandle.getFileHandle(fileName, { create: true });
                const content = await zipEntry.async('blob');
                const writable = await newFileHandle.createWritable();
                await writable.write(content);
                await writable.close();
            }
        }
        showNotification('Éxito', '¡Importación completada con éxito!');
        dom.packageFileTreeModal.classList.remove('is-open');
        await updateAssetBrowser();

    } catch (error) {
        console.error("Error durante la importación de archivos:", error);
        showNotification('Error', 'Ocurrió un error al importar los archivos. Revisa la consola.');
    }
}

async function handleImport() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: 'Creative Engine Package', accept: { 'application/zip': ['.cep'] } }],
            multiple: false
        });

        const file = await fileHandle.getFile();
        const zip = await JSZip.loadAsync(file);
        const manifestFile = zip.file('manifest.json');

        if (!manifestFile) {
            showNotification('Paquete Inválido', 'Este no es un paquete válido. Falta el archivo manifest.json.');
            return;
        }

        const manifestContent = await manifestFile.async('string');
        const manifest = JSON.parse(manifestContent);

        // Configure and show the package modal for IMPORT
        dom.packageModalTitle.textContent = 'Importar Paquete';
        dom.packageModalDescription.innerHTML = `<p><b>Descripción:</b> ${manifest.description || 'N/A'}</p>`;
        dom.packageExportControls.style.display = 'none';
        dom.packageImportControls.style.display = 'flex';

        // Populate file tree from manifest
        const container = dom.packageFileTreeContainer;
        container.innerHTML = '';
        manifest.fileList.forEach(path => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'file-tree-item';
            const depth = path.split('/').length - 1;
            itemDiv.style.paddingLeft = `${depth * 20}px`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.dataset.path = path;

            const label = document.createElement('label');
            label.textContent = ` ${path.endsWith('/') ? '📁' : '📄'} ${path.split('/').pop() || path}`;

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            container.appendChild(itemDiv);
        });

        dom.packageFileTreeModal.classList.add('is-open');

        // Store context for the import confirmation button
        dom.importConfirmBtn.onclick = async () => {
            const dirHandle = getCurrentDirectoryHandle();
            await confirmImport(zip, dirHandle);
        };

    } catch(err) {
        console.log("Importación cancelada o fallida:", err);
    }
}

function onExportPackage(assetName) {
    exportContext.type = 'asset';
    exportContext.assetName = assetName;
    dom.exportDescriptionText.value = '';
    dom.exportDescriptionModal.classList.add('is-open');
}

function setupEventListeners() {
    document.getElementById('menu-import-asset').addEventListener('click', () => handleImport());
    document.getElementById('menu-import-project').addEventListener('click', () => handleImport());

    document.getElementById('menu-export-project').addEventListener('click', () => {
        exportContext.type = 'project';
        dom.exportDescriptionText.value = '';
        dom.exportDescriptionModal.classList.add('is-open');
    });

    document.getElementById('menu-export-asset').addEventListener('click', async () => {
        const selectedAsset = dom.assetGridView.querySelector('.grid-item.active');
        if (!selectedAsset || selectedAsset.dataset.kind !== 'directory') {
            showNotification('Error', 'Por favor, selecciona una carpeta en el Navegador de Assets para exportar.');
            return;
        }
        onExportPackage(selectedAsset.dataset.name);
    });

    dom.exportDescriptionNextBtn.addEventListener('click', async () => {
        exportContext.description = dom.exportDescriptionText.value;
        dom.exportDescriptionModal.classList.remove('is-open');

        dom.packageModalTitle.textContent = 'Seleccionar Archivos para Exportar';
        dom.packageModalDescription.innerHTML = '';
        dom.packageImportControls.style.display = 'none';
        dom.packageExportControls.style.display = 'flex';
        dom.packageFileTreeContainer.innerHTML = 'Cargando archivos...';
        dom.packageFileTreeModal.classList.add('is-open');

        try {
            let root;
            let defaultFilename;
            let pathPrefix = '';
            const projectName = new URLSearchParams(window.location.search).get('project');

            if (exportContext.type === 'project') {
                root = await projectsDirHandle.getDirectoryHandle(projectName);
                defaultFilename = `${projectName}.cep`;
            } else { // asset
                const dirHandle = getCurrentDirectoryHandle();
                root = await dirHandle.getDirectoryHandle(exportContext.assetName);
                defaultFilename = `${exportContext.assetName}.cep`;
                pathPrefix = `${exportContext.assetName}/`;
            }
            exportContext.rootHandle = root;
            dom.exportFilename.value = defaultFilename;
            dom.packageFileTreeContainer.innerHTML = '';
            await populateFileTree(dom.packageFileTreeContainer, root, pathPrefix);

        } catch (error) {
            console.error("Error detallado al poblar el árbol de archivos:", error);
            dom.packageFileTreeContainer.innerHTML = `<p class="error-message">No se pudieron cargar los archivos. Revisa la consola.</p>`;
        }
    });

    dom.exportConfirmBtn.addEventListener('click', async () => {
        const defaultFilename = dom.exportFilename.value || 'package.cep';

        showPrompt(
            'Exportar Paquete',
            'Introduce el nombre del archivo para el paquete:',
            async (fileName) => {
                if (!fileName || !fileName.endsWith('.cep')) {
                    fileName = `${fileName.split('.')[0]}.cep`;
                }

                const filesToExport = [];
                const checkboxes = dom.packageFileTreeContainer.querySelectorAll('input[type=checkbox]:checked');
                checkboxes.forEach(cb => {
                    const path = cb.dataset.path;
                    const handle = exportFileHandleMap.get(path);
                    if (handle) {
                        filesToExport.push({ path: path, handle: handle });
                    }
                });

                const manifest = {
                    type: exportContext.type,
                    description: exportContext.description,
                    fileList: filesToExport.map(f => f.path)
                };
                exportContext.fileName = fileName;

                await exportPackage(filesToExport, manifest);
            },
            defaultFilename
        );
    });
}

async function exportLibrariesAsPackage(libraryNames) {
    if (!libraryNames || libraryNames.length === 0) {
        showNotification('Error', 'No se seleccionaron librerías para exportar.');
        return;
    }

    try {
        const zip = new JSZip();
        const manifest = {
            type: 'library_package',
            description: 'Paquete de librerías de Creative Engine.',
            fileList: []
        };

        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const libDirHandle = await projectHandle.getDirectoryHandle('lib');

        for (const libName of libraryNames) {
            // Add .celib file
            const celibHandle = await libDirHandle.getFileHandle(libName);
            const celibFile = await celibHandle.getFile();
            zip.file(libName, celibFile);
            manifest.fileList.push(libName);

            // Add .celib.meta file if it exists
            const metaName = `${libName}.meta`;
            try {
                const metaHandle = await libDirHandle.getFileHandle(metaName);
                const metaFile = await metaHandle.getFile();
                zip.file(metaName, metaFile);
                manifest.fileList.push(metaName);
            } catch (e) {
                // Meta file doesn't exist, which is fine.
            }
        }

        zip.file('manifest.json', JSON.stringify(manifest, null, 2));

        const content = await zip.generateAsync({ type: 'blob' });
        const defaultFilename = `librerias_${new Date().toISOString().slice(0, 10)}.cep`;
        downloadBlob(content, defaultFilename);
        console.log("Paquete de librerías exportado con éxito.");

    } catch (error) {
        console.error(`Error al exportar el paquete de librerías:`, error);
        showNotification('Error', 'No se pudo exportar el paquete de librerías.');
    }
}

export function initialize(dependencies) {
    dom = dependencies.dom;
    exportContext = dependencies.exportContext;
    getCurrentDirectoryHandle = dependencies.getCurrentDirectoryHandle;
    updateAssetBrowser = dependencies.updateAssetBrowser;
    projectsDirHandle = dependencies.projectsDirHandle;

    setupEventListeners();

    // Return any functions that need to be accessed by other modules
    return {
        exportLibrariesAsPackage
    };
}
