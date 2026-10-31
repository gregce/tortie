/**
 * Phase 349 (build/p349/SPEC.md D7, D15, D16, §4.3 steps 5 to 8): the far
 * names, the far stamp and the two warnings, their pure and source-text halves.
 * `./p342-far-names.test.ts` drives the far create, the rename, the warnings
 * and the restore through its own harness; this file holds what needs none.
 *
 *  - `farTmuxName` keeps its body (Phase 342's `$` as `_` after this Mac's
 *    sanitizer) and so composes D7's FAR rule: over the reconstructed M1
 *    corpus of §2.1.1 it equals a transcription of that rule written here,
 *    every answer holds nothing tmux reads, and the hard names read what §2.1.1
 *    says they read.
 *  - THE EIGHT PLACES a tmux name is composed all reach the one rule: the
 *    local create and rename, the core's two manifest-only names, the launch
 *    plan, the reconstruction, and `farTmuxName` at the far create, the far
 *    rename and (D16) the remote restore. None maps a character by hand.
 *  - `remoteStampArgs` (D15) sends a value's final `;` as a backslash then `;`
 *    and changes nothing else, and its file still imports nothing.
 *  - `remoteRename`'s two warnings name the error's code and never its text.
 *
 * Nothing here runs a command or opens a connection. The corpus is written
 * with `String.fromCharCode` and `String.fromCodePoint` wherever a character
 * would not show, and it holds no `#(`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { remoteStampArgs } from '../remote-stamps';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', '..');
const read = (path: string): string => readFileSync(join(SRC, path), 'utf8');
/** A file's code with its comments taken out, so prose cannot answer a question about code. */
const codeOf = (path: string): string =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const { farTmuxName } = await import('../remote-sessions');

const BS = String.fromCharCode(92);
const FAMILY = [0x1f468, 0x1f469, 0x1f467, 0x1f466].map((c) => String.fromCodePoint(c)).join(String.fromCodePoint(0x200d));

/** §2.1.1's 54 names: the 25 today's rule keeps on 3.5a to 3.6b, then the 29 it loses everywhere. */
const CORPUS: readonly string[] = [
  'plain name', 'claude-3', 'fix--auth', "it's", 'PR #12', '#x', '#[fg=red]ok', '50% done', '%Y', 'a;b',
  'gmux-control', `caf${String.fromCodePoint(0xe9)} ${String.fromCodePoint(0x2615)}`,
  [0x645, 0x631, 0x62d, 0x628, 0x627, 0x20, 0x628, 0x627, 0x644, 0x639, 0x627, 0x644, 0x645].map((c) => String.fromCodePoint(c)).join(''),
  [0x65e5, 0x672c, 0x8a9e, 0x306e, 0x30bb, 0x30c3, 0x30b7, 0x30e7, 0x30f3].map((c) => String.fromCodePoint(c)).join(''),
  `${FAMILY} fam`, 'a'.repeat(120), 'b'.repeat(121), 'x'.repeat(250),
  '/review', '.env fix', '-x', '--', 'cost $HOME', 'fix #', 'C#',
  `a${BS}b`, `c${BS}`, BS, BS + BS, `path${BS}to${BS}file`, `x${BS}y z`,
  '$0', '$HOME x', 'x;', 'a;b;',
  '#{session_id}', '#H', '#S', '#D', '#W', '#h', '#F', '#I', '#P', '#T',
  '##', '#,', '#}', '#{x', 'PR #{session_name}', 'fix #H here', 'a##b', '#{?pane_dead,dead,live}', 'deploy #S now'
];

/**
 * D7's far rule, TRANSCRIBED here from §4.3 step 5 another way: the name
 * cleaned as this Mac's rule cleans it, then held back by code point into an
 * array, then every `$` as `_`, then the reserved name taken.
 */
