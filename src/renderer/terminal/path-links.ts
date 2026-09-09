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
 * Every span the grammar yields is asked about and cached, including every
 * relative one main answers `not-absolute`. Re-derived over the operator's own
 * 25 live panes and 56,977 rows, read only, through the SHIPPING
 * `pathSpansInRow`: **7,172 spans over 1,552 distinct targets, of which 1,144
 * — 74% — are relative**, and the busiest single pane holds 460 distinct
 * targets against a `CACHE_MAX` of 512.
 *
 * Two things follow, and both are here rather than in a later surprise. The
 * relative three quarters are refused by `couldBeAbsolute` in this renderer
 * before a round trip is made, which is the same answer main gives and is why
 * it is one exported predicate rather than two spellings of a rule. And the
 * ceiling is a ceiling rather than headroom: a busy pane sits inside it by 52
 * entries, so it evicts oldest-first when it does not, which costs a round
 * trip and never an answer.
 */

import type { ILink, ILinkProvider, Terminal } from '@xterm/xterm';
import type { DropPreparedItem } from '@shared/types';
import type { PathDoorAnswer } from '@shared/path-doors';
import { couldBeAbsolute } from '@shared/path-doors';
import type { PathSpan } from '@shared/path-spans';
import { cellColumns, pathSpansInRow, spanColumns } from '@shared/path-spans';
import { gmuxBridge } from '../bridge';
import { useApp } from '../state/store';

/** How long a hover answer is kept before the path is asked about again. */
const CACHE_MS = 30_000;

/** A ceiling on the map, so a very long session cannot grow it without bound. */
const CACHE_MAX = 512;

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
  /** The pane's own project, which the editor takes as the tab's repo. */
  repoPath(): string;
  /** Ask main which door a path takes. Metadata only; see the header. */
  classify(paths: string[]): Promise<DropPreparedItem[]>;
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
    private readonly term: Pick<Terminal, 'buffer'>,
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
    const above = y > 0 ? (buffer.getLine(y - 1)?.translateToString(true) ?? null) : null;
    const spans = pathSpansInRow(row, above);
    if (spans.length === 0) {
      callback(undefined);
      return;
    }
    // A ROW'S STRING INDICES ARE NOT ITS CELL COLUMNS, and xterm underlines
    // and hit-tests in COLUMNS. The map is taken here, synchronously, beside
    // the row it belongs to and before any await. See `cellColumns`.
    const columns = cellColumns(line);
    void this.linksFor(spans, columns, bufferLineNumber).then(callback);
  }

  /** One `ILink` per span whose door is a door, and nothing for the rest. */
  private async linksFor(
    spans: PathSpan[],
    columns: number[],
    y: number
  ): Promise<ILink[] | undefined> {
    const answers = await Promise.all(spans.map((s) => this.doorFor(s.target)));
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
  private async doorFor(target: string): Promise<PathDoorAnswer> {
    // Three spans in four are relative and main answers every one of them the
    // same way. The rule is `couldBeAbsolute` and it is deliberately wider
    // than main's, so this can only cost a round trip and never an answer.
    if (!couldBeAbsolute(target)) return { door: null, refusal: 'not-absolute' };
    const held = this.cache.get(target);
    if (held !== undefined && this.now() - held.at < CACHE_MS) return held.answer;
    const flying = this.inFlight.get(target);
    if (flying !== undefined) return flying;
    const asking = this.ask(target).finally(() => {
      this.inFlight.delete(target);
    });
    this.inFlight.set(target, asking);
    return asking;
  }

  private async ask(target: string): Promise<PathDoorAnswer> {
    let answer: PathDoorAnswer = { door: null, refusal: 'missing' };
    try {
      const [item] = await this.deps.classify([target]);
      if (item?.door !== undefined) answer = item.door;
    } catch {
      // A bridge that is not there draws no links, which is the same answer a
      // path that is not there gets. There is nothing to say to anybody.
    }
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next();
      if (oldest.done !== true) this.cache.delete(oldest.value);
    }
    this.cache.set(target, { at: this.now(), answer });
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
    this.cache.delete(span.target);
    const answer = await this.doorFor(span.target);
    if (answer.door === null) return;
    if (answer.door === 'mac') {
      await this.deps.openOnMac(answer.path);
      return;
    }
    // 'editor' and 'image' are one call: the editor store already sends an
    // image path to the image surface and opens markdown in preview, so image,
    // markdown and text are three destinations that already work.
    this.deps.openInTortie(answer.path, this.deps.repoPath(), span.line);
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
  paths: string[]
): Promise<DropPreparedItem[]> {
  const drop = gmuxBridge()?.drop;
  if (typeof drop?.prepare !== 'function') return [];
  const { items } = await drop.prepare(paths, { classify: true });
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
