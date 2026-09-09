/**
 * Phase 242 fix round — the checklist he runs names controls that exist.
 *
 * ## Why this file is here
 *
 * `docs/ACCEPTANCE-p242.md` is a script the operator follows from the operator's
 * seat, and its §4 told him to "clear the folder from the field under Saving
 * files, then confirm". There is no such field: once a folder is confirmed,
 * `SavingFiles` in `../MachineRow.tsx` draws one sentence and one button, and
 * that button withdraws the whole confirmation of the machine rather than just
 * the folder. Following §4 he would have hunted for a control that is not
 * there, and if he found the button instead, his machine would have stopped
 * being usable with the checklist never having said so.
 *
 * A quoted string in a checklist is a copy of shipped copy, and a copy decays.
 * So the strings the checklist puts in a person's hands are read out of the
 * document and compared to the constants the product draws, which is the only
 * way that page stays true after the next round moves a word.
 *
 * ## What it does NOT do
 *
 * It does not read the prose. Whether §4 explains the cost is a judgement and
 * this file makes none: what it pins is that the section naming the way to turn
 * saving off names the button that really does it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BTN_ALLOW_WRITES,
  BTN_CONFIRM_WRITES,
  BTN_STOP_SAVING,
  SAVING_TITLE,
  WRITE_ROOT_LABEL
} from '../machines-copy';
import { MACHINE_WRITE_HONESTY } from '../../../main/machines/confirm';
import { remoteEntryWritesOffLabel } from '../../machines/explorer';

const CHECKLIST = join(process.cwd(), 'docs', 'ACCEPTANCE-p242.md');

const text = readFileSync(CHECKLIST, 'utf8');

/** The document with its line wrapping and its blockquote marks taken out. */
const flat = text.replace(/^[ \t]*>[ \t]?/gm, '').replace(/\s+/g, ' ');

/** One numbered section of the checklist, heading to the rule below it. */
const sectionOf = (heading: string): string => {
  const at = text.indexOf(`## ${heading}`);
  expect(at).toBeGreaterThan(-1);
  const end = text.indexOf('\n---', at);
  return text.slice(at, end < 0 ? undefined : end);
};

describe('the acceptance checklist quotes copy the product really draws', () => {
  it('names the four controls of the Saving files block by their shipped strings', () => {
    for (const one of [
      SAVING_TITLE,
      BTN_ALLOW_WRITES,
      WRITE_ROOT_LABEL,
      BTN_CONFIRM_WRITES,
      BTN_STOP_SAVING
    ]) {
      expect(flat).toContain(one);
    }
  });

  it('quotes the honesty paragraph off the sheet word for word', () => {
    expect(flat).toContain(MACHINE_WRITE_HONESTY);
  });

  it('quotes the Explorer refusal off the shipped composer', () => {
    expect(flat).toContain(remoteEntryWritesOffLabel("Greg's Mac Pro"));
  });
});

describe('the section that turns saving off names the button that does it', () => {
  it('names the button and not a field, because after a folder is confirmed there is no field', () => {
    const off = sectionOf('4. Turn it off');
    expect(off).toContain(BTN_STOP_SAVING);
    // The control the block draws instead of the field is the one thing this
    // section has to get right; the field belongs to §1, before a folder is
    // confirmed, and it is named there.
    expect(sectionOf('1. Turn it on')).toContain(WRITE_ROOT_LABEL);
  });
});
