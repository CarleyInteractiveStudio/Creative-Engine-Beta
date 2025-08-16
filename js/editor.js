// --- Engine Core Classes ---
class Leyes { constructor(materia) { this.materia = materia; } update() {} }
class Transform extends Leyes { constructor(materia) { super(materia); this.x = 0; this.y = 0; this.rotation = 0; this.scale = { x: 1, y: 1 }; } }
class CreativeScript extends Leyes { constructor(materia, scriptName) { super(materia); this.scriptName = scriptName; this.instance = null; this.publicVars = []; this.publicVarReferences = {}; } parsePublicVars(code) { this.publicVars = []; const regex = /public\s+(\w+)\s+(\w+);/g; let match; while ((match = regex.exec(code)) !== null) { this.publicVars.push({ type: match[1], name: match[2] }); } } async load() { const projectName = new URLSearchParams(window.location.search).get('project'); const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName); const fileHandle = await projectHandle.getFileHandle(this.scriptName); const file = await fileHandle.getFile(); const code = await file.text(); this.parsePublicVars(code); const scriptModule = new Function('materia', `${code}\nreturn { start, update };`)(this.materia); this.instance = { start: scriptModule.start || (() => {}), update: scriptModule.update || (() => {}), }; for (const key in this.publicVarReferences) { this.instance[key] = this.publicVarReferences[key]; } } }
class UICanvas extends Leyes { constructor(materia) { super(materia); } }
class UIText extends Leyes { constructor(materia, text = 'Hola Mundo') { super(materia); this.text = text; this.fontSize = 16; this.color = '#ffffff'; this.textTransform = 'none'; } }
class UIButton extends Leyes { constructor(materia) { super(materia); this.label = new UIText(materia, 'Botón'); this.color = '#2d2d30'; } }

class Rigidbody extends Leyes {
    constructor(materia) {
        super(materia);
        this.bodyType = 'dynamic'; // 'dynamic', 'static', 'kinematic'
        this.mass = 1.0;
        this.velocity = { x: 0, y: 0 };
    }
}

class BoxCollider extends Leyes {
    constructor(materia) {
        super(materia);
        this.width = 1.0;
        this.height = 1.0;
    }
}

class SpriteRenderer extends Leyes {
    constructor(materia) {
        super(materia);
        this.sprite = new Image();
        this.source = ''; // URL to the image
        this.color = '#ffffff'; // Tint color
    }

    setSource(url) {
        this.source = url;
        if (url) {
            this.sprite.src = url;
        }
    }
}

class Animation {
    constructor(name = 'New Animation') {
        this.name = name;
        this.frames = []; // Array of image source paths
        this.speed = 10; // Frames per second
        this.loop = true;
    }
}

class Animator extends Leyes {
    constructor(materia) {
        super(materia);
        this.animations = new Map(); // Map of animation names to Animation objects
        this.currentState = null;
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.spriteRenderer = this.materia.getComponent(SpriteRenderer);
    }

    play(stateName) {
        if (this.currentState !== stateName && this.animations.has(stateName)) {
            this.currentState = stateName;
            this.currentFrame = 0;
            this.frameTimer = 0;
        }
    }

    update(deltaTime) {
        if (!this.currentState || !this.spriteRenderer) {
            if (!this.spriteRenderer) {
                this.spriteRenderer = this.materia.getComponent(SpriteRenderer);
            }
            return;
        }

        const animation = this.animations.get(this.currentState);
        if (!animation || animation.frames.length === 0) return;

        this.frameTimer += deltaTime;
        const frameDuration = 1 / animation.speed;

        if (this.frameTimer >= frameDuration) {
            this.frameTimer -= frameDuration;
            this.currentFrame++;

            if (this.currentFrame >= animation.frames.length) {
                if (animation.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = animation.frames.length - 1; // Stay on last frame
                }
            }

            this.spriteRenderer.setSource(animation.frames[this.currentFrame]);
        }
    }
}

let MATERIA_ID_COUNTER = 0;
class Materia { constructor(name = 'Materia') { this.id = MATERIA_ID_COUNTER++; this.name = `${name}`; this.leyes = []; this.parent = null; this.children = []; this.addComponent(new Transform(this)); } addComponent(component) { this.leyes.push(component); component.materia = this; } getComponent(componentClass) { return this.leyes.find(ley => ley instanceof componentClass); } addChild(child) { if (child.parent) { child.parent.removeChild(child); } child.parent = this; this.children.push(child); } removeChild(child) { const index = this.children.indexOf(child); if (index > -1) { this.children.splice(index, 1); child.parent = null; } } update() { for (const ley of this.leyes) { ley.update(); } } }
class Scene { constructor() { this.materias = []; } addMateria(materia) { if (materia instanceof Materia) { this.materias.push(materia); } } findMateriaById(id) { return this.materias.find(m => m.id === id); } getRootMaterias() { return this.materias.filter(m => m.parent === null); } findFirstCanvas() { return this.materias.find(m => m.getComponent(UICanvas)); } findFirstCamera() { return this.materias.find(m => m.getComponent(Camera)); } }

class Camera extends Leyes {
    constructor(materia) {
        super(materia);
        this.orthographicSize = 500; // Represents half of the vertical viewing volume height.
        this.zoom = 1.0; // Editor-only zoom, not part of the component's data.
    }
}

class Renderer {
    constructor(canvas, isEditor = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = null; // Will be assigned from the scene
        this.isEditor = isEditor;
        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    begin() {
        const sceneCameraMateria = currentScene.findFirstCamera();
        let cameraComponent;
        let cameraTransform;

        if (sceneCameraMateria) {
            cameraComponent = sceneCameraMateria.getComponent(Camera);
            cameraTransform = sceneCameraMateria.getComponent(Transform);
        }

        // The editor renderer creates a default camera if none exists.
        // The game renderer will have a null camera and won't render.
        if (!cameraComponent && this.isEditor) {
            cameraComponent = { orthographicSize: 500, zoom: 1.0 }; // A dummy for default view
            cameraTransform = { x: 0, y: 0 };
        }

        this.camera = cameraComponent ? {
            ...cameraComponent,
            x: cameraTransform.x,
            y: cameraTransform.y,
            // Game view zoom is determined by ortho size, editor can have its own zoom
            effectiveZoom: this.isEditor ? cameraComponent.zoom : (this.canvas.height / (cameraComponent.orthographicSize * 2))
        } : null;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        if (!this.camera) return;

        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.effectiveZoom, this.camera.effectiveZoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
    }

    end() {
        this.ctx.restore();
    }

    drawRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
    }

    // Placeholder for now
    drawImage(image, x, y, width, height) {
        this.ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
    }

    drawText(text, x, y, color, fontSize, textTransform) {
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let transformedText = text;
        if (textTransform === 'uppercase') {
            transformedText = text.toUpperCase();
        } else if (textTransform === 'lowercase') {
            transformedText = text.toLowerCase();
        }

        this.ctx.fillText(transformedText, x, y);
    }
}

class PhysicsSystem {
    constructor(scene) {
        this.scene = scene;
        this.gravity = { x: 0, y: 98.1 }; // A bit exaggerated for visible effect
    }

    update(deltaTime) {
        // Update positions based on velocity
        for (const materia of this.scene.materias) {
            const rigidbody = materia.getComponent(Rigidbody);
            const transform = materia.getComponent(Transform);

            if (rigidbody && transform && rigidbody.bodyType === 'dynamic') {
                rigidbody.velocity.y += this.gravity.y * deltaTime;
                transform.x += rigidbody.velocity.x * deltaTime;
                transform.y += rigidbody.velocity.y * deltaTime;
            }
        }

        // Collision detection
        const collidables = this.scene.materias.filter(m => m.getComponent(BoxCollider));
        for (let i = 0; i < collidables.length; i++) {
            for (let j = i + 1; j < collidables.length; j++) {
                const materiaA = collidables[i];
                const materiaB = collidables[j];

                const transformA = materiaA.getComponent(Transform);
                const colliderA = materiaA.getComponent(BoxCollider);
                const transformB = materiaB.getComponent(Transform);
                const colliderB = materiaB.getComponent(BoxCollider);

                const leftA = transformA.x - colliderA.width / 2;
                const rightA = transformA.x + colliderA.width / 2;
                const topA = transformA.y - colliderA.height / 2;
                const bottomA = transformA.y + colliderA.height / 2;

                const leftB = transformB.x - colliderB.width / 2;
                const rightB = transformB.x + colliderB.width / 2;
                const topB = transformB.y - colliderB.height / 2;
                const bottomB = transformB.y + colliderB.height / 2;

                if (rightA > leftB && leftA < rightB && bottomA > topB && topA < bottomB) {
                    console.log(`Colisión detectada entre: ${materiaA.name} y ${materiaB.name}`);
                }
            }
        }
    }
}


// --- Engine Core Classes ---
import { InputManager } from './engine/Input.js';

// --- CodeMirror Integration ---
import {EditorView, basicSetup} from "https://esm.sh/codemirror@6.0.1";
import {javascript} from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import {oneDark} from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import {undo, redo} from "https://esm.sh/@codemirror/commands@6.3.3";

