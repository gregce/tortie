#!/usr/bin/env -S node --import tsx
/**
 * PHASE 253, THE RESEARCH STEP'S INSTRUMENT. WHAT VS CODE'S TERMINAL LINK
 * PARSER READS THAT TORTIE'S GRAMMAR REFUSES, COUNTED OVER THE OPERATOR'S OWN
 * PANES.
 *
 * Three measurements, all off ONE capture so they are about the same corpus:
 *
 *   A.  THE SUFFIX TABLE. VS Code parses dozens of `path:line:col` spellings —
 *       `(line,col)`, `[line, col]`, `"path", line N`, `on line N`, `#N` —
 *       where the shipping `stripDecoration` knows `:line[:col]` attached and
 *       nothing else. For every suffix VS Code's parser finds in a row, ask
 *       whether the shipping grammar yields the same path with the same line,
 *       the path without the line, or nothing at all, and whether the path
 *       names a real file at a door.
 *
 *   A2. THE SEGMENT GRAMMAR. VS Code's no-suffix path clause allows almost any
 *       character in a segment; the shipping SEGMENT is [A-Za-z0-9._@%+~$-].
 *       Count the spans their clause finds that ours refuses, by the refused
 *       character, and how many name a real file.
 *
 *   C.  THE BARE FILENAME. `README.md` with no slash is clickable in VS Code
 *       through the word detector's search opener. Count slashless file-shaped
 *       tokens, resolve each against the pane's own project file index
 *       (`git ls-files`, read only), and report exactly-one / several / none,
 *       plus the families that make a word-shaped token light up wrongly.
 *
 * The VS Code pieces are PORTED from microsoft/vscode at commit
 * 770a9bced0e6eff10342b2d95d7cfd98c33b85ed (read 2026-09-10, MIT), file
 * src/vs/workbench/contrib/terminalContrib/links/browser/terminalLinkParsing.ts,
 * and the self test proves the port on rows from that file's own test suite,
 * terminalLinkParsing.test.ts. Nothing from the clone is vendored into src/;
 * this is a measurement helper.
 *
 * SAFETY. It LISTS, SHOWS OPTIONS, LISTS PANES and CAPTURES on `-L gmux` and
 * does nothing else: never attaches, never sends a key, never kills. A session
 * with no `@gmux-agent` option is not ours and is skipped. The manifest is
 * read from a COPY handed in by name. The only filesystem calls on transcript
 * paths are `lstat`, `realpath` and `stat`, all inside the SHIPPING
 * `answerPathDoor`. The project file index is `git -C <root> ls-files`, read
 * only, and a root on the refusal list below is never indexed at all.
 * IT PRINTS COUNTS, RATES AND SHAPES AND NEVER A PATH OUT OF A PANE.
 *
 *   P253_MANIFEST=<a copy of manifest.db> \
 *     node_modules/.bin/tsx --tsconfig build/p250/tsconfig.json build/p253/vscode-catches.mts
 *   ...--self-test    prove the port and the graders; capture nothing
 */

import { execFileSync } from 'node:child_process';
import { basename, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  looksLikePath, stripDecoration, tokensInRow
} from '../../src/shared/path-spans.ts';
import { couldBeAbsolute } from '../../src/shared/path-doors.ts';
import type { PathDoorAnswer } from '../../src/shared/path-doors.ts';
import { answerPathDoor } from '../../src/main/fs/path-door.ts';

const TAG = '[p253]';
const say = (l: string): void => { console.log(`${TAG} ${l}`); };
const pct = (n: number, d: number): string => (d === 0 ? '0.0' : ((100 * n) / d).toFixed(1));

// ---------------------------------------------------------------------------
// Roots this measurement never reads a directory listing from, whatever the
// manifest says. The task's own refusal list, plus the home root itself.
// ---------------------------------------------------------------------------
const FORBIDDEN_ROOTS = new Set([
  '/Users/gdc',
  '/Users/gdc/herdr', '/Users/gdc/runstory', '/Users/gdc/rookery',
  '/Users/gdc/orca', '/Users/gdc/test-diff', '/Users/gdc/agent-browser',
  '/Users/gdc/specfactory', '/Users/gdc/claude-swap', '/Users/gdc/tortiedotsh'
]);

