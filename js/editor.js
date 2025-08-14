// --- Engine Core Classes ---
class Leyes { constructor(materia) { this.materia = materia; } update() {} }
class Transform extends Leyes { constructor(materia) { super(materia); this.x = 0; this.y = 0; this.rotation = 0; this.scale = { x: 1, y: 1 }; } }
class CreativeScript extends Leyes { constructor(materia, scriptName) { super(materia); this.scriptName = scriptName; this.instance = null; this.publicVars = []; this.publicVarReferences = {}; } parsePublicVars(code) { this.publicVars = []; const regex = /public\s+(\w+)\s+(\w+);/g; let match; while ((match = regex.exec(code)) !== null) { this.publicVars.push({ type: match[1], name: match[2] }); } } async load() { const projectName = new URLSearchParams(window.location.search).get('project'); const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName); const fileHandle = await projectHandle.getFileHandle(this.scriptName); const file = await fileHandle.getFile(); const code = await file.text(); this.parsePublicVars(code); const scriptModule = new Function('materia', `${code}\nreturn { start, update };`)(this.materia); this.instance = { start: scriptModule.start || (() => {}), update: scriptModule.update || (() => {}), }; for (const key in this.publicVarReferences) { this.instance[key] = this.publicVarReferences[key]; } } }
class UICanvas extends Leyes { constructor(materia) { super(materia); } }
class UIText extends Leyes { constructor(materia, text = 'Hola Mundo') { super(materia); this.text = text; this.fontSize = 16; } }
class UIButton extends Leyes { constructor(materia) { super(materia); this.label = new UIText(materia, 'Botón'); this.color = '#2d2d30'; } }

class Rigidbody extends Leyes {
    constructor(materia) {
        super(materia);
        this.bodyType = 'dynamic'; // 'dynamic', 'static', 'kinematic'
        this.mass = 1.0;
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

let MATERIA_ID_COUNTER = 0;
class Materia { constructor(name = 'Materia') { this.id = MATERIA_ID_COUNTER++; this.name = `${name}`; this.leyes = []; this.parent = null; this.children = []; this.addComponent(new Transform(this)); } addComponent(component) { this.leyes.push(component); component.materia = this; } getComponent(componentClass) { return this.leyes.find(ley => ley instanceof componentClass); } addChild(child) { if (child.parent) { child.parent.removeChild(child); } child.parent = this; this.children.push(child); } removeChild(child) { const index = this.children.indexOf(child); if (index > -1) { this.children.splice(index, 1); child.parent = null; } } update() { for (const ley of this.leyes) { ley.update(); } } }
class Scene { constructor() { this.materias = []; } addMateria(materia) { if (materia instanceof Materia) { this.materias.push(materia); } } findMateriaById(id) { return this.materias.find(m => m.id === id); } getRootMaterias() { return this.materias.filter(m => m.parent === null); } findFirstCanvas() { return this.materias.find(m => m.getComponent(UICanvas)); } }

class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1.0;
    }
}

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = new Camera();
        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    begin() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        // Center the camera and apply zoom
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
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
}


// --- Engine Core Classes ---
import { InputManager } from './engine/Input.js';

// --- CodeMirror Integration ---
import {EditorView, basicSetup} from "https://esm.sh/codemirror@6.0.1";
import {javascript} from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import {oneDark} from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";

