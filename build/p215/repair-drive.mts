/**
 * Phase 215 verification. Runs the SHIPPING boot repair over a COPY of a
 * manifest, against a codex home whose `sessions` may be a read-only symlink
 * to the person's own store.
 *
 * IT NEVER OPENS THE PERSON'S OWN MANIFEST. The caller copies it first and
 * points P215_MANIFEST at the copy. It reads rollout files with flag 'r' and
 * writes nothing under any codex home.
 */
import { createHash } from 'node:crypto';
import { ManifestStore } from '../../src/main/manifest/store';
import { repairCodexResumeIds } from '../../src/main/sessions/codex-repair';

const store = new ManifestStore(process.env.P215_MANIFEST ?? '');
const codexHome = process.env.P215_CODEX_HOME ?? '';

const snapshot = (): string =>
  createHash('sha256')
    .update(
      JSON.stringify(
        store.listSessions().map((r) => [
          r.id,
          r.agent,
          r.agentSessionId ?? null,
          r.resumeArgv ?? null,
          r.resumeProvenance ?? null
        ])
      )
    )
    .digest('hex');

const nonCodex = (): string =>
  createHash('sha256')
    .update(
      JSON.stringify(
        store
          .listSessions()
          .filter((r) => r.agent !== 'codex')
          .map((r) => [r.id, r.agent, r.agentSessionId ?? null, r.resumeArgv ?? null])
      )
    )
    .digest('hex');

const before = snapshot();
const beforeOthers = nonCodex();
const t0 = Date.now();
const first = repairCodexResumeIds(store, { env: { CODEX_HOME: codexHome } });
const ms1 = Date.now() - t0;
const afterFirst = snapshot();
const t1 = Date.now();
const second = repairCodexResumeIds(store, { env: { CODEX_HOME: codexHome } });
const ms2 = Date.now() - t1;
const afterSecond = snapshot();

const pad = (v: unknown, n: number): string => String(v ?? '').padEnd(n).slice(0, n);
process.stdout.write(
  `${pad('row', 9)} ${pad('name', 22)} ${pad('verdict', 18)} ${pad('by', 8)} ` +
    `${pad('hp', 3)} ${pad('before', 38)} after\n`
);
for (const o of first) {
  process.stdout.write(
    `${pad(o.sessionId.slice(0, 8), 9)} ${pad(o.name, 22)} ${pad(o.verdict, 18)} ` +
      `${pad(o.saidBy, 8)} ${pad(o.hops || '', 3)} ${pad(o.before, 38)} ` +
      `${o.after === o.before ? '(unchanged)' : o.after}\n`
  );
}
const tally = (rows: { verdict: string }[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.verdict] = (out[r.verdict] ?? 0) + 1;
  return out;
};
process.stdout.write(`\npass 1 ${ms1} ms ${JSON.stringify(tally(first))}\n`);
process.stdout.write(`pass 2 ${ms2} ms ${JSON.stringify(tally(second))}\n`);
process.stdout.write(
  `\ndigest before      ${before}\n` +
    `digest after pass1 ${afterFirst}\n` +
    `digest after pass2 ${afterSecond}\n` +
    `IDEMPOTENT: ${String(afterFirst === afterSecond)}\n` +
    `NON-CODEX ROWS BYTE IDENTICAL: ${String(beforeOthers === nonCodex())}\n` +
    `rows that moved: ${String(first.filter((o) => o.verdict === 'repaired').length)}, ` +
    `pass 2 moved: ${String(second.filter((o) => o.verdict === 'repaired').length)}\n`
);
store.close();
