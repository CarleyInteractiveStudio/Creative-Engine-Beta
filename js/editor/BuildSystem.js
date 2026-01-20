
import * as CES_Transpiler from './CES_Transpiler.js';

// Polyfills for browser environment
window.process = { browser: true, env: { NODE_ENV: 'production' } };
window.Buffer = require('buffer').Buffer;

let buildModal = null;
let projectsDirHandle = null;
let outputDirHandle = null;
let selectedBuildFormat = 'html5';
let draggedItem = null;

// --- UI Element Cache ---
const ui = {};

// --- Helper Functions ---
function updateProgress(percentage, message) {
    if (ui.progressBar) {
        ui.progressBar.style.width = `${percentage}%`;
        ui.progressBar.textContent = `${Math.round(percentage)}%`;
    }
    if (ui.statusMessage) ui.statusMessage.textContent = message;
    console.log(`[Build] ${percentage}% - ${message}`);
}

function _handleBuildError(error, userMessage) {
    console.error("Error durante el proceso de build:", error);
    updateProgress(100, `¡Error! ${userMessage}`);
    if (ui.progressBar) ui.progressBar.style.backgroundColor = 'var(--color-danger)';
}

const getAssetType = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const typeMap = {
        'png': 'images', 'jpg': 'images', 'jpeg': 'images', 'gif': 'images',
        'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio',
        'mp4': 'videos', 'webm': 'videos',
        'ttf': 'fonts', 'otf': 'fonts',
        'cescene': 'scenes', 'json': 'data',
    };
    return typeMap[extension] || 'data';
};

// --- Core Build Logic (Refactored) ---

async function performBuild() {
    const scenesInBuildItems = Array.from(ui.scenesToIncludeList.children)
        .filter(el => el.classList.contains('scene-item')); // Ensure placeholder is not counted

    if (scenesInBuildItems.length === 0) {
        _handleBuildError(new Error("No scenes in build"), "Añade al menos una escena a la lista 'Escenas a Incluir'.");
        return;
    }
    if (!outputDirHandle) {
        _handleBuildError(new Error("No output directory selected"), "Por favor, selecciona una carpeta de destino.");
        return;
    }

    updateProgress(0, 'Iniciando build...');
    ui.progressBar.style.backgroundColor = 'var(--color-accent)';

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

        updateProgress(5, 'Recolectando assets y dependencias...');
        const { buildAssetList, scenesInBuild } = await gatherAllRequiredAssets(projectHandle, scenesInBuildItems);

        updateProgress(20, 'Transpilando scripts a JavaScript...');
        const transpiledScripts = await transpileAllScripts(buildAssetList);

        updateProgress(40, 'Empaquetando el motor y los scripts del juego...');
        const bundledCode = await bundleCode(scenesInBuild[0].path, transpiledScripts);

        updateProgress(60, 'Ofuscando el código del juego...');
        const obfuscatedCode = obfuscateCode(bundledCode);

        if (selectedBuildFormat === 'html5') {
            await buildForWeb({ projectName, outputDirHandle, scenesInBuild, buildAssetList, obfuscatedCode });
        } else {
            // Placeholder for .wapp build
            throw new Error(".wapp format not implemented yet");
        }

        updateProgress(100, '¡Build completado exitosamente!');

    } catch (error) {
        _handleBuildError(error, error.message || "Ocurrió un error desconocido.");
    }
}

async function gatherAllRequiredAssets(projectHandle, sceneItems) {
    const allAssets = new Map();
    const assetsDirHandle = await projectHandle.getDirectoryHandle('Assets');

    async function scan(dirHandle, path) {
        for await (const entry of dirHandle.values()) {
            const newPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file') {
                allAssets.set(newPath, { name: entry.name, handle: entry, path: newPath, content: null });
            } else if (entry.kind === 'directory') {
                await scan(await dirHandle.getDirectoryHandle(entry.name), newPath);
            }
        }
    }
    await scan(assetsDirHandle, '');

    const scenesInBuild = sceneItems.map(item => allAssets.get(item.dataset.path));
    if (scenesInBuild.some(s => s === undefined)) {
        throw new Error("Una de las escenas en la lista de build no pudo ser encontrada en el proyecto.");
    }

    const requiredAssets = new Set(scenesInBuild.map(s => s.path));

    const assetPathRegex = /"filePath":\s*"([^"]+)"/g;

    for (const sceneAsset of scenesInBuild) {
        const file = await sceneAsset.handle.getFile();
        const content = await file.text();
        sceneAsset.content = content;

        let match;
        while ((match = assetPathRegex.exec(content)) !== null) {
            requiredAssets.add(match[1]);
        }
    }

    return {
        buildAssetList: Array.from(requiredAssets).map(path => allAssets.get(path)).filter(Boolean),
        scenesInBuild
    };
}


