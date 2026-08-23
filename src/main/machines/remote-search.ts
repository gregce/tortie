/**
 * Every matching line in one folder on another machine (Phase 98).
 *
 * ## What it is for
 *
 * A project can be a folder on another machine, and until this phase the Search
 * view in that tab drew a sentence saying search does not reach over there. It
 * does now. A person presses the search chord, types, and reads the rows the
 * Search view has always drawn.
 *
 * ## The rule that decides the design
 *
 * THE SCAN HAPPENS WHERE THE FILES ARE. Research 57 section 2 measured the three
 * ways of answering this and refused two of them.
 *
 *  - Shipping a ripgrep in the bundle and sending it to the machine buys 0.15 s
 *    and costs a third write door, a transfer protocol, a binary per
 *    architecture, a sixth confirmed field every existing machine would have to
 *    agree to again, and a Tortie placed executable on somebody else's computer.
 *  - Copying the files here and searching them on this Mac costs 2.4 s over the
 *    link for 33 MB against 0.176 s of scanning in place, and it puts a person's
 *    source on a second computer.
 *
 * So one read script crosses, being `repo-search` from the frozen catalogue in
 * `./remote-scripts.ts`, and that machine's own `grep` reads its own disk.
 * Research 57 section 2.4 measured the same 14 matching lines out of that grep
 * and out of ripgrep on the same corpus.
 *
 * ## What it does not do
 *
 *  - IT DOES NOT STREAM. There is nothing to stream: the far side has finished
 *    scanning before the first byte comes back. One call, one answer.
 *  - IT CANNOT BE STOPPED ON THE MACHINE. Stop stops Tortie waiting. The far
 *    side finishes its scan and its output is thrown away.
 *  - IT WRITES NOTHING, on either computer.
 *  - NO TIMER CALLS IT. A search happens when a person types, and the renderer
 *    owns the debounce.
 *
 * ## Where the two searches differ, stated rather than left to be found
 *
 * A search here and a search on a machine are not the same search, and three of
 * the four caps are the only things that are identical.
 *
 *  - THE FILE SIZE CAP IS MISSING OVER THERE. The search on this Mac hands
 *    ripgrep `--max-filesize`, being `SEARCH_LIMITS.maxFilesizeBytes` at
 *    10,485,760 bytes, so a larger file is not read here. `repo-search` has no
 *    size test at all and reads it. The other three caps, being the match cap,
 *    the per file cap and the per line character cap, are the same numbers on
 *    both computers.
 *  - THE CHARACTER CAP MEANS SOMETHING SLIGHTLY DIFFERENT. `cut -c "1-$5"` on
 *    the far side counts the whole `path:line:text` line, so the path and the
 *    line number eat into the 2,000 characters and a deeper path leaves less
 *    text. `shapeLine` below applies the same number to the text alone.
 *    Measured on this Mac, a 5,006 character line in `p98-long.ts` arrived at
 *    1,986 characters, being 2,000 less the 14 characters of `p98-long.ts:1:`.
 *  - A PATH SHAPED `x:12:y.txt` PARSES AS THE PATH `x` AT LINE 12, because
 *    `grep -H -n` has no escape for a colon in a file name. See
 *    {@link parseGrepLine}.
 *
 * ## What has not been measured
 *
 * The far side was THIS MAC in every number above and in research 57 section 2,
 * over a loopback connection. Two things follow and neither is measured. A Linux
 * machine runs GNU `grep`, GNU `xargs` and GNU `find` rather than the BSD ones,
 * which is reasoned about from POSIX rather than timed. And no slow link has
 * been measured, so every second reported here is scan time with the connection
 * already open.
 *
 * ## It never throws for anything a machine said
 *
 * A folder that is not there, a pattern that machine's grep refused, a machine
 * that did not answer and a machine Tortie is not signed in to are four ordinary
 * states. Each comes back as a result carrying its own mode word, and the
 * renderer draws the sentence from `src/renderer/machines/presentation.ts`. No prose
 * crosses this boundary. The ONE thing that throws is an empty query, because
 * that is a caller error rather than a state of a machine.
 */

import {
  SEARCH_LIMITS,
  type MachineSearchInput,
  type MachineSearchMode,
  type MachineSearchResult,
  type SearchFileResult,
  type SearchMatch
} from '@shared/ipc';
import { gmuxError } from '../errors';
import { shapeLine } from '../search/parser';
import type { RemoteMachineContext } from './context';
import { machineIsConnected, runRemoteRead } from './remote-run';
import { readyRemoteContext } from './remote-sessions';
import { machineLabelOf, machineRow } from './store';

