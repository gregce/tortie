#!/usr/bin/env node
/**
 * build/p328/timeline.mjs — antigravity's one recorded turn, AS NUMBERS ONLY,
 * REBUILT from what Phase 328's entry recorded about it (build/p353/SPEC.md
 * D328-1, §0.1 328 item 2).
 *
 * ## Why rebuilt
 *
 * The entry was written over research 129's live recording `a/rec` (agy 1.2.7,
 * 2026-09-22), and its mechanism 1 says this script reads that corpus through
 * build/p321/corpus.mjs. THE CORPUS IS GONE: it lived under /private/tmp, which
 * macOS cleans, and the spec step searched for it to depth 7 under /private/tmp
 * and /private/var/tmp and found nothing (build/p353/SPEC.md §0.1 325 item 3).
 * So this file reads NO recording. Every number in the timeline comes from one
 * of two committed places, and every block says which by an index into SOURCES
 * below, where the sentence is quoted with the line it was read from:
 *
 *   - the entry's own measured sentences (docs/BACKLOG.md, "## Phase 328 —",
 *     read at b1a557b8 on 2026-11-05), and
 *   - build/fixtures/questions/labels.json, antigravity's three question
 *     instances and its 32 committed windows (the capture times and counts).
 *
 * Where the entry is silent the rebuild says what rule it used instead, and
 * that rule is a SOURCES row too. Nothing here is a measurement; it is the
 * entry's measurements laid out on a clock, so the tests can drive the shipping
 * state machine over them and survive a reboot. A new recording would replace
 * it (build/p353/SPEC.md Q6).
 *
 * ## What the file holds, and only this
 *
 * Seconds after antigravity's launch: its writes (tmux's activity stamp is the
 * whole second of the newest one), its captures with the id of the committed
 * screen each showed (a line of build/fixtures/questions/a-antigravity.jsonl),
 * its half-second process samples (the subtree's CPU-seconds and the STAT
 * letters of agy and of each process under it), its key times and its three
 * questions. NO TEXT, NO COMMAND LINE, NO PATH, NO PROMPT: `--check` refuses a
 * string anywhere but a screen id or a STAT field, and a screen id the
 * committed windows do not hold.
 *
 * Usage:
 *   node build/p328/timeline.mjs --make      write build/fixtures/questions/a-antigravity-timeline.json
 *   node build/p328/timeline.mjs --check     refuse the committed file unless it is exactly what --make writes,
 *                                            holds numbers only, and agrees with every sentence it came from
 *   node build/p328/timeline.mjs --explain   print each block with the sentence it came from
 *
 * It starts nothing, makes no request, reads nothing under the person's home and
 * writes only the one file, on --make. Exit 0 on a pass, 1 on a finding, 2 on
 * a usage error.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const QUESTIONS = join(ROOT, 'build', 'fixtures', 'questions');
const OUT = join(QUESTIONS, 'a-antigravity-timeline.json');
const LABELS = join(QUESTIONS, 'labels.json');
const WINDOWS = join(QUESTIONS, 'a-antigravity.jsonl');
const TAG = '[p328 timeline]';

// ---------------------------------------------------------------------------
// Where every number came from
// ---------------------------------------------------------------------------

/**
 * Each block of the timeline names the rows of this table it was built from.
 * A row is the quoted sentence and where it was read; the rule rows say what
 * the rebuild did where the entry is silent.
 */
