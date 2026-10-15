/**
 * A PATH IN A TRANSCRIPT OPENS WHERE IT BELONGS (Phase 247).
 *
 * One xterm link provider, registered AFTER `WebLinksAddon` in
 * ./TerminalPane.tsx. It underlines a path an agent printed, and a click on it
 * opens the file: prose and code in the editor, a picture in Tortie's own
 * image surface, and the one kind Tortie cannot draw goes to the Mac.
 *
 * ## What it never does
 *
 * NOTHING IS DECORATED ON THE RESTING FACE. xterm's providers are hover
 * driven — `Linkifier._askForLink` fires from `_handleMouseMove`, only when
 * the buffer cell under the pointer changes — so a pane nobody is pointing at
 * draws nothing and asks nothing (research 107 refusal 4). That is also what
 * stops a screen full of `cd` targets reading as hyperlink soup.
 *
 * A PANE WHOSE SESSION RUNS ON ANOTHER MACHINE OFFERS NO PATH LINKS AT ALL
 * (refusal 5). Both homes are `/Users/gdc`, `lstat` here will happily confirm
 * a file with the same name in the same place, and it is a different file. It
 * cannot be told from a local one by looking at the text, at any length, ever
 * — but it can be told from the SESSION, and the pane already knows. The rule
 * is in the PROVIDER and not at the click, because Phase 235 counted what a
 * per-call-site rule costs: `fs:reveal` is ungated in main, its remote rule
 * lives at every call site, and that shape needed six doors and three rounds
 * inside one phase to hold. Here it is one closure, read per hover so a
 * session that moves is answered as it is now rather than as it was when the
 * pane mounted.
 *
 * A HOVER NEVER WRITES and never reads a file's bytes: the ask is
 * `drop:prepare` with `{ classify: true }`, which is metadata only.
 *
 * A LINK THAT DOES NOTHING IS WORSE THAN NO LINK, so a path no door accepts is
 * never underlined at all rather than underlined and then refused.
 *
 * ## What this provider hands refusal 8 (Phase 250)
 *
 * The rule itself is in `@shared/path-spans`; the facts it decides from are
 * gathered here, and getting any of the three wrong is invisible to a pure
 * test. THE WIDTH IS `Terminal.cols` and never the row's own length, because
 * `IBufferLine.length` may exceed the width after a resize. BOTH ROWS ARE READ
 * AS DRAWN, `translateToString(true)`, because 32.2% of the operator's rows
 * carry trailing whitespace out to the pane width while their content stops
 * short, and a padded predecessor did not wrap. AND THE ROW ABOVE CARRIES ITS
 * OWN COLUMN MAP, because its drawn end is a column and not a string index,
 * for the same reason `cellColumns` exists at all.
 *
 * ## The cache, and what its keys really are
 *
 * `lstat` lives in main, so the answer is an IPC round trip, and a pointer
 * crossing one row asks about every cell in it. So the round trip happens once
 * per distinct SPELLING and not once per cell. Entries expire, because a file
 * an agent deleted must stop being underlined, and the CLICK asks again anyway
 * — the cached answer decides only whether to draw a line under something.
 *
 * **THE KEY POPULATION IS THE SPAN SET AND NOT THE DOOR SET, and the version
 * of this comment that sized it from "72 distinct files behind 200 spans" was
 * sizing it from the wrong number.** Those 72 are the paths that reach a DOOR.
 * Every span the grammar yields is asked about and cached. Re-derived over the
 * operator's own 25 live panes and 56,977 rows, read only, through the
 * SHIPPING `pathSpansInRow`: **7,172 spans over 1,552 distinct targets, of
 * which 1,144 — 74% — are relative**, and the busiest single pane held 460
 * distinct targets.
 *
 * **PHASE 250 PUT THAT RELATIVE THREE QUARTERS BACK INTO THE POPULATION.**
 * Until it, `couldBeAbsolute` refused every one of them here before a round
 * trip was made, because main was always going to answer `not-absolute`. With
 * a base main can answer a door, so the cheap refusal narrowed to
 * `couldBeAsked` — a relative spelling on a pane with no usable base, and
 * nothing else. Two things follow. The key carries the BASE for a relative
 * spelling, because the same spelling under two bases is two different files,
 * and an absolute spelling is keyed by itself so Phase 247's entries are keyed
 * exactly as they were. And the ceiling moved to 2,048: research 114's whole
 * corpus of 29 panes and 7,359 spans holds 1,811 distinct spellings, so a pane
 * fits inside it several times over, and it still evicts oldest-first when it
 * does not, which costs a round trip and never an answer.
 *
 * ## The base, and what it is right about (Phase 250)
 *
 * `repoPath()` is the pane's own `projectPath`. Research 114 found the three
 * candidate bases — that, tmux's `#{pane_current_path}`, and the directory the
 * agent was launched in — **the same string on 29 of 29 panes**, so there was
 * nothing to arbitrate and this one was already in hand. Against an oracle
 * inside his own transcripts it is right on 84.6% of the spans that can be
 * checked, it draws NO LINK on three quarters of the ones it is wrong about,
 * and of the links it does draw **39 of 41 open the file the text names**. The
 * two that do not are one shape, and it is written down in
 * `src/main/fs/path-door.ts` beside the join rather than left to be found.
 *
 * ## Which SPELLING the click opens at (Phase 274)
 *
 * The door sequence decides about the REALPATH, which is what keeps it honest
 * about a symlink whose leaf is something else. But the realpath is not always
 * what the file is called from this pane: a project spelled `~/source/proj`
 * while the disk says `~/Source/proj` is one folder on a case-insensitive
 * volume, and `/tmp` against `/private/tmp` is the same shape through a link.
 * Opening the realpath handed the editor a tab whose path shared no prefix
 * with its own project, so `fileInRepo` said false and ⌘S took the plain door
 * instead of the compare-and-swap one — measured at `30f4bd8d`. So the click
 * opens `underBase`, main's re-spelling of the same file under the base this
 * pane asked with, and falls back to `path` when there is none. Nothing about
 * the DECISION moved, and nothing here compares or folds two spellings.
 *
 * ## A path broken over rows (Phase 347, issue 40)
 *
 * Beside the hovered row's own spans, `provideLinks` asks `joinedPathAt`
 * (`@shared/path-spans`, whose header holds the rule and its proof) for the
 * ONE path the drawn rows around it may break, read from the same drawn
 * rows, the same column maps and the same `Terminal.cols`, never from
 * `isWrapped`. `linksFor` asks the door about the joined target in the same
 * `Promise.all`, through the same `doorFor` and cache, and only when the door
 * ACCEPTS it does the join become one link from its first cell to its last,
 * so pointing at any of its rows underlines all of them and a click opens the
 * whole path at its line. A row span sharing a cell with that link is not
 * returned, because a fragment never opens in place of the whole path. When
 * the door refuses the join, the row's spans are exactly what they were
 * before the phase. A join is offered only when the joined path starts with
 * `/` or `~/` (`@shared/path-spans`' J10, his ruling of 2026-10-14), so a
 * relative path broken over rows stays plain from every row, as before.
 *
 * AND THE JOIN YIELDS TO ANY ROW SPAN THE DOOR ACCEPTS, ON ANY ROW IT COVERS
 * (Phase 347.1, the governing rule; `@shared/path-spans`' header says why it
 * is a construction rather than a shape). The ONE reader that hands
 * `joinedPathAt` its drawn rows hands the same rows to `spansUnderJoin`,
 * synchronously and before any await, and that answers every span each row
 * of the join draws today that shares a cell with it. Their targets ride the
 * join's own `Promise.all` through the same `doorFor` and cache, and the join
 * is offered only when the door refuses every one of them: one accepted, or
 * one missing answer, and every row reads exactly as it did, and a row of the
 * join that cannot be read refuses it too. So the join only ever takes cells
 * that had no link, and a link that opens today never moves. Where a row's
 * own piece is a file Tortie opens, that row opens it and the whole path is
 * offered from no row, as before the phase.
 */

