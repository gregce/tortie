/**
 * The closed set of codicon names a native menu row may wear.
 *
 * ## Why this table lives in shared (Phase 156)
 *
 * Phase 153 declared it in `src/renderer/icons/codicon-menu-icon.ts`, because
 * the renderer was the only process that put a mark on a menu row. Phase 156
 * put marks on the application menu bar and on the tray menu, and both of
 * those are built in MAIN before any window exists. `build/assert-import-
 * boundaries.mjs` says main may import only main and shared, so main cannot
 * reach into the renderer for the name union.
 *
 * Moving the table here is what keeps the phase's own refusal true: there is
 * no second icon table. One array names every mark, both processes read it,
 * and `src/renderer/icons/codicon-menu-icon.ts` re-exports it so no renderer
 * call site changed.
 *
 * The file names no platform: no node builtin, no `electron`, no DOM. It is a
 * list of strings and the type derived from it.
 */


/**
 * EVERY codicon a menu row wears, and the list is the reviewable table.
 *
 * It is a closed set on purpose. `menuGlyph` takes this union rather than a
 * string, so a builder cannot name a glyph the warm pass never rasterized and
 * silently get no icon. Adding a row's icon means adding its name here, which
 * is where a reviewer looks for the whole set.
 */
export const MENU_CODICONS = [
  'add',
  'arrow-down',
  'arrow-up',
  'bell',
  'check',
  'circle-slash',
  'clear-all',
  'clippy',
  'close',
  'cloud-download',
  'cloud-upload',
  'code',
  'collapse-all',
  'comment',
  'copy',
  'debug-restart',
  'desktop-download',
  'device-camera',
  'discard',
  'edit',
  'expand-all',
  'files',
  'folder-opened',
  'git-branch',
  'git-commit',
  'git-compare',
  'git-stash-apply',
  'globe',
  'go-to-file',
  'history',
  'keyboard',
  'layers',
  'layout-menubar',
  'layout-sidebar-right',
  'link-external',
  'list-selection',
  'multiple-windows',
  'new-file',
  'new-folder',
  'output',
  'pin',
  'plug',
  'refresh',
  'remove',
  'repo-clone',
  'save',
  'screen-full',
  'search',
  'settings-gear',
  'split-horizontal',
  'split-vertical',
  'symbol-method',
  'sync',
  'tag',
  'terminal',
  'tools',
  'trash',
  'vm',
  'window'
] as const;

