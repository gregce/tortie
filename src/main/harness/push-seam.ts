/**
 * The push seam: a harness launch pairs a phone, keeps a scratch key and
 * drives the wake, all from files (Phase 314).
 *
 * ## What it is for
 *
 * Phase 314 builds the push sender, the key store, the wake rule and the alert,
 * and nothing in an ordinary launch composes them, because the only thing a
 * push can go to is a phone paired through Phase 313's door and that door is
 * switched on by nothing until Phase 316. `probe:p314` still has to drive the
 * whole chain INSIDE THE REAL APP — the blocked feed off the real core, the
 * door's own `/v1/blocked` rows, the shipping pairing path, the sealed key
 * store over the real `safeStorage`, the engine and the sender — so this
 * module composes exactly that, for a harness launch and for nothing else.
 *
 * It is the pattern two phases already ship: `./machine-seam.ts` (Phase 231),
 * a JSON command file re-read every 100 ms and applied once per `seq`, and
 * `./vault-drive.ts` (Phase 304), the shipping credential store driven inside
 * the real app under the same refusals.
 *
 * ## The shape
 *
 * `GMUX_HARNESS_PUSH=<dir>` names a directory holding two files.
 *
 * `<dir>/seed.json`, read ONCE at install:
 *
 *     { "key": { "keyId": "…", "teamId": "…", "topic": "…", "p8File": "<dir>/key.p8" },
 *       "phones": [ { "label": "A", "token": "<hex>", "environment": "development" } ],
 *       "origins": { "development": "http://127.0.0.1:<port>",
 *                    "production":  "http://127.0.0.1:<port>" },
 *       "alerts": true }
 *
 * `<dir>/commands.json`, re-read every 100 ms, `{ "seq": n, "commands": [...] }`,
 * each new `seq` applied once and in order, one printed line per applied
 * sequence, and a file that is not that shape dropped WHOLE with the reason
 * printed. The commands are listed at {@link PushSeamCommand}.
 *
 * ## The refusals, and there are SIX
 *
 * It installs NOTHING and prints NOTHING unless all of:
 *
 *  1. the launch is isolated (GMUX_SMOKE or GMUX_SHOT) or an armed probe run
 *     (GMUX_PROBES=1);
 *  2. GMUX_HARNESS_DIR is set and the profile sits inside it;
 *  3. `<dir>` sits inside GMUX_HARNESS_DIR;
 *  4. Chromium's MOCK KEYCHAIN is in force (`--use-mock-keychain`). This seam
 *     seals a key and a store, and without the mock a scratch-HOME launch
 *     reaches the person's real `Tortie Safe Storage` item, which is the
 *     2026-08-16 incident `../index.ts` records;
 *  5. every origin in `seed.json` is `http://127.0.0.1:<port>`. Anything else —
 *     a name, another address, `https:`, a path — refuses the seed whole, so
 *     this seam can never aim the sender at Apple or at anything off this Mac;
 *  6. the key file the seed names sits inside GMUX_HARNESS_DIR too, so the
 *     seam reads no file of the person's.
 *
 * Refusals 1 to 3 are `./vault-drive.ts`'s own, 4 and 5 are the ones
 * `build/p314/SPEC.md` §5.1 adds, and 6 is the vault drive's third refusal
 * applied to the one other file the seam opens. A variable left in a shell
 * profile never reaches a person's real app. In every ordinary launch the
 * variable is unset and this module returns on its first line.
 *
 * ## What it composes, and what it never does
 *
 * The SHIPPING modules, each unmodified: the blocked feed, `WakeMark` over a
 * drivable monitor (`../power/drivable-monitor.ts`, the power smoke's own), the
 * sealed key store (`apnsKeyStoreForApp`), a `PocketHost` with its bind address
 * pinned to loopback, the pairing window, the door's route composer, the
 * sender and the engine. Each phone is paired THROUGH THE SHIPPING PATH: the
 * window opened, a presentation sealed under the QR's one-shot secret, handed
 * to `present`, and allowed from the sheet's own lines and hash — the
 * acknowledgement is supplied inside `PocketHost`, as it always is.
 *
 * THE DOOR LISTENS FOR THE PAIRING ALONE, ON LOOPBACK, AND THEN IT IS SHUT
 * (Phase 316). Since QR v:2 a pairing window opens only on a listening door,
 * because the QR pins the key the door is listening with, so the seam walks the
 * sheet's own order — the switch on, the confirm, listening, pair — and then
 * switches the door off before the engine starts. It does so only when the
 * door's field address is `127.0.0.1`, which is the harness loopback override
 * (`GMUX_POCKET_LOOPBACK=1`, never in a packaged build); without it the seam
 * pairs nothing and says so, and `PocketHost.start` would refuse the bind
 * anyway, because a field of `127.0.0.1` is not the address `./bind.ts` would
 * choose. Every push the seam drives is therefore still "a push while the door
 * is down", which is the point: the push depends on the door's CONFIRMED
 * fields, not on its socket.
 * It never passes `allowRemote`. It never prints or logs a key byte, a device
 * token, a provider token or a payload: the lines it prints carry counts,
 * states, phone labels and the door's rows WITHOUT the question or the choices.
 *
 * ## Why the composition waits for a window
 *
 * The core boots lazily, and normal startup deliberately does several things
 * BEFORE it — the manifest refusal probe, the agent overlay read — so this seam
 * must not be the thing that boots it. It is installed before `dispatchHarness`
 * like its siblings, but it asks for the core only once the first window
 * exists, which is after startup has kicked the boot itself.
 */

