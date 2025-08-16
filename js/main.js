document.addEventListener('DOMContentLoaded', () => {
    const startCreatingBtn = document.getElementById('start-creating-btn');
    const supportBtn = document.getElementById('support-btn');
    const licenseBtn = document.getElementById('license-btn');
    const reportBtn = document.getElementById('report-btn');

    const launcher_view = document.getElementById('launcher-view');
    const main_actions_view = document.getElementById('main-actions-view');
    const create_project_btn = document.getElementById('create-project-btn');
    const open_project_btn = document.getElementById('open-project-btn');
    const project_list = document.getElementById('project-list');
    const no_projects_msg = document.getElementById('no-projects-msg');

    const supportModal = document.getElementById('support-modal');
    const licenseModal = document.getElementById('license-modal');

    let projectsDirHandle = null;
    const dbName = 'CreativeEngineDB';
    let db;

    // --- IndexedDB Functions ---
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onerror = (event) => reject('Error opening IndexedDB');
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };
            request.onupgradeneeded = (event) => {
                let store = event.target.result.createObjectStore('settings', { keyPath: 'id' });
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
        return new Promise((resolve) => {
            if (!db) {
                resolve(null);
                return;
            }
            const transaction = db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('projectsDirHandle');
            request.onsuccess = () => {
                resolve(request.result ? request.result.handle : null);
            };
            request.onerror = () => {
                resolve(null);
            };
        });
    }

    async function loadProjects() {
        if (!projectsDirHandle) return;

        project_list.innerHTML = '';
        let hasProjects = false;
        for await (const entry of projectsDirHandle.values()) {
            if (entry.kind === 'directory') {
                hasProjects = true;
                const li = document.createElement('li');
                li.textContent = entry.name;
                li.dataset.projectName = entry.name;
                li.addEventListener('click', () => {
                    window.location.href = `editor.html?project=${encodeURIComponent(entry.name)}`;
                });
                project_list.appendChild(li);
            }
        }
        no_projects_msg.style.display = hasProjects ? 'none' : 'block';
    }

    // --- Event Listeners ---
    startCreatingBtn.addEventListener('click', () => {
        launcher_view.classList.remove('hidden');
        main_actions_view.classList.add('hidden');
    });

    open_project_btn.addEventListener('click', async () => {
        try {
            projectsDirHandle = await window.showDirectoryPicker();
            saveDirHandle(projectsDirHandle);
            await loadProjects();
        } catch (err) {
            console.error('Error al seleccionar el directorio:', err);
        }
    });

    create_project_btn.addEventListener('click', async () => {
        if (!projectsDirHandle) {
            alert("Por favor, primero abre la carpeta donde guardarás tus proyectos.");
            return;
        }
        const projectName = prompt("Introduce el nombre del nuevo proyecto:");
        if (projectName) {
            try {
                const newProjectHandle = await projectsDirHandle.getDirectoryHandle(projectName, { create: true });
                // Create default folders
                await newProjectHandle.getDirectoryHandle('Assets', { create: true });
                await newProjectHandle.getDirectoryHandle('Scenes', { create: true });

                // Create a default scene
                const scenesHandle = await newProjectHandle.getDirectoryHandle('Scenes');
                const sceneFileHandle = await scenesHandle.getFileHandle('MainScene.ceScene', { create: true });
                const writable = await sceneFileHandle.createWritable();
                await writable.write(JSON.stringify({ materias: [] }, null, 2));
                await writable.close();

                await loadProjects();
                alert(`Proyecto '${projectName}' creado con éxito.`);
            } catch (err) {
                console.error(`Error al crear el proyecto '${projectName}':`, err);
                alert("No se pudo crear el proyecto. Revisa la consola para más detalles.");
            }
        }
    });

    reportBtn.addEventListener('click', () => {
        window.location.href = "mailto:carley.interactive@gmail.com?subject=Reporte de Error - Creative Engine";
    });

    // Modal listeners
    supportBtn.addEventListener('click', () => supportModal.classList.remove('hidden'));
    licenseBtn.addEventListener('click', () => licenseModal.classList.remove('hidden'));

    supportModal.querySelector('.close-button').addEventListener('click', () => supportModal.classList.add('hidden'));
    licenseModal.querySelector('.close-button').addEventListener('click', () => licenseModal.classList.add('hidden'));

    // --- PayPal SDK ---
    function initPayPalButton() {
      paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'gold',
          layout: 'vertical',
          label: 'donate',
        },
        createOrder: function(data, actions) {
          return actions.order.create({
            purchase_units: [{"amount":{"currency_code":"USD","value":"5"}}]
          });
        },
        onApprove: function(data, actions) {
          return actions.order.capture().then(function(orderData) {
            alert('¡Gracias por tu donación!');
          });
        },
        onError: function(err) {
          console.log(err);
        }
      }).render('#paypal-button-container').catch(err => {
          console.error("Failed to render PayPal buttons", err);
      });
    }

    // --- Initialization ---
    async function initialize() {
        await openDB();
        projectsDirHandle = await getDirHandle();
        if (projectsDirHandle) {
            await loadProjects();
        }
        initPayPalButton();
    }

    initialize();
});
