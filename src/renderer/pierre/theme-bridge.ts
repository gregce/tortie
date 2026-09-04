/**
 * Pierre theme bridge — the ONLY theming path into @pierre/diffs and
 * @pierre/trees (research 12 §3 step 1). Both libraries render in shadow DOM,
 * so page-level CSS custom properties from tokens.css can NOT cascade in:
 *   - diffs takes a theme by NAME (`ThemesType`); we register a custom
 *     Shiki/VS Code-format theme built from the gmux palette and reference it.
 *   - trees takes host-level styles; `themeToTreeStyles(theme)` maps the same
 *     theme onto `--trees-theme-*` vars, which we extend with the git-lane
 *     vars the mapper does not emit (renamed / untracked / ignored).
 *
 * THEME CONSTANT FILE (CLAUDE.md UI rules): the hex values below mirror
 * src/renderer/styles/tokens.css §1.1–§1.5 verbatim — each entry names its
 * token. Shiki theme registration needs static values (workers/SSR have no
 * document), so the values are mirrored, not read at runtime. If tokens.css
 * changes, change this palette in the same commit.
 *
 * The SYNTAX ramp is a second, separate mirror: DESIGN.md §1.6 (the terminal
 * palette), which is also what src/renderer/editor/monaco-impl.ts colors File
 * mode with. Diff and File render the SAME file, so they must resolve the same
 * token to the same hue — the two ramps are kept rule-for-rule identical and
 * change together. State hues (§1.3) and git hues (§1.4) are deliberately
 * absent here: they mean "status" and "changed", and a syntax token wearing
 * one inside a git diff would say something it does not mean.
 *
 * Importing this module registers the theme (idempotent: a duplicate
 * registration is swallowed by @pierre/diffs with a console.error).
 */
import { registerCustomTheme } from '@pierre/diffs';
import type { ThemeRegistration, ThemesType } from '@pierre/diffs';
import { themeToTreeStyles } from '@pierre/trees';
import type { TreeThemeStyles } from '@pierre/trees';

/** Mirror of tokens.css (dark ramp). Token name → value, verbatim. */
const P = {
  bgCanvas: '#131417', //     --bg-canvas
  bgSidebar: '#0e0f13', //    --bg-sidebar
  bgSurface: '#191b20', //    --bg-surface
  bgRaised: '#202329', //     --bg-raised
  bgActive: '#252931', //     --bg-active
  border: '#25282e', //       --border
  borderStrong: '#353943', // --border-strong
  textPrimary: '#c9cacd', //  --text-primary
  textSecondary: '#9ca1ab', //--text-secondary
  textMuted: '#838996', //    --text-muted
  accentText: '#82bfff', //   --accent-text
  accentWash: '#4d9de824', // --accent-wash  rgba(77,157,232,.14)
  focusRing: '#4d9de899', //  --focus-ring ring color rgba(77,157,232,.6)
  gitModified: '#af9c74', //  --git-modified
  gitAdded: '#6bc46d', //     --git-added
  gitDeleted: '#e5655e', //   --git-deleted
  gitRenamed: '#6cb6ff', //   --git-renamed
  gitConflict: '#f0883e', //  --git-conflict
  gitIgnored: '#565b66', //   --git-ignored
  warning: '#f5b84a', //      --warning
  info: '#6cb6ff' //          --info
} as const;
const gmuxPaletteDark = P;

/**
 * Syntax ramp — DESIGN.md §1.6, mirrored from monaco-impl.ts:68-89 rule for
 * rule so toggling Diff ⇄ File changes the layout and nothing else. Names are
 * the §1.6 slot each value comes from.
 */