import { app, BrowserWindow } from 'electron';
import { generateKeyPairSync } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { AgentRegistryId, Session } from '@shared/types';
import { getRegistryEntry } from '../agents/registry';
import {
  APNS_KEY_SLOT,
  apnsKeyDir,
  apnsKeyStoreForApp,
  type ApnsKeyStore,
  type ApnsProviderKey
} from '../credentials';
import { PocketHost, pocketFieldAddress } from '../pocket/ipc';
import {
  pocketConfirmStatus,
  readPocketStore,
  sealPresentationAsPhone
} from '../pocket/pairing';
import { createPocketRoutes, type PocketFacts } from '../pocket/routes';
import { drivableMonitor } from '../power/drivable-monitor';
import { WakeMark } from '../power/wake-mark';
import { createApnsSender, type ApnsEnvironment } from '../push/apns';
import { createPushEngine } from '../push/engine';
import { getGmuxCore } from '../sessions';
import { NOTHING_NEEDS_YOU } from '../tray/attention';
import { blockedSinceMap, installBlockedFeed, onBlockedChange } from '../tray/blocked-feed';
import { isInside } from './fold-stub';
import { isIsolatedLaunch } from './launch-gate';

/** Every line this seam prints begins with this, so a probe can wait on it. */
export const PUSH_SEAM_TAG = '[gmux-push-seam]';

/**
 * THE ONE STATUS WORD, and the cost of it is named.
 *
 * `build/p314/SPEC.md` §1.1 row 1: Phase 313's mechanism 8 was not built, so
 * main has no spelling of its own of `statusVisual`'s words, and the door reads
 * its word through the injected `PocketFacts.statusWord`. Only a `needs_input`
 * row can ever join the blocked set, so the only word the door's blocked rows,
 * and therefore the alert, can ever draw is `statusVisual`'s `needs_input` arm.
 * This seam is the one composer of `PocketFacts` in this phase and spells that
 * word once, here. `conformance:push` rule S1 holds it byte-equal to
 * `statusVisual`'s `case 'needs_input'` label, read as text.
 * Two spellings held equal by a gate is weaker than one spelling. Phase 316.1
 * made the move: the table is `src/shared/status-words.ts` and the door's
 * production composer (`../pocket/facts.ts`) reads it there. This harness-only
 * composer still spells its one word, because S1 and `ablation:p314`'s S1 arm
 * pin that literal; retiring it is a change to Phase 314's gate.
 */
const SEAM_STATUS_WORD = 'needs input';
/** `statusVisual`'s dot for the same arm, for the door row's `statusDot`. */
const SEAM_STATUS_DOT = 'attention';

/** How often the command file is read. 100 ms, so a probe waits on a line. */
export const PUSH_SEAM_POLL_MS = 100;

/** The most phones a seed may pair. A probe needs two. */
const SEED_PHONE_CAP = 8;

