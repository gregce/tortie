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
 * Add login at the foot.
 *
 * PHASE 203. A LOGIN IS DRAWN AS ITS ACCOUNT. The address leads, the name
 * Tortie holds is the second line, and `Default` has stopped being a label:
 * the default row reads as the account it really is, or as the phrase that
 * says whose sign in it is. The name is still the manifest key underneath, and
 * `loginMenuPick` still answers with it, which is why there is no rename
 * anywhere in this phase.
 */

import type { PopupMenuItem } from '@shared/ipc';
import type { LoginRow } from '@shared/logins';
import { loginAccountLabel, loginRowDetail } from '@shared/login-copy';

/** The id the Add login item comes back as. */
export const LOGIN_MENU_ADD = 'login:add';

/** The id prefix a login item comes back as, followed by its name. */
export const LOGIN_MENU_PICK = 'login:pick:';

/**
 * Said under a login nobody has completed the vendor's own sign in for.
 *
 * Re-exported from the one place the three login surfaces share their words,
 * so the meter's menu and the Settings list cannot drift apart.
 */
export { LOGIN_KEPT, LOGIN_NOT_SIGNED_IN } from '@shared/login-copy';

/** The item that starts the vendor's own sign in, in one ordinary session. */
export const LOGIN_ADD_LABEL = 'Add login…';

/**
 * The menu for one provider.
 *
 * `ui:popupMenu` has no native check state, so the chosen row wears the same
 * two space prefixed check the Sidebar's own menus use, which is the house
 * answer to that gap.
 *
 * THE LABEL IS THE ACCOUNT AND THE ID IS THE NAME. The id a pick comes back as
 * is still the login's NAME, because that name is the reserved manifest key
 * and the only thing a launch can resolve. Nothing a person reads here is what
 * the pick carries.
 */
export function loginMenuItems(
  rows: readonly LoginRow[],
  isMac = true
): PopupMenuItem[] {
  const items: PopupMenuItem[] = rows.map((row) => {
    // PHASE 204. The second line says what the login IS and, when a switch
    // would put an account back, what the switch will do. PHASE 211 adds WHEN,
    // with the measured number for the platform. Every row that moves no
    // credential reads exactly as it read in Phase 203.
    const detail = loginRowDetail(row, isMac);
    return {
      id: `${LOGIN_MENU_PICK}${row.name}`,
      label: `${row.chosen ? '✓ ' : '  '}${loginAccountLabel(row)}`,
      ...(detail === '' ? {} : { sublabel: detail })
    };
  });
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
