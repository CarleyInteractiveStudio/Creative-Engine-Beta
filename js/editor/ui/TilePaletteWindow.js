import { getURLForAssetPath } from '../../engine/AssetUtils.js';

let dom = {};
let projectsDirHandle = null;
let setActiveSceneTool = () => {};

let currentPalette = {
    imagePath: '',
    tiles: []
};
let currentFileHandle = null;
let isDirty = false;

// --- Slicer State ---
let slices = [];
let selectedSliceIndex = -1;
let isDrawingSlice = false, isDraggingSlice = false, isResizingSlice = false;
let resizeHandle = null;
let dragStartPos = { x: 0, y: 0 };
let originalSlice = null;

// --- Palette State ---
let selectedTileId = -1;
let activePaletteTool = 'brush';

// --- Multi-view Sync State ---
// This will hold references to all grid views (floating and tabbed) that need to be updated.
let gridViewInstances = new Set();

// --- Public API ---

export function initialize(dependencies) {
    dom = {
        panel: dependencies.dom.tilePalettePanel,
        assetName: dependencies.dom.paletteAssetName,
        saveBtn: dependencies.dom.paletteSaveBtn,
        selectImageBtn: document.getElementById('palette-select-image-btn'),
        applySlicesBtn: document.getElementById('palette-apply-slices-btn'),
        editorView: document.getElementById('sprite-editor-view'),
        editorCanvas: document.getElementById('sprite-editor-canvas'),
        editorImage: document.getElementById('sprite-editor-image'),
        mainGridView: document.getElementById('palette-grid-view'), // The grid in the floating window
        resizer: document.getElementById('palette-resizer'),
        overlay: dependencies.dom.palettePanelOverlay,
    };
    projectsDirHandle = dependencies.projectsDirHandle;
    setActiveSceneTool = dependencies.setActiveSceneTool;

    // Register the main grid view
    if (dom.mainGridView) {
        gridViewInstances.add(dom.mainGridView);
    }

    setupEventListeners();
}

export function createTabbedView() {
    const container = document.createElement('div');
    container.className = 'palette-tab-view';

    const gridView = document.createElement('div');
    gridView.className = 'palette-grid-view-tabbed';

    // Register this new grid view so it gets updated along with the main one
    gridViewInstances.add(gridView);

    // When this tab is closed, we should unregister its grid view
    container.addEventListener('destroy', () => {
        gridViewInstances.delete(gridView);
    });

    container.appendChild(gridView);
    updatePaletteGrid(); // Populate it immediately with current tiles

    return {
        id: `tile-palette-tab-${Date.now()}`,
        element: container,
    };
}


export async function openPalette(fileHandle) {
    if (isDirty) {
        if (!confirm("Descartar cambios no guardados en la paleta actual?")) return;
    }
    try {
        const file = await fileHandle.getFile();
        const content = await file.text();
        const data = JSON.parse(content);
        currentFileHandle = fileHandle;
        currentPalette = { imagePath: data.imagePath || '', tiles: data.tiles || [] };
        isDirty = false;
        selectedTileId = -1;
        dom.panel.classList.remove('hidden');
        dom.overlay.style.display = 'none';
        dom.assetName.textContent = file.name;
        if (currentPalette.imagePath) {
            await loadImage(currentPalette.imagePath);
        } else {
            resetSlicer();
            updateAllViews();
        }
    } catch (error) {
        console.error(`Error opening palette:`, error);
    }
}

export function getSelectedTile() {
    return selectedTileId;
}

// --- Internal Logic ---

function setupEventListeners() {
    dom.saveBtn.addEventListener('click', saveCurrentPalette);
    dom.selectImageBtn.addEventListener('click', selectImage);
    dom.applySlicesBtn.addEventListener('click', applySlices);
    dom.editorCanvas.addEventListener('mousedown', handleSlicerMouseDown);
    document.addEventListener('mousemove', handleSlicerMouseMove);
    document.addEventListener('mouseup', handleSlicerMouseUp);
}

async function saveCurrentPalette() {
    if (!currentFileHandle) return alert("No palette file is open.");
    const dataToSave = { imagePath: currentPalette.imagePath, tiles: currentPalette.tiles };
    try {
        const writable = await currentFileHandle.createWritable();
        await writable.write(JSON.stringify(dataToSave, null, 2));
        await writable.close();
        isDirty = false;
        alert("Paleta guardada.");
    } catch (error) {
        console.error("Error saving palette:", error);
    }
}