// ---------------------------------------------------------------------------
// The refusals
// ---------------------------------------------------------------------------

/**
 * The seam's own directory, or null when this launch may not use it.
 *
 * `mockKeychain` is a FUNCTION so an ordinary launch, whose variable is unset,
 * returns on the first line without asking Electron anything at all.
 */
export function pushSeamDir(
  env: NodeJS.ProcessEnv,
  userDataDir: string,
  mockKeychain: () => boolean
): string | null {
  const dir = env['GMUX_HARNESS_PUSH'] ?? '';
  if (dir === '') return null;
  // 1. An isolated launch or an armed probe run, and nothing else.
  if (!isIsolatedLaunch(env) && env['GMUX_PROBES'] !== '1') return null;
  // 2. A harness directory, and the profile inside it.
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '') return null;
  if (!isInside(userDataDir, harnessDir)) return null;
  // 3. The seam's own directory inside it too.
  if (!isInside(dir, harnessDir)) return null;
  // 4. The mock keychain, because this seam seals.
  if (!mockKeychain()) return null;
  return dir;
}

/** One phone the seed pairs. */
export interface PushSeedPhone {
  readonly label: string;
  /** Handed to the shipping pairing parser as is; it decides what a token is. */
  readonly token: string;
  readonly environment: ApnsEnvironment;
}

/** What `seed.json` holds, once it passed. */
export interface PushSeed {
  readonly key: {
    readonly keyId: string;
    readonly teamId: string;
    readonly topic: string;
    readonly p8File: string;
  };
  readonly phones: readonly PushSeedPhone[];
  readonly origins: Readonly<Record<ApnsEnvironment, string>>;
  readonly alerts: boolean;
}

/**
 * The ONE origin shape a seed may name: cleartext HTTP to 127.0.0.1 on a port.
 *
 * Not `localhost`, which is a NAME and resolves through whatever the machine
 * says; not `[::1]`, which the sender allows but no stand-in in this phase
 * binds; not `https:`, which is the shape of Apple's own origins.
 */
const LOOPBACK_ORIGIN = /^http:\/\/127\.0\.0\.1:([0-9]{1,5})$/;

/** True when `origin` is `http://127.0.0.1:<port>` with a port a socket can have. */
export function isSeamOrigin(origin: unknown): origin is string {
  if (typeof origin !== 'string') return false;
  const hit = LOOPBACK_ORIGIN.exec(origin);
  if (hit === null) return false;
  const port = Number(hit[1]);
  return Number.isInteger(port) && port >= 1 && port <= 65_535;
}

/**
 * Read one seed file's text, or answer why it is refused.
 *
 * REFUSED WHOLE. One origin that is not loopback, one phone that is not the
 * shape, or a key file outside the harness directory refuses the seed, because
 * a half-seeded run is an arm the probe cannot name.
 */
