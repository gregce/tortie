#!/usr/bin/env node
/**
 * build/p374/make-fixtures.mjs — the committed recordings and the hostile
 * payloads of Phase 374 (build/p374/SPEC.md §0, §9.3), and the reader every
 * probe, test and gate of the phase reads them through.
 *
 * ## What it writes, and that is all it writes
 *
 *   build/fixtures/p374/launch.jsonl   the 42 runs of the live launch
 *                                      (research 146 §6, §11)
 *   build/fixtures/p374/resume.jsonl   the 21 runs of the second reading that
 *                                      carried a payload (research 146 §16):
 *                                      a launch, a turn and a resume, whose
 *                                      Gemini buckets ALTERNATE
 *   build/fixtures/p374/hostile.json   the hostile payloads
 *
 * One recording line is `{ "run", "t", "mode", "payload" }`: the run's number
 * from 1, milliseconds after that recording's first run, how the recorder's
 * own command behaved on it, and the WHOLE object a status line command would
 * be handed. `expect.json` beside them holds what a reader must hold after
 * each run, written by this file from its own invented values and never from a
 * product module.
 *
 * ## THE REPOSITORY IS PUBLIC, so it REFUSES to write a value it did not invent
 *
 * The recordings live outside the repository and are read READ ONLY, from
 * `--from <dir>`. What comes out of them is a SHAPE: how many runs there were,
 * which carried an address, a plan word and a quota, how far apart they came,
 * which run moved which bucket, in which direction, and which bucket was full.
 * Everything else is this file's own:
 *
 *   - every fraction is an invented one from LADDERS below, one a distinct
 *     value, so equal stays equal and different stays different. The only
 *     number that is the same on both sides is 1, a full bucket, which is a
 *     shape and is already written in research 146 §6.4;
 *   - every time is the recording's spacing on an invented epoch (BASE), and
 *     every reset is an invented instant, one a distinct recorded instant, so
 *     a reset that stayed put stays put and a full bucket's that moved with an
 *     ask moves by the same seconds;
 *   - every string is one of STRINGS below. The plan word, the address, the
 *     folder, the ids, the title and the version are invented.
 *
 * `refuseForeign` is the last thing before a write. It walks every leaf of
 * what is about to be written, and any string that is not in STRINGS, any
 * fraction that is not on a ladder, any instant off the invented epoch, or any
 * value that also stands in the recording (but for 1, `true`, `false`, `null`
 * and the state words) throws, and nothing is written. A ladder whose steps do
 * not move as the recording's did, or of another length, throws too.
 *
 * ## Use
 *
 *   node build/p374/make-fixtures.mjs --from <dir>      write the recordings,
 *                                                       the expectations and
 *                                                       the hostile payloads
 *   node build/p374/make-fixtures.mjs --hostile         write hostile.json alone
 *                                                       (no recording is read)
 *   node build/p374/make-fixtures.mjs --check           the committed files are
 *                                                       whole, invented and what
 *                                                       this file writes; reads
 *                                                       no recording
 *   node build/p374/make-fixtures.mjs --check --from <dir>
 *                                                       and byte for byte what
 *                                                       the recordings give
 *
 * It starts nothing, opens no socket and reads nothing but this repository and
 * `--from`. Importing it runs nothing.
 */

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FIXTURES = join(ROOT, 'build', 'fixtures', 'p374');
const J = JSON.stringify;

/** The four compiled bucket ids (D14), in the order the payload carries them. */
export const BUCKET_IDS = Object.freeze(['3p-5h', '3p-weekly', 'gemini-5h', 'gemini-weekly']);
/** The order the kept line carries them in (D14, the prototype's own order). */
export const KEPT_IDS = Object.freeze(['gemini-5h', 'gemini-weekly', '3p-5h', '3p-weekly']);

/** The invented epoch every time stands on. No recording is of this date. */
export const BASE = Date.parse('2030-01-01T00:00:00Z');
const BASE_END = BASE + 40 * 24 * 3600 * 1000;

const HOUR = 3600;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------------------
// Everything this file invented, and nothing else may be written
// ---------------------------------------------------------------------------

/** The two invented people. `example.com` and `example.org` are reserved. */
export const PERSON = 'person@example.com';
export const OTHER = 'other@example.org';
/** The invented plan word. It names no plan anybody sells. */
export const PLAN = 'Example Tier';
export const SESSION_ID = '7d0f4e0a-0000-4000-8000-00000000a374';
export const CONVERSATION_ID = '3c9b1d52-0000-4000-8000-0000000c0374';
/** The floor is 1.4.10; this is above it and no release of that number is claimed. */
export const VERSION = '1.6.0';

