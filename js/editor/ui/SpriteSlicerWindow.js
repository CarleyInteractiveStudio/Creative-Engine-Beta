// --- Module State ---
let localDom = {};
let currentFileHandle = null;
let sourceImage = null;
let generatedSlices = []; // Array of { id, name, rect }
let selectedSliceId = null;
let nextSliceId = 0;
let saveCallback = null;
let dirHandle = null;
let openAssetSelectorCallback = null;
let saveAssetMetaCallback = null;

// --- Initialization ---
export function initialize(dependencies) {
    const cachedDom = dependencies.dom;
    openAssetSelectorCallback = dependencies.openAssetSelectorCallback;
    saveAssetMetaCallback = dependencies.saveAssetMetaCallback; // Store the generic save callback

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
        spriteList: cachedDom.slicerSpriteList,
        spriteProperties: cachedDom.slicerSpriteProperties,
        propName: cachedDom.spritePropName,
        propX: cachedDom.spritePropX,
        propY: cachedDom.spritePropY,
        propW: cachedDom.spritePropW,
        propH: cachedDom.spritePropH,
    };

    // Setup Event Listeners
    localDom.sliceType.addEventListener('change', handleSliceTypeChange);
    localDom.pivotSelect.addEventListener('change', handlePivotChange);
    localDom.sliceBtn.addEventListener('click', executeSlice);
    localDom.applyBtn.addEventListener('click', applySlices);
    localDom.canvas.addEventListener('mousedown', handleCanvasMouseDown);

    // Properties Panel Listeners
    localDom.propName.addEventListener('change', updateSliceFromProperties);
    localDom.propX.addEventListener('change', updateSliceFromProperties);
    localDom.propY.addEventListener('change', updateSliceFromProperties);
    localDom.propW.addEventListener('change', updateSliceFromProperties);
    localDom.propH.addEventListener('change', updateSliceFromProperties);

    localDom.loadImageBtn.addEventListener('click', () => {
        if (openAssetSelectorCallback) {
            openAssetSelectorCallback('image', (fileHandle, directoryHandle) => {
                loadImageFromFileHandle(fileHandle, directoryHandle, saveAssetMetaCallback);
            });
        } else {
            console.error("Asset selector callback not initialized for Sprite Slicer.");
        }
    });
}

