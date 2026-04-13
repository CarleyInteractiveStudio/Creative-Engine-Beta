/**
 * CE Relay Server - Hugging Face Edition
 * Optimized for 10k users via Room-based architecture.
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 7860;
const PROJECT_TTL = 3 * 60 * 1000; // 3 minutes

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('CE Relay Server is running.');
});

const wss = new WebSocket.Server({ server });

// Room-based storage
// rooms: Map<code, Set<ws>>
const rooms = new Map();

// Project storage: Map<code, { hostId: string, data: any, timeout: NodeJS.Timeout }>
const activeProjects = new Map();

// Client info: Map<ws, { code: string, id: string }>
const clients = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const payload = JSON.parse(message);
            handleMessage(ws, payload);
        } catch (e) {
            console.error('[Server] Invalid message format');
        }
    });

    ws.on('close', () => {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
            leaveRoom(ws, clientInfo.code);
            broadcast(clientInfo.code, {
                type: 'USER_DISCONNECTED',
                id: clientInfo.id
            }, ws);
            clients.delete(ws);
        }
    });
});

function handleMessage(ws, payload) {
    const { type, code, id, data } = payload;

    switch (type) {
        case 'HOST_PROJECT':
            joinRoom(ws, code);

            // Cleanup existing TTL for this code if host re-hosts
            const existing = activeProjects.get(code);
            if (existing && existing.timeout) clearTimeout(existing.timeout);

            const timeout = setTimeout(() => {
                console.log(`[Server] Project ${code} TTL expired. Wiping data.`);
                const p = activeProjects.get(code);
                if (p) p.data = null;
                // We keep the entry so we know who the host is, but wipe the heavy 'data'
            }, PROJECT_TTL);

            activeProjects.set(code, { hostId: id, data, timeout });
            clients.set(ws, { code, id });
            ws.send(JSON.stringify({ type: 'HOST_CONFIRMED', code }));
            break;

        case 'JOIN_PROJECT':
            const project = activeProjects.get(code);
            if (project) {
                joinRoom(ws, code);
                clients.set(ws, { code, id });
                ws.send(JSON.stringify({
                    type: 'JOIN_SUCCESS',
                    code,
                    projectData: project.data
                }));
                broadcast(code, { type: 'USER_JOINED', id }, ws);
            } else {
                ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Proyecto expirado o no existe' }));
            }
            break;

        case 'SYNC_UPDATE':
            broadcast(code, { type: 'SYNC_UPDATE', origin: id, data }, ws);
            break;

        case 'RE_UPLOAD_PROJECT':
            const p = activeProjects.get(code);
            if (p && p.hostId === id) {
                if (p.timeout) clearTimeout(p.timeout);
                p.data = data;
                p.timeout = setTimeout(() => { p.data = null; }, PROJECT_TTL);
                ws.send(JSON.stringify({ type: 'RE_UPLOAD_CONFIRMED' }));
            }
            break;

        case 'PING':
            ws.send(JSON.stringify({ type: 'PONG' }));
            break;
    }
}

function joinRoom(ws, code) {
    if (!rooms.has(code)) rooms.set(code, new Set());
    rooms.get(code).add(ws);
}

function leaveRoom(ws, code) {
    const room = rooms.get(code);
    if (room) {
        room.delete(ws);
        if (room.size === 0) {
            rooms.delete(code);
            // If room is empty, we can also wipe the project immediately if we want
            const p = activeProjects.get(code);
            if (p) {
                if (p.timeout) clearTimeout(p.timeout);
                activeProjects.delete(code);
            }
        }
    }
}

function broadcast(code, payload, excludeWs = null) {
    const room = rooms.get(code);
    if (!room) return;

    const message = JSON.stringify(payload);
    for (const ws of room) {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    }
}

server.listen(PORT, () => {
    console.log(`Relay server listening on port ${PORT}`);
});
