/**
 * Native context menus for the Context view (§5.10, DESIGN.md §3 — menus are
 * macOS menus and are never drawn in the DOM).
 *
 * WHAT THIS FILE OWNS: the verbs that only READ — open the file that defines an
 * entry, reveal it in Finder, copy a name, a path or a command, and jump to the
 * entry a winner beats. Those need nothing but the bridge the app already has.
 *
 * INTEGRATION SEAM 3 — the verbs that WRITE (`Enable for…`, `Disable`,
 * `Remove…`, `New skill…`, `Check connection…`) are supplied
 * by the caller as a `ContextRowActions` object. Every one of them is optional
 * and an absent one simply does not appear in the menu. That is deliberate:
 * installing and removing execute someone else's code, they go through the
 * skills CLI rather than through this view, and a menu item that pretended to
 * be wired would be worse than no item at all. When the write channels land,
 * the integrator passes an object here and nothing else in this file changes.
 */

import type { MenuItemSpec, MenuSpec } from '../state/store';
import type { ContextEntry, ContextScope } from './model';

/** Where a menu was asked for. */
export interface MenuAt {
  x: number;
  y: number;
}

/**
 * The write verbs, injected. Each is optional; each absent one is one fewer
 * menu item, never a disabled one that does nothing.
 */
export interface ContextRowActions {
  /** §7.4 — one connect, on demand. A verb, never a refresh. */
  checkConnection?(entry: ContextEntry): void;
  /**
   * §9.2 — the cross-agent symlink verb. Phase 26 item 3: it opens the fleet
   * picker in `./enable/`, never the search sheet.
   */
  enableFor?(entry: ContextEntry): void;
  /** §9.1 — flip a JSON-backed entry off, behind the confirm. */
  setEnabled?(entry: ContextEntry, enabled: boolean): void;
  /** §9.3 / §13.2 — remove through the CLI, never by hand. */
  remove?(entry: ContextEntry): void;
  /**
   * `skills update -g -y <name>`, behind the confirm.
   *
   * It is an ACTION and never an indicator, because the CLI cannot answer
   * whether an update exists without applying it: `check` is a plain alias for
   * `update` in its dispatch switch. So the panel offers to update and does not
   * offer a badge saying one is available.
   */
  update?(entry: ContextEntry): void;
  /** §9.5 — the S3E create gesture. */
  newSkill?(): void;
  /** Open the source layer on a query the user typed into the filter field. */
  searchFor?(query: string): void;
}

/** Everything the menus need from the app, so the builder stays testable. */
export interface ContextMenuDeps {
  openPath(path: string, line?: number): void;
  revealPath(path: string): void;
  copyText(text: string): void;
  /** Scroll to and select another row — the shadowed entry. */
  revealEntry?(id: string): void;
  /**
   * PHASE 108. The rows describe files on another machine. Every item that
   * names a program on this Mac — Open, Open the script, Reveal in Finder,
   * and the jump to a shadowed entry's file — is NOT BUILT, because the row's
   * path is on the other computer and the program here would open the wrong
   * file or nothing. The Copy verbs stay: copying that machine's path is true
   * and useful. An absent verb is one fewer menu item, never a dead one.
   */
  remote: boolean;
}

function copyItem(
  label: string,
  text: string,
  deps: ContextMenuDeps
): MenuItemSpec {
  return { label, run: () => deps.copyText(text) };
}

/** What "Open" means per category — the file the user should end up in. */
function openLabelFor(entry: ContextEntry): string {
  switch (entry.category) {
    case 'skill':
      return 'Open SKILL.md';
    case 'mcp':
      return 'Open the file it is defined in';
    case 'hook':
      return 'Open the file it is defined in';
    case 'plugin':
      return 'Open the plugin folder';
    case 'instruction':
    default:
      return 'Open';
  }
}

/**
 * The row menu (§5.10). Read verbs first, then the injected write verbs, then
 * the copy verbs, in the order the spec lists them.
 */
