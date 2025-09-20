import { Renderer } from '../../engine/Renderer.js';
import * as Components from '../../engine/Components.js';
import * as SceneManager from '../../engine/SceneManager.js';
import * as MathUtils from '../../engine/MathUtils.js';

let dom;
let getSelectedMateria;
let previewRenderer;
let isVisible = false;

function renderPreview() {
    if (!isVisible || !previewRenderer) return;

    const selected = getSelectedMateria();
    const cameraMateria = selected && selected.hasComponent(Components.Camera) ? selected : null;

    if (cameraMateria) {
        // Similar to updateScene in editor.js, but for the preview
        const cameraComponent = cameraMateria.getComponent(Components.Camera);
        previewRenderer.clear(cameraComponent.backgroundColor);

        const materiasToRender = SceneManager.currentScene.getAllMaterias()
            .filter(m => m.getComponent(Components.Transform) && m.getComponent(Components.SpriteRenderer))
            .sort((a, b) => a.getComponent(Components.Transform).y - b.getComponent(Components.Transform).y);

        const drawObjects = (ctx, cameraForCulling) => {
            const aspect = previewRenderer.canvas.width / previewRenderer.canvas.height;
            const cameraViewBox = cameraForCulling ? MathUtils.getCameraViewBox(cameraForCulling, aspect) : null;

            for (const materia of materiasToRender) {
                if (!materia.isActive) continue;
                if (cameraForCulling) {
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
        // Display "No camera selected" message
        previewRenderer.clear('#222');
        const ctx = previewRenderer.ctx;
        ctx.save();
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '16px Arial';
        ctx.fillText('Ninguna cámara seleccionada', previewRenderer.canvas.width / 2, previewRenderer.canvas.height / 2);
        ctx.restore();
    }
}

export function initialize(dependencies) {
    dom = dependencies.dom;
    getSelectedMateria = dependencies.getSelectedMateriaCallback;

    if (!dom.cameraPreviewCanvas) {
        console.error("Camera Preview Window: Canvas element not found!");
        return;
    }

    previewRenderer = new Renderer(dom.cameraPreviewCanvas);

    dom.cameraPreviewBtn.addEventListener('click', () => {
        isVisible = !isVisible;
        dom.cameraPreviewPanel.classList.toggle('hidden', !isVisible);
        if (isVisible) {
            previewRenderer.resize();
            renderPreview();
        }
    });

    // Also handle the close button on the panel
    const closeBtn = dom.cameraPreviewPanel.querySelector('.close-panel-btn');
    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            isVisible = false;
            dom.cameraPreviewPanel.classList.add('hidden');
        });
    }

    // Resize the canvas when the panel is resized
    const resizeObserver = new ResizeObserver(() => {
        if(previewRenderer) {
            previewRenderer.resize();
            renderPreview();
        }
    });
    resizeObserver.observe(dom.cameraPreviewPanel);
}

export function update() {
    renderPreview();
}
