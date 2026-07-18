// CarleyComponents.js
// Definición de las leyes 3D independientes de Carley World con nombres simplificados, bilingües y soporte de iluminación.

import { CarleyLeyes3D } from './CarleyLeyes3D.js';

// 1. Transform / Posición 3D
export class CarleyTransform3D extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scale = { x: 1, y: 1, z: 1 };
    }

    // Español (Simplificado)
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
export const posicion3d = CarleyTransform3D;
export const Transform3D = CarleyTransform3D;


// 2. MeshRenderer3D / Renderizador Malla 3D
export class CarleyMeshRenderer3D extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this.meshType = 'Cube'; // 'Cube', 'Sphere', 'Plane', 'Triangle', 'Capsule'
        this.color = '#ffffff';
        this.texturePath = null;
        this.isUnlit = false;
        this.receiveShadows = true;
        this.castShadows = true;
    }

    // Español (Simplificado)
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
export const renderizador3d = CarleyMeshRenderer3D;
export const MeshRenderer3D = CarleyMeshRenderer3D;


// 3. Rigidbody3D / Física 3D
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

    // Español (Simplificado)
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
export const fisica3d = CarleyRigidbody3D;
export const Rigidbody3D = CarleyRigidbody3D;


// 4. Collider3D / Colisionador 3D (Base)
export class CarleyCollider3D extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this.isTrigger = false;
        this.offset = { x: 0, y: 0, z: 0 };
    }
}
export const colisionador3d = CarleyCollider3D;
export const Collider3D = CarleyCollider3D;


// 5. BoxCollider3D / Caja de Colisión 3D
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
export const cajaDeColision3d = CarleyBoxCollider3D;
export const BoxCollider3D = CarleyBoxCollider3D;


// 6. SphereCollider3D / Esfera de Colisión 3D
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
export const esferaDeColision3d = CarleySphereCollider3D;
export const SphereCollider3D = CarleySphereCollider3D;


// 7. CapsuleCollider3D / Cápsula de Colisión 3D
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
export const capsulaDeColision3d = CarleyCapsuleCollider3D;
export const CapsuleCollider3D = CarleyCapsuleCollider3D;


// 8. Base Light3D / Luz 3D (Base)
export class CarleyLight3D extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this.color = '#ffffff';
        this.intensity = 1.0;
        this.castShadows = true;
    }

    get colorDeLuz() { return this.color; }
    set colorDeLuz(v) { this.color = v; }
    get intensidad() { return this.intensity; }
    set intensidad(v) { this.intensity = v; }
}


// 9. DirectionalLight3D / Luz Direccional 3D
export class CarleyDirectionalLight3D extends CarleyLight3D {
    constructor(materia) {
        super(materia);
        this.direction = { x: -0.5, y: -1.0, z: -0.3 };
    }

    clone() {
        const copy = new CarleyDirectionalLight3D(null);
        Object.assign(copy, this);
        copy.direction = { ...this.direction };
        return copy;
    }
}
export const luzDireccional3d = CarleyDirectionalLight3D;
export const DirectionalLight3D = CarleyDirectionalLight3D;


// 10. PointLight3D / Luz de Punto 3D
export class CarleyPointLight3D extends CarleyLight3D {
    constructor(materia) {
        super(materia);
        this.range = 500.0;
    }

    get rango() { return this.range; }
    set rango(v) { this.range = v; }

    clone() {
        const copy = new CarleyPointLight3D(null);
        Object.assign(copy, this);
        return copy;
    }
}
export const luzPunto3d = CarleyPointLight3D;
export const PointLight3D = CarleyPointLight3D;


// 11. SpotLight3D / Luz Focal 3D
export class CarleySpotLight3D extends CarleyLight3D {
    constructor(materia) {
        super(materia);
        this.direction = { x: 0, y: -1, z: 0 };
        this.angle = 30.0; // En grados
        this.range = 500.0;
    }

    get angulo() { return this.angle; }
    set angulo(v) { this.angle = v; }
    get rango() { return this.range; }
    set rango(v) { this.range = v; }

    clone() {
        const copy = new CarleySpotLight3D(null);
        Object.assign(copy, this);
        copy.direction = { ...this.direction };
        return copy;
    }
}
export const luzFocal3d = CarleySpotLight3D;
export const SpotLight3D = CarleySpotLight3D;