const STRINGS = Object.freeze({
  authenticating: 'authenticating',
  initializing: 'initializing',
  idle: 'idle',
  working: 'working',
  folder: '/Users/example/work/repo',
  transcript: '/Users/example/.example/transcript.jsonl',
  product: 'antigravity',
  modelId: 'example-model',
  modelName: 'Example Model',
  effort: 'high',
  cycle: 'default',
  vcs: 'git',
  person: PERSON,
  plan: PLAN,
  session: SESSION_ID,
  conversation: CONVERSATION_ID,
  version: VERSION,
  empty: ''
});
/** The state words, which are agy's published vocabulary and no one's data. */
const STATES = Object.freeze(['authenticating', 'initializing', 'idle', 'working']);
/** How the recorder's own command behaved, the recorder's words. */
const MODES = Object.freeze(['normal', 'print', 'slow2', 'slow8', 'hold', 'fail', 'turn']);

/**
 * One invented fraction a distinct recorded one, in the order they first came.
 * Each ladder must step the way the recording stepped (`stepsAgree`).
 */
export const LADDERS = Object.freeze({
  launch: Object.freeze({
    '3p-5h': Object.freeze([1]),
    '3p-weekly': Object.freeze([1]),
    'gemini-5h': Object.freeze([0.7125, 0.7011, 0.70104]),
    'gemini-weekly': Object.freeze([0.64, 0.6338, 0.63378])
  }),
  resume: Object.freeze({
    '3p-5h': Object.freeze([1]),
    '3p-weekly': Object.freeze([1]),
    'gemini-5h': Object.freeze([0.5281, 0.5263, 0.52804]),
    'gemini-weekly': Object.freeze([0.8412, 0.8373, 0.84116])
  })
});
/** The invented first reset of each bucket, in seconds after BASE. */
const FIRST_RESET = Object.freeze({
  launch: Object.freeze({ '3p-5h': 5 * HOUR, '3p-weekly': 7 * DAY, 'gemini-5h': 3 * HOUR + 11 * 60, 'gemini-weekly': 5 * DAY + 2 * HOUR }),
  resume: Object.freeze({ '3p-5h': 5 * HOUR, '3p-weekly': 7 * DAY, 'gemini-5h': 2 * HOUR + 23 * 60, 'gemini-weekly': 6 * DAY + 4 * HOUR })
});

const allFractions = new Set([...Object.values(LADDERS).flatMap((l) => Object.values(l)).flat()]);

// ---------------------------------------------------------------------------
// The payload, composed whole, in the key order agy's own payloads carry
// ---------------------------------------------------------------------------

const iso = (ms) => `${new Date(ms).toISOString().slice(0, 19)}Z`;

/**
 * One whole payload. `buckets` is `{ <id>: { f, resetAt } }` or null, `at` the
 * instant of the run. Keys stand in alphabetical order, as agy's do, and the
 * nulls the research found (`context_window.current_usage`,
 * `exceeds_200k_tokens`) are null until the first turn.
 */
export function composePayload({ at, state = 'idle', email = PERSON, plan = PLAN, turn = false, width = 120, buckets = null, vcs = true, cycle = true }) {
  const out = {
    agent_state: state,
    context_window: {
      context_window_size: 1_000_000,
      current_usage: turn ? { cache_creation_input_tokens: 0, cache_read_input_tokens: 0, input_tokens: 10, output_tokens: 10 } : null,
      remaining_percentage: turn ? 99 : 100,
      total_input_tokens: turn ? 10 : 0,
      total_output_tokens: turn ? 10 : 0,
      used_percentage: turn ? 1 : 0
    },
    conversation_id: turn ? STRINGS.conversation : STRINGS.empty,
    cwd: STRINGS.folder,
    ...(cycle ? { cycle_mode: STRINGS.cycle } : {}),
    ...(email === null ? {} : { email }),
    exceeds_200k_tokens: turn ? false : null,
    model: { display_name: STRINGS.modelName, effort: STRINGS.effort, id: STRINGS.modelId },
    ...(plan === null ? {} : { plan_tier: plan }),
    product: STRINGS.product,
    ...(buckets === null
      ? {}
      : {
          quota: Object.fromEntries(
            BUCKET_IDS.filter((id) => buckets[id] !== undefined).map((id) => [
              id,
              {
                remaining_fraction: buckets[id].f,
                reset_in_seconds: Math.max(0, Math.floor((buckets[id].resetAt - at) / 1000)),
                reset_time: iso(buckets[id].resetAt)
              }
            ])
          )
        }),
    sandbox: { enabled: false },
    session_id: STRINGS.session,
    terminal_width: width,
    transcript_path: STRINGS.transcript,
    ...(vcs ? { vcs: { type: STRINGS.vcs } } : {}),
    version: VERSION,
    workspace: { current_dir: STRINGS.folder, project_dir: STRINGS.folder }
  };
  return out;
}

