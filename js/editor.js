// Re-syncing with GitHub to ensure latest changes are deployed.
// --- CodeMirror Integration ---
import { InputManager } from './engine/Input.js';
import * as SceneManager from './engine/SceneManager.js';
import { Renderer } from './engine/Renderer.js';
import { WebGLRenderer } from './engine/WebGLRenderer.js';
import { PhysicsSystem } from './engine/Physics.js';
import * as Components from './engine/Components.js';
import { Materia } from './engine/Materia.js';
import { getURLForAssetPath } from './engine/AssetUtils.js';
import { initializeAnimationEditor, openAnimationAsset as openAnimationAssetFromModule } from './editor/ui/AnimationEditorWindow.js';
import { initialize as initializePreferences } from './editor/ui/PreferencesWindow.js';
import { initialize as initializeProjectSettings, populateUI as populateProjectSettingsUI } from './editor/ui/ProjectSettingsWindow.js';
import { initialize as initializeAnimatorController, openAnimatorController } from './editor/ui/AnimatorControllerWindow.js';
import { initialize as initializeHierarchy, updateHierarchy, duplicateSelectedMateria } from './editor/ui/HierarchyWindow.js';
import { initialize as initializeInspector, updateInspector } from './editor/ui/InspectorWindow.js';
import { initialize as initializeAssetBrowser, updateAssetBrowser, getCurrentDirectoryHandle } from './editor/ui/AssetBrowserWindow.js';
import { initialize as initializeUIEditor, openUiAsset, openUiEditor as openUiEditorFromModule, createUiSystemFile } from './editor/ui/UIEditorWindow.js';
import { initialize as initializeMusicPlayer } from './editor/ui/MusicPlayerWindow.js';
import { initialize as initializeImportExport } from './editor/ui/PackageImportExportWindow.js';
import { transpile } from './editor/CES_Transpiler.js';
import * as SceneView from './editor/SceneView.js';
import * as MathUtils from './engine/MathUtils.js';
import { setActiveTool } from './editor/SceneView.js';
import * as CodeEditor from './editor/CodeEditorWindow.js';
import { initializeFloatingPanels } from './editor/FloatingPanelManager.js';
import * as DebugPanel from './editor/ui/DebugPanel.js';

