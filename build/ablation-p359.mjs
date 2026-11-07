#!/usr/bin/env node
/**
 * `npm run ablation:p359` — the attack beside `conformance:agentaccess`.
 *
 * ONE `cp -Rc` clone of this worktree under phase scratch, then one mutation at
 * a time and the gate asked over it. Each arm: save the file's exact bytes,
 * apply the plant, run the gate, require it RED, then restore the bytes and
 * verify the sha256 in a `finally`. The clone is removed in a `finally` too,
 * and the control arm — the unmutated clone — must be GREEN before the first
 * plant and GREEN again after the last, so a gate that simply fails everything
 * cannot pass this file.
 *
 * WHY A CLONE AND NOT THE WORKTREE: a mutation that outlives a crash must never
 * be left in the tree a later round commits. Nothing here writes to the working
 * worktree.
 *
 * A plant whose needle is missing prints NEEDLE MISSING and fails the run: a
 * plant that applies nothing is never mistaken for a plant that passed.
 */

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');

/** One rule id the arm must turn red, and the source clause it plants over. */
const ARMS = [
  {
    id: 1,
    rule: 'A2',
    file: 'src/main/settings/store.ts',
    from: 'state.agentAccess !== true',
    to: 'true',
    note: 'the no-danger shortcut stops asking the switch, which skips the seal'
  },
  {
    id: 2,
    rule: 'A1',
    file: 'src/main/settings/store.ts',
    from: 'settings.agentAccess === true && sealed.agentAccess === true',
    to: 'settings.agentAccess === true && sealed.agentAccess !== false',
    note: 'an old seal with no member covers the switch'
  },
  {
    id: 3,
    rule: 'A1',
    file: 'src/main/settings/store.ts',
    from: 'settings.agentAccess === true && sealed.agentAccess === true',
    to: 'settings.agentAccess === true || sealed.agentAccess === false',
    note: 'the seal lets a mismatch through, so an uncovered switch reads on'
  },
  {
    id: 4,
    rule: 'A1',
    file: 'src/main/settings/store.ts',
    from: "out.agentAccess = obj['agentAccess'] === true;",
    to: "out.agentAccess = obj['agentAccess'] !== false;",
    note: 'a forged settings file reads on with no seal at all'
  },
  {
    id: 5,
    rule: 'D1',
    file: 'src/shared/agent-access.ts',
    from: "['claude', 'pi', 'omp'] as const",
    to: "['claude', 'pi', 'omp', 'codex'] as const",
    note: 'Codex joins the delivery set'
  },
  {
    id: 6,
    rule: 'D1',
    file: 'src/main/agent-access/delivery.ts',
    from: "return ['--plugin-dir', bundleRoot];",
    to: "return ['--plugin-dir', bundleRoot + '/x'];",
    note: 'the measured Claude/omp path moves'
  },
  {
    id: 7,
    rule: 'D3',
    file: 'src/main/sessions/create-local.ts',
    from: '      argv: deliveredArgv,',
    to: '      argv: launchArgv,',
    note: 'the create hands tmux the pre-delivery argv'
  },
  {
    id: 8,
    rule: 'D4',
    file: 'src/main/agent-access/delivery.ts',
    from: 'return rewrapped;',
    to: 'return [...rewrapped, ...pair];',
    note: 'the pair lands on SpecStory\'s own argv as well as inside it'
  },
  {
    id: 9,
    rule: 'D5',
    file: 'src/main/sessions/resume-in-place.ts',
    from: 'if (retainedEnv === null || retainedEnv !== socketPath) return [...armableArgv];',
    to: 'if (retainedEnv === null) return [...armableArgv];',
    note: 'a pane whose recorded address is another profile restarts with delivery'
  },
  {
    id: 10,
    rule: 'D1',
    file: 'src/main/agent-access/delivery.ts',
    from: '  if (!enabled || !local) return false;',
    to: '  if (!enabled) return false;',
    note: 'a session on another machine receives the local bundle and address'
  },
  {
    id: 11,
    rule: 'R1',
    file: 'resources/agent-skills/tortie/.claude-plugin/plugin.json',
    from: '"version": "1.0.0"',
    to: '"version": "1.0.0", "hooks": {}',
    note: 'a plugin manifest gains a hook, which is code by another name'
  },
  {
    id: 12,
    rule: 'R1',
    file: 'resources/agent-skills/tortie/skills/tortie/SKILL.md',
    from: 'when the user asks.',
    to: '',
    note: 'a bundled file loses bytes, so the five-file bundle is not the measured one'
  },
  {
    id: 13,
    rule: 'S1',
    file: 'src/main/agent-access/service.ts',
    from: 'const SOCKET_DIR_MODE = 0o700;',
    to: 'const SOCKET_DIR_MODE = 0o755;',
    note: 'the parent directory stops being private'
  },
  {
    id: 14,
    rule: 'S1',
    file: 'src/main/agent-access/service.ts',
    from: '  if (!existing.isSocket()) {',
    to: '  if (false) {',
    note: 'a regular file or a symlink at the address is unlinked'
  },
  {
    id: 15,
    rule: 'S1',
    file: 'src/main/agent-access/service.ts',
    from: '      current.dev === identity.dev &&',
    to: '      current.dev === current.dev ||',
    note: 'shutdown unlinks whatever is at the address now'
  },
  {
    id: 16,
    rule: 'S2',
    file: 'src/main/agent-access/socket.ts',
    from: '    }, AGENT_ACCESS_REQUEST_DEADLINE_MS);',
    to: '    }, AGENT_ACCESS_REQUEST_DEADLINE_MS * 60);',
    note: 'the request deadline stops closing a slow sender'
  },
  {
    id: 17,
    rule: 'S2',
    file: 'src/main/agent-access/socket.ts',
    from: "      if (!framed.ok) {\n        clearTimeout(deadline);\n        fail('bad-request');\n        return;\n      }\n      finish(framed.line);",
    to: "      finish(buffered.toString('utf8'));",
    note: 'a second request or a trailing byte is parsed instead of refused'
  },
  {
    id: 18,
    rule: 'S2',
    file: 'src/main/agent-access/socket.ts',
    from: '      if (received > AGENT_ACCESS_MAX_REQUEST_BYTES + 1) {',
    to: '      if (false) {',
    note: 'a request over 64 KiB is buffered and parsed'
  },
  {
    id: 19,
    rule: 'S3',
    file: 'src/main/agent-access/dispatch.ts',
    from: 'ABA-19-FIRST-CHECK',
    to: 'ABA-19-FIRST-CHECK',
    note: 'the dispatch answers the first half with the switch off',
    apply(clone) {
      const rel = 'src/main/agent-access/dispatch.ts';
      const text = readFileSync(join(clone, rel), 'utf8');
      const marker = "    // First enabled check: before the lookup.\n    if (!deps.isEnabled()) {\n      response = fail('disabled', DISABLED_MESSAGE);\n      return response;\n    }\n";
      if (!text.includes(marker)) return false;
      writeFileSync(join(clone, rel), text.replace(marker, ''));
      return true;
    }
  },
  {
    id: 41,
    rule: 'S3',
    file: 'src/main/agent-access/dispatch.ts',
    from: 'ABA-41-SECOND-CHECK',
    to: 'ABA-41-SECOND-CHECK',
    note: 'the dispatch answers with the switch moved off mid-flight',
    apply(clone) {
      const rel = 'src/main/agent-access/dispatch.ts';
      const text = readFileSync(join(clone, rel), 'utf8');
      const marker = "    // Second enabled check: before the handler runs or a value returns.\n    if (!deps.isEnabled()) {\n      response = fail('disabled', DISABLED_MESSAGE);\n      return response;\n    }\n";
      if (!text.includes(marker)) return false;
      writeFileSync(join(clone, rel), text.replace(marker, ''));
      return true;
    }
  },
  {
    id: 20,
    rule: 'S4',
    file: 'src/main/agent-access/facts.ts',
    from: '  if (row.machine !== undefined) return null;',
    to: '  if (false) return null;',
    note: 'a session on another machine reaches every operation'
  },
  {
    id: 21,
    rule: 'F1',
    file: 'src/main/agent-access/facts.ts',
    from: '    agent: session.agent,',
    to: '    agent: session.agent,\n    argv: [],',
    note: 'the curated row carries a manifest field'
  },
  {
    id: 22,
    rule: 'F1',
    file: 'src/main/agent-access/facts.ts',
    from: 'slice(0, AGENT_ACCESS_MAX_SESSION_ROWS)',
    to: 'slice(0, rows.length)',
    note: 'the 200-row cap and its omitted count are gone'
  },
  {
    id: 23,
    rule: 'O1',
    file: 'src/main/agent-access/open.ts',
    from: '    resolved = await resolveInsideRoot(realRoot, input);',
    to: '    resolved = { abs: `${realRoot}/${input}`, rel: input };',
    note: 'containment is re-spelled as string joining'
  },
  {
    id: 24,
    rule: 'O1',
    file: 'src/main/agent-access/open.ts',
    from: "  if (door.door !== 'editor' || door.underBase === undefined) {",
    to: '  if (false) {',
    note: 'the editor door and the underBase proof are never asked'
  },
  {
    id: 25,
    rule: 'O2',
    file: 'src/main/agent-access/open.ts',
    from: "      const read = await readTextCapped(abs, 'strict', {",
    to: "      const read = await readTextCapped(abs, 'relaxed', {",
    note: 'the agent read becomes the editor truncation'
  },
  {
    id: 37,
    rule: 'O3',
    file: 'src/main/agent-access/open.ts',
    from: 'if (found === null) return { state: \'not-found\', matches: 0 };',
    to: 'if (found === null || true) return { state: \'not-found\', matches: 0 };',
    note: 'every find comes back not-found'
  },
  {
    id: 39,
    rule: 'O3',
    file: 'src/main/agent-access/open.ts',
    from: '      if (line > lineCount || endLine > lineCount) {',
    to: '      if (false) {',
    note: 'a line past the end opens instead of refusing'
  },
  {
    id: 40,
    rule: 'O3',
    file: 'src/main/agent-access/open.ts',
    from: "    return { ok: false, reason: 'credential' };",
    to: "    return { ok: false, reason: 'not-file' };",
    note: 'a credential file answers the wrong closed word'
  },
  {
    id: 26,
    rule: 'O2',
    file: 'src/main/fs/read-text.ts',
    from: '    if (!sameEntry(identity, snapshotOf(now))) {',
    to: '    if (false) {',
    note: 'a file replaced mid-read is answered with the old bytes'
  },
  {
    id: 27,
    rule: 'O3',
    file: 'src/main/agent-access/open.ts',
    from: "    const at = text.indexOf(find, from);",
    to: '    const hay = text.toLowerCase();\n    const at = hay.indexOf(find.toLowerCase(), from);',
    note: 'matching stops being case-sensitive and exact'
  },
  {
    id: 28,
    rule: 'O4',
    file: 'src/main/agent-access/open-broker.ts',
    from: '    if (pending.target !== sender) return;',
    to: '    if (false) return;',
    note: 'a receipt from another window is accepted'
  },
  {
    id: 29,
    rule: 'O5',
    file: 'src/renderer/editor/store.ts',
    from: '  if (req.focus === false) return false;',
    to: '  if (false) return false;',
    note: 'a background or cross-project open takes the editor'
  },
  {
    id: 30,
    rule: 'L1',
    file: 'src/main/agent-access/service.ts',
    from: '    operation: entry.operation,',
    to: '    operation: entry.operation, sessionPath: \u0027x\u0027,',
    note: 'the request line names a payload field'
  },
  {
    id: 31,
    rule: 'H1',
    file: 'src/main/harness/agent-access-open.ts',
    from: "  if ((env['GMUX_SMOKE'] ?? '') !== AGENT_ACCESS_HARNESS_SMOKE) return false;",
    to: '  if (false) return false;',
    note: 'the read-race seam arms on any launch'
  },
  {
    id: 32,
    rule: 'R2',
    file: 'build/after-pack.cjs',
    from: '  assertAgentSkills(context);',
    to: '  void context;',
    note: 'the package ships without the resource assertion'
  },
  {
    id: 33,
    rule: 'R2',
    file: 'electron-builder.yml',
    from: '  - from: resources/agent-skills/tortie\n    to: agent-skills/tortie',
    to: '  - from: resources/agent-skills\n    to: agent-skills',
    note: 'the bundle lands at the wrong resource path'
  },
  {
    id: 34,
    rule: 'C1',
    file: 'docs/audits/contract-baseline.txt',
    from: 'agent-access:openComplete',
    to: 'agent-access:ablated',
    note: 'the channel leaves the baseline while the code keeps it'
  },
  {
    id: 35,
    rule: 'D2',
    file: 'src/main/agent-access/delivery.ts',
    from: 'ABA-35-ELIGIBILITY-NULL',
    to: 'ABA-35-ELIGIBILITY-NULL',
    note: 'the ineligible launch receives an empty pair plus the socket, so off is not byte identical',
    apply(clone) {
      const rel = 'src/main/agent-access/delivery.ts';
      const text = readFileSync(join(clone, rel), 'utf8');
      const marker = '  if (!agentAccessEligible(agent, enabled, local, socketPath, bundleRoot)) {\n    return null;\n  }';
      if (!text.includes(marker)) return false;
      writeFileSync(
        join(clone, rel),
        text.replace(
          marker,
          '  if (!agentAccessEligible(agent, enabled, local, socketPath, bundleRoot)) {\n' +
            '    return { argv: [], env: { [AGENT_ACCESS_SOCKET_ENV]: socketPath } };\n' +
            '  }'
        )
      );
      return true;
    }
  }
];