// ---------------------------------------------------------------------------
// Reading a recording, and only its shape
// ---------------------------------------------------------------------------

const linesOf = (path) => readFileSync(path, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));

/** The shape of the live launch: `live-readings-run-1-sl.jsonl`. */
function shapeOfLaunch(from) {
  const rows = linesOf(join(from, 'live-readings-run-1-sl.jsonl')).filter((o) => o.ev === 'run');
  return rows.map((o) => ({
    t: o.t - rows[0].t,
    at: o.t,
    mode: o.mode,
    state: o.state,
    email: o.emailPresent === true,
    plan: typeof o.plan_tier === 'string' && o.plan_tier !== 'undefined',
    turn: o.convLen > 0,
    vcs: o.keys.includes('vcs'),
    cycle: o.keys.includes('cycle_mode'),
    quota: o.hasQuota === true ? Object.fromEntries(BUCKET_IDS.map((id) => [id, { f: o.quota[id].remaining_fraction, s: o.quota[id].reset_in_seconds }])) : null
  }));
}

/** The shape of the second reading: `second/runs.jsonl`, the runs that carried a payload. */
function shapeOfResume(from) {
  const rows = linesOf(join(from, 'second', 'runs.jsonl')).filter((o) => o.fail === undefined);
  let seen = false;
  return rows.map((o) => {
    const at = Math.round(o.t * 1000);
    if (o.state === 'working') seen = true;
    if (o.state === 'authenticating') seen = false;
    return {
      t: at - Math.round(rows[0].t * 1000),
      at,
      mode: seen ? 'turn' : 'normal',
      state: o.state,
      email: o.email === true,
      plan: o.plan === true,
      turn: seen,
      vcs: o.email === true,
      cycle: o.q !== null,
      quota: o.q === null ? null : Object.fromEntries(BUCKET_IDS.map((id) => [id, { f: o.q[id][0], s: o.q[id][1] }]))
    };
  });
}

const distinct = (xs) => xs.filter((x, i) => xs.indexOf(x) === i);
const signs = (xs) => xs.slice(1).map((x, i) => Math.sign(x - xs[i]));
/** Whether an invented ladder steps exactly as the recorded one did. */
export const stepsAgree = (recorded, invented) => recorded.length === invented.length && J(signs(recorded)) === J(signs(invented));

/** Recorded instants within 2.5 s are one instant (the payload floors to a second). */
function clusterOf(clusters, ms) {
  const i = clusters.findIndex((c) => Math.abs(c - ms) <= 2500);
  if (i !== -1) return i;
  clusters.push(ms);
  return clusters.length - 1;
}

/** One recording's shape as invented lines, `{ lines, expect }`. */
export function redact(name, shape) {
  const ladders = LADDERS[name];
  const recorded = Object.fromEntries(BUCKET_IDS.map((id) => [id, distinct(shape.filter((r) => r.quota !== null).map((r) => r.quota[id].f))]));
  for (const id of BUCKET_IDS) {
    if (!stepsAgree(recorded[id], ladders[id])) throw new Error(`make-fixtures: the ${name} ladder of ${id} does not step as the recording does`);
    recorded[id].forEach((f, i) => {
      if ((f === 1) !== (ladders[id][i] === 1)) throw new Error(`make-fixtures: ${name} ${id} step ${String(i)} is full on one side alone`);
    });
  }
  const clusters = Object.fromEntries(BUCKET_IDS.map((id) => [id, []]));
  const lines = shape.map((r, i) => {
    const at = BASE + r.t;
    const buckets =
      r.quota === null
        ? null
        : Object.fromEntries(
            BUCKET_IDS.map((id) => {
              const c = clusterOf(clusters[id], r.at + r.quota[id].s * 1000);
              const moved = Math.round((clusters[id][c] - clusters[id][0]) / 1000);
              return [id, { f: ladders[id][recorded[id].indexOf(r.quota[id].f)], resetAt: BASE + (FIRST_RESET[name][id] + moved) * 1000 }];
            })
          );
    return {
      run: i + 1,
      t: r.t,
      mode: r.mode,
      payload: composePayload({ at, state: r.state, email: r.email ? PERSON : null, plan: r.plan ? PLAN : null, turn: r.turn, width: i === 0 ? 80 : 120, buckets, vcs: r.vcs, cycle: r.cycle })
    };
  });
  return { lines, foreign: foreignOf(shape) };
}

