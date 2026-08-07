// js/engine/Physics.js
import * as Components from './Components.js';
import { Scene } from './SceneManager.js';
import { Materia } from './Materia.js';

/**
 * Represents the detailed information about a collision event.
 */
class Collision {
    /**
     * @param {Materia} materiaA - The first materia in the collision.
     * @param {Materia} materiaB - The second materia in the collision.
     * @param {Components.BoxCollider2D|Components.CapsuleCollider2D|Components.TilemapCollider2D} colliderB - The collider of the second materia.
     */
    constructor(materiaA, materiaB, colliderB) {
        /** @type {Materia} The other materia involved in the collision. */
        this.materia = materiaB;
        /** @type {Components.Transform} The transform of the other materia. */
        this.transform = materiaB.getComponent(Components.Transform);
        /** @type {Components.BoxCollider2D|Components.CapsuleCollider2D|Components.TilemapCollider2D} The collider of the other materia. */
        this.collider = colliderB;
        /** @type {Array} For now, an empty array for contact points. */
        this.contacts = [];
        /** @type {Materia} An alias for the other materia involved in the collision. */
        this.gameObject = materiaB;

        // --- Spanish Aliases ---
        this.materiaA = materiaA;
        this.otro = materiaB;
        this.objeto = materiaB;
        this.transformacion = this.transform;
        this.colisionador = colliderB;

        /** @type {Vector2} Normal direction of the collision. */
        this.normal = { x: 0, y: 0 };
        /** @type {Vector2} Relative velocity of the collision. */
        this.relativeVelocity = { x: 0, y: 0 };
    }

    get velocidadRelativa() { return this.relativeVelocity; }

    /**
     * Comprueba si la materia involucrada en la colisión tiene un tag específico.
     * @param {string} tag
     */
    tieneTag(tag) {
        return this.objeto && this.objeto.tieneTag(tag);
    }

    /**
     * Alias en inglés para tieneTag.
     * @param {string} tag
     */
    hasTag(tag) {
        return this.tieneTag(tag);
    }
}

export class PhysicsSystem {
    /**
     * @param {Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.gravity = { x: 0, y: -9.8 }; // Negative Y is now DOWN
        this.MAX_VELOCITY = 100; // Unidades por segundo (luego se multiplica por PHYSICS_SCALE)

        /**
         * Stores active collisions from the current frame.
         * @type {Map<string, {materiaA: Materia, materiaB: Materia, type: 'collision'|'trigger'}>}
         */
        this.activeCollisions = new Map();

