// Components3D.js
// This file contains all the 3D-specific component classes.
// It is completely independent of the 2D engine.

import { BaseComponent3D } from './BaseComponent3D.js';
import { registerComponent } from '../ComponentRegistry.js';
import { getURLForAssetPath } from '../AssetUtils.js';
import * as MathUtils3D from './MathUtils3D.js';

// Import gl-matrix for 3D transformations
import * as glMatrix from 'gl-matrix';
const { mat4, vec3, quat, vec4 } = glMatrix;

export class Transform extends BaseComponent3D {
    constructor(materia) {
        super(materia);
        this.localPosition = { x: 0, y: 0, z: 0 };
        this.localRotation = { x: 0, y: 0, z: 0 }; // Euler angles
        this.localScale = { x: 1, y: 1, z: 1 };
    }

    get position() {
        if (!this.materia || !this.materia.parent) {
            return { ...this.localPosition };
        }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) {
            return { ...this.localPosition };
        }

        const parentMatrix = parentTransform.worldMatrix;
        const localVec = vec4.fromValues(this.localPosition.x, this.localPosition.y, this.localPosition.z, 1.0);
        const worldVec = vec4.create();
        vec4.transformMat4(worldVec, localVec, parentMatrix);

        return { x: worldVec[0], y: worldVec[1], z: worldVec[2] };
    }

    set position(worldPosition) {
        if (!this.materia || !this.materia.parent) {
            this.localPosition = { ...worldPosition };
            return;
        }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) {
            this.localPosition = { ...worldPosition };
            return;
        }

        const invParentMatrix = mat4.create();
        mat4.invert(invParentMatrix, parentTransform.worldMatrix);

        const worldVec = vec4.fromValues(worldPosition.x, worldPosition.y, worldPosition.z, 1.0);
        const localVec = vec4.create();
        vec4.transformMat4(localVec, worldVec, invParentMatrix);

        this.localPosition = { x: localVec[0], y: localVec[1], z: localVec[2] };
    }

    get worldMatrix() {
        const m = mat4.create();
        const q = quat.create();
        quat.fromEuler(q, this.localRotation.x || 0, this.localRotation.y || 0, this.localRotation.z || 0);
        const pos = [this.localPosition.x, this.localPosition.y, this.localPosition.z];
        const scale = [this.localScale.x, this.localScale.y, this.localScale.z];
        mat4.fromRotationTranslationScale(m, q, pos, scale);

        if (this.materia && this.materia.parent) {
            let parentMateria = this.materia.parent;
            if (typeof parentMateria === 'number') {
                parentMateria = (this.materia.scene || window.SceneManager?.currentScene)?.findMateriaById(parentMateria);
            }
            const parentTransform = parentMateria ? parentMateria.getComponent(Transform) : null;
            if (parentTransform) {
                mat4.multiply(m, parentTransform.worldMatrix, m);
            }
        }
        return m;
    }

    get x() { return this.position.x; }
    set x(v) { this.position = { ...this.position, x: v }; }
    get y() { return this.position.y; }
    set y(v) { this.position = { ...this.position, y: v }; }
    get z() { return this.position.z; }
    set z(v) { this.position = { ...this.position, z: v }; }

    get rotationX() {
        const q = quat.create();
        mat4.getRotation(q, this.worldMatrix);
        const euler = vec3.create();
        MathUtils3D.quatToEuler(euler, q);
        return euler[0];
    }
    set rotationX(v) { this.localRotation.x = v; } // Simplified for 3D separation

    get rotationY() {
        const q = quat.create();
        mat4.getRotation(q, this.worldMatrix);
        const euler = vec3.create();
        MathUtils3D.quatToEuler(euler, q);
        return euler[1];
    }
    set rotationY(v) { this.localRotation.y = v; }

    get rotationZ() {
        const q = quat.create();
        mat4.getRotation(q, this.worldMatrix);
        const euler = vec3.create();
        MathUtils3D.quatToEuler(euler, q);
        return euler[2];
    }
    set rotationZ(v) { this.localRotation.z = v; }

    clone() {
        const newTransform = new Transform(null);
        newTransform.localPosition = { ...this.localPosition };
        newTransform.localRotation = { ...this.localRotation };
        newTransform.localScale = { ...this.localScale };
        return newTransform;
    }
}

