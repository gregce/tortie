/**
 * Phase 350 — restore and resume in place arm a pi row without Tortie's inline
 * token while this Mac's scan does not read pi at the floor
 * (build/p350/SPEC.md D13, D16, D17; M2's finding that a restore arms before it
 * waits on the scan).
 *
 * The property this file exists for: NO RESTORE IS WORSE THAN TODAY. A row this
 * build recorded with the token straight after its binary is armed exactly as
 * the build before this phase would have armed it whenever the floor does not
 * hold, an unanswered scan included, so a restore pressed before the scan
 * answers comes up as today and a pi taken below 0.84.0 never stops after its
 * trust question; once the scan reads pi at the floor the token is armed as
 * recorded. Every arm of `armableResume` passes the strip, and resume in place
 * composes the HEAD row (D16) because it arms through the same function.
 *
 * tmux and snapshots are mocked (this is about the decision and the typed
 * text), as capture-rearm.test.ts does. The scan is REAL: a planted table whose
 * pi binary is a `/bin/sh` shim in a scratch folder over a faked login-shell
 * PATH, so `piInlineFloorFor(argv[0])` is read the way restore reads it and no
 * agent on this Mac can answer. The rows record that shim, the file the scan
 * read, as a row created on this Mac records the binary the create resolved.
 * Since his ruling of 2026-11-02 (R1) the shim is planted as npm lays pi out,
 * a link on the PATH to its package's `dist/cli.js`, because the floor holds
 * only inside pi's own package (p350-pi-package.test.ts holds the rest).
 *
 * THE FIX ROUND adds the verifiers' two regressions, each graded against the
 * parent's answer: a row recorded against a SECOND pi install, or against the
 * scanned file after it was rewritten, is armed without the token while the
 * scanned pi holds (a pi below 0.84.0 there would otherwise stop after its
 * trust question); and a person's own leading `--tui-mode regular`, from an
 * agents.json template that starts with it, is armed as recorded before the
 * scan answers, where only Tortie's copy is ever taken out.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestSessionRecord } from '../../manifest';
import { plantNpmPi } from '../../agents/__tests__/pi-install';

const scratch = mkdtempSync(join(tmpdir(), 'gmux-p350-restore-'));
const binDir = join(scratch, 'bin');
const extraDir = join(scratch, 'extra');
mkdirSync(binDir, { recursive: true });
mkdirSync(extraDir, { recursive: true });

/** Every `send-keys` the restore issues, so the armed text is readable. */
const sent: string[][] = [];

vi.mock('../../tmux', async () => {
  const errors = await vi.importActual<typeof import('../../tmux/errors')>('../../tmux/errors');
  return {
    ...errors,
    installUserPath: () => Promise.resolve(process.env['PATH'] ?? ''),
    createSession: () =>
      Promise.resolve({ sessionId: '$77', tmuxName: 'zz-p350-restore', cwd: '/tmp', panePid: 1234 }),
    execTmux: (args: string[]) => {
      sent.push([...args]);
      return Promise.resolve('');
    },
    managedPaneEnv: () => ({})
  };
});

vi.mock('../snapshots', () => ({ resolveSnapshot: () => null }));

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(binDir),
    extraBinDirs: () => [extraDir]
  };
});

const { armableResume, restoreSessionInTmux, withoutPiTokenBelowFloor } = await import('../restore');
const {
  detectionScanCount,
  listDetectedAgents,
  piInlineFloorFor,
  resetAgentTableSource,
  resetDetectionCache,
  setAgentTableSource
} = await import('../../agents/detection');
const { getRegistryEntry, SESSION_ID_SLOT } = await import('../../agents/registry');
const { composeArmedResumeText } = await import('../../machines/remote-arm');

const TOK = ['--tui-mode', 'regular'];
const versionFile = join(scratch, 'pi-version');
/** Its bytes; a reinstall writes others at the same path. */
const PI_TEXT = `#!/bin/sh\n/bin/cat '${versionFile}'\n`;
/**
 * The pi binary the scan resolves and reads, and the one every row below
 * records. Named `pi`, so resume in place's Rule 1 reads it as pi's own binary;
 * the PATH is the scratch folder alone. Planted as npm lays pi out (his ruling
 * of 2026-11-02, R1: the floor holds only inside pi's own package), so `PI` is
 * the link and the text is the package's `dist/cli.js`.
 */
