import { clearAssetCache } from '../../engine/AssetUtils.js';
import * as Dialogs from './DialogWindow.js';

// --- Module State ---
let localDom = {};
let currentFileHandle = null; // Handle of the source image being displayed
let editingCeSpriteFileHandle = null; // Handle of the .ceSprite asset being edited
let sourceImage = null;
let generatedSlices = [];
let selectedSliceIndex = -1;
let saveCallback = null;
let dirHandle = null;
let openAssetSelectorCallback = null;
let saveAssetMetaCallback = null;
let createAssetCallback = null;
let updateAssetBrowserCallback = null;
let getAssetsDirectoryHandle = null;

// Drawing state
let isDrawing = false;
let drawingTool = 'pencil';
let drawingColor = '#ffffff';
let brushSize = 2;
let startPos = { x: 0, y: 0 };
let drawingCanvas = null; // Offscreen canvas to hold the drawing
let drawingCtx = null;
let tempCanvas = null; // For previewing shapes while dragging
let tempCtx = null;

// --- Initialization ---
export function initialize(dependencies) {
    const cachedDom = dependencies.dom;
    openAssetSelectorCallback = dependencies.openAssetSelectorCallback;
    saveAssetMetaCallback = dependencies.saveAssetMetaCallback;
    createAssetCallback = dependencies.createAssetCallback;
    updateAssetBrowserCallback = dependencies.updateAssetBrowserCallback;
    getAssetsDirectoryHandle = dependencies.getAssetsDirectoryHandle;


    localDom = {
        panel: cachedDom.spriteSlicerPanel,
        overlay: cachedDom.spriteSlicerOverlay,
        mainContent: cachedDom.spriteSlicerPanel.querySelector('.slicer-main-content'),
        canvas: cachedDom.slicerCanvas,
        ctx: cachedDom.slicerCanvas.getContext('2d'),
        sliceType: cachedDom.sliceType,
        gridCellSizeOptions: cachedDom.sliceGridCellSizeOptions,
        gridCellCountOptions: cachedDom.sliceGridCellCountOptions,
        pivotSelect: cachedDom.slicePivot,
        customPivotContainer: cachedDom.sliceCustomPivotContainer,
        sliceBtn: cachedDom.sliceBtn,
        applyBtn: cachedDom.slicerCreateAssetBtn,
        deleteBtn: cachedDom.slicerDeleteSpriteBtn,
        loadImageBtn: cachedDom.slicerLoadImageBtn,
        newSpriteBtn: document.getElementById('slicer-new-sprite-btn'),
        closeBtn: cachedDom.spriteSlicerPanel.querySelector('.close-panel-btn'),
        pixelSizeX: cachedDom.slicePixelSizeX,
        pixelSizeY: cachedDom.slicePixelSizeY,
        columnCount: cachedDom.sliceColumnCount,
        rowCount: cachedDom.sliceRowCount,
        offsetX: cachedDom.sliceOffsetX,
        offsetY: cachedDom.sliceOffsetY,
        paddingX: cachedDom.slicePaddingX,
        paddingY: cachedDom.slicePaddingY,
        toolbar: document.getElementById('slicer-toolbar'),
        colorPicker: document.getElementById('slicer-color-picker'),
        brushSizeInput: document.getElementById('slicer-brush-size'),
        brushSizeVal: document.getElementById('slicer-brush-size-val'),
    };

    // Setup Event Listeners
    localDom.canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    localDom.sliceType.addEventListener('change', (e) => {
        handleSliceTypeChange(e);
        drawSlicePreview();
    });
    localDom.pivotSelect.addEventListener('change', handlePivotChange);
    localDom.sliceBtn.addEventListener('click', executeSlice);
    localDom.applyBtn.addEventListener('click', createSpriteAsset);
    localDom.deleteBtn.addEventListener('click', deleteSelectedSlice);
    localDom.loadImageBtn.addEventListener('click', () => {
        if (openAssetSelectorCallback) {
            openAssetSelectorCallback((fileHandle, fullPath, directoryHandle) => {
                loadImageFromFileHandle(fileHandle, directoryHandle, saveAssetMetaCallback);
            }, 'image');
        } else {
            console.error("Asset selector callback not initialized for Sprite Slicer.");
        }
    });

    localDom.newSpriteBtn.addEventListener('click', () => {
        Dialogs.showPrompt("Nuevo Sprite", "Introduce el tamaño (ej: 256x256 o solo 256):", (val) => {
            if (!val) return;
            let [w, h] = val.toLowerCase().split('x').map(n => parseInt(n.trim()));
            if (isNaN(w)) return;
            if (isNaN(h)) h = w;
            createNewSprite(w, h);
        });
    });

    localDom.toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.tool-btn');
        if (btn) {
            localDom.toolbar.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            drawingTool = btn.dataset.tool;
        }
    });

    localDom.colorPicker.addEventListener('input', (e) => {
        drawingColor = e.target.value;
    });

    localDom.brushSizeInput.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        localDom.brushSizeVal.textContent = brushSize;
    });

    // Listen for real-time input on all slicing parameter fields
    const fieldsToListen = [
        localDom.pixelSizeX, localDom.pixelSizeY,
        localDom.columnCount, localDom.rowCount,
        localDom.offsetX, localDom.offsetY,
        localDom.paddingX, localDom.paddingY
    ];

    fieldsToListen.forEach(field => {
        field.addEventListener('input', () => drawSlicePreview());
    });
}

