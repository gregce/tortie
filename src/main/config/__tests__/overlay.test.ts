/**
 * The validated door: what it accepts, what it drops, and what it never does.
 *
 * Three properties are load bearing and each has its own block below.
 *
 * **An invalid row is dropped whole.** Never partially merged, never silently
 * dropped, never a crash. Every drop names the field and gives a reason. The
 * rows around it still load, because one bad row in a file of five must not
 * cost a user the other four.
 *
 * **The compiled twelve always survive.** Whatever the file says, the agents
 * this build ships are still there. A configuration file cannot take away what
 * the application already had.
 *
 * **The compiled table is never mutated.** The merge builds a new array. If it
 * ever wrote into `AGENT_REGISTRY`, the restore path and the create path would
 * start disagreeing with each other in a way no test in this file would see.
 */

import { describe, expect, it } from 'vitest';
import { AGENT_SESSION_ID_SLOT, EXECUTION_BEARING_FIELDS } from '@shared/agent-overlay';
import type { AgentOverlayV1 } from '@shared/agent-overlay';
import { AGENT_REGISTRY, SESSION_ID_SLOT } from '../../agents/registry';
import { mergeAgentOverlay, parseAgentOverlay, validateAgentOverlayFile } from '../overlay';

/** A complete, valid new agent. Tests below break one field at a time. */
function owl(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'owl',
    displayName: 'Owl',
    binaries: ['owl'],
    launch: { argv: ['owl'] },
    ...over
  };
}

function file(...agents: Record<string, unknown>[]): unknown {
  return { schema: 1, agents };
}

/**
 * A schema 2 file (Phase 33). Every schema 1 row is a valid schema 2 row, so
 * the only reason to reach for this helper is `launch.envPassthrough`, which a
 * schema 1 file may not carry.
 */
function fileV2(...agents: Record<string, unknown>[]): unknown {
  return { schema: 2, agents };
}

/** Validate one row and return the single problem it produced. */
function problemFor(row: Record<string, unknown>): { field: string; message: string } {
  const out = validateAgentOverlayFile(file(row));
  expect(out.rows, `expected ${JSON.stringify(row)} to be dropped`).toHaveLength(0);
  expect(out.problems).toHaveLength(1);
  const first = out.problems[0];
  return { field: first?.field ?? '', message: first?.message ?? '' };
}

describe('the session id slot has one definition', () => {
  it('agrees with the registry', () => {
    // src/shared cannot import the registry, because it is compiled into the
    // renderer too. So the constant is declared twice and held equal here,
    // which is the same discipline the keymap and the canvas colours use.
    expect(AGENT_SESSION_ID_SLOT).toBe(SESSION_ID_SLOT);
  });
});

