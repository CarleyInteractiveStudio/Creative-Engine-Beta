// js/editor/MateriaFactory.js

import { Materia } from '../engine/Materia.js';
import * as Components from '../engine/Components.js';
import * as SceneManager from '../engine/SceneManager.js';

async function ensure3D() {
    if (!window.Components3D) window.Components3D = await import('../carley-world/CarleyComponents.js');
    return window.Components3D;
}

export function generateUniqueName(baseName) {
    const existingNames = new Set(SceneManager.currentScene.getAllMaterias().map(m => m.name));
    if (!existingNames.has(baseName)) return baseName;
    let counter = 1;
    while (existingNames.has(`${baseName} (${counter})`)) counter++;
    return `${baseName} (${counter})`;
}

export function createBaseMateria(name, parent = null, useUITransform = false, addToScene = true) {
    const mtr = new Materia(name);
    mtr.addComponent(useUITransform ? new Components.UITransform(mtr) : new Components.Transform(mtr));
    if (parent) {
        parent.addChild(mtr);
        if (window.childCreationMode === 'global') {
            if (useUITransform) {
                const uiTransform = mtr.getComponent(Components.UITransform);
                if (uiTransform) {
                    uiTransform.position = { x: 0, y: 0 };
                }
            } else {
                const transform = mtr.getComponent(Components.Transform);
                if (transform) {
                    transform.position = { x: 0, y: 0, z: 0 };
                }
            }
        }
    }
    else if (addToScene) SceneManager.currentScene.addMateria(mtr);
    return mtr;
}

export function createCanvasObject() {
    const mtr = createBaseMateria(generateUniqueName('Canvas'));
    mtr.addComponent(new Components.Canvas(mtr));
    return mtr;
}

export function createImageObject(parent) {
    const mtr = new Materia(generateUniqueName('Image'));
    mtr.addComponent(new Components.UITransform(mtr));
    mtr.addComponent(new Components.UIImage(mtr));
    parent.addChild(mtr);
    return mtr;
}

// --- 3D Objects ---

export async function createCubeObject(parent = null, color = '#ffffff') {
    const { createCubeObject: carleyCreateCube } = await import('../carley-world/CarleyMateriaFactory.js');
    return carleyCreateCube(parent, color);
}

export async function createSphereObject(parent = null) {
    const { createSphereObject: carleyCreateSphere } = await import('../carley-world/CarleyMateriaFactory.js');
    return carleyCreateSphere(parent);
}

export async function createTriangle3DObject(parent = null) {
    const { createTriangleObject: carleyCreateTriangle } = await import('../carley-world/CarleyMateriaFactory.js');
    return carleyCreateTriangle(parent);
}

export async function createCapsule3DObject(parent = null) {
    const { createCapsuleObject: carleyCreateCapsule } = await import('../carley-world/CarleyMateriaFactory.js');
    return carleyCreateCapsule(parent);
}

export async function createPlane3DObject(parent = null) {
    const { createPlaneObject: carleyCreatePlane } = await import('../carley-world/CarleyMateriaFactory.js');
    return carleyCreatePlane(parent);
}

export async function createDirectionalLight3D(parent = null) {
    const { createDirectionalLightObject } = await import('../carley-world/CarleyMateriaFactory.js');
    return createDirectionalLightObject(parent);
}

export async function createPointLight3D(parent = null) {
    const { createPointLightObject } = await import('../carley-world/CarleyMateriaFactory.js');
    return createPointLightObject(parent);
}

export async function createSpotLight3D(parent = null) {
    const { createSpotLightObject } = await import('../carley-world/CarleyMateriaFactory.js');
    return createSpotLightObject(parent);
}

