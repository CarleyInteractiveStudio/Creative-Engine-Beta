// js/engine/CMModelConverter.js
/**
 * CMModelConverter - Converts .gltf, .glb, and Waveform .obj 3D assets into native Carley Model (.cm) format,
 * extracting companion textures, .mtl materials, and .cea3d animation clips while normalizing Blender orientations.
 */

export class CMModelConverter {
    /**
     * Converts a GLTF/GLB or OBJ File/ArrayBuffer into a Carley Model (.cm) structure.
     * @param {File|Blob|ArrayBuffer} fileData
     * @param {string} fileName
     * @param {number} reductionRatio - Target polygon ratio (0.25 to 1.0)
     * @param {boolean} normalizeBlender - Whether to transform Z-Up to Y-Up
     * @param {string|null} mtlText - Companion .mtl material text for .obj files
     * @returns {Promise<{ cmData: object, textures: Array<{ name: string, blob: Blob }>, animations: Array<{ name: string, data: object }> }>}
     */
    static async convertGLTFToCM(fileData, fileName = 'model.glb', reductionRatio = 1.0, normalizeBlender = true, mtlText = null) {
        let buffer;
        if (fileData instanceof ArrayBuffer) {
            buffer = fileData;
        } else if (fileData.arrayBuffer) {
            buffer = await fileData.arrayBuffer();
        } else {
            throw new Error("Formato de datos no soportado para la conversión 3D.");
        }

        const lowerName = fileName.toLowerCase();

        // Handle OBJ Files (.obj)
        if (lowerName.endsWith('.obj')) {
            const decoder = new TextDecoder('utf-8');
            const objText = decoder.decode(buffer);
            return this.convertOBJToCM(objText, fileName, reductionRatio, normalizeBlender, mtlText);
        }

        const isGLB = lowerName.endsWith('.glb') || this._isGLBHeader(buffer);
        let gltfJson = null;
        let binaryChunk = null;

        if (isGLB) {
            const parsed = this._parseGLB(buffer);
            gltfJson = parsed.json;
            binaryChunk = parsed.binaryChunk;
        } else {
            const decoder = new TextDecoder('utf-8');
            gltfJson = JSON.parse(decoder.decode(buffer));
        }

        const textures = [];
        const animations = [];

        // 1. Process Embedded/Binary Textures
        if (gltfJson.images) {
            for (let i = 0; i < gltfJson.images.length; i++) {
                const img = gltfJson.images[i];
                if (img.bufferView !== undefined && binaryChunk) {
                    const bv = gltfJson.bufferViews[img.bufferView];
                    const byteOffset = (bv.byteOffset || 0);
                    const byteLength = bv.byteLength;
                    const imgData = binaryChunk.slice(byteOffset, byteOffset + byteLength);
                    const mimeType = img.mimeType || 'image/png';
                    const blob = new Blob([imgData], { type: mimeType });
                    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
                    const texName = img.name ? `${img.name}.${ext}` : `${fileName.split('.')[0]}_tex_${i}.${ext}`;
                    textures.push({ name: texName, blob, mimeType });
                }
            }
        }

        // 2. Extract Meshes and Primitives
        const cmMeshes = [];
        if (gltfJson.meshes) {
            for (let mIdx = 0; mIdx < gltfJson.meshes.length; mIdx++) {
                const mesh = gltfJson.meshes[mIdx];
                const cmPrimitives = [];

                for (const primitive of mesh.primitives) {
                    const positions = this._getAccessorData(gltfJson, primitive.attributes.POSITION, binaryChunk);
                    const normals = primitive.attributes.NORMAL !== undefined ?
                        this._getAccessorData(gltfJson, primitive.attributes.NORMAL, binaryChunk) : null;
                    const uvs = primitive.attributes.TEXCOORD_0 !== undefined ?
                        this._getAccessorData(gltfJson, primitive.attributes.TEXCOORD_0, binaryChunk) : null;
                    const indices = primitive.indices !== undefined ?
                        this._getAccessorData(gltfJson, primitive.indices, binaryChunk) : null;
                    const joints = primitive.attributes.JOINTS_0 !== undefined ?
                        this._getAccessorData(gltfJson, primitive.attributes.JOINTS_0, binaryChunk) : null;
                    const weights = primitive.attributes.WEIGHTS_0 !== undefined ?
                        this._getAccessorData(gltfJson, primitive.attributes.WEIGHTS_0, binaryChunk) : null;

                    if (normalizeBlender) {
                        this._normalizeCoordinates(positions, normals);
                    }

                    let primPositions = Array.from(positions || []);
                    let primNormals = normals ? Array.from(normals) : null;
                    let primUvs = uvs ? Array.from(uvs) : null;
                    let primIndices = indices ? Array.from(indices) : null;

                    // Apply Polygon Decimation / Reduction if ratio < 1.0
                    if (reductionRatio < 0.98 && primIndices && primIndices.length > 12) {
                        const decimated = this._decimateMesh(primPositions, primNormals, primUvs, primIndices, reductionRatio);
                        primPositions = decimated.positions;
                        primNormals = decimated.normals;
                        primUvs = decimated.uvs;
                        primIndices = decimated.indices;
                    }

                    cmPrimitives.push({
                        positions: primPositions,
                        normals: primNormals,
                        uvs: primUvs,
                        indices: primIndices,
                        joints: joints ? Array.from(joints) : null,
                        weights: weights ? Array.from(weights) : null,
                        materialIndex: primitive.material !== undefined ? primitive.material : 0
                    });
                }

                cmMeshes.push({
                    name: mesh.name || `Mesh_${mIdx}`,
                    primitives: cmPrimitives
                });
            }
        }

        // 3. Extract Hierarchy Nodes
        const cmNodes = [];
        if (gltfJson.nodes) {
            for (let i = 0; i < gltfJson.nodes.length; i++) {
                const node = gltfJson.nodes[i];
                let translation = node.translation || [0, 0, 0];
                let scale = node.scale || [1, 1, 1];
                let rotation = node.rotation || [0, 0, 0, 1];

                translation = [translation[0], translation[1], translation[2]];

                cmNodes.push({
                    id: i,
                    name: node.name || `Node_${i}`,
                    translation,
                    scale,
                    rotation,
                    mesh: node.mesh,
                    skin: node.skin,
                    children: node.children || []
                });
            }
        }

        // 4. Extract Materials
        const cmMaterials = [];
        if (gltfJson.materials) {
            for (let i = 0; i < gltfJson.materials.length; i++) {
                const mat = gltfJson.materials[i];
                const pbr = mat.pbrMetallicRoughness || {};
                let texName = null;

                if (pbr.baseColorTexture !== undefined && gltfJson.textures) {
                    const texInfo = gltfJson.textures[pbr.baseColorTexture.index];
                    if (texInfo && texInfo.source !== undefined && textures[texInfo.source]) {
                        texName = textures[texInfo.source].name;
                    }
                }

                cmMaterials.push({
                    name: mat.name || `Material_${i}`,
                    baseColor: pbr.baseColorFactor || [1, 1, 1, 1],
                    texturePath: texName
                });
            }
        }

        // 5. Extract Animations into .cea3d clips
        if (gltfJson.animations) {
            for (let i = 0; i < gltfJson.animations.length; i++) {
                const anim = gltfJson.animations[i];
                const animName = anim.name ? `${anim.name}.cea3d` : `${fileName.split('.')[0]}_anim_${i}.cea3d`;
                const channels = [];

                for (const channel of anim.channels) {
                    const sampler = anim.samplers[channel.sampler];
                    const inputData = this._getAccessorData(gltfJson, sampler.input, binaryChunk);
                    const outputData = this._getAccessorData(gltfJson, sampler.output, binaryChunk);

                    channels.push({
                        node: channel.target.node,
                        path: channel.target.path,
                        times: Array.from(inputData || []),
                        values: Array.from(outputData || []),
                        interpolation: sampler.interpolation || 'LINEAR'
                    });
                }

                animations.push({
                    name: animName,
                    data: {
                        name: anim.name || `Anim_${i}`,
                        duration: channels.reduce((max, c) => Math.max(max, c.times[c.times.length - 1] || 0), 0),
                        channels: channels
                    }
                });
            }
        }

        // Apply global pivot centering across entire model hierarchy (not per sub-mesh)
        this._centerGlobalModelPivot(cmMeshes);

        const cmData = {
            formatVersion: '1.0',
            generator: 'Carley Engine CM Converter',
            originalFileName: fileName,
            polyReductionRatio: reductionRatio,
            nodes: cmNodes,
            meshes: cmMeshes,
            materials: cmMaterials,
            skins: gltfJson.skins || [],
            animations: animations.map(a => a.name)
        };

        return { cmData, textures, animations };
    }

