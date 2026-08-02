// CarleyMateriaFactory.js
// Fábrica independiente para instanciar objetos CarleyMateria3D con sus leyes asociadas.
// Incorpora capacidades nativas e independientes para cargar e instanciar modelos .obj, .gltf y .glb en la jerarquía.

import { CarleyMateria3D } from './CarleyMateria3D.js';
import * as CarleyComponents from './CarleyComponents.js';
import { CarleyModelLoader3D } from './CarleyModelLoader3D.js';

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

// Carga e instanciación de un modelo 3D (OBJ/GLTF/GLB) en Carley World
export async function createSkinnedMeshObject(modelPath, parent = null, options = {}) {
    const modelData = await CarleyModelLoader3D.loadModel(modelPath, window.projectsDirHandle);
    if (!modelData) return null;

    const rootName = modelPath.split('/').pop().split('.')[0];
    const rootMateria = createBaseMateria3D(rootName, parent);

    const nodeMaterias = [];

    if (modelData.nodes) {
        for (const node of modelData.nodes) {
            const nodeMtr = new CarleyMateria3D(node.name);
            const t = new CarleyComponents.CarleyTransform3D(nodeMtr);
            t.position = { x: node.translation[0], y: node.translation[1], z: node.translation[2] };
            t.scale = { x: node.scale[0], y: node.scale[1], z: node.scale[2] };
            nodeMtr.addLaw(t);
            nodeMaterias.push(nodeMtr);
        }

        for (let i = 0; i < modelData.nodes.length; i++) {
            const node = modelData.nodes[i];
            const nodeMtr = nodeMaterias[i];

            if (node.children) {
                node.children.forEach(childIdx => {
                    const childMtr = nodeMaterias[childIdx];
                    childMtr.setParent(nodeMtr);
                });
            }

            if (node.mesh !== undefined && !options.onlySkeleton) {
                const mesh = modelData.meshes[node.mesh];
                mesh.primitives.forEach((primitive, pIdx) => {
                    let targetMtr = nodeMtr;
                    if (pIdx > 0) {
                        targetMtr = createBaseMateria3D(`${node.name}_part${pIdx}`, nodeMtr);
                    }

                    const renderer = new CarleyComponents.CarleySkinnedMeshRenderer3D(targetMtr);
                    renderer.modelPath = modelPath;
                    renderer.cpuPositions = primitive.positions;
                    renderer.cpuNormals = primitive.normals;
                    renderer.cpuUVs = primitive.uvs;
                    renderer.cpuIndices = primitive.indices;
                    renderer.cpuJoints = primitive.joints ? new Float32Array(primitive.joints) : null;
                    renderer.cpuWeights = primitive.weights ? new Float32Array(primitive.weights) : null;
                    renderer.indexCount = primitive.indices ? primitive.indices.length : primitive.positions.length / 3;

                    if (node.skin !== undefined) {
                        const skin = modelData.skins[node.skin];
                        renderer.skeleton = { joints: skin.joints.map(idx => nodeMaterias[idx].id), inverseBindMatrices: skin.inverseBindMatrices };
                    }

                    renderer.isLoaded = true;
                    targetMtr.addLaw(renderer);
                });
            }
        }
        nodeMaterias.forEach(m => {
            if (!m.parent) {
                m.setParent(rootMateria);
            }
        });
    }

    if (modelData.animations?.length > 0) {
        const animator = new CarleyComponents.CarleyAnimator3D(rootMateria);
        animator.animations = modelData.animations.map(a => ({
            ...a,
            channels: a.channels.map(c => ({
                ...c,
                node: nodeMaterias[c.node]?.id || rootMateria.id
            }))
        }));
        rootMateria.addLaw(animator);
        animator.play();
    }

    return rootMateria;
}
export const crearMallaDeEsqueleto3d = createSkinnedMeshObject;