// ---------------------------------------------------------------------------
// PORTED: the suffix regex generator. microsoft/vscode 770a9bce,
// terminalLinkParsing.ts `generateLinkSuffixRegex`, unchanged but for TS
// strictness. The named groups row0..2/col0..2/rowEnd0..2/colEnd0..2 and the
// three clauses are the upstream table verbatim.
// ---------------------------------------------------------------------------
function generateLinkSuffixRegex(eolOnly: boolean): RegExp {
  let ri = 0; let ci = 0; let rei = 0; let cei = 0;
  const r = (): string => `(?<row${String(ri++)}>\\d+)`;
  const c = (): string => `(?<col${String(ci++)}>\\d+)`;
  const re = (): string => `(?<rowEnd${String(rei++)}>\\d+)`;
  const ce = (): string => `(?<colEnd${String(cei++)}>\\d+)`;
  const eolSuffix = eolOnly ? '$' : '';
  const lineAndColumnRegexClauses = [
    // foo:339 | foo:339:12 | foo:339:12-789 | foo:339:12-341.789 | foo:339.12
    // foo 339 | foo 339:12 | foo 339.12 | foo#339 | foo#339:12 | foo#339.12
    // foo, 339 | "foo",339 | "foo",339:12 | "foo",339.12[-789[-341.789]]
    `(?::|#| |['"],|, )${r()}([:.]${c()}(?:-(?:${re()}\\.)?${ce()})?)?` + eolSuffix,
    // "foo", line 339[, col[umn] 12] | "foo":line 339 | "foo" on line 339
    // "foo", line 339, character[s] 12[-789] | "foo", lines 339-341
    `['"]?(?:,? |: ?| on )lines? ${r()}(?:-${re()})?(?:,? (?:col(?:umn)?|characters?) ${c()}(?:-${ce()})?)?` + eolSuffix,
    // foo(339) | foo(339,12) | foo (339, 12) | foo: (339) | foo(339:12)
    // and [] in place of ()
    `:? ?[\\[\\(]${r()}(?:(?:, ?|:)${c()})?[\\]\\)]` + eolSuffix
  ];
  const suffixClause = lineAndColumnRegexClauses.join('|').replace(/ /g, `[${' '} ]`);
  return new RegExp(`(${suffixClause})`, eolOnly ? undefined : 'g');
}
const linkSuffixRegex = generateLinkSuffixRegex(false);

interface VsSuffix {
  row: number | undefined;
  col: number | undefined;
  index: number;
  text: string;
}

/** PORTED: `toLinkSuffix` + `detectLinkSuffixes`, same commit. */
function detectLinkSuffixes(line: string): VsSuffix[] {
  let match: RegExpExecArray | null;
  const results: VsSuffix[] = [];
  linkSuffixRegex.lastIndex = 0;
  while ((match = linkSuffixRegex.exec(line)) !== null) {
    const g = match.groups;
    if (g === undefined) break;
    const num = (v: string | undefined): number | undefined =>
      (v === undefined ? undefined : Number.parseInt(v, 10));
    results.push({
      row: num(g['row0'] ?? g['row1'] ?? g['row2']),
      col: num(g['col0'] ?? g['col1'] ?? g['col2']),
      index: match.index,
      text: match[0] ?? ''
    });
  }
  return results;
}

