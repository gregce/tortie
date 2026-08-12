/**
 * The name gmux registers its Monaco theme under.
 *
 * It lives in a leaf module of its own for one reason: `monaco-impl.ts`
 * DEFINES the theme and `MonacoHost.tsx` REQUESTS it, but monaco-impl is
 * deliberately behind a dynamic import (it is its own vite chunk, plus worker
 * assets — see monaco-loader.ts), so the host cannot import a value from it
 * without dragging all of Monaco into the main renderer bundle. The host
 * therefore used to pass the string literal `'gmux-dark'` (research 25 §3,
 * Tier 3), and a rename on the defining side would have left it asking for a
 * theme nobody registered — which Monaco answers by silently falling back to
 * its own light `vs`, i.e. a white editor inside a dark app.
 *
 * Unrelated to `pierre/theme-bridge.ts`'s `GMUX_THEME_NAME` despite the equal
 * string: that one names a Shiki/Pierre theme in a different registry.
 */
export const GMUX_MONACO_THEME = 'gmux-dark';
