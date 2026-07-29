// CarleyComponents.js
// Definición de las leyes 3D independientes de Carley World con nombres simplificados, bilingües y soporte de mallas esqueléticas animadas.

import { CarleyLeyes3D } from './CarleyLeyes3D.js';

// 1. Transform / Posición 3D
export class CarleyTransform3D extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this._position = { x: 0, y: 0, z: 0 };
        this._rotation = { x: 0, y: 0, z: 0 };
        this._scale = { x: 1, y: 1, z: 1 };
    }

    // Getters y setters internos para compatibilidad con la física/renderizador
    get position() { return this._position; }
    set position(v) {
        if (v && typeof v === 'object') {
            this._position.x = v.x !== undefined ? v.x : this._position.x;
            this._position.y = v.y !== undefined ? v.y : this._position.y;
            this._position.z = v.z !== undefined ? v.z : this._position.z;
        }
    }

    get rotation() { return this._rotation; }
    set rotation(v) {
        if (typeof v === 'number') {
            this._rotation.z = v;
        } else if (v && typeof v === 'object') {
            this._rotation.x = v.x !== undefined ? v.x : this._rotation.x;
            this._rotation.y = v.y !== undefined ? v.y : this._rotation.y;
            this._rotation.z = v.z !== undefined ? v.z : this._rotation.z;
        }
    }

    get scale() { return this._scale; }
    set scale(v) {
        if (v && typeof v === 'object') {
            this._scale.x = v.x !== undefined ? v.x : this._scale.x;
            this._scale.y = v.y !== undefined ? v.y : this._scale.y;
            this._scale.z = v.z !== undefined ? v.z : this._scale.z;
        }
    }

    // Coordenadas individuales para compatibilidad transparente con el editor (Gizmos, navegación, etc.)
    get x() { return this._position.x; }
    set x(val) { this._position.x = val; }
    get y() { return this._position.y; }
    set y(val) { this._position.y = val; }
    get z() { return this._position.z; }
    set z(val) { this._position.z = val; }

    get rotationX() { return this._rotation.x; }
    set rotationX(val) { this._rotation.x = val; }
    get rotationY() { return this._rotation.y; }
    set rotationY(val) { this._rotation.y = val; }
    get rotationZ() { return this._rotation.z; }
    set rotationZ(val) { this._rotation.z = val; }

    get scaleX() { return this._scale.x; }
    set scaleX(val) { this._scale.x = val; }
    get scaleY() { return this._scale.y; }
    set scaleY(val) { this._scale.y = val; }
    get scaleZ() { return this._scale.z; }
    set scaleZ(val) { this._scale.z = val; }

    // Compatibility getters & setters for the Editor Inspector
    get localPosition() { return this._position; }
    set localPosition(v) { this.position = v; }
    get localRotation() { return this._rotation; }
    set localRotation(v) { this.rotation = v; }
    get localScale() { return this._scale; }
    set localScale(v) { this.scale = v; }

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


// 12. MaterialLuz3D / Material de Luz (Emisión / Incandescente)
export class CarleyMaterialLuz extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this.color = '#ffaa00'; // Color incandescente de emisión
        this.intensity = 2.0;   // Fuerza del brillo
    }

    get colorDeBrillo() { return this.color; }
    set colorDeBrillo(v) { this.color = v; }
    get intensidadBrillo() { return this.intensity; }
    set intensidadBrillo(v) { this.intensity = v; }

    clone() {
        const copy = new CarleyMaterialLuz(null);
        Object.assign(copy, this);
        return copy;
    }
}
export const materialLuz3d = CarleyMaterialLuz;
export const MaterialLuz3D = CarleyMaterialLuz;


