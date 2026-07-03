// js/engine/3d/BaseComponent3D.js
// Base class for all 3D components.

export class BaseComponent3D {
    constructor(materia) {
        this.materia = materia;
        this.isActive = true;
    }

    start() {}
    update(deltaTime) {}
    fixedUpdate(deltaTime) {}
    onEnable() {}
    onDisable() {}
    onDestroy() {}

    clone() {
        const copy = new this.constructor(null);
        Object.assign(copy, this);
        copy.materia = null;
        return copy;
    }
}
