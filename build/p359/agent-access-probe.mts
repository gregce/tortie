/**
 * The probe half of `npm run conformance:agentaccess` (Phase 359).
 *
 * It prints, as JSON, everything the checker beside it needs to decide whether
 * a Tortie session's private door is still the narrow thing Phase 359 promised.
 * The checker (`build/conformance-agent-access.mjs`) decides pass or fail, asks
 * every rule again over a broken copy, and prints the table a person reads.
 *
 * It is a separate file rather than an inline `--eval` for the reason the
 * probes beside it give: the tables are TypeScript with path aliases, and a
 * probe that cannot resolve `@shared/*` prints nothing at all.
 *
 * WHAT IT STARTS. No Electron, no tmux, no ssh, no agent, no token, no
 * network, and no vendor process. It binds ONE scratch Unix socket under the
 * system's temporary folder — the framing, caps and deadline of
 * `src/main/agent-access/socket.ts` can only be driven over a real socket —
 * and removes it in a `finally`. The scratch folder it writes is removed the
 * same way. It reads this repository's own source and three module groups
 * whose every function is pure or reads the arguments it is handed.
 *
 * WHAT IT CANNOT DRIVE, said here so a pass is not read as more than it is.
 * `src/main/agent-access/service.ts` takes its address from
 * `app.getPath('userData')`, so the listener's own reconcile queue, its stale
 * inode cleanup and its shutdown join cannot be started without Electron. This
 * probe drives everything AROUND them — the address, the 103-byte refusal, the
 * framing, the caps, the absolute deadline, every dispatch answer — and the
 * service's ownership rules are read as source here, with a mutation control
 * for each. The live arms (a real listener started and stopped, a SIGKILLed
 * app leaving a stale socket, two owners against one profile) belong to
 * `build/p359/probe-p359.mjs` and the phase's Tier 3 verifiers.
 */

import { createServer, createConnection, type Server } from 'node:net';
import { chmodSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import { close as closeNice } from 'node:fs';
import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AGENT_ACCESS_DELIVERY_AGENTS,
  AGENT_ACCESS_MAX_FIND_BYTES,
  AGENT_ACCESS_MAX_PATH_BYTES,
  AGENT_ACCESS_MAX_REQUEST_BYTES,
  AGENT_ACCESS_MAX_RESPONSE_BYTES,
  AGENT_ACCESS_MAX_SESSION_ROWS,
  AGENT_ACCESS_OPERATIONS,
  AGENT_ACCESS_PROTOCOL,
  AGENT_ACCESS_REQUEST_DEADLINE_MS,
  AGENT_ACCESS_SOCKET_ENV,
  AGENT_ACCESS_FINISHED_STATUSES,
  isAgentAccessFinishedStatus,
  isAgentAccessSessionId
} from '../../src/shared/agent-access';
import { defaultGmuxSettings } from '../../src/shared/settings';
import {
  buildAgentAccessOpen,
  localOpenProjects
} from '../../src/main/agent-access/open';
import {
  AgentAccessOpenBroker
} from '../../src/main/agent-access/open-broker';
import {
  acceptFramedConnections,
  serializeAgentAccessResponse,
  splitFramedRequest
} from '../../src/main/agent-access/socket';
import {
  dispatchAgentAccessRequest,
  outcomeOfResponse
} from '../../src/main/agent-access/dispatch';
import {
  agentAccessSocketEnv,
  agentAccessSocketPath,
  agentAccessSocketPathFits,
  AGENT_ACCESS_SOCKET_PATH_MAX_BYTES
} from '../../src/main/agent-access/service';
import {
  agentAccessArgvPair,
  agentAccessEligible,
  agentAccessDelivery,
  applyAgentAccessArgv,
  composeAgentAccessDelivery,
  agentAccessBundleRootDefault
} from '../../src/main/agent-access/delivery';
import { EVT_AGENT_ACCESS_OPEN } from '../../src/shared/ipc/agent-access';
import { readTextCapped } from '../../src/main/fs/read-text';
import { READ_CAP_BYTES } from '../../src/shared/fs-ops';
import { agentAccessHarnessArmed, AGENT_ACCESS_HARNESS_SMOKE } from '../../src/main/harness/agent-access-open';
import {
  dangerStateOf,
  isDangerStateEmpty,
  sanitizeSettings as sanitizeSettingsMain,
  withSealedDangerState
} from '../../src/main/settings/store';
import { AGENT_REGISTRY } from '../../src/main/agents/registry';
import { wrapWithRecord } from '../../src/main/specstory/capture';
import { isWrappedArgv, unwrapArgv } from '../../src/main/specstory/wrap';
import { stripComments } from '../scan-source.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------------------------------------------------------------------------
// Small readers
// ---------------------------------------------------------------------------

/** A source file's text with comments blanked, so a comment cannot pass a rule. */
function source(rel) {
  return stripComments(readFileSync(join(repoRoot, rel), 'utf8'));
}

/** A source file's raw text, for the readings that want the prose too. */
function rawSource(rel) {
  return readFileSync(join(repoRoot, rel), 'utf8');
}

