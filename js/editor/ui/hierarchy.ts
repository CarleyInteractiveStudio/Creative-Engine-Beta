import * as SceneManager from '../../engine/SceneManager.ts';
import * as Components from '../../engine/Components.js';
import { Materia } from '../../engine/Materia.js';

let dom = {};
let selectedMateria = null;
let projectsDirHandle = null;
let selectMateriaCallback = () => {};
let updateInspectorCallback = () => {};
let showContextMenuCallback = () => {};

function createEmptyMateria(name, parent = null) {
    const newMateria = new Materia(name);
    newMateria.addComponent(new Components.Transform(newMateria));
    SceneManager.currentScene.addMateria(newMateria, parent);
    updateHierarchy(selectedMateria);
    selectMateriaCallback(newMateria.id);
    return newMateria;
}

export function initializeHierarchy(dependencies) {
    dom = dependencies.dom;
    projectsDirHandle = dependencies.projectsDirHandle;
    selectMateriaCallback = dependencies.selectMateria;
    updateInspectorCallback = dependencies.updateInspector;
    showContextMenuCallback = dependencies.showContextMenu;

    const hierarchyContent = dom.hierarchyContent;

    hierarchyContent.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        hierarchyContent.classList.add('drag-over');
    });

    hierarchyContent.addEventListener('dragleave', (e) => {
        hierarchyContent.classList.remove('drag-over');
    });

    hierarchyContent.addEventListener('drop', async (e) => {
        e.preventDefault();
        hierarchyContent.classList.remove('drag-over');
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));

        if (data.path && (data.path.endsWith('.png') || data.path.endsWith('.jpg'))) {
            const newMateria = new Materia(data.name.split('.')[0]);
            newMateria.addComponent(new Components.Transform(newMateria));
            const spriteRenderer = new Components.SpriteRenderer(newMateria);

            spriteRenderer.setSourcePath(data.path);
            await spriteRenderer.loadSprite(projectsDirHandle);

            newMateria.addComponent(spriteRenderer);
            SceneManager.currentScene.addMateria(newMateria);
            updateHierarchy(selectedMateria);
            selectMateriaCallback(newMateria.id);
            console.log(`Created new Materia '${newMateria.name}' from sprite '${data.name}'.`);
        } else {
            console.log(`File type '${data.name}' cannot be dropped into the hierarchy.`);
        }
    });

    hierarchyContent.addEventListener('click', (e) => {
        const item = e.target.closest('.hierarchy-item');
        if (item) {
            const materiaId = parseInt(item.dataset.id, 10);
            selectMateriaCallback(materiaId);
        }
    });

    hierarchyContent.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.hierarchy-item');
        if(item) {
            e.dataTransfer.setData('text/plain', item.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    dom.hierarchyContextMenu.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (!action) return;

        dom.hierarchyContextMenu.style.display = 'none';

        switch (action) {
            case 'create-empty':
                createEmptyMateria('Materia Vacio', selectedMateria);
                break;
            case 'create-primitive-square': {
                const square = createEmptyMateria('Cuadrado', selectedMateria);
                square.addComponent(new Components.SpriteRenderer(square));
                break;
            }
            case 'create-camera': {
                createEmptyMateria('Cámara', selectedMateria).addComponent(new Components.Camera());
                break;
            }
            case 'rename':
                if (selectedMateria) {
                    const newName = prompt(`Rename '${selectedMateria.name}':`, selectedMateria.name);
                    if (newName && newName.trim() !== '') {
                        selectedMateria.name = newName.trim();
                        updateHierarchy(selectedMateria);
                        updateInspectorCallback(selectedMateria);
                    }
                }
                break;
            case 'delete':
                if (selectedMateria) {
                    if (confirm(`Are you sure you want to delete '${selectedMateria.name}'? This action cannot be undone.`)) {
                        const idToDelete = selectedMateria.id;
                        selectMateriaCallback(null);
                        SceneManager.currentScene.removeMateria(idToDelete);
                        updateHierarchy(selectedMateria);
                        updateInspectorCallback(null);
                    }
                }
                break;
        }
    });

    hierarchyContent.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const item = e.target.closest('.hierarchy-item');
        if (item) {
            const materiaId = parseInt(item.dataset.id, 10);
            if (selectedMateria?.id !== materiaId) {
                selectMateriaCallback(materiaId);
            }
        } else {
            selectMateriaCallback(null);
        }
        showContextMenuCallback(dom.hierarchyContextMenu, e);
    });

    console.log("Hierarchy module initialized.");
}

export function updateHierarchy(currentSelectedMateria) {
    selectedMateria = currentSelectedMateria;
    dom.hierarchyContent.innerHTML = '';
    const rootMaterias = SceneManager.currentScene.getRootMaterias();

    if (rootMaterias.length === 0) {
        dom.hierarchyContent.innerHTML = `<p class="empty-message">Scene is empty.<br>Right-click to create an object.</p>`;
        return;
    }

    function renderNode(materia, container, depth) {
        const item = document.createElement('div');
        item.className = 'hierarchy-item';
        if (!materia.isActive) {
            item.classList.add('disabled');
        }
        item.dataset.id = materia.id;
        item.draggable = true;
        item.style.paddingLeft = `${depth * 18}px`;
        const nameSpan = document.createElement('span');
        nameSpan.textContent = materia.name;
        item.appendChild(nameSpan);
        if (selectedMateria && materia.id === selectedMateria.id) {
            item.classList.add('active');
        }
        container.appendChild(item);
        if (materia.children && materia.children.length > 0) {
            materia.children.forEach(child => {
                renderNode(child, container, depth + 1);
            });
        }
    }
    rootMaterias.forEach(materia => renderNode(materia, dom.hierarchyContent, 0));
}
