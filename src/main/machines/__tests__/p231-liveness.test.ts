/**
 * The two liveness facts and the classification of every far-side channel
 * (Phase 231, item 5).
 *
 * ## What this file pins
 *
 * The charter's rule, in one table: every READ verb proceeds on link-up
 * feed-down; every SESSION verb refuses on feed-down; every verb refuses on
 * link-down. The table is `src/main/machines/liveness.ts`'s own header, the
 * predicates there are what every verb asks, and this file drives them over
 * every one of the fifteen cells for every one of the twenty-one channels.
 *
 * Then the classification is held against the SOURCE rather than against
 * itself. A channel's handler module must ask the question the table says it
 * asks and never the other one, a module that reaches the far side only
 * through the second door must reach it and ask nothing itself, because step
 * 4 of the door asks the LINK for every script at once, and every file under
 * `src/main/machines` that asks a question at all must be in the table. A
 * table nobody holds against the tree is a comment.
 *
 * ## Each clause ablated once goes red
 *
 * `liveness.ts` imports nothing, so an ablated COPY of it can be transpiled
 * and loaded from a scratch directory and the same rules run over it. Eight
 * copies, one clause each, and every copy must turn at least one rule red,
 * naming the rule. A rule that stays green under an ablation of the clause it
 * pins is a rule that pins nothing, which is what this section exists to
 * refuse.
 *
 * The clauses that live in `remote-run.ts`, `remote-sessions.ts` and
 * `exec-plane.ts`, being the door asking the link, the poll marking the feed
 * and not the link, a link failure marking the link, and the class recorded
 * beside the error, are pinned by BEHAVIOUR in `remote-run.test.ts`,
 * `remote-sessions.test.ts` and `control-plane.test.ts`, and by the source
 * scan in rule 4 here.
 *
 * Nothing here opens a connection, starts a server, reads a file under the
 * person's home or launches Electron. It reads the tree it runs from and
 * writes eight files to a scratch directory it removes.
 */

import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { afterAll, describe, expect, it } from 'vitest';
import * as shipping from '../liveness';

type Liveness = typeof shipping;
type Facts = { link: shipping.MachineLinkKind; feed: shipping.MachineFeedKind };

const HERE = dirname(fileURLToPath(import.meta.url));
const MACHINES = join(HERE, '..');
const LIVENESS_PATH = join(MACHINES, 'liveness.ts');

const LINKS: readonly shipping.MachineLinkKind[] = [
  'connected',
  'polling',
  'connecting',
  'quiet',
  'refused'
];
const FEEDS: readonly shipping.MachineFeedKind[] = ['listed', 'unknown', 'missed'];
const ANSWERING: ReadonlySet<string> = new Set(['connected', 'polling']);

function everyCell(): Facts[] {
  const out: Facts[] = [];
  for (const link of LINKS) for (const feed of FEEDS) out.push({ link, feed });
  return out;
}

/**
 * THE CLASSIFICATION PER CALL SITE. Every far-side channel, the module whose
 * function its `ipc.ts` handler calls, and whether that module asks a question
 * itself or reaches the far side only through the second door.
 *
 * `door` means the module calls `runRemoteRead` or `runRemoteWrite` and asks
 * nothing of its own, so the LINK is asked for it by step 4 of
 * `runRemoteScript`. Those modules are deliberately NOT in `MODULE_FACT`,
 * because the door's gate is the door's and not a caller's.
 */
const CHANNEL_MODULE: Readonly<Record<string, { module: string; asks: 'self' | 'door' }>> = {
  'machines:listTree': { module: 'tree-list.ts', asks: 'self' },
  'machines:listDir': { module: 'dir-list.ts', asks: 'door' },
  'machines:listFiles': { module: 'remote-files.ts', asks: 'self' },
  'machines:findProject': { module: 'project-counterpart.ts', asks: 'door' },
  'machines:searchContent': { module: 'remote-search.ts', asks: 'self' },
  'machines:readContext': { module: 'remote-agent-context.ts', asks: 'self' },
  'machines:readHistory': { module: 'remote-history.ts', asks: 'self' },
  'machines:readBranch': { module: 'remote-branch.ts', asks: 'self' },
  'machines:readRuns': { module: 'remote-runs.ts', asks: 'self' },
  'machines:reviewFiles': { module: 'remote-review.ts', asks: 'door' },
  'machines:reviewFile': { module: 'remote-review.ts', asks: 'door' },
  'machines:putFile': { module: 'remote-file.ts', asks: 'door' },
  'machines:putImage': { module: 'remote-image.ts', asks: 'door' },
  'machines:makeDir': { module: 'remote-entry.ts', asks: 'door' },
  'machines:renameEntry': { module: 'remote-entry.ts', asks: 'door' },
  'machines:stage': { module: 'remote-stage.ts', asks: 'door' },
  'machines:unstage': { module: 'remote-stage.ts', asks: 'door' },
  'machines:commit': { module: 'remote-commit.ts', asks: 'self' },
  'machines:cloneProject': { module: 'remote-clone.ts', asks: 'self' },
  'machines:readSessionLines': { module: 'remote-lines.ts', asks: 'self' },
  'machines:agents': { module: 'machine-agents.ts', asks: 'self' }
};

