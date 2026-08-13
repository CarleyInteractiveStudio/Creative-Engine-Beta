// js/editor/BuildSystem.js
import { showNotification, showBuildSuccessDialog, showProgressDialog } from './ui/DialogWindow.js';
import * as CES_Transpiler from './CES_Transpiler.js';
import * as DataCollector from './DataCollectorProvider.js';
import { getPreferences } from './ui/PreferencesWindow.js';

/**
 * Handles the game build process, exporting a functional standalone version of the project.
 * @param {FileSystemDirectoryHandle} projectsDirHandle
 * @param {object} currentProjectConfig
 * @param {object} options { includeUnusedAssets: boolean, runAfterBuild: boolean }
 */
/**
 * Prepares the final project configuration for build or preview.
 * @param {FileSystemDirectoryHandle} projectHandle
 * @param {object} currentConfig
 * @returns {Promise<object>}
 */
async function prepareBuildConfig(projectHandle, currentConfig) {
    const buildConfig = { ...currentConfig };
    const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

    // Collect all scenes for fallback
    const allScenes = [];
    async function collectAllScenes(handle, path = '') {
        for await (const entry of handle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
                allScenes.push(entryPath);
            } else if (entry.kind === 'directory') {
                await collectAllScenes(entry, entryPath);
            }
        }
    }
    await collectAllScenes(assetsHandle);

    // Filter allScenes if user specified includedScenes
    if (currentConfig.includedScenes && currentConfig.includedScenes.length > 0) {
        buildConfig.allScenes = allScenes.filter(s => currentConfig.includedScenes.includes(s));
    } else {
        buildConfig.allScenes = allScenes;
    }

    // Normalize startScene path (should be relative to Assets/)
    if (buildConfig.startScene && buildConfig.startScene.startsWith('Assets/')) {
        buildConfig.startScene = buildConfig.startScene.substring(7);
    }

    // Set default start scene if not defined or not found in current project
    if (!buildConfig.startScene) {
        const currentHandle = window.SceneManager?.currentSceneFileHandle;
        if (currentHandle) {
            try {
                const pathParts = await assetsHandle.resolve(currentHandle);
                if (pathParts) {
                    buildConfig.startScene = pathParts.join('/');
                } else {
                    buildConfig.startScene = currentHandle.name;
                }
            } catch (e) {
                buildConfig.startScene = currentHandle.name;
            }
        } else {
            // Try to find the first available scene recursively
            async function findFirstScene(handle, path = '') {
                for await (const entry of handle.values()) {
                    const entryPath = path ? `${path}/${entry.name}` : entry.name;
                    if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
                        return entryPath;
                    } else if (entry.kind === 'directory') {
                        const found = await findFirstScene(entry, entryPath);
                        if (found) return found;
                    }
                }
                return null;
            }
            buildConfig.startScene = await findFirstScene(assetsHandle) || 'default.ceScene';
        }
    }

    // Collect libraries
    try {
        const libHandle = await projectHandle.getDirectoryHandle('lib');
        const libNames = [];
        for await (const entry of libHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.celib')) {
                libNames.push(entry.name.replace('.celib', ''));
            }
        }
        buildConfig.libraries = libNames;
    } catch (e) {}

    return buildConfig;
}