    /**
     * Parse companion .mtl text into a map of material configurations.
     */
    static parseMTL(mtlText) {
        const materials = new Map();
        if (!mtlText) return materials;

        let currentMat = null;
        const lines = mtlText.split('\n');

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;

            const parts = line.split(/\s+/);
            const keyword = parts[0].toLowerCase();

            if (keyword === 'newmtl') {
                const matName = parts.slice(1).join(' ') || 'DefaultMaterial';
                currentMat = {
                    name: matName,
                    baseColor: [1, 1, 1, 1],
                    texturePath: null
                };
                materials.set(matName, currentMat);
            } else if (currentMat) {
                if (keyword === 'kd') {
                    const r = parseFloat(parts[1]) || 1;
                    const g = parseFloat(parts[2]) || 1;
                    const b = parseFloat(parts[3]) || 1;
                    currentMat.baseColor = [r, g, b, 1.0];
                } else if (keyword === 'd' || keyword === 'tr') {
                    const alpha = parseFloat(parts[1]);
                    if (!isNaN(alpha)) {
                        currentMat.baseColor[3] = keyword === 'tr' ? 1.0 - alpha : alpha;
                    }
                } else if (keyword === 'map_kd') {
                    const texPath = parts.slice(1).join(' ').replace(/\\/g, '/');
                    currentMat.texturePath = texPath.split('/').pop();
                }
            }
        }
        return materials;
    }

    /**
     * Converts OBJ Waveform string content into a native .cm model bundle asynchronously.
     * Guarantees 1:1 vertex attribute array length matching, sub-mesh separation by object/material,
     * accurate normal/UV calculation, and global pivot centering.
     */
    static async convertOBJToCM(objText, fileName = 'model.obj', reductionRatio = 1.0, normalizeBlender = true, mtlText = null) {
        const rawPositions = [];
        const rawNormals = [];
        const rawUVs = [];

        const mtlMaterialsMap = this.parseMTL(mtlText);

        const groups = [];
        let currentGroup = {
            name: fileName.split('.')[0] || 'DefaultObject',
            materialName: 'DefaultMaterial',
            faces: []
        };
        groups.push(currentGroup);

        let pos = 0;
        const len = objText.length;
        let lastYield = performance.now();

        while (pos < len) {
            if (performance.now() - lastYield > 15) {
                await new Promise(resolve => setTimeout(resolve, 0));
                lastYield = performance.now();
            }

            let nextLineEnd = objText.indexOf('\n', pos);
            if (nextLineEnd === -1) nextLineEnd = len;

            let line = objText.substring(pos, nextLineEnd).trim();
            pos = nextLineEnd + 1;

            if (!line || line.charCodeAt(0) === 35) continue;

            const parts = line.split(/\s+/);
            const code = parts[0].toLowerCase();

            if (code === 'v') {
                rawPositions.push(parseFloat(parts[1]) || 0, parseFloat(parts[2]) || 0, parseFloat(parts[3]) || 0);
            } else if (code === 'vn') {
                rawNormals.push(parseFloat(parts[1]) || 0, parseFloat(parts[2]) || 0, parseFloat(parts[3]) || 0);
            } else if (code === 'vt') {
                rawUVs.push(parseFloat(parts[1]) || 0, parseFloat(parts[2]) || 0);
            } else if (code === 'o' || code === 'g') {
                const gName = parts.slice(1).join('_') || `Group_${groups.length}`;
                if (currentGroup.faces.length === 0) {
                    currentGroup.name = gName;
                } else {
                    currentGroup = {
                        name: gName,
                        materialName: currentGroup.materialName,
                        faces: []
                    };
                    groups.push(currentGroup);
                }
            } else if (code === 'usemtl') {
                const matName = parts.slice(1).join(' ') || 'DefaultMaterial';
                if (currentGroup.faces.length === 0) {
                    currentGroup.materialName = matName;
                } else {
                    currentGroup = {
                        name: `${currentGroup.name}_${matName}`,
                        materialName: matName,
                        faces: []
                    };
                    groups.push(currentGroup);
                }
            } else if (code === 'f') {
                const faceVerts = parts.slice(1).filter(Boolean);
                if (faceVerts.length >= 3) {
                    currentGroup.faces.push(faceVerts);
                }
            }
        }

        const cmMeshes = [];
        const cmNodes = [];
        const cmMaterials = [];
        const materialIndexMap = new Map();

        const baseName = fileName.split('.')[0];
        const totalRawPos = rawPositions.length / 3;
        const totalRawNorm = rawNormals.length / 3;
        const totalRawUV = rawUVs.length / 2;

        let nodeCounter = 0;

        for (const grp of groups) {
            if (grp.faces.length === 0) continue;

            const positions = [];
            const normals = [];
            const uvs = [];
            const indices = [];

            const vertCache = new Map();

            for (const faceVerts of grp.faces) {
                // Triangulate faces (fan triangulation)
                for (let i = 1; i < faceVerts.length - 1; i++) {
                    const tri = [faceVerts[0], faceVerts[i], faceVerts[i + 1]];

                    // Pre-validate all 3 triangle vertices before inserting into indices buffer
                    let validTri = true;
                    const triIndices = [];

                    for (const vKey of tri) {
                        let cachedIdx = vertCache.get(vKey);
                        if (cachedIdx !== undefined) {
                            triIndices.push(cachedIdx);
                            continue;
                        }

                        const slash1 = vKey.indexOf('/');
                        let pIdx = 0, tIdx = 0, nIdx = 0;

                        if (slash1 === -1) {
                            pIdx = parseInt(vKey, 10);
                        } else {
                            pIdx = parseInt(vKey.substring(0, slash1), 10);
                            const slash2 = vKey.indexOf('/', slash1 + 1);
                            if (slash2 === -1) {
                                tIdx = parseInt(vKey.substring(slash1 + 1), 10);
                            } else {
                                if (slash2 > slash1 + 1) {
                                    tIdx = parseInt(vKey.substring(slash1 + 1, slash2), 10);
                                }
                                nIdx = parseInt(vKey.substring(slash2 + 1), 10);
                            }
                        }

                        const pi = ((pIdx > 0 ? pIdx - 1 : totalRawPos + pIdx) % totalRawPos) * 3;
                        if (isNaN(pi) || pi < 0 || pi >= rawPositions.length) {
                            validTri = false;
                            break; // Abort entire triangle to preserve index buffer alignment
                        }

                        positions.push(rawPositions[pi], rawPositions[pi + 1], rawPositions[pi + 2]);

                        // Handle normals safely without replacing 0.0 with 1.0
                        if (rawNormals.length > 0 && nIdx !== 0) {
                            const ni = ((nIdx > 0 ? nIdx - 1 : totalRawNorm + nIdx) % totalRawNorm) * 3;
                            const nx = rawNormals[ni] !== undefined ? rawNormals[ni] : 0;
                            const ny = rawNormals[ni + 1] !== undefined ? rawNormals[ni + 1] : 1;
                            const nz = rawNormals[ni + 2] !== undefined ? rawNormals[ni + 2] : 0;
                            normals.push(nx, ny, nz);
                        } else {
                            normals.push(0, 1, 0);
                        }

                        // Handle UVs
                        if (rawUVs.length > 0 && tIdx !== 0) {
                            const ti = ((tIdx > 0 ? tIdx - 1 : totalRawUV + tIdx) % totalRawUV) * 2;
                            const u = rawUVs[ti] !== undefined ? rawUVs[ti] : 0;
                            const v = rawUVs[ti + 1] !== undefined ? rawUVs[ti + 1] : 0;
                            uvs.push(u, v);
                        } else {
                            uvs.push(0, 0);
                        }

                        const newIdx = Math.floor(positions.length / 3) - 1;
                        vertCache.set(vKey, newIdx);
                        triIndices.push(newIdx);
                    }

                    if (validTri && triIndices.length === 3) {
                        indices.push(triIndices[0], triIndices[1], triIndices[2]);
                    }
                }
            }

            if (positions.length === 0) continue;

            // Generate facet normals if missing
            const hasExplicitNormals = rawNormals.length > 0;
            if (!hasExplicitNormals) {
                for (let i = 0; i < positions.length; i++) normals[i] = 0;

                for (let i = 0; i < indices.length; i += 3) {
                    const i0 = indices[i] * 3;
                    const i1 = indices[i + 1] * 3;
                    const i2 = indices[i + 2] * 3;

                    const ax = positions[i1] - positions[i0];
                    const ay = positions[i1 + 1] - positions[i0 + 1];
                    const az = positions[i1 + 2] - positions[i0 + 2];

                    const bx = positions[i2] - positions[i0];
                    const by = positions[i2 + 1] - positions[i0 + 1];
                    const bz = positions[i2 + 2] - positions[i0 + 2];

                    const nx = ay * bz - az * by;
                    const ny = az * bx - ax * bz;
                    const nz = ax * by - ay * bx;

                    normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz;
                    normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz;
                    normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz;
                }

                for (let i = 0; i < normals.length; i += 3) {
                    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
                    normals[i] /= len;
                    normals[i + 1] /= len;
                    normals[i + 2] /= len;
                }
            }

            // Apply Z-Up -> Y-Up coordinate space transformation
            if (normalizeBlender) {
                this._normalizeCoordinates(positions, normals);
            }

            let primPositions = positions;
            let primNormals = normals;
            let primUvs = uvs;
            let primIndices = indices;

            if (reductionRatio < 0.98 && primIndices.length > 12) {
                const decimated = this._decimateMesh(primPositions, primNormals, primUvs, primIndices, reductionRatio);
                primPositions = decimated.positions;
                primNormals = decimated.normals;
                primUvs = decimated.uvs;
                primIndices = decimated.indices;
            }

            let matIdx = 0;
            const matName = grp.materialName || 'DefaultMaterial';
            if (materialIndexMap.has(matName)) {
                matIdx = materialIndexMap.get(matName);
            } else {
                matIdx = cmMaterials.length;
                materialIndexMap.set(matName, matIdx);

                const mtlConfig = mtlMaterialsMap.get(matName);
                cmMaterials.push({
                    name: matName,
                    baseColor: mtlConfig ? mtlConfig.baseColor : [1, 1, 1, 1],
                    texturePath: mtlConfig ? mtlConfig.texturePath : null
                });
            }

            const meshIndex = cmMeshes.length;
            cmMeshes.push({
                name: grp.name || `SubMesh_${meshIndex}`,
                primitives: [{
                    positions: primPositions,
                    normals: primNormals,
                    uvs: primUvs,
                    indices: primIndices,
                    materialIndex: matIdx
                }]
            });

            cmNodes.push({
                id: nodeCounter++,
                name: grp.name || `Node_${meshIndex}`,
                translation: [0, 0, 0],
                scale: [1, 1, 1],
                rotation: [0, 0, 0, 1],
                mesh: meshIndex,
                children: []
            });
        }

        if (cmMaterials.length === 0) {
            cmMaterials.push({ name: `${baseName}_Material`, baseColor: [1, 1, 1, 1] });
        }

        // Apply global pivot centering across entire model hierarchy (not per sub-mesh)
        this._centerGlobalModelPivot(cmMeshes);

        const cmData = {
            formatVersion: '1.0',
            generator: 'Carley Engine OBJ CM Converter',
            originalFileName: fileName,
            polyReductionRatio: reductionRatio,
            nodes: cmNodes,
            meshes: cmMeshes,
            materials: cmMaterials,
            skins: [],
            animations: []
        };

        return { cmData, textures: [], animations: [] };
    }

    /**
     * Centers the pivot of the entire combined model assembly without shifting individual sub-meshes to origin.
     */
    static _centerGlobalModelPivot(cmMeshes) {
        if (!cmMeshes || cmMeshes.length === 0) return;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const mesh of cmMeshes) {
            for (const prim of mesh.primitives) {
                const pos = prim.positions;
                if (!pos) continue;
                for (let i = 0; i < pos.length; i += 3) {
                    minX = Math.min(minX, pos[i]); maxX = Math.max(maxX, pos[i]);
                    minY = Math.min(minY, pos[i + 1]); maxY = Math.max(maxY, pos[i + 1]);
                    minZ = Math.min(minZ, pos[i + 2]); maxZ = Math.max(maxZ, pos[i + 2]);
                }
            }
        }

        if (!isFinite(minX)) return;

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        for (const mesh of cmMeshes) {
            for (const prim of mesh.primitives) {
                const pos = prim.positions;
                if (!pos) continue;
                for (let i = 0; i < pos.length; i += 3) {
                    pos[i] -= centerX;
                    pos[i + 1] -= centerY;
                    pos[i + 2] -= centerZ;
                }
            }
        }
    }

    /**
     * Decimates mesh geometry using spatial Vertex Clustering to smooth/simplify
     * high-poly geometry while keeping a contiguous, closed surface without holes/gaps.
     */
    static _decimateMesh(positions, normals, uvs, indices, ratio) {
        if (!positions || positions.length < 9 || !indices || indices.length < 12 || ratio >= 0.98) {
            return { positions, normals, uvs, indices };
        }

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (let i = 0; i < positions.length; i += 3) {
            minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i]);
            minY = Math.min(minY, positions[i + 1]); maxY = Math.max(maxY, positions[i + 1]);
            minZ = Math.min(minZ, positions[i + 2]); maxZ = Math.max(maxZ, positions[i + 2]);
        }

        const extentX = (maxX - minX) || 1.0;
        const extentY = (maxY - minY) || 1.0;
        const extentZ = (maxZ - minZ) || 1.0;
        const maxExtent = Math.max(extentX, extentY, extentZ);

        const gridRes = Math.max(4, Math.floor(64 * Math.pow(ratio, 0.75)));
        const cellSize = maxExtent / gridRes;

        const cellMap = new Map();
        const newPositions = [];
        const newNormals = normals ? [] : null;
        const newUvs = uvs ? [] : null;
        const vertexRemap = new Int32Array(positions.length / 3);

        const vertexCount = positions.length / 3;

        for (let v = 0; v < vertexCount; v++) {
            const px = positions[v * 3];
            const py = positions[v * 3 + 1];
            const pz = positions[v * 3 + 2];

            const gx = Math.floor((px - minX) / cellSize);
            const gy = Math.floor((py - minY) / cellSize);
            const gz = Math.floor((pz - minZ) / cellSize);
            const gridKey = `${gx}_${gy}_${gz}`;

            if (cellMap.has(gridKey)) {
                vertexRemap[v] = cellMap.get(gridKey);
            } else {
                const newIdx = newPositions.length / 3;
                cellMap.set(gridKey, newIdx);
                vertexRemap[v] = newIdx;

                newPositions.push(px, py, pz);
                if (normals) {
                    newNormals.push(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
                }
                if (uvs) {
                    newUvs.push(uvs[v * 2], uvs[v * 2 + 1]);
                }
            }
        }

        const newIndices = [];
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = vertexRemap[indices[i]];
            const i1 = vertexRemap[indices[i + 1]];
            const i2 = vertexRemap[indices[i + 2]];

            if (i0 !== i1 && i1 !== i2 && i0 !== i2) {
                newIndices.push(i0, i1, i2);
            }
        }

        if (newIndices.length < 3) {
            return { positions, normals, uvs, indices };
        }

        return {
            positions: newPositions,
            normals: newNormals,
            uvs: newUvs,
            indices: newIndices
        };
    }

    static _isGLBHeader(buffer) {
        if (buffer.byteLength < 12) return false;
        const view = new DataView(buffer);
        const magic = view.getUint32(0, true);
        return magic === 0x46546C67; // 'glTF'
    }

    static _parseGLB(buffer) {
        const view = new DataView(buffer);
        const magic = view.getUint32(0, true);
        const version = view.getUint32(4, true);
        const length = view.getUint32(8, true);

        if (magic !== 0x46546C67) {
            throw new Error("Archivo GLB inválido: firma mágica incorrecta.");
        }

        let offset = 12;
        let jsonChunk = null;
        let binaryChunk = null;

        while (offset < length) {
            const chunkLength = view.getUint32(offset, true);
            const chunkType = view.getUint32(offset + 4, true);
            offset += 8;

            if (chunkType === 0x4E4F534A) {
                const jsonBytes = new Uint8Array(buffer, offset, chunkLength);
                const decoder = new TextDecoder('utf-8');
                jsonChunk = JSON.parse(decoder.decode(jsonBytes));
            } else if (chunkType === 0x004E4942) {
                binaryChunk = buffer.slice(offset, offset + chunkLength);
            }

            offset += chunkLength;
        }

        if (!jsonChunk) {
            throw new Error("No se encontró el bloque JSON dentro del archivo GLB.");
        }

        return { json: jsonChunk, binaryChunk };
    }

    static _getAccessorData(gltf, accessorIndex, binaryChunk) {
        if (accessorIndex === undefined || accessorIndex === null || !binaryChunk) return null;
        const accessor = gltf.accessors[accessorIndex];
        const bufferView = gltf.bufferViews[accessor.bufferView];
        const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);

        let TypedArrayCtor = Float32Array;
        if (accessor.componentType === 5120) TypedArrayCtor = Int8Array;
        else if (accessor.componentType === 5121) TypedArrayCtor = Uint8Array;
        else if (accessor.componentType === 5122) TypedArrayCtor = Int16Array;
        else if (accessor.componentType === 5123) TypedArrayCtor = Uint16Array;
        else if (accessor.componentType === 5125) TypedArrayCtor = Uint32Array;
        else if (accessor.componentType === 5126) TypedArrayCtor = Float32Array;

        const numComponents = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[accessor.type] || 1;
        const count = accessor.count * numComponents;
        const byteLength = count * TypedArrayCtor.BYTES_PER_ELEMENT;

        const slicedBuffer = binaryChunk.slice(byteOffset, byteOffset + byteLength);
        return new TypedArrayCtor(slicedBuffer);
    }

    static _normalizeCoordinates(positions, normals) {
        if (!positions) return;

        // Swap Z-Up to Y-Up axis (Blender orientation: [X, Y, Z] -> [X, Z, -Y])
        for (let i = 0; i < positions.length; i += 3) {
            const y = positions[i + 1];
            const z = positions[i + 2];
            positions[i + 1] = z;
            positions[i + 2] = -y;
        }

        if (normals && normals.length === positions.length) {
            for (let i = 0; i < normals.length; i += 3) {
                const ny = normals[i + 1];
                const nz = normals[i + 2];
                normals[i + 1] = nz;
                normals[i + 2] = -ny;
            }
        }
    }
}
