// js/editor/ui/TilemapEditorWindow.js

let dom = {};
let projectsDirHandle = null;
let currentMapAsset = null;
let currentMapHandle = null;
let selectedTileIndex = 0;
let isPainting = false;
let tilesetImage = null;
let editMode = 'tiles'; // 'tiles' or 'collision'
let activeLayerIndex = 0;
let activeTool = 'pencil'; // pencil, bucket, rect
let rectStartPos = null;

function setActiveTool(tool) {
    activeTool = tool;
    // Clear any tool-specific state
    rectStartPos = null;

    // Update UI button states
    dom.toolPencilBtn.classList.toggle('active', tool === 'pencil');
    dom.toolBucketBtn.classList.toggle('active', tool === 'bucket');
    dom.toolRectBtn.classList.toggle('active', tool === 'rect');
    console.log(`Active tool set to: ${tool}`);
}

function renderLayerList() {
    if (!currentMapAsset) return;
    const list = dom.tilemapLayerList;
    list.innerHTML = '';
    currentMapAsset.layers.forEach((layer, index) => {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.textContent = layer.name;
        item.dataset.index = index;
        if (index === activeLayerIndex) {
            item.classList.add('active');
        }
        item.addEventListener('click', () => {
            activeLayerIndex = index;
            renderLayerList();
        });
        list.appendChild(item);
    });
}

function drawMap(event) {
    if (!currentMapAsset) return;

    const canvas = dom.tilemapCanvas;
    const ctx = canvas.getContext('2d');
    const map = currentMapAsset;

    canvas.width = map.width * map.tileWidth;
    canvas.height = map.height * map.tileHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (tilesetImage) {
        const tilesetCols = Math.floor(tilesetImage.width / map.tileWidth);
        map.layers.forEach(layer => {
            for (let y = 0; y < map.height; y++) {
                for (let x = 0; x < map.width; x++) {
                    const tileIndex = layer.tiles[y * map.width + x];
                    if (tileIndex === -1) continue;
                    const tileX = (tileIndex % tilesetCols) * map.tileWidth;
                    const tileY = Math.floor(tileIndex / tilesetCols) * map.tileHeight;
                    ctx.drawImage(tilesetImage, tileX, tileY, map.tileWidth, map.tileHeight, x * map.tileWidth, y * map.tileHeight, map.tileWidth, map.tileHeight);
                }
            }
        });
    }

    if (editMode === 'collision') {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.collisionData[y * map.width + x] === 1) {
                    ctx.fillRect(x * map.tileWidth, y * map.tileHeight, map.tileWidth, map.tileHeight);
                }
            }
        }
    }
}

function floodFill(layer, x, y, targetTile, replacementTile) {
    const map = currentMapAsset;
    if (targetTile === replacementTile) return;
    const q = [[x, y]];
    while (q.length > 0) {
        const [cx, cy] = q.shift();
        if (cx >= 0 && cx < map.width && cy >= 0 && cy < map.height) {
            const index = cy * map.width + cx;
            if (layer.tiles[index] === targetTile) {
                layer.tiles[index] = replacementTile;
                q.push([cx + 1, cy]);
                q.push([cx - 1, cy]);
                q.push([cx, cy + 1]);
                q.push([cx, cy - 1]);
            }
        }
    }
}

function fillRect(layer, x1, y1, x2, y2, tile) {
    const map = currentMapAsset;
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
                const index = y * map.width + x;
                layer.tiles[index] = tile;
            }
        }
    }
}

function handleMapPaint(event) {
    if (!isPainting || !currentMapAsset) return;

    if (activeTool === 'pencil') {
        // This check is to prevent painting with bucket tool on drag
        if (activeTool === 'bucket') return;

        const canvas = dom.tilemapCanvas;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const tileX = Math.floor(x / currentMapAsset.tileWidth);
        const tileY = Math.floor(y / currentMapAsset.tileHeight);
        const index = tileY * currentMapAsset.width + tileX;
        const activeLayer = currentMapAsset.layers[activeLayerIndex];
        if (!activeLayer || index < 0 || index >= activeLayer.tiles.length) return;

        if (editMode === 'tiles') {
            if (activeLayer.tiles[index] !== selectedTileIndex) {
                activeLayer.tiles[index] = selectedTileIndex;
                drawMap();
            }
        } else { // Collision mode
            const collisionValue = event.button === 2 ? 0 : 1; // Right-click to erase
            if (currentMapAsset.collisionData[index] !== collisionValue) {
                currentMapAsset.collisionData[index] = collisionValue;
                drawMap();
            }
        }
    } else if (activeTool === 'rect' && rectStartPos) {
        // Redraw the base map to clear the previous frame's preview rectangle
        drawMap();

        // And now, draw the preview rectangle on top
        const canvas = dom.tilemapCanvas;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const endX = event.clientX - rect.left;
        const endY = event.clientY - rect.top;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]); // A dashed line for the preview
        ctx.strokeRect(rectStartPos.x, rectStartPos.y, endX - rectStartPos.x, endY - rectStartPos.y);
        ctx.setLineDash([]); // Reset to solid line
    }
}

