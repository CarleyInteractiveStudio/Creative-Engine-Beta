// Materia3D.js
// This file contains the Materia3D class, independent of 2D components.

import { Transform } from './Components3D.js';

let MATERIA_ID_COUNTER = 1000000;
export class Materia3D {
    constructor(name = 'Materia3D') {
        this.id = MATERIA_ID_COUNTER++;
        this.name = `${name}`;
        this.isActive = true;
        this.isCollapsed = false;
        this.layer = 0;
        this.tag = 'Untagged';
        this.flags = {};
        this.leyes = [];
        this.parent = null;
        this.children = [];
        this.prefabPath = null;
        this.scene = null;
    }

    setFlag(key, value) { this.flags[key] = value; }
    getFlag(key) { return this.flags[key]; }

    // --- Bilingual / Scripting Aliases ---
    get estaActivado() { return this.isActive; }
    set estaActivado(v) { this.isActive = v; }
    get activo() { return this.isActive; }
    set activo(v) { this.isActive = v; }

    // --- Fast Component Access Getters (3D Focused) ---
    get transform() { return this.getComponentByName('Transform'); }
    get position() { return this.transform; }
    get transformacion() { return this.transform; }
    get posicion() { return this.transform; }

    get meshRenderer3D() { return this.getComponentByName('MeshRenderer3D'); }
    get skinnedMeshRenderer3D() { return this.getComponentByName('SkinnedMeshRenderer3D'); }
    get animator3D() { return this.getComponentByName('Animator3D'); }
    get rigidbody3D() { return this.getComponentByName('Rigidbody3D'); }
    get fisica3D() { return this.rigidbody3D; }

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

    _resolveMateria(ref) {
        if (ref instanceof Materia3D) return ref;
        if (typeof ref === 'number') {
            const scene = this.scene || window.SceneManager?.currentScene;
            return scene ? scene.findMateriaById(ref) : null;
        }
        return null;
    }

    getComponentInParent(componentClass) {
        let current = this._resolveMateria(this.parent);
        while (current) {
            const comp = typeof componentClass === 'string' ? current.getComponentByName(componentClass) : current.getComponent(componentClass);
            if (comp) return comp;
            current = this._resolveMateria(current.parent);
        }
        return null;
    }

    getComponentInChildren(componentClass) {
        for (const child of this.children) {
            const comp = typeof componentClass === 'string' ? child.getComponentByName(componentClass) : child.getComponent(componentClass);
            if (comp) return comp;
            const nested = child.getComponentInChildren(componentClass);
            if (nested) return nested;
        }
        return null;
    }

    findChildByName(name, recursive = true) {
        for (const child of this.children) {
            if (child.name === name) return child;
            if (recursive) {
                const found = child.findChildByName(name, true);
                if (found) return found;
            }
        }
        return null;
    }

    obtenerScript(name) {
        const scriptComp = this.leyes.find(ley => ley.constructor.name === 'CreativeScript' && ley.scriptName === name);
        return scriptComp ? scriptComp.instance : null;
    }

    removeComponent(ComponentClass) {
        const index = this.leyes.findIndex(ley => ley instanceof ComponentClass);
        if (index !== -1) {
            const component = this.leyes[index];
            if (typeof component.onDestroy === 'function') component.onDestroy();
            this.leyes.splice(index, 1);
        }
    }

    isAncestorOf(potentialDescendant) {
        let current = this._resolveMateria(potentialDescendant.parent);
        while (current) {
            if (current.id === this.id) return true;
            current = this._resolveMateria(current.parent);
        }
        return false;
    }

    setParent(newParent, keepWorldTransform = true) {
        if (this.parent === newParent) return;
        let worldPos, worldRot, worldScale;
        const transform = this.transform;
        if (keepWorldTransform && transform) {
            worldPos = transform.position; worldRot = transform.localRotation; worldScale = transform.localScale;
        }
        if (this.parent) {
            let oldParent = this._resolveMateria(this.parent);
            if (oldParent && typeof oldParent.removeChild === 'function') oldParent.removeChild(this);
        } else {
            const scene = this.scene || window.SceneManager?.currentScene;
            if (scene && scene.materias) {
                const index = scene.materias.indexOf(this);
                if (index > -1) scene.materias.splice(index, 1);
            }
        }
        if (newParent) {
            newParent.children.push(this);
            this.parent = newParent;
            if (newParent.scene) this._setMateriaSceneRecursive(newParent.scene);
        } else {
            this.parent = null;
            const scene = this.scene || window.SceneManager?.currentScene;
            if (scene) scene.addMateria(this);
        }
        if (keepWorldTransform && transform) {
            transform.position = worldPos; transform.localRotation = worldRot; transform.localScale = worldScale;
        }
    }

    _setMateriaSceneRecursive(scene) {
        this.scene = scene;
        for (const child of this.children) child._setMateriaSceneRecursive(scene);
    }

    addChild(child) { child.setParent(this, false); }
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) { this.children.splice(index, 1); child.parent = null; }
    }

    destroy() {
        for (const ley of this.leyes) {
            if (typeof ley.onDestroy === 'function') ley.onDestroy();
            ley.materia = null;
        }
        this.leyes = [];
        for (const child of this.children) child.destroy();
        this.children = [];
        this.parent = null; this.scene = null;
    }

    traverse(callback) {
        callback(this);
        for (const child of this.children) child.traverse(callback);
    }

    update(deltaTime = 0) {
        for (const ley of this.leyes) {
            if (ley.isActive && typeof ley.update === 'function') ley.update(deltaTime);
        }
    }

    clone(preserveId = false) {
        const newMateria = new Materia3D(this.name);
        if (preserveId) newMateria.id = this.id;
        newMateria.isActive = this.isActive;
        newMateria.isCollapsed = this.isCollapsed;
        newMateria.layer = this.layer;
        newMateria.prefabPath = this.prefabPath;
        newMateria.tag = this.tag;
        newMateria.flags = JSON.parse(JSON.stringify(this.flags));
        newMateria.parent = this.parent ? (typeof this.parent === 'number' ? this.parent : this.parent.id) : null;
        for (const component of this.leyes) {
            if (typeof component.clone === 'function') newMateria.addComponent(component.clone());
        }
        for (const child of this.children) newMateria.addChild(child.clone(preserveId));
        return newMateria;
    }
}