/** Every value of a recording that may stand nowhere in what is written. */
function foreignOf(shape) {
  const out = new Set();
  for (const r of shape) {
    out.add(String(r.at));
    if (r.quota === null) continue;
    for (const id of BUCKET_IDS) if (r.quota[id].f !== 1) out.add(String(r.quota[id].f));
  }
  return out;
}

// ---------------------------------------------------------------------------
// What a reader must hold after each run, from the invented values alone
// ---------------------------------------------------------------------------

/**
 * The kept line's tail for a payload, `"p":…,"q":{…}}` (D14), or null when a
 * run writes nothing: no address, or no quota. This file's own derivation; it
 * imports no product module.
 */
export function tailOf(payload) {
  if (typeof payload.email !== 'string' || payload.email === '' || payload.quota === undefined) return null;
  const q = KEPT_IDS.filter((id) => payload.quota[id] !== undefined)
    .map((id) => `${J(id)}:{"f":${String(payload.quota[id].remaining_fraction)},"r":${J(payload.quota[id].reset_time)},"d":null,"a":false}`)
    .join(',');
  return q === '' ? null : `"p":${payload.plan_tier === undefined ? 'null' : J(payload.plan_tier)},"q":{${q}}}`;
}
/** What is DRAWN for a held payload at an instant: used percents and resets, by window. */
export function drawnOf(payload, now) {
  const window = (id) => {
    const b = payload?.quota?.[id];
    if (b === undefined) return null;
    const at = Date.parse(b.reset_time);
    if (b.remaining_fraction === 1) return { used: 0, resetsAt: null };
    if (at <= now) return null;
    return { used: 100 * (1 - b.remaining_fraction), resetsAt: at };
  };
  return { fiveHour: window('gemini-5h'), sevenDay: window('gemini-weekly'), second: { fiveHour: window('3p-5h'), sevenDay: window('3p-weekly') } };
}
/** The whole expectation of one recording: a tail a run, and the writes it costs. */
export function expectOf(lines) {
  let held = null;
  let writes = 0;
  const runs = lines.map((l) => {
    const tail = tailOf(l.payload);
    const wrote = tail !== null && tail !== held;
    if (wrote) {
      held = tail;
      writes += 1;
    }
    return { run: l.run, wrote, held };
  });
  return { runs: runs.length, withQuota: lines.filter((l) => l.payload.quota !== undefined).length, writes, perRun: runs };
}

// ---------------------------------------------------------------------------
// The hostile payloads (SPEC §2.3, §10 and the entry's fixture list)
// ---------------------------------------------------------------------------

/** `@@PAD@@` in a raw text is replaced by 65,536 of `x` when it is read, so the file stays small. */
export const PAD = '@@PAD@@';
export const rawOf = (h) => h.raw.replaceAll(PAD, 'x'.repeat(65_536));

const HOSTILE_AT = BASE;
const HONEST_BUCKETS = Object.freeze({
  'gemini-5h': { f: 0.75, resetAt: BASE + 2 * HOUR * 1000 },
  'gemini-weekly': { f: 0.6, resetAt: BASE + 4 * DAY * 1000 },
  '3p-5h': { f: 1, resetAt: BASE + 5 * HOUR * 1000 },
  '3p-weekly': { f: 0.9, resetAt: BASE + 6 * DAY * 1000 }
});
const honest = () => composePayload({ at: HOSTILE_AT, buckets: HONEST_BUCKETS });
const q = (id, f, r, d = 'null', a = 'false') => `${J(id)}:{"f":${f},"r":${r},"d":${d},"a":${a}}`;
const G5 = (f = '0.75', r = '"2030-01-01T02:00:00Z"', d, a) => q('gemini-5h', f, r, d, a);
const GW = q('gemini-weekly', '0.6', '"2030-01-05T00:00:00Z"');
const P5 = q('3p-5h', '1', '"2030-01-01T05:00:00Z"');
const PW = q('3p-weekly', '0.9', '"2030-01-07T00:00:00Z"');
const tail = (first, plan = J(PLAN), rest = [GW, P5, PW]) => `"p":${plan},"q":{${[...(first === null ? [] : [first]), ...rest].join(',')}}}`;

