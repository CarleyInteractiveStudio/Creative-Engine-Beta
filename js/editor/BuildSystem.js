/**
 * BuildSystem.js
 *
 * Este módulo se encarga de todo el proceso de publicación (build) de un proyecto,
 * tanto para formato web (HTML/JS) como para el formato de paquete .wapp.
 */

import * as CES_Transpiler from './CES_Transpiler.js';

let buildModal = null;
let projectsDirHandle = null;
let outputDirHandle = null; // Handle para la carpeta de destino del build

// Elementos de la UI
let progressBar, statusMessage, outputPathDisplay, selectPathBtn, buildWebBtn, buildWappBtn, openFolderBtn, closeModalBtn;

/**
 * Convierte un Blob a una cadena Base64.
 * @param {Blob} blob El blob a convertir.
 * @returns {Promise<string>} La cadena Base64 resultante.
 */
function _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            // El resultado incluye el prefijo 'data:mime/type;base64,', lo removemos.
            resolve(reader.result.split(',')[1]);
        };
        reader.readAsDataURL(blob);
    });
}


/**
 * Actualiza la barra de progreso y el mensaje de estado.
 * @param {number} percentage El porcentaje de completitud (0 a 100).
 * @param {string} message El mensaje a mostrar.
 */
function updateProgress(percentage, message) {
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${Math.round(percentage)}%`;
    }
    if (statusMessage) {
        statusMessage.textContent = message;
    }
    console.log(`[Build] ${percentage}% - ${message}`);
}

/**
 * Recopila todos los assets de un proyecto de forma recursiva.
 * @param {FileSystemDirectoryHandle} projectDirHandle El handle del directorio del proyecto.
 * @returns {Promise<Array<{path: string, handle: FileSystemFileHandle}>>} Una lista de objetos de assets.
 */
async function gatherAssets(projectDirHandle) {
    updateProgress(5, 'Escaneando directorio de Assets...');
    const assets = [];
    const assetsDirHandle = await projectDirHandle.getDirectoryHandle('Assets');

    async function scanDirectory(dirHandle, currentPath) {
        for await (const entry of dirHandle.values()) {
            const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            if (entry.kind === 'file') {
                assets.push({ path: newPath, handle: entry });
            } else if (entry.kind === 'directory') {
                await scanDirectory(entry, newPath);
            }
        }
    }

    await scanDirectory(assetsDirHandle, '');
    return assets;
}

/**
 * Transpila todos los scripts .ces del proyecto.
 * @param {Array<{path: string, handle: FileSystemFileHandle}>} assetList La lista de todos los assets.
 * @returns {Promise<{success: boolean, code: string, errors: Array<string>}>} Un objeto con el resultado.
 */
async function transpileScripts(assetList) {
    updateProgress(15, 'Transpilando scripts .ces...');
    const cesFiles = assetList.filter(asset => asset.path.endsWith('.ces'));
    let combinedCode = `/**\n * Código del juego, transpilado desde archivos .ces\n * por Creative Engine.\n */\n\n`;
    const allErrors = [];

    for (const fileAsset of cesFiles) {
        const file = await fileAsset.handle.getFile();
        const code = await file.text();
        const result = CES_Transpiler.transpile(code, fileAsset.path);

        if (result.errors && result.errors.length > 0) {
            allErrors.push(`Errores en ${fileAsset.path}:\n- ${result.errors.join('\n- ')}`);
        } else {
            combinedCode += `// --- Transpiled from ${fileAsset.path} ---\n`;
            combinedCode += result.code + '\n\n';
        }
    }

    if (allErrors.length > 0) {
        return { success: false, code: null, errors: allErrors };
    }

    return { success: true, code: combinedCode, errors: [] };
}

/**
 * Lógica principal para la construcción del proyecto para la plataforma web.
 */