/** PORTED: the path-before-a-suffix clause, same commit. */
const linkWithSuffixPathCharacters = /(?<path>(?:file:\/\/\/)?[^\s|<>[({][^\s|<>]*)$/;

interface VsParsedLink { path: string; index: number; row: number | undefined; suffixText: string }

/** PORTED: the heart of `detectLinksViaSuffix`, same commit — quote-prefix trim included, bracket re-scan left out (counted as a stated limit). */
function detectLinksViaSuffix(line: string): VsParsedLink[] {
  const results: VsParsedLink[] = [];
  for (const suffix of detectLinkSuffixes(line)) {
    const suffixEndIndex = suffix.index + suffix.text.length;
    if (line[suffixEndIndex] === '/') continue; // git's numeric 1/ 2/ prefixes
    const beforeSuffix = line.substring(0, suffix.index);
    const m = beforeSuffix.match(linkWithSuffixPathCharacters);
    if (m === null || m.index === undefined || m.groups?.['path'] === undefined) continue;
    let path = m.groups['path'];
    let at = m.index;
    const prefixMatch = /^(?<prefix>['"]+)/.exec(path);
    const prefix = prefixMatch?.groups?.['prefix'];
    if (prefix !== undefined) {
      path = path.substring(prefix.length);
      at += prefix.length;
      if (path.trim().length === 0) continue;
    }
    results.push({ path, index: at, row: suffix.row, suffixText: suffix.text });
  }
  return results;
}

// ---------------------------------------------------------------------------
// PORTED: the no-suffix unix path clause, same commit (`unixLocalLinkClause`).
// ---------------------------------------------------------------------------
const PathPrefix = '(?:\\.\\.?|\\~|file:\\/\\/)';
const PathSeparatorClause = '\\/';
const ExcludedPathCharactersClause = '[^\\0<>\\?\\s!`&*()\'":;\\\\]';
const ExcludedStartPathCharactersClause = '[^\\0<>\\?\\s!`&*()\\[\\]\'":;\\\\]';
const unixLocalLinkClause =
  '(?:(?:' + PathPrefix + '|(?:' + ExcludedStartPathCharactersClause + ExcludedPathCharactersClause +
  '*))?(?:' + PathSeparatorClause + '(?:' + ExcludedPathCharactersClause + ')+)+)';

/** The digit-collapsed shape of a suffix, so families can be counted without quoting content. */
export function suffixFamily(suffixText: string): string {
  return suffixText.replace(/ /g, ' ').replace(/\d+/g, 'N');
}

// ---------------------------------------------------------------------------
// The bare-filename grammar for measurement C.
// ---------------------------------------------------------------------------
const BARE_SPECIALS = new Set(['Makefile', 'Dockerfile', 'LICENSE', 'NOTICE', 'README', 'CHANGELOG']);
const DOMAIN_TLDS = new Set(['com', 'net', 'org', 'io', 'ai', 'dev', 'co', 'tv', 'gg', 'fm']);

export function bareFileShaped(token: string): boolean {
  if (token.includes('/')) return false;
  if (BARE_SPECIALS.has(token)) return true;
  if (!/^[A-Za-z0-9._@+-]{3,64}$/.test(token)) return false;
  if (/^[\d.,_-]+$/.test(token)) return false; // a version, a number
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return false;
  const ext = token.slice(dot + 1);
  if (!/^[A-Za-z][A-Za-z0-9]{0,7}$/.test(ext)) return false;
  const stem = token.slice(0, dot);
  if (!/[A-Za-z]/.test(stem)) return false; // 1.2.x, 0.102.0-beta
  return true;
}

export function domainShaped(token: string): boolean {
  const ext = token.slice(token.lastIndexOf('.') + 1).toLowerCase();
  return DOMAIN_TLDS.has(ext);
}

/** Names this script chose itself, so counting them quotes nothing out of a pane. */
const UNIVERSAL_NAMES = [
  'README.md', 'package.json', 'package-lock.json', 'CHANGELOG.md', 'Makefile',
  'tsconfig.json', 'LICENSE', 'CLAUDE.md', 'AGENTS.md', 'BACKLOG.md', '.gitignore'
];

// ---------------------------------------------------------------------------
// The corpus. LIST, SHOW OPTIONS, LIST PANES and CAPTURE. Nothing else.
// ---------------------------------------------------------------------------
interface Pane {
  sid: string; agent: string; gmuxId: string; width: number; paneCwd: string;
  rows: string[];
}

function tmux(...a: string[]): string {
  return execFileSync('tmux', ['-L', 'gmux', ...a], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
}

export function liveSessionCount(): number {
  try {
    return tmux('list-sessions', '-F', '#{session_id}').trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}

function capture(): Pane[] {
  let sessions: string[];
  try {
    sessions = tmux('list-sessions', '-F', '#{session_id}').trim().split('\n').filter(Boolean);
  } catch {
    console.error(`${TAG} no sessions on -L gmux. Nothing to measure.`);
    process.exit(2);
  }
  const panes: Pane[] = [];
  for (const sid of sessions) {
    let agent = ''; let gmuxId = '';
    try {
      const opts = tmux('show-options', '-t', sid).split('\n');
      agent = opts.find((l) => l.startsWith('@gmux-agent '))?.slice(12).trim() ?? '';
      gmuxId = opts.find((l) => l.startsWith('@gmux-id '))?.slice(9).trim() ?? '';
    } catch { continue; }
    if (agent === '') continue; // not ours: never adopt it
    let width = 80; let paneCwd = '';
    try {
      const first = tmux('list-panes', '-t', sid, '-F', '#{pane_width}\t#{pane_current_path}').trim().split('\n')[0] ?? '';
      const [w, p] = first.split('\t');
      width = Number(w) || 80;
      paneCwd = p ?? '';
    } catch { /* keep the defaults */ }
    let plain = '';
    try { plain = tmux('capture-pane', '-p', '-N', '-S', '-', '-t', sid); } catch { continue; }
    panes.push({ sid, agent, gmuxId, width, paneCwd, rows: plain.split('\n').map((r) => r.replace(/\s+$/, '')) });
  }
  return panes;
}

function manifestBases(dbCopy: string): Map<string, string> {
  const out = new Map<string, string>();
  if (dbCopy === '') return out;
  let text = '';
  try {
    text = execFileSync('sqlite3', [dbCopy, '-separator', '\t', 'select id, project_path from sessions;'],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch { return out; }
  for (const line of text.split('\n')) {
    const [id, project] = line.split('\t');
    if (id === undefined || project === undefined || id.length === 0) continue;
    out.set(id, project);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The door, memoised by spelling — every answer is the SHIPPING sequence.
// ---------------------------------------------------------------------------
const doorMemo = new Map<string, PathDoorAnswer>();
let doorCalls = 0;
async function doorFor(spelling: string, base?: string): Promise<PathDoorAnswer> {
  const key = base === undefined ? spelling : `${base} ${spelling}`;
  const held = doorMemo.get(key);
  if (held !== undefined) return held;
  doorCalls += 1;
  const answer = await answerPathDoor(spelling, base);
  doorMemo.set(key, answer);
  return answer;
}

const bump = <K>(m: Map<K, number>, k: K, by = 1): void => { m.set(k, (m.get(k) ?? 0) + by); };
const top = <K>(m: Map<K, number>, n: number): [K, number][] =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

/** What the shipping grammar yields for one row, refusal 8 aside. */
function shippingSpans(row: string): { target: string; line?: number }[] {
  const out: { target: string; line?: number }[] = [];
  for (const span of tokensInRow(row)) {
    if (!looksLikePath(span.text)) continue;
    const { target, line } = stripDecoration(span.text);
    if (target.length === 0) continue;
    out.push(line !== undefined ? { target, line } : { target });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
async function run(dbCopy: string): Promise<number> {
  const before = liveSessionCount();
  const panes = capture();
  const bases = manifestBases(dbCopy);

  let rows = 0;
  const agents = new Map<string, number>();

  // ---- A. the suffix table ----------------------------------------------
  // per family: [occurrences, ours reads path+line, ours reads path only,
  //              ours yields nothing, reaches a door when resolved]
  interface FamRow { n: number; withLine: number; pathOnly: number; invisible: number; door: number; distinct: Set<string> }
  const fam = new Map<string, FamRow>();
  const invisibleDoorShape = new Map<string, number>();
  const aDoorPaths = new Set<string>();
  const a2DoorPaths = new Set<string>();
  /** every realpath a SHIPPING grammar span reaches, refusal 8 IGNORED, so the
   *  set is GENEROUS and the new-file count below is conservative. */
  const reachableToday = new Set<string>();
  let rangeSuffixSpans = 0; let rangeSuffixDoor = 0;
  let vsSuffixSpans = 0; let vsSlashless = 0; let vsSlashlessDoor = 0;
  const famFor = (k: string): FamRow => {
    let f = fam.get(k);
    if (f === undefined) { f = { n: 0, withLine: 0, pathOnly: 0, invisible: 0, door: 0, distinct: new Set() }; fam.set(k, f); }
    return f;
  };

  // ---- A2. the segment grammar gap ---------------------------------------
  const noSuffixRe = new RegExp(unixLocalLinkClause, 'g');
  let clauseMatches = 0; let clauseCovered = 0; let clauseRefused = 0; let clauseDoor = 0;
  const refusedChar = new Map<string, number>();
  const refusedCharDoor = new Map<string, number>();
  const clauseDoorDistinct = new Set<string>();
  const SEGMENT_OK = /^[A-Za-z0-9._@%+~$-]$/;

  // ---- C. the bare filename ----------------------------------------------
  let bareOccur = 0;
  const bareDistinct = new Map<string, number>(); // token -> occurrences
  const bareByPane: { token: string; pane: number }[] = [];
  const paneBase: string[] = [];
  const paneSlashBasenames: Set<string>[] = [];
  let panesIndexed = 0; let panesSkippedForbidden = 0; let panesSkippedNoGit = 0;

  for (const [pi, pane] of panes.entries()) {
    bump(agents, pane.agent);
    const base = bases.get(pane.gmuxId) ?? pane.paneCwd;
    paneBase.push(base);
    paneSlashBasenames.push(new Set());
    for (const row of pane.rows) {
      rows += 1;
      const ships = shippingSpans(row);
      for (const s of ships) {
        if (s.target.includes('/')) (paneSlashBasenames[pi] as Set<string>).add(basename(s.target));
        const isAbs = couldBeAbsolute(s.target);
        const a = await doorFor(s.target, isAbs ? undefined : (base === '' ? undefined : base));
        if (a.door !== null) reachableToday.add((a as { path: string }).path);
      }

      // A: every suffix-carrying link VS Code's parser reads out of this row
      for (const link of detectLinksViaSuffix(row)) {
        if (link.row === undefined) continue; // a bare "(N)" with no row is not a line suffix
        const family = suffixFamily(link.suffixText);
        const hasSlash = link.path.includes('/');
        if (!hasSlash) {
          vsSlashless += 1;
          if (bareFileShaped(link.path)) {
            const a = await doorFor(link.path, base === '' ? undefined : base);
            if (a.door !== null) vsSlashlessDoor += 1;
          }
          continue;
        }
        vsSuffixSpans += 1;
        const f = famFor(family);
        f.n += 1;
        f.distinct.add(link.path);
        const withLine = ships.some((s) => s.target === link.path && s.line === link.row);
        const pathOnly = !withLine && ships.some((s) => s.target === link.path);
        if (withLine) { f.withLine += 1; continue; }
        if (pathOnly) f.pathOnly += 1; else f.invisible += 1;
        const isAbs = couldBeAbsolute(link.path);
        const a = await doorFor(link.path, isAbs ? undefined : (base === '' ? undefined : base));
        if (a.door !== null) {
          f.door += 1;
          aDoorPaths.add((a as { path: string }).path);
          if (!pathOnly) {
            // THE SHAPE of an invisible-but-resolving span, never its content:
            // the family, the path's extension, whether the path alone passes
            // the shipping grammar, and the characters of the containing
            // TOKEN that the shipping SEGMENT refuses.
            const tok = tokensInRow(row).find((t) => t.start <= link.index && link.index < t.end)?.text ?? '';
            const badChars = [...new Set([...tok].filter((ch) => ch !== '/' && ch !== '~' && !/^[A-Za-z0-9._@%+~$-]$/.test(ch)))].join('');
            bump(invisibleDoorShape, `${family} ext=${extname(link.path).toLowerCase() || '(none)'} grammarReadsPathAlone=${String(looksLikePath(link.path))} refusedChars=${JSON.stringify(badChars)}`);
          }
        }
      }

      // A2: the no-suffix clause, minus what the shipping grammar already has
      noSuffixRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      const shipTargets = new Set(ships.map((s) => s.target));
      while ((m = noSuffixRe.exec(row)) !== null) {
        const text = m[0];
        if (text.length < 3) continue;
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) continue; // a URL: WebLinksAddon owns it
        if (/^\d+\/\d+$/.test(text)) continue;               // a fraction
        clauseMatches += 1;
        // is the whole match, or its stripped shape, already a shipping span?
        const { target } = stripDecoration(text.replace(/[)\],.;:'"!?]+$/, ''));
        if (shipTargets.has(target) || shipTargets.has(text)) { clauseCovered += 1; continue; }
        clauseRefused += 1;
        // which characters the shipping SEGMENT refuses
        const bad = new Set<string>();
        for (const ch of target) {
          if (ch === '/' || ch === '~') continue;
          if (!SEGMENT_OK.test(ch)) bad.add(ch);
        }
        for (const ch of bad) bump(refusedChar, ch);
        const isAbs = couldBeAbsolute(target);
        const a = await doorFor(target, isAbs ? undefined : (base === '' ? undefined : base));
        if (a.door !== null) {
          clauseDoor += 1;
          clauseDoorDistinct.add((a as { path: string }).path);
          a2DoorPaths.add((a as { path: string }).path);
          for (const ch of bad) bump(refusedCharDoor, ch);
          if (bad.size === 0) bump(refusedCharDoor, '(none: token boundary or decoration)');
        }
      }

      // the :N-M range family, a one-line stripDecoration widening candidate
      for (const t of tokensInRow(row)) {
        const rm = /^(.*\/[^\s:]*):(\d+)[-\u2013]\d+$/.exec(t.text.replace(/[)\],.;:'"!?]+$/, ''));
        if (rm === null) continue;
        const head = rm[1] ?? '';
        if (!looksLikePath(head)) continue;
        rangeSuffixSpans += 1;
        const isAbs = couldBeAbsolute(head);
        const a = await doorFor(head, isAbs ? undefined : (base === '' ? undefined : base));
        if (a.door !== null) rangeSuffixDoor += 1;
      }

      // C: slashless file-shaped tokens
      for (const t of tokensInRow(row)) {
        if (t.text.includes('/')) continue;
        // strip a :line suffix a bare name can carry (README.md:12)
        const lc = /^(.*?):(\d+)(?::\d+)?$/.exec(t.text);
        const word = lc !== null ? (lc[1] ?? '') : t.text;
        if (!bareFileShaped(word)) continue;
        bareOccur += 1;
        bump(bareDistinct, word);
        bareByPane.push({ token: word, pane: pi });
      }
    }
  }

  // ---- C resolution against each pane's project file index ---------------
  const indexByRoot = new Map<string, Map<string, number> | null>();
  const indexFor = (root: string): Map<string, number> | null => {
    if (root === '' || !root.startsWith('/')) return null;
    const held = indexByRoot.get(root);
    if (held !== undefined) return held;
    if (FORBIDDEN_ROOTS.has(root)) { indexByRoot.set(root, null); return null; }
    let files: string[];
    try {
      files = execFileSync('git', ['-C', root, 'ls-files', '-z'],
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean);
    } catch { indexByRoot.set(root, null); return null; }
    const names = new Map<string, number>();
    for (const f of files) bump(names, basename(f));
    indexByRoot.set(root, names);
    return names;
  };

  let occExactlyOne = 0; let occSeveral = 0; let occNone = 0; let occNoIndex = 0;
  let occJoinOpens = 0; let occJoinAndUniqueAgree = 0; let occJoinOpensUniqueDiffers = 0;
  const joinDistinct = new Set<string>();
  let occOracleConfirmed = 0; let occOracleOne = 0;
  const distinctOutcome = new Map<string, 'one' | 'several' | 'none' | 'mixed'>();
  const oneExt = new Map<string, number>();
  let domainOccur = 0; let domainMatchesFile = 0;
  const universalOccur = new Map<string, number>();
  const seenRootFailures = new Set<string>();
  for (const { token, pane } of bareByPane) {
    const root = paneBase[pane] ?? '';
    const idx = indexFor(root);
    if (UNIVERSAL_NAMES.includes(token)) bump(universalOccur, token);
    if (domainShaped(token)) domainOccur += 1;
    if (idx === null) {
      occNoIndex += 1;
      if (root !== '' && !seenRootFailures.has(root)) {
        seenRootFailures.add(root);
        if (FORBIDDEN_ROOTS.has(root)) panesSkippedForbidden += 1; else panesSkippedNoGit += 1;
      }
      continue;
    }
    if (!seenRootFailures.has(root)) { seenRootFailures.add(root); panesIndexed += 1; }
    const hits = idx.get(token) ?? 0;
    // THE CHEAP DESIGN: the token joined to the pane's base through the
    // SHIPPING sequence, exactly as lift two joins a relative path — no index,
    // no new question, only the grammar widened to admit the token.
    const joined = root === '' ? null : await doorFor(token, root);
    if (joined !== null && joined.door !== null) {
      occJoinOpens += 1;
      joinDistinct.add((joined as { path: string }).path);
      if (hits === 1) occJoinAndUniqueAgree += 1; else if (hits !== 1) occJoinOpensUniqueDiffers += 1;
    }
    const confirmed = (paneSlashBasenames[pane] as Set<string>).has(token);
    if (confirmed) occOracleConfirmed += 1;
    const cls = hits === 1 ? 'one' : hits > 1 ? 'several' : 'none';
    if (cls === 'one') {
      occExactlyOne += 1;
      bump(oneExt, extname(token).toLowerCase() || '(none)');
      if (confirmed) occOracleOne += 1;
      if (domainShaped(token)) domainMatchesFile += 1;
    } else if (cls === 'several') occSeveral += 1;
    else occNone += 1;
    const prev = distinctOutcome.get(token);
    if (prev === undefined) distinctOutcome.set(token, cls);
    else if (prev !== cls) distinctOutcome.set(token, 'mixed');
  }

  // ---- print --------------------------------------------------------------
  console.log('');
  say(`corpus: ${String(panes.length)} of ${String(before)} live sessions are ours, ${String(rows)} physical rows`);
  say(`sessions on -L gmux before ${String(before)}, after ${String(liveSessionCount())}`);
  say(`per agent: ${[...agents.entries()].sort().map(([k, v]) => `${k} ${String(v)}`).join(', ')}`);

  console.log('');
  say('A. THE SUFFIX TABLE — suffix-carrying links VS Code\'s parser reads, against the shipping grammar');
  say(`  slash-bearing suffix links VS Code reads: ${String(vsSuffixSpans)}`);
  const tot = { withLine: 0, pathOnly: 0, invisible: 0, door: 0 };
  for (const f of fam.values()) { tot.withLine += f.withLine; tot.pathOnly += f.pathOnly; tot.invisible += f.invisible; tot.door += f.door; }
  say(`  ...ours reads path AND line already: ${String(tot.withLine)} (${pct(tot.withLine, vsSuffixSpans)}%)`);
  say(`  ...ours reads the path, loses the line: ${String(tot.pathOnly)} (${pct(tot.pathOnly, vsSuffixSpans)}%)`);
  say(`  ...ours yields NOTHING for the path: ${String(tot.invisible)} (${pct(tot.invisible, vsSuffixSpans)}%)`);
  say(`  ...of the refused/lossy ones, resolve to a real file at a door: ${String(tot.door)}`);
  say('  per suffix family (digit-collapsed): n / +line / path-only / invisible / reach-a-door / distinct paths');
  for (const [k, f] of [...fam.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 24)) {
    say(`    ${JSON.stringify(k).padEnd(28)} ${String(f.n).padStart(5)} ${String(f.withLine).padStart(5)} ${String(f.pathOnly).padStart(5)} ${String(f.invisible).padStart(5)} ${String(f.door).padStart(5)}   ${String(f.distinct.size).padStart(4)}`);
  }
  say('  the SHAPES of the invisible-but-resolving spans (family, ext, whether the path alone passes the grammar, refused token characters):');
  for (const [k, v] of top(invisibleDoorShape, 16)) say(`    x${String(v).padStart(4)}  ${k}`);
  say(`  slashless suffix links (feed measurement C): ${String(vsSlashless)}, of which file-shaped AND resolving at a door against the pane's base: ${String(vsSlashlessDoor)}`);

  console.log('');
  say('A2. THE SEGMENT GRAMMAR — VS Code\'s no-suffix clause against the shipping looksLikePath');
  say(`  clause matches (slash-bearing, URL and fraction excluded): ${String(clauseMatches)}`);
  say(`  ...the shipping grammar already yields: ${String(clauseCovered)} (${pct(clauseCovered, clauseMatches)}%)`);
  say(`  ...the shipping grammar refuses: ${String(clauseRefused)}`);
  say(`  ...of the refused, resolve to a real file at a door: ${String(clauseDoor)} over ${String(clauseDoorDistinct.size)} distinct files`);
  say(`  the characters that refused them: ${top(refusedChar, 16).map(([k, v]) => `${JSON.stringify(k)} ${String(v)}`).join(', ') || 'none'}`);
  say(`  ...on the DOOR-REACHING refused spans: ${top(refusedCharDoor, 16).map(([k, v]) => `${JSON.stringify(k)} ${String(v)}`).join(', ') || 'none'}`);
  const union = new Set([...aDoorPaths, ...a2DoorPaths]);
  const overlap = [...aDoorPaths].filter((x) => a2DoorPaths.has(x)).length;
  say(`  DISTINCT FILES the two measurements would newly reach: A ${String(aDoorPaths.size)}, A2 ${String(a2DoorPaths.size)}, overlap ${String(overlap)}, UNION ${String(union.size)}`);
  const trulyNew = [...union].filter((x) => !reachableToday.has(x)).length;
  say(`  ...of that union, files NO shipping span anywhere in the corpus reaches (refusal 8 ignored, so this is a floor): ${String(trulyNew)}; the shipping grammar's own reachable file set is ${String(reachableToday.size)}`);
  say(`  the :N-M RANGE suffix alone (a one-line stripDecoration widening): ${String(rangeSuffixSpans)} spans, of which reach a door ${String(rangeSuffixDoor)}`);

  console.log('');
  say('C. THE BARE FILENAME — slashless file-shaped tokens against each pane\'s project file index');
  say(`  occurrences: ${String(bareOccur)} over ${String(bareDistinct.size)} distinct tokens`);
  say(`  distinct roots indexed ${String(panesIndexed)}; roots on the refusal list ${String(panesSkippedForbidden)}; roots with no git answer ${String(panesSkippedNoGit)}`);
  say(`  occurrences with no index available: ${String(occNoIndex)}`);
  const denom = occExactlyOne + occSeveral + occNone;
  say(`  of the ${String(denom)} resolvable occurrences:`);
  say(`    EXACTLY ONE project file matches:  ${String(occExactlyOne).padStart(6)} (${pct(occExactlyOne, denom)}%)`);
  say(`    SEVERAL match:                     ${String(occSeveral).padStart(6)} (${pct(occSeveral, denom)}%)`);
  say(`    NONE match:                        ${String(occNone).padStart(6)} (${pct(occNone, denom)}%)`);
  const dOne = [...distinctOutcome.values()].filter((v) => v === 'one').length;
  const dSev = [...distinctOutcome.values()].filter((v) => v === 'several').length;
  const dNone = [...distinctOutcome.values()].filter((v) => v === 'none').length;
  const dMixed = [...distinctOutcome.values()].filter((v) => v === 'mixed').length;
  say(`  distinct tokens: one ${String(dOne)}, several ${String(dSev)}, none ${String(dNone)}, mixed across panes ${String(dMixed)}`);
  say(`  the ORACLE (the same pane also prints the name behind a slash): confirmed occurrences ${String(occOracleConfirmed)}, of which exactly-one ${String(occOracleOne)}`);
  say(`  extensions of the exactly-one matches: ${top(oneExt, 12).map(([k, v]) => `${k} ${String(v)}`).join(', ') || 'none'}`);
  say(`  domain-shaped tokens (a .com/.io/.ai/... tail): ${String(domainOccur)} occurrences, of which matching exactly one project file: ${String(domainMatchesFile)}`);
  say(`  THE CHEAP DESIGN — the bare token joined to the pane's base through the SHIPPING sequence (grammar widening alone):`);
  say(`    occurrences whose join reaches a door: ${String(occJoinOpens)} over ${String(joinDistinct.size)} distinct files (of these, the index also says exactly-one: ${String(occJoinAndUniqueAgree)}; index says several-or-none: ${String(occJoinOpensUniqueDiffers)})`);
  say(`  universal names this script chose itself, drawn per occurrence: ${UNIVERSAL_NAMES.map((n) => `${n} ${String(universalOccur.get(n) ?? 0)}`).join(', ')}`);
  say(`  door calls made in total: ${String(doorCalls)}`);
  return 0;
}

// ---------------------------------------------------------------------------
// The self test. Rows from VS Code's own terminalLinkParsing.test.ts prove the
// port; fixtures of this file's own prove the graders. Captures nothing.
// ---------------------------------------------------------------------------
function selfTest(): number {
  let bad = 0;
  const check = (ok: boolean, why: string): void => {
    if (!ok) bad += 1;
    console.log(`${TAG} ${ok ? 'OK  ' : 'FAIL'} ${why}`);
  };
  // upstream test rows: link -> expected suffix text and row
  const upstream: [string, string, number][] = [
    ['foo:339', ':339', 339],
    ['foo:339:12', ':339:12', 339],
    ['foo:339.12', ':339.12', 339],
    ['foo#339', '#339', 339],
    ['foo 339', ' 339', 339],
    ['foo 339:12', ' 339:12', 339],
    ['foo, 339', ', 339', 339],
    ['"foo",339', '",339', 339],
    ['"foo", line 339', '", line 339', 339],
    ['"foo", line 339, col 12', '", line 339, col 12', 339],
    ['"foo", line 339, column 12', '", line 339, column 12', 339],
    ['"foo":line 339', '":line 339', 339],
    ['"foo" on line 339', '" on line 339', 339],
    ['foo on line 339, col 12', ' on line 339, col 12', 339],
    ['foo(339)', '(339)', 339],
    ['foo(339,12)', '(339,12)', 339],
    ['foo (339, 12)', ' (339, 12)', 339],
    ['foo: (339)', ': (339)', 339],
    ['foo(339:12)', '(339:12)', 339],
    ['foo[339]', '[339]', 339],
    ['foo[339, 12]', '[339, 12]', 339],
    ['foo: [339]', ': [339]', 339],
    ['"foo", lines 339-341', '", lines 339-341', 339],
    ['"foo", line 339, characters 12-789', '", line 339, characters 12-789', 339]
  ];
  for (const [link, wantSuffix, wantRow] of upstream) {
    const got = detectLinkSuffixes(link);
    const last = got[got.length - 1];
    check(last !== undefined && last.text === wantSuffix && last.row === wantRow,
      `upstream row ${JSON.stringify(link)} -> suffix ${JSON.stringify(last?.text)} row ${String(last?.row)}`);
  }
  // the path extraction, quotes trimmed as upstream does
  const p1 = detectLinksViaSuffix('at "src/a b/foo.ts", line 339, col 12 something');
  check(p1.length === 1 && p1[0]?.path === 'b/foo.ts' && p1[0]?.row === 339,
    `a quoted path with a SPACE extracts as ${JSON.stringify(p1[0]?.path)} — upstream's own path clause reads back only to whitespace, so the space cuts it; only the fallbackMatchers (whole-line shapes) recover spaced paths, and this port carries that limit deliberately`);
  const p2 = detectLinksViaSuffix('at src/foo.ts(339,12) done');
  check(p2.length === 1 && p2[0]?.path === 'src/foo.ts' && p2[0]?.row === 339, 'paren suffix extracts path and row');
  const p3 = detectLinksViaSuffix('--- 1/foo');
  check(p3.length === 0, 'a numeric git-diff prefix 1/ is not read as a suffix (upstream rule)');
  // the shipping grammar's own answers, so the outcome classes are proved
  const ships = (row: string): { target: string; line?: number }[] => shippingSpans(row);
  const s1 = ships('see src/foo.ts:339 now');
  check(s1.some((s) => s.target === 'src/foo.ts' && s.line === 339), 'ours reads :line attached (withLine class)');
  const s2 = ships('see src/foo.ts 339 now');
  check(s2.some((s) => s.target === 'src/foo.ts' && s.line === undefined), 'ours reads the path and loses a space-separated line (pathOnly class)');
  // PHASE 253 adopted the tsc clause, so the paren suffix reads path AND line
  // now; at the parent grammar (279e86b9) this row was the invisible class,
  // which is what measurement A counted.
  const s3 = ships('see src/foo.ts(339,12) now');
  check(s3.some((s) => s.target === 'src/foo.ts' && s.line === 339), 'ours reads the tsc paren suffix since Phase 253 (it was the invisible class at the parent)');
  const s4 = ships('at "src/foo.ts", line 339 now');
  check(s4.some((s) => s.target === 'src/foo.ts'), 'ours strips quotes and trailing comma so the quoted family is pathOnly, not invisible');
  check(suffixFamily('(339, 12)') === '(N, N)' && suffixFamily(':339:12') === ':N:N', 'families collapse digits');
  // bare filename grammar
  check(bareFileShaped('README.md') && bareFileShaped('funnel.mts') && bareFileShaped('Makefile'), 'bare names are file-shaped');
  check(!bareFileShaped('1.2.3') && !bareFileShaped('v0.102.0') === false || !bareFileShaped('1.2.3'), 'a version number is not');
  check(!bareFileShaped('v0.102.0'), 'a v-version is not file-shaped (stem has a letter but ext is digits)');
  check(bareFileShaped('github.com') && domainShaped('github.com'), 'a domain is file-shaped AND flagged domain-shaped');
  check(!bareFileShaped('foo'), 'a plain word is not');
  // the no-suffix clause against the shipping segment grammar
  const m = new RegExp(unixLocalLinkClause).exec('read /foo/[bar].baz now');
  check(m !== null && m[0] === '/foo/[bar].baz', 'the ported clause reads a bracketed segment');
  // PHASE 253 adopted `[` `]` into SEGMENT, so the A2 gap this row measured
  // is closed; at the parent grammar (279e86b9) this read false.
  check(looksLikePath('/foo/[bar].baz'), '...which the shipping SEGMENT admits since Phase 253 (the A2 gap, closed)');
  console.log(`${TAG} ${bad === 0 ? 'every fixture behaved' : `${String(bad)} fixtures did not`}`);
  return bad === 0 ? 0 : 1;
}

const DIRECT = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (DIRECT) {
  if (process.argv.includes('--self-test')) process.exit(selfTest());
  else process.exit(await run(process.env['P253_MANIFEST'] ?? ''));
}
