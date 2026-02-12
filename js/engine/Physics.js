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
        this.gravity = { x: 0, y: 9.8 }; // Reduced gravity to a more game-like value
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

    update(deltaTime) {
        this.currentFrame++;

        // Sub-stepping to prevent tunneling and improve stability
        const SUB_STEPS = 2;
        const subDeltaTime = deltaTime / SUB_STEPS;

        for (let s = 0; s < SUB_STEPS; s++) {
            this._step(subDeltaTime);
        }
    }

    _step(deltaTime) {
        // 1. Apply physics forces (gravity, velocity)
        for (const materia of this.scene.getAllMaterias()) {
            const rigidbody = materia.getComponent(Components.Rigidbody2D);
            const transform = materia.getComponent(Components.Transform);

            if (rigidbody && transform && rigidbody.bodyType.toLowerCase() === 'dynamic' && rigidbody.simulated) {
                const PHYSICS_SCALE = 100; // Factor de escala para que las unidades sean más manejables

                // Clamping velocity to prevent physics breaking with large forces
                rigidbody.velocity.x = this._clamp(rigidbody.velocity.x, -this.MAX_VELOCITY, this.MAX_VELOCITY);
                rigidbody.velocity.y = this._clamp(rigidbody.velocity.y, -this.MAX_VELOCITY, this.MAX_VELOCITY);

                // Apply gravity
                rigidbody.velocity.y += this.gravity.y * rigidbody.gravityScale * deltaTime;

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

        // 2. Broad-phase collision detection and state update
        const newActiveCollisions = new Map();
        const collidables = this.scene.getAllMaterias().filter(m =>
            m.isActive && (m.getComponent(Components.BoxCollider2D) || m.getComponent(Components.CapsuleCollider2D) || m.getComponent(Components.PolygonCollider2D) || m.getComponent(Components.TilemapCollider2D) || m.getComponent(Components.TerrenoCollider2D))
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
        const scripts = materia.getComponents(Components.CreativeScript);
        if (scripts.length === 0) return;

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

        for (const script of scripts) {
            // We call the Spanish one. If the user defined the English one,
            // the stub in CreativeScriptBehavior will forward it.
            // If they defined the Spanish one, it works directly.
            script._safeInvoke(methodName, collision);
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

        // --- Dispatcher de Colisiones ---
        // El sistema espera que collisionInfo (MTV) apunte de B hacia A para que resolveCollision funcione correctamente
        if (colliderA instanceof Components.BoxCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D) {
                collisionInfo = this.isBoxVsBox(materiaA, materiaB);
            } else if (colliderB instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isBoxVsCapsule(materiaA, materiaB);
            } else if (colliderB instanceof Components.PolygonCollider2D) {
                collisionInfo = this.isPolygonVsPolygon(materiaA, materiaB);
            } else if (colliderB instanceof Components.TilemapCollider2D || colliderB instanceof Components.TerrenoCollider2D) {
                collisionInfo = this.isColliderVsTilemap(materiaA, materiaB);
            }
        } else if (colliderA instanceof Components.CapsuleCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D) {
                collisionInfo = this.isBoxVsCapsule(materiaB, materiaA); // Invertimos para que devuelva Box -> Capsule? No, queremos Box -> Capsule si A=Capsule?
                // Mejor: isBoxVsCapsule(B, A) devuelve MTV de A a B. Invertimos el resultado:
                const info = this.isBoxVsCapsule(materiaB, materiaA);
                if (info) {
                    info.x = -info.x; info.y = -info.y;
                    collisionInfo = info;
                }
            } else if (colliderB instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isCapsuleVsCapsule(materiaA, materiaB);
            } else if (colliderB instanceof Components.PolygonCollider2D) {
                // Queremos Polygon -> Capsule. isPolygonVsCapsule(B, A) devuelve Capsule -> Polygon. Invertimos:
                const info = this.isPolygonVsCapsule(materiaB, materiaA);
                if (info) {
                    info.x = -info.x; info.y = -info.y;
                    collisionInfo = info;
                }
            } else if (colliderB instanceof Components.TilemapCollider2D || colliderB instanceof Components.TerrenoCollider2D) {
                collisionInfo = this.isColliderVsTilemap(materiaA, materiaB);
            }
        } else if (colliderA instanceof Components.PolygonCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D) {
                collisionInfo = this.isPolygonVsPolygon(materiaA, materiaB);
            } else if (colliderB instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isPolygonVsCapsule(materiaA, materiaB);
            } else if (colliderB instanceof Components.PolygonCollider2D) {
                collisionInfo = this.isPolygonVsPolygon(materiaA, materiaB);
            } else if (colliderB instanceof Components.TilemapCollider2D || colliderB instanceof Components.TerrenoCollider2D) {
                collisionInfo = this.isColliderVsTilemap(materiaA, materiaB);
            }
        } else if (colliderA instanceof Components.TilemapCollider2D || colliderA instanceof Components.TerrenoCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D || colliderB instanceof Components.CapsuleCollider2D || colliderB instanceof Components.PolygonCollider2D) {
                const info = this.isColliderVsTilemap(materiaB, materiaA);
                if (info) {
                    info.x = -info.x; info.y = -info.y;
                    collisionInfo = info;
                }
            }
        }

        if (collisionInfo && !colliderA.isTrigger && !colliderB.isTrigger) {
            this.resolveCollision(materiaA, materiaB, collisionInfo);
        }

        return collisionInfo;
    }

    _cross(v1, v2) {
        return v1.x * v2.y - v1.y * v2.x;
    }

    resolveCollision(materiaA, materiaB, collisionInfo) {
        const mtv = { x: collisionInfo.x, y: collisionInfo.y };
        const contactPoint = collisionInfo.contactPoint || { x: (materiaA.x + materiaB.x) / 2, y: (materiaA.y + materiaB.y) / 2 };
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

        // Do not resolve if velocities are separating
        if (velAlongNormal > 0) return;

        // Use the maximum bounciness of the two objects
        const reboteA = rbA ? (rbA.rebote || 0) : 0;
        const reboteB = rbB ? (rbB.rebote || 0) : 0;
        const e = Math.max(reboteA, reboteB);

        // Calculate impulse scalar
        let invMassA = isADynamic ? 1 / (rbA.mass || 1) : 0;
        let invMassB = isBDynamic ? 1 / (rbB.mass || 1) : 0;

        // Better Inertia Calculation based on collider size
        const getInertia = (materia, rb) => {
            if (!rb || rb.constraints.freezeRotation) return 0;
            const collider = this.getCollider(materia);
            const transform = materia.getComponent(Components.Transform);
            let w = 100, h = 100;
            if (collider && collider.size) {
                w = collider.size.x * (transform ? transform.scale.x : 1);
                h = collider.size.y * (transform ? transform.scale.y : 1);
            }
            // I = 1/12 * m * (w^2 + h^2)
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
        if (denominator > 0) {
            j /= denominator;
        } else {
            return;
        }

        // Apply impulse
        const impulse = { x: j * normal.x, y: j * normal.y };

        if (isADynamic) {
            rbA.velocity.x += impulse.x * invMassA;
            rbA.velocity.y += impulse.y * invMassA;
            if (!rbA.constraints.freezeRotation) {
                rbA.angularVelocity += this._cross(ra, impulse) * invInertiaA;
            }
        }

        if (isBDynamic) {
            rbB.velocity.x -= impulse.x * invMassB;
            rbB.velocity.y -= impulse.y * invMassB;
            if (!rbB.constraints.freezeRotation) {
                rbB.angularVelocity -= this._cross(rb, impulse) * invInertiaB;
            }
        }
    }

    getCollider(materia) {
        return materia.getComponent(Components.BoxCollider2D) ||
               materia.getComponent(Components.CapsuleCollider2D) ||
               materia.getComponent(Components.PolygonCollider2D) ||
               materia.getComponent(Components.TilemapCollider2D) ||
               materia.getComponent(Components.TerrenoCollider2D);
    }

    isColliderVsTilemap(colliderMateria, tilemapMateria) {
        const otherCollider = this.getCollider(colliderMateria);
        const tilemapCollider = tilemapMateria.getComponent(Components.TilemapCollider2D) || tilemapMateria.getComponent(Components.TerrenoCollider2D);
        const tilemapTransform = tilemapMateria.getComponent(Components.Transform);

        if (!otherCollider || !tilemapCollider || !tilemapTransform) return null;

        if (tilemapCollider.isDirty) {
            tilemapCollider.generate();
        }

        // 1. Check generated rectangles (Standard for Tilemap and Terreno in Rectangles mode)
        for (const rect of tilemapCollider.generatedColliders) {
            const tileMateria = new Materia('tile_part');
            const tileTransform = new Components.Transform(tileMateria);
            const worldPos = tilemapTransform.position;

            tileTransform.position = {
                x: worldPos.x + rect.x,
                y: worldPos.y + rect.y
            };
            tileMateria.addComponent(tileTransform);

            const tileBoxCollider = new Components.BoxCollider2D(tileMateria);
            tileBoxCollider.size = { x: rect.width, y: rect.height };
            tileMateria.addComponent(tileBoxCollider);

            let collisionInfo = null;
            if (otherCollider instanceof Components.BoxCollider2D) {
                collisionInfo = this.isBoxVsBox(colliderMateria, tileMateria);
            } else if (otherCollider instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isBoxVsCapsule(colliderMateria, tileMateria);
            } else if (otherCollider instanceof Components.PolygonCollider2D) {
                collisionInfo = this.isPolygonVsPolygon(colliderMateria, tileMateria);
            }

            if (collisionInfo) return collisionInfo;
        }

        // 2. Check generated polygons (Terreno in Polygon mode)
        if (tilemapCollider.generatedPolygons && tilemapCollider.generatedPolygons.length > 0) {
            for (const poly of tilemapCollider.generatedPolygons) {
                const polyMateria = new Materia('poly_part');
                const polyTransform = new Components.Transform(polyMateria);
                const worldPos = tilemapTransform.position;

                polyTransform.position = { x: worldPos.x, y: worldPos.y };
                polyMateria.addComponent(polyTransform);

                const polyCollider = new Components.PolygonCollider2D(polyMateria);
                polyCollider.vertices = poly.vertices;
                polyMateria.addComponent(polyCollider);

                let collisionInfo = null;
                if (otherCollider instanceof Components.BoxCollider2D) {
                    collisionInfo = this.isPolygonVsPolygon(colliderMateria, polyMateria);
                } else if (otherCollider instanceof Components.CapsuleCollider2D) {
                    collisionInfo = this.isPolygonVsCapsule(colliderMateria, polyMateria);
                } else if (otherCollider instanceof Components.PolygonCollider2D) {
                    collisionInfo = this.isPolygonVsPolygon(colliderMateria, polyMateria);
                }

                if (collisionInfo) return collisionInfo;
            }
        }

        return null;
    }

    isCapsuleVsCapsule(materiaA, materiaB) {
        const transformA = materiaA.getComponent(Components.Transform);
        const colliderA = materiaA.getComponent(Components.CapsuleCollider2D);
        const transformB = materiaB.getComponent(Components.Transform);
        const colliderB = materiaB.getComponent(Components.CapsuleCollider2D);

        // Ignorando la rotación por simplicidad por ahora
        const radiusA = colliderA.size.x / 2;
        const heightA = Math.max(0, colliderA.size.y - colliderA.size.x);
        const p1A = { x: transformA.x + colliderA.offset.x, y: transformA.y + colliderA.offset.y - heightA / 2 };
        const p2A = { x: transformA.x + colliderA.offset.x, y: transformA.y + colliderA.offset.y + heightA / 2 };

        const radiusB = colliderB.size.x / 2;
        const heightB = Math.max(0, colliderB.size.y - colliderB.size.x);
        const p1B = { x: transformB.x + colliderB.offset.x, y: transformB.y + colliderB.offset.y - heightB / 2 };
        const p2B = { x: transformB.x + colliderB.offset.x, y: transformB.y + colliderB.offset.y + heightB / 2 };

        // Encontrar los puntos más cercanos entre los dos segmentos de línea
        const { a, b } = this._closestPointsOnTwoSegments(p1A, p2A, p1B, p2B);

        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const totalRadius = radiusA + radiusB;

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
        const transformC = capsuleMateria.getComponent(Components.Transform);
        const colliderC = capsuleMateria.getComponent(Components.CapsuleCollider2D);

        const vertices = (colliderP instanceof Components.PolygonCollider2D) ?
            this._getPolygonVertices(transformP, colliderP) :
            this._getVertices(transformP, colliderP);

        // La cápsula es un segmento de línea con un radio.
        const radius = colliderC.size.x / 2;
        const segmentHeight = Math.max(0, colliderC.size.y - colliderC.size.x);
        const p1 = { x: transformC.x + colliderC.offset.x, y: transformC.y + colliderC.offset.y - segmentHeight / 2 };
        const p2 = { x: transformC.x + colliderC.offset.x, y: transformC.y + colliderC.offset.y + segmentHeight / 2 };

        // Encontrar el punto más cercano en el polígono al segmento de la cápsula
        // Una forma simple es encontrar el punto más cercano en el segmento a cada vértice del polígono
        // y también el punto más cercano en los bordes del polígono al segmento.
        // Pero para simplificar, usaremos el centro del polígono para encontrar el punto más cercano en el segmento.
        const polyCenter = { x: transformP.x, y: transformP.y };
        const closestOnSegment = this._closestPointOnSegment(polyCenter, p1, p2);

        // Ahora tenemos un círculo vs polígono
        return this._isCircleVsPolygon(closestOnSegment, radius, vertices);
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
        const polyCenter = vertices.reduce((acc, v) => ({ x: acc.x + v.x / vertices.length, y: acc.y + v.y / vertices.length }), { x: 0, y: 0 });
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
        return this.isPolygonVsCapsule(boxMateria, capsuleMateria);
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
        const centerA = { x: transformA.x, y: transformA.y };
        const centerB = { x: transformB.x, y: transformB.y };
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
        return this.isPolygonVsPolygon(materiaA, materiaB);
    }

    isBoxVsPolygon(boxMateria, polyMateria) {
        return this.isPolygonVsPolygon(boxMateria, polyMateria);
    }

    /**
     * Comprueba si un punto está dentro de un polígono convexo.
     */
    _isPointInPolygon(point, vertices) {
        for (let i = 0; i < vertices.length; i++) {
            const p1 = vertices[i];
            const p2 = vertices[(i + 1) % vertices.length];
            const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            const toPoint = { x: point.x - p1.x, y: point.y - p1.y };
            if (this._cross(edge, toPoint) < -1e-6) return false;
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
        for (const [key, value] of this.collisionStates.entries()) {
            if (value.state === state && value.type === type && value.frame === this.currentFrame) {
                const [id1, id2] = key.split('-').map(Number);
                if (id1 === materia.id || id2 === materia.id) {
                    const otherId = id1 === materia.id ? id2 : id1;
                    const otherMateria = this.scene.findMateriaById(otherId);
                    if (otherMateria) {
                        // --- BUG FIX: Filtrar por tag si se proporciona ---
                        if (tag && otherMateria.tag !== tag) {
                            continue; // No coincide el tag, saltar a la siguiente colisión
                        }
                        const otherCollider = this.getCollider(otherMateria);
                        collisions.push(new Collision(materia, otherMateria, otherCollider));
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
     * @param {string} [tag] - Opcional, filtrar por tag.
     * @returns {object|null} Información del impacto o null.
     */
    raycast(origin, direction, maxDistance = Infinity, tag = null) {
        let closestHit = null;
        let minDistance = maxDistance;

        const collidables = this.scene.getAllMaterias().filter(m =>
            m.isActive && (m.getComponent(Components.BoxCollider2D) || m.getComponent(Components.CapsuleCollider2D) || m.getComponent(Components.PolygonCollider2D))
        );

        for (const materia of collidables) {
            if (tag && materia.tag !== tag) continue;

            const transform = materia.getComponent(Components.Transform);
            const collider = this.getCollider(materia);

            let hit = null;
            if (collider instanceof Components.BoxCollider2D) {
                hit = this._rayVsBox(origin, direction, transform, collider);
            } else if (collider instanceof Components.CapsuleCollider2D) {
                hit = this._rayVsCapsule(origin, direction, transform, collider);
            } else if (collider instanceof Components.PolygonCollider2D) {
                hit = this._rayVsPolygon(origin, direction, transform, collider);
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
            const t = tmin > 0 ? tmin : tmax;
            if (t < 0) return null;

            const hitPointLocal = { x: localOriginX + localDirX * t, y: localOriginY + localDirY * t };

            // Calcular normal local
            let normalLocal = { x: 0, y: 0 };
            const eps = 1e-4;
            if (Math.abs(hitPointLocal.x - halfW) < eps) normalLocal.x = 1;
            else if (Math.abs(hitPointLocal.x + halfW) < eps) normalLocal.x = -1;
            else if (Math.abs(hitPointLocal.y - halfH) < eps) normalLocal.y = 1;
            else if (Math.abs(hitPointLocal.y + halfH) < eps) normalLocal.y = -1;

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

    _rayVsCapsule(origin, direction, transform, collider) {
        // Implementación simplificada tratándola como un círculo (mejor que nada)
        // O mejor, una esfera vs rayo es fácil.
        const radius = (collider.size.x * transform.scale.x) / 2;
        const centerX = transform.x + collider.offset.x * transform.scale.x;
        const centerY = transform.y + collider.offset.y * transform.scale.y;

        const oc = { x: origin.x - centerX, y: origin.y - centerY };
        const b = this._dot(oc, direction);
        const c = this._dot(oc, oc) - radius * radius;
        const h = b * b - c;

        if (h < 0) return null; // No impacta
        const t = -b - Math.sqrt(h);

        if (t < 0) return null;

        const hitPoint = { x: origin.x + direction.x * t, y: origin.y + direction.y * t };
        const normal = this._normalize({ x: hitPoint.x - centerX, y: hitPoint.y - centerY });

        return {
            distance: t,
            point: hitPoint,
            normal: normal
        };
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