export async function buildProject(projectsDirHandle, currentProjectConfig, options = {}) {
    if (!projectsDirHandle) {
        showNotification(
            window.Localization?.get('ERROR_DE_BUILD') || 'Error de Build',
            window.Localization?.get('ERROR_BUILD_SIN_PROYECTO') || 'No se puede realizar un build sin un proyecto cargado.'
        );
        return;
    }

    if (typeof JSZip === 'undefined') {
        showNotification(
            window.Localization?.get('ERROR_DE_BUILD') || 'Error de Build',
            window.Localization?.get('ERROR_JSZIP_FALTANTE') || 'La librería JSZip no está cargada.'
        );
        return;
    }

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

        // Merge options with project config for final build config
    const mergedConfig = {
        ...currentProjectConfig,
        ...options,
        resourceLoadingMode: options.resourceLoadingMode || currentProjectConfig.resourceLoadingMode || 'lazy'
    };

    // Remove reference to Window object to avoid circular JSON serialization error
    delete mergedConfig.previewWindow;

        let outputHandle = null;
        let zip = null;

        if (options.exportTarget === 'folder') {
            if (!window.showDirectoryPicker) {
                throw new Error("Su navegador no soporta la exportación a carpetas locales. Por favor, use la opción ZIP.");
            }
            outputHandle = await window.showDirectoryPicker();
        } else {
            zip = new JSZip();
        }

        const progress = showProgressDialog(
            window.Localization?.get('BUILD_EN_PROGRESO') || 'Build en Progreso',
            window.Localization?.get('BUILD_GENERANDO_独立') || 'Generando paquete de juego independiente...'
        );
        let currentStep = 0;
        const totalSteps = 10;
        const updateProgress = (msg) => {
            currentStep++;
            const percent = Math.min(95, (currentStep / totalSteps) * 100);
            progress.update(percent, msg);
        };

        // helper to write file to zip or folder
        const writeFile = async (path, content) => {
            if (zip) {
                zip.file(path, content);
            } else {
                const parts = path.split('/');
                const fileName = parts.pop();
                let current = outputHandle;
                for (const part of parts) {
                    current = await current.getDirectoryHandle(part, { create: true });
                }
                const fileHandle = await current.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
            }
        };

        // 1. Export index.html and PWA files
        updateProgress("Generando index.html y PWA...");
        await writeFile('index.html', generateIndexHtml(mergedConfig));
        await writeFile('manifest.json', generateManifest(mergedConfig));
        await writeFile('.nojekyll', ''); // Disable Jekyll on GitHub Pages to allow files/folders starting with underscores
        try {
            const swResp = await fetch('js/engine/sw.js');
            if (swResp.ok) await writeFile('sw.js', await swResp.text());
        } catch(e) {}

        // 2. Export engine and runtime
        updateProgress("Copiando archivos del motor...");
        await addEngineFilesToZip(zip || outputHandle);

        // 3. Collect used assets (if requested)
        updateProgress("Analizando dependencias de assets...");
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
        let usedAssets = null;

        if (!options.includeUnusedAssets) {
            usedAssets = await collectUsedAssets(projectHandle);

            // Ensure the game icon (portada) is included in optimized builds
            if (mergedConfig.appIcon) {
                const iconPath = mergedConfig.appIcon.startsWith('Assets/') ? mergedConfig.appIcon : `Assets/${mergedConfig.appIcon}`;
                usedAssets.add(iconPath);
            }

            // Ensure custom splash screen logos are included in optimized builds
            if (mergedConfig.splashScreens && Array.isArray(mergedConfig.splashScreens.list)) {
                mergedConfig.splashScreens.list.forEach(splash => {
                    if (splash.path) {
                        const splashPath = splash.path.startsWith('Assets/') ? splash.path : `Assets/${splash.path}`;
                        usedAssets.add(splashPath);
                    }
                });
            }

            // Add all scenes anyway as they are needed to load levels
            if (options.includedScenes && options.includedScenes.length > 0) {
                options.includedScenes.forEach(s => usedAssets.add(s.startsWith('Assets/') ? s : `Assets/${s}`));
            } else {
                async function addAllScenes(handle, path) {
                    for await (const entry of handle.values()) {
                        const entryPath = `${path}/${entry.name}`;
                        if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
                            usedAssets.add(entryPath);
                        } else if (entry.kind === 'directory') {
                            await addAllScenes(entry, entryPath);
                        }
                    }
                }
                await addAllScenes(assetsHandle, 'Assets');
            }
        }

        // 4. Export project assets
        updateProgress("Exportando assets del proyecto...");
        await addAssetsToZip(zip || outputHandle, assetsHandle, 'Assets', usedAssets);

        // 5. Export project libraries
        updateProgress("Exportando librerías...");
        try {
            const libHandle = await projectHandle.getDirectoryHandle('lib');
            await addAssetsToZip(zip || outputHandle, libHandle, 'lib'); // Add all .celib files
        } catch (e) {
            console.log("No lib folder found in project, skipping libraries.");
        }

        // 6. Special Case: Engine Splash Logo and sound
        updateProgress("Configurando pantallas de splash...");
        const engineLogoEnabled = mergedConfig.showEngineLogo || mergedConfig.splashScreens?.showEngineLogo;
        if (engineLogoEnabled) {
            try {
                const logoResp = await fetch('image/Logo_C.png');
                if (logoResp.ok) await writeFile('image/Logo_C.png', await logoResp.blob());

                // Try startup.wav first (from user request), then fallback to splash.mp3
                let soundResp = await fetch('startup.wav');
                if (soundResp.ok) {
                    await writeFile('musica/startup.wav', await soundResp.blob());
                } else {
                    soundResp = await fetch('musica/splash.mp3');
                    if (soundResp.ok) await writeFile('musica/splash.mp3', await soundResp.blob());
                }
            } catch(e) {}
        }

        // 7. Export transpiled scripts and custom components
        updateProgress("Compilando scripts...");
        const scriptData = CES_Transpiler.getAllTranspiledCode();
        const metadata = CES_Transpiler.getAllMetadata();

        // Include custom component definitions
        const customComponents = {};
        const getCustomComponentDefinitions = (await import('./EngineAPIExtension.js')).getCustomComponentDefinitions;
        getCustomComponentDefinitions().forEach((def, name) => {
            customComponents[name] = def;
        });

        await writeFile('js/scripts.js', `
            window.CE_Standalone_Scripts = ${JSON.stringify(scriptData)};
            window.CE_Script_Metadata = ${JSON.stringify(metadata)};
            window.CE_Custom_Components = ${JSON.stringify(customComponents)};
        `);

        // 8. CSS
        updateProgress("Generando estilos...");
        await writeFile('style.css', `
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #111; font-family: sans-serif; }
            #game-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; }
            canvas { width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 0 20px rgba(0,0,0,0.5); background: #000; }
        `);

        // 9. Final Project Configuration
        updateProgress("Finalizando configuración...");
        const buildConfig = await prepareBuildConfig(projectHandle, mergedConfig);

        await writeFile('project.json', JSON.stringify(buildConfig, null, 2));

        // 10. Finalize and Download or Notify
        updateProgress("Empaquetando...");
        if (zip) {
            const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
                progress.update(95 + (metadata.percent * 0.05), `Comprimiendo: ${Math.round(metadata.percent)}%`);
            });
            progress.close();
            downloadBlob(blob, `${projectName}_Build.zip`);
            showBuildSuccessDialog(projectName, blob);
        } else {
            progress.close();
            showNotification("Build Completado", `Tu juego ha sido exportado exitosamente a la carpeta seleccionada.`);
        }

        // 11. Telemetry / Data Collection for Carley IA
        const prefs = getPreferences();
        if (prefs.shareWithCarley !== false) {
            console.log("[Build] Sending anonymous script data for IA training...");
            DataCollector.collectProjectData(projectHandle, {
                engineVersion: buildConfig.engineVersion,
                projectType: buildConfig.projectType,
                appVersion: buildConfig.appVersion
            });
        }

        // 12. Run after build if requested
        if (options.runAfterBuild) {
            runStandalonePreview(buildConfig, options.previewWindow);
        }

    } catch (error) {
        console.error('Build Error:', error);
        showNotification(
            window.Localization?.get('ERROR_DE_BUILD') || 'Error de Build',
            `Ocurrió un error: ${error.message}`
        );
    }
}