const GATE = ['build', 'conformance-agent-access.mjs'];

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function runGate(dir) {
  const run = spawnSync(process.execPath, [join(dir, ...GATE)], {
    encoding: 'utf8',
    cwd: dir,
    timeout: 300_000,
    maxBuffer: 32 * 1024 * 1024
  });
  return { status: run.status, stderr: run.stderr, stdout: run.stdout };
}

function main() {
  const scratch = mkdtempSync(join(tmpdir(), 'p359-ablation-'));
  const clone = join(scratch, 'tree');
  const results = [];
  try {
    cpSync(repoRoot, clone, { recursive: true, verbatimSymlinks: true });
    const control = runGate(clone);
    results.push({
      id: 0,
      rule: 'control',
      ok: control.status === 0,
      status: control.status,
      output: control
    });

    for (const arm of ARMS) {
      const target = join(clone, arm.file);
      let before;
      try {
        before = readFileSync(target, 'utf8');
      } catch {
        results.push({ ...arm, ok: false, missing: 'the file is absent' });
        continue;
      }
      if (typeof arm.apply === 'function') {
        let run;
        try {
          if (!arm.apply(clone)) {
            results.push({ ...arm, ok: false, missing: 'the apply() hook did not match' });
            continue;
          }
          run = runGate(clone);
        } finally {
          writeFileSync(target, before);
          if (sha256(readFileSync(target, 'utf8')) !== sha256(before)) {
            throw new Error(`arm ${arm.id} could not restore ${arm.file}`);
          }
        }
        results.push({ ...arm, ok: run.status !== 0, status: run.status });
        continue;
      }
      if (!before.includes(arm.from)) {
        results.push({ ...arm, ok: false, missing: arm.from });
        continue;
      }
      let run;
      try {
        writeFileSync(target, before.replace(arm.from, arm.to));
        run = runGate(clone);
      } finally {
        writeFileSync(target, before);
        if (sha256(readFileSync(target, 'utf8')) !== sha256(before)) {
          throw new Error(`arm ${arm.id} could not restore ${arm.file}`);
        }
      }
      results.push({ ...arm, ok: run.status !== 0, status: run.status, output: run });
    }

    const after = runGate(clone);
    results.push({
      id: 'control-after',
      rule: 'control',
      ok: after.status === 0,
      status: after.status,
      output: after
    });
  } finally {
    try {
      rmSync(scratch, { recursive: true, force: true });
    } catch {
      /* the OS took it */
    }
  }

  let failures = 0;
  for (const result of results) {
    if (result.missing !== undefined) {
      process.stdout.write(
        `arm ${result.id}: NEEDLE MISSING in ${result.file} (${result.missing})\n`
      );
      failures += 1;
      continue;
    }
    if (!result.ok) failures += 1;
    process.stdout.write(
      `arm ${String(result.id).padStart(2)} ${result.rule.padEnd(8)} ` +
        `${result.ok ? 'red    ' : 'NOT RED'} ` +
        `${result.note !== undefined ? result.note : 'the unmutated clone'}\n`
    );
    if (!result.ok && result.output !== undefined) {
      const text = `${result.output.stdout ?? ''}${result.output.stderr ?? ''}`;
      const lines = text.trim().split('\n');
      process.stdout.write(`         ${lines.slice(-6).join('\n         ')}\n`);
    }
  }
  if (failures > 0) {
    process.stdout.write(`\nFAIL, ${failures} arm(s) did not move a reading.\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\nPASS. ${ARMS.length} plants, each red on the rule it owns, and the ` +
      `unmutated clone green before and after.\n`
  );
}

main();
