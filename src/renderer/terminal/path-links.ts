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
 */

import type { ILink, ILinkProvider, Terminal } from '@xterm/xterm';
import type { DropPreparedItem } from '@shared/types';
import type { PathDoorAnswer } from '@shared/path-doors';
import { couldBeAbsolute, couldBeAsked } from '@shared/path-doors';
import type { PathSpan } from '@shared/path-spans';
import { cellColumns, pathSpansInRow, spanColumns } from '@shared/path-spans';
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
    if (spans.length === 0) {
      callback(undefined);
      return;
    }
    void this.linksFor(spans, columns, bufferLineNumber).then(callback);
  }

  /** One `ILink` per span whose door is a door, and nothing for the rest. */
  private async linksFor(
    spans: PathSpan[],
    columns: number[],
    y: number
  ): Promise<ILink[] | undefined> {
    // Read ONCE for the whole row and handed down, so every span on one row
    // is judged against one base even if the session's project changes under
    // the await — and the click below reads it again, freshly, for itself.
    const base = this.deps.repoPath();
    const answers = await Promise.all(
      spans.map((s) => this.doorFor(s.target, base))
    );
    const links: ILink[] = [];
    for (const [at, span] of spans.entries()) {
      const answer = answers[at];
      if (answer === undefined || answer.door === null) continue;
      // xterm's range is 1-based and INCLUSIVE at both ends, and it is in
      // CELL COLUMNS. A span whose columns cannot be read is not drawn.
      const range = spanColumns(span, columns);
      if (range === null) continue;
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
  private async open(span: PathSpan): Promise<void> {
    if (!this.deps.isLocal()) return;
    const base = this.deps.repoPath();
    this.cache.delete(this.keyFor(span.target, base));
    const answer = await this.doorFor(span.target, base);
    if (answer.door === null) return;
    if (answer.door === 'mac') {
      await this.deps.openOnMac(answer.path);
      return;
    }
    // 'editor' and 'image' are one call: the editor store already sends an
    // image path to the image surface and opens markdown in preview, so image,
    // markdown and text are three destinations that already work.
    this.deps.openInTortie(answer.path, base, span.line);
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
