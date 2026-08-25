/**
 * Codicon marks for NATIVE menus (Phase 153).
 *
 * The sibling `agent-menu-icon.ts` does this for the vendor marks. This file
 * does it for the UI glyphs, and the two work the same way for the same
 * reason: DESIGN.md §3 makes every menu a macOS menu, so an icon has to reach
 * main as pixels rather than as a `<span class="codicon">` React can mount.
 *
 * WHERE THE GLYPH COMES FROM, and it is the point of the file. The codicon set
 * is an icon FONT, and the name to character map lives in the one stylesheet
 * `Codicon.tsx` already loads. This file reads that map back out of the
 * document with `getComputedStyle(el, '::before')`, so a menu row and the DOM
 * surface beside it are drawing the same character out of the same font file.
 * They cannot drift, because there is no second table to keep in step.
 *
 * Every mark is painted flat black and flagged `template`, so macOS owns the
 * tint for light and dark, for the highlighted row and for a disabled one.
 * That is what makes a greyed row's icon grey with it.
 *
 * Everything here is best effort, the rule `agent-menu-icon.ts` states: a menu
 * with no icons is a fine menu, a menu that failed to open is not. In a test
 * environment there is no document and no canvas, so `menuGlyph` returns an
 * empty object and every builder composes exactly the rows it composed before.
 */

import '@vscode/codicons/dist/codicon.css';
import type { PopupMenuIcon } from '@shared/ipc';

/** Physical pixels; 16pt × 2 for Retina, the same as an agent mark. */
const PX = 32;

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
  'device-camera',
  'discard',
  'edit',
  'expand-all',
  'folder-opened',
  'git-branch',
  'git-commit',
  'git-compare',
  'git-stash-apply',
  'globe',
  'go-to-file',
  'history',
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
  'split-horizontal',
  'split-vertical',
  'sync',
  'tag',
  'terminal',
  'trash',
  'vm'
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
export type MenuCodicon = (typeof MENU_CODICONS)[number];

const cache = new Map<string, PopupMenuIcon>();

/**
 * The character the stylesheet binds to `codicon-<name>`, or null.
 *
 * A hidden probe span is the only way to ask CSS what a `::before` rule says,
 * and it is why this reads the SAME rule the visible glyph beside it reads.
 */
function glyphOf(name: string): string | null {
  const doc = (globalThis as { document?: Document }).document;
  if (doc === undefined || doc.body === null) return null;
  const probe = doc.createElement('span');
  probe.className = `codicon codicon-${name}`;
  probe.setAttribute(
    'style',
    'position:absolute;left:-9999px;top:0;visibility:hidden'
  );
  doc.body.appendChild(probe);
  try {
    const view = doc.defaultView;
    if (view === null) return null;
    const raw = view.getComputedStyle(probe, '::before').content;
    // Chromium returns the value quoted, e.g. `"\ea81"` rendered as `"<char>"`.
    const inner = /^(?:"([^"]*)"|'([^']*)')$/.exec(raw);
    const ch = inner?.[1] ?? inner?.[2] ?? '';
    return ch.length > 0 ? ch : null;
  } catch {
    return null;
  } finally {
    probe.remove();
  }
}

/** One character → a 32×32 flat black PNG data URL, or null. */
function rasterize(ch: string): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = PX;
    canvas.height = PX;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return null;
    ctx.clearRect(0, 0, PX, PX);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // The em box IS the 16px design grid, so a 32px em fills a 32px bitmap at
    // exactly the proportions the DOM draws at `size={16}`.
    ctx.font = `${PX}px codicon`;
    ctx.fillText(ch, PX / 2, PX / 2);
    return canvas.toDataURL('image/png');
  } catch {
    // Canvas unavailable (jsdom, tainted context) — no icon, no drama.
    return null;
  }
}

let warmed: Promise<void> | null = null;

/**
 * Rasterize every mark in `MENU_CODICONS`, once per app run.
 *
 * The font is asked for first, because `font-display: block` means the face is
 * not fetched until something draws with it, and a canvas asked to draw a
 * character the font has not delivered paints the fallback family's blank box.
 * A menu opened before this resolves is a menu with no icons rather than a
 * menu with wrong ones.
 */
export function warmMenuIcons(): Promise<void> {
  if (warmed !== null) return warmed;
  warmed = (async (): Promise<void> => {
    const doc = (globalThis as { document?: Document }).document;
    if (doc === undefined) return;
    try {
      await doc.fonts.load(`${PX}px codicon`);
    } catch {
      // No FontFaceSet (jsdom) — the draw below decides for itself.
    }
    for (const name of MENU_CODICONS) {
      const ch = glyphOf(name);
      if (ch === null) continue;
      const dataUrl = rasterize(ch);
      if (dataUrl === null) continue;
      cache.set(name, { dataUrl, template: true });
    }
  })();
  return warmed;
}

/**
 * The `icon` field for a menu row, ready to spread.
 *
 * It is a spread rather than a value so a call site reads as one line and so a
 * mark that is not there yields no key at all, which is what keeps the shape
 * of every existing menu unchanged under test.
 */
export function menuGlyph(name: MenuCodicon): { icon?: PopupMenuIcon } {
  const icon = cache.get(name);
  return icon === undefined ? {} : { icon };
}
