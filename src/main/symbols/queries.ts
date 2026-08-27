/**
 * The six gmux tags queries, inlined as TypeScript string constants.
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
 * call): six small strings cost no `extraResources` entry, no runtime path
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
 *     six against all seven grammars, so a grammar bump that breaks a pattern
 *     fails the test run rather than the user's palette.
 *
 * PHASE 63 ADDED THE IMPORT LAYER, and both rules above govern it unchanged.
 * `IMPORT_BY_CAPTURE` is the second capture table and it is rule 2 applied to
 * imports: an `@import.<kind>` missing from it is dropped exactly the way an
 * unmapped `@definition.<kind>` is. Rule 1 is why `import_require_clause`, the
 * `import x = require('y')` form, is in TS_QUERY rather than in JS_QUERY: it is
 * a TypeScript-only node and it throws `Bad node name` on the javascript
 * grammar. Every pattern below was compiled against all seven shipped grammars
 * before it was written down.
 *
 * The import patterns live INSIDE these same six strings on purpose. One
 * string is one compile and one walk of the tree, which is the decision
 * src/main/symbols/extract.ts states in its own header. Measured on this tree
 * at 1,546 `.ts` and `.tsx` files under `src`, adding them moved the walk by
 * less than the run to run noise, because the cost of this pass is the parse
 * and not the query.
 *
 * PHASE 157 ADDED THE SIXTH QUERY, being Ruby, and it is the only one of the six
 * that was written after the import layer rather than before it. Two things
 * about it are worth knowing before editing. Its import patterns capture the
 * WHOLE string node rather than a `string_content`, because a Ruby string can
 * hold an interpolation beside its text and capturing the text alone would hand
 * the resolver a fragment the author never wrote. And `require_relative` gets a
 * form of its own, `import.require-relative`, because it is the one Ruby shape
 * that resolves against the requiring file's own directory and the specifier
 * text cannot be told apart from a load path `require`. Adding a form means
 * adding a row to IMPORT_BY_CAPTURE, which is rule 2 again.
 *
 * EVERY QUERY'S IMPORTS ARE NOW RESOLVED. Until Phase 157 two of these carried
 * import patterns whose results were never resolved: Python and Rust were
 * captured and then marked `unverifiable` by src/main/arch/resolver, because
 * research 49 section 4.8 fix 4 said those resolvers would ship later rather
 * than shipping wrong. Phase 157 shipped both, and Ruby's with them, so that is
 * no longer true and the paragraph that said so is gone rather than left to
 * mislead.
 *
 * The reason for capturing them before they could be resolved still stands and
 * still binds the next language added: capturing is what keeps them COUNTED.
 * Dropping an import at the query would make a repository in that language look
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

; Imports (Phase 63, resolved since Phase 157). Captured and never dropped.
; The header says why that is the whole point.
(import_statement name: (dotted_name) @import.path) @import.static
(import_statement
  name: (aliased_import name: (dotted_name) @import.path)) @import.static
(import_from_statement module_name: (dotted_name) @import.path) @import.static
(import_from_statement
  module_name: (relative_import) @import.path) @import.static

; THE IMPORTED NAME, captured beside its module (Phase 157's fix round).
;
; The four patterns above capture module_name only, so from .routes import
; auth reached the resolver as .routes and got the DEFINITE answer
; routes/__init__.py. The real edge to routes/auth.py was then neither a
; crossing nor a miss, and a must-not promise across it rendered green. These
; two patterns record the deeper module as well: tree-sitter emits ONE MATCH PER
; IMPORTED NAME for a repeated field, so from .routes import auth, generate
; yields .routes, .routes.auth and .routes.generate, which is exactly the
; set of modules Python executes. src/main/symbols/extract.ts joins the two
; captures and says why the join is Python's rule.
;
; from x import * matches NEITHER, because a star is not a dotted_name, so a
; star import stays the module-only row it always was.
(import_from_statement
  module_name: (_) @import.path
  name: (dotted_name) @import.member) @import.static
(import_from_statement
  module_name: (_) @import.path
  name: (aliased_import name: (dotted_name) @import.member)) @import.static
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

; Imports (Phase 63, resolved since Phase 157). Captured and never dropped.
; The header says why that is the whole point.
;
; THE CAPTURE IS THE WHOLE USE TREE ARGUMENT, braces and all, which is what
; ../symbols/extract.ts's own MAX_SPECIFIER_CHARS comment is about: a real
; use super::{ ...sixty names... } runs to thousands of characters and the
; first build of that cap dropped it silently.
(use_declaration argument: (_) @import.path) @import.static
(extern_crate_declaration name: (identifier) @import.path) @import.static
`;

export const RUBY_QUERY = `
(class name: (constant) @name) @definition.class
(class name: (scope_resolution name: (constant) @name)) @definition.class
(singleton_class value: (constant) @name) @definition.class
(module name: (constant) @name) @definition.module
(module name: (scope_resolution name: (constant) @name)) @definition.module

(method name: [(identifier) (constant) (setter name: (identifier))] @name) @definition.method
(singleton_method name: [(identifier) (setter name: (identifier))] @name) @definition.method
(alias name: (identifier) @name) @definition.method

; A constant assignment is what a Ruby reader searches for by name. Every other
; assignment is a local or an instance variable and belongs to no one.
(assignment left: (constant) @name) @definition.constant

(class
  name: (constant) @container
  body: (body_statement
    [(method name: (identifier) @name)
     (singleton_method name: (identifier) @name)] @definition.method))
(module
  name: (constant) @container
  body: (body_statement
    [(method name: (identifier) @name)
     (singleton_method name: (identifier) @name)] @definition.method))

; Imports (Phase 157). The predicate is what keeps these from matching every
; call that takes one string, exactly as it does in JS_QUERY: without it this
; pattern matches thousands of ordinary calls per repository.
;
; THE WHOLE STRING NODE IS CAPTURED, not its string_content, and that is
; deliberate. require "#{dir}/x" has an interpolation and a string_content
; side by side, so a pattern that captured the content would hand the resolver
; the fragment /x as if the author had written it. Capturing the string means
; the specifier arrives as it was WRITTEN, with the interpolation intact and
; the quotes on, extract.ts strips the quotes the way it does for Go, and the
; Ruby arm answers unresolved for anything that is not a plain path. The
; import stays counted instead of vanishing, which is the rule this file's
; header states about Rust and Python.
;
; A require whose first argument is not a string at all, being
; require File.join(__dir__, "x") or require some_variable, is NOT captured,
; the same gap require(someVariable) has in JavaScript. Measured over
; Homebrew's 1,864 Ruby files on 2026-08-26: 10 of 3,665 require lines.
;
; require and require_relative are the same six letters in a specifier and
; they name different files, so they carry DIFFERENT FORMS and the resolver
; reads the form. Homebrew holds both a root utils.rb and a cask/utils.rb,
; which is what that distinction is worth.
(call
  method: (identifier) @import.callee
  arguments: (argument_list . (string) @import.path)
  (#eq? @import.callee "require")) @import.require
(call
  method: (identifier) @import.callee
  arguments: (argument_list . (string) @import.path)
  (#eq? @import.callee "require_relative")) @import.require-relative
(call
  method: (identifier) @import.callee
  arguments: (argument_list (simple_symbol) . (string) @import.path)
  (#eq? @import.callee "autoload")) @import.require
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

/**
 * The marker an import specifier wears when it was too long to record whole.
 *
 * It lives HERE, beside `ImportForm`, because it is the same kind of fact: part
 * of the contract between the extractor that writes a specifier and the arms
 * that read one, and this module is the only thing both sides already import.
 * `src/main/symbols/extract.ts` appends it and `src/main/arch/resolver/index.ts`
 * refuses any specifier carrying it, so a truncated specifier is `unresolved`
 * in EVERY language rather than in five of the six. Go is why that matters: its
 * arm answers `external` for anything not under the module directive, which is
 * Go's own rule and right for a real path, and would have been a definite answer
 * about a mangled one.
 *
 * It holds a space and a character outside every identifier grammar this build
 * reads, so it can never collide with something an author wrote.
 */
export const IMPORT_TRUNCATION_MARKER = ' \u2026 truncated';

/** How one import was written. It is presentation and provenance, never a verdict. */
export type ImportForm =
  | 'static'
  | 'reexport'
  | 'require'
  | 'require-relative'
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
  // Ruby's `require_relative`, which is a DIFFERENT form rather than a
  // presentation detail: it is the one Ruby shape whose specifier resolves
  // against the requiring file's own directory, and the resolver cannot tell it
  // from a load path `require` by looking at the specifier text.
  'import.require-relative': 'require-relative',
  'import.dynamic': 'dynamic'
};
