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

function createUIMateria(name, parent = null, components = []) {
    const newMateria = createBaseMateria(name, parent);
    for (const ComponentClass of components) {
        if (!newMateria.getComponent(ComponentClass)) {
            newMateria.addComponent(new ComponentClass(newMateria));
        }
    }
    return newMateria;
}

export function createCanvasObject(parent = null) {
    const name = generateUniqueName('Canvas');
    const canvasMateria = createUIMateria(name, parent, [Components.Canvas]);
    // Default size for a new canvas
    const transform = canvasMateria.getComponent(Components.Transform);
    if (transform) {
        transform.localScale = { x: 400, y: 300 };
    }
    return canvasMateria;
}

export function createImageObject(parent = null) {
    const name = generateUniqueName('Image');
    return createUIMateria(name, parent, [Components.SpriteRenderer, Components.UIImage]);
}

export function createButtonObject(parent = null) {
    const name = generateUniqueName('Button');
    const buttonMateria = createUIMateria(name, parent, [Components.SpriteRenderer, Components.UIImage, Components.UIButton]);

    // Add a child Text object
    const textMateria = createTextObject(buttonMateria);
    textMateria.name = 'Text';
    const uiText = textMateria.getComponent(Components.UIText);
    if (uiText) {
        uiText.text = 'Button';
    }

    return buttonMateria;
}

export function createTextObject(parent = null) {
    const name = generateUniqueName('Text');
    return createUIMateria(name, parent, [Components.UIText]);
}