// --- Editor Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Editor State ---
    let projectsDirHandle = null, codeEditor, currentlyOpenFileHandle = null;
    const currentScene = new Scene(); let selectedMateria = null;
    let renderer = null, gameRenderer = null;
    let activeView = 'scene-content'; // 'scene-content', 'game-content', or 'code-editor-content'
    let currentDirectoryHandle = null; // To track the folder selected in the asset browser
    const panelVisibility = {
        hierarchy: true,
        inspector: true,
        assets: true,
    };
    let physicsSystem = null;
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0; let activeTool = 'move'; // 'move', 'pan', 'scale'
    let isPanning = false;
    let dragState = {}; // To hold info about the current drag operation

    // Animation Editor State
    let isDrawing = false;
    let drawingTool = 'pencil';
    let drawingMode = 'free'; // 'free' or 'pixel'
    let drawingColor = '#ffffff';
    let lastDrawPos = { x: 0, y: 0 };
    let isMovingPanel = false;
    let currentAnimationAsset = null; // Holds the parsed .cea file content
    let currentAnimationFileHandle = null; // Holds the file handle for saving
    let currentFrameIndex = -1;
    let isAnimationPlaying = false;
    let animationPlaybackId = null;
    let panelMoveOffset = { x: 0, y: 0 };
    let isResizingPanel = false;
    let panelResizeState = {};


    let isGameRunning = false;
    let lastFrameTime = 0;
    let editorLoopId = null;
    let deltaTime = 0;
    let currentSceneFileHandle = null;
    let isSceneDirty = false; // To track unsaved changes


    // --- 2. DOM Elements ---
    const dom = {};

    // --- 3. IndexedDB Logic & 4. Console Override ---
    const dbName = 'CreativeEngineDB'; let db; function openDB() { return new Promise((resolve, reject) => { const request = indexedDB.open(dbName, 1); request.onerror = () => reject('Error opening DB'); request.onsuccess = (e) => { db = e.target.result; resolve(db); }; request.onupgradeneeded = (e) => { e.target.result.createObjectStore('settings', { keyPath: 'id' }); }; }); }
    function getDirHandle() { if (!db) return Promise.resolve(null); return new Promise((resolve) => { const request = db.transaction(['settings'], 'readonly').objectStore('settings').get('projectsDirHandle'); request.onsuccess = () => resolve(request.result ? request.result.handle : null); request.onerror = () => resolve(null); }); }
    const originalLog = console.log, originalWarn = console.warn, originalError = console.error; function logToUIConsole(message, type = 'log') { if (!dom.consoleContent) return; const msgEl = document.createElement('p'); msgEl.className = `console-msg log-${type}`; msgEl.textContent = `> ${message}`; dom.consoleContent.appendChild(msgEl); dom.consoleContent.scrollTop = dom.consoleContent.scrollHeight; }
    console.log = function(message, ...args) { logToUIConsole(message, 'log'); originalLog.apply(console, [message, ...args]); }; console.warn = function(message, ...args) { logToUIConsole(message, 'warn'); originalWarn.apply(console, [message, ...args]); }; console.error = function(message, ...args) { logToUIConsole(message, 'error'); originalError.apply(console, [message, ...args]); };

    // --- 5. Core Editor Functions ---
    var updateAssetBrowser, createScriptFile, openScriptInEditor, saveCurrentScript, updateHierarchy, updateInspector, updateScene, selectMateria, showAddComponentModal, startGame, runGameLoop, stopGame, updateDebugPanel, updateInspectorForAsset, openAnimationAsset, addFrameFromCanvas, loadScene, saveScene, serializeScene, deserializeScene, exportPackage, openSpriteSelector, saveAssetMeta;

    saveAssetMeta = async function(assetName, metaData) {
        try {
            const metaFileHandle = await currentDirectoryHandle.getFileHandle(`${assetName}.meta`, { create: true });
            const writable = await metaFileHandle.createWritable();
            await writable.write(JSON.stringify(metaData, null, 2));
            await writable.close();
            console.log(`Metadatos guardados para ${assetName}`);
        } catch (error) {
            console.error(`No se pudieron guardar los metadatos para ${assetName}:`, error);
        }
    };

    openSpriteSelector = async function() {
        const grid = dom.spriteSelectorGrid;
        grid.innerHTML = '';
        dom.spriteSelectorModal.classList.remove('hidden');

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
        await findImages(projectHandle);

        imageFiles.forEach(imgPath => {
            const img = document.createElement('img');
            img.src = imgPath;
            img.addEventListener('click', () => {
                if (selectedMateria) {
                    const spriteRenderer = selectedMateria.getComponent(SpriteRenderer);
                    if (spriteRenderer) {
                        spriteRenderer.setSource(imgPath);
                        updateInspector();
                        updateScene(renderer, false);
                    }
                }
                dom.spriteSelectorModal.classList.add('hidden');
            });
            grid.appendChild(img);
        });
    };

    function downloadBlob(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function addFolderToZip(zip, dirHandle, path = '') {
        const manifest = [];
        for await (const entry of dirHandle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            manifest.push({name: entry.name, kind: entry.kind});
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                zip.file(entryPath, file);
            } else if (entry.kind === 'directory') {
                const folderZip = zip.folder(entryPath);
                await addFolderToZip(folderZip, entry, ''); // Recurse with empty path for sub-zip
            }
        }
        // This manifest logic is simplified; a real implementation might be more complex
        // zip.file(path ? `${path}/manifest.json` : 'manifest.json', JSON.stringify(manifest, null, 2));
    }

    exportPackage = async function(folderName) {
        if (!folderName) return;
        console.log(`Exportando paquete desde: ${folderName}`);
        try {
            const dirHandle = await currentDirectoryHandle.getDirectoryHandle(folderName);
            const zip = new JSZip();

            await addFolderToZip(zip, dirHandle, folderName);

            const content = await zip.generateAsync({type: 'blob'});
            downloadBlob(content, `${folderName}.cep`);
            console.log("Paquete exportado con éxito.");

        } catch(error) {
            console.error(`Error al exportar el paquete:`, error);
            alert("No se pudo exportar el paquete.");
        }
    };

    serializeScene = function(scene) {
        const sceneData = {
            materias: []
        };
        for (const materia of scene.materias) {
            const materiaData = {
                id: materia.id,
                name: materia.name,
                leyes: []
            };
            for (const ley of materia.leyes) {
                const leyData = {
                    type: ley.constructor.name,
                    properties: {}
                };
                // Copy properties, but not the 'materia' back-reference
                for (const key in ley) {
                    if (key !== 'materia' && typeof ley[key] !== 'function') {
                        leyData.properties[key] = ley[key];
                    }
                }
                materiaData.leyes.push(leyData);
            }
            sceneData.materias.push(materiaData);
        }
        return sceneData;
    };

    deserializeScene = function(sceneData) {
        const newScene = new Scene();
        for (const materiaData of sceneData.materias) {
            const newMateria = new Materia(materiaData.name);
            newMateria.id = materiaData.id;
            newMateria.leyes = []; // Clear default transform

            for (const leyData of materiaData.leyes) {
                const ComponentClass = window[leyData.type] || eval(leyData.type);
                if (ComponentClass) {
                    const newLey = new ComponentClass(newMateria);
                    Object.assign(newLey, leyData.properties);
                    newMateria.addComponent(newLey);
                }
            }
            newScene.addMateria(newMateria);
        }
        return newScene;
    };

    loadScene = async function(fileName) {
        if(isSceneDirty) {
            if(!confirm("Tienes cambios sin guardar en la escena actual. ¿Estás seguro de que quieres continuar? Se perderán los cambios.")) {
                return;
            }
        }
        try {
            const fileHandle = await currentDirectoryHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const content = await file.text();
            const sceneData = JSON.parse(content);

            currentScene = deserializeScene(sceneData);
            currentSceneFileHandle = fileHandle;
            dom.currentSceneName.textContent = fileName.replace('.ceScene', '');

            updateHierarchy();
            selectMateria(null);
            isSceneDirty = false;
        } catch (error) {
            console.error(`Error al cargar la escena '${fileName}':`, error);
        }
    };

    addFrameFromCanvas = function() {
        if (!currentAnimationAsset) {
            alert("No hay ningún asset de animación cargado.");
            return;
        }
        const dataUrl = dom.drawingCanvas.toDataURL();

        // Assume we're editing the first animation state for now
        if (currentAnimationAsset.animations && currentAnimationAsset.animations.length > 0) {
            currentAnimationAsset.animations[0].frames.push(dataUrl);
            populateTimeline();
        } else {
            alert("El asset de animación no tiene un estado de animación válido.");
        }

        // Clear canvas for next frame
        const ctx = dom.drawingCanvas.getContext('2d');
        ctx.clearRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);
    };

    function populateTimeline() {
        dom.animationTimeline.innerHTML = '';
        if (!currentAnimationAsset || !currentAnimationAsset.animations.length) return;

        // For now, we only edit the first animation state
        const animation = currentAnimationAsset.animations[0];
        if (!animation) return;

        animation.frames.forEach((frameData, index) => {
            const frameImg = document.createElement('img');
            frameImg.className = 'timeline-frame';
            if (index === currentFrameIndex) {
                frameImg.classList.add('active');
            }
            frameImg.src = frameData;
            frameImg.dataset.index = index;
            dom.animationTimeline.appendChild(frameImg);
        });
    }

    async function saveAnimationAsset() {
        if (!currentAnimationAsset || !currentAnimationFileHandle) {
            alert("No hay asset de animación cargado para guardar.");
            return;
        }
        try {
            const writable = await currentAnimationFileHandle.createWritable();
            const content = JSON.stringify(currentAnimationAsset, null, 2);
            await writable.write(content);
            await writable.close();
            console.log(`Asset '${currentAnimationFileHandle.name}' guardado.`);
            // Optional: add a visual confirmation (e.g., a temporary "Saved!" message)
        } catch (error) {
            console.error("Error al guardar el asset de animación:", error);
            alert("No se pudo guardar el archivo.");
        }
    }

    openAnimationAsset = async function(fileName) {
        try {
            currentAnimationFileHandle = await currentDirectoryHandle.getFileHandle(fileName);
            const file = await currentAnimationFileHandle.getFile();
            const content = await file.text();
            currentAnimationAsset = JSON.parse(content);

            dom.animationPanel.classList.remove('hidden');
            dom.animationPanelOverlay.classList.add('hidden');
            console.log(`Abierto ${fileName}:`, currentAnimationAsset);

            populateTimeline();

        } catch(error) {
            console.error(`Error al abrir el asset de animación '${fileName}':`, error);
        }
    };

    function resetAnimationPanel() {
        dom.animationPanelOverlay.classList.remove('hidden');
        currentAnimationAsset = null;
        currentFrameIndex = -1;
        dom.animationTimeline.innerHTML = '';
        stopAnimationPlayback();
    }

    function startAnimationPlayback() {
        if (isAnimationPlaying || !currentAnimationAsset) return;

        const animation = currentAnimationAsset.animations[0];
        if (!animation || !animation.frames.length) return;

        isAnimationPlaying = true;
        dom.animationEditView.classList.add('hidden');
        dom.animationPlaybackView.classList.remove('hidden');

        let startTime = performance.now();
        const playbackCtx = dom.animationPlaybackCanvas.getContext('2d');
        const frameImages = animation.frames.map(src => {
            const img = new Image();
            img.src = src;
            return img;
        });

        function playbackLoop(currentTime) {
            if (!isAnimationPlaying) return;

            const elapsedTime = currentTime - startTime;
            const frameDuration = 1000 / animation.speed;
            const currentFrame = Math.floor(elapsedTime / frameDuration) % frameImages.length;

            const img = frameImages[currentFrame];
            playbackCtx.clearRect(0, 0, dom.animationPlaybackCanvas.width, dom.animationPlaybackCanvas.height);
            if (img.complete) {
                playbackCtx.drawImage(img, 0, 0);
            }

            animationPlaybackId = requestAnimationFrame(playbackLoop);
        }
        animationPlaybackId = requestAnimationFrame(playbackLoop);
    }

    function stopAnimationPlayback() {
        if (!isAnimationPlaying) return;
        isAnimationPlaying = false;
        cancelAnimationFrame(animationPlaybackId);
        dom.animationEditView.classList.remove('hidden');
        dom.animationPlaybackView.classList.add('hidden');
    }

    openScriptInEditor = async function(fileName) {
        try {
            // Use the currently selected directory handle to find the file
            currentlyOpenFileHandle = await currentDirectoryHandle.getFileHandle(fileName);
            const file = await currentlyOpenFileHandle.getFile();
            const content = await file.text();

            if (!codeEditor) {
                // First time opening a file, initialize the editor
                codeEditor = new EditorView({
                    doc: content,
                    extensions: [basicSetup, javascript(), oneDark],
                    parent: dom.codemirrorContainer
                });
            } else {
                // Editor already exists, just update its content
                codeEditor.dispatch({
                    changes: {from: 0, to: codeEditor.state.doc.length, insert: content}
                });
            }

            // Switch to the code editor tab
            dom.scenePanel.querySelector('.view-toggle-btn[data-view="code-editor-content"]').click();
            console.log(`Abierto ${fileName} en el editor.`);

        } catch (error) {
            console.error(`Error al abrir el script '${fileName}':`, error);
            alert(`No se pudo abrir el script. Revisa la consola.`);
        }
    };

    const markdownConverter = new showdown.Converter();

    updateInspectorForAsset = async function(assetName) {
        if (!assetName) {
            dom.inspectorContent.innerHTML = `<p class="inspector-placeholder">Selecciona un asset</p>`;
            return;
        }

        dom.inspectorContent.innerHTML = `<h4>Asset: ${assetName}</h4>`;

        try {
            const fileHandle = await currentDirectoryHandle.getFileHandle(assetName);
            const file = await fileHandle.getFile();
            const content = await file.text();

            if (assetName.endsWith('.ces')) {
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.className = 'language-javascript';
                code.textContent = content;
                pre.appendChild(code);
                dom.inspectorContent.appendChild(pre);
            } else if (assetName.endsWith('.md')) {
                const html = markdownConverter.makeHtml(content);
                const preview = document.createElement('div');
                preview.className = 'markdown-preview';
                preview.innerHTML = html;
                dom.inspectorContent.appendChild(preview);
            } else if (assetName.endsWith('.png') || assetName.endsWith('.jpg')) {
                let metaData = { textureType: 'Sprite (2D and UI)' }; // Default
                try {
                    const metaFileHandle = await currentDirectoryHandle.getFileHandle(`${assetName}.meta`);
                    const metaFile = await metaFileHandle.getFile();
                    metaData = JSON.parse(await metaFile.text());
                } catch (e) {
                    // Meta file doesn't exist, will be created on first change.
                }

                const settingsContainer = document.createElement('div');
                settingsContainer.className = 'asset-settings';
                settingsContainer.innerHTML = `
                    <label for="texture-type">Texture Type</label>
                    <select id="texture-type" data-asset-name="${assetName}">
                        <option value="Default" ${metaData.textureType === 'Default' ? 'selected' : ''}>Default</option>
                        <option value="Sprite (2D and UI)" ${metaData.textureType === 'Sprite (2D and UI)' ? 'selected' : ''}>Sprite (2D and UI)</option>
                        <option value="Normal Map" ${metaData.textureType === 'Normal Map' ? 'selected' : ''}>Normal Map</option>
                    </select>
                    <hr>
                    <div class="preview-container">
                        <img src="${currentDirectoryHandle.name}/${assetName}" alt="Preview">
                    </div>
                `;
                dom.inspectorContent.appendChild(settingsContainer);
            } else if (assetName.endsWith('.cea')) {
                const animData = JSON.parse(content);
                const anim = animData.animations[0]; // Assume first animation

                const previewContainer = document.createElement('div');
                previewContainer.className = 'inspector-anim-preview';

                const frameCount = document.createElement('p');
                frameCount.textContent = `Fotogramas: ${anim.frames.length}`;

                const timeline = document.createElement('div');
                timeline.className = 'mini-timeline';
                anim.frames.forEach(frameSrc => {
                    const img = document.createElement('img');
                    img.src = frameSrc;
                    timeline.appendChild(img);
                });

                const controls = document.createElement('div');
                const playBtn = document.createElement('button');
                playBtn.textContent = '▶️ Play';

                let isPlaying = false;
                let playbackId = null;
                let currentFrame = 0;

                playBtn.addEventListener('click', () => {
                    isPlaying = !isPlaying;
                    if (isPlaying) {
                        playBtn.textContent = '⏹️ Stop';
                        let lastTime = performance.now();

                        function loop(time) {
                            if (!isPlaying) return;
                            if (time - lastTime > (1000 / anim.speed)) {
                                lastTime = time;
                                currentFrame = (currentFrame + 1) % anim.frames.length;
                                // Highlight the current frame in the mini-timeline
                                timeline.childNodes.forEach((node, i) => node.style.border = i === currentFrame ? '2px solid var(--accent-color)' : 'none');
                            }
                           playbackId = requestAnimationFrame(loop);
                        }
                        playbackId = requestAnimationFrame(loop);

                    } else {
                        playBtn.textContent = '▶️ Play';
                        cancelAnimationFrame(playbackId);
                        timeline.childNodes.forEach(node => node.style.border = 'none');
                    }
                });

                controls.appendChild(playBtn);
                previewContainer.appendChild(frameCount);
                previewContainer.appendChild(timeline);
                previewContainer.appendChild(controls);
                dom.inspectorContent.appendChild(previewContainer);

            } else {
                 dom.inspectorContent.innerHTML += `<p>No hay vista previa disponible para este tipo de archivo.</p>`;
            }

        } catch (error) {
            console.error(`Error al leer el asset '${assetName}':`, error);
            dom.inspectorContent.innerHTML += `<p class="error-message">No se pudo cargar el contenido del asset.</p>`;
        }
    };

    updateAssetBrowser = async function(selectHandle = null) {
        if (!projectsDirHandle || !dom.assetFolderTree || !dom.assetGridView) return;

        const folderTreeContainer = dom.assetFolderTree;
        const gridViewContainer = dom.assetGridView;

        folderTreeContainer.innerHTML = '';

        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

        if (!currentDirectoryHandle) {
             currentDirectoryHandle = assetsHandle;
        }

        async function handleDropOnFolder(targetFolderHandle, droppedData) {
            console.log(`Soltado ${droppedData.name} en ${targetFolderHandle.name}`);
            try {
                const sourceFileHandle = await currentDirectoryHandle.getFileHandle(droppedData.name);
                const file = await sourceFileHandle.getFile();

                const newFileHandle = await targetFolderHandle.getFileHandle(droppedData.name, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(file);
                await writable.close();

                // Now delete the old file
                await currentDirectoryHandle.removeEntry(droppedData.name);

                console.log(`Movido ${droppedData.name} a ${targetFolderHandle.name}`);
                await updateAssetBrowser();

            } catch (error) {
                console.error("Error al mover el archivo:", error);
                alert("No se pudo mover el archivo.");
            }
        }

        async function populateGridView(dirHandle) {
            gridViewContainer.innerHTML = '';
            // Store the handle on the element for context menus
            gridViewContainer.directoryHandle = dirHandle;

            for await (const entry of dirHandle.values()) {
                const item = document.createElement('div');
                item.className = 'grid-item';
                item.draggable = true;
                item.dataset.name = entry.name;
                item.dataset.kind = entry.kind;

                const icon = document.createElement('div');
                icon.className = 'icon';

                if (entry.kind === 'directory') {
                    icon.textContent = '📁';
                    item.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        item.classList.add('drag-over');
                    });
                    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
                    item.addEventListener('drop', async (e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Prevent drop from bubbling to parent
                        item.classList.remove('drag-over');
                        const droppedData = JSON.parse(e.dataTransfer.getData('text/plain'));
                        const targetFolderHandle = await dirHandle.getDirectoryHandle(entry.name);
                        handleDropOnFolder(targetFolderHandle, droppedData);
                    });
                } else if (entry.name.endsWith('.ces')) {
                    icon.textContent = '📜';
                } else if (entry.name.endsWith('.cea')) {
                    icon.textContent = '🎞️';
                } else if (entry.name.endsWith('.ceScene')) {
                    icon.textContent = '🎬';
                } else if (entry.name.endsWith('.cep')) {
                    icon.textContent = '📦';
                } else if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg')) {
                    icon.textContent = '🖼️';
                } else {
                    icon.textContent = '📄';
                }

                const name = document.createElement('div');
                name.className = 'name';
                name.textContent = entry.name;

                item.appendChild(icon);
                item.appendChild(name);
                gridViewContainer.appendChild(item);
            }
        }

        async function populateFolderTree(dirHandle, container, depth = 0) {
            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item';
            folderItem.textContent = dirHandle.name;
            folderItem.style.paddingLeft = `${depth * 15 + 5}px`;
            folderItem.directoryHandle = dirHandle; // Attach handle to element

            if (dirHandle.isSameEntry(currentDirectoryHandle)) {
                folderItem.classList.add('active');
            }

            folderItem.addEventListener('click', () => {
                currentDirectoryHandle = dirHandle;
                updateAssetBrowser(); // Re-render everything
            });

            folderItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                folderItem.classList.add('drag-over');
            });
            folderItem.addEventListener('dragleave', () => folderItem.classList.remove('drag-over'));
            folderItem.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                folderItem.classList.remove('drag-over');
                const droppedData = JSON.parse(e.dataTransfer.getData('text/plain'));
                handleDropOnFolder(dirHandle, droppedData);
            });

            container.appendChild(folderItem);

            // This container will hold the children, to allow for expand/collapse later
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'folder-children';
            folderItem.appendChild(childrenContainer); // Append to the item, not the main container

            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    await populateFolderTree(entry, childrenContainer, depth + 1);
                }
            }
        }

        try {
            await populateFolderTree(assetsHandle, folderTreeContainer);
            await populateGridView(currentDirectoryHandle);
        } catch (error) {
            console.error("Error updating asset browser:", error);
            gridViewContainer.innerHTML = '<p class="error-message">Could not load project assets.</p>';
        }
    };

    updateHierarchy = function() { dom.hierarchyContent.innerHTML = ''; const rootMaterias = currentScene.getRootMaterias(); function renderNode(materia, container, depth) { const item = document.createElement('div'); item.className = 'hierarchy-item'; item.dataset.id = materia.id; item.draggable = true; item.style.paddingLeft = `${depth * 18}px`; const nameSpan = document.createElement('span'); nameSpan.textContent = materia.name; item.appendChild(nameSpan); if (selectedMateria && materia.id === selectedMateria.id) item.classList.add('active'); container.appendChild(item); if (materia.children && materia.children.length > 0) { materia.children.forEach(child => { renderNode(child, container, depth + 1); }); } } rootMaterias.forEach(materia => renderNode(materia, dom.hierarchyContent, 0)); };
    updateInspector = function() {
        if (!dom.inspectorContent) return;
        dom.inspectorContent.innerHTML = '';
        if (!selectedMateria) {
            dom.inspectorContent.innerHTML = '<p class="inspector-placeholder">Nada seleccionado</p>';
            return;
        }

        // Name input
        dom.inspectorContent.innerHTML = `<label for="materia-name">Nombre</label><input type="text" id="materia-name" value="${selectedMateria.name}">`;

        // Components
        selectedMateria.leyes.forEach(ley => {
            let componentHTML = '';
            if (ley instanceof Transform) {
                componentHTML = `<h4>Transform</h4>
                <div class="component-grid">
                    <label>X</label><input type="number" class="prop-input" step="1" data-component="Transform" data-prop="x" value="${ley.x.toFixed(0)}">
                    <label>Y</label><input type="number" class="prop-input" step="1" data-component="Transform" data-prop="y" value="${ley.y.toFixed(0)}">
                    <label>Scale X</label><input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.x" value="${ley.scale.x.toFixed(1)}">
                    <label>Scale Y</label><input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.y" value="${ley.scale.y.toFixed(1)}">
                </div>`;
            } else if (ley instanceof Rigidbody) {
                componentHTML = `<h4>Rigidbody</h4>
                <div class="component-grid">
                    <label>Body Type</label>
                    <select class="prop-input" data-component="Rigidbody" data-prop="bodyType">
                        <option value="dynamic" ${ley.bodyType === 'dynamic' ? 'selected' : ''}>Dynamic</option>
                        <option value="static" ${ley.bodyType === 'static' ? 'selected' : ''}>Static</option>
                        <option value="kinematic" ${ley.bodyType === 'kinematic' ? 'selected' : ''}>Kinematic</option>
                    </select>
                    <label>Mass</label><input type="number" class="prop-input" step="0.1" data-component="Rigidbody" data-prop="mass" value="${ley.mass}">
                </div>`;
            } else if (ley instanceof BoxCollider) {
                componentHTML = `<h4>Box Collider</h4>
                <div class="component-grid">
                    <label>Width</label><input type="number" class="prop-input" step="0.1" data-component="BoxCollider" data-prop="width" value="${ley.width}">
                    <label>Height</label><input type="number" class="prop-input" step="0.1" data-component="BoxCollider" data-prop="height" value="${ley.height}">
                </div>`;
            } else if (ley instanceof SpriteRenderer) {
                const previewImg = ley.source ? `<img src="${ley.source}" alt="Preview">` : 'None';
                componentHTML = `<h4>Sprite Renderer</h4>
                <div class="component-grid">
                    <label>Sprite</label>
                    <div class="sprite-dropper">
                        <div class="sprite-preview" data-component="SpriteRenderer" data-prop="source">${previewImg}</div>
                        <button class="sprite-select-btn" data-component="SpriteRenderer">🎯</button>
                    </div>
                    <label>Color</label><input type="color" class="prop-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color}">
                </div>`;
            } else if (ley instanceof UICanvas) {
                componentHTML = '<h4>UI Canvas</h4>';
            } else if (ley instanceof UIText) {
                componentHTML = `<h4>UI Text</h4>
                <textarea class="prop-input" data-component="UIText" data-prop="text" rows="4">${ley.text}</textarea>
                <div class="text-transform-controls">
                    <button class="prop-btn ${ley.textTransform === 'none' ? 'active' : ''}" data-component="UIText" data-prop="textTransform" data-value="none">aA</button>
                    <button class="prop-btn ${ley.textTransform === 'uppercase' ? 'active' : ''}" data-component="UIText" data-prop="textTransform" data-value="uppercase">AA</button>
                    <button class="prop-btn ${ley.textTransform === 'lowercase' ? 'active' : ''}" data-component="UIText" data-prop="textTransform" data-value="lowercase">aa</button>
                </div>
                <div class="component-grid">
                    <label>Font Size</label><input type="number" class="prop-input" step="1" data-component="UIText" data-prop="fontSize" value="${ley.fontSize}">
                    <label>Color</label><input type="color" class="prop-input" data-component="UIText" data-prop="color" value="${ley.color}">
                </div>
                `;
            } else if (ley instanceof UIButton) {
                componentHTML = `<h4>UI Button</h4>
                <label>Etiqueta</label><input type="text" class="prop-input" data-component="UIButton" data-prop="label.text" value="${ley.label.text}">
                <label>Color</label><input type="color" class="prop-input" data-component="UIButton" data-prop="color" value="${ley.color}">`;
            } else if (ley instanceof CreativeScript) {
                componentHTML = `<h4>Creative Script</h4><div class="component-item script">${ley.scriptName}</div>`;
            } else if (ley instanceof Animator) {
                componentHTML = `<h4>Animator</h4>
                <p>Estado Actual: ${ley.currentState || 'Ninguno'}</p>
                <p>Asset de Animación: (Próximamente)</p>
                <button id="open-animator-btn">Abrir Editor de Animación</button>`;
            } else if (ley instanceof Camera) {
                componentHTML = `<h4>Camera</h4>
                <div class="component-grid">
                    <label>Orthographic Size</label>
                    <input type="number" class="prop-input" step="10" data-component="Camera" data-prop="orthographicSize" value="${ley.orthographicSize}">
                </div>`;
            }
            dom.inspectorContent.innerHTML += componentHTML;
        });

        // Add Component Button
        dom.inspectorContent.innerHTML += `<button id="add-component-btn" class="add-component-btn">Añadir Ley</button>`;

        // Add event listeners for the new inputs
        document.getElementById('materia-name').addEventListener('change', e => {
            if(selectedMateria) {
                selectedMateria.name = e.target.value;
                updateHierarchy();
            }
        });
        dom.inspectorContent.querySelectorAll('.prop-input').forEach(input => {
            input.addEventListener('change', (e) => {
                if (!selectedMateria) return;
                const componentName = e.target.dataset.component;
                const propName = e.target.dataset.prop;
                let value = e.target.value;

                // This is a security risk in production, but acceptable for this tool's context.
                const ComponentClass = window[componentName] || eval(componentName);
                if (!ComponentClass) return;

                const component = selectedMateria.getComponent(ComponentClass);
                if (component) {
                    if (e.target.type === 'number') {
                        value = parseFloat(value) || 0;
                    }

                    const props = propName.split('.');
                    if (component instanceof SpriteRenderer && propName === 'source') {
                        component.setSource(value);
                    } else if (props.length > 1) {
                        // Handles nested properties like 'label.text' for UIButton
                        let obj = component;
                        for (let i = 0; i < props.length - 1; i++) {
                            obj = obj[props[i]];
                        }
                        obj[props[props.length - 1]] = value;
                    } else {
                        component[propName] = value;
                    }
                    updateScene(); // Re-render scene if a visual property changed
                }
            });
        });
        document.getElementById('add-component-btn').addEventListener('click', showAddComponentModal);

        dom.inspectorContent.querySelectorAll('.prop-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                if (!selectedMateria) return;
                const componentName = e.target.dataset.component;
                const propName = e.target.dataset.prop;
                const value = e.target.dataset.value;

                const ComponentClass = window[componentName] || eval(componentName);
                if (!ComponentClass) return;

                const component = selectedMateria.getComponent(ComponentClass);
                if (component) {
                    component[propName] = value;
                    updateInspector(); // Re-render inspector to update active state
                    updateScene();
                }
            });
        });
    };

    updateScene = function(targetRenderer, isGameView = false) {
        if (!targetRenderer) return;
        targetRenderer.begin();

        // Draw a grid for reference only in the editor scene view
        if (!isGameView) {
            const gridSize = 50;
            const halfWidth = targetRenderer.canvas.width / targetRenderer.camera.zoom;
            const halfHeight = targetRenderer.canvas.height / targetRenderer.camera.zoom;
            const startX = Math.floor((targetRenderer.camera.x - halfWidth) / gridSize) * gridSize;
            const endX = Math.ceil((targetRenderer.camera.x + halfWidth) / gridSize) * gridSize;
            const startY = Math.floor((targetRenderer.camera.y - halfHeight) / gridSize) * gridSize;
            const endY = Math.ceil((targetRenderer.camera.y + halfHeight) / gridSize) * gridSize;

            targetRenderer.ctx.strokeStyle = '#3a3a3a';
            targetRenderer.ctx.lineWidth = 1 / targetRenderer.camera.zoom;
            targetRenderer.ctx.beginPath();
            for (let x = startX; x <= endX; x += gridSize) {
                targetRenderer.ctx.moveTo(x, startY);
                targetRenderer.ctx.lineTo(x, endY);
            }
            for (let y = startY; y <= endY; y += gridSize) {
                targetRenderer.ctx.moveTo(startX, y);
                targetRenderer.ctx.lineTo(endX, y);
            }
            targetRenderer.ctx.stroke();
        }

        // Draw Materias
        currentScene.materias.forEach(materia => {
            const transform = materia.getComponent(Transform);
            if (!transform) return;

            let drawn = false;
            const spriteRenderer = materia.getComponent(SpriteRenderer);
            if (spriteRenderer && spriteRenderer.sprite.complete && spriteRenderer.sprite.naturalHeight !== 0) {
                targetRenderer.drawImage(spriteRenderer.sprite, transform.x, transform.y, 100 * transform.scale.x, 100 * transform.scale.y);
                drawn = true;
            }

            const boxCollider = materia.getComponent(BoxCollider);
            if (boxCollider) {
                if (!drawn) {
                    targetRenderer.drawRect(transform.x, transform.y, boxCollider.width * transform.scale.x, boxCollider.height * transform.scale.y, 'rgba(144, 238, 144, 0.5)');
                }
            }

            const uiText = materia.getComponent(UIText);
            if (uiText) {
                targetRenderer.drawText(uiText.text, transform.x, transform.y, uiText.color, uiText.fontSize, uiText.textTransform);
                drawn = true;
            }

            if (!drawn && !boxCollider) {
                 targetRenderer.drawRect(transform.x, transform.y, 20 * transform.scale.x, 20 * transform.scale.y, 'rgba(128, 128, 128, 0.5)');
            }

            // Draw selection outline only in the editor scene view
            if (!isGameView) {
                if (selectedMateria && selectedMateria.id === materia.id) {
                    targetRenderer.ctx.strokeStyle = 'yellow';
                    targetRenderer.ctx.lineWidth = 2 / targetRenderer.camera.effectiveZoom;
                    let selectionWidth = boxCollider ? boxCollider.width : (spriteRenderer ? 100 : 20);
                    let selectionHeight = boxCollider ? boxCollider.height : (spriteRenderer ? 100 : 20);

                    selectionWidth *= transform.scale.x;
                    selectionHeight *= transform.scale.y;

                    targetRenderer.ctx.strokeRect(transform.x - selectionWidth / 2, transform.y - selectionHeight / 2, selectionWidth, selectionHeight);
                }
                // Draw gizmos for all materias in the scene view
                drawGizmos(targetRenderer, materia);
            }
        });

        targetRenderer.end();
    };

    selectMateria = function(materiaId) {
        // When a materia is selected, deselect any asset
        const currentActiveAsset = dom.assetsContent.querySelector('.asset-item.active');
        if (currentActiveAsset) {
            currentActiveAsset.classList.remove('active');
        }

        if (materiaId === null) {
            selectedMateria = null;
        } else {
            selectedMateria = currentScene.findMateriaById(materiaId) || null;
        }
        updateHierarchy();
        updateInspector(); // This will now show the materia inspector
        if (renderer) {
            updateScene(renderer, false);
        }
    };

    const availableComponents = {
        'Renderizado': [SpriteRenderer],
        'Animación': [Animator],
        'Cámara': [Camera],
        'Físicas': [Rigidbody, BoxCollider],
        'UI': [UICanvas, UIText, UIButton],
        'Scripting': [CreativeScript]
    };

    showAddComponentModal = function() {
        if (!selectedMateria) return;
        dom.componentList.innerHTML = '';

        for (const category in availableComponents) {
            const categoryHeader = document.createElement('h4');
            categoryHeader.textContent = category;
            dom.componentList.appendChild(categoryHeader);

            availableComponents[category].forEach(ComponentClass => {
                // Don't show option if component already exists on the materia
                if (selectedMateria.getComponent(ComponentClass)) {
                    return;
                }

                const componentItem = document.createElement('div');
                componentItem.className = 'component-item';
                componentItem.textContent = ComponentClass.name;
                componentItem.addEventListener('click', async () => {
                    // Special case for script
                    if (ComponentClass === CreativeScript) {
                        let scriptName = prompt("Introduce el nombre del nuevo script (ej: PlayerMovement):");
                        if (scriptName) {
                            // Sanitize and add extension
                            scriptName = scriptName.replace(/\.ces$/, '') + '.ces';

                            const scriptTemplate = `// Script para ${selectedMateria.name}
function start() {
    // Se ejecuta una vez al iniciar
    console.log("¡El script ha comenzado!");
};

function update(deltaTime) {
    // Se ejecuta en cada frame
};
`;
                            try {
                                const projectName = new URLSearchParams(window.location.search).get('project');
                                const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
                                const fileHandle = await projectHandle.getFileHandle(scriptName, { create: true });
                                const writable = await fileHandle.createWritable();
                                await writable.write(scriptTemplate);
                                await writable.close();

                                const newScript = new CreativeScript(selectedMateria, scriptName);
                                selectedMateria.addComponent(newScript);
                                console.log(`Script '${scriptName}' creado y añadido.`);
                                await updateAssetBrowser(); // Refresh asset browser
                            } catch(err) {
                                console.error(`Error al crear el script '${scriptName}':`, err);
                                alert(`No se pudo crear el script. Revisa la consola para más detalles.`);
                            }
                        }
                    } else {
                        selectedMateria.addComponent(new ComponentClass(selectedMateria));
                    }

                    dom.addComponentModal.style.display = 'none';
                    updateInspector();
                });
                dom.componentList.appendChild(componentItem);
            });
        }

        dom.addComponentModal.style.display = 'block';
    };

    updateDebugPanel = function() {
        if (!dom.debugContent) return;

        // Input State
        const pos = InputManager.getMousePosition();
        const canvasPos = InputManager.getMousePositionInCanvas();
        const leftButton = InputManager.getMouseButton(0) ? 'DOWN' : 'UP';
        const rightButton = InputManager.getMouseButton(2) ? 'DOWN' : 'UP';
        const pressedKeys = InputManager.getPressedKeys().join(', ') || 'Ninguna';

        // Editor State
        const selectedMateriaName = selectedMateria ? `${selectedMateria.name} (ID: ${selectedMateria.id})` : 'Ninguna';
        const gameRunningStatus = isGameRunning ? 'Sí' : 'No';

        // Performance
        const fps = deltaTime > 0 ? (1.0 / deltaTime).toFixed(1) : '...';
        const dtMs = (deltaTime * 1000).toFixed(2);

        // Scene Stats
        const totalMaterias = currentScene.materias.length;
        const rootMaterias = currentScene.getRootMaterias().length;

        dom.debugContent.innerHTML = `
            <div class="debug-section">
                <h4>Estado del Editor</h4>
                <pre>Herramienta Activa: ${activeTool}\nSelección: ${selectedMateriaName}\nJuego Corriendo: ${gameRunningStatus}</pre>
            </div>
            <div class="debug-section">
                <h4>Rendimiento</h4>
                <pre>FPS: ${fps}\nDeltaTime: ${dtMs} ms</pre>
            </div>
            <div class="debug-section">
                <h4>Estadísticas de Escena</h4>
                <pre>Materias Totales: ${totalMaterias}\nMaterias Raíz: ${rootMaterias}</pre>
            </div>
            <div class="debug-section">
                <h4>Input</h4>
                <pre>Mouse (Scene): X=${canvasPos.x.toFixed(0)}, Y=${canvasPos.y.toFixed(0)}\nBotones: L:${leftButton} R:${rightButton}\nTeclas: ${pressedKeys}</pre>
            </div>
        `;
    };

    runGameLoop = function() {
        // Update physics
        if (physicsSystem) {
            physicsSystem.update(deltaTime);
        }

        // Update all game objects scripts
        for (const materia of currentScene.materias) {
            materia.update(deltaTime);
        }
    };

    const editorLoop = (timestamp) => {
        // Calculate deltaTime
        if (lastFrameTime > 0) {
            deltaTime = (timestamp - lastFrameTime) / 1000;
        }
        lastFrameTime = timestamp;

        InputManager.update();
        updateDebugPanel();

        if (isGameRunning) {
            runGameLoop(); // This handles the logic update
            // When game is running, update both views
            if (renderer) updateScene(renderer, false); // Editor view with gizmos
            if (gameRenderer) updateScene(gameRenderer, true); // Game view clean
        } else {
            // When paused, only update the currently active view
            if (activeView === 'scene-content' && renderer) {
                updateScene(renderer, false);
            } else if (activeView === 'game-content' && gameRenderer) {
                updateScene(gameRenderer, true);
            }
        }

        editorLoopId = requestAnimationFrame(editorLoop);
    };

    startGame = function() {
        if (isGameRunning) return;
        isGameRunning = true;
        lastFrameTime = performance.now();
        console.log("Game Started");
        // The main editorLoop will now call runGameLoop
    };

    stopGame = function() {
        if (!isGameRunning) return;
        isGameRunning = false;
        console.log("Game Stopped");
    };

    // --- 6. Event Listeners & Handlers ---
    let setActiveTool; // Will be defined in setupEventListeners
    let createNewScript; // To be defined

    function updateWindowMenuUI() {
        for (const panelName in panelVisibility) {
            const menuItem = document.getElementById(`menu-window-${panelName}`);
            if (menuItem) {
                const isVisible = panelVisibility[panelName];
                if (isVisible) {
                    menuItem.textContent = `✓ ${menuItem.dataset.baseName || menuItem.textContent.replace('✓ ', '')}`;
                    if(!menuItem.dataset.baseName) menuItem.dataset.baseName = menuItem.textContent.replace('✓ ', '');
                } else {
                    menuItem.textContent = menuItem.dataset.baseName || menuItem.textContent.replace('✓ ', '');
                }
            }
        }
    }

    function updateEditorLayout() {
        const mainContent = dom.editorMainContent;
        mainContent.classList.toggle('no-hierarchy', !panelVisibility.hierarchy);
        mainContent.classList.toggle('no-inspector', !panelVisibility.inspector);
        mainContent.classList.toggle('no-assets', !panelVisibility.assets);

        // The renderer needs to be resized after the layout changes
        if(renderer) {
            // Delay resize slightly to allow CSS to apply
            setTimeout(() => renderer.resize(), 50);
        }
    }

    function createEmptyMateria(name = 'Objeto Vacío') {
        const newMateria = new Materia(name);
        currentScene.addMateria(newMateria);
        updateHierarchy();
        selectMateria(newMateria.id);
    }

    function showContextMenu(menu, e) {
        // First, hide any other context menus
        dom.contextMenu.style.display = 'none';
        dom.hierarchyContextMenu.style.display = 'none';

        menu.style.display = 'block';
        let x = e.clientX;
        let y = e.clientY;

        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (x + menuWidth > windowWidth) {
            x = windowWidth - menuWidth - 5;
        }
        if (y + menuHeight > windowHeight) {
            y = windowHeight - menuHeight - 5;
        }

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        // Check and reposition submenus
        const submenus = menu.querySelectorAll('.submenu');
        submenus.forEach(submenu => {
            const parentItem = submenu.parentElement.getBoundingClientRect();
            const submenuHeight = submenu.offsetHeight; // This might be 0 if not displayed, need to temporarily show it

            // Temporarily display to measure
            submenu.style.visibility = 'hidden';
            submenu.style.display = 'block';
            const realHeight = submenu.offsetHeight;
            submenu.style.visibility = '';
            submenu.style.display = '';

            if (parentItem.top + realHeight > windowHeight) {
                submenu.classList.add('submenu-up');
            } else {
                submenu.classList.remove('submenu-up');
            }
        });
    }

    function hideContextMenus() {
        dom.contextMenu.style.display = 'none';
        dom.hierarchyContextMenu.style.display = 'none';
    }

    createNewScript = async function(directoryHandle) {
        if (!directoryHandle) {
            alert("No se ha seleccionado ninguna carpeta.");
            return;
        }
        let scriptName = prompt("Introduce el nombre del nuevo script (ej: PlayerMovement):");
        if (!scriptName) return;

        // Sanitize and add extension
        scriptName = scriptName.replace(/\.ces$/, '') + '.ces';

        const scriptTemplate = `// Script creado en Creative Engine
function start() {
    // Se ejecuta una vez al iniciar
    console.log("¡El script ha comenzado!");
};

function update(deltaTime) {
    // Se ejecuta en cada frame
};
`;
        try {
            const fileHandle = await directoryHandle.getFileHandle(scriptName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(scriptTemplate);
            await writable.close();

            console.log(`Script '${scriptName}' creado en ${directoryHandle.name}.`);
            await updateAssetBrowser(); // Refresh asset browser
        } catch(err) {
            console.error(`Error al crear el script '${scriptName}':`, err);
            alert(`No se pudo crear el script. Revisa la consola para más detalles.`);
        }
    };

    saveCurrentScript = async function() {
        if (currentlyOpenFileHandle && codeEditor) {
            try {
                const content = codeEditor.state.doc.toString();
                const writable = await currentlyOpenFileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                console.log(`Script guardado: ${currentlyOpenFileHandle.name}`);
                // Optional: Add a visual confirmation
            } catch (error) {
                console.error(`Error al guardar el archivo ${currentlyOpenFileHandle.name}:`, error);
            }
        } else {
            console.warn("No hay ningún archivo abierto o el editor de código no está activo.");
        }
    };

    function handleKeyboardShortcuts(e) {
        // Ctrl+S or Cmd+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (dom.codeEditorContent.classList.contains('active')) {
                 saveCurrentScript();
            }
        }

        // Ctrl+P or Cmd+P to Play/Stop
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            if (isGameRunning) {
                stopGame();
            } else {
                startGame();
            }
        }

        // Tool switching only if not typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        switch(e.key.toLowerCase()) {
            case 'q':
                setActiveTool('move');
                break;
            case 'w':
                setActiveTool('pan');
                break;
            case 'e':
                setActiveTool('scale');
                break;
        }
    }

    const GIZMO_HANDLE_SIZE = 10; // In screen pixels

    function drawGizmos(renderer, materia) {
        const transform = materia.getComponent(Transform);
        if (!transform) return;

        // Draw camera gizmo for any materia with a Camera component, if not selected
        if (materia.getComponent(Camera) && (!selectedMateria || selectedMateria.id !== materia.id)) {
            renderer.ctx.font = `${40 / renderer.camera.effectiveZoom}px sans-serif`;
            renderer.ctx.textAlign = 'center';
            renderer.ctx.fillText('📷', transform.x, transform.y);
        }

        if (!selectedMateria || selectedMateria.id !== materia.id) {
            return; // Only draw manipulation gizmos for the selected materia
        }

        const ctx = renderer.ctx;
        const camera = renderer.camera;

        // Gizmo positions are in world space, but their size is constant on screen
        const handleScreenSize = GIZMO_HANDLE_SIZE / camera.zoom;
        const halfHandleSize = handleScreenSize / 2;

        const w = (selectedMateria.getComponent(BoxCollider)?.width ?? 100) * transform.scale.x;
        const h = (selectedMateria.getComponent(BoxCollider)?.height ?? 100) * transform.scale.y;
        const x = transform.x;
        const y = transform.y;

        ctx.save();
        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2 / camera.zoom;

        if (activeTool === 'move') {
            // Y-axis arrow
            ctx.fillStyle = 'green';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - h / 2 - handleScreenSize * 2);
            ctx.stroke();
            ctx.moveTo(x, y - h / 2 - handleScreenSize * 2);
            ctx.lineTo(x - handleScreenSize, y - h/2 - handleScreenSize);
            ctx.lineTo(x + handleScreenSize, y - h/2 - handleScreenSize);
            ctx.closePath();
            ctx.fill();

            // X-axis arrow
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + w / 2 + handleScreenSize * 2, y);
            ctx.stroke();
            ctx.moveTo(x + w / 2 + handleScreenSize * 2, y);
            ctx.lineTo(x + w/2 + handleScreenSize, y - handleScreenSize);
            ctx.lineTo(x + w/2 + handleScreenSize, y + handleScreenSize);
            ctx.closePath();
            ctx.fill();
        } else if (activeTool === 'scale') {
            ctx.fillStyle = 'blue';
            // Top-left
            ctx.fillRect(x - w/2 - halfHandleSize, y - h/2 - halfHandleSize, handleScreenSize, handleScreenSize);
            // Top-right
            ctx.fillRect(x + w/2 - halfHandleSize, y - h/2 - halfHandleSize, handleScreenSize, handleScreenSize);
            // Bottom-left
            ctx.fillRect(x - w/2 - halfHandleSize, y + h/2 - halfHandleSize, handleScreenSize, handleScreenSize);
            // Bottom-right
            ctx.fillRect(x + w/2 - halfHandleSize, y + h/2 - halfHandleSize, handleScreenSize, handleScreenSize);
        }

        ctx.restore();
    }

    function getGizmoHandleAt(worldPos, materia, renderer) {
        const transform = materia.getComponent(Transform);
        if (!transform) return null;

        const handleScreenSize = GIZMO_HANDLE_SIZE / renderer.camera.zoom;
        const w = (selectedMateria.getComponent(BoxCollider)?.width ?? 100) * transform.scale.x;
        const h = (selectedMateria.getComponent(BoxCollider)?.height ?? 100) * transform.scale.y;
        const x = transform.x;
        const y = transform.y;

        const checkRect = (px, py) => {
            return worldPos.x >= px - handleScreenSize/2 && worldPos.x <= px + handleScreenSize/2 &&
                   worldPos.y >= py - handleScreenSize/2 && worldPos.y <= py + handleScreenSize/2;
        };

        if (activeTool === 'scale') {
            if (checkRect(x - w / 2, y - h / 2)) return 'scale-tl';
            if (checkRect(x + w / 2, y - h / 2)) return 'scale-tr';
            if (checkRect(x - w / 2, y + h / 2)) return 'scale-bl';
            if (checkRect(x + w / 2, y + h / 2)) return 'scale-br';
        } else if (activeTool === 'move') {
            // A larger hit area for the arrows
            const arrowLength = h / 2 + handleScreenSize * 2;
            const arrowWidth = w / 2 + handleScreenSize * 2;
            if (worldPos.x > x && worldPos.x < x + arrowWidth && Math.abs(worldPos.y - y) < handleScreenSize) return 'move-x';
            if (worldPos.y < y && worldPos.y > y - arrowLength && Math.abs(worldPos.x - x) < handleScreenSize) return 'move-y';
        }

        // Check if clicking the object itself for a move action
        if (worldPos.x >= x - w/2 && worldPos.x <= x + w/2 && worldPos.y >= y - h/2 && worldPos.y <= y + h/2) {
            return 'move-body';
        }

        return null;
    }

    function setupEventListeners() {
        // --- Hierarchy Drag and Drop ---
        const hierarchyContent = dom.hierarchyContent;

        hierarchyContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            hierarchyContent.classList.add('drag-over');
        });

        hierarchyContent.addEventListener('dragleave', (e) => {
            hierarchyContent.classList.remove('drag-over');
        });

        hierarchyContent.addEventListener('drop', (e) => {
            e.preventDefault();
            hierarchyContent.classList.remove('drag-over');
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));

            if (data.name.endsWith('.png') || data.name.endsWith('.jpg')) {
                const newMateria = new Materia(data.name.split('.')[0]);
                const spriteRenderer = new SpriteRenderer(newMateria);

                // We need to construct the full path to the asset
                // This is a simplification; a real engine might need a more robust path system
                const assetPath = `${currentDirectoryHandle.name}/${data.name}`;
                spriteRenderer.setSource(assetPath);

                newMateria.addComponent(spriteRenderer);
                currentScene.addMateria(newMateria);
                updateHierarchy();
                selectMateria(newMateria.id);
                console.log(`Creada nueva Materia '${newMateria.name}' desde el sprite '${data.name}'.`);
            } else {
                console.log(`El tipo de archivo '${data.name}' no se puede soltar en la jerarquía.`);
            }
        });


        // --- Asset Browser Listeners ---
        const gridView = dom.assetGridView;

        gridView.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.grid-item');
            if (item) {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    name: item.dataset.name,
                    kind: item.dataset.kind
                }));
                e.dataTransfer.effectAllowed = 'copy';
            }
        });

        // Double-click to open script or enter folder
        gridView.addEventListener('dblclick', async (e) => {
            const item = e.target.closest('.grid-item');
            if (!item) return;

            const name = item.dataset.name;
            const kind = item.dataset.kind;

            if (kind === 'directory') {
                currentDirectoryHandle = await currentDirectoryHandle.getDirectoryHandle(name);
                updateAssetBrowser();
            } else if (name.endsWith('.ces')) {
                await openScriptInEditor(name);
            } else if (name.endsWith('.cea')) {
                await openAnimationAsset(name);
            } else if (name.endsWith('.ceScene')) {
                await loadScene(name);
            }
        });

        // Tool selection
        const toolMoveBtn = document.getElementById('tool-move');
        const toolPanBtn = document.getElementById('tool-pan');
        const toolScaleBtn = document.getElementById('tool-scale');
        setActiveTool = (toolName) => {
            activeTool = toolName;
            toolMoveBtn.classList.toggle('active', toolName === 'move');
            toolPanBtn.classList.toggle('active', toolName === 'pan');
            toolScaleBtn.classList.toggle('active', toolName === 'scale');
            console.log(`Herramienta activa: ${activeTool}`);
        };
        toolMoveBtn.addEventListener('click', () => setActiveTool('move'));
        toolPanBtn.addEventListener('click', () => setActiveTool('pan'));
        toolScaleBtn.addEventListener('click', () => setActiveTool('scale'));


        // Global deselection
        dom.editorContainer.addEventListener('mousedown', (e) => {
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

        // Global Keyboard Shortcuts
        window.addEventListener('keydown', handleKeyboardShortcuts);

        // Hierarchy item selection & drag/drop
        const hierarchyContent = dom.hierarchyContent;
        hierarchyContent.addEventListener('click', (e) => {
            const item = e.target.closest('.hierarchy-item');
            if (item) {
                const materiaId = parseInt(item.dataset.id, 10);
                selectMateria(materiaId);
            }
        });

        hierarchyContent.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.hierarchy-item');
            if(item) {
                e.dataTransfer.setData('text/plain', item.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        hierarchyContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            const item = e.target.closest('.hierarchy-item');
            if(item) {
                 // Simple visual feedback
                document.querySelectorAll('.hierarchy-item.drag-over').forEach(i => i.classList.remove('drag-over'));
                item.classList.add('drag-over');
            }
        });

        hierarchyContent.addEventListener('dragleave', (e) => {
            const item = e.target.closest('.hierarchy-item');
            if(item) item.classList.remove('drag-over');
        });

        hierarchyContent.addEventListener('drop', (e) => {
            e.preventDefault();
            document.querySelectorAll('.hierarchy-item.drag-over').forEach(i => i.classList.remove('drag-over'));

            const targetItem = e.target.closest('.hierarchy-item');
            const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);

            if (targetItem) {
                const targetId = parseInt(targetItem.dataset.id, 10);
                if (draggedId !== targetId) { // Can't parent to self
                    const draggedMateria = currentScene.findMateriaById(draggedId);
                    const targetMateria = currentScene.findMateriaById(targetId);
                    if (draggedMateria && targetMateria) {
                        targetMateria.addChild(draggedMateria);
                        updateHierarchy();
                    }
                }
            }
        });

        // --- Scene Canvas Mouse Listeners for Tools ---
        dom.sceneCanvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only handle left-clicks
            if (!renderer.camera) return;

            const worldPos = Input.getMouseWorldPosition(renderer.camera, dom.sceneCanvas);

            if (activeTool === 'pan') {
                isPanning = true;
                dom.sceneCanvas.classList.add('is-panning');
                lastMousePosition = { x: e.clientX, y: e.clientY };
                return;
            }

            let handle = null;
            if (selectedMateria) {
                handle = getGizmoHandleAt(worldPos, selectedMateria, renderer);
            }

            if (handle) {
                isDragging = true;
                const transform = selectedMateria.getComponent(Transform);
                dragState = {
                    handle,
                    materia: selectedMateria,
                    initialX: transform.x,
                    initialY: transform.y,
                    initialScaleX: transform.scale.x,
                    initialScaleY: transform.scale.y,
                    startMouseX: worldPos.x,
                    startMouseY: worldPos.y,
                };
            } else {
                // If not clicking a handle, we might be starting a pan or selecting a new materia
                let clickedMateria = null;
                for (const materia of [...currentScene.materias].reverse()) {
                    if (getGizmoHandleAt(worldPos, materia, renderer) === 'move-body') {
                        clickedMateria = materia;
                        break;
                    }
                }

                if (clickedMateria) {
                    selectMateria(clickedMateria.id);
                } else {
                    // This is a click on an empty area, start panning
                    isPanning = true;
                    dom.sceneCanvas.classList.add('is-panning');
                    lastMousePosition = { x: e.clientX, y: e.clientY };
                    selectMateria(null);
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const dx = (e.clientX - lastMousePosition.x) / renderer.camera.effectiveZoom;
                const dy = (e.clientY - lastMousePosition.y) / renderer.camera.effectiveZoom;
                const camMateria = currentScene.findFirstCamera();
                if(camMateria) {
                    const camTransform = camMateria.getComponent(Transform);
                    camTransform.x -= dx;
                    camTransform.y -= dy;
                }
                lastMousePosition = { x: e.clientX, y: e.clientY };
                updateScene(renderer, false); // Re-render on pan
            }

            if (isDragging) {
                if (!renderer.camera) return;
                const worldPos = Input.getMouseWorldPosition(renderer.camera, dom.sceneCanvas);
                const dx = worldPos.x - dragState.startMouseX;
                const dy = worldPos.y - dragState.startMouseY;
                const transform = dragState.materia.getComponent(Transform);

                if (dragState.handle.startsWith('move')) {
                     if (dragState.handle === 'move-x' || dragState.handle === 'move-body') {
                        transform.x = dragState.initialX + dx;
                     }
                     if (dragState.handle === 'move-y' || dragState.handle === 'move-body') {
                        transform.y = dragState.initialY + dy;
                     }
                } else if (dragState.handle.startsWith('scale')) {
                    // This scaling logic is simplified and might not feel perfect with pivots.
                    const newScaleX = dragState.initialScaleX + (dx / 100);
                    const newScaleY = dragState.initialScaleY - (dy / 100); // Invert Y
                    transform.scale.x = Math.max(0.1, newScaleX);
                    transform.scale.y = Math.max(0.1, newScaleY);
                }

                updateInspector();
                updateScene(renderer, false);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (isPanning) {
                dom.sceneCanvas.classList.remove('is-panning');
            }
            isPanning = false;
            isDragging = false;
            dragState = {};
        });

        // Modal close buttons
        dom.addComponentModal.querySelector('.close-button').addEventListener('click', () => {
            dom.addComponentModal.style.display = 'none';
        });

        // Canvas resizing
        window.addEventListener('resize', () => {
            if (renderer) renderer.resize();
            if (gameRenderer) gameRenderer.resize();
        });

        // Single-click to select asset
        gridView.addEventListener('click', (e) => {
            const item = e.target.closest('.grid-item');

            // De-select all others
            gridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));

            if (item) {
                selectMateria(null); // Deselect any materia
                item.classList.add('active');
                updateInspectorForAsset(item.dataset.name);
            } else {
                 // Clicked on background, show current folder info
                 updateInspectorForAsset(null);
            }
        });

        // Custom Context Menu handler for assets
        gridView.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            const item = e.target.closest('.grid-item');
            const exportOption = dom.contextMenu.querySelector('[data-action="export-package"]');
            const exportDivider = dom.contextMenu.querySelector('.folder-only-divider');

            if (item && item.dataset.kind === 'directory') {
                // Right-clicked on a folder, select it and show export option
                gridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                updateInspectorForAsset(item.dataset.name);
                exportOption.style.display = 'block';
                exportDivider.style.display = 'block';
            } else if (item) {
                 // Right-clicked on a file
                gridView.querySelectorAll('.grid-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                updateInspectorForAsset(item.dataset.name);
                exportOption.style.display = 'none';
                exportDivider.style.display = 'none';
            } else {
                // Right-clicked on empty space
                exportOption.style.display = 'none';
                exportDivider.style.display = 'none';
            }

            showContextMenu(dom.contextMenu, e);
        });

        // Custom Context Menu handler for hierarchy
        dom.hierarchyContent.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(dom.hierarchyContextMenu, e);
        });

        // Inspector button delegation & Drag/Drop
        dom.inspectorPanel.addEventListener('click', (e) => {
            if (e.target.id === 'open-animator-btn') {
                dom.animationPanel.classList.remove('hidden');
            } else if (e.target.matches('.sprite-select-btn')) {
                openSpriteSelector();
            }
        });

        dom.inspectorPanel.addEventListener('dragover', (e) => {
            const dropTarget = e.target.closest('.sprite-preview');
            if (dropTarget) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                dropTarget.classList.add('drag-over');
            }
        });

        dom.inspectorPanel.addEventListener('dragleave', (e) => {
            const dropTarget = e.target.closest('.sprite-preview');
            if (dropTarget) {
                dropTarget.classList.remove('drag-over');
            }
        });

        dom.inspectorPanel.addEventListener('change', (e) => {
            if(e.target.id === 'texture-type') {
                const assetName = e.target.dataset.assetName;
                const newType = e.target.value;
                saveAssetMeta(assetName, { textureType: newType });
            }
        });

        dom.inspectorPanel.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropTarget = e.target.closest('.sprite-preview');
            if (dropTarget) {
                dropTarget.classList.remove('drag-over');
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.name.endsWith('.png') || data.name.endsWith('.jpg')) {
                    if (selectedMateria) {
                        const spriteRenderer = selectedMateria.getComponent(SpriteRenderer);
                        if (spriteRenderer) {
                            const assetPath = `${currentDirectoryHandle.name}/${data.name}`;
                            spriteRenderer.setSource(assetPath);
                            updateInspector();
                            updateScene(renderer, false);
                        }
                    }
                } else {
                    alert("Solo se pueden asignar archivos .png o .jpg como sprites.");
                }
            }
        });

        // Disable default context menus on other panels
        dom.scenePanel.addEventListener('contextmenu', e => e.preventDefault());
        dom.inspectorPanel.addEventListener('contextmenu', e => e.preventDefault());

        // Hide context menu on left-click
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('.menu-btn')) {
                hideContextMenus();
                dom.menubar.querySelectorAll('.menu-content').forEach(mc => mc.classList.remove('visible'));
            }
        });

        // Hierarchy Context Menu Actions
        dom.hierarchyContextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            switch (action) {
                case 'create-empty':
                    createEmptyMateria();
                    break;
                case 'create-materia':
                    createEmptyMateria('Materia');
                    break;
                case 'create-ui-canvas': {
                    const canvasMateria = new Materia('Canvas');
                    canvasMateria.addComponent(new UICanvas(canvasMateria));
                    currentScene.addMateria(canvasMateria);
                    updateHierarchy();
                    selectMateria(canvasMateria.id);
                    break;
                }
                case 'create-ui-text': {
                    const textMateria = new Materia('Texto');
                    textMateria.addComponent(new UIText(textMateria));
                    currentScene.addMateria(textMateria);
                    updateHierarchy();
                    selectMateria(textMateria.id);
                    break;
                }
                case 'create-ui-button': {
                    const buttonMateria = new Materia('Botón');
                    buttonMateria.addComponent(new UIButton(buttonMateria));
                    currentScene.addMateria(buttonMateria);
                    updateHierarchy();
                    selectMateria(buttonMateria.id);
                    break;
                }
                case 'create-ui-image': {
                    const imageMateria = new Materia('Imagen');
                    imageMateria.addComponent(new SpriteRenderer(imageMateria));
                    currentScene.addMateria(imageMateria);
                    updateHierarchy();
                    selectMateria(imageMateria.id);
                    break;
                }
                case 'create-animated-materia': {
                    const animMateria = new Materia('Materia Animada');
                    animMateria.addComponent(new SpriteRenderer(animMateria));
                    animMateria.addComponent(new Animator(animMateria));
                    currentScene.addMateria(animMateria);
                    updateHierarchy();
                    selectMateria(animMateria.id);
                    break;
                }
                case 'create-camera': {
                    const camMateria = new Materia('Cámara');
                    camMateria.addComponent(new Camera(camMateria));
                    currentScene.addMateria(camMateria);
                    updateHierarchy();
                    selectMateria(camMateria.id);
                    break;
                }
            }
            hideContextMenus();
        });

        // Asset Context Menu Actions
        dom.contextMenu.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            if (!action) return;
            hideContextMenus();

            const selectedAsset = dom.assetGridView.querySelector('.grid-item.active');

            if (action === 'create-script') {
                await createNewScript(currentDirectoryHandle);
            } else if (action === 'create-folder') {
                const folderName = prompt("Nombre de la nueva carpeta:");
                if (folderName) {
                    try {
                        await currentDirectoryHandle.getDirectoryHandle(folderName, { create: true });
                        await updateAssetBrowser();
                    } catch (err) {
                        console.error("Error al crear la carpeta:", err);
                        alert("No se pudo crear la carpeta.");
                    }
                }
            } else if (action === 'create-folder') {
                const folderName = prompt("Nombre de la nueva carpeta:");
                if (folderName) {
                    try {
                        await currentDirectoryHandle.getDirectoryHandle(folderName, { create: true });
                        await updateAssetBrowser();
                    } catch (err) {
                        console.error("Error al crear la carpeta:", err);
                        alert("No se pudo crear la carpeta.");
                    }
                }
            } else if (action === 'create-readme') {
                const fileName = "NUEVO-LEAME.md";
                try {
                    const fileHandle = await currentDirectoryHandle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write("# Nuevo Archivo Léame\n\nEscribe tu contenido aquí.");
                    await writable.close();
                    await updateAssetBrowser();
                } catch (err) {
                    console.error("Error al crear el archivo Léame:", err);
                    alert("No se pudo crear el archivo.");
                }
            } else if (action === 'create-scene') {
                const sceneName = prompt("Nombre de la nueva escena:");
                if (sceneName) {
                    const fileName = `${sceneName}.ceScene`;
                    const defaultContent = {
                        materias: [] // An empty scene
                    };
                    try {
                        const fileHandle = await currentDirectoryHandle.getFileHandle(fileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(JSON.stringify(defaultContent, null, 2));
                        await writable.close();
                        await updateAssetBrowser();
                    } catch (err) {
                        console.error("Error al crear la escena:", err);
                        alert("No se pudo crear la escena.");
                    }
                }
            } else if (action === 'create-animation') {
                const animName = prompt("Nombre del nuevo asset de animación:");
                if (animName) {
                    const fileName = `${animName}.cea`;
                    const defaultContent = {
                        animations: [
                            { name: 'default', speed: 10, loop: true, frames: [] }
                        ]
                    };
                    try {
                        const fileHandle = await currentDirectoryHandle.getFileHandle(fileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(JSON.stringify(defaultContent, null, 2));
                        await writable.close();
                        await updateAssetBrowser();
                    } catch (err) {
                        console.error("Error al crear el asset de animación:", err);
                        alert("No se pudo crear el asset de animación.");
                    }
                }
            } else if (action === 'delete') {
                if (selectedAsset) {
                    const assetName = selectedAsset.dataset.name;
                    if (confirm(`¿Estás seguro de que quieres borrar '${assetName}'? Esta acción no se puede deshacer.`)) {
                        try {
                            await currentDirectoryHandle.removeEntry(assetName, { recursive: true });
                            console.log(`'${assetName}' borrado.`);
                            await updateAssetBrowser();
                        } catch (err) {
                            console.error(`Error al borrar '${assetName}':`, err);
                            alert(`No se pudo borrar el asset.`);
                        }
                    }
                } else {
                    alert("Por favor, selecciona un archivo o carpeta para borrar.");
                }
            } else if (action === 'export-package') {
                 if (selectedAsset && selectedAsset.dataset.kind === 'directory') {
                    await exportPackage(selectedAsset.dataset.name);
                 } else {
                    alert("Por favor, selecciona una carpeta para exportar.");
                 }
            } else if (action === 'create-package') {
                const packageName = prompt("Nombre del nuevo paquete:");
                if (packageName) {
                    const fileName = `${packageName}.cep`;
                    const zip = new JSZip();
                    zip.file("manifest.json", JSON.stringify({ name: packageName, version: "1.0.0", contents: [] }, null, 2));

                    try {
                        const blob = await zip.generateAsync({type: 'blob'});
                        const fileHandle = await currentDirectoryHandle.getFileHandle(fileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        await updateAssetBrowser();
                    } catch (err) {
                        console.error("Error al crear el paquete:", err);
                        alert("No se pudo crear el paquete.");
                    }
                }
            } else if (action === 'rename') {
                if (selectedAsset) {
                    const oldName = selectedAsset.dataset.name;
                    const newName = prompt(`Renombrar '${oldName}':`, oldName);

                    if (newName && newName !== oldName) {
                        try {
                             if (selectedAsset.dataset.kind === 'directory') {
                                alert("El renombrado de carpetas aún no está implementado.");
                                return;
                            }
                            const oldFileHandle = await currentDirectoryHandle.getFileHandle(oldName);
                            const content = await (await oldFileHandle.getFile()).text();

                            const newFileHandle = await currentDirectoryHandle.getFileHandle(newName, { create: true });
                            const writable = await newFileHandle.createWritable();
                            await writable.write(content);
                            await writable.close();

                            await currentDirectoryHandle.removeEntry(oldName);

                            console.log(`'${oldName}' renombrado a '${newName}'.`);
                            await updateAssetBrowser();
                        } catch (err) {
                            console.error(`Error al renombrar '${oldName}':`, err);
                            alert(`No se pudo renombrar el asset.`);
                        }
                    }
                } else {
                    alert("Por favor, selecciona un archivo para renombrar.");
                }
            }
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
                    setTimeout(() => renderer.resize(), 0);
                } else if (viewId === 'game-content' && gameRenderer) {
                    setTimeout(() => gameRenderer.resize(), 0);
                }
            }
        });

        // Panel Close Button Logic
        document.querySelectorAll('.close-panel-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const panelId = e.target.dataset.panel;
                const panel = document.getElementById(panelId);
                if (panel) {
                    panel.classList.add('hidden');
                    if (panelId === 'animation-panel') {
                        resetAnimationPanel();
                    } else {
                        const panelName = panelId.replace('-panel', '');
                        panelVisibility[panelName] = false;
                        updateEditorLayout();
                        updateWindowMenuUI();
                    }
                }
            });
        });

        // Window Menu Logic
        dom.menubar.querySelector('.menu-item:nth-child(3) .menu-content').addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.target.id;
            let panelName = '';
            // A bit of a hacky way to get the panel name from the menu item id
            if (targetId.startsWith('menu-window-')) {
                panelName = targetId.substring('menu-window-'.length);
            } else {
                return;
            }

            // The assets panel is special, its menu item is 'assets' but panel is 'assets-panel'
            if (panelName === 'assets' || panelName === 'hierarchy' || panelName === 'inspector') {
                 const panel = document.getElementById(`${panelName}-panel`);
                if (panel) {
                    const isVisible = !panel.classList.contains('hidden');
                    panel.classList.toggle('hidden', isVisible);
                    panelVisibility[panelName] = !isVisible;
                    updateEditorLayout();
                    updateWindowMenuUI();
                }
            } else if (panelName === 'animation') {
                dom.animationPanel.classList.toggle('hidden');
            }
        });

        // Code Editor Toolbar Buttons
        document.getElementById('code-save-btn').addEventListener('click', () => saveCurrentScript());
        document.getElementById('code-undo-btn').addEventListener('click', () => {
            if (codeEditor) undo(codeEditor);
        });
        document.getElementById('code-redo-btn').addEventListener('click', () => {
            if (codeEditor) redo(codeEditor);
        });

        // --- Animation Drawing Listeners ---
        const drawingCanvas = dom.drawingCanvas;
        const drawingCtx = drawingCanvas.getContext('2d');

        function getDrawPos(e) {
            const rect = drawingCanvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }

        drawingCanvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            lastDrawPos = getDrawPos(e);
        });

        const PIXEL_GRID_SIZE = 16;

        drawingCanvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;

            let currentPos = getDrawPos(e);

            if (drawingMode === 'pixel') {
                drawingCtx.globalCompositeOperation = 'source-over'; // Eraser in pixel mode just paints background
                const x = Math.floor(currentPos.x / PIXEL_GRID_SIZE) * PIXEL_GRID_SIZE;
                const y = Math.floor(currentPos.y / PIXEL_GRID_SIZE) * PIXEL_GRID_SIZE;
                drawingCtx.fillStyle = drawingTool === 'pencil' ? drawingColor : 'rgba(0,0,0,0)';
                if(drawingTool === 'eraser') drawingCtx.clearRect(x,y,PIXEL_GRID_SIZE,PIXEL_GRID_SIZE);
                else drawingCtx.fillRect(x, y, PIXEL_GRID_SIZE, PIXEL_GRID_SIZE);

            } else { // Free mode
                if (drawingTool === 'eraser') {
                    drawingCtx.globalCompositeOperation = 'destination-out';
                } else {
                    drawingCtx.globalCompositeOperation = 'source-over';
                }
                drawingCtx.beginPath();
                drawingCtx.strokeStyle = drawingColor;
                drawingCtx.lineWidth = drawingTool === 'pencil' ? 2 : 20;
                drawingCtx.lineCap = 'round';
                drawingCtx.moveTo(lastDrawPos.x, lastDrawPos.y);
                drawingCtx.lineTo(currentPos.x, currentPos.y);
                drawingCtx.stroke();
            }

            lastDrawPos = currentPos;
        });

        drawingCanvas.addEventListener('mouseup', () => isDrawing = false);
        drawingCanvas.addEventListener('mouseout', () => isDrawing = false);

        dom.drawingTools.addEventListener('click', (e) => {
            const toolButton = e.target.closest('.tool-btn');
            if (toolButton) {
                if (toolButton.dataset.tool) {
                    dom.drawingTools.querySelectorAll('[data-tool]').forEach(btn => btn.classList.remove('active'));
                    toolButton.classList.add('active');
                    drawingTool = toolButton.dataset.tool;
                } else if (toolButton.dataset.drawMode) {
                    dom.drawingTools.querySelectorAll('[data-draw-mode]').forEach(btn => btn.classList.remove('active'));
                    toolButton.classList.add('active');
                    drawingMode = toolButton.dataset.drawMode;
                }
            }
        });

        dom.drawingColorPicker.addEventListener('change', (e) => {
            drawingColor = e.target.value;
        });


        // --- Floating Panel Dragging & Resizing ---
        dom.animationPanel.addEventListener('mousedown', (e) => {
            // Check for resize handles
            if (e.target.matches('.resize-handle')) {
                isResizingPanel = true;
                const rect = dom.animationPanel.getBoundingClientRect();
                panelResizeState = {
                    direction: e.target.dataset.direction,
                    initialX: e.clientX,
                    initialY: e.clientY,
                    initialWidth: rect.width,
                    initialHeight: rect.height
                };
                document.body.classList.add('is-dragging-panel');
                e.preventDefault(); // Prevent text selection
                return;
            }

            // Check for header dragging
            const header = e.target.closest('.panel-header');
            if (header) {
                 // Don't drag if clicking a button on the header
                if (e.target.matches('button')) return;

                isMovingPanel = true;
                const rect = dom.animationPanel.getBoundingClientRect();
                panelMoveOffset.x = e.clientX - rect.left;
                panelMoveOffset.y = e.clientY - rect.top;

                document.body.classList.add('is-dragging-panel');
                e.preventDefault(); // Prevent text selection
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isMovingPanel) {
                const newX = e.clientX - panelMoveOffset.x;
                const newY = e.clientY - panelMoveOffset.y;
                dom.animationPanel.style.left = `${newX}px`;
                dom.animationPanel.style.top = `${newY}px`;
                dom.animationPanel.style.transform = 'none';
            } else if (isResizingPanel) {
                const dx = e.clientX - panelResizeState.initialX;
                const dy = e.clientY - panelResizeState.initialY;

                if (panelResizeState.direction === 'right' || panelResizeState.direction === 'both') {
                    const newWidth = panelResizeState.initialWidth + dx;
                    dom.animationPanel.style.width = `${Math.max(300, newWidth)}px`;
                }
                if (panelResizeState.direction === 'bottom' || panelResizeState.direction === 'both') {
                    const newHeight = panelResizeState.initialHeight + dy;
                    dom.animationPanel.style.height = `${Math.max(200, newHeight)}px`;
                }
            }
        });

        window.addEventListener('mouseup', () => {
            isMovingPanel = false;
            isResizingPanel = false;
            document.body.classList.remove('is-dragging-panel');
        });

        // --- Animation Panel Toggles ---
        const timelineToggleBtn = document.getElementById('timeline-toggle-btn');
        timelineToggleBtn.addEventListener('click', () => {
            const isCollapsed = dom.animationPanel.classList.toggle('timeline-collapsed');
            timelineToggleBtn.textContent = isCollapsed ? '▼' : '▲';
        });

        dom.animationPlayBtn.addEventListener('click', startAnimationPlayback);
        dom.animationStopBtn.addEventListener('click', stopAnimationPlayback);
        dom.animationSaveBtn.addEventListener('click', saveAnimationAsset);

        dom.addFrameBtn.addEventListener('click', addFrameFromCanvas);

        dom.deleteFrameBtn.addEventListener('click', () => {
            if (currentFrameIndex === -1) {
                alert("Por favor, selecciona un fotograma para borrar.");
                return;
            }

            if (currentAnimationAsset && currentAnimationAsset.animations[0]) {
                currentAnimationAsset.animations[0].frames.splice(currentFrameIndex, 1);
                currentFrameIndex = -1; // Deselect

                const ctx = dom.drawingCanvas.getContext('2d');
                ctx.clearRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);

                populateTimeline();
            }
        });

        dom.animationTimeline.addEventListener('click', (e) => {
            const frame = e.target.closest('.timeline-frame');
            if (!frame) return;

            const index = parseInt(frame.dataset.index, 10);
            currentFrameIndex = index;

            const ctx = dom.drawingCanvas.getContext('2d');
            ctx.clearRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);
            ctx.drawImage(frame, 0, 0);

            populateTimeline(); // Re-render to show active state
        });

        // Edit Menu Modals
        document.getElementById('menu-project-settings').addEventListener('click', (e) => {
            e.preventDefault();
            dom.projectSettingsModal.style.display = 'block';
        });
        document.getElementById('menu-preferences').addEventListener('click', (e) => {
            e.preventDefault();
            dom.preferencesModal.style.display = 'block';
        });
        dom.projectSettingsModal.querySelector('.close-button').addEventListener('click', () => {
            dom.projectSettingsModal.style.display = 'none';
        });
        dom.preferencesModal.querySelector('.close-button').addEventListener('click', () => {
            dom.preferencesModal.style.display = 'none';
        });
    }

    // --- 7. Initial Setup ---
    async function initializeEditor() {
        // Cache all DOM elements
        const ids = ['editor-container', 'menubar', 'editor-toolbar', 'editor-main-content', 'hierarchy-panel', 'hierarchy-content', 'scene-panel', 'scene-content', 'inspector-panel', 'assets-panel', 'assets-content', 'console-content', 'project-name-display', 'debug-content', 'add-component-modal', 'component-list', 'context-menu', 'hierarchy-context-menu', 'project-settings-modal', 'preferences-modal', 'code-editor-content', 'codemirror-container', 'asset-folder-tree', 'asset-grid-view', 'animation-panel', 'drawing-canvas', 'drawing-tools', 'drawing-color-picker', 'add-frame-btn', 'delete-frame-btn', 'animation-timeline', 'animation-panel-overlay', 'animation-edit-view', 'animation-playback-view', 'animation-playback-canvas', 'animation-play-btn', 'animation-stop-btn', 'animation-save-btn', 'current-scene-name', 'sprite-selector-modal', 'sprite-selector-grid'];
        ids.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
            dom[camelCaseId] = document.getElementById(id);
        });
        dom.inspectorContent = dom.inspectorPanel.querySelector('.panel-content');
        dom.sceneCanvas = document.getElementById('scene-canvas');
        dom.gameCanvas = document.getElementById('game-canvas');

        console.log("Initializing Creative Engine Editor...");
        try {
            await openDB();
            projectsDirHandle = await getDirHandle();
            if (!projectsDirHandle) {
                console.error("No project directory handle found. Please go back to the launcher and select a directory.");
                return;
            }
            const projectName = new URLSearchParams(window.location.search).get('project');
            dom.projectNameDisplay.textContent = `Proyecto: ${projectName}`;

            // Initialize Core Systems
            renderer = new Renderer(dom.sceneCanvas, true); // This is the editor renderer
            gameRenderer = new Renderer(dom.gameCanvas); // This is the game renderer
            physicsSystem = new PhysicsSystem(currentScene);
            InputManager.initialize(dom.sceneCanvas); // Pass canvas for correct mouse coords

            // Initial UI updates
            updateHierarchy();
            updateInspector();
            await updateAssetBrowser();
            updateWindowMenuUI();

            setupEventListeners();

            // Start the main editor loop
            editorLoopId = requestAnimationFrame(editorLoop);

            console.log("Editor Initialized Successfully.");

        } catch (error) {
            console.error("Failed to initialize editor:", error);
            alert("Error fatal al inicializar el editor. Revisa la consola.");
        }
    }
    initializeEditor();
});
