/**
 * Harness only driver for the last lines panel (Phase 100 verification).
 *
 * Driven from the GMUX_SHOT_DRIVE spec (`remoteLines: {…}`) and inert
 * otherwise. It follows ../search/shot-probe.ts, which is the file the spec
 * names as the shape for this one.
 *
 * ## What the screenshot read has to settle, and why a test cannot
 *
 * Eight things are read off the image, and every one of them is a sentence, a
 * control or a position that a person has to be able to find. A unit test can
 * assert that a string is in the markup. It cannot say whether the counts
 * sentence is legible under the header, whether all four depth buttons fit on
 * one row, whether the box opened on the newest line, or whether a sentence
 * Phase 100 deleted is still somewhere on the screen. So the picture is taken
 * of the real panel over the real layout, and this hook is what gets the panel
 * open and settled first.
 *
 * THE WORDS THAT MUST NOT BE ON SCREEN ARE PASSED IN, and they are not written
 * out in this file. `build/probe-p100-lines.mjs` names them in the drive spec.
 * A test in ./__tests__/p100-remote-lines.test.tsx reads every file under src
 * and fails on either of them, and a file under src that held them so it could
 * look for them would be the one thing that rule cannot express.
 *
 * ## What is real in a run, and what this hook supplies
 *
 * Real: the project tab, the machine, the session running on it, the read
 * itself, and every sentence the panel draws. The machine is the loopback
 * machine `build/with-scratch-machine.mjs` starts, and the session is a session
 * that is really running over there.
 *
 * Supplied: nothing. This hook presses the store's own verbs, which are the
 * ones the button in the band and the session menu item press, and then reads
 * the document back.
 *
 * ## What it reports
 *
 * Findings go to `console.log`, which GMUX_SHOT_VERBOSE=1 tees into the harness
 * output, and to `window.__gmuxP100Lines`, which GMUX_SHOT_JS can read back.
 * The report is what the panel DREW, read out of the document, because that is
 * the only reading that settles a sentence. The store's mode word is not the
 * sentence a person reads.
 */

import { useApp } from '../state/store';

export interface RemoteLinesProbeSpec {
  /**
   * Open the panel on this session by NAME.
   *
   * A name rather than an id, because the probe made the session by name and
   * ids are minted by main. When it is absent the first session that runs on
   * another machine is used, which is the ordinary case in a run with one.
   */
  session?: string;
  /** Read again at this depth once the first read has answered. */
  depth?: number;
  /** How long to wait for one read before reporting what is on screen. */
  waitMs?: number;
  /** Fail loudly unless the panel's text block holds this string. */
  expectText?: string;
  /**
   * Words that must be nowhere in the document once the panel is open.
   *
   * The probe passes the two sentences Phase 100 deleted. They are named there
   * rather than here, for the reason in this file's header.
   */
  absentWords?: string[];
}

/** What the panel drew, read out of the document. */
export interface RemoteLinesReading {
  /** True when the panel is in the document at all. */
  open: boolean;
  /** The title, which names the session. */
  title: string;
  /** The line that names the machine and the instant. */
  header: string;
  /** The sentence that says the panel does not refresh. */
  notLive: string;
  /** The sentence that says how much came back. */
  counts: string;
  /** The cut sentence, or the empty string when it is not drawn. */
  cut: string;
  /** The all there sentence, or the empty string when it is not drawn. */
  allThere: string;
  /**
   * The settled sentence drawn in place of a body, or the empty string.
   *
   * IT NEVER HOLDS THE IN-FLIGHT SENTENCE, and that is why {@link reading} is a
   * separate field. The first pass of this probe read the in-flight sentence
   * out of this one and reported four empty reads for a feature that works.
   */
  empty: string;
  /** The in-flight sentence, or the empty string once the read has settled. */
  reading: string;
  /** How far down the text block is scrolled, in pixels. */
  bodyScrollTop: number;
  /** The full height of the text block's content, in pixels. */
  bodyScrollHeight: number;
  /** The height of the text block's visible box, in pixels. */
  bodyClientHeight: number;
  /**
   * True when the text block is at its bottom, so the newest line is on screen.
   *
   * THE FEATURE IS CALLED READING THE LAST LINES. The first build of this phase
   * opened the panel at the oldest line of the answer, so a person who asked
   * for 25,000 lines had to scroll 25,000 lines to reach the ones they opened
   * the panel for. Two pixels of slack, because a fractional line height can
   * leave the sum a pixel short of the height.
   */
  bodyAtNewest: boolean;
  /** The last 200 characters of the text block, being the newest lines. */
  bodyTail: string;
  /** The four depth button labels, in the order they are drawn. */
  depths: string[];
  /** The label of the depth button that is pressed right now. */
  depthPressed: string;
  /** How many characters the text block holds. */
  bodyChars: number;
  /** The first 200 characters of the text block, so the picture can be read. */
  bodyHead: string;
  /**
   * Which of `absentWords` were found in the document, which must be none.
   *
   * It is the seventh thing the screenshot read checks, and it is here as data
   * as well, because a person reading an image can miss a few words in a corner
   * and this cannot.
   */
  wordsFound: string[];
}

