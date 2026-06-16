/**
 * PreferencesWindow.js
 *
 * Este módulo gestiona la ventana de Preferencias del editor,
 * incluyendo la carga, guardado y aplicación de las preferencias del usuario.
 */

import { showNotification, showConfirmation } from './DialogWindow.js';
import * as AIHandler from '../AIHandler.js';

// Module-level state
let currentPreferences = {};
let autoSaveIntervalId = null;
let _dom = null;
let _saveCurrentScript = () => {}; // Placeholder for the function passed from editor.js

const defaultPrefs = {
    language: 'ES',
    theme: 'dark-modern',
    customColors: { bg: '#2d2d30', header: '#3f3f46', accent: '#0e639c' },
    autosave: false,
    autosaveInterval: 30,
    scriptLang: 'ces',
    showSceneGrid: true,
    snapping: false,
    gridSize: 25,
    zoomSpeed: 1.1,
    ai: {
        provider: 'none'
    },
    carlPermissions: {
        canUseConsole: true,
        canManageFiles: true,
        canManipulateScenes: true,
        canDownloadFiles: true,
        executionMode: 'automatic'
    },
    showTerminal: false,
    executionMode: 'integrated',
    autoCloseGameWindow: true,
    shareWithCarley: true,
    autoCorrectorInteligente: true
};

export function getPreferences() {
    return currentPreferences;
}

async function fetchAndPopulateModels(provider, apiKey) {
    if (!_dom.prefsAiModelSelector || !_dom.prefsAiModelSelectionGroup || !_dom.prefsAiErrorDisplay) return;

    _dom.prefsAiModelSelectionGroup.classList.remove('hidden');
    _dom.prefsAiModelSelector.innerHTML = `<option value="">${window.Localization?.get('CARGANDO_MODELOS') || 'Cargando modelos...'}</option>`;
    _dom.prefsAiErrorDisplay.classList.add('hidden');
    _dom.prefsAiErrorDisplay.textContent = '';

    const result = await AIHandler.listModels(provider, apiKey);

    if (result.success) {
        _dom.prefsAiModelSelector.innerHTML = `<option value="">${window.Localization?.get('SELECCIONA_MODELO') || 'Selecciona un modelo...'}</option>`;
        result.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            _dom.prefsAiModelSelector.appendChild(option);
        });

        // Restore selected model if it exists in current preferences and is in the list
        if (currentPreferences.ai && currentPreferences.ai.model) {
            _dom.prefsAiModelSelector.value = currentPreferences.ai.model;
        }
    } else {
        _dom.prefsAiModelSelector.innerHTML = `<option value="">${window.Localization?.get('ERROR_CARGAR_MODELOS') || 'Error al cargar modelos'}</option>`;
        _dom.prefsAiErrorDisplay.textContent = result.error;
        _dom.prefsAiErrorDisplay.classList.remove('hidden');
    }
}

function updateAiProviderUi() {
    if (!_dom.prefsAiProvider) return;
    const provider = _dom.prefsAiProvider.value;

    if (provider === 'none') {
        _dom.prefsAiApiKeyGroup.classList.add('hidden');
        if (_dom.prefsAiModelSelectionGroup) _dom.prefsAiModelSelectionGroup.classList.add('hidden');
    } else {
        _dom.prefsAiApiKeyGroup.classList.remove('hidden');
        const savedKey = localStorage.getItem(`creativeEngine_${provider}_apiKey`);

        if (savedKey) {
            _dom.prefsAiApiKey.value = '****************'; // Mask the key
            _dom.prefsAiApiKey.disabled = true;
            _dom.prefsAiSaveKeyBtn.style.display = 'none';
            _dom.prefsAiDeleteKeyBtn.style.display = 'inline-block';
            fetchAndPopulateModels(provider, savedKey);
        } else {
            _dom.prefsAiApiKey.value = '';
            _dom.prefsAiApiKey.placeholder = (window.Localization?.get('INTRODUCE_API_KEY') || "Introduce tu clave de API para") + " " + provider;
            _dom.prefsAiApiKey.disabled = false;
            _dom.prefsAiSaveKeyBtn.style.display = 'inline-block';
            _dom.prefsAiDeleteKeyBtn.style.display = 'none';
            if (_dom.prefsAiModelSelectionGroup) _dom.prefsAiModelSelectionGroup.classList.add('hidden');
        }
    }
}