// --- Public API ---
export async function open(fileHandle, directoryHandle, saveMetaCb) {
    localDom.panel.classList.remove('hidden');
    resetToDefaultState();

    if (fileHandle) {
        if (fileHandle.name.endsWith('.ceSprite')) {
            await loadCeSpriteForEditing(fileHandle, directoryHandle);
        } else {
            // It's a regular image file
            await loadImageFromFileHandle(fileHandle, directoryHandle, saveMetaCb);
        }
    } else {
        // Opened from the Window menu, show overlay. User will use 'Load Image'.
        localDom.overlay.classList.remove('hidden');
        localDom.mainContent.classList.add('hidden');
        localDom.sliceBtn.disabled = true;
        localDom.applyBtn.disabled = true;
    }
}

async function createNewSprite(w, h) {
    localDom.canvas.width = w;
    localDom.canvas.height = h;

    drawingCanvas = document.createElement('canvas');
    drawingCanvas.width = w;
    drawingCanvas.height = h;
    drawingCtx = drawingCanvas.getContext('2d', { willReadFrequently: true });

    tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    tempCtx = tempCanvas.getContext('2d');

    sourceImage = drawingCanvas; // Use drawing canvas as source
    currentFileHandle = { name: "NewSprite.png" }; // Placeholder
    generatedSlices = [];
    selectedSliceIndex = -1;

    localDom.overlay.classList.add('hidden');
    localDom.mainContent.classList.remove('hidden');
    localDom.toolbar.classList.remove('hidden');
    localDom.sliceBtn.disabled = false;
    localDom.applyBtn.disabled = false;

    draw();
}

