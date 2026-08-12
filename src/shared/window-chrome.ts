/**
 * The one colour the MAIN process is allowed to know.
 *
 * Guardrail 5 says every colour comes from src/renderer/styles/tokens.css.
 * `BrowserWindow({ backgroundColor })` is the one place that cannot obey it:
 * it is painted by the compositor before any renderer exists, so there is no
 * document to read a custom property from — and getting it wrong is the white
 * flash between window-open and first paint.
 *
 * So the value is stated once here, where both windows (src/main/index.ts and
 * src/main/settings/window.ts) import it, and tokens.css §1.1 carries a note
 * on `--bg-canvas` pointing back at this file. Two literals that had to agree
 * became one constant with a named counterpart. If `--bg-canvas` is ever
 * retuned, this is the second line to change — and the token now says so.
 */

/** Mirror of `--bg-canvas` in src/renderer/styles/tokens.css §1.1. */
export const WINDOW_BACKGROUND = '#131417';