async function transpileAllScripts(buildAssetList) {
    const transpiledScripts = new Map();
    for (const asset of buildAssetList) {
        if (asset.name.endsWith('.ces')) {
            const file = await asset.handle.getFile();
            const content = await file.text();
            const result = CES_Transpiler.transpile(content, asset.name);
            if (result.errors && result.errors.length > 0) {
                throw new Error(`Error de sintaxis en ${asset.name}: ${result.errors.join(', ')}`);
            }
            transpiledScripts.set(asset.path, result.jsCode);
        }
    }
    return transpiledScripts;
}

async function fetchAllEngineFiles() {
    const engineFiles = [
        './js/engine.js',
        './js/engine/AssetUtils.js',
        './js/engine/CEEngine.js',
        './js/engine/Components.js',
        './js/engine/Input.js',
        './js/engine/Leyes.js',
        './js/engine/Materia.js',
        './js/engine/MathUtils.js',
        './js/engine/Physics.js',
        './js/engine/Renderer.js',
        './js/engine/RuntimeAPIManager.js',
        './js/engine/SceneManager.js',
        './js/engine/UITransformUtils.js',
        './js/engine/ui/UISystem.js',
        './js/engine/ComponentRegistry.js',
        './js/engine/InputAPI.js',
        './js/engine/SceneAPI.js',
    ];

    const fileContents = new Map();
    const promises = engineFiles.map(path =>
        fetch(path)
            .then(res => {
                if (!res.ok) throw new Error(`No se pudo cargar el archivo del motor: ${path}`);
                return res.text();
            })
            .then(content => fileContents.set(path, content))
    );

    await Promise.all(promises);
    return fileContents;
}


