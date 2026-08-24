/**
 * The probe half of `npm run conformance:handback` (Phase 141).
 *
 * It prints, as JSON, everything the checker beside it needs to decide whether
 * the one press back into an agent that left its shell running is still wired
 * the way the phase promised. The checker (`conformance-handback.mjs`) decides
 * pass or fail and prints the table a person reads.
 *
 * It is a separate file rather than an inline `--eval` for the reason
 * `agents-conformance-probe.mts` gives beside it: the tables are TypeScript
 * with path aliases, and a probe that cannot resolve `@shared/*` prints
 * nothing at all.
 *
 * IT SPAWNS NOTHING. It starts no tmux server, opens no manifest, launches no
 * Electron, reads no file under the person's home and writes nothing anywhere.
 * It reads this repository's own source, and it imports four modules whose
 * every function is pure. It is safe to run on a machine with live sessions on
 * it, which matters more here than for most gates, because the feature it
 * watches types into a live session.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS GATE IS FOR
 * ---------------------------------------------------------------------------
 * Phase 141 turns on one word. The thing Tortie reacts to is a WITNESS, being a
 * specific process it watched alive in that session, and never a SHAPE, being a
 * screen or a process table that looks like a shell. That distinction is not a
 * preference. A session Tortie has just restored, sitting with its command
 * armed and unpressed, is byte for byte the same shape as a session whose agent
 * has left, so every shape rule announces that an agent left when no agent ever
 * ran. Three candidate designs died on that fact.
 *
 * A rule like that decays quietly. Nothing in a type checker stops a later
 * round adding a status member for the drop, writing the witness into the
 * manifest, or reading the screen to decide whether an agent is gone. This gate
 * is the executable half of the refusals, and it costs about a second.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT CANNOT PROVE, said here so nobody reads more into a pass
 * ---------------------------------------------------------------------------
 * It never watches a process go away, never reads a real pane and never types
 * anything anywhere. The drop latency, the false positive set and the typed
 * resume path all belong to the phase's Tier 3 verifier driving the real app
 * against a scratch tmux server. What is proven here is the pure half: that the
 * contract is one channel with one door, that the four states and the four
 * landings say the same thing in both places they are written down, that the
 * copy tells the truth, and that none of the refusals has been undone.
 *
 * ---------------------------------------------------------------------------
 * THE SEAMS
 * ---------------------------------------------------------------------------
 * The phase lands in four files owned by four people. Two sections import
 * modules that may not exist yet while the phase is being built, so each one is
 * behind a seam and reports `absent` rather than throwing. The checker then
 * SKIPS that section OUT LOUD and still reaches a verdict from the rest. It
 * never silently passes.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SESSION_STATUSES } from '../src/shared/types';
import {
  countOccurrences,
  decideArmLanding
} from '../src/main/machines/remote-arm';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The two seams. Change these lines if a later round moves either module. */
const WITNESS_SEAM = '../src/main/activity/state-machine';
const COPY_SEAM = '../src/renderer/state/resume';

/** The one channel this phase adds. */
const CHANNEL = 'sessions:resumeInPlace';

/** The one menu action this phase adds. */
const ACTION = 'resume-conversation';

/**
 * Where the drop rule lives. CLAUDE.md's own note on this phase puts it here so
 * it is testable with no tmux server, which is what that file exists for.
 */
const RULE_FILE = 'src/main/activity/state-machine.ts';

/**
 * The three manifest columns research 64 section 10.4 asked for and the
 * backlog entry refused in the same words: no change to the manifest schema
 * beyond what the conversation id already uses. The witness lives in memory,
 * and that is precisely what makes it immune to the restore shape.
 */
const REFUSED_COLUMNS = [
  'agent_witnessed_pane',
  'agent_witnessed_at',
  'agent_left_at'
];

// ---------------------------------------------------------------------------
// Reading this repository's own source
// ---------------------------------------------------------------------------

