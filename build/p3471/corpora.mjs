/**
 * MEASURE:P3471 — DOES A JOIN EVER MOVE A LINK THAT OPENS TODAY? (Phase 347.1)
 *
 * Issue 40 (John Berryman's) is a path an agent printed broken over rows,
 * which opened nothing. Phase 347 joined the rows and its three reverifies
 * each found a shape where the join took the cells of a link that opened
 * today and opened another file there. Phase 347.1 ships THE GOVERNING RULE
 * (build/p3471/SPEC.md D2): a join never takes a cell from a row span the door
 * already accepts, judged over every row of the chain. This is the instrument
 * that proves the construction holds, cell by cell, over three corpora and two
 * doors, against the parent build; the per-cell comparison is in
 * `./compare.mts` and the corpora in `./generate.mts`, both deterministic and
 * committed, so the next round inherits them (D8).
 *
 *   node build/p3471/corpora.mjs --parent <rev|dir> [--head <dir>]
 *        [--corpus <names>] [--plant | --plant-j9 | --plant-abs | --plant-j11] [--out <file>]
 *   node build/p3471/corpora.mjs --self-test [--parent <rev|dir>]
 *   node build/p3471/corpora.mjs --repin
 *
 * - `--parent` names a git revision, read with `git show <rev>:<path>` and
 *   nothing else, or a checkout directory, its files read from disk. The
 *   self-test's parent is today's provider, HEAD with the join switched off
 *   (`JOIN_OFF` below), unless one is named.
 * - `--head` is a checkout directory; this one by default, its working tree.
 * - `--corpus` picks corpora, in the order named; all thirteen by default:
 *   `list`, `prose`, `captures`, his ruled round's `list-outside` and
 *   `prose-outside` (the path printed in another folder of the same length),
 *   `<each>-stale` (every layout drawn again with cells past the pane's
 *   width, its clean rows kept beside it, `./generate.mts` says how), and
 *   his absolute-only round's `prose-margin` and `listing` (an agent's
 *   breaks NARROWER than the pane, the census's two breakers at 1 to 13
 *   cells short), and its fix round's `prose-cutters` (the breakers the
 *   attack lens cut with: Python's and Rust's textwrap, a breaker that breaks
 *   before every `/`, and Ink over sentences carrying an emoji it counts as
 *   two cells where xterm draws one; since his overflow round, Python's
 *   textwrap with `break_long_words=False` too, its overflow soft-wrapped at
 *   the pane's edge). On a stale corpus every line also counts WRONG-FILE OPENS,
 *   the joins HEAD offers that open a file and that it does not offer on the
 *   clean rows (a file the screen does not name), and a PASS needs 0 of them
 *   too.
 * - HIS ABSOLUTE-ONLY ROUND (2026-10-14, "Join absolute paths only", SPEC
 *   §7.7 and D17). Every corpus that prints a path in another folder
 *   (`list-outside`, `prose-outside`, their stale ones, `prose-margin`,
 *   `listing`, `prose-cutters`) is also read in the `twin` regime, this repository's tree
 *   under the project and under the other folder, the census's setup, so it
 *   reports 8 lines rather than 6. Every line of a corpus whose layouts
 *   carry what they printed counts PRINTED-PATH WRONG-FILE OPENS, a join
 *   that opens a path the screen did not print (a relative tail of a path in
 *   another folder opening the project's copy is the reverify's class), and
 *   a PASS needs 0 of them on every `repo` and `twin` line; `named` and
 *   `named-dirs` print theirs and are not graded, because they make every
 *   asked spelling exist. And each such corpus prints a door-free CUT
 *   REPORT, the judged build's own `joinedPathAt` on every row, a join whose
 *   target is not a printed spelling counted by kind: a PASS needs 0
 *   `relative` cut layouts on every corpus and 0 `top` and 0
 *   `bottom-mid-name` on `prose`, `prose-outside`, `prose-stale`,
 *   `prose-outside-stale`, `prose-margin`, `listing` and `prose-cutters` (a list layout's
 *   lower item can begin with a marker the gutter does not strip, `1.` under
 *   a folder whose child is `18/`, which reads as a mid-name prefix and names
 *   no path, so `list` and `list-outside` are reported and not graded).
 * - `--plant` judges HEAD with the governing rule removed in memory (rule
 *   18's "G off" ablation) and turns the verdict over: it passes only when
 *   `list` and `prose`, of those asked, each read more than 0 regression
 *   cells under the `named` regime on BOTH doors. That is the proof the
 *   instrument can see the defect it exists for.
 * - `--plant-j9` (his ruled round) judges HEAD with `joinedPathAt`'s J9
 *   taken out in memory, so a chain is CUT where it cannot read, as the fix
 *   round cut it, and turns the verdict over. Re-judged in his absolute-only
 *   round: J10 now refuses every relative chain whatever J9 says, so J9's
 *   cut leaves no relative chain to open the project's file, and its old
 *   verdict (wrong-file opens on every stale corpus, and on
 *   `prose-outside-stale` files `repo`) read 0 on `captures-stale` and on
 *   that line. What the cut still opens is ABSOLUTE: a chain whose top piece
 *   starts `/` at the head of its row below a row that reads past the width
 *   (`/tortie/…` below a stale `/q`). So it passes only when `prose-stale`
 *   and `prose-outside-stale` each read stale wrong-file opens under `named`
 *   on both doors, and refuses unless both are asked. Since the fix round of
 *   his absolute-only round J11's top half refuses such a chain too (a lone
 *   top piece below a row reaching past the widest row), so the plant takes
 *   that half out beside J9's cut (`PLANT_CUT`).
 * - `--plant-abs` (his absolute-only round) judges HEAD with J10, his
 *   ruling, taken out in memory (and, since its fix round, J11 beside it,
 *   which refuses those relative chains too), and turns the verdict over: it passes only
 *   when the cut report reads `relative` cuts on `prose-margin` and on
 *   `listing`, and `prose-margin` reads printed-path wrong-file opens on its
 *   `repo` and `twin` lines of the files door (a relative tail of a path
 *   printed in `/q/tortie/` opening the project's copy). It refuses unless
 *   both corpora are asked.
 * - `--plant-j11` (his absolute-only round) judges HEAD with both halves of
 *   J11 taken out in memory, and turns the verdict over: it passes only when
 *   the cut report reads `top` and `bottom-mid-name` cuts on `prose-margin`,
 *   and, since its fix round, on `prose-cutters` too when that is asked. It
 *   refuses unless `prose-margin` is asked.
 * - `--out` writes the whole report as JSON, and refuses a path inside the
 *   checkout or inside `--head`.
 * - `--repin` prints each corpus's count and sha256 for a deliberate change
 *   to `./generate.mts`'s pins, and writes nothing.
 *
 * EXIT 0 when every corpus × door × regime reads 0 regression cells, every
 * stale line 0 wrong-file opens, every `repo` and `twin` line 0 printed-path
 * wrong-file opens, and every cut report meets its requirement; 1 when any
 * does not, each failing line or corpus named with its first examples; 2 when
 * it cannot run: no
 * `--parent` for a measurement, an unknown flag, a moved
 * `fixtures/repo-paths.txt`, a staging that left an import it could not see,
 * the parent's `src/shared/path-doors.ts` not HEAD's (both builds are judged
 * through HEAD's door), a plant that found nothing to edit, or a tsx process
 * that did not finish. The self-test exits 0 when S1 to S8 pass and the
 * twelve counts equal the spec's, else 1; it also stages HEAD with only the
 * editor door's answer counted as taken (the fix round's second plant), which
 * S4's image and Mac shapes must catch, and the J10 and J11 plants, which
 * S7 must see cut.
 *
 * WHAT IT STARTS, AND WHAT IT TOUCHES. `spawnSync` only, and only two
 * programs: the repository's pinned tsx (`tsxCli()`, `--no-cache`), one
 * process per corpus or one for the self-test, and `git show`, read only,
 * with no global or system configuration read. No Electron, no tmux, no ssh,
 * no shell, no agent, no new `GMUX_*` name, and nothing read under a home:
 * both children run with HOME set to the staging directory. Its one write is
 * that staging directory, a `mkdtemp` under the system temporary directory
 * holding each build's two provider files (staged by `./stage.mjs`, the
 * gate's), removed in a `finally`; plus `--out`'s file when asked.
 *
 * MEASURED BUDGET, his ruled round (2026-10-14, load averages 15 to 170):
 * all ten corpora 302.7 s (list 11.2, prose 26.2, captures 16.1,
 * list-outside 5.8, prose-outside 14.5, list-stale 16.9, prose-stale 63.5,
 * captures-stale 87.2, list-outside-stale 12.2, prose-outside-stale 49.1),
 * `--self-test` 19.1 to 21.1 s, `--plant` over all ten 320.4 s, `--plant-j9`
 * over the five stale corpora 242.7 s.
 *
 * MEASURED BUDGET, his absolute-only round (2026-10-14; load averages 4 to 6
 * for the measurement, 5 to 135 while the four plants ran at once beside
 * another phase's Simulator): all twelve corpora 361.0 s (list 10.4, prose
 * 22.9, captures 16.2, list-outside 7.7, prose-outside 20.7, list-stale 21.2,
 * prose-stale 70.8, captures-stale 87.0, list-outside-stale 12.6,
 * prose-outside-stale 57.3, prose-margin 26.2, listing 8.0), `--self-test`
 * 18.3 s, `--plant --corpus list,prose` 48.2 s, `--plant-j9` over
 * `prose-stale` and `prose-outside-stale` 165.0 s, `--plant-abs` over
 * `prose-margin` and `listing` 48.9 s, `--plant-j11` over `prose-margin`
 * 30.5 s. The spec's ceiling is 15 minutes.
 *
 * MEASURED BUDGET, its fix round (2026-10-15, another phase's Simulator and
 * load generators on the machine, load averages 20 to 260, then 300 to
 * 1,000): all thirteen corpora 643.6 s (prose-cutters 59.9) and 1,348.0 s,
 * `--self-test` 25.5 to 30.2 s, `--plant --corpus list,prose` 37.8 s,
 * `--plant-j9` 133.1 s, `--plant-abs` 41.7 s, `--plant-j11 --corpus
 * prose-margin,prose-cutters` 82.8 s. At a load average near 5 the thirteen
 * should take about seven minutes, inside the spec's ceiling.
 *
 * MEASURED BUDGET, on 2026-10-13 on the operator's Mac with two other phases
 * running (load averages in brackets): `--self-test` 1.9 s [60] and 2.2 to
 * 5.5 s [150 to 950]; `--parent 5f5efba2` over all three corpora 65.1 s wall,
 * 44 s of CPU [20 to 290] (list 11.6 s, prose 34.5 s, captures 19.0 s), and
 * 56.7 s [440 to 960]; `--plant` over all three 56.0 s; `--corpus list` alone
 * 11.6 s [60] and 50.6 s [775]. The spec's ceiling is 15 minutes.
 *
 * WHAT IT READ ON THE BUILD (`5f5efba2` against HEAD with the governing rule):
 * 0 regression cells on all 16 lines, and a gain of 120,706 cells in 2,562
 * list layouts on the files-only door over this repository's own tree. With
 * the rule planted out, 121,395 regression cells under `named` on both doors
 * in list and 224,289 in prose; Phase 347's kept work, judged as `--head`,
 * reads the same and 86 cells in two real Codex captures besides.
 *
 * AND IN HIS RULED ROUND (2026-10-14): 0 regression cells on all 56 lines
 * and 0 wrong-file opens on the 28 stale ones, the original 16 lines' gain
 * unchanged at 5,267,116. With `joinedPathAt`'s J9 planted out, 105
 * wrong-file opens on `prose-outside-stale` over this repository's tree,
 * every one a relative join of the rows below a leftover opening the
 * project's own file, and wrong-file opens on every stale corpus.
 *
 * AND IN HIS ABSOLUTE-ONLY ROUND (2026-10-14, J10 and J11): 0 regression
 * cells on all 80 lines, 0 wrong-file opens on the 32 stale ones, 0
 * printed-path wrong-file opens on the 32 `repo` and `twin` lines, and the
 * cut report met on all 10 corpora that carry what they printed; the ten
 * corpora's 56 lines outside the twin regime gain 6,855,097 cells (8,260,997
 * before his ruling: 1,401,469 of the difference are J10's relative joins
 * and 4,431 J11's), 8,921,504 over all 80. With J10 planted out, 442 and 22 relative cut layouts on `prose-margin`
 * and `listing` and 50 printed-path wrong-file opens on each of
 * `prose-margin`'s files `repo` and `twin` lines; with J11 planted out, 46
 * top and 232 mid-name cut layouts on `prose-margin`; with J9's cut, 180 and
 * 166 wrong-file opens a line under `named`; with the governing rule out,
 * 99,007 and 187,966 regression cells under `named`.
 *
 * AND IN ITS FIX ROUND (2026-10-15, J11 widened to any breaker): 0
 * regression cells on all 88 lines, 0 wrong-file opens on the 32 stale ones,
 * 0 printed-path wrong-file opens on the 36 `repo` and `twin` lines, and the
 * cut report met on all 11 corpora that carry what they printed, with no
 * `top`, mid-name, at-`/` or at-`-` cut left on any of them (only the glued
 * `other` of SPEC L8: 515 list, 260 prose, 20 listing, 32 prose-cutters);
 * the ten corpora's 56 lines outside the twin regime gain 6,721,065 cells
 * (6,855,097 the round before), 9,683,454 over all 88. The round before's
 * J11, judged as `--head`, reads 519 top and 12 mid-name cut layouts on
 * `prose-cutters`. With J10 and J11 planted out, 648 and 36 relative cut
 * layouts and 57 printed-path wrong-file opens on each of `prose-margin`'s
 * files `repo` and `twin` lines; with J11 out, 46 top and 232 mid-name on
 * `prose-margin` and 584 and 98 on `prose-cutters`; with J9's cut and J11's
 * top half, wrong-file opens under `named` on both doors of both stale prose
 * corpora; with the governing rule out, regression cells under `named`.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from '../ts-runner.mjs';
import { stageProvider, writeStage } from './stage.mjs';

const TAG = '[p3471]';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const COMPARE = join(HERE, 'compare.mts');

const SPANS = 'src/shared/path-spans.ts';
const LINKS = 'src/renderer/terminal/path-links.ts';
const DOORS = 'src/shared/path-doors.ts';

/**
 * TODAY, FOR THE SELF-TEST: HEAD with the join switched off in memory, the
 * reading rule 17's probe and the kept tests call today's links. The hovered
 * row's own derivation is the parent's byte for byte (rule 13 holds it), so
 * with no join the provider draws exactly the parent's links; measured on
 * 2026-10-13 against `5f5efba2` itself over all three corpora, both doors and
 * every regime: 0 regression cells and 0 gain. It is the default so the
 * self-test starts only the pinned tsx and keeps running after a later round
 * changes `src/shared/path-doors.ts`, which would make a pinned revision
 * refuse. `--parent` names a real one instead.
 */