export class Camera extends BaseComponent3D {
    constructor(materia) {
        super(materia);
        this.depth = 0;
        this.projection = 'Perspective';
        this.fov = 60;
        this.nearClipPlane = 0.1;
        this.farClipPlane = 20000;
        this.clearFlags = 'Skybox';
        this.backgroundColor = '#1e293b';
        this.cullingMask = -1;
        this.rect = { x: 0, y: 0, w: 1, h: 1 };
    }
    clone() {
        const newCamera = new Camera(null);
        Object.assign(newCamera, this);
        newCamera.rect = { ...this.rect };
        return newCamera;
    }
}

export class MeshRenderer3D extends BaseComponent3D {
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

export class Rigidbody3D extends BaseComponent3D {
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

export class Collider3D extends BaseComponent3D {
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
        this.resolution = 64;
        this.size = { x: 2000, z: 2000 };
        this.heightData = new Float32Array((this.resolution + 1) * (this.resolution + 1));
        this.holeData = new Uint8Array(this.resolution * this.resolution);
        this.colorData = new Float32Array((this.resolution + 1) * (this.resolution + 1) * 4);
        for(let i=0; i<this.colorData.length; i++) this.colorData[i] = 1.0;
        this.grass = [];
        this.isDirty = true;
        this.cpuPositions = null;
        this.cpuNormals = null;
        this.cpuIndices = null;
        this.cpuColors = null;
        this.indexCount = 0;
    }