/**
 * Every hostile payload: `{ name, raw, close, tail, draws, why }`. `raw` is the
 * exact text on standard input; `close: false` is a standard input that never
 * closes; `tail` the kept line after its hash, or null when nothing may be
 * written; `draws` what the Gemini five hour window may draw from it, a used
 * percent, or null for no window at all.
 */
export function hostilePayloads() {
  const out = [];
  const add = (name, raw, tailText, draws, why, close = true) => out.push({ name, close, tail: tailText, draws, why, raw: typeof raw === 'string' ? raw : J(raw) });
  const edit = (f) => {
    const p = honest();
    f(p);
    return p;
  };
  const g5 = (f) => edit((p) => f(p.quota['gemini-5h']));

  add('honest', honest(), tail(G5()), 25, 'the control');
  add('reset at the epoch', g5((b) => (b.reset_time = '1970-01-01T00:00:00Z')), tail(G5('0.75', '"1970-01-01T00:00:00Z"')), null, 'a passed reset voids its window');
  add('reset at Go’s zero time', g5((b) => (b.reset_time = '0001-01-01T00:00:00Z')), tail(G5('0.75', '"0001-01-01T00:00:00Z"')), null, 'a passed reset voids its window');
  add('fraction NaN', J(honest()).replace('"remaining_fraction":0.75', '"remaining_fraction":NaN'), tail(G5('null')), null, 'NaN is not a JSON number');
  add('fraction 1e309', J(honest()).replace('"remaining_fraction":0.75', '"remaining_fraction":1e309'), tail(G5('1e309')), null, 'Infinity draws nothing');
  add('fraction -3', g5((b) => (b.remaining_fraction = -3)), tail(G5('-3')), null, 'the clamp alone would draw it as a FULL bar');
  add('fraction 1.5', g5((b) => (b.remaining_fraction = 1.5)), tail(G5('1.5')), null, 'over 1 is not a fraction');
  add('fraction 007', J(honest()).replace('"remaining_fraction":0.75', '"remaining_fraction":007'), tail(G5('null')), null, 'a number JSON refuses would make the kept line unparseable');
  add('fraction a string', g5((b) => (b.remaining_fraction = '0.5')), tail(G5('null')), null, 'a string is not a number');
  add('fraction an object', g5((b) => (b.remaining_fraction = { v: 0.5 })), tail(G5('null')), null, 'deeper than the bucket is not the fraction');
  add('fraction null', g5((b) => (b.remaining_fraction = null)), tail(G5('null')), null, 'absent is never zero');
  add('disabled at 1 beside a weekly 0', edit((p) => { p.quota['gemini-5h'].remaining_fraction = 1; p.quota['gemini-5h'].disabled = true; p.quota['gemini-weekly'].remaining_fraction = 0; }), tail(G5('1', undefined, 'true'), undefined, [q('gemini-weekly', '0', '"2030-01-05T00:00:00Z"'), P5, PW]), null, 'a disabled bucket draws nothing, and the spent week beside it is a full bar of its own');
  add('disabled a word', g5((b) => (b.disabled = 'no')), tail(G5('0.75', undefined, 'true')), null, 'anything but false or null reads as disabled');
  add('disabled false', g5((b) => (b.disabled = false)), tail(G5('0.75', undefined, 'false')), 25, 'the honest false');
  add('amount alone', edit((p) => (p.quota['gemini-5h'] = { remaining_amount: '5' })), tail(G5('null', 'null', 'null', 'true')), null, 'an amount is not a fraction');
  add('amount beside a fraction', g5((b) => (b.remaining_amount = '5')), tail(G5('0.75', undefined, 'null', 'true')), null, 'an amount draws nothing');
  add('no address', edit((p) => delete p.email), null, null, 'a file with no account is never written');
  add('address null', edit((p) => (p.email = null)), null, null, 'a file with no account is never written');
  add('address empty', edit((p) => (p.email = '')), null, null, 'a file with no account is never written');
  add('address an object', edit((p) => (p.email = { email: PERSON })), null, null, 'a file with no account is never written');
  add('address deeper only', edit((p) => { delete p.email; p.workspace.email = PERSON; }), null, null, 'only the top level says whose payload it is');
  add('address with escapes', edit((p) => (p.email = 'a"b\\c\né@example.com')), tail(G5()), 25, 'the raw JSON token is hashed and never kept');
  add('address as the plan', edit((p) => (p.plan_tier = PERSON)), tail(G5(), 'null'), 25, 'the plan word refuses @ and .');
  add('address as a reset', g5((b) => (b.reset_time = PERSON)), tail(G5('0.75', 'null')), 25, 'a reset holds no letter but T and Z');
  add('address as a bucket', edit((p) => (p.quota[PERSON] = { remaining_fraction: 0.1 })), tail(G5()), 25, 'an unknown id is dropped');
  add('a third group and an id that differs by case', edit((p) => { p.quota['argon-5h'] = { remaining_fraction: 0.2 }; p.quota['Gemini-5h'] = { remaining_fraction: 0.2 }; p.quota['gemini-5h '] = { remaining_fraction: 0.2 }; }), tail(G5()), 25, 'the ids are compiled and matched exactly');
  add('keys spelled with an escape', J(honest()).replace('"gemini-5h"', '"gemini\\u002d5h"'), tail(null), null, 'a key is matched as it is written, so an escaped bucket is dropped');
  add('the address key spelled with an escape', J(honest()).replace('"email"', '"em\\u0061il"'), null, null, 'a key is matched as it is written, so there is no account');
  add('only unknown buckets', edit((p) => (p.quota = { 'argon-5h': { remaining_fraction: 0.2 } })), null, null, 'nothing this app knows');
  add('a bucket inside the title', edit((p) => (p.conversation_title = '"quota":{"gemini-5h":{"remaining_fraction":0.01}},"email":"other@example.org"')), tail(G5()), 25, 'a title is text');
  add('a quota nested elsewhere', edit((p) => { p.workspace.quota = { 'gemini-5h': { remaining_fraction: 0.01 } }; p.quota['gemini-5h'].sub = { remaining_fraction: 0.02 }; }), tail(G5()), 25, 'only the top level quota is the quota');
  add('quota empty', edit((p) => (p.quota = {})), null, null, 'nothing this app knows');
  add('quota null', edit((p) => (p.quota = null)), null, null, 'absent is never zero');
  add('quota an array', edit((p) => (p.quota = [{ 'gemini-5h': { remaining_fraction: 0.2 } }])), null, null, 'not the documented shape');
  add('an array at the top', `[${J(honest())}]`, null, null, 'not one object');
  add('truncated', J(honest()).slice(0, -40), null, null, 'not a whole document');
  add('one brace short', J(honest()).slice(0, -1), null, null, 'every field was read and the document still never closed');
  add('two objects', `${J(honest())}${J(honest())}`, null, null, 'not one object');
  add('trailing junk', `${J(honest())} x`, null, null, 'not one object');
  add('empty', '', null, null, 'nothing at all');
  add('garbage', '\u0001{{{ "quota"', null, null, 'not JSON');
  add('pretty printed', JSON.stringify(honest(), null, 2), tail(G5()), 25, 'white space is nothing');
  add('carriage returns', JSON.stringify(honest(), null, 1).replaceAll('\n', '\r\n'), tail(G5()), 25, 'white space is nothing');
  add('a shell in the title', edit((p) => (p.conversation_title = '$(/usr/bin/touch p374-pwned) `id` %s %n \' " ; rm -rf . # \\')), tail(G5()), 25, 'nothing of the payload is ever run or formatted');
  add('64 KB', edit((p) => (p.pad = PAD)), null, null, 'over the bound, and the bound is why a huge payload costs nothing');
  add('100 deep', `${J(honest()).slice(0, -1)},"z":${'['.repeat(100)}${']'.repeat(100)}}`, null, null, 'over the depth');
  add('standard input that never closes', J(honest()), null, null, 'agy kills it at its next run or at 5 s; nothing is left behind', false);
  return out;
}

