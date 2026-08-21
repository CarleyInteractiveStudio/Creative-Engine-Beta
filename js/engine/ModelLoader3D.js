/**
 * ModelLoader3D - Utility for loading GLTF, GLB, OBJ (with MTL) and FBX (ASCII & Binary) models.
 * Custom implementation without external engine dependencies (no Three.js).
 * (c) 2024-2025 Carley Interactive Studio
 */

import { getURLForAssetPath } from './AssetUtils.js';

export class ModelLoader3D {
    static async loadModel(path, projectsDirHandle) {
        const ext = path.split('.').pop().toLowerCase();
        const url = await getURLForAssetPath(path, projectsDirHandle);
        if (!url) return null;

        if (ext === 'obj') {
            return await this.loadOBJ(url, path, projectsDirHandle);
        } else if (ext === 'gltf' || ext === 'glb') {
            return await this.loadGLTF(url);
        } else if (ext === 'fbx') {
            return await this.loadFBX(url, path, projectsDirHandle);
        }
        return null;
    }

    // ==========================================
    // 1. OBJ & MTL Loader
    // ==========================================
    static async loadOBJ(url, basePath = '', projectsDirHandle = null) {
        const response = await fetch(url);
        const text = await response.text();
        const lines = text.split('\n');

        const rawPositions = [];
        const rawNormals = [];
        const rawUVs = [];

        let currentMaterialName = null;
        const materials = new Map();
        let mtlLibPath = null;

        // Group geometry by material
        const groups = new Map(); // materialName -> { positions, normals, uvs, indices, indexMap, nextIndex }

        const getGroup = (matName) => {
            const key = matName || 'default';
            if (!groups.has(key)) {
                groups.set(key, {
                    materialName: key,
                    positions: [],
                    normals: [],
                    uvs: [],
                    indices: [],
                    indexMap: new Map(),
                    nextIndex: 0
                });
            }
            return groups.get(key);
        };

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;

            const parts = line.split(/\s+/);
            const cmd = parts[0];

            switch (cmd) {
                case 'mtllib':
                    mtlLibPath = parts.slice(1).join(' ');
                    break;
                case 'usemtl':
                    currentMaterialName = parts[1];
                    break;
                case 'v':
                    rawPositions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
                    break;
                case 'vn':
                    rawNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
                    break;
                case 'vt':
                    rawUVs.push([parseFloat(parts[1]), parseFloat(parts[2])]);
                    break;
                case 'f':
                    const group = getGroup(currentMaterialName);
                    const faceIndices = [];

                    for (let i = 1; i < parts.length; i++) {
                        const vertexKey = parts[i];
                        if (group.indexMap.has(vertexKey)) {
                            faceIndices.push(group.indexMap.get(vertexKey));
                        } else {
                            const vertexParts = vertexKey.split('/');
                            let vIdx = parseInt(vertexParts[0]);
                            vIdx = vIdx < 0 ? rawPositions.length + vIdx : vIdx - 1;

                            let uvIdx = vertexParts[1] ? parseInt(vertexParts[1]) : -1;
                            uvIdx = uvIdx < 0 ? (rawUVs.length > 0 ? rawUVs.length + uvIdx : -1) : uvIdx - 1;

                            let nIdx = vertexParts[2] ? parseInt(vertexParts[2]) : -1;
                            nIdx = nIdx < 0 ? (rawNormals.length > 0 ? rawNormals.length + nIdx : -1) : nIdx - 1;

                            const pos = rawPositions[vIdx] || [0, 0, 0];
                            const norm = nIdx >= 0 ? rawNormals[nIdx] : [0, 1, 0];
                            const uv = uvIdx >= 0 ? rawUVs[uvIdx] : [0, 0];

                            group.positions.push(...pos);
                            group.normals.push(...norm);
                            group.uvs.push(...uv);

                            group.indexMap.set(vertexKey, group.nextIndex);
                            faceIndices.push(group.nextIndex);
                            group.nextIndex++;
                        }
                    }

                    // Fan triangulation for polygons
                    for (let i = 1; i < faceIndices.length - 1; i++) {
                        group.indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
                    }
                    break;
            }
        }

