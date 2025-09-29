import { getURLForAssetPath } from '../../engine/AssetUtils.js';

let dom = {};
let projectsDirHandle = null;
let currentPalette = {
    imagePath: '',
    tiles: [] // Array of {id, x, y, width, height}
};
let currentFileHandle = null;
let isDirty = false;
let selectedTileId = -1;

// --- Slicer State ---
let slices = []; // Rectangles being edited on the slicer
let slicerImage = new Image();

// --- Public API ---

export function initialize(editorDom, projDirHandle) {
    dom = {
        panel: editorDom.tilePalettePanel,
        assetName: editorDom.paletteAssetName,
        saveBtn: editorDom.paletteSaveBtn,
        selectImageBtn: editorDom.paletteSelectImageBtn,
        imageName: editorDom.paletteImageName,
        slicingModeSelector: document.getElementById('slicing-mode-selector'),
        cellSliceWidthInput: document.getElementById('cell-slice-width'),
        cellSliceHeightInput: document.getElementById('cell-slice-height'),
        sliceBtn: document.getElementById('palette-slice-btn'),
        slicerCanvas: document.getElementById('slicer-canvas'),
        slicerImage: document.getElementById('slicer-image'),
        paletteGridView: document.getElementById('palette-grid-view'),
        overlay: editorDom.palettePanelOverlay,
        resizer: document.getElementById('palette-resizer')
    };
    projectsDirHandle = projDirHandle;

    setupEventListeners();
    toggleCellSizeInputs(); // Set initial visibility
}

export async function openPalette(fileHandle) {
    if (isDirty) {
        if (!confirm("Tienes cambios no guardados. ¿Descartar?")) return;
    }
    try {
        const file = await fileHandle.getFile();
        const content = await file.text();
        const data = JSON.parse(content);
        currentFileHandle = fileHandle;
        currentPalette = {
            imagePath: data.imagePath || '',
            tiles: data.tiles || []
        };
        isDirty = false;
        selectedTileId = -1;
        dom.panel.classList.remove('hidden');
        dom.overlay.style.display = 'none';
        dom.assetName.textContent = file.name;
        if (currentPalette.imagePath) {
            await loadImage(currentPalette.imagePath);
        } else {
            resetSlicer();
            updatePaletteGrid();
        }
    } catch (error) {
        console.error(`Error al abrir la paleta:`, error);
    }
}

export function getSelectedTile() {
    if (selectedTileId === -1) return null;
    const tile = currentPalette.tiles.find(t => t.id === selectedTileId);
    if (!tile) return null;

    return { ...tile, image: slicerImage };
}

// --- Internal Logic ---

function toggleCellSizeInputs() {
    const isGridMode = dom.slicingModeSelector.value === 'grid';
    // The inputs are inside a shared parent div
    const cellInputsContainer = dom.cellSliceWidthInput.parentElement;
    if (cellInputsContainer) {
        cellInputsContainer.style.display = isGridMode ? 'flex' : 'none';
    }
}

function setupEventListeners() {
    dom.saveBtn.addEventListener('click', saveCurrentPalette);
    dom.selectImageBtn.addEventListener('click', selectImage);
    dom.sliceBtn.addEventListener('click', performSlice);
    dom.slicingModeSelector.addEventListener('change', toggleCellSizeInputs);

    let isResizing = false;
    dom.resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const parent = dom.panel.querySelector('#palette-editor-body');
        const leftPanel = parent.querySelector('#sprite-editor-view');
        const newLeftWidth = e.clientX - parent.getBoundingClientRect().left;
        leftPanel.style.flex = `0 0 ${newLeftWidth}px`;
    });
    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    });
}

async function selectImage() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: 'Images', accept: { 'image/*': ['.png'] } }],
        });
        const relativePath = `Assets/${fileHandle.name}`;
        currentPalette.imagePath = relativePath;
        currentPalette.tiles = [];
        isDirty = true;
        await loadImage(relativePath);
    } catch (err) {
        console.log("Selección de imagen cancelada.", err);
    }
}

async function loadImage(imagePath) {
    try {
        const imageUrl = await getURLForAssetPath(imagePath, projectsDirHandle);
        if (!imageUrl) throw new Error("No se pudo crear la URL para el asset.");

        slicerImage.src = imageUrl;
        await new Promise((resolve, reject) => {
            slicerImage.onload = resolve;
            slicerImage.onerror = reject;
        });

        dom.slicerImage.src = slicerImage.src;
        dom.imageName.textContent = imagePath.split('/').pop();
        resetSlicer();
        updatePaletteGrid();
    } catch (error) {
        console.error(`Error cargando el tileset:`, error);
    }
}

function resetSlicer() {
    const canvas = dom.slicerCanvas;
    const img = slicerImage;
    canvas.width = img.naturalWidth || 0;
    canvas.height = img.naturalHeight || 0;
    slices = currentPalette.tiles.map(t => ({ x: t.x, y: t.y, width: t.width, height: t.height }));
    drawSlicer();
}

