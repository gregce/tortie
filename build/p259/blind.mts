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
 * The samples are written as A.json, B.json and so on, ONE PER READING, the
 * letter assigned by sorting sha256(label + salt) where the label is one per
 * reading rather than one per agent — two readings of one agent are two draws,
 * and a collision refuses the whole run rather than writing over a draw. The
 * salt is written to
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

/**
 * A → B by sha256(label + salt), so the letter is not the alphabet and not the
 * argument order.
 *
 * THE KEY IS THE READING AND IT WAS THE AGENT, which is the committer's round.
 * Two readings from ONE agent — a full one and a narrowed repeat, which is
 * exactly what this directory holds — collapsed onto one key here: the map
 * held a single entry, both draws were written to `B.json`, the second wrote
 * over the first, and the closing sentence told the reader to judge an
 * `A.json` that was never written. Exit 0, no refusal, and the twenty claim
 * draw was gone. So the key is a LABEL that is one per reading, and
 * {@link labelsOf} is what makes it one.
 */
export function letters(labels: readonly string[], salt: string): Record<string, string> {
  const ranked = [...labels].sort((a, b) => {
    const x = createHash('sha256').update(a + salt).digest('hex');
    const y = createHash('sha256').update(b + salt).digest('hex');
    return x < y ? -1 : x > y ? 1 : 0;
  });
  const out: Record<string, string> = {};
  ranked.forEach((label, i) => {
    out[label] = String.fromCharCode(65 + i);
  });
  return out;
}

/**
 * One label per reading, being the agent alone when the agents differ and the
 * agent with its run beside it when they do not.
 *
 * The agent alone is kept wherever it can be, because it is what `--unblind`
 * prints and a label nobody needs is noise. The run id is added only to the
 * readings that share an agent, and the FILE is the last resort, because two
 * readings of one agent may carry one run id when a record was written twice.
 * The labels never leave this process: only the letters do.
 */
export function labelsOf(readings: readonly { agent: string; runId: string; file: string }[]): string[] {
  const seen = new Map<string, number>();
  for (const r of readings) seen.set(r.agent, (seen.get(r.agent) ?? 0) + 1);
  const used = new Set<string>();
  return readings.map((r) => {
    let label = (seen.get(r.agent) ?? 0) > 1 ? `${r.agent} · ${r.runId}` : r.agent;
    if (used.has(label)) label = `${label} · ${r.file}`;
    let n = 2;
    while (used.has(label)) label = `${r.agent} · ${r.file} · ${String(n++)}`;
    used.add(label);
    return label;
  });
}

/**
 * The claims a reading holds, flattened out of its parts and its gates.
 *
 * IT READS `cites` AND `gateId`, WHICH ARE THE CHANNEL'S OWN SPELLINGS. The
 * Phase 259 fix round is why this sentence is here: it read `claim.citations`
 * and `gate.id`, neither of which `arch:semantic` answers, so over the real
 * reading of 2026-09-12 it printed `A.json: 0 claim(s)` for a file holding 90
 * claims and 199 citations, and `--self-test` passed green because the test
 * built its fixtures in the TOOL's own shape rather than the channel's. The
 * blinded ROW keeps `citations`, because that is the shape a reviewer is
 * handed and nothing reads it back.
 */
