/**
 * Phase 92 — the home screen's machine row, and a recent project that names a
 * machine.
 *
 * What these tests hold:
 * - The fourth action row appears only when BOTH conditions hold, being a build
 *   that carries the verb and at least one confirmed machine. It sits between
 *   Open and New, it names the machine when there is exactly one, and it reads
 *   the neutral title when there is more than one.
 * - A machine whose link is `refused` is not confirmed, which is the whole of
 *   `confirmedMachines`.
 * - The row's click opens the Phase 90.3 sheet and does nothing else.
 * - A recent row on another machine draws the machine's label, draws no warning
 *   mark, draws its path with no `~`, and its label carries no fill, no border
 *   and no colour of its own.
 * - A click on such a row asks that machine, and a refusal becomes the sentence
 *   presentation.ts writes for that reason word.
 * - A local row behaves exactly as it did before, including handing over the
 *   picker when the folder is gone.
 *
 * The vitest environment is node and this repository has no jsdom, so a
 * rendered button cannot be clicked here. That is why the two decisions are
 * pure functions in ../HomeScreen.tsx, exactly as the row's context menu is a
 * pure function in ../recent-menu.ts. The component assertions read static
 * markup from react-dom/server, and the computed colours and the column's
 * geometry are measured by build/probe-home-machines.mjs on the running app.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MachineStateView, RecentProject } from '@shared/ipc';

const HERE = dirname(fileURLToPath(import.meta.url));

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
// `projects.addRemote` is present so canAddRemoteProject() answers true, which
// is what lets the fourth row render in the control cases below.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    projects: {
      addRemote: () => Promise.resolve({ ok: false, reason: 'notConnected' }),
      create: () => Promise.resolve({}),
      list: () => Promise.resolve([])
    }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

import type { HomeActionsInput, OpenRecentInput } from '../HomeScreen';
import type { HomeRecentRow } from '../../state/recents';

const {
  HomeRecentRowBody,
  homeActions,
  openRecentRow,
  recentRowMachineLabel,
  recentRowTitle
} = await import('../HomeScreen');
const { confirmedMachines } = await import('../../state/machines-slice');
const { addRemoteRefusal } = await import('../../machines/presentation');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** One machine row, as main reports it. Confirmed unless `link` says refused. */
function machine(over: Partial<MachineStateView>): MachineStateView {
  return {
    id: 'p92a',
    label: 'Mac Pro',
    color: 'magenta',
    link: 'connected',
    everAnswered: true,
    lastAnsweredAt: 1,
    detail: null,
    ...over
  };
}

function recent(over: Partial<RecentProject>): RecentProject {
  return { path: '/Users/gdc/dev', name: 'dev', lastOpenedAt: 1, ...over };
}

/** The action input, with every verb a spy and no machines. */
function actionsInput(over: Partial<HomeActionsInput> = {}): {
  input: HomeActionsInput;
  spies: {
    openProject: ReturnType<typeof vi.fn>;
    setNewProjectOpen: ReturnType<typeof vi.fn>;
    setRemoteProjectOpen: ReturnType<typeof vi.fn>;
    onClone: ReturnType<typeof vi.fn>;
  };
} {
  const spies = {
    openProject: vi.fn(),
    setNewProjectOpen: vi.fn(),
    setRemoteProjectOpen: vi.fn(),
    onClone: vi.fn()
  };
  return {
    spies,
    input: {
      canCreateProject: true,
      canAddRemote: true,
      confirmed: [],
      onClone: spies.onClone,
      openProject: spies.openProject,
      setNewProjectOpen: spies.setNewProjectOpen,
      setRemoteProjectOpen: spies.setRemoteProjectOpen,
      ...over
    }
  };
}

const ids = (input: HomeActionsInput): string[] =>
  homeActions(input).map((a) => a.id);

/** One row the home screen would draw, composed the way ../../state/recents.ts composes it. */
function homeRow(entry: RecentProject, over: Partial<HomeRecentRow> = {}): HomeRecentRow {
  const machineId = entry.machineId ?? 'local';
  const remote = machineId !== 'local';
  return {
    entry,
    key: remote ? `${machineId}:${entry.path}` : entry.path,
    machineId,
    remote,
    missing: false,
    ...over
  };
}