async function selectImage() {
    try {
        const relativePath = await openImagePickerModal();
        if (relativePath) {
            currentPalette.imagePath = relativePath;
            currentPalette.tiles = [];
            slices = [];
            isDirty = true;
            await loadImage(relativePath);
        }
    } catch (err) {
        console.log("Image selection cancelled or failed.", err);
    }
}

async function loadImage(imagePath) {
    try {
        const imageUrl = await getURLForAssetPath(imagePath, projectsDirHandle);
        if (!imageUrl) throw new Error("Could not create URL for asset.");
        dom.editorImage.src = imageUrl;
        await new Promise(resolve => { dom.editorImage.onload = resolve; });
        resetSlicer();
        updateAllViews();
    } catch (error) {
        console.error(`Error loading tileset image:`, error);
        resetSlicer();
    }
}

function resetSlicer() {
    const img = dom.editorImage;
    dom.editorCanvas.width = img.naturalWidth || 0;
    dom.editorCanvas.height = img.naturalHeight || 0;
    dom.editorCanvas.style.width = `${img.naturalWidth || 0}px`;
    dom.editorCanvas.style.height = `${img.naturalHeight || 0}px`;

    slices = currentPalette.tiles.map(t => ({ ...t }));
    selectedSliceIndex = -1;
    drawSlicer();
}

function applySlices() {
    currentPalette.tiles = slices.map((s, i) => ({
        id: i,
        x: Math.round(s.x),
        y: Math.round(s.y),
        width: Math.round(s.width),
        height: Math.round(s.height)
    }));
    isDirty = true;
    updateAllViews();
    alert(`${slices.length} recortes aplicados a la paleta.`);
}

function drawSlicer() {
    const canvas = dom.editorCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    slices.forEach((slice, index) => {
        if (index === selectedSliceIndex) return;
        ctx.strokeRect(slice.x, slice.y, slice.width, slice.height);
    });

    if (selectedSliceIndex !== -1) {
        const slice = slices[selectedSliceIndex];
        ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(slice.x, slice.y, slice.width, slice.height);
        drawResizeHandles(ctx, slice);
    }
}

