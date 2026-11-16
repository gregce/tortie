/**
 * The web-links reading: which web addresses a row of the terminal holds, and
 * on which cells, exactly as the web links addon finds them today (Phase 368,
 * build/p368/SPEC.md D15).
 *
 * WHY A COPY. A click on an agent's OSC 8 link opens the address the web links
 * addon reads on that link's cells when there is one, because that is what a
 * click on those cells opened before links reached the terminal (D14, his
 * question 4's default). The link handler must therefore ask the SAME reading
 * the addon makes, and the addon does not export it: its package exports only
 * the addon class. So the reading is copied here, unchanged, and
 * `__tests__/p368-web-reading.test.ts` holds it to the addon's own provider over
 * the same buffers. The addon itself stays loaded in the pane exactly as before,
 * and still opens every address no OSC link covers.
 *
 * WHAT IS COPIED, and from where (refusal 1: an attributed MIT copy of code
 * already in Tortie's bundle, no new dependency):
 *
 *   @xterm/addon-web-links 0.12.0 (commit f447274f430fd22513f6adbf9862d19524471c04)
 *     src/WebLinksAddon.ts:21       strictUrlRegex
 *     src/WebLinkProvider.ts:44-56  isUrl
 *     src/WebLinkProvider.ts:58-199 LinkComputer.computeLink,
 *                                    _getWindowedLineStrings, _mapStrIdx
 *
 * The only changes: the class's three static methods are module functions, the
 * activate callback the addon threads through is gone, and a match is answered
 * as `{ address, range }` rather than as an xterm link object. Not one clause of
 * the reading changed, the 2,048 expansion bound, the wide character correction
 * and the `isUrl` prefix test included.
 *
 * ---------------------------------------------------------------------------
 * Copyright (c) 2017, 2019 The xterm.js authors (https://github.com/xtermjs/xterm.js)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * ---------------------------------------------------------------------------
 */

import type { IBufferLine, IBufferRange, Terminal } from '@xterm/xterm';

/** One address the reading found, and the cells it covers. */
export interface WebAddress {
  /** The matched text, exactly what the addon hands its handler. */
  readonly address: string;
  /**
   * 1-based, inclusive at both ends, in buffer rows: the coordinate an xterm
   * link provider answers in, which is also the coordinate an OSC 8 link's
   * range carries.
   */
  readonly range: IBufferRange;
}

// consider everthing starting with http:// or https://
// up to first whitespace, `"` or `'` as url
// NOTE: The repeated end clause is needed to not match a dangling `:`
// resembling the old (...)*([^:"\'\\s]) final path clause
// additionally exclude early + final:
// - unsafe from rfc3986: !*'()
// - unsafe chars from rfc1738: {}|\^~[]` (minus [] as we need them for ipv6 adresses, also allow ~)
// also exclude as finals:
// - final interpunction like ,.!?
// - any sort of brackets <>()[]{} (not spec conform, but often used to enclose urls)
// - unsafe chars from rfc1738: {}|\^~[]`
const strictUrlRegex = /(https?|HTTPS?):[/]{2}[^\s"'!*(){}|\\\^<>`]*[^\s"':,.!?{}|\\\^~\[\]`()<>]/;

function isUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const parsedBase = url.password && url.username
      ? `${url.protocol}//${url.username}:${url.password}@${url.host}`
      : url.username
        ? `${url.protocol}//${url.username}@${url.host}`
        : `${url.protocol}//${url.host}`;
    return urlString.toLocaleLowerCase().startsWith(parsedBase.toLocaleLowerCase());
  } catch (e) {
    return false;
  }
}

/**
 * Every web address the reading finds for buffer row `y` (1-based, the line
 * number xterm asks a link provider about), in the order the addon finds them.
 * `LinkComputer.computeLink` with the addon's default regex.
 */
