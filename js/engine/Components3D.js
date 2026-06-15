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
        this.cpuPositions = null; // Float32Array for sculpting
        this.isDirty = false;

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

/**
 * HumanoidPhysics3D: Main component for advanced 3D character physics and IK.
 */
export class HumanoidPhysics3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.height = 180;
        this.leftLegChain = [];
        this.rightLegChain = [];
        this.isGrounded = true;
        this.isLimping = false;
        this.injuryLevel = 0;
    }

    update(deltaTime) {
        if (!window.isGameRunning) return;
        if (this.leftLegChain.length === 0) this._autoDetectBones();

        this._handleLedgeDetection(deltaTime);
    }

    _handleLedgeDetection(deltaTime) {
        const scene = this.materia.scene || window.SceneManager?.currentScene;
        if (!scene || !scene.physicsSystem?.raycast3D) return;

        const transform = this.materia.getComponent(window.Components.Transform);
        const forward = { x: Math.sin(transform.localRotation.y * Math.PI / 180), y: 0, z: Math.cos(transform.localRotation.y * Math.PI / 180) };
        const rayOrigin = { x: transform.x, y: transform.y - 120, z: (transform.z || 0) }; // Chest level

        const hit = scene.physicsSystem.raycast3D(rayOrigin, forward, 50);
        if (hit) {
            // Potential wall/ledge detected. Position hands.
            const lHand = this.materia.findChildByName('Mano_I', true);
            const rHand = this.materia.findChildByName('Mano_D', true);

            if (lHand) this.solveIK([this.materia.findChildByName('Brazo_I', true), lHand], hit.point);
            if (rHand) this.solveIK([this.materia.findChildByName('Brazo_D', true), rHand], hit.point);
        }
    }

    _autoDetectBones() {
        const hip = this.materia.findChildByName('Cadera', true);
        const lLeg = this.materia.findChildByName('Pierna_I', true);
        const rLeg = this.materia.findChildByName('Pierna_D', true);
        const lFoot = this.materia.findChildByName('Pie_I', true);
        const rFoot = this.materia.findChildByName('Pie_D', true);
        if (hip && lLeg && lFoot) this.leftLegChain = [hip, lLeg, lFoot];
        if (hip && rLeg && rFoot) this.rightLegChain = [hip, rLeg, rFoot];
    }

    solveIK(chain, targetPos) {
        const glm = window.glMatrix;
        if (!glm || !glm.vec3 || chain.length < 2) return;

        const target = glm.vec3.fromValues(targetPos.x, targetPos.y, targetPos.z);

        for (let iter = 0; iter < 10; iter++) {
            for (let i = chain.length - 2; i >= 0; i--) {
                const bone = chain[i];
                const effector = chain[chain.length - 1];
                const t = bone.getComponent(window.Components.Transform);
                const et = effector.getComponent(window.Components.Transform);

                const bPos = glm.vec3.fromValues(t.position.x, t.position.y, t.position.z);
                const ePos = glm.vec3.fromValues(et.position.x, et.position.y, et.position.z);

                const toEffector = glm.vec3.normalize(glm.vec3.create(), glm.vec3.sub(glm.vec3.create(), ePos, bPos));
                const toTarget = glm.vec3.normalize(glm.vec3.create(), glm.vec3.sub(glm.vec3.create(), target, bPos));

                const dot = glm.vec3.dot(toEffector, toTarget);
                if (dot < 0.9999) {
                    const axis = glm.vec3.cross(glm.vec3.create(), toEffector, toTarget);
                    glm.vec3.normalize(axis, axis);
                    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

                    const q = glm.quat.setAxisAngle(glm.quat.create(), axis, angle);

                    // Convert current local rotation to quat
                    const currentRot = glm.quat.fromEuler(glm.quat.create(), t.localRotation.x, t.localRotation.y, t.localRotation.z);
                    glm.quat.multiply(currentRot, q, currentRot);

                    // Convert back to Euler
                    const euler = glm.vec3.create();
                    this.quatToEuler(euler, currentRot);
                    t.localRotation = { x: euler[0], y: euler[1], z: euler[2] };
                }
            }
        }
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
    clone() { return new HumanoidPhysics3D(null); }
}

/**
 * MovementControl3D: Procedural humanoid movement component.
 */
