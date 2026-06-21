// Components3D.js
// This file contains all the 3D-specific component classes.

import { Leyes } from './Leyes.js';
import { registerComponent } from './ComponentRegistry.js';

export class MeshRenderer3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.meshType = 'Cube'; // 'Cube', 'Sphere', 'Plane', 'Triangle', 'Capsule', 'Custom'
        this.color = '#ffffff';
        this.texturePath = null;
        this.normalMapPath = null;
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

export class CapsuleCollider3D extends Collider3D {
    constructor(materia) {
        super(materia);
        this.radius = 25;
        this.height = 100;
        this.direction = 'Y'; // 'X', 'Y', 'Z'
    }
    clone() {
        const copy = new CapsuleCollider3D(null);
        Object.assign(copy, this);
        copy.offset = { ...this.offset };
        return copy;
    }
}

export class PlaneCollider3D extends Collider3D {
    constructor(materia) {
        super(materia);
    }
    clone() {
        const copy = new PlaneCollider3D(null);
        Object.assign(copy, this);
        copy.offset = { ...this.offset };
        return copy;
    }
}

export class Terreno3D extends MeshRenderer3D {
    constructor(materia) {
        super(materia);
        this.meshType = 'Custom';
        this.resolution = 64; // 64x64 grid
        this.size = { x: 2000, z: 2000 };
        this.heightData = new Float32Array((this.resolution + 1) * (this.resolution + 1));
        this.holeData = new Uint8Array(this.resolution * this.resolution); // Per-quad mask
        this.colorData = new Float32Array((this.resolution + 1) * (this.resolution + 1) * 4);
        for(let i=0; i<this.colorData.length; i++) this.colorData[i] = 1.0;

        this.trees = []; // { prefabPath, pos, rot, scale }
        this.grass = []; // { type, pos, rot, scale, color }

        this.isDirty = true;
        this.cpuPositions = null;
        this.cpuNormals = null;
        this.cpuIndices = null;
        this.cpuColors = null;
        this.indexCount = 0;
    }

    setHeight(x, z, val) {
        if (x < 0 || x > this.resolution || z < 0 || z > this.resolution) return;
        this.heightData[z * (this.resolution + 1) + x] = val;
        this.isDirty = true;
    }

    getHeight(x, z) {
        if (x < 0 || x > this.resolution || z < 0 || z > this.resolution) return 0;
        return this.heightData[z * (this.resolution + 1) + x];
    }

    smoothHeight(x, z, strength = 0.5) {
        if (x <= 0 || x >= this.resolution || z <= 0 || z >= this.resolution) return;
        const res1 = this.resolution + 1;
        const neighbors = [
            this.heightData[z * res1 + (x - 1)],
            this.heightData[z * res1 + (x + 1)],
            this.heightData[(z - 1) * res1 + x],
            this.heightData[(z + 1) * res1 + x]
        ];
        const avg = neighbors.reduce((a, b) => a + b) / 4;
        const current = this.heightData[z * res1 + x];
        this.heightData[z * res1 + x] = current + (avg - current) * strength;
        this.isDirty = true;
    }

    setHole(x, z, isHole) {
        if (x < 0 || x >= this.resolution || z < 0 || z >= this.resolution) return;
        this.holeData[z * this.resolution + x] = isHole ? 1 : 0;
        this.isDirty = true;
    }

    isHole(x, z) {
        if (x < 0 || x >= this.resolution || z < 0 || z >= this.resolution) return false;
        return this.holeData[z * this.resolution + x] === 1;
    }

    setPaintColor(x, z, r, g, b, a = 1.0) {
        if (x < 0 || x > this.resolution || z < 0 || z > this.resolution) return;
        const idx = (z * (this.resolution + 1) + x) * 4;
        this.colorData[idx] = r;
        this.colorData[idx+1] = g;
        this.colorData[idx+2] = b;
        this.colorData[idx+3] = a;
        this.isDirty = true;
    }

    update(deltaTime) {
        if (this.isDirty) this.generateMesh();
    }

