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
        if (this.content instanceof HTMLElement) {
            contentDiv.appendChild(this.content);
        } else if (this.content) {
            contentDiv.innerHTML = this.content; // Use with caution for trusted HTML (like icons/progress bars)
        }
        container.appendChild(contentDiv);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'dialog-footer';
        this.buttons.forEach((btnInfo, index) => {
            const button = document.createElement('button');
            button.textContent = btnInfo.text;
            // Primary style for the first button (usually Accept)
            button.className = 'dialog-button' + (index === 0 ? ' primary' : '');

            button.addEventListener('click', async (e) => {
                e.stopPropagation();

                if (btnInfo.callback) {
                    try {
                        await btnInfo.callback();
                    } catch (error) {
                        console.error(`[Dialog] Callback failed:`, error);
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
        // Start with a high base (20000) to ensure it's above site footer and other elements
        const baseZ = 20000;
        const highestZ = Array.from(document.querySelectorAll('.floating-panel, .custom-dialog.is-open, .modal.is-open'))
            .reduce((maxZ, el) => Math.max(maxZ, parseInt(window.getComputedStyle(el).zIndex) || 0), baseZ);

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
 * Displays a dialog with a progress bar.
 * @param {string} title The title of the dialog.
 * @param {string} message The message to display above the progress bar.
 * @returns {object} An object with update(percent, message) and close() methods.
 */
export function showProgressDialog(title, message) {
    const content = `
        <p id="progress-message" style="margin-bottom:15px;">${message}</p>
        <div style="width:100%; height:12px; background:#222; border-radius:6px; overflow:hidden; border:1px solid #444;">
            <div id="progress-bar-fill" style="width:0%; height:100%; background:var(--accent-color, #3498db); transition: width 0.2s ease-out;"></div>
        </div>
    `;
    const dialog = new DialogWindow(title, content, []);
    dialog.show();

    return {
        update: (percent, newMessage) => {
            const fill = dialog.dialogElement.querySelector('#progress-bar-fill');
            if (fill) fill.style.width = `${percent}%`;
            if (newMessage) {
                const msg = dialog.dialogElement.querySelector('#progress-message');
                if (msg) msg.textContent = newMessage;
            }
        },
        close: () => dialog.hide()
    };
}

/**
 * Displays a simple notification with an "OK" button.
 * @param {string} title The title of the dialog.
 * @param {string} message The message to display.
 */
export function showNotification(title, message) {
    const L = window.Localization;
    // Replace newlines with <br> for HTML content
    // We use a safe way to handle <br> without full innerHTML risk
    const acceptText = L ? L.get('ACEPTAR', 'Aceptar') : 'Aceptar';
    const dialog = new DialogWindow(title, '', [{ text: acceptText }]);

    // Set content safely
    const contentDiv = dialog.dialogElement.querySelector('.dialog-content');
    const p = document.createElement('p');
    message.split('\n').forEach((line, i) => {
        if (i > 0) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(line));
    });
    contentDiv.appendChild(p);

    dialog.show();
}

/**
 * Shows a dialog after a successful build with sharing options.
 */
export function showBuildSuccessDialog(projectName, zipBlob) {
    const L = window.Localization;
    const content = `
        <div class="build-success-content">
            <p style="color: #4caf50; font-weight: bold; font-size: 1.1em;"> Tu juego esta listo para ser compartido!</p>
            <p>Se ha generado el archivo <strong>${projectName}_Build.zip</strong>.</p>

            <div class="sharing-options" style="margin-top: 20px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                <h4 style="margin-top: 0;">Como comparto mi juego?</h4>
                <ul style="padding-left: 20px; font-size: 0.9em; line-height: 1.4;">
                    <li><strong>itch.io:</strong> Sube el archivo ZIP y selecciona "This file will be played in the browser".</li>
                    <li><strong>GitHub Pages:</strong> Descomprime el ZIP en un repositorio y activa las Pages.</li>
                    <li><strong>Hosting Estatico:</strong> Puedes usar Netlify, Vercel o Firebase Hosting simplemente arrastrando la carpeta.</li>
                </ul>
            </div>

            <p style="font-size: 0.85em; margin-top: 15px; color: #aaa;">Nota: Para que otros jueguen, los archivos deben estar en un servidor web (CORS/Modulos ES).</p>
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
                    <label style="display:block; margin-bottom:5px;">${L.get('BUILD_METHOD', 'Metodo de Build:')}</label>
                    <select id="build-method" style="width:100%; padding:8px; background:#222; border:1px solid #444; color:white;">
                        <option value="web">Web (HTML/JS/CSS)</option>
                        <option value="cgame" disabled>.Cgame (Creative Game) - Proximamente</option>
                        <option value="exe" disabled>Windows (.exe) - Proximamente</option>
                        <option value="apk" disabled>Android (.apk) - Proximamente</option>
                        <option value="linux" disabled>Linux - Proximamente</option>
                        <option value="ios" disabled>iOS - Proximamente</option>
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
                        <label>${L.get('SHOW_ENGINE_LOGO', 'Mostrar Logo del Motor')}</label>
                        <div style="flex:1; text-align:right;">
                            <label style="font-size:0.8em; margin-right:5px;">${L.get('DURACION', 'Duracion')}:</label>
                            <input type="number" id="engine-logo-duration" value="${projectConfig.splashScreens?.engineLogoDuration || 10}" style="width:40px; font-size:0.8em; background:#111; border:1px solid #333; color:white;">s
                        </div>
                    </div>
                    <p style="font-size:0.85em; color:#aaa; margin-bottom:5px;">${L.get('CUSTOM_LOGOS', 'Logos Personalizados:')}</p>
                    <div id="custom-splash-list" style="background:#222; border:1px solid #444; border-radius:4px; min-height:50px; margin-bottom:10px;">
                        ${(projectConfig.splashScreens?.list || []).map((s, i) => `
                            <div class="splash-item" style="padding:5px; border-bottom:1px solid #333; display:flex; align-items:center; gap:5px;">
                                <input type="text" class="splash-path" value="${s.path}" style="flex:1; font-size:0.8em; background:#111; border:1px solid #333; color:white;" readonly>
                                <input type="number" class="splash-duration" value="${s.duration}" style="width:40px; font-size:0.8em; background:#111; border:1px solid #333; color:white;">s
                                <button class="btn-remove-splash" style="background:none; border:none; color:#ff4444; cursor:pointer;"></button>
                            </div>
                        `).join('')}
                    </div>
                    <button id="btn-add-splash" class="dialog-button" style="width:100%; font-size:0.8em;">${L.get('ANADIR_LOGO', '+ Anadir Logo')}</button>
                </div>
            </div>

            <div id="tab-export" class="build-tab-content" style="display:none;">
                <div class="dialog-row" style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:10px;">${L.get('BUILD_DESTINATION', 'Destino del Build:')}</label>
                    <div class="dialog-row">
                        <input type="radio" name="export-target" value="zip" checked style="margin-right:10px;">
                        <label>${L.get('DOWNLOAD_ZIP', 'Descargar paquete comprimido (.zip)')}</label>
                    </div>
                    <div class="dialog-row" style="margin-top:10px; ${window.showDirectoryPicker ? '' : 'display:none;'}">
                        <input type="radio" name="export-target" value="folder" style="margin-right:10px;">
                        <label>${L.get('SAVE_FOLDER', 'Guardar directamente en una carpeta local')}</label>
                    </div>
                </div>
                <hr style="border:0; border-top:1px solid #444;">
                <div class="dialog-row">
                    <input type="checkbox" id="include-unused" ${projectConfig.includeUnusedAssets ? 'checked' : ''} style="margin-right:10px;">
                    <label>${L.get('INCLUDE_ALL_ASSETS', 'Incluir todos los archivos (ignorar optimizacion)')}</label>
                </div>
                <div class="dialog-row" style="margin-top:10px;">
                    <input type="checkbox" id="run-after" checked style="margin-right:10px;">
                    <label>${L.get('RUN_AFTER_BUILD_CHECK', 'Probar juego tras construir')}</label>
                </div>
                <hr style="border:0; border-top:1px solid #444; margin-top: 15px; margin-bottom: 15px;">
                <div class="dialog-row">
                    <label style="display:block; margin-bottom:5px;">${L.get('RESOURCE_LOADING_MODE', 'Modo de Carga de Recursos')}:</label>
                    <select id="resource-loading-mode" style="width:100%; padding:8px; background:#222; border:1px solid #444; color:white;">
                        <option value="lazy" ${projectConfig.resourceLoadingMode === 'lazy' ? 'selected' : ''}>${L.get('LAZY_LOAD_FAST', 'Carga Perezosa (Inicio Rapido)')}</option>
                        <option value="preload" ${projectConfig.resourceLoadingMode === 'preload' ? 'selected' : ''}>${L.get('PRELOAD_STABLE', 'Precarga (Estable)')}</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    const dialog = new DialogWindow(L.get('BUILD_CONFIG', 'Configuracion Avanzada de Build'), content, [
        {
            text: L.get('CONSTRUIR_JUEGO', 'Construir Juego'),
            callback: async () => {
                const options = {
                    appName: dialog.dialogElement.querySelector('#build-app-name').value,
                    appIcon: dialog.dialogElement.querySelector('#build-app-icon').value,
                    method: dialog.dialogElement.querySelector('#build-method').value,
                    includeUnusedAssets: dialog.dialogElement.querySelector('#include-unused').checked,
                    runAfterBuild: dialog.dialogElement.querySelector('#run-after').checked,
                    resourceLoadingMode: dialog.dialogElement.querySelector('#resource-loading-mode').value,
                    exportTarget: dialog.dialogElement.querySelector('input[name="export-target"]:checked').value,
                    startScene: dialog.dialogElement.querySelector('input[name="start-scene"]:checked')?.value,
                    includedScenes: Array.from(dialog.dialogElement.querySelectorAll('.include-scene:checked')).map(el => el.dataset.path),
                    splashScreens: {
                        show: dialog.dialogElement.querySelector('#show-splash').checked,
                        showEngineLogo: dialog.dialogElement.querySelector('#show-engine-logo').checked,
                        engineLogoDuration: parseFloat(dialog.dialogElement.querySelector('#engine-logo-duration').value) || 3,
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
                    <button class="btn-remove-splash" style="background:none; border:none; color:#ff4444; cursor:pointer;"></button>
                `;
                item.querySelector('.btn-remove-splash').onclick = () => item.remove();
                list.appendChild(item);
            }, { filter: ['.png', '.jpg', '.jpeg', '.ceSprite'], title: L.get('ANADIR_SPLASH', 'Anadir Logo de Splash') });
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
    const acceptText = L ? L.get('ACEPTAR', 'Aceptar') : 'Aceptar';
    const cancelText = L ? L.get('CANCELAR', 'Cancelar') : 'Cancelar';
    const buttons = [
        { text: acceptText, callback: onConfirm },
        { text: cancelText, callback: onCancel }
    ];
    const dialog = new DialogWindow(title, '', buttons);

    // Set content safely
    const contentDiv = dialog.dialogElement.querySelector('.dialog-content');
    const p = document.createElement('p');
    message.split('\n').forEach((line, i) => {
        if (i > 0) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(line));
    });
    contentDiv.appendChild(p);

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
    const acceptText = L ? L.get('ACEPTAR', 'Aceptar') : 'Aceptar';
    const cancelText = L ? L.get('CANCELAR', 'Cancelar') : 'Cancelar';

    // Create a unique ID for the input to focus it later
    const inputId = `dialog-input-${Date.now()}`;
    const dialog = new DialogWindow(title, '', [
        {
            text: acceptText,
            callback: () => {
                const input = dialog.dialogElement.querySelector(`#${inputId}`);
                if (onConfirm) {
                    onConfirm(input.value);
                }
            }
        },
        { text: cancelText } // No callback needed for cancel
    ]);

    // Set content safely
    const contentDiv = dialog.dialogElement.querySelector('.dialog-content');
    const p = document.createElement('p');
    p.textContent = message;
    contentDiv.appendChild(p);

    const input = document.createElement('input');
    input.type = 'text';
    input.id = inputId;
    input.className = 'dialog-input';
    input.value = defaultValue;
    contentDiv.appendChild(input);

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
    const container = document.createElement('div');

    const p = document.createElement('p');
    p.textContent = message;
    container.appendChild(p);

    const listDiv = document.createElement('div');
    listDiv.className = 'dialog-selection-list';

    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'dialog-selection-item';

        const span = document.createElement('span');
        span.textContent = item;

        const btn = document.createElement('button');
        btn.className = 'dialog-button select-button';
        btn.textContent = L ? L.get('SELECCIONAR', 'Seleccionar') : 'Seleccionar';
        btn.onclick = () => {
            if (onSelect) onSelect(item, index);
            dialog.hide();
        };

        itemDiv.appendChild(span);
        itemDiv.appendChild(btn);
        listDiv.appendChild(itemDiv);
    });

    container.appendChild(listDiv);

    const dialog = new DialogWindow(title, container, [{ text: L ? L.get('CANCELAR', 'Cancelar') : 'Cancelar' }]);
    dialog.show();
}


// Expose functions to the global scope for non-module scripts
window.Dialogs = {
    showNotification,
    showConfirmation,
    showPrompt,
    showSelection,
    showBuildDialog,
    showBuildSuccessDialog,
    showProgressDialog
};
