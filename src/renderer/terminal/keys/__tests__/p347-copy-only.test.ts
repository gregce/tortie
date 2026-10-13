/**
 * Phase 347, issue 41 (his ruling of 12 October, "Nothing"): ⌘C in a session
 * only copies. With nothing selected it writes NO byte, because Claude Code,
 * Codex and pi read the interrupt at their prompt as "clear what I typed",
 * and a stray ⌘C threw a draft away. ⌃C is still the interrupt, and it is
 * xterm's own byte, never this handler's.
 *
 *   K1  ⌘C, no selection: nothing written, nothing copied, preventDefault
 *       called, false returned, on this Mac and on another machine alike.
 *   K2  ⌘C, a selection: copied once, nothing written.
 *   K3  a selection held in the history alone counts (Phase 209); and a
 *       selection that ends between two keydowns copies once, then nothing.
 *   K4  ⌃C (and every other modifier set on `c`) is handed to xterm exactly
 *       as at the parent: true, nothing written, no preventDefault.
 *   K5  the keymap row says what the key does now, under its new id, and no
 *       ⌘C row's id or action names the interrupt.
 *   K6  the census: no production file under src/renderer spells the
 *       interrupt byte in code, comments blanked.
 *
 * K1's arm, K5 and K6 are also read as rules over text, and every clause is
 * proved on in-memory ablations that must read red (the p334 R11/R12
 * pattern), beside controls that must stay green. Nothing here opens a
 * window, a terminal or a session.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import type { ScrollSurface } from '../../scroll/surface';

// The capture module reaches the zustand store, which needs a `window` this
// node-environment suite does not have; multiline.test.ts stubs it the same
// way. `hasSelection` is the one the ⌘C branch asks.
vi.mock('../../capture', () => ({
  clearSession: vi.fn(),
  copySelection: vi.fn(() => Promise.resolve()),
  hasSelection: vi.fn(() => false),
  selectAll: vi.fn()
}));

import {
  KEYMAP,
  keyDisplay,
  keymapEntry,
  normalizeAccelerator,
  type KeymapEntry
} from '@shared/keymap';
import { copySelection, hasSelection } from '../../capture';
import { terminalKeyHandler } from '../index';
import {
  SRC,
  relPath,
  sourceFiles,
  stripComments
} from '../../../../shared/__tests__/source-scan';

// -----------------------------------------------------------------------------
// The harness: the SHIPPING handler over a fake xterm that records its input.
// -----------------------------------------------------------------------------

interface Harness {
  handler: (event: KeyboardEvent) => boolean;
  /** Everything the handler wrote into xterm, in order. */
  written: string[];
}

function harness(onThisMac = true, termSelection = false): Harness {
  const written: string[] = [];
  const term = {
    input: (data: string) => written.push(data),
    // Never asked by the handler itself; capture's hasSelection (mocked
    // above) is what it asks. K3 sets this false to make that point.
    hasSelection: () => termSelection
  } as unknown as Terminal;
  const surface = {
    view: { owned: true },
    scrollPages: () => undefined
  } as unknown as ScrollSurface;
  return {
    handler: terminalKeyHandler(
      's1',
      term,
      () => 'zz',
      surface,
      () => null,
      () => onThisMac
    ),
    written
  };
}

type Mods = Partial<
  Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>
>;

function keydown(
  key: string,
  mods: Mods
): { event: KeyboardEvent; prevented: () => boolean } {
  const preventDefault = vi.fn();
  const event = {
    type: 'keydown',
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault,
    ...mods
  } as unknown as KeyboardEvent;
  return { event, prevented: () => preventDefault.mock.calls.length > 0 };
}

const CMD = { metaKey: true } as const;
const CTRL = { ctrlKey: true } as const;

beforeEach(() => {
  vi.mocked(hasSelection).mockReset();
  vi.mocked(hasSelection).mockReturnValue(false);
  vi.mocked(copySelection).mockClear();
});

afterEach(() => {
  vi.mocked(hasSelection).mockReset();
});

// -----------------------------------------------------------------------------
// K1 to K4. The behaviour, driven.
// -----------------------------------------------------------------------------

