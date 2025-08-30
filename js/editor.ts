// Re-syncing with GitHub to ensure latest changes are deployed.
// --- External Library Declarations ---
declare var JSZip: any;
declare var showdown: any;

// --- CodeMirror Integration ---
import { InputManager } from './engine/Input.ts';
import * as SceneManager from './engine/SceneManager.ts';
import { Renderer } from './engine/Renderer.ts';
import { PhysicsSystem } from './engine/Physics.ts';
import {EditorView, basicSetup} from "https://esm.sh/codemirror@6.0.1";
import {javascript} from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import * as Components from './engine/Components.ts';
import { Materia } from './engine/Materia.ts';
import {oneDark} from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import {undo, redo} from "https://esm.sh/@codemirror/commands@6.3.3";
import {autocompletion, CompletionContext} from "https://esm.sh/@codemirror/autocomplete@6.16.0";
import { getURLForAssetPath } from './engine/AssetUtils.ts';
import { initializeAnimationEditor, openAnimationAsset as openAnimationAssetFromModule } from './ui/animation-editor.ts';
import { initializeInspector, updateInspector, updateInspectorForAsset } from './ui/inspector.ts';
import { initializeHierarchy, updateHierarchy } from './ui/hierarchy.ts';

// --- Type Definitions ---
interface DomElements {
    [key: string]: HTMLElement | null;
    editorContainer: HTMLElement;
    menubar: HTMLElement;
    editorToolbar: HTMLElement;
    editorMainContent: HTMLElement;
    hierarchyPanel: HTMLElement;
    hierarchyContent: HTMLElement;
    scenePanel: HTMLElement;
    sceneContent: HTMLElement;
    inspectorPanel: HTMLElement;
    inspectorContent: HTMLElement;
    assetsPanel: HTMLElement;
    assetsContent: HTMLElement;
    consoleContent: HTMLElement;
    projectNameDisplay: HTMLElement;
    debugContent: HTMLElement;
    contextMenu: HTMLElement;
    hierarchyContextMenu: HTMLElement;
    animNodeContextMenu: HTMLElement;
    preferencesModal: HTMLElement;
    codeEditorContent: HTMLElement;
    addComponentModal: HTMLElement;
    componentList: HTMLElement;
    spriteSelectorModal: HTMLElement;
    spriteSelectorGrid: HTMLElement;
    codemirrorContainer: HTMLElement;
    assetFolderTree: HTMLElement;
    assetGridView: HTMLElement;
    animationPanel: HTMLElement;
    drawingCanvas: HTMLCanvasElement;
    drawingTools: HTMLElement;
    drawingColorPicker: HTMLInputElement;
    addFrameBtn: HTMLElement;
    deleteFrameBtn: HTMLElement;
    animationTimeline: HTMLElement;
    animationPanelOverlay: HTMLElement;
    animationEditView: HTMLElement;
    animationPlaybackView: HTMLElement;
    animationPlaybackCanvas: HTMLCanvasElement;
    animationPlayBtn: HTMLElement;
    animationStopBtn: HTMLElement;
    animationSaveBtn: HTMLElement;
    currentSceneName: HTMLElement;
    animatorControllerPanel: HTMLElement;
    drawingCanvasContainer: HTMLElement;
    animOnionSkinCanvas: HTMLCanvasElement;
    animGridCanvas: HTMLCanvasElement;
    animBgToggleBtn: HTMLElement;
    animGridToggleBtn: HTMLElement;
    animOnionToggleBtn: HTMLElement;
    timelineToggleBtn: HTMLElement;
    projectSettingsModal: HTMLElement;
    settingsAppName: HTMLInputElement;
    settingsAuthorName: HTMLInputElement;
    settingsAppVersion: HTMLInputElement;
    settingsEngineVersion: HTMLElement;
    settingsIconPreview: HTMLImageElement;
    settingsIconPickerBtn: HTMLElement;
    settingsLogoList: HTMLElement;
    settingsAddLogoBtn: HTMLElement;
    settingsShowEngineLogo: HTMLInputElement;
    settingsKeystorePath: HTMLInputElement;
    settingsKeystorePickerBtn: HTMLElement;
    settingsKeystorePass: HTMLInputElement;
    settingsKeyAlias: HTMLInputElement;
    settingsKeyPass: HTMLInputElement;
    settingsExportProjectBtn: HTMLElement;
    settingsSaveBtn: HTMLElement;
    engineLogoConfirmModal: HTMLElement;
    confirmDisableLogoBtn: HTMLElement;
    cancelDisableLogoBtn: HTMLElement;
    keystoreCreateModal: HTMLElement;
    keystoreCreateBtn: HTMLElement;
    ksAlias: HTMLInputElement;
    ksPassword: HTMLInputElement;
    ksValidity: HTMLInputElement;
    ksCn: HTMLInputElement;
    ksOu: HTMLInputElement;
    ksO: HTMLInputElement;
    ksL: HTMLInputElement;
    ksSt: HTMLInputElement;
    ksC: HTMLInputElement;
    ksFilename: HTMLInputElement;
    ksStorepass: HTMLInputElement;
    ksCommandOutput: HTMLElement;
    ksCommandTextarea: HTMLTextAreaElement;
    ksGenerateBtn: HTMLElement;
    settingsSortingLayerList: HTMLElement;
    newSortingLayerName: HTMLInputElement;
    addSortingLayerBtn: HTMLElement;
    settingsCollisionLayerList: HTMLElement;
    newCollisionLayerName: HTMLInputElement;
    addCollisionLayerBtn: HTMLElement;
    prefsTheme: HTMLSelectElement;
    prefsCustomThemePicker: HTMLElement;
    prefsColorBg: HTMLInputElement;
    prefsColorHeader: HTMLInputElement;
    prefsColorAccent: HTMLInputElement;
    prefsAutosaveToggle: HTMLInputElement;
    prefsAutosaveIntervalGroup: HTMLElement;
    prefsAutosaveInterval: HTMLInputElement;
    prefsSaveBtn: HTMLElement;
    prefsScriptLang: HTMLSelectElement;
    prefsSnappingToggle: HTMLInputElement;
    prefsSnappingGridSizeGroup: HTMLElement;
    prefsSnappingGridSize: HTMLInputElement;
    prefsResetLayoutBtn: HTMLElement;
    toolbarMusicBtn: HTMLElement;
    musicPlayerPanel: HTMLElement;
    nowPlayingBar: HTMLElement;
    nowPlayingTitle: HTMLElement;
    playlistContainer: HTMLElement;
    musicControls: HTMLElement;
    musicAddBtn: HTMLElement;
    musicPrevBtn: HTMLElement;
    musicPlayPauseBtn: HTMLElement;
    musicNextBtn: HTMLElement;
    musicVolumeSlider: HTMLInputElement;
    exportDescriptionModal: HTMLElement;
    exportDescriptionText: HTMLTextAreaElement;
    exportDescriptionNextBtn: HTMLElement;
    packageFileTreeModal: HTMLElement;
    packageModalTitle: HTMLElement;
    packageModalDescription: HTMLElement;
    packageFileTreeContainer: HTMLElement;
    packageExportControls: HTMLElement;
    packageImportControls: HTMLElement;
    exportFilename: HTMLInputElement;
    exportConfirmBtn: HTMLElement;
    importConfirmBtn: HTMLElement;
    resizerLeft: HTMLElement;
    resizerRight: HTMLElement;
    resizerBottom: HTMLElement;
    sceneCanvas: HTMLCanvasElement;
    gameCanvas: HTMLCanvasElement;
    btnPlay: HTMLElement;
}