describe('the execution bearing list is executable, not documentation', () => {
  // EXECUTION_BEARING_FIELDS is what the guide and the confirm sheet name. If a
  // field on that list did not actually arm the gate, the product would be
  // telling people a change asks again when it does not.
  const bearer: Record<string, Record<string, unknown>> = {
    // Each fragment patches the compiled claude row, so argv[0] and binaries[0]
    // stay the same name and the only thing under test is whether supplying the
    // field arms the gate.
    binaries: { binaries: ['claude'] },
    extraProbeDirs: { extraProbeDirs: ['~/.claude/local'] },
    'launch.argv': { launch: { argv: ['claude', '--verbose'] } },
    'launch.env': { launch: { argv: ['claude'], env: { CLAUDE_COLOR: '1' } } },
    // Phase 33. The only fragment that needs a schema 2 file, which is what
    // `schemaFor` below is for.
    'launch.envPassthrough': {
      launch: { argv: ['claude'], envPassthrough: ['CLAUDE_TEST_KEY'] }
    },
    versionProbe: { versionProbe: { args: ['--version'] } },
    'resume.template': {
      resume: {
        template: ['--resume', AGENT_SESSION_ID_SLOT],
        idCapture: { mode: 'none' }
      }
    },
    'resume.idCapture': {
      resume: {
        template: ['--resume', AGENT_SESSION_ID_SLOT],
        idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] }
      }
    }
  };

  it('names every field that arms the gate, and no others', () => {
    expect(Object.keys(bearer).sort()).toEqual([...EXECUTION_BEARING_FIELDS].sort());
  });

  /** Schema 2 for the one field that needs it, schema 1 for the rest. */
  const wrap = (field: string, row: Record<string, unknown>): unknown =>
    field === 'launch.envPassthrough' ? fileV2(row) : file(row);

  for (const [field, fragment] of Object.entries(bearer)) {
    it(`${field} arms the gate`, () => {
      const rows = validateAgentOverlayFile(
        wrap(field, { id: 'claude', ...fragment })
      ).rows;
      expect(rows).toHaveLength(1);
      const entry = mergeAgentOverlay(rows, AGENT_REGISTRY).agents.find(
        (a) => a.id === 'claude'
      );
      expect(entry?.executionHash).toMatch(/^[0-9a-f]{64}$/);
    });
  }

  it('a row with none of them does not arm the gate', () => {
    const rows = validateAgentOverlayFile(
      file({ id: 'claude', displayName: 'Renamed', iconKey: 'claude', notes: 'mine' })
    ).rows;
    const entry = mergeAgentOverlay(rows, AGENT_REGISTRY).agents.find(
      (a) => a.id === 'claude'
    );
    expect(entry?.executionHash).toBeNull();
  });

  it('storeDirs is deliberately not one of them', () => {
    const rows = validateAgentOverlayFile(
      file({ id: 'claude', storeDirs: ['~/elsewhere/projects'] })
    ).rows;
    const entry = mergeAgentOverlay(rows, AGENT_REGISTRY).agents.find(
      (a) => a.id === 'claude'
    );
    expect(entry?.executionHash).toBeNull();
  });
});

describe('the file itself', () => {
  it('reads an empty agents list', () => {
    const out = validateAgentOverlayFile({ schema: 1, agents: [] });
    expect(out.rows).toEqual([]);
    expect(out.problems).toEqual([]);
  });

  it('refuses a schema version it does not know, and says so', () => {
    // Phase 33 made 2 a version this build reads, so the unknown one is 3.
    const out = validateAgentOverlayFile({ schema: 3, agents: [owl()] });
    expect(out.rows).toEqual([]);
    expect(out.problems[0]?.field).toBe('schema');
    expect(out.problems[0]?.message).toContain('"schema": 1 or "schema": 2');
  });

  it('reads both versions it accepts', () => {
    expect(validateAgentOverlayFile(file(owl())).rows).toHaveLength(1);
    expect(validateAgentOverlayFile(fileV2(owl())).rows).toHaveLength(1);
  });

  it('refuses anything that is not an object', () => {
    for (const raw of [null, 42, 'text', [owl()]]) {
      const out = validateAgentOverlayFile(raw);
      expect(out.rows).toEqual([]);
      expect(out.problems).toHaveLength(1);
    }
  });

  it('reports a JSON syntax error as one problem rather than throwing', () => {
    const out = parseAgentOverlay('{ "schema": 1, ');
    expect(out.rows).toEqual([]);
    expect(out.problems[0]?.message).toContain('not valid JSON');
  });

  it('keeps the good rows when one row is bad', () => {
    const out = validateAgentOverlayFile(
      file(owl(), owl({ id: 'BAD ID' }), owl({ id: 'crow', displayName: 'Crow', binaries: ['crow'], launch: { argv: ['crow'] } }))
    );
    expect(out.rows.map((r) => r.id)).toEqual(['owl', 'crow']);
    expect(out.problems).toHaveLength(1);
    expect(out.problems[0]?.index).toBe(1);
  });

  it('uses the first of two rows with the same id and says it ignored the second', () => {
    const out = validateAgentOverlayFile(file(owl({ displayName: 'First' }), owl({ displayName: 'Second' })));
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]?.displayName).toBe('First');
    expect(out.problems[0]?.message).toContain('repeats the id');
  });
});

