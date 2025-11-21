// --- Module State ---
let localDom = {};
let currentFileHandle = null;
let sourceImage = null;
let generatedSlices = [];
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
    localDom.sliceType.addEventListener('change', (e) => {
        handleSliceTypeChange(e);
        drawSlicePreview();
    });
    localDom.pivotSelect.addEventListener('change', handlePivotChange);
    localDom.sliceBtn.addEventListener('click', executeSlice);
    localDom.applyBtn.addEventListener('click', createSpriteAsset);
    localDom.loadImageBtn.addEventListener('click', () => {
        if (openAssetSelectorCallback) {
            openAssetSelectorCallback('image', (fileHandle, directoryHandle) => {
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
        await loadImageFromFileHandle(fileHandle, directoryHandle, saveMetaCb);
    } else {
        // Opened from the Window menu, show overlay. User will use 'Load Image'.
        localDom.overlay.classList.remove('hidden');
        localDom.mainContent.classList.add('hidden');
        // Ensure buttons that require a loaded image are disabled
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
    dirHandle = null;
    saveCallback = null;
    generatedSlices = [];
    if(localDom.ctx) localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    localDom.overlay.classList.remove('hidden');
    localDom.mainContent.classList.add('hidden');
}

function draw(previewSlices = []) {
    if (!sourceImage) return;
    localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    localDom.ctx.drawImage(sourceImage, 0, 0);

    // Draw existing, confirmed slices in yellow
    localDom.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    localDom.ctx.lineWidth = 2;
    generatedSlices.forEach(rect => {
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
        console.error("Error al crear asset: Faltan dependencias como createAssetCallback.");
        return;
    }

    try {
        const baseName = currentFileHandle.name.substring(0, currentFileHandle.name.lastIndexOf('.'));
        const newAssetName = `${baseName}.ceSprite`;

        const spriteAssetContent = {
            sourceImage: currentFileHandle.name, // Reference to the original image
            sprites: {}
        };

        generatedSlices.forEach((rect, index) => {
            const spriteName = `${baseName}_${index}`;
            spriteAssetContent.sprites[spriteName] = {
                name: spriteName,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                pivot: { x: 0.5, y: 0.5 }, // Default pivot, can be customized later
                border: { left: 0, top: 0, right: 0, bottom: 0 }
            };
        });

        const jsonContent = JSON.stringify(spriteAssetContent, null, 2);
        const assetsDirHandle = await getAssetsDirectoryHandle();

        const newFileHandle = await createAssetCallback(newAssetName, jsonContent, assetsDirHandle);

        if (newFileHandle) {
            window.Dialogs.showNotification("Éxito", `Asset '${newAssetName}' creado con ${generatedSlices.length} sprites.`);
            await updateAssetBrowserCallback();
            localDom.panel.classList.add('hidden');
            resetToDefaultState();
        }
        // If newFileHandle is null, the createAssetCallback already showed an error.

    } catch (error) {
        console.error("Error al crear el asset de sprite:", error);
        window.Dialogs.showNotification("Error", `No se pudo crear el archivo .ceSprite: ${error.message}`);
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
