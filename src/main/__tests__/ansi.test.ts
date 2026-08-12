/**
 * The ANSI stripper is now one implementation with three export sites. These
 * tests assert both halves of that: the behaviour (including the two shapes
 * `agents/detection.ts`'s old private copy got WRONG), and the identity — if a
 * fourth copy ever appears behind one of these names, the identity assertions
 * fail before anyone has to notice by reading escape residue in a version
 * string (research 25 §3 B1).
 */

import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../ansi';
import { stripAnsi as agentsStripAnsi, extractVersion } from '../agents/detection';
import { stripAnsi as restoreStripAnsi } from '../restore/command';

describe('stripAnsi', () => {
  it('strips CSI, OSC (BEL- and ST-terminated) and bare two-byte escapes', () => {
    expect(stripAnsi('\u001b[1;32mhi\u001b[0m there\u001b[2K')).toBe('hi there');
    expect(stripAnsi('\u001b]0;title\u0007text')).toBe('text');
    expect(stripAnsi('\u001b]8;;http://x\u001b\\link\u001b]8;;\u001b\\')).toBe('link');
    expect(stripAnsi('\u001bMscrolled')).toBe('scrolled');
  });

  it('strips colon-separated SGR — the ITU-T T.416 form the weak copy missed', () => {
    expect(stripAnsi('\u001b[38:2:255:0:0mred\u001b[0m')).toBe('red');
  });

  it('leaves plain text alone', () => {
    expect(stripAnsi('claude --resume abc')).toBe('claude --resume abc');
  });
});

describe('one implementation, three export sites', () => {
  it('agents and restore re-export the same function object', () => {
    expect(agentsStripAnsi).toBe(stripAnsi);
    expect(restoreStripAnsi).toBe(stripAnsi);
  });

  it('extractVersion no longer returns escape residue for colon-SGR output', () => {
    expect(extractVersion('\u001b[38:2:0:200:0m2.1.4 (Droid)\u001b[0m\n')).toBe('2.1.4 (Droid)');
  });

  it('extractVersion survives an OSC title in the probe output', () => {
    expect(extractVersion('\u001b]0;droid\u0007droid 1.0.0\n')).toBe('droid 1.0.0');
  });
});