describe('a row is dropped whole, and the message names the field', () => {
  const cases: [string, Record<string, unknown>, string, string][] = [
    ['a reserved id', owl({ id: 'shell' }), 'agents[0].id', 'no agent in it'],
    ['an id with spaces', owl({ id: 'my agent' }), 'agents[0].id', 'not a usable id'],
    ['a relative binary path', owl({ binaries: ['./owl'], launch: { argv: ['./owl'] } }), 'agents[0].binaries[0]', 'relative path'],
    ['a binary path with ..', owl({ binaries: ['/usr/../bin/owl'], launch: { argv: ['/usr/../bin/owl'] } }), 'agents[0].binaries[0]', '".."'],
    ['argv[0] that is not binaries[0]', owl({ launch: { argv: ['owlet'] } }), 'agents[0].launch.argv[0]', 'must be the same name'],
    ['the session id slot in a launch argv', owl({ launch: { argv: ['owl', AGENT_SESSION_ID_SLOT] } }), 'agents[0].launch.argv[1]', 'only belongs in resume.template'],
    ['a control character in a name', owl({ displayName: 'Owl\u0007' }), 'agents[0].displayName', 'control character'],
    ['a relative probe directory', owl({ extraProbeDirs: ['bin'] }), 'agents[0].extraProbeDirs[0]', 'must start with'],
    ['an unknown field', owl({ colour: 'red' }), 'agents[0].colour', 'does not know'],
    ['a field this version does not read', owl({ flagPresets: [] }), 'agents[0].flagPresets', 'launch flag presets'],
    ['a hotkey', owl({ defaultHotkeyHint: 'o' }), 'agents[0].defaultHotkeyHint', 'Settings'],
    ['an image drop table', owl({ imageDrop: { strategy: 'paste-path' } }), 'agents[0].imageDrop', 'in this version'],
    ['a claim about being verified', owl({ unverified: false }), 'agents[0].unverified', 'always shown as unverified']
  ];
  for (const [name, row, field, fragment] of cases) {
    it(name, () => {
      const problem = problemFor(row);
      expect(problem.field).toBe(field);
      expect(problem.message).toContain(fragment);
    });
  }
});

describe('the environment denylist', () => {
  const refused = [
    'PATH',
    'SHELL',
    'BASH_ENV',
    'ZDOTDIR',
    'NODE_OPTIONS',
    'ELECTRON_RUN_AS_NODE',
    'TMUX',
    'TMUX_PANE',
    'DYLD_INSERT_LIBRARIES',
    'LD_PRELOAD',
    'GMUX_SESSION_ID',
    'TORTIE_ANYTHING'
  ];
  for (const key of refused) {
    it(`refuses ${key}`, () => {
      const problem = problemFor(owl({ launch: { argv: ['owl'], env: { [key]: 'x' } } }));
      expect(problem.field).toBe(`agents[0].launch.env.${key}`);
    });
  }

  it('accepts an ordinary one', () => {
    const out = validateAgentOverlayFile(
      file(owl({ launch: { argv: ['owl'], env: { FORCE_COLOR: '1' } } }))
    );
    expect(out.problems).toEqual([]);
    expect(out.rows[0]?.launch?.env).toEqual({ FORCE_COLOR: '1' });
  });
});

// ---------------------------------------------------------------------------
// launch.envPassthrough (Phase 33)
// ---------------------------------------------------------------------------

