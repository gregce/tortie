/**
 * Phase 79.1. The block that offers to set up a key, drawn.
 *
 * What these tests hold:
 * - The block exists for exactly two answers, being the machine turning the
 *   sign in down and the machine refusing the connection. It does not exist
 *   for any other answer, even when a sheet is attached to one, because a
 *   password field under an answer this surface was not written for is a
 *   password field a person cannot judge.
 * - A surface that passes no install callback gets no block at all.
 * - Every line, the warning and every note come from main and are drawn
 *   unchanged. This file writes labels, one button and one hint.
 * - The button is off while the field is empty and while a call is in flight,
 *   and the reason it is off is written under it.
 * - The advice is drawn once. A refused install under a refused test would
 *   otherwise print the same paragraph twice, one line apart.
 * - What main answered stays on screen after the sheet has gone, which is
 *   what happens the moment the store starts the connection test again.
 *
 * WHAT IS NOT PROVEN HERE, and it is worth naming. The vitest environment is
 * node and there is no DOM in this repository's test setup, so nothing here
 * types into the field or presses the button. The clearing of the field is
 * proven by construction instead: the component takes no password from
 * outside, so the only copy that exists is the one it clears on the same tick
 * the call is made. That the STORE holds no password is measured, in
 * machines-store.test.ts.
 *
 * The fixtures below stand in for main's own strings. They are fixtures and
 * not pins. Main owns that copy and pins it on main's side, for the same
 * reason the connection test's headline and detail are pinned there.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  MachineKeyInstallResult,
  MachineKeySheet,
  MachineTestClass,
  MachineTestOutcome,
  MachineTestStarted
} from '@shared/ipc';
import { ConnectionTestView } from '../ConnectionTestView';
import { KeyInstall } from '../KeyInstall';
import { keySheetOf, type KeyInstallState } from '../machines-store';
import {
  BTN_INSTALL_KEY,
  INSTALLING_KEY,
  KEY_BLOCK_LABEL,
  KEY_DISABLED_REASON,
  KEY_FINGERPRINT_LABEL,
  KEY_LINES_LABEL,
  KEY_MADE_NEW,
  KEY_MADE_REUSED,
  KEY_PASSWORD_HINT,
  KEY_PASSWORD_LABEL,
  KEY_RESULT_LABEL,
  KEY_TRANSCRIPT_LABEL,
  KEY_WROTE_ADDED,
  KEY_WROTE_PRESENT,
  REMEDY
} from '../machines-copy';

const STARTED: MachineTestStarted = {
  testId: 't-9',
  commandLine: '/usr/bin/ssh -o BatchMode=yes 127.0.0.1 command -v tmux',
  sshPath: '/usr/bin/ssh'
};

/** Main's sheet, as a fixture. Every string on it is composed in main. */
const SHEET: MachineKeySheet = {
  hash: 'b3'.repeat(32),
  lines: [
    'Machine: gregs-mac-pro',
    'Signs in as: greg',
    'Writes this file on that machine: ~/.ssh/authorized_keys',
    'Keeps the private half of the key on this Mac, at: /Users/greg/' +
      'Library/Application Support/Tortie/gmux/machines/keys/machine-3f2a91c04d7b'
  ],
  warning:
    'Tortie will make a key for this machine and put its public half on that ' +
    'machine. The private half stays on this Mac in a file only your account ' +
    'can read.',
  notes: [
    'Turn on Remote Login on that machine first. A key on a machine that is ' +
      'not accepting connections still cannot sign in.',
    'The key has no passphrase. What protects the key is the file it is in, ' +
      'which only your account on this Mac can read.',
    'Tortie asks for that machine password once and sends it straight to the ' +
      'sign in program. It keeps no copy.',
    'Tortie adds one line to that file and changes nothing else in it.',
    'When the key is on the machine, Tortie tests the connection again and ' +
      'shows you what the machine answers.'
  ]
};

function outcome(over: Partial<MachineTestOutcome>): MachineTestOutcome {
  return {
    testId: 't-9',
    class: 'auth-refused',
    alarm: false,
    headline: 'That machine turned the sign in down.',
    detail: 'The machine answered and would not let Tortie in.',
    resolvedPath: null,
    exitCode: 255,
    durationMs: 1_100,
    sheet: null,
    keySheet: SHEET,
    ...over
  };
}

function installResult(
  over: Partial<MachineKeyInstallResult> = {}
): MachineKeyInstallResult {
  return {
    id: 'gregs-mac-pro',
    class: 'key-installed',
    alarm: false,
    headline: 'The key is on that machine.',
    detail:
      'Tortie added its key to that machine and is testing the connection now.',
    wrote: 'added',
    keyMade: true,
    fingerprint: 'SHA256:M3ZgqQ4b8mQe0Q0m4S2m1cQ0m4S2m1cQ0m4S2m1cQ0m',
    transcript: 'Password:\n__TORTIE_KEY__added__TORTIE_KEY__\n',
    durationMs: 2_140,
    ...over
  };
}