import type { ILink, ILinkProvider, Terminal } from '@xterm/xterm';
import type { DropPreparedItem } from '@shared/types';
import type { PathDoorAnswer } from '@shared/path-doors';
import { couldBeAbsolute, couldBeAsked } from '@shared/path-doors';
import type {
  DrawnRow,
  JoinedSpan,
  PathSpan,
  SpanUnderJoin
} from '@shared/path-spans';
import {
  cellColumns,
  joinedPathAt,
  pathSpansInRow,
  sharesCellWithJoin,
  spanColumns,
  spansUnderJoin
} from '@shared/path-spans';
import { gmuxBridge } from '../bridge';
import { useApp } from '../state/store';

/** How long a hover answer is kept before the path is asked about again. */
const CACHE_MS = 30_000;

/**
 * A ceiling on the map, so a very long session cannot grow it without bound.
 *
 * PHASE 250 RAISED IT FROM 512, because lift two put the relative three
 * quarters back into the population. Until then a relative spelling was
 * refused before the cache and never took a slot; now every one of them is a
 * key. The whole of research 114's corpus — 29 live panes, 59,791 rows, 7,359
 * spans — holds **1,811 distinct spellings**, and the busiest single pane in
 * research 111's capture held 460. So a pane is one Map of a few thousand
 * small entries at its very worst, and the corpus entire fits inside this.
 *
 * PHASE 253 RE-CHECKED IT WITH THE WIDENED GRAMMAR, the way research 114 §7
 * asked: with the grep and tsc suffixes, the bracketed segments and the bare
 * file-shaped names all in the population, the busiest single pane of the
 * operator's 38 live panes held **739 distinct keys** against this 2,048
 * (`build/p253/funnel-before-after.mts`, 91,617 rows). The ceiling stands,
 * and it still evicts oldest-first when a pane outgrows it, which costs a
 * round trip and never an answer.
 */
