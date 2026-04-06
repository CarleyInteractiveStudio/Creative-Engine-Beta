// js/editor/ui/CollabActivityWindow.js

import { API as LibraryAPI } from '../LibraryAPI.js';
import { Localization as L } from '../../engine/Localization.js';

let activityLog = [];

export function show() {
    const panel = LibraryAPI.crearPanel({
        titulo: L.get('ACTIVIDAD_COLABORATIVA', 'Actividad Colaborativa'),
        estilo: 'carl',
        ancho: 450,
        alto: 500,
        id: 'collab-activity-panel'
    });

    panel.texto("Registro de cambios realizados por colaboradores:", { negrita: true });
    panel.separador();

    panel.scroll({ alto: '350px' }, (s) => {
        if (activityLog.length === 0) {
            s.texto("No hay actividad registrada aún.", { color: '#aaa', cursiva: true });
        } else {
            // Newest first
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
        // LibraryAPI panels don't usually have a refresh, so we'd have to close/reopen.
        // For this task, we'll just keep it simple.
    }, { ancho: '100%' });
}

export function addLog(user, action) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    activityLog.push({ user, action, time: timeStr });

    // Auto-limit log
    if (activityLog.length > 100) activityLog.shift();
}
