/* LENS 2 (D): the real-shape sessions comparison + in-app gate wiring proof.
 * Run with the tsx CLI (--tsconfig tsconfig.node.json).
 * - worldOf('his') re-derivation: 354 rows / 102 listed / 23 folders / busiest 27.
 * - curated projection over the raw 'his' records is byte-equal to the
 *   shipping buildAgentAccessSessions comparator over the same rows.
 * - every 'his' agent id is one the app's AgentKind union can carry.
 */
import { worldOf } from '../src/main/agent-access/../../src/shared/agent-access';
