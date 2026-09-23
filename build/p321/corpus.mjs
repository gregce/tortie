/**
 * build/p321/corpus.mjs — the banked real-agent recordings Phase 321 measures
 * its question shapes against, their pins, their loaders, and the labels of
 * every question in them (build/p321/SPEC.md §2; research 129 §8).
 *
 * THE RECORDINGS ARE NOT IN THIS REPOSITORY AND NEVER WILL BE. They are real
 * agent output under the operator's own sign-ins, and they disclose: the
 * scratch path names his account, gemini's banner names skills under his home,
 * antigravity's banner draws his account address and plan, the footers name
 * the models he runs, omp and pi print his MCP servers and skills, the process
 * tables name his MCP servers, and the key events hold the prompts that were
 * typed (SPEC §2.2). This file names each file by its path under the corpus
 * root and pins its sha256, and `corpusFile` refuses a file whose name is not
 * pinned or whose bytes moved. The corpus root is `P321_CORPUS` and nothing
 * else: no default path is written here, because the place the recordings sit
 * names an account (the Phase 319 fix round took the same path out of its tree).
 *
 * NOTHING HERE PRINTS A BYTE OF A RECORDING. The loaders hand captures, byte
 * chunks, key TIMES and process tables to their callers; what leaves this
 * module for a report is times, counts and the labels below. The key loader
 * hands out times only, never what was typed, because what was typed is a
 * prompt.
 *
 * ## The labels, and how they were derived (SPEC §2.3 and §2.4)
 *
 * By hand, from the capture streams and the key events, and NEVER from a
 * detector, the numbered verdict and the Phase 321 shapes included. For each of
 * the 17 question instances this file carries the recording, a name, and the
 * question's LIVE MARKS: the agent's own text that is drawn only while that
 * question waits, read by eye from the last capture before each answering key
 * and from the first capture after it. Then, mechanically:
 *
 *   - DRAWN is the first capture (at or after `after` seconds, which separates
 *     a second question of the same kind) on which the live marks are drawn;
 *   - ANSWERED is the first key event for that agent after DRAWN;
 *   - every capture in [DRAWN, ANSWERED) is `question`, and every one of them
 *     must carry the live marks (a capture that does not is counted as a hole
 *     and reported, never relabelled);
 *   - from ANSWERED, every capture that still carries the live marks is
 *     `answering`, up to the first that does not;
 *   - every other capture is `not-question`.
 *
 * The live marks are the question's own text AND its live hint, and for
 * gemini's gate also that the box is the last thing drawn, because gemini
 * leaves its ANSWERED gate on screen, hint and all, for about three seconds
 * while it restarts, with `Gemini CLI is restarting to apply the trust
 * changes...` drawn under the box (a/gemini +40.42, +41.48 and +42.42). Those
 * three are not a question, which is SPEC §1.2 item 3; cursor's answered trust
 * box, which keeps its option rows and loses its `▶` and its hint, is the same
 * rule's other case (SPEC §3.2, the trap).
 *
 * `drawnBytes` and `lastWriteBeforeAnswer` come off the byte timeline: the
 * earliest chunk between the last capture before DRAWN and DRAWN whose text,
 * escapes stripped, carries a phrase of the question (or the last chunk in that
 * gap), and the agent's last chunk before ANSWERED. They are what the verifier
 * computes raisability from (SPEC §1.2 item 4). Every time is in seconds from
 * the stream's FIRST CAPTURE, which is the capture clock SPEC §2.3 uses.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The corpus root, from `P321_CORPUS` only. The directory holds `a/rec`,
 * `adv1/rec`, `rec` and `adv2`, laid out as research 129 left them.
 */
export function corpusRoot() {
  const env = (process.env['P321_CORPUS'] ?? '').trim();
  if (env === '') {
    throw new Error(
      'P321_CORPUS is not set. The real-agent recordings live outside the repository; set it to the directory ' +
        'that holds a/rec, adv1/rec, rec and adv2 (build/p321/SPEC.md §2.1).'
    );
  }
  return env;
}

