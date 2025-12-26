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
        for (const materia of this.scene.getAllMaterias()) {
            const rigidbody = materia.getComponent(Components.Rigidbody2D);
            const transform = materia.getComponent(Components.Transform);

            if (rigidbody && transform && rigidbody.bodyType.toLowerCase() === 'dynamic' && rigidbody.simulated) {
                const PHYSICS_SCALE = 100; // Factor de escala para que las unidades sean más manejables
                rigidbody.velocity.y += this.gravity.y * rigidbody.gravityScale * deltaTime;
                transform.x += rigidbody.velocity.x * PHYSICS_SCALE * deltaTime;
                transform.y += rigidbody.velocity.y * PHYSICS_SCALE * deltaTime;
            }
        }

        // 2. Broad-phase collision detection and state update
        const newActiveCollisions = new Map();
        const collidables = this.scene.getAllMaterias().filter(m =>
            m.isActive && (m.getComponent(Components.BoxCollider2D) || m.getComponent(Components.CapsuleCollider2D) || m.getComponent(Components.TilemapCollider2D))
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

        // --- Dispatcher de Colisiones ---
        if (colliderA instanceof Components.BoxCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D) {
                collisionInfo = this.isBoxVsBox(materiaA, materiaB);
            } else if (colliderB instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isBoxVsCapsule(materiaA, materiaB);
            } else if (colliderB instanceof Components.TilemapCollider2D) {
                collisionInfo = this.isColliderVsTilemap(materiaA, materiaB);
            }
        } else if (colliderA instanceof Components.CapsuleCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D) {
                collisionInfo = this.isBoxVsCapsule(materiaB, materiaA); // Invertir orden
            } else if (colliderB instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isCapsuleVsCapsule(materiaA, materiaB);
            } else if (colliderB instanceof Components.TilemapCollider2D) {
                collisionInfo = this.isColliderVsTilemap(materiaA, materiaB);
            }
        } else if (colliderA instanceof Components.TilemapCollider2D) {
            if (colliderB instanceof Components.BoxCollider2D || colliderB instanceof Components.CapsuleCollider2D) {
                collisionInfo = this.isColliderVsTilemap(materiaB, materiaA); // Invertir orden
            }
            // No implementamos Tilemap vs Tilemap por ahora
        }

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

        // For simplicity, remove the velocity component along the collision normal
        // to prevent objects from retaining penetration velocity (simple separation).
        const EPS = 1e-6;
        if (isADynamic && rbA.velocity) {
            const velDotNormalA = this._dot(rbA.velocity, normal);
            if (Math.abs(velDotNormalA) > EPS) {
                rbA.velocity.x -= velDotNormalA * normal.x;
                rbA.velocity.y -= velDotNormalA * normal.y;
            }
        }

        if (isBDynamic && rbB.velocity) {
            const velDotNormalB = this._dot(rbB.velocity, normal);
            if (Math.abs(velDotNormalB) > EPS) {
                rbB.velocity.x -= velDotNormalB * normal.x;
                rbB.velocity.y -= velDotNormalB * normal.y;
            }
        }
    }

    getCollider(materia) {
        return materia.getComponent(Components.BoxCollider2D) ||
               materia.getComponent(Components.CapsuleCollider2D) ||
               materia.getComponent(Components.TilemapCollider2D);
    }

    isColliderVsTilemap(colliderMateria, tilemapMateria) {
        const otherCollider = this.getCollider(colliderMateria);
        const tilemapCollider = tilemapMateria.getComponent(Components.TilemapCollider2D);
        const tilemapTransform = tilemapMateria.getComponent(Components.Transform);

        if (!otherCollider || !tilemapCollider || !tilemapTransform) return null;

        for (const rect of tilemapCollider.generatedColliders) {
            // Crear un objeto 'Materia' temporal para representar el tile
            const tileMateria = new Materia('tile_part');
            const tileTransform = new Components.Transform(tileMateria);

            // ¡Corrección CRÍTICA! Convertir las coordenadas locales del collider a coordenadas mundiales.
            // Las 'rect' vienen con coordenadas relativas al pivote del Tilemap.
            // Necesitamos sumar la posición del Tilemap para obtener su posición en el mundo.
            const tileWorldPos = tilemapTransform.position;
            tileTransform.position = {
                x: tileWorldPos.x + rect.x,
                y: tileWorldPos.y + rect.y
            };
            tileMateria.addComponent(tileTransform);

            const tileBoxCollider = new Components.BoxCollider2D(tileMateria);
            tileBoxCollider.size = { x: rect.width, y: rect.height };
            tileMateria.addComponent(tileBoxCollider);

            let collisionInfo = null;
            if (otherCollider instanceof Components.BoxCollider2D) {
                collisionInfo = this.isBoxVsBox(colliderMateria, tileMateria);
            } else if (otherCollider instanceof Components.CapsuleCollider2D) {
                // isBoxVsCapsule espera (box, capsule), así que invertimos el orden
                collisionInfo = this.isBoxVsCapsule(tileMateria, colliderMateria);
            }

            if (collisionInfo) {
                // Se encontró una colisión, no necesitamos comprobar el resto de tiles
                return collisionInfo;
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
            const normal = distance > 0 ? { x: (b.x - a.x) / distance, y: (b.y - a.y) / distance } : { x: 1, y: 0 };

            return {
                x: normal.x * overlap,
                y: normal.y * overlap,
                magnitude: overlap
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

    isBoxVsCapsule(boxMateria, capsuleMateria) {
        const transformB = boxMateria.getComponent(Components.Transform);
        const colliderB = boxMateria.getComponent(Components.BoxCollider2D);
        const transformC = capsuleMateria.getComponent(Components.Transform);
        const colliderC = capsuleMateria.getComponent(Components.CapsuleCollider2D);

        // --- 1. Simplificar a colisión Círculo vs AABB ---
        // Para simplificar, trataremos la caja como un AABB (Axis-Aligned Bounding Box).
        // Esto ignora la rotación de la caja, pero es un buen punto de partida.
        const box = {
            x: transformB.x + colliderB.offset.x - (colliderB.size.x / 2),
            y: transformB.y + colliderB.offset.y - (colliderB.size.y / 2),
            width: colliderB.size.x,
            height: colliderB.size.y
        };

        // La cápsula es un segmento de línea con un radio.
        // Por ahora, también ignoraremos la rotación de la cápsula.
        const radius = colliderC.size.x / 2;
        const segmentHeight = Math.max(0, colliderC.size.y - colliderC.size.x);
        const p1 = { x: transformC.x + colliderC.offset.x, y: transformC.y + colliderC.offset.y - segmentHeight / 2 };
        const p2 = { x: transformC.x + colliderC.offset.x, y: transformC.y + colliderC.offset.y + segmentHeight / 2 };

        // --- 2. Encontrar el punto más cercano en la caja al segmento de la cápsula ---
        // Esto es complejo. Un enfoque más simple es encontrar el punto más cercano
        // en el segmento de la cápsula al centro de la caja.
        const boxCenter = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

        const closestPointOnSegment = this._closestPointOnSegment(boxCenter, p1, p2);

        // --- 3. Ahora tenemos una colisión Círculo vs AABB ---
        const circle = {
            x: closestPointOnSegment.x,
            y: closestPointOnSegment.y,
            radius: radius
        };

        // --- 4. Test de intersección Círculo-AABB ---
        const closestPointInBox = {
            x: this._clamp(circle.x, box.x, box.x + box.width),
            y: this._clamp(circle.y, box.y, box.y + box.height)
        };

        const distance = Math.hypot(circle.x - closestPointInBox.x, circle.y - closestPointInBox.y);

        if (distance < circle.radius) {
            // Hay colisión. Calcular el vector de penetración (MTV).
            const overlap = circle.radius - distance;
            let normal = {
                x: circle.x - closestPointInBox.x,
                y: circle.y - closestPointInBox.y
            };

            // Si el centro del círculo está dentro de la caja, el cálculo del normal es diferente.
            if (normal.x === 0 && normal.y === 0) {
                 // Elige un eje, por ejemplo, el eje x
                normal = { x: 1, y: 0 };
            }

            const normalizedNormal = this._normalize(normal);

            return {
                x: normalizedNormal.x * overlap,
                y: normalizedNormal.y * overlap,
                magnitude: overlap
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
}