// --- Editor Logic ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Editor State ---
    let projectsDirHandle = null;
    let selectedMateria = null;
    let renderer = null, gameRenderer = null;
    let activeView = 'scene-content'; // 'scene-content', 'game-content', or 'code-editor-content'
    const panelVisibility = {
        hierarchy: true,
        inspector: true,
        assets: true,
        animator: false, // For the new controller panel
    };
    let physicsSystem = null;


    let isGameRunning = false;
    let lastFrameTime = 0;
    let editorLoopId = null;
    let deltaTime = 0;

    // Project Settings State
    let currentProjectConfig = {};
    // Editor Preferences State


    // --- 2. DOM Elements ---
    const dom = {};

    // --- 3. IndexedDB Logic ---
    const dbName = 'CreativeEngineDB'; let db; function openDB() { return new Promise((resolve, reject) => { const request = indexedDB.open(dbName, 1); request.onerror = () => reject('Error opening DB'); request.onsuccess = (e) => { db = e.target.result; resolve(db); }; request.onupgradeneeded = (e) => { e.target.result.createObjectStore('settings', { keyPath: 'id' }); }; }); }
    function getDirHandle() { if (!db) return Promise.resolve(null); return new Promise((resolve) => { const request = db.transaction(['settings'], 'readonly').objectStore('settings').get('projectsDirHandle'); request.onsuccess = () => resolve(request.result ? request.result.handle : null); request.onerror = () => resolve(null); }); }

    // --- 5. Core Editor Functions ---
    var createScriptFile, updateScene, selectMateria, startGame, runGameLoop, stopGame, openAnimationAsset, addFrameFromCanvas, loadScene, saveScene, serializeScene, deserializeScene, openSpriteSelector, saveAssetMeta, runChecksAndPlay, originalStartGame, loadProjectConfig, saveProjectConfig, runLayoutUpdate, updateWindowMenuUI, handleKeyboardShortcuts;

    selectMateria = function(materiaOrId) {
        let materiaToSelect = null;
        if (typeof materiaOrId === 'number') {
            // Using -1 is a convention I saw in another file, let's use null for consistency
            materiaToSelect = SceneManager.currentScene.findMateriaById(materiaOrId);
        } else {
            materiaToSelect = materiaOrId; // It's an object or null
        }

        if (selectedMateria === materiaToSelect) return;
        selectedMateria = materiaToSelect;

        // Update UI that depends on selection
        updateHierarchy();
        updateInspector();
    };

    function handleKeyboardShortcuts(e) {
        if (document.querySelector('.modal.is-open') || e.target.matches('input, textarea, select')) {
            return;
        }

        if (e.ctrlKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            duplicateSelectedMateria();
            return;
        }

        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (activeView === 'code-editor-content') {
                CodeEditor.saveCurrentScript();
            } else if (activeView === 'animation-panel') { // A better check might be needed
                // saveAnimationAsset(); // This will be handled by the animation editor module
                console.log("Animación guardada (Ctrl+S).");
            } else if (SceneManager.currentScene) {
                saveScene();
                console.log("Escena guardada (Ctrl+S).");
            }
            return;
        }

        if (!e.ctrlKey && !e.altKey) {
            switch (e.key.toLowerCase()) {
                case 'q':
                    setActiveTool('move');
                    break;
                case 'w':
                    setActiveTool('pan');
                    break;
                case 'e':
                    setActiveTool('scale');
                    break;
                case 'r':
                    setActiveTool('rotate');
                    break;
                case 'delete':
                case 'backspace':
                    if (selectedMateria) {
                        const idToDelete = selectedMateria.id;
                        selectMateria(null); // Deselect first
                        SceneManager.currentScene.removeMateria(idToDelete);
                        updateHierarchy();
                        updateInspector();
                    }
                    break;
            }
        }

        if (activeView === 'code-editor-content') {
            if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                CodeEditor.undoLastChange();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                CodeEditor.redoLastChange();
            }
        }
    }

    function updateWindowMenuUI() {
        const menuItems = {
            'hierarchy-panel': 'menu-window-hierarchy',
            'inspector-panel': 'menu-window-inspector',
            'assets-panel': 'menu-window-assets',
            'animation-panel': 'menu-window-animation',
            'animator-controller-panel': 'menu-window-animator',
            'ui-editor-panel': 'menu-window-ui-editor'
        };
        const checkmark = '✅ ';

        for (const [panelId, menuId] of Object.entries(menuItems)) {
            const panel = document.getElementById(panelId);
            const menuItem = document.getElementById(menuId);

            if (panel && menuItem) {
                // Always clean the text first to avoid multiple checkmarks
                menuItem.textContent = menuItem.textContent.replace(checkmark, '');

                // Add checkmark if panel is visible (does not have the 'hidden' class)
                if (!panel.classList.contains('hidden')) {
                    menuItem.textContent = checkmark + menuItem.textContent;
                }
            }
        }
    }

    loadProjectConfig = async function() {
        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            const configFileHandle = await projectHandle.getFileHandle('project.ceconfig', { create: false });
            const file = await configFileHandle.getFile();
            const content = await file.text();
            currentProjectConfig = JSON.parse(content);
            console.log("Configuración del proyecto cargada:", currentProjectConfig);
        } catch (error) {
            console.warn("No se encontró 'project.ceconfig'. Creando uno nuevo con valores por defecto.");
            currentProjectConfig = {
                appName: 'MiJuego',
                authorName: 'Un Creador',
                appVersion: '1.0.0',
                engineVersion: '0.1.0-beta',
                iconPath: '',
                splashLogos: [],
                showEngineLogo: true,
                keystore: { path: '', pass: '', alias: '', aliasPass: '' },
                layers: {
                    sortingLayers: ['Default', 'UI'],
                    collisionLayers: ['Default', 'Player', 'Enemy', 'Ground']
                }
            };
            // Automatically save the default config file if it doesn't exist
            // This now needs to be handled carefully as saveProjectConfig is in another module
            // For now, we'll just create the object in memory. The first save from the UI will create the file.
        }

        // Ensure layers config exists for older projects
        if (!currentProjectConfig.layers) {
            currentProjectConfig.layers = {
                sortingLayers: ['Default', 'UI'],
                collisionLayers: ['Default', 'Player', 'Enemy', 'Ground']
            };
        }

        // Ensure tags config exists for older projects
        if (!currentProjectConfig.tags) {
            currentProjectConfig.tags = ['Untagged'];
        }

        // The UI population is now handled by the module
        populateProjectSettingsUI(currentProjectConfig, projectsDirHandle);
    };

    // --- Project Settings and Preferences Logic has been moved to their respective modules ---

    runChecksAndPlay = async function() {
        if (!projectsDirHandle) {
            alert("El proyecto aún se está cargando, por favor, inténtalo de nuevo en un momento.");
            return;
        }
        console.log("Verificando todos los scripts del proyecto...");
        dom.consoleContent.innerHTML = ''; // Limpiar consola de la UI
        const allErrors = [];
        let mainGameJsCode = null;

        // 1. Encontrar todos los archivos .ces
        const cesFiles = [];
        async function findCesFiles(dirHandle, currentPath = '') {
            console.log(`Buscando en: ${currentPath || 'Assets'}`);
            for await (const entry of dirHandle.values()) {
                console.log(`  - Encontrado: ${entry.name} (Tipo: ${entry.kind})`);
                if (entry.kind === 'file' && entry.name.endsWith('.ces')) {
                    console.log(`    -> ¡Script .ces encontrado! Añadiendo a la lista.`);
                    cesFiles.push(entry);
                } else if (entry.kind === 'directory') {
                    await findCesFiles(entry, `${currentPath}/${entry.name}`);
                }
            }
        }

        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
        await findCesFiles(assetsHandle);

        if (cesFiles.length === 0) {
            console.log("No se encontraron scripts .ces. Iniciando el juego directamente.");
            originalStartGame(); // Usar la función original que guardamos
            return;
        }

        // 2. Transpilar cada archivo y recolectar errores
        for (const fileHandle of cesFiles) {
            const file = await fileHandle.getFile();
            const code = await file.text();
            const result = transpile(code); // Usar la función transpile que añadiremos

            if (result.errors && result.errors.length > 0) {
                allErrors.push({fileName: fileHandle.name, errors: result.errors});
            } else if (fileHandle.name === 'main.ces') { // Asumimos que main.ces es el punto de entrada
                mainGameJsCode = result.jsCode;
            }
        }

        // 3. Actuar según el resultado
        if (allErrors.length > 0) {
            console.error(`Build fallido. Se encontraron errores en ${allErrors.length} archivo(s):`);
            for (const fileErrors of allErrors) {
                console.error(`\n--- Errores en ${fileErrors.fileName} ---`);
                for (const error of fileErrors.errors) {
                    console.error(`  - ${error}`);
                }
            }
            // Opcional: Cambiar a la pestaña de la consola para que los errores sean visibles
            dom.assetsPanel.querySelector('[data-tab="console-content"]').click();
        } else {
            console.log("✅ Build exitoso. Todos los scripts se compilaron sin errores.");
            // 4. Cargar el script del juego y empezar
            if (mainGameJsCode) {
                try {
                    // Crear un módulo dinámico desde el código JS transpilado
                    const blob = new Blob([mainGameJsCode], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    await import(url); // Importar el script para que defina Engine.start/update
                    URL.revokeObjectURL(url); // Limpiar
                    console.log("Script principal cargado. Iniciando juego...");
                    originalStartGame(); // Llamar a la función de inicio original
                } catch (e) {
                    console.error("Error al ejecutar el script del juego:", e);
                }
            } else {
                console.warn("Build exitoso, pero no se encontró 'main.ces'. El juego podría no tener lógica de scripting.");
                originalStartGame();
            }
        }
    };

    saveAssetMeta = async function(assetName, metaData, dirHandle) {
        try {
            const metaFileHandle = await dirHandle.getFileHandle(`${assetName}.meta`, { create: true });
            const writable = await metaFileHandle.createWritable();
            await writable.write(JSON.stringify(metaData, null, 2));
            await writable.close();
            console.log(`Metadatos guardados para ${assetName}`);
        } catch (error) {
            console.error(`No se pudieron guardar los metadatos para ${assetName}:`, error);
        }
    };

    openSpriteSelector = async function(componentName) {
        const grid = dom.spriteSelectorGrid;
        grid.innerHTML = '';
        dom.spriteSelectorModal.classList.add('is-open');

        const imageFiles = [];
        async function findImages(dirHandle, path = '') {
            for await (const entry of dirHandle.values()) {
                const entryPath = path ? `${path}/${entry.name}` : entry.name;
                if (entry.kind === 'file' && (entry.name.endsWith('.png') || entry.name.endsWith('.jpg'))) {
                    imageFiles.push(entryPath);
                } else if (entry.kind === 'directory') {
                    await findImages(entry, entryPath);
                }
            }
        }

        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        await findImages(projectHandle, ''); // Start with empty path

        imageFiles.forEach(imgPath => {
            const img = document.createElement('img');
            getURLForAssetPath(imgPath, projectsDirHandle).then(url => { if(url) img.src = url; });
            img.addEventListener('click', async () => {
                if (selectedMateria) {
                    const ComponentClass = Components[componentName];
                    if (!ComponentClass) return;

                    const component = selectedMateria.getComponent(ComponentClass);
                    if (component) {
                        component.setSourcePath(imgPath);
                        await component.loadSprite(projectsDirHandle);
                        updateInspector();
                        updateScene(renderer, false);
                    }
                }
                dom.spriteSelectorModal.classList.remove('is-open');
            });
            grid.appendChild(img);
        });
    };

    runLayoutUpdate = function() {
        if (!SceneManager.currentScene) return;

        // const layoutGroups = [];
        // // First, find all layout groups
        // for (const materia of SceneManager.currentScene.materias) {
        //     const hg = materia.getComponent(HorizontalLayoutGroup);
        //     if (hg) layoutGroups.push(hg);

        //     const vg = materia.getComponent(VerticalLayoutGroup);
        //     if (vg) layoutGroups.push(vg);

        //     const gg = materia.getComponent(GridLayoutGroup);
        //     if (gg) layoutGroups.push(gg);

        //     const csf = materia.getComponent(ContentSizeFitter);
        //     if (csf) layoutGroups.push(csf);

        //     const arf = materia.getComponent(AspectRatioFitter);
        //     if (arf) layoutGroups.push(arf);
        // }

        // // Now, update them. A single pass is sufficient for now.
        // // A more robust system might need multiple passes or a top-down/bottom-up approach.
        // for (const layout of layoutGroups) {
        //     layout.update();
        // }
    };

    runGameLoop = function() {
        // Update physics
        if (physicsSystem) {
            physicsSystem.update(deltaTime);
        }

        // Update all game objects scripts
        for (const materia of SceneManager.currentScene.materias) {
            if (!materia.isActive) continue;
            materia.update(deltaTime);
        }
    };

    updateScene = function(rendererInstance, isGameView) {
        if (!rendererInstance || !SceneManager.currentScene) return;

        const allMaterias = SceneManager.currentScene.getAllMaterias();
        const materiasToRender = allMaterias
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpriteRenderer))
            .sort((a, b) => a.getComponent(Components.Transform).y - b.getComponent(Components.Transform).y);

        // --- WebGL Path ---
        if (rendererInstance.gl) {
            const camera = isGameView ? SceneManager.currentScene.findAllCameras()[0] : rendererInstance.camera;
            const lights = allMaterias.filter(m => m.getComponent(Components.Light));
            if (camera) {
                rendererInstance.drawScene(materiasToRender, lights, camera, currentProjectConfig);
            } else {
                rendererInstance.clear();
            }
            // Re-enable overlay for WebGL
            if (!isGameView) {
                SceneView.drawOverlay();
            }
            return;
        }

        // --- Canvas 2D Path ---
        const lights = allMaterias.filter(m => m.getComponent(Components.Light));

        const drawObjects = (ctx, cameraForCulling) => {
            const aspect = rendererInstance.canvas.width / rendererInstance.canvas.height;
            const cameraViewBox = cameraForCulling ? MathUtils.getCameraViewBox(cameraForCulling, aspect) : null;

            for (const materia of materiasToRender) {
                if (!materia.isActive) continue;

                // --- Culling Checks ---
                if (cameraForCulling) {
                    // 1. Frustum Culling
                    const objectBounds = MathUtils.getOOB(materia);
                    if (objectBounds && !MathUtils.checkIntersection(cameraViewBox, objectBounds)) {
                        continue; // Skip rendering if not in view
                    }
                    // 2. Culling Mask (Layer-based)
                    const cameraComponent = cameraForCulling.getComponent(Components.Camera);
                    const objectLayerBit = 1 << materia.layer;
                    if ((cameraComponent.cullingMask & objectLayerBit) === 0) {
                        continue; // Skip rendering if layer is masked off
                    }
                }

                const spriteRenderer = materia.getComponent(Components.SpriteRenderer);
                const transform = materia.getComponent(Components.Transform);
                if (spriteRenderer && spriteRenderer.sprite && spriteRenderer.sprite.complete && spriteRenderer.sprite.naturalWidth > 0) {
                    const img = spriteRenderer.sprite;
                    const width = img.naturalWidth * transform.scale.x;
                    const height = img.naturalHeight * transform.scale.y;
                    ctx.save();
                    ctx.translate(transform.x, transform.y);
                    ctx.rotate(transform.rotation * Math.PI / 180);
                    ctx.drawImage(img, -width / 2, -height / 2, width, height);
                    ctx.restore();
                }
            }
        };

        if (isGameView) {
            const cameras = SceneManager.currentScene.findAllCameras()
                .sort((a, b) => a.getComponent(Components.Camera).depth - b.getComponent(Components.Camera).depth);

            if (cameras.length === 0) {
                rendererInstance.clear();
                return;
            }

            cameras.forEach(cameraMateria => {
                rendererInstance.beginWorld(cameraMateria);
                drawObjects(rendererInstance.ctx, cameraMateria);
                rendererInstance.end(); // Finish drawing the main pass

                // Now, apply lighting on top
                const cameraComponent = cameraMateria.getComponent(Components.Camera);
                const transform = cameraMateria.getComponent(Components.Transform);
                let activeCamera = null;
                if(cameraComponent && transform) {
                    const effectiveZoom = rendererInstance.canvas.height / (cameraComponent.orthographicSize * 2 || 1);
                    activeCamera = { x: transform.x, y: transform.y, effectiveZoom: effectiveZoom };
                }

                rendererInstance.drawLights(lights, allMaterias, activeCamera);
                rendererInstance.applyLighting(currentProjectConfig);
            });

        } else { // Editor Scene View
            rendererInstance.beginWorld();
            drawObjects(rendererInstance.ctx, null);
            // Draw gizmos BEFORE lighting is applied
            SceneView.drawOverlay();
            rendererInstance.end(); // Finish the main drawing pass

            // Now, apply lighting as a final overlay
            rendererInstance.drawLights(lights, allMaterias, rendererInstance.camera);
            rendererInstance.applyLighting(currentProjectConfig);
        }
    }

    const editorLoop = (timestamp) => {
        // Calculate deltaTime
        if (lastFrameTime > 0) {
            deltaTime = (timestamp - lastFrameTime) / 1000;
        }
        lastFrameTime = timestamp;

        InputManager.update();
        SceneView.update(); // Handle all editor input logic

        if (isGameRunning) {
        }
        DebugPanel.update();

        // Update layouts before game logic and rendering
        runLayoutUpdate();

        if (isGameRunning) {
            runGameLoop(); // This handles the logic update
            // When game is running, update both views
            if (renderer) updateScene(renderer, false); // Editor view with gizmos
            if (gameRenderer) updateScene(gameRenderer, true); // Game view clean
        } else {
            // When paused, only update the currently active view
            if (activeView === 'scene-content' && renderer) {
                updateScene(renderer, false);
            } else if (activeView === 'game-content' && gameRenderer) {
                updateScene(gameRenderer, true);
            }
        }

        editorLoopId = requestAnimationFrame(editorLoop);
    };

    startGame = function() {
        if (isGameRunning) return;
        isGameRunning = true;
        lastFrameTime = performance.now();
        console.log("Game Started");
        // The main editorLoop will now call runGameLoop
    };

    stopGame = function() {
        if (!isGameRunning) return;
        isGameRunning = false;
        console.log("Game Stopped");
    };


    function showContextMenu(menu, event) {
        hideContextMenus(); // Hide any other open menus
        if (!menu) { // If no menu is provided, we just hide all.
            return;
        }
        menu.style.display = 'block';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
    }

    function hideContextMenus() {
        document.querySelectorAll('.context-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }

    async function extractFramesFromSheet(assetPath, metaData) {
        return new Promise(async (resolve, reject) => {
            const imageUrl = await getURLForAssetPath(assetPath, projectsDirHandle);
            if (!imageUrl) {
                return reject(new Error("No se pudo obtener la URL de la imagen."));
            }

            const img = new Image();
            img.crossOrigin = "Anonymous"; // Handle potential CORS issues if using remote URLs
            img.src = imageUrl;

            img.onload = () => {
                const frames = [];
                const cols = metaData.grid.columns;
                const rows = metaData.grid.rows;
                const frameWidth = img.naturalWidth / cols;
                const frameHeight = img.naturalHeight / rows;

                const canvas = document.createElement('canvas');
                canvas.width = frameWidth;
                canvas.height = frameHeight;
                const ctx = canvas.getContext('2d');

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        ctx.clearRect(0, 0, frameWidth, frameHeight);
                        const sx = c * frameWidth;
                        const sy = r * frameHeight;
                        ctx.drawImage(img, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
                        frames.push(canvas.toDataURL());
                    }
                }
                resolve(frames);
            };

            img.onerror = () => {
                reject(new Error("No se pudo cargar la imagen de la hoja de sprites."));
            };
        });
    }

    // --- 6. Event Listeners & Handlers ---
    let createNewScript; // To be defined

    function setupEventListeners() {
        // Global listener to hide context menus
        window.addEventListener('mousedown', (e) => {
            // Hide if the click is not on a context menu itself
            if (!e.target.closest('.context-menu')) {
                hideContextMenus();
            }
        });

        // Global deselection
        dom.editorContainer.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Ignore right/middle-clicks
            // Deselect if clicking on a panel's background, but not on interactive items
            if (e.target.matches('.panel-content, .panel-header, .editor-panel, #editor-main-content')) {
                 selectMateria(null);
            }
        });

        // Tab switching for the bottom panel (Assets/Console/Debug)
        const tabBar = dom.assetsPanel.querySelector('.tab-bar');
        const contentContainer = dom.assetsPanel.querySelector('.panel-content-container');

        if (tabBar && contentContainer) {
            tabBar.addEventListener('click', (e) => {
                if (e.target.matches('.tab-btn')) {
                    const tabId = e.target.dataset.tab;

                    // Deactivate all buttons and content panels first
                    tabBar.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    contentContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

                    // Activate the clicked button
                    e.target.classList.add('active');

                    // Activate the corresponding content panel
                    const activeContent = contentContainer.querySelector(`#${tabId}`);
                    if (activeContent) {
                        activeContent.classList.add('active');
                    }
                }
            });
        }

        if (dom.prefsSnappingToggle) {
            dom.prefsSnappingToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    dom.prefsSnappingGridSizeGroup.classList.remove('hidden');
                } else {
                    dom.prefsSnappingGridSizeGroup.classList.add('hidden');
                }
            });
        }

        // Logo List Logic
        if (dom.settingsAddLogoBtn) {
            dom.settingsAddLogoBtn.addEventListener('click', async () => {
                try {
                    const [fileHandle] = await window.showOpenFilePicker({
                        types: [{ description: 'Images', accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] } }],
                        multiple: false
                    });
                    addLogoToList(fileHandle);
                } catch (err) {
                    console.log("User cancelled file picker or error occurred:", err);
                }
            });
        }

        function addLogoToList(fileOrPath, duration = 5) {
            const listItem = document.createElement('div');
            listItem.className = 'logo-list-item';

            const img = document.createElement('img');
            const fileName = document.createElement('span');
            fileName.className = 'logo-filename';

            if (fileOrPath.name) { // It's a FileHandle
                fileName.textContent = fileOrPath.name;
                listItem.dataset.path = fileOrPath.name;
                fileOrPath.getFile().then(file => {
                    img.src = URL.createObjectURL(file);
                });
            } else { // It's just a path string from config
                fileName.textContent = fileOrPath;
                listItem.dataset.path = fileOrPath;
                // Can't show preview from path alone after reload for security reasons.
                img.src = 'image/Paquete.png'; // Show placeholder
            }


            const sliderContainer = document.createElement('div');
            sliderContainer.className = 'slider-container';
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = 1;
            slider.max = 10;
            slider.value = duration;
            const durationLabel = document.createElement('span');
            durationLabel.textContent = `${slider.value}s`;
            slider.addEventListener('input', () => {
                durationLabel.textContent = `${slider.value}s`;
            });

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Quitar';
            removeBtn.className = 'danger-btn';
            removeBtn.addEventListener('click', () => {
                listItem.remove();
            });

            sliderContainer.appendChild(slider);
            sliderContainer.appendChild(durationLabel);

            listItem.appendChild(img);
            listItem.appendChild(fileName);
            listItem.appendChild(sliderContainer);
            listItem.appendChild(removeBtn);

            dom.settingsLogoList.appendChild(listItem);
        }

        // Global Keyboard Shortcuts
        window.addEventListener('keydown', handleKeyboardShortcuts);

        // Modal close buttons
        document.querySelectorAll('.modal .close-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('is-open');
            });
        });

        // Canvas resizing
        window.addEventListener('resize', () => {
            if (renderer) renderer.resize();
            if (gameRenderer) gameRenderer.resize();
        });

        // Scene/Game/Code View Toggle Logic
        dom.scenePanel.querySelector('.view-toggle').addEventListener('click', (e) => {
            if (e.target.matches('.view-toggle-btn')) {
                const viewId = e.target.dataset.view;
                activeView = viewId;

                // Update button active states
                dom.scenePanel.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                // Update view content visibility
                dom.scenePanel.querySelectorAll('.view-content').forEach(view => view.classList.remove('active'));
                document.getElementById(viewId).classList.add('active');

                // Show/hide game controls
                const gameControls = dom.scenePanel.querySelector('#game-controls');
                if (viewId === 'scene-content' || viewId === 'game-content') {
                    gameControls.style.display = 'flex';
                } else {
                    gameControls.style.display = 'none';
                }

                // Ensure canvas is resized after being made visible
                if (viewId === 'scene-content' && renderer) {
                    setTimeout(() => renderer.resize(), 0);
                } else if (viewId === 'game-content' && gameRenderer) {
                    setTimeout(() => gameRenderer.resize(), 0);
                }
            }
        });

        // Panel Close Button Logic
        document.querySelectorAll('.close-panel-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const panelId = e.target.dataset.panel;
                const panel = document.getElementById(panelId);
                if (!panel) return;

                panel.classList.add('hidden');
                const panelName = panelId.replace('-panel', '');


                // Only update the main grid layout if a DOCKED panel is closed
                const dockedPanelNames = ['hierarchy', 'inspector', 'assets'];
                if (dockedPanelNames.includes(panelName)) {
                    panelVisibility[panelName] = false;
                    updateEditorLayout();
                }

                // Always try to update the window menu checkmark
                updateWindowMenuUI();
            });
        });

        // Window Menu Logic
        document.getElementById('window-menu-content').addEventListener('click', async (e) => {
            e.preventDefault();
            const targetId = e.target.id;
            let panelName = '';
            // A bit of a hacky way to get the panel name from the menu item id
            if (targetId.startsWith('menu-window-')) {
                panelName = targetId.substring('menu-window-'.length);
            } else {
                return;
            }

            // The assets panel is special, its menu item is 'assets' but panel is 'assets-panel'
            if (panelName === 'assets' || panelName === 'hierarchy' || panelName === 'inspector') {
                 const panel = document.getElementById(`${panelName}-panel`);
                if (panel) {
                    const isVisible = !panel.classList.contains('hidden');
                    panel.classList.toggle('hidden', isVisible);
                    panelVisibility[panelName] = !isVisible;
                    updateEditorLayout();
                    updateWindowMenuUI();
                }
            } else if (panelName === 'ui-editor') {
                openUiEditorFromModule();
            }
        });

        // --- Project Settings Listeners are now in js/editor/ui/ProjectSettingsWindow.js ---


        // --- Preferences Listeners are in js/editor/ui/PreferencesWindow.js ---

        if (dom.prefsResetLayoutBtn) {
            dom.prefsResetLayoutBtn.addEventListener('click', () => {
                // Remove inline styles that were added by the resizers
                dom.editorMainContent.style.gridTemplateColumns = '';
                dom.editorMainContent.style.gridTemplateRows = '';

                // Show all panels
                panelVisibility.hierarchy = true;
                panelVisibility.inspector = true;
                panelVisibility.assets = true;

                // Hide the floating panels
                dom.animationPanel.classList.add('hidden');
                dom.animatorControllerPanel.classList.add('hidden');

                // Update the layout and menu checks
                updateEditorLayout();
                updateWindowMenuUI();

                alert("El diseño de los paneles ha sido restablecido.");
            });
        }

        // Keystore Creation Logic
        if (dom.ksGenerateBtn) {
            dom.ksGenerateBtn.addEventListener('click', async () => {
                // Validate form
                const requiredFields = ['ks-alias', 'ks-password', 'ks-storepass', 'ks-cn', 'ks-ou', 'ks-o', 'ks-l', 'ks-st', 'ks-c', 'ks-filename'];
                for (const id of requiredFields) {
                    const element = document.getElementById(id);
                    if (!element.value) {
                        alert(`El campo '${element.previousElementSibling.textContent}' es obligatorio.`);
                        return;
                    }
                }
                if (dom.ksPassword.value.length < 6) {
                    alert("La contraseña de la clave debe tener al menos 6 caracteres.");
                    return;
                }

                // Construct the dname
                const dname = `CN=${dom.ksCn.value}, OU=${dom.ksOu.value}, O=${dom.ksO.value}, L=${dom.ksL.value}, ST=${dom.ksSt.value}, C=${dom.ksC.value}`;

                // Construct the command
                const command = `keytool -genkey -v -keystore ${dom.ksFilename.value} -alias ${dom.ksAlias.value} -keyalg RSA -keysize 2048 -validity ${dom.ksValidity.value * 365} -storepass ${dom.ksStorepass.value} -keypass ${dom.ksPassword.value} -dname "${dname}"`;

                dom.ksCommandTextarea.value = command;
                dom.ksCommandOutput.classList.remove('hidden');

                alert("Comando generado. Cópialo y ejecútalo en una terminal con JDK instalado para crear tu archivo keystore.");
            });
        }

        if (dom.settingsKeystorePickerBtn) {
            dom.settingsKeystorePickerBtn.addEventListener('click', async () => {
                try {
                    const [fileHandle] = await window.showOpenFilePicker({ multiple: false });
                    currentProjectConfig.keystore.path = fileHandle.name;
                    dom.settingsKeystorePath.value = fileHandle.name;
                } catch (err) {
                    console.log("User cancelled file picker or error occurred:", err);
                }
            });
        }

        if (dom.cancelDisableLogoBtn) {
            dom.cancelDisableLogoBtn.addEventListener('click', () => {
                dom.settingsShowEngineLogo.checked = true;
                dom.engineLogoConfirmModal.classList.remove('is-open');
            });
        }


        // --- Panel Resizing Logic ---
        function initResizer(resizer, direction) {
            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                document.body.style.cursor = direction === 'col' ? 'col-resize' : 'row-resize';
                document.body.style.userSelect = 'none';

                const onMouseMove = (moveEvent) => {
                    const mainContent = dom.editorMainContent;
                    const rect = mainContent.getBoundingClientRect();

                    // Use getComputedStyle to get the real pixel values of the grid tracks
                    const style = window.getComputedStyle(mainContent);
                    const columns = style.gridTemplateColumns.split(' ').map(s => parseFloat(s));
                    const rows = style.gridTemplateRows.split(' ').map(s => parseFloat(s));

                    const MIN_PANEL_WIDTH = 150;
                    const MIN_CENTER_WIDTH = 200;
                    const MIN_ASSETS_HEIGHT = 100;

                    if (direction === 'col') {
                        if (resizer.id === 'resizer-left') {
                            let newWidth = moveEvent.clientX - rect.left;
                            // Ensure the center panel doesn't get too small
                            const maxAllowedWidth = rect.width - MIN_CENTER_WIDTH - columns[4] - (columns[1] + columns[3]);
                            newWidth = Math.min(newWidth, maxAllowedWidth);
                            // Ensure the panel itself doesn't get too small
                            newWidth = Math.max(MIN_PANEL_WIDTH, newWidth);
                            mainContent.style.gridTemplateColumns = `${newWidth}px ${columns[1]}px 1fr ${columns[3]}px ${columns[4]}px`;

                        } else if (resizer.id === 'resizer-right') {
                            let newWidth = rect.right - moveEvent.clientX;
                            // Ensure the center panel doesn't get too small
                            const maxAllowedWidth = rect.width - MIN_CENTER_WIDTH - columns[0] - (columns[1] + columns[3]);
                            newWidth = Math.min(newWidth, maxAllowedWidth);
                            // Ensure the panel itself doesn't get too small
                            newWidth = Math.max(MIN_PANEL_WIDTH, newWidth);
                            mainContent.style.gridTemplateColumns = `${columns[0]}px ${columns[1]}px 1fr ${columns[3]}px ${newWidth}px`;
                        }
                    } else { // 'row'
                        let newHeight = rect.bottom - moveEvent.clientY;
                        // Ensure the scene panel doesn't get too small
                        const maxAllowedHeight = rect.height - MIN_CENTER_WIDTH - rows[1];
                        newHeight = Math.min(newHeight, maxAllowedHeight);
                        // Ensure the panel itself doesn't get too small
                        newHeight = Math.max(MIN_ASSETS_HEIGHT, newHeight);
                        mainContent.style.gridTemplateRows = `1fr ${rows[1]}px ${newHeight}px`;
                    }

                    // Resize canvas in real-time
                    if (renderer) renderer.resize();
                    if (gameRenderer) gameRenderer.resize();
                };

                const onMouseUp = () => {
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        }

        initResizer(dom.resizerLeft, 'col');
        initResizer(dom.resizerRight, 'col');
        initResizer(dom.resizerBottom, 'row');
    }

    // --- 7. Initial Setup ---
    async function initializeEditor() {
        // --- 7a. Cache DOM elements, including the new loading panel ---
        const ids = [
            'editor-container', 'menubar', 'editor-toolbar', 'editor-main-content', 'hierarchy-panel', 'hierarchy-content',
            'scene-panel', 'scene-content', 'inspector-panel', 'assets-panel', 'assets-content', 'console-content',
            'project-name-display', 'debug-content', 'context-menu', 'hierarchy-context-menu', 'anim-node-context-menu',
            'preferences-modal', 'code-editor-content', 'add-component-modal', 'component-list', 'sprite-selector-modal',
            'sprite-selector-grid', 'codemirror-container', 'asset-folder-tree', 'asset-grid-view', 'animation-panel',
            'drawing-canvas', 'code-save-btn', 'code-undo-btn', 'code-redo-btn', 'drawing-tools', 'drawing-color-picker',
            'add-frame-btn', 'delete-frame-btn', 'animation-timeline', 'animation-panel-overlay', 'animation-edit-view',
            'animation-playback-view', 'animation-playback-canvas', 'animation-play-btn', 'animation-stop-btn',
            'animation-save-btn', 'current-scene-name', 'animator-controller-panel', 'drawing-canvas-container',
            'anim-onion-skin-canvas', 'anim-grid-canvas', 'anim-bg-toggle-btn', 'anim-grid-toggle-btn',
            'anim-onion-toggle-btn', 'timeline-toggle-btn', 'project-settings-modal', 'settings-app-name',
            'settings-author-name', 'settings-app-version', 'settings-engine-version', 'settings-icon-preview',
            'settings-icon-picker-btn', 'settings-logo-list', 'settings-add-logo-btn', 'settings-show-engine-logo',
            'settings-keystore-path', 'settings-keystore-picker-btn', 'settings-keystore-pass', 'settings-key-alias',
            'settings-key-pass', 'settings-export-project-btn', 'settings-save-btn', 'engine-logo-confirm-modal',
            'confirm-disable-logo-btn', 'cancel-disable-logo-btn', 'keystore-create-modal', 'keystore-create-btn',
            'ks-alias', 'ks-password', 'ks-validity', 'ks-cn', 'ks-ou', 'ks-o', 'ks-l', 'ks-st', 'ks-c', 'ks-filename',
            'ks-storepass', 'ks-command-output', 'ks-command-textarea', 'ks-generate-btn', 'settings-sorting-layer-list',
            'new-sorting-layer-name', 'add-sorting-layer-btn', 'settings-collision-layer-list', 'new-collision-layer-name',
            'add-collision-layer-btn', 'settings-tag-list', 'new-tag-name', 'add-tag-btn', 'settings-layer-list', 'prefs-theme', 'prefs-custom-theme-picker', 'prefs-color-bg', 'prefs-color-header',
            'prefs-color-accent', 'prefs-autosave-toggle', 'prefs-autosave-interval-group', 'prefs-autosave-interval',
            'prefs-save-btn', 'prefs-script-lang', 'prefs-snapping-toggle', 'prefs-snapping-grid-size-group',
            'prefs-snapping-grid-size', 'prefs-reset-layout-btn', 'toolbar-music-btn', 'music-player-panel',
            'now-playing-bar', 'now-playing-title', 'playlist-container', 'music-controls', 'music-add-btn',
            'music-prev-btn', 'music-play-pause-btn', 'music-next-btn', 'music-volume-slider', 'export-description-modal',
            'export-description-text', 'export-description-next-btn', 'package-file-tree-modal', 'package-modal-title',
            'package-modal-description', 'package-file-tree-container', 'package-export-controls', 'package-import-controls',
            'export-filename', 'export-confirm-btn', 'import-confirm-btn', 'resizer-left', 'resizer-right', 'resizer-bottom',
            'ui-editor-panel', 'ui-save-btn', 'ui-maximize-btn', 'ui-editor-layout', 'ui-hierarchy-panel', 'ui-canvas-panel',
            'ui-canvas-container', 'ui-canvas', 'ui-inspector-panel', 'ui-resizer-left', 'ui-resizer-right',
            // New Loading Panel Elements
            'loading-overlay', 'loading-status-message', 'progress-bar', 'loading-error-section', 'loading-error-message',
            'btn-retry-loading', 'btn-back-to-launcher'
        ];
        ids.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
            dom[camelCaseId] = document.getElementById(id);
        });
        dom.inspectorContent = dom.inspectorPanel.querySelector('.panel-content');
        dom.sceneCanvas = document.getElementById('scene-canvas');
        dom.gameCanvas = document.getElementById('game-canvas');

        // --- 7b. Loading Progress Helper ---
        const updateLoadingProgress = (percentage, message) => {
            if (dom.progressBar) dom.progressBar.style.width = `${percentage}%`;
            if (dom.loadingStatusMessage) dom.loadingStatusMessage.textContent = message;
            console.log(`Loading: ${percentage}% - ${message}`);
        };

        // --- 7c. Override console.log to also log to UI ---
        const originalLog = console.log, originalWarn = console.warn, originalError = console.error;
        function logToUIConsole(message, type = 'log') {
            if (!dom.consoleContent) return;
            const msgEl = document.createElement('p');
            msgEl.className = `console-msg log-${type}`;
            msgEl.textContent = `> ${message}`;
            dom.consoleContent.appendChild(msgEl);
            dom.consoleContent.scrollTop = dom.consoleContent.scrollHeight;
        }
        console.log = function(message, ...args) { logToUIConsole(message, 'log'); originalLog.apply(console, [message, ...args]); };
        console.warn = function(message, ...args) { logToUIConsole(message, 'warn'); originalWarn.apply(console, [message, ...args]); };
        console.error = function(message, ...args) { logToUIConsole(message, 'error'); originalError.apply(console, [message, ...args]); };

        // --- 7d. Main Initialization Logic with Progress Updates ---
        try {
            updateLoadingProgress(5, "Conectando a la base de datos local...");
            await openDB();

            updateLoadingProgress(10, "Accediendo al directorio de proyectos...");
            projectsDirHandle = await getDirHandle();
            if (!projectsDirHandle) {
                throw new Error("No se encontró el directorio de proyectos. Por favor, vuelve al inicio y selecciona un directorio.");
            }
            const projectName = new URLSearchParams(window.location.search).get('project');
            dom.projectNameDisplay.textContent = `Proyecto: ${projectName}`;

            updateLoadingProgress(20, "Cargando configuración del proyecto...");
            await loadProjectConfig();

            updateLoadingProgress(25, "Inicializando renderizadores...");
            const RendererClass = currentProjectConfig?.graphics?.renderer === 'webgl' ? WebGLRenderer : Renderer;
            console.log(`Usando renderizador: ${RendererClass.name}`);
            renderer = new RendererClass(dom.sceneCanvas, true);
            gameRenderer = new RendererClass(dom.gameCanvas);

            updateLoadingProgress(30, "Cargando escena principal...");
            const sceneData = await SceneManager.initialize(projectsDirHandle);
            if (sceneData) {
                SceneManager.setCurrentScene(sceneData.scene);
                SceneManager.setCurrentSceneFileHandle(sceneData.fileHandle);
                dom.currentSceneName.textContent = sceneData.fileHandle.name.replace('.ceScene', '');
                SceneManager.setSceneDirty(false);
            } else {
                throw new Error("¡Fallo crítico! No se pudo cargar o crear una escena.");
            }

            updateLoadingProgress(40, "Activando sistema de físicas...");
            physicsSystem = new PhysicsSystem(SceneManager.currentScene);
            InputManager.initialize(dom.sceneCanvas);

            // --- Define Callbacks & Helpers ---
            const getSelectedAsset = () => { /* ... (existing code) ... */ return null; };
            const extractFramesAndCreateAsset = async (assetPath, metaData, animName, dirHandle) => { /* ... (existing code) ... */ };
            const onAssetSelected = (assetName, assetPath, assetKind) => { /* ... (existing code) ... */ };
            const onAssetOpened = async (name, fileHandle, dirHandle) => { /* ... (existing code) ... */ };
            const onExportPackage = async (assetName) => { /* ... (existing code) ... */ };
            const getActiveView = () => activeView;
            const getSelectedMateria = () => selectedMateria;
            const getIsGameRunning = () => isGameRunning;
            const getDeltaTime = () => deltaTime;
            const getActiveTool = () => SceneView.getActiveTool ? SceneView.getActiveTool() : 'move';

            updateLoadingProgress(50, "Configurando módulos del editor...");
            const exportContext = { type: null, description: '', rootHandle: null, fileName: '' };
            initializeUIEditor(dom);
            initializeMusicPlayer(dom);
            initializeImportExport({ dom, exportContext, getCurrentDirectoryHandle, updateAssetBrowser, projectsDirHandle });
            CodeEditor.initialize(dom);
            DebugPanel.initialize({ dom, InputManager, SceneManager, getActiveTool, getSelectedMateria, getIsGameRunning, getDeltaTime });
            SceneView.initialize({ dom, renderer, InputManager, getSelectedMateria, selectMateria, updateInspector, Components, updateScene, SceneManager });

            updateLoadingProgress(60, "Aplicando preferencias...");
            initializePreferences(dom, CodeEditor.saveCurrentScript);
            initializeProjectSettings(dom, projectsDirHandle, currentProjectConfig);
            initializeAnimationEditor({ dom, projectsDirHandle, getCurrentDirectoryHandle, updateWindowMenuUI });
            initializeAnimatorController({ dom, projectsDirHandle, updateWindowMenuUI });

            updateLoadingProgress(70, "Construyendo interfaz...");
            initializeHierarchy({ dom, SceneManager, projectsDirHandle, selectMateriaCallback: selectMateria, showContextMenuCallback: showContextMenu, getSelectedMateria: () => selectedMateria, updateInspector });
            initializeInspector({ dom, projectsDirHandle, currentDirectoryHandle: getCurrentDirectoryHandle, getSelectedMateria: () => selectedMateria, getSelectedAsset, openSpriteSelectorCallback: openSpriteSelector, saveAssetMetaCallback: saveAssetMeta, extractFramesFromSheetCallback: extractFramesAndCreateAsset, updateSceneCallback: () => updateScene(renderer, false), getCurrentProjectConfig: () => currentProjectConfig, showdown, updateAssetBrowserCallback: updateAssetBrowser });
            initializeAssetBrowser({ dom, projectsDirHandle, exportContext, onAssetSelected, onAssetOpened, onShowContextMenu: showContextMenu, onExportPackage, createUiSystemFile, updateAssetBrowser });

            updateLoadingProgress(85, "Actualizando paneles...");
            updateHierarchy();
            updateInspector();
            await updateAssetBrowser();
            updateWindowMenuUI();

            updateLoadingProgress(90, "Finalizando...");
            setupEventListeners();
            initializeFloatingPanels();
            editorLoopId = requestAnimationFrame(editorLoop);

            const oldPlayButton = document.getElementById('btn-play');
            const newPlayButton = oldPlayButton.cloneNode(true);
            oldPlayButton.parentNode.replaceChild(newPlayButton, oldPlayButton);
            dom.btnPlay = newPlayButton;
            dom.btnPlay.addEventListener('click', runChecksAndPlay);
            originalStartGame = startGame;
            startGame = runChecksAndPlay;

            updateLoadingProgress(100, "¡Listo!");

            // Fade out the loading screen and show the editor
            setTimeout(() => {
                dom.loadingOverlay.classList.add('hidden');
                dom.editorContainer.style.display = 'flex';

                // Force a resize of the renderers now that the canvas is visible
                if (renderer) renderer.resize();
                if (gameRenderer) gameRenderer.resize();
            }, 500);

        } catch (error) {
            console.error("Fallo la inicialización del editor:", error);
            displayCriticalError(error, `Error durante la carga: ${error.message}`);
        }
    }

    function displayCriticalError(error, message) {
        console.error("Displaying critical error:", message || error.message);

        // Use the new loading panel for errors
        const loadingOverlay = document.getElementById('loading-overlay');
        const errorSection = document.getElementById('loading-error-section');
        const errorMessageEl = document.getElementById('loading-error-message');
        const retryBtn = document.getElementById('btn-retry-loading');
        const backBtn = document.getElementById('btn-back-to-launcher');

        if (loadingOverlay && errorSection && errorMessageEl && retryBtn && backBtn) {
            // Ensure the overlay is visible
            loadingOverlay.classList.remove('hidden');

            // Hide progress bar, show error section
            const progressBarContainer = document.querySelector('.progress-bar-container');
            if (progressBarContainer) progressBarContainer.style.display = 'none';

            errorMessageEl.textContent = `Error: ${message || error.message}. Revisa la consola para más detalles.`;
            errorSection.style.display = 'block';

            // Attach event listeners for the buttons
            retryBtn.onclick = () => window.location.reload();
            backBtn.onclick = () => window.location.href = 'index.html';
        } else {
            // Fallback to the old alert method if the new panel isn't found
            document.body.innerHTML = `<div style="color: white; background-color: #1e1e1e; padding: 20px;">
                <h1>Error Crítico</h1>
                <p>${message || error.message}</p>
                <pre>${error.stack}</pre>
            </div>`;
        }
    }

    initializeEditor();
});
