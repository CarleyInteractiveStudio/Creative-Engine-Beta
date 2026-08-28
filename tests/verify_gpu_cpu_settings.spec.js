import assert from 'node:assert';
import test from 'node:test';

if (typeof global.window === 'undefined') {
    global.window = {
        Localization: { currentLanguage: 'ES' },
        localStorage: { getItem: () => null, setItem: () => {} },
        Dialogs: {}
    };
    global.document = {
        getElementById: () => null
    };
    try {
        Object.defineProperty(global, 'navigator', {
            value: { hardwareConcurrency: 8 },
            writable: true,
            configurable: true
        });
    } catch (e) {}
}

test('PreferencesWindow - Default CPU Cores & GPU Preference', async () => {
    const { getPreferences } = await import('../js/editor/ui/PreferencesWindow.js');
    const prefs = getPreferences();
    assert.ok(prefs, 'Preferences should exist');
    assert.ok(prefs.cpuCores >= 1, 'CPU cores should be at least 1');
    assert.strictEqual(prefs.gpuPreference, 'high-performance', 'GPU preference should default to high-performance');
});

test('CMModelConverter & Texture Resolution - Extracted Model Textures', async () => {
    const { CMModelConverter } = await import('../js/engine/CMModelConverter.js');
    const mockJson = {
        asset: { version: "2.0" },
        buffers: [{ byteLength: 36 }],
        bufferViews: [
            { buffer: 0, byteOffset: 0, byteLength: 36 }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }
        ],
        images: [
            { uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", name: "ModelAlbedo" }
        ],
        textures: [{ source: 0 }],
        materials: [{ name: "PBRMat", pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
        nodes: [{ mesh: 0 }]
    };

    const result = await CMModelConverter.convertGLTFToCM(new TextEncoder().encode(JSON.stringify(mockJson)).buffer, 'character.gltf');
    assert.ok(result, 'Result should exist');
    assert.strictEqual(result.textures.length, 1, 'Should extract 1 texture');
    assert.strictEqual(result.textures[0].name, 'ModelAlbedo.png', 'Extracted texture name should match');
    assert.strictEqual(result.cmData.materials[0].texturePath, 'ModelAlbedo.png', 'Material texturePath should be bound');
});