function selectTile(event) {
    if (!currentMapAsset || !tilesetImage) return;

    const paletteCanvas = dom.tilemapPaletteCanvas;
    const rect = paletteCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const tileX = Math.floor(x / currentMapAsset.tileWidth);
    const tileY = Math.floor(y / currentMapAsset.tileHeight);

    const tilesetCols = Math.floor(paletteCanvas.width / currentMapAsset.tileWidth);
    selectedTileIndex = tileY * tilesetCols + tileX;

    console.log(`Selected tile index: ${selectedTileIndex}`);
}

async function onSave() {
    if (!currentMapHandle || !currentMapAsset) {
        window.Dialogs.showNotification('Error', 'No hay ningún mapa abierto para guardar.');
        return;
    }

    try {
        const writable = await currentMapHandle.createWritable();
        const jsonString = JSON.stringify(currentMapAsset, null, 2);
        await writable.write(jsonString);
        await writable.close();
        window.Dialogs.showNotification('Éxito', `Mapa '${currentMapHandle.name}' guardado.`);
    } catch (err) {
        console.error("Error al guardar el mapa:", err);
        window.Dialogs.showNotification('Error', 'No se pudo guardar el mapa.');
    }
}

async function loadTileset() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: 'Images', accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] } }],
            multiple: false,
        });

        const relativePath = await projectsDirHandle.resolve(fileHandle);
        if (!relativePath) {
            window.Dialogs.showNotification('Error', 'El tileset debe estar dentro de la carpeta del proyecto.');
            return;
        }

        currentMapAsset.tilesetPath = relativePath.join('/');

        const image = new Image();
        const url = URL.createObjectURL(await fileHandle.getFile());
        image.onload = () => {
            tilesetImage = image;
            const paletteCanvas = dom.tilemapPaletteCanvas;
            paletteCanvas.width = image.width;
            paletteCanvas.height = image.height;
            const ctx = paletteCanvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            console.log(`Tileset '${fileHandle.name}' cargado.`);
        };
        image.src = url;

    } catch (err) {
        console.error("Error al cargar el tileset:", err);
    }
}

