// --- Module for the Debug Panel ---

// Dependencies
let dom;
let InputManager;
let SceneManager;
let getActiveTool;
let getSelectedMateria;
let getIsGameRunning;
let getDeltaTime;

// --- Public API ---

export function initialize(dependencies) {
    dom = dependencies.dom;
    InputManager = dependencies.InputManager;
    SceneManager = dependencies.SceneManager;
    getActiveTool = dependencies.getActiveTool;
    getSelectedMateria = dependencies.getSelectedMateria;
    getIsGameRunning = dependencies.getIsGameRunning;
    getDeltaTime = dependencies.getDeltaTime;
}

export function update() {
    if (!dom.debugContent) return;

    // Input State
    const pos = InputManager.getMousePosition();
    const canvasPos = InputManager.getMousePositionInCanvas();
    const leftButton = InputManager.getMouseButton(0) ? 'DOWN' : 'UP';
    const rightButton = InputManager.getMouseButton(2) ? 'DOWN' : 'UP';
    const pressedKeys = InputManager.getPressedKeys().join(', ') || 'Ninguna';

    // Editor State
    const selectedMateria = getSelectedMateria();
    const selectedMateriaName = selectedMateria ? `${selectedMateria.name} (ID: ${selectedMateria.id})` : 'Ninguna';
    const gameRunningStatus = getIsGameRunning() ? 'Sí' : 'No';
    const activeTool = getActiveTool();
    const deltaTime = getDeltaTime();

    // Performance
    const fps = deltaTime > 0 ? (1.0 / deltaTime).toFixed(1) : '...';
    const dtMs = (deltaTime * 1000).toFixed(2);

    // Scene Stats
    const totalMaterias = SceneManager.currentScene.materias.length;
    const rootMaterias = SceneManager.currentScene.getRootMaterias().length;

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
            <pre>Pointer (Scene): X=${canvasPos.x.toFixed(0)}, Y=${canvasPos.y.toFixed(0)}\nBotones: L:${leftButton} R:${rightButton}\nTeclas: ${pressedKeys}</pre>
        </div>
    `;
}
