/**
 * When `agents.json` is read, and what a broken one costs.
 *
 * The headline is the read count. Research 31 says the file is read at boot, on
 * an explicit reload and on a watcher debounce, and **never on the path that
 * creates a session or the path that restores one**. A rule like that is worth
 * nothing unless something counts, so the store counts its own disk reads and
 * the first block below asserts that reading the merged table never moves the
 * count. A future create path that reached for the file instead of the memory
 * would fail here rather than in a user's session.
 *
 * The second property is the failure direction. A missing file, a broken file,
 * a file that is really a directory and a file full of invalid rows must all
 * leave the twelve compiled agents exactly where they were. A configuration
 * file can add to this build. It can never take away what it already had.
 *
 * Everything here runs against real files in a temporary directory. The only
 * thing mocked is Electron's userData path.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from(''),
    decryptString: () => ''
  }
}));

const {
  agentEntry,
  agentOverlayDiskReads,
  agentOverlayRowSource,
  configStateOf,
  currentAgentOverlay,
  currentAgentTable,
  launchableAgentEntry,
  loadAgentOverlay,
  onAgentOverlayChanged,
  reloadAgentOverlay,
  resetAgentOverlayStoreForTests,
  startAgentOverlayWatch,
  stopAgentOverlayWatch,
  withConfigState
} = await import('../store');
const { AGENT_REGISTRY } = await import('../../agents/registry');
const { agentOverlayPath, configDir, ensureConfigDir } = await import('../paths');

const OWL = {
  schema: 1,
  agents: [
    {
      id: 'owl',
      displayName: 'Owl',
      binaries: ['owl'],
      launch: { argv: ['owl'] }
    }
  ]
};

function writeOverlay(value: unknown): void {
  ensureConfigDir();
  writeFileSync(
    agentOverlayPath(),
    typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    'utf8'
  );
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-config-'));
  resetAgentOverlayStoreForTests();
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

describe('when the file is read', () => {
  it('reads nothing until it is asked to', () => {
    writeOverlay(OWL);
    expect(agentOverlayDiskReads()).toBe(0);
    expect(currentAgentTable()).toHaveLength(AGENT_REGISTRY.length);
    expect(agentEntry('owl')).toBeNull();
    expect(agentOverlayDiskReads()).toBe(0);
  });

  it('reads once on the boot load', () => {
    writeOverlay(OWL);
    loadAgentOverlay('boot');
    expect(agentOverlayDiskReads()).toBe(1);
    expect(agentEntry('owl')?.displayName).toBe('Owl');
  });

  it('never reads again when the merged table is used', () => {
    writeOverlay(OWL);
    loadAgentOverlay('boot');
    const before = agentOverlayDiskReads();
    for (let i = 0; i < 50; i += 1) {
      currentAgentTable();
      currentAgentOverlay();
      agentEntry('owl');
      launchableAgentEntry('owl');
      agentEntry('claude');
    }
    expect(agentOverlayDiskReads()).toBe(before);
  });

  it('does not notice a change on disk until a reload', () => {
    writeOverlay(OWL);
    loadAgentOverlay('boot');
    writeOverlay({ schema: 1, agents: [] });
    expect(agentEntry('owl')).not.toBeNull();
    reloadAgentOverlay();
    expect(agentEntry('owl')).toBeNull();
    expect(agentOverlayDiskReads()).toBe(2);
  });
});

describe('the compiled agents always survive', () => {
  const broken: [string, unknown][] = [
    ['no file at all', null],
    ['a file that is not JSON', 'this is not json'],
    ['a file that is a JSON array', '[]'],
    ['a schema version from the future', { schema: 99, agents: [] }],
    ['a row with no launch command', { schema: 1, agents: [{ id: 'owl' }] }],
    [
      'a row that names a refused environment value',
      {
        schema: 1,
        agents: [
          {
            id: 'owl',
            displayName: 'Owl',
            binaries: ['owl'],
            launch: { argv: ['owl'], env: { PATH: '/tmp' } }
          }
        ]
      }
    ]
  ];

  for (const [name, content] of broken) {
    it(name, () => {
      if (content !== null) writeOverlay(content);
      const snapshot = loadAgentOverlay('boot');
      expect(snapshot.agents.map((a) => a.id)).toEqual(AGENT_REGISTRY.map((e) => e.id));
      expect(snapshot.agents.every((a) => a.source === 'builtin')).toBe(true);
      if (content !== null) expect(snapshot.problems.length).toBeGreaterThan(0);
      else expect(snapshot.problems).toEqual([]);
    });
  }

  it('says nothing at all when there is no file, because that is the ordinary case', () => {
    const snapshot = loadAgentOverlay('boot');
    expect(snapshot.present).toBe(false);
    expect(snapshot.problems).toEqual([]);
  });

  it('refuses a file that is bigger than the limit, and names the size', () => {
    writeOverlay(`{"schema":1,"agents":[],"padding":"${'x'.repeat(300_000)}"}`);
    const snapshot = loadAgentOverlay('boot');
    expect(snapshot.present).toBe(false);
    expect(snapshot.problems[0]?.message).toContain('bytes and Tortie reads');
    expect(snapshot.agents).toHaveLength(AGENT_REGISTRY.length);
  });

  it('survives agents.json being a directory', () => {
    ensureConfigDir();
    mkdirSync(agentOverlayPath());
    const snapshot = loadAgentOverlay('boot');
    expect(snapshot.problems[0]?.message).toContain('is not a file');
    expect(snapshot.agents).toHaveLength(AGENT_REGISTRY.length);
  });
});

describe('the change listeners', () => {
  it('fire when the result changes and stay quiet when it does not', () => {
    writeOverlay(OWL);
    const seen: number[] = [];
    const off = onAgentOverlayChanged((snap) => seen.push(snap.agents.length));
    loadAgentOverlay('boot');
    expect(seen).toHaveLength(1);
    reloadAgentOverlay();
    expect(seen).toHaveLength(1);
    writeOverlay({ schema: 1, agents: [] });
    reloadAgentOverlay();
    expect(seen).toHaveLength(2);
    off();
    writeOverlay(OWL);
    reloadAgentOverlay();
    expect(seen).toHaveLength(2);
  });

  it('does not let one bad listener stop the others', () => {
    writeOverlay(OWL);
    const seen: string[] = [];
    onAgentOverlayChanged(() => {
      throw new Error('this listener is broken');
    });
    onAgentOverlayChanged(() => seen.push('second'));
    expect(() => loadAgentOverlay('boot')).not.toThrow();
    expect(seen).toEqual(['second']);
  });
});

describe('the configuration directory', () => {
  it('is inside the inner gmux directory, next to the skill pins', () => {
    expect(configDir()).toBe(join(userData, 'gmux', 'config'));
    expect(agentOverlayPath()).toBe(join(userData, 'gmux', 'config', 'agents.json'));
  });

  it('is created on demand and creating it twice is fine', () => {
    expect(ensureConfigDir().ready).toBe(true);
    expect(ensureConfigDir().ready).toBe(true);
  });
});

describe('what the confirm gate is handed', () => {
  it('lists only the rows that can start a program', () => {
    writeOverlay({
      schema: 1,
      agents: [
        { id: 'owl', displayName: 'Owl', binaries: ['owl'], launch: { argv: ['owl'] } },
        { id: 'claude', displayName: 'Claude at work' }
      ]
    });
    loadAgentOverlay('boot');
    const { rows, errors } = agentOverlayRowSource().read();
    expect(rows.map((r) => r.id)).toEqual(['owl']);
    expect(rows[0]?.fields.launchArgv).toEqual(['owl']);
    expect(rows[0]?.fields.binaries).toEqual(['owl']);
    expect(errors).toEqual([]);
    // The rename still happened. It just has nothing to confirm.
    expect(agentEntry('claude')?.displayName).toBe('Claude at work');
  });

  it('passes every dropped row on with its field and its reason', () => {
    writeOverlay({
      schema: 1,
      agents: [{ id: 'owl', displayName: 'Owl', binaries: ['owl'], launch: { argv: ['owlet'] } }]
    });
    loadAgentOverlay('boot');
    const { rows, errors } = agentOverlayRowSource().read();
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.id).toBe('owl');
    expect(errors[0]?.field).toBe('agents[0].launch.argv[0]');
    expect(errors[0]?.reason).toContain('same name');
  });

  it('reads without touching the disk', () => {
    writeOverlay(OWL);
    loadAgentOverlay('boot');
    const before = agentOverlayDiskReads();
    const source = agentOverlayRowSource();
    for (let i = 0; i < 20; i += 1) source.read();
    expect(agentOverlayDiskReads()).toBe(before);
  });
});

describe('the watcher', () => {
  // Real FSEvents through @parcel/watcher, which is the same primitive the
  // repository watcher uses. Delivery can lag about a second, so the wait is
  // generous and the assertion is on the result rather than on the timing.
  it('re-reads the file after it changes on disk', async () => {
    ensureConfigDir();
    loadAgentOverlay('boot');
    expect(agentEntry('owl')).toBeNull();
    const watching = await startAgentOverlayWatch();
    expect(watching).toBe(true);
    try {
      writeOverlay(OWL);
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline && agentEntry('owl') === null) {
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(agentEntry('owl')?.displayName).toBe('Owl');
      expect(agentOverlayDiskReads()).toBeGreaterThan(1);
    } finally {
      await stopAgentOverlayWatch();
    }
  }, 20_000);
});

describe('what a launch path gets', () => {
  it('hands back a configured agent with its launch command', () => {
    writeOverlay(OWL);
    loadAgentOverlay('boot');
    const entry = launchableAgentEntry('owl');
    expect(entry?.launch.argv).toEqual(['owl']);
    expect(entry?.source).toBe('config');
    // The gate is a separate module. This accessor says the row exists and can
    // be started, never that anybody has agreed to it.
    expect(entry?.executionHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hands back nothing for an id no table carries', () => {
    loadAgentOverlay('boot');
    expect(launchableAgentEntry('nobody')).toBeNull();
  });

  it('hands back nothing for an editor Tortie only watches', () => {
    loadAgentOverlay('boot');
    expect(agentEntry('cursoride')).not.toBeNull();
    expect(launchableAgentEntry('cursoride')).toBeNull();
  });
});

/**
 * PHASE 23 FIX ROUND. The picker used to offer an unconfirmed configured agent
 * beside Claude Code with the same chip and the same enabled state, so a person
 * picked it, typed a name, pressed Create and got a modal error. The scan says
 * what is INSTALLED. This is how the scan is told what may START.
 *
 * The state here is 'never', because nothing has been confirmed and the record
 * file does not exist. That is the refusing answer, which is the point: the
 * only state that lets a row start is 'confirmed'.
 */