export const SOURCES = [
  {
    where: 'docs/BACKLOG.md:36009, Phase 328 "What the live monitors read"',
    said:
      'the 1 s monitor read antigravity `running` from +1.08 s to the end of the recording at +594.86 s ... the trust gate ' +
      'answered at +40.07, the prompt submitted at +65.38, its first question answered at +88.55 and its second at +241.99 ' +
      '(key times from a/rec/events.jsonl)'
  },
  {
    where: 'docs/BACKLOG.md:36010, Phase 328 "The repaint draws nothing"',
    said:
      'From +270 s to the last write at +594.54 s agy wrote 162 times, 1.999 to 2.019 s apart (median 2.015 s), and every ' +
      'write is the same 15 bytes ... Of all 824 writes in the run, 293 are that sequence. It is also every write before the ' +
      'prompt from +45 to +63 s (9 of 9) and 30 of the 34 writes while its second question waited. tmux\'s activity stamp ' +
      'moved in steps of 2 s (159 times) or 3 s (2 times) at rest'
  },
  {
    where: 'docs/BACKLOG.md:36011, Phase 328 "The screen does not move at rest"',
    said:
      '588 antigravity captures, 32 distinct screens ... From +270 s: 325 captures, 0 differ from the one before. While its ' +
      'tool ran with nothing drawn (+110 to +178.3 s): 69 captures, 0 differ. While its second question waited: 61 captures, ' +
      '0 differ. While it thought: 6 of 7 differ (a spinner)'
  },
  {
    where: 'docs/BACKLOG.md:36012, Phase 328 "CPU"',
    said:
      'At rest, 0 of 318 one-second intervals reached 5% (1.36 CPU-seconds over 325 s) ... During the silent part of the ' +
      'tool, 64 of 64 intervals reached 5%: minimum 6.1%, tenth percentile 7.0%, median 8.5%, maximum 11.0% ... While its ' +
      'second question waited, 0 of 55 (0.22 CPU-seconds). Counted from a/rec/ps.jsonl, whose samples are 500 ms apart'
  },
  {
    where: 'docs/BACKLOG.md:36013, Phase 328 "agy runs its tool on a terminal of its own"',
    said:
      'agy is the pane\'s own program (its pid is the pane pid, Ss+). Its tool, sleep, appeared in 179 of the 184 half-second ' +
      'samples of the tool stretch (first +89.16 s, last +178.28 s) as Ss+ ... At rest, 0 of 648 samples had any process ' +
      'under agy ... At launch 3 of 60 samples had one: a second agy as Ss and Rs ... research 129 found agy rewrote itself 7 s ' +
      'after this launch ... and a node as S+'
  },
  {
    where: 'build/fixtures/questions/labels.json instances[7], a/antigravity "folder trust"',
    said: 'drawn 7.74, answered 39.32, drawnBytes 5.15, lastWriteBeforeAnswer 39.26, seconds from the stream\'s first capture'
  },
  {
    where: 'build/fixtures/questions/labels.json instances[8], a/antigravity "run permission 1"',
    said: 'drawn 72.42, answered 87.81, drawnBytes 72.09, lastWriteBeforeAnswer 87.47'
  },
  {
    where: 'build/fixtures/questions/labels.json instances[9], a/antigravity "run permission 2"',
    said: 'drawn 180.53, answered 241.24, drawnBytes 180.34, lastWriteBeforeAnswer 240.12'
  },
  {
    where: 'build/fixtures/questions/labels.json windows a-antigravity-0001 to a-antigravity-0032',
    said: 'each committed screen\'s first capture (seconds from the stream\'s first capture) and how many captures showed it'
  },
  {
    where: 'docs/BACKLOG.md:36016, Phase 328 the model table',
    said: 'The silent tool (+88.55 to +180.53 s)'
  },
  {
    where: 'REBUILD RULE (this file): the offset between the two clocks',
    said:
      'labels.json counts from the capture stream\'s first capture and the entry from the launch: the three answers read ' +
      '39.32, 87.81 and 241.24 there and +40.07, +88.55 and +241.99 here, so stream + their mean difference = launch'
  },
  {
    where: 'REBUILD RULE (this file): one cadence',
    said:
      'the 15-byte writes are ONE 2.015 s cadence, anchored on the last write and carried back to the first draw (drawnBytes ' +
      'of the first question, the trust gate). That reproduces the entry\'s counts: 162 at rest from +270.125, 9 between +45 ' +
      'and +63, 293 in the run. The one cadence write that falls after a question\'s last write before its answer (labels.json) ' +
      'is moved back to that last write'
  },
  {
    where: 'REBUILD RULE (this file): a changed screen was drawn',
    said:
      'a capture showing a different committed screen from the capture before it was drawn by a write, so one write is put 50 ms ' +
      'before it; each question\'s drawnBytes and lastWriteBeforeAnswer is a write too'
  },
  {
    where: 'REBUILD RULE (this file): unmeasured CPU',
    said:
      'a stretch whose CPU the entry did not measure runs at the rest rate (1.36 CPU-seconds over 325 s); the 64 silent-tool ' +
      'intervals sit centred in +110 to +178.3 s, from +112, with exactly the entry\'s minimum, tenth percentile, median and ' +
      'maximum, in a fixed order'
  },
  {
    where: 'REBUILD RULE (this file): the launch writes, from SOURCES[0]',
    said:
      'the 1 s monitor read running from +1.08 s to the end "with no other transition", so tmux\'s clock never sat quiet for ' +
      'three 1 s ticks between the launch and the first draw: a write at +1.08 s and one every 2 s after it until the first ' +
      'draw (+3.08, +5.08). The entry quotes none of those bytes, and they are not the 15-byte sequence'
  },
  {
    where: 'REBUILD RULE (this file): the launch samples',
    said:
      'the three launch samples with a process under agy are put 7 s after the launch, one after another: the second agy as Ss, ' +
      'then as Rs, then the node as S+'
  }
];

