/**
 * Which tabs get the HTML preview (Phase 20.5).
 *
 * The list itself is not here. It is `canPreviewPath` in
 * src/shared/preview-types.ts, shared with main's protocol handler so that
 * "what Tortie offers to render" and "what the handler will serve" cannot
 * drift into a tab that offers Preview and a handler that then refuses it.
 * Read that file for the rules, including the six patterns that must never
 * get a rendered view whatever the allowlist says.
 *
 * What is here is one question the panel asks about a TAB rather than about
 * a path.
 */

import { canPreviewPath } from '@shared/preview-types';

/**
 * Does this tab have a rendered form that is a web page?
 *
 * `openFromRequest` computes `html` once when the tab is created, from
 * `canPreviewPath`, the same way it computes `markdown`, `image` and `svg`.
 * So this reads the flag and asks nothing.
 *
 * The path fallback is kept for a caller that has a path and no tab, which is
 * every test in this module and nothing in the app. It is the same predicate,
 * so the two cannot give different answers.
 */
export function tabRendersHtml(tab: {
  path: string;
  html?: boolean;
}): boolean {
  return tab.html ?? canPreviewPath(tab.path);
}
