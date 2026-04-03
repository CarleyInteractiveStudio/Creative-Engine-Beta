import { EditorView, HighlightStyle, syntaxHighlighting, tags } from "./CodeMirrorBundle.js";

const cesTheme = EditorView.theme({
    "&": {
        color: "#dcdcaa",
        backgroundColor: "#1e1e2e"
    },
    ".cm-content": {
        caretColor: "#ae81ff"
    },
    "&.cm-focused .cm-cursor": {
        borderLeftColor: "#ae81ff"
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "#44475a"
    },
    ".cm-gutters": {
        backgroundColor: "#1e1e2e",
        color: "#6272a4",
        border: "none"
    },
    ".cm-activeLineGutter": {
        backgroundColor: "#282a36"
    },
    ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 8px 0 12px"
    }
}, { dark: true });

const cesHighlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: "#ff79c6", fontWeight: "bold" },
    { tag: tags.typeName, color: "#8be9fd", fontStyle: "italic" },
    { tag: tags.variableName, color: "#bd93f9" },
    { tag: tags.function(tags.variableName), color: "#50fa7b" },
    { tag: tags.string, color: "#f1fa8c" },
    { tag: tags.number, color: "#bd93f9" },
    { tag: tags.operator, color: "#ff79c6" },
    { tag: tags.punctuation, color: "#f8f8f2" },
    { tag: tags.comment, color: "#6272a4" },
    { tag: tags.builtin, color: "#ffb86c" }
]);

const cesHighlighting = syntaxHighlighting(cesHighlightStyle);

export { cesTheme, cesHighlighting };
