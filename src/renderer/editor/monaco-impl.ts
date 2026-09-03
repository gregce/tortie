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
import { installMonacoTheme } from './monaco-theme';
import { GMUX_MONACO_THEME } from './monaco-theme-name';

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
// gmux-dark. The theme is a function of the frame since Phase 207, defined in
// ./monaco-theme.ts from the chrome theme store and redefined as the frame
// moves. Its literals are the DESIGN.md tokens; the syntax colors reuse the
// section 1.6 terminal palette so terminal and editor read as one vocabulary.
// ---------------------------------------------------------------------------

export { GMUX_MONACO_THEME };

installMonacoTheme(monaco);

export { monaco };
export type Monaco = typeof monaco;
