// BaseComponent3D.js (Leyes 3D)
// Base class for all 3D components.

export class BaseComponent3D {
    constructor(materia) {
        this.materia = materia;
        this.isActive = true;
    }
    update(deltaTime = 0) {}
    start() {}
    onEnable() {}
    onDisable() {}
    onDestroy() {}
}
