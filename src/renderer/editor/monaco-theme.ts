/**
 * gmux-dark, the Monaco theme, as a FUNCTION of the frame (Phase 207).
 *
 * THEME CONSTANT FILE (CLAUDE.md UI rules). The literals below are the
 * shipped tokens of DESIGN.md sections 1.1, 1.2 and 1.6, each naming the
 * token it mirrors, moved here from monaco-impl.ts where Phase 11 defined
 * the theme once with 25 literals. Monaco needs literal hex, so the values
 * are mirrored, not read; what changed is that every neutral is looked up
 * through the chrome theme store first, so the editor takes the hue the
 * frame takes and the contrast lift the frame takes, and the syntax ramp
 * follows the ground by the same rule the terminal's palette does.
 *
 * `installMonacoTheme` defines the theme from the store's current state and
 * redefines it on every publish. Monaco applies a redefinition of the
 * current theme to every live editor at once, and `setTheme` is called
 * beside it so an editor created before the first publish is covered too.
 * This module sits in the Monaco chunk with monaco-impl.ts, behind the same
 * dynamic import, so the eager set carries none of it.
 *
 * Syntax colors reuse the section 1.6 terminal palette so terminal and
 * editor read as one color vocabulary, and src/renderer/pierre/theme-bridge.ts
 * mirrors the same ramp rule for rule for the diff view.
 */

import type * as monacoNs from 'monaco-editor';
import type { BaseScheme } from '@shared/settings';
import { useChromeTheme, type ChromeThemeState } from '../theme/chrome-theme';
import { TERMINAL_FLOOR, TEXT_FLOOR, followPalette } from '../theme/hue';
import { monacoThemeNameFor } from './monaco-theme-name';

/** The shipped neutrals and text, token to value, DESIGN.md section 1.1. */
const SHIPPED = {
  '--bg-canvas': '#131417',
  '--bg-surface': '#191B20',
  '--bg-raised': '#202329',
  '--bg-active': '#252931',
  '--border': '#25282E',
  '--border-strong': '#353943',
  '--text-secondary': '#9CA1AB',
  '--text-disabled': '#565B66'
} as const;

/** The same eight on the light base, DESIGN.md section 1.1b (Phase 213). */
const SHIPPED_LIGHT: Record<keyof typeof SHIPPED, string> = {
  '--bg-canvas': '#f5f7fa',
  '--bg-surface': '#fcfcfe',
  '--bg-raised': '#e5e7ed',
  '--bg-active': '#d9dce3',
  '--border': '#d1d3da',
  '--border-strong': '#adb1ba',
  '--text-secondary': '#4f535c',
  '--text-disabled': '#9297a4'
};

/**
 * The syntax ramp, section 1.6, plus the foreground and the cursor. These
 * are TEXT on the canvas and follow the ground the way the terminal's
 * palette does: the constants on every dark canvas, solved to keep their
 * shipped ratio once the text is dark.
 */
const SYNTAX = {
  fg: '#D8DBE2',
  cursor: '#E8EAED',
  comment: '#6E7583',
  string: '#6BC46D',
  escape: '#85D488',
  keyword: '#6CB6FF',
  number: '#E2B340',
  regexp: '#F07E78',
  type: '#56C2C0',
  fn: '#8FC7FF',
  constant: '#F0C674',
  punctuation: '#A8ADB8'
} as const;

/**
 * The same ramp over the light terminal palette, section 1.6b, slot for
 * slot: comment brightBlack, string green, escape brightGreen, keyword
 * blue, number yellow, regexp brightRed, type cyan, function brightBlue,
 * constant brightYellow, punctuation white. Diff and File render the same
 * file, and src/renderer/pierre/theme-bridge.ts takes these eleven too.
 */
const SYNTAX_LIGHT: Record<keyof typeof SYNTAX, string> = {
  fg: '#282a30',
  cursor: '#1e1f22',
  comment: '#6a707d',
  string: '#006814',
  escape: '#008422',
  keyword: '#025b9e',
  number: '#715500',
  regexp: '#ca4141',
  type: '#006464',
  fn: '#4075a9',
  constant: '#936b00',
  punctuation: '#51545c'
};

