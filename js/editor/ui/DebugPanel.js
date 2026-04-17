// --- Module for the Debug Panel ---

import { estimateMateriaMemory } from '../../engine/MathUtils.js';

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

    if (dom.debugContent) {
        dom.debugContent.addEventListener('click', (e) => {
            if (e.target.id === 'btn-debug-optimize') {
                // Trigger engine optimization
                import('../../engine/CEEngine.js').then(CEEngine => {
                    CEEngine.optimize();
                });
            }
        });
    }
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

    // RAM Monitoring
    let ramInfo = "No soportado";
    let motorRamInfo = "---";
    let gameRamInfo = "---";
    let ramStyle = "";
    let usagePercent = 0;

    if (window.performance && window.performance.memory) {
        const memory = window.performance.memory;
        const usedBytes = memory.usedJSHeapSize;
        const usedMB = usedBytes / 1048576;

        // Estimate Game RAM based on loaded objects
        let gameBytes = 0;
        if (SceneManager.currentScene) {
            SceneManager.currentScene.getAllMaterias().forEach(m => {
                gameBytes += estimateMateriaMemory(m).total;
            });
        }

        const gameMB = gameBytes / 1048576;
        const motorMB = Math.max(0, usedMB - gameMB);

        // Use user-defined limit if available, fallback to 2048MB
        const targetLimitMB = window.currentProjectConfig?.ramLimit || 2048;
        usagePercent = Math.min(100, (usedMB / targetLimitMB) * 100);

        ramInfo = `${usedMB.toFixed(1)} MB / ${targetLimitMB} MB`;
        motorRamInfo = `${motorMB.toFixed(1)} MB`;
        gameRamInfo = `${gameMB.toFixed(1)} MB`;

        // Color coding based on the user-defined budget
        if (usagePercent > 80) ramStyle = "background-color: #ff4444;";
        else if (usagePercent > 60) ramStyle = "background-color: #ffbb33;";
        else ramStyle = "background-color: #00C851;";
    }

    // Scene Stats
    const totalMaterias = SceneManager.currentScene.materias.length;
    const rootMaterias = SceneManager.currentScene.getRootMaterias();

    let memoryListHtml = '<div class="debug-memory-list" style="max-height: 200px; overflow-y: auto; font-size: 0.85em; background: #111; padding: 5px; border-radius: 4px;">';
    memoryListHtml += '<div style="display: flex; border-bottom: 1px solid #444; margin-bottom: 5px; font-weight: bold; padding-bottom: 2px;"><span style="flex: 2;">Materia</span><span style="flex: 1; text-align: right;">Indiv.</span><span style="flex: 1; text-align: right;">Total</span></div>';

    const formatBytes = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
    };

    const renderMateriaMemory = (materia, depth = 0) => {
        const mem = estimateMateriaMemory(materia);
        let html = `<div style="display: flex; padding-left: ${depth * 10}px; border-bottom: 1px solid #222; py: 2px;">`;
        html += `<span style="flex: 2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${materia.name}">${materia.name}</span>`;
        html += `<span style="flex: 1; text-align: right; color: #aaa;">${formatBytes(mem.individual)}</span>`;
        html += `<span style="flex: 1; text-align: right; font-weight: bold;">${formatBytes(mem.total)}</span>`;
        html += '</div>';

        materia.children.forEach(child => {
            html += renderMateriaMemory(child, depth + 1);
        });
        return html;
    };

    rootMaterias.forEach(m => {
        memoryListHtml += renderMateriaMemory(m);
    });
    memoryListHtml += '</div>';

    dom.debugContent.innerHTML = `
        <div class="debug-section">
            <h4>Estado del Editor</h4>
            <pre>Herramienta Activa: ${activeTool}\nSelección: ${selectedMateriaName}\nJuego Corriendo: ${gameRunningStatus}</pre>
        </div>
        <div class="debug-section">
            <h4>Rendimiento</h4>
            <pre>FPS: ${fps}\nDeltaTime: ${dtMs} ms\nRAM Total: <span>${ramInfo}</span>\n<div class="ram-bar-container"><div class="ram-bar-fill" style="width: ${usagePercent}%; ${ramStyle}"></div></div>\nMotor: ${motorRamInfo} | Juego: ${gameRamInfo}</pre>
        </div>
        <div class="debug-section">
            <h4>Memoria por Materia</h4>
            ${memoryListHtml}
        </div>
        <div class="debug-section">
            <h4>Estadísticas de Escena</h4>
            <pre>Materias Totales: ${totalMaterias}\nMaterias Raíz: ${rootMaterias.length}</pre>
        </div>
        <div class="debug-section">
            <button id="btn-debug-optimize" style="width: 100%; padding: 5px; cursor: pointer; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">Optimizar Memoria</button>
        </div>
        <div class="debug-section">
            <h4>Input</h4>
            <pre>Pointer (Scene): X=${canvasPos.x.toFixed(0)}, Y=${canvasPos.y.toFixed(0)}\nBotones: L:${leftButton} R:${rightButton}\nTeclas: ${pressedKeys}</pre>
        </div>
    `;
}
