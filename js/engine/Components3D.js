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

/**
 * Rigidbody3D: Componente de físicas para objetos 3D.
 * Permite movimiento, rotación y fuerzas en los 3 ejes.
 */
export class Rigidbody3D extends Leyes {
    static actionableMethods = {
        'addForce': ['aplicarFuerza', 'приложитьСилу', '施加力'],
        'addTorque': ['aplicarTorque', 'приложитьКрутящийМомент', '施加扭矩'],
        'stop': ['detener', 'остановить', '停止']
    };

    constructor(materia) {
        super(materia);
        this.mass = 1.0;
        this.useGravity = true;
        this.drag = 0.01;
        this.angularDrag = 0.05;
        this.isKinematic = false;

        this.velocity = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { x: 0, y: 0, z: 0 };
    }

    addForce(xOrObj, y, z) {
        if (this.isKinematic) return;
        let fx = 0, fy = 0, fz = 0;
        if (typeof xOrObj === 'object') {
            fx = xOrObj.x || 0; fy = xOrObj.y || 0; fz = xOrObj.z || 0;
        } else {
            fx = xOrObj; fy = y; fz = z;
        }
        this.velocity.x += fx / this.mass;
        this.velocity.y += fy / this.mass;
        this.velocity.z += fz / this.mass;
    }

    addTorque(xOrObj, y, z) {
        if (this.isKinematic) return;
        let tx = 0, ty = 0, tz = 0;
        if (typeof xOrObj === 'object') {
            tx = xOrObj.x || 0; ty = xOrObj.y || 0; tz = xOrObj.z || 0;
        } else {
            tx = xOrObj; ty = y; tz = z;
        }
        this.angularVelocity.x += tx / this.mass;
        this.angularVelocity.y += ty / this.mass;
        this.angularVelocity.z += tz / this.mass;
    }

    stop() {
        this.velocity = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { x: 0, y: 0, z: 0 };
    }

    clone() {
        const copy = new Rigidbody3D(null);
        Object.assign(copy, this);
        copy.velocity = { ...this.velocity };
        copy.angularVelocity = { ...this.angularVelocity };
        return copy;
    }
}

/**
 * Collider3D: Clase base para colisionadores 3D.
 */
export class Collider3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.isTrigger = false;
        this.offset = { x: 0, y: 0, z: 0 };
    }
}

export class BoxCollider3D extends Collider3D {
    constructor(materia) {
        super(materia);
        this.size = { x: 100, y: 100, z: 100 };
    }
    clone() {
        const copy = new BoxCollider3D(null);
        Object.assign(copy, this);
        copy.size = { ...this.size };
        copy.offset = { ...this.offset };
        return copy;
    }
}

export class SphereCollider3D extends Collider3D {
    constructor(materia) {
        super(materia);
        this.radius = 50;
    }
    clone() {
        const copy = new SphereCollider3D(null);
        Object.assign(copy, this);
        copy.offset = { ...this.offset };
        return copy;
    }
}

// Register 3D Components
registerComponent('MeshRenderer3D', MeshRenderer3D);
registerComponent('DirectionalLight3D', DirectionalLight3D);
registerComponent('PointLight3D', PointLight3D);
registerComponent('SpotLight3D', SpotLight3D);
registerComponent('Rigidbody3D', Rigidbody3D);
registerComponent('BoxCollider3D', BoxCollider3D);
registerComponent('SphereCollider3D', SphereCollider3D);
