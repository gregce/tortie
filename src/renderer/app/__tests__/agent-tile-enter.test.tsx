/**
 * Phase 86 fix round — only a tile that can run submits on Enter, and Enter
 * creates the agent that is under focus.
 *
 * The ⌘T sheet's board is a group of toggle buttons that Tab walks (item 4),
 * and `ENTER_SUBMITS_ATTR` is what lets Enter on a tile reach the sheet's
 * Create instead of stopping at the button (item 6). A tile for an agent that
 * is not installed, or that the confirm gate will not start, is marked with
 * `aria-disabled`, which describes the tile rather than removing it, so it is
 * still a Tab stop.
 *
 * Measured before this fix: with focus on "Droid, not installed" and Shell as
 * the chosen agent, Enter closed the sheet and created a shell session. A
 * person acted on Droid and got a shell. These cases hold the rule that stops
 * that: the attribute goes on usable select-mode tiles and on nothing else.
 *
 * The second half of this file holds the bug the re-verifier found. Tab moved
 * FOCUS while only the arrows moved the CHOICE, so the two could point at
 * different tiles, and Enter created the chosen one. Measured with claude as
 * the default agent: one Shift+Tab from the Name field landed on the Shell
 * tile and Enter there created `claude-1`. The cases below press Enter with
 * focus and choice on different tiles and read which agent got created.
 *
 * The vitest environment is node, so the first half reads static markup from
 * react-dom/server. The second half calls the board and reads the props React
 * would hand each button. See the comment above `board` for why it does that
 * rather than restating the rule.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AgentPickerOption } from '../../state/agents';
import { AgentGrid, focusChoosesTile } from '../AgentGrid';
import { ENTER_SUBMITS_ATTR, modalKeyDown } from '../focus-trap';

// `board` below calls AgentGrid as a plain function, outside any renderer, so
// React's hook dispatcher is not installed and its one `useRef` call would
// throw. This is the whole of the mock: a ref is an object with a `current`,
// and the board only ever uses it to hold focusable elements that a node
// environment does not have anyway.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, useRef: <T,>(initial: T) => ({ current: initial }) };
});

function option(over: Partial<AgentPickerOption>): AgentPickerOption {
  return {
    id: 'shell',
    label: 'Shell',
    iconKey: 'shell',
    installed: true,
    unverified: false,
    configState: null,
    install: null,
    ...over
  } as AgentPickerOption;
}

/** The markup of one tile, found by its aria-label. */
function tileOf(html: string, label: string): string {
  const at = html.indexOf(`aria-label="${label}`);
  expect(at).toBeGreaterThan(-1);
  const open = html.lastIndexOf('<button', at);
  const close = html.indexOf('>', at);
  return html.slice(open, close + 1);
}

const OPTIONS = [
  option({ id: 'shell', label: 'Shell' }),
  option({ id: 'droid', label: 'Droid', installed: false }),
  option({ id: 'claude', label: 'Claude', configState: 'never' })
];

describe('select mode', () => {
  const html = renderToStaticMarkup(
    <AgentGrid
      options={OPTIONS}
      mode="select"
      primaryId="shell"
      onActivate={() => {}}
      ariaLabel="Agent"
    />
  );

  it('marks the usable tile', () => {
    expect(tileOf(html, 'Shell')).toContain(ENTER_SUBMITS_ATTR);
  });

  it('does not mark the tile for an agent that is not installed', () => {
    const tile = tileOf(html, 'Droid');
    expect(tile).toContain('aria-disabled="true"');
    expect(tile).not.toContain(ENTER_SUBMITS_ATTR);
  });

  it('does not mark the tile the confirm gate will not start', () => {
    const tile = tileOf(html, 'Claude');
    expect(tile).toContain('aria-disabled="true"');
    expect(tile).not.toContain(ENTER_SUBMITS_ATTR);
  });

  it('says which agent is chosen without claiming the radio role', () => {
    expect(tileOf(html, 'Shell')).toContain('aria-pressed="true"');
    expect(html).not.toContain('radiogroup');
    expect(html).not.toContain('role="radio"');
  });

  it('sets no tabindex, so every tile is its own Tab stop', () => {
    expect(html).not.toContain('tabindex');
  });
});

describe('launch mode', () => {
  const html = renderToStaticMarkup(
    <AgentGrid
      options={OPTIONS}
      mode="launch"
      primaryId="shell"
      onActivate={() => {}}
      ariaLabel="Start a session"
    />
  );

  it('marks no tile, because there is no sheet to submit', () => {
    expect(html).not.toContain(ENTER_SUBMITS_ATTR);
    expect(html).not.toContain('aria-pressed');
  });
});

type TileProps = Record<string, unknown>;

/**
 * Every button the select board renders, keyed by the aria-label on it.
 *
 * The first version of these cases could not fail on the regression they were
 * written for. They called `focusChoosesTile` by hand, so they held the RULE
 * and never touched the button the rule is wired to. Rewiring
 * `onFocus={focus}` back to `onFocus={hint}` in AgentGrid.tsx, which is the
 * exact state that reproduced the bug in the running app, left all of them
 * passing. The connection between the rule and the button is what broke, so
 * the connection is what these cases press now.
 *
 * There is no DOM here to focus a button in, because the vitest environment is
 * node and this repository has no DOM library. What this does instead is call
 * the component and read the props it puts on each button. The `onFocus` value
 * it hands back is the same function React would call on a focus event, taken
 * off the same button, found by the same aria-label a screen reader reads. Cut
 * the wire in AgentGrid.tsx and these cases fail.
 */
