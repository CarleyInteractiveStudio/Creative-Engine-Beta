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

    // --- DOM Elements ---
    const projectNameDisplay = document.getElementById('project-name-display');
    const hierarchyContent = document.getElementById('hierarchy-content');
    const addMateriaBtn = document.getElementById('add-materia-btn');
    const inspectorContent = document.getElementById('inspector-panel').querySelector('.panel-content');
    const sceneContent = document.getElementById('scene-content');

    // --- Core Editor Functions ---
    function updateHierarchy() {
        hierarchyContent.innerHTML = '';
        for (const materia of currentScene.materias) {
            const item = document.createElement('div');
            item.className = 'hierarchy-item';
            item.textContent = materia.name;
            item.dataset.id = materia.id;
            if (selectedMateria && materia.id === selectedMateria.id) {
                item.classList.add('active');
            }
            hierarchyContent.appendChild(item);
        }
    }

    function updateInspector() {
        inspectorContent.innerHTML = '';
        if (!selectedMateria) {
            inspectorContent.innerHTML = '<p class="inspector-placeholder">Nada seleccionado</p>';
            return;
        }
        const transform = selectedMateria.getComponent(Transform);

        inspectorContent.innerHTML = `
            <label for="materia-name">Nombre</label>
            <input type="text" id="materia-name" value="${selectedMateria.name}">
            <h4>Transform</h4>
            <div class="transform-grid">
                <label>X</label><input type="number" id="pos-x" value="${transform.x}">
                <label>Y</label><input type="number" id="pos-y" value="${transform.y}">
            </div>
        `;

        document.getElementById('materia-name').addEventListener('change', (e) => {
            selectedMateria.name = e.target.value;
            updateHierarchy();
        });
        document.getElementById('pos-x').addEventListener('change', (e) => {
            transform.x = parseFloat(e.target.value) || 0;
            updateScene();
        });
        document.getElementById('pos-y').addEventListener('change', (e) => {
            transform.y = parseFloat(e.target.value) || 0;
            updateScene();
        });
    }

    function updateScene() {
        for (const materia of currentScene.materias) {
            let vis = document.getElementById(`materia-vis-${materia.id}`);
            if (!vis) {
                vis = document.createElement('div');
                vis.id = `materia-vis-${materia.id}`;
                vis.className = 'scene-object-vis';
                sceneContent.appendChild(vis);
            }
            const transform = materia.getComponent(Transform);
            vis.style.transform = `translate(${transform.x}px, ${transform.y}px)`;

            if (selectedMateria && materia.id === selectedMateria.id) {
                vis.classList.add('active');
            } else {
                vis.classList.remove('active');
            }
        }
    }

    function selectMateria(materiaId) {
        selectedMateria = currentScene.findMateriaById(materiaId);
        updateHierarchy();
        updateInspector();
        updateScene(); // Update scene to highlight selected object
    }

    // --- Event Listeners ---
    addMateriaBtn.addEventListener('click', () => {
        const newMateria = new Materia();
        currentScene.addMateria(newMateria);
        selectMateria(newMateria.id);
    });

    hierarchyContent.addEventListener('click', (event) => {
        const target = event.target.closest('.hierarchy-item');
        if (target) {
            selectMateria(parseInt(target.dataset.id, 10));
        }
    });

    // --- Initial Setup & Other Logic ---
    updateHierarchy();
    updateInspector();
    // ... (rest of the file is the same)
    const params = new URLSearchParams(window.location.search);
    projectNameDisplay.textContent = params.get('project') || "Proyecto sin nombre";
    const themeButtons = document.querySelectorAll('.theme-btn');
    const htmlElement = document.documentElement;
    themeButtons.forEach(button => { button.addEventListener('click', () => { htmlElement.setAttribute('data-theme', button.dataset.themeSet); themeButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); }); });
    const sceneViewBtn = document.getElementById('btn-scene-view');
    const gameViewBtn = document.getElementById('btn-game-view');
    const gameControls = document.getElementById('game-controls');
    const gameContent = document.getElementById('game-content');
    const playBtn = document.getElementById('btn-play');
    const pauseBtn = document.getElementById('btn-pause');
    const stopBtn = document.getElementById('btn-stop');
    sceneViewBtn.addEventListener('click', () => { gameContent.style.display = 'none'; sceneContent.style.display = 'block'; gameControls.style.display = 'none'; gameViewBtn.classList.remove('active'); sceneViewBtn.classList.add('active'); });
    gameViewBtn.addEventListener('click', () => { sceneContent.style.display = 'none'; gameContent.style.display = 'block'; gameControls.style.display = 'flex'; sceneViewBtn.classList.remove('active'); gameViewBtn.classList.add('active'); });
    playBtn.addEventListener('click', () => { playBtn.style.display = 'none'; pauseBtn.style.display = 'inline-block'; stopBtn.style.display = 'inline-block'; });
    pauseBtn.addEventListener('click', () => { pauseBtn.style.display = 'none'; playBtn.style.display = 'inline-block'; });
    stopBtn.addEventListener('click', () => { stopBtn.style.display = 'none'; pauseBtn.style.display = 'none'; playBtn.style.display = 'inline-block'; });
    console.log('Creative Engine Editor Initialized with Full Scene Sync.');
});