const PI = plantNpmPi(scratch, PI_TEXT).bin;
/** A second pi install on this Mac, in a package of its own, which the scan never resolves. */
const SECOND = plantNpmPi(join(scratch, 'second'), PI_TEXT).bin;
const U = '019a0000-0000-7000-8000-000000000001';
const HEAD = [PI, ...TOK, '--session-id', U, '--model', 'm'];
const TODAY = [PI, '--session-id', U, '--model', 'm'];

let cwd = '';

beforeEach(() => {
  sent.length = 0;
  cwd = mkdtempSync(join(scratch, 'cwd-'));
  for (const name of ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_PROBES', 'GMUX_UPDATE_REHEARSAL']) {
    vi.stubEnv(name, undefined);
  }
  resetDetectionCache();
  setAgentTableSource(() => [
    { ...getRegistryEntry('pi'), binaries: ['pi'], extraProbeDirs: [], storeDirs: [] }
  ]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetDetectionCache();
  resetAgentTableSource();
});

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** Answer the one scan with pi at `band`. */
async function scanReads(band: string): Promise<void> {
  resetDetectionCache();
  writeFileSync(versionFile, `${band}\n`);
  await listDetectedAgents();
}

function piRow(resumeArgv: string[], patch: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  return {
    id: 'p350-pi',
    name: 'p350 pi',
    tmuxName: 'p350-pi',
    projectPath: cwd,
    cwd,
    agent: 'pi' as ManifestSessionRecord['agent'],
    status: 'restorable',
    createdAt: 1,
    lastSeen: 2,
    argv: resumeArgv,
    resumeArgv,
    agentSessionId: U,
    ...patch
  };
}

/** The text typed into the pane WITHOUT Enter: the armed resume command. */
function armedText(): string {
  const typed = sent.filter((a) => a[0] === 'send-keys' && a.includes('-l'));
  return typed[typed.length - 1]?.at(-1) ?? '';
}

// ---------------------------------------------------------------------------
// The strip itself
// ---------------------------------------------------------------------------

describe('withoutPiTokenBelowFloor', () => {
  it('takes the token out of indices 1 and 2 while the floor does not hold, an unanswered scan included', async () => {
    expect(piInlineFloorFor(PI)).toBe('unread');
    expect(withoutPiTokenBelowFloor(piRow(HEAD), [...HEAD])).toEqual(TODAY);
    await scanReads('0.83.0');
    expect(piInlineFloorFor(PI)).toBe('below');
    expect(withoutPiTokenBelowFloor(piRow(HEAD), [...HEAD])).toEqual(TODAY);
    await scanReads('not a version');
    expect(piInlineFloorFor(PI)).toBe('unread');
    expect(withoutPiTokenBelowFloor(piRow(HEAD), [...HEAD])).toEqual(TODAY);
  });

  it('keeps the token while the floor holds, and hands back the same array', async () => {
    for (const band of ['0.84.0', '0.99.2', '1.4.0']) {
      await scanReads(band);
      const argv = [...HEAD];
      expect(withoutPiTokenBelowFloor(piRow(HEAD), argv), band).toBe(argv);
    }
  });

  it('touches nothing but the place Tortie put the token, on a pi row on this Mac', () => {
    // The scan is unanswered, so every row below would be stripped if it qualified.
    const untouched: Array<[string, ManifestSessionRecord, string[]]> = [
      ['a row before this phase', piRow(TODAY), TODAY],
      ["a person's own --tui-mode regular after the id", piRow([PI, '--session-id', U, ...TOK]), [PI, '--session-id', U, ...TOK]],
      ["a person's own full screen after the id", piRow([PI, '--session-id', U, '--tui-mode', 'fullscreen']), [PI, '--session-id', U, '--tui-mode', 'fullscreen']],
      ['half the token', piRow([PI, '--tui-mode', 'fullscreen', '--session-id', U]), [PI, '--tui-mode', 'fullscreen', '--session-id', U]],
      ["another machine's row", piRow(HEAD, { machineId: 'mac-pro' }), HEAD],
      ['a codex row with the same words', { ...piRow(HEAD), agent: 'codex' }, HEAD],
      ['nothing to arm', piRow([]), []]
    ];
    for (const [name, rec, argv] of untouched) {
      const copy = [...argv];
      expect(withoutPiTokenBelowFloor(rec, copy), name).toBe(copy);
    }
    // `local` spelled out is this Mac.
    expect(withoutPiTokenBelowFloor(piRow(HEAD, { machineId: 'local' }), [...HEAD])).toEqual(TODAY);
  });

  it('starts no scan and waits on none', () => {
    withoutPiTokenBelowFloor(piRow(HEAD), [...HEAD]);
    expect(detectionScanCount()).toBe(0);
  });

  it('a row that records a second pi install loses the token though the scanned pi holds (the fix round)', async () => {
    await scanReads('1.4.0');
    expect(piInlineFloorFor(PI)).toBe('holds');
    expect(piInlineFloorFor(SECOND)).toBe('unread');
    const other = [SECOND, ...TOK, '--session-id', U, '--model', 'm'];
    expect(withoutPiTokenBelowFloor(piRow(other), [...other])).toEqual([SECOND, '--session-id', U, '--model', 'm']);
    // The scanned file's own row keeps it.
    const argv = [...HEAD];
    expect(withoutPiTokenBelowFloor(piRow(HEAD), argv)).toBe(argv);
  });

  it('so does a row of the scanned file once it has been rewritten since the scan read it (the fix round)', async () => {
    await scanReads('1.4.0');
    try {
      writeFileSync(PI, `${PI_TEXT}# reinstalled\n`);
      expect(piInlineFloorFor(PI)).toBe('unread');
      expect(withoutPiTokenBelowFloor(piRow(HEAD), [...HEAD])).toEqual(TODAY);
    } finally {
      writeFileSync(PI, PI_TEXT);
    }
  });

  it("a person's own leading --tui-mode regular is armed as recorded; only Tortie's copy comes out (the fix round)", () => {
    // An agents.json row whose resume.template leads with the two words.
    setAgentTableSource(() => [
      {
        ...getRegistryEntry('pi'),
        binaries: ['pi'],
        extraProbeDirs: [],
        storeDirs: [],
        resume: { ...getRegistryEntry('pi').resume, template: [...TOK, '--session-id', SESSION_ID_SLOT] }
      }
    ]);
    // The scan is unanswered, so Tortie's copy, if any, comes out.
    const own = [PI, ...TOK, '--session-id', U];
    const ownArgv = [...own];
    expect(withoutPiTokenBelowFloor(piRow(own), ownArgv)).toBe(ownArgv);
    const both = [PI, ...TOK, ...TOK, '--session-id', U];
    expect(withoutPiTokenBelowFloor(piRow(both), [...both])).toEqual(own);
  });

  it("a person's own launch flags put first and leading with the words are armed as recorded (the fix round)", () => {
    // An agents.json row that puts the person's launch flags BEFORE the
    // template; the launch argv records them after the id, where the create
    // composed them.
    setAgentTableSource(() => [
      {
        ...getRegistryEntry('pi'),
        binaries: ['pi'],
        extraProbeDirs: [],
        storeDirs: [],
        resume: { ...getRegistryEntry('pi').resume, resumeExtrasPosition: 'leading' }
      }
    ]);
    // The scan is unanswered. Recorded with no token of Tortie's: the person's pair stays.
    const mine = [PI, ...TOK, '--model', 'm', '--session-id', U];
    const mineArgv = [...mine];
    expect(withoutPiTokenBelowFloor(piRow(mine, { argv: [PI, '--session-id', U, ...TOK, '--model', 'm'] }), mineArgv)).toBe(mineArgv);
    // Tortie's copy before it: only Tortie's comes out.
    const both = [PI, ...TOK, ...TOK, '--session-id', U];
    expect(withoutPiTokenBelowFloor(piRow(both, { argv: [PI, ...TOK, '--session-id', U, ...TOK] }), [...both])).toEqual([PI, ...TOK, '--session-id', U]);
    // Tortie's copy, the person's leading flags something else: it comes out.
    const other = [PI, ...TOK, '--model', 'm', '--session-id', U];
    expect(withoutPiTokenBelowFloor(piRow(other, { argv: [PI, ...TOK, '--session-id', U, '--model', 'm'] }), [...other])).toEqual([PI, '--model', 'm', '--session-id', U]);
  });
});

// ---------------------------------------------------------------------------
// armableResume, the one decision point restore and resume in place read
// ---------------------------------------------------------------------------

describe('armableResume (D17)', () => {
  it('arms a HEAD row as today before the scan answers, and as recorded once it reads the floor', async () => {
    const before = await armableResume(piRow(HEAD));
    expect(before.argv).toEqual(TODAY);
    expect(before.captureDeclined).toBe(false);
    await scanReads('1.4.0');
    expect((await armableResume(piRow(HEAD))).argv).toEqual(HEAD);
    await scanReads('0.83.0');
    expect((await armableResume(piRow(HEAD))).argv).toEqual(TODAY);
  });

  it('the decline arm passes the strip too', async () => {
    const declined = await armableResume(piRow(HEAD), { withoutCapture: true });
    expect(declined.argv).toEqual(TODAY);
    expect(declined.captureDeclined).toBe(false);
  });

  it('a row recorded before this phase is armed byte for byte at every reading: restore never adds the token', async () => {
    expect((await armableResume(piRow(TODAY))).argv).toEqual(TODAY);
    for (const band of ['0.83.0', '0.99.2', '1.4.0']) {
      await scanReads(band);
      expect((await armableResume(piRow(TODAY))).argv, band).toEqual(TODAY);
    }
  });

  it('a second pi install is armed as today while the scanned pi holds (the fix round)', async () => {
    await scanReads('1.4.0');
    const other = [SECOND, ...TOK, '--session-id', U];
    expect((await armableResume(piRow(other))).argv).toEqual([SECOND, '--session-id', U]);
  });

  it("another agent's row is the parent's answer whatever pi reads", async () => {
    const claude = {
      ...piRow(['/usr/local/bin/claude', '--resume', U]),
      agent: 'claude' as const
    };
    expect((await armableResume(claude)).argv).toEqual(['/usr/local/bin/claude', '--resume', U]);
  });
});

// ---------------------------------------------------------------------------
// The typed command, through restore
// ---------------------------------------------------------------------------

describe('the restore types', () => {
  it("before the scan answers: no token, and the restore's own version wait starts the scan only after the arm (M2)", async () => {
    const out = await restoreSessionInTmux(piRow(HEAD, { agentVersion: '1.4.0' }));
    expect(out.kind).toBe('armed');
    const text = armedText();
    expect(text).toContain(`--session-id ${U}`);
    expect(text).not.toContain('--tui-mode');
    // The row records a version, so restore waited on the scan for its drift
    // sentence, AFTER it had decided what to arm.
    expect(detectionScanCount()).toBe(1);
  });

  it('after a scan that reads pi at the floor: the token straight after the binary', async () => {
    await scanReads('1.4.0');
    const out = await restoreSessionInTmux(piRow(HEAD));
    expect(out.kind).toBe('armed');
    expect(armedText()).toContain(`${PI} --tui-mode regular --session-id ${U} --model m`);
  });

  it('after a scan that reads pi below the floor: no token', async () => {
    await scanReads('0.83.0');
    await restoreSessionInTmux(piRow(HEAD));
    expect(armedText()).toContain(`${PI} --session-id ${U} --model m`);
    expect(armedText()).not.toContain('--tui-mode');
  });
});

// ---------------------------------------------------------------------------
// Resume in place composes by Rule 1 over what armableResume answered (D16)
// ---------------------------------------------------------------------------

describe("resume in place's composition", () => {
  const compose = (argv: string[]) =>
    composeArmedResumeText({
      machineId: 'local',
      target: '$7',
      agent: 'pi',
      agentSessionId: U,
      recordedResumeArgv: argv,
      binOnMachine: argv[0] ?? ''
    });

  it('composes a HEAD row with the token while the floor holds, and without it while not', async () => {
    await scanReads('1.4.0');
    const held = compose((await armableResume(piRow([PI, ...TOK, '--session-id', U]))).argv);
    expect(held.refusal).toBeNull();
    expect(held.text).toBe(`${PI} --tui-mode regular --session-id ${U}`);

    await scanReads('0.83.0');
    const below = compose((await armableResume(piRow([PI, ...TOK, '--session-id', U]))).argv);
    expect(below.refusal).toBeNull();
    expect(below.text).toBe(`${PI} --session-id ${U}`);
  });
});
