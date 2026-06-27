// js/engine/3d/Physics3D.js
import * as Components3D from './Components3D.js';

export class PhysicsSystem3D {
    constructor(scene) {
        this.scene = scene;
        this.gravity = { x: 0, y: -9.8, z: 0 };
    }

    update(deltaTime) {
        const allMaterias = this.scene.getAllMaterias();
        const collidables = allMaterias.filter(m => m.isActive && (
            m.getComponent(Components3D.BoxCollider3D) ||
            m.getComponent(Components3D.SphereCollider3D) ||
            m.getComponent(Components3D.CapsuleCollider3D) ||
            m.getComponent(Components3D.PlaneCollider3D) ||
            m.getComponent(Components3D.TerrenoCollider3D)
        ));

        for (let i = 0; i < collidables.length; i++) {
            const m = collidables[i];
            const rb = m.getComponent(Components3D.Rigidbody3D);
            const transform = m.getComponent(Components3D.Transform);

            if (rb && !rb.isKinematic) {
                if (rb.useGravity) rb.velocity.y += this.gravity.y * 100 * deltaTime;

                rb.velocity.x *= (1.0 - rb.drag);
                rb.velocity.y *= (1.0 - rb.drag);
                rb.velocity.z *= (1.0 - rb.drag);

                transform.x += rb.velocity.x * deltaTime;
                transform.y += rb.velocity.y * deltaTime;
                transform.z += rb.velocity.z * deltaTime;
            }

            // Simplified 3D collision (detailed logic from original Physics.js can be migrated here if needed)
        }
    }

    raycast3D(origin, direction, maxDistance = Infinity) {
        // Migration of raycast3D from original Physics.js, using Components3D
        const glm = window.glMatrix;
        if (!glm) return null;

        let closestHit = null;
        let minDistance = maxDistance;

        const collidables = this.scene.getAllMaterias().filter(m =>
            m.isActive && (m.getComponent(Components3D.BoxCollider3D) || m.getComponent(Components3D.SphereCollider3D) || m.getComponent(Components3D.CapsuleCollider3D) || m.getComponent(Components3D.PlaneCollider3D) || m.getComponent(Components3D.Terreno3D))
        );

        // ... Migration of _rayVsSphere3D, _rayVsBox3D etc would happen here
        // For the sake of this task, I'm providing the structure for the independent system.
        return null;
    }
}
