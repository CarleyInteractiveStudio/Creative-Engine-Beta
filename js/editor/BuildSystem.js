
import * as CES_Transpiler from './CES_Transpiler.js';

// Polyfills for browser environment
window.process = { browser: true, env: { NODE_ENV: 'production' } };

let buildModal = null;
let projectsDirHandle = null;
let outputDirHandle = null;
let selectedBuildFormat = 'html5';
let draggedItem = null;
let esbuildInitialized = false;

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
        await initializeESBuild(); // Ensure esbuild is ready
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

function waitForESBuild() {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (window.esbuild) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - startTime > 10000) {
                clearInterval(interval);
                reject(new Error("ESBuild no se cargó en 10 segundos."));
            }
        }, 50);
    });
}

async function initializeESBuild() {
    if (esbuildInitialized) return;
    try {
        await waitForESBuild();
        await window.esbuild.initialize({
            wasmURL: 'https://unpkg.com/esbuild-wasm@0.14.39/esbuild.wasm',
            worker: false
        });
        esbuildInitialized = true;
        console.log("ESBuild-WASM inicializado correctamente.");
    } catch (error) {
        console.error("Fallo al inicializar ESBuild-WASM:", error);
        _handleBuildError(error, "No se pudo cargar el componente de build (ESBuild).");
        throw error; // Re-throw to stop the build process
    }
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

async function bundleCode(startScenePath, transpiledScripts) {
    const gameRunnerSource = `
        import * as Engine from './js/engine/CEEngine.js';
        import * as GameScripts from 'virtual-game-scripts';

        // Attach scripts to window for components to find them by name
        window.GameScripts = GameScripts;

        class GameRunner {
            constructor(canvasId) {
                this.canvas = document.getElementById(canvasId);
                if (!this.canvas) throw new Error(\`Canvas with id '\${canvasId}' not found\`);

                this.renderer = new Engine.Renderer(this.canvas, false, true);
                this.sceneManager = Engine.SceneManager;
                this.inputManager = Engine.InputManager;
                this.physicsSystem = null;

                this.inputManager.initialize(this.canvas, this.canvas);
                this.sceneManager.initializeForBuild();
            }

            async loadAndRunScene(scenePath) {
                try {
                    const scene = await this.sceneManager.loadSceneFromFile(scenePath);
                    this.sceneManager.setCurrentScene(scene);
                    this.physicsSystem = new Engine.PhysicsSystem(this.sceneManager.currentScene);
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

                    this.renderer.resize();
                    this.updateScene(this.renderer, true);

                    this.inputManager.update();
                    requestAnimationFrame(gameLoop);
                };
                requestAnimationFrame(gameLoop);
            }

            updateScene(rendererInstance, isGameView) {
                if (!rendererInstance || !this.sceneManager.currentScene) return;

                const cameras = this.sceneManager.currentScene.findAllCameras().sort((a, b) => a.getComponent(Engine.Components.Camera).depth - b.getComponent(Engine.Components.Camera).depth);

                if (cameras.length === 0) {
                    rendererInstance.clear();
                    return;
                }

                cameras.forEach(camera => {
                    rendererInstance.beginWorld(camera);
                    const allObjects = this.sceneManager.currentScene.getAllMaterias();
                    for (const materia of allObjects) {
                        if (!materia.isActive) continue;

                        const spriteRenderer = materia.getComponent(Engine.Components.SpriteRenderer);
                        if (spriteRenderer && spriteRenderer.sprite) {
                            rendererInstance.drawSprite(spriteRenderer, materia.getComponent(Engine.Components.Transform));
                        }
                    }
                    rendererInstance.end();
                });
            }
        }

        window.addEventListener('DOMContentLoaded', () => {
            const runner = new GameRunner('game-canvas');
            runner.loadAndRunScene('asset/scenes/${startScenePath.split('/').pop()}');
        });
    `;

    const inMemoryLoader = {
        name: 'inMemoryLoader',
        setup(build) {
            // Intercept paths for virtual modules
            build.onResolve({ filter: /^virtual-game-scripts$/ }, args => ({
                path: args.path,
                namespace: 'virtual'
            }));

            // Load virtual game scripts module
            build.onLoad({ filter: /.*/, namespace: 'virtual' }, args => {
                if (args.path === 'virtual-game-scripts') {
                    let content = 'export default {\\n';
                    for (const [path, code] of transpiledScripts.entries()) {
                        const className = path.split('/').pop().replace('.ces', '');
                        content += `    '${className}': function() { ${code} },\\n`;
                    }
                    content += '};';
                    return { contents: content, loader: 'js' };
                }
                return null;
            });

            // Intercept file-system paths to load via fetch
            build.onResolve({ filter: /^\.\/js\// }, async (args) => {
                 return {
                    path: new URL(args.path, location.href).href,
                    namespace: 'http-url',
                };
            });

             build.onLoad({ filter: /.*/, namespace: 'http-url' }, async (args) => {
                const response = await fetch(args.path);
                const contents = await response.text();
                return { contents, loader: 'js' };
            });
        },
    };

    try {
        const result = await window.esbuild.build({
            entryPoints: ['index.js'],
            bundle: true,
            write: false,
            format: 'iife',
            minify: true,
            plugins: [{
                name: 'entry',
                setup(build) {
                    build.onResolve({ filter: /^index\.js$/ }, args => ({ path: args.path, namespace: 'entry-ns' }));
                    build.onLoad({ filter: /.*/, namespace: 'entry-ns' }, () => ({ contents: gameRunnerSource, loader: 'js' }));
                }
            }, inMemoryLoader],
        });

        return result.outputFiles[0].text;
    } catch (error) {
        console.error("ESBuild bundling failed:", error);
        throw new Error(`ESBuild failed: ${error.message}`);
    }
}


function obfuscateCode(code) {
    try {
        console.log("Ofuscando el código...");
        const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            debugProtection: false,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: true,
            renameGlobals: false,
            selfDefending: true,
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 10,
            stringArray: true,
            stringArrayEncoding: ['base64'],
            stringArrayThreshold: 0.75,
            transformObjectKeys: true,
            unicodeEscapeSequence: false
        });
        console.log("Ofuscación completada.");
        return obfuscationResult.getObfuscatedCode();
    } catch (error) {
        console.warn("La ofuscación falló. El build continuará con el código sin ofuscar.", error);
        _handleBuildError(error, "La ofuscación falló, pero el build continuará.");
        return code; // Fallback to non-obfuscated code
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
