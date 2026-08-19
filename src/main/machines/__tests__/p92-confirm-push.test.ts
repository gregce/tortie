/**
 * Phase 92 fix round — a confirmation reaches the window.
 *
 * THE BUG, measured twice on a real Mac. A person added their first machine and
 * confirmed it. The home screen's "open a folder on another machine" row did not
 * appear until Tortie was restarted. The window is pushed by
 * `onMachineStateChanged`, which listened to the link and to `machines.json`. A
 * confirmation is written to `<userData>/gmux/config-confirmations.json`, which
 * is neither, so the window kept the answer it was given before the button was
 * pressed, and that answer was `refused`.
 *
 * What these tests hold:
 * - Recording a confirmation fires the listeners.
 * - Withdrawing one fires them too, and a withdrawal of something that was never
 *   recorded fires nothing.
 * - `onMachineStateChanged` is one of those listeners, so the window is pushed.
 *
 * NOTHING HERE STARTS ANYTHING. `safeStorage` is faked exactly as
 * `confirm.test.ts` fakes it, no machine is contacted and no process is spawned.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

const MARKER = '[tortie-test-key]';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

const {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine,
  forgetMachine,
  onMachineConfirmationsChanged
} = await import('../confirm');
const { onMachineStateChanged } = await import('../machine-state');

const ID = 'mac-pro';
const FIELDS = {
  host: 'mac-pro.tail1a2b.ts.net',
  user: 'greg',
  port: null,
  remoteTmuxPath: null
};

function confirm(): void {
  const summary = describeMachine(ID, FIELDS);
  confirmMachine(ID, FIELDS, {
    acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
    hashRead: summary.hash,
    linesRead: summary.lines
  });
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-p92-confirm-push-'));
  mkdirSync(join(userData, 'gmux'), { recursive: true });
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

describe('a machine confirmation tells the rest of the app', () => {
  it('fires when a confirmation is recorded', () => {
    let fired = 0;
    const off = onMachineConfirmationsChanged(() => {
      fired += 1;
    });
    confirm();
    off();
    expect(fired).toBe(1);
  });

  it('fires when a confirmation is withdrawn, and not when there was none', () => {
    confirm();
    let fired = 0;
    const off = onMachineConfirmationsChanged(() => {
      fired += 1;
    });
    forgetMachine('a-machine-nobody-confirmed');
    expect(fired).toBe(0);
    forgetMachine(ID);
    off();
    expect(fired).toBe(1);
  });

  it('stops firing after the subscription is dropped', () => {
    let fired = 0;
    const off = onMachineConfirmationsChanged(() => {
      fired += 1;
    });
    off();
    confirm();
    expect(fired).toBe(0);
  });

  it('pushes the window, which is the defect this closes', () => {
    let pushes = 0;
    const off = onMachineStateChanged(() => {
      pushes += 1;
    });
    confirm();
    off();
    expect(pushes).toBe(1);
  });
});