async function loadImageFromFileHandle(fileHandle, directoryHandle, saveMetaCb) {
    currentFileHandle = fileHandle;
    dirHandle = directoryHandle;
    saveCallback = saveMetaCb;
    generatedSlices = [];

    try {
        const file = await fileHandle.getFile();
        const L = window.Localization;
        if (!file.type.startsWith('image/')) {
            Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_IMAGEN_INVALIDA', "El archivo seleccionado no es una imagen válida."));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            sourceImage = new Image();
            sourceImage.onload = () => {
                const w = sourceImage.naturalWidth;
                const h = sourceImage.naturalHeight;
                localDom.canvas.width = w;
                localDom.canvas.height = h;

                drawingCanvas = document.createElement('canvas');
                drawingCanvas.width = w;
                drawingCanvas.height = h;
                drawingCtx = drawingCanvas.getContext('2d', { willReadFrequently: true });
                drawingCtx.drawImage(sourceImage, 0, 0);

                tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                tempCtx = tempCanvas.getContext('2d');

                sourceImage = drawingCanvas; // Now we use the drawing canvas as the primary source

                draw();
                localDom.overlay.classList.add('hidden');
                localDom.mainContent.classList.remove('hidden');
                localDom.toolbar.classList.remove('hidden');
                // Enable controls now that an image is loaded
                localDom.sliceBtn.disabled = false;
                localDom.applyBtn.disabled = false;
            };
            sourceImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error("Error al cargar la imagen:", error);
        const L = window.Localization;
        Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_CARGAR_IMAGEN', "No se pudo cargar la imagen."));
        resetToDefaultState();
    }
}

// --- Internal Logic ---
function resetToDefaultState() {
    const L = window.Localization;
    sourceImage = null;
    currentFileHandle = null;
    editingCeSpriteFileHandle = null;
    dirHandle = null;
    saveCallback = null;
    generatedSlices = [];
    selectedSliceIndex = -1;
    drawingCanvas = null;
    drawingCtx = null;
    tempCanvas = null;
    tempCtx = null;
    if(localDom.ctx) localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    localDom.overlay.classList.remove('hidden');
    localDom.mainContent.classList.add('hidden');
    localDom.toolbar.classList.add('hidden');
    localDom.applyBtn.textContent = L.get('CREAR_ASSET_SPRITE', 'Crear Asset de Sprite');
    localDom.deleteBtn.disabled = true;
}

function draw(previewSlices = []) {
    if (!sourceImage) return;
    localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    localDom.ctx.drawImage(sourceImage, 0, 0);

    if (isDrawing && tempCanvas) {
        localDom.ctx.drawImage(tempCanvas, 0, 0);
    }

    // Draw existing, confirmed slices
    generatedSlices.forEach((rect, index) => {
        if (index === selectedSliceIndex) {
            // Highlight selected slice in red
            localDom.ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
            localDom.ctx.lineWidth = 3;
        } else {
            // Default color for confirmed slices
            localDom.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            localDom.ctx.lineWidth = 2;
        }
        localDom.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });

    // Draw preview slices in a different color (e.g., blue dashed line)
    if (previewSlices.length > 0) {
        localDom.ctx.strokeStyle = 'rgba(0, 150, 255, 0.75)';
        localDom.ctx.lineWidth = 1;
        localDom.ctx.setLineDash([5, 3]); // Dashed line for previews
        previewSlices.forEach(rect => {
            localDom.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        });
        localDom.ctx.setLineDash([]); // Reset line dash
    }
}


function drawSlicePreview() {
    if (!sourceImage) return;
    const previewSlices = calculatePreviewSlices();
    draw(previewSlices);
}

function calculatePreviewSlices() {
    if (!sourceImage) return [];

    const type = localDom.sliceType.value;
    let slices = [];

    switch (type) {
        case 'Automatic':
            // Automatic is expensive, so we don't preview it in real-time.
            // It will only be calculated when the "Slice" button is pressed.
            break;
        case 'Grid by Cell Size':
            slices = sliceByCellSize(true); // isPreview = true
            break;
        case 'Grid by Cell Count':
            slices = sliceByCellCount(true); // isPreview = true
            break;
    }
    return slices;
}


function handleSliceTypeChange(e) {
    const type = e.target.value;
    localDom.gridCellSizeOptions.classList.toggle('hidden', type !== 'Grid by Cell Size');
    localDom.gridCellCountOptions.classList.toggle('hidden', type !== 'Grid by Cell Count');
}

function handlePivotChange(e) {
    localDom.customPivotContainer.classList.toggle('hidden', e.target.value !== 'Custom');
}

function getSelectedPivot() {
    const value = localDom.pivotSelect.value;
    switch (value) {
        case 'Center': return { x: 0.5, y: 0.5 };
        case 'Top Left': return { x: 0, y: 0 };
        case 'Top': return { x: 0.5, y: 0 };
        case 'Top Right': return { x: 1, y: 0 };
        case 'Left': return { x: 0, y: 0.5 };
        case 'Right': return { x: 1, y: 0.5 };
        case 'Bottom Left': return { x: 0, y: 1 };
        case 'Bottom': return { x: 0.5, y: 1 };
        case 'Bottom Right': return { x: 1, y: 1 };
        case 'Custom':
            return {
                x: parseFloat(document.getElementById('slice-custom-pivot-x').value) || 0.5,
                y: parseFloat(document.getElementById('slice-custom-pivot-y').value) || 0.5
            };
        default: return { x: 0.5, y: 0.5 };
    }
}

function executeSlice() {
    if (!sourceImage) return;

    const type = localDom.sliceType.value;

    // For automatic, we calculate it now since it's not previewed
    if (type === 'Automatic') {
        generatedSlices = sliceAutomatic();
    } else if (type === 'Grid by Cell Size') {
        generatedSlices = sliceByCellSize(false); // isPreview = false, to discard empty regions
    } else if (type === 'Grid by Cell Count') {
        generatedSlices = sliceByCellCount(false); // isPreview = false, to discard empty regions
    } else {
        // Fallback
        generatedSlices = calculatePreviewSlices();
    }

    draw(); // Redraw to show the confirmed slices in yellow
    console.log(`Confirmed ${generatedSlices.length} slices.`);
}

async function createSpriteAsset() {
    const L = window.Localization;
    if (generatedSlices.length === 0) {
        Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('AVISO_SIN_SLICES', "No hay slices para aplicar. Usa el botón 'Slice' primero."));
        return;
    }
    if (!createAssetCallback || !getAssetsDirectoryHandle || !updateAssetBrowserCallback || !currentFileHandle) {
        Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_DEPS_ASSET', "Faltan funciones esenciales del editor para crear el asset."));
        console.error("Error al crear/guardar asset: Faltan dependencias.");
        return;
    }

    const isEditing = !!editingCeSpriteFileHandle;

    try {
        const baseName = currentFileHandle.name.substring(0, currentFileHandle.name.lastIndexOf('.'));
        const assetName = isEditing ? editingCeSpriteFileHandle.name : `${baseName}.ceSprite`;

        const spriteAssetContent = {
            sourceImage: currentFileHandle.name,
            sprites: {}
        };

        const selectedPivot = getSelectedPivot();

        generatedSlices.forEach((rect, index) => {
            const spriteName = `${baseName}_${index}`;
            spriteAssetContent.sprites[spriteName] = {
                name: spriteName,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                pivot: { x: selectedPivot.x, y: selectedPivot.y },
                border: { left: 0, top: 0, right: 0, bottom: 0 }
            };
        });

        // If it's a new drawing or edited drawing, we might need to save the image first.
        // For simplicity, if it's a new sprite, we'll prompt for a filename and save the .png
        if (currentFileHandle.name === "NewSprite.png") {
            const fileName = await new Promise(resolve => {
                Dialogs.showPrompt("Guardar Imagen", "Nombre del archivo de imagen (.png):", (name) => {
                    if (!name) resolve(null);
                    resolve(name.endsWith('.png') ? name : `${name}.png`);
                });
            });

            if (!fileName) return;

            const assetsDir = await getAssetsDirectoryHandle();
            const imageFileHandle = await assetsDir.getFileHandle(fileName, { create: true });
            const blob = await new Promise(resolve => drawingCanvas.toBlob(resolve, 'image/png'));
            const writable = await imageFileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            currentFileHandle = imageFileHandle;
            spriteAssetContent.sourceImage = currentFileHandle.name;
        } else if (drawingCanvas) {
            // If we have a drawing canvas, we should update the source image file if it's not a read-only asset
            // Actually, let's just save the current canvas state back to the file if it's an image we opened.
            const blob = await new Promise(resolve => drawingCanvas.toBlob(resolve, 'image/png'));
            const writable = await currentFileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
        }

        const jsonContent = JSON.stringify(spriteAssetContent, null, 2);
        const targetDirHandle = dirHandle || await getAssetsDirectoryHandle();

        let fileHandle;
        if (isEditing) {
            // Overwrite the existing file
            fileHandle = editingCeSpriteFileHandle;
            const writable = await fileHandle.createWritable();
            await writable.write(jsonContent);
            await writable.close();

            // Invalidate cache
            clearAssetCache(`Assets/${fileHandle.name}`);
        } else {
            // Create a new file
            fileHandle = await createAssetCallback(assetName, jsonContent, targetDirHandle);
        }

        if (fileHandle) {
            const displayName = assetName.replace(/\.[^/.]+$/, "");
            const message = isEditing
                ? L.get('EXITO_ASSET_GUARDADO_CON', "Asset '{name}' guardado con {count} sprites.").replace('{name}', displayName).replace('{count}', generatedSlices.length)
                : L.get('EXITO_ASSET_CREADO_CON', "Asset '{name}' creado con {count} sprites.").replace('{name}', displayName).replace('{count}', generatedSlices.length);
            Dialogs.showNotification(L.get('EXITO', "Éxito"), message);

            await updateAssetBrowserCallback(); // Refresh to show new/updated file
            localDom.panel.classList.add('hidden');
            resetToDefaultState();
        }

    } catch (error) {
        console.error(`Error al ${isEditing ? 'guardar' : 'crear'} el asset de sprite:`, error);
        const errorMsg = isEditing ? L.get('ERROR_GUARDAR_CE_SPRITE', 'No se pudo guardar el archivo .ceSprite') : L.get('ERROR_CREAR_CE_SPRITE', 'No se pudo crear el archivo .ceSprite');
        Dialogs.showNotification(L.get('ERROR', "Error"), `${errorMsg}: ${error.message}`);
    }
}

