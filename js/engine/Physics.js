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

            if (rigidbody && transform && rigidbody.bodyType === 'dynamic' && rigidbody.simulated) {
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

                if (rbA && rbB && rbA.bodyType === 'static' && rbB.bodyType === 'static' && !colliderA.isTrigger && !colliderB.isTrigger) {
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

        const isADynamic = rbA && rbA.bodyType === 'dynamic';
        const isBDynamic = rbB && rbB.bodyType === 'dynamic';

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
    }

    getCollider(materia) {
        return materia.getComponent(Components.BoxCollider2D);
    }

    isBoxVsBox(materiaA, materiaB) {
        const transformA = materiaA.getComponent(Components.Transform);
        const colliderA = materiaA.getComponent(Components.BoxCollider2D);
        const transformB = materiaB.getComponent(Components.Transform);
        const colliderB = materiaB.getComponent(Components.BoxCollider2D);

        const widthA = colliderA.size.x * transformA.scale.x;
        const heightA = colliderA.size.y * transformA.scale.y;
        const leftA = transformA.x + colliderA.offset.x - widthA / 2;
        const rightA = transformA.x + colliderA.offset.x + widthA / 2;
        const topA = transformA.y + colliderA.offset.y - heightA / 2;
        const bottomA = transformA.y + colliderA.offset.y + heightA / 2;

        const widthB = colliderB.size.x * transformB.scale.x;
        const heightB = colliderB.size.y * transformB.scale.y;
        const leftB = transformB.x + colliderB.offset.x - widthB / 2;
        const rightB = transformB.x + colliderB.offset.x + widthB / 2;
        const topB = transformB.y + colliderB.offset.y - heightB / 2;
        const bottomB = transformB.y + colliderB.offset.y + heightB / 2;

        // Check for no overlap
        if (rightA <= leftB || leftA >= rightB || bottomA <= topB || topA >= bottomB) {
            return null; // No collision
        }

        // Calculate overlap on each axis
        const overlapX = Math.min(rightA, rightB) - Math.max(leftA, leftB);
        const overlapY = Math.min(bottomA, bottomB) - Math.max(topA, topB);

        // Determine the Minimum Translation Vector (MTV)
        if (overlapX < overlapY) {
            const mtvX = (transformA.x < transformB.x) ? -overlapX : overlapX;
            return { x: mtvX, y: 0, magnitude: overlapX };
        } else {
            const mtvY = (transformA.y < transformB.y) ? -overlapY : overlapY;
            return { x: 0, y: mtvY, magnitude: overlapY };
        }
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
