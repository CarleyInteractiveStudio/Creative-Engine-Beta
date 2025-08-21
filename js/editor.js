// --- CodeMirror Integration ---
import { InputManager } from './engine/Input.js';
import * as SceneManager from './engine/SceneManager.js';
import { uiEventSystem } from './engine/UIEventSystem.js';
import {EditorView, basicSetup} from "https://esm.sh/codemirror@6.0.1";
import {javascript} from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { CreativeScript, RectTransform, UICanvas, UIImage, UIPanel, UIMask, UIText, UIButton, Rigidbody, BoxCollider, SpriteRenderer, Animator, Animation, Camera, Transform, HorizontalLayoutGroup, VerticalLayoutGroup, GridLayoutGroup } from './engine/Components.js';
import { Materia } from './engine/Materia.js';
import {oneDark} from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import {undo, redo} from "https://esm.sh/@codemirror/commands@6.3.3";
import {autocompletion} from "https://esm.sh/@codemirror/autocomplete@6.16.0";

// --- Autocomplete Logic for Creative Engine Script ---
const cesKeywords = [
  {label: "public", type: "keyword"},
  {label: "private", type: "keyword"},
  {label: "sprite", type: "type"},
  {label: "SpriteAnimacion", type: "type"},
  {label: "crear", type: "function"},
  {label: "destruir", type: "function"},
  {label: "reproducir", type: "function"},
  {label: "obtener", type: "function"},
  {label: "si", type: "keyword"},
  {label: "sino", type: "keyword"},
  {label: "para", type: "keyword"},
  {label: "mientras", type: "keyword"},
  {label: "start", type: "function"},
  {label: "update", type: "function"}
];

function cesCompletions(context) {
  let word = context.matchBefore(/\w*/);
  if (word.from == word.to && !context.explicit) {
    return null;
  }
  return {
    from: word.from,
    options: cesKeywords
  };
}

