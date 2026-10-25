'use client';

import { useEffect, useRef } from 'react';
import { Box } from '@gravity-ui/uikit';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { linter } from '@codemirror/lint';
import { tags } from '@lezer/highlight';
import styles from '@/modules/settings/components/JsonEditor/JsonEditor.module.css';

const highlighting = HighlightStyle.define([
    { tag: tags.propertyName, color: 'var(--g-color-text-info)' },
    { tag: tags.string, color: 'var(--g-color-text-positive)' },
    { tag: tags.number, color: 'var(--g-color-text-warning)' },
    { tag: [tags.bool, tags.null], color: 'var(--g-color-text-brand)' },
]);

const theme = EditorView.theme({
    '&': { color: 'var(--g-color-text-primary)', backgroundColor: 'var(--g-color-base-background)', fontSize: '16px' },
    '&.cm-focused': { outline: '2px solid var(--g-color-line-focus)', outlineOffset: '2px' },
    '.cm-scroller': { fontFamily: 'var(--g-font-family-monospace)', minHeight: '280px', maxHeight: '55dvh' },
    '.cm-content': { padding: '12px 0', caretColor: 'var(--g-color-text-primary)' },
    '.cm-line': { padding: '0 12px' },
    '.cm-cursor': { borderLeftColor: 'var(--g-color-text-primary)' },
    '.cm-gutters': {
        backgroundColor: 'var(--g-color-base-generic)',
        color: 'var(--g-color-text-secondary)',
        border: 'none',
    },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--g-color-base-simple-hover)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--g-color-base-selection)',
    },
    '.cm-tooltip': {
        backgroundColor: 'var(--g-color-base-float)',
        color: 'var(--g-color-text-primary)',
        borderColor: 'var(--g-color-line-generic)',
    },
});

export function JsonEditor({
    value,
    onChange,
    readOnly = false,
    label,
}: {
    readonly value: string;
    readonly onChange?: (value: string) => void;
    readonly readOnly?: boolean;
    readonly label: string;
}) {
    const container = useRef<HTMLDivElement>(null);
    const editor = useRef<EditorView | undefined>(undefined);
    const change = useRef(onChange);
    useEffect(() => {
        change.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!container.current) {
            return;
        }
        const view = new EditorView({
            parent: container.current,
            extensions: [
                basicSetup,
                json(),
                linter(jsonParseLinter()),
                syntaxHighlighting(highlighting),
                theme,
                EditorView.lineWrapping,
                EditorState.readOnly.of(readOnly),
                EditorView.editable.of(!readOnly),
                EditorView.contentAttributes.of({
                    'aria-label': label,
                    role: 'textbox',
                    'aria-multiline': 'true',
                    'aria-readonly': String(readOnly),
                    tabindex: '0',
                }),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        change.current?.(update.state.doc.toString());
                    }
                }),
            ],
        });
        editor.current = view;
        return () => {
            view.destroy();
            editor.current = undefined;
        };
    }, [readOnly, label]);

    useEffect(() => {
        const view = editor.current;
        if (view && view.state.doc.toString() !== value) {
            view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
        }
    }, [value, readOnly, label]);

    return <Box ref={container} className={styles.editor} />;
}
