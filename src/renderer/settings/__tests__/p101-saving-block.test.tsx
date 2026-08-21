/**
 * PHASE 101. The Saving files block, and the paragraph that must appear at all
 * three doors.
 *
 * THE RULING THIS FILE MAKES CHECKABLE. Any sheet whose lines carry the folder
 * entry draws the paragraph saying what a replacement costs, whether the sheet
 * was opened by the Saving files block, by an ordinary re-confirm, or by the
 * Add a machine sheet. Main answers `writeHonesty` beside those lines, so the
 * answer is made in one place and no surface can decide it by matching a
 * prefix against a line. These tests hold that every one of the three surfaces
 * draws it when it is not null and draws nothing when it is.
 *
 * WHY THE SECOND DOOR MATTERS AT ALL. Once the folder is one of the fields a
 * row carries, a machines file an agent can write can put a folder into a row.
 * The row then reads changed and the ordinary re-confirm sheet is what a person
 * presses. A sheet that granted file replacement without saying so is the door
 * this phase would otherwise open in silence.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server rather than a mounted DOM. Effects do not run, which is what
 * makes the field's own read of the sheet absent here and deterministic.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MachineRowView } from '@shared/ipc';
import { AddMachineView } from '../AddMachine';
import { MachineRow } from '../MachineRow';
import { emptyForm } from '../machines-store';
import {
  BTN_ALLOW_WRITES,
  BTN_STOP_SAVING,
  SAVING_TITLE,
  savingOffExplain,
  savingOnLine,
  STOP_SAVING_EXPLAIN
} from '../machines-copy';

const HONESTY = 'Tortie replaces a file only after it has just read that file.';

function row(over: Partial<MachineRowView> = {}): MachineRowView {
  return {
    id: 'mac-pro',
    label: 'mac-pro',
    color: 'blue',
    host: '10.0.0.4',
    user: null,
    port: null,
    remoteTmuxPath: '/opt/homebrew/bin/tmux',
    state: 'confirmed',
    usable: true,
    hash: 'a'.repeat(64),
    confirmedHash: 'a'.repeat(64),
    confirmedAt: 0,
    confirmedLines: [],
    lines: ['Machine: 10.0.0.4'],
    refusal: null,
    warning: 'the warning main owns',
    writeRoot: null,
    writeHonesty: null,
    ...over
  };
}

/** The row, open, as static markup. */
function draw(over: Partial<MachineRowView> = {}): string {
  return renderToStaticMarkup(
    <MachineRow row={row({ state: 'changed', ...over })} honesty="the sealing sentence" />
  );
}

describe('the Saving files block, while Tortie may save nothing there', () => {
  const html = draw();

  it('says the state and what turning it on would mean', () => {
    expect(html).toContain(SAVING_TITLE);
    expect(html).toContain(savingOffExplain('mac-pro'));
  });

  it('offers the one button that reveals the folder field', () => {
    expect(html).toContain(BTN_ALLOW_WRITES);
    expect(html).toContain('data-machines-action="open-writes"');
  });

  it('offers no way to turn it off, because it is off', () => {
    expect(html).not.toContain(BTN_STOP_SAVING);
  });

  it('draws no honesty paragraph, because nothing grants replacement', () => {
    expect(html).not.toContain(HONESTY);
  });
});

describe('the Saving files block, once a folder is confirmed', () => {
  const html = draw({ writeRoot: '/Users/gdc', writeHonesty: HONESTY });

  it('names the folder and the machine', () => {
    expect(html).toContain(savingOnLine('/Users/gdc', 'mac-pro'));
  });

  it('says what turning it off costs, before the button that does it', () => {
    expect(html).toContain(STOP_SAVING_EXPLAIN);
    expect(html).toContain(BTN_STOP_SAVING);
    expect(html.indexOf(STOP_SAVING_EXPLAIN)).toBeLessThan(
      html.indexOf(BTN_STOP_SAVING)
    );
  });

  it('draws the paragraph that says what a replacement costs', () => {
    expect(html).toContain(HONESTY);
  });
});

describe('the ordinary re-confirm sheet, which is the second door', () => {
  it('draws the paragraph when the row carries a folder', () => {
    const html = draw({ writeRoot: '/Users/gdc', writeHonesty: HONESTY });
    expect(html).toContain('data-machine-write-honesty');
    // Twice on this row, once on the confirm sheet and once on the block, and
    // both are wanted. A person reads it wherever they are looking.
    expect(html.split(HONESTY).length - 1).toBe(2);
  });

  it('draws nothing when the row carries none', () => {
    const html = draw();
    expect(html).not.toContain('data-machine-write-honesty');
  });

  it('draws nothing when main did not answer the question', () => {
    // A build whose main is older than this phase sends no such field. The row
    // then draws neither sentence rather than guessing at one.
    const bare = row({ state: 'changed' });
    delete (bare as { writeHonesty?: string | null }).writeHonesty;
    const html = renderToStaticMarkup(
      <MachineRow row={bare} honesty="the sealing sentence" />
    );
    expect(html).not.toContain('data-machine-write-honesty');
  });
});

// ---------------------------------------------------------------------------
// The third door, being the Add a machine sheet
// ---------------------------------------------------------------------------

describe('the add sheet, which is the third door', () => {
  /** The add sheet with one outcome, drawn as static markup. */
  const addHtml = (writeHonesty: string | null): string =>
    renderToStaticMarkup(
      <AddMachineView
        machines={{
          rows: [],
          errors: [],
          directory: '/scratch/config',
          path: '/scratch/config/machines.json',
          present: true,
          honesty: 'the sealing sentence',
          warning: 'the warning main owns',
          ssh: { path: '/usr/bin/ssh', source: 'pinned' }
        }}
        form={emptyForm()}
        tailscale={null}
        tailscaleBusy={false}
        tailscaleReadAt={null}
        test={{
          started: {
            testId: 't-1',
            commandLine: 'a command line',
            sshPath: '/usr/bin/ssh'
          },
          savedId: null,
          draftId: 'mac-pro',
          draft: { host: '10.0.0.4', user: null, port: null, remoteTmuxPath: null },
          transcript: '',
          outcome: {
            testId: 't-1',
            class: 'ok',
            alarm: false,
            headline: 'This machine answered.',
            detail: 'the detail main composed',
            resolvedPath: '/opt/homebrew/bin/tmux',
            exitCode: 0,
            durationMs: 900,
            sheet: {
              hash: 'b'.repeat(64),
              lines: [
                'Machine: 10.0.0.4',
                'May replace files under this folder on that machine: /Users/gdc'
              ],
              warning: 'the warning main owns',
              writeHonesty
            }
          },
          running: false
        }}
        keyInstall={null}
        busy={false}
        error={null}
        onSetForm={() => undefined}
        onClose={() => undefined}
        onFindTailnet={() => undefined}
        onUsePeer={() => undefined}
        onStartTest={() => undefined}
        onSendInput={() => undefined}
        onCancelTest={() => undefined}
        onInstallKey={() => undefined}
        onAdd={() => undefined}
      />
    );

  it('draws the paragraph when the sheet grants file replacement', () => {
    const html = addHtml(HONESTY);
    expect(html).toContain(HONESTY);
    expect(html).toContain('data-machine-write-honesty');
  });

  it('draws nothing when the sheet grants none', () => {
    const html = addHtml(null);
    expect(html).not.toContain('data-machine-write-honesty');
  });
});