describe('K1. ⌘C with nothing selected does nothing', () => {
  for (const onThisMac of [true, false]) {
    it(`writes no byte, copies nothing, and still swallows the chord (${onThisMac ? 'this Mac' : 'another machine'})`, () => {
      const h = harness(onThisMac);
      const { event, prevented } = keydown('c', CMD);
      expect(h.handler(event)).toBe(false);
      expect(h.written).toEqual([]);
      expect(copySelection).not.toHaveBeenCalled();
      // Kept so the Edit menu's role:'copy' never acts on the chord in a
      // focused session; "nothing" must not depend on that role.
      expect(prevented()).toBe(true);
      expect(hasSelection).toHaveBeenCalledWith('s1');
    });
  }

  it('does nothing however many times it is pressed', () => {
    const h = harness();
    for (let i = 0; i < 5; i += 1) h.handler(keydown('c', CMD).event);
    expect(h.written).toEqual([]);
    expect(copySelection).not.toHaveBeenCalled();
  });
});

describe('K2. ⌘C with a selection copies, as at the parent', () => {
  it('copies once and writes nothing', () => {
    vi.mocked(hasSelection).mockReturnValue(true);
    const h = harness(true, true);
    const { event, prevented } = keydown('c', CMD);
    expect(h.handler(event)).toBe(false);
    expect(copySelection).toHaveBeenCalledTimes(1);
    expect(copySelection).toHaveBeenCalledWith('s1');
    expect(h.written).toEqual([]);
    expect(prevented()).toBe(true);
  });
});

describe('K3. a selection held in the history counts', () => {
  it('copies when only the history holds the selection', () => {
    // The mock answers true while the terminal itself has nothing selected:
    // the history selection of Phase 209, scrolled off the screen.
    vi.mocked(hasSelection).mockReturnValue(true);
    const h = harness(true, false);
    expect(h.handler(keydown('c', CMD).event)).toBe(false);
    expect(copySelection).toHaveBeenCalledTimes(1);
    expect(h.written).toEqual([]);
  });

  it('a selection that ends between two keydowns: one copy, then nothing', () => {
    vi.mocked(hasSelection).mockReturnValueOnce(true).mockReturnValue(false);
    const h = harness();
    const first = keydown('c', CMD);
    const second = keydown('c', CMD);
    expect(h.handler(first.event)).toBe(false);
    expect(h.handler(second.event)).toBe(false);
    expect(copySelection).toHaveBeenCalledTimes(1);
    expect(h.written).toEqual([]);
    expect(first.prevented() && second.prevented()).toBe(true);
  });
});

describe('K4. ⌃C and every other modifier set are handed to xterm, unchanged', () => {
  const others: Array<[string, Mods]> = [
    ['⌃C', CTRL],
    ['⌃⇧C', { ctrlKey: true, shiftKey: true }],
    ['⌘⇧C', { metaKey: true, shiftKey: true }],
    ['⌘⌥C', { metaKey: true, altKey: true }],
    ['⌘⌃C', { metaKey: true, ctrlKey: true }],
    ['⌥C', { altKey: true }],
    ['C alone', {}]
  ];
  for (const selected of [false, true]) {
    for (const [name, mods] of others) {
      it(`${name}${selected ? ' with a selection' : ''}: true, nothing written, nothing copied, no preventDefault`, () => {
        vi.mocked(hasSelection).mockReturnValue(selected);
        const h = harness();
        const { event, prevented } = keydown('c', mods);
        expect(h.handler(event)).toBe(true);
        expect(h.written).toEqual([]);
        expect(copySelection).not.toHaveBeenCalled();
        expect(prevented()).toBe(false);
      });
    }
  }
});

// -----------------------------------------------------------------------------
// K1, read from source: the ⌘C arm writes nothing and keeps its two answers.
// -----------------------------------------------------------------------------

const KEYS_REL = 'renderer/terminal/keys/index.ts';
const KEYS = readFileSync(resolve(SRC, KEYS_REL), 'utf8');

/** The ⌘C arm of the switch, comments blanked, or null when it is not found. */
function copyArm(source: string): string | null {
  const code = stripComments(source);
  const start = code.indexOf("case 'c':");
  if (start < 0) return null;
  const end = code.indexOf("case 'a':", start);
  if (end < 0) return null;
  return code.slice(start, end);
}