/** Every source file under a directory, tests excluded, path relative to root. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (abs: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(abs);
    } catch {
      return;
    }
    for (const entry of entries) {
      const child = join(abs, entry);
      let isDir = false;
      try {
        isDir = statSync(child).isDirectory();
      } catch {
        continue;
      }
      if (isDir) {
        if (entry === '__tests__' || entry === 'node_modules') continue;
        walk(child);
        continue;
      }
      if (!/\.(ts|tsx|mts|mjs)$/.test(entry)) continue;
      if (/\.test\.(ts|tsx)$/.test(entry)) continue;
      out.push(relative(repoRoot, child).split(sep).join('/'));
    }
  };
  walk(join(repoRoot, dir));
  return out.sort();
}

const readText = (relPath: string): string => {
  try {
    return readFileSync(join(repoRoot, relPath), 'utf8');
  } catch {
    return '';
  }
};

/** Which of these files contain a string, in sorted order. */
const filesNaming = (files: readonly string[], needle: string): string[] =>
  files.filter((f) => readText(f).includes(needle));

/**
 * A file with its comments taken out.
 *
 * Two of the refusals below are about what a file DOES, and every one of them
 * is discussed in prose somewhere. `state-machine.ts` explains in a comment
 * which sessions are worth spending `capture-pane` on, and `exec-plane.ts`
 * names the one function that may type on another machine three times in its
 * own header. A scanner that reads comments reports both as defects and
 * teaches the next person to ignore it.
 */
const codeOf = (relPath: string): string =>
  readText(relPath)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

/** Which of these files contain a string in their CODE, comments removed. */
const codeNaming = (files: readonly string[], needle: string): string[] =>
  files.filter((f) => codeOf(f).includes(needle));

/**
 * The members of an exported string-literal union, read out of source.
 *
 * The unions this gate compares are written in two files by two people, and
 * reading them from the text is the only way to notice that they have drifted
 * apart. Comments are stripped first, so a member named in prose is not
 * counted as a member.
 */
function unionMembers(relPath: string, name: string): string[] {
  const text = readText(relPath);
  const at = text.indexOf(`export type ${name} =`);
  if (at === -1) return [];
  const end = text.indexOf(';', at);
  if (end === -1) return [];
  const body = text
    .slice(at + `export type ${name} =`.length, end)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1] as string);
}

const srcMain = sourceFiles('src/main');
const srcRenderer = sourceFiles('src/renderer');
const srcShared = sourceFiles('src/shared');
const srcPreload = sourceFiles('src/preload');
const srcAll = [...srcMain, ...srcRenderer, ...srcShared, ...srcPreload].sort();

// ---------------------------------------------------------------------------
// Section 1 — the contract: one channel, one door, one word in two places
// ---------------------------------------------------------------------------

const baseline = readText('docs/audits/contract-baseline.txt');