export async function createSkinnedMeshObject(modelPath, parent = null, options = {}) {
    const C3D = await ensure3D();
    const { ModelLoader3D } = await import('../engine/ModelLoader3D.js');
    const modelData = await ModelLoader3D.loadModel(modelPath, window.projectsDirHandle);
    if (!modelData) return null;

    // Load metadata if available
    let modelMeta = { animationType: 'generic', avatar: {} };
    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await window.projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');
        const fileName = modelPath.split('/').pop();
        const metaFileHandle = await assetsHandle.getFileHandle(fileName + '.meta');
        const metaFile = await metaFileHandle.getFile();
        modelMeta = JSON.parse(await metaFile.text());
    } catch (e) {}

    const rootName = modelPath.split('/').pop().split('.')[0];
    const rootMateria = createBaseMateria(generateUniqueName(rootName), parent, false, options.addToScene !== false);

    const nodeMaterias = [];

    if (modelData.nodes) {
        for (const node of modelData.nodes) {
            const nodeMtr = new Materia(node.name);
            nodeMtr.addComponent(new Components.Transform(nodeMtr));
            const t = nodeMtr.getComponent(Components.Transform);
            t.localPosition = { x: node.translation[0], y: node.translation[1], z: node.translation[2] };

            // GLTF quaternions are [x, y, z, w]. Our engine currently uses Euler [x, y, z] in Transform.
            // For now, we keep scale. A full quaternion to euler conversion might be needed later.
            t.localScale = { x: node.scale[0], y: node.scale[1], z: node.scale[2] };

            nodeMaterias.push(nodeMtr);
        }

        for (let i = 0; i < modelData.nodes.length; i++) {
            const node = modelData.nodes[i];
            const nodeMtr = nodeMaterias[i];

            if (node.children) {
                node.children.forEach(childIdx => {
                    const childMtr = nodeMaterias[childIdx];
                    childMtr.setParent(nodeMtr, false);
                });
            }

            if (node.mesh !== undefined && !options.onlySkeleton) {
                if (options.meshIndex !== undefined && node.mesh !== options.meshIndex) {
                    // Skip if we only want a specific mesh (single mesh import from sub-assets)
                } else {
                const mesh = modelData.meshes[node.mesh];
                mesh.primitives.forEach((primitive, pIdx) => {
                    // Create a separate Materia for each primitive if there are multiple,
                    // or just use the nodeMtr for the first one.
                    let targetMtr = nodeMtr;
                    if (pIdx > 0) {
                        targetMtr = new Materia(`${node.name}_part${pIdx}`);
                        targetMtr.addComponent(new Components.Transform(targetMtr));
                        targetMtr.setParent(nodeMtr, false);
                    }

                    const renderer = new C3D.SkinnedMeshRenderer3D(targetMtr);
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

                    const modelFolder = modelPath.includes('/') ? modelPath.substring(0, modelPath.lastIndexOf('/') + 1) : 'Assets/';
                    let assignedTex = null;

                    if (primitive.material !== undefined && modelData.materials) {
                        const mat = modelData.materials[primitive.material];
                        if (mat) {
                            if (mat.baseColor) {
                                const r = Math.floor(mat.baseColor[0] * 255).toString(16).padStart(2, '0');
                                const g = Math.floor(mat.baseColor[1] * 255).toString(16).padStart(2, '0');
                                const b = Math.floor(mat.baseColor[2] * 255).toString(16).padStart(2, '0');
                                renderer.color = `#${r}${g}${b}`;
                            }
                            assignedTex = mat.textureUrl || mat.texturePath;
                        }
                    }

                    if (!assignedTex && modelData.materials && modelData.materials.length > 0) {
                        const fallbackMat = modelData.materials.find(m => m.textureUrl || m.texturePath);
                        if (fallbackMat) assignedTex = fallbackMat.textureUrl || fallbackMat.texturePath;
                    }

                    if (assignedTex) {
                        if (!assignedTex.startsWith('Assets/') && !assignedTex.startsWith('blob:') && !assignedTex.startsWith('data:') && !assignedTex.startsWith('http')) {
                            assignedTex = modelFolder + assignedTex.replace(/^\/+/, '');
                        }
                        renderer.texturePath = assignedTex;
                    }

                    renderer.isLoaded = true;
                    targetMtr.addComponent(renderer);
                });
                }
            }
        }
        nodeMaterias.forEach(m => {
            if (!m.parent) {
                m.setParent(rootMateria, false);
            }
        });

        // Center model geometry so rootMateria (0,0,0) is at the exact center of the model's AABB
        try {
            const renderers = [];
            rootMateria.traverse(mtr => {
                const r = mtr.getComponentByName ? (mtr.getComponentByName('SkinnedMeshRenderer3D') || mtr.getComponentByName('MeshRenderer3D')) : null;
                if (r && r.cpuPositions && r.cpuPositions.length > 0) {
                    renderers.push({ mtr, renderer: r });
                }
            });

            if (renderers.length > 0 && window.glMatrix) {
                const updateHierarchyWorldMatrices = (m) => {
                    const t = m.getComponent(Components.Transform);
                    if (t) {
                        const glm = window.glMatrix;
                        const translationMat = glm.mat4.create();
                        const rotationMat = glm.mat4.create();
                        const scaleMat = glm.mat4.create();

                        glm.mat4.fromTranslation(translationMat, [t.localPosition.x || 0, t.localPosition.y || 0, t.localPosition.z || 0]);
                        const q = glm.quat.create();
                        glm.quat.fromEuler(q, t.localRotation.x || 0, t.localRotation.y || 0, t.localRotation.z || 0);
                        glm.mat4.fromQuat(rotationMat, q);
                        glm.mat4.fromScaling(scaleMat, [t.localScale.x || 1, t.localScale.y || 1, t.localScale.z || 1]);

                        const localMat = glm.mat4.create();
                        glm.mat4.multiply(localMat, translationMat, rotationMat);
                        glm.mat4.multiply(localMat, localMat, scaleMat);

                        if (m.parent) {
                            const pt = m.parent.getComponent(Components.Transform);
                            if (pt && pt.worldMatrix) {
                                glm.mat4.multiply(t.worldMatrix, pt.worldMatrix, localMat);
                            } else {
                                glm.mat4.copy(t.worldMatrix, localMat);
                            }
                        } else {
                            glm.mat4.copy(t.worldMatrix, localMat);
                        }
                    }
                    if (m.children) m.children.forEach(updateHierarchyWorldMatrices);
                };

                updateHierarchyWorldMatrices(rootMateria);

                const rootTransform = rootMateria.getComponent(Components.Transform);
                const rootWorldMat = rootTransform ? rootTransform.worldMatrix : window.glMatrix.mat4.create();
                const rootWorldInv = window.glMatrix.mat4.create();
                window.glMatrix.mat4.invert(rootWorldInv, rootWorldMat);

                let minX = Infinity, minY = Infinity, minZ = Infinity;
                let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

                for (const { mtr, renderer } of renderers) {
                    const t = mtr.getComponent(Components.Transform);
                    const mtrWorldMat = t ? t.worldMatrix : rootWorldMat;
                    const relMatrix = window.glMatrix.mat4.create();
                    window.glMatrix.mat4.multiply(relMatrix, rootWorldInv, mtrWorldMat);

                    const pos = renderer.cpuPositions;
                    for (let i = 0; i < pos.length; i += 3) {
                        const vx = pos[i], vy = pos[i + 1], vz = pos[i + 2];
                        const rx = relMatrix[0] * vx + relMatrix[4] * vy + relMatrix[8] * vz + relMatrix[12];
                        const ry = relMatrix[1] * vx + relMatrix[5] * vy + relMatrix[9] * vz + relMatrix[13];
                        const rz = relMatrix[2] * vx + relMatrix[6] * vy + relMatrix[10] * vz + relMatrix[14];

                        if (rx < minX) minX = rx; if (rx > maxX) maxX = rx;
                        if (ry < minY) minY = ry; if (ry > maxY) maxY = ry;
                        if (rz < minZ) minZ = rz; if (rz > maxZ) maxZ = rz;
                    }
                }

                if (minX !== Infinity) {
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;
                    const centerZ = (minZ + maxZ) / 2;

                    if (Math.abs(centerX) > 0.01 || Math.abs(centerY) > 0.01 || Math.abs(centerZ) > 0.01) {
                        for (const { mtr, renderer } of renderers) {
                            const t = mtr.getComponent(Components.Transform);
                            const mtrWorldMat = t ? t.worldMatrix : rootWorldMat;
                            const relMatrix = window.glMatrix.mat4.create();
                            window.glMatrix.mat4.multiply(relMatrix, rootWorldInv, mtrWorldMat);
                            const relInv = window.glMatrix.mat4.create();
                            window.glMatrix.mat4.invert(relInv, relMatrix);

                            const localOffsetX = relInv[0] * centerX + relInv[4] * centerY + relInv[8] * centerZ + relInv[12];
                            const localOffsetY = relInv[1] * centerX + relInv[5] * centerY + relInv[9] * centerZ + relInv[13];
                            const localOffsetZ = relInv[2] * centerX + relInv[6] * centerY + relInv[10] * centerZ + relInv[14];

                            const pos = renderer.cpuPositions;
                            for (let i = 0; i < pos.length; i += 3) {
                                pos[i] -= localOffsetX;
                                pos[i + 1] -= localOffsetY;
                                pos[i + 2] -= localOffsetZ;
                            }
                        }
                    }
                }
            }

            const { getAABB3D } = await import("../engine/MathUtils.js");
            const aabb = getAABB3D(rootMateria);
            if (aabb && aabb.size) {
                const maxDim = Math.max(aabb.size.x, aabb.size.y, aabb.size.z);
                if (maxDim > 100) {
                    const scaleFactor = 10 / maxDim;
                    const rootTransform = rootMateria.getComponent(Components.Transform);
                    if (rootTransform) {
                        rootTransform.localScale = { x: scaleFactor, y: scaleFactor, z: scaleFactor };
                    }
                } else if (maxDim < 0.05 && maxDim > 0) {
                    const scaleFactor = 2.0 / maxDim;
                    const rootTransform = rootMateria.getComponent(Components.Transform);
                    if (rootTransform) {
                        rootTransform.localScale = { x: scaleFactor, y: scaleFactor, z: scaleFactor };
                    }
                }
            }
        } catch (e) {
            console.warn('[MateriaFactory] Failed to center 3D model geometry:', e);
        }
    } else {
        const renderer = new C3D.SkinnedMeshRenderer3D(rootMateria);
        renderer.modelPath = modelPath;
        renderer.cpuPositions = modelData.positions;
        renderer.cpuNormals = modelData.normals;
        renderer.cpuUVs = modelData.uvs;
        renderer.cpuIndices = modelData.indices;
        renderer.indexCount = modelData.indices ? modelData.indices.length : modelData.positions.length / 3;
        renderer.isLoaded = true;
        rootMateria.addComponent(renderer);
    }

    if (modelData.animations?.length > 0) {
        const animator = new C3D.Animator3D(rootMateria);
        animator.animations = modelData.animations.map(a => ({ ...a, channels: a.channels.map(c => ({ ...c, node: nodeMaterias[c.node]?.id || rootMateria.id })) }));
        rootMateria.addComponent(animator);
        animator.play();
    }
    return rootMateria;
}