// --- Editor Logic ---
document.addEventListener('DOMContentLoaded', () => {

    // --- Engine Core Classes ---

    class Renderer {
        constructor(canvas, isEditor = false) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.camera = null; // Will be assigned from the scene
            this.isEditor = isEditor;
            this.resize();
        }

        resize() {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
        }

        begin() {
            const sceneCameraMateria = SceneManager.currentScene.findFirstCamera();
            let cameraComponent;
            let cameraTransform;

            if (sceneCameraMateria) {
                cameraComponent = sceneCameraMateria.getComponent(Camera);
                cameraTransform = sceneCameraMateria.getComponent(Transform);
            }

            // The editor renderer creates a default camera if none exists.
            // The game renderer will have a null camera and won't render.
            if (!cameraComponent && this.isEditor) {
                cameraComponent = { orthographicSize: 500, zoom: 1.0 }; // A dummy for default view
                cameraTransform = { x: 0, y: 0 };
            }

            this.camera = cameraComponent ? {
                ...cameraComponent,
                x: cameraTransform.x,
                y: cameraTransform.y,
                // Game view zoom is determined by ortho size, editor can have its own zoom
                effectiveZoom: this.isEditor ? cameraComponent.zoom : (this.canvas.height / (cameraComponent.orthographicSize * 2))
            } : null;

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.save();

            if (!this.camera) return;

            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.scale(this.camera.effectiveZoom, this.camera.effectiveZoom);
            this.ctx.translate(-this.camera.x, -this.camera.y);
        }

        end() {
            this.ctx.restore();
        }

        drawRect(x, y, width, height, color) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
        }

        // Placeholder for now
        drawImage(image, x, y, width, height) {
            this.ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
        }

        drawText(text, x, y, color, fontSize, textTransform) {
            this.ctx.fillStyle = color;
            this.ctx.font = `${fontSize}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            let transformedText = text;
            if (textTransform === 'uppercase') {
                transformedText = text.toUpperCase();
            } else if (textTransform === 'lowercase') {
                transformedText = text.toLowerCase();
            }

            this.ctx.fillText(transformedText, x, y);
        }
    }

    class PhysicsSystem {
        constructor(scene) {
            this.scene = scene;
            this.gravity = { x: 0, y: 98.1 }; // A bit exaggerated for visible effect
        }

        update(deltaTime) {
            // Update positions based on velocity
            for (const materia of this.scene.materias) {
                const rigidbody = materia.getComponent(Rigidbody);
                const transform = materia.getComponent(Transform);

                if (rigidbody && transform && rigidbody.bodyType === 'dynamic') {
                    rigidbody.velocity.y += this.gravity.y * deltaTime;
                    transform.x += rigidbody.velocity.x * deltaTime;
                    transform.y += rigidbody.velocity.y * deltaTime;
                }
            }

            // Collision detection
            const collidables = this.scene.materias.filter(m => m.getComponent(BoxCollider));
            for (let i = 0; i < collidables.length; i++) {
                for (let j = i + 1; j < collidables.length; j++) {
                    const materiaA = collidables[i];
                    const materiaB = collidables[j];

                    const transformA = materiaA.getComponent(Transform);
                    const colliderA = materiaA.getComponent(BoxCollider);
                    const transformB = materiaB.getComponent(Transform);
                    const colliderB = materiaB.getComponent(BoxCollider);

                    const leftA = transformA.x - colliderA.width / 2;
                    const rightA = transformA.x + colliderA.width / 2;
                    const topA = transformA.y - colliderA.height / 2;
                    const bottomA = transformA.y + colliderA.height / 2;

                    const leftB = transformB.x - colliderB.width / 2;
                    const rightB = transformB.x + colliderB.width / 2;
                    const topB = transformB.y - colliderB.height / 2;
                    const bottomB = transformB.y + colliderB.height / 2;

                    if (rightA > leftB && leftA < rightB && bottomA > topB && topA < bottomB) {
                        console.log(`Colisión detectada entre: ${materiaA.name} y ${materiaB.name}`);
                    }
                }
            }
        }
    }

    // --- 1. Editor State ---
    let projectsDirHandle = null, codeEditor, currentlyOpenFileHandle = null;
    let selectedMateria = null;
    let renderer = null, gameRenderer = null;
    let activeView = 'scene-content'; // 'scene-content', 'game-content', or 'code-editor-content'
    let currentDirectoryHandle = { handle: null, path: '' }; // To track the folder selected in the asset browser
    const panelVisibility = {
        hierarchy: true,
        inspector: true,
        assets: true,
        animator: false, // For the new controller panel
    };
    let physicsSystem = null;
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0; let activeTool = 'move'; // 'move', 'pan', 'scale'
    let isPanning = false;
    let dragState = {}; // To hold info about the current drag operation

    // Animation Editor State
    let isDrawing = false;
    let drawingTool = 'pencil';
    let drawingMode = 'free'; // 'free' or 'pixel'
    let drawingColor = '#ffffff';
    let lastDrawPos = { x: 0, y: 0 };
    let isMovingPanel = false;
    let currentAnimationAsset = null; // Holds the parsed .cea file content
    let currentAnimationFileHandle = null; // Holds the file handle for saving
    let currentFrameIndex = -1;
    let isAnimationPlaying = false;
    let animationPlaybackId = null;
    let panelMoveOffset = { x: 0, y: 0 };
    let panelMoveState = {};
    let isResizingPanel = false;
    let panelResizeState = {};


    let isGameRunning = false;
    let lastFrameTime = 0;
    let editorLoopId = null;
    let deltaTime = 0;
    let isScanningForComponents = false;

    // Animator Controller State
    let currentControllerHandle = null;
    let currentControllerData = null;
    let graphView = null; // Will be the graph DOM element
    let isDraggingNode = false;
    let dragNodeInfo = {};

    // Project Settings State
    let currentProjectConfig = {};
    // Editor Preferences State
    let currentPreferences = {};
    let autoSaveIntervalId = null;

    // Music Player State
    let playlist = [];
    let currentTrackIndex = -1;
    let audioElement = new Audio();

    // Export/Import State
    let exportContext = {
        type: null, // 'project' or 'asset'
        description: '',
        rootHandle: null,
        fileName: ''
    };
    let exportFileHandleMap = new Map();


    // --- 2. DOM Elements ---
    const dom = {};

    // --- 3. IndexedDB Logic & 4. Console Override ---
    const dbName = 'CreativeEngineDB'; let db; function openDB() { return new Promise((resolve, reject) => { const request = indexedDB.open(dbName, 1); request.onerror = () => reject('Error opening DB'); request.onsuccess = (e) => { db = e.target.result; resolve(db); }; request.onupgradeneeded = (e) => { e.target.result.createObjectStore('settings', { keyPath: 'id' }); }; }); }
    function getDirHandle() { if (!db) return Promise.resolve(null); return new Promise((resolve) => { const request = db.transaction(['settings'], 'readonly').objectStore('settings').get('projectsDirHandle'); request.onsuccess = () => resolve(request.result ? request.result.handle : null); request.onerror = () => resolve(null); }); }
    const originalLog = console.log, originalWarn = console.warn, originalError = console.error; function logToUIConsole(message, type = 'log') { if (!dom.consoleContent) return; const msgEl = document.createElement('p'); msgEl.className = `console-msg log-${type}`; msgEl.textContent = `> ${message}`; dom.consoleContent.appendChild(msgEl); dom.consoleContent.scrollTop = dom.consoleContent.scrollHeight; }
    console.log = function(message, ...args) { logToUIConsole(message, 'log'); originalLog.apply(console, [message, ...args]); }; console.warn = function(message, ...args) { logToUIConsole(message, 'warn'); originalWarn.apply(console, [message, ...args]); }; console.error = function(message, ...args) { logToUIConsole(message, 'error'); originalError.apply(console, [message, ...args]); };

    // --- 5. Core Editor Functions ---
    var updateAssetBrowser, createScriptFile, openScriptInEditor, saveCurrentScript, updateHierarchy, updateInspector, updateScene, selectMateria, showAddComponentModal, startGame, runGameLoop, stopGame, updateDebugPanel, updateInspectorForAsset, openAnimationAsset, addFrameFromCanvas, loadScene, saveScene, serializeScene, deserializeScene, exportPackage, openSpriteSelector, saveAssetMeta, runChecksAndPlay, originalStartGame, loadProjectConfig, saveProjectConfig, runLayoutUpdate;

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
            await saveProjectConfig(false);
        }

        // Ensure layers config exists for older projects
        if (!currentProjectConfig.layers) {
            currentProjectConfig.layers = {
                sortingLayers: ['Default', 'UI'],
                collisionLayers: ['Default', 'Player', 'Enemy', 'Ground']
            };
        }

        // Populate the UI
        if (dom.settingsAppName) dom.settingsAppName.value = currentProjectConfig.appName;
        if (dom.settingsAuthorName) dom.settingsAuthorName.value = currentProjectConfig.authorName;
        if (dom.settingsAppVersion) dom.settingsAppVersion.value = currentProjectConfig.appVersion;
        if (dom.settingsShowEngineLogo) dom.settingsShowEngineLogo.checked = currentProjectConfig.showEngineLogo;
        if (dom.settingsKeystorePath) dom.settingsKeystorePath.value = currentProjectConfig.keystore.path;

        if (dom.settingsIconPreview && currentProjectConfig.iconPath) {
            // We can't get a direct URL from a file handle for security reasons after page reload.
            // We will just show that a path is set. A real app might store this differently.
            dom.settingsIconPreview.style.display = 'block';
            dom.settingsIconPreview.src = 'image/Paquete.png'; // Placeholder image
        }

        // Populate logo list
        dom.settingsLogoList.innerHTML = ''; // Clear existing
        if (currentProjectConfig.splashLogos && currentProjectConfig.splashLogos.length > 0) {
            currentProjectConfig.splashLogos.forEach(logoData => {
                addLogoToList(logoData.path, logoData.duration);
            });
        }

        // Populate Layer lists
        populateLayerLists();
    };

    function populateLayerLists() {
        if (!currentProjectConfig.layers) return;

        const createLayerItem = (name, index, type) => {
            const item = document.createElement('div');
            item.className = 'layer-item';
            item.textContent = `${index}: ${name}`;

            // The first few layers are often built-in and shouldn't be removed
            if (index > 0) { // Assuming 'Default' at index 0 is protected
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-layer-btn';
                removeBtn.textContent = '×';
                removeBtn.title = 'Quitar layer';
                removeBtn.addEventListener('click', () => {
                    if (confirm(`¿Estás seguro de que quieres quitar el layer '${name}'?`)) {
                        if (type === 'sorting') {
                            currentProjectConfig.layers.sortingLayers.splice(index, 1);
                        } else {
                            currentProjectConfig.layers.collisionLayers.splice(index, 1);
                        }
                        populateLayerLists(); // Re-render the lists
                    }
                });
                item.appendChild(removeBtn);
            }
            return item;
        };

        dom.settingsSortingLayerList.innerHTML = '';
        currentProjectConfig.layers.sortingLayers.forEach((name, index) => {
            dom.settingsSortingLayerList.appendChild(createLayerItem(name, index, 'sorting'));
        });

        dom.settingsCollisionLayerList.innerHTML = '';
        currentProjectConfig.layers.collisionLayers.forEach((name, index) => {
            dom.settingsCollisionLayerList.appendChild(createLayerItem(name, index, 'collision'));
        });
    }

    // --- Preferences Logic ---
    function applyPreferences() {
        if (!currentPreferences) return;

        // Apply theme
        const theme = currentPreferences.theme;
        if (theme === 'custom') {
            document.documentElement.setAttribute('data-theme', 'custom');
            document.documentElement.style.setProperty('--bg-secondary', currentPreferences.customColors.bg);
            document.documentElement.style.setProperty('--bg-tertiary', currentPreferences.customColors.header);
            document.documentElement.style.setProperty('--accent-color', currentPreferences.customColors.accent);
        } else {
            document.documentElement.removeAttribute('style'); // Clear custom colors
            document.documentElement.setAttribute('data-theme', theme || 'dark-modern');
        }

        // Apply autosave
        if (currentPreferences.autosave) {
            if (autoSaveIntervalId) clearInterval(autoSaveIntervalId); // Clear previous interval
            autoSaveIntervalId = setInterval(saveCurrentScript, currentPreferences.autosaveInterval * 1000);
        } else {
            if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
        }
    }

    function savePreferences() {
        // Gather data from UI
        currentPreferences.theme = dom.prefsTheme.value;
        if (currentPreferences.theme === 'custom') {
            currentPreferences.customColors = {
                bg: dom.prefsColorBg.value,
                header: dom.prefsColorHeader.value,
                accent: dom.prefsColorAccent.value
            };
        }
        currentPreferences.autosave = dom.prefsAutosaveToggle.checked;
        currentPreferences.autosaveInterval = dom.prefsAutosaveInterval.value;
        currentPreferences.scriptLang = dom.prefsScriptLang.value;
        currentPreferences.snapping = dom.prefsSnappingToggle.checked;
        currentPreferences.gridSize = dom.prefsSnappingGridSize.value;

        localStorage.setItem('creativeEnginePrefs', JSON.stringify(currentPreferences));
        applyPreferences();
        alert("Preferencias guardadas.");
        dom.preferencesModal.classList.remove('is-open');
    }

    function loadPreferences() {
        const savedPrefs = localStorage.getItem('creativeEnginePrefs');
        if (savedPrefs) {
            currentPreferences = JSON.parse(savedPrefs);
        } else {
            // Default preferences
            currentPreferences = {
                theme: 'dark-modern',
                customColors: { bg: '#2d2d30', header: '#3f3f46', accent: '#0e639c' },
                autosave: false,
                autosaveInterval: 30,
                scriptLang: 'ces',
                snapping: false,
                gridSize: 25
            };
        }

        // Populate UI
        if (dom.prefsTheme) dom.prefsTheme.value = currentPreferences.theme;
        if (dom.prefsColorBg) dom.prefsColorBg.value = currentPreferences.customColors.bg;
        if (dom.prefsColorHeader) dom.prefsColorHeader.value = currentPreferences.customColors.header;
        if (dom.prefsColorAccent) dom.prefsColorAccent.value = currentPreferences.customColors.accent;
        if (dom.prefsAutosaveToggle) dom.prefsAutosaveToggle.checked = currentPreferences.autosave;
        if (dom.prefsAutosaveInterval) dom.prefsAutosaveInterval.value = currentPreferences.autosaveInterval;
        if (dom.prefsScriptLang) dom.prefsScriptLang.value = currentPreferences.scriptLang;
        if (dom.prefsSnappingToggle) dom.prefsSnappingToggle.checked = currentPreferences.snapping;
        if (dom.prefsSnappingGridSize) dom.prefsSnappingGridSize.value = currentPreferences.gridSize;

        // Show/hide relevant fields based on loaded prefs
        if (dom.prefsTheme.value === 'custom') {
            dom.prefsCustomThemePicker.classList.remove('hidden');
        } else {
            dom.prefsCustomThemePicker.classList.add('hidden');
        }
        if (dom.prefsAutosaveToggle.checked) {
            dom.prefsAutosaveIntervalGroup.classList.remove('hidden');
        } else {
            dom.prefsAutosaveIntervalGroup.classList.add('hidden');
        }


        applyPreferences();
    }


    saveProjectConfig = async function(showAlert = true) {
        if (!projectsDirHandle) {
            if(showAlert) alert("El directorio del proyecto no está disponible.");
            return;
        }

        // Gather data from UI if the modal is open, otherwise save the current state
        if (dom.projectSettingsModal.classList.contains('is-open')) {
            currentProjectConfig.appName = dom.settingsAppName.value;
            currentProjectConfig.authorName = dom.settingsAuthorName.value;
            currentProjectConfig.appVersion = dom.settingsAppVersion.value;
            currentProjectConfig.showEngineLogo = dom.settingsShowEngineLogo.checked;
            currentProjectConfig.keystore.pass = dom.settingsKeystorePass.value;
            currentProjectConfig.keystore.alias = dom.settingsKeyAlias.value;
            currentProjectConfig.keystore.aliasPass = dom.settingsKeyPass.value;
            // The iconPath and keystore.path are updated directly by the pickers

            // Gather logo data from the DOM
            currentProjectConfig.splashLogos = [];
            const logoItems = dom.settingsLogoList.querySelectorAll('.logo-list-item');
            logoItems.forEach(item => {
                currentProjectConfig.splashLogos.push({
                    path: item.dataset.path,
                    duration: item.querySelector('input[type=range]').value
                });
            });
        }

        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            const configFileHandle = await projectHandle.getFileHandle('project.ceconfig', { create: true });
            const writable = await configFileHandle.createWritable();
            await writable.write(JSON.stringify(currentProjectConfig, null, 2));
            await writable.close();
            console.log("Configuración del proyecto guardada.");
            if(showAlert) alert("¡Configuración guardada!");
        } catch (error) {
            console.error("Error al guardar la configuración del proyecto:", error);
            if(showAlert) alert("No se pudo guardar la configuración.");
        }
    };

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

    // --- Lógica del Transpilador (movida desde transpiler.js) ---
    function transpile(code) {
        const usingMap = {
            'creative.engine': "import * as Engine from './modules/engine.js';",
            'creative.engine.core': "import * as Core from './modules/core.js';",
            'creative.engine.ui': "import * as UI from './modules/ui.js';",
            'creative.engine.animator': "import * as Animator from './modules/animator.js';",
            'creative.engine.physics': "import * as Physics from './modules/physics.js';",
        };
        const lines = code.split(/\r?\n/);
        const errors = [];
        let jsCode = '';
        const imports = new Set();
        let inBlock = false;

        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            let trimmedLine = line.trim();

            if (trimmedLine === '' || trimmedLine.startsWith('//')) return;

            if (trimmedLine.includes('{')) inBlock = true;

            if (!inBlock) {
                const usingMatch = trimmedLine.match(/^using\s+([^;]+);/);
                if (usingMatch) {
                    const namespace = usingMatch[1].trim();
                    if (usingMap[namespace]) imports.add(usingMap[namespace]);
                    else errors.push(`Línea ${lineNumber}: Namespace '${namespace}' desconocido.`);
                    return;
                }
                const varMatch = trimmedLine.match(/^public\s+(?:materia\/gameObject)\s+([^;]+);/);
                if (varMatch) {
                    jsCode += `let ${varMatch[1]};\n`;
                    return;
                }
            }

            const starMatch = trimmedLine.match(/^public\s+star\s*\(\)\s*{/);
            if (starMatch) {
                jsCode += 'Engine.start = function() {\n';
                return;
            }
            const updateMatch = trimmedLine.match(/^public\s+update\s*\(([^)]*)\)\s*{/);
            if (updateMatch) {
                jsCode += `Engine.update = function(${updateMatch[1]}) {\n`;
                return;
            }
            if (trimmedLine.match(/public\s+.*\(\)\s*{/)) {
                errors.push(`Línea ${lineNumber}: Declaración de función no válida: "${trimmedLine}"`);
                return;
            }

            if (inBlock) {
                if (trimmedLine.includes('}')) {
                    inBlock = false;
                    if (!trimmedLine.startsWith('}')) {
                        let content = trimmedLine.substring(0, trimmedLine.indexOf('}'));
                        content = content.replace(/materia\s+crear\s+([^,]+),"([^"]+)";/g, 'Assets.loadModel("$1", "$2");');
                        content = content.replace(/ley\s+gravedad\s+activar;/g, 'Physics.enableGravity(true);');
                        content = content.replace(/ley\s+gravedad\s+desactivar;/g, 'Physics.enableGravity(false);');
                        jsCode += `    ${content}\n`;
                    }
                    jsCode += '};\n';
                    return;
                }

                let originalLine = trimmedLine;
                let processedLine = trimmedLine.replace(/materia\s+crear\s+([^,]+),"([^"]+)";/g, 'Assets.loadModel("$1", "$2");');
                processedLine = processedLine.replace(/ley\s+gravedad\s+activar;/g, 'Physics.enableGravity(true);');
                processedLine = processedLine.replace(/ley\s+gravedad\s+desactivar;/g, 'Physics.enableGravity(false);');

                if (processedLine === originalLine && !originalLine.match(/(if|for|while|{|})|^\w+\.\w+\(.*\);?$/)) {
                     errors.push(`Línea ${lineNumber}: Comando desconocido dentro de un bloque: "${originalLine}"`);
                } else {
                    jsCode += `    ${processedLine}\n`;
                }
                return;
            }
            errors.push(`Línea ${lineNumber}: Sintaxis inesperada: "${trimmedLine}"`);
        });

        if (errors.length > 0) return { errors };
        const finalImports = Array.from(imports).join('\n');
        return { jsCode: `${finalImports}\n\n${jsCode}` };
    }

    saveAssetMeta = async function(assetName, metaData) {
        try {
            const metaFileHandle = await currentDirectoryHandle.handle.getFileHandle(`${assetName}.meta`, { create: true });
            const writable = await metaFileHandle.createWritable();
            await writable.write(JSON.stringify(metaData, null, 2));
            await writable.close();
            console.log(`Metadatos guardados para ${assetName}`);
        } catch (error) {
            console.error(`No se pudieron guardar los metadatos para ${assetName}:`, error);
        }
    };

    openSpriteSelector = async function() {
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
            SceneManager.getURLForAssetPath(imgPath, projectsDirHandle).then(url => { if(url) img.src = url; });
            img.addEventListener('click', async () => {
                if (selectedMateria) {
                    const spriteRenderer = selectedMateria.getComponent(SpriteRenderer);
                    if (spriteRenderer) {
                        spriteRenderer.setSourcePath(imgPath);
                        await spriteRenderer.loadSprite(projectsDirHandle);
                        updateInspector();
                        updateScene(renderer, false);
                    }
                }
                dom.spriteSelectorModal.classList.remove('is-open');
            });
            grid.appendChild(img);
        });
    };

    function downloadBlob(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function addFolderToZip(zip, dirHandle, path = '') {
        const manifest = [];
        for await (const entry of dirHandle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            manifest.push({name: entry.name, kind: entry.kind});
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                zip.file(entryPath, file);
            } else if (entry.kind === 'directory') {
                const folderZip = zip.folder(entryPath);
                await addFolderToZip(folderZip, entry, ''); // Recurse with empty path for sub-zip
            }
        }
        // This manifest logic is simplified; a real implementation might be more complex
        // zip.file(path ? `${path}/manifest.json` : 'manifest.json', JSON.stringify(manifest, null, 2));
    }

    async function importPackage(fileHandle) {
        try {
            const file = await fileHandle.getFile();
            const zip = await JSZip.loadAsync(file);
            const rootDir = currentDirectoryHandle.handle;

            for (const relativePath in zip.files) {
                const zipEntry = zip.files[relativePath];
                const pathParts = relativePath.split('/').filter(p => p);

                if (zipEntry.dir) {
                    let currentDir = rootDir;
                    for (const part of pathParts) {
                        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
                    }
                } else {
                    const fileName = pathParts.pop();
                    let currentDir = rootDir;
                    for (const part of pathParts) {
                        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
                    }
                    const newFileHandle = await currentDir.getFileHandle(fileName, { create: true });
                    const content = await zipEntry.async('blob');
                    const writable = await newFileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                }
            }
            console.log(`Paquete '${fileHandle.name}' importado con éxito.`);
            await updateAssetBrowser();
        } catch (error) {
            console.error(`Error al importar el paquete:`, error);
            alert("No se pudo importar el paquete.");
        }
    }

    async function populateFileTree(container, dirHandle, pathPrefix = '') {
        exportFileHandleMap.clear(); // Clear the map before populating

        async function buildTree(currentDir, prefix) {
            for await (const entry of currentDir.values()) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'file-tree-item';
                itemDiv.style.paddingLeft = `${prefix.split('/').filter(p=>p).length * 20}px`;
                const currentPath = `${prefix}${entry.name}`;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = true;
                checkbox.dataset.path = currentPath;
                exportFileHandleMap.set(currentPath, entry); // Store handle in map

                const label = document.createElement('label');
                label.textContent = ` ${entry.kind === 'directory' ? '📁' : '📄'} ${entry.name}`;

                itemDiv.appendChild(checkbox);
                itemDiv.appendChild(label);
                container.appendChild(itemDiv);

                if (entry.kind === 'directory') {
                    await buildTree(entry, `${currentPath}/`);
                }
            }
        }

        await buildTree(dirHandle, pathPrefix);
    }

    exportPackage = async function(filesToExport, manifest) {
        if (!filesToExport || filesToExport.length === 0) {
            alert("No se seleccionaron archivos para exportar.");
            return;
        }
        console.log(`Exportando paquete con ${filesToExport.length} entradas.`);
        try {
            const zip = new JSZip();
            zip.file('manifest.json', JSON.stringify(manifest, null, 2));

            for (const fileInfo of filesToExport) {
                if (fileInfo.handle.kind === 'file') {
                    const file = await fileInfo.handle.getFile();
                    zip.file(fileInfo.path, file);
                }
            }

            const content = await zip.generateAsync({type: 'blob'});
            downloadBlob(content, exportContext.fileName);
            console.log("Paquete exportado con éxito.");
            dom.packageFileTreeModal.classList.remove('is-open');

        } catch(error) {
            console.error(`Error al exportar el paquete:`, error);
            alert("No se pudo exportar el paquete.");
        }
    };

    addFrameFromCanvas = function() {
        if (!currentAnimationAsset) {
            alert("No hay ningún asset de animación cargado.");
            return;
        }
        const dataUrl = dom.drawingCanvas.toDataURL();

        // Assume we're editing the first animation state for now
        if (currentAnimationAsset.animations && currentAnimationAsset.animations.length > 0) {
            currentAnimationAsset.animations[0].frames.push(dataUrl);
            populateTimeline();
        } else {
            alert("El asset de animación no tiene un estado de animación válido.");
        }

        // Clear canvas for next frame
        const ctx = dom.drawingCanvas.getContext('2d');
        ctx.clearRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);
    };

    function populateTimeline() {
        dom.animationTimeline.innerHTML = '';
        if (!currentAnimationAsset || !currentAnimationAsset.animations.length) return;

        // For now, we only edit the first animation state
        const animation = currentAnimationAsset.animations[0];
        if (!animation) return;

        animation.frames.forEach((frameData, index) => {
            const frameImg = document.createElement('img');
            frameImg.className = 'timeline-frame';
            if (index === currentFrameIndex) {
                frameImg.classList.add('active');
            }
            frameImg.src = frameData;
            frameImg.dataset.index = index;
            dom.animationTimeline.appendChild(frameImg);
        });
    }

    async function saveAnimationAsset() {
        if (!currentAnimationAsset || !currentAnimationFileHandle) {
            alert("No hay asset de animación cargado para guardar.");
            return;
        }
        try {
            const writable = await currentAnimationFileHandle.createWritable();
            const content = JSON.stringify(currentAnimationAsset, null, 2);
            await writable.write(content);
            await writable.close();
            console.log(`Asset '${currentAnimationFileHandle.name}' guardado.`);
            // Optional: add a visual confirmation (e.g., a temporary "Saved!" message)
        } catch (error) {
            console.error("Error al guardar el asset de animación:", error);
            alert("No se pudo guardar el archivo.");
        }
    }

    openAnimationAsset = async function(fileName) {
        try {
            currentAnimationFileHandle = await currentDirectoryHandle.handle.getFileHandle(fileName);
            const file = await currentAnimationFileHandle.getFile();
            const content = await file.text();
            currentAnimationAsset = JSON.parse(content);

            dom.animationPanel.classList.remove('hidden');
            dom.animationPanelOverlay.classList.add('hidden');
            console.log(`Abierto ${fileName}:`, currentAnimationAsset);

            populateTimeline();

        } catch(error) {
            console.error(`Error al abrir el asset de animación '${fileName}':`, error);
        }
    };

    function resetAnimationPanel() {
        dom.animationPanelOverlay.classList.remove('hidden');
        currentAnimationAsset = null;
        currentFrameIndex = -1;
        dom.animationTimeline.innerHTML = '';
        stopAnimationPlayback();
    }

    function startAnimationPlayback() {
        if (isAnimationPlaying || !currentAnimationAsset) return;

        const animation = currentAnimationAsset.animations[0];
        if (!animation || !animation.frames.length) return;

        isAnimationPlaying = true;
        dom.animationEditView.classList.add('hidden');
        dom.animationPlaybackView.classList.remove('hidden');

        let startTime = performance.now();
        const playbackCtx = dom.animationPlaybackCanvas.getContext('2d');
        const frameImages = animation.frames.map(src => {
            const img = new Image();
            img.src = src;
            return img;
        });

        function playbackLoop(currentTime) {
            if (!isAnimationPlaying) return;

            const elapsedTime = currentTime - startTime;
            const frameDuration = 1000 / animation.speed;
            const currentFrame = Math.floor(elapsedTime / frameDuration) % frameImages.length;

            const img = frameImages[currentFrame];
            playbackCtx.clearRect(0, 0, dom.animationPlaybackCanvas.width, dom.animationPlaybackCanvas.height);
            if (img.complete) {
                playbackCtx.drawImage(img, 0, 0);
            }

            animationPlaybackId = requestAnimationFrame(playbackLoop);
        }
        animationPlaybackId = requestAnimationFrame(playbackLoop);
    }

    function stopAnimationPlayback() {
        if (!isAnimationPlaying) return;
        isAnimationPlaying = false;
        cancelAnimationFrame(animationPlaybackId);
        dom.animationEditView.classList.remove('hidden');
        dom.animationPlaybackView.classList.add('hidden');
    }

    openScriptInEditor = async function(fileName) {
        try {
            // Use the currently selected directory handle to find the file
            currentlyOpenFileHandle = await currentDirectoryHandle.handle.getFileHandle(fileName);
            const file = await currentlyOpenFileHandle.getFile();
            const content = await file.text();

            if (!codeEditor) {
                // First time opening a file, initialize the editor
                codeEditor = new EditorView({
                    doc: content,
                    extensions: [
                        basicSetup,
                        javascript(),
                        oneDark,
                        autocompletion({override: [cesCompletions]})
                    ],
                    parent: dom.codemirrorContainer
                });
            } else {
                // Editor already exists, just update its content
                codeEditor.dispatch({
                    changes: {from: 0, to: codeEditor.state.doc.length, insert: content}
                });
            }

            // Switch to the code editor tab
            dom.scenePanel.querySelector('.view-toggle-btn[data-view="code-editor-content"]').click();
            console.log(`Abierto ${fileName} en el editor.`);

        } catch (error) {
            console.error(`Error al abrir el script '${fileName}':`, error);
            alert(`No se pudo abrir el script. Revisa la consola.`);
        }
    };

    const markdownConverter = new showdown.Converter();

    updateInspectorForAsset = async function(assetName, assetPath) {
        if (!assetName) {
            dom.inspectorContent.innerHTML = `<p class="inspector-placeholder">Selecciona un asset</p>`;
            return;
        }

        dom.inspectorContent.innerHTML = `<h4>Asset: ${assetName}</h4>`;

        try {
            const fileHandle = await currentDirectoryHandle.handle.getFileHandle(assetName);
            const file = await fileHandle.getFile();
            const content = await file.text();

            if (assetName.endsWith('.ces')) {
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.className = 'language-javascript';
                code.textContent = content;
                pre.appendChild(code);
                dom.inspectorContent.appendChild(pre);
            } else if (assetName.endsWith('.md')) {
                const html = markdownConverter.makeHtml(content);
                const preview = document.createElement('div');
                preview.className = 'markdown-preview';
                preview.innerHTML = html;
                dom.inspectorContent.appendChild(preview);
            } else if (assetName.endsWith('.png') || assetName.endsWith('.jpg')) {
                let metaData = { textureType: 'Sprite (2D and UI)' }; // Default
                try {
                    const metaFileHandle = await currentDirectoryHandle.handle.getFileHandle(`${assetName}.meta`);
                    const metaFile = await metaFileHandle.getFile();
                    metaData = JSON.parse(await metaFile.text());
                } catch (e) {
                    // Meta file doesn't exist, will be created on first change.
                }

                const settingsContainer = document.createElement('div');
                settingsContainer.className = 'asset-settings';
                settingsContainer.innerHTML = `
                    <label for="texture-type">Texture Type</label>
                    <select id="texture-type" data-asset-name="${assetName}">
                        <option value="Default" ${metaData.textureType === 'Default' ? 'selected' : ''}>Default</option>
                        <option value="Sprite (2D and UI)" ${metaData.textureType === 'Sprite (2D and UI)' ? 'selected' : ''}>Sprite (2D and UI)</option>
                        <option value="Normal Map" ${metaData.textureType === 'Normal Map' ? 'selected' : ''}>Normal Map</option>
                    </select>
                    <hr>
                    <div class="preview-container">
                        <img id="inspector-preview-img" src="" alt="Preview">
                    </div>
                `;
                dom.inspectorContent.appendChild(settingsContainer);
                const imgElement = document.getElementById('inspector-preview-img');
                if (imgElement && assetPath) {
                    const url = await SceneManager.getURLForAssetPath(assetPath, projectsDirHandle);
                    if (url) imgElement.src = url;
                }
            } else if (assetName.endsWith('.cea')) {
                const animData = JSON.parse(content);
                const anim = animData.animations[0]; // Assume first animation

                const previewContainer = document.createElement('div');
                previewContainer.className = 'inspector-anim-preview';

                const frameCount = document.createElement('p');
                frameCount.textContent = `Fotogramas: ${anim.frames.length}`;

                const timeline = document.createElement('div');
                timeline.className = 'mini-timeline';
                anim.frames.forEach(frameSrc => {
                    const img = document.createElement('img');
                    img.src = frameSrc; // These are data URLs from the .cea file
                    timeline.appendChild(img);
                });

                const controls = document.createElement('div');
                const playBtn = document.createElement('button');
                playBtn.textContent = '▶️ Play';

                let isPlaying = false;
                let playbackId = null;
                let currentFrame = 0;

                playBtn.addEventListener('click', () => {
                    isPlaying = !isPlaying;
                    if (isPlaying) {
                        playBtn.textContent = '⏹️ Stop';
                        let lastTime = performance.now();

                        function loop(time) {
                            if (!isPlaying) return;
                            if (time - lastTime > (1000 / anim.speed)) {
                                lastTime = time;
                                currentFrame = (currentFrame + 1) % anim.frames.length;
                                timeline.childNodes.forEach((node, i) => node.style.border = i === currentFrame ? '2px solid var(--accent-color)' : 'none');
                            }
                           playbackId = requestAnimationFrame(loop);
                        }
                        playbackId = requestAnimationFrame(loop);

                    } else {
                        playBtn.textContent = '▶️ Play';
                        cancelAnimationFrame(playbackId);
                        timeline.childNodes.forEach(node => node.style.border = 'none');
                    }
                });

                controls.appendChild(playBtn);
                previewContainer.appendChild(frameCount);
                previewContainer.appendChild(timeline);
                previewContainer.appendChild(controls);
                dom.inspectorContent.appendChild(previewContainer);

            } else if (assetName.endsWith('.cep')) {
                try {
                    const zip = await JSZip.loadAsync(file);
                    const manifestFile = zip.file('manifest.json');
                    if (manifestFile) {
                        const manifestContent = await manifestFile.async('string');
                        const manifestData = JSON.parse(manifestContent);

                        const packageInfo = document.createElement('div');
                        packageInfo.className = 'asset-settings';
                        packageInfo.innerHTML = `
                            <label>Tipo de Paquete</label>
                            <input type="text" value="${manifestData.type === 'project' ? 'Proyecto Completo' : 'Asset'}" readonly>
                            <label>Descripción</label>
                            <textarea readonly rows="5">${manifestData.description || 'Sin descripción.'}</textarea>
                        `;
                        dom.inspectorContent.appendChild(packageInfo);
                    } else {
                        dom.inspectorContent.innerHTML += `<p class="error-message">Este paquete .cep no es válido (falta manifest.json).</p>`;
                    }
                } catch(e) {
                    console.error("Error al leer el paquete .cep:", e);
                    dom.inspectorContent.innerHTML += `<p class="error-message">No se pudo leer el archivo del paquete.</p>`;
                }

            } else if (assetName.endsWith('.cmel')) {
                const materialData = JSON.parse(content);
                const settingsContainer = document.createElement('div');
                settingsContainer.className = 'asset-settings';
                let html = '';
                for (const key in materialData) {
                    html += `<label>${key}</label><input type="text" value="${materialData[key]}" readonly>`;
                }
                settingsContainer.innerHTML = html;
                dom.inspectorContent.appendChild(settingsContainer);
            } else {
                 dom.inspectorContent.innerHTML += `<p>No hay vista previa disponible para este tipo de archivo.</p>`;
            }

        } catch (error) {
            console.error(`Error al leer el asset '${assetName}':`, error);
            dom.inspectorContent.innerHTML += `<p class="error-message">No se pudo cargar el contenido del asset.</p>`;
        }
    };

    updateAssetBrowser = async function() {
        if (!projectsDirHandle || !dom.assetFolderTree || !dom.assetGridView) return;

        const folderTreeContainer = dom.assetFolderTree;
        const gridViewContainer = dom.assetGridView;
        folderTreeContainer.innerHTML = '';

        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

        if (!currentDirectoryHandle.handle) {
             currentDirectoryHandle = { handle: assetsHandle, path: 'Assets' };
        }

        async function handleDropOnFolder(targetFolderHandle, targetPath, droppedData) {
            console.log(`Soltado ${droppedData.path} en ${targetPath}`);
            try {
                // This logic is now more complex as we need to resolve the source handle from a path
                const sourcePath = droppedData.path;
                const sourceParts = sourcePath.split('/').filter(p => p);
                const sourceFileName = sourceParts.pop();

                // Start from the project root and walk down to the source directory
                let sourceDirHandle = projectHandle;
                for(const part of sourceParts) {
                    if(part) sourceDirHandle = await sourceDirHandle.getDirectoryHandle(part);
                }

                const sourceFileHandle = await sourceDirHandle.getFileHandle(sourceFileName);
                const file = await sourceFileHandle.getFile();

                const newFileHandle = await targetFolderHandle.getFileHandle(sourceFileName, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(file);
                await writable.close();

                // Now delete the old file
                await sourceDirHandle.removeEntry(sourceFileName);

                console.log(`Movido ${sourceFileName} a ${targetPath}`);
                await updateAssetBrowser();

            } catch (error) {
                console.error("Error al mover el archivo:", error);
                alert("No se pudo mover el archivo.");
            }
        }

        async function populateGridView(dirHandle, dirPath) {
            gridViewContainer.innerHTML = '';
            gridViewContainer.directoryHandle = dirHandle;
            gridViewContainer.dataset.path = dirPath;

            const entries = [];
            for await (const entry of dirHandle.values()) {
                entries.push(entry);
            }

            if (entries.length === 0) {
                gridViewContainer.innerHTML = '<p class="empty-folder-message">La carpeta está vacía</p>';
                return;
            }

            for (const entry of entries) {
                const item = document.createElement('div');
                item.className = 'grid-item';
                item.draggable = true;
                item.dataset.name = entry.name;
                item.dataset.kind = entry.kind;
                const fullPath = `${dirPath}/${entry.name}`;
                item.dataset.path = fullPath;

                const iconContainer = document.createElement('div');
                iconContainer.className = 'icon';

                const imgIcon = document.createElement('img');
                imgIcon.className = 'icon-preview';

                if (entry.kind === 'directory') {
                    iconContainer.textContent = '📁';
                    const folderHandle = await dirHandle.getDirectoryHandle(entry.name);
                    let childrenNames = [];
                    for await (const child of folderHandle.values()) {
                        childrenNames.push(child.name);
                    }
                    if (childrenNames.length > 0) {
                        item.title = `Contenido: ${childrenNames.join(', ')}`;
                    } else {
                        item.title = "Carpeta vacía";
                    }
                    item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; item.classList.add('drag-over'); });
                    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
                    item.addEventListener('drop', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        item.classList.remove('drag-over');
                        const droppedData = JSON.parse(e.dataTransfer.getData('text/plain'));
                        await handleDropOnFolder(folderHandle, fullPath, droppedData);
                    });
                } else if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg')) {
                    SceneManager.getURLForAssetPath(fullPath, projectsDirHandle).then(url => {
                        if (url) {
                            imgIcon.src = url;
                            iconContainer.appendChild(imgIcon);
                        } else {
                            iconContainer.textContent = '🖼️';
                        }
                    });
                } else if (entry.name.endsWith('.ces')) {
                    imgIcon.src = 'image/Script.png';
                    iconContainer.appendChild(imgIcon);
                } else if (entry.name.endsWith('.cea')) {
                    imgIcon.src = 'image/cea.png';
                    iconContainer.appendChild(imgIcon);
                } else if (entry.name.endsWith('.ceanim')) {
                    imgIcon.src = 'image/animacion_controler.svg';
                    iconContainer.appendChild(imgIcon);
                } else if (entry.name.endsWith('.cep')) {
                    imgIcon.src = 'image/Paquete.png';
                    iconContainer.appendChild(imgIcon);
                } else if (entry.name.endsWith('.cmel')) {
                    iconContainer.textContent = '🎨';
                } else if (entry.name.endsWith('.ceScene')) {
                    iconContainer.textContent = '🎬';
                } else {
                    iconContainer.textContent = '📄';
                }

                const name = document.createElement('div');
                name.className = 'name';
                name.textContent = entry.name;

                item.appendChild(iconContainer);
                item.appendChild(name);
                gridViewContainer.appendChild(item);
            }
        }

        async function populateFolderTree(dirHandle, currentPath, container, depth = 0) {
            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item';
            folderItem.textContent = dirHandle.name;
            folderItem.style.paddingLeft = `${depth * 15 + 5}px`;
            folderItem.dataset.path = currentPath;

            if (dirHandle.isSameEntry(currentDirectoryHandle.handle)) {
                folderItem.classList.add('active');
            }

            folderItem.addEventListener('click', (e) => {
                e.stopPropagation();
                currentDirectoryHandle = { handle: dirHandle, path: currentPath };
                updateAssetBrowser();
            });

            folderItem.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; folderItem.classList.add('drag-over'); });
            folderItem.addEventListener('dragleave', () => folderItem.classList.remove('drag-over'));
            folderItem.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                folderItem.classList.remove('drag-over');
                const droppedData = JSON.parse(e.dataTransfer.getData('text/plain'));
                await handleDropOnFolder(dirHandle, currentPath, droppedData);
            });

            container.appendChild(folderItem);

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'folder-children';
            folderItem.appendChild(childrenContainer);

            try {
                for await (const entry of dirHandle.values()) {
                    if (entry.kind === 'directory') {
                        await populateFolderTree(entry, `${currentPath}/${entry.name}`, childrenContainer, depth + 1);
                    }
                }
            } catch(e) {
                console.warn(`Could not iterate directory ${dirHandle.name}. Permissions issue?`, e);
            }
        }

        try {
            await populateFolderTree(assetsHandle, 'Assets', folderTreeContainer);
            await populateGridView(currentDirectoryHandle.handle, currentDirectoryHandle.path);
        } catch (error) {
            console.error("Error updating asset browser:", error);
            gridViewContainer.innerHTML = '<p class="error-message">Could not load project assets.</p>';
        }
    };

    updateHierarchy = function() {
        dom.hierarchyContent.innerHTML = '';
        const rootMaterias = SceneManager.currentScene.getRootMaterias();

        if (rootMaterias.length === 0) {
            dom.hierarchyContent.innerHTML = `<p class="empty-message">La escena está vacía.<br>Click derecho para crear un objeto.</p>`;
            return;
        }

        function renderNode(materia, container, depth) {
            const item = document.createElement('div');
            item.className = 'hierarchy-item';
            if (!materia.isActive) {
                item.classList.add('disabled');
            }
            item.dataset.id = materia.id;
            item.draggable = true;
            item.style.paddingLeft = `${depth * 18}px`;
            const nameSpan = document.createElement('span');
            nameSpan.textContent = materia.name;
            item.appendChild(nameSpan);
            if (selectedMateria && materia.id === selectedMateria.id) {
                item.classList.add('active');
            }
            container.appendChild(item);
            if (materia.children && materia.children.length > 0) {
                materia.children.forEach(child => {
                    renderNode(child, container, depth + 1);
                });
            }
        }
        rootMaterias.forEach(materia => renderNode(materia, dom.hierarchyContent, 0));
    };
    updateInspector = async function() {
        if (!dom.inspectorContent) return;
        dom.inspectorContent.innerHTML = '';
        if (!selectedMateria) {
            const selectedAsset = dom.assetGridView.querySelector('.grid-item.active');
            if(selectedAsset) {
                await updateInspectorForAsset(selectedAsset.dataset.name, selectedAsset.dataset.path);
            } else {
                dom.inspectorContent.innerHTML = '<p class="inspector-placeholder">Nada seleccionado</p>';
            }
            return;
        }

        // Name input and active toggle
        dom.inspectorContent.innerHTML = `
            <div class="inspector-materia-header">
                <input type="checkbox" id="materia-active-toggle" title="Activar/Desactivar Materia" ${selectedMateria.isActive ? 'checked' : ''}>
                <input type="text" id="materia-name-input" value="${selectedMateria.name}">
            </div>
            <div class="inspector-row">
                <label for="materia-layer-select">Layer</label>
                <select id="materia-layer-select"></select>
            </div>
        `;

        const layerSelect = dom.inspectorContent.querySelector('#materia-layer-select');
        if (layerSelect) {
            currentProjectConfig.layers.sortingLayers.forEach(layerName => {
                const option = document.createElement('option');
                option.value = layerName;
                option.textContent = layerName;
                if (selectedMateria.layer === layerName) {
                    option.selected = true;
                }
                layerSelect.appendChild(option);
            });
            layerSelect.addEventListener('change', (e) => {
                if (selectedMateria) {
                    selectedMateria.layer = e.target.value;
                    // Note: We might need to trigger a scene resort/redraw here in the future
                }
            });
        }

        // Helper para los iconos de componentes
        const componentIcons = {
            Transform: '✥',
            Rigidbody: '🏋️',
            BoxCollider: '🟩',
            SpriteRenderer: '🖼️',
            Animator: '🏃',
            Camera: '📷',
            UICanvas: '📋',
            UIText: '📄',
            UIButton: '🔘',
            CreativeScript: 'image/Script.png'
        };

        // Components
        const componentsWrapper = document.createElement('div');
        componentsWrapper.className = 'inspector-components-wrapper';

        selectedMateria.leyes.forEach(ley => {
            let componentHTML = '';
            const componentName = ley.constructor.name;
            const icon = componentIcons[componentName] || '⚙️'; // Icono por defecto
            const iconHTML = icon.includes('.png') ? `<img src="${icon}" class="component-icon">` : `<span class="component-icon">${icon}</span>`;

            if (ley instanceof Transform) {
                componentHTML = `<div class="component-header">${iconHTML}<h4>Transform</h4></div>
                <div class="component-grid">
                    <div class="prop-row">
                        <div class="prop-cell"><label>X</label><input type="number" class="prop-input" step="1" data-component="Transform" data-prop="x" value="${ley.x.toFixed(0)}"></div>
                        <div class="prop-cell"><label>Y</label><input type="number" class="prop-input" step="1" data-component="Transform" data-prop="y" value="${ley.y.toFixed(0)}"></div>
                    </div>
                    <div class="prop-row">
                        <div class="prop-cell"><label>Scale X</label><input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.x" value="${ley.scale.x.toFixed(1)}"></div>
                        <div class="prop-cell"><label>Scale Y</label><input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.y" value="${ley.scale.y.toFixed(1)}"></div>
                    </div>
                </div>`;
            } else if (ley instanceof Rigidbody) {
                componentHTML = `<div class="component-header">${iconHTML}<h4>Rigidbody</h4></div>
                <div class="component-grid">
                    <label>Body Type</label>
                    <select class="prop-input" data-component="Rigidbody" data-prop="bodyType">
                        <option value="dynamic" ${ley.bodyType === 'dynamic' ? 'selected' : ''}>Dynamic</option>
                        <option value="static" ${ley.bodyType === 'static' ? 'selected' : ''}>Static</option>
                        <option value="kinematic" ${ley.bodyType === 'kinematic' ? 'selected' : ''}>Kinematic</option>
                    </select>
                    <label>Mass</label><input type="number" class="prop-input" step="0.1" data-component="Rigidbody" data-prop="mass" value="${ley.mass}">
                </div>`;
            } else if (ley instanceof BoxCollider) {
                componentHTML = `<div class="component-header">${iconHTML}<h4>Box Collider</h4></div>
                <div class="component-grid">
                    <label>Width</label><input type="number" class="prop-input" step="0.1" data-component="BoxCollider" data-prop="width" value="${ley.width}">
                    <label>Height</label><input type="number" class="prop-input" step="0.1" data-component="BoxCollider" data-prop="height" value="${ley.height}">
                </div>`;
            } else if (ley instanceof SpriteRenderer) {
                const previewImg = ley.sprite.src ? `<img src="${ley.sprite.src}" alt="Preview">` : 'None';
                componentHTML = `<div class="component-header">${iconHTML}<h4>Sprite Renderer</h4></div>
                <div class="component-grid">
                    <label>Sprite</label>
                    <div class="sprite-dropper">
                        <div class="sprite-preview" data-component="SpriteRenderer" data-prop="source">${previewImg}</div>
                        <button class="sprite-select-btn" data-component="SpriteRenderer">🎯</button>
                    </div>
                    <label>Color</label><input type="color" class="prop-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color}">
                </div>`;
            } else if (ley instanceof UICanvas) {
                componentHTML = `<div class="component-header">${iconHTML}<h4>UI Canvas</h4></div>`;
            } else if (ley instanceof UIButton) {
                componentHTML = `<div class="component-header">${iconHTML}<h4>UI Button</h4></div>
                <div class="component-grid">
                    <label>Normal Color</label><input type="color" class="prop-input" data-component="UIButton" data-prop="normalColor" value="${ley.normalColor}">
                    <label>Hover Color</label><input type="color" class="prop-input" data-component="UIButton" data-prop="hoverColor" value="${ley.hoverColor}">
                    <label>Pressed Color</label><input type="color" class="prop-input" data-component="UIButton" data-prop="pressedColor" value="${ley.pressedColor}">
                </div>
                <div class="component-grid">
                    <label>On Click()</label>
                    <p class="field-description">Functionality to add events from the inspector will be implemented in a future update.</p>
                </div>
                `;
            } else if (ley instanceof UIText) {
                componentHTML = `<div class="component-header">${iconHTML}<h4>UI Text</h4></div>
                <textarea class="prop-input" data-component="UIText" data-prop="text" rows="4">${ley.text}</textarea>
                <div class="text-transform-controls">
                    <button class="prop-btn ${ley.textTransform === 'none' ? 'active' : ''}" data-component="UIText" data-prop="textTransform" data-value="none">aA</button>
                    <button class="prop-btn ${ley.textTransform === 'uppercase' ? 'active' : ''}" data-component="UIText" data-prop="textTransform" data-value="uppercase">AA</button>
                    <button class="prop-btn ${ley.textTransform === 'lowercase' ? 'active' : ''}" data-component="UIText" data-prop="textTransform" data-value="lowercase">aa</button>
                </div>
                <div class="component-grid">
                    <label>Font Size</label><input type="number" class="prop-input" step="1" data-component="UIText" data-prop="fontSize" value="${ley.fontSize}">
                    <label>Color</label><input type="color" class="prop-input" data-component="UIText" data-prop="color" value="${ley.color}">
                </div>
                `;
            } else if (ley instanceof UIButton) {
                componentHTML = `<div class="component-header">${iconHTML}<h4>UI Button</h4></div>
                <label>Etiqueta</label><input type="text" class="prop-input" data-component="UIButton" data-prop="label.text" value="${ley.label.text}">
                <label>Color</label><input type="color" class="prop-input" data-component="UIButton" data-prop="color" value="${ley.color}">`;
            } else if (ley instanceof CreativeScript) {
                componentHTML = `<div class="component-header">${iconHTML}<h4>${ley.scriptName}</h4></div>`;
            } else if (ley instanceof Animator) {
                componentHTML = `<div class="component-header">${iconHTML}<h4>Animator</h4></div>
                <p>Estado Actual: ${ley.currentState || 'Ninguno'}</p>
                <p>Asset de Animación: (Próximamente)</p>
                <button id="open-animator-btn">Abrir Editor de Animación</button>`;
            } else if (ley instanceof HorizontalLayoutGroup || ley instanceof VerticalLayoutGroup) {
                const type = ley.constructor.name;
                componentHTML = `<div class="component-header">${iconHTML}<h4>${type}</h4></div>
                <div class="component-grid">
                    <label>Spacing</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="spacing" value="${ley.spacing}">
                    <hr>
                    <label>Padding Top</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="padding.top" value="${ley.padding.top}">
                    <label>Padding Bottom</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="padding.bottom" value="${ley.padding.bottom}">
                    <label>Padding Left</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="padding.left" value="${ley.padding.left}">
                    <label>Padding Right</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="padding.right" value="${ley.padding.right}">
                </div>`;
            } else if (ley instanceof GridLayoutGroup) {
                const type = ley.constructor.name;
                componentHTML = `<div class="component-header">${iconHTML}<h4>${type}</h4></div>
                <div class="component-grid">
                    <label>Spacing</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="spacing" value="${ley.spacing}">
                    <hr>
                    <label>Padding Top</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="padding.top" value="${ley.padding.top}">
                    <label>Padding Bottom</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="padding.bottom" value="${ley.padding.bottom}">
                    <label>Padding Left</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="padding.left" value="${ley.padding.left}">
                    <label>Padding Right</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="padding.right" value="${ley.padding.right}">
                    <hr>
                    <label>Cell Size X</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="cellSize.x" value="${ley.cellSize.x}">
                    <label>Cell Size Y</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="cellSize.y" value="${ley.cellSize.y}">
                    <label>Constraint</label>
                    <select class="prop-input" data-component="${type}" data-prop="constraint">
                        <option value="flexible" ${ley.constraint === 'flexible' ? 'selected' : ''}>Flexible</option>
                        <option value="fixedColumnCount" ${ley.constraint === 'fixedColumnCount' ? 'selected' : ''}>Fixed Column Count</option>
                        <option value="fixedRowCount" ${ley.constraint === 'fixedRowCount' ? 'selected' : ''}>Fixed Row Count</option>
                    </select>
                    <label>Constraint Count</label><input type="number" class="prop-input" step="1" min="1" data-component="${type}" data-prop="constraintCount" value="${ley.constraintCount}">
                </div>`;
            } else if (ley instanceof ContentSizeFitter) {
                const type = ley.constructor.name;
                componentHTML = `<div class="component-header">${iconHTML}<h4>${type}</h4></div>
                <div class="component-grid">
                    <label>Horizontal Fit</label>
                    <select class="prop-input" data-component="${type}" data-prop="horizontalFit">
                        <option value="unconstrained" ${ley.horizontalFit === 'unconstrained' ? 'selected' : ''}>Unconstrained</option>
                        <option value="minSize" ${ley.horizontalFit === 'minSize' ? 'selected' : ''}>Min Size</option>
                        <option value="preferredSize" ${ley.horizontalFit === 'preferredSize' ? 'selected' : ''}>Preferred Size</option>
                    </select>
                    <label>Vertical Fit</label>
                    <select class="prop-input" data-component="${type}" data-prop="verticalFit">
                        <option value="unconstrained" ${ley.verticalFit === 'unconstrained' ? 'selected' : ''}>Unconstrained</option>
                        <option value="minSize" ${ley.verticalFit === 'minSize' ? 'selected' : ''}>Min Size</option>
                        <option value="preferredSize" ${ley.verticalFit === 'preferredSize' ? 'selected' : ''}>Preferred Size</option>
                    </select>
                </div>`;
            } else if (ley instanceof LayoutElement) {
                const type = ley.constructor.name;
                componentHTML = `<div class="component-header">${iconHTML}<h4>${type}</h4></div>
                <div class="component-grid">
                    <label for="le-ignore">Ignore Layout</label>
                    <input type="checkbox" id="le-ignore" class="prop-input" data-component="${type}" data-prop="ignoreLayout" ${ley.ignoreLayout ? 'checked' : ''}>
                    <hr><hr>
                    <label>Min Width</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="minWidth" value="${ley.minWidth}">
                    <label>Min Height</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="minHeight" value="${ley.minHeight}">
                    <label>Preferred Width</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="preferredWidth" value="${ley.preferredWidth}">
                    <label>Preferred Height</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="preferredHeight" value="${ley.preferredHeight}">
                    <label>Flexible Width</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="flexibleWidth" value="${ley.flexibleWidth}">
                    <label>Flexible Height</label><input type="number" class="prop-input" step="1" data-component="${type}" data-prop="flexibleHeight" value="${ley.flexibleHeight}">
                </div>`;
            } else if (ley instanceof AspectRatioFitter) {
                const type = ley.constructor.name;
                componentHTML = `<div class="component-header">${iconHTML}<h4>${type}</h4></div>
                <div class="component-grid">
                    <label>Aspect Mode</label>
                    <select class="prop-input" data-component="${type}" data-prop="aspectMode">
                        <option value="None" ${ley.aspectMode === 'None' ? 'selected' : ''}>None</option>
                        <option value="WidthControlsHeight" ${ley.aspectMode === 'WidthControlsHeight' ? 'selected' : ''}>Width Controls Height</option>
                        <option value="HeightControlsWidth" ${ley.aspectMode === 'HeightControlsWidth' ? 'selected' : ''}>Height Controls Width</option>
                        <option value="FitInParent" ${ley.aspectMode === 'FitInParent' ? 'selected' : ''}>Fit In Parent</option>
                        <option value="EnvelopeParent" ${ley.aspectMode === 'EnvelopeParent' ? 'selected' : ''}>Envelope Parent</option>
                    </select>
                    <label>Aspect Ratio</label><input type="number" class="prop-input" step="0.01" data-component="${type}" data-prop="aspectRatio" value="${ley.aspectRatio}">
                </div>`;
            } else if (ley instanceof Camera) {
                componentHTML = `<div class="component-header">${iconHTML}<h4>Camera</h4></div>
                <div class="component-grid">
                    <label>Orthographic Size</label>
                    <input type="number" class="prop-input" step="10" data-component="Camera" data-prop="orthographicSize" value="${ley.orthographicSize}">
                </div>`;
            }
            componentsWrapper.innerHTML += componentHTML;
        });
        dom.inspectorContent.appendChild(componentsWrapper);

        // Add Component Button
        const addComponentBtn = document.createElement('button');
        addComponentBtn.type = 'button';
        addComponentBtn.id = 'add-component-btn';
        addComponentBtn.className = 'add-component-btn';
        addComponentBtn.textContent = 'Añadir Ley';
        addComponentBtn.addEventListener('click', () => showAddComponentModal());
        dom.inspectorContent.appendChild(addComponentBtn);
    };

    updateScene = function(targetRenderer, isGameView = false) {
        if (!targetRenderer) return;
        targetRenderer.begin();

        // Draw a grid for reference only in the editor scene view
        if (!isGameView) {
            const gridSize = 50;
            const halfWidth = targetRenderer.canvas.width / targetRenderer.camera.zoom;
            const halfHeight = targetRenderer.canvas.height / targetRenderer.camera.zoom;
            const startX = Math.floor((targetRenderer.camera.x - halfWidth) / gridSize) * gridSize;
            const endX = Math.ceil((targetRenderer.camera.x + halfWidth) / gridSize) * gridSize;
            const startY = Math.floor((targetRenderer.camera.y - halfHeight) / gridSize) * gridSize;
            const endY = Math.ceil((targetRenderer.camera.y + halfHeight) / gridSize) * gridSize;

            targetRenderer.ctx.strokeStyle = '#3a3a3a';
            targetRenderer.ctx.lineWidth = 1 / targetRenderer.camera.zoom;
            targetRenderer.ctx.beginPath();
            for (let x = startX; x <= endX; x += gridSize) {
                targetRenderer.ctx.moveTo(x, startY);
                targetRenderer.ctx.lineTo(x, endY);
            }
            for (let y = startY; y <= endY; y += gridSize) {
                targetRenderer.ctx.moveTo(startX, y);
                targetRenderer.ctx.lineTo(endX, y);
            }
            targetRenderer.ctx.stroke();
        }

        // Draw Materias
        const layerOrder = currentProjectConfig.layers.sortingLayers;
        const sortedMaterias = [...SceneManager.currentScene.materias].sort((a, b) => {
            const indexA = layerOrder.indexOf(a.layer);
            const indexB = layerOrder.indexOf(b.layer);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        sortedMaterias.forEach(materia => {
            // Skip UI elements in the main world render pass
            if (materia.getComponent(UICanvas) || materia.getComponent(UIImage) || materia.getComponent(UIText)) {
                // Also need to check if it's a child of a canvas, but this is a good start
                const isUiElement = materia.leyes.some(c => c instanceof RectTransform);
                if (isUiElement) return;
            }

            if (isGameView && !materia.isActive) {
                return; // Don't render inactive objects in the final game view
            }

            const transform = materia.getComponent(Transform);
            if (!transform) return;

            const isInactiveInEditor = !isGameView && !materia.isActive;
            if (isInactiveInEditor) {
                targetRenderer.ctx.globalAlpha = 0.5;
            }

            let drawn = false;
            const spriteRenderer = materia.getComponent(SpriteRenderer);
            if (spriteRenderer && spriteRenderer.sprite.complete && spriteRenderer.sprite.naturalHeight !== 0) {
                targetRenderer.drawImage(spriteRenderer.sprite, transform.x, transform.y, 100 * transform.scale.x, 100 * transform.scale.y);
                drawn = true;
            }

            const boxCollider = materia.getComponent(BoxCollider);
            if (boxCollider) {
                if (!drawn) {
                    targetRenderer.drawRect(transform.x, transform.y, boxCollider.width * transform.scale.x, boxCollider.height * transform.scale.y, 'rgba(144, 238, 144, 0.5)');
                }
            }

            if (!drawn && !boxCollider) {
                 targetRenderer.drawRect(transform.x, transform.y, 20 * transform.scale.x, 20 * transform.scale.y, 'rgba(128, 128, 128, 0.5)');
            }

            // Draw selection outline only in the editor scene view
            if (!isGameView) {
                if (selectedMateria && selectedMateria.id === materia.id) {
                    targetRenderer.ctx.strokeStyle = 'yellow';
                    targetRenderer.ctx.lineWidth = 2 / targetRenderer.camera.effectiveZoom;
                    let selectionWidth = boxCollider ? boxCollider.width : (spriteRenderer ? 100 : 20);
                    let selectionHeight = boxCollider ? boxCollider.height : (spriteRenderer ? 100 : 20);

                    selectionWidth *= transform.scale.x;
                    selectionHeight *= transform.scale.y;

                    targetRenderer.ctx.strokeRect(transform.x - selectionWidth / 2, transform.y - selectionHeight / 2, selectionWidth, selectionHeight);
                }
                // Draw gizmos for all materias in the scene view
                drawGizmos(targetRenderer, materia);
            }

            // Reset alpha if it was changed
            if (!isGameView && !materia.isActive) {
                targetRenderer.ctx.globalAlpha = 1.0;
            }
        });
        targetRenderer.end();

        // --- UI Rendering Pass ---
        // This pass draws on top of the scene, ignoring the camera
        const uiCanvases = SceneManager.currentScene.materias.filter(m => m.getComponent(UICanvas));

        uiCanvases.forEach(canvasMateria => {
            const canvas = canvasMateria.getComponent(UICanvas);
            if (canvas.renderMode === 'ScreenSpaceOverlay') {
                targetRenderer.ctx.save();
                // Reset transform to draw in screen space
                targetRenderer.ctx.setTransform(1, 0, 0, 1, 0, 0);

                function renderUiRecursive(materia) {
                    if (!materia.isActive && isGameView) return;

                    const rectTransform = materia.getComponent(RectTransform);
                    if (!rectTransform) return;

                    const image = materia.getComponent(UIImage);
                    if (image && image.sprite.complete && image.sprite.naturalHeight !== 0) {
                        // For now, use x/y as screen coordinates. Anchors/pivots will change this.
                        targetRenderer.drawImage(image.sprite, rectTransform.x, rectTransform.y, rectTransform.width, rectTransform.height);
                    }

                    const text = materia.getComponent(UIText);
                    if(text) {
                        targetRenderer.drawText(text.text, rectTransform.x, rectTransform.y, text.color, text.fontSize, text.textTransform);
                    }

                    const mask = materia.getComponent(UIMask);
                    if (mask) {
                        targetRenderer.ctx.save();

                        // Create a clipping path from the RectTransform
                        const path = new Path2D();
                        path.rect(
                            rectTransform.x - (rectTransform.width * rectTransform.pivot.x),
                            rectTransform.y - (rectTransform.height * rectTransform.pivot.y),
                            rectTransform.width,
                            rectTransform.height
                        );
                        targetRenderer.ctx.clip(path);
                    }

                    materia.children.forEach(renderUiRecursive);

                    if (mask) {
                        targetRenderer.ctx.restore();
                    }
                }

                renderUiRecursive(canvasMateria);

                targetRenderer.ctx.restore();
            }
        });
    };

    selectMateria = function(materiaId) {
        // When a materia is selected, deselect any asset
        const currentActiveAsset = dom.assetsContent.querySelector('.asset-item.active');
        if (currentActiveAsset) {
            currentActiveAsset.classList.remove('active');
        }

        if (materiaId === null) {
            selectedMateria = null;
        } else {
            selectedMateria = SceneManager.currentScene.findMateriaById(materiaId) || null;
        }
        updateHierarchy();
        updateInspector(); // This will now show the materia inspector
        if (renderer) {
            updateScene(renderer, false);
        }
    };

    const availableComponents = {
        'Renderizado': [SpriteRenderer],
        'Animación': [Animator],
        'Cámara': [Camera],
        'Físicas': [Rigidbody, BoxCollider],
        'UI': [UICanvas, UIPanel, UIImage, UIText, UIButton, UIMask],
        'Layout': [HorizontalLayoutGroup, VerticalLayoutGroup, GridLayoutGroup, ContentSizeFitter, LayoutElement, AspectRatioFitter],
        'Scripting': [CreativeScript]
    };

    showAddComponentModal = async function() {
        if (!selectedMateria) return;

        dom.componentList.innerHTML = '';
        const existingComponents = new Set(selectedMateria.leyes.map(ley => ley.constructor));
        const existingScripts = new Set(selectedMateria.leyes.filter(ley => ley instanceof CreativeScript).map(ley => ley.scriptName));

        // --- 1. Render Built-in Components ---
        for (const category in availableComponents) {
            // Skip Scripts category for now, we'll handle it separately
            if (category === 'Scripting') continue;

            const categoryHeader = document.createElement('h4');
            categoryHeader.textContent = category;
            dom.componentList.appendChild(categoryHeader);

            availableComponents[category].forEach(ComponentClass => {
                if (existingComponents.has(ComponentClass)) {
                    return; // Skip component if it already exists
                }
                const componentItem = document.createElement('div');
                componentItem.className = 'component-item';
                componentItem.textContent = ComponentClass.name;
                componentItem.addEventListener('click', () => {
                    selectedMateria.addComponent(new ComponentClass(selectedMateria));
                    dom.addComponentModal.classList.remove('is-open');
                    updateInspector();
                });
                dom.componentList.appendChild(componentItem);
            });
        }

        // --- 2. Show the modal Immediately ---
        dom.addComponentModal.classList.add('is-open');

        // --- 3. Find and Render Custom Scripts Asynchronously ---
        const scriptsCategoryHeader = document.createElement('h4');
        scriptsCategoryHeader.textContent = 'Scripts';
        dom.componentList.appendChild(scriptsCategoryHeader);

        const placeholder = document.createElement('p');
        placeholder.className = 'script-scan-status';
        dom.componentList.appendChild(placeholder);

        if (!projectsDirHandle) {
            placeholder.textContent = "No se ha seleccionado un directorio de proyecto.";
            return;
        }

        if (isScanningForComponents) {
            placeholder.textContent = 'Escaneo de scripts ya en progreso...';
            return;
        }

        isScanningForComponents = true;
        placeholder.textContent = 'Buscando scripts...';

        try {
            const scriptFiles = [];
            async function findScriptFiles(dirHandle) {
                for await (const entry of dirHandle.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.ces')) {
                        scriptFiles.push(entry);
                    } else if (entry.kind === 'directory') {
                        try {
                            await findScriptFiles(entry);
                        } catch (e) {
                            console.warn(`No se pudo acceder al directorio '${entry.name}'. Permisos? Saltando.`);
                        }
                    }
                }
            }

            const projectName = new URLSearchParams(window.location.search).get('project');
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
            await findScriptFiles(assetsHandle);

            placeholder.remove();

            if (scriptFiles.length === 0) {
                const noScriptsMsg = document.createElement('p');
                noScriptsMsg.textContent = "No se encontraron scripts (.ces) en la carpeta Assets.";
                dom.componentList.appendChild(noScriptsMsg);
            } else {
                scriptFiles.forEach(fileHandle => {
                    if (existingScripts.has(fileHandle.name)) return;
                    const componentItem = document.createElement('div');
                    componentItem.className = 'component-item';
                    componentItem.textContent = fileHandle.name;
                    componentItem.addEventListener('click', () => {
                        const newScript = new CreativeScript(selectedMateria, fileHandle.name);
                        selectedMateria.addComponent(newScript);
                        dom.addComponentModal.classList.remove('is-open');
                        updateInspector();
                    });
                    dom.componentList.appendChild(componentItem);
                });
            }
        } catch (error) {
            console.error("Error crítico durante el escaneo de scripts:", error);
            placeholder.textContent = "Error al buscar scripts.";
            placeholder.className += ' error-message';
        } finally {
            isScanningForComponents = false;
        }
    };

    updateDebugPanel = function() {
        if (!dom.debugContent) return;

        // Input State
        const pos = InputManager.getMousePosition();
        const canvasPos = InputManager.getMousePositionInCanvas();
        const leftButton = InputManager.getMouseButton(0) ? 'DOWN' : 'UP';
        const rightButton = InputManager.getMouseButton(2) ? 'DOWN' : 'UP';
        const pressedKeys = InputManager.getPressedKeys().join(', ') || 'Ninguna';

        // Editor State
        const selectedMateriaName = selectedMateria ? `${selectedMateria.name} (ID: ${selectedMateria.id})` : 'Ninguna';
        const gameRunningStatus = isGameRunning ? 'Sí' : 'No';

        // Performance
        const fps = deltaTime > 0 ? (1.0 / deltaTime).toFixed(1) : '...';
        const dtMs = (deltaTime * 1000).toFixed(2);

        // Scene Stats
        const totalMaterias = SceneManager.currentScene.materias.length;
        const rootMaterias = SceneManager.currentScene.getRootMaterias().length;

        dom.debugContent.innerHTML = `
            <div class="debug-section">
                <h4>Estado del Editor</h4>
                <pre>Herramienta Activa: ${activeTool}\nSelección: ${selectedMateriaName}\nJuego Corriendo: ${gameRunningStatus}</pre>
            </div>
            <div class="debug-section">
                <h4>Rendimiento</h4>
                <pre>FPS: ${fps}\nDeltaTime: ${dtMs} ms</pre>
            </div>
            <div class="debug-section">
                <h4>Estadísticas de Escena</h4>
                <pre>Materias Totales: ${totalMaterias}\nMaterias Raíz: ${rootMaterias}</pre>
            </div>
            <div class="debug-section">
                <h4>Input</h4>
                <pre>Mouse (Scene): X=${canvasPos.x.toFixed(0)}, Y=${canvasPos.y.toFixed(0)}\nBotones: L:${leftButton} R:${rightButton}\nTeclas: ${pressedKeys}</pre>
            </div>
        `;
    };

    runLayoutUpdate = function() {
        if (!SceneManager.currentScene) return;

        const layoutGroups = [];
        // First, find all layout groups
        for (const materia of SceneManager.currentScene.materias) {
            const hg = materia.getComponent(HorizontalLayoutGroup);
            if (hg) layoutGroups.push(hg);

            const vg = materia.getComponent(VerticalLayoutGroup);
            if (vg) layoutGroups.push(vg);

            const gg = materia.getComponent(GridLayoutGroup);
            if (gg) layoutGroups.push(gg);

            const csf = materia.getComponent(ContentSizeFitter);
            if (csf) layoutGroups.push(csf);

            const arf = materia.getComponent(AspectRatioFitter);
            if (arf) layoutGroups.push(arf);
        }

        // Now, update them. A single pass is sufficient for now.
        // A more robust system might need multiple passes or a top-down/bottom-up approach.
        for (const layout of layoutGroups) {
            layout.update();
        }
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

    const editorLoop = (timestamp) => {
        // Calculate deltaTime
        if (lastFrameTime > 0) {
            deltaTime = (timestamp - lastFrameTime) / 1000;
        }
        lastFrameTime = timestamp;

        InputManager.update();
        if (isGameRunning) {
            uiEventSystem.update();
        }
        updateDebugPanel();

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

    // --- 6. Event Listeners & Handlers ---
    let setActiveTool; // Will be defined in setupEventListeners
    let createNewScript; // To be defined
    let findOrCreateCanvas; // To be defined

    findOrCreateCanvas = function() {
        // First, try to find an existing canvas in the scene
        for (const materia of SceneManager.currentScene.materias) {
            if (materia.getComponent(UICanvas)) {
                console.log("Canvas encontrado existente.");
                return materia;
            }
        }

        // If no canvas exists, create one
        console.log("No se encontró canvas. Creando uno nuevo.");
        const canvasMateria = new Materia('Canvas');
        // UI elements use RectTransform, so remove the default Transform and add the correct one.
        canvasMateria.leyes = canvasMateria.leyes.filter(c => !(c instanceof Transform));
        canvasMateria.addComponent(new RectTransform(canvasMateria));
        canvasMateria.addComponent(new UICanvas(canvasMateria));
        canvasMateria.layer = 'UI'; // Assign to UI layer by default

        SceneManager.currentScene.addMateria(canvasMateria);
        updateHierarchy(); // Update the hierarchy to show the new canvas
        return canvasMateria;
    };

    function updateWindowMenuUI() {
        for (const panelName in panelVisibility) {
            const menuItem = document.getElementById(`menu-window-${panelName}`);
            if (menuItem) {
                const isVisible = panelVisibility[panelName];
                if (isVisible) {
                    menuItem.textContent = `✓ ${menuItem.dataset.baseName || menuItem.textContent.replace('✓ ', '')}`;
                    if(!menuItem.dataset.baseName) menuItem.dataset.baseName = menuItem.textContent.replace('✓ ', '');
                } else {
                    menuItem.textContent = menuItem.dataset.baseName || menuItem.textContent.replace('✓ ', '');
                }
            }
        }
    }

    function updateEditorLayout() {
        const mainContent = dom.editorMainContent;

        // Set panel and resizer visibility first
        dom.hierarchyPanel.style.display = panelVisibility.hierarchy ? 'flex' : 'none';
        dom.resizerLeft.style.display = panelVisibility.hierarchy ? 'block' : 'none';
        dom.inspectorPanel.style.display = panelVisibility.inspector ? 'flex' : 'none';
        dom.resizerRight.style.display = panelVisibility.inspector ? 'block' : 'none';
        dom.assetsPanel.style.display = panelVisibility.assets ? 'flex' : 'none';
        dom.resizerBottom.style.display = panelVisibility.assets ? 'block' : 'none';

        // Get the current column and row definitions from the inline style, if available.
        const currentCols = mainContent.style.gridTemplateColumns ? mainContent.style.gridTemplateColumns.split(' ') : [];
        const currentRows = mainContent.style.gridTemplateRows ? mainContent.style.gridTemplateRows.split(' ') : [];

        // Define default sizes. These should match the initial state in the CSS file.
        const defaultCols = ['220px', '6px', '1fr', '6px', '320px'];
        const defaultRows = ['1.5fr', '6px', '1fr'];

        // Use current size if available and valid, otherwise use default.
        // This preserves user-set sizes unless a panel is hidden.
        let newCols = defaultCols.map((val, i) => (currentCols[i] && !currentCols[i].endsWith('fr')) ? currentCols[i] : val);
        let newRows = defaultRows.map((val, i) => (currentRows[i] && !currentRows[i].endsWith('fr')) ? currentRows[i] : val);

        // Now, collapse the tracks for any hidden panels. This overrides any user-set size.
        if (!panelVisibility.hierarchy) {
            newCols[0] = '0px';
            newCols[1] = '0px';
        }
        if (!panelVisibility.inspector) {
            newCols[4] = '0px';
            newCols[3] = '0px';
        }
        if (!panelVisibility.assets) {
            newRows[2] = '0px';
            newRows[1] = '0px';
        }

        mainContent.style.gridTemplateColumns = newCols.join(' ');
        mainContent.style.gridTemplateRows = newRows.join(' ');

        // The renderer needs to be resized after the layout changes
        if (renderer) {
            setTimeout(() => {
                renderer.resize();
                if (gameRenderer) gameRenderer.resize();
            }, 50);
        }
    }

    function createEmptyMateria(name = 'Materia Vacio', parent = null) {
        const newMateria = new Materia(name);
        if (parent) {
            parent.addChild(newMateria);
        } else {
            SceneManager.currentScene.addMateria(newMateria);
        }
        updateHierarchy();
        selectMateria(newMateria.id);
    }

    function showContextMenu(menu, e) {
        // First, hide any other context menus
        dom.contextMenu.style.display = 'none';
        dom.hierarchyContextMenu.style.display = 'none';
        if (dom.animNodeContextMenu) dom.animNodeContextMenu.style.display = 'none';

        menu.style.display = 'block';
        let x = e.clientX;
        let y = e.clientY;

        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (x + menuWidth > windowWidth) {
            x = windowWidth - menuWidth - 5;
        }
        if (y + menuHeight > windowHeight) {
            y = windowHeight - menuHeight - 5;
        }

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        // Check and reposition submenus
        const submenus = menu.querySelectorAll('.submenu');
        submenus.forEach(submenu => {
            const parentItem = submenu.parentElement.getBoundingClientRect();
            const submenuHeight = submenu.offsetHeight; // This might be 0 if not displayed, need to temporarily show it

            // Temporarily display to measure
            submenu.style.visibility = 'hidden';
            submenu.style.display = 'block';
            const realHeight = submenu.offsetHeight;
            submenu.style.visibility = '';
            submenu.style.display = '';

            if (parentItem.top + realHeight > windowHeight) {
                submenu.classList.add('submenu-up');
            } else {
                submenu.classList.remove('submenu-up');
            }
        });
    }

    function hideContextMenus() {
        dom.contextMenu.style.display = 'none';
        dom.hierarchyContextMenu.style.display = 'none';
        if (dom.animNodeContextMenu) dom.animNodeContextMenu.style.display = 'none';
    }

    createNewScript = async function(directoryHandle) {
        if (!directoryHandle) {
            alert("No se ha seleccionado ninguna carpeta.");
            return;
        }
        const scriptLang = currentPreferences.scriptLang || 'ces';
        const extension = `.${scriptLang}`;
        const defaultName = scriptLang === 'ces' ? 'PlayerMovement' : 'main';

        let scriptName = prompt(`Introduce el nombre del nuevo script (ej: ${defaultName}):`);
        if (!scriptName) return;

        // Sanitize and add extension
        const sanitizedName = scriptName.replace(/\.ces$|\.js$/, '');
        scriptName = sanitizedName + extension;

        const scriptTemplate = scriptLang === 'ces'
            ? `// Script creado en Creative Engine
function start() {
    // Se ejecuta una vez al iniciar
    console.log("¡El script ha comenzado!");
};

function update(deltaTime) {
    // Se ejecuta en cada frame
};`
            : `// JavaScript file created in Creative Engine
// This file can be used with a bundler or for more complex logic.

function start() {
    console.log("JS Script started!");
}

function update(deltaTime) {
    // Runs every frame
}
`;

        try {
            const fileHandle = await directoryHandle.getFileHandle(scriptName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(scriptTemplate);
            await writable.close();

            console.log(`Script '${scriptName}' creado en ${directoryHandle.name}.`);
            await updateAssetBrowser(); // Refresh asset browser
        } catch(err) {
            console.error(`Error al crear el script '${scriptName}':`, err);
            alert(`No se pudo crear el script. Revisa la consola para más detalles.`);
        }
    };

    saveCurrentScript = async function() {
        if (currentlyOpenFileHandle && codeEditor) {
            try {
                const content = codeEditor.state.doc.toString();
                const writable = await currentlyOpenFileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                console.log(`Script guardado: ${currentlyOpenFileHandle.name}`);
                // Optional: Add a visual confirmation
            } catch (error) {
                console.error(`Error al guardar el archivo ${currentlyOpenFileHandle.name}:`, error);
            }
        } else {
            console.warn("No hay ningún archivo abierto o el editor de código no está activo.");
        }
    };

    function handleKeyboardShortcuts(e) {
        // Ctrl+S or Cmd+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (dom.codeEditorContent.classList.contains('active')) {
                 saveCurrentScript();
            }
        }

        // Ctrl+P or Cmd+P to Play/Stop
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            if (isGameRunning) {
                stopGame();
            } else {
                startGame();
            }
        }

        // Tool switching only if not typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        switch(e.key.toLowerCase()) {
            case 'q':
                setActiveTool('move');
                break;
            case 'w':
                setActiveTool('pan');
                break;
            case 'e':
                setActiveTool('scale');
                break;
        }
    }

    const GIZMO_HANDLE_SIZE = 10; // In screen pixels

    function drawGizmos(renderer, materia) {
        const transform = materia.getComponent(Transform);
        if (!transform) return;

        // Draw camera gizmo for any materia with a Camera component, if not selected
        if (materia.getComponent(Camera) && (!selectedMateria || selectedMateria.id !== materia.id)) {
            renderer.ctx.font = `${40 / renderer.camera.effectiveZoom}px sans-serif`;
            renderer.ctx.textAlign = 'center';
            renderer.ctx.fillText('📷', transform.x, transform.y);
        }

        if (!selectedMateria || selectedMateria.id !== materia.id) {
            return; // Only draw manipulation gizmos for the selected materia
        }

        const ctx = renderer.ctx;
        const camera = renderer.camera;

        // Gizmo positions are in world space, but their size is constant on screen
        const handleScreenSize = GIZMO_HANDLE_SIZE / camera.zoom;
        const halfHandleSize = handleScreenSize / 2;

        const w = (selectedMateria.getComponent(BoxCollider)?.width ?? 100) * transform.scale.x;
        const h = (selectedMateria.getComponent(BoxCollider)?.height ?? 100) * transform.scale.y;
        const x = transform.x;
        const y = transform.y;

        ctx.save();
        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2 / camera.zoom;

        if (activeTool === 'move') {
            // Y-axis arrow
            ctx.fillStyle = 'green';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - h / 2 - handleScreenSize * 2);
            ctx.stroke();
            ctx.moveTo(x, y - h / 2 - handleScreenSize * 2);
            ctx.lineTo(x - handleScreenSize, y - h/2 - handleScreenSize);
            ctx.lineTo(x + handleScreenSize, y - h/2 - handleScreenSize);
            ctx.closePath();
            ctx.fill();

            // X-axis arrow
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + w / 2 + handleScreenSize * 2, y);
            ctx.stroke();
            ctx.moveTo(x + w / 2 + handleScreenSize * 2, y);
            ctx.lineTo(x + w/2 + handleScreenSize, y - handleScreenSize);
            ctx.lineTo(x + w/2 + handleScreenSize, y + handleScreenSize);
            ctx.closePath();
            ctx.fill();
        } else if (activeTool === 'scale') {
            ctx.fillStyle = 'blue';
            // Top-left
            ctx.fillRect(x - w/2 - halfHandleSize, y - h/2 - halfHandleSize, handleScreenSize, handleScreenSize);
            // Top-right
            ctx.fillRect(x + w/2 - halfHandleSize, y - h/2 - halfHandleSize, handleScreenSize, handleScreenSize);
            // Bottom-left
            ctx.fillRect(x - w/2 - halfHandleSize, y + h/2 - halfHandleSize, handleScreenSize, handleScreenSize);
            // Bottom-right
            ctx.fillRect(x + w/2 - halfHandleSize, y + h/2 - halfHandleSize, handleScreenSize, handleScreenSize);
        }

        ctx.restore();
    }

    function getGizmoHandleAt(worldPos, materia, renderer) {
        const transform = materia.getComponent(Transform);
        if (!transform) return null;

        const handleScreenSize = GIZMO_HANDLE_SIZE / renderer.camera.zoom;
        const w = (selectedMateria.getComponent(BoxCollider)?.width ?? 100) * transform.scale.x;
        const h = (selectedMateria.getComponent(BoxCollider)?.height ?? 100) * transform.scale.y;
        const x = transform.x;
        const y = transform.y;

        const checkRect = (px, py) => {
            return worldPos.x >= px - handleScreenSize/2 && worldPos.x <= px + handleScreenSize/2 &&
                   worldPos.y >= py - handleScreenSize/2 && worldPos.y <= py + handleScreenSize/2;
        };

        if (activeTool === 'scale') {
            if (checkRect(x - w / 2, y - h / 2)) return 'scale-tl';
            if (checkRect(x + w / 2, y - h / 2)) return 'scale-tr';
            if (checkRect(x - w / 2, y + h / 2)) return 'scale-bl';
            if (checkRect(x + w / 2, y + h / 2)) return 'scale-br';
        } else if (activeTool === 'move') {
            // A larger hit area for the arrows
            const arrowLength = h / 2 + handleScreenSize * 2;
            const arrowWidth = w / 2 + handleScreenSize * 2;
            if (worldPos.x > x && worldPos.x < x + arrowWidth && Math.abs(worldPos.y - y) < handleScreenSize) return 'move-x';
            if (worldPos.y < y && worldPos.y > y - arrowLength && Math.abs(worldPos.x - x) < handleScreenSize) return 'move-y';
        }

        // Check if clicking the object itself for a move action
        if (worldPos.x >= x - w/2 && worldPos.x <= x + w/2 && worldPos.y >= y - h/2 && worldPos.y <= y + h/2) {
            return 'move-body';
        }

        return null;
    }

    function setupEventListeners() {
        // --- Hierarchy Drag and Drop ---
        const hierarchyContent = dom.hierarchyContent;

        hierarchyContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            hierarchyContent.classList.add('drag-over');
        });

        hierarchyContent.addEventListener('dragleave', (e) => {
            hierarchyContent.classList.remove('drag-over');
        });

        hierarchyContent.addEventListener('drop', async (e) => {
            e.preventDefault();
            hierarchyContent.classList.remove('drag-over');
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));

            if (data.path && (data.path.endsWith('.png') || data.path.endsWith('.jpg'))) {
                const newMateria = new Materia(data.name.split('.')[0]);
                const spriteRenderer = new SpriteRenderer(newMateria);

                spriteRenderer.setSourcePath(data.path);
                await spriteRenderer.loadSprite(projectsDirHandle);

                newMateria.addComponent(spriteRenderer);
                SceneManager.currentScene.addMateria(newMateria);
                updateHierarchy();
                selectMateria(newMateria.id);
                console.log(`Creada nueva Materia '${newMateria.name}' desde el sprite '${data.name}'.`);
            } else {
                console.log(`El tipo de archivo '${data.name}' no se puede soltar en la jerarquía.`);
            }
        });


        // --- Asset Browser Listeners ---
        const gridView = dom.assetGridView;

        gridView.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.grid-item');
            if (item) {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    name: item.dataset.name,
                    kind: item.dataset.kind,
                    path: item.dataset.path // Include the full path
                }));
                e.dataTransfer.effectAllowed = 'copy';
            }
        });

        // This function encapsulates opening a controller from anywhere
        async function openAnimatorController(fileHandle) {
            try {
                // Ensure panel is visible
                if (dom.animatorControllerPanel.classList.contains('hidden')) {
                    document.getElementById('menu-window-animator').click();
                }

                const file = await fileHandle.getFile();
                const content = await file.text();
                currentControllerData = JSON.parse(content);
                currentControllerHandle = fileHandle;

                // Visually mark the item as selected in the panel's list
                const controllerAssetsList = dom.animatorControllerPanel.querySelector('#animator-controllers-list .list-content');
                controllerAssetsList.querySelectorAll('.asset-list-item').forEach(i => i.classList.remove('active'));
                const itemInList = controllerAssetsList.querySelector(`[data-name="${fileHandle.name}"]`);
                if (itemInList) {
                    itemInList.classList.add('active');
                }

                console.log(`Cargado controlador: ${fileHandle.name}`, currentControllerData);
                renderAnimatorGraph();
            } catch (error) {
                console.error(`Error al cargar el controlador '${fileHandle.name}':`, error);
                alert("No se pudo cargar el controlador.");
            }
        }

        // Double-click to open script or enter folder
        gridView.addEventListener('dblclick', async (e) => {
            const item = e.target.closest('.grid-item');
            if (!item) return;

            const name = item.dataset.name;
            const kind = item.dataset.kind;
            const path = item.dataset.path;

            if (kind === 'directory') {
                currentDirectoryHandle = { handle: await currentDirectoryHandle.handle.getDirectoryHandle(name), path: path };
                updateAssetBrowser();
            } else if (name.endsWith('.ces')) {
                await openScriptInEditor(name);
            } else if (name.endsWith('.cea')) {
                await openAnimationAsset(name);
            } else if (name.endsWith('.ceanim')) {
                const fileHandle = await currentDirectoryHandle.handle.getFileHandle(name);
                await openAnimatorController(fileHandle);
            } else if (name.endsWith('.ceScene')) {
                const sceneData = await SceneManager.loadScene(name, currentDirectoryHandle.handle, projectsDirHandle);
                if (sceneData) {
                    SceneManager.setCurrentScene(sceneData.scene);
                    SceneManager.setCurrentSceneFileHandle(sceneData.fileHandle);
                    dom.currentSceneName.textContent = name.replace('.ceScene', '');
                    updateHierarchy();
                    selectMateria(null);
                    SceneManager.setSceneDirty(false);
                }
            } else if (name.endsWith('.cep')) {
                const fileHandle = await currentDirectoryHandle.handle.getFileHandle(name);
                await importPackage(fileHandle);
            } else if (name.endsWith('.cmel')) {
                await updateInspectorForAsset(name, path);
            }
        });

        // Tool selection
        const toolMoveBtn = document.getElementById('tool-move');
        const toolPanBtn = document.getElementById('tool-pan');
        const toolScaleBtn = document.getElementById('tool-scale');
        setActiveTool = (toolName) => {
            activeTool = toolName;
            toolMoveBtn.classList.toggle('active', toolName === 'move');
            toolPanBtn.classList.toggle('active', toolName === 'pan');
            toolScaleBtn.classList.toggle('active', toolName === 'scale');
            console.log(`Herramienta activa: ${activeTool}`);
        };
        toolMoveBtn.addEventListener('click', () => setActiveTool('move'));
        toolPanBtn.addEventListener('click', () => setActiveTool('pan'));
        toolScaleBtn.addEventListener('click', () => setActiveTool('scale'));


        // Global deselection
        dom.editorContainer.addEventListener('mousedown', (e) => {
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

        // Hierarchy item selection & drag/drop
        dom.hierarchyContent.addEventListener('click', (e) => {
            const item = e.target.closest('.hierarchy-item');
            if (item) {
                const materiaId = parseInt(item.dataset.id, 10);
                selectMateria(materiaId);
            }
        });

        dom.hierarchyContent.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.hierarchy-item');
            if(item) {
                e.dataTransfer.setData('text/plain', item.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        dom.hierarchyContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            const item = e.target.closest('.hierarchy-item');
            if(item) {
                 // Simple visual feedback
                document.querySelectorAll('.hierarchy-item.drag-over').forEach(i => i.classList.remove('drag-over'));
                item.classList.add('drag-over');
            }
        });

        dom.hierarchyContent.addEventListener('dragleave', (e) => {
            const item = e.target.closest('.hierarchy-item');
            if(item) item.classList.remove('drag-over');
        });

        dom.hierarchyContent.addEventListener('drop', (e) => {
            e.preventDefault();
            document.querySelectorAll('.hierarchy-item.drag-over').forEach(i => i.classList.remove('drag-over'));

            const targetItem = e.target.closest('.hierarchy-item');
            const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);

            if (targetItem) {
                const targetId = parseInt(targetItem.dataset.id, 10);
                if (draggedId !== targetId) { // Can't parent to self
                    const draggedMateria = SceneManager.currentScene.findMateriaById(draggedId);
                    const targetMateria = SceneManager.currentScene.findMateriaById(targetId);
                    if (draggedMateria && targetMateria) {
                        targetMateria.addChild(draggedMateria);
                        updateHierarchy();
                    }
                }
            }
        });

        // --- Scene Canvas Mouse Listeners for Tools ---
        dom.sceneCanvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only handle left-clicks
            if (!renderer.camera) return;

            const worldPos = Input.getMouseWorldPosition(renderer.camera, dom.sceneCanvas);

            if (activeTool === 'pan') {
                isPanning = true;
                dom.sceneCanvas.classList.add('is-panning');
                lastMousePosition = { x: e.clientX, y: e.clientY };
                return;
            }

            let handle = null;
            if (selectedMateria) {
                handle = getGizmoHandleAt(worldPos, selectedMateria, renderer);
            }

            if (handle) {
                isDragging = true;
                const transform = selectedMateria.getComponent(Transform);
                dragState = {
                    handle,
                    materia: selectedMateria,
                    initialX: transform.x,
                    initialY: transform.y,
                    initialScaleX: transform.scale.x,
                    initialScaleY: transform.scale.y,
                    startMouseX: worldPos.x,
                    startMouseY: worldPos.y,
                };
            } else {
                // If not clicking a handle, we might be starting a pan or selecting a new materia
                let clickedMateria = null;
                for (const materia of [...SceneManager.currentScene.materias].reverse()) {
                    if (getGizmoHandleAt(worldPos, materia, renderer) === 'move-body') {
                        clickedMateria = materia;
                        break;
                    }
                }

                if (clickedMateria) {
                    selectMateria(clickedMateria.id);
                } else {
                    // This is a click on an empty area, start panning
                    isPanning = true;
                    dom.sceneCanvas.classList.add('is-panning');
                    lastMousePosition = { x: e.clientX, y: e.clientY };
                    selectMateria(null);
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const dx = (e.clientX - lastMousePosition.x) / renderer.camera.effectiveZoom;
                const dy = (e.clientY - lastMousePosition.y) / renderer.camera.effectiveZoom;
                const camMateria = SceneManager.currentScene.findFirstCamera();
                if(camMateria) {
                    const camTransform = camMateria.getComponent(Transform);
                    camTransform.x -= dx;
                    camTransform.y -= dy;
                }
                lastMousePosition = { x: e.clientX, y: e.clientY };
                updateScene(renderer, false); // Re-render on pan
            }

            if (isDragging) {
                if (!renderer.camera) return;
                const worldPos = Input.getMouseWorldPosition(renderer.camera, dom.sceneCanvas);
                const dx = worldPos.x - dragState.startMouseX;
                const dy = worldPos.y - dragState.startMouseY;
                const transform = dragState.materia.getComponent(Transform);

                if (dragState.handle.startsWith('move')) {
                    let newX = dragState.initialX + dx;
                    let newY = dragState.initialY + dy;

                    if (currentPreferences.snapping) {
                        const gridSize = parseInt(currentPreferences.gridSize, 10) || 25;
                        newX = Math.round(newX / gridSize) * gridSize;
                        newY = Math.round(newY / gridSize) * gridSize;
                    }

                     if (dragState.handle === 'move-x' || dragState.handle === 'move-body') {
                        transform.x = newX;
                     }
                     if (dragState.handle === 'move-y' || dragState.handle === 'move-body') {
                        transform.y = newY;
                     }
                } else if (dragState.handle.startsWith('scale')) {
                    // This scaling logic is simplified and might not feel perfect with pivots.
                    const newScaleX = dragState.initialScaleX + (dx / 100);
                    const newScaleY = dragState.initialScaleY - (dy / 100); // Invert Y
                    transform.scale.x = Math.max(0.1, newScaleX);
                    transform.scale.y = Math.max(0.1, newScaleY);
                }

                updateInspector();
                updateScene(renderer, false);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (isPanning) {
                dom.sceneCanvas.classList.remove('is-panning');
            }
            isPanning = false;
            isDragging = false;
            dragState = {};
        });

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

        // Single-click to select asset
        gridView.addEventListener('click', (e) => {
            const exportAssetBtn = document.getElementById('menu-export-asset');
            const item = e.target.closest('.grid-item');

            // De-select all others first
            gridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));

            if (item) {
                // Add active class *before* calling the inspector updates.
                item.classList.add('active');
                // This will call updateInspector, which now correctly finds the active asset.
                selectMateria(null);

                // Enable/disable export asset button
                if (item.dataset.kind === 'directory') {
                    exportAssetBtn.classList.remove('disabled');
                } else {
                    exportAssetBtn.classList.add('disabled');
                }
            } else {
                 // Clicked on background, clear inspector.
                 selectMateria(null);
                 exportAssetBtn.classList.add('disabled');
            }
        });

        // Custom Context Menu handler for assets
        gridView.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            const item = e.target.closest('.grid-item');
            const exportOption = dom.contextMenu.querySelector('[data-action="export-package"]');
            const exportDivider = dom.contextMenu.querySelector('.folder-only-divider');

            if (item && item.dataset.kind === 'directory') {
                // Right-clicked on a folder, select it and show export option
                gridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                await updateInspectorForAsset(item.dataset.name, item.dataset.path);
                exportOption.style.display = 'block';
                exportDivider.style.display = 'block';
            } else if (item) {
                 // Right-clicked on a file
                gridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                await updateInspectorForAsset(item.dataset.name, item.dataset.path);
                exportOption.style.display = 'none';
                exportDivider.style.display = 'none';
            } else {
                // Right-clicked on empty space
                exportOption.style.display = 'none';
                exportDivider.style.display = 'none';
            }

            showContextMenu(dom.contextMenu, e);
        });

        // Custom Context Menu handler for hierarchy
        dom.hierarchyContent.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const item = e.target.closest('.hierarchy-item');
            if (item) {
                const materiaId = parseInt(item.dataset.id, 10);
                selectMateria(materiaId);
            } else {
                // Clicking on empty space deselects any materia
                selectMateria(null);
            }
            showContextMenu(dom.hierarchyContextMenu, e);
        });

        // Animator Node Context Menu Actions
        dom.animNodeContextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const fromState = graphView.dataset.contextNode;
            hideContextMenus();

            if (action === 'create-transition') {
                if (fromState) {
                    graphView.classList.add('is-connecting');
                    graphView.dataset.fromState = fromState;
                }
            }
            // Other actions like delete-state would be handled here
        });

        // --- Animator Graph Dragging ---
        if (graphView) { // Ensure graphView is assigned before adding listeners
            graphView.addEventListener('mousedown', (e) => {
                const node = e.target.closest('.graph-node');
                if (node) {
                    e.preventDefault();
                    e.stopPropagation();

                    isDraggingNode = true;
                    const rect = node.getBoundingClientRect();
                    const graphRect = graphView.getBoundingClientRect();
                    dragNodeInfo = {
                        node: node,
                        offsetX: e.clientX - rect.left,
                        offsetY: e.clientY - rect.top,
                    };
                    graphView.classList.add('is-dragging');
                }
            });
        }
        window.addEventListener('mousemove', (e) => {
            if (isDraggingNode) {
                e.preventDefault();
                const graphRect = graphView.getBoundingClientRect();
                let newX = e.clientX - graphRect.left - dragNodeInfo.offsetX;
                let newY = e.clientY - graphRect.top - dragNodeInfo.offsetY;

                // Clamp position within the graph view
                newX = Math.max(0, Math.min(newX, graphRect.width - dragNodeInfo.node.offsetWidth));
                newY = Math.max(0, Math.min(newY, graphRect.height - dragNodeInfo.node.offsetHeight));

                dragNodeInfo.node.style.left = `${newX}px`;
                dragNodeInfo.node.style.top = `${newY}px`;

                // Update the data model
                const nodeName = dragNodeInfo.node.dataset.name;
                const state = currentControllerData.states.find(s => s.name === nodeName);
                if (state) {
                    state.position.x = newX;
                    state.position.y = newY;
                    updateGraphData(); // Keep the JSON data fresh for saving
                }
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (isDraggingNode) {
                isDraggingNode = false;
                dragNodeInfo = {};
                graphView.classList.remove('is-dragging');
            }
        });


        // Inspector button delegation & Drag/Drop
        dom.inspectorPanel.addEventListener('click', (e) => {
            if (e.target.id === 'open-animator-btn') {
                dom.animationPanel.classList.remove('hidden');
            } else if (e.target.matches('.sprite-select-btn')) {
                openSpriteSelector();
            } else if (e.target.matches('.prop-btn')) {
                 if (!selectedMateria) return;
                const componentName = e.target.dataset.component;
                const propName = e.target.dataset.prop;
                const value = e.target.dataset.value;

                const ComponentClass = window[componentName] || eval(componentName);
                if (!ComponentClass) return;

                const component = selectedMateria.getComponent(ComponentClass);
                if (component) {
                    component[propName] = value;
                    updateInspector(); // Re-render inspector to update active state
                    updateScene(renderer, false);
                }
            }
        });

        dom.inspectorPanel.addEventListener('change', e => {
            if (!selectedMateria) {
                // Handle asset inspector changes if no materia is selected
                const target = e.target;
                if (target.id === 'texture-type') {
                     const assetName = target.dataset.assetName;
                     const newType = target.value;
                     saveAssetMeta(assetName, { textureType: newType });
                }
                return;
            }

            const target = e.target;
            if (target.id === 'materia-active-toggle') {
                if (selectedMateria) {
                    selectedMateria.isActive = target.checked;
                    updateHierarchy(); // Update hierarchy to show disabled state
                }
            } else if (target.id === 'materia-name-input') {
                 if (selectedMateria) {
                    selectedMateria.name = target.value;
                    updateHierarchy();
                 }
            } else if (target.matches('.prop-input')) {
                const componentName = target.dataset.component;
                const propName = target.dataset.prop;
                let value = target.value;

                const ComponentClass = window[componentName] || eval(componentName);
                if (!ComponentClass) return;

                const component = selectedMateria.getComponent(ComponentClass);
                if (component) {
                    if (target.type === 'number') {
                        value = parseFloat(value) || 0;
                    }

                    if (component instanceof SpriteRenderer && propName === 'source') {
                        // Handled by drop
                    } else if (propName.includes('.')) {
                        const props = propName.split('.');
                        let obj = component;
                        for (let i = 0; i < props.length - 1; i++) {
                            obj = obj[props[i]];
                        }
                        obj[props[props.length - 1]] = value;
                    } else {
                        component[propName] = value;
                    }
                    updateScene(renderer, false);
                }
            }
        });

        dom.inspectorPanel.addEventListener('dragover', (e) => {
            const dropTarget = e.target.closest('.sprite-preview');
            if (dropTarget) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                dropTarget.classList.add('drag-over');
            }
        });

        dom.inspectorPanel.addEventListener('dragleave', (e) => {
            const dropTarget = e.target.closest('.sprite-preview');
            if (dropTarget) {
                dropTarget.classList.remove('drag-over');
            }
        });

        dom.inspectorPanel.addEventListener('change', (e) => {
            if(e.target.id === 'texture-type') {
                const assetName = e.target.dataset.assetName;
                const newType = e.target.value;
                saveAssetMeta(assetName, { textureType: newType });
            }
        });

        dom.inspectorPanel.addEventListener('drop', async (e) => {
            e.preventDefault();
            const dropTarget = e.target.closest('.sprite-preview');
            if (dropTarget) {
                dropTarget.classList.remove('drag-over');
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.path && (data.path.endsWith('.png') || data.path.endsWith('.jpg'))) {
                    if (selectedMateria) {
                        const spriteRenderer = selectedMateria.getComponent(SpriteRenderer);
                        if (spriteRenderer) {
                            spriteRenderer.setSourcePath(data.path);
                            await spriteRenderer.loadSprite(projectsDirHandle);
                            updateInspector();
                            updateScene(renderer, false);
                        }
                    }
                } else {
                    alert("Solo se pueden asignar archivos .png o .jpg como sprites.");
                }
            }
        });

        // Disable default context menus on other panels
        dom.scenePanel.addEventListener('contextmenu', e => e.preventDefault());
        dom.inspectorPanel.addEventListener('contextmenu', e => e.preventDefault());

        // Hide context menu on left-click
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('.menu-btn')) {
                hideContextMenus();
                dom.menubar.querySelectorAll('.menu-content').forEach(mc => mc.classList.remove('visible'));
            }
        });

        // Hierarchy Context Menu Actions
        dom.hierarchyContextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            hideContextMenus(); // Hide menu immediately after a click

            switch (action) {
                case 'create-empty':
                    createEmptyMateria(undefined, selectedMateria);
                    break;
                case 'create-primitive-square': {
                    const parent = selectedMateria || findOrCreateCanvas();
                    const square = new Materia('Cuadrado');
                    square.leyes = square.leyes.filter(c => !(c instanceof Transform));
                    square.addComponent(new RectTransform(square));
                    const image = square.addComponent(new UIImage(square));
                    image.color = '#FFFFFF';
                    parent.addChild(square);
                    updateHierarchy();
                    selectMateria(square.id);
                    break;
                }
                case 'create-ui-panel': {
                    const canvas = findOrCreateCanvas();
                    const panelMateria = new Materia('Panel');
                    panelMateria.leyes = panelMateria.leyes.filter(c => !(c instanceof Transform));
                    panelMateria.addComponent(new RectTransform(panelMateria));
                    panelMateria.addComponent(new UIPanel(panelMateria));
                    panelMateria.layer = 'UI';
                    canvas.addChild(panelMateria);
                    updateHierarchy();
                    selectMateria(panelMateria.id);
                    break;
                }
                case 'create-ui-canvas': {
                    const canvasMateria = new Materia('Canvas');
                    canvasMateria.leyes = canvasMateria.leyes.filter(c => !(c instanceof Transform));
                    canvasMateria.addComponent(new RectTransform(canvasMateria));
                    canvasMateria.addComponent(new UICanvas(canvasMateria));
                    canvasMateria.layer = 'UI';
                    SceneManager.currentScene.addMateria(canvasMateria);
                    updateHierarchy();
                    selectMateria(canvasMateria.id);
                    break;
                }
                case 'create-ui-text': {
                    const canvas = findOrCreateCanvas();
                    const textMateria = new Materia('Texto');
                    textMateria.leyes = textMateria.leyes.filter(c => !(c instanceof Transform));
                    textMateria.addComponent(new RectTransform(textMateria));
                    textMateria.addComponent(new UIText(textMateria));
                    textMateria.layer = 'UI';
                    canvas.addChild(textMateria);
                    updateHierarchy();
                    selectMateria(textMateria.id);
                    break;
                }
                case 'create-ui-button': {
                    const canvas = findOrCreateCanvas();
                    const buttonMateria = new Materia('Botón');
                    buttonMateria.leyes = buttonMateria.leyes.filter(c => !(c instanceof Transform));
                    buttonMateria.addComponent(new RectTransform(buttonMateria));
                    buttonMateria.addComponent(new UIButton(buttonMateria));
                    buttonMateria.layer = 'UI';
                    canvas.addChild(buttonMateria);
                    updateHierarchy();
                    selectMateria(buttonMateria.id);
                    break;
                }
                case 'create-ui-image': {
                    const canvas = findOrCreateCanvas();
                    const imageMateria = new Materia('Imagen');
                    imageMateria.leyes = imageMateria.leyes.filter(c => !(c instanceof Transform));
                    imageMateria.addComponent(new RectTransform(imageMateria));
                    imageMateria.addComponent(new UIImage(imageMateria));
                    imageMateria.layer = 'UI';
                    canvas.addChild(imageMateria);
                    updateHierarchy();
                    selectMateria(imageMateria.id);
                    break;
                }
                case 'create-camera': {
                    createEmptyMateria('Cámara', selectedMateria).addComponent(new Camera());
                    break;
                }
                case 'rename':
                    if (selectedMateria) {
                        const newName = prompt(`Renombrar '${selectedMateria.name}':`, selectedMateria.name);
                        if (newName && newName.trim() !== '') {
                            selectedMateria.name = newName.trim();
                            updateHierarchy();
                            updateInspector();
                        }
                    }
                    break;
                case 'delete':
                    if (selectedMateria) {
                        if (confirm(`¿Estás seguro de que quieres eliminar '${selectedMateria.name}'? Esta acción no se puede deshacer.`)) {
                            const idToDelete = selectedMateria.id;
                            selectMateria(null); // Deselect first
                            SceneManager.currentScene.removeMateria(idToDelete);
                            updateHierarchy();
                            updateInspector();
                        }
                    }
                    break;
            }
        });

        // Asset Context Menu Actions
        dom.contextMenu.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            if (!action) return;
            hideContextMenus();

            const selectedAsset = dom.assetGridView.querySelector('.grid-item.active');

            if (action === 'create-script') {
                await createNewScript(currentDirectoryHandle.handle);
            } else if (action === 'create-folder') {
                const folderName = prompt("Nombre de la nueva carpeta:");
                if (folderName) {
                    try {
                        await currentDirectoryHandle.handle.getDirectoryHandle(folderName, { create: true });
                        await updateAssetBrowser();
                    } catch (err) {
                        console.error("Error al crear la carpeta:", err);
                        alert("No se pudo crear la carpeta.");
                    }
                }
            } else if (action === 'create-readme') {
                const fileName = "NUEVO-LEAME.md";
                try {
                    const fileHandle = await currentDirectoryHandle.handle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write("# Nuevo Archivo Léame\n\nEscribe tu contenido aquí.");
                    await writable.close();
                    await updateAssetBrowser();
                } catch (err) {
                    console.error("Error al crear el archivo Léame:", err);
                    alert("No se pudo crear el archivo.");
                }
            } else if (action === 'create-scene') {
                const sceneName = prompt("Nombre de la nueva escena:");
                if (sceneName) {
                    const fileName = `${sceneName}.ceScene`;
                    const defaultContent = {
                        materias: [] // An empty scene
                    };
                    try {
                        const fileHandle = await currentDirectoryHandle.handle.getFileHandle(fileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(JSON.stringify(defaultContent, null, 2));
                        await writable.close();
                        await updateAssetBrowser();
                    } catch (err) {
                        console.error("Error al crear la escena:", err);
                        alert("No se pudo crear la escena.");
                    }
                }
            } else if (action === 'create-animation') {
                const animName = prompt("Nombre del nuevo asset de animación:");
                if (animName) {
                    const fileName = `${animName}.cea`;
                    const defaultContent = {
                        animations: [
                            { name: 'default', speed: 10, loop: true, frames: [] }
                        ]
                    };
                    try {
                        const fileHandle = await currentDirectoryHandle.handle.getFileHandle(fileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(JSON.stringify(defaultContent, null, 2));
                        await writable.close();
                        await updateAssetBrowser();
                    } catch (err) {
                        console.error("Error al crear el asset de animación:", err);
                        alert("No se pudo crear el asset de animación.");
                    }
                }
            } else if (action === 'delete') {
                if (selectedAsset) {
                    const assetName = selectedAsset.dataset.name;
                    if (confirm(`¿Estás seguro de que quieres borrar '${assetName}'? Esta acción no se puede deshacer.`)) {
                        try {
                            await currentDirectoryHandle.handle.removeEntry(assetName, { recursive: true });
                            console.log(`'${assetName}' borrado.`);
                            await updateAssetBrowser();
                        } catch (err) {
                            console.error(`Error al borrar '${assetName}':`, err);
                            alert(`No se pudo borrar el asset.`);
                        }
                    }
                } else {
                    alert("Por favor, selecciona un archivo o carpeta para borrar.");
                }
            } else if (action === 'export-package') {
                 if (selectedAsset && selectedAsset.dataset.kind === 'directory') {
                    await exportPackage(selectedAsset.dataset.name);
                 } else {
                    alert("Por favor, selecciona una carpeta para exportar.");
                 }
            } else if (action === 'create-package') {
                const packageName = prompt("Nombre del nuevo paquete:");
                if (packageName) {
                    const fileName = `${packageName}.cep`;
                    const zip = new JSZip();
                    zip.file("manifest.json", JSON.stringify({ name: packageName, version: "1.0.0", contents: [] }, null, 2));

                    try {
                        const blob = await zip.generateAsync({type: 'blob'});
                        const fileHandle = await currentDirectoryHandle.handle.getFileHandle(fileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        await updateAssetBrowser();
                    } catch (err) {
                        console.error("Error al crear el paquete:", err);
                        alert("No se pudo crear el paquete.");
                    }
                }
            } else if (action === 'rename') {
                if (selectedAsset) {
                    const oldName = selectedAsset.dataset.name;
                    const newName = prompt(`Renombrar '${oldName}':`, oldName);

                    if (newName && newName !== oldName) {
                        try {
                             if (selectedAsset.dataset.kind === 'directory') {
                                alert("El renombrado de carpetas aún no está implementado.");
                                return;
                            }
                            const oldFileHandle = await currentDirectoryHandle.handle.getFileHandle(oldName);
                            const content = await (await oldFileHandle.getFile()).text();

                            const newFileHandle = await currentDirectoryHandle.handle.getFileHandle(newName, { create: true });
                            const writable = await newFileHandle.createWritable();
                            await writable.write(content);
                            await writable.close();

                            await currentDirectoryHandle.handle.removeEntry(oldName);

                            console.log(`'${oldName}' renombrado a '${newName}'.`);
                            await updateAssetBrowser();
                        } catch (err) {
                            console.error(`Error al renombrar '${oldName}':`, err);
                            alert(`No se pudo renombrar el asset.`);
                        }
                    }
                } else {
                    alert("Por favor, selecciona un archivo para renombrar.");
                }
            }
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
                if (panel) {
                    panel.classList.add('hidden');
                    if (panelId === 'animation-panel') {
                        resetAnimationPanel();
                    } else {
                        const panelName = panelId.replace('-panel', '');
                        panelVisibility[panelName] = false;
                        updateEditorLayout();
                        updateWindowMenuUI();
                    }
                }
            });
        });

        // Window Menu Logic
        dom.menubar.querySelector('.menu-item:nth-child(3) .menu-content').addEventListener('click', async (e) => {
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
            } else if (panelName === 'animation') {
                dom.animationPanel.classList.toggle('hidden');
            } else if (panelName === 'animator') {
                const panel = dom.animatorControllerPanel;
                const isHiding = panel.classList.toggle('hidden');
                panelVisibility[panelName] = !isHiding;
                updateWindowMenuUI();

                if (!isHiding) {
                    graphView = panel.querySelector('.graph-view'); // Assign the graph view element

                    // Populate the lists when the panel is opened
                    const animAssetsList = panel.querySelector('#animator-assets-list .list-content');
                    const controllerAssetsList = panel.querySelector('#animator-controllers-list .list-content');
                    animAssetsList.innerHTML = 'Buscando...';
                    controllerAssetsList.innerHTML = 'Buscando...';

                    const animFiles = [];
                    const controllerFiles = [];
                    async function findFiles(dirHandle) {
                        for await (const entry of dirHandle.values()) {
                            if (entry.kind === 'file') {
                                if (entry.name.endsWith('.cea')) animFiles.push(entry.name);
                                if (entry.name.endsWith('.ceanim')) controllerFiles.push({name: entry.name, handle: entry});
                            } else if (entry.kind === 'directory') {
                                await findFiles(entry);
                            }
                        }
                    }

                    const projectName = new URLSearchParams(window.location.search).get('project');
                    const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
                    await findFiles(projectHandle);

                    animAssetsList.innerHTML = '';
                    animFiles.forEach(name => {
                        const item = document.createElement('div');
                        item.textContent = name;
                        item.className = 'asset-list-item';
                        animAssetsList.appendChild(item);
                    });

                    controllerAssetsList.innerHTML = '';
                    controllerFiles.forEach(fileInfo => {
                        const item = document.createElement('div');
                        item.textContent = fileInfo.name;
                        item.className = 'asset-list-item';
                        item.dataset.name = fileInfo.name;
                        item.addEventListener('click', async () => {
                             try {
                                const file = await fileInfo.handle.getFile();
                                const content = await file.text();
                                currentControllerData = JSON.parse(content);
                                currentControllerHandle = fileInfo.handle;

                                // Visually mark this item as selected
                                controllerAssetsList.querySelectorAll('.asset-list-item').forEach(i => i.classList.remove('active'));
                                item.classList.add('active');

                                console.log(`Cargado controlador: ${fileInfo.name}`, currentControllerData);
                                renderAnimatorGraph();
                            } catch (error) {
                                console.error(`Error al cargar el controlador '${fileInfo.name}':`, error);
                                alert("No se pudo cargar el controlador.");
                            }
                        });
                        controllerAssetsList.appendChild(item);
                    });
                }
            }
        });

        // Code Editor Toolbar Buttons
        document.getElementById('code-save-btn').addEventListener('click', () => saveCurrentScript());
        document.getElementById('code-undo-btn').addEventListener('click', () => {
            if (codeEditor) undo(codeEditor);
        });
        document.getElementById('code-redo-btn').addEventListener('click', () => {
            if (codeEditor) redo(codeEditor);
        });

        // --- Animation Drawing Listeners ---
        const drawingCanvas = dom.drawingCanvas;
        const drawingCtx = drawingCanvas.getContext('2d');

        function getDrawPos(e) {
            const rect = drawingCanvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }

        drawingCanvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            lastDrawPos = getDrawPos(e);
        });

        const PIXEL_GRID_SIZE = 16;

        drawingCanvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;

            let currentPos = getDrawPos(e);

            if (drawingMode === 'pixel') {
                drawingCtx.globalCompositeOperation = 'source-over'; // Eraser in pixel mode just paints background
                const x = Math.floor(currentPos.x / PIXEL_GRID_SIZE) * PIXEL_GRID_SIZE;
                const y = Math.floor(currentPos.y / PIXEL_GRID_SIZE) * PIXEL_GRID_SIZE;
                drawingCtx.fillStyle = drawingTool === 'pencil' ? drawingColor : 'rgba(0,0,0,0)';
                if(drawingTool === 'eraser') drawingCtx.clearRect(x,y,PIXEL_GRID_SIZE,PIXEL_GRID_SIZE);
                else drawingCtx.fillRect(x, y, PIXEL_GRID_SIZE, PIXEL_GRID_SIZE);

            } else { // Free mode
                if (drawingTool === 'eraser') {
                    drawingCtx.globalCompositeOperation = 'destination-out';
                } else {
                    drawingCtx.globalCompositeOperation = 'source-over';
                }
                drawingCtx.beginPath();
                drawingCtx.strokeStyle = drawingColor;
                drawingCtx.lineWidth = drawingTool === 'pencil' ? 2 : 20;
                drawingCtx.lineCap = 'round';
                drawingCtx.moveTo(lastDrawPos.x, lastDrawPos.y);
                drawingCtx.lineTo(currentPos.x, currentPos.y);
                drawingCtx.stroke();
            }

            lastDrawPos = currentPos;
        });

        drawingCanvas.addEventListener('mouseup', () => isDrawing = false);
        drawingCanvas.addEventListener('mouseout', () => isDrawing = false);

        dom.drawingTools.addEventListener('click', (e) => {
            const toolButton = e.target.closest('.tool-btn');
            if (toolButton) {
                if (toolButton.dataset.tool) {
                    dom.drawingTools.querySelectorAll('[data-tool]').forEach(btn => btn.classList.remove('active'));
                    toolButton.classList.add('active');
                    drawingTool = toolButton.dataset.tool;
                } else if (toolButton.dataset.drawMode) {
                    dom.drawingTools.querySelectorAll('[data-draw-mode]').forEach(btn => btn.classList.remove('active'));
                    toolButton.classList.add('active');
                    drawingMode = toolButton.dataset.drawMode;
                }
            }
        });

        dom.drawingColorPicker.addEventListener('change', (e) => {
            drawingColor = e.target.value;
        });


        // Project Settings Listeners
        document.getElementById('menu-project-settings').addEventListener('click', () => {
            dom.projectSettingsModal.classList.add('is-open');
        });

        if (dom.settingsSaveBtn) {
            dom.settingsSaveBtn.addEventListener('click', saveProjectConfig);
        }

        // Engine Logo confirmation logic
        if (dom.settingsShowEngineLogo) {
            dom.settingsShowEngineLogo.addEventListener('click', (e) => {
                if (!e.target.checked) {
                    e.preventDefault();
                    dom.engineLogoConfirmModal.classList.add('is-open');
                }
            });
        }

        if (dom.confirmDisableLogoBtn) {
            dom.confirmDisableLogoBtn.addEventListener('click', () => {
                dom.settingsShowEngineLogo.checked = false;
                dom.engineLogoConfirmModal.classList.remove('is-open');
            });
        }

        // File Pickers for Project Settings
        if (dom.settingsIconPickerBtn) {
            dom.settingsIconPickerBtn.addEventListener('click', async () => {
                try {
                    const [fileHandle] = await window.showOpenFilePicker({
                        types: [{ description: 'Images', accept: { 'image/png': ['.png'], 'image/x-icon': ['.ico'] } }],
                        multiple: false
                    });
                    currentProjectConfig.iconPath = fileHandle.name; // For simplicity, just store the name
                    const file = await fileHandle.getFile();
                    dom.settingsIconPreview.src = URL.createObjectURL(file);
                    dom.settingsIconPreview.style.display = 'block';
                } catch (err) {
                    console.log("User cancelled file picker or error occurred:", err);
                }
            });
        }

        if (dom.settingsExportProjectBtn) {
            dom.settingsExportProjectBtn.addEventListener('click', () => {
                alert("Esta función exportará la carpeta 'Assets' como un paquete .cep. La funcionalidad para exportar un build completo del juego se añadirá en el futuro.");
                exportPackage('Assets');
            });
        }

        // Preferences Listeners
        document.getElementById('menu-preferences').addEventListener('click', () => {
            dom.preferencesModal.classList.add('is-open');
        });

        if (dom.prefsTheme) {
            dom.prefsTheme.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    dom.prefsCustomThemePicker.classList.remove('hidden');
                } else {
                    dom.prefsCustomThemePicker.classList.add('hidden');
                }
            });
        }

        if (dom.prefsAutosaveToggle) {
            dom.prefsAutosaveToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    dom.prefsAutosaveIntervalGroup.classList.remove('hidden');
                } else {
                    dom.prefsAutosaveIntervalGroup.classList.add('hidden');
                }
            });
        }

        if (dom.prefsSaveBtn) {
            dom.prefsSaveBtn.addEventListener('click', savePreferences);
        }

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
        if (dom.keystoreCreateBtn) {
            dom.keystoreCreateBtn.addEventListener('click', () => {
                dom.keystoreCreateModal.classList.add('is-open');
            });
        }

        // Layer Management Button Listeners
        if (dom.addSortingLayerBtn) {
            dom.addSortingLayerBtn.addEventListener('click', () => {
                const newName = dom.newSortingLayerName.value.trim();
                if (newName && !currentProjectConfig.layers.sortingLayers.includes(newName)) {
                    currentProjectConfig.layers.sortingLayers.push(newName);
                    dom.newSortingLayerName.value = '';
                    populateLayerLists();
                } else if (!newName) {
                    alert("El nombre del layer no puede estar vacío.");
                } else {
                    alert(`El layer '${newName}' ya existe.`);
                }
            });
        }
        if (dom.addCollisionLayerBtn) {
            dom.addCollisionLayerBtn.addEventListener('click', () => {
                const newName = dom.newCollisionLayerName.value.trim();
                if (newName && !currentProjectConfig.layers.collisionLayers.includes(newName)) {
                    currentProjectConfig.layers.collisionLayers.push(newName);
                    dom.newCollisionLayerName.value = '';
                    populateLayerLists();
                } else if (!newName) {
                    alert("El nombre del layer no puede estar vacío.");
                } else {
                    alert(`El layer '${newName}' ya existe.`);
                }
            });
        }

        // --- Music Player Logic ---
        function updatePlaylistUI() {
            if (!dom.playlistContainer) return;
            dom.playlistContainer.innerHTML = '';
            playlist.forEach((track, index) => {
                const item = document.createElement('div');
                item.className = 'playlist-item';
                if (index === currentTrackIndex) {
                    item.classList.add('playing');
                }
                item.textContent = track.name;
                item.dataset.index = index;
                item.addEventListener('click', () => playTrack(index));
                dom.playlistContainer.appendChild(item);
            });
        }

        function playTrack(index) {
            if (index < 0 || index >= playlist.length) {
                // Stop playback if playlist ends
                audioElement.pause();
                currentTrackIndex = -1;
                dom.nowPlayingTitle.textContent = "Nada en reproducción";
                dom.musicPlayPauseBtn.textContent = "▶️";
                updatePlaylistUI();
                return;
            }
            currentTrackIndex = index;
            const track = playlist[index];
            dom.nowPlayingTitle.textContent = track.name;

            track.handle.getFile().then(file => {
                const url = URL.createObjectURL(file);
                audioElement.src = url;
                audioElement.play();
                dom.musicPlayPauseBtn.textContent = "⏸️";
            });

            updatePlaylistUI();
        }

        if (dom.toolbarMusicBtn) {
            dom.toolbarMusicBtn.addEventListener('click', () => {
                dom.musicPlayerPanel.classList.toggle('hidden');
            });
        }

        if (dom.musicAddBtn) {
            dom.musicAddBtn.addEventListener('click', async () => {
                try {
                    const fileHandles = await window.showOpenFilePicker({
                        types: [{ description: 'Audio', accept: { 'audio/*': ['.mp3', '.wav', '.ogg'] } }],
                        multiple: true
                    });
                    fileHandles.forEach(handle => {
                        playlist.push({ name: handle.name, handle: handle });
                    });
                    updatePlaylistUI();
                    if (currentTrackIndex === -1 && playlist.length > 0) {
                        playTrack(0);
                    }
                } catch (err) {
                    console.log("User cancelled file picker or error occurred:", err);
                }
            });
        }

        if (dom.musicPlayPauseBtn) {
            dom.musicPlayPauseBtn.addEventListener('click', () => {
                if (audioElement.paused && currentTrackIndex !== -1) {
                    audioElement.play();
                    dom.musicPlayPauseBtn.textContent = "⏸️";
                } else {
                    audioElement.pause();
                    dom.musicPlayPauseBtn.textContent = "▶️";
                }
            });
        }

        if (dom.musicNextBtn) {
            dom.musicNextBtn.addEventListener('click', () => {
                playTrack((currentTrackIndex + 1) % playlist.length);
            });
        }

        if (dom.musicPrevBtn) {
            dom.musicPrevBtn.addEventListener('click', () => {
                const newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
                playTrack(newIndex);
            });
        }

        if (dom.musicVolumeSlider) {
            dom.musicVolumeSlider.addEventListener('input', (e) => {
                audioElement.volume = e.target.value;
            });
        }

        audioElement.addEventListener('ended', () => {
            playTrack((currentTrackIndex + 1) % playlist.length); // Autoplay next
        });


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


        // --- Export/Import Listeners ---
        document.getElementById('menu-import-asset').addEventListener('click', () => handleImport());
        document.getElementById('menu-import-project').addEventListener('click', () => handleImport());

        async function confirmImport(zip) {
            const checkedItems = dom.packageFileTreeContainer.querySelectorAll('input[type=checkbox]:checked');
            console.log(`Importando ${checkedItems.length} archivos...`);

            try {
                for (const item of checkedItems) {
                    const path = item.dataset.path;
                    const zipEntry = zip.file(path);

                    if (zipEntry && !zipEntry.dir) {
                        const pathParts = path.split('/').filter(p => p);
                        const fileName = pathParts.pop();

                        let currentDirHandle = currentDirectoryHandle.handle; // Start from the current asset folder

                        // Create directories if they don't exist
                        for (const part of pathParts) {
                            currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true });
                        }

                        const newFileHandle = await currentDirHandle.getFileHandle(fileName, { create: true });
                        const content = await zipEntry.async('blob');
                        const writable = await newFileHandle.createWritable();
                        await writable.write(content);
                        await writable.close();
                    }
                }
                alert("¡Importación completada con éxito!");
                dom.packageFileTreeModal.classList.remove('is-open');
                await updateAssetBrowser();

            } catch (error) {
                console.error("Error durante la importación de archivos:", error);
                alert("Ocurrió un error al importar los archivos. Revisa la consola.");
            }
        }

        async function handleImport() {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{ description: 'Creative Engine Package', accept: { 'application/zip': ['.cep'] } }],
                    multiple: false
                });

                const file = await fileHandle.getFile();
                const zip = await JSZip.loadAsync(file);
                const manifestFile = zip.file('manifest.json');

                if (!manifestFile) {
                    alert("Este no es un paquete válido. Falta el archivo manifest.json.");
                    return;
                }

                const manifestContent = await manifestFile.async('string');
                const manifest = JSON.parse(manifestContent);

                // Configure and show the package modal for IMPORT
                dom.packageModalTitle.textContent = 'Importar Paquete';
                dom.packageModalDescription.innerHTML = `<p><b>Descripción:</b> ${manifest.description || 'N/A'}</p>`;
                dom.packageExportControls.style.display = 'none';
                dom.packageImportControls.style.display = 'flex';

                // Populate file tree from manifest
                const container = dom.packageFileTreeContainer;
                container.innerHTML = '';
                manifest.fileList.forEach(path => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'file-tree-item';
                    const depth = path.split('/').length - 1;
                    itemDiv.style.paddingLeft = `${depth * 20}px`;

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = true;
                    checkbox.dataset.path = path;

                    const label = document.createElement('label');
                    label.textContent = ` ${path.endsWith('/') ? '📁' : '📄'} ${path.split('/').pop() || path}`;

                    itemDiv.appendChild(checkbox);
                    itemDiv.appendChild(label);
                    container.appendChild(itemDiv);
                });

                dom.packageFileTreeModal.classList.add('is-open');

                // Store context for the import confirmation button
                dom.importConfirmBtn.onclick = async () => {
                    await confirmImport(zip);
                };

            } catch(err) {
                console.log("Importación cancelada o fallida:", err);
            }
        }

        document.getElementById('menu-export-project').addEventListener('click', () => {
            exportContext.type = 'project';
            dom.exportDescriptionText.value = '';
            dom.exportDescriptionModal.classList.add('is-open');
        });

        document.getElementById('menu-export-asset').addEventListener('click', async () => {
            const selectedAsset = dom.assetGridView.querySelector('.grid-item.active');
            if (!selectedAsset || selectedAsset.dataset.kind !== 'directory') {
                alert("Por favor, selecciona una carpeta en el Navegador de Assets para exportar.");
                return;
            }
            exportContext.type = 'asset';
            // Correctly get the handle for the selected asset folder
            exportContext.assetName = selectedAsset.dataset.name;
            dom.exportDescriptionText.value = '';
            dom.exportDescriptionModal.classList.add('is-open');
        });

        dom.exportDescriptionNextBtn.addEventListener('click', async () => {
            exportContext.description = dom.exportDescriptionText.value;
            dom.exportDescriptionModal.classList.remove('is-open');

            // Configure and show the package modal for EXPORT
            dom.packageModalTitle.textContent = 'Seleccionar Archivos para Exportar';
            dom.packageModalDescription.innerHTML = ''; // Not needed for export
            dom.packageImportControls.style.display = 'none';
            dom.packageExportControls.style.display = 'flex';
            dom.packageFileTreeContainer.innerHTML = 'Cargando archivos...';
            dom.packageFileTreeModal.classList.add('is-open');

            try {
                let root;
                let defaultFilename;
                let pathPrefix = '';
                const projectName = new URLSearchParams(window.location.search).get('project');

                if (exportContext.type === 'project') {
                    root = await projectsDirHandle.getDirectoryHandle(projectName);
                    defaultFilename = `${projectName}.cep`;
                } else { // asset
                    root = await currentDirectoryHandle.handle.getDirectoryHandle(exportContext.assetName);
                    defaultFilename = `${exportContext.assetName}.cep`;
                    pathPrefix = `${exportContext.assetName}/`;
                }
                exportContext.rootHandle = root; // Store the actual handle
                dom.exportFilename.value = defaultFilename;
                dom.packageFileTreeContainer.innerHTML = ''; // Use correct variable
                await populateFileTree(dom.packageFileTreeContainer, root, pathPrefix); // Use correct variable

            } catch (error) {
                console.error("Error detallado al poblar el árbol de archivos:", error);
                dom.packageFileTreeContainer.innerHTML = `<p class="error-message">No se pudieron cargar los archivos. Revisa la consola del navegador (F12) para más detalles.</p>`;
            }
        });

        dom.exportConfirmBtn.addEventListener('click', async () => {
            const filesToExport = [];
            const checkboxes = dom.packageFileTreeContainer.querySelectorAll('input[type=checkbox]:checked'); // Use correct variable

            checkboxes.forEach(cb => {
                const path = cb.dataset.path;
                const handle = exportFileHandleMap.get(path);
                if (handle) {
                    filesToExport.push({ path: path, handle: handle });
                }
            });

            const manifest = {
                type: exportContext.type,
                description: exportContext.description,
                fileList: filesToExport.map(f => f.path)
            };
            exportContext.fileName = dom.exportFilename.value || 'package.cep';

            await exportPackage(filesToExport, manifest);
        });


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


        // --- Floating Panel Dragging & Resizing (Generic) ---
        document.body.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.floating-panel .resize-handle');
            const header = e.target.closest('.floating-panel .panel-header');

            if (handle) {
                isResizingPanel = true;
                const panel = handle.closest('.floating-panel');
                const rect = panel.getBoundingClientRect();
                panelResizeState = {
                    panel: panel,
                    direction: handle.dataset.direction,
                    initialX: e.clientX,
                    initialY: e.clientY,
                    initialWidth: rect.width,
                    initialHeight: rect.height
                };
                document.body.classList.add('is-dragging-panel');
                e.preventDefault();
            } else if (header) {
                if (e.target.matches('button, input, select')) return;
                isMovingPanel = true;
                const panel = header.closest('.floating-panel');
                const rect = panel.getBoundingClientRect();
                panelMoveOffset = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                panelMoveState = { panel: panel };
                document.body.classList.add('is-dragging-panel');
                e.preventDefault();
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isMovingPanel && panelMoveState.panel) {
                const newX = e.clientX - panelMoveOffset.x;
                const newY = e.clientY - panelMoveOffset.y;
                panelMoveState.panel.style.left = `${newX}px`;
                panelMoveState.panel.style.top = `${newY}px`;
                panelMoveState.panel.style.transform = 'none';
            } else if (isResizingPanel && panelResizeState.panel) {
                const dx = e.clientX - panelResizeState.initialX;
                const dy = e.clientY - panelResizeState.initialY;

                if (panelResizeState.direction === 'right' || panelResizeState.direction === 'both') {
                    const newWidth = panelResizeState.initialWidth + dx;
                    panelResizeState.panel.style.width = `${Math.max(400, newWidth)}px`;
                }
                if (panelResizeState.direction === 'bottom' || panelResizeState.direction === 'both') {
                    const newHeight = panelResizeState.initialHeight + dy;
                    panelResizeState.panel.style.height = `${Math.max(300, newHeight)}px`;
                }
            }
        });

        window.addEventListener('mouseup', () => {
            isMovingPanel = false;
            isResizingPanel = false;
            panelMoveState = {};
            panelResizeState = {};
            document.body.classList.remove('is-dragging-panel');
        });

        // --- Animation Panel Toggles ---
        const timelineToggleBtn = document.getElementById('timeline-toggle-btn');
        timelineToggleBtn.addEventListener('click', () => {
            const isCollapsed = dom.animationPanel.classList.toggle('timeline-collapsed');
            timelineToggleBtn.textContent = isCollapsed ? '▼' : '▲';
        });

        dom.animationPlayBtn.addEventListener('click', startAnimationPlayback);
        dom.animationStopBtn.addEventListener('click', stopAnimationPlayback);
        dom.animationSaveBtn.addEventListener('click', saveAnimationAsset);

        dom.addFrameBtn.addEventListener('click', addFrameFromCanvas);

        dom.deleteFrameBtn.addEventListener('click', () => {
            if (currentFrameIndex === -1) {
                alert("Por favor, selecciona un fotograma para borrar.");
                return;
            }

            if (currentAnimationAsset && currentAnimationAsset.animations[0]) {
                currentAnimationAsset.animations[0].frames.splice(currentFrameIndex, 1);
                currentFrameIndex = -1; // Deselect

                const ctx = dom.drawingCanvas.getContext('2d');
                ctx.clearRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);

                populateTimeline();
            }
        });

        dom.animationTimeline.addEventListener('click', (e) => {
            const frame = e.target.closest('.timeline-frame');
            if (!frame) return;

            const index = parseInt(frame.dataset.index, 10);
            currentFrameIndex = index;

            const ctx = dom.drawingCanvas.getContext('2d');
            ctx.clearRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);
            ctx.drawImage(frame, 0, 0);

            populateTimeline(); // Re-render to show active state
        });

        // Animator Controller Toolbar Logic
        const newAnimCtrlBtn = document.getElementById('anim-ctrl-new-btn');
        const saveAnimCtrlBtn = document.getElementById('anim-ctrl-save-btn');

        // This function will be called to render the graph from data
        function renderAnimatorGraph() {
            if (!currentControllerData || !graphView) return;

            graphView.innerHTML = ''; // Clear previous state
            currentControllerData.states.forEach(state => {
                const node = document.createElement('div');
                node.className = 'graph-node';
                node.textContent = state.name;
                node.style.left = `${state.position.x}px`;
                node.style.top = `${state.position.y}px`;
                node.dataset.name = state.name;

                // Mark entry state
                if (state.name === currentControllerData.entryState) {
                    node.classList.add('entry-state');
                }

                graphView.appendChild(node);
            });

            // Update the dataset for the save button
            updateGraphData();
        }

        // This function updates the dataset used by the save button
        function updateGraphData() {
            if (graphView && currentControllerData) {
                graphView.dataset.controllerContent = JSON.stringify(currentControllerData, null, 2);
            }
        }


        saveAnimCtrlBtn.addEventListener('click', async () => {
            if (!currentControllerHandle) {
                alert("No hay ningún controlador seleccionado para guardar.");
                return;
            }
            try {
                // The data is now kept up-to-date by interactions
                const contentToSave = graphView.dataset.controllerContent;
                const writable = await currentControllerHandle.createWritable();
                await writable.write(contentToSave);
                await writable.close();
                alert(`Controlador '${currentControllerHandle.name}' guardado con éxito.`);
            } catch (error) {
                console.error("Error al guardar el controlador:", error);
                alert("No se pudo guardar el controlador.");
            }
        });

        newAnimCtrlBtn.addEventListener('click', async () => {
            const controllerName = prompt("Nombre del nuevo controlador de animación:", "NewAnimator");
            if (!controllerName) return;

            const fileName = `${controllerName}.ceanim`;
            const defaultContent = {
                name: controllerName,
                entryState: "Idle",
                states: [{
                    name: "Idle",
                    animationAsset: "",
                    speed: 1.0,
                    position: { x: 100, y: 100 }
                }],
                transitions: []
            };

            try {
                const projectName = new URLSearchParams(window.location.search).get('project');
                const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
                const assetsHandle = await projectHandle.getDirectoryHandle('Assets', { create: true });

                const fileHandle = await assetsHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(defaultContent, null, 2));
                await writable.close();

                console.log(`Creado nuevo controlador: ${fileName}`);
                // Refresh the list
                document.getElementById('menu-window-animator').click(); // A bit of a hack to refresh
                document.getElementById('menu-window-animator').click();
            } catch (error) {
                console.error("Error al crear el controlador de animación:", error);
                alert("No se pudo crear el archivo del controlador.");
            }
        });
    }

    // --- 7. Initial Setup ---
    async function initializeEditor() {
        // Cache all DOM elements
        const ids = [
            'editor-container', 'menubar', 'editor-toolbar', 'editor-main-content', 'hierarchy-panel', 'hierarchy-content',
            'scene-panel', 'scene-content', 'inspector-panel', 'assets-panel', 'assets-content', 'console-content',
            'project-name-display', 'debug-content', 'add-component-modal', 'component-list', 'context-menu',
            'hierarchy-context-menu', 'anim-node-context-menu', 'preferences-modal', 'code-editor-content',
            'codemirror-container', 'asset-folder-tree', 'asset-grid-view', 'animation-panel', 'drawing-canvas',
            'drawing-tools', 'drawing-color-picker', 'add-frame-btn', 'delete-frame-btn', 'animation-timeline',
            'animation-panel-overlay', 'animation-edit-view', 'animation-playback-view', 'animation-playback-canvas',
            'animation-play-btn', 'animation-stop-btn', 'animation-save-btn', 'current-scene-name', 'sprite-selector-modal',
            'sprite-selector-grid', 'animator-controller-panel',

            // Project Settings Modal elements
            'project-settings-modal', 'settings-app-name', 'settings-author-name', 'settings-app-version', 'settings-engine-version',
            'settings-icon-preview', 'settings-icon-picker-btn', 'settings-logo-list', 'settings-add-logo-btn',
            'settings-show-engine-logo', 'settings-keystore-path', 'settings-keystore-picker-btn', 'settings-keystore-pass',
            'settings-key-alias', 'settings-key-pass', 'settings-export-project-btn', 'settings-save-btn',

            // Confirmation Modal elements
            'engine-logo-confirm-modal', 'confirm-disable-logo-btn', 'cancel-disable-logo-btn',

            // Keystore Creation Modal elements
            'keystore-create-modal', 'keystore-create-btn', 'ks-alias', 'ks-password', 'ks-validity', 'ks-cn', 'ks-ou',
            'ks-o', 'ks-l', 'ks-st', 'ks-c', 'ks-filename', 'ks-storepass', 'ks-command-output',
            'ks-command-textarea', 'ks-generate-btn',

            // Layer Management UI
            'settings-sorting-layer-list', 'new-sorting-layer-name', 'add-sorting-layer-btn',
            'settings-collision-layer-list', 'new-collision-layer-name', 'add-collision-layer-btn',

            // Preferences Modal elements
            'prefs-theme', 'prefs-custom-theme-picker', 'prefs-color-bg', 'prefs-color-header', 'prefs-color-accent',
            'prefs-autosave-toggle', 'prefs-autosave-interval-group', 'prefs-autosave-interval', 'prefs-save-btn',
            'prefs-script-lang', 'prefs-snapping-toggle', 'prefs-snapping-grid-size-group', 'prefs-snapping-grid-size',
            'prefs-reset-layout-btn',

            // Music Player elements
            'toolbar-music-btn', 'music-player-panel', 'now-playing-bar', 'now-playing-title', 'playlist-container',
            'music-controls', 'music-add-btn', 'music-prev-btn', 'music-play-pause-btn', 'music-next-btn', 'music-volume-slider',

            // Export Modals
            'export-description-modal', 'export-description-text', 'export-description-next-btn',
            'package-file-tree-modal', 'package-modal-title', 'package-modal-description', 'package-file-tree-container',
            'package-export-controls', 'package-import-controls', 'export-filename', 'export-confirm-btn', 'import-confirm-btn',
            'resizer-left', 'resizer-right', 'resizer-bottom'
        ];
        ids.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
            dom[camelCaseId] = document.getElementById(id);
        });
        dom.inspectorContent = dom.inspectorPanel.querySelector('.panel-content');
        dom.sceneCanvas = document.getElementById('scene-canvas');
        dom.gameCanvas = document.getElementById('game-canvas');

        console.log("--- Creative Engine Editor ---");
        console.log("1. Iniciando el editor...");
        try {
            await openDB();
            console.log("2. Base de datos abierta.");
            projectsDirHandle = await getDirHandle();
            if (!projectsDirHandle) {
                console.error("No project directory handle found. Please go back to the launcher and select a directory.");
                return;
            }
            const projectName = new URLSearchParams(window.location.search).get('project');
            dom.projectNameDisplay.textContent = `Proyecto: ${projectName}`;

            // Initialize Core Systems
            console.log("3. Inicializando sistemas del motor...");
            renderer = new Renderer(dom.sceneCanvas, true); // This is the editor renderer
            gameRenderer = new Renderer(dom.gameCanvas); // This is the game renderer
            console.log("   - Renderers creados.");
            const sceneData = await SceneManager.initialize(projectsDirHandle);
            if (sceneData) {
                SceneManager.setCurrentScene(sceneData.scene);
                SceneManager.setCurrentSceneFileHandle(sceneData.fileHandle);
                dom.currentSceneName.textContent = sceneData.fileHandle.name.replace('.ceScene', '');
                SceneManager.setSceneDirty(false);
                console.log(`   - Escena '${sceneData.fileHandle.name}' cargada.`);
            } else {
                console.error("¡Fallo crítico! No se pudo cargar o crear una escena.");
                alert("¡Fallo crítico! No se pudo cargar o crear una escena. Revisa la consola para más detalles.");
                return;
            }
            physicsSystem = new PhysicsSystem(SceneManager.currentScene);
            InputManager.initialize(dom.sceneCanvas); // Pass canvas for correct mouse coords
            console.log("   - Sistema de físicas e Input Manager listos.");

            // Initial UI updates
            console.log("4. Actualizando interfaz del editor...");
            updateHierarchy();
            updateInspector();
            await updateAssetBrowser();
            updateWindowMenuUI();
            await loadProjectConfig();
            loadPreferences(); // Load user preferences
            console.log("   - UI actualizada y preferencias cargadas.");

            setupEventListeners();
            console.log("5. Event Listeners configurados.");


            // Start the main editor loop
            editorLoopId = requestAnimationFrame(editorLoop);

            // --- Intercept Play Button ---
            const oldPlayButton = document.getElementById('btn-play');
            const newPlayButton = oldPlayButton.cloneNode(true);
            oldPlayButton.parentNode.replaceChild(newPlayButton, oldPlayButton);
            dom.btnPlay = newPlayButton; // Update cached element
            dom.btnPlay.addEventListener('click', runChecksAndPlay);
            // Also update the keyboard shortcut to use the new flow
            originalStartGame = startGame; // Store the original function
            startGame = runChecksAndPlay; // Reassign startGame to our new function


            console.log("✅ Editor inicializado con éxito.");

        } catch (error) {
            console.error("Failed to initialize editor:", error);
            alert("Error fatal al inicializar el editor. Revisa la consola.");
        }
    }
    initializeEditor();
});
