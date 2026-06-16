/**
 * CollaborationSystem.js
 *
 * Manages P2P real-time collaboration using WebRTC (PeerJS).
 * Supports scene synchronization, script editing, and asset transfer.
 */

import { showNotification, showConfirmation } from './ui/DialogWindow.js';
import * as SceneManager from '../engine/SceneManager.js';
import * as CodeMirror from './CodeMirrorBundle.js';
import * as CollabActivityWindow from './ui/CollabActivityWindow.js';
import * as HFProvider from './HFCollaborationProvider.js';

let peer = null;
let connections = [];
let isHosting = false;
let collabId = null;
let isHFMode = false;

// Administration state
const permissions = {
    allowSceneEdits: true,
    allowScriptEdits: true,
    allowAssetCreation: true
};

const COLLAB_VERSION = "1.0";

export function initialize(dom) {
    window._CollabSystem = {
        startHosting,
        startHFHosting,
        stopCollaboration,
        updateMenuVisibility
    };

    const hostBtn = document.getElementById('menu-collab-host');
    const stopBtn = document.getElementById('menu-collab-stop');
    const statusText = document.getElementById('collab-status-text');
    const codeDisplay = document.getElementById('collab-code-display');
    const copyBtn = document.getElementById('btn-copy-collab-link');
    const activeOptions = document.getElementById('collab-active-options');

    // Hook into remote sync from HFProvider
    window.addEventListener('CE_REMOTE_SYNC', (e) => {
        handleReceivedData({ type: 'SCENE_UPDATE', data: e.detail }, null);
    });

    // Check if we are joining a session via URL
    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get('collab');
    const relayUrl = urlParams.get('relay');

    if (joinId) {
        if (relayUrl) {
            console.log(`[Collab] Intentando unirse a sesión PRO: ${joinId} vía ${relayUrl}`);
            joinHFSession(joinId, relayUrl);
        } else {
            console.log(`[Collab] Intentando unirse a sesión P2P: ${joinId}`);
            joinSession(joinId);
        }
    }

    hostBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showConfirmation(
            'Tipo de Colaboración',
            '¿Deseas iniciar una colaboración local (P2P) o una colaboración Online (Modo Pro)?',
            () => startHFHosting(), // Acepta -> Pro
            () => startHosting(),   // Cancela -> Local (o podemos añadir un tercer botón en el futuro)
            'Online (Pro)',
            'Local (P2P)'
        );
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

    function updateMenuVisibility() {
        const collabBtn = document.getElementById('menubar-collab-btn');
        const settingsP2P = document.getElementById('settings-collab-p2p-btn');
        const settingsPro = document.getElementById('settings-collab-pro-btn');
        const settingsStop = document.getElementById('settings-collab-stop-btn');

        if (collabId || peer || isHosting) {
            if (collabBtn) collabBtn.classList.remove('hidden');
            if (settingsP2P) settingsP2P.classList.add('hidden');
            if (settingsPro) settingsPro.classList.add('hidden');
            if (settingsStop) settingsStop.classList.remove('hidden');
        } else {
            if (collabBtn) collabBtn.classList.add('hidden');
            if (settingsP2P) settingsP2P.classList.remove('hidden');
            if (settingsPro) settingsPro.classList.remove('hidden');
            if (settingsStop) settingsStop.classList.add('hidden');
        }
    }

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
            isHFMode = false;
            collabId = id.replace('CE-', '');
            codeDisplay.textContent = collabId;
            statusText.textContent = 'Anfitrión (Local)';
            statusText.style.color = '#00ff64';
            hostBtn.classList.add('hidden');
            activeOptions.classList.remove('hidden');
            updateMenuVisibility();
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

    async function startHFHosting() {
        // Verificar si el usuario está logueado antes de empezar Pro
        if (window.auth) {
            const user = await window.auth.getUser();
            if (!user) {
                showNotification('Acceso Denegado', 'Debes iniciar sesión con tu cuenta de Carley Studio para hospedar una colaboración online.', 'error');
                window.auth.openAuthModal();
                return;
            }
        }

        // Usar URL por defecto de Hugging Face
        const relayUrl = "https://carley1234-colabce.hf.space";

        statusText.textContent = 'Iniciando Pro...';
        statusText.style.color = '#f3ca58';

        try {
            const code = await HFProvider.hostSession(relayUrl);
            isHosting = true;
            isHFMode = true;
            collabId = code;
            codeDisplay.textContent = code;
            statusText.textContent = 'Anfitrión (Online)';
            statusText.style.color = '#f3ca58';
            hostBtn.classList.add('hidden');
            activeOptions.classList.remove('hidden');
            updateMenuVisibility();
            showNotification('Colaboración Pro Activada', `Tu código es: ${code}. El proyecto está en línea.`);
        } catch (err) {
            console.error('[Collab] HF Host error:', err);
            showNotification('Error de Conexión', 'No se pudo conectar con Hugging Face.');
            stopCollaboration();
        }
    }

    async function joinHFSession(id, relayUrl) {
        statusText.textContent = 'Conectando Pro...';
        statusText.style.color = '#f3ca58';

        try {
            await HFProvider.joinSession(id, relayUrl);
            isHosting = false;
            isHFMode = true;
            collabId = id;
            statusText.textContent = 'Conectado (Online)';
            statusText.style.color = '#00ff64';
            activeOptions.classList.remove('hidden');
            hostBtn.classList.add('hidden');
            codeDisplay.textContent = id;
            updateMenuVisibility();
        } catch (err) {
            console.error('[Collab] HF Join error:', err);
            statusText.textContent = 'Error';
            statusText.style.color = '#ff4444';
            showNotification('Error de Conexión', err);
        }
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
            updateMenuVisibility();

            if (isHosting) {
                // Security check: Ask host to accept collaborator
                showConfirmation(
                    'Nueva Conexión',
                    `Un usuario "${conn.peer.replace('CE-', '')}" intenta unirse a tu proyecto. ¿Deseas permitirle el acceso?`,
                    () => {
                        conn.metadata = { name: conn.peer.replace('CE-', ''), joinedAt: Date.now() };
                        connections.push(conn);
                        // Send initial scene state to the new collaborator
                        const sceneData = SceneManager.serializeScene(SceneManager.currentScene);
                        conn.send({ type: 'INITIAL_STATE', data: sceneData });
                        showNotification('Colaborador Unido', 'Se ha establecido la conexión.');
                        if (CollabActivityWindow && CollabActivityWindow.refreshManageTab) {
                            CollabActivityWindow.refreshManageTab();
                        }
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
                codeDisplay.textContent = conn.peer.replace('CE-', ''); // The remote ID
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
        if (isHosting && CollabActivityWindow && CollabActivityWindow.refreshManageTab) {
            CollabActivityWindow.refreshManageTab();
            }
        });
    }

    function applyRemoteScriptEdit(data, conn) {
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

        if (isHosting) {
            CollabActivityWindow.addLog(conn.peer.replace('CE-', ''), `Modificó el archivo script: ${data.file}`);
        }
    }

    function handleReceivedData(payload, conn) {
        // If we are host, check permissions before applying (in case of hacked client)
        if (isHosting) {
            if (payload.type === 'SCENE_UPDATE' && !permissions.allowSceneEdits) return;
            if (payload.type === 'SCRIPT_EDIT' && !permissions.allowScriptEdits) return;
            if (payload.type === 'ASSET_CREATE' && !permissions.allowAssetCreation) return;
        }

        switch (payload.type) {
            case 'INITIAL_STATE':
                console.log("[Collab] Received initial scene state");
                SceneManager.deserializeScene(payload.data);
                if (window.updateHierarchy) window.updateHierarchy();
                if (window.updateInspector) window.updateInspector();
                break;
            case 'SCENE_UPDATE':
                applyRemoteSceneUpdate(payload.data, conn);
                break;
            case 'SCRIPT_EDIT':
                applyRemoteScriptEdit(payload.data, conn);
                break;
            case 'ASSET_CREATE':
                applyRemoteAssetCreate(payload.data, conn);
                break;
            case 'KICK':
                showNotification('Desconectado', 'Has sido expulsado de la sesión por el anfitrión.', 'error');
                stopCollaboration();
                break;
            case 'PERMISSIONS_UPDATE':
                Object.assign(permissions, payload.data);
                showNotification('Permisos Actualizados', 'El anfitrión ha modificado los permisos de colaboración.');
                break;
            case 'CHAT':
                showNotification('Mensaje Colaborativo', payload.text);
                break;
        }
    }

    async function applyRemoteAssetCreate(data, conn) {
        console.log("[Collab] Received remote asset:", data.path);
        // data.content is a Data URL
        const response = await fetch(data.content);
        const blob = await response.blob();

        if (window.ceCreateAsset) {
            await window.ceCreateAsset(data.path, blob);
            if (window.updateAssetBrowser) window.updateAssetBrowser();
        }

        if (isHosting) {
            CollabActivityWindow.addLog(conn.peer.replace('CE-', ''), `Creó el asset: ${data.path}`);
        }
    }

    async function applyRemoteSceneUpdate(update, conn) {
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
                if (isHosting) CollabActivityWindow.addLog(conn.peer.replace('CE-', ''), `Eliminó el objeto ID: ${update.id}`);
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
        if (isHFMode) {
            HFProvider.disconnect();
        }
        connections.forEach(c => c.close());
        connections = [];
        isHosting = false;
        isHFMode = false;
        collabId = null;

        statusText.textContent = 'Desconectado';
        statusText.style.color = '#ff4444';
        hostBtn.classList.remove('hidden');
        activeOptions.classList.add('hidden');
        codeDisplay.textContent = '-----';
        updateMenuVisibility();
    }

    // Initial sync
    updateMenuVisibility();
}

// --- Administration API ---

export function getConnectedUsers() {
    return connections.map(c => ({
        id: c.peer,
        name: c.metadata?.name || c.peer.replace('CE-', ''),
        joinedAt: c.metadata?.joinedAt || Date.now()
    }));
}

export function kickUser(peerId) {
    const conn = connections.find(c => c.peer === peerId);
    if (conn) {
        conn.send({ type: 'KICK' });
        setTimeout(() => conn.close(), 500);
        showNotification('Usuario Expulsado', `Has expulsado a ${conn.metadata?.name || peerId}`);
    }
}

export function getGlobalPermissions() {
    return { ...permissions };
}

export function updateGlobalPermissions(newPermissions) {
    Object.assign(permissions, newPermissions);
    // Notify all collaborators
    connections.forEach(conn => {
        if (conn.open) conn.send({ type: 'PERMISSIONS_UPDATE', data: permissions });
    });
}

/**
 * Broadcasts a surgical change to all connected peers.
 * @param {object} updateData
 */
export function broadcastUpdate(updateData) {
    if (isHFMode) {
        HFProvider.broadcast(updateData);
        return;
    }

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
