// --- Engine Core Classes ---
class Leyes { constructor(materia) { this.materia = materia; } update() {} }
class Transform extends Leyes { constructor(materia) { super(materia); this.x = 0; this.y = 0; this.rotation = 0; this.scale = { x: 1, y: 1 }; } }
let MATERIA_ID_COUNTER = 0;
class Materia {
    constructor(name = 'Materia') { this.id = MATERIA_ID_COUNTER++; this.name = `${name}`; this.leyes = []; this.addComponent(new Transform(this)); }
    addComponent(component) { this.leyes.push(component); component.materia = this; }
    getComponent(componentClass) { return this.leyes.find(ley => ley instanceof componentClass); }
    update() { for (const ley of this.leyes) { ley.update(); } }
}
class Scene {
    constructor() { this.materias = []; }
    addMateria(materia) { if (materia instanceof Materia) { this.materias.push(materia); } }
    findMateriaById(id) { return this.materias.find(m => m.id === id); }
}

// --- Editor Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Editor State ---
    const currentScene = new Scene();
    let selectedMateria = null;
    let isDragging = false;
    let dragOffsetX = 0, dragOffsetY = 0;
    let activeTool = 'move'; // 'move' or 'pan'

    // --- DOM Elements ---
    const sceneContent = document.getElementById('scene-content');
    const toolMoveBtn = document.getElementById('tool-move');
    const toolPanBtn = document.getElementById('tool-pan');
    const consoleContent = document.getElementById('console-content');

    // --- Console Override ---
    function logToUIConsole(message, type = 'log') { const msgEl = document.createElement('p'); msgEl.className = `console-msg log-${type}`; msgEl.textContent = `> ${message}`; consoleContent.appendChild(msgEl); consoleContent.scrollTop = consoleContent.scrollHeight; }
    const originalLog = console.log; const originalWarn = console.warn; const originalError = console.error;
    console.log = function(message, ...args) { logToUIConsole(message, 'log'); originalLog.apply(console, [message, ...args]); };
    console.warn = function(message, ...args) { logToUIConsole(message, 'warn'); originalWarn.apply(console, [message, ...args]); };
    console.error = function(message, ...args) { logToUIConsole(message, 'error'); originalError.apply(console, [message, ...args]); };

    // --- Core Editor Functions ---
    let hierarchyContent, inspectorContent;
    function updateHierarchy() { if(!hierarchyContent) hierarchyContent = document.getElementById('hierarchy-content'); hierarchyContent.innerHTML = ''; currentScene.materias.forEach(materia => { const item = document.createElement('div'); item.className = 'hierarchy-item'; item.textContent = materia.name; item.dataset.id = materia.id; if (selectedMateria && materia.id === selectedMateria.id) item.classList.add('active'); hierarchyContent.appendChild(item); }); }
    function updateInspector() { if(!inspectorContent) inspectorContent = document.getElementById('inspector-panel').querySelector('.panel-content'); inspectorContent.innerHTML = ''; if (!selectedMateria) { inspectorContent.innerHTML = '<p class="inspector-placeholder">Nada seleccionado</p>'; return; } const transform = selectedMateria.getComponent(Transform); inspectorContent.innerHTML = `<label for="materia-name">Nombre</label><input type="text" id="materia-name" value="${selectedMateria.name}"><h4>Transform</h4><div class="transform-grid"><label>X</label><input type="number" id="pos-x" value="${transform.x.toFixed(0)}"><label>Y</label><input type="number" id="pos-y" value="${transform.y.toFixed(0)}"></div>`; document.getElementById('materia-name').addEventListener('change', e => { selectedMateria.name = e.target.value; updateHierarchy(); }); document.getElementById('pos-x').addEventListener('change', e => { transform.x = parseFloat(e.target.value) || 0; updateScene(); }); document.getElementById('pos-y').addEventListener('change', e => { transform.y = parseFloat(e.target.value) || 0; updateScene(); }); }
    function updateScene() { currentScene.materias.forEach(materia => { let vis = document.getElementById(`materia-vis-${materia.id}`); if (!vis) { vis = document.createElement('div'); vis.id = `materia-vis-${materia.id}`; vis.className = 'scene-object-vis'; sceneContent.appendChild(vis); } const transform = materia.getComponent(Transform); vis.style.transform = `translate(${transform.x}px, ${transform.y}px)`; vis.classList.toggle('active', selectedMateria && materia.id === selectedMateria.id); }); }
    function selectMateria(materiaId) { if (materiaId === null) { selectedMateria = null; } else { selectedMateria = currentScene.findMateriaById(materiaId) || null; } updateHierarchy(); updateInspector(); updateScene(); }

    // --- Event Listeners ---
    document.getElementById('add-materia-btn').addEventListener('click', () => { const newMateria = new Materia(); currentScene.addMateria(newMateria); selectMateria(newMateria.id); console.log(`Creada nueva Materia: ${newMateria.name} (ID: ${newMateria.id})`); });
    document.getElementById('hierarchy-content').addEventListener('click', e => { const target = e.target.closest('.hierarchy-item'); if (target) selectMateria(parseInt(target.dataset.id, 10)); });
    document.querySelector('.tab-bar').addEventListener('click', e => { if (e.target.matches('.tab-btn')) { const tabId = e.target.dataset.tab; document.querySelector('.tab-bar').querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active')); e.target.classList.add('active'); document.getElementById(tabId).classList.add('active'); } });

    // --- Tool Switching Logic ---
    function setActiveTool(tool) {
        activeTool = tool;
        toolMoveBtn.classList.toggle('active', tool === 'move');
        toolPanBtn.classList.toggle('active', tool === 'pan');
        console.log(`Herramienta activa: ${tool}`);
    }
    toolMoveBtn.addEventListener('click', () => setActiveTool('move'));
    toolPanBtn.addEventListener('click', () => setActiveTool('pan'));

    // --- Scene Interaction Events ---
    sceneContent.addEventListener('mousedown', e => {
        if (activeTool === 'move') {
            const target = e.target.closest('.scene-object-vis');
            if (target) {
                const materiaId = parseInt(target.id.split('-')[2], 10);
                selectMateria(materiaId);
                isDragging = true;
                const transform = selectedMateria.getComponent(Transform);
                const sceneRect = sceneContent.getBoundingClientRect();
                dragOffsetX = e.clientX - sceneRect.left - transform.x;
                dragOffsetY = e.clientY - sceneRect.top - transform.y;
                target.style.cursor = 'grabbing';
            } else {
                selectMateria(null);
            }
        } else if (activeTool === 'pan') {
            isDragging = true; // Use the same flag for panning
            console.log("Iniciando paneo de cámara...");
        }
    });
    sceneContent.addEventListener('mousemove', e => {
        if (!isDragging) return;
        e.preventDefault();
        if (activeTool === 'move' && selectedMateria) {
            const transform = selectedMateria.getComponent(Transform);
            const sceneRect = sceneContent.getBoundingClientRect();
            transform.x = e.clientX - sceneRect.left - dragOffsetX;
            transform.y = e.clientY - sceneRect.top - dragOffsetY;
            updateScene();
            updateInspector();
        } else if (activeTool === 'pan') {
            // Future pan logic here
        }
    });
    function endDrag() { if (isDragging) { if(activeTool === 'move' && selectedMateria) { const vis = document.getElementById(`materia-vis-${selectedMateria.id}`); if (vis) vis.style.cursor = 'grab'; } isDragging = false; console.log("Finalizado arrastre/paneo."); } }
    sceneContent.addEventListener('mouseup', endDrag);
    sceneContent.addEventListener('mouseleave', endDrag);

    // --- Initial Setup & Other Logic ---
    updateHierarchy(); updateInspector();
    document.getElementById('project-name-display').textContent = new URLSearchParams(window.location.search).get('project') || "Proyecto sin nombre";
    const themeButtons = document.querySelectorAll('.theme-btn'); const htmlElement = document.documentElement; themeButtons.forEach(button => { button.addEventListener('click', () => { htmlElement.setAttribute('data-theme', button.dataset.themeSet); themeButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); }); });
    const sceneViewBtn = document.getElementById('btn-scene-view'); const gameViewBtn = document.getElementById('btn-game-view'); const gameControls = document.getElementById('game-controls'); const gameContent = document.getElementById('game-content'); const playBtn = document.getElementById('btn-play'); const pauseBtn = document.getElementById('btn-pause'); const stopBtn = document.getElementById('btn-stop'); sceneViewBtn.addEventListener('click', () => { gameContent.style.display = 'none'; sceneContent.style.display = 'block'; gameControls.style.display = 'none'; gameViewBtn.classList.remove('active'); sceneViewBtn.classList.add('active'); }); gameViewBtn.addEventListener('click', () => { sceneContent.style.display = 'none'; gameContent.style.display = 'block'; gameControls.style.display = 'flex'; sceneViewBtn.classList.remove('active'); gameViewBtn.classList.add('active'); }); playBtn.addEventListener('click', () => { playBtn.style.display = 'none'; pauseBtn.style.display = 'inline-block'; stopBtn.style.display = 'inline-block'; }); pauseBtn.addEventListener('click', () => { pauseBtn.style.display = 'none'; playBtn.style.display = 'inline-block'; }); stopBtn.addEventListener('click', () => { stopBtn.style.display = 'none'; pauseBtn.style.display = 'none'; playBtn.style.display = 'inline-block'; });
    console.log('Creative Engine Editor Initialized with Tool Logic.');
});