/**
 * How long one search gets on the machine. 30,000 ms.
 *
 * A DEADLINE AND NOT AN EXPECTATION. Research 57 section 2.4 measured a whole
 * 33,023,414 byte tracked corpus of 1,571 files scanned in 174 to 176 ms, and
 * grep crosses one second at about 200 MB of tracked text. The deadline is here
 * so a machine that went to sleep mid answer does not hold a call open forever.
 */
export const REMOTE_SEARCH_TIMEOUT_MS = 30_000;

/**
 * The most highlight spans one line carries. 100.
 *
 * A line matched a thousand times is still one row on screen, and the spans past
 * the hundredth are painted on characters nobody can see once the line is
 * windowed. It also bounds the loop below on a pattern that matches everywhere.
 */
const MAX_SPANS_PER_LINE = 100;

/** The far side prints one of these four words. `none` is an empty body. */
const MODE_WORDS: Readonly<Record<string, 'repo' | 'walk' | 'missing' | 'badPattern'>> =
  {
    repo: 'repo',
    walk: 'walk',
    missing: 'missing',
    // The script prints one lower case word per state, so the far side never
    // has to know how this end spells it.
    badpattern: 'badPattern'
  };

const BASE64_ONLY = /^[A-Za-z0-9+/=]*$/;

/**
 * The mode word, the cut answer and the decoded body, or null when nothing
 * parsed. PURE.
 *
 * The answer is `<word> <0 or 1> <base64 or none>`. The base64 word is checked
 * before it is decoded, for the reason `./remote-review.ts` states about its own
 * answers: `Buffer.from` DROPS a character it does not know and hands back
 * plausible nonsense, and a person reading search results cannot tell nonsense
 * from a file. The check is written here rather than imported, because
 * `decodeRemoteAnswer` decodes two encoded words and this answer's first word is
 * a plain status word.
 *
 * THE MIDDLE WORD IS THE FAR SIDE'S OWN ANSWER about the byte ceiling, and it is
 * why this function reads three words rather than two. The first draft of this
 * phase decided the same thing here, by asking whether the decoded body ended in
 * a newline. `head -c` cuts at a byte offset, so about one cut in every average
 * line length lands on a newline, and the panel would then have reported a
 * complete result set while the far side had thrown away everything past
 * 4,194,304 bytes. A word that is neither `0` nor `1` makes the whole answer
 * unreadable, which is the same treatment every other malformed field gets here.
 */
export function parseSearchAnswer(payload: string): {
  mode: 'repo' | 'walk' | 'missing' | 'badPattern';
  cut: boolean;
  body: string;
} | null {
  const words = payload.trim().split(/[ \t\n]+/);
  const first = words[0] ?? '';
  const mode = MODE_WORDS[first];
  if (mode === undefined) return null;
  const second = words[1] ?? '';
  if (second !== '0' && second !== '1') return null;
  const cut = second === '1';
  const third = words[2] ?? '';
  if (third.length === 0) return null;
  if (third === 'none') return { mode, cut, body: '' };
  if (!BASE64_ONLY.test(third)) return null;
  return { mode, cut, body: Buffer.from(third, 'base64').toString('utf8') };
}

/**
 * One `path:line:text` line into its three parts, or null. PURE.
 *
 * A PATH CAN HOLD A COLON, so the field cannot be taken at the first one. The
 * scan walks the colons from the left and takes the first one whose next field
 * is all digits and is itself followed by a colon. `./we:ird.txt:1:colon hit`
 * therefore parses as the path `we:ird.txt` at line 1, which was measured on
 * this Mac before this module was written.
 *
 * A LEADING `./` IS STRIPPED. The walk branch of the script prints it and the
 * repository branch does not, and `SearchFileResult.relPath` is documented as
 * carrying no leading `./` either way.
 *
 * WHAT IT STILL GETS WRONG, said rather than hidden. A path holding a colon
 * followed by digits followed by a colon, e.g. `x:12:y.txt`, parses as the path
 * `x` at line 12. Nothing separates that case from a real one in `grep -H -n`
 * output, because the format has no escape. A line that never parses at all is
 * dropped rather than guessed at, which is the rule `tree-list` already carries
 * for a file name holding a newline.
 */