const LINK_QUESTIONS = ['machineLinkAnswering(', 'assertMachineLinkAnswering('];
const FEED_QUESTIONS = ['machineFeedAnswering(', 'assertMachineFeedAnswering('];
const DOORS = ['runRemoteRead(', 'runRemoteWrite('];

function source(module: string): string {
  return readFileSync(join(MACHINES, module), 'utf8');
}

function names(text: string, needles: readonly string[]): boolean {
  return needles.some((one) => text.includes(one));
}

// ---------------------------------------------------------------------------
// The rules, written over a module so the ablated copies run the same ones
// ---------------------------------------------------------------------------

/** Rule 1. The table in the header, every cell. */
function theTable(mod: Liveness): void {
  for (const cell of everyCell()) {
    const link = mod.linkAnswering(cell);
    const feed = mod.feedAnswering(cell);
    expect(link, `link ${cell.link}`).toBe(ANSWERING.has(cell.link));
    expect(feed, `link ${cell.link} feed ${cell.feed}`).toBe(
      ANSWERING.has(cell.link) && cell.feed === 'listed'
    );
  }
}

/**
 * Rule 2. The charter's three sentences, over every channel and every cell:
 * every read verb proceeds on link-up feed-down, every session verb refuses
 * on feed-down, every verb refuses on link-down.
 */
function theVerbMatrix(mod: Liveness): void {
  const proceeds = (fact: shipping.LivenessFact, cell: Facts): boolean =>
    fact === 'link' ? mod.linkAnswering(cell) : mod.feedAnswering(cell);
  for (const [channel, fact] of Object.entries(mod.CHANNEL_FACT)) {
    for (const cell of everyCell()) {
      const where = `${channel} at link ${cell.link} feed ${cell.feed}`;
      const linkUp = ANSWERING.has(cell.link);
      const feedDown = cell.feed !== 'listed';
      if (!linkUp) {
        expect(proceeds(fact, cell), `${where}: every verb refuses on link-down`).toBe(false);
      } else if (feedDown) {
        if (fact === 'link') {
          expect(proceeds(fact, cell), `${where}: a read verb proceeds on link-up feed-down`).toBe(true);
        } else {
          expect(proceeds(fact, cell), `${where}: a session verb refuses on feed-down`).toBe(false);
        }
      } else {
        expect(proceeds(fact, cell), `${where}: both proceed when both answer`).toBe(true);
      }
    }
  }
}

