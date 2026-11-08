#!/usr/bin/env node
/**
 * `npm run conformance:agentaccess` — the cheap gate on Phase 359's private
 * door, and the executable half of everything the phase promises.
 *
 * WHAT IT IS FOR. Phase 359 lets a Tortie session ask Tortie about itself and
 * ask it to show a file. Every promise that makes that harmless is ONE clause
 * in one module: the sealed switch, three delivered rows and ten null ones, a
 * resource that ships as data, one private socket with a 103-byte address, a
 * closed operation set, a curated row projection, a validated editor-only
 * open, and a log line that carries no payload. Each of those is a line a
 * later round can delete with every other gate in this repository still green.
 * This file is the executable half, in about three seconds.
 *
 * WHAT IT STARTS. No Electron, no tmux, no ssh, no agent, no token, no
 * network, no vendor process, and no file under the person's home. The probe
 * beside it (`build/p359/agent-access-probe.mts`) binds ONE scratch Unix
 * socket in the system's temporary directory — framing, caps and the absolute
 * deadline can only be driven over a real socket — and removes it, and its
 * scratch folder, in a `finally`.
 *
 * EVERY RULE IS ASKED TWICE. Each rule below is a function over the probe's
 * JSON. The checker first asks it of the honest data and requires silence,
 * then asks it of an in-memory copy with that rule's own clause BROKEN and
 * requires a finding. A control arm stays green through both, so a rule that
 * simply fails everything cannot pass this section. That is this tree's
 * standing rule for a source-reading gate: a scan that cannot fail is never
 * mistaken for a scan that passed.
 *
 * WHAT IT CANNOT PROVE, said so nobody reads more into a pass.
 * `src/main/agent-access/service.ts` takes its address from
 * `app.getPath('userData')`, so a listener cannot be started without Electron:
 * the reconcile queue, the stale-inode replacement and the shutdown join are
 * READ here (with a mutation control each) and DRIVEN by
 * `build/p359/probe-p359.mjs` and the phase's Tier 3 verifiers. Nothing here
 * spends a model turn, so this gate says nothing about whether a model
 * receives or obeys the skill: catalog presence is not prompt delivery.
 */

import { spawnSync } from 'node:child_process';
import { tsxCli } from './ts-runner.mjs';

const probe = spawnSync(
  process.execPath,
  [
    tsxCli(),
    '--tsconfig',
    'tsconfig.node.json',
    'build/p359/agent-access-probe.mts'
  ],
  { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 32 * 1024 * 1024 }
);

