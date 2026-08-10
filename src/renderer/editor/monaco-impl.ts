/**
 * Monaco — the HEAVY module. Never import this statically from anything the
 * shell loads at boot: `monaco-loader.ts` dynamic-imports it on the first
 * file open (S5: "Monaco lazy-loads on first file open"), so vite splits it
 * (plus the worker bundles) into their own chunks.
 *
 * Workers use vite's `?worker&inline` imports: inline (blob) workers are the
 * electron-vite-safe choice because the production renderer loads over
 * file://, where Chromium refuses to construct a Worker from a file URL.
 * Specifiers go through monaco 0.56's package exports (`./*` → `esm/vs/*.js`
 * — the old `monaco-editor/esm/...` deep paths no longer resolve).
 */

import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker&inline';
import JsonWorker from 'monaco-editor/language/json/json.worker?worker&inline';
import CssWorker from 'monaco-editor/language/css/css.worker?worker&inline';
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker&inline';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker&inline';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    switch (label) {
      case 'json':
        return new JsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker();
      case 'typescript':
      case 'javascript':
        return new TsWorker();
      default:
        return new EditorWorker();
    }
  }
};

// Single project files without a tsconfig would drown in "cannot find
// module" noise — keep syntax errors, drop semantic validation. This is a
// supervision editor, not an IDE language service. (monaco 0.56: the ts
// defaults live on the top-level `typescript` namespace, not languages.*.)
monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false
});
monaco.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false
});

// ---------------------------------------------------------------------------
// gmux-dark — Monaco theme derived from DESIGN.md tokens (§1.1/§1.2/§1.6).
// Monaco needs literal hex (no CSS vars); these are the token values.
// Syntax colors reuse the §1.6 terminal palette so terminal and editor read
// as one color vocabulary.
// ---------------------------------------------------------------------------

export const GMUX_MONACO_THEME = 'gmux-dark';

monaco.editor.defineTheme(GMUX_MONACO_THEME, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6E7583', fontStyle: 'italic' },
    { token: 'string', foreground: '6BC46D' },
    { token: 'string.escape', foreground: '85D488' },
    { token: 'keyword', foreground: '6CB6FF' },
    { token: 'number', foreground: 'E2B340' },
    { token: 'regexp', foreground: 'F07E78' },
    { token: 'type', foreground: '56C2C0' },
    { token: 'type.identifier', foreground: '56C2C0' },
    { token: 'identifier', foreground: 'D8DBE2' },
    { token: 'function', foreground: '8FC7FF' },
    { token: 'constant', foreground: 'F0C674' },
    { token: 'variable', foreground: 'D8DBE2' },
    { token: 'operator', foreground: 'A8ADB8' },
    { token: 'delimiter', foreground: 'A8ADB8' },
    { token: 'tag', foreground: '6CB6FF' },
    { token: 'attribute.name', foreground: '56C2C0' },
    { token: 'attribute.value', foreground: '6BC46D' },
    { token: 'key', foreground: '56C2C0' },
    { token: 'string.key.json', foreground: '56C2C0' },
    { token: 'string.value.json', foreground: '6BC46D' }
  ],
  colors: {
    'editor.background': '#131417', // --bg-canvas: one material with the app
    'editor.foreground': '#D8DBE2',
    'editorCursor.foreground': '#E8EAED',
    'editor.lineHighlightBackground': '#1B1D22', // --bg-surface
    'editor.lineHighlightBorder': '#00000000',
    'editor.selectionBackground': '#4D9DE84D', // --accent @ .30, as terminal
    'editor.inactiveSelectionBackground': '#4D9DE824',
    'editorLineNumber.foreground': '#565B66', // --text-disabled
    'editorLineNumber.activeForeground': '#A8ADB8', // --text-secondary
    'editorIndentGuide.background1': '#22252B',
    'editorIndentGuide.activeBackground1': '#3A3E48',
    'editorWhitespace.foreground': '#2A2D34',
    'editorGutter.background': '#131417',
    'editorWidget.background': '#1B1D22', // --bg-surface (find widget etc.)
    'editorWidget.border': '#2A2D34', // --border
    'editorSuggestWidget.background': '#1B1D22',
    'editorSuggestWidget.border': '#2A2D34',
    'editorSuggestWidget.selectedBackground': '#2A2E36',
    'editorHoverWidget.background': '#1B1D22',
    'editorHoverWidget.border': '#2A2D34',
    'input.background': '#1B1D22',
    'input.border': '#3A3E48',
    'inputOption.activeBorder': '#4D9DE8',
    'focusBorder': '#4D9DE8',
    'scrollbarSlider.background': '#22252B99',
    'scrollbarSlider.hoverBackground': '#2A2E36CC',
    'scrollbarSlider.activeBackground': '#3A3E48CC',
    'scrollbar.shadow': '#00000000',
    'editorOverviewRuler.border': '#00000000',
    // Bracket pairs. Colorization is turned off at the model (monaco-loader)
    // AND neutralised here, because vs-dark's rainbow — gold #FFD700, orchid
    // #DA70D6, #179FFF… — exists in no gmux token, and Split renders the same
    // fenced block twice on one screen: Monaco on the left, Shiki on the
    // right. All six depths take the `delimiter` colour Shiki uses; only an
    // UNMATCHED bracket is allowed to speak, in --error.
    'editorBracketHighlight.foreground1': '#A8ADB8',
    'editorBracketHighlight.foreground2': '#A8ADB8',
    'editorBracketHighlight.foreground3': '#A8ADB8',
    'editorBracketHighlight.foreground4': '#A8ADB8',
    'editorBracketHighlight.foreground5': '#A8ADB8',
    'editorBracketHighlight.foreground6': '#A8ADB8',
    'editorBracketHighlight.unexpectedBracket.foreground': '#E5655E', // --error
    // The MATCHING-bracket box, which vs-dark would otherwise draw in grey.
    'editorBracketMatch.background': '#00000000',
    'editorBracketMatch.border': '#3A3E48', // --border-strong
    // Minimap (Phase 12 item 6). Monaco derives the slider at roughly α.30,
    // which is invisible on this ground — these pin it to the token ramp.
    'minimap.background': '#131417', // --bg-canvas, one material
    'minimap.selectionHighlight': '#4D9DE84D',
    'minimap.findMatchHighlight': '#F5B84A66', // --warning, as the find ruler
    'minimap.errorHighlight': '#E5655E99', // --error
    'minimap.warningHighlight': '#F5B84A99', // --warning
    // One step up the neutral ramp from the real scrollbar's slider: over a
    // dense picture of text, the scrollbar's own value derives to invisible.
    'minimapSlider.background': '#2A2E36CC',
    'minimapSlider.hoverBackground': '#3A3E48CC',
    'minimapSlider.activeBackground': '#3A3E48EE',
    // Alpha only: how solid the miniature text renders.
    'minimap.foregroundOpacity': '#000000CC'
    // (Diff colors left with the Monaco diff editor in Phase 11 — diff
    // theming lives in src/renderer/pierre/theme-bridge.ts now.)
  }
});

export { monaco };
export type Monaco = typeof monaco;