const S = {
  fg: '#d8dbe2', //       foreground   — plain identifiers/variables/text
  comment: '#6e7583', //  brBlack-ish  — comments (also --status-idle's hex)
  string: '#6bc46d', //   green        — strings, JSON values, attr values
  escape: '#85d488', //   brGreen      — escape sequences inside strings
  keyword: '#6cb6ff', //  blue         — keywords, storage, tags
  number: '#e2b340', //   yellow       — numeric literals
  regexp: '#f07e78', //   brRed        — regular expressions
  type: '#56c2c0', //     cyan         — types, classes, attr names, JSON keys
  fn: '#8fc7ff', //       brBlue       — function names and calls
  constant: '#f0c674', // brYellow     — language/other constants
  punctuation: '#a8adb8' // white-ish  — operators and delimiters
} as const;
const gmuxSyntaxDark = S;

export const GMUX_THEME_NAME = 'gmux-dark';

/**
 * The light base, mirrored from the light block of tokens.css section 1.1b
 * and the light terminal palette of section 1.6b (Phase 213), the same
 * keys as P and S above so the light theme is the dark table refilled.
 */
const PL = {
  bgCanvas: '#f5f7fa',
  bgSidebar: '#edeff3',
  bgSurface: '#fcfcfe',
  bgRaised: '#e5e7ed',
  bgActive: '#d9dce3',
  border: '#d1d3da',
  borderStrong: '#adb1ba',
  textPrimary: '#353639',
  textSecondary: '#4f535c',
  textMuted: '#626774',
  accentText: '#326da8',
  accentWash: '#2175bd24', // rgba(33,117,189,.14)
  focusRing: '#2175bd99', // rgba(33,117,189,.6)
  gitModified: '#64522d',
  gitAdded: '#00530e',
  gitDeleted: '#b23534',
  gitRenamed: '#00487f',
  gitConflict: '#833e00',
  gitIgnored: '#9297a4',
  warning: '#976900',
  info: '#00487f'
} as const;

const SL = {
  fg: '#282a30', //       foreground
  comment: '#6a707d', //  brBlack
  string: '#006814', //   green
  escape: '#008422', //   brGreen
  keyword: '#025b9e', //  blue
  number: '#715500', //   yellow
  regexp: '#ca4141', //   brRed
  type: '#006464', //     cyan
  fn: '#4075a9', //       brBlue
  constant: '#936b00', // brYellow
  punctuation: '#51545c' // white
} as const;

export const GMUX_THEME_NAME_LIGHT = 'gmux-light';

/**
 * The gmux palette as a Shiki/VS Code-format theme. `colors` carries the
 * workbench keys both libraries read: diffs derives global fg/bg and the
 * addition/deletion/modified colors from editor.* + gitDecoration.*;
 * themeToTreeStyles reads sideBar.*, list.*, input.*, scrollbarSlider.*,
 * gitDecoration.*. `settings` is the §1.6 syntax ramp expressed as TextMate
 * scopes — the same ramp Monaco's Monarch tokens carry in File mode.
 */