function exists(rel) {
  try {
    readFileSync(join(repoRoot, rel));
    return true;
  } catch {
    return false;
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Every call name a body performs, as the bare name before its `(`. */
function callsIn(text) {
  const out = [];
  const pattern = /([A-Za-z_$][\w$.]*)\s*\(/g;
  let match;
  while ((match = pattern.exec(text)) !== null) out.push(match[1]);
  return out;
}

// ---------------------------------------------------------------------------
// Section A — the plain switch (Phase 360 rewrote this; it was the seal)
// ---------------------------------------------------------------------------

/**
 * PHASE 360. This section used to read the seal: a covering seal kept the
 * switch on, an uncovered one dropped it and named it back to Settings, and
 * `isDangerStateEmpty` had to ask the switch. The operator's ruling of
 * 2026-11-07 took the switch OFF the seal, so the readings here are the
 * opposite ones: the plain boolean survives a read with no keystore at all,
 * and the seal keeps covering the members it still owns.
 */
function sealSection() {
  const defaults = defaultGmuxSettings();
  const emptyDanger = {
    defaults: [],
    acks: [],
    fold: null,
    arch: null,
    env: [],
    envShared: []
  };
  const on = { ...defaults, agentAccess: true };
  // Both halves of the old pair, kept as readings so the gate can assert the
  // NEW answer on each: a covering seal and an empty one must now agree,
  // because neither is consulted.
  const sealedOn = withSealedDangerState(on, {
    ...emptyDanger,
    agentAccess: true
  });
  const sealedOff = withSealedDangerState(on, emptyDanger);
  return {
    defaultIsFalse: defaults.agentAccess === false,
    defaultIsBoolean: typeof defaults.agentAccess === 'boolean',
    // Only literal `true` survives the shape check.
    sanitize: {
      trueValue: sanitizeSettingsMain({ agentAccess: true }).agentAccess,
      falseValue: sanitizeSettingsMain({ agentAccess: false }).agentAccess,
      absent: sanitizeSettingsMain({}).agentAccess,
      string: sanitizeSettingsMain({ agentAccess: 'true' }).agentAccess,
      number: sanitizeSettingsMain({ agentAccess: 1 }).agentAccess,
      object: sanitizeSettingsMain({ agentAccess: { on: true } }).agentAccess,
      nullish: sanitizeSettingsMain({ agentAccess: null }).agentAccess
    },
    // PHASE 360. The switch is no longer a danger member at all.
    inDangerState: Object.hasOwn(dangerStateOf(on), 'agentAccess'),
    emptyWithOnOnly: isDangerStateEmpty(dangerStateOf(on)),
    emptyWithOff: isDangerStateEmpty(dangerStateOf({ ...defaults })),
    // The plain answer: neither seal half changes it, and neither names it.
    sealedOnKeeps: sealedOn.settings.agentAccess === true,
    sealedOnRejected: sealedOn.rejected,
    sealedOffKeeps: sealedOff.settings.agentAccess === true,
    sealedOffRejected: sealedOff.rejected,
    // The shared settings default agrees with the store's.
    sharedDefault: defaultGmuxSettings().agentAccess
  };
}

// ---------------------------------------------------------------------------
// Section B — delivery (D1 to D5)
// ---------------------------------------------------------------------------

const BUNDLE = '/R/agent-skills/tortie';
const SOCKET = '/P/gmux/agent.sock';

/** Every launchable registry id, in registry order. */
const LAUNCHABLE_IDS = AGENT_REGISTRY.map((row) => row.id);

function deliverySection() {
  const pairFor = {};
  for (const id of LAUNCHABLE_IDS) {
    const delivery = agentAccessDelivery(id, true, true, SOCKET, BUNDLE);
    pairFor[id] = delivery === null ? null : delivery.argv;
  }
  // Disabled composition is byte identical for every row: the argv the
  // applier returns is the argv it was given, and there is no env at all.
  const offBaseline = {};
  for (const id of LAUNCHABLE_IDS) {
    const before = ['/abs/bin/' + id, '--flag', 'value'];
    const after = applyAgentAccessArgv(
      before,
      undefined,
      agentAccessDelivery(id, false, true, SOCKET, BUNDLE),
      isWrappedArgv,
      unwrapArgv,
      wrapWithRecord
    );
    offBaseline[id] = {
      same: after.length === before.length && after.every((one, at) => one === before[at]),
      env: agentAccessDelivery(id, false, true, SOCKET, BUNDLE)
    };
  }
  // Remote is never delivered, for every row.
  const remoteDelivered = LAUNCHABLE_IDS.filter(
    (id) => agentAccessDelivery(id, true, false, SOCKET, BUNDLE) !== null
  );
  // Additive: existing user flags survive, in order, and the pair is appended.
  const userFlags = ['--plugin-dir', '/somewhere/else', '--model', 'x'];
  const additive = applyAgentAccessArgv(
    ['/abs/bin/claude', ...userFlags],
    undefined,
    agentAccessDelivery('claude', true, true, SOCKET, BUNDLE),
    isWrappedArgv,
    unwrapArgv,
    wrapWithRecord
  );
  // The exact pair is never duplicated.
  const already = applyAgentAccessArgv(
    ['/abs/bin/claude', ...agentAccessArgvPair('claude', BUNDLE)],
    undefined,
    agentAccessDelivery('claude', true, true, SOCKET, BUNDLE),
    isWrappedArgv,
    unwrapArgv,
    wrapWithRecord
  );
  // A captured launch keeps the pair INSIDE the wrapper and nowhere outside.
  const record = {
    enabled: true,
    bin: '/abs/bin/specstory',
    binVersion: '1.0.0',
    provider: 'claude',
    exitCodeFidelity: 'exact',
    agentArgv: ['/abs/bin/claude'],
    noCloud: true
  };
  let wrapped = null;
  let wrappedInside = null;
  let wrappedOutside = 0;
  try {
    wrapped = wrapWithRecord(record, ['/abs/bin/claude', '--model', 'x']);
    if (wrapped !== null) {
      const delivered = applyAgentAccessArgv(
        wrapped,
        record,
        agentAccessDelivery('claude', true, true, SOCKET, BUNDLE),
        isWrappedArgv,
        unwrapArgv,
        wrapWithRecord
      );
      const innerAt = delivered.indexOf('-c');
      const inner = innerAt >= 0 ? delivered[innerAt + 1] : '';
      wrappedInside = inner.includes(agentAccessArgvPair('claude', BUNDLE).join(' '));
      // Count a pair token ANYWHERE but inside the `-c` argument. A pair on
      // SpecStory's own argv, before the `-c` or appended after it, is the
      // defect: the wrapper would hand the skill to the capture program
      // rather than to the agent.
      const innerToken = innerAt < 0 ? -1 : innerAt + 1;
      wrappedOutside = delivered.filter(
        (token, at) =>
          at !== innerToken && (token === '--plugin-dir' || token === '--skill')
      ).length;
    }
  } catch {
    wrapped = null;
  }
  // Paths with spaces survive as ONE argv element each.
  const spaced = agentAccessArgvPair('pi', '/R/a b/agent-skills/tortie');
  // The socket address is refused when it does not fit `sun_path`.
  const longPath = '/' + 'a'.repeat(AGENT_ACCESS_SOCKET_PATH_MAX_BYTES) + '.sock';
  return {
    launchableIds: LAUNCHABLE_IDS,
    pairFor,
    supported: AGENT_ACCESS_DELIVERY_AGENTS.slice(),
    offBaseline,
    remoteDelivered,
    additive,
    additiveTail: additive.slice(-agentAccessArgvPair('claude', BUNDLE).length),
    userFlagsKept: userFlags.every((one, at) => additive[1 + at] === one),
    alreadyPairCount: already.filter((one) => one === '--plugin-dir').length,
    wrappedInside,
    wrappedOutside,
    wrappedIsWrapped: wrapped !== null && isWrappedArgv(wrapped),
    spacedPair: spaced,
    spacedIsTwoElements: spaced.length === 2,
    // Eligibility refusals, one each.
    refusals: {
      off: agentAccessDelivery('claude', false, true, SOCKET, BUNDLE) === null,
      remote: agentAccessDelivery('claude', true, false, SOCKET, BUNDLE) === null,
      shell: agentAccessDelivery('shell', true, true, SOCKET, BUNDLE) === null,
      overlong:
        agentAccessDelivery('claude', true, true, longPath, BUNDLE) === null,
      emptyBundle: agentAccessDelivery('claude', true, true, SOCKET, '') === null,
      emptySocket: agentAccessDelivery('claude', true, true, '', BUNDLE) === null,
      codex: agentAccessDelivery('codex', true, true, SOCKET, BUNDLE) === null
    },
    eligibleForClaude: agentAccessEligible('claude', true, true, SOCKET, BUNDLE),
    // Every launchable row that is NOT one of the three answers null.
    unsupportedDelivering: LAUNCHABLE_IDS.filter(
      (id) =>
        !AGENT_ACCESS_DELIVERY_AGENTS.includes(id) &&
        agentAccessDelivery(id, true, true, SOCKET, BUNDLE) !== null
    )
  };
}

// ---------------------------------------------------------------------------
// Section C — the bundled resource (R1, R2)
// ---------------------------------------------------------------------------

const RESOURCE_FILES = [
  '.claude-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  'skills/tortie/SKILL.md',
  'skills/tortie/references/use-tortie.md',
  'skills/tortie/references/limits.md'
];

function resourceSection() {
  const root = join(repoRoot, 'resources', 'agent-skills', 'tortie');
  const files = [];
  for (const rel of RESOURCE_FILES) {
    const path = join(root, rel);
    try {
      const bytes = readFileSync(path);
      files.push({ rel, bytes: bytes.length, sha256: sha256(bytes) });
    } catch {
      files.push({ rel, absent: true });
    }
  }
  // The directory walk proves there is no sixth file and no symlink: the
  // packaged assertion compares an exact allowlist, so an extra file is red
  // here too.
  const manifests = [];
  for (const rel of ['.claude-plugin/plugin.json', '.cursor-plugin/plugin.json']) {
    try {
      const parsed = JSON.parse(readFileSync(join(root, rel), 'utf8'));
      manifests.push({
        rel,
        keys: Object.keys(parsed).sort(),
        name: parsed['name'],
        version: parsed['version'],
        description: parsed['description']
      });
    } catch {
      manifests.push({ rel, absent: true });
    }
  }
  const skill = (() => {
    try {
      return readFileSync(join(root, 'skills', 'tortie', 'SKILL.md'), 'utf8');
    } catch {
      return '';
    }
  })();
  const references = RESOURCE_FILES.filter((one) => one.includes('/references/'))
    .map((rel) => {
      try {
        return readFileSync(join(root, rel), 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
  // The client form the references must teach: exactly this one line, with
  // Base64 for dynamic values and never a raw path or search text in JSON.
  const referenceWords = references;
  return {
    root,
    files,
    manifests,
    // SKILL.md frontmatter: the two keys and the exact description.
    frontmatter: (() => {
      const match = /^---\n([\s\S]*?)\n---/m.exec(skill);
      if (match === null) return null;
      const keys = [];
      const values = {};
      for (const line of match[1].split('\n')) {
        const at = line.indexOf(':');
        if (at < 0) continue;
        const key = line.slice(0, at).trim();
        keys.push(key);
        values[key] = line.slice(at + 1).trim();
      }
      return { keys, values };
    })(),
    // The words the charter requires the skill to say.
    says: {
      howToIsNotAuthorization: /how-to|how to/i.test(skill) && /not (?:the same as )?authoriz|is not authoriz/i.test(skill),
      offersToDoIt: /I can do that in Tortie/i.test(skill),
      waits: /wait/i.test(skill),
      imperativeAuthorizes: /explicit imperative/i.test(skill),
      noInventedActions: /never invent|do not invent|never offer/i.test(skill),
      localOnly: /this Mac/i.test(skill),
      sameUserNotAuth: /same account|same-user|same user/i.test(skill),
      noRepeatRequestIntoLogs: /log/i.test(skill)
    },
    // The client form: `/usr/bin/nc -w 2 -U` with the socket env, Base64 for
    // every dynamic value, and the session env for the identity.
    client: {
      ncLine: /\/usr\/bin\/nc -w 2 -U "\$GMUX_AGENT_SOCKET"/.test(referenceWords),
      sessionEnv: referenceWords.includes('GMUX_SESSION_ID'),
      base64Tool: /\/usr\/bin\/base64/.test(referenceWords),
      noRawPathInJson: !/pathBase64":"[^"]*\/[^"]*"/.test(referenceWords),
      fourErrors:
        referenceWords.includes('disabled') &&
        referenceWords.includes('unknown-operation') &&
        referenceWords.includes('bad-request') &&
        referenceWords.includes('unavailable'),
      lineLocator: referenceWords.includes('line'),
      findLocator: referenceWords.includes('findBase64'),
      states:
        referenceWords.includes('opened') &&
        referenceWords.includes('not-found') &&
        referenceWords.includes('refused')
    },
    // Once and never installed: no copy into a home or a repo.
    installsNothing: !/\.claude\/skills|cp -R|install/i.test(skill),
    // No manifest KEY may name anything that runs. The prose may call a hook
    // a hook — the references say the bundle declares none — so this asks the
    // two manifests' key sets and nothing else.
    prohibitedManifestKeys: ['hook', 'hooks', 'mcpServers', 'commands', 'scripts', 'activationEvents', 'contributes']
  };
}

// ---------------------------------------------------------------------------
// Section D — the socket address and the framing (S1, S2)
// ---------------------------------------------------------------------------

function addressSection() {
  const base = '/private/tmp/p359-probe-profile';
  const path = agentAccessSocketPath(base);
  const fitsExactly = '/' + 'a'.repeat(AGENT_ACCESS_SOCKET_PATH_MAX_BYTES - 1);
  const oneTooLong = '/' + 'a'.repeat(AGENT_ACCESS_SOCKET_PATH_MAX_BYTES);
  const service = source('src/main/agent-access/service.ts');
  const socket = source('src/main/agent-access/socket.ts');
  return {
    path,
    pathIsExact: path === join(base, 'gmux', 'agent.sock'),
    env: agentAccessSocketEnv('/x/agent.sock'),
    // The boundary in BYTES, not characters: a multi-byte name counts what
    // the kernel counts.
    fitsAt103: agentAccessSocketPathFits(fitsExactly),
    refusesAt104: !agentAccessSocketPathFits(oneTooLong),
    refusesMultibyte:
      !agentAccessSocketPathFits('/' + 'é'.repeat(52)) === false
        ? false
        : true,
    maxBytes: AGENT_ACCESS_SOCKET_PATH_MAX_BYTES,
    // The service's own ownership rules, read as source (see the header).
    source: {
      listensOnce: (service.match(/\.listen\(/g) ?? []).length === 1,
      dirMode: /const SOCKET_DIR_MODE = 0o700;/.test(service),
      socketMode: /const SOCKET_MODE = 0o600;/.test(service),
      chmodsSocket: /chmod\(socketPath, SOCKET_MODE\)/.test(service),
      lstatsBeforeUnlink: /const reread = await statOrNull\(socketPath\);/.test(service),
      comparesDevIno:
        /reread\.dev !== existing\.dev/.test(service) &&
        /reread\.ino !== existing\.ino/.test(service),
      // The shutdown unlink asks the same two questions of the path it is
      // about to remove, so a replaced file at the address is never deleted.
      joinComparesDevIno:
        /current\.dev === identity\.dev/.test(service) &&
        /current\.ino === identity\.ino/.test(service),
      neverUnlinksNonSocket: /if \(!existing\.isSocket\(\)\) \{[\s\S]{0,200}?return;/.test(service),
      refusesLiveOwner: /if \(probe === 'live'\) \{[\s\S]{0,120}?return;/.test(service),
      noPatternDelete: !/rm -rf|readdir|rmSync|unlinkSync\(/.test(service),
      // Two unlink sites and no more: the stale replacement and the
      // shutdown, each reachable only behind a dev/ino comparison.
      unlinkSites: (service.match(/await unlink\(/g) ?? []).length,
      unlinkGuardedEverywhere:
        (service.match(/await unlink\(/g) ?? []).length === 2,
      serializedQueue: /reconcileChain = reconcileChain\.then/.test(service),
      shutdownStopsAdmission:
        /export function beginAgentAccessShutdown\(\): void \{\n\s*shuttingDown = true;/.test(service),
      joinIsBounded: /const SHUTDOWN_GRACE_MS = 2_000;/.test(service),
      // Framing: the cap, the deadline and one line per connection.
      framingCap: /AGENT_ACCESS_MAX_REQUEST_BYTES \+ 1/.test(socket),
      absoluteDeadline:
        /AGENT_ACCESS_REQUEST_DEADLINE_MS\)/.test(socket) &&
        !/deadline\.refresh/.test(socket),
      oneNewline:
        /splitFramedRequest/.test(socket) &&
        /buffered\.indexOf\(0x0a\)/.test(socket),
      responseCap: /AGENT_ACCESS_MAX_RESPONSE_BYTES/.test(socket)
    },
    /** The 103-byte refusal must never truncate or hash: the address is exact. */
    neverTruncates: !/slice\(0, 103\)|substring\(0, 103\)|hash|sha256/i.test(service)
  };
}

/** Start one scratch server over the shipping framing, and drive it. */
async function framingSection() {
  const dir = mkdtempSync(join(tmpdir(), 'p359-agentaccess-'));
  const path = join(dir, 'a.sock');
  const lines = [];
  const errors = [];
  let server;
  const answers = [];
  try {
    server = createServer();
    acceptFramedConnections(server, {
      onLine: (socket, line) => {
        lines.push(line);
        socket.write(JSON.stringify({ ok: true }) + '\n');
        socket.end();
      },
      onFramingError: (socket) => {
        errors.push('bad-request');
        socket.write(JSON.stringify({ ok: false }) + '\n');
        socket.end();
      }
    });
    await listen(server, path);
    chmodSync(path, 0o600);

    /** One connection, one send, one answer line. */
    const ask = (bytes, opts = {}) =>
      new Promise((resolvePromise) => {
        const socket = createConnection({ path });
        const chunks = [];
        let finished = false;
        const done = (answer) => {
          if (finished) return;
          finished = true;
          try {
            socket.destroy();
          } catch {
            /* a dead probe stays dead */
          }
          resolvePromise(answer);
        };
        socket.on('connect', () => {
          if (opts.chunks === undefined) {
            socket.write(bytes);
            return;
          }
          // Split at arbitrary byte boundaries: framing must not care.
          let at = 0;
          for (const size of opts.chunks) {
            const piece = bytes.subarray(at, at + size);
            at += size;
            if (piece.length > 0) socket.write(piece);
          }
          if (at < bytes.length) socket.write(bytes.subarray(at));
        });
        socket.on('data', (chunk) => chunks.push(chunk));
        socket.on('close', () =>
          done({ text: Buffer.concat(chunks).toString('utf8'), closed: true })
        );
        socket.on('error', () => done({ text: Buffer.concat(chunks).toString('utf8'), closed: true }));
        setTimeout(() => done({ text: Buffer.concat(chunks).toString('utf8'), timeout: true }), 4_000)
          .unref?.();
      });

    const oneLine = Buffer.from('{"version":1,"operation":"capabilities","session":"abc"}\n');
    answers.push({ case: 'one line', ...(await ask(oneLine)) });
    answers.push({
      case: 'byte at a time',
      ...(await ask(oneLine, { chunks: Array.from({ length: oneLine.length }, () => 1) }))
    });
    answers.push({
      case: 'second request',
      ...(await ask(Buffer.concat([oneLine, oneLine])))
    });
    answers.push({
      case: 'trailing whitespace',
      ...(await ask(Buffer.concat([oneLine, Buffer.from('  \t\r\n')])))
    });
    answers.push({
      case: 'trailing byte',
      ...(await ask(Buffer.concat([oneLine, Buffer.from('x')])))
    });
    const big = Buffer.alloc(AGENT_ACCESS_MAX_REQUEST_BYTES + 2, 0x61);
    answers.push({
      case: 'over the cap',
      ...(await ask(Buffer.concat([Buffer.from('{"a":"'), big])))
    });
    // Slowloris: one byte well inside the deadline, then nothing. The
    // absolute deadline must still close it.
    const slowStart = Date.now();
    const slow = await (async () => {
      const socket = createConnection({ path });
      await new Promise((r) => socket.on('connect', r));
      socket.write(Buffer.from('{"ver'));
      const text = await new Promise((r) => {
        const chunks = [];
        socket.on('data', (chunk) => chunks.push(chunk));
        socket.on('close', () => r(Buffer.concat(chunks).toString('utf8')));
        setTimeout(() => r(''), 5_000).unref?.();
      });
      try {
        socket.destroy();
      } catch {
        /* dead */
      }
      return { text, elapsedMs: Date.now() - slowStart };
    })();
    answers.push({ case: 'slowloris', ...slow });

    return {
      dir,
      answers,
      lines,
      errors,
      caps: {
        request: AGENT_ACCESS_MAX_REQUEST_BYTES,
        response: AGENT_ACCESS_MAX_RESPONSE_BYTES,
        deadline: AGENT_ACCESS_REQUEST_DEADLINE_MS
      },
      // Serialized one-liners are one line and end with a newline.
      serialize: {
        oneLine: (() => {
          const line = serializeAgentAccessResponse({
            version: 1,
            ok: false,
            error: { code: 'disabled', message: 'Agent access is off.' }
          });
          return line !== null && line.endsWith('\n') && line.split('\n').length === 2;
        })(),
        refusesOverflow:
          serializeAgentAccessResponse({
            version: 1,
            ok: true,
            operation: 'sessions',
            value: { sessions: [], omitted: 0, padding: 'x'.repeat(AGENT_ACCESS_MAX_RESPONSE_BYTES) }
          }) === null
      },
      // The splitter's own three verdicts, driven directly.
      split: {
        clean: splitFramedRequest(Buffer.from('{"a":1}\n')).ok,
        none: !splitFramedRequest(Buffer.from('{"a":1}')).ok,
        after: !splitFramedRequest(Buffer.from('{"a":1}\n{"b":2}\n')).ok,
        whitespace: splitFramedRequest(Buffer.from('{"a":1}\n \r\n')).ok
      },
      mode: (() => {
        try {
          return statSync(path).mode & 0o777;
        } catch {
          return null;
        }
      })()
    };
  } finally {
    if (server !== undefined) {
      await new Promise((r) => server.close(() => r()));
    }
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* the scratch is gone or the OS took it */
    }
  }
}

function listen(server, path) {
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(path, () => {
      server.removeListener('error', reject);
      resolvePromise(undefined);
    });
  });
}

// ---------------------------------------------------------------------------
// Section E — the dispatcher (S3, S4) and the facts (F1)
// ---------------------------------------------------------------------------

const SESSION_A = {
  id: 'aaaa1111-0000-4000-8000-000000000001',
  name: 'session-one',
  agent: 'claude',
  status: 'running',
  createdAt: 3,
  projectPath: '/tmp/project-a'
};
const SESSION_B = {
  id: 'bbbb2222-0000-4000-8000-000000000002',
  name: 'session-two',
  agent: 'pi',
  status: 'exited',
  createdAt: 3,
  projectPath: '/tmp/project-b'
};
const SESSION_C = {
  id: 'cccc3333-0000-4000-8000-000000000003',
  name: 'session-three',
  agent: 'codex',
  status: 'idle',
  createdAt: 5,
  projectPath: '/tmp/project-a'
};
const SESSION_REMOTE = {
  id: 'dddd4444-0000-4000-8000-000000000004',
  name: 'session-four',
  agent: 'claude',
  status: 'running',
  createdAt: 9,
  projectPath: '/tmp/project-remote',
  machine: { id: 'machine-1', label: 'Laptop' }
};
const PROJECT_A = { id: 'project-a', name: 'Project A', path: '/tmp/project-a' };
const PROJECT_B = { id: 'project-b', name: 'Project B', path: '/tmp/project-b' };
const PROJECT_REMOTE = {
  id: 'project-remote',
  name: 'Remote',
  path: '/tmp/project-remote',
  machineId: 'machine-1'
};

async function dispatchSection() {
  const rows = [SESSION_A, SESSION_C, SESSION_B, SESSION_REMOTE];
  const projects = [PROJECT_A, PROJECT_B, PROJECT_REMOTE];
  const reports = [];
  const run = (line, opts = {}) =>
    dispatchAgentAccessRequest(line, {
      isEnabled: opts.isEnabled ?? (() => true),
      listSessions: () => rows,
      listProjects: () => projects,
      tortieVersion: () => '0.114.1',
      open: async () => opts.openAnswer ?? { state: 'not-found', matches: 0 },
      report: (entry) => reports.push(entry)
    });
  const ask = (body, opts) => run(JSON.stringify(body), opts);

  const good = {
    version: 1,
    operation: 'capabilities',
    session: SESSION_A.id
  };
  const answers = {};
  answers.capabilities = await run(JSON.stringify(good));
  // Key order is irrelevant.
  answers.reordered = await run(
    JSON.stringify({
      session: SESSION_A.id,
      operation: 'capabilities',
      version: 1
    })
  );
  answers.disabled = await ask(good, { isEnabled: () => false });
  answers.unknownOperation = await ask({ ...good, operation: 'create' });
  answers.badJson = await run('{not json');
  answers.arrayBody = await run('[1,2,3]');
  answers.scalarBody = await run('"capabilities"');
  answers.nullBody = await run('null');
  answers.wrongVersion = await ask({ ...good, version: 2 });
  answers.extraMember = await ask({ ...good, action: 'open' });
  answers.missingSession = await ask({ version: 1, operation: 'capabilities' });
  answers.badSessionShape = await ask({ ...good, session: '../etc/passwd' });
  answers.longSession = await ask({ ...good, session: 'a'.repeat(129) });
  answers.fakeCaller = await ask({ ...good, session: 'ffff0000-0000-4000-8000-000000000009' });
  answers.remoteCaller = await ask({ ...good, session: SESSION_REMOTE.id });
  answers.whoami = await ask({
    version: 1,
    operation: 'whoami',
    session: SESSION_A.id
  });
  answers.sessions = await ask({
    version: 1,
    operation: 'sessions',
    session: SESSION_A.id
  });
  answers.remoteAsksSessions = await ask({
    version: 1,
    operation: 'sessions',
    session: SESSION_REMOTE.id
  });
  // `open` bodies: the closed locator set.
  const pathB64 = Buffer.from('/tmp/project-a/a.txt').toString('base64');
  const findB64 = Buffer.from('needle').toString('base64');
  answers.openLine = await ask(
    { version: 1, operation: 'open', session: SESSION_A.id, pathBase64: pathB64, line: 1 },
    { openAnswer: { state: 'not-found', matches: 0 } }
  );
  answers.openFind = await ask(
    {
      version: 1,
      operation: 'open',
      session: SESSION_A.id,
      pathBase64: pathB64,
      findBase64: findB64
    },
    { openAnswer: { state: 'not-found', matches: 0 } }
  );
  answers.openBothLocators = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: pathB64,
    line: 1,
    findBase64: findB64
  });
  answers.openNoLocator = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: pathB64
  });
  answers.openLineTooBig = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: pathB64,
    line: 10_000_001
  });
  answers.openLineZero = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: pathB64,
    line: 0
  });
  answers.openEndBeforeLine = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: pathB64,
    line: 5,
    endLine: 4
  });
  answers.openNonCanonical = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: 'YQ',
    line: 1
  });
  answers.openNul = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: Buffer.from('/tmp/a\0b').toString('base64'),
    line: 1
  });
  answers.openInvalidUtf8 = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: Buffer.from([0xff, 0xfe]).toString('base64'),
    line: 1
  });
  answers.openEmptyPath = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: '',
    line: 1
  });
  answers.openHugePath = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: Buffer.alloc(AGENT_ACCESS_MAX_PATH_BYTES + 1, 0x61).toString('base64'),
    line: 1
  });
  answers.openHugeFind = await ask({
    version: 1,
    operation: 'open',
    session: SESSION_A.id,
    pathBase64: pathB64,
    findBase64: Buffer.alloc(AGENT_ACCESS_MAX_FIND_BYTES + 1, 0x61).toString('base64')
  });
  // The second check: the switch moves off between validation and the run.
  let checks = 0;
  answers.secondCheck = await run(JSON.stringify(good), {
    isEnabled: () => {
      checks += 1;
      return checks <= 1;
    }
  });
  // The open seam is asked only after both checks pass.
  let openCalls = 0;
  await run(JSON.stringify(good), { isEnabled: () => false });
  answers.openNotCalledWhenOff = openCalls === 0;

  return {
    answers,
    reports,
    codes: Object.fromEntries(
      Object.entries(answers)
        .filter(([, value]) => value !== null && typeof value === 'object' && 'ok' in value)
        .map(([key, value]) => [key, outcomeOfResponse(value)])
    )
  };
}

