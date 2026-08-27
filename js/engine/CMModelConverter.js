// js/engine/CMModelConverter.js
/**
 * CMModelConverter - Converts .gltf and .glb 3D assets into native Carley Model (.cm) format,
 * extracting companion textures and .cea3d animation clips while normalizing Blender orientations.
 */

export class CMModelConverter {
    /**
     * Converts a GLTF/GLB File or ArrayBuffer into a Carley Model (.cm) structure.
     * @param {File|Blob|ArrayBuffer} fileData
     * @param {string} fileName
     * @param {number} reductionRatio - Target polygon ratio (0.25 to 1.0)
     * @returns {Promise<{ cmData: object, textures: Array<{ name: string, blob: Blob }>, animations: Array<{ name: string, data: object }> }>}
     */
    static async convertGLTFToCM(fileData, fileName = 'model.glb', reductionRatio = 1.0) {
        let buffer;
        if (fileData instanceof ArrayBuffer) {
            buffer = fileData;
        } else if (fileData.arrayBuffer) {
            buffer = await fileData.arrayBuffer();
        } else {
            throw new Error("Formato de datos no soportado para la conversión GLTF.");
        }

        const lowerName = fileName.toLowerCase();

        // Handle OBJ Files (.obj)
        if (lowerName.endsWith('.obj')) {
            const decoder = new TextDecoder('utf-8');
            const objText = decoder.decode(buffer);
            return this.convertOBJToCM(objText, fileName, reductionRatio);
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

                    // Blender / Z-Up Normalization: convert Z-Up to Y-Up
                    this._normalizeCoordinates(positions, normals);

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
                let rotation = node.rotation || [0, 0, 0, 1]; // Quat [x,y,z,w]

                // Blender coordinate swap on node positions
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
                        path: channel.target.path, // 'translation', 'rotation', 'scale'
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

        // Final .cm Bundle
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
     * Converts OBJ Waveform string content into a native .cm model bundle.
     */
    static convertOBJToCM(objText, fileName = 'model.obj', reductionRatio = 1.0) {
        const lines = objText.split(/\r?\n/);

        const rawPositions = [];
        const rawNormals = [];
        const rawUVs = [];

        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        const vertCache = new Map();

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;

            const parts = line.split(/\s+/);
            const type = parts[0];

            if (type === 'v') {
                rawPositions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            } else if (type === 'vn') {
                rawNormals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            } else if (type === 'vt') {
                rawUVs.push(parseFloat(parts[1]), parseFloat(parts[2]));
            } else if (type === 'f') {
                const faceVerts = parts.slice(1);

                // Triangulate polygon face
                for (let i = 1; i < faceVerts.length - 1; i++) {
                    const triVerts = [faceVerts[0], faceVerts[i], faceVerts[i + 1]];

                    for (const vKey of triVerts) {
                        if (vertCache.has(vKey)) {
                            indices.push(vertCache.get(vKey));
                        } else {
                            const [pIdx, tIdx, nIdx] = vKey.split('/').map(v => parseInt(v, 10));

                            const pi = (pIdx > 0 ? pIdx - 1 : rawPositions.length / 3 + pIdx) * 3;
                            positions.push(rawPositions[pi] || 0, rawPositions[pi + 1] || 0, rawPositions[pi + 2] || 0);

                            if (rawNormals.length > 0 && nIdx) {
                                const ni = (nIdx > 0 ? nIdx - 1 : rawNormals.length / 3 + nIdx) * 3;
                                normals.push(rawNormals[ni] || 0, rawNormals[ni + 1] || 1, rawNormals[ni + 2] || 0);
                            }

                            if (rawUVs.length > 0 && tIdx) {
                                const ti = (tIdx > 0 ? tIdx - 1 : rawUVs.length / 2 + tIdx) * 2;
                                uvs.push(rawUVs[ti] || 0, rawUVs[ti + 1] || 0);
                            }

                            const newIdx = positions.length / 3 - 1;
                            vertCache.set(vKey, newIdx);
                            indices.push(newIdx);
                        }
                    }
                }
            }
        }

        // Normalize Z-Up/Y-Up coordinate space
        this._normalizeCoordinates(positions, normals);

        let primPositions = positions;
        let primNormals = normals.length > 0 ? normals : null;
        let primUvs = uvs.length > 0 ? uvs : null;
        let primIndices = indices;

        if (reductionRatio < 0.98 && primIndices.length > 12) {
            const decimated = this._decimateMesh(primPositions, primNormals, primUvs, primIndices, reductionRatio);
            primPositions = decimated.positions;
            primNormals = decimated.normals;
            primUvs = decimated.uvs;
            primIndices = decimated.indices;
        }

        const baseName = fileName.split('.')[0];
        const cmMeshes = [{
            name: baseName,
            primitives: [{
                positions: primPositions,
                normals: primNormals,
                uvs: primUvs,
                indices: primIndices,
                materialIndex: 0
            }]
        }];

        const cmNodes = [{
            id: 0,
            name: baseName,
            translation: [0, 0, 0],
            scale: [1, 1, 1],
            rotation: [0, 0, 0, 1],
            mesh: 0,
            children: []
        }];

        const cmData = {
            formatVersion: '1.0',
            generator: 'Carley Engine OBJ CM Converter',
            originalFileName: fileName,
            polyReductionRatio: reductionRatio,
            nodes: cmNodes,
            meshes: cmMeshes,
            materials: [{ name: `${baseName}_Material`, baseColor: [1, 1, 1, 1] }],
            skins: [],
            animations: []
        };

        return { cmData, textures: [], animations: [] };
    }

    /**
     * Decimates mesh geometry using spatial Vertex Clustering to smooth/simplify
     * high-poly geometry while keeping a contiguous, closed surface without holes/gaps.
     */
    static _decimateMesh(positions, normals, uvs, indices, ratio) {
        if (!positions || positions.length < 9 || !indices || indices.length < 12 || ratio >= 0.98) {
            return { positions, normals, uvs, indices };
        }

        // Calculate mesh bounding box
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

        // Grid cell size based on target reduction ratio (higher ratio = finer grid)
        const gridRes = Math.max(4, Math.floor(64 * Math.pow(ratio, 0.75)));
        const cellSize = maxExtent / gridRes;

        const cellMap = new Map(); // gridKey -> newVertexIndex
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

        // Re-index triangles and discard degenerate faces (where two or more vertices collapsed to the same point)
        const newIndices = [];
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = vertexRemap[indices[i]];
            const i1 = vertexRemap[indices[i + 1]];
            const i2 = vertexRemap[indices[i + 2]];

            if (i0 !== i1 && i1 !== i2 && i0 !== i2) {
                newIndices.push(i0, i1, i2);
            }
        }

        // If decimation collapsed all faces, fallback to original indices
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

            if (chunkType === 0x4E4F534A) { // 'JSON'
                const jsonBytes = new Uint8Array(buffer, offset, chunkLength);
                const decoder = new TextDecoder('utf-8');
                jsonChunk = JSON.parse(decoder.decode(jsonBytes));
            } else if (chunkType === 0x004E4942) { // 'BIN'
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
            positions[i + 1] = z;   // Y = Z
            positions[i + 2] = -y;  // Z = -Y
        }

        if (normals) {
            for (let i = 0; i < normals.length; i += 3) {
                const ny = normals[i + 1];
                const nz = normals[i + 2];
                normals[i + 1] = nz;
                normals[i + 2] = -ny;
            }
        }

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (let i = 0; i < positions.length; i += 3) {
            minX = Math.min(minX, positions[i]);
            maxX = Math.max(maxX, positions[i]);
            minY = Math.min(minY, positions[i + 1]);
            maxY = Math.max(maxY, positions[i + 1]);
            minZ = Math.min(minZ, positions[i + 2]);
            maxZ = Math.max(maxZ, positions[i + 2]);
        }

        // Center model geometry around its origin (pivot)
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] -= centerX;
            positions[i + 1] -= centerY;
            positions[i + 2] -= centerZ;
        }
    }
}