export function createScrollViewObject(parent) {
    if (!parent) return null;
    const mtr = createBaseMateria(generateUniqueName('Scroll View'), parent, true);
    mtr.getComponent(Components.UITransform).size = { width: 300, height: 400 };
    mtr.addComponent(new Components.UIImage(mtr));
    mtr.addComponent(new Components.UIMask(mtr));
    mtr.addComponent(new Components.UIScrollRect(mtr));
    return mtr;
}

export function createProgressBarObject(parent) {
    if (!parent) return null;
    const mtr = createBaseMateria(generateUniqueName('ProgressBar'), parent, true);
    mtr.addComponent(new Components.UIImage(mtr));
    mtr.addComponent(new Components.ProgressBar(mtr));
    return mtr;
}

export function createCombatantObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Combatiente'), parent);
    mtr.addComponent(new Components.SpriteRenderer(mtr));
    mtr.addComponent(new Components.Rigidbody2D(mtr));
    mtr.addComponent(new Components.BoxCollider2D(mtr));
    mtr.addComponent(new Components.Health(mtr));
    mtr.addComponent(new Components.Attack(mtr));
    return mtr;
}

export function createAudioObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Audio'), parent);
    mtr.addComponent(new Components.AudioSource(mtr));
    return mtr;
}

