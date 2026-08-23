/**
 * Phase 84, item 6 — the folder picker for another machine.
 *
 * WHAT THESE TESTS HOLD.
 *  - Every state the panel can be in draws the sentence written for it, and
 *    the four refusals are the four in the contract with nothing left over.
 *  - The panel never claims a listing is complete. When the machine counted
 *    more folders than the answer carries, both numbers are on screen.
 *  - `Use this folder` is off until a folder has actually been read, so the
 *    path it writes is always a path the MACHINE reported.
 *  - Descending composes the question and never the answer, and the root case
 *    does not ask about a doubled separator.
 *  - The panel writes no sentence of its own. Every string it draws comes from
 *    presentation.ts, which is the file the vocabulary audit reads.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server. Clicking through two levels on a real machine is the Tier
 * 2 live drive in the phase report, not this file.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RemoteDirListing } from '@shared/ipc';

// The picker's module graph reaches machines/presentation and the icon set, neither of
// which reads the bridge. The bare window is here for the stateful wrapper's
// one feature detection, and it is the shape a renderer has before its preload
// has answered.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = {
    gmux: undefined,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
    clearTimeout
  };
});

import {
  DIR_PICKER_CHOOSE,
  DIR_PICKER_DENIED,
  DIR_PICKER_EMPTY,
  DIR_PICKER_HOME,
  DIR_PICKER_HONESTY,
  DIR_PICKER_MISSING,
  DIR_PICKER_NOTDIR,
  DIR_PICKER_READING,
  DIR_PICKER_UP,
  dirPickerTitle,
  dirPickerTruncated,
  dirPickerUnreachable
} from '../../machines/presentation';
import {
  dirPickerRefusalText,
  joinRemotePath,
  RemoteDirPicker,
  RemoteDirPickerView
} from '../RemoteDirPicker';

/** A listing with quiet defaults, overridden per case. */
function listing(over: Partial<RemoteDirListing>): RemoteDirListing {
  return {
    path: '/Users/gdc',
    parent: '/Users',
    entries: [{ name: 'code' }, { name: 'notes' }],
    total: 2,
    refusal: null,
    refusalText: null,
    ...over
  };
}

function draw(over: {
  listing?: RemoteDirListing | null;
  loading?: boolean;
}): string {
  return renderToStaticMarkup(
    <RemoteDirPickerView
      machineLabel="Studio"
      listing={over.listing === undefined ? listing({}) : over.listing}
      loading={over.loading ?? false}
      onOpen={() => {}}
      onUp={() => {}}
      onHome={() => {}}
      onChoose={() => {}}
      onClose={() => {}}
    />
  );
}

describe('what the panel says it is', () => {
  it('names the machine and says it changes nothing there', () => {
    const html = draw({});
    expect(html).toContain(dirPickerTitle('Studio'));
    expect(html).toContain(DIR_PICKER_HONESTY);
  });

  it('draws the path the machine reported, and not one it composed', () => {
    expect(draw({ listing: listing({ path: '/opt/work' }) })).toContain(
      '/opt/work'
    );
  });

  it('says it is reading while it is reading', () => {
    const html = draw({ loading: true, listing: null });
    expect(html).toContain(DIR_PICKER_READING);
    expect(html).not.toContain(DIR_PICKER_EMPTY);
  });
});

describe('the folders', () => {
  it('lists every folder the machine named', () => {
    const html = draw({});
    expect(html).toContain('code');
    expect(html).toContain('notes');
  });

  it('says so when there are none, rather than drawing an empty box', () => {
    expect(draw({ listing: listing({ entries: [], total: 0 }) })).toContain(
      DIR_PICKER_EMPTY
    );
  });

  it('never pretends the first 500 are all of them', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ name: `d${String(i)}` }));
    const html = draw({ listing: listing({ entries: many, total: 900 }) });
    expect(html).toContain(dirPickerTruncated(500, 900));
    expect(dirPickerTruncated(500, 900)).toContain('900');
    expect(dirPickerTruncated(500, 900)).toContain('500');
  });

  it('draws no count sentence when the listing holds everything', () => {
    expect(draw({})).not.toContain('Tortie is showing the first');
  });
});

