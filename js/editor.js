// --- Engine Core Classes ---
// ...

// --- CodeMirror Integration ---
// ...

// --- Editor Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // ... (State, DOM, IndexedDB, Console)

    // --- 5. Core Editor Functions ---
    function updateInspector() {
        if(!dom.inspectorContent) getDOMElements();
        dom.inspectorContent.innerHTML = '';
        if (!selectedMateria) { dom.inspectorContent.innerHTML = '<p class="inspector-placeholder">Nada seleccionado</p>'; return; }

        // Name
        dom.inspectorContent.innerHTML = `<label for="materia-name">Nombre</label><input type="text" id="materia-name" value="${selectedMateria.name}">`;

        // Components
        selectedMateria.leyes.forEach(ley => {
            const container = document.createElement('div');
            if (ley instanceof Transform) {
                container.innerHTML = `<h4>Transform</h4><div class="transform-grid">
                    <label>X</label><input type="number" class="prop-input" data-component="Transform" data-prop="x" value="${ley.x.toFixed(0)}">
                    <label>Y</label><input type="number" class="prop-input" data-component="Transform" data-prop="y" value="${ley.y.toFixed(0)}">
                </div>`;
            } else if (ley instanceof UICanvas) {
                container.innerHTML = '<h4>UI Canvas</h4><p>Contenedor raíz para la UI.</p>';
            } else if (ley instanceof UIText) {
                container.innerHTML = `<h4>UI Text</h4>
                    <label>Texto</label><input type="text" class="prop-input" data-component="UIText" data-prop="text" value="${ley.text}">
                    <label>Tamaño Fuente</label><input type="number" class="prop-input" data-component="UIText" data-prop="fontSize" value="${ley.fontSize}">`;
            } else if (ley instanceof UIButton) {
                container.innerHTML = `<h4>UI Button</h4>
                    <label>Etiqueta</label><input type="text" class="prop-input" data-component="UIButton" data-prop="label.text" value="${ley.label.text}">
                    <label>Color</label><input type="color" class="prop-input" data-component="UIButton" data-prop="color" value="${ley.color}">`;
            } else if (ley instanceof CreativeScript) {
                container.innerHTML += `<h4>Creative Script</h4><div class="component-item script">${ley.scriptName}</div>`;
            }
            dom.inspectorContent.appendChild(container);
        });

        // Add Component Button
        dom.inspectorContent.innerHTML += `<button id="add-component-btn" class="add-component-btn">Añadir Ley</button>`;

        // Add Listeners
        document.getElementById('materia-name').addEventListener('change', e => { selectedMateria.name = e.target.value; updateHierarchy(); });
        dom.inspectorContent.querySelectorAll('.prop-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const componentName = e.target.dataset.component;
                const propName = e.target.dataset.prop;
                let value = e.target.value;

                const component = selectedMateria.getComponent(eval(componentName));
                if (component) {
                    if (e.target.type === 'number') value = parseFloat(value) || 0;

                    // Handle nested properties like label.text
                    const props = propName.split('.');
                    if (props.length > 1) {
                        component[props[0]][props[1]] = value;
                    } else {
                        component[propName] = value;
                    }

                    updateScene();
                }
            });
        });
        document.getElementById('add-component-btn').addEventListener('click', showAddComponentModal);
    }
    // ... (rest of the functions and setup)

    // --- Full function definitions to avoid retyping ---
    // ...
});
