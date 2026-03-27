// js/editor/BuildSystem.js
import { showNotification } from './ui/DialogWindow.js';
import * as CES_Transpiler from './CES_Transpiler.js';

/**
 * Handles the game build process, exporting a functional standalone version of the project.
 */
export async function buildProject(projectsDirHandle, currentProjectConfig) {
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

        // 3. Collect used assets
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
        const usedAssets = await collectUsedAssets(assetsHandle);

        // Add scenes anyway as they are needed to load levels
        for await (const entry of assetsHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
                usedAssets.add(`Assets/${entry.name}`);
            }
        }

        // 4. Export only used project assets
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

        zip.file('project.ceconfig', JSON.stringify(buildConfig, null, 2));

        // 7. Finalize and Download
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `${projectName}_Build.zip`);

        showNotification(
            window.Localization?.get('BUILD_COMPLETADO') || 'Build Completado',
            window.Localization?.get('BUILD_EXITO_ZIP') || '¡Tu juego está listo! El archivo ZIP se ha generado.'
        );

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

async function collectUsedAssets(assetsHandle) {
    const usedAssets = new Set();

    async function scanDirectory(handle, path) {
        for await (const entry of handle.values()) {
            const entryPath = `${path}/${entry.name}`;
            if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
                const file = await entry.getFile();
                const content = await file.text();
                try {
                    const sceneData = JSON.parse(content);
                    extractAssetsFromScene(sceneData, usedAssets);
                } catch (e) {
                    console.error(`Error parsing scene ${entry.name}:`, e);
                }
            } else if (entry.kind === 'directory') {
                await scanDirectory(entry, entryPath);
            }
        }
    }

    function extractAssetsFromScene(sceneData, assetSet) {
        if (!sceneData.materias) return;

        sceneData.materias.forEach(m => {
            if (!m.leyes) return;
            m.leyes.forEach(ley => {
                if (ley.properties) {
                    // Check common asset properties
                    const props = ley.properties;
                    if (props.source) assetSet.add(props.source);
                    if (props.spriteAssetPath) assetSet.add(props.spriteAssetPath);
                    if (props.animationClipPath) assetSet.add(props.animationClipPath);
                    if (props.controllerPath) assetSet.add(props.controllerPath);
                    if (props.fontAssetPath) assetSet.add(props.fontAssetPath);
                    if (props.texturePath) assetSet.add(props.texturePath);
                }
            });
        });
    }

    await scanDirectory(assetsHandle, 'Assets');
    return usedAssets;
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