const CACHE_MAX = 2048;

interface CacheSlot {
  at: number;
  answer: PathDoorAnswer;
}

/** What the provider needs from the pane, all of it read per hover. */
export interface PathLinkDeps {
  /**
   * PHASE 96's own closure, and the same question `attachPaths` asks before it
   * decides a drop must carry bytes rather than a path. Read per hover, never
   * captured: a session's machine is a live fact.
   */
  isLocal(): boolean;
  /**
   * The pane's own project, which the editor takes as the tab's repo AND
   * which PHASE 250 joins a relative spelling to. Read per hover, never
   * captured: a session's project is a live fact.
   */
  repoPath(): string;
  /** Ask main which door a path takes. Metadata only; see the header. */
  classify(paths: string[], base: string): Promise<DropPreparedItem[]>;
  /** Open a path Tortie draws itself. */
  openInTortie(path: string, repoPath: string, line?: number): void;
  /** Hand a path to the Mac, which re-asks every question in main. */
  openOnMac(path: string): Promise<void>;
}

/**
 * The link provider.
 *
 * Exported and constructed from plain dependencies so the whole of it can be
 * driven without an Electron, a pane or a real xterm.
 */
export class PathLinkProvider implements ILinkProvider {
  private readonly cache = new Map<string, CacheSlot>();

  private readonly inFlight = new Map<string, Promise<PathDoorAnswer>>();

  constructor(
    private readonly term: Pick<Terminal, 'buffer' | 'cols'>,
    private readonly deps: PathLinkDeps,
    private readonly now: () => number = Date.now
  ) {}

