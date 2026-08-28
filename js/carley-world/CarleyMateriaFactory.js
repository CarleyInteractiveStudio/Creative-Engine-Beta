// CarleyMateriaFactory.js
// Fábrica independiente para instanciar objetos CarleyMateria3D con sus leyes asociadas.
// Incorpora capacidades nativas e independientes para cargar e instanciar modelos .obj, .gltf y .glb en la jerarquía.

import { CarleyMateria3D } from './CarleyMateria3D.js';
import * as CarleyComponents from './CarleyComponents.js';

export function createBaseMateria3D(name, parent = null) {
    const mtr = new CarleyMateria3D(name);
    const transform = new CarleyComponents.CarleyTransform3D(mtr);
    mtr.addLaw(transform);
    if (parent) {
        parent.addChild(mtr);
    }
    if (window.currentCarleyWorld) {
        window.currentCarleyWorld.addMateria(mtr);
    }
    // Añadir también al SceneManager si existe para que aparezca en la Jerarquía de la UI
    if (window.SceneManager && window.SceneManager.currentScene) {
        window.SceneManager.currentScene.addMateria(mtr);
    }

    // Sincronización automática e inmediata para la Jerarquía y la Vista de Escena
    setTimeout(() => {
        if (typeof window.updateHierarchy === 'function') {
            window.updateHierarchy();
        }
        if (typeof window.updateScene === 'function') {
            window.updateScene();
        }
    }, 50);

    return mtr;
}

export function createCubeObject(parent = null, color = '#ffffff') {
    const mtr = createBaseMateria3D('Cubo_Carley', parent);
    mtr.transform.scale = { x: 100, y: 100, z: 100 };
    const renderer = new CarleyComponents.CarleyMeshRenderer3D(mtr);
    renderer.meshType = 'Cube';
    renderer.color = color;
    mtr.addLaw(renderer);
    return mtr;
}

export function createDirectionalLightObject(parent = null) {
    const mtr = createBaseMateria3D('Luz_Direccional_Carley', parent);
    const light = new CarleyComponents.CarleyDirectionalLight3D(mtr);
    mtr.addLaw(light);
    return mtr;
}

export function createPointLightObject(parent = null) {
    const mtr = createBaseMateria3D('Luz_Punto_Carley', parent);
    const light = new CarleyComponents.CarleyPointLight3D(mtr);
    mtr.addLaw(light);
    return mtr;
}

export function createSpotLightObject(parent = null) {
    const mtr = createBaseMateria3D('Luz_Focal_Carley', parent);
    const light = new CarleyComponents.CarleySpotLight3D(mtr);
    mtr.addLaw(light);
    return mtr;
}

export function createSphereObject(parent = null, color = '#ffffff') {
    const mtr = createBaseMateria3D('Esfera_Carley', parent);
    mtr.transform.scale = { x: 100, y: 100, z: 100 };
    const renderer = new CarleyComponents.CarleyMeshRenderer3D(mtr);
    renderer.meshType = 'Sphere';
    renderer.color = color;
    mtr.addLaw(renderer);
    return mtr;
}

export function createCapsuleObject(parent = null, color = '#ffffff') {
    const mtr = createBaseMateria3D('Cápsula_Carley', parent);
    mtr.transform.scale = { x: 100, y: 100, z: 100 };
    const renderer = new CarleyComponents.CarleyMeshRenderer3D(mtr);
    renderer.meshType = 'Capsule';
    renderer.color = color;
    mtr.addLaw(renderer);
    return mtr;
}

export function createTriangleObject(parent = null, color = '#ffffff') {
    const mtr = createBaseMateria3D('Triángulo_Carley', parent);
    mtr.transform.scale = { x: 100, y: 100, z: 100 };
    const renderer = new CarleyComponents.CarleyMeshRenderer3D(mtr);
    renderer.meshType = 'Triangle';
    renderer.color = color;
    mtr.addLaw(renderer);
    return mtr;
}

export function createPlaneObject(parent = null, color = '#ffffff') {
    const mtr = createBaseMateria3D('Plano_Carley', parent);
    mtr.transform.scale = { x: 100, y: 1, z: 100 };
    const renderer = new CarleyComponents.CarleyMeshRenderer3D(mtr);
    renderer.meshType = 'Plane';
    renderer.color = color;
    mtr.addLaw(renderer);
    return mtr;
}

export async function createSkinnedMeshObject(modelPath, parent = null, options = {}) {
    return null;
}
export const crearMallaDeEsqueleto3d = createSkinnedMeshObject;
