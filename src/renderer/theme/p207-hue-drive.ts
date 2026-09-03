/**
 * The harness drive for build/probe-p207-hue.mjs (Phase 207). It assigns one
 * object to `window` when its registrar is called, from
 * src/renderer/app/probe-registry.ts on a launch whose URL carries harness=1,
 * and reads nothing until the probe calls a method on it. Nothing here runs
 * in a normal launch.
 *
 * THE PROBE STAYS ON THE SHIPPED PATH. A hue is set through the same
 * settings bridge the Appearance slider uses, the applier reacts to the same
 * broadcast, and every colour is read back off the DOM as the compositor
 * sees it: computed background and text colour of the titlebar, the sidebar,
 * the Explorer tree host, the body (the canvas), the terminal host, the live
 * xterm theme and the Monaco editor. The one thing the drive reaches that no
 * setting can is the SYNTHETIC GROUND, `setProbeGroundLift` in ./apply.ts,
 * because the text flip cannot be reached by any hue and the phase promised
 * to drive it in the real app rather than only under node.
 */

import { useApp } from '../state/store';
import { useEditor } from '../editor/store';
import { getLoadedMonaco } from '../editor/monaco-loader';
import { getTerminal } from '../terminal/drop/registry';
import { gmuxBridge } from '../bridge';
import { probeGroundLiftNow, setProbeGroundLift } from './apply';
import { useChromeTheme } from './chrome-theme';

/** One element as the compositor paints it. Null when it is not mounted. */
export interface P207Paint {
  background: string;
  color: string;
}

export interface P207Reading {
  /** The persisted hue, as the settings bridge answers it. */
  chromeHue: number;
  /** The synthetic ground in effect, 0 in every real launch. */
  groundLift: number;
  /** What the applier last published. */
  canvas: string;
  textDark: boolean;
  /** The override map the applier last wrote, every token it moved. */
  overrides: Record<string, string>;
  /** Computed values of the tokens on the document root. */
  tokens: Record<string, string>;
  /** Computed paint of each element, by the selector it was found under. */
  paint: Record<string, P207Paint | null>;
  /** The live xterm theme of the first terminal, as xterm holds it. */
  terminal: { background: string; foreground: string; cursor: string } | null;
  /** Whether a Monaco editor is mounted. */
  editors: number;
}

const SELECTORS = [
  '.titlebar',
  '.activity-bar',
  '.sidebar',
  '.files-tree',
  'file-tree-container',
  'body',
  '.gmux-terminal-host',
  '.monaco-editor',
  '.monaco-editor-background',
  '.monaco-editor .view-lines'
];

const TOKENS = [
  '--bg-canvas',
  '--bg-sidebar',
  '--bg-surface',
  '--bg-raised',
  '--bg-active',
  '--border',
  '--border-active',
  '--border-strong',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--text-disabled'
];

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function paintOf(selector: string): P207Paint | null {
  const el = document.querySelector(selector);
  if (el === null) return null;
  const styles = getComputedStyle(el);
  return { background: styles.backgroundColor, color: styles.color };
}

async function readNow(): Promise<P207Reading> {
  const bridge = gmuxBridge();
  const settings =
    typeof bridge?.settingsGet === 'function' ? await bridge.settingsGet() : null;
  const root = getComputedStyle(document.documentElement);
  const tokens: Record<string, string> = {};
  for (const token of TOKENS) tokens[token] = root.getPropertyValue(token).trim();
  const paint: Record<string, P207Paint | null> = {};
  for (const selector of SELECTORS) paint[selector] = paintOf(selector);
  const session = useApp.getState().sessions[0];
  const term = session === undefined ? null : getTerminal(session.id);
  const theme = term?.options.theme;
  const state = useChromeTheme.getState();
  return {
    chromeHue: settings?.chromeHue ?? Number.NaN,
    groundLift: probeGroundLiftNow(),
    canvas: state.canvas,
    textDark: state.textDark,
    overrides: { ...state.overrides },
    tokens,
    paint,
    terminal:
      theme === undefined
        ? null
        : {
            background: theme.background ?? '',
            foreground: theme.foreground ?? '',
            cursor: theme.cursor ?? ''
          },
    editors: getLoadedMonaco()?.editor.getEditors().length ?? 0
  };
}

export interface P207Drive {
  /** Persist a hue through the bridge and wait for the applier to land it. */
  hue(chromeHue: number): Promise<P207Reading>;
  /** Persist any of the three appearance settings the same way. */
  appearance(patch: {
    highlightScheme?: 'blue' | 'teal' | 'purple' | 'slate';
    contrastLevel?: 'normal' | 'raised' | 'high';
    chromeHue?: number;
  }): Promise<P207Reading>;
  /** Set the synthetic ground and wait for the applier to land it. */
  ground(lift: number): Promise<P207Reading>;
  /** Open one real file in the editor and wait for Monaco to mount. */
  openFile(spec: { repoPath: string; relPath: string; path: string }): Promise<P207Reading>;
  read(): Promise<P207Reading>;
}

async function settle(expectCanvas: string | null): Promise<P207Reading> {
  for (let i = 0; i < 40; i += 1) {
    await wait(100);
    if (expectCanvas === null) break;
    if (useChromeTheme.getState().canvas === expectCanvas) break;
  }
  await wait(300);
  return readNow();
}

const drive: P207Drive = {
  async hue(chromeHue) {
    return drive.appearance({ chromeHue });
  },
  async appearance(patch) {
    const bridge = gmuxBridge();
    if (typeof bridge?.settingsSet !== 'function') {
      throw new Error('the settings bridge is not present');
    }
    await bridge.settingsSet(patch);
    // The applier lands the broadcast on the next tick; a fixed settle is
    // enough because the reading below compares against the persisted hue
    // rather than against a guessed colour.
    await wait(600);
    return readNow();
  },
  async ground(lift) {
    setProbeGroundLift(lift);
    return settle(null);
  },
  async openFile(spec) {
    await useApp.getState().addProjectPath(spec.repoPath);
    await wait(600);
    // The Explorer, so the Pierre tree host is on screen to be read.
    useApp.getState().showSidebarView('explorer');
    for (let i = 0; i < 40; i += 1) {
      if (document.querySelector('.files-tree') !== null) break;
      await wait(250);
    }
    useEditor.getState().openFromRequest({
      repoPath: spec.repoPath,
      relPath: spec.relPath,
      path: spec.path,
      mode: 'file',
      source: 'tree',
      preview: false
    });
    for (let i = 0; i < 80; i += 1) {
      if ((getLoadedMonaco()?.editor.getEditors().length ?? 0) > 0) break;
      await wait(250);
    }
    await wait(600);
    return readNow();
  },
  read: readNow
};

declare global {
  interface Window {
    /** `window.__gmuxP207`: the Phase 207 hue drive. */
    __gmuxP207?: P207Drive;
  }
}

export function registerP207HueDrive(): void {
  window.__gmuxP207 = drive;
}
