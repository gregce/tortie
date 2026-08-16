/**
 * Direct tests for the pure launch decisions (Phase 42 stage 5).
 *
 * Until this stage every rule here lived inline in core.ts, where it could
 * only be exercised through a booted core, a live tmux server and a manifest.
 * These tests pin each decision on its own, with no process spawned and no
 * file written.
 */

import { describe, expect, it } from 'vitest';
import {
  buildLaunchSpec,
  buildRecoveryContract,
  launchProvenance,
  type AgentLaunchSpec,
  type ManifestSessionRecord
} from '../../manifest';
import type { SpecstoryCaptureRecord } from '../../specstory';
import {
  agentExtrasOf,
  agentNotFoundMessage,
  binaryCandidatesOf,
  interpreterMissingMessage,
  newSessionRecord,
  paneEnvFor,
  relaunchWrapped,
  resumeCaptureFor,
  snapshotRecipeOf,
  spawnArgvFor
} from '../launch-plan';

const AT = 1_700_000_000_000;

function record(extra: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  return {
    id: 's-1',
    name: 'work',
    tmuxName: 'work',
    projectPath: '/proj',
    cwd: '/proj',
    agent: 'claude',
    status: 'running',
    createdAt: AT,
    argv: ['/opt/bin/claude', '--session-id', 'abc'],
    lastSeen: AT,
    ...extra
  };
}

function captureRecord(
  extra: Partial<SpecstoryCaptureRecord> = {}
): SpecstoryCaptureRecord {
  return {
    enabled: true,
    bin: '/opt/specstory',
    binVersion: '1.2.3',
    provider: 'claude',
    exitCodeFidelity: 'collapsed',
    agentArgv: ['/opt/bin/claude', '--session-id', 'abc'],
    ...extra
  };
}

describe('snapshotRecipeOf', () => {
  it('carries every field a relaunch needs, verbatim from the row', () => {
    const rec = record({
      agentSessionId: 'abc',
      resumeArgv: ['/opt/bin/claude', '--resume', 'abc'],
      agentVersion: '2.0.0',
      specstory: captureRecord()
    });
    expect(snapshotRecipeOf(rec)).toEqual({
      name: 'work',
      tmuxName: 'work',
      projectPath: '/proj',
      cwd: '/proj',
      agent: 'claude',
      agentSessionId: 'abc',
      argv: ['/opt/bin/claude', '--session-id', 'abc'],
      resumeArgv: ['/opt/bin/claude', '--resume', 'abc'],
      agentVersion: '2.0.0',
      specstoryVersion: '1.2.3'
    });
  });

  it('writes null, never undefined, for the four optional facts', () => {
    const recipe = snapshotRecipeOf(record());
    expect(recipe.agentSessionId).toBeNull();
    expect(recipe.resumeArgv).toBeNull();
    expect(recipe.agentVersion).toBeNull();
    expect(recipe.specstoryVersion).toBeNull();
  });
});

describe('resumeCaptureFor', () => {
  const spec = (
    idCapture: AgentLaunchSpec['idCapture'],
    extra: Partial<AgentLaunchSpec> = {}
  ): AgentLaunchSpec => ({
    agent: 'claude',
    argv: ['/opt/bin/claude'],
    idCapture,
    ...extra
  });

  it('answers for every capture mode', () => {
    expect(resumeCaptureFor(spec('preassigned'))).toBe('armed');
    expect(resumeCaptureFor(spec('store-harvest'))).toBe('capturing');
    expect(resumeCaptureFor(spec('unsupported'))).toBe('unavailable');
    expect(resumeCaptureFor(spec('none'))).toBe('none');
  });

  it('judges a side command by whether it produced a resume argv', () => {
    expect(
      resumeCaptureFor(
        spec('preassigned-cmd', { resumeArgv: ['/opt/bin/cursor', '--resume', 'x'] })
      )
    ).toBe('armed');
    expect(resumeCaptureFor(spec('preassigned-cmd'))).toBe('unavailable');
  });
});

describe('agentExtrasOf', () => {
  it('prefers the recorded unwrapped agent argv under capture', () => {
    const rec = record({
      argv: ['/opt/specstory', 'run', 'claude', '-c', 'claude --model opus'],
      specstory: captureRecord({
        agentArgv: ['/opt/bin/claude', '--model', 'opus']
      })
    });
    expect(agentExtrasOf(rec)).toEqual(['--model', 'opus']);
  });

  it('falls back to the row argv when there is no capture record', () => {
    expect(agentExtrasOf(record())).toEqual(['--session-id', 'abc']);
  });

  it('falls back when the recorded agent argv is empty', () => {
    const rec = record({ specstory: captureRecord({ agentArgv: [] }) });
    expect(agentExtrasOf(rec)).toEqual(['--session-id', 'abc']);
  });
});

