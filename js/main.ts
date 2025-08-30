// --- Type Augmentation for the Window object ---
declare global {
    interface Window {
        showDirectoryPicker: (options?: any) => Promise<FileSystemDirectoryHandle>;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const welcomeView = document.getElementById('welcome-view') as HTMLElement;
    const launcherView = document.getElementById('launcher-view') as HTMLElement;

    // Intro Sequence Elements
    const introStep1 = document.getElementById('intro-step-1') as HTMLElement;
    const introStep2 = document.getElementById('intro-step-2') as HTMLElement;
    const mainContent = document.getElementById('main-content') as HTMLElement;

    // Buttons
    const startButton = document.getElementById('btn-start') as HTMLButtonElement;
    const licenseButton = document.getElementById('btn-license') as HTMLButtonElement;
    const supportButton = document.getElementById('btn-support') as HTMLButtonElement;
    const createProjectBtn = document.getElementById('btn-create-project') as HTMLButtonElement;

    // Modals & Forms
    const supportModal = document.getElementById('support-modal') as HTMLElement;
    const licenseModal = document.getElementById('license-modal') as HTMLElement;
    const createProjectModal = document.getElementById('create-project-modal') as HTMLElement;
    const closeSupport = document.getElementById('close-support') as HTMLElement;
    const closeLicense = document.getElementById('close-license') as HTMLElement;
    const closeCreateProject = document.getElementById('close-create-project') as HTMLElement;
    const contactForm = document.getElementById('contact-form') as HTMLFormElement;
    const createProjectForm = document.getElementById('create-project-form') as HTMLFormElement;

    // Dynamic Content
    const motivationalQuoteEl = document.getElementById('motivational-quote') as HTMLElement;
    const projectList = document.getElementById('project-list') as HTMLElement;

    // --- Motivational Quotes ---
    const quotes: string[] = [
        "Tu juego empieza aquí. Lo que imagines, lo construyes. 🚀🧠",
        "No necesitas experiencia, solo visión. Creative Engine hace el resto. 👁️✨",
        "Cada escena que creas es una ventana a tu mundo. Ábrela. 🖼️🌍",
        "No estás usando un motor. Estás liberando tu potencial creativo. 🔓🎨",
        "¿Tienes una idea? Aquí se convierte en juego. 💡➡️🎮",
        "Diseña sin límites. Crea sin miedo. Publica con orgullo. 🛠️🔥📢",
        "Tu historia merece ser jugada. Creative Engine te da el control. 📖🎮🎛️",
        "No esperes a que alguien más lo haga. Hazlo tú, hoy. ⏳💪",
        "Cada píxel que colocas es una decisión. Cada decisión, una obra. 🧩🖌️",
        "La creatividad no se enseña. Se desbloquea. 🧠🔑",
        "Tus mundos, tus reglas. Creative Engine solo obedece a tu imaginación. 🌌🕹️",
        "No necesitas millones. Solo necesitas comenzar. 💸❌✅",
        "Aquí no hay límites técnicos. Solo los que tú pongas. 🧱🚫",
        "¿Quieres que tu juego se vea como tú lo imaginas? Este es el lugar. 👓🎨",
        "El motor está listo. ¿Y tú? ⚙️👊",
        "No es solo código. Es arte en movimiento. 💻🎭",
        "Tus ideas no son pequeñas. Solo necesitan el entorno correcto para crecer. 🌱🧠",
        "Cada módulo que usas es una herramienta para tu libertad creativa. 🧰🕊️",
        "No estás jugando con herramientas. Estás construyendo experiencias. 🛠️🎬",
        "Creative Engine no te guía. Te sigue. 🧭🤝"
    ];

    function startQuoteCarousel(): void {
        if (!motivationalQuoteEl) return;
        setInterval(() => {
            let newQuote: string = quotes[Math.floor(Math.random() * quotes.length)];
            while (newQuote === motivationalQuoteEl.textContent) {
                newQuote = quotes[Math.floor(Math.random() * quotes.length)];
            }
            motivationalQuoteEl.classList.add('quote-fade-out');
            setTimeout(() => {
                motivationalQuoteEl.textContent = newQuote;
                motivationalQuoteEl.classList.remove('quote-fade-out');
            }, 500);
        }, 20000);
    }

    // --- Intro Animation ---
    function handleIntroAnimation(): void {
        setTimeout(() => { if(introStep1) introStep1.classList.add('visible'); }, 500);
        setTimeout(() => { if(introStep2) introStep2.classList.add('visible'); }, 1500);
        setTimeout(() => {
            if(mainContent) mainContent.classList.add('visible');
            startQuoteCarousel();
        }, 2500);
    }

    // --- IndexedDB Logic ---
    const dbName = 'CreativeEngineDB';
    let db: IDBDatabase;
    function openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onerror = () => reject('Error opening IndexedDB');
            request.onsuccess = (event: Event) => {
                db = (event.target as IDBOpenDBRequest).result;
                resolve(db);
            };
            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;
                db.createObjectStore('settings', { keyPath: 'id' });
            };
        });
    }

    function saveDirHandle(handle: FileSystemDirectoryHandle): void {
        if (!db) return;
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        store.put({ id: 'projectsDirHandle', handle: handle });
    }

    function getDirHandle(): Promise<FileSystemDirectoryHandle | null> {
        if (!db) return Promise.resolve(null);
        return new Promise((resolve) => {
            const transaction = db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('projectsDirHandle');
            request.onsuccess = () => resolve(request.result ? request.result.handle : null);
            request.onerror = () => resolve(null);
        });
    }

    // --- Project Loading Logic ---
    const getProjectTimestamps = (): { [key: string]: number } => {
        try {
            const timestamps = localStorage.getItem('projectTimestamps');
            return timestamps ? JSON.parse(timestamps) : {};
        } catch (e) {
            console.error("Error reading timestamps from localStorage", e);
            return {};
        }
    };

    const saveProjectTimestamp = (projectName: string): void => {
        try {
            const timestamps = getProjectTimestamps();
            timestamps[projectName] = Date.now();
            localStorage.setItem('projectTimestamps', JSON.stringify(timestamps));
        } catch (e) {
            console.error("Error saving timestamp to localStorage", e);
        }
    };

    async function loadProjects(): Promise<void> {
        const dirHandle = await getDirHandle();
        if (!dirHandle) {
            projectList.innerHTML = '<p class="no-projects-message">Elige una carpeta para tus proyectos al crear el primero.</p>';
            return;
        }
        try {
            if (await dirHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
                if (await dirHandle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                    await showCustomAlert("Permisos Requeridos", "No se pudo obtener permiso para leer la carpeta de proyectos. Por favor, concede el permiso para continuar.");
                    return;
                }
            }
            projectList.innerHTML = '';

            const projects: FileSystemDirectoryHandle[] = [];
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    projects.push(entry);
                }
            }

            if (projects.length === 0) {
                projectList.innerHTML = '<p class="no-projects-message">No hay proyectos en esta carpeta. ¡Crea uno!</p>';
                return;
            }

            const timestamps = getProjectTimestamps();
            projects.sort((a, b) => {
                const timeA = timestamps[a.name] || 0;
                const timeB = timestamps[b.name] || 0;
                return timeB - timeA; // Sort descending (newest first)
            });

            projects.forEach(entry => {
                const projectItem = document.createElement('div');
                projectItem.className = 'project-item';
                projectItem.dataset.projectName = entry.name;

                const projectNameEl = document.createElement('h3');
                projectNameEl.textContent = entry.name;

                const openFolderBtn = document.createElement('div');
                openFolderBtn.className = 'open-folder-btn';
                openFolderBtn.textContent = '📁';
                openFolderBtn.title = 'Mostrar nombre de la carpeta del proyecto';

                projectItem.appendChild(projectNameEl);
                projectItem.appendChild(openFolderBtn);
                projectList.appendChild(projectItem);
            });

        } catch (error) {
            console.error("Error loading projects:", error);
            projectList.innerHTML = '<p class="no-projects-message">Error al cargar los proyectos.</p>';
        }
    }

    // --- Modal Logic ---
    const openModal = (modal: HTMLElement | null): void => { if (modal) modal.style.display = 'block'; };
    const closeModal = (): void => {
        if (supportModal) supportModal.style.display = 'none';
        if (licenseModal) licenseModal.style.display = 'none';
        if (createProjectModal) createProjectModal.style.display = 'none';
    };

    if(supportButton) supportButton.addEventListener('click', () => openModal(supportModal));
    if(licenseButton) licenseButton.addEventListener('click', () => openModal(licenseModal));
    if(createProjectBtn) createProjectBtn.addEventListener('click', () => openModal(createProjectModal));

    if(closeSupport) closeSupport.addEventListener('click', closeModal);
    if(closeLicense) closeLicense.addEventListener('click', closeModal);
    if(closeCreateProject) closeCreateProject.addEventListener('click', closeModal);

    window.addEventListener('click', (event: MouseEvent) => {
        if (event.target == supportModal || event.target == licenseModal || event.target == createProjectModal) {
            closeModal();
        }
    });

    // --- Form Submission with Fetch ---
    function handleFormSubmit(form: HTMLFormElement): void {
        form.addEventListener('submit', (e: Event) => {
            e.preventDefault();
            const formData = new FormData(form);
            const button = form.querySelector('button[type="submit"]') as HTMLButtonElement;
            const originalButtonText = button.textContent;
            button.textContent = 'Enviando...';
            button.disabled = true;

            fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            })
            .then(response => {
                if (response.ok) {
                    form.reset();
                    alert('¡Gracias! Tu mensaje ha sido enviado.');
                    closeModal();
                } else {
                    response.json().then(data => {
                        if (Object.hasOwn(data, 'errors')) {
                            alert((data as any).errors.map((error: any) => error.message).join(", "));
                        } else {
                            alert('Hubo un error al enviar el formulario. Revisa la URL de Formspree en el código.');
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Form submission error:', error);
                alert('Hubo un problema de conexión. Por favor, revisa tu conexión a internet.');
            })
            .finally(() => {
                button.textContent = originalButtonText;
                button.disabled = false;
            });
        });
    }

    if(contactForm) handleFormSubmit(contactForm);

    // --- View Switching & Project Creation ---
    if(startButton) startButton.addEventListener('click', async () => {
        if (window.auth) {
            const user = await window.auth.getUser();
            if (user) {
                if(welcomeView) welcomeView.style.display = 'none';
                if(launcherView) launcherView.style.display = 'block';
                loadProjects();
            } else {
                window.auth.openAuthModal();
            }
        } else {
            console.error("Auth script not loaded yet.");
            await showCustomAlert("Sistema Ocupado", "El sistema de autenticación no está listo. Por favor, espera un momento y vuelve a intentarlo.");
        }
    });

    if(createProjectForm) createProjectForm.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        if (!window.showDirectoryPicker) {
            await showCustomAlert('Error de Compatibilidad', 'Tu navegador no es compatible con la API de Acceso al Sistema de Archivos.');
            return;
        }
        const projectNameInput = document.getElementById('project-name') as HTMLInputElement;
        const projectName = projectNameInput.value.trim().replace(/[^a-zA-Z0-9-]/g, '-');

        if (!projectName) {
            await showCustomAlert('Entrada Inválida', 'Por favor, introduce un nombre de proyecto válido.');
            return;
        }

        try {
            let dirHandle = await getDirHandle();
            if (!dirHandle) {
                 dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'creative-engine-projects' });
                 saveDirHandle(dirHandle);
            }

            // Check if the project already exists
            try {
                await dirHandle.getDirectoryHandle(projectName, { create: false });
                await showCustomAlert('Error', `El proyecto "${projectName}" ya existe. Por favor, elige otro nombre.`);
                return;
            } catch (e) {
                // If it errors, it means it doesn't exist, which is good. We continue.
            }

            // Create the project directory and necessary folders
            const projectDirHandle = await dirHandle.getDirectoryHandle(projectName, { create: true });
            const assetsDirHandle = await projectDirHandle.getDirectoryHandle('assets', { create: true });
            const tutorialDirHandle = await assetsDirHandle.getDirectoryHandle('tutorial', { create: true });

            // Create the default scene file
            const sceneFileHandle = await assetsDirHandle.getFileHandle('default.ceScene', { create: true });
            let writable = await sceneFileHandle.createWritable();
            await writable.write(JSON.stringify({ materias: [] }, null, 2));
            await writable.close();

            // Load and write documentation files
            try {
                // Tutorial
                const tutResponse = await fetch('ces-transpiler/template/TUTORIAL.md');
                if (tutResponse.ok) {
                    const tutContent = await tutResponse.text();
                    const tutFileHandle = await tutorialDirHandle.getFileHandle('TUTORIAL.md', { create: true });
                    writable = await tutFileHandle.createWritable();
                    await writable.write(tutContent);
                    await writable.close();
                }

                // Scripting Reference
                const refResponse = await fetch('ces-transpiler/template/Creative Engine Scripting.md');
                if (refResponse.ok) {
                    const refContent = await refResponse.text();
                    const refFileHandle = await tutorialDirHandle.getFileHandle('Creative Engine Scripting.md', { create: true });
                    writable = await refFileHandle.createWritable();
                    await writable.write(refContent);
                    await writable.close();
                }
            } catch (docsError) {
                console.warn("Could not create documentation files:", docsError);
                // We don't show an error to the user for this, it's an extra.
            }

            projectNameInput.value = '';
            closeModal();
            await showCustomAlert('¡Éxito!', `Proyecto "${projectName}" creado con éxito.`);
            loadProjects();

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Error creating project:', error);
                await showCustomAlert('Error', 'Ocurrió un error al crear el proyecto.');
            }
        }
    });

    if(projectList) projectList.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const openFolderBtn = target.closest('.open-folder-btn');
        const projectItem = target.closest('.project-item') as HTMLElement;

        if (openFolderBtn && projectItem) {
            event.stopPropagation(); // Prevent opening the project
            const projectName = projectItem.dataset.projectName;
            alert(`El proyecto se encuentra en la carpeta que seleccionaste, dentro de una subcarpeta llamada:\n\n${projectName}`);
            return;
        }

        if (projectItem) {
            const projectName = projectItem.dataset.projectName;
            if (projectName) {
                saveProjectTimestamp(projectName);
                window.location.href = `editor.html?project=${encodeURIComponent(projectName)}`;
            }
        }
    });

    // --- Context Menu Logic ---
    const contextMenu = document.getElementById('context-menu') as HTMLElement;
    let currentProjectName: string | null = null;

    const hideContextMenu = (): void => {
        if (contextMenu) contextMenu.classList.remove('visible');
        document.querySelectorAll('.project-item.selected').forEach(item => item.classList.remove('selected'));
    };

    projectList.addEventListener('contextmenu', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const projectItem = target.closest('.project-item') as HTMLElement;
        if (!projectItem) {
            hideContextMenu();
            return;
        }
        e.preventDefault();

        hideContextMenu(); // Hide any previous menu
        projectItem.classList.add('selected');

        currentProjectName = projectItem.dataset.projectName || null;

        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.classList.add('visible');
    });

    window.addEventListener('click', (e: MouseEvent) => {
        if (!contextMenu.contains(e.target as Node)) {
            hideContextMenu();
        }
    });

    (document.getElementById('ctx-delete') as HTMLElement).addEventListener('click', async () => {
        hideContextMenu();
        if (!currentProjectName) return;

        const confirmed = await showCustomConfirm(
            'Confirmar Eliminación',
            `¿Estás seguro de que quieres eliminar el proyecto "${currentProjectName}"? Esta acción no se puede deshacer.`
        );

        if (confirmed) {
            try {
                const dirHandle = await getDirHandle();
                if (dirHandle) {
                    await dirHandle.removeEntry(currentProjectName, { recursive: true });
                    await showCustomAlert('Éxito', `Proyecto "${currentProjectName}" eliminado.`);
                    loadProjects();
                }
            } catch (err) {
                console.error('Error deleting project:', err);
                await showCustomAlert('Error', 'No se pudo eliminar el proyecto.');
            }
        }
    });

    (document.getElementById('ctx-rename') as HTMLElement).addEventListener('click', async () => {
        hideContextMenu();
        if (!currentProjectName) return;

        // The prompt is kept for now as creating a custom prompt modal is a larger task.
        const newName = prompt(`Renombrar proyecto "${currentProjectName}":`, currentProjectName);
        if (newName && newName !== currentProjectName) {
            await showCustomAlert("Función no Disponible", "La funcionalidad de renombrar es compleja y se implementará en una futura actualización. Por ahora, para renombrar, cree un nuevo proyecto y copie los archivos manualmente.");
            // TODO: Implement the complex rename logic (copy to new, delete old)
        }
    });


    // --- Music Logic ---
    const music = document.getElementById('background-music') as HTMLAudioElement;
    const muteBtn = document.getElementById('btn-mute-music') as HTMLButtonElement;
    let musicStarted = false;

    function toggleMusic(): void {
        music.muted = !music.muted;
        muteBtn.textContent = music.muted ? '🔇' : '🔊';
        localStorage.setItem('musicMuted', String(music.muted));
    }

    function startMusic(): void {
        if (musicStarted) return;
        music.play().then(() => {
            musicStarted = true;
            // Remove this listener so it only runs once
            document.body.removeEventListener('click', startMusic);
        }).catch(error => {
            console.log("La música no pudo iniciarse automáticamente, se requiere interacción del usuario.", error);
        });
    }

    if (muteBtn) {
        // Restore mute state from previous session
        if (localStorage.getItem('musicMuted') === 'true') {
            music.muted = true;
            muteBtn.textContent = '🔇';
        }
        muteBtn.addEventListener('click', toggleMusic);
    }

    document.body.addEventListener('click', startMusic, { once: true });


    // --- Custom Dialog Logic ---
    const dialogModal = document.getElementById('custom-dialog-modal') as HTMLElement;
    const dialogTitle = document.getElementById('custom-dialog-title') as HTMLElement;
    const dialogMessage = document.getElementById('custom-dialog-message') as HTMLElement;
    const dialogButtons = document.getElementById('custom-dialog-buttons') as HTMLElement;

    function showCustomAlert(title: string, message: string): Promise<void> {
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        dialogButtons.innerHTML = '<button class="btn-primary">Aceptar</button>';

        dialogModal.classList.add('is-open');

        return new Promise(resolve => {
            (dialogButtons.querySelector('button') as HTMLButtonElement).addEventListener('click', () => {
                dialogModal.classList.remove('is-open');
                resolve();
            }, { once: true });
        });
    }

    function showCustomConfirm(title: string, message: string): Promise<boolean> {
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        dialogButtons.innerHTML = `
            <button class="btn-secondary">Cancelar</button>
            <button class="btn-primary">Aceptar</button>
        `;

        dialogModal.classList.add('is-open');

        return new Promise((resolve) => {
            (dialogButtons.querySelector('.btn-primary') as HTMLButtonElement).addEventListener('click', () => {
                dialogModal.classList.remove('is-open');
                resolve(true);
            }, { once: true });

            (dialogButtons.querySelector('.btn-secondary') as HTMLButtonElement).addEventListener('click', () => {
                dialogModal.classList.remove('is-open');
                resolve(false); // Resolve with false for "Cancel"
            }, { once: true });
        });
    }


    // --- Initialize ---
    openDB();
    handleIntroAnimation();
    console.log('Creative Engine UI Initialized.');
});
