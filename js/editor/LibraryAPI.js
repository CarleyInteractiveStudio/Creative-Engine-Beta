// js/editor/LibraryAPI.js

/**
 * @namespace CreativeEngine.API
 * @description API para que las librerías interactúen y extiendan el editor.
 */

import { createFloatingPanel } from './FloatingPanelManager.js';

const registeredWindows = [];
const runtimeAPIs = {};

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

    const panelAPI = createApiForContainer(contentDiv);
    panelAPI.elemento = panelElement; // Add the top-level element reference

    return panelAPI;
}

/**
 * Factory function to create a UI API object for a given container element.
 * @param {HTMLElement} container - The container where UI elements will be added.
 * @returns {object} The API object with methods to add UI components.
 */
function createApiForContainer(container) {
    const api = {
        contenido: container,

        agregarTexto: (texto) => {
            const p = document.createElement('p');
            p.textContent = texto;
            container.appendChild(p);
            return p;
        },

        agregarBoton: (etiqueta, onClick) => {
            const btn = document.createElement('button');
            btn.textContent = etiqueta;
            btn.className = 'primary-btn';
            if (onClick) btn.addEventListener('click', onClick);
            container.appendChild(btn);
            return btn;
        },

        agregarInputTexto: (etiqueta, opciones = {}) => {
            const label = document.createElement('label');
            label.textContent = etiqueta;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = opciones.valorInicial || '';
            if (opciones.alCambiar) {
                input.addEventListener('input', (e) => opciones.alCambiar(e.target.value));
            }
            container.appendChild(label);
            container.appendChild(input);
            return input;
        },

        agregarInputNumerico: (etiqueta, opciones = {}) => {
            const label = document.createElement('label');
            label.textContent = etiqueta;
            const input = document.createElement('input');
            input.type = 'number';
            input.value = opciones.valorInicial || 0;
            if (opciones.alCambiar) {
                input.addEventListener('input', (e) => opciones.alCambiar(e.target.value));
            }
            container.appendChild(label);
            container.appendChild(input);
            return input;
        },

        agregarImagen: (options) => {
            const img = document.createElement('img');
            img.src = options.src;
            if (options.alt) img.alt = options.alt;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            container.appendChild(img);
            return img;
        },

        agregarContenedor: (options = {}) => {
            const div = document.createElement('div');
            const direction = options.direction || 'vertical'; // Default to vertical
            div.className = `lib-container lib-container-${direction}`;
            container.appendChild(div);
            // Return a new API object scoped to this new container
            return createApiForContainer(div);
        },

        agregarAreaScroll: (options = {}) => {
            const div = document.createElement('div');
            div.className = 'lib-scroll-area';
            if(options.height) {
                div.style.height = options.height;
            }
            container.appendChild(div);
            return createApiForContainer(div);
        },

        agregarVideo: (options) => {
            const video = document.createElement('video');
            video.src = options.src;
            video.controls = true;
            video.style.maxWidth = '100%';
            container.appendChild(video);
            return video;
        },

        agregarSlider: (etiqueta, options) => {
            const label = document.createElement('label');
            label.textContent = etiqueta;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = options.min || 0;
            slider.max = options.max || 100;
            slider.step = options.step || 1;
            slider.value = options.value || 50;
            container.appendChild(label);
            container.appendChild(slider);
            return slider;
        },

        agregarCheckbox: (etiqueta, checked = false) => {
            const label = document.createElement('label');
            label.className = 'checkbox-field';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = checked;
            const span = document.createElement('span');
            span.textContent = etiqueta;
            label.appendChild(checkbox);
            label.appendChild(span);
            container.appendChild(label);
            return checkbox;
        },

        agregarDropdown: (etiqueta, items) => {
            const label = document.createElement('label');
            label.textContent = etiqueta;
            const select = document.createElement('select');
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = typeof item === 'object' ? item.value : item;
                option.textContent = typeof item === 'object' ? item.text : item;
                select.appendChild(option);
            });
            container.appendChild(label);
            container.appendChild(select);
            return select;
        },

        agregarSeparador: () => {
            const hr = document.createElement('hr');
            container.appendChild(hr);
        }
    };
    return api;
}


function registrarRuntimeAPI(nombre, apiObject) {
    if (!nombre || typeof nombre !== 'string' || !apiObject || typeof apiObject !== 'object') {
        console.error("Error al registrar la API de runtime: el nombre debe ser un string y apiObject debe ser un objeto.");
        return;
    }
    if (runtimeAPIs[nombre]) {
        console.warn(`Una API de runtime con el nombre "${nombre}" ya ha sido registrada. Será sobrescrita.`);
    }
    runtimeAPIs[nombre] = apiObject;
    console.log(`API de runtime registrada: "${nombre}"`);
}


// Exponer la API en un objeto global para que sea accesible desde los scripts de las librerías
window.CreativeEngine = window.CreativeEngine || {};
window.CreativeEngine.API = {
    registrarVentana,
    crearPanel,
    registrarRuntimeAPI,
    getRegisteredWindows: () => [...registeredWindows], // Getter para uso interno del editor
    getRuntimeAPIs: () => ({ ...runtimeAPIs }) // Getter para uso interno del editor
};

export const API = window.CreativeEngine.API;
