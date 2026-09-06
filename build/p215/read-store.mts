// Phase 215 verification. Runs the SHIPPING reader over a COPY of a codex
// state store. Never opens the person's own file. Writes nothing anywhere.
import { openCodexState } from '../../src/main/manifest/harvest/codex-state';
const home = process.env.P215_HOME ?? '';
const r = openCodexState(home);
if (r === null) { console.log('OPEN REFUSED'); process.exit(1); }
const ids = (process.env.P215_IDS ?? '').split(',').filter((s) => s.length > 0);
for (const id of ids) {
  console.log(`${id}  derived=${r.derived(id)}  parent=${String(r.parent(id))}`);
}
r.close();
