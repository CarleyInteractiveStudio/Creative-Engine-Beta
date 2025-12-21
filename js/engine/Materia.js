// Materia.js
// This file contains the Materia class.

import { Transform } from './Components.js';
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

    getWorldTransform() {
        const transform = this.getComponent(Transform);
        if (!transform) {
            return { x: 0, y: 0, rotation: 0, scale: { x: 1, y: 1 } };
        }

        let worldTransform = {
            x: transform.x,
            y: transform.y,
            rotation: transform.rotation,
            scale: { x: transform.scale.x, y: transform.scale.y }
        };

        let currentParent = this.parent;
        while (currentParent) {
            const parentTransform = currentParent.getComponent(Transform);
            if (parentTransform) {
                // Combine scale
                worldTransform.scale.x *= parentTransform.scale.x;
                worldTransform.scale.y *= parentTransform.scale.y;

                // Combine position and rotation
                const parentRotationRad = parentTransform.rotation * Math.PI / 180;
                const cos = Math.cos(parentRotationRad);
                const sin = Math.sin(parentRotationRad);
                const childX = worldTransform.x;
                const childY = worldTransform.y;

                worldTransform.x = parentTransform.x + (childX * cos - childY * sin) * parentTransform.scale.x;
                worldTransform.y = parentTransform.y + (childX * sin + childY * cos) * parentTransform.scale.y;

                worldTransform.rotation += parentTransform.rotation;
            }
            currentParent = currentParent.parent;
        }

        return worldTransform;
    }

    update(deltaTime) {
        for (const ley of this.leyes) {
            if(typeof ley.update === 'function') {
                ley.update(deltaTime);
            }
        }
    }

    clone() {
        // Create a new Materia with a unique ID. We append '(Clone)' to the name for clarity.
        const newMateria = new Materia(`${this.name}`);
        newMateria.isActive = this.isActive;
        newMateria.isCollapsed = this.isCollapsed; // Copy collapsed state
        newMateria.layer = this.layer;
        newMateria.tag = this.tag;
        newMateria.flags = JSON.parse(JSON.stringify(this.flags)); // Deep copy flags

        // Clone each component
        for (const component of this.leyes) {
            if (typeof component.clone === 'function') {
                const newComponent = component.clone();
                newMateria.addComponent(newComponent);
            }
        }

        // Note: Children are not cloned here. The duplication logic should handle
        // whether to do a deep (recursive) clone or a shallow one. For now, we
        // only clone the object itself.

        return newMateria;
    }
}
