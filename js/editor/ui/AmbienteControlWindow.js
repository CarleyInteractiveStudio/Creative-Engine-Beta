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
            ambienteTiempo: document.getElementById('ambiente-tiempo'),
            ambienteTiempoValor: document.getElementById('ambiente-tiempo-valor'),
            ambienteCicloAutomatico: document.getElementById('ambiente-ciclo-automatico'),
            ambienteDuracionDia: document.getElementById('ambiente-duracion-dia'),
            ambienteMascaraTipo: document.getElementById('ambiente-mascara-tipo')
        };
        editorRenderer = dependencies.editorRenderer;
        gameRenderer = dependencies.gameRenderer;

        setupEventListeners();
    }

    function setupEventListeners() {
        if (dom.ambienteLuzAmbiental) {
            dom.ambienteLuzAmbiental.addEventListener('input', (e) => {
                const newColor = e.target.value;
                if (editorRenderer) editorRenderer.setAmbientLight(newColor);
                if (gameRenderer) gameRenderer.setAmbientLight(newColor);
            });
        }

        if (dom.ambienteTiempo) {
            dom.ambienteTiempo.addEventListener('input', (e) => {
                const hour = e.target.value;
                const displayHour = hour.padStart(2, '0');
                dom.ambienteTiempoValor.textContent = `${displayHour}:00`;

                const newColor = getColorForHour(hour);
                dom.ambienteLuzAmbiental.value = newColor;
                if (editorRenderer) editorRenderer.setAmbientLight(newColor);
                if (gameRenderer) gameRenderer.setAmbientLight(newColor);
            });
        }

        if (dom.ambienteCicloAutomatico) {
            dom.ambienteCicloAutomatico.addEventListener('change', (e) => {
                isCicloAutomatico = e.target.checked;
            });
        }
    }

    function update(deltaTime) {
        if (!isCicloAutomatico) return;

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

        const hours = Object.keys(keyframes).map(Number);
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


    return {
        initialize,
        update
    };
})();

export { AmbienteControlWindow };