describe('relaunchWrapped', () => {
  it('substitutes the bare name inside the wrapped -c string', () => {
    const capture = captureRecord();
    const wrapped = ['/opt/specstory', 'run', 'claude', '-c', 'old'];
    const out = relaunchWrapped(wrapped, capture, 'claude');
    expect(out[0]).toBe('/opt/specstory');
    expect(out[1]).toBe('run');
    const inner = out[out.length - 1] ?? '';
    expect(inner).toContain('claude');
    expect(inner).not.toContain('/opt/bin/claude');
    expect(inner).toContain('--session-id');
  });

  it('keeps the original argv when the record cannot wrap', () => {
    const disabled = captureRecord({ enabled: false });
    const wrapped = ['/opt/specstory', 'run', 'claude', '-c', 'old'];
    expect(relaunchWrapped(wrapped, disabled, 'claude')).toBe(wrapped);
  });
});

describe('binaryCandidatesOf', () => {
  it('walks the whole merged list, in order (Phase 25.5)', () => {
    const merged = { binaries: ['codewhale', 'codew', 'deepseek'] };
    expect(binaryCandidatesOf('deepseek', merged)).toEqual([
      'codewhale',
      'codew',
      'deepseek'
    ]);
  });

  it('keeps id-as-binary for an id the table has never heard of', () => {
    expect(binaryCandidatesOf('mystery', null)).toEqual(['mystery']);
    expect(binaryCandidatesOf('empty', { binaries: [] })).toEqual(['empty']);
  });
});

describe('agentNotFoundMessage', () => {
  it('names the one candidate when there is one', () => {
    expect(agentNotFoundMessage(['claude'])).toBe(
      'Tortie looked for a program named claude on your login shell\'s PATH ' +
        'and in the places Tortie knows agents install themselves. It found ' +
        'nothing.'
    );
  });

  it('names every other candidate that was also tried', () => {
    expect(agentNotFoundMessage(['codewhale', 'codew', 'deepseek'])).toBe(
      'Tortie looked for a program named codewhale on your login shell\'s ' +
        'PATH and in the places Tortie knows agents install themselves. It ' +
        'also looked for codew and deepseek. It found nothing.'
    );
  });

  it('joins two extra candidates with the word and, not a comma', () => {
    expect(agentNotFoundMessage(['a', 'b'])).toContain('It also looked for b.');
  });

  it('carries no dash of any kind', () => {
    const text = agentNotFoundMessage(['claude', 'claude-code']);
    expect(text).not.toContain('—');
    expect(text).not.toContain('–');
  });
});

describe('interpreterMissingMessage', () => {
  const text = interpreterMissingMessage(
    '/Users/you/.npm-global/bin/claude',
    'node'
  );

  it('names the file and the interpreter', () => {
    expect(text).toBe(
      'The file at /Users/you/.npm-global/bin/claude is a script, not a ' +
        'program. Its first line asks for node, and node is not on the PATH ' +
        'this session would get. The session would open and close within a ' +
        'second, so Tortie did not start it.'
    );
  });

  it('names no install command, which is the point of the phase', () => {
    expect(text).not.toContain('npm install');
  });
});

describe('spawnArgvFor', () => {
  const argv = ['/opt/bin/claude', '--session-id', 'abc'];

  it('keeps the manifest argv untouched when there is no bare name', () => {
    expect(spawnArgvFor(argv, undefined, undefined)).toBe(argv);
  });

  it('substitutes argv[0] with the bare name for an uncaptured launch', () => {
    expect(spawnArgvFor(argv, 'claude', undefined)).toEqual([
      'claude',
      '--session-id',
      'abc'
    ]);
  });

  it('routes a captured launch through the wrap with the bare name inside', () => {
    const out = spawnArgvFor(argv, 'claude', captureRecord());
    expect(out[0]).toBe('/opt/specstory');
    const inner = out[out.length - 1] ?? '';
    expect(inner).toContain('claude');
    expect(inner).not.toContain('/opt/bin/claude');
  });
});

