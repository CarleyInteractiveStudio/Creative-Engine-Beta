// CarleyWorld.js
// Gestor principal del ciclo de juego, físicas simplificadas y lógica de la escena para el motor Carley World 3D.
// Gestiona el renderizado de sombras en pase previo y actualiza los uniformes de iluminación.

import { CarleyMateria3D } from './CarleyMateria3D.js';
import { CarleyRenderer } from './CarleyRenderer.js';
import { CarleyMath } from './CarleyMath.js';
import { CarleyDirectionalLight3D } from './CarleyComponents.js';

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
        if (window.SceneManager && window.SceneManager.currentScene) {
            return window.SceneManager.currentScene.getRootMaterias();
        }
        return this.materias.filter(m => m.parent === null);
    }

    getAllMaterias() {
        if (window.SceneManager && window.SceneManager.currentScene) {
            return window.SceneManager.currentScene.getAllMaterias();
        }
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
        const all = this.getAllMaterias();

        // 1. Detectar luz direccional para sombras e iluminación
        let mainLight = null;
        for (const m of all) {
            if (m.isActive) {
                const light = m.getLaw(CarleyDirectionalLight3D);
                if (light) {
                    mainLight = light;
                    break;
                }
            }
        }

        // 2. Construir la matriz de espacio de luz (para proyección de sombras)
        const lightSpaceMatrix = CarleyMath.mat4Identity();
        const lightView = CarleyMath.mat4Identity();
        const lightProj = CarleyMath.mat4Identity();

        // Proyección ortográfica simplificada para la luz direccional
        const lDir = mainLight ? mainLight.direction : { x: -0.5, y: -1.0, z: -0.3 };
        const lightPos = { x: -lDir.x * 1000, y: -lDir.y * 1000, z: -lDir.z * 1000 };
        const invLightPos = { x: -lightPos.x, y: -lightPos.y, z: -lightPos.z };

        CarleyMath.mat4Translation(lightView, invLightPos);
        // Perspectiva ortográfica simulada básica para proyección de sombras
        CarleyMath.mat4Perspective(lightProj, 90, 1.0, 1.0, 5000);
        CarleyMath.mat4Multiply(lightSpaceMatrix, lightProj, lightView);

        // 3. Pase de Sombras (Shadow Pass)
        this.renderer.beginShadowPass(lightSpaceMatrix);
        for (const m of all) {
            if (m.isActive && m.meshRenderer && m.meshRenderer.castShadows) {
                this.renderer.renderMateriaShadow(m);
            }
        }
        this.renderer.endShadowPass();

        // 4. Pase de Renderizado Principal
        this.renderer.clear();

        // Construir matriz de vista de la cámara principal (con rotación Pitch-Yaw local sobre sí misma sin roll/tilt)
        const viewMatrix = CarleyMath.mat4Identity();
        const translationMat = CarleyMath.mat4Identity();
        const rotationMat = CarleyMath.mat4Identity();

        const invCamPos = {
            x: -this.cameraPosition.x,
            y: -this.cameraPosition.y,
            z: -this.cameraPosition.z
        };
        CarleyMath.mat4Translation(translationMat, invCamPos);
        CarleyMath.mat4RotationPitchYaw(rotationMat, -this.cameraRotation.x, -this.cameraRotation.y);
        CarleyMath.mat4Multiply(viewMatrix, rotationMat, translationMat);

        // Construir matriz de proyección de la cámara principal
        const projectionMatrix = CarleyMath.mat4Identity();
        const aspect = this.canvas.width / this.canvas.height;
        CarleyMath.mat4Perspective(projectionMatrix, 60, aspect, 0.1, 200000);

        // Guardar las últimas matrices de renderizado en el renderizador para proyección de gizmos/raycasts
        this.renderer.lastViewMatrix = viewMatrix;
        this.renderer.lastProjectionMatrix = projectionMatrix;
        window._Renderer3D = this.renderer; // Ensure window._Renderer3D is always aligned with the active CarleyWorld renderer

        // Dibujar Rejilla y Ejes Coordenados del Mundo 3D
        this.renderer.drawGridAndAxes(viewMatrix, projectionMatrix);

        // Renderizar cada objeto de la escena
        for (const m of all) {
            if (m.isActive && m.meshRenderer) {
                this.renderer.renderMateria(
                    m,
                    viewMatrix,
                    projectionMatrix,
                    lightSpaceMatrix,
                    this.cameraPosition,
                    mainLight
                );
            }
        }
    }
}