  provideLinks(
    bufferLineNumber: number,
    callback: (links: ILink[] | undefined) => void
  ): void {
    // REFUSAL 5, and it is the first thing asked so that nothing else runs.
    if (!this.deps.isLocal()) {
      callback(undefined);
      return;
    }
    const buffer = this.term.buffer.active;
    const y = bufferLineNumber - 1;
    const line = buffer.getLine(y);
    if (line === undefined) {
      callback(undefined);
      return;
    }
    const row = line.translateToString(true);
    // A ROW'S STRING INDICES ARE NOT ITS CELL COLUMNS, and xterm underlines
    // and hit-tests in COLUMNS. The map is taken here, synchronously, beside
    // the row it belongs to and before any await. See `cellColumns`.
    const columns = cellColumns(line);
    // PHASE 250. Refusal 8 asks about the pane's LAST COLUMN rather than the
    // row's last glyph, so it needs the width and the row above's own drawn
    // end column. Both rows are read as DRAWN — `translateToString(true)` —
    // because a third of his rows are padded out to the width with spaces,
    // and a padded predecessor did not wrap.
    const lineAbove = y > 0 ? buffer.getLine(y - 1) : undefined;
    const above = lineAbove?.translateToString(true) ?? null;
    const spans = pathSpansInRow(row, {
      width: this.term.cols,
      columns,
      above,
      // A COLUMN THE MAP CANNOT ANSWER IS `null` AND NOT 0 (the fix round).
      // 0 is smaller than any width, so `?? 0` said "the predecessor did not
      // fill its row" about a row nothing could be read from, and the span was
      // offered. `edgeRefusal` refuses on null, which is the direction its
      // other unknown already falls in.
      aboveEnd:
        lineAbove === undefined || above === null
          ? 0
          : (cellColumns(lineAbove)[above.length] ?? null)
    });
    // PHASE 347 (issue 40) and 347.1. ONE reader of drawn rows for the join
    // and for the governing rule: the same rows, their own column maps and
    // the same width; `isWrapped` is never read.
    const drawnRow = (i: number): DrawnRow | null => {
      const drawn = buffer.getLine(i);
      return drawn === undefined
        ? null
        : { text: drawn.translateToString(true), columns: cellColumns(drawn) };
    };
    const candidate = joinedPathAt(drawnRow, y, buffer.length - 1, this.term.cols);
    // PHASE 347.1, THE GOVERNING RULE's facts, read now and before any await:
    // every span a row the candidate covers draws today that shares a cell
    // with it. A row that cannot be read refuses the join.
    const under = candidate === null ? null : spansUnderJoin(drawnRow, candidate, this.term.cols);
    const join = under === null ? null : candidate;
    if (spans.length === 0 && join === null) {
      callback(undefined);
      return;
    }
    void this.linksFor(spans, columns, bufferLineNumber, join, under ?? []).then(callback);
  }

  /**
   * One `ILink` per span whose door is a door, and nothing for the rest.
   *
   * PHASE 347. `join`, when there is one, is asked about in the SAME
   * `Promise.all` through the same `doorFor` and cache, after the row's own
   * spans. Accepted, it is one link from its first cell on `top` to its last
   * on `bottom`, and a row span sharing a cell with it is not returned.
   * Refused, it changes nothing: the row's links are the ones it had before.
   *
   * PHASE 347.1. `under` is every span the join's rows draw today that shares
   * a cell with it (`spansUnderJoin`), asked about in the same `Promise.all`
   * after the join's target. The join is accepted only when the door refuses
   * every one of them, so it never takes a cell from a link that opens today.
   */
  private async linksFor(
    spans: PathSpan[],
    columns: number[],
    y: number,
    join: JoinedSpan | null,
    under: SpanUnderJoin[]
  ): Promise<ILink[] | undefined> {
    // Read ONCE for the whole row and handed down, so every span on one row
    // is judged against one base even if the session's project changes under
    // the await — and the click below reads it again, freshly, for itself.
    const base = this.deps.repoPath();
    const targets = spans.map((s) => s.target);
    const joinAt = targets.length;
    if (join !== null) targets.push(join.target);
    const underAt = targets.length;
    for (const u of under) targets.push(u.target);
    const answers = await Promise.all(
      targets.map((target) => this.doorFor(target, base))
    );
    // J4. The join is offered only when the door accepts the joined target.
    const joinAnswer = join === null ? undefined : answers[joinAt];
    // THE GOVERNING RULE (Phase 347.1). A join never takes a cell from a row
    // span the door already accepts, on any row it covers; an answer that is
    // missing counts as accepted.
    const taken = under.some((_, k) => answers[underAt + k]?.door !== null);
    const accepted =
      join !== null && joinAnswer !== undefined && joinAnswer.door !== null && !taken
        ? join
        : null;
    const links: ILink[] = [];
    if (accepted !== null) {
      links.push({
        range: {
          start: { x: accepted.startColumn + 1, y: accepted.top + 1 },
          end: { x: accepted.endColumn, y: accepted.bottom + 1 }
        },
        text: accepted.text,
        activate: () => {
          void this.open(accepted);
        }
      });
    }
    for (const [at, span] of spans.entries()) {
      const answer = answers[at];
      if (answer === undefined || answer.door === null) continue;
      // xterm's range is 1-based and INCLUSIVE at both ends, and it is in
      // CELL COLUMNS. A span whose columns cannot be read is not drawn.
      const range = spanColumns(span, columns);
      if (range === null) continue;
      // A fragment yields only to a join the door ACCEPTED (D8).
      if (accepted !== null && sharesCellWithJoin(range, y - 1, accepted)) continue;
      links.push({
        range: {
          start: { x: range.start, y },
          end: { x: range.end, y }
        },
        text: span.text,
        activate: () => {
          void this.open(span);
        }
      });
    }
    return links.length > 0 ? links : undefined;
  }

