// --- CodeMirror Integration ---
import { InputManager } from './engine/Input.js';
import * as SceneManager from './engine/SceneManager.js';
import { Renderer } from './engine/Renderer.js';
import { PhysicsSystem } from './engine/Physics.js';
import * as UISystem from './engine/ui/UISystem.js';
import * as Components from './engine/Components.js';
import { Materia } from './engine/Materia.js';
import { getURLForAssetPath } from './engine/AssetUtils.js';
import * as AnimationEditorWindow from './editor/ui/AnimationEditorWindow.js';
import { initialize as initializePreferences, getPreferences, loadExternalPreferences } from './editor/ui/PreferencesWindow.js';
import { initialize as initializeProjectSettings, populateUI as populateProjectSettingsUI, saveProjectConfig as saveProjectConfigFromModule } from './editor/ui/ProjectSettingsWindow.js';
import { initialize as initializeAnimatorController, openAnimatorController } from './editor/ui/AnimatorControllerWindow.js';
import { initialize as initializeHierarchy, updateHierarchy, duplicateSelectedMateria, handleContextMenuAction as handleHierarchyContextMenuAction } from './editor/ui/HierarchyWindow.js';
import { initialize as initializeInspector, updateInspector, refreshInspectorValues } from './editor/ui/InspectorWindow.js';
import { initialize as initializeAssetBrowser, updateAssetBrowser, getCurrentDirectoryHandle, handleContextMenuAction as handleAssetContextMenuAction } from './editor/ui/AssetBrowserWindow.js';
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
import * as AIHandler from './editor/AIHandler.js';
import * as Terminal from './editor/Terminal.js';
import * as TilePalette from './editor/ui/TilePaletteWindow.js';
import * as SpriteSlicer from './editor/ui/SpriteSlicerWindow.js';
import { API as LibraryAPI } from './editor/LibraryAPI.js';
import * as RuntimeAPIManager from './engine/RuntimeAPIManager.js';
import * as CES_Transpiler from './editor/CES_Transpiler.js';
import { initialize as initializeLibraryWindow } from './editor/ui/LibraryWindow.js';
import { showNotification as showNotificationDialog, showConfirmation as showConfirmationDialog } from './editor/ui/DialogWindow.js';
import * as VerificationSystem from './editor/ui/VerificationSystem.js';
import { AmbienteControlWindow } from './editor/ui/AmbienteControlWindow.js';
import { TerrenoEditorWindow } from './editor/ui/TerrenoEditorWindow.js';
import * as EngineAPI from './engine/EngineAPI.js';
import { getCustomComponentDefinitions } from './editor/EngineAPIExtension.js';
import * as MateriaFactory from './editor/MateriaFactory.js';
import MarkdownViewerWindow from './editor/ui/MarkdownViewerWindow.js';
import { buildProject } from './editor/BuildSystem.js';

