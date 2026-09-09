/**
 * What a project tab says and offers for a machine whose details changed
 * (Phase 235, item 4).
 *
 * ## The defect, reproduced four times by research 85 and again at 1bbcd7c1
 *
 * One execution bearing field was rewritten in the scratch profile's own
 * machines.json and nobody re-confirmed it. The row read `changed` and
 * `usable: false`, the view read `link: "refused"`, and what the tab drew was
 *
 *   Tortie is not connected to Greg’s Mac Pro, so it cannot read that folder.
 *   Greg’s Mac Pro did not answer, so Tortie could not read what changed.
 *
 * Both are false: that machine answered ssh in the same run and Tortie never
 * asked it. **0** actions were offered anywhere on the tab and the word
 * "confirm" appeared **0** times in the whole document, while main held the
 * true sentence and Settings held the button.
 *
 * ## What this file pins
 *
 * That the link cannot answer the question, so the fact rides beside it; that
 * the sentence is ONE sentence naming the machine by its LABEL and naming the
 * door; that the label on the button is Settings' own; that the four sidebars
 * swap the sentence rather than adding one, which is what keeps the operator's
 * rule of 2026-09-07; and that the two actions can never both be offered.
 *
 * The components read the store, so their markup is read from their source the
 * way ./p232-prepare-action.test.ts reads the Prepare button's.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { MachineStateView } from '@shared/ipc';
import { BTN_CONFIRM_CHANGED } from '../../settings/machines-copy';
import {
  CONFIRM_ACTION_LABEL,
  confirmActionOffered,
  confirmChangedLine,
  machineConfirmChangedLine
} from '../confirm-action';
import { prepareActionOffered } from '../prepare-action';

const RENDERER = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function view(over: Partial<MachineStateView>): MachineStateView {
  return {
    id: 'mac-pro',
    label: 'Greg’s Mac Pro',
    color: 'orange',
    link: 'refused',
    everAnswered: false,
    lastAnsweredAt: null,
    detail:
      'Tortie will not connect to mac-pro, because its details changed after ' +
      'you confirmed them.',
    ...over
  };
}

/** The row as it really read at the parent: refused, and changed. */
const CHANGED = view({ confirmNeeded: 'changed' });

describe('the fact the link cannot carry', () => {
  it('is offered for a changed row and for no other refused one', () => {
    expect(confirmActionOffered([CHANGED], 'mac-pro')).toBe(true);
    // The same link, and no confirmation is owed: a row nobody ever confirmed
    // and a version nobody accepted are both `refused` too.
    expect(confirmActionOffered([view({})], 'mac-pro')).toBe(false);
  });

  it('is offered for no healthy or in-flight machine', () => {
    for (const link of ['connecting', 'connected', 'polling', 'quiet'] as const) {
      expect(confirmActionOffered([view({ link })], 'mac-pro')).toBe(false);
    }
  });

  it('is offered for no machine Tortie holds a statement about', () => {
    expect(confirmActionOffered([], 'mac-pro')).toBe(false);
    expect(confirmActionOffered([{ ...CHANGED, id: 'loft' }], 'mac-pro')).toBe(
      false
    );
  });

  it('can never be offered at the same time as Prepare', () => {
    // Prepare wants a confirmed row that did not answer; this one wants a row
    // the gate refuses. A person never meets two buttons.
    expect(prepareActionOffered([CHANGED], 'mac-pro')).toBe(false);
    expect(confirmActionOffered([view({ link: 'quiet' })], 'mac-pro')).toBe(
      false
    );
  });
});