    generateMesh() {
        const res = this.resolution;
        const res1 = res + 1;
        const vertCount = res1 * res1;
        const positions = new Float32Array(vertCount * 3);
        const normals = new Float32Array(vertCount * 3);
        const colors = new Float32Array(vertCount * 4);
        const indices = []; // Use dynamic array because holes remove indices

        const stepX = this.size.x / res;
        const stepZ = this.size.z / res;
        const offsetX = -this.size.x / 2;
        const offsetZ = -this.size.z / 2;

        for (let z = 0; z <= res; z++) {
            for (let x = 0; x <= res; x++) {
                const i = z * res1 + x;
                const idx3 = i * 3;
                const idx4 = i * 4;

                positions[idx3] = offsetX + x * stepX;
                positions[idx3 + 1] = this.heightData[i];
                positions[idx3 + 2] = offsetZ + z * stepZ;

                colors[idx4] = this.colorData[idx4];
                colors[idx4+1] = this.colorData[idx4+1];
                colors[idx4+2] = this.colorData[idx4+2];
                colors[idx4+3] = this.colorData[idx4+3];

                // Normal calculation
                let hl = this.getHeight(x - 1, z);
                let hr = this.getHeight(x + 1, z);
                let hd = this.getHeight(x, z - 1);
                let hu = this.getHeight(x, z + 1);
                const normal = [hl - hr, 2.0, hd - hu];
                const mag = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
                normals[idx3] = normal[0] / mag;
                normals[idx3 + 1] = normal[1] / mag;
                normals[idx3 + 2] = normal[2] / mag;
            }
        }

        // Generate Indices with Hole support
        for (let z = 0; z < res; z++) {
            for (let x = 0; x < res; x++) {
                if (this.holeData[z * res + x] === 1) continue; // Skip quad if it's a hole

                const row1 = z * res1;
                const row2 = (z + 1) * res1;

                indices.push(row1 + x, row2 + x, row1 + x + 1);
                indices.push(row1 + x + 1, row2 + x, row2 + x + 1);
            }
        }

        this.cpuPositions = positions;
        this.cpuNormals = normals;
        this.cpuColors = colors;
        this.cpuIndices = new Uint16Array(indices);
        this.indexCount = indices.length;
        this.isDirty = false;
        this.isBuffersDirty = true;
    }

    clone() {
        const copy = new Terreno3D(null);
        Object.assign(copy, this);
        copy.heightData = new Float32Array(this.heightData);
        copy.size = { ...this.size };
        return copy;
    }
}

export class TerrenoCollider3D extends Collider3D {
    constructor(materia) {
        super(materia);
    }
    clone() {
        const copy = new TerrenoCollider3D(null);
        Object.assign(copy, this);
        copy.offset = { ...this.offset };
        return copy;
    }
}

export class SkinnedMeshRenderer3D extends MeshRenderer3D {
    constructor(materia) {
        super(materia);
        this.meshType = 'Custom';
        this.modelPath = null;
        this.skeleton = null;
        this.rootBone = null;
        this.cpuPositions = null;
        this.cpuNormals = null;
        this.cpuUVs = null;
        this.cpuColors = null;
        this.cpuIndices = null;
        this.cpuJoints = null;
        this.cpuWeights = null;
        this.indexCount = 0;
        this.isDirty = false;
        this.boneMatrices = new Float32Array(64 * 16);
        for(let i=0; i<64; i++) {
            const idx = i * 16;
            this.boneMatrices[idx] = 1; this.boneMatrices[idx+5] = 1; this.boneMatrices[idx+10] = 1; this.boneMatrices[idx+15] = 1;
        }
        this.isLoaded = false;
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.updateBoneMatrices();
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
            const invBind = new Float32Array(this.skeleton.inverseBindMatrices.buffer, this.skeleton.inverseBindMatrices.byteOffset + i * 64, 16);
            const boneMat = glm.mat4.create();
            glm.mat4.multiply(boneMat, transform.worldMatrix, invBind);
            this.boneMatrices.set(boneMat, i * 16);
        }
    }

    clone() {
        const copy = new SkinnedMeshRenderer3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

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
        const glm = window.glMatrix;
        if (!glm) return;

        // Use the materia's own scene if assigned, otherwise fallback to the current active scene.
        // Important: During preview in the Inspector, the materia should have its own previewScene.
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
        const yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
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

export class HumanoidPhysics3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.height = 180;
        this.leftLegChain = [];
        this.rightLegChain = [];
        this.isGrounded = true;
    }
    update(deltaTime) {}
    clone() { return new HumanoidPhysics3D(null); }
}

