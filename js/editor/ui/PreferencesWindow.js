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
    gridSize: 25
};

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

    if (_dom.prefsTheme) _dom.prefsTheme.value = currentPreferences.theme;
    if (_dom.prefsColorBg) _dom.prefsColorBg.value = currentPreferences.customColors.bg;
    if (_dom.prefsColorHeader) _dom.prefsColorHeader.value = currentPreferences.customColors.header;
    if (_dom.prefsColorAccent) _dom.prefsColorAccent.value = currentPreferences.customColors.accent;
    if (_dom.prefsAutosaveToggle) _dom.prefsAutosaveToggle.checked = currentPreferences.autosave;
    if (_dom.prefsAutosaveInterval) _dom.prefsAutosaveInterval.value = currentPreferences.autosaveInterval;
    if (_dom.prefsScriptLang) _dom.prefsScriptLang.value = currentPreferences.scriptLang;
    if (_dom.prefsSnappingToggle) _dom.prefsSnappingToggle.checked = currentPreferences.snapping;
    if (_dom.prefsSnappingGridSize) _dom.prefsSnappingGridSize.value = currentPreferences.gridSize;

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

    applyPreferences();
}

function setupEventListeners() {
    document.getElementById('menu-preferences').addEventListener('click', () => {
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