async function bundleCode(startScenePath, transpiledScripts) {
    return new Promise(async (resolve, reject) => {
        const entryPointContent = `
            const { Engine } = require('./js/engine.js');
            window.GameScripts = require('virtual-game-scripts');

            class GameRunner {
                constructor(canvasId) {
                    this.canvas = document.getElementById(canvasId);
                    if (!this.canvas) throw new Error(\`Canvas with id '\${canvasId}' not found\`);

                    this.renderer = new Engine.Renderer(this.canvas, false, true);
                    this.sceneManager = Engine.SceneManager;
                    this.inputManager = Engine.InputManager;
                    this.physicsSystem = null; // To be initialized with scene

                    this.inputManager.initialize(this.canvas, this.canvas);
                }

                async loadAndRunScene(scenePath) {
                    try {
                        const sceneData = await this.sceneManager.loadSceneFromFile(scenePath);
                        this.sceneManager.setCurrentScene(sceneData);

                        this.physicsSystem = new Engine.PhysicsSystem(this.sceneManager.currentScene);

                        // Initialize scripts, etc.
                        this.startGameLoop();
                    } catch (error) {
                        console.error("Failed to load and run scene:", error);
                    }
                }

                startGameLoop() {
                    let lastTime = 0;
                    const gameLoop = (timestamp) => {
                        const deltaTime = (timestamp - lastTime) / 1000;
                        lastTime = timestamp;

                        if (this.physicsSystem) this.physicsSystem.update(deltaTime);

                        this.sceneManager.currentScene.getAllMaterias().forEach(m => m.update(deltaTime));

                        // Correct render loop
                        this.renderer.resize();
                        this.updateScene(this.renderer, true);

                        this.inputManager.update();
                        requestAnimationFrame(gameLoop);
                    };
                    requestAnimationFrame(gameLoop);
                }

                // This is a simplified version of the main editor's updateScene function
                updateScene(rendererInstance, isGameView) {
                    if (!rendererInstance || !this.sceneManager.currentScene) return;

                    const cameras = this.sceneManager.currentScene.findAllCameras()
                        .sort((a, b) => a.getComponent(Engine.Components.Camera).depth - b.getComponent(Engine.Components.Camera).depth);

                    if (cameras.length === 0) {
                        rendererInstance.clear();
                        // Still need to draw Screen Space canvases
                        const canvases = this.sceneManager.currentScene.getAllMaterias()
                            .filter(m => m.getComponent(Engine.Components.Canvas) && m.getComponent(Engine.Components.Canvas).renderMode === 'Screen Space');
                        for (const C of canvases) {
                            rendererInstance.drawCanvas(C, isGameView);
                        }
                        return;
                    }

                    const handleRender = (camera) => {
                        rendererInstance.beginWorld(camera);
                        const allObjects = this.sceneManager.currentScene.getAllMaterias();

                        for (const materia of allObjects) {
                            if (!materia.isActive) continue;

                            // Basic culling and layer mask
                            const cameraComponent = camera.getComponent(Engine.Components.Camera);
                            const objectLayerBit = 1 << materia.layer;
                            if ((cameraComponent.cullingMask & objectLayerBit) === 0) continue;

                            // Draw SpriteRenderers
                            const spriteRenderer = materia.getComponent(Engine.Components.SpriteRenderer);
                            if (spriteRenderer && spriteRenderer.sprite) {
                                rendererInstance.drawSprite(spriteRenderer, materia.getComponent(Engine.Components.Transform));
                            }

                            // Draw TilemapRenderers
                            const tilemapRenderer = materia.getComponent(Engine.Components.TilemapRenderer);
                            if (tilemapRenderer) {
                                rendererInstance.drawTilemap(tilemapRenderer);
                            }

                            // Draw World Space Canvases
                             const canvas = materia.getComponent(Engine.Components.Canvas);
                            if(canvas && canvas.renderMode === 'World Space') {
                                rendererInstance.drawCanvas(materia, isGameView);
                            }
                        }
                        rendererInstance.end();
                    };

                    cameras.forEach(handleRender);

                    // Final pass for Screen Space canvases, drawn on top of everything
                    const screenSpaceCanvases = this.sceneManager.currentScene.getAllMaterias()
                        .filter(m => m.getComponent(Engine.Components.Canvas) && m.getComponent(Engine.Components.Canvas).renderMode === 'Screen Space');

                    for (const C of screenSpaceCanvases) {
                        rendererInstance.drawCanvas(C, isGameView);
                    }
                }
            }

            window.addEventListener('DOMContentLoaded', () => {
                const runner = new GameRunner('game-canvas');
                runner.loadAndRunScene('asset/scenes/${startScenePath.split('/').pop()}');
            });
        `;

        let gameScriptsModuleContent = 'module.exports = {\\n';
        for (const [path, code] of transpiledScripts.entries()) {
            const className = path.split('/').pop().replace('.ces', '');
            gameScriptsModuleContent += `    '${className}': function() { ${code} },\\n`;
        }
        gameScriptsModuleContent += '};';

        try {
            const engineFiles = await fetchAllEngineFiles();
            const b = browserify({ debug: false });

            // Add engine files as virtual modules
            for (const [path, content] of engineFiles.entries()) {
                const stream = new (require('stream').Readable)();
                stream.push(content);
                stream.push(null);
                b.require(stream, { expose: path, basedir: './' });
            }

            // Add virtual game scripts module
            const gameStream = new (require('stream').Readable)();
            gameStream.push(gameScriptsModuleContent);
            gameStream.push(null);
            b.require(gameStream, { expose: 'virtual-game-scripts' });

            // Add the main entry point
            const entryStream = new (require('stream').Readable)();
            entryStream.push(entryPointContent);
            entryStream.push(null);
            b.add(entryStream, { entry: true });

            // Bundle everything
            b.bundle((err, buf) => {
                if (err) return reject(new Error(`Error de Bundling: ${err.message}`));
                resolve(buf.toString());
            });

        } catch (error) {
            reject(error);
        }
    });
}