function gmuxTheme(
  name: string,
  displayName: string,
  type: 'dark' | 'light',
  P: Record<keyof typeof gmuxPaletteDark, string>,
  S: Record<keyof typeof gmuxSyntaxDark, string>
): ThemeRegistration {
  return {
  name,
  displayName,
  type,
  bg: P.bgCanvas,
  fg: S.fg,
  colors: {
    'editor.background': P.bgCanvas,
    'editor.foreground': S.fg,
    'editor.selectionBackground': P.accentWash,
    'sideBar.background': P.bgSidebar,
    'sideBar.foreground': P.textPrimary,
    'sideBar.border': P.border,
    'sideBarSectionHeader.foreground': P.textSecondary,
    'list.activeSelectionBackground': P.bgActive,
    'list.activeSelectionForeground': P.textPrimary,
    'list.hoverBackground': P.bgRaised,
    'list.focusOutline': P.focusRing,
    'input.background': P.bgSurface,
    'input.border': P.borderStrong,
    'scrollbarSlider.background': P.borderStrong,
    'gitDecoration.addedResourceForeground': P.gitAdded,
    'gitDecoration.untrackedResourceForeground': P.gitAdded,
    'gitDecoration.modifiedResourceForeground': P.gitModified,
    'gitDecoration.deletedResourceForeground': P.gitDeleted,
    'gitDecoration.renamedResourceForeground': P.gitRenamed,
    'gitDecoration.ignoredResourceForeground': P.gitIgnored,
    'gitDecoration.conflictingResourceForeground': P.gitConflict
  },
  settings: [
    // Monaco `identifier` / `variable` / editor.foreground.
    { settings: { foreground: S.fg, background: P.bgCanvas } },
    // Monaco `comment`.
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: S.comment, fontStyle: 'italic' }
    },
    // Monaco `string`, `attribute.value`, `string.value.json`.
    {
      scope: ['string', 'string.template', 'punctuation.definition.string'],
      settings: { foreground: S.string }
    },
    // Monaco `string.escape`.
    {
      scope: ['constant.character.escape'],
      settings: { foreground: S.escape }
    },
    // Monaco `regexp`.
    {
      scope: ['string.regexp', 'punctuation.definition.string.regexp'],
      settings: { foreground: S.regexp }
    },
    // Monaco `number`.
    { scope: ['constant.numeric'], settings: { foreground: S.number } },
    // Monaco `constant`.
    {
      scope: [
        'constant.language',
        'constant.other',
        'variable.other.constant',
        'support.constant'
      ],
      settings: { foreground: S.constant }
    },
    // Monaco `keyword` / `tag`.
    {
      scope: [
        'keyword',
        'storage',
        'storage.type',
        'storage.modifier',
        'entity.name.tag',
        'variable.language'
      ],
      settings: { foreground: S.keyword }
    },
    // Monaco `function`.
    {
      scope: [
        'entity.name.function',
        'support.function',
        'meta.function-call.generic'
      ],
      settings: { foreground: S.fn }
    },
    // Monaco `type` / `type.identifier` / `attribute.name` / `key`.
    {
      scope: [
        'entity.name.type',
        'entity.name.class',
        'entity.name.namespace',
        'support.type',
        'support.class',
        'entity.other.attribute-name',
        'support.type.property-name',
        'meta.object-literal.key'
      ],
      settings: { foreground: S.type }
    },
    // Monaco `identifier` / `variable` — restated so nested scopes that would
    // otherwise inherit a parent rule (meta.object-literal, meta.function-call)
    // land back on plain foreground.
    {
      scope: ['variable', 'variable.other', 'meta.definition.variable'],
      settings: { foreground: S.fg }
    },
    // Monaco `operator` / `delimiter`.
    {
      scope: ['keyword.operator', 'punctuation'],
      settings: { foreground: S.punctuation }
    },
    // Markdown/patch markup — the §1.6 green/red/yellow, NOT the git tokens:
    // inside a diff, git colors are the diff's own vocabulary.
    { scope: ['markup.inserted'], settings: { foreground: S.string } },
    { scope: ['markup.deleted'], settings: { foreground: S.regexp } },
    { scope: ['markup.changed'], settings: { foreground: S.number } },
    { scope: ['markup.heading'], settings: { foreground: S.keyword } },
    { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
    { scope: ['markup.italic'], settings: { fontStyle: 'italic' } }
  ]
  };
}

export const gmuxDarkTheme: ThemeRegistration = gmuxTheme(
  GMUX_THEME_NAME,
  'Tortie dark',
  'dark',
  P,
  S
);

/** The light base as a Shiki theme (Phase 213): the same table over PL and SL. */
export const gmuxLightTheme: ThemeRegistration = gmuxTheme(
  GMUX_THEME_NAME_LIGHT,
  'Tortie light',
  'light',
  PL,
  SL
);

// Register by name for @pierre/diffs' shared highlighter (side effect on
// import; duplicate registrations are ignored upstream, so HMR is safe).
registerCustomTheme(GMUX_THEME_NAME, () => Promise.resolve(gmuxDarkTheme));
registerCustomTheme(GMUX_THEME_NAME_LIGHT, () => Promise.resolve(gmuxLightTheme));

