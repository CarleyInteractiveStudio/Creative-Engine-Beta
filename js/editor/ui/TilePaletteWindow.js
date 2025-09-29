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
let selectedSliceIndex = -1;
let isDrawing = false;
let isDragging = false;
let isResizing = false;
let dragStartPos = { x: 0, y: 0 };
let resizeHandle = null; // e.g., 'n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'
let originalSlice = null;


// --- Public API ---

export function initialize(editorDom, projDirHandle) {
    dom = {
        panel: editorDom.tilePalettePanel,
        assetName: editorDom.paletteAssetName,
        saveBtn: editorDom.paletteSaveBtn,
        selectImageBtn: editorDom.paletteSelectImageBtn,
        applySlicesBtn: document.getElementById('palette-apply-slices-btn'),
        slicerCanvas: document.getElementById('sprite-editor-canvas'),
        slicerImage: document.getElementById('sprite-editor-image'),
        paletteGridView: document.getElementById('palette-grid-view'),
        overlay: editorDom.palettePanelOverlay,
        resizer: document.getElementById('palette-resizer')
    };
    projectsDirHandle = projDirHandle;

    setupEventListeners();
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

function setupEventListeners() {
    dom.saveBtn.addEventListener('click', saveCurrentPalette);
    dom.selectImageBtn.addEventListener('click', selectImage);
    dom.applySlicesBtn.addEventListener('click', applySlices);

    dom.slicerCanvas.addEventListener('mousedown', handleSlicerMouseDown);
    dom.slicerCanvas.addEventListener('mousemove', handleSlicerMouseMove);
    document.addEventListener('mouseup', handleSlicerMouseUp); // Listen on document to catch mouseup outside canvas
    dom.slicerCanvas.addEventListener('mousemove', (e) => { // For cursor changes
        const rect = dom.slicerCanvas.getBoundingClientRect();
        const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        if (selectedSliceIndex !== -1) {
            const handle = getHandleAtPos(mousePos, slices[selectedSliceIndex]);
            if (handle) {
                dom.slicerCanvas.style.cursor = `${handle}-resize`;
            } else if (isPointInRect(mousePos, slices[selectedSliceIndex])) {
                dom.slicerCanvas.style.cursor = 'move';
            } else {
                dom.slicerCanvas.style.cursor = 'crosshair';
            }
        } else {
            dom.slicerCanvas.style.cursor = 'crosshair';
        }
    });


    let isResizingPanel = false;
    dom.resizer.addEventListener('mousedown', (e) => {
        isResizingPanel = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isResizingPanel) return;
        const parent = dom.panel.querySelector('#palette-editor-body');
        const leftPanel = parent.querySelector('#sprite-editor-view');
        const newLeftWidth = e.clientX - parent.getBoundingClientRect().left;
        leftPanel.style.flex = `0 0 ${newLeftWidth}px`;
    });
    document.addEventListener('mouseup', () => {
        isResizingPanel = false;
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
    selectedSliceIndex = -1;
    drawSlicer();
}

// --- Slicer Drawing and Interaction ---

function drawSlicer() {
    const canvas = dom.slicerCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;

    slices.forEach((slice, index) => {
        if (index === selectedSliceIndex) return; // Draw selected one last
        ctx.strokeRect(slice.x, slice.y, slice.width, slice.height);
    });

    if (selectedSliceIndex !== -1) {
        const slice = slices[selectedSliceIndex];
        ctx.strokeStyle = 'rgba(255, 215, 0, 1)'; // Gold for selection
        ctx.lineWidth = 2;
        ctx.strokeRect(slice.x, slice.y, slice.width, slice.height);
        drawResizeHandles(ctx, slice);
    }
}

function drawResizeHandles(ctx, rect) {
    const handleSize = 8;
    const halfHandle = handleSize / 2;
    ctx.fillStyle = 'rgba(255, 215, 0, 1)';
    const handles = getHandlePositions(rect);
    for (const key in handles) {
        ctx.fillRect(handles[key].x - halfHandle, handles[key].y - halfHandle, handleSize, handleSize);
    }
}

function getHandlePositions(rect) {
    return {
        'nw': { x: rect.x, y: rect.y },
        'n':  { x: rect.x + rect.width / 2, y: rect.y },
        'ne': { x: rect.x + rect.width, y: rect.y },
        'e':  { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
        'se': { x: rect.x + rect.width, y: rect.y + rect.height },
        's':  { x: rect.x + rect.width / 2, y: rect.y + rect.height },
        'sw': { x: rect.x, y: rect.y + rect.height },
        'w':  { x: rect.x, y: rect.y + rect.height / 2 }
    };
}

function getHandleAtPos(pos, rect) {
    const handleSize = 12; // Larger hitbox for easier clicking
    const halfHandle = handleSize / 2;
    const handles = getHandlePositions(rect);
    for (const name in handles) {
        const handlePos = handles[name];
        if (Math.abs(pos.x - handlePos.x) <= halfHandle && Math.abs(pos.y - handlePos.y) <= halfHandle) {
            return name;
        }
    }
    return null;
}

function isPointInRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
}

function handleSlicerMouseDown(e) {
    if (e.button !== 0) return;
    const rect = dom.slicerCanvas.getBoundingClientRect();
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragStartPos = { ...mousePos };

    if (selectedSliceIndex !== -1) {
        const handle = getHandleAtPos(mousePos, slices[selectedSliceIndex]);
        if (handle) {
            isResizing = true;
            resizeHandle = handle;
            originalSlice = { ...slices[selectedSliceIndex] };
            return;
        }
    }

    const clickedIndex = slices.findIndex(s => isPointInRect(mousePos, s));
    if (clickedIndex !== -1) {
        isDragging = true;
        selectedSliceIndex = clickedIndex;
        originalSlice = { ...slices[clickedIndex] };
    } else {
        isDrawing = true;
        selectedSliceIndex = -1;
    }
    drawSlicer();
}

function handleSlicerMouseMove(e) {
    if (!isDrawing && !isDragging && !isResizing) return;
    const rect = dom.slicerCanvas.getBoundingClientRect();
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (isDrawing) {
        drawSlicer(); // Redraw base slices
        const ctx = dom.slicerCanvas.getContext('2d');
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(dragStartPos.x, dragStartPos.y, mousePos.x - dragStartPos.x, mousePos.y - dragStartPos.y);
        ctx.setLineDash([]);
    } else if (isDragging) {
        const dx = mousePos.x - dragStartPos.x;
        const dy = mousePos.y - dragStartPos.y;
        slices[selectedSliceIndex].x = originalSlice.x + dx;
        slices[selectedSliceIndex].y = originalSlice.y + dy;
        drawSlicer();
    } else if (isResizing) {
        const dx = mousePos.x - dragStartPos.x;
        const dy = mousePos.y - dragStartPos.y;
        const slice = slices[selectedSliceIndex];

        if (resizeHandle.includes('e')) slice.width = originalSlice.width + dx;
        if (resizeHandle.includes('w')) {
            slice.x = originalSlice.x + dx;
            slice.width = originalSlice.width - dx;
        }
        if (resizeHandle.includes('s')) slice.height = originalSlice.height + dy;
        if (resizeHandle.includes('n')) {
            slice.y = originalSlice.y + dy;
            slice.height = originalSlice.height - dy;
        }
        drawSlicer();
    }
}

function handleSlicerMouseUp(e) {
    if (isDrawing) {
        const rect = dom.slicerCanvas.getBoundingClientRect();
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
    } else if (isResizing) {
        const slice = slices[selectedSliceIndex];
        if (slice.width < 0) { slice.x += slice.width; slice.width *= -1; }
        if (slice.height < 0) { slice.y += slice.height; slice.height *= -1; }
        isDirty = true;
    } else if (isDragging) {
        isDirty = true;
    }

    isDrawing = false;
    isDragging = false;
    isResizing = false;
    originalSlice = null;
    drawSlicer();
}

// --- Palette Grid & Save ---

function applySlices() {
    currentPalette.tiles = slices.map((s, i) => ({
        id: i,
        x: Math.round(s.x),
        y: Math.round(s.y),
        width: Math.round(s.width),
        height: Math.round(s.height)
    }));
    isDirty = true;
    updatePaletteGrid();
    alert(`${slices.length} recortes aplicados a la paleta.`);
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