function sliceAutomatic() {
    const width = localDom.canvas.width;
    const height = localDom.canvas.height;
    const imageData = localDom.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const visited = new Array(width * height).fill(false);
    const alphaThreshold = 10;
    const slices = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x);
            if (visited[index]) continue;

            const alpha = data[index * 4 + 3];
            if (alpha > alphaThreshold) {
                const bounds = findSpriteBounds(x, y, width, height, data, visited, alphaThreshold);
                if (bounds.width > 5 && bounds.height > 5) {
                    slices.push(bounds);
                }
            }
        }
    }
    return slices;
}

function findSpriteBounds(startX, startY, width, height, data, visited, alphaThreshold) {
    const queue = [[startX, startY]];
    let minX = startX, minY = startY, maxX = startX, maxY = startY;
    visited[startY * width + startX] = true;
    let head = 0;

    while(head < queue.length) {
        const [x, y] = queue[head++];

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

        const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
        for (const [nx, ny] of neighbors) {
            const nIndex = ny * width + nx;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[nIndex] && data[nIndex * 4 + 3] > alphaThreshold) {
                visited[nIndex] = true;
                queue.push([nx, ny]);
            }
        }
    }
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function isRectEmpty(x, y, w, h) {
    if (!drawingCtx) return false;
    const data = drawingCtx.getImageData(x, y, w, h).data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 10) return false;
    }
    return true;
}