export function parsePushSeed(
  text: string,
  harnessDir: string
): { readonly seed: PushSeed; readonly reason: null } | { readonly seed: null; readonly reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { seed: null, reason: `not JSON: ${(err as Error).message}` };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { seed: null, reason: 'the top level is not an object' };
  }
  const top = parsed as Record<string, unknown>;

  // 5. The origins, both of them, and nothing but loopback.
  const origins = top['origins'];
  if (origins === null || typeof origins !== 'object' || Array.isArray(origins)) {
    return { seed: null, reason: 'origins is not an object' };
  }
  const o = origins as Record<string, unknown>;
  const names = Object.keys(o).sort();
  if (names.join(',') !== 'development,production') {
    return { seed: null, reason: 'origins must name development and production and nothing else' };
  }
  for (const env of ['development', 'production'] as const) {
    if (!isSeamOrigin(o[env])) {
      return { seed: null, reason: `origins.${env} is not http://127.0.0.1:<port>` };
    }
  }

  // The key, whose fields the SHIPPING store judges; here only the shape and
  // refusal 6, the key file inside the harness directory.
  const key = top['key'];
  if (key === null || typeof key !== 'object' || Array.isArray(key)) {
    return { seed: null, reason: 'key is not an object' };
  }
  const k = key as Record<string, unknown>;
  for (const field of ['keyId', 'teamId', 'topic', 'p8File'] as const) {
    if (typeof k[field] !== 'string' || (k[field] as string).length === 0) {
      return { seed: null, reason: `key.${field} is not a string` };
    }
  }
  const p8File = k['p8File'] as string;
  if (!isAbsolute(p8File) || !isInside(p8File, harnessDir)) {
    return { seed: null, reason: 'key.p8File is not inside the harness directory' };
  }

  const phones = top['phones'];
  if (!Array.isArray(phones) || phones.length > SEED_PHONE_CAP) {
    return { seed: null, reason: `phones is not an array of at most ${String(SEED_PHONE_CAP)}` };
  }
  const outPhones: PushSeedPhone[] = [];
  const labels = new Set<string>();
  for (const [index, one] of phones.entries()) {
    const where = `phones[${String(index)}]`;
    if (one === null || typeof one !== 'object' || Array.isArray(one)) {
      return { seed: null, reason: `${where} is not an object` };
    }
    const p = one as Record<string, unknown>;
    const label = p['label'];
    if (typeof label !== 'string' || label.length === 0 || label.length > 64 || labels.has(label)) {
      return { seed: null, reason: `${where}.label is not a unique name` };
    }
    if (typeof p['token'] !== 'string') {
      return { seed: null, reason: `${where}.token is not a string` };
    }
    const environment = p['environment'];
    if (environment !== 'development' && environment !== 'production') {
      return { seed: null, reason: `${where}.environment is not development or production` };
    }
    labels.add(label);
    outPhones.push({ label, token: p['token'], environment });
  }

  if (typeof top['alerts'] !== 'boolean') {
    return { seed: null, reason: 'alerts is not a boolean' };
  }

  return {
    seed: {
      key: {
        keyId: k['keyId'] as string,
        teamId: k['teamId'] as string,
        topic: k['topic'] as string,
        p8File
      },
      phones: outPhones,
      origins: { development: o['development'] as string, production: o['production'] as string },
      alerts: top['alerts']
    },
    reason: null
  };
}

// ---------------------------------------------------------------------------
// The commands
// ---------------------------------------------------------------------------

/**
 * What a sequence may ask. Every one reaches a SHIPPING arm, and each is named
 * in `build/p314/SPEC.md` §5.1.
 *
 *  - `suspend`, `resume`: fire the drivable monitor; a resume then asks the core
 *    to reconcile, which is what production's resume handler does.
 *  - `clock`: SET (not add) the offset of the engine's and the sender's wall
 *    clock. The feed's stamps and `WakeMark` keep the real clock, so a skew
 *    moves the provider token and the expiration and nothing else.
 *  - `blocked`: print the door's own rows, WITHOUT the question and the choices.
 *  - `status`: print the engine's state, the destinations, and the dead count
 *    read both from the host and from a fresh read of the sealed store.
 *  - `push-off`, `push-on`: set the switch, then confirm the door again, as
 *    Phase 316's sheet will in the same press.
 *  - `remove-phone`: the host's own removal, which withdraws the confirmation.
 *  - `confirm`: confirm the door as its fields stand now.
 *  - `break-key`: plant a PLAINTEXT key record at the slot's file, the same-uid
 *    attacker's shape. `restore-key`: keep the seed key again.
 */
export type PushSeamCommand =
  | { readonly op: 'suspend' }
  | { readonly op: 'resume' }
  | { readonly op: 'clock'; readonly offsetMs: number }
  | { readonly op: 'blocked' }
  | { readonly op: 'status' }
  | { readonly op: 'push-off' }
  | { readonly op: 'push-on' }
  | { readonly op: 'remove-phone'; readonly label: string }
  | { readonly op: 'confirm' }
  | { readonly op: 'break-key' }
  | { readonly op: 'restore-key' };

export interface PushSeamFile {
  readonly seq: number;
  readonly commands: readonly PushSeamCommand[];
}

const BARE_OPS: ReadonlySet<string> = new Set([
  'suspend',
  'resume',
  'blocked',
  'status',
  'push-off',
  'push-on',
  'confirm',
  'break-key',
  'restore-key'
]);

/** The most a clock may be skewed, either way: a day and a bit. */
const CLOCK_SKEW_CAP_MS = 30 * 60 * 60 * 1000;

