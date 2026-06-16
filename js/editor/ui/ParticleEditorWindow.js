// js/editor/ui/ParticleEditorWindow.js

import * as Components from '../../engine/Components.js';

let dom;
let getSelectedMateria;
let currentPS = null;

export function initialize(dependencies) {
    dom = dependencies.dom;
    getSelectedMateria = dependencies.getSelectedMateria;

    createWindow();
}

function createWindow() {
    if (document.getElementById('particle-editor-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'particle-editor-panel';
    panel.className = 'editor-panel floating-panel hidden';
    panel.style.width = '350px';
    panel.style.height = '600px';

    panel.innerHTML = `
        <div class="panel-header">
            <span data-i18n="EDITOR_PARTICULAS">Editor de Partículas</span>
            <button class="close-panel-btn" data-panel="particle-editor-panel">&times;</button>
        </div>
        <div class="panel-content scroll-no-bar">
            <div id="ps-editor-no-selection" class="panel-overlay-message">
                <p data-i18n="PS_SELECT_HINT">Selecciona una Materia con Sistema de Partículas para empezar.</p>
            </div>
            <div id="ps-editor-content" class="hidden">
                <fieldset class="inspector-section">
                    <legend data-i18n="PRESETS">Presets</legend>
                    <div class="color-swatch-container">
                        <button class="ps-preset-btn" data-preset="fire">🔥 <span data-i18n="FUEGO">Fuego</span></button>
                        <button class="ps-preset-btn" data-preset="smoke">💨 <span data-i18n="HUMO">Humo</span></button>
                        <button class="ps-preset-btn" data-preset="explosion">💥 <span data-i18n="EXPLOSION">Explosión</span></button>
                        <button class="ps-preset-btn" data-preset="magic">✨ <span data-i18n="MAGIA">Magia</span></button>
                    </div>
                </fieldset>

                <fieldset class="inspector-section">
                    <legend data-i18n="EMISION">Emisión</legend>
                    <div class="inspector-row">
                        <label data-i18n="MAX_PARTICULAS">Máx Partículas</label>
                        <input type="number" id="ps-max-particles" min="1" max="500">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="TASA_EMISION">Tasa Emisión</label>
                        <input type="number" id="ps-emission-rate" min="0" step="0.5">
                    </div>
                </fieldset>

                <fieldset class="inspector-section">
                    <legend data-i18n="FISICA_TIEMPO">Física y Tiempo</legend>
                    <div class="inspector-row">
                        <label data-i18n="VIDA_SEG">Vida (seg)</label>
                        <input type="number" id="ps-lifetime" min="0.1" step="0.1">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="VELOCIDAD">Velocidad</label>
                        <input type="number" id="ps-speed">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="DISPERSION">Dispersión (º)</label>
                        <input type="number" id="ps-spread" min="0" max="360">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="GRAVEDAD">Gravedad</label>
                        <input type="number" id="ps-gravity" step="0.1">
                    </div>
                </fieldset>

                <fieldset class="inspector-section">
                    <legend data-i18n="VISUALES">Visuales</legend>
                    <div class="inspector-row">
                        <label data-i18n="COLOR_INICIO">Color Inicio</label>
                        <input type="color" id="ps-start-color">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="COLOR_FIN">Color Fin</label>
                        <input type="color" id="ps-end-color">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="TAMANO_INICIO">Tamaño Inicio</label>
                        <input type="number" id="ps-start-size" step="0.1" min="0">
                    </div>
                    <div class="inspector-row">
                        <label data-i18n="TAMANO_FIN">Tamaño Fin</label>
                        <input type="number" id="ps-end-size" step="0.1" min="0">
                    </div>
                    <div class="checkbox-field">
                        <input type="checkbox" id="ps-fade-alpha">
                        <label data-i18n="DESVANECER_ALPHA">Desvanecer Alpha</label>
                    </div>
                </fieldset>
            </div>
        </div>
    `;

    document.getElementById('editor-main-content').appendChild(panel);
    setupEventListeners(panel);
}

function setupEventListeners(panel) {
    const inputs = panel.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', () => updateComponentFromUI());
        input.addEventListener('input', () => updateComponentFromUI());
    });

    panel.querySelectorAll('.ps-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });
}

export function refresh() {
    const materia = getSelectedMateria();
    const ps = materia?.getComponent(Components.ParticleSystem);
    const content = document.getElementById('ps-editor-content');
    const hint = document.getElementById('ps-editor-no-selection');

    if (ps) {
        currentPS = ps;
        content.classList.remove('hidden');
        hint.classList.add('hidden');
        updateUIFromComponent();
    } else {
        currentPS = null;
        content.classList.add('hidden');
        hint.classList.remove('hidden');
    }
}

function updateUIFromComponent() {
    if (!currentPS) return;

    document.getElementById('ps-max-particles').value = currentPS.maxParticles;
    document.getElementById('ps-emission-rate').value = currentPS.emissionRate;
    document.getElementById('ps-lifetime').value = currentPS.lifetime;
    document.getElementById('ps-speed').value = currentPS.speed;
    document.getElementById('ps-spread').value = currentPS.spread;
    document.getElementById('ps-gravity').value = currentPS.gravityScale;
    document.getElementById('ps-start-color').value = currentPS.startColor;
    document.getElementById('ps-end-color').value = currentPS.endColor;
    document.getElementById('ps-start-size').value = currentPS.startSize;
    document.getElementById('ps-end-size').value = currentPS.endSize;
    document.getElementById('ps-fade-alpha').checked = currentPS.fadeAlpha;
}

function updateComponentFromUI() {
    if (!currentPS) return;

    currentPS.maxParticles = parseInt(document.getElementById('ps-max-particles').value);
    currentPS.emissionRate = parseFloat(document.getElementById('ps-emission-rate').value);
    currentPS.lifetime = parseFloat(document.getElementById('ps-lifetime').value);
    currentPS.speed = parseFloat(document.getElementById('ps-speed').value);
    currentPS.spread = parseFloat(document.getElementById('ps-spread').value);
    currentPS.gravityScale = parseFloat(document.getElementById('ps-gravity').value);
    currentPS.startColor = document.getElementById('ps-start-color').value;
    currentPS.endColor = document.getElementById('ps-end-color').value;
    currentPS.startSize = parseFloat(document.getElementById('ps-start-size').value);
    currentPS.endSize = parseFloat(document.getElementById('ps-end-size').value);
    currentPS.fadeAlpha = document.getElementById('ps-fade-alpha').checked;

    if (window.updateScene) window.updateScene();
}

function applyPreset(preset) {
    if (!currentPS) return;

    const presets = {
        fire: {
            maxParticles: 100, emissionRate: 30, lifetime: 0.8, speed: 150, spread: 30,
            gravityScale: -0.5, startColor: "#ffcc00", endColor: "#ff3300",
            startSize: 1.5, endSize: 0.2, fadeAlpha: true
        },
        smoke: {
            maxParticles: 50, emissionRate: 10, lifetime: 2.5, speed: 50, spread: 40,
            gravityScale: -0.1, startColor: "#666666", endColor: "#333333",
            startSize: 1.0, endSize: 3.0, fadeAlpha: true
        },
        explosion: {
            maxParticles: 40, emissionRate: 0, lifetime: 0.5, speed: 400, spread: 360,
            gravityScale: 0.2, startColor: "#ffff00", endColor: "#ff0000",
            startSize: 1.0, endSize: 0.1, fadeAlpha: true
        },
        magic: {
            maxParticles: 150, emissionRate: 50, lifetime: 1.5, speed: 80, spread: 360,
            gravityScale: 0, startColor: "#00ffff", endColor: "#9900ff",
            startSize: 0.5, endSize: 1.0, fadeAlpha: true
        }
    };

    const data = presets[preset];
    if (data) {
        Object.assign(currentPS, data);
        if (preset === 'explosion') {
            currentPS.emit(); // Burst
        }
        updateUIFromComponent();
        if (window.updateScene) window.updateScene();
    }
}