// --- Public API ---
export async function open(fileHandle, directoryHandle, saveMetaCb) {
    localDom.panel.classList.remove('hidden');
    resetToDefaultState();

    if (fileHandle) {
        await loadImageFromFileHandle(fileHandle, directoryHandle, saveMetaCb);
    } else {
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

    resetToDefaultState(); // Reset before loading new image

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
    // sourceImage is NOT reset here, only on new load
    generatedSlices = [];
    selectedSliceId = null;
    nextSliceId = 0;

    if(localDom.ctx) localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    if(localDom.spriteList) localDom.spriteList.innerHTML = '';
    if(localDom.spriteProperties) localDom.spriteProperties.classList.add('hidden');

    if (!sourceImage) {
        localDom.overlay.classList.remove('hidden');
        localDom.mainContent.classList.add('hidden');
    }
}

function selectSlice(sliceId) {
    selectedSliceId = sliceId;
    updateSpriteList();
    populateProperties();
    draw();
}

function updateSpriteList() {
    localDom.spriteList.innerHTML = '';
    if (!sourceImage) return;

    generatedSlices.forEach(slice => {
        const item = document.createElement('div');
        item.className = 'sprite-list-item';
        item.dataset.sliceId = slice.id;
        if (slice.id === selectedSliceId) {
            item.classList.add('selected');
        }

        const preview = document.createElement('canvas');
        preview.className = 'preview-canvas';
        preview.width = 40;
        preview.height = 40;
        const pctx = preview.getContext('2d');
        // Clear and draw with a fixed aspect ratio
        pctx.clearRect(0, 0, 40, 40);
        const aspect = slice.rect.width / slice.rect.height;
        let drawW = 40, drawH = 40;
        if (aspect > 1) {
            drawH = 40 / aspect;
        } else {
            drawW = 40 * aspect;
        }
        pctx.drawImage(sourceImage, slice.rect.x, slice.rect.y, slice.rect.width, slice.rect.height, (40 - drawW) / 2, (40 - drawH) / 2, drawW, drawH);


        const nameSpan = document.createElement('span');
        nameSpan.className = 'sprite-name';
        nameSpan.textContent = slice.name;

        item.appendChild(preview);
        item.appendChild(nameSpan);

        item.addEventListener('click', () => selectSlice(slice.id));
        localDom.spriteList.appendChild(item);
    });
}


function populateProperties() {
    if (selectedSliceId === null) {
        localDom.spriteProperties.classList.add('hidden');
        return;
    }
    const slice = generatedSlices.find(s => s.id === selectedSliceId);
    if (!slice) return;

    localDom.spriteProperties.classList.remove('hidden');
    localDom.propName.value = slice.name;
    localDom.propX.value = slice.rect.x;
    localDom.propY.value = slice.rect.y;
    localDom.propW.value = slice.rect.width;
    localDom.propH.value = slice.rect.height;
}

function handleCanvasMouseDown(e) {
    if (!sourceImage) return;

    const canvasRect = localDom.canvas.getBoundingClientRect();
    const startX = e.clientX - canvasRect.left;
    const startY = e.clientY - canvasRect.top;

    let selectedSlice = generatedSlices.find(s => s.id === selectedSliceId);
    let action = 'none';
    let originalRect = null;

    if (selectedSlice) {
        action = getDragAction(startX, startY, selectedSlice.rect);
        originalRect = { ...selectedSlice.rect };
    }

    // If an action on the selected slice is detected (move or resize)
    if (selectedSlice && action !== 'none') {
        const onMouseMove = (moveEvent) => {
            const currentX = moveEvent.clientX - canvasRect.left;
            const currentY = moveEvent.clientY - canvasRect.top;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            let newRect = { ...selectedSlice.rect };

            if (action === 'move') {
                newRect.x = Math.round(originalRect.x + deltaX);
                newRect.y = Math.round(originalRect.y + deltaY);
            } else { // It's a resize action
                if (action.includes('l')) { newRect.x = Math.round(originalRect.x + deltaX); newRect.width = Math.round(originalRect.width - deltaX); }
                if (action.includes('r')) { newRect.width = Math.round(originalRect.width + deltaX); }
                if (action.includes('t')) { newRect.y = Math.round(originalRect.y + deltaY); newRect.height = Math.round(originalRect.height - deltaY); }
                if (action.includes('b')) { newRect.height = Math.round(originalRect.height + deltaY); }

                // Prevent inverted rectangles
                if (newRect.width < 0) { newRect.x += newRect.width; newRect.width *= -1; }
                if (newRect.height < 0) { newRect.y += newRect.height; newRect.height *= -1; }
            }

            selectedSlice.rect = newRect;
            populateProperties(); // Update inspector in real-time
            draw();
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            updateSpriteList(); // Update the preview thumbnail
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return;
    }

    // Check if clicking inside any other slice to select it
    for (let i = generatedSlices.length - 1; i >= 0; i--) {
        const slice = generatedSlices[i];
        if (startX >= slice.rect.x && startX < slice.rect.x + slice.rect.width && startY >= slice.rect.y && startY < slice.rect.y + slice.rect.height) {
            selectSlice(slice.id);
            return;
        }
    }

    // If in manual mode and not clicking any slice, start drawing a new one
    if (localDom.sliceType.value === 'Manual') {
        selectSlice(null);
        const onDrawMove = (moveEvent) => {
            draw();
            const currentX = moveEvent.clientX - canvasRect.left;
            const currentY = moveEvent.clientY - canvasRect.top;
            localDom.ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
            localDom.ctx.lineWidth = 2;
            localDom.ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
        };
        const onDrawUp = (upEvent) => {
            window.removeEventListener('mousemove', onDrawMove);
            window.removeEventListener('mouseup', onDrawUp);
            const endX = upEvent.clientX - canvasRect.left;
            const endY = upEvent.clientY - canvasRect.top;
            const newRect = {
                x: Math.round(Math.min(startX, endX)),
                y: Math.round(Math.min(startY, endY)),
                width: Math.round(Math.abs(endX - startX)),
                height: Math.round(Math.abs(endY - startY))
            };
            if (newRect.width > 2 && newRect.height > 2) {
                const baseName = currentFileHandle.name.split('.')[0];
                const newSlice = { id: nextSliceId++, name: `${baseName}_${nextSliceId - 1}`, rect: newRect };
                generatedSlices.push(newSlice);
                selectSlice(newSlice.id);
            } else {
                draw();
            }
        };
        window.addEventListener('mousemove', onDrawMove);
        window.addEventListener('mouseup', onDrawUp);
    }
}

function getDragAction(x, y, rect) {
    const handleSize = 8;
    const handles = {
        'tl': { x: rect.x, y: rect.y }, 't': { x: rect.x + rect.width / 2, y: rect.y }, 'tr': { x: rect.x + rect.width, y: rect.y },
        'l': { x: rect.x, y: rect.y + rect.height / 2 }, 'r': { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
        'bl': { x: rect.x, y: rect.y + rect.height }, 'b': { x: rect.x + rect.width / 2, y: rect.y + rect.height }, 'br': { x: rect.x + rect.width, y: rect.y + rect.height }
    };
    for (const [key, pos] of Object.entries(handles)) {
        if (Math.abs(x - pos.x) < handleSize && Math.abs(y - pos.y) < handleSize) return key;
    }
    if (x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height) return 'move';
    return 'none';
}


function draw() {
    if (!sourceImage) return;
    localDom.ctx.clearRect(0, 0, localDom.canvas.width, localDom.canvas.height);
    localDom.ctx.drawImage(sourceImage, 0, 0);

    generatedSlices.forEach(slice => {
        if (slice.id === selectedSliceId) {
            localDom.ctx.strokeStyle = 'yellow';
            localDom.ctx.lineWidth = 2;
        } else {
            localDom.ctx.strokeStyle = 'rgba(0, 255, 25, 0.75)';
            localDom.ctx.lineWidth = 1;
        }
        localDom.ctx.strokeRect(slice.rect.x, slice.rect.y, slice.rect.width, slice.rect.height);

        if (slice.id === selectedSliceId) {
            drawResizeHandles(slice.rect);
        }
    });
}

function drawResizeHandles(rect) {
    const handleSize = 8;
    localDom.ctx.fillStyle = 'yellow';
    const handles = [
        { x: rect.x, y: rect.y }, { x: rect.x + rect.width / 2, y: rect.y }, { x: rect.x + rect.width, y: rect.y },
        { x: rect.x, y: rect.y + rect.height / 2 }, { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
        { x: rect.x, y: rect.y + rect.height }, { x: rect.x + rect.width / 2, y: rect.y + rect.height }, { x: rect.x + rect.width, y: rect.y + rect.height }
    ];
    handles.forEach(handle => {
        localDom.ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    });
}

function handleSliceTypeChange(e) {
    const type = e.target.value;
    const optionsContainer = document.getElementById('slice-options-dynamic-container');
    if (optionsContainer) {
        optionsContainer.classList.toggle('hidden', type === 'Manual');
    }
    localDom.gridCellSizeOptions.classList.toggle('hidden', type !== 'Grid by Cell Size');
    localDom.gridCellCountOptions.classList.toggle('hidden', type !== 'Grid by Cell Count');
}

function handlePivotChange(e) {
    localDom.customPivotContainer.classList.toggle('hidden', e.target.value !== 'Custom');
}

function executeSlice() {
    if (!sourceImage) return;

    const type = localDom.sliceType.value;
    let rects = [];

    switch (type) {
        case 'Automatic': rects = sliceAutomatic(); break;
        case 'Grid by Cell Size': rects = sliceByCellSize(); break;
        case 'Grid by Cell Count': rects = sliceByCellCount(); break;
    }

    generatedSlices = [];
    selectedSliceId = null;
    nextSliceId = 0;
    const baseName = currentFileHandle.name.split('.')[0];

    rects.forEach(rect => {
         generatedSlices.push({
            id: nextSliceId++,
            name: `${baseName}_${nextSliceId - 1}`,
            rect: rect
        });
    });

    updateSpriteList();
    populateProperties(); // Hides properties since no slice is selected
    draw();
    console.log(`Generated ${generatedSlices.length} slices.`);
}

async function applySlices() {
    if (generatedSlices.length === 0) {
        window.Dialogs.showNotification("Aviso", "No hay slices para aplicar. Usa el botón 'Slice' primero.");
        return;
    }
    if (!saveCallback || !dirHandle || !currentFileHandle) {
        window.Dialogs.showNotification("Error", "No se puede aplicar cambios. Asegúrate de haber cargado la imagen a través del Inspector.");
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

        generatedSlices.forEach(slice => {
            metaData.sprites[slice.name] = {
                name: slice.name,
                rect: slice.rect,
                pivot: { x: 0.5, y: 0.5 },
                border: { left: 0, top: 0, right: 0, bottom: 0 }
            };
        });

        await saveCallback(currentFileHandle.name, metaData, dirHandle);
        window.Dialogs.showNotification("Éxito", `Se han guardado ${generatedSlices.length} sprites en el archivo .meta.`);
        localDom.panel.classList.add('hidden');
        resetToDefaultState();
        sourceImage = null; // Fully reset after saving

    } catch (error) {
        console.error("Error al guardar los metadatos de los sprites:", error);
        window.Dialogs.showNotification("Error", "No se pudieron guardar los sprites.");
    }
}

function sliceAutomatic() {
    const rects = [];
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
                    rects.push(bounds);
                }
            }
        }
    }
    return rects;
}

