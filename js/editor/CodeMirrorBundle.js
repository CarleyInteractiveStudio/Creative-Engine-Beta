import { basicSetup } from "codemirror";
import { EditorState, StateField, StateEffect } from "@codemirror/state";
import { lineNumbers, drawSelection, dropCursor, rectSelect, highlightSpecialChars } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { undo, redo, indentWithTab, foldGutter, foldKeymap } from "@codemirror/commands";
import { autocompletion, acceptCompletion, completionKeymap } from "@codemirror/autocomplete";
import { linter, lintGutter } from "@codemirror/lint";
import { StreamLanguage, syntaxHighlighting, HighlightStyle, defaultHighlightStyle, foldNodeProp, foldService } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export {
    basicSetup,
    EditorState, StateField, StateEffect,
    EditorView, keymap, Decoration, lineNumbers, drawSelection, dropCursor, rectSelect, highlightSpecialChars,
    javascript,
    oneDark,
    undo, redo, indentWithTab, foldGutter, foldKeymap,
    autocompletion, acceptCompletion, completionKeymap,
    linter, lintGutter,
    StreamLanguage, foldNodeProp, foldService,
    syntaxHighlighting,
    HighlightStyle,
    defaultHighlightStyle,
    tags
};
