// --- Módulo para el Editor de Código Fácil (Blockly) ---

// --- Estado del Módulo ---
let dom;
let blocklyWorkspace = null;
let isInitialized = false;
let pendingXmlToLoad = null; // Variable para guardar el XML pendiente

// --- Definición de la Caja de Herramientas (Toolbox) ---
const toolbox = {
    'kind': 'flyoutToolbox',
    'contents': [
        { 'kind': 'block', 'type': 'controls_if' },
        { 'kind': 'block', 'type': 'controls_repeat_ext' },
        { 'kind': 'block', 'type': 'logic_compare' },
        { 'kind': 'block', 'type': 'math_number' },
        { 'kind': 'block', 'type': 'math_arithmetic' },
        { 'kind': 'block', 'type': 'text' },
        { 'kind': 'block', 'type': 'text_print' },
    ]
};

// --- API Pública ---

export function initWorkspace() {
    if (isInitialized) return;

    Blockly.setLocale(Blockly.Msg.es);
    blocklyWorkspace = Blockly.inject(dom.fcodeEditorContainer, {
        toolbox: toolbox,
        renderer: 'zelos'
    });
    isInitialized = true;

    // Si había un XML pendiente de cargar, cárgalo ahora
    if (pendingXmlToLoad) {
        loadWorkspaceFromXml(pendingXmlToLoad);
        pendingXmlToLoad = null;
    }

    setTimeout(() => resizeWorkspace(), 0);
}

export function resizeWorkspace() {
    if (blocklyWorkspace && dom.fcodeEditorContainer.offsetParent) {
        Blockly.svgResize(blocklyWorkspace);
    }
}

export function initialize(domCache) {
    dom = domCache;
    window.addEventListener('resize', resizeWorkspace, false);
}

export function getWorkspaceAsXml() {
    if (!blocklyWorkspace) return '';
    const xml = Blockly.Xml.workspaceToDom(blocklyWorkspace);
    return Blockly.Xml.domToText(xml);
}

export function loadWorkspaceFromXml(xmlText) {
    if (!isInitialized) {
        // Si el espacio de trabajo no existe, guarda el XML para cargarlo cuando se inicialice
        pendingXmlToLoad = xmlText;
        return;
    }
    try {
        blocklyWorkspace.clear(); // Limpia el espacio de trabajo antes de cargar
        const xml = Blockly.Xml.textToDom(xmlText);
        Blockly.Xml.domToWorkspace(xml, blocklyWorkspace);
    } catch (e) {
        console.error("Error al cargar el XML de Blockly:", e);
        blocklyWorkspace.clear();
    }
}
