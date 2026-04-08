import { basicSetup } from "codemirror";
import { EditorState, StateField, StateEffect } from "@codemirror/state";
import { EditorView, keymap, Decoration } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { undo, redo, indentWithTab } from "@codemirror/commands";
import { autocompletion, acceptCompletion, completionKeymap } from "@codemirror/autocomplete";
import { linter } from "@codemirror/lint";

export {
    basicSetup,
    EditorState, StateField, StateEffect,
    EditorView, keymap, Decoration,
    javascript,
    oneDark,
    undo, redo, indentWithTab,
    autocompletion, acceptCompletion, completionKeymap,
    linter
};
