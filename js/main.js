document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const welcomeView = document.getElementById('welcome-view');
    const launcherView = document.getElementById('launcher-view');

    // Intro Sequence Elements
    const introStep1 = document.getElementById('intro-step-1');
    const introStep2 = document.getElementById('intro-step-2');
    const introStep3 = document.getElementById('intro-step-3');
    const mainContent = document.getElementById('main-content');

    // Buttons
    const startButton = document.getElementById('btn-start');
    console.log("Attempting to find #btn-start. Found element:", startButton); // Debugging line
    const licenseButton = document.getElementById('btn-license');
    const supportButton = document.getElementById('btn-support');
    const createProjectBtn = document.getElementById('btn-create-project');

    // Modals & Forms
    const supportModal = document.getElementById('support-modal');
    const licenseModal = document.getElementById('license-modal');
    const createProjectModal = document.getElementById('create-project-modal');
    const closeSupport = document.getElementById('close-support');
    const closeLicense = document.getElementById('close-license');
    const closeCreateProject = document.getElementById('close-create-project');
    const contactForm = document.getElementById('contact-form');
    const createProjectForm = document.getElementById('create-project-form');

    // Dynamic Content
    const motivationalQuoteEl = document.getElementById('motivational-quote');
    const projectList = document.getElementById('project-list');

    // --- Motivational Quotes ---
    const quotes = [
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

    function startQuoteCarousel() {
        if (!motivationalQuoteEl) return;
        setInterval(() => {
            let newQuote = quotes[Math.floor(Math.random() * quotes.length)];
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
    function handleIntroAnimation() {
        setTimeout(() => { if(introStep1) introStep1.classList.add('visible'); }, 500);
        setTimeout(() => { if(introStep2) introStep2.classList.add('visible'); }, 1500);
        setTimeout(() => { if(introStep3) introStep3.classList.add('visible'); }, 2500);
        setTimeout(() => {
            if(mainContent) mainContent.classList.add('visible');
            startQuoteCarousel();
        }, 3500);
    }

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
            request.onsuccess = () => resolve(request.result ? request.result.handle : null);
            request.onerror = () => resolve(null);
        });
    }

    // --- Project Loading Logic ---
    const getProjectTimestamps = () => {
        try {
            const timestamps = localStorage.getItem('projectTimestamps');
            return timestamps ? JSON.parse(timestamps) : {};
        } catch (e) {
            console.error("Error reading timestamps from localStorage", e);
            return {};
        }
    };

    const saveProjectTimestamp = (projectName) => {
        try {
            const timestamps = getProjectTimestamps();
            timestamps[projectName] = Date.now();
            localStorage.setItem('projectTimestamps', JSON.stringify(timestamps));
        } catch (e) {
            console.error("Error saving timestamp to localStorage", e);
        }
    };

    async function loadProjects() {
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

            const projects = [];
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
    const openModal = (modal) => { if (modal) modal.style.display = 'block'; };
    const closeModal = () => {
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

    window.addEventListener('click', (event) => {
        if (event.target == supportModal || event.target == licenseModal || event.target == createProjectModal) {
            closeModal();
        }
    });

    // --- Form Submission with Fetch ---
    function handleFormSubmit(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const button = form.querySelector('button[type="submit"]');
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
                            alert(data["errors"].map(error => error["message"]).join(", "));
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
    if (startButton) {
        startButton.addEventListener('click', async () => {
            console.log("Start button clicked.");
            try {
                if (window.auth) {
                    console.log("window.auth object found. Calling getUser().");
                    const user = await window.auth.getUser();
                    console.log("getUser() call completed. User object:", user);

                    if (user) {
                        console.log("User is logged in. Switching to launcher view.");
                        if(welcomeView) welcomeView.style.display = 'none';
                        if(launcherView) launcherView.style.display = 'block';
                        loadProjects();
                    } else {
                        console.log("User is not logged in. Opening auth modal.");
                        window.auth.openAuthModal();
                    }
                } else {
                    console.error("Auth script not loaded yet or window.auth is not defined.");
                    await showCustomAlert("Sistema Ocupado", "El sistema de autenticación no está listo. Por favor, espera un momento y vuelve a intentarlo.");
                }
            } catch (error) {
                console.error("An error occurred in the start button click handler:", error);
                await showCustomAlert("Error Inesperado", `Ocurrió un error: ${error.message}`);
            }
        });
    } else {
        console.error("#btn-start element was not found in the DOM. The event listener cannot be attached.");
    }

    if(createProjectForm) createProjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!window.showDirectoryPicker) {
            await showCustomAlert('Error de Compatibilidad', 'Tu navegador no es compatible con la API de Acceso al Sistema de Archivos.');
            return;
        }
        const projectNameInput = document.getElementById('project-name');
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

            // Verificar si el proyecto ya existe
            try {
                await dirHandle.getDirectoryHandle(projectName, { create: false });
                await showCustomAlert('Error', `El proyecto "${projectName}" ya existe. Por favor, elige otro nombre.`);
                return;
            } catch (e) {
                // Si da error es porque no existe, lo cual es bueno. Continuamos.
            }

            // Crear el directorio del proyecto y las carpetas necesarias
            const projectDirHandle = await dirHandle.getDirectoryHandle(projectName, { create: true });
            const assetsDirHandle = await projectDirHandle.getDirectoryHandle('assets', { create: true });
            const tutorialDirHandle = await assetsDirHandle.getDirectoryHandle('tutorial', { create: true });

            // Crear el archivo de escena por defecto
            const sceneFileHandle = await assetsDirHandle.getFileHandle('default.ceScene', { create: true });
            let writable = await sceneFileHandle.createWritable();
            await writable.write(JSON.stringify({ materias: [] }, null, 2));
            await writable.close();

            // Cargar y escribir los archivos de documentación
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
                console.warn("No se pudieron crear los archivos de documentación:", docsError);
                // No mostramos un error al usuario por esto, es un extra.
            }

            projectNameInput.value = '';
            closeModal();
            await showCustomAlert('¡Éxito!', `Proyecto "${projectName}" creado con éxito.`);
            loadProjects();

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error creando el proyecto:', error);
                await showCustomAlert('Error', 'Ocurrió un error al crear el proyecto.');
            }
        }
    });

    if(projectList) projectList.addEventListener('click', (event) => {
        const openFolderBtn = event.target.closest('.open-folder-btn');
        const projectItem = event.target.closest('.project-item');

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
    const contextMenu = document.getElementById('context-menu');
    let currentProjectName = null;

    const hideContextMenu = () => {
        if (contextMenu) contextMenu.classList.remove('visible');
        document.querySelectorAll('.project-item.selected').forEach(item => item.classList.remove('selected'));
    };

    projectList.addEventListener('contextmenu', (e) => {
        const projectItem = e.target.closest('.project-item');
        if (!projectItem) {
            hideContextMenu();
            return;
        }
        e.preventDefault();

        hideContextMenu(); // Hide any previous menu
        projectItem.classList.add('selected');

        currentProjectName = projectItem.dataset.projectName;

        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.classList.add('visible');
    });

    window.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    document.getElementById('ctx-delete').addEventListener('click', async () => {
        hideContextMenu();
        if (!currentProjectName) return;

        const confirmed = await showCustomConfirm(
            'Confirmar Eliminación',
            `¿Estás seguro de que quieres eliminar el proyecto "${currentProjectName}"? Esta acción no se puede deshacer.`
        );

        if (confirmed) {
            try {
                const dirHandle = await getDirHandle();
                await dirHandle.removeEntry(currentProjectName, { recursive: true });
                await showCustomAlert('Éxito', `Proyecto "${currentProjectName}" eliminado.`);
                loadProjects();
            } catch (err) {
                console.error('Error deleting project:', err);
                await showCustomAlert('Error', 'No se pudo eliminar el proyecto.');
            }
        }
    });

    document.getElementById('ctx-rename').addEventListener('click', async () => {
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
    const music = document.getElementById('background-music');
    const muteBtn = document.getElementById('btn-mute-music');
    let musicStarted = false;

    function toggleMusic() {
        music.muted = !music.muted;
        muteBtn.textContent = music.muted ? '🔇' : '🔊';
        localStorage.setItem('musicMuted', music.muted);
    }

    // Browsers require a user interaction to start audio.
    // We'll start it on the first click anywhere, then let the user control it.
    function startMusic() {
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
    const dialogModal = document.getElementById('custom-dialog-modal');
    const dialogTitle = document.getElementById('custom-dialog-title');
    const dialogMessage = document.getElementById('custom-dialog-message');
    const dialogButtons = document.getElementById('custom-dialog-buttons');

    function showCustomAlert(title, message) {
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        dialogButtons.innerHTML = '<button class="btn-primary">Aceptar</button>';

        dialogModal.classList.add('is-open');

        return new Promise(resolve => {
            dialogButtons.querySelector('button').addEventListener('click', () => {
                dialogModal.classList.remove('is-open');
                resolve();
            }, { once: true });
        });
    }

    function showCustomConfirm(title, message) {
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        dialogButtons.innerHTML = `
            <button class="btn-secondary">Cancelar</button>
            <button class="btn-primary">Aceptar</button>
        `;

        dialogModal.classList.add('is-open');

        return new Promise((resolve, reject) => {
            dialogButtons.querySelector('.btn-primary').addEventListener('click', () => {
                dialogModal.classList.remove('is-open');
                resolve(true);
            }, { once: true });

            dialogButtons.querySelector('.btn-secondary').addEventListener('click', () => {
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
