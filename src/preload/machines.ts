/**
 * The machines half of the bridge (Phase 68, one call added in Phase 69 and one
 * more in Phase 71). One object, twelve calls and two subscriptions, typed from
 * the shared contract.
 *
 * Three of these calls can start a process, and every one of them is a person
 * pressing a button in Settings. `tailscaleNames` runs the Tailscale program at
 * a pinned absolute path, `test` runs ssh once, and `prepare` runs ssh and starts
 * the program a machine's work will live in. Everything else reads memory in
 * main, writes one row, or writes one record.
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
import { EVT_MACHINE_STATE, EVT_MACHINE_TEST } from '../shared/ipc';
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
  // Phase 69. The first thing Tortie ever starts on another machine, and the one
  // production caller of the exec plane. Main asks the confirm gate before it
  // spawns anything.
  prepare: (id) => invoke('machines:prepare', id),
  // The connection test's own bytes, plus its end. Nothing is emitted at any
  // other time, so a build with no test running subscribes to silence.
  onTestEvent: (cb) => on(EVT_MACHINE_TEST, cb),
  // Phase 71. The link state of every machine. `state` reads memory in main and
  // answers, and the subscription is pushed whenever that answer changes. A
  // build with no machines file gets an empty list and no pushes.
  state: () => invoke('machines:state'),
  onStateChanged: (cb) => on(EVT_MACHINE_STATE, cb)
};
