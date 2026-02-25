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

            // CHIVATO #1: Confirmar que el listener se está añadiendo
            console.log(`[Dialog] Añadiendo listener al botón '${btnInfo.text}'. ¿Tiene callback?`, !!btnInfo.callback);

            button.addEventListener('click', async (e) => {
                e.stopPropagation();

                // CHIVATO #2: Confirmar que el clic se ha registrado
                console.log(`[Dialog] ¡Clic detectado en el botón '${btnInfo.text}'!`);

                if (btnInfo.callback) {
                    console.log(`[Dialog] Ejecutando el callback para '${btnInfo.text}'...`);
                    try {
                        await btnInfo.callback();
                        console.log(`[Dialog] Callback para '${btnInfo.text}' completado.`);
                    } catch (error) {
                        console.error(`[Dialog] El callback para '${btnInfo.text}' falló:`, error);
                    }
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
    const L = window.Localization;
    const dialog = new DialogWindow(title, message, [{ text: L.get('ACEPTAR', 'Aceptar') }]);
    dialog.show();
}

/**
 * Shows a dialog after a successful build with sharing options.
 */
export function showBuildSuccessDialog(projectName, zipBlob) {
    const L = window.Localization;
    const content = `
        <div class="build-success-content">
            <p style="color: #4caf50; font-weight: bold; font-size: 1.1em;">✨ ¡Tu juego está listo para ser compartido!</p>
            <p>Se ha generado el archivo <strong>${projectName}_Build.zip</strong>.</p>

            <div class="sharing-options" style="margin-top: 20px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                <h4 style="margin-top: 0;">¿Cómo comparto mi juego?</h4>
                <ul style="padding-left: 20px; font-size: 0.9em; line-height: 1.4;">
                    <li><strong>itch.io:</strong> Sube el archivo ZIP y selecciona "This file will be played in the browser".</li>
                    <li><strong>GitHub Pages:</strong> Descomprime el ZIP en un repositorio y activa las Pages.</li>
                    <li><strong>Hosting Estático:</strong> Puedes usar Netlify, Vercel o Firebase Hosting simplemente arrastrando la carpeta.</li>
                </ul>
            </div>

            <p style="font-size: 0.85em; margin-top: 15px; color: #aaa;">Nota: Para que otros jueguen, los archivos deben estar en un servidor web (CORS/Módulos ES).</p>
        </div>
    `;

    const dialog = new DialogWindow(L.get('BUILD_COMPLETADO', 'Build Completado'), content, [
        {
            text: 'Descargar de nuevo',
            callback: () => {
                const url = URL.createObjectURL(zipBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${projectName}_Build.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        },
        {
            text: L.get('ACEPTAR', 'Aceptar')
        }
    ]);

    dialog.show();
}

/**
 * Displays an advanced dialog for build configuration.
 * @param {object} projectConfig Current project configuration
 * @param {function} onConfirm Callback with build options
 */
export async function showBuildDialog(projectConfig, onConfirm) {
    const L = window.Localization;
    const projectName = new URLSearchParams(window.location.search).get('project');

    // Get all scenes to let user choose
    const allScenes = [];
    try {
        if (window.projectsDirHandle && projectName) {
            const projectHandle = await window.projectsDirHandle.getDirectoryHandle(projectName);
            const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

            async function scanScenes(handle, path = '') {
                for await (const entry of handle.values()) {
                    const entryPath = path ? `${path}/${entry.name}` : entry.name;
                    if (entry.kind === 'file' && entry.name.endsWith('.ceScene')) {
                        allScenes.push(entryPath);
                    } else if (entry.kind === 'directory') {
                        await scanScenes(entry, entryPath);
                    }
                }
            }
            await scanScenes(assetsHandle);
        } else {
            console.warn("[BuildDialog] No hay handle de proyectos o nombre de proyecto.");
        }
    } catch (e) { console.error(e); }

    const content = `
        <div class="advanced-build-dialog" style="min-width: 500px; max-height: 70vh; overflow-y: auto;">
            <div class="build-tabs" style="display:flex; border-bottom: 1px solid #444; margin-bottom: 15px;">
                <button class="build-tab-btn active" data-tab="tab-general" style="flex:1; padding: 10px; background:none; border:none; color:white; border-bottom: 2px solid #3498db; cursor:pointer;">${L.get('BUILD_GENERAL', 'General')}</button>
                <button class="build-tab-btn" data-tab="tab-scenes" style="flex:1; padding: 10px; background:none; border:none; color:#aaa; cursor:pointer;">${L.get('BUILD_SCENES', 'Escenas')}</button>
                <button class="build-tab-btn" data-tab="tab-splash" style="flex:1; padding: 10px; background:none; border:none; color:#aaa; cursor:pointer;">${L.get('BUILD_SPLASH', 'Splash')}</button>
                <button class="build-tab-btn" data-tab="tab-export" style="flex:1; padding: 10px; background:none; border:none; color:#aaa; cursor:pointer;">${L.get('BUILD_EXPORT', 'Exportar')}</button>
            </div>

            <div id="tab-general" class="build-tab-content">
                <div class="dialog-row" style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px;">${L.get('GAME_NAME', 'Nombre del Juego:')}</label>
                    <input type="text" id="build-app-name" value="${projectConfig.appName || projectName}" style="width:100%; padding:8px; background:#222; border:1px solid #444; color:white;">
                </div>
                <div class="dialog-row" style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px;">${L.get('ICON_FAVICON', 'Icono (Favicon):')}</label>
                    <div style="display:flex; gap:10px;">
                        <input type="text" id="build-app-icon" value="${projectConfig.appIcon || 'image/Logo_C.png'}" style="flex:1; padding:8px; background:#222; border:1px solid #444; color:white;" readonly>
                        <button id="btn-select-icon" class="dialog-button" style="padding:0 15px;">${L.get('SELECCIONAR', 'Seleccionar')}</button>
                    </div>
                </div>
                <div class="dialog-row" style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px;">${L.get('BUILD_METHOD', 'Método de Build:')}</label>
                    <select id="build-method" style="width:100%; padding:8px; background:#222; border:1px solid #444; color:white;">
                        <option value="web">Web (HTML/JS/CSS)</option>
                        <option value="cgame" disabled>.Cgame (Creative Game) - Próximamente</option>
                        <option value="exe" disabled>Windows (.exe) - Próximamente</option>
                        <option value="apk" disabled>Android (.apk) - Próximamente</option>
                        <option value="linux" disabled>Linux - Próximamente</option>
                        <option value="ios" disabled>iOS - Próximamente</option>
                    </select>
                </div>
            </div>

            <div id="tab-scenes" class="build-tab-content" style="display:none;">
                <p style="font-size:0.9em; color:#aaa; margin-bottom:10px;">${L.get('SELECT_SCENES_HINT', 'Selecciona las escenas a incluir y marca la principal:')}</p>
                <div id="build-scenes-list" style="background:#222; border:1px solid #444; border-radius:4px; max-height:200px; overflow-y:auto;">
                    ${allScenes.map(scene => `
                        <div class="scene-item" style="padding:8px; border-bottom:1px solid #333; display:flex; align-items:center;">
                            <input type="checkbox" class="include-scene" data-path="${scene}" checked style="margin-right:10px;">
                            <span style="flex:1; font-size:0.9em;">${scene}</span>
                            <label style="font-size:0.8em; margin-right:5px;">${L.get('PRINCIPAL', 'Principal:')}</label>
                            <input type="radio" name="start-scene" value="${scene}" ${scene === projectConfig.startScene ? 'checked' : (allScenes[0] === scene ? 'checked' : '')}>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div id="tab-splash" class="build-tab-content" style="display:none;">
                <div class="dialog-row" style="display:flex; align-items:center; margin-bottom:15px;">
                    <input type="checkbox" id="show-splash" ${projectConfig.splashScreens?.show !== false ? 'checked' : ''} style="margin-right:10px;">
                    <label>${L.get('ENABLE_SPLASH', 'Activar Pantallas de Splash')}</label>
                </div>
                <div id="splash-settings" style="${projectConfig.splashScreens?.show !== false ? '' : 'display:none;'}">
                    <div class="dialog-row" style="display:flex; align-items:center; margin-bottom:10px;">
                        <input type="checkbox" id="show-engine-logo" ${projectConfig.splashScreens?.showEngineLogo !== false ? 'checked' : ''} style="margin-right:10px;">
                        <label>${L.get('SHOW_ENGINE_LOGO', 'Mostrar Logo del Motor (3s)')}</label>
                    </div>
                    <p style="font-size:0.85em; color:#aaa; margin-bottom:5px;">${L.get('CUSTOM_LOGOS', 'Logos Personalizados:')}</p>
                    <div id="custom-splash-list" style="background:#222; border:1px solid #444; border-radius:4px; min-height:50px; margin-bottom:10px;">
                        ${(projectConfig.splashScreens?.list || []).map((s, i) => `
                            <div class="splash-item" style="padding:5px; border-bottom:1px solid #333; display:flex; align-items:center; gap:5px;">
                                <input type="text" class="splash-path" value="${s.path}" style="flex:1; font-size:0.8em; background:#111; border:1px solid #333; color:white;" readonly>
                                <input type="number" class="splash-duration" value="${s.duration}" style="width:40px; font-size:0.8em; background:#111; border:1px solid #333; color:white;">s
                                <button class="btn-remove-splash" style="background:none; border:none; color:#ff4444; cursor:pointer;">×</button>
                            </div>
                        `).join('')}
                    </div>
                    <button id="btn-add-splash" class="dialog-button" style="width:100%; font-size:0.8em;">${L.get('AÑADIR_LOGO', '+ Añadir Logo')}</button>
                </div>
            </div>

            <div id="tab-export" class="build-tab-content" style="display:none;">
                <div class="dialog-row" style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:10px;">${L.get('BUILD_DESTINATION', 'Destino del Build:')}</label>
                    <div class="dialog-row">
                        <input type="radio" name="export-target" value="zip" checked style="margin-right:10px;">
                        <label>${L.get('DOWNLOAD_ZIP', 'Descargar paquete comprimido (.zip)')}</label>
                    </div>
                    <div class="dialog-row" style="margin-top:10px;">
                        <input type="radio" name="export-target" value="folder" style="margin-right:10px;">
                        <label>${L.get('SAVE_FOLDER', 'Guardar directamente en una carpeta local')}</label>
                    </div>
                </div>
                <hr style="border:0; border-top:1px solid #444;">
                <div class="dialog-row">
                    <input type="checkbox" id="include-unused" ${projectConfig.includeUnusedAssets ? 'checked' : ''} style="margin-right:10px;">
                    <label>${L.get('INCLUDE_ALL_ASSETS', 'Incluir todos los archivos (ignorar optimización)')}</label>
                </div>
                <div class="dialog-row" style="margin-top:10px;">
                    <input type="checkbox" id="run-after" checked style="margin-right:10px;">
                    <label>${L.get('RUN_AFTER_BUILD_CHECK', 'Probar juego tras construir')}</label>
                </div>
            </div>
        </div>
    `;

    const dialog = new DialogWindow(L.get('BUILD_CONFIG', 'Configuración Avanzada de Build'), content, [
        {
            text: L.get('CONSTRUIR_JUEGO', 'Construir Juego'),
            callback: async () => {
                const options = {
                    appName: dialog.dialogElement.querySelector('#build-app-name').value,
                    appIcon: dialog.dialogElement.querySelector('#build-app-icon').value,
                    method: dialog.dialogElement.querySelector('#build-method').value,
                    includeUnusedAssets: dialog.dialogElement.querySelector('#include-unused').checked,
                    runAfterBuild: dialog.dialogElement.querySelector('#run-after').checked,
                    exportTarget: dialog.dialogElement.querySelector('input[name="export-target"]:checked').value,
                    startScene: dialog.dialogElement.querySelector('input[name="start-scene"]:checked')?.value,
                    includedScenes: Array.from(dialog.dialogElement.querySelectorAll('.include-scene:checked')).map(el => el.dataset.path),
                    splashScreens: {
                        show: dialog.dialogElement.querySelector('#show-splash').checked,
                        showEngineLogo: dialog.dialogElement.querySelector('#show-engine-logo').checked,
                        list: Array.from(dialog.dialogElement.querySelectorAll('.splash-item')).map(item => ({
                            path: item.querySelector('.splash-path').value,
                            duration: parseFloat(item.querySelector('.splash-duration').value) || 3
                        }))
                    }
                };
                if (onConfirm) await onConfirm(options);
            }
        },
        { text: L.get('CANCELAR', 'Cancelar') }
    ]);

    // Handle Tabs
    const tabs = dialog.dialogElement.querySelectorAll('.build-tab-btn');
    const contents = dialog.dialogElement.querySelectorAll('.build-tab-content');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => { t.classList.remove('active'); t.style.borderBottom = 'none'; t.style.color = '#aaa'; });
            contents.forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            tab.style.borderBottom = '2px solid #3498db';
            tab.style.color = 'white';
            dialog.dialogElement.querySelector(`#${tab.dataset.tab}`).style.display = 'block';
        };
    });

    // Handle Splash Toggle
    const showSplash = dialog.dialogElement.querySelector('#show-splash');
    const splashSettings = dialog.dialogElement.querySelector('#splash-settings');
    showSplash.onchange = () => splashSettings.style.display = showSplash.checked ? 'block' : 'none';

    // Handle Icon Selection
    dialog.dialogElement.querySelector('#btn-select-icon').onclick = () => {
        if (window.openAssetSelector) {
            window.openAssetSelector((handle, path) => {
                dialog.dialogElement.querySelector('#build-app-icon').value = path;
            }, { filter: ['.png', '.jpg', '.jpeg', '.ceSprite'], title: L.get('SELECCIONAR_ICONO', 'Seleccionar Icono') });
        }
    };

    // Handle Add Splash
    dialog.dialogElement.querySelector('#btn-add-splash').onclick = () => {
        if (window.openAssetSelector) {
            window.openAssetSelector((handle, path) => {
                const list = dialog.dialogElement.querySelector('#custom-splash-list');
                const item = document.createElement('div');
                item.className = 'splash-item';
                item.style.cssText = 'padding:5px; border-bottom:1px solid #333; display:flex; align-items:center; gap:5px;';
                item.innerHTML = `
                    <input type="text" class="splash-path" value="${path}" style="flex:1; font-size:0.8em; background:#111; border:1px solid #333; color:white;" readonly>
                    <input type="number" class="splash-duration" value="3" style="width:40px; font-size:0.8em; background:#111; border:1px solid #333; color:white;">s
                    <button class="btn-remove-splash" style="background:none; border:none; color:#ff4444; cursor:pointer;">×</button>
                `;
                item.querySelector('.btn-remove-splash').onclick = () => item.remove();
                list.appendChild(item);
            }, { filter: ['.png', '.jpg', '.jpeg', '.ceSprite'], title: L.get('AÑADIR_SPLASH', 'Añadir Logo de Splash') });
        }
    };

    // Handle Remove existing splashes
    dialog.dialogElement.querySelectorAll('.btn-remove-splash').forEach(btn => {
        btn.onclick = () => btn.parentElement.remove();
    });

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
    const L = window.Localization;
    const buttons = [
        { text: L.get('ACEPTAR', 'Aceptar'), callback: onConfirm },
        { text: L.get('CANCELAR', 'Cancelar'), callback: onCancel }
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
    const L = window.Localization;
    // Create a unique ID for the input to focus it later
    const inputId = `dialog-input-${Date.now()}`;
    const content = `
        <p>${message}</p>
        <input type="text" id="${inputId}" class="dialog-input" value="${defaultValue}">
    `;

    const dialog = new DialogWindow(title, content, [
        {
            text: L.get('ACEPTAR', 'Aceptar'),
            callback: () => {
                const input = dialog.dialogElement.querySelector(`#${inputId}`);
                if (onConfirm) {
                    onConfirm(input.value);
                }
            }
        },
        { text: L.get('CANCELAR', 'Cancelar') } // No callback needed for cancel
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
    const L = window.Localization;
    let listHtml = `<p>${message}</p><div class="dialog-selection-list">`;
    items.forEach((item, index) => {
        // Sanitize item content to prevent HTML injection if item names are user-generated
        const sanitizedItem = item.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        listHtml += `
            <div class="dialog-selection-item">
                <span>${sanitizedItem}</span>
                <button class="dialog-button select-button" data-index="${index}" data-value="${sanitizedItem}">${L.get('SELECCIONAR', 'Seleccionar')}</button>
            </div>
        `;
    });
    listHtml += `</div>`;

    const dialog = new DialogWindow(title, listHtml, [{ text: L.get('CANCELAR', 'Cancelar') }]);

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
    showSelection,
    showBuildDialog,
    showBuildSuccessDialog
};
