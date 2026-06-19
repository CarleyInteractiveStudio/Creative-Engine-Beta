/**
 * ExtensionsWindow.js
 * (c) 2024 Carley Interactive Studio
 */

import { ExtensionsManager } from '../../engine/ExtensionsManager.js';

let dom = {};

export function showExtensionsWindow() {
    const L = window.Localization;
    const existing = document.getElementById('extensions-window');
    if (existing) {
        existing.style.display = 'block';
        updateContent();
        return;
    }

    const win = document.createElement('div');
    win.id = 'extensions-window';
    win.className = 'floating-panel';
    win.innerHTML = `
        <div class="panel-header">
            <span class="panel-title">${L.get('EXTENSIONES', 'Extensiones')}</span>
            <button class="close-btn">&times;</button>
        </div>
        <div class="panel-content">
            <div class="extensions-grid"></div>
        </div>
    `;

    document.body.appendChild(win);
    dom.grid = win.querySelector('.extensions-grid');

    win.querySelector('.close-btn').onclick = () => win.style.display = 'none';

    updateContent();
}

async function updateContent() {
    const L = window.Localization;
    const extensions = ExtensionsManager.getAvailableExtensions();
    dom.grid.innerHTML = '';

    for (const ext of extensions) {
        const card = document.createElement('div');
        card.className = 'extension-card';

        const isDownloaded = await ExtensionsManager.isExtensionDownloaded(ext.assets[0].path);

        card.innerHTML = `
            <img src="${ext.thumbnail}" class="card-thumb">
            <div class="card-info">
                <h3>${ext.name}</h3>
                <p>${ext.description}</p>
                <button class="download-btn ${isDownloaded ? 'downloaded' : ''}">
                    ${isDownloaded ? L.get('DESCARGADO', 'Descargado') : L.get('DESCARGAR', 'Descargar')}
                </button>
            </div>
        `;

        const btn = card.querySelector('.download-btn');
        if (!isDownloaded) {
            btn.onclick = async () => {
                btn.disabled = true;
                btn.textContent = L.get('DESCARGANDO', 'Descargando...');

                let success = true;
                for (const asset of ext.assets) {
                    const ok = await ExtensionsManager.downloadExtension(asset.path, asset.url);
                    if (!ok) success = false;
                }

                if (success) {
                    btn.classList.add('downloaded');
                    btn.textContent = L.get('DESCARGADO', 'Descargado');
                } else {
                    btn.disabled = false;
                    btn.textContent = L.get('ERROR', 'Error');
                }
            };
        }

        dom.grid.appendChild(card);
    }
}
