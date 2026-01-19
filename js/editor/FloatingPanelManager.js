// --- Module for managing floating panels (drag, resize, and z-index) ---

let highestZ = 1500; // Start above the default docked panels

function initializePanel(panel) {
    const header = panel.querySelector('.panel-header');
    let offsetX, offsetY, isDragging = false;
    let isResizing = false;

    // Bring panel to front on any mousedown
    panel.addEventListener('mousedown', () => {
        highestZ += 1;
        panel.style.zIndex = highestZ;
    });

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
        });
    }

        // Maximize button logic
        const maximizeBtn = panel.querySelector('.maximize-btn');
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => {
                panel.classList.toggle('maximized');
                // Optional: a function to notify other parts of the app a resize happened
                // For example, to resize a canvas inside the panel
                window.dispatchEvent(new Event('resize'));
            });
        }

        // Resizing logic
        panel.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
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


        // Global mouse move for dragging
        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                panel.style.left = `${e.clientX - offsetX}px`;
                panel.style.top = `${e.clientY - offsetY}px`;
            }
        });

        // Global mouse up to stop dragging
        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = '';
            }
        });
}

export function initializeFloatingPanels() {
    const panels = document.querySelectorAll('.floating-panel');
    panels.forEach(initializePanel);
}

export function createFloatingPanel(id, options = {}) {
    const { title = 'Panel Flotante', content = '', width = 400, height = 300, top = 100, left = 100 } = options;

    const panel = document.createElement('div');
    panel.id = id;
    panel.className = 'editor-panel floating-panel';
    panel.style.width = `${width}px`;
    panel.style.height = `${height}px`;
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;

    panel.innerHTML = `
        <div class="panel-header">
            <span>${title}</span>
            <div class="panel-header-controls">
                <button class="panel-tool-btn maximize-btn" title="Maximizar/Restaurar">🗖</button>
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