  /**
   * The cached hover answer for one spelling.
   *
   * Two hovers over the same row arrive before the first round trip resolves,
   * so the promise is shared rather than the request repeated.
   */
  /**
   * THE CACHE KEY, and the base is part of it (Phase 250).
   *
   * The same relative spelling under two bases is two different files, so an
   * answer keyed by the spelling alone would hand one pane's project a file
   * from another's. An ABSOLUTE spelling is keyed by itself, so every entry
   * Phase 247 cached is keyed exactly as it was. It is one method because both
   * `doorFor` and the click need it and two spellings of a key drift.
   */
  private keyFor(target: string, base: string): string {
    return couldBeAbsolute(target) ? target : `${base}\u0000${target}`;
  }

  private async doorFor(target: string, base: string): Promise<PathDoorAnswer> {
    // The cheap refusal, and PHASE 250 narrowed it with the lift: a spelling
    // that can never reach a door NO MATTER WHAT is still refused here, which
    // is now a relative spelling on a pane with no usable base. The rule is
    // `couldBeAsked` and it is deliberately wider than main's, so this can
    // only cost a round trip and never an answer.
    if (!couldBeAsked(target, base)) return { door: null, refusal: 'not-absolute' };
    const key = this.keyFor(target, base);
    const held = this.cache.get(key);
    if (held !== undefined && this.now() - held.at < CACHE_MS) return held.answer;
    const flying = this.inFlight.get(key);
    if (flying !== undefined) return flying;
    const asking = this.ask(key, target, base).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, asking);
    return asking;
  }

  private async ask(
    key: string,
    target: string,
    base: string
  ): Promise<PathDoorAnswer> {
    let answer: PathDoorAnswer = { door: null, refusal: 'missing' };
    try {
      const [item] = await this.deps.classify([target], base);
      if (item?.door !== undefined) answer = item.door;
    } catch {
      // A bridge that is not there draws no links, which is the same answer a
      // path that is not there gets. There is nothing to say to anybody.
    }
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next();
      if (oldest.done !== true) this.cache.delete(oldest.value);
    }
    this.cache.set(key, { at: this.now(), answer });
    return answer;
  }

  /**
   * The click. It asks AGAIN, and that is the rule rather than an extra.
   *
   * The underline was drawn from a cached answer and the file at that spelling
   * can have been replaced since — by an agent, or by something planted there.
   * So the fresh answer decides, and for the Mac door main asks a third time
   * inside the channel, because the channel is the thing that acts.
   */
  private async open(span: Pick<PathSpan, 'target' | 'line'>): Promise<void> {
    if (!this.deps.isLocal()) return;
    const base = this.deps.repoPath();
    this.cache.delete(this.keyFor(span.target, base));
    const answer = await this.doorFor(span.target, base);
    if (answer.door === null) return;
    // PHASE 274. THE FILE IS OPENED AT THE SPELLING THIS PANE ASKED WITH.
    //
    // `answer.path` is the REALPATH, and that is what makes every clause of
    // the door sequence honest. It is not what the file is CALLED from here.
    // A pane whose project is spelled `~/source/proj` while the disk says
    // `~/Source/proj` is one folder on a case-insensitive volume — the APFS
    // default, and what the reporter's Mac and the operator's both run — and
    // `/tmp` against `/private/tmp` is the same shape through a symlink.
    // Opening the realpath handed the editor a tab whose path shared no prefix
    // with the project it is in, so `fileInRepo` said false, `projectHolding`
    // could not find the project, and ⌘S took the PLAIN door instead of the
    // compare-and-swap one. Measured at `30f4bd8d`: the link opened at the
    // canonical spelling, unguarded.
    //
    // `underBase` is main's own re-spelling and it is present only when the
    // realpath is inside the real base, so it names the same file or it is not
    // there. `?? answer.path` is exactly this call's behaviour before the
    // phase, which is what a span outside the base, a span with no base and an
    // older main all still get.
    const opened = answer.underBase ?? answer.path;
    if (answer.door === 'mac') {
      await this.deps.openOnMac(opened);
      return;
    }
    // 'editor' and 'image' are one call: the editor store already sends an
    // image path to the image surface and opens markdown in preview, so image,
    // markdown and text are three destinations that already work.
    this.deps.openInTortie(opened, base, span.line);
  }
}