export function createVideoObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Video'), parent);
    mtr.addComponent(new Components.VideoPlayer(mtr));
    return mtr;
}

export function createWaterObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Agua'), parent);
    mtr.tag = 'Agua'; mtr.layer = 4;
    mtr.addComponent(new Components.Water(mtr));
    return mtr;
}

export function createLineColliderObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Colisionador de Líneas'), parent);
    mtr.addComponent(new Components.LineCollider2D(mtr));
    return mtr;
}

export function createTerrenoObject(parent = null) {
    const mtr = createBaseMateria(generateUniqueName('Terreno'), parent);
    mtr.addComponent(new Components.Terreno2D(mtr));
    return mtr;
}

export async function createTerreno3DObject(parent = null) {
    const C3D = await ensure3D();
    const mtr = createBaseMateria(generateUniqueName('Terreno 3D'), parent);
    const terrain = new C3D.Terreno3D(mtr);
    terrain.color = '#3d5c2e'; // Grass green
    mtr.addComponent(terrain);
    mtr.addComponent(new C3D.TerrenoCollider3D(mtr));
    return mtr;
}

export function createTextObject(parent) {
    if (!parent) return null;
    const mtr = createBaseMateria(generateUniqueName('Texto'), parent, true);
    mtr.addComponent(new Components.UIText(mtr));
    return mtr;
}

export function createButtonObject(parent) {
    if (!parent) return null;
    const mtr = createBaseMateria(generateUniqueName('Button'), parent, true);
    mtr.addComponent(new Components.UIImage(mtr));
    mtr.addComponent(new Components.Button(mtr));
    return mtr;
}

export function createPanelObject(parent) {
    if (!parent) return null;
    const mtr = createBaseMateria(generateUniqueName('Panel'), parent, true);
    mtr.addComponent(new Components.UIImage(mtr));
    return mtr;
}

export function getOrCreateCanvas() {
    const allMaterias = SceneManager.currentScene.getAllMaterias();
    const existingCanvas = allMaterias.find(m => m.getComponent(Components.Canvas));
    if (existingCanvas) return existingCanvas;
    return createCanvasObject();
}

export function createMovementUITemplate() {
    const canvas = getOrCreateCanvas();
    const group = createBaseMateria(generateUniqueName('Control de Movimiento'), canvas, true);
    group.getComponent(Components.UITransform).anchorPreset = 'stretch-stretch';
    const joyArea = createPanelObject(group); joyArea.name = "JoystickArea";
    const controller = new Components.UIController(joyArea);
    controller.type = 'Joystick'; joyArea.addComponent(controller);
    return group;
}

export function createMainMenuTemplate() {
    const canvas = getOrCreateCanvas();
    const menu = createPanelObject(canvas); menu.name = "MenuPrincipal";
    return menu;
}

export function createLevelManagerTemplate() {
    const manager = createBaseMateria(generateUniqueName('GestorNiveles'));
    manager.addComponent(new Components.BoxCollider2D(manager));
    manager.getComponent(Components.BoxCollider2D).isTrigger = true;
    manager.tag = "Finish";
    return manager;
}

export function createInventoryUITemplate() {
    const canvas = getOrCreateCanvas();
    const invPanel = createPanelObject(canvas); invPanel.name = "PanelInventario";
    return invPanel;
}