/**
 * Every file this phase reads, and its sha256 as build/p321/SPEC.md §2.1 pins
 * it (re-hashed 2026-09-23; the first 33 are the ones Phase 319 pinned).
 */
export const CORPUS_SHA256 = Object.freeze({
  'a/rec/antigravity.bytes.jsonl': '6fe3bd8223072d9697a534d6b845bd65a413a3c73c1e60f965d0b8a5914feca0',
  'a/rec/captures.jsonl': '93e7fe8eca273b2805c55fd8d025a0c905e8cc2e274cc4ee562db43c63a6dc82',
  'a/rec/claude.bytes.jsonl': '3f15606b3a87e22723dd934921d957bb31e355e4d47b99c894e9c7c848df5586',
  'a/rec/codex.bytes.jsonl': '3d8cb10943d781433f21c085409926a1814edf70dc06c121b9c49fc464e7944d',
  'a/rec/cursor.bytes.jsonl': 'e83c7d9a84839b9219959c6380e014b30d6094366dc995c9ff2b619aacaa2ea1',
  'a/rec/events.jsonl': 'd3fb91fbcd1380f4c17134f92ac289b10a7abdbaae7766597750d4af83242fe8',
  'a/rec/gemini.bytes.jsonl': '140f453a69bf1483b776230a12805a5497c47ac9bca477b605f8b20df23b6a6e',
  'a/rec/grok.bytes.jsonl': '39e1a7a8f192b72a686f19ceb482341ad926391f8f894fa0e0422833f40cb46e',
  'a/rec/omp.bytes.jsonl': 'c2f0539058747f767f90127659d04ecbbee7c47d1917ea17c697b671b62c0c77',
  'a/rec/opencode.bytes.jsonl': '5f21d9cfe18f41382bfce97bf1c7e86c89b03c3ced16bcf4bab8883222deba0e',
  'a/rec/pi.bytes.jsonl': 'b4f7d819ded132fa56fdc9a0f5673b993ff8bab29616c140d87ce163d6990d3a',
  'a/rec/ps.jsonl': '950d69b80179e3356eee28b19ae1b3765f6dffb1dccc08b7956228041ec68f17',
  'a/rec/qwen.bytes.jsonl': '7edfd0b8e0bf566ec721a3a7a5a73c8c98521cfae2be495ebba0bcc8853bb895',
  'a/rec/panes.jsonl': '640d8cd0a375f5dbe9beba5d56b3ea7c2764e86ca9bb192a91f8de6912c85eea',
  'a/rec/status.jsonl': '2971a21441c30e64a8ce28981867dfa41db79d1004c283eabbd36a6d984f40e3',
  'a/rec/launches.jsonl': 'a4eafe2ab5c9d1e3109b03166ba4b278b6fc5e0525bb94f57e9699b683bf70f6',
  'a/rec/choice.jsonl': '95a3d10f6e15a3025005bfcc0d34d9b407f47cee7e90cbb966b945bf11668279',
  'adv1/rec/focus-caps.jsonl': '0d7a319621262babe7e01acad43b49d85af789943aed96eadd1a1dca82f6e640',
  'adv1/rec/focus-cursor.bytes.jsonl': 'd659cca5a19bf319c67ecaa79314d7da0fe89efed5b05771cc707337ff14fb70',
  'adv1/rec/focus-events.jsonl': '894284503f4046dc836f6e84ef3ec5dfd7b391fdae8dba27897d2d022a03c009',
  'adv1/rec/focus-grok.bytes.jsonl': 'a3b6e62dbb0c9b9cc9fe2f877b2ed88ada831c7b0f28e9f2a5822bcd833afeb8',
  'adv1/rec/focus-ps.jsonl': 'cea1d7a084f018aa6b0d4fb4e56becbaa40eea66d393d3f45ce3f15117ba918c',
  'adv1/rec/focus-qwen.bytes.jsonl': 'f2802b6d6bddaa113903ce63547f4e9a818a62f66c36c9448830b175c4061122',
  'rec/cursor-agent-caps.jsonl': '065c4bc39b18fbfc8a01d2a4225b6267c6f0221054db66aad65c9e7e7b29c230',
  'rec/cursor-agent-events.jsonl': '6d6546af3ab11c1729009aecb8d22a5b22028656b78ecb0d0d0c7b6a225bc99b',
  'rec/cursor-agent.jsonl': 'c8fb8e666ce9955144893caf985308c8224ac273476bea05dc362741df50f549',
  'rec/gemini-caps.jsonl': '891126e7647d3ce4aff8d8e109ee0fe579b1b7601871bc04c6b63796b53d9eb4',
  'rec/gemini-events.jsonl': '950178a09b3cea3c4a51f9bc6ae2485d1189f0b58a620dfd8bd391e0e37b69d1',
  'rec/gemini.jsonl': '9ee574ec364bccc77b3d53841b13a25fef7782eb8de3261e9c3adf4dc4884b53',
  'rec/grok-caps.jsonl': '217dadcbf9d81f547c4f1e3e0583b99ab137e227f6b82d01c3f4f2a3ac8cfda6',
  'rec/grok-events.jsonl': '2ec6a6d1a431d425c6868ebc867bed4dc7eb7b12028956de3c5ad3f17f57d6f7',
  'rec/grok.jsonl': '5b1acd5b104a77e9788e2ad20bdeb1537f59a85afcffa73fd6c5d133804a2b5d',
  'rec/qwen-caps.jsonl': 'b9a10442f334f834cd65472a8e0f1bb284151f835211967473cc0a0fbda64a7f',
  'rec/qwen-events.jsonl': 'c80d8a9394fa045990d8aaf6e64ac0f6f9dde63bac376398f9e7c7bf1ce64644',
  'rec/qwen.jsonl': '95e8b213249f405cdbbfb8753ed0b8fff16ba9c98a57851bbee1fd35fa4e98b8',
  'adv2/real-pi-70.txt': 'a1b577be8e0230988d423f354e2d1af698f6bcb275074f1746d6b8dc5bbee237',
  'adv2/real-pi-160x40.txt': '50bd8d655d13d05ea0ee827cea4cda77affab8ad9cab9a33060b0edf104cff35'
});

