/**
 * The five gmux tags queries, inlined as TypeScript string constants.
 *
 * WHY GMUX AUTHORS THESE INSTEAD OF USING UPSTREAM `tags.scm`
 * (research 19 §3.3 / 19-d3 §2.7, measured — do not re-derive): probed against
 * 17 real gmux symbols, the stock JS+TS queries MISS five, and they are not
 * exotic — every TS `type` alias, every `enum`, and every top-level `const`,
 * including `const useEditor = create(...)`, which is how every store in this
 * codebase is declared. Stock finds 1,303 distinct names in gmux; these find
 * 1,638 and score 17/17 on the probe. One Go fix alone — anchoring
 * `const`/`var` to `source_file` — cut function-local noise from 926 to 83 on
 * a 285-file Go repo.
 *
 * WHY THEY ARE STRINGS AND NOT `.scm` FILES (research 19 §2.8, the synthesis
 * call): five small strings cost no `extraResources` entry, no runtime path
 * resolution, and have no packaged-app failure mode. A `.scm` file that is not
 * copied into the bundle is a feature that works in `out/` and dies in the
 * .app — exactly the class of bug §2.8 exists to prevent.
 *
 * Licence: gmux-authored, seeded from the MIT-licensed upstream
 * `queries/tags.scm` of each `tree-sitter-<lang>` grammar (© the tree-sitter
 * authors).
 *
 * TWO RULES FOR ANYONE EDITING THESE:
 *  1. `JS_QUERY` is compiled against the PLAIN JavaScript grammar as well as
 *     TS/TSX, so it must not name a TypeScript-only node. `as_expression` and
 *     `satisfies_expression` throw `Bad node name` on the javascript grammar —
 *     that is why the top-level-const rule is written `value`-less rather than
 *     as an alternation.
 *  2. Every `@definition.<kind>` must appear in KIND_BY_CAPTURE below, or the
 *     capture is silently dropped. `src/main/symbols/__tests__` compiles all
 *     five against all six grammars, so a grammar bump that breaks a pattern
 *     fails the test run rather than the user's palette.
 *
 * PHASE 63 ADDED THE IMPORT LAYER, and both rules above govern it unchanged.
 * `IMPORT_BY_CAPTURE` is the second capture table and it is rule 2 applied to
 * imports: an `@import.<kind>` missing from it is dropped exactly the way an
 * unmapped `@definition.<kind>` is. Rule 1 is why `import_require_clause`, the
 * `import x = require('y')` form, is in TS_QUERY rather than in JS_QUERY: it is
 * a TypeScript-only node and it throws `Bad node name` on the javascript
 * grammar. Every pattern below was compiled against all six shipped grammars
 * before it was written down.
 *
 * The import patterns live INSIDE these same five strings on purpose. One
 * string is one compile and one walk of the tree, which is the decision
 * src/main/symbols/extract.ts states in its own header. Measured on this tree
 * at 1,546 `.ts` and `.tsx` files under `src`, adding them moved the walk by
 * less than the run to run noise, because the cost of this pass is the parse
 * and not the query.
 *
 * Two of the five carry import patterns whose results are never resolved.
 * Python and Rust imports are captured, and then marked `unverifiable` by
 * src/main/arch/resolver, because research 49 section 4.8 fix 4 says those two
 * resolvers ship later rather than shipping wrong. Capturing them is what keeps
 * them COUNTED. Dropping them at the query would make a Rust repository look
 * like a repository with no imports, which is the one output this design must
 * never produce.
 */

import type { SymbolKind } from '@shared/symbols';

/** The base layer — also loaded for TypeScript and TSX. */
export const JS_QUERY = `
(function_declaration name: (identifier) @name) @definition.function
(generator_function_declaration name: (identifier) @name) @definition.function

(class_declaration name: (_) @name) @definition.class

(class_declaration
  name: (_) @container
  body: (class_body
    (method_definition name: (property_identifier) @name) @definition.method))

; const foo = () => …  /  const foo = function () {}  (at any depth)
(lexical_declaration
  (variable_declarator
    name: (identifier) @name
    value: [(arrow_function) (function_expression)]) @definition.function)
(variable_declaration
  (variable_declarator
    name: (identifier) @name
    value: [(arrow_function) (function_expression)]) @definition.function)

; Top-level \`const X = <anything>\` — the store/registry/constant idiom.
; Overlaps the arrow-function rules above; the indexer keeps the most specific
; kind per (line, column, name).
(program
  (lexical_declaration
    "const"
    (variable_declarator name: (identifier) @name) @definition.constant))
(program
  (export_statement
    declaration: (lexical_declaration
      "const"
      (variable_declarator name: (identifier) @name) @definition.constant)))

; ---------------------------------------------------------------------------
; Imports (Phase 63). Every one of these captures the SPECIFIER's string
; fragment, so the quotes are never part of the value and nothing downstream
; has to strip them.
; ---------------------------------------------------------------------------

; import x from './y'  /  import './y'  /  import type { T } from './y'
(import_statement source: (string (string_fragment) @import.path)) @import.static

; export { x } from './y'  /  export * from './y'
(export_statement source: (string (string_fragment) @import.path)) @import.reexport

; require('./y'). The predicate is what keeps this from matching every call
; that takes one string, which on this tree would be thousands of them.
(call_expression
  function: (identifier) @import.callee
  arguments: (arguments . (string (string_fragment) @import.path))
  (#eq? @import.callee "require")) @import.require

; await import('./y')
(call_expression
  function: (import)
  arguments: (arguments . (string (string_fragment) @import.path))) @import.dynamic
`;

