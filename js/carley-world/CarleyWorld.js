// CarleyWorld.js
// Gestor principal del ciclo de juego, físicas simplificadas y lógica de la escena para el motor Carley World 3D.

import { CarleyMateria3D } from './CarleyMateria3D.js';
import { CarleyRenderer } from './CarleyRenderer.js';
import { CarleyMath } from './CarleyMath.js';

export class CarleyWorld {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new CarleyRenderer(canvas);
        this.materias = [];
        this.camera = null;
        this.isGameRunning = false;

        // Propiedades de la cámara
        this.cameraPosition = { x: 0, y: 0, z: 500 };
        this.cameraRotation = { x: 15, y: 0, z: 0 };
    }

    addMateria(materia) {
        if (materia instanceof CarleyMateria3D) {
            this.materias.push(materia);
        }
    }

    getRootMaterias() {
        return this.materias.filter(m => m.parent === null);
    }

    getAllMaterias() {
        let all = [];
        const getRecursive = (m) => {
            all.push(m);
            for (const child of m.children) {
                getRecursive(child);
            }
        };
        for (const root of this.getRootMaterias()) {
            getRecursive(root);
        }
        return all;
    }

    removeMateria(materiaId) {
        const index = this.materias.findIndex(m => m.id === materiaId);
        if (index > -1) {
            this.materias[index].destroy();
            this.materias.splice(index, 1);
        }
    }

    update(deltaTime) {
        // Ejecutar ciclo de actualización de leyes en todas las Materia3D
        const all = this.getAllMaterias();
        for (const m of all) {
            if (m.isActive) {
                m.update(deltaTime);
            }
        }

        // Físicas simplificadas para CarleyRigidbody3D
        for (const m of all) {
            if (!m.isActive) continue;
            const rb = m.rigidbody;
            const transform = m.transform;
            if (rb && transform) {
                if (rb.useGravity) {
                    rb.velocity.y -= 9.8 * deltaTime * 10; // Gravedad simplificada hacia abajo
                }
                // Aplicar fricción drag
                rb.velocity.x *= (1.0 - rb.drag);
                rb.velocity.y *= (1.0 - rb.drag);
                rb.velocity.z *= (1.0 - rb.drag);

                // Actualizar posiciones
                transform.position.x += rb.velocity.x * deltaTime;
                transform.position.y += rb.velocity.y * deltaTime;
                transform.position.z += rb.velocity.z * deltaTime;
            }
        }
    }

    render() {
        this.renderer.clear();

        // Construir matriz de vista
        const viewMatrix = CarleyMath.mat4Identity();
        const translationMat = CarleyMath.mat4Identity();
        const rotationMat = CarleyMath.mat4Identity();

        // Invertir cámara para la vista
        const invCamPos = {
            x: -this.cameraPosition.x,
            y: -this.cameraPosition.y,
            z: -this.cameraPosition.z
        };
        CarleyMath.mat4Translation(translationMat, invCamPos);
        CarleyMath.mat4RotationYXZ(rotationMat, -this.cameraRotation.x, -this.cameraRotation.y, -this.cameraRotation.z);
        CarleyMath.mat4Multiply(viewMatrix, rotationMat, translationMat);

        // Construir matriz de proyección perspectiva
        const projectionMatrix = CarleyMath.mat4Identity();
        const aspect = this.canvas.width / this.canvas.height;
        CarleyMath.mat4Perspective(projectionMatrix, 60, aspect, 0.1, 10000);

        const all = this.getAllMaterias();
        for (const m of all) {
            if (m.isActive && m.meshRenderer) {
                this.renderer.renderMateria(m, viewMatrix, projectionMatrix);
            }
        }
    }
}