function farRuleAsWritten(display: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = display.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '').replace(/\s+/g, ' ').trim().replace(/[.:/]/g, '-').slice(0, 200);
  const points = [...cleaned];
  const out = [...points];
  const reads = new Set(['{', '(', '#', ',', '}', 'D', 'F', 'H', 'I', 'P', 'S', 'T', 'W', 'h']);
  points.forEach((p, i) => {
    if (p === BS) out[i] = '_';
    if (p === '#' && (i === points.length - 1 || reads.has(points[i + 1] ?? ''))) out[i] = '_';
  });
  if (out[out.length - 1] === ';') out[out.length - 1] = '_';
  if (out[0] === '-' || out[0] === '$') out[0] = '_';
  const held = out.join('') || 'session';
  const far = held.replace(/\$/g, '_');
  if (far !== 'gmux-control') return far;
  for (let n = 2; ; n += 1) if (`${far}-${String(n)}` !== 'gmux-control') return `${far}-${String(n)}`;
}

describe('farTmuxName composes D7\'s far rule over §2.1.1\'s corpus (D7)', () => {
  it('holds the 54 names, and not one of them holds #(', () => {
    expect(CORPUS).toHaveLength(54);
    expect(new Set(CORPUS).size).toBe(54);
    expect(CORPUS.some((n) => n.includes('#('))).toBe(false);
  });

  it('equals the rule as written, name by name, with nothing taken', () => {
    for (const name of CORPUS) expect(farTmuxName(name, new Set()), JSON.stringify(name)).toBe(farRuleAsWritten(name));
  });

  it('reads what §2.1.1 says the interesting names read', () => {
    const want: readonly (readonly [string, string])[] = [
      ['gmux-control', 'gmux-control-2'], ['/review', '_review'], ['.env fix', '_env fix'], ['-x', '_x'], ['--', '_-'],
      ['fix #', 'fix _'], ['C#', 'C_'], [`a${BS}b`, 'a_b'], ['$0', '_0'], ['$HOME x', '_HOME x'], ['x;', 'x_'],
      ['a;b;', 'a;b_'], ['#{session_id}', '_{session_id}'], ['#H', '_H'], ['##', '__'], ['a##b', 'a_#b'],
      ['cost $HOME', 'cost _HOME'], ['PR #12', 'PR #12'], ['a;b', 'a;b'], ['#[fg=red]ok', '#[fg=red]ok']
    ];
    for (const [typed, far] of want) expect(farTmuxName(typed, new Set()), typed).toBe(far);
    expect(farTmuxName('x'.repeat(250), new Set())).toBe('x'.repeat(200));
  });

  it('leaves nothing tmux reads in any far name: no backslash, $, # it reads, final ; or leading -', () => {
    for (const name of CORPUS) {
      const far = farTmuxName(name, new Set());
      expect(far.includes(BS), name).toBe(false);
      expect(far.includes('$'), name).toBe(false);
      expect(/#(?=[{(#,}DFHIPSTWh]|$)/.test(far), name).toBe(false);
      expect(far.endsWith(';'), name).toBe(false);
      expect(far.startsWith('-'), name).toBe(false);
    }
  });

  it('still dedupes after the mapping, against the names the machine holds', () => {
    expect(farTmuxName('/review', new Set(['_review']))).toBe('_review-2');
    expect(farTmuxName('gmux-control', new Set(['gmux-control-2']))).toBe('gmux-control-3');
  });
});

describe('the eight places a tmux name is composed reach the one rule (D7, D16)', () => {
  it('keeps farTmuxName\'s body, byte for byte: this Mac\'s sanitizer, every $ as _, then the dedupe', () => {
    const sessions = codeOf('main/machines/remote-sessions.ts');
    expect(sessions).toContain(
      "export function farTmuxName(display: string, taken: ReadonlySet<string>): string {\n  return dedupeSessionName(sanitizeSessionName(display).replace(/\\$/g, '_'), taken);\n}"
    );
    // The far create and the far rename call it.
    expect(sessions).toContain('const tmuxName = farTmuxName(input.name, takenNames(input.machineId));');
    expect(sessions).toContain('const tmuxName = farTmuxName(newDisplayName, taken);');
  });

  it('composes the remote restore\'s name by it, with nothing taken and nothing mapped by hand (D16)', () => {
    const restore = codeOf('main/machines/remote-restore.ts');
    expect(restore).toContain('const tmuxName = farTmuxName(record.tmuxName.length > 0 ? record.tmuxName : record.name, new Set());');
    expect(restore).not.toMatch(/\.replace\(/);
  });

  it('composes every local name through sanitizeSessionName, which applies D7 last', () => {
    expect(codeOf('main/tmux/sessions.ts').split('sanitizeSessionName(').length - 1).toBe(2);
    expect(codeOf('main/sessions/core.ts')).toContain('tmux.sanitizeSessionName(input.name)');
    expect(codeOf('main/sessions/launch-plan.ts')).toContain('tmuxName: sanitizeSessionName(input.name),');
    expect(codeOf('main/manifest/reconstruct.ts')).toContain('tmuxName: tmuxName ?? tmux.sanitizeSessionName(name),');
    const names = codeOf('main/tmux/names.ts');
    const sanitize = names.slice(names.indexOf('export function sanitizeSessionName('));
    expect(sanitize.indexOf('.slice(0, MAX_TMUX_NAME_LENGTH)')).toBeLessThan(sanitize.indexOf('holdBackTmuxSyntax(cleaned)'));
    expect(sanitize.indexOf('holdBackTmuxSyntax(cleaned)')).toBeLessThan(sanitize.indexOf('FALLBACK_TMUX_NAME'));
  });
});

describe('the far stamp keeps a final ; (D15)', () => {
  it('sends a value whose last character is ; with that ; as a backslash then ;', () => {
    expect(remoteStampArgs('$1', '@gmux-name', 'x;')).toEqual(['set-option', '-t', '$1', '@gmux-name', `x${BS};`]);
    expect(remoteStampArgs('$1', '@gmux-name', ';')).toEqual(['set-option', '-t', '$1', '@gmux-name', `${BS};`]);
    expect(remoteStampArgs('$1', '@gmux-name', ';;')).toEqual(['set-option', '-t', '$1', '@gmux-name', `;${BS};`]);
    expect(remoteStampArgs('$1', '@gmux-name', 'a;b;')).toEqual(['set-option', '-t', '$1', '@gmux-name', `a;b${BS};`]);
    // A value that already ends in a backslash and a ; keeps its backslash: tmux takes one off the end.
    expect(remoteStampArgs('$1', '@gmux-name', `a${BS};`)).toEqual(['set-option', '-t', '$1', '@gmux-name', `a${BS}${BS};`]);
    expect(remoteStampArgs('$1', '@gmux-project', '/srv/odd;')).toEqual(['set-option', '-t', '$1', '@gmux-project', `/srv/odd${BS};`]);
  });

  it('changes nothing else in any value, a leading -, --, #H, a backslash and $HOME included', () => {
    for (const value of ['', 'plain', '-x', '--', '#H', `a${BS}b`, '$HOME', 'a;b', ';a', 'x; ', '#{session_id}', "it's"]) {
      expect(remoteStampArgs('$7', '@gmux-name', value), JSON.stringify(value)).toEqual(['set-option', '-t', '$7', '@gmux-name', value]);
    }
  });

  it('spells its backslash by char code and imports nothing, so the leaf stays a leaf', () => {
    const stamps = read('main/machines/remote-stamps.ts');
    expect([...stamps.matchAll(/from\s+'([^']+)'/g)]).toEqual([]);
    expect(codeOf('main/machines/remote-stamps.ts')).toContain('String.fromCharCode(92)');
  });
});

describe('remoteRename\'s two warnings name the error\'s code, never its text (§4.3 step 7)', () => {
  const sessions = codeOf('main/machines/remote-sessions.ts');
  const at = sessions.indexOf('export async function remoteRename(');
  const body = sessions.slice(at, sessions.indexOf('\n}\n', at));

  it('reads no error\'s message anywhere in the rename', () => {
    expect(at).toBeGreaterThan(-1);
    expect(body).not.toContain('.message');
    expect(body).not.toMatch(/String\(err\)|JSON\.stringify\(err\)/);
  });

  it('logs gmuxErrorPayloadOf(err)?.code at both warnings, and unknown when there is none', () => {
    expect(body.split("gmuxErrorPayloadOf(err)?.code ?? 'unknown'")).toHaveLength(3);
    expect(body.split('machinesLog.warn(')).toHaveLength(3);
  });
});