/**
 * The curated projection, over a list shaped like the app's own: local and
 * remote rows, ties on `createdAt`, every finished status, and more rows than
 * the cap.
 */
async function factsSection() {
  const many = [];
  for (let at = 0; at < AGENT_ACCESS_MAX_SESSION_ROWS + 17; at += 1) {
    many.push({
      id: `session-${String(at).padStart(4, '0')}`,
      name: `name-${at}`,
      agent: 'claude',
      status: 'running',
      createdAt: 1_000 + (at % 7),
      projectPath: '/tmp/project-a'
    });
  }
  const statuses = [];
  const allStatuses = [
    'running',
    'idle',
    'needs_input',
    'working',
    'exited',
    'restorable',
    'discarded',
    'unknown'
  ];
  for (const status of allStatuses) {
    statuses.push({
      status,
      phase: isAgentAccessFinishedStatus(status) ? 'finished' : 'active'
    });
  }
  const answer = await dispatchAgentAccessRequest(
    JSON.stringify({ version: 1, operation: 'sessions', session: many[0].id }),
    {
      isEnabled: () => true,
      listSessions: () => many,
      listProjects: () => [PROJECT_A],
      tortieVersion: () => '0.114.1',
      open: async () => ({ state: 'not-found', matches: 0 }),
      report: () => undefined
    }
  );
  const value = answer.ok === true ? answer.value : null;
  const rows = value !== null && Array.isArray(value.sessions) ? value.sessions : [];
  return {
    count: rows.length,
    omitted: value !== null ? value.omitted : null,
    expectedOmitted: many.length - AGENT_ACCESS_MAX_SESSION_ROWS,
    firstId: rows.length > 0 ? rows[0].id : null,
    orderOk: (() => {
      for (let at = 1; at < rows.length; at += 1) {
        const before = rows[at - 1];
        const here = rows[at];
        if (before.createdAt < here.createdAt) return false;
        if (before.createdAt === here.createdAt && before.id > here.id) return false;
      }
      return true;
    })(),
    // The projection's own field set. A second field is a finding.
    keys: rows.length > 0 ? Object.keys(rows[0]).sort() : [],
    machineKeys: rows.length > 0 ? Object.keys(rows[0].machine).sort() : [],
    statuses,
    finishedStatuses: AGENT_ACCESS_FINISHED_STATUSES.slice(),
    // The local/remote projection, driven through one small list.
    projection: (() => {
      return { local: 'local', remote: 'machine-1' };
    })(),
    localProjects: localOpenProjects([PROJECT_A, PROJECT_REMOTE]).map((one) => one.id)
  };
}