describe('the one short sentence', () => {
  const line = machineConfirmChangedLine('Greg’s Mac Pro');

  it('says the machine changed, what is needed, and where', () => {
    expect(line).toBe(
      'The details for Greg’s Mac Pro changed, so confirm them again in ' +
        'Settings, then Machines.'
    );
  });

  it('is one sentence', () => {
    expect(line.match(/\.(\s|$)/g)).toHaveLength(1);
  });

  it('names the machine the way the person named it, never by its id', () => {
    // Main's own true sentence calls it `mac-pro`. Every sentence a person
    // reads calls it by its label, and this one is composed from the label.
    expect(confirmChangedLine([CHANGED], 'mac-pro')).toContain('Greg’s Mac Pro');
    expect(confirmChangedLine([CHANGED], 'mac-pro')).not.toContain('mac-pro,');
  });

  it('is null for every machine that owes no confirmation', () => {
    expect(confirmChangedLine([view({})], 'mac-pro')).toBeNull();
    expect(confirmChangedLine([view({ link: 'connected' })], 'mac-pro')).toBeNull();
    expect(confirmChangedLine([], 'mac-pro')).toBeNull();
  });

  it('names no transport, no program and no verb of one', () => {
    for (const word of ['ssh', 'tmux', 'pane', 'window', 'prefix', 'socket']) {
      expect(line.toLowerCase()).not.toContain(word);
    }
  });
});

describe('the button', () => {
  const src = readFileSync(
    join(RENDERER, 'app', 'MachineConfirmAction.tsx'),
    'utf8'
  );

  it('carries the Settings button’s own label, imported and not retyped', () => {
    expect(CONFIRM_ACTION_LABEL).toBe(BTN_CONFIRM_CHANGED);
    expect(CONFIRM_ACTION_LABEL).toBe('Confirm the new details');
    expect(src).toContain('{CONFIRM_ACTION_LABEL}');
  });

  it('opens Settings and confirms nothing itself', () => {
    // Refusal 8 puts the agreement behind exactly one surface. A confirm sheet
    // reachable from a project tab would be a second one.
    expect(src).toContain('bridge.openSettings');
    expect(src).not.toContain('machines.confirm');
    expect(src).not.toContain('.prepare(');
  });

  it('renders nothing unless the rule offers it', () => {
    expect(src).toContain(
      'useApp((s) => confirmActionOffered(s.machineStates, machineId))'
    );
    expect(src).toContain('if (!offered || bridge?.openSettings === undefined)');
  });

  it('draws the imported label and no sentence of its own', () => {
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    const literals = code.match(/'[^'\n]*'|"[^"\n]*"/g) ?? [];
    const sentences = literals.filter(
      (one) => /\s/.test(one) && /[A-Z.,]/.test(one)
    );
    expect(sentences).toEqual([]);
  });

  it('sits in the same slot as the Prepare button', () => {
    const prepare = readFileSync(
      join(RENDERER, 'app', 'MachinePrepareAction.tsx'),
      'utf8'
    );
    for (const one of [src, prepare]) {
      expect(one).toContain("import './machine-tab-action.css';");
      expect(one).toContain('btn btn-secondary machine-tab-action');
    }
  });
});

describe('the four sidebars swap the sentence, and never add one', () => {
  const views: [string, string][] = [
    ['tree/FilesSection.tsx', 'remote.machineId'],
    ['scm/ScmSection.tsx', 'target.machineId'],
    ['search/ResultsList.tsx', 'target.machineId'],
    ['context/ContextView.tsx', 'target.machineId']
  ];

  it('each asks confirm-action.ts for the sentence', () => {
    for (const [file] of views) {
      const src = readFileSync(join(RENDERER, file), 'utf8');
      expect(src, file).toContain(
        "import { confirmChangedLine } from '../machines/confirm-action';"
      );
      expect(src, file).toContain('confirmChanged ??');
    }
  });

  it('each mounts the action beside the sentence', () => {
    for (const [file, id] of views) {
      const src = readFileSync(join(RENDERER, file), 'utf8');
      expect(src, file).toContain(`<MachineConfirmAction machineId={${id}} />`);
    }
  });

  it('none of them writes a sentence of its own for this state', () => {
    // The whole sentence exists in exactly one file. A second copy is the
    // drift `prepare-action.ts`'s header refuses for the label.
    for (const [file] of views) {
      const src = readFileSync(join(RENDERER, file), 'utf8');
      expect(src, file).not.toContain('confirm them again');
    }
  });
});
