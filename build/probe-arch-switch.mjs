#!/usr/bin/env node
/**
 * Seed the Architecture switch on in a probe's own scratch profile (Phase 200).
 *
 * WHY IT EXISTS. Phase 175 put the Architecture view behind a switch that ships
 * OFF, and a probe's profile is a fresh directory, so every Architecture
 * gesture a probe makes lands on a view that is not there. Nothing said so: the
 * 0.98.0 audit read P167's surface profile reporting all 18 Architecture opens
 * missing and had to work out that it was stale harness setup rather than a
 * broken view, and P165 fails its own drive leg on `.arch-map-open` for exactly
 * the same reason.
 *
 * It writes ONE file into a directory the probe made, under the harness
 * directory. It touches nothing under the person's home, reads no settings of
 * theirs, and never runs against a profile it was not handed.
 *
 * The shape is the settings store's own: a versioned envelope whose `settings`
 * member is merged over the defaults, so naming `arch` alone leaves every other
 * setting at its shipped value.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Turn the Architecture switch on in `profileDir`.
 *
 * @param {string} profileDir the probe's own userData directory
 * @param {Record<string, unknown>} [arch] fields merged into the arch choice, e.g. `{ wrapperPass: true }`
 * @returns {string} the file that was written
 */
export function seedArchSwitchOn(profileDir, arch = {}) {
  mkdirSync(profileDir, { recursive: true });
  const path = join(profileDir, 'settings.json');
  writeFileSync(
    path,
    `${JSON.stringify({
      version: 1,
      // The file's shape is the store's own, `{ version, settings }`; a flat
      // `{ arch }` at the top level reads as no settings at all. `arch` may
      // carry the Phase 257 `wrapperPass` switch beside the three fields.
      settings: { arch: { enabled: true, agentId: null, model: null, ...arch } }
    })}\n`,
    'utf8'
  );
  return path;
}
