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
        const SUB_STEPS = 4;
        const subDeltaTime = deltaTime / SUB_STEPS;

        for (let s = 0; s < SUB_STEPS; s++) {
            this._step(subDeltaTime);
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
                        const depth = Math.max(0, avgY - transform.y);
                        const immersion = Math.min(1.2, (nearbyParticles / 12) + (depth / 50));

                        // Fuerza de flotación suavizada
                        const buoyancyForce = immersion * water.density * 45.0;

                        if (rigidbody.buoyancyWeight > rigidbody.sinkThreshold) {
                            // Se hunde, pero con resistencia
                            rigidbody.velocity.y -= buoyancyForce * 0.2 * deltaTime;
                        } else {
                            // Flota: lift depende de cuánto esté sumergido
                            const lift = buoyancyForce * Math.max(0.5, (2.0 - rigidbody.buoyancyWeight));
                            rigidbody.velocity.y -= lift * deltaTime;

                            // Estabilización en superficie: si está muy arriba, lo atrae un poco hacia abajo
                            if (transform.y < avgY - 20) {
                                rigidbody.velocity.y += 10.0 * deltaTime;
                            }
                        }

                        // Resistencia del fluido (Drag) - MUCHO más fuerte para evitar "vuelos"
                        // Aplicamos un amortiguamiento lineal y cuadrático aproximado
                        const dragFactor = 1.0 - (0.4 * water.viscosity * immersion);
                        const finalDrag = Math.pow(Math.max(0.1, dragFactor), deltaTime * 60);
                        rigidbody.velocity.x *= finalDrag;
                        rigidbody.velocity.y *= finalDrag;

                        // Amortiguación de impacto (Splash damping)
                        if (rigidbody.velocity.y > 5) {
                             rigidbody.velocity.y *= Math.pow(0.8, deltaTime * 60);
                        }
                    }
                }

                // Apply linear drag
                if (rigidbody.linearDrag > 0) {
                    const dragFactor = Math.pow(1.0 - rigidbody.linearDrag, deltaTime);
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

        // 2. Broad-phase collision detection and state update
        const newActiveCollisions = new Map();
        const collidables = this.scene.getAllMaterias().filter(m => {
            if (!m.isActive) return false;
            const rb = m.getComponent(Components.Rigidbody2D);
            // Ignore if the Rigidbody is explicitly marked as non-simulated
            if (rb && rb.simulated === false) return false;

            return m.getComponent(Components.BoxCollider2D) || m.getComponent(Components.CapsuleCollider2D) ||
                   m.getComponent(Components.CircleCollider2D) || m.getComponent(Components.PolygonCollider2D) ||
                   m.getComponent(Components.TilemapCollider2D) || m.getComponent(Components.TerrenoCollider2D) ||
                   m.getComponent(Components.LineCollider2D) || m.getComponent(Components.AmortiguadorCollider);
        });

        for (let i = 0; i < collidables.length; i++) {
            for (let j = i + 1; j < collidables.length; j++) {
                const materiaA = collidables[i];
                const materiaB = collidables[j];

                // --- 2.1 Collision Filtering ---
                // 1. Assembly Filter: Don't collide if they share the same VehicleController.
                // Prevents vehicle parts (chassis, wheels) from exploding due to internal collisions.
                const vehicleA = (materiaA.getComponent(Components.VehicleController) || materiaA.getComponent(Components.WheelSuspension)) ? materiaA : (materiaA.findAncestorWithComponent(Components.VehicleController) || materiaA.findAncestorWithComponent(Components.WheelSuspension));
                const vehicleB = (materiaB.getComponent(Components.VehicleController) || materiaB.getComponent(Components.WheelSuspension)) ? materiaB : (materiaB.findAncestorWithComponent(Components.VehicleController) || materiaB.findAncestorWithComponent(Components.WheelSuspension));

                if (vehicleA && vehicleA === vehicleB) continue;

                // 2. Wheel Filter: Ignore physical collisions for wheel materias.
                // They are handled by the WheelSuspension component logic.
                if (materiaA.isWheel || materiaB.isWheel) continue;

                // Also check if one is explicitly registered as a wheel of a suspension on the other
                const suspA = materiaA.getComponent(Components.WheelSuspension);
                if (suspA && suspA.wheels.some(w => w.materiaId === materiaB.id)) continue;

                const suspB = materiaB.getComponent(Components.WheelSuspension);
                if (suspB && suspB.wheels.some(w => w.materiaId === materiaA.id)) continue;

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
        } else if (colliderA instanceof Components.AmortiguadorCollider) {
            collisionInfo = this.isColliderVsAmortiguador(materiaB, materiaA);
            if (collisionInfo) {
                collisionInfo.x = -collisionInfo.x; collisionInfo.y = -collisionInfo.y;
            }
        }

        if (colliderB instanceof Components.AmortiguadorCollider && !collisionInfo) {
            collisionInfo = this.isColliderVsAmortiguador(materiaA, materiaB);
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
            if (collider && collider.size) {
                w = collider.size.x * (transform ? transform.scale.x : 1);
                h = collider.size.y * (transform ? transform.scale.y : 1);
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
               materia.getComponent(Components.LineCollider2D) ||
               materia.getComponent(Components.AmortiguadorCollider);
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

    isColliderVsAmortiguador(colliderMateria, amortMateria) {
        const otherCollider = this.getCollider(colliderMateria);
        const amort = amortMateria.getComponent(Components.AmortiguadorCollider);
        const transformA = amortMateria.getComponent(Components.Transform);

        if (!otherCollider || !amort || !transformA) return null;

        // Reutilizar lógica de Box vs Box/Circle para detección inicial
        if (!this._tempAmortMateria) {
            this._tempAmortMateria = new Materia('_physics_amort_temp');
            this._tempAmortTransform = new Components.Transform(this._tempAmortMateria);
            this._tempAmortBox = new Components.BoxCollider2D(this._tempAmortMateria);
            this._tempAmortMateria.getComponent = (t) => {
                if (t === Components.Transform) return this._tempAmortTransform;
                if (t === Components.BoxCollider2D) return this._tempAmortBox;
                return null;
            };
        }

        this._tempAmortTransform.position = transformA.position;
        this._tempAmortTransform.rotation = transformA.rotation;
        this._tempAmortTransform.scale = transformA.scale;
        this._tempAmortBox.size = amort.size;
        this._tempAmortBox.offset = amort.offset;

        let info = null;
        if (otherCollider instanceof Components.BoxCollider2D) {
            info = this.isBoxVsBox(colliderMateria, this._tempAmortMateria);
        } else if (otherCollider instanceof Components.CircleCollider2D) {
            info = this.isCircleVsBox(colliderMateria, this._tempAmortMateria);
        } else if (otherCollider instanceof Components.CapsuleCollider2D) {
            info = this.isBoxVsCapsule(this._tempAmortMateria, colliderMateria);
            if (info) { info.x = -info.x; info.y = -info.y; }
        }

        if (info) {
            // Aplicar lógica de amortiguación
            const rb = colliderMateria.getComponent(Components.Rigidbody2D);
            if (rb && rb.bodyType.toLowerCase() === 'dynamic') {
                const normal = this._normalize({ x: info.x, y: info.y });

                // 1. Drenar velocidad (Amortiguación)
                const relativeVel = rb.velocity.x * normal.x + rb.velocity.y * normal.y;
                if (relativeVel > 0) {
                     rb.velocity.x -= normal.x * relativeVel * amort.amortiguacion;
                     rb.velocity.y -= normal.y * relativeVel * amort.amortiguacion;
                }

                // 2. Fuerza de recuperación (Expulsión inteligente)
                const penetration = info.magnitude;

                // Calculamos cuánto 'debería' estar fuera según nivelExpulsion (0 a 1)
                // Si nivelExpulsion es 1.0, queremos expulsarlo totalmente (objetivo penetración = 0)
                // Si nivelExpulsion es 0.8, aceptamos un 20% de penetración.
                const totalSize = Math.max(amort.size.x * transformA.scale.x, amort.size.y * transformA.scale.y);
                const targetPenetration = totalSize * (1.0 - amort.distanciaDeseada);

                // Si la penetración es mayor al objetivo, empujamos
                if (penetration > targetPenetration) {
                    const extraPenetration = penetration - targetPenetration;

                    // El peso influye: si es demasiado pesado para el soporte, no lo expulsa del todo
                    const weightFactor = Math.min(1.0, amort.soporteMaximo / (rb.mass * 10 || 1));
                    const pushForce = extraPenetration * amort.fuerzaRecuperacion * weightFactor * 10;

                    rb.addForce(-normal.x * pushForce * 100, -normal.y * pushForce * 100);
                }
            }

            // Importante: No permitimos que Physics.js resuelva esta colisión de forma estándar
            // devolvemos null después de aplicar nuestras fuerzas manuales si no queremos rebote brusco.
            // O devolvemos el info si queremos que el sistema sepa que hay contacto para eventos.
            return info;
        }

        return null;
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

                            if (!trimmedTag || otherMateria.tag.trim() === trimmedTag) {
                                collisions.push(new Collision(thisMateria, otherMateria, this.getCollider(otherMateria)));
                            }
                        } else {
                            // Búsqueda global por tag
                            if (!trimmedTag || materiaA.tag.trim() === trimmedTag || materiaB.tag.trim() === trimmedTag) {
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
            if (targetTags.length > 0 && !targetTags.includes(materia.tag)) continue;

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
                normalLocal = mag > 0 ? { x: -localDirX / mag, y: -localDirY / mag } : { x: 0, y: -1 };
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
