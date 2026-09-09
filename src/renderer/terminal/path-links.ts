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
 * ## The cache, and why it is nearly free
 *
 * `lstat` lives in main, so the answer is an IPC round trip, and a pointer
 * crossing one row asks about every cell in it. Research 107 section 7.5
 * measured the repetition that makes a naive implementation expensive: 72
 * distinct files behind 200 spans in a 52,094-row corpus, 44 spans behind one
 * script. So the round trip happens once per distinct path and not once per
 * cell. Entries expire, because a file an agent deleted must stop being
 * underlined, and the CLICK asks again anyway — the cached answer decides only
 * whether to draw a line under something.
 */

import type { ILink, ILinkProvider, Terminal } from '@xterm/xterm';
import type { DropPreparedItem } from '@shared/types';
import type { PathDoorAnswer } from '@shared/path-doors';
import type { PathSpan } from '@shared/path-spans';
import { pathSpansInRow } from '@shared/path-spans';
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
    void this.linksFor(spans, bufferLineNumber).then(callback);
  }

  /** One `ILink` per span whose door is a door, and nothing for the rest. */
  private async linksFor(
    spans: PathSpan[],
    y: number
  ): Promise<ILink[] | undefined> {
    const answers = await Promise.all(spans.map((s) => this.doorFor(s.target)));
    const links: ILink[] = [];
    for (const [at, span] of spans.entries()) {
      const answer = answers[at];
      if (answer === undefined || answer.door === null) continue;
      links.push({
        // xterm's range is 1-based and INCLUSIVE at both ends.
        range: {
          start: { x: span.start + 1, y },
          end: { x: span.end, y }
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