/**
 * Read one command file's text, or answer why it is refused.
 *
 * DROPPED WHOLE, `./machine-seam.ts`'s rule: one bad command drops the file,
 * because a half-applied sequence is an arm the verifier cannot name.
 */
export function parsePushCommands(
  text: string
): { readonly file: PushSeamFile; readonly reason: null } | { readonly file: null; readonly reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { file: null, reason: `not JSON: ${(err as Error).message}` };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { file: null, reason: 'the top level is not an object' };
  }
  const { seq, commands } = parsed as Record<string, unknown>;
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0) {
    return { file: null, reason: 'seq is not a non-negative integer' };
  }
  if (!Array.isArray(commands)) {
    return { file: null, reason: 'commands is not an array' };
  }
  const out: PushSeamCommand[] = [];
  for (const [index, one] of commands.entries()) {
    const where = `commands[${String(index)}]`;
    if (one === null || typeof one !== 'object' || Array.isArray(one)) {
      return { file: null, reason: `${where} is not an object` };
    }
    const cmd = one as Record<string, unknown>;
    const op = cmd['op'];
    if (typeof op === 'string' && BARE_OPS.has(op)) {
      out.push({ op } as PushSeamCommand);
      continue;
    }
    if (op === 'clock') {
      const offsetMs = cmd['offsetMs'];
      if (
        typeof offsetMs !== 'number' ||
        !Number.isInteger(offsetMs) ||
        Math.abs(offsetMs) > CLOCK_SKEW_CAP_MS
      ) {
        return { file: null, reason: `${where}.offsetMs is not an integer within a day and a bit` };
      }
      out.push({ op: 'clock', offsetMs });
      continue;
    }
    if (op === 'remove-phone') {
      const label = cmd['label'];
      if (typeof label !== 'string' || label.length === 0) {
        return { file: null, reason: `${where}.label is not a name` };
      }
      out.push({ op: 'remove-phone', label });
      continue;
    }
    return { file: null, reason: `${where}.op is not a command this seam knows` };
  }
  return { file: { seq, commands: out }, reason: null };
}

/** What applying a command reaches. Injected so a test can count. */
export interface PushSeamDeps {
  readonly suspend: () => void;
  readonly resume: () => void;
  readonly setClockOffset: (offsetMs: number) => void;
  /** The door's rows, already projected WITHOUT the question and the choices. */
  readonly blocked: () => unknown;
  readonly status: () => unknown;
  readonly setAlerts: (on: boolean) => void;
  /** True when a phone with that label was paired and is now removed. */
  readonly removePhone: (label: string) => boolean;
  /** The confirm state after the attempt. */
  readonly confirm: () => string;
  readonly breakKey: () => void;
  /** True when the seed key was kept again. */
  readonly restoreKey: () => Promise<boolean>;
}

/** Apply one command through the arm it names. Pure over `deps` and `say`. */
export async function applyPushCommand(
  cmd: PushSeamCommand,
  deps: PushSeamDeps,
  say: (line: string) => void
): Promise<void> {
  switch (cmd.op) {
    case 'suspend':
      deps.suspend();
      return;
    case 'resume':
      deps.resume();
      return;
    case 'clock':
      deps.setClockOffset(cmd.offsetMs);
      return;
    case 'blocked':
      say(`${PUSH_SEAM_TAG} blocked ${JSON.stringify(deps.blocked())}`);
      return;
    case 'status':
      say(`${PUSH_SEAM_TAG} status ${JSON.stringify(deps.status())}`);
      return;
    case 'push-off':
    case 'push-on': {
      deps.setAlerts(cmd.op === 'push-on');
      say(`${PUSH_SEAM_TAG} ${cmd.op} confirm=${deps.confirm()}`);
      return;
    }
    case 'remove-phone':
      say(
        `${PUSH_SEAM_TAG} remove-phone ${JSON.stringify(cmd.label)} ${
          deps.removePhone(cmd.label) ? 'taken off the door' : 'no such phone'
        }`
      );
      return;
    case 'confirm':
      say(`${PUSH_SEAM_TAG} confirm=${deps.confirm()}`);
      return;
    case 'break-key':
      deps.breakKey();
      return;
    case 'restore-key':
      say(`${PUSH_SEAM_TAG} restore-key ${(await deps.restoreKey()) ? 'kept' : 'refused'}`);
      return;
  }
}

