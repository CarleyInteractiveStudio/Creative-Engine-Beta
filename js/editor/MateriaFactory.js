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
    const L = window.Localization;
    const name = generateUniqueName(L.get('CANVAS', 'Canvas'));
    const newMateria = createBaseMateria(name); // createBaseMateria adds Transform
    newMateria.addComponent(new Components.Canvas(newMateria));
    return newMateria;
}

export function createImageObject(parent) {
    if (!parent) {
        console.error("createImageObject requiere un padre.");
        return null;
    }
    const L = window.Localization;
    const name = generateUniqueName(L.get('IMAGE', 'Image'));
    const newMateria = new Materia(name);
    // UI elements get a UITransform, not a regular Transform
    newMateria.addComponent(new Components.UITransform(newMateria));
    newMateria.addComponent(new Components.UIImage(newMateria));

    parent.addChild(newMateria);
    return newMateria;
}

export function createAudioObject(parent = null) {
    const L = window.Localization;
    const name = generateUniqueName(L.get('AUDIO', 'Audio'));
    const newMateria = createBaseMateria(name, parent);
    newMateria.addComponent(new Components.AudioSource(newMateria));
    return newMateria;
}

export function createTerrenoObject(parent = null) {
    console.log("[MateriaFactory] Creando objeto de terreno...");
    const L = window.Localization;
    const name = generateUniqueName(L.get('TERRENO', 'Terreno'));
    const newMateria = createBaseMateria(name, parent);
    newMateria.addComponent(new Components.Terreno2D(newMateria));
    console.log("[MateriaFactory] Terreno creado con éxito:", newMateria);
    return newMateria;
}

export function createTextObject(parent) {
    if (!parent) {
        console.error("createTextObject requiere un padre que sea un Canvas.");
        return null;
    }
    const L = window.Localization;
    const name = generateUniqueName(L.get('TEXTO', 'Texto'));
    const newMateria = new Materia(name);

    newMateria.addComponent(new Components.UITransform(newMateria));
    newMateria.addComponent(new Components.UIText(newMateria));

    parent.addChild(newMateria);
    return newMateria;
}

export function createButtonObject(parent) {
    if (!parent) {
        console.error("createButtonObject requiere un padre que sea un Canvas.");
        return null;
    }
    const L = window.Localization;
    const buttonName = generateUniqueName(L.get('BOTON', 'Button'));
    const buttonMateria = new Materia(buttonName);

    buttonMateria.addComponent(new Components.UITransform(buttonMateria));
    buttonMateria.addComponent(new Components.UIImage(buttonMateria));
    buttonMateria.addComponent(new Components.Button(buttonMateria));

    parent.addChild(buttonMateria);

    // Create a child Text object
    const textName = generateUniqueName(L.get('TEXTO', 'Text'));
    const textMateria = new Materia(textName);
    const uiTransform = new Components.UITransform(textMateria);
    // Anchor the text to stretch across the button
    uiTransform.anchorPreset = 'stretch-stretch';
    uiTransform.size = { width: 0, height: 0 }; // Size is controlled by anchors
    textMateria.addComponent(uiTransform);

    const uiText = new Components.UIText(textMateria);
    uiText.text = L.get('BOTON', 'Button');
    uiText.horizontalAlign = 'center';
    textMateria.addComponent(uiText);

    buttonMateria.addChild(textMateria);

    return buttonMateria;
}


export function createPanelObject(parent) {
    if (!parent) {
        console.error("createPanelObject requiere un padre que sea un Canvas.");
        return null;
    }
    const L = window.Localization;
    const name = generateUniqueName(L.get('PANEL', 'Panel'));
    const newMateria = new Materia(name);

    newMateria.addComponent(new Components.UITransform(newMateria));
    const uiImage = new Components.UIImage(newMateria);
    uiImage.color = '#000000'; // Color opaco por defecto
    newMateria.addComponent(uiImage);

    parent.addChild(newMateria);
    return newMateria;
}