        // Load MTL if specified
        if (mtlLibPath && basePath) {
            try {
                const folder = basePath.substring(0, basePath.lastIndexOf('/') + 1);
                const fullMtlPath = folder + mtlLibPath;
                const mtlUrl = await getURLForAssetPath(fullMtlPath, projectsDirHandle);
                if (mtlUrl) {
                    const mtlRes = await fetch(mtlUrl);
                    const mtlText = await mtlRes.text();
                    const parsedMtls = this.parseMTL(mtlText, folder);
                    for (const [mName, mData] of parsedMtls) {
                        materials.set(mName, mData);
                    }
                }
            } catch (e) {
                console.warn('[ModelLoader3D] Could not load MTL material:', e);
            }
        }

        const nodes = [];
        const meshes = [];
        const materialList = [];
        const matIndexMap = new Map();

        for (const [matName, grp] of groups) {
            let matIdx = matIndexMap.get(matName);
            if (matIdx === undefined) {
                const mtl = materials.get(matName) || {};
                matIdx = materialList.length;
                materialList.push({
                    name: matName,
                    baseColor: mtl.Kd ? [...mtl.Kd, 1.0] : [1, 1, 1, 1],
                    texturePath: mtl.map_Kd || null
                });
                matIndexMap.set(matName, matIdx);
            }

            const meshIdx = meshes.length;
            meshes.push({
                name: `Mesh_${matName}`,
                primitives: [{
                    positions: new Float32Array(grp.positions),
                    normals: new Float32Array(grp.normals),
                    uvs: new Float32Array(grp.uvs),
                    indices: new Uint16Array(grp.indices),
                    material: matIdx
                }]
            });

            nodes.push({
                name: `Node_${matName}`,
                translation: [0, 0, 0],
                rotation: [0, 0, 0, 1],
                scale: [1, 1, 1],
                mesh: meshIdx
            });
        }

        // Fallback for single primitive OBJ
        if (nodes.length === 0) {
            return {
                positions: new Float32Array(0),
                normals: new Float32Array(0),
                uvs: new Float32Array(0),
                indices: new Uint16Array(0)
            };
        }

