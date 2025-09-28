import { getURLForAssetPath } from '../../engine/AssetUtils.js';

let dom = {};
let projectsDirHandle = null;
let setActiveSceneTool = () => {}; // Callback to set the main tool in SceneView

let currentPalette = {
    imagePath: '',
    tiles: [] // Array of { id, x, y, width, height }
};
let currentFileHandle = null;
let selectedTileId = -1;
let activePaletteTool = 'brush';
let isDirty = false;

// --- Public API ---

export function initialize(dependencies) {
    dom = {
        panel: dependencies.dom.tilePalettePanel,
        assetName: dependencies.dom.paletteAssetName,
        saveBtn: dependencies.dom.paletteSaveBtn,
        selectImageBtn: dependencies.dom.paletteSelectImageBtn,
        imageName: dependencies.dom.paletteImageName,
        selectedTileIdSpan: dependencies.dom.paletteSelectedTileId,
        viewContainer: dependencies.dom.paletteViewContainer,
        gridCanvas: dependencies.dom.paletteGridCanvas,
        tilesetImage: dependencies.dom.paletteTilesetImage,
        overlay: dependencies.dom.palettePanelOverlay,
        previewCanvas: document.getElementById('palette-tile-preview'),
        // Slicer UI
        sliceModeSelect: document.getElementById('palette-slice-mode'),
        sliceWidthInput: document.getElementById('palette-slice-width'),
        sliceHeightInput: document.getElementById('palette-slice-height'),
        sliceGridSettings: document.getElementById('palette-grid-settings'),
        sliceBtn: document.getElementById('palette-slice-btn'),
        // Tools UI
        toolContainer: document.getElementById('palette-tools'),
    };
    projectsDirHandle = dependencies.projectsDirHandle;
    setActiveSceneTool = dependencies.setActiveSceneTool;

    setupEventListeners();
    setActivePaletteTool('brush'); // Set brush as default
}

export async function createNewPalette(name, dirHandle) {
    const content = {
        imagePath: "",
        tiles: []
    };

    try {
        const fileHandle = await dirHandle.getFileHandle(name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(content, null, 2));
        await writable.close();
        console.log(`Created new palette: ${name}`);
        await openPalette(fileHandle);
    } catch (error) {
        console.error(`Error creating new palette file ${name}:`, error);
        alert(`Failed to create palette: ${error.message}`);
    }
}

export async function openPalette(fileHandle) {
    if (isDirty) {
        if (!confirm("You have unsaved changes in the current palette. Do you want to discard them?")) {
            return;
        }
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
        dom.selectedTileIdSpan.textContent = '-';
        drawPreview();

        if (currentPalette.imagePath) {
            await loadImage(currentPalette.imagePath);
        } else {
            dom.tilesetImage.src = '';
            dom.imageName.textContent = 'Ninguna';
            clearGrid();
        }
    } catch (error) {
        console.error(`Error opening palette ${fileHandle.name}:`, error);
        alert(`Could not open palette: ${error.message}`);
    }
}

export function getSelectedTile() {
    return selectedTileId;
}


// --- Internal Logic ---

function setupEventListeners() {
    dom.saveBtn.addEventListener('click', saveCurrentPalette);
    dom.selectImageBtn.addEventListener('click', selectImage);
    dom.gridCanvas.addEventListener('mousedown', handleCanvasClick);
    dom.sliceBtn.addEventListener('click', sliceTileset);

    dom.sliceModeSelect.addEventListener('change', (e) => {
        const isGridMode = e.target.value === 'grid';
        dom.sliceGridSettings.style.display = isGridMode ? 'flex' : 'none';
    });

    dom.toolContainer.addEventListener('click', (e) => {
        const toolBtn = e.target.closest('.palette-tool-btn');
        if (toolBtn) {
            const toolName = toolBtn.dataset.tool;
            setActivePaletteTool(toolName);
        }
    });
}

function setActivePaletteTool(toolName) {
    activePaletteTool = toolName;

    // Update UI for palette tools
    dom.toolContainer.querySelectorAll('.palette-tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === toolName);
    });

    // Update the main scene tool
    if (toolName === 'brush') {
        setActiveSceneTool('tile-brush');
    } else if (toolName === 'eraser') {
        setActiveSceneTool('tile-eraser');
    } else {
        // For other tools like fill or picker, we might want a different scene tool or behavior
        // For now, let's default to the move tool if it's not a direct painting tool.
        setActiveSceneTool('move');
    }
}


async function saveCurrentPalette() {
    if (!currentFileHandle) {
        alert("No palette file is currently open. Cannot save.");
        return;
    }

    const dataToSave = {
        imagePath: currentPalette.imagePath,
        tiles: currentPalette.tiles
    };

    try {
        const writable = await currentFileHandle.createWritable();
        await writable.write(JSON.stringify(dataToSave, null, 2));
        await writable.close();
        isDirty = false;
        console.log(`Palette saved: ${currentFileHandle.name}`);
        alert("Paleta guardada exitosamente.");
    } catch (error) {
        console.error("Error saving palette:", error);
        alert(`Failed to save palette: ${error.message}`);
    }
}