/** Read one corpus file, refusing a name that is not pinned and bytes that moved. */
export function corpusFile(rel) {
  const want = CORPUS_SHA256[rel];
  if (want === undefined) throw new Error(`${rel} is not a pinned corpus file (build/p321/SPEC.md §2.1)`);
  const path = join(corpusRoot(), rel);
  if (!existsSync(path)) {
    throw new Error(`${rel} is missing under P321_CORPUS. Set it to where the recordings were moved (build/p321/SPEC.md §2.1).`);
  }
  const bytes = readFileSync(path);
  const got = createHash('sha256').update(bytes).digest('hex');
  if (got !== want) {
    throw new Error(`${rel} does not match its pinned sha256 (${got.slice(0, 12)} against ${want.slice(0, 12)}); refused`);
  }
  return bytes.toString('utf8');
}

/** Every pinned file checked once: `{ ok, missing, moved }`, names only. */
export function verifyCorpus() {
  const missing = [];
  const moved = [];
  for (const [rel, want] of Object.entries(CORPUS_SHA256)) {
    const path = join(corpusRoot(), rel);
    if (!existsSync(path)) {
      missing.push(rel);
      continue;
    }
    const got = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (got !== want) moved.push(rel);
  }
  return { ok: missing.length === 0 && moved.length === 0, missing, moved };
}

const jsonl = (rel) =>
  corpusFile(rel)
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));

// ---------------------------------------------------------------------------
// The recordings
// ---------------------------------------------------------------------------

/**
 * The seventeen capture streams. `agent` is the registry id whose activity
 * profile reads the recording. `source` is research 129's run: `a` is
 * investigator A's live run at 160x45, `adv1` adversary 1's held focus-out run
 * at 160x45, `b` investigator B's at 120x40. `caps` says where the captures
 * are, `keys` where the person's input is, `bytes` the byte timeline, `ps` the
 * recorded process table (B recorded none).
 */