const JOIN_OFF = { from: 'joinedPathAt(drawnRow, y, buffer.length - 1, this.term.cols)', to: 'null' };

/** Rule 18's "G off" ablation, the planted regression (SPEC §6.2). */
const PLANT = { from: '&& joinAnswer.door !== null && !taken', to: '&& joinAnswer.door !== null' };

/**
 * HIS RULED ROUND'S TWO PLANTS, on `src/shared/path-spans.ts`. `PLANT_CUT`
 * takes out `joinedPathAt`'s J9, which refuses a chain WHOLE when a boundary
 * it stops at reads a cell past the pane's width, and so cuts the chain
 * there as the fix round did; `PLANT_OFF` takes `joinBoundary`'s half out
 * too, the build lens B pressed. The self-test's S6 needs each to open a
 * file the screen does not name on its own stale shapes, and `--plant-j9`
 * judges `PLANT_CUT` over the stale corpora, where it must too.
 */
const PLANT_CUT = [
  { from: '  if (pastWidth(top - 1) || pastWidth(bottom)) return null;\n', to: '' },
  { from: '    if (reach === undefined || reach > width) return null;\n', to: '' },
  // Since the fix round of his absolute-only round J11's top half refuses a
  // lone top piece below ANY row reaching the widest row the chain draws, a
  // row past the pane's width among them, so J9's cut is planted with that
  // half out beside it, or the plant would leave the stale corpora as HEAD
  // reads them and prove nothing about the instrument.
  { from: '    aboveTop !== null &&\n', to: '    false &&\n' }
];
const PLANT_OFF = [...PLANT_CUT, { from: '  if (upperEnd > width) return false;\n', to: '' }];