export class MovementControl3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.walkCycleTime = 0;
        this.walkSpeedMultiplier = 12.0;
        this.bobAmount = 8;
        this.swayAmount = 4;
        this.armSwingAmount = 35;
    }

    update(deltaTime) {
        if (!window.isGameRunning) return;
        const rb = this.materia.getComponent(Rigidbody3D);
        if (!rb) return;

        const groundSpeed = Math.sqrt(rb.velocity.x * rb.velocity.x + rb.velocity.z * rb.velocity.z);
        if (groundSpeed > 0.1) {
            this.walkCycleTime += deltaTime * this.walkSpeedMultiplier * Math.min(2.0, groundSpeed * 0.5);
            this._applyProceduralWalk();
        } else {
            this.walkCycleTime = 0;
            this._applyProceduralIdle();
        }
    }

    _applyProceduralWalk() {
        const hip = this.materia.findChildByName('Cadera', true);
        const torso = this.materia.findChildByName('Torso', true);
        const neck = this.materia.findChildByName('Cuello', true);
        const armL = this.materia.findChildByName('Brazo_I', true);
        const armR = this.materia.findChildByName('Brazo_D', true);
        const legL = this.materia.findChildByName('Pierna_I', true);
        const legR = this.materia.findChildByName('Pierna_D', true);

        const sin = Math.sin(this.walkCycleTime);
        const cos = Math.cos(this.walkCycleTime);

        if (hip) {
            const hTrans = hip.getComponent(window.Components.Transform);
            hTrans.localPosition.y = -Math.abs(sin) * this.bobAmount;
            hTrans.localRotation.z = cos * this.swayAmount;
        }
        if (torso) {
            const tTrans = torso.getComponent(window.Components.Transform);
            tTrans.localRotation.x = Math.abs(cos) * 3;
            tTrans.localRotation.y = -sin * 5;
        }
        if (neck) neck.getComponent(window.Components.Transform).localRotation.y = sin * 3;
        if (armL) armL.getComponent(window.Components.Transform).localRotation.x = sin * this.armSwingAmount;
        if (armR) armR.getComponent(window.Components.Transform).localRotation.x = -sin * this.armSwingAmount;
        if (legL) legL.getComponent(window.Components.Transform).localRotation.x = -sin * (this.armSwingAmount * 1.2);
        if (legR) legR.getComponent(window.Components.Transform).localRotation.x = sin * (this.armSwingAmount * 1.2);
    }

    _applyProceduralIdle() {
        const hip = this.materia.findChildByName('Cadera', true);
        const torso = this.materia.findChildByName('Torso', true);
        const neck = this.materia.findChildByName('Cuello', true);
        const armL = this.materia.findChildByName('Brazo_I', true);
        const armR = this.materia.findChildByName('Brazo_D', true);

        const time = performance.now() / 1000;
        const breathe = Math.sin(time * 2);

        if (hip) hip.getComponent(window.Components.Transform).localRotation.x = breathe * 1;
        if (torso) torso.getComponent(window.Components.Transform).localRotation.x = breathe * 2;
        if (neck) neck.getComponent(window.Components.Transform).localRotation.x = -breathe * 1;
        if (armL) armL.getComponent(window.Components.Transform).localRotation.z = -5 - breathe * 2;
        if (armR) armR.getComponent(window.Components.Transform).localRotation.z = 5 + breathe * 2;
    }
    clone() { return new MovementControl3D(null); }
}

export class HealthController3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.maxHealth = 100;
        this.currentHealth = 100;
    }
    clone() { return new HealthController3D(null); }
}

export class ProceduralChain3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.bones = []; // Array of materia IDs
        this.stiffness = 0.5;
        this.gravity = 1.0;
        this.delay = 0.1;
        this.lastPositions = [];
    }

    update(deltaTime) {
        if (!window.isGameRunning || this.bones.length === 0) return;
        const scene = this.materia.scene || window.SceneManager?.currentScene;
        if (!scene) return;

        for (let i = 0; i < this.bones.length; i++) {
            const bone = scene.findMateriaById(this.bones[i]);
            if (!bone) continue;
            const trans = bone.getComponent(window.Components.Transform);

            // Basic follow logic with delay for "jiggle" or "cloth" effect
            if (i > 0) {
                const prevBone = scene.findMateriaById(this.bones[i-1]);
                if (prevBone) {
                    const prevTrans = prevBone.getComponent(window.Components.Transform);
                    // To hang down we subtract from Y
                    const targetPos = { ...prevTrans.position };
                    targetPos.y -= 20 * this.gravity;

                    trans.position.x += (targetPos.x - trans.position.x) * this.stiffness;
                    trans.position.y += (targetPos.y - trans.position.y) * this.stiffness;
                    trans.position.z += (targetPos.z - trans.position.z) * this.stiffness;
                }
            }
        }
    }
    clone() { return new ProceduralChain3D(null); }
}

