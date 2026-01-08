// js/editor/MateriaFactory.js

import { Materia } from '../engine/Materia.js';
import * as Components from '../engine/Components.js';
import * as SceneManager from '../engine/SceneManager.js';

export function generateUniqueName(baseName) {
    const allMaterias = SceneManager.currentScene.getAllMaterias();
    const existingNames = new Set(allMaterias.map(m => m.name));

    if (!existingNames.has(baseName)) {
        return baseName;
    }

    let counter = 1;
    let newName = `${baseName} (${counter})`;
    while (existingNames.has(newName)) {
        counter++;
        newName = `${baseName} (${counter})`;
    }
    return newName;
}

export function createBaseMateria(name, parent = null) {
    const newMateria = new Materia(name);
    newMateria.addComponent(new Components.Transform(newMateria));

    if (parent) {
        parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }
    return newMateria;
}

export function createCanvasObject() {
    const name = generateUniqueName('Canvas');
    const newMateria = createBaseMateria(name); // createBaseMateria adds Transform
    newMateria.addComponent(new Components.Canvas(newMateria));
    return newMateria;
}

export function createImageObject(parent) {
    if (!parent) {
        console.error("createImageObject requiere un padre.");
        return null;
    }
    const name = generateUniqueName('Image');
    const newMateria = new Materia(name);
    // UI elements get a UITransform, not a regular Transform
    newMateria.addComponent(new Components.UITransform(newMateria));
    newMateria.addComponent(new Components.UIImage(newMateria));

    parent.addChild(newMateria);
    return newMateria;
}

export function createPanelObject(parent) {
    if (!parent) {
        console.error("createPanelObject requiere un padre que sea un Canvas.");
        return null;
    }
    const name = generateUniqueName('Panel');
    const newMateria = new Materia(name);

    newMateria.addComponent(new Components.UITransform(newMateria));
    const uiImage = new Components.UIImage(newMateria);
    uiImage.color = '#00000080'; // Negro con 50% de transparencia
    newMateria.addComponent(uiImage);

    parent.addChild(newMateria);
    return newMateria;
}
