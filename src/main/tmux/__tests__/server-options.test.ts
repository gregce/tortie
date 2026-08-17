/**
 * The one option list, checked against the real conf in BOTH directions (Phase 69).
 *
 * WHY IN BOTH DIRECTIONS. A machine reached over a connection is booted with
 * `-f /dev/null`, which is what stops that machine's own configuration file being
 * read, and it therefore comes up with none of these options. So the list has to
 * hold every option the conf sets, and it has to hold nothing the conf does not.
 * One direction alone leaves the other half of the drift unguarded.
 *
 * Nothing here runs tmux. It reads `resources/gmux-tmux.conf` from disk, which is
 * the same file the app passes.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCROLLBACK_LINES } from '@shared/settings';
import {
  localReassertOptions,
  remoteBootOptions,
  runtimeValueOf,
  setOptionArgs,
  showOptionArgs,
  SERVER_OPTIONS
} from '../server-options';

const REPO = resolve(__dirname, '../../../..');
const CONF = join(REPO, 'resources', 'gmux-tmux.conf');

/** Every `set`, `set-option` and `setw` line in the conf. */
function confOptions(): { name: string; scope: string; value: string }[] {
  const out: { name: string; scope: string; value: string }[] = [];
  for (const raw of readFileSync(CONF, 'utf8').split('\n')) {
    const line = raw.trim();
    if (line.startsWith('#') || line.length === 0) continue;
    const m = /^set(?:-option|w)?\s+(-[A-Za-z]+)\s+(\S+)\s*(.*)$/.exec(line);
    if (m === null) continue;
    out.push({
      name: m[2] ?? '',
      scope: m[1] ?? '',
      value: (m[3] ?? '').trim().replace(/^"(.*)"$/, '$1')
    });
  }
  return out;
}

const conf = confOptions();

describe('the list and the conf cannot drift', () => {
  it('found options in the conf at all', () => {
    // A parser that matched nothing would leave every check below passing over an
    // empty list, which is the one way this file could stop working silently.
    expect(conf.length).toBeGreaterThan(10);
  });

  it('carries every option the conf sets', () => {
    const missing = conf
      .filter((entry) => !SERVER_OPTIONS.some((row) => row.name === entry.name))
      .map((entry) => entry.name);
    expect(missing).toEqual([]);
  });

  it('carries nothing the conf does not set', () => {
    const extra = SERVER_OPTIONS.filter(
      (row) => !conf.some((entry) => entry.name === row.name)
    ).map((row) => row.name);
    expect(extra).toEqual([]);
  });

  it('agrees with the conf on every scope flag', () => {
    // MEASURED on the operator's own server, 2026-08-17, read only:
    // `show-options -gv exit-empty` and `show-options -sv exit-empty` both answer
    // "off", while `show-options -sv mouse` fails with "no current session". So
    // `-s` reads only server options and a wrong flag on a read is a machine
    // reported as misconfigured while it is configured correctly.
    for (const row of SERVER_OPTIONS) {
      const entry = conf.find((e) => e.name === row.name);
      expect({ name: row.name, scope: row.scope }).toEqual({
        name: row.name,
        scope: entry?.scope
      });
    }
  });

  it('agrees with the conf on every value', () => {
    for (const row of SERVER_OPTIONS) {
      const entry = conf.find((e) => e.name === row.name);
      expect({ name: row.name, value: row.value }).toEqual({
        name: row.name,
        value: entry?.value
      });
    }
  });
});

describe('the five the local boot re-asserts', () => {
  it('is exactly what ab94847 asserted, in that order', () => {
    // The local sequence has to be byte for byte what it was, so the order is part
    // of the assertion and not only the set.
    expect(localReassertOptions().map((row) => row.name)).toEqual([
      'remain-on-exit',
      'exit-empty',
      'mouse',
      'copy-mode-position-format',
      'mode-style'
    ]);
  });

  it('carries the values ab94847 asserted', () => {
    expect(localReassertOptions().map((row) => row.value)).toEqual([
      'failed',
      'off',
      'off',
      '',
      'noattr,bg=default,fg=default'
    ]);
  });

  it('is selected from the one list rather than copied beside it', () => {
    for (const row of localReassertOptions()) {
      expect(SERVER_OPTIONS).toContain(row);
    }
  });
});

describe('what a machine gets, and what takes its value from Settings', () => {
  it('gives a machine every row, because -f /dev/null gives it none', () => {
    expect(remoteBootOptions()).toEqual(SERVER_OPTIONS);
  });

  it('takes exactly one row from Settings, being the scrollback depth', () => {
    const fromSettings = SERVER_OPTIONS.filter((row) => row.fromSettings === true);
    expect(fromSettings.map((row) => row.name)).toEqual(['history-limit']);
  });

  it('keeps the conf first boot default in step with the shared one', () => {
    // The conf's number is the first boot default and it has already moved once,
    // from 50,000 to 25,000 in Phase 13.7. A fresh install would otherwise run at
    // a different depth until the first settings write.
    const row = SERVER_OPTIONS.find((r) => r.name === 'history-limit');
    expect(Number(row?.value)).toBe(DEFAULT_SCROLLBACK_LINES);
  });

  it('uses the person value for that row and the conf literal for the rest', () => {
    for (const row of SERVER_OPTIONS) {
      expect(runtimeValueOf(row, 12_345)).toBe(
        row.fromSettings === true ? '12345' : row.value
      );
    }
  });
});

describe('the two argv shapes', () => {
  it('writes with the row own scope flag', () => {
    const exitEmpty = SERVER_OPTIONS.find((r) => r.name === 'exit-empty');
    expect(setOptionArgs(exitEmpty!, 'off')).toEqual([
      'set-option',
      '-s',
      'exit-empty',
      'off'
    ]);
  });

  it('reads back with the same flag plus v', () => {
    const mouse = SERVER_OPTIONS.find((r) => r.name === 'mouse');
    expect(showOptionArgs(mouse!)).toEqual(['show-options', '-gv', 'mouse']);
  });

  it('keeps an empty value as an empty argument', () => {
    const format = SERVER_OPTIONS.find(
      (r) => r.name === 'copy-mode-position-format'
    );
    expect(setOptionArgs(format!, '')).toEqual([
      'set-option',
      '-g',
      'copy-mode-position-format',
      ''
    ]);
  });
});