export class ClothRenderer3D extends SkinnedMeshRenderer3D {
    constructor(materia) {
        super(materia);
        this.clothRes = { x: 10, y: 10 };
        this.pinnedPoints = [0, 9]; // Indices of pinned vertices
    }
    // Logic for Verlet integration or similar would go here
    update(deltaTime) {
        super.update(deltaTime);
        // Simplified cloth physics placeholder
    }
    clone() { return new ClothRenderer3D(null); }
}

export class ThirdPersonController3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.moveSpeed = 400;
        this.turnSpeed = 15;
        this.jumpForce = 600;
        this.acceleration = 10;
        this.deceleration = 10;
    }

    update(deltaTime) {
        if (!window.isGameRunning) return;
        const input = window.RuntimeAPIManager.getAPI('input');
        if (!input) return;

        const rb = this.materia.getComponent(Rigidbody3D);
        const transform = this.materia.getComponent(window.Components.Transform);
        if (!rb || !transform) return;

        let inputX = 0, inputZ = 0;
        if (input.isKeyPressed('w')) inputZ = -1;
        if (input.isKeyPressed('s')) inputZ = 1;
        if (input.isKeyPressed('a')) inputX = -1;
        if (input.isKeyPressed('d')) inputX = 1;

        let moveDir = { x: 0, z: 0 };
        const scene = this.materia.scene || window.SceneManager?.currentScene;
        const camera = scene?.findFirstCamera();

        if (camera && (inputX !== 0 || inputZ !== 0)) {
            const camTrans = camera.getComponent(window.Components.Transform);
            const camYaw = camTrans.rotationY * Math.PI / 180;
            const forward = { x: Math.sin(camYaw), z: Math.cos(camYaw) };
            const right = { x: Math.cos(camYaw), z: -Math.sin(camYaw) };
            moveDir.x = forward.x * inputZ + right.x * inputX;
            moveDir.z = forward.z * inputZ + right.z * inputX;
            const mag = Math.sqrt(moveDir.x * moveDir.x + moveDir.z * moveDir.z);
            moveDir.x /= mag; moveDir.z /= mag;

            const targetYaw = Math.atan2(moveDir.x, moveDir.z) * 180 / Math.PI;
            let diff = targetYaw - transform.rotationY;
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            transform.rotationY += diff * this.turnSpeed * deltaTime;
        }

        const targetVelX = moveDir.x * (this.moveSpeed / 100);
        const targetVelZ = moveDir.z * (this.moveSpeed / 100);
        const lerpFactor = (inputX !== 0 || inputZ !== 0) ? this.acceleration : this.deceleration;
        rb.velocity.x += (targetVelX - rb.velocity.x) * lerpFactor * deltaTime;
        rb.velocity.z += (targetVelZ - rb.velocity.z) * lerpFactor * deltaTime;

        if (input.isKeyJustPressed('space')) {
            const hp = this.materia.getComponent(HumanoidPhysics3D);
            if (!hp || hp.isGrounded) rb.addForce(0, this.jumpForce, 0);
        }
    }
    clone() { return new ThirdPersonController3D(null); }
}

export class CameraControl3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.target = null;
        this.distance = 450;
        this.height = 60;
        this.yaw = 0;
        this.pitch = 20;
        this.smoothSpeed = 10;
        this.sensitivity = 0.2;
    }

    update(deltaTime) {
        if (!window.isGameRunning) return;
        const input = window.RuntimeAPIManager.getAPI('input');
        if (!input) return;

        if (input.isMouseButtonPressed(2) || input.isMouseButtonPressed(0)) {
            const delta = input.getMouseDelta ? input.getMouseDelta() : { x: 0, y: 0 };
            this.yaw -= delta.x * this.sensitivity;
            this.pitch += delta.y * this.sensitivity;
            this.pitch = Math.max(-10, Math.min(70, this.pitch));
        }

        const scene = this.materia.scene || window.SceneManager?.currentScene;
        if (!scene) return;
        let targetMtr = this.target ? (typeof this.target === 'number' ? scene.findMateriaById(this.target) : scene.findMateriaByName(this.target)) : this.materia.parent;
        if (!targetMtr) return;

        const targetTrans = targetMtr.getComponent(window.Components.Transform);
        const myTrans = this.materia.getComponent(window.Components.Transform);

        const rad = this.yaw * Math.PI / 180;
        const pitchRad = this.pitch * Math.PI / 180;
        const offsetX = Math.sin(rad) * Math.cos(pitchRad) * this.distance;
        const offsetZ = Math.cos(rad) * Math.cos(pitchRad) * this.distance;
        const offsetY = Math.sin(pitchRad) * this.distance;

        const targetX = targetTrans.position.x + offsetX;
        const targetY = targetTrans.position.y + offsetY + this.height;
        const targetZ = targetTrans.position.z + offsetZ;

        const curPos = myTrans.position;
        myTrans.position = {
            x: curPos.x + (targetX - curPos.x) * this.smoothSpeed * deltaTime,
            y: curPos.y + (targetY - curPos.y) * this.smoothSpeed * deltaTime,
            z: curPos.z + (targetZ - curPos.z) * this.smoothSpeed * deltaTime
        };

        myTrans.rotationX = this.pitch;
        myTrans.rotationY = this.yaw + 180;
    }
    clone() { return new CameraControl3D(null); }
}