async function buildForWeb() {
    if (!outputDirHandle) {
        alert("Por favor, selecciona una carpeta de destino primero.");
        return;
    }

    try {
        updateProgress(0, 'Iniciando build para HTML/JS...');
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

        // 1. Recopilar y transpilar
        const assets = await gatherAssets(projectHandle);
        const transpileResult = await transpileScripts(assets);

        if (!transpileResult.success) {
            updateProgress(0, 'Build fallido. Revisa la consola.');
            console.error("Falló la transpilación:", transpileResult.errors.join('\n'));
            alert("Error en la transpilación de scripts. Revisa la consola para más detalles.");
            return;
        }

        updateProgress(30, 'Creando estructura de directorios...');
        const buildDir = await outputDirHandle.getDirectoryHandle(projectName + "-web", { create: true });

        // 2. Copiar assets
        updateProgress(40, 'Copiando assets...');
        const assetsDir = await buildDir.getDirectoryHandle("Assets", { create: true });
        const assetsDirHandle = await projectHandle.getDirectoryHandle('Assets');
        for (const asset of assets) {
            if (asset.path.endsWith('.ces')) continue;
            const parts = asset.path.split('/');
            let currentDir = assetsDir;
            for (let i = 0; i < parts.length - 1; i++) {
                currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
            }
            const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: true });
            const writable = await fileHandle.createWritable();
            const file = await asset.handle.getFile();
            await writable.write(file);
            await writable.close();
        }

        // 3. Escribir scripts transpilados
        updateProgress(60, 'Escribiendo scripts del juego...');
        const scriptsFileHandle = await buildDir.getFileHandle('game-scripts.js', { create: true });
        let writable = await scriptsFileHandle.createWritable();
        await writable.write(transpileResult.code);
        await writable.close();

        // 4. Copiar motor de runtime
        updateProgress(70, 'Copiando archivos del motor...');
        const engineFilesToCopy = ['game.js', 'lib/creative-engine-runtime.js'];
        for(const filePath of engineFilesToCopy) {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`No se pudo encontrar el archivo del motor: ${filePath}`);
            const content = await response.blob();
            const parts = filePath.split('/');
            let currentDir = buildDir;
            for (let i = 0; i < parts.length - 1; i++) {
                currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
            }
            const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: true });
            const wr = await fileHandle.createWritable();
            await wr.write(content);
            await wr.close();
        }

        // 5. Generar y escribir index.html
        updateProgress(85, 'Generando index.html...');
        const mainScenePath = 'MainScene.ceScene'; // TODO: Debería ser configurable
        const sceneContent = await (await (await assetsDirHandle.getFileHandle(mainScenePath)).getFile()).text();
        const sceneJsonFileHandle = await buildDir.getFileHandle('scene.json', { create: true });
        writable = await sceneJsonFileHandle.createWritable();
        await writable.write(sceneContent);
        await writable.close();

        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <style>
        body, html { margin: 0; padding: 0; overflow: hidden; background-color: #000; }
        canvas { display: block; width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <canvas id="game-canvas"></canvas>
    <script type="module" src="game.js"></script>
    <script type="module" src="game-scripts.js"></script>
</body>
</html>`;
        const indexFileHandle = await buildDir.getFileHandle('index.html', { create: true });
        writable = await indexFileHandle.createWritable();
        await writable.write(htmlContent);
        await writable.close();

        updateProgress(100, '¡Build completado!');
        openFolderBtn.style.display = 'block';

    } catch (error) {
        console.error("Error durante el proceso de build:", error);
        updateProgress(0, '¡Error! Revisa la consola para más detalles.');
        alert(`Ocurrió un error grave durante el build: ${error.message}`);
    }
}

/**
 * Lógica para la construcción del proyecto en formato .wapp.
 */
async function buildForWapp() {
    if (!outputDirHandle) {
        alert("Por favor, selecciona una carpeta de destino primero.");
        return;
    }

    try {
        updateProgress(0, 'Iniciando build para .wapp...');
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsDirHandle = await projectHandle.getDirectoryHandle('Assets');

        // 1. Recopilar y transpilar
        const assets = await gatherAssets(projectHandle);
        const transpileResult = await transpileScripts(assets);

        if (!transpileResult.success) {
            updateProgress(0, 'Build fallido. Revisa la consola.');
            console.error("Falló la transpilación:", transpileResult.errors.join('\n'));
            alert("Error en la transpilación de scripts.");
            return;
        }

        updateProgress(30, 'Preparando paquete .wapp...');
        const zip = new JSZip();

        // 2. Añadir assets codificados a Zip
        updateProgress(40, 'Codificando y comprimiendo assets...');
        for (const asset of assets) {
            if (asset.path.endsWith('.ces')) continue;
            const file = await asset.handle.getFile();
            const base64Content = await _blobToBase64(file);
            zip.file(`Assets/${asset.path}`, base64Content, { base64: true });
        }

        // 3. Añadir scripts transpilados
        updateProgress(60, 'Añadiendo scripts del juego...');
        const scriptsBase64 = btoa(transpileResult.code);
        zip.file('game-scripts.js', scriptsBase64, { base64: true });

        // 4. Añadir motor de runtime
        updateProgress(70, 'Añadiendo archivos del motor...');
        const engineFilesToCopy = ['game.js', 'lib/creative-engine-runtime.js'];
        for(const filePath of engineFilesToCopy) {
            const response = await fetch(filePath);
            const content = await response.blob();
            const base64Content = await _blobToBase64(content);
            zip.file(filePath, base64Content, { base64: true });
        }

        // 5. Añadir scene.json
        const mainScenePath = 'MainScene.ceScene';
        const sceneContent = await (await (await assetsDirHandle.getFileHandle(mainScenePath)).getFile()).text();
        const sceneBase64 = btoa(sceneContent);
        zip.file('scene.json', sceneBase64, { base64: true });

        // 6. Añadir index.html
        updateProgress(85, 'Generando index.html...');
        const htmlContent = `...`; // El contenido del HTML no es relevante para el .wapp
        zip.file('index.html', btoa(htmlContent), { base64: true });

        // 7. Generar y guardar el archivo .wapp
        updateProgress(90, 'Generando archivo final...');
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

        const wappFileHandle = await outputDirHandle.getFileHandle(`${projectName}.wapp`, { create: true });
        const writable = await wappFileHandle.createWritable();
        await writable.write(zipBlob);
        await writable.close();

        updateProgress(100, '¡Build .wapp completado!');
        openFolderBtn.style.display = 'block';

    } catch (error) {
        console.error("Error durante el proceso de build .wapp:", error);
        updateProgress(0, '¡Error! Revisa la consola para más detalles.');
        alert(`Ocurrió un error grave durante el build: ${error.message}`);
    }
}


/**
 * Inicializa el sistema de Build.
 * @param {HTMLDivElement} modalElement - El elemento del DOM para el modal de build.
 * @param {FileSystemDirectoryHandle} projectsHandle - El handle al directorio de proyectos.
 */
export function initialize(modalElement, projectsHandle) {
    buildModal = modalElement;
    projectsDirHandle = projectsHandle;

    if (!buildModal) {
        console.error("BuildSystem: El elemento del modal de build no fue encontrado.");
        return;
    }

    // Cachear elementos de la UI
    progressBar = buildModal.querySelector('#build-progress-bar');
    statusMessage = buildModal.querySelector('#build-status-message');
    outputPathDisplay = buildModal.querySelector('#build-output-path');
    selectPathBtn = buildModal.querySelector('#build-select-path-btn');
    buildWebBtn = buildModal.querySelector('#build-btn-web');
    buildWappBtn = buildModal.querySelector('#build-btn-wapp');
    openFolderBtn = buildModal.querySelector('#build-open-folder-btn');
    closeModalBtn = buildModal.querySelector('#close-build-modal');

    // Asignar listeners
    closeModalBtn.addEventListener('click', hideBuildModal);

    selectPathBtn.addEventListener('click', async () => {
        try {
            outputDirHandle = await window.showDirectoryPicker();
            outputPathDisplay.value = outputDirHandle.name;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error al seleccionar directorio:", error);
            }
        }
    });

    buildWebBtn.addEventListener('click', buildForWeb);
    buildWappBtn.addEventListener('click', buildForWapp);


    console.log("Sistema de Build inicializado.");
}

/**
 * Muestra la ventana modal de Build.
 */
export function showBuildModal() {
    if (buildModal) {
        updateProgress(0, 'Esperando para iniciar la publicación...');
        outputPathDisplay.value = '';
        outputDirHandle = null;
        openFolderBtn.style.display = 'none';

        buildModal.classList.add('is-open');
    } else {
        console.error("No se puede mostrar el modal de build porque no está inicializado.");
    }
}

/**
 * Oculta la ventana modal de Build.
 */
function hideBuildModal() {
    if (buildModal) {
        buildModal.classList.remove('is-open');
    }
}
