import { Renderer } from '../../engine/Renderer.js';
import * as Components from '../../engine/Components.js';
import * as SceneManager from '../../engine/SceneManager.js';
import * as MathUtils from '../../engine/MathUtils.js';

let dom;
let previewRenderer;
let isPanelVisible = false;
let sceneCameras = [];
let activePreviewCameraId = null;
let lastKnownCameraIds = '';

// --- Core Rendering Logic ---
function renderPreview() {
    if (!isPanelVisible || !previewRenderer) return;

    if (!activePreviewCameraId) {
        clearPreview('No hay cámaras disponibles');
        return;
    }

    const cameraMateria = SceneManager.currentScene.findMateriaById(activePreviewCameraId);

    if (cameraMateria) {
        const cameraComponent = cameraMateria.getComponent(Components.Camera);
        previewRenderer.clear(cameraComponent.backgroundColor);

        const materiasToRender = SceneManager.currentScene.getAllMaterias()
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpriteRenderer))
            .sort((a, b) => a.getComponent(Components.Transform).y - b.getComponent(Components.Transform).y);

        const drawObjects = (ctx, cameraForCulling) => {
            const aspect = previewRenderer.canvas.width / previewRenderer.canvas.height;
            const cameraViewBox = MathUtils.getCameraViewBox(cameraForCulling, aspect);

            for (const materia of materiasToRender) {
                if (!materia.isActive) continue;

                if(cameraForCulling) {
                    const objectBounds = MathUtils.getOOB(materia);
                    if (objectBounds && !MathUtils.checkIntersection(cameraViewBox, objectBounds)) {
                        continue;
                    }

                    const objectLayerBit = 1 << materia.layer;
                    if ((cameraComponent.cullingMask & objectLayerBit) === 0) {
                        continue;
                    }
                }

                const spriteRenderer = materia.getComponent(Components.SpriteRenderer);
                const transform = materia.getComponent(Components.Transform);
                if (spriteRenderer && spriteRenderer.sprite && spriteRenderer.sprite.complete && spriteRenderer.sprite.naturalWidth > 0) {
                    const img = spriteRenderer.sprite;
                    const width = img.naturalWidth * transform.scale.x;
                    const height = img.naturalHeight * transform.scale.y;
                    ctx.save();
                    ctx.translate(transform.x, transform.y);
                    ctx.rotate(transform.rotation * Math.PI / 180);
                    ctx.drawImage(img, -width / 2, -height / 2, width, height);
                    ctx.restore();
                }
            }
        };

        previewRenderer.beginWorld(cameraMateria);
        drawObjects(previewRenderer.ctx, cameraMateria);
        previewRenderer.end();
    } else {
        clearPreview('Cámara no encontrada');
        activePreviewCameraId = null; // The camera was likely deleted
    }
}

function clearPreview(message) {
    if (!previewRenderer) return;
    previewRenderer.clear('#222');
    const ctx = previewRenderer.ctx;
    ctx.save();
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px Arial';
    ctx.fillText(message, previewRenderer.canvas.width / 2, previewRenderer.canvas.height / 2);
    ctx.restore();
}

// --- UI and State Management ---
function updateCameraList() {
    if (!SceneManager.currentScene) return;
    sceneCameras = SceneManager.currentScene.findAllCameras();

    const currentCameraIds = sceneCameras.map(c => c.id).join(',');
    if (currentCameraIds === lastKnownCameraIds) {
        return;
    }
    lastKnownCameraIds = currentCameraIds;

    dom.cameraPreviewSelector.innerHTML = '';

    if (sceneCameras.length > 0) {
        dom.cameraPreviewBtn.style.display = 'block';
        dom.cameraPreviewSelector.style.display = 'block';

        sceneCameras.forEach(camMateria => {
            const option = document.createElement('option');
            option.value = camMateria.id;
            option.textContent = camMateria.name || `Cámara (ID: ${camMateria.id})`;
            dom.cameraPreviewSelector.appendChild(option);
        });

        const activeIdExists = sceneCameras.some(c => c.id === activePreviewCameraId);
        if (!activeIdExists) {
            activePreviewCameraId = sceneCameras[0].id;
        }

        dom.cameraPreviewSelector.value = activePreviewCameraId;

    } else {
        dom.cameraPreviewBtn.style.display = 'none';
        dom.cameraPreviewSelector.style.display = 'none';
        activePreviewCameraId = null;
        if (isPanelVisible) {
            isPanelVisible = false;
            dom.cameraPreviewPanel.classList.add('hidden');
        }
    }
}


// --- Public API ---
export function initialize(dependencies) {
    dom = dependencies.dom;

    if (!dom.cameraPreviewCanvas) {
        console.error("Camera Preview Window: Elements not found!");
        return;
    }

    previewRenderer = new Renderer(dom.cameraPreviewCanvas);

    dom.cameraPreviewBtn.addEventListener('click', () => {
        isPanelVisible = !isPanelVisible;
        dom.cameraPreviewPanel.classList.toggle('hidden', !isPanelVisible);
        if (isPanelVisible) {
            previewRenderer.resize();
            renderPreview();
        }
    });

    const closeBtn = dom.cameraPreviewPanel.querySelector('.close-panel-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            isPanelVisible = false;
            dom.cameraPreviewPanel.classList.add('hidden');
        });
    }

    dom.cameraPreviewSelector.addEventListener('change', (e) => {
        activePreviewCameraId = parseInt(e.target.value, 10);
        renderPreview();
    });

    const resizeObserver = new ResizeObserver(() => {
        if (previewRenderer && isPanelVisible) {
            previewRenderer.resize();
            renderPreview();
        }
    });
    resizeObserver.observe(dom.cameraPreviewPanel);
}

export function update() {
    updateCameraList();

    if (isPanelVisible) {
        renderPreview();
    }
}