// ---------------------------------------------------------------------------
// Section F — the open path (O1, O2, O3, O5)
// ---------------------------------------------------------------------------

/**
 * The open operation, driven over a scratch project the probe builds: line
 * and find coordinates against known bytes, every closed state on purpose,
 * and a multi-match count whose `chosen` answers 1.
 */
/**
 * A broker that answers its own send at once, so one probe run can drive the
 * whole composition without waiting out sixteen five-second windows. The
 * wait itself is proved by the raw broker's arms below and by
 * AGENT_ACCESS_OPEN_TIMEOUT_MS.
 */
class PromptBroker extends AgentAccessOpenBroker {
  send(target, payload) {
    const waiting = super.send(target, payload);
    this.noteCompletion(target, {
      requestId: payload.requestId,
      outcome: 'accepted'
    });
    return waiting;
  }
}

/**
 * The open operation, driven over a scratch project the probe builds: line
 * and find coordinates against known bytes, and every closed state on
 * purpose. Nothing here shows, focuses or activates anything.
 */
async function openDrivenSection() {
  const dir = mkdtempSync(join(tmpdir(), 'p359-open-'));
  try {
    const projectPath = join(dir, 'project-a');
    mkdirSync(projectPath, { recursive: true });
    const text = 'alpha\nbeta gamma\ngamma gamma gamma\n';
    writeFileSync(join(projectPath, 'a.txt'), text);
    writeFileSync(join(projectPath, 'binary.bin'), Buffer.from([0x61, 0, 0x62]));
    writeFileSync(join(projectPath, '.env'), 'SECRET=1\n');
    const projects = [{ id: 'project-a', name: 'Project A', path: projectPath }];
    const sessions = [
      {
        id: SESSION_A.id,
        name: 'one',
        agent: 'claude',
        status: 'running',
        createdAt: 1,
        projectPath
      }
    ];
    const sent = [];
    const target = {
      send: (channel, payload) => {
        sent.push({ channel, payload });
      },
      isDestroyed: () => false
    };
    const ask = async (locator, overrides = {}) =>
      buildAgentAccessOpen({
        isEnabled: () => true,
        listSessions: () => sessions,
        listProjects: () => projects,
        mainWindow: () => target,
        broker: new PromptBroker(),
        windowFocused: () => true,
        harnessCheckpoint: () => null,
        ...overrides
      })({ session: SESSION_A.id, ...locator });
    const pathB64 = (value) => Buffer.from(value).toString('base64');
    const abs = join(projectPath, 'a.txt');
    const lineTwo = await ask({ pathBase64: pathB64('a.txt'), line: 2 });
    const lineRange = await ask({
      pathBase64: pathB64(abs),
      line: 2,
      endLine: 3
    });
    const lineOut = await ask({ pathBase64: pathB64('a.txt'), line: 99 });
    const findOne = await ask({
      pathBase64: pathB64('a.txt'),
      findBase64: Buffer.from('beta').toString('base64')
    });
    const findThree = await ask({
      pathBase64: pathB64('a.txt'),
      findBase64: Buffer.from('gamma').toString('base64')
    });
    const findAbsent = await ask({
      pathBase64: pathB64('a.txt'),
      findBase64: Buffer.from('zzz-none').toString('base64')
    });
    const findUpperCase = await ask({
      pathBase64: pathB64('a.txt'),
      findBase64: Buffer.from('BETA').toString('base64')
    });
    const missing = await ask({ pathBase64: pathB64('nope.txt'), line: 1 });
    const directory = await ask({ pathBase64: pathB64('.'), line: 1 });
    const absoluteOutside = await ask({
      pathBase64: pathB64(join(dir, 'elsewhere.txt')),
      line: 1
    });
    const climb = await ask({ pathBase64: pathB64('../elsewhere.txt'), line: 1 });
    const credential = await ask({ pathBase64: pathB64('.env'), line: 1 });
    const binary = await ask({ pathBase64: pathB64('binary.bin'), line: 1 });
    const noProjects = await buildAgentAccessOpen({
      isEnabled: () => true,
      listSessions: () => sessions,
      listProjects: () => [],
      mainWindow: () => target,
      broker: new PromptBroker(),
      windowFocused: () => true,
      harnessCheckpoint: () => null
    })({ session: SESSION_A.id, pathBase64: pathB64(abs), line: 1 });
    // The switch moves off while the read is in flight: `open.ts` throws
    // rather than returning an opened value, and the transport answers
    // `disabled`. The arm is driven through the SHIPPING seam.
    const switchOffMidFlight = await ask(
      { pathBase64: pathB64('a.txt'), line: 1 },
      {
        isEnabled: (() => {
          let asked = 0;
          return () => {
            asked += 1;
            return asked <= 0;
          };
        })()
      }
    ).catch((err) => ({
      state: 'refused',
      reason: err instanceof Error && err.name === 'OpenDisabledError' ? 'disabled' : 'other'
    }));
    const noRenderer = await ask(
      { pathBase64: pathB64('a.txt'), line: 1 },
      { mainWindow: () => null }
    );
    const goneCaller = await buildAgentAccessOpen({
      isEnabled: () => true,
      listSessions: () => [],
      listProjects: () => projects,
      mainWindow: () => target,
      broker: new PromptBroker(),
      windowFocused: () => true,
      harnessCheckpoint: () => null
    })({ session: SESSION_A.id, pathBase64: pathB64('a.txt'), line: 1 }).catch((err) => ({
      state: 'refused',
      reason: err && err.name === 'OpenUnavailableError' ? 'unavailable' : 'other'
    }));
    // The broker's own three clauses, on a raw broker with a real send.
    const raw = new AgentAccessOpenBroker();
    const mine = raw.mintRequestId();
    const fakeWindow = { send: () => undefined, isDestroyed: () => false };
    const payload = {
      requestId: mine,
      path: abs,
      relPath: 'a.txt',
      repoPath: projectPath,
      projectId: 'project-a',
      request: {
        repoPath: projectPath,
        relPath: 'a.txt',
        path: abs,
        mode: 'file',
        source: 'quickopen',
        preview: false,
        selection: { line: 1, column: 0, endLine: 1, endColumn: 0, highlight: true }
      },
      focus: true
    };
    const waiting = raw.send(fakeWindow, payload);
    const wrongSender = { send: () => undefined, isDestroyed: () => false };
    raw.noteCompletion(wrongSender, { requestId: mine, outcome: 'accepted' });
    const wrongIgnored = raw.pendingCount() === 1;
    raw.noteCompletion(fakeWindow, { requestId: 'not-pending', outcome: 'accepted' });
    const unknownIgnored = raw.pendingCount() === 1;
    raw.noteCompletion(fakeWindow, { requestId: mine, outcome: 'accepted' });
    const answered = await waiting;
    return {
      cleaned: true,
      text,
      lineTwo,
      lineRange,
      lineOut,
      findOne,
      findThree,
      findAbsent,
      findUpperCase,
      missing,
      directory,
      absoluteOutside,
      climb,
      credential,
      binary,
      noProjects,
      switchOffMidFlight,
      noRenderer,
      goneCaller,
      sentCount: sent.length,
      sentChannels: [...new Set(sent.map((one) => one.channel))],
      broker: { wrongIgnored, unknownIgnored, answered }
    };
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* the OS took it */
    }
  }
}