function generateIndexHtml(config) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.appName || 'Creative Engine Game'}</title>
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#000000">
    <link rel="icon" type="image/png" href="${config.appIcon || 'image/Logo_C.png'}">
    <script type="importmap">
        {
            "imports": {
                "gl-matrix": "https://esm.sh/gl-matrix@3.4.3"
            }
        }
    </script>
    <link rel="stylesheet" href="style.css">
    <style>
        #cors-warning {
            display: none;
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95); color: white;
            flex-direction: column; align-items: center; justify-content: center;
            text-align: center; padding: 20px; font-family: sans-serif; z-index: 9999;
        }
        #cors-warning h1 { color: #ff4444; }
        #cors-warning p { max-width: 600px; line-height: 1.6; }
    </style>
</head>
<body>
    <div id="cors-warning">
        <h1>⚠️ Acción Requerida</h1>
        <p>Parece que estás intentando abrir el juego directamente desde tus archivos.</p>
        <p>Por razones de seguridad, los navegadores modernos bloquean la carga de scripts del motor cuando se abren de esta manera.</p>
        <p><strong>Para jugar:</strong> Sube estos archivos a un servidor (GitHub Pages, Itch.io) o usa un servidor local (ej. Live Server).</p>
        <button onclick="document.getElementById('cors-warning').style.display='none'" style="padding: 10px 20px; cursor: pointer; border: none; background: #444; color: white; border-radius: 5px;">Intentar de todas formas</button>
    </div>

    <div id="game-container">
        <canvas id="game-canvas"></canvas>
    </div>

    <script>
        // Check for file protocol
        if (window.location.protocol === 'file:') {
            document.getElementById('cors-warning').style.display = 'flex';
        } else {
            document.getElementById('cors-warning').style.display = 'none';
        }
    </script>

    <!-- Load pre-transpiled scripts -->
    <script src="js/scripts.js"></script>

    <script type="module">
        import { StandaloneRuntime } from './js/engine/StandaloneRuntime.js';

        window.addEventListener('DOMContentLoaded', () => {
            const runtime = new StandaloneRuntime('game-canvas');
            runtime.start();

            // Register PWA Service Worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js').catch(err => {
                    console.log("Service Worker registration failed: ", err);
                });
            }
        });
    </script>