if (probe.status !== 0) {
  process.stderr.write(probe.stderr || 'the probe did not run\n');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(probe.stdout);
} catch {
  process.stderr.write(`the probe did not print JSON:\n${probe.stdout.slice(0, 4000)}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// The rule table
//
// `check(d)` answers a finding string, or null when the clause holds.
// `breakIt(d)` mutates a DEEP COPY of the honest data so the same clause is
// violated, and `check` must then answer a finding.
// ---------------------------------------------------------------------------

const EXPECTED_OPERATIONS = ['capabilities', 'whoami', 'sessions', 'open'];
const EXPECTED_AGENTS = ['claude', 'pi', 'omp'];
const EXPECTED_PAIRS = {
  claude: ['--plugin-dir', '/R/agent-skills/tortie'],
  pi: ['--skill', '/R/agent-skills/tortie/skills/tortie'],
  omp: ['--plugin-dir', '/R/agent-skills/tortie']
};
/**
 * The five bundled files, by sha256. A bundle that ships different bytes is a
 * different resource than the launch pairs were measured against, so the pin
 * is here rather than in a comment: moving one of these files means moving the
 * number in the same commit.
 */
const EXPECTED_RESOURCE_SHA256 = {
  '.claude-plugin/plugin.json':
    'bb576dc2d8834cd6a05f9732eee090cd3c66d14a5ed30b7b19318f32e4051bb7',
  '.cursor-plugin/plugin.json':
    'bb576dc2d8834cd6a05f9732eee090cd3c66d14a5ed30b7b19318f32e4051bb7',
  'skills/tortie/SKILL.md':
    'b219a21a56a63974167cef03b4aa3d14656de67b3d042039a083c69bafcb334f',
  'skills/tortie/references/sessions.md':
    '9287836131693c53bbc4b6f9b6f17fedf4b1196115f80cffce0127dcf01b8ca7',
  'skills/tortie/references/editor.md':
    'c97d4154250be330693632337862396f948a122375260f122fb7a67caa43edd8'
};

const EXPECTED_LABEL = 'Allow agents to use Tortie';
const EXPECTED_NOTE =
  'New Claude Code, Pi, and omp sessions get Tortie’s skill; a session already running keeps what it started with.';

const RULES = [
  {
    id: 'A1',
    section: 'the plain switch (Phase 360; the seal is gone)',
    name: 'off by default, and on means on with no seal asked',
    check(d) {
      const s = d.seal;
      if (!s.defaultIsFalse) return 'the default is not off';
      if (!s.defaultIsBoolean) return 'the default is not a boolean';
      if (s.sharedDefault !== false) return 'the shared default is not off';
      const want = {
        trueValue: true,
        falseValue: false,
        absent: false,
        string: false,
        number: false,
        object: false,
        nullish: false
      };
      for (const [key, value] of Object.entries(want)) {
        if (s.sanitize[key] !== value) return `the shape check reads ${key} as ${s.sanitize[key]}`;
      }
      // PHASE 360. Neither seal half may change the answer or name it: the
      // switch survives a read whether the old member is covered or not.
      if (!s.sealedOnKeeps) return 'a file true read false beside a covering seal';
      if (!s.sealedOffKeeps) return 'a file true read false beside an empty seal';
      if (s.sealedOnRejected.includes('agentAccess')) {
        return 'a covered switch was still named back to Settings';
      }
      if (s.sealedOffRejected.includes('agentAccess')) {
        return 'the switch was still named back to Settings after the unseal';
      }
      // No danger member may exist for it any more.
      if (s.inDangerState !== false) return 'the switch is still a member of the danger state';
      if (s.emptyWithOnOnly !== true) {
        return 'a settings object holding only the switch is not an empty danger state';
      }
      if (s.emptyWithOff !== true) return 'a settings object with everything off is not empty';
      return null;
    },
    breakIt(d) {
      d.seal.sealedOffKeeps = false;
    }
  },
  {
    id: 'A3',
    section: 'the plain switch',
    name: 'one switch, this Mac only, with the exact words',
    check(d) {
      const u = d.ui;
      if (u.label !== EXPECTED_LABEL) return `the label reads ${JSON.stringify(u.label)}`;
      if (u.note !== EXPECTED_NOTE) return `the note reads ${JSON.stringify(u.note)}`;
      if (!u.placement.present) return 'the row is not on the Agents page';
      if (!u.placement.beforeConfiguredAgents) return 'the row is not before ConfiguredAgents';
      if (!u.placement.notOnMachinePage) return 'a machine page can draw the switch';
      if (!u.usesSwitch) return 'the row does not use the existing Switch';
      if (!u.noDangerStyling) return 'the row is drawn as a danger switch';
      if (!u.oneUpdate) return 'the row does not press the store exactly once';
      if (!u.readsPlainValue) return 'the row does not read the plain settings answer';
      if (!u.noNewChannel) return 'the row added a settings channel of its own';
      return null;
    },
    breakIt(d) {
      d.ui.placement.notOnMachinePage = false;
    }
  },
  {
    id: 'D1',
    section: 'launch delivery',
    name: 'three supported rows and the exact measured pairs',
    check(d) {
      const t = d.delivery;
      if (t.supported.join(',') !== EXPECTED_AGENTS.join(',')) {
        return `the supported set is ${t.supported.join(', ')}`;
      }
      for (const [agent, pair] of Object.entries(EXPECTED_PAIRS)) {
        const got = t.pairFor[agent];
        if (got === null || got.join('\u0000') !== pair.join('\u0000')) {
          return `${agent} composes ${JSON.stringify(got)}`;
        }
      }
      const delivering = Object.entries(t.pairFor)
        .filter(([, pair]) => pair !== null)
        .map(([id]) => id)
        .sort();
      if (delivering.join(',') !== [...EXPECTED_AGENTS].sort().join(',')) {
        return `these rows deliver: ${delivering.join(', ')}`;
      }
      if (t.unsupportedDelivering.length > 0) {
        return `unsupported rows deliver: ${t.unsupportedDelivering.join(', ')}`;
      }
      for (const [key, value] of Object.entries(t.refusals)) {
        if (!value) return `the ${key} refusal does not hold`;
      }
      if (!t.eligibleForClaude) return 'an eligible Claude Code launch reads ineligible';
      if (!t.spacedIsTwoElements) return 'a bundle path with a space is not one argv element';
      return null;
    },
    breakIt(d) {
      d.delivery.pairFor.codex = ['--plugin-dir', '/R/agent-skills/tortie'];
    }
  },
  {
    id: 'D2',
    section: 'launch delivery',
    name: 'off is byte identical, for every launchable row',
    check(d) {
      const t = d.delivery;
      if (t.launchableIds.length < 13) {
        return `only ${t.launchableIds.length} launchable rows were composed`;
      }
      for (const id of t.launchableIds) {
        const row = t.offBaseline[id];
        if (row === undefined) return `${id} was never composed with the switch off`;
        if (!row.same) return `${id} composes a different argv with the switch off`;
        if (row.env !== null) return `${id} receives an environment with the switch off`;
      }
      if (t.remoteDelivered.length > 0) {
        return `rows on another machine are delivered: ${t.remoteDelivered.join(', ')}`;
      }
      // The registry's confirm hash cannot move: no execution field changed.
      if (!d.callSites.registryUnnamed) return 'the registry names the feature';
      return null;
    },
    breakIt(d) {
      d.delivery.offBaseline[d.delivery.launchableIds[0]].same = false;
    }
  },
  {
    id: 'D3',
    section: 'launch delivery',
    name: 'one helper at three call sites, and no record receives it',
    check(d) {
      const c = d.callSites;
      if (!c.create.composes || !c.create.applies) {
        return 'the create path does not compose and apply through the one helper';
      }
      if (!c.create.deliveredArgvToTmux || !c.create.deliveredEnvToTmux) {
        return 'the create path hands tmux the pre-delivery argv or env';
      }
      if (!c.create.envMergedAfterPaneEnv) {
        return 'the socket env is merged before paneEnvFor, so a configured row can displace it';
      }
      if (!c.create.noDeliveryInSpec) return 'the create writes delivery into the manifest spec';
      if (!c.restore.composes || !c.restore.applies) {
        return 'the restore path does not compose and apply through the one helper';
      }
      if (!c.restore.noRecordWrite) return 'the restore path writes the record';
      if (!c.noManifestColumn) return 'the manifest schema gained a delivery column';
      if (!c.registryUnnamed) return 'the registry names the feature';
      return null;
    },
    breakIt(d) {
      d.callSites.create.envMergedAfterPaneEnv = false;
    }
  },
  {
    id: 'D4',
    section: 'launch delivery',
    name: 'a captured launch keeps the pair inside the wrapper and nowhere outside',
    check(d) {
      const t = d.delivery;
      if (!t.wrappedIsWrapped) return 'the captured fixture would not wrap at all';
      if (t.wrappedInside !== true) return 'the pair is not inside the SpecStory wrapper';
      if (t.wrappedOutside !== 0) {
        return `${t.wrappedOutside} pair token(s) land on SpecStory's own argv`;
      }
      if (!t.userFlagsKept) return 'an existing user flag was dropped or reordered';
      if (t.alreadyPairCount !== 1) {
        return `the exact pair appears ${t.alreadyPairCount} times when it was already present`;
      }
      if (t.additiveTail.join('\u0000') !== EXPECTED_PAIRS.claude.join('\u0000')) {
        return 'the pair is not appended last to a launch that had no pair';
      }
      return null;
    },
    breakIt(d) {
      d.delivery.wrappedOutside = 1;
    }
  },
  {
    id: 'D5',
    section: 'launch delivery',
    name: 'a retained restart needs the original env AND the current switch',
    check(d) {
      const r = d.callSites.restart;
      if (!r.requiresOriginalEnv) return 'the retained restart does not read the recorded env';
      if (!r.requiresCurrentSwitch) return 'the retained restart does not read the switch';
      if (!r.originalSwitchExists) {
        return 'the retained restart does not require the recorded address to match this profile';
      }
      if (!r.appliesToArmableResume) return 'the retained restart does not apply to the resume argv';
      if (!r.noRecordWrite) return 'the retained restart writes the record';
      return null;
    },
    breakIt(d) {
      d.callSites.restart.originalSwitchExists = false;
    }
  },
  {
    id: 'R1',
    section: 'the bundled skill',
    name: 'five files, three manifest keys, nothing that runs',
    check(d) {
      const r = d.resources;
      if (r.files.length !== 5) return `${r.files.length} resource files were read`;
      for (const file of r.files) {
        if (file.absent) return `${file.rel} is missing`;
        if (!(file.bytes > 0)) return `${file.rel} is empty`;
        const pinned = EXPECTED_RESOURCE_SHA256[file.rel];
        if (pinned === undefined) return `${file.rel} is not one of the five measured files`;
        if (pinned !== file.sha256) {
          return `${file.rel} is not the measured bytes (${file.sha256})`;
        }
      }
      for (const manifest of r.manifests) {
        if (manifest.absent) return `${manifest.rel} is missing`;
        if (manifest.keys.join(',') !== 'description,name,version') {
          return `${manifest.rel} holds ${manifest.keys.join(', ')}`;
        }
        if (manifest.name !== 'tortie-agent-access') return `${manifest.rel} names itself ${manifest.name}`;
        if (manifest.version !== '1.0.0') return `${manifest.rel} versions ${manifest.version}`;
      }
      if (r.frontmatter === null) return 'SKILL.md has no frontmatter';
      if (r.frontmatter.keys.join(',') !== 'name,description') {
        return `SKILL.md frontmatter holds ${r.frontmatter.keys.join(', ')}`;
      }
      if (r.frontmatter.values['name'] !== 'tortie') return 'the skill is not named tortie';
      for (const [key, value] of Object.entries(r.says)) {
        if (!value) return `the skill never says ${key}`;
      }
      for (const [key, value] of Object.entries(r.client)) {
        if (!value) return `the references do not teach ${key}`;
      }
      // PHASE 361, and it is a defect this gate missed for two rounds: the
      // open one-liners must hold their pipe open, because macOS nc closes the
      // connection at stdin EOF and the receipt-backed answer arrives after
      // that. A reference that teaches `printf | nc` alone teaches agents to
      // report a working open as silence.
      if (!r.client.heldPipe) return 'the open one-liners do not hold the pipe open';
      if (!r.client.sessionGone) return 'the references never name the session-gone refusal';
      if (!r.installsNothing) return 'the skill tells an agent to install something';
      return null;
    },
    breakIt(d) {
      d.resources.files[2].sha256 = '0'.repeat(64);
    }
  },
  {
    id: 'R2',
    section: 'the bundled skill',
    name: 'shipped in the bundle, outside the asar, asserted before signing',
    check(d) {
      const p = d.packaging;
      if (!p.extraResources) return 'electron-builder.yml has no agent-skills entry';
      if (!p.assertionExists) return 'build/assert-agent-skills.cjs does not exist';
      if (!p.afterPackImports) return 'afterPack does not require the assertion';
      if (!p.afterPackCalls) return 'afterPack does not call the assertion';
      if (!p.packagedResolver) return 'the resolver does not use process.resourcesPath';
      if (!p.packagedGuardedByIsPackaged) return 'the resolver is not guarded by app.isPackaged';
      if (!p.devNeverReachesCheckout) return 'the development resolver can reach the source checkout';
      return null;
    },
    breakIt(d) {
      d.packaging.afterPackCalls = false;
    }
  },
  {
    id: 'S1',
    section: 'the private socket',
    name: 'one exact address, 103 bytes, 0700 and 0600, inode-safe cleanup',
    check(d) {
      const a = d.address;
      if (!a.pathIsExact) return `the address is ${a.path}`;
      if (a.path !== '/private/tmp/p359-probe-profile/gmux/agent.sock') {
        return 'the address is not <userData>/gmux/agent.sock';
      }
      if (a.maxBytes !== 103) return `the byte bound is ${a.maxBytes}`;
      if (!a.fitsAt103) return 'a 103-byte address is refused';
      if (!a.refusesAt104) return 'a 104-byte address is accepted';
      if (!a.env || a.env.GMUX_AGENT_SOCKET !== '/x/agent.sock') {
        return 'the pane environment does not carry the exact address';
      }
      if (!a.neverTruncates) return 'the service truncates or hashes an overlong address';
      for (const [key, value] of Object.entries(a.source)) {
        if (key === 'unlinkSites') continue;
        if (!value) return `the service's ${key} clause does not hold`;
      }
      if (a.source.unlinkSites !== 2) return `${a.source.unlinkSites} unlink sites, expected 2`;
      return null;
    },
    breakIt(d) {
      d.address.source.comparesDevIno = false;
    }
  },
  {
    id: 'S2',
    section: 'the private socket',
    name: 'one request per connection, capped, on an absolute deadline',
    check(d) {
      const f = d.framing;
      const byCase = Object.fromEntries(f.answers.map((one) => [one.case, one]));
      if (!byCase['one line'].text.includes('"ok":true')) return 'a single request was not answered';
      if (!byCase['byte at a time'].text.includes('"ok":true')) {
        return 'framing depends on how the bytes are chunked';
      }
      if (byCase['second request'].text.includes('"ok":true')) {
        return 'a second request on one connection was parsed';
      }
      if (!byCase['trailing whitespace'].text.includes('"ok":true')) {
        return 'ASCII whitespace after the request was refused';
      }
      if (byCase['trailing byte'].text.includes('"ok":true')) {
        return 'a byte after the request was tolerated';
      }
      if (byCase['over the cap'].text.includes('"ok":true')) {
        return 'a request over 64 KiB was parsed';
      }
      const slow = byCase['slowloris'];
      if (!slow || slow.text === undefined) return 'the slowloris arm produced no answer';
      if (slow.text.includes('"ok":true')) return 'a slow sender got its request parsed';
      if (typeof slow.elapsedMs !== 'number') return 'the slowloris arm did not measure elapsed time';
      if (slow.elapsedMs > f.caps.deadline + 1_500) {
        return `the absolute deadline closed at ${slow.elapsedMs} ms, past ${f.caps.deadline} ms`;
      }
      if (slow.elapsedMs < f.caps.deadline - 300) {
        return `the connection closed at ${slow.elapsedMs} ms, before the deadline`;
      }
      if (!f.serialize.oneLine) return 'a response is not exactly one line';
      if (!f.serialize.refusesOverflow) return 'an over-cap response was serialized';
      // Each `split` arm is true when the splitter answered correctly: a clean
      // line is accepted, and a missing newline, a second request and trailing
      // whitespace are each decided the way §2.1 says.
      if (!f.split.clean || !f.split.none || !f.split.after || !f.split.whitespace) {
        return 'the splitter does not hold its four verdicts';
      }
      if (f.mode !== 0o600) return `the socket mode is ${f.mode === null ? 'unreadable' : f.mode.toString(8)}`;
      return null;
    },
    breakIt(d) {
      const f = d.framing;
      const slow = f.answers.find((one) => one.case === 'slowloris');
      slow.elapsedMs = f.caps.deadline + 9_000;
    }
  },
  {
    id: 'S3',
    section: 'the private socket',
    name: 'one closed operation registry, two enabled checks',
    check(d) {
      if (d.contract.operations.join(',') !== EXPECTED_OPERATIONS.join(',')) {
        return `the operations are ${d.contract.operations.join(', ')}`;
      }
      if (d.contract.deliveryAgents.join(',') !== EXPECTED_AGENTS.join(',')) {
        return `the delivery set is ${d.contract.deliveryAgents.join(', ')}`;
      }
      if (d.contract.socketEnv !== 'GMUX_AGENT_SOCKET') {
        return `the environment name is ${d.contract.socketEnv}`;
      }
      const c = d.dispatch.codes;
      const want = {
        capabilities: 'ok',
        reordered: 'ok',
        disabled: 'disabled',
        unknownOperation: 'unknown-operation',
        badJson: 'bad-request',
        arrayBody: 'bad-request',
        scalarBody: 'bad-request',
        nullBody: 'bad-request',
        wrongVersion: 'bad-request',
        extraMember: 'bad-request',
        missingSession: 'bad-request',
        badSessionShape: 'bad-request',
        longSession: 'bad-request',
        whoami: 'ok',
        sessions: 'ok',
        openBothLocators: 'bad-request',
        openNoLocator: 'bad-request',
        openLineTooBig: 'bad-request',
        openLineZero: 'bad-request',
        openEndBeforeLine: 'bad-request',
        openNonCanonical: 'bad-request',
        openNul: 'bad-request',
        openInvalidUtf8: 'bad-request',
        openEmptyPath: 'bad-request',
        openHugePath: 'bad-request',
        openHugeFind: 'bad-request',
        secondCheck: 'disabled'
      };
      for (const [key, value] of Object.entries(want)) {
        if (c[key] !== value) return `${key} answers ${c[key]}, expected ${value}`;
      }
      if (!d.dispatch.answers.openNotCalledWhenOff) {
        return 'the open seam ran with the switch off';
      }
      // One spelling: no domain file re-writes the operation list or the
      // environment name.
      if (d.contract.oneSpelling.operationsInDomain.length > 0) {
        return `the operation list is re-spelled in ${d.contract.oneSpelling.operationsInDomain.join(', ')}`;
      }
      if (d.contract.oneSpelling.socketEnvInDomain.length > 0) {
        return `the environment name is re-spelled in ${d.contract.oneSpelling.socketEnvInDomain.join(', ')}`;
      }
      return null;
    },
    breakIt(d) {
      d.dispatch.codes.secondCheck = 'ok';
    }
  },
  {
    id: 'S4',
    section: 'the private socket',
    name: 'a fake, gone or remote caller reaches no operation',
    check(d) {
      const c = d.dispatch.codes;
      for (const key of ['fakeCaller', 'remoteCaller', 'remoteAsksSessions']) {
        if (c[key] !== 'unavailable') return `${key} answers ${c[key]}`;
      }
      const shape = d.contract.sessionIdShape;
      if (!shape.uuid) return 'a current session id is refused';
      if (shape.empty || shape.slash || shape.long) return 'the id shape accepts a hostile value';
      if (!shape.underscore) return 'a legal id character is refused';
      if (d.dispatch.answers.whoami.ok !== true) return 'a real local caller was refused whoami';
      if (d.dispatch.answers.sessions.ok !== true) return 'a real local caller was refused sessions';
      return null;
    },
    breakIt(d) {
      d.dispatch.codes.fakeCaller = 'ok';
    }
  },
  {
    id: 'F1',
    section: 'the curated rows',
    name: 'eight fields, newest first, capped at 200 with the exact omitted count',
    check(d) {
      const f = d.facts;
      if (f.keys.join(',') !== 'agent,createdAt,id,machine,name,phase,project,status') {
        return `a row carries ${f.keys.join(', ')}`;
      }
      if (f.machineKeys.join(',') !== 'id,label') return `a machine carries ${f.machineKeys.join(', ')}`;
      if (f.count !== 200) return `the cap returned ${f.count} rows`;
      if (f.omitted !== f.expectedOmitted) {
        return `omitted reads ${f.omitted}, the list held ${f.expectedOmitted} more`;
      }
      if (!f.orderOk) return 'the rows are not newest first, ties by id';
      const finished = f.statuses.filter((one) => one.phase === 'finished').map((one) => one.status);
      if (finished.sort().join(',') !== 'discarded,exited,restorable') {
        return `the finished set is ${finished.join(', ')}`;
      }
      if (f.finishedStatuses.join(',') !== 'discarded,exited,restorable') {
        return `the contract's finished set is ${f.finishedStatuses.join(', ')}`;
      }
      if (f.localProjects.join(',') !== 'project-a') {
        return `open treats these as local projects: ${f.localProjects.join(', ')}`;
      }
      return null;
    },
    breakIt(d) {
      d.facts.omitted = d.facts.expectedOmitted + 1;
    }
  },
  {
    id: 'O1',
    section: 'the open operation',
    name: 'containment AND the path door, editor only, local projects only',
    check(d) {
      const o = d.open;
      if (!o.namesResolveInsideRoot) return 'the open path never asks resolveInsideRoot';
      if (!o.namesResolveProjectRoot) return 'the open path never asks resolveProjectRoot';
      if (!o.namesPathDoor) return 'the open path never asks the path door';
      if (!o.requiresEditorDoor.asksEditor) {
        return 'the open path accepts a door other than the editor';
      }
      if (!o.requiresUnderBase) return 'the open path does not require the underBase proof';
      if (!o.importsPathDoor || !o.importsPaths) return 'the open path re-implements the filesystem authority';
      return null;
    },
    breakIt(d) {
      d.open.requiresUnderBase = false;
    }
  },
  {
    id: 'O2',
    section: 'the open operation',
    name: 'one shared bounded read, and no second read loop',
    check(d) {
      const o = d.open;
      const r = d.read;
      if (!o.namesReadTextCapped) return 'the open path does not use the shared reader';
      if (!o.readTextCappedStrict) return 'the open path does not use the strict arm';
      if (!o.noOwnReadLoop) return 'the open path opened the file itself';
      if (!o.importsReadText) return 'the open path does not import the shared reader';
      if (!r.oneReader) return 'there is more than one read loop';
      if (!r.fsIpcUsesIt) return 'fs:readFile does not use the shared reader';
      if (!r.fsIpcHasNoOwnLoop) return 'fs:readFile kept a second read loop';
      if (!r.binaryRefused) return 'a binary file was read as text';
      if (!r.invalidRefused) return 'invalid UTF-8 was decoded as text';
      if (!r.relaxedKeepsText) return 'the relaxed arm disagrees with the strict one on a clean file';
      if (r.lineCount !== 4) return 'the strict read changed the bytes';
      // The race, driven live: the strict arm refuses a world that moves
      // under it, in every direction the phase names.
      for (const [key, value] of Object.entries(d.race)) {
        if (key === 'cleaned') continue;
        if (!value) return `the strict read did not refuse the ${key} shape`;
      }
      return null;
    },
    breakIt(d) {
      d.race.replacedToRefusal = false;
    }
  },
  {
    id: 'O3',
    section: 'the open operation',
    name: 'the locator set is closed and the refusals are the contract words',
    check(d) {
      const t = d.driven;
      const upper = t.findUpperCase;
      if (upper.state !== 'not-found' || upper.matches !== 0) {
        return 'a case-different find did not come back not-found';
      }
      const two = t.lineTwo;
      if (two.state !== 'opened') return 'line 2 was refused';
      if (two.selection.line !== 2 || two.selection.column !== 0) {
        return `line 2 selects ${two.selection.line}:${two.selection.column}`;
      }
      const range = t.lineRange;
      if (range.state !== 'opened') return 'the line range was refused';
      if (range.selection.endLine !== 3 || range.selection.endColumn !== 0) {
        return `the range ends at ${range.selection.endLine}:${range.selection.endColumn}`;
      }
      if (t.lineOut.state !== 'refused' || t.lineOut.reason !== 'line-out-of-range') {
        return 'line 99 is not line-out-of-range';
      }
      const one = t.findOne;
      if (one.state !== 'opened' || one.matches !== 1 || one.chosen !== 1) {
        return `'beta' does not open with matches 1, chosen 1`;
      }
      if (one.selection.line !== 2 || one.selection.column !== 0 || one.selection.endColumn !== 4) {
        return `'beta' selects ${one.selection.line}:${one.selection.column}-${one.selection.endColumn}`;
      }
      const three = t.findThree;
      if (three.state !== 'opened' || three.matches !== 4 || three.chosen !== 1) {
        return `'gamma' does not open with matches 4, chosen 1`;
      }
      if (
        three.selection.line !== 2 ||
        three.selection.column !== 5 ||
        three.selection.endColumn !== 10
      ) {
        return `'gamma' selects ${three.selection.line}:${three.selection.column}-${three.selection.endColumn}`;
      }
      if (t.findAbsent.state !== 'not-found' || t.findAbsent.matches !== 0) {
        return 'an absent find is not { not-found, matches: 0 }';
      }
      if (t.missing.state !== 'refused' || t.missing.reason !== 'missing') {
        return 'a missing file is not missing';
      }
      if (t.directory.reason !== 'not-file' && t.directory.reason !== 'missing') {
        return 'a directory is not not-file';
      }
      if (t.absoluteOutside.reason !== 'outside-projects') {
        return 'an absolute path outside the projects is not outside-projects';
      }
      if (t.climb.reason !== 'outside-projects') {
        return 'a relative climb out of the project is not outside-projects';
      }
      if (t.credential.reason !== 'credential') return '.env is not credential';
      if (t.binary.reason !== 'not-text') return 'a binary file is not not-text';
      if (t.noProjects.reason !== 'no-project') return 'no open local project is not no-project';
      if (t.noRenderer.reason !== 'renderer-unavailable') {
        return 'no ready renderer is not renderer-unavailable';
      }
      // PHASE 361. A caller that moved while the file was read is a refusal
      // with its own word, never a throw that collapses into `unavailable`.
      if (t.goneCaller === undefined) return 'the gone-caller arm produced no reading';
      if (t.goneCaller.state !== 'refused' || t.goneCaller.reason !== 'session-gone') {
        return `a caller gone after the read answers ${t.goneCaller.state}/${t.goneCaller.reason}`;
      }
      if (JSON.stringify(three).includes('gamma')) return 'the answer echoes the search text';
      // The switch is read once by the caller and once before the event; the
      // driven arm answers on for the first two reads so the composition runs
      // and off on the third, which is the pre-event re-check.
      if (t.switchOffMidFlight.state !== 'refused' || t.switchOffMidFlight.reason !== 'disabled') {
        return `a switch that moves off mid-flight answers ${t.switchOffMidFlight.reason ?? t.switchOffMidFlight.state}`;
      }
      return null;
    },
    breakIt(d) {
      d.driven.findThree.matches = 3;
    }
  },
  {
    id: 'O4',
    section: 'the open operation',
    name: 'one event, one receipt, one sender check',
    check(d) {
      const o = d.open;
      if (!o.brokerSendsOnce) return 'the broker sends through more than one call';
      if (o.brokerTargetSend) return 'the broker writes webContents.send directly';
      if (!o.brokerChecksSender) return 'a receipt from another window is accepted';
      if (!o.brokerChecksDestroyed) return 'a receipt from a destroyed window is accepted';
      if (!o.brokerTimeout) return 'the send has no deadline';
      if (!o.ipcRegistersOnce) return 'the completion channel is registered more than once';
      if (!o.ipcUsesTypedHandle) return 'the completion channel bypasses the typed registrar';
      if (!o.ipcNoRawHandle) return 'the completion channel is registered with a raw ipcMain.handle';
      if (!o.preloadOnOpen || !o.preloadComplete) return 'the preload does not expose both halves';
      if (!o.noSecondBridge) return 'the preload reaches ipcRenderer directly';
      // Driven, over a real broker and a real send to a fake window.
      const b = d.driven.broker;
      if (!b.wrongIgnored) return 'a receipt from another window was accepted';
      if (!b.unknownIgnored) return 'a receipt for an id nobody sent was accepted';
      if (b.answered === null || b.answered.outcome !== 'accepted') {
        return 'a receipt from the window that was sent did not resolve the send';
      }
      if (d.driven.sentChannels.join(',') !== 'agent-access:open') {
        return `the open path sent on ${d.driven.sentChannels.join(', ')}`;
      }
      return null;
    },
    breakIt(d) {
      d.driven.broker.unknownIgnored = false;
    }
  },
  {
    id: 'O5',
    section: 'the open operation',
    name: 'nothing is shown or focused, and the focus predicate reads the opt-out first',
    check(d) {
      const o = d.open;
      if (!o.noActivation) return 'the open path can show, focus, restore or activate a window';
      if (!o.readsFocused) return 'the open path never reads whether the window was focused';
      if (!o.focusFieldIsCarried) return 'the event carries no focus answer';
      if (!o.focusFalseFirst) return 'the editor predicate does not read focus === false first';
      if (!o.focusFalseBeforeSearch) {
        return 'the editor predicate asks its search rule before the opt-out';
      }
      return null;
    },
    breakIt(d) {
      d.open.focusFalseFirst = false;
    }
  },
  {
    id: 'L1',
    section: 'the log',
    name: 'operation, outcome and duration only',
    check(d) {
      const l = d.logs;
      if (l.count === 0) return 'the domain logs nothing, so a refusal is silent';
      for (const call of l.calls) {
        if (call.namesPayload) return `${call.rel} logs a payload field: ${call.message}`;
      }
      if (!l.onePerRequest) return 'no single per-request log call';
      const fields = ['operation', 'outcome', 'durationMs'];
      for (const field of fields) {
        if (!l.reportFields.includes(field)) return `the request line does not carry ${field}`;
      }
      if (l.reportFields.trim().split('\n').length !== 3) {
        return `the request line carries ${l.reportFields.trim().split('\n').length} fields`;
      }
      if (!l.noMessageInLog) return 'a caught error message reaches the log';
      return null;
    },
    breakIt(d) {
      d.logs.calls[0].namesPayload = true;
    }
  },
  {
    id: 'H1',
    section: 'the harness seam',
    name: 'armed only inside the isolated smoke launch and its own scratch root',
    check(d) {
      const h = d.harness;
      if (!h.arms.honest) return 'the seam cannot arm in the shape it exists for';
      for (const key of ['noSmoke', 'otherSmoke', 'noHarnessDir', 'outsideHarness', 'shotOnly']) {
        if (h.arms[key]) return `the seam arms on the ${key} arm`;
      }
      if (!h.namesNoSpawn) return 'the seam can start a process';
      if (!h.singleCheckpoint) return 'the seam names more than one checkpoint';
      return null;
    },
    breakIt(d) {
      d.harness.arms.outsideHarness = true;
    }
  },
  {
    id: 'C1',
    section: 'the contract',
    name: 'the deliberate channel and environment additions are in the baseline',
    check(d) {
      const i = d.inventory;
      if (!i.present) return 'there is no contract baseline';
      if (!i.hasChannel) return 'the invoke channel is not in the baseline';
      if (!i.hasEnv) return 'the environment name is not in the baseline';
      const extra = i.lines.filter(
        (line) =>
          line !== 'agent-access:openComplete' && line !== 'GMUX_AGENT_SOCKET'
      );
      if (extra.length > 0) return `unexplained baseline rows: ${extra.join(', ')}`;
      return null;
    },
    breakIt(d) {
      d.inventory.hasChannel = false;
    }
  }
];