function drawSlicer() {
    const canvas = dom.slicerCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = 1;
    slices.forEach(slice => {
        ctx.strokeRect(slice.x, slice.y, slice.width, slice.height);
    });
}

function performSlice() {
    const mode = dom.slicingModeSelector.value;
    if (mode === 'auto') {
        sliceAutomatically();
    } else {
        sliceByGrid();
    }
    drawSlicer();
    updatePaletteGrid();
    isDirty = true;
}

// --- Slicing Algorithms ---

function sliceAutomatically() {
    if (!slicerImage.src || !slicerImage.complete) return;

    const canvas = document.createElement('canvas');
    canvas.width = slicerImage.naturalWidth;
    canvas.height = slicerImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(slicerImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const visited = new Array(imageData.width * imageData.height).fill(false);
    const spriteBounds = [];
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const index = (y * imageData.width + x);
            // Find the start of a new, unvisited sprite
            if (imageData.data[index * 4 + 3] > 0 && !visited[index]) {
                const rect = findSpriteBounds(imageData, x, y, visited);
                spriteBounds.push(rect);
            }
        }
    }

    // The detected bounds ARE the slices.
    slices = spriteBounds;

    // Sort the slices from top-to-bottom, left-to-right for consistent IDs
    slices.sort((a, b) => (a.y * slicerImage.width + a.x) - (b.y * slicerImage.width + b.x));

    currentPalette.tiles = slices.map((s, i) => ({ id: i, ...s }));
}


function findSpriteBounds(imageData, startX, startY, visited) {
    const { data, width, height } = imageData;
    const queue = [[startX, startY]];
    let minX = startX, minY = startY, maxX = startX, maxY = startY;
    visited[startY * width + startX] = true;
    let head = 0;
    while(head < queue.length) {
        const [x, y] = queue[head++];
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        const neighbors = [[x, y-1], [x, y+1], [x-1, y], [x+1, y]];
        for(const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIndex = (ny * width + nx);
                if (data[nIndex * 4 + 3] > 0 && !visited[nIndex]) {
                    visited[nIndex] = true;
                    queue.push([nx, ny]);
                }
            }
        }
    }
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function sliceByGrid() {
    const cellWidth = parseInt(dom.cellSliceWidthInput.value, 10);
    const cellHeight = parseInt(dom.cellSliceHeightInput.value, 10);
    if (!slicerImage.src || !slicerImage.complete || cellWidth <= 0 || cellHeight <= 0) return;

    slices = [];
    const cols = Math.floor(slicerImage.naturalWidth / cellWidth);
    const rows = Math.floor(slicerImage.naturalHeight / cellHeight);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            slices.push({
                x: c * cellWidth,
                y: r * cellHeight,
                width: cellWidth,
                height: cellHeight
            });
        }
    }
    currentPalette.tiles = slices.map((s, i) => ({ id: i, ...s }));
}

function updatePaletteGrid() {
    dom.paletteGridView.innerHTML = '';
    if (!slicerImage.complete || slicerImage.naturalWidth === 0) return;

    currentPalette.tiles.forEach(tile => {
        const cell = document.createElement('div');
        cell.className = 'tile-cell';
        if (tile.id === selectedTileId) {
            cell.classList.add('selected');
        }
        cell.dataset.tileId = tile.id;

        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tile.width;
        tileCanvas.height = tile.height;
        const ctx = tileCanvas.getContext('2d');
        ctx.drawImage(slicerImage, tile.x, tile.y, tile.width, tile.height, 0, 0, tile.width, tile.height);

        const maxDim = 60;
        if (tile.width > maxDim || tile.height > maxDim) {
            const scale = Math.min(maxDim / tile.width, maxDim / tile.height);
            tileCanvas.style.width = `${tile.width * scale}px`;
            tileCanvas.style.height = `${tile.height * scale}px`;
        }

        cell.appendChild(tileCanvas);
        cell.addEventListener('click', () => {
            selectedTileId = tile.id;
            Array.from(dom.paletteGridView.children).forEach(c => {
                c.classList.toggle('selected', parseInt(c.dataset.tileId) === selectedTileId);
            });
        });

        dom.paletteGridView.appendChild(cell);
    });
}

async function saveCurrentPalette() {
    if (!currentFileHandle) return alert("No hay ninguna paleta abierta.");
    const dataToSave = {
        imagePath: currentPalette.imagePath,
        tiles: currentPalette.tiles
    };
    try {
        const writable = await currentFileHandle.createWritable();
        await writable.write(JSON.stringify(dataToSave, null, 2));
        await writable.close();
        isDirty = false;
        alert("Paleta guardada.");
    } catch (error) {
        console.error("Error guardando la paleta:", error);
    }
}