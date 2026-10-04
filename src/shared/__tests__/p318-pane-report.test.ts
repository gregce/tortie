/**
 * The pane-report question, moved to src/shared (Phase 318, build/p318/SPEC.md
 * §Revision R14, D23): the shared predicates answer what the renderer's three
 * report tests assert, each renderer file's export IS the shared function, and
 * the renderer files declare none of them.
 *
 * Main's attach host asks this question before it counts a keystroke from the
 * Mac as the person answering, so a report the pane sends about itself (a blur,
 * a resize half a minute after attach, a return to a session) never clears a
 * waiting question's hook words.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as shared from '../pane-report';
import * as color from '../../renderer/terminal/keys/color-report';
import * as device from '../../renderer/terminal/keys/device-report';
import * as focus from '../../renderer/terminal/keys/focus-report';
import * as pane from '../../renderer/terminal/keys/pane-report';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ESC = String.fromCharCode(0x1b);
const DA1 = `${ESC}[?1;2c`;
const DA2 = `${ESC}[>0;276;0c`;
const FOREGROUND = `${ESC}]10;rgb:d8d8/dbdb/e2e2${ESC}\\`;
const BACKGROUND = `${ESC}]11;rgb:1313/1414/1717${ESC}\\`;
const FOCUS_IN = `${ESC}[I`;
const FOCUS_OUT = `${ESC}[O`;

/** Keys and pastes a person makes, none of which may be taken for a report. */
const TYPED = [
  'x',
  '1',
  '\r',
  String.fromCharCode(0x03),
  ESC,
  `${ESC}[A`,
  `${ESC}OA`,
  `${ESC}[15~`,
  `${ESC}[200~hello${ESC}[201~`,
  `${ESC}[I${ESC}[O`,
  `1${ESC}[I`,
  `${ESC}[Ix`,
  `${DA1}x`,
  `${ESC}[?1;2`,
  `${ESC}]10;rgb:d8d8/dbdb/e2e${ESC}\\`,
  `${ESC}]12;rgb:d8d8/dbdb/e2e2${ESC}\\`
];

describe('src/shared/pane-report.ts', () => {
  it('answers yes for exactly the three kinds the renderer measured', () => {
    for (const report of [FOCUS_IN, FOCUS_OUT, FOREGROUND, BACKGROUND, DA1, DA2]) {
      expect(shared.isPaneReport(report), JSON.stringify(report)).toBe(true);
    }
    expect(shared.FOCUS_IN_REPORT).toBe(FOCUS_IN);
    expect(shared.FOCUS_OUT_REPORT).toBe(FOCUS_OUT);
    expect(shared.isFocusReport(FOCUS_IN)).toBe(true);
    expect(shared.isColorReport(FOREGROUND)).toBe(true);
    expect(shared.isDeviceReport(DA2)).toBe(true);
  });

  it('answers no for anything a person can type or paste, a report inside a keystroke included', () => {
    for (const typed of TYPED) expect(shared.isPaneReport(typed), JSON.stringify(typed)).toBe(false);
  });

  it('each kind answers only for its own kind', () => {
    expect(shared.isFocusReport(FOREGROUND)).toBe(false);
    expect(shared.isColorReport(FOCUS_IN)).toBe(false);
    expect(shared.isDeviceReport(FOCUS_OUT)).toBe(false);
    expect(shared.isDeviceReport(BACKGROUND)).toBe(false);
  });
});

describe('the renderer keeps its files and re-exports, so no importer moved', () => {
  it('each renderer export IS the shared function or constant', () => {
    expect(pane.isPaneReport).toBe(shared.isPaneReport);
    expect(focus.isFocusReport).toBe(shared.isFocusReport);
    expect(focus.FOCUS_IN_REPORT).toBe(shared.FOCUS_IN_REPORT);
    expect(focus.FOCUS_OUT_REPORT).toBe(shared.FOCUS_OUT_REPORT);
    expect(color.isColorReport).toBe(shared.isColorReport);
    expect(device.isDeviceReport).toBe(shared.isDeviceReport);
  });

  it('the four renderer files declare none of the predicates: re-exports only (Y17)', () => {
    for (const file of ['pane-report.ts', 'focus-report.ts', 'color-report.ts', 'device-report.ts']) {
      const text = readFileSync(join(ROOT, 'src', 'renderer', 'terminal', 'keys', file), 'utf8');
      // Comments blanked: since Phase 320.1 each renderer file keeps the
      // measurement behind its shape as prose, and prose may say "function".
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code, file).not.toMatch(/\bfunction\b|\bconst\b|\blet\b|\bRegExp\b/);
      expect(text, file).toMatch(/export \{[^}]+\} from '@shared\/pane-report';/);
    }
  });

  it('the shared file declares each predicate once', () => {
    const text = readFileSync(join(ROOT, 'src', 'shared', 'pane-report.ts'), 'utf8');
    for (const name of ['isPaneReport', 'isFocusReport', 'isColorReport', 'isDeviceReport']) {
      expect(text.split(`export function ${name}(`).length - 1, name).toBe(1);
    }
  });
});
