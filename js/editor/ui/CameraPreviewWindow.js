import * as SceneManager from '../../engine/SceneManager.js';

let dom;
let isPanelVisible = false;
let hasCameras = false;

// --- Drag and Resize Logic ---
function initializeInScenePanel(panel, container) {
    const header = panel.querySelector('.panel-header');
    let isDragging = false;
    let offsetX, offsetY;

    if (!header || !container) return;

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;
        panel.style.zIndex = 101; // Bring to front
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const parentRect = container.getBoundingClientRect();

        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // Clamp position within the parent container
        newX = Math.max(0, Math.min(newX, parentRect.width - panel.offsetWidth));
        newY = Math.max(0, Math.min(newY, parentRect.height - panel.offsetHeight));

        panel.style.left = `${newX}px`;
        panel.style.top = `${newY}px`;
        panel.style.bottom = 'auto'; // Override the initial 'bottom' style
        panel.style.right = 'auto'; // Override the initial 'right' style
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.zIndex = 100;
            document.body.style.userSelect = '';
        }
    });

    const resizeHandles = panel.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
        let isResizing = false;

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isResizing = true;
            const direction = handle.dataset.direction;
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = panel.offsetWidth;
            const startHeight = panel.offsetHeight;
            const startLeft = panel.offsetLeft;
            const startTop = panel.offsetTop;
            document.body.style.userSelect = 'none';

            function onMouseMove(moveEvent) {
                if (!isResizing) return;
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                const parentRect = container.getBoundingClientRect();

                if (direction.includes('e')) {
                    const newWidth = Math.min(startWidth + dx, parentRect.width - startLeft);
                    panel.style.width = `${Math.max(150, newWidth)}px`;
                }
                if (direction.includes('w')) {
                    const newWidth = startWidth - dx;
                    if (newWidth > 150) {
                        panel.style.width = `${newWidth}px`;
                        panel.style.left = `${startLeft + dx}px`;
                    }
                }
                if (direction.includes('s')) {
                     const newHeight = Math.min(startHeight + dy, parentRect.height - startTop);
                    panel.style.height = `${Math.max(100, newHeight)}px`;
                }
                if (direction.includes('n')) {
                    const newHeight = startHeight - dy;
                    if (newHeight > 100) {
                        panel.style.height = `${newHeight}px`;
                        panel.style.top = `${startTop + dy}px`;
                    }
                }

                panel.style.bottom = 'auto';
                panel.style.right = 'auto';
            }

            function onMouseUp() {
                isResizing = false;
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                document.body.style.userSelect = '';
            }

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    });
}


// --- Core Logic ---
function checkCameraPresence() {
    if (!SceneManager.currentScene) return;
    const cameras = SceneManager.currentScene.findAllCameras();
    const newHasCameras = cameras.length > 0;

    if (newHasCameras !== hasCameras) {
        hasCameras = newHasCameras;
        if (dom.cameraPreviewBtn) {
            dom.cameraPreviewBtn.style.display = hasCameras ? 'flex' : 'none';
        }

        if (!hasCameras && isPanelVisible) {
            isPanelVisible = false;
            if (dom.cameraPreviewPanel) {
                dom.cameraPreviewPanel.classList.add('hidden');
            }
        }
    }
}

function mirrorGameView() {
    if (!isPanelVisible) return;

    const gameCanvas = dom.gameCanvas;
    const previewCanvas = dom.cameraPreviewCanvas;

    if (gameCanvas && previewCanvas && gameCanvas.width > 0 && gameCanvas.height > 0) {
        const previewCtx = previewCanvas.getContext('2d');

        const aspect = gameCanvas.width / gameCanvas.height;
        const panelWidth = previewCanvas.parentElement.clientWidth;
        const panelHeight = previewCanvas.parentElement.clientHeight;

        previewCanvas.width = panelWidth;
        previewCanvas.height = panelWidth / aspect;

        if(previewCanvas.height > panelHeight) {
            previewCanvas.height = panelHeight;
            previewCanvas.width = panelHeight * aspect;
        }

        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.drawImage(gameCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
    }
}


// --- Public API ---
export function initialize(dependencies) {
    dom = dependencies.dom;

    if (!dom.cameraPreviewPanel || !dom.sceneContent) {
        console.error("Camera Preview Window: Core elements not found!");
        return;
    }

    // Toggle panel visibility
    dom.cameraPreviewBtn.addEventListener('click', () => {
        isPanelVisible = !isPanelVisible;
        dom.cameraPreviewPanel.classList.toggle('hidden', !isPanelVisible);
    });

    const closeBtn = dom.cameraPreviewPanel.querySelector('.close-panel-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isPanelVisible = false;
            dom.cameraPreviewPanel.classList.add('hidden');
        });
    }

    initializeInScenePanel(dom.cameraPreviewPanel, dom.sceneContent);
}

export function update() {
    checkCameraPresence();
    mirrorGameView();
}