function applyPreferences() {
    if (!currentPreferences) return;

    // Apply theme
    const theme = currentPreferences.theme;
    if (theme === 'custom') {
        document.documentElement.setAttribute('data-theme', 'custom');
        document.documentElement.style.setProperty('--bg-secondary', currentPreferences.customColors.bg);
        document.documentElement.style.setProperty('--bg-tertiary', currentPreferences.customColors.header);
        document.documentElement.style.setProperty('--accent-color', currentPreferences.customColors.accent);
    } else {
        document.documentElement.removeAttribute('style'); // Clear custom colors
        document.documentElement.setAttribute('data-theme', theme || 'dark-modern');
    }

    // Apply autosave
    if (currentPreferences.autosave) {
        if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
        autoSaveIntervalId = setInterval(_saveCurrentScript, currentPreferences.autosaveInterval * 1000);
    } else {
        if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
    }

    // Apply terminal visibility
    if (_dom.viewToggleTerminal) {
        _dom.viewToggleTerminal.style.display = currentPreferences.showTerminal ? 'block' : 'none';
        // If terminal is hidden and was the active view, switch to a default view
        if (!currentPreferences.showTerminal && _dom.viewToggleTerminal.classList.contains('active')) {
             _dom.scenePanel.querySelector('[data-view="scene-content"]').click();
        }
    }
}

async function savePreferences() {
    try {
    // Gather data from UI
    currentPreferences.language = _dom.prefsLang.value;
    currentPreferences.theme = _dom.prefsTheme.value;
    if (currentPreferences.theme === 'custom') {
        currentPreferences.customColors = {
            bg: _dom.prefsColorBg.value,
            header: _dom.prefsColorHeader.value,
            accent: _dom.prefsColorAccent.value
        };
    }
    currentPreferences.autosave = _dom.prefsAutosaveToggle.checked;
    currentPreferences.autosaveInterval = _dom.prefsAutosaveInterval.value;
    currentPreferences.scriptLang = _dom.prefsScriptLang.value;
    currentPreferences.showSceneGrid = _dom.prefsShowSceneGrid.checked;
    currentPreferences.snapping = _dom.prefsSnappingToggle.checked;
    currentPreferences.gridSize = _dom.prefsSnappingGridSize.value;
    currentPreferences.zoomSpeed = parseFloat(_dom.prefsZoomSpeed.value) || 1.1;
    currentPreferences.ai.provider = _dom.prefsAiProvider.value;
    currentPreferences.ai.model = _dom.prefsAiModelSelector ? _dom.prefsAiModelSelector.value : null;

    currentPreferences.carlPermissions = {
        canUseConsole: _dom.prefsCarlCanUseConsole.checked,
        canManageFiles: _dom.prefsCarlCanManageFiles.checked,
        canManipulateScenes: _dom.prefsCarlCanManipulateScenes.checked,
        canDownloadFiles: _dom.prefsCarlCanDownloadFiles.checked,
        executionMode: _dom.prefsCarlExecutionMode.value
    };

    currentPreferences.showTerminal = _dom.prefsShowTerminal.checked;
    currentPreferences.executionMode = _dom.prefsExecutionMode.value;
    currentPreferences.autoCloseGameWindow = _dom.prefsAutoCloseGameWindow.checked;
    currentPreferences.shareWithCarley = _dom.prefsShareWithCarley.checked;
    currentPreferences.autoCorrectorInteligente = _dom.prefsSmartReparatorToggle.checked;

    // Save to LocalStorage for Editor-wide defaults
    localStorage.setItem('creativeEnginePrefs', JSON.stringify(currentPreferences));

    // Apply language change
    if (window.Localization) {
        window.Localization.setLanguage(currentPreferences.language);
    }

    // Also trigger save to project file via the provided callback
    if (typeof _dom.saveProjectConfig === 'function') {
        await _dom.saveProjectConfig(false);
    }

    applyPreferences();
    showNotification(
        window.Localization?.get('EXITO') || 'Éxito',
        window.Localization?.get('PREFERENCIAS_GUARDADAS') || 'Preferencias guardadas.'
    );
    _dom.preferencesModal.classList.remove('is-open');
    } catch (e) {
        console.error("Error in savePreferences:", e);
        showNotification(
            window.Localization?.get('ERROR') || 'Error',
            (window.Localization?.get('ERROR_GUARDAR_PREFERENCIAS') || 'Error al guardar preferencias: ') + e.message
        );
    }
}

