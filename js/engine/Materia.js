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
        this.prefabPath = null;
    }

    setFlag(key, value) {
        this.flags[key] = value;
    }

    getFlag(key) {
        return this.flags[key];
    }

    // --- Spanish Aliases for Scripting ---
    get estaActivado() { return this.isActive; }
    set estaActivado(v) { this.isActive = v; }
    get activo() { return this.isActive; }
    set activo(v) { this.isActive = v; }

    addComponent(component) {
        this.leyes.push(component);
        component.materia = this;
    }

    getComponent(componentClass) {
        if (typeof componentClass !== 'function') return null;
        return this.leyes.find(ley => ley instanceof componentClass);
    }

    getComponents(componentClass) {
        if (typeof componentClass !== 'function') return [];
        return this.leyes.filter(ley => ley instanceof componentClass);
    }

    getComponentByName(name) {
        return this.leyes.find(ley => ley.constructor.name === name);
    }

    /**
     * Busca un componente en los padres de esta materia.
     */
    getComponentInParent(componentClass) {
        let current = this.parent;
        // Resolve ID to object if necessary
        if (typeof current === 'number') {
            try { current = (this.scene || currentScene).findMateriaById(current); } catch (e) { return null; }
        }

        while (current) {
            const comp = typeof componentClass === 'string' ? current.getComponentByName(componentClass) : current.getComponent(componentClass);
            if (comp) return comp;
            current = current.parent;
            if (typeof current === 'number') {
                try { current = currentScene.findMateriaById(current); } catch (e) { return null; }
            }
        }
        return null;
    }

    /**
     * Busca un componente en los hijos de esta materia (recursivo).
     */
    getComponentInChildren(componentClass) {
        for (const child of this.children) {
            const comp = typeof componentClass === 'string' ? child.getComponentByName(componentClass) : child.getComponent(componentClass);
            if (comp) return comp;
            const nested = child.getComponentInChildren(componentClass);
            if (nested) return nested;
        }
        return null;
    }

    /**
     * Busca un script específico en esta Materia por su nombre.
     * @param {string} name - El nombre del script (ej: 'ControladorJugador').
     * @returns {object|null} La instancia del script o null si no se encuentra.
     */
    obtenerScript(name) {
        const scriptComp = this.leyes.find(ley => ley.constructor.name === 'CreativeScript' && ley.scriptName === name);
        return scriptComp ? scriptComp.instance : null;
    }

    // Alias en inglés
    getScript(name) { return this.obtenerScript(name); }

    /**
     * Comprueba si esta materia tiene un tag específico.
     * @param {string} tag
     */
    tieneTag(tag) {
        return this.tag === tag;
    }

    // Alias en inglés
    hasTag(tag) { return this.tieneTag(tag); }

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
            const component = this.leyes[index];
            if (typeof component.onDestroy === 'function') component.onDestroy();
            this.leyes.splice(index, 1);
        }
    }

    removeComponentByInstance(componentInstance) {
        const index = this.leyes.indexOf(componentInstance);
        if (index !== -1) {
            if (typeof componentInstance.onDestroy === 'function') componentInstance.onDestroy();
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

        // Inherit scene from parent
        if (this.scene) {
            child.scene = this.scene;
        }

        // A child should not be in the root list. Remove it.
        const scene = this.scene || currentScene;
        if (scene && scene.materias) {
            const index = scene.materias.indexOf(child);
            if (index > -1) {
                scene.materias.splice(index, 1);
            }
        }
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    /**
     * Destruye recursivamente esta materia, todos sus componentes y todos sus hijos.
     * Esencial para evitar fugas de memoria (limpieza de suscripciones, timers, etc).
     */
    destruir() { this.destroy(); }
    destroy() {
        // Notificar destrucción a los componentes de esta materia
        for (const ley of this.leyes) {
            if (typeof ley.onDestroy === 'function') {
                try {
                    ley.onDestroy();
                } catch (e) {
                    console.error(`Error destroying component ${ley.constructor.name} on Materia '${this.name}':`, e);
                }
            }
            // Limpiar referencia circular
            ley.materia = null;
        }
        this.leyes = [];

        // Destruir hijos recursivamente
        for (const child of this.children) {
            child.destroy();
        }
        this.children = [];

        // Limpiar referencias
        this.parent = null;
        this.scene = null;
    }

    update(deltaTime = 0) {
        for (const ley of this.leyes) {
            if (ley.isActive && typeof ley.update === 'function') {
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
        newMateria.prefabPath = this.prefabPath;
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
}