function board(
  options: readonly AgentPickerOption[],
  primaryId: string,
  onActivate: (o: AgentPickerOption) => void
): Map<string, TileProps> {
  const found = new Map<string, TileProps>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    const el = node as { type?: unknown; props?: TileProps };
    const props = el.props;
    if (typeof el.type === 'function') {
      walk((el.type as (p: TileProps) => unknown)(props ?? {}));
      return;
    }
    if (props === undefined) return;
    if (el.type === 'button') {
      const label = props['aria-label'];
      if (typeof label === 'string') found.set(label, props);
    }
    walk(props['children']);
  };
  walk(
    AgentGrid({
      options,
      mode: 'select',
      primaryId,
      onActivate,
      ariaLabel: 'Agent'
    })
  );
  return found;
}

/**
 * The ⌘T sheet reduced to the two things this bug lived between: which tile
 * the keyboard is on, and which agent submit would create. Both real rules are
 * called here rather than restated. The board's own button handles the focus,
 * and `modalKeyDown` is the dialog's own, reading the attribute off the same
 * button props.
 */
function sheet(options: readonly AgentPickerOption[], startOn: string) {
  let chosen = startOn;
  const created: string[] = [];
  const tile = (label: string): TileProps => {
    const props = board(options, chosen, (o) => {
      chosen = o.id;
    }).get(label);
    expect(props, `no tile is labelled "${label}"`).toBeDefined();
    return props as TileProps;
  };
  return {
    chosen: (): string => chosen,
    created,
    /** Tab or Shift+Tab lands the keyboard on this tile. */
    tabTo(label: string): void {
      (tile(label)['onFocus'] as () => void)();
    },
    /** Enter, from that tile, through the dialog's real key handler. */
    enterOn(label: string): void {
      const marked = ENTER_SUBMITS_ATTR in tile(label);
      modalKeyDown(
        {
          key: 'Enter',
          shiftKey: false,
          target: {
            tagName: 'BUTTON',
            closest: (selector: string): object | null =>
              selector === `[${ENTER_SUBMITS_ATTR}]` && marked ? {} : null
          } as unknown as EventTarget,
          nativeEvent: { isComposing: false },
          preventDefault: () => {},
          stopPropagation: () => {}
        },
        // Only the Tab branch touches the container, and this presses Enter.
        null as unknown as HTMLElement,
        { submit: () => created.push(chosen), close: () => {} }
      );
    }
  };
}

const BOARD = [
  option({ id: 'claude', label: 'Claude Code' }),
  option({ id: 'shell', label: 'Shell' }),
  option({ id: 'cursor', label: 'Cursor' }),
  option({ id: 'droid', label: 'Droid', installed: false })
];

/** The aria-label the board puts on a tile whose agent is not installed. */
const DROID = 'Droid — not installed';

describe('focus and choice are the same thing on the board', () => {
  it('chooses the agent whose tile the keyboard lands on', () => {
    const picked: string[] = [];
    const tiles = board(BOARD, 'claude', (o) => picked.push(o.id));
    (tiles.get('Cursor')?.['onFocus'] as () => void)();
    expect(picked).toEqual(['cursor']);
  });

  it('leaves the choice alone when the keyboard lands on a tile that cannot run', () => {
    const picked: string[] = [];
    const tiles = board(BOARD, 'claude', (o) => picked.push(o.id));
    (tiles.get(DROID)?.['onFocus'] as () => void)();
    expect(picked).toEqual([]);
  });

  it('creates the tile under focus, not the one chosen before it', () => {
    const s = sheet(BOARD, 'claude');
    s.tabTo('Cursor');
    expect(s.chosen()).toBe('cursor');
    s.enterOn('Cursor');
    expect(s.created).toEqual(['cursor']);
  });

  it('creates Shell when one Shift+Tab from Name lands on Shell', () => {
    const s = sheet(BOARD, 'claude');
    s.tabTo('Shell');
    s.enterOn('Shell');
    expect(s.created).toEqual(['shell']);
  });

  it('leaves the choice where it was when focus lands on a tile that cannot run', () => {
    const s = sheet(BOARD, 'claude');
    s.tabTo(DROID);
    expect(s.chosen()).toBe('claude');
    s.enterOn(DROID);
    expect(s.created).toEqual([]);
  });

  it('creates the default agent when nothing on the board was ever focused', () => {
    const s = sheet(BOARD, 'claude');
    s.enterOn('Claude Code');
    expect(s.created).toEqual(['claude']);
  });

  it('does not move a choice in launch mode, where activation starts a session', () => {
    const cursor = BOARD[2] as AgentPickerOption;
    expect(focusChoosesTile('launch', cursor)).toBe(false);
    expect(focusChoosesTile('select', cursor)).toBe(true);
  });
});
