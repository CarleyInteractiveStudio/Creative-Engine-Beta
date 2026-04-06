// js/editor/ui/UpdatesWindow.js

import { API as LibraryAPI } from '../LibraryAPI.js';
import { Localization as L } from '../../engine/Localization.js';

let currentStep = 0;
const updates = [
    {
        date: "3/4/2026",
        title: "Creative Code v4.6",
        desc: "Mejora quirúrgica de la inteligencia artificial. Detección de intención (Movimiento, Física, Combate) para evitar códigos irrelevantes, prevención de redundancia en variables y reparación automática de sintaxis.",
        icon: "🚀"
    },
    {
        date: "6/4/2026",
        title: "Desarrollo Colaborativo Local",
        desc: "Sistema P2P basado en WebRTC para trabajar en tiempo real con otros desarrolladores. Sincronización instantánea de escenas, scripts y assets sin servidores externos.",
        icon: "👥"
    }
];

export function show() {
    currentStep = 0;
    render();
}

function render() {
    const update = updates[currentStep];

    const panel = LibraryAPI.crearPanel({
        titulo: L.get('ACTUALIZACIONES', 'Actualizaciones'),
        estilo: 'carl',
        ancho: 400,
        alto: 350,
        id: 'updates-panel' // Fixed ID for verification and styling consistency
    });

    panel.columna({ gap: '20px', padding: '20px' }, (col) => {
        col.texto(`${update.icon} Actualización ${update.date}`, { negrita: true, tamano: '1.2em' });
        col.texto(update.title, { negrita: true, color: '#0e639c' });
        col.texto(update.desc);

        col.separador();

        col.fila({ gap: '10px', justicia: 'flex-end' }, (f) => {
            if (currentStep < updates.length - 1) {
                f.boton(L.get('SIGUIENTE', 'Siguiente'), () => {
                    currentStep++;
                    // We need to clear and re-render or close and open new.
                    // LibraryAPI panels usually stay until closed.
                    // For simplicity in this implementation, we close and open.
                    const existing = document.getElementById('updates-window-panel');
                    if (existing) existing.remove();
                    render();
                });
            } else {
                f.boton(L.get('CERRAR', 'Cerrar'), () => {
                    const existing = document.getElementById('updates-window-panel');
                    if (existing) existing.remove();
                });
            }
        });
    });
}
