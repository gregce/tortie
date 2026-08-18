/**
 * Phase 84, item 8 — the create sheet stops offering a machine that cannot
 * hold a session, without hiding it.
 *
 * THE DEFECT. `usable` says a person confirmed a machine. It does not say
 * Tortie has signed in to it in this run, and only the second answer decides
 * whether a create can succeed. So a person picked a machine, typed a name,
 * pressed Create and read a refusal that sent them back to Settings, which is
 * the screen they had just come from.
 *
 * WHAT THESE TESTS HOLD.
 *  - A machine that is not ready stays in the list, drawn off, with the reason
 *    in its own text. A vanished option teaches nothing.
 *  - `ready` absent reads as not ready, which is what a row composed before
 *    the field existed knew about itself.
 *  - The hint under the field is drawn once and only when at least one machine
 *    in the list is off.
 *  - The sheet still resets to This Mac on every opening. THE OPERATOR DECIDED
 *    ON 2026-08-18 THAT IT STAYS, and a builder who helpfully remembers the
 *    last machine has broken the phase.
 *
 * The environment is node, so the option list is read as static markup and the
 * reset is read out of the source. A live drive with one confirmed machine
 * that was never prepared is the Tier 2 probe in the phase report.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MachineRowView } from '@shared/ipc';

// The modal's module graph reaches the app store, whose slices read
// `window.gmux` while the store object is being created.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = {
    gmux: undefined,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
    clearTimeout
  };
});

import {
  MACHINE_NOT_SIGNED_IN_HINT,
  machineNotSignedInOption
} from '../machine-copy';
import { anyMachineNotReady, MachineOptions } from '../CreateSessionModal';

/** A confirmed row with quiet defaults, overridden per case. */
function row(over: Partial<MachineRowView>): MachineRowView {
  return {
    id: 'studio',
    label: 'Studio',
    color: 'green',
    host: 'studio.local',
    user: null,
    port: null,
    remoteTmuxPath: null,
    state: 'confirmed',
    usable: true,
    hash: 'abc123def456',
    confirmedHash: 'abc123def456',
    confirmedAt: 1,
    confirmedLines: [],
    lines: [],
    refusal: null,
    warning: 'w',
    ...over
  };
}

describe('the option for a machine that cannot hold a session', () => {
  it('stays in the list and is drawn off, with the reason in its text', () => {
    const html = renderToStaticMarkup(
      <MachineOptions rows={[row({ ready: false })]} />
    );
    expect(html).toContain(machineNotSignedInOption('Studio'));
    expect(html).toContain('disabled');
    expect(machineNotSignedInOption('Studio')).toBe('Studio (not signed in)');
  });

  it('reads an absent answer as not ready', () => {
    // A row composed before this field existed knew nothing about itself, and
    // the safe reading of nothing is that a create there would be refused.
    const html = renderToStaticMarkup(<MachineOptions rows={[row({})]} />);
    expect(html).toContain(machineNotSignedInOption('Studio'));
    expect(html).toContain('disabled');
  });

  it('draws a ready machine under its own label, with nothing added', () => {
    const html = renderToStaticMarkup(
      <MachineOptions rows={[row({ ready: true })]} />
    );
    expect(html).toContain('>Studio<');
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('not signed in');
  });
});

describe('the hint under the field', () => {
  it('is drawn when at least one machine in the list is off', () => {
    expect(anyMachineNotReady([row({ ready: true }), row({ ready: false })])).toBe(
      true
    );
    expect(anyMachineNotReady([row({})])).toBe(true);
  });

  it('is not drawn when every machine in the list can hold a session', () => {
    expect(
      anyMachineNotReady([
        row({ id: 'a', ready: true }),
        row({ id: 'b', ready: true })
      ])
    ).toBe(false);
  });

  it('names the one screen that fixes it', () => {
    expect(MACHINE_NOT_SIGNED_IN_HINT).toBe(
      'Tortie has not signed in to this machine in this run, so it cannot ' +
        'start a session there. Open Settings, then Machines, then press ' +
        'Prepare.'
    );
  });
});

describe('the reset the operator asked for', () => {
  it('still puts every opening of the sheet on This Mac', () => {
    // DECIDED BY THE OPERATOR, 2026-08-18. The last machine is not remembered
    // per project, and neither is the last folder, so one Cmd-T and one Return
    // cannot start a process on another computer. There is no DOM here to open
    // the sheet in, so the line itself is held.
    const source = readFileSync(
      resolve(import.meta.dirname, '../CreateSessionModal.tsx'),
      'utf8'
    );
    expect(source).toContain("setMachineId('local');");
    // And nothing reads a remembered machine back out of storage.
    expect(source).not.toContain('lastMachine');
    expect(source).not.toContain('gmux.machine.last');
  });
});