// ---------------------------------------------------------------------------
// The numbers, each from the sentence named beside it
// ---------------------------------------------------------------------------

/** SOURCES[0]. */
const END = 594.86;
const KEYS = [40.07, 65.38, 88.55, 241.99];
/** SOURCES[1]. */
const LAST_WRITE = 594.54;
const PERIOD = 2.015;
const REST_WRITES = 162;
const REST_FROM = 270;
/** SOURCES[3]. */
const REST_CPU = 1.36 / 325;
const WAIT_CPU = 0.22 / 55;
const SILENT = { min: 6.1, p10: 7.0, median: 8.5, max: 11.0, n: 64 };
/** SOURCES[2], SOURCES[13]: the silent part, and where its 64 intervals start. */
const SILENT_SPAN = [110, 178.3];
const SILENT_FROM = 112;
/** SOURCES[4]. */
const SAMPLE_EVERY = 0.5;
const TOOL_FIRST = 89.16;
const TOOL_LAST = 178.28;
/** SOURCES[9]. */
const TOOL_STRETCH = [88.55, 180.53];
/** SOURCES[14]. */
const LAUNCH_WRITES = [1.08, 3.08, 5.08];
/** SOURCES[15]. */
const LAUNCH_SAMPLES = [
  [7.16, 'Ss'],
  [7.66, 'Rs'],
  [8.16, 'S+']
];

const round = (x, places = 3) => Math.round(x * 10 ** places) / 10 ** places;

function readLabels() {
  return JSON.parse(readFileSync(LABELS, 'utf8'));
}
function windowIds() {
  return readFileSync(WINDOWS, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l).id);
}

/** The 64 silent-tool rates, percent, with exactly the entry's order statistics, in a fixed order. */
export function silentRates() {
  const v = new Array(SILENT.n);
  const lerp = (a, b, i, from, to) => a + ((b - a) * (i - from)) / (to - from);
  // Nearest-rank tenth percentile of 64 is the 7th value (index 6); the median
  // is the mean of indices 31 and 32.
  for (let i = 0; i <= 6; i += 1) v[i] = lerp(SILENT.min, SILENT.p10, i, 0, 6);
  for (let i = 6; i <= 31; i += 1) v[i] = lerp(SILENT.p10, SILENT.median - 0.05, i, 6, 31);
  for (let i = 32; i <= 63; i += 1) v[i] = lerp(SILENT.median + 0.05, SILENT.max, i, 32, 63);
  // 29 is coprime with 64, so this visits every value once.
  return Array.from({ length: SILENT.n }, (_, k) => round(v[(k * 29) % SILENT.n], 3));
}

/**
 * The timeline, from labels.json and the numbers above. Pure: the same inputs
 * always build the same object.
 */
