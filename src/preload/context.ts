/**
 * The context half of the bridge: the Context view's scan and skills install
 * path (Phase 22), the launch snapshot read, and the Phase 23 configuration
 * confirm gate. Moved verbatim from the single preload file (Phase 42
 * stage 2).
 */

import type { ContextSnapshot } from '../shared/context-snapshot';
import type { GmuxConfigExtras, GmuxContextExtras } from '../shared/ipc';
import { invoke } from './bridge';

/**
 * context surface (Phase 22) — what an agent will LOAD once it starts.
 *
 * Eleven methods behind one object, feature-detected together, and exactly one
 * of them can change anything. `scan`, `hashSkill`, `skillsSearch`,
 * `skillsAudit`, `skillsPreview` and `skillPins` read. `skillsPlan` builds a
 * command and does not run it. `skillPinRecord` and `skillPinForget` write one
 * file inside Tortie's own userData directory and nothing else. `skillsRun` is
 * the only method in this bridge that spawns the skills CLI, and main rebuilds
 * the command from the typed operation before it runs, so the renderer says
 * what it wants done and never how to do it.
 */
export const context: NonNullable<GmuxContextExtras['context']> = {
  scan: (input) => invoke('context:scan', input),
  skillsCapability: () => invoke('context:skillsCapability'),
  skillsPlan: (input) => invoke('context:skillsPlan', input),
  skillsRun: (input) => invoke('context:skillsRun', input),
  hashSkill: (path) => invoke('context:hashSkill', path),
  skillsSearch: (input) => invoke('context:skillsSearch', input),
  skillsAudit: (input) => invoke('context:skillsAudit', input),
  skillsPreview: (input) => invoke('context:skillsPreview', input),
  skillPins: (paths) => invoke('context:skillPins', paths),
  skillPinRecord: (input) => invoke('context:skillPinRecord', input),
  skillPinForget: (path) => invoke('context:skillPinForget', path)
};

/**
 * config surface (Phase 23) — the configuration file's rows, and the one
 * confirmation a person gives before Tortie will start what a row names.
 *
 * Three methods, and none of them starts a process. `rows` reads what the file
 * says and what is on record for each row, from memory in main. `confirm`
 * writes ONE record, being that a person read the lines and agreed to them.
 * `forget` deletes that record so the row asks again. There is deliberately no
 * `launch` and no `reload that then does something`: a configured agent starts
 * through the ordinary session create path, which asks the gate in main first.
 *
 * The renderer never supplies the acknowledgement sentence and never supplies
 * the hash it wants recorded. It sends back the hash the sheet was drawn from
 * and the lines that were on it, and main refuses a stale hash, so "a person
 * agreed to THESE bytes" cannot be forged from this side of the bridge.
 */
export const config: NonNullable<GmuxConfigExtras['config']> = {
  rows: () => invoke('config:rows'),
  confirm: (input) => invoke('config:confirm', input),
  forget: (id) => invoke('config:forget', id)
};

/**
 * Phase 22 optional extra: what one session's configuration was when Tortie
 * launched it. Read only, and the session readout is the only caller. The
 * comparison against what the configuration is now happens in the renderer,
 * against rows the Context view has already resolved, so this call walks
 * nothing and returns one stored record.
 */
export function contextSnapshot(
  sessionId: string
): Promise<ContextSnapshot | null> {
  return invoke('context:sessionSnapshot', sessionId);
}
