// js/editor/ui/VerificationSystem.js

let dom = {};

export function initialize(dependencies) {
    dom = {
        panel: document.getElementById('verification-system-panel'),
        tileImage: document.getElementById('verification-tile-image'),
        statusText: document.getElementById('verification-status-text'),
        detailsText: document.getElementById('verification-details-text'),
    };
    console.log("Verification System Initialized.");
}

export function showPanel() {
    if (dom.panel) {
        dom.panel.classList.remove('hidden');
    }
}

export function hidePanel() {
    if (dom.panel) {
        dom.panel.classList.add('hidden');
    }
}

export function updateStatus(tile, success, message, details = '') {
    if (!dom.panel) return;

    if (tile && tile.imageData) {
        dom.tileImage.src = tile.imageData;
    } else {
        dom.tileImage.src = '';
    }

    dom.statusText.textContent = message;
    dom.statusText.className = success ? 'success' : 'error';

    if (typeof details === 'object') {
        dom.detailsText.textContent = JSON.stringify(details, null, 2);
    } else {
        dom.detailsText.textContent = details;
    }
}