    getHeight(x, z) {
        if (x < 0 || x > this.resolution || z < 0 || z > this.resolution) return 0;
        return this.heightData[z * (this.resolution + 1) + x];
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
        const indices = [];

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

        for (let z = 0; z < res; z++) {
            for (let x = 0; x < res; x++) {
                if (this.holeData[z * res + x] === 1) continue;
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
        this.isLoaded = false;
        this.boneMatrices = new Float32Array(64 * 16);
        for(let i=0; i<64; i++) {
            const idx = i * 16;
            this.boneMatrices[idx] = 1; this.boneMatrices[idx+5] = 1; this.boneMatrices[idx+10] = 1; this.boneMatrices[idx+15] = 1;
        }
    }

    update(deltaTime) {
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
            const transform = jointMateria.getComponent(Transform);
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
            const transform = targetMateria.getComponent(Transform);
            if (!transform) continue;

            const value = this.interpolate(channel, time);
            if (!value) continue;

            if (channel.path === 'translation') {
                transform.localPosition = { x: value[0], y: value[1], z: value[2] };
            } else if (channel.path === 'rotation') {
                const euler = glm.vec3.create();
                const q = glm.quat.fromValues(value[0], value[1], value[2], value[3]);
                MathUtils3D.quatToEuler(euler, q);
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

    clone() {
        const copy = new Animator3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

export class WheelCollider3D extends BaseComponent3D {
    constructor(materia) {
        super(materia);
        this.radius = 35;
        this.suspensionDistance = 40;
        this.suspensionStiffness = 50;
        this.suspensionDamping = 5;
        this.friction = 1.0;
        this.lastSuspensionLength = 0;
    }
    clone() {
        const copy = new WheelCollider3D(null);
        Object.assign(copy, this);
        return copy;
    }
}

export class VehicleController3D extends BaseComponent3D {
    constructor(materia) {
        super(materia);
        this.wheels = [];
        this.motorForce = 1500;
        this.maxSteerAngle = 35;
        this.currentSteer = 0;
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

        const scene = this.materia.scene || window.SceneManager?.currentScene;
        const physics = scene?.physicsSystem;
        if (!physics) return;

        this.currentSteer += (steer * this.maxSteerAngle - this.currentSteer) * 5 * deltaTime;

        this.wheels.forEach((wheelId, index) => {
            const wheelMtr = scene.findMateriaById(wheelId);
            if (!wheelMtr) return;
            const wheelCol = wheelMtr.getComponent(WheelCollider3D);
            if (!wheelCol) return;
            const transform = wheelMtr.getComponent(Transform);
            const downDir = { x: 0, y: -1, z: 0 };
            const hit = physics.raycast3D(transform.position, downDir, wheelCol.suspensionDistance + wheelCol.radius);

            if (hit && hit.materia.id !== this.materia.id) {
                const currentDist = hit.distance - wheelCol.radius;
                const compression = wheelCol.suspensionDistance - currentDist;
                const springForce = compression * wheelCol.suspensionStiffness;
                const dampingForce = (currentDist - wheelCol.lastSuspensionLength) / deltaTime * wheelCol.suspensionDamping;
                rb.addForce(0, springForce - dampingForce, 0);
                wheelCol.lastSuspensionLength = currentDist;

                if (index < 2) transform.localRotationY = this.currentSteer;
                if (accel !== 0) {
                    const yaw = this.materia.getComponent(Transform).rotationY * Math.PI / 180;
                    rb.addForce(Math.sin(yaw) * accel * this.motorForce, 0, Math.cos(yaw) * accel * this.motorForce);
                }
            } else {
                wheelCol.lastSuspensionLength = wheelCol.suspensionDistance;
            }
        });
    }
    clone() { return new VehicleController3D(null); }
}

export class CreativeScript3D extends BaseComponent3D {
    constructor(materia, scriptName) {
        super(materia);
        this.scriptName = scriptName;
        this.publicVars = {};
        this.instance = null;
        this.isInitialized = false;
    }

    async initializeInstance() {
        if (this.isInitialized || !this.scriptName) return;
        try {
            let transpiledCode;
            if (window.CE_Standalone_Scripts) transpiledCode = window.CE_Standalone_Scripts[this.scriptName];
            else if (window.CEEngine?.getTranspiledCode) transpiledCode = window.CEEngine.getTranspiledCode(this.scriptName);
            else if (window.CES_Transpiler) transpiledCode = window.CES_Transpiler.getTranspiledCode(this.scriptName);

            if (!transpiledCode) return;
            const factory = (new Function(`return ${transpiledCode}`))();

            // For 3D, we also use a Behavior base class if possible, or just a dummy for now.
            // Absolute separation means 3D scripts might have different base methods.
            const factoryResult = factory(class Behavior3D {
                constructor(mtr) { this.materia = mtr; }
                get transform() { return this.materia.transform; }
                get position() { return this.materia.transform; }
            }, window.RuntimeAPIManager);

            const ScriptClass = typeof factoryResult === 'function' ? factoryResult : null;

            if (ScriptClass) {
                this.instance = new ScriptClass(this.materia);
                this.isInitialized = true;
            }
        } catch (e) { console.error("Error initializing 3D script:", e); }
    }

    start() { if (this.instance && typeof this.instance.start === 'function') this.instance.start(); }
    update(deltaTime) {
        if (this.instance && typeof this.instance.update === 'function') this.instance.update(deltaTime);
    }
    onEnable() { if (this.instance && typeof this.instance.onEnable === 'function') this.instance.onEnable(); }
    onDisable() { if (this.instance && typeof this.instance.onDisable === 'function') this.instance.onDisable(); }
    onDestroy() { if (this.instance && typeof this.instance.onDestroy === 'function') this.instance.onDestroy(); }
    clone() {
        const newScript = new CreativeScript3D(null, this.scriptName);
        newScript.publicVars = JSON.parse(JSON.stringify(this.publicVars));
        return newScript;
    }
}

registerComponent('Transform', Transform);
registerComponent('Camera', Camera);
registerComponent('MeshRenderer3D', MeshRenderer3D);
registerComponent('Rigidbody3D', Rigidbody3D);
registerComponent('BoxCollider3D', BoxCollider3D);
registerComponent('SphereCollider3D', SphereCollider3D);
registerComponent('CapsuleCollider3D', CapsuleCollider3D);
registerComponent('PlaneCollider3D', PlaneCollider3D);
registerComponent('Terreno3D', Terreno3D);
registerComponent('TerrenoCollider3D', TerrenoCollider3D);
registerComponent('SkinnedMeshRenderer3D', SkinnedMeshRenderer3D);
registerComponent('Animator3D', Animator3D);
registerComponent('WheelCollider3D', WheelCollider3D);
registerComponent('VehicleController3D', VehicleController3D);
registerComponent('CreativeScript3D', CreativeScript3D);
