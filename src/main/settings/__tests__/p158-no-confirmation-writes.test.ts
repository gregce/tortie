/**
 * The arch choice may never mint a confirmation (Phase 158).
 *
 * The charter's sharpest refusal on the Settings side: picking an agent to
 * fill in the architecture contract is an agreement about WHICH confirmed
 * agent runs, and it must never become the confirmation itself. A
 * confirmation record is written in exactly one place, the Settings then
 * Agents confirm flow, where a person reads the bytes out of band of any
 * agent turn (CLAUDE.md refusal eight). If the arch pass, the fold, the
 * options join or the settings store could reach the writer, an agent that
 * can edit settings.json could walk from a configuration change to a
 * running process with no person in between.
 *
 * So this test holds the wall mechanically, by scanning the tree:
 *
 *  1. `confirmConfigRow` and `forgetConfigRow` are named by NO file under
 *     src/main/settings, src/main/overview, src/main/arch or
 *     src/renderer/settings. The options join reads the gate through
 *     `configRowStatus` and that is a read.
 *  2. The writer's non test call sites across all of src/main are exactly
 *     the two known ones: the Agents confirm IPC and the startup smoke
 *     check of the seal. A third call site fails here and has to be argued
 *     into this list by name, in a review, on purpose.
 *
 * A scan is the right tool because the refusal is about who CAN call the
 * writer, not about what any one path does at runtime.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..', '..', '..');

function tsFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      out.push(...tsFilesUnder(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const WRITERS = ['confirmConfigRow', 'forgetConfigRow'];

describe('no confirmation record is written by the arch or fold surfaces', () => {
  const walledDirs = [
    join(SRC, 'main', 'settings'),
    join(SRC, 'main', 'overview'),
    join(SRC, 'main', 'arch')
  ];

  for (const dir of walledDirs) {
    it(`keeps the writers out of ${dir.slice(SRC.length + 1)}`, () => {
      for (const file of tsFilesUnder(dir)) {
        const code = readFileSync(file, 'utf8');
        for (const writer of WRITERS) {
          expect(
            code,
            `${file} names ${writer}, and a confirmation must only ever ` +
              'be written from the Agents confirm flow'
          ).not.toContain(writer);
        }
      }
    });
  }

  // The renderer half of the Agents confirm flow lives beside the arch and
  // fold sections, so the wall there is a named list rather than a bare
  // directory: the store carries the action, the Agents page calls the
  // action, and NOTHING ELSE on the settings surface may name either
  // writer. The arch and fold sections in particular never do.
  it('keeps the writers out of every renderer settings file but the Agents flow', () => {
    const allowed = ['ConfiguredAgents.tsx', 'settings-store.ts'];
    for (const file of tsFilesUnder(join(SRC, 'renderer', 'settings'))) {
      const name = file.split('/').pop() ?? '';
      if (allowed.includes(name)) continue;
      const code = readFileSync(file, 'utf8');
      for (const writer of WRITERS) {
        expect(
          code,
          `${file} names ${writer}, and only the Agents confirm flow may`
        ).not.toContain(writer);
      }
    }
  });
});

describe('the one writer has exactly the two known call sites', () => {
  it('finds confirmConfigRow called only from the confirm IPC and the smoke check', () => {
    const callers: string[] = [];
    for (const file of tsFilesUnder(join(SRC, 'main'))) {
      const code = readFileSync(file, 'utf8');
      if (/confirmConfigRow\(/.test(code)) callers.push(file.slice(SRC.length + 1));
    }
    expect(callers.sort()).toEqual([
      'main/config/confirm-smoke.ts',
      'main/config/confirm.ts',
      'main/config/ipc.ts'
    ]);
  });
});
