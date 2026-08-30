import assert from 'node:assert';
import test from 'node:test';
import { CMModelConverter } from '../js/engine/CMModelConverter.js';

test('CMModelConverter - Texture Naming, Extraction & Association', async () => {
    const mockPositions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const mockNormals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const mockIndices = new Uint16Array([0, 1, 2]);

    const posBuf = mockPositions.buffer;
    const normBuf = mockNormals.buffer;
    const idxBuf = mockIndices.buffer;

    const totalLen = posBuf.byteLength + normBuf.byteLength + idxBuf.byteLength;
    const binChunk = new Uint8Array(totalLen);

    let offset = 0;
    binChunk.set(new Uint8Array(posBuf), offset); const posOff = offset; offset += posBuf.byteLength;
    binChunk.set(new Uint8Array(normBuf), offset); const normOff = offset; offset += normBuf.byteLength;
    binChunk.set(new Uint8Array(idxBuf), offset); const idxOff = offset; offset += idxBuf.byteLength;

    const gltfJson = {
        asset: { version: "2.0" },
        buffers: [{ byteLength: totalLen }],
        bufferViews: [
            { buffer: 0, byteOffset: posOff, byteLength: posBuf.byteLength },
            { buffer: 0, byteOffset: normOff, byteLength: normBuf.byteLength },
            { buffer: 0, byteOffset: idxOff, byteLength: idxBuf.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 2, componentType: 5123, count: 3, type: "SCALAR" }
        ],
        images: [
            { uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", name: "Albedo" }
        ],
        textures: [{ source: 0 }],
        materials: [{ name: "BodyMaterial", pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
        meshes: [{ name: "BodyMesh", primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
        nodes: [{ name: "RootNode", mesh: 0 }]
    };

    const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson));
    const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4;
    const jsonChunkLen = jsonBytes.byteLength + jsonPad;
    const binPad = (4 - (binChunk.byteLength % 4)) % 4;
    const binChunkLen = binChunk.byteLength + binPad;
    const glbTotalLen = 12 + 8 + jsonChunkLen + 8 + binChunkLen;

    const glbBuffer = new ArrayBuffer(glbTotalLen);
    const dataView = new DataView(glbBuffer);
    const u8View = new Uint8Array(glbBuffer);

    dataView.setUint32(0, 0x46546C67, true);
    dataView.setUint32(4, 2, true);
    dataView.setUint32(8, glbTotalLen, true);

    let offsetGlb = 12;
    dataView.setUint32(offsetGlb, jsonChunkLen, true);
    dataView.setUint32(offsetGlb + 4, 0x4E4F534A, true);
    offsetGlb += 8;
    u8View.set(jsonBytes, offsetGlb);
    for (let i = 0; i < jsonPad; i++) u8View[offsetGlb + jsonBytes.byteLength + i] = 0x20;
    offsetGlb += jsonChunkLen;

    dataView.setUint32(offsetGlb, binChunkLen, true);
    dataView.setUint32(offsetGlb + 4, 0x004E4942, true);
    offsetGlb += 8;
    u8View.set(binChunk, offsetGlb);

    const result = await CMModelConverter.convertGLTFToCM(glbBuffer, 'robot.glb');

    assert.ok(result.textures.length === 1, 'Should extract 1 texture');
    assert.strictEqual(result.textures[0].name, 'robot_Albedo.png', 'Texture name should be prefixed with model base name');
    assert.strictEqual(result.cmData.materials[0].texturePath, 'robot_Albedo.png', 'Material texturePath should match extracted texture name');
});
