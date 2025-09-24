import { Rigidbody, BoxCollider, Transform } from './Components.js';

export class PhysicsSystem {
    constructor(scene) {
        this.scene = scene;
        this.gravity = { x: 0, y: 98.1 }; // A bit exaggerated for visible effect
    }

    update(deltaTime) {
        // Update positions based on velocity
        for (const materia of this.scene.materias) {
            const rigidbody = materia.getComponent(Rigidbody);
            const transform = materia.getComponent(Transform);

            if (rigidbody && transform && rigidbody.bodyType === 'dynamic') {
                rigidbody.velocity.y += this.gravity.y * deltaTime;
                transform.x += rigidbody.velocity.x * deltaTime;
                transform.y += rigidbody.velocity.y * deltaTime;
            }
        }

        // Collision detection
        const dynamicCollidables = this.scene.materias.filter(m => m.getComponent(BoxCollider) && m.getComponent(Rigidbody)?.bodyType === 'dynamic');
        const staticCollidables = this.scene.materias.filter(m => m.getComponent(BoxCollider) && m.getComponent(Rigidbody)?.bodyType !== 'dynamic');
        const tilemaps = this.scene.materias.filter(m => m.getComponent(TilemapRenderer));

        for (const materiaA of dynamicCollidables) {
            const transformA = materiaA.getComponent(Transform);
            const colliderA = materiaA.getComponent(BoxCollider);
            const rbA = materiaA.getComponent(Rigidbody);

            const boundsA = {
                left: transformA.x - colliderA.width / 2,
                right: transformA.x + colliderA.width / 2,
                top: transformA.y - colliderA.height / 2,
                bottom: transformA.y + colliderA.height / 2
            };

            // --- Check against static BoxColliders ---
            for (const materiaB of staticCollidables) {
                const transformB = materiaB.getComponent(Transform);
                const colliderB = materiaB.getComponent(BoxCollider);
                const boundsB = {
                    left: transformB.x - colliderB.width / 2,
                    right: transformB.x + colliderB.width / 2,
                    top: transformB.y - colliderB.height / 2,
                    bottom: transformB.y + colliderB.height / 2
                };
                if (this.checkAABB(boundsA, boundsB)) {
                    this.resolveCollision(transformA, rbA, boundsA, boundsB);
                }
            }

            // --- Check against Tilemaps ---
            for (const tilemapMateria of tilemaps) {
                const tilemap = tilemapMateria.getComponent(TilemapRenderer);
                const mapTransform = tilemapMateria.getComponent(Transform);

                for (let y = 0; y < tilemap.height; y++) {
                    for (let x = 0; x < tilemap.width; x++) {
                        const tileIndex = y * tilemap.width + x;
                        if (tilemap.collisionData[tileIndex] === 1) {
                            const tileBounds = {
                                left: mapTransform.x + x * tilemap.tileWidth,
                                right: mapTransform.x + (x + 1) * tilemap.tileWidth,
                                top: mapTransform.y + y * tilemap.tileHeight,
                                bottom: mapTransform.y + (y + 1) * tilemap.tileHeight
                            };
                            if (this.checkAABB(boundsA, tileBounds)) {
                                this.resolveCollision(transformA, rbA, boundsA, tileBounds);
                            }
                        }
                    }
                }
            }
        }
    }

    checkAABB(boundsA, boundsB) {
        return boundsA.right > boundsB.left &&
               boundsA.left < boundsB.right &&
               boundsA.bottom > boundsB.top &&
               boundsA.top < boundsB.bottom;
    }

    resolveCollision(transformA, rbA, boundsA, boundsB) {
        // Simple resolution: stop movement. A real system would be more complex.
        // Calculate overlap on each axis
        const overlapX = Math.min(boundsA.right, boundsB.right) - Math.max(boundsA.left, boundsB.left);
        const overlapY = Math.min(boundsA.bottom, boundsB.bottom) - Math.max(boundsA.top, boundsB.top);

        // Resolve collision by pushing the object back along the axis of minimum overlap
        if (overlapX < overlapY) {
            if (transformA.x < boundsB.left) { // Came from the left
                transformA.x -= overlapX;
            } else { // Came from the right
                transformA.x += overlapX;
            }
            rbA.velocity.x = 0;
        } else {
            if (transformA.y < boundsB.top) { // Came from the top
                transformA.y -= overlapY;
            } else { // Came from the bottom
                transformA.y += overlapY;
            }
            rbA.velocity.y = 0;
        }
    }
}

console.log("Physics.js loaded");