/** Rule 3. The classification, held against the source. */
function theClassification(mod: Liveness): void {
  // 3a. Twenty-one channels, and exactly these two are the session's own.
  const channels = Object.keys(mod.CHANNEL_FACT).sort();
  expect(channels).toEqual(Object.keys(CHANNEL_MODULE).sort());
  expect(channels).toHaveLength(21);
  const feedChannels = channels.filter((one) => mod.CHANNEL_FACT[one] === 'feed');
  expect(feedChannels).toEqual(['machines:agents', 'machines:readSessionLines']);

  // 3b. Every channel's handler module asks the fact the table says, or
  //     reaches the door and asks nothing, and the door asks the link.
  for (const [channel, fact] of Object.entries(mod.CHANNEL_FACT)) {
    const site = CHANNEL_MODULE[channel];
    expect(site, channel).toBeDefined();
    if (site === undefined) continue;
    const text = source(site.module);
    if (site.asks === 'door') {
      expect(names(text, DOORS), `${channel}: ${site.module} reaches the door`).toBe(true);
      expect(
        names(text, [...LINK_QUESTIONS, ...FEED_QUESTIONS]),
        `${channel}: ${site.module} asks nothing itself`
      ).toBe(false);
      expect(fact, `${channel}: a door-only module is a link verb`).toBe('link');
      expect(mod.MODULE_FACT[site.module], `${channel}: ${site.module} is not a direct asker`).toBeUndefined();
      continue;
    }
    expect(mod.MODULE_FACT[site.module], `${channel}: ${site.module} is classified`).toBe(fact);
    const asks = fact === 'link' ? LINK_QUESTIONS : FEED_QUESTIONS;
    const never = fact === 'link' ? FEED_QUESTIONS : LINK_QUESTIONS;
    expect(names(text, asks), `${channel}: ${site.module} asks the ${fact}`).toBe(true);
    expect(names(text, never), `${channel}: ${site.module} never asks the other fact`).toBe(false);
  }

  // 3c. Every module in the table asks what it says, including the two
  //     passes that walk the session rows and answer no channel of their own.
  for (const [module, fact] of Object.entries(mod.MODULE_FACT)) {
    const text = source(module);
    const asks = fact === 'link' ? LINK_QUESTIONS : FEED_QUESTIONS;
    const never = fact === 'link' ? FEED_QUESTIONS : LINK_QUESTIONS;
    expect(names(text, asks), `${module} asks the ${fact}`).toBe(true);
    expect(names(text, never), `${module} never asks the other fact`).toBe(false);
  }

  // 3d. Completeness. Every file under src/main/machines that asks a question
  //     is in the table, except the door itself, whose step 4 is its own gate.
  const askers = readdirSync(MACHINES)
    .filter((one) => one.endsWith('.ts') && one !== 'remote-run.ts')
    .filter((one) => names(source(one), [...LINK_QUESTIONS, ...FEED_QUESTIONS]))
    .sort();
  expect(askers).toEqual(Object.keys(mod.MODULE_FACT).sort());

  // 3e. The old single question is gone from the domain. Prose may still
  //     name it, since two headers say what it was; nothing may call it.
  for (const one of readdirSync(MACHINES).filter((f) => f.endsWith('.ts'))) {
    expect(source(one).includes('machineIsConnected('), `${one} calls machineIsConnected`).toBe(false);
  }
}

/** Rule 4. The link's own failures, and the three places that read them. */
function theLinkFailures(mod: Liveness): void {
  expect([...mod.LINK_FAILURE_CLASSES].sort()).toEqual(['not-resolved', 'refused', 'unreachable']);
  for (const cls of mod.LINK_FAILURE_CLASSES) {
    expect(mod.isLinkFailure(cls), cls).toBe(true);
  }
  for (const cls of [
    'auth-refused',
    'host-key-changed',
    'no-server',
    'timed-out',
    'cancelled',
    'no-program',
    'client-missing',
    'unknown',
    'ok'
  ]) {
    expect(mod.isLinkFailure(cls), cls).toBe(false);
  }
  expect(mod.isLinkFailure(null)).toBe(false);

  // The door: step 6 asks the class of the failure and marks the link for a
  // link class, inside runRemoteScript and before the throw.
  const door = source('remote-run.ts');
  const body = door.slice(door.indexOf('async function runRemoteScript('));
  expect(body).toContain('assertMachineLinkAnswering(ctx.machineId, scriptId, labelOf(ctx))');
  expect(body).toContain('const cls = machineClassOf(err);');
  expect(body).toContain('if (isLinkFailure(cls)) noteMachineLinkFailed(ctx.machineId');
  expect(body.indexOf('noteMachineLinkFailed(')).toBeLessThan(body.indexOf('throw err;'));
  expect(body.includes('assertMachineFeedAnswering(ctx')).toBe(false);

  // The poll: the link's own failure goes to markMachineQuiet, everything
  // else to markMachineFeedMissed, and the link question is asked first.
  const feed = source('remote-sessions.ts');
  const poll = feed.slice(feed.indexOf('printed = await execOn(ctx, remoteListArgs()'));
  const askedAt = poll.indexOf('if (isLinkFailure(machineClassOf(err)))');
  expect(askedAt).toBeGreaterThan(-1);
  expect(poll.indexOf('markMachineQuiet(machineId, classOfListFailure(err))')).toBeGreaterThan(askedAt);
  expect(poll.indexOf('markMachineFeedMissed(machineId, classOfListFailure(err))')).toBeGreaterThan(askedAt);

  // The spawn seam records the class beside the error it builds.
  const exec = source('exec-plane.ts');
  const classify = exec.slice(exec.indexOf('function classifyExecFailure('));
  expect(classify).toContain('const cls = classifyMachineOutput(stderr);');
  expect(classify).toContain('return noteMachineClass(');
}