function obfuscateCode(code) {
    try {
        const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
            compact: true,
            controlFlowFlattening: true,
        });
        return obfuscationResult.getObfuscatedCode();
    } catch (error) {
        console.warn("La ofuscación falló, se usará el código sin ofuscar.", error);
        return code;
    }
}

async function buildForWeb({ projectName, outputDirHandle, scenesInBuild, buildAssetList, obfuscatedCode }) {
    updateProgress(75, 'Creando estructura de archivos final...');
    const buildRoot = await outputDirHandle.getDirectoryHandle(projectName, { create: true });
    const assetRoot = await buildRoot.getDirectoryHandle('asset', { create: true });

    const gameBundleHandle = await buildRoot.getFileHandle('game.bundle.js', { create: true });
    let writable = await gameBundleHandle.createWritable();
    await writable.write(obfuscatedCode);
    await writable.close();

    const indexHtmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${projectName}</title><style>body,html{margin:0;padding:0;overflow:hidden;background-color:#000}</style></head><body><canvas id="game-canvas" style="width:100vw; height:100vh;"></canvas><script src="game.bundle.js"></script></body></html>`;
    const indexHandle = await buildRoot.getFileHandle('index.html', { create: true });
    writable = await indexHandle.createWritable();
    await writable.write(indexHtmlContent);
    await writable.close();

    updateProgress(90, 'Copiando y reescribiendo assets...');
    for (const asset of buildAssetList) {
        const assetType = getAssetType(asset.name);
        const targetDirHandle = await assetRoot.getDirectoryHandle(assetType, { create: true });

        let content;
        if (asset.name.endsWith('.ceScene')) {
            let sceneContent = asset.content;
            sceneContent = sceneContent.replace(/"filePath":\s*"([^"]+)"/g, (match, oldPath) => {
                const fileName = oldPath.split('/').pop();
                const newType = getAssetType(fileName);
                const newPath = `asset/${newType}/${fileName}`;
                return `"filePath": "${newPath}"`;
            });
            content = sceneContent;
        } else {
            content = await asset.handle.getFile();
        }

        const fileHandle = await targetDirHandle.getFileHandle(asset.name, { create: true });
        writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }
}


// --- UI and Initialization ---

function cacheUI() {
    ui.progressBar = buildModal.querySelector('#build-progress-bar');
    ui.statusMessage = buildModal.querySelector('#build-status-message');
    ui.outputPathDisplay = buildModal.querySelector('#build-output-path');
    ui.selectPathBtn = buildModal.querySelector('#build-select-path-btn');
    ui.buildBtn = buildModal.querySelector('#build-btn');
    ui.formatHtml5Btn = buildModal.querySelector('#build-format-html5');
    ui.formatWappBtn = buildModal.querySelector('#build-format-wapp');
    ui.allScenesList = buildModal.querySelector('#build-all-scenes-list');
    ui.scenesToIncludeList = buildModal.querySelector('#build-scenes-to-include-list');
    ui.closeBtn = buildModal.querySelector('.close-button');
}

function setupEventListeners() {
    ui.selectPathBtn.addEventListener('click', selectOutputDirectory);
    ui.buildBtn.addEventListener('click', performBuild);
    ui.closeBtn.addEventListener('click', () => buildModal.classList.remove('is-open'));

    // Format selection
    ui.formatHtml5Btn.addEventListener('click', () => setBuildFormat('html5'));
    ui.formatWappBtn.addEventListener('click', () => setBuildFormat('wapp'));

    // Drag and Drop
    setupDragAndDrop();
}

async function selectOutputDirectory() {
    try {
        outputDirHandle = await window.showDirectoryPicker();
        if (outputDirHandle) ui.outputPathDisplay.value = outputDirHandle.name;
    } catch (error) {
        if (error.name !== 'AbortError') console.error("Error al seleccionar directorio:", error);
    }
}