function drawResizeHandles(ctx, rect) {
    const handleSize = 8;
    const halfHandle = handleSize / 2;
    ctx.fillStyle = 'rgba(255, 215, 0, 1)';
    const handlePositions = [
        { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y },
        { x: rect.x, y: rect.y + rect.height }, { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x + rect.width / 2, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
        { x: rect.x + rect.width / 2, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height / 2 }
    ];
    handlePositions.forEach(p => ctx.fillRect(p.x - halfHandle, p.y - halfHandle, handleSize, handleSize));
}

function getHandleAtPos(pos, rect) {
    const handleSize = 12;
    const halfHandle = handleSize / 2;
    const handles = {
        'nw': { x: rect.x, y: rect.y }, 'n': { x: rect.x + rect.width / 2, y: rect.y },
        'ne': { x: rect.x + rect.width, y: rect.y }, 'e': { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
        'se': { x: rect.x + rect.width, y: rect.y + rect.height }, 's': { x: rect.x + rect.width / 2, y: rect.y + rect.height },
        'sw': { x: rect.x, y: rect.y + rect.height }, 'w': { x: rect.x, y: rect.y + rect.height / 2 }
    };
    for (const name in handles) {
        const handle = handles[name];
        if (Math.abs(pos.x - handle.x) <= halfHandle && Math.abs(pos.y - handle.y) <= halfHandle) {
            return name;
        }
    }
    return null;
}

function handleSlicerMouseDown(e) {
    if (e.target !== dom.editorCanvas) return;
    const rect = dom.editorCanvas.getBoundingClientRect();
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragStartPos = mousePos;

    if (selectedSliceIndex !== -1) {
        const handle = getHandleAtPos(mousePos, slices[selectedSliceIndex]);
        if (handle) {
            isResizingSlice = true;
            resizeHandle = handle;
            originalSlice = { ...slices[selectedSliceIndex] };
            return;
        }
    }

    const clickedIndex = slices.findIndex(s => mousePos.x >= s.x && mousePos.x <= s.x + s.width && mousePos.y >= s.y && mousePos.y <= s.y + s.height);
    if (clickedIndex !== -1) {
        isDraggingSlice = true;
        selectedSliceIndex = clickedIndex;
        originalSlice = { ...slices[clickedIndex] };
    } else {
        isDrawingSlice = true;
        selectedSliceIndex = -1;
    }
    drawSlicer();
}

function handleSlicerMouseMove(e) {
    if (!isDrawingSlice && !isDraggingSlice && !isResizingSlice) return;

    const rect = dom.editorCanvas.getBoundingClientRect();
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    let dx = mousePos.x - dragStartPos.x;
    let dy = mousePos.y - dragStartPos.y;

    if (isDrawingSlice) {
        drawSlicer();
        const ctx = dom.editorCanvas.getContext('2d');
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(dragStartPos.x, dragStartPos.y, dx, dy);
        ctx.setLineDash([]);
    } else if (isDraggingSlice) {
        slices[selectedSliceIndex].x = originalSlice.x + dx;
        slices[selectedSliceIndex].y = originalSlice.y + dy;
        drawSlicer();
    } else if (isResizingSlice) {
        const slice = slices[selectedSliceIndex];
        if (resizeHandle.includes('e')) slice.width = originalSlice.width + dx;
        if (resizeHandle.includes('s')) slice.height = originalSlice.height + dy;
        if (resizeHandle.includes('w')) {
            slice.x = originalSlice.x + dx;
            slice.width = originalSlice.width - dx;
        }
        if (resizeHandle.includes('n')) {
            slice.y = originalSlice.y + dy;
            slice.height = originalSlice.height - dy;
        }
        drawSlicer();
    }
}

function handleSlicerMouseUp(e) {
    if (!isDrawingSlice && !isDraggingSlice && !isResizingSlice) return;

    if (isDrawingSlice) {
        const rect = dom.editorCanvas.getBoundingClientRect();
        const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        let x = Math.min(mousePos.x, dragStartPos.x);
        let y = Math.min(mousePos.y, dragStartPos.y);
        let width = Math.abs(mousePos.x - dragStartPos.x);
        let height = Math.abs(mousePos.y - dragStartPos.y);

        if (width > 2 && height > 2) {
            slices.push({ x, y, width, height });
            selectedSliceIndex = slices.length - 1;
            isDirty = true;
        }
    } else if (isResizingSlice) {
        const slice = slices[selectedSliceIndex];
        if (slice.width < 0) { slice.x += slice.width; slice.width *= -1; }
        if (slice.height < 0) { slice.y += slice.height; slice.height *= -1; }
        isDirty = true;
    } else if (isDraggingSlice) {
        isDirty = true;
    }

    isDrawingSlice = false;
    isDraggingSlice = false;
    isResizingSlice = false;
    originalSlice = null;
    drawSlicer();
}

function updateAllViews() {
    gridViewInstances.forEach(grid => updatePaletteGrid(grid));
}

function updatePaletteGrid(gridViewElement) {
    if (!gridViewElement) return;
    gridViewElement.innerHTML = '';

    const fragment = document.createDocumentFragment();
    currentPalette.tiles.forEach(tile => {
        const tileContainer = document.createElement('div');
        tileContainer.className = 'palette-grid-tile';
        tileContainer.dataset.tileId = tile.id;
        if (tile.id === selectedTileId) {
            tileContainer.classList.add('active');
        }

        const canvas = document.createElement('canvas');
        canvas.width = tile.width;
        canvas.height = tile.height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        if (dom.editorImage && dom.editorImage.complete) {
            ctx.drawImage(dom.editorImage, tile.x, tile.y, tile.width, tile.height, 0, 0, tile.width, tile.height);
        }

        tileContainer.appendChild(canvas);
        tileContainer.addEventListener('click', () => {
            selectedTileId = tile.id;
            // Update selection visuals on all views
            gridViewInstances.forEach(grid => {
                grid.querySelectorAll('.palette-grid-tile').forEach(t => {
                    t.classList.toggle('active', t.dataset.tileId === String(tile.id));
                });
            });
            setActiveSceneTool('tile-brush');
        });
        fragment.appendChild(tileContainer);
    });
    gridViewElement.appendChild(fragment);
}

async function openImagePickerModal() {
    return new Promise(async (resolve) => {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{ description: 'Images', accept: { 'image/*': ['.png', '.jpg', '.jpeg'] } }],
            });
            resolve(`Assets/${fileHandle.name}`);
        } catch (e) {
            resolve(null);
        }
    });
}