/**
 * IS THIS PANE'S SESSION ON THIS MAC? (Phase 247 fix round.)
 *
 * Research 107 refusal 5, and it FAILS CLOSED. The predicate shipped as
 * `sessionRow()?.machine === undefined`, which is the pane's own ⌘K closure —
 * and that spelling answers TRUE when there is no row at all, because
 * `undefined?.machine` is `undefined`. Both of its neighbours fail the other
 * way: `attachPaths` refuses on `session === null` before it asks about a
 * machine, and Phase 96 measured that a session which GAINS a machine leaves
 * this Mac's list, so "no row" is exactly the state a session that has just
 * moved passes through.
 *
 * The window is one render tick, because `SplitSurface` draws no pane without
 * a row, and it was not reachable when this was found. It is one word, it is
 * the closure that carries refusal 5, and a guard on the riskiest gesture in
 * the product should not be the only one of the three that opens when it is
 * asked a question it cannot answer.
 */
export function paneIsLocal(row: { machine?: unknown } | undefined): boolean {
  return row !== undefined && row.machine === undefined;
}

/** The production ask: `drop:prepare` under its read-only option. */
export async function classifyThroughBridge(
  paths: string[],
  base: string
): Promise<DropPreparedItem[]> {
  const drop = gmuxBridge()?.drop;
  if (typeof drop?.prepare !== 'function') return [];
  const { items } = await drop.prepare(paths, { classify: true, base });
  return items;
}

/**
 * The sentence a person reads when the Mac door did not open.
 *
 * There is exactly one, and it is short because it is a toast: it says what
 * did not happen and nothing about why. Main's own prose is appended when it
 * sent some, which is the `Open With` precedent in ../tree/open-with.ts.
 *
 * There is no sentence for a REFUSAL. A refusal at the click means the file
 * changed between the underline being drawn and the pointer being pressed,
 * and the honest answer to that is the link quietly not working — telling
 * somebody "that is no longer what it was" is a paragraph about a race.
 */
export const MAC_OPEN_FAILED = 'Could not open that file';

export function macOpenFailedToast(message: string): string {
  const extra = message.trim();
  return extra.length > 0 ? `${MAC_OPEN_FAILED}. ${extra}` : MAC_OPEN_FAILED;
}

/**
 * The production handoff: the one channel that reaches LaunchServices.
 *
 * Main re-asks every question about the path before macOS sees a byte of it,
 * so what crosses here is a spelling and nothing more.
 */
export async function handToMac(path: string): Promise<void> {
  const fs = gmuxBridge()?.fs;
  if (typeof fs?.openExternalPath !== 'function') return;
  let outcome;
  try {
    outcome = await fs.openExternalPath(path);
  } catch {
    useApp.getState().toast('error', MAC_OPEN_FAILED);
    return;
  }
  if (outcome.status === 'failed') {
    useApp.getState().toast('error', macOpenFailedToast(outcome.message));
  }
}
