document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const welcomeView = document.getElementById('welcome-view');
    const launcherView = document.getElementById('launcher-view');

    // Intro Sequence Elements
    const introStep1 = document.getElementById('intro-step-1');
    const introStep2 = document.getElementById('intro-step-2');
    const mainContent = document.getElementById('main-content');

    // Buttons
    const startButton = document.getElementById('btn-start');
    const licenseButton = document.getElementById('btn-license');
    const supportButton = document.getElementById('btn-support');
    const createProjectBtn = document.getElementById('btn-create-project');

    // Modals & Forms
    const supportModal = document.getElementById('support-modal');
    const licenseModal = document.getElementById('license-modal');
    const closeSupport = document.getElementById('close-support');
    const closeLicense = document.getElementById('close-license');
    const contactForm = document.getElementById('contact-form');

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
        setTimeout(() => {
            if(mainContent) mainContent.classList.add('visible');
            startQuoteCarousel();
        }, 2500);
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
            projectList.innerHTML = '';
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

    // --- Modal Logic ---
    const openModal = (modal) => { if (modal) modal.style.display = 'block'; };
    const closeModal = () => {
        if (supportModal) supportModal.style.display = 'none';
        if (licenseModal) licenseModal.style.display = 'none';
    };

    if(supportButton) supportButton.addEventListener('click', () => openModal(supportModal));
    if(licenseButton) licenseButton.addEventListener('click', () => openModal(licenseModal));

    if(closeSupport) closeSupport.addEventListener('click', closeModal);
    if(closeLicense) closeLicense.addEventListener('click', closeModal);

    window.addEventListener('click', (event) => {
        if (event.target == supportModal || event.target == licenseModal) {
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
            alert("El sistema de autenticación no está listo. Por favor, espera un momento y vuelve a intentarlo.");
        }
    });

    if(createProjectBtn) createProjectBtn.addEventListener('click', async () => {
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
            await projectDirHandle.getDirectoryHandle('Assets', { create: true });
            alert(`¡Proyecto "${projectName}" creado con éxito!`);
            loadProjects();
        } catch (error) {
            if (error.name !== 'AbortError') console.error('Error:', error);
        }
    });

    if(projectList) projectList.addEventListener('click', (event) => {
        const projectItem = event.target.closest('.project-item');
        if (projectItem) {
            const projectName = projectItem.dataset.projectName;
            if (projectName) {
                window.location.href = `editor.html?project=${encodeURIComponent(projectName)}`;
            }
        }
    });

    // --- Initialize ---
    openDB();
    handleIntroAnimation();
    console.log('Creative Engine UI Initialized.');
});
