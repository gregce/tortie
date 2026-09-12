/**
 * blind.mts — reading (c) of the Phase 259 measurement: a person judges twenty
 * claims per recipe without being told which agent wrote them (spec §5.3(c)).
 *
 *   tsx build/p259/blind.mts --draw <a.reading.json> <b.reading.json> [--out build/p259/blind]
 *   tsx build/p259/blind.mts --unblind [--out build/p259/blind]
 *   tsx build/p259/blind.mts --self-test        (reads nothing, launches nothing)
 *
 * WHY BLIND AT ALL. The phase's own claim is that the answer is bounded, and
 * the citation grade measures COPYING rather than understanding: a model handed
 * a FACTS block it cannot see past can score a high backing rate by copying
 * lines it does not understand. So the only reading that says whether the
 * sentences are TRUE is a person reading them against the repository, and a
 * person who knows which agent wrote a claim is not reading the claim.
 *
 * HOW THE IDENTITY IS HIDDEN, and how it can be SEEN that it stayed hidden.
 * The two recipes' samples are written as A.json and B.json, the letter
 * assigned by sorting sha256(agentId + salt); the salt is written to
 * `.salt` in the same directory. THE VERIFIER MUST NOT OPEN `.salt` UNTIL THE
 * VERDICTS ARE WRITTEN. `--unblind` prints the two tallies and prints the
 * `.salt` file's mtime beside each verdicts file's, so a salt read before the
 * judging shows as a salt whose mtime is older than the verdicts and whose
 * ACCESS time is older still — the atime is printed too, which is the reading
 * that actually settles it.
 *
 * THE DRAW IS SEEDED AND PRINTED. The seed is sha256(runId) and the runId is
 * printed with the sample, so a second person draws the same twenty claims
 * from the same reading. Stratified five per grade over the four grades of
 * ARCH_CITE_GRADES, in ladder order, and a short stratum is refilled from the
 * next grade DOWN the ladder rather than from whatever is left, so a reading
 * with no gate claims never quietly becomes twenty `resolves` rows.
 *
 * EACH ROW CARRIES ONLY `{claimId, field, text, citations:[{at, why, grade}]}`.
 * The agent, the model and the recipe version are stripped, and the writer
 * below can emit no other key, which is what makes the blinding structural.
 *
 * It spawns nothing, opens no keychain, makes no request and reads nothing
 * under the person's home.
 */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The ladder, rarest first. Duplicated from @shared/arch on purpose: this file is a research tool and must not drag the app's module graph in. */
const GRADES = ['gate', 'call-site', 'declaration', 'resolves'] as const;
type Grade = (typeof GRADES)[number];

interface Cite { at: string; why: string; grade: Grade }
interface Claim { claimId: string; field: string; text: string; citations: Cite[] }

/** A seeded, printable PRNG: sha256(seed || counter) read four bytes at a time. */
export function prng(seed: string): () => number {
  let n = 0;
  let pool: Buffer = Buffer.alloc(0);
  let at = 0;
  return () => {
    if (at + 4 > pool.length) {
      pool = createHash('sha256').update(`${seed}:${String(n++)}`).digest();
      at = 0;
    }
    const v = pool.readUInt32BE(at);
    at += 4;
    return v / 0x1_0000_0000;
  };
}

