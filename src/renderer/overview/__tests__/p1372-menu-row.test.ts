/**
 * Phase 137.2, the session menu's Catch Me Up row, held by source reading
 * the way no-integer.test.ts holds the views. The live half, being the real
 * native menu opened and pressed, runs in build/probe-p1372-menu.mjs.
 *
 * What is held here:
 *  - the label is 'Catch me up…' with the one character ellipsis, no chord
 *    hint, no dash of any kind
 *  - the row is composed once and joins BOTH branches of sessionMenuItems,
 *    directly after the saved output row each time, so the unknown branch
 *    keeps it too
 *  - its run opens the overview for exactly the session whose menu it was,
 *    through openOverviewForSession, which asks for the one session level
 *    with openedFromProject false
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const actions = readFileSync(
  join(__dirname, '..', '..', 'app', 'session-actions.tsx'),
  'utf8'
);
const opener = readFileSync(
  join(__dirname, '..', 'open-overview.ts'),
  'utf8'
);

describe('the Catch me up row', () => {
  it('carries the one character ellipsis and no dash', () => {
    expect(actions).toContain("label: 'Catch me up…'");
    expect(actions).not.toContain('Catch me up...');
  });

  it('carries no chord hint and is never disabled', () => {
    const at = actions.indexOf('function catchMeUpItem');
    expect(at).toBeGreaterThan(-1);
    const body = actions.slice(
      at,
      actions.indexOf('}', actions.indexOf('run:', at))
    );
    expect(body).not.toContain('hint:');
    expect(body).not.toContain('disabled:');
    // The row's own strings and comments carry no em or en dash.
    expect(body.includes('—')).toBe(false);
    expect(body.includes('–')).toBe(false);
  });

  it('joins both branches, directly after the saved output row', () => {
    const uses = actions.match(/catchMeUpItem\(session\)/g) ?? [];
    expect(uses.length).toBe(2);
    const pairs =
      actions.match(
        /savedOutputItem\(session\),\s*(?:\/\/[^\n]*\n\s*)*catchMeUpItem\(session\),/g
      ) ?? [];
    expect(pairs.length).toBe(2);
  });

  it('opens the overview for the session whose menu it was', () => {
    expect(actions).toContain(
      'openOverviewForSession(session.id, session.projectPath)'
    );
  });

  it('lands on the one session level and Escape leaves the page', () => {
    const at = opener.indexOf('export async function openOverviewForSession');
    expect(at).toBeGreaterThan(-1);
    const body = opener.slice(at, opener.indexOf('\n}', at));
    expect(body).toContain("level: 'session'");
    expect(body).toContain('openedFromProject: false');
    expect(body).toContain('sessionIds: [sessionId]');
  });
});