export function parseGrepLine(
  line: string
): { relPath: string; line: number; text: string } | null {
  let at = line.indexOf(':');
  while (at > 0) {
    const next = line.indexOf(':', at + 1);
    if (next < 0) return null;
    const digits = line.slice(at + 1, next);
    if (digits.length > 0 && /^[0-9]+$/.test(digits)) {
      const raw = line.slice(0, at);
      const relPath = raw.startsWith('./') ? raw.slice(2) : raw;
      if (relPath.length === 0) return null;
      const number = Number(digits);
      if (!Number.isFinite(number) || number < 1) return null;
      return { relPath, line: number, text: line.slice(next + 1) };
    }
    at = next;
  }
  return null;
}

/** The pattern the person typed, as a JavaScript regular expression, or null. */
function highlighter(input: {
  query: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  matchWholeWord: boolean;
}): RegExp | null {
  const body = input.isRegex ? input.query : escapeLiteral(input.query);
  const source = input.matchWholeWord ? `\\b(?:${body})\\b` : body;
  try {
    return new RegExp(source, input.isCaseSensitive ? 'g' : 'gi');
  } catch {
    // The machine's grep accepted a pattern this engine will not read. The rows
    // are still real, and the fallback span below is what keeps them honest.
    return null;
  }
}

function escapeLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Where one pattern matches inside one line, as [start, end) offsets. PURE.
 *
 * A LINE WITH NO SPAN IS A ROW WITH NO HIGHLIGHT, which reads as a bug, so it
 * falls back to a one character span at offset 0. That is `buildMatch`'s own
 * rule for a line ripgrep reports with an empty submatch array, and it is the
 * honest answer when two engines disagree: the row is real because the machine
 * found it, and Tortie does not invent a highlight it cannot place.
 */
function spansIn(text: string, pattern: RegExp | null): [number, number][] {
  const spans: [number, number][] = [];
  if (pattern !== null) {
    pattern.lastIndex = 0;
    for (;;) {
      const hit = pattern.exec(text);
      if (hit === null) break;
      const start = hit.index;
      const end = start + hit[0].length;
      if (end > start) spans.push([start, end]);
      // A zero width match would leave lastIndex where it is and spin forever.
      pattern.lastIndex = end > start ? end : start + 1;
      if (spans.length >= MAX_SPANS_PER_LINE) break;
      if (pattern.lastIndex > text.length) break;
    }
  }
  if (spans.length > 0) return spans;
  return [[0, Math.min(1, text.trimEnd().length)]];
}

/**
 * Every decoded line into the rows the local search produces. PURE.
 *
 * Files come back in the order the machine printed them, which is git's own
 * index order for the repository branch and the walk's order otherwise. Each
 * file keeps at most `SEARCH_LIMITS.maxPerFile` matches and reports `clipped`
 * when it cut, and `matchCount` is what the machine really found rather than
 * what survived the cut.
 *
 * `shapeLine` is imported from `../search/parser` rather than copied. It strips
 * the indentation, windows a long line around the first span, and returns the
 * one `trimmed` number the editor navigates by. Reusing it is what keeps a row
 * from a machine and a row from this Mac the same row.
 *
 * `byteOffset` is 0 on every row. grep does not report one, and nothing in this
 * path reads it: replace preview is local only and this phase writes nothing.
 */
export function buildRemoteSearchFiles(
  lines: readonly string[],
  input: {
    query: string;
    isRegex: boolean;
    isCaseSensitive: boolean;
    matchWholeWord: boolean;
  },
  maxLineChars: number
): { files: SearchFileResult[]; totalMatches: number } {
  const pattern = highlighter(input);
  const byPath = new Map<string, SearchFileResult>();
  const order: string[] = [];
  let totalMatches = 0;
  for (const line of lines) {
    if (line.length === 0) continue;
    const parsed = parseGrepLine(line);
    if (parsed === null) continue;
    let file = byPath.get(parsed.relPath);
    if (file === undefined) {
      file = {
        relPath: parsed.relPath,
        matchCount: 0,
        matches: [],
        clipped: false
      };
      byPath.set(parsed.relPath, file);
      order.push(parsed.relPath);
    }
    file.matchCount += 1;
    totalMatches += 1;
    if (file.matches.length >= SEARCH_LIMITS.maxPerFile) {
      file.clipped = true;
      continue;
    }
    const shaped = shapeLine(parsed.text, spansIn(parsed.text, pattern), maxLineChars);
    const match: SearchMatch = {
      line: parsed.line,
      text: shaped.text,
      trimmed: shaped.trimmed,
      ranges: shaped.ranges,
      byteOffset: 0
    };
    if (shaped.truncated) match.truncated = true;
    file.matches.push(match);
  }
  return {
    files: order.map((path) => byPath.get(path)).filter(isFile),
    totalMatches
  };
}

function isFile(value: SearchFileResult | undefined): value is SearchFileResult {
  return value !== undefined;
}