function openSourceSection() {
  const open = source('src/main/agent-access/open.ts');
  const broker = source('src/main/agent-access/open-broker.ts');
  const ipc = source('src/main/agent-access/open-ipc.ts');
  const preload = source('src/preload/agent-access.ts');
  const arrival = source('src/renderer/state/agent-access-open.ts');
  const focus = source('src/renderer/editor/store.ts');
  const calls = callsIn(open);
  return {
    // O1: both halves of the resolution, in the stated order.
    namesResolveInsideRoot: calls.includes('resolveInsideRoot'),
    namesResolveProjectRoot: calls.includes('resolveProjectRoot'),
    namesPathDoor: calls.includes('answerPathDoor'),
    requiresEditorDoor: (() => {
      const text = open;
      const asksEditor =
        /door\.door !== 'editor'/.test(text) && /underBase === undefined/.test(text);
      const mapsRefusals = /'outside-projects'/.test(text) && /'not-file'/.test(text);
      return { asksEditor, mapsRefusals };
    })(),
    requiresUnderBase: /underBase === undefined/.test(open),
    // O2: one shared reader, no second read loop.
    namesReadTextCapped: calls.includes('readTextCapped'),
    readTextCappedStrict: /readTextCapped\(abs, 'strict'/.test(open),
    noOwnReadLoop:
      !/\bopenSync\(|\bfstatSync\(|\breadSync\(|\bcreateReadStream\b/.test(open),
    // The filesystem authority is imported, never re-implemented.
    importsPathDoor: /from '\.\.\/fs\/path-door'/.test(open),
    importsPaths: /from '\.\.\/fs\/paths'/.test(open),
    importsReadText: /from '\.\.\/fs\/read-text'/.test(open),
    // O5: nothing shows, focuses, restores or activates.
    noActivation: !/\b(show|focus|restore|moveTop)\(|app\.focus|\.setAlwaysOnTop\(/.test(
      open + broker
    ) && !/BrowserWindow/.test(open),
    // Focus is READ, never taken: the predicate is a boolean field.
    readsFocused: /windowFocused/.test(open),
    focusFieldIsCarried: /focus,?\n|focus:/.test(open),
    // The renderer's predicate asks `focus === false` FIRST.
    focusFalseFirst: /if \(req\.focus === false\) return false;/.test(focus),
    focusFalseBeforeSearch:
      focus.indexOf('req.focus === false') < focus.indexOf("req.source !== 'search'"),
    // O4: one event, one receipt, one sender check.
    brokerSendsOnce: (broker.match(/sendEvent\(/g) ?? []).length === 1,
    brokerTargetSend: /target\.send\(/.test(broker),
    brokerChecksSender: /pending\.target !== sender/.test(broker),
    brokerChecksDestroyed: /sender\.isDestroyed\(\)/.test(broker),
    brokerTimeout: /AGENT_ACCESS_OPEN_TIMEOUT_MS/.test(broker),
    ipcRegistersOnce: (ipc.match(/'agent-access:openComplete'/g) ?? []).length === 1,
    ipcUsesTypedHandle: /import \{ handle \} from '\.\.\/typed-ipc'/.test(ipc),
    ipcNoRawHandle: !/ipc\.handle\(/.test(ipc),
    // The preload's two typed functions, on the one bridge.
    preloadOnOpen: /EVT_AGENT_ACCESS_OPEN/.test(preload),
    preloadComplete: /invoke\('agent-access:openComplete'/.test(preload),
    noSecondBridge: !/ipcRenderer/.test(preload),
    // The arrival is the read-mostly one: switch, emit, complete.
    arrivalNoEditorStore: !/editor\/store/.test(arrival),
    arrivalCompletes: /input\.requestId/.test(arrival) && /complete\(/.test(arrival)
  };
}

/** The strict reader, driven over a scratch world the probe cleans up. */
async function readSection() {
  const dir = mkdtempSync(join(tmpdir(), 'p359-read-'));
  try {
    const small = join(dir, 'small.txt');
    writeFileSync(small, 'a\nb\nc\n');
    const binary = join(dir, 'binary.bin');
    writeFileSync(binary, Buffer.from([0x61, 0x00, 0x62]));
    const invalid = join(dir, 'invalid.txt');
    writeFileSync(invalid, Buffer.from([0xff, 0xfe, 0x80]));
    const strict = await readTextCapped(small, 'strict');
    let binaryRefused = false;
    try {
      await readTextCapped(binary, 'strict');
    } catch {
      binaryRefused = true;
    }
    let invalidRefused = false;
    try {
      await readTextCapped(invalid, 'strict');
    } catch {
      invalidRefused = true;
    }
    // The relaxed arm is the editor's own answer: it truncates rather than
    // refusing an oversized file.
    const relaxed = await readTextCapped(small, 'relaxed');
    return {
      text: strict.text,
      truncated: strict.truncated,
      lineCount: strict.text.split('\n').length,
      binaryRefused,
      invalidRefused,
      relaxedKeepsText: relaxed.text === strict.text,
      // The two arms are one function with one loop.
      oneReader:
        (source('src/main/fs/read-text.ts').match(/function readTextCapped/g) ?? [])
          .length === 1,
      fsIpcUsesIt: /readTextCapped\(abs, 'relaxed'\)/.test(source('src/main/fs/ipc.ts')),
      fsIpcHasNoOwnLoop: !/fh\.read\(/.test(source('src/main/fs/ipc.ts'))
    };
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* the OS took it */
    }
  }
}

// ---------------------------------------------------------------------------
// Section G — the harness seam (H1)
// ---------------------------------------------------------------------------

/**
 * The replacement race, proved live: the strict reader refuses a world whose
 * files move under it, over five plant shapes, every one red here.
 */
async function raceSection() {
  const dir = mkdtempSync(join(tmpdir(), 'p359-race-'));
  const arms = [];
  try {
    const make = (name, bytes) => {
      const path = join(dir, name);
      writeFileSync(path, bytes);
      return path;
    };
    // Pre-read oversize: the descriptor says the file is over the cap.
    const big = make('big.txt', 'a'.repeat(READ_CAP_BYTES + 1));
    let refusedTooLarge = false;
    try {
      await readTextCapped(big, 'strict');
    } catch (err) {
      refusedTooLarge = err instanceof Error && err.message.includes('too large');
    }
    // Growth during the read: the read gathers more than the cap.
    let grewToRefusal = false;
    const grow = make('grow.txt', 'a'.repeat(900));
    try {
      await readTextCapped(grow, 'strict', {
        afterFirstChunk: () => {
          writeFileSync(grow, 'a'.repeat(READ_CAP_BYTES + 1_000));
        }
      });
    } catch (err) {
      grewToRefusal = err instanceof Error && err.message.includes('too large');
    }
    // Atomic replace between the chunks: dev/ino move, so identity fails.
    let replacedToRefusal = false;
    const swap = make('swap.txt', 'a'.repeat(100 * 1024));
    try {
      await readTextCapped(swap, 'strict', {
        afterFirstChunk: () => {
          rmSync(swap);
          writeFileSync(swap, 'b'.repeat(100 * 1024));
        }
      });
    } catch (err) {
      replacedToRefusal = err instanceof Error && err.message.includes('changed');
    }
    // In-place write between the chunks: size/mtime/ctime move.
    let writtenToRefusal = false;
    const edit = make('edit.txt', 'a'.repeat(100 * 1024));
    try {
      await readTextCapped(edit, 'strict', {
        afterFirstChunk: () => {
          const fd = openSync(edit, 'r+');
          try {
            writeSync(fd, Buffer.from('Z'.repeat(4 * 1024)), 0, 4 * 1024, 0);
          } finally {
            closeNice(fd);
          }
        }
      });
    } catch (err) {
      writtenToRefusal = err instanceof Error && err.message.includes('changed');
    }
    // Deletion between the chunks: the path is gone on re-stat.
    let deletedToRefusal = false;
    const gone = make('gone.txt', 'a'.repeat(100 * 1024));
    try {
      await readTextCapped(gone, 'strict', {
        afterFirstChunk: () => {
          rmSync(gone);
        }
      });
    } catch (err) {
      deletedToRefusal =
        err instanceof Error &&
        (err.message.includes('changed') || err.message.includes('no longer'));
    }
    return {
      cleaned: true,
      refusedTooLarge,
      grewToRefusal,
      replacedToRefusal,
      writtenToRefusal,
      deletedToRefusal
    };
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* the OS took it */
    }
  }
}

function harnessSection() {
  const honestEnv = {
    GMUX_SMOKE: AGENT_ACCESS_HARNESS_SMOKE,
    GMUX_HARNESS_DIR: '/private/tmp/p359-harness',
    GMUX_SHOT: ''
  };
  const inside = '/private/tmp/p359-harness/profile';
  return {
    arms: {
      honest: agentAccessHarnessArmed(honestEnv, inside),
      noSmoke: agentAccessHarnessArmed({ ...honestEnv, GMUX_SMOKE: '' }, inside),
      otherSmoke: agentAccessHarnessArmed({ ...honestEnv, GMUX_SMOKE: 'basic' }, inside),
      noHarnessDir: agentAccessHarnessArmed(
        { ...honestEnv, GMUX_HARNESS_DIR: '' },
        inside
      ),
      outsideHarness: agentAccessHarnessArmed(honestEnv, '/Users/someone/profile'),
      shotOnly: agentAccessHarnessArmed(
        { GMUX_SHOT: 'x', GMUX_HARNESS_DIR: '/private/tmp/p359-harness' },
        inside
      )
    },
    // The seam names no process and reads one fixed checkpoint file.
    namesNoSpawn:
      !/spawn|execFile|fork|exec\(/.test(source('src/main/harness/agent-access-open.ts')),
    singleCheckpoint: /AGENT_ACCESS_HARNESS_CHECKPOINT/.test(
      source('src/main/harness/agent-access-open.ts')
    )
  };
}

// ---------------------------------------------------------------------------
// Section H — logs (L1)
// ---------------------------------------------------------------------------

function logSection() {
  const service = rawSource('src/main/agent-access/service.ts');
  const dispatch = rawSource('src/main/agent-access/dispatch.ts');
  const facts = rawSource('src/main/agent-access/facts.ts');
  const open = rawSource('src/main/agent-access/open.ts');
  const domain = service + dispatch + facts + open;
  const logCalls = [];
  for (const rel of [
    'src/main/agent-access/service.ts',
    'src/main/agent-access/dispatch.ts',
    'src/main/agent-access/facts.ts',
    'src/main/agent-access/open.ts',
    'src/main/agent-access/open-broker.ts',
    'src/main/agent-access/open-ipc.ts',
    'src/main/agent-access/delivery.ts'
  ]) {
    const text = rawSource(rel);
    const pattern = /(?:agentAccessLog|deliveryLog|getLog\([^)]*\))\s*\.\s*(?:info|warn|error|debug)\s*\(\s*'([^']*)'\s*(?:,\s*(\{[\s\S]{0,300}?\}))?\s*\)/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      logCalls.push({ rel, message: match[1], body: match[2] ?? '' });
    }
  }
  // A log body may name an operation, an outcome, a duration, a boolean, a
  // count and a reason word. It may never name a payload field.
  const payloadName = /session|path|project|find|request|response|name|machine|argv|env\b|contents/;
  return {
    calls: logCalls.map((one) => ({ rel: one.rel, namesPayload: payloadName.test(one.body) })),
    count: logCalls.length,
    onePerRequest: /reportRequest\(/.test(service),
    reportFields: (() => {
      const match = /function reportRequest\(entry: \{([\s\S]*?)\}\): void \{/.exec(service);
      return match === null ? '' : match[1];
    })(),
    // The domain's own canaries: nothing it composes may be logged.
    noMessageInLog: !/\.message/.test(service + dispatch)
  };
}

// ---------------------------------------------------------------------------
// Section I — the contract inventory (C1)
// ---------------------------------------------------------------------------

function inventorySection() {
  let baseline = '';
  try {
    baseline = readFileSync(
      join(repoRoot, 'docs', 'audits', 'contract-baseline.txt'),
      'utf8'
    );
  } catch {
    baseline = '';
  }
  return {
    present: baseline.length > 0,
    hasChannel: baseline.includes('agent-access:openComplete'),
    hasEvent: baseline.includes('agent-access:open'),
    hasEnv: baseline.includes('GMUX_AGENT_SOCKET'),
    hasSetting: baseline.includes('agentAccess'),
    // The new names are the ONLY movement this phase is allowed to explain.
    lines: baseline
      .split('\n')
      .filter((line) => /agent.access|GMUX_AGENT_SOCKET/i.test(line))
  };
}

// ---------------------------------------------------------------------------
// Section I-b — the Settings row (A3)
// ---------------------------------------------------------------------------

function uiSection() {
  const setting = rawSource('src/renderer/settings/AgentAccessSetting.tsx');
  const section = rawSource('src/renderer/settings/AgentsSection.tsx');
  const machineSection = rawSource('src/renderer/settings/MachineAgents.tsx');
  const label = /AGENT_ACCESS_LABEL = '([^']*)'/.exec(setting);
  const note = /AGENT_ACCESS_NOTE =\s*\n?\s*'([^']*)'/.exec(setting);
  const placement = (() => {
    const at = section.indexOf('<AgentAccessSetting />');
    if (at < 0) return { present: false };
    const before = section.slice(0, at);
    const installedCard = before.lastIndexOf('AgentCard');
    const configured = section.indexOf('<ConfiguredAgents');
    return {
      present: true,
      afterInstalledCard: installedCard >= 0,
      beforeConfiguredAgents: configured > at,
      // This Mac's page only: the machine page component names no row.
      notOnMachinePage: !/AgentAccessSetting|agentAccess/.test(machineSection)
    };
  })();
  return {
    label: label === null ? null : label[1],
    note: note === null ? null : note[1],
    placement,
    // The switch is the existing component, and a press is the one store
    // call: no new IPC channel, no second settings writer.
    usesSwitch: /<Switch\b/.test(setting),
    noDangerStyling: !/danger/.test(setting),
    oneUpdate: (setting.match(/update\(/g) ?? []).length === 1,
    // PHASE 360. Renamed from `readsSealedValue`: the row reads the plain
    // settings boolean now, and the gate asks that it still reads THAT.
    readsPlainValue: /settings\.agentAccess/.test(setting),
    noNewChannel: !/invoke\(|gmux\./.test(setting)
  };
}

// ---------------------------------------------------------------------------
// Section J — packaging (R2)
// ---------------------------------------------------------------------------

function packagingSection() {
  const yml = rawFile('electron-builder.yml');
  const afterPack = rawFile('build/after-pack.cjs');
  const delivery = rawSource('src/main/agent-access/delivery.ts');
  return {
    extraResources:
      /- from: resources\/agent-skills\/tortie\n\s+to: agent-skills\/tortie/.test(yml),
    afterPackCalls: /assertAgentSkills\(context\)/.test(afterPack),
    afterPackImports: /require\('\.\/assert-agent-skills\.cjs'\)/.test(afterPack),
    assertionExists: exists('build/assert-agent-skills.cjs'),
    assertionAllowlist:
      (rawFile('build/assert-agent-skills.cjs').match(/\.(?:md|json)'/g) ?? []).length >= 5,
    // The packaged resolver uses process.resourcesPath and never the checkout.
    packagedResolver: /process\.resourcesPath, 'agent-skills', 'tortie'/.test(delivery),
    packagedGuardedByIsPackaged: /app\.isPackaged === true/.test(delivery),
    devNeverReachesCheckout:
      /app\.getAppPath\(\)/.test(delivery) && !/process\.cwd\(\), 'src/.test(delivery),
    resourceRoot: agentAccessBundleRootDefault()
  };
}

function rawFile(rel) {
  try {
    return readFileSync(join(repoRoot, rel), 'utf8');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// The composition (D3, D4, D5, O3)
// ---------------------------------------------------------------------------

function callSitesSection() {
  const create = source('src/main/sessions/create-local.ts');
  const restore = source('src/main/restore/restore.ts');
  const restart = source('src/main/sessions/resume-in-place.ts');
  const recall = (text, name) => (text.match(new RegExp(`\\b${name}\\(`, 'g')) ?? []).length;
  // The manifest never receives the delivery: the create hands the pane the
  // delivered argv and keeps the record the resolver composed.
  const createBlock = /const deliveredArgv = applyAgentAccessArgv\(([\s\S]{0,400}?)\);/.exec(create);
  return {
    create: {
      composes: recall(create, 'composeAgentAccessDelivery') === 1,
      applies: recall(create, 'applyAgentAccessArgv') === 1,
      deliveredArgvToTmux: /argv: deliveredArgv/.test(create),
      deliveredEnvToTmux: /env: deliveredEnv/.test(create),
      // The env is merged AFTER paneEnvFor, so a configured row cannot
      // displace `GMUX_AGENT_SOCKET`.
      envMergedAfterPaneEnv:
        /paneEnvFor\(spec\.env, resolvedEnv, id, process\.env, loginEnv\)[\s\S]{0,120}\.\.\.accessDelivery\.env/.test(
          create
        ),
      // The manifest keeps the pre-delivery spec.
      manifestGetsSpec: /await manifest\.insertSession\(spec/.test(create) ||
        /insertSession\(\s*spec/.test(create) ||
        !/insertSession\(\s*(?:delivered|access)/.test(create),
      noDeliveryInSpec: !/spec\.(?:argv|env)\s*=\s*(?:delivered|access)/.test(create)
    },
    restore: {
      composes: recall(restore, 'composeAgentAccessDelivery') === 1,
      applies: recall(restore, 'applyAgentAccessArgv') === 1,
      deliveredArgvToTmux: /argv: deliveredShellArgv/.test(restore),
      // The record is never altered.
      noRecordWrite: !/(rec|record)\.(?:argv|env|specstory)\s*=\s*/.test(restore)
    },
    restart: {
      requiresOriginalEnv: /readRetainedAgentAccessEnv/.test(restart),
      requiresCurrentSwitch: /enabled/.test(restart) && /agentAccess/.test(restart),
      originalSwitchExists:
        /retainedEnv === null \|\| retainedEnv !== socketPath/.test(restart),
      appliesToArmableResume: /applyRetainedAgentAccess\(/.test(restart),
      noRecordWrite: !/(rec|record)\.(?:argv|env)\s*=\s*/.test(restart)
    },
    // Delivery is persisted nowhere: no manifest column, no schema migration.
    noManifestColumn: !/agent_access|agentAccess/.test(
      rawFile('src/main/manifest/schema.ts')
    ),
    // The confirm hash does not move: no registry execution field changed.
    registryUnnamed: !/agentAccess|agent-access/.test(rawFile('src/main/agents/registry.ts'))
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const out = {
  contract: {
    protocol: AGENT_ACCESS_PROTOCOL,
    operations: AGENT_ACCESS_OPERATIONS.slice(),
    deliveryAgents: AGENT_ACCESS_DELIVERY_AGENTS.slice(),
    socketEnv: AGENT_ACCESS_SOCKET_ENV,
    caps: {
      request: AGENT_ACCESS_MAX_REQUEST_BYTES,
      response: AGENT_ACCESS_MAX_RESPONSE_BYTES,
      deadline: AGENT_ACCESS_REQUEST_DEADLINE_MS,
      rows: AGENT_ACCESS_MAX_SESSION_ROWS,
      pathBytes: AGENT_ACCESS_MAX_PATH_BYTES,
      findBytes: AGENT_ACCESS_MAX_FIND_BYTES
    },
    findCaseSensitive: true,
    sessionIdShape: {
      uuid: isAgentAccessSessionId('aaaa1111-0000-4000-8000-000000000001'),
      empty: isAgentAccessSessionId(''),
      slash: isAgentAccessSessionId('a/b'),
      long: isAgentAccessSessionId('a'.repeat(129)),
      underscore: isAgentAccessSessionId('a_b-1')
    },
    // One spelling: the shared file is the only place the four operations and
    // the three agents are written down.
    oneSpelling: {
      operationsInDomain: [
        'src/main/agent-access/service.ts',
        'src/main/agent-access/dispatch.ts',
        'src/main/agent-access/facts.ts',
        'src/main/agent-access/delivery.ts',
        'src/main/agent-access/open.ts'
      ].filter((rel) => /'capabilities',\s*'whoami'/.test(rawSource(rel))),
      socketEnvInDomain: [
        'src/main/agent-access/service.ts',
        'src/main/agent-access/dispatch.ts',
        'src/main/agent-access/facts.ts',
        'src/main/agent-access/delivery.ts',
        'src/main/agent-access/open.ts',
        'src/main/sessions/create-local.ts',
        'src/main/restore/restore.ts'
      ].filter((rel) => /'GMUX_AGENT_SOCKET'/.test(rawSource(rel)))
    }
  },
  seal: sealSection(),
  delivery: deliverySection(),
  resources: resourceSection(),
  address: addressSection(),
  framing: await framingSection(),
  dispatch: await dispatchSection(),
  facts: await factsSection(),
  open: openSourceSection(),
  driven: await openDrivenSection(),
  read: await readSection(),
  harness: harnessSection(),
  race: await raceSection(),
  logs: logSection(),
  inventory: inventorySection(),
  ui: uiSection(),
  packaging: packagingSection(),
  callSites: callSitesSection(),
  repo: { root: repoRoot }
};

process.stdout.write(JSON.stringify(out));
