/**
 * PHASE 336. The words a person reads about writing on another machine, byte
 * for byte against build/p336/SPEC.md section 10, and the two rules that bind
 * all of them.
 *
 * WHY THE WORDS CHANGED. Saving on another machine needed a person to type a
 * folder in Settings, then Machines, and confirm a sheet, so every refusal
 * named that door. His ruling of 4 October 2026 removed the door: a project
 * open on a confirmed machine is a folder Tortie may write under, as on this
 * Mac. So no write sentence may send anybody to Settings, and none may explain
 * that the machine is remote (his standing rule that remote feels identical to
 * local).
 *
 * THE TWO RULES ARE ASKED OF EVERY EXPORT, not of a hand list. Each exported
 * function of ./editor.ts, ./explorer.ts and ./scm.ts is called with a fixed
 * label in every argument, and each reason-taking function with every reason,
 * so a sentence added later is read without anybody remembering to add it.
 */

import { describe, expect, it } from 'vitest';
import * as editor from '../editor';
import * as explorer from '../explorer';
import * as projectTab from '../project-tab';
import * as scm from '../scm';

const L = 'Studio';
const F = '/srv/greg/api';

describe('section 10, byte for byte', () => {
  it('draws the three read-only bands', () => {
    expect(editor.remoteFileOutsideChip(L)).toBe(
      'This file is on Studio, outside the projects you opened there, so ' +
        'Tortie only shows it.'
    );
    expect(editor.remoteNeverFolderLine(L)).toBe(
      'Tortie does not save in a home folder, a folder directly inside one, ' +
        'or a folder holding one, on Studio.'
    );
    expect(editor.remoteSaveCapChip(150_000, L)).toBe(
      'That file is 150,000 bytes and Tortie saves files up to 90,000 bytes ' +
        'on Studio, so it is shown read only.'
    );
    expect(editor.remoteSaveCapChipOver(2_097_152, L)).toBe(
      'That file is over 2,097,152 bytes and Tortie saves files up to ' +
        '90,000 bytes on Studio, so it is shown read only.'
    );
  });

  it('says a refused save in the same terms', () => {
    expect(editor.remoteSaveOutsideProjects(L)).toBe(
      'Tortie saves on Studio only inside a project you opened there. ' +
        'Nothing was written.'
    );
    expect(editor.remoteSaveNever(L)).toBe(
      'Tortie does not save in a home folder, a folder directly inside one, ' +
        'or a folder holding one, on Studio. Nothing was written.'
    );
    expect(editor.remoteSaveFolderChanged(F, L)).toBe(
      '/srv/greg/api on Studio is not the folder you opened any more, so ' +
        'Tortie wrote nothing. Open it again to save there.'
    );
    expect(editor.remoteSaveProtected(L)).toBe(
      'Tortie does not touch .git or .ssh folders on Studio. Nothing was ' +
        'written.'
    );
  });

  it('maps the two words main answers that name a folder or none', () => {
    expect(editor.remoteSaveRefusal('writesOff', L, null, 0)).toBe(
      editor.remoteSaveOutsideProjects(L)
    );
    expect(editor.remoteSaveRefusal('writesOff', L, F, 0)).toBe(
      editor.remoteSaveNever(L)
    );
    expect(editor.remoteSaveRefusal('folderChanged', L, F, 0)).toBe(
      editor.remoteSaveFolderChanged(F, L)
    );
    expect(editor.remoteSaveRefusal('protected', L, F, 0)).toBe(
      editor.remoteSaveProtected(L)
    );
  });

  it('says the Explorer and Source control forms with "changed nothing"', () => {
    expect(explorer.remoteEntryWritesOff(L)).toBe(
      'Tortie changes files on Studio only inside a project you opened ' +
        'there. Nothing was changed.'
    );
    expect(explorer.remoteEntryFolderChanged(F, L)).toBe(
      '/srv/greg/api on Studio is not the folder you opened any more, so ' +
        'Tortie changed nothing. Open it again to change files there.'
    );
    expect(explorer.remoteEntryProtected(L)).toBe(
      'Tortie does not touch .git or .ssh folders on Studio. Nothing was ' +
        'changed.'
    );
    expect(explorer.remoteEntryNever(L)).toBe(
      `${editor.remoteNeverFolderLine(L)} Nothing was changed.`
    );
    expect(scm.remoteIndexWriteRefusal('writesOff', 'outside', F, L)).toBe(
      explorer.remoteEntryWritesOff(L)
    );
    expect(scm.remoteIndexWriteRefusal('folderChanged', null, F, L)).toBe(
      explorer.remoteEntryFolderChanged(F, L)
    );
    expect(scm.remoteIndexWriteRefusal('protected', null, F, L)).toBe(
      explorer.remoteEntryProtected(L)
    );
  });

  it('draws the tree menu note and the header titles', () => {
    expect(explorer.remoteTreeNoTrash(L)).toBe(
      'Tortie cannot move files on Studio to the Trash.'
    );
    // "The writes-off label without Nothing was ...".
    expect(explorer.remoteWriteRefusedLabel('outside', L)).toBe(
      'Tortie changes files on Studio only inside a project you opened there.'
    );
    expect(explorer.remoteWriteRefusedLabel('never', L)).toBe(
      editor.remoteNeverFolderLine(L)
    );
    for (const reason of ['outside', 'never', 'unconfirmed'] as const) {
      expect(explorer.remoteWriteRefusedLabel(reason, L)).not.toContain(
        'Nothing was'
      );
    }
  });

  it("says the commit box's reason in main's commit words", () => {
    expect(scm.remoteCommitRefusedLabel('outside', L)).toBe(
      'Tortie commits on Studio only in a project you opened there.'
    );
    expect(scm.remoteCommitRefusedLabel('never', L)).toBe(
      'Tortie does not commit in a home folder, a folder directly inside ' +
        'one, or a folder holding one, on Studio.'
    );
  });
});