function loadPreferences() {
    const savedPrefs = localStorage.getItem('creativeEnginePrefs');
    let loadedPrefs = {};
    if (savedPrefs) {
        try {
            loadedPrefs = JSON.parse(savedPrefs) || {};
        } catch (e) {
            console.warn("Could not parse preferences from localStorage. Using defaults.", e);
            loadedPrefs = {};
        }
    }

    currentPreferences = { ...defaultPrefs, ...loadedPrefs };
    currentPreferences.customColors = { ...defaultPrefs.customColors, ...(loadedPrefs.customColors || {}) };
    currentPreferences.ai = { ...defaultPrefs.ai, ...(loadedPrefs.ai || {}) };
    currentPreferences.carlPermissions = { ...defaultPrefs.carlPermissions, ...(loadedPrefs.carlPermissions || {}) };

    if (_dom.prefsLang) _dom.prefsLang.value = currentPreferences.language || window.Localization.currentLanguage;
    if (_dom.prefsTheme) _dom.prefsTheme.value = currentPreferences.theme;
    if (_dom.prefsColorBg) _dom.prefsColorBg.value = currentPreferences.customColors.bg;
    if (_dom.prefsColorHeader) _dom.prefsColorHeader.value = currentPreferences.customColors.header;
    if (_dom.prefsColorAccent) _dom.prefsColorAccent.value = currentPreferences.customColors.accent;
    if (_dom.prefsAutosaveToggle) _dom.prefsAutosaveToggle.checked = currentPreferences.autosave;
    if (_dom.prefsAutosaveInterval) _dom.prefsAutosaveInterval.value = currentPreferences.autosaveInterval;
    if (_dom.prefsScriptLang) _dom.prefsScriptLang.value = currentPreferences.scriptLang;
    if (_dom.prefsShowSceneGrid) _dom.prefsShowSceneGrid.checked = currentPreferences.showSceneGrid;
    if (_dom.prefsSnappingToggle) _dom.prefsSnappingToggle.checked = currentPreferences.snapping;
    if (_dom.prefsSnappingGridSize) _dom.prefsSnappingGridSize.value = currentPreferences.gridSize;
    if (_dom.prefsZoomSpeed) _dom.prefsZoomSpeed.value = currentPreferences.zoomSpeed;
    if (_dom.prefsAiProvider) _dom.prefsAiProvider.value = currentPreferences.ai.provider;

    if (_dom.prefsCarlCanUseConsole) _dom.prefsCarlCanUseConsole.checked = currentPreferences.carlPermissions.canUseConsole;
    if (_dom.prefsCarlCanManageFiles) _dom.prefsCarlCanManageFiles.checked = currentPreferences.carlPermissions.canManageFiles;
    if (_dom.prefsCarlCanManipulateScenes) _dom.prefsCarlCanManipulateScenes.checked = currentPreferences.carlPermissions.canManipulateScenes;
    if (_dom.prefsCarlCanDownloadFiles) _dom.prefsCarlCanDownloadFiles.checked = currentPreferences.carlPermissions.canDownloadFiles;
    if (_dom.prefsCarlExecutionMode) _dom.prefsCarlExecutionMode.value = currentPreferences.carlPermissions.executionMode || 'permission';

    if (_dom.prefsShowTerminal) _dom.prefsShowTerminal.checked = currentPreferences.showTerminal;
    if (_dom.prefsExecutionMode) _dom.prefsExecutionMode.value = currentPreferences.executionMode || 'integrated';
    if (_dom.prefsAutoCloseGameWindow) _dom.prefsAutoCloseGameWindow.checked = currentPreferences.autoCloseGameWindow !== false;
    if (_dom.prefsShareWithCarley) _dom.prefsShareWithCarley.checked = !!currentPreferences.shareWithCarley;
    if (_dom.prefsSmartReparatorToggle) _dom.prefsSmartReparatorToggle.checked = currentPreferences.autoCorrectorInteligente !== false;


    if (_dom.prefsTheme) {
        if (_dom.prefsTheme.value === 'custom') {
            _dom.prefsCustomThemePicker.classList.remove('hidden');
        } else {
            _dom.prefsCustomThemePicker.classList.add('hidden');
        }
    }
    if (_dom.prefsAutosaveToggle) {
         if (_dom.prefsAutosaveToggle.checked) {
            _dom.prefsAutosaveIntervalGroup.classList.remove('hidden');
        } else {
            _dom.prefsAutosaveIntervalGroup.classList.add('hidden');
        }
    }

    updateAiProviderUi();
    applyPreferences();
}

