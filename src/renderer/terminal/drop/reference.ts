/**
 * Turning an absolute path into the text we insert.
 *
 * An agent prompt buffer is NOT a shell (research 16 §3). Claude accepts a
 * spaced path unquoted; Codex rejects it and keeps it as literal text; qwen,
 * gemini and codex all emit backslash escaping from their own paste parsers.
 * So:
 *   agent pane → backslash-escape only when the path contains whitespace,
 *                a backslash or a quote; send a plain path untouched
 *                (the widest VERIFIED form).
 *   shell pane → POSIX single-quoting, because a shell pane really is a shell.
 *
 * Unicode, emoji and CJK need nothing: the pty path is UTF-8-clean end to end
 * (research 16 §1.4). A \r or \n in a filename is the one hard rejection —
 * main copies those to a safe name before we ever see them.
 */

/** Characters that make a bare path ambiguous inside an agent's paste parser. */
const NEEDS_ESCAPE = /[\s\\'"]/;

/** Backslash-escape whitespace, backslashes and quotes. */
export function backslashEscape(path: string): string {
  return path.replace(/([\s\\'"])/g, '\\$1');
}

/** POSIX single-quoting: '…'\''…' — safe for every byte a shell can see. */
export function posixQuote(path: string): string {
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

/** The text to insert for one path in one target pane. */
export function referenceText(path: string, agent: string): string {
  if (agent === 'shell') return posixQuote(path);
  return NEEDS_ESCAPE.test(path) ? backslashEscape(path) : path;
}

/**
 * A path we refuse to insert verbatim: a CR/LF inside a bracketed paste can
 * submit half a prompt. Main rescues these into the drop store; this guard is
 * the belt to that suspenders (a rescue copy can fail).
 */
export function isUnsafeToPaste(path: string): boolean {
  return /[\r\n]/.test(path);
}
