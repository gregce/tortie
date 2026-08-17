/**
 * The machines half of the bridge (Phase 68). One object, ten calls and one
 * subscription, typed from the shared contract.
 *
 * Two of these calls can start a process, and both of them are a person
 * pressing a button in Settings. `tailscaleNames` runs the Tailscale program at
 * a pinned absolute path, and `test` runs ssh once. Everything else reads
 * memory in main, writes one row, or writes one record.
 *
 * The renderer never supplies the acknowledgement sentence and never supplies
 * the hash it wants recorded. It sends back the hash the sheet was drawn from
 * and the lines that were on it, and main refuses a stale hash, so "a person
 * agreed to THESE details" cannot be forged from this side of the bridge.
 *
 * There is deliberately no `connect` and no `open a session`. Phase 68 builds
 * neither, and a later phase adds them through their own channels rather than
 * by widening one of these.
 */

import type { GmuxMachinesExtras } from '../shared/ipc';
import { EVT_MACHINE_TEST } from '../shared/ipc';
import { invoke, on } from './bridge';

export const machines: NonNullable<GmuxMachinesExtras['machines']> = {
  rows: () => invoke('machines:rows'),
  reload: () => invoke('machines:reload'),
  tailscaleNames: () => invoke('machines:tailscaleNames'),
  test: (input) => invoke('machines:test', input),
  testInput: (input) => invoke('machines:testInput', input),
  testCancel: (testId) => invoke('machines:testCancel', testId),
  add: (input) => invoke('machines:add', input),
  confirm: (input) => invoke('machines:confirm', input),
  forget: (id) => invoke('machines:forget', id),
  remove: (id) => invoke('machines:remove', id),
  // The connection test's own bytes, plus its end. Nothing is emitted at any
  // other time, so a build with no test running subscribes to silence.
  onTestEvent: (cb) => on(EVT_MACHINE_TEST, cb)
};