export class MovementControl3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.speed = 200;
        this.walkCycleTime = 0;
    }

    update(deltaTime) {
        if (!window.isGameRunning) return;

        // Check if an AnimatorController is already handling the movement
        const controller = this.materia.getComponent(window.Components.AnimatorController);
        if (controller && controller.isPlaying) return;

        const rb = this.materia.getComponent(Rigidbody3D);
        if (!rb) return;

        const vel = rb.velocity;
        const speedSq = vel.x * vel.x + vel.z * vel.z;

        if (speedSq > 0.01) {
            this.walkCycleTime += deltaTime * 10;
            this._applyProceduralWalk();
        } else {
            this._applyProceduralIdle();
        }
    }

    _applyProceduralWalk() {
        const hip = this.materia.findChildByName('Cadera', true) || this.materia.findChildByName('Hips', true);
        if (!hip) return;
        const trans = hip.getComponent(window.Components.Transform);
        const sway = Math.sin(this.walkCycleTime) * 5;
        const bob = Math.abs(Math.cos(this.walkCycleTime)) * 5;
        trans.localRotation = { x: 0, y: 0, z: sway };
        trans.localPosition.y = -bob; // Engine Y is inverted
    }

    _applyProceduralIdle() {
        const hip = this.materia.findChildByName('Cadera', true) || this.materia.findChildByName('Hips', true);
        if (!hip) return;
        const trans = hip.getComponent(window.Components.Transform);
        const breathe = Math.sin(performance.now() / 1000 * 2) * 2;
        trans.localRotation = { x: breathe, y: 0, z: 0 };
    }
    clone() { return new MovementControl3D(null); }
}

/**
 * HealthController3D: Manages localized damage and procedural reactions.
 */
export class HealthController3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.isDead = false;

        // Bone indices or names for localized hitboxes
        this.hitboxes = {
            'Cabeza': { damageMult: 2.0, state: 'normal' },
            'Pecho': { damageMult: 1.0, state: 'normal' },
            'Brazo_I': { damageMult: 0.5, state: 'normal' },
            'Brazo_D': { damageMult: 0.5, state: 'normal' },
            'Pierna_I': { damageMult: 0.5, state: 'normal' },
            'Pierna_D': { damageMult: 0.5, state: 'normal' }
        };

        this.lastHitLocation = null;
    }

    takeDamage(amount, location = 'Pecho') {
        if (this.isDead) return;

        const hb = this.hitboxes[location] || this.hitboxes['Pecho'];
        const actualDamage = amount * hb.damageMult;

        this.currentHealth -= actualDamage;
        this.lastHitLocation = location;
        hb.state = 'injured';

        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            this.die();
        } else {
            this._applyProceduralReaction();
        }
    }

    _applyProceduralReaction() {
        // Trigger specific reactions in HumanoidPhysics3D
        const hp = this.materia.getComponent(HumanoidPhysics3D);
        if (!hp) return;

        if (this.lastHitLocation.includes('Brazo')) {
            // Logic for covering the arm wound would go here (using IK)
        } else if (this.lastHitLocation.includes('Pierna')) {
            hp.isLimping = true;
            hp.injuryLevel = 1.0 - (this.currentHealth / this.maxHealth);
        }
    }

    die() {
        this.isDead = true;
        // Trigger ragdoll or death animation
    }

    clone() { return new HealthController3D(null); }
}

registerComponent('HumanoidPhysics3D', HumanoidPhysics3D);
registerComponent('MovementControl3D', MovementControl3D);
/**
 * ThirdPersonController3D: Standard 3rd person control system.
 */