describe('moving around', () => {
  it('offers Home always and Up only when the machine reported a parent', () => {
    expect(draw({})).toContain(DIR_PICKER_HOME);
    expect(draw({})).toContain(DIR_PICKER_UP);
    expect(draw({ listing: listing({ path: '/', parent: null }) })).not.toContain(
      DIR_PICKER_UP
    );
  });

  it('asks about the folder inside this one, without doubling the separator', () => {
    expect(joinRemotePath('/Users/gdc', 'code')).toBe('/Users/gdc/code');
    expect(joinRemotePath('/', 'Users')).toBe('/Users');
  });
});

describe('the choice', () => {
  it('is off until a folder has actually been read', () => {
    expect(draw({ listing: null, loading: true })).toContain('disabled');
    expect(draw({ listing: listing({ refusal: 'missing' }) })).toContain(
      'disabled'
    );
  });

  it('is on for a folder the machine read', () => {
    const html = draw({});
    expect(html).toContain(DIR_PICKER_CHOOSE);
    // The only control that can be off in this state is none of them.
    expect(html).not.toContain('disabled');
  });

  it('hands back the path the machine reported', () => {
    let chosen: string | null = null;
    const view = RemoteDirPickerView({
      machineLabel: 'Studio',
      listing: listing({ path: '/opt/work' }),
      loading: false,
      onOpen: () => {},
      onUp: () => {},
      onHome: () => {},
      onChoose: (p) => {
        chosen = p;
      },
      onClose: () => {}
    });
    // Reaching into the element tree is the only way to press a button with no
    // DOM. The button is found by the attribute the markup carries.
    const press = (node: unknown): void => {
      const el = node as {
        props?: { children?: unknown; onClick?: () => void } & Record<
          string,
          unknown
        >;
      };
      if (el?.props === undefined) return;
      if (el.props['data-dirpick-action'] === 'choose') {
        el.props.onClick?.();
        return;
      }
      const kids = el.props.children;
      if (Array.isArray(kids)) kids.forEach(press);
      else if (kids !== undefined) press(kids);
    };
    press(view);
    expect(chosen).toBe('/opt/work');
  });
});

describe('the four refusals', () => {
  it('says one sentence for each, and the machine is named in exactly one', () => {
    expect(dirPickerRefusalText('missing', 'Studio')).toBe(DIR_PICKER_MISSING);
    expect(dirPickerRefusalText('notdir', 'Studio')).toBe(DIR_PICKER_NOTDIR);
    expect(dirPickerRefusalText('denied', 'Studio')).toBe(DIR_PICKER_DENIED);
    expect(dirPickerRefusalText('unreachable', 'Studio')).toBe(
      dirPickerUnreachable('Studio')
    );
    expect(dirPickerUnreachable('Studio')).toContain('Studio');
  });

  it('draws the refusal instead of a list', () => {
    const html = draw({
      listing: listing({ entries: [], total: 0, refusal: 'denied' })
    });
    expect(html).toContain(DIR_PICKER_DENIED);
    expect(html).not.toContain(DIR_PICKER_EMPTY);
  });

  it('never draws a folder name from a refused listing', () => {
    // A machine that refused still reports the path, and an answer that
    // carried entries beside a refusal would be a contradiction. The panel
    // draws the refusal and nothing else.
    const html = draw({ listing: listing({ refusal: 'missing' }) });
    expect(html).not.toContain('>code<');
    expect(html).toContain(DIR_PICKER_MISSING);
  });
});

describe('the panel that does the reading', () => {
  it('draws the reading sentence on its first render', () => {
    const html = renderToStaticMarkup(
      <RemoteDirPicker
        machineId="studio"
        machineLabel="Studio"
        initialPath=""
        onChoose={() => {}}
        onClose={() => {}}
      />
    );
    expect(html).toContain(DIR_PICKER_READING);
    expect(html).toContain(dirPickerTitle('Studio'));
  });
});
