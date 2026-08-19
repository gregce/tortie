/**
 * Arming a resume on another machine (Phase 89).
 *
 * NOTHING HERE CONTACTS A MACHINE. The composer and the counting are pure, and
 * the one function that would send something takes a transport, so every case
 * below is driven from synthetic screens. That is the point: the property being
 * tested is that a command Tortie did not compose is never typed, and a test
 * that let one through to find out would be the defect it is testing for.
 */

import { describe, expect, it } from 'vitest';
import {
  RESUME_ARMED_NOT_PRESSED,
  RESUME_ARM_UNREADABLE,
  RESUME_NOT_COMPOSED,
  RESUME_NOT_LANDED,
  RESUME_TYPED_TWICE,
  armRemoteResume,
  armedResumeTokens,
  composeArmedResumeText,
  countOccurrences,
  decideArmLanding,
  type ArmRemoteResumeInput,
  type ArmTransport
} from '../remote-arm';

const ID = '11111111-2222-4333-8444-555555555555';
const BIN = '/Users/someone/.local/bin/claude';

function input(over: Partial<ArmRemoteResumeInput> = {}): ArmRemoteResumeInput {
  return {
    machineId: 'macpro',
    target: '$7',
    agent: 'claude',
    agentSessionId: ID,
    recordedResumeArgv: ['/usr/local/bin/claude', '--resume', ID],
    binOnMachine: BIN,
    ...over
  };
}

/**
 * A machine that is not there. `copies` is how many times a send lands on the
 * screen, so 2 is the double send the ledger row's guard exists to find.
 */
function fakeMachine(
  options: {
    copies?: number;
    failRead?: boolean;
    failSend?: boolean;
    screen?: string;
  } = {}
): { transport: ArmTransport; sends: number } {
  const state = { screen: options.screen ?? 'a prompt and nothing else\n', sends: 0 };
  const wire: ArmTransport = {
    readScreen: async () => {
      if (options.failRead === true) throw new Error('the machine did not answer');
      return state.screen;
    },
    sendText: async (text: string) => {
      state.sends += 1;
      if (options.failSend === true) throw new Error('the link dropped');
      for (let i = 0; i < (options.copies ?? 1); i += 1) {
        state.screen += `${text}\n`;
      }
    },
    wait: async () => {
      /* no clock in a unit test */
    }
  };
  return {
    transport: wire,
    get sends(): number {
      return state.sends;
    }
  };
}

describe('the token list Tortie composes from', () => {
  it('holds the registry template and the compiled flag presets', () => {
    const tokens = armedResumeTokens('claude');
    expect(tokens.has('--resume')).toBe(true);
    expect(tokens.has('--dangerously-skip-permissions')).toBe(true);
    // The slot itself is never a token: the id comes from the row.
    expect(tokens.has('<sessionId>')).toBe(false);
  });

  it('is empty for an agent the compiled build does not hold', () => {
    // An agent a person added in Settings has its flags in the overlay, and the
    // overlay is not read here on purpose.
    expect(armedResumeTokens('an-agent-somebody-added').size).toBe(0);
  });
});

