/**
 * graders.mjs. probe:p368's graders, PURE (Phase 368, build/p368/SPEC.md §8).
 *
 * ## Why it is a module of its own
 *
 * The probe drives two builds and produces readings; deciding what those
 * readings mean is a separate question, and it has to be one a verifier can
 * prove can say NO. So every grader here is a plain function of two readings,
 * the parent's and HEAD's, that starts nothing, reads no file and asks no
 * clock, and `selfTest` grades recorded readings under
 * build/p368/fixtures/graders/ twice: whole, where every graded clause must
 * read true, and once per named break, where exactly the broken clause must
 * turn red and every other clause must stay as it was.
 *
 * ## The expected values are derived here, not read from the code under test
 *
 * - D14, the address a click opens, is implemented below from the spec's own
 *   words as the fix round settled them (`linkExpected`): the words' address
 *   W when today's web-links reading finds one on the clicked cells, the
 *   whole target T when W reaches its row's last cell and the rows after it
 *   spell the rest of T exactly (`spellsRest`), nothing on a later row of a
 *   cut-looking link those rows do not spell, T when there is no W and T is
 *   http or https with no user part and at most 2,048 bytes of UTF-8, and
 *   nothing otherwise. The inputs (T as xterm holds it, W and whether it
 *   reaches the edge, the rows around the click) are what the probe records;
 *   the expected address is computed again here at grade time, never trusted
 *   from a reading. A path the pane offers on the clicked cell (rule 0) is
 *   graded apart, by main's recorder and the editor's tabs (`gradeFixRows`).
 * - Arm d's cells: `tmuxColumns` places tmux's text by the committed widths
 *   and the seven joining rules, written again here from their words.
 * - D16, the hover line, is `new URL(address).href` of that address.
 * - "Letters in the gaps" (research 145 §3.3) is `letterInGap` below.
 * - The fixtures' redaction rules (SPEC §8) are `fixtureProblems` below.
 *
 * ## Clause levels
 *
 * A row is `{ arm, clause, ok, said, info }`. `ok` is true, false, or null
 * when the reading could not decide it (a parent that did not show the defect
 * it is compared against, a reading that is missing). An `info` row is printed
 * and never moves the exit.
 */

