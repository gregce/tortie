/**
 * Unit tests for the display-name → tmux-name sanitizer.
 *
 * Runner: vitest (`npm test`). Assertions stay on node:assert/strict —
 * they work unchanged under vitest's node environment.
 *
 * PHASE 349 (build/p349/SPEC.md D7, D17, M1) adds the rule that holds back
 * what tmux reads in a name, `holdBackTmuxSyntax`: its table over the
 * reconstructed M1 corpus (§2.1.1), the cut before it, its idempotence, a
 * reference reading written another way over 2,000 seeded names, and the
 * reserved control session name pinned to `CONTROL_SESSION_NAME` itself.
 */

import { describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import {
  dedupeSessionName,
  formatSessionTarget,
  FALLBACK_TMUX_NAME,
  holdBackTmuxSyntax,
  MAX_TMUX_NAME_LENGTH,
  RESERVED_TMUX_NAMES,
  sanitizeSessionName
} from '../names';

// The control client reaches the supervisor, which reaches Electron and the
// disk. Only its one constant is read here, so the import graph stays inert.
vi.mock('../supervisor', () => ({
  ensureServer: () => Promise.reject(new Error('not used here')),
  tmuxArgs: () => []
}));

describe('sanitizeSessionName', () => {
  it('passes plain names through untouched', () => {
    assert.equal(sanitizeSessionName('auth-refactor'), 'auth-refactor');
    assert.equal(sanitizeSessionName('webapp_2'), 'webapp_2');
  });

  it('rewrites . : / to - (tmux 3.7+ accepts them verbatim; -t breaks)', () => {
    assert.equal(sanitizeSessionName('webapp/auth.refactor'), 'webapp-auth-refactor');
    assert.equal(sanitizeSessionName('a:b'), 'a-b');
    assert.equal(sanitizeSessionName('v1.2.3'), 'v1-2-3');
  });

  it('replaces each ambiguous character individually (no collapsing)', () => {
    assert.equal(sanitizeSessionName('a.:b'), 'a--b');
    assert.equal(sanitizeSessionName('a//b'), 'a--b');
  });

  it('keeps spaces (targets use $-ids), collapsing runs and trimming', () => {
    assert.equal(sanitizeSessionName('  my   cool session  '), 'my cool session');
  });

  it('folds tabs and newlines into single spaces', () => {
    assert.equal(sanitizeSessionName('a\t\nb'), 'a b');
  });

  it('strips C0 controls, DEL and C1 controls', () => {
    const bell = String.fromCharCode(7);
    const esc = String.fromCharCode(27);
    const del = String.fromCharCode(127);
    const c1 = String.fromCharCode(0x85);
    assert.equal(sanitizeSessionName(`a${bell}${esc}b${del}${c1}c`), 'abc');
  });

  it('falls back when nothing survives', () => {
    assert.equal(sanitizeSessionName(''), FALLBACK_TMUX_NAME);
    assert.equal(sanitizeSessionName('   '), FALLBACK_TMUX_NAME);
    assert.equal(sanitizeSessionName(String.fromCharCode(7, 27)), FALLBACK_TMUX_NAME);
  });

  it('caps absurd lengths', () => {
    const long = 'a'.repeat(MAX_TMUX_NAME_LENGTH * 2);
    assert.equal(sanitizeSessionName(long).length, MAX_TMUX_NAME_LENGTH);
  });

  it('keeps unicode display names intact', () => {
    assert.equal(sanitizeSessionName('déploiement été'), 'déploiement été');
    assert.equal(sanitizeSessionName('日本語セッション'), '日本語セッション');
  });
});

describe('dedupeSessionName', () => {
  it('returns the name unchanged when free', () => {
    assert.equal(dedupeSessionName('a-b', new Set(['x'])), 'a-b');
  });

  it('suffixes -2 on first collision (a.b vs a:b both sanitize to a-b)', () => {
    assert.equal(dedupeSessionName('a-b', new Set(['a-b'])), 'a-b-2');
  });

  it('walks to the next free suffix', () => {
    const taken = new Set(['a-b', 'a-b-2', 'a-b-3']);
    assert.equal(dedupeSessionName('a-b', taken), 'a-b-4');
  });
});

describe('formatSessionTarget', () => {
  it('passes immutable $-ids through', () => {
    assert.equal(formatSessionTarget('$12'), '$12');
  });

  it('prefixes names with = for exact-match targeting', () => {
    assert.equal(formatSessionTarget('auth-refactor'), '=auth-refactor');
  });
});

// ---------------------------------------------------------------------------
// PHASE 349 — D7, D17: what tmux reads in a name is held back
// ---------------------------------------------------------------------------

const BACKSLASH = String.fromCharCode(92);

describe('holdBackTmuxSyntax (Phase 349, D7)', () => {
  it('maps every backslash, which every measured version doubles', () => {
    assert.equal(holdBackTmuxSyntax(`a${BACKSLASH}b`), 'a_b');
    assert.equal(holdBackTmuxSyntax(`c${BACKSLASH}`), 'c_');
    assert.equal(holdBackTmuxSyntax(BACKSLASH), '_');
    assert.equal(holdBackTmuxSyntax(BACKSLASH.repeat(2)), '__');
    assert.equal(holdBackTmuxSyntax(`path${BACKSLASH}to${BACKSLASH}file`), 'path_to_file');
    assert.equal(holdBackTmuxSyntax(`x${BACKSLASH}y z`), 'x_y z');
  });

  it('maps a # before a format, a job, an escaped #, #, and #}, judged by the character that followed it', () => {
    for (const letter of 'DFHIPSTWh') assert.equal(holdBackTmuxSyntax(`#${letter}`), `_${letter}`, letter);
    assert.equal(holdBackTmuxSyntax('#{session_id}'), '_{session_id}');
    assert.equal(holdBackTmuxSyntax('#(x)'), '_(x)');
    assert.equal(holdBackTmuxSyntax('##'), '__');
    assert.equal(holdBackTmuxSyntax('#,'), '_,');
    assert.equal(holdBackTmuxSyntax('#}'), '_}');
    assert.equal(holdBackTmuxSyntax('#{x'), '_{x');
    assert.equal(holdBackTmuxSyntax('a##b'), 'a_#b');
    assert.equal(holdBackTmuxSyntax('PR #{session_name}'), 'PR _{session_name}');
    assert.equal(holdBackTmuxSyntax('fix #H here'), 'fix _H here');
    assert.equal(holdBackTmuxSyntax('#{?pane_dead,dead,live}'), '_{?pane_dead,dead,live}');
    assert.equal(holdBackTmuxSyntax('deploy #S now'), 'deploy _S now');
  });

  it('maps a # that ends the name, which 3.7b and 3.7c drop', () => {
    assert.equal(holdBackTmuxSyntax('fix #'), 'fix _');
    assert.equal(holdBackTmuxSyntax('C#'), 'C_');
    assert.equal(holdBackTmuxSyntax('#'), '_');
  });

  it('maps a final ; and a leading - or $, and nothing else of either', () => {
    assert.equal(holdBackTmuxSyntax('x;'), 'x_');
    assert.equal(holdBackTmuxSyntax('a;b;'), 'a;b_');
    assert.equal(holdBackTmuxSyntax(';'), '_');
    assert.equal(holdBackTmuxSyntax('-x'), '_x');
    assert.equal(holdBackTmuxSyntax('--'), '_-');
    assert.equal(holdBackTmuxSyntax('$0'), '_0');
    assert.equal(holdBackTmuxSyntax('$HOME x'), '_HOME x');
    assert.equal(holdBackTmuxSyntax('a-$b'), 'a-$b');
    assert.equal(holdBackTmuxSyntax('cost $HOME'), 'cost $HOME');
  });

  it('keeps whole every name tmux takes whole today, unless it begins with - or $', () => {
    const family = String.fromCodePoint(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467, 0x200d, 0x1f466);
    for (const name of [
      'plain name', 'claude-3', 'fix--auth', "it's", 'PR #12', '#x', '#[fg=red]ok', '50% done', '%Y', 'a;b',
      'gmux-control', 'café ☕', 'مرحبا بالعالم', '日本語のセッション', `${family} fam`, '#G', '#a', '# x', 'a#b',
      'a'.repeat(120)
    ]) {
      assert.equal(holdBackTmuxSyntax(name), name, JSON.stringify(name));
    }
  });

  it('replaces one unit for one unit, so a name never grows', () => {
    for (const name of [`${BACKSLASH}#{x};`, '-#H;', '$##;', 'x'.repeat(200)]) {
      assert.equal(holdBackTmuxSyntax(name).length, name.length);
    }
  });
});

describe('sanitizeSessionName applies D7 LAST, after the cut (Phase 349, D17)', () => {
  it('holds back what the earlier steps leave, a leading - from a leading . : or / included', () => {
    assert.equal(sanitizeSessionName('/review'), '_review');
    assert.equal(sanitizeSessionName('  .env fix '), '_env fix');
    assert.equal(sanitizeSessionName(':x'), '_x');
    assert.equal(sanitizeSessionName('-x'), '_x');
    assert.equal(sanitizeSessionName('$0'), '_0');
    assert.equal(sanitizeSessionName('x;'), 'x_');
    assert.equal(sanitizeSessionName('fix #H'), 'fix _H');
    assert.equal(sanitizeSessionName(`a${BACKSLASH}b`), 'a_b');
    assert.equal(sanitizeSessionName('PR #12'), 'PR #12');
    assert.equal(sanitizeSessionName('a;b'), 'a;b');
  });

  it('judges the name the cut left: a # or a ; the cut makes last is mapped, and the length stays the cap', () => {
    const hash = sanitizeSessionName(`${'a'.repeat(MAX_TMUX_NAME_LENGTH - 1)}#x and more`);
    assert.equal(hash, `${'a'.repeat(MAX_TMUX_NAME_LENGTH - 1)}_`);
    const semi = sanitizeSessionName(`${'a'.repeat(MAX_TMUX_NAME_LENGTH - 1)};x and more`);
    assert.equal(semi, `${'a'.repeat(MAX_TMUX_NAME_LENGTH - 1)}_`);
    assert.equal(sanitizeSessionName('x'.repeat(250)), 'x'.repeat(MAX_TMUX_NAME_LENGTH));
  });

  it('still falls back when nothing survives: D7 never empties a name', () => {
    assert.equal(sanitizeSessionName(String.fromCharCode(7)), FALLBACK_TMUX_NAME);
    assert.equal(sanitizeSessionName('-'), '_');
    assert.equal(sanitizeSessionName('#'), '_');
  });
});

/** A small seeded generator, so a failure names the name it failed on. */
function seeded(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** Every character D7 reads, every character the other steps read, and plain text. */
const ALPHABET = [
  '#', '#', '#', ';', ';', '-', '$', BACKSLASH, '{', '}', '(', ')', ',', '[', ']', '%', '.', ':', '/', ' ', ' ',
  'D', 'F', 'H', 'I', 'P', 'S', 'T', 'W', 'h', 'x', 'G', 'a', '1', 'é', '日', String.fromCharCode(9), String.fromCharCode(7)
];

function seededName(rnd: () => number, max: number): string {
  const count = Math.floor(rnd() * max);
  let name = '';
  for (let i = 0; i < count; i += 1) name += ALPHABET[Math.floor(rnd() * ALPHABET.length)] ?? 'x';
  return name;
}

/**
 * THE REFERENCE READING, written another way: one regular expression over the
 * name as handed in, where the lookahead reads each `#`'s next character in
 * that same name, and every match replaced by `_` in one pass.
 */
function referenceReading(name: string): string {
  return name.replace(/\\|#(?=[{(#,}DFHIPSTWh]|$)|;$|^[-$]/g, '_');
}

describe('D7 over 2,000 seeded names (Phase 349, D7, D17)', () => {
  it('equals the reference reading, is idempotent, and leaves nothing tmux reads', () => {
    const rnd = seeded(349);
    const wrong: string[] = [];
    for (let n = 0; n < 2_000; n += 1) {
      const name = seededName(rnd, 40);
      const held = holdBackTmuxSyntax(name);
      if (held !== referenceReading(name)) wrong.push(`${JSON.stringify(name)}: ${JSON.stringify(held)} against ${JSON.stringify(referenceReading(name))}`);
      if (holdBackTmuxSyntax(held) !== held) wrong.push(`${JSON.stringify(name)}: not idempotent`);
      const local = sanitizeSessionName(name);
      if (sanitizeSessionName(local) !== local) wrong.push(`${JSON.stringify(name)}: the local rule is not idempotent`);
      const leftover =
        local.includes(BACKSLASH) ||
        /#(?=[{(#,}DFHIPSTWh]|$)/.test(local) ||
        local.endsWith(';') ||
        local.startsWith('-') ||
        local.startsWith('$');
      if (leftover) wrong.push(`${JSON.stringify(name)}: ${JSON.stringify(local)} still holds what tmux reads`);
    }
    assert.deepEqual(wrong.slice(0, 10), []);
  });
});

describe('the reserved name (Phase 349, D7, M1)', () => {
  it('is exactly the control client\'s own session name, the constant itself', async () => {
    const { CONTROL_SESSION_NAME } = await import('../control-client');
    assert.deepEqual([...RESERVED_TMUX_NAMES], [CONTROL_SESSION_NAME]);
    assert.ok(Object.isFrozen(RESERVED_TMUX_NAMES));
  });

  it('is always taken, so no session is ever given it, whatever the machine holds', () => {
    assert.equal(dedupeSessionName('gmux-control', new Set()), 'gmux-control-2');
    assert.equal(dedupeSessionName('gmux-control', new Set(['gmux-control-2'])), 'gmux-control-3');
    assert.equal(dedupeSessionName('gmux-control-2', new Set()), 'gmux-control-2');
    assert.equal(dedupeSessionName(sanitizeSessionName('gmux-control'), new Set(['x'])), 'gmux-control-2');
  });
});
