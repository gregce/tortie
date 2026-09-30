/**
 * Phase 331 — the two inline switches, the screen record, and the rows that
 * must not move.
 *
 * His ruling of 2026-09-29, "i like the inline mode lets do that": where an
 * agent offers an inline switch Tortie can safely compile, Tortie launches and
 * resumes it inline, from compiled registry data spelled once. Today that is
 * Codex, carried on the argv (`CODEX_SCROLLBACK_ARGS` on BOTH `launch.argv` and
 * `resume.template`, research 133), and Claude Code, carried in the env
 * (`CLAUDE_INLINE_ENV` in `launch.env`, research 134). Every other launchable
 * row composes exactly what it composed before the phase, which A11 holds
 * against a literal table read at the parent, `d8f5c261`.
 *
 * These are the owners `build/p331/ablation.mjs` names: A1 and A2 go red when
 * the pair leaves `launch.argv` or `resume.template`, A4 and A6 when the
 * variable leaves `launch.env`, A7 when one row's record goes, A9 when
 * `REFUSED_ROW_FIELDS.screen` goes.
 *
 * HERMETIC. Nothing here opens a file under the real HOME: `electron` is
 * mocked onto a scratch directory under the system temp directory, the
 * configuration store is never initialised (so the merged table is the
 * compiled one and nothing is read), and the one manifest this file writes is
 * a temp `ManifestStore` removed in `afterEach`.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: {
    isReady: () => true,
    getPath: () => userData,
    getVersion: () => '0.0.0-p331'
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (text: string): Buffer => Buffer.from(text, 'utf8'),
    decryptString: (buf: Buffer): string => buf.toString('utf8')
  }
}));

const {
  AGENT_OVERLAY_JSON_SCHEMA,
  envPassthroughRefusal,
  REFUSED_ROW_FIELDS
} = await import('@shared/agent-overlay');
const { sanitizeEnvPassthrough, sanitizeEnvPassthroughShared } = await import(
  '@shared/settings'
);
const {
  AGENT_REGISTRY,
  CLAUDE_INLINE_ENV,
  CODEX_SCROLLBACK_ARGS,
  compiledLaunchEnvKeys,
  fixedLaunchTokens,
  getLaunchableEntry,
  LAUNCHABLE_AGENT_IDS,
  registryLaunchArgv,
  registryResumeArgv,
  SESSION_ID_SLOT
} = await import('../registry');
const { buildLaunchSpec } = await import('../../manifest/agents');
const { ManifestStore } = await import('../../manifest/store');
const { newSessionRecord, paneEnvFor } = await import('../../sessions/launch-plan');
const { sharedRefusedEnvKeys } = await import('../../settings/store');
const { EMPTY_EXECUTION_FIELDS, executionHash } = await import('../../config/confirm');
const { executionFieldsOf, mergeAgentOverlay, parseAgentOverlay } = await import(
  '../../config/overlay'
);

import type { LaunchableAgentId } from '@shared/types';
import type { AgentLaunchSpec, ManifestSessionRecord } from '../../manifest';

const NAME = 'CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN';
const PAIR = ['-c', 'tui.fullscreen_transcript=false'] as const;
const AT = 1_700_000_000_000;

/** How many times `PAIR` appears as two adjacent elements of `argv`. */
function pairCount(argv: readonly string[]): number {
  let n = 0;
  for (let i = 0; i + 1 < argv.length; i += 1) {
    if (argv[i] === PAIR[0] && argv[i + 1] === PAIR[1]) n += 1;
  }
  return n;
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p331-inline-switch-'));
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Codex: the pair, on the launch AND on the resume
// ---------------------------------------------------------------------------

describe('codex runs in its Scrollback mode', () => {
  it('the codex launch argv carries the scrollback pair once, from the constant', () => {
    // The constant is Codex's own spelling, and nothing else.
    expect([...CODEX_SCROLLBACK_ARGS]).toEqual([...PAIR]);
    const entry = getLaunchableEntry('codex');
    expect(entry.launch.argv).toEqual(['codex', ...CODEX_SCROLLBACK_ARGS]);
    expect(fixedLaunchTokens('codex')).toEqual([...CODEX_SCROLLBACK_ARGS]);

    const composed = registryLaunchArgv('codex', ['--yolo'], '/abs/codex');
    expect(composed).toEqual(['/abs/codex', ...PAIR, '--yolo']);
    expect(pairCount(composed)).toBe(1);

    // The create path records exactly that, and codex still harvests, so no
    // id rides on the launch and no resume argv exists yet.
    const spec = buildLaunchSpec('codex', ['--yolo'], '/abs/codex');
    expect(spec.argv).toEqual(['/abs/codex', ...PAIR, '--yolo']);
    expect(spec.idCapture).toBe('store-harvest');
    expect(spec.resumeArgv).toBeUndefined();
  });

  it('the codex resume argv carries the scrollback pair once, from the constant', () => {
    const entry = getLaunchableEntry('codex');
    // On the TEMPLATE, because `resumeArgvFor` never reads `launch.argv` and
    // `codex resume` restores no launch flag (research 133 §4.4).
    expect(entry.resume.template).toEqual(['resume', SESSION_ID_SLOT, ...CODEX_SCROLLBACK_ARGS]);
    expect(entry.resume.resumeExtrasPosition ?? 'trailing').toBe('trailing');

    const composed = registryResumeArgv('codex', 'P331-ID', ['--yolo'], '/abs/codex');
    expect(composed).toEqual(['/abs/codex', 'resume', 'P331-ID', ...PAIR, '--yolo']);
    expect(pairCount(composed)).toBe(1);

    // The recovery contract a create records carries the template in force.
    const spec = buildLaunchSpec('codex', [], '/abs/codex');
    expect(spec.resumeTemplate).toEqual(['resume', SESSION_ID_SLOT, ...PAIR]);
  });

  it("a person's own -c tui.fullscreen_transcript=true trails the pair on launch and on resume", () => {
    const own = ['-c', 'tui.fullscreen_transcript=true'];
    const launch = registryLaunchArgv('codex', own, '/abs/codex');
    expect(launch).toEqual(['/abs/codex', ...PAIR, ...own]);
    const resume = registryResumeArgv('codex', 'P331-ID', own, '/abs/codex');
    expect(resume).toEqual(['/abs/codex', 'resume', 'P331-ID', ...PAIR, ...own]);
    // A later `-c` wins in Codex (research 133 §4.4), so the person's `true`
    // must come AFTER Tortie's `false` on both argvs.
    for (const argv of [launch, resume]) {
      expect(argv.indexOf('tui.fullscreen_transcript=true')).toBeGreaterThan(
        argv.indexOf('tui.fullscreen_transcript=false')
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Claude Code: the variable, from create to the pane and back
// ---------------------------------------------------------------------------

/** The row a create writes for a claude launch spec. */
function claudeRow(spec: AgentLaunchSpec): ManifestSessionRecord {
  return newSessionRecord({
    id: 'p331-claude',
    input: { name: 'p331 claude', projectPath: '/proj', agent: 'claude' },
    cwd: '/proj',
    spec,
    capture: undefined,
    agentVersion: null,
    binPath: '/abs/claude',
    cwdReal: '/proj',
    projectReal: '/proj',
    now: AT,
    login: null
  });
}

describe('claude runs with its alternate screen off', () => {
  it('the claude launch env carries CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1 from the constant, and create records it', () => {
    expect({ ...CLAUDE_INLINE_ENV }).toEqual({ [NAME]: '1' });
    expect(getLaunchableEntry('claude').launch.env).toEqual({ ...CLAUDE_INLINE_ENV });
    // Nothing goes on claude's argv or its template for this.
    expect(getLaunchableEntry('claude').launch.argv).toEqual(['claude']);
    expect(getLaunchableEntry('claude').resume.template).toEqual(['--resume', SESSION_ID_SLOT]);

    const spec = buildLaunchSpec('claude', ['--model', 'opus'], '/abs/claude');
    expect(spec.env).toEqual({ [NAME]: '1' });
    const rec = claudeRow(spec);
    expect(rec.env).toEqual({ [NAME]: '1' });
  });

  it('the claude variable reaches the pane at create and at restore', () => {
    const spec = buildLaunchSpec('claude', [], '/abs/claude');
    const rec = claudeRow(spec);

    // At create: the row's env is the base layer of the pane env.
    const atCreate = paneEnvFor(rec.env, {}, rec.id, {}, {});
    expect(atCreate[NAME]).toBe('1');

    // At restore: restore reads the row back from the manifest and hands the
    // SAME function the recorded env. Round trip it through a real store, so
    // a codec that dropped the column would show here.
    const store = new ManifestStore(join(userData, 'manifest.db'));
    try {
      store.insertSession(rec);
      const back = store.getSession(rec.id);
      expect(back?.env).toEqual({ [NAME]: '1' });
      const atRestore = paneEnvFor(back?.env, {}, rec.id, {}, {});
      expect(atRestore[NAME]).toBe('1');
      // The identity stamps still go last and still win.
      expect(atRestore['GMUX_SESSION_ID']).toBe(rec.id);
    } finally {
      store.close();
    }
  });

  it('both passthrough lists refuse the claude variable, with a true sentence', () => {
    // The union of every launchable compiled `launch.env` key: exactly three,
    // literally (SPEC §1.2 item 12: the p275 union test is derived, so a
    // fourth name or a lost third would pass it).
    const union = [
      ...new Set(LAUNCHABLE_AGENT_IDS.flatMap((id) => [...compiledLaunchEnvKeys(id)]))
    ].sort();
    expect(union).toEqual([NAME, 'FORCE_COLOR', 'GROK_PRIVACY_NOTICE_ROLLOUT']);
    expect([...sharedRefusedEnvKeys()].sort()).toEqual(union);
    expect(compiledLaunchEnvKeys('claude')).toEqual([NAME]);

    // The shared list, the way the settings store reads it.
    const shared = sanitizeEnvPassthroughShared([NAME, 'P331_KEEP'], sharedRefusedEnvKeys());
    expect(shared.names).toEqual(['P331_KEEP']);
    expect(shared.refused).toEqual([NAME]);

    // Claude's own list, the way the settings store reads it.
    const launchable = (id: string): boolean =>
      (LAUNCHABLE_AGENT_IDS as readonly string[]).includes(id);
    const own = sanitizeEnvPassthrough(
      { claude: [NAME, 'P331_KEEP'], codex: [NAME] },
      launchable,
      compiledLaunchEnvKeys
    );
    expect(own.claude).toEqual(['P331_KEEP']);
    // TRUE, not merely strict: codex's own row does not set the name, so its
    // own list may carry it and "this agent already sets it" is never said of
    // codex.
    expect(own.codex).toEqual([NAME]);

    // The two sentences Settings draws, and each is true on this Mac.
    expect(
      envPassthroughRefusal(NAME, { agentEnvKeys: sharedRefusedEnvKeys(), scope: 'shared' })
    ).toBe(`An agent Tortie launches already sets ${NAME} itself. Pick one source for each name.`);
    expect(envPassthroughRefusal(NAME, { agentEnvKeys: compiledLaunchEnvKeys('claude') })).toBe(
      `This agent already sets ${NAME} itself. Pick one source for each name.`
    );
    expect(envPassthroughRefusal(NAME, { agentEnvKeys: compiledLaunchEnvKeys('codex') })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The screen record
// ---------------------------------------------------------------------------

const CLASSES = ['switch-to-inline', 'inline-already', 'fullscreen-with-mouse', 'unknown'];

describe('the compiled screen record', () => {
  it('every launchable row declares a screen record, and only the IDE pair declares none', () => {
    const declared: string[] = [];
    const none: string[] = [];
    for (const entry of AGENT_REGISTRY) {
      const record = entry.screen;
      if (record === undefined) {
        none.push(entry.id);
        continue;
      }
      declared.push(entry.id);
      expect(CLASSES, entry.id).toContain(record.class);
      expect(typeof record.measured, entry.id).toBe('string');
      expect(record.measured.length, entry.id).toBeGreaterThan(0);
      expect(Array.isArray(record.notes), entry.id).toBe(true);
      for (const note of record.notes) {
        expect(typeof note, entry.id).toBe('string');
        expect(note.length, entry.id).toBeGreaterThan(0);
      }
      // A carriage exists exactly on a switch.
      const carriage = (record as { carriage?: unknown }).carriage;
      if (record.class === 'switch-to-inline') {
        expect(['argv', 'env'], entry.id).toContain(carriage);
      } else {
        expect(carriage, entry.id).toBeUndefined();
        expect((record as { tokens?: unknown }).tokens, entry.id).toBeUndefined();
        expect((record as { env?: unknown }).env, entry.id).toBeUndefined();
      }
    }
    expect(declared.sort()).toEqual([...LAUNCHABLE_AGENT_IDS].sort());
    expect(declared).toHaveLength(13);
    expect(none.sort()).toEqual(['copilotide', 'cursoride']);
  });

  it('exactly codex and claude are switch-to-inline', () => {
    const switched = AGENT_REGISTRY.filter((e) => e.screen?.class === 'switch-to-inline').map(
      (e) => e.id
    );
    expect(switched.sort()).toEqual(['claude', 'codex']);

    // Each record names its switch FROM the constant the row spreads, so the
    // record and the row cannot disagree.
    const codex = getLaunchableEntry('codex').screen;
    expect(codex?.class === 'switch-to-inline' && codex.carriage).toBe('argv');
    if (codex?.class === 'switch-to-inline' && codex.carriage === 'argv') {
      expect(codex.tokens).toBe(CODEX_SCROLLBACK_ARGS);
      const entry = getLaunchableEntry('codex');
      expect(entry.launch.argv.slice(-codex.tokens.length)).toEqual([...codex.tokens]);
      expect(entry.resume.template.slice(-codex.tokens.length)).toEqual([...codex.tokens]);
    }
    const claude = getLaunchableEntry('claude').screen;
    expect(claude?.class === 'switch-to-inline' && claude.carriage).toBe('env');
    if (claude?.class === 'switch-to-inline' && claude.carriage === 'env') {
      expect(claude.env).toBe(CLAUDE_INLINE_ENV);
      const env = getLaunchableEntry('claude').launch.env ?? {};
      for (const [key, value] of Object.entries(claude.env)) {
        expect(env[key], key).toBe(value);
        expect(sharedRefusedEnvKeys(), key).toContain(key);
      }
    }
  });

  it('a configuration row carrying screen is dropped whole with the refusal sentence', () => {
    const refusal = REFUSED_ROW_FIELDS['screen'];
    expect(typeof refusal).toBe('string');
    expect(refusal).toBe(
      'Tortie does not read screen from configuration. It is Tortie’s own ' +
        'record of how each agent it ships draws its screen, and it runs nothing.'
    );
    // The schema a person's editor validates against does not name it either.
    expect(JSON.stringify(AGENT_OVERLAY_JSON_SCHEMA)).not.toContain('"screen":');

    const screen = { class: 'switch-to-inline', carriage: 'argv', tokens: ['--x'] };
    const refusedRows: Record<string, unknown>[] = [
      { id: 'owl', displayName: 'Owl', binaries: ['owl'], launch: { argv: ['owl'] }, screen },
      { id: 'codex', displayName: 'Codex', screen },
      { id: 'claude', screen: { class: 'inline-already', measured: 'x', notes: [] } }
    ];
    for (const row of refusedRows) {
      const out = parseAgentOverlay(JSON.stringify({ schema: 1, agents: [row] }));
      expect(out.rows, String(row['id'])).toHaveLength(0);
      expect(out.problems, String(row['id'])).toHaveLength(1);
      expect(out.problems[0]?.field, String(row['id'])).toBe('agents[0].screen');
      expect(out.problems[0]?.message, String(row['id'])).toBe(refusal);
    }

    // Controls, so the refusal is not a refusal of everything.
    const kept: Record<string, unknown>[] = [
      { id: 'owl', displayName: 'Owl', binaries: ['owl'], launch: { argv: ['owl'] } },
      { id: 'codex', displayName: 'Codex (mine)' }
    ];
    for (const row of kept) {
      const out = parseAgentOverlay(JSON.stringify({ schema: 1, agents: [row] }));
      expect(out.problems, String(row['id'])).toEqual([]);
      expect(out.rows, String(row['id'])).toHaveLength(1);
    }
  });

  it('screen never reaches the confirm hash', () => {
    expect(Object.keys(EMPTY_EXECUTION_FIELDS)).not.toContain('screen');
    const merged = mergeAgentOverlay([], AGENT_REGISTRY).agents;
    for (const id of ['codex', 'claude']) {
      const entry = merged.find((e) => e.id === id);
      expect(entry, id).toBeDefined();
      if (entry === undefined) continue;
      expect(entry.screen, id).toBeDefined();
      const fields = executionFieldsOf(entry);
      expect(Object.keys(fields), id).not.toContain('screen');

      const { screen: _screen, ...withoutScreen } = entry;
      const changed = {
        ...entry,
        screen: { class: 'unknown' as const, measured: 'another', notes: ['another'] }
      };
      const hash = executionHash(id, fields);
      expect(executionHash(id, executionFieldsOf(withoutScreen)), id).toBe(hash);
      expect(executionHash(id, executionFieldsOf(changed)), id).toBe(hash);
    }
  });
});

// ---------------------------------------------------------------------------
// Every other row, against the parent
// ---------------------------------------------------------------------------

const SLOT = SESSION_ID_SLOT;

/**
 * Read at `d8f5c261`, the phase's parent, with the phase's own two changes
 * marked (now). Each row: launch argv, launch env (null for none), resume
 * template, and where a resume puts the person's own flags.
 */
const PARENT: Record<
  LaunchableAgentId,
  {
    argv: string[];
    env: Record<string, string> | null;
    template: string[];
    extras: 'leading' | 'trailing';
  }
> = {
  // (now) env: the phase's one change to this row.
  claude: { argv: ['claude'], env: { [NAME]: '1' }, template: ['--resume', SLOT], extras: 'trailing' },
  cursor: { argv: ['cursor-agent'], env: { FORCE_COLOR: '1' }, template: ['--resume', SLOT], extras: 'trailing' },
  // (now) argv and template: the phase's two changes to this row.
  codex: {
    argv: ['codex', '-c', 'tui.fullscreen_transcript=false'],
    env: null,
    template: ['resume', SLOT, '-c', 'tui.fullscreen_transcript=false'],
    extras: 'trailing'
  },
  gemini: { argv: ['gemini'], env: null, template: ['--resume', SLOT], extras: 'trailing' },
  droid: { argv: ['droid'], env: null, template: ['--resume', SLOT], extras: 'trailing' },
  deepseek: { argv: ['codewhale'], env: null, template: ['resume', SLOT], extras: 'leading' },
  antigravity: { argv: ['agy'], env: null, template: ['--conversation', SLOT], extras: 'trailing' },
  muse: { argv: ['muse'], env: null, template: ['resume', SLOT], extras: 'trailing' },
  qwen: { argv: ['qwen'], env: null, template: ['--resume', SLOT], extras: 'trailing' },
  pi: { argv: ['pi'], env: null, template: ['--session-id', SLOT], extras: 'trailing' },
  omp: { argv: ['omp'], env: null, template: ['--resume', SLOT], extras: 'trailing' },
  grok: {
    argv: ['grok'],
    env: { GROK_PRIVACY_NOTICE_ROLLOUT: '0' },
    template: ['--resume', SLOT],
    extras: 'trailing'
  },
  opencode: { argv: ['opencode'], env: null, template: ['--session', SLOT], extras: 'trailing' }
};

describe('the rows the phase does not touch', () => {
  it('every other launchable row composes the argv and env it composed before this phase', () => {
    expect(Object.keys(PARENT).sort()).toEqual([...LAUNCHABLE_AGENT_IDS].sort());
    for (const id of LAUNCHABLE_AGENT_IDS) {
      const was = PARENT[id];
      const entry = getLaunchableEntry(id);
      expect(entry.launch.argv, id).toEqual(was.argv);
      expect(entry.launch.env ?? null, id).toEqual(was.env);
      expect(entry.resume.template, id).toEqual(was.template);
      expect(entry.resume.resumeExtrasPosition ?? 'trailing', id).toBe(was.extras);

      // Composed, not only declared: the launch and the resume a create and a
      // harvest would record, with one own flag.
      const bin = `/abs/${id}`;
      expect(registryLaunchArgv(id, ['--p331-own'], bin), id).toEqual([
        bin,
        ...was.argv.slice(1),
        '--p331-own'
      ]);
      const filled = was.template.map((t) => (t === SLOT ? 'P331-ID' : t));
      expect(registryResumeArgv(id, 'P331-ID', ['--p331-own'], bin), id).toEqual(
        was.extras === 'leading' ? [bin, '--p331-own', ...filled] : [bin, ...filled, '--p331-own']
      );
      const spec = buildLaunchSpec(id, ['--p331-own'], bin);
      expect(spec.env ?? null, id).toEqual(was.env);
      // Only codex fixes tokens after argv[0].
      expect([...fixedLaunchTokens(id)], id).toEqual(was.argv.slice(1));
    }
  });
});
