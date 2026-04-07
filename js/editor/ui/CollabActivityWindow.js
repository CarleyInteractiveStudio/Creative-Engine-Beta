// js/editor/ui/CollabActivityWindow.js

import { API as LibraryAPI } from '../LibraryAPI.js';
import { Localization as L } from '../../engine/Localization.js';
import * as CollaborationSystem from '../CollaborationSystem.js';

let activityLog = [];
let currentTab = 'activity'; // 'activity' or 'manage'

export function show() {
    render();
}

function render() {
    const existing = document.getElementById('collab-activity-panel');
    if (existing) existing.remove();

    const panel = LibraryAPI.crearPanel({
        titulo: L.get('ACTIVIDAD_COLABORATIVA', 'Actividad Colaborativa'),
        estilo: 'carl',
        ancho: 500,
        alto: 600,
        id: 'collab-activity-panel'
    });

    // Tab Switcher
    panel.fila({ gap: '10px', padding: '10px' }, (f) => {
        const activityBtn = f.boton(L.get('ACTIVIDAD', 'Actividad'), () => {
            currentTab = 'activity';
            render();
        }, { ancho: '50%' });
        if (currentTab === 'activity') activityBtn.style.borderBottom = '2px solid #0e639c';

        const manageBtn = f.boton(L.get('GESTIONAR', 'Gestionar'), () => {
            currentTab = 'manage';
            render();
        }, { ancho: '50%' });
        if (currentTab === 'manage') manageBtn.style.borderBottom = '2px solid #0e639c';
    });

    panel.separador();

    if (currentTab === 'activity') {
        renderActivityTab(panel);
    } else {
        renderManageTab(panel);
    }
}

function renderActivityTab(panel) {
    panel.texto("Registro de cambios realizados por colaboradores:", { negrita: true });

    panel.scroll({ alto: '400px' }, (s) => {
        if (activityLog.length === 0) {
            s.texto("No hay actividad registrada aún.", { color: '#aaa', cursiva: true });
        } else {
            [...activityLog].reverse().forEach(log => {
                s.fila({ gap: '10px', padding: '5px' }, (f) => {
                    f.texto(`[${log.time}]`, { color: '#0e639c' });
                    f.texto(`<b>${log.user}</b>: ${log.action}`);
                });
            });
        }
    });

    panel.separador();
    panel.boton(L.get('LIMPIAR', 'Limpiar'), () => {
        activityLog = [];
        render();
    }, { ancho: '100%' });
}

function renderManageTab(panel) {
    panel.texto("Configuración de la Sesión:", { negrita: true });

    const perms = CollaborationSystem.getGlobalPermissions();

    panel.columna({ gap: '5px', padding: '10px' }, (col) => {
        col.checkbox("Permitir editar Escenas", perms.allowSceneEdits, (val) => {
            CollaborationSystem.updateGlobalPermissions({ allowSceneEdits: val });
        });
        col.checkbox("Permitir editar Scripts", perms.allowScriptEdits, (val) => {
            CollaborationSystem.updateGlobalPermissions({ allowScriptEdits: val });
        });
        col.checkbox("Permitir crear Assets", perms.allowAssetCreation, (val) => {
            CollaborationSystem.updateGlobalPermissions({ allowAssetCreation: val });
        });
    });

    panel.separador();
    panel.texto("Colaboradores Conectados:", { negrita: true });

    const users = CollaborationSystem.getConnectedUsers();

    panel.scroll({ alto: '250px' }, (s) => {
        if (users.length === 0) {
            s.texto("No hay colaboradores conectados.", { color: '#aaa' });
        } else {
            users.forEach(user => {
                s.fila({ gap: '10px', padding: '8px', alinear: 'center' }, (f) => {
                    f.texto(`👤 ${user.name}`, { negrita: true });
                    const time = new Date(user.joinedAt).toLocaleTimeString();
                    f.texto(`Unido: ${time}`, { tamano: '0.8em', color: '#aaa' });
                    f.boton("Expulsar", () => {
                        CollaborationSystem.kickUser(user.id);
                        render();
                    }, { color: '#ff4444', ancho: '80px', tamano: '0.8em' });
                });
            });
        }
    });
}

export function refreshManageTab() {
    if (currentTab === 'manage' && document.getElementById('collab-activity-panel')) {
        render();
    }
}

export function addLog(user, action) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    activityLog.push({ user, action, time: timeStr });

    // Auto-limit log
    if (activityLog.length > 100) activityLog.shift();
}