async function selectImage() {
    try {
        const relativePath = await openImagePickerModal();

        if (relativePath) {
            await loadImage(relativePath);
            currentPalette.imagePath = relativePath;
            isDirty = true;
        }

    } catch (err) {
        console.log("Error in the image selection process.", err);
    }
}

async function loadImage(imagePath) {
    try {
        const imageUrl = await getURLForAssetPath(imagePath, projectsDirHandle);
        if (!imageUrl) throw new Error(`Could not create URL for ${imagePath}`);

        dom.tilesetImage.src = imageUrl;
        dom.imageName.textContent = imagePath.split('/').pop();

        await new Promise((resolve, reject) => {
            dom.tilesetImage.onload = resolve;
            dom.tilesetImage.onerror = reject;
        });

        if (currentPalette.tiles && currentPalette.tiles.length > 0) {
            drawGrid();
        } else {
            clearGrid();
        }

        selectedTileId = -1;
        dom.selectedTileIdSpan.textContent = '-';
        drawPreview();

    } catch (error) {
        console.error(`Error loading tileset image '${imagePath}':`, error);
        alert(`Could not load image: ${error.message}`);
        dom.tilesetImage.src = '';
        dom.imageName.textContent = 'Error';
    }
}

function sliceTileset() {
    const img = dom.tilesetImage;
    if (!img.src || !img.complete || img.naturalWidth === 0) {
        alert("Por favor, selecciona una imagen de tileset primero.");
        return;
    }

    const mode = dom.sliceModeSelect.value;
    if (mode === 'grid') {
        sliceByGrid();
    } else if (mode === 'automatic') {
        sliceByTransparency();
    }

    isDirty = true;
    selectedTileId = -1;
    dom.selectedTileIdSpan.textContent = '-';
    drawGrid();
    drawPreview();
}

function sliceByGrid() {
    const img = dom.tilesetImage;
    const cellWidth = parseInt(dom.sliceWidthInput.value, 10);
    const cellHeight = parseInt(dom.sliceHeightInput.value, 10);

    if (!cellWidth || !cellHeight || cellWidth <= 0 || cellHeight <= 0) {
        alert("Por favor, introduce un tamaño de celda válido.");
        return;
    }

    currentPalette.tiles = [];
    let id = 0;
    for (let y = 0; y < img.naturalHeight; y += cellHeight) {
        for (let x = 0; x < img.naturalWidth; x += cellWidth) {
            currentPalette.tiles.push({
                id: id++,
                x: x,
                y: y,
                width: cellWidth,
                height: cellHeight
            });
        }
    }
    console.log(`Sliced into ${id} tiles by grid.`);
}

function sliceByTransparency() {
    const img = dom.tilesetImage;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const { data, width, height } = imageData;

    const visited = new Array(width * height).fill(false);
    currentPalette.tiles = [];
    let tileId = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x);
            if (visited[index] || data[index * 4 + 3] === 0) {
                continue; // Skip visited or transparent pixels
            }

            const queue = [[x, y]];
            visited[index] = true;
            let minX = x, minY = y, maxX = x, maxY = y;

            while (queue.length > 0) {
                const [cx, cy] = queue.shift();

                minX = Math.min(minX, cx);
                minY = Math.min(minY, cy);
                maxX = Math.max(maxX, cx);
                maxY = Math.max(maxY, cy);

                const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dx, dy] of neighbors) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    const nIndex = ny * width + nx;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[nIndex] && data[nIndex * 4 + 3] > 0) {
                        visited[nIndex] = true;
                        queue.push([nx, ny]);
                    }
                }
            }

            currentPalette.tiles.push({
                id: tileId++,
                x: minX,
                y: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1
            });
        }
    }
    console.log(`Found ${tileId} sprites automatically.`);
}

function drawGrid() {
    const img = dom.tilesetImage;
    if (!img.src || !img.complete || img.naturalWidth === 0) {
        clearGrid();
        return;
    }

    const { naturalWidth, naturalHeight } = img;
    dom.gridCanvas.width = naturalWidth;
    dom.gridCanvas.height = naturalHeight;
    dom.gridCanvas.style.width = `${naturalWidth}px`;
    dom.gridCanvas.style.height = `${naturalHeight}px`;

    const ctx = dom.gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, naturalWidth, naturalHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

    currentPalette.tiles.forEach(tile => {
        ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
    });

    const selectedTile = currentPalette.tiles.find(t => t.id === selectedTileId);
    if (selectedTile) {
        ctx.strokeStyle = 'rgba(255, 215, 0, 1)'; // Gold color
        ctx.lineWidth = 3;
        ctx.strokeRect(selectedTile.x + 1.5, selectedTile.y + 1.5, selectedTile.width - 3, selectedTile.height - 3);
    }
}

