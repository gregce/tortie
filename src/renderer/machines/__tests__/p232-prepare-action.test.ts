/**
 * The Prepare action on a project tab (Phase 232, item 4).
 *
 * What is pinned:
 *  - the label is the Settings button's label, imported and not retyped, so
 *    the two doors to `machines:prepare` cannot say two different things;
 *  - the action is offered for a `quiet` link and for no other, and never for
 *    a machine Tortie holds no statement about;
 *  - the button reaches the channel Settings reaches, `machines.prepare`,
 *    carries Settings' `data-machines-action`, puts main's sentence on its
 *    hover title after a press that did not prepare the machine and nowhere
 *    else, and draws no sentence of its own;
 *  - the four sidebars a person meets the sentence in mount it, being the
 *    Explorer, Source control's Changes group, Search and Context.
 *
 * The component reads the store, and zustand answers a server render from the
 * store's initial state, so the button's own markup is read from its source
 * the way the region bar's mounts are read in ../../app/__tests__.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { MachineStateView } from '@shared/ipc';
import { BTN_PREPARE, PREPARING } from '../../settings/machines-copy';
import {
  PREPARE_ACTION_BUSY,
  PREPARE_ACTION_LABEL,
  prepareActionOffered
} from '../prepare-action';

const RENDERER = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function view(over: Partial<MachineStateView>): MachineStateView {
  return {
    id: 'studio',
    label: 'Studio',
    color: 'orange',
    link: 'quiet',
    everAnswered: false,
    lastAnsweredAt: null,
    detail: 'Studio did not answer.',
    ...over
  };
}

describe('the label', () => {
  it('is the Settings button\'s label, and the busy label is Settings\' too', () => {
    expect(PREPARE_ACTION_LABEL).toBe(BTN_PREPARE);
    expect(PREPARE_ACTION_LABEL).toBe('Prepare this machine');
    expect(PREPARE_ACTION_BUSY).toBe(PREPARING);
  });
});

describe('prepareActionOffered', () => {
  it('offers the action for a quiet link and for no other', () => {
    expect(prepareActionOffered([view({ link: 'quiet' })], 'studio')).toBe(true);
    for (const link of ['connecting', 'connected', 'polling', 'refused'] as const) {
      expect(prepareActionOffered([view({ link })], 'studio')).toBe(false);
    }
  });

  it('offers nothing for a machine Tortie holds no statement about', () => {
    expect(prepareActionOffered([], 'studio')).toBe(false);
    expect(prepareActionOffered([view({ id: 'loft' })], 'studio')).toBe(false);
  });
});

describe('the button', () => {
  const src = readFileSync(
    join(RENDERER, 'app', 'MachinePrepareAction.tsx'),
    'utf8'
  );

  it('reaches the channel Settings reaches, under Settings\' own action name', () => {
    expect(src).toContain('.prepare(machineId)');
    expect(src).toContain('data-machines-action="prepare"');
    expect(src).toContain("gmuxBridge()?.machines");
  });

  it('draws the imported label and no sentence of its own', () => {
    expect(src).toContain('{busy ? PREPARE_ACTION_BUSY : PREPARE_ACTION_LABEL}');
    // No string literal of sentence length is typed into the component: every
    // word a person reads on it is the imported label.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    const literals = code.match(/'[^'\n]*'|"[^"\n]*"/g) ?? [];
    // A class list is lowercase words joined by hyphens and spaces; a sentence
    // carries a capital, a period or a comma.
    const sentences = literals.filter(
      (one) => /\s/.test(one) && /[A-Z.,]/.test(one)
    );
    expect(sentences).toEqual([]);
  });

  it('puts main\'s sentence on the hover title after a press that did not prepare, and nowhere else', () => {
    expect(src).toContain("if (result.class !== 'prepared') setSaid(result.detail);");
    expect(src).toContain('title={said ?? undefined}');
    expect(src).not.toContain('{said}');
  });

  it('renders nothing unless the rule offers it', () => {
    expect(src).toContain(
      'useApp((s) => prepareActionOffered(s.machineStates, machineId))'
    );
    expect(src).toContain('if (!offered || machines === undefined');
  });
});

describe('where it is mounted', () => {
  it('under the sentence in the Explorer, Source control, Search and Context', () => {
    const mounts: [string, string][] = [
      ['tree/FilesSection.tsx', '<MachinePrepareAction machineId={remote.machineId} />'],
      ['scm/ScmSection.tsx', '<MachinePrepareAction machineId={target.machineId} />'],
      ['search/ResultsList.tsx', '<MachinePrepareAction machineId={target.machineId} />'],
      ['context/ContextView.tsx', '<MachinePrepareAction machineId={target.machineId} />']
    ];
    for (const [file, mount] of mounts) {
      const src = readFileSync(join(RENDERER, file), 'utf8');
      expect(src, file).toContain(mount);
    }
  });

  it('is beside the sentence a person meets, in the same block', () => {
    const files = readFileSync(join(RENDERER, 'tree', 'FilesSection.tsx'), 'utf8');
    expect(files.replace(/\s+/g, ' ')).toContain(
      '{remoteRefusal} <MachinePrepareAction machineId={remote.machineId} />'
    );
    const scm = readFileSync(join(RENDERER, 'scm', 'ScmSection.tsx'), 'utf8');
    expect(scm.replace(/\s+/g, ' ')).toContain(
      '{remoteChangesUnreachable(label)} <MachinePrepareAction machineId={target.machineId} />'
    );
  });
});