function armFindings(source: string): string[] {
  const arm = copyArm(source);
  if (arm === null) return ["no `case 'c':` arm before `case 'a':`"];
  const out: string[] = [];
  if (/\.input\s*\(/.test(arm)) out.push('the ⌘C arm writes into the terminal');
  if (/\bsendInput\s*\(/.test(arm)) out.push('the ⌘C arm sends input to the session');
  const prevent = arm.indexOf('event.preventDefault()');
  const ask = arm.indexOf('hasSelection(sessionId)');
  if (prevent < 0) out.push('the ⌘C arm no longer calls preventDefault');
  if (ask < 0) out.push('the ⌘C arm no longer asks hasSelection(sessionId)');
  if (prevent >= 0 && ask >= 0 && prevent > ask) {
    out.push('preventDefault is called only after the selection is asked, so not on both branches');
  }
  if (!/if \(hasSelection\(sessionId\)\) \{\s*void copySelection\(sessionId\);\s*\}/.test(arm)) {
    out.push('a selection no longer copies');
  }
  if (/return true/.test(arm)) out.push('the ⌘C arm hands the chord on');
  const returns = arm.match(/\breturn\b[^;]*;/g) ?? [];
  if (returns.length !== 1 || returns[0] !== 'return false;') {
    out.push(`the ⌘C arm must end in exactly one \`return false;\` (found ${JSON.stringify(returns)})`);
  }
  if (/\bETX\b/.test(stripComments(source))) out.push('the ETX constant is back');
  return out;
}

describe('K1, read from source: the ⌘C arm', () => {
  it('the shipping source reads clean', () => {
    expect(armFindings(KEYS)).toEqual([]);
  });

  const ablations: Array<[string, (s: string) => string]> = [
    [
      'the interrupt written back',
      (s) =>
        s.replace(
          /\} else \{\n(\s*\/\/[^\n]*\n)+\s*\}/,
          "} else {\n          term.input('\\u0003');\n        }"
        )
    ],
    [
      'the ETX constant and its write restored',
      (s) =>
        s
          .replace(
            'function isPlainMeta(',
            "const ETX = '\\u0003';\n\nfunction isPlainMeta("
          )
          .replace(
            /\} else \{\n(\s*\/\/[^\n]*\n)+\s*\}/,
            '} else {\n          term.input(ETX);\n        }'
          )
    ],
    [
      'the interrupt sent through the bridge instead',
      (s) =>
        s.replace(
          /\} else \{\n(\s*\/\/[^\n]*\n)+\s*\}/,
          "} else {\n          void window.gmux.term.sendInput(sessionId, String.fromCharCode(3));\n        }"
        )
    ],
    [
      'preventDefault dropped',
      (s) => s.replace("case 'c':\n        event.preventDefault();\n", "case 'c':\n")
    ],
    [
      'preventDefault moved into the selection branch',
      (s) =>
        s
          .replace("case 'c':\n        event.preventDefault();\n", "case 'c':\n")
          .replace(
            'if (hasSelection(sessionId)) {\n          void copySelection(sessionId);',
            'if (hasSelection(sessionId)) {\n          event.preventDefault();\n          void copySelection(sessionId);'
          )
    ],
    [
      'the chord handed on with nothing selected',
      (s) =>
        s.replace(
          /\} else \{\n(\s*\/\/[^\n]*\n)+\s*\}\n(\s*)return false;\n(\s*)case 'a':/,
          "} else {\n          return true;\n        }\n$2return false;\n$3case 'a':"
        )
    ],
    [
      'the arm returns true',
      (s) =>
        s.replace(
          /(\} else \{\n(?:\s*\/\/[^\n]*\n)+\s*\}\n\s*)return false;/,
          '$1return true;'
        )
    ],
    [
      'a selection no longer copies',
      (s) =>
        s.replace(
          'if (hasSelection(sessionId)) {\n          void copySelection(sessionId);',
          'if (hasSelection(sessionId)) {\n          void selectAll(sessionId);'
        )
    ]
  ];
  for (const [name, ablate] of ablations) {
    it(`ablation: ${name} reads red`, () => {
      const broken = ablate(KEYS);
      expect(broken, 'the ablation found its text').not.toBe(KEYS);
      expect(armFindings(broken).length).toBeGreaterThan(0);
    });
  }

  it('control: a comment naming the interrupt inside the arm stays green', () => {
    const planted = KEYS.replace(
      "case 'c':\n        event.preventDefault();\n",
      "case 'c':\n        // term.input('\\u0003') is what the parent did here.\n        event.preventDefault();\n"
    );
    expect(planted).not.toBe(KEYS);
    expect(armFindings(planted)).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// K5. The keymap row.
// -----------------------------------------------------------------------------

const CMD_C = normalizeAccelerator('Cmd+C');

const COPY_ACTION = 'Copy';
const COPY_EXPLAIN =
  'Copies the selected text. With nothing selected it does nothing, so a draft at an agent’s prompt is never cleared; ⌃C is the interrupt.';

type Row = Pick<
  KeymapEntry,
  'id' | 'action' | 'explain' | 'keys' | 'scope' | 'assignable'
>;

function rowFindings(rows: readonly Row[]): string[] {
  const out: string[] = [];
  const copy = rows.filter((r) => r.id === 'terminal.copy');
  if (copy.length !== 1) out.push(`expected one terminal.copy row, found ${copy.length}`);
  const row = copy[0];
  if (row !== undefined) {
    if (row.action !== COPY_ACTION) out.push(`terminal.copy's action is ${JSON.stringify(row.action)}`);
    if (row.explain !== COPY_EXPLAIN) out.push(`terminal.copy's explain is ${JSON.stringify(row.explain)}`);
    if (row.keys.length !== 1 || row.keys[0]?.accelerator !== CMD_C) out.push('terminal.copy is not ⌘C alone');
    if (row.scope !== 'terminal') out.push('terminal.copy is not a terminal row');
    if (row.assignable !== false) out.push('terminal.copy became assignable, so a setting could store it');
  }
  for (const r of rows) {
    if (/copyOrInterrupt/i.test(r.id)) out.push(`${r.id}: the old id is back`);
    const onCmdC = r.keys.some((c) => c.accelerator === CMD_C);
    if (onCmdC && /interrupt/i.test(r.id)) out.push(`${r.id}: a ⌘C row's id names the interrupt`);
    if (onCmdC && /interrupt/i.test(r.action)) out.push(`${r.id}: a ⌘C row's action names the interrupt`);
    if (onCmdC && /sends the interrupt/i.test(r.explain)) out.push(`${r.id}: a ⌘C row says it sends the interrupt`);
  }
  return out;
}

describe('K5. the keymap row says what ⌘C does now', () => {
  it('the shipping keymap reads clean', () => {
    expect(rowFindings(KEYMAP)).toEqual([]);
    const row = keymapEntry('terminal.copy');
    expect(row.action).toBe(COPY_ACTION);
    expect(row.explain).toBe(COPY_EXPLAIN);
    expect(keyDisplay('terminal.copy')).toBe('⌘C');
  });

  it('lists ⌃C as the interrupt, display only, and reserves it from the recorder', async () => {
    // The main session's addition after the reverify: with ⌘C copying only,
    // the interrupt must be findable. One row, ⌃C exactly, never assignable,
    // and the chord no agent shortcut may take.
    const rows = KEYMAP.filter((r) => r.id === 'terminal.interrupt');
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.keys.map((c) => c.accelerator)).toEqual(['Ctrl+C']);
    expect(row.assignable).toBe(false);
    expect(row.scope).toBe('terminal');
    expect(row.action).toBe('Interrupt');
    const { RESERVED_APP_CHORDS } = await import('@shared/keymap');
    expect(RESERVED_APP_CHORDS['Ctrl+C']).toBe('Interrupt');
  });

  it('the terminal menu hints its Copy row from the renamed id', () => {
    const menu = stripComments(
      readFileSync(resolve(SRC, 'renderer/terminal/terminal-menu.ts'), 'utf8')
    );
    expect(menu).toMatch(/label: 'Copy',[\s\S]{0,120}?hint: keyDisplay\('terminal\.copy'\)/);
  });

  const withRow = (patch: Partial<Row>): Row[] =>
    KEYMAP.map((r) => (r.id === 'terminal.copy' ? { ...r, ...patch } : r));
  const ablations: Array<[string, () => Row[]]> = [
    ['the old id', () => withRow({ id: 'terminal.copyOrInterrupt' })],
    ['the old action', () => withRow({ action: 'Copy or interrupt' })],
    [
      'the old explanation',
      () =>
        withRow({
          explain:
            'With text selected it copies. With nothing selected it sends the interrupt an agent reads as “stop” — the gesture you want when something runs away.'
        })
    ],
    ['made assignable', () => withRow({ assignable: true })],
    [
      'a second ⌘C row naming the interrupt',
      () => [
        ...KEYMAP,
        { ...keymapEntry('terminal.copy'), id: 'terminal.interrupt', action: 'Interrupt' }
      ]
    ]
  ];
  for (const [name, rows] of ablations) {
    it(`ablation: ${name} reads red`, () => {
      expect(rowFindings(rows()).length).toBeGreaterThan(0);
    });
  }
});

// -----------------------------------------------------------------------------
// K6. The census: nothing under src/renderer spells the interrupt byte in code.
// -----------------------------------------------------------------------------

/**
 * Every spelling of U+0003 a source file could hand to a terminal: the two
 * escapes the spec names, the braced escape, a legacy octal escape, the
 * character built from its number, and the raw byte itself.
 */
const ETX_SPELLINGS: ReadonlyArray<[string, RegExp]> = [
  ['\\u0003', /\\u0003/],
  ['\\x03', /\\x03/i],
  ['\\u{3}', /\\u\{0*3\}/i],
  ['octal \\003', /\\0{1,2}3(?![0-9])/],
  [
    'fromCharCode/fromCodePoint(3)',
    /from(?:CharCode|CodePoint)\(\s*(?:0x0*3|0o0*3|0b0*11|0*3)\s*[,)]/i
  ],
  ['the raw byte', /\u0003/]
];

interface SourceText {
  rel: string;
  text: string;
}

function etxFindings(files: readonly SourceText[]): string[] {
  const out: string[] = [];
  for (const { rel, text } of files) {
    stripComments(text)
      .split('\n')
      .forEach((line, i) => {
        for (const [name, re] of ETX_SPELLINGS) {
          if (re.test(line)) out.push(`${rel}:${i + 1}: ${name}`);
        }
      });
  }
  return out;
}

const RENDERER_FILES: SourceText[] = sourceFiles(resolve(SRC, 'renderer')).map(
  (file) => ({ rel: relPath(file), text: readFileSync(file, 'utf8') })
);

describe('K6. no production file under src/renderer writes the interrupt byte', () => {
  it('reads the renderer whole, keys/index.ts included', () => {
    expect(RENDERER_FILES.length).toBeGreaterThan(300);
    expect(RENDERER_FILES.some((f) => f.rel === KEYS_REL)).toBe(true);
  });

  it('the shipping renderer reads clean', () => {
    expect(etxFindings(RENDERER_FILES)).toEqual([]);
  });

  const plantIn = (code: string): SourceText[] =>
    RENDERER_FILES.map((f) =>
      f.rel === KEYS_REL
        ? {
            rel: f.rel,
            text: f.text.replace(
              /\} else \{\n(\s*\/\/[^\n]*\n)+\s*\}/,
              `} else {\n          ${code}\n        }`
            )
          }
        : f
    );

  // The spec's ablation first, then one per spelling the census names.
  const plants: Array<[string, string]> = [
    ["term.input('\\u0003') planted back", "term.input('\\u0003');"],
    ['\\x03', 'term.input("\\x03");'],
    ['\\u{3}', 'term.input(`\\u{3}`);'],
    ['octal \\003', "term.input('\\003');"],
    ['String.fromCharCode(3)', 'term.input(String.fromCharCode(3));'],
    ['String.fromCodePoint(0x03)', 'term.input(String.fromCodePoint(0x03));'],
    ['the raw byte', "term.input('\u0003');"]
  ];
  for (const [name, code] of plants) {
    it(`ablation: ${name} in a copy of keys/index.ts reads red`, () => {
      const planted = plantIn(code);
      const before = RENDERER_FILES.find((f) => f.rel === KEYS_REL)?.text;
      const after = planted.find((f) => f.rel === KEYS_REL)?.text;
      expect(after, 'the plant found its text').not.toBe(before);
      const found = etxFindings(planted);
      expect(found.length).toBeGreaterThan(0);
      expect(found.every((f) => f.startsWith(`${KEYS_REL}:`))).toBe(true);
    });
  }

  it('control: the same byte named in a comment stays green', () => {
    const planted = plantIn("// term.input('\\u0003') was the parent's answer.");
    expect(planted.find((f) => f.rel === KEYS_REL)?.text).not.toBe(
      RENDERER_FILES.find((f) => f.rel === KEYS_REL)?.text
    );
    expect(etxFindings(planted)).toEqual([]);
  });

  it('control: a character code that only starts with 3 stays green', () => {
    const planted = plantIn(
      'term.input(String.fromCharCode(33) + String.fromCodePoint(0x30));'
    );
    expect(planted.find((f) => f.rel === KEYS_REL)?.text).not.toBe(
      RENDERER_FILES.find((f) => f.rel === KEYS_REL)?.text
    );
    expect(etxFindings(planted)).toEqual([]);
  });
});