// ---------------------------------------------------------------------------
// Run the rules, twice
// ---------------------------------------------------------------------------

const failures = [];
const controlFailures = [];
const rows = [];

function structuredCloneOf(value) {
  return JSON.parse(JSON.stringify(value));
}

for (const rule of RULES) {
  const honest = rule.check(data);
  const brokenCopy = structuredCloneOf(data);
  rule.breakIt(brokenCopy);
  const brokenFinding = rule.check(brokenCopy);
  const control = rule.check(structuredCloneOf(data));
  if (honest !== null) failures.push(`${rule.id} ${rule.name}: ${honest}`);
  if (brokenFinding === null) {
    failures.push(
      `${rule.id} ${rule.name}: the rule stayed green with its own clause broken ` +
        `(the mutation was applied)`
    );
  }
  if (control !== null) {
    controlFailures.push(`${rule.id}: the control copy did not stay green: ${control}`);
  }
  rows.push({
    id: rule.id,
    section: rule.section,
    name: rule.name,
    honest: honest === null,
    redWhenBroken: brokenFinding !== null,
    controlGreen: control === null
  });
}

// ---------------------------------------------------------------------------
// Print
// ---------------------------------------------------------------------------

const pad = (text, width) => (text.length >= width ? text : text + ' '.repeat(width - text.length));
const tick = (value) => (value ? 'ok' : 'NO');

