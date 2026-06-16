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
    const shareButton = document.getElementById('btn-share');
    const shareButtonMain = document.getElementById('btn-share-main');
    const shareButtonLauncher = document.getElementById('btn-share-launcher');
    const createProjectBtn = document.getElementById('btn-add-project-top');
    const selectFolderBtn = document.getElementById('btn-select-folder');
    const joinCollabBtn = document.getElementById('btn-join-collab');
    const confirmJoinBtn = document.getElementById('btn-confirm-join');
    const collabCodeInput = document.getElementById('collab-code-input');

    // Modals & Forms
    const createProjectModal = document.getElementById('create-project-modal');
    const closeCreateProject = document.getElementById('close-create-project');
    const createProjectForm = document.getElementById('create-project-form');

    const collabModal = document.getElementById('collab-modal');
    const closeCollab = document.getElementById('close-collab');

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

            projects.forEach(async entry => {
                const projectItem = document.createElement('div');
                projectItem.className = 'project-item';
                projectItem.dataset.projectName = entry.name;

                // Load thumbnail if exists
                try {
                    const projectDir = await dirHandle.getDirectoryHandle(entry.name);
                    const thumbFile = await projectDir.getFileHandle('thumbnail.png');
                    const file = await thumbFile.getFile();
                    const url = URL.createObjectURL(file);
                    projectItem.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${url})`;
                    projectItem.style.backgroundSize = 'cover';
                    projectItem.style.backgroundPosition = 'center';
                } catch (e) {
                    // No thumbnail, use default style
                }

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
        if (createProjectModal) createProjectModal.classList.remove('is-open');
        if (collabModal) collabModal.classList.remove('is-open');
    };

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

    if (joinCollabBtn) {
        joinCollabBtn.addEventListener('click', () => {
            openModal(collabModal);
            if (collabCodeInput) collabCodeInput.focus();
        });
    }

    if (closeCollab) closeCollab.addEventListener('click', closeModal);

    if (confirmJoinBtn) {
        confirmJoinBtn.addEventListener('click', async () => {
            const code = collabCodeInput.value.trim().toUpperCase();
            if (code.length < 4) {
                Dialogs.showNotification(Localization.get('AVISO'), 'Por favor, introduce un código de colaboración válido.');
                return;
            }

            const collabType = document.querySelector('input[name="collabType"]:checked').value;

            if (collabType === 'online') {
                // Online mode requires checking Supabase for the relay URL
                if (!window.auth || !window.auth._supabase) {
                    Dialogs.showNotification('Error', 'Debes estar conectado para usar la colaboración online.');
                    return;
                }

                confirmJoinBtn.disabled = true;
                confirmJoinBtn.textContent = 'Buscando...';

                const { data, error } = await window.auth._supabase
                    .from('proyectos_activos')
                    .select('url_hf')
                    .eq('codigo', code)
                    .single();

                if (error || !data) {
                    Dialogs.showNotification('Error', 'El código de proyecto no existe o ha expirado.');
                    confirmJoinBtn.disabled = false;
                    confirmJoinBtn.textContent = Localization.get('UNIRSE', 'Unirse');
                    return;
                }

                // Redirect with both code and relay
                window.location.href = `editor.html?collab=${encodeURIComponent(code)}&relay=${encodeURIComponent(data.url_hf)}`;
            } else {
                // Redirect to editor in local collaboration mode
                window.location.href = `editor.html?collab=${encodeURIComponent(code)}`;
            }
        });

        collabCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirmJoinBtn.click();
        });
    }

    // Collab Type Selector Visual Logic
    const collabTypeCards = document.querySelectorAll('.collab-type-selector .type-card');
    collabTypeCards.forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('disabled')) return;

            collabTypeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // Template Selector Visual Logic
    const templateCards = document.querySelectorAll('.template-card');
    templateCards.forEach(card => {
        card.addEventListener('click', () => {
            templateCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    const handleShare = async (e) => {
        if (e) e.preventDefault();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Creative Engine',
                    text: '¡Crea tus propios videojuegos 2D directamente en el navegador con Creative Engine!',
                    url: window.location.href
                });
                console.log('Engine shared successfully');
            } catch (error) {
                console.error('Error sharing engine:', error);
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
                Dialogs.showNotification('Enlace Copiado', 'El enlace al motor ha sido copiado al portapapeles.');
            } catch (err) {
                console.error('Could not copy text: ', err);
            }
        }
    };

    if (shareButton) shareButton.addEventListener('click', handleShare);
    if (shareButtonMain) shareButtonMain.addEventListener('click', handleShare);
    if (shareButtonLauncher) shareButtonLauncher.addEventListener('click', handleShare);

    if(closeCreateProject) closeCreateProject.addEventListener('click', closeModal);

    // Project Type Selector Visual Logic
    const typeCards = document.querySelectorAll('.type-card');
    typeCards.forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('disabled')) return;

            typeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target == createProjectModal || event.target == collabModal) {
            closeModal();
        }
    });

    // --- View Switching & Project Creation ---
    let isCreatingProject = false;
    if (startButton) {
        startButton.addEventListener('click', () => {
            console.log("Start button clicked. Switching to launcher view.");
            if(welcomeView) welcomeView.style.display = 'none';
            if(launcherView) launcherView.style.display = 'block';
            loadProjects();
        });
    } else {
        console.error("#btn-start element was not found in the DOM. The event listener cannot be attached.");
    }

    if(createProjectForm) createProjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isCreatingProject) return;

        const hasPicker = !!window.showDirectoryPicker;
        const hasSandbox = !!(navigator.storage && navigator.storage.getDirectory);

        if (!hasPicker && !hasSandbox) {
            window.Dialogs.showNotification(Localization.get('ERROR_COMPATIBILIDAD', 'Error de Compatibilidad'), Localization.get('ERROR_FS_NO_SOPORTADO', 'Tu navegador no es compatible con ninguna API de Acceso al Sistema de Archivos.'));
            return;
        }

        const projectNameInput = document.getElementById('project-name');
        const projectName = projectNameInput.value.trim().replace(/[^a-zA-Z0-9-]/g, '-');
        const projectType = createProjectForm.querySelector('input[name="projectType"]:checked').value;
        const projectTemplate = createProjectForm.querySelector('input[name="projectTemplate"]:checked').value;
        const isNewUser = document.getElementById('is-new-user').checked;

        if (!projectName) {
            window.Dialogs.showNotification('Entrada Inválida', 'Por favor, introduce un nombre de proyecto válido.');
            return;
        }

        try {
            isCreatingProject = true;
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

            // Crear el archivo de configuración base
            const config = {
                appName: projectName,
                appVersion: '1.0.0',
                projectType: projectType,
                rendererMode: projectType === '3d' ? '3d-mode' : 'canvas2d',
                isNewUser: isNewUser,
                engineVersion: '0.1.2'
            };
            const configFileHandle = await projectDirHandle.getFileHandle('project.ceconfig', { create: true });
            let writableConfig = await configFileHandle.createWritable();
            await writableConfig.write(JSON.stringify(config, null, 2));
            await writableConfig.close();

            // Crear el archivo de escena por defecto
            const sceneFileHandle = await assetsDirHandle.getFileHandle('default.ceScene', { create: true });
            let writable = await sceneFileHandle.createWritable();

            let sceneData = { materias: [] };

            if (projectTemplate === 'platformer') {
                sceneData = {
                    materias: [
                        {
                            name: "Suelo",
                            id: "materia_floor_001",
                            transform: { position: { x: 400, y: 500, z: 0 }, rotation: 0, scale: { x: 800, y: 40, z: 1 } },
                            components: [
                                { type: "SpriteRenderer", color: "#228822" },
                                { type: "BoxCollider2D", size: { x: 1, y: 1 }, isStatic: true }
                            ]
                        },
                        {
                            name: "Jugador",
                            id: "materia_player_001",
                            transform: { position: { x: 400, y: 300, z: 0 }, rotation: 0, scale: { x: 50, y: 50, z: 1 } },
                            components: [
                                { type: "SpriteRenderer", color: "#55aaff" },
                                { type: "Rigidbody2D", gravityScale: 1 },
                                { type: "BoxCollider2D", size: { x: 1, y: 1 } }
                            ]
                        }
                    ]
                };

                // Crear script de ejemplo para el plataformas
                const playerScript = `/**
 * CONTROLADOR DE JUGADOR (PLATAFORMAS)
 *
 * Este script controla el movimiento lateral y el salto.
 */

export default class PlayerController extends Ley {
    onStart() {
        this.speed = 300;
        this.jumpForce = 600;
        this.rb = this.getComponent("Rigidbody2D");
    }

    onUpdate(dt) {
        // Movimiento Horizontal
        let moveX = 0;
        if (Input.isKeyDown("ArrowRight") || Input.isKeyDown("d")) moveX = 1;
        if (Input.isKeyDown("ArrowLeft") || Input.isKeyDown("a")) moveX = -1;

        this.transform.position.x += moveX * this.speed * dt;

        // Salto
        if ((Input.isKeyDown("ArrowUp") || Input.isKeyDown("w") || Input.isKeyDown(" ")) && this.rb.velocity.y === 0) {
            this.rb.applyImpulse({ x: 0, y: -this.jumpForce });
        }
    }
}`;
                const scriptFileHandle = await assetsDirHandle.getFileHandle('ControladorJugador.ces', { create: true });
                let sw = await scriptFileHandle.createWritable();
                await sw.write(playerScript);
                await sw.close();
            } else if (projectTemplate === 'topdown') {
                sceneData = {
                    materias: [
                        {
                            name: "Personaje",
                            id: "materia_char_001",
                            transform: { position: { x: 400, y: 300, z: 0 }, rotation: 0, scale: { x: 40, y: 40, z: 1 } },
                            components: [
                                { type: "SpriteRenderer", color: "#ff5555" }
                            ]
                        }
                    ]
                };

                const topdownScript = `/**
 * CONTROLADOR TOP-DOWN
 *
 * Movimiento en 8 direcciones para juegos tipo Zelda o RPG.
 */

export default class TopDownMovement extends Ley {
    onStart() {
        this.speed = 250;
    }

    onUpdate(dt) {
        let vx = 0;
        let vy = 0;

        if (Input.isKeyDown("ArrowRight") || Input.isKeyDown("d")) vx = 1;
        if (Input.isKeyDown("ArrowLeft") || Input.isKeyDown("a")) vx = -1;
        if (Input.isKeyDown("ArrowDown") || Input.isKeyDown("s")) vy = 1;
        if (Input.isKeyDown("ArrowUp") || Input.isKeyDown("w")) vy = -1;

        // Normalizar diagonal (opcional)
        if (vx !== 0 && vy !== 0) {
            vx *= 0.707;
            vy *= 0.707;
        }

        this.transform.position.x += vx * this.speed * dt;
        this.transform.position.y += vy * this.speed * dt;
    }
}`;
                const scriptFileHandle = await assetsDirHandle.getFileHandle('MovimientoTopDown.ces', { create: true });
                let sw = await scriptFileHandle.createWritable();
                await sw.write(topdownScript);
                await sw.close();
            }

            await writable.write(JSON.stringify(sceneData, null, 2));
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
        } finally {
            isCreatingProject = false;
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
    };


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

    // --- Reset Engine Logic ---
    const resetEngineBtn = document.getElementById('btn-reset-engine');
    if (resetEngineBtn) {
        resetEngineBtn.addEventListener('click', () => {
            Dialogs.showConfirmation(
                Localization.get('RESTABLECER_MOTOR', 'Restablecer Motor'),
                Localization.get('CONFIRM_RESTABLECER', '¿Estás seguro de que quieres borrar todos los datos locales del motor? Esto te pedirá elegir la carpeta de proyectos de nuevo. Tus archivos en el disco NO se verán afectados.'),
                async () => {
                    try {
                        // 1. Clear LocalStorage
                        localStorage.clear();

                        // 2. Delete IndexedDB
                        const deleteRequest = indexedDB.deleteDatabase(dbName);
                        deleteRequest.onsuccess = () => {
                            console.log("IndexedDB deleted successfully.");
                            window.location.reload();
                        };
                        deleteRequest.onerror = () => {
                            console.error("Error deleting IndexedDB.");
                            window.location.reload(); // Reload anyway to clear session state
                        };
                        deleteRequest.onblocked = () => {
                            console.warn("IndexedDB delete blocked. Please close other tabs.");
                            window.location.reload();
                        };
                    } catch (e) {
                        console.error("Error during reset:", e);
                        window.location.reload();
                    }
                }
            );
        });
    }

    // AI Key Logic
    const aiKeyInput = document.getElementById('carl-ai-key');
    const saveAiKeyBtn = document.getElementById('btn-save-ai-key');
    const shareWithCarleyToggle = document.getElementById('prefs-share-with-carley');

    // Share with Carley Preference Logic (Launcher)
    if (shareWithCarleyToggle) {
        const savedPrefs = localStorage.getItem('creativeEnginePrefs');
        if (savedPrefs) {
            try {
                const prefs = JSON.parse(savedPrefs);
                shareWithCarleyToggle.checked = prefs.shareWithCarley !== false;
            } catch(e) {}
        }

        shareWithCarleyToggle.addEventListener('change', () => {
            const savedPrefs = localStorage.getItem('creativeEnginePrefs');
            let prefs = {};
            if (savedPrefs) {
                try { prefs = JSON.parse(savedPrefs); } catch(e) {}
            }
            prefs.shareWithCarley = shareWithCarleyToggle.checked;
            localStorage.setItem('creativeEnginePrefs', JSON.stringify(prefs));
            Dialogs.showNotification('Preferencia Actualizada', 'Tu preferencia de telemetría ha sido guardada.');
        });
    }

    if (aiKeyInput) {
        const savedKey = localStorage.getItem('creativeEngine_gemini_apiKey');
        if (savedKey) aiKeyInput.value = savedKey;
    }

    if (saveAiKeyBtn) {
        saveAiKeyBtn.addEventListener('click', () => {
            const key = aiKeyInput.value.trim();
            if (key) {
                localStorage.setItem('creativeEngine_gemini_apiKey', key);
                Dialogs.showNotification('Éxito', 'Clave de API guardada correctamente.');
            } else {
                localStorage.removeItem('creativeEngine_gemini_apiKey');
                Dialogs.showNotification('Aviso', 'Clave de API eliminada.');
            }
        });
    }

    // --- Initialize ---
    openDB();
    handleIntroAnimation();
    console.log('Creative Engine UI Initialized.');
});
