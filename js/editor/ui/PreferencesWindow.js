/**
 * PreferencesWindow.js
 *
 * Este módulo gestiona la ventana de Preferencias del editor,
 * incluyendo la carga, guardado y aplicación de las preferencias del usuario.
 */

// Module-level state
let currentPreferences = {};
let autoSaveIntervalId = null;
let _dom = null;
let _saveCurrentScript = () => {}; // Placeholder for the function passed from editor.js

const defaultPrefs = {
    theme: 'dark-modern',
    customColors: { bg: '#2d2d30', header: '#3f3f46', accent: '#0e639c' },
    autosave: false,
    autosaveInterval: 30,
    scriptLang: 'ces',
    snapping: false,
    gridSize: 25,
    zoomSpeed: 1.1,
    ai: {
        provider: 'none'
    },
    showTerminal: false
};

export function getPreferences() {
    return currentPreferences;
}

function updateAiProviderUi() {
    if (!_dom.prefsAiProvider) return;
    const provider = _dom.prefsAiProvider.value;

    if (provider === 'none') {
        _dom.prefsAiApiKeyGroup.classList.add('hidden');
    } else {
        _dom.prefsAiApiKeyGroup.classList.remove('hidden');
        const savedKey = localStorage.getItem(`creativeEngine_${provider}_apiKey`);

        if (savedKey) {
            _dom.prefsAiApiKey.value = '****************'; // Mask the key
            _dom.prefsAiApiKey.disabled = true;
            _dom.prefsAiSaveKeyBtn.style.display = 'none';
            _dom.prefsAiDeleteKeyBtn.style.display = 'inline-block';
        } else {
            _dom.prefsAiApiKey.value = '';
            _dom.prefsAiApiKey.placeholder = `Introduce tu clave de API para ${provider}`;
            _dom.prefsAiApiKey.disabled = false;
            _dom.prefsAiSaveKeyBtn.style.display = 'inline-block';
            _dom.prefsAiDeleteKeyBtn.style.display = 'none';
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

function savePreferences() {
    // Gather data from UI
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
    currentPreferences.snapping = _dom.prefsSnappingToggle.checked;
    currentPreferences.gridSize = _dom.prefsSnappingGridSize.value;
    currentPreferences.zoomSpeed = parseFloat(_dom.prefsZoomSpeed.value) || 1.1;
    currentPreferences.ai.provider = _dom.prefsAiProvider.value;
    currentPreferences.showTerminal = _dom.prefsShowTerminal.checked;

    localStorage.setItem('creativeEnginePrefs', JSON.stringify(currentPreferences));
    applyPreferences();
    alert("Preferencias guardadas.");
    _dom.preferencesModal.classList.remove('is-open');
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

    if (_dom.prefsTheme) _dom.prefsTheme.value = currentPreferences.theme;
    if (_dom.prefsColorBg) _dom.prefsColorBg.value = currentPreferences.customColors.bg;
    if (_dom.prefsColorHeader) _dom.prefsColorHeader.value = currentPreferences.customColors.header;
    if (_dom.prefsColorAccent) _dom.prefsColorAccent.value = currentPreferences.customColors.accent;
    if (_dom.prefsAutosaveToggle) _dom.prefsAutosaveToggle.checked = currentPreferences.autosave;
    if (_dom.prefsAutosaveInterval) _dom.prefsAutosaveInterval.value = currentPreferences.autosaveInterval;
    if (_dom.prefsScriptLang) _dom.prefsScriptLang.value = currentPreferences.scriptLang;
    if (_dom.prefsSnappingToggle) _dom.prefsSnappingToggle.checked = currentPreferences.snapping;
    if (_dom.prefsSnappingGridSize) _dom.prefsSnappingGridSize.value = currentPreferences.gridSize;
    if (_dom.prefsZoomSpeed) _dom.prefsZoomSpeed.value = currentPreferences.zoomSpeed;
    if (_dom.prefsAiProvider) _dom.prefsAiProvider.value = currentPreferences.ai.provider;
    if (_dom.prefsShowTerminal) _dom.prefsShowTerminal.checked = currentPreferences.showTerminal;


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
                alert("Por favor, selecciona un proveedor de IA válido.");
                return;
            }
            if (!apiKey) {
                alert("Por favor, introduce una API Key.");
                return;
            }

            localStorage.setItem(`creativeEngine_${provider}_apiKey`, apiKey);
            alert(`API Key para ${provider} guardada.`);
            updateAiProviderUi();
        });
    }

    if (_dom.prefsAiDeleteKeyBtn) {
        _dom.prefsAiDeleteKeyBtn.addEventListener('click', () => {
            const provider = _dom.prefsAiProvider.value;
            if (confirm(`¿Estás seguro de que quieres borrar la API Key para ${provider}?`)) {
                localStorage.removeItem(`creativeEngine_${provider}_apiKey`);
                alert(`API Key para ${provider} borrada.`);
                updateAiProviderUi();
            }
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