function clearGrid() {
    dom.gridCanvas.width = 0;
    dom.gridCanvas.height = 0;
    currentPalette.tiles = [];
}

function drawPreview() {
    if (!dom.previewCanvas) return;
    const pCtx = dom.previewCanvas.getContext('2d');
    pCtx.clearRect(0, 0, dom.previewCanvas.width, dom.previewCanvas.height);

    const selectedTile = currentPalette.tiles.find(t => t.id === selectedTileId);

    if (!selectedTile || !dom.tilesetImage.src) {
        pCtx.fillStyle = 'rgba(0,0,0,0.2)';
        pCtx.fillRect(0, 0, dom.previewCanvas.width, dom.previewCanvas.height);
        return;
    }

    const { x, y, width, height } = selectedTile;

    const scale = Math.min(dom.previewCanvas.width / width, dom.previewCanvas.height / height);
    const dw = width * scale;
    const dh = height * scale;
    const dx = (dom.previewCanvas.width - dw) / 2;
    const dy = (dom.previewCanvas.height - dh) / 2;

    pCtx.imageSmoothingEnabled = false;
    pCtx.drawImage(dom.tilesetImage, x, y, width, height, dx, dy, dw, dh);
}

function handleCanvasClick(event) {
    if (!currentPalette.tiles || currentPalette.tiles.length === 0) return;

    const rect = dom.gridCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedTile = currentPalette.tiles.find(tile =>
        x >= tile.x && x <= tile.x + tile.width &&
        y >= tile.y && y <= tile.y + tile.height
    );

    if (clickedTile) {
        selectedTileId = clickedTile.id;
        dom.selectedTileIdSpan.textContent = selectedTileId;
        console.log(`Selected tile ID: ${selectedTileId}`);
        drawGrid();
        drawPreview();
    }
}

async function openImagePickerModal() {
    return new Promise(async (resolve) => {
        const modal = document.getElementById('sprite-selector-modal');
        if (!modal) {
            console.error("Sprite selector modal not found in DOM.");
            return resolve(null);
        }
        const grid = modal.querySelector('#sprite-selector-grid');
        const title = modal.querySelector('h2');
        if (!grid || !title) {
            console.error("Modal content (grid or title) not found.");
            return resolve(null);
        }
        const originalTitle = title.textContent;

        title.textContent = 'Seleccionar Imagen para Paleta';
        grid.innerHTML = ''; // Clear previous content

        const imageFiles = [];
        async function findImages(dirHandle, path = '') {
            for await (const entry of dirHandle.values()) {
                const entryPath = path ? `${path}/${entry.name}` : entry.name;
                if (entry.kind === 'file' && (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg'))) {
                    imageFiles.push({ name: entry.name, path: entryPath });
                } else if (entry.kind === 'directory') {
                    const nestedDirHandle = await dirHandle.getDirectoryHandle(entry.name);
                    await findImages(nestedDirHandle, entryPath);
                }
            }
        }

        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            if (!projectName) throw new Error("Could not determine project name from URL.");
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            await findImages(projectHandle, '');

            if (imageFiles.length === 0) {
                alert("No se encontraron imágenes (.png, .jpg) en el proyecto.");
                return resolve(null);
            }

            const closeAndResolve = (result) => {
                modal.classList.remove('is-open');
                grid.innerHTML = '';
                title.textContent = originalTitle;
                const closeButton = modal.querySelector('.close-button');
                if (closeButton) {
                    closeButton.onclick = null;
                }
                resolve(result);
            };

            imageFiles.forEach(imgFile => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'sprite-selector-item';
                imgContainer.style.textAlign = 'center';
                imgContainer.style.cursor = 'pointer';

                const img = document.createElement('img');
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.display = 'block';
                img.style.margin = '0 auto 5px';
                getURLForAssetPath(imgFile.path, projectsDirHandle).then(url => { if (url) img.src = url; });

                const nameLabel = document.createElement('span');
                nameLabel.textContent = imgFile.name;
                nameLabel.style.wordBreak = 'break-all';


                imgContainer.appendChild(img);
                imgContainer.appendChild(nameLabel);

                imgContainer.addEventListener('click', () => {
                    closeAndResolve(imgFile.path);
                });
                grid.appendChild(imgContainer);
            });

            const closeButton = modal.querySelector('.close-button');
            if (closeButton) {
                closeButton.onclick = () => closeAndResolve(null);
            }
            modal.classList.add('is-open');

        } catch (error) {
            console.error("Error building image picker:", error);
            alert(`Could not open image picker: ${error.message}`);
            resolve(null);
        }
    });
}