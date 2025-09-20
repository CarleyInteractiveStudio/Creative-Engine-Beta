// Re-syncing with GitHub to ensure latest changes are deployed.
// --- CodeMirror Integration ---
import { InputManager } from './engine/Input.js';
import { WebGLRenderer } from './engine/WebGLRenderer.js';
import * as SceneManager from './engine/SceneManager.js';
import { Renderer } from './engine/Renderer.js';
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
            materiaToSelect = SceneManager.currentScene.findMateriaById(materiaOrId);
        } else {
            materiaToSelect = materiaOrId;
        }

        if (selectedMateria === materiaToSelect) return;
        selectedMateria = materiaToSelect;

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
            } else if (SceneManager.currentScene) {
                saveScene();
                console.log("Escena guardada (Ctrl+S).");
            }
            return;
        }

        if (!e.ctrlKey && !e.altKey) {
            switch (e.key.toLowerCase()) {
                case 'q': setActiveTool('move'); break;
                case 'w': setActiveTool('pan'); break;
                case 'e': setActiveTool('scale'); break;
                case 'r': setActiveTool('rotate'); break;
                case 'delete':
                case 'backspace':
                    if (selectedMateria) {
                        const idToDelete = selectedMateria.id;
                        selectMateria(null);
                        SceneManager.currentScene.removeMateria(idToDelete);
                        updateHierarchy();
                        updateInspector();
                    }
                    break;
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
        } catch (error) {
            console.warn("No se encontró 'project.ceconfig'. Creando uno nuevo con valores por defecto.");
            currentProjectConfig = {
                appName: 'MiJuego',
                authorName: 'Un Creador',
                appVersion: '1.0.0',
                engineVersion: '0.1.0-beta',
                renderingEngine: 'canvas2d',
                iconPath: '',
                splashLogos: [],
                showEngineLogo: true,
                keystore: { path: '', pass: '', alias: '', aliasPass: '' },
                layers: {
                    sortingLayers: ['Default', 'UI'],
                    collisionLayers: ['Default', 'Player', 'Enemy', 'Ground']
                },
                tags: ['Untagged']
            };
        }
        if (!currentProjectConfig.layers) {
            currentProjectConfig.layers = { sortingLayers: ['Default', 'UI'], collisionLayers: ['Default', 'Player', 'Enemy', 'Ground'] };
        }
        if (!currentProjectConfig.tags) {
            currentProjectConfig.tags = ['Untagged'];
        }
        populateProjectSettingsUI(currentProjectConfig);
    };

    openSpriteSelector = async function(componentName, propertyName) {
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
        await findImages(projectHandle, '');

        imageFiles.forEach(imgPath => {
            const img = document.createElement('img');
            getURLForAssetPath(imgPath, projectsDirHandle).then(url => { if(url) img.src = url; });
            img.addEventListener('click', async () => {
                if (selectedMateria) {
                    const ComponentClass = Components[componentName];
                    if (!ComponentClass) return;

                    const component = selectedMateria.getComponent(ComponentClass);
                    if (component) {
                        if (propertyName === 'source' && typeof component.setSourcePath === 'function') {
                            component.setSourcePath(imgPath);
                        } else if (propertyName === 'normalSource' && typeof component.setNormalSourcePath === 'function') {
                            component.setNormalSourcePath(imgPath);
                        }

                        if(typeof component.loadSprite === 'function') {
                            await component.loadSprite(projectsDirHandle);
                        }

                        updateInspector();
                        const activeRenderer = activeView === 'game-content' ? gameRenderer : renderer;
                        updateScene(activeRenderer, activeView === 'game-content');
                    }
                }
                dom.spriteSelectorModal.classList.remove('is-open');
            });
            grid.appendChild(img);
        });
    };

    updateScene = function(rendererInstance, isGameView) {
        if (!rendererInstance || !SceneManager.currentScene) return;

        if (rendererInstance.gl) {
            const materiasToRender = SceneManager.currentScene.getAllMaterias()
                .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpriteRenderer) && m.isActive);

            const lightsToRender = SceneManager.currentScene.getAllMaterias()
                .filter(m => m.getComponent(Components.Light) && m.isActive);

            let camera = isGameView ? SceneManager.currentScene.findMainCamera() : rendererInstance.camera;
            if (isGameView && !camera) {
                const cameras = SceneManager.currentScene.findAllCameras();
                camera = cameras.length > 0 ? cameras[0] : { x: 0, y: 0, zoom: 1.0, effectiveZoom: 1.0 };
            }

            rendererInstance.drawScene(materiasToRender, lightsToRender, camera, {});

            if (!isGameView) {
                SceneView.drawOverlay();
            }
            return;
        }

        // Canvas 2D Path
        const materiasToRender = SceneManager.currentScene.getAllMaterias()
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpriteRenderer) && m.isActive)
            .sort((a, b) => a.getComponent(Components.Transform).y - b.getComponent(Components.Transform).y);

        const drawObjects = (ctx, cameraForCulling) => {
            // ... (existing canvas 2d drawing logic)
        };

        if (isGameView) {
            // ... (existing canvas 2d game view logic)
        } else { // Editor Scene View
            rendererInstance.beginWorld();
            drawObjects(rendererInstance.ctx, null);
            SceneView.drawOverlay();
            rendererInstance.end();
        }
    }

    const editorLoop = (timestamp) => {
        if (lastFrameTime > 0) {
            deltaTime = (timestamp - lastFrameTime) / 1000;
        }
        lastFrameTime = timestamp;

        InputManager.update();
        SceneView.update();
        DebugPanel.update();

        if (isGameRunning) {
            // ... game loop logic
        }

        if (activeView === 'scene-content' && renderer) {
            updateScene(renderer, false);
        } else if (activeView === 'game-content' && gameRenderer) {
            updateScene(gameRenderer, true);
        }

        requestAnimationFrame(editorLoop);
    };

    async function initializeEditor() {
        // --- 7a. Cache DOM elements ---
        const ids = [
            'editor-container', 'menubar', 'editor-main-content', 'hierarchy-panel', 'hierarchy-content',
            'scene-panel', 'scene-content', 'inspector-panel', 'assets-panel', 'assets-content', 'console-content',
            'project-name-display', 'debug-content', 'context-menu', 'hierarchy-context-menu', 'anim-node-context-menu',
            'preferences-modal', 'add-component-modal', 'component-list', 'sprite-selector-modal',
            'sprite-selector-grid', 'asset-folder-tree', 'asset-grid-view', 'project-settings-modal', 'settings-app-name',
            'settings-author-name', 'settings-app-version', 'settings-engine-version', 'project-settings-rendering-engine',
            'settings-icon-preview', 'settings-icon-picker-btn', 'settings-logo-list', 'settings-add-logo-btn', 'settings-show-engine-logo',
            'settings-save-btn', 'engine-logo-confirm-modal', 'confirm-disable-logo-btn', 'cancel-disable-logo-btn',
            'prefs-save-btn', 'loading-overlay', 'loading-status-message', 'progress-bar', 'loading-error-section', 'loading-error-message',
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
        };

        try {
            updateLoadingProgress(10, "Accediendo al directorio de proyectos...");
            await openDB();
            projectsDirHandle = await getDirHandle();
            if (!projectsDirHandle) throw new Error("Directorio de proyectos no encontrado.");

            const projectName = new URLSearchParams(window.location.search).get('project');
            dom.projectNameDisplay.textContent = `Proyecto: ${projectName}`;

            // Initialize settings and preferences modules FIRST
            updateLoadingProgress(20, "Inicializando módulos de configuración...");
            initializeProjectSettings(dom, projectsDirHandle, currentProjectConfig);
            initializePreferences(dom, () => {});

            // Load config to know which renderer to use
            updateLoadingProgress(30, "Cargando configuración del proyecto...");
            await loadProjectConfig();

            // Initialize renderers based on config
            updateLoadingProgress(40, "Inicializando renderizadores...");
            const rendererType = currentProjectConfig.renderingEngine || 'canvas2d';
            console.log(`Usando motor de renderizado: ${rendererType}`);
            if (rendererType === 'webgl') {
                renderer = new WebGLRenderer(dom.sceneCanvas, true);
                gameRenderer = new WebGLRenderer(dom.gameCanvas);
            } else {
                renderer = new Renderer(dom.sceneCanvas, true);
                gameRenderer = new Renderer(dom.gameCanvas);
            }

            // Load Scene
            updateLoadingProgress(50, "Cargando escena principal...");
            const sceneData = await SceneManager.initialize(projectsDirHandle);
            if (sceneData) {
                SceneManager.setCurrentScene(sceneData.scene);
            } else {
                throw new Error("No se pudo cargar o crear una escena.");
            }

            // Initialize remaining systems
            updateLoadingProgress(60, "Activando sistemas del editor...");
            InputManager.initialize(dom.sceneCanvas);
            const getSelectedMateria = () => selectedMateria;
            const getActiveTool = () => SceneView.getActiveTool ? SceneView.getActiveTool() : 'move';

            SceneView.initialize({ dom, renderer, InputManager, getSelectedMateria, selectMateria, updateInspector, Components, SceneManager });
            initializeHierarchy({ dom, SceneManager, selectMateriaCallback: selectMateria, getSelectedMateria });
            initializeInspector({ dom, projectsDirHandle, getSelectedMateria, openSpriteSelectorCallback: openSpriteSelector, getCurrentProjectConfig });
            initializeAssetBrowser({ dom, projectsDirHandle, onShowContextMenu: () => {} });

            updateLoadingProgress(80, "Construyendo interfaz...");
            updateHierarchy();
            updateInspector();
            await updateAssetBrowser();

            updateLoadingProgress(100, "¡Listo!");
            dom.loadingOverlay.style.display = 'none';
            dom.editorContainer.style.display = 'flex';
            if (renderer) renderer.resize();
            if (gameRenderer) gameRenderer.resize();

            requestAnimationFrame(editorLoop);

        } catch (error) {
            console.error("Fallo la inicialización del editor:", error);
        }
    }

    initializeEditor();
});
