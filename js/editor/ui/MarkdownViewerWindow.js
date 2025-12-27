let dom = {};
let saveAssetCallback = null;
    let showdownConverter = null;
    let currentFilePath = null;
    let isDirty = false;

    function initialize(dependencies) {
        dom = dependencies.dom;
        saveAssetCallback = dependencies.saveAssetCallback;

        // Corrected IDs to match CSS and upcoming HTML
        if (!dom.markdownViewerPanel || !dom.markdownViewerTitle || !dom.mdPreviewBtn || !dom.mdEditBtn || !dom.mdSaveBtn || !dom.markdownPreviewArea || !dom.markdownEditArea || !dom.markdownViewerPanel.querySelector('.close-panel-btn')) {
            console.error("MarkdownViewerWindow: Faltan elementos del DOM requeridos.");
            return;
        }

        showdownConverter = new showdown.Converter({ tables: true, strikethrough: true, tasklists: true, openLinksInNewWindow: true });

        setupEventListeners();
    }

    function setupEventListeners() {
        dom.mdPreviewBtn.addEventListener('click', () => switchMode('preview'));
        dom.mdEditBtn.addEventListener('click', () => switchMode('edit'));
        dom.mdSaveBtn.addEventListener('click', saveChanges);
        dom.markdownViewerPanel.querySelector('.close-panel-btn').addEventListener('click', hide);

        dom.markdownEditArea.addEventListener('input', () => {
            isDirty = true;
            dom.mdSaveBtn.textContent = 'Guardar*'; // Indicate unsaved changes
        });
    }

    function switchMode(mode) {
        dom.mdPreviewBtn.classList.toggle('active', mode === 'preview');
        dom.mdEditBtn.classList.toggle('active', mode === 'edit');

        dom.markdownPreviewArea.classList.toggle('hidden', mode !== 'preview');
        dom.markdownEditArea.classList.toggle('hidden', mode !== 'edit');

        dom.mdSaveBtn.classList.toggle('hidden', mode !== 'edit');

        if (mode === 'preview' && isDirty) {
            const rawMarkdown = dom.markdownEditArea.value;
            const html = showdownConverter.makeHtml(rawMarkdown);
            dom.markdownPreviewArea.innerHTML = html;
        }
    }

    function saveChanges() {
        if (!currentFilePath) {
            console.error("No hay una ruta de archivo actual para guardar.");
            window.Dialogs.showNotification("Error", "No se pudo guardar el archivo porque no se conoce su ruta.");
            return;
        }

        const newContent = dom.markdownEditArea.value;
        saveAssetCallback(currentFilePath, newContent, () => {
            isDirty = false;
            dom.mdSaveBtn.textContent = 'Guardar'; // Reset button text
            window.Dialogs.showNotification("Éxito", "Archivo guardado correctamente.");
            // Re-render the preview in the background after saving.
            const html = showdownConverter.makeHtml(newContent);
            dom.markdownPreviewArea.innerHTML = html;
        });
    }

    function show(filePath, content) {
        if (!filePath || typeof content === 'undefined') {
            console.error("Se requiere una ruta y contenido para mostrar el visor de Markdown.");
            return;
        }

        currentFilePath = filePath;
        const fileName = filePath.split('/').pop();
        dom.markdownViewerTitle.textContent = `Visor: ${fileName}`;

        try {
            const html = showdownConverter.makeHtml(content);
            dom.markdownPreviewArea.innerHTML = html;
        } catch (e) {
            console.error("Error al convertir Markdown:", e);
            dom.markdownPreviewArea.innerHTML = `<p style="color: red;">Error al renderizar el archivo Markdown.</p>`;
        }

        dom.markdownEditArea.value = content;
        isDirty = false;
        dom.mdSaveBtn.textContent = 'Guardar';

        switchMode('preview');

        dom.markdownViewerPanel.classList.remove('hidden');
        // This function should be available globally if FloatingPanelManager is initialized
        if (window.FloatingPanelManager) {
            window.FloatingPanelManager.bringToFront(dom.markdownViewerPanel);
        }
    }

    function hide() {
        if (isDirty) {
            window.Dialogs.showConfirmation(
                "Cambios sin guardar",
                "Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar?",
                (confirmed) => {
                    if (confirmed) {
                        dom.markdownViewerPanel.classList.add('hidden');
                        isDirty = false;
                    }
                }
            );
        } else {
            dom.markdownViewerPanel.classList.add('hidden');
        }
    }

const MarkdownViewerWindow = {
    initialize,
    show
};

export default MarkdownViewerWindow;
