import { EditorState, StateField, StateEffect } from "@codemirror/state";
import {
    EditorView, keymap, Decoration, lineNumbers,
    drawSelection, dropCursor, rectSelect, highlightSpecialChars,
    crosshairCursor, highlightActiveLine, highlightActiveLineGutter
} from "@codemirror/view";
import {
    indentWithTab, undo, redo,
    history, historyKeymap
} from "@codemirror/commands";
import {
    autocompletion, acceptCompletion, completionKeymap,
    closeBrackets, closeBracketsKeymap
} from "@codemirror/autocomplete";
import { linter, lintGutter, lintKeymap } from "@codemirror/lint";
import {
    StreamLanguage, syntaxHighlighting, HighlightStyle, defaultHighlightStyle,
    foldNodeProp, foldService,
    indentUnit,
    LanguageDescription,
    syntaxTree,
    bracketMatching,
    foldGutter,
    foldKeymap,
    indentOnInput
} from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { tags } from "@lezer/highlight";

// Manual basicSetup equivalent that we can use as a base
const basicSetup = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectSelect(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
        ...closeBracketsKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        ...searchKeymap,
        indentWithTab
    ])
];

export {
    basicSetup,
    EditorState, StateField, StateEffect,
    EditorView, keymap, Decoration, lineNumbers, drawSelection, dropCursor, rectSelect, highlightSpecialChars,
    javascript,
    oneDark,
    undo, redo, indentWithTab, foldGutter, foldKeymap,
    autocompletion, acceptCompletion, completionKeymap,
    linter, lintGutter, lintKeymap,
    StreamLanguage, foldNodeProp, foldService,
    syntaxHighlighting,
    HighlightStyle,
    defaultHighlightStyle,
    tags,
    indentUnit,
    syntaxTree,
    history,
    bracketMatching,
    closeBrackets,
    indentOnInput
};