export function rowMenuItems(
  entry: ContextEntry,
  deps: ContextMenuDeps,
  actions: ContextRowActions = {}
): (MenuItemSpec | 'sep')[] {
  const items: (MenuItemSpec | 'sep')[] = [];

  // PHASE 108. On a remote tab no item that opens or reveals is built, per
  // the `remote` field's own comment above.
  if (!deps.remote) {
    items.push({
      label: openLabelFor(entry),
      run: () =>
        deps.openPath(
          entry.sourcePath,
          entry.problem?.line ?? undefined
        )
    });

    if (entry.payload.kind === 'hook') {
      // The script is a resolved absolute path when the reader could find
      // one, and null when it could not. A missing script is still a row with
      // its own broken mark; it is not a menu item that opens nothing.
      const script = entry.payload.scriptPath;
      if (script !== null && !entry.payload.scriptMissing) {
        items.push({
          label: 'Open the script',
          run: () => deps.openPath(script)
        });
      }
    }

    items.push({
      label: 'Reveal in Finder',
      run: () => deps.revealPath(entry.sourcePath)
    });
  }

  if (entry.category === 'mcp' && actions.checkConnection !== undefined) {
    const check = actions.checkConnection;
    // A verb, never a refresh: listing an MCP server's tools means starting
    // someone else's process or making a network call with credentials (§7.4).
    items.push({ label: 'Check connection…', run: () => check(entry) });
  }

  // §6.3 — the shadowed entry is always reachable from the winner. Without
  // this the loser is a mark with nowhere to go, and the user edits the file
  // that does not win, which is exactly the failure R4 names. On a remote tab
  // it opens a file on this Mac that is not there, so it is not built.
  if (!deps.remote && entry.shadows.length > 0 && deps.revealEntry !== undefined) {
    const first = entry.shadows[0];
    if (first !== undefined) {
      items.push({
        label: 'Show the entry this beats',
        run: () => deps.openPath(first.sourcePath)
      });
    }
  }

  // THE WRITE VERBS ARE SKILLS ONLY, and that is the CLI decision rather than
  // an omission. There is no MCP, hook, plugin or instruction management
  // anywhere in the skills CLI, and doing those by hand would be Tortie editing
  // an agent's own configuration, which it never does.
  const writes: (MenuItemSpec | 'sep')[] = [];
  const writable = entry.category === 'skill' && entry.state !== 'managed';
  if (writable && actions.enableFor !== undefined) {
    const enableFor = actions.enableFor;
    writes.push({ label: 'Enable for…', run: () => enableFor(entry) });
  }
  if (writable && actions.update !== undefined) {
    const update = actions.update;
    writes.push({ label: 'Update…', run: () => update(entry) });
  }
  if (actions.setEnabled !== undefined && entry.state !== 'managed') {
    const setEnabled = actions.setEnabled;
    const off = entry.state === 'disabled';
    writes.push({
      label: off ? 'Enable' : 'Disable',
      run: () => setEnabled(entry, off)
    });
  }
  // Remove is offered only where the CLI can actually act: a user-owned skill
  // in the global or the project scope. Bundled, plugin and managed rows are
  // rows the CLI does not manage, and a remove there is structurally the
  // silent exit-0 no-op, so the verb is absent rather than pretending.
  const removable =
    writable && (entry.scope === 'global' || entry.scope === 'project');
  if (removable && actions.remove !== undefined) {
    const remove = actions.remove;
    writes.push({
      label: 'Remove…',
      destructive: true,
      run: () => remove(entry)
    });
  }
  if (writes.length > 0) items.push('sep', ...writes);

  // On a remote tab the copy verbs can be the whole menu, and a menu must not
  // open with a separator, so the separator goes in only under other items.
  if (items.length > 0) items.push('sep');
  items.push(copyItem('Copy name', entry.name, deps));
  items.push(copyItem('Copy path', entry.sourcePath, deps));
  if (entry.category === 'mcp' || entry.category === 'hook') {
    // The summary IS the command for these two (§7.2), so there is one string
    // to copy and no second formatting of it anywhere.
    items.push(copyItem('Copy command', entry.summary, deps));
  }
  return items;
}

/** The group row's menu (§5.10) — the file this group comes from. */
export function groupMenuItems(
  entries: readonly ContextEntry[],
  deps: ContextMenuDeps,
  scope: ContextScope | null
): (MenuItemSpec | 'sep')[] {
  const first = entries[0];
  if (first === undefined) return [];
  // PHASE 108. On a remote tab the group's file is on the other computer, so
  // Open and Reveal are not built and Copy path is the whole menu.
  if (deps.remote) {
    return [copyItem('Copy path', first.sourcePath, deps)];
  }
  const managed = scope === 'managed';
  const items: (MenuItemSpec | 'sep')[] = [
    {
      label: 'Open the file this group comes from',
      run: () => deps.openPath(first.sourcePath)
    },
    {
      label: 'Reveal in Finder',
      run: () => deps.revealPath(first.sourcePath)
    }
  ];
  if (managed) {
    // §11.6 — Open and Copy only. There is no verb here that could write, and
    // a disabled one would suggest Tortie is choosing not to.
    items.push('sep', copyItem('Copy path', first.sourcePath, deps));
  }
  return items;
}

/** Assemble a `MenuSpec` for the store's `setMenu`. */
export function menuAt(
  at: MenuAt,
  items: (MenuItemSpec | 'sep')[]
): MenuSpec {
  return { x: at.x, y: at.y, items };
}