describe('composing the one line', () => {
  it('puts the machine own path first and keeps the row own id', () => {
    const composed = composeArmedResumeText(input());
    expect(composed.refusal).toBeNull();
    expect(composed.text).toBe(`${BIN} --resume ${ID}`);
  });

  it('keeps a compiled launch flag the row recorded', () => {
    const composed = composeArmedResumeText(
      input({
        recordedResumeArgv: [
          '/usr/local/bin/claude',
          '--resume',
          ID,
          '--dangerously-skip-permissions'
        ]
      })
    );
    expect(composed.refusal).toBeNull();
    expect(composed.text).toBe(
      `${BIN} --resume ${ID} --dangerously-skip-permissions`
    );
  });

  it('refuses one word that is not in the compiled list', () => {
    const composed = composeArmedResumeText(
      input({
        recordedResumeArgv: ['/usr/local/bin/claude', '--resume', ID, '--rm-rf']
      })
    );
    expect(composed.refusal).toBe('not-composed');
    expect(composed.text).toBeNull();
    expect(composed.detail).toContain('--rm-rf');
  });

  it('refuses a folder, a name and an address, because none of them is a token', () => {
    for (const smuggled of ['/Users/someone/work', 'my-session', 'pop-os.tail1a2b.ts.net']) {
      const composed = composeArmedResumeText(
        input({
          recordedResumeArgv: ['/usr/local/bin/claude', '--resume', ID, smuggled]
        })
      );
      expect(composed.refusal).toBe('not-composed');
    }
  });

  it('refuses an agent the compiled registry does not hold', () => {
    const composed = composeArmedResumeText(input({ agent: 'an-agent-somebody-added' }));
    expect(composed.refusal).toBe('not-composed');
  });

  it('refuses a program path that is not absolute, and one with a foreign name', () => {
    expect(composeArmedResumeText(input({ binOnMachine: 'claude' })).refusal).toBe(
      'not-composed'
    );
    expect(
      composeArmedResumeText(input({ binOnMachine: '/usr/bin/curl' })).refusal
    ).toBe('not-composed');
  });

  it('refuses a command that lost its conversation id', () => {
    // A resume argv with no id can open the most recent conversation instead of
    // failing, which is somebody else work.
    const composed = composeArmedResumeText(
      input({ recordedResumeArgv: ['/usr/local/bin/claude', '--resume'] })
    );
    expect(composed.refusal).toBe('not-composed');
  });

  it('refuses a command that would carry a newline, because that is Enter', () => {
    const composed = composeArmedResumeText(
      input({
        agentSessionId: 'aaa\nbbb',
        recordedResumeArgv: ['/usr/local/bin/claude', '--resume', 'aaa\nbbb']
      })
    );
    expect(composed.refusal).toBe('not-one-line');
  });

  it('refuses a command longer than one screen', () => {
    const long = 'a'.repeat(1200);
    const composed = composeArmedResumeText(
      input({
        agentSessionId: long,
        recordedResumeArgv: ['/usr/local/bin/claude', '--resume', long]
      })
    );
    expect(composed.refusal).toBe('too-long');
  });
});

describe('counting copies on a screen', () => {
  it('counts nothing, one and two', () => {
    expect(countOccurrences('nothing here', 'claude --resume')).toBe(0);
    expect(countOccurrences('x claude --resume y', 'claude --resume')).toBe(1);
    expect(
      countOccurrences('claude --resume\nclaude --resume\n', 'claude --resume')
    ).toBe(2);
  });

  it('counts an empty needle as nothing rather than as everything', () => {
    expect(countOccurrences('anything', '')).toBe(0);
  });

  /**
   * THE REGRESSION THIS FILE EXISTS FOR AFTER THE FIX ROUND.
   *
   * MEASURED on this Mac, tmux 3.6a, a detached session 40 columns wide, the
   * command below typed with `send-keys -l` and read with `capture-pane -p -J`.
   * Under `/bin/sh` the screen came back as one row. Under `/bin/zsh` it came
   * back as three rows, because zsh wraps its own input line and writes its own
   * line break, so tmux never marks the row as wrapped and `-J` has nothing to
   * join. A contiguous search found 0 copies of a command that was plainly
   * there, and the person was told the conversation did not come back while it
   * had. The operator's own shell is zsh.
   */
  it('finds a command the shell wrapped across three rows', () => {
    const text = `${BIN} --resume ${ID}`;
    const wrapped =
      'Gregs-Mac-Pro% /Users/someone/.local/b\n' +
      'in/claude --resume 11111111-2222-4333-\n' +
      '8444-555555555555\n';
    // A contiguous search finds nothing on this screen, which is the defect.
    expect(wrapped).not.toContain(text);
    expect(countOccurrences(wrapped, text)).toBe(1);
  });

  it('finds two copies of a wrapped command, which is the double send', () => {
    const text = `${BIN} --resume ${ID}`;
    const wrapped =
      'Gregs-Mac-Pro% /Users/someone/.local/b\n' +
      'in/claude --resume 11111111-2222-4333-\n' +
      '8444-555555555555/Users/someone/.local\n' +
      '/bin/claude --resume 11111111-2222-433\n' +
      '3-8444-555555555555\n';
    expect(countOccurrences(wrapped, text)).toBe(2);
  });

  it('still reads an empty screen as no copies', () => {
    const text = `${BIN} --resume ${ID}`;
    expect(countOccurrences('Gregs-Mac-Pro%\n\n\n', text)).toBe(0);
  });
});