let sectionName = null;
for (const row of rows) {
  if (row.section !== sectionName) {
    sectionName = row.section;
    process.stdout.write(`\n${sectionName}\n${'-'.repeat(96)}\n`);
  }
  process.stdout.write(
    `${pad(row.id, 4)}${pad(row.name, 72)} ${tick(row.honest)} ${tick(row.redWhenBroken)}\n`
  );
}

process.stdout.write('\nwhat the gate drove\n');
process.stdout.write('-'.repeat(96) + '\n');
process.stdout.write(
  `${pad('scratch sockets', 40)} one, mode ${(data.framing.mode ?? 0).toString(8)}, ` +
    `removed in a finally\n`
);
process.stdout.write(
  `${pad('framing arms', 40)} ${data.framing.answers.map((one) => one.case).join(', ')}\n`
);
process.stdout.write(
  `${pad('dispatch answers', 40)} ${Object.keys(data.dispatch.codes).length} driven\n`
);
process.stdout.write(
  `${pad('launchable rows composed', 40)} ${data.delivery.launchableIds.length}\n`
);
process.stdout.write(
  `${pad('resource files byte-compared', 40)} ${data.resources.files.length}\n`
);
process.stdout.write(
  `${pad('contract baseline rows', 40)} ${data.inventory.lines.join(', ')}\n`
);

if (controlFailures.length > 0) {
  process.stdout.write(`\nCONTROL FAILED, ${controlFailures.length}:\n`);
  for (const failure of controlFailures) process.stdout.write(`  - ${failure}\n`);
}

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. The switch is a plain off-by-default boolean no seal is asked about; three rows ' +
    'receive the bundled skill and ten receive byte-identical launches; the ' +
    'bundle ships as five data files asserted before signing; one private ' +
    'socket answers one capped request on an absolute deadline; four curated ' +
    'operations reach a live local session; open asks containment and the ' +
    'path door and an editor-only path; and no log line carries a payload.\n' +
    `Every one of the ${RULES.length} rules was asked again over its own ` +
    'broken copy and went red, with a control copy green.\n'
);