const RULES: readonly [string, (mod: Liveness) => void][] = [
  ['1 the table', theTable],
  ['2 the verb matrix', theVerbMatrix],
  ['3 the classification', theClassification],
  ['4 the link failures', theLinkFailures]
];

// ---------------------------------------------------------------------------
// The shipping module
// ---------------------------------------------------------------------------

describe('the two liveness facts, over the shipping module', () => {
  for (const [name, rule] of RULES) {
    it(`rule ${name}`, () => {
      rule(shipping);
    });
  }
});

// ---------------------------------------------------------------------------
// The ablations
// ---------------------------------------------------------------------------

interface Ablation {
  readonly name: string;
  readonly from: string;
  readonly to: string;
}

/** One clause each. Every `from` must be found exactly once in liveness.ts. */
const ABLATIONS: readonly Ablation[] = [
  {
    name: 'polling no longer answers',
    from: "  'connected',\n  'polling'\n]);",
    to: "  'connected'\n]);"
  },
  {
    name: 'the feed question forgets the link',
    from: "return linkAnswering(facts) && facts.feed === 'listed';",
    to: "return facts.feed === 'listed';"
  },
  {
    name: 'the feed question accepts unknown',
    from: "return linkAnswering(facts) && facts.feed === 'listed';",
    to: "return linkAnswering(facts) && facts.feed !== 'missed';"
  },
  {
    name: 'the file tree becomes a session verb',
    from: "'machines:listTree': 'link',",
    to: "'machines:listTree': 'feed',"
  },
  {
    name: 'the lines of one session become a read verb',
    from: "'machines:readSessionLines': 'feed',",
    to: "'machines:readSessionLines': 'link',"
  },
  {
    name: 'a caller drops out of the module table',
    from: "  'remote-harvest.ts': 'feed'\n});",
    to: '});'
  },
  {
    name: 'a refused key counts as the link',
    from: "  'unreachable',\n  'refused',\n  'not-resolved'\n]);",
    to: "  'unreachable',\n  'refused',\n  'not-resolved',\n  'auth-refused'\n]);"
  },
  {
    name: 'a refused port stops counting as the link',
    from: "  'unreachable',\n  'refused',\n  'not-resolved'\n]);",
    to: "  'unreachable',\n  'not-resolved'\n]);"
  }
];

const scratch = mkdtempSync(join(tmpdir(), 'p231-liveness-'));
afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

async function loadAblated(index: number, ablation: Ablation): Promise<Liveness> {
  const text = readFileSync(LIVENESS_PATH, 'utf8');
  const hits = text.split(ablation.from).length - 1;
  expect(hits, `"${ablation.name}" finds its clause once in liveness.ts`).toBe(1);
  const edited = text.replace(ablation.from, ablation.to);
  if (ablation.from !== ablation.to) expect(edited).not.toBe(text);
  const out = ts.transpileModule(edited, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const file = join(scratch, `liveness-${String(index)}.mjs`);
  writeFileSync(file, out, 'utf8');
  return (await import(/* @vite-ignore */ pathToFileURL(file).href)) as Liveness;
}

describe('each clause ablated once goes red', () => {
  it('the copy with nothing changed stays green, so a red copy is the clause', async () => {
    // The transpile and the load are proved on the unchanged text first,
    // because a copy that fails to load would turn every rule red for the
    // wrong reason and prove nothing about the clause.
    const mod = await loadAblated(99, { name: 'unchanged', from: 'THE LINK QUESTION', to: 'THE LINK QUESTION' });
    for (const [, rule] of RULES) rule(mod);
  });

  for (const [index, ablation] of ABLATIONS.entries()) {
    it(`"${ablation.name}" turns a rule red`, async () => {
      const mod = await loadAblated(index, ablation);
      const red: string[] = [];
      for (const [name, rule] of RULES) {
        try {
          rule(mod);
        } catch {
          red.push(name);
        }
      }
      expect(red, `${ablation.name}: no rule went red`).not.toHaveLength(0);
    });
  }
});
