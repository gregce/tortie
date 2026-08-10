/**
 * Registry integrity tests (Phase 10 — research 11).
 *
 * The registry is DATA the whole launch/detect/resume pipeline trusts; these
 * tests pin the invariants: all 12 entries present, capture-only IDEs never
 * launchable, every launchable entry has launch argv + icon key, resume
 * templates carry the session-id slot, and buildLaunchSpec's registry wiring
 * matches the hand-written claude/codex mechanics it must not disturb.
 */

import { describe, expect, it } from 'vitest';
import type { AgentRegistryId } from '@shared/types';
import {
  buildLaunchSpec,
  claudeResumeArgv,
  codexResumeArgv
} from '../../manifest/agents';
import {
  AGENT_IDS,
  AGENT_REGISTRY,
  agentBinaryName,
  DEFAULT_AGENT_ID,
  getLaunchableEntry,
  getRegistryEntry,
  LAUNCHABLE_AGENT_IDS,
  registryLaunchArgv,
  registryResumeArgv,
  SESSION_ID_SLOT
} from '../registry';

const ALL_IDS: AgentRegistryId[] = [
  'claude',
  'cursor',
  'codex',
  'gemini',
  'droid',
  'deepseek',
  'antigravity',
  'muse',
  'qwen',
  'pi',
  'cursoride',
  'copilotide'
];