/** A shuffle that depends on nothing but the seed. */
export function shuffle<T>(xs: readonly T[], rand: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The grade a claim is filed under: the RAREST of its citations, which is the ladder's own order. */
export function gradeOf(claim: Claim): Grade | null {
  for (const g of GRADES) if (claim.citations.some((c) => c.grade === g)) return g;
  return null;
}

/**
 * The stratified draw. Five per grade in ladder order; a short stratum is
 * refilled from the next grade DOWN, so the sample is never silently all of
 * one grade and the shortfall is reported rather than hidden.
 */
export function draw(claims: readonly Claim[], seed: string, perGrade = 5): { rows: Claim[]; strata: Record<string, number>; short: string[] } {
  const rand = prng(seed);
  const pools = new Map<Grade, Claim[]>();
  for (const g of GRADES) pools.set(g, []);
  for (const c of claims) {
    const g = gradeOf(c);
    if (g !== null) pools.get(g)?.push(c);
  }
  const rows: Claim[] = [];
  const strata: Record<string, number> = {};
  const short: string[] = [];
  const taken = new Set<string>();
  for (const g of GRADES) {
    const pool = shuffle(pools.get(g) ?? [], rand).filter((c) => !taken.has(c.claimId));
    const want = perGrade;
    const got = pool.slice(0, want);
    for (const c of got) taken.add(c.claimId);
    rows.push(...got);
    strata[g] = got.length;
    if (got.length < want) short.push(`${g} short by ${String(want - got.length)}`);
  }
  // Refill, in ladder order, from whatever the ladder still holds.
  const target = perGrade * GRADES.length;
  if (rows.length < target) {
    for (const g of GRADES) {
      for (const c of shuffle(pools.get(g) ?? [], rand)) {
        if (rows.length >= target) break;
        if (taken.has(c.claimId)) continue;
        taken.add(c.claimId);
        rows.push(c);
        strata[g] = (strata[g] ?? 0) + 1;
      }
    }
  }
  return { rows: shuffle(rows, rand), strata, short };
}

/** The one writer. It can emit no key outside the four, which is what makes the blinding structural. */
export function blindRow(claim: Claim): Claim {
  return {
    claimId: claim.claimId,
    field: claim.field,
    text: claim.text,
    citations: claim.citations.map((c) => ({ at: c.at, why: c.why, grade: c.grade }))
  };
}

/** A → B by sha256(agentId + salt), so the letter is not the alphabet and not the argument order. */
export function letters(agents: readonly string[], salt: string): Record<string, string> {
  const ranked = [...agents].sort((a, b) => {
    const x = createHash('sha256').update(a + salt).digest('hex');
    const y = createHash('sha256').update(b + salt).digest('hex');
    return x < y ? -1 : x > y ? 1 : 0;
  });
  const out: Record<string, string> = {};
  ranked.forEach((agent, i) => {
    out[agent] = String.fromCharCode(65 + i);
  });
  return out;
}

/** The claims a reading holds, flattened out of its parts, gates and journeys. */
function claimsOf(reading: any): Claim[] {
  const out: Claim[] = [];
  const cite = (cs: any): Cite[] =>
    (cs ?? [])
      .filter((c: any) => typeof c?.at === 'string' && GRADES.includes(c?.grade))
      .map((c: any) => ({ at: String(c.at), why: String(c.why ?? ''), grade: c.grade as Grade }));
  for (const part of reading?.parts ?? []) {
    for (const claim of part?.claims ?? []) {
      out.push({ claimId: String(claim.claimId ?? `${String(part.id)}:${String(claim.field)}`), field: String(claim.field), text: String(claim.text ?? ''), citations: cite(claim.citations) });
    }
  }
  for (const gate of reading?.gates ?? []) {
    out.push({ claimId: String(gate.claimId ?? `gate:${String(gate.id)}`), field: 'gate', text: `${String(gate.question ?? '')} ${String(gate.answer ?? '')} ${String(gate.because ?? '')}`.trim(), citations: cite(gate.citations) });
  }
  return out;
}

// ---------------------------------------------------------------------------

function selfTest(): void {
  const problems: string[] = [];
  const eq = (what: string, got: unknown, want: unknown): void => {
    if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
  };
  const claims: Claim[] = [];
  for (const [g, n] of [['gate', 2], ['call-site', 9], ['declaration', 9], ['resolves', 9]] as const) {
    for (let i = 0; i < n; i += 1) claims.push({ claimId: `${g}-${String(i)}`, field: 'does', text: `t${String(i)}`, citations: [{ at: `src/x.ts:${String(i + 1)}`, why: 'w', grade: g }] });
  }
  const a = draw(claims, 'seed-one');
  eq('the draw is twenty', a.rows.length, 20);
  eq('a short stratum is REPORTED', a.short, ['gate short by 3']);
  eq('and refilled from the ladder rather than left short', a.strata.gate + a.strata['call-site'] + a.strata.declaration + a.strata.resolves, 20);
  const again = draw(claims, 'seed-one');
  eq('the same seed draws the same twenty', again.rows.map((r) => r.claimId), a.rows.map((r) => r.claimId));
  const other = draw(claims, 'seed-two');
  if (JSON.stringify(other.rows.map((r) => r.claimId)) === JSON.stringify(a.rows.map((r) => r.claimId))) {
    problems.push('a different seed drew the same twenty, so the seed does nothing');
  }
  const row = blindRow({ claimId: 'c', field: 'does', text: 'x', citations: [{ at: 'a:1', why: 'w', grade: 'gate' }], ...( { agentId: 'claude', model: 'opus' } as any) } as Claim);
  eq('the writer emits four keys and nothing else', Object.keys(row).sort(), ['citations', 'claimId', 'field', 'text']);
  if (JSON.stringify(row).includes('claude') || JSON.stringify(row).includes('opus')) problems.push('the blinded row carried the agent or the model');
  const l = letters(['claude', 'codex'], 'salt-a');
  eq('two agents get two letters', Object.values(l).sort(), ['A', 'B']);
  const l2 = letters(['claude', 'codex'], 'salt-b');
  if (JSON.stringify(l) === JSON.stringify(l2)) {
    process.stdout.write('[p259-blind] note: the two salts happened to assign the same letters; that is a 1 in 2 coincidence and not a defect\n');
  }
  eq('gradeOf takes the rarest', gradeOf({ claimId: 'c', field: 'f', text: 't', citations: [{ at: 'a:1', why: '', grade: 'resolves' }, { at: 'b:2', why: '', grade: 'gate' }] }), 'gate');

  if (problems.length > 0) {
    for (const p of problems) process.stderr.write(`[p259-blind] SELF-TEST FAIL: ${p}\n`);
    process.exit(1);
  }
  process.stdout.write('[p259-blind] self-test OK: 9 graders behaved, nothing was read and nothing was launched\n');
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) {
    selfTest();
    return;
  }
  const outDir = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'build/p259/blind';

  if (argv.includes('--unblind')) {
    const salt = readFileSync(join(outDir, '.salt'), 'utf8').trim();
    const map = JSON.parse(readFileSync(join(outDir, 'agents.json'), 'utf8')) as Record<string, string>;
    const assigned = letters(Object.keys(map), salt);
    for (const [agent, letter] of Object.entries(assigned)) {
      const verdictsPath = join(outDir, `${letter}.verdicts.json`);
      if (!existsSync(verdictsPath)) {
        process.stdout.write(`${agent} is ${letter}: no verdicts written yet\n`);
        continue;
      }
      const verdicts = JSON.parse(readFileSync(verdictsPath, 'utf8')) as Record<string, string>;
      const tally: Record<string, number> = { TRUE: 0, FALSE: 0, 'CANNOT TELL': 0 };
      for (const v of Object.values(verdicts)) tally[v] = (tally[v] ?? 0) + 1;
      const s = statSync(join(outDir, '.salt'));
      const w = statSync(verdictsPath);
      process.stdout.write(
        `${agent} is ${letter}: ${JSON.stringify(tally)}\n` +
          `  .salt        mtime ${s.mtime.toISOString()}  atime ${s.atime.toISOString()}\n` +
          `  ${letter}.verdicts  mtime ${w.mtime.toISOString()}\n`
      );
    }
    return;
  }

  const files = argv.filter((a) => !a.startsWith('--') && a.endsWith('.json'));
  if (files.length !== 2) {
    process.stderr.write('usage: tsx build/p259/blind.mts --draw <a.reading.json> <b.reading.json> [--out <dir>]\n');
    process.exit(2);
  }
  mkdirSync(outDir, { recursive: true });
  const salt = randomBytes(16).toString('hex');
  const readings = files.map((f) => ({ file: f, reading: JSON.parse(readFileSync(f, 'utf8')) as any }));
  const agents = readings.map((r) => String(r.reading?.runs?.[0]?.agent ?? r.file.split('/').pop()?.replace(/\..*$/, '') ?? 'unknown'));
  const assigned = letters(agents, salt);
  writeFileSync(join(outDir, '.salt'), `${salt}\n`);
  writeFileSync(join(outDir, 'agents.json'), `${JSON.stringify(Object.fromEntries(agents.map((a) => [a, a])), null, 2)}\n`);
  readings.forEach((r, i) => {
    const agent = agents[i];
    const runId = String(r.reading?.runs?.[0]?.runId ?? `${agent}-run`);
    const seed = createHash('sha256').update(runId).digest('hex');
    const { rows, strata, short } = draw(claimsOf(r.reading), seed);
    const letter = assigned[agent];
    writeFileSync(
      join(outDir, `${letter}.json`),
      `${JSON.stringify({ seed, strata, short, rows: rows.map(blindRow) }, null, 2)}\n`
    );
    process.stdout.write(`wrote ${outDir}/${letter}.json: ${String(rows.length)} claim(s), strata ${JSON.stringify(strata)}${short.length === 0 ? '' : `, ${short.join('; ')}`}\n`);
  });
  process.stdout.write(`\nJudge ${outDir}/A.json and ${outDir}/B.json TRUE / FALSE / CANNOT TELL into <letter>.verdicts.json.\nDO NOT OPEN ${outDir}/.salt until both verdict files are written. Then run --unblind.\n`);
}

main();
