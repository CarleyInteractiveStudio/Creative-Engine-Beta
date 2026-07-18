// CarleyLeyes3D.js
// Clase base independiente para todas las Leyes 3D del motor Carley World.

export class CarleyLeyes3D {
    constructor(materia3d) {
        this.materia = materia3d;
        this.isActive = true;
    }

    start() {}
    update(deltaTime) {}
    fixedUpdate(deltaTime) {}
    onDestroy() {}

    clone() {
        const copy = new this.constructor(null);
        Object.assign(copy, this);
        return copy;
    }
}