interface KeystoreConfig {
    path: string;
    pass: string;
    alias: string;
    aliasPass: string;
}

interface LayersConfig {
    sortingLayers: string[];
    collisionLayers: string[];
}

interface ProjectConfig {
    appName?: string;
    authorName?: string;
    appVersion?: string;
    engineVersion?: string;
    iconPath?: string;
    splashLogos?: { path: string; duration: string }[];
    showEngineLogo?: boolean;
    keystore?: KeystoreConfig;
    layers?: LayersConfig;
}

interface CustomColors {
    bg: string;
    header: string;
    accent: string;
}

interface Preferences {
    theme: string;
    customColors: CustomColors;
    autosave: boolean;
    autosaveInterval: number;
    scriptLang: string;
    snapping: boolean;
    gridSize: number;
}

interface ExportContext {
    type: 'project' | 'asset' | null;
    description: string;
    rootHandle: FileSystemDirectoryHandle | null;
    fileName: string;
    assetName?: string;
}

interface MusicTrack {
    name: string;
    handle: FileSystemFileHandle;
}

interface AnimatorState {
    name: string;
    animationAsset: string;
    speed: number;
    position: { x: number; y: number };
}

interface AnimatorControllerData {
    name: string;
    entryState: string;
    states: AnimatorState[];
    transitions: any[]; // Define transitions later if needed
}


function drawAnimEditorGrid() {
  // This function was deleted and is now a placeholder.
  console.warn("drawAnimEditorGrid is not implemented");
}

function drawOnionSkin() {
  // This function was deleted and is now a placeholder.
  console.warn("drawOnionSkin is not implemented");
}

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

function cesCompletions(context: CompletionContext) {
  let word = context.matchBefore(/\w*/);
  if (word && word.from == word.to && !context.explicit) {
    return null;
  }
  return {
    from: word!.from,
    options: cesKeywords
  };
}

