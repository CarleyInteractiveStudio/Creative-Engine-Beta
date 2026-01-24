// Materia.js
// This file contains the Materia class.

import { Transform } from './Components.js';
import { Leyes } from './Leyes.js';
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

    findAncestorWithComponent(componentClass) {
        let current = this.parent;
        // If the parent is a number (ID), we need to resolve it to a Materia object first.
        if (typeof current === 'number') {
            try {
                // Assuming `currentScene` is accessible or passed in somehow.
                // This is a potential issue if currentScene is not globally available here.
                // For now, let's rely on it being available via SceneManager.
                current = currentScene.findMateriaById(current);
            } catch (e) {
                console.error("Could not resolve parent ID to Materia:", e);
                return null;
            }
        }

        while (current) {
            if (current.getComponent(componentClass)) {
                return current;
            }
            current = current.parent;
             // Handle cases where the next parent in the chain is also just an ID
            if (typeof current === 'number') {
                 try {
                    current = currentScene.findMateriaById(current);
                } catch (e) {
                    console.error("Could not resolve parent ID to Materia during traversal:", e);
                    return null;
                }
            }
        }
        return null;
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
            // If parent is an ID (number) due to cloning, resolve it to an object
            let oldParent = child.parent;
            if (typeof oldParent === 'number') {
                try {
                    oldParent = currentScene.findMateriaById(oldParent);
                } catch (e) {
                    oldParent = null;
                }
            }

            if (oldParent && typeof oldParent.removeChild === 'function') {
                oldParent.removeChild(child);
            } else {
                // If the previous parent is invalid (e.g., numeric placeholder), clear it
                child.parent = null;
            }
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

    update(deltaTime = 0) {
        for (const ley of this.leyes) {
            if (typeof ley.update === 'function') {
                try {
                    ley.update(deltaTime);
                } catch (e) {
                    console.error(`Error updating component ${ley.constructor.name} on Materia '${this.name}':`, e);
                }
            }
        }
    }

    clone(preserveId = false) {
        // When cloning for scene snapshots, we need to preserve IDs.
        // When duplicating an object in the editor, we need a new ID.
        const newMateria = new Materia(this.name);
        if (preserveId) {
            newMateria.id = this.id;
        }

        newMateria.isActive = this.isActive;
        newMateria.isCollapsed = this.isCollapsed;
        newMateria.layer = this.layer;
        newMateria.tag = this.tag;
        newMateria.flags = JSON.parse(JSON.stringify(this.flags)); // Deep copy

        // The parent ID is copied directly. The scene clone method will resolve this to an object reference.
        newMateria.parent = this.parent ? (typeof this.parent === 'number' ? this.parent : this.parent.id) : null;

        // Clone components
        for (const component of this.leyes) {
            if (typeof component.clone === 'function') {
                const newComponent = component.clone();
                newMateria.addComponent(newComponent);
            }
        }

        // Clone children recursively, preserving their IDs
        for (const child of this.children) {
            const newChild = child.clone(preserveId);
            newMateria.addChild(newChild);
        }

        return newMateria;
    }

    /**
     * Serializes the Materia and its entire hierarchy into a JSON object.
     * This is used for creating prefabs.
     * @returns {object} A serializable representation of the Materia.
     */
    serialize() {
        const serializedMateria = {
            name: this.name,
            isActive: this.isActive,
            layer: this.layer,
            tag: this.tag,
            flags: JSON.parse(JSON.stringify(this.flags)),
            leyes: this.leyes.map(ley => ley.serialize()),
            children: this.children.map(child => child.serialize())
        };
        return serializedMateria;
    }

    /**
     * Creates a new Materia instance from serialized prefab data.
     * @param {object} data - The serialized materia data from a .cePrefab file.
     * @param {Materia} parent - The parent for the new materia. Can be null for root objects.
     * @returns {Materia} The newly created Materia instance.
     */
    static deserialize(data, parent = null) {
        const newMateria = new Materia(data.name);

        // Assign basic properties
        newMateria.isActive = data.isActive;
        newMateria.layer = data.layer;
        newMateria.tag = data.tag;
        newMateria.flags = JSON.parse(JSON.stringify(data.flags || {}));

        // Deserialize and add components
        if (data.leyes) {
            for (const leyData of data.leyes) {
                // The Transform component is added by default, so we remove it before adding the deserialized one.
                if (leyData.type === 'Transform') {
                    newMateria.removeComponent(Transform);
                }
                const newLey = Leyes.deserialize(leyData, newMateria);
                if (newLey) {
                    newMateria.addComponent(newLey);
                }
            }
        }

        // Recursively deserialize children
        if (data.children) {
            for (const childData of data.children) {
                const childMateria = Materia.deserialize(childData, newMateria);
                newMateria.addChild(childMateria);
            }
        }

        return newMateria;
    }
}
