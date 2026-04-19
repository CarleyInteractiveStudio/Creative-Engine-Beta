// js/editor/ui/AmbienteControlWindow.js

const AmbienteControlWindow = (() => {
    let dom = {};
    let editorRenderer = null;
    let gameRenderer = null;
    let SceneManager = null;
    let currentProjectConfig = null;
    let isCicloAutomatico = false;
    let currentTime = 6; // Start at 6 AM

    function initialize(dependencies) {
        console.log("Inicializando Control de Ambiente v2.0...");
        dom = {
            ...dependencies.dom,
            ambienteControlPanel: document.getElementById('ambiente-control-panel'),
            ambienteLuzAmbiental: document.getElementById('ambiente-luz-ambiental'),
            ambienteFiltroColor: document.getElementById('ambiente-filtro-color'),
            ambienteFiltroSwatches: document.getElementById('ambiente-filtro-swatches'),
            ambienteCapasExcluidas: document.getElementById('ambiente-capas-excluidas'),
            ambienteTiempo: document.getElementById('ambiente-tiempo'),
            ambienteTiempoValor: document.getElementById('ambiente-tiempo-valor'),
            ambienteNocheDiaIntensidad: document.getElementById('ambiente-noche-dia-intensidad'),
            ambienteNocheDiaIntensidadValor: document.getElementById('ambiente-noche-dia-intensidad-valor'),
            ambienteCicloAutomatico: document.getElementById('ambiente-ciclo-automatico'),
            ambienteDuracionDia: document.getElementById('ambiente-duracion-dia')
        };
        editorRenderer = dependencies.editorRenderer;
        gameRenderer = dependencies.gameRenderer;
        SceneManager = dependencies.SceneManager || window.SceneManager;
        currentProjectConfig = dependencies.currentProjectConfig || window.currentProjectConfig;

        if (SceneManager && SceneManager.currentScene) {
            const ambiente = SceneManager.currentScene.ambiente;
            isCicloAutomatico = ambiente.cicloAutomatico || false;
            currentTime = parseFloat(ambiente.hora || '6');
        }

        setupEventListeners();
        refreshLayerExclusionList();
    }

    function setupEventListeners() {
        // --- 3D Environment (Sky) ---
        const setupSkyInput = (id, property) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    if (SceneManager.currentScene) {
                        SceneManager.currentScene.ambiente[property] = e.target.value;
                        if (typeof window.setSceneDirty === 'function') window.setSceneDirty(true);
                    }
                });
            }
        };

        setupSkyInput('ambiente-sky-mode', 'skyMode');
        setupSkyInput('ambiente-sky-color', 'skyColor');
        setupSkyInput('ambiente-horizon-color', 'horizonColor');
        setupSkyInput('ambiente-ground-color', 'groundColor');

        if (dom.ambienteFiltroColor) {
            dom.ambienteFiltroColor.addEventListener('input', (e) => {
                const newColor = e.target.value;
                console.log(`[Ambiente] Cambio de Color: ${newColor}`);
                if (SceneManager && SceneManager.currentScene) {
                    SceneManager.currentScene.ambiente.nocheDiaColor = newColor;
                    if (typeof window.setSceneDirty === 'function') window.setSceneDirty(true);
                }
            });
        }

        if (dom.ambienteFiltroSwatches) {
            dom.ambienteFiltroSwatches.addEventListener('click', (e) => {
                const swatch = e.target.closest('.color-swatch');
                if (swatch) {
                    const color = swatch.dataset.color;
                    if (dom.ambienteFiltroColor) dom.ambienteFiltroColor.value = color;

                    // Actualizar estado visual de los swatches
                    dom.ambienteFiltroSwatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                    swatch.classList.add('active');

                    if (dom.ambienteFiltroColor) dom.ambienteFiltroColor.dispatchEvent(new Event('input'));
                }
            });
        }

        if (dom.ambienteTiempo) {
            dom.ambienteTiempo.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value);
                if (isNaN(val)) return;

                const hour = Math.floor(val);
                const minutes = Math.floor((val % 1) * 60);

                const displayTime = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                if (dom.ambienteTiempoValor) dom.ambienteTiempoValor.textContent = displayTime;

                if (SceneManager && SceneManager.currentScene) {
                    const ambiente = SceneManager.currentScene.ambiente;
                    ambiente.hora = val.toString();

                    // Sincronizar opacidad automáticamente según la hora (usando keyframes para realismo)
                    const baseOpacity = getOpacityForHour(val);
                    const intensidad = ambiente.nocheDiaIntensidad !== undefined ? ambiente.nocheDiaIntensidad : 1.0;
                    ambiente.nocheDiaOpacidad = baseOpacity * intensidad;

                    console.log(`[Ambiente] Hora: ${val.toFixed(2)}, Opacidad: ${ambiente.nocheDiaOpacidad.toFixed(3)}, Intensidad: ${intensidad}`);

                    if (currentProjectConfig && currentProjectConfig.rendererMode !== 'realista') {
                        const newColor = getColorForHour(val);
                            ambiente.nocheDiaColor = newColor; // Fixed property name
                        if (editorRenderer) editorRenderer.setAmbientLight(newColor);
                        if (gameRenderer) gameRenderer.setAmbientLight(newColor);
                    }

                    if (typeof window.setSceneDirty === 'function') window.setSceneDirty(true);
                }
            });
        }

        if (dom.ambienteNocheDiaIntensidad) {
            dom.ambienteNocheDiaIntensidad.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                console.log(`[Ambiente] Cambio de Intensidad: ${val}`);
                if (dom.ambienteNocheDiaIntensidadValor) {
                    dom.ambienteNocheDiaIntensidadValor.textContent = `${Math.round(val * 100)}%`;
                }

                if (SceneManager && SceneManager.currentScene) {
                    const ambiente = SceneManager.currentScene.ambiente;
                    ambiente.nocheDiaIntensidad = val;

                    const currentHour = parseFloat(ambiente.hora || '6');
                    const baseOpacity = getOpacityForHour(currentHour);
                    ambiente.nocheDiaOpacidad = baseOpacity * val;
                }
            });
        }

        if (dom.ambienteCicloAutomatico) {
            dom.ambienteCicloAutomatico.addEventListener('change', (e) => {
                isCicloAutomatico = e.target.checked;
                console.log(`[Ambiente] Ciclo Automático: ${isCicloAutomatico}`);
                if (SceneManager && SceneManager.currentScene) {
                    SceneManager.currentScene.ambiente.cicloAutomatico = isCicloAutomatico;
                    if (typeof window.setSceneDirty === 'function') window.setSceneDirty(true);
                }
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

        dom.ambienteTiempo.value = currentTime;

        // Dispatch an input event to trigger the opacity/color change logic
        dom.ambienteTiempo.dispatchEvent(new Event('input'));
    }

    function getColorForHour(hour) {
        hour = parseFloat(hour);
        if (hour > 24) hour %= 24;
        if (hour < 0) hour = 0;

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
        let startHour = hours[0], endHour = hours[hours.length - 1];

        for (let i = 0; i < hours.length - 1; i++) {
            if (hour >= hours[i] && hour <= hours[i + 1]) {
                startHour = hours[i];
                endHour = hours[i + 1];
                break;
            }
        }

        const startColor = keyframes[startHour];
        const endColor = keyframes[endHour];

        let progress = 0;
        if (endHour !== startHour) {
            progress = (hour - startHour) / (endHour - startHour);
        }

        const r = Math.max(0, Math.min(255, Math.round(startColor.r + (endColor.r - startColor.r) * progress)));
        const g = Math.max(0, Math.min(255, Math.round(startColor.g + (endColor.g - startColor.g) * progress)));
        const b = Math.max(0, Math.min(255, Math.round(startColor.b + (endColor.b - startColor.b) * progress)));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    function getOpacityForHour(hour) {
        hour = parseFloat(hour);
        if (hour > 24) hour %= 24;
        if (hour < 0) hour = 0;

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
        let startHour = hours[0], endHour = hours[hours.length - 1];

        for (let i = 0; i < hours.length - 1; i++) {
            if (hour >= hours[i] && hour <= hours[i + 1]) {
                startHour = hours[i];
                endHour = hours[i + 1];
                break;
            }
        }

        const startVal = keyframes[startHour];
        const endVal = keyframes[endHour];

        let progress = 0;
        if (endHour !== startHour) {
            progress = (hour - startHour) / (endHour - startHour);
        }

        return Math.max(0, Math.min(1, startVal + (endVal - startVal) * progress));
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

    function updateAmbientePanelFromScene() {
        if (!SceneManager.currentScene || !SceneManager.currentScene.ambiente) return;

        const ambiente = SceneManager.currentScene.ambiente;

        // --- 3D Environment (Sky) ---
        const syncSkyInput = (id, property, fallback) => {
            const el = document.getElementById(id);
            if (el) el.value = ambiente[property] || fallback;
        };

        syncSkyInput('ambiente-sky-mode', 'skyMode', 'Gradient');
        syncSkyInput('ambiente-sky-color', 'skyColor', '#87ceeb');
        syncSkyInput('ambiente-horizon-color', 'horizonColor', '#ffffff');
        syncSkyInput('ambiente-ground-color', 'groundColor', '#222222');

        if (dom.ambienteFiltroColor) {
            dom.ambienteFiltroColor.value = ambiente.nocheDiaColor || '#0a0a28';
        }

        if (dom.ambienteTiempo) {
            dom.ambienteTiempo.value = ambiente.hora || '6';
            const val = parseFloat(dom.ambienteTiempo.value);
            const hour = Math.floor(val);
            const minutes = Math.floor((val % 1) * 60);
            if (dom.ambienteTiempoValor) dom.ambienteTiempoValor.textContent = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }

        if (dom.ambienteNocheDiaIntensidad) {
            const intensidad = ambiente.nocheDiaIntensidad !== undefined ? ambiente.nocheDiaIntensidad : 1.0;
            dom.ambienteNocheDiaIntensidad.value = intensidad;
            if (dom.ambienteNocheDiaIntensidadValor) dom.ambienteNocheDiaIntensidadValor.textContent = `${Math.round(intensidad * 100)}%`;
        }

        if (dom.ambienteCicloAutomatico) {
            dom.ambienteCicloAutomatico.checked = ambiente.cicloAutomatico || false;
        }

        if (dom.ambienteDuracionDia) {
            dom.ambienteDuracionDia.value = ambiente.duracionDia || '60';
        }

        if (dom.ambienteFiltroSwatches && dom.ambienteFiltroColor) {
            dom.ambienteFiltroSwatches.querySelectorAll('.color-swatch').forEach(s => {
                s.classList.toggle('active', s.dataset.color === dom.ambienteFiltroColor.value);
            });
        }
    }

    return {
        initialize,
        update,
        iniciarCiclo,
        detenerCiclo,
        updateAmbientePanelFromScene
    };
})();

export { AmbienteControlWindow };
