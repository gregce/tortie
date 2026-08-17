/**
 * Registry integrity tests (Phase 10 — research 11).
 *
 * The registry is DATA the whole launch/detect/resume pipeline trusts; these
 * tests pin the invariants: all 13 entries present, capture-only IDEs never
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
  agentBinaryCandidates,
  agentBinaryName,
  DEFAULT_AGENT_ID,
  DEFAULT_MULTILINE_KEY,
  getLaunchableEntry,
  getRegistryEntry,
  LAUNCHABLE_AGENT_IDS,
  LF,
  multilineKeyFor,
  multilineKeyTable,
  preAssignFlag,
  registryLaunchArgv,
  registryResumeArgv,
  SESSION_ID_SLOT
} from '../registry';
import { registerAgentsIpc } from '../index';
// Phase 42 stage 1: handlers registered through typed-ipc refuse untrusted
// senders, so driving one takes a trusted fake event.
import { trustedInvokeEvent } from '../../security/__tests__/trusted-test-sender';

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
  'grok',
  'cursoride',
  'copilotide'
];

describe('registry shape', () => {
  it('contains exactly the 13 researched agents, ids unique', () => {
    expect(AGENT_REGISTRY).toHaveLength(13);
    expect([...AGENT_IDS].sort()).toEqual([...ALL_IDS].sort());
    expect(new Set(AGENT_IDS).size).toBe(13);
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

  it('launchable ids are the 11 CLIs (no IDE pair)', () => {
    expect(LAUNCHABLE_AGENT_IDS).toHaveLength(11);
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

  it('every launchable entry has a version probe — including pi', () => {
    for (const id of LAUNCHABLE_AGENT_IDS) {
      expect(getLaunchableEntry(id).versionProbe, id).not.toBeNull();
    }
    // `pi -v` → "0.84.1". The registry claimed "no version command is
    // confirmed upstream"; one --help would have caught it (research 22 §5).
    expect(getRegistryEntry('pi').versionProbe?.args).toEqual(['-v']);
  });

  it('pi resumes by re-passing the SAME --session-id it launched with', () => {
    const pi = getRegistryEntry('pi');
    // The headline correction: `/** No resume mechanics exist (pi v1). */`
    // was false. --session-id is idempotent, so launch argv === resume argv.
    expect(pi.resume.strategy).toBe('flag-uuid');
    expect(pi.resume.template).toEqual(['--session-id', SESSION_ID_SLOT]);
    expect(pi.resume.idCapture).toEqual({
      mode: 'pre-assign',
      launchFlag: ['--session-id']
    });
    expect(pi.unverified).toBe(false);
    // Its cwd is load-bearing: from the wrong directory --session-id opens a
    // new EMPTY session under the same id, silently.
    expect(pi.resume.requiresOriginalCwd).toBe(true);
  });

  it('droid is the only docs-only row left', () => {
    for (const entry of AGENT_REGISTRY) {
      expect(entry.unverified, entry.id).toBe(entry.id === 'droid');
    }
    // …and an unverified row must not guess a pre-assignment flag onto a
    // launch argv: a wrong one is a dead pane.
    expect(getRegistryEntry('droid').resume.idCapture.mode).toBe('unverified');
    expect(preAssignFlag('droid')).toBeNull();
  });

  it('identity/version quirks match the research', () => {
    expect(getRegistryEntry('claude').versionProbe?.identitySubstring).toBe(
      '(Claude Code)'
    );
    // Phase 59: grok is the second row with an identity substring. Its
    // distilled version is the WHOLE first line of `grok --version`, and
    // flags.ts's helpVerifiedVersion must match it byte for byte.
    expect(getRegistryEntry('grok').versionProbe?.identitySubstring).toBe('grok ');
    expect(getRegistryEntry('grok').versionProbe?.args).toEqual(['--version']);
    // Phase 59 fix round: while grok's first-run "Help improve Grok" banner
    // is on screen the reply never paints, and its buttons are mouse-only.
    // This env delta keeps the banner out of every Tortie pane, at create
    // and (via the persisted manifest row) at restore. Removing it revives
    // a session that looks mute until the banner is clicked.
    expect(getLaunchableEntry('grok').launch.env).toEqual({
      GROK_PRIVACY_NOTICE_ROLLOUT: '0'
    });
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

  /**
   * The audit found TWO templates that produce a DEAD PANE, and both were
   * verb errors a shape check waves through: pi's empty template and
   * deepseek's `--resume`, which exits RC=2 because resume is a SUBCOMMAND.
   * So assert the literal first token per agent, not "it has a slot".
   */
  it('pins the resume VERB per agent — a wrong one is a dead pane', () => {
    const VERB: Record<string, string> = {
      claude: '--resume',
      cursor: '--resume',
      codex: 'resume', // subcommand
      gemini: '--resume',
      droid: '--resume',
      deepseek: 'resume', // subcommand — `--resume <id>` exits RC=2
      antigravity: '--conversation',
      muse: 'resume', // subcommand
      qwen: '--resume',
      pi: '--session-id', // idempotent: the flag it launched with
      grok: '--resume' // launch flag is --session-id; the two differ, unlike pi
    };
    for (const id of LAUNCHABLE_AGENT_IDS) {
      expect(getRegistryEntry(id).resume.template[0], id).toBe(VERB[id]);
    }
  });

  /**
   * The invariant that would have failed on pi from day one. Under the
   * corrected data NO installed agent genuinely lacks resume — 'none' means
   * "this agent has no conversation id at all", never "gmux has not built
   * capture yet", which is what idCapture records.
   */
  it('no launchable agent claims resume strategy none', () => {
    const GENUINELY_NONE: readonly string[] = []; // empty, and should stay so
    for (const id of LAUNCHABLE_AGENT_IDS) {
      if (GENUINELY_NONE.includes(id)) continue;
      expect(getRegistryEntry(id).resume.strategy, id).toBe('flag-uuid');
    }
  });

  /**
   * The schema gap that CAUSED the bug: muse and qwen were 'flag-uuid',
   * indistinguishable from claude's pre-assigned --session-id, so
   * buildLaunchSpec had no data to act on and defaulted them into a branch
   * nobody had implemented. Every launchable row must now say how its id is
   * obtained, and only a row that has never been exercised may say 'no idea'.
   */
  it('every launchable agent records HOW its id is obtained', () => {
    for (const id of LAUNCHABLE_AGENT_IDS) {
      const capture = getRegistryEntry(id).resume.idCapture;
      expect(capture.mode, id).not.toBe('none');
      if (capture.mode === 'unverified') {
        // Only droid, and only because it is not installed anywhere.
        expect(id).toBe('droid');
        expect(capture.note.length).toBeGreaterThan(0);
      }
      if (capture.mode === 'harvest') {
        expect(capture.source.length, id).toBeGreaterThan(0);
      }
    }
  });

  it('labels the one harvest that cannot separate two panes in one dir', () => {
    // Phase 32 moved antigravity out of this set: its owning agy process
    // holds open descriptors inside brain/<id>, which IS an identity while
    // the process lives (docs/research/40). deepseek stays weak — its only
    // signal is a workspace field inside a file written on the first turn.
    const weak = LAUNCHABLE_AGENT_IDS.filter((id) => {
      const c = getRegistryEntry(id).resume.idCapture;
      return c.mode === 'harvest' && c.confidence === 'weak';
    });
    expect([...weak].sort()).toEqual(['deepseek']);
  });

  it('marks the cwd-scoped agents so restore cannot drift their directory', () => {
    // qwen fails loudly from the wrong cwd; pi opens a new EMPTY session
    // under the same id and looks resumed. Both must pin their directory.
    const scoped = LAUNCHABLE_AGENT_IDS.filter(
      (id) => getRegistryEntry(id).resume.requiresOriginalCwd === true
    );
    expect([...scoped].sort()).toEqual(['pi', 'qwen']);
    // claude is the one agent whose id lookup is global.
    expect(getRegistryEntry('claude').resume.requiresOriginalCwd).toBeUndefined();
  });

  it('flags the agents whose bare --resume opens the WRONG chat', () => {
    // gemini silently attaches to the most recent session; grok's bare
    // --resume opens the most recent session for the cwd (Phase 59,
    // cli.rs:556 to 576). It is the same failure mode, so it gets the same flag.
    const dangerous = LAUNCHABLE_AGENT_IDS.filter(
      (id) => getRegistryEntry(id).resume.bareResumeIsDangerous === true
    );
    expect([...dangerous].sort()).toEqual(['gemini', 'grok']);
    for (const id of LAUNCHABLE_AGENT_IDS) {
      if (id === 'gemini' || id === 'grok') continue;
      expect(
        getRegistryEntry(id).resume.bareResumeIsDangerous,
        id
      ).toBeUndefined();
    }
  });

  it('antigravity is NOT a reconstruction target; pi now is', () => {
    expect(getRegistryEntry('antigravity').reconstructionTarget).toBe(false);
    // pi's JSONL format is documented in its own shipped docs and writable.
    expect(getRegistryEntry('pi').reconstructionTarget).toBe(true);
  });
});

describe('argv helpers', () => {
  it('binary names differ from ids where the research says so', () => {
    expect(agentBinaryName('cursor')).toBe('cursor-agent');
    expect(agentBinaryName('antigravity')).toBe('agy');
    expect(agentBinaryName('claude')).toBe('claude');
    // Phase 25.5: deepseek's package renamed itself; the canonical name is
    // the successor's.
    expect(agentBinaryName('deepseek')).toBe('codewhale');
  });

  /**
   * PHASE 25.5 — the rename that broke fresh installs. npm `deepseek-tui`
   * 0.8.47 publishes an EMPTY bin field, so installing it installs no
   * executable; the successor `codewhale` installs `codewhale` and `codew`.
   * The probe order is NEWEST FIRST, OLDEST LAST: a machine with only the
   * old install still resolves `deepseek` (its name is still on the list),
   * a fresh machine resolves `codewhale`, and a machine with both prefers
   * the binary that still receives releases. Every resolver — detection,
   * session create, the conformance harness — walks this exact list.
   */
  it('deepseek probes the codewhale successor names first, legacy name last', () => {
    expect(agentBinaryCandidates('deepseek')).toEqual([
      'codewhale',
      'codew',
      'deepseek'
    ]);
    // The legacy name must never be dropped: existing installs and every
    // manifest row recorded before the rename still point at it.
    expect(agentBinaryCandidates('deepseek')).toContain('deepseek');
    // For every other agent the candidate list is unchanged single-name data.
    expect(agentBinaryCandidates('claude')).toEqual(['claude']);
    expect(agentBinaryCandidates('cursor')).toEqual(['cursor-agent']);
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
    // Was []: the registry said pi had no resume mechanics. It has the
    // simplest one in the set.
    expect(registryResumeArgv('pi', 'ID')).toEqual(['pi', '--session-id', 'ID']);
    // deepseek's verb is a SUBCOMMAND; `--resume <id>` exits RC=2. Since
    // Phase 25.5 the bare fallback name is the successor binary; every real
    // call site passes the RESOLVED absolute path, which on a legacy install
    // is still .../deepseek.
    expect(registryResumeArgv('deepseek', 'ID')).toEqual([
      'codewhale',
      'resume',
      'ID'
    ]);
  });

  /**
   * Re-appending the launch flags (research 22 §3.4 rule 3) holds everywhere;
   * their POSITION does not. deepseek's usage is `deepseek [OPTIONS] <COMMAND>
   * [ARGS]`, so `deepseek resume <id> --skip-onboarding` exits with "unexpected
   * argument" — a DEAD restored pane — while `deepseek --skip-onboarding
   * resume <id>` brings the conversation back. The difference is registry data
   * (`resumeExtrasPosition`), so both composition sites — launch-time arming in
   * manifest/agents.ts and harvest-time arming in ipc.ts — inherit it.
   */
  it('puts the launch extras where the CLI will accept them', () => {
    expect(
      registryResumeArgv('deepseek', 'ID', ['--skip-onboarding'], '/abs/deepseek')
    ).toEqual(['/abs/deepseek', '--skip-onboarding', 'resume', 'ID']);
    // Nobody loses their flags, whichever side of the template they land on.
    for (const id of LAUNCHABLE_AGENT_IDS) {
      const argv = registryResumeArgv(id, 'ID', ['--flag']);
      if (argv.length === 0) continue;
      expect(argv.includes('--flag'), id).toBe(true);
      const leading = getLaunchableEntry(id).resume.resumeExtrasPosition === 'leading';
      expect(argv.indexOf('--flag') < argv.indexOf('ID'), id).toBe(leading);
    }
    expect(getLaunchableEntry('deepseek').resume.resumeExtrasPosition).toBe(
      'leading'
    );
  });

  /**
   * gemini's bare `--resume` does not error and does not open a picker — it
   * silently attaches to the MOST RECENT session. An argv that loses its id
   * therefore opens the WRONG conversation, so one must never be built.
   */
  it('never builds a resume argv without the id in it', () => {
    for (const id of LAUNCHABLE_AGENT_IDS) {
      expect(registryResumeArgv(id, ''), id).toEqual([]);
    }
    expect(registryResumeArgv('gemini', '')).toEqual([]);
    expect(registryResumeArgv('gemini', 'ID')).toContain('ID');
  });

  it('registryLaunchArgv substitutes the resolved binary', () => {
    expect(registryLaunchArgv('cursor', ['--y'], '/abs/cursor-agent')).toEqual([
      '/abs/cursor-agent',
      '--y'
    ]);
    expect(registryLaunchArgv('gemini')).toEqual(['gemini']);
  });

  /**
   * The registry's launch argv stays SLOT-FREE and id injection happens in
   * exactly one place, because pi's id regex is permissive enough to accept
   * the literal string "<sessionId>" and hand every pane the same session.
   */
  it('injects a pre-assigned id only for agents that take one', () => {
    for (const entry of AGENT_REGISTRY) {
      if (entry.launch === null) continue;
      expect(entry.launch.argv, entry.id).not.toContain(SESSION_ID_SLOT);
    }
    expect(registryLaunchArgv('pi', [], '/abs/pi', 'ID')).toEqual([
      '/abs/pi',
      '--session-id',
      'ID'
    ]);
    expect(registryLaunchArgv('gemini', ['--x'], undefined, 'ID')).toEqual([
      'gemini',
      '--session-id',
      'ID',
      '--x'
    ]);
    // codex harvests; handing it an id must change nothing.
    expect(registryLaunchArgv('codex', [], '/abs/codex', 'ID')).toEqual([
      '/abs/codex'
    ]);
    expect(preAssignFlag('claude')).toEqual(['--session-id']);
    expect(preAssignFlag('codex')).toBeNull();
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

  it('codex keeps its harvest mechanics untouched', () => {
    const spec = buildLaunchSpec('codex', [], '/abs/codex');
    expect(spec.idCapture).toBe('store-harvest');
    expect(spec.harvestKey).toBe('cwd-newest');
    expect(spec.harvestConfidence).toBe('exact');
    expect(spec.argv).toEqual(['/abs/codex']);
    expect(spec.resumeArgv).toBeUndefined(); // id unknown until harvested
  });

  /**
   * THE PHASE-13.5 REGRESSION GUARD. gemini used to launch bare, get
   * `idCapture: 'store-watch'` — a TODO with a strategy's name — and never
   * arm a resume argv, so the pane came back as a bare directory. It now
   * arms both at spawn, with no watcher and no race.
   */
  it('gemini arms its resume at launch (was: store-watch forever)', () => {
    const spec = buildLaunchSpec('gemini', ['--x'], '/abs/gemini');
    expect(spec.idCapture).toBe('preassigned');
    expect(spec.agentSessionId).toBeDefined();
    expect(spec.argv).toEqual([
      '/abs/gemini',
      '--session-id',
      spec.agentSessionId,
      '--x'
    ]);
    expect(spec.resumeArgv).toEqual([
      '/abs/gemini',
      '--resume',
      spec.agentSessionId,
      '--x'
    ]);
  });

  it('pi launch argv IS its resume argv — the simplest case in the set', () => {
    const spec = buildLaunchSpec('pi', ['--model', 'x'], '/abs/pi');
    expect(spec.idCapture).toBe('preassigned');
    expect(spec.agentSessionId).toBeDefined();
    expect(spec.argv).toEqual([
      '/abs/pi',
      '--session-id',
      spec.agentSessionId,
      '--model',
      'x'
    ]);
    expect(spec.resumeArgv).toEqual(spec.argv);
    // pi's --session-id only searches the CURRENT project.
    expect(spec.requiresOriginalCwd).toBe(true);
  });

  it('cursor carries FORCE_COLOR=1 and waits for its side-command id', () => {
    const spec = buildLaunchSpec('cursor', [], '/abs/cursor-agent');
    expect(spec.env).toEqual({ FORCE_COLOR: '1' });
    expect(spec.argv).toEqual(['/abs/cursor-agent']);
    // The sync builder cannot run `cursor-agent create-chat`; it says so
    // rather than pretending the id will appear from somewhere.
    expect(spec.idCapture).toBe('preassigned-cmd');
    expect(spec.agentSessionId).toBeUndefined();
  });

  it('muse and qwen harvest, and say which key proves the record is theirs', () => {
    const muse = buildLaunchSpec('muse', [], '/abs/muse');
    expect(muse.idCapture).toBe('store-harvest');
    expect(muse.harvestKey).toBe('tmux-pane');
    const qwen = buildLaunchSpec('qwen', [], '/abs/qwen');
    expect(qwen.idCapture).toBe('store-harvest');
    expect(qwen.harvestKey).toBe('pid');
    expect(qwen.requiresOriginalCwd).toBe(true);
  });

  it('droid says "unsupported" out loud instead of guessing a flag', () => {
    const spec = buildLaunchSpec('droid', [], '/abs/droid');
    expect(spec.argv).toEqual(['/abs/droid']);
    expect(spec.idCapture).toBe('unsupported');
    expect(spec.agentSessionId).toBeUndefined();
    expect(spec.resumeArgv).toBeUndefined();
  });

  /**
   * The coverage claim, executable. Every installed agent must have a real
   * capture route; the ONE that does not is droid, which is not installed
   * anywhere gmux has run. If a future edit quietly drops an agent back into
   * "no capture", this fails.
   */
  it('captures an id for every launchable agent except docs-only droid', () => {
    const uncaptured: string[] = [];
    for (const id of LAUNCHABLE_AGENT_IDS) {
      const spec = buildLaunchSpec(id, [], `/abs/${agentBinaryName(id)}`);
      expect(spec.argv[0], id).toBe(`/abs/${agentBinaryName(id)}`);
      if (spec.idCapture === 'unsupported' || spec.idCapture === 'none') {
        uncaptured.push(id);
      }
    }
    expect(uncaptured).toEqual(['droid']);
  });

  it('arms resume at spawn for 5 of the 11 launchable agents', () => {
    const armed = LAUNCHABLE_AGENT_IDS.filter(
      (id) => buildLaunchSpec(id, [], agentBinaryName(id)).resumeArgv !== undefined
    );
    // Tier 1 (research 22 §3.1): coverage went 1/10 → 4/10 with no watcher,
    // and Phase 59 added grok as the fourth pre-assign row.
    expect([...armed].sort()).toEqual(['claude', 'gemini', 'grok', 'pi']);
    // cursor is the fifth, via a side command resolveLaunchSpec must run.
    expect(buildLaunchSpec('cursor', [], 'cursor-agent').idCapture).toBe(
      'preassigned-cmd'
    );
  });

  it('shells have nothing to resume and say so', () => {
    const spec = buildLaunchSpec('shell', [], '/bin/zsh');
    // Phase 74: a shell session is a login shell now. It still has no registry
    // entry and still nothing to resume, which is what this case is about.
    expect(spec.argv).toEqual(['/bin/zsh', '-l']);
    expect(spec.idCapture).toBe('none');
    expect(spec.resumeArgv).toBeUndefined();
  });
});

/**
 * Phase 12.5/12.6 — the Shift+Enter matrix, now registry data (it lived in
 * the renderer while Phase 13 owned this file). Every way of getting these
 * bytes wrong ends in the same user-visible disaster: a half-written prompt
 * sent to a model.
 */
describe('the multiline (Shift+Enter) table', () => {
  /** ASCII escape — the prefix of every sequence this feature must not emit. */
  const ESC = '\u001b';

  it('gives every launchable agent a row, and the IDE pair none', () => {
    for (const id of LAUNCHABLE_AGENT_IDS) {
      expect(getRegistryEntry(id).multilineKey, id).toBeDefined();
    }
    // Capture-only watchers are never run in a pane, so they have no prompt
    // to type a newline into — exactly like imageDrop.
    expect(getRegistryEntry('cursoride').multilineKey).toBeUndefined();
    expect(getRegistryEntry('copilotide').multilineKey).toBeUndefined();
  });

  it('never carries CSI-u or ESC CR — tmux turns both into a submit', () => {
    for (const entry of AGENT_REGISTRY) {
      const sequence = entry.multilineKey?.sequence;
      if (sequence === undefined || sequence === null) continue;
      expect(sequence.includes(ESC), entry.id).toBe(false);
      expect(sequence.includes('\r'), entry.id).toBe(false);
    }
    expect(DEFAULT_MULTILINE_KEY.sequence).toBe(LF);
  });

  it('resolves shells and unknown ids to the unverified default', () => {
    expect(multilineKeyFor('shell')).toBe(DEFAULT_MULTILINE_KEY);
    expect(multilineKeyFor('a-cli-that-does-not-exist')).toBe(
      DEFAULT_MULTILINE_KEY
    );
    // An UNMEASURED agent may never claim to have been measured.
    expect(DEFAULT_MULTILINE_KEY.verified).toBe(false);
  });

  it('only claims `verified` for agents a probe actually drove', () => {
    expect(multilineKeyFor('claude').verified).toBe(true);
    expect(multilineKeyFor('codex').verified).toBe(true);
    // Not installed on the probe machine (research 20 §5).
    expect(multilineKeyFor('droid').verified).toBe(false);
  });

  it('serves the same rows over IPC as the registry holds', () => {
    const table = multilineKeyTable();
    expect(table.fallback).toBe(DEFAULT_MULTILINE_KEY);
    for (const id of LAUNCHABLE_AGENT_IDS) {
      expect(table.agents[id], id).toBe(getRegistryEntry(id).multilineKey);
    }
    expect(table.agents.cursoride).toBeUndefined();
  });
});

/**
 * The one runtime risk `tsc` cannot catch in the fold: `ipc.handle` takes a
 * bare string, so a channel-name typo in main typechecks fine and then the
 * preload's typed `invoke` talks to nobody. Pin the wiring.
 */
describe('registerAgentsIpc', () => {
  it('serves the multiline table on the channel the preload invokes', async () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    registerAgentsIpc({
      handle(channel: string, fn: (...args: unknown[]) => unknown) {
        handlers.set(channel, fn);
      }
    } as unknown as Parameters<typeof registerAgentsIpc>[0]);

    const handler = handlers.get('agents:multilineKeys');
    expect(handler).toBeDefined();
    // Phase 42 stage 1: the typed-ipc wrapper refuses untrusted senders, so
    // the drive presents a trusted fake event rather than a bare object.
    expect(await handler?.(trustedInvokeEvent())).toEqual(multilineKeyTable());
  });
});