/**
 * Theme prop for every @pierre/diffs component (`theme={diffTheme}`).
 *
 * THIS IS PIERRE'S DUAL FORM, and it is the whole switch (Phase 213,
 * research 80 section 3). Shiki runs with `defaultColor: false`, so every
 * token span carries BOTH `--diffs-token-dark` and `--diffs-token-light`
 * inline, the host block carries the `--diffs-dark*` and `--diffs-light*`
 * sets from the two themes' bg, fg and gitDecoration keys, and the
 * stylesheet picks with `light-dark()` by the host's `color-scheme`, which
 * inherits from the document root, where the applier writes it. No
 * re-registration and no remount when the scheme changes: the diff goes
 * light in the same frame the root does. Until this phase both slots named
 * the dark theme, which is why the diff was the one surface that kept its
 * shipped ground under Phases 207 and 210, the limit both recorded.
 */
export const diffTheme: ThemesType = {
  dark: GMUX_THEME_NAME,
  light: GMUX_THEME_NAME_LIGHT
};

/**
 * Host styles for `<FileTree style={treeStyles} …/>`. themeToTreeStyles
 * emits colorScheme/background/color plus the --trees-theme-* vars it knows;
 * the trees stylesheet additionally consumes renamed/untracked/ignored
 * git-lane vars that the mapper does not emit — supplied here from the same
 * tokens so all six GitStatus kinds are branded.
 */
const treeStylesStatic: TreeThemeStyles = {
  ...themeToTreeStyles(gmuxDarkTheme),
  '--trees-theme-git-renamed-fg': P.gitRenamed,
  '--trees-theme-git-untracked-fg': P.gitAdded,
  '--trees-theme-git-ignored-fg': P.gitIgnored
};

/**
 * Phase 213. The mapper writes `colorScheme: 'dark'` from the theme's type,
 * and that value decides only the light-dark() fallbacks in Pierre's tree
 * stylesheet and the native scrollbar. `color-scheme` is an inherited
 * property, so the host follows the document root, where the applier
 * writes the base in effect, by carrying no value of its own.
 */
function treeStylesFollowingScheme(styles: TreeThemeStyles): TreeThemeStyles {
  const out: TreeThemeStyles = { ...styles };
  delete out['colorScheme'];
  return out;
}

/**
 * Phase 207. The tree host is IN the frame, and the frame takes the hue, so
 * the neutrals and the text the mapper wrote as hex are rewritten as
 * `var(--token)` references to the tokens they mirror. A custom property set
 * inline on the host resolves against the document root the host inherits
 * from, and the trees stylesheet reads the host's computed value across its
 * shadow boundary, so the tree follows every override apply.ts writes,
 * being the hue, the contrast lift and the text rule, with no second
 * mechanism. The static mirror above is still what the mapper is fed and is
 * still what the diff theme registers with Shiki, which is why it stays.
 */
const TREE_TOKEN_OF: ReadonlyArray<readonly [string, string]> = [
  [P.bgSidebar, '--bg-sidebar'],
  [P.bgSurface, '--bg-surface'],
  [P.bgRaised, '--bg-raised'],
  [P.bgActive, '--bg-active'],
  [P.border, '--border'],
  [P.borderStrong, '--border-strong'],
  [P.textPrimary, '--text-primary'],
  [P.textSecondary, '--text-secondary'],
  [P.textMuted, '--text-muted']
];

export function treeStylesFollowingTokens(styles: TreeThemeStyles): TreeThemeStyles {
  const out: TreeThemeStyles = {};
  for (const [key, value] of Object.entries(styles)) {
    const hit = TREE_TOKEN_OF.find(([hex]) => hex.toLowerCase() === value.toLowerCase());
    out[key] = hit === undefined ? value : `var(${hit[1]})`;
  }
  return out;
}

export const treeStyles: TreeThemeStyles = treeStylesFollowingScheme(
  treeStylesFollowingTokens(treeStylesStatic)
);
