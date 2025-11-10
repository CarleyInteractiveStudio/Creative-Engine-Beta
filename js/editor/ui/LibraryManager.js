let dom = {};
let projectDirectoryHandle = null; // Renamed for clarity and consistency
let isInitialized = false;

async function openPanel() {
    if (!dom.panel) return;
    dom.panel.classList.remove('hidden');
    // Ensure project handle is available
    if (!projectDirectoryHandle) {
        console.error("Project directory handle is not set in LibraryManager.");
        return;
    }
    await updateLibraryList();
}

function closePanel() {
    if (!dom.panel) return;
    dom.panel.classList.add('hidden');
}

function showDetailsView(libraryData) {
    document.getElementById('library-list-view').classList.add('hidden');
    const detailsView = document.getElementById('library-details-view');

    document.getElementById('details-lib-icon').src = libraryData.icon || 'image/Paquete.png';
    document.getElementById('details-lib-name').textContent = libraryData.name;
    document.getElementById('details-author-icon').src = libraryData.author.icon || 'https://via.placeholder.com/32';
    document.getElementById('details-author-name').textContent = libraryData.author.name;
    document.getElementById('details-lib-desc').textContent = libraryData.description;
    document.getElementById('details-lib-usage').textContent = libraryData.usage;

    // Attach event listener for the delete button, removing any old one first
    const deleteBtn = document.getElementById('library-delete-btn');
    const newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
    newDeleteBtn.addEventListener('click', () => deleteLibrary(libraryData));

    detailsView.classList.remove('hidden');
}

function showListView() {
    document.getElementById('library-details-view').classList.add('hidden');
    document.getElementById('library-list-view').classList.remove('hidden');
}

async function updateLibraryList() {
    const listContainer = document.getElementById('library-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '<p style="padding: 10px; color: var(--color-text-secondary);">Cargando librerías...</p>';

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const libDirHandle = await projectHandle.getDirectoryHandle('lib', { create: true });

        const libraries = [];
        for await (const entry of libDirHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.celib')) {
                const file = await entry.getFile();
                const content = await file.text();
                try {
                    const libData = JSON.parse(content);
                    libraries.push(libData);
                } catch (e) {
                    console.warn(`Could not parse library file ${entry.name}:`, e);
                }
            }
        }

        if (libraries.length === 0) {
            listContainer.innerHTML = '<p style="padding: 10px; color: var(--color-text-secondary);">No hay librerías instaladas en este proyecto.</p>';
            return;
        }

        listContainer.innerHTML = ''; // Clear loading message
        libraries.forEach(lib => {
            const item = document.createElement('div');
            item.className = 'library-item';
            item.innerHTML = `
                <img src="${lib.icon || 'image/Paquete.png'}" class="library-icon">
                <span class="library-name">${lib.name}</span>
                <div class="library-item-controls">
                    <button class="details-btn">Detalles</button>
                    <label class="switch"><input type="checkbox"><span class="slider"></span></label>
                </div>
            `;
            item.querySelector('.details-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the main item click event
                showDetailsView(lib);
            });
            listContainer.appendChild(item);
        });

    } catch (error) {
        console.error("Error loading libraries:", error);
        listContainer.innerHTML = '<p style="padding: 10px; color: var(--color-danger-text);">Error al cargar las librerías.</p>';
    }
}

async function deleteLibrary(libraryData) {
    if (!confirm(`¿Estás seguro de que quieres eliminar la librería "${libraryData.name}"? Esta acción no se puede deshacer.`)) {
        return;
    }
    try {
        const libDirHandle = await projectDirectoryHandle.getDirectoryHandle('lib', { create: false });
        // Construct the filename from the library data. Assuming name and version are unique.
        const fileName = `${libraryData.name.replace(/\s+/g, '_')}_v${libraryData.version}.celib`;
        await libDirHandle.removeEntry(fileName);

        await updateLibraryList(); // Refresh list
        showListView(); // Go back to the list view
    } catch (err) {
        console.error('Error deleting library:', err);
        alert('No se pudo eliminar la librería.');
    }
}

export function initialize(editorDom, projDirHandle) {
    if (isInitialized) return;

    dom = {
        panel: document.getElementById('library-panel'),
        openBtn: document.getElementById('menubar-library-btn'),
        closeBtn: document.querySelector('#library-panel .close-panel-btn'),
        importBtn: document.getElementById('library-import-btn'),
        createBtn: document.getElementById('library-create-btn'),
        backBtn: document.getElementById('library-back-btn'),
        deleteBtn: document.getElementById('library-delete-btn'),
        ...editorDom
    };
    projectDirectoryHandle = projDirHandle;

    if (dom.openBtn) dom.openBtn.addEventListener('click', openPanel);
    if (dom.closeBtn) dom.closeBtn.addEventListener('click', closePanel);
    if (dom.backBtn) dom.backBtn.addEventListener('click', showListView);

    if (dom.createBtn) {
        dom.createBtn.addEventListener('click', () => {
             // Assuming a global or imported function to open the wizard
            if (window.LibraryCreator && typeof window.LibraryCreator.openWizard === 'function') {
                window.LibraryCreator.openWizard(projectDirectoryHandle, updateLibraryList);
            } else {
                console.error('Library Creator is not available.');
            }
        });
    }

    if (dom.importBtn) {
        dom.importBtn.addEventListener('click', async () => {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Creative Engine Libraries',
                        accept: { 'application/json': ['.celib'] },
                    }],
                });
                const file = await fileHandle.getFile();
                const libDirHandle = await projectDirectoryHandle.getDirectoryHandle('lib', { create: true });
                const newFileHandle = await libDirHandle.getFileHandle(file.name, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(file);
                await writable.close();

                await updateLibraryList(); // Refresh the list
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error importing library:', err);
                }
            }
        });
    }

    // The delete button is in the details view, its event listener will be attached when the view is shown.
    isInitialized = true;
    console.log("Library Manager Initialized.");
}
