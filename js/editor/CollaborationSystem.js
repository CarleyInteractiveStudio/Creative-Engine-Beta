/**
 * CollaborationSystem.js
 *
 * Manages P2P real-time collaboration using WebRTC (PeerJS).
 * Supports scene synchronization, script editing, and asset transfer.
 */

import { showNotification, showConfirmation } from './ui/DialogWindow.js';
import * as SceneManager from '../engine/SceneManager.js';
import * as CodeMirror from './CodeMirrorBundle.js';

let peer = null;
let connections = [];
let isHosting = false;
let collabId = null;

const COLLAB_VERSION = "1.0";

export function initialize(dom) {
    const hostBtn = document.getElementById('menu-collab-host');
    const stopBtn = document.getElementById('menu-collab-stop');
    const statusText = document.getElementById('collab-status-text');
    const codeDisplay = document.getElementById('collab-code-display');
    const copyBtn = document.getElementById('btn-copy-collab-link');
    const activeOptions = document.getElementById('collab-active-options');

    // Check if we are joining a session via URL
    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get('collab');

    if (joinId) {
        console.log(`[Collab] Intentando unirse a la sesión: ${joinId}`);
        joinSession(joinId);
    }

    hostBtn.addEventListener('click', (e) => {
        e.preventDefault();
        startHosting();
    });

    stopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        stopCollaboration();
    });

    copyBtn.addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('collab', collabId);
        navigator.clipboard.writeText(url.toString());
        showNotification(window.Localization.get('EXITO'), 'Enlace de colaboración copiado al portapapeles.');
    });

    function startHosting() {
        if (peer) return;

        statusText.textContent = 'Iniciando...';
        statusText.style.color = '#f3ca58';

        // Generate a random short ID or use a custom one if needed
        const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();

        peer = new Peer(`CE-${randomId}`, {
            debug: 1
        });

        peer.on('open', (id) => {
            isHosting = true;
            collabId = id.replace('CE-', '');
            codeDisplay.textContent = collabId;
            statusText.textContent = 'Anfitrión';
            statusText.style.color = '#00ff64';
            hostBtn.classList.add('hidden');
            activeOptions.classList.remove('hidden');
            showNotification('Colaboración Activada', `Tu código es: ${collabId}. Comparte este enlace con tus colaboradores.`);
            console.log(`[Collab] Hosting as ${id}`);
        });

        peer.on('connection', (conn) => {
            setupConnection(conn);
        });

        peer.on('error', (err) => {
            console.error('[Collab] Peer error:', err);
            stopCollaboration();
            showNotification('Error de Conexión', 'No se pudo iniciar la colaboración P2P.');
        });
    }

    async function joinSession(id) {
        statusText.textContent = 'Conectando...';
        statusText.style.color = '#f3ca58';

        peer = new Peer({ debug: 1 });

        peer.on('open', (myId) => {
            console.log(`[Collab] Client ID: ${myId}. Connecting to CE-${id}...`);
            const conn = peer.connect(`CE-${id}`, {
                metadata: { version: COLLAB_VERSION }
            });
            setupConnection(conn);
        });

        peer.on('error', (err) => {
            console.error('[Collab] Peer join error:', err);
            statusText.textContent = 'Error';
            statusText.style.color = '#ff4444';
        });
    }

    function setupConnection(conn) {
        conn.on('open', () => {
            console.log(`[Collab] Connected to ${conn.peer}`);

            if (isHosting) {
                // Security check: Ask host to accept collaborator
                showConfirmation(
                    'Nueva Conexión',
                    `Un usuario intenta unirse a tu proyecto. ¿Deseas permitirle el acceso?`,
                    () => {
                        connections.push(conn);
                        // Send initial scene state to the new collaborator
                        const sceneData = SceneManager.serializeScene(SceneManager.currentScene);
                        conn.send({ type: 'INITIAL_STATE', data: sceneData });
                        showNotification('Colaborador Unido', 'Se ha establecido la conexión.');
                    },
                    () => {
                        conn.close();
                    }
                );
            } else {
                connections.push(conn);
                statusText.textContent = 'Conectado';
                statusText.style.color = '#00ff64';
                activeOptions.classList.remove('hidden');
                hostBtn.classList.add('hidden');
                codeDisplay.textContent = id; // The remote ID
            }
        });

        conn.on('data', (data) => {
            handleReceivedData(data, conn);
        });

        conn.on('close', () => {
            connections = connections.filter(c => c !== conn);
            if (!isHosting && connections.length === 0) {
                statusText.textContent = 'Desconectado';
                statusText.style.color = '#ff4444';
            }
        });
    }

    function applyRemoteScriptEdit(data) {
        if (!window._CodeEditor) return;
        const editor = window._CodeEditor.getEditorView?.();
        const openFile = window._CodeEditor.getCurrentlyOpenFile?.();

        if (editor && openFile === data.file) {
            const changes = CodeMirror.ChangeSet.fromJSON(data.changes);
            editor.dispatch({
                changes,
                annotations: [CodeMirror.Transaction.remote.of(true)]
            });
        }
    }

    function handleReceivedData(payload, conn) {
        switch (payload.type) {
            case 'INITIAL_STATE':
                console.log("[Collab] Received initial scene state");
                SceneManager.deserializeScene(payload.data);
                if (window.updateHierarchy) window.updateHierarchy();
                if (window.updateInspector) window.updateInspector();
                break;
            case 'SCENE_UPDATE':
                applyRemoteSceneUpdate(payload.data);
                break;
            case 'SCRIPT_EDIT':
                applyRemoteScriptEdit(payload.data);
                break;
            case 'ASSET_CREATE':
                applyRemoteAssetCreate(payload.data);
                break;
            case 'CHAT':
                showNotification('Mensaje Colaborativo', payload.text);
                break;
        }
    }

    async function applyRemoteAssetCreate(data) {
        console.log("[Collab] Received remote asset:", data.path);
        // data.content is a Data URL
        const response = await fetch(data.content);
        const blob = await response.blob();

        if (window.ceCreateAsset) {
            await window.ceCreateAsset(data.path, blob);
            if (window.updateAssetBrowser) window.updateAssetBrowser();
        }
    }

    async function applyRemoteSceneUpdate(update) {
        console.log("[Collab] Applying remote scene update:", update);

        // If game is running and not paused, queue update (or skip for now per user requirement)
        if (window.isGameRunning && !window.isGamePaused) {
            console.log("[Collab] Game running, queuing update...");
            // TODO: Implementation for queuing
            return;
        }

        const scene = SceneManager.currentScene;
        if (!scene) return;

        switch (update.op) {
            case 'CREATE':
                const newMtr = await SceneManager.instanciarPrefab(update.data);
                newMtr.id = update.data.id; // Sync IDs
                break;
            case 'DELETE':
                scene.removeMateria(update.id);
                break;
            case 'MOVE':
            case 'UPDATE_PROP':
                const mtr = scene.findMateriaById(update.id);
                if (mtr) {
                    if (update.op === 'MOVE') {
                        const transform = mtr.getComponent(window.Components.Transform);
                        if (transform) transform.position = update.pos;
                    } else {
                        const comp = mtr.getComponent(window.Components[update.compType]);
                        if (comp) comp[update.prop] = update.value;
                    }
                }
                break;
        }

        if (window.updateHierarchy) window.updateHierarchy();
        if (window.updateInspector) window.updateInspector();
    }

    function stopCollaboration() {
        if (peer) {
            peer.destroy();
            peer = null;
        }
        connections.forEach(c => c.close());
        connections = [];
        isHosting = false;
        collabId = null;

        statusText.textContent = 'Desconectado';
        statusText.style.color = '#ff4444';
        hostBtn.classList.remove('hidden');
        activeOptions.classList.add('hidden');
        codeDisplay.textContent = '-----';
    }
}

/**
 * Broadcasts a surgical change to all connected peers.
 * @param {object} updateData
 */
export function broadcastUpdate(updateData) {
    if (connections.length === 0) return;

    let type = 'SCENE_UPDATE';
    if (updateData.op === 'SCRIPT_EDIT') type = 'SCRIPT_EDIT';
    else if (updateData.op === 'ASSET_CREATE') type = 'ASSET_CREATE';

    const payload = {
        type: type,
        data: updateData,
        timestamp: Date.now()
    };

    connections.forEach(conn => {
        if (conn.open) conn.send(payload);
    });
}
