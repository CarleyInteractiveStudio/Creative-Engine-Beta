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

/**
 * SkinnedMeshRenderer3D: Componente para renderizar mallas con animación esquelética.
 */
export class SkinnedMeshRenderer3D extends MeshRenderer3D {
    constructor(materia) {
        super(materia);
        this.meshType = 'Custom';
        this.modelPath = null;
        this.skeleton = null; // { joints: [], inverseBindMatrices: [] }
        this.rootBone = null; // Referencia a la Materia que es el hueso raíz
        this.weights = null;
        this.jointIndices = null;

        // Cache de matrices de huesos para el shader
        this.boneMatrices = new Float32Array(64 * 16);
        for(let i=0; i<64; i++) {
            const idx = i * 16;
            this.boneMatrices[idx] = 1;
            this.boneMatrices[idx+5] = 1;
            this.boneMatrices[idx+10] = 1;
            this.boneMatrices[idx+15] = 1;
        }

        this.isLoaded = false;
    }

    updateBoneMatrices() {
        if (!this.skeleton || !this.skeleton.joints) return;

        const glm = window.glMatrix;
        if (!glm) return;

        const scene = this.materia.scene || window.SceneManager?.currentScene;
        if (!scene) return;

        for (let i = 0; i < this.skeleton.joints.length && i < 64; i++) {
            const jointMateria = scene.findMateriaById(this.skeleton.joints[i]);
            if (!jointMateria) continue;

            const transform = jointMateria.getComponent(window.Components.Transform);
            const worldMatrix = transform.worldMatrix;

            // Bone Matrix = WorldMatrix * InverseBindMatrix
            const invBind = new Float32Array(this.skeleton.inverseBindMatrices.buffer, this.skeleton.inverseBindMatrices.byteOffset + i * 64, 16);
            const boneMat = glm.mat4.create();
            glm.mat4.multiply(boneMat, worldMatrix, invBind);

            this.boneMatrices.set(boneMat, i * 16);
        }
    }

    clone() {
        const copy = new SkinnedMeshRenderer3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

/**
 * Animator3D: Gestiona la reproducción de animaciones 3D en un SkinnedMeshRenderer3D.
 */
export class Animator3D extends Leyes {
    static actionableMethods = {
        'play': ['reproducir', 'воспроизвести', '播放'],
        'stop': ['detener', 'остановить', '停止'],
        'pause': ['pausar', 'приостановить', '暂停']
    };

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
        if (name) {
            this.currentAnimation = this.animations.find(a => a.name === name);
        } else if (this.animations.length > 0) {
            this.currentAnimation = this.animations[0];
        }
        this.isPlaying = true;
        this.time = 0;
    }

    stop() {
        this.isPlaying = false;
        this.time = 0;
    }

    pause() {
        this.isPlaying = false;
    }

    update(deltaTime) {
        if (!this.isPlaying || !this.currentAnimation) return;

        this.time += deltaTime * this.speed;
        const duration = this.getMaxTime();
        if (this.time > duration) {
            if (this.loop) this.time %= duration;
            else {
                this.time = duration;
                this.isPlaying = false;
            }
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
        const glm = window.glMatrix;
        if (!glm) return;

        const scene = this.materia.scene || window.SceneManager?.currentScene;
        if (!scene) return;

        for (const channel of this.currentAnimation.channels) {
            const targetMateria = scene.findMateriaById(channel.node);
            if (!targetMateria) continue;

            const transform = targetMateria.getComponent(window.Components.Transform);
            if (!transform) continue;

            const value = this.interpolate(channel, time);
            if (!value) continue;

            if (channel.path === 'translation') {
                transform.localPosition = { x: value[0], y: value[1], z: value[2] };
            } else if (channel.path === 'rotation') {
                const euler = glm.vec3.create();
                const q = glm.quat.fromValues(value[0], value[1], value[2], value[3]);
                this.quatToEuler(euler, q);
                transform.localRotation = { x: euler[0], y: euler[1], z: euler[2] };
            } else if (channel.path === 'scale') {
                transform.localScale = { x: value[0], y: value[1], z: value[2] };
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

        if (channel.path === 'rotation') {
            const mag = Math.sqrt(result[0]**2 + result[1]**2 + result[2]**2 + result[3]**2);
            result[0] /= mag; result[1] /= mag; result[2] /= mag; result[3] /= mag;
        }

        return result;
    }

    quatToEuler(out, q) {
        const x = q[0], y = q[1], z = q[2], w = q[3];
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        out[0] = Math.atan2(yz + wx, 1 - (xx + yy)) * 180 / Math.PI;
        out[1] = Math.asin(Math.max(-1, Math.min(1, wy - xz))) * 180 / Math.PI;
        out[2] = Math.atan2(xy + wz, 1 - (yy + zz)) * 180 / Math.PI;
    }

    clone() {
        const copy = new Animator3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

// Register 3D Components
registerComponent('MeshRenderer3D', MeshRenderer3D);
registerComponent('SkinnedMeshRenderer3D', SkinnedMeshRenderer3D);
registerComponent('DirectionalLight3D', DirectionalLight3D);
registerComponent('PointLight3D', PointLight3D);
registerComponent('SpotLight3D', SpotLight3D);
registerComponent('Rigidbody3D', Rigidbody3D);
registerComponent('BoxCollider3D', BoxCollider3D);
registerComponent('SphereCollider3D', SphereCollider3D);
registerComponent('Animator3D', Animator3D);