export class ThirdPersonController3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.moveSpeed = 300;
        this.turnSpeed = 10;
        this.jumpForce = 500;
        this.cameraTarget = null; // Materia ID for the camera
    }

    update(deltaTime) {
        if (!window.isGameRunning) return;
        const input = window.RuntimeAPIManager.getAPI('input');
        if (!input) return;

        const rb = this.materia.getComponent(Rigidbody3D);
        const transform = this.materia.getComponent(window.Components.Transform);
        if (!rb || !transform) return;

        // Movement
        let moveX = 0;
        let moveZ = 0;
        if (input.isKeyPressed('w')) moveZ = -1;
        if (input.isKeyPressed('s')) moveZ = 1;
        if (input.isKeyPressed('a')) moveX = -1;
        if (input.isKeyPressed('d')) moveX = 1;

        if (moveX !== 0 || moveZ !== 0) {
            const rad = transform.localRotation.y * Math.PI / 180;
            const forward = { x: Math.sin(rad), z: Math.cos(rad) };
            const right = { x: Math.cos(rad), z: -Math.sin(rad) };

            rb.velocity.x = (forward.x * moveZ + right.x * moveX) * (this.moveSpeed / 100);
            rb.velocity.z = (forward.z * moveZ + right.z * moveX) * (this.moveSpeed / 100);
        } else {
            rb.velocity.x = 0;
            rb.velocity.z = 0;
        }

        // Jump
        if (input.isKeyJustPressed('space')) {
            const hp = this.materia.getComponent(HumanoidPhysics3D);
            if (hp && hp.isGrounded) {
                rb.addForce(0, -this.jumpForce, 0); // Up is -Y in CE
            }
        }
    }
    clone() { return new ThirdPersonController3D(null); }
}

/**
 * CameraControl3D: 3rd person orbiting camera.
 */
export class CameraControl3D extends Leyes {
    constructor(materia) {
        super(materia);
        this.target = null; // Materia ID to follow
        this.distance = 400;
        this.height = 100;
        this.rotationY = 0;
        this.pitch = 15;
    }

    update(deltaTime) {
        if (!window.isGameRunning) return;
        const input = window.RuntimeAPIManager.getAPI('input');
        if (!input) return;

        // Mouse look
        const delta = input.getMouseDelta ? input.getMouseDelta() : { x: 0, y: 0 };
        this.rotationY -= delta.x * 0.2;
        this.pitch += delta.y * 0.2;
        this.pitch = Math.max(-30, Math.min(60, this.pitch));

        const scene = this.materia.scene || window.SceneManager?.currentScene;
        if (!scene) return;

        let followTarget = null;
        if (typeof this.target === 'number') followTarget = scene.findMateriaById(this.target);
        if (!followTarget) return;

        const targetTrans = followTarget.getComponent(window.Components.Transform);
        const myTrans = this.materia.getComponent(window.Components.Transform);

        // Position camera behind target
        const rad = this.rotationY * Math.PI / 180;
        const pitchRad = this.pitch * Math.PI / 180;

        const offsetX = Math.sin(rad) * Math.cos(pitchRad) * this.distance;
        const offsetZ = Math.cos(rad) * Math.cos(pitchRad) * this.distance;
        const offsetY = Math.sin(pitchRad) * this.distance;

        myTrans.localPosition = {
            x: targetTrans.x + offsetX,
            y: targetTrans.y - offsetY - this.height,
            z: (targetTrans.z || 0) + offsetZ
        };

        // Make camera look at target
        myTrans.localRotation = { x: this.pitch, y: this.rotationY + 180, z: 0 };

        // Sync target rotation with camera (optional but common)
        targetTrans.localRotation.y = this.rotationY;
    }
    clone() { return new CameraControl3D(null); }
}

registerComponent('HealthController3D', HealthController3D);
registerComponent('ThirdPersonController3D', ThirdPersonController3D);
/**
 * DeformableMesh3D: Allows mesh deformation on collision.
 */
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
            const vx = renderer.cpuPositions[i];
            const vy = renderer.cpuPositions[i+1];
            const vz = renderer.cpuPositions[i+2];

            const dx = vx - localHit[0];
            const dy = vy - localHit[1];
            const dz = vz - localHit[2];
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            if (dist < this.radius) {
                const falloff = 1.0 - (dist / this.radius);
                const move = this.strength * falloff * (force / 100);
                // Push vertices inward relative to the impact
                renderer.cpuPositions[i] -= dx * move;
                renderer.cpuPositions[i+1] -= dy * move;
                renderer.cpuPositions[i+2] -= dz * move;
                changed = true;
            }
        }

        if (changed) renderer.isDirty = true;
    }
    clone() { return new DeformableMesh3D(null); }
}

registerComponent('CameraControl3D', CameraControl3D);
registerComponent('DeformableMesh3D', DeformableMesh3D);