/** The letters `$3` carries, in a fixed order so one search composes one word. */
export function searchFlagLetters(input: {
  isRegex: boolean;
  isCaseSensitive: boolean;
  matchWholeWord: boolean;
}): string {
  return (
    (input.isCaseSensitive ? '' : 'i') +
    (input.matchWholeWord ? 'w' : '') +
    (input.isRegex ? 'e' : '')
  );
}

/** The label this machine's row carries, or its id when there is no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/** Everything but the rows, for the four answers that carry none. */
function emptyResult(
  input: MachineSearchInput,
  mode: MachineSearchMode,
  elapsedMs: number
): MachineSearchResult {
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: input.cwd,
    mode,
    files: [],
    totalMatches: 0,
    totalFiles: 0,
    capped: false,
    truncated: false,
    elapsedMs
  };
}

/**
 * Ask one machine for every matching line in one folder.
 *
 * @returns a result carrying `repo` or `walk` and its rows, or one of the four
 *   refusals. It never throws for anything the machine said.
 * @throws GmuxError INVALID_INPUT for an empty query, which is a caller error
 *   rather than a state of a machine. Nothing is sent in that case.
 */
export async function searchOnMachine(
  input: MachineSearchInput
): Promise<MachineSearchResult> {
  if (typeof input.query !== 'string' || input.query.length === 0) {
    // The same sentence the search on this Mac uses, from src/main/search/ipc.ts.
    throw gmuxError(
      'INVALID_INPUT',
      'Type something to search for.',
      `machine ${input.machineId} was asked for an empty pattern, so nothing ` +
        `was sent to it`
    );
  }
  const started = Date.now();
  // A path that is not absolute names nothing on that machine. It is reported
  // rather than sent, because the far side's shell would resolve it against
  // whatever folder it started in.
  if (typeof input.cwd !== 'string' || !input.cwd.startsWith('/')) {
    return emptyResult(input, 'missing', Date.now() - started);
  }
  if (!machineIsConnected(input.machineId)) {
    return emptyResult(input, 'notConnected', Date.now() - started);
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(input.machineId);
  } catch {
    return emptyResult(input, 'notConnected', Date.now() - started);
  }
  const cap = Math.max(
    1,
    Math.min(
      Math.trunc(input.maxResults ?? SEARCH_LIMITS.maxResults),
      SEARCH_LIMITS.maxResults
    )
  );
  let answer: { mode: MachineSearchMode; cut: boolean; body: string } | null;
  try {
    const out = await runRemoteRead(
      ctx,
      'repo-search',
      [
        input.cwd,
        input.query,
        searchFlagLetters(input),
        // The cap PLUS ONE. A body with more lines than the cap is proof the cap
        // bit, so nothing has to walk the tree a second time to count.
        String(cap + 1),
        String(SEARCH_LIMITS.maxLineChars)
      ],
      { timeoutMs: REMOTE_SEARCH_TIMEOUT_MS }
    );
    answer = parseSearchAnswer(out.payload);
  } catch {
    return emptyResult(input, 'unreachable', Date.now() - started);
  }
  // A payload nothing could read is a machine that did not answer, rather than a
  // guess about a folder. The shape this expected is in `parseSearchAnswer`.
  if (answer === null) return emptyResult(input, 'unreachable', Date.now() - started);
  if (answer.mode === 'missing' || answer.mode === 'badPattern') {
    return emptyResult(input, answer.mode, Date.now() - started);
  }
  // THE FAR SIDE SAID WHETHER IT CUT, and this end does not guess. The middle
  // word of the answer is `1` when the byte ceiling bit. Asking whether the body
  // ends in a newline answers a different question, because `head -c` cuts at a
  // byte offset and can land on one.
  const truncated = answer.cut;
  // The text after the final newline. It is the empty string for a body that
  // ended cleanly, and a line cut in the middle otherwise. Either way it is
  // dropped, rather than shown as a line that ends nowhere.
  let lines = answer.body.split('\n');
  lines.pop();
  let capped = false;
  if (lines.length > cap) {
    lines = lines.slice(0, cap);
    capped = true;
  }
  const built = buildRemoteSearchFiles(lines, input, SEARCH_LIMITS.maxLineChars);
  return {
    machineId: input.machineId,
    machineLabel: labelOf(input.machineId),
    cwd: input.cwd,
    mode: answer.mode,
    files: built.files,
    totalMatches: built.totalMatches,
    totalFiles: built.files.length,
    capped,
    truncated,
    elapsedMs: Date.now() - started
  };
}