/** Layered AFTER JS_QUERY, for both the `typescript` and `tsx` grammars. */
export const TS_QUERY = `
(interface_declaration name: (type_identifier) @name) @definition.interface
(type_alias_declaration name: (type_identifier) @name) @definition.type
(enum_declaration name: (identifier) @name) @definition.enum
(enum_declaration
  name: (identifier) @container
  body: (enum_body
    [(property_identifier) @name
     (enum_assignment name: (property_identifier) @name)]) @definition.enum-member)

(abstract_class_declaration name: (type_identifier) @name) @definition.class
(internal_module name: (identifier) @name) @definition.module
(module name: [(identifier) (string)] @name) @definition.module

; .d.ts / ambient declarations
(function_signature name: (identifier) @name) @definition.function
(method_signature name: (property_identifier) @name) @definition.method
(abstract_method_signature name: (property_identifier) @name) @definition.method

; class fields holding an arrow function read as methods to a human
(public_field_definition
  name: (property_identifier) @name
  value: (arrow_function)) @definition.method

; import x = require('./y'). TypeScript only — see rule 1 in the header.
(import_require_clause
  source: (string (string_fragment) @import.path)) @import.require
`;

export const GO_QUERY = `
(function_declaration name: (identifier) @name) @definition.function

(method_declaration
  receiver: (parameter_list
    (parameter_declaration
      type: [(type_identifier) @container
             (pointer_type (type_identifier) @container)]))
  name: (field_identifier) @name) @definition.method

(type_declaration
  (type_spec name: (type_identifier) @name type: (struct_type))) @definition.struct
(type_declaration
  (type_spec name: (type_identifier) @name type: (interface_type))) @definition.interface
(type_declaration
  (type_spec name: (type_identifier) @name
    type: [(qualified_type) (pointer_type) (map_type) (slice_type)
           (array_type) (function_type) (channel_type) (generic_type)])) @definition.type
(type_alias name: (type_identifier) @name) @definition.type

; Package-level ONLY. Without the \`source_file\` anchor these also match every
; function-local \`var x = …\` — measured 926 → 83 locals on a 285-file Go repo.
(source_file
  (const_declaration (const_spec name: (identifier) @name)) @definition.constant)
(source_file
  (var_declaration (var_spec name: (identifier) @name)) @definition.variable)

; struct fields are what people actually search for in DTO-heavy Go
(type_declaration
  (type_spec
    name: (type_identifier) @container
    type: (struct_type
      (field_declaration_list
        (field_declaration name: (field_identifier) @name) @definition.field))))

; Imports (Phase 63). Go has no string_fragment node, so this capture arrives
; WITH its quotes and src/main/symbols/extract.ts strips them. Both the bare
; and the aliased form (\`x "path"\`) are the same import_spec.
(import_spec path: (interpreted_string_literal) @import.path) @import.static
`;

export const PYTHON_QUERY = `
(module (function_definition name: (identifier) @name) @definition.function)
(module (decorated_definition
  definition: (function_definition name: (identifier) @name)) @definition.function)

(class_definition name: (identifier) @name) @definition.class

(class_definition
  name: (identifier) @container
  body: (block
    [(function_definition name: (identifier) @name)
     (decorated_definition
       definition: (function_definition name: (identifier) @name))] @definition.method))

(module
  (expression_statement
    (assignment left: (identifier) @name)) @definition.constant)

; Imports (Phase 63). Captured and then marked unverifiable by the resolver,
; never dropped — see the header for why that is the whole point.
(import_statement name: (dotted_name) @import.path) @import.static
(import_statement
  name: (aliased_import name: (dotted_name) @import.path)) @import.static
(import_from_statement module_name: (dotted_name) @import.path) @import.static
(import_from_statement
  module_name: (relative_import) @import.path) @import.static
`;