/**
 * The markup of one recent row's contents.
 *
 * The whole screen is deliberately NOT rendered here. zustand answers a server
 * render from its initial state, so a rendered HomeScreen draws the empty
 * first-launch shape whatever a test puts in the stores, and a test that asserts
 * against it would be asserting nothing. The row's contents take their row as a
 * prop, so this draws the row the test asked for.
 */
function rowHtml(row: HomeRecentRow, states: MachineStateView[]): string {
  return renderToStaticMarkup(
    <HomeRecentRowBody row={row} label={recentRowMachineLabel(row, states)} />
  );
}

// ---------------------------------------------------------------------------
// The action row
// ---------------------------------------------------------------------------

describe('the fourth action row', () => {
  it('is absent when this person has no machine', () => {
    const { input } = actionsInput({ confirmed: [] });
    expect(ids(input)).toEqual(['open', 'new', 'clone']);
  });

  it('sits between Open and New when one machine is confirmed', () => {
    const { input } = actionsInput({ confirmed: [machine({})] });
    expect(ids(input)).toEqual(['open', 'open-remote', 'new', 'clone']);
  });

  it('names the machine when there is exactly one', () => {
    const { input } = actionsInput({ confirmed: [machine({})] });
    const row = homeActions(input)[1];
    expect(row?.title).toBe('Open on Mac Pro…');
    // PHASE 102 REWROTE THE SECOND FACT. It read "Tortie never writes there".
    expect(row?.subtitle).toBe(
      'The folder stays on that machine. Tortie writes there only where you ' +
        'have let it save.'
    );
    expect(row?.icon).toBe('vm');
    // No chord, for the reason Clone has none.
    expect(row?.chip).toBeNull();
  });

  it('names no machine when there is more than one', () => {
    const { input } = actionsInput({
      confirmed: [machine({}), machine({ id: 'p92b', label: 'Studio' })]
    });
    const rows = homeActions(input);
    expect(rows.map((a) => a.id)).toEqual([
      'open',
      'open-remote',
      'new',
      'clone'
    ]);
    expect(rows[1]?.title).toBe('Open on another machine…');
    // Still ONE row, however many machines exist.
    expect(rows.filter((a) => a.id === 'open-remote')).toHaveLength(1);
  });

  it('is absent on a build whose preload cannot open a remote folder', () => {
    const { input } = actionsInput({
      canAddRemote: false,
      confirmed: [machine({})]
    });
    expect(ids(input)).toEqual(['open', 'new', 'clone']);
  });

  it('opens the sheet and does nothing else', () => {
    const { input, spies } = actionsInput({ confirmed: [machine({})] });
    homeActions(input)[1]?.run();
    expect(spies.setRemoteProjectOpen).toHaveBeenCalledTimes(1);
    expect(spies.setRemoteProjectOpen).toHaveBeenCalledWith(true);
    expect(spies.openProject).not.toHaveBeenCalled();
    expect(spies.setNewProjectOpen).not.toHaveBeenCalled();
    expect(spies.onClone).not.toHaveBeenCalled();
  });
});

describe('confirmedMachines', () => {
  it('drops a machine nobody confirmed and keeps every other link', () => {
    const states = [
      machine({ id: 'a', link: 'refused' }),
      machine({ id: 'b', link: 'quiet' }),
      machine({ id: 'c', link: 'connecting' }),
      machine({ id: 'd', link: 'connected' }),
      machine({ id: 'e', link: 'polling' })
    ];
    expect(confirmedMachines(states).map((one) => one.id)).toEqual([
      'b',
      'c',
      'd',
      'e'
    ]);
  });

  it('leaves the row hidden when the only machine is unconfirmed', () => {
    const states = [machine({ link: 'refused' })];
    const { input } = actionsInput({ confirmed: confirmedMachines(states) });
    expect(ids(input)).toEqual(['open', 'new', 'clone']);
  });
});

// ---------------------------------------------------------------------------
// The recent rows
// ---------------------------------------------------------------------------

