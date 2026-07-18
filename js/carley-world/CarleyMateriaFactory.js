// CarleyMateriaFactory.js
// Fábrica independiente para instanciar objetos CarleyMateria3D con sus leyes asociadas.

import { CarleyMateria3D } from './CarleyMateria3D.js';
import * as CarleyComponents from './CarleyComponents.js';

export function createBaseMateria3D(name, parent = null) {
    const mtr = new CarleyMateria3D(name);
    const transform = new CarleyComponents.CarleyTransform3D(mtr);
    mtr.addLaw(transform);
    if (parent) {
        parent.addChild(mtr);
    }
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
