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
                    projectItem.dataset.projectName = entry.name;

                    const projectNameEl = document.createElement('h3');
                    projectNameEl.textContent = entry.name;
                    projectItem.appendChild(projectNameEl);

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
        loadProjects();
    });

    createProjectBtn.addEventListener('click', async () => {
        if (!window.showDirectoryPicker) {
            alert('Tu navegador no es compatible con la API de Acceso al Sistema de Archivos.');
            return;
        }
        const projectName = prompt('Nombre del nuevo proyecto:', 'Mi-Juego');
        if (!projectName) return;

        try {
            let dirHandle = await getDirHandle();
            if (!dirHandle) {
                 dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'creative-engine-projects' });
                 saveDirHandle(dirHandle);
            }

            const projectDirHandle = await dirHandle.getDirectoryHandle(projectName, { create: true });

            // Create default Assets folder and README files
            const assetsDirHandle = await projectDirHandle.getDirectoryHandle('Assets', { create: true });

            const readmeMotorContent = `# ¡Bienvenido a Creative Engine!

Este es tu nuevo proyecto. ¡Estamos emocionados de ver lo que crearás!

## Estructura del Proyecto

- **Carpeta \`Assets\`**: Este es el corazón de tu proyecto. Todos los recursos que uses (imágenes, scripts, sonidos, etc.) deben ir aquí. El motor buscará automáticamente los assets en esta carpeta.

## Uso Básico

1.  **Crea Assets**: Usa el menú contextual (clic derecho) en el Navegador de Assets para crear nuevos scripts, carpetas y más.
2.  **Crea Materias**: Usa el menú contextual en la Jerarquía para crear \`Materias\` (GameObjects). Son los objetos que poblarán tu escena.
3.  **Añade Leyes**: Con una \`Materia\` seleccionada, ve al Inspector y haz clic en "Añadir Ley" (Componente) para darle funcionalidades como un sprite, físicas o un script.

¡Diviértete creando!

*Este motor fue creado con la ayuda de Google Jules y Carley Interactive Studio.*`;

            const readmeCesContent = `# Creative Scripting (CES) - Guía de Inicio Rápido

Creative Scripting (o \`.ces\`) es el lenguaje que da vida a tus \`Materias\`. Es muy similar a JavaScript, pero se ejecuta dentro del motor.

## Funciones Principales

Cada script \`.ces\` puede tener dos funciones especiales que el motor llamará automáticamente:

### \`start()\`

Esta función se llama **una sola vez** cuando la escena comienza (justo antes del primer fotograma). Es el lugar perfecto para inicializar variables o configurar el estado inicial de tu Materia.

**Ejemplo:**
\`\`\`javascript
function start() {
    // Imprime un mensaje en la consola del editor
    console.log("¡La Materia ha comenzado a existir!");
}
\`\`\`

### \`update(deltaTime)\`

Esta función se llama **en cada fotograma** del juego. Es donde va toda la lógica que se ejecuta continuamente, como el movimiento, la comprobación de input o cualquier cosa que deba ocurrir con el tiempo.

- \`deltaTime\`: Es un parámetro muy importante. Representa el tiempo (en segundos) que ha pasado desde el último fotograma. Usarlo para el movimiento asegura que tu juego corra a la misma velocidad en ordenadores rápidos y lentos.

**Ejemplo:**
\`\`\`javascript
function update(deltaTime) {
    // Esta función se llamará constantemente
}
\`\`\`

---

¡Eso es todo lo que necesitas para empezar! Experimenta creando un script, añadiéndolo a una Materia y viendo cómo \`console.log\` imprime mensajes en la consola del editor.`;

            const motorReadmeHandle = await assetsDirHandle.getFileHandle('LEAME-SOBRE-EL-MOTOR.md', { create: true });
            const motorReadmeWritable = await motorReadmeHandle.createWritable();
            await motorReadmeWritable.write(readmeMotorContent);
            await motorReadmeWritable.close();

            const cesReadmeHandle = await assetsDirHandle.getFileHandle('LEAME-APRENDE-CES.md', { create: true });
            const cesReadmeWritable = await cesReadmeHandle.createWritable();
            await cesReadmeWritable.write(readmeCesContent);
            await cesReadmeWritable.close();


            alert(`¡Proyecto "${projectName}" creado con éxito con la estructura de carpetas por defecto!`);
            loadProjects();
        } catch (error) {
            if (error.name !== 'AbortError') console.error('Error:', error);
        }
    });

    projectList.addEventListener('click', (event) => {
        const projectItem = event.target.closest('.project-item');
        if (projectItem) {
            const projectName = projectItem.dataset.projectName;
            if (projectName) {
                window.location.href = `editor.html?project=${encodeURIComponent(projectName)}`;
            }
        }
    });

    // --- Modal Logic & Other Buttons ---
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
    openDB();
    console.log('Creative Engine UI Initialized with Full Launcher capability.');
});