/**
 * HIS ABSOLUTE-ONLY ROUND'S TWO PLANTS, on `src/shared/path-spans.ts`, each
 * anchored on the line build/p3471/SPEC.md §4.6 pins byte for byte. `PLANT_ABS`
 * takes out J10, his ruling, so a relative chain is offered again;
 * `PLANT_J11` takes out both halves of J11, so a chain a breaker that cuts
 * anywhere left at either end is offered again. `--plant-abs` and
 * `--plant-j11` judge them over the margin corpora, and S7 reads them on the
 * rows that decide.
 */
const PLANT_J11 = [
  { from: '    aboveTop !== null &&\n', to: '    false &&\n' },
  { from: '    firstBelow !== undefined &&\n', to: '    false &&\n' }
];
/**
 * Since the fix round of his absolute-only round J11 refuses every relative
 * chain the margin corpora draw too (each sits below a row the walk stopped
 * at after a `/` or a `-`, where a breaker may have cut), so J10 planted out
 * alone leaves them as HEAD reads them and proves nothing about the
 * instrument; J11 goes out beside it.
 */
const PLANT_ABS = [{ from: "  if (!target.startsWith('/') && !target.startsWith('~/')) return null;\n", to: '' }, ...PLANT_J11];

/** `text` with every edit made, each anchor found exactly once, or a refusal naming the one that was not. */
function planted(text, edits, what) {
  let out = text;
  for (const e of edits) {
    const found = out.split(e.from).length - 1;
    if (found !== 1) {
      throw new Refusal(`${what} found ${String(found)} places to edit in HEAD's ${SPANS}, and it must find exactly one: ${JSON.stringify(e.from)}`);
    }
    out = out.replace(e.from, e.to);
  }
  return out;
}