export class DeformableMesh3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.strength = 1.0;
        this.radius = 20;
    }
    onCollision(hitPoint, force) {
        const renderer = this.materia.getComponent(MeshRenderer3D) || this.materia.getComponent(SkinnedMeshRenderer3D);
        if (!renderer || !renderer.cpuPositions) return;
        const glm = window.glMatrix;
        const transform = this.materia.getComponent(window.Components.Transform);
        const invMat = glm.mat4.invert(glm.mat4.create(), transform.worldMatrix);
        const localHit = glm.vec3.transformMat4(glm.vec3.create(), [hitPoint.x, hitPoint.y, hitPoint.z], invMat);

        let changed = false;
        for (let i = 0; i < renderer.cpuPositions.length; i += 3) {
            const dx = renderer.cpuPositions[i] - localHit[0], dy = renderer.cpuPositions[i+1] - localHit[1], dz = renderer.cpuPositions[i+2] - localHit[2];
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist < this.radius) {
                const move = this.strength * (1.0 - (dist / this.radius)) * (force / 100);
                renderer.cpuPositions[i] -= dx * move; renderer.cpuPositions[i+1] -= dy * move; renderer.cpuPositions[i+2] -= dz * move;
                changed = true;
            }
        }
        if (changed) renderer.isDirty = true;
    }
    clone() { return new DeformableMesh3D(null); }
}