        /**
         * Stores the state of collisions (enter, stay, exit).
         * @type {Map<string, {state: 'enter'|'stay'|'exit', frame: number, type: 'collision'|'trigger'}>}
         */
        this.collisionStates = new Map();
        this.currentFrame = 0;
    }

    /**
     * Generates a unique, order-independent key for a pair of materias.
     * @param {number} id1
     * @param {number} id2
     * @returns {string}
     */
    _generateCollisionKey(id1, id2) {
        return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
    }

    update(deltaTime, subStepsOverride = null) {
        this.currentFrame++;
        this.lastDeltaTime = deltaTime;

        // Sub-stepping to prevent tunneling and improve stability
        const SUB_STEPS = subStepsOverride !== null ? subStepsOverride : 4;
        const subDeltaTime = deltaTime / SUB_STEPS;

        for (let s = 0; s < SUB_STEPS; s++) {
            this._step(subDeltaTime);
            this._step3D(subDeltaTime);
            this._resolveConstraints(subDeltaTime);
        }
    }

    _step3D(deltaTime) {
        const allMaterias = this.scene.getAllMaterias();
        const collidables = allMaterias.filter(m => m.isActive && (
            m.getComponent(window.Components3D?.BoxCollider3D) ||
            m.getComponent(window.Components3D?.SphereCollider3D) ||
            m.getComponent(window.Components3D?.CapsuleCollider3D) ||
            m.getComponent(window.Components3D?.PlaneCollider3D) ||
            m.getComponent(window.Components3D?.TerrenoCollider3D)
        ));

        for (let i = 0; i < collidables.length; i++) {
            const m = collidables[i];
            const rb = m.getComponent(window.Components3D?.Rigidbody3D);
            const transform = m.getComponent(Components.Transform);

            if (rb && !rb.isKinematic) {
                if (rb.useGravity) rb.velocity.y += this.gravity.y * 100 * deltaTime; // Simplified 3D gravity

                // Drag
                rb.velocity.x *= (1.0 - rb.drag);
                rb.velocity.y *= (1.0 - rb.drag);
                rb.velocity.z *= (1.0 - rb.drag);

                transform.x += rb.velocity.x * deltaTime;
                transform.y += rb.velocity.y * deltaTime;
                if (transform.z !== undefined) transform.z += rb.velocity.z * deltaTime;
            }

            // 3D Collision Detection & Resolution
            for (let j = i + 1; j < collidables.length; j++) {
                const other = collidables[j];
                const collision = this.checkCollision3D(m, other);
                if (collision) {
                    this.resolveCollision3D(m, other, collision);

                    // Trigger deformation if component exists
                    const hitPoint = collision.point || { x: transform.x, y: transform.y, z: transform.z || 0 };
                    const force = 50; // Simplified force
                    const dm1 = m.getComponent(window.Components3D?.DeformableMesh3D);
                    if (dm1) dm1.onCollision(hitPoint, force);
                    const dm2 = other.getComponent(window.Components3D?.DeformableMesh3D);
                    if (dm2) dm2.onCollision(hitPoint, force);
                }
            }
        }
    }

    checkCollision3D(mA, mB) {
        const C3D = window.Components3D;
        const cA = mA.getComponent(C3D.BoxCollider3D) || mA.getComponent(C3D.SphereCollider3D) || mA.getComponent(C3D.CapsuleCollider3D) || mA.getComponent(C3D.PlaneCollider3D) || mA.getComponent(C3D.TerrenoCollider3D);
        const cB = mB.getComponent(C3D.BoxCollider3D) || mB.getComponent(C3D.SphereCollider3D) || mB.getComponent(C3D.CapsuleCollider3D) || mB.getComponent(C3D.PlaneCollider3D) || mB.getComponent(C3D.TerrenoCollider3D);

        if (!cA || !cB) return null;

        // Dispatcher
        if (cA instanceof C3D.BoxCollider3D) {
            if (cB instanceof C3D.BoxCollider3D) return this.isBoxVsBox(mA, mB);
            if (cB instanceof C3D.SphereCollider3D) return this.isSphereVsBox(mB, mA, true);
            if (cB instanceof C3D.PlaneCollider3D) return this.isBoxVsPlane(mA, mB);
            if (cB instanceof C3D.CapsuleCollider3D) return this.isCapsuleVsBox(mB, mA, true);
            if (cB instanceof C3D.TerrenoCollider3D) return this.isBoxVsTerrain(mA, mB);
        } else if (cA instanceof C3D.SphereCollider3D) {
            if (cB instanceof C3D.BoxCollider3D) return this.isSphereVsBox(mA, mB);
            if (cB instanceof C3D.SphereCollider3D) return this.isSphereVsSphere(mA, mB);
            if (cB instanceof C3D.PlaneCollider3D) return this.isSphereVsPlane(mA, mB);
            if (cB instanceof C3D.CapsuleCollider3D) return this.isCapsuleVsSphere(mB, mA, true);
            if (cB instanceof C3D.TerrenoCollider3D) return this.isSphereVsTerrain(mA, mB);
        } else if (cA instanceof C3D.PlaneCollider3D) {
            if (cB instanceof C3D.BoxCollider3D) return this.isBoxVsPlane(mB, mA, true);
            if (cB instanceof C3D.SphereCollider3D) return this.isSphereVsPlane(mB, mA, true);
            if (cB instanceof C3D.CapsuleCollider3D) return this.isCapsuleVsPlane(mB, mA, true);
        } else if (cA instanceof C3D.CapsuleCollider3D) {
            if (cB instanceof C3D.SphereCollider3D) return this.isCapsuleVsSphere(mA, mB);
            if (cB instanceof C3D.PlaneCollider3D) return this.isCapsuleVsPlane(mA, mB);
            if (cB instanceof C3D.CapsuleCollider3D) return this.isCapsuleVsCapsule(mA, mB);
            if (cB instanceof C3D.BoxCollider3D) return this.isCapsuleVsBox(mA, mB);
            if (cB instanceof C3D.TerrenoCollider3D) return this.isCapsuleVsTerrain(mA, mB);
        } else if (cA instanceof C3D.TerrenoCollider3D) {
            if (cB instanceof C3D.BoxCollider3D) return this.isBoxVsTerrain(mB, mA, true);
            if (cB instanceof C3D.SphereCollider3D) return this.isSphereVsTerrain(mB, mA, true);
            if (cB instanceof C3D.CapsuleCollider3D) return this.isCapsuleVsTerrain(mB, mA, true);
        }

        return null;
    }

    isSphereVsTerrain(mSphere, mTerrain, isInverted = false) {
        const tS = mSphere.getComponent(Components.Transform);
        const cS = mSphere.getComponent(window.Components3D.SphereCollider3D);
        const tT = mTerrain.getComponent(Components.Transform);
        const terrain = mTerrain.getComponent(window.Components3D.Terreno3D);
        const glm = window.glMatrix;

        const spherePosWorld = [tS.x + cS.offset.x, tS.y + cS.offset.y, (tS.z || 0) + cS.offset.z];
        const invMat = glm.mat4.invert(glm.mat4.create(), tT.worldMatrix);
        const localPos = glm.vec3.transformMat4(glm.vec3.create(), spherePosWorld, invMat);
        const radius = cS.radius * Math.max(Math.abs(tS.scale.x), Math.abs(tS.scale.y), Math.abs(tS.scale.z || 1));

        const gridX = ((localPos[0] + terrain.size.x / 2) / terrain.size.x) * terrain.resolution;
        const gridZ = ((localPos[2] + terrain.size.z / 2) / terrain.size.z) * terrain.resolution;

        if (gridX >= 0 && gridX < terrain.resolution && gridZ >= 0 && gridZ < terrain.resolution) {
            const h = terrain.getHeight(Math.floor(gridX), Math.floor(gridZ));
            const dist = localPos[1] - h; // +Y is UP. localPos[1] < h means below surface.

            if (dist < radius) {
                const overlap = radius - dist;
                let nx = 0, ny = 1, nz = 0;
                if (isInverted) ny = -1;
                return { normal: { x: nx, y: ny, z: nz }, overlap, point: { x: spherePosWorld[0], y: spherePosWorld[1], z: spherePosWorld[2] } };
            }
        }
        return null;
    }

    isBoxVsTerrain(mBox, mTerrain, isInverted = false) {
        const obb = this._getOBBData(mBox);
        const tT = mTerrain.getComponent(Components.Transform);
        const terrain = mTerrain.getComponent(window.Components3D.Terreno3D);
        const glm = window.glMatrix;
        const invMat = glm.mat4.invert(glm.mat4.create(), tT.worldMatrix);

        // Check lowest vertex of OBB
        let maxOverlap = -1;
        let hitPoint = null;

        const half = obb.halfExtents;
        const corners = [
            [-half[0], -half[1], -half[2]], [half[0], -half[1], -half[2]],
            [-half[0], half[1], -half[2]], [half[0], half[1], -half[2]],
            [-half[0], -half[1], half[2]], [half[0], -half[1], half[2]],
            [-half[0], half[1], half[2]], [half[0], half[1], half[2]]
        ];

        for (const c of corners) {
            const worldCorner = glm.vec3.clone(obb.center);
            for (let i = 0; i < 3; i++) glm.vec3.scaleAndAdd(worldCorner, worldCorner, obb.axes[i], c[i]);

            const localPos = glm.vec3.transformMat4(glm.vec3.create(), worldCorner, invMat);
            const gridX = ((localPos[0] + terrain.size.x / 2) / terrain.size.x) * terrain.resolution;
            const gridZ = ((localPos[2] + terrain.size.z / 2) / terrain.size.z) * terrain.resolution;

            if (gridX >= 0 && gridX < terrain.resolution && gridZ >= 0 && gridZ < terrain.resolution) {
                const h = terrain.getHeight(Math.floor(gridX), Math.floor(gridZ));
                const overlap = h - localPos[1];
                if (overlap > maxOverlap) {
                    maxOverlap = overlap;
                    hitPoint = { x: worldCorner[0], y: worldCorner[1], z: worldCorner[2] };
                }
            }
        }

        if (maxOverlap > 0) {
            let ny = 1; if (isInverted) ny = -1;
            return { normal: { x: 0, y: ny, z: 0 }, overlap: maxOverlap, point: hitPoint };
        }
        return null;
    }

    isCapsuleVsTerrain(mCap, mTerrain, isInverted = false) {
        const cap = this._getCapsuleData3D(mCap);
        const tT = mTerrain.getComponent(Components.Transform);
        const terrain = mTerrain.getComponent(window.Components3D.Terreno3D);
        const glm = window.glMatrix;
        const invMat = glm.mat4.invert(glm.mat4.create(), tT.worldMatrix);

        // Check p1 and p2 of capsule
        let maxOverlap = -1;
        let hitPoint = null;

        for (const p of [cap.p1, cap.p2]) {
            const localPos = glm.vec3.transformMat4(glm.vec3.create(), p, invMat);
            const gridX = ((localPos[0] + terrain.size.x / 2) / terrain.size.x) * terrain.resolution;
            const gridZ = ((localPos[2] + terrain.size.z / 2) / terrain.size.z) * terrain.resolution;

            if (gridX >= 0 && gridX < terrain.resolution && gridZ >= 0 && gridZ < terrain.resolution) {
                const h = terrain.getHeight(Math.floor(gridX), Math.floor(gridZ));
                const overlap = h - (localPos[1] - cap.radius);
                if (overlap > maxOverlap) {
                    maxOverlap = overlap;
                    hitPoint = { x: p[0], y: p[1], z: p[2] };
                }
            }
        }

        if (maxOverlap > 0) {
            let ny = 1; if (isInverted) ny = -1;
            return { normal: { x: 0, y: ny, z: 0 }, overlap: maxOverlap, point: hitPoint };
        }
        return null;
    }

    _getOBBData(materia) {
        const transform = materia.getComponent(Components.Transform);
        const collider = materia.getComponent(window.Components3D.BoxCollider3D);
        const glm = window.glMatrix;

        const center = [
            transform.x + collider.offset.x,
            transform.y + collider.offset.y,
            (transform.z || 0) + collider.offset.z
        ];

        const matrix = transform.worldMatrix;
        const axes = [
            glm.vec3.fromValues(matrix[0], matrix[1], matrix[2]),
            glm.vec3.fromValues(matrix[4], matrix[5], matrix[6]),
            glm.vec3.fromValues(matrix[8], matrix[9], matrix[10])
        ];
        glm.vec3.normalize(axes[0], axes[0]);
        glm.vec3.normalize(axes[1], axes[1]);
        glm.vec3.normalize(axes[2], axes[2]);

        const halfExtents = [
            (collider.size.x * Math.abs(transform.scale.x)) / 2,
            (collider.size.y * Math.abs(transform.scale.y)) / 2,
            (collider.size.z * Math.abs(transform.scale.z)) / 2
        ];

        return { center, axes, halfExtents };
    }

    isSphereVsBox(mSphere, mBox, isInverted = false) {
        const tS = mSphere.getComponent(Components.Transform);
        const cS = mSphere.getComponent(window.Components3D.SphereCollider3D);
        const obb = this._getOBBData(mBox);
        const glm = window.glMatrix;

        const spherePos = glm.vec3.fromValues(
            tS.x + cS.offset.x,
            tS.y + cS.offset.y,
            (tS.z || 0) + cS.offset.z
        );
        const radius = cS.radius * Math.max(Math.abs(tS.scale.x), Math.abs(tS.scale.y), Math.abs(tS.scale.z || 1));

        // Vector from box center to sphere center
        const d = glm.vec3.subtract(glm.vec3.create(), spherePos, obb.center);

        // Project d onto box axes to find the closest point inside the box
        const closestPoint = glm.vec3.clone(obb.center);
        for (let i = 0; i < 3; i++) {
            let dist = glm.vec3.dot(d, obb.axes[i]);
            dist = this._clamp(dist, -obb.halfExtents[i], obb.halfExtents[i]);
            glm.vec3.scaleAndAdd(closestPoint, closestPoint, obb.axes[i], dist);
        }

        const diff = glm.vec3.subtract(glm.vec3.create(), spherePos, closestPoint);
        const distSq = glm.vec3.sqrLen(diff);

        if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq);
            const overlap = radius - dist;
            let nx, ny, nz;
            if (dist > 1e-6) {
                nx = diff[0] / dist; ny = diff[1] / dist; nz = diff[2] / dist;
            } else {
                nx = 0; ny = -1; nz = 0;
            }
            if (isInverted) { nx *= -1; ny *= -1; nz *= -1; }
            return { normal: { x: nx, y: ny, z: nz }, overlap, point: { x: closestPoint[0], y: closestPoint[1], z: closestPoint[2] } };
        }
        return null;
    }

    isBoxVsBox(mA, mB) {
        const obbA = this._getOBBData(mA);
        const obbB = this._getOBBData(mB);
        const glm = window.glMatrix;

        // SAT test for OBB vs OBB (15 axes)
        // For brevity and engine performance, we'll start with a simplified AABB check in world space
        // then evolve to full OBB if needed.
        // Let's implement full OBB axes for accuracy.

        const axes = [
            obbA.axes[0], obbA.axes[1], obbA.axes[2],
            obbB.axes[0], obbB.axes[1], obbB.axes[2]
        ];

        // Add 9 cross product axes
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const cross = glm.vec3.cross(glm.vec3.create(), obbA.axes[i], obbB.axes[j]);
                if (glm.vec3.sqrLen(cross) > 1e-6) {
                    glm.vec3.normalize(cross, cross);
                    axes.push(cross);
                }
            }
        }

        let minOverlap = Infinity;
        let mtv = null;

        const centerDiff = glm.vec3.subtract(glm.vec3.create(), obbA.center, obbB.center);

        for (const axis of axes) {
            // Project both boxes onto the axis
            const rA = obbA.halfExtents[0] * Math.abs(glm.vec3.dot(obbA.axes[0], axis)) +
                       obbA.halfExtents[1] * Math.abs(glm.vec3.dot(obbA.axes[1], axis)) +
                       obbA.halfExtents[2] * Math.abs(glm.vec3.dot(obbA.axes[2], axis));

            const rB = obbB.halfExtents[0] * Math.abs(glm.vec3.dot(obbB.axes[0], axis)) +
                       obbB.halfExtents[1] * Math.abs(glm.vec3.dot(obbB.axes[1], axis)) +
                       obbB.halfExtents[2] * Math.abs(glm.vec3.dot(obbB.axes[2], axis));

            const dist = Math.abs(glm.vec3.dot(centerDiff, axis));

            if (dist > rA + rB) return null; // Separating axis found

            const overlap = (rA + rB) - dist;
            if (overlap < minOverlap) {
                minOverlap = overlap;
                mtv = axis;
            }
        }

        // Ensure MTV points from B to A
        if (glm.vec3.dot(centerDiff, mtv) < 0) {
            mtv = glm.vec3.scale(glm.vec3.create(), mtv, -1);
        }

        return {
            normal: { x: mtv[0], y: mtv[1], z: mtv[2] },
            overlap: minOverlap,
            point: { x: (obbA.center[0] + obbB.center[0]) / 2, y: (obbA.center[1] + obbB.center[1]) / 2, z: (obbA.center[2] + obbB.center[2]) / 2 }
        };
    }

    isBoxVsPlane(mBox, mPlane, isInverted = false) {
        const obb = this._getOBBData(mBox);
        const tP = mPlane.getComponent(Components.Transform);
        const cP = mPlane.getComponent(window.Components3D.PlaneCollider3D);
        const glm = window.glMatrix;

        const planeNormal = glm.vec3.fromValues(tP.worldMatrix[4], tP.worldMatrix[5], tP.worldMatrix[6]);
        glm.vec3.normalize(planeNormal, planeNormal);
        const planePos = [tP.x + cP.offset.x, tP.y + cP.offset.y, (tP.z || 0) + cP.offset.z];

        // Find the vertex of the box farthest in the direction of -planeNormal
        const r = obb.halfExtents[0] * Math.abs(glm.vec3.dot(obb.axes[0], planeNormal)) +
                  obb.halfExtents[1] * Math.abs(glm.vec3.dot(obb.axes[1], planeNormal)) +
                  obb.halfExtents[2] * Math.abs(glm.vec3.dot(obb.axes[2], planeNormal));

        const boxToPlane = glm.vec3.subtract(glm.vec3.create(), obb.center, planePos);
        const dist = glm.vec3.dot(boxToPlane, planeNormal);

        if (Math.abs(dist) < r) {
            const overlap = r - Math.abs(dist);
            let nx = planeNormal[0], ny = planeNormal[1], nz = planeNormal[2];
            if (dist < 0) { nx *= -1; ny *= -1; nz *= -1; }
            if (isInverted) { nx *= -1; ny *= -1; nz *= -1; }
            return { normal: { x: nx, y: ny, z: nz }, overlap, point: { x: obb.center[0], y: obb.center[1], z: obb.center[2] } };
        }
        return null;
    }

    _getCapsuleData3D(materia) {
        const transform = materia.getComponent(Components.Transform);
        const collider = materia.getComponent(window.Components3D.CapsuleCollider3D);
        const glm = window.glMatrix;

        const center = [
            transform.x + collider.offset.x,
            transform.y + collider.offset.y,
            (transform.z || 0) + collider.offset.z
        ];

        const matrix = transform.worldMatrix;
        const axisIdx = collider.direction === 'X' ? 0 : (collider.direction === 'Y' ? 4 : 8);
        const dir = glm.vec3.fromValues(matrix[axisIdx], matrix[axisIdx+1], matrix[axisIdx+2]);
        glm.vec3.normalize(dir, dir);

        const radius = collider.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.z || 1));
        const height = collider.height * Math.abs(transform.scale.y);
        const hh = Math.max(0, (height / 2) - radius);

        const p1 = glm.vec3.scaleAndAdd(glm.vec3.create(), center, dir, -hh);
        const p2 = glm.vec3.scaleAndAdd(glm.vec3.create(), center, dir, hh);

        return { p1, p2, radius, center, dir };
    }

    isCapsuleVsSphere(mCap, mSphere, isInverted = false) {
        const cap = this._getCapsuleData3D(mCap);
        const tS = mSphere.getComponent(Components.Transform);
        const cS = mSphere.getComponent(window.Components3D.SphereCollider3D);
        const glm = window.glMatrix;

        const sPos = [tS.x + cS.offset.x, tS.y + cS.offset.y, (tS.z || 0) + cS.offset.z];
        const sRadius = cS.radius * Math.max(Math.abs(tS.scale.x), Math.abs(tS.scale.y), Math.abs(tS.scale.z || 1));

        const closest = this._closestPointOnSegment3D(sPos, cap.p1, cap.p2);
        const dx = sPos[0] - closest[0], dy = sPos[1] - closest[1], dz = sPos[2] - closest[2];
        const distSq = dx*dx + dy*dy + dz*dz;

        if (distSq < (cap.radius + sRadius) * (cap.radius + sRadius)) {
            const dist = Math.sqrt(distSq);
            const overlap = (cap.radius + sRadius) - dist;
            let nx, ny, nz;
            if (dist > 1e-6) {
                nx = dx/dist; ny = dy/dist; nz = dz/dist;
            } else {
                nx = 0; ny = -1; nz = 0;
            }
            if (isInverted) { nx *= -1; ny *= -1; nz *= -1; }
            return { normal: { x: nx, y: ny, z: nz }, overlap, point: { x: closest[0] + nx * cap.radius, y: closest[1] + ny * cap.radius, z: closest[2] + nz * cap.radius } };
        }
        return null;
    }

    isCapsuleVsPlane(mCap, mPlane, isInverted = false) {
        const cap = this._getCapsuleData3D(mCap);
        const tP = mPlane.getComponent(Components.Transform);
        const cP = mPlane.getComponent(window.Components3D.PlaneCollider3D);
        const glm = window.glMatrix;

        const normal = glm.vec3.fromValues(tP.worldMatrix[4], tP.worldMatrix[5], tP.worldMatrix[6]);
        glm.vec3.normalize(normal, normal);
        const pPos = [tP.x + cP.offset.x, tP.y + cP.offset.y, (tP.z || 0) + cP.offset.z];

        const d1 = glm.vec3.dot(glm.vec3.subtract(glm.vec3.create(), cap.p1, pPos), normal);
        const d2 = glm.vec3.dot(glm.vec3.subtract(glm.vec3.create(), cap.p2, pPos), normal);

        const minDist = Math.min(d1, d2);
        if (minDist < cap.radius) {
            const overlap = cap.radius - minDist;
            let nx = normal[0], ny = normal[1], nz = normal[2];
            if (isInverted) { nx *= -1; ny *= -1; nz *= -1; }
            return {
                normal: { x: nx, y: ny, z: nz },
                overlap,
                point: { x: cap.center[0], y: cap.center[1], z: cap.center[2] }
            };
        }
        return null;
    }

    isCapsuleVsCapsule(mA, mB) {
        const capA = this._getCapsuleData3D(mA);
        const capB = this._getCapsuleData3D(mB);
        const glm = window.glMatrix;

        const { a, b } = this._closestPointsOnTwoSegments3D(capA.p1, capA.p2, capB.p1, capB.p2);
        const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
        const distSq = dx*dx + dy*dy + dz*dz;

        if (distSq < (capA.radius + capB.radius) * (capA.radius + capB.radius)) {
            const dist = Math.sqrt(distSq);
            const overlap = (capA.radius + capB.radius) - dist;
            const normal = dist > 1e-6 ? { x: dx/dist, y: dy/dist, z: dz/dist } : { x: 0, y: 1, z: 0 };
            return { normal, overlap, point: { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2 } };
        }
        return null;
    }

    isCapsuleVsBox(mCap, mBox, isInverted = false) {
        const cap = this._getCapsuleData3D(mCap);
        const obb = this._getOBBData(mBox);
        const glm = window.glMatrix;

        // Simplified: find closest point on OBB to the capsule segment center
        const boxCenter = obb.center;
        const closestOnCap = this._closestPointOnSegment3D(boxCenter, cap.p1, cap.p2);

        // Sphere vs Box using closest point on segment
        const d = glm.vec3.subtract(glm.vec3.create(), closestOnCap, boxCenter);
        const closestOnBox = glm.vec3.clone(boxCenter);
        for (let i = 0; i < 3; i++) {
            let dist = glm.vec3.dot(d, obb.axes[i]);
            dist = this._clamp(dist, -obb.halfExtents[i], obb.halfExtents[i]);
            glm.vec3.scaleAndAdd(closestOnBox, closestOnBox, obb.axes[i], dist);
        }

        const diff = glm.vec3.subtract(glm.vec3.create(), closestOnCap, closestOnBox);
        const distSq = glm.vec3.sqrLen(diff);

        if (distSq < cap.radius * cap.radius) {
            const dist = Math.sqrt(distSq);
            const overlap = cap.radius - dist;
            let nx, ny, nz;
            if (dist > 1e-6) {
                nx = diff[0] / dist; ny = diff[1] / dist; nz = diff[2] / dist;
            } else {
                nx = 0; ny = -1; nz = 0;
            }
            if (isInverted) { nx *= -1; ny *= -1; nz *= -1; }
            return { normal: { x: nx, y: ny, z: nz }, overlap, point: { x: closestOnBox[0], y: closestOnBox[1], z: closestOnBox[2] } };
        }
        return null;
    }

    _closestPointOnSegment3D(p, a, b) {
        const glm = window.glMatrix;
        const ab = glm.vec3.subtract(glm.vec3.create(), b, a);
        const ap = glm.vec3.subtract(glm.vec3.create(), p, a);
        let t = glm.vec3.dot(ap, ab) / glm.vec3.sqrLen(ab);
        t = this._clamp(t, 0, 1);
        return glm.vec3.scaleAndAdd(glm.vec3.create(), a, ab, t);
    }

    _closestPointsOnTwoSegments3D(p1, q1, p2, q2) {
        const glm = window.glMatrix;
        const d1 = glm.vec3.subtract(glm.vec3.create(), q1, p1);
        const d2 = glm.vec3.subtract(glm.vec3.create(), q2, p2);
        const r = glm.vec3.subtract(glm.vec3.create(), p1, p2);
        const a = glm.vec3.sqrLen(d1), e = glm.vec3.sqrLen(d2), f = glm.vec3.dot(d2, r);
        let s = 0, t = 0;
        if (a <= 1e-6 && e <= 1e-6) return { a: p1, b: p2 };
        if (a <= 1e-6) { s = 0; t = this._clamp(f / e, 0, 1); }
        else {
            const c = glm.vec3.dot(d1, r);
            if (e <= 1e-6) { t = 0; s = this._clamp(-c / a, 0, 1); }
            else {
                const b = glm.vec3.dot(d1, d2);
                const denom = a * e - b * b;
                s = denom !== 0 ? this._clamp((b * f - c * e) / denom, 0, 1) : 0;
                t = (b * s + f) / e;
                if (t < 0) { t = 0; s = this._clamp(-c / a, 0, 1); }
                else if (t > 1) { t = 1; s = this._clamp((b - c) / a, 0, 1); }
            }
        }
        return { a: glm.vec3.scaleAndAdd(glm.vec3.create(), p1, d1, s), b: glm.vec3.scaleAndAdd(glm.vec3.create(), p2, d2, t) };
    }

    isSphereVsSphere(mA, mB) {
        const tA = mA.getComponent(Components.Transform);
        const cA = mA.getComponent(window.Components3D.SphereCollider3D);
        const tB = mB.getComponent(Components.Transform);
        const cB = mB.getComponent(window.Components3D.SphereCollider3D);

        const rA = cA.radius * Math.max(Math.abs(tA.scale.x), Math.abs(tA.scale.y), Math.abs(tA.scale.z || 1));
        const rB = cB.radius * Math.max(Math.abs(tB.scale.x), Math.abs(tB.scale.y), Math.abs(tB.scale.z || 1));

        const pA = [tA.x + cA.offset.x, tA.y + cA.offset.y, (tA.z || 0) + cA.offset.z];
        const pB = [tB.x + cB.offset.x, tB.y + cB.offset.y, (tB.z || 0) + cB.offset.z];

        const dx = pA[0] - pB[0], dy = pA[1] - pB[1], dz = pA[2] - pB[2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        if (dist < rA + rB) {
            const overlap = (rA + rB) - dist;
            const normal = dist > 0 ? { x: dx/dist, y: dy/dist, z: dz/dist } : { x: 0, y: 1, z: 0 };
            return { normal, overlap, point: { x: pB[0] + normal.x * rB, y: pB[1] + normal.y * rB, z: pB[2] + normal.z * rB } };
        }
        return null;
    }

    isSphereVsPlane(mSphere, mPlane, isInverted = false) {
        const tS = mSphere.getComponent(Components.Transform);
        const cS = mSphere.getComponent(window.Components3D.SphereCollider3D);
        const tP = mPlane.getComponent(Components.Transform);
        const cP = mPlane.getComponent(window.Components3D.PlaneCollider3D);
        const glm = window.glMatrix;

        const radius = cS.radius * Math.max(Math.abs(tS.scale.x), Math.abs(tS.scale.y), Math.abs(tS.scale.z || 1));
        const spherePos = [tS.x + cS.offset.x, tS.y + cS.offset.y, (tS.z || 0) + cS.offset.z];

        // Plane is infinite in XZ, centered at tP. Normal is Y-axis of tP world matrix
        const normal = glm.vec3.fromValues(tP.worldMatrix[4], tP.worldMatrix[5], tP.worldMatrix[6]);
        glm.vec3.normalize(normal, normal);

        const planePos = [tP.x + cP.offset.x, tP.y + cP.offset.y, (tP.z || 0) + cP.offset.z];
        const v = [spherePos[0] - planePos[0], spherePos[1] - planePos[1], spherePos[2] - planePos[2]];
        const dist = v[0] * normal[0] + v[1] * normal[1] + v[2] * normal[2];

        if (Math.abs(dist) < radius) {
            const overlap = radius - Math.abs(dist);
            let nx = normal[0], ny = normal[1], nz = normal[2];
            if (dist < 0) { nx *= -1; ny *= -1; nz *= -1; }
            if (isInverted) { nx *= -1; ny *= -1; nz *= -1; }
            return {
                normal: { x: nx, y: ny, z: nz },
                overlap,
                point: { x: spherePos[0] - nx * radius, y: spherePos[1] - ny * radius, z: spherePos[2] - nz * radius }
            };
        }
        return null;
    }

    resolveCollision3D(mA, mB, hit) {
        const tA = mA.getComponent(Components.Transform);
        const tB = mB.getComponent(Components.Transform);
        const rbA = mA.getComponent(window.Components3D.Rigidbody3D);
        const rbB = mB.getComponent(window.Components3D.Rigidbody3D);

        const isADyn = rbA && !rbA.isKinematic;
        const isBDyn = rbB && !rbB.isKinematic;

        if (!isADyn && !isBDyn) return;

        // 1. Positional correction
        const mtv = { x: hit.normal.x * hit.overlap, y: hit.normal.y * hit.overlap, z: hit.normal.z * hit.overlap };
        if (isADyn && !isBDyn) {
            tA.x += mtv.x; tA.y += mtv.y; tA.z = (tA.z || 0) + mtv.z;
        } else if (!isADyn && isBDyn) {
            tB.x -= mtv.x; tB.y -= mtv.y; tB.z = (tB.z || 0) - mtv.z;
        } else if (isADyn && isBDyn) {
            tA.x += mtv.x * 0.5; tA.y += mtv.y * 0.5; tA.z = (tA.z || 0) + mtv.z * 0.5;
            tB.x -= mtv.x * 0.5; tB.y -= mtv.y * 0.5; tB.z = (tB.z || 0) - mtv.z * 0.5;
        }

        // 2. Impulse resolution
        const relVel = {
            x: (rbA ? rbA.velocity.x : 0) - (rbB ? rbB.velocity.x : 0),
            y: (rbA ? rbA.velocity.y : 0) - (rbB ? rbB.velocity.y : 0),
            z: (rbA ? rbA.velocity.z : 0) - (rbB ? rbB.velocity.z : 0)
        };
        const velAlongNorm = relVel.x * hit.normal.x + relVel.y * hit.normal.y + relVel.z * hit.normal.z;
        if (velAlongNorm > 0) return;

        const e = 0.2; // Bounciness
        let j = -(1 + e) * velAlongNorm;
        j /= (isADyn ? 1/rbA.mass : 0) + (isBDyn ? 1/rbB.mass : 0);

        const impulse = { x: j * hit.normal.x, y: j * hit.normal.y, z: j * hit.normal.z };
        if (isADyn) {
            rbA.velocity.x += impulse.x / rbA.mass;
            rbA.velocity.y += impulse.y / rbA.mass;
            rbA.velocity.z += impulse.z / rbA.mass;
        }
        if (isBDyn) {
            rbB.velocity.x -= impulse.x / rbB.mass;
            rbB.velocity.y -= impulse.y / rbB.mass;
            rbB.velocity.z -= impulse.z / rbB.mass;
        }
    }

    _resolveConstraints(deltaTime) {
        const allMaterias = this.scene.getAllMaterias();

        // Resolve Bone Constraints (Ragdoll)
        for (const materia of allMaterias) {
            const bone = materia.getComponent(Components.Bone);
            if (!bone || !bone.isRagdoll || !materia.parent) continue;

            const transform = materia.getComponent(Components.Transform);
            const parentTransform = materia.parent.getComponent(Components.Transform);
            if (!transform || !parentTransform) continue;

            const rb = materia.getComponent(Components.Rigidbody2D);
            if (!rb || rb.bodyType !== 'Dynamic') continue;

            // 1. Pivot Constraint (Keep bone attached to parent joint)
            const parentRB = materia.parent.getComponent(Components.Rigidbody2D);

            if (parentRB) {
                const targetLocalPos = bone._bindLocalPos || { x: 0, y: 0 };
                if (!bone._bindLocalPos) bone._bindLocalPos = { ...transform.localPosition };

                transform.localPosition = targetLocalPos;
            }

            // 2. Angular Limits
            let localRot = typeof transform.localRotation === 'number' ? transform.localRotation : transform.localRotation.z;
            const limits = bone.angularLimits || { min: -45, max: 45 };

            if (localRot < limits.min || localRot > limits.max) {
                const targetRot = this._clamp(localRot, limits.min, limits.max);
                const diff = targetRot - localRot;

                // Apply restorative torque (Spring)
                rb.angularVelocity += diff * (bone.stiffness || 0.5) * deltaTime * 10;
                // Apply damping
                rb.angularVelocity *= (1.0 - (bone.damping || 0.1));
            }
        }
    }

    /**
     * Lanza un círculo en la escena y devuelve información sobre el primer objeto que impacta.
     * Implementado mediante multirayo (5 rayos) para cubrir todo el ancho del círculo y evitar "caerse" por bordes finos.
     * @param {{x: number, y: number}} origin - Centro inicial.
     * @param {{x: number, y: number}} direction - Dirección del barrido (normalizada).
     * @param {number} radius - Radio del círculo.
     * @param {number} maxDistance - Distancia máxima del barrido.
     * @param {string|string[]|number[]|object} [filter] - Opcional, filtrar por tag o excluir IDs/Nodos.
     */
    circleCast(origin, direction, radius, maxDistance = Infinity, filter = null) {
        if (!direction || (direction.x === 0 && direction.y === 0)) return null;

        const perp = { x: -direction.y, y: direction.x };
        let closestHit = null;

        // Usamos 5 rayos para cubrir el ancho del círculo.
        // Reducimos el offset a 0.8 para evitar colisiones erróneas con paredes perfectamente verticales
        const offsets = [-0.8, -0.4, 0, 0.4, 0.8];

        for (const offset of offsets) {
            const rayOrigin = {
                x: origin.x + perp.x * radius * offset,
                y: origin.y + perp.y * radius * offset
            };

            // Proyectamos el rayo. hit.distance es la distancia desde rayOrigin al suelo.
            const hit = this.raycast(rayOrigin, direction, maxDistance + radius, filter);

            if (hit) {
                // El punto del círculo en este offset está a 'baseHeight' por debajo de la línea central.
                // Usamos Math.abs para el offset para mayor seguridad matemática.
                const baseHeight = Math.sqrt(radius * radius - (radius * offset) * (radius * offset));
                // La distancia que recorre el CENTRO del círculo hasta que este punto toca es:
                const adjustedDist = hit.distance - baseHeight;

                if (adjustedDist <= maxDistance && (!closestHit || adjustedDist < closestHit.distance)) {
                    closestHit = {
                        ...hit,
                        distance: adjustedDist
                    };
                }
            }
        }

        return closestHit;
    }

    _step(deltaTime) {
        const allMaterias = this.scene.getAllMaterias();

        // Cache water components once per step
        const waterComponents = [];
        for (let i = 0; i < allMaterias.length; i++) {
            const w = allMaterias[i].getComponent(Components.Water);
            if (w && w.particles && w.particles.length > 0) waterComponents.push(w);
        }

        // 1. Apply physics forces (gravity, velocity)
        for (let i = 0; i < allMaterias.length; i++) {
            const materia = allMaterias[i];
            const rigidbody = materia.getComponent(Components.Rigidbody2D);
            const transform = materia.getComponent(Components.Transform);

            if (rigidbody && transform && rigidbody.bodyType.toLowerCase() === 'dynamic' && rigidbody.simulated) {
                const PHYSICS_SCALE = 100;

                rigidbody.velocity.x = this._clamp(rigidbody.velocity.x, -this.MAX_VELOCITY, this.MAX_VELOCITY);
                rigidbody.velocity.y = this._clamp(rigidbody.velocity.y, -this.MAX_VELOCITY, this.MAX_VELOCITY);

                rigidbody.velocity.y += this.gravity.y * rigidbody.gravityScale * deltaTime;

                // --- Apply buoyancy if in water (PARTICLE-BASED) ---
                for (let wIdx = 0; wIdx < waterComponents.length; wIdx++) {
                    const water = waterComponents[wIdx];
                    const collider = this.getCollider(materia);
                    const objRadius = (collider && collider.size) ? (Math.max(collider.size.x * transform.scale.x, collider.size.y * transform.scale.y) / 2) : 25;
                    const influenceRadius = objRadius + 40;
                    const influenceRadiusSq = influenceRadius * influenceRadius;

                    let nearbyParticles = 0;
                    let avgY = 0;

                    // Optimized: Use spatial grid from the Water component
                    if (water._spatialGrid && water.bounds) {
                        const spacing = water._spacing || 18;
                        const h = spacing * 1.5;
                        const invH = 1 / h;
                        const gx = Math.floor((transform.x - water.bounds.minX) * invH);
                        const gy = Math.floor((transform.y - water.bounds.minY) * invH);
                        const range = Math.ceil(influenceRadius * invH);

                        for (let ox = -range; ox <= range; ox++) {
                            for (let oy = -range; oy <= range; oy++) {
                                const key = ((gx + ox) & 0xFFFF) | (((gy + oy) & 0xFFFF) << 16);
                                const cell = water._spatialGrid.get(key);
                                if (!cell) continue;
                                for (let cIdx = 0; cIdx < cell.length; cIdx++) {
                                    const p = water.particles[cell[cIdx]];
                                    const dx = p.x - transform.x;
                                    const dy = p.y - transform.y;
                                    const dSq = dx * dx + dy * dy;
                                    if (dSq < influenceRadiusSq) {
                                        nearbyParticles++;
                                        avgY += p.y;
                                    }
                                }
                            }
                        }
                    }

                    if (nearbyParticles > 3) {
                        avgY /= nearbyParticles;
                        // immersion basado en densidad local y profundidad
                        // In +Y UP, depth is positive if water surface (avgY) is above object (transform.y)
                        const depth = Math.max(0, avgY - transform.y);
                        const immersion = Math.min(1.2, (nearbyParticles / 12) + (depth / 50));

                        // Fuerza de flotación suavizada (hacia arriba, +Y)
                        const buoyancyForce = immersion * water.density * 45.0;

                        if (rigidbody.buoyancyWeight > rigidbody.sinkThreshold) {
                            // Se hunde, pero con resistencia (empuje hacia arriba opuesto a gravedad)
                            rigidbody.velocity.y += buoyancyForce * 0.2 * deltaTime;
                        } else {
                            // Flota: lift es empuje hacia arriba (+Y)
                            const lift = buoyancyForce * Math.max(0.5, (2.0 - rigidbody.buoyancyWeight));
                            rigidbody.velocity.y += lift * deltaTime;

                            // Estabilización en superficie: si está muy ARRIBA (fuera del agua), lo atrae un poco hacia abajo
                            if (transform.y > avgY + 20) {
                                rigidbody.velocity.y -= 10.0 * deltaTime;
                            }
                        }

                        // Resistencia del fluido (Drag) - MUCHO más fuerte para evitar "vuelos"
                        // Aplicamos un amortiguamiento lineal y cuadrático aproximado
                        const dragFactor = 1.0 - (0.4 * water.viscosity * immersion);
                        const finalDrag = Math.pow(Math.max(0.1, dragFactor), deltaTime * 60);
                        rigidbody.velocity.x *= finalDrag;
                        rigidbody.velocity.y *= finalDrag;

                        // Amortiguación de impacto (Splash damping) - In +Y UP, falling is negative velocity
                        if (rigidbody.velocity.y < -5) {
                             rigidbody.velocity.y *= Math.pow(0.8, deltaTime * 60);
                        }
                    }
                }

                // Apply linear drag
                if (rigidbody.linearDrag > 0) {
                    // Stable exponential decay for linear drag
                    const dragFactor = Math.exp(-rigidbody.linearDrag * deltaTime * 10);
                    rigidbody.velocity.x *= dragFactor;
                    rigidbody.velocity.y *= dragFactor;
                }

                // Update position
                transform.x += rigidbody.velocity.x * PHYSICS_SCALE * deltaTime;
                transform.y += rigidbody.velocity.y * PHYSICS_SCALE * deltaTime;

                // Apply angular velocity
                if (!rigidbody.constraints.freezeRotation) {
                    transform.rotation += rigidbody.angularVelocity * PHYSICS_SCALE * deltaTime;
                    // Apply angular drag (scaled by deltaTime for consistent behavior across frame rates)
                    rigidbody.angularVelocity *= Math.pow(1.0 - rigidbody.angularDrag, deltaTime);
                }
            }
        }

        // 2. Broad-phase collision detection and state update using Spatial Hash Grid
        const newActiveCollisions = new Map();
        const collidables = this.scene.getAllMaterias().filter(m => {
            if (!m.isActive) return false;
            const rb = m.getComponent(Components.Rigidbody2D);
            // Ignore if the Rigidbody is explicitly marked as non-simulated
            if (rb && rb.simulated === false) return false;

            return m.getComponent(Components.BoxCollider2D) || m.getComponent(Components.CapsuleCollider2D) ||
                   m.getComponent(Components.CircleCollider2D) || m.getComponent(Components.PolygonCollider2D) ||
                   m.getComponent(Components.TilemapCollider2D) || m.getComponent(Components.TerrenoCollider2D) ||
                   m.getComponent(Components.LineCollider2D);
        });

        // Spatial grid implementation
        const CELL_SIZE = 250;
        const grid = new Map();

        for (let i = 0; i < collidables.length; i++) {
            const m = collidables[i];
            const aabb = this.getAABB(m);
            const minCellX = Math.floor(aabb.minX / CELL_SIZE);
            const maxCellX = Math.floor(aabb.maxX / CELL_SIZE);
            const minCellY = Math.floor(aabb.minY / CELL_SIZE);
            const maxCellY = Math.floor(aabb.maxY / CELL_SIZE);

            for (let cx = minCellX; cx <= maxCellX; cx++) {
                for (let cy = minCellY; cy <= maxCellY; cy++) {
                    const cellKey = (cx & 0xFFFF) | ((cy & 0xFFFF) << 16);
                    let list = grid.get(cellKey);
                    if (!list) {
                        list = [];
                        grid.set(cellKey, list);
                    }
                    list.push(m);
                }
            }
        }

        const checkedPairs = new Set();

        for (const [cellKey, cellObjects] of grid.entries()) {
            if (cellObjects.length < 2) continue;
            for (let i = 0; i < cellObjects.length; i++) {
                for (let j = i + 1; j < cellObjects.length; j++) {
                    const materiaA = cellObjects[i];
                    const materiaB = cellObjects[j];

                    const pairKey = materiaA.id < materiaB.id ? `${materiaA.id}_${materiaB.id}` : `${materiaB.id}_${materiaA.id}`;
                    if (checkedPairs.has(pairKey)) continue;
                    checkedPairs.add(pairKey);

                    // --- 2.1 Collision Filtering ---

                    // 2. Assembly Filter (Vehicle Support):
                    // If they share a Suspension connection (Wheel vs Chassis), don't collide.
                    const suspA = materiaA.getComponent(Components.Suspension);
                    const suspB = materiaB.getComponent(Components.Suspension);

                    if (suspA || suspB) {
                        const susp = suspA || suspB;
                        const wheel = suspA ? materiaA : materiaB;
                        const other = suspA ? materiaB : materiaA;

                        let chasisMtr = susp.chasis;
                        if (typeof chasisMtr === 'number') chasisMtr = this.scene.findMateriaById(susp.chasis);

                        if (chasisMtr && (other === chasisMtr || chasisMtr.isAncestorOf(other) || other.isAncestorOf(chasisMtr))) {
                            continue; // No collision between wheel and its chassis/hierarchy
                        }
                    }

                    if (materiaA.isAncestorOf(materiaB) || materiaB.isAncestorOf(materiaA)) {
                        continue;
                    }

                    // Basic check: two static bodies can't collide if neither is a trigger
                    const rbA = materiaA.getComponent(Components.Rigidbody2D);
                    const rbB = materiaB.getComponent(Components.Rigidbody2D);
                    const colliderA = this.getCollider(materiaA);
                    const colliderB = this.getCollider(materiaB);

                    if (rbA && rbB && rbA.bodyType.toLowerCase() === 'static' && rbB.bodyType.toLowerCase() === 'static' && !colliderA.isTrigger && !colliderB.isTrigger) {
                        continue;
                    }

                    const collisionInfo = this.checkCollision(materiaA, materiaB);

                    if (collisionInfo) {
                        const key = this._generateCollisionKey(materiaA.id, materiaB.id);
                        const type = colliderA.isTrigger || colliderB.isTrigger ? 'trigger' : 'collision';

                        newActiveCollisions.set(key, { materiaA, materiaB, type });
                    }
                }
            }
        }

        // 3. Determine collision states (enter, stay, exit)
        const previousKeys = new Set(this.activeCollisions.keys());
        const currentKeys = new Set(newActiveCollisions.keys());

        // ENTER: In current but not in previous
        for (const key of currentKeys) {
            if (!previousKeys.has(key)) {
                const { type } = newActiveCollisions.get(key);
                this.collisionStates.set(key, { state: 'enter', frame: this.currentFrame, type });
            }
        }

        // STAY: In current and also in previous
        for (const key of currentKeys) {
            if (previousKeys.has(key)) {
                 const { type } = newActiveCollisions.get(key);
                this.collisionStates.set(key, { state: 'stay', frame: this.currentFrame, type });
            }
        }

        // EXIT: In previous but not in current
        for (const key of previousKeys) {
            if (!currentKeys.has(key)) {
                const { type } = this.activeCollisions.get(key);
                this.collisionStates.set(key, { state: 'exit', frame: this.currentFrame, type });
            }
        }

        // 4. Update active collisions for the next frame
        this.activeCollisions = newActiveCollisions;

        // 5. Clean up old 'exit' states
        for (const [key, value] of this.collisionStates.entries()) {
            if (value.state === 'exit' && value.frame < this.currentFrame) {
                this.collisionStates.delete(key);
            }
        }

        // --- 6. Trigger Script Events ---
        for (const [key, info] of this.collisionStates.entries()) {
            // Only process events from the current frame
            if (info.frame !== this.currentFrame) continue;

            const [idA, idB] = key.split('-').map(Number);
            const materiaA = this.scene.findMateriaById(idA);
            const materiaB = this.scene.findMateriaById(idB);

            if (!materiaA || !materiaB) continue;

            const collisionInfo = this.checkCollision(materiaA, materiaB); // Re-calculate or cache from resolution
            this._triggerScriptEvents(materiaA, materiaB, info.state, info.type, collisionInfo, false);
            this._triggerScriptEvents(materiaB, materiaA, info.state, info.type, collisionInfo, true);
        }
    }

    _triggerScriptEvents(materia, other, state, type, mtv, isInverted) {
        const laws = materia.leyes || [];
        if (laws.length === 0) return;

        const otherCollider = this.getCollider(other);
        const collision = new Collision(materia, other, otherCollider);
        if (mtv) {
            let nx = mtv.x;
            let ny = mtv.y;
            if (isInverted) {
                nx = -nx;
                ny = -ny;
            }
            collision.normal = this._normalize({ x: nx, y: ny });

            const rbSelf = materia.getComponent(Components.Rigidbody2D);
            const rbOther = other.getComponent(Components.Rigidbody2D);
            const velSelf = rbSelf ? rbSelf.velocity : { x: 0, y: 0 };
            const velOther = rbOther ? rbOther.velocity : { x: 0, y: 0 };
            collision.relativeVelocity = { x: velSelf.x - velOther.x, y: velSelf.y - velOther.y };
        }

        let methodName = '';
        let englishMethodName = '';

        if (type === 'collision') {
            if (state === 'enter') { methodName = 'alEntrarEnColision'; englishMethodName = 'OnCollisionEnter'; }
            else if (state === 'stay') { methodName = 'alPermanecerEnColision'; englishMethodName = 'OnCollisionStay'; }
            else if (state === 'exit') { methodName = 'alSalirDeColision'; englishMethodName = 'OnCollisionExit'; }
        } else {
            if (state === 'enter') { methodName = 'alEntrarEnTrigger'; englishMethodName = 'OnTriggerEnter'; }
            else if (state === 'stay') { methodName = 'alPermanecerEnTrigger'; englishMethodName = 'OnTriggerStay'; }
            else if (state === 'exit') { methodName = 'alSalirDeTrigger'; englishMethodName = 'OnTriggerExit'; }
        }

        for (const ley of laws) {
            if (typeof ley[methodName] === 'function') {
                try {
                    ley[methodName](collision);
                } catch (e) {
                    console.error(`Error executing ${methodName} on component ${ley.constructor.name}:`, e);
                }
            } else if (typeof ley[englishMethodName] === 'function') {
                try {
                    ley[englishMethodName](collision);
                } catch (e) {
                    console.error(`Error executing ${englishMethodName} on component ${ley.constructor.name}:`, e);
                }
            } else if (ley.constructor.name === 'CreativeScript' && typeof ley._safeInvoke === 'function') {
                ley._safeInvoke(methodName, collision);
            }
        }
    }

    /**
     * Main collision check dispatcher.
     * @param {Materia} materiaA
     * @param {Materia} materiaB
     * @returns {object|null} The MTV if a collision occurs, otherwise null.
     */
    checkCollision(materiaA, materiaB) {
        if (window._PerformanceMetrics) {
            window._PerformanceMetrics.collisionsChecked = (window._PerformanceMetrics.collisionsChecked || 0) + 1;
        }
        const colliderA = this.getCollider(materiaA);
        const colliderB = this.getCollider(materiaB);

        if (!colliderA || !colliderB) return null;

        let collisionInfo = null;

        // --- Dispatcher de Colisiones ---
        // El sistema espera que collisionInfo (MTV) apunte de B hacia A para que resolveCollision funcione correctamente
        if (colliderA instanceof Components.BoxCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D) {
                collisionInfo = this.isBoxVsBox(materiaA, materiaB);
            } else if (colliderB instanceof Components.CircleCollider2D) {
                collisionInfo = this.isCircleVsBox(materiaB, materiaA);
                if (collisionInfo) { collisionInfo.x = -collisionInfo.x; collisionInfo.y = -collisionInfo.y; }
            } else if (colliderB instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isBoxVsCapsule(materiaA, materiaB);
            } else if (colliderB instanceof Components.PolygonCollider2D) {
                collisionInfo = this.isPolygonVsPolygon(materiaA, materiaB);
            } else if (colliderB instanceof Components.TilemapCollider2D || colliderB instanceof Components.TerrenoCollider2D) {
                collisionInfo = this.isColliderVsTilemap(materiaA, materiaB);
            } else if (colliderB instanceof Components.LineCollider2D) {
                collisionInfo = this.isColliderVsLine(materiaA, materiaB);
            }
        } else if (colliderA instanceof Components.CircleCollider2D) {
            if (colliderB instanceof Components.CircleCollider2D) {
                collisionInfo = this.isCircleVsCircle(materiaA, materiaB);
            } else if (colliderB instanceof Components.BoxCollider2D) {
                collisionInfo = this.isCircleVsBox(materiaA, materiaB);
            } else if (colliderB instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isCircleVsCapsule(materiaA, materiaB);
            } else if (colliderB instanceof Components.PolygonCollider2D) {
                collisionInfo = this.isCircleVsPolygon(materiaA, materiaB);
            } else if (colliderB instanceof Components.TilemapCollider2D || colliderB instanceof Components.TerrenoCollider2D) {
                collisionInfo = this.isColliderVsTilemap(materiaA, materiaB);
            } else if (colliderB instanceof Components.LineCollider2D) {
                collisionInfo = this.isColliderVsLine(materiaA, materiaB);
            }
        } else if (colliderA instanceof Components.CapsuleCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D) {
                const info = this.isBoxVsCapsule(materiaB, materiaA);
                if (info) {
                    info.x = -info.x; info.y = -info.y;
                    collisionInfo = info;
                }
            } else if (colliderB instanceof Components.CircleCollider2D) {
                const info = this.isCircleVsCapsule(materiaB, materiaA);
                if (info) {
                    info.x = -info.x; info.y = -info.y;
                    collisionInfo = info;
                }
            } else if (colliderB instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isCapsuleVsCapsule(materiaA, materiaB);
            } else if (colliderB instanceof Components.PolygonCollider2D) {
                const info = this.isPolygonVsCapsule(materiaB, materiaA);
                if (info) {
                    info.x = -info.x; info.y = -info.y;
                    collisionInfo = info;
                }
            } else if (colliderB instanceof Components.TilemapCollider2D || colliderB instanceof Components.TerrenoCollider2D) {
                collisionInfo = this.isColliderVsTilemap(materiaA, materiaB);
            } else if (colliderB instanceof Components.LineCollider2D) {
                collisionInfo = this.isColliderVsLine(materiaA, materiaB);
            }
        } else if (colliderA instanceof Components.PolygonCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D) {
                collisionInfo = this.isPolygonVsPolygon(materiaA, materiaB);
            } else if (colliderB instanceof Components.CircleCollider2D) {
                const info = this.isCircleVsPolygon(materiaB, materiaA);
                if (info) {
                    info.x = -info.x; info.y = -info.y;
                    collisionInfo = info;
                }
            } else if (colliderB instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isPolygonVsCapsule(materiaA, materiaB);
            } else if (colliderB instanceof Components.PolygonCollider2D) {
                collisionInfo = this.isPolygonVsPolygon(materiaA, materiaB);
            } else if (colliderB instanceof Components.TilemapCollider2D || colliderB instanceof Components.TerrenoCollider2D) {
                collisionInfo = this.isColliderVsTilemap(materiaA, materiaB);
            } else if (colliderB instanceof Components.LineCollider2D) {
                collisionInfo = this.isColliderVsLine(materiaA, materiaB);
            }
        } else if (colliderA instanceof Components.TilemapCollider2D || colliderA instanceof Components.TerrenoCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D || colliderB instanceof Components.CircleCollider2D || colliderB instanceof Components.CapsuleCollider2D || colliderB instanceof Components.PolygonCollider2D) {
                const info = this.isColliderVsTilemap(materiaB, materiaA);
                if (info) {
                    info.x = -info.x; info.y = -info.y;
                    collisionInfo = info;
                }
            }
        } else if (colliderA instanceof Components.LineCollider2D) {
             const info = this.isColliderVsLine(materiaB, materiaA);
             if (info) {
                 info.x = -info.x; info.y = -info.y;
                 collisionInfo = info;
             }
        }

        // --- Platform Effector 2D Filter ---
        if (collisionInfo) {
            if (!this._applyEffectorFilter(materiaA, materiaB, collisionInfo)) {
                collisionInfo = null;
            }
        }

        if (collisionInfo && !colliderA.isTrigger && !colliderB.isTrigger) {
            this.resolveCollision(materiaA, materiaB, collisionInfo);
        }

        return collisionInfo;
    }

    /**
     * Filters collision based on PlatformEffector2D settings.
     * @private
     */
    _applyEffectorFilter(materiaA, materiaB, collisionInfo) {
        const effectorA = materiaA.getComponent(Components.PlatformEffector2D);
        const effectorB = materiaB.getComponent(Components.PlatformEffector2D);

        if (effectorA && effectorA.isActive) {
            if (!this._shouldCollideWithEffector(materiaB, materiaA, effectorA, collisionInfo)) return false;
        }
        if (effectorB && effectorB.isActive) {
            // Invert collisionInfo because it points B -> A, we need A -> B for the check
            const invertedInfo = { x: -collisionInfo.x, y: -collisionInfo.y };
            if (!this._shouldCollideWithEffector(materiaA, materiaB, effectorB, invertedInfo)) return false;
        }
        return true;
    }

    /**
     * Determines if a collision should occur with an effector.
     * @private
     * @param {Materia} other The materia colliding with the effector.
     * @param {Materia} effectorMtr The effector materia.
     * @param {Components.PlatformEffector2D} effector The effector component.
     * @param {object} mtv The Minimum Translation Vector (Other -> Effector).
     */
    _shouldCollideWithEffector(other, effectorMtr, effector, mtv) {
        if (!effector.useOneWay) return true;

        // mtv points Other -> Effector.
        // normal should point Effector -> Other (the direction we want to push "other" away).
        const normal = this._normalize({ x: -mtv.x, y: -mtv.y });

        // 1. Relative Velocity Check
        const rbOther = other.getComponent(Components.Rigidbody2D);
        const rbEffector = effectorMtr.getComponent(Components.Rigidbody2D);
        const velOther = rbOther ? rbOther.velocity : { x: 0, y: 0 };
        const velEffector = rbEffector ? rbEffector.velocity : { x: 0, y: 0 };

        const relVel = { x: velOther.x - velEffector.x, y: velOther.y - velEffector.y };
        const velAlongNormal = this._dot(relVel, normal);

        // If moving away from the effector (positive velocity along normal), ignore.
        // We use a small threshold to allow for resting on platforms.
        if (velAlongNormal > 0.05) return false;

        // 2. Side Filtering
        const effectorTrans = effectorMtr.getComponent(Components.Transform);
        const effRotRad = (effectorTrans ? effectorTrans.rotation : 0) * Math.PI / 180;
        // In +Y UP, angle 0 with sin/cos gives Right=(1,0) and Up=(0,1)
        const worldUp = { x: -Math.sin(effRotRad), y: Math.cos(effRotRad) };
        const worldRight = { x: Math.cos(effRotRad), y: Math.sin(effRotRad) };

        const dotUp = this._dot(normal, worldUp);
        const dotDown = this._dot(normal, { x: -worldUp.x, y: -worldUp.y });
        const dotRight = this._dot(normal, worldRight);
        const dotLeft = this._dot(normal, { x: -worldRight.x, y: -worldRight.y });

        // Use arc for Up direction if blockUp is enabled
        if (effector.blockUp) {
            const halfArcRad = (effector.surfaceArc / 2) * Math.PI / 180;
            const arcThreshold = Math.cos(halfArcRad);
            if (dotUp >= arcThreshold - 0.01) return true;
        }

        const sideThreshold = 0.707; // 45 degrees
        if (effector.blockDown && dotDown > sideThreshold) return true;
        if (effector.blockRight && dotRight > sideThreshold) return true;
        if (effector.blockLeft && dotLeft > sideThreshold) return true;

        return false;
    }

    _cross(v1, v2) {
        return v1.x * v2.y - v1.y * v2.x;
    }

    resolveCollision(materiaA, materiaB, collisionInfo) {
        const transformA = materiaA.getComponent(Components.Transform);
        const transformB = materiaB.getComponent(Components.Transform);
        const mtv = { x: collisionInfo.x, y: collisionInfo.y };
        const contactPoint = collisionInfo.contactPoint || { x: (transformA.x + transformB.x) / 2, y: (transformA.y + transformB.y) / 2 };
        const rbA = materiaA.getComponent(Components.Rigidbody2D);
        const rbB = materiaB.getComponent(Components.Rigidbody2D);

        // --- 1. Position Correction (Penetration Resolution) ---
        const isADynamic = rbA && rbA.bodyType.toLowerCase() === 'dynamic';
        const isBDynamic = rbB && rbB.bodyType.toLowerCase() === 'dynamic';

        if (isADynamic && !isBDynamic) {
            transformA.x += mtv.x; transformA.y += mtv.y;
        } else if (!isADynamic && isBDynamic) {
            transformB.x -= mtv.x; transformB.y -= mtv.y;
        } else if (isADynamic && isBDynamic) {
            transformA.x += mtv.x / 2; transformA.y += mtv.y / 2;
            transformB.x -= mtv.x / 2; transformB.y -= mtv.y / 2;
        }

        // --- 2. Impulse Resolution (Bounce) ---
        const normal = this._normalize({ x: mtv.x, y: mtv.y });
        const tangent = { x: -normal.y, y: normal.x };

        const ra = { x: contactPoint.x - transformA.x, y: contactPoint.y - transformA.y };
        const rb = { x: contactPoint.x - transformB.x, y: contactPoint.y - transformB.y };

        const angVelA = rbA ? (rbA.angularVelocity || 0) : 0;
        const angVelB = rbB ? (rbB.angularVelocity || 0) : 0;

        const velA = rbA ? {
            x: rbA.velocity.x - angVelA * ra.y,
            y: rbA.velocity.y + angVelA * ra.x
        } : { x: 0, y: 0 };

        const velB = rbB ? {
            x: rbB.velocity.x - angVelB * rb.y,
            y: rbB.velocity.y + angVelB * rb.x
        } : { x: 0, y: 0 };

        const relativeVelocity = { x: velA.x - velB.x, y: velA.y - velB.y };
        const velAlongNormal = this._dot(relativeVelocity, normal);

        if (velAlongNormal > 0) return;

        const e = Math.max(rbA ? rbA.rebote : 0, rbB ? rbB.rebote : 0);
        let invMassA = isADynamic ? 1 / (rbA.mass || 1) : 0;
        let invMassB = isBDynamic ? 1 / (rbB.mass || 1) : 0;

        const getInertia = (materia, rb) => {
            if (!rb || rb.constraints.freezeRotation) return 0;
            const collider = this.getCollider(materia);
            const transform = materia.getComponent(Components.Transform);
            let w = 50, h = 50;
            if (collider instanceof Components.BoxCollider2D || collider instanceof Components.CapsuleCollider2D) {
                w = collider.size.x * (transform ? Math.abs(transform.scale.x) : 1);
                h = collider.size.y * (transform ? Math.abs(transform.scale.y) : 1);
            } else if (collider instanceof Components.CircleCollider2D) {
                w = h = collider.radius * 2 * (transform ? Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y)) : 1);
            }
            return (1/12) * rb.mass * (w * w + h * h);
        };

        const inertiaA = getInertia(materiaA, rbA);
        const inertiaB = getInertia(materiaB, rbB);
        const invInertiaA = inertiaA > 0 ? 1 / inertiaA : 0;
        const invInertiaB = inertiaB > 0 ? 1 / inertiaB : 0;

        const raCrossN = this._cross(ra, normal);
        const rbCrossN = this._cross(rb, normal);
        let denominator = invMassA + invMassB + (raCrossN * raCrossN * invInertiaA) + (rbCrossN * rbCrossN * invInertiaB);

        let j = -(1 + e) * velAlongNormal;
        if (denominator > 0) j /= denominator;
        else return;

        const impulse = { x: j * normal.x, y: j * normal.y };

        // --- 3. Friction Resolution ---
        const velAlongTangent = this._dot(relativeVelocity, tangent);
        const raCrossT = this._cross(ra, tangent);
        const rbCrossT = this._cross(rb, tangent);
        let tangentDenominator = invMassA + invMassB + (raCrossT * raCrossT * invInertiaA) + (rbCrossT * rbCrossT * invInertiaB);

        const mu = 0.4; // Friction coefficient
        let jt = -velAlongTangent;
        if (tangentDenominator > 0) jt /= tangentDenominator;

        // Coulomb's Law: jt <= j * mu
        const maxFriction = Math.abs(j * mu);
        jt = this._clamp(jt, -maxFriction, maxFriction);

        const frictionImpulse = { x: jt * tangent.x, y: jt * tangent.y };

        if (isADynamic) {
            const totalImpulse = { x: impulse.x + frictionImpulse.x, y: impulse.y + frictionImpulse.y };
            rbA.velocity.x += totalImpulse.x * invMassA;
            rbA.velocity.y += totalImpulse.y * invMassA;
            if (!rbA.constraints.freezeRotation) {
                rbA.angularVelocity += this._cross(ra, totalImpulse) * invInertiaA;
            }
        }

        if (isBDynamic) {
            const totalImpulse = { x: impulse.x + frictionImpulse.x, y: impulse.y + frictionImpulse.y };
            rbB.velocity.x -= totalImpulse.x * invMassB;
            rbB.velocity.y -= totalImpulse.y * invMassB;
            if (!rbB.constraints.freezeRotation) {
                rbB.angularVelocity -= this._cross(rb, totalImpulse) * invInertiaB;
            }
        }
    }

    getCollider(materia) {
        return materia.getComponent(Components.BoxCollider2D) ||
               materia.getComponent(Components.CapsuleCollider2D) ||
               materia.getComponent(Components.CircleCollider2D) ||
               materia.getComponent(Components.PolygonCollider2D) ||
               materia.getComponent(Components.TilemapCollider2D) ||
               materia.getComponent(Components.TerrenoCollider2D) ||
               materia.getComponent(Components.LineCollider2D);
    }

    getAABB(materia) {
        const transform = materia.getComponent(Components.Transform);
        if (!transform) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        const collider = this.getCollider(materia);
        let w = 50, h = 50;
        if (collider) {
            const colliderName = collider.constructor.name;
            if (colliderName === 'TilemapCollider2D' || colliderName === 'TerrenoCollider2D') {
                if (collider.isDirty) {
                    collider.generate();
                }
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                const scaleX = Math.abs(transform.scale.x);
                const scaleY = Math.abs(transform.scale.y);

                if (collider.generatedColliders && collider.generatedColliders.length > 0) {
                    for (let i = 0; i < collider.generatedColliders.length; i++) {
                        const rect = collider.generatedColliders[i];
                        const rx = transform.x + rect.x * transform.scale.x;
                        const ry = transform.y + rect.y * transform.scale.y;
                        const rw = rect.width * scaleX;
                        const rh = rect.height * scaleY;

                        const rMinX = rx - rw / 2;
                        const rMaxX = rx + rw / 2;
                        const rMinY = ry - rh / 2;
                        const rMaxY = ry + rh / 2;

                        if (rMinX < minX) minX = rMinX;
                        if (rMaxX > maxX) maxX = rMaxX;
                        if (rMinY < minY) minY = rMinY;
                        if (rMaxY > maxY) maxY = rMaxY;
                    }
                }
                if (collider.generatedPolygons && collider.generatedPolygons.length > 0) {
                    for (let i = 0; i < collider.generatedPolygons.length; i++) {
                        const poly = collider.generatedPolygons[i];
                        for (let j = 0; j < poly.vertices.length; j++) {
                            const v = poly.vertices[j];
                            const vx = transform.x + v.x * transform.scale.x;
                            const vy = transform.y + v.y * transform.scale.y;
                            if (vx < minX) minX = vx;
                            if (vx > maxX) maxX = vx;
                            if (vy < minY) minY = vy;
                            if (vy > maxY) maxY = vy;
                        }
                    }
                }

                if (minX !== Infinity) {
                    return { minX, minY, maxX, maxY };
                }
                // Fallback to transform position if no colliders generated yet
                return { minX: transform.x - 25, minY: transform.y - 25, maxX: transform.x + 25, maxY: transform.y + 25 };
            } else if (collider.size) {
                w = collider.size.x * Math.abs(transform.scale.x);
                h = collider.size.y * Math.abs(transform.scale.y);
            } else if (collider.radius !== undefined) {
                w = h = collider.radius * 2 * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y));
            }
        }
        const offset = collider ? (collider.offset || { x: 0, y: 0 }) : { x: 0, y: 0 };
        const cx = transform.x + offset.x;
        const cy = transform.y + offset.y;
        return {
            minX: cx - w/2,
            minY: cy - h/2,
            maxX: cx + w/2,
            maxY: cy + h/2
        };
    }

    _getLineVertices(transform, collider) {
        const angle = transform.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const scaledOffsetX = collider.offset.x * transform.scale.x;
        const scaledOffsetY = collider.offset.y * transform.scale.y;
        const worldOffsetX = scaledOffsetX * cos - scaledOffsetY * sin;
        const worldOffsetY = scaledOffsetX * sin + scaledOffsetY * cos;
        const centerX = transform.x + worldOffsetX;
        const centerY = transform.y + worldOffsetY;

        return collider.points.map(p => ({
            x: centerX + (p.x * transform.scale.x * cos - p.y * transform.scale.y * sin),
            y: centerY + (p.x * transform.scale.x * sin + p.y * transform.scale.y * cos)
        }));
    }


    isColliderVsLine(colliderMateria, lineMateria) {
        const collider = this.getCollider(colliderMateria);
        const lineCollider = lineMateria.getComponent(Components.LineCollider2D);
        const transformL = lineMateria.getComponent(Components.Transform);

        if (!collider || !lineCollider || !transformL) return null;

        const verticesL = this._getLineVertices(transformL, lineCollider);

        let bestCollision = null;
        let maxOverlap = -1;

        for (let i = 0; i < verticesL.length - 1; i++) {
            const p1 = verticesL[i];
            const p2 = verticesL[i+1];

            // Simplified: treat each segment as a thin polygon/box for now or just check distance
            const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

            if (!this._tempLineMateria) {
                this._tempLineMateria = new Materia('_physics_line_temp');
                this._tempLineTransform = new Components.Transform(this._tempLineMateria);
                this._tempLineBox = new Components.BoxCollider2D(this._tempLineMateria);
                this._tempLineMateria.getComponent = (t) => {
                    if (t === Components.Transform) return this._tempLineTransform;
                    if (t === Components.BoxCollider2D) return this._tempLineBox;
                    return null;
                };
            }

            this._tempLineTransform.position = mid;
            this._tempLineTransform.rotation = angle;
            this._tempLineTransform.scale = { x: 1, y: 1 };
            this._tempLineBox.size = { x: dist, y: 2 }; // Thin box

            let info = null;
            if (collider instanceof Components.BoxCollider2D) {
                info = this.isBoxVsBox(colliderMateria, this._tempLineMateria);
            } else if (collider instanceof Components.CircleCollider2D) {
                info = this.isCircleVsBox(colliderMateria, this._tempLineMateria);
            } else if (collider instanceof Components.CapsuleCollider2D) {
                info = this.isBoxVsCapsule(this._tempLineMateria, colliderMateria);
                if (info) { info.x = -info.x; info.y = -info.y; }
            } else if (collider instanceof Components.PolygonCollider2D) {
                info = this.isPolygonVsPolygon(colliderMateria, this._tempLineMateria);
            }

            if (info) {
                const effector = lineMateria.getComponent(Components.PlatformEffector2D);
                if (effector && effector.isActive) {
                    // SAT info points Effector -> Other, we need Other -> Effector
                    const correctedInfo = { x: -info.x, y: -info.y };
                    if (!this._shouldCollideWithEffector(colliderMateria, lineMateria, effector, correctedInfo)) {
                        info = null;
                    }
                }
            }

            if (info && info.magnitude > maxOverlap) {
                maxOverlap = info.magnitude;
                bestCollision = info;
            }
        }
        return bestCollision;
    }

    isColliderVsTilemap(colliderMateria, tilemapMateria) {
        const otherCollider = this.getCollider(colliderMateria);
        const tilemapCollider = tilemapMateria.getComponent(Components.TilemapCollider2D) || tilemapMateria.getComponent(Components.TerrenoCollider2D);
        const tilemapTransform = tilemapMateria.getComponent(Components.Transform);

        if (!otherCollider || !tilemapCollider || !tilemapTransform) return null;

        if (tilemapCollider.isDirty) {
            tilemapCollider.generate();
        }

        // Reutilizar objetos temporales para evitar Garbage Collection masivo
        if (!this._tempPartMateria) {
            this._tempPartMateria = new Materia('_physics_part_temp');
            this._tempPartTransform = new Components.Transform(this._tempPartMateria);
            this._tempPartBox = new Components.BoxCollider2D(this._tempPartMateria);
            this._tempPartPoly = new Components.PolygonCollider2D(this._tempPartMateria);

            this._tempPartMateria.getComponent = (type) => {
                if (type === Components.Transform) return this._tempPartTransform;
                if (type === Components.BoxCollider2D) return this._tempPartBox;
                if (type === Components.PolygonCollider2D) return this._tempPartPoly;
                return null;
            };
        }

        const partTransform = this._tempPartTransform;
        partTransform.position = tilemapTransform.position;
        partTransform.rotation = tilemapTransform.rotation;
        partTransform.scale = tilemapTransform.scale;

        let bestCollision = null;
        let maxOverlap = -1;

        // 1. Check generated rectangles
        const partBox = this._tempPartBox;
        partBox.isTrigger = tilemapCollider.isTrigger;

        const effector = tilemapMateria.getComponent(Components.PlatformEffector2D);

        for (const rect of tilemapCollider.generatedColliders) {
            partBox.offset = { x: rect.x, y: rect.y };
            partBox.size = { x: rect.width, y: rect.height };

            let collisionInfo = null;
            if (otherCollider instanceof Components.BoxCollider2D) {
                collisionInfo = this.isBoxVsBox(colliderMateria, this._tempPartMateria);
            } else if (otherCollider instanceof Components.CircleCollider2D) {
                collisionInfo = this.isCircleVsBox(colliderMateria, this._tempPartMateria);
            } else if (otherCollider instanceof Components.CapsuleCollider2D) {
                // isBoxVsCapsule(A, B) devuelve B -> A.
                // colliderMateria (Player) es B, terrain es A.
                // Así que devuelve Player -> Terrain. Queremos Terrain -> Player. Invertimos:
                collisionInfo = this.isBoxVsCapsule(this._tempPartMateria, colliderMateria);
                if (collisionInfo) {
                    collisionInfo.x = -collisionInfo.x; collisionInfo.y = -collisionInfo.y;
                }
            } else if (otherCollider instanceof Components.PolygonCollider2D) {
                collisionInfo = this.isPolygonVsPolygon(colliderMateria, this._tempPartMateria);
            }

            if (collisionInfo) {
                // If it's a tilemap with an effector, filter each rect collision
                if (effector && effector.isActive) {
                    // SAT collisionInfo points Effector -> Other, we need Other -> Effector
                    const correctedInfo = { x: -collisionInfo.x, y: -collisionInfo.y };
                    if (!this._shouldCollideWithEffector(colliderMateria, tilemapMateria, effector, correctedInfo)) {
                        collisionInfo = null;
                    }
                }
            }

            if (collisionInfo && collisionInfo.magnitude > maxOverlap) {
                maxOverlap = collisionInfo.magnitude;
                bestCollision = collisionInfo;
            }
        }

        // 2. Check generated polygons (Terreno in Polygon mode)
        const partPoly = this._tempPartPoly;
        partPoly.isTrigger = tilemapCollider.isTrigger;

        if (tilemapCollider.generatedPolygons && tilemapCollider.generatedPolygons.length > 0) {
            for (const poly of tilemapCollider.generatedPolygons) {
                partPoly.vertices = poly.vertices;
                partPoly.offset = { x: 0, y: 0 };

                let collisionInfo = null;
                if (otherCollider instanceof Components.BoxCollider2D) {
                    collisionInfo = this.isPolygonVsPolygon(colliderMateria, this._tempPartMateria);
                } else if (otherCollider instanceof Components.CircleCollider2D) {
                    collisionInfo = this.isCircleVsPolygon(otherCollider, this._tempPartMateria);
                } else if (otherCollider instanceof Components.CapsuleCollider2D) {
                    // isPolygonVsCapsule(A, B) devuelve B -> A. (Capsule -> Poly)
                    // Invertimos para obtener Poly -> Capsule:
                    collisionInfo = this.isPolygonVsCapsule(this._tempPartMateria, colliderMateria);
                    if (collisionInfo) {
                        collisionInfo.x = -collisionInfo.x; collisionInfo.y = -collisionInfo.y;
                    }
                } else if (otherCollider instanceof Components.PolygonCollider2D) {
                    collisionInfo = this.isPolygonVsPolygon(colliderMateria, this._tempPartMateria);
                }

                if (collisionInfo) {
                    if (effector && effector.isActive) {
                        // SAT collisionInfo points Effector -> Other, we need Other -> Effector
                        const correctedInfo = { x: -collisionInfo.x, y: -collisionInfo.y };
                        if (!this._shouldCollideWithEffector(colliderMateria, tilemapMateria, effector, correctedInfo)) {
                            collisionInfo = null;
                        }
                    }
                }

                if (collisionInfo && collisionInfo.magnitude > maxOverlap) {
                    maxOverlap = collisionInfo.magnitude;
                    bestCollision = collisionInfo;
                }
            }
        }

        return bestCollision;
    }

    _getCircleData(materia) {
        const transform = materia.getComponent(Components.Transform);
        const collider = materia.getComponent(Components.CircleCollider2D);
        const angle = transform.rotation * Math.PI / 180;

        const scaledOffsetX = collider.offset.x * transform.scale.x;
        const scaledOffsetY = collider.offset.y * transform.scale.y;
        const worldOffsetX = scaledOffsetX * Math.cos(angle) - scaledOffsetY * Math.sin(angle);
        const worldOffsetY = scaledOffsetX * Math.sin(angle) + scaledOffsetY * Math.cos(angle);

        return {
            center: { x: transform.x + worldOffsetX, y: transform.y + worldOffsetY },
            radius: collider.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y))
        };
    }

    isCircleVsCircle(materiaA, materiaB) {
        const circleA = this._getCircleData(materiaA);
        const circleB = this._getCircleData(materiaB);

        const dist = Math.hypot(circleA.center.x - circleB.center.x, circleA.center.y - circleB.center.y);
        const totalRadius = circleA.radius + circleB.radius;

        if (dist < totalRadius) {
            const overlap = totalRadius - dist;
            const normal = dist > 0 ?
                { x: (circleA.center.x - circleB.center.x) / dist, y: (circleA.center.y - circleB.center.y) / dist } :
                { x: 1, y: 0 };

            return {
                x: normal.x * overlap,
                y: normal.y * overlap,
                magnitude: overlap,
                contactPoint: {
                    x: circleB.center.x + normal.x * circleB.radius,
                    y: circleB.center.y + normal.y * circleB.radius
                }
            };
        }
        return null;
    }

    isCircleVsBox(circleMateria, boxMateria) {
        const circle = this._getCircleData(circleMateria);
        const transformB = boxMateria.getComponent(Components.Transform);
        const colliderB = boxMateria.getComponent(Components.BoxCollider2D);

        const bw = colliderB.size.x * transformB.scale.x;
        const bh = colliderB.size.y * transformB.scale.y;
        const angle = transformB.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const scaledOffsetX = colliderB.offset.x * transformB.scale.x;
        const scaledOffsetY = colliderB.offset.y * transformB.scale.y;
        const worldOffsetX = scaledOffsetX * cos - scaledOffsetY * sin;
        const worldOffsetY = scaledOffsetX * sin + scaledOffsetY * cos;
        const boxCenter = { x: transformB.x + worldOffsetX, y: transformB.y + worldOffsetY };

        // Transform circle to local box space
        const relX = circle.center.x - boxCenter.x;
        const relY = circle.center.y - boxCenter.y;
        const localX = relX * cos + relY * sin;
        const localY = -relX * sin + relY * cos;

        const halfW = bw / 2;
        const halfH = bh / 2;
        const clampedX = this._clamp(localX, -halfW, halfW);
        const clampedY = this._clamp(localY, -halfH, halfH);

        const closestLocal = { x: clampedX, y: clampedY };
        const dist = Math.hypot(localX - closestLocal.x, localY - closestLocal.y);

        if (dist < circle.radius) {
            const overlap = circle.radius - dist;
            const normalLocal = dist > 0 ?
                { x: (localX - closestLocal.x) / dist, y: (localY - closestLocal.y) / dist } :
                { x: localX > 0 ? 1 : -1, y: 0 };

            return {
                x: (normalLocal.x * cos - normalLocal.y * sin) * overlap,
                y: (normalLocal.x * sin + normalLocal.y * cos) * overlap,
                magnitude: overlap,
                contactPoint: {
                    x: boxCenter.x + (closestLocal.x * cos - closestLocal.y * sin),
                    y: boxCenter.y + (closestLocal.x * sin + closestLocal.y * cos)
                }
            };
        }
        return null;
    }

    isCircleVsCapsule(circleMateria, capsuleMateria) {
        const circle = this._getCircleData(circleMateria);
        const cap = this._getCapsulePoints(capsuleMateria);

        const closestOnSegment = this._closestPointOnSegment(circle.center, cap.p1, cap.p2);
        const dist = Math.hypot(circle.center.x - closestOnSegment.x, circle.center.y - closestOnSegment.y);
        const totalRadius = circle.radius + cap.radius;

        if (dist < totalRadius) {
            const overlap = totalRadius - dist;
            const normal = dist > 0 ?
                { x: (circle.center.x - closestOnSegment.x) / dist, y: (circle.center.y - closestOnSegment.y) / dist } :
                { x: 1, y: 0 };

            return {
                x: normal.x * overlap,
                y: normal.y * overlap,
                magnitude: overlap,
                contactPoint: {
                    x: closestOnSegment.x + normal.x * cap.radius,
                    y: closestOnSegment.y + normal.y * cap.radius
                }
            };
        }
        return null;
    }

    isCircleVsPolygon(circleMateria, polyMateria) {
        const circle = this._getCircleData(circleMateria);
        const transformP = polyMateria.getComponent(Components.Transform);
        const colliderP = polyMateria.getComponent(Components.PolygonCollider2D);
        const vertices = this._getPolygonVertices(transformP, colliderP);

        return this._isCircleVsPolygon(circle.center, circle.radius, vertices);
    }

    _getCapsulePoints(materia) {
        const transform = materia.getComponent(Components.Transform);
        const collider = materia.getComponent(Components.CapsuleCollider2D);
        const angle = transform.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Centro de la cápsula en el espacio del mundo (incluyendo offset escalado y rotado)
        const scaledOffsetX = collider.offset.x * transform.scale.x;
        const scaledOffsetY = collider.offset.y * transform.scale.y;
        const worldOffsetX = scaledOffsetX * cos - scaledOffsetY * sin;
        const worldOffsetY = scaledOffsetX * sin + scaledOffsetY * cos;

        const centerX = transform.x + worldOffsetX;
        const centerY = transform.y + worldOffsetY;

        const sizeX = collider.size.x * transform.scale.x;
        const sizeY = collider.size.y * transform.scale.y;
        const radius = sizeX / 2;
        const segmentHeight = Math.max(0, sizeY - sizeX);
        const hh = segmentHeight / 2;

        // Puntos finales en el espacio local (asumiendo cápsula vertical por defecto)
        let p1Local = { x: 0, y: -hh };
        let p2Local = { x: 0, y: hh };

        if (collider.direction === 'Horizontal') {
            const segmentWidth = Math.max(0, sizeX - sizeY);
            const hw = segmentWidth / 2;
            p1Local = { x: -hw, y: 0 };
            p2Local = { x: hw, y: 0 };
        }

        return {
            p1: {
                x: centerX + (p1Local.x * cos - p1Local.y * sin),
                y: centerY + (p1Local.x * sin + p1Local.y * cos)
            },
            p2: {
                x: centerX + (p2Local.x * cos - p2Local.y * sin),
                y: centerY + (p2Local.x * sin + p2Local.y * cos)
            },
            radius: radius
        };
    }

    isCapsuleVsCapsule(materiaA, materiaB) {
        const capA = this._getCapsulePoints(materiaA);
        const capB = this._getCapsulePoints(materiaB);

        // Encontrar los puntos más cercanos entre los dos segmentos de línea
        const { a, b } = this._closestPointsOnTwoSegments(capA.p1, capA.p2, capB.p1, capB.p2);

        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const totalRadius = capA.radius + capB.radius;

        if (distance < totalRadius) {
            const overlap = totalRadius - distance;
            // Normal apuntando de B a A
            const normal = distance > 0 ? { x: (a.x - b.x) / distance, y: (a.y - b.y) / distance } : { x: 1, y: 0 };

            return {
                x: normal.x * overlap,
                y: normal.y * overlap,
                magnitude: overlap,
                contactPoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
            };
        }

        return null;
    }

    _closestPointsOnTwoSegments(p1, q1, p2, q2) {
        // Adaptado de "Real-Time Collision Detection" by Christer Ericson
        const d1 = { x: q1.x - p1.x, y: q1.y - p1.y };
        const d2 = { x: q2.x - p2.x, y: q2.y - p2.y };
        const r = { x: p1.x - p2.x, y: p1.y - p2.y };

        const a = this._dot(d1, d1);
        const e = this._dot(d2, d2);
        const f = this._dot(d2, r);

        let s = 0, t = 0;

        if (a <= 1e-6 && e <= 1e-6) { // Ambos son puntos
            return { a: p1, b: p2 };
        }
        if (a <= 1e-6) { // El primer segmento es un punto
            s = 0;
            t = this._clamp(f / e, 0, 1);
        } else {
            const c = this._dot(d1, r);
            if (e <= 1e-6) { // El segundo segmento es un punto
                t = 0;
                s = this._clamp(-c / a, 0, 1);
            } else {
                const b = this._dot(d1, d2);
                const denom = a * e - b * b;

                if (denom !== 0) {
                    s = this._clamp((b * f - c * e) / denom, 0, 1);
                } else {
                    s = 0;
                }

                t = (b * s + f) / e;

                if (t < 0) {
                    t = 0;
                    s = this._clamp(-c / a, 0, 1);
                } else if (t > 1) {
                    t = 1;
                    s = this._clamp((b - c) / a, 0, 1);
                }
            }
        }

        const closestPointA = { x: p1.x + d1.x * s, y: p1.y + d1.y * s };
        const closestPointB = { x: p2.x + d2.x * t, y: p2.y + d2.y * t };
        return { a: closestPointA, b: closestPointB };
    }

    isPolygonVsCapsule(polyMateria, capsuleMateria) {
        const transformP = polyMateria.getComponent(Components.Transform);
        const colliderP = polyMateria.getComponent(Components.PolygonCollider2D) || polyMateria.getComponent(Components.BoxCollider2D);
        const cap = this._getCapsulePoints(capsuleMateria);

        const vertices = (colliderP instanceof Components.PolygonCollider2D) ?
            this._getPolygonVertices(transformP, colliderP) :
            this._getVertices(transformP, colliderP);

        // Encontrar el punto más cercano en el polígono al segmento de la cápsula
        const polyCenter = { x: transformP.x, y: transformP.y };
        const closestOnSegment = this._closestPointOnSegment(polyCenter, cap.p1, cap.p2);

        // Ahora tenemos un círculo vs polígono
        return this._isCircleVsPolygon(closestOnSegment, cap.radius, vertices);
    }

    _isCircleVsPolygon(circleCenter, radius, vertices) {
        let minOverlap = Infinity;
        let mtvAxis = null;

        // Ejes: normales de los bordes del polígono
        const axes = this._getAxes(vertices);

        // También necesitamos el eje desde el círculo al punto más cercano en el polígono
        const closestPoint = this._getClosestPointOnPolygon(circleCenter, vertices);
        const toCircle = { x: circleCenter.x - closestPoint.x, y: circleCenter.y - closestPoint.y };
        if (toCircle.x !== 0 || toCircle.y !== 0) {
            axes.push(this._normalize(toCircle));
        }

        for (const axis of axes) {
            const polyProj = this._project(vertices, axis);
            const circleProj = {
                min: this._dot(circleCenter, axis) - radius,
                max: this._dot(circleCenter, axis) + radius
            };

            const overlap = Math.min(polyProj.max, circleProj.max) - Math.max(polyProj.min, circleProj.min);
            if (overlap < 0) return null;

            if (overlap < minOverlap) {
                minOverlap = overlap;
                mtvAxis = axis;
            }
        }

        // Asegurar que el eje apunta del círculo al polígono (B a A si A es polígono)
        const polyCenter = {
            x: vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length,
            y: vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length
        };
        const direction = { x: polyCenter.x - circleCenter.x, y: polyCenter.y - circleCenter.y };
        if (this._dot(direction, mtvAxis) < 0) {
            mtvAxis = { x: -mtvAxis.x, y: -mtvAxis.y };
        }

        return {
            x: mtvAxis.x * minOverlap,
            y: mtvAxis.y * minOverlap,
            magnitude: minOverlap,
            contactPoint: closestPoint
        };
    }

    _getClosestPointOnPolygon(point, vertices) {
        let minDistance = Infinity;
        let closest = { x: 0, y: 0 };

        for (let i = 0; i < vertices.length; i++) {
            const p1 = vertices[i];
            const p2 = vertices[(i + 1) % vertices.length];
            const cp = this._closestPointOnSegment(point, p1, p2);
            const dist = Math.hypot(point.x - cp.x, point.y - cp.y);
            if (dist < minDistance) {
                minDistance = dist;
                closest = cp;
            }
        }
        return closest;
    }

    isBoxVsCapsule(boxMateria, capsuleMateria) {
        const transformB = boxMateria.getComponent(Components.Transform);
        const colliderB = boxMateria.getComponent(Components.BoxCollider2D);
        const cap = this._getCapsulePoints(capsuleMateria);

        // --- 1. Simplificar a colisión Círculo vs Caja Rotada ---
        const bw = colliderB.size.x * transformB.scale.x;
        const bh = colliderB.size.y * transformB.scale.y;

        const scaledOffsetX = colliderB.offset.x * transformB.scale.x;
        const scaledOffsetY = colliderB.offset.y * transformB.scale.y;
        const angle = transformB.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const worldOffsetX = scaledOffsetX * cos - scaledOffsetY * sin;
        const worldOffsetY = scaledOffsetX * sin + scaledOffsetY * cos;

        const boxCenter = { x: transformB.x + worldOffsetX, y: transformB.y + worldOffsetY };

        // Encontrar el punto más cercano en el segmento de la cápsula al centro de la caja
        const closestOnSegment = this._closestPointOnSegment(boxCenter, cap.p1, cap.p2);

        // Transformar el punto más cercano al espacio local de la caja (un-rotate)
        const relX = closestOnSegment.x - boxCenter.x;
        const relY = closestOnSegment.y - boxCenter.y;
        const localX = relX * cos + relY * sin;
        const localY = -relX * sin + relY * cos;

        // Pinzar el punto en el espacio local AABB
        const halfW = bw / 2;
        const halfH = bh / 2;
        const clampedLocalX = this._clamp(localX, -halfW, halfW);
        const clampedLocalY = this._clamp(localY, -halfH, halfH);

        // Transformar de vuelta al espacio mundial
        const closestInBox = {
            x: boxCenter.x + (clampedLocalX * cos - clampedLocalY * sin),
            y: boxCenter.y + (clampedLocalX * sin + clampedLocalY * cos)
        };

        const dist = Math.hypot(closestOnSegment.x - closestInBox.x, closestOnSegment.y - closestInBox.y);

        if (dist < cap.radius) {
            const overlap = cap.radius - dist;
            // Normal apuntando de Cápsula (B) a Caja (A)
            let nx = closestInBox.x - closestOnSegment.x;
            let ny = closestInBox.y - closestOnSegment.y;

            if (nx === 0 && ny === 0) {
                // Si están perfectamente superpuestos, usar la dirección desde el centro
                nx = boxCenter.x - closestOnSegment.x;
                ny = boxCenter.y - closestOnSegment.y;
                if (nx === 0 && ny === 0) nx = 1;
            }

            const len = Math.hypot(nx, ny);
            nx /= len; ny /= len;

            return {
                x: nx * overlap,
                y: ny * overlap,
                magnitude: overlap,
                contactPoint: closestInBox
            };
        }

        return null;
    }

    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    _closestPointOnSegment(point, a, b) {
        const ab = { x: b.x - a.x, y: b.y - a.y };
        const ap = { x: point.x - a.x, y: point.y - a.y };

        const dot_ab_ab = this._dot(ab, ab);
        if (dot_ab_ab === 0) return a; // a y b son el mismo punto

        const t = this._dot(ap, ab) / dot_ab_ab;
        const clampedT = this._clamp(t, 0, 1);

        return {
            x: a.x + ab.x * clampedT,
            y: a.y + ab.y * clampedT
        };
    }

    isPolygonVsPolygon(materiaA, materiaB) {
        const transformA = materiaA.getComponent(Components.Transform);
        const colliderA = materiaA.getComponent(Components.PolygonCollider2D) || materiaA.getComponent(Components.BoxCollider2D);
        const transformB = materiaB.getComponent(Components.Transform);
        const colliderB = materiaB.getComponent(Components.PolygonCollider2D) || materiaB.getComponent(Components.BoxCollider2D);

        const verticesA = (colliderA instanceof Components.PolygonCollider2D) ?
            this._getPolygonVertices(transformA, colliderA) :
            this._getVertices(transformA, colliderA);
        const verticesB = (colliderB instanceof Components.PolygonCollider2D) ?
            this._getPolygonVertices(transformB, colliderB) :
            this._getVertices(transformB, colliderB);

        const axes = [
            ...this._getAxes(verticesA),
            ...this._getAxes(verticesB)
        ];

        let minOverlap = Infinity;
        let mtvAxis = null;

        for (const axis of axes) {
            const projectionA = this._project(verticesA, axis);
            const projectionB = this._project(verticesB, axis);

            const overlap = Math.min(projectionA.max, projectionB.max) - Math.max(projectionA.min, projectionB.min);

            if (overlap < 0) {
                return null; // Separating axis found, no collision
            }

            if (overlap < minOverlap) {
                minOverlap = overlap;
                mtvAxis = axis;
            }
        }

        // Ensure MTV axis points from B to A
        const centerA = {
            x: verticesA.reduce((sum, v) => sum + v.x, 0) / verticesA.length,
            y: verticesA.reduce((sum, v) => sum + v.y, 0) / verticesA.length
        };
        const centerB = {
            x: verticesB.reduce((sum, v) => sum + v.x, 0) / verticesB.length,
            y: verticesB.reduce((sum, v) => sum + v.y, 0) / verticesB.length
        };
        let direction = { x: centerA.x - centerB.x, y: centerA.y - centerB.y };

        if (this._dot(direction, mtvAxis) < 0) {
            mtvAxis = { x: -mtvAxis.x, y: -mtvAxis.y };
        }

        // --- MANIFOLD CONTACT POINT LOGIC ---
        const contactPoints = [];
        for (const v of verticesA) {
            if (this._isPointInPolygon(v, verticesB)) contactPoints.push(v);
        }
        for (const v of verticesB) {
            if (this._isPointInPolygon(v, verticesA)) contactPoints.push(v);
        }

        let contactPoint;
        if (contactPoints.length > 0) {
            contactPoint = {
                x: contactPoints.reduce((sum, p) => sum + p.x, 0) / contactPoints.length,
                y: contactPoints.reduce((sum, p) => sum + p.y, 0) / contactPoints.length
            };
        } else {
            let deepestOverlap = -Infinity;
            let bestPoint = { x: (centerA.x + centerB.x) / 2, y: (centerA.y + centerB.y) / 2 };

            for (const vertex of verticesA) {
                const projected = this._dot(vertex, mtvAxis);
                const projectionB = this._project(verticesB, mtvAxis);
                const overlap = projectionB.max - projected;
                if (overlap > deepestOverlap) {
                    deepestOverlap = overlap;
                    bestPoint = { x: vertex.x, y: vertex.y };
                }
            }
            const invAxis = { x: -mtvAxis.x, y: -mtvAxis.y };
            for (const vertex of verticesB) {
                const projected = this._dot(vertex, invAxis);
                const projectionA = this._project(verticesA, invAxis);
                const overlap = projectionA.max - projected;
                if (overlap > deepestOverlap) {
                    deepestOverlap = overlap;
                    bestPoint = { x: vertex.x, y: vertex.y };
                }
            }
            contactPoint = bestPoint;
        }

        return {
            x: mtvAxis.x * minOverlap,
            y: mtvAxis.y * minOverlap,
            magnitude: minOverlap,
            contactPoint: contactPoint
        };
    }

    isBoxVsBox(materiaA, materiaB) {
        const transformA = materiaA.getComponent(Components.Transform);
        const colliderA = materiaA.getComponent(Components.BoxCollider2D);
        const transformB = materiaB.getComponent(Components.Transform);
        const colliderB = materiaB.getComponent(Components.BoxCollider2D);

        const verticesA = this._getVertices(transformA, colliderA);
        const verticesB = this._getVertices(transformB, colliderB);

        const axes = [
            ...this._getAxes(verticesA),
            ...this._getAxes(verticesB)
        ];

        let minOverlap = Infinity;
        let mtvAxis = null;

        for (const axis of axes) {
            const projectionA = this._project(verticesA, axis);
            const projectionB = this._project(verticesB, axis);

            const overlap = Math.min(projectionA.max, projectionB.max) - Math.max(projectionA.min, projectionB.min);

            if (overlap < 0) {
                return null; // Separating axis found, no collision
            }

            if (overlap < minOverlap) {
                minOverlap = overlap;
                mtvAxis = axis;
            }
        }

        // Ensure MTV axis points from B to A
        const centerA = {
            x: verticesA.reduce((sum, v) => sum + v.x, 0) / verticesA.length,
            y: verticesA.reduce((sum, v) => sum + v.y, 0) / verticesA.length
        };
        const centerB = {
            x: verticesB.reduce((sum, v) => sum + v.x, 0) / verticesB.length,
            y: verticesB.reduce((sum, v) => sum + v.y, 0) / verticesB.length
        };
        let direction = { x: centerA.x - centerB.x, y: centerA.y - centerB.y };

        if (this._dot(direction, mtvAxis) < 0) {
            mtvAxis = { x: -mtvAxis.x, y: -mtvAxis.y };
        }

        // --- MANIFOLD CONTACT POINT LOGIC ---
        const contactPoints = [];
        for (const v of verticesA) {
            if (this._isPointInBox(v, verticesB)) contactPoints.push(v);
        }
        for (const v of verticesB) {
            if (this._isPointInBox(v, verticesA)) contactPoints.push(v);
        }

        let contactPoint;
        if (contactPoints.length > 0) {
            contactPoint = {
                x: contactPoints.reduce((sum, p) => sum + p.x, 0) / contactPoints.length,
                y: contactPoints.reduce((sum, p) => sum + p.y, 0) / contactPoints.length
            };
        } else {
            let deepestOverlap = -Infinity;
            let bestPoint = { x: (centerA.x + centerB.x) / 2, y: (centerA.y + centerB.y) / 2 };

            for (const vertex of verticesA) {
                const projected = this._dot(vertex, mtvAxis);
                const projectionB = this._project(verticesB, mtvAxis);
                const overlap = projectionB.max - projected;
                if (overlap > deepestOverlap) {
                    deepestOverlap = overlap;
                    bestPoint = { x: vertex.x, y: vertex.y };
                }
            }
            const invAxis = { x: -mtvAxis.x, y: -mtvAxis.y };
            for (const vertex of verticesB) {
                const projected = this._dot(vertex, invAxis);
                const projectionA = this._project(verticesA, invAxis);
                const overlap = projectionA.max - projected;
                if (overlap > deepestOverlap) {
                    deepestOverlap = overlap;
                    bestPoint = { x: vertex.x, y: vertex.y };
                }
            }
            contactPoint = bestPoint;
        }

        return {
            x: mtvAxis.x * minOverlap,
            y: mtvAxis.y * minOverlap,
            magnitude: minOverlap,
            contactPoint: contactPoint
        };
    }

    _isPointInBox(point, vertices) {
        for (let i = 0; i < 4; i++) {
            const p1 = vertices[i];
            const p2 = vertices[(i + 1) % 4];
            const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            const toPoint = { x: point.x - p1.x, y: point.y - p1.y };
            if (this._cross(edge, toPoint) < -1e-6) return false;
        }
        return true;
    }

    isBoxVsPolygon(boxMateria, polyMateria) {
        return this.isPolygonVsPolygon(boxMateria, polyMateria);
    }

    _getPolygonArea(vertices) {
        let area = 0;
        for (let i = 0; i < vertices.length; i++) {
            const j = (i + 1) % vertices.length;
            area += vertices[i].x * vertices[j].y;
            area -= vertices[j].x * vertices[i].y;
        }
        return area / 2;
    }

    /**
     * Comprueba si un punto está dentro de un polígono convexo.
     * Robusto ante cualquier sentido de giro (CW o CCW).
     */
    _isPointInPolygon(point, vertices) {
        if (vertices.length < 3) return false;

        const area = this._getPolygonArea(vertices);
        const isCW = area > 0;

        for (let i = 0; i < vertices.length; i++) {
            const p1 = vertices[i];
            const p2 = vertices[(i + 1) % vertices.length];
            const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            const toPoint = { x: point.x - p1.x, y: point.y - p1.y };
            const cross = this._cross(edge, toPoint);

            // En coordenadas de pantalla (Y abajo):
            // Si es CW (area > 0), el interior está a la derecha (cross > 0)
            // Si es CCW (area < 0), el interior está a la izquierda (cross < 0)
            // Nota: El signo del cross product depende de la implementación de _cross.
            // Nuestra _cross(v1, v2) es v1.x * v2.y - v1.y * v2.x

            if (isCW && cross < -1e-6) return false;
            if (!isCW && cross > 1e-6) return false;
        }
        return true;
    }

    _getPolygonVertices(transform, collider) {
        const angle = transform.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const scaledOffsetX = collider.offset.x * transform.scale.x;
        const scaledOffsetY = collider.offset.y * transform.scale.y;

        const rotatedOffsetX = scaledOffsetX * cos - scaledOffsetY * sin;
        const rotatedOffsetY = scaledOffsetX * sin + scaledOffsetY * cos;

        const center = {
            x: transform.position.x + rotatedOffsetX,
            y: transform.position.y + rotatedOffsetY
        };

        return collider.vertices.map(v => {
            const sx = v.x * transform.scale.x;
            const sy = v.y * transform.scale.y;
            return {
                x: center.x + (sx * cos - sy * sin),
                y: center.y + (sx * sin + sy * cos)
            };
        });
    }

    _getVertices(transform, collider) {
        const w = collider.size.x * transform.scale.x / 2;
        const h = collider.size.y * transform.scale.y / 2;
        const angle = transform.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Apply scale and rotation to the offset to get the true center in world space
        const scaledOffsetX = collider.offset.x * transform.scale.x;
        const scaledOffsetY = collider.offset.y * transform.scale.y;

        const rotatedOffsetX = scaledOffsetX * cos - scaledOffsetY * sin;
        const rotatedOffsetY = scaledOffsetX * sin + scaledOffsetY * cos;

        const center = {
            x: transform.position.x + rotatedOffsetX,
            y: transform.position.y + rotatedOffsetY
        };

        // Local, unrotated corner positions relative to center
        const corners = [
            { x: -w, y: -h },
            { x:  w, y: -h },
            { x:  w, y:  h },
            { x: -w, y:  h }
        ];

        // Rotate corners and translate to world position
        return corners.map(corner => ({
            x: center.x + (corner.x * cos - corner.y * sin),
            y: center.y + (corner.x * sin + corner.y * cos)
        }));
    }

    _getAxes(vertices) {
        const axes = [];
        for (let i = 0; i < vertices.length; i++) {
            const p1 = vertices[i];
            const p2 = vertices[i + 1] || vertices[0];

            const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            const normal = { x: -edge.y, y: edge.x };
            const normalized = this._normalize(normal);
            axes.push(normalized);
        }
        return axes;
    }

    _project(vertices, axis) {
        let min = this._dot(vertices[0], axis);
        let max = min;
        for (let i = 1; i < vertices.length; i++) {
            const p = this._dot(vertices[i], axis);
            if (p < min) {
                min = p;
            } else if (p > max) {
                max = p;
            }
        }
        return { min, max };
    }

    _dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }

    _normalize(v) {
        const mag = Math.sqrt(v.x * v.x + v.y * v.y);
        if (mag === 0) return { x: 0, y: 0 };
        return { x: v.x / mag, y: v.y / mag };
    }

    /**
     * Gets all collision infos for a specific materia and state, optionally filtered by tag.
     * @param {Materia} materia
     * @param {'enter'|'stay'|'exit'} state
     * @param {'collision'|'trigger'} type
     * @param {string} [tag] - Optional tag to filter the other materia by.
     * @returns {Collision[]} An array of collision objects.
     */
    getCollisionInfo(materia, state, type, tag) {
        const collisions = [];
        const targetId = (materia && typeof materia === 'object') ? materia.id : (typeof materia === 'number' ? materia : null);

        for (const [key, value] of this.collisionStates.entries()) {
            // Si type es null, permitimos tanto 'collision' como 'trigger'
            const typeMatch = !type || value.type === type;

            if (value.state === state && typeMatch && value.frame === this.currentFrame) {
                const [id1, id2] = key.split('-').map(Number);

                // Si hay un targetId, filtramos por él. Si no, aceptamos cualquier colisión en la escena.
                if (targetId === null || id1 === targetId || id2 === targetId) {
                    const materiaA = this.scene.findMateriaById(id1);
                    const materiaB = this.scene.findMateriaById(id2);

                    if (materiaA && materiaB) {
                        const trimmedTag = tag ? tag.trim() : null;

                        if (targetId !== null) {
                            const otherMateria = id1 === targetId ? materiaB : materiaA;
                            const thisMateria = id1 === targetId ? materiaA : materiaB;

                            if (!trimmedTag || otherMateria.tieneTag(trimmedTag)) {
                                collisions.push(new Collision(thisMateria, otherMateria, this.getCollider(otherMateria)));
                            }
                        } else {
                            // Búsqueda global por tag
                            if (!trimmedTag || materiaA.tieneTag(trimmedTag) || materiaB.tieneTag(trimmedTag)) {
                                collisions.push(new Collision(materiaA, materiaB, this.getCollider(materiaB)));
                            }
                        }
                    }
                }
            }
        }
        return collisions;
    }

    /**
     * Lanza un rayo en la escena y devuelve información sobre el primer objeto que impacta.
     * @param {{x: number, y: number}} origin - Punto de origen.
     * @param {{x: number, y: number}} direction - Dirección (normalizada).
     * @param {number} maxDistance - Distancia máxima.
     * @param {string|string[]|number[]} [filter] - Opcional, filtrar por tag o excluir IDs.
     * @returns {object|null} Información del impacto o null.
     */
    raycast(origin, direction, maxDistance = Infinity, filter = null) {
        if (!direction || (direction.x === 0 && direction.y === 0)) return null;
        let closestHit = null;
        let minDistance = maxDistance;

        const collidables = this.scene.getAllMaterias().filter(m =>
            m.isActive && (m.getComponent(Components.BoxCollider2D) || m.getComponent(Components.CircleCollider2D) || m.getComponent(Components.CapsuleCollider2D) || m.getComponent(Components.PolygonCollider2D) || m.getComponent(Components.LineCollider2D) || m.getComponent(Components.TilemapCollider2D) || m.getComponent(Components.TerrenoCollider2D))
        );

        let excludedIds = [];
        let excludedAncestors = [];
        let targetTags = [];

        if (filter) {
            if (Array.isArray(filter)) {
                if (typeof filter[0] === 'number') excludedIds = filter;
                else if (typeof filter[0] === 'string') targetTags = filter;
            } else if (typeof filter === 'string') {
                targetTags = [filter];
            } else if (typeof filter === 'object') {
                if (filter.excludeIds) excludedIds = filter.excludeIds;
                if (filter.excludeAncestors) excludedAncestors = filter.excludeAncestors;
                if (filter.tags) targetTags = filter.tags;
            }
        }

        for (const materia of collidables) {
            if (excludedIds.includes(materia.id)) continue;
            if (excludedAncestors.some(ancestor => ancestor.id === materia.id || ancestor.isAncestorOf(materia))) continue;
            if (targetTags.length > 0 && !targetTags.some(t => materia.tieneTag(t))) continue;

            const transform = materia.getComponent(Components.Transform);
            const collider = this.getCollider(materia);

            let hit = null;
            if (collider instanceof Components.BoxCollider2D) {
                hit = this._rayVsBox(origin, direction, transform, collider);
            } else if (collider instanceof Components.CircleCollider2D) {
                hit = this._rayVsCircle(origin, direction, transform, collider);
            } else if (collider instanceof Components.CapsuleCollider2D) {
                hit = this._rayVsCapsule(origin, direction, transform, collider);
            } else if (collider instanceof Components.PolygonCollider2D) {
                hit = this._rayVsPolygon(origin, direction, transform, collider);
            } else if (collider instanceof Components.LineCollider2D) {
                hit = this._rayVsLine(origin, direction, transform, collider);
            } else if (collider instanceof Components.TilemapCollider2D || collider instanceof Components.TerrenoCollider2D) {
                if (collider.isDirty) collider.generate();

                // Para Tilemaps, creamos un transform temporal con escala 1,1 para evitar doble escalado,
                // ya que los colliders generados ya incluyen la escala de la rejilla.
                if (!this._tempIdentityTransform) {
                    this._tempIdentityTransform = { x: 0, y: 0, rotation: 0, scale: { x: 1, y: 1 } };
                }
                const identity = this._tempIdentityTransform;
                identity.x = transform.x;
                identity.y = transform.y;
                identity.rotation = transform.rotation;

                // Ray vs Multiple Rectangles
                for (const rect of (collider.generatedColliders || [])) {
                    const tempBox = {
                        size: { x: rect.width, y: rect.height },
                        offset: { x: rect.x, y: rect.y }
                    };
                    // Usamos identity (escala 1) porque los rectángulos ya están escalados a píxeles
                    const subHit = this._rayVsBox(origin, direction, identity, tempBox);
                    if (subHit && (!hit || subHit.distance < hit.distance)) {
                        hit = subHit;
                    }
                }

                // Ray vs Multiple Polygons (Terrain mode)
                if (collider.generatedPolygons) {
                    for (const poly of collider.generatedPolygons) {
                        const tempPoly = { vertices: poly.vertices, offset: { x: 0, y: 0 } };
                        const subHit = this._rayVsPolygon(origin, direction, transform, tempPoly);
                        if (subHit && (!hit || subHit.distance < hit.distance)) {
                            hit = subHit;
                        }
                    }
                }
            }

            if (hit && hit.distance < minDistance) {
                minDistance = hit.distance;
                closestHit = {
                    materia: materia,
                    point: hit.point,
                    normal: hit.normal,
                    distance: hit.distance
                };
            }
        }

        return closestHit;
    }

    _rayVsBox(origin, direction, transform, collider) {
        const w = collider.size.x * transform.scale.x;
        const h = collider.size.y * transform.scale.y;
        const angle = transform.rotation * Math.PI / 180;

        // Transformar rayo a espacio local de la caja
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);

        const scaledOffsetX = collider.offset.x * transform.scale.x;
        const scaledOffsetY = collider.offset.y * transform.scale.y;
        const worldOffsetX = scaledOffsetX * Math.cos(angle) - scaledOffsetY * Math.sin(angle);
        const worldOffsetY = scaledOffsetX * Math.sin(angle) + scaledOffsetY * Math.cos(angle);

        const centerX = transform.x + worldOffsetX;
        const centerY = transform.y + worldOffsetY;

        const localOriginX = (origin.x - centerX) * cos - (origin.y - centerY) * sin;
        const localOriginY = (origin.x - centerX) * sin + (origin.y - centerY) * cos;
        const localDirX = direction.x * cos - direction.y * sin;
        const localDirY = direction.x * sin + direction.y * cos;

        // Ray vs AABB en espacio local
        const halfW = w / 2;
        const halfH = h / 2;

        let tmin = -Infinity, tmax = Infinity;

        if (localDirX !== 0) {
            let t1 = (-halfW - localOriginX) / localDirX;
            let t2 = (halfW - localOriginX) / localDirX;
            tmin = Math.max(tmin, Math.min(t1, t2));
            tmax = Math.min(tmax, Math.max(t1, t2));
        } else if (localOriginX < -halfW || localOriginX > halfW) return null;

        if (localDirY !== 0) {
            let t1 = (-halfH - localOriginY) / localDirY;
            let t2 = (halfH - localOriginY) / localDirY;
            tmin = Math.max(tmin, Math.min(t1, t2));
            tmax = Math.min(tmax, Math.max(t1, t2));
        } else if (localOriginY < -halfH || localOriginY > halfH) return null;

        if (tmax >= tmin && tmax >= 0) {
            // Regresamos el primer impacto positivo. Si tmin < 0, estamos dentro, regresamos 0.
            let t = tmin;
            let inside = false;
            if (t < 0) {
                t = 0;
                inside = true;
            }
            if (t > 1e10) return null;

            const hitPointLocal = { x: localOriginX + localDirX * t, y: localOriginY + localDirY * t };

            // Calcular normal local
            let normalLocal = { x: 0, y: 0 };
            if (inside) {
                // Si estamos dentro, la normal apunta opuesta a la dirección para empujar "hacia afuera"
                const mag = Math.hypot(localDirX, localDirY);
                normalLocal = mag > 0 ? { x: -localDirX / mag, y: -localDirY / mag } : { x: 0, y: 1 };
            } else {
                const eps = 1e-4;
                if (Math.abs(hitPointLocal.x - halfW) < eps) normalLocal.x = 1;
                else if (Math.abs(hitPointLocal.x + halfW) < eps) normalLocal.x = -1;
                else if (Math.abs(hitPointLocal.y - halfH) < eps) normalLocal.y = 1;
                else if (Math.abs(hitPointLocal.y + halfH) < eps) normalLocal.y = -1;
            }

            // Transformar normal y punto de vuelta al espacio mundial
            const worldCos = Math.cos(angle);
            const worldSin = Math.sin(angle);

            return {
                distance: t,
                point: {
                    x: centerX + (hitPointLocal.x * worldCos - hitPointLocal.y * worldSin),
                    y: centerY + (hitPointLocal.x * worldSin + hitPointLocal.y * worldCos)
                },
                normal: {
                    x: normalLocal.x * worldCos - normalLocal.y * worldSin,
                    y: normalLocal.x * worldSin + normalLocal.y * worldCos
                }
            };
        }

        return null;
    }

    _rayVsCircle(origin, direction, transform, collider) {
        const radius = collider.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y));
        const angle = transform.rotation * Math.PI / 180;
        const scaledOffsetX = collider.offset.x * transform.scale.x;
        const scaledOffsetY = collider.offset.y * transform.scale.y;
        const worldOffsetX = scaledOffsetX * Math.cos(angle) - scaledOffsetY * Math.sin(angle);
        const worldOffsetY = scaledOffsetX * Math.sin(angle) + scaledOffsetY * Math.cos(angle);
        const centerX = transform.x + worldOffsetX;
        const centerY = transform.y + worldOffsetY;

        const oc = { x: origin.x - centerX, y: origin.y - centerY };
        const b = this._dot(oc, direction);
        const c = this._dot(oc, oc) - radius * radius;
        const h = b * b - c;

        if (h < 0) return null;
        const t = -b - Math.sqrt(h);

        if (t < 0) {
            const t2 = -b + Math.sqrt(h);
            if (t2 < 0) return null;
            // Inside circle
            return {
                distance: 0,
                point: origin,
                normal: { x: -direction.x, y: -direction.y }
            };
        }

        const hitPoint = { x: origin.x + direction.x * t, y: origin.y + direction.y * t };
        const normal = this._normalize({ x: hitPoint.x - centerX, y: hitPoint.y - centerY });

        return {
            distance: t,
            point: hitPoint,
            normal: normal
        };
    }

    _rayVsCapsule(origin, direction, transform, collider) {
        const cap = this._getCapsulePoints({ getComponent: (t) => t === Components.Transform ? transform : collider });

        let closestHit = null;

        // Caps vs Ray
        const h1 = this._rayVsCircle(origin, direction, { x: cap.p1.x, y: cap.p1.y, rotation: 0, scale: { x: 1, y: 1 }, getComponent: (t) => ({ radius: cap.radius, offset: { x: 0, y: 0 } }) }, { radius: cap.radius, offset: { x: 0, y: 0 } });
        const h2 = this._rayVsCircle(origin, direction, { x: cap.p2.x, y: cap.p2.y, rotation: 0, scale: { x: 1, y: 1 }, getComponent: (t) => ({ radius: cap.radius, offset: { x: 0, y: 0 } }) }, { radius: cap.radius, offset: { x: 0, y: 0 } });

        if (h1) closestHit = h1;
        if (h2 && (!closestHit || h2.distance < closestHit.distance)) closestHit = h2;

        // Cylinder vs Ray
        const ab = { x: cap.p2.x - cap.p1.x, y: cap.p2.y - cap.p1.y };
        const normalAB = this._normalize({ x: -ab.y, y: ab.x });

        // Ray vs Segments (cylinder sides)
        const s1p1 = { x: cap.p1.x + normalAB.x * cap.radius, y: cap.p1.y + normalAB.y * cap.radius };
        const s1p2 = { x: cap.p2.x + normalAB.x * cap.radius, y: cap.p2.y + normalAB.y * cap.radius };
        const s2p1 = { x: cap.p1.x - normalAB.x * cap.radius, y: cap.p1.y - normalAB.y * cap.radius };
        const s2p2 = { x: cap.p2.x - normalAB.x * cap.radius, y: cap.p2.y - normalAB.y * cap.radius };

        const h3 = this._rayVsSegment(origin, direction, s1p1, s1p2);
        const h4 = this._rayVsSegment(origin, direction, s2p1, s2p2);

        if (h3 && (!closestHit || h3.t < closestHit.distance)) {
            closestHit = { distance: h3.t, point: { x: origin.x + direction.x * h3.t, y: origin.y + direction.y * h3.t }, normal: h3.normal };
        }
        if (h4 && (!closestHit || h4.t < closestHit.distance)) {
            closestHit = { distance: h4.t, point: { x: origin.x + direction.x * h4.t, y: origin.y + direction.y * h4.t }, normal: h4.normal };
        }

        return closestHit;
    }

    _rayVsPolygon(origin, direction, transform, collider) {
        const vertices = this._getPolygonVertices(transform, collider);
        let closestT = Infinity;
        let closestNormal = { x: 0, y: 0 };

        for (let i = 0; i < vertices.length; i++) {
            const p1 = vertices[i];
            const p2 = vertices[(i + 1) % vertices.length];

            const hit = this._rayVsSegment(origin, direction, p1, p2);
            if (hit && hit.t < closestT) {
                closestT = hit.t;
                closestNormal = hit.normal;
            }
        }

        if (closestT === Infinity) return null;

        return {
            distance: closestT,
            point: { x: origin.x + direction.x * closestT, y: origin.y + direction.y * closestT },
            normal: closestNormal
        };
    }

    _rayVsLine(origin, direction, transform, collider) {
        const vertices = this._getLineVertices(transform, collider);
        let closestT = Infinity;
        let closestNormal = { x: 0, y: 0 };

        for (let i = 0; i < vertices.length - 1; i++) {
            const p1 = vertices[i];
            const p2 = vertices[i + 1];

            const hit = this._rayVsSegment(origin, direction, p1, p2);
            if (hit && hit.t < closestT) {
                closestT = hit.t;
                closestNormal = hit.normal;
            }
        }

        if (closestT === Infinity) return null;

        return {
            distance: closestT,
            point: { x: origin.x + direction.x * closestT, y: origin.y + direction.y * closestT },
            normal: closestNormal
        };
    }

    /**
     * Lanza un rayo en el espacio 3D y devuelve información precisa sobre el primer colisionador que impacta.
     * @param {{x: number, y: number, z: number}} origin
     * @param {{x: number, y: number, z: number}} direction
     * @param {number} maxDistance
     */
    raycast3D(origin, direction, maxDistance = Infinity) {
        const glm = window.glMatrix;
        const C3D = window.Components3D;
        if (!glm || !C3D) return null;

        let closestHit = null;
        let minDistance = maxDistance;

        const collidables = this.scene.getAllMaterias().filter(m =>
            m.isActive && (m.getComponent(C3D.BoxCollider3D) || m.getComponent(C3D.SphereCollider3D) || m.getComponent(C3D.CapsuleCollider3D) || m.getComponent(C3D.PlaneCollider3D) || m.getComponent(C3D.Terreno3D))
        );

        for (const materia of collidables) {
            const transform = materia.getComponent(Components.Transform);
            const box = materia.getComponent(C3D.BoxCollider3D);
            const sphere = materia.getComponent(C3D.SphereCollider3D);
            const capsule = materia.getComponent(C3D.CapsuleCollider3D);
            const plane = materia.getComponent(C3D.PlaneCollider3D);
            const terrain = materia.getComponent(C3D.Terreno3D);

            let hit = null;

            if (box) hit = this._rayVsBox3D(origin, direction, materia, box);
            else if (sphere) hit = this._rayVsSphere3D(origin, direction, materia, sphere);
            else if (capsule) hit = this._rayVsCapsule3D(origin, direction, materia, capsule);
            else if (plane) hit = this._rayVsPlane3D(origin, direction, materia, plane);
            else if (terrain) hit = this._rayVsTerrain3D(origin, direction, materia, terrain);

            if (hit && hit.distance < minDistance) {
                minDistance = hit.distance;
                closestHit = {
                    materia,
                    point: hit.point,
                    normal: hit.normal,
                    distance: hit.distance,
                    localPoint: hit.localPoint
                };
            }
        }
        return closestHit;
    }

    _rayVsSphere3D(origin, direction, materia, collider) {
        const glm = window.glMatrix;
        const transform = materia.getComponent(Components.Transform);
        const radius = collider.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y), Math.abs(transform.scale.z || 1));
        const center = [transform.x + collider.offset.x, transform.y + collider.offset.y, (transform.z || 0) + collider.offset.z];

        const L = glm.vec3.subtract(glm.vec3.create(), center, [origin.x, origin.y, origin.z]);
        const tca = glm.vec3.dot(L, [direction.x, direction.y, direction.z]);
        if (tca < 0) return null;

        const d2 = glm.vec3.dot(L, L) - tca * tca;
        if (d2 > radius * radius) return null;

        const thc = Math.sqrt(radius * radius - d2);
        const t0 = tca - thc;
        const t1 = tca + thc;

        const t = t0 < 0 ? t1 : t0;
        if (t < 0) return null;

        const hitPoint = { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: (origin.z || 0) + direction.z * t };
        const normalVec = glm.vec3.normalize(glm.vec3.create(), [hitPoint.x - center[0], hitPoint.y - center[1], hitPoint.z - center[2]]);

        const invMat = glm.mat4.invert(glm.mat4.create(), transform.worldMatrix);
        const lp = glm.vec3.transformMat4(glm.vec3.create(), [hitPoint.x, hitPoint.y, hitPoint.z], invMat);

        return {
            distance: t,
            point: hitPoint,
            normal: { x: normalVec[0], y: normalVec[1], z: normalVec[2] },
            localPoint: lp
        };
    }

    _rayVsBox3D(origin, direction, materia, collider) {
        const glm = window.glMatrix;
        const transform = materia.getComponent(Components.Transform);
        const obb = this._getOBBData(materia);

        // Transform ray to OBB local space
        const invWorld = glm.mat4.invert(glm.mat4.create(), transform.worldMatrix);
        const localOrigin = glm.vec3.transformMat4(glm.vec3.create(), [origin.x, origin.y, origin.z], invWorld);

        // Offset is in local space relative to transform center, so subtract it
        glm.vec3.subtract(localOrigin, localOrigin, [collider.offset.x, collider.offset.y, collider.offset.z]);

        const localDir = glm.vec3.transformMat3(glm.vec3.create(), [direction.x, direction.y, direction.z], glm.mat3.fromMat4(glm.mat3.create(), invWorld));
        glm.vec3.normalize(localDir, localDir);

        const half = [collider.size.x / 2, collider.size.y / 2, collider.size.z / 2];
        let tmin = -Infinity, tmax = Infinity;
        let normalIdx = -1;

        for (let i = 0; i < 3; i++) {
            if (Math.abs(localDir[i]) > 1e-6) {
                let t1 = (-half[i] - localOrigin[i]) / localDir[i];
                let t2 = (half[i] - localOrigin[i]) / localDir[i];

                if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
                if (t1 > tmin) { tmin = t1; normalIdx = i; }
                tmax = Math.min(tmax, t2);
            } else if (localOrigin[i] < -half[i] || localOrigin[i] > half[i]) return null;
        }

        if (tmax >= tmin && tmax >= 0) {
            const t = tmin > 0 ? tmin : 0;
            const hitPoint = { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: (origin.z || 0) + direction.z * t };

            // Calculate normal in world space
            const localNormal = [0, 0, 0];
            localNormal[normalIdx] = localOrigin[normalIdx] < 0 ? -1 : 1;
            const worldNormal = glm.vec3.transformMat3(glm.vec3.create(), localNormal, glm.mat3.fromMat4(glm.mat3.create(), transform.worldMatrix));
            glm.vec3.normalize(worldNormal, worldNormal);

            const lp = [localOrigin[0] + localDir[0] * t, localOrigin[1] + localDir[1] * t, localOrigin[2] + localDir[2] * t];

            return {
                distance: t,
                point: hitPoint,
                normal: { x: worldNormal[0], y: worldNormal[1], z: worldNormal[2] },
                localPoint: lp
            };
        }
        return null;
    }

    _rayVsTerrain3D(origin, direction, materia, terrain, maxDistance = 10000) {
        const glm = window.glMatrix;
        const transform = materia.getComponent(Components.Transform);
        const invMat = glm.mat4.invert(glm.mat4.create(), transform.worldMatrix);

        const localOrigin = glm.vec3.transformMat4(glm.vec3.create(), [origin.x, origin.y, origin.z], invMat);
        const localDir = glm.vec3.transformMat3(glm.vec3.create(), [direction.x, direction.y, direction.z], glm.mat3.fromMat4(glm.mat3.create(), invMat));
        glm.vec3.normalize(localDir, localDir);

        // Grid-based raycasting
        const step = (terrain.size.x / terrain.resolution) * 0.5;
        for (let d = 0; d < maxDistance; d += step) {
            const p = [localOrigin[0] + localDir[0] * d, localOrigin[1] + localDir[1] * d, localOrigin[2] + localDir[2] * d];

            const gridX = ((p[0] + terrain.size.x / 2) / terrain.size.x) * terrain.resolution;
            const gridZ = ((p[2] + terrain.size.z / 2) / terrain.size.z) * terrain.resolution;

            if (gridX >= 0 && gridX < terrain.resolution && gridZ >= 0 && gridZ < terrain.resolution) {
                const ix = Math.floor(gridX);
                const iz = Math.floor(gridZ);
                const h = terrain.getHeight(ix, iz);

                // +Y is Up. localPos[1] < h means below surface.
                if (p[1] <= h) {
                    const worldHit = glm.vec3.transformMat4(glm.vec3.create(), p, transform.worldMatrix);

                    // Precise normal calculation at hit point
                    const hl = terrain.getHeight(ix - 1, iz);
                    const hr = terrain.getHeight(ix + 1, iz);
                    const hd = terrain.getHeight(ix, iz - 1);
                    const hu = terrain.getHeight(ix, iz + 1);

                    const localNormal = glm.vec3.normalize(glm.vec3.create(), [hl - hr, 2.0, hd - hu]);
                    const worldNormal = glm.vec3.transformMat3(glm.vec3.create(), localNormal, glm.mat3.fromMat4(glm.mat3.create(), transform.worldMatrix));
                    glm.vec3.normalize(worldNormal, worldNormal);

                    return {
                        point: { x: worldHit[0], y: worldHit[1], z: worldHit[2] },
                        normal: { x: worldNormal[0], y: worldNormal[1], z: worldNormal[2] },
                        distance: d,
                        localPoint: p
                    };
                }
            }
        }
        return null;
    }

    _rayVsPlane3D(origin, direction, materia, collider) {
        const glm = window.glMatrix;
        const transform = materia.getComponent(Components.Transform);

        const normal = glm.vec3.fromValues(transform.worldMatrix[4], transform.worldMatrix[5], transform.worldMatrix[6]);
        glm.vec3.normalize(normal, normal);
        const center = [transform.x + collider.offset.x, transform.y + collider.offset.y, (transform.z || 0) + collider.offset.z];

        const denom = glm.vec3.dot(normal, [direction.x, direction.y, direction.z]);
        if (Math.abs(denom) > 1e-6) {
            const t = glm.vec3.dot(glm.vec3.subtract(glm.vec3.create(), center, [origin.x, origin.y, origin.z]), normal) / denom;
            if (t >= 0) {
                const hitPoint = { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: (origin.z || 0) + direction.z * t };
                const invMat = glm.mat4.invert(glm.mat4.create(), transform.worldMatrix);
                const lp = glm.vec3.transformMat4(glm.vec3.create(), [hitPoint.x, hitPoint.y, hitPoint.z], invMat);

                return {
                    distance: t,
                    point: hitPoint,
                    normal: { x: normal[0], y: normal[1], z: normal[2] },
                    localPoint: lp
                };
            }
        }
        return null;
    }

    _rayVsCapsule3D(origin, direction, materia, collider) {
        const cap = this._getCapsuleData3D(materia);
        const glm = window.glMatrix;
        const ro = glm.vec3.fromValues(origin.x, origin.y, origin.z);
        const rd = glm.vec3.fromValues(direction.x, direction.y, direction.z);

        const ba = glm.vec3.subtract(glm.vec3.create(), cap.p2, cap.p1);
        const oa = glm.vec3.subtract(glm.vec3.create(), ro, cap.p1);

        const baba = glm.vec3.dot(ba, ba);
        const bard = glm.vec3.dot(ba, rd);
        const baoa = glm.vec3.dot(ba, oa);
        const r2 = cap.radius * cap.radius;

        const k2 = baba - bard * bard;
        const k1 = baba * glm.vec3.dot(oa, rd) - baoa * bard;
        const k0 = baba * glm.vec3.dot(oa, oa) - baoa * baoa - r2 * baba;

        const h = k1 * k1 - k2 * k0;
        if (h < 0.0) return null;

        let t = (-k1 - Math.sqrt(h)) / k2;
        const y = baoa + t * bard;

        // Body intersection
        if (y > 0.0 && y < baba) {
            const hitPoint = { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: (origin.z || 0) + direction.z * t };
            const n = glm.vec3.subtract(glm.vec3.create(), [hitPoint.x, hitPoint.y, hitPoint.z], cap.p1);
            glm.vec3.scaleAndAdd(n, n, ba, -y / baba);
            glm.vec3.normalize(n, n);

            const transform = materia.getComponent(Components.Transform);
            const invMat = glm.mat4.invert(glm.mat4.create(), transform.worldMatrix);
            const lp = glm.vec3.transformMat4(glm.vec3.create(), [hitPoint.x, hitPoint.y, hitPoint.z], invMat);

            return {
                distance: t,
                point: hitPoint,
                normal: { x: n[0], y: n[1], z: n[2] },
                localPoint: lp
            };
        }

        // Caps intersection
        const hit1 = this._rayVsSphere3D(origin, direction, {
            getComponent: (t) => t === Components.Transform ? { x: cap.p1[0], y: cap.p1[1], z: cap.p1[2], scale: {x:1,y:1,z:1} } : { radius: cap.radius, offset: {x:0,y:0,z:0} }
        }, { radius: cap.radius, offset: {x:0,y:0,z:0} });

        const hit2 = this._rayVsSphere3D(origin, direction, {
            getComponent: (t) => t === Components.Transform ? { x: cap.p2[0], y: cap.p2[1], z: cap.p2[2], scale: {x:1,y:1,z:1} } : { radius: cap.radius, offset: {x:0,y:0,z:0} }
        }, { radius: cap.radius, offset: {x:0,y:0,z:0} });

        let closest = null;
        if (hit1) closest = hit1;
        if (hit2 && (!closest || hit2.distance < closest.distance)) closest = hit2;

        return closest;
    }

    _rayVsSegment(origin, direction, p1, p2) {
        const v1 = { x: origin.x - p1.x, y: origin.y - p1.y };
        const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
        const v3 = { x: -direction.y, y: direction.x };

        const dot = this._dot(v2, v3);
        if (Math.abs(dot) < 1e-6) return null;

        const t1 = this._cross(v2, v1) / dot;
        const t2 = this._dot(v1, v3) / dot;

        if (t1 >= 0 && t2 >= 0 && t2 <= 1) {
            const normal = this._normalize({ x: -v2.y, y: v2.x });
            // Asegurarse de que la normal apunta hacia afuera del rayo
            if (this._dot(direction, normal) > 0) {
                normal.x = -normal.x;
                normal.y = -normal.y;
            }
            return { t: t1, normal: normal };
        }
        return null;
    }
}