export const RECORDINGS = Object.freeze([
  ...['gemini', 'cursor', 'qwen', 'pi', 'omp', 'grok', 'opencode', 'antigravity', 'claude', 'codex'].map((agent) => ({
    id: `a/${agent}`,
    source: 'a',
    agent,
    size: [160, 45],
    caps: { file: 'a/rec/captures.jsonl', name: `rec-${agent}` },
    keys: { file: 'a/rec/events.jsonl', agent },
    bytes: `a/rec/${agent}.bytes.jsonl`,
    ps: { file: 'a/rec/ps.jsonl', name: `rec-${agent}` }
  })),
  ...['cursor', 'qwen', 'grok'].map((agent) => ({
    id: `adv1/${agent}`,
    source: 'adv1',
    agent,
    size: [160, 45],
    caps: { file: 'adv1/rec/focus-caps.jsonl', agent },
    keys: { file: 'adv1/rec/focus-events.jsonl', agent },
    bytes: `adv1/rec/focus-${agent}.bytes.jsonl`,
    ps: { file: 'adv1/rec/focus-ps.jsonl', agent }
  })),
  ...[
    ['cursor', 'cursor-agent'],
    ['gemini', 'gemini'],
    ['qwen', 'qwen'],
    ['grok', 'grok']
  ].map(([agent, stem]) => ({
    id: `b/${agent}`,
    source: 'b',
    agent,
    size: [120, 40],
    caps: { file: `rec/${stem}-caps.jsonl` },
    keys: { file: `rec/${stem}-events.jsonl` },
    bytes: `rec/${stem}.jsonl`,
    ps: null
  }))
]);

/**
 * Adversary 2's pi answer at two widths (research 129 §5 item 13): one capture
 * each, not a stream, and labelled `not-question` because pi has no question
 * (research 129 §2.2). Pinned in §2.1 and run through the same pass.
 */
export const SINGLE_SCREENS = Object.freeze([
  { id: 'adv2/pi-70', source: 'adv2', agent: 'pi', file: 'adv2/real-pi-70.txt' },
  { id: 'adv2/pi-160x40', source: 'adv2', agent: 'pi', file: 'adv2/real-pi-160x40.txt' }
]);

export function recordingById(id) {
  const r = RECORDINGS.find((x) => x.id === id);
  if (r === undefined) throw new Error(`no recording ${id}`);
  return r;
}

/** One stream's captures, `{ t, text }` in capture order, `t` in epoch ms. */
export function loadCaptures(id) {
  const rec = recordingById(id);
  const { file } = rec.caps;
  let out;
  if (rec.source === 'a') {
    out = [];
    for (const line of corpusFile(file).split('\n')) {
      if (line.length === 0 || !line.includes(`"${rec.caps.name}"`)) continue;
      const c = JSON.parse(line);
      if (c.name === rec.caps.name) out.push({ t: Number(c.t), text: c.text });
    }
  } else if (rec.source === 'adv1') {
    out = jsonl(file)
      .filter((c) => c.agent === rec.caps.agent)
      .map((c) => ({ t: Number(c.t), text: c.text }));
  } else {
    out = jsonl(file).map((c) => ({ t: Number(c.t), text: c.s }));
  }
  return out.sort((a, b) => a.t - b.t);
}

/** One single screen's text (`SINGLE_SCREENS`). */
export function loadSingleScreen(id) {
  const s = SINGLE_SCREENS.find((x) => x.id === id);
  if (s === undefined) throw new Error(`no single screen ${id}`);
  return corpusFile(s.file);
}

/**
 * The times of the person's input to one agent, epoch ms, ascending. TIMES
 * ONLY: what was typed is a prompt and never leaves this module. B's events
 * file also holds the harness's own bookkeeping (`launched`, `startup-dialog`,
 * `settled`, `no-question`, `done`, `cleaned`, `unknown-startup-screen`), which
 * is not input and is left out by name.
 */
