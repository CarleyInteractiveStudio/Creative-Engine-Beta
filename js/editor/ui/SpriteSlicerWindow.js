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
        closeBtn: cachedDom.spriteSlicerPanel.querySelector('.close-panel-btn'),
        pixelSizeX: cachedDom.slicePixelSizeX,
        pixelSizeY: cachedDom.slicePixelSizeY,
        columnCount: cachedDom.sliceColumnCount,
        rowCount: cachedDom.sliceRowCount,
        offsetX: cachedDom.sliceOffsetX,
        offsetY: cachedDom.sliceOffsetY,
        paddingX: cachedDom.slicePaddingX,
        paddingY: cachedDom.slicePaddingY,
    };

    // Setup Event Listeners
    localDom.canvas.addEventListener('mousedown', handleCanvasClick);
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
            openAssetSelectorCallback('image', (fileHandle, fullPath, directoryHandle) => {
                loadImageFromFileHandle(fileHandle, directoryHandle, saveAssetMetaCallback);
            });
        } else {
            console.error("Asset selector callback not initialized for Sprite Slicer.");
        }
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

async function loadImageFromFileHandle(fileHandle, directoryHandle, saveMetaCb) {
    currentFileHandle = fileHandle;
    dirHandle = directoryHandle;
    saveCallback = saveMetaCb;
    generatedSlices = [];

    try {
        const file = await fileHandle.getFile();
        if (!file.type.startsWith('image/')) {
            window.Dialogs.showNotification("Error", "El archivo seleccionado no es una imagen válida.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            sourceImage = new Image();
            sourceImage.onload = () => {
                localDom.canvas.width = sourceImage.naturalWidth;
                localDom.canvas.height = sourceImage.naturalHeight;
                draw();
                localDom.overlay.classList.add('hidden');
                localDom.mainContent.classList.remove('hidden');
                // Enable controls now that an image is loaded
                localDom.sliceBtn.disabled = false;
                localDom.applyBtn.disabled = false;
            };
            sourceImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error("Error al cargar la imagen:", error);
        window.Dialogs.showNotification("Error", "No se pudo cargar la imagen.");
        resetToDefaultState();
    }
}

// --- Internal Logic ---
function resetToDefaultState() {
    sourceImage = null;
    currentFileHandle = null;
    editingCeSpriteFileHandle = null;
    dirHandle = null;
    saveCallback = null;
    generatedSlices = [];
    selectedSliceIndex = -1;
    if(localDom.ctx) localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    localDom.overlay.classList.remove('hidden');
    localDom.mainContent.classList.add('hidden');
    localDom.applyBtn.textContent = 'Crear Asset de Sprite';
    localDom.deleteBtn.disabled = true;
}

function draw(previewSlices = []) {
    if (!sourceImage) return;
    localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    localDom.ctx.drawImage(sourceImage, 0, 0);

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

function executeSlice() {
    if (!sourceImage) return;

    const type = localDom.sliceType.value;

    // For automatic, we calculate it now since it's not previewed
    if (type === 'Automatic') {
        generatedSlices = sliceAutomatic();
    } else {
        // For grid types, the preview is what we want to confirm
        generatedSlices = calculatePreviewSlices();
    }

    draw(); // Redraw to show the confirmed slices in yellow
    console.log(`Confirmed ${generatedSlices.length} slices.`);
}

async function createSpriteAsset() {
    if (generatedSlices.length === 0) {
        window.Dialogs.showNotification("Aviso", "No hay slices para aplicar. Usa el botón 'Slice' primero.");
        return;
    }
    if (!createAssetCallback || !getAssetsDirectoryHandle || !updateAssetBrowserCallback || !currentFileHandle) {
        window.Dialogs.showNotification("Error", "Faltan funciones esenciales del editor para crear el asset.");
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

        generatedSlices.forEach((rect, index) => {
            const spriteName = `${baseName}_${index}`;
            spriteAssetContent.sprites[spriteName] = {
                name: spriteName,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                pivot: { x: 0.5, y: 0.5 },
                border: { left: 0, top: 0, right: 0, bottom: 0 }
            };
        });

        const jsonContent = JSON.stringify(spriteAssetContent, null, 2);
        const assetsDirHandle = await getAssetsDirectoryHandle();

        let fileHandle;
        if (isEditing) {
            // Overwrite the existing file
            fileHandle = editingCeSpriteFileHandle;
            const writable = await fileHandle.createWritable();
            await writable.write(jsonContent);
            await writable.close();
        } else {
            // Create a new file
            fileHandle = await createAssetCallback(assetName, jsonContent, assetsDirHandle);
        }

        if (fileHandle) {
            const message = isEditing
                ? `Asset '${assetName}' guardado con ${generatedSlices.length} sprites.`
                : `Asset '${assetName}' creado con ${generatedSlices.length} sprites.`;
            window.Dialogs.showNotification("Éxito", message);

            await updateAssetBrowserCallback(); // Refresh to show new/updated file
            localDom.panel.classList.add('hidden');
            resetToDefaultState();
        }

    } catch (error) {
        console.error(`Error al ${isEditing ? 'guardar' : 'crear'} el asset de sprite:`, error);
        window.Dialogs.showNotification("Error", `No se pudo ${isEditing ? 'guardar' : 'crear'} el archivo .ceSprite: ${error.message}`);
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
        const assetsDir = await getAssetsDirectoryHandle();
        const sourceImageFileHandle = await assetsDir.getFileHandle(sourceImageName);

        // A bit of a workaround: use loadImageFromFileHandle for the image loading part
        // but prevent it from setting top-level state we're managing here.
        await loadImageFromFileHandle(sourceImageFileHandle, assetsDir, null);

        // Populate existing slices
        generatedSlices = Object.values(spriteAssetData.sprites).map(s => s.rect);

        // Update UI for editing mode
        localDom.applyBtn.textContent = 'Guardar Cambios';
        draw(); // Redraw with the loaded slices

    } catch (error) {
        console.error("Error loading .ceSprite for editing:", error);
        window.Dialogs.showNotification("Error", `Could not load ${ceSpriteFileHandle.name} for editing.`);
        resetToDefaultState();
    }
}

function handleCanvasClick(e) {
    if (!sourceImage || generatedSlices.length === 0) return;

    const rect = localDom.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find if a slice was clicked
    const clickedSliceIndex = generatedSlices.findIndex(slice =>
        x >= slice.x && x <= slice.x + slice.width &&
        y >= slice.y && y <= slice.y + slice.height
    );

    if (clickedSliceIndex !== -1) {
        selectedSliceIndex = clickedSliceIndex;
        localDom.deleteBtn.disabled = false;
        console.log(`Selected slice index: ${selectedSliceIndex}`);
    } else {
        selectedSliceIndex = -1;
        localDom.deleteBtn.disabled = true;
    }

    draw(); // Redraw to show selection highlight
}

function deleteSelectedSlice() {
    if (selectedSliceIndex === -1) return;

    generatedSlices.splice(selectedSliceIndex, 1);
    selectedSliceIndex = -1;
    localDom.deleteBtn.disabled = true;

    draw(); // Redraw without the deleted slice
    console.log("Slice deleted.");
}
