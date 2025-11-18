// --- Module State ---
let localDom = {};
let currentFileHandle = null;
let sourceImage = null;
let generatedSlices = [];
let saveCallback = null;
let dirHandle = null;
let openAssetSelectorCallback = null;
let saveAssetMetaCallback = null;

// --- Initialization ---
export function initialize(dependencies) {
    localDom = {
        panel: dependencies.dom.spriteSlicerPanel,
        overlay: dependencies.dom.spriteSlicerOverlay,
        mainContent: dependencies.dom.spriteSlicerPanel.querySelector('.slicer-main-content'),
        canvas: dependencies.dom.slicerCanvas,
        ctx: dependencies.dom.slicerCanvas.getContext('2d'),
        sliceType: dependencies.dom.sliceType,
        gridCellSizeOptions: dependencies.dom.sliceGridCellSizeOptions,
        gridCellCountOptions: dependencies.dom.sliceGridCellCountOptions,
        pivotSelect: dependencies.dom.slicePivot,
        customPivotContainer: dependencies.dom.sliceCustomPivotContainer,
        sliceBtn: dependencies.dom.sliceBtn,
        applyBtn: dependencies.dom.slicerApplyBtn,
        loadImageBtn: dependencies.dom.slicerLoadImageBtn,
        closeBtn: dependencies.dom.spriteSlicerPanel.querySelector('.close-panel-btn'),
        pixelSizeX: dependencies.dom.slicePixelSizeX,
        pixelSizeY: dependencies.dom.slicePixelSizeY,
        columnCount: dependencies.dom.sliceColumnCount,
        rowCount: dependencies.dom.sliceRowCount,
        offsetX: dependencies.dom.sliceOffsetX,
        offsetY: dependencies.dom.sliceOffsetY,
        paddingX: dependencies.dom.slicePaddingX,
        paddingY: dependencies.dom.slicePaddingY,
    };
    openAssetSelectorCallback = dependencies.openAssetSelectorCallback;
    saveAssetMetaCallback = dependencies.saveAssetMetaCallback;


    // Setup Event Listeners
    localDom.sliceType.addEventListener('change', handleSliceTypeChange);
    localDom.pivotSelect.addEventListener('change', handlePivotChange);
    localDom.sliceBtn.addEventListener('click', executeSlice);
    localDom.applyBtn.addEventListener('click', applySlices);
    localDom.loadImageBtn.addEventListener('click', () => {
        if (openAssetSelectorCallback) {
            openAssetSelectorCallback(
                (asset) => {
                    // When an asset is selected, load it.
                    // The saveAssetMetaCallback is crucial for the 'Apply' button to work later.
                    loadImageFromFileHandle(asset.handle, asset.dirHandle, saveAssetMetaCallback);
                },
                {
                    accept: {
                        'image/png': ['.png'],
                        'image/jpeg': ['.jpg', '.jpeg'],
                    }
                }
            );
        } else {
            console.error("Error: El selector de assets no está disponible.");
        }
    });

    // Set the initial state correctly
    resetToDefaultState();
}

