// Contains all logic for the UI Editor Window
import { showNotification } from './DialogWindow.js';

let dom;
let currentUiAsset = null;
let selectedUiElement = null;
let uiEditorFileHandle = null;
let uiResizersInitialized = false;

function renderUiHierarchy() {
    if (!dom.uiEditorHierarchy || !currentUiAsset) return;
    const container = dom.uiEditorHierarchy.querySelector('.panel-content');
    container.innerHTML = '';

    function renderNode(element, parentElement, depth) {
        const item = document.createElement('div');
        item.className = 'hierarchy-item';
        item.textContent = `${element.name} (${element.type})`;
        item.dataset.id = element.id;
        item.style.paddingLeft = `${depth * 15}px`;

        if (selectedUiElement && selectedUiElement.id === element.id) {
            item.classList.add('active');
        }

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedUiElement = currentUiAsset.elements.find(el => el.id === element.id);
            renderUiHierarchy();
            renderUiInspector();
            renderUiCanvas();
        });

        parentElement.appendChild(item);
    }

    currentUiAsset.elements.forEach(el => renderNode(el, container, 0));
}

function renderUiCanvas() {
    if (!dom.uiEditorCanvas || !currentUiAsset) return;
    const canvas = dom.uiEditorCanvas;
    const ctx = canvas.getContext('2d');

    const containerRect = dom.uiEditorCanvasContainer.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const TILE_SIZE = 20;
    ctx.fillStyle = '#444';
    for (let y = 0; y < canvas.height; y += TILE_SIZE * 2) {
        for (let x = 0; x < canvas.width; x += TILE_SIZE * 2) {
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillRect(x + TILE_SIZE, y + TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    ctx.fillStyle = '#555';
    for (let y = 0; y < canvas.height; y += TILE_SIZE * 2) {
        for (let x = 0; x < canvas.width; x += TILE_SIZE * 2) {
            ctx.fillRect(x + TILE_SIZE, y, TILE_SIZE, TILE_SIZE);
            ctx.fillRect(x, y + TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    currentUiAsset.elements.forEach(el => {
        ctx.fillStyle = el.props.color || '#cccccc';
        ctx.fillRect(el.props.x, el.props.y, el.props.width, el.props.height);

        if (selectedUiElement && selectedUiElement.id === el.id) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
            ctx.strokeRect(el.props.x, el.props.y, el.props.width, el.props.height);
        }
    });
}

function renderUiInspector() {
    if (!dom.uiEditorInspector) return;
    const container = dom.uiEditorInspector.querySelector('.panel-content');

    if (!selectedUiElement) {
        container.innerHTML = `<p class="inspector-placeholder">${window.Localization?.get('SELECCIONA_ELEMENTO_UI') || 'Selecciona un elemento UI'}</p>`;
        return;
    }

    let propsHtml = '';
    for (const key in selectedUiElement.props) {
        const value = selectedUiElement.props[key];
        let inputType = 'text';
        if (typeof value === 'number') inputType = 'number';
        if (key === 'color') inputType = 'color';

        propsHtml += `
            <div class="prop-row">
                <label>${key}</label>
                <input type="${inputType}" class="prop-input" data-prop="${key}" value="${value}">
            </div>
        `;
    }

    container.innerHTML = `
        <div class="inspector-materia-header">
             <input type="text" id="ui-element-name-input" value="${selectedUiElement.name}">
        </div>
        <div class="component-grid">
            ${propsHtml}
        </div>
    `;
}

function initUIEditorResizers() {
    if (uiResizersInitialized) return;

    const resizerLeft = dom.uiResizerLeft;
    const resizerRight = dom.uiResizerRight;
    const hierarchyPanel = dom.uiEditorHierarchy;
    const inspectorPanel = dom.uiEditorInspector;

    let startX, startWidth;

    function onPointerMoveLeft(e) {
        const newWidth = startWidth + e.clientX - startX;
        if (newWidth > 150 && newWidth < 500) { // Add some constraints
            hierarchyPanel.style.width = `${newWidth}px`;
        }
    }

    function onPointerMoveRight(e) {
        const newWidth = startWidth - (e.clientX - startX);
        if (newWidth > 150 && newWidth < 500) { // Add some constraints
            inspectorPanel.style.width = `${newWidth}px`;
        }
    }

    const onPointerUp = (e) => {
        resizerLeft.releasePointerCapture(e.pointerId);
        resizerRight.releasePointerCapture(e.pointerId);
        resizerLeft.removeEventListener('pointermove', onPointerMoveLeft);
        resizerRight.removeEventListener('pointermove', onPointerMoveRight);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    resizerLeft.style.touchAction = 'none';
    resizerLeft.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        resizerLeft.setPointerCapture(e.pointerId);
        startX = e.clientX;
        startWidth = hierarchyPanel.offsetWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        resizerLeft.addEventListener('pointermove', onPointerMoveLeft);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
    });

    resizerRight.style.touchAction = 'none';
    resizerRight.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        resizerRight.setPointerCapture(e.pointerId);
        startX = e.clientX;
        startWidth = inspectorPanel.offsetWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        resizerRight.addEventListener('pointermove', onPointerMoveRight);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
    });
    uiResizersInitialized = true;
}

export function openUiEditor() {
    if (!dom.uiEditorPanel) return;
    dom.uiEditorPanel.classList.remove('hidden');
    initUIEditorResizers();
}

export async function openUiAsset(fileHandle) {
    try {
        uiEditorFileHandle = fileHandle;
        const file = await fileHandle.getFile();
        const content = await file.text();
        currentUiAsset = JSON.parse(content);
        selectedUiElement = null;

        console.log(`UI Asset cargado: ${fileHandle.name}`, currentUiAsset);

        openUiEditor();

        renderUiHierarchy();
        renderUiCanvas();
        renderUiInspector();

    } catch (error) {
        console.error(`Error al abrir el asset UI '${fileHandle.name}':`, error);
        window.Dialogs.showNotification(
            window.Localization?.get('ERROR') || 'Error',
            window.Localization?.get('ERROR_ABRIR_UI_ASSET') || 'No se pudo abrir el asset de UI.'
        );
    }
}

export async function createUiSystemFile(dirHandle, updateAssetBrowser) {
    const fileName = "nuevo-ui.ceui";
    try {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        const defaultContent = {
            name: "Nuevo UI",
            elements: [
                {
                    id: 'element_' + Date.now(),
                    name: "Panel Base",
                    type: "Panel",
                    props: {
                        x: 50,
                        y: 50,
                        width: 200,
                        height: 150,
                        color: "#333333"
                    }
                }
            ]
        };
        await writable.write(JSON.stringify(defaultContent, null, 2));
        await writable.close();
        await updateAssetBrowser();
        console.log(`Creado archivo de UI: ${fileName}`);
    } catch (err) {
        console.error("Error al crear el archivo de UI:", err);
        window.Dialogs.showNotification(
            window.Localization?.get('ERROR') || 'Error',
            window.Localization?.get('ERROR_CREAR_UI_FILE') || 'No se pudo crear el archivo de UI.'
        );
    }
}

function setupEventListeners() {
    if (dom.uiEditorSaveBtn) {
        dom.uiEditorSaveBtn.addEventListener('click', async () => {
            if (!uiEditorFileHandle || !currentUiAsset) {
                window.Dialogs.showNotification(
                    window.Localization?.get('ERROR') || 'Error',
                    window.Localization?.get('ERROR_SIN_UI_ABIERTO') || 'No hay ningún asset de UI abierto para guardar.'
                );
                return;
            }
            try {
                const writable = await uiEditorFileHandle.createWritable();
                await writable.write(JSON.stringify(currentUiAsset, null, 2));
                await writable.close();
                window.Dialogs.showNotification(
                    window.Localization?.get('EXITO') || 'Éxito',
                    (window.Localization?.get('EXITO_ASSET_GUARDADO') || "Asset '{name}' guardado.")
                        .replace('{name}', uiEditorFileHandle.name)
                );
            } catch (error) {
                console.error("Error al guardar el asset de UI:", error);
                window.Dialogs.showNotification(
                    window.Localization?.get('ERROR') || 'Error',
                    window.Localization?.get('ERROR_GUARDAR_UI_ASSET') || 'No se pudo guardar el asset de UI.'
                );
            }
        });
    }
    if (dom.uiCanvasMaximizeBtn) {
        dom.uiCanvasMaximizeBtn.addEventListener('click', () => {
            const panel = dom.uiEditorPanel;
            panel.classList.toggle('maximized');
            setTimeout(renderUiCanvas, 50);
        });
    }
    if (dom.uiEditorInspector) {
        dom.uiEditorInspector.addEventListener('input', (e) => {
            if (!selectedUiElement) return;

            if (e.target.matches('.prop-input')) {
                const prop = e.target.dataset.prop;
                let value = e.target.value;
                if (e.target.type === 'number') {
                    value = parseFloat(value) || 0;
                }
                selectedUiElement.props[prop] = value;
                renderUiCanvas();
            } else if (e.target.matches('#ui-element-name-input')) {
                selectedUiElement.name = e.target.value;
                renderUiHierarchy();
            }
        });
    }
}

export function initialize(domCache) {
    dom = domCache;
    setupEventListeners();
}
