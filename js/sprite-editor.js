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
        // Lógica para mostrar/ocultar el panel desde el menú principal
        const menuButton = document.getElementById('menu-window-sprite-editor');
        if (menuButton) {
            menuButton.addEventListener('click', () => this.panel.classList.remove('hidden'));
        }

        const closeButton = this.panel.querySelector('.close-panel-btn');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.panel.classList.add('hidden'));
        }

        // Lógica para los botones de la barra de herramientas
        document.getElementById('sprite-editor-select-image-btn').addEventListener('click', () => this.loadImage());
        document.getElementById('sprite-editor-save-btn').addEventListener('click', () => this.saveSpriteSheet());
        document.getElementById('sprite-editor-delete-slice-btn').addEventListener('click', () => this.deleteSelectedSprite());

        // Conectar los campos de propiedades
        const propInputs = this.propertiesView.querySelectorAll('input');
        propInputs.forEach(input => {
            input.addEventListener('change', () => this.updateSpriteFromProperties());
        });

        console.log("Sprite Editor UI Initialized");
    }

    deleteSelectedSprite() {
        if (!this.selectedSpriteName || !this.activeSpriteSheet) return;

        if (confirm(`¿Estás seguro de que quieres eliminar el sprite "${this.selectedSpriteName}"?`)) {
            this.activeSpriteSheet.removeSprite(this.selectedSpriteName);
            this.selectedSpriteName = null;
            this.propertiesView.classList.add('hidden');
            this.updateSpriteList();
            this.draw();
        }
    }

    initCanvasEvents() {
        let isDrawing = false;
        let startX, startY;

        this.canvas.addEventListener('mousedown', (e) => {
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

            if (width > 0 && height > 0) {
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
        if (!this.activeSpriteSheet) return;

        for (const spriteName in this.activeSpriteSheet.sprites) {
            const item = document.createElement('div');
            item.className = 'sprite-list-item';
            item.textContent = spriteName;
            item.dataset.spriteName = spriteName;
            if (spriteName === this.selectedSpriteName) {
                item.classList.add('selected');
            }
            item.addEventListener('click', () => this.selectSprite(spriteName));
            listContainer.appendChild(item);
        }
    }

    selectSprite(spriteName) {
        this.selectedSpriteName = spriteName;
        this.updateSpriteList();
        this.populateProperties();
        this.draw();
    }

    populateProperties() {
        if (!this.selectedSpriteName || !this.activeSpriteSheet) {
            this.propertiesView.classList.add('hidden');
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

        this.propertiesView.classList.remove('hidden');
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
                this.activeSpriteSheet.removeSprite(sprite.name);
                sprite.name = newName;
                this.activeSpriteSheet.addSprite(sprite);
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