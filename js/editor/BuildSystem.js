/**
 * BuildSystem.js
 */

import * as CES_Transpiler from './CES_Transpiler.js';

let buildModal = null;
let projectsDirHandle = null;
let outputDirHandle = null;

// UI Elements
let progressBar, statusMessage, outputPathDisplay, selectPathBtn, buildWebBtn, buildWappBtn, openFolderBtn, closeModalBtn;
let projectScenesList, buildScenesList, addSceneBtn, removeSceneBtn, moveSceneUpBtn, moveSceneDownBtn;

let allProjectScenes = [];
let selectedProjectScene = null;
let selectedBuildScene = null;
let draggedItem = null;

// Helper functions
function _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

function updateProgress(percentage, message) {
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${Math.round(percentage)}%`;
    }
    if (statusMessage) statusMessage.textContent = message;
    console.log(`[Build] ${percentage}% - ${message}`);
}

function _handleBuildError(error, userMessage) {
    console.error("Error durante el proceso de build:", error);
    updateProgress(100, `¡Error! ${userMessage}`);
    if (progressBar) progressBar.style.backgroundColor = 'var(--color-danger)';
    alert(`Ocurrió un error en el build: ${userMessage}\nRevisa la consola para más detalles técnicos.`);
}

// Scene and Asset Management
async function findProjectScenes() {
    allProjectScenes = [];
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        if (!projectName) throw new Error("No se ha seleccionado un proyecto.");
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

        async function scan(dirHandle, path) {
            for await (const entry of dirHandle.values()) {
                const newPath = path ? `${path}/${entry.name}` : entry.name;
                if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
                    allProjectScenes.push({ name: entry.name, handle: entry, path: newPath });
                } else if (entry.kind === 'directory') {
                    await scan(await dirHandle.getDirectoryHandle(entry.name), newPath);
                }
            }
        }
        await scan(assetsHandle, '');
    } catch (e) {
        _handleBuildError(e, "No se pudieron encontrar las escenas del proyecto.");
    }
    _renderSceneLists();
}

async function gatherAssets(projectDirHandle) {
    const allAssets = new Map();
    const assetsDirHandle = await projectDirHandle.getDirectoryHandle('Assets');
    async function scan(dirHandle, path) {
        for await (const entry of dirHandle.values()) {
            const newPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file') {
                allAssets.set(newPath, { name: entry.name, handle: entry, path: newPath });
            } else if (entry.kind === 'directory') {
                await scan(await dirHandle.getDirectoryHandle(entry.name), newPath);
            }
        }
    }
    await scan(assetsDirHandle, '');
    return allAssets;
}

async function findSceneDependencies(scenesInBuild, allAssets) {
    const dependencies = new Set();
    const goRegex = /go\s+"(.+?)"/g;
    for (const sceneInfo of scenesInBuild) {
        try {
            const sceneFile = await sceneInfo.handle.getFile();
            const sceneContent = await sceneFile.text();
            const sceneJson = JSON.parse(sceneContent);
            if (!sceneJson.materias) continue;
            for (const materia of sceneJson.materias) {
                if (!materia.components) continue;
                const scriptComponent = materia.components.find(c => c.type === 'Script');
                if (scriptComponent && scriptComponent.properties.filePath) {
                    const scriptAsset = allAssets.get(scriptComponent.properties.filePath);
                    if (!scriptAsset) continue;
                    dependencies.add(scriptAsset.path);
                    const scriptFile = await scriptAsset.handle.getFile();
                    const scriptContent = await scriptFile.text();
                    let match;
                    while ((match = goRegex.exec(scriptContent)) !== null) {
                        const libName = match[1];
                        const libPath = `libs/${libName}.celib`;
                        if (allAssets.has(libPath)) {
                            dependencies.add(libPath);
                        }
                    }
                }
            }
        } catch (e) {
            console.error(`Error procesando dependencias para la escena ${sceneInfo.name}:`, e);
        }
    }
    return Array.from(dependencies).map(path => allAssets.get(path));
}

// UI Rendering and Drag/Drop
function _renderSceneLists() {
    projectScenesList.innerHTML = '';
    const buildSceneNames = Array.from(buildScenesList.children).map(item => item.dataset.name);
    allProjectScenes.forEach(scene => {
        if (!buildSceneNames.includes(scene.name)) {
            const item = document.createElement('div');
            item.className = 'scene-item';
            item.textContent = scene.name;
            item.dataset.name = scene.name;
            item.dataset.path = scene.path;
            if (selectedProjectScene === scene.name) item.classList.add('selected');
            projectScenesList.appendChild(item);
        }
    });
    Array.from(buildScenesList.children).forEach(item => {
        item.classList.toggle('selected', selectedBuildScene === item.dataset.name);
    });
    addDragListenersToList(projectScenesList);
}

function handleDragStart(e) {
    draggedItem = e.target;
    setTimeout(() => e.target.style.opacity = '0.5', 0);
}

function handleDragEnd(e) {
    setTimeout(() => {
        if (draggedItem) draggedItem.style.opacity = '1';
        draggedItem = null;
    }, 0);
}

function handleDragOver(e) { e.preventDefault(); }

function handleDrop(e) {
    e.preventDefault();
    const targetList = e.target.closest('.scene-list-box');
    if (targetList && draggedItem) {
        const afterElement = getDragAfterElement(targetList, e.clientY);
        if (afterElement == null) {
            targetList.appendChild(draggedItem);
        } else {
            targetList.insertBefore(draggedItem, afterElement);
        }
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.scene-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function addDragListenersToList(list) {
    list.querySelectorAll('.scene-item').forEach(item => {
        item.setAttribute('draggable', true);
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });
}

// Core Build Logic
async function loadLibraries(assetList) {
    const loadedLibs = new Map();
    for (const asset of assetList) {
        if (asset.name.endsWith('.celib')) {
            try {
                const file = await asset.handle.getFile();
                const content = await file.text();
                const libraryModule = new Function(content)();
                const libraryName = asset.name.replace('.celib', '');
                loadedLibs.set(libraryName, libraryModule);
            } catch (e) {
                throw new Error(`Error al cargar la librería ${asset.path}: ${e.message}`);
            }
        }
    }
    return loadedLibs;
}

async function transpileScripts(assetList, availableLibs) {
    const transpiledScripts = new Map();
    for (const asset of assetList) {
        if (asset.name.endsWith('.ces')) {
            try {
                const file = await asset.handle.getFile();
                const content = await file.text();
                const result = CES_Transpiler.transpile(content, asset.name, availableLibs);
                if (result.errors) {
                    throw new Error(`Errores de sintaxis: ${result.errors.join(', ')}`);
                }
                const newPath = asset.path.replace(/\.ces$/, '.js');
                transpiledScripts.set(newPath, result.jsCode);
            } catch (e) {
                throw new Error(`Error al transpilar el script ${asset.path}: ${e.message}`);
            }
        }
    }
    return transpiledScripts;
}

async function performBuild(buildFunction) {
    if (!outputDirHandle) {
        _handleBuildError(new Error("No output directory selected"), "Por favor, selecciona una carpeta de destino.");
        return;
    }
    const scenesInBuildItems = Array.from(buildScenesList.children);
    if (scenesInBuildItems.length === 0) {
        _handleBuildError(new Error("No scenes in build"), "Añade al menos una escena a la lista 'Escenas en el Build'.");
        return;
    }
    updateProgress(0, 'Iniciando build...');
    progressBar.style.backgroundColor = 'var(--color-accent)';
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        updateProgress(5, 'Recolectando todos los assets del proyecto...');
        const allAssets = await gatherAssets(projectHandle);
        const scenesInBuild = scenesInBuildItems.map(item => allAssets.get(item.dataset.path));
        updateProgress(15, 'Analizando dependencias de las escenas...');
        const dependencies = await findSceneDependencies(scenesInBuild, allAssets);
        let buildAssetList = [...new Set([...scenesInBuild, ...dependencies])];
        updateProgress(25, 'Cargando librerías...');
        const loadedLibs = await loadLibraries(buildAssetList);
        updateProgress(30, 'Transpilando scripts a JavaScript...');
        const transpiledScripts = await transpileScripts(buildAssetList, loadedLibs);
        const finalAssetList = new Set(buildAssetList);
        allAssets.forEach(asset => {
            if (!asset.name.endsWith('.ces') && !asset.name.endsWith('.ceScene')) {
                finalAssetList.add(asset);
            }
        });
        await buildFunction({
            projectName,
            outputDirHandle,
            scenesInBuild,
            buildAssetList: Array.from(finalAssetList),
            transpiledScripts
        });
        updateProgress(100, '¡Build completado con éxito!');
        openFolderBtn.style.display = 'inline-block';
    } catch (error) {
        _handleBuildError(error, error.message || "Ocurrió un error desconocido.");
    }
}

// Build Targets
async function buildForWeb({ projectName, outputDirHandle, scenesInBuild, buildAssetList, transpiledScripts }) {
    updateProgress(50, 'Creando estructura de directorios...');
    const buildRoot = await outputDirHandle.getDirectoryHandle(projectName, { create: true });

    // Copy necessary engine files for a standalone web build
    const engineDir = await buildRoot.getDirectoryHandle('js', { create: true }).then(js => js.getDirectoryHandle('engine', { create: true }));
    const engineFiles = [
        'CEEngine.js', 'SceneManager.js', 'Materia.js', 'Components.js',
        'Renderer.js', 'Physics.js', 'Input.js', 'AssetUtils.js',
        'UITransformUtils.js', 'MathUtils.js', 'ui/UISystem.js'
    ];

    for (const filePath of engineFiles) {
        const response = await fetch(`js/engine/${filePath}`);
        const content = await response.text();
        const parts = filePath.split('/');
        let currentDir = engineDir;
        // Create subdirectories if they exist in the path (e.g., 'ui/')
        if (parts.length > 1) {
            currentDir = await engineDir.getDirectoryHandle(parts[0], { create: true });
        }
        const fileName = parts.pop();
        const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }

    updateProgress(65, 'Copiando assets y scripts...');
    const assetsDir = await buildRoot.getDirectoryHandle('Assets', { create: true });
    for (const asset of buildAssetList) {
        if (!asset) continue;
        const pathParts = asset.path.split('/');
        let currentDir = assetsDir;
        for (let i = 0; i < pathParts.length - 1; i++) {
            currentDir = await currentDir.getDirectoryHandle(pathParts[i], { create: true });
        }
        const fileHandle = await currentDir.getFileHandle(asset.name, { create: true });
        const file = await asset.handle.getFile();
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();
    }

    for (const [path, content] of transpiledScripts.entries()) {
        const pathParts = path.split('/');
        let currentDir = assetsDir;
        for (let i = 0; i < pathParts.length - 1; i++) {
            currentDir = await currentDir.getDirectoryHandle(pathParts[i], { create: true });
        }
        const fileHandle = await currentDir.getFileHandle(path.split('/').pop(), { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }

    updateProgress(85, 'Generando archivos de inicio del juego...');
    // Fetch the game template
    const templateResponse = await fetch('js/editor/game-template.js');
    let gameJsContent = await templateResponse.text();

    // Replace the placeholder with the actual start scene path
    const startScenePath = `Assets/${scenesInBuild[0].path}`;
    gameJsContent = gameJsContent.replace('__START_SCENE_PATH__', startScenePath);

    const gameJsHandle = await buildRoot.getFileHandle('game.js', { create: true });
    let writable = await gameJsHandle.createWritable();
    await writable.write(gameJsContent);
    await writable.close();

    const indexHtmlContent = `
<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${projectName}</title>
<style>body, html { margin: 0; padding: 0; overflow: hidden; background-color: #1a1a1a; } canvas { display: block; }</style>
</head><body><canvas id="game-canvas"></canvas><script type="module" src="game.js"></script></body></html>`;
    const indexHtmlHandle = await buildRoot.getFileHandle('index.html', { create: true });
    writable = await indexHtmlHandle.createWritable();
    await writable.write(indexHtmlContent);
    await writable.close();
}

async function buildForWapp({ projectName, outputDirHandle, scenesInBuild, buildAssetList, transpiledScripts }) {
    updateProgress(50, 'Compilando y codificando assets...');
    const wappData = {
        manifest: {
            startScene: scenesInBuild[0].path,
            assets: [],
            transpiledScripts: {},
        },
        files: {}
    };
    for (const asset of buildAssetList) {
        if (!asset) continue;
        wappData.manifest.assets.push(asset.path);
        const file = await asset.handle.getFile();
        const base64Content = await _blobToBase64(file);
        wappData.files[asset.path] = base64Content;
    }
    for (const [path, content] of transpiledScripts.entries()) {
        wappData.manifest.transpiledScripts[path] = content;
    }
    updateProgress(90, 'Escribiendo archivo .wapp...');
    const wappJsonString = JSON.stringify(wappData);
    const encodedWappContent = btoa(unescape(encodeURIComponent(wappJsonString)));
    const fileHandle = await outputDirHandle.getFileHandle(`${projectName}.wapp`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(encodedWappContent);
    await writable.close();
}

// Initialization
export function initialize(modalElement, projectsHandle) {
    buildModal = modalElement;
    projectsDirHandle = projectsHandle;
    progressBar = buildModal.querySelector('#build-progress-bar');
    statusMessage = buildModal.querySelector('#build-status-message');
    outputPathDisplay = buildModal.querySelector('#build-output-path');
    selectPathBtn = buildModal.querySelector('#build-select-path-btn');
    buildWebBtn = buildModal.querySelector('#build-btn-web');
    buildWappBtn = buildModal.querySelector('#build-btn-wapp');
    openFolderBtn = buildModal.querySelector('#build-open-folder-btn');
    closeModalBtn = buildModal.querySelector('#close-build-modal');
    projectScenesList = buildModal.querySelector('#project-scenes-list');
    buildScenesList = buildModal.querySelector('#build-scenes-list');
    addSceneBtn = buildModal.querySelector('#add-scene-btn');
    removeSceneBtn = buildModal.querySelector('#remove-scene-btn');
    moveSceneUpBtn = buildModal.querySelector('#move-scene-up-btn');
    moveSceneDownBtn = buildModal.querySelector('#move-scene-down-btn');

    // Event Listeners
    const lists = [projectScenesList, buildScenesList];
    lists.forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('drop', handleDrop);
    });
    projectScenesList.addEventListener('click', e => {
        if (e.target.classList.contains('scene-item')) {
            selectedProjectScene = e.target.dataset.name;
            selectedBuildScene = null;
            _renderSceneLists();
            Array.from(buildScenesList.children).forEach(item => item.classList.remove('selected'));
        }
    });
    buildScenesList.addEventListener('click', e => {
        if (e.target.classList.contains('scene-item')) {
            selectedBuildScene = e.target.dataset.name;
            selectedProjectScene = null;
            _renderSceneLists();
        }
    });
    addSceneBtn.addEventListener('click', () => {
        if (selectedProjectScene) {
            const sceneItem = projectScenesList.querySelector(`[data-name="${selectedProjectScene}"]`);
            if (sceneItem) {
                buildScenesList.appendChild(sceneItem);
                addDragListenersToList(buildScenesList);
                selectedProjectScene = null;
                _renderSceneLists();
            }
        }
    });
    removeSceneBtn.addEventListener('click', () => {
        if (selectedBuildScene) {
            const sceneItem = buildScenesList.querySelector(`[data-name="${selectedBuildScene}"]`);
            if (sceneItem) {
                projectScenesList.appendChild(sceneItem);
                selectedBuildScene = null;
                _renderSceneLists();
            }
        }
    });
    moveSceneUpBtn.addEventListener('click', () => {
        if (selectedBuildScene) {
            const sceneItem = buildScenesList.querySelector(`[data-name="${selectedBuildScene}"]`);
            if (sceneItem && sceneItem.previousElementSibling) {
                buildScenesList.insertBefore(sceneItem, sceneItem.previousElementSibling);
            }
        }
    });
    moveSceneDownBtn.addEventListener('click', () => {
        if (selectedBuildScene) {
            const sceneItem = buildScenesList.querySelector(`[data-name="${selectedBuildScene}"]`);
            if (sceneItem && sceneItem.nextElementSibling) {
                buildScenesList.insertBefore(sceneItem.nextElementSibling, sceneItem);
            }
        }
    });
    closeModalBtn.addEventListener('click', hideBuildModal);
    selectPathBtn.addEventListener('click', async () => {
        try {
            outputDirHandle = await window.showDirectoryPicker();
            if (outputDirHandle) outputPathDisplay.value = outputDirHandle.name;
        } catch (error) {
            if (error.name !== 'AbortError') console.error("Error al seleccionar directorio:", error);
        }
    });
    buildWebBtn.addEventListener('click', () => performBuild(buildForWeb));
    buildWappBtn.addEventListener('click', () => performBuild(buildForWapp));
    console.log("Sistema de Build inicializado.");
}

export async function showBuildModal() {
    if (buildModal) {
        updateProgress(0, 'Esperando para iniciar la publicación...');
        if (progressBar) progressBar.style.backgroundColor = 'var(--color-accent)';
        outputPathDisplay.value = '';
        outputDirHandle = null;
        openFolderBtn.style.display = 'none';
        buildScenesList.innerHTML = '';
        await findProjectScenes();
        buildModal.classList.add('is-open');
    } else {
        console.error("No se puede mostrar el modal de build porque no está inicializado.");
    }
}

function hideBuildModal() {
    if (buildModal) buildModal.classList.remove('is-open');
}
