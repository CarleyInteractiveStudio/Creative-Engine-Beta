let dom = {};
let projectsDirHandle = null;
let isInitialized = false;

function openPanel() {
    if (!dom.panel) return;
    dom.panel.classList.remove('hidden');
    // Potentially refresh the list of libraries when opening
    updateLibraryList();
}

function closePanel() {
    if (!dom.panel) return;
    dom.panel.classList.add('hidden');
}

async function updateLibraryList() {
    // This function will eventually scan the 'lib' folder and display the libraries.
    // For now, it can be a placeholder.
    const listContainer = document.getElementById('library-list-container');
    if (listContainer) {
        listContainer.innerHTML = '<p style="padding: 10px; color: var(--color-text-secondary);">El listado de librerías se implementará próximamente.</p>';
    }
}

export function initialize(editorDom, projDirHandle) {
    if (isInitialized) return;

    dom = {
        panel: document.getElementById('library-panel'),
        openBtn: document.getElementById('menubar-library-btn'),
        closeBtn: document.querySelector('#library-panel .close-panel-btn'),
        ...editorDom
    };
    projectsDirHandle = projDirHandle;

    if (dom.openBtn) {
        dom.openBtn.addEventListener('click', openPanel);
    }
    if (dom.closeBtn) {
        dom.closeBtn.addEventListener('click', closePanel);
    }

    // Expose a global updater function so other modules can trigger a refresh
    window.updateLibraryManager = updateLibraryList;

    isInitialized = true;
    console.log("Library Manager Initialized.");
}
