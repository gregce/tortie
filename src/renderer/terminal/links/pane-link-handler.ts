/**
 * The pane's link handler: what xterm asks when a person hovers or clicks a
 * link an agent printed as OSC 8 (Phase 368, build/p368/SPEC.md D14 to D17,
 * item 10).
 *
 * Until this phase no OSC 8 link reached the terminal, because tmux strips them
 * for a client without the `hyperlinks` feature; the attach now asks for it
 * (src/main/attach/attach-plan.ts). xterm offers such a link only when its
 * target parses as http or https (its own provider drops every other scheme,
 * and xterm's option that admits them is never set here), underlines it, and
 * then asks THIS handler. With no handler xterm's default asks
 * `confirm("Do you want to navigate…")` and then opens a blank window main
 * refuses, which is worse than the link not being there (research 145 §5.4).
 *
 * ## One route per kind
 *
 * A click opens a web address by one `window.open` of it, `_blank`, with
 * `noopener,noreferrer`: the route the web links addon and the Markdown
 * preview already take, so main's window-open gate decides
 * (src/main/security/trusted-window.ts) and nothing here reaches the browser
 * itself. The address is `openedAddress` (./link-rules.ts): the words' own web
 * address when the words hold one, the whole target for a URL the agent cut,
 * and otherwise the target only when it is http or https, has no user part and
 * is at most 2,048 bytes. A refused target opens nothing (D17: xterm still
 * underlines it, because it offers the link before it asks the handler).
 *
 * A click on words that are a PATH the pane offers opens that path through the
 * path provider's own link (../path-links.ts, its door asked again at the
 * click), which is what a click on those cells did before links reached the
 * terminal (the fix round, D14 rule 0). xterm's own OSC 8 provider outranks
 * the path provider and drops a path link whose cells it covers, so without
 * this a file an agent linked to a web page opened the web page where it used
 * to open the file. The path provider is asked only when no web address the
 * reading finds holds the pointer's cell, because the web links addon
 * outranked the path provider on such a cell before, and its answer is the
 * one `path.activate` below; nothing here opens a window for it.
 *
 * ## The hover line (D16)
 *
 * While the pointer is on a link, one line at the pane's bottom left says the
 * address a click there opens, as `new URL(address).href`: the host in ASCII and
 * every non-ASCII, space or bidi character percent-encoded. It is text, never
 * HTML, inside `term.element` with xterm's `xterm-hover` class, so xterm's
 * linkifier never treats it as part of the screen, and it takes no pointer
 * events, so the cells under it stay clickable. When the link sits on the rows
 * the line would cover, the line moves to the top left instead. A link a click
 * would not open draws no line, and neither does one whose click opens a path,
 * because a path link draws no line of its own. The line follows the pointer
 * within one link, because a link whose words hold two addresses opens the one
 * under the pointer, and the line says what a click would open.
 */

import type {
  IBufferCellPosition,
  IBufferRange,
  ILink,
  ILinkHandler,
  Terminal
} from '@xterm/xterm';
import {
  hoverText,
  openedAddress,
  pathMayDecide,
  pathUnder,
  type ClickedLink,
  type ReadingOn,
  type RowText
} from './link-rules';
import { webAddressesOn, type WebAddress } from './web-reading';
import './link-hover.css';

/**
 * The path links the pane offers on one buffer row (1-based), handed to
 * `then`: the pane's path provider asked directly, at once when it answers at
 * once (a row holding no path, a session on another machine) and when its
 * door has answered otherwise.
 */
export type PathLinksOn = (
  bufferLineNumber: number,
  then: (links: readonly ILink[]) => void
) => void;

/** What the pane wires in: the handler for its options, its terminal, and its paths. */
export interface PaneLinks {
  /** Handed to xterm as the Terminal's `linkHandler` option. */
  readonly handler: ILinkHandler;
  /** Called once, right after the Terminal is constructed. */
  bind(term: Terminal): void;
  /**
   * Called once, with the pane's own path provider, so a click on words that
   * are a path opens that path as it did before links reached the terminal
   * (D14 rule 0). Never called, the handler offers no path.
   */
  paths(source: PathLinksOn): void;
}

/** The hover line's classes: xterm's own, then the stylesheet's. */
export const LINK_HOVER_CLASS = 'xterm-hover gmux-terminal-link-hover';

/**
 * The bottom rows the line covers. A link on one of them puts the line at the
 * top left instead, so the line never hides the link it describes.
 */
const HOVER_COVERS_ROWS = 3;

/** The link under the pointer, and the reading of its row, while hovered. */
interface Hovered {
  readonly target: string;
  readonly range: IBufferRange;
  readonly reading: readonly WebAddress[];
}

/**
 * The cell under the pointer, 1-based, in buffer rows, by xterm's own sum
 * (`getCoords` in xterm's browser/input/Mouse.ts): the pointer's offset in the
 * screen element over the cell's size, rounded up and kept on the screen. Null
 * when the terminal has no screen or no size yet.
 */
