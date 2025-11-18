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
        // Overlay container
        this.dialogElement = document.createElement('div');
        this.dialogElement.className = 'custom-dialog';

        // Actual dialog content container
        const container = document.createElement('div');
        container.className = 'dialog-container';

        // Header
        const header = document.createElement('div');
        header.className = 'dialog-header';
        header.textContent = this.title;
        container.appendChild(header);

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'dialog-content';
        contentDiv.innerHTML = this.content;
        container.appendChild(contentDiv);

        // Footer
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
        container.appendChild(footer);

        this.dialogElement.appendChild(container);
        document.body.appendChild(this.dialogElement);
    }

    show() {
        // Use class-based visibility
        this.dialogElement.classList.add('is-open');
    }

    hide() {
        this.dialogElement.classList.remove('is-open');
        // Remove after the fade-out animation
        setTimeout(() => {
            this.dialogElement.remove();
        }, 300); // Should match animation duration
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