declare global {
  interface Window {
    __gmuxP100Lines?: RemoteLinesReading[];
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** The text of one node under the panel, or the empty string when absent. */
function textOf(selector: string): string {
  const el = document.querySelector<HTMLElement>(
    `.remote-lines-modal ${selector}`
  );
  return (el?.textContent ?? '').trim();
}

function readPanel(absentWords: string[]): RemoteLinesReading {
  const panel = document.querySelector('.remote-lines-modal');
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '.remote-lines-modal .remote-lines-depths .btn'
    )
  );
  const body = document.querySelector<HTMLElement>(
    '.remote-lines-modal .remote-lines-body'
  );
  const bodyText = body?.textContent ?? '';
  const documentText = document.body.textContent ?? '';
  return {
    open: panel !== null,
    title: textOf('.modal-title'),
    header: textOf('.remote-lines-header'),
    notLive: textOf('.remote-lines-note'),
    counts: textOf('.remote-lines-counts'),
    cut: textOf('.remote-lines-cut'),
    allThere: textOf('.remote-lines-all-there'),
    empty: textOf('.remote-lines-empty'),
    reading: textOf('.remote-lines-reading'),
    depths: buttons.map((b) => (b.textContent ?? '').trim()),
    depthPressed:
      buttons
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => (b.textContent ?? '').trim())
        .join(' ') || '',
    bodyChars: bodyText.length,
    bodyHead: bodyText.slice(0, 200),
    bodyTail: bodyText.slice(-200),
    bodyScrollTop: Math.round(body?.scrollTop ?? 0),
    bodyScrollHeight: Math.round(body?.scrollHeight ?? 0),
    bodyClientHeight: Math.round(body?.clientHeight ?? 0),
    bodyAtNewest:
      body === null
        ? false
        : body.scrollTop + body.clientHeight >= body.scrollHeight - 2,
    wordsFound: absentWords.filter((word) => documentText.includes(word))
  };
}

/** Wait until the store says nothing is in flight, or the deadline passes. */
async function settle(waitMs: number): Promise<void> {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    if (!useApp.getState().remoteLinesLoading) break;
    await wait(100);
  }
  // One more frame, so React has painted the answer the store now holds.
  await wait(300);
}

/**
 * Open the panel, wait for the read, and report what was drawn.
 *
 * Every gesture is the store verb the shipped surfaces call. Nothing here
 * reaches into the panel's own markup to change it, so the report is a reading
 * of the real thing rather than of a fixture.
 */
export async function driveRemoteLines(
  spec: RemoteLinesProbeSpec
): Promise<RemoteLinesReading[]> {
  const waitMs = spec.waitMs ?? 30_000;
  const absentWords = spec.absentWords ?? [];
  const app = useApp.getState();
  const row =
    spec.session === undefined
      ? app.sessions.find((one) => one.machine !== undefined)
      : app.sessions.find((one) => one.name === spec.session);
  const readings: RemoteLinesReading[] = [];

  if (row === undefined) {
    console.log('[p100] no session on another machine to open the panel on');
    window.__gmuxP100Lines = readings;
    return readings;
  }

  useApp.getState().openRemoteLines(row.id);
  await settle(waitMs);
  readings.push(readPanel(absentWords));

  if (spec.depth !== undefined) {
    useApp.getState().readRemoteLines(spec.depth);
    await settle(waitMs);
    readings.push(readPanel(absentWords));
  }

  for (const [i, reading] of readings.entries()) {
    console.log(`[p100] reading ${String(i + 1)}: ${JSON.stringify(reading)}`);
  }

  const last = readings[readings.length - 1];
  if (last !== undefined && spec.expectText !== undefined) {
    const held = last.bodyHead.includes(spec.expectText);
    console.log(
      `[p100] expectText ${JSON.stringify(spec.expectText)} in body head: ${String(held)}`
    );
  }
  if (last !== undefined && last.wordsFound.length > 0) {
    console.log(
      `[p100] FAIL these words are still on screen: ${JSON.stringify(last.wordsFound)}`
    );
  }

  window.__gmuxP100Lines = readings;
  return readings;
}