export async function createDefaultCharacter(parent = null) {
    const C3D = await ensure3D();
    const root = createBaseMateria('Personaje Humanoide', parent);
    const transform = root.getComponent(Components.Transform);
    transform.position = { x: 0, y: 90, z: 0 };

    const hip = createBaseMateria('Cadera', root);
    const torso = createBaseMateria('Torso', hip);
    torso.getComponent(Components.Transform).localPosition = { x: 0, y: 30, z: 0 };
    const neck = createBaseMateria('Cuello', torso);
    neck.getComponent(Components.Transform).localPosition = { x: 0, y: 35, z: 0 };
    const head = createBaseMateria('Cabeza', neck);
    head.getComponent(Components.Transform).localPosition = { x: 0, y: 15, z: 0 };
    const eyeL = createBaseMateria('Ojo_I', head); eyeL.getComponent(Components.Transform).localPosition = { x: -8, y: 5, z: 12 };
    const eyeR = createBaseMateria('Ojo_D', head); eyeR.getComponent(Components.Transform).localPosition = { x: 8, y: 5, z: 12 };
    const armL = createBaseMateria('Brazo_I', torso); armL.getComponent(Components.Transform).localPosition = { x: -30, y: 5, z: 0 };
    const handL = createBaseMateria('Mano_I', armL); handL.getComponent(Components.Transform).localPosition = { x: 0, y: -45, z: 0 };
    const armR = createBaseMateria('Brazo_D', torso); armR.getComponent(Components.Transform).localPosition = { x: 30, y: 5, z: 0 };
    const handR = createBaseMateria('Mano_D', armR); handR.getComponent(Components.Transform).localPosition = { x: 0, y: -45, z: 0 };
    const legL = createBaseMateria('Pierna_I', hip); legL.getComponent(Components.Transform).localPosition = { x: -15, y: -10, z: 0 };
    const footL = createBaseMateria('Pie_I', legL); footL.getComponent(Components.Transform).localPosition = { x: 0, y: -80, z: 0 };
    const legR = createBaseMateria('Pierna_D', hip); legR.getComponent(Components.Transform).localPosition = { x: 15, y: -10, z: 0 };
    const footR = createBaseMateria('Pie_D', legR); footR.getComponent(Components.Transform).localPosition = { x: 0, y: -80, z: 0 };

    const jointsOrder = [hip, torso, neck, head, eyeL, eyeR, armL, handL, armR, handR, legL, footL, legR, footR];
    const meshData = { positions: [], normals: [], colors: [], joints: [], weights: [], indices: [] };

    const hexToRgb01 = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
    };

    const addBox = (pos, size, boneIdx, colorHex = null) => {
        const hw = size.x/2, hh = size.y/2, hd = size.z/2, start = meshData.positions.length/3;

        // Ensure we are using the absolute world position for vertices at bind pose
        const px = pos.x, py = pos.y, pz = pos.z;

        // Vertices for each face to have unique normals (no shared vertices between faces)
        const v = [
            // Front
            -hw, -hh, hd,  hw, -hh, hd,  hw,  hh, hd, -hw,  hh, hd,
            // Back
            -hw, -hh, -hd, -hw,  hh, -hd,  hw,  hh, -hd,  hw, -hh, -hd,
            // Top
            -hw,  hh, -hd, -hw,  hh,  hd,  hw,  hh,  hd,  hw,  hh, -hd,
            // Bottom
            -hw, -hh, -hd,  hw, -hh, -hd,  hw, -hh,  hd, -hw, -hh,  hd,
            // Right
             hw, -hh, -hd,  hw,  hh, -hd,  hw,  hh,  hd,  hw, -hh,  hd,
            // Left
            -hw, -hh, -hd, -hw, -hh,  hd, -hw,  hh,  hd, -hw,  hh, -hd
        ];

        const normals = [
            0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
        ];

        for(let i=0; i<v.length; i+=3) {
            meshData.positions.push(v[i]+pos.x, v[i+1]+pos.y, v[i+2]+pos.z);
            meshData.normals.push(normals[i], normals[i+1], normals[i+2]);
            meshData.joints.push(boneIdx,0,0,0); meshData.weights.push(1,0,0,0);
        }

        const faceIndices = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11, 12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23];
        faceIndices.forEach(i => meshData.indices.push(i+start));

        const rgb = colorHex ? hexToRgb01(colorHex) : [0,0,0];
        const alpha = colorHex ? 1.0 : 0.0;
        for(let i=0; i<v.length/3; i++) {
            meshData.colors.push(rgb[0], rgb[1], rgb[2], alpha);
        }
    };

    const skin = '#ffdbac';
    const shirt = '#3498db';
    const pants = '#2c3e50';
    const white = '#ffffff';

    // Helper to get world position of a joint for vertex alignment
    const getJointWorldPos = (joint) => {
        const pos = joint.getComponent(Components.Transform).position;
        return pos;
    };

    // Hip
    addBox(getJointWorldPos(hip), {x:35, y:25, z:20}, 0, pants);
    // Torso
    addBox(getJointWorldPos(torso), {x:40, y:45, z:25}, 1, shirt);
    // Neck & Head
    addBox(getJointWorldPos(neck), {x:12, y:25, z:12}, 2, skin);
    addBox(getJointWorldPos(head), {x:25, y:25, z:25}, 3, skin);
    // Eyes
    addBox(getJointWorldPos(eyeL), {x:5, y:5, z:5}, 4, white);
    addBox(getJointWorldPos(eyeR), {x:5, y:5, z:5}, 5, white);
    // Arms
    addBox(getJointWorldPos(armL), {x:12, y:45, z:12}, 6, shirt);
    addBox(getJointWorldPos(handL), {x:10, y:12, z:12}, 7, skin);
    addBox(getJointWorldPos(armR), {x:12, y:45, z:12}, 8, shirt);
    addBox(getJointWorldPos(handR), {x:10, y:12, z:12}, 9, skin);
    // Legs
    addBox(getJointWorldPos(legL), {x:16, y:60, z:16}, 10, pants);
    addBox(getJointWorldPos(footL), {x:18, y:10, z:28}, 11, pants);
    addBox(getJointWorldPos(legR), {x:16, y:60, z:16}, 12, pants);
    addBox(getJointWorldPos(footR), {x:18, y:10, z:28}, 13, pants);

    const renderer = new C3D.SkinnedMeshRenderer3D(root);
    renderer.color = skin;
    renderer.cpuPositions = new Float32Array(meshData.positions);
    renderer.cpuNormals = new Float32Array(meshData.normals);
    renderer.cpuColors = new Float32Array(meshData.colors);
    renderer.cpuIndices = new Uint16Array(meshData.indices);
    renderer.cpuJoints = new Float32Array(meshData.joints);
    renderer.cpuWeights = new Float32Array(meshData.weights);
    renderer.indexCount = meshData.indices.length;
    renderer.skeleton = { joints: jointsOrder.map(m => m.id), inverseBindMatrices: new Float32Array(jointsOrder.length * 16) };

    // --- Skeleton Normalization ---
    // World matrices are calculated lazily via the 'worldMatrix' getter, which handles
    // hierarchy recursion. We simply invert them to get the InverseBindMatrices.
    const glm = window.glMatrix;
    jointsOrder.forEach((m, i) => {
        const t = m.getComponent(Components.Transform);
        const inv = glm.mat4.create();
        // Accessing the worldMatrix getter triggers the necessary calculations
        glm.mat4.invert(inv, t.worldMatrix);
        renderer.skeleton.inverseBindMatrices.set(inv, i * 16);
    });
    renderer.isLoaded = true;
    root.addComponent(renderer);
    root.addComponent(new C3D.Rigidbody3D(root));
    const rb = root.getComponent(C3D.Rigidbody3D); rb.drag = 0.05; rb.angularDrag = 0.1;
    root.addComponent(new C3D.BoxCollider3D(root));
    root.getComponent(C3D.BoxCollider3D).size = { x: 45, y: 190, z: 45 };
    root.addComponent(new C3D.HumanoidPhysics3D(root));
    root.addComponent(new C3D.ThirdPersonController3D(root));
    root.addComponent(new C3D.HealthController3D(root));
    root.addComponent(new C3D.MovementControl3D(root));

    const camMtr = createBaseMateria('Camara_3ra_Persona', root);
    camMtr.getComponent(Components.Transform).localPosition = { x: 0, y: 150, z: 450 };
    camMtr.addComponent(new Components.Camera(camMtr));
    const cam = camMtr.getComponent(Components.Camera);
    cam.projection = 'Perspective';
    cam.fov = 65;
    cam.clearFlags = 'Skybox';
    camMtr.addComponent(new C3D.CameraControl3D(camMtr));
    return root;
}