export function buildTimeline(labels, ids) {
  const inst = [7, 8, 9].map((i) => labels.instances[i]);
  for (const x of inst) {
    if (x?.recording !== 'a/antigravity') throw new Error('labels.json instances 7 to 9 are no longer antigravity\'s');
  }
  // SOURCES[10]: the offset between the stream's clock and the launch's.
  const answeredKeys = [KEYS[0], KEYS[2], KEYS[3]];
  const offset = round(inst.reduce((n, x, i) => n + (answeredKeys[i] - x.answered), 0) / inst.length, 2);
  const questions = inst.map((x) => [round(x.drawn + offset), round(x.answered + offset), round(x.drawnBytes + offset), round(x.lastWriteBeforeAnswer + offset)]);

  // SOURCES[8]: the captures, window by window.
  const wins = ids.map((id) => ({ id, ...labels.windows[id] }));
  const captures = { at: [], screen: [] };
  for (let w = 0; w < wins.length; w += 1) {
    const here = wins[w];
    const next = wins[w + 1];
    const until = next === undefined ? END - offset : next.first;
    const spacing = (until - here.first) / here.captures;
    for (let i = 0; i < here.captures; i += 1) {
      captures.at.push(round(here.first + i * spacing + offset));
      captures.screen.push(here.id);
    }
  }

  // SOURCES[11]: one cadence from the first draw to the last write.
  const firstDraw = questions[0][2];
  const cadence = [];
  for (let j = -Math.floor((LAST_WRITE - firstDraw) / PERIOD); j <= 0; j += 1) cadence.push(round(LAST_WRITE + j * PERIOD));
  for (const [, answered, , lastBefore] of questions) {
    for (let k = 0; k < cadence.length; k += 1) {
      if (cadence[k] > lastBefore && cadence[k] < answered) cadence[k] = lastBefore;
    }
  }
  // SOURCES[12]: a changed screen was drawn, and the labelled writes.
  const drawn = [];
  for (let i = 1; i < captures.at.length; i += 1) {
    if (captures.screen[i] !== captures.screen[i - 1]) drawn.push(round(captures.at[i] - 0.05));
  }
  for (const [, , bytes, lastBefore] of questions) drawn.push(bytes, lastBefore);
  // SOURCES[14]: the launch.
  const writes = [...new Set([...LAUNCH_WRITES, ...cadence, ...drawn])].sort((a, b) => a - b);

  // SOURCES[3], [4], [13], [15]: the process samples.
  const rates = silentRates();
  const wait = [questions[2][0], KEYS[3]];
  const rateAt = (t) => {
    if (t >= SILENT_FROM && t < SILENT_FROM + SILENT.n) return rates[Math.floor(t - SILENT_FROM)] / 100;
    if (t >= wait[0] && t < wait[1]) return WAIT_CPU;
    return REST_CPU;
  };
  const samples = [];
  let cpu = 0;
  let prev = 0;
  for (let t = 0.16; t <= END; t = round(t + SAMPLE_EVERY, 2)) {
    // Integrate the rate in 10 ms steps, so an interval boundary inside a
    // half-second lands where it is.
    for (let s = prev; s < t - 1e-9; s = round(s + 0.01, 2)) cpu += rateAt(s) * 0.01;
    prev = t;
    const kids = [];
    for (const [at, stat] of LAUNCH_SAMPLES) if (Math.abs(at - t) < 1e-6) kids.push(stat);
    if (t >= TOOL_FIRST - 1e-6 && t <= TOOL_LAST + 1e-6) kids.push('Ss+');
    samples.push([round(t, 2), round(cpu, 4), 'Ss+', ...kids]);
  }

  return {
    schema: 1,
    phase: 328,
    rebuilt: true,
    offset: { source: [0, 5, 6, 7, 10], seconds: offset },
    end: { source: [0], seconds: END },
    keys: { source: [0], seconds: KEYS },
    questions: { source: [5, 6, 7, 10], drawnAnsweredBytesLastWrite: questions },
    stretches: {
      source: [1, 2, 9, 13],
      restFrom: REST_FROM,
      tool: TOOL_STRETCH,
      silentTool: SILENT_SPAN,
      silentIntervalsFrom: SILENT_FROM
    },
    writes: { source: [0, 1, 5, 6, 7, 11, 12, 14], seconds: writes },
    captures: { source: [2, 8, 10], seconds: captures.at, screen: captures.screen },
    processes: { source: [3, 4, 13, 15], everySeconds: SAMPLE_EVERY, samples }
  };
}

