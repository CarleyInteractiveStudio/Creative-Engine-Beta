import { SpriteData, SpriteSheet } from './sprite.js';

class SpriteEditor {
    constructor() {
        this.panel = document.getElementById('sprite-editor-panel');
        this.canvas = document.getElementById('sprite-editor-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.propertiesView = document.getElementById('sprite-properties-view');
        this.overlay = document.getElementById('sprite-editor-panel-overlay');
        this.spriteListName = document.getElementById('sprite-editor-image-name');

        this.activeSpriteSheet = null;
        this.loadedImage = null;
        this.selectedSpriteName = null;

        this.initUI();
        this.initCanvasEvents();
    }

    initUI() {
        // Lógica para los botones de la barra de herramientas
        document.getElementById('sprite-editor-select-image-btn').addEventListener('click', () => this.loadImage());
        document.getElementById('sprite-editor-save-btn').addEventListener('click', () => this.saveSpriteSheet());
        document.getElementById('sprite-editor-delete-slice-btn').addEventListener('click', () => this.deleteSelectedSprite());
        document.getElementById('sprite-editor-auto-slice-btn').addEventListener('click', () => this.autoSliceByGrid());
        document.getElementById('sprite-editor-show-properties-btn').addEventListener('click', () => this.togglePropertiesVisibility());


        // Conectar los campos de propiedades
        const propInputs = this.propertiesView.querySelectorAll('input');
        propInputs.forEach(input => {
            input.addEventListener('change', () => this.updateSpriteFromProperties());
        });

        console.log("Sprite Editor UI Initialized");
    }

    togglePropertiesVisibility() {
        if (!this.selectedSpriteName) return;
        const propsFields = document.getElementById('sprite-properties-fields');
        const isHidden = propsFields.classList.contains('hidden');
        if (isHidden) {
            this.populateProperties();
            propsFields.classList.remove('hidden');
        } else {
            propsFields.classList.add('hidden');
        }
    }

    deleteSelectedSprite() {
        if (!this.selectedSpriteName || !this.activeSpriteSheet) return;

        if (confirm(`¿Estás seguro de que quieres eliminar el sprite "${this.selectedSpriteName}"?`)) {
            this.activeSpriteSheet.removeSprite(this.selectedSpriteName);
            this.selectedSpriteName = null;
            this.updatePropertiesView(); // Usar nueva función
            this.updateSpriteList();
            this.draw();
        }
    }

    autoSliceByGrid() {
        if (!this.loadedImage || !this.activeSpriteSheet) {
            alert("Por favor, carga una imagen primero.");
            return;
        }

        const gridWidth = parseInt(document.getElementById('sprite-editor-grid-width').value, 10);
        const gridHeight = parseInt(document.getElementById('sprite-editor-grid-height').value, 10);

        if (isNaN(gridWidth) || isNaN(gridHeight) || gridWidth <= 0 || gridHeight <= 0) {
            alert("El ancho y alto de la cuadrícula deben ser números positivos.");
            return;
        }

        if (!confirm("Esto reemplazará los recortes actuales. ¿Deseas continuar?")) {
            return;
        }

        // 1. Clear existing sprites and selection
        this.activeSpriteSheet.sprites = {};
        this.selectedSpriteName = null;
        this.updatePropertiesView();

        // 2. Find all sprite islands
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const { width, height } = imageData;
        const visited = new Array(width * height).fill(false);
        const islands = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x);
                const alphaIndex = index * 4 + 3;

                if (imageData.data[alphaIndex] > 0 && !visited[index]) {
                    const island = this.findSpriteIsland(imageData, x, y, visited);
                    if (island.rect.width > 0 && island.rect.height > 0) {
                        islands.push(island.rect);
                    }
                }
            }
        }

        // 3. Subdivide each island into the grid
        let totalSprites = 0;
        const textureName = this.activeSpriteSheet.texturePath.split('.').slice(0, -1).join('.') || 'sprite';

        islands.forEach((islandRect) => {
            for (let y = islandRect.y; y < islandRect.y + islandRect.height; y += gridHeight) {
                for (let x = islandRect.x; x < islandRect.x + islandRect.width; x += gridWidth) {
                    const remainingWidth = islandRect.x + islandRect.width - x;
                    const remainingHeight = islandRect.y + islandRect.height - y;

                    // Only create a sprite if it's a full grid cell within the island
                    if (remainingWidth >= gridWidth && remainingHeight >= gridHeight) {
                        const spriteName = `${textureName}_${totalSprites}`;
                        const newSprite = new SpriteData(spriteName, x, y, gridWidth, gridHeight);
                        this.activeSpriteSheet.addSprite(newSprite);
                        totalSprites++;
                    }
                }
            }
        });

        console.log(`Recorte automático completado. Se encontraron ${islands.length} islas y se crearon ${totalSprites} sprites.`);
        this.updateSpriteList();
        this.draw();
    }

    findSpriteIsland(imageData, startX, startY, visited) {
        const { data, width, height } = imageData;
        const queue = [{ x: startX, y: startY }];
        let minX = startX, maxX = startX, minY = startY, maxY = startY;

        const startIndex = (startY * width + startX);
        if (visited[startIndex]) {
            return { rect: { x: 0, y: 0, width: 0, height: 0 }};
        }
        visited[startIndex] = true;

        let head = 0;
        while (head < queue.length) {
            const { x, y } = queue[head++];

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);

            const neighbors = [
                { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
                { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
            ];

            for (const neighbor of neighbors) {
                const nx = x + neighbor.dx;
                const ny = y + neighbor.dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIndex = ny * width + nx;
                    const nAlphaIndex = nIndex * 4 + 3;
                    if (data[nAlphaIndex] > 0 && !visited[nIndex]) {
                        visited[nIndex] = true;
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        return {
            rect: {
                x: minX,
                y: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1
            }
        };
    }

    initCanvasEvents() {
        let isDrawing = false;
        let startX, startY;

        this.canvas.addEventListener('mousedown', (e) => {
            // Deselect sprite if clicking on empty canvas space
            if (e.target === this.canvas) {
                this.selectSprite(null);
            }
            if (!this.activeSpriteSheet) return;

            isDrawing = true;
            const rect = this.canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;
            this.draw(); // Redraw base image and existing rects
            const rect = this.canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            this.ctx.strokeStyle = 'lime';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (!isDrawing) return;
            isDrawing = false;

            const rect = this.canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;

            const x = Math.min(startX, endX);
            const y = Math.min(startY, endY);
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);

            if (width > 2 && height > 2) { // Avoid creating tiny sprites on mis-click
                this.addNewSprite(x, y, width, height);
            }
        });
    }

    addNewSprite(x, y, width, height) {
        if (!this.activeSpriteSheet) return;
        const spriteName = `sprite_${Object.keys(this.activeSpriteSheet.sprites).length}`;
        const newSprite = new SpriteData(spriteName, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
        this.activeSpriteSheet.addSprite(newSprite);
        this.updateSpriteList();
        this.selectSprite(spriteName);
        this.draw();
    }

    updateSpriteList() {
        const listContainer = document.getElementById('sprite-list');
        listContainer.innerHTML = '';
        if (!this.activeSpriteSheet || !this.loadedImage) return;

        // Crear un canvas temporal para extraer las imágenes de los sprites
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        for (const spriteName in this.activeSpriteSheet.sprites) {
            const sprite = this.activeSpriteSheet.getSprite(spriteName);

            // Crear el contenedor de la cuadrícula
            const item = document.createElement('div');
            item.className = 'sprite-grid-item';
            item.title = spriteName;
            if (spriteName === this.selectedSpriteName) {
                item.classList.add('selected');
            }

            // Crear la imagen de previsualización
            const img = document.createElement('img');

            // Extraer la imagen del sprite usando el canvas temporal
            tempCanvas.width = sprite.rect.width;
            tempCanvas.height = sprite.rect.height;
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(
                this.loadedImage,
                sprite.rect.x, sprite.rect.y, sprite.rect.width, sprite.rect.height,
                0, 0, tempCanvas.width, tempCanvas.height
            );
            img.src = tempCanvas.toDataURL();

            item.appendChild(img);
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que el evento llegue al canvas y deseleccione
                this.selectSprite(spriteName)
            });
            listContainer.appendChild(item);
        }
    }

    selectSprite(spriteName) {
        this.selectedSpriteName = spriteName;
        this.updateSpriteList();
        this.updatePropertiesView(); // Usar nueva función para gestionar la visibilidad
        this.draw();
    }

    updatePropertiesView() {
        const propertiesContainer = document.getElementById('sprite-properties-view');
        const showPropsBtn = document.getElementById('sprite-editor-show-properties-btn');
        const propsFields = document.getElementById('sprite-properties-fields');

        if (!this.selectedSpriteName) {
            // Ocultar todo si no hay ningún sprite seleccionado
            propertiesContainer.classList.add('hidden');
            showPropsBtn.classList.add('hidden');
            propsFields.classList.add('hidden');
        } else {
            // Si hay un sprite seleccionado, mostrar el contenedor y el botón
            propertiesContainer.classList.remove('hidden');
            showPropsBtn.classList.remove('hidden');
            // Mantener los campos de propiedades ocultos por defecto
            propsFields.classList.add('hidden');
        }
    }


    populateProperties() {
        if (!this.selectedSpriteName || !this.activeSpriteSheet) {
            this.updatePropertiesView(); // Llama a la función principal para ocultar todo
            return;
        }

        const sprite = this.activeSpriteSheet.getSprite(this.selectedSpriteName);
        if (!sprite) return;

        document.getElementById('sprite-prop-name').value = sprite.name;
        document.getElementById('sprite-prop-rect-x').value = sprite.rect.x;
        document.getElementById('sprite-prop-rect-y').value = sprite.rect.y;
        document.getElementById('sprite-prop-rect-w').value = sprite.rect.width;
        document.getElementById('sprite-prop-rect-h').value = sprite.rect.height;
        document.getElementById('sprite-prop-pivot-x').value = sprite.pivot.x;
        document.getElementById('sprite-prop-pivot-y').value = sprite.pivot.y;

        // No es necesario gestionar la visibilidad aquí, ya se hace en togglePropertiesVisibility
    }

    updateSpriteFromProperties() {
        if (!this.selectedSpriteName || !this.activeSpriteSheet) return;

        const sprite = this.activeSpriteSheet.getSprite(this.selectedSpriteName);
        if (!sprite) return;

        // Update rect
        sprite.rect.x = parseInt(document.getElementById('sprite-prop-rect-x').value, 10);
        sprite.rect.y = parseInt(document.getElementById('sprite-prop-rect-y').value, 10);
        sprite.rect.width = parseInt(document.getElementById('sprite-prop-rect-w').value, 10);
        sprite.rect.height = parseInt(document.getElementById('sprite-prop-rect-h').value, 10);

        // Update pivot
        sprite.pivot.x = parseFloat(document.getElementById('sprite-prop-pivot-x').value);
        sprite.pivot.y = parseFloat(document.getElementById('sprite-prop-pivot-y').value);

        // Handle name change
        const newName = document.getElementById('sprite-prop-name').value;
        if (newName !== sprite.name) {
            if (this.activeSpriteSheet.sprites[newName]) {
                alert(`El nombre "${newName}" ya existe. Por favor, elige otro.`);
                document.getElementById('sprite-prop-name').value = sprite.name; // Revert
            } else {
                // Preservar la selección actual
                const oldSpriteData = { ...sprite };
                this.activeSpriteSheet.removeSprite(sprite.name);
                oldSpriteData.name = newName;
                const newSprite = new SpriteData(oldSpriteData.name, oldSpriteData.rect.x, oldSpriteData.rect.y, oldSpriteData.rect.width, oldSpriteData.rect.height, oldSpriteData.pivot.x, oldSpriteData.pivot.y);
                this.activeSpriteSheet.addSprite(newSprite);
                this.selectedSpriteName = newName;
                this.updateSpriteList();
            }
        }

        this.draw();
    }

    loadImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png, image/jpeg';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                this.loadedImage = new Image();
                this.loadedImage.onload = () => {
                    // Limpia el estado anterior
                    this.selectedSpriteName = null;
                    this.propertiesView.classList.add('hidden');

                    // Configura el nuevo spritesheet
                    this.activeSpriteSheet = new SpriteSheet(file.name);
                    this.spriteListName.textContent = file.name;
                    this.canvas.width = this.loadedImage.width;
                    this.canvas.height = this.loadedImage.height;
                    this.overlay.classList.add('hidden');
                    this.draw();
                    this.updateSpriteList();
                };
                this.loadedImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    async openWithImageFile(imageFileHandle, dirHandle) {
        const file = await imageFileHandle.getFile();
        if (!file) return;

        this.panel.classList.remove('hidden');

        // Try to load corresponding .json metadata file
        let spriteSheetData = null;
        const metaFileName = file.name.replace(/\.(png|jpg|jpeg|webp)$/, '.json');
        try {
            const metaFileHandle = await dirHandle.getFileHandle(metaFileName);
            const metaFile = await metaFileHandle.getFile();
            const jsonText = await metaFile.text();
            spriteSheetData = SpriteSheet.fromJson(jsonText);
            console.log(`Loaded sprite sheet data for: ${file.name}`);
        } catch (error) {
            console.log(`No sprite sheet data found for ${file.name}. Creating new sheet.`);
            spriteSheetData = new SpriteSheet(file.name);
        }


        const reader = new FileReader();
        reader.onload = (event) => {
            this.loadedImage = new Image();
            this.loadedImage.onload = () => {
                this.selectedSpriteName = null;
                this.propertiesView.classList.add('hidden');

                this.activeSpriteSheet = spriteSheetData;
                this.activeSpriteSheet.texturePath = file.name; // Ensure path is correct
                this.spriteListName.textContent = file.name;
                this.canvas.width = this.loadedImage.width;
                this.canvas.height = this.loadedImage.height;
                this.overlay.classList.add('hidden');

                this.updateSpriteList();
                this.draw();
            };
            this.loadedImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    draw() {
        if (!this.loadedImage) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        };

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.loadedImage, 0, 0);

        // Dibujar los rectángulos de los sprites
        if (this.activeSpriteSheet) {
            for (const spriteName in this.activeSpriteSheet.sprites) {
                const sprite = this.activeSpriteSheet.getSprite(spriteName);
                this.ctx.strokeStyle = (spriteName === this.selectedSpriteName) ? 'yellow' : 'red';
                this.ctx.lineWidth = (spriteName === this.selectedSpriteName) ? 2 : 1;
                this.ctx.strokeRect(sprite.rect.x, sprite.rect.y, sprite.rect.width, sprite.rect.height);

                // Dibujar el pivote
                if (spriteName === this.selectedSpriteName) {
                    const pivotX = sprite.rect.x + sprite.rect.width * sprite.pivot.x;
                    const pivotY = sprite.rect.y + sprite.rect.height * sprite.pivot.y;
                    this.ctx.fillStyle = 'yellow';
                    this.ctx.beginPath();
                    this.ctx.arc(pivotX, pivotY, 4, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
            }
        }
    }

    saveSpriteSheet() {
        if (!this.activeSpriteSheet) {
            alert("No hay una hoja de sprites activa para guardar.");
            return;
        }

        const json = this.activeSpriteSheet.toJson();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');

        // Genera el nombre del archivo .json basado en el nombre de la imagen
        const textureName = this.activeSpriteSheet.texturePath;
        const baseName = textureName.substring(0, textureName.lastIndexOf('.'));
        const metaFileName = `${baseName}.json`;

        a.href = url;
        a.download = metaFileName;

        // Simula un clic para iniciar la descarga
        document.body.appendChild(a);
        a.click();

        // Limpia
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`Se han guardado los datos de los sprites. Asegúrate de colocar el archivo "${metaFileName}" en el mismo directorio que tu imagen.`);
    }
}

// Se instancia en editor.js cuando el DOM esté listo
export { SpriteEditor };