function sliceByCellSize(isPreview = false) {
    const slices = [];
    const cellWidth = parseInt(localDom.pixelSizeX.value, 10);
    const cellHeight = parseInt(localDom.pixelSizeY.value, 10);
    const offsetX = parseInt(localDom.offsetX.value, 10);
    const offsetY = parseInt(localDom.offsetY.value, 10);
    const paddingX = parseInt(localDom.paddingX.value, 10);
    const paddingY = parseInt(localDom.paddingY.value, 10);

    if (cellWidth <= 0 || cellHeight <= 0) return slices;

    for (let y = offsetY; y < sourceImage.height; y += cellHeight + paddingY) {
        for (let x = offsetX; x < sourceImage.width; x += cellWidth + paddingX) {
            if (x + cellWidth > sourceImage.width || y + cellHeight > sourceImage.height) continue;

            // Discard empty slices if confirmed (not in preview)
            if (!isPreview && isRectEmpty(x, y, cellWidth, cellHeight)) continue;

            slices.push({ x, y, width: cellWidth, height: cellHeight });
        }
    }
    return slices;
}

function sliceByCellCount(isPreview = false) {
    const slices = [];
    const cols = parseInt(localDom.columnCount.value, 10);
    const rows = parseInt(localDom.rowCount.value, 10);

    if (cols <= 0 || rows <= 0) return slices;

    const cellWidth = Math.floor(sourceImage.width / cols);
    const cellHeight = Math.floor(sourceImage.height / rows);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cellWidth;
            const y = r * cellHeight;

            // Discard empty slices if confirmed (not in preview)
            if (!isPreview && isRectEmpty(x, y, cellWidth, cellHeight)) continue;

            slices.push({ x, y, width: cellWidth, height: cellHeight });
        }
    }
    return slices;
}

async function loadCeSpriteForEditing(ceSpriteFileHandle, directoryHandle) {
    editingCeSpriteFileHandle = ceSpriteFileHandle;
    dirHandle = directoryHandle;
    saveCallback = null; // Not needed in edit mode

    try {
        const file = await ceSpriteFileHandle.getFile();
        const content = await file.text();
        const spriteAssetData = JSON.parse(content);

        // Find and load the source image
        const sourceImageName = spriteAssetData.sourceImage;
        let sourceImageFileHandle;
        let imageDirHandle = directoryHandle;
        try {
            sourceImageFileHandle = await directoryHandle.getFileHandle(sourceImageName);
        } catch (e) {
            console.warn(`[SpriteSlicer] Source image not found in the same directory as .ceSprite, falling back to Assets root:`, e);
            const assetsDir = await getAssetsDirectoryHandle();
            sourceImageFileHandle = await assetsDir.getFileHandle(sourceImageName);
            imageDirHandle = assetsDir;
        }

        // A bit of a workaround: use loadImageFromFileHandle for the image loading part
        // but prevent it from setting top-level state we're managing here.
        await loadImageFromFileHandle(sourceImageFileHandle, imageDirHandle, null);

        // Populate existing slices
        generatedSlices = Object.values(spriteAssetData.sprites).map(s => s.rect);

        // Update UI for editing mode
        const L = window.Localization;
        localDom.applyBtn.textContent = L.get('GUARDAR_CAMBIOS_SPRITE', 'Guardar Cambios');
        draw(); // Redraw with the loaded slices

    } catch (error) {
        console.error("Error loading .ceSprite for editing:", error);
        const L = window.Localization;
        Dialogs.showNotification(L.get('ERROR', "Error"), `${L.get('ERROR_CARGAR_CE_SPRITE', 'No se pudo cargar el archivo .ceSprite para editar')}: ${ceSpriteFileHandle.name}`);
        resetToDefaultState();
    }
}