// --- Public API ---
export async function open(fileHandle, directoryHandle, saveMetaCallback) {
    localDom.panel.classList.remove('hidden');

    if (fileHandle) {
        await loadImageFromFileHandle(fileHandle, directoryHandle, saveMetaCallback);
    } else {
        // Opened from the Window menu, show overlay
        localDom.overlay.classList.remove('hidden');
        localDom.mainContent.classList.add('hidden');
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
                // Enable buttons now that an image is loaded
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
    dirHandle = null;
    saveCallback = null;
    generatedSlices = [];
    if(localDom.ctx) localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    localDom.overlay.classList.remove('hidden');
    localDom.mainContent.classList.add('hidden');
    // Disable buttons when no image is loaded
    localDom.sliceBtn.disabled = true;
    localDom.applyBtn.disabled = true;
}

function draw() {
    if (!sourceImage) return;
    localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    localDom.ctx.drawImage(sourceImage, 0, 0);

    localDom.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    localDom.ctx.lineWidth = 2;
    generatedSlices.forEach(rect => {
        localDom.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });
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
    generatedSlices = [];

    switch (type) {
        case 'Automatic': sliceAutomatic(); break;
        case 'Grid by Cell Size': sliceByCellSize(); break;
        case 'Grid by Cell Count': sliceByCellCount(); break;
    }

    draw();
    console.log(`Generated ${generatedSlices.length} slices.`);
}

async function applySlices() {
    if (generatedSlices.length === 0) {
        window.Dialogs.showNotification("Aviso", "No hay slices para aplicar. Usa el botón 'Slice' primero.");
        return;
    }
    if (!saveCallback || !dirHandle || !currentFileHandle) {
        window.Dialogs.showNotification("Error", "No se puede aplicar cambios. Faltan referencias internas al archivo.");
        console.error("Error al aplicar: Faltan dependencias de guardado (saveCallback, dirHandle, or currentFileHandle is null).");
        return;
    }

    try {
        let metaData = {};
        try {
            const metaFileHandle = await dirHandle.getFileHandle(`${currentFileHandle.name}.meta`);
            const metaFile = await metaFileHandle.getFile();
            metaData = JSON.parse(await metaFile.text());
        } catch (e) { /* Meta file doesn't exist, we'll create it. */ }

        metaData.sprites = {};

        generatedSlices.forEach((rect, index) => {
            const spriteName = `${currentFileHandle.name.split('.')[0]}_${index}`;
            metaData.sprites[spriteName] = {
                name: spriteName,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                pivot: { x: 0.5, y: 0.5 },
                border: { left: 0, top: 0, right: 0, bottom: 0 }
            };
        });

        await saveCallback(currentFileHandle.name, metaData, dirHandle);
        window.Dialogs.showNotification("Éxito", `Se han guardado ${generatedSlices.length} sprites en el archivo .meta.`);
        localDom.panel.classList.add('hidden'); // Close on success
        resetToDefaultState();

    } catch (error) {
        console.error("Error al guardar los metadatos de los sprites:", error);
        window.Dialogs.showNotification("Error", "No se pudieron guardar los sprites.");
    }
}

function sliceAutomatic() {
    const width = localDom.canvas.width;
    const height = localDom.canvas.height;
    const imageData = localDom.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const visited = new Array(width * height).fill(false);
    const alphaThreshold = 10;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x);
            if (visited[index]) continue;

            const alpha = data[index * 4 + 3];
            if (alpha > alphaThreshold) {
                const bounds = findSpriteBounds(x, y, width, height, data, visited, alphaThreshold);
                if (bounds.width > 5 && bounds.height > 5) {
                    generatedSlices.push(bounds);
                }
            }
        }
    }
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

function sliceByCellSize() {
    const cellWidth = parseInt(localDom.pixelSizeX.value, 10);
    const cellHeight = parseInt(localDom.pixelSizeY.value, 10);
    const offsetX = parseInt(localDom.offsetX.value, 10);
    const offsetY = parseInt(localDom.offsetY.value, 10);
    const paddingX = parseInt(localDom.paddingX.value, 10);
    const paddingY = parseInt(localDom.paddingY.value, 10);

    if (cellWidth <= 0 || cellHeight <= 0) return;

    for (let y = offsetY; y < sourceImage.height; y += cellHeight + paddingY) {
        for (let x = offsetX; x < sourceImage.width; x += cellWidth + paddingX) {
            if (x + cellWidth > sourceImage.width || y + cellHeight > sourceImage.height) continue;
            generatedSlices.push({ x, y, width: cellWidth, height: cellHeight });
        }
    }
}

function sliceByCellCount() {
    const cols = parseInt(localDom.columnCount.value, 10);
    const rows = parseInt(localDom.rowCount.value, 10);

    if (cols <= 0 || rows <= 0) return;

    const cellWidth = Math.floor(sourceImage.width / cols);
    const cellHeight = Math.floor(sourceImage.height / rows);

     for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cellWidth;
            const y = r * cellHeight;
            generatedSlices.push({ x, y, width: cellWidth, height: cellHeight });
        }
    }
}
