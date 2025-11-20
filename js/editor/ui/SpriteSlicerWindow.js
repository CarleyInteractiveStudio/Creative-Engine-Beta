// --- Module State ---
let localDom = {};
let currentFileHandle = null;
let sourceImage = null;
let generatedSlices = [];
let dirHandle = null;
let openAssetSelectorCallback = null;
let createAssetCallback = null;
let projectsDirHandle = null;

// --- Initialization ---
export function initialize(dependencies) {
    const cachedDom = dependencies.dom;
    openAssetSelectorCallback = dependencies.openAssetSelectorCallback;
    createAssetCallback = dependencies.createAssetCallback;
    projectsDirHandle = dependencies.projectsDirHandle;

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
        applyBtn: cachedDom.slicerApplyBtn,
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
    localDom.sliceType.addEventListener('change', handleSliceTypeChange);
    localDom.pivotSelect.addEventListener('change', handlePivotChange);
    localDom.sliceBtn.addEventListener('click', () => executeSlice(false)); // Explicitly not a preview
    localDom.applyBtn.addEventListener('click', saveSpriteAsset);
    localDom.loadImageBtn.addEventListener('click', () => {
        if (openAssetSelectorCallback) {
            openAssetSelectorCallback('image', (fileHandle, directoryHandle) => {
                loadImageFromFileHandle(fileHandle, directoryHandle);
            });
        } else {
            console.error("Asset selector callback not initialized for Sprite Slicer.");
        }
    });

    // Real-time preview for slicing options
    const sliceInputs = [
        localDom.pixelSizeX, localDom.pixelSizeY,
        localDom.columnCount, localDom.rowCount,
        localDom.offsetX, localDom.offsetY,
        localDom.paddingX, localDom.paddingY,
    ];
    sliceInputs.forEach(input => {
        input.addEventListener('input', () => executeSlice(true));
    });
}

// --- Public API ---
export async function open(fileHandle, directoryHandle) {
    localDom.panel.classList.remove('hidden');
    resetToDefaultState();

    if (fileHandle) {
        const fileName = fileHandle.name.toLowerCase();
        if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
            await loadImageFromFileHandle(fileHandle, directoryHandle);
        } else if (fileName.endsWith('.cesprite')) {
            await loadSpriteAsset(fileHandle);
        } else {
            window.Dialogs.showNotification("Error", "Tipo de archivo no soportado por el Editor de Sprites.");
        }
    } else {
        localDom.overlay.classList.remove('hidden');
        localDom.mainContent.classList.add('hidden');
        localDom.sliceBtn.disabled = true;
        localDom.applyBtn.disabled = true;
    }
}

async function getHandleFromPath(rootHandle, path) {
    const parts = path.split('/').filter(p => p);
    let currentHandle = rootHandle;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        try {
            if (i === parts.length - 1) { // It's the file
                currentHandle = await currentHandle.getFileHandle(part);
            } else { // It's a directory
                currentHandle = await currentHandle.getDirectoryHandle(part);
            }
        } catch (error) {
            console.error(`No se pudo encontrar la ruta '${path}' en la parte '${part}'`, error);
            return null;
        }
    }
    return currentHandle;
}


async function loadSpriteAsset(spriteAssetHandle) {
    try {
        const file = await spriteAssetHandle.getFile();
        const content = await file.text();
        const spriteData = JSON.parse(content);

        if (!spriteData.sourceImage || !spriteData.sprites) {
            throw new Error("El archivo .ceSprite está malformado.");
        }

        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);

        const sourceImageHandle = await getHandleFromPath(projectHandle, `Assets/${spriteData.sourceImage}`);
        if (!sourceImageHandle) {
            throw new Error(`No se pudo encontrar la imagen de origen: ${spriteData.sourceImage}`);
        }

        const pathParts = `Assets/${spriteData.sourceImage}`.split('/');
        pathParts.pop();
        const sourceDirHandle = await getHandleFromPath(projectHandle, pathParts.join('/'));


        await loadImageFromFileHandle(sourceImageHandle, sourceDirHandle);

        generatedSlices = spriteData.sprites.map(s => s.rect);
        draw();

    } catch (error) {
        console.error("Error al cargar el asset de sprite:", error);
        window.Dialogs.showNotification("Error", `No se pudo cargar el archivo .ceSprite: ${error.message}`);
        resetToDefaultState();
    }
}

async function loadImageFromFileHandle(fileHandle, directoryHandle) {
    currentFileHandle = fileHandle;
    dirHandle = directoryHandle;
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
    generatedSlices = [];
    if(localDom.ctx) localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    localDom.overlay.classList.remove('hidden');
    localDom.mainContent.classList.add('hidden');
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
    executeSlice(true); // Update preview
}

function handlePivotChange(e) {
    localDom.customPivotContainer.classList.toggle('hidden', e.target.value !== 'Custom');
}

function executeSlice(isPreview = false) {
    if (!sourceImage) return;

    const type = localDom.sliceType.value;
    generatedSlices = [];

    switch (type) {
        case 'Automatic':
            if (!isPreview) {
                sliceAutomatic();
            }
            break;
        case 'Grid by Cell Size':
            sliceByCellSize();
            break;
        case 'Grid by Cell Count':
            sliceByCellCount();
            break;
    }

    draw();

    if (!isPreview) {
        console.log(`Generated ${generatedSlices.length} slices.`);
    }
}

async function saveSpriteAsset() {
    if (generatedSlices.length === 0) {
        window.Dialogs.showNotification("Aviso", "No hay slices para guardar. Usa el botón 'Slice' primero.");
        return;
    }
    if (!createAssetCallback || !currentFileHandle) {
        window.Dialogs.showNotification("Error", "No se puede guardar el asset. La función de guardado no está disponible.");
        return;
    }

    const spriteAsset = {
        sourceImage: currentFileHandle.name, // Store only the filename, relative to Assets/
        sprites: []
    };

    generatedSlices.forEach((rect, index) => {
        const spriteName = `${currentFileHandle.name.split('.')[0]}_${index}`;
        spriteAsset.sprites.push({
            name: spriteName,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            pivot: { x: 0.5, y: 0.5 },
            border: { left: 0, top: 0, right: 0, bottom: 0 }
        });
    });

    const defaultName = `${currentFileHandle.name.split('.')[0]}.ceSprite`;
    try {
        await createAssetCallback(defaultName, spriteAsset);
        window.Dialogs.showNotification("Éxito", `Se ha guardado el archivo ${defaultName}.`);
        localDom.panel.classList.add('hidden');
        resetToDefaultState();
    } catch (error) {
        console.error("Error al guardar el asset de sprite:", error);
        window.Dialogs.showNotification("Error", "No se pudo guardar el archivo de sprite.");
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
