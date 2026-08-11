/**
 * Agent marks for NATIVE menus (DESIGN.md §3 — menus are macOS menus, so the
 * icon has to reach main as pixels, not as an <svg> React can mount).
 *
 * Each mark is rasterized once per app run into a 32×32 PNG data URL, which
 * main hands to nativeImage at scaleFactor 2 → 16pt, crisp on Retina.
 * Monochrome marks are painted flat black and flagged `template`, so macOS
 * owns the tint for light/dark, highlighted and DISABLED — which is what
 * makes a not-installed agent look properly grey instead of full-strength.
 *
 * Everything here is best-effort: a menu with no icons is a fine menu, a menu
 * that failed to open is not. Callers warm the cache on mount and read it
 * synchronously at click time (see src/renderer/app/new-session-menu.ts).
 */

import type { PopupMenuIcon } from '@shared/ipc';
import { agentSvgFor } from './AgentIcon';

/** Physical pixels; 16pt × 2 for Retina. */
const PX = 32;

const cache = new Map<string, PopupMenuIcon>();
const inflight = new Map<string, Promise<void>>();

function rasterize(key: string): Promise<void> {
  const { svg, monochrome } = agentSvgFor(key);
  // Standalone SVG has no inherited `color`; paint it explicitly so the alpha
  // channel (all a template image uses) is exactly the mark.
  const painted = svg
    .replace(/currentColor/g, '#000000')
    .replace('width="1em"', `width="${PX}"`)
    .replace('height="1em"', `height="${PX}"`);
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = (): void => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = PX;
        canvas.height = PX;
        const ctx = canvas.getContext('2d');
        if (ctx !== null) {
          ctx.drawImage(img, 0, 0, PX, PX);
          cache.set(key, {
            dataUrl: canvas.toDataURL('image/png'),
            template: monochrome
          });
        }
      } catch {
        // Canvas unavailable (jsdom, tainted context) — no icon, no drama.
      }
      resolve();
    };
    img.onerror = (): void => resolve();
    img.src = `data:image/svg+xml;base64,${btoa(
      String.fromCharCode(...new TextEncoder().encode(painted))
    )}`;
  });
}

/** Rasterize any marks not cached yet; resolves when the menu can be drawn. */
export async function warmAgentMenuIcons(keys: readonly string[]): Promise<void> {
  await Promise.all(
    [...new Set(keys)].map((key) => {
      if (cache.has(key)) return Promise.resolve();
      let job = inflight.get(key);
      if (job === undefined) {
        job = rasterize(key).finally(() => inflight.delete(key));
        inflight.set(key, job);
      }
      return job;
    })
  );
}

/** The cached mark, or undefined while it is still warming / unavailable. */
export function agentMenuIcon(key: string): PopupMenuIcon | undefined {
  return cache.get(key);
}
