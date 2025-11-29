import { Rigidbody2D, BoxCollider2D, TilemapCollider2D, Transform } from './Components.js';

export class PhysicsSystem {
    constructor(scene) {
        this.scene = scene;
        this.gravity = { x: 0, y: 98.1 }; // A bit exaggerated for visible effect
    }

    update(deltaTime) {
        // Update positions based on velocity
        for (const materia of this.scene.materias) {
            const rigidbody = materia.getComponent(Rigidbody2D);
            const transform = materia.getComponent(Transform);

            if (rigidbody && transform && rigidbody.bodyType === 'Dynamic') {
                rigidbody.velocity.y += this.gravity.y * deltaTime;
                transform.position.x += rigidbody.velocity.x * deltaTime;
                transform.position.y += rigidbody.velocity.y * deltaTime;
            }
        }

        // Collision detection
        const collidables = this.scene.materias.filter(m => m.getComponent(BoxCollider2D));
        for (let i = 0; i < collidables.length; i++) {
            for (let j = i + 1; j < collidables.length; j++) {
                const materiaA = collidables[i];
                const materiaB = collidables[j];

                const transformA = materiaA.getComponent(Transform);
                const colliderA = materiaA.getComponent(BoxCollider2D);
                const transformB = materiaB.getComponent(Transform);
                const colliderB = materiaB.getComponent(BoxCollider2D);

                const leftA = transformA.position.x - colliderA.size.x / 2;
                const rightA = transformA.position.x + colliderA.size.x / 2;
                const topA = transformA.position.y - colliderA.size.y / 2;
                const bottomA = transformA.position.y + colliderA.size.y / 2;

                const leftB = transformB.position.x - colliderB.size.x / 2;
                const rightB = transformB.position.x + colliderB.size.x / 2;
                const topB = transformB.position.y - colliderB.size.y / 2;
                const bottomB = transformB.position.y + colliderB.size.y / 2;

                if (rightA > leftB && leftA < rightB && bottomA > topB && topA < bottomB) {
                    console.log(`Colisión detectada entre: ${materiaA.name} y ${materiaB.name}`);
                }
            }
        }
    }
}

console.log("Physics.js loaded");
