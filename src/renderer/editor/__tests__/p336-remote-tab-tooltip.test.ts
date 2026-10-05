/**
 * PHASE 336, integrator. The tooltip on a tab holding a file on another
 * machine says "This view is read only." ONLY when the tab is read only.
 *
 * Before this phase the sentence was drawn on every remote tab that was not a
 * commit, which was already false of a tab under a legacy write folder and
 * would have been false of every tab inside an open project once those became
 * edit surfaces. The strip now hands `tabTooltipIdentity` the editor's own
 * answer (`tabIsReadOnly` through `remoteTabWriteFolder`), so the tooltip and
 * Monaco cannot disagree. Read off the strip's source too, so the call that
 * passes the answer cannot quietly go back to the one-argument form.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MachineStateView } from '@shared/ipc';
import type { Project } from '@shared/types';
import { reviewTabTooltip } from '../../machines/review';
import { tabTooltipIdentity } from '../tab-identity';
import { remoteTabWriteFolder, tabIsReadOnly } from '../tab-readonly';
import type { EditorTab } from '../tab-types';

const LABEL = 'Studio';

function states(savesInProjects: boolean): MachineStateView[] {
  return [
    {
      id: 'studio',
      label: LABEL,
      color: 'blue',
      link: 'connected',
      everAnswered: true,
      lastAnsweredAt: 0,
      detail: null,
      savesInProjects,
      writeRoot: null
    } as MachineStateView
  ];
}

const projects: Project[] = [
  { id: 'p1', path: '/srv/greg/api', name: 'api', machineId: 'studio' } as Project
];

function tab(path: string): EditorTab {
  return {
    name: 'auth.ts',
    relPath: 'src/auth.ts',
    path,
    commit: null,
    deleted: false,
    truncated: false,
    mode: 'file',
    canDiff: false,
    remote: { machineId: 'studio', machineLabel: LABEL, repoPath: '/srv/greg/api' }
  } as unknown as EditorTab;
}

function tooltipFor(t: EditorTab, view: MachineStateView[]): string {
  const readOnly = tabIsReadOnly(t, remoteTabWriteFolder(t, view, projects));
  return tabTooltipIdentity(t, readOnly);
}

describe('the remote tab tooltip says read only only when it is', () => {
  it('drops the sentence for a file inside a project open on a confirmed machine', () => {
    const line = tooltipFor(tab('/srv/greg/api/src/auth.ts'), states(true));
    expect(line).toBe('auth.ts on Studio.');
    expect(line).not.toContain('read only');
  });

  it('keeps it for a file outside every project opened there', () => {
    const line = tooltipFor(tab('/srv/other/auth.ts'), states(true));
    expect(line).toBe('auth.ts on Studio. This view is read only.');
  });

  it('keeps it for a machine that is not confirmed right now', () => {
    const line = tooltipFor(tab('/srv/greg/api/src/auth.ts'), states(false));
    expect(line).toBe('auth.ts on Studio. This view is read only.');
  });

  it('keeps it for a file too large to save there', () => {
    const big = { ...tab('/srv/greg/api/src/auth.ts'), saveCapped: { bytes: 150_000, over: false } };
    const line = tooltipFor(big as EditorTab, states(true));
    expect(line).toBe('auth.ts on Studio. This view is read only.');
  });

  it('defaults to read only for a caller that cannot ask', () => {
    expect(reviewTabTooltip('auth.ts', LABEL)).toBe('auth.ts on Studio. This view is read only.');
    expect(tabTooltipIdentity(tab('/srv/greg/api/src/auth.ts'))).toBe(
      'auth.ts on Studio. This view is read only.'
    );
  });

  it('is handed the editor answer by the strip', () => {
    const src = readFileSync(resolve(__dirname, '../EditorTabs.tsx'), 'utf8');
    expect(src).toMatch(/tabIsReadOnly\(tab, remoteTabWriteFolder\(tab, machineStates, projects\)\)/);
    expect(src).toMatch(/tabTooltipIdentity\(tab, readOnly\)/);
  });
});