/**
 * Watch one command file and apply each new sequence once. Returns the stop.
 *
 * The file is READ every 100 ms rather than gated on its mtime, so two writes
 * inside one timestamp tick cannot hide a sequence. Commands are applied one
 * at a time and awaited, and no tick starts while a sequence is being applied,
 * so a sequence is never interleaved with the next one.
 */
export function watchPushCommands(
  path: string,
  deps: PushSeamDeps,
  say: (line: string) => void
): () => void {
  let lastSeq = -1;
  let lastText = '';
  let lastRefused = '';
  let busy = false;
  const tick = async (): Promise<void> => {
    if (busy) return;
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      return;
    }
    if (text === lastText) return;
    lastText = text;
    const read = parsePushCommands(text);
    if (read.file === null) {
      if (read.reason !== lastRefused) {
        lastRefused = read.reason;
        say(`${PUSH_SEAM_TAG} refused the file whole: ${read.reason}`);
      }
      return;
    }
    if (read.file.seq <= lastSeq) return;
    lastSeq = read.file.seq;
    busy = true;
    try {
      for (const cmd of read.file.commands) {
        try {
          await applyPushCommand(cmd, deps, say);
        } catch (err) {
          say(`${PUSH_SEAM_TAG} ${cmd.op} threw: ${(err as Error).message}`);
        }
      }
      say(`${PUSH_SEAM_TAG} applied seq=${String(read.file.seq)} ${JSON.stringify(read.file.commands)}`);
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), PUSH_SEAM_POLL_MS);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}

// ---------------------------------------------------------------------------
// The composition
// ---------------------------------------------------------------------------

/** The door's status word, for the one arm a blocked row can be. */
function seamStatusWord(session: Session): { dot: string; label: string } {
  return session.status === 'needs_input'
    ? { dot: SEAM_STATUS_DOT, label: SEAM_STATUS_WORD }
    : { dot: '', label: '' };
}

/** The registry's drawn name, or the id itself for one the registry lacks. */
function seamAgentLabel(agentId: string): string {
  try {
    return getRegistryEntry(agentId as AgentRegistryId).displayName;
  } catch {
    return agentId;
  }
}

/** Mint two public keys a phone would present. The private halves are dropped. */
function phoneKeys(): { signingKey: string; exchangeKey: string } {
  const signing = generateKeyPairSync('ed25519');
  const exchange = generateKeyPairSync('x25519');
  return {
    signingKey: signing.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url'),
    exchangeKey: exchange.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url')
  };
}

/**
 * Confirm the door as its fields stand now, and answer the state after. The
 * record is written before `confirmDoor`'s first await, so the state read
 * straight after is the new one; the rest of that call opens only a door that
 * is switched on, and this seam's door is off whenever this is called.
 */
function confirmNow(host: PocketHost): string {
  const gate = pocketConfirmStatus(host.fields());
  if (gate.state !== 'confirmed') {
    void host.confirmDoor({ linesRead: gate.lines, hashRead: gate.hash });
  }
  return host.status().confirmState;
}

/**
 * Open the door on loopback for the pairing, the sheet's own order: the switch
 * on, the confirm, listening (Phase 316). True only when it is listening.
 * Refused, with nothing written, unless the field address is the harness
 * loopback override's `127.0.0.1`.
 */
async function openDoorForPairing(
  host: PocketHost,
  print: (line: string) => void
): Promise<boolean> {
  if (pocketFieldAddress() !== '127.0.0.1') {
    print(`${PUSH_SEAM_TAG} pairing needs the loopback door (GMUX_POCKET_LOOPBACK=1), so no phone was paired`);
    return false;
  }
  await host.setDoor({ on: true });
  const gate = pocketConfirmStatus(host.fields());
  if (gate.state !== 'confirmed') {
    await host.confirmDoor({ linesRead: gate.lines, hashRead: gate.hash });
  }
  const state = host.status().state;
  if (state !== 'listening') {
    print(`${PUSH_SEAM_TAG} the loopback door did not open (${state}), so no phone was paired`);
    return false;
  }
  return true;
}

