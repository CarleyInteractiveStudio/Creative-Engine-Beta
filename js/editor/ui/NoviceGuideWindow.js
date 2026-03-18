// js/editor/ui/NoviceGuideWindow.js

import { API as LibraryAPI } from '../LibraryAPI.js';
import { Localization as L } from '../../engine/Localization.js';

/**
 * Muestra la ventana flotante de guía para novatos.
 * @param {Object} dom - Referencia a los elementos del DOM del editor.
 */
export function show(dom) {
    const panel = LibraryAPI.crearPanel({
        titulo: L.get('TITULO_NOVATO', '¡Bienvenido!'),
        estilo: 'carl',
        ancho: 450,
        alto: 500
    });

    panel.texto(L.get('MSG_NOVATO', 'Hola, has activado la casilla de novatos. Aquí tienes una guía básica para empezar.'), { negrita: true });

    panel.separador();

    panel.columna({ gap: '15px' }, (col) => {
        col.texto(L.get('CONSEJO_NOVATO_1', '1. Crea una Materia en la Jerarquía para empezar tu objeto.'));
        col.texto(L.get('CONSEJO_NOVATO_2', '2. Añade una Ley (Componente) en el Inspector para darle propiedades.'));
        col.texto(L.get('CONSEJO_NOVATO_3', '3. Usa Scripts (.ces) en el Navegador para programar la lógica.'));
    });

    panel.separador();

    panel.fila({ gap: '10px' }, (f) => {
        f.boton(L.get('TUTORIALES', 'Tutoriales'), () => {
            window.open('https://www.youtube.com/@CarleyInteractiveStudioOficial', '_blank');
        }, { ancho: '50%' });

        f.boton(L.get('IR_A_DOCUMENTACION', 'Ver Documentación'), () => {
            window.open('https://carleystudio.com/documentacion.html', '_blank');
        }, { color: '#2ecc71', ancho: '50%' });
    });

    panel.separador();

    const isDeactivated = !window.currentProjectConfig.isNewUser;

    panel.checkbox(L.get('DESACTIVAR_GUIA', 'Desactivar guía para este proyecto'), isDeactivated, (checked) => {
        window.currentProjectConfig.isNewUser = !checked;
        if (dom.saveProjectConfig) {
            dom.saveProjectConfig(false); // Guardar sin mostrar alerta
            console.log("Preferencia de novato actualizada:", window.currentProjectConfig.isNewUser);
        }
    });
}