describe('launch.envPassthrough', () => {
  /** One row's single problem, from a schema 2 file. */
  function problemForV2(row: Record<string, unknown>): { field: string; message: string } {
    const out = validateAgentOverlayFile(fileV2(row));
    expect(out.rows, `expected ${JSON.stringify(row)} to be dropped`).toHaveLength(0);
    expect(out.problems).toHaveLength(1);
    const first = out.problems[0];
    return { field: first?.field ?? '', message: first?.message ?? '' };
  }

  function withNames(names: unknown): Record<string, unknown> {
    return owl({ launch: { argv: ['owl'], envPassthrough: names } });
  }

  it('accepts a list of names and carries it onto the merged row', () => {
    const parsed = validateAgentOverlayFile(fileV2(withNames(['FIREWORKS_API_KEY'])));
    expect(parsed.problems).toEqual([]);
    expect(parsed.rows[0]?.launch?.envPassthrough).toEqual(['FIREWORKS_API_KEY']);
    const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY).agents.find(
      (a) => a.id === 'owl'
    );
    expect(merged?.launch?.envPassthrough).toEqual(['FIREWORKS_API_KEY']);
  });

  it('needs schema 2, and says which number to write', () => {
    const problem = problemFor(withNames(['FIREWORKS_API_KEY']));
    expect(problem.field).toBe('agents[0].launch.envPassthrough');
    expect(problem.message).toContain('"schema": 2');
  });

  it('must be a list', () => {
    expect(problemForV2(withNames('FIREWORKS_API_KEY')).message).toContain(
      'must be a list of environment variable names'
    );
  });

  it('refuses more than sixteen names', () => {
    const many = Array.from({ length: 17 }, (_, i) => `NAME_${String(i)}`);
    expect(problemForV2(withNames(many)).message).toContain('more than the 16');
  });

  it('refuses a name that is not a usable variable name', () => {
    const problem = problemForV2(withNames(['not-a-name']));
    expect(problem.field).toBe('agents[0].launch.envPassthrough[0]');
    expect(problem.message).toContain('is not a usable environment variable name');
  });

  it('refuses the same name twice', () => {
    expect(problemForV2(withNames(['A_KEY', 'A_KEY'])).message).toContain(
      'names A_KEY twice'
    );
  });

  // The SAME denylist launch.env uses. A passthrough PATH is the same danger
  // as a literal one, because the name is what decides what reaches the
  // process and the value is whatever the user's shell says at that moment.
  for (const name of ['PATH', 'ZDOTDIR', 'DYLD_INSERT_LIBRARIES', 'GMUX_SESSION_ID']) {
    it(`refuses ${name}, the same as launch.env does`, () => {
      const problem = problemForV2(withNames([name]));
      expect(problem.field).toBe('agents[0].launch.envPassthrough[0]');
      expect(problem.message).toContain(`may not name ${name}`);
    });
  }

  for (const name of ['PI_CODING_AGENT_DIR', 'PI_CODING_AGENT_SESSION_DIR']) {
    it(`refuses ${name}, because it moves the agent's own session store`, () => {
      const problem = problemForV2(withNames([name]));
      expect(problem.message).toContain(`may not name ${name}`);
      expect(problem.message).toContain('lose the conversation');
    });
  }

  it('refuses a name launch.env already sets', () => {
    const problem = problemForV2(
      owl({
        launch: {
          argv: ['owl'],
          env: { FORCE_COLOR: '1' },
          envPassthrough: ['FORCE_COLOR']
        }
      })
    );
    expect(problem.message).toContain('launch.env already sets it');
    expect(problem.message).toContain('Pick one source for each name');
  });

  it('drops the row whole, so nothing half of it is merged', () => {
    const out = validateAgentOverlayFile(
      fileV2(withNames(['PATH']), owl({ id: 'kite', binaries: ['kite'], launch: { argv: ['kite'] } }))
    );
    expect(out.rows.map((r) => r.id)).toEqual(['kite']);
    expect(out.problems).toHaveLength(1);
  });
});

