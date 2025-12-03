// js/engine/AmbienteAPI.js

let editorRenderer = null;
let gameRenderer = null;
let dom = null;

function initialize(dependencies) {
    editorRenderer = dependencies.editorRenderer;
    gameRenderer = dependencies.gameRenderer;
    dom = dependencies.dom;
}

function setLuzAmbiental(color) {
    if (editorRenderer) editorRenderer.setAmbientLight(color);
    if (gameRenderer) gameRenderer.setAmbientLight(color);

    // Sync with UI
    if (dom && dom.ambienteLuzAmbiental) {
        dom.ambienteLuzAmbiental.value = color;
    }
}

function activarNoche() {
    // A dark blue color for night
    setLuzAmbiental('#1a1a2a');
}

function activarDia() {
    // A bright, slightly yellow color for day
    setLuzAmbiental('#fffacd');
}


// The object that will be exposed to the .ces scripts
const AmbienteAPI = {
    setLuzAmbiental,
    activarNoche,
    activarDia
};

export { initialize, AmbienteAPI };