export const RUST_QUERY = `
(struct_item name: (type_identifier) @name) @definition.struct
(enum_item name: (type_identifier) @name) @definition.enum
(enum_item
  name: (type_identifier) @container
  body: (enum_variant_list
    (enum_variant name: (identifier) @name) @definition.enum-member))
(union_item name: (type_identifier) @name) @definition.struct
(type_item name: (type_identifier) @name) @definition.type
(trait_item name: (type_identifier) @name) @definition.interface
(mod_item name: (identifier) @name) @definition.module
(macro_definition name: (identifier) @name) @definition.macro
(const_item name: (identifier) @name) @definition.constant
(static_item name: (identifier) @name) @definition.constant

(source_file (function_item name: (identifier) @name) @definition.function)
(mod_item (declaration_list (function_item name: (identifier) @name) @definition.function))

(impl_item
  type: (type_identifier) @container
  body: (declaration_list
    (function_item name: (identifier) @name) @definition.method))
(impl_item
  type: (generic_type type: (type_identifier) @container)
  body: (declaration_list
    (function_item name: (identifier) @name) @definition.method))

(trait_item
  name: (type_identifier) @container
  body: (declaration_list
    (function_signature_item name: (identifier) @name) @definition.method))

(struct_item
  name: (type_identifier) @container
  body: (field_declaration_list
    (field_declaration name: (field_identifier) @name) @definition.field))

; Imports (Phase 63). Captured and then marked unverifiable by the resolver,
; never dropped — see the header for why that is the whole point.
(use_declaration argument: (_) @import.path) @import.static
(extern_crate_declaration name: (identifier) @import.path) @import.static
`;

/**
 * `@definition.<x>` capture name → the SymbolKind the palette shows.
 *
 * A capture missing from this table is DROPPED, deliberately: an unmapped kind
 * would otherwise reach the renderer and fall through to `symbol-misc`, which
 * looks like a bug and reads like one.
 */
export const KIND_BY_CAPTURE: Readonly<Record<string, SymbolKind>> = {
  'definition.function': 'function',
  'definition.method': 'method',
  'definition.class': 'class',
  'definition.interface': 'interface',
  'definition.struct': 'struct',
  'definition.type': 'type',
  'definition.enum': 'enum',
  'definition.enum-member': 'enum-member',
  'definition.constant': 'constant',
  'definition.variable': 'variable',
  'definition.field': 'field',
  'definition.module': 'module',
  'definition.macro': 'macro',
  'definition.property': 'property'
};

/**
 * Specificity, high wins. Several patterns legitimately match the same span —
 * `export const useEditor = create(...)` is both `definition.function` (the
 * arrow-function rule, when it is one) and `definition.constant` (the
 * top-level-const rule). The indexer keeps ONE row per (line, column, name)
 * and this table decides which: "function" tells the reader more than
 * "constant", and "method" more than "function".
 */
const KIND_RANK: Readonly<Record<SymbolKind, number>> = {
  method: 9,
  function: 8,
  class: 7,
  interface: 6,
  struct: 6,
  enum: 6,
  type: 5,
  'enum-member': 4,
  field: 4,
  property: 4,
  macro: 4,
  module: 3,
  constant: 2,
  variable: 1
};

/** True when `next` is a more specific description of the same span than `cur`. */
export function kindWins(next: SymbolKind, cur: SymbolKind): boolean {
  return (KIND_RANK[next] ?? 0) > (KIND_RANK[cur] ?? 0);
}

// ---------------------------------------------------------------------------
// The import layer (Phase 63)
// ---------------------------------------------------------------------------

/** How one import was written. It is presentation and provenance, never a verdict. */
export type ImportForm =
  | 'static'
  | 'reexport'
  | 'require'
  | 'dynamic';

/**
 * `@import.<x>` capture name → the form the reader records.
 *
 * This is rule 2 of the header applied to imports. A capture missing from this
 * table is DROPPED, for the same reason an unmapped `@definition.<kind>` is: an
 * unmapped form would reach the fact base as a shape nothing downstream knows
 * how to name.
 *
 * `import.callee` and `import.path` are deliberately absent. They are the
 * pieces of a match rather than a form of their own, and extract.ts reads them
 * by name.
 */
export const IMPORT_BY_CAPTURE: Readonly<Record<string, ImportForm>> = {
  'import.static': 'static',
  'import.reexport': 'reexport',
  'import.require': 'require',
  'import.dynamic': 'dynamic'
};