registerComponent('MeshRenderer3D', MeshRenderer3D);
registerComponent('SkinnedMeshRenderer3D', SkinnedMeshRenderer3D);
registerComponent('DirectionalLight3D', DirectionalLight3D);
registerComponent('PointLight3D', PointLight3D);
registerComponent('SpotLight3D', SpotLight3D);
registerComponent('Rigidbody3D', Rigidbody3D);
registerComponent('BoxCollider3D', BoxCollider3D);
registerComponent('SphereCollider3D', SphereCollider3D);
registerComponent('CapsuleCollider3D', CapsuleCollider3D);
registerComponent('PlaneCollider3D', PlaneCollider3D);
registerComponent('Terreno3D', Terreno3D);
registerComponent('TerrenoCollider3D', TerrenoCollider3D);
registerComponent('Animator3D', Animator3D);
registerComponent('HumanoidPhysics3D', HumanoidPhysics3D);
registerComponent('MovementControl3D', MovementControl3D);
registerComponent('HealthController3D', HealthController3D);
registerComponent('ThirdPersonController3D', ThirdPersonController3D);
registerComponent('CameraControl3D', CameraControl3D);
registerComponent('DeformableMesh3D', DeformableMesh3D);
export class WheelCollider3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.radius = 35;
        this.suspensionDistance = 40;
        this.suspensionStiffness = 50;
        this.suspensionDamping = 5;
        this.friction = 1.0;

        // Runtime state
        this.isGrounded = false;
        this.contactPoint = { x: 0, y: 0, z: 0 };
        this.contactNormal = { x: 0, y: 1, z: 0 };
        this.suspensionLength = 0;
        this.lastSuspensionLength = 0;
    }
    clone() {
        const copy = new WheelCollider3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

export class VehicleController3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.wheels = []; // List of materia IDs
        this.motorForce = 1500;
        this.brakeForce = 2000;
        this.maxSteerAngle = 35;
        this.driftIntensity = 0.5;

        // Internal state
        this.currentSteer = 0;
        this.isDrifting = false;
    }

    update(deltaTime) {
        if (!window.isGameRunning) return;
        const rb = this.materia.getComponent(Rigidbody3D);
        if (!rb) return;

        const input = window.RuntimeAPIManager?.getAPI('input');
        if (!input) return;

        let accel = 0;
        if (input.isKeyPressed('w')) accel = 1;
        if (input.isKeyPressed('s')) accel = -1;

        let steer = 0;
        if (input.isKeyPressed('a')) steer = -1;
        if (input.isKeyPressed('d')) steer = 1;

        const handbrake = input.isKeyPressed('shift') || input.isKeyPressed(' ');
        this.isDrifting = handbrake;

        const scene = this.materia.scene || window.SceneManager?.currentScene;
        const physics = scene?.physicsSystem;
        if (!physics) return;

        this.currentSteer += (steer * this.maxSteerAngle - this.currentSteer) * 5 * deltaTime;

        this.wheels.forEach((wheelId, index) => {
            const wheelMtr = scene.findMateriaById(wheelId);
            if (!wheelMtr) return;

            const wheelCol = wheelMtr.getComponent(WheelCollider3D);
            if (!wheelCol) return;

            const transform = wheelMtr.getComponent(window.Components.Transform);
            const worldPos = transform.position;
            const downDir = { x: 0, y: -1, z: 0 };

            // Raycast for suspension
            const hit = physics.raycast3D(worldPos, downDir, wheelCol.suspensionDistance + wheelCol.radius);

            if (hit && hit.materia.id !== this.materia.id) {
                wheelCol.isGrounded = true;
                wheelCol.contactPoint = hit.point;
                wheelCol.contactNormal = hit.normal;

                const currentDist = hit.distance - wheelCol.radius;
                const compression = wheelCol.suspensionDistance - currentDist;

                // 1. Suspension Force (Hooke's Law)
                const springForce = compression * wheelCol.suspensionStiffness;
                const velocityAtWheel = rb.velocity.y; // Simplified
                const dampingForce = (currentDist - wheelCol.lastSuspensionLength) / deltaTime * wheelCol.suspensionDamping;

                const totalSuspensionForce = springForce - dampingForce;
                rb.addForce(0, totalSuspensionForce, 0); // Push chassis UP (+Y)

                wheelCol.lastSuspensionLength = currentDist;

                // 2. Motor & Steering (Only if grounded)
                const isFrontWheel = index < 2;
                if (isFrontWheel) {
                    transform.localRotationY = this.currentSteer;
                }

                if (accel !== 0) {
                    const forward = this._getForwardVector();
                    const force = accel * this.motorForce;
                    rb.addForce(forward.x * force, forward.y * force, forward.z * force);
                }

                // 3. Friction & Drift
                const sideVelocity = this._getSideVelocity(rb);
                const frictionImpulse = -sideVelocity * wheelCol.friction * (this.isDrifting ? (1.0 - this.driftIntensity) : 1.0);
                const sideDir = this._getRightVector();
                rb.addForce(sideDir.x * frictionImpulse * 10, 0, sideDir.z * frictionImpulse * 10);

            } else {
                wheelCol.isGrounded = false;
                wheelCol.lastSuspensionLength = wheelCol.suspensionDistance;
            }

            // Visual wheel rotation
            if (accel !== 0 || Math.abs(rb.velocity.x) + Math.abs(rb.velocity.z) > 1) {
                const speed = Math.sqrt(rb.velocity.x**2 + rb.velocity.z**2);
                transform.localRotationX += speed * deltaTime * 5;
            }
        });
    }

    _getForwardVector() {
        const t = this.materia.getComponent(window.Components.Transform);
        const yaw = t.rotationY * Math.PI / 180;
        return { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) };
    }

    _getRightVector() {
        const t = this.materia.getComponent(window.Components.Transform);
        const yaw = (t.rotationY + 90) * Math.PI / 180;
        return { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) };
    }

    _getSideVelocity(rb) {
        const right = this._getRightVector();
        return rb.velocity.x * right.x + rb.velocity.z * right.z;
    }

    clone() { return new VehicleController3D(null); }
}

registerComponent('ProceduralChain3D', ProceduralChain3D);
registerComponent('ClothRenderer3D', ClothRenderer3D);
registerComponent('WheelCollider3D', WheelCollider3D);
registerComponent('VehicleController3D', VehicleController3D);
