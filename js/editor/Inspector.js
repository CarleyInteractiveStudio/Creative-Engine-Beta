// Inspector module
// This will contain all logic for the inspector panel.

// --- Imports ---
// Note: We need to pass references to classes like Transform, SpriteRenderer, etc.
// from the main editor script, or import them here if they are also modularized.
// For now, we assume they are globally available on `window` or passed in.

export class Inspector {
    constructor(editor) {
        this.editor = editor; // A reference to the main editor object
        this.dom = editor.dom;   // Reference to all cached DOM elements
        this.markdownConverter = editor.markdownConverter; // Get from the main editor

        // These will be initialized in the main script and passed to the inspector
        this.Transform = null;
        this.Rigidbody = null;
        this.BoxCollider = null;
        this.SpriteRenderer = null;
        this.UICanvas = null;
        this.UIText = null;
        this.UIButton = null;
        this.CreativeScript = null;
        this.Animator = null;
        this.Camera = null;

        this.availableComponents = null; // This will be set after classes are passed
    }

    // Call this after the main script has loaded the engine classes
    setEngineClasses(classes) {
        this.Transform = classes.Transform;
        this.Rigidbody = classes.Rigidbody;
        this.BoxCollider = classes.BoxCollider;
        this.SpriteRenderer = classes.SpriteRenderer;
        this.UICanvas = classes.UICanvas;
        this.UIText = classes.UIText;
        this.UIButton = classes.UIButton;
        this.CreativeScript = classes.CreativeScript;
        this.Animator = classes.Animator;
        this.Camera = classes.Camera;

        this.availableComponents = {
            'Renderizado': [this.SpriteRenderer],
            'Animación': [this.Animator],
            'Cámara': [this.Camera],
            'Físicas': [this.Rigidbody, this.BoxCollider],
            'UI': [this.UICanvas, this.UIText, this.UIButton],
            'Scripting': [this.CreativeScript]
        };
    }

    // Corresponds to the old `updateInspector`
    async update() {
        if (!this.dom.inspectorContent) return;
        this.dom.inspectorContent.innerHTML = '';

        const selectedMateria = this.editor.getSelectedMateria();
        if (!selectedMateria) {
            const selectedAsset = this.dom.assetGridView.querySelector('.grid-item.active');
            if (selectedAsset) {
                await this.updateForAsset(selectedAsset.dataset.name, selectedAsset.dataset.path);
            } else {
                this.dom.inspectorContent.innerHTML = '<p class="inspector-placeholder">Nada seleccionado</p>';
            }
            return;
        }

        // Name input
        this.dom.inspectorContent.innerHTML = `<label for="materia-name">Nombre</label><input type="text" id="materia-name" value="${selectedMateria.name}">`;

        // Components
        selectedMateria.leyes.forEach(ley => {
            this.dom.inspectorContent.innerHTML += this.getComponentHTML(ley);
        });

        // Add Component Button
        this.dom.inspectorContent.innerHTML += `<button id="add-component-btn" class="add-component-btn">Añadir Ley</button>`;

        // Add event listeners for the new inputs
        this.setupInspectorEventListeners(selectedMateria);
    }