function setBuildFormat(format) {
    selectedBuildFormat = format;
    ui.formatHtml5Btn.classList.toggle('active', format === 'html5');
    ui.formatWappBtn.classList.toggle('active', format === 'wapp');

    // For now, disable .wapp build button as it's not implemented
    if (format === 'wapp') {
        _handleBuildError(new Error("Not Implemented"), "El formato .wapp aún no está disponible.");
        ui.buildBtn.disabled = true;
    } else {
        ui.buildBtn.disabled = false;
        // Clear previous error message if any
        updateProgress(0, 'Esperando para iniciar la publicación...');
        ui.progressBar.style.backgroundColor = 'var(--color-accent)';
    }
}

function setupDragAndDrop() {
    // Make scenes in the main list draggable
    ui.allScenesList.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('scene-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    ui.allScenesList.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    // Make the "to include" list a drop zone and also sortable
    ui.scenesToIncludeList.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('scene-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    ui.scenesToIncludeList.addEventListener('dragend', (e) => {
         if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    ui.scenesToIncludeList.addEventListener('dragover', (e) => {
        e.preventDefault();
        ui.scenesToIncludeList.classList.add('drag-over');
        const afterElement = getDragAfterElement(ui.scenesToIncludeList, e.clientY);
        if (draggedItem) {
             if (afterElement == null) {
                ui.scenesToIncludeList.appendChild(draggedItem);
            } else {
                ui.scenesToIncludeList.insertBefore(draggedItem, afterElement);
            }
        }
    });

     ui.scenesToIncludeList.addEventListener('dragleave', () => {
        ui.scenesToIncludeList.classList.remove('drag-over');
    });

    ui.scenesToIncludeList.addEventListener('drop', (e) => {
        e.preventDefault();
        ui.scenesToIncludeList.classList.remove('drag-over');
        if (draggedItem) {
            // If the placeholder is there, remove it
            const placeholder = ui.scenesToIncludeList.querySelector('.empty-list-placeholder');
            if(placeholder) placeholder.remove();

            // The append/insertBefore is already handled in dragover for live feedback
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.scene-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}


async function findAndRenderProjectScenes() {
    ui.allScenesList.innerHTML = '';
    const scenes = [];

    async function findScenes(dirHandle, path = '') {
        for await (const entry of dirHandle.values()) {
            const newPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
                scenes.push({ name: entry.name, path: newPath });
            } else if (entry.kind === 'directory') {
                await findScenes(await dirHandle.getDirectoryHandle(entry.name), newPath);
            }
        }
    }

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
        await findScenes(assetsHandle, 'Assets');

        if (scenes.length > 0) {
            scenes.forEach(scene => {
                const item = document.createElement('div');
                item.className = 'scene-item';
                item.textContent = scene.name;
                item.draggable = true;
                item.dataset.path = scene.path;
                ui.allScenesList.appendChild(item);
            });
        } else {
            ui.allScenesList.innerHTML = '<p class="empty-list-placeholder">No se encontraron escenas</p>';
        }
    } catch (error) {
        console.error("No se pudieron cargar las escenas del proyecto:", error);
        ui.allScenesList.innerHTML = '<p class="empty-list-placeholder" style="color: var(--color-danger-text);">Error al cargar escenas</p>';
    }
}


export function initialize(modalElement, projectsHandle) {
    buildModal = modalElement;
    projectsDirHandle = projectsHandle;

    cacheUI();
    setupEventListeners();

    console.log("Sistema de Build (UI Mejorada) inicializado.");
}

export async function showBuildModal() {
    if (buildModal) {
        // Reset UI
        updateProgress(0, 'Esperando para iniciar la publicación...');
        if (ui.progressBar) ui.progressBar.style.backgroundColor = 'var(--color-accent)';
        ui.outputPathDisplay.value = '';
        outputDirHandle = null;
        ui.scenesToIncludeList.innerHTML = '<p class="empty-list-placeholder">Arrastra escenas aquí</p>';
        setBuildFormat('html5');

        await findAndRenderProjectScenes();

        buildModal.classList.add('is-open');
    }
}
