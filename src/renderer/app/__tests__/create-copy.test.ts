/**
 * Phase 87 — the create sheet stops explaining itself.
 *
 * WHAT THIS PHASE DELETED. The machine field used to draw five paragraphs under
 * the dropdown. Four of them are gone, being `POLL_HONESTY`, `CAPTURE_HONESTY`,
 * `ATTENTION_HONESTY` and `AGENT_LOCAL_CHECK`, along with
 * `CREATE_DIR_EMPTY_HINT` under the Directory field.
 *
 * WHY THE SURVIVING SENTENCE IS THE SURVIVING ONE. A person reading this sheet
 * has not created anything yet. Poll cadence, capture cadence and what Tortie
 * cannot tell you about a waiting session all describe things that happen after
 * a session exists, so they belong on the surfaces where they happen. The
 * conversation not coming back is the one fact a person cannot find out any
 * other way, and it changes whether they start the session at all.
 *
 * WHY `AGENT_LOCAL_CHECK` WAS CUT RATHER THAN REWORDED. It said Tortie had not
 * checked what is installed on the other machine. Phase 84 made that false.
 * `src/main/machines/remote-argv.ts` asks the machine itself where the named
 * program lives before anything is composed, and `noRemoteProgramRefusal` in
 * `src/main/machines/remote-copy.ts` refuses at the moment a person presses
 * Create. A caveat that claims the opposite of what the code does is worse than
 * no caveat.
 *
 * HOW IT READS. A deleted export cannot be imported, so the deletions are read
 * out of the source, which is the shape `create-machine-ready.test.tsx` already
 * uses for the reset rule. The environment is node and nothing here renders.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CREATE_DIR_HINT, CREATE_HONESTY_LINES } from '../../machines/create-sheet';

/**
 * Every machine sentence file, read as text and joined.
 *
 * PHASE 142 SPLIT ONE FILE INTO TWENTY. The guard below pins a deletion, so it
 * has to read the whole directory. Reading one file would let a deleted name
 * come back in a sibling and the guard would still pass.
 */
const MACHINES_DIR = resolve(import.meta.dirname, '../../machines');
const COPY_SOURCE = readdirSync(MACHINES_DIR)
  .filter((name) => name.endsWith('.ts'))
  .sort()
  .map((name) => readFileSync(join(MACHINES_DIR, name), 'utf8'))
  .join('\n');
const MODAL_SOURCE = readFileSync(
  resolve(import.meta.dirname, '../CreateSessionModal.tsx'),
  'utf8'
);
/**
 * PHASE 90.2 added a third file to this sheet, and the guard follows it.
 *
 * The deleted paragraphs were cut because they described things that have not
 * happened yet on a sheet where no session exists. A new block on that same
 * sheet is exactly where one of them would come back, so the guard reads it
 * too rather than covering two of the three files it now takes to draw this
 * sheet's copy.
 */
const BLOCK_SOURCE = readFileSync(
  resolve(import.meta.dirname, '../CounterpartBlock.tsx'),
  'utf8'
);

/** Every export this phase deleted from `presentation.ts`. */
const DELETED: readonly string[] = [
  'POLL_HONESTY',
  'CAPTURE_HONESTY',
  'ATTENTION_HONESTY',
  'AGENT_LOCAL_CHECK',
  'CREATE_DIR_EMPTY_HINT'
];

describe('the honesty block under the machine field', () => {
  it('draws one paragraph, and it is the one about the conversation', () => {
    expect(CREATE_HONESTY_LINES).toHaveLength(1);
    expect(CREATE_HONESTY_LINES[0]).toBe(
      'Tortie can start this session again on that machine, and it brings ' +
        'the conversation back only for an agent whose conversation it ' +
        'recorded.'
    );
  });

  it('names none of the four paragraphs this phase deleted', () => {
    const found = DELETED.filter((name) => COPY_SOURCE.includes(name));
    expect(found).toEqual([]);
  });

  it('does not let one back in through a later block on the same sheet', () => {
    const found = DELETED.filter(
      (name) => MODAL_SOURCE.includes(name) || BLOCK_SOURCE.includes(name)
    );
    expect(found).toEqual([]);
  });
});

describe('the caption under the Directory field', () => {
  it('is drawn once, and the second caption is gone from the sheet', () => {
    const drawn = MODAL_SOURCE.split('CREATE_DIR_HINT').length - 1;
    expect(drawn).toBe(2);
    expect(MODAL_SOURCE).not.toContain('CREATE_DIR_EMPTY_HINT');
  });

  it('still says what Phase 84 wrote, byte for byte', () => {
    // The one caveat this phase kept. It survives because the check it
    // describes happens at the moment a person presses Create, which is what
    // makes it true. A later round must not soften it.
    expect(CREATE_DIR_HINT).toBe(
      'This folder is on the other machine. Tortie asks that machine whether ' +
        'the folder is there before it starts anything.'
    );
  });
});