export async function createAdvancedVehicle(parent = null) {
    const C3D = await ensure3D();
    const root = createBaseMateria('Vehiculo_Pro', parent);
    const rb = new C3D.Rigidbody3D(root);
    rb.mass = 1500;
    root.addComponent(rb);
    root.addComponent(new C3D.BoxCollider3D(root));
    root.getComponent(C3D.BoxCollider3D).size = { x: 220, y: 100, z: 450 };

    const body = await createCubeObject(root, '#e74c3c');
    body.name = 'Carroceria';
    body.getComponent(Components.Transform).localScale = { x: 220, y: 90, z: 450 };

    const wheelNames = ['Rueda_Frontal_Izquierda', 'Rueda_Frontal_Derecha', 'Rueda_Trasera_Izquierda', 'Rueda_Trasera_Derecha'];
    const wheelPositions = [
        { x: -120, y: -50, z: -160 }, { x: 120, y: -50, z: -160 },
        { x: -120, y: -50, z: 160 }, { x: 120, y: -50, z: 160 }
    ];

    const wheelIds = [];
    for (let i = 0; i < 4; i++) {
        const wheel = await createSphereObject(root);
        wheel.name = wheelNames[i];
        const t = wheel.getComponent(Components.Transform);
        t.localPosition = wheelPositions[i];
        t.localScale = { x: 60, y: 60, z: 60 };

        const wheelCol = new C3D.WheelCollider3D(wheel);
        wheelCol.radius = 30;
        wheelCol.suspensionDistance = 40;
        wheelCol.suspensionStiffness = 60;
        wheel.addComponent(wheelCol);
        wheelIds.push(wheel.id);
    }

    const controller = new C3D.VehicleController3D(root);
    controller.wheels = wheelIds;
    controller.motorForce = 2000;
    controller.driftIntensity = 0.6;
    root.addComponent(controller);

    return root;
}