describe('newSessionRecord', () => {
  const shellSpec = buildLaunchSpec('shell', [], '/bin/zsh');
  const facts = {
    id: 'id-1',
    input: { name: 'a.b work', projectPath: '/proj', agent: 'shell' as const },
    cwd: '/proj/sub',
    spec: shellSpec,
    capture: undefined,
    agentVersion: null,
    binPath: undefined,
    cwdReal: '/real/proj/sub',
    projectReal: '/real/proj',
    now: AT
  };

  it('composes the durable row exactly as the create path always has', () => {
    const rec = newSessionRecord(facts);
    expect(rec).toEqual({
      id: 'id-1',
      name: 'a.b work',
      tmuxName: 'a-b work', // sanitized prediction, dedupe happens later
      projectPath: '/proj',
      cwd: '/proj/sub',
      agent: 'shell',
      status: 'running',
      createdAt: AT,
      argv: ['/bin/zsh'],
      lastSeen: AT,
      resumeCapture: 'none',
      agentContract: buildRecoveryContract(
        'shell',
        {
          bin: '/bin/zsh',
          cwdReal: '/real/proj/sub',
          projectReal: '/real/proj',
          agentVersion: null,
          at: AT
        },
        shellSpec
      ),
      resumeProvenance: launchProvenance(shellSpec, {
        cwd: '/real/proj/sub',
        at: AT,
        agentVersion: null
      })
    });
  });

  it('omits every optional key that is not known, rather than writing undefined', () => {
    const rec = newSessionRecord(facts);
    expect('agentSessionId' in rec).toBe(false);
    expect('resumeArgv' in rec).toBe(false);
    expect('env' in rec).toBe(false);
    expect('specstory' in rec).toBe(false);
    expect('agentVersion' in rec).toBe(false);
    expect('envPassthrough' in rec).toBe(false);
  });

  it('carries the spec optionals and the capture record when they exist', () => {
    const spec: AgentLaunchSpec = {
      agent: 'claude',
      argv: ['/opt/bin/claude', '--session-id', 'abc'],
      agentSessionId: 'abc',
      resumeArgv: ['/opt/bin/claude', '--resume', 'abc'],
      env: { FORCE_COLOR: '1' },
      idCapture: 'preassigned'
    };
    const capture = captureRecord();
    const rec = newSessionRecord({
      ...facts,
      input: { name: 'w', projectPath: '/proj', agent: 'claude' as const },
      spec,
      capture,
      agentVersion: '2.0.0',
      binPath: '/opt/bin/claude'
    });
    expect(rec.agentSessionId).toBe('abc');
    expect(rec.resumeArgv).toEqual(['/opt/bin/claude', '--resume', 'abc']);
    expect(rec.env).toEqual({ FORCE_COLOR: '1' });
    expect(rec.specstory).toBe(capture);
    expect(rec.agentVersion).toBe('2.0.0');
    expect(rec.resumeCapture).toBe('armed');
    expect(rec.agentContract?.bin).toBe('/opt/bin/claude');
  });

  // Phase 33. The row records the NAMES so a restore knows what to read from
  // the shell again. There is no field on the spec that could hold a value, so
  // the proof is structural as well as asserted.
  it('records the passthrough NAMES, and the record holds no value anywhere', () => {
    const spec: AgentLaunchSpec = {
      agent: 'claude',
      argv: ['/opt/bin/claude'],
      env: { FORCE_COLOR: '1' },
      envPassthrough: ['P33_A_NAME', 'P33_B_NAME'],
      idCapture: 'none'
    };
    const rec = newSessionRecord({ ...facts, spec });
    expect(rec.envPassthrough).toEqual(['P33_A_NAME', 'P33_B_NAME']);
    expect(JSON.stringify(rec)).not.toContain('P33_SENTINEL_VALUE');
  });
});

// ---------------------------------------------------------------------------
// paneEnvFor (Phase 33)
// ---------------------------------------------------------------------------

describe('paneEnvFor', () => {
  it('layers the row env, then the resolved values, then the stamps', () => {
    expect(
      paneEnvFor({ FORCE_COLOR: '1' }, { FIREWORKS_API_KEY: 'sk-live' }, 'sess-1')
    ).toEqual({
      FORCE_COLOR: '1',
      FIREWORKS_API_KEY: 'sk-live',
      GMUX_MANAGED: '1',
      GMUX_SESSION_ID: 'sess-1'
    });
  });

  it('works with no row env at all', () => {
    expect(paneEnvFor(undefined, {}, 'sess-2')).toEqual({
      GMUX_MANAGED: '1',
      GMUX_SESSION_ID: 'sess-2'
    });
  });

  // THE RULE THAT MATTERS. GMUX_SESSION_ID is the second source of session
  // identity, and a pane carrying another session's stamp is a session
  // claiming an identity that is not its own. The overlay loader refuses a
  // GMUX_ name in either list, so a hostile map cannot be produced through
  // configuration at all. This is the second answer to the same question.
  it('the stamps win over a hostile resolved map', () => {
    const hostile = {
      GMUX_SESSION_ID: 'some-other-session',
      GMUX_MANAGED: '0'
    };
    const out = paneEnvFor({ GMUX_SESSION_ID: 'and-another' }, hostile, 'mine');
    expect(out['GMUX_SESSION_ID']).toBe('mine');
    expect(out['GMUX_MANAGED']).toBe('1');
  });
});
