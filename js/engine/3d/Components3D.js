// js/engine/3d/Components3D.js
// Independent 3D Components architecture.

import { BaseComponent3D } from './BaseComponent3D.js';
import { registerComponent } from '../ComponentRegistry.js';

export class Transform3D extends BaseComponent3D {
    get position() { return this.localPosition; }
    set position(v) { this.localPosition = v; }
    get rotation() { return this.localRotation; }
    set rotation(v) { this.localRotation = v; }
    get scale() { return this.localScale; }
    set scale(v) { this.localScale = v; }
    constructor(materia) {
        super(materia);
        this.localPosition = { x: 0, y: 0, z: 0 };
        this.localRotation = { x: 0, y: 0, z: 0 };
        this.localScale = { x: 1, y: 1, z: 1 };
        this.worldMatrix = window.glMatrix ? window.glMatrix.mat4.create() : new Float32Array(16);
    }
}

export class MeshRenderer3D extends BaseComponent3D {
    constructor(materia) {
        super(materia);
        this.meshType = 'Cube';
        this.color = '#ffffff';
        this.texturePath = null;
        this.normalMapPath = null;
        this.isUnlit = false;
    }
}

export class Camera3D extends BaseComponent3D {
    constructor(materia) {
        super(materia);
        this.fov = 60;
        this.nearClipPlane = 0.1;
        this.farClipPlane = 20000;
        this.projection = 'Perspective';
        this.clearFlags = 'Skybox';
        this.backgroundColor = '#000000';
        this.cullingMask = -1;
        this.depth = 0;
    }
}

export class Light3D extends BaseComponent3D {
    constructor(materia) {
        super(materia);
        this.color = '#ffffff';
        this.intensity = 1.0;
    }
}

export class DirectionalLight3D extends Light3D {}
export class PointLight3D extends Light3D {
    constructor(materia) {
        super(materia);
        this.range = 500;
    }
}

export class Rigidbody3D extends BaseComponent3D {
    constructor(materia) {
        super(materia);
        this.mass = 1.0;
        this.useGravity = true;
        this.velocity = { x: 0, y: 0, z: 0 };
    }
}

export class Collider3D extends BaseComponent3D {
    constructor(materia) {
        super(materia);
        this.offset = { x: 0, y: 0, z: 0 };
    }
}

export class BoxCollider3D extends Collider3D {
    constructor(materia) {
        super(materia);
        this.size = { x: 100, y: 100, z: 100 };
    }
}

export class SphereCollider3D extends Collider3D {
    constructor(materia) {
        super(materia);
        this.radius = 50;
    }
}

export class CapsuleCollider3D extends Collider3D {
    constructor(materia) {
        super(materia);
        this.radius = 25;
        this.height = 100;
    }
}

export class PlaneCollider3D extends Collider3D {}

export class Terreno3D extends MeshRenderer3D {
    constructor(materia) {
        super(materia);
        this.resolution = 64;
        this.size = { x: 2000, z: 2000 };
        this.heightData = new Float32Array((this.resolution + 1) * (this.resolution + 1));
        this.colorData = new Float32Array((this.resolution + 1) * (this.resolution + 1) * 4).fill(1.0);
        this.isDirty = true;
    }
}

export class TerrenoCollider3D extends Collider3D {}

export class SkinnedMeshRenderer3D extends MeshRenderer3D {
    constructor(materia) {
        super(materia);
        this.modelPath = null;
        this.skeleton = null;
        this.boneMatrices = new Float32Array(64 * 16);
        this.isLoaded = false;
        this.cpuPositions = null;
        this.cpuNormals = null;
        this.cpuUVs = null;
        this.cpuColors = null;
        this.cpuIndices = null;
        this.cpuJoints = null;
        this.cpuWeights = null;
        this.indexCount = 0;
    }

    update(deltaTime) {
        if (!this.skeleton || !this.skeleton.joints) return;
        const glm = window.glMatrix;
        if (!glm) return;
        const scene = this.materia.scene || window.SceneManager?.currentScene;
        if (!scene) return;

        for (let i = 0; i < this.skeleton.joints.length && i < 64; i++) {
            const jointMateria = scene.findMateriaById(this.skeleton.joints[i]);
            if (!jointMateria) continue;
            const transform = jointMateria.getComponentByName('Transform3D');
            const invBind = new Float32Array(this.skeleton.inverseBindMatrices.buffer, this.skeleton.inverseBindMatrices.byteOffset + i * 64, 16);
            const boneMat = glm.mat4.create();
            glm.mat4.multiply(boneMat, transform.worldMatrix, invBind);
            this.boneMatrices.set(boneMat, i * 16);
        }
    }
    constructor(materia) {
        super(materia);
        this.modelPath = null;
        this.boneMatrices = new Float32Array(64 * 16);
        this.isLoaded = false;
    }
}

export class Animator3D extends BaseComponent3D {
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
        const glm = window.glMatrix;
        if (!glm) return;
        const scene = this.materia.scene || window.SceneManager?.currentScene;
        if (!scene) return;

        for (const channel of this.currentAnimation.channels) {
            const targetMateria = scene.findMateriaById(channel.node);
            if (!targetMateria) continue;
            const transform = targetMateria.getComponentByName('Transform3D');
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
        if (time >= times[times.length - 1]) return values.slice(-compCount);
        let i = 0;
        for (; i < times.length - 1; i++) if (time >= times[i] && time <= times[i + 1]) break;
        const t = (time - times[i]) / (times[i + 1] - times[i]);
        const result = new Float32Array(compCount);
        for (let j = 0; j < compCount; j++) result[j] = values[i * compCount + j] + (values[(i + 1) * compCount + j] - values[i * compCount + j]) * t;
        return result;
    }

    quatToEuler(out, q) {
        const x = q[0], y = q[1], z = q[2], w = q[3];
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
        out[0] = Math.atan2(yz + wx, 1 - (xx + yy)) * 180 / Math.PI;
        out[1] = Math.asin(Math.max(-1, Math.min(1, wy - xz))) * 180 / Math.PI;
        out[2] = Math.atan2(xy + wz, 1 - (yy + zz)) * 180 / Math.PI;
    }
    constructor(materia) {
        super(materia);
        this.animations = [];
        this.isPlaying = false;
        this.speed = 1.0;
    }
}

export class Bone extends BaseComponent3D {}

// Registration
const comps = {
    Transform3D, MeshRenderer3D, Camera3D, DirectionalLight3D, PointLight3D,
    Rigidbody3D, BoxCollider3D, SphereCollider3D, CapsuleCollider3D,
    PlaneCollider3D, Terreno3D, TerrenoCollider3D, SkinnedMeshRenderer3D,
    Animator3D, Bone
};

for (const [name, cls] of Object.entries(comps)) {
    registerComponent(name, cls);
}

export { Transform3D as Transform, Camera3D as Camera };