function handleMouseDown(e) {
    if (!sourceImage) return;

    const rect = localDom.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if we are selecting a slice (only if pencil/eraser is NOT selected, or if we clicked outside)
    if (generatedSlices.length > 0) {
        const clickedSliceIndex = generatedSlices.findIndex(slice =>
            x >= slice.x && x <= slice.x + slice.width &&
            y >= slice.y && y <= slice.y + slice.height
        );

        if (clickedSliceIndex !== -1) {
            selectedSliceIndex = clickedSliceIndex;
            localDom.deleteBtn.disabled = false;
            draw();
            return;
        }
    }

    selectedSliceIndex = -1;
    localDom.deleteBtn.disabled = true;

    if (drawingCtx) {
        isDrawing = true;
        startPos = { x, y };

        if (drawingTool === 'pencil' || drawingTool === 'eraser') {
            drawingCtx.beginPath();
            drawingCtx.moveTo(x, y);
            drawingCtx.strokeStyle = drawingColor;
            drawingCtx.lineWidth = brushSize;
            drawingCtx.lineCap = 'round';
            drawingCtx.lineJoin = 'round';
            drawingCtx.globalCompositeOperation = drawingTool === 'eraser' ? 'destination-out' : 'source-over';
        }
    }

    draw();
}

function handleMouseMove(e) {
    if (!isDrawing || !drawingCtx) return;

    const rect = localDom.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawingTool === 'pencil' || drawingTool === 'eraser') {
        drawingCtx.lineTo(x, y);
        drawingCtx.stroke();
    } else {
        // Shapes
        if (tempCtx) {
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.strokeStyle = drawingColor;
            tempCtx.fillStyle = drawingColor;
            tempCtx.lineWidth = brushSize;
            tempCtx.lineCap = 'round';
            tempCtx.lineJoin = 'round';

            const dx = x - startPos.x;
            const dy = y - startPos.y;

            if (drawingTool === 'line') {
                tempCtx.beginPath();
                tempCtx.moveTo(startPos.x, startPos.y);
                tempCtx.lineTo(x, y);
                tempCtx.stroke();
            } else if (drawingTool === 'square') {
                tempCtx.strokeRect(startPos.x, startPos.y, dx, dy);
            } else if (drawingTool === 'circle') {
                const radius = Math.sqrt(dx * dx + dy * dy);
                tempCtx.beginPath();
                tempCtx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
                tempCtx.stroke();
            } else if (drawingTool === 'triangle') {
                tempCtx.beginPath();
                tempCtx.moveTo(startPos.x + dx / 2, startPos.y);
                tempCtx.lineTo(startPos.x, startPos.y + dy);
                tempCtx.lineTo(startPos.x + dx, startPos.y + dy);
                tempCtx.closePath();
                tempCtx.stroke();
            }
        }
    }

    draw();
}

function handleMouseUp(e) {
    if (!isDrawing || !drawingCtx) return;
    isDrawing = false;

    if (drawingTool !== 'pencil' && drawingTool !== 'eraser' && tempCanvas) {
        // Commit shape to main drawing canvas
        drawingCtx.globalCompositeOperation = 'source-over';
        drawingCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    }

    draw();
}

function deleteSelectedSlice() {
    if (selectedSliceIndex === -1) return;

    generatedSlices.splice(selectedSliceIndex, 1);
    selectedSliceIndex = -1;
    localDom.deleteBtn.disabled = true;

    draw(); // Redraw without the deleted slice
    console.log("Slice deleted.");
}
