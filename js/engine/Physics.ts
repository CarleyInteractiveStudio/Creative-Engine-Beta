import { Rigidbody, BoxCollider, Transform } from './Components.ts';

export class PhysicsSystem {
    scene: any;
    gravity: { x: number, y: number };

    constructor(scene: any) {
        this.scene = scene;
        this.gravity = { x: 0, y: 98.1 }; // A bit exaggerated for visible effect
    }

    update(deltaTime: number): void {
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
        const collidables = this.scene.materias.filter(m => m.getComponent(BoxCollider));
        for (let i = 0; i < collidables.length; i++) {
            for (let j = i + 1; j < collidables.length; j++) {
                const materiaA = collidables[i];
                const materiaB = collidables[j];

                const transformA = materiaA.getComponent(Transform);
                const colliderA = materiaA.getComponent(BoxCollider);
                const transformB = materiaB.getComponent(Transform);
                const colliderB = materiaB.getComponent(BoxCollider);

                const leftA = transformA.x - colliderA.width / 2;
                const rightA = transformA.x + colliderA.width / 2;
                const topA = transformA.y - colliderA.height / 2;
                const bottomA = transformA.y + colliderA.height / 2;

                const leftB = transformB.x - colliderB.width / 2;
                const rightB = transformB.x + colliderB.width / 2;
                const topB = transformB.y - colliderB.height / 2;
                const bottomB = transformB.y + colliderB.height / 2;

                if (rightA > leftB && leftA < rightB && bottomA > topB && topA < bottomB) {
                    console.log(`Colisión detectada entre: ${materiaA.name} y ${materiaB.name}`);
                }
            }
        }
    }
}

console.log("Physics.js loaded");