function setupEventListeners() {
    document.getElementById('menu-preferences').addEventListener('click', () => {
        loadPreferences(); // Recargar las preferencias cada vez que se abre
        _dom.preferencesModal.classList.add('is-open');
    });

    if (_dom.prefsTheme) {
        _dom.prefsTheme.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                _dom.prefsCustomThemePicker.classList.remove('hidden');
            } else {
                _dom.prefsCustomThemePicker.classList.add('hidden');
            }
        });
    }

    if (_dom.prefsAutosaveToggle) {
        _dom.prefsAutosaveToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                _dom.prefsAutosaveIntervalGroup.classList.remove('hidden');
            } else {
                _dom.prefsAutosaveIntervalGroup.classList.add('hidden');
            }
        });
    }

    // --- AI Preferences Listeners ---
    if (_dom.prefsAiProvider) {
        _dom.prefsAiProvider.addEventListener('change', updateAiProviderUi);
    }

    if (_dom.prefsAiSaveKeyBtn) {
        _dom.prefsAiSaveKeyBtn.addEventListener('click', () => {
            const provider = _dom.prefsAiProvider.value;
            const apiKey = _dom.prefsAiApiKey.value;

            if (!provider || provider === 'none') {
                showNotification(
                    window.Localization?.get('ERROR') || 'Error',
                    window.Localization?.get('SELECCIONA_IA_VALIDO') || 'Por favor, selecciona un proveedor de IA válido.'
                );
                return;
            }
            if (!apiKey) {
                showNotification(
                    window.Localization?.get('ERROR') || 'Error',
                    window.Localization?.get('INTRODUCE_API_KEY_NOTIFICATION') || 'Por favor, introduce una API Key.'
                );
                return;
            }

            localStorage.setItem(`creativeEngine_${provider}_apiKey`, apiKey);
            showNotification(
                window.Localization?.get('EXITO') || 'Éxito',
                (window.Localization?.get('API_KEY_GUARDADA') || "API Key para {provider} guardada.")
                    .replace('{provider}', provider)
            );
            updateAiProviderUi();
        });
    }

    if (_dom.prefsAiDeleteKeyBtn) {
        _dom.prefsAiDeleteKeyBtn.addEventListener('click', () => {
            const provider = _dom.prefsAiProvider.value;
            showConfirmation(
                window.Localization?.get('CONFIRMAR_BORRADO') || 'Confirmar Borrado',
                (window.Localization?.get('BORRAR_API_KEY_CONFIRM') || "¿Estás seguro de que quieres borrar la API Key para {provider}?")
                    .replace('{provider}', provider),
                () => {
                    localStorage.removeItem(`creativeEngine_${provider}_apiKey`);
                    showNotification(
                        window.Localization?.get('EXITO') || 'Éxito',
                        (window.Localization?.get('API_KEY_BORRADA') || "API Key para {provider} borrada.")
                            .replace('{provider}', provider)
                    );
                    updateAiProviderUi();
                }
            );
        });
    }

    if (_dom.prefsSaveBtn) {
        _dom.prefsSaveBtn.addEventListener('click', savePreferences);
    }
}

export function initialize(dom, saveCurrentScriptFunc) {
    console.log("Initializing Preferences Window...");
    _dom = dom;
    _saveCurrentScript = saveCurrentScriptFunc;

    loadPreferences();
    setupEventListeners();
}

/**
 * Merges and applies external preferences (e.g., from project config).
 * @param {object} prefs
 */
export function loadExternalPreferences(prefs) {
    if (!prefs || typeof prefs !== 'object') return;
    console.log("Applying external preferences to editor...");

    // Merge provided prefs into current ones
    currentPreferences = { ...currentPreferences, ...prefs };

    // Re-load UI elements with new values
    if (_dom.prefsTheme) _dom.prefsTheme.value = currentPreferences.theme;
    if (_dom.prefsExecutionMode) _dom.prefsExecutionMode.value = currentPreferences.executionMode || 'integrated';
    if (_dom.prefsAutoCloseGameWindow) _dom.prefsAutoCloseGameWindow.checked = currentPreferences.autoCloseGameWindow !== false;

    // Apply them to the editor state/DOM
    applyPreferences();
}
