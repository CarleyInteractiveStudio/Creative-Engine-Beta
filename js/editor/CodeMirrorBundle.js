import * as StateModule from "@codemirror/state";
import * as ViewModule from "@codemirror/view";
import * as CommandsModule from "@codemirror/commands";
import * as AutocompleteModule from "@codemirror/autocomplete";
import * as LintModule from "@codemirror/lint";
import * as LanguageModule from "@codemirror/language";
import * as SearchModule from "@codemirror/search";
import * as JSModule from "@codemirror/lang-javascript";
import * as ThemeModule from "@codemirror/theme-one-dark";
import * as HighlightModule from "@lezer/highlight";

const { EditorState, StateField, StateEffect } = StateModule;
const {
    EditorView, keymap, Decoration, lineNumbers,
    drawSelection, dropCursor, highlightSpecialChars,
    highlightActiveLine, highlightActiveLineGutter
} = ViewModule;
const lineWrapping = EditorView.lineWrapping;

const { indentWithTab, undo, redo, history, historyKeymap } = CommandsModule;
const { autocompletion, acceptCompletion, completionKeymap, closeBrackets, closeBracketsKeymap } = AutocompleteModule;
const { linter, lintGutter, lintKeymap } = LintModule;
const {
    StreamLanguage, syntaxHighlighting, HighlightStyle, defaultHighlightStyle,
    foldNodeProp, foldService, indentUnit, bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxTree
} = LanguageModule;
const { searchKeymap, highlightSelectionMatches } = SearchModule;
const { javascript } = JSModule;
const { oneDark } = ThemeModule;
const { tags } = HighlightModule;

// Manual basicSetup equivalent (Safe version without problematic exports)
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
    highlightActiveLine(),
    highlightSelectionMatches(),
    indentUnit.of("    "),
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
    EditorView, keymap, Decoration, lineNumbers, drawSelection, dropCursor, highlightSpecialChars,
    highlightActiveLine, highlightActiveLineGutter, lineWrapping,
    javascript,
    oneDark,
    undo, redo, indentWithTab,
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
    historyKeymap,
    bracketMatching,
    foldGutter,
    foldKeymap,
    indentOnInput,
    closeBrackets,
    closeBracketsKeymap,
    searchKeymap,
    highlightSelectionMatches
};
