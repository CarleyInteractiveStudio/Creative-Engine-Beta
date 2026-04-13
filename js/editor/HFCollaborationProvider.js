/**
 * HFCollaborationProvider.js
 *
 * Provides professional collaboration features using Hugging Face as a Relay
 * and Supabase for session management. Handles project packaging,
 * encryption (AES-GCM), and real-time synchronization.
 */

import { showNotification } from './ui/DialogWindow.js';
import * as SceneManager from '../engine/SceneManager.js';
import { getFileHandleForPath } from '../engine/AssetUtils.js';

let socket = null;
let currentCode = null;
let currentRelayUrl = null;
let encryptionKey = null;
let isHostInstance = false;
let myId = null;
const RELAY_TTL = 3 * 60 * 1000; // 3 min matching server

/**
 * Initializes a new collaboration session.
 * @param {string} relayUrl - Hugging Face Space URL (e.g., https://user-space.hf.space)
 */
export async function hostSession(relayUrl) {
    if (socket) disconnect();

    currentRelayUrl = relayUrl.replace('http', 'ws');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    currentCode = code;

    // Derived key from the code for encryption
    encryptionKey = await deriveKey(code);

    try {
        isHostInstance = true;
        myId = 'host-' + Math.random().toString(36).substring(2, 5);
        const projectData = await packageProject();
        const encryptedData = await encryptData(projectData, encryptionKey);

        return new Promise((resolve, reject) => {
            socket = new WebSocket(currentRelayUrl);

            socket.onopen = () => {
                socket.send(JSON.stringify({
                    type: 'HOST_PROJECT',
                    code: code,
                    id: myId,
                    data: encryptedData
                }));
            };

            socket.onmessage = async (msg) => {
                const payload = JSON.parse(msg.data);
                if (payload.type === 'HOST_CONFIRMED') {
                    // Register in Supabase
                    const success = await registerInSupabase(code, relayUrl);
                    if (success) {
                        setupHeartbeat();
                        resolve(code);
                    } else {
                        reject('Error al registrar en Supabase');
                    }
                }
                handleSocketMessage(payload);
            };

            socket.onerror = (err) => reject(err);
        });
    } catch (err) {
        console.error('[HFCollab] Host failed:', err);
        throw err;
    }
}

/**
 * Joins an existing collaboration session.
 */
export async function joinSession(code, relayUrl) {
    if (socket) disconnect();

    isHostInstance = false;
    currentCode = code;
    currentRelayUrl = relayUrl.replace('http', 'ws');
    encryptionKey = await deriveKey(code);
    myId = 'user-' + Math.random().toString(36).substring(2, 5);

    return new Promise((resolve, reject) => {
        socket = new WebSocket(currentRelayUrl);

        socket.onopen = () => {
            socket.send(JSON.stringify({
                type: 'JOIN_PROJECT',
                code: code,
                id: myId
            }));
        };

        socket.onmessage = async (msg) => {
            const payload = JSON.parse(msg.data);

            if (payload.type === 'JOIN_SUCCESS') {
                if (payload.projectData) {
                    const decrypted = await decryptData(payload.projectData, encryptionKey);
                    await unpackProject(decrypted);
                    resolve(true);
                } else {
                    // Project expired in RAM, need to request from host or wait
                    showNotification('Sesión Iniciada', 'Esperando datos del anfitrión...');
                    resolve(true);
                }
            } else if (payload.type === 'JOIN_ERROR') {
                reject(payload.message);
            }

            handleSocketMessage(payload);
        };

        socket.onerror = (err) => reject(err);
    });
}

async function handleSocketMessage(payload) {
    switch (payload.type) {
        case 'SYNC_UPDATE':
            const update = await decryptData(payload.data, encryptionKey);
            applyRemoteUpdate(update);
            break;
        case 'USER_JOINED':
            showNotification('Colaboración', `Un nuevo usuario se ha unido: ${payload.id}`);
            // If I am the host and someone joins, I should refresh the RAM storage on the relay
            // to ensure future joiners also get the data, or if this user got null data.
            checkAndReUpload();
            break;
        case 'USER_DISCONNECTED':
            showNotification('Colaboración', `Usuario desconectado: ${payload.id}`);
            break;
        case 'JOIN_SUCCESS':
            if (!payload.projectData) {
                // If we joined but data was null (expired), the host will detect USER_JOINED and re-upload
                showNotification('Sesión Iniciada', 'El proyecto en el servidor ha expirado. Solicitando datos al anfitrión...');
            }
            break;
    }
}

let lastUploadTime = 0;
async function checkAndReUpload() {
    if (!isHostInstance || !socket || socket.readyState !== WebSocket.OPEN) return;

    const now = Date.now();
    // Don't re-upload more than once every 2 minutes unless forced
    if (now - lastUploadTime < 2 * 60 * 1000) return;

    console.log('[HFCollab] New user detected, refreshing project data on relay.');
    try {
        const projectData = await packageProject();
        const encryptedData = await encryptData(projectData, encryptionKey);

        socket.send(JSON.stringify({
            type: 'RE_UPLOAD_PROJECT',
            code: currentCode,
            id: myId,
            data: encryptedData
        }));
        lastUploadTime = now;
    } catch (e) {
        console.error('[HFCollab] Re-upload failed:', e);
    }
}

function applyRemoteUpdate(update) {
    // This will interface with SceneManager and CodeEditorWindow
    // Similar to CollaborationSystem.js but using our decoupled provider
    console.log('[HFCollab] Remote update received:', update);
    window.dispatchEvent(new CustomEvent('CE_REMOTE_SYNC', { detail: update }));
}

