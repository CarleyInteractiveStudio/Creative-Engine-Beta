// Components3D.js
// This file contains all the 3D-specific component classes.

import { Leyes } from './Leyes.js';
import { registerComponent } from './ComponentRegistry.js';

export class MeshRenderer3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.meshType = 'Cube'; // 'Cube', 'Sphere', 'Plane', 'Custom'
        this.color = '#ffffff';
        this.texturePath = null;
        this.isUnlit = false;
        this.shininess = 32.0;
        this.castShadows = true;
    }
    clone() {
        const copy = new MeshRenderer3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

export class Light3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.color = '#ffffff';
        this.intensity = 1.0;
        this.range = 10.0;
    }
}

export class DirectionalLight3D extends Light3D {
    constructor(materia) {
        super(materia);
        this.direction = { x: -1, y: -1, z: -1 };
    }
    clone() {
        const copy = new DirectionalLight3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

export class PointLight3D extends Light3D {
    constructor(materia) {
        super(materia);
    }
    clone() {
        const copy = new PointLight3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

export class SpotLight3D extends Light3D {
    constructor(materia) {
        super(materia);
        this.angle = 45;
        this.outerAngle = 50;
    }
    clone() {
        const copy = new SpotLight3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

// Register 3D Components
registerComponent('MeshRenderer3D', MeshRenderer3D);
registerComponent('DirectionalLight3D', DirectionalLight3D);
registerComponent('PointLight3D', PointLight3D);
registerComponent('SpotLight3D', SpotLight3D);
