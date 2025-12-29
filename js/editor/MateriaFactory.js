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



// --- UI Object Factories ---

export function createCanvasObject() {
    const newMateria = createBaseMateria(generateUniqueName('Canvas'));

    // A Canvas root needs both a Transform (for world position) and a RectTransform (for UI bounds).
    // We no longer remove the default Transform.
    newMateria.addComponent(new Components.RectTransform());
    newMateria.addComponent(new Components.UICanvas());

    return newMateria;
}

export function createImageObject() {
    const newMateria = createBaseMateria(generateUniqueName('Image'));

    // UI elements use RectTransform instead of Transform
    const transform = newMateria.getComponent(Components.Transform);
    if (transform) {
        newMateria.removeComponent(Components.Transform);
    }
    newMateria.addComponent(new Components.RectTransform());
    newMateria.addComponent(new Components.UIImage());

    return newMateria;
}
