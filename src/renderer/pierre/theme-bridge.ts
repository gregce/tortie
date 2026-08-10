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
  bgSidebar: '#17181c', //    --bg-sidebar
  bgSurface: '#1b1d22', //    --bg-surface
  bgRaised: '#22252b', //     --bg-raised
  bgActive: '#2a2e36', //     --bg-active
  border: '#2a2d34', //       --border
  borderStrong: '#3a3e48', // --border-strong
  textPrimary: '#e8eaed', //  --text-primary
  textSecondary: '#a8adb8', //--text-secondary
  textMuted: '#838996', //    --text-muted
  accentText: '#82bfff', //   --accent-text
  accentWash: '#4d9de824', // --accent-wash  rgba(77,157,232,.14)
  focusRing: '#4d9de899', //  --focus-ring ring color rgba(77,157,232,.6)
  gitModified: '#e2b340', //  --git-modified
  gitAdded: '#6bc46d', //     --git-added
  gitDeleted: '#e5655e', //   --git-deleted
  gitRenamed: '#6cb6ff', //   --git-renamed
  gitConflict: '#f0883e', //  --git-conflict
  gitIgnored: '#565b66', //   --git-ignored
  warning: '#f5b84a', //      --warning
  info: '#6cb6ff' //          --info
} as const;

export const GMUX_THEME_NAME = 'gmux-dark';

/**
 * The gmux palette as a Shiki/VS Code-format theme. `colors` carries the
 * workbench keys both libraries read: diffs derives global fg/bg and the
 * addition/deletion/modified colors from editor.* + gitDecoration.*;
 * themeToTreeStyles reads sideBar.*, list.*, input.*, scrollbarSlider.*,
 * gitDecoration.*. `settings` is a restrained TextMate scope palette built
 * from the same tokens (gmux has no bespoke syntax ramp — Restrained accent
 * strategy, DESIGN.md §1.2).
 */
export const gmuxDarkTheme: ThemeRegistration = {
  name: GMUX_THEME_NAME,
  displayName: 'gmux dark',
  type: 'dark',
  bg: P.bgCanvas,
  fg: P.textPrimary,
  colors: {
    'editor.background': P.bgCanvas,
    'editor.foreground': P.textPrimary,
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
    { settings: { foreground: P.textPrimary, background: P.bgCanvas } },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: P.textMuted, fontStyle: 'italic' }
    },
    {
      scope: ['string', 'string.template', 'punctuation.definition.string'],
      settings: { foreground: P.gitAdded }
    },
    {
      scope: [
        'constant.numeric',
        'constant.language',
        'constant.character.escape'
      ],
      settings: { foreground: P.warning }
    },
    {
      scope: ['keyword', 'storage.type', 'storage.modifier'],
      settings: { foreground: P.accentText }
    },
    {
      scope: ['entity.name.function', 'support.function'],
      settings: { foreground: P.info }
    },
    {
      scope: [
        'entity.name.type',
        'entity.name.class',
        'support.type',
        'support.class'
      ],
      settings: { foreground: P.gitModified }
    },
    { scope: ['entity.name.tag'], settings: { foreground: P.accentText } },
    { scope: ['entity.other.attribute-name'], settings: { foreground: P.info } },
    {
      scope: ['keyword.operator', 'punctuation'],
      settings: { foreground: P.textSecondary }
    },
    { scope: ['markup.inserted'], settings: { foreground: P.gitAdded } },
    { scope: ['markup.deleted'], settings: { foreground: P.gitDeleted } },
    { scope: ['markup.changed'], settings: { foreground: P.gitModified } }
  ]
};

// Register by name for @pierre/diffs' shared highlighter (side effect on
// import; duplicate registrations are ignored upstream, so HMR is safe).
registerCustomTheme(GMUX_THEME_NAME, () => Promise.resolve(gmuxDarkTheme));

/**
 * Theme prop for every @pierre/diffs component (`theme={diffTheme}`).
 * gmux is dark-only in v1 — both slots point at the same registered theme,
 * so OS light mode cannot flip the diff surface to an unthemed default.
 */
export const diffTheme: ThemesType = {
  dark: GMUX_THEME_NAME,
  light: GMUX_THEME_NAME
};

/**
 * Host styles for `<FileTree style={treeStyles} …/>`. themeToTreeStyles
 * emits colorScheme/background/color plus the --trees-theme-* vars it knows;
 * the trees stylesheet additionally consumes renamed/untracked/ignored
 * git-lane vars that the mapper does not emit — supplied here from the same
 * tokens so all six GitStatus kinds are branded.
 */
export const treeStyles: TreeThemeStyles = {
  ...themeToTreeStyles(gmuxDarkTheme),
  '--trees-theme-git-renamed-fg': P.gitRenamed,
  '--trees-theme-git-untracked-fg': P.gitAdded,
  '--trees-theme-git-ignored-fg': P.gitIgnored
};
