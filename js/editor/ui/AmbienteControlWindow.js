// js/editor/ui/AmbienteControlWindow.js

const AmbienteControlWindow = (() => {
    let dom = {};
    let editorRenderer = null;
    let gameRenderer = null;
    let isCicloAutomatico = false;
    let currentTime = 6; // Start at 6 AM

    function initialize(dependencies) {
        console.log("Inicializando Control de Ambiente...");
        dom = {
            ...dependencies.dom,
            ambienteControlPanel: document.getElementById('ambiente-control-panel'),
            ambienteLuzAmbiental: document.getElementById('ambiente-luz-ambiental'),
            ambienteFiltroColor: document.getElementById('ambiente-filtro-color'),
            ambienteFiltroOpacidad: document.getElementById('ambiente-filtro-opacidad'),
            ambienteFiltroOpacidadValor: document.getElementById('ambiente-filtro-opacidad-valor'),
            ambienteFiltroSwatches: document.getElementById('ambiente-filtro-swatches'),
            ambienteCapasExcluidas: document.getElementById('ambiente-capas-excluidas'),
            ambienteTiempo: document.getElementById('ambiente-tiempo'),
            ambienteTiempoValor: document.getElementById('ambiente-tiempo-valor'),
            ambienteCicloAutomatico: document.getElementById('ambiente-ciclo-automatico'),
            ambienteDuracionDia: document.getElementById('ambiente-duracion-dia')
        };
        editorRenderer = dependencies.editorRenderer;
        gameRenderer = dependencies.gameRenderer;

        setupEventListeners();
        refreshLayerExclusionList();
    }

    function setupEventListeners() {
        if (dom.ambienteLuzAmbiental) {
            dom.ambienteLuzAmbiental.addEventListener('input', (e) => {
                const newColor = e.target.value;
                if (window.SceneManager && window.SceneManager.currentScene) {
                    window.SceneManager.currentScene.ambiente.luzAmbiental = newColor;
                }
                if (editorRenderer) editorRenderer.setAmbientLight(newColor);
                if (gameRenderer) gameRenderer.setAmbientLight(newColor);
            });
        }

        if (dom.ambienteFiltroColor) {
            dom.ambienteFiltroColor.addEventListener('input', (e) => {
                const newColor = e.target.value;
                if (window.SceneManager && window.SceneManager.currentScene) {
                    window.SceneManager.currentScene.ambiente.nocheDiaColor = newColor;
                }
            });
        }

        if (dom.ambienteFiltroOpacidad) {
            dom.ambienteFiltroOpacidad.addEventListener('input', (e) => {
                const opacity = parseFloat(e.target.value);
                dom.ambienteFiltroOpacidadValor.textContent = `${Math.round(opacity * 100)}%`;
                if (window.SceneManager && window.SceneManager.currentScene) {
                    window.SceneManager.currentScene.ambiente.nocheDiaOpacidad = opacity;
                }
            });
        }

        if (dom.ambienteFiltroSwatches) {
            dom.ambienteFiltroSwatches.addEventListener('click', (e) => {
                const swatch = e.target.closest('.color-swatch');
                if (swatch) {
                    const color = swatch.dataset.color;
                    dom.ambienteFiltroColor.value = color;

                    // Actualizar estado visual de los swatches
                    dom.ambienteFiltroSwatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                    swatch.classList.add('active');

                    dom.ambienteFiltroColor.dispatchEvent(new Event('input'));
                }
            });
        }

        if (dom.ambienteTiempo) {
            dom.ambienteTiempo.addEventListener('input', (e) => {
                const hour = e.target.value;
                const displayHour = hour.padStart(2, '0');
                dom.ambienteTiempoValor.textContent = `${displayHour}:00`;

                if (window.SceneManager && window.SceneManager.currentScene) {
                    const ambiente = window.SceneManager.currentScene.ambiente;
                    ambiente.hora = hour;

                    // En modo realista, variar la opacidad
                    if (window.currentProjectConfig && window.currentProjectConfig.rendererMode === 'realista') {
                        const newOpacity = getOpacityForHour(hour);
                        dom.ambienteFiltroOpacidad.value = newOpacity;
                        // Manual update to avoid event loop if needed, but dispatching is fine
                        dom.ambienteFiltroOpacidad.dispatchEvent(new Event('input'));
                    } else {
                        // En modo normal, variar el color ambiental
                        const newColor = getColorForHour(hour);
                        dom.ambienteLuzAmbiental.value = newColor;
                        dom.ambienteLuzAmbiental.dispatchEvent(new Event('input'));
                    }
                }
            });
        }

        if (dom.ambienteCicloAutomatico) {
            dom.ambienteCicloAutomatico.addEventListener('change', (e) => {
                isCicloAutomatico = e.target.checked;
            });
        }
    }

    function update(deltaTime, isGameRunning) {
        if (!isCicloAutomatico || !isGameRunning) return;

        const dayDurationInSeconds = parseFloat(dom.ambienteDuracionDia.value) || 60;
        const secondsPerHour = dayDurationInSeconds / 24;

        currentTime += deltaTime / secondsPerHour;
        if (currentTime >= 24) {
            currentTime = 0;
        }

        const currentHour = Math.floor(currentTime);
        dom.ambienteTiempo.value = currentHour;

        // Dispatch an input event to trigger the color change logic
        dom.ambienteTiempo.dispatchEvent(new Event('input'));
    }

    function getColorForHour(hour) {
        hour = parseInt(hour, 10);
        // Define keyframes for the day/night cycle colors
        const keyframes = {
            0:  { r: 10, g: 10, b: 40 },   // Midnight
            5:  { r: 20, g: 20, b: 60 },   // Pre-dawn
            7:  { r: 255, g: 120, b: 50 },  // Sunrise
            12: { r: 255, g: 255, b: 240 }, // Noon
            17: { r: 255, g: 150, b: 80 },  // Sunset
            19: { r: 50, g: 50, b: 100 },  // Dusk
            24: { r: 10, g: 10, b: 40 }    // Midnight (wraps around)
        };

        const hours = Object.keys(keyframes).sort((a, b) => a - b).map(Number);
        let startHour, endHour;

        for (let i = 0; i < hours.length - 1; i++) {
            if (hour >= hours[i] && hour < hours[i + 1]) {
                startHour = hours[i];
                endHour = hours[i + 1];
                break;
            }
        }

        const startColor = keyframes[startHour];
        const endColor = keyframes[endHour];
        const progress = (hour - startHour) / (endHour - startHour);

        const r = Math.round(startColor.r + (endColor.r - startColor.r) * progress);
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * progress);
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * progress);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    function getOpacityForHour(hour) {
        hour = parseInt(hour, 10);
        // Keyframes para opacidad (Día -> 0.0, Noche -> 1.0)
        const keyframes = {
            0:  1.0,  // Midnight
            5:  0.8,  // Pre-dawn
            7:  0.3,  // Sunrise
            12: 0.0,  // Noon
            17: 0.3,  // Sunset
            20: 0.8,  // Dusk
            24: 1.0   // Midnight
        };

        const hours = Object.keys(keyframes).sort((a, b) => a - b).map(Number);
        let startHour, endHour;

        for (let i = 0; i < hours.length - 1; i++) {
            if (hour >= hours[i] && hour < hours[i + 1]) {
                startHour = hours[i];
                endHour = hours[i + 1];
                break;
            }
        }

        const startVal = keyframes[startHour];
        const endVal = keyframes[endHour];
        const progress = (hour - startHour) / (endHour - startHour);

        return startVal + (endVal - startVal) * progress;
    }

    function refreshLayerExclusionList() {
        if (!dom.ambienteCapasExcluidas) return;
        dom.ambienteCapasExcluidas.innerHTML = '';

        const config = window.currentProjectConfig;
        if (!config || !config.layers || !config.layers.sortingLayers) return;

        const currentExcluidas = (window.SceneManager.currentScene && window.SceneManager.currentScene.ambiente.capasExcluidas) || [];

        config.layers.sortingLayers.forEach((layerName, index) => {
            if (!layerName) return;

            const div = document.createElement('div');
            div.className = 'checkbox-field';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `excluir-layer-${index}`;
            checkbox.checked = currentExcluidas.includes(index);

            checkbox.addEventListener('change', (e) => {
                const ambiente = window.SceneManager.currentScene.ambiente;
                if (e.target.checked) {
                    if (!ambiente.capasExcluidas.includes(index)) ambiente.capasExcluidas.push(index);
                } else {
                    ambiente.capasExcluidas = ambiente.capasExcluidas.filter(idx => idx !== index);
                }
            });

            const label = document.createElement('label');
            label.htmlFor = `excluir-layer-${index}`;
            label.textContent = `${index}: ${layerName}`;

            div.appendChild(checkbox);
            div.appendChild(label);
            dom.ambienteCapasExcluidas.appendChild(div);
        });
    }


    function iniciarCiclo() {
        isCicloAutomatico = true;
        if (dom.ambienteCicloAutomatico) {
            dom.ambienteCicloAutomatico.checked = true;
        }
    }

    function detenerCiclo() {
        isCicloAutomatico = false;
        if (dom.ambienteCicloAutomatico) {
            dom.ambienteCicloAutomatico.checked = false;
        }
    }

    return {
        initialize,
        update,
        iniciarCiclo,
        detenerCiclo
    };
})();

export { AmbienteControlWindow };
