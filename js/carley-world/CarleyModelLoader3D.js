/**
 * CarleyModelLoader3D - Cargador autocontenido e independiente de modelos 3D (.obj, .gltf, .glb) para Carley World.
 * Diseñado desde cero, libre de dependencias del motor 2D y con soporte para animaciones de huesos y mallas esqueléticas.
 */

export class CarleyModelLoader3D {
    static async loadModel(path, projectsDirHandle) {
        const ext = path.split('.').pop().toLowerCase();
        let url = path;

        // Si tenemos un manejador de proyectos, resolver la URL del asset de forma segura
        if (projectsDirHandle && window.getURLForAssetPath) {
            const resolved = await window.getURLForAssetPath(path, projectsDirHandle);
            if (resolved) url = resolved;
        }

        if (ext === 'obj') {
            return await this.loadOBJ(url);
        } else if (ext === 'gltf' || ext === 'glb') {
            return await this.loadGLTF(url);
        }
        return null;
    }

    static async loadOBJ(url) {
        const response = await fetch(url);
        const text = await response.text();
        const lines = text.split('\n');

        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        const vertices = [];
        const vNormals = [];
        const vUvs = [];

        const indexMap = new Map();
        let nextIndex = 0;

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length === 0) continue;

            switch (parts[0]) {
                case 'v':
                    vertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
                    break;
                case 'vn':
                    vNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
                    break;
                case 'vt':
                    vUvs.push([parseFloat(parts[1]), parseFloat(parts[2])]);
                    break;
                case 'f':
                    const faceIndices = [];
                    for (let i = 1; i < parts.length; i++) {
                        const vertexParts = parts[i].split('/');
                        const key = parts[i];
                        if (indexMap.has(key)) {
                            faceIndices.push(indexMap.get(key));
                        } else {
                            let vIdx = parseInt(vertexParts[0]);
                            vIdx = vIdx < 0 ? vertices.length + vIdx : vIdx - 1;

                            let uvIdx = vertexParts[1] ? parseInt(vertexParts[1]) : 0;
                            uvIdx = uvIdx < 0 ? vUvs.length + uvIdx : uvIdx - 1;

                            let nIdx = vertexParts[2] ? parseInt(vertexParts[2]) : 0;
                            nIdx = nIdx < 0 ? vNormals.length + nIdx : nIdx - 1;

                            positions.push(...vertices[vIdx]);
                            if (nIdx >= 0) normals.push(...vNormals[nIdx]);
                            else normals.push(0, 0, 1);

                            if (uvIdx >= 0) uvs.push(...vUvs[uvIdx]);
                            else uvs.push(0, 0);

                            indexMap.set(key, nextIndex);
                            faceIndices.push(nextIndex);
                            nextIndex++;
                        }
                    }
                    // Triangulate polygons
                    for (let i = 1; i < faceIndices.length - 1; i++) {
                        indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
                    }
                    break;
            }
        }

        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint16Array(indices)
        };
    }

    static async loadGLTF(url) {
        const response = await fetch(url);
        const isGLB = url.toLowerCase().endsWith('.glb');

        let json;
        let binaryBuffer;

        if (isGLB) {
            const arrayBuffer = await response.arrayBuffer();
            const dataView = new DataView(arrayBuffer);
            const magic = dataView.getUint32(0, true);
            if (magic !== 0x46546C67) throw new Error('No es un archivo GLB válido');

            const jsonChunkLength = dataView.getUint32(12, true);
            const jsonChunk = new Uint8Array(arrayBuffer, 20, jsonChunkLength);
            json = JSON.parse(new TextDecoder().decode(jsonChunk));

            const binChunkOffset = 20 + jsonChunkLength + 8;
            if (binChunkOffset < arrayBuffer.byteLength) {
                binaryBuffer = arrayBuffer.slice(binChunkOffset);
            }
        } else {
            json = await response.json();
            if (json.buffers && json.buffers[0] && json.buffers[0].uri) {
                const binUrl = new URL(json.buffers[0].uri, url).href;
                const binRes = await fetch(binUrl);
                binaryBuffer = await binRes.arrayBuffer();
            }
        }

        const getAccessorData = (index) => {
            if (index === undefined) return null;
            const accessor = json.accessors[index];
            const bufferView = json.bufferViews[accessor.bufferView];
            const offset = (accessor.byteOffset || 0) + (bufferView.byteOffset || 0);
            const length = accessor.count * this.getComponentCount(accessor.type);

            let TypedArray;
            switch(accessor.componentType) {
                case 5121: TypedArray = Uint8Array; break;
                case 5123: TypedArray = Uint16Array; break;
                case 5125: TypedArray = Uint32Array; break;
                case 5126: TypedArray = Float32Array; break;
                default: TypedArray = Float32Array;
            }
            return new TypedArray(binaryBuffer.slice(offset, offset + length * TypedArray.BYTES_PER_ELEMENT));
        };

        const result = {
            nodes: json.nodes.map((n, i) => ({
                name: n.name || `Nodo_${i}`,
                translation: n.translation || [0, 0, 0],
                rotation: n.rotation || [0, 0, 0, 1],
                scale: n.scale || [1, 1, 1],
                children: n.children || [],
                mesh: n.mesh,
                skin: n.skin
            })),
            meshes: json.meshes.map(m => ({
                name: m.name,
                primitives: m.primitives.map(p => ({
                    positions: getAccessorData(p.attributes.POSITION),
                    normals: getAccessorData(p.attributes.NORMAL),
                    uvs: getAccessorData(p.attributes.TEXCOORD_0),
                    indices: getAccessorData(p.indices),
                    weights: getAccessorData(p.attributes.WEIGHTS_0),
                    joints: getAccessorData(p.attributes.JOINTS_0),
                    material: p.material
                }))
            })),
            materials: (json.materials || []).map(m => ({
                name: m.name,
                baseColor: m.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1],
                baseColorTexture: m.pbrMetallicRoughness?.baseColorTexture?.index
            })),
            skins: (json.skins || []).map(s => ({
                joints: s.joints,
                inverseBindMatrices: getAccessorData(s.inverseBindMatrices)
            })),
            animations: []
        };

        if (json.animations) {
            for (const anim of json.animations) {
                const ceAnim = { name: anim.name || 'Animation', channels: [] };
                for (const channel of anim.channels) {
                    const sampler = anim.samplers[channel.sampler];
                    ceAnim.channels.push({
                        node: channel.target.node,
                        path: channel.target.path,
                        times: getAccessorData(sampler.input),
                        values: getAccessorData(sampler.output),
                        interpolation: sampler.interpolation || 'LINEAR'
                    });
                }
                result.animations.push(ceAnim);
            }
        }

        return result;
    }

    static getComponentCount(type) {
        switch(type) {
            case 'SCALAR': return 1;
            case 'VEC2': return 2;
            case 'VEC3': return 3;
            case 'VEC4': return 4;
            case 'MAT4': return 16;
            default: return 1;
        }
    }
}
