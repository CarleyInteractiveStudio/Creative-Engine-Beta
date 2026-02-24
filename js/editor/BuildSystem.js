// js/editor/BuildSystem.js
import { showNotification, showBuildSuccessDialog } from './ui/DialogWindow.js';
import * as CES_Transpiler from './CES_Transpiler.js';

/**
 * Handles the game build process, exporting a functional standalone version of the project.
 * @param {FileSystemDirectoryHandle} projectsDirHandle
 * @param {object} currentProjectConfig
 * @param {object} options { includeUnusedAssets: boolean, runAfterBuild: boolean }
 */
export async function buildProject(projectsDirHandle, currentProjectConfig, options = { includeUnusedAssets: false, runAfterBuild: false }) {
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
        const zip = new JSZip();
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

        showNotification(
            window.Localization?.get('BUILD_EN_PROGRESO') || 'Build en Progreso',
            window.Localization?.get('BUILD_GENERANDO_独立') || 'Generando paquete de juego independiente...'
        );

        // 1. Export index.html
        zip.file('index.html', generateIndexHtml(currentProjectConfig));

        // 2. Export engine and runtime
        await addEngineFilesToZip(zip);

        // 3. Collect used assets (if requested)
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
        let usedAssets = null;

        if (!options.includeUnusedAssets) {
            usedAssets = await collectUsedAssets(projectHandle);
            // Add all scenes anyway as they are needed to load levels
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

        // 4. Export project assets
        await addAssetsToZip(zip, assetsHandle, 'Assets', usedAssets);

        // 5. Export project libraries
        try {
            const libHandle = await projectHandle.getDirectoryHandle('lib');
            await addAssetsToZip(zip, libHandle, 'lib'); // Add all .celib files
        } catch (e) {
            console.log("No lib folder found in project, skipping libraries.");
        }

        // 6. Export transpiled scripts and custom components
        const scriptData = CES_Transpiler.getAllTranspiledCode();
        const metadata = CES_Transpiler.getAllMetadata();

        // Include custom component definitions
        const customComponents = {};
        const getCustomComponentDefinitions = (await import('./EngineAPIExtension.js')).getCustomComponentDefinitions;
        getCustomComponentDefinitions().forEach((def, name) => {
            customComponents[name] = def;
        });

        zip.file('js/scripts.js', `
            window.CE_Standalone_Scripts = ${JSON.stringify(scriptData)};
            window.CE_Script_Metadata = ${JSON.stringify(metadata)};
            window.CE_Custom_Components = ${JSON.stringify(customComponents)};
        `);

        // 5. CSS
        zip.file('style.css', `
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #111; font-family: sans-serif; }
            #game-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
            canvas { max-width: 100%; max-height: 100%; box-shadow: 0 0 20px rgba(0,0,0,0.5); background: #000; }
        `);

        // 7. Project Configuration (with library list)
        const buildConfig = { ...currentProjectConfig };

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
        buildConfig.allScenes = allScenes;

        // Set default start scene if not defined
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

        zip.file('project.json', JSON.stringify(buildConfig, null, 2));

        // 7. Finalize and Download
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `${projectName}_Build.zip`);

        // Show success dialog with sharing info
        showBuildSuccessDialog(projectName, blob);

        // 8. Run after build if requested
        if (options.runAfterBuild) {
            runStandalonePreview(currentProjectConfig);
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
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas"></canvas>
    </div>

    <!-- Load pre-transpiled scripts -->
    <script src="js/scripts.js"></script>

    <script type="module">
        import { StandaloneRuntime } from './js/engine/StandaloneRuntime.js';

        window.addEventListener('DOMContentLoaded', () => {
            const runtime = new StandaloneRuntime('game-canvas');
            runtime.start();
        });
    </script>
</body>
</html>`;
}

async function addEngineFilesToZip(zip) {
    const engineFiles = [
        'js/engine/AssetUtils.js',
        'js/engine/CEEngine.js',
        'js/engine/ComponentRegistry.js',
        'js/engine/Components.js',
        'js/engine/EngineAPI.js',
        'js/engine/Input.js',
        'js/engine/InputAPI.js',
        'js/engine/Leyes.js',
        'js/engine/Materia.js',
        'js/engine/MathUtils.js',
        'js/engine/Physics.js',
        'js/engine/Renderer.js',
        'js/engine/RuntimeAPIManager.js',
        'js/engine/SceneAPI.js',
        'js/engine/SceneManager.js',
        'js/engine/UIEventSystem.js',
        'js/engine/UITransformUtils.js',
        'js/engine/ui/UISystem.js',
        'js/engine/StandaloneRuntime.js'
    ];

    for (const file of engineFiles) {
        try {
            const response = await fetch(file);
            if (response.ok) {
                zip.file(file, await response.text());
            }
        } catch (e) {
            console.error(`Failed to add engine file: ${file}`, e);
        }
    }
}

async function collectUsedAssets(projectHandle) {
    const usedAssets = new Set();
    const assetRegex = /Assets\/[a-zA-Z0-9_\-\/]+\.[a-z0-9]+/g;

    async function scanDirectory(handle, path) {
        for await (const entry of handle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file') {
                if (entry.name.endsWith('.ceScene')) {
                    const file = await entry.getFile();
                    const content = await file.text();
                    try {
                        const sceneData = JSON.parse(content);
                        extractAssetsFromScene(sceneData, usedAssets);
                    } catch (e) {
                        console.error(`Error parsing scene ${entry.name}:`, e);
                    }
                } else if (entry.name.endsWith('.ces') || entry.name.endsWith('.chc') || entry.name.endsWith('.js')) {
                    const file = await entry.getFile();
                    const content = await file.text();
                    let match;
                    while ((match = assetRegex.exec(content)) !== null) {
                        usedAssets.add(match[0]);
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
export function runStandalonePreview(config) {
    const previewWindow = window.open('runner.html?standalone=true&preview=true', 'CreativeEngineStandalonePreview', 'width=800,height=600');
    if (!previewWindow) {
        showNotification('Error', 'No se pudo abrir la ventana de previsualización. Comprueba el bloqueador de popups.');
        return;
    }

    // Pass necessary data to the preview window once it's loaded
    window.addEventListener('message', function listener(event) {
        if (event.source === previewWindow && event.data === 'CE_RUNNER_READY') {
            previewWindow.postMessage({
                type: 'CE_START_STANDALONE_PREVIEW',
                projectData: config,
                projectsDirHandle: window.projectsDirHandle,
                projectName: new URLSearchParams(window.location.search).get('project')
            }, '*');
            window.removeEventListener('message', listener);
        }
    });
}

async function addAssetsToZip(zip, dirHandle, path, usedAssets = null) {
    for await (const entry of dirHandle.values()) {
        const entryPath = `${path}/${entry.name}`;
        if (entry.kind === 'file') {
            if (!usedAssets || usedAssets.has(entryPath)) {
                const file = await entry.getFile();
                zip.file(entryPath, file);
                console.log(`Added asset: ${entryPath}`);
            }
        } else if (entry.kind === 'directory') {
            await addAssetsToZip(zip, entry, entryPath, usedAssets);
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
