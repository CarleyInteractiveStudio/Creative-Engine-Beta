document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const welcomeView = document.getElementById('welcome-view');
    const launcherView = document.getElementById('launcher-view');
    const reportModal = document.getElementById('report-modal');
    const supportModal = document.getElementById('support-modal');
    const startButton = document.getElementById('btn-start');
    const licenseButton = document.getElementById('btn-license');
    const reportButton = document.getElementById('btn-report');
    const supportButton = document.getElementById('btn-support');
    const createProjectBtn = document.getElementById('btn-create-project');
    const closeReport = document.getElementById('close-report');
    const closeSupport = document.getElementById('close-support');
    const opinionText = document.getElementById('opinion-text');
    const submitOpinionBtn = document.getElementById('submit-opinion');
    const reportText = document.getElementById('report-text');
    const submitReportBtn = document.getElementById('submit-report');
    const projectList = document.getElementById('project-list');

    // --- IndexedDB Logic ---
    const dbName = 'CreativeEngineDB';
    let db;

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onerror = (event) => reject('Error opening IndexedDB');
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                db.createObjectStore('settings', { keyPath: 'id' });
            };
        });
    }

    function saveDirHandle(handle) {
        if (!db) return;
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        store.put({ id: 'projectsDirHandle', handle: handle });
    }

    function getDirHandle() {
        if (!db) return Promise.resolve(null);
        return new Promise((resolve) => {
            const transaction = db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('projectsDirHandle');
            request.onsuccess = () => {
                resolve(request.result ? request.result.handle : null);
            };
            request.onerror = () => resolve(null);
        });
    }

    // --- Project Loading Logic ---
    async function loadProjects() {
        const dirHandle = await getDirHandle();
        if (!dirHandle) {
            console.log("No stored directory handle found.");
            projectList.innerHTML = '<p class="no-projects-message">Elige una carpeta para tus proyectos al crear el primero.</p>';
            return;
        }

        try {
            if (await dirHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
                if (await dirHandle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                    alert("No se pudo obtener permiso para leer la carpeta de proyectos.");
                    return;
                }
            }

            projectList.innerHTML = ''; // Clear list
            let projectFound = false;
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    projectFound = true;
                    const projectItem = document.createElement('div');
                    projectItem.className = 'project-item';
                    projectItem.textContent = entry.name;
                    projectItem.dataset.projectName = entry.name;
                    projectList.appendChild(projectItem);
                }
            }

            if (!projectFound) {
                projectList.innerHTML = '<p class="no-projects-message">No hay proyectos en esta carpeta. ¡Crea uno!</p>';
            }
        } catch (error) {
            console.error("Error loading projects:", error);
            projectList.innerHTML = '<p class="no-projects-message">Error al cargar los proyectos.</p>';
        }
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', () => {
        welcomeView.style.display = 'none';
        launcherView.style.display = 'block';
        loadProjects(); // Load projects when switching to launcher
    });

    createProjectBtn.addEventListener('click', async () => {
        if (!window.showDirectoryPicker) {
            alert('Tu navegador no es compatible con la API de Acceso al Sistema de Archivos.');
            return;
        }
        const projectName = prompt('Nombre del nuevo proyecto:', 'Mi-Juego');
        if (!projectName) return;

        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'creative-engine-projects' });
            saveDirHandle(dirHandle); // Save handle for future sessions
            await dirHandle.getDirectoryHandle(projectName, { create: true });
            alert(`¡Proyecto "${projectName}" creado con éxito!`);
            loadProjects(); // Refresh the list
        } catch (error) {
            if (error.name !== 'AbortError') console.error('Error:', error);
        }
    });

    // --- Modal Logic ---
    const openModal = (modal) => { if (modal) modal.style.display = 'block'; };
    const closeModal = () => {
        if (reportModal) reportModal.style.display = 'none';
        if (supportModal) supportModal.style.display = 'none';
    };
    reportButton.addEventListener('click', () => openModal(reportModal));
    supportButton.addEventListener('click', () => openModal(supportModal));
    closeReport.addEventListener('click', closeModal);
    closeSupport.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target == reportModal || event.target == supportModal) closeModal();
    });

    // --- Form Submissions & Other Buttons ---
    submitOpinionBtn.addEventListener('click', () => {
        const subject = encodeURIComponent('Opinión sobre Creative Engine');
        const body = encodeURIComponent(opinionText.value);
        if (body) {
            window.location.href = `mailto:empresariacarley16@gmail.com?subject=${subject}&body=${body}`;
            opinionText.value = '';
            closeModal();
        } else {
            alert('Por favor, escribe tu opinión antes de enviar.');
        }
    });
    submitReportBtn.addEventListener('click', () => {
        const subject = encodeURIComponent('Reporte de Error en Creative Engine');
        const body = encodeURIComponent(reportText.value);
        if (body) {
            window.location.href = `mailto:empresariacarley16@gmail.com?subject=${subject}&body=${body}`;
            reportText.value = '';
            closeModal();
        } else {
            alert('Por favor, describe el error antes de enviar.');
        }
    });
    licenseButton.addEventListener('click', () => {
        alert('Creative Engine es un motor gratuito. La información detallada de la licencia se mostrará aquí.');
    });

    // --- Initialize ---
    openDB(); // Open DB on start
    console.log('Creative Engine UI Initialized with Project Loading capability.');
});