export function initialize(dependencies) {
    dom = dependencies.dom;
    projectsDirHandle = dependencies.projectsDirHandle;
    console.log("Tilemap Editor Window Initialized.");

    dom.tilemapLoadTilesetBtn.addEventListener('click', loadTileset);
    dom.tilemapSaveBtn.addEventListener('click', onSave);
    dom.tilemapPaletteCanvas.addEventListener('click', selectTile);

    // Brush Tools
    dom.toolPencilBtn.addEventListener('click', () => setActiveTool('pencil'));
    dom.toolBucketBtn.addEventListener('click', () => setActiveTool('bucket'));
    dom.toolRectBtn.addEventListener('click', () => setActiveTool('rect'));

    // Set initial active tool
    setActiveTool('pencil');

    dom.tilemapCollisionModeBtn.addEventListener('click', () => {
        editMode = editMode === 'tiles' ? 'collision' : 'tiles';
        dom.tilemapCollisionModeBtn.classList.toggle('active', editMode === 'collision');
        console.log(`Tilemap editor mode switched to: ${editMode}`);
        drawMap(); // Redraw to show/hide collision overlay
    });
    dom.tilemapAddLayerBtn.addEventListener('click', () => {
        if (!currentMapAsset) return;
        const layerName = prompt("Nombre de la nueva capa:", `Capa ${currentMapAsset.layers.length + 1}`);
        if (layerName) {
            currentMapAsset.layers.push({
                name: layerName,
                tiles: Array(currentMapAsset.width * currentMapAsset.height).fill(-1)
            });
            activeLayerIndex = currentMapAsset.layers.length - 1;
            renderLayerList();
        }
    });
    dom.tilemapRemoveLayerBtn.addEventListener('click', () => {
        if (!currentMapAsset || currentMapAsset.layers.length <= 1) {
            window.Dialogs.showNotification('Acción no permitida', 'No se puede eliminar la última capa.');
            return;
        }
        window.Dialogs.showConfirmation(
            'Confirmar Eliminación',
            `¿Estás seguro de que quieres eliminar la capa '${currentMapAsset.layers[activeLayerIndex].name}'?`,
            () => {
                currentMapAsset.layers.splice(activeLayerIndex, 1);
                if (activeLayerIndex >= currentMapAsset.layers.length) {
                    activeLayerIndex = currentMapAsset.layers.length - 1;
                }
                renderLayerList();
                drawMap();
            }
        );
    });

    dom.tilemapCanvas.addEventListener('mousedown', (e) => {
        isPainting = true;
        const canvas = dom.tilemapCanvas;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const tileX = Math.floor(x / currentMapAsset.tileWidth);
        const tileY = Math.floor(y / currentMapAsset.tileHeight);
        const activeLayer = currentMapAsset.layers[activeLayerIndex];

        if (activeTool === 'bucket' && activeLayer) {
            const targetTile = activeLayer.tiles[tileY * currentMapAsset.width + tileX];
            floodFill(activeLayer, tileX, tileY, targetTile, selectedTileIndex);
            drawMap();
            isPainting = false; // Bucket is a single-click action
        } else if (activeTool === 'rect') {
            rectStartPos = { x, y };
        } else {
             handleMapPaint(e);
        }
    });

    dom.tilemapCanvas.addEventListener('mousemove', handleMapPaint);
    dom.tilemapCanvas.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('mouseup', (e) => {
        if (isPainting && activeTool === 'rect' && rectStartPos) {
            const canvas = dom.tilemapCanvas;
            const rect = canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            const startTileX = Math.floor(rectStartPos.x / currentMapAsset.tileWidth);
            const startTileY = Math.floor(rectStartPos.y / currentMapAsset.tileHeight);
            const endTileX = Math.floor(endX / currentMapAsset.tileWidth);
            const endTileY = Math.floor(endY / currentMapAsset.tileHeight);

            const activeLayer = currentMapAsset.layers[activeLayerIndex];
            if(activeLayer) {
                fillRect(activeLayer, startTileX, startTileY, endTileX, endTileY, selectedTileIndex);
            }
        }
        isPainting = false;
        rectStartPos = null;
        drawMap(); // Final redraw to clean up preview
    });
    dom.tilemapEditorPanel.addEventListener('mouseleave', () => {
        isPainting = false;
    });
}

export async function openMap(fileHandle, mapData) {
    currentMapAsset = mapData;
    currentMapHandle = fileHandle;
    tilesetImage = null;
    editMode = 'tiles'; // Default to tile painting mode
    activeLayerIndex = 0;
    dom.tilemapCollisionModeBtn.classList.remove('active');


    dom.tilemapEditorPanel.classList.remove('hidden');
    dom.currentTilemapName.textContent = fileHandle.name;
    console.log(`Opening map: ${fileHandle.name}`);

    // Ensure collisionData exists and has the correct length for older maps
    const mapSize = mapData.width * mapData.height;
    if (!mapData.collisionData || mapData.collisionData.length !== mapSize) {
        mapData.collisionData = Array(mapSize).fill(0);
    }
    // Ensure layers structure exists for older maps
    if (!mapData.layers) {
        mapData.layers = [{ name: 'Capa Base', tiles: mapData.tiles || Array(mapSize).fill(-1) }];
        delete mapData.tiles;
    }

    if (mapData.tilesetPath) {
        try {
            // This logic is a bit tricky because we might not have a full path.
            // A better system would store asset UUIDs, but for now we'll try to resolve it.
            let handle;
            try {
                 handle = await projectsDirHandle.getFileHandle(mapData.tilesetPath, { create: false });
            } catch(e) {
                // Fallback for simple names, look in current directory
                const dir = await projectsDirHandle.getDirectoryHandle('Assets');
                handle = await dir.getFileHandle(mapData.tilesetPath.split('/').pop());
            }

            const image = new Image();
            const url = URL.createObjectURL(await handle.getFile());
            image.onload = () => {
                tilesetImage = image;
                const paletteCanvas = dom.tilemapPaletteCanvas;
                paletteCanvas.width = image.width;
                paletteCanvas.height = image.height;
                const ctx = paletteCanvas.getContext('2d');
                ctx.drawImage(image, 0, 0);
                drawMap();
            };
            image.src = url;
        } catch (err) {
            console.error(`No se pudo cargar el tileset para el mapa '${fileHandle.name}': ${err}`);
            drawMap(); // Draw the map anyway, just without tiles
        }
    } else {
        drawMap(); // Draw empty map
    }
}
