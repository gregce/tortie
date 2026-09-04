/**
 * The live mirror of what the appearance applier last wrote (Phase 207).
 *
 * apply.ts is the ONLY writer, in the same posture as the work area font
 * store in ./work-fonts.ts: it already pulls the settings once at boot and
 * re-applies on every broadcast, so the publish sits beside the write. Two
 * readers subscribe because a custom property change cannot reach them on
 * its own: the terminal, whose xterm theme is an option object it must be
 * handed (src/renderer/terminal/theme.ts resolves it from here and from the
 * document), and Monaco, whose theme is defined once by name and redefined
 * from here when the frame moves (src/renderer/editor/monaco-theme.ts).
 *
 * It is a leaf module on purpose. apply.ts imports the terminal's resolver
 * to refresh live panes, and the resolver imports this store, so the store
 * cannot live in apply.ts without closing a cycle.
 *
 * Nothing here is persisted. The settings live in main's settings.json.
 */

import { create } from 'zustand';
import type { BaseScheme } from '@shared/settings';
import { WINDOW_BACKGROUND } from '@shared/window-chrome';

export interface ChromeThemeState {
  /**
   * The base in effect (Phase 213): dark, the shipped graphite, or light,
   * the paper. The terminal picks its constants and its contrast floor by
   * this, Monaco picks its theme by this, and the tree host and the Pierre
   * diff follow the root's color-scheme, which the applier writes beside it.
   */
  scheme: BaseScheme;
  /**
   * Every colour override in effect on the document root, token to CSS
   * value, the font tokens excluded. Empty at the shipped appearance.
   */
  overrides: Readonly<Record<string, string>>;
  /** The canvas in effect: the override when there is one, else the base. */
  canvas: string;
  /** Whether the text family is dark, decided by the rule in ./hue.ts. */
  textDark: boolean;
}

export const useChromeTheme = create<ChromeThemeState>()(() => ({
  scheme: 'dark',
  overrides: {},
  canvas: WINDOW_BACKGROUND,
  textDark: false
}));

/** apply.ts calls this once per settings change, before it refreshes panes. */
export function publishChromeTheme(next: ChromeThemeState): void {
  const prev = useChromeTheme.getState();
  if (
    prev.scheme === next.scheme &&
    prev.canvas === next.canvas &&
    prev.textDark === next.textDark &&
    JSON.stringify(prev.overrides) === JSON.stringify(next.overrides)
  ) {
    return;
  }
  useChromeTheme.setState(next);
}
