// CarleyComponents.js
// Definición de las nuevas Leyes 3D independientes del motor Carley World.

import { CarleyLeyes3D } from './CarleyLeyes3D.js';

export class CarleyTransform3D extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scale = { x: 1, y: 1, z: 1 };
    }

    // Compatibilidad bilingüe para scripting
    get posicion() { return this.position; }
    set posicion(v) { this.position = v; }
    get rotacion() { return this.rotation; }
    set rotacion(v) { this.rotation = v; }
    get escala() { return this.scale; }
    set escala(v) { this.scale = v; }

    clone() {
        const copy = new CarleyTransform3D(null);
        copy.position = { ...this.position };
        copy.rotation = { ...this.rotation };
        copy.scale = { ...this.scale };
        return copy;
    }
}

export class CarleyMeshRenderer3D extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this.meshType = 'Cube'; // 'Cube', 'Sphere', 'Plane', 'Triangle', 'Capsule'
        this.color = '#ffffff';
        this.texturePath = null;
        this.isUnlit = false;
    }

    // Compatibilidad bilingüe para scripting
    get colorDeMalla() { return this.color; }
    set colorDeMalla(v) { this.color = v; }
    get tipoDeMalla() { return this.meshType; }
    set tipoDeMalla(v) { this.meshType = v; }

    clone() {
        const copy = new CarleyMeshRenderer3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

export class CarleyRigidbody3D extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this.mass = 1.0;
        this.useGravity = true;
        this.drag = 0.01;
        this.velocity = { x: 0, y: 0, z: 0 };
    }

    addForce(fx, fy, fz) {
        this.velocity.x += fx / this.mass;
        this.velocity.y += fy / this.mass;
        this.velocity.z += fz / this.mass;
    }

    // Compatibilidad bilingüe para scripting
    aplicarFuerza(fx, fy, fz) {
        this.addForce(fx, fy, fz);
    }

    clone() {
        const copy = new CarleyRigidbody3D(null);
        Object.assign(copy, this);
        copy.velocity = { ...this.velocity };
        return copy;
    }
}

export class CarleyCollider3D extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this.isTrigger = false;
        this.offset = { x: 0, y: 0, z: 0 };
    }
}

export class CarleyBoxCollider3D extends CarleyCollider3D {
    constructor(materia) {
        super(materia);
        this.size = { x: 100, y: 100, z: 100 };
    }

    clone() {
        const copy = new CarleyBoxCollider3D(null);
        Object.assign(copy, this);
        copy.size = { ...this.size };
        copy.offset = { ...this.offset };
        return copy;
    }
}

export class CarleySphereCollider3D extends CarleyCollider3D {
    constructor(materia) {
        super(materia);
        this.radius = 50;
    }

    clone() {
        const copy = new CarleySphereCollider3D(null);
        Object.assign(copy, this);
        copy.offset = { ...this.offset };
        return copy;
    }
}

export class CarleyCapsuleCollider3D extends CarleyCollider3D {
    constructor(materia) {
        super(materia);
        this.radius = 25;
        this.height = 100;
    }

    clone() {
        const copy = new CarleyCapsuleCollider3D(null);
        Object.assign(copy, this);
        copy.offset = { ...this.offset };
        return copy;
    }
}