export function webAddressesOn(terminal: Terminal, y: number): WebAddress[] {
  const rex = new RegExp(strictUrlRegex.source, (strictUrlRegex.flags || '') + 'g');

  const [lines, startLineIndex] = getWindowedLineStrings(y - 1, terminal);
  const line = lines.join('');

  let match;
  const result: WebAddress[] = [];

  while (match = rex.exec(line)) {
    const text = match[0];

    // check via URL if the matched text would form a proper url
    if (!isUrl(text)) {
      continue;
    }

    // map string positions back to buffer positions
    // values are 0-based right side excluding
    const [startY, startX] = mapStrIdx(terminal, startLineIndex, 0, match.index);
    const [endY, endX] = mapStrIdx(terminal, startY, startX, text.length);

    if (startY === -1 || startX === -1 || endY === -1 || endX === -1) {
      continue;
    }

    // range expects values 1-based right side including, thus +1 except for endX
    const range = {
      start: {
        x: startX + 1,
        y: startY + 1
      },
      end: {
        x: endX,
        y: endY + 1
      }
    };

    result.push({ address: text, range });
  }

  return result;
}

/**
 * Get wrapped content lines for the current line index.
 * The top/bottom line expansion stops at whitespaces or length > 2048.
 * Returns an array with line strings and the top line index.
 *
 * NOTE: We pull line strings with trimRight=true on purpose to make sure
 * to correctly match urls with early wrapped wide chars. This corrupts the string index
 * for 1:1 backmapping to buffer positions, thus needs an additional correction in _mapStrIdx.
 */
function getWindowedLineStrings(lineIndex: number, terminal: Terminal): [string[], number] {
  let line: IBufferLine | undefined;
  let topIdx = lineIndex;
  let bottomIdx = lineIndex;
  let length = 0;
  let content = '';
  const lines: string[] = [];

  if ((line = terminal.buffer.active.getLine(lineIndex))) {
    const currentContent = line.translateToString(true);

    // expand top, stop on whitespaces or length > 2048
    if (line.isWrapped && currentContent[0] !== ' ') {
      length = 0;
      while ((line = terminal.buffer.active.getLine(--topIdx)) && length < 2048) {
        content = line.translateToString(true);
        length += content.length;
        lines.push(content);
        if (!line.isWrapped || content.indexOf(' ') !== -1) {
          break;
        }
      }
      lines.reverse();
    }

    // append current line
    lines.push(currentContent);

    // expand bottom, stop on whitespaces or length > 2048
    length = 0;
    while ((line = terminal.buffer.active.getLine(++bottomIdx)) && line.isWrapped && length < 2048) {
      content = line.translateToString(true);
      length += content.length;
      lines.push(content);
      if (content.indexOf(' ') !== -1) {
        break;
      }
    }
  }
  return [lines, topIdx];
}

/**
 * Map a string index back to buffer positions.
 * Returns buffer position as [lineIndex, columnIndex] 0-based,
 * or [-1, -1] in case the lookup ran into a non-existing line.
 */
function mapStrIdx(terminal: Terminal, lineIndex: number, rowIndex: number, stringIndex: number): [number, number] {
  const buf = terminal.buffer.active;
  const cell = buf.getNullCell();
  let start = rowIndex;
  while (stringIndex) {
    const line = buf.getLine(lineIndex);
    if (!line) {
      return [-1, -1];
    }
    for (let i = start; i < line.length; ++i) {
      line.getCell(i, cell);
      const chars = cell.getChars();
      const width = cell.getWidth();
      if (width) {
        stringIndex -= chars.length || 1;

        // correct stringIndex for early wrapped wide chars:
        // - currently only happens at last cell
        // - cells to the right are reset with chars='' and width=1 in InputHandler.print
        // - follow-up line must be wrapped and contain wide char at first cell
        // --> if all these conditions are met, correct stringIndex by +1
        if (i === line.length - 1 && chars === '') {
          const line = buf.getLine(lineIndex + 1);
          if (line && line.isWrapped) {
            line.getCell(0, cell);
            if (cell.getWidth() === 2) {
              stringIndex += 1;
            }
          }
        }
      }
      if (stringIndex < 0) {
        return [lineIndex, i];
      }
    }
    lineIndex++;
    start = 0;
  }
  return [lineIndex, start];
}
