// js/engine/Localization.js

export class Localization {
    static translations = {};
    static currentLanguage = 'ES';
    static languages = ['ES', 'EN', 'PT', 'RU', 'ZH'];

    static async init() {
        // Detect browser language
        const browserLang = navigator.language.split('-')[0].toUpperCase();
        let savedLang = localStorage.getItem('ce-language');

        // Check if it's in the shared preferences object too
        if (!savedLang) {
            try {
                const prefs = JSON.parse(localStorage.getItem('creativeEnginePrefs'));
                if (prefs && prefs.language) savedLang = prefs.language;
            } catch (e) {}
        }

        if (savedLang && this.languages.includes(savedLang)) {
            this.currentLanguage = savedLang;
        } else if (browserLang === 'EN' || browserLang === 'ES') {
            this.currentLanguage = browserLang;
        } else {
            this.currentLanguage = 'EN'; // Default to English if not ES
        }

        await this.loadLangFile('translations/engine.lang');
    }

    static async loadLangFile(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) return; // Silent fail if file not found
            const text = await response.text();
            this.parseLangFile(text);
        } catch (error) {
            console.error("Localization Error loading " + path + ":", error);
        }
    }

    static parseLangFile(text) {
        const lines = text.split(/\r?\n/);
        let currentSection = null;

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;

            if (line.startsWith('[') && line.endsWith(']')) {
                currentSection = line.substring(1, line.length - 1).toUpperCase();
                if (!this.translations[currentSection]) {
                    this.translations[currentSection] = {};
                }
                continue;
            }

            if (currentSection) {
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    this.translations[currentSection][key] = value.replace(/\\n/g, '\n');
                }
            }
        }
    }

    static get(key, fallback = null) {
        const lang = this.currentLanguage;
        if (this.translations[lang] && this.translations[lang][key]) {
            return this.translations[lang][key];
        }
        // Fallback to EN if current is ES and key is missing
        if (lang !== 'EN' && this.translations['EN'] && this.translations['EN'][key]) {
            return this.translations['EN'][key];
        }
        return fallback || key;
    }

    static setLanguage(lang) {
        if (this.languages.includes(lang)) {
            this.currentLanguage = lang;
            localStorage.setItem('ce-language', lang);
            this.updateUI();

            // Dispatch event for components that need manual update
            window.dispatchEvent(new CustomEvent('ce-language-changed', { detail: lang }));
        }
    }

    static updateUI() {
        this.applyToElement(document);
    }

    /**
     * Applies translations to all elements inside a given root element
     */
    static applyToElement(root) {
        // Update elements with data-i18n attribute
        const elements = root.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.get(key);

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.type === 'button' || el.type === 'submit') {
                    el.value = translation;
                } else if (el.hasAttribute('placeholder')) {
                    el.placeholder = translation;
                }
            } else {
                // If there's an icon inside, don't overwrite it
                const icon = el.querySelector('.ce-icon');
                if (icon) {
                    // Try to find a text node to replace
                    let textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
                    if (textNode) {
                        // Preserve leading/trailing spaces if any
                        const leadingSpace = textNode.textContent.startsWith(' ') ? ' ' : '';
                        const trailingSpace = textNode.textContent.endsWith(' ') ? ' ' : '';
                        textNode.textContent = leadingSpace + translation + trailingSpace;
                    } else {
                        // If no text node found but we have an icon, append it
                        el.appendChild(document.createTextNode(' ' + translation));
                    }
                } else {
                    // Use innerHTML to preserve styling tags like <strong> or <b> in translations
                    el.innerHTML = translation;
                }
            }
        });

        // Update tooltips/titles
        const titledElements = root.querySelectorAll('[data-i18n-title]');
        titledElements.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.get(key);
        });

        // Update placeholders explicitly if needed
        const placeholderElements = root.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.get(key);
        });
    }

    /**
     * Scans for .lang files in a directory handle (for project-specific translations)
     */
    static async scanForTranslations(dirHandle) {
        try {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.lang')) {
                    const file = await entry.getFile();
                    const text = await file.text();
                    this.parseLangFile(text);
                } else if (entry.kind === 'directory') {
                    // Could recursively scan, but let's stick to root or a translations folder
                    if (entry.name === 'translations' || entry.name === 'lang') {
                        await this.scanForTranslations(entry);
                    }
                }
            }
            this.updateUI();
        } catch (e) {
            console.warn("Could not scan for external translations:", e);
        }
    }
}

window.Localization = Localization;