function cellAt(
  term: Terminal,
  event: Pick<MouseEvent, 'clientX' | 'clientY'>
): IBufferCellPosition | null {
  const screen = term.element?.querySelector('.xterm-screen');
  if (screen === null || screen === undefined) return null;
  const rect = screen.getBoundingClientRect();
  if (!(rect.width > 0) || !(rect.height > 0) || term.cols < 1 || term.rows < 1) {
    return null;
  }
  const x = Math.ceil((event.clientX - rect.left) / (rect.width / term.cols));
  const y = Math.ceil((event.clientY - rect.top) / (rect.height / term.rows));
  return {
    x: Math.min(Math.max(x, 1), term.cols),
    y: Math.min(Math.max(y, 1), term.rows) + term.buffer.active.viewportY
  };
}

/** One pane's links. Made once per terminal, before the Terminal itself. */
export function paneLinks(): PaneLinks {
  let term: Terminal | null = null;
  let pathsOn: PathLinksOn | null = null;
  let line: HTMLElement | null = null;
  let hovered: Hovered | null = null;
  let listeningOn: HTMLElement | null = null;
  /** Bumped by every hover decision, so a path answer that comes late draws nothing over a newer one. */
  let asked = 0;

  const rowText: RowText = (y) =>
    term?.buffer.active.getLine(y - 1)?.translateToString(true) ?? null;
  /** The web links reading of any row, for a cut's later rows (D14 rule 3). */
  const readingOn: ReadingOn = (y) => (term === null ? [] : webAddressesOn(term, y));

  const clicked = (
    bound: Terminal,
    target: string,
    range: IBufferRange,
    event: Pick<MouseEvent, 'clientX' | 'clientY'>
  ): ClickedLink => ({ target, range, at: cellAt(bound, event) });

  /**
   * D14 rule 0: hands `then` the path link this click lands on, or null at once
   * when the path provider is not asked (an address the reading finds holds the
   * pointer's cell, or the pane offers no paths). Answers whether `then` ran
   * before it returned.
   */
  const pathFor = (
    link: ClickedLink,
    reading: readonly WebAddress[],
    then: (path: ILink | null) => void
  ): boolean => {
    const source = pathsOn;
    if (source === null || !pathMayDecide(link, reading)) {
      then(null);
      return true;
    }
    let answered = false;
    source(link.at?.y ?? link.range.start.y, (offered) => {
      if (answered) return;
      answered = true;
      then(pathUnder(link, offered));
    });
    return answered;
  };

  const removeLine = (): void => {
    line?.remove();
    line = null;
  };

  const showLine = (address: string | null, range: IBufferRange): void => {
    const text = address === null ? null : hoverText(address);
    const host = term?.element;
    if (text === null || host === undefined || term === null) {
      removeLine();
      return;
    }
    if (line === null || line.parentElement !== host) {
      removeLine();
      line = host.ownerDocument.createElement('div');
      line.className = LINK_HOVER_CLASS;
      host.appendChild(line);
    }
    if (line.textContent !== text) line.textContent = text;
    const viewRow = range.start.y - term.buffer.active.viewportY;
    if (viewRow > term.rows - HOVER_COVERS_ROWS) line.setAttribute('data-at', 'top');
    else line.removeAttribute('data-at');
  };

  /**
   * The line for the hovered link at this pointer: the address a click there
   * opens, or none when the click opens a path or nothing. A decision that has
   * to wait for the path provider takes the old line away first, so the line
   * never says what a click no longer opens.
   */
  const lineFor = (h: Hovered, event: Pick<MouseEvent, 'clientX' | 'clientY'>): void => {
    const bound = term;
    if (bound === null) return;
    const link = clicked(bound, h.target, h.range, event);
    asked += 1;
    const ask = asked;
    const now = pathFor(link, h.reading, (path) => {
      if (ask !== asked || hovered !== h || term !== bound) return;
      showLine(
        path === null ? openedAddress(link, h.reading, rowText, bound.cols, readingOn) : null,
        h.range
      );
    });
    if (!now) removeLine();
  };

  const onMove = (event: MouseEvent): void => {
    if (hovered === null) return;
    lineFor(hovered, event);
  };

  const stopListening = (): void => {
    listeningOn?.removeEventListener('mousemove', onMove);
    listeningOn = null;
  };

  const handler: ILinkHandler = {
    activate(event, text, range) {
      const bound = term;
      if (bound === null) return;
      const link = clicked(bound, text, range, event);
      const reading = webAddressesOn(bound, range.start.y);
      pathFor(link, reading, (path) => {
        if (term !== bound) return;
        if (path !== null) {
          // D14 rule 0: the path provider's own route, its door asked again,
          // which is what a click on these cells opened before links reached
          // the terminal. Nothing here opens a window for a path.
          path.activate(event, path.text);
          return;
        }
        const address = openedAddress(link, reading, rowText, bound.cols, readingOn);
        if (address === null) return;
        window.open(address, '_blank', 'noopener,noreferrer');
      });
    },
    hover(event, text, range) {
      if (term === null) return;
      hovered = { target: text, range, reading: webAddressesOn(term, range.start.y) };
      lineFor(hovered, event);
      const host = term.element;
      if (host !== undefined && listeningOn !== host) {
        stopListening();
        host.addEventListener('mousemove', onMove, { passive: true });
        listeningOn = host;
      }
    },
    leave() {
      hovered = null;
      asked += 1;
      stopListening();
      removeLine();
    }
  };

  return {
    handler,
    bind(next: Terminal): void {
      if (term !== next) {
        hovered = null;
        asked += 1;
        stopListening();
        removeLine();
      }
      term = next;
    },
    paths(source: PathLinksOn): void {
      pathsOn = source;
    }
  };
}
