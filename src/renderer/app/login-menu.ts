/**
 * The login control on the meter's hover card (Phase 202): what the native
 * menu offers and what each pick means.
 *
 * NATIVE, THROUGH THE ui:popupMenu BRIDGE, like every other menu in Tortie.
 * No DOM menu exists on any path. A preload without `popupMenu` draws no
 * control at all rather than a second kind of menu.
 *
 * THIS FILE IS PURE. It builds a list of items and reads a picked id. The
 * calls that follow a pick live in the component, so the shape of the menu can
 * be pinned by a test that opens no window.
 *
 * JUST ENOUGH WORDS. One line per login, a check mark on the chosen one, and
 * Add login at the foot. Whether a login has been signed into yet is the one
 * fact worth a second line, because a login that has not is the one case where
 * choosing it draws a sign in line instead of numbers.
 */

import type { PopupMenuItem } from '@shared/ipc';
import type { LoginRow } from '@shared/logins';

/** The id the Add login item comes back as. */
export const LOGIN_MENU_ADD = 'login:add';

/** The id prefix a login item comes back as, followed by its name. */
export const LOGIN_MENU_PICK = 'login:pick:';

/** Said under a login nobody has completed the vendor's own sign in for. */
export const LOGIN_NOT_SIGNED_IN = 'Not signed in yet';

/** The item that starts the vendor's own sign in, in one ordinary session. */
export const LOGIN_ADD_LABEL = 'Add login…';

/**
 * The menu for one provider.
 *
 * `ui:popupMenu` has no native check state, so the chosen row wears the same
 * two space prefixed check the Sidebar's own menus use, which is the house
 * answer to that gap.
 */
export function loginMenuItems(rows: readonly LoginRow[]): PopupMenuItem[] {
  const items: PopupMenuItem[] = rows.map((row) => ({
    id: `${LOGIN_MENU_PICK}${row.name}`,
    label: `${row.chosen ? '✓ ' : '  '}${row.name}`,
    ...(row.present ? {} : { sublabel: LOGIN_NOT_SIGNED_IN })
  }));
  if (items.length > 0) items.push({ type: 'separator', id: '', label: '' });
  items.push({ id: LOGIN_MENU_ADD, label: LOGIN_ADD_LABEL });
  return items;
}

/** What a picked id means, or null when the menu was dismissed. */
export function loginMenuPick(
  picked: string | null
): { kind: 'add' } | { kind: 'choose'; name: string } | null {
  if (picked === null) return null;
  if (picked === LOGIN_MENU_ADD) return { kind: 'add' };
  if (picked.startsWith(LOGIN_MENU_PICK)) {
    const name = picked.slice(LOGIN_MENU_PICK.length);
    return name.length === 0 ? null : { kind: 'choose', name };
  }
  return null;
}