/** The seed's key record, read from the file the seed names. */
function seedKey(seed: PushSeed): ApnsProviderKey {
  return {
    keyId: seed.key.keyId,
    teamId: seed.key.teamId,
    topic: seed.key.topic,
    p8: readFileSync(seed.key.p8File, 'utf8')
  };
}

async function keepSeedKey(store: ApnsKeyStore, seed: PushSeed): Promise<boolean> {
  const kept = await store.keep(seedKey(seed));
  return kept.ok;
}

async function composePushSeam(
  dir: string,
  seed: PushSeed,
  print: (line: string) => void
): Promise<void> {
  const core = await getGmuxCore();

  // THE FEED, and the ONE assignment of the core's broadcast slot. The tray
  // installs it too; the second call is a no-op by the feed's own contract.
  installBlockedFeed(core);

  // THE WAKE, over the power smoke's own drivable monitor. `WakeMark` keeps
  // the real clock, so the rows' stamps and the wake's times are one clock.
  const monitor = drivableMonitor();
  const wakeMark = new WakeMark(monitor);

  // THE KEY, through the SHIPPING sealed store.
  const store = apnsKeyStoreForApp();
  const keyKept = await keepSeedKey(store, seed);

  // THE WALL CLOCK the engine and the sender read. `clock` SETS the offset.
  let offsetMs = 0;
  const now = (): number => Date.now() + offsetMs;

  const facts: PocketFacts = {
    sessions: () => core.listSessions(),
    projects: () => core.listProjects(),
    blockedSince: () => blockedSinceMap(),
    wakes: () => wakeMark.wakes(),
    // Main has no tap for the question on this path, and the alert must never
    // carry it, so the door this seam composes answers none.
    activity: () => undefined,
    statusWord: seamStatusWord,
    agentLabel: seamAgentLabel,
    machineLabel: (session) => session.machine?.label ?? null,
    emptyLine: NOTHING_NEEDS_YOU,
    catchUp: async () => null,
    lastTurn: async () => ({ answerText: null, turnCount: 0 }),
    turns: async () => ({ turns: [], more: false }),
    handoff: () => null
  };

  // THE HOST, bound to loopback in its confirmed field. It listens only while
  // the phones pair, and is switched off again before the engine starts.
  const host = new PocketHost({ facts, bindAddress: () => '127.0.0.1' });

  // THE PHONES, each through the shipping pairing path, on a door that is
  // listening because the QR pins its key (Phase 316), and with no tailnet key.
  const doorOpen = await openDoorForPairing(host, print);
  for (const phone of doorOpen ? seed.phones : []) {
    const offer = host.beginPairing({ tailnetKey: null });
    const keys = phoneKeys();
    const body = sealPresentationAsPhone(offer.payload, {
      label: phone.label,
      signingKey: keys.signingKey,
      exchangeKey: keys.exchangeKey,
      pushToken: phone.token,
      pushEnvironment: phone.environment
    });
    const answer = host.pairing.present(body, '127.0.0.1');
    const view = host.pairing.view();
    if (answer !== 'pending' || view.hash === null) {
      print(`${PUSH_SEAM_TAG} pairing ${JSON.stringify(phone.label)} answered ${answer}`);
      host.cancelPairing();
      continue;
    }
    const allowed = host.allowPhone({ linesRead: view.lines, hashRead: view.hash });
    if (!allowed.allowed) {
      print(`${PUSH_SEAM_TAG} pairing ${JSON.stringify(phone.label)} was not allowed`);
    }
    host.cancelPairing();
  }
  // THE DOOR SHUT AGAIN, and both switches written false, so the fields the
  // engine's pushes depend on are the ones this seam always confirmed: the
  // door is down, and the push is the door's confirmed fields alone.
  await host.setDoor({ on: false });

  await host.setPushAlerts(seed.alerts);
  confirmNow(host);

  // THE ENGINE, with the sender aimed at the seed's loopback origins and
  // `allowRemote` never passed.
  const sender = createApnsSender({ origin: (env) => seed.origins[env], now });
  const routes = createPocketRoutes(facts);
  const engine = createPushEngine({
    rows: () => routes.blocked().rows,
    destinations: () => host.pushDestinations(),
    providerKey: () => store.read(),
    sender,
    drop: (destination) => host.dropPushToken(destination.tokenDigest),
    wake: wakeMark,
    now,
    say: (id) => print(`${PUSH_SEAM_TAG} said ${id}`)
  });
  onBlockedChange(() => engine.observe());
  // The first observe SEEDS, silently, from whatever is blocked right now.
  engine.observe();

  const deps: PushSeamDeps = {
    suspend: () => monitor.fire('suspend'),
    resume: () => {
      monitor.fire('resume');
      core.scheduleRefresh();
    },
    setClockOffset: (ms) => {
      offsetMs = ms;
    },
    blocked: () => ({
      at: Date.now(),
      wakes: wakeMark.wakes(),
      rows: routes.blocked().rows.map((row) => ({
        sessionId: row.sessionId,
        name: row.name,
        project: row.project,
        agentLabel: row.agentLabel,
        statusLabel: row.statusLabel,
        machine: row.machine,
        blockedSince: row.blockedSince,
        seenAtWake: row.seenAtWake
      }))
    }),
    status: () => {
      const view = host.status();
      const fresh = readPocketStore();
      return {
        engine: engine.status(),
        // The door's own state. This seam never starts it, so it reads `off`.
        door: view.state,
        destinations: host.pushDestinations().length,
        pushAlerts: view.pushAlerts,
        confirm: view.confirmState,
        phones: view.phones.map((p) => ({ label: p.label, alerts: p.alerts })),
        stopped: view.phones.filter((p) => p.alerts === 'stopped').length,
        storeDead: fresh.store === null ? null : fresh.store.deadPushTokens.length
      };
    },
    setAlerts: (on) => {
      // The store is written before the call's first await, so the switch
      // holds at once; the rest only closes a listening door, and this one is
      // not listening.
      void host.setPushAlerts(on);
    },
    removePhone: (label) => {
      const phone = host.status().phones.find((p) => p.label === label);
      if (phone === undefined) return false;
      // Written before the call's first await, as `setAlerts` above.
      void host.removePhone(phone.id);
      return true;
    },
    confirm: () => confirmNow(host),
    breakKey: () => {
      // THE SAME-UID ATTACKER'S SHAPE: a plaintext record where the sealed
      // one belongs. The seal did not write it, so the store must refuse it.
      const record = seedKey(seed);
      writeFileSync(
        join(apnsKeyDir(), `${APNS_KEY_SLOT}.cred`),
        JSON.stringify({ v: 1, ...record }),
        { mode: 0o600 }
      );
    },
    restoreKey: () => keepSeedKey(store, seed)
  };

  const view = host.status();
  print(
    `${PUSH_SEAM_TAG} installed phones=${String(view.phones.length)} key=${
      keyKept && (await store.read()) !== null ? 'present' : 'absent'
    } alerts=${view.pushAlerts ? 'on' : 'off'} confirm=${view.confirmState}`
  );
  watchPushCommands(join(dir, 'commands.json'), deps, print);
}