describe('resume', () => {
  function withResume(resume: unknown): Record<string, unknown> {
    return owl({ resume });
  }

  it('accepts a pre-assign block', () => {
    const out = validateAgentOverlayFile(
      file(
        withResume({
          template: ['--resume', AGENT_SESSION_ID_SLOT],
          idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] }
        })
      )
    );
    expect(out.problems).toEqual([]);
  });

  it('refuses a template with no slot', () => {
    const problem = problemFor(
      withResume({ template: ['--resume'], idCapture: { mode: 'none' } })
    );
    expect(problem.field).toBe('agents[0].resume.template');
    expect(problem.message).toContain('exactly one entry');
  });

  it('refuses a template with two slots', () => {
    const problem = problemFor(
      withResume({
        template: [AGENT_SESSION_ID_SLOT, AGENT_SESSION_ID_SLOT],
        idCapture: { mode: 'none' }
      })
    );
    expect(problem.message).toContain('and it has 2');
  });

  it('refuses a slot buried inside a longer argument', () => {
    const problem = problemFor(
      withResume({
        template: [`--resume=${AGENT_SESSION_ID_SLOT}`],
        idCapture: { mode: 'none' }
      })
    );
    expect(problem.message).toContain('inside a');
  });

  it('refuses harvest, and explains that the reader is compiled in', () => {
    const problem = problemFor(
      withResume({
        template: ['--resume', AGENT_SESSION_ID_SLOT],
        idCapture: { mode: 'harvest', key: 'cwd-newest' }
      })
    );
    expect(problem.field).toBe('agents[0].resume.idCapture.mode');
    expect(problem.message).toContain('compiled into Tortie');
  });

  it('refuses the strategy field, because it is derived', () => {
    const problem = problemFor(
      withResume({
        strategy: 'flag-uuid',
        template: ['--resume', AGENT_SESSION_ID_SLOT],
        idCapture: { mode: 'none' }
      })
    );
    expect(problem.field).toBe('agents[0].resume.strategy');
  });

  it('defaults both refusing flags to true', () => {
    const out = validateAgentOverlayFile(
      file(
        withResume({
          template: ['--resume', AGENT_SESSION_ID_SLOT],
          idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] }
        })
      )
    );
    const merged = mergeAgentOverlay(out.rows, AGENT_REGISTRY);
    const owlEntry = merged.agents.find((a) => a.id === 'owl');
    expect(owlEntry?.resume.requiresOriginalCwd).toBe(true);
    expect(owlEntry?.resume.bareResumeIsDangerous).toBe(true);
  });
});