/** The accent and the feedback colours the theme uses; never rotated. */
const ACCENT = '#4D9DE8';
const WARNING = '#F5B84A';
const ERROR = '#E5655E';
const ACCENT_LIGHT = '#2175bd';
const WARNING_LIGHT = '#976900';
const ERROR_LIGHT = '#b23534';

const SIX_HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * The theme data for one state of the frame. Pure, so a test can pin it
 * without Monaco: the shipped state reproduces the Phase 11 theme byte for
 * byte, and a rotated or lifted state moves exactly the neutrals. On the
 * light base (Phase 213) the same table is filled from the light palette
 * over Monaco's own `vs` base, which is what makes its widgets light where
 * the theme names no key.
 */
export function gmuxMonacoTheme(
  state: ChromeThemeState
): monacoNs.editor.IStandaloneThemeData {
  const light = state.scheme === 'light';
  const shipped = light ? SHIPPED_LIGHT : SHIPPED;
  const syntax = light ? SYNTAX_LIGHT : SYNTAX;
  const ACC = light ? ACCENT_LIGHT : ACCENT;
  const WARN = light ? WARNING_LIGHT : WARNING;
  const ERR = light ? ERROR_LIGHT : ERROR;
  // A neutral: the override when the frame has one AND it is a six digit
  // hex (every neutral override is), else the shipped literal. The alpha
  // suffixes below need six digits in front of them.
  const n = (token: keyof typeof SHIPPED): string => {
    const value = state.overrides[token];
    return value !== undefined && SIX_HEX.test(value) ? value : shipped[token];
  };
  const canvas = n('--bg-canvas');
  // The foreground is TEXT and takes the text floor, exactly as the
  // terminal's foreground does in src/renderer/terminal/theme.ts, so the two
  // foregrounds, the same constant on the same canvas, agree on every ground
  // rather than parting between 3:1 and 4.5:1. The ramp takes the palette
  // floor, as the ANSI colours do.
  const s = followPalette(syntax, shipped['--bg-canvas'], canvas, state.textDark, [], (key) =>
    key === 'fg' ? TEXT_FLOOR : TERMINAL_FLOOR
  );
  const bare = (hex: string): string => hex.replace(/^#/, '');
  return {
    base: light ? 'vs' : 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: bare(s.comment), fontStyle: 'italic' },
      { token: 'string', foreground: bare(s.string) },
      { token: 'string.escape', foreground: bare(s.escape) },
      { token: 'keyword', foreground: bare(s.keyword) },
      { token: 'number', foreground: bare(s.number) },
      { token: 'regexp', foreground: bare(s.regexp) },
      { token: 'type', foreground: bare(s.type) },
      { token: 'type.identifier', foreground: bare(s.type) },
      { token: 'identifier', foreground: bare(s.fg) },
      { token: 'function', foreground: bare(s.fn) },
      { token: 'constant', foreground: bare(s.constant) },
      { token: 'variable', foreground: bare(s.fg) },
      { token: 'operator', foreground: bare(s.punctuation) },
      { token: 'delimiter', foreground: bare(s.punctuation) },
      { token: 'tag', foreground: bare(s.keyword) },
      { token: 'attribute.name', foreground: bare(s.type) },
      { token: 'attribute.value', foreground: bare(s.string) },
      { token: 'key', foreground: bare(s.type) },
      { token: 'string.key.json', foreground: bare(s.type) },
      { token: 'string.value.json', foreground: bare(s.string) }
    ],
    colors: {
      'editor.background': canvas, // --bg-canvas: one material with the app
      'editor.foreground': s.fg,
      'editorCursor.foreground': s.cursor,
      'editor.lineHighlightBackground': n('--bg-surface'),
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': `${ACC}4D`, // --accent @ .30, as terminal
      'editor.inactiveSelectionBackground': `${ACC}24`,
      'editorLineNumber.foreground': n('--text-disabled'),
      'editorLineNumber.activeForeground': n('--text-secondary'),
      'editorIndentGuide.background1': n('--bg-raised'),
      'editorIndentGuide.activeBackground1': n('--border-strong'),
      'editorWhitespace.foreground': n('--border'),
      'editorGutter.background': canvas,
      'editorWidget.background': n('--bg-surface'), // find widget etc.
      'editorWidget.border': n('--border'),
      'editorSuggestWidget.background': n('--bg-surface'),
      'editorSuggestWidget.border': n('--border'),
      'editorSuggestWidget.selectedBackground': n('--bg-active'),
      'editorHoverWidget.background': n('--bg-surface'),
      'editorHoverWidget.border': n('--border'),
      'input.background': n('--bg-surface'),
      'input.border': n('--border-strong'),
      'inputOption.activeBorder': ACC,
      focusBorder: ACC,
      'scrollbarSlider.background': `${n('--bg-raised')}99`,
      'scrollbarSlider.hoverBackground': `${n('--bg-active')}CC`,
      'scrollbarSlider.activeBackground': `${n('--border-strong')}CC`,
      'scrollbar.shadow': '#00000000',
      'editorOverviewRuler.border': '#00000000',
      // Bracket pairs. Colorization is turned off at the model (monaco-loader)
      // AND neutralised here, because vs-dark's rainbow exists in no gmux
      // token, and Split renders the same fenced block twice on one screen:
      // Monaco on the left, Shiki on the right. All six depths take the
      // `delimiter` colour Shiki uses; only an UNMATCHED bracket is allowed
      // to speak, in --error.
      'editorBracketHighlight.foreground1': s.punctuation,
      'editorBracketHighlight.foreground2': s.punctuation,
      'editorBracketHighlight.foreground3': s.punctuation,
      'editorBracketHighlight.foreground4': s.punctuation,
      'editorBracketHighlight.foreground5': s.punctuation,
      'editorBracketHighlight.foreground6': s.punctuation,
      'editorBracketHighlight.unexpectedBracket.foreground': ERR,
      // The MATCHING-bracket box, which vs-dark would otherwise draw in grey.
      'editorBracketMatch.background': '#00000000',
      'editorBracketMatch.border': n('--border-strong'),
      // Minimap (Phase 12 item 6). Monaco derives the slider at roughly α.30,
      // which is invisible on this ground; these pin it to the token ramp.
      'minimap.background': canvas, // --bg-canvas, one material
      'minimap.selectionHighlight': `${ACC}4D`,
      'minimap.findMatchHighlight': `${WARN}66`, // --warning, as the find ruler
      'minimap.errorHighlight': `${ERR}99`,
      'minimap.warningHighlight': `${WARN}99`,
      // One step up the neutral ramp from the real scrollbar's slider: over a
      // dense picture of text, the scrollbar's own value derives to invisible.
      'minimapSlider.background': `${n('--bg-active')}CC`,
      'minimapSlider.hoverBackground': `${n('--border-strong')}CC`,
      'minimapSlider.activeBackground': `${n('--border-strong')}EE`,
      // Alpha only: how solid the miniature text renders.
      'minimap.foregroundOpacity': '#000000CC'
      // (Diff colors left with the Monaco diff editor in Phase 11; diff
      // theming lives in src/renderer/pierre/theme-bridge.ts now.)
    }
  };
}

/**
 * Define gmux-dark from the frame's current state and keep it defined as
 * the frame moves. Called once from monaco-impl.ts at module scope, which
 * runs on the first file open; the subscription lives as long as the
 * renderer does, because nothing ever unloads Monaco.
 */
export function installMonacoTheme(m: typeof monacoNs): void {
  const define = (state: ChromeThemeState): void => {
    // Both names are defined every time so an editor can ask for either;
    // the one set is the base in effect (Phase 213). Redefining the current
    // theme reaches every live editor, and `setTheme` covers one created
    // before the first publish.
    const other: BaseScheme = state.scheme === 'light' ? 'dark' : 'light';
    m.editor.defineTheme(monacoThemeNameFor(other), gmuxMonacoTheme({ ...state, scheme: other, overrides: {} }));
    m.editor.defineTheme(monacoThemeNameFor(state.scheme), gmuxMonacoTheme(state));
    m.editor.setTheme(monacoThemeNameFor(state.scheme));
  };
  define(useChromeTheme.getState());
  useChromeTheme.subscribe(define);
}