/**
 * Install the seam. Called once from the boot, on the line after the liveness
 * seam. In every ordinary launch it returns on its first refusal and prints
 * nothing.
 */
export function installPushSeam(): void {
  if ((process.env['GMUX_HARNESS_PUSH'] ?? '') === '') return;
  const dir = pushSeamDir(process.env, app.getPath('userData'), () => {
    try {
      return app.commandLine.hasSwitch('use-mock-keychain');
    } catch {
      return false;
    }
  });
  if (dir === null) return;
  const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
  let text: string;
  try {
    text = readFileSync(join(dir, 'seed.json'), 'utf8');
  } catch {
    return;
  }
  const read = parsePushSeed(text, harnessDir);
  if (read.seed === null) return;
  const seed = read.seed;
  // Console only: these lines are for the probe that launched this app, and
  // none of them belongs in the person's log.
  const print = (line: string): void => {
    console.log(line);
  };
  const go = (): void => {
    void composePushSeam(dir, seed, print).catch((err: unknown) => {
      print(`${PUSH_SEAM_TAG} could not install: ${err instanceof Error ? err.message : String(err)}`);
    });
  };
  if (BrowserWindow.getAllWindows().length > 0) {
    go();
    return;
  }
  app.once('browser-window-created', () => {
    setImmediate(go);
  });
}
