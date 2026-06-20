// js/editor/FloatingPanelManager.js
// --- Module for managing floating panels (drag, resize, and z-index) ---

let highestZ = 20000; // Start well above dialogs to ensure they can be brought to front

export function bringToFront(panel) {
    highestZ += 1;
    panel.style.zIndex = highestZ;
}

function initializePanel(panel) {
    const header = panel.querySelector('.panel-header');
    let offsetX, offsetY, isDragging = false;
    let isResizing = false;

    // Bring panel to front on any mousedown
    panel.addEventListener('mousedown', () => bringToFront(panel));

    // Dragging logic
    if (header) {
        header.style.touchAction = 'none';
        header.addEventListener('pointerdown', (e) => {
            // Ignore clicks on buttons inside the header
            if (e.target.closest('button, input, select, .resize-handle')) return;

            // Prevent dragging when the panel is maximized
            if (panel.classList.contains('maximized')) return;

            isDragging = true;
            header.setPointerCapture(e.pointerId);
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
            document.body.style.userSelect = 'none'; // Prevent text selection

            const onPointerMove = (moveEvent) => {
                if (isDragging) {
                    let left = moveEvent.clientX - offsetX;
                    let top = moveEvent.clientY - offsetY;

                    // Clamp to viewport
                    const maxLeft = window.innerWidth - panel.offsetWidth;
                    const maxTop = window.innerHeight - panel.offsetHeight;

                    left = Math.max(0, Math.min(left, maxLeft));
                    top = Math.max(0, Math.min(top, maxTop));

                    panel.style.left = `${left}px`;
                    panel.style.top = `${top}px`;
                }
            };

            const onPointerUp = (upEvent) => {
                isDragging = false;
                header.releasePointerCapture(upEvent.pointerId);
                document.body.style.userSelect = '';
                header.removeEventListener('pointermove', onPointerMove);
                header.removeEventListener('pointerup', onPointerUp);
                header.removeEventListener('pointercancel', onPointerUp);
            };

            header.addEventListener('pointermove', onPointerMove);
            header.addEventListener('pointerup', onPointerUp);
            header.addEventListener('pointercancel', onPointerUp);
        });
    }

    // Maximize button logic
    const maximizeBtn = panel.querySelector('.maximize-btn');
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            panel.classList.remove('fullscreen');
            panel.classList.remove('minimized');
            panel.classList.toggle('maximized');
            // Optional: a function to notify other parts of the app a resize happened
            window.dispatchEvent(new Event('resize'));
        });
    }

    // Fullscreen button logic
    const fullscreenBtn = panel.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            panel.classList.remove('maximized');
            panel.classList.remove('minimized');
            panel.classList.toggle('fullscreen');
            window.dispatchEvent(new Event('resize'));
        });
    }

    // Minimize button logic
    const minimizeBtn = panel.querySelector('.minimize-btn');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            panel.classList.remove('maximized');
            panel.classList.remove('fullscreen');
            panel.classList.toggle('minimized');
            window.dispatchEvent(new Event('resize'));
        });
    }

    // Resizing logic
    panel.querySelectorAll('.resize-handle').forEach(handle => {
        handle.style.touchAction = 'none';
        handle.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); // Important to avoid triggering drag
            isResizing = true;
            handle.setPointerCapture(e.pointerId);
            const direction = handle.dataset.direction;
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = panel.offsetWidth;
            const startHeight = panel.offsetHeight;
            const startLeft = panel.offsetLeft;
            const startTop = panel.offsetTop;

            document.body.style.userSelect = 'none';

            function onPointerMove(moveEvent) {
                if (!isResizing) return;

                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                const viewportW = window.innerWidth;
                const viewportH = window.innerHeight;

                if (direction.includes('e')) {
                    let newWidth = startWidth + dx;
                    if (newWidth < 200) newWidth = 200;
                    if (startLeft + newWidth > viewportW) newWidth = viewportW - startLeft;
                    panel.style.width = `${newWidth}px`;
                }
                if (direction.includes('w')) {
                    let newWidth = startWidth - dx;
                    let newLeft = startLeft + dx;
                    if (newWidth < 200) {
                        newLeft = startLeft + (startWidth - 200);
                        newWidth = 200;
                    }
                    if (newLeft < 0) {
                        newWidth = startWidth + startLeft;
                        newLeft = 0;
                    }
                    panel.style.width = `${newWidth}px`;
                    panel.style.left = `${newLeft}px`;
                }
                if (direction.includes('s')) {
                    let newHeight = startHeight + dy;
                    if (newHeight < 150) newHeight = 150;
                    if (startTop + newHeight > viewportH) newHeight = viewportH - startTop;
                    panel.style.height = `${newHeight}px`;
                }
                if (direction.includes('n')) {
                    let newHeight = startHeight - dy;
                    let newTop = startTop + dy;
                    if (newHeight < 150) {
                        newTop = startTop + (startHeight - 150);
                        newHeight = 150;
                    }
                    if (newTop < 0) {
                        newHeight = startHeight + startTop;
                        newTop = 0;
                    }
                    panel.style.height = `${newHeight}px`;
                    panel.style.top = `${newTop}px`;
                }

                // Trigger a local event for components inside that need to react to resize
                panel.dispatchEvent(new CustomEvent('panel-resize'));
            }

            function onPointerUp(upEvent) {
                isResizing = false;
                handle.releasePointerCapture(upEvent.pointerId);
                handle.removeEventListener('pointermove', onPointerMove);
                handle.removeEventListener('pointerup', onPointerUp);
                handle.removeEventListener('pointercancel', onPointerUp);
                document.body.style.userSelect = '';
            }

            handle.addEventListener('pointermove', onPointerMove);
            handle.addEventListener('pointerup', onPointerUp);
            handle.addEventListener('pointercancel', onPointerUp);
        });
    });
}