// --- Editor Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Editor State ---
    let projectsDirHandle = null, codeEditor, currentlyOpenFileHandle = null;
    const currentScene = new Scene(); let selectedMateria = null;
    let renderer = null;
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0; let activeTool = 'move';
    let isGameRunning = false;
    let lastFrameTime = 0;
    let editorLoopId = null;
    let deltaTime = 0;


    // --- 2. DOM Elements ---
    const dom = {};

    // --- 3. IndexedDB Logic & 4. Console Override ---
    const dbName = 'CreativeEngineDB'; let db; function openDB() { return new Promise((resolve, reject) => { const request = indexedDB.open(dbName, 1); request.onerror = () => reject('Error opening DB'); request.onsuccess = (e) => { db = e.target.result; resolve(db); }; request.onupgradeneeded = (e) => { e.target.result.createObjectStore('settings', { keyPath: 'id' }); }; }); }
    function getDirHandle() { if (!db) return Promise.resolve(null); return new Promise((resolve) => { const request = db.transaction(['settings'], 'readonly').objectStore('settings').get('projectsDirHandle'); request.onsuccess = () => resolve(request.result ? request.result.handle : null); request.onerror = () => resolve(null); }); }
    const originalLog = console.log, originalWarn = console.warn, originalError = console.error; function logToUIConsole(message, type = 'log') { if (!dom.consoleContent) return; const msgEl = document.createElement('p'); msgEl.className = `console-msg log-${type}`; msgEl.textContent = `> ${message}`; dom.consoleContent.appendChild(msgEl); dom.consoleContent.scrollTop = dom.consoleContent.scrollHeight; }
    console.log = function(message, ...args) { logToUIConsole(message, 'log'); originalLog.apply(console, [message, ...args]); }; console.warn = function(message, ...args) { logToUIConsole(message, 'warn'); originalWarn.apply(console, [message, ...args]); }; console.error = function(message, ...args) { logToUIConsole(message, 'error'); originalError.apply(console, [message, ...args]); };

    // --- 5. Core Editor Functions ---
    var updateAssetBrowser, createScriptFile, openScriptInEditor, saveCurrentScript, updateHierarchy, updateInspector, updateScene, selectMateria, showAddComponentModal, startGame, runGameLoop, stopGame, updateDebugPanel;
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
                componentHTML = `<h4>Sprite Renderer</h4>
                <div class="component-grid">
                    <label>Source</label><input type="text" class="prop-input" data-component="SpriteRenderer" data-prop="source" value="${ley.source}">
                    <label>Color</label><input type="color" class="prop-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color}">
                </div>`;
            } else if (ley instanceof UICanvas) {
                componentHTML = '<h4>UI Canvas</h4>';
            } else if (ley instanceof UIText) {
                componentHTML = `<h4>UI Text</h4>
                <label>Texto</label><input type="text" class="prop-input" data-component="UIText" data-prop="text" value="${ley.text}">
                <label>Tamaño Fuente</label><input type="number" class="prop-input" data-component="UIText" data-prop="fontSize" value="${ley.fontSize}">`;
            } else if (ley instanceof UIButton) {
                componentHTML = `<h4>UI Button</h4>
                <label>Etiqueta</label><input type="text" class="prop-input" data-component="UIButton" data-prop="label.text" value="${ley.label.text}">
                <label>Color</label><input type="color" class="prop-input" data-component="UIButton" data-prop="color" value="${ley.color}">`;
            } else if (ley instanceof CreativeScript) {
                componentHTML = `<h4>Creative Script</h4><div class="component-item script">${ley.scriptName}</div>`;
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
    };

    updateScene = function() {
        if (!renderer) return;
        renderer.begin();

        // Draw a grid for reference
        const gridSize = 50;
        const halfWidth = renderer.canvas.width / renderer.camera.zoom;
        const halfHeight = renderer.canvas.height / renderer.camera.zoom;
        const startX = Math.floor((renderer.camera.x - halfWidth) / gridSize) * gridSize;
        const endX = Math.ceil((renderer.camera.x + halfWidth) / gridSize) * gridSize;
        const startY = Math.floor((renderer.camera.y - halfHeight) / gridSize) * gridSize;
        const endY = Math.ceil((renderer.camera.y + halfHeight) / gridSize) * gridSize;

        renderer.ctx.strokeStyle = '#3a3a3a';
        renderer.ctx.lineWidth = 1 / renderer.camera.zoom;
        renderer.ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            renderer.ctx.moveTo(x, startY);
            renderer.ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            renderer.ctx.moveTo(startX, y);
            renderer.ctx.lineTo(endX, y);
        }
        renderer.ctx.stroke();

        // Draw Materias
        currentScene.materias.forEach(materia => {
            const transform = materia.getComponent(Transform);
            if (!transform) return;

            let drawn = false;
            const spriteRenderer = materia.getComponent(SpriteRenderer);
            if (spriteRenderer && spriteRenderer.sprite.complete && spriteRenderer.sprite.naturalHeight !== 0) {
                // For now, assume sprite is 100x100 pixels, will need size from component later
                renderer.drawImage(spriteRenderer.sprite, transform.x, transform.y, 100, 100);
                drawn = true;
            }

            const boxCollider = materia.getComponent(BoxCollider);
            if (boxCollider) {
                // Draw collider shape if no sprite was drawn
                if (!drawn) {
                    renderer.drawRect(transform.x, transform.y, boxCollider.width, boxCollider.height, 'rgba(144, 238, 144, 0.5)');
                }
            }

            // If nothing else to draw, draw a default placeholder
            if (!drawn && !boxCollider) {
                 renderer.drawRect(transform.x, transform.y, 20, 20, 'rgba(128, 128, 128, 0.5)');
            }

            // Draw selection outline
            if (selectedMateria && selectedMateria.id === materia.id) {
                renderer.ctx.strokeStyle = 'yellow';
                renderer.ctx.lineWidth = 2 / renderer.camera.zoom;
                const selectionWidth = boxCollider ? boxCollider.width : (spriteRenderer ? 100 : 20);
                const selectionHeight = boxCollider ? boxCollider.height : (spriteRenderer ? 100 : 20);
                renderer.ctx.strokeRect(transform.x - selectionWidth / 2, transform.y - selectionHeight / 2, selectionWidth, selectionHeight);
            }
        });

        renderer.end();
    };

    selectMateria = function(materiaId) { if (materiaId === null) { selectedMateria = null; } else { selectedMateria = currentScene.findMateriaById(materiaId) || null; } updateHierarchy(); updateInspector(); updateScene(); };

    const availableComponents = {
        'Renderizado': [SpriteRenderer],
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
                componentItem.addEventListener('click', () => {
                    // Special case for script
                    if (ComponentClass === CreativeScript) {
                        const scriptName = prompt("Introduce el nombre del nuevo script (ej: PlayerMovement.ces):");
                        if (scriptName) {
                            const newScript = new CreativeScript(selectedMateria, scriptName);
                            // In a real scenario, you'd create the .ces file here
                            selectedMateria.addComponent(newScript);
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
        // Update all game objects
        for (const materia of currentScene.materias) {
            materia.update(deltaTime);
        }

        // Render game view (if separate from scene view)
        // For now, we assume they are the same
    };

    const editorLoop = (timestamp) => {
        // Calculate deltaTime
        if (lastFrameTime > 0) {
            deltaTime = (timestamp - lastFrameTime) / 1000;
        }
        lastFrameTime = timestamp;

        InputManager.update();
        updateDebugPanel();

        // Always update the scene rendering
        updateScene();

        if(isGameRunning) {
            runGameLoop(); // No longer needs timestamp
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
        }
    }

    function setupEventListeners() {
        // Tool selection
        const toolMoveBtn = document.getElementById('tool-move');
        const toolPanBtn = document.getElementById('tool-pan');
        setActiveTool = (toolName) => {
            activeTool = toolName;
            toolMoveBtn.classList.toggle('active', toolName === 'move');
            toolPanBtn.classList.toggle('active', toolName === 'pan');
            console.log(`Herramienta activa: ${activeTool}`);
        };
        toolMoveBtn.addEventListener('click', () => setActiveTool('move'));
        toolPanBtn.addEventListener('click', () => setActiveTool('pan'));


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
                console.log('Tab bar clicked.');
                if (e.target.matches('.tab-btn')) {
                    console.log('Target is a tab button:', e.target);
                    const tabId = e.target.dataset.tab;
                    console.log('Tab ID:', tabId);

                    // Update button states
                    console.log('Deactivating all tab buttons...');
                    tabBar.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

                    console.log('Activating target button. Classes before:', e.target.className);
                    e.target.classList.add('active');
                    console.log('Classes after:', e.target.className);


                    // Update content visibility
                    contentContainer.querySelectorAll('.tab-content').forEach(content => {
                        content.classList.remove('active');
                    });
                    const activeContent = contentContainer.querySelector(`#${tabId}`);
                    if (activeContent) {
                        activeContent.classList.add('active');
                        console.log('Activated content panel:', activeContent.id);
                    }
                }
            });
        } else {
            console.error("Could not find tab bar or content container for assets panel.");
        }

        // Global Keyboard Shortcuts
        window.addEventListener('keydown', handleKeyboardShortcuts);

        // Hierarchy item selection
        dom.hierarchyContent.addEventListener('click', (e) => {
            const item = e.target.closest('.hierarchy-item');
            if (item) {
                const materiaId = parseInt(item.dataset.id, 10);
                selectMateria(materiaId);
            }
        });

        // Scene object selection
        dom.sceneContent.addEventListener('click', (e) => {
             const item = e.target.closest('.scene-object-vis');
            if (item) {
                const materiaId = parseInt(item.id.replace('materia-vis-', ''), 10);
                selectMateria(materiaId);
            }
        });

        // Modal close buttons
        dom.addComponentModal.querySelector('.close-button').addEventListener('click', () => {
            dom.addComponentModal.style.display = 'none';
        });

        // Canvas resizing
        window.addEventListener('resize', () => {
            if (renderer) {
                renderer.resize();
            }
        });
    }

    // --- 7. Initial Setup ---
    async function initializeEditor() {
        // Cache all DOM elements
        const ids = ['editor-container', 'menubar', 'editor-toolbar', 'editor-main-content', 'hierarchy-panel', 'hierarchy-content', 'scene-panel', 'scene-content', 'inspector-panel', 'assets-panel', 'console-content', 'project-name-display', 'debug-content', 'add-component-modal', 'component-list'];
        ids.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
            dom[camelCaseId] = document.getElementById(id);
        });
        dom.inspectorContent = dom.inspectorPanel.querySelector('.panel-content');
        dom.sceneCanvas = document.getElementById('scene-canvas');

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
            renderer = new Renderer(dom.sceneCanvas);
            InputManager.initialize(dom.sceneCanvas); // Pass canvas for correct mouse coords

            // Initial UI updates
            updateHierarchy();
            updateInspector();
            // await updateAssetBrowser(); // Assuming you have this function

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