// ---------------------------------------------------------------------------
// The refusal
// ---------------------------------------------------------------------------

const ALLOWED_NUMBERS = new Set([0, 1, 5, 10, 80, 99, 100, 120, 1_000_000]);
const isInstant = (s) => /^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9:]{8}Z$/.test(s) && Date.parse(s) >= BASE && Date.parse(s) <= BASE_END;

/** Walk every leaf of a RECORDING's lines and throw on one this file did not invent. */
export function refuseForeign(lines, foreign = new Set()) {
  const strings = new Set([...Object.values(STRINGS), ...STATES, ...MODES]);
  const walk = (v, at) => {
    if (v === null || typeof v === 'boolean') return;
    if (typeof v === 'string') {
      if (!strings.has(v) && !isInstant(v)) throw new Error(`make-fixtures: REFUSED. ${at} holds a string this file did not invent`);
      if (foreign.has(v)) throw new Error(`make-fixtures: REFUSED. ${at} holds a string of the recording`);
      return;
    }
    if (typeof v === 'number') {
      if (at.endsWith('.remaining_fraction')) {
        if (!allFractions.has(v)) throw new Error(`make-fixtures: REFUSED. ${at} holds a fraction this file did not invent`);
      } else if (at.endsWith('.reset_in_seconds')) {
        if (!Number.isInteger(v) || v < 0 || v > 8 * DAY) throw new Error(`make-fixtures: REFUSED. ${at} is no countdown on the invented epoch`);
      } else if (at.endsWith('.t') || at.endsWith('.run')) {
        if (!Number.isInteger(v) || v < 0 || v > 3_600_000) throw new Error(`make-fixtures: REFUSED. ${at} is no spacing`);
      } else if (!ALLOWED_NUMBERS.has(v)) throw new Error(`make-fixtures: REFUSED. ${at} holds a number this file did not invent`);
      if (v !== 1 && foreign.has(String(v))) throw new Error(`make-fixtures: REFUSED. ${at} holds a number of the recording`);
      return;
    }
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${String(i)}]`));
    else for (const [k, x] of Object.entries(v)) walk(x, `${at}.${k}`);
  };
  lines.forEach((l, i) => walk(l, `line ${String(i + 1)}`));
}

// ---------------------------------------------------------------------------
// The readers every probe, test and gate uses
// ---------------------------------------------------------------------------

/** One committed recording, `launch` or `resume`, as its lines. */
export const readRecording = (name) => linesOf(join(FIXTURES, `${name}.jsonl`));
export const readHostile = () => JSON.parse(readFileSync(join(FIXTURES, 'hostile.json'), 'utf8')).payloads;
export const readExpect = () => JSON.parse(readFileSync(join(FIXTURES, 'expect.json'), 'utf8'));

/**
 * A recorded payload moved from the invented epoch to one a running app can
 * draw: every reset shifted by the same whole seconds, `origin - BASE`. ONE
 * origin for a whole replay, because a reset that moved with the run it was
 * replayed in would be a changed field, and the script would then write on
 * every run. The countdown is left as recorded.
 */
export function rebase(line, origin) {
  const p = JSON.parse(J(line.payload));
  const shift = Math.floor(origin / 1000) * 1000 - BASE;
  for (const b of Object.values(p.quota ?? {})) b.reset_time = iso(Date.parse(b.reset_time) + shift);
  return p;
}

// ---------------------------------------------------------------------------
// The file itself
// ---------------------------------------------------------------------------

const textOf = (lines) => `${lines.map((l) => J(l)).join('\n')}\n`;
const hostileText = () => `${JSON.stringify({ note: 'Phase 374. Every value invented by build/p374/make-fixtures.mjs. @@PAD@@ stands for 65,536 x.', payloads: hostilePayloads() }, null, 1)}\n`;
const expectText = (byName) => `${JSON.stringify({ note: 'What a reader must hold after each run, from invented values alone.', ...Object.fromEntries(Object.entries(byName).map(([n, lines]) => [n, expectOf(lines)])) }, null, 1)}\n`;

/** The refusal is shown refusing, on one planted value of every kind a recording could carry. */
function refusalProblems() {
  const line = () => ({ run: 1, t: 0, mode: 'normal', payload: composePayload({ at: BASE, buckets: { 'gemini-5h': { f: 0.7125, resetAt: BASE + HOUR * 1000 } } }) });
  const plants = {
    'a fraction off the ladder': (l) => (l.payload.quota['gemini-5h'].remaining_fraction = 0.71251),
    'a reset off the epoch': (l) => (l.payload.quota['gemini-5h'].reset_time = '2026-01-01T00:00:00Z'),
    'a countdown past a week': (l) => (l.payload.quota['gemini-5h'].reset_in_seconds = 9 * DAY),
    'an address': (l) => (l.payload.email = 'someone@example.net'),
    'a plan word': (l) => (l.payload.plan_tier = 'Some Plan'),
    'a folder': (l) => (l.payload.cwd = '/Users/someone/work'),
    'an id': (l) => (l.payload.session_id = '00000000-0000-4000-8000-000000000000'),
    'a title': (l) => (l.payload.conversation_title = 'words'),
    'a version': (l) => (l.payload.version = '9.9.9'),
    'a wall clock': (l) => (l.t = BASE),
    'a token count': (l) => (l.payload.context_window.total_input_tokens = 123)
  };
  const out = [];
  try {
    refuseForeign([line()]);
  } catch {
    out.push('the refusal refuses an invented line');
  }
  for (const [name, plant] of Object.entries(plants)) {
    const l = line();
    plant(l);
    try {
      refuseForeign([l]);
      out.push(`the refusal let ${name} through`);
    } catch {
      /* refused, as it must be */
    }
  }
  try {
    refuseForeign([line()], new Set(['0.7125']));
    out.push('the refusal let a number of the recording through');
  } catch {
    /* refused, as it must be */
  }
  return out;
}

export function problems(from) {
  const out = refusalProblems();
  const byName = {};
  for (const name of ['launch', 'resume']) {
    const path = join(FIXTURES, `${name}.jsonl`);
    if (!existsSync(path)) {
      out.push(`${name}.jsonl is missing`);
      continue;
    }
    byName[name] = readRecording(name);
    try {
      refuseForeign(byName[name]);
    } catch (err) {
      out.push(String(err.message));
    }
    if (from !== null) {
      const made = redact(name, name === 'launch' ? shapeOfLaunch(from) : shapeOfResume(from));
      refuseForeign(made.lines, made.foreign);
      if (readFileSync(path, 'utf8') !== textOf(made.lines)) out.push(`${name}.jsonl is not what its recording gives`);
    }
  }
  if (readFileSync(join(FIXTURES, 'hostile.json'), 'utf8') !== hostileText()) out.push('hostile.json is not what this file writes');
  if (Object.keys(byName).length === 2 && readFileSync(join(FIXTURES, 'expect.json'), 'utf8') !== expectText(byName)) out.push('expect.json is not what this file derives');
  return out;
}

function main(argv) {
  const at = argv.indexOf('--from');
  const from = at === -1 ? null : resolve(argv[at + 1] ?? '');
  if (argv.includes('--check')) {
    const bad = problems(from);
    for (const b of bad) process.stderr.write(`[p374-fixtures] ${b}\n`);
    if (bad.length === 0) process.stdout.write(`[p374-fixtures] PASS: ${['launch', 'resume'].map((n) => `${n} ${String(readRecording(n).length)} runs`).join(', ')}, ${String(readHostile().length)} hostile payloads, every value invented and the refusal shown refusing 12 plants${from === null ? '' : ', byte for byte what the recordings give'}\n`);
    return bad.length === 0 ? 0 : 1;
  }
  mkdirSync(FIXTURES, { recursive: true });
  writeFileSync(join(FIXTURES, 'hostile.json'), hostileText());
  if (argv.includes('--hostile')) return 0;
  if (from === null) {
    process.stderr.write('[p374-fixtures] name the recordings with --from <dir>\n');
    return 2;
  }
  const made = { launch: redact('launch', shapeOfLaunch(from)), resume: redact('resume', shapeOfResume(from)) };
  // Nothing is written until BOTH have passed the refusal.
  for (const m of Object.values(made)) refuseForeign(m.lines, m.foreign);
  for (const [name, m] of Object.entries(made)) writeFileSync(join(FIXTURES, `${name}.jsonl`), textOf(m.lines));
  writeFileSync(join(FIXTURES, 'expect.json'), expectText({ launch: made.launch.lines, resume: made.resume.lines }));
  for (const [name, m] of Object.entries(made)) {
    const e = expectOf(m.lines);
    process.stdout.write(`[p374-fixtures] ${name}: ${String(e.runs)} runs, ${String(e.withQuota)} with quota, ${String(e.writes)} writes\n`);
  }
  return 0;
}

const isEntry = () => {
  try {
    return process.argv[1] !== undefined && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
};
if (isEntry()) process.exit(main(process.argv.slice(2)));