const contract = {
  /**
   * The channel reached the flat GmuxInvokeChannelMap. This line is the real
   * check: contract-inventory resolves that TYPE with the TypeScript checker,
   * so a channel declared in a map nobody folds in never appears here.
   */
  inBaseline: baseline.includes(CHANNEL),
  declaredIn: codeNaming(srcShared, `'${CHANNEL}'`),
  exposedIn: codeNaming(srcPreload, `'${CHANNEL}'`),
  registeredIn: codeNaming(srcMain, `'${CHANNEL}'`),
  /**
   * The word boundary matters: `resumeInPlaceNote` is the renderer's sentence
   * for a landing and is not a call of the verb, and a scan without it would
   * report the copy module as a caller.
   */
  calledIn: srcRenderer.filter((f) => /\bresumeInPlace\b/.test(codeOf(f))),
  handbackField: /handback\?: SessionHandbackInfo;/.test(
    readText('src/shared/ipc/sessions.ts')
  ),
  sharedStates: unionMembers('src/shared/ipc/sessions.ts', 'SessionHandbackState'),
  sharedLandings: unionMembers('src/shared/ipc/sessions.ts', 'ResumeInPlaceLanding'),
  sharedRefusals: unionMembers('src/shared/ipc/sessions.ts', 'ResumeInPlaceRefusal'),
  /**
   * The same union as main writes it. A renderer file cannot import main, so
   * this one is written down twice on purpose, and two hand kept copies of one
   * list are exactly the thing that drifts while both halves type-check.
   */
  mainRefusals: srcMain.flatMap((f) => unionMembers(f, 'ResumeInPlaceRefusal')),
  rendererStates: unionMembers('src/renderer/state/resume.ts', 'HandbackState'),
  rendererLandings: unionMembers(
    'src/renderer/state/resume.ts',
    'ResumeInPlaceLanding'
  ),
  /**
   * The refusal tokens as the RENDERER writes them (added at integration).
   * There are three hand kept copies of this list, being the contract, main and
   * this one, and the checker requires all three to agree. The renderer's copy
   * exists because it is the file that owns the sentence for each token, and a
   * token main can answer with and the renderer has no sentence for is an empty
   * toast on a press that typed nothing.
   */
  rendererRefusals: unionMembers(
    'src/renderer/state/resume.ts',
    'ResumeInPlaceRefusal'
  ),
  /** Every landing `decideArmLanding` can actually produce, driven over a grid. */
  producedLandings: (() => {
    const seen = new Set<string>();
    for (const before of [0, 1, 2, 5]) {
      for (const after of [0, 1, 2, 3, 7]) {
        for (const readFailed of [false, true]) {
          seen.add(decideArmLanding(before, after, readFailed));
        }
      }
    }
    return [...seen].sort();
  })(),
  /**
   * The wrapped line fix, re-derived here rather than trusted. A shell wraps a
   * long command across rows and tmux does not mark those rows joined, so a
   * counter that searches for a contiguous string finds nothing.
   */
  wrapCounts: (() => {
    const command = 'claude --resume 0d9f3a11-2b44-4c8e-9a01-77c6b5e2f0d1';
    const wrapped = 'claude --resume 0d9f3a11-2b44-\n4c8e-9a01-77c6b5e2f0d1\n';
    return {
      once: countOccurrences(`~/gmux %\n${wrapped}`, command),
      twice: countOccurrences(`~/gmux %\n${wrapped}${wrapped}`, command),
      none: countOccurrences('~/gmux %\n', command)
    };
  })()
};

// ---------------------------------------------------------------------------
// Section 2 — the menu bar row
// ---------------------------------------------------------------------------

const menuText = readText('src/main/menu.ts');
const menuLines = menuText.split('\n');
const lineWith = (needle: string): number =>
  menuLines.findIndex((line) => line.includes(needle));

const menu = {
  declaredInUnion: unionMembers('src/shared/ipc/app.ts', 'MenuActionId').includes(
    ACTION
  ),
  rowCount: (menuText.match(new RegExp(`'${ACTION}'`, 'g')) ?? []).length,
  /** The row's own source line, which is what says whether it is accelerated. */
  rowLine: (menuLines.find((line) => line.includes(`'${ACTION}'`)) ?? '').trim(),
  rowAt: lineWith(`'${ACTION}'`),
  endSessionAt: lineWith("'end-session')"),
  hotkeysAt: lineWith('...agentHotkeyItems()'),
  pastSessionsAt: lineWith("'past-sessions')"),
  dispatchedIn: filesNaming(srcRenderer, `'${ACTION}'`),
  /** No chord is registered for it anywhere. */
  keymapNames: filesNaming(srcShared, ACTION).filter((f) =>
    f.includes('keymap')
  ),
  keymapResumeIds: [
    ...readText('src/shared/keymap.ts').matchAll(/id: '(session\.[a-zA-Z]+)'/g)
  ].map((m) => m[1] as string)
};

// ---------------------------------------------------------------------------
// Section 3 — the refusals: no status, no column, no shape
// ---------------------------------------------------------------------------

const handbackFiles = filesNaming(srcAll, 'handback');
const witnessFiles = filesNaming(srcAll, 'witnessPid');