/**
 * Broadcasts a change to all peers.
 */
export async function broadcast(data) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const encrypted = await encryptData(data, encryptionKey);
    socket.send(JSON.stringify({
        type: 'SYNC_UPDATE',
        code: currentCode,
        data: encrypted
    }));
}

export function disconnect() {
    if (socket) {
        socket.close();
        socket = null;
    }
    // Security cleanup
    cleanupSensitiveData();
}

/**
 * Packaging: Project -> JSON -> GZIP -> Encrypted
 */
async function packageProject() {
    const sceneData = SceneManager.serializeScene(SceneManager.currentScene);

    // Collect assets (this is simplified, ideally we crawl the scene)
    // For a "Pro" version, we include all files in Assets/
    const assets = await collectAssets();

    const projectPackage = {
        version: '1.0',
        scene: sceneData,
        assets: assets,
        timestamp: Date.now()
    };

    const json = JSON.stringify(projectPackage);
    return await compressString(json);
}

async function unpackProject(compressedData) {
    const json = await decompressString(compressedData);
    const projectPackage = JSON.parse(json);

    // 1. Load Assets into virtual FS / IndexedDB
    for (const asset of projectPackage.assets) {
        await saveAssetLocally(asset.path, asset.data);
    }

    // 2. Load Scene
    const scene = await SceneManager.deserializeScene(projectPackage.scene, window.projectsDirHandle);
    SceneManager.setCurrentScene(scene);

    if (window.updateHierarchy) window.updateHierarchy();
    if (window.updateAssetBrowser) window.updateAssetBrowser();
}

async function collectAssets() {
    // In a real browser environment with FileSystemHandle, we'd iterate the directory.
    // For this implementation, we'll focus on the currently used assets in the scene.
    const assets = [];
    const materias = SceneManager.currentScene.getAllMaterias();

    const paths = new Set();
    materias.forEach(m => {
        m.leyes.forEach(l => {
            if (l.source) paths.add(l.source);
            if (l.spriteAssetPath) paths.add(l.spriteAssetPath);
            if (l.scriptPath) paths.add(l.scriptPath);
        });
    });

    for (const path of paths) {
        try {
            const handle = await getFileHandleForPath(path, window.projectsDirHandle);
            if (handle) {
                const file = await handle.getFile();
                const reader = new FileReader();
                const base64 = await new Promise(resolve => {
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(file);
                });
                assets.push({ path, data: base64 });
            }
        } catch (e) { console.warn(`Asset ${path} not found for packaging.`); }
    }
    return assets;
}

async function saveAssetLocally(path, base64) {
    // Logic to write to window.projectsDirHandle
    // Similar to ceCreateAsset in CollaborationSystem.js
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray]);

    if (window.ceCreateAsset) {
        await window.ceCreateAsset(path, blob);
    }
}

/**
 * Encryption Helpers using SubtleCrypto
 */
async function deriveKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", enc.encode(password),
        { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("ce-salt-2024"),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false, ["encrypt", "decrypt"]
    );
}

async function encryptData(data, key) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = typeof data === 'string' ? enc.encode(data) : data;
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key, plaintext
    );

    // Combine IV + Ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Return as Base64 for transport (Robust way for large data)
    return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(new Blob([combined]));
    });
}

async function decryptData(base64, key) {
    // Robust decoding of large Base64 strings
    const binString = atob(base64);
    const combined = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
        combined[i] = binString.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key, ciphertext
    );

    return new TextDecoder().decode(decrypted);
}

/**
 * Compression Helpers
 */
async function compressString(str) {
    const stream = new Blob([str]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
    const response = await new Response(compressedStream);
    const blob = await response.blob();
    return new Uint8Array(await blob.arrayBuffer());
}

async function decompressString(data) {
    const stream = new Blob([data]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"));
    const response = await new Response(decompressedStream);
    return await response.text();
}

/**
 * Supabase Integration
 */
async function registerInSupabase(code, relayUrl) {
    if (!window.auth || !window.auth._supabase) return false;

    const { data: { user } } = await window.auth._supabase.auth.getUser();
    if (!user) return false;

    const { error } = await window.auth._supabase
        .from('proyectos_activos')
        .insert([{
            codigo: code,
            host_id: user.id,
            url_hf: relayUrl,
            metadata: {
                projectName: new URLSearchParams(window.location.search).get('project'),
                hostName: user.user_metadata.full_name || user.email
            }
        }]);

    return !error;
}

function setupHeartbeat() {
    setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'PING' }));
        }
    }, 30000);
}

async function cleanupSensitiveData() {
    console.log('[HFCollab] Security cleanup triggered.');

    // Safety check: Only wipe if we are a guest, NOT the host.
    // The host should never have their own project files deleted!
    if (!isHostInstance) {
        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            if (projectName && window.projectsDirHandle) {
                // Attempt to remove the project folder from IndexedDB/OPFS
                // This prevents "filtraciones" as requested.
                await window.projectsDirHandle.removeEntry(projectName, { recursive: true });
                console.log(`[HFCollab] Project ${projectName} wiped from guest device.`);
            }
        } catch (e) {
            console.warn('[HFCollab] Failed to wipe temporary project files:', e);
        }
        alert('La sesión colaborativa ha terminado. Por seguridad, el proyecto temporal ha sido borrado de este dispositivo.');
    } else {
        alert('La sesión de colaboración ha finalizado.');
    }

    // Refreshing the page is a scorched-earth but effective policy for RAM
    window.location.href = 'index.html';
}