/** One top-level key per line, each value compact: stable, and readable in a diff. */
export function formatTimeline(t) {
  const keys = Object.keys(t);
  return `{\n${keys.map((k, i) => ` ${JSON.stringify(k)}: ${JSON.stringify(t[k])}${i < keys.length - 1 ? ',' : ''}`).join('\n')}\n}\n`;
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

const SCREEN_ID = /^a-antigravity-\d{4}$/;
const STAT = /^[A-Za-z+<>]{1,6}$/;
const BLOCK_KEYS = {
  schema: null,
  phase: null,
  rebuilt: null,
  offset: ['source', 'seconds'],
  end: ['source', 'seconds'],
  keys: ['source', 'seconds'],
  questions: ['source', 'drawnAnsweredBytesLastWrite'],
  stretches: ['source', 'restFrom', 'tool', 'silentTool', 'silentIntervalsFrom'],
  writes: ['source', 'seconds'],
  captures: ['source', 'seconds', 'screen'],
  processes: ['source', 'everySeconds', 'samples']
};

/**
 * Every refusal the file is held to, over an object (so the self-tests can
 * hand it a broken copy): numbers only, but a screen id at a capture's screen
 * and a STAT field in a process sample; every screen id one the committed
 * windows hold; every block naming its sources, each a row of SOURCES; the
 * keys exactly the schema's.
 */
export function refusals(t, ids) {
  const out = [];
  const known = new Set(ids);
  if (t === null || typeof t !== 'object' || Array.isArray(t)) return ['the file is not one object'];
  for (const k of Object.keys(t)) if (!(k in BLOCK_KEYS)) out.push(`an unknown block ${JSON.stringify(k)}`);
  for (const [k, fields] of Object.entries(BLOCK_KEYS)) {
    if (!(k in t)) {
      out.push(`the block ${k} is missing`);
      continue;
    }
    if (fields === null) continue;
    const block = t[k];
    if (block === null || typeof block !== 'object' || Array.isArray(block)) {
      out.push(`${k} is not a block`);
      continue;
    }
    for (const f of Object.keys(block)) if (!fields.includes(f)) out.push(`${k} carries an unknown field ${JSON.stringify(f)}`);
    const src = block.source;
    if (!Array.isArray(src) || src.length === 0 || !src.every((n) => Number.isInteger(n) && n >= 0 && n < SOURCES.length)) {
      out.push(`${k} does not name its source as rows of SOURCES`);
    }
  }
  // Every string, wherever it is, must be a screen id at a capture or a STAT in a sample.
  const walk = (v, path) => {
    if (typeof v === 'string') {
      const capture = /^captures\.screen\[\d+\]$/.test(path);
      const stat = /^processes\.samples\[\d+\]\[(\d+)\]$/.exec(path);
      if (capture) {
        if (!SCREEN_ID.test(v)) out.push(`${path} is ${JSON.stringify(v.slice(0, 40))}, not a screen id`);
        else if (!known.has(v)) out.push(`${path} names ${v}, which build/fixtures/questions/a-antigravity.jsonl does not hold`);
      } else if (stat !== null && Number(stat[1]) >= 2) {
        if (!STAT.test(v)) out.push(`${path} is ${JSON.stringify(v.slice(0, 40))}, not STAT letters`);
      } else {
        out.push(`${path} is a string (${JSON.stringify(v.slice(0, 40))}), and the timeline holds numbers only`);
      }
      return;
    }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) out.push(`${path} is not a finite number`);
      return;
    }
    if (typeof v === 'boolean' || v === null) return;
    if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${path}[${String(i)}]`));
      return;
    }
    for (const [k, x] of Object.entries(v)) walk(x, path === '' ? k : `${path}.${k}`);
  };
  walk(t, '');
  return out;
}

/**
 * The rebuilt timeline against every count the entry recorded, so a rebuild
 * that drifted from the sentences it came from is named. Each answer is
 * [what, expected, got, ok].
 */
export function agreements(t) {
  const out = [];
  const w = t.writes.seconds;
  const rest = w.filter((s) => s >= REST_FROM);
  const gaps = rest.slice(1).map((s, i) => round(s - rest[i]));
  const steps = rest.slice(1).map((s, i) => Math.floor(s) - Math.floor(rest[i]));
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const onGrid = (s) => {
    const k = (LAST_WRITE - s) / PERIOD;
    return Math.abs(k - Math.round(k)) < 1e-3;
  };
  const cadence = w.filter(onGrid);
  out.push(['writes from +270 s to the last', 162, rest.length, rest.length === 162]);
  out.push(['the last write', 594.54, rest.at(-1), rest.at(-1) === 594.54]);
  out.push(['their median spacing, s', 2.015, median, median === 2.015]);
  out.push(['the stamp\'s 2 s steps at rest', 159, steps.filter((s) => s === 2).length, steps.filter((s) => s === 2).length === 159]);
  out.push(['the stamp\'s 3 s steps at rest', 2, steps.filter((s) => s === 3).length, steps.filter((s) => s === 3).length === 2]);
  const before = cadence.filter((s) => s >= 45 && s <= 63).length;
  out.push(['cadence writes from +45 to +63 s', 9, before, before === 9]);
  // A cadence write moved back to a question's last write before its answer
  // still counts as the sequence: a grid point between that last write and the
  // answer that the writes do not hold.
  let moved = 0;
  for (const [, answered, , last] of t.questions.drawnAnsweredBytesLastWrite) {
    for (let k = 0; k < 400; k += 1) {
      const s = round(LAST_WRITE - k * PERIOD);
      if (s <= last) break;
      if (s < answered && !w.includes(s)) moved += 1;
    }
  }
  const inRun = cadence.length + moved;
  out.push(['writes of the sequence in the run (one moved to a labelled last write)', 293, inRun, inRun === 293]);
  out.push(['captures', 588, t.captures.seconds.length, t.captures.seconds.length === 588]);
  const distinct = new Set(t.captures.screen).size;
  out.push(['distinct screens', 32, distinct, distinct === 32]);
  const restCaptures = t.captures.seconds.map((s, i) => [s, t.captures.screen[i]]).filter(([s]) => s >= REST_FROM);
  const restChanged = restCaptures.slice(1).filter(([, id], i) => id !== restCaptures[i][1]).length;
  out.push(['captures at rest that differ from the one before', 0, restChanged, restChanged === 0]);
  const samples = t.processes.samples;
  const stretch = samples.filter(([s]) => s >= TOOL_STRETCH[0] && s <= TOOL_STRETCH[1]);
  const withTool = stretch.filter((x) => x.length > 3).length;
  out.push(['samples in the tool stretch', 184, stretch.length, stretch.length === 184]);
  out.push(['of them with the sleep as Ss+', 179, withTool, withTool === 179 && stretch.every((x) => x.length <= 3 || x[3] === 'Ss+')]);
  const toolTimes = samples.filter((x) => x.length > 3 && x[3] === 'Ss+').map(([s]) => s);
  out.push(['the sleep\'s first sample, s', 89.16, toolTimes[0], toolTimes[0] === 89.16]);
  out.push(['its last, within one sample of +178.28 s', 178.28, toolTimes.at(-1), Math.abs((toolTimes.at(-1) ?? 0) - 178.28) <= SAMPLE_EVERY]);
  const restSamples = samples.filter(([s]) => s >= REST_FROM);
  const restKids = restSamples.filter((x) => x.length > 3).length;
  out.push(['rest samples with a process under agy', 0, restKids, restKids === 0]);
  const launchKids = samples.filter(([s]) => s < KEYS[0]).filter((x) => x.length > 3).map((x) => x[3]);
  out.push(['launch samples with one', 3, launchKids.length, launchKids.join(',') === 'Ss,Rs,S+']);
  out.push(['agy itself, every sample', 'Ss+', 'Ss+', samples.every((x) => x[2] === 'Ss+')]);
  const cpuAt = (s) => {
    let best = samples[0];
    for (const x of samples) if (x[0] <= s) best = x;
    return best[1];
  };
  const restCpu = round(cpuAt(END) - cpuAt(REST_FROM), 2);
  out.push(['CPU-seconds from +270 s to the end, about', 1.36, restCpu, Math.abs(restCpu - 1.36) <= 0.02]);
  const one = [];
  for (let s = REST_FROM; s + 1 <= END; s += 1) one.push((cpuAt(s + 1) - cpuAt(s)) * 100);
  out.push(['one-second rest intervals at 5% or more', 0, one.filter((p) => p >= 5).length, one.every((p) => p < 5)]);
  const r = silentRates();
  const rs = [...r].sort((a, b) => a - b);
  const med = round((rs[31] + rs[32]) / 2, 2);
  out.push(['silent-tool intervals', 64, r.length, r.length === 64]);
  out.push(['their minimum, %', 6.1, rs[0], rs[0] === 6.1]);
  out.push(['their tenth percentile (nearest rank), %', 7.0, rs[6], rs[6] === 7]);
  out.push(['their median, %', 8.5, med, med === 8.5]);
  out.push(['their maximum, %', 11.0, rs[63], rs[63] === 11]);
  out.push(['every one at 5% or more', true, r.every((p) => p >= 5), r.every((p) => p >= 5)]);
  out.push(['the four key times', KEYS.join(','), t.keys.seconds.join(','), t.keys.seconds.join(',') === KEYS.join(',')]);
  return out;
}

/** In-memory copies with one rule broken each: every one must be refused. */
function selfTests(t, ids) {
  const copy = () => JSON.parse(JSON.stringify(t));
  const plants = [
    ['a command line in a process sample', (c) => c.processes.samples[200].push('/Users/x/.local/bin/agy --conversation x')],
    ['a prompt string in the key block', (c) => (c.keys.seconds[1] = 'fix the bug in main.ts')],
    ['a screen id the committed windows do not hold', (c) => (c.captures.screen[5] = 'a-antigravity-0099')],
    ['a screen named by its text', (c) => (c.captures.screen[5] = '? for shortcuts')],
    ['a block that names no source', (c) => delete c.writes.source],
    ['a source that is not a row of SOURCES', (c) => (c.captures.source = [SOURCES.length])],
    ['an unknown block', (c) => (c.transcript = { source: [0], seconds: [] })],
    ['a path in a STAT field', (c) => (c.processes.samples[10][2] = '/bin/sleep')]
  ];
  const out = [];
  for (const [name, plant] of plants) {
    const c = copy();
    plant(c);
    out.push([name, refusals(c, ids).length > 0]);
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? '';
  if (!['--make', '--check', '--explain'].includes(mode)) {
    process.stderr.write(`${TAG} usage: node build/p328/timeline.mjs --make | --check | --explain\n`);
    process.exit(2);
  }
  const ids = windowIds();
  const built = buildTimeline(readLabels(), ids);
  const text = formatTimeline(built);
  if (mode === '--make') {
    const problems = refusals(built, ids);
    if (problems.length > 0) {
      for (const p of problems) process.stderr.write(`${TAG} REFUSED ${p}\n`);
      process.exit(1);
    }
    writeFileSync(OUT, text, 'utf8');
    process.stdout.write(`${TAG} wrote ${OUT}: ${String(built.writes.seconds.length)} writes, ${String(built.captures.seconds.length)} captures, ${String(built.processes.samples.length)} samples\n`);
    return;
  }
  if (mode === '--explain') {
    for (const [k, v] of Object.entries(built)) {
      if (v === null || typeof v !== 'object') continue;
      process.stdout.write(`${k}:\n`);
      for (const n of v.source) process.stdout.write(`  [${String(n)}] ${SOURCES[n].where}\n      ${SOURCES[n].said}\n`);
    }
    return;
  }
  const findings = [];
  let committedText = '';
  let committed = null;
  try {
    committedText = readFileSync(OUT, 'utf8');
    committed = JSON.parse(committedText);
  } catch (err) {
    findings.push(`the committed ${OUT} cannot be read: ${String(err?.message ?? err)}`);
  }
  if (committed !== null) {
    for (const p of refusals(committed, ids)) findings.push(`REFUSED: ${p}`);
    if (committedText !== text) findings.push('the committed file is not exactly what --make writes from labels.json and SOURCES; run --make and read the diff');
    for (const [what, want, got, ok] of agreements(committed)) {
      process.stdout.write(`${TAG} ${ok ? 'agrees ' : 'DIFFERS'} ${what}: the entry ${String(want)}, the timeline ${String(got)}\n`);
      if (!ok) findings.push(`the timeline does not agree with its source: ${what} (the entry ${String(want)}, the timeline ${String(got)})`);
    }
    for (const [name, red] of selfTests(committed, ids)) {
      process.stdout.write(`${TAG} self-test: ${name} → ${red ? 'refused, as it must be' : 'ACCEPTED'}\n`);
      if (!red) findings.push(`self-test "${name}" was not refused, so the check has stopped asking`);
    }
  }
  if (findings.length > 0) {
    for (const f of findings) process.stderr.write(`${TAG} ${f}\n`);
    process.stderr.write(`${TAG} FAIL: ${String(findings.length)} finding(s)\n`);
    process.exit(1);
  }
  process.stdout.write(
    `${TAG} PASS: ${OUT} holds numbers, screen ids and STAT letters only, every screen id is a committed window, every block ` +
      `names its source, it is exactly what --make writes, and it agrees with every count the entry recorded. No recording was read.\n`
  );
}

main();
