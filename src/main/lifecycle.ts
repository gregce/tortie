/**
 * The app lifecycle state (Phase 144, stage 1 of the 36 plan).
 *
 * One main owned module, one monotonic transition:
 *
 *     running -> quitting
 *
 * WHY IT EXISTS. Before this module, quit intent lived in a boolean local to
 * src/main/index.ts, so src/main/typed-ipc.ts could not read it. The ordered
 * disposer awaits shutdownGmuxCore() before it begins the remote execution
 * shutdown, and the renderer stays alive through that wait, so a renderer
 * request could still reach a filesystem, git or machine mutation handler in
 * the middle of a quit. Now the composition root flips this state
 * SYNCHRONOUSLY in the first before-quit pass, with no await in front of the
 * change, and the one typed invoke wrapper refuses every new renderer invoke
 * from that moment with the typed SHUTTING_DOWN payload.
 *
 * WHAT IT IS NOT. This module owns no teardown and joins nothing. The ordered
 * disposer in src/main/capabilities.ts keeps every child it already owns, and
 * the session core and the remote execution ledger keep their own finer
 * lifecycles (src/main/sessions/core.ts, the Phase 116 refusal, and
 * src/main/machines/execution-ledger.ts, the Phase 118 refusal). This module
 * changes WHEN admission closes, not who owns each child. Internal shutdown
 * work never rides renderer IPC, so nothing the quit path itself needs is
 * behind this gate.
 *
 * THE TRANSITION IS ONE WAY ON PURPOSE. There is no export that puts the
 * state back to running, and src/main/__tests__/quit-admission.test.ts pins
 * the export surface, because a way back would turn "the quit has started"
 * into a question with two answers.
 */

export type AppLifecycleState = 'running' | 'quitting';

/**
 * The one refusal sentence, the same wording Phase 116 chose for the core's
 * own refusal, because to a person the two are the same event. It fires only
 * after they chose to quit, while the windows are closing, and every renderer
 * call site already catches invoke rejections, so the sentence exists for the
 * surface that does render it, e.g. a log line.
 */
export const APP_QUIT_REFUSAL =
  'Tortie is quitting, so this action was not started.';

let state: AppLifecycleState = 'running';

/**
 * Where the app is in its life. Read by the one typed invoke wrapper
 * (src/main/typed-ipc.ts) before it dispatches any handler.
 */
export function appLifecycleState(): AppLifecycleState {
  return state;
}

/**
 * Record that the quit has started. The composition root calls this in the
 * first before-quit pass, synchronously, before any await. Idempotent, and
 * there is deliberately no way back.
 */
export function markAppQuitting(): void {
  state = 'quitting';
}
