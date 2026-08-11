/**
 * Driving a tmux pane that contains a full-screen agent TUI, and reading an
 * answer back out of it.
 *
 * Everything here exists because a TUI is not a stream: it repaints, it
 * wraps, it boxes text behind gutters, it opens modals over itself, and its
 * scrollback is not where the current state lives. The three ideas that make
 * the conformance harness reliable are all in this file —
 *
 *   - {@link waitForQuiet}     "the TUI stopped repainting" as a readiness proxy
 *   - {@link currentScreen}    read the BOTTOM of the pane, not the whole capture
 *   - {@link clearTrustGate}   answer a first-run dialog, but only a readable one
 *
 * — and each of them is here because its absence produced a wrong verdict on
 * a real agent, recorded in the comment beside it.
 *
 * Ownership: src/main/conformance/**.
 */

import { stripAnsi } from '../restore/command';
import * as tmux from '../tmux';
import {
  SELECTED_AFFIRMATIVE,
  TRUST_DIALOG_PATTERNS,
  firstMatch
} from './cases';

const delay = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** Result of waiting for something to show up on a pane. */
export interface PaneWait {
  ok: boolean;
  /** The last capture taken, pass or fail — a failure needs its screen. */
  capture: string;
}

/** Type a single line into a pane and submit it. */
export async function typeLine(target: string, text: string): Promise<void> {
  await tmux.execTmux(['send-keys', '-t', target, '-l', text]);
  // A TUI that re-renders its input box on every keystroke can swallow an
  // Enter that arrives in the same tick as the last character.
  await delay(500);
  await tmux.execTmux(['send-keys', '-t', target, 'Enter']);
}

/** Plain-text view of a pane, wrapped lines rejoined (`-J`). */
export async function readPane(target: string, lines = 400): Promise<string> {
  return stripAnsi(await tmux.capturePane(target, lines).catch(() => ''));
}

/**
 * The part of a capture that came AFTER `marker` — used to scan for
 * argv-rejection evidence without reading the REPLAYED SCROLLBACK, which
 * restore has just cat'd back into the same pane and which contains the
 * pre-kill session's output verbatim. Falls back to the whole text when the
 * marker is absent (a full-screen TUI redraw leaves no trace of it).
 */
export function afterMarker(text: string, marker: string): string {
  if (marker.length === 0) return text;
  const at = text.lastIndexOf(marker);
  return at === -1 ? text : text.slice(at + marker.length);
}

/** Last `n` non-empty-ish lines, for a failure report. */
export function tail(text: string, n = 14): string {
  return text
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l, i, arr) => l.length > 0 || i > arr.length - n)
    .slice(-n)
    .join('\n');
}

/**
 * The part of the pane that describes the CURRENT state — what is at the
 * bottom, after any marker, with the replayed scrollback and any resolved
 * dialog scrolled off above it.
 *
 * Classification must read this, not the whole capture. MEASURED 2026-08-11:
 * codex re-asks for workspace trust on resume, the harness answers it, the
 * conversation continues BELOW the answered dialog — and a whole-capture scan
 * then read that dead text as "waiting on a human" and turned a token
 * mismatch into a BLOCKED verdict. A gate that is really blocking a pane is
 * at the bottom of it; anything with output underneath has been dealt with.
 */
export function currentScreen(text: string, since = ''): string {
  return tail(afterMarker(text, since), 24);
}

/**
 * Poll until `test` returns true, or the deadline passes.
 * Returns the last capture either way — a failure message is only useful
 * with the screen that produced it.
 */
export async function pollPane(
  target: string,
  test: (capture: string) => boolean,
  maxMs: number,
  pollMs = 900
): Promise<PaneWait> {
  const deadline = Date.now() + maxMs;
  let capture = '';
  for (;;) {
    capture = await readPane(target);
    if (test(capture)) return { ok: true, capture };
    if (Date.now() >= deadline) return { ok: false, capture };
    await delay(pollMs);
  }
}

/**
 * Wait until the pane stops changing — the closest thing to "the TUI has
 * finished booting" that works across nine different CLIs. Capped, because
 * several of these draw a spinner forever and would never go quiet.
 */
export async function waitForQuiet(
  target: string,
  quietMs: number,
  maxMs: number
): Promise<string> {
  const deadline = Date.now() + maxMs;
  let previous = '';
  let stableSince = Date.now();
  for (;;) {
    const capture = await readPane(target, 200);
    if (capture !== previous) {
      previous = capture;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= quietMs) {
      return capture;
    }
    if (Date.now() >= deadline) return capture;
    await delay(600);
  }
}

/**
 * Answer the first-run workspace-trust dialog if one is on screen.
 *
 * Narrow by construction: it only fires on TRUST_DIALOG_PATTERNS (never on a
 * login or payment wall, which must stay BLOCKED), it presses `1` only when
 * the pane really shows an affirmative first option, and the directory it is
 * trusting is the empty temp dir this harness made moments ago.
 *
 * Without it the harness types its prompt straight into a modal, and a nonce
 * digit picks a menu item — which is how the first run "discovered" a codex
 * launch regression that was entirely its own fault.
 *
 * @returns true when a dialog was answered.
 */
export async function clearTrustGate(target: string, since = ''): Promise<boolean> {
  let answered = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const pane = afterMarker(await readPane(target), since);
    if (firstMatch(pane, TRUST_DIALOG_PATTERNS) === null) return answered;
    // BOTH conditions, not either. MEASURED 2026-08-11: deepseek's
    // onboarding screen also says "trust", has no selected affirmative
    // option, and a bare Enter into it kills the pane. If the harness cannot
    // read which option is highlighted, it does not press anything — the
    // case goes BLOCKED and says so.
    if (!SELECTED_AFFIRMATIVE.test(pane)) return answered;
    await tmux.execTmux(['send-keys', '-t', target, 'Enter']);
    answered = true;
    await waitForQuiet(target, 2_000, 15_000);
  }
  return answered;
}


/**
 * Type a prompt and wait for the answer, retyping ONCE. A TUI that was still
 * painting when the first line arrived can swallow it whole, and a retry is
 * cheaper — and far less misleading — than a spurious FAIL.
 */
export async function driveTurn(
  target: string,
  prompt: string,
  test: (capture: string) => boolean,
  budgetMs: number
): Promise<PaneWait> {
  const half = Math.min(45_000, Math.max(20_000, Math.floor(budgetMs / 2)));
  await typeLine(target, prompt);
  const first = await pollPane(target, test, half);
  if (first.ok) return first;
  // Only retype if the agent looks idle rather than mid-answer; a second
  // prompt landing inside a streaming reply confuses several TUIs.
  await waitForQuiet(target, 2_000, 15_000);
  if (test(await readPane(target))) return { ok: true, capture: '' };
  await typeLine(target, prompt);
  return pollPane(target, test, budgetMs - half);
}
