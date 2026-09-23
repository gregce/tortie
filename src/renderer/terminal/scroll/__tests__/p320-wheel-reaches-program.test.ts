/**
 * Phase 320 — the wheel reaches a program on another machine that asked for
 * it.
 *
 * THE WHEEL WITH NO PANE HERE. `wheelReachesProgram` decides it from the mouse
 * mode xterm reports, and this file asks xterm ITSELF which modes send a wheel
 * report, so the rule cannot drift from the terminal it describes. `none` and
 * `x10` send nothing, and a wheel handed to xterm in either mode would come out
 * as `ESC O A`. The surface's own answer for each mode is pinned in
 * ./p95-scroll-stops.test.ts.
 *
 * WHAT THIS FILE IS NOT. It is not the app run. What a person's trackpad does
 * over a real Claude Code, here and on another machine, is `probe:p320`.
 *
 * Nothing about typing is here. The build round's two typing fixes, P2 and P3,
 * each made a typing scenario worse than before this phase, measured side by
 * side with the parent, and were removed whole with their tests
 * (build/p320/SPEC.md, "§As built — removed under his no-regression rule").
 * They are Phase 320.1's.
 */

import { describe, expect, it } from 'vitest';
import { Terminal } from '@xterm/xterm';
import type { IModes } from '@xterm/xterm';

const { wheelReachesProgram } = await import('../surface');

/**
 * One wheel up through xterm's own mouse service, which is the call
 * CoreBrowserTerminal makes when the wheel handler returns true. It is a
 * private member, read on purpose: the claim is about what xterm does, and an
 * upgrade that moves it should turn this red rather than leave the rule
 * describing a terminal that no longer exists.
 */
async function wheelReportFor(asked: string): Promise<{
  mode: IModes['mouseTrackingMode'];
  sent: string;
}> {
  const term = new Terminal({ cols: 80, rows: 24, allowProposedApi: true });
  try {
    await new Promise<void>((done) => {
      // The attach always puts xterm in the alternate buffer (TerminalPane).
      term.write(`\u001b[?1049h${asked}`, done);
    });
    const sent: string[] = [];
    const sub = term.onData((data) => sent.push(data));
    const core = (
      term as unknown as {
        _core: {
          coreMouseService: {
            triggerMouseEvent(event: {
              col: number;
              row: number;
              x: number;
              y: number;
              button: number;
              action: number;
            }): boolean;
          };
        };
      }
    )._core;
    // CoreMouseButton.WHEEL is 4 and CoreMouseAction.UP is 0 in xterm 6.
    core.coreMouseService.triggerMouseEvent({
      col: 10,
      row: 5,
      x: 0,
      y: 0,
      button: 4,
      action: 0
    });
    sub.dispose();
    return { mode: term.modes.mouseTrackingMode, sent: sent.join('') };
  } finally {
    term.dispose();
  }
}

describe('wheelReachesProgram, asked of xterm itself', () => {
  it.each([
    ['none', ''],
    ['x10', '\u001b[?9h'],
    ['vt200', '\u001b[?1000h\u001b[?1006h'],
    ['drag', '\u001b[?1002h\u001b[?1006h'],
    ['any', '\u001b[?1003h\u001b[?1006h']
  ] as const)(
    'is true for %s exactly when xterm sends a wheel report for it',
    async (name, asked) => {
      const { mode, sent } = await wheelReportFor(asked);
      expect(mode).toBe(name);
      const reported = sent.length > 0;
      // The report, when there is one, is the SGR wheel up and nothing else.
      if (reported) expect(sent).toBe('\u001b[<64;11;6M');
      expect([name, wheelReachesProgram(mode)]).toEqual([name, reported]);
    }
  );

  it('is false for x10, which is why the rule is not `mode !== none`', () => {
    // Red if the rule is written the way research 130 first wrote it.
    expect(wheelReachesProgram('x10')).toBe(false);
    expect(wheelReachesProgram('none')).toBe(false);
  });
});
