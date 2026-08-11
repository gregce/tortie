/**
 * Symbol kind → codicon, and kind → the word shown beside it.
 *
 * Every glyph below was checked against the installed
 * `@vscode/codicons@0.0.46-24`. The one that catches people out is
 * `symbol-function`: **it does not exist in the font.** `symbol-method` is the
 * glyph VS Code itself uses for functions, which is why both map to it here.
 */

import type { SymbolKind } from '@shared/symbols';

const ICONS: Readonly<Record<SymbolKind, string>> = {
  function: 'symbol-method',
  method: 'symbol-method',
  class: 'symbol-class',
  interface: 'symbol-interface',
  struct: 'symbol-structure',
  type: 'symbol-interface',
  enum: 'symbol-enum',
  'enum-member': 'symbol-enum-member',
  constant: 'symbol-constant',
  variable: 'symbol-variable',
  field: 'symbol-field',
  module: 'symbol-namespace',
  macro: 'symbol-keyword',
  property: 'symbol-property'
};

export function symbolIcon(kind: SymbolKind): string {
  return ICONS[kind] ?? 'symbol-misc';
}

/**
 * The kind, spelled for a person. Shown only in the accessible label — the row
 * itself carries the glyph, and repeating "function" on every line would push
 * the name and the path out of a 560 px panel.
 */
const LABELS: Readonly<Record<SymbolKind, string>> = {
  function: 'function',
  method: 'method',
  class: 'class',
  interface: 'interface',
  struct: 'struct',
  type: 'type',
  enum: 'enum',
  'enum-member': 'enum member',
  constant: 'constant',
  variable: 'variable',
  field: 'field',
  module: 'module',
  macro: 'macro',
  property: 'property'
};

export function symbolKindLabel(kind: SymbolKind): string {
  return LABELS[kind] ?? 'symbol';
}