export function initializeFloatingPanels() {
    const panels = document.querySelectorAll('.floating-panel');
    panels.forEach(initializePanel);
}

export function createFloatingPanel(id, options = {}) {
    const { title = 'Panel Flotante', content = '', width = 400, height = 300, top = 100, left = 100, className = '' } = options;

    const panel = document.createElement('div');
    panel.id = id;
    panel.className = `editor-panel floating-panel ${className}`;
    panel.style.width = `${width}px`;
    panel.style.height = `${height}px`;
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;

    panel.innerHTML = `
        <div class="panel-header">
            <span>${title}</span>
            <div class="panel-header-controls">
                <button class="panel-tool-btn minimize-btn" title="Minimizar"><img src="icons/minus.svg" class="ce-icon"></button>
                <button class="panel-tool-btn maximize-btn" title="Maximizar/Restaurar"><img src="icons/maximize-2.svg" class="ce-icon"></button>
                <button class="panel-tool-btn fullscreen-btn" title="Pantalla Completa"><img src="icons/maximize.svg" class="ce-icon"></button>
                <button class="close-panel-btn" data-panel="${id}">&times;</button>
            </div>
        </div>
        <div class="panel-content">${content}</div>
        <div class="resize-handle" data-direction="n"></div>
        <div class="resize-handle" data-direction="ne"></div>
        <div class="resize-handle" data-direction="e"></div>
        <div class="resize-handle" data-direction="se"></div>
        <div class="resize-handle" data-direction="s"></div>
        <div class="resize-handle" data-direction="sw"></div>
        <div class="resize-handle" data-direction="w"></div>
        <div class="resize-handle" data-direction="nw"></div>
    `;

    document.getElementById('editor-container').appendChild(panel);

    // Make the new panel draggable and resizable
    initializePanel(panel);

    // Attach close button logic
    panel.querySelector('.close-panel-btn').addEventListener('click', () => {
        panel.remove();
    });

    return panel;
}

/**
 * Resets all floating panels to their default positions (centered).
 */
export function resetWindows() {
    const panels = document.querySelectorAll('.floating-panel');
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    panels.forEach(panel => {
        // Reset state
        panel.classList.remove('maximized', 'fullscreen', 'minimized');

        // Use initial or default dimensions
        const width = parseInt(panel.style.width) || 400;
        const height = parseInt(panel.style.height) || 300;

        // Center
        panel.style.left = `${(viewportWidth - width) / 2}px`;
        panel.style.top = `${(viewportHeight - height) / 2}px`;

        // Ensure it's not out of bounds
        if (parseInt(panel.style.top) < 40) panel.style.top = '50px';
    });
}
