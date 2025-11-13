// js/editor/ui/DialogWindow.js

/**
 * Creates and manages custom, draggable dialog windows for notifications and confirmations.
 */
class DialogWindow {
    constructor(title, content, buttons) {
        this.dialogElement = null;
        this.title = title;
        this.content = content;
        this.buttons = buttons; // e.g., [{ text: 'OK', callback: () => {} }]
        this._createDialogElement();
    }

    _createDialogElement() {
        // Main container
        this.dialogElement = document.createElement('div');
        this.dialogElement.className = 'custom-dialog';

        // Header
        const header = document.createElement('div');
        header.className = 'dialog-header';
        header.textContent = this.title;
        this.dialogElement.appendChild(header);

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'dialog-content';
        contentDiv.innerHTML = this.content; // Use innerHTML to allow for formatted messages
        this.dialogElement.appendChild(contentDiv);

        // Footer with buttons
        const footer = document.createElement('div');
        footer.className = 'dialog-footer';
        this.buttons.forEach(btnInfo => {
            const button = document.createElement('button');
            button.textContent = btnInfo.text;
            button.className = 'dialog-button';
            button.addEventListener('click', () => {
                if (btnInfo.callback) {
                    btnInfo.callback();
                }
                this.hide();
            });
            footer.appendChild(button);
        });
        this.dialogElement.appendChild(footer);

        document.body.appendChild(this.dialogElement);
        this._makeDraggable(header);
    }

    _makeDraggable(headerElement) {
        let isDragging = false;
        let offsetX, offsetY;

        headerElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - this.dialogElement.getBoundingClientRect().left;
            offsetY = e.clientY - this.dialogElement.getBoundingClientRect().top;
            this.dialogElement.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            this.dialogElement.style.left = `${e.clientX - offsetX}px`;
            this.dialogElement.style.top = `${e.clientY - offsetY}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            this.dialogElement.style.cursor = 'default';
        });
    }

    show() {
        this.dialogElement.style.display = 'block';
        // Center on screen initially
        const rect = this.dialogElement.getBoundingClientRect();
        this.dialogElement.style.left = `${(window.innerWidth - rect.width) / 2}px`;
        this.dialogElement.style.top = `${(window.innerHeight - rect.height) / 2}px`;
    }

    hide() {
        this.dialogElement.remove(); // Remove from DOM after use
    }
}

// --- Public API ---

/**
 * Displays a simple notification with an "OK" button.
 * @param {string} title The title of the dialog.
 * @param {string} message The message to display.
 */
export function showNotification(title, message) {
    const dialog = new DialogWindow(title, message, [{ text: 'Aceptar' }]);
    dialog.show();
}

/**
 * Displays a confirmation dialog with "Aceptar" and "Cancelar" buttons.
 * @param {string} title The title of the dialog.
 * @param {string} message The message to display.
 * @param {function} onConfirm The callback to execute if the user clicks "Aceptar".
 * @param {function} [onCancel] The optional callback to execute if the user clicks "Cancelar".
 */
export function showConfirmation(title, message, onConfirm, onCancel) {
    const buttons = [
        { text: 'Aceptar', callback: onConfirm },
        { text: 'Cancelar', callback: onCancel }
    ];
    const dialog = new DialogWindow(title, message, buttons);
    dialog.show();
}

/**
 * Displays a dialog with a text input field.
 * @param {string} title The title of the dialog.
 * @param {string} message The message to display above the input.
 * @param {function} onConfirm The callback to execute with the input value if the user clicks "Aceptar".
 * @param {string} [defaultValue=''] The default value for the input field.
 */
export function showPrompt(title, message, onConfirm, defaultValue = '') {
    // Create a unique ID for the input to focus it later
    const inputId = `dialog-input-${Date.now()}`;
    const content = `
        <p>${message}</p>
        <input type="text" id="${inputId}" class="dialog-input" value="${defaultValue}">
    `;

    const dialog = new DialogWindow(title, content, [
        {
            text: 'Aceptar',
            callback: () => {
                const input = dialog.dialogElement.querySelector(`#${inputId}`);
                if (onConfirm) {
                    onConfirm(input.value);
                }
            }
        },
        { text: 'Cancelar' } // No callback needed for cancel
    ]);

    dialog.show();
    // Focus the input field for better UX
    const inputElement = dialog.dialogElement.querySelector(`#${inputId}`);
    if (inputElement) {
        inputElement.focus();
        inputElement.select();
    }
}


// Expose functions to the global scope for non-module scripts
window.Dialogs = {
    showNotification,
    showConfirmation,
    showPrompt
};
