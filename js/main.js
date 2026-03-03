import { Localization } from './engine/Localization.js';
import * as Dialogs from './editor/ui/DialogWindow.js';

// Guarantee window-level access for non-module scripts (like auth.js)
window.Dialogs = Dialogs;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize localization
    await Localization.init();
    Localization.updateUI();

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
    const createProjectBtn = document.getElementById('btn-add-project-top');
    const selectFolderBtn = document.getElementById('btn-select-folder');

    // Footer Links
    const licenseLinks = document.querySelectorAll('[data-i18n="LICENCIA"]');
    const policyLinks = document.querySelectorAll('[data-i18n="POLITICA_PRIVACIDAD"]');
    const cookiesLinks = document.querySelectorAll('[data-i18n="COOKIES"]');
    const whatWeDoLinks = document.querySelectorAll('[data-i18n="QUE_HACEMOS_DONACIONES"]');
    const startFooterBtn = document.getElementById('btn-start-footer');

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
    const quoteKeys = [];
    for (let i = 1; i <= 20; i++) quoteKeys.push(`QUOTE_${i}`);

    function startQuoteCarousel() {
        if (!motivationalQuoteEl) return;
        setInterval(() => {
            const randomKey = quoteKeys[Math.floor(Math.random() * quoteKeys.length)];
            const newQuote = Localization.get(randomKey);

            motivationalQuoteEl.classList.add('quote-fade-out');
            setTimeout(() => {
                // We use innerHTML to allow icons if we decide to include them in the future
                // But for now, text is enough. The updateUI will handle the initial one.
                motivationalQuoteEl.innerHTML = newQuote;
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

    async function getDirHandle() {
        if (!db) return null;
        const storedHandle = await new Promise((resolve) => {
            const transaction = db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('projectsDirHandle');
            request.onsuccess = () => resolve(request.result ? request.result.handle : null);
            request.onerror = () => resolve(null);
        });

        if (storedHandle) return storedHandle;

        // Fallback to Sandbox (OPFS) if no handle is stored and we are on mobile/no picker support
        if (!window.showDirectoryPicker && navigator.storage && navigator.storage.getDirectory) {
            try {
                return await navigator.storage.getDirectory();
            } catch (e) {
                console.error("Error accessing OPFS:", e);
            }
        }
        return null;
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
            projectList.innerHTML = `<p class="no-projects-message">${Localization.get('HINT_SELECCIONAR_CARPETA', 'Elige una carpeta para tus proyectos al crear el primero.')}</p>`;
            return;
        }
        try {
            // Permission check only for picked handles (OPFS handles don't have queryPermission or always return granted)
            if (dirHandle.queryPermission) {
                if (await dirHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
                    if (await dirHandle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                        Dialogs.showNotification(Localization.get('PERMISOS_REQUERIDOS', 'Permisos Requeridos'), Localization.get('ERROR_PERMISOS_CARPETA', "No se pudo obtener permiso para leer la carpeta de proyectos. Por favor, concede el permiso para continuar."));
                        return;
                    }
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
                projectList.innerHTML = `<p class="no-projects-message">${Localization.get('SIN_PROYECTOS', 'No hay proyectos en esta carpeta. ¡Crea uno!')}</p>`;
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

                const projectActions = document.createElement('div');
                projectActions.className = 'project-actions';

                const openFolderBtn = document.createElement('button');
                openFolderBtn.className = 'project-action-btn location';
                openFolderBtn.innerHTML = '<img src="icons/folder.svg" class="ce-icon">';
                openFolderBtn.title = Localization.get('VER_UBICACION', 'Ver ubicación');
                openFolderBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const workspace = await getDirHandle();
                    const workspaceName = workspace ? (workspace.name || 'Creative Engine Projects') : '...';

                    Dialogs.showNotification(
                        Localization.get('UBICACION_DEL_PROYECTO', 'Ubicación del Proyecto'),
                        `${Localization.get('HINT_RUTA_PROYECTO', 'El proyecto se encuentra en la carpeta de proyectos configurada, dentro de la subcarpeta:')}\n\n[${workspaceName}] / ${entry.name}`
                    );
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'project-action-btn delete';
                deleteBtn.innerHTML = '<img src="icons/trash.svg" class="ce-icon" style="filter: invert(0.3) sepia(1) saturate(10) hue-rotate(-50deg);">';
                deleteBtn.title = Localization.get('ELIMINAR_PROYECTO', 'Eliminar Proyecto');
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    currentProjectName = entry.name;
                    handleDeleteProject();
                };

                projectActions.appendChild(openFolderBtn);
                projectActions.appendChild(deleteBtn);

                projectItem.appendChild(projectNameEl);
                projectItem.appendChild(projectActions);
                projectList.appendChild(projectItem);

                projectItem.onclick = () => {
                    saveProjectTimestamp(entry.name);
                    window.location.href = `editor.html?project=${encodeURIComponent(entry.name)}`;
                };
            });

        } catch (error) {
            console.error("Error loading projects:", error);
            projectList.innerHTML = `<p class="no-projects-message">${Localization.get('HA_OCURRIDO_ERROR', 'Error al cargar los proyectos.')}</p>`;
        }
    }

    // --- Modal Logic ---
    const openModal = (modal) => { if (modal) modal.classList.add('is-open'); };
    const closeModal = () => {
        if (supportModal) supportModal.classList.remove('is-open');
        if (licenseModal) licenseModal.classList.remove('is-open');
        if (createProjectModal) createProjectModal.classList.remove('is-open');
    };

    const setupFooterLinks = () => {
        licenseLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); openModal(licenseModal); }));
        policyLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); Dialogs.showNotification('Aviso', 'La política de privacidad estará disponible pronto.'); }));
        cookiesLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); Dialogs.showNotification('Aviso', 'La política de cookies estará disponible pronto.'); }));
        whatWeDoLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); Dialogs.showNotification('Donaciones', 'Sus donaciones se utilizan para el mantenimiento de servidores, licencias de software y el desarrollo continuo del motor para que siga siendo gratuito.'); }));
    };
    setupFooterLinks();

    if(createProjectBtn) createProjectBtn.addEventListener('click', () => openModal(createProjectModal));
    if(selectFolderBtn) selectFolderBtn.addEventListener('click', async () => {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'creative-engine-projects' });
            saveDirHandle(dirHandle);
            loadProjects();
        } catch (e) {
            if (e.name !== 'AbortError') console.error(e);
        }
    });

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
                    window.Dialogs.showNotification('Mensaje Enviado', '¡Gracias! Tu mensaje ha sido enviado.');
                    closeModal();
                } else {
                    response.json().then(data => {
                        if (Object.hasOwn(data, 'errors')) {
                            window.Dialogs.showNotification('Error', data["errors"].map(error => error["message"]).join(", "));
                        } else {
                            window.Dialogs.showNotification('Error', 'Hubo un error al enviar el formulario. Revisa la URL de Formspree en el código.');
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Form submission error:', error);
                window.Dialogs.showNotification('Error de Conexión', 'Hubo un problema de conexión. Por favor, revisa tu conexión a internet.');
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
            if (startButton.disabled) return;

            startButton.disabled = true;
            const originalText = startButton.textContent;
            startButton.textContent = 'Verificando...';

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
                    Dialogs.showNotification("Sistema Ocupado", "El sistema de autenticación no está listo. Por favor, espera un momento y vuelve a intentarlo.");
                }
            } catch (error) {
                console.error("An error occurred in the start button click handler:", error);
                Dialogs.showNotification("Error Inesperado", `Ocurrió un error: ${error.message}`);
            } finally {
                startButton.disabled = false;
                startButton.textContent = originalText;
            }
        });
    } else {
        console.error("#btn-start element was not found in the DOM. The event listener cannot be attached.");
    }

    if(createProjectForm) createProjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const hasPicker = !!window.showDirectoryPicker;
        const hasSandbox = !!(navigator.storage && navigator.storage.getDirectory);

        if (!hasPicker && !hasSandbox) {
            window.Dialogs.showNotification(Localization.get('ERROR_COMPATIBILIDAD', 'Error de Compatibilidad'), Localization.get('ERROR_FS_NO_SOPORTADO', 'Tu navegador no es compatible con ninguna API de Acceso al Sistema de Archivos.'));
            return;
        }

        const projectNameInput = document.getElementById('project-name');
        const projectName = projectNameInput.value.trim().replace(/[^a-zA-Z0-9-]/g, '-');

        if (!projectName) {
            window.Dialogs.showNotification('Entrada Inválida', 'Por favor, introduce un nombre de proyecto válido.');
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
                window.Dialogs.showNotification('Error', `El proyecto "${projectName}" ya existe. Por favor, elige otro nombre.`);
                return;
            } catch (e) {
                // Si da error es porque no existe, lo cual es bueno. Continuamos.
            }

            // Crear el directorio del proyecto y las carpetas necesarias
            const projectDirHandle = await dirHandle.getDirectoryHandle(projectName, { create: true });
            const assetsDirHandle = await projectDirHandle.getDirectoryHandle('Assets', { create: true });
            const libDirHandle = await projectDirHandle.getDirectoryHandle('lib', { create: true });
            const tutorialDirHandle = await assetsDirHandle.getDirectoryHandle('tutorial', { create: true });

            // Crear el archivo de escena por defecto
            const sceneFileHandle = await assetsDirHandle.getFileHandle('default.ceScene', { create: true });
            let writable = await sceneFileHandle.createWritable();
            await writable.write(JSON.stringify({ materias: [] }, null, 2));
            await writable.close();

            // Cargar y escribir los archivos de documentación
            try {
                // README de Librerías
                const libReadmeContent = `# Carpeta de Librerías (/lib)

Esta carpeta está destinada a tus librerías personalizadas (.celib).
Las librerías te permiten extender la funcionalidad del editor y del motor.

## Cómo usar la nueva API Simplificada

Dentro de tu script JavaScript (IIFE), puedes usar estas funciones para crear interfaces increíbles:

\`\`\`javascript
CreativeEngine.API.registrarVentana({
    nombre: "Mi Herramienta",
    estilo: "carl", // "carl" o "moderno"
    alAbrir: (panel) => {
        panel.texto("¡Hola Mundo!");
        panel.boton("Ejecutar", () => {
            window.Dialogs.showNotification("Aviso", "Acción ejecutada");
        });
    }
});
\`\`\`

Para más detalles, consulta la sección "Ayuda" del editor.`;

                const libReadmeHandle = await libDirHandle.getFileHandle('README.md', { create: true });
                writable = await libReadmeHandle.createWritable();
                await writable.write(libReadmeContent);
                await writable.close();

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
            Dialogs.showNotification('¡Éxito!', `Proyecto "${projectName}" creado con éxito.`);
            loadProjects();

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error creando el proyecto:', error);
                Dialogs.showNotification('Error', 'Ocurrió un error al crear el proyecto.');
            }
        }
    });

    // --- Context Menu Logic ---
    let currentProjectName = null;

    const handleDeleteProject = async () => {
        if (!currentProjectName) return;

        Dialogs.showConfirmation(
            'Confirmar Eliminación',
            `¿Estás seguro de que quieres eliminar el proyecto "${currentProjectName}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    const dirHandle = await getDirHandle();
                    await dirHandle.removeEntry(currentProjectName, { recursive: true });
                    Dialogs.showNotification('Éxito', `Proyecto "${currentProjectName}" eliminado.`);
                    loadProjects();
                } catch (err) {
                    console.error('Error deleting project:', err);
                    Dialogs.showNotification('Error', 'No se pudo eliminar el proyecto.');
                }
            }
        );
    };

    const handleRenameProject = () => {
        if (!currentProjectName) return;

        window.Dialogs.showPrompt(
            'Renombrar Proyecto',
            `Introduce el nuevo nombre para "${currentProjectName}":`,
            async (newName) => {
                const sanitizedName = newName.trim().replace(/[^a-zA-Z0-9-]/g, '-');

                if (!sanitizedName || sanitizedName === currentProjectName) {
                    window.Dialogs.showNotification('Renombrado Cancelado', 'El nombre no es válido o es el mismo que el actual.');
                    return;
                }

                try {
                    const dirHandle = await getDirHandle();
                    if (!dirHandle) {
                        throw new Error("No se pudo obtener el directorio de proyectos.");
                    }

                    // 1. Verificar si el nuevo nombre ya existe
                    try {
                        await dirHandle.getDirectoryHandle(sanitizedName, { create: false });
                        window.Dialogs.showNotification('Error', `El nombre de proyecto "${sanitizedName}" ya existe.`);
                        return;
                    } catch (e) {
                        // Es bueno que no exista, continuamos.
                    }

                    // 2. Crear el nuevo directorio y copiar todo
                    const oldProjectHandle = await dirHandle.getDirectoryHandle(currentProjectName, { create: false });
                    const newProjectHandle = await dirHandle.getDirectoryHandle(sanitizedName, { create: true });
                    await copyDirectory(oldProjectHandle, newProjectHandle);

                    // 3. Eliminar el directorio antiguo
                    await dirHandle.removeEntry(currentProjectName, { recursive: true });

                    window.Dialogs.showNotification('Éxito', `El proyecto fue renombrado a "${sanitizedName}".`);
                    loadProjects(); // Recargar la lista

                } catch (error) {
                    console.error("Error al renombrar el proyecto:", error);
                    window.Dialogs.showNotification('Error', 'Ocurrió un error inesperado al renombrar.');
                }
            },
            currentProjectName // Valor por defecto en el input
        );
    });


    // --- Music Logic ---
    const music = document.getElementById('background-music');
    const muteBtn = document.getElementById('btn-mute-music');
    let musicStarted = false;

    function toggleMusic() {
        music.muted = !music.muted;
        muteBtn.innerHTML = music.muted ?
            '<img src="icons/volume-x.svg" class="ce-icon" style="filter: brightness(0) invert(0.9) opacity(0.5);">' :
            '<img src="icons/volume-2.svg" class="ce-icon">';
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
            muteBtn.innerHTML = '<img src="icons/volume-x.svg" class="ce-icon" style="filter: brightness(0) invert(0.9) opacity(0.5);">';
        } else {
            muteBtn.innerHTML = '<img src="icons/volume-2.svg" class="ce-icon">';
        }
        muteBtn.addEventListener('click', toggleMusic);
    }

    document.body.addEventListener('click', startMusic, { once: true });


    // --- File System Utilities ---
    async function copyDirectory(sourceHandle, destHandle) {
        for await (const entry of sourceHandle.values()) {
            if (entry.kind === 'file') {
                const newFileHandle = await destHandle.getFileHandle(entry.name, { create: true });
                const file = await entry.getFile();
                const writable = await newFileHandle.createWritable();
                await writable.write(file);
                await writable.close();
            } else if (entry.kind === 'directory') {
                const newDirHandle = await destHandle.getDirectoryHandle(entry.name, { create: true });
                await copyDirectory(entry, newDirHandle);
            }
        }
    }



    // --- Preferences Logic ---
    const mainLangSelect = document.getElementById('main-lang-select');
    if (mainLangSelect) {
        mainLangSelect.value = Localization.currentLanguage;
        mainLangSelect.addEventListener('change', () => {
            Localization.setLanguage(mainLangSelect.value);
        });
    }

    // Update account modal language select when language changes from elsewhere
    window.addEventListener('ce-language-changed', (e) => {
        if (mainLangSelect) mainLangSelect.value = e.detail;
    });

    // --- Initialize ---
    openDB();
    handleIntroAnimation();
    console.log('Creative Engine UI Initialized.');
});