const B_INPUT_KINDS = new Set(['startup-dialog-answered', 'typing', 'submitted', 'deny']);
export function keyTimes(id) {
  const rec = recordingById(id);
  let t;
  if (rec.source === 'a') {
    t = jsonl(rec.keys.file)
      .filter((e) => e.agent === rec.keys.agent)
      .map((e) => Number(e.t));
  } else if (rec.source === 'adv1') {
    t = jsonl(rec.keys.file)
      .filter((e) => e.kind === 'keys' && e.agent === rec.keys.agent)
      .map((e) => Number(e.t));
  } else {
    t = jsonl(rec.keys.file)
      .filter((e) => B_INPUT_KINDS.has(e.kind))
      .map((e) => Number(e.t));
  }
  return t.sort((a, b) => a - b);
}

/**
 * Every text typed or pasted into any recorded agent, for ONE use: the
 * disclosure scan in `build/p321/screens.mts`, which refuses a committed row
 * that carries a run of a typed prompt. Never print what this returns, never
 * write it anywhere, and never use it to label anything.
 */
export function typedTextsForScan() {
  const out = [];
  const take = (keys) => {
    for (const k of Array.isArray(keys) ? keys : [keys]) if (typeof k === 'string' && k.length >= 16) out.push(k);
  };
  for (const e of jsonl('a/rec/events.jsonl')) take(e.keys);
  for (const e of jsonl('adv1/rec/focus-events.jsonl')) if (e.kind === 'keys') take(e.keys);
  return out;
}

/** One stream's byte chunks, `{ t, buf }` with `t` in epoch ms, in write order. */
export function loadBytes(id) {
  const rec = recordingById(id);
  return jsonl(rec.bytes)
    .map((c) => ({ t: Number(c.t), buf: Buffer.from(c.b, 'base64') }))
    .sort((a, b) => a.t - b.t);
}

/**
 * One stream's recorded process table, `{ t, rows }`, rows as `[pid, ppid,
 * cputime, stat, comm]`, or null for B's streams, which recorded none. The
 * `comm` column names his MCP servers: never print it.
 */
export function loadProcessSamples(id) {
  const rec = recordingById(id);
  if (rec.ps === null) return null;
  const all = jsonl(rec.ps.file);
  const mine = rec.ps.name !== undefined ? all.filter((s) => s.name === rec.ps.name) : all.filter((s) => s.agent === rec.ps.agent);
  return mine.map((s) => ({ t: Number(s.t), rows: s.rows }));
}

// ---------------------------------------------------------------------------
// The questions, by hand
// ---------------------------------------------------------------------------

/** The last inked row of a capture, untrimmed. */
function lastInkedRow(text) {
  const lines = text.split('\n');
  while (lines.length > 0 && (lines[lines.length - 1] ?? '').trim() === '') lines.pop();
  return lines[lines.length - 1] ?? '';
}

const all = (...res) => (text) => res.every((re) => re.test(text));

/**
 * gemini's live gate: its question, and its box's bottom border as the last
 * thing drawn. Answered, the box stays drawn with gemini's restart line and
 * then its input box below it (read by eye, a/gemini +40.42 to +42.42).
 */
const geminiGateLive = (text) => /Do you trust the files in this folder\?/.test(text) && /^\s*╰─+╯\s*$/.test(lastInkedRow(text));
/** cursor's live trust gate: the `▶` on one of its keyed rows and its `Enter to select` hint (a/cursor +3.02 and +40.38). */
const cursorTrustLive = all(/▶ \[[aq]\] /, /Enter to select/);
/** cursor's live permission: its header and the reject row's key (a/cursor +70.42 and +89.43). */
const cursorRunLive = all(/Run this command\?/, /\(esc or n\)/);
/** qwen's live confirmation: what it asks and its wait row (a/qwen +361.65 and +379.68). */
const qwenLive = all(/Allow execution of: /, /Waiting for user confirmation\.\.\./);
/** antigravity's live run permission: its header and its navigation hint (a/antigravity +72.42 and +88.43). */
const agyRunLive = all(/Requesting permission for:/, /↑\/↓ Navigate/);

