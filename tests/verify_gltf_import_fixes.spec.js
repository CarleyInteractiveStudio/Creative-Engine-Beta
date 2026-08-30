import assert from 'node:assert';
import test from 'node:test';
import { CMModelConverter } from '../js/engine/CMModelConverter.js';

test('CMModelConverter - glTF/GLB orientation, textures, animations & buffer resolution', async () => {
    // Create a mock glTF 2.0 object with positions, texture image, animation, and buffer
    const mockPositions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0
    ]);
    const mockNormals = new Float32Array([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ]);
    const mockIndices = new Uint16Array([0, 1, 2]);
    const mockAnimTimes = new Float32Array([0.0, 0.5, 1.0]);
    const mockAnimValues = new Float32Array([
        0, 0, 0,
        0, 5, 0,
        0, 0, 0
    ]);

    // Build binary chunk
    const posBuffer = mockPositions.buffer;
    const normBuffer = mockNormals.buffer;
    const idxBuffer = mockIndices.buffer;
    const timeBuffer = mockAnimTimes.buffer;
    const valBuffer = mockAnimValues.buffer;

    const totalLength = posBuffer.byteLength + normBuffer.byteLength + idxBuffer.byteLength + timeBuffer.byteLength + valBuffer.byteLength;
    const combinedBuffer = new Uint8Array(totalLength);

    let offset = 0;
    combinedBuffer.set(new Uint8Array(posBuffer), offset); const posOffset = offset; offset += posBuffer.byteLength;
    combinedBuffer.set(new Uint8Array(normBuffer), offset); const normOffset = offset; offset += normBuffer.byteLength;
    combinedBuffer.set(new Uint8Array(idxBuffer), offset); const idxOffset = offset; offset += idxBuffer.byteLength;
    combinedBuffer.set(new Uint8Array(timeBuffer), offset); const timeOffset = offset; offset += timeBuffer.byteLength;
    combinedBuffer.set(new Uint8Array(valBuffer), offset); const valOffset = offset; offset += valBuffer.byteLength;

    const gltfJson = {
        asset: { version: "2.0" },
        buffers: [{ byteLength: totalLength }],
        bufferViews: [
            { buffer: 0, byteOffset: posOffset, byteLength: posBuffer.byteLength },
            { buffer: 0, byteOffset: normOffset, byteLength: normBuffer.byteLength },
            { buffer: 0, byteOffset: idxOffset, byteLength: idxBuffer.byteLength },
            { buffer: 0, byteOffset: timeOffset, byteLength: timeBuffer.byteLength },
            { buffer: 0, byteOffset: valOffset, byteLength: valBuffer.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }, // positions
            { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" }, // normals
            { bufferView: 2, componentType: 5123, count: 3, type: "SCALAR" }, // indices
            { bufferView: 3, componentType: 5126, count: 3, type: "SCALAR" }, // times
            { bufferView: 4, componentType: 5126, count: 3, type: "VEC3" }  // values
        ],
        images: [
            { uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", name: "TestTex" }
        ],
        textures: [
            { source: 0 }
        ],
        materials: [
            { name: "TestMaterial", pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }
        ],
        meshes: [
            {
                name: "TestMesh",
                primitives: [
                    {
                        attributes: { POSITION: 0, NORMAL: 1 },
                        indices: 2,
                        material: 0
                    }
                ]
            }
        ],
        nodes: [
            { name: "TestNode", mesh: 0 }
        ],
        animations: [
            {
                name: "Walk",
                channels: [
                    { sampler: 0, target: { node: 0, path: "translation" } }
                ],
                samplers: [
                    { input: 3, output: 4, interpolation: "LINEAR" }
                ]
            }
        ]
    };

    const jsonString = JSON.stringify(gltfJson);
    const jsonBytes = new TextEncoder().encode(jsonString);

    // Build GLB
    const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4;
    const jsonChunkLen = jsonBytes.byteLength + jsonPad;
    const binPad = (4 - (combinedBuffer.byteLength % 4)) % 4;
    const binChunkLen = combinedBuffer.byteLength + binPad;
    const glbTotalLen = 12 + 8 + jsonChunkLen + 8 + binChunkLen;

    const glbBuffer = new ArrayBuffer(glbTotalLen);
    const dataView = new DataView(glbBuffer);
    const u8View = new Uint8Array(glbBuffer);

    dataView.setUint32(0, 0x46546C67, true); // 'glTF'
    dataView.setUint32(4, 2, true); // version 2
    dataView.setUint32(8, glbTotalLen, true);

    let offsetGlb = 12;
    dataView.setUint32(offsetGlb, jsonChunkLen, true);
    dataView.setUint32(offsetGlb + 4, 0x4E4F534A, true); // 'JSON'
    offsetGlb += 8;
    u8View.set(jsonBytes, offsetGlb);
    for (let i = 0; i < jsonPad; i++) u8View[offsetGlb + jsonBytes.byteLength + i] = 0x20;
    offsetGlb += jsonChunkLen;

    dataView.setUint32(offsetGlb, binChunkLen, true);
    dataView.setUint32(offsetGlb + 4, 0x004E4942, true); // 'BIN'
    offsetGlb += 8;
    u8View.set(combinedBuffer, offsetGlb);

    // Perform conversion
    const result = await CMModelConverter.convertGLTFToCM(glbBuffer, 'test_model.glb');

    assert.ok(result, 'Conversion result should exist');
    assert.ok(result.cmData, 'cmData should exist');
    assert.strictEqual(result.cmData.meshes.length, 1, 'Should extract 1 mesh');

    const primPos = result.cmData.meshes[0].primitives[0].positions;
    assert.ok(primPos, 'Positions should be extracted');

    assert.strictEqual(result.textures.length, 1, 'Should extract 1 texture');
    assert.strictEqual(result.textures[0].name, 'test_model_TestTex.png', 'Texture name should match');

    assert.strictEqual(result.animations.length, 1, 'Should extract 1 animation clip');
    assert.strictEqual(result.animations[0].name, 'Walk.cea3d', 'Animation clip name should match');
    assert.strictEqual(result.animations[0].data.name, 'Walk', 'Animation clip data name should match');
    assert.strictEqual(result.animations[0].data.channels.length, 1, 'Animation should have 1 channel');

    assert.strictEqual(result.cmData.materials[0].texturePath, 'test_model_TestTex.png', 'Material texturePath should be bound');
});