/**
 * The fix round's second plant, for the self-test alone: only the EDITOR
 * door's answer, or a missing one, counts as taken. Lens A's ablation A1b; it
 * read exactly HEAD's gain over every corpus, so S4's image and Mac shapes are
 * what see it.
 */
const PLANT_EDITOR = {
  from: 'const taken = under.some((_, k) => answers[underAt + k]?.door !== null);',
  to: "const taken = under.some((_, k) => answers[underAt + k] === undefined || answers[underAt + k]?.door === 'editor');"
};

const CORPORA = [
  'list',
  'prose',
  'captures',
  'list-outside',
  'prose-outside',
  'list-stale',
  'prose-stale',
  'captures-stale',
  'list-outside-stale',
  'prose-outside-stale',
  'prose-margin',
  'listing',
  'prose-cutters'
];

/**
 * The corpora whose cut report must read 0 `top` and 0 `bottom-mid-name` cut
 * layouts beside 0 `relative` (SPEC §7.7). `list` and `list-outside` are
 * reported and not graded on those two: a lower item can begin with a marker
 * the gutter does not strip, which reads as a mid-name prefix and names no path.
 */
const CUT_STRICT = new Set([
  'prose',
  'prose-outside',
  'prose-stale',
  'prose-outside-stale',
  'prose-margin',
  'listing',
  'prose-cutters'
]);

/** The regimes whose printed-path wrong-file opens are graded (SPEC §7.7). */
const PRINTED_GRADED = new Set(['repo', 'twin']);

/**
 * The lines each corpus reports: its regimes times the two doors, the `twin`
 * regime on every corpus that prints a path in another folder (his
 * absolute-only round). A PASS needs every one, each over every layout.
 */
const LINES_PER_CORPUS = {
  list: 6,
  prose: 6,
  captures: 4,
  'list-outside': 8,
  'prose-outside': 8,
  'list-stale': 6,
  'prose-stale': 6,
  'captures-stale': 4,
  'list-outside-stale': 8,
  'prose-outside-stale': 8,
  'prose-margin': 8,
  listing: 8,
  'prose-cutters': 8
};

/**
 * The counts build/p3471/SPEC.md derived independently of the generators:
 * §7.2's three, and his ruled round's seven (§7.2a), the outside and stale
 * corpora counted again by a Python reading of the same definitions, the
 * three inside stale ones also equal to the reverify's own stale tool; and
 * his absolute-only round's two (§7.2b), generated twice and by a second
 * spelling of the census's breaker to the same sha256; and its fix round's
 * `prose-cutters`, generated a second time with Python's own textwrap, a
 * first fit written in Python and the real wrap-ansi, to the same count and
 * sha256. Its reverify's `--` path (2026-10-15) moved `prose-cutters` from
 * 69,008 to 72,680, generated twice to one sha256, and his overflow round
 * (the same day) from 72,680 to 75,230, Python's textwrap with
 * `break_long_words=False` appended, generated twice to one sha256 and its
 * breaker equal to Python's own on every input.
 */
const SPEC_COUNTS = {
  list: 21_444,
  prose: 45_360,
  captures: 5_020,
  'list-outside': 12_492,
  'prose-outside': 30_240,
  'list-stale': 36_608,
  'prose-stale': 80_642,
  'captures-stale': 7_641,
  'list-outside-stale': 21_085,
  'prose-outside-stale': 54_942,
  'prose-margin': 40_185,
  listing: 5_798,
  'prose-cutters': 75_230
};

const say = (line) => {
  console.log(`${TAG} ${line}`);
};
const n = (x) => x.toLocaleString('en-US');

/** A sentence that ends the run with exit 2. */
class Refusal extends Error {}

