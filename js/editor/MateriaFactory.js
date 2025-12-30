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
    const uniqueName = generateUniqueName(name);
    const newMateria = new Materia(uniqueName);
    newMateria.addComponent(new Components.Transform(newMateria));

    if (parent) {
        parent.addChild(newMateria);
    } else {
        SceneManager.currentScene.addMateria(newMateria);
    }
    return newMateria;
}

export function createCanvasObject(parent = null) {
    const canvasMateria = createBaseMateria('Canvas', parent);
    const canvasComponent = new Components.Canvas(canvasMateria);
    canvasComponent.width = 400; // Default width
    canvasComponent.height = 300; // Default height
    canvasMateria.addComponent(canvasComponent);

    // Transform position should be centered by default
    const transform = canvasMateria.getComponent(Components.Transform);
    transform.x = 0;
    transform.y = 0;
    // Scale is not used for Canvas size, so it should be 1.
    transform.scale = { x: 1, y: 1 };
    return canvasMateria;
}

export function createUIImageObject(parent = null) {
    // Pass the parent to createBaseMateria so it's correctly assigned.
    const imageMateria = createBaseMateria('Imagen', parent);
    imageMateria.addComponent(new Components.UIImage(imageMateria));
    const transform = imageMateria.getComponent(Components.Transform);
    transform.scale = { x: 100, y: 100 };
    return imageMateria;
}

export function createUITextObject(parent = null) {
    const textMateria = createBaseMateria('Texto', parent);
    textMateria.addComponent(new Components.UIText(textMateria));
    const transform = textMateria.getComponent(Components.Transform);
    transform.scale = { x: 160, y: 30 };
    return textMateria;
}

export function createUIButtonObject(parent = null) {
    const buttonMateria = createBaseMateria('Boton', parent);
    buttonMateria.addComponent(new Components.UIButton(buttonMateria));

    // The button itself has the UIImage for its background
    buttonMateria.addComponent(new Components.UIImage(buttonMateria));

    const transform = buttonMateria.getComponent(Components.Transform);
    transform.scale = { x: 160, y: 30 };

    // Create a child Text object for the button's label
    const textMateria = createUITextObject(buttonMateria);
    textMateria.name = 'Texto';
    const uiText = textMateria.getComponent(Components.UIText);
    uiText.text = 'Boton';
    uiText.color = '#000000'; // Black text is more visible on default white button
    uiText.horizontalAlign = 'center';
    uiText.verticalAlign = 'middle';

    return buttonMateria;
}
