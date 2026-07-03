// js/engine/3d/Materia3D.js
// Specialized entity class for the 3D Engine.

let MATERIA3D_ID_COUNTER = 0;

export class Materia3D {
    constructor(name = 'Materia3D') {
        this.id = MATERIA3D_ID_COUNTER++;
        this.name = `${name}`;
        this.isActive = true;
        this.isCollapsed = false;
        this.layer = 0;
        this.tag = 'Untagged';
        this.flags = {};
        this.leyes = [];
        this.parent = null;
        this.children = [];
        this.scene = null;
        this.prefabPath = null;
    }

    setFlag(key, value) { this.flags[key] = value; }
    getFlag(key) { return this.flags[key]; }

    get transform() { return this.getComponentByName('Transform3D'); }
    get rigidbody() { return this.getComponentByName('Rigidbody3D'); }
    get meshRenderer() { return this.getComponentByName('MeshRenderer3D') || this.getComponentByName('SkinnedMeshRenderer3D'); }
    get animator() { return this.getComponentByName('Animator3D'); }

    addComponent(component) {
        this.leyes.push(component);
        component.materia = this;
        return component;
    }

    getComponent(componentClass) {
        if (typeof componentClass === 'string') return this.getComponentByName(componentClass);
        return this.leyes.find(ley => ley instanceof componentClass);
    }

    getComponentByName(name) {
        return this.leyes.find(ley => ley.constructor.name === name);
    }

    getComponents(componentClass) {
        if (typeof componentClass === 'string') return this.leyes.filter(ley => ley.constructor.name === componentClass);
        return this.leyes.filter(ley => ley instanceof componentClass);
    }

    setParent(newParent, keepWorldTransform = true) {
        if (this.parent === newParent) return;
        if (this.parent) {
            const index = this.parent.children.indexOf(this);
            if (index > -1) this.parent.children.splice(index, 1);
        }
        this.parent = newParent;
        if (newParent) {
            newParent.children.push(this);
            if (newParent.scene) this._setSceneRecursive(newParent.scene);
        }
    }

    _setSceneRecursive(scene) {
        this.scene = scene;
        for (const child of this.children) child._setSceneRecursive(scene);
    }

    addChild(child) { child.setParent(this); }

    traverse(callback) {
        callback(this);
        for (const child of this.children) child.traverse(callback);
    }

    update(deltaTime) {
        if (!this.isActive) return;
        for (const ley of this.leyes) {
            if (ley.isActive && typeof ley.update === 'function') {
                ley.update(deltaTime);
            }
        }
        for (const child of this.children) {
            child.update(deltaTime);
        }
    }

    destroy() {
        for (const ley of this.leyes) {
            if (typeof ley.onDestroy === 'function') ley.onDestroy();
            ley.materia = null;
        }
        this.leyes = [];
        for (const child of this.children) child.destroy();
        this.children = [];
        this.parent = null;
        this.scene = null;
    }

    clone(preserveId = false) {
        const copy = new Materia3D(this.name);
        if (preserveId) copy.id = this.id;
        copy.isActive = this.isActive;
        copy.layer = this.layer;
        copy.tag = this.tag;
        copy.flags = { ...this.flags };
        copy.prefabPath = this.prefabPath;
        for (const ley of this.leyes) {
            if (typeof ley.clone === 'function') {
                copy.addComponent(ley.clone());
            }
        }
        for (const child of this.children) {
            copy.addChild(child.clone(preserveId));
        }
        return copy;
    }
}