function updateSliceFromProperties() {
    if (selectedSliceId === null) return;
    const slice = generatedSlices.find(s => s.id === selectedSliceId);
    if (!slice) return;

    // Update name
    const newName = localDom.propName.value.trim();
    if (newName && !generatedSlices.some(s => s.name === newName && s.id !== slice.id)) {
        slice.name = newName;
    } else {
        // Revert if name is empty or already exists
        localDom.propName.value = slice.name;
    }

    // Update rect properties
    slice.rect.x = parseInt(localDom.propX.value, 10) || 0;
    slice.rect.y = parseInt(localDom.propY.value, 10) || 0;
    slice.rect.width = parseInt(localDom.propW.value, 10) || 0;
    slice.rect.height = parseInt(localDom.propH.value, 10) || 0;

    // Refresh UI
    updateSpriteList();
    draw();
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
    const rects = [];
    const cellWidth = parseInt(localDom.pixelSizeX.value, 10);
    const cellHeight = parseInt(localDom.pixelSizeY.value, 10);
    const offsetX = parseInt(localDom.offsetX.value, 10);
    const offsetY = parseInt(localDom.offsetY.value, 10);
    const paddingX = parseInt(localDom.paddingX.value, 10);
    const paddingY = parseInt(localDom.paddingY.value, 10);

    if (cellWidth <= 0 || cellHeight <= 0) return rects;

    for (let y = offsetY; y < sourceImage.height; y += cellHeight + paddingY) {
        for (let x = offsetX; x < sourceImage.width; x += cellWidth + paddingX) {
            if (x + cellWidth > sourceImage.width || y + cellHeight > sourceImage.height) continue;
            rects.push({ x, y, width: cellWidth, height: cellHeight });
        }
    }
    return rects;
}

function sliceByCellCount() {
    const rects = [];
    const cols = parseInt(localDom.columnCount.value, 10);
    const rows = parseInt(localDom.rowCount.value, 10);

    if (cols <= 0 || rows <= 0) return rects;

    const cellWidth = Math.floor(sourceImage.width / cols);
    const cellHeight = Math.floor(sourceImage.height / rows);

     for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cellWidth;
            const y = r * cellHeight;
            rects.push({ x, y, width: cellWidth, height: cellHeight });
        }
    }
    return rects;
}
