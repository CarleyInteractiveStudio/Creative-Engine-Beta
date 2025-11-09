// js/editor/ui/LibraryManager.js

let dom;
let projectsDirHandle;
let libDirHandle;
let currentLibraries = []; // Cache for loaded library data

export function initialize(dependencies) {
    dom = dependencies.dom;
    projectsDirHandle = dependencies.projectsDirHandle;

    console.log("Library Manager Initialized");
    setupEventListeners();
}

async function getLibDirHandle() {
    if (libDirHandle) return libDirHandle;
    if (!projectsDirHandle) return null;
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        libDirHandle = await projectHandle.getDirectoryHandle('lib');
        return libDirHandle;
    } catch (error) {
        console.error("Could not get 'lib' directory handle:", error);
        return null;
    }
}

export async function loadLibraries() {
    const dirHandle = await getLibDirHandle();
    if (!dirHandle) {
        console.warn("Library directory not found.");
        currentLibraries = [];
        renderLibraryList();
        return;
    }

    const libraries = [];
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.celib')) {
            try {
                const file = await entry.getFile();
                const content = await file.text();
                const libData = JSON.parse(content);
                libData.id = entry.name; // Use filename as a unique ID
                libraries.push(libData);
            } catch (error) {
                console.error(`Error parsing library file ${entry.name}:`, error);
            }
        }
    }
    currentLibraries = libraries;
    renderLibraryList();
}

function renderLibraryList() {
    if (!dom.libraryListContainer) return;
    dom.libraryListContainer.innerHTML = ''; // Clear current list

    if (currentLibraries.length === 0) {
        dom.libraryListContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: 20px;">No hay librerías instaladas. Importa una para empezar.</p>';
        return;
    }

    currentLibraries.forEach(lib => {
        const item = document.createElement('div');
        item.className = 'library-item';
        item.dataset.libId = lib.id;

        let iconSrc = 'image/Paquete.png'; // Default icon
        if (lib.icon && lib.icon.startsWith('http')) {
            iconSrc = lib.icon;
        }

        item.innerHTML = `
            <img src="${iconSrc}" class="library-icon">
            <span class="library-name">${lib.name || 'Librería sin nombre'}</span>
            <div class="library-item-controls">
                <label class="switch" title="Activar/Desactivar (no implementado)">
                    <input type="checkbox" ${lib.enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                showLibraryDetails(lib.id);
            }
        });
        dom.libraryListContainer.appendChild(item);
    });
}

function showLibraryDetails(libraryId) {
    const lib = currentLibraries.find(l => l.id === libraryId);
    if (!lib) return;

    dom.detailsLibName.textContent = lib.name || 'N/A';
    dom.detailsAuthorName.textContent = lib.author?.name || 'Anónimo';
    dom.detailsLibDesc.textContent = lib.description || 'Sin descripción.';

    if (lib.documentation?.usage) {
        dom.detailsLibUsage.textContent = lib.documentation.usage;
    } else {
        dom.detailsLibUsage.textContent = 'No hay documentación de uso disponible.';
    }

    let iconSrc = 'image/Paquete.png';
    if (lib.icon && lib.icon.startsWith('http')) iconSrc = lib.icon;
    dom.detailsLibIcon.src = iconSrc;

    let authorIconSrc = 'https://via.placeholder.com/32';
    if (lib.author?.icon && lib.author.icon.startsWith('http')) {
        authorIconSrc = lib.author.icon;
    }
    dom.detailsAuthorIcon.src = authorIconSrc;

    dom.libraryDeleteBtn.dataset.libId = libraryId;

    dom.libraryListView.classList.add('hidden');
    dom.libraryDetailsView.classList.remove('hidden');
}

function showListView() {
    dom.libraryDetailsView.classList.add('hidden');
    dom.libraryListView.classList.remove('hidden');
}

async function importLibrary() {
    try {
        const fileHandles = await window.showOpenFilePicker({
            types: [{
                description: 'Creative Engine Libraries',
                accept: { 'application/json': ['.celib'] },
            }],
            multiple: true,
        });

        const dirHandle = await getLibDirHandle();
        if (!dirHandle) {
            alert("No se pudo acceder al directorio de librerías. La importación ha fallado.");
            return;
        }

        for (const fileHandle of fileHandles) {
            const file = await fileHandle.getFile();
            const newFileHandle = await dirHandle.getFileHandle(file.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(file);
            await writable.close();
            console.log(`Librería '${file.name}' importada correctamente.`);
        }

        await loadLibraries();

    } catch (err) {
        if (err.name === 'AbortError') {
            console.log("El usuario canceló la selección de archivos.");
        } else {
            console.error("Error al importar la librería:", err);
            alert("Ocurrió un error durante la importación. Revisa la consola para más detalles.");
        }
    }
}

async function deleteLibrary(event) {
    const libId = event.target.dataset.libId;
    if (!libId) return;

    const confirmed = confirm(`¿Estás seguro de que quieres eliminar la librería '${libId}'? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    try {
        const dirHandle = await getLibDirHandle();
        if (!dirHandle) {
            alert("No se pudo acceder al directorio de librerías. La eliminación ha fallado.");
            return;
        }
        await dirHandle.removeEntry(libId);
        console.log(`Librería '${libId}' eliminada.`);

        showListView();
        await loadLibraries();

    } catch (error) {
        console.error(`Error al eliminar la librería '${libId}':`, error);
        alert("Ocurrió un error durante la eliminación.");
    }
}

function setupEventListeners() {
    if(dom.libraryBackBtn) {
        dom.libraryBackBtn.addEventListener('click', showListView);
    }
    if(dom.libraryImportBtn) {
        dom.libraryImportBtn.addEventListener('click', importLibrary);
    }
    if(dom.libraryDeleteBtn) {
        dom.libraryDeleteBtn.addEventListener('click', deleteLibrary);
    }
}