export async function createVehicleTemplate(parent = null) {
    const C3D = await ensure3D();
    const root = createBaseMateria('Vehículo', parent);
    const rb = new C3D.Rigidbody3D(root);
    rb.mass = 1200;
    root.addComponent(rb);
    root.addComponent(new C3D.BoxCollider3D(root));
    root.getComponent(C3D.BoxCollider3D).size = { x: 200, y: 100, z: 400 };

    const body = await createCubeObject(root, '#3498db');
    body.name = 'Chasis';
    body.getComponent(Components.Transform).localScale = { x: 200, y: 80, z: 400 };

    const wheelNames = ['Rueda_DI', 'Rueda_DD', 'Rueda_TI', 'Rueda_TD'];
    const wheelPositions = [
        { x: -110, y: -40, z: -150 }, { x: 110, y: -40, z: -150 },
        { x: -110, y: -40, z: 150 }, { x: 110, y: -40, z: 150 }
    ];

    for (let i = 0; i < 4; i++) {
        const wheel = await createSphereObject(root);
        wheel.name = wheelNames[i];
        const t = wheel.getComponent(Components.Transform);
        t.localPosition = wheelPositions[i];
        t.localScale = { x: 40, y: 40, z: 40 };
    }

    return root;
}

export async function createTestCircuit(parent = null) {
    const C3D = await ensure3D();
    const root = createBaseMateria('Circuito_Industrial_Pro', parent);

    // Colors
    const industrialBlue = '#2c3e50';
    const darkMetal = '#1a1a1a';
    const lightMetal = '#95a5a6';
    const safetyYellow = '#f1c40f';
    const accentOrange = '#e67e22';
    const neonCyan = '#00f2ff';
    const neonRed = '#ff3e3e';

    // --- 1. Base Gran Plataforma ---
    const ground = await createPlane3DObject(root);
    ground.getComponent(Components.Transform).localScale = { x: 10000, y: 1, z: 10000 };
    ground.getComponent(C3D.MeshRenderer3D).color = '#0d0d0f';

    // --- 2. Pista Refinada con Bordes de Seguridad ---
    const track = await createPlane3DObject(root);
    track.getComponent(Components.Transform).localPosition = { x: 0, y: 2, z: 0 };
    track.getComponent(Components.Transform).localScale = { x: 800, y: 1, z: 8000 };
    track.getComponent(C3D.MeshRenderer3D).color = darkMetal;

    // Bordes amarillos (Caution Stripes effect)
    const leftBorder = await createCubeObject(root, safetyYellow);
    leftBorder.getComponent(Components.Transform).localPosition = { x: -410, y: 5, z: 0 };
    leftBorder.getComponent(Components.Transform).localScale = { x: 20, y: 10, z: 8000 };

    const rightBorder = await createCubeObject(root, safetyYellow);
    rightBorder.getComponent(Components.Transform).localPosition = { x: 410, y: 5, z: 0 };
    rightBorder.getComponent(Components.Transform).localScale = { x: 20, y: 10, z: 8000 };

    // --- 3. Tuberías Industriales ---
    const createPipe = async (pos, rot, scale, color = '#7f8c8d') => {
        const pipe = await createCapsule3DObject(root);
        pipe.name = "Tuberia_Industrial";
        const t = pipe.getComponent(Components.Transform);
        t.localPosition = pos;
        t.localRotation = rot;
        t.localScale = scale;
        pipe.getComponent(C3D.MeshRenderer3D).color = color;
        return pipe;
    };

    await createPipe({x: 500, y: 100, z: 500}, {x: 90, y: 0, z: 0}, {x: 40, y: 1000, z: 40});
    await createPipe({x: -500, y: 100, z: 1500}, {x: 90, y: 0, z: 0}, {x: 40, y: 1500, z: 40});
    await createPipe({x: 0, y: 400, z: 2500}, {x: 0, y: 0, z: 90}, {x: 30, y: 1200, z: 30});
    await createPipe({x: 450, y: 300, z: 1200}, {x: 0, y: 0, z: 45}, {x: 20, y: 800, z: 20}, neonCyan);

    // --- 4. Escalera Metálica ---
    for (let i = 0; i < 10; i++) {
        const step = await createCubeObject(root, i % 2 === 0 ? darkMetal : lightMetal);
        const t = step.getComponent(Components.Transform);
        t.localPosition = { x: -300, y: i * 25, z: 1000 + i * 80 };
        t.localScale = { x: 250, y: 15, z: 80 };
        step.addComponent(new C3D.BoxCollider3D(step));
    }

    // --- 5. Estación de Energía (Obstáculo Complejo) ---
    const station = createBaseMateria("Estacion_Energia", root);
    station.getComponent(Components.Transform).localPosition = { x: 0, y: 150, z: 3000 };

    const core = await createCubeObject(station, '#3498db');
    core.getComponent(Components.Transform).localScale = { x: 200, y: 300, z: 200 };
    core.addComponent(new C3D.BoxCollider3D(core));

    const light = await createPointLight3D(station);
    light.getComponent(Components.Transform).localPosition = { x: 0, y: 350, z: 0 };
    const pLight = light.getComponent(C3D.PointLight3D);
    pLight.color = neonCyan; pLight.intensity = 2.0; pLight.radius = 800;

    // --- 6. Rampa de Salto con Neones ---
    const ramp = await createCubeObject(root, industrialBlue);
    const rt = ramp.getComponent(Components.Transform);
    rt.localPosition = { x: 250, y: 50, z: 4500 };
    rt.localScale = { x: 400, y: 20, z: 1000 };
    rt.localRotation = { x: 20, y: 0, z: 0 }; // Flipped rotation for +Y UP
    ramp.addComponent(new C3D.BoxCollider3D(ramp));

    const neon = await createCubeObject(ramp, neonRed);
    neon.getComponent(Components.Transform).localPosition = { x: 0, y: 15, z: 0 };
    neon.getComponent(Components.Transform).localScale = { x: 380, y: 5, z: 980 };
    neon.getComponent(C3D.MeshRenderer3D).isUnlit = true;

    // --- 7. Plataformas de Vértigo (Flotantes) ---
    for (let i = 0; i < 5; i++) {
        const plat = await createCubeObject(root, i === 4 ? safetyYellow : darkMetal);
        const pt = plat.getComponent(Components.Transform);
        pt.localPosition = { x: Math.cos(i) * 500, y: 400 + i * 50, z: 6000 + i * 600 };
        pt.localScale = { x: 300, y: 30, z: 300 };
        plat.addComponent(new C3D.BoxCollider3D(plat));

        // Add a support pillar visual
        const support = await createCubeObject(plat, '#333333');
        support.getComponent(Components.Transform).localPosition = { x: 0, y: -1000, z: 0 };
        support.getComponent(Components.Transform).localScale = { x: 0.1, y: 100, z: 0.1 };
    }

    // --- 8. Túnel de Neón ---
    const tunnelRoot = createBaseMateria("Tunel_Neon", root);
    tunnelRoot.getComponent(Components.Transform).localPosition = { x: 0, y: 100, z: 7500 };
    for(let i=0; i<8; i++) {
        const ring = createBaseMateria(`Anillo_${i}`, tunnelRoot);
        ring.getComponent(Components.Transform).localPosition = { x: 0, y: 0, z: i * 300 };

        const sideL = await createCubeObject(ring, '#2980b9');
        sideL.getComponent(Components.Transform).localPosition = { x: -400, y: 150, z: 0 };
        sideL.getComponent(Components.Transform).localScale = { x: 20, y: 400, z: 20 };

        const sideR = await createCubeObject(ring, '#2980b9');
        sideR.getComponent(Components.Transform).localPosition = { x: 400, y: 150, z: 0 };
        sideR.getComponent(Components.Transform).localScale = { x: 20, y: 400, z: 20 };

        const top = await createCubeObject(ring, neonCyan);
        top.getComponent(Components.Transform).localPosition = { x: 0, y: 350, z: 0 };
        top.getComponent(Components.Transform).localScale = { x: 800, y: 15, z: 15 };
        top.getComponent(C3D.MeshRenderer3D).isUnlit = true;
    }

    // --- 9. Meta Tecnológica ---
    const goal = await createBaseMateria("Meta_Final", root);
    goal.getComponent(Components.Transform).localPosition = { x: 0, y: 100, z: 10500 };

    const archL = await createCubeObject(goal, lightMetal);
    archL.getComponent(Components.Transform).localPosition = { x: -400, y: 200, z: 0 };
    archL.getComponent(Components.Transform).localScale = { x: 50, y: 600, z: 50 };

    const archR = await createCubeObject(goal, lightMetal);
    archR.getComponent(Components.Transform).localPosition = { x: 400, y: 200, z: 0 };
    archR.getComponent(Components.Transform).localScale = { x: 50, y: 600, z: 50 };

    const archTop = await createCubeObject(goal, safetyYellow);
    archTop.getComponent(Components.Transform).localPosition = { x: 0, y: 500, z: 0 };
    archTop.getComponent(Components.Transform).localScale = { x: 850, y: 60, z: 120 };

    return root;
}
