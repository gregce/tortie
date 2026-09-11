/**
 * Phase 256 prototype — THE PLANTED CLAIMS.
 *
 * RESEARCH PROTOTYPE. Nothing here ships.
 *
 *   tsx build/p256/semantic/plant.mts <pass.json> <facts.json> <repo>
 *
 * `check.mts` says how many of a pass's citations stand on a detected fact.
 * It does NOT say how many LIES it would refuse, and those are different
 * questions: a false sentence with a true citation is backed.
 *
 * So this takes the researcher's own hand pass and makes one deliberately
 * false copy per shape a writer — a person or a model — really gets wrong,
 * runs the SHIPPING checker over each, and reports whether any finding names
 * the plant. It is the adversarial half of §6.4 and its answer is a fraction,
 * printed rather than reasoned about.
 *
 * A plant is CAUGHT only when a finding names the component, journey or gate
 * the lie sits in. A finding elsewhere in the pass — the 24 the honest pass
 * already raises — is not a catch and is subtracted.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface Plant {
  id: string;
  what: string;
  /** Which claim shape it attacks. */
  shape: string;
  /** The component / journey / gate a finding must name to count as a catch. */
  where: string;
  edit: (p: any) => void;
}

const PLANTS: Plant[] = [
  {
    id: 'wrong-job',
    shape: 'the contract prose is false and every citation is real',
    what: 'durable-sessions renamed "Billing and card capture", its job a credit-card charge, its runsIn a payment provider, its three real tmux citations untouched',
    where: 'component durable-sessions',
    edit: (p) => {
      const c = p.components.find((x: any) => x.id === 'durable-sessions');
      c.name = 'Billing and card capture';
      c.job = "Takes the person's credit card, charges it monthly and files the receipt.";
      c.input = 'a card number and a billing address';
      c.output = 'a receipt and a renewed subscription';
      c.runsIn = "the payment provider's servers";
      c.state = 'the card on file';
      c.limit = 'a refund has to be asked for by hand';
    }
  },
  {
    id: 'wrong-component',
    shape: 'a whole part that does not exist, citing the right files',
    what: 'a new component "The tmux id stamp is our SQL migration runner" citing tmux/env.ts:49 and tmux/sessions.ts:85 — right file, wrong symbol',
    where: 'component migration-runner',
    edit: (p) => {
      p.components.push({
        id: 'migration-runner',
        name: 'The database migration runner',
        job: 'Runs every pending SQL migration against the manifest at boot, in order, inside a transaction.',
        input: 'the migration directory',
        output: 'a schema at the newest version',
        runsIn: 'main, before any window opens',
        state: 'the schema version row',
        limit: 'a migration that throws leaves the schema at the previous version',
        evidence: 'composed',
        facts: [
          { at: 'src/main/tmux/env.ts:49', why: 'the migration table the runner reads' },
          { at: 'src/main/tmux/sessions.ts:85', why: 'the transaction the runner opens' }
        ]
      });
    }
  },
  {
    id: 'wrong-test',
    shape: 'an evidence level justified by an unrelated test',
    what: 'logins claims component-tested and cites src/main/__tests__/ansi.test.ts:32 for a claim about SSH host keys',
    where: 'component logins',
    edit: (p) => {
      const c = p.components.find((x: any) => x.id === 'logins');
      c.evidence = 'component-tested';
      c.facts.push({ at: 'src/main/__tests__/ansi.test.ts:32', why: 'the test that proves the ssh host key file is ours' });
    }
  },
  {
    id: 'wrong-order',
    shape: 'a journey whose steps are in an impossible order',
    what: 'start-and-return reversed, so the session is attached before it is created',
    where: 'journey start-and-return',
    edit: (p) => {
      const j = p.journeys.find((x: any) => x.id === 'start-and-return');
      j.steps.reverse();
    }
  },
  {
    id: 'wrong-gate',
    shape: 'a gate that is not in the product at all',
    what: 'a gate "Will Tortie refuse to deploy on a Friday?" citing demo/bridge/install.ts:106',
    where: 'gate friday-deploy',
    edit: (p) => {
      p.gates.push({
        id: 'friday-deploy',
        question: 'Will Tortie refuse to deploy on a Friday?',
        answer: 'stops',
        because: 'the release gate reads the day of the week and refuses Friday and Saturday.',
        facts: [{ at: 'demo/bridge/install.ts:106', why: 'the day-of-week refusal' }]
      });
    }
  },
  {
    id: 'accepted-live',
    shape: 'a rung nothing in a repository is evidence for',
    what: 'machines claims accepted-live',
    where: 'component machines',
    edit: (p) => {
      p.components.find((x: any) => x.id === 'machines').evidence = 'accepted-live';
    }
  },
  {
    id: 'invented-numbers',
    shape: 'numbers no fact carries',
    what: 'three invented numbers in contract prose: "17 times", "4096 seconds", "92 credentials"',
    where: 'component logins',
    edit: (p) => {
      const c = p.components.find((x: any) => x.id === 'logins');
      c.limit = 'a refresh is retried 17 times over 4096 seconds, and no more than 92 credentials are kept.';
    }
  }
];

