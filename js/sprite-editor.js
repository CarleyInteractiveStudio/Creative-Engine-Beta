import { SpriteData, SpriteSheet } from './sprite.js';

class SpriteEditor {
    constructor() {
        // --- DOM Elements ---
        this.panel = document.getElementById('sprite-editor-panel');
        this.canvas = document.getElementById('sprite-editor-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('sprite-editor-panel-overlay');
        this.spriteSheetNameLabel = document.getElementById('sprite-editor-image-name');

        this.rightPanel = document.getElementById('sprite-editor-right-panel');
        this.canvasContainer = document.getElementById('sprite-editor-canvas-container');
        this.resizer = document.getElementById('sprite-editor-resizer');
        this.reconstructionGrid = document.getElementById('reconstruction-grid');
        this.propertiesView = document.getElementById('sprite-properties-view');
        this.propertiesFields = document.getElementById('sprite-properties-fields');
        this.propertiesPlaceholder = document.getElementById('sprite-properties-placeholder');

        // --- State ---
        this.activeSpriteSheet = null;
        this.loadedImage = null;
        this.selectedSpriteName = null;
        this.currentAssetFileHandle = null;
        this.currentDirHandle = null;

        this.initUI();
    }

    initUI() {
        // Toolbar Buttons
        document.getElementById('sprite-editor-select-image-btn').addEventListener('click', () => this.loadNewImage());
        document.getElementById('sprite-editor-save-btn').addEventListener('click', () => this.saveSpriteSheet());
        document.getElementById('sprite-editor-auto-slice-btn').addEventListener('click', () => this.autoSlice());
        document.getElementById('sprite-editor-add-slice-btn').addEventListener('click', () => this.addManualSlice());

        // Properties
        document.getElementById('sprite-editor-delete-slice-btn').addEventListener('click', () => this.deleteSelectedSprite());
        this.propertiesFields.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => this.updateSpriteFromProperties());
        });

        // Resizer Logic
        this.resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMouseMove = (moveEvent) => {
                const containerRect = this.panel.getBoundingClientRect();
                const newLeftWidth = moveEvent.clientX - containerRect.left;
                const newRightWidth = containerRect.right - moveEvent.clientX;

                if (newLeftWidth > 200 && newRightWidth > 250) {
                    this.canvasContainer.style.flex = `0 1 ${newLeftWidth}px`;
                    this.rightPanel.style.flex = `0 1 ${newRightWidth}px`;
                }
            };

            const onMouseUp = () => {
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    // --- Slicing Algorithms ---

    /**
     * Finds the bounding box of the very first contiguous group of non-transparent pixels
     * within a given area (the "island"). This is used to determine the grid size in precise mode.
     */
    findFirstSpriteBounds(imageData, islandRect) {
        const { data, width: totalWidth } = imageData;
        const visited = new Set();

        for (let y = islandRect.y; y < islandRect.y + islandRect.height; y++) {
            for (let x = islandRect.x; x < islandRect.x + islandRect.width; x++) {
                const index = y * totalWidth + x;
                // Find the first non-transparent pixel that hasn't been visited yet
                if (data[index * 4 + 3] > 0) {
                    // This is the top-left of our first sprite, now find its bounds
                    const queue = [{ x, y }];
                    visited.add(`${x},${y}`);
                    let minX = x, maxX = x, minY = y, maxY = y;

                    let head = 0;
                    while(head < queue.length) {
                        const current = queue[head++];
                        minX = Math.min(minX, current.x);
                        maxX = Math.max(maxX, current.x);
                        minY = Math.min(minY, current.y);
                        maxY = Math.max(maxY, current.y);

                        const neighbors = [{dx: 0, dy: 1}, {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: -1, dy: 0}];
                        for(const n of neighbors) {
                            const nx = current.x + n.dx;
                            const ny = current.y + n.dy;
                            const nKey = `${nx},${ny}`;

                            // Stay within the original image bounds
                            if(nx >= 0 && nx < totalWidth && ny >= 0 && ny < imageData.height && !visited.has(nKey)) {
                                const nIndex = ny * totalWidth + nx;
                                if (data[nIndex * 4 + 3] > 0) {
                                    visited.add(nKey);
                                    queue.push({x: nx, y: ny});
                                }
                            }
                        }
                    }
                    return { width: (maxX - minX) + 1, height: (maxY - minY) + 1 };
                }
            }
        }
        return null; // No sprite found in the island
    }

    /**
     * Finds the bounding box of a large group of pixels, ignoring internal transparency.
     * This is used to find the main "islands" of sprites on the sheet.
     */
    findPixelIsland(imageData, startX, startY, visited) {
        const { data, width, height } = imageData;
        const queue = [{ x: startX, y: startY }];
        let minX = startX, maxX = startX, minY = startY, maxY = startY;

        const startIndex = startY * width + startX;
        if (visited[startIndex]) return null;
        visited[startIndex] = true;

        let head = 0;
        while (head < queue.length) {
            const { x, y } = queue[head++];
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);

            // Check 8 directions for more robust island detection
            for(let dy = -1; dy <= 1; dy++) {
                for(let dx = -1; dx <= 1; dx++) {
                    if(dx === 0 && dy === 0) continue;

                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIndex = ny * width + nx;
                        if (data[nIndex * 4 + 3] > 0 && !visited[nIndex]) {
                            visited[nIndex] = true;
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }
            }
        }
        return { x: minX, y: minY, width: (maxX - minX) + 1, height: (maxY - minY) + 1 };
    }

    /**
     * Main auto-slicing function.
     */
    autoSlice() {
        if (!this.loadedImage) {
            alert("Por favor, carga una imagen primero.");
            return;
        }

        if (!confirm("Esto reemplazará todos los recortes actuales. ¿Deseas continuar?")) {
            return;
        }

        const isPreciseMode = document.getElementById('sprite-editor-precise-mode').checked;
        const gridW = parseInt(document.getElementById('sprite-editor-grid-width').value, 10);
        const gridH = parseInt(document.getElementById('sprite-editor-grid-height').value, 10);

        if (!isPreciseMode && (isNaN(gridW) || isNaN(gridH) || gridW <= 0 || gridH <= 0)) {
            alert("En modo rejilla, el ancho y alto deben ser números positivos.");
            return;
        }

        this.activeSpriteSheet.clear();
        this.selectSprite(null);

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const visitedIslands = new Array(imageData.width * imageData.height).fill(false);
        const textureBaseName = this.activeSpriteSheet.texturePath.split('.').slice(0, -1).join('.') || 'sprite';
        let spriteCounter = 0;

        // 1. Find all top-level pixel islands
        const islands = [];
        for (let y = 0; y < imageData.height; y++) {
            for (let x = 0; x < imageData.width; x++) {
                if (imageData.data[(y * imageData.width + x) * 4 + 3] > 0 && !visitedIslands[y * imageData.width + x]) {
                    const islandRect = this.findPixelIsland(imageData, x, y, visitedIslands);
                    if (islandRect) {
                        islands.push(islandRect);
                    }
                }
            }
        }

        // 2. Process each island
        islands.forEach((islandRect, index) => {
            const groupName = `Grupo_${index}`;
            this.activeSpriteSheet.addGroup(groupName, islandRect);

            let sliceW, sliceH;

            if (isPreciseMode) {
                // --- PRECISE MODE ---
                const firstSpriteBounds = this.findFirstSpriteBounds(imageData, islandRect);
                if (firstSpriteBounds) {
                    sliceW = firstSpriteBounds.width;
                    sliceH = firstSpriteBounds.height;
                    console.log(`Modo Preciso para ${groupName}: Tamaño de sprite detectado -> ${sliceW}x${sliceH}`);
                } else {
                    // Fallback if no sprite is found in the island
                    sliceW = islandRect.width;
                    sliceH = islandRect.height;
                }
            } else {
                // --- GRID MODE ---
                sliceW = gridW;
                sliceH = gridH;
            }

            spriteCounter = this.sliceAreaByGrid(islandRect, sliceW, sliceH, groupName, textureBaseName, spriteCounter);
        });

        this.renderReconstructionView();
        this.draw();
    }

    sliceAreaByGrid(areaRect, gridW, gridH, groupName, baseName, counter) {
        let currentCount = counter;
        for (let y = areaRect.y; y < areaRect.y + areaRect.height; y += gridH) {
            for (let x = areaRect.x; x < areaRect.x + areaRect.width; x += gridW) {
                const actualW = Math.min(gridW, (areaRect.x + areaRect.width) - x);
                const actualH = Math.min(gridH, (areaRect.y + areaRect.height) - y);

                if (actualW > 0 && actualH > 0) {
                     // Check if the tile is empty before adding
                    const tileImageData = this.ctx.getImageData(x, y, actualW, actualH);
                    const hasPixels = Array.from(tileImageData.data).some((val, i) => (i + 1) % 4 === 0 && val > 0);

                    if (hasPixels) {
                        const spriteName = `${baseName}_${currentCount++}`;
                        const newSprite = new SpriteData(spriteName, x, y, actualW, actualH);
                        this.activeSpriteSheet.addSprite(newSprite, groupName);
                    }
                }
            }
        }
        return currentCount; // Return updated counter
    }

    // --- UI Rendering & Interaction ---

    renderReconstructionView() {
        this.reconstructionGrid.innerHTML = '';
        if (!this.activeSpriteSheet || !this.loadedImage) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        for (const groupName in this.activeSpriteSheet.groups) {
            const group = this.activeSpriteSheet.groups[groupName];
            if (Object.keys(group.sprites).length === 0) continue;

            const groupContainer = document.createElement('div');
            groupContainer.className = 'reconstruction-group';

            const title = document.createElement('h5');
            title.textContent = groupName;
            groupContainer.appendChild(title);

            const groupCanvas = document.createElement('div');
            groupCanvas.className = 'reconstruction-group-canvas';
            groupCanvas.style.width = '100%';
            groupCanvas.style.aspectRatio = `${group.rect.width} / ${group.rect.height}`;

            for (const spriteName in group.sprites) {
                const sprite = group.sprites[spriteName];

                tempCanvas.width = sprite.rect.width;
                tempCanvas.height = sprite.rect.height;
                tempCtx.clearRect(0,0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(this.loadedImage, sprite.rect.x, sprite.rect.y, sprite.rect.width, sprite.rect.height, 0, 0, sprite.rect.width, sprite.rect.height);

                const tile = document.createElement('div');
                tile.className = 'reconstruction-tile';
                tile.dataset.spriteName = spriteName;

                tile.style.left = `${((sprite.rect.x - group.rect.x) / group.rect.width) * 100}%`;
                tile.style.top = `${((sprite.rect.y - group.rect.y) / group.rect.height) * 100}%`;
                tile.style.width = `${(sprite.rect.width / group.rect.width) * 100}%`;
                tile.style.height = `${(sprite.rect.height / group.rect.height) * 100}%`;
                tile.style.backgroundImage = `url(${tempCanvas.toDataURL()})`;

                tile.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectSprite(spriteName);
                });
                groupCanvas.appendChild(tile);
            }
            groupContainer.appendChild(groupCanvas);
            this.reconstructionGrid.appendChild(groupContainer);
        }
    }

    selectSprite(spriteName) {
        if (this.selectedSpriteName === spriteName) return;
        this.selectedSpriteName = spriteName;
        this.reconstructionGrid.querySelectorAll('.reconstruction-tile').forEach(tile => {
            tile.classList.toggle('selected', tile.dataset.spriteName === spriteName);
        });
        this.updatePropertiesView();
        this.draw();
    }

    updatePropertiesView() {
        if (this.selectedSpriteName) {
            this.propertiesPlaceholder.classList.add('hidden');
            this.propertiesFields.classList.remove('hidden');
            this.populateProperties();
        } else {
            this.propertiesPlaceholder.classList.remove('hidden');
            this.propertiesFields.classList.add('hidden');
        }
    }

    populateProperties() {
        const sprite = this.activeSpriteSheet.getSprite(this.selectedSpriteName);
        if (!sprite) return;
        document.getElementById('sprite-prop-name').value = sprite.name;
        document.getElementById('sprite-prop-rect-x').value = sprite.rect.x;
        document.getElementById('sprite-prop-rect-y').value = sprite.rect.y;
        document.getElementById('sprite-prop-rect-w').value = sprite.rect.width;
        document.getElementById('sprite-prop-rect-h').value = sprite.rect.height;
        document.getElementById('sprite-prop-pivot-x').value = sprite.pivot.x;
        document.getElementById('sprite-prop-pivot-y').value = sprite.pivot.y;
    }

    updateSpriteFromProperties() {
        const sprite = this.activeSpriteSheet.getSprite(this.selectedSpriteName);
        if (!sprite) return;
        sprite.pivot.x = parseFloat(document.getElementById('sprite-prop-pivot-x').value);
        sprite.pivot.y = parseFloat(document.getElementById('sprite-prop-pivot-y').value);
        const newName = document.getElementById('sprite-prop-name').value.trim();
        if (newName !== sprite.name) {
            if (this.activeSpriteSheet.getSprite(newName)) {
                alert(`El nombre "${newName}" ya existe.`);
                document.getElementById('sprite-prop-name').value = sprite.name;
            } else {
                this.activeSpriteSheet.renameSprite(sprite.name, newName);
                this.selectedSpriteName = newName;
                this.renderReconstructionView();
                this.selectSprite(newName);
            }
        }
        this.draw();
    }

    deleteSelectedSprite() {
        if (!this.selectedSpriteName) return;
        if (confirm(`¿Estás seguro de que quieres eliminar el sprite "${this.selectedSpriteName}"?`)) {
            this.activeSpriteSheet.removeSprite(this.selectedSpriteName);
            this.renderReconstructionView();
            this.selectSprite(null);
        }
    }

    addManualSlice() {
        alert("Funcionalidad de recorte manual no implementada en esta versión.");
    }

    // --- Canvas Drawing ---

    draw() {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.loadedImage) {
            this.ctx.drawImage(this.loadedImage, 0, 0);
        }
        if (this.activeSpriteSheet) {
            this.ctx.strokeStyle = 'rgba(255, 105, 180, 0.75)';
            this.ctx.lineWidth = 1;
            for (const groupName in this.activeSpriteSheet.groups) {
                const group = this.activeSpriteSheet.groups[groupName];
                this.ctx.strokeRect(group.rect.x, group.rect.y, group.rect.width, group.rect.height);
            }
        }
        if (this.selectedSpriteName) {
            const sprite = this.activeSpriteSheet.getSprite(this.selectedSpriteName);
            if (sprite) {
                this.ctx.strokeStyle = 'yellow';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(sprite.rect.x, sprite.rect.y, sprite.rect.width, sprite.rect.height);
            }
        }
        this.ctx.restore();
    }

    // --- File Handling ---

    async openWithImageFile(imageFileHandle, dirHandle) {
        const file = await imageFileHandle.getFile();
        if (!file) return;

        this.currentAssetFileHandle = imageFileHandle;
        this.currentDirHandle = dirHandle;
        this.panel.classList.remove('hidden');

        let spriteSheetData = null;
        const metaFileName = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '.json');
        try {
            const metaFileHandle = await dirHandle.getFileHandle(metaFileName);
            const metaFile = await metaFileHandle.getFile();
            spriteSheetData = SpriteSheet.fromJson(await metaFile.text());
        } catch (error) {
            spriteSheetData = new SpriteSheet(file.name);
        }

        this.loadedImage = new Image();
        this.loadedImage.onload = () => {
            this.activeSpriteSheet = spriteSheetData;
            this.spriteSheetNameLabel.textContent = file.name;
            this.canvas.width = this.loadedImage.width;
            this.canvas.height = this.loadedImage.height;
            this.overlay.classList.add('hidden');
            this.selectSprite(null);
            this.renderReconstructionView();
            this.draw();
        };
        this.loadedImage.onerror = () => {
            alert("No se pudo cargar el archivo de imagen.");
            this.reset();
        };
        this.loadedImage.src = URL.createObjectURL(file);
    }

    async saveSpriteSheet() {
        if (!this.activeSpriteSheet || !this.currentDirHandle || !this.currentAssetFileHandle) {
            alert("No hay una hoja de sprites activa o válida para guardar.");
            return;
        }
        try {
            const metaFileName = this.activeSpriteSheet.texturePath.replace(/\.(png|jpg|jpeg|webp)$/i, '.json');
            const metaFileHandle = await this.currentDirHandle.getFileHandle(metaFileName, { create: true });
            const writable = await metaFileHandle.createWritable();
            await writable.write(this.activeSpriteSheet.toJson());
            await writable.close();
            alert(`Datos de sprite guardados en ${metaFileName}`);
        } catch (error) {
            console.error("Error al guardar la hoja de sprites:", error);
            alert("Ocurrió un error al guardar los datos del sprite.");
        }
    }

    async loadNewImage() {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{ description: 'Images', accept: { 'image/*': ['.png', '.jpeg', '.jpg', '.webp'] } }]
            });
            const file = await fileHandle.getFile();
            this.currentDirHandle = null;
            this.currentAssetFileHandle = fileHandle;

            this.loadedImage = new Image();
            this.loadedImage.onload = () => {
                this.activeSpriteSheet = new SpriteSheet(file.name);
                this.spriteSheetNameLabel.textContent = file.name;
                this.canvas.width = this.loadedImage.width;
                this.canvas.height = this.loadedImage.height;
                this.overlay.classList.add('hidden');
                this.selectSprite(null);
                this.renderReconstructionView();
                this.draw();
            };
            this.loadedImage.src = URL.createObjectURL(file);
        } catch (e) {
            console.log("Selector de archivos cancelado.");
        }
    }

    reset() {
        this.panel.classList.add('hidden');
        this.overlay.classList.remove('hidden');
        this.activeSpriteSheet = null;
        this.loadedImage = null;
        this.selectedSpriteName = null;
        this.currentAssetFileHandle = null;
        this.currentDirHandle = null;
        this.reconstructionGrid.innerHTML = '';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

export { SpriteEditor };