/**
 * The 17 question instances (SPEC §2.3). `live` is the hand-read mark set,
 * `after` (seconds from the first capture) separates a second question of the
 * same kind from the first, `raisable` is SPEC §1.2 item 4.
 */
export const QUESTIONS = Object.freeze([
  { rec: 'a/gemini', q: 'trust gate', phrase: /trust the files/, live: geminiGateLive, raisable: true },
  { rec: 'a/cursor', q: 'workspace trust', phrase: /Trust this workspace/, live: cursorTrustLive, raisable: true },
  { rec: 'a/cursor', q: 'run permission 1', phrase: /Run this command/, live: cursorRunLive, raisable: true },
  { rec: 'a/cursor', q: 'run permission 2', phrase: /Run this command/, live: cursorRunLive, after: 90, raisable: true },
  { rec: 'a/qwen', q: 'run permission 1 (Ask mode)', phrase: /Allow execution/, live: qwenLive, raisable: true },
  { rec: 'a/qwen', q: 'run permission 2 (Ask mode)', phrase: /Allow execution/, live: qwenLive, after: 380, raisable: true },
  {
    rec: 'a/opencode',
    q: 'an outside folder',
    phrase: /Permission required/,
    live: all(/△ Permission required/, /enter confirm/),
    raisable: true
  },
  {
    rec: 'a/antigravity',
    q: 'folder trust',
    phrase: /trust the contents/,
    live: all(/Do you trust the contents of this project\?/, /↑\/↓ Navigate/),
    raisable: true
  },
  { rec: 'a/antigravity', q: 'run permission 1', phrase: /Requesting permission/, live: agyRunLive, raisable: true },
  { rec: 'a/antigravity', q: 'run permission 2', phrase: /Requesting permission/, live: agyRunLive, after: 90, raisable: true },
  {
    rec: 'a/claude',
    q: 'folder trust (2.1.280)',
    phrase: /you created or one you trust/,
    live: all(/Is this a project you created/, /Enter to confirm · Esc to cancel/),
    raisable: true
  },
  {
    rec: 'a/codex',
    q: 'update prompt',
    phrase: /Update available/,
    live: all(/Update available!/, /Press enter to continue/),
    raisable: true
  },
  {
    rec: 'adv1/cursor',
    q: 'workspace trust',
    phrase: /Trust this workspace/,
    live: cursorTrustLive,
    raisable: false,
    why: 'answered 0.59 s after it was drawn, before a second capture could exist'
  },
  {
    rec: 'adv1/cursor',
    q: 'run permission',
    phrase: /Run this command/,
    live: cursorRunLive,
    raisable: false,
    why: 'answered 0.70 s after it was drawn, before a second capture could exist'
  },
  {
    rec: 'b/cursor',
    q: 'workspace trust',
    phrase: /Trust this workspace/,
    live: cursorTrustLive,
    raisable: true,
    why: 'up 5.4 s, so raisable at 1 s and at 2 s only on some tick phases; the verifier computes it per cadence'
  },
  { rec: 'b/cursor', q: 'run permission', phrase: /Run this command/, live: cursorRunLive, raisable: true },
  { rec: 'b/gemini', q: 'trust gate', phrase: /trust the files/, live: geminiGateLive, raisable: true }
]);

/** The streams with nothing to ask, named so a row says so rather than vanishing (SPEC §2.3). */
export const NO_QUESTION = Object.freeze({
  'a/pi': 'pi has no permission prompt (research 129 §2.2)',
  'a/omp': 'omp asked nothing',
  'a/grok': 'grok ran every command without asking in its default mode, including after four Shift+Tabs',
  'adv1/grok': 'grok ran every command without asking',
  'b/grok':
    'grok drew its start screen only; its telemetry opt-in banner sits ABOVE a live input box and blocks nothing, so it is not a question',
  'adv1/qwen': 'qwen in its default Auto mode asked nothing',
  'b/qwen': 'qwen in its default Auto mode asked nothing',
  'adv2/pi-70': "pi's answer at 70 columns, one capture",
  'adv2/pi-160x40': "pi's answer at 160 columns, one capture; the parent verdict reads it as a question"
});

