import { EditorView, HighlightStyle, syntaxHighlighting, tags } from "./CodeMirrorBundle.js";

// Utility to safely define styles for potentially missing tags
const safeTagStyle = (tagName, styles) => {
    const tag = tags[tagName];
    if (!tag) {
        console.warn(`Tag "${tagName}" not found when defining HighlightStyle.`);
        return [];
    }
    return [{ tag, ...styles }];
};

const cesTheme = EditorView.theme({
    "&": {
        color: "#d4d4d4",
        backgroundColor: "#1e1e2e",
        height: "100%"
    },
    ".cm-scroller": {
        backgroundColor: "#1e1e2e",
        outline: "none"
    },
    ".cm-content": {
        caretColor: "#ae81ff",
        padding: "10px 0"
    },
    "&.cm-focused .cm-cursor": {
        borderLeftColor: "#ae81ff"
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "#44475a"
    },
    // Integrate line numbers seamlessly - "No bar, just numbers"
    ".cm-gutters": {
        backgroundColor: "#1e1e2e !important",
        color: "#ffffff !important",
        border: "none !important",
        borderRight: "none !important"
    },
    ".cm-gutter": {
        backgroundColor: "#1e1e2e !important",
        border: "none !important"
    },
    ".cm-gutterElement": {
        color: "#ffffff !important", // Solid white line numbers
        padding: "0 15px 0 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        minWidth: "45px",
        zIndex: "5"
    },
    ".cm-activeLineGutter": {
        backgroundColor: "transparent",
        color: "#ffffff !important"
    },
    // Remove any subtle lines that CodeMirror might add
    ".cm-lineNumbers": {
        border: "none"
    },
    ".cm-foldGutter": {
        color: "#6272a4",
        width: "18px",
        backgroundColor: "#1e1e2e !important"
    },
    ".cm-foldGutter .cm-gutterElement": {
        padding: "0 4px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    },
    ".cm-lintGutter": {
        width: "18px",
        backgroundColor: "#1e1e2e !important"
    }
}, { dark: true });

const specs = [
    ...safeTagStyle("keyword", { color: "#ff79c6", fontWeight: "bold" }),
    ...safeTagStyle("typeName", { color: "#8be9fd", fontStyle: "italic" }),
    ...safeTagStyle("variableName", { color: "#f8f8f2" }),
    ...safeTagStyle("propertyName", { color: "#bd93f9" }),
    ...safeTagStyle("string", { color: "#f1fa8c" }),
    ...safeTagStyle("number", { color: "#bd93f9" }),
    ...safeTagStyle("comment", { color: "#6272a4", fontStyle: "italic" }),
    ...safeTagStyle("operatorKeyword", { color: "#ff79c6" }),
    ...safeTagStyle("punctuation", { color: "#f8f8f2" })
];

// Special handling for function name if tags.function exists
if (tags.function && tags.variableName) {
    specs.push({ tag: tags.function(tags.variableName), color: "#50fa7b" });
}

const cesHighlightStyle = HighlightStyle.define(specs);

const cesHighlighting = syntaxHighlighting(cesHighlightStyle);

export { cesTheme, cesHighlighting };