/**
 * THE THIRTEEN MARKS NO SURFACE DRAWS, and why each was chosen anyway.
 *
 * The rule this phase was built to: a row wears the icon its own part of the
 * product already wears, and only a row whose surface has no icon gets a
 * chosen one. Every other name above is reached by grepping the surface that
 * draws it.
 *
 * HOW THIS LIST WAS DERIVED, so a later round can redo it rather than trust
 * it. Walk every ts, tsx and css file under `src`, take the names out of
 * `MENU_CODICONS` above, blank out every `menuGlyph(...)` call whole, including
 * the ones whose argument sits on its own line, and then look for each name as
 * a quoted string, a backticked word or a `codicon-<name>` class. A name whose
 * only surviving mentions are inside comments is a chosen mark, because a
 * comment draws nothing. Run that today and thirteen names come back, which is
 * the thirteen below.
 *
 * A line-by-line grep gets this wrong and reports seven, because a call
 * written across several lines keeps its name on a line that does not hold the
 * word `menuGlyph`, and because words like pin, edit and tag are ordinary
 * English that appear in prose all over the tree.
 *
 * Where one mark is worn in several menus, one reason covers every site and
 * the entry says so.
 *
 *  - `arrow-up` and `arrow-down`, worn by Move section up and Move section
 *    down in the sidebar. Nothing in the sidebar draws a reordering mark, and
 *    the two rows are a pair whose only difference is direction, so each takes
 *    the arrow that names the direction its own label states. A drag handle
 *    would say the row is grabbable, which in a menu it is not.
 *  - `clippy`, worn by the terminal menu's Paste. The set has no paste glyph
 *    at all. `clippy` is the clipboard itself, which is the thing this row
 *    reads, while `copy` above it is the thing those rows write to. Using
 *    `copy` here would give the two opposite verbs one mark.
 *  - `debug-restart`, worn by Restart and by Restart Without Capture. It is
 *    the one mark in the set for starting a stopped thing again under the same
 *    identity, which is exactly what these rows do: the same session, the same
 *    name, a new process. `refresh` and `sync` both say re-read something that
 *    is already running, and `play` would say start something new. The word
 *    debug is the codicon's own naming and not the act, and Tortie draws no
 *    debugger anywhere, so no surface can be read as contradicting it.
 *  - `device-camera`, worn by Capture Screen, Capture Selection and every
 *    Capture Last N Lines. Capture is one feature in this product and each row
 *    is a different extent of the same photograph, so all of them wear one
 *    mark. It is the only camera in the set, and what lands on the clipboard
 *    is an image.
 *  - `edit`, worn by the three Rename rows: a file in the tree, a session, and
 *    the focused leaf of a split group. Rename is the one verb in these menus
 *    that changes a name in place, and `edit` is the pencil the codicon set
 *    binds to editing a value in place. Nothing in Tortie draws a pencil, so
 *    the mark cannot be misread as pointing at a surface that means something
 *    else. `new-file` would say the row makes a file rather than renames one.
 *  - `expand-all`, worn by the search menu's Expand Matches. Its whole reason
 *    is the row it shares: the same row reads Collapse Matches when the file
 *    is open and wears `collapse-all`, which the Search header itself draws.
 *    The chosen half is the opposite of a drawn mark, so the pair reads as one
 *    toggle.
 *  - `git-stash-apply`, worn by Cherry Pick in history. Nothing in the set
 *    names a cherry pick. This mark draws a commit being applied onto the
 *    current branch, which is the shape of the verb, and Tortie has no stash
 *    surface anywhere, so the mark cannot be read as one.
 *  - `go-to-file`, worn by the rows that open a named file in the editor: the
 *    tree's Open, the search menu's Open File and Open, Context's Open the
 *    file, Open the script and Open the file this group comes from, and the
 *    SCM section's Open file. Chosen for provenance. It is the mark the
 *    codicon set binds to the go-to-file act, and it is the act these rows
 *    perform, so Tortie's own quick open is called the go-to-file palette in
 *    `src/shared/keymap.ts`. A plain `file` would say the row is ABOUT a file
 *    rather than that it opens one.
 *  - `link-external`, worn by six rows across four menus: Reveal in Finder in
 *    the tree, in Context's row menu, in Context's group menu, in the recent
 *    projects menu and on an editor tab, and Open With in the tree. One reason
 *    covers all of them. Each hands the path to a program outside Tortie and
 *    the journey off this app is the whole of what they have in common, which
 *    is what this mark draws. `folder-opened` would say Tortie opened it.
 *  - `list-selection`, worn by the terminal menu's Select All and the branch
 *    header menu's Manage branches. Chosen because both rows hand a person a
 *    whole list at once. Select All takes the terminal's entire buffer, and
 *    Manage branches leaves the one-keystroke switcher for the BRANCHES
 *    section, which is the full list.
 *  - `multiple-windows`, worn by Break up into tabs on a split group and by
 *    Move to its own tab on one leaf. Both name a destination rather than a
 *    source, being several separate tabs where one split surface stood, and
 *    that destination is what this mark draws. A split glyph would name the
 *    thing being left behind.
 *  - `pin`, worn by every Open in New Tab in the tree, in search and in SCM,
 *    and by Keep Open on a preview editor tab. The only difference between
 *    those rows and the plain Open above them is that the second keeps the
 *    tab, which is what VS Code's own vocabulary and this codicon both call
 *    pinning. The glyph is the only place a menu can say it.
 *
 * WHAT THIS RECIPE COUNTS AS DRAWN, said exactly, because a stricter reading
 * moves two names into the list. The recipe counts a name as worn by a surface
 * when its literal appears anywhere outside a `menuGlyph(...)` call. `trash`
 * and `split-vertical` pass that test on literals that draw nothing: `trash`
 * on the file operation names in `src/renderer/tree/fs-ops-bridge.ts` and the
 * main process behind them, and `split-vertical` on the `EDGES` table in
 * `src/renderer/app/split/split-menu.ts`, which is the menu itself. Nothing in
 * Tortie paints a trash can or a stacked split. Both carry their reason at the
 * call site instead, at `tree-menu.ts:248`, `BranchesView.tsx:252`,
 * `context/menus.ts:225` and `split-menu.ts:22`, so no menu row wears a mark
 * nobody argued for.
 *
 * `tag` is NOT one of these and reads like it should be. The glyph map at
 * `src/renderer/scm/ref-badges.tsx:230` binds the tag ref badge to it, so
 * history already draws that mark beside every tag and Create Tag… wears the
 * mark of the thing it makes.
 */