function state(over: Partial<KeyInstallState> = {}): KeyInstallState {
  return { savedId: null, running: false, result: null, ...over };
}

/** How react-dom/server writes a string into the markup. */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function has(html: string, text: string): boolean {
  return html.includes(esc(text));
}

function count(html: string, text: string): number {
  const needle = esc(text);
  let at = html.indexOf(needle);
  let n = 0;
  while (at !== -1) {
    n += 1;
    at = html.indexOf(needle, at + needle.length);
  }
  return n;
}

/** The install button's opening tag, so `disabled` can be read off it alone. */
function buttonTag(html: string): string {
  const at = html.indexOf('data-machines-action="install-key"');
  expect(at).toBeGreaterThan(-1);
  const open = html.lastIndexOf('<button', at);
  return html.slice(open, html.indexOf('>', at) + 1);
}

/** One connection test panel, with the key offered. */
function panel(
  over: Partial<MachineTestOutcome>,
  keyInstall: KeyInstallState | null = null
): string {
  return renderToStaticMarkup(
    <ConnectionTestView
      started={STARTED}
      transcript="greg@gregs-mac-pro: Permission denied (publickey)."
      outcome={outcome(over)}
      running={false}
      onSend={() => undefined}
      onCancel={() => undefined}
      keyInstall={keyInstall}
      onInstallKey={() => undefined}
    />
  );
}

