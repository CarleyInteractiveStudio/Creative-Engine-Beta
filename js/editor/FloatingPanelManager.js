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
        header.addEventListener('mousedown', (e) => {
            // Ignore clicks on buttons inside the header
            if (e.target.closest('button, input, select, .resize-handle')) return;

            // Prevent dragging when the panel is maximized
            if (panel.classList.contains('maximized')) return;

            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
            document.body.style.userSelect = 'none'; // Prevent text selection

            const onMouseMove = (moveEvent) => {
                if (isDragging) {
                    panel.style.left = `${moveEvent.clientX - offsetX}px`;
                    panel.style.top = `${moveEvent.clientY - offsetY}px`;
                }
            };

            const onMouseUp = () => {
                isDragging = false;
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    // Maximize button logic
    const maximizeBtn = panel.querySelector('.maximize-btn');
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            panel.classList.toggle('maximized');
            // Optional: a function to notify other parts of the app a resize happened
            window.dispatchEvent(new Event('resize'));
        });
    }

    // Resizing logic
    panel.querySelectorAll('.resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Important to avoid triggering drag
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

                if (direction.includes('e')) {
                    panel.style.width = `${startWidth + dx}px`;
                }
                if (direction.includes('w')) {
                    panel.style.width = `${startWidth - dx}px`;
                    panel.style.left = `${startLeft + dx}px`;
                }
                if (direction.includes('s')) {
                    panel.style.height = `${startHeight + dy}px`;
                }
                if (direction.includes('n')) {
                    panel.style.height = `${startHeight - dy}px`;
                    panel.style.top = `${startTop + dy}px`;
                }

                // Trigger a local event for components inside that need to react to resize
                panel.dispatchEvent(new CustomEvent('panel-resize'));
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
                <button class="panel-tool-btn maximize-btn" title="Maximizar/Restaurar"><img src="icons/maximize-2.svg" class="ce-icon"></button>
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
