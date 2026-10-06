/**
 * Phase 340. The machine row's ⋯ menu (build/p340/SPEC.md D20, section 5.2).
 *
 * NATIVE, ALWAYS. The rows below are handed to `ui:popupMenu`, which builds a
 * real macOS menu in main, and nothing in Tortie draws them in the DOM. A build
 * whose preload has no `popupMenu` gets a ⋯ press that does nothing and draws
 * nothing, because a DOM menu as a fallback is the thing the UI rule forbids.
 *
 * FIVE ROWS, in this order: Prepare this machine, Test the connection, What
 * Tortie runs there…, a separator, Stop trusting this machine, Remove…. His
 * design named four. Prepare this machine is the fifth because seven shipping
 * sentences tell a person to prepare a machine, and the project tab's action
 * imports its label, so the control has to exist in every state, not only on
 * a row whose next step is Prepare.
 *
 * ONE RUNNER. `runMachineMenuItem` is what a pick in the native menu runs, and
 * it is what the probe hook below runs, so a probe that cannot open an OS menu
 * it could not dismiss still drives exactly the code a person's pick drives. It
 * refuses a row the menu would draw disabled, so the hook can do nothing the
 * menu cannot.
 *
 * THE PROBE HOOK. Importing this module assigns one object to
 * `window.__gmuxP340Menu`, the `p94-create-drive.ts` precedent: `items(rowId)`
 * answers the rows the menu would draw for that machine now, and
 * `run(rowId, itemId)` runs one. It changes no behaviour, and outside a probe
 * it is one unused property. MachinesSection.tsx imports this module, so the
 * hook exists whenever Settings, then Machines, has been drawn.
 */

import type { MachineRowView, PopupMenuItem } from '@shared/ipc';
import {
  BTN_PREPARE,
  MEASURED_VERSIONS,
  MENU_FORGET,
  MENU_REMOVE,
  MENU_TEST,
  MENU_WHAT,
  alsoTakesBackVersion
} from './machines-copy';
import { useMachinesStore, type MachinesStoreState } from './machines-store';

/** The ids the menu's rows return, in the order they are drawn. */
export type MachineMenuItemId = 'prepare' | 'test' | 'what' | 'forget' | 'remove';

/** What this window knows about a row that decides which rows are enabled. */
export interface MachineMenuFacts {
  /** A Prepare for this row is in flight here. */
  preparing: boolean;
  /** A check for this row is running here. */
  testing: boolean;
  /** Another call for this row is in flight here. */
  busy: boolean;
}

/**
 * Whether a row's accepted version still decides anything, which is whether
 * Tortie has NOT measured it (Phase 324, the ruled round: measured beats
 * accepted). The sub-line under Stop trusting this machine is drawn only then.
 */
export function acceptanceStands(version: string | null | undefined): boolean {
  return (
    typeof version === 'string' &&
    version.length > 0 &&
    !MEASURED_VERSIONS.includes(version)
  );
}

/** The facts the menu reads, from the store as it is now. */
export function machineMenuFactsOf(
  state: Pick<MachinesStoreState, 'preparing' | 'test' | 'busy'>,
  rowId: string
): MachineMenuFacts {
  return {
    preparing: state.preparing === rowId,
    testing: state.test !== null && state.test.savedId === rowId && state.test.running,
    busy: state.busy === rowId
  };
}

/**
 * The rows of one machine's menu, as `ui:popupMenu` takes them.
 *
 * Prepare and Test are enabled only for a row a person confirmed: main refuses
 * an unconfirmed row either way, and a menu row that is certain to be refused
 * says so by being off. What Tortie runs there… is always enabled, because it
 * reads what is already on screen. Stop trusting this machine is the old
 * Withdraw, and it is the only row that also takes back an accepted version,
 * which its sub-line says while one stands. Remove… opens the removal question
 * under the row, which is two more presses away from removing anything.
 */
export function machineMenuItems(
  row: MachineRowView,
  facts: MachineMenuFacts
): PopupMenuItem[] {
  // `usable` is true exactly when the state is `confirmed` (rows.ts), so the
  // state alone decides it, and a row composed before `usable` existed reads
  // the same.
  const confirmed = row.state === 'confirmed';
  const forget: PopupMenuItem = {
    id: 'forget',
    label: MENU_FORGET,
    enabled: confirmed && !facts.busy
  };
  if (acceptanceStands(row.acceptedTmuxVersion)) {
    forget.sublabel = alsoTakesBackVersion(row.acceptedTmuxVersion ?? '');
  }
  return [
    {
      id: 'prepare',
      label: BTN_PREPARE,
      enabled: confirmed && !facts.preparing && !facts.busy
    },
    { id: 'test', label: MENU_TEST, enabled: confirmed && !facts.testing && !facts.busy },
    { id: 'what', label: MENU_WHAT, enabled: true },
    { id: 'separator', label: '', type: 'separator' },
    forget,
    { id: 'remove', label: MENU_REMOVE, enabled: !facts.busy }
  ];
}

/**
 * Runs one picked row of one machine's menu, and answers main's sentence when
 * the call it made was refused, or null.
 *
 * The id is checked against the rows the menu would draw for that machine NOW,
 * enabled ones only, so a stale pick or a probe naming a disabled row does
 * nothing at all. A sentence is also written under the row, because a pick in
 * a native menu has nowhere else to say why it did nothing.
 */
export async function runMachineMenuItem(
  id: string,
  row: MachineRowView
): Promise<string | null> {
  const store = useMachinesStore.getState();
  const offered = machineMenuItems(row, machineMenuFactsOf(store, row.id)).find(
    (item) => item.id === id && item.type !== 'separator'
  );
  if (offered === undefined || offered.enabled === false) return null;
  store.setRowError(row.id, null);

  let said: string | null = null;
  switch (id as MachineMenuItemId) {
    case 'prepare':
      store.setPanel(row.id, 'prepare');
      said = await store.prepareMachine(row.id);
      break;
    case 'test':
      store.setPanel(row.id, 'test');
      said = await store.startSavedTest(row.id);
      break;
    case 'what':
      store.setPanel(row.id, 'what');
      break;
    case 'forget':
      said = await store.forgetMachine(row.id);
      break;
    case 'remove':
      store.setPanel(row.id, 'remove');
      break;
    default:
      return null;
  }
  if (said !== null) useMachinesStore.getState().setRowError(row.id, said);
  return said;
}

/** The probe hook's shape. */
export interface P340MenuHook {
  /** The rows the menu would draw for one machine now, or null for no such row. */
  items(rowId: string): PopupMenuItem[] | null;
  /** Runs one row for one machine, as a pick in the native menu would. */
  run(rowId: string, itemId: string): Promise<string | null>;
}

function rowById(rowId: string): MachineRowView | null {
  return (
    useMachinesStore.getState().machines?.rows.find((one) => one.id === rowId) ?? null
  );
}

/** The hook, built over the store and the runner above. Exported for its test. */
export const p340MenuHook: P340MenuHook = {
  items(rowId) {
    const row = rowById(rowId);
    if (row === null) return null;
    return machineMenuItems(row, machineMenuFactsOf(useMachinesStore.getState(), rowId));
  },
  async run(rowId, itemId) {
    const row = rowById(rowId);
    if (row === null) return null;
    return runMachineMenuItem(itemId, row);
  }
};

// One property on `window`, assigned when this module is imported, and nothing
// else. A unit test's node process has no window, so nothing is assigned there.
{
  const host = (globalThis as { window?: { __gmuxP340Menu?: P340MenuHook } }).window;
  if (host !== undefined && host !== null) host.__gmuxP340Menu = p340MenuHook;
}