</body>
</html>`;
}

async function addEngineFilesToZip(zipOrHandle) {
    const engineFiles = [
        'js/engine/AssetUtils.js',
        'js/engine/CEEngine.js',
        'js/engine/ComponentRegistry.js',
        'js/engine/Components.js',
        'js/engine/EngineAPI.js',
        'js/engine/Input.js',
        'js/engine/InputAPI.js',
        'js/engine/Localization.js',
        'js/engine/Leyes.js',
        'js/engine/Materia.js',
        'js/engine/MathUtils.js',
        'js/engine/Messaging.js',
        'js/engine/Physics.js',
        'js/engine/Renderer.js',
        'js/engine/RuntimeAPIManager.js',
        'js/engine/SceneAPI.js',
        'js/engine/SceneManager.js',
        'js/engine/UIEventSystem.js',
        'js/engine/UITransformUtils.js',
        'js/engine/ui/UISystem.js',
        'js/engine/StandaloneRuntime.js',
        'js/engine/PerformanceAPI.js',
        'js/engine/PerformanceMonitor.js',
        'js/engine/NetworkMonitor.js',
        'js/engine/Components3D.js',
        'js/engine/Renderer3D.js',
        'js/engine/ModelLoader3D.js',
        'js/engine/ExtensionsManager.js',
        'js/carley-world/CarleyComponents.js',
        'js/carley-world/CarleyLeyes3D.js',
        'js/carley-world/CarleyMateria3D.js',
        'js/carley-world/CarleyMateriaFactory.js',
        'js/carley-world/CarleyMath.js',
        'js/carley-world/CarleyModelLoader3D.js',
        'js/carley-world/CarleyRenderer.js',
        'js/carley-world/CarleyWorld.js'
    ];

    // Add engine files
    for (const file of engineFiles) {
        try {
            const response = await fetch(file);
            if (response.ok) {
                const content = await response.text();
                if (zipOrHandle.file) {
                    zipOrHandle.file(file, content);
                } else {
                    const parts = file.split('/');
                    const fileName = parts.pop();
                    let current = zipOrHandle;
                    for (const part of parts) {
                        current = await current.getDirectoryHandle(part, { create: true });
                    }
                    const fileHandle = await current.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                }
            }
        } catch (e) {
            console.error(`Failed to add engine file: ${file}`, e);
        }
    }

    // Also add the default translation file
    try {
        const langFile = 'translations/engine.lang';
        const response = await fetch(langFile);
        if (response.ok) {
            const content = await response.text();
            if (zipOrHandle.file) {
                zipOrHandle.file(langFile, content);
            } else {
                let current = await zipOrHandle.getDirectoryHandle('translations', { create: true });
                const fileHandle = await current.getFileHandle('engine.lang', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
            }
        }
    } catch (e) {
        console.error("Failed to add engine.lang to build", e);
    }
}

async function collectUsedAssets(projectHandle) {
    const usedAssets = new Set();
    // Robust regex to extract any quoted or space-delimited Asset paths (with spaces, underscores, capitals, etc.)
    const assetRegex = /Assets\/[^"'\s>]+/g;

    const binaryExtensions = new Set([
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'ttf', 'woff', 'woff2', 'bin', 'obj', 'fbx', 'gltf', 'glb'
    ]);

    async function scanDirectory(handle, path) {
        for await (const entry of handle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file') {
                const ext = entry.name.split('.').pop().toLowerCase();
                if (entry.name.endsWith('.ceScene')) {
                    const file = await entry.getFile();
                    const content = await file.text();
                    try {
                        const sceneData = JSON.parse(content);
                        extractAssetsFromScene(sceneData, usedAssets);
                    } catch (e) {
                        console.error(`Error parsing scene ${entry.name}:`, e);
                    }
                } else if (!binaryExtensions.has(ext)) {
                    // Scan text or JSON configs/animations/sprites/scripts for references to assets
                    try {
                        const file = await entry.getFile();
                        const content = await file.text();
                        let match;
                        assetRegex.lastIndex = 0;
                        while ((match = assetRegex.exec(content)) !== null) {
                            // Strip any trailing punctuation (like trailing periods or commas) in comments/code
                            const cleanPath = match[0].replace(/[.,;:!]+$/, '');
                            usedAssets.add(cleanPath);
                        }
                    } catch (e) {
                        console.warn(`Error scanning text file ${entryPath} for asset references:`, e);
                    }
                }
            } else if (entry.kind === 'directory') {
                await scanDirectory(entry, entryPath);
            }
        }
    }

    function extractAssetsFromScene(sceneData, assetSet) {
        if (!sceneData.materias) return;

        function scanMateria(m) {
            if (m.leyes) {
                m.leyes.forEach(ley => {
                    if (ley.properties) {
                        const props = ley.properties;
                        function findAssets(obj) {
                            for (const key in obj) {
                                const val = obj[key];
                                if (typeof val === 'string' && val.startsWith('Assets/')) {
                                    assetSet.add(val);
                                } else if (val && typeof val === 'object' && !val.__materiaId) {
                                    findAssets(val);
                                }
                            }
                        }
                        findAssets(props);
                    }
                });
            }
            if (m.children) {
                m.children.forEach(scanMateria);
            }
        }
        sceneData.materias.forEach(scanMateria);
    }

    await scanDirectory(projectHandle, '');
    return usedAssets;
}

/**
 * Opens a new window that runs the game using the StandaloneRuntime logic
 * but reading from the local project handles.
 */
export async function runStandalonePreview(config, existingWindow = null) {
    const previewWindow = existingWindow || window.open('runner.html?standalone=true&preview=true', 'CreativeEngineStandalonePreview', 'width=800,height=600');
    if (!previewWindow) {
        showNotification('Error', 'No se pudo abrir la ventana de previsualización. Comprueba el bloqueador de popups.');
        return;
    }

    if (existingWindow) {
        try {
            previewWindow.location.href = 'runner.html?standalone=true&preview=true';
        } catch (e) {
            console.error("Failed to redirect existing window:", e);
        }
    }

    // Prepare scripts and metadata
    const scriptData = CES_Transpiler.getAllTranspiledCode();
    const metadata = CES_Transpiler.getAllMetadata();
    const customComponents = {};
    try {
        const { getCustomComponentDefinitions } = await import('./EngineAPIExtension.js');
        getCustomComponentDefinitions().forEach((def, name) => {
            customComponents[name] = def;
        });
    } catch (e) {
        console.warn("Could not load custom components for preview:", e);
    }

    // Pass necessary data to the preview window once it's loaded
    window.addEventListener('message', function listener(event) {
        if (event.source === previewWindow && event.data === 'CE_RUNNER_READY') {
            previewWindow.postMessage({
                type: 'CE_START_STANDALONE_PREVIEW',
                projectData: config,
                projectsDirHandle: window.projectsDirHandle,
                projectName: new URLSearchParams(window.location.search).get('project'),
                scripts: scriptData,
                metadata: metadata,
                customComponents: customComponents
            }, '*');
            window.removeEventListener('message', listener);
        }
    });
}

async function addAssetsToZip(zipOrHandle, dirHandle, path, usedAssets = null) {
    for await (const entry of dirHandle.values()) {
        const entryPath = `${path}/${entry.name}`;
        if (entry.kind === 'file') {
            let hasAsset = !usedAssets || usedAssets.has(entryPath);
            let targetPath = entryPath;

            // Handle casing mismatches gracefully by finding the original casing requested by the game assets/configs
            if (usedAssets && !hasAsset) {
                const requestedPath = [...usedAssets].find(p => p.toLowerCase() === entryPath.toLowerCase());
                if (requestedPath) {
                    hasAsset = true;
                    targetPath = requestedPath;
                }
            }

            if (hasAsset) {
                const file = await entry.getFile();
                if (zipOrHandle.file) {
                    zipOrHandle.file(targetPath, file);
                } else {
                    const parts = targetPath.split('/');
                    const fileName = parts.pop();
                    let current = zipOrHandle;
                    for (const part of parts) {
                        current = await current.getDirectoryHandle(part, { create: true });
                    }
                    const fileHandle = await current.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();
                }
                console.log(`Added asset: ${targetPath}`);
            }
        } else if (entry.kind === 'directory') {
            await addAssetsToZip(zipOrHandle, entry, entryPath, usedAssets);
        }
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function generateManifest(config) {
    const manifest = {
        name: config.appName || 'Creative Engine Game',
        short_name: config.appName || 'CE Game',
        start_url: './index.html',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
            {
                src: config.appIcon || 'image/Logo_C.png',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                src: config.appIcon || 'image/Logo_C.png',
                sizes: '512x512',
                type: 'image/png'
            }
        ]
    };
    return JSON.stringify(manifest, null, 2);
}