function parseArgs(argv) {
  const out = {
    selfTest: false, plant: false, plantJ9: false, plantAbs: false, plantJ11: false, repin: false,
    parent: undefined, head: undefined, corpus: undefined, out: undefined
  };
  const valued = { '--parent': 'parent', '--head': 'head', '--corpus': 'corpus', '--out': 'out' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--') continue;
    if (a === '--self-test') out.selfTest = true;
    else if (a === '--plant') out.plant = true;
    else if (a === '--plant-j9') out.plantJ9 = true;
    else if (a === '--plant-abs') out.plantAbs = true;
    else if (a === '--plant-j11') out.plantJ11 = true;
    else if (a === '--repin') out.repin = true;
    else if (Object.hasOwn(valued, a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Refusal(`${a} needs a value`);
      out[valued[a]] = v;
      i += 1;
    } else throw new Refusal(`unknown argument ${a}`);
  }
  return out;
}

/** The environment both children run in: no home of a person's, no history. */
function childEnv(home) {
  const env = { ...process.env, HOME: home, ZDOTDIR: home, HISTFILE: '/dev/null' };
  delete env.TERM_SESSION_ID;
  return env;
}

/** `git show <rev>:<path>`, read only, with no global or system configuration read. */
function gitShow(rev, path, home) {
  const r = spawnSync('git', ['-C', ROOT, 'show', `${rev}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...childEnv(home), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat' }
  });
  if (r.status !== 0) {
    throw new Refusal(`git show ${rev}:${path} exited ${String(r.status)}: ${(r.stderr || '').trim().slice(0, 300)}`);
  }
  return r.stdout;
}

/** A build's three files, from a checkout directory or a revision. */
function readBuild(where, home) {
  if (existsSync(where) && statSync(where).isDirectory()) {
    const read = (p) => {
      const file = join(where, p);
      if (!existsSync(file)) throw new Refusal(`${where} holds no ${p}`);
      return readFileSync(file, 'utf8');
    };
    return { label: resolve(where), spans: read(SPANS), links: read(LINKS), doors: read(DOORS), doorsPath: join(resolve(where), DOORS) };
  }
  return { label: where, spans: gitShow(where, SPANS, home), links: gitShow(where, LINKS, home), doors: gitShow(where, DOORS, home), doorsPath: null };
}

/** True when `target`, by its real path, is `dir` or inside it. */
function inside(target, dir) {
  let probe = resolve(target);
  while (!existsSync(probe)) {
    const up = dirname(probe);
    if (up === probe) break;
    probe = up;
  }
  const real = join(realpathSync(probe), relative(probe, resolve(target)));
  const base = realpathSync(dir);
  const rel = relative(base, real);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/** Stage one build's provider; a runtime import the stage cannot see refuses. */
function stage(dir, name, build, doorsPath, linksText) {
  const links = stageProvider(linksText, doorsPath);
  const spans = stageProvider(build.spans, doorsPath);
  const loose = [...links.loose, ...spans.loose];
  if (loose.length > 0) {
    throw new Refusal(`the ${name} provider has a runtime import the stage cannot see: ${loose.join('; ')}`);
  }
  writeStage(join(dir, name), { spans: build.spans, links: links.text });
}

/** One tsx process; its last line is one JSON object. */
function runCompare(args, home) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [tsxCli(), '--no-cache', '--tsconfig', 'tsconfig.node.json', COMPARE, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    timeout: 60 * 60 * 1000,
    env: childEnv(home)
  });
  const ms = Date.now() - started;
  const last = (r.stdout || '').trim().split('\n').pop() ?? '';
  let result = null;
  try {
    result = JSON.parse(last);
  } catch {
    result = null;
  }
  if (result !== null && typeof result.refused === 'string') throw new Refusal(result.refused);
  if (result === null || (r.status !== 0 && r.status !== 1)) {
    throw new Refusal(
      `compare.mts ${args.join(' ')} did not finish (exit ${String(r.status)}${r.signal ? `, ${r.signal}` : ''}): ${(r.stderr || r.stdout || '').trim().slice(-800)}`
    );
  }
  return { result, status: r.status, ms };
}

function printLines(lines, cuts) {
  const judged = lines.some((l) => l.wrongJudged);
  const printed = lines.some((l) => l.printedJudged);
  say(
    `  ${'door'.padEnd(7)} ${'regime'.padEnd(11)} ${'layouts'.padStart(8)} ${'cells'.padStart(13)} ${'regression cells (layouts)'.padStart(28)} ${'gain cells (layouts)'.padStart(24)}` +
      (judged ? ` ${'wrong-file opens (layouts)'.padStart(28)}` : '') +
      (printed ? ` ${'printed-path wrong opens (layouts)'.padStart(36)}` : '')
  );
  for (const l of lines) {
    say(
      `  ${l.door.padEnd(7)} ${l.regime.padEnd(11)} ${n(l.layouts).padStart(8)} ${n(l.cells).padStart(13)} ` +
        `${`${n(l.regressCells)} (${n(l.regressLayouts)})`.padStart(28)} ${`${n(l.gainCells)} (${n(l.gainLayouts)})`.padStart(24)}` +
        (judged ? ` ${`${n(l.wrongOpens)} (${n(l.wrongLayouts)})`.padStart(28)}` : '') +
        (printed
          ? ` ${`${n(l.printedWrong)} (${n(l.printedWrongLayouts)})${PRINTED_GRADED.has(l.regime) ? '' : ' not graded'}`.padStart(36)}`
          : '')
    );
  }
  if (cuts !== undefined && cuts.judged > 0) {
    say(
      `  cut report (door-free, ${n(cuts.judged)} layouts that carry what they printed, ${n(cuts.rightLayouts)} joining a printed path): ` +
        Object.entries(cuts.layouts).map(([k, v]) => `${k} ${n(v)}`).join(', ') + ' cut layouts'
    );
    for (const e of cuts.examples) {
      say(`  CUT ${e.kind}: ${e.shape} at ${String(e.width)} columns, row ${String(e.row + 1)} joins ${e.target}; printed ${JSON.stringify(e.printed)}; rows ${JSON.stringify(e.rows)}`);
    }
  }
  for (const l of lines) {
    for (const e of l.examples) {
      say(
        `  REGRESSES ${l.corpus} ${l.door} ${l.regime}: ${e.shape} at ${String(e.width)} columns, row ${String(e.cell.y)} cell ${String(e.cell.x)}: ` +
          `the parent opens ${e.parent}, HEAD ${e.head === null ? 'no link' : e.head}; rows ${JSON.stringify(e.rows)}`
      );
    }
    for (const e of l.wrongExamples) {
      say(
        `  OPENS A FILE THE SCREEN DOES NOT NAME ${l.corpus} ${l.door} ${l.regime}: ${e.shape} at ${String(e.width)} columns, ` +
          `the join (${String(e.join.range.start.x)},${String(e.join.range.start.y)})-(${String(e.join.range.end.x)},${String(e.join.range.end.y)}) opens ${e.join.opens}; ` +
          `rows ${JSON.stringify(e.rows)}, clean ${JSON.stringify(e.clean)}`
      );
    }
    for (const e of l.printedExamples ?? []) {
      say(
        `  OPENS A PATH THE SCREEN DID NOT PRINT ${l.corpus} ${l.door} ${l.regime}${PRINTED_GRADED.has(l.regime) ? '' : ' (not graded)'}: ${e.shape} at ${String(e.width)} columns, ` +
          `the join (${String(e.join.range.start.x)},${String(e.join.range.start.y)})-(${String(e.join.range.end.x)},${String(e.join.range.end.y)}) opens ${e.join.opens}; ` +
          `printed ${JSON.stringify(e.printed)}; rows ${JSON.stringify(e.rows)}`
      );
    }
  }
}

/** The cut report's requirement (SPEC §7.7), as sentences naming each corpus that misses it. */
function cutFailures(results) {
  const out = [];
  for (const r of results) {
    const c = r.cuts;
    if (c === undefined || c.judged === 0) continue;
    if (c.layouts.relative > 0) out.push(`${r.corpus} ${n(c.layouts.relative)} relative cut layouts`);
    if (CUT_STRICT.has(r.corpus)) {
      if (c.layouts.top > 0) out.push(`${r.corpus} ${n(c.layouts.top)} top cut layouts`);
      if (c.layouts['bottom-mid-name'] > 0) out.push(`${r.corpus} ${n(c.layouts['bottom-mid-name'])} bottom-mid-name cut layouts`);
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'p3471-corpora-')));
  try {
    if (args.repin) {
      const { result } = runCompare(['--repin'], scratch);
      say('the pins, for build/p3471/generate.mts PINS (nothing written):');
      for (const [name, pin] of Object.entries(result.repin)) {
        say(`  ${name}: { count: ${String(pin.count)}, sha256: '${pin.sha256}' }`);
      }
      return 0;
    }
    if (args.parent === undefined && !args.selfTest) {
      throw new Refusal('--parent <rev|dir> is required: the measurement compares HEAD with a parent build, and there is no default');
    }
    const corpora = args.corpus === undefined ? CORPORA : args.corpus.split(',').map((c) => c.trim()).filter((c) => c.length > 0);
    for (const c of corpora) if (!CORPORA.includes(c)) throw new Refusal(`--corpus ${c} is not one of ${CORPORA.join(', ')}`);
    if (args.plant && !args.selfTest && !corpora.includes('list') && !corpora.includes('prose')) {
      throw new Refusal('--plant is judged on list and prose, and neither was asked');
    }
    if ([args.plant, args.plantJ9, args.plantAbs, args.plantJ11].filter(Boolean).length > 1) {
      throw new Refusal('--plant, --plant-j9, --plant-abs and --plant-j11 are separate runs; ask for one');
    }
    if (args.selfTest && (args.plant || args.plantJ9 || args.plantAbs || args.plantJ11)) {
      throw new Refusal('--self-test stages every plant itself; ask for it alone');
    }
    if (args.plantJ9 && !(corpora.includes('prose-stale') && corpora.includes('prose-outside-stale'))) {
      throw new Refusal('--plant-j9 is judged on prose-stale and prose-outside-stale, and both must be asked');
    }
    if (args.plantAbs && !(corpora.includes('prose-margin') && corpora.includes('listing'))) {
      throw new Refusal('--plant-abs is judged on prose-margin and listing, and both must be asked');
    }
    if (args.plantJ11 && !corpora.includes('prose-margin')) {
      throw new Refusal('--plant-j11 is judged on prose-margin, and it was not asked');
    }

    const headAt = args.head ?? ROOT;
    if (!existsSync(headAt) || !statSync(headAt).isDirectory()) throw new Refusal(`--head ${headAt} is not a directory`);
    if (args.out !== undefined && (inside(args.out, ROOT) || inside(args.out, headAt))) {
      throw new Refusal(`--out ${args.out} is inside the checkout; write the report outside it`);
    }
    const head = readBuild(headAt, scratch);
    let parent;
    if (args.parent !== undefined) parent = readBuild(args.parent, scratch);
    else {
      const anchors = head.links.split(JOIN_OFF.from).length - 1;
      if (anchors !== 1) {
        throw new Refusal(`the self-test's today found ${String(anchors)} places to switch the join off in HEAD's ${LINKS}, and it must find exactly one: ${JOIN_OFF.from}`);
      }
      parent = { ...head, label: 'today (HEAD with the join switched off)', links: head.links.replace(JOIN_OFF.from, JOIN_OFF.to) };
    }
    if (parent.doors !== head.doors) {
      throw new Refusal(
        `the parent's ${DOORS} is not HEAD's, and both builds are judged through HEAD's door; this phase does not change the door`
      );
    }
    const doorsPath = head.doorsPath;
    const plantCount = head.links.split(PLANT.from).length - 1;
    const needPlant = args.plant || args.selfTest;
    if (needPlant && plantCount !== 1) {
      throw new Refusal(`the plant found ${String(plantCount)} places to edit in HEAD's ${LINKS}, and it must find exactly one: ${PLANT.from}`);
    }
    stage(scratch, 'parent', parent, doorsPath, parent.links);
    stage(scratch, 'head', head, doorsPath, head.links);
    if (needPlant) stage(scratch, 'plant', head, doorsPath, head.links.replace(PLANT.from, PLANT.to));
    if (args.selfTest || args.plantJ9) {
      stage(scratch, 'plant-cut', { ...head, spans: planted(head.spans, PLANT_CUT, 'the J9 cut plant') }, doorsPath, head.links);
    }
    if (args.selfTest || args.plantAbs) {
      stage(scratch, 'plant-abs', { ...head, spans: planted(head.spans, PLANT_ABS, 'the J10 plant') }, doorsPath, head.links);
    }
    if (args.selfTest || args.plantJ11) {
      stage(scratch, 'plant-j11', { ...head, spans: planted(head.spans, PLANT_J11, 'the J11 plant') }, doorsPath, head.links);
    }
    if (args.selfTest) {
      const editorCount = head.links.split(PLANT_EDITOR.from).length - 1;
      if (editorCount !== 1) {
        throw new Refusal(`the editor-door plant found ${String(editorCount)} places to edit in HEAD's ${LINKS}, and it must find exactly one: ${PLANT_EDITOR.from}`);
      }
      stage(scratch, 'plant-editor', head, doorsPath, head.links.replace(PLANT_EDITOR.from, PLANT_EDITOR.to));
      stage(scratch, 'plant-off', { ...head, spans: planted(head.spans, PLANT_OFF, 'the J9 off plant') }, doorsPath, head.links);
    }
    const common = ['--stage', join(scratch), '--doors', doorsPath];

    if (args.selfTest) {
      say(`self-test: the parent ${parent.label}, HEAD ${head.label}, and HEAD with the governing rule removed`);
      const { result, ms } = runCompare([...common, '--self-test'], scratch);
      let ok = true;
      for (const c of result.selfTest) {
        say(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.id}: ${c.detail}`);
        if (!c.pass) ok = false;
      }
      for (const [name, count] of Object.entries(SPEC_COUNTS)) {
        const got = result.counts[name];
        if (got !== count) {
          ok = false;
          say(`  FAIL ${name} generates ${String(got)} layouts, and build/p3471/SPEC.md §7.2 to §7.2b derived ${n(count)}`);
        }
      }
      say(`counts: ${Object.keys(SPEC_COUNTS).map((name) => `${name} ${n(result.counts[name])}`).join(', ')} (§7.2 to §7.2b: ${Object.values(SPEC_COUNTS).map(n).join(', ')})`);
      say(`${ok ? 'PASS' : 'FAIL'}: ${String(result.selfTest.filter((c) => c.pass).length)} of ${String(result.selfTest.length)} checks, ${(ms / 1000).toFixed(1)} s`);
      return ok ? 0 : 1;
    }

    say(
      `the parent ${parent.label}, HEAD ${head.label}${args.plant ? ' WITH THE GOVERNING RULE REMOVED (--plant)' : ''}` +
        `${args.plantJ9 ? " WITH joinedPathAt'S J9 REMOVED, SO A CHAIN IS CUT WHERE IT CANNOT READ (--plant-j9)" : ''}` +
        `${args.plantAbs ? ' WITH J10, HIS RULING, REMOVED, SO A RELATIVE CHAIN IS OFFERED (--plant-abs)' : ''}` +
        `${args.plantJ11 ? ' WITH J11 REMOVED, SO A CHAIN A BREAKER CUT ANYWHERE IS OFFERED (--plant-j11)' : ''}; corpora ${corpora.join(', ')}`
    );
    const started = Date.now();
    const results = [];
    for (const corpus of corpora) {
      const flags = [
        ...(args.plant ? ['--plant'] : []),
        ...(args.plantJ9 ? ['--plant-j9'] : []),
        ...(args.plantAbs ? ['--plant-abs'] : []),
        ...(args.plantJ11 ? ['--plant-j11'] : [])
      ];
      const { result, ms } = runCompare([...common, '--corpus', corpus, ...flags], scratch);
      const short = result.lines.filter((l) => l.layouts !== result.layouts);
      if (result.lines.length !== LINES_PER_CORPUS[corpus] || short.length > 0) {
        throw new Refusal(
          `${corpus} reported ${String(result.lines.length)} lines (want ${String(LINES_PER_CORPUS[corpus])}), ${String(short.length)} of them over fewer than its ${n(result.layouts)} layouts, so 0 regression cells there would be a pass over what was never judged`
        );
      }
      results.push({ ...result, wallMs: ms });
      say(`${corpus}: ${n(result.layouts)} layouts, ${(ms / 1000).toFixed(1)} s`);
      for (const moved of result.pinsMoved) say(`  PIN MOVED ${moved}`);
      printLines(result.lines, result.cuts);
      const dropped = result.lines.reduce((s, l) => s + l.removedParent + l.removedHead, 0);
      say(
        dropped === 0
          ? "  xterm's removal dropped no link on any line, so a row's first hover and every later one resolve each cell alike"
          : `  xterm's removal dropped ${n(dropped)} links: a row's FIRST hover picks from its reply before the removal (Linkifier asks _checkLinkProviderResult first), later ones from what it kept, and a current link stays while the mouse is inside it; a cell regresses when any (parent, HEAD) pair one mouse reaches moves it`
      );
    }
    const all = results.flatMap((r) => r.lines);
    let code;
    let verdict;
    if (args.plant) {
      const missed = [];
      for (const r of results.filter((x) => x.corpus === 'list' || x.corpus === 'prose')) {
        for (const door of ['files', 'exists']) {
          const line = r.lines.find((l) => l.door === door && l.regime === 'named');
          if (line === undefined || line.regressCells === 0) missed.push(`${r.corpus} ${door} named`);
        }
      }
      code = missed.length === 0 ? 0 : 1;
      verdict = code === 0
        ? 'PASS: the planted regression is caught: every asked list and prose corpus reads regression cells under named on both doors'
        : `FAIL: the planted regression read 0 regression cells on ${missed.join(', ')}`;
    } else if (args.plantJ9) {
      // Re-judged in his absolute-only round: under J10 the cut leaves no
      // relative chain, so what it still opens is an absolute chain whose top
      // piece starts `/` below a row that reads past the width. It is caught
      // where it opens, under `named`, on both doors of both prose stale corpora.
      const missed = [];
      for (const corpus of ['prose-stale', 'prose-outside-stale']) {
        const r = results.find((x) => x.corpus === corpus);
        for (const door of ['files', 'exists']) {
          const line = r?.lines.find((l) => l.door === door && l.regime === 'named');
          if (line === undefined || line.wrongOpens === 0) missed.push(`${corpus} ${door} named`);
        }
      }
      code = missed.length === 0 ? 0 : 1;
      verdict = code === 0
        ? 'PASS: the planted cut is caught: prose-stale and prose-outside-stale read wrong-file opens under named on both doors'
        : `FAIL: the planted cut read 0 wrong-file opens on ${missed.join(', ')}`;
    } else if (args.plantAbs) {
      // J10 out: a relative chain is offered again, the cut report sees it on
      // both margin corpora, and on prose-margin its press opens the project's
      // copy of a path printed in another folder, on the files door over this
      // repository's tree and over the twin.
      const missed = [];
      for (const corpus of ['prose-margin', 'listing']) {
        const r = results.find((x) => x.corpus === corpus);
        if ((r?.cuts?.layouts.relative ?? 0) === 0) missed.push(`${corpus} relative cuts`);
      }
      const margin = results.find((x) => x.corpus === 'prose-margin');
      for (const regime of ['repo', 'twin']) {
        const line = margin?.lines.find((l) => l.door === 'files' && l.regime === regime);
        if (line === undefined || line.printedWrong === 0) missed.push(`prose-margin files ${regime} printed-path wrong-file opens`);
      }
      code = missed.length === 0 ? 0 : 1;
      verdict = code === 0
        ? 'PASS: the planted relative join is caught: relative cuts on prose-margin and listing, and printed-path wrong-file opens on prose-margin files repo and twin'
        : `FAIL: with J10 planted out the measurement read 0 on ${missed.join(', ')}`;
    } else if (args.plantJ11) {
      // Since the fix round of his absolute-only round, also on prose-cutters
      // when it is asked: the breakers J11 read one column for and missed.
      const missed = [];
      for (const corpus of ['prose-margin', 'prose-cutters'].filter((c) => corpora.includes(c))) {
        const r = results.find((x) => x.corpus === corpus);
        for (const k of ['top', 'bottom-mid-name']) if ((r?.cuts?.layouts[k] ?? 0) === 0) missed.push(`${corpus} ${k}`);
      }
      code = missed.length === 0 ? 0 : 1;
      verdict = code === 0
        ? `PASS: the planted cut is caught: ${corpora.includes('prose-cutters') ? 'prose-margin and prose-cutters read' : 'prose-margin reads'} top and bottom-mid-name cuts`
        : `FAIL: with J11 planted out the cut report read 0 on ${missed.join(', ')}`;
    } else {
      const red = all.filter(
        (l) => l.regressCells > 0 || l.wrongOpens > 0 || (PRINTED_GRADED.has(l.regime) && (l.printedWrong ?? 0) > 0)
      );
      const cutRed = cutFailures(results);
      code = red.length === 0 && cutRed.length === 0 ? 0 : 1;
      const gain = all.reduce((s, l) => s + l.gainCells, 0);
      const judged = all.filter((l) => l.wrongJudged).length;
      const graded = all.filter((l) => l.printedJudged && PRINTED_GRADED.has(l.regime)).length;
      const cutCorpora = results.filter((r) => (r.cuts?.judged ?? 0) > 0).length;
      verdict = code === 0
        ? `PASS: 0 regression cells on all ${String(all.length)} lines, ` +
          `${judged === 0 ? 'no stale line asked' : `0 wrong-file opens on the ${String(judged)} stale ones`}, ` +
          `0 printed-path wrong-file opens on the ${String(graded)} repo and twin lines, and the cut report met on ${String(cutCorpora)} corpora; ` +
          `the gain is ${n(gain)} cells summed over every line`
        : `FAIL: ${[
            ...red.map(
              (l) =>
                `${l.corpus} ${l.door} ${l.regime} ${n(l.regressCells)} cells, ${n(l.wrongOpens)} wrong-file opens, ${n(l.printedWrong ?? 0)} printed-path wrong-file opens`
            ),
            ...cutRed
          ].join('; ')}`;
    }
    const totalMs = Date.now() - started;
    say(`${verdict} (${(totalMs / 1000).toFixed(1)} s)`);
    if (args.out !== undefined) {
      mkdirSync(dirname(resolve(args.out)), { recursive: true });
      writeFileSync(
        resolve(args.out),
        `${JSON.stringify(
          {
            parent: parent.label, head: head.label, plant: args.plant, plantJ9: args.plantJ9, plantAbs: args.plantAbs, plantJ11: args.plantJ11,
            corpora: results, verdict, exit: code, ms: totalMs
          },
          null,
          1
        )}\n`
      );
      say(`wrote ${resolve(args.out)}`);
    }
    return code;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

let exitCode;
try {
  exitCode = main();
} catch (error) {
  if (error instanceof Refusal) {
    say(`REFUSED: ${error.message}`);
    exitCode = 2;
  } else {
    console.error(error);
    exitCode = 2;
  }
}
process.exitCode = exitCode;
