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
    }
}

export class PhysicsSystem {
    /**
     * @param {Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.gravity = { x: 0, y: 98.1 };

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

    update(deltaTime) {
        this.currentFrame++;

        // 1. Apply physics forces (gravity, velocity)
        for (const materia of this.scene.materias) {
            const rigidbody = materia.getComponent(Components.Rigidbody2D);
            const transform = materia.getComponent(Components.Transform);

            if (rigidbody && transform && rigidbody.bodyType === 'Dynamic' && rigidbody.simulated) {
                rigidbody.velocity.y += this.gravity.y * rigidbody.gravityScale * deltaTime;
                transform.x += rigidbody.velocity.x * deltaTime;
                transform.y += rigidbody.velocity.y * deltaTime;
            }
        }

        // 2. Broad-phase collision detection and state update
        const newActiveCollisions = new Map();
        const collidables = this.scene.materias.filter(m =>
            m.isActive && m.getComponent(Components.BoxCollider2D)
        );

        for (let i = 0; i < collidables.length; i++) {
            for (let j = i + 1; j < collidables.length; j++) {
                const materiaA = collidables[i];
                const materiaB = collidables[j];

                // Basic check: two static bodies can't collide if neither is a trigger
                const rbA = materiaA.getComponent(Components.Rigidbody2D);
                const rbB = materiaB.getComponent(Components.Rigidbody2D);
                const colliderA = this.getCollider(materiaA);
                const colliderB = this.getCollider(materiaB);

                if (rbA && rbB && rbA.bodyType === 'Static' && rbB.bodyType === 'Static' && !colliderA.isTrigger && !colliderB.isTrigger) {
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
    }

    /**
     * Main collision check dispatcher.
     * @param {Materia} materiaA
     * @param {Materia} materiaB
     * @returns {object|null} The MTV if a collision occurs, otherwise null.
     */
    checkCollision(materiaA, materiaB) {
        const colliderA = this.getCollider(materiaA);
        const colliderB = this.getCollider(materiaB);

        if (!colliderA || !colliderB) return null;

        let collisionInfo = null;
        if (colliderA instanceof Components.BoxCollider2D && colliderB instanceof Components.BoxCollider2D) {
            collisionInfo = this.isBoxVsBox(materiaA, materiaB);
        }

        // Future collision checks (Box vs Capsule, etc.) would go here

        if (collisionInfo && !colliderA.isTrigger && !colliderB.isTrigger) {
            this.resolveCollision(materiaA, materiaB, collisionInfo);
        }

        return collisionInfo;
    }

    resolveCollision(materiaA, materiaB, mtv) {
        const rbA = materiaA.getComponent(Components.Rigidbody2D);
        const rbB = materiaB.getComponent(Components.Rigidbody2D);
        const transformA = materiaA.getComponent(Components.Transform);
        const transformB = materiaB.getComponent(Components.Transform);

        // --- 1. Position Correction ---
        const isADynamic = rbA && rbA.bodyType === 'Dynamic';
        const isBDynamic = rbB && rbB.bodyType === 'Dynamic';

        if (isADynamic && !isBDynamic) { // A is dynamic, B is static/kinematic
            transformA.x += mtv.x;
            transformA.y += mtv.y;
        } else if (!isADynamic && isBDynamic) { // B is dynamic, A is static/kinematic
            transformB.x -= mtv.x;
            transformB.y -= mtv.y;
        } else if (isADynamic && isBDynamic) { // Both are dynamic
            transformA.x += mtv.x / 2;
            transformA.y += mtv.y / 2;
            transformB.x -= mtv.x / 2;
            transformB.y -= mtv.y / 2;
        }

        // --- 2. Velocity Correction (Impulse Resolution) ---
        const normal = this._normalize({ x: mtv.x, y: mtv.y });

        // For simplicity, we'll just stop the velocity along the normal for now.
        // A full impulse-based resolution would be more accurate.
        if (isADynamic && rbA.velocity) {
            const velDotNormal = this._dot(rbA.velocity, normal);
            if (velDotNormal < 0) { // Only resolve if moving towards each other
                 rbA.velocity.x -= velDotNormal * normal.x;
                 rbA.velocity.y -= velDotNormal * normal.y;
            }
        }

        if (isBDynamic && rbB.velocity) {
             const velDotNormal = this._dot(rbB.velocity, normal);
             if (velDotNormal > 0) { // Only resolve if moving towards each other (opposite direction)
                rbB.velocity.x += velDotNormal * normal.x;
                rbB.velocity.y += velDotNormal * normal.y;
             }
        }
    }

    getCollider(materia) {
        return materia.getComponent(Components.BoxCollider2D);
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
        const centerA = { x: transformA.x, y: transformA.y };
        const centerB = { x: transformB.x, y: transformB.y };
        let direction = { x: centerA.x - centerB.x, y: centerA.y - centerB.y };

        if (this._dot(direction, mtvAxis) < 0) {
            mtvAxis = { x: -mtvAxis.x, y: -mtvAxis.y };
        }

        return {
            x: mtvAxis.x * minOverlap,
            y: mtvAxis.y * minOverlap,
            magnitude: minOverlap
        };
    }

    _getVertices(transform, collider) {
        const w = collider.size.x * transform.scale.x / 2;
        const h = collider.size.y * transform.scale.y / 2;
        const angle = transform.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const center = {
            x: transform.x + collider.offset.x,
            y: transform.y + collider.offset.y
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
     * Gets all collision infos for a specific materia and state.
     * @param {Materia} materia
     * @param {'enter'|'stay'|'exit'} state
     * @param {'collision'|'trigger'} type
     * @returns {Collision[]} An array of collision objects.
     */
    getCollisionInfo(materia, state, type) {
        const collisions = [];
        for (const [key, value] of this.collisionStates.entries()) {
            if (value.state === state && value.type === type && value.frame === this.currentFrame) {
                const [id1, id2] = key.split('-').map(Number);
                if (id1 === materia.id || id2 === materia.id) {
                    const otherId = id1 === materia.id ? id2 : id1;
                    const otherMateria = this.scene.findMateriaById(otherId);
                    if (otherMateria) {
                        const otherCollider = this.getCollider(otherMateria);
                        collisions.push(new Collision(materia, otherMateria, otherCollider));
                    }
                }
            }
        }
        return collisions;
    }
}