    // Creates the HTML for a single component
    getComponentHTML(ley) {
        if (ley instanceof this.Transform) {
            return `<h4>Transform</h4>
            <div class="component-grid">
                <label>X</label><input type="number" class="prop-input" step="1" data-component="Transform" data-prop="x" value="${ley.x.toFixed(0)}">
                <label>Y</label><input type="number" class="prop-input" step="1" data-component="Transform" data-prop="y" value="${ley.y.toFixed(0)}">
                <label>Scale X</label><input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.x" value="${ley.scale.x.toFixed(1)}">
                <label>Scale Y</label><input type="number" class="prop-input" step="0.1" data-component="Transform" data-prop="scale.y" value="${ley.scale.y.toFixed(1)}">
            </div>`;
        } else if (ley instanceof this.Rigidbody) {
            return `<h4>Rigidbody</h4>
            <div class="component-grid">
                <label>Body Type</label>
                <select class="prop-input" data-component="Rigidbody" data-prop="bodyType">
                    <option value="dynamic" ${ley.bodyType === 'dynamic' ? 'selected' : ''}>Dynamic</option>
                    <option value="static" ${ley.bodyType === 'static' ? 'selected' : ''}>Static</option>
                    <option value="kinematic" ${ley.bodyType === 'kinematic' ? 'selected' : ''}>Kinematic</option>
                </select>
                <label>Mass</label><input type="number" class="prop-input" step="0.1" data-component="Rigidbody" data-prop="mass" value="${ley.mass}">
            </div>`;
        } else if (ley instanceof this.BoxCollider) {
            return `<h4>Box Collider</h4>
            <div class="component-grid">
                <label>Width</label><input type="number" class="prop-input" step="0.1" data-component="BoxCollider" data-prop="width" value="${ley.width}">
                <label>Height</label><input type="number" class="prop-input" step="0.1" data-component="BoxCollider" data-prop="height" value="${ley.height}">
            </div>`;
        } else if (ley instanceof this.SpriteRenderer) {
            const previewImg = ley.sprite.src ? `<img src="${ley.sprite.src}" alt="Preview">` : 'None';
            return `<h4>Sprite Renderer</h4>
            <div class="component-grid">
                <label>Sprite</label>
                <div class="sprite-dropper">
                    <div class="sprite-preview" data-component="SpriteRenderer" data-prop="source">${previewImg}</div>
                    <button class="sprite-select-btn" data-component="SpriteRenderer">🎯</button>
                </div>
                <label>Color</label><input type="color" class="prop-input" data-component="SpriteRenderer" data-prop="color" value="${ley.color}">
            </div>`;
        } else if (ley instanceof this.UICanvas) {
            return '<h4>UI Canvas</h4>';
        } else if (ley instanceof this.UIText) {
            return `<h4>UI Text</h4>
            <textarea class="prop-input" data-component="UIText" data-prop="text" rows="4">${ley.text}</textarea>
            <div class="text-transform-controls">
                <button class="prop-btn ${ley.textTransform === 'none' ? 'active' : ''}" data-component="UIText" data-prop="textTransform" data-value="none">aA</button>
                <button class="prop-btn ${ley.textTransform === 'uppercase' ? 'active' : ''}" data-component="UIText" data-prop="textTransform" data-value="uppercase">AA</button>
                <button class="prop-btn ${ley.textTransform === 'lowercase' ? 'active' : ''}" data-component="UIText" data-prop="textTransform" data-value="lowercase">aa</button>
            </div>
            <div class="component-grid">
                <label>Font Size</label><input type="number" class="prop-input" step="1" data-component="UIText" data-prop="fontSize" value="${ley.fontSize}">
                <label>Color</label><input type="color" class="prop-input" data-component="UIText" data-prop="color" value="${ley.color}">
            </div>`;
        } else if (ley instanceof this.UIButton) {
            return `<h4>UI Button</h4>
            <label>Etiqueta</label><input type="text" class="prop-input" data-component="UIButton" data-prop="label.text" value="${ley.label.text}">
            <label>Color</label><input type="color" class="prop-input" data-component="UIButton" data-prop="color" value="${ley.color}">`;
        } else if (ley instanceof this.CreativeScript) {
            return `<h4>Creative Script</h4><div class="component-item script">${ley.scriptName}</div>`;
        } else if (ley instanceof this.Animator) {
            return `<h4>Animator</h4>
            <p>Estado Actual: ${ley.currentState || 'Ninguno'}</p>
            <p>Asset de Animación: (Próximamente)</p>
            <button id="open-animator-btn">Abrir Editor de Animación</button>`;
        } else if (ley instanceof this.Camera) {
            return `<h4>Camera</h4>
            <div class="component-grid">
                <label>Orthographic Size</label>
                <input type="number" class="prop-input" step="10" data-component="Camera" data-prop="orthographicSize" value="${ley.orthographicSize}">
            </div>`;
        }
        return ''; // Return empty string for unknown components
    }