describe('what the picker is told about a configured row', () => {
  it('says nothing at all about a compiled agent', () => {
    writeOverlay(OWL);
    loadAgentOverlay('boot');
    expect(configStateOf('claude')).toBeNull();
    expect(configStateOf('shell')).toBeNull();
    expect(configStateOf('an-agent-nobody-has-heard-of')).toBeNull();
  });

  it('says nothing about a row that only renames a compiled agent', () => {
    writeOverlay({
      schema: 1,
      agents: [{ id: 'gemini', displayName: 'Gemini (work)' }]
    });
    loadAgentOverlay('boot');
    expect(agentEntry('gemini')?.displayName).toBe('Gemini (work)');
    // Nothing execution bearing moved, so there is nothing to confirm and the
    // user's working agent must not be reported as blocked.
    expect(configStateOf('gemini')).toBeNull();
  });

  it('answers for a row that can cause a program to run', () => {
    writeOverlay(OWL);
    loadAgentOverlay('boot');
    expect(configStateOf('owl')).toBe('never');
  });

  it('stamps a scan without touching the rows it has nothing to say about', () => {
    writeOverlay(OWL);
    loadAgentOverlay('boot');
    const scan = [{ id: 'claude', installed: true }, { id: 'owl', installed: true }];
    const stamped = withConfigState(scan);
    expect(stamped[0]).toBe(scan[0]); // same object, untouched
    expect(stamped[1]).not.toBe(scan[1]);
    expect((stamped[1] as { configState?: string }).configState).toBe('never');
  });

  it('reads no configuration file to answer, so a scan cannot reach the disk', () => {
    writeOverlay(OWL);
    loadAgentOverlay('boot');
    const before = agentOverlayDiskReads();
    withConfigState([{ id: 'claude' }, { id: 'owl' }]);
    expect(agentOverlayDiskReads()).toBe(before);
  });
});