describe('registry shape', () => {
  it('contains exactly the 12 researched agents, ids unique', () => {
    expect(AGENT_REGISTRY).toHaveLength(12);
    expect([...AGENT_IDS].sort()).toEqual([...ALL_IDS].sort());
    expect(new Set(AGENT_IDS).size).toBe(12);
  });

  it('every entry has displayName, ≥1 binary, and an icon key', () => {
    for (const entry of AGENT_REGISTRY) {
      expect(entry.displayName.length, entry.id).toBeGreaterThan(0);
      expect(entry.binaries.length, entry.id).toBeGreaterThan(0);
      expect(entry.iconKey.length, entry.id).toBeGreaterThan(0);
      expect(entry.storeDirs.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('default agent is explicit claude — never alphabetical', () => {
    expect(DEFAULT_AGENT_ID).toBe('claude');
    // The SpecStory bug gmux must not inherit: alphabetical-first would be
    // antigravity.
    expect([...AGENT_IDS].sort()[0]).toBe('antigravity');
  });
});

describe('capture-only IDE entries', () => {
  it.each(['cursoride', 'copilotide'] as const)('%s is never launchable', (id) => {
    const entry = getRegistryEntry(id);
    expect(entry.kind).toBe('ide');
    expect(entry.launchable).toBe(false);
    expect(entry.launch).toBeNull();
    expect(entry.versionProbe).toBeNull(); // store-existence only, no subprocess
    expect(entry.resume.strategy).toBe('session-file-harvest');
    expect(() => getLaunchableEntry(id as never)).toThrow(/capture-only/);
  });

  it('launchable ids are the 10 CLIs (no IDE pair)', () => {
    expect(LAUNCHABLE_AGENT_IDS).toHaveLength(10);
    expect(LAUNCHABLE_AGENT_IDS).not.toContain('cursoride');
    expect(LAUNCHABLE_AGENT_IDS).not.toContain('copilotide');
  });
});

describe('launchable entries', () => {
  it('every launchable entry has launch argv + icon key', () => {
    for (const id of LAUNCHABLE_AGENT_IDS) {
      const entry = getLaunchableEntry(id);
      expect(entry.launch.argv.length, id).toBeGreaterThanOrEqual(1);
      expect(entry.launch.argv[0], id).toBe(entry.binaries[0]);
      expect(entry.iconKey.length, id).toBeGreaterThan(0);
    }
  });

  it('every launchable entry except UNVERIFIED pi has a version probe', () => {
    for (const id of LAUNCHABLE_AGENT_IDS) {
      const entry = getLaunchableEntry(id);
      if (id === 'pi') expect(entry.versionProbe).toBeNull();
      else expect(entry.versionProbe, id).not.toBeNull();
    }
  });

  it('pi is flagged UNVERIFIED with no resume mechanics', () => {
    const pi = getRegistryEntry('pi');
    expect(pi.unverified).toBe(true);
    expect(pi.resume.strategy).toBe('none');
    expect(pi.resume.template).toEqual([]);
  });

  it('only pi is UNVERIFIED', () => {
    for (const entry of AGENT_REGISTRY) {
      expect(entry.unverified, entry.id).toBe(entry.id === 'pi');
    }
  });

  it('identity/version quirks match the research', () => {
    expect(getRegistryEntry('claude').versionProbe?.identitySubstring).toBe(
      '(Claude Code)'
    );
    expect(getRegistryEntry('codex').versionProbe?.fallbackArgs).toEqual(['-V']);
    expect(getRegistryEntry('droid').versionProbe?.postProcess).toBe(
      'strip-ansi-last-line'
    );
  });
});

describe('resume templates', () => {
  it('every flag-uuid template carries the session-id slot', () => {
    for (const entry of AGENT_REGISTRY) {
      if (entry.resume.strategy !== 'flag-uuid') continue;
      expect(entry.resume.template, entry.id).toContain(SESSION_ID_SLOT);
    }
  });

  it('codex + muse resume via SUBCOMMAND, antigravity via --conversation', () => {
    expect(getRegistryEntry('codex').resume.template[0]).toBe('resume');
    expect(getRegistryEntry('muse').resume.template[0]).toBe('resume');
    expect(getRegistryEntry('antigravity').resume.template[0]).toBe('--conversation');
    for (const id of ['claude', 'cursor', 'gemini', 'droid', 'deepseek', 'qwen'] as const) {
      expect(getRegistryEntry(id).resume.template[0], id).toBe('--resume');
    }
  });

  it('antigravity and pi are NOT reconstruction targets', () => {
    expect(getRegistryEntry('antigravity').reconstructionTarget).toBe(false);
    expect(getRegistryEntry('pi').reconstructionTarget).toBe(false);
  });
});

describe('argv helpers', () => {
  it('binary names differ from ids where the research says so', () => {
    expect(agentBinaryName('cursor')).toBe('cursor-agent');
    expect(agentBinaryName('antigravity')).toBe('agy');
    expect(agentBinaryName('claude')).toBe('claude');
  });

  it('registryResumeArgv agrees with the hand-written claude/codex builders', () => {
    const id = 'a3f0c9d2-1b2c-4d5e-8f90-0123456789ab';
    expect(registryResumeArgv('claude', id, ['--model', 'opus'], '/abs/claude')).toEqual(
      claudeResumeArgv(id, ['--model', 'opus'], '/abs/claude')
    );
    expect(registryResumeArgv('codex', id, [], '/abs/codex')).toEqual(
      codexResumeArgv(id, [], '/abs/codex')
    );
  });

  it('builds flag + subcommand + conversation resume argvs from data', () => {
    expect(registryResumeArgv('qwen', 'ID', ['--x'], '/abs/qwen')).toEqual([
      '/abs/qwen',
      '--resume',
      'ID',
      '--x'
    ]);
    expect(registryResumeArgv('muse', 'ID')).toEqual(['muse', 'resume', 'ID']);
    expect(registryResumeArgv('antigravity', 'ID')).toEqual([
      'agy',
      '--conversation',
      'ID'
    ]);
    expect(registryResumeArgv('pi', 'ID')).toEqual([]);
  });

  it('registryLaunchArgv substitutes the resolved binary', () => {
    expect(registryLaunchArgv('cursor', ['--y'], '/abs/cursor-agent')).toEqual([
      '/abs/cursor-agent',
      '--y'
    ]);
    expect(registryLaunchArgv('gemini')).toEqual(['gemini']);
  });
});

describe('buildLaunchSpec registry wiring', () => {
  it('claude keeps its pre-assigned uuid mechanics untouched', () => {
    const spec = buildLaunchSpec('claude', ['--model', 'opus'], '/abs/claude');
    expect(spec.idCapture).toBe('preassigned');
    expect(spec.agentSessionId).toBeDefined();
    expect(spec.argv).toEqual([
      '/abs/claude',
      '--session-id',
      spec.agentSessionId,
      '--model',
      'opus'
    ]);
    expect(spec.resumeArgv).toEqual([
      '/abs/claude',
      '--resume',
      spec.agentSessionId,
      '--model',
      'opus'
    ]);
  });

  it('codex keeps its rollout-watch mechanics untouched', () => {
    const spec = buildLaunchSpec('codex', [], '/abs/codex');
    expect(spec.idCapture).toBe('rollout-watch');
    expect(spec.argv).toEqual(['/abs/codex']);
    expect(spec.resumeArgv).toBeUndefined();
  });

  it('registry agents launch from registry data with store-watch capture', () => {
    const spec = buildLaunchSpec('gemini', ['--x'], '/abs/gemini');
    expect(spec.argv).toEqual(['/abs/gemini', '--x']);
    expect(spec.idCapture).toBe('store-watch');
    expect(spec.resumeStrategy).toBe('flag-uuid');
    expect(spec.resumeTemplate).toEqual(['--resume', SESSION_ID_SLOT]);
    expect(spec.resumeArgv).toBeUndefined(); // id unknown until harvested
    expect(spec.env).toBeUndefined();
  });

  it('cursor carries the FORCE_COLOR=1 env injection', () => {
    const spec = buildLaunchSpec('cursor', [], '/abs/cursor-agent');
    expect(spec.env).toEqual({ FORCE_COLOR: '1' });
    expect(spec.argv).toEqual(['/abs/cursor-agent']);
  });

  it('pi launches but has nothing to resume (UNVERIFIED upstream)', () => {
    const spec = buildLaunchSpec('pi', [], '/abs/pi');
    expect(spec.argv).toEqual(['/abs/pi']);
    expect(spec.idCapture).toBe('none');
    expect(spec.resumeStrategy).toBe('none');
  });

  it('every launchable registry agent builds a spec without throwing', () => {
    for (const id of LAUNCHABLE_AGENT_IDS) {
      if (id === 'claude' || id === 'codex') continue; // covered above
      const spec = buildLaunchSpec(id, [], `/abs/${agentBinaryName(id)}`);
      expect(spec.argv[0], id).toBe(`/abs/${agentBinaryName(id)}`);
    }
  });
});