describe('what the two counts mean', () => {
  it('reads one new copy as armed', () => {
    expect(decideArmLanding(0, 1, false)).toBe('armed');
  });

  it('reads two or more new copies as twice', () => {
    expect(decideArmLanding(0, 2, false)).toBe('twice');
    expect(decideArmLanding(1, 4, false)).toBe('twice');
  });

  it('reads no new copy as absent, and a screen that lost one as absent too', () => {
    expect(decideArmLanding(0, 0, false)).toBe('absent');
    expect(decideArmLanding(2, 1, false)).toBe('absent');
  });

  it('reads a failed read as unknown rather than as absent', () => {
    // Telling a person a thing is not there when nobody could look is a
    // different claim from telling them it is not there.
    expect(decideArmLanding(0, 0, true)).toBe('unknown');
    expect(decideArmLanding(0, 5, true)).toBe('unknown');
  });
});

describe('the whole arm, against a machine that is not there', () => {
  it('types once and says the person presses Enter', async () => {
    const machine = fakeMachine({ copies: 1 });
    const out = await armRemoteResume(input(), machine.transport);
    expect(out.landing).toBe('armed');
    expect(out.refusal).toBeNull();
    expect(out.note).toBe(RESUME_ARMED_NOT_PRESSED);
    expect(out.before).toBe(0);
    expect(out.after).toBe(1);
    expect(out.text).toBe(`${BIN} --resume ${ID}`);
  });

  it('finds a second copy rather than assuming it away', async () => {
    const machine = fakeMachine({ copies: 2 });
    const out = await armRemoteResume(input(), machine.transport);
    expect(out.landing).toBe('twice');
    expect(out.note).toBe(RESUME_TYPED_TWICE);
    expect(out.after - out.before).toBe(2);
  });

  it('says the command is not there when it read the screen and it is not', async () => {
    const machine = fakeMachine({ copies: 0 });
    const out = await armRemoteResume(input(), machine.transport);
    expect(out.landing).toBe('absent');
    expect(out.note).toBe(RESUME_NOT_LANDED);
  });

  it('says it could not look when the read failed', async () => {
    const machine = fakeMachine({ failRead: true });
    const out = await armRemoteResume(input(), machine.transport);
    expect(out.landing).toBe('unknown');
    expect(out.note).toBe(RESUME_ARM_UNREADABLE);
  });

  it('still answers with a landing when the send itself threw', async () => {
    // A machine can take a command and lose the reply on the way back, so a
    // failed send is not the same as an unsent one and the screen decides.
    const machine = fakeMachine({ failSend: true, screen: 'a prompt\n' });
    const out = await armRemoteResume(input(), machine.transport);
    expect(out.landing).toBe('absent');
    expect(out.refusal).toBeNull();
  });

  it('sends nothing at all when it composed nothing', async () => {
    const machine = fakeMachine({ copies: 1 });
    const out = await armRemoteResume(
      input({
        recordedResumeArgv: ['/usr/local/bin/claude', '--resume', ID, '--rm-rf']
      }),
      machine.transport
    );
    expect(out.landing).toBeNull();
    expect(out.refusal).toBe('not-composed');
    expect(out.text).toBeNull();
    expect(out.note).toBe(RESUME_NOT_COMPOSED);
    expect(machine.sends).toBe(0);
  });
});