    // Corresponds to the old `updateInspectorForAsset`
    async updateForAsset(assetName, assetPath) {
        if (!assetName) {
            this.dom.inspectorContent.innerHTML = `<p class="inspector-placeholder">Selecciona un asset</p>`;
            return;
        }

        this.dom.inspectorContent.innerHTML = `<h4>Asset: ${assetName}</h4>`;

        try {
            const fileHandle = await this.editor.getAssetHandle(assetName);
            const file = await fileHandle.getFile();
            const content = await file.text();

            if (assetName.endsWith('.ces')) {
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.className = 'language-javascript';
                code.textContent = content;
                pre.appendChild(code);
                this.dom.inspectorContent.appendChild(pre);
            } else if (assetName.endsWith('.md')) {
                const html = this.markdownConverter.makeHtml(content);
                const preview = document.createElement('div');
                preview.className = 'markdown-preview';
                preview.innerHTML = html;
                this.dom.inspectorContent.appendChild(preview);
            } else if (assetName.endsWith('.png') || assetName.endsWith('.jpg')) {
                let metaData = { textureType: 'Sprite (2D and UI)' }; // Default
                try {
                    const metaFileHandle = await this.editor.getAssetHandle(`${assetName}.meta`);
                    const metaFile = await metaFileHandle.getFile();
                    metaData = JSON.parse(await metaFile.text());
                } catch (e) {
                    // Meta file doesn't exist, will be created on first change.
                }

                const settingsContainer = document.createElement('div');
                settingsContainer.className = 'asset-settings';
                settingsContainer.innerHTML = `
                    <label for="texture-type">Texture Type</label>
                    <select id="texture-type" data-asset-name="${assetName}">
                        <option value="Default" ${metaData.textureType === 'Default' ? 'selected' : ''}>Default</option>
                        <option value="Sprite (2D and UI)" ${metaData.textureType === 'Sprite (2D and UI)' ? 'selected' : ''}>Sprite (2D and UI)</option>
                        <option value="Normal Map" ${metaData.textureType === 'Normal Map' ? 'selected' : ''}>Normal Map</option>
                    </select>
                    <hr>
                    <div class="preview-container">
                        <img id="inspector-preview-img" src="" alt="Preview">
                    </div>
                `;
                this.dom.inspectorContent.appendChild(settingsContainer);
                const imgElement = document.getElementById('inspector-preview-img');
                if (imgElement && assetPath) {
                    const url = await this.editor.getURLForAssetPath(assetPath);
                    if (url) imgElement.src = url;
                }
            } else if (assetName.endsWith('.cea')) {
                // ... (logic for animation preview) ...
            } else {
                 this.dom.inspectorContent.innerHTML += `<p>No hay vista previa disponible para este tipo de archivo.</p>`;
            }

        } catch (error) {
            console.error(`Error al leer el asset '${assetName}':`, error);
            this.dom.inspectorContent.innerHTML += `<p class="error-message">No se pudo cargar el contenido del asset.</p>`;
        }
    }

    // Corresponds to the old `showAddComponentModal`
    showAddComponentModal() {
        const selectedMateria = this.editor.getSelectedMateria();
        if (!selectedMateria) return;
        this.dom.componentList.innerHTML = '';

        for (const category in this.availableComponents) {
            const categoryHeader = document.createElement('h4');
            categoryHeader.textContent = category;
            this.dom.componentList.appendChild(categoryHeader);

            this.availableComponents[category].forEach(ComponentClass => {
                if (selectedMateria.getComponent(ComponentClass)) {
                    return;
                }

                const componentItem = document.createElement('div');
                componentItem.className = 'component-item';
                componentItem.textContent = ComponentClass.name;
                componentItem.addEventListener('click', async () => {
                    if (ComponentClass === this.CreativeScript) {
                        let scriptName = prompt("Introduce el nombre del nuevo script (ej: PlayerMovement):");
                        if (scriptName) {
                            scriptName = scriptName.replace(/\.ces$/, '') + '.ces';
                            await this.editor.createScriptFile(scriptName, selectedMateria.name);
                            const newScript = new this.CreativeScript(selectedMateria, scriptName);
                            selectedMateria.addComponent(newScript);
                        }
                    } else {
                        selectedMateria.addComponent(new ComponentClass(selectedMateria));
                    }

                    this.dom.addComponentModal.style.display = 'none';
                    this.update();
                });
                this.dom.componentList.appendChild(componentItem);
            });
        }
        this.dom.addComponentModal.style.display = 'block';
    }