/** The arms, in the order the probe runs and prints them. */
export const ARMS = Object.freeze(['a', 'b', 'c', 'd', 'e', 'f']);
/** The fixtures build/fixtures/p368/ must hold, and their budget (SPEC D20). */
export const FIXTURE_NAMES = Object.freeze(['claude-emoji', 'claude-plain', 'claude-links', 'codex-links', 'codex-emoji', 'claude-restore']);
export const FIXTURE_BUDGET_BYTES = 600_000;
/** The size tmux's `default-size` gives a session made with no -x/-y. */
export const DEFAULT_SIZE = '80x24';
/** D14's bounds. */
export const LINK_MAX_BYTES = 2048;
/** The most rows a cut address is followed across (D14 rule 3, the fix round). */
export const CUT_ROWS_MAX = 64;
/** What may follow the last piece of a cut address and leave the target what the screen draws. */
const CLOSING_ONLY = /^[.,;:!?'")\]}>]+$/;
/** How many quiescent marks an arm d replay must reach to be read at all. */
export const D_MIN_MARKS = 12;
/** The bare URL wider than the pane that Codex leaves to the terminal (research 145 §4.3, the links prompt's item 12). */
export const E_URL =
  'https://example.net/aaaaaaaaaa/bbbbbbbbbb/cccccccccc/dddddddddd/eeeeeeeeee/ffffffffff/gggggggggg/hhhhhhhhhh/iiiiiiiiii/jjjjjjjjjj/kkkkkkkkkk/llllllllll/mmmmmmmmmm/nnnnnnnnnn/oooooooooo/end';
/** The long line a shell-style program prints without breaking it (the probe's own text, 3 rows at 120 columns). */
export const E_SHELL_LINE = `$ git push origin HEAD:refs/heads/p368-weekend-plan --force-with-lease=p368-weekend-plan:abc123 --set-upstream --verbose --progress --no-verify --push-option=ci.skip --push-option=merge_request.create --push-option=merge_request.target=main --push-option=merge_request.title=p368-shell-line-end`;

const J = (v) => JSON.stringify(v);
const row = (arm, clause, ok, said, info = false) => ({ arm, clause, ok, said, info });
const isStr = (v) => typeof v === 'string';
const lines = (s) => String(s).split('\n');
/** Each line of a copy with its trailing U+0020 removed (what HEAD's copy must hold, D11). */
export const trimLineEnds = (s) => lines(s).map((l) => l.replace(/ +$/, '')).join('\n');
/**
 * The blanks a copied line must not end in (D11): a space, and a non breaking
 * space, which D11 makes a space before the trim, and a tab or a carriage
 * return, which no copy of a drawn row holds. Probe review (2026-11-16): the
 * grader asked for U+0020 alone, so a copy ending in a run of non breaking
 * spaces read as clean.
 */
const BLANK_AT_END = /[ \u00a0\t\r]$/;
const endsInSpace = (s) => isStr(s) && lines(s).some((l) => BLANK_AT_END.test(l));
const utf8Bytes = (s) => Buffer.byteLength(String(s), 'utf8');

// ---------------------------------------------------------------------------
// D14 and D16, from the spec's words
// ---------------------------------------------------------------------------

/** D14 (4): a target a click may open with no address in its words. */
export function targetOffered(target) {
  if (!isStr(target) || target === '') return false;
  if (utf8Bytes(target) > LINK_MAX_BYTES) return false;
  let u;
  try {
    u = new URL(target);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  return u.username === '' && u.password === '';
}

/**
 * D14 rule 3 as the fix round words it: whether the rows after a cut address's
 * first row, each read with its leading spaces taken off, spell `rest`
 * EXACTLY. Each row's first word is the next piece; a piece shorter than what
 * is left must fill its row to the last cell; the last piece is a row's whole
 * first word, or that word less closing punctuation.
 */
export function spellsRest(rest, rowsAfter, cols) {
  if (!isStr(rest) || rest === '' || !(Number(cols) >= 2)) return false;
  let left = rest;
  for (const raw of (Array.isArray(rowsAfter) ? rowsAfter : []).slice(0, CUT_ROWS_MAX)) {
    const r = String(raw ?? '');
    const body = r.replace(/^ +/, '');
    const space = body.indexOf(' ');
    const word = space === -1 ? body : body.slice(0, space);
    if (word === '') return false;
    if (word === left) return true;
    if (word.length > left.length) return word.startsWith(left) && CLOSING_ONLY.test(word.slice(left.length));
    if (!left.startsWith(word) || body !== word || r.length < Number(cols)) return false;
    left = left.slice(word.length);
  }
  return false;
}

/**
 * D14: the address a click on a link opens, or null, from the spec's words
 * as the fix round settled them. `target` is the link's target as xterm holds
 * it on the clicked row (null for no OSC link there), `web` the address
 * today's web-links reading finds on the clicked cells (null for none),
 * `webAtEdge` whether that address reaches its row's last cell, `rowsFrom`
 * the clicked row and the rows after it (older readings carry only `next`,
 * the row below), `cols` the terminal's width, and `before` the rows above,
 * nearest first, each `{ row, webs: [{ address, atEdge, endsOnRow }] }`.
 *
 *  - W, the words' address: W, unless T is W continued and the rows after it
 *    spell the rest of T exactly (`spellsRest`), a URL the agent cut, when T
 *    opens if it is offered and W otherwise.
 *  - No W, on a later row of a cut-looking address (walking up over rows that
 *    are one piece filling their row, a row ending at its last cell with an
 *    address T begins with): T if the rows spell it and it is offered, else
 *    NOTHING, which is what a click there opened before.
 *  - Otherwise T when it is offered, else nothing.
 *
 * A path the pane offers on the clicked cell (rule 0) is graded apart, by
 * what main and the editor were handed, never here.
 */
export function linkExpected({ target = null, web = null, webAtEdge = false, rowsFrom = null, next = '', cols = 0, before = [] }) {
  const rows = Array.isArray(rowsFrom) && rowsFrom.length > 0 ? rowsFrom.map((r) => String(r ?? '')) : ['', String(next ?? '')];
  if (isStr(web) && web !== '') {
    if (isStr(target) && target.startsWith(web) && target.length > web.length && webAtEdge === true && spellsRest(target.slice(web.length), rows.slice(1), cols)) {
      return targetOffered(target) ? target : null;
    }
    return web;
  }
  if (isStr(target)) {
    const between = [];
    for (const b of Array.isArray(before) ? before.slice(0, CUT_ROWS_MAX) : []) {
      const first = (b?.webs ?? []).find((w) => isStr(w?.address) && w.endsOnRow === true && w.atEdge === true && target.length > w.address.length && target.startsWith(w.address));
      if (first !== undefined) {
        return spellsRest(target.slice(first.address.length), [...[...between].reverse(), ...rows], cols) && targetOffered(target) ? target : null;
      }
      const r = String(b?.row ?? '');
      const body = r.replace(/^ +/, '');
      if (body === '' || body.includes(' ') || r.length < Number(cols)) break;
      between.push(r);
    }
  }
  return isStr(target) && targetOffered(target) ? target : null;
}

/** What xterm itself offers as a link with no `allowNonHttpProtocols`: a target `new URL` parses as http or https. */
export function xtermOffers(target) {
  if (!isStr(target) || target === '') return false;
  try {
    const u = new URL(target);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * The hostile targets the spec words two ways. D14's text offers each of them
 * (each parses as https with no user part and fits 2,048 bytes), while §4.5's
 * test list and §8's arm f call them refused. Both are safe so long as a click
 * opens exactly the target or nothing, and the hover shows `new URL(target).href`
 * (the host in ASCII, every bidi or hidden character encoded) whenever it
 * opens, so either outcome passes here and the report names which happened.
 */
export const HOSTILE_EITHER = Object.freeze(['bidi', 'homograph', 'nohost', 'backslash', 'zerowidth']);

/** D16: the hover line of an address, or null. */
export function hoverExpected(address) {
  if (!isStr(address)) return null;
  try {
    return new URL(address).href;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Readings helpers
// ---------------------------------------------------------------------------

/**
 * Research 145 §3.3's signature, a letter in a gap: the terminal's row and
 * tmux's row differ by more than spacing (their non-blank characters differ)
 * and by more than stale characters past tmux's end (the terminal's
 * characters are not tmux's followed by extras). A row shifted by a cell, or
 * holding a stale cell at its end, is NOT a letter in a gap; it is counted by
 * `differing` alone.
 */
export function letterInGap(term, tmux) {
  const a = String(term ?? '').replace(/\s+$/, '');
  const b = String(tmux ?? '').replace(/\s+$/, '');
  if (a === b) return false;
  const ca = a.replace(/ /g, '');
  const cb = b.replace(/ /g, '');
  if (ca === cb) return false;
  if (ca.startsWith(cb)) return false;
  if (cb === '') return false;
  // A row that is a different row altogether (the picture moved) is not a gap: most of tmux's
  // characters must be in the terminal's row, counted as a multiset of code points.
  const bag = new Map();
  for (const ch of ca) bag.set(ch, (bag.get(ch) ?? 0) + 1);
  let common = 0;
  const B = [...cb];
  for (const ch of B) {
    const n = bag.get(ch) ?? 0;
    if (n > 0) {
      common += 1;
      bag.set(ch, n - 1);
    }
  }
  return common / B.length >= 0.7;
}

// ---------------------------------------------------------------------------
// Arm d by CELLS (the fix round): a row's text placed where tmux draws it
// ---------------------------------------------------------------------------

/**
 * A code point's width by one build's measured ranges (build/fixtures/screen/
 * tmux-widths.json, `builds[v].ranges`, triples of first, last and width), the
 * three measured zero ranges of plane 14, and 1 for everything else.
 */
export function widthTable(ranges) {
  const flat = [...(ranges ?? [])].sort((a, b) => a[0] - b[0]);
  return (cp) => {
    let lo = 0;
    let hi = flat.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const [s, e, w] = flat[mid];
      if (cp < s) hi = mid - 1;
      else if (cp > e) lo = mid + 1;
      else return w;
    }
    if (cp === 0xe0001 || (cp >= 0xe0020 && cp <= 0xe007f) || (cp >= 0xe0100 && cp <= 0xe01ef)) return 0;
    return 1;
  };
}

const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u;
const isRegional = (cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff;
const isSkinTone = (cp) => cp >= 0x1f3fb && cp <= 0x1f3ff;
const isHangulTail = (cp) => (cp >= 0x1160 && cp <= 0x11ff) || (cp >= 0xd7b0 && cp <= 0xd7fb);
const isHangulHead = (cp) => (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0xa960 && cp <= 0xa97c) || (cp >= 0xac00 && cp <= 0xd7a3);

/**
 * A row of `capture-pane -p` placed in the columns tmux draws it in: `cols`
 * strings, a cell's text at its first column, '' for the right half of a
 * cell two wide, ' ' for a blank. The seven joining rules as Phase 337
 * measured and wrote them, spelled again here from those words rather than
 * read from the code under test: VS16 joins and widens to 2, VS15 joins, a
 * ZWJ joins and joins the next code point too, a regional-indicator pair is
 * one cell of 2 and a lone one a cell of 1, a skin tone joins a base of emoji
 * presentation, a zero-width code point joins the cell before it, Hangul
 * medial and final jamo join a syllable or a lead; a zero-width code point
 * with no cell before it is dropped; a tab moves to the next stop of 8.
 */
export function tmuxColumns(text, widthOf, cols) {
  const out = Array.from({ length: Math.max(0, cols) }, () => ' ');
  const cells = [];
  let open = null;
  const close = () => {
    if (open !== null) cells.push(open);
    open = null;
  };
  for (const ch of String(text ?? '')) {
    const cp = ch.codePointAt(0);
    if (ch === '\t') {
      close();
      cells.push({ tab: true });
      continue;
    }
    const zero = widthOf(cp) === 0;
    if (open !== null) {
      if (open.zwj) {
        open.text += ch;
        open.zwj = false;
        continue;
      }
      if (cp === 0xfe0f) {
        open.text += ch;
        open.w = 2;
        continue;
      }
      if (cp === 0xfe0e) {
        open.text += ch;
        continue;
      }
      if (cp === 0x200d) {
        open.text += ch;
        open.zwj = true;
        continue;
      }
      if (isRegional(cp) && open.regional && !open.paired) {
        open.text += ch;
        open.w = 2;
        open.paired = true;
        continue;
      }
      if (isSkinTone(cp) && open.emoji) {
        open.text += ch;
        continue;
      }
      if ((isHangulTail(cp) && open.hangul) || zero) {
        open.text += ch;
        continue;
      }
    } else if (zero || cp === 0xfe0f || cp === 0xfe0e || cp === 0x200d) {
      continue;
    }
    close();
    open = {
      text: ch,
      w: isRegional(cp) ? 1 : widthOf(cp) === 2 ? 2 : 1,
      zwj: false,
      regional: isRegional(cp),
      paired: false,
      emoji: EMOJI_PRESENTATION.test(ch),
      hangul: isHangulHead(cp)
    };
  }
  close();
  let x = 0;
  for (const c of cells) {
    if (c.tab) {
      x = Math.min(cols, (Math.floor(x / 8) + 1) * 8);
      continue;
    }
    if (x >= cols) break;
    out[x] = c.text;
    if (c.w === 2 && x + 1 < cols) out[x + 1] = '';
    x += c.w;
  }
  return out;
}

/**
 * The rows where the terminal's cells differ from tmux's, column by column.
 * `termCells` is each visible row as the terminal holds it (`cols` strings, as
 * `tmuxColumns` answers them), `tmuxRows` the pane's `capture-pane -p`. A row
 * drawn one column off reads equal by text and different here.
 */
export function cellDiffs(termCells, tmuxRows, widthOf, cols) {
  const out = [];
  const n = Math.max(termCells.length, tmuxRows.length);
  for (let y = 0; y < n; y += 1) {
    const a = termCells[y] ?? [];
    const b = tmuxColumns(tmuxRows[y] ?? '', widthOf, cols);
    let at = -1;
    for (let x = 0; x < cols; x += 1) {
      const p = a[x] ?? ' ';
      const q = b[x] ?? ' ';
      if (p !== q) {
        at = x;
        break;
      }
    }
    if (at >= 0) out.push({ y, at });
  }
  return out;
}

/** Numbered list items a capture holds, by their number, for the restored replay (research 145 cold1). */
export function itemCounts(text) {
  const counts = {};
  for (const l of lines(text ?? '')) {
    const m = /^\s{0,6}(\d{1,2})\.\s+\S/.exec(l);
    if (m) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  }
  return counts;
}
export const duplicatedItems = (counts) => Object.keys(counts ?? {}).filter((k) => counts[k] > 1).sort((x, y) => Number(x) - Number(y));

/**
 * The server's events for one session in a step, normalized. tmux runs a hook's
 * command (a shell, then perl for the stamp) after the event, so an attach and
 * the resize that fits it land together and in either order, and a hook reads
 * the client's size when it runs, not when the event happened. So an attach is
 * read as `A` with no size, every resize within 300 ms of an attach is read as
 * part of it, and every other resize keeps its size: what is compared is the
 * attaches, the detaches and the sizes the client was given on its own.
 */
export function normalizeServer(events) {
  const ev = Array.isArray(events) ? events : [];
  const attaches = ev.filter((e) => e?.k === 'A').map((e) => Number(e.t));
  const out = [];
  for (const e of ev) {
    if (e?.k === 'A') out.push('A');
    else if (e?.k === 'D') out.push('D');
    else if (e?.k === 'R' && !attaches.some((t) => Math.abs(Number(e.t) - t) <= 300)) out.push(`R:${String(e.size)}`);
  }
  return out;
}
const sizesOf = (norm) => norm.filter((x) => x.startsWith('R:')).map((x) => x.slice(2));
const drop80 = (list) => (Array.isArray(list) ? list.filter((s) => s !== DEFAULT_SIZE) : []);
const has80 = (list) => Array.isArray(list) && list.includes(DEFAULT_SIZE);

// ---------------------------------------------------------------------------
// The graders, one per arm; `p` and `h` are the parent's and HEAD's reading
// of that arm (undefined when not read).
// ---------------------------------------------------------------------------

export function gradeA(p, h) {
  const out = [];
  const read = (r) => Array.isArray(r?.returns) && r.returns.filter((x) => x.delay === 15).length === 4 && r.returns.filter((x) => x.delay === 30).length === 4;
  const saw80 = (x) => (x.pane ?? []).includes(DEFAULT_SIZE);
  if (!read(p)) out.push(row('a', 'a.parent-lost-race', null, 'the parent was not read (eight held-back returns)'));
  else {
    // Held 15 ms the race is a coin the parent sometimes wins (SPEC §2.2 read 1 of 4 in one run and 3 of 4
    // in another; probe:p368's first run read 0 of 4), and under a load average of 240 to 500 the parent won
    // one of four held 30 ms too (Lens A, 2026-11-16, read 3 of 4). The fix round: ONE lost race at either
    // delay shows the defect, because HEAD must lose none of eight.
    const n15 = p.returns.filter((x) => x.delay === 15 && saw80(x)).length;
    const n30 = p.returns.filter((x) => x.delay === 30 && saw80(x)).length;
    const lost = n15 + n30;
    out.push(row('a', 'a.parent-lost-race', lost >= 1 ? true : null, `the parent's program saw 80x24 at ${n15} of 4 returns held 15 ms and ${n30} of 4 held 30 ms (SPEC §2.2: 4 of 4 at 30 ms)${lost >= 1 ? '' : ', so the defect did not show'}`));
  }
  if (!read(h)) {
    out.push(row('a', 'a.head-never-80x24', null, 'HEAD was not read (eight held-back returns)'));
    out.push(row('a', 'a.head-attach-at-fitted', null, 'HEAD was not read'));
    return out;
  }
  const bad = h.returns.filter(saw80);
  out.push(row('a', 'a.head-never-80x24', bad.length === 0, bad.length === 0 ? "HEAD's program never saw 80x24 (0 of 8 held-back returns)" : `HEAD's program saw 80x24 at ${bad.length} of 8 returns: ${J(bad.map((x) => `${x.delay}ms#${x.i} ${x.pane.join(',')}`))}`));
  // Probe review (2026-11-16): a hook log that recorded nothing at any return (a set-hook that failed, or a
  // log that was never written) is a reading that did not arrive, not an attach at another size.
  if (h.returns.every((x) => (x.server ?? []).length === 0)) {
    out.push(row('a', 'a.head-attach-at-fitted', null, "the server's hooks recorded nothing at any of HEAD's eight returns, so what its attach clients were told was not read"));
    return out;
  }
  // tmux reports a client's size at its attach as a client-resized of the same size, and a hook reads the
  // size when it runs, so an attach at 80x24 fitted within a few milliseconds would read like one spawned
  // fitted: the hooks can only say every size the client was given was the fitted one, and the program's
  // own view (a.head-never-80x24, and no size at all here) is the decisive reading.
  const off = h.returns.filter((x) => !isStr(x.attach) || x.attach !== x.fitted || (x.server ?? []).some((e) => e.k === 'R' && e.size !== x.fitted) || (x.pane ?? []).length > 0);
  out.push(row('a', 'a.head-attach-at-fitted', off.length === 0, off.length === 0 ? "every HEAD attach client was given the fitted size and no other, and the program saw no size at all" : `HEAD returns given another size: ${J(off.map((x) => ({ delay: x.delay, i: x.i, attach: x.attach, fitted: x.fitted, resized: (x.server ?? []).filter((e) => e.k === 'R').map((e) => e.size), pane: x.pane })))}`));
  return out;
}

export function gradeB(p, h) {
  const out = [];
  const startAt = (r, key) => r?.[key]?.start ?? null;
  for (const key of ['fresh', 'restored']) {
    const name = key === 'fresh' ? 'new' : 'restore';
    const ps = startAt(p, key);
    out.push(row('b', `b.parent-${name}-80x24`, ps === null ? null : ps === DEFAULT_SIZE ? true : null, ps === null ? `the parent's ${key} session was not read` : `the parent's ${key} program started at ${ps}${ps === DEFAULT_SIZE ? '' : ', not 80x24, so the defect did not show'}`));
    const r = h?.[key];
    if (r === undefined || r === null || r.start === null || r.start === undefined) {
      out.push(row('b', `b.head-${name}-at-fitted`, null, `HEAD's ${key} session was not read`));
      continue;
    }
    const ok = r.start === r.fitted && (r.later ?? []).length === 0;
    out.push(row('b', `b.head-${name}-at-fitted`, ok, `HEAD's ${key} program started at ${r.start} with the pane fitted at ${r.fitted}${(r.later ?? []).length === 0 ? ' and was given no later size' : `, then was given ${r.later.join(', ')}`}`));
  }
  const pr = p?.replay;
  if (pr === undefined || pr === null || pr.items === undefined) out.push(row('b', 'b.parent-replay-twice', null, "the parent's restored replay was not read"));
  else {
    const dup = duplicatedItems(pr.items);
    out.push(row('b', 'b.parent-replay-twice', dup.length > 0 ? true : null, dup.length > 0 ? `the parent's restored Claude left items ${dup.join(', ')} twice (started at ${pr.start})` : `the parent's restored replay left no item twice (started at ${pr.start}), so the defect did not show`));
  }
  const hr = h?.replay;
  if (hr === undefined || hr === null || hr.items === undefined) out.push(row('b', 'b.head-replay-once', null, "HEAD's restored replay was not read"));
  // Probe review (2026-11-16): a capture holding no numbered item read nothing; it is not a replay that
  // left an item twice.
  else if (Object.keys(hr.items ?? {}).length === 0) out.push(row('b', 'b.head-replay-once', null, `HEAD's restored replay's capture held no numbered item (${String(hr.rowsRead ?? 0)} rows read), so it was not read`));
  else {
    const dup = duplicatedItems(hr.items);
    const ok = dup.length === 0 && hr.repainted !== true && Object.keys(hr.items).length > 0;
    out.push(row('b', 'b.head-replay-once', ok, ok ? `HEAD's restored Claude started at ${hr.start}, was given no other size and left every item once (${Object.keys(hr.items).length} items)` : `HEAD's restored replay: started at ${hr.start}, repainted ${String(hr.repainted)}, items twice ${J(dup)}, items read ${Object.keys(hr.items).length}`));
  }
  return out;
}

/** The census rows graded elsewhere (arm b), or by a rule of their own. */
const C_SPECIAL = new Set(['new-session', 'restored', 'split', 'font-first-mount', 'window-drag']);
/**
 * The census steps that send the pane a size at the parent (SPEC §2.1). Probe review (2026-11-16): a window
 * that never takes the step (one behind his other windows runs no fit, SPEC §0.1 item 6) shows no size at
 * either build, and the two empty readings compared as equal; such a row is unread, never a pass.
 */
const C_SIZED = new Set([
  'sidebar-off',
  'sidebar-on',
  'orientation-right',
  'orientation-top',
  'focus-mode-on',
  'focus-mode-off',
  'zoom-in',
  'zoom-out',
  'viewport-8ms',
  'viewport-60ms',
  'layout-bar-8ms',
  'layout-bar-60ms',
  'fullscreen-on',
  'fullscreen-off'
]);

export function gradeC(p, h) {
  const out = [];
  const pr = p?.rows ?? null;
  const hr = h?.rows ?? null;
  if (pr === null || hr === null) {
    out.push(row('c', 'c.read', null, `the census was not read at ${pr === null ? 'the parent' : ''}${pr === null && hr === null ? ' and ' : ''}${hr === null ? 'HEAD' : ''}`));
    return out;
  }
  // Probe review (2026-11-16): the server half of every row is the hook log, and a log that recorded
  // nothing at a build (a set-hook that failed) compares as equal empty lists row after row. Each build's
  // census must have heard at least one event for its readings to be compared.
  const heard = (rows) => Object.values(rows).some((r) => Array.isArray(r?.server) && r.server.length > 0);
  const hp = heard(pr);
  const hh = heard(hr);
  out.push(row('c', 'c.server-read', hp && hh ? true : null, hp && hh ? "the server's hooks recorded events at both builds" : `the server's hooks recorded no event at ${!hp ? 'the parent' : ''}${!hp && !hh ? ' or ' : ''}${!hh ? 'HEAD' : ''}, so what the attach clients were told was not read`));
  // A row whose program saw a size while its server half recorded nothing: the hook log missed it, so that
  // row is judged on the program's sizes alone. Printed, so a reader knows which rows those are.
  const deaf = [];
  for (const [build, rows] of [['parent', pr], ['HEAD', hr]]) {
    for (const [name, r] of Object.entries(rows)) {
      if (name === 'new-session' || name === 'restored' || name === 'font-first-mount') continue;
      if ((r?.pane ?? []).length > 0 && (r?.server ?? []).length === 0) deaf.push(`${build} ${name}`);
    }
  }
  if (deaf.length > 0) out.push(row('c', 'c.server-missed', true, `the program saw a size where the hooks recorded nothing, so these rows are judged on the program alone: ${deaf.join(', ')}`, true));
  const names = [...new Set([...(p.order ?? Object.keys(pr)), ...(h.order ?? Object.keys(hr))])];
  for (const name of names) {
    const a = pr[name];
    const b = hr[name];
    const clause = `c.${name}`;
    if (a === undefined || b === undefined || a.err || b.err) {
      out.push(row('c', clause, null, `not read at both builds (${a === undefined ? 'parent missing' : a.err ? `parent: ${a.err}` : 'parent read'}; ${b === undefined ? 'HEAD missing' : b.err ? `HEAD: ${b.err}` : 'HEAD read'})`));
      continue;
    }
    const na = normalizeServer(a.server);
    const nb = normalizeServer(b.server);
    if (name === 'new-session' || name === 'restored') {
      out.push(row('c', clause, true, `graded by arm b (parent pane ${J(a.pane)}, HEAD pane ${J(b.pane)})`, true));
      continue;
    }
    if (name === 'font-first-mount') {
      // The launch's first session is made before any pane has a size, so it starts at tmux's 80 by 24 at
      // both builds (D2: none known keeps today's); what its first mount may send after that is ONE size.
      const la = (a.pane ?? []).slice(1);
      const lb = (b.pane ?? []).slice(1);
      out.push(row('c', `${clause}.parent`, true, `the parent's first mount, with JetBrains Mono chosen before the launch, gave its program ${J(la)} after its start ${J((a.pane ?? [])[0] ?? null)}`, true));
      out.push(row('c', clause, b.pane === null || b.pane === undefined ? null : lb.length === 1, `HEAD's first mount gave its program ${J(lb)} after its start ${J((b.pane ?? [])[0] ?? null)} (one size wanted)`));
      continue;
    }
    if (name === 'window-drag') {
      const sa = sizesOf(na).length;
      const sb = sizesOf(nb).length;
      const pa = (a.pane ?? []).length;
      const pb = (b.pane ?? []).length;
      const lastA = (a.pane ?? []).at(-1) ?? null;
      const lastB = (b.pane ?? []).at(-1) ?? null;
      // Probe review (2026-11-16): a drag the parent's window never took (no size at its server or its
      // program) compared 0 with 0 and passed; that is a reading that did not arrive.
      if (sa === 0 && pa === 0) {
        out.push(row('c', clause, null, "the drag sent no size at the parent's server or program, so the window did not take it and the row was not read"));
        continue;
      }
      const ok = Math.abs(sa - sb) <= 3 && pb <= pa + 1 && lastA === lastB;
      out.push(row('c', clause, ok, `the drag told the server ${sa} sizes at the parent and ${sb} at HEAD, the program ${pa} and ${pb}, ending at ${lastA} and ${lastB} (equal within 3 server sizes and 1 program size)`));
      continue;
    }
    if (name === 'split') {
      const wOk = J(drop80(a.pane)) === J(b.pane) && !has80(b.pane) && J(drop80(sizesOf(na))) === J(sizesOf(nb)) && !has80(sizesOf(nb));
      const pa = a.partner ?? null;
      const pb = b.partner ?? null;
      const partnerOk = pa !== null && pb !== null && (pa.later ?? []).length === (pb.later ?? []).length && (pb.later ?? []).length <= 1;
      out.push(row('c', clause, wOk && partnerOk ? true : pa === null || pb === null ? null : false, `the split pane: program ${J(a.pane)} and ${J(b.pane)}, server ${J(sizesOf(na))} and ${J(sizesOf(nb))}; the new half started at ${pa?.start ?? '?'} then ${J(pa?.later ?? [])} at the parent, at ${pb?.start ?? '?'} then ${J(pb?.later ?? [])} at HEAD (the new half is half a tab, so its attach fits it once at both builds, D2)`));
      continue;
    }
    if (C_SPECIAL.has(name)) continue;
    if (C_SIZED.has(name) && (a.pane ?? []).length === 0 && sizesOf(na).length === 0) {
      out.push(row('c', clause, null, `the parent's window sent this step no size at its server or its program (SPEC §2.1 reads one), so the step did not land and the row was not read`));
      continue;
    }
    // The program's sizes in order, and the SIZES the server gave the client on their own as a multiset (two
    // hooks can land in either order). The one difference allowed is the fix itself: an 80x24 step the
    // parent showed (a re-attach that lost its race, the split's re-attach) and HEAD does not; HEAD may show
    // 80x24 nowhere. THE FIX ROUND: attaches and detaches are no longer compared. A detach hook runs a shell
    // and perl and lands 100 to 200 ms late, so under load it fell after the step's boundary at one build
    // and before it at the other (Lens A read c.tab-away-1 and c.tab-back-1 red on that alone), and a
    // detaching client is reported under whichever session it last showed (c.split-partner-ended). Neither
    // is a size, and a size is what this arm is about; they are printed beside the verdict. And the sizes are
    // compared as the DISTINCT sizes the client was given: the fix round's own run read the parent's client told
    // 60x33 twice, 7 ms apart, at full screen and HEAD's once, with the program given nothing at either build,
    // and a size told twice is not a second size (the kernel signals a program only on a change).
    const distinct = (list) => [...new Set(list)].sort();
    const ok = J(drop80(a.pane)) === J(b.pane) && !has80(b.pane) && J(distinct(drop80(sizesOf(na)))) === J(distinct(sizesOf(nb))) && !has80(sizesOf(nb));
    const marks = (n) => n.filter((x) => x === 'A' || x === 'D').join('');
    const moved = marks(na) === marks(nb) ? '' : ` (attaches and detaches, not compared: ${J(marks(na))} and ${J(marks(nb))})`;
    out.push(row('c', clause, ok, ok ? `equal: program ${J(b.pane)}, server sizes ${J(sizesOf(nb))}${has80(a.pane) ? ' (the parent also met 80x24)' : ''}${moved}` : `differs: program ${J(a.pane)} at the parent and ${J(b.pane)} at HEAD, server ${J(na)} and ${J(nb)}`));
  }
  return out;
}

export function gradeD(p, h) {
  const out = [];
  for (const v of ['3.7b', '3.6a']) {
    for (const agent of ['claude', 'codex']) {
      const base = `d.${v}.${agent}`;
      const P = p?.[v]?.[agent];
      const H = h?.[v]?.[agent];
      const readOk = (r) => r?.emoji?.marks >= D_MIN_MARKS && r?.plain?.marks >= D_MIN_MARKS;
      const graded = agent === 'claude';
      if (!readOk(P)) out.push(row('d', `${base}.parent-differs`, null, `the parent's ${agent} replays on ${v} reached ${P?.emoji?.marks ?? 0} and ${P?.plain?.marks ?? 0} marks (at least ${D_MIN_MARKS} wanted)`, !graded));
      else {
        const shows = P.emoji.differing > P.plain.differing;
        out.push(row('d', `${base}.parent-differs`, shows ? true : null, `the parent's terminal differed from tmux in ${P.emoji.differing} row readings over the emoji reply against ${P.plain.differing} over the reply with none${shows ? '' : ', so the defect did not show'}`, !graded));
      }
      if (!readOk(H)) out.push(row('d', `${base}.head-at-floor`, null, `HEAD's ${agent} replays on ${v} reached ${H?.emoji?.marks ?? 0} and ${H?.plain?.marks ?? 0} marks (at least ${D_MIN_MARKS} wanted)`));
      else {
        const ok = H.emoji.differing <= H.plain.differing;
        out.push(row('d', `${base}.head-at-floor`, ok, `HEAD's terminal differed from tmux in ${H.emoji.differing} row readings over the emoji reply against a floor of ${H.plain.differing} with no emoji (widths ${String(H.emoji.cellWidths ?? 'none named')})${ok ? '' : `, e.g. ${J((H.emoji.samples ?? []).slice(0, 2))}`}`));
      }
      // Probe review (2026-11-16): D7, graded. The grid reading compares TEXT, so a cell drawn one column
      // off with nothing stale at the row's end reads equal; the 3.6a launch's code points where 3.6a and
      // 3.7b disagree (SPEC §2.4) appear in no recording, so a 3.6a server drawn with the 3.7b table passes
      // head-at-floor. The table each replay's session row names is what decides those cells.
      // Two readings: the table main names on each replay's session row, and the provider the pane's own
      // terminal draws with (`tmux-<table>`, tmux-widths.ts). A definite wrong answer is a finding even when
      // the other could not be read; a missing one (the row or the terminal not found, a read that threw)
      // is not read.
      if (readOk(H)) {
        const named = [H.emoji?.cellWidths, H.plain?.cellWidths];
        const active = [H.emoji?.activeVersion, H.plain?.activeVersion];
        const namedUnread = (x) => x === undefined || x === 'no row' || x === 'unread';
        const activeUnread = (x) => x === undefined || x === null || x === 'unread';
        const bad = named.some((x) => !namedUnread(x) && x !== v) || active.some((x) => !activeUnread(x) && x !== `tmux-${v}`);
        const unread = named.some(namedUnread) || active.some(activeUnread);
        const ok = bad ? false : unread ? null : true;
        out.push(row('d', `${base}.head-table`, ok, `HEAD's ${agent} session rows on the ${v} server named the table ${J(named)} and their panes drew with ${J(active)}${ok === true ? '' : ok === false ? ` (D7 wants ${v} and tmux-${v})` : ', which was not read whole'}`));
      }
      if (v === '3.6a') {
        if (readOk(P)) out.push(row('d', `${base}.parent-letters`, P.emoji.gaps > 0 ? true : null, `the parent's 3.6a terminal held a letter in a gap in ${P.emoji.gaps} row readings`, !graded));
        if (readOk(H)) out.push(row('d', `${base}.head-no-letters`, H.emoji.gaps === 0, `HEAD's 3.6a terminal held a letter in a gap in ${H.emoji.gaps} row readings${H.emoji.gaps === 0 ? '' : `, e.g. ${J((H.emoji.samples ?? []).filter((s) => s.gap).slice(0, 2))}`}`));
        else out.push(row('d', `${base}.head-no-letters`, null, `HEAD's ${agent} 3.6a replay was not read`));
      }
    }
  }
  return out;
}

/**
 * Whether some line of a copy holds the needle: the parent's scrolled-back copy, printed. (The fix round took
 * out the HEAD clauses that held a scrolled-back copy whole, `lineWhole` and `tokenWhole`, with item 7.)
 */
const holdsWhole = (text, needle) => isStr(text) && lines(text).some((l) => l.includes(needle));

export function gradeE(p, h) {
  const out = [];
  // 1. the narrowing
  const pn = p?.narrow;
  const hn = h?.narrow;
  if (!isStr(pn?.copy)) out.push(row('e', 'e.narrow.parent-past-width', null, "the parent's narrowed copy was not read"));
  else out.push(row('e', 'e.narrow.parent-past-width', (pn.pastInCopy ?? []).length > 0 ? true : null, `the parent's copy after ${pn.from} to ${pn.to} held ${(pn.pastInCopy ?? []).length} fragments from cells past column ${String(pn.to).split('x')[0]}${(pn.pastInCopy ?? []).length > 0 ? `, e.g. ${J(pn.pastInCopy[0])}` : ', so the defect did not show'}`));
  if (!isStr(hn?.copy)) out.push(row('e', 'e.narrow.head-within-width', null, "HEAD's narrowed copy was not read"));
  else {
    const ok = (hn.pastInCopy ?? []).length === 0 && hn.copy === hn.drawn;
    out.push(row('e', 'e.narrow.head-within-width', ok, ok ? `HEAD's copy after ${hn.from} to ${hn.to} held no cell past the width and equals what is drawn` : `HEAD's copy held ${(hn.pastInCopy ?? []).length} fragments past the width${hn.copy === hn.drawn ? '' : ' and is not what is drawn'}: ${J((hn.pastInCopy ?? []).slice(0, 2))}`));
    out.push(row('e', 'e.narrow.head-edit-menu', isStr(hn.editMenu) && hn.editMenu === hn.copy, isStr(hn.editMenu) ? `the Edit menu's Copy ${hn.editMenu === hn.copy ? 'gave' : 'did NOT give'} ⌘C's text at HEAD` : "the Edit menu's Copy wrote nothing at HEAD"));
  }
  if (isStr(pn?.editMenu)) out.push(row('e', 'e.narrow.parent-edit-menu', true, `the parent's Edit menu Copy (xterm's own) held ${(pn.pastInEditMenu ?? []).length} fragments past the width`, true));
  // 2. the scrolled-back URL and line. THE FIX ROUND took item 7 back out (build/p368/SPEC.md §As built):
  // a selection made while scrolled back that never scrolled is xterm's own again, because composing it
  // through -J glued rows a program redrew apart under a stale wrap mark (the attack lens: 4 lines where
  // the screen draws 11). So HEAD's copy of each such gesture must be the parent's, line ends trimmed
  // (item 6), and no longer "whole"; the parent's broken copy is printed, not graded.
  for (const [key, needle, label] of [['url', E_URL, 'the Codex URL'], ['line', E_SHELL_LINE, 'the long shell line']]) {
    const P = p?.[key];
    const H = h?.[key];
    if (isStr(P?.drag)) out.push(row('e', `e.${key}.parent-broken`, true, `the parent's copy of ${label} dragged while scrolled back ${holdsWhole(P.drag, needle) ? 'held it whole' : `broke it over ${lines(P.drag).length} lines`}`, true));
    const gestures = ['drag', ...(key === 'url' ? ['all', 'dbl', 'triple'] : [])].filter((g) => isStr(P?.[g]) && isStr(H?.[g]));
    if (gestures.length === 0) {
      out.push(row('e', `e.${key}.head-as-parent`, null, `the scrolled-back copies of ${label} were not read at both builds`));
      continue;
    }
    const differ = gestures.filter((g) => trimLineEnds(H[g]) !== trimLineEnds(P[g]));
    out.push(row('e', `e.${key}.head-as-parent`, differ.length === 0, differ.length === 0 ? `HEAD copied ${label} while scrolled back exactly as the parent did, line ends trimmed (${gestures.join(', ')})` : `HEAD's scrolled-back copy of ${label} is not the parent's by ${differ.join(', ')}: ${J(differ.map((g) => ({ parent: P[g].slice(0, 120), head: H[g].slice(0, 120) })))}`));
  }
  // 4. the reporter's command at a steady width: exactly as the parent copies it, line ends trimmed
  const pc = p?.command?.copy;
  const hc = h?.command?.copy;
  if (!isStr(pc) || !isStr(hc)) out.push(row('e', 'e.command.as-parent', null, "the reporter's command was not copied at both builds"));
  else {
    const ok = hc === trimLineEnds(pc) && lines(hc).length >= 2;
    out.push(row('e', 'e.command.as-parent', ok, ok ? `HEAD copied the command over ${lines(hc).length} lines exactly as the parent did, with no trailing space` : `HEAD ${J(hc.slice(0, 200))} against the parent ${J(pc.slice(0, 200))}`));
  }
  // 5. no trailing space at a line end in any HEAD copy
  const heads = [hn?.copy, hn?.editMenu, h?.url?.drag, h?.url?.all, h?.url?.dbl, h?.url?.triple, h?.line?.drag, hc].filter(isStr);
  const spaced = heads.filter(endsInSpace);
  out.push(row('e', 'e.head-no-trailing-space', heads.length > 0 ? spaced.length === 0 : null, heads.length === 0 ? 'no HEAD copy was read' : spaced.length === 0 ? `none of HEAD's ${heads.length} copies ends a line in a space` : `${spaced.length} of HEAD's copies end a line in a space: ${J(spaced.map((s) => s.slice(0, 80)))}`));
  return out;
}

/** The fix round's rows in arm f's hostile session (the probe draws them; SPEC §As built, the fix round). */
export const PATH_WORD = Object.freeze({ key: 'pathword', target: 'https://example.com/readme-elsewhere', words: 'README.md' });
export const CUT_ROWS = Object.freeze([
  Object.freeze({ key: 'cutspoof', target: 'https://good.example.co.evil.io/x', first: 'https://good.ex', second: 'ample.com/login', host: 'evil.io' }),
  Object.freeze({ key: 'cuthonest', target: 'https://example.com/cut/honest/rest-of-path/end', first: 'https://example.com/cut/honest/', second: 'rest-of-path/end', host: null })
]);

/** One click reading graded: the address it opened against D14, and the hover against D16. */
function clickVerdict(c, build) {
  const expected = linkExpected({
    target: build === 'head' ? c.target ?? null : null,
    web: c.web ?? null,
    webAtEdge: c.webAtEdge === true,
    rowsFrom: c.rowsFrom ?? null,
    next: c.next ?? '',
    cols: c.cols ?? 0,
    before: c.before ?? []
  });
  const opened = Array.isArray(c.opened) ? c.opened : [];
  // The address itself, or the same address as `new URL` writes it, which is exactly what the hover shows
  // (D16): a handler that opens what it showed hands main the same resource.
  const openOk = expected === null ? opened.length === 0 : opened.length === 1 && (opened[0] === expected || opened[0] === hoverExpected(expected));
  const hoverWant = build === 'head' && isStr(c.target) ? hoverExpected(expected) : null;
  const hoverOk = (c.hover ?? null) === hoverWant;
  return { expected, opened, openOk, hoverWant, hoverOk };
}

export function gradeF(p, h) {
  const out = [];
  for (const [build, R] of [['parent', p], ['head', h]]) {
    if (R === undefined || R === null) continue;
    const patched = R.patched?.openExternal === true && R.patched?.writeRich === true;
    out.push(row('f', `f.${build}.recorders`, patched, patched ? `main's shell.openExternal and clipboard:writeRich were recorders before the first click (${build})` : `the recorders were not in place at ${build}: ${J(R.patched ?? null)}`));
  }
  const P = p ?? null;
  const H = h ?? null;
  if (P === null) out.push(row('f', 'f.parent-none-registered', null, 'the parent was not read'));
  else {
    const n = (P.claude?.registered ?? []).length + (P.codex?.registered ?? []).length;
    const offered = [...(P.claude?.clicks ?? []), ...(P.codex?.clicks ?? [])].filter((c) => isStr(c.target)).length;
    out.push(row('f', 'f.parent-none-registered', n === 0 && offered === 0 ? true : null, `the parent's terminal held ${n} links an agent sent and offered ${offered} on a clicked cell${n === 0 && offered === 0 ? '' : ', so it already had links'}`));
    const words = (P.claude?.clicks ?? []).filter((c) => !isStr(c.web));
    const opened = words.filter((c) => (c.opened ?? []).length > 0);
    out.push(row('f', 'f.parent-claude-words-nothing', words.length > 0 ? opened.length === 0 : null, `the parent's clicks on ${words.length} of Claude's link words with no address drawn opened ${opened.length}`));
    const drawn = (P.codex?.clicks ?? []).filter((c) => isStr(c.web));
    const right = drawn.filter((c) => (c.opened ?? []).length === 1 && c.opened[0] === c.web);
    out.push(row('f', 'f.parent-codex-address-opens', drawn.length > 0 ? right.length === drawn.length : null, `the parent's clicks on ${drawn.length} of Codex's drawn addresses opened that address ${right.length} times`));
    const hp = P.hostile ?? [];
    out.push(row('f', 'f.parent-hostile-nothing', true, `the parent's clicks on ${hp.length} hostile targets opened ${hp.filter((x) => (x.opened ?? []).length > 0).length}`, true));
  }
  if (H === null) {
    out.push(row('f', 'f.head-registered', null, 'HEAD was not read'));
    return out;
  }
  for (const agent of ['claude', 'codex']) {
    const A = H[agent];
    // every clicked link word whose sent target xterm would offer must find that link on its cell
    const want = (A?.clicks ?? []).filter((c) => isStr(c.sent) && xtermOffers(c.sent));
    const missing = want.filter((c) => !isStr(c.target));
    out.push(row('f', `f.head-registered.${agent}`, A === undefined || A === null ? null : (A.registered ?? []).length > 0 && want.length > 0 && missing.length === 0, A === undefined || A === null ? `HEAD's ${agent} links were not read` : `HEAD's terminal held ${(A.registered ?? []).length} links of ${agent}'s; ${want.length} clicked words were sent with an http or https target${missing.length === 0 ? ', and xterm offered every one on its cell' : `, and ${missing.length} had none on their cell: ${J(missing.map((c) => c.words))}`}`));
    const clicks = A?.clicks ?? [];
    const wrongOpen = [];
    const wrongHover = [];
    for (const c of clicks) {
      const v = clickVerdict(c, 'head');
      if (!v.openOk) wrongOpen.push({ words: c.words, expected: v.expected, opened: v.opened });
      if (!v.hoverOk) wrongHover.push({ words: c.words, want: v.hoverWant, hover: c.hover ?? null });
    }
    out.push(row('f', `f.head-click.${agent}`, clicks.length > 0 ? wrongOpen.length === 0 : null, clicks.length === 0 ? `no click on ${agent}'s links was read` : wrongOpen.length === 0 ? `every one of ${clicks.length} clicks on ${agent}'s links opened exactly D14's address (${clicks.filter((c) => (c.opened ?? []).length > 0).length} opened something)` : `${wrongOpen.length} of ${clicks.length} clicks opened the wrong thing: ${J(wrongOpen.slice(0, 3))}`));
    out.push(row('f', `f.head-hover.${agent}`, clicks.length > 0 ? wrongHover.length === 0 : null, clicks.length === 0 ? `no hover over ${agent}'s links was read` : wrongHover.length === 0 ? `every hover over ${agent}'s links showed the address a click opens, its host in ASCII` : `${wrongHover.length} hovers were wrong: ${J(wrongHover.slice(0, 3))}`));
  }
  const hostile = H.hostile ?? [];
  const bad = [];
  // Probe review (2026-11-16): a click that reached no link reads exactly as one the handler refused (it
  // opens nothing and shows no hover), and so did a target whose words were never drawn; the parent, which
  // holds no link at all, passed this clause in HEAD's seat. Every target xterm itself offers (an http or
  // https one, the scheme read from what was SENT) must be found on its clicked cell, or that target was
  // not read. Its presence is asked, never its spelling: the `backslash` target reached xterm with its
  // backslashes doubled (22 bytes sent, 25 held, in the probe builder's HEAD run of 13:20), and xterm
  // offers what it holds.
  const unread = [];
  let openedN = 0;
  for (const x of hostile) {
    if (x.notDrawn === true) {
      unread.push(`${String(x.key)}: its words were not drawn`);
      continue;
    }
    const sent = isStr(x.sent) ? x.sent.replace(/…$/, '') : null;
    if (sent === null) {
      unread.push(`${String(x.key)}: what was sent was not recorded`);
      continue;
    }
    if (xtermOffers(sent) && !isStr(x.target)) {
      unread.push(`${String(x.key)}: the click found no link on its cell`);
      continue;
    }
    const v = clickVerdict({ ...x, web: null }, 'head');
    const opened = v.opened;
    if (opened.length > 0) openedN += 1;
    // either reading of the spec, for the targets it words two ways: exactly the target with its ASCII hover, or nothing at all
    const either =
      HOSTILE_EITHER.includes(x.key) &&
      ((opened.length === 0 && (x.hover ?? null) === null) || (isStr(x.target) && opened.length === 1 && (opened[0] === x.target || opened[0] === hoverExpected(x.target)) && (x.hover ?? null) === hoverExpected(x.target)));
    if (!either && (!v.openOk || !v.hoverOk)) bad.push({ key: x.key, expected: v.expected === null ? null : v.expected.slice(0, 80), opened: opened.map((u) => u.slice(0, 80)), hoverWant: v.hoverWant === null ? null : v.hoverWant.slice(0, 80), hover: x.hover === null || x.hover === undefined ? null : String(x.hover).slice(0, 80) });
  }
  const hostileOk = hostile.length === 0 ? null : bad.length > 0 ? false : unread.length > 0 ? null : true;
  const graded = hostile.length - unread.length;
  out.push(row('f', 'f.head-hostile', hostileOk, hostile.length === 0 ? 'no hostile target was read' : bad.length > 0 ? `${bad.length} hostile targets did not: ${J(bad)}${unread.length > 0 ? `; and ${unread.length} were not read: ${unread.join('; ')}` : ''}` : unread.length > 0 ? `${unread.length} of ${hostile.length} hostile targets were not read, so a refusal there cannot be told from a click that reached nothing: ${unread.join('; ')}` : `every one of ${graded} hostile targets did what D14 and D16 allow: ${graded - openedN} opened nothing, ${openedN} (${hostile.filter((x) => (x.opened ?? []).length > 0).map((x) => x.key).join(', ') || 'none'}) opened their target, as written or as new URL writes it, with the hover showing new URL(target).href; every target xterm offers was found on its clicked cell`));
  out.push(...gradeFixRows(P?.rows ?? null, H.rows ?? null));
  return out;
}

/**
 * The fix round's two clauses (both lenses, 2026-11-16).
 *
 * f.head-pathword: a project file's name an agent linked to a web page opens THE FILE in Tortie and hands main
 * no address, as the parent's click on the same words did (D14 rule 0). Read by main's openExternal recorder
 * and the editor's own tab strip, before and after the click.
 *
 * f.head-cut: a cut-looking link whose target is not what its rows draw opens the first row's words from its
 * first row and nothing from its second, never the target's other host; an honest cut opens its whole target
 * from both rows. Each click is graded against D14 as derived here (`linkExpected`) and its hover against D16.
 */
function gradeFixRows(P, H) {
  const out = [];
  const opensFile = (c) =>
    c !== null &&
    c !== undefined &&
    (c.opened ?? []).length === 0 &&
    (c.openedAnyTime ?? []).length === 0 &&
    isStr(c.tabsAfter) &&
    c.tabsAfter.includes(PATH_WORD.words) &&
    !(isStr(c.tabsBefore) && c.tabsBefore.includes(PATH_WORD.words));
  const pp = P?.pathword ?? null;
  const hp = H?.pathword ?? null;
  if (pp === null || hp === null) out.push(row('f', 'f.head-pathword', null, `the click on a project file's linked name was not read at ${pp === null ? 'the parent' : ''}${pp === null && hp === null ? ' and ' : ''}${hp === null ? 'HEAD' : ''}`));
  else if (!opensFile(pp)) out.push(row('f', 'f.head-pathword', null, `the parent's click on ${PATH_WORD.words} did not open the file (opened ${J(pp.opened ?? [])}, tabs ${J(pp.tabsBefore ?? null)} then ${J(pp.tabsAfter ?? null)}), so there is nothing to compare HEAD with`));
  else {
    const ok = opensFile(hp) && (hp.hover ?? null) === null;
    out.push(row('f', 'f.head-pathword', ok, ok ? `HEAD's click on ${PATH_WORD.words}, linked to ${PATH_WORD.target}, opened the file in the editor and handed main no address, as the parent's did, and drew no hover line` : `HEAD's click on ${PATH_WORD.words} handed main ${J(hp.opened ?? [])}, tabs ${J(hp.tabsBefore ?? null)} then ${J(hp.tabsAfter ?? null)}, hover ${J(hp.hover ?? null)}; the parent opened the file`));
  }
  const cut = H?.cut ?? null;
  if (cut === null) {
    out.push(row('f', 'f.head-cut', null, "HEAD's cut-looking links were not read"));
  } else {
    const wrong = [];
    const unread = [];
    for (const r of CUT_ROWS) {
      for (const part of ['first', 'second']) {
        const c = cut[r.key]?.[part] ?? null;
        if (c === null || !isStr(c.target)) {
          unread.push(`${r.key} ${part}: ${c === null ? 'not clicked' : 'no link on its cell'}`);
          continue;
        }
        const v = clickVerdict(c, 'head');
        const other = r.host !== null && (v.opened ?? []).some((u) => String(u).includes(r.host));
        if (!v.openOk || !v.hoverOk || other) wrong.push({ row: `${r.key} ${part}`, expected: v.expected, opened: v.opened, hoverWant: v.hoverWant, hover: c.hover ?? null });
      }
    }
    out.push(row('f', 'f.head-cut', wrong.length > 0 ? false : unread.length > 0 ? null : true, wrong.length > 0 ? `${wrong.length} clicks on cut-looking links did not do what D14 and D16 say: ${J(wrong)}` : unread.length > 0 ? `not read: ${unread.join('; ')}` : `the cut-looking link opened its first row's words and nothing from its second row, never ${CUT_ROWS[0].host}, and the honest cut opened its whole target from both rows, each hover saying what its click opened`));
  }
  if (P?.cut) {
    const said = CUT_ROWS.map((r) => `${r.key}: ${J((P.cut[r.key]?.first?.opened ?? []).concat(['|'], P.cut[r.key]?.second?.opened ?? []))}`).join('; ');
    out.push(row('f', 'f.parent-cut', true, `the parent opened, first row | second row: ${said}`, true));
  }
  return out;
}

export function gradeRun(run) {
  const out = [];
  if (run === undefined || run === null) return [row('RUN', 'RUN.read', null, 'the run was not read')];
  const hb = run.history?.before ?? null;
  const ha = run.history?.after ?? null;
  out.push(row('RUN', 'RUN.history', hb === null || ha === null ? null : J(hb) === J(ha), hb === null || ha === null ? 'the history stats were not read' : J(hb) === J(ha) ? `his shell history unmoved: ${J(ha)}` : `his shell history MOVED during the run: ${J(hb)} -> ${J(ha)}. Start nothing for three minutes and stat it again`));
  const added = run.reports?.added ?? null;
  // Probe review (2026-11-16): the run also starts /bin/sh (the login shell, the hook script) and perl
  // (the hook's stamp), whose reports were read as someone else's.
  const ours = (added ?? []).filter((n) => /Electron|Tortie|tmux|node|perl/i.test(n) || /^(?:Retired\/)?\.?sh-/.test(n));
  out.push(row('RUN', 'RUN.reports', added === null ? null : ours.length === 0, added === null ? 'the reports folder was not read' : added.length === 0 ? 'no crash report was added' : `${added.length} crash reports were added during the run (names only): ${J(added)}`));
  const live = run.sockets?.live ?? null;
  out.push(row('RUN', 'RUN.sockets', live === null ? null : live.length === 0, live === null ? 'the sockets were not read' : live.length === 0 ? `no gmux-p368 server answers (${(run.sockets?.files ?? []).length} socket files seen)` : `servers still answer on ${J(live)}`));
  const launches = run.launches ?? [];
  // The fix round (Lens A's nit): a census whose `tmux` could not even be run (no tmux on this process's
  // PATH, ENOENT) read nothing of his server; that is a reading that did not arrive, never a finding.
  const unrunnable = (l) => /tmux could not be run/.test(String(l.census));
  const failed = launches.filter((l) => String(l.census).startsWith('failed') && !unrunnable(l));
  const unknown = launches.filter((l) => l.census !== 'passed' && (!String(l.census).startsWith('failed') || unrunnable(l)));
  out.push(row('RUN', 'RUN.census', launches.length === 0 ? null : failed.length > 0 ? false : unknown.length > 0 ? null : true, launches.length === 0 ? 'no launch was made' : failed.length > 0 ? `the census failed around ${J(failed.map((l) => `${l.build} ${l.kind}: ${l.census}`))}` : unknown.length > 0 ? `the census could not be read around ${J(unknown.map((l) => `${l.build} ${l.kind}: ${l.census}`))}` : `the helper's census of his sessions passed around all ${launches.length} launches`));
  const left = run.leftovers ?? null;
  out.push(row('RUN', 'RUN.leftovers', left === null ? null : left.length === 0, left === null ? 'the process table was not read' : left.length === 0 ? 'no process names a profile of this run' : `processes still name this run's profiles: ${J(left)}`));
  return out;
}

export const GRADERS = Object.freeze({ a: gradeA, b: gradeB, c: gradeC, d: gradeD, e: gradeE, f: gradeF });

/** Every row for the arms read, then RUN's. */
export function gradeAll(readings, arms = ARMS) {
  const rows = [];
  for (const arm of arms) rows.push(...GRADERS[arm](readings?.parent?.[arm], readings?.head?.[arm]));
  rows.push(...gradeRun(readings?.run));
  return rows;
}

/** 0 when every graded row is true, 1 on a false one, 2 when one could not be decided. */
export function exitCodeOf(rows) {
  const graded = rows.filter((r) => !r.info);
  if (graded.some((r) => r.ok === false)) return 1;
  if (graded.some((r) => r.ok !== true)) return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// The fixtures' redaction rules (SPEC §8): no /Users/, no address at a domain
// that is not the reply's own example domain, no plan word beside a model or
// product name, under the budget.
// ---------------------------------------------------------------------------

const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;
const EXAMPLE_DOMAIN = /(?:^|\.)example\.(?:com|org|net)$/;
const PLAN_WORD = /(?:Claude|Opus|Sonnet|Haiku|GPT[-\w.]*)[^\n]{0,40}?(Ultra|Max|Pro)(?![A-Za-z])/;

/** The decoded text of a fixture, for the rules. */
export function fixtureText(fixture) {
  return Buffer.concat((fixture?.chunks ?? []).map((c) => Buffer.from(String(c.b), 'base64'))).toString('utf8');
}

/**
 * The text a terminal shows for those bytes, near enough for the rules: every escape sequence removed and a
 * cursor jump read as a space. Probe review (2026-11-16): the rules read the raw bytes alone, so a style
 * change inside a word (`/Use` ESC[0m `rs/`, `someone@` ESC[1m `mail.example`), or more than 40 bytes of
 * them between a model's name and a plan word, hid it; the rules now read both.
 */
export const shownText = (raw) =>
  String(raw)
    .replace(/\x1b\[\d*[GC]/g, ' ')
    .replace(/\x1b\[[0-9;?<>=]*[ -/]*[@-~]/g, '')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b[()][0-9A-Za-z]/g, '')
    .replace(/\x1b./g, '');

/** Every rule a fixture breaks, as sentences; [] when it is clean. */
export function fixtureProblems(fixture, name = fixture?.name ?? '?') {
  const problems = [];
  if (!Array.isArray(fixture?.chunks) || fixture.chunks.length === 0) return [`${name}: no chunks`];
  if (!isStr(fixture.source) || fixture.source.length < 20) problems.push(`${name}: no source`);
  if (!Array.isArray(fixture.redactions)) problems.push(`${name}: the redactions are not listed`);
  if (!(Number(fixture.size?.cols) > 0 && Number(fixture.size?.rows) > 0)) problems.push(`${name}: no size`);
  let last = -Infinity;
  for (const c of fixture.chunks) {
    if (!(Number.isFinite(Number(c.t)) && Number(c.t) >= last)) {
      problems.push(`${name}: chunk times do not rise`);
      break;
    }
    last = Number(c.t);
  }
  const raw = fixtureText(fixture);
  const found = new Set();
  for (const text of [raw, shownText(raw)]) {
    if (text.includes('/Users/')) found.add(`${name}: holds /Users/`);
    for (const m of text.matchAll(EMAIL)) if (!EXAMPLE_DOMAIN.test(m[1])) found.add(`${name}: holds an address at ${m[1]}`);
    const plan = PLAN_WORD.exec(text);
    if (plan) found.add(`${name}: holds the plan word ${plan[1]} beside the model name`);
    for (const word of ['tortie-wt', 'r145/']) if (text.includes(word)) found.add(`${name}: holds the recording machine's scratch path (${word})`);
  }
  problems.push(...found);
  return problems;
}

// ---------------------------------------------------------------------------
// The self-test: recorded readings, whole and broken one clause at a time.
// ---------------------------------------------------------------------------

/** Set `value` at a dotted path such as `head.returns.0.pane` (or a list of keys, for a key holding a dot), in place. */
export function setAt(obj, path, value) {
  const keys = Array.isArray(path) ? path.map(String) : path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const k = /^\d+$/.test(keys[i]) ? Number(keys[i]) : keys[i];
    if (o[k] === undefined || o[k] === null) o[k] = {};
    o = o[k];
  }
  const k = keys.at(-1);
  o[/^\d+$/.test(k) ? Number(k) : k] = value;
}

const clone = (v) => JSON.parse(JSON.stringify(v));

/**
 * `cases` are the grader fixtures, each `{ arm, parent, head, breaks }` (or
 * `{ arm: 'RUN', run, breaks }`), and `fixtures` the recordings, each
 * `{ name, fixture, bytes }`. Answers `{ ok, said: string[] }`.
 */
export function selfTest(cases, fixtures, widths = null) {
  const said = [];
  let ok = true;
  const fail = (s) => {
    ok = false;
    said.push(`FAIL ${s}`);
  };
  const grade = (c) => (c.arm === 'RUN' ? gradeRun(c.run) : GRADERS[c.arm](c.parent, c.head));
  let breaks = 0;
  for (const c of cases) {
    const whole = grade(c);
    const notTrue = whole.filter((r) => !r.info && r.ok !== true);
    if (notTrue.length > 0) fail(`${c.arm}: the whole reading grades ${notTrue.map((r) => `${r.clause}=${String(r.ok)}`).join(', ')} (every graded clause must be true): ${notTrue.map((r) => r.said).join(' | ')}`);
    const clauses = new Set(whole.filter((r) => !r.info).map((r) => r.clause));
    for (const b of c.breaks ?? []) {
      breaks += 1;
      const broken = clone(c);
      for (const [path, value] of b.set) setAt(broken, path, value);
      const rows = grade(broken);
      const target = rows.find((r) => r.clause === b.clause);
      const want = b.expect === undefined ? false : b.expect;
      if (!clauses.has(b.clause)) fail(`${c.arm}: break "${b.why}" names ${b.clause}, which the whole reading does not grade`);
      else if (target === undefined || target.ok !== want) fail(`${c.arm}: break "${b.why}" left ${b.clause} at ${String(target?.ok)} (wanted ${String(want)})`);
      const others = rows.filter((r) => !r.info && r.clause !== b.clause && (b.alsoRed ?? []).indexOf(r.clause) === -1 && r.ok !== true);
      if (others.length > 0) fail(`${c.arm}: break "${b.why}" also moved ${others.map((r) => `${r.clause}=${String(r.ok)}`).join(', ')}`);
    }
    const also = (c.breaks ?? []).filter((b) => (b.alsoRed ?? []).length > 0).length;
    said.push(`${c.arm}: ${whole.filter((r) => !r.info).length} graded clauses true on the whole reading, ${(c.breaks ?? []).length} breaks each turning its own clause${also > 0 ? ` (${also} also turning a clause it names)` : ''}`);
  }
  // Every graded clause, by family, must be broken by at least one break somewhere: the census's
  // ordinary rows share one rule, so one of them broken proves it.
  const family = (cl) => (/^c\./.test(cl) && !/^c\.(window-drag|split|font-first-mount|read|server-read)$/.test(cl) ? 'c.<an ordinary census row>' : cl);
  const graded = new Set();
  for (const c of cases) for (const r of grade(c)) if (!r.info) graded.add(family(r.clause));
  const brokenClauses = new Set(cases.flatMap((c) => (c.breaks ?? []).map((b) => family(b.clause))));
  const never = [...graded].filter((cl) => !brokenClauses.has(cl));
  if (never.length > 0) fail(`clauses no break turns red: ${never.join(', ')}`);
  // The recordings: present, clean, under the budget; and the rules can say no.
  let total = 0;
  const names = new Set();
  for (const f of fixtures) {
    total += f.bytes;
    names.add(f.name);
    const problems = fixtureProblems(f.fixture, f.name);
    if (problems.length > 0) fail(`fixture ${f.name}: ${problems.join('; ')}`);
  }
  for (const n of FIXTURE_NAMES) if (!names.has(n)) fail(`fixture ${n} is missing from build/fixtures/p368/`);
  if (total > FIXTURE_BUDGET_BYTES) fail(`the fixtures hold ${total} bytes, over ${FIXTURE_BUDGET_BYTES}`);
  said.push(`fixtures: ${fixtures.length} recordings, ${total} bytes of ${FIXTURE_BUDGET_BYTES}`);
  if (fixtures.length > 0) {
    const base = fixtures[0].fixture;
    const plant = (text) => ({ ...clone(base), chunks: [...base.chunks, { t: 1e9, b: Buffer.from(text).toString('base64') }] });
    const plants = [
      ['/Users/', plant(' /Users/someone/project ')],
      ['an address at a real domain', plant(' someone@mail.invalid.net ')],
      ['a plan word beside the model', plant(' Opus 5.5 · Claude\x1b[46GMax ')],
      ['the scratch path', plant(' /private/var/tmp/tortie-wt/scratch/r145/x ')],
      ['times that fall', { ...clone(base), chunks: [...base.chunks, { t: -1, b: '' }] }],
      // Probe review (2026-11-16): the same three, each with a style change inside it.
      ['/Users/ split by a style reset', plant(' /Use\x1b[0mrs/someone/project ')],
      ['an address at a real domain split by bold', plant(' someone@\x1b[1mmail.invalid.net ')],
      ['a plan word past 40 bytes of escapes after the model', plant(' Opus 5.5 · Claude\x1b[38;2;153;153;153m\x1b[1m\x1b[3m\x1b[4m\x1b[22m\x1b[23mMax ')]
    ];
    for (const [what, f] of plants) if (fixtureProblems(f, 'planted').length === 0) fail(`the redaction rule passed a fixture holding ${what}`);
    said.push(`fixture rules: ${plants.length} planted breaks each refused`);
  }
  // D14 from the spec's own cases (research 145 §5.5) and the fix round's, so the reference itself is proved.
  const spoof = 'https://good.example.co.evil.io/x';
  const honest = 'https://example.com/cut/honest/rest-of-path/end';
  const firstRow = (address) => [{ row: `${' '.repeat(120 - address.length)}${address}`, webs: [{ address, atEdge: true, endsOnRow: true }] }];
  const d14 = [
    ['words that are another address open the words', { target: 'https://example.com/really-elsewhere', web: 'https://example.org/looks-safe', next: '' }, 'https://example.org/looks-safe'],
    ['a URL the agent cut opens the whole target', { target: 'https://example.net/aaaa/bbbb/end', web: 'https://example.net/aaaa/bb', webAtEdge: true, cols: 120, next: '      bb/end' }, 'https://example.net/aaaa/bbbb/end'],
    ['words that only start the target are not a cut', { target: 'https://example.net/aaaa/bbbb/end', web: 'https://example.net/aaaa/bb', webAtEdge: true, cols: 120, next: 'unrelated' }, 'https://example.net/aaaa/bb'],
    ['the fix round: eight matching characters are not a cut', { target: spoof, web: 'https://good.ex', webAtEdge: true, cols: 120, next: 'ample.com/login' }, 'https://good.ex'],
    ['the fix round: words that stop short of the edge are not a cut', { target: 'https://example.net/aaaa/bbbb/end', web: 'https://example.net/aaaa/bb', webAtEdge: false, cols: 120, next: 'bbbb/end' }, 'https://example.net/aaaa/bb'],
    ['the fix round: closing punctuation after the last piece is still the cut', { target: honest, web: 'https://example.com/cut/honest/', webAtEdge: true, cols: 120, next: 'rest-of-path/end).' }, honest],
    ['the fix round: a later row of a cut-looking link that is not a cut opens nothing', { target: spoof, web: null, cols: 120, rowsFrom: ['ample.com/login'], before: firstRow('https://good.ex') }, null],
    ['the fix round: a later row of an honest cut opens the whole target', { target: honest, web: null, cols: 120, rowsFrom: ['rest-of-path/end'], before: firstRow('https://example.com/cut/honest/') }, honest],
    ['the fix round: a link whose rows above are no cut is any other link', { target: honest, web: null, cols: 120, rowsFrom: ['click here'], before: [{ row: 'just words', webs: [] }] }, honest],
    ['Foo_(bar) opens exactly', { target: 'https://en.wikipedia.org/wiki/Foo_(bar)', web: null }, 'https://en.wikipedia.org/wiki/Foo_(bar)'],
    ['a user part is refused', { target: 'https://www.google.com@evil.example/', web: null }, null],
    ['3,000 bytes are refused', { target: `https://example.com/${'x'.repeat(2980)}`, web: null }, null],
    ['2,048 bytes are offered', { target: `https://example.com/${'x'.repeat(2048 - 20)}`, web: null }, `https://example.com/${'x'.repeat(2048 - 20)}`],
    ['javascript: is refused', { target: 'javascript:alert(1)', web: null }, null],
    ['data: is refused', { target: 'data:text/html,hi', web: null }, null],
    ['file: is refused', { target: 'file:///etc/hosts', web: null }, null],
    ['vscode: is refused', { target: 'vscode://file/x', web: null }, null],
    ['no target and no words opens nothing', { target: null, web: null }, null]
  ];
  for (const [why, input, want] of d14) {
    const got = linkExpected(input);
    if (got !== want) fail(`D14 reference: ${why}: got ${J(got)}`);
  }
  if (hoverExpected('https://аpple.com/') !== 'https://xn--pple-43d.com/') fail('D16 reference: a look-alike host is not shown in ASCII');
  if (!hoverExpected('https://example.com/‮gpj.exe').includes('%E2%80%AE')) fail('D16 reference: a right-to-left override is not percent-encoded');
  said.push(`D14 reference: ${d14.length} cases; D16 reference: 2 cases`);
  // letterInGap on research 145's own rows
  const gaps = [
    [['6. 📝oJot downrtrail notns:twhat worked', '6. 📝 Jot down trail notes: what worked'], true],
    [['…keep a plastic bag in the daypack soo', '…keep a plastic bag in the daypack so'], false],
    [['✅ abc def', '✅  abc def'], false],
    [['same row', 'same row'], false]
  ];
  for (const [[a, b], want] of gaps) if (letterInGap(a, b) !== want) fail(`letterInGap(${J(a)}, ${J(b)}) is not ${want}`);
  said.push(`letterInGap: ${gaps.length} cases`);
  // The fix round: arm d's cells, over the committed widths, from the seven rules' own words.
  if (widths?.builds?.['3.7b']?.ranges !== undefined) {
    const w37 = widthTable(widths.builds['3.7b'].ranges);
    const cells = [
      ['an emoji two wide', '✅ ab', 6, ['✅', '', ' ', 'a', 'b', ' ']],
      ['VS16 widens the cell before it', '⚠️x', 4, ['⚠️', '', 'x', ' ']],
      ['a skin tone joins a base of emoji presentation', '\u{1f44d}\u{1f3fd}z', 4, ['\u{1f44d}\u{1f3fd}', '', 'z', ' ']],
      ['a regional-indicator pair is one cell of 2', '\u{1f1ef}\u{1f1f5}!', 4, ['\u{1f1ef}\u{1f1f5}', '', '!', ' ']],
      ['a zero-width mark joins the cell before it', 'áb', 3, ['á', 'b', ' ']],
      ['a ZWJ joins the next code point', '\u{1f468}‍\u{1f4bb}.', 4, ['\u{1f468}‍\u{1f4bb}', '', '.', ' ']],
      ['a tab moves to the next stop of 8', 'x\ty', 10, ['x', ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'y', ' ']],
      ['a zero-width code point with no cell before it is dropped', '️q', 2, ['q', ' ']]
    ];
    for (const [why, text, cols, want] of cells) {
      const got = tmuxColumns(text, w37, cols);
      if (J(got) !== J(want)) fail(`tmuxColumns: ${why}: got ${J(got)}`);
    }
    // A row the terminal drew one column off reads different by cells and equal by text.
    const shifted = [['✅', 'a', 'b', ' ', ' ', ' ']];
    if (cellDiffs(shifted, ['✅ab'], w37, 6).length !== 1) fail('cellDiffs: a row drawn one column off read equal');
    if (cellDiffs([['✅', '', 'a', 'b', ' ', ' ']], ['✅ab'], w37, 6).length !== 0) fail('cellDiffs: a row drawn where tmux draws it read different');
    said.push(`tmuxColumns: ${cells.length} cases; cellDiffs: 2 cases`);
  } else fail('the widths fixture was not handed to the self-test, so arm d\'s cells were not proved');
  said.unshift(`${ok ? 'PASS' : 'FAIL'}: ${cases.length} recorded readings, ${breaks} breaks`);
  return { ok, said };
}