// --- Editor Logic ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Editor State ---
    let projectsDirHandle: FileSystemDirectoryHandle | null = null,
        codeEditor: EditorView | null = null,
        currentlyOpenFileHandle: FileSystemFileHandle | null = null;
    let selectedMateria: Materia | null = null;
    let renderer: Renderer | null = null, gameRenderer: Renderer | null = null;
    let activeView: 'scene-content' | 'game-content' | 'code-editor-content' = 'scene-content';
    let currentDirectoryHandle: { handle: FileSystemDirectoryHandle | null, path: string } = { handle: null, path: '' };
    const panelVisibility: { [key: string]: boolean } = {
        hierarchy: true,
        inspector: true,
        assets: true,
        animator: false, // For the new controller panel
    };
    let physicsSystem: PhysicsSystem | null = null;
    let isDragging: boolean = false, dragOffsetX: number = 0, dragOffsetY: number = 0;
    let activeTool: 'move' | 'pan' | 'scale' = 'move';
    let isPanning: boolean = false;
    let lastMousePosition: { x: number, y: number } = { x: 0, y: 0 };
    let dragState: any = {}; // To hold info about the current drag operation


    let isGameRunning: boolean = false;
    let lastFrameTime: number = 0;
    let editorLoopId: number | null = null;
    let deltaTime: number = 0;
    let isScanningForComponents: boolean = false;

    // Animator Controller State
    let currentControllerHandle: FileSystemFileHandle | null = null;
    let currentControllerData: AnimatorControllerData | null = null;
    let graphView: HTMLElement | null = null; // Will be the graph DOM element
    let isDraggingNode: boolean = false;
    let dragNodeInfo: any = {};

    // Project Settings State
    let currentProjectConfig: ProjectConfig = {};
    // Editor Preferences State
    let currentPreferences: Partial<Preferences> = {};
    let autoSaveIntervalId: number | null = null;

    // Music Player State
    let playlist: MusicTrack[] = [];
    let currentTrackIndex: number = -1;
    let audioElement: HTMLAudioElement = new Audio();

    // Export/Import State
    let exportContext: ExportContext = {
        type: null,
        description: '',
        rootHandle: null,
        fileName: ''
    };
    let exportFileHandleMap: Map<string, FileSystemHandle> = new Map();


    // --- 2. DOM Elements ---
    const dom = {} as DomElements;

    // --- 3. IndexedDB Logic ---
    const dbName = 'CreativeEngineDB';
    let db: IDBDatabase;
    function openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onerror = () => reject('Error opening DB');
            request.onsuccess = (e) => {
                db = (e.target as IDBOpenDBRequest).result;
                resolve(db);
            };
            request.onupgradeneeded = (e) => {
                (e.target as IDBOpenDBRequest).result.createObjectStore('settings', { keyPath: 'id' });
            };
        });
    }
    function getDirHandle(): Promise<FileSystemDirectoryHandle | null> {
        if (!db) return Promise.resolve(null);
        return new Promise((resolve) => {
            const request = db.transaction(['settings'], 'readonly').objectStore('settings').get('projectsDirHandle');
            request.onsuccess = () => resolve(request.result ? request.result.handle : null);
            request.onerror = () => resolve(null);
        });
    }

    // --- 5. Core Editor Functions (definitions will be assigned in setupEventListeners or initializeEditor) ---
    var createScriptFile: (handle: FileSystemDirectoryHandle) => Promise<void>,
        openScriptInEditor: (fileName: string) => Promise<void>,
        saveCurrentScript: () => Promise<void>,
        updateScene: (targetRenderer: Renderer, isGameView?: boolean) => void,
        selectMateria: (materiaId: string | null) => void,
        showAddComponentModal: () => Promise<void>,
        startGame: () => void,
        runGameLoop: () => void,
        stopGame: () => void,
        updateDebugPanel: () => void,
        openAnimationAsset: any,
        addFrameFromCanvas: any,
        loadScene: any,
        saveScene: () => Promise<void>,
        serializeScene: any,
        deserializeScene: any,
        exportPackage: (filesToExport: any, manifest: any) => Promise<void>,
        openSpriteSelector: (componentName: string) => Promise<void>,
        saveAssetMeta: (assetName: string, metaData: any) => Promise<void>,
        runChecksAndPlay: () => Promise<void>,
        originalStartGame: () => void,
        loadProjectConfig: () => Promise<void>,
        saveProjectConfig: (showAlert?: boolean) => Promise<void>,
        runLayoutUpdate: () => void,
        updateWindowMenuUI: () => void,
        handleKeyboardShortcuts: (e: KeyboardEvent) => void;

    handleKeyboardShortcuts = function(e: KeyboardEvent): void {
        if (document.querySelector('.modal.is-open') || (e.target instanceof HTMLElement && e.target.matches('input, textarea, select'))) {
            return;
        }

        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (activeView === 'code-editor-content' && currentlyOpenFileHandle) {
                saveCurrentScript();
                console.log("Script guardado (Ctrl+S).");
            } else if (activeView === 'animation-panel') {
                // This logic is now in the animation-editor module
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
                case 'delete':
                case 'backspace':
                    if (selectedMateria) {
                        const idToDelete = selectedMateria.id;
                        selectMateria(null); // Deselect first
                        SceneManager.currentScene!.removeMateria(idToDelete);
                        updateHierarchy(selectedMateria);
                        updateInspector(selectedMateria);
                    }
                    break;
            }
        }

        if (activeView === 'code-editor-content' && codeEditor) {
            if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo(codeEditor);
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo(codeEditor);
            }
        }
    }

    updateWindowMenuUI = function(): void {
        const menuItems: { [key: string]: string } = {
            'hierarchy-panel': 'menu-window-hierarchy',
            'inspector-panel': 'menu-window-inspector',
            'assets-panel': 'menu-window-assets',
            'animation-panel': 'menu-window-animation',
            'animator-controller-panel': 'menu-window-animator'
        };
        const checkmark = '✅ ';

        for (const [panelId, menuId] of Object.entries(menuItems)) {
            const panel = document.getElementById(panelId);
            const menuItem = document.getElementById(menuId);

            if (panel && menuItem) {
                menuItem.textContent = menuItem.textContent!.replace(checkmark, '');
                if (!panel.classList.contains('hidden')) {
                    menuItem.textContent = checkmark + menuItem.textContent;
                }
            }
        }
    }

    loadProjectConfig = async function(): Promise<void> {
        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            if (!projectName) throw new Error("Project name not found in URL.");
            const projectHandle = await projectsDirHandle!.getDirectoryHandle(projectName);
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
            await saveProjectConfig(false);
        }

        if (!currentProjectConfig.layers) {
            currentProjectConfig.layers = {
                sortingLayers: ['Default', 'UI'],
                collisionLayers: ['Default', 'Player', 'Enemy', 'Ground']
            };
        }

        if (dom.settingsAppName) dom.settingsAppName.value = currentProjectConfig.appName || '';
        if (dom.settingsAuthorName) dom.settingsAuthorName.value = currentProjectConfig.authorName || '';
        if (dom.settingsAppVersion) dom.settingsAppVersion.value = currentProjectConfig.appVersion || '';
        if (dom.settingsShowEngineLogo) dom.settingsShowEngineLogo.checked = !!currentProjectConfig.showEngineLogo;
        if (dom.settingsKeystorePath && currentProjectConfig.keystore) dom.settingsKeystorePath.value = currentProjectConfig.keystore.path;

        if (dom.settingsIconPreview && currentProjectConfig.iconPath) {
            dom.settingsIconPreview.style.display = 'block';
            dom.settingsIconPreview.src = 'image/Paquete.png'; // Placeholder image
        }

        dom.settingsLogoList.innerHTML = '';
        if (currentProjectConfig.splashLogos) {
            currentProjectConfig.splashLogos.forEach((logoData: { path: string, duration: string }) => {
                addLogoToList(logoData.path, logoData.duration);
            });
        }

        populateLayerLists();
    };

    function populateLayerLists(): void {
        if (!currentProjectConfig.layers) return;

        const createLayerItem = (name: string, index: number, type: 'sorting' | 'collision') => {
            const item = document.createElement('div');
            item.className = 'layer-item';
            item.textContent = `${index}: ${name}`;

            if (index > 0) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-layer-btn';
                removeBtn.textContent = '×';
                removeBtn.title = 'Quitar layer';
                removeBtn.addEventListener('click', () => {
                    if (confirm(`¿Estás seguro de que quieres quitar el layer '${name}'?`)) {
                        if (type === 'sorting') {
                            currentProjectConfig.layers!.sortingLayers.splice(index, 1);
                        } else {
                            currentProjectConfig.layers!.collisionLayers.splice(index, 1);
                        }
                        populateLayerLists();
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

    function applyPreferences(): void {
        const prefs = currentPreferences as Preferences;
        if (!prefs) return;

        const theme = prefs.theme;
        if (theme === 'custom' && prefs.customColors) {
            document.documentElement.setAttribute('data-theme', 'custom');
            document.documentElement.style.setProperty('--bg-secondary', prefs.customColors.bg);
            document.documentElement.style.setProperty('--bg-tertiary', prefs.customColors.header);
            document.documentElement.style.setProperty('--accent-color', prefs.customColors.accent);
        } else {
            document.documentElement.removeAttribute('style'); // Clear custom colors
            document.documentElement.setAttribute('data-theme', theme || 'dark-modern');
        }

        if (prefs.autosave) {
            if (autoSaveIntervalId) clearInterval(autoSaveIntervalId); // Clear previous interval
            autoSaveIntervalId = window.setInterval(saveCurrentScript, prefs.autosaveInterval * 1000);
        } else {
            if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
        }
    }

    function savePreferences(): void {
        const prefs: Partial<Preferences> = {
            theme: dom.prefsTheme.value,
            autosave: dom.prefsAutosaveToggle.checked,
            autosaveInterval: Number(dom.prefsAutosaveInterval.value),
            scriptLang: dom.prefsScriptLang.value,
            snapping: dom.prefsSnappingToggle.checked,
            gridSize: Number(dom.prefsSnappingGridSize.value)
        };

        if (prefs.theme === 'custom') {
            prefs.customColors = {
                bg: dom.prefsColorBg.value,
                header: dom.prefsColorHeader.value,
                accent: dom.prefsColorAccent.value
            };
        }

        currentPreferences = prefs;
        localStorage.setItem('creativeEnginePrefs', JSON.stringify(currentPreferences));
        applyPreferences();
        alert("Preferencias guardadas.");
        dom.preferencesModal.classList.remove('is-open');
    }

    function loadPreferences(): void {
        const savedPrefs = localStorage.getItem('creativeEnginePrefs');

        const defaultPrefs: Preferences = {
            theme: 'dark-modern',
            customColors: { bg: '#2d2d30', header: '#3f3f46', accent: '#0e639c' },
            autosave: false,
            autosaveInterval: 30,
            scriptLang: 'ces',
            snapping: false,
            gridSize: 25
        };

        let loadedPrefs: Partial<Preferences> = {};
        if (savedPrefs) {
            try {
                loadedPrefs = JSON.parse(savedPrefs) || {};
            } catch (e) {
                console.warn("Could not parse preferences from localStorage. Using defaults.", e);
                loadedPrefs = {};
            }
        }

        currentPreferences = { ...defaultPrefs, ...loadedPrefs };
        currentPreferences.customColors = { ...defaultPrefs.customColors, ...(loadedPrefs.customColors || {}) };

        const prefs = currentPreferences as Preferences;
        if (dom.prefsTheme) dom.prefsTheme.value = prefs.theme;
        if (dom.prefsColorBg && prefs.customColors) dom.prefsColorBg.value = prefs.customColors.bg;
        if (dom.prefsColorHeader && prefs.customColors) dom.prefsColorHeader.value = prefs.customColors.header;
        if (dom.prefsColorAccent && prefs.customColors) dom.prefsColorAccent.value = prefs.customColors.accent;
        if (dom.prefsAutosaveToggle) dom.prefsAutosaveToggle.checked = prefs.autosave;
        if (dom.prefsAutosaveInterval) dom.prefsAutosaveInterval.value = String(prefs.autosaveInterval);
        if (dom.prefsScriptLang) dom.prefsScriptLang.value = prefs.scriptLang;
        if (dom.prefsSnappingToggle) dom.prefsSnappingToggle.checked = prefs.snapping;
        if (dom.prefsSnappingGridSize) dom.prefsSnappingGridSize.value = String(prefs.gridSize);

        if (dom.prefsTheme) {
            dom.prefsCustomThemePicker.classList.toggle('hidden', dom.prefsTheme.value !== 'custom');
        }
        if (dom.prefsAutosaveToggle) {
             dom.prefsAutosaveIntervalGroup.classList.toggle('hidden', !dom.prefsAutosaveToggle.checked);
        }

        applyPreferences();
    }

    saveProjectConfig = async function(showAlert = true): Promise<void> {
        if (!projectsDirHandle) {
            if(showAlert) alert("El directorio del proyecto no está disponible.");
            return;
        }

        if (dom.projectSettingsModal.classList.contains('is-open')) {
            currentProjectConfig.appName = dom.settingsAppName.value;
            currentProjectConfig.authorName = dom.settingsAuthorName.value;
            currentProjectConfig.appVersion = dom.settingsAppVersion.value;
            currentProjectConfig.showEngineLogo = dom.settingsShowEngineLogo.checked;
            if (currentProjectConfig.keystore) {
                currentProjectConfig.keystore.pass = dom.settingsKeystorePass.value;
                currentProjectConfig.keystore.alias = dom.settingsKeyAlias.value;
                currentProjectConfig.keystore.aliasPass = dom.settingsKeyPass.value;
            }

            currentProjectConfig.splashLogos = [];
            const logoItems = dom.settingsLogoList.querySelectorAll('.logo-list-item');
            logoItems.forEach(item => {
                const htmlItem = item as HTMLElement;
                currentProjectConfig.splashLogos!.push({
                    path: htmlItem.dataset.path!,
                    duration: (htmlItem.querySelector('input[type=range]') as HTMLInputElement).value
                });
            });
        }

        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            if (!projectName) throw new Error("Project name not found in URL.");
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

    runChecksAndPlay = async function(): Promise<void> {
        if (!projectsDirHandle) {
            alert("El proyecto aún se está cargando, por favor, inténtalo de nuevo en un momento.");
            return;
        }
        console.log("Verificando todos los scripts del proyecto...");
        dom.consoleContent.innerHTML = ''; // Limpiar consola de la UI
        const allErrors: {fileName: string, errors: string[]}[] = [];
        let mainGameJsCode: string | null = null;

        const cesFiles: FileSystemFileHandle[] = [];
        async function findCesFiles(dirHandle: FileSystemDirectoryHandle, currentPath: string = ''): Promise<void> {
            console.log(`Buscando en: ${currentPath || 'Assets'}`);
            for await (const entry of dirHandle.values()) {
                console.log(`  - Encontrado: ${entry.name} (Tipo: ${entry.kind})`);
                if (entry.kind === 'file' && entry.name.endsWith('.ces')) {
                    console.log(`    -> ¡Script .ces encontrado! Añadiendo a la lista.`);
                    cesFiles.push(entry as FileSystemFileHandle);
                } else if (entry.kind === 'directory') {
                    await findCesFiles(entry as FileSystemDirectoryHandle, `${currentPath}/${entry.name}`);
                }
            }
        }

        const projectName = new URLSearchParams(window.location.search).get('project');
        if (!projectName) return;
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
        await findCesFiles(assetsHandle);

        if (cesFiles.length === 0) {
            console.log("No se encontraron scripts .ces. Iniciando el juego directamente.");
            originalStartGame();
            return;
        }

        for (const fileHandle of cesFiles) {
            const file = await fileHandle.getFile();
            const code = await file.text();
            const result = transpile(code);

            if (result.errors && result.errors.length > 0) {
                allErrors.push({fileName: fileHandle.name, errors: result.errors});
            } else if (fileHandle.name === 'main.ces') {
                mainGameJsCode = result.jsCode!;
            }
        }

        if (allErrors.length > 0) {
            console.error(`Build fallido. Se encontraron errores en ${allErrors.length} archivo(s):`);
            for (const fileErrors of allErrors) {
                console.error(`\n--- Errores en ${fileErrors.fileName} ---`);
                for (const error of fileErrors.errors) {
                    console.error(`  - ${error}`);
                }
            }
            (dom.assetsPanel.querySelector('[data-tab="console-content"]') as HTMLElement).click();
        } else {
            console.log("✅ Build exitoso. Todos los scripts se compilaron sin errores.");
            if (mainGameJsCode) {
                try {
                    const blob = new Blob([mainGameJsCode], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    await import(url);
                    URL.revokeObjectURL(url);
                    console.log("Script principal cargado. Iniciando juego...");
                    originalStartGame();
                } catch (e) {
                    console.error("Error al ejecutar el script del juego:", e);
                }
            } else {
                console.warn("Build exitoso, pero no se encontró 'main.ces'. El juego podría no tener lógica de scripting.");
                originalStartGame();
            }
        }
    };

    function transpile(code: string): { errors?: string[]; jsCode?: string } {
        const usingMap: { [key: string]: string } = {
            'creative.engine': "import * as Engine from './modules/engine.js';",
            'creative.engine.core': "import * as Core from './modules/core.js';",
            'creative.engine.ui': "import * as UI from './modules/ui.js';",
            'creative.engine.animator': "import * as Animator from './modules/animator.js';",
            'creative.engine.physics': "import * as Physics from './modules/physics.js';",
        };
        const lines = code.split(/\r?\n/);
        const errors: string[] = [];
        let jsCode = '';
        const imports: Set<string> = new Set();
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

    saveCurrentScript = async function(): Promise<void> {
        if (!currentlyOpenFileHandle || !codeEditor) {
            console.warn("No hay ningún script abierto para guardar.");
            return;
        }
        try {
            const writable = await currentlyOpenFileHandle.createWritable();
            await writable.write(codeEditor.state.doc.toString());
            await writable.close();
            console.log(`Script '${currentlyOpenFileHandle.name}' guardado.`);
        } catch (error) {
            console.error("Error al guardar el script:", error);
            alert("No se pudo guardar el script.");
        }
    };

    saveScene = async function(): Promise<void> {
        if (!SceneManager.currentScene) {
            alert("No hay ninguna escena cargada para guardar.");
            return;
        }
        try {
            const sceneFileHandle = SceneManager.getCurrentSceneFileHandle();
            if (!sceneFileHandle) {
                console.error("No hay un handle de archivo para la escena actual. Implementar 'Guardar como...'");
                alert("Error: No se ha establecido un archivo de escena. Usa 'Guardar como...'");
                return;
            }
            const sceneData = SceneManager.serializeScene(SceneManager.currentScene);
            const writable = await sceneFileHandle.createWritable();
            await writable.write(JSON.stringify(sceneData, null, 2));
            await writable.close();
            SceneManager.setSceneDirty(false);
            console.log(`Escena '${sceneFileHandle.name}' guardada.`);
        } catch (error) {
            console.error("Error al guardar la escena:", error);
            alert("No se pudo guardar la escena.");
        }
    };

    saveAssetMeta = async function(assetName: string, metaData: any): Promise<void> {
        if (!currentDirectoryHandle.handle) return;
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

    openSpriteSelector = async function(componentName: string): Promise<void> {
        if (!projectsDirHandle) return;
        const grid = dom.spriteSelectorGrid;
        grid.innerHTML = '';
        dom.spriteSelectorModal.classList.add('is-open');

        const imageFiles: string[] = [];
        async function findImages(dirHandle: FileSystemDirectoryHandle, path: string = ''): Promise<void> {
            for await (const entry of dirHandle.values()) {
                const entryPath = path ? `${path}/${entry.name}` : entry.name;
                if (entry.kind === 'file' && (entry.name.endsWith('.png') || entry.name.endsWith('.jpg'))) {
                    imageFiles.push(entryPath);
                } else if (entry.kind === 'directory') {
                    await findImages(entry as FileSystemDirectoryHandle, entryPath);
                }
            }
        }

        const projectName = new URLSearchParams(window.location.search).get('project');
        if (!projectName) return;
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        await findImages(projectHandle, '');

        imageFiles.forEach(imgPath => {
            const img = document.createElement('img');
            getURLForAssetPath(imgPath, projectsDirHandle!).then(url => { if(url) img.src = url; });
            img.addEventListener('click', async () => {
                if (selectedMateria) {
                    const ComponentClass = (Components as any)[componentName];
                    if (!ComponentClass) return;

                    const component = selectedMateria.getComponent(ComponentClass);
                    if (component) {
                        component.setSourcePath(imgPath);
                        await component.loadSprite(projectsDirHandle!);
                        updateInspector(selectedMateria);
                        updateScene(renderer!, false);
                    }
                }
                dom.spriteSelectorModal.classList.remove('is-open');
            });
            grid.appendChild(img);
        });
    };

    function downloadBlob(blob: Blob, name: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function addFolderToZip(zip: any, dirHandle: FileSystemDirectoryHandle, path: string = ''): Promise<void> {
        for await (const entry of dirHandle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file') {
                const file = await (entry as FileSystemFileHandle).getFile();
                zip.file(entryPath, file);
            } else if (entry.kind === 'directory') {
                const folderZip = zip.folder(entryPath);
                await addFolderToZip(folderZip, entry as FileSystemDirectoryHandle, '');
            }
        }
    }

    async function importPackage(fileHandle: FileSystemFileHandle): Promise<void> {
        if (!currentDirectoryHandle.handle) return;
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
                    const fileName = pathParts.pop()!;
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

    async function populateFileTree(container: HTMLElement, dirHandle: FileSystemDirectoryHandle, pathPrefix: string = ''): Promise<void> {
        exportFileHandleMap.clear();

        async function buildTree(currentDir: FileSystemDirectoryHandle, prefix: string): Promise<void> {
            for await (const entry of currentDir.values()) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'file-tree-item';
                itemDiv.style.paddingLeft = `${prefix.split('/').filter(p=>p).length * 20}px`;
                const currentPath = `${prefix}${entry.name}`;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = true;
                checkbox.dataset.path = currentPath;
                exportFileHandleMap.set(currentPath, entry);

                const label = document.createElement('label');
                label.textContent = ` ${entry.kind === 'directory' ? '📁' : '📄'} ${entry.name}`;

                itemDiv.appendChild(checkbox);
                itemDiv.appendChild(label);
                container.appendChild(itemDiv);

                if (entry.kind === 'directory') {
                    await buildTree(entry as FileSystemDirectoryHandle, `${currentPath}/`);
                }
            }
        }

        await buildTree(dirHandle, pathPrefix);
    }

    exportPackage = async function(filesToExport: {path: string, handle: FileSystemHandle}[], manifest: any): Promise<void> {
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
                    const file = await (fileInfo.handle as FileSystemFileHandle).getFile();
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

    openScriptInEditor = async function(fileName: string): Promise<void> {
        if (!currentDirectoryHandle.handle) return;
        try {
            currentlyOpenFileHandle = await currentDirectoryHandle.handle.getFileHandle(fileName);
            const file = await currentlyOpenFileHandle.getFile();
            const content = await file.text();

            if (!codeEditor) {
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
                codeEditor.dispatch({
                    changes: {from: 0, to: codeEditor.state.doc.length, insert: content}
                });
            }

            (dom.scenePanel.querySelector('.view-toggle-btn[data-view="code-editor-content"]') as HTMLElement).click();
            console.log(`Abierto ${fileName} en el editor.`);

        } catch (error) {
            console.error(`Error al abrir el script '${fileName}':`, error);
            alert(`No se pudo abrir el script. Revisa la consola.`);
        }
    };

    const markdownConverter = new showdown.Converter();

    updateScene = function(targetRenderer: Renderer, isGameView: boolean = false): void {
        if (!targetRenderer || !SceneManager.currentScene) return;

        targetRenderer.clear();

        targetRenderer.beginWorld();

        if (!isGameView && targetRenderer.camera) {
            const gridSize = 50;
            const { width, height } = targetRenderer.canvas;
            const { x: camX, y: camY, effectiveZoom: zoom } = targetRenderer.camera;
            const halfWidth = width / zoom;
            const halfHeight = height / zoom;
            const startX = Math.floor((camX - halfWidth) / gridSize) * gridSize;
            const endX = Math.ceil((camX + halfWidth) / gridSize) * gridSize;
            const startY = Math.floor((camY - halfHeight) / gridSize) * gridSize;
            const endY = Math.ceil((camY + halfHeight) / gridSize) * gridSize;

            targetRenderer.ctx.strokeStyle = '#3a3a3a';
            targetRenderer.ctx.lineWidth = 1 / zoom;
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

        const layerOrder = currentProjectConfig.layers?.sortingLayers || ['Default'];
        const sortedMaterias = [...SceneManager.currentScene.materias].sort((a, b) => {
            const indexA = layerOrder.indexOf(a.layer);
            const indexB = layerOrder.indexOf(b.layer);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        const worldMaterias = sortedMaterias.filter(m => !m.getComponent(Components.RectTransform));
        worldMaterias.forEach(materia => {
            if (isGameView && !materia.isActive) {
                return;
            }

            const transform = materia.getComponent(Components.Transform);
            if (!transform) return;

            const isInactiveInEditor = !isGameView && !materia.isActive;
            if (isInactiveInEditor) {
                targetRenderer.ctx.globalAlpha = 0.5;
            }

            let drawn = false;
            const spriteRenderer = materia.getComponent(Components.SpriteRenderer);
            if (spriteRenderer && spriteRenderer.sprite.complete && spriteRenderer.sprite.naturalHeight !== 0) {
                targetRenderer.drawImage(spriteRenderer.sprite, transform.x, transform.y, 100 * transform.scale.x, 100 * transform.scale.y);
                drawn = true;
            }

            const boxCollider = materia.getComponent(Components.BoxCollider);
            if (boxCollider) {
                if (!drawn) {
                    targetRenderer.drawRect(transform.x, transform.y, boxCollider.width * transform.scale.x, boxCollider.height * transform.scale.y, 'rgba(144, 238, 144, 0.5)');
                }
            }

            if (!drawn && !boxCollider) {
                 targetRenderer.drawRect(transform.x, transform.y, 20 * transform.scale.x, 20 * transform.scale.y, 'rgba(128, 128, 128, 0.5)');
            }

            if (!isGameView && targetRenderer.camera) {
                if (selectedMateria && selectedMateria.id === materia.id) {
                    targetRenderer.ctx.strokeStyle = 'yellow';
                    targetRenderer.ctx.lineWidth = 2 / targetRenderer.camera.effectiveZoom;
                    const selectionWidth = (boxCollider ? boxCollider.width : 100) * transform.scale.x;
                    const selectionHeight = (boxCollider ? boxCollider.height : 100) * transform.scale.y;
                    targetRenderer.ctx.strokeRect(transform.x - selectionWidth / 2, transform.y - selectionHeight / 2, selectionWidth, selectionHeight);
                }
            }

            if (isInactiveInEditor) {
                targetRenderer.ctx.globalAlpha = 1.0;
            }
        });
        targetRenderer.end();

        targetRenderer.beginUI();
        const uiMaterias = sortedMaterias.filter(m => m.getComponent(Components.RectTransform));

        uiMaterias.forEach(materia => {
            if (isGameView && !materia.isActive) return;

            const rectTransform = materia.getComponent(Components.RectTransform);
            if (!rectTransform) return;

            const uiImage = materia.getComponent(Components.UIImage);
            if (uiImage && uiImage.sprite && uiImage.sprite.complete && typeof rectTransform.getWorldRect === 'function') {
                const worldRect = rectTransform.getWorldRect(targetRenderer.canvas);
                targetRenderer.drawImage(uiImage.sprite, worldRect.x, worldRect.y, worldRect.width, worldRect.height);
            }

            if (!isGameView) {
                const worldRect = rectTransform.getWorldRect(targetRenderer.canvas);
                targetRenderer.ctx.strokeStyle = 'rgba(0, 150, 255, 0.7)';
                targetRenderer.ctx.lineWidth = 1;
                targetRenderer.ctx.strokeRect(worldRect.x, worldRect.y, worldRect.width, worldRect.height);
            }

            if (!isGameView && selectedMateria && selectedMateria.id === materia.id && typeof rectTransform.getWorldRect === 'function') {
                const worldRect = rectTransform.getWorldRect(targetRenderer.canvas);
                targetRenderer.ctx.strokeStyle = 'yellow';
                targetRenderer.ctx.lineWidth = 2;
                targetRenderer.ctx.strokeRect(worldRect.x, worldRect.y, worldRect.width, worldRect.height);
            }
        });
        targetRenderer.end();
    };

    selectMateria = function(materiaId: string | null): void {
        const currentActiveAsset = dom.assetsContent.querySelector('.asset-item.active');
        if (currentActiveAsset) {
            currentActiveAsset.classList.remove('active');
        }

        if (materiaId === null) {
            selectedMateria = null;
        } else {
            selectedMateria = SceneManager.currentScene?.findMateriaById(materiaId) || null;
        }
        updateHierarchy(selectedMateria);
        updateInspector(selectedMateria);
        if (renderer) {
            updateScene(renderer, false);
        }
    };

    const availableComponents: { [key: string]: (typeof Components.Leyes)[] } = {
        'Renderizado': [Components.SpriteRenderer],
        'Animación': [Components.Animator],
        'Cámara': [Components.Camera],
        'Físicas': [Components.Rigidbody, Components.BoxCollider],
        'UI': [Components.UIImage, Components.UICanvas],
        'Scripting': [Components.CreativeScript]
    };

    showAddComponentModal = async function(): Promise<void> {
        if (!selectedMateria) return;

        dom.componentList.innerHTML = '';
        const existingComponents = new Set(selectedMateria.leyes.map(ley => ley.constructor));
        const existingScripts = new Set(selectedMateria.leyes.filter((ley): ley is Components.CreativeScript => ley instanceof Components.CreativeScript).map(ley => ley.scriptName));

        for (const category in availableComponents) {
            if (category === 'Scripting') continue;

            const categoryHeader = document.createElement('h4');
            categoryHeader.textContent = category;
            dom.componentList.appendChild(categoryHeader);

            availableComponents[category].forEach(ComponentClass => {
                if (existingComponents.has(ComponentClass)) {
                    return;
                }
                const componentItem = document.createElement('div');
                componentItem.className = 'component-item';
                componentItem.textContent = ComponentClass.name;
                componentItem.addEventListener('click', () => {
                    if (!selectedMateria) return;
                    const newComponent = new (ComponentClass as any)(selectedMateria);
                    selectedMateria.addComponent(newComponent);

                    if (newComponent instanceof Components.UIImage || newComponent instanceof Components.UICanvas) {
                        if (!selectedMateria.getComponent(Components.RectTransform)) {
                            const existingTransform = selectedMateria.getComponent(Components.Transform);
                            if (existingTransform) {
                                selectedMateria.removeComponent(Components.Transform);
                            }
                            selectedMateria.addComponent(new Components.RectTransform(selectedMateria));
                        }
                    }

                    dom.addComponentModal.classList.remove('is-open');
                    updateInspector(selectedMateria);
                });
                dom.componentList.appendChild(componentItem);
            });
        }

        dom.addComponentModal.classList.add('is-open');

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
            const scriptFiles: FileSystemFileHandle[] = [];
            async function findScriptFiles(dirHandle: FileSystemDirectoryHandle): Promise<void> {
                for await (const entry of dirHandle.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.ces')) {
                        scriptFiles.push(entry as FileSystemFileHandle);
                    } else if (entry.kind === 'directory') {
                        try {
                            await findScriptFiles(entry as FileSystemDirectoryHandle);
                        } catch (e) {
                            console.warn(`No se pudo acceder al directorio '${entry.name}'. Permisos? Saltando.`);
                        }
                    }
                }
            }

            const projectName = new URLSearchParams(window.location.search).get('project');
            if (!projectName) return;
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
                        if (!selectedMateria) return;
                        const newScript = new Components.CreativeScript(selectedMateria, fileHandle.name);
                        selectedMateria.addComponent(newScript);
                        dom.addComponentModal.classList.remove('is-open');
                        updateInspector(selectedMateria);
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

    updateDebugPanel = function(): void {
        if (!dom.debugContent || !SceneManager.currentScene) return;

        const pos = InputManager.getMousePosition();
        const canvasPos = InputManager.getMousePositionInCanvas();
        const leftButton = InputManager.getMouseButton(0) ? 'DOWN' : 'UP';
        const rightButton = InputManager.getMouseButton(2) ? 'DOWN' : 'UP';
        const pressedKeys = InputManager.getPressedKeys().join(', ') || 'Ninguna';

        const selectedMateriaName = selectedMateria ? `${selectedMateria.name} (ID: ${selectedMateria.id})` : 'Ninguna';
        const gameRunningStatus = isGameRunning ? 'Sí' : 'No';

        const fps = deltaTime > 0 ? (1.0 / deltaTime).toFixed(1) : '...';
        const dtMs = (deltaTime * 1000).toFixed(2);

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
                <pre>Pointer (Scene): X=${canvasPos.x.toFixed(0)}, Y=${canvasPos.y.toFixed(0)}\nBotones: L:${leftButton} R:${rightButton}\nTeclas: ${pressedKeys}</pre>
            </div>
        `;
    };

    runLayoutUpdate = function(): void {
        if (!SceneManager.currentScene) return;
    };

    runGameLoop = function(): void {
        if (!SceneManager.currentScene) return;
        if (physicsSystem) {
            physicsSystem.update(deltaTime);
        }
        for (const materia of SceneManager.currentScene.materias) {
            if (!materia.isActive) continue;
            materia.update(deltaTime);
        }
    };

    function handleEditorInteractions(): void {
        if (!renderer || !renderer.camera) return;

        if (isPanning) {
            const currentMousePosition = InputManager.getMousePosition();
            const dx = currentMousePosition.x - lastMousePosition.x;
            const dy = currentMousePosition.y - lastMousePosition.y;

            renderer.camera.x -= dx / renderer.camera.effectiveZoom;
            renderer.camera.y -= dy / renderer.camera.effectiveZoom;

            lastMousePosition = currentMousePosition;
            updateScene(renderer, false);
        }

        const scrollDelta = InputManager.getScrollDelta();
        if (scrollDelta !== 0 && activeView === 'scene-content') {
            renderer.camera.zoom(scrollDelta > 0 ? 1.1 : 0.9);
            updateScene(renderer, false);
        }
    }

    const editorLoop = (timestamp: number): void => {
        if (lastFrameTime > 0) {
            deltaTime = (timestamp - lastFrameTime) / 1000;
        }
        lastFrameTime = timestamp;

        InputManager.update();
        handleEditorInteractions();

        updateDebugPanel();
        runLayoutUpdate();

        if (isGameRunning) {
            runGameLoop();
            if (renderer) updateScene(renderer, false);
            if (gameRenderer) updateScene(gameRenderer, true);
        } else {
            if (activeView === 'scene-content' && renderer) {
                updateScene(renderer, false);
            } else if (activeView === 'game-content' && gameRenderer) {
                updateScene(gameRenderer, true);
            }
        }

        editorLoopId = requestAnimationFrame(editorLoop);
    };

    startGame = function(): void {
        if (isGameRunning) return;
        isGameRunning = true;
        lastFrameTime = performance.now();
        console.log("Game Started");
    };

    stopGame = function(): void {
        if (!isGameRunning) return;
        isGameRunning = false;
        console.log("Game Stopped");
    };

    // Final initialization will happen after setupEventListeners

    initializeEditor();
});
