/**
 * BuildSystem.js
 *
 * Este módulo se encarga de todo el proceso de publicación (build) de un proyecto.
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

async function findProjectScenes() {
    allProjectScenes = [];
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

        async function scan(dirHandle, path) {
            for await (const entry of dirHandle.values()) {
                const newPath = path ? `${path}/${entry.name}` : entry.name;
                if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
                    allProjectScenes.push({ name: entry.name, handle: entry, path: newPath });
                } else if (entry.kind === 'directory') {
                    await scan(entry, newPath);
                }
            }
        }
        await scan(assetsHandle, '');
    } catch (e) {
        _handleBuildError(e, "No se pudieron encontrar las escenas del proyecto.");
    }
    _renderSceneLists();
}

function _renderSceneLists() {
    projectScenesList.innerHTML = '';
    const buildSceneNames = Array.from(buildScenesList.children).map(item => item.dataset.name);

    allProjectScenes.forEach(scene => {
        if (!buildSceneNames.includes(scene.name)) {
            const item = document.createElement('div');
            item.className = 'scene-item';
            item.textContent = scene.name;
            item.dataset.name = scene.name;
            if (selectedProjectScene === scene.name) item.classList.add('selected');
            projectScenesList.appendChild(item);
        }
    });

    // Re-render build list to update selection and 'Inicio' label
    Array.from(buildScenesList.children).forEach((item, index) => {
        item.classList.toggle('selected', selectedBuildScene === item.dataset.name);
    });
}

async function findSceneDependencies(scenesInBuild, allAssets) { /* ... (código existente) ... */ }
async function gatherAssets(projectDirHandle) { /* ... (código existente) ... */ }
async function transpileScripts(assetList) { /* ... (código existente) ... */ }
async function buildForWeb() { /* ... (código existente) ... */ }
async function buildForWapp() { /* ... (código existente) ... */ }

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

    // --- LIST INTERACTION LOGIC ---
    projectScenesList.addEventListener('click', e => {
        if (e.target.classList.contains('scene-item')) {
            selectedProjectScene = e.target.dataset.name;
            selectedBuildScene = null;
            _renderSceneLists();
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
            const sceneItem = projectScenesList.querySelector(`.scene-item[data-name="${selectedProjectScene}"]`);
            buildScenesList.appendChild(sceneItem);
            selectedProjectScene = null;
            _renderSceneLists();
        }
    });

    removeSceneBtn.addEventListener('click', () => {
        if (selectedBuildScene) {
            const sceneItem = buildScenesList.querySelector(`.scene-item[data-name="${selectedBuildScene}"]`);
            projectScenesList.appendChild(sceneItem);
            selectedBuildScene = null;
            _renderSceneLists();
        }
    });

    moveSceneUpBtn.addEventListener('click', () => {
        if (selectedBuildScene) {
            const sceneItem = buildScenesList.querySelector(`.scene-item[data-name="${selectedBuildScene}"]`);
            if (sceneItem.previousElementSibling) {
                buildScenesList.insertBefore(sceneItem, sceneItem.previousElementSibling);
            }
        }
    });

    moveSceneDownBtn.addEventListener('click', () => {
        if (selectedBuildScene) {
            const sceneItem = buildScenesList.querySelector(`.scene-item[data-name="${selectedBuildScene}"]`);
            if (sceneItem.nextElementSibling) {
                buildScenesList.insertBefore(sceneItem.nextElementSibling, sceneItem);
            }
        }
    });

    // --- MAIN BUTTON LISTENERS ---
    closeModalBtn.addEventListener('click', hideBuildModal);
    selectPathBtn.addEventListener('click', async () => { /* ... (código existente) ... */ });
    buildWebBtn.addEventListener('click', buildForWeb);
    buildWappBtn.addEventListener('click', buildForWapp);

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
    if (buildModal) {
        buildModal.classList.remove('is-open');
    }
}
