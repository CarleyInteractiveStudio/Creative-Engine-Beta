// Materia.js
// This file contains the Materia class.

import * as Components from './Components.js'; // Import all of Components
import { currentScene } from './SceneManager.js';

let MATERIA_ID_COUNTER = 0;
export class Materia {
    constructor(name = 'Materia') {
        this.id = MATERIA_ID_COUNTER++;
        this.name = `${name}`;
        this.isActive = true;
        this.isCollapsed = false; // For hierarchy view
        this.layer = 0; // Layer index, 0 is 'Default'
        this.tag = 'Untagged';
        this.flags = {};
        this.leyes = [];
        this.parent = null;
        this.children = [];

        // --- FIX ---
        // Ensure every Materia always has a Transform component upon creation.
        this.addComponent(new Components.Transform(this));
    }

    setFlag(key, value) {
        this.flags[key] = value;
    }

    getFlag(key) {
        return this.flags[key];
    }

    addComponent(component) {
        this.leyes.push(component);
        component.materia = this;
    }

    getComponent(componentClass) {
        return this.leyes.find(ley => ley instanceof componentClass);
    }

    getComponents(componentClass) {
        return this.leyes.filter(ley => ley instanceof componentClass);
    }

    removeComponent(ComponentClass) {
        // Prevent removing the mandatory Transform component
        if (ComponentClass === Components.Transform) {
            console.warn("Cannot remove the Transform component.");
            return;
        }
        const index = this.leyes.findIndex(ley => ley instanceof ComponentClass);
        if (index !== -1) {
            this.leyes.splice(index, 1);
        }
    }

    isAncestorOf(potentialDescendant) {
        let current = potentialDescendant.parent;
        while (current) {
            if (current.id === this.id) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    addChild(child) {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);

        // A child should not be in the root list. Remove it.
        const index = currentScene.materias.indexOf(child);
        if (index > -1) {
            currentScene.materias.splice(index, 1);
        }
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    update() {
        for (const ley of this.leyes) {
            if(typeof ley.update === 'function') {
                ley.update();
            }
        }
    }

    clone() {
        // Create a new Materia. The constructor will automatically add a Transform.
        const newMateria = new Materia(`${this.name}`);
        newMateria.leyes = []; // Clear the default transform to add the cloned ones.

        newMateria.isActive = this.isActive;
        newMateria.isCollapsed = this.isCollapsed;
        newMateria.layer = this.layer;
        newMateria.tag = this.tag;
        newMateria.flags = JSON.parse(JSON.stringify(this.flags));

        // Clone each component
        for (const component of this.leyes) {
            if (typeof component.clone === 'function') {
                const newComponent = component.clone();
                newMateria.addComponent(newComponent);
            }
        }

        // Ensure a transform exists if the original somehow didn't have one (legacy safety)
        if (!newMateria.getComponent(Components.Transform)) {
             newMateria.addComponent(new Components.Transform(newMateria));
        }

        return newMateria;
    }
}