describe('a recent project on another machine', () => {
  const states = [machine({}), machine({ id: 'p92b', label: 'Studio' })];

  it('draws the machine label, no warning mark and no tilde', () => {
    const row = homeRow(
      recent({ path: '/Users/gdc/dev/webapp', name: 'webapp', machineId: 'p92a' })
    );
    const html = rowHtml(row, states);
    expect(html).toContain('<span class="home-recent-machine">Mac Pro</span>');
    // The reserved slot is present and empty, so nothing moved to draw it.
    expect(html).toContain('<span class="home-recent-warn"></span>');
    expect(html).not.toContain('codicon-warning');
    // The path is that machine's, printed exactly as that machine states it.
    expect(html).toContain('/Users/gdc/dev');
    expect(html).not.toContain('~');
    // The hover title is the pair, in the order the app uses everywhere else.
    expect(recentRowTitle(row, 'Mac Pro')).toBe(
      '/Users/gdc/dev/webapp on Mac Pro'
    );
  });

  it('is never marked missing, whatever the missing set holds', () => {
    // ../../state/recents.ts computes the flag and never sets it for a remote
    // row. This pins what the screen does when the flag is false: no mark, no
    // struck-through path, and the ordinary title rather than the missing one.
    const row = homeRow(recent({ machineId: 'p92a' }));
    expect(row.missing).toBe(false);
    expect(rowHtml(row, states)).not.toContain('codicon-warning');
    expect(recentRowTitle(row, 'Mac Pro')).toBe('/Users/gdc/dev on Mac Pro');
  });

  it('falls back to the machine id when the machine was forgotten', () => {
    // A person can forget a machine while its row is still on screen. A short
    // unfamiliar word says more than a blank, which is what machineLabelFor
    // already decided for the three sidebars.
    const row = homeRow(recent({ machineId: 'p92a' }));
    expect(recentRowMachineLabel(row, [])).toBe('p92a');
    expect(rowHtml(row, [])).toContain(
      '<span class="home-recent-machine">p92a</span>'
    );
  });

  it('tells two rows apart when two machines hold the same path', () => {
    const a = homeRow(recent({ machineId: 'p92a' }));
    const b = homeRow(recent({ machineId: 'p92b' }));
    // The identity is the PAIR, so the two rows are two rows.
    expect(a.key).not.toBe(b.key);
    expect(rowHtml(a, states)).toContain('>Mac Pro<');
    expect(rowHtml(b, states)).toContain('>Studio<');
  });

  /**
   * A duplicate React key is not observable in a static render, because the
   * server renderer draws both children either way. So the guard is on the
   * source: the screen passes the row's own key, which ../../state/recents.ts
   * composes from the machine and the path, and never the bare path.
   */
  it('keys a row by the pair and never by the path', () => {
    const source = readFileSync(resolve(HERE, '../HomeScreen.tsx'), 'utf8');
    expect(source).toContain('key={row.key}');
    expect(source).not.toContain('key={entry.path}');
  });

  it('draws a local row exactly as it did before', () => {
    const row = homeRow(recent({ path: '/Users/gdc/dev/webapp', name: 'webapp' }));
    const html = rowHtml(row, states);
    expect(html).not.toContain('home-recent-machine');
    // A local path still folds to the home-relative form.
    expect(html).toContain('~/dev');
    expect(recentRowTitle(row, null)).toBe('/Users/gdc/dev/webapp');
  });

  it('draws a local row whose folder is gone exactly as it did before', () => {
    const row = homeRow(recent({}), { missing: true });
    const html = rowHtml(row, states);
    expect(html).toContain('codicon-warning');
    expect(recentRowTitle(row, null)).toBe('Tortie cannot find this folder.');
  });
});

/**
 * The machine's name is IDENTITY and not status, so it may carry no fill, no
 * border, no border radius and no colour of its own. The rule is read from the
 * stylesheet, because that is where it lives. The computed values on the
 * running app are measured by build/probe-home-machines.mjs.
 */