/** Every string a function export answers when every argument is the label. */
function everySentence(): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  const modules = { editor, explorer, scm } as Record<
    string,
    Record<string, unknown>
  >;
  for (const [file, mod] of Object.entries(modules)) {
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value === 'string') {
        out.push({ name: `${file}.${name}`, text: value });
        continue;
      }
      if (typeof value !== 'function') continue;
      const fn = value as (...args: unknown[]) => unknown;
      const args = Array.from({ length: Math.max(fn.length, 1) }, () => L);
      try {
        const said = fn(...args);
        if (typeof said === 'string') out.push({ name: `${file}.${name}`, text: said });
      } catch {
        // A function whose arguments are not text is asked below by reason.
      }
    }
  }
  for (const reason of ['outside', 'never', 'unconfirmed'] as const) {
    out.push({ name: `chip:${reason}`, text: editor.remoteFileRefusedChip(reason, L) });
    out.push({ name: `save:${reason}`, text: editor.remoteSaveRefusedFor(reason, L) });
    out.push({
      name: `label:${reason}`,
      text: explorer.remoteWriteRefusedLabel(reason, L)
    });
    out.push({
      name: `commit:${reason}`,
      text: scm.remoteCommitRefusedLabel(reason, L)
    });
  }
  for (const outcome of ['writesOff', 'folderChanged', 'protected'] as const) {
    for (const refused of ['outside', 'never', 'unconfirmed', null] as const) {
      out.push({
        name: `index:${outcome}:${String(refused)}`,
        text: scm.remoteIndexWriteRefusal(outcome, refused, F, L)
      });
    }
  }
  const words = [
    'writesOff',
    'outsideRoot',
    'folderChanged',
    'protected',
    'stale',
    'missing',
    'exists',
    'nomode',
    'nosum',
    'tooLarge'
  ] as const;
  for (const word of words) {
    for (const root of [F, null]) {
      out.push({
        name: `refusal:${word}:${String(root)}`,
        text: editor.remoteSaveRefusal(word, L, root, 96_231)
      });
    }
  }
  return out;
}

describe('the two rules over every write sentence', () => {
  const all = everySentence();

  it('reads a set rather than nothing', () => {
    expect(all.length).toBeGreaterThan(60);
  });

  it('never sends a person to Settings', () => {
    expect(
      all
        .filter(
          (one) => one.text.includes('Settings') || one.text.includes('then Machines')
        )
        .map((one) => one.name)
    ).toEqual([]);
  });

  it('never explains that the machine is remote', () => {
    expect(
      all.filter((one) => /\bremote\b/i.test(one.text)).map((one) => one.name)
    ).toEqual([]);
  });

  it('keeps the deleted Settings sentences deleted', () => {
    const gone = [
      'remoteFileChip',
      'remoteSaveRefused',
      'remoteTreeCanWrite',
      'remoteOpenTooLargeOver',
      'remoteWritesNotConfirmed'
    ];
    const names = [
      ...Object.keys(editor),
      ...Object.keys(explorer),
      ...Object.keys(scm)
    ];
    expect(names.filter((one) => gone.includes(one))).toEqual([]);
  });
});

/**
 * PHASE 336'S FIX ROUND. The sheet that opens a folder on a machine and Home's
 * row for it each said "Tortie writes there only where you have let it save",
 * true at the parent and false once this phase removed the only act that let
 * it save; the Lens 2 verifier read both off the screen at HEAD. Every export
 * of ./project-tab.ts is asked here, so a later sentence that names a grant is
 * read without anybody remembering to add it.
 */
describe('opening a folder on a machine names no grant', () => {
  it('says where the folder stays, and nothing about saving', () => {
    expect(projectTab.openRemoteHonesty(L)).toBe('The folder stays on Studio.');
    expect(projectTab.OPEN_ON_MACHINE_SUBTITLE).toBe('The folder stays on that machine.');
  });

  it('holds no sentence naming a grant, Settings or the machine as remote', () => {
    const texts: { name: string; text: string }[] = [];
    for (const [name, value] of Object.entries(projectTab)) {
      if (typeof value === 'string') texts.push({ name, text: value });
      else if (typeof value === 'function') {
        for (const args of [[L], [F, L], [L, F, L], ['missing', F, L]]) {
          const out: unknown = (value as (...a: unknown[]) => unknown)(...args);
          if (typeof out === 'string') texts.push({ name, text: out });
        }
      }
    }
    expect(texts.length).toBeGreaterThan(10);
    expect(
      texts
        .filter((one) =>
          /let it save|let Tortie save|given permission|you have let|Settings|then Machines|\bremote\b/i.test(one.text)
        )
        .map((one) => `${one.name}: ${one.text}`)
    ).toEqual([]);
  });
});