describe('when the block exists at all', () => {
  it('is drawn for a machine that asked for a password', () => {
    // PHASE 79.1 FIX ROUND. This is the stock Mac with Remote Login on and no
    // key for Tortie on it, and it is the one answer where pressing the button
    // can succeed at once. The first build of this phase drew nothing here.
    const html = panel({ class: 'password-required' });
    expect(html).toContain('data-machines-key="1"');
    expect(html).toContain('data-machines-field="machine-password"');
    expect(has(html, KEY_BLOCK_LABEL)).toBe(true);
  });

  it('is drawn for a machine that turned the sign in down', () => {
    const html = panel({ class: 'auth-refused' });
    expect(html).toContain('data-machines-key="1"');
    expect(html).toContain('data-machines-field="machine-password"');
    expect(has(html, KEY_BLOCK_LABEL)).toBe(true);
  });

  it('is drawn for a machine that refused the connection', () => {
    // A person who has just turned on Remote Login is one step from needing
    // the key. Making them run the test a second time to be offered it is the
    // trip this rung exists to remove.
    const html = panel({ class: 'refused' });
    expect(html).toContain('data-machines-key="1"');
  });

  it('is drawn for no other answer, even when a sheet is attached', () => {
    const others: MachineTestClass[] = [
      'ok',
      'prepared',
      'cancelled',
      'not-resolved',
      'no-program',
      'host-key-changed',
      'unreachable',
      'client-missing',
      'timed-out',
      'unknown',
      'no-server',
      'version-unmeasured'
    ];
    for (const cls of others) {
      const html = panel({ class: cls });
      expect({ cls, block: html.includes('data-machines-key="1"') }).toEqual({
        cls,
        block: false
      });
      expect(html).not.toContain('data-machines-field="machine-password"');
    }
  });

  it('is drawn nowhere at all when the surface offers no key', () => {
    // A caller that passes no install callback is saying it does not offer
    // this, and it gets no field rather than a field that cannot be sent.
    const html = renderToStaticMarkup(
      <ConnectionTestView
        started={STARTED}
        transcript=""
        outcome={outcome({ class: 'auth-refused' })}
        running={false}
        onSend={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(html).not.toContain('data-machines-key="1"');
  });

  it('agrees with the one rule the store sends the hash by', () => {
    expect(keySheetOf(outcome({ class: 'password-required' }))).toEqual(SHEET);
    expect(keySheetOf(outcome({ class: 'auth-refused' }))).toEqual(SHEET);
    expect(keySheetOf(outcome({ class: 'refused' }))).toEqual(SHEET);
    expect(keySheetOf(outcome({ class: 'ok' }))).toBeNull();
    expect(keySheetOf(outcome({ class: 'auth-refused', keySheet: null }))).toBeNull();
    expect(keySheetOf(null)).toBeNull();
  });
});

describe('what a person reads before they type anything', () => {
  const html = panel({ class: 'auth-refused' });

  it('draws every line main composed, unchanged', () => {
    for (const line of SHEET.lines) expect(has(html, line)).toBe(true);
    expect(has(html, KEY_LINES_LABEL)).toBe(true);
  });

  it('draws main’s warning and every one of main’s notes', () => {
    expect(has(html, SHEET.warning)).toBe(true);
    for (const note of SHEET.notes) expect(has(html, note)).toBe(true);
  });

  it('says Remote Login comes before the key, in main’s first note', () => {
    // The order matters and the screen has to say so. A key on a machine that
    // is not accepting connections still cannot sign in.
    const first = html.indexOf(esc(SHEET.notes[0] ?? ''));
    const field = html.indexOf('data-machines-field="machine-password"');
    expect(first).toBeGreaterThan(-1);
    expect(first).toBeLessThan(field);
  });

  it('says what becomes of the password, beside the field', () => {
    expect(has(html, KEY_PASSWORD_LABEL)).toBe(true);
    expect(has(html, KEY_PASSWORD_HINT)).toBe(true);
  });

  it('collects the password in a password field that fills in nothing', () => {
    const at = html.indexOf('data-machines-field="machine-password"');
    const open = html.lastIndexOf('<input', at);
    const tag = html.slice(open, html.indexOf('>', at) + 1);
    expect(tag).toContain('type="password"');
    // react-dom/server writes this attribute in the camel case React uses.
    expect(tag).toContain('autoComplete="off"');
    expect(tag).not.toContain('type="text"');
  });
});

describe('the button', () => {
  it('is off while the field is empty, and says why', () => {
    const html = panel({ class: 'auth-refused' });
    expect(buttonTag(html)).toContain('disabled');
    expect(has(html, KEY_DISABLED_REASON)).toBe(true);
    expect(has(html, BTN_INSTALL_KEY)).toBe(true);
  });

  it('is off while a call is in flight, and says it is working', () => {
    const html = panel({ class: 'auth-refused' }, state({ running: true }));
    expect(buttonTag(html)).toContain('disabled');
    expect(has(html, INSTALLING_KEY)).toBe(true);
    // The reason a button is off belongs to the state where a person can do
    // something about it. While the call runs there is nothing to type.
    expect(has(html, KEY_DISABLED_REASON)).toBe(false);
  });
});

describe('what main answered', () => {
  it('draws main’s two sentences and the facts of the install', () => {
    const html = panel(
      { class: 'auth-refused' },
      state({ result: installResult() })
    );
    expect(has(html, KEY_RESULT_LABEL)).toBe(true);
    expect(has(html, 'The key is on that machine.')).toBe(true);
    expect(has(html, KEY_MADE_NEW)).toBe(true);
    expect(has(html, KEY_WROTE_ADDED)).toBe(true);
    expect(has(html, KEY_FINGERPRINT_LABEL)).toBe(true);
    expect(has(html, KEY_TRANSCRIPT_LABEL)).toBe(true);
    expect(has(html, '__TORTIE_KEY__added__TORTIE_KEY__')).toBe(true);
  });

  it('says which of the two things happened to the key and to the file', () => {
    const html = panel(
      { class: 'auth-refused' },
      state({ result: installResult({ keyMade: false, wrote: 'present' }) })
    );
    expect(has(html, KEY_MADE_REUSED)).toBe(true);
    expect(has(html, KEY_WROTE_PRESENT)).toBe(true);
    expect(has(html, KEY_MADE_NEW)).toBe(false);
    expect(has(html, KEY_WROTE_ADDED)).toBe(false);
  });

  it('gives a finished install no advice, because there is nothing to do', () => {
    // The surface starts the connection test itself and the answer a person
    // is waiting for is the machine's own.
    expect(REMEDY['key-installed']).toBeNull();
    const html = panel(
      { class: 'auth-refused' },
      state({ result: installResult() })
    );
    expect(html).toContain('data-key-class="key-installed"');
    expect(html).not.toContain('data-remedy-class="key-installed"');
  });

  it('stays on the screen after the sheet has gone', () => {
    // This is the state the moment the store starts the connection test
    // again. What Tortie did must not blink out of existence while the
    // machine is being asked whether it worked.
    const html = renderToStaticMarkup(
      <KeyInstall
        sheet={null}
        state={state({ result: installResult() })}
        adviceAbove={null}
        onInstall={() => undefined}
      />
    );
    expect(html).toContain('data-machines-key="1"');
    expect(has(html, 'The key is on that machine.')).toBe(true);
    expect(html).not.toContain('data-machines-field="machine-password"');
  });

  it('draws nothing at all with no sheet and no answer', () => {
    const html = renderToStaticMarkup(
      <KeyInstall
        sheet={null}
        state={null}
        adviceAbove={null}
        onInstall={() => undefined}
      />
    );
    expect(html).toBe('');
  });
});

describe('the advice under a refused install', () => {
  const REFUSED = REMEDY.refused ?? '';

  it('is Phase 79’s Remote Login sentence, and this rung writes no second one', () => {
    const html = panel(
      { class: 'auth-refused' },
      state({ result: installResult({ class: 'refused', wrote: null }) })
    );
    expect(has(html, 'Remote Login')).toBe(true);
    expect(count(html, REFUSED)).toBe(1);
  });

  it('is drawn once when the test above already gave it', () => {
    // The same paragraph twice, one line apart, is how a person learns to
    // stop reading the paragraph.
    const html = panel(
      { class: 'refused' },
      state({ result: installResult({ class: 'refused', wrote: null }) })
    );
    expect(count(html, REFUSED)).toBe(1);
  });
});
