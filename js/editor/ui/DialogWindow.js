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
        // Calculate the highest z-index currently in use by panels or other dialogs
        const highestZ = Array.from(document.querySelectorAll('.floating-panel, .custom-dialog.is-open'))
            .reduce((maxZ, el) => Math.max(maxZ, parseInt(window.getComputedStyle(el).zIndex) || 0), 0);

        // Set the new dialog's z-index to be on top of everything else
        this.dialogElement.style.zIndex = highestZ + 1;

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


/**
 * Displays a dialog with a list of items for the user to select one.
 * @param {string} title The title of the dialog.
 * @param {string} message The message to display above the list.
 * @param {Array<string>} items An array of strings to display as selectable items.
 * @param {function} onSelect The callback to execute with the selected item's value and index.
 */
export function showSelection(title, message, items, onSelect) {
    let listHtml = `<p>${message}</p><div class="dialog-selection-list">`;
    items.forEach((item, index) => {
        // Sanitize item content to prevent HTML injection if item names are user-generated
        const sanitizedItem = item.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        listHtml += `
            <div class="dialog-selection-item">
                <span>${sanitizedItem}</span>
                <button class="dialog-button select-button" data-index="${index}" data-value="${sanitizedItem}">Seleccionar</button>
            </div>
        `;
    });
    listHtml += `</div>`;

    const dialog = new DialogWindow(title, listHtml, [{ text: 'Cancelar' }]);

    // Add event listener for the select buttons
    const listContainer = dialog.dialogElement.querySelector('.dialog-selection-list');
    if (listContainer) {
        listContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('select-button')) {
                const index = parseInt(e.target.dataset.index, 10);
                const value = e.target.dataset.value;
                if (onSelect) {
                    onSelect(value, index);
                }
                dialog.hide();
            }
        });
    }

    dialog.show();
}


// Expose functions to the global scope for non-module scripts
window.Dialogs = {
    showNotification,
    showConfirmation,
    showPrompt,
    showSelection
};