/** Rows that cannot be measured from this corpus, stated rather than left out. */
export const NOT_MEASURABLE = Object.freeze({
  'gemini turns': 'no gemini request completed ("API key not valid" twice), so its working screens are its error screens',
  droid: 'droid is not installed on this Mac (research 129 §2.2)',
  'a grok question': 'none was recorded; grok asked nothing in its default mode'
});

/** Text of one byte chunk with escape sequences taken out, for a phrase search only. */
function chunkText(buf) {
  return buf
    .toString('utf8')
    .replace(/\u001b\[[0-9;?<=>]*[ -/]*[@-~]/g, ' ')
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, ' ')
    .replace(/\u001b[@-Z\\-_]/g, ' ');
}

const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Every capture of every stream labelled, and every instance's times. Returns
 * `{ streams, instances }`: `streams` maps a recording id to `{ captures,
 * labels, instanceOf }`, where `labels[i]` is `question`, `answering` or
 * `not-question` and `instanceOf[i]` is the index into `QUESTIONS` (or -1).
 */
export function deriveLabels() {
  const streams = new Map();
  for (const rec of RECORDINGS) {
    const captures = loadCaptures(rec.id);
    streams.set(rec.id, {
      captures,
      t0: captures[0]?.t ?? 0,
      labels: captures.map(() => 'not-question'),
      instanceOf: captures.map(() => -1)
    });
  }
  const instances = [];
  QUESTIONS.forEach((q, index) => {
    const s = streams.get(q.rec);
    const { captures, t0 } = s;
    const rel = (t) => (t - t0) / 1000;
    const di = captures.findIndex((c) => rel(c.t) >= (q.after ?? 0) && q.live(c.text));
    if (di < 0) throw new Error(`${q.rec} ${q.q}: its live marks are drawn in no capture`);
    const drawn = captures[di].t;
    const answered = keyTimes(q.rec).find((k) => k > drawn);
    if (answered === undefined) throw new Error(`${q.rec} ${q.q}: no key after it was drawn`);
    let i = di;
    let up = 0;
    let holes = 0;
    for (; i < captures.length && captures[i].t < answered; i++) {
      if (!q.live(captures[i].text)) holes++;
      s.labels[i] = 'question';
      s.instanceOf[i] = index;
      up++;
    }
    let answering = 0;
    for (; i < captures.length && q.live(captures[i].text); i++) {
      s.labels[i] = 'answering';
      s.instanceOf[i] = index;
      answering++;
    }
    const firstGone = i < captures.length ? captures[i].t : null;

    // The byte timeline.
    const chunks = loadBytes(q.rec);
    const before = di > 0 ? captures[di - 1].t : -Infinity;
    let drawnBytes = chunks.find((c) => c.t > before && c.t <= drawn && q.phrase.test(chunkText(c.buf)))?.t;
    let drawnBytesHow = 'the first chunk in the gap carrying the question';
    if (drawnBytes === undefined) {
      drawnBytes = [...chunks].reverse().find((c) => c.t > before && c.t <= drawn)?.t;
      drawnBytesHow = 'the last chunk in the gap';
    }
    const lastWrite = [...chunks].reverse().find((c) => c.t < answered)?.t;

    instances.push({
      recording: q.rec,
      question: q.q,
      drawn: round2(rel(drawn)),
      answered: round2(rel(answered)),
      drawnBytes: drawnBytes === undefined ? null : round2(rel(drawnBytes)),
      drawnBytesHow,
      lastWriteBeforeAnswer: lastWrite === undefined ? null : round2(rel(lastWrite)),
      capturesUp: up,
      holes,
      answering,
      firstCaptureWithoutIt: firstGone === null ? null : round2(rel(firstGone)),
      raisable: q.raisable,
      ...(q.why !== undefined ? { why: q.why } : {})
    });
  });
  return { streams, instances };
}
