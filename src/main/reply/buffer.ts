/**
 * THE ONE BUFFER HELPER (Phase 348, build/p348/SPEC.md D52): the one place in
 * main that loads a person's words into a tmux paste buffer and deletes one.
 *
 * Two verbs type a person's words as a paste, and both go through here, so
 * there is ONE spelling of the one sink a text has: the phone's message
 * (`say`, ./writer.ts, Phase 318) and the phone's paste (`paste`,
 * ../screen/paste.ts, Phase 348). Each calls {@link loadWords} BEFORE its one
 * fresh reading, so the one spawn after its final check is the paste list, and
 * {@link dropWords} in a `finally` on every path the paste did not take the
 * buffer (`paste-buffer -d` takes it on the path that did).
 *
 * THE WORDS' ONE SINK IS STANDARD INPUT. `load-buffer -b <name> -` reads the
 * text from stdin, so no element of an argv is ever derived from the words: a
 * failed tmux command's text holds its argv (research 135 §4.8), and an argv
 * shows in a process listing. The NAME is minted here, a fixed prefix and 16
 * random bytes, and is never the phone's write id or anything the phone sent.
 *
 * A LOAD THAT FAILS IS DROPPED HERE before the throw reaches the caller: tmux
 * may have taken the words before the client failed (a deadline that ended
 * the client mid-way), and the caller has no name to drop yet. So no path
 * leaves a person's words on the server.
 *
 * It logs nothing, reads no error's text and holds nothing.
 */

import { randomBytes } from 'node:crypto';

/** The message's buffers start so (Phase 318). */
export const SAY_BUFFER_PREFIX = 'tortie-say-';
/** The paste's buffers start so (Phase 348). */
export const PASTE_BUFFER_PREFIX = 'tortie-paste-';

/** The two prefixes a buffer this module mints may carry, and no other. */
export type WordsBufferPrefix = typeof SAY_BUFFER_PREFIX | typeof PASTE_BUFFER_PREFIX;

/** The spawned runner both callers hand in: production `execTmux`, with `{ stdin }` for the load. */
export type WordsRun = (args: readonly string[], options?: { stdin?: Buffer; timeoutMs?: number }) => Promise<string>;

/**
 * Load `text` into a buffer this module names, from standard input, and answer
 * the name: the prefix and 16 random bytes as lowercase hex. A load that fails
 * deletes that name before it rethrows.
 */
export async function loadWords(run: WordsRun, prefix: WordsBufferPrefix, text: string): Promise<string> {
  const name = prefix + randomBytes(16).toString('hex');
  let loaded = false;
  try {
    await run(['load-buffer', '-b', name, '-'], { stdin: Buffer.from(text, 'utf8') });
    loaded = true;
    return name;
  } finally {
    // The words leave the server on every path the load did not hand a name.
    if (!loaded) await dropWords(run, name);
  }
}

/** Delete the buffer `name` names. Its failure is swallowed: a buffer that is not there is the goal. */
export async function dropWords(run: WordsRun, name: string): Promise<void> {
  try {
    await run(['delete-buffer', '-b', name]);
  } catch {
    // Swallowed: nothing is read of why, and a buffer already gone is the goal.
  }
}