// --- Editor Logic ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Editor State ---
    let isEditorReady = false; // Nueva bandera para controlar el estado de carga
    let projectsDirHandle = null;
    let selectedMateria = null;
    let selectedAsset = null;

    // Scratch canvas for tinting sprites
    const scratchCanvas = document.createElement('canvas');
    const scratchCtx = scratchCanvas.getContext('2d');
    let renderer = null, gameRenderer = null;
    let activeView = 'scene-content'; // 'scene-content', 'game-content', or 'code-editor-content'
    const panelVisibility = {
        hierarchy: true,
        inspector: true,
        assets: true,
        animator: false, // For the new controller panel
    };
    let physicsSystem = null;
    let uiSystem = null;


    let isGameRunning = false;
    let isGamePaused = false;
    let lastFrameTime = 0;
    let gameWindow = null;

    // --- External Game Window Listener ---
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CE_RUNNER_READY') {
            console.log("[Editor] External Game Runner Ready!");
            window.dispatchEvent(new CustomEvent('CE_EXTERNAL_RUNNER_READY'));
        }
    });

    // --- Console State & Utilities ---
    const originalLog = console.log, originalWarn = console.warn, originalError = console.error;
    let lastLogMessage = '';
    let lastLogType = '';
    let lastLogElement = null;
    let lastLogCount = 1;

    function logToUIConsole(message, type = 'log', isSystem = true, ...args) {
        const consoleMessages = dom.consoleMessages || document.getElementById('console-messages');
        if (!consoleMessages) return;

        let fullMessage = message;

        // Handle additional arguments
        if (args.length > 0) {
            args.forEach(arg => {
                if (arg instanceof Error) {
                    fullMessage += `\n${arg.stack || `${arg.name}: ${arg.message}`}`;
                } else if (typeof arg === 'object') {
                    try {
                        fullMessage += ` ${JSON.stringify(arg, null, 2)}`;
                    } catch (e) {
                        fullMessage += ` [Object]`;
                    }
                } else {
                    fullMessage += ` ${arg}`;
                }
            });
        }

        // Group identical messages
        if (fullMessage === lastLogMessage && type === lastLogType && lastLogElement) {
            lastLogCount++;
            let badge = lastLogElement.querySelector('.log-count-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'log-count-badge';
                lastLogElement.appendChild(badge);
            }
            badge.textContent = lastLogCount;
            // Keep scroll at bottom if it was already there
            const isAtBottom = consoleMessages.scrollHeight - consoleMessages.scrollTop <= consoleMessages.clientHeight + 50;
            if (isAtBottom) {
                consoleMessages.scrollTop = consoleMessages.scrollHeight;
            }
            return;
        }

        lastLogMessage = fullMessage;
        lastLogType = type;
        lastLogCount = 1;

        const msgEl = document.createElement('div'); // Changed to div for potential multi-line content
        msgEl.className = `console-msg log-${type}`;
        msgEl.dataset.category = isSystem ? 'system' : 'user';
        msgEl.style.whiteSpace = 'pre-wrap'; // Preserve line breaks

        const textSpan = document.createElement('span');
        textSpan.textContent = `> ${fullMessage}`;
        msgEl.appendChild(textSpan);

        consoleMessages.appendChild(msgEl);

        // Auto-scroll only if we are at the bottom
        const isAtBottom = consoleMessages.scrollHeight - consoleMessages.scrollTop <= consoleMessages.clientHeight + 50;
        if (isAtBottom) {
            consoleMessages.scrollTop = consoleMessages.scrollHeight;
        }

        lastLogElement = msgEl;
    }

    function clearUIConsole() {
        const consoleMessages = dom.consoleMessages || document.getElementById('console-messages');
        if (consoleMessages) consoleMessages.innerHTML = '';
        lastLogMessage = '';
        lastLogType = '';
        lastLogElement = null;
        lastLogCount = 1;
    }

    // Override console methods immediately
    console.log = function(message, ...args) {
        logToUIConsole(message, 'log', true, ...args);
        originalLog.apply(console, [message, ...args]);
    };
    console.warn = function(message, ...args) {
        logToUIConsole(message, 'warn', true, ...args);
        originalWarn.apply(console, [message, ...args]);
    };
    console.error = function(message, ...args) {
        logToUIConsole(message, 'error', true, ...args);
        originalError.apply(console, [message, ...args]);
    };
    let editorLoopId = null;
    let deltaTime = 0;
    let frameCount = 0;
    // Fixed-timestep accumulator for scripts
    let fixedAccumulator = 0;
    const FIXED_DELTA = 1 / 50; // 50 Hz fixed updates
    let sceneSnapshotBeforePlay = null; // Para guardar el estado de la escena antes de "Play"
    let isPrefabMode = false;
    let editingPrefabHandle = null;
    let sceneSnapshotBeforePrefabMode = null;

    // Project Settings State
    window.currentProjectConfig = {};
    let currentProjectConfig = window.currentProjectConfig;
    // Editor Preferences State


    // --- 2. DOM Elements ---
    const dom = {};
        const ids = [
            'editor-container', 'menubar', 'editor-main-content', 'hierarchy-panel', 'hierarchy-content',
            'scene-panel', 'scene-content', 'inspector-panel', 'assets-panel', 'assets-content', 'console-content',
            'console-messages', 'btn-clear-console',
            'project-name-display', 'debug-content', 'context-menu', 'hierarchy-context-menu', 'anim-node-context-menu',
            'preferences-modal', 'code-editor-content', 'add-component-modal', 'component-list', 'sprite-selector-modal',
            'sprite-selector-grid', 'codemirror-container', 'asset-folder-tree', 'asset-grid-view', 'animation-panel',
            'drawing-canvas', 'code-editor-toolbar', 'code-save-btn', 'code-undo-btn', 'code-redo-btn', 'drawing-tools', 'drawing-color-picker',
            'add-frame-btn', 'animation-import-btn', 'delete-frame-btn', 'animation-timeline', 'animation-panel-overlay', 'animation-edit-view',
            'animation-playback-view', 'animation-playback-canvas', 'animation-play-btn', 'animation-stop-btn',
            'animation-save-btn', 'current-scene-name', 'animator-controller-panel', 'drawing-canvas-container',
            'anim-onion-skin-canvas', 'anim-grid-canvas', 'anim-bg-toggle-btn', 'anim-grid-toggle-btn',
            'anim-onion-toggle-btn', 'timeline-toggle-btn', 'project-settings-modal', 'settings-app-name',
            'settings-author-name', 'settings-app-version', 'settings-engine-version', 'settings-renderer-mode', 'settings-ram-limit', 'settings-icon-preview',
            'settings-icon-picker-btn', 'settings-logo-list', 'settings-add-logo-btn', 'settings-show-engine-logo',
            'settings-keystore-path', 'settings-keystore-picker-btn', 'settings-keystore-pass', 'settings-key-alias',
            'settings-key-pass', 'settings-export-project-btn', 'settings-save-btn', 'engine-logo-confirm-modal',
            'confirm-disable-logo-btn', 'cancel-disable-logo-btn', 'keystore-create-modal', 'keystore-create-btn',
            'ks-alias', 'ks-password', 'ks-validity', 'ks-cn', 'ks-ou', 'ks-o', 'ks-l', 'ks-st', 'ks-c', 'ks-filename',
            'ks-storepass', 'ks-command-output', 'ks-command-textarea', 'ks-generate-btn', 'settings-sorting-layer-list',
            'new-sorting-layer-name', 'add-sorting-layer-btn', 'settings-collision-layer-list', 'new-collision-layer-name',
            'add-collision-layer-btn', 'settings-tag-list', 'new-tag-name', 'add-tag-btn', 'settings-layer-list', 'prefs-theme', 'prefs-custom-theme-picker', 'prefs-color-bg', 'prefs-color-header',
            'prefs-color-accent', 'prefs-autosave-toggle', 'prefs-autosave-interval-group', 'prefs-autosave-interval',
            'prefs-save-btn', 'prefs-script-lang', 'prefs-show-scene-grid', 'prefs-snapping-toggle', 'prefs-snapping-grid-size-group',
            'prefs-snapping-grid-size', 'prefs-zoom-speed', 'prefs-reset-layout-btn',
            'prefs-ai-provider', 'prefs-ai-api-key-group', 'prefs-ai-api-key', 'prefs-ai-save-key-btn', 'prefs-ai-delete-key-btn',
            'prefs-ai-model-selection-group', 'prefs-ai-model-selector', 'prefs-ai-error-display',
            'prefs-carl-can-use-console', 'prefs-carl-can-manage-files', 'prefs-carl-can-manipulate-scenes', 'prefs-carl-can-download-files',
            'prefs-execution-mode', 'prefs-auto-close-game-window',
            // Library Window Elements
            'menubar-libraries-btn', 'library-panel', 'library-panel-create-btn', 'library-panel-import-btn', 'library-panel-export-btn',
            'create-library-modal', 'library-api-docs-btn', 'library-api-docs-modal', 'library-api-docs-close-btn',
            'lib-create-name', 'lib-create-author', 'lib-create-version', 'lib-create-signature', 'lib-create-description',
            'lib-create-req-windows', 'lib-create-runtime-access', 'lib-create-is-tool', 'lib-create-custom-components', 'lib-create-modify-assets',
            'lib-create-icon-preview', 'lib-create-icon-picker-btn', 'lib-create-icon-input',
            'lib-create-author-icon-preview', 'lib-create-author-icon-picker-btn', 'lib-create-author-icon-input',
            'lib-create-drop-zone', 'lib-create-file-input', 'lib-create-file-list', 'lib-create-confirm-btn', 'lib-create-cancel-btn',
            'prefs-show-terminal',
            'toolbar-music-btn', 'music-player-panel',
            'now-playing-bar', 'now-playing-title', 'playlist-container', 'music-controls', 'music-add-btn',
            'music-prev-btn', 'music-play-pause-btn', 'music-next-btn', 'music-volume-slider', 'export-description-modal',
            'export-description-text', 'export-description-next-btn', 'package-file-tree-modal', 'package-modal-title',
            'package-modal-description', 'package-file-tree-container', 'package-export-controls', 'package-import-controls',
            'export-filename', 'export-confirm-btn', 'import-confirm-btn', 'resizer-left', 'resizer-right', 'resizer-bottom',
            'ui-editor-panel', 'ui-editor-save-btn', 'ui-canvas-maximize-btn', 'ui-editor-hierarchy',
            'ui-editor-canvas-container', 'ui-editor-canvas', 'ui-editor-inspector', 'ui-resizer-left', 'ui-resizer-right',
            'asset-store-panel', 'btn-open-asset-store-ext',
            // Carl IA Panel Elements
            'carl-ia-panel', 'carl-ia-view-selector-btn', 'carl-ia-brain-selector-btn', 'carl-ia-messages', 'carl-ia-input', 'carl-ia-send-btn', 'menubar-carl-ia-btn',
            // Terminal Elements
            'view-toggle-terminal', 'terminal-content', 'terminal-output', 'terminal-input',
            // Tile Palette Elements
            'tile-palette-panel', 'palette-asset-name', 'palette-save-btn', 'palette-load-btn', 'palette-edit-btn',
            'palette-file-name', 'palette-selected-tile-id',
            'palette-view-container', 'palette-grid-canvas', 'palette-panel-overlay',
            'palette-organize-sidebar', 'palette-associate-sprite-btn', 'palette-disassociate-sprite-btn', 'palette-delete-sprite-btn', 'palette-sprite-pack-list',
            // Sprite Slicer Panel Elements
            'sprite-slicer-panel', 'slicer-load-image-btn', 'slicer-create-asset-btn', 'sprite-slicer-overlay',
            'slicer-canvas', 'slice-type', 'slice-grid-cell-size-options',
            'slice-grid-cell-count-options', 'slice-pivot', 'slice-custom-pivot-container', 'slice-btn',
            'slice-pixel-size-x', 'slice-pixel-size-y', 'slice-column-count', 'slice-row-count',
            'slice-offset-x', 'slice-offset-y', 'slice-padding-x', 'slice-padding-y', 'slice-keep-empty',
            'slice-custom-pivot-x', 'slice-custom-pivot-y', 'slicer-delete-sprite-btn',
            // Animation from Sprites Modal
            'animation-from-sprite-modal', 'anim-sprite-selection-gallery', 'anim-sprite-timeline',
            'anim-sprite-clear-btn', 'anim-sprite-create-btn',
            // New Loading Panel Elements
            'loading-overlay', 'loading-status-message', 'progress-bar', 'loading-error-section', 'loading-error-message',
            'btn-retry-loading', 'btn-back-to-launcher',
            'btn-play', 'btn-pause', 'btn-stop', 'btn-exit-prefab', 'btn-save-prefab',
            'tool-tile-brush', 'tool-tile-bucket', 'tool-tile-rectangle-fill', 'tool-tile-eraser',
            // Menubar scene options
            'menu-new-scene', 'menu-open-scene', 'menu-save-scene', 'menu-build',
            // Asset Selector Bubble Elements
            'asset-selector-bubble', 'asset-selector-title', 'asset-selector-breadcrumbs', 'asset-selector-grid-view',
            'asset-selector-toolbar', 'asset-selector-view-modes', 'asset-selector-search',
            'asset-selector-footer', 'asset-selector-confirm-btn',
            // Disassociate Sprite Modal
            'disassociate-sprite-modal', 'disassociate-sprite-list',
            // Verification System Panel
            'verification-system-panel', 'verification-tile-image', 'verification-status-text', 'verification-details-text',
            // Ambiente Control Panel
            'ambiente-control-panel', 'ambiente-tiempo', 'ambiente-tiempo-valor',
            'ambiente-noche-dia-intensidad', 'ambiente-noche-dia-intensidad-valor',
            'ambiente-ciclo-automatico', 'ambiente-duracion-dia',
            'ambiente-filtro-color', 'ambiente-filtro-swatches', 'ambiente-capas-excluidas',
            // Markdown Viewer Panel
            'markdown-viewer-panel', 'markdown-viewer-title', 'md-preview-btn', 'md-edit-btn', 'md-save-btn',
            'md-preview-content', 'md-edit-content',
            // CHC Editor Elements
            'chc-integrated-editor', 'chc-human-text', 'chc-run-btn', 'chc-loading-overlay', 'chc-loading-text'
        ];
        ids.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
            dom[camelCaseId] = document.getElementById(id);
        });
        dom.inspectorContent = dom.inspectorPanel.querySelector('.panel-content');
        dom.sceneCanvas = document.getElementById('scene-canvas');
        dom.gameCanvas = document.getElementById('game-canvas');

    // --- 3. IndexedDB Logic ---
    const dbName = 'CreativeEngineDB'; let db; function openDB() { return new Promise((resolve, reject) => { const request = indexedDB.open(dbName, 1); request.onerror = () => reject('Error opening DB'); request.onsuccess = (e) => { db = e.target.result; resolve(db); }; request.onupgradeneeded = (e) => { e.target.result.createObjectStore('settings', { keyPath: 'id' }); }; }); }
    function getDirHandle() { if (!db) return Promise.resolve(null); return new Promise((resolve) => { const request = db.transaction(['settings'], 'readonly').objectStore('settings').get('projectsDirHandle'); request.onsuccess = () => resolve(request.result ? request.result.handle : null); request.onerror = () => resolve(null); }); }

    // --- 5. Core Editor Functions ---
    var createScriptFile, updateScene, selectMateria, startGame, runGameLoop, stopGame, openAnimationAsset, addFrameFromCanvas, loadScene, saveScene, serializeScene, deserializeScene, openSpriteSelector, saveAssetMeta, createAsset, runChecksAndPlay, originalStartGame, loadProjectConfig, saveProjectConfig, runLayoutUpdate, updateWindowMenuUI, handleKeyboardShortcuts, updateGameControlsUI, loadRuntimeApis, openAssetSelector, enterAddTilemapLayerMode, openMarkdownViewerCallback, saveAssetContentCallback, hotReloadScript, scanAndTranspileAllScripts;

    hotReloadScript = async function(scriptName) {
        if (!isGameRunning || !SceneManager.currentScene) return;

        console.log(`[CHC] Hot-reloading script: ${scriptName}`);
        for (const materia of SceneManager.currentScene.getAllMaterias()) {
            if (!materia.isActive) continue;
            const scripts = materia.getComponents(Components.CreativeScript).filter(s => s.scriptName === scriptName);
            for (const script of scripts) {
                // Notificar desactivación antes de reiniciar
                try { script.onDisable(); } catch(e) {}

                // Marcar como no inicializado para forzar recarga de código
                script.isInitialized = false;
                script.instance = null;

                await script.initializeInstance();
                if (script.isInitialized) {
                    try { script.start(); } catch(e) {}
                    try { script.onEnable(); } catch(e) {}
                }
            }
        }
    };

    saveAssetContentCallback = async function(filePath, content, onSaveComplete) {
        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            let currentHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            const parts = filePath.split('/');
            const fileName = parts.pop();

            for (const part of parts) {
                if (part) { // Skip empty parts if path starts with /
                    currentHandle = await currentHandle.getDirectoryHandle(part);
                }
            }

            const fileHandle = await currentHandle.getFileHandle(fileName, { create: false });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            console.log(`Asset '${filePath}' guardado exitosamente.`);
            if (onSaveComplete && typeof onSaveComplete === 'function') {
                onSaveComplete();
            }
        } catch (error) {
            console.error(`No se pudo guardar el asset '${filePath}':`, error);
            showNotificationDialog('Error al Guardar', `No se pudo guardar el archivo: ${error.message}`);
        }
    };

    openMarkdownViewerCallback = function(filePath, content) {
        MarkdownViewerWindow.show(filePath, content);
    };

    openAssetSelector = async function(callback, options) {
        // For backwards compatibility, if the second argument isn't an object (and not an array), treat it as the old 'filter'.
        if (Array.isArray(options) || typeof options !== 'object' || options === null) {
            options = { filter: options };
        }

        const selectorPanel = dom.assetSelectorBubble;
        const titleEl = dom.assetSelectorTitle;
        const breadcrumbsEl = dom.assetSelectorBreadcrumbs;
        const gridView = dom.assetSelectorGridView;
        const searchInput = dom.assetSelectorSearch;
        const viewModesContainer = dom.assetSelectorViewModes;
        const footerEl = document.getElementById('asset-selector-footer');
        const confirmBtn = document.getElementById('asset-selector-confirm-btn');

        const isMultiple = options && options.multiple;
        let selectedItems = []; // Array of { handle, path, dirHandle }

        if (isMultiple) {
            footerEl.classList.remove('hidden');
        } else {
            footerEl.classList.add('hidden');
        }

        // NEW: Check if we're in file list mode.
        const isFileListMode = options && options.fileList && Array.isArray(options.fileList);
        const filter = (options && options.filter && (Array.isArray(options.filter) ? options.filter.length > 0 : true)) ? options.filter : null;

        let currentDirHandle;
        let currentPath;
        let allProjectFiles = []; // Cache for "Project" view
        let currentViewMode = 'folders'; // Default view mode

        // NEW HELPER: To get a file handle from a full path. Needed for fileList mode.
        async function getHandleForPath(fullPath) {
            const projectName = new URLSearchParams(window.location.search).get('project');
            let currentHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            const parts = fullPath.split('/');

            // Traverse directories
            for (let i = 0; i < parts.length - 1; i++) {
                if (parts[i]) { // Skip empty parts (like leading '/')
                    try {
                        currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
                    } catch (e) {
                        console.error(`Could not get directory handle for part '${parts[i]}' in path '${fullPath}'`);
                        return null; // Directory not found
                    }
                }
            }

            // Get the file handle
            const fileName = parts[parts.length - 1];
            try {
                 // Return both file and its parent directory handle
                return {
                    fileHandle: await currentHandle.getFileHandle(fileName),
                    dirHandle: currentHandle
                };
            } catch (e) {
                console.error(`Could not get file handle for '${fileName}' in path '${fullPath}'`);
                return null; // File not found
            }
        }


        async function findAllFiles(dirHandle, path, fileList) {
            for await (const entry of dirHandle.values()) {
                const entryPath = `${path}/${entry.name}`;
                if (entry.kind === 'file') {
                    // Store more info for project view
                    fileList.push({ handle: entry, path: entryPath, dirHandle: dirHandle });
                } else if (entry.kind === 'directory') {
                    await findAllFiles(entry, entryPath, fileList);
                }
            }
        }

        function renderItems(items) {
            gridView.innerHTML = '';
            const searchTerm = searchInput.value.toLowerCase();

            // "Up" button logic for folder navigation
            if (currentViewMode === 'folders' && !isFileListMode && currentPath !== 'Assets') {
                 const upItem = document.createElement('div');
                upItem.className = 'grid-item';
                upItem.innerHTML = `<div class="icon" style="font-size: 2.5em;">⤴️</div><div class="name">..</div>`;
                upItem.addEventListener('dblclick', async () => {
                    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
                    const projectName = new URLSearchParams(window.location.search).get('project');
                    const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
                    let parentHandle = projectHandle;
                    // Reconstruct handle from path
                    for (const part of parentPath.split('/')) {
                        if (part) parentHandle = await parentHandle.getDirectoryHandle(part);
                    }
                    currentPath = parentPath;
                    currentDirHandle = parentHandle;
                    populateSelector();
                });
                gridView.appendChild(upItem);
            }

            const filteredItems = items.filter(item => {
                // Adjust for different item structures
                const name = item.name || (item.handle ? item.handle.name : '');
                return name.toLowerCase().includes(searchTerm);
            });


            for (const item of filteredItems) {
                // Adapt to handle both FileSystemHandle objects and our custom file info objects
                const name = item.name || item.handle.name;
                const kind = item.kind || (item.handle ? item.handle.kind : 'file'); // Assume file if kind unknown
                const fullPath = item.path || `${currentPath}/${name}`;
                const displayDirHandle = item.dirHandle || currentDirHandle;


                const uiItem = document.createElement('div');
                uiItem.className = 'grid-item';
                uiItem.dataset.name = name;

                if (kind === 'directory') {
                    uiItem.innerHTML = `<div class="icon">📁</div><div class="name">${name}</div>`;
                    uiItem.addEventListener('dblclick', async () => {
                        currentDirHandle = await currentDirHandle.getDirectoryHandle(name);
                        currentPath = `${currentPath}/${name}`;
                        if (isMultiple) selectedItems = []; // Clear selection when changing folder
                        populateSelector();
                    });
                } else { // It's a file
                    const iconContainer = document.createElement('div');
                    iconContainer.className = 'icon';

                    // Specific icons for known file types
                    if (name.endsWith('.cea')) {
                        iconContainer.innerHTML = '🎞️';
                    } else if (name.endsWith('.ceanim')) {
                        iconContainer.innerHTML = '🕹️';
                    } else if (name.endsWith('.ceprefab')) {
                        iconContainer.innerHTML = '🧊';
                    } else if (name.endsWith('.ceScene')) {
                        iconContainer.innerHTML = '🎬';
                    } else if (name.endsWith('.ces')) {
                        iconContainer.innerHTML = '📜';
                    } else if (name.endsWith('.chc')) {
                        iconContainer.innerHTML = '🤖';
                    } else {
                        const imgIcon = document.createElement('img');
                        imgIcon.className = 'icon-preview';
                        getURLForAssetPath(fullPath, projectsDirHandle).then(url => {
                            if (url && (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg'))) {
                                imgIcon.src = url;
                                iconContainer.appendChild(imgIcon);
                            } else {
                                iconContainer.textContent = '📄';
                            }
                        });
                    }


                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'name';
                    // Clean name for display
                    nameDiv.textContent = name.substring(0, name.lastIndexOf('.')) || name;

                    uiItem.appendChild(iconContainer);
                    uiItem.appendChild(nameDiv);

                    // Update visual selection state
                    if (isMultiple && selectedItems.some(si => si.path === fullPath)) {
                        uiItem.classList.add('selected');
                    }

                    uiItem.addEventListener('click', async (e) => {
                        if (isMultiple) {
                            const index = selectedItems.findIndex(si => si.path === fullPath);
                            if (index >= 0) {
                                selectedItems.splice(index, 1);
                                uiItem.classList.remove('selected');
                            } else {
                                const fileHandle = item.handle || await displayDirHandle.getFileHandle(name);
                                selectedItems.push({ handle: fileHandle, path: fullPath, dirHandle: displayDirHandle });
                                uiItem.classList.add('selected');
                            }
                        }
                    });

                    uiItem.addEventListener('dblclick', async () => {
                        // Get the file handle, which might be nested inside the item object
                        const fileHandle = item.handle || await displayDirHandle.getFileHandle(name);
                        if (isMultiple) {
                            // If multiple, dblclick acts as "add this and finish"
                            if (!selectedItems.some(si => si.path === fullPath)) {
                                selectedItems.push({ handle: fileHandle, path: fullPath, dirHandle: displayDirHandle });
                            }
                            callback(selectedItems);
                        } else {
                            callback(fileHandle, fullPath, displayDirHandle);
                        }
                        selectorPanel.classList.add('hidden');
                    });
                }
                gridView.appendChild(uiItem);
            }
        }


        async function populateSelector() {
            let itemsToRender = [];

            // NEW LOGIC: If we're in file list mode, prepare the list of handles
            if (isFileListMode) {
                const fileInfos = await Promise.all(options.fileList.map(async path => {
                    const handleInfo = await getHandleForPath(path);
                    if (!handleInfo) return null;
                    return { handle: handleInfo.fileHandle, path: path, name: path.split('/').pop(), dirHandle: handleInfo.dirHandle };
                }));
                itemsToRender = fileInfos.filter(Boolean); // Filter out any nulls from failed handle lookups
            } else if (currentViewMode === 'folders') {
                breadcrumbsEl.textContent = `Ruta: /${currentPath}`;
                const entries = [];
                for await (const entry of currentDirHandle.values()) { entries.push(entry); }

                const filteredEntries = [];
                for (const entry of entries) {
                    if (entry.kind === 'directory') { filteredEntries.push(entry); continue; }

                    const lowerName = entry.name.toLowerCase();
                    let shouldRender = !filter; // Render if no filter

                    if (Array.isArray(filter)) {
                        for (const ext of filter) {
                            if (ext === 'image') { if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) { shouldRender = true; break; } }
                            else if (ext === 'audio') { if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav')) { shouldRender = true; break; } }
                            else if (lowerName.endsWith(ext.toLowerCase())) { shouldRender = true; break; }
                        }
                    } else if (typeof filter === 'string') {
                        // Handle simple string filters like 'image'
                        switch (filter) {
                            case 'image': shouldRender = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg'); break;
                            case 'audio': shouldRender = lowerName.endsWith('.mp3') || lowerName.endsWith('.wav'); break;
                            default: shouldRender = lowerName.endsWith(filter.toLowerCase());
                        }
                    }
                    if (shouldRender) { filteredEntries.push(entry); }
                }
                itemsToRender = filteredEntries;
                // Sort folders first, then alphabetically
                itemsToRender.sort((a, b) => (a.kind === b.kind) ? a.name.localeCompare(b.name) : (a.kind === 'directory' ? -1 : 1));
            } else { // 'project' view
                // Filter the cached list of all project files
                const filteredFiles = [];
                for (const fileInfo of allProjectFiles) {
                    const lowerName = fileInfo.handle.name.toLowerCase();
                    let shouldRender = !filter;
                    if (Array.isArray(filter)) {
                        for (const ext of filter) {
                            if (ext === 'image') { if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) { shouldRender = true; break; } }
                            else if (ext === 'audio') { if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav')) { shouldRender = true; break; } }
                            else if (lowerName.endsWith(ext.toLowerCase())) { shouldRender = true; break; }
                        }
                    } else if (typeof filter === 'string') {
                        switch (filter) {
                            case 'image': shouldRender = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg'); break;
                            case 'audio': shouldRender = lowerName.endsWith('.mp3') || lowerName.endsWith('.wav'); break;
                            default: shouldRender = lowerName.endsWith(filter.toLowerCase());
                        }
                    }
                     if (shouldRender) { filteredFiles.push(fileInfo); }
                }
                itemsToRender = filteredFiles;
            }

            renderItems(itemsToRender);
        }

        // --- Event Listeners ---
        searchInput.oninput = populateSelector;

        viewModesContainer.addEventListener('click', (e) => {
            if (e.target.matches('.view-mode-btn')) {
                const newMode = e.target.dataset.mode;
                if (newMode === currentViewMode) return;
                currentViewMode = newMode;
                // Update UI
                viewModesContainer.querySelectorAll('.view-mode-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                populateSelector();
            }
        });


        // --- Initialization ---
        // NEW: Hide folder-specific UI in file list mode
        if (isFileListMode) {
             viewModesContainer.style.display = 'none';
             breadcrumbsEl.style.display = 'none';
        } else {
            viewModesContainer.style.display = 'flex';
            breadcrumbsEl.style.display = 'block';

            if (!projectsDirHandle) {
                console.warn("Asset Selector: No projectsDirHandle available. Aborting open.");
                selectorPanel.classList.add('hidden');
                return;
            }

            // Normal initialization for folder browsing
            const projectName = new URLSearchParams(window.location.search).get('project');
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
            currentDirHandle = assetsHandle;
            currentPath = 'Assets';

            // Pre-cache all files for the "Project" view
            allProjectFiles = [];
            await findAllFiles(assetsHandle, 'Assets', allProjectFiles);
        }


        // Dynamic title generation
        let titleText = (options && options.title) ? options.title : 'Seleccionar Archivo';
        if (!options.title && !isFileListMode) { // Don't override title in file list mode unless specified
            if (typeof filter === 'string') {
                titleText = `Seleccionar ${filter.charAt(0).toUpperCase() + filter.slice(1)}`;
            } else if (Array.isArray(filter) && filter.length > 0) {
                const extensions = filter.join(' / ');
                titleText = `Seleccionar Archivo (${extensions})`;
            }
        }
        titleEl.textContent = titleText;
        selectorPanel.classList.remove('hidden');

        // Ensure the selector bubble appears on top of other floating panels
        const highestZ = Array.from(document.querySelectorAll('.floating-panel'))
            .reduce((maxZ, p) => Math.max(maxZ, parseInt(p.style.zIndex || '1500')), 1500);
        selectorPanel.style.zIndex = highestZ + 1;


        await populateSelector();

        // --- Multi-selection Confirm ---
        confirmBtn.onclick = () => {
            if (isMultiple) {
                callback(selectedItems);
                selectorPanel.classList.add('hidden');
            }
        };

        // Re-attach close button listener to prevent duplicates
        const closeBtn = selectorPanel.querySelector('.close-panel-btn');
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', () => {
            selectorPanel.classList.add('hidden');
        });
    };

    createAsset = async function(fileName, content, dirHandle) {
        try {
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            console.log(`Asset '${fileName}' creado exitosamente.`);
            return fileHandle;
        } catch (error) {
            console.error(`No se pudo crear el asset '${fileName}':`, error);
            showNotificationDialog('Error de Creación', `No se pudo crear el asset: ${error.message}`);
            return null;
        }
    };

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
        // Si el juego está en marcha y la vista activa es la del juego, no procesar los atajos del editor.
        if (isGameRunning && activeView === 'game-content') {
            return;
        }

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
                case 't':
                    setActiveTool('universal');
                    break;
                case 'b':
                    setActiveTool('terrain-brush');
                    break;
                case 'g':
                    setActiveTool('tile-bucket');
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

    function updateEditorLayout() {
        const mainContent = dom.editorMainContent;
        if (!mainContent) return;

        // Apply grid classes based on panel visibility
        mainContent.classList.toggle('no-hierarchy', !panelVisibility.hierarchy);
        mainContent.classList.toggle('no-inspector', !panelVisibility.inspector);
        mainContent.classList.toggle('no-assets', !panelVisibility.assets);

        // Sync resizers
        if (dom.resizerLeft) dom.resizerLeft.style.display = panelVisibility.hierarchy ? 'block' : 'none';
        if (dom.resizerRight) dom.resizerRight.style.display = panelVisibility.inspector ? 'block' : 'none';
        if (dom.resizerBottom) dom.resizerBottom.style.display = panelVisibility.assets ? 'block' : 'none';

        // Wait for next frame to resize renderers so CSS has applied
        requestAnimationFrame(() => {
            if (renderer) renderer.resize();
            if (gameRenderer) gameRenderer.resize();
        });
    }

    function updateWindowMenuUI() {
        const menuItems = {
            'hierarchy-panel': 'menu-window-hierarchy',
            'inspector-panel': 'menu-window-inspector',
            'assets-panel': 'menu-window-assets',
            'animation-panel': 'menu-window-animation',
            'animator-controller-panel': 'menu-window-animator',
            'tile-palette-panel': 'menu-window-tile-palette',
            'sprite-slicer-panel': 'menu-window-sprite-editor',
            'asset-store-panel': 'menu-window-asset-store',
            'verification-system-panel': 'menu-window-verification-system',
            'ambiente-control-panel': 'menu-window-ambiente-control'
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

    scanAndTranspileAllScripts = async function(dirHandle) {
        console.log(`[ScriptScanner] Escaneando scripts en: ${dirHandle.name}`);
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                if (entry.name.endsWith('.ces')) {
                    try {
                        const file = await entry.getFile();
                        const content = await file.text();
                        CES_Transpiler.transpile(content, entry.name);
                        console.log(`[ScriptScanner] CES Transpilado: ${entry.name}`);
                    } catch (e) {
                        console.error(`[ScriptScanner] Error al transpilar CES ${entry.name}:`, e);
                    }
                } else if (entry.name.endsWith('.chc')) {
                    try {
                        // Look for .chc.meta
                        const metaName = `${entry.name}.meta`;
                        const metaHandle = await dirHandle.getFileHandle(metaName, { create: false });
                        const metaFile = await metaHandle.getFile();
                        const metaContent = await metaFile.text();
                        const metaData = JSON.parse(metaContent);
                        if (metaData && metaData.generatedCode) {
                            CES_Transpiler.transpile(metaData.generatedCode, entry.name);
                            console.log(`[ScriptScanner] CHC Transpilado (desde meta): ${entry.name}`);
                        }
                    } catch (e) {
                        // Meta might not exist or other error
                        console.warn(`[ScriptScanner] No se pudo cargar meta para CHC ${entry.name}:`, e.message);
                    }
                }
            } else if (entry.kind === 'directory') {
                await scanAndTranspileAllScripts(entry);
            }
        }
    };

    loadProjectConfig = async function() {
        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            const configFileHandle = await projectHandle.getFileHandle('project.ceconfig', { create: false });
            const file = await configFileHandle.getFile();
            const content = await file.text();
            currentProjectConfig = JSON.parse(content);
            window.currentProjectConfig = currentProjectConfig;
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
                    sortingLayers: ['Default', 'TransparentFX', 'Ignore Raycast', '', 'Water', 'UI', 'Background', 'Midground', 'Foreground', 'Player', 'Enemy', 'Items', 'VFX'],
                    collisionLayers: ['Default', 'TransparentFX', 'Ignore Raycast', '', 'Water', 'UI', 'Ground', 'Player', 'Enemy', 'NPC', 'Items', 'VFX', 'Trigger']
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

        if (!currentProjectConfig.ramLimit) {
            currentProjectConfig.ramLimit = 2048;
        }

        // Apply editor preferences from project config if they exist
        if (currentProjectConfig.preferences) {
            loadExternalPreferences(currentProjectConfig.preferences);
        }

        // The UI population is now handled by the module
        populateProjectSettingsUI(currentProjectConfig, projectsDirHandle);
    };

    // --- Project Settings and Preferences Logic has been moved to their respective modules ---

    loadRuntimeApis = async function() {
        RuntimeAPIManager.clearAPIs();

        const projectName = new URLSearchParams(window.location.search).get('project');
        if (!projectName || !projectsDirHandle) {
            console.warn("No se puede cargar librerías sin un proyecto cargado.");
            return;
        }
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

        try {
            const libDirHandle = await projectHandle.getDirectoryHandle('lib');

            for await (const entry of libDirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.celib')) {
                    let isActive = true;
                    try {
                        const metaFileHandle = await libDirHandle.getFileHandle(`${entry.name}.meta`);
                        const metaFile = await metaFileHandle.getFile();
                        const metaContent = await metaFile.text();
                        const metaData = JSON.parse(metaContent);
                        if (metaData.active === false) {
                            isActive = false;
                        }
                    } catch (e) {
                    }

                    if (!isActive) {
                        continue;
                    }

                    try {
                        const file = await entry.getFile();
                        const content = await file.text();
                        const libData = JSON.parse(content);

                        if (libData.api_access && libData.api_access.runtime_accessible) {
                            const scriptContent = decodeURIComponent(escape(atob(libData.script_base64)));
                            const apiObject = (new Function(scriptContent))();

                            if (apiObject && typeof apiObject === 'object') {
                                RuntimeAPIManager.registerAPI(libData.name, apiObject);
                                const fileNameWithoutExt = entry.name.replace('.celib', '');
                                if (libData.name !== fileNameWithoutExt) {
                                    RuntimeAPIManager.registerAPI(fileNameWithoutExt, apiObject);
                                    console.log(`Registrando alias para '${libData.name}' como '${fileNameWithoutExt}'.`);
                                }
                            } else {
                                console.warn(`La librería '${libData.name}' no devolvió un objeto API.`);
                            }
                        }
                    } catch (e) {
                        console.error(`Error procesando la librería ${entry.name}:`, e);
                    }
                }
            }
        } catch (error) {
            if (error.name === 'NotFoundError') {
                console.log("Directorio 'lib' no encontrado. No se cargarán librerías en tiempo de ejecución.");
            } else {
                console.error("Error al acceder al directorio de librerías:", error);
            }
        }
    };

    runChecksAndPlay = async function() {
        try {
            if (!isEditorReady) {
                showNotificationDialog('Editor Ocupado', 'El editor todavía está procesando archivos en segundo plano. Por favor, espera un momento.');
                return;
            }

            const prefs = getPreferences();
            const executionMode = prefs.executionMode || 'integrated';

            // IMPORTANT: Open the window IMMEDIATELY to avoid browser popup blockers
            // Browsers only allow window.open in the same tick as a user click.
            if (executionMode === 'window' && !gameWindow) {
                console.log("[Editor] Pre-opening game window to avoid popup blocker...");
                const projectName = new URLSearchParams(window.location.search).get('project') || 'Juego';
                gameWindow = window.open('runner.html', 'CreativeEngineGame', 'width=800,height=600');
                if (!gameWindow) {
                    showNotificationDialog('Popup Bloqueado', 'No se pudo abrir la ventana del juego. Por favor, permite las ventanas emergentes para este sitio en tu navegador.');
                    return;
                }

                // Set initial title
                try { gameWindow.document.title = `Juego: ${projectName} | Creative Engine`; } catch(e) {}
            }

        // MODIFICATION: In test mode (no handle), skip checks and just play.
        if (!projectsDirHandle) {
            console.log("Modo de prueba detectado (sin project handle). Iniciando el juego directamente.");
            originalStartGame();
            return;
        }

        // --- 1. Clear and Load All APIs ---
        // Clear previous runtime APIs to ensure a clean slate for every "Play"
        RuntimeAPIManager.clearAPIs();

        // Load external libraries first
        await loadRuntimeApis();

        // Now, register the internal engine APIs
        const internalApis = EngineAPI.getAllInternalApis();
        for (const [name, apiObject] of Object.entries(internalApis)) {
            RuntimeAPIManager.registerAPI(name, apiObject);
        }
        console.log("Registered internal and external runtime APIs.");


        console.log("Verificando todos los scripts del proyecto...");
        clearUIConsole(); // Limpiar consola de la UI
        const allErrors = [];
        let mainGameJsCode = null;

        // 1. Encontrar todos los archivos .ces y .chc
        const cesFiles = [];
        async function findCesFiles(dirHandle, currentPath = '') {
            console.log(`Buscando en: ${currentPath || 'Assets'}`);
            for await (const entry of dirHandle.values()) {
                console.log(`  - Encontrado: ${entry.name} (Tipo: ${entry.kind})`);
                if (entry.kind === 'file' && (entry.name.endsWith('.ces') || entry.name.endsWith('.chc'))) {
                    console.log(`    -> ¡Script encontrado! Añadiendo a la lista.`);
                    cesFiles.push({ handle: entry, dir: dirHandle });
                } else if (entry.kind === 'directory') {
                    await findCesFiles(entry, `${currentPath}/${entry.name}`);
                }
            }
        }

        const projectName = new URLSearchParams(window.location.search).get('project') || 'TestProject';
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        // Escanear todo el proyecto para encontrar scripts
        await findCesFiles(projectHandle);

        if (cesFiles.length === 0) {
            console.log("No se encontraron scripts .ces. Iniciando el juego directamente.");
            originalStartGame(); // Usar la función original que guardamos
            return;
        }

        // 2. Transpilar cada archivo y recolectar errores
        const transpilationPromises = cesFiles.map(async ({ handle, dir }) => {
            const file = await handle.getFile();
            let code = await file.text();

            // Si es CHC, cargar el código generado de la meta
            if (handle.name.endsWith('.chc')) {
                try {
                    const metaHandle = await dir.getFileHandle(`${handle.name}.meta`);
                    const metaFile = await metaHandle.getFile();
                    const metaData = JSON.parse(await metaFile.text());
                    code = metaData.generatedCode;
                } catch (e) {
                    console.warn(`CHC script ${handle.name} no ha sido traducido aún. Omitiendo.`);
                    return;
                }
            }

            const result = CES_Transpiler.transpile(code, handle.name);

            if (result.errors && result.errors.length > 0) {
                allErrors.push({ fileName: handle.name, errors: result.errors });
            }
        });

        await Promise.all(transpilationPromises);


        // 3. Actuar según el resultado
        if (allErrors.length > 0) {
            if (gameWindow) {
                gameWindow.close();
                gameWindow = null;
            }
            console.error(`Build fallido. Se encontraron errores en ${allErrors.length} archivo(s):`);
            for (const fileErrors of allErrors) {
                console.error(`\n--- Errores en ${fileErrors.fileName} ---`);
                for (const error of fileErrors.errors) {
                    console.error(`  - ${error}`);
                }
            }
            // Cambiar a la pestaña de la consola para que los errores sean visibles
            dom.assetsPanel.querySelector('[data-tab="console-content"]').click();
        } else {
            console.log("✅ Build exitoso. Todos los scripts se compilaron sin errores.");
            // 4. Iniciar el juego. La lógica ahora está en startGame.
            originalStartGame();
        }
        } catch (e) {
            console.error("Error durante la preparación del juego:", e);
            showNotificationDialog('Error de Inicio', `No se pudo iniciar el juego: ${e.message}`);
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
                        if (component.setSourcePath.constructor.name === 'AsyncFunction') {
                            await component.setSourcePath(imgPath, projectsDirHandle);
                        } else {
                            component.setSourcePath(imgPath);
                            if (typeof component.loadSprite === 'function') {
                                await component.loadSprite(projectsDirHandle);
                            }
                        }
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
        // --- Fixed update (deterministic updates like physics-related logic) ---
        fixedAccumulator += deltaTime;
        while (fixedAccumulator >= FIXED_DELTA) {
            for (const materia of SceneManager.currentScene.getAllMaterias()) {
                if (!materia.isActive) continue;

                const scripts = materia.getComponents(Components.CreativeScript);
                for (const script of scripts) {
                    try {
                        script.fixedUpdate(FIXED_DELTA);
                    } catch (e) {
                        console.error(`Error en fixedUpdate() del script '${script.scriptName}' en el objeto '${materia.name}':`, e);
                    }
                }
            }
            fixedAccumulator -= FIXED_DELTA;
        }

        // Update physics (non-fixed as currently implemented)
        if (physicsSystem) {
            physicsSystem.update(deltaTime);
        }

        // Update all game objects scripts (frame-dependent)
        for (const materia of SceneManager.currentScene.getAllMaterias()) {
            if (!materia.isActive) continue;

            // The context is now handled automatically by the script instance itself.
            // No need to set it globally anymore.
            materia.update(deltaTime);
        }
    };

    updateScene = function(rendererInstance, isGameView) {
        if (!rendererInstance || !SceneManager.currentScene) return;

        // --- Pass 1: Draw Scene Geometry ---
        const materiasToRender = SceneManager.currentScene.getAllMaterias()
            .filter(m => m.getComponent(Components.Transform) && (m.getComponent(Components.SpriteRenderer) || m.getComponent(Components.TextureRender) || m.getComponent(Components.Terreno2D)))
            .sort((a, b) => {
                const rendererA = a.getComponent(Components.SpriteRenderer) || a.getComponent(Components.TextureRender) || a.getComponent(Components.Terreno2D);
                const rendererB = b.getComponent(Components.SpriteRenderer) || b.getComponent(Components.TextureRender) || b.getComponent(Components.Terreno2D);
                const orderA = rendererA.orderInLayer || 0;
                const orderB = rendererB.orderInLayer || 0;
                if (orderA !== orderB) return orderA - orderB;
                return a.getComponent(Components.Transform).y - b.getComponent(Components.Transform).y;
            });

        const tilemapsToRender = SceneManager.currentScene.getAllMaterias()
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.TilemapRenderer))
            .sort((a, b) => {
                const orderA = a.getComponent(Components.TilemapRenderer).orderInLayer || 0;
                const orderB = b.getComponent(Components.TilemapRenderer).orderInLayer || 0;
                return orderA - orderB;
            });

        const pointLights = SceneManager.currentScene.getAllMaterias()
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.PointLight2D));
        const spotLights = SceneManager.currentScene.getAllMaterias()
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpotLight2D));
        const freeformLights = SceneManager.currentScene.getAllMaterias()
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.FreeformLight2D));
        const spriteLights = SceneManager.currentScene.getAllMaterias()
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpriteLight2D));
        const canvasesToRender = SceneManager.currentScene.getAllMaterias()
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.Canvas));

        const drawObjects = (ctx, cameraForCulling, objectsToRender, tilemapsToDraw, canvasesToDraw) => {
            const aspect = rendererInstance.canvas.width / rendererInstance.canvas.height;
            const cameraViewBox = cameraForCulling ? MathUtils.getCameraViewBox(cameraForCulling, aspect) : null;
            const camTransform = cameraForCulling ? cameraForCulling.getComponent(Components.Transform) : null;
            const viewport = cameraViewBox ? MathUtils.getBoundsFromCorners(cameraViewBox) : null;

            // Consolidate all renderers for correct interleaving by orderInLayer
            const allInLayer = [...objectsToRender, ...tilemapsToDraw].sort((a, b) => {
                // 1. Manual DrawingOrder override
                const drawingOrderA = a.getComponent(Components.DrawingOrder);
                const drawingOrderB = b.getComponent(Components.DrawingOrder);
                const valA = drawingOrderA ? drawingOrderA.order : 0;
                const valB = drawingOrderB ? drawingOrderB.order : 0;
                if (valA !== valB) return valA - valB;

                // 2. Hierarchy relationship (Default: children on top of parents)
                if (a.isAncestorOf(b)) return -1; // a is parent, draw first (behind)
                if (b.isAncestorOf(a)) return 1;  // b is parent, draw first (behind)

                // 3. Renderer orderInLayer
                const rendererA = a.getComponent(Components.SpriteRenderer) || a.getComponent(Components.TextureRender) || a.getComponent(Components.TilemapRenderer) || a.getComponent(Components.Terreno2D) || a.getComponent(Components.Gyzmo);
                const rendererB = b.getComponent(Components.SpriteRenderer) || b.getComponent(Components.TextureRender) || b.getComponent(Components.TilemapRenderer) || b.getComponent(Components.Terreno2D) || b.getComponent(Components.Gyzmo);
                const orderA = rendererA ? (rendererA.orderInLayer || 0) : 0;
                const orderB = rendererB ? (rendererB.orderInLayer || 0) : 0;
                if (orderA !== orderB) return orderA - orderB;

                // 4. Y position (Isometric/Depth)
                const transformA = a.getComponent(Components.Transform);
                const transformB = b.getComponent(Components.Transform);
                return (transformA ? transformA.y : 0) - (transformB ? transformB.y : 0);
            });

            for (const materia of allInLayer) {
                if (!materia.isActive) continue;

                const spriteRenderer = materia.getComponent(Components.SpriteRenderer);
                const textureRender = materia.getComponent(Components.TextureRender);
                const terreno2D = materia.getComponent(Components.Terreno2D);
                const gyzmo = materia.getComponent(Components.Gyzmo);
                const tilemapRenderer = materia.getComponent(Components.TilemapRenderer);
                const transform = materia.getComponent(Components.Transform);
                const parallax = materia.getComponent(Components.Parallax);

                // --- Parallax Displacement ---
                let worldPosition = transform.position;
                if (parallax && camTransform) {
                     worldPosition = {
                         x: worldPosition.x + (camTransform.x * (1 - parallax.scrollFactor.x)) + parallax.offset.x + (parallax._autoOffset ? parallax._autoOffset.x : 0),
                         y: worldPosition.y + (camTransform.y * (1 - parallax.scrollFactor.y)) + parallax.offset.y + (parallax._autoOffset ? parallax._autoOffset.y : 0)
                     };
                }

                if (cameraForCulling) {
                    const objectBounds = MathUtils.getOOB(materia, worldPosition);
                    // Special culling for infinite parallax
                    if (!parallax || (parallax.mirroring.x === 0 && parallax.mirroring.y === 0)) {
                        if (objectBounds && !MathUtils.checkIntersection(cameraViewBox, objectBounds)) continue;
                    }
                    const cameraComponent = cameraForCulling.getComponent(Components.Camera);
                    const objectLayerBit = 1 << materia.layer;
                    if ((cameraComponent.cullingMask & objectLayerBit) === 0) continue;
                }

                if (spriteRenderer) {
                    if (spriteRenderer.sprite && spriteRenderer.sprite.complete && spriteRenderer.sprite.naturalWidth > 0) {
                        const img = spriteRenderer.sprite;
                        let sx = 0, sy = 0, sWidth = img.naturalWidth, sHeight = img.naturalHeight;
                        let pivotX = 0.5, pivotY = 0.5;

                        if (spriteRenderer.spriteSheet && spriteRenderer.spriteName && spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName]) {
                            const spriteData = spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName];
                            if (spriteData.rect && spriteData.rect.width > 0 && spriteData.rect.height > 0) {
                                sx = spriteData.rect.x;
                                sy = spriteData.rect.y;
                                sWidth = spriteData.rect.width;
                                sHeight = spriteData.rect.height;
                                pivotX = spriteData.pivot.x;
                                pivotY = spriteData.pivot.y;
                            }
                        }

                        const worldScale = transform.scale;
                        const worldRotation = transform.rotation;

                        const dWidth = sWidth * worldScale.x;
                        const dHeight = sHeight * worldScale.y;
                        const dx = -dWidth * pivotX;
                        const dy = -dHeight * pivotY;

                        ctx.save();
                        const opacity = typeof spriteRenderer.opacity === 'number' ? spriteRenderer.opacity : parseFloat(spriteRenderer.opacity || 1);
                        ctx.globalAlpha = isNaN(opacity) ? 1.0 : opacity;

                        const color = spriteRenderer.color || '#ffffff';
                        const isWhite = color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff';

                        let sourceImg = img;
                        let sourceSX = sx, sourceSY = sy, sourceSW = sWidth, sourceSH = sHeight;

                        if (!isWhite) {
                            scratchCanvas.width = Math.ceil(sWidth);
                            scratchCanvas.height = Math.ceil(sHeight);
                            scratchCtx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
                            scratchCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
                            scratchCtx.globalCompositeOperation = 'source-atop';
                            scratchCtx.fillStyle = color;
                            scratchCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);
                            scratchCtx.globalCompositeOperation = 'source-over';
                            sourceImg = scratchCanvas;
                            sourceSX = 0; sourceSY = 0;
                        }

                        const mirrorX = parallax ? parallax.mirroring.x : 0;
                        const mirrorY = parallax ? parallax.mirroring.y : 0;

                        if ((mirrorX > 0 || mirrorY > 0) && viewport) {
                            const stepX = mirrorX || dWidth;
                            const stepY = mirrorY || dHeight;
                            const startX = mirrorX > 0 ? Math.floor((viewport.left - worldPosition.x - dx) / stepX) * stepX : 0;
                            const endX = mirrorX > 0 ? Math.ceil((viewport.right - worldPosition.x - dx) / stepX) * stepX + stepX : dWidth;
                            const startY = mirrorY > 0 ? Math.floor((viewport.top - worldPosition.y - dy) / stepY) * stepY : 0;
                            const endY = mirrorY > 0 ? Math.ceil((viewport.bottom - worldPosition.y - dy) / stepY) * stepY + stepY : dHeight;

                            for (let tx = startX; tx < endX; tx += stepX) {
                                for (let ty = startY; ty < endY; ty += stepY) {
                                    ctx.save();
                                    ctx.translate(worldPosition.x + tx + dWidth / 2 + dx, worldPosition.y + ty + dHeight / 2 + dy);
                                    ctx.rotate(worldRotation * Math.PI / 180);
                                    ctx.drawImage(sourceImg, sourceSX, sourceSY, sourceSW, sourceSH, -dWidth / 2, -dHeight / 2, dWidth, dHeight);
                                    ctx.restore();
                                    if (mirrorY === 0) break;
                                }
                                if (mirrorX === 0) break;
                            }
                        } else {
                            ctx.translate(worldPosition.x, worldPosition.y);
                            ctx.rotate(worldRotation * Math.PI / 180);
                            ctx.drawImage(sourceImg, sourceSX, sourceSY, sourceSW, sourceSH, dx, dy, dWidth, dHeight);
                        }
                        ctx.restore();
                    } else {
                        // If there's a renderer but no sprite, draw a placeholder
                        const dWidth = 50 * transform.scale.x;
                        const dHeight = 50 * transform.scale.y;
                        const dx = -dWidth * 0.5;
                        const dy = -dHeight * 0.5;

                        ctx.save();
                        ctx.translate(worldPosition.x, worldPosition.y);
                        ctx.rotate(transform.rotation * Math.PI / 180);
                        const opacity = typeof spriteRenderer.opacity === 'number' ? spriteRenderer.opacity : parseFloat(spriteRenderer.opacity || 1);
                        ctx.globalAlpha = isNaN(opacity) ? 1.0 : opacity;

                        if (spriteRenderer.isError) {
                            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                            ctx.fillRect(dx, dy, dWidth, dHeight);
                            ctx.strokeStyle = 'red';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(dx, dy, dWidth, dHeight);
                        } else if (spriteRenderer.isLoading) {
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                            ctx.fillRect(dx, dy, dWidth, dHeight);
                            ctx.strokeStyle = 'white';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(dx, dy, dWidth, dHeight);
                        } else {
                            ctx.fillStyle = spriteRenderer.color || 'white';
                            ctx.fillRect(dx, dy, dWidth, dHeight);
                        }
                        ctx.restore();
                    }
                } else if (textureRender) {
                    const worldScale = transform.scale;
                    const worldRotation = transform.rotation;
                    const dWidth = textureRender.width * worldScale.x;
                    const dHeight = textureRender.height * worldScale.y;
                    const mirrorX = parallax ? parallax.mirroring.x : 0;
                    const mirrorY = parallax ? parallax.mirroring.y : 0;

                    const drawTex = (tx = 0, ty = 0) => {
                        ctx.save();
                        ctx.translate(worldPosition.x + tx, worldPosition.y + ty);
                        ctx.rotate(worldRotation * Math.PI / 180);
                        ctx.scale(worldScale.x, worldScale.y);
                        if (textureRender.texture && textureRender.texture.complete) {
                            const pattern = ctx.createPattern(textureRender.texture, 'repeat');
                            ctx.fillStyle = pattern;
                        } else {
                            ctx.fillStyle = textureRender.color;
                        }
                        if (textureRender.shape === 'Rectangle') {
                            ctx.fillRect(-textureRender.width / 2, -textureRender.height / 2, textureRender.width, textureRender.height);
                        } else if (textureRender.shape === 'Circle') {
                            ctx.beginPath(); ctx.arc(0, 0, textureRender.radius, 0, 2 * Math.PI); ctx.fill();
                        } else if (textureRender.shape === 'Triangle') {
                            ctx.beginPath(); ctx.moveTo(0, -textureRender.height / 2); ctx.lineTo(-textureRender.width / 2, textureRender.height / 2); ctx.lineTo(textureRender.width / 2, textureRender.height / 2); ctx.closePath(); ctx.fill();
                        } else if (textureRender.shape === 'Capsule') {
                            const width = textureRender.width, height = textureRender.height, radius = width / 2, rectHeight = height - width;
                            ctx.beginPath(); ctx.arc(0, -rectHeight / 2, radius, Math.PI, 0); ctx.lineTo(width / 2, rectHeight / 2); ctx.arc(0, rectHeight / 2, radius, 0, Math.PI); ctx.lineTo(-width / 2, -rectHeight / 2); ctx.closePath(); ctx.fill();
                        }
                        ctx.restore();
                    };

                    if ((mirrorX > 0 || mirrorY > 0) && viewport) {
                        const stepX = mirrorX || dWidth, stepY = mirrorY || dHeight;
                        const startX = mirrorX > 0 ? Math.floor((viewport.left - worldPosition.x + dWidth / 2) / stepX) * stepX : 0;
                        const endX = mirrorX > 0 ? Math.ceil((viewport.right - worldPosition.x + dWidth / 2) / stepX) * stepX + stepX : dWidth;
                        const startY = mirrorY > 0 ? Math.floor((viewport.top - worldPosition.y + dHeight / 2) / stepY) * stepY : 0;
                        const endY = mirrorY > 0 ? Math.ceil((viewport.bottom - worldPosition.y + dHeight / 2) / stepY) * stepY + stepY : dHeight;
                        for (let tx = startX; tx < endX; tx += stepX) {
                            for (let ty = startY; ty < endY; ty += stepY) {
                                drawTex(tx, ty);
                                if (mirrorY === 0) break;
                            }
                            if (mirrorX === 0) break;
                        }
                    } else {
                        drawTex();
                    }
                } else if (terreno2D) {
                    rendererInstance.drawTerreno2D(terreno2D);
                } else if (gyzmo) {
                    rendererInstance.drawGyzmo(gyzmo);
                }
            }

            // Draw tilemaps
            for (const materia of tilemapsToDraw) {
                if (!materia.isActive) continue;

                if (cameraForCulling) {
                    const objectBounds = MathUtils.getOOB(materia);
                    if (objectBounds && !MathUtils.checkIntersection(cameraViewBox, objectBounds)) continue;
                    const cameraComponent = cameraForCulling.getComponent(Components.Camera);
                    const objectLayerBit = 1 << materia.layer;
                    if ((cameraComponent.cullingMask & objectLayerBit) === 0) continue;
                }

                const tilemapRenderer = materia.getComponent(Components.TilemapRenderer);
                if (tilemapRenderer) {
                    rendererInstance.drawTilemap(tilemapRenderer);
                }
            }

            // Draw Canvases
            for (const materia of canvasesToDraw) {
                rendererInstance.drawCanvas(materia, isGameView);
            }
        };

        const drawAtmosphereAndLights = (lights) => {
            if (currentProjectConfig.rendererMode !== 'realista') {
                return;
            }

            const ambiente = SceneManager.currentScene.ambiente;
            rendererInstance.beginLights(ambiente.nocheDiaColor, ambiente.nocheDiaOpacidad);

            if (lights) {
                for (const lightMateria of lights.point) {
                    if (!lightMateria.isActive) continue;
                    const light = lightMateria.getComponent(Components.PointLight2D);
                    const transform = lightMateria.getComponent(Components.Transform);
                    rendererInstance.drawPointLight(light, transform);
                }
                for (const lightMateria of lights.spot) {
                    if (!lightMateria.isActive) continue;
                    const light = lightMateria.getComponent(Components.SpotLight2D);
                    const transform = lightMateria.getComponent(Components.Transform);
                    rendererInstance.drawSpotLight(light, transform);
                }
                for (const lightMateria of lights.freeform) {
                    if (!lightMateria.isActive) continue;
                    const light = lightMateria.getComponent(Components.FreeformLight2D);
                    const transform = lightMateria.getComponent(Components.Transform);
                    rendererInstance.drawFreeformLight(light, transform);
                }
                for (const lightMateria of lights.sprite) {
                    if (!lightMateria.isActive) continue;
                    const light = lightMateria.getComponent(Components.SpriteLight2D);
                    const transform = lightMateria.getComponent(Components.Transform);
                    rendererInstance.drawSpriteLight(light, transform);
                }
            }

            rendererInstance.endLights();
        };

        const allLights = {
            point: pointLights,
            spot: spotLights,
            freeform: freeformLights,
            sprite: spriteLights
        };

        const handleRender = (camera) => {
            rendererInstance.beginWorld(camera);

            const isRealista = currentProjectConfig.rendererMode === 'realista';
            const ambiente = SceneManager.currentScene.ambiente;
            const capasExcluidas = ambiente.capasExcluidas || [];

            if (isRealista) {
                // Separar objetos en filtrados y excluidos
                const filteredMaterias = materiasToRender.filter(m => !capasExcluidas.includes(m.layer));
                const excludedMaterias = materiasToRender.filter(m => capasExcluidas.includes(m.layer));

                const filteredTilemaps = tilemapsToRender.filter(m => !capasExcluidas.includes(m.layer));
                const excludedTilemaps = tilemapsToRender.filter(m => capasExcluidas.includes(m.layer));

                const filteredCanvases = canvasesToRender.filter(m => !capasExcluidas.includes(m.layer));
                const excludedCanvases = canvasesToRender.filter(m => capasExcluidas.includes(m.layer));

                // 1. Dibujar objetos que SÍ reciben el filtro/luces
                drawObjects(rendererInstance.ctx, camera, filteredMaterias, filteredTilemaps, filteredCanvases);

                // 2. Aplicar atmósfera y luces (multiplicar)
                drawAtmosphereAndLights(allLights);

                // 3. Dibujar objetos excluidos (encima de la oscuridad)
                drawObjects(rendererInstance.ctx, camera, excludedMaterias, excludedTilemaps, excludedCanvases);

            } else {
                drawObjects(rendererInstance.ctx, camera, materiasToRender, tilemapsToRender, canvasesToRender);
            }


            if (!isGameView) {
                SceneView.drawOverlay();
            }
            rendererInstance.end();
        };


        if (isGameView) {
            const cameras = SceneManager.currentScene.findAllCameras()
                .sort((a, b) => a.getComponent(Components.Camera).depth - b.getComponent(Components.Camera).depth);

            if (cameras.length === 0) {
                rendererInstance.clear();
                return;
            }
            cameras.forEach(handleRender);
        } else { // Editor Scene View
            handleRender(null);
        }
    }

    const editorLoop = (timestamp) => {
        frameCount++;
        // Calculate deltaTime
        if (lastFrameTime > 0) {
            deltaTime = (timestamp - lastFrameTime) / 1000;
            // Clamp deltaTime to 0.1s to avoid the "spiral of death" and massive physics jumps
            deltaTime = Math.min(deltaTime, 0.1);
        }
        lastFrameTime = timestamp;

        SceneView.update(); // Handle all editor input logic
        AmbienteControlWindow.update(deltaTime, isGameRunning);
        EngineAPI.CEEngine.update(deltaTime);
        if (uiSystem) {
            uiSystem.update(deltaTime);
        }

        if (isGameRunning) {
            // Update inspector values every 10 frames while playing
            if (frameCount % 10 === 0) {
                refreshInspectorValues();
            }
        }
        DebugPanel.update();

        // Update layouts before game logic and rendering
        runLayoutUpdate();

        // Update animators even in the editor, but ONLY for the selected object
        if (!isGameRunning && SceneManager.currentScene && selectedMateria) {
            // Update controller BEFORE animator so it can set the current animation for this frame
            const controller = selectedMateria.getComponent(Components.AnimatorController);
            if (controller && controller.isActive) {
                controller.update(deltaTime);
            }
            const animator = selectedMateria.getComponent(Components.Animator);
            if (animator && animator.isActive) {
                animator.update(deltaTime);
            }
        }


        // Ensure game canvas is always resized correctly when active
        if (activeView === 'game-content' && gameRenderer) {
            gameRenderer.resize();
        }

        if (isGameRunning && !isGamePaused) {
            runGameLoop();
            if (renderer) {
                updateScene(renderer, false);
            }
            if (gameRenderer) {
                gameRenderer.resize(); // Ensure canvas dimensions are correct
                updateScene(gameRenderer, true);
            }
        } else {
            if (activeView === 'scene-content' && renderer) {
                updateScene(renderer, false);
            } else if (activeView === 'game-content' && gameRenderer) {
                updateScene(gameRenderer, true);
            }
        }

        // Update InputManager at the very end of the frame
        InputManager.update();

        editorLoopId = requestAnimationFrame(editorLoop);
    };

    updateGameControlsUI = function() {
        if (isGameRunning) {
            dom.btnPlay.style.display = 'none';
            dom.btnPause.style.display = 'inline-block';
            dom.btnStop.style.display = 'inline-block';
            dom.btnPause.textContent = isGamePaused ? '▶️' : '⏸️';
        } else {
            dom.btnPlay.style.display = 'inline-block';
            dom.btnPause.style.display = 'none';
            dom.btnStop.style.display = 'none';
            isGamePaused = false;
        }
    };

    startGame = async function() {
        if (isGameRunning) return;

        const prefs = getPreferences();
        const executionMode = prefs.executionMode || 'integrated';

        if (executionMode === 'window') {
            console.log("[Editor] Initializing game in already opened external window...");

            if (!gameWindow) {
                // Fallback in case pre-opening failed or was skipped
                gameWindow = window.open('runner.html', 'CreativeEngineGame', 'width=800,height=600');
            }

            if (!gameWindow) {
                showNotificationDialog('Error', 'No se pudo abrir la ventana del juego. Por favor, desactiva el bloqueador de ventanas emergentes.');
                return;
            }

            // Wait for the runner to be ready
            await new Promise(resolve => {
                const onReady = () => {
                    window.removeEventListener('CE_EXTERNAL_RUNNER_READY', onReady);
                    resolve();
                };
                window.addEventListener('CE_EXTERNAL_RUNNER_READY', onReady);

                // Safety timeout
                setTimeout(() => {
                    window.removeEventListener('CE_EXTERNAL_RUNNER_READY', onReady);
                    resolve();
                }, 5000);
            });

            const externalCanvas = gameWindow.document.getElementById('game-canvas');
            if (externalCanvas) {
                gameRenderer.setCanvas(externalCanvas);
                InputManager.attachWindow(gameWindow);
                InputManager.setGameCanvas(externalCanvas);
                InputManager.setActiveCanvas(externalCanvas);
            }

            // Sync Stop if window is closed manually
            const checkWindowClosed = setInterval(() => {
                if (!gameWindow || gameWindow.closed) {
                    clearInterval(checkWindowClosed);
                    if (isGameRunning) {
                        console.log("[Editor] Game window closed manually. Stopping game...");
                        stopGame();
                    }
                }
            }, 500);
        }

        // --- ARCHITECTURE FIX: Instantiate a new PhysicsSystem for each play session ---
        // This guarantees a clean state and prevents any data leaks from previous runs.
        console.log("Creating new PhysicsSystem instance for the game session.");
        physicsSystem = new PhysicsSystem(SceneManager.currentScene);
        UISystem.initialize(SceneManager.currentScene);
        EngineAPI.CEEngine.initialize({ physicsSystem }); // Re-initialize the API with the new instance


        // 1. Tomar una "snapshot" de la escena actual antes de modificarla
        console.log("Creando snapshot de la escena antes de jugar...");
        sceneSnapshotBeforePlay = SceneManager.currentScene.clone();


        isGameRunning = true;
        // NO auto-cambiar a vista de juego - mantener vista actual
        // const gameViewButton = dom.scenePanel.querySelector('[data-view="game-content"]');
        // if (gameViewButton && activeView !== 'game-content') {
        //     gameViewButton.click();
        // }

        // Tell InputManager that the engine is running so it can default to the game canvas
        try { InputManager.setGameRunning(true); } catch(e) { /* ignore if not available */ }
        isGamePaused = false;
        lastFrameTime = performance.now();
        console.log("Game Started");

        try {
            if (SceneManager.currentScene) {
                for (const materia of SceneManager.currentScene.getAllMaterias()) {
                    if (materia.isActive) {
                        for (const ley of materia.leyes) {
                            if (ley instanceof Components.CreativeScript) {
                                await ley.initializeInstance();
                                if (ley.isInitialized) {
                                    try {
                                        ley.start();
                                    } catch (e) {
                                        console.error(`Error en start() del script '${ley.scriptName}' en '${materia.name}':`, e);
                                    }
                                    try {
                                        ley.onEnable();
                                    } catch (e) {
                                        console.error(`Error en onEnable() del script '${ley.scriptName}' en '${materia.name}':`, e);
                                    }
                                }
                            } else if (ley instanceof Components.AnimatorController) {
                                // AnimatorController needs explicit initialization
                                await ley.initialize(projectsDirHandle);
                            } else if (ley instanceof Components.Animator) {
                                // If there's no controller, the animator runs standalone.
                                if (!materia.getComponent(Components.AnimatorController)) {
                                    await ley.loadAnimationClip(projectsDirHandle);
                                }
                            } else if (ley instanceof Components.Terreno2D) {
                                await ley.loadTextures(projectsDirHandle);
                            } else {
                                // Generic start for other components (like AudioSource)
                                if (typeof ley.start === 'function') {
                                    try {
                                        await ley.start();
                                    } catch (e) {
                                        console.error(`Error en start() del componente ${ley.constructor.name} en '${materia.name}':`, e);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Un error crítico ocurrió durante la inicialización de los scripts:", error);
        } finally {
            // Ensure UI always updates, even if scripts fail
            updateGameControlsUI();
        }
    };

    stopGame = async function() {
        if (!isGameRunning) return;

        const prefs = getPreferences();
        if (gameWindow) {
            InputManager.detachWindow(gameWindow);
            if (prefs.autoCloseGameWindow !== false) {
                gameWindow.close();
            }
            gameWindow = null;
            // Restore original game canvas
            gameRenderer.setCanvas(dom.gameCanvas);
            InputManager.setGameCanvas(dom.gameCanvas);
        }

        isGameRunning = false;
        document.body.classList.remove('game-mode');
        // Restore InputManager out of game mode
        try { InputManager.setGameRunning(false); } catch(e) { /* ignore if not available */ }
        console.log("Game Stopped");

        // Notify scripts about disable/destroy so they can clean up
        try {
            for (const materia of SceneManager.currentScene.getAllMaterias()) {
                if (!materia.isActive) continue;
                const scripts = materia.getComponents(Components.CreativeScript);
                for (const script of scripts) {
                    try { script.onDisable(); } catch (e) { console.error(`Error en onDisable() del script '${script.scriptName}' en el objeto '${materia.name}':`, e); }
                    try { script.onDestroy(); } catch (e) { console.error(`Error en onDestroy() del script '${script.scriptName}' en el objeto '${materia.name}':`, e); }
                }
            }
        } catch(e) { console.warn('Error al notificar scripts sobre onDisable/onDestroy:', e); }

        // --- Scene Restoration Logic ---
        if (sceneSnapshotBeforePlay) {
            console.log("Restaurando la escena desde la snapshot...");
            SceneManager.setCurrentScene(sceneSnapshotBeforePlay);
            sceneSnapshotBeforePlay = null; // Clear the snapshot

            // --- UI Refresh ---
            updateHierarchy();
            selectMateria(null); // Deselect everything
            updateInspector();

            // Re-cargar assets para que sean visibles en el editor después de la restauración
            SceneManager.currentScene.loadAllAssets(projectsDirHandle).then(() => {
                console.log("Assets de la escena restaurada cargados.");
                updateScene(renderer, false);
            });

            console.log("Escena restaurada.");
        } else {
            console.warn("No se encontró una snapshot de la escena para restaurar. El estado del editor puede ser inconsistente.");
        }

        // --- ARCHITECTURE FIX: Destroy the old PhysicsSystem instance ---
        console.log("Destroying game session's PhysicsSystem instance.");
        physicsSystem = null;
        uiSystem = null;


        updateGameControlsUI();
    };


    function showContextMenu(menu, event) {
        hideContextMenus(); // Hide any other open menus
        if (!menu) {
            return;
        }
        menu.style.display = 'block';

        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let left = event.clientX;
        let top = event.clientY;

        // Adjust horizontal position
        if (left + menuWidth > windowWidth) {
            left = windowWidth - menuWidth - 5; // Subtract 5 for some padding
        }

        // Adjust vertical position
        if (top + menuHeight > windowHeight) {
            top = windowHeight - menuHeight - 5; // Subtract 5 for some padding
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
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

    const savePrefab = async () => {
        if (!isPrefabMode || !editingPrefabHandle) return;

        const rootMaterias = SceneManager.currentScene.getRootMaterias();
        if (rootMaterias.length === 0) return;

        // Serializamos el primer objeto raíz como el prefab
        const prefabData = SceneManager.serializeMateria(rootMaterias[0], true);

        try {
            const writable = await editingPrefabHandle.createWritable();
            await writable.write(JSON.stringify(prefabData, null, 2));
            await writable.close();
            console.log("Prefab guardado correctamente.");
            SceneManager.setSceneDirty(false);
        } catch (error) {
            console.error("Error al guardar prefab:", error);
            showNotificationDialog('Error', 'No se pudo guardar el prefab.');
        }
    };

    const enterPrefabMode = async (fileHandle) => {
        const proceed = await confirmSceneChange();
        if (!proceed) return;

        try {
            const file = await fileHandle.getFile();
            const content = await file.text();
            const prefabData = JSON.parse(content);

            // Save current scene state
            sceneSnapshotBeforePrefabMode = {
                scene: SceneManager.currentScene,
                handle: SceneManager.currentSceneFileHandle,
                name: dom.currentSceneName.textContent
            };

            // Create temporary scene for prefab
            const tempScene = new SceneManager.Scene();
            SceneManager.setCurrentScene(tempScene);

            const rootMateria = await SceneManager.instanciarPrefab(prefabData);
            if (renderer && renderer.camera) {
                renderer.camera.x = 0;
                renderer.camera.y = 0;
            }

            isPrefabMode = true;
            editingPrefabHandle = fileHandle;

            dom.currentSceneName.textContent = `Prefab: ${fileHandle.name.replace('.ceprefab', '')}`;
            document.body.classList.add('prefab-mode');
            dom.btnExitPrefab.classList.remove('hidden');
            if (dom.btnSavePrefab) dom.btnSavePrefab.classList.remove('hidden');

            updateHierarchy();
            selectMateria(rootMateria);
        } catch (e) {
            console.error("Error al entrar en modo prefab:", e);
            showNotificationDialog('Error', 'No se pudo abrir el prefab.');
        }
    };

    const exitPrefabMode = async () => {
        const proceed = await confirmSceneChange();
        if (!proceed) return;

        if (!isPrefabMode || !sceneSnapshotBeforePrefabMode) return;

        // Restore original scene
        SceneManager.setCurrentScene(sceneSnapshotBeforePrefabMode.scene);
        SceneManager.setCurrentSceneFileHandle(sceneSnapshotBeforePrefabMode.handle);
        dom.currentSceneName.textContent = sceneSnapshotBeforePrefabMode.name;

        isPrefabMode = false;
        editingPrefabHandle = null;
        sceneSnapshotBeforePrefabMode = null;

        document.body.classList.remove('prefab-mode');
        dom.btnExitPrefab.classList.add('hidden');
        if (dom.btnSavePrefab) dom.btnSavePrefab.classList.add('hidden');

        updateHierarchy();
        selectMateria(null);
    };

    saveScene = async function() {
        if (isPrefabMode) {
            await savePrefab();
            showNotificationDialog('Éxito', '¡Prefab guardado!');
            return;
        }
        if (!SceneManager.currentSceneFileHandle) {
            // If there's no handle, treat it as a "Save As..." operation
            try {
                const assetsHandle = await (await projectsDirHandle.getDirectoryHandle(new URLSearchParams(window.location.search).get('project'))).getDirectoryHandle('Assets');
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'NuevaEscena.ceScene',
                    startIn: assetsHandle,
                    types: [{ description: 'Creative Engine Scene', accept: { 'application/json': ['.ceScene'] } }]
                });

                // Now that we have a handle, we can proceed with the save.
                const writable = await fileHandle.createWritable();
                const sceneData = SceneManager.serializeScene(SceneManager.currentScene, dom);
                await writable.write(JSON.stringify(sceneData, null, 2));
                await writable.close();

                // Update the current scene context
                SceneManager.setCurrentSceneFileHandle(fileHandle);
                dom.currentSceneName.textContent = fileHandle.name.replace('.ceScene', '');
                SceneManager.setSceneDirty(false);
                showNotificationDialog('Éxito', '¡Escena guardada!');
                updateAssetBrowser(); // Refresh to show the new file
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error("Error en 'Guardar Como':", error);
                    showNotificationDialog('Error', 'No se pudo guardar la escena.');
                }
            }
        } else {
            // Regular save with an existing handle
            try {
                const writable = await SceneManager.currentSceneFileHandle.createWritable();
                const sceneData = SceneManager.serializeScene(SceneManager.currentScene, dom);
                await writable.write(JSON.stringify(sceneData, null, 2));
                await writable.close();
                SceneManager.setSceneDirty(false);
                showNotificationDialog('Éxito', '¡Escena guardada!');
            } catch (error) {
                console.error("Error al guardar la escena:", error);
                showNotificationDialog('Error', 'No se pudo guardar la escena.');
            }
        }
    };

    /**
     * Checks if the scene is dirty and asks the user to save if it is.
     * @returns {Promise<boolean>} True if the operation should proceed, false if cancelled.
     */
    async function confirmSceneChange() {
        if (!SceneManager.isSceneDirty) {
            return true;
        }
        return new Promise(resolve => {
            showConfirmationDialog(
                'Cambios sin Guardar',
                'La escena actual tiene cambios sin guardar. ¿Quieres guardarlos antes de continuar?',
                () => saveScene().then(() => resolve(true)), // Yes, save and continue
                () => resolve(true), // No, don't save but continue
                () => resolve(false) // Cancel
            );
        });
    }

    // --- 6. Event Listeners & Handlers ---
    let createNewScript; // To be defined

    function setupEventListeners() {
        // --- Global Dropdown (menu-item) Logic ---
        document.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.menu-item');
            const allMenuContents = document.querySelectorAll('.menu-content');

            if (menuItem) {
                const menuContent = menuItem.querySelector('.menu-content');
                if (menuContent) {
                    // Si se hizo clic en el botón principal, alternar visibilidad
                    if (e.target.closest('button')) {
                        const isVisible = menuContent.classList.contains('visible');
                        allMenuContents.forEach(mc => mc.classList.remove('visible'));
                        if (!isVisible) menuContent.classList.add('visible');
                        e.stopPropagation();
                        return;
                    }
                }
            }

            // Cerrar todos si se hace clic fuera o en una opción
            allMenuContents.forEach(mc => mc.classList.remove('visible'));
        });

        // --- Submenu dynamic positioning ---
        document.querySelectorAll('.context-menu .has-submenu').forEach(item => {
            item.addEventListener('mouseenter', e => {
                const submenu = e.currentTarget.querySelector('.submenu');
                if (!submenu) return;

                const parentRect = e.currentTarget.getBoundingClientRect();
                const submenuHeight = submenu.scrollHeight; // Get height even if hidden

                // Check if it would go off-screen
                if (parentRect.bottom + submenuHeight > window.innerHeight) {
                    submenu.classList.add('submenu-up');
                } else {
                    submenu.classList.remove('submenu-up');
                }
            });
        });

        // Centralized context menu click handler
        document.body.addEventListener('mousedown', (e) => {
            const target = e.target;
            if (e.button !== 0) return; // Only act on left clicks

            const menuItem = target.closest('[data-action]');
            const contextMenu = target.closest('.context-menu');

            if (menuItem && contextMenu) {
                e.stopPropagation(); // Stop propagation to prevent other listeners (like global deselection)
                const action = menuItem.dataset.action;

                if (menuItem.classList.contains('disabled')) {
                    return; // Do nothing if the item is disabled
                }

                console.log(`[Director] Acción de menú contextual detectada: '${action}'`);
                try {
                    if (contextMenu.id === 'context-menu') {
                        handleAssetContextMenuAction(action);
                    } else if (contextMenu.id === 'hierarchy-context-menu') {
                        handleHierarchyContextMenuAction(action);
                    } else {
                         console.warn(`[Director] No se encontró un manejador para el menú contextual con id '${contextMenu.id}'`);
                    }
                } catch (error) {
                    console.error(`[Director] ¡ERROR CRÍTICO! La acción '${action}' falló con una excepción:`, error);
                } finally {
                    hideContextMenus(); // Always hide the menu after an action
                }

            } else if (!contextMenu) {
                // If the click is outside any context menu, hide them all.
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

        // --- Console Listeners ---
        if (dom.btnClearConsole) {
            dom.btnClearConsole.addEventListener('click', () => clearUIConsole());
        }

        const consoleFilters = dom.consoleContent.querySelector('.console-filters');
        if (consoleFilters) {
            consoleFilters.addEventListener('click', (e) => {
                if (e.target.matches('.filter-btn')) {
                    const filter = e.target.dataset.filter;
                    consoleFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');

                    const messages = dom.consoleMessages.querySelectorAll('.console-msg');
                    messages.forEach(msg => {
                        let show = false;
                        if (filter === 'all') show = true;
                        else if (filter === 'system') show = msg.dataset.category === 'system';
                        else if (filter === 'warn') show = msg.classList.contains('log-warn');
                        else if (filter === 'error') show = msg.classList.contains('log-error');

                        msg.style.display = show ? 'block' : 'none';
                    });
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

        // --- Menubar Scene Actions ---
        dom.menuSaveScene.addEventListener('click', (e) => {
            e.preventDefault();
            saveScene();
        });

        dom.menuBuild.addEventListener('click', (e) => {
            e.preventDefault();
            buildProject(projectsDirHandle, currentProjectConfig);
        });

        dom.menuOpenScene.addEventListener('click', (e) => {
            e.preventDefault();
            openAssetSelector(async (fileHandle) => {
                const proceed = await confirmSceneChange();
                if (!proceed) return;

                const newSceneData = await SceneManager.loadScene(fileHandle, projectsDirHandle);
                if (newSceneData) {
                    SceneManager.setCurrentScene(newSceneData.scene);
                    SceneManager.setCurrentSceneFileHandle(newSceneData.fileHandle);
                    dom.currentSceneName.textContent = fileHandle.name.replace('.ceScene', '');
                    SceneManager.setSceneDirty(false);
                    updateHierarchy();
                    selectMateria(null);
                    updateAmbientePanelFromScene();
                }
            }, { filter: ['.ceScene'], title: 'Abrir Escena' });
        });

        dom.menuNewScene.addEventListener('click', async (e) => {
            e.preventDefault();
            const proceed = await confirmSceneChange();
            if (!proceed) return;

            try {
                const assetsHandle = await (await projectsDirHandle.getDirectoryHandle(new URLSearchParams(window.location.search).get('project'))).getDirectoryHandle('Assets');
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'NuevaEscena.ceScene',
                    startIn: assetsHandle,
                    types: [{ description: 'Creative Engine Scene', accept: { 'application/json': ['.ceScene'] } }]
                });
                const newScene = new SceneManager.Scene();
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(SceneManager.serializeScene(newScene, dom), null, 2));
                await writable.close();

                SceneManager.setCurrentScene(newScene);
                SceneManager.setCurrentSceneFileHandle(fileHandle);
                dom.currentSceneName.textContent = fileHandle.name.replace('.ceScene', '');
                SceneManager.setSceneDirty(false);
                updateHierarchy();
                selectMateria(null);
                updateAmbientePanelFromScene();
                updateAssetBrowser();
            } catch (error) {
                if (error.name !== 'AbortError') console.error("Error al crear la nueva escena:", error);
            }
        });

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
                    setTimeout(() => { renderer.resize(); try { InputManager.setActiveCanvas(renderer.canvas); } catch(e) {}} , 0);
                } else if (viewId === 'game-content' && gameRenderer) {
                    setTimeout(() => { gameRenderer.resize(); try { InputManager.setActiveCanvas(gameRenderer.canvas); } catch(e) {}} , 0);
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
            const menuItem = e.target.closest('a');
            if (!menuItem) return;

            const targetId = menuItem.id;
            let panelName = '';
            // A bit of a hacky way to get the panel name from the menu item id
            if (targetId.startsWith('menu-window-')) {
                panelName = targetId.substring('menu-window-'.length);
            } else {
                return;
            }

            // Unified panel toggle logic
            let panelId = `${panelName}-panel`;

            // Handle exceptions where panel ID doesn't match menu ID perfectly
            if (panelName === 'sprite-editor') panelId = 'sprite-slicer-panel';
            else if (panelName === 'verification-system') panelId = 'verification-system-panel';
            else if (panelName === 'tile-palette') panelId = 'tile-palette-panel';
            else if (panelName === 'asset-store') panelId = 'asset-store-panel';
            else if (panelName === 'ambiente-control') panelId = 'ambiente-control-panel';
            else if (panelName === 'animator') panelId = 'animator-controller-panel';

            const panel = document.getElementById(panelId);
            if (panel) {
                const isVisible = !panel.classList.contains('hidden');
                panel.classList.toggle('hidden', isVisible);

                // If it's a docked panel, update layout
                if (['assets', 'hierarchy', 'inspector'].includes(panelName)) {
                    panelVisibility[panelName] = !isVisible;
                    updateEditorLayout();
                }

                updateWindowMenuUI();
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

                showNotificationDialog('Diseño Restablecido', 'El diseño de los paneles ha sido restablecido.');
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
                        showNotificationDialog('Campo Obligatorio', `El campo '${element.previousElementSibling.textContent}' es obligatorio.`);
                        return;
                    }
                }
                if (dom.ksPassword.value.length < 6) {
                    showNotificationDialog('Contraseña Débil', 'La contraseña de la clave debe tener al menos 6 caracteres.');
                    return;
                }

                // Construct the dname
                const dname = `CN=${dom.ksCn.value}, OU=${dom.ksOu.value}, O=${dom.ksO.value}, L=${dom.ksL.value}, ST=${dom.ksSt.value}, C=${dom.ksC.value}`;

                // Construct the command
                const command = `keytool -genkey -v -keystore ${dom.ksFilename.value} -alias ${dom.ksAlias.value} -keyalg RSA -keysize 2048 -validity ${dom.ksValidity.value * 365} -storepass ${dom.ksStorepass.value} -keypass ${dom.ksPassword.value} -dname "${dname}"`;

                dom.ksCommandTextarea.value = command;
                dom.ksCommandOutput.classList.remove('hidden');

                showNotificationDialog('Comando Generado', 'Comando generado. Cópialo y ejecútalo en una terminal con JDK instalado para crear tu archivo keystore.');
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


        if (dom.btnOpenAssetStoreExt) {
            dom.btnOpenAssetStoreExt.addEventListener('click', () => {
                const iframe = dom.assetStorePanel.querySelector('iframe');
                if (iframe && iframe.src) {
                    window.open(iframe.src, '_blank');
                }
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

        // --- Carl IA Menubar Button ---
        // Listener handled in Carl IA Panel Logic section

        // --- Terminal Logic --- is now handled by the Terminal module

        // --- Carl IA Panel Logic ---
        if (dom.carlIaPanel) {
            const brainSelectorMenu = dom.carlIaPanel.querySelector('#carl-ia-brain-options');
            const brainButton = dom.carlIaBrainSelectorBtn;
            const messagesDiv = dom.carlIaMessages;
            const input = dom.carlIaInput;
            const sendBtn = dom.carlIaSendBtn;

            let selectedProvider = null;
            let knownWorkingModel = {}; // Cache for working models, e.g., { gemini: 'models/gemini-1.5-flash' }

            const CARL_SYSTEM_PROMPT = `Eres Carl, el asistente inteligente de Creative Engine. Tu personalidad es alegre, servicial y apasionada por ayudar en la creación de videojuegos. Siempre te presentas como Carl. Tu misión es asistir al usuario en sus tareas, proponiendo soluciones y explicando paso a paso cómo lograr sus visiones en el motor.

Eres un experto en el lenguaje de scripting del motor (CES/CHC), que ahora soporta una sintaxis moderna en español y potentes características de videojuegos. Aquí tienes tu guía de referencia técnica:

0. IMPORTACIONES:
- Usa 've motor;' al principio para habilitar atajos.
- Usa 've motor.ui;' para trabajar con la interfaz de usuario.

1. SINTAXIS EN ESPAÑOL:
- Control: si, sino, mientras, para, retornar.
- Tipos: variable, constante, verdadero, falso, materia, mtr, numero, texto, booleano, Color, Vector2, Prefab.

2. CORRUTINAS Y TIEMPO:
- esperar(segundos): Pausa la ejecución sin bloquear el motor.
- cada(segundos) { ... }: Bloque para lógica periódica.

3. ACCESO IMPLÍCITO (No necesitas 'this.'):
- mtr / materia: El objeto actual.
- nombre, tag: Propiedades del objeto actual.
- posicion, fisica, animador, camara, fuenteDeAudio.
- colisionador2d: Acceso genérico a colisionadores (Box/Capsule).
- particulas: Sistema de partículas.
- ui.texto, ui.boton, ui.imagen, lienzo: Acceso rápido a UI.

4. EVENTOS AUTOMÁTICOS:
- alEmpezar(), alActualizar(delta), alEntrarEnColision(otro), alEntrarEnTrigger(otro), alRecibir(mensaje, datos).

5. FUNCIONES DE PODER:
- buscar(nombre): Encuentra objetos.
- lanzarRayo(origen, direccion, distancia, tag): Raycast.
- crear prefab: Instancia un prefab (ej: crear miprefab).
- destruir(objeto), difundir(mensaje, datos), danar(mtr, cant), curar(mtr, cant).

Si el usuario te pide algo, usa siempre esta sintaxis en español para tus ejemplos de código, ya que es más amigable. Siempre anima al usuario y recuérdale que tú estás aquí para ayudarle a convertir sus sueños en realidad. Habla siempre en el idioma que el usuario te hable.`;

            const updateCarlIaBrainMenu = () => {
                const prefs = getPreferences();
                brainSelectorMenu.querySelectorAll('[data-external]').forEach(el => el.remove());

                if (prefs.ai && prefs.ai.provider !== 'none') {
                    const provider = prefs.ai.provider;
                    const apiKey = localStorage.getItem(`creativeEngine_${provider}_apiKey`);
                    if (apiKey) {
                        const newOption = document.createElement('a');
                        newOption.href = '#';
                        newOption.dataset.model = provider;
                        newOption.dataset.external = true;
                        const displayName = provider.charAt(0).toUpperCase() + provider.slice(1);
                        newOption.textContent = `${displayName} (Preferencias)`;
                        brainSelectorMenu.appendChild(newOption);

                        // Auto-select if nothing selected
                        if (!selectedProvider) {
                             selectedProvider = { type: provider, name: `${displayName} (Preferencias)` };
                             brainButton.textContent = `Cerebro: ${selectedProvider.name}`;
                        }
                    }
                }
            };

            dom.menubarCarlIaBtn.addEventListener('click', () => {
                updateCarlIaBrainMenu();
                dom.carlIaPanel.classList.toggle('hidden');

                // If it's the first time opening or it's empty, add a welcoming message from Carl
                if (!dom.carlIaPanel.classList.contains('hidden') && messagesDiv.children.length <= 1) {
                    const hasWelcome = Array.from(messagesDiv.querySelectorAll('div')).some(d => d.textContent.includes("Soy Carl"));
                    if (!hasWelcome && selectedProvider) {
                         addMessage("¡Hola! Soy Carl, tu asistente de Creative Engine. ¿En qué puedo ayudarte a construir hoy?", 'ia');
                    }
                }
            });

            const viewSelectorMenu = dom.carlIaPanel.querySelector('#carl-ia-view-selector-btn + .menu-content');
            const viewButton = dom.carlIaViewSelectorBtn;

            brainSelectorMenu.parentElement.addEventListener('click', (e) => {
                if (e.target.matches('a')) {
                    e.preventDefault();
                    const modelType = e.target.dataset.model;
                    const modelName = e.target.textContent;
                    selectedProvider = { type: modelType, name: modelName };
                    brainButton.textContent = `Cerebro: ${modelName}`;
                    messagesDiv.innerHTML = `<div style="font-style: italic; color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">Cerebro '${modelName}' activado. <br><br><b>¡Hola! Soy Carl</b>, tu asistente. ¿En qué puedo ayudarte hoy?</div>`;
                    brainSelectorMenu.classList.remove('visible');
                }
            });

            if (viewSelectorMenu) {
                viewSelectorMenu.parentElement.addEventListener('click', (e) => {
                    if (e.target.matches('a')) {
                        e.preventDefault();
                        const view = e.target.dataset.view;
                        const viewName = e.target.textContent;

                        viewButton.textContent = viewName;

                        // Switch active state in menu
                        viewSelectorMenu.querySelectorAll('.carl-view-option').forEach(a => a.classList.remove('active'));
                        e.target.classList.add('active');

                        // Switch visible view
                        const views = dom.carlIaPanel.querySelectorAll('.carl-view');
                        views.forEach(v => v.classList.remove('active'));

                        const targetView = dom.carlIaPanel.querySelector(`#carl-ia-${view}-view`);
                        if (targetView) targetView.classList.add('active');

                        viewSelectorMenu.classList.remove('visible');
                    }
                });
            }

            const addMessage = (text, sender, isError = false) => {
                const messageWrapper = document.createElement('div');
                messageWrapper.className = `carl-message-wrapper ${sender}`;
                messageWrapper.style.display = 'flex';
                messageWrapper.style.alignItems = 'flex-end';
                messageWrapper.style.marginBottom = '12px';
                messageWrapper.style.maxWidth = '90%';

                const msgDiv = document.createElement('div');
                msgDiv.className = `carl-message-bubble carl-message-${sender} ${isError ? 'error' : ''}`;
                msgDiv.textContent = text;
                msgDiv.style.padding = '10px 14px';
                msgDiv.style.borderRadius = '18px';
                msgDiv.style.lineHeight = '1.4';
                msgDiv.style.position = 'relative';
                msgDiv.style.wordBreak = 'break-word';

                if (sender === 'user') {
                    messageWrapper.style.alignSelf = 'flex-end';
                    msgDiv.style.background = 'linear-gradient(135deg, #0e639c, #007acc)';
                    msgDiv.style.color = 'white';
                    msgDiv.style.borderBottomRightRadius = '4px';
                    msgDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    messageWrapper.appendChild(msgDiv);
                } else { // 'ia'
                    messageWrapper.style.alignSelf = 'flex-start';
                    const avatar = document.createElement('img');
                    avatar.src = 'https://raw.githubusercontent.com/CarleyInteractiveStudio/Carley-Interactive-Studio/main/carley_foto_web/Carl_model.jpeg';
                    avatar.style.width = '32px';
                    avatar.style.height = '32px';
                    avatar.style.borderRadius = '50%';
                    avatar.style.marginRight = '10px';
                    avatar.style.border = '2px solid rgba(255,255,255,0.2)';
                    messageWrapper.appendChild(avatar);

                    msgDiv.style.background = isError ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)';
                    msgDiv.style.color = isError ? '#ff8888' : 'white';
                    msgDiv.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                    msgDiv.style.backdropFilter = 'blur(5px)';
                    msgDiv.style.borderBottomLeftRadius = '4px';
                    messageWrapper.appendChild(msgDiv);
                }
                messagesDiv.appendChild(messageWrapper);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            };

            const sendMessage = async () => {
                const userPrompt = input.value.trim();
                if (!userPrompt) return;

                const prefs = getPreferences();

                // If nothing selected but prefs have AI, auto-sync
                if (!selectedProvider && prefs.ai?.provider !== 'none') {
                    const provider = prefs.ai.provider;
                    const displayName = provider.charAt(0).toUpperCase() + provider.slice(1);
                    selectedProvider = { type: provider, name: `${displayName} (Preferencias)` };
                    brainButton.textContent = `Cerebro: ${selectedProvider.name}`;
                }

                if (!selectedProvider) {
                    showNotificationDialog('Sin Cerebro Seleccionado', 'Por favor, elige un cerebro en el menú o configura Carl IA en Preferencias antes de enviar un mensaje.');
                    return;
                }

                addMessage(userPrompt, 'user');
                input.value = '';
                input.focus();

                if (selectedProvider.type === 'carl-v1') {
                     addMessage("Carl V1 está actualmente en mantenimiento cerebral. Por favor, usa un modelo externo (Gemini/OpenAI/Claude) configurándolo en Preferencias.", 'ia', true);
                     return;
                }

                const provider = selectedProvider.type;
                const apiKey = localStorage.getItem(`creativeEngine_${provider}_apiKey`);

                if (!apiKey) {
                    addMessage(`No puedo conectar con ${selectedProvider.name}. Por favor, asegúrate de haber configurado tu API Key correctamente en el panel de Preferencias.`, 'ia', true);
                    return;
                }

                const executeApiCall = async (model, prompt) => {
                    addMessage("...", 'ia');
                    const thinkingMessage = messagesDiv.lastElementChild;
                    const result = await AIHandler.callGenerativeAI(provider, model, apiKey, prompt, CARL_SYSTEM_PROMPT);
                    if (thinkingMessage) thinkingMessage.remove();

                    if (result.success) {
                        addMessage(result.text, 'ia', false);
                        knownWorkingModel[provider] = model;
                        return { status: 'success', error: null, code: 200 };
                    }

                    addMessage(result.error, 'ia', true);
                    return { status: 'failed', code: result.code, error: result.error };
                };

                // Determine best model to use
                let modelToUse = knownWorkingModel[provider];
                if (!modelToUse) {
                    // Try Preferences first
                    if (prefs.ai?.provider === provider && prefs.ai?.model) {
                        modelToUse = prefs.ai.model;
                    } else {
                        // Fallback defaults
                        if (provider === 'gemini') modelToUse = 'models/gemini-1.5-flash';
                        else if (provider === 'openai') modelToUse = 'gpt-3.5-turbo';
                        else if (provider === 'anthropic') modelToUse = 'claude-3-haiku-20240307';
                    }
                }

                let result = await executeApiCall(modelToUse, userPrompt);

                const isAccessError = (result.code === 404 || result.code === 400 || (result.error && (result.error.includes("Quota") || result.error.includes("not found"))));
                if (result.status === 'failed' && isAccessError) {
                    console.warn(`El modelo por defecto '${modelToUse}' falló. Buscando un modelo compatible...`);
                    addMessage(`El modelo por defecto no funcionó. Buscando uno compatible para ti...`, 'ia', true);

                    const modelsResult = await AIHandler.listModels(provider, apiKey);
                    if (modelsResult.success && modelsResult.models.length > 0) {
                        // Filtering is specific to Gemini for now, for others we just take what we have
                        const generativeModels = provider === 'gemini' ?
                            modelsResult.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent") && !m.id.includes('embedding')) :
                            modelsResult.models;

                        let suitableModel = generativeModels.find(m => m.id.includes('flash') || m.name.toLowerCase().includes('flash'));
                        if (!suitableModel && generativeModels.length > 0) {
                            suitableModel = generativeModels[0];
                        }

                        if (suitableModel) {
                            const modelId = suitableModel.id;
                            const displayName = modelId.includes('/') ? modelId.split('/')[1] : modelId;

                            console.log(`Modelo compatible encontrado: ${modelId}. Reintentando...`);
                            addMessage(`¡Encontré un modelo compatible! Usando '${displayName}'. Reintentando...`, 'ia', false);
                            await executeApiCall(modelId, userPrompt);
                        } else {
                            addMessage("No pude encontrar un modelo de chat compatible en la lista de tu API key.", 'ia', true);
                        }
                    } else {
                        addMessage("No pude listar los modelos disponibles para tu API key. Revisa la consola.", 'ia', true);
                        console.error("Error al listar modelos:", modelsResult.error);
                    }
                }
            };

            sendBtn.addEventListener('click', sendMessage);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
    }

    function updateAmbientePanelFromScene() {
        if (!SceneManager.currentScene || !SceneManager.currentScene.ambiente) return;

        const ambiente = SceneManager.currentScene.ambiente;

        if (dom.ambienteFiltroColor) {
            dom.ambienteFiltroColor.value = ambiente.nocheDiaColor || '#0a0a28';
        }

        if (dom.ambienteTiempo) {
            dom.ambienteTiempo.value = ambiente.hora || '6';
            const val = parseFloat(dom.ambienteTiempo.value);
            const hour = Math.floor(val);
            const minutes = Math.floor((val % 1) * 60);
            if (dom.ambienteTiempoValor) dom.ambienteTiempoValor.textContent = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }

        if (dom.ambienteNocheDiaIntensidad) {
            const intensidad = ambiente.nocheDiaIntensidad !== undefined ? ambiente.nocheDiaIntensidad : 1.0;
            dom.ambienteNocheDiaIntensidad.value = intensidad;
            if (dom.ambienteNocheDiaIntensidadValor) dom.ambienteNocheDiaIntensidadValor.textContent = `${Math.round(intensidad * 100)}%`;
        }

        if (dom.ambienteCicloAutomatico) {
            dom.ambienteCicloAutomatico.checked = ambiente.cicloAutomatico || false;
        }

        if (dom.ambienteDuracionDia) {
            dom.ambienteDuracionDia.value = ambiente.duracionDia || '60';
        }

        if (dom.ambienteFiltroSwatches && dom.ambienteFiltroColor) {
            dom.ambienteFiltroSwatches.querySelectorAll('.color-swatch').forEach(s => {
                s.classList.toggle('active', s.dataset.color === dom.ambienteFiltroColor.value);
            });
        }
    }

    // --- 7. Initial Setup ---
    async function initializeEditor() {
        // Inject editor logic into engine components for editor mode
        Components.setEditorLogic({
            getTranspiledCode: (name) => CES_Transpiler.getTranspiledCode(name),
            getAllMetadata: () => CES_Transpiler.getAllMetadata(),
            getComponentDefinition: (name) => getCustomComponentDefinitions().get(name)
        });
        SceneManager.setCustomComponentProvider(getCustomComponentDefinitions());

        // Expose SceneManager globally for modules that need it (like InspectorWindow)
        window.SceneManager = SceneManager;
        window.Materia = Materia;
        window.MateriaFactory = { ...MateriaFactory };
        window.Components = Components;
        window.updateHierarchy = updateHierarchy;
        window.selectMateria = selectMateria;
        window.updateInspector = updateInspector;
        window.openAssetSelector = openAssetSelector;
        window.setActiveTool = SceneView.setActiveTool;
        window.CES_Transpiler = CES_Transpiler;
        window.TerrenoEditorWindow = TerrenoEditorWindow;
        window.AnimationEditorWindow = AnimationEditorWindow;
        window.TilePalette = TilePalette;

        // --- For Playwright Testing ---
        // This exposes a safe subset of the HierarchyWindow module for programmatic UI creation in tests
        globalThis.HierarchyWindow = { handleContextMenuAction: handleHierarchyContextMenuAction };


        // --- 7a. Cache DOM elements, including the new loading panel ---

        // --- 7b. Loading Progress Helper ---
        const updateLoadingProgress = (percentage, message) => {
            if (dom.progressBar) dom.progressBar.style.width = `${percentage}%`;
            if (dom.loadingStatusMessage) dom.loadingStatusMessage.textContent = message;
            console.log(`Loading: ${percentage}% - ${message}`);
        };


        // --- 7d. Main Initialization Logic with Progress Updates ---
        try {
            RuntimeAPIManager.clearAPIs(); // Limpiar APIs de sesiones anteriores
            updateLoadingProgress(5, "Conectando a la base de datos local...");
            await openDB();

            updateLoadingProgress(10, "Accediendo al directorio de proyectos...");
            projectsDirHandle = await getDirHandle();
            window.projectsDirHandle = projectsDirHandle;
            if (!projectsDirHandle) {
                console.warn("No directory handle found. Entering test/limited mode.");
                // This allows the editor to initialize for Playwright tests
                // without a pre-existing IndexedDB entry.
            }
            const projectName = new URLSearchParams(window.location.search).get('project') || 'TestProject';
            dom.projectNameDisplay.textContent = `Proyecto: ${projectName}`;

            if (projectsDirHandle) {
                // Ensure the 'lib' directory exists for the current project
                const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

                updateLoadingProgress(12, "Compilando scripts del proyecto...");
                await scanAndTranspileAllScripts(projectHandle);

                try {
                    const libDirHandle = await projectHandle.getDirectoryHandle('lib', { create: true });
                    console.log("Directorio 'lib' asegurado. Verificando README...");

                    // --- Create README.md in /lib if it doesn't exist ---
                    try {
                        await libDirHandle.getFileHandle('README.md', { create: false });
                        // File exists, do nothing.
                    } catch (e) {
                    // File does not exist, so we create it.
                    console.log("Creando README.md para librerías...");
                    const readmeContent = `
# Guía para la Creación y Gestión de Librerías

Esta carpeta \`/lib\` contiene todas las librerías (.celib) de tu proyecto.

## ¿Qué es una Librería?

Una librería es un paquete autocontenido que puede extender la funcionalidad del editor de Creative Engine o proporcionar nuevas funciones para tus scripts de juego (.ces).

---

## Gestión de Librerías

### Activación y Desactivación
- **Para activar o desactivar una librería**, abre el panel "Librerías" desde el menú superior del editor.
- Cada librería en la lista tiene un botón de estado (Activar/Desactivar).
- Cuando desactivas una librería, el motor crea un archivo \`.celib.meta\` para guardar su estado. La librería no se cargará la próxima vez que inicies el editor.
- **Importante:** Debes reiniciar el editor para que los cambios de activación/desactivación surtan efecto.

### Importación
- Puedes importar librerías arrastrando un archivo \`.celib\` directamente a cualquier parte del "Navegador de Assets" del editor. El archivo se moverá automáticamente a esta carpeta \`/lib\`.
- También puedes usar el botón "Importar" en el panel de "Librerías".

### Exportación
- Para compartir tus librerías, puedes seleccionarlas en el panel "Librerías" y usar el botón "Exportar". Esto creará un archivo \`.cep\` que otros pueden importar.

---

## Creación de Librerías (API)

Las librerías se crean a partir de un único archivo JavaScript. Para una guía detallada y ejemplos de código, haz clic en el botón **"Documentación API"** en el panel de "Librerías" dentro del editor.

A continuación, un resumen rápido:

### 1. Registrar una Ventana en el Editor

Para que tu librería tenga una interfaz en el editor, usa \`CreativeEngine.API.registrarVentana\`.

\`\`\`javascript
(function() {
    CreativeEngine.API.registrarVentana({
        nombre: "Mi Herramienta",
        alAbrir: function(panel) {
            panel.agregarTexto("¡Hola, mundo!");
            panel.agregarBoton("Saludar", () => showNotificationDialog('Saludo', '¡Hola!'));
        }
    });
})();
\`\`\`

### 2. Exponer Funciones a los Scripts (.ces)

Si quieres que tus scripts de juego puedan usar funciones de tu librería, el script de la librería debe devolver un objeto.

\`\`\`javascript
// mi-libreria.js
return {
    sumar: function(a, b) {
        return a + b;
    },
    generarNumeroAleatorio: function(max) {
        return Math.floor(Math.random() * max);
    }
};
\`\`\`

Luego, en tu script \`.ces\`, puedes usar estas funciones con \`go\`.

\`\`\`ces
// mi-script.ces
go "MiLibreria"

public start() {
    variable resultado = sumar(10, 5);
    consola.imprimir("El resultado es: " + resultado); // Imprime 15
}
\`\`\`
`;
                    const readmeFileHandle = await libDirHandle.getFileHandle('README.md', { create: true });
                    const writable = await readmeFileHandle.createWritable();
                    await writable.write(readmeContent);
                    await writable.close();
                }
                // --- End of README creation ---


                for await (const entry of libDirHandle.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.celib')) {
                        // Check for activation status via .meta file
                        let isActive = true; // Active by default
                        try {
                            const metaFileHandle = await libDirHandle.getFileHandle(`${entry.name}.meta`);
                            const metaFile = await metaFileHandle.getFile();
                            const metaContent = await metaFile.text();
                            const metaData = JSON.parse(metaContent);
                            if (metaData.active === false) {
                                isActive = false;
                            }
                        } catch (e) {
                            // Meta file doesn't exist or is invalid, assume active. This is the default.
                        }

                        if (!isActive) {
                            console.log(`Librería '${entry.name}' está inactiva. Omitiendo.`);
                            continue; // Skip to the next library
                        }

                        // If active, proceed with loading...
                        try {
                            const file = await entry.getFile();
                            const content = await file.text();
                            const libData = JSON.parse(content);

                            let grantedPermissions = {};
                            try {
                                const metaFileHandle = await libDirHandle.getFileHandle(`${entry.name}.meta`);
                                const metaFile = await metaFileHandle.getFile();
                                const metaContent = await metaFile.text();
                                const metaData = JSON.parse(metaContent);
                                grantedPermissions = metaData.permissions || {};
                            } catch (e) {
                                console.warn(`No se encontró o no se pudo leer el archivo .meta para la librería '${libData.name}'. No se concederán permisos.`);
                            }

                            const scriptContent = decodeURIComponent(escape(atob(libData.script_base64)));
                            const engineAPI = EngineAPI.getEngineAPI();

                            // --- API SANDBOXING ---
                            const sandboxedApi = {
                                API: {}
                            };

                            if (grantedPermissions.can_create_windows) {
                                sandboxedApi.API.registrarVentana = window.CreativeEngine.API.registrarVentana;
                            }
                            if (grantedPermissions.allow_custom_components) {
                                sandboxedApi.API.registrarComponente = engineAPI.registrarComponente;
                            }
                            // Add other permission checks here as the API expands

                            // 1. Handle API for creating windows (Editor-side)
                            if (Object.keys(sandboxedApi.API).length > 0) {
                                try {
                                    const setupFunction = new Function('CreativeEngine', 'engine', scriptContent);
                                    setupFunction(sandboxedApi, sandboxedApi.API);
                                    console.log(`Librería de UI '${libData.name}' cargada y configurada con permisos limitados.`);
                                } catch(e) {
                                     console.error(`Error ejecutando el script de configuración de UI para ${libData.name}:`, e);
                                }
                            }

                            // 2. Handle API for game scripts (Runtime)
                            if (grantedPermissions.runtime_accessible) {
                                try {
                                    const apiObject = (new Function('engine', scriptContent))(engineAPI);

                                    if (apiObject && typeof apiObject === 'object') {
                                        RuntimeAPIManager.registerAPI(libData.name, apiObject);
                                        const fileNameWithoutExt = entry.name.replace('.celib', '');
                                        if (libData.name !== fileNameWithoutExt) {
                                            RuntimeAPIManager.registerAPI(fileNameWithoutExt, apiObject);
                                        }
                                    }
                                } catch(e) {
                                    console.error(`Error al evaluar el script de runtime para ${libData.name}:`, e);
                                }
                            }

                        } catch (e) {
                            console.error(`Error al cargar la librería ${entry.name}:`, e);
                        }
                    }
                }
            } catch (libError) {
                console.error("No se pudo crear o verificar el directorio 'lib':", libError);
            }
        }

            updateLoadingProgress(20, "Inicializando renderizadores...");
            renderer = new Renderer(dom.sceneCanvas, true);
            gameRenderer = new Renderer(dom.gameCanvas, false, true); // isGameView = true
            window.renderer = renderer; // Expose after initialization

            updateLoadingProgress(30, "Cargando escena principal...");
            // Only initialize scene from file system if handle is available
            if (projectsDirHandle) {
                const sceneData = await SceneManager.initialize(projectsDirHandle);
                if (sceneData) {
                    SceneManager.setCurrentScene(sceneData.scene);
                    SceneManager.setCurrentSceneFileHandle(sceneData.fileHandle);
                    dom.currentSceneName.textContent = sceneData.fileHandle.name.replace('.ceScene', '');
                    SceneManager.setSceneDirty(false);
                } else {
                    throw new Error("¡Fallo crítico! No se pudo cargar o crear una escena.");
                }
            } else {
                // In test/no-handle mode, create a default empty scene
                SceneManager.setCurrentScene(new SceneManager.Scene());
                dom.currentSceneName.textContent = 'Escena de Prueba';
                SceneManager.setSceneDirty(false);
            }

            updateLoadingProgress(40, "Activando sistema de físicas...");
            physicsSystem = new PhysicsSystem(SceneManager.currentScene);
            EngineAPI.CEEngine.initialize({ physicsSystem }); // Pass physics system to the API
            InputManager.initialize(dom.sceneCanvas, dom.gameCanvas);
            UISystem.initialize(SceneManager.currentScene);


            // --- Define Callbacks & Helpers ---
            const getSelectedAsset = () => selectedAsset;
            const extractFramesAndCreateAsset = async (assetPath, metaData, animName, dirHandle) => {
                try {
                    const frames = await extractFramesFromSheet(assetPath, metaData);
                    const animationData = {
                        name: animName,
                        frames: frames,
                        frameRate: 10,
                        loop: true
                    };
                    const fileName = `${animName}.cea`;
                    await createAsset(fileName, JSON.stringify(animationData, null, 2), dirHandle);
                    updateAssetBrowser();
                    showNotificationDialog('Éxito', `Animación '${animName}' creada correctamente.`);
                } catch (error) {
                    console.error("Error al extraer frames:", error);
                    showNotificationDialog('Error', "No se pudo crear la animación.");
                }
            };
            const onAssetSelected = (assetName, assetPath, assetKind) => {
                if (assetName) {
                    // When an asset is selected, deselect any Materia
                    selectMateria(null);
                    selectedAsset = { name: assetName, path: assetPath, kind: assetKind };
                } else {
                    selectedAsset = null;
                }
                // Always update the inspector to reflect the change (or lack of selection)
                updateInspector();
            };
            enterAddTilemapLayerMode = function() {
                SceneView.enterAddLayerMode();
            };

            const onAssetOpened = async (name, fileHandle, dirHandle, options = {}) => {
                if (options.openIn === 'SpriteSlicer') {
                    SpriteSlicer.open(fileHandle, dirHandle, saveAssetMeta);
                    return;
                }

                const lowerName = name.toLowerCase();
                const extension = lowerName.split('.').pop();

                // Handle Markdown files with the dedicated viewer
                if (extension === 'md' || lowerName === 'readme') {
                    console.log(`Opening Markdown asset: ${name}`);
                    try {
                        const file = await fileHandle.getFile();
                        const content = await file.text();
                        // Use the full path passed from the options
                        openMarkdownViewerCallback(options.path, content);
                    } catch (e) {
                        console.error(`Error reading Markdown file ${name}:`, e);
                        showNotificationDialog("Error", `Could not read file: ${name}`);
                    }
                    return;
                }

                // Handle other text-based files with the code editor
                const textExtensions = ['ces', 'chc', 'js', 'json', 'txt', 'html', 'css'];
                if (textExtensions.includes(extension) || lowerName === 'license') {
                    console.log(`Opening text-based asset: ${name}`);
                    await CodeEditor.openScriptInEditor(name, dirHandle, dom.scenePanel);
                    return;
                }

                // Handle other specific asset types
                switch (extension) {
                    case 'cea':
                        console.log(`Opening animation asset: ${name}`);
                        AnimationEditorWindow.openAnimationAsset(fileHandle, dirHandle);
                        break;
                    case 'cepalette':
                        console.log(`Opening tile palette: ${name}`);
                        TilePalette.openPalette(fileHandle);
                        break;
                    case 'ceanim':
                        console.log(`Opening animation controller: ${name}`);
                        openAnimatorController(fileHandle, dirHandle);
                        break;
                    case 'ceui':
                        console.log(`Opening UI asset: ${name}`);
                        openUiAsset(fileHandle);
                        break;
                    case 'ceprefab':
                        enterPrefabMode(fileHandle);
                        break;
                    case 'cescene':
                        (async () => {
                            const proceed = await confirmSceneChange();
                            if (!proceed) return;

                            const newSceneData = await SceneManager.loadScene(fileHandle, projectsDirHandle);
                            if (newSceneData) {
                                SceneManager.setCurrentScene(newSceneData.scene);
                                SceneManager.setCurrentSceneFileHandle(newSceneData.fileHandle);
                                dom.currentSceneName.textContent = name.replace('.ceScene', '');
                                SceneManager.setSceneDirty(false);
                                updateHierarchy();
                                selectMateria(null);
                                updateAmbientePanelFromScene();
                            }
                        })();
                        break;
                    case 'png':
                    case 'jpg':
                    case 'jpeg':
                        SpriteSlicer.open(fileHandle, dirHandle, saveAssetMeta);
                        break;
                    default:
                        console.log(`No double-click action defined for file: ${name}`);
                        break;
                }
            };
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
            const packageExporter = initializeImportExport({ dom, exportContext, getCurrentDirectoryHandle, updateAssetBrowser, projectsDirHandle });
            const showConsole = () => {
                const consoleTab = dom.assetsPanel.querySelector('[data-tab="console-content"]');
                if (consoleTab) {
                    consoleTab.click();
                }
            };
            window._CodeEditor = CodeEditor; // Expose for testing
            CodeEditor.initialize(dom, showConsole, hotReloadScript);
            SpriteSlicer.initialize({
                dom: dom,
                openAssetSelectorCallback: openAssetSelector,
                saveAssetMetaCallback: saveAssetMeta,
                createAssetCallback: createAsset,
                updateAssetBrowserCallback: updateAssetBrowser,
                getAssetsDirectoryHandle: async () => {
                    const projectName = new URLSearchParams(window.location.search).get('project');
                    const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
                    return await projectHandle.getDirectoryHandle('Assets');
                }
            });
            DebugPanel.initialize({ dom, InputManager, SceneManager, getActiveTool, getSelectedMateria, getIsGameRunning, getDeltaTime });
            SceneView.initialize({ dom, renderer, InputManager, getSelectedMateria, selectMateria, updateInspectorCallback: updateInspector, Components, updateScene, SceneManager, getPreferences, getSelectedTile: TilePalette.getSelectedTile, setPaletteActiveTool: TilePalette.setActiveTool });
            Terminal.initialize(dom, projectsDirHandle);

            updateLoadingProgress(60, "Aplicando preferencias...");
            initializePreferences(dom, CodeEditor.saveCurrentScript);
            initializeProjectSettings(dom, projectsDirHandle, currentProjectConfig, getPreferences);
            AnimationEditorWindow.initializeAnimationEditor({ dom, projectsDirHandle, getCurrentDirectoryHandle, updateWindowMenuUI });
            initializeAnimatorController({ dom, projectsDirHandle, updateWindowMenuUI });

            // Provide saveProjectConfig to the DOM for modular access
            dom.saveProjectConfig = saveProjectConfigFromModule;

            updateLoadingProgress(70, "Construyendo interfaz...");
            initializeHierarchy({ dom, SceneManager, projectsDirHandle, selectMateriaCallback: selectMateria, showContextMenuCallback: showContextMenu, getSelectedMateria: () => selectedMateria, updateInspector });
            const libraryModule = initializeLibraryWindow(dom, projectsDirHandle, packageExporter.exportLibrariesAsPackage);

            MarkdownViewerWindow.initialize({
                dom: dom,
                saveAssetCallback: saveAssetContentCallback
            });

            const assetBrowserCallbacks = {
                onAssetSelected,
                onAssetOpened,
                onShowContextMenu: showContextMenu,
                onExportPackage,
                createUiSystemFile,
                updateAssetBrowser,
                refreshLibraryList: libraryModule.refreshLibraryList,
                openLibraryDetails: libraryModule.openLibraryDetails // Pass the new function
            };
            window._onAssetOpened = onAssetOpened; // Expose for testing
            initializeInspector({ dom, projectsDirHandle, currentDirectoryHandle: getCurrentDirectoryHandle, getSelectedMateria: () => selectedMateria, getSelectedAsset, openAssetSelectorCallback: openAssetSelector, saveAssetMetaCallback: saveAssetMeta, extractFramesFromSheetCallback: extractFramesAndCreateAsset, updateSceneCallback: () => updateScene(renderer, false), getCurrentProjectConfig: () => currentProjectConfig, showdown, updateAssetBrowserCallback: updateAssetBrowser, createAssetCallback: createAsset, onAssetOpened, enterAddTilemapLayerMode });
            initializeAssetBrowser({ dom, projectsDirHandle, exportContext, ...assetBrowserCallbacks });
            TilePalette.initialize({ dom, projectsDirHandle, openAssetSelectorCallback: openAssetSelector, setActiveToolCallback: SceneView.setActiveTool });
            VerificationSystem.initialize({ dom });
            TerrenoEditorWindow.initialize({ dom, updateInspector });
            AmbienteControlWindow.initialize({
                dom,
                editorRenderer: renderer,
                gameRenderer: gameRenderer,
                SceneManager,
                currentProjectConfig
            });

            // Initialize all runtime APIs through the central manager
            // EngineAPI.initialize({
            //     physicsSystem,
            //     dom,
            //     editorRenderer: renderer,
            //     gameRenderer: gameRenderer,
            //     iniciarCiclo: AmbienteControlWindow.iniciarCiclo,
            //     detenerCiclo: AmbienteControlWindow.detenerCiclo
            // });


            updateLoadingProgress(80, "Cargando configuración del proyecto...");
            if (projectsDirHandle) {
                await loadProjectConfig();
            } else {
                // In test mode, populate with a full default config to prevent errors
                const defaultConfig = {
                    appName: 'TestProject',
                    authorName: 'Test Author',
                    appVersion: '1.0.0',
                    rendererMode: 'canvas2d',
                    showEngineLogo: true,
                    keystore: { path: '', pass: '', alias: '', aliasPass: '' },
                    iconPath: '',
                    splashLogos: [],
                    layers: { sortingLayers: ['Default'], collisionLayers: ['Default'] },
                    tags: ['Untagged']
                };
                currentProjectConfig = defaultConfig;
                window.currentProjectConfig = currentProjectConfig;
                populateProjectSettingsUI(defaultConfig, null);
            }

            updateLoadingProgress(85, "Actualizando paneles...");
            updateHierarchy();
            updateInspector();
            await updateAssetBrowser();
            updateWindowMenuUI();
            updateAmbientePanelFromScene(); // Sync UI on initial load

            updateLoadingProgress(90, "Finalizando...");
            setupEventListeners();
            initializeFloatingPanels();
            editorLoopId = requestAnimationFrame(editorLoop);

            const oldPlayButton = document.getElementById('btn-play');
            const newPlayButton = oldPlayButton.cloneNode(true);
            oldPlayButton.parentNode.replaceChild(newPlayButton, oldPlayButton);
            dom.btnPlay = newPlayButton;

            dom.btnPlay.addEventListener('click', runChecksAndPlay);
            dom.btnPause.addEventListener('click', () => {
                isGamePaused = !isGamePaused;
                console.log(isGamePaused ? "Game Paused" : "Game Resumed");
                updateGameControlsUI();
            });
            dom.btnStop.addEventListener('click', stopGame);
            dom.btnExitPrefab.addEventListener('click', exitPrefabMode);
            if (dom.btnSavePrefab) {
                dom.btnSavePrefab.addEventListener('click', async () => {
                    await savePrefab();
                    showNotificationDialog('Éxito', '¡Prefab guardado!');
                });
            }


            originalStartGame = startGame;
            startGame = runChecksAndPlay;

            updateLoadingProgress(100, "¡Listo!");

            // Update the RuntimeAPIManager with the loaded APIs
            const runtimeAPIs = LibraryAPI.getRuntimeAPIs();
            if (runtimeAPIs) {
                for (const [name, apiObject] of Object.entries(runtimeAPIs)) {
                    RuntimeAPIManager.registerAPI(name, apiObject);
                }
            }

            // Final step: Populate library windows menu
            const windowMenu = document.getElementById('window-menu-content');
            const registeredWindows = LibraryAPI.getRegisteredWindows();
            if (registeredWindows.length > 0) {
                const hr = document.createElement('hr');
                windowMenu.appendChild(hr);

                registeredWindows.forEach(win => {
                    const menuItem = document.createElement('a');
                    menuItem.href = '#';
                    menuItem.textContent = win.nombre;
                    menuItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        const panel = LibraryAPI.crearPanel({ titulo: win.nombre });
                        win.alAbrir(panel);
                    });
                    windowMenu.appendChild(menuItem);
                });
            }

            // Fade out the loading screen and show the editor
            setTimeout(() => {
                dom.loadingOverlay.classList.add('hidden');
                dom.editorContainer.style.display = 'flex';

                // Force a resize of the renderers now that the canvas is visible
                if (renderer) renderer.resize();
                if (gameRenderer) gameRenderer.resize();

                // --- Habilitar el botón de Play y marcar el editor como listo ---
                dom.btnPlay.disabled = false;
                isEditorReady = true;
                window.editorInitialized = true; // Signal for Playwright tests

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
