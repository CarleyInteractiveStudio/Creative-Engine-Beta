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
 * @param {object} options - Opciones para el panel.
 */
function crearPanel(options) {
    const panelId = `library-panel-${Math.random().toString(36).substr(2, 9)}`;

    // Style handling
    let className = '';
    if (options.estilo === 'carl') className = 'ce-window-carl';
    if (options.estilo === 'moderno') className = 'ce-window-modern';

    const panelElement = createFloatingPanel(panelId, {
        title: options.titulo || 'Panel de Librería',
        content: '',
        width: options.width || options.ancho || 400,
        height: options.height || options.alto || 300,
        className: className
    });

    panelElement.querySelector('.panel-content').classList.add('library-api-content');
    const contentDiv = panelElement.querySelector('.panel-content');

    const panelAPI = createApiForContainer(contentDiv);
    panelAPI.elemento = panelElement;

    return panelAPI;
}

/**
 * Factory function to create a UI API object for a given container element.
 */
function createApiForContainer(container) {
    const api = {
        contenido: container,

        // --- Simplified API Methods ---

        texto: (texto, opciones = {}) => {
            const p = document.createElement('p');
            p.textContent = texto;
            if (opciones.color) p.style.color = opciones.color;
            if (opciones.negrita || opciones.bold) p.style.fontWeight = 'bold';
            if (opciones.tamano) p.style.fontSize = opciones.tamano;
            container.appendChild(p);
            return p;
        },

        boton: (etiqueta, onClick, opciones = {}) => {
            const btn = document.createElement('button');
            btn.textContent = etiqueta;
            btn.className = 'primary-btn lib-button-custom';
            if (opciones.ancho) btn.style.width = opciones.ancho;
            if (opciones.alto) btn.style.height = opciones.alto;
            if (opciones.color) btn.style.backgroundColor = opciones.color;
            if (opciones.clase) btn.classList.add(opciones.clase);
            if (onClick) btn.addEventListener('click', onClick);
            container.appendChild(btn);
            return btn;
        },

        input: (etiqueta, opciones = {}) => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.marginBottom = '8px';

            const label = document.createElement('label');
            label.textContent = etiqueta;
            label.style.fontSize = '0.85em';
            label.style.marginBottom = '4px';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = opciones.placeholder || '';
            input.value = opciones.valor || opciones.inicial || '';

            if (opciones.alCambiar) {
                input.addEventListener('input', (e) => opciones.alCambiar(e.target.value));
            }

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            container.appendChild(wrapper);
            return input;
        },

        numero: (etiqueta, opciones = {}) => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.marginBottom = '8px';

            const label = document.createElement('label');
            label.textContent = etiqueta;
            label.style.fontSize = '0.85em';
            label.style.marginBottom = '4px';

            const input = document.createElement('input');
            input.type = 'number';
            input.min = opciones.min ?? '';
            input.max = opciones.max ?? '';
            input.step = opciones.paso || opciones.step || '1';
            input.value = opciones.valor || opciones.inicial || 0;

            if (opciones.alCambiar) {
                input.addEventListener('input', (e) => opciones.alCambiar(parseFloat(e.target.value)));
            }

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            container.appendChild(wrapper);
            return input;
        },

        checkbox: (etiqueta, inicial = false, alCambiar) => {
            const label = document.createElement('label');
            label.className = 'checkbox-field';
            label.style.cursor = 'pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = inicial;

            if (alCambiar) {
                checkbox.addEventListener('change', (e) => alCambiar(e.target.checked));
            }

            const span = document.createElement('span');
            span.textContent = etiqueta;

            label.appendChild(checkbox);
            label.appendChild(span);
            container.appendChild(label);
            return checkbox;
        },

        slider: (etiqueta, opciones = {}) => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.marginBottom = '8px';

            const label = document.createElement('label');
            label.textContent = etiqueta;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = opciones.min || 0;
            slider.max = opciones.max || 100;
            slider.step = opciones.paso || opciones.step || 1;
            slider.value = opciones.valor || opciones.inicial || 50;

            if (opciones.alCambiar) {
                slider.addEventListener('input', (e) => opciones.alCambiar(parseFloat(e.target.value)));
            }

            wrapper.appendChild(label);
            wrapper.appendChild(slider);
            container.appendChild(wrapper);
            return slider;
        },

        desplegable: (etiqueta, items, opciones = {}) => {
            const label = document.createElement('label');
            label.textContent = etiqueta;
            const select = document.createElement('select');
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = typeof item === 'object' ? item.value : item;
                option.textContent = typeof item === 'object' ? item.texto || item.text : item;
                if (opciones.inicial === option.value) option.selected = true;
                select.appendChild(option);
            });
            if (opciones.alCambiar) {
                select.addEventListener('change', (e) => opciones.alCambiar(e.target.value));
            }
            container.appendChild(label);
            container.appendChild(select);
            return select;
        },

        imagen: (src, opciones = {}) => {
            const img = document.createElement('img');
            img.src = src;
            img.style.maxWidth = '100%';
            if (opciones.ancho) img.style.width = opciones.ancho;
            if (opciones.alto) img.style.height = opciones.alto;
            container.appendChild(img);
            return img;
        },

        video: (src) => {
            const video = document.createElement('video');
            video.src = src;
            video.controls = true;
            video.style.maxWidth = '100%';
            container.appendChild(video);
            return video;
        },

        // --- Layout & Containers ---

        fila: (opcionesOrCallback, callback) => {
            const options = typeof opcionesOrCallback === 'object' ? opcionesOrCallback : {};
            const cb = typeof opcionesOrCallback === 'function' ? opcionesOrCallback : callback;
            const div = document.createElement('div');
            div.className = 'lib-container lib-container-horizontal';
            div.style.display = 'flex';
            div.style.flexDirection = 'row';
            div.style.gap = options.gap || '10px';
            div.style.alignItems = options.alinear || 'center';
            container.appendChild(div);
            const nestedApi = createApiForContainer(div);
            if (cb) cb(nestedApi);
            return nestedApi;
        },

        columna: (opcionesOrCallback, callback) => {
            const options = typeof opcionesOrCallback === 'object' ? opcionesOrCallback : {};
            const cb = typeof opcionesOrCallback === 'function' ? opcionesOrCallback : callback;
            const div = document.createElement('div');
            div.className = 'lib-container lib-container-vertical';
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.gap = options.gap || '10px';
            container.appendChild(div);
            const nestedApi = createApiForContainer(div);
            if (cb) cb(nestedApi);
            return nestedApi;
        },

        scroll: (opcionesOrCallback, callback) => {
            const options = typeof opcionesOrCallback === 'object' ? opcionesOrCallback : {};
            const cb = typeof opcionesOrCallback === 'function' ? opcionesOrCallback : callback;
            const div = document.createElement('div');
            div.className = 'lib-scroll-area';
            div.style.overflowY = 'auto';
            div.style.flex = '1';
            if (options.alto || options.height) div.style.height = options.alto || options.height;
            container.appendChild(div);
            const nestedApi = createApiForContainer(div);
            if (cb) cb(nestedApi);
            return nestedApi;
        },

        separador: () => {
            const hr = document.createElement('hr');
            hr.style.width = '100%';
            hr.style.opacity = '0.3';
            container.appendChild(hr);
        },

        // --- Compatibility with old API ---
        agregarTexto: function(v) { return this.texto(v); },
        agregarBoton: function(v, c) { return this.boton(v, c); },
        agregarInputTexto: function(v, o) { return this.input(v, o); },
        agregarInputNumerico: function(v, o) { return this.numero(v, o); },
        agregarImagen: function(o) { return this.imagen(o.src, o); },
        agregarContenedor: function(o) { return this.columna(o); },
        agregarAreaScroll: function(o) { return this.scroll(o); },
        agregarVideo: function(o) { return this.video(o.src); },
        agregarSlider: function(v, o) { return this.slider(v, o); },
        agregarCheckbox: function(v, c) { return this.checkbox(v, c); },
        agregarDropdown: function(v, i) { return this.desplegable(v, i); },
        agregarSeparador: function() { return this.separador(); }
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


window.CreativeEngine = window.CreativeEngine || {};
window.CreativeEngine.API = {
    registrarVentana,
    crearPanel,
    registrarRuntimeAPI,
    getRegisteredWindows: () => [...registeredWindows],
    getRuntimeAPIs: () => ({ ...runtimeAPIs })
};

export const API = window.CreativeEngine.API;
