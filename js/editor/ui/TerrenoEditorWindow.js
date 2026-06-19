
import * as SceneManager from '../../engine/SceneManager.js';
import * as Components from '../../engine/Components.js';

export const TerrenoEditorWindow = {
    settings: {
        activeTab: 'sculpt', // 'sculpt', 'paint', 'trees', 'vegetation'
        brushSize: 50,
        brushStrength: 50,
        brushShape: 'circle', // 'circle', 'square', 'mountain'
        sculptMode: 'elevate', // 'elevate', 'smooth', 'flatten', 'hole'
        paintColor: '#3d5c2e',
        treePrefab: null,
        grassType: 'grass_01'
    },

    initialize(dependencies) {
        this.dom = dependencies.dom;
        this.updateInspector = dependencies.updateInspector;
        this.setupUI();
    },

    setupUI() {
        const container = document.getElementById('terreno-editor-container');
        if (!container) return;

        const L = window.Localization;

        container.innerHTML = `
            <div class="terrain-editor-tabs">
                <button class="tab-btn active" data-tab="sculpt">${L.get('TERRENO_ESCULPIR', 'Esculpir')}</button>
                <button class="tab-btn" data-tab="paint">${L.get('TERRENO_PINTAR', 'Pintar')}</button>
                <button class="tab-btn" data-tab="trees">${L.get('TERRENO_ARBOLES', 'Árboles')}</button>
                <button class="tab-btn" data-tab="vegetation">${L.get('TERRENO_VEGETACION', 'Vegetación')}</button>
            </div>
            <div class="terrain-editor-content">
                <div class="section-group">
                    <label>${L.get('BRUSH_SIZE', 'Tamaño de Pincel')}</label>
                    <input type="range" id="terrain-brush-size" min="5" max="500" value="${this.settings.brushSize}">
                </div>
                <div class="section-group">
                    <label>${L.get('BRUSH_STRENGTH', 'Fuerza')}</label>
                    <input type="range" id="terrain-brush-strength" min="1" max="100" value="${this.settings.brushStrength}">
                </div>

                <div id="terrain-tab-sculpt" class="terrain-tab-content active">
                    <div class="brush-shapes">
                        <button class="shape-btn active" data-shape="circle" title="Círculo">●</button>
                        <button class="shape-btn" data-shape="square" title="Cuadrado">■</button>
                        <button class="shape-btn" data-shape="mountain" title="Montaña">▲</button>
                    </div>
                    <div class="sculpt-modes">
                        <button class="mode-btn active" data-mode="elevate">${L.get('TERRENO_ELEV_BAJAR', 'Elevar/Bajar')}</button>
                        <button class="mode-btn" data-mode="smooth">${L.get('TERRENO_SUAVIZAR', 'Suavizar')}</button>
                        <button class="mode-btn" data-mode="flatten">${L.get('TERRENO_APLANAR', 'Aplanar')}</button>
                        <button class="mode-btn" data-mode="hole">${L.get('TERRENO_HUECO', 'Hueco (Cueva)')}</button>
                    </div>
                </div>

                <div id="terrain-tab-paint" class="terrain-tab-content">
                    <label>${L.get('COLOR_PINTURA', 'Color / Pintura 3D')}</label>
                    <input type="color" id="terrain-paint-color" value="${this.settings.paintColor}">
                </div>

                <div id="terrain-tab-trees" class="terrain-tab-content">
                    <div class="asset-drop-zone" id="tree-prefab-drop">
                        ${this.settings.treePrefab || L.get('SOLTAR_PREFAB_ARBOL', 'Suelta un Prefab de Árbol aquí')}
                    </div>
                </div>

                <div id="terrain-tab-vegetation" class="terrain-tab-content">
                    <select id="vegetation-type-select">
                        <option value="grass_01">Pasto Verde</option>
                        <option value="grass_dry">Pasto Seco</option>
                        <option value="flower_red">Flores Rojas</option>
                    </select>
                </div>
            </div>
        `;

        this.attachListeners(container);
    },

    attachListeners(container) {
        container.querySelector('.terrain-editor-tabs').addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            if (!tab) return;
            this.settings.activeTab = tab;
            container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === e.target));
            container.querySelectorAll('.terrain-tab-content').forEach(c => c.classList.toggle('active', c.id === `terrain-tab-${tab}`));
        });

        container.querySelector('#terrain-brush-size').oninput = (e) => this.settings.brushSize = parseFloat(e.target.value);
        container.querySelector('#terrain-brush-strength').oninput = (e) => this.settings.brushStrength = parseFloat(e.target.value);

        container.querySelectorAll('.shape-btn').forEach(btn => {
            btn.onclick = () => {
                this.settings.brushShape = btn.dataset.shape;
                container.querySelectorAll('.shape-btn').forEach(b => b.classList.toggle('active', b === btn));
            };
        });

        container.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = () => {
                this.settings.sculptMode = btn.dataset.mode;
                container.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));
            };
        });

        container.querySelector('#terrain-paint-color').oninput = (e) => this.settings.paintColor = e.target.value;
    }
};
