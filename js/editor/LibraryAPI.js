// js/editor/LibraryAPI.js

/**
 * @namespace CreativeEngine.API
 * @description API para que las librerías interactúen y extiendan el editor.
 */

import { createFloatingPanel } from './FloatingPanelManager.js';

const registeredWindows = [];

/**
 * Registra una nueva ventana de librería en el menú principal "Ventana > Librerías".
 * @param {object} options - Opciones de configuración para la ventana.
 * @param {string} options.nombre - El nombre que aparecerá en el menú.
 * @param {function} options.alAbrir - La función que se llamará cuando el usuario haga clic en el menú.
 *                                     Esta función recibirá un objeto `panel` para construir la UI.
 */
function registrarVentana(options) {
    if (!options || !options.nombre || typeof options.alAbrir !== 'function') {
        console.error("Error al registrar la ventana: el nombre y la función 'alAbrir' son obligatorios.");
        return;
    }
    registeredWindows.push(options);
    console.log(`Ventana de librería registrada: "${options.nombre}"`);
}

/**
 * Crea y devuelve un nuevo panel flotante.
 * Esta es la función que se llamará internamente cuando un usuario abra una ventana de librería.
 * @param {object} options - Opciones para el panel.
 * @param {string} options.titulo - El título que se mostrará en la cabecera del panel.
 * @returns {object} Un objeto que representa el panel, con métodos para añadirle contenido.
 */
function crearPanel(options) {
    const panelId = `library-panel-${Math.random().toString(36).substr(2, 9)}`;
    const panelElement = createFloatingPanel(panelId, {
        title: options.titulo || 'Panel de Librería',
        content: '', // Start with empty content
        width: options.width || 400,
        height: options.height || 300
    });

    // Add a specific class for library panels to style them
    panelElement.querySelector('.panel-content').classList.add('library-api-content');
    const contentDiv = panelElement.querySelector('.panel-content');

    // Métodos que la librería podrá usar
    const panelAPI = {
        elemento: panelElement,
        contenido: contentDiv,

        agregarTexto: (texto) => {
            const p = document.createElement('p');
            p.textContent = texto;
            contentDiv.appendChild(p);
        },

        agregarBoton: (etiqueta, onClick) => {
            const btn = document.createElement('button');
            btn.textContent = etiqueta;
            btn.className = 'primary-btn'; // O una clase genérica de botón del editor
            btn.addEventListener('click', onClick);
            contentDiv.appendChild(btn);
        },

        agregarInputTexto: (etiqueta, valorInicial = '') => {
            const label = document.createElement('label');
            label.textContent = etiqueta;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = valorInicial;
            contentDiv.appendChild(label);
            contentDiv.appendChild(input);
            return input; // Devolver para que la librería pueda leer su valor
        },

        agregarInputNumerico: (etiqueta, valorInicial = 0) => {
            const label = document.createElement('label');
            label.textContent = etiqueta;
            const input = document.createElement('input');
            input.type = 'number';
            input.value = valorInicial;
            contentDiv.appendChild(label);
            contentDiv.appendChild(input);
            return input;
        }
    };

    return panelAPI;
}


// Exponer la API en un objeto global para que sea accesible desde los scripts de las librerías
window.CreativeEngine = window.CreativeEngine || {};
window.CreativeEngine.API = {
    registrarVentana,
    crearPanel,
    getRegisteredWindows: () => [...registeredWindows] // Getter para uso interno del editor
};

export const API = window.CreativeEngine.API;