describe('the machine name has no ornament', () => {
  const css = readFileSync(resolve(HERE, '../home-screen.css'), 'utf8');
  const block = (selector: string): string => {
    const at = css.indexOf(`${selector} {`);
    expect(at, `${selector} is missing from home-screen.css`).toBeGreaterThan(
      -1
    );
    return css.slice(at, css.indexOf('}', at));
  };

  it('has no fill, no border and no radius', () => {
    const rule = block('.home-recent-machine');
    expect(rule).not.toMatch(/background/);
    expect(rule).not.toMatch(/border(?!-)/);
    expect(rule).not.toMatch(/border-radius/);
    expect(rule).not.toMatch(/box-shadow/);
  });

  it('uses the muted token at rest and steps up on hover', () => {
    expect(block('.home-recent-machine')).toContain('color: var(--text-muted)');
    expect(block('.home-recent:hover .home-recent-machine')).toContain(
      'color: var(--text-secondary)'
    );
  });

  it('is the UI font, because mono is reserved for a path', () => {
    // It sets no font-family at all, so it inherits the row's, which is the UI
    // font. The path beside it is the only element that names the mono stack.
    expect(block('.home-recent-machine')).not.toContain('font-family');
    expect(block('.home-recent-path')).toContain('var(--font-mono)');
  });
});

// ---------------------------------------------------------------------------
// The click
// ---------------------------------------------------------------------------

function openInput(over: Partial<OpenRecentInput> = {}): {
  input: OpenRecentInput;
  spies: {
    addRemoteProject: ReturnType<typeof vi.fn>;
    addProjectPath: ReturnType<typeof vi.fn>;
    openProject: ReturnType<typeof vi.fn>;
    toast: ReturnType<typeof vi.fn>;
  };
} {
  const spies = {
    addRemoteProject: vi.fn(() =>
      Promise.resolve({ ok: false as const, reason: 'notConnected' as const })
    ),
    addProjectPath: vi.fn(),
    openProject: vi.fn(),
    toast: vi.fn()
  };
  return {
    spies,
    input: {
      machineStates: [machine({})],
      addRemoteProject: spies.addRemoteProject,
      addProjectPath: spies.addProjectPath,
      openProject: spies.openProject,
      toast: spies.toast,
      ...over
    }
  };
}

const remoteRow = {
  entry: recent({ machineId: 'p92a' }),
  key: 'p92a:/Users/gdc/dev',
  machineId: 'p92a',
  remote: true,
  missing: false
};

describe('clicking a recent row', () => {
  it('asks the machine, and says why when it refuses', async () => {
    const { input, spies } = openInput();
    await openRecentRow(remoteRow, input);
    expect(spies.addRemoteProject).toHaveBeenCalledWith(
      'p92a',
      '/Users/gdc/dev'
    );
    expect(spies.addProjectPath).not.toHaveBeenCalled();
    expect(spies.openProject).not.toHaveBeenCalled();
    expect(spies.toast).toHaveBeenCalledWith(
      'error',
      addRemoteRefusal('notConnected', '/Users/gdc/dev', 'Mac Pro')
    );
    expect(spies.toast.mock.calls[0]?.[1]).toBe(
      'Tortie is not connected to Mac Pro.'
    );
  });

  it('says nothing when the machine answers', async () => {
    const { input, spies } = openInput({
      addRemoteProject: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          project: { id: 'p1', path: '/Users/gdc/dev', name: 'dev' },
          alreadyOpen: false
        })
      )
    });
    await openRecentRow(remoteRow, input);
    expect(spies.toast).not.toHaveBeenCalled();
  });

  it('names the machine id in the sentence when the machine was forgotten', async () => {
    const { input, spies } = openInput({ machineStates: [] });
    await openRecentRow(remoteRow, input);
    expect(spies.toast).toHaveBeenCalledWith(
      'error',
      'Tortie is not connected to p92a.'
    );
  });

  it('opens a local row the way it always did', async () => {
    const { input, spies } = openInput();
    await openRecentRow(
      {
        entry: recent({}),
        key: '/Users/gdc/dev',
        machineId: 'local',
        remote: false,
        missing: false
      },
      input
    );
    expect(spies.addProjectPath).toHaveBeenCalledWith('/Users/gdc/dev');
    expect(spies.addRemoteProject).not.toHaveBeenCalled();
    expect(spies.openProject).not.toHaveBeenCalled();
  });

  it('hands over the picker when a local folder is gone', async () => {
    const { input, spies } = openInput();
    await openRecentRow(
      {
        entry: recent({}),
        key: '/Users/gdc/dev',
        machineId: 'local',
        remote: false,
        missing: true
      },
      input
    );
    expect(spies.openProject).toHaveBeenCalledTimes(1);
    expect(spies.addProjectPath).not.toHaveBeenCalled();
    expect(spies.addRemoteProject).not.toHaveBeenCalled();
  });
});