    // Central place to manage all event listeners for the inspector panel
    initializeEventListeners() {
        // Button delegation & Drag/Drop
        this.dom.inspectorPanel.addEventListener('click', (e) => {
            if (e.target.id === 'open-animator-btn') {
                this.dom.animationPanel.classList.remove('hidden');
            } else if (e.target.matches('.sprite-select-btn')) {
                this.editor.openSpriteSelector();
            } else if (e.target.id === 'add-component-btn') {
                this.showAddComponentModal();
            }
        });

        this.dom.inspectorPanel.addEventListener('dragover', (e) => {
            const dropTarget = e.target.closest('.sprite-preview');
            if (dropTarget) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                dropTarget.classList.add('drag-over');
            }
        });

        this.dom.inspectorPanel.addEventListener('dragleave', (e) => {
            const dropTarget = e.target.closest('.sprite-preview');
            if (dropTarget) {
                dropTarget.classList.remove('drag-over');
            }
        });

        this.dom.inspectorPanel.addEventListener('change', (e) => {
            if (e.target.id === 'texture-type') {
                const assetName = e.target.dataset.assetName;
                const newType = e.target.value;
                this.editor.saveAssetMeta(assetName, { textureType: newType });
            }
        });

        this.dom.inspectorPanel.addEventListener('drop', async (e) => {
            e.preventDefault();
            const dropTarget = e.target.closest('.sprite-preview');
            if (dropTarget) {
                dropTarget.classList.remove('drag-over');
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.path && (data.path.endsWith('.png') || data.path.endsWith('.jpg'))) {
                    const selectedMateria = this.editor.getSelectedMateria();
                    if (selectedMateria) {
                        const spriteRenderer = selectedMateria.getComponent(this.SpriteRenderer);
                        if (spriteRenderer) {
                            spriteRenderer.setSourcePath(data.path);
                            await spriteRenderer.loadSprite();
                            this.update();
                            this.editor.updateScene();
                        }
                    }
                } else {
                    alert("Solo se pueden asignar archivos .png o .jpg como sprites.");
                }
            }
        });

        // Disable context menu on inspector panel
        this.dom.inspectorPanel.addEventListener('contextmenu', e => e.preventDefault());
    }

    // Sets up listeners for dynamically created inspector content
    setupInspectorEventListeners(selectedMateria) {
        document.getElementById('materia-name').addEventListener('change', e => {
            if (selectedMateria) {
                selectedMateria.name = e.target.value;
                this.editor.updateHierarchy();
            }
        });

        this.dom.inspectorContent.querySelectorAll('.prop-input').forEach(input => {
            input.addEventListener('change', (e) => {
                if (!selectedMateria) return;
                const componentName = e.target.dataset.component;
                const propName = e.target.dataset.prop;
                let value = e.target.value;

                const ComponentClass = this[componentName]; // Access class via `this`
                if (!ComponentClass) return;

                const component = selectedMateria.getComponent(ComponentClass);
                if (component) {
                    if (e.target.type === 'number') value = parseFloat(value) || 0;

                    if (propName.includes('.')) {
                        const props = propName.split('.');
                        let obj = component;
                        for (let i = 0; i < props.length - 1; i++) obj = obj[props[i]];
                        obj[props[props.length - 1]] = value;
                    } else {
                        component[propName] = value;
                    }
                    this.editor.updateScene();
                }
            });
        });

        this.dom.inspectorContent.querySelectorAll('.prop-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                if (!selectedMateria) return;
                const componentName = e.target.dataset.component;
                const propName = e.target.dataset.prop;
                const value = e.target.dataset.value;

                const ComponentClass = this[componentName];
                if (!ComponentClass) return;

                const component = selectedMateria.getComponent(ComponentClass);
                if (component) {
                    component[propName] = value;
                    this.update(); // Re-render inspector
                    this.editor.updateScene();
                }
            });
        });
    }
}