const refusals = {
  sessionStatuses: [...SESSION_STATUSES],
  /**
   * Any call of `applyDetectedStatus` that is handed the drop.
   *
   * The check is the CALL and not the FILE. src/main/sessions/core.ts is the
   * orchestrator: it has set statuses since long before this phase and it also
   * holds the free accelerator that checks the witness when a session ends. A
   * scan by file would report it forever and teach the next person to ignore
   * this gate. What refusal 5 forbids is the drop deciding a status, so the
   * argument list is what gets read.
   */
  statusCallsNamingDrop: handbackFiles.flatMap((f) => {
    const code = codeOf(f);
    const found: string[] = [];
    let at = code.indexOf('applyDetectedStatus(');
    while (at !== -1) {
      const args = code.slice(at, at + 240);
      if (/handback|witness/i.test(args)) {
        found.push(`${f}: ${args.split('\n')[0]}`);
      }
      at = code.indexOf('applyDetectedStatus(', at + 1);
    }
    return found;
  }),
  /** Which files know about the drop at all, for the table. */
  handbackFiles,
  /** The manifest projection must never learn this word. */
  codecsNamesHandback: readText('src/main/manifest/codecs.ts').includes(
    'handback'
  ),
  /** The three refused columns, wherever they appear. */
  refusedColumnsInSource: REFUSED_COLUMNS.filter((column) =>
    srcAll.some((f) => readText(f).includes(column))
  ),
  refusedColumnsInBaseline: REFUSED_COLUMNS.filter((column) =>
    baseline.includes(column)
  ),
  /** A restore can never manufacture a witness, which is the governing rule. */
  restoreNamesWitness: readText('src/main/restore/restore.ts').includes(
    'witnessPid'
  ),
  /**
   * WHERE THE RULE LIVES AND WHAT IT CAN SEE.
   *
   * The drop rule belongs in the pure state machine, so it is testable with no
   * tmux server and so it CANNOT read a screen even if a later round wanted it
   * to. That is the whole design in one line: a witness is a named process, a
   * shape is a screen, and reading the screen is what killed three candidate
   * designs, because a restored session sitting armed and unpressed is byte for
   * byte the same shape as one whose agent left.
   *
   * The check is scoped to the rule's own file rather than to every file that
   * mentions a witness, because the activity loop reads screens for the excerpt
   * on every tick and always has. What matters is that the module DECIDING the
   * drop can do neither.
   */
  rule: {
    file: RULE_FILE,
    namesWitness: codeOf(RULE_FILE).includes('witnessPid'),
    readsScreen: codeOf(RULE_FILE).includes('capture-pane'),
    startsProcess: /\b(spawn|spawnSync|execFile|execFileSync|exec)\s*\(/.test(
      codeOf(RULE_FILE)
    )
  },
  witnessFiles,
  /**
   * The press must not reach the machine door. Gate 65 of
   * build/conformance-machines.mjs pins the two files that may name
   * `sendArmedResumeText`, and a third is a build failure there. This line
   * watches the near miss that belongs to THIS phase: the local press typing
   * through the door that was built to type on another computer.
   */
  handbackNamesMachineSend: codeNaming(
    [...new Set([...handbackFiles, ...witnessFiles])].sort(),
    'sendArmedResumeText'
  )
};

// ---------------------------------------------------------------------------
// Section 4 — the witness base case (seam)
// ---------------------------------------------------------------------------

interface FreshReport {
  state: 'present' | 'absent';
  specifier: string;
  keys: string[];
  witnessPid: unknown;
  witnessPpid: unknown;
  handback: unknown;
  leftAt: unknown;
}

async function witnessReport(): Promise<FreshReport> {
  try {
    const mod = (await import(WITNESS_SEAM)) as {
      freshState?: (now: number) => Record<string, unknown>;
    };
    if (typeof mod.freshState !== 'function') {
      return {
        state: 'absent',
        specifier: WITNESS_SEAM,
        keys: [],
        witnessPid: null,
        witnessPpid: null,
        handback: null,
        leftAt: null
      };
    }
    const fresh = mod.freshState(1_700_000_000_000);
    return {
      state: 'present',
      specifier: WITNESS_SEAM,
      keys: Object.keys(fresh).sort(),
      witnessPid: fresh['witnessPid'] ?? null,
      witnessPpid: fresh['witnessPpid'] ?? null,
      handback: fresh['handback'] ?? null,
      leftAt: fresh['leftAt'] ?? null
    };
  } catch {
    return {
      state: 'absent',
      specifier: WITNESS_SEAM,
      keys: [],
      witnessPid: null,
      witnessPpid: null,
      handback: null,
      leftAt: null
    };
  }
}

// ---------------------------------------------------------------------------
// Section 5 — the copy (seam)
// ---------------------------------------------------------------------------

interface CopyReport {
  state: 'present' | 'absent';
  specifier: string;
  notes: Record<string, string>;
  landings: Record<string, string>;
  /** One sentence per refusal token (added at integration). */
  refusals: Record<string, string>;
  /** What a person reads when main answers with neither half set. */
  fallback: string;
  constants: Record<string, string>;
  landedOn: string[];
}

async function copyReport(): Promise<CopyReport> {
  const empty: CopyReport = {
    state: 'absent',
    specifier: COPY_SEAM,
    notes: {},
    landings: {},
    refusals: {},
    fallback: '',
    constants: {},
    landedOn: []
  };
  try {
    const mod = (await import(COPY_SEAM)) as Record<string, unknown>;
    const note = mod['handbackNote'] as
      | ((h: { state: string; leftAt: number }) => string)
      | undefined;
    const landingNote = mod['resumeInPlaceNote'] as
      | ((l: string) => string)
      | undefined;
    const landed = mod['resumeInPlaceLanded'] as
      | ((l: string) => boolean)
      | undefined;
    const refusalNote = mod['resumeInPlaceRefusalNote'] as
      | ((r: string) => string)
      | undefined;
    const answerNote = mod['resumeInPlaceAnswerNote'] as
      | ((a: { landing: string | null; refusal?: string | null }) => string)
      | undefined;
    if (
      typeof note !== 'function' ||
      typeof landingNote !== 'function' ||
      typeof landed !== 'function' ||
      typeof refusalNote !== 'function' ||
      typeof answerNote !== 'function'
    ) {
      return empty;
    }
    const notes: Record<string, string> = {};
    for (const state of ['left', 'returning', 'unconfirmed']) {
      notes[state] = note({ state, leftAt: 0 });
    }
    notes['left-with-time'] = note({ state: 'left', leftAt: 1_700_000_000_000 });
    const landings: Record<string, string> = {};
    const landedOn: string[] = [];
    for (const landing of contract.sharedLandings) {
      landings[landing] = landingNote(landing);
      if (landed(landing)) landedOn.push(landing);
    }
    const refusals: Record<string, string> = {};
    for (const refusal of contract.sharedRefusals) {
      refusals[refusal] = refusalNote(refusal);
    }
    const fallback = answerNote({ landing: null, refusal: null });
    const constants: Record<string, string> = {};
    for (const key of [
      'RESUME_VERB',
      'RESUME_IN_PLACE_LABEL',
      'RESUME_IN_PLACE_SUBLABEL',
      'RESUME_VERB_TITLE'
    ]) {
      const value = mod[key];
      if (typeof value === 'string') constants[key] = value;
    }
    return {
      state: 'present',
      specifier: COPY_SEAM,
      notes,
      landings,
      refusals,
      fallback,
      constants,
      landedOn
    };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------

const witness = await witnessReport();
const copy = await copyReport();

process.stdout.write(
  JSON.stringify({
    channel: CHANNEL,
    action: ACTION,
    refusedColumns: REFUSED_COLUMNS,
    contract,
    menu,
    refusals,
    witness,
    copy
  })
);