// 13. SkinnedMeshRenderer3D / Renderizador Malla Huesos 3D
export class CarleySkinnedMeshRenderer3D extends CarleyMeshRenderer3D {
    constructor(materia) {
        super(materia);
        this.meshType = 'Custom';
        this.modelPath = null;
        this.skeleton = null;
        this.rootBone = null;
        this.cpuPositions = null;
        this.cpuNormals = null;
        this.cpuUVs = null;
        this.cpuIndices = null;
        this.cpuJoints = null;
        this.cpuWeights = null;
        this.indexCount = 0;
        this.boneMatrices = new Float32Array(64 * 16);
        for(let i=0; i<64; i++) {
            const idx = i * 16;
            this.boneMatrices[idx] = 1; this.boneMatrices[idx+5] = 1; this.boneMatrices[idx+10] = 1; this.boneMatrices[idx+15] = 1;
        }
        this.isLoaded = false;
    }

    clone() {
        const copy = new CarleySkinnedMeshRenderer3D(null);
        Object.assign(copy, this);
        return copy;
    }
}
export const esqueletoRender3d = CarleySkinnedMeshRenderer3D;
export const SkinnedMeshRenderer3D = CarleySkinnedMeshRenderer3D;


// 14. Animator3D / Animador 3D
export class CarleyAnimator3D extends CarleyLeyes3D {
    constructor(materia) {
        super(materia);
        this.animations = [];
        this.currentAnimation = null;
        this.isPlaying = false;
        this.time = 0;
        this.speed = 1.0;
        this.loop = true;
    }

    play(name = null) {
        if (name) this.currentAnimation = this.animations.find(a => a.name === name);
        else if (this.animations.length > 0) this.currentAnimation = this.animations[0];
        this.isPlaying = true;
        this.time = 0;
    }

    stop() { this.isPlaying = false; this.time = 0; }
    pause() { this.isPlaying = false; }

    update(deltaTime) {
        if (!this.isPlaying || !this.currentAnimation) return;
        this.time += deltaTime * this.speed;
        const duration = this.getMaxTime();
        if (this.time > duration) {
            if (this.loop) this.time %= duration;
            else { this.time = duration; this.isPlaying = false; }
        }
        this.applyAnimation(this.time);
    }

    getMaxTime() {
        let max = 0;
        for (const channel of this.currentAnimation.channels) {
            const lastTime = channel.times[channel.times.length - 1];
            if (lastTime > max) max = lastTime;
        }
        return max;
    }

    applyAnimation(time) {
        // Mapear los canales a los componentes de posición del hueso (Materia3D)
        for (const channel of this.currentAnimation.channels) {
            const scene = this.materia.scene || window.SceneManager?.currentScene;
            if (!scene) continue;
            const targetMateria = scene.findMateriaById(channel.node);
            if (!targetMateria) continue;
            const transform = targetMateria.transform;
            if (!transform) continue;

            const value = this.interpolate(channel, time);
            if (!value) continue;

            if (channel.path === 'translation') {
                transform.position = { x: value[0], y: value[1], z: value[2] };
            } else if (channel.path === 'rotation') {
                // Conversión de quat simplificado
                transform.rotation = { x: value[0] * 180, y: value[1] * 180, z: value[2] * 180 };
            } else if (channel.path === 'scale') {
                transform.scale = { x: value[0], y: value[1], z: value[2] };
            }
        }
    }

    interpolate(channel, time) {
        const times = channel.times;
        const values = channel.values;
        const compCount = channel.path === 'rotation' ? 4 : 3;

        if (time <= times[0]) return values.slice(0, compCount);
        if (time >= times[times.length - 1]) return values.slice((times.length - 1) * compCount, times.length * compCount);

        let i = 0;
        for (; i < times.length - 1; i++) {
            if (time >= times[i] && time <= times[i + 1]) break;
        }

        const t = (time - times[i]) / (times[i + 1] - times[i]);
        const result = new Float32Array(compCount);
        for (let j = 0; j < compCount; j++) {
            const v1 = values[i * compCount + j];
            const v2 = values[(i + 1) * compCount + j];
            result[j] = v1 + (v2 - v1) * t;
        }
        return result;
    }

    clone() {
        const copy = new CarleyAnimator3D(null);
        Object.assign(copy, this);
        return copy;
    }
}
export const animador3d = CarleyAnimator3D;
export const Animator3D = CarleyAnimator3D;