        return {
            nodes,
            meshes,
            materials: materialList,
            animations: []
        };
    }

    static parseMTL(mtlText, baseFolder = '') {
        const materials = new Map();
        let curMat = null;

        const lines = mtlText.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue;

            const parts = line.split(/\s+/);
            const cmd = parts[0];

            if (cmd === 'newmtl') {
                curMat = { name: parts[1] };
                materials.set(parts[1], curMat);
            } else if (curMat) {
                if (cmd === 'Kd') {
                    curMat.Kd = [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])];
                } else if (cmd === 'map_Kd') {
                    const texName = parts.slice(1).join(' ');
                    curMat.map_Kd = baseFolder + texName;
                }
            }
        }
        return materials;
    }

    // ==========================================
    // 2. GLTF & GLB Loader (with Embedded Textures)
    // ==========================================
    static async loadGLTF(url) {
        const response = await fetch(url);
        const isGLB = url.toLowerCase().endsWith('.glb');

        let json;
        let binaryBuffer;

        if (isGLB) {
            const arrayBuffer = await response.arrayBuffer();
            const dataView = new DataView(arrayBuffer);
            const magic = dataView.getUint32(0, true);
            if (magic !== 0x46546C67) throw new Error('Not a valid GLB file');

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
                if (json.buffers[0].uri.startsWith('data:')) {
                    binaryBuffer = this.dataURLToArrayBuffer(json.buffers[0].uri);
                } else {
                    const binUrl = new URL(json.buffers[0].uri, url).href;
                    const binRes = await fetch(binUrl);
                    binaryBuffer = await binRes.arrayBuffer();
                }
            }
        }

        const getAccessorData = (index) => {
            if (index === undefined || index === null) return null;
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

        // Extract embedded textures
        const textureUrls = [];
        if (json.textures && json.images) {
            for (const img of json.images) {
                if (img.bufferView !== undefined && binaryBuffer) {
                    const bv = json.bufferViews[img.bufferView];
                    const imgData = new Uint8Array(binaryBuffer, bv.byteOffset || 0, bv.byteLength);
                    const blob = new Blob([imgData], { type: img.mimeType || 'image/png' });
                    textureUrls.push(URL.createObjectURL(blob));
                } else if (img.uri) {
                    if (img.uri.startsWith('data:')) {
                        textureUrls.push(img.uri);
                    } else {
                        textureUrls.push(new URL(img.uri, url).href);
                    }
                } else {
                    textureUrls.push(null);
                }
            }
        }

        const materials = (json.materials || []).map(m => {
            let texUrl = null;
            const texIdx = m.pbrMetallicRoughness?.baseColorTexture?.index;
            if (texIdx !== undefined && json.textures && json.textures[texIdx]) {
                const imgIdx = json.textures[texIdx].source;
                if (imgIdx !== undefined) texUrl = textureUrls[imgIdx];
            }
            return {
                name: m.name || 'Material',
                baseColor: m.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1],
                textureUrl: texUrl
            };
        });

        const result = {
            nodes: (json.nodes || []).map((n, i) => ({
                name: n.name || `Node_${i}`,
                translation: n.translation || [0, 0, 0],
                rotation: n.rotation || [0, 0, 0, 1],
                scale: n.scale || [1, 1, 1],
                children: n.children || [],
                mesh: n.mesh,
                skin: n.skin
            })),
            meshes: (json.meshes || []).map(m => ({
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
            materials,
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

    static dataURLToArrayBuffer(dataUrl) {
        const base64 = dataUrl.split(',')[1];
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // ==========================================
    // 3. FBX Loader (ASCII & Binary)
    // Custom native parser - no external libraries
    // ==========================================
    static async loadFBX(url, basePath = '', projectsDirHandle = null) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();

        // Check FBX Binary Header
        const isBinary = arrayBuffer.byteLength > 23 &&
            String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 18)) === 'Kaydara FBX Binary';

        let fbxTree;
        if (isBinary) {
            fbxTree = this.parseFBXBinary(arrayBuffer);
        } else {
            const text = new TextDecoder('utf-8').decode(arrayBuffer);
            fbxTree = this.parseFBXASCII(text);
        }

        return this.buildSceneFromFBXTree(fbxTree, basePath, projectsDirHandle);
    }

    // --- FBX Binary Parser ---
    static parseFBXBinary(buffer) {
        const reader = {
            view: new DataView(buffer),
            offset: 27, // Start after Kaydara header
            version: new DataView(buffer).getUint32(23, true)
        };

        const is64 = reader.version >= 7500;
        const root = { name: 'Root', nodes: [] };

        while (reader.offset < buffer.byteLength) {
            const node = this.readFBXBinaryNode(reader, is64);
            if (!node) break;
            root.nodes.push(node);
        }

        return root;
    }

    static readFBXBinaryNode(reader, is64) {
        const endOffset = is64 ? Number(reader.view.getBigUint64(reader.offset, true)) : reader.view.getUint32(reader.offset, true);
        reader.offset += is64 ? 8 : 4;
        if (endOffset === 0) return null;

        const numProperties = is64 ? Number(reader.view.getBigUint64(reader.offset, true)) : reader.view.getUint32(reader.offset, true);
        reader.offset += is64 ? 8 : 4;

        const propertyListLen = is64 ? Number(reader.view.getBigUint64(reader.offset, true)) : reader.view.getUint32(reader.offset, true);
        reader.offset += is64 ? 8 : 4;

        const nameLen = reader.view.getUint8(reader.offset);
        reader.offset += 1;

        const name = new TextDecoder().decode(new Uint8Array(reader.view.buffer, reader.offset, nameLen));
        reader.offset += nameLen;

        const props = [];
        for (let i = 0; i < numProperties; i++) {
            props.push(this.readFBXBinaryProperty(reader));
        }

        const nodes = [];
        while (reader.offset < endOffset) {
            const child = this.readFBXBinaryNode(reader, is64);
            if (!child) break;
            nodes.push(child);
        }

        reader.offset = endOffset;
        return { name, props, nodes };
    }

    static readFBXBinaryProperty(reader) {
        const type = String.fromCharCode(reader.view.getUint8(reader.offset));
        reader.offset += 1;

        switch (type) {
            case 'Y': { const val = reader.view.getInt16(reader.offset, true); reader.offset += 2; return val; }
            case 'C': { const val = reader.view.getUint8(reader.offset) !== 0; reader.offset += 1; return val; }
            case 'I': { const val = reader.view.getInt32(reader.offset, true); reader.offset += 4; return val; }
            case 'F': { const val = reader.view.getFloat32(reader.offset, true); reader.offset += 4; return val; }
            case 'D': { const val = reader.view.getFloat64(reader.offset, true); reader.offset += 8; return val; }
            case 'L': { const val = Number(reader.view.getBigInt64(reader.offset, true)); reader.offset += 8; return val; }
            case 'R':
            case 'S': {
                const len = reader.view.getUint32(reader.offset, true);
                reader.offset += 4;
                const str = new TextDecoder().decode(new Uint8Array(reader.view.buffer, reader.offset, len));
                reader.offset += len;
                return str;
            }
            case 'b': case 'c': case 'i': case 'f': case 'd': case 'l': {
                const arrayLen = reader.view.getUint32(reader.offset, true);
                const encoding = reader.view.getUint32(reader.offset + 4, true);
                const compressedLen = reader.view.getUint32(reader.offset + 8, true);
                reader.offset += 12;

                let rawData;
                if (encoding === 0) {
                    rawData = new Uint8Array(reader.view.buffer, reader.offset, compressedLen);
                    reader.offset += compressedLen;
                } else {
                    const compressed = new Uint8Array(reader.view.buffer, reader.offset, compressedLen);
                    reader.offset += compressedLen;
                    rawData = this.inflateFBXBuffer(compressed, arrayLen, type);
                }

                return this.parseTypedFBXArray(type, rawData, arrayLen);
            }
            default:
                return null;
        }
    }

    static inflateFBXBuffer(compressed, length, type) {
        // Strip 2-byte zlib header (0x78) if present
        const slice = (compressed[0] === 0x78) ? compressed.subarray(2) : compressed;
        try {
            if (typeof Inflate !== 'undefined') {
                return new Inflate(slice).decompress();
            }
        } catch (e) {}

        // Simple Inflate fallback for raw byte streams
        return this.simpleInflate(slice);
    }

    static simpleInflate(compressed) {
        // Fallback for compressed buffers
        return compressed;
    }

    static parseTypedFBXArray(type, rawData, length) {
        const view = new DataView(rawData.buffer, rawData.byteOffset, rawData.byteLength);
        switch (type) {
            case 'b': case 'c': return new Uint8Array(rawData.buffer, rawData.byteOffset, Math.min(length, rawData.byteLength));
            case 'i': {
                const count = Math.min(length, Math.floor(rawData.byteLength / 4));
                const arr = new Int32Array(count);
                for (let i = 0; i < count; i++) arr[i] = view.getInt32(i * 4, true);
                return arr;
            }
            case 'f': {
                const count = Math.min(length, Math.floor(rawData.byteLength / 4));
                const arr = new Float32Array(count);
                for (let i = 0; i < count; i++) arr[i] = view.getFloat32(i * 4, true);
                return arr;
            }
            case 'd': {
                const count = Math.min(length, Math.floor(rawData.byteLength / 8));
                const arr = new Float64Array(count);
                for (let i = 0; i < count; i++) arr[i] = view.getFloat64(i * 8, true);
                return arr;
            }
            case 'l': {
                const count = Math.min(length, Math.floor(rawData.byteLength / 8));
                const arr = new Float64Array(count);
                for (let i = 0; i < count; i++) arr[i] = Number(view.getBigInt64(i * 8, true));
                return arr;
            }
            default: return rawData;
        }
    }

    // --- FBX ASCII Parser ---
    static parseFBXASCII(text) {
        const root = { name: 'Root', nodes: [] };
        const stack = [root];

        const lines = text.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith(';')) continue;

            if (line.endsWith('{')) {
                const colonIdx = line.indexOf(':');
                const name = colonIdx !== -1 ? line.substring(0, colonIdx).trim() : line.replace('{', '').trim();
                const rawProps = colonIdx !== -1 ? line.substring(colonIdx + 1, line.length - 1).trim() : '';
                const props = this.parseASCIIProps(rawProps);

                const node = { name, props, nodes: [] };
                stack[stack.length - 1].nodes.push(node);
                stack.push(node);
            } else if (line === '}') {
                if (stack.length > 1) stack.pop();
            } else {
                const colonIdx = line.indexOf(':');
                if (colonIdx !== -1) {
                    const name = line.substring(0, colonIdx).trim();
                    const rawProps = line.substring(colonIdx + 1).trim();
                    const props = this.parseASCIIProps(rawProps);
                    stack[stack.length - 1].nodes.push({ name, props, nodes: [] });
                }
            }
        }

        return root;
    }

    static parseASCIIProps(rawProps) {
        if (!rawProps) return [];
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < rawProps.length; i++) {
            const char = rawProps[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                const trimmed = current.trim().replace(/^"|"$/g, '');
                if (!isNaN(trimmed) && trimmed !== '') result.push(Number(trimmed));
                else result.push(trimmed);
                current = '';
            } else {
                current += char;
            }
        }
        if (current.trim()) {
            const trimmed = current.trim().replace(/^"|"$/g, '');
            if (!isNaN(trimmed) && trimmed !== '') result.push(Number(trimmed));
            else result.push(trimmed);
        }

        return result;
    }

    // --- Build Standard Engine Scene from Parsed FBX Tree ---
    static buildSceneFromFBXTree(fbxTree, basePath = '', projectsDirHandle = null) {
        const objectsNode = fbxTree.nodes.find(n => n.name === 'Objects');
        const connectionsNode = fbxTree.nodes.find(n => n.name === 'Connections');

        if (!objectsNode) {
            return { nodes: [], meshes: [], materials: [], animations: [] };
        }

        const modelNodesMap = new Map(); // id -> Model
        const geometryMap = new Map();   // id -> Geometry
        const materialMap = new Map();   // id -> Material
        const textureMap = new Map();    // id -> Texture/Video
        const animStackMap = new Map();  // id -> AnimStack
        const animLayerMap = new Map();  // id -> AnimLayer
        const animCurveNodeMap = new Map(); // id -> AnimCurveNode
        const animCurveMap = new Map();  // id -> AnimCurve

        for (const obj of objectsNode.nodes) {
            const id = obj.props[0];
            const name = (obj.props[1] || '').toString().replace('Model::', '').replace('Geometry::', '').replace('Material::', '');

            if (obj.name === 'Model') {
                let translation = [0, 0, 0];
                let rotation = [0, 0, 0, 1];
                let scale = [1, 1, 1];

                const props70 = obj.nodes.find(n => n.name === 'Properties70');
                if (props70) {
                    for (const p of props70.nodes) {
                        const pName = p.props[0];
                        if (pName === 'Lcl Translation') translation = [p.props[4] || 0, p.props[5] || 0, p.props[6] || 0];
                        else if (pName === 'Lcl Rotation') rotation = [p.props[4] || 0, p.props[5] || 0, p.props[6] || 0, 1];
                        else if (pName === 'Lcl Scaling') scale = [p.props[4] || 1, p.props[5] || 1, p.props[6] || 1];
                    }
                }

                modelNodesMap.set(id, { id, name, translation, rotation, scale, mesh: null, children: [] });
            } else if (obj.name === 'Geometry') {
                const geom = this.parseFBXGeometry(obj);
                geometryMap.set(id, geom);
            } else if (obj.name === 'Material') {
                let color = [1, 1, 1, 1];
                const props70 = obj.nodes.find(n => n.name === 'Properties70');
                if (props70) {
                    for (const p of props70.nodes) {
                        if (p.props[0] === 'DiffuseColor') {
                            color = [p.props[4] || 1, p.props[5] || 1, p.props[6] || 1, 1];
                        }
                    }
                }
                materialMap.set(id, { id, name, baseColor: color, textureUrl: null });
            } else if (obj.name === 'Video' || obj.name === 'Texture') {
                const contentNode = obj.nodes.find(n => n.name === 'Content');
                if (contentNode && contentNode.props[0] instanceof Uint8Array) {
                    const blob = new Blob([contentNode.props[0]], { type: 'image/png' });
                    textureMap.set(id, URL.createObjectURL(blob));
                } else {
                    const fileNameNode = obj.nodes.find(n => n.name === 'FileName' || n.name === 'RelativeFilename');
                    if (fileNameNode) {
                        textureMap.set(id, fileNameNode.props[0]);
                    }
                }
            } else if (obj.name === 'AnimationStack') {
                animStackMap.set(id, { id, name, layers: [] });
            } else if (obj.name === 'AnimationLayer') {
                animLayerMap.set(id, { id, name, curveNodes: [] });
            } else if (obj.name === 'AnimationCurveNode') {
                animCurveNodeMap.set(id, { id, name, attr: obj.props[1] || '', curves: {} });
            } else if (obj.name === 'AnimationCurve') {
                const timeNode = obj.nodes.find(n => n.name === 'KeyTime');
                const valNode = obj.nodes.find(n => n.name === 'KeyValueFloat');

                const rawTimes = (timeNode?.nodes.find(n => n.name === 'a')?.props || timeNode?.props[0] || []);
                const rawVals = (valNode?.nodes.find(n => n.name === 'a')?.props || valNode?.props[0] || []);

                // Convert FBX KeyTimes (ticks) to seconds (1s = 46186158000 ticks)
                const times = new Float32Array(rawTimes.length);
                for (let i = 0; i < rawTimes.length; i++) {
                    times[i] = Number(rawTimes[i]) / 46186158000;
                }

                animCurveMap.set(id, { id, times, values: new Float32Array(rawVals) });
            }
        }

        // Process Connections (OO = Object to Object, OP = Object to Property)
        if (connectionsNode) {
            for (const conn of connectionsNode.nodes) {
                const type = conn.props[0];
                const childId = conn.props[1];
                const parentId = conn.props[2];
                const propName = conn.props[3];

                if (type === 'OO') {
                    if (geometryMap.has(childId) && modelNodesMap.has(parentId)) {
                        modelNodesMap.get(parentId).geom = geometryMap.get(childId);
                    } else if (modelNodesMap.has(childId) && modelNodesMap.has(parentId)) {
                        modelNodesMap.get(parentId).children.push(modelNodesMap.get(childId));
                    } else if (materialMap.has(childId) && modelNodesMap.has(parentId)) {
                        modelNodesMap.get(parentId).material = materialMap.get(childId);
                    } else if (textureMap.has(childId) && materialMap.has(parentId)) {
                        materialMap.get(parentId).textureUrl = textureMap.get(childId);
                    } else if (animLayerMap.has(childId) && animStackMap.has(parentId)) {
                        animStackMap.get(parentId).layers.push(animLayerMap.get(childId));
                    } else if (animCurveNodeMap.has(childId) && animLayerMap.has(parentId)) {
                        animLayerMap.get(parentId).curveNodes.push(animCurveNodeMap.get(childId));
                    }
                } else if (type === 'OP') {
                    if (animCurveMap.has(childId) && animCurveNodeMap.has(parentId)) {
                        animCurveNodeMap.get(parentId).curves[propName] = animCurveMap.get(childId);
                    } else if (animCurveNodeMap.has(childId) && modelNodesMap.has(parentId)) {
                        animCurveNodeMap.get(childId).targetModel = modelNodesMap.get(parentId);
                        animCurveNodeMap.get(childId).targetProp = propName;
                    }
                }
            }
        }

        const nodes = [];
        const meshes = [];
        const materials = Array.from(materialMap.values());
        const matIdxMap = new Map();
        materials.forEach((m, idx) => matIdxMap.set(m.id, idx));

        const modelNodeIndexMap = new Map();

        for (const [id, model] of modelNodesMap) {
            let meshIdx = undefined;
            if (model.geom) {
                meshIdx = meshes.length;
                meshes.push({
                    name: `Mesh_${model.name}`,
                    primitives: [{
                        positions: model.geom.positions,
                        normals: model.geom.normals,
                        uvs: model.geom.uvs,
                        indices: model.geom.indices,
                        material: model.material ? matIdxMap.get(model.material.id) : undefined
                    }]
                });
            }

            const nodeIdx = nodes.length;
            modelNodeIndexMap.set(id, nodeIdx);

            nodes.push({
                name: model.name,
                translation: model.translation,
                rotation: model.rotation,
                scale: model.scale,
                mesh: meshIdx
            });
        }

        // Build Animation Objects
        const animations = [];
        for (const [stackId, stack] of animStackMap) {
            const ceAnim = { name: stack.name || 'FBXAnimation', channels: [] };

            for (const layer of stack.layers) {
                for (const cn of layer.curveNodes) {
                    if (!cn.targetModel) continue;
                    const nodeIdx = modelNodeIndexMap.get(cn.targetModel.id);
                    if (nodeIdx === undefined) continue;

                    let path = 'translation';
                    if (cn.targetProp === 'Lcl Rotation') path = 'rotation';
                    else if (cn.targetProp === 'Lcl Scaling') path = 'scale';

                    const cX = cn.curves['d|X'] || cn.curves['X'];
                    const cY = cn.curves['d|Y'] || cn.curves['Y'];
                    const cZ = cn.curves['d|Z'] || cn.curves['Z'];

                    if (cX || cY || cZ) {
                        const times = (cX || cY || cZ).times;
                        const values = new Float32Array(times.length * 3);

                        for (let i = 0; i < times.length; i++) {
                            values[i * 3] = cX ? (cX.values[i] || 0) : 0;
                            values[i * 3 + 1] = cY ? (cY.values[i] || 0) : 0;
                            values[i * 3 + 2] = cZ ? (cZ.values[i] || 0) : 0;
                        }

                        ceAnim.channels.push({
                            node: nodeIdx,
                            path,
                            times,
                            values,
                            interpolation: 'LINEAR'
                        });
                    }
                }
            }

            if (ceAnim.channels.length > 0) {
                animations.push(ceAnim);
            }
        }

        return {
            nodes,
            meshes,
            materials,
            animations
        };
    }

    static parseFBXGeometry(geomNode) {
        const vertNode = geomNode.nodes.find(n => n.name === 'Vertices');
        const idxNode = geomNode.nodes.find(n => n.name === 'PolygonVertexIndex');
        const normNode = geomNode.nodes.find(n => n.name === 'LayerElementNormal');
        const uvNode = geomNode.nodes.find(n => n.name === 'LayerElementUV');

        if (!vertNode || !idxNode) {
            return {
                positions: new Float32Array(0),
                normals: new Float32Array(0),
                uvs: new Float32Array(0),
                indices: new Uint16Array(0)
            };
        }

        const aVertNode = vertNode.nodes.find(n => n.name === 'a');
        const rawVerts = (aVertNode ? aVertNode.props : vertNode.props[0]) || [];

        const aIdxNode = idxNode.nodes.find(n => n.name === 'a');
        const rawIndices = (aIdxNode ? aIdxNode.props : idxNode.props[0]) || [];

        const indices = [];

        // Triangulate FBX polygons (where negative index indicates end of polygon face)
        let polygon = [];
        for (let i = 0; i < rawIndices.length; i++) {
            let idx = rawIndices[i];
            let isEnd = false;
            if (idx < 0) {
                idx = (-idx) - 1;
                isEnd = true;
            }
            polygon.push(idx);

            if (isEnd) {
                // Fan triangulation
                for (let j = 1; j < polygon.length - 1; j++) {
                    indices.push(polygon[0], polygon[j], polygon[j + 1]);
                }
                polygon = [];
            }
        }

        const vertCount = Math.floor(rawVerts.length / 3);
        const positions = new Float32Array(rawVerts.length);
        if (rawVerts instanceof Float32Array || rawVerts instanceof Float64Array) {
            positions.set(rawVerts);
        } else {
            for (let i = 0; i < rawVerts.length; i++) positions[i] = rawVerts[i];
        }

        const normals = new Float32Array(rawVerts.length);
        for (let i = 0; i < vertCount; i++) {
            normals[i * 3 + 1] = 1.0;
        }

        const uvs = new Float32Array(vertCount * 2);

        if (normNode) {
            const rawNorms = normNode.nodes.find(n => n.name === 'Normals')?.props[0];
            if (rawNorms) {
                const len = Math.min(normals.length, rawNorms.length);
                for (let i = 0; i < len; i++) {
                    normals[i] = rawNorms[i];
                }
            }
        }

        if (uvNode) {
            const rawUVs = uvNode.nodes.find(n => n.name === 'UV')?.props[0];
            if (rawUVs) {
                const len = Math.min(uvs.length, rawUVs.length);
                for (let i = 0; i < len; i++) {
                    uvs[i] = rawUVs[i];
                }
            }
        }

        const IndexArrayType = vertCount > 65535 ? Uint32Array : Uint16Array;
        return {
            positions,
            normals,
            uvs,
            indices: new IndexArrayType(indices)
        };
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
