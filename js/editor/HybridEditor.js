// --- Módulo para el Editor Híbrido "Ambos" ---
import { WidgetType } from "https://esm.sh/@codemirror/view@6.26.3";
import { ViewPlugin, Decoration, MatchDecorator } from "https://esm.sh/@codemirror/view@6.26.3";
import { EditorView } from "https://esm.sh/codemirror@6.0.1";


// --- Estado del Módulo ---
let dom;
let hybridToolboxWorkspace = null;
let draggedBlockCode = null;
let isInitialized = false;

// --- Widget de CodeMirror para representar un Bloque ---
class BlockWidget extends WidgetType {
    constructor(blockId, blockType) {
        super();
        this.blockId = blockId;
        this.blockType = blockType; // e.g., 'controls_if'
    }

    eq(other) {
        return other.blockId === this.blockId && other.blockType === this.blockType;
    }

    toDOM() {
        const wrap = document.createElement("span");
        wrap.className = "cm-block-widget";
        wrap.textContent = `[Bloque: ${this.blockType}]`; // Placeholder visual
        wrap.dataset.blockId = this.blockId;
        return wrap;
    }

    ignoreEvent() {
        return true; // El widget no debe manejar eventos directamente
    }
}

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

    hybridToolboxWorkspace = Blockly.inject(dom.hybridToolboxContainer, {
        toolbox: toolbox,
        media: 'https://cdnjs.cloudflare.com/ajax/libs/blockly/12.3.1/media/',
        renderer: 'zelos',
        scrollbars: true
    });
    isInitialized = true;

    // --- Lógica para arrastrar bloques y generar código ---
    hybridToolboxWorkspace.addChangeListener((event) => {
        if (event.type === Blockly.Events.DRAG_START) {
            const block = hybridToolboxWorkspace.getBlockById(event.blockId);
            if (block) {
                const xmlDom = Blockly.Xml.blockToDom(block);
                const xmlText = Blockly.Xml.domToText(xmlDom);
                // Guardar la información completa del bloque
                draggedBlockCode = {
                    id: crypto.randomUUID(),
                    type: block.type,
                    xml: xmlText
                };
            }
        } else if (event.type === Blockly.Events.DRAG_STOP) {
            setTimeout(() => { draggedBlockCode = null; }, 100);
        }
    });

    console.log("Caja de herramientas del Editor Híbrido inicializada.");
}

export function initialize(domCache) {
    dom = domCache;
    // La inicialización se difiere a initWorkspace()
}

export function getDraggedBlockCode() {
    return draggedBlockCode;
}

// --- Lógica del Plugin de CodeMirror ---

const blockPlaceholderMatcher = new MatchDecorator({
    regexp: /\[\[BLOCK::([\w-]+)::([\w_]+)\]\]/g,
    decoration: (match) => {
        const blockId = match[1];
        const blockType = match[2];
        return Decoration.replace({
            widget: new BlockWidget(blockId, blockType),
        });
    },
});

export const blockWidgetsPlugin = ViewPlugin.fromClass(
    class {
        constructor(view) {
            this.decorations = blockPlaceholderMatcher.createDeco(view);
        }
        update(update) {
            this.decorations = blockPlaceholderMatcher.updateDeco(update, this.decorations);
        }
    },
    {
        decorations: (instance) => instance.decorations,
        provide: (plugin) =>
            EditorView.atomicRanges.of((view) => {
                return view.plugin(plugin)?.decorations || Decoration.none;
            }),
    }
);