describe('the merge', () => {
  const registry = AGENT_REGISTRY;

  it('adds an unknown id after the compiled rows, and never before them', () => {
    const rows = validateAgentOverlayFile(file(owl())).rows;
    const merged = mergeAgentOverlay(rows, registry);
    expect(merged.agents).toHaveLength(registry.length + 1);
    expect(merged.agents[registry.length]?.id).toBe('owl');
    expect(merged.agents.slice(0, registry.length).map((a) => a.id)).toEqual(
      registry.map((e) => e.id)
    );
  });

  it('marks a new agent unverified and gives it an honest empty resume', () => {
    const rows = validateAgentOverlayFile(file(owl())).rows;
    const entry = mergeAgentOverlay(rows, registry).agents.find((a) => a.id === 'owl');
    expect(entry?.source).toBe('config');
    expect(entry?.unverified).toBe(true);
    expect(entry?.launchable).toBe(true);
    expect(entry?.kind).toBe('cli');
    expect(entry?.resume.strategy).toBe('none');
    expect(entry?.resume.idCapture.mode).toBe('none');
    expect(entry?.reconstructionTarget).toBe(false);
    expect(entry?.specstory).toBeUndefined();
  });

  it('needs displayName, binaries and launch for a new id, and says which are missing', () => {
    const rows = validateAgentOverlayFile(file({ id: 'owl', notes: 'nothing else' })).rows;
    const merged = mergeAgentOverlay(rows, registry);
    expect(merged.agents).toHaveLength(registry.length);
    expect(merged.problems[0]?.message).toContain('displayName, binaries, launch');
  });

  it('patches a known id and leaves every other field compiled', () => {
    const rows = validateAgentOverlayFile(
      file({ id: 'claude', displayName: 'Claude at work' })
    ).rows;
    const entry = mergeAgentOverlay(rows, registry).agents.find((a) => a.id === 'claude');
    const compiled = registry.find((e) => e.id === 'claude');
    expect(entry?.displayName).toBe('Claude at work');
    expect(entry?.source).toBe('patched');
    expect(entry?.binaries).toEqual(compiled?.binaries);
    expect(entry?.resume).toEqual(compiled?.resume);
    expect(entry?.executionHash).toBeNull();
  });

  it('replaces a patched field wholesale rather than merging into it', () => {
    const rows = validateAgentOverlayFile(
      file({ id: 'claude', storeDirs: ['~/work/.claude/projects'] })
    ).rows;
    const entry = mergeAgentOverlay(rows, registry).agents.find((a) => a.id === 'claude');
    expect(entry?.storeDirs).toEqual(['~/work/.claude/projects']);
  });

  it('arms the gate when a patch changes something that runs', () => {
    const rows = validateAgentOverlayFile(
      file({ id: 'claude', binaries: ['claude'], launch: { argv: ['claude', '--verbose'] } })
    ).rows;
    const entry = mergeAgentOverlay(rows, registry).agents.find((a) => a.id === 'claude');
    expect(entry?.executionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(entry?.launch?.argv).toEqual(['claude', '--verbose']);
  });

  it('gives two different command lines two different hashes', () => {
    const one = mergeAgentOverlay(
      validateAgentOverlayFile(file(owl({ launch: { argv: ['owl', '-a'] } }))).rows,
      registry
    ).agents.find((a) => a.id === 'owl');
    const two = mergeAgentOverlay(
      validateAgentOverlayFile(file(owl({ launch: { argv: ['owl', '-b'] } }))).rows,
      registry
    ).agents.find((a) => a.id === 'owl');
    expect(one?.executionHash).not.toBe(two?.executionHash);
  });

  it('gives the same row the same hash twice', () => {
    const hash = (): string | null | undefined =>
      mergeAgentOverlay(validateAgentOverlayFile(file(owl())).rows, registry).agents.find(
        (a) => a.id === 'owl'
      )?.executionHash;
    expect(hash()).toBe(hash());
  });

  it('refuses to give a capture-only editor a launch command', () => {
    const rows = validateAgentOverlayFile(
      file({ id: 'cursoride', binaries: ['cursor'], launch: { argv: ['cursor'] } })
    ).rows;
    const merged = mergeAgentOverlay(rows, registry);
    const entry = merged.agents.find((a) => a.id === 'cursoride');
    expect(entry?.source).toBe('builtin');
    expect(merged.problems[0]?.message).toContain('editor Tortie watches');
  });

  it('refuses a patch that leaves argv[0] and binaries[0] disagreeing', () => {
    const rows = validateAgentOverlayFile(file({ id: 'claude', binaries: ['claude-next'] })).rows;
    const merged = mergeAgentOverlay(rows, registry);
    expect(merged.problems[0]?.field).toBe('agents[0].launch.argv[0]');
    expect(merged.agents.find((a) => a.id === 'claude')?.source).toBe('builtin');
  });

  it('never writes into the compiled registry', () => {
    const before = JSON.stringify(AGENT_REGISTRY);
    const rows = validateAgentOverlayFile(
      file(owl(), { id: 'claude', displayName: 'Renamed' })
    ).rows;
    const merged = mergeAgentOverlay(rows, registry);
    expect(merged.agents.find((a) => a.id === 'claude')?.displayName).toBe('Renamed');
    expect(JSON.stringify(AGENT_REGISTRY)).toBe(before);
    expect(AGENT_REGISTRY.find((e) => e.id === 'claude')?.displayName).toBe('Claude Code');
  });

  it('keeps every compiled agent when the file is nothing but bad rows', () => {
    const rows: AgentOverlayV1[] = [];
    const merged = mergeAgentOverlay(rows, registry);
    expect(merged.agents.map((a) => a.id)).toEqual(registry.map((e) => e.id));
    expect(merged.agents.every((a) => a.source === 'builtin')).toBe(true);
    expect(merged.agents.every((a) => a.executionHash === null)).toBe(true);
  });
});