/**
 * THE FOUR MARKS PHASE 156 ADDED THAT NO SURFACE DRAWS, and why each was
 * chosen anyway. The seven it added that ARE drawn are not listed here,
 * because the recipe above finds them: `bell` at `Titlebar.tsx:469`, `files`
 * and `search` at `ActivityBar.tsx:304` and `:313`, `keyboard` at
 * `SettingsApp.tsx:66`, `screen-full` at `EditorPanel.tsx:822`,
 * `settings-gear` at `ActivityBar.tsx:171`, and `symbol-method` at
 * `SymbolPalette.tsx:129`.
 *
 * `source-control` IS NOT IN THIS SET, and it is the name a reader will look
 * for hardest, because `ActivityBar.tsx:330` draws it for the Source Control
 * view and View > Source Control opens that view. The generator refused it, and
 * that refusal is the most useful thing this phase measured. The shipped
 * codicon font draws `source-control` at U+EA68 and `git-branch` at U+EC6F as
 * ONE IDENTICAL OUTLINE, being the branch fork, measured byte for byte at 284
 * ink pixels each on a 32×32 bitmap. Phase 153 already bound `git-branch` to
 * the two Create Branch… rows, so adding the second name would put one picture
 * in the table twice under two entries a reviewer would read as two pictures.
 * So the View menu row wears `git-branch` instead, which is the same pixels the
 * activity bar draws for it, and the set keeps one name per picture.
 *
 * That is the U+EC6F defect one level deeper: `git-branch`, `git-branch-create`
 * and `git-branch-delete` share a codepoint and the stylesheet says so, while
 * these two have different codepoints and only the BITMAPS say so. No gate that
 * reads the stylesheet can see it, which is why `build/assert-menu-glyphs.mjs`
 * now compares the generated bitmaps as well.
 *
 *  - `desktop-download`, worn by the Tortie menu's staged update row, "Update
 *    to X, installs when you quit". It draws bytes coming down to THIS
 *    computer, which is the state that row announces: the download already
 *    happened and the file is on disk. `cloud-download` is in the set and was
 *    refused here, because Phase 153 bound it to the branches list's incoming
 *    arrow, so reusing it would make one picture mean two things.
 *  - `save`, worn by File > Save. Nothing in Tortie draws a save button
 *    anywhere: the editor saves on the chord and on tab close, and the one
 *    place the word appears is the function name in `editor/tab-io.ts`. So the
 *    mark cannot be misread as pointing at another surface. `save-as` exists
 *    in the font and is a different verb.
 *  - `tools`, worn by the Tortie menu's Repair Updates… row, which is present
 *    only while the launch found updater state on disk that stops an install.
 *    Nothing in Tortie draws a wrench, so it cannot be misread, and fixing
 *    broken state on disk is the whole of what the row does. `refresh` is
 *    already two rows above it on Check for Updates…, and `debug-restart`
 *    would say the row starts something again.
 *  - `window`, worn by the tray menu's Show Tortie. It brings the app's one
 *    window forward, and Tortie draws no window glyph anywhere, so the mark
 *    cannot point at another surface. `multiple-windows` is in the set and
 *    says the opposite, being several tabs where one surface stood.
 *
 * `layout-sidebar-left` is deliberately NOT here, and the reason belongs with
 * these four because it reads like a fifth. It is the obvious mark for View >
 * Toggle Sidebar and Phase 156 refused it: `projects-position.ts:40` already
 * draws it as the destination of "Move projects to the left", and a picture
 * that means "move the project tabs to the left edge" cannot also mean "hide
 * and show the sidebar" without one of the two being wrong. So the name is not
 * in the set at all, because a name in the set that no row wears is a bitmap
 * generated for nothing.
 */
export type MenuCodicon = (typeof MENU_CODICONS)[number];
