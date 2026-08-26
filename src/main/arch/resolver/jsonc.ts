/**
 * A tolerant read of one configuration file, for the manifest aware resolver
 * (Phase 63).
 *
 * WHY THIS IS NOT `src/main/context/parse/jsonc.ts`, stated so a later round
 * does not read it as an oversight. That module is the better parser and it is
 * the one every other reader in this codebase uses. `src/main/arch/` may not
 * name `src/main/context/`, by the wall this phase adds to
 * `build/assert-import-boundaries.mjs`, because Arch must never be able to
 * reach Context's own data. The wall is stated by directory prefix, so it
 * catches this pure text helper along with everything else in that directory.
 * The consolidation that would remove this file is hoisting that parser to a
 * neutral module both directories may name, and that is a deliberate act for a
 * later phase rather than something to do in passing here.
 *
 * WHY A TOLERANT READ IS NEEDED AT ALL. `tsconfig.json` is JSON with comments
 * and trailing commas by convention, and TypeScript itself accepts both. Two of
 * Tortie's own seven tsconfigs fail `JSON.parse` today, measured on the tree at
 * `aa1d801`, so a strict read would silently lose this repository's own
 * `@shared/*` alias and every import through it would resolve to nothing.
 *
 * WHAT IT REFUSES TO DO. It never evaluates. It strips line comments, block
 * comments and trailing commas outside of strings, and then hands the result to
 * `JSON.parse`. A file it cannot read comes back as null and the caller carries
 * on without that file's aliases, which costs unresolved specifiers rather than
 * a crash.
 */

import { readFileSync } from 'node:fs';

/**
 * Where the two passes below are, as far as string literals go.
 *
 * Both of them walk the same bytes and both must leave the inside of a quoted
 * value completely alone: a `//` inside a path, a `/*` inside a description and
 * a `,` before a closing brace are all ordinary text in there and none of them
 * is syntax. That rule was written twice when this file was drafted, so the
 * integrator lifted it here. One rule, one place, and a fix to the escape
 * handling can no longer land in one pass and miss the other.
 */
interface StringState {
  inString: boolean;
  escaped: boolean;
}

/**
 * Advance the string state by one character.
 *
 * Answers true when the character is string content or one of the quotes that
 * bound it, which is the caller's signal to copy it out and take no other
 * interest in it.
 */
function stepString(ch: string, state: StringState): boolean {
  if (state.inString) {
    if (state.escaped) state.escaped = false;
    else if (ch === '\\') state.escaped = true;
    else if (ch === '"') state.inString = false;
    return true;
  }
  if (ch === '"') {
    state.inString = true;
    return true;
  }
  return false;
}

/** Strip comments and trailing commas, leaving string contents untouched. */
export function stripJsonComments(text: string): string {
  let out = '';
  let inLine = false;
  let inBlock = false;
  const str: StringState = { inString: false, escaped: false };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inLine) {
      if (ch === '\n') {
        inLine = false;
        out += ch;
      }
      continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false;
        i += 1;
      }
      continue;
    }
    if (stepString(ch ?? '', str)) {
      out += ch;
      continue;
    }
    if (ch === '/' && next === '/') {
      inLine = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlock = true;
      i += 1;
      continue;
    }
    out += ch;
  }
  return dropTrailingCommas(out);
}

/** `[1, 2, ]` and `{ "a": 1, }` are both ordinary in a tsconfig. */
function dropTrailingCommas(text: string): string {
  let out = '';
  const str: StringState = { inString: false, escaped: false };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (stepString(ch ?? '', str)) {
      out += ch;
      continue;
    }
    if (ch === ',') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j] ?? '')) j += 1;
      const after = text[j];
      if (after === '}' || after === ']') continue;
    }
    out += ch;
  }
  return out;
}

/**
 * One configuration file as a record, or null when it is absent, unreadable, or
 * not an object. Never throws, because a resolver that cannot read a tsconfig
 * still resolves every relative import in the repository.
 */
export function readJsonFile(path: string): Record<string, unknown> | null {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    try {
      parsed = JSON.parse(stripJsonComments(text));
    } catch {
      return null;
    }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}