export function claimsOf(reading: any): Claim[] {
  const out: Claim[] = [];
  const cite = (cs: any): Cite[] =>
    (cs ?? [])
      .filter((c: any) => typeof c?.at === 'string' && GRADES.includes(c?.grade))
      .map((c: any) => ({ at: String(c.at), why: String(c.why ?? ''), grade: c.grade as Grade }));
  for (const part of reading?.parts ?? []) {
    for (const claim of part?.claims ?? []) {
      out.push({ claimId: String(claim.claimId ?? `${String(part.id)}:${String(claim.field)}`), field: String(claim.field), text: String(claim.text ?? ''), citations: cite(claim.cites) });
    }
  }
  for (const gate of reading?.gates ?? []) {
    out.push({ claimId: String(gate.claimId ?? `gate:${String(gate.partId)}/${String(gate.gateId)}`), field: 'gate', text: `${String(gate.question ?? '')} ${String(gate.answer ?? '')} ${String(gate.because ?? '')}`.trim(), citations: cite(gate.cites) });
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

  // THE COMMITTER'S ROUND: two readings of ONE agent are two draws.
  const oneAgent = labelsOf([
    { agent: 'codex', runId: 'run-one', file: 'codex.reading.json' },
    { agent: 'codex', runId: 'run-two', file: 'codex.journeys.reading.json' }
  ]);
  eq('two readings of one agent get two labels', new Set(oneAgent).size, 2);
  eq('and two letters', Object.values(letters(oneAgent, 'salt-a')).sort(), ['A', 'B']);
  eq(
    'two agents that differ keep the agent as the label, because the run id is noise nobody needs',
    labelsOf([
      { agent: 'claude', runId: 'r1', file: 'claude.reading.json' },
      { agent: 'codex', runId: 'r2', file: 'codex.reading.json' }
    ]),
    ['claude', 'codex']
  );
  // AND THE DEFECT ITSELF IS A FIXTURE. Keying on the agent alone is what the
  // tool did, and over these two readings it answers ONE key, which is one
  // file written twice. A later round that "tidies" the label back to the
  // agent turns this red rather than destroying a draw in silence.
  eq(
    'keying on the agent alone collapses two readings of one agent onto one letter',
    Object.keys(letters(['codex', 'codex'], 'salt-a')).length,
    1
  );
  eq(
    'and one agent with one run id twice still gets two labels, because a record may be written twice',
    new Set(
      labelsOf([
        { agent: 'codex', runId: 'r', file: 'a.reading.json' },
        { agent: 'codex', runId: 'r', file: 'b.reading.json' }
      ])
    ).size,
    2
  );
  const l2 = letters(['claude', 'codex'], 'salt-b');
  if (JSON.stringify(l) === JSON.stringify(l2)) {
    process.stdout.write('[p259-blind] note: the two salts happened to assign the same letters; that is a 1 in 2 coincidence and not a defect\n');
  }
  eq('gradeOf takes the rarest', gradeOf({ claimId: 'c', field: 'f', text: 't', citations: [{ at: 'a:1', why: '', grade: 'resolves' }, { at: 'b:2', why: '', grade: 'gate' }] }), 'gate');

  // THE READER IS DRIVEN OVER THE CHANNEL'S OWN SHAPE, which is the arm that
  // was missing: `arch:semantic` answers `cites` on a claim and `gateId` on a
  // gate, and a reader written to any other spelling finds nothing at all
  // while every other check here stays green.
  const shipped = {
    parts: [
      {
        id: 'src-main',
        name: 'The main process',
        claims: [
          {
            claimId: 'p:src-main:does',
            field: 'does',
            text: 'It keeps the sessions.',
            cites: [{ at: 'src/main/index.ts:12', why: 'a spawn', grade: 'call-site', relPath: 'src/main/index.ts', line: 12 }]
          }
        ]
      }
    ],
    gates: [
      {
        gateId: 'confirm',
        partId: 'src-main',
        question: 'Where does it refuse?',
        answer: 'stops',
        because: 'It asks the gate first.',
        cites: [{ at: 'src/main/gate.ts:3', why: 'a refusal', grade: 'gate', relPath: 'src/main/gate.ts', line: 3 }]
      }
    ]
  };
  const read = claimsOf(shipped);
  eq('claimsOf reads the channel\'s own shape', read.length, 2);
  eq('and keeps every citation', read.map((c) => c.citations.length), [1, 1]);
  eq('and names the gate by its part and its id', read[1]?.claimId, 'gate:src-main/confirm');
  eq('claimsOf over the tool\'s own old spelling finds nothing', claimsOf({ parts: [{ id: 'a', claims: [{ claimId: 'x', field: 'does', text: 't', citations: [{ at: 'a:1', why: '', grade: 'gate' }] }] }], gates: [] })[0]?.citations.length, 0);

  if (problems.length > 0) {
    for (const p of problems) process.stderr.write(`[p259-blind] SELF-TEST FAIL: ${p}\n`);
    process.exit(1);
  }
  process.stdout.write('[p259-blind] self-test OK: 18 graders behaved, nothing was read and nothing was launched\n');
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
    // label → agent. The letters are recomputed from the LABELS, which is what
    // the draw keyed on, and the agent is what gets printed.
    const map = JSON.parse(readFileSync(join(outDir, 'agents.json'), 'utf8')) as Record<string, string>;
    const assigned = letters(Object.keys(map), salt);
    for (const [label, letter] of Object.entries(assigned)) {
      const agent = map[label] ?? label;
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
  const readings = files.map((f) => {
    const reading = JSON.parse(readFileSync(f, 'utf8')) as any;
    const agent = String(reading?.runs?.[0]?.agent ?? f.split('/').pop()?.replace(/\..*$/, '') ?? 'unknown');
    return {
      file: String(f.split('/').pop() ?? f),
      reading,
      agent,
      runId: String(reading?.runs?.[0]?.runId ?? `${agent}-run`)
    };
  });
  const labels = labelsOf(readings);
  const assigned = letters(labels, salt);
  // EVERY READING GETS ITS OWN LETTER OR NOTHING IS WRITTEN. A draw that
  // overwrites a draw is a judgment destroyed in silence, and it is the one
  // failure this tool cannot be allowed to have: the verdicts it collects are
  // the only reading of whether the sentences are TRUE.
  const taken = new Map<string, string>();
  for (const [i, label] of labels.entries()) {
    const letter = assigned[label];
    if (letter === undefined || taken.has(letter)) {
      process.stderr.write(
        `[p259-blind] REFUSED: ${files[i]} and ${String(taken.get(letter ?? '') ?? '(nothing)')} both drew the letter ` +
          `${String(letter)}, so one draw would have been written over the other. Nothing was written.\n`
      );
      process.exit(1);
    }
    taken.set(letter, files[i]);
  }
  writeFileSync(join(outDir, '.salt'), `${salt}\n`);
  // label → agent, so `--unblind` still names the AGENT rather than the label,
  // and two readings of one agent are two rows rather than one.
  writeFileSync(
    join(outDir, 'agents.json'),
    `${JSON.stringify(Object.fromEntries(labels.map((label, i) => [label, readings[i].agent])), null, 2)}\n`
  );
  const written: string[] = [];
  readings.forEach((r, i) => {
    const seed = createHash('sha256').update(r.runId).digest('hex');
    const { rows, strata, short } = draw(claimsOf(r.reading), seed);
    const letter = assigned[labels[i]];
    writeFileSync(
      join(outDir, `${letter}.json`),
      `${JSON.stringify({ seed, strata, short, rows: rows.map(blindRow) }, null, 2)}\n`
    );
    written.push(`${letter}.json`);
    // A DRAW OF NOTHING IS SAID OUT LOUD. A reading holding only journeys has
    // no part claim and no gate in it, so an empty draw is honest rather than
    // broken — and a reviewer handed an empty file with no word about it would
    // read it as a tool that failed.
    const empty = rows.length === 0 ? ' — THIS READING HAS NO CLAIM TO JUDGE, so there is nothing in it' : '';
    process.stdout.write(
      `wrote ${outDir}/${letter}.json: ${String(rows.length)} claim(s), strata ${JSON.stringify(strata)}` +
        `${short.length === 0 ? '' : `, ${short.join('; ')}`}${empty}\n`
    );
  });
  process.stdout.write(
    `\nJudge ${written.map((name) => `${outDir}/${name}`).join(' and ')} TRUE / FALSE / CANNOT TELL into ` +
      `<letter>.verdicts.json.\nDO NOT OPEN ${outDir}/.salt until every verdict file is written. Then run --unblind.\n`
  );
}

main();