function findings(out: string): { rule: string; where: string }[] {
  const rows: { rule: string; where: string }[] = [];
  let rule: string | null = null;
  for (const line of out.split('\n')) {
    const head = /^([0-9]-[a-z-]+|[0-9]-[a-z-]+-weak) — \d+$/.exec(line.trim());
    if (head !== null) {
      rule = head[1];
      continue;
    }
    if (line.startsWith('  ') && rule !== null && line.includes(': ')) {
      rows.push({ rule, where: line.trim().split(': ')[0] });
    }
    if (line.startsWith('CLAIM LEDGER')) rule = null;
  }
  return rows;
}

function main(): void {
  const [, , passPath, factsPath, repo] = process.argv;
  if (!passPath || !factsPath || !repo) {
    console.error('usage: tsx build/p256/semantic/plant.mts <pass.json> <facts.json> <repo>');
    process.exit(2);
  }
  const here = join(repo, 'build', 'p256', 'semantic', 'check.mts');
  const tsx = join(repo, 'node_modules', '.bin', 'tsx');
  // A pass that cannot RUN must not read as a pass that caught nothing. The
  // catch below is for the checker's exit 1, which is its ordinary "I have
  // findings" answer, and swallowing anything else turned a repository with no
  // `node_modules` into `CAUGHT 0 of 7` and an exit 0 — a spec assertion
  // reporting the opposite of the truth. `corpus.sh`'s own clones are exactly
  // that shape, so this is reachable rather than theoretical.
  for (const [what, path] of [['the checker', here], ['tsx', tsx]] as const) {
    if (!existsSync(path)) {
      console.error(`cannot run: ${what} is not at ${path}. This needs a checkout with node_modules installed.`);
      process.exit(2);
    }
  }
  const scratch = mkdtempSync(join(tmpdir(), 'p256-plant-'));
  try {
    const run = (file: string): string => {
      try {
        return execFileSync(tsx, [here, file, factsPath, repo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      } catch (err: any) {
        // The checker exits 1 when it has findings, which is the ordinary case.
        // Every other exit is the checker failing to run, and returning its
        // empty stdout would be counted as "raised no finding".
        const out = typeof err?.stdout === 'string' ? err.stdout : '';
        if (err?.status === 1 && out.length > 0) return out;
        console.error(
          `the checker did not run over ${file}: exit ${String(err?.status ?? 'none')}` +
            `${err?.signal ? ` signal ${String(err.signal)}` : ''}\n` +
            `${String(err?.stderr ?? err?.message ?? '')}`.trimEnd()
        );
        process.exit(2);
      }
    };
    const base = JSON.parse(readFileSync(passPath, 'utf8'));
    const honest = new Set(findings(run(passPath)).map((f) => `${f.rule}|${f.where}`));
    console.log(`PLANTED CLAIMS over ${passPath}\n`);
    console.log(`the honest pass raises ${honest.size} findings; a catch is a finding the honest pass does NOT raise, naming the plant\n`);
    let caught = 0;
    const rows: string[] = [];
    for (const p of PLANTS) {
      const copy = JSON.parse(JSON.stringify(base));
      p.edit(copy);
      const file = join(scratch, `${p.id}.json`);
      writeFileSync(file, JSON.stringify(copy, null, 2));
      const fresh = findings(run(file)).filter((f) => !honest.has(`${f.rule}|${f.where}`));
      const naming = fresh.filter((f) => f.where === p.where);
      const hit = naming.length > 0;
      if (hit) caught += 1;
      rows.push(
        `${hit ? 'CAUGHT ' : 'MISSED '} | ${p.id.padEnd(18)} | ${p.shape}\n           ${p.what}\n           new findings naming ${p.where}: ${naming.length === 0 ? 'none' : naming.map((f) => f.rule).join(', ')}${fresh.length > naming.length ? ` (and ${fresh.length - naming.length} elsewhere)` : ''}`
      );
    }
    for (const r of rows) console.log(r);
    console.log(`\nCAUGHT ${caught} of ${PLANTS.length}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

main();
