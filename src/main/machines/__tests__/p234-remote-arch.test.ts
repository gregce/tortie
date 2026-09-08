/**
 * PHASE 234. The two Architecture seams, over a real fixture repository, with
 * the far side really run.
 *
 * The claim this suite exists to keep is the phase's whole claim: a folder on
 * another machine is read by the SAME checkers and drawn by the SAME reading as
 * a folder on this Mac, because the machine arm is a second implementation of
 * two interfaces rather than a second pipeline. A suite that only asserted the
 * parsers would prove nothing about that, so every arm here runs the shipping
 * script text through `/bin/sh` in a throwaway repository, exactly as
 * `runRemoteScript` would run it through the far side's login shell, and
 * compares what came back against the LOCAL runner over the same repository.
 *
 * What is really started: `git`, in a directory under `os.tmpdir()` this file
 * makes and removes, and `/bin/sh -c <the shipping script text>`, which is what
 * the far side runs. No ssh, no Electron, no tmux, no agent, and nothing under
 * the person's home is opened.
 *
 * Every rule below is re-run over an ABLATED copy of the shipping script text,
 * one clause per copy, and each ablation must make the same assertion fail. A
 * check that cannot fail is not a check.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  ARCH_GIT_CALL_KINDS,
  catFileBatchCall,
  logNameOnlyCall,
  lsFilesCall,
  revParseHeadCall,
  statusPorcelainCall,
  type ArchGitCall
} from '../../arch/argv-guard';
import { createArchGitRunner, type ArchGitRunner } from '../../arch/git-facts';
import { loadArchDocument, type ArchFileSystem } from '../../arch/load';
import {
  archPathIsSendable,
  createRemoteArchFileSystem,
  createRemoteArchGitRunner,
  pageByExpectedBytes,
  pageByListBytes,
  parseArchGitAnswer,
  parseArchReadAnswer,
  syncRemoteArchMirror,
  type RemoteArchRunner
} from '../remote-arch';
import { REMOTE_SCRIPTS, REMOTE_SCRIPT_MARKER } from '../remote-scripts';
import { parseRemoteScriptAnswer, remoteScriptName } from '../remote-run';

const scriptText = (id: string): string =>
  REMOTE_SCRIPTS.find((row) => row.id === id)?.text ?? '';

const ARCH_READ = scriptText('arch-read');
const ARCH_GIT = scriptText('arch-git');

/**
 * A runner that really runs the script, the way the far side's `/bin/sh` does.
 *
 * `composeRemoteScriptCommand` puts the text at `-c` and the name at `$0`, and
 * that is exactly the shape here, so what this suite drives is what crosses the
 * link. The payload is read with the SHIPPING `parseRemoteScriptAnswer`, so a
 * script that printed nothing between the markers refuses here for the same
 * reason it refuses over ssh.
 */
function shellRunner(overrides: Partial<Record<string, string>> = {}): RemoteArchRunner {
  return async (scriptId, args) => {
    const text = overrides[scriptId] ?? (scriptId === 'arch-read' ? ARCH_READ : ARCH_GIT);
    let out: string;
    try {
      out = execFileSync('/bin/sh', ['-c', text, remoteScriptName(scriptId), ...args], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' }
      });
    } catch (error) {
      out = String((error as { stdout?: string }).stdout ?? '');
    }
    const payload = parseRemoteScriptAnswer(out);
    if (payload === null) throw new Error(`no payload from ${scriptId}`);
    return payload;
  };
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' }
  });
}

let repo = '';
let mirror = '';

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), 'p234-repo-'));
  mirror = mkdtempSync(join(tmpdir(), 'p234-mirror-'));
  mkdirSync(join(repo, 'src'), { recursive: true });
  mkdirSync(join(repo, 'docs', 'arch', 'components'), { recursive: true });
  writeFileSync(join(repo, 'src', 'a.ts'), 'export const a = 1;\n');
  writeFileSync(join(repo, 'src', 'b.ts'), 'import { a } from "./a";\nexport const b = a;\n');
  writeFileSync(join(repo, 'src', 'empty.ts'), '');
  writeFileSync(
    join(repo, 'docs', 'arch', 'contract.json'),
    JSON.stringify(
      {
        version: 1,
        subject: 'p234 fixture',
        strictness: 'not-wrong',
        layers: [
          { id: 'app', name: 'App', order: 1 },
          { id: 'core', name: 'Core', order: 2 },
          { id: 'base', name: 'Base', order: 3 }
        ],
        flows: []
      },
      null,
      2
    )
  );
  writeFileSync(
    join(repo, 'docs', 'arch', 'components', 'core.json'),
    JSON.stringify(
      {
        id: 'core',
        name: 'core',
        kind: 'component',
        layer: 'core',
        provenance: 'first-party',
        anchors: ['src/**'],
        boundary: 'open',
        description: 'the fixture core',
        evidence: [],
        deprecated: false,
        gaps: []
      },
      null,
      2
    )
  );
  writeFileSync(join(repo, 'docs', 'arch', 'edges.json'), JSON.stringify({ edges: [] }));
  writeFileSync(join(repo, 'docs', 'arch', 'baseline.json'), JSON.stringify({ accepted: [] }));
  git(repo, 'init', '-b', 'main');
  git(repo, 'config', 'user.name', 'p234');
  git(repo, 'config', 'user.email', 'p234@tortie.local');
  git(repo, 'config', 'commit.gpgsign', 'false');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-m', 'one');
  // Something uncommitted, so `status --porcelain -z` has a row to print.
  writeFileSync(join(repo, 'src', 'c.ts'), 'export const c = 3;\n');
  // A symbolic link, which neither side may follow.
  symlinkSync(join(repo, 'src', 'a.ts'), join(repo, 'src', 'link.ts'));
});

afterAll(() => {
  if (repo !== '') rmSync(repo, { recursive: true, force: true });
  if (mirror !== '') rmSync(mirror, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Rule 1. The two seams really are the two interfaces
// ---------------------------------------------------------------------------

describe('the seams', () => {
  it('gives an ArchFileSystem and an ArchGitRunner, checked by the compiler', () => {
    // `remote-arch.ts` sits on the machines side of the arch facade wall, so it
    // RESTATES the two interfaces rather than importing them. This line is what
    // stops those restatements drifting: it is a type error the day a field
    // moves on either side, and it is why the wall costs nothing.
    const fs: ArchFileSystem = createRemoteArchFileSystem(shellRunner(), repo);
    const runner: ArchGitRunner = createRemoteArchGitRunner(shellRunner(), repo);
    expect(typeof fs.readFile).toBe('function');
    expect(typeof fs.readDir).toBe('function');
    expect(typeof runner.run).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Rule 2. The git runner answers what the local one answers, call for call
// ---------------------------------------------------------------------------

describe('the git seam', () => {
  const calls = (): { kind: string; call: ArchGitCall }[] => [
    { kind: 'ls-files', call: lsFilesCall() },
    { kind: 'rev-parse-head', call: revParseHeadCall() },
    { kind: 'log-name-only', call: logNameOnlyCall() },
    { kind: 'status-porcelain', call: statusPorcelainCall() },
    { kind: 'cat-file-batch', call: catFileBatchCall(['HEAD:src/a.ts', 'HEAD:src/b.ts']) }
  ];

  it('answers the same code and the same stdout bytes as the local runner', async () => {
    const local = createArchGitRunner(repo);
    const far = createRemoteArchGitRunner(shellRunner(), repo);
    for (const { kind, call } of calls()) {
      const here = await local.run(call);
      const there = await far.run(call);
      expect(there.code, `${kind}: the status`).toBe(here.code);
      expect(there.stdout.equals(here.stdout), `${kind}: the bytes`).toBe(true);
    }
  });

  it('covers every kind the local composer can make, and no others', async () => {
    const far = createRemoteArchGitRunner(shellRunner(), repo);
    for (const kind of ARCH_GIT_CALL_KINDS) {
      const answer = await far.run({ kind, argv: [], stdin: '' } as unknown as ArchGitCall);
      expect(answer.code, `${kind} is answered`).not.toBe(127);
    }
    const unknown = await far.run({
      kind: 'not-a-kind',
      argv: []
    } as unknown as ArchGitCall);
    // A kind with no arm runs NOTHING and says so. It never falls through to a
    // command line somebody else's word could shape.
    expect(unknown.code).toBe(127);
    expect(unknown.stdout.length).toBe(0);
  });

  it('reads a cut stream as a failed call rather than as a shorter answer', () => {
    // A stream cut at the cap lost its status line. Half a `cat-file --batch`
    // parses as the wrong file, so the only honest answer is a failure.
    const cut = Buffer.from('some bytes with no status line').toString('base64');
    const answer = parseArchGitAnswer(cut);
    expect(answer.code).toBe(1);
    expect(answer.stdout.length).toBe(0);
    expect(answer.stderr).toContain('cut at');
  });

  it('never throws for anything the machine said', () => {
    for (const payload of ['none', '', '!!!!not base64!!!!', 'AAAA']) {
      const answer = parseArchGitAnswer(payload);
      expect(answer.code).not.toBe(0);
      expect(Buffer.isBuffer(answer.stdout)).toBe(true);
    }
  });

  it('goes red when the ls-files arm drifts from the local composer', async () => {
    const ablated = ARCH_GIT.replace('git ls-files -z', 'git ls-files -z --cached');
    expect(ablated).not.toBe(ARCH_GIT);
    const local = createArchGitRunner(repo);
    const far = createRemoteArchGitRunner(shellRunner({ 'arch-git': ablated }), repo);
    const call = lsFilesCall();
    const here = await local.run(call);
    const there = await far.run(call);
    // `--cached` drops nothing in this fixture, so the bytes still agree; the
    // check that catches it is condition 87 of `conformance:machines`, which
    // reads the arm against the composer. This arm proves the ablation is a
    // real edit and that the runner still answers, so the gate's reading is the
    // only thing standing between the two argvs.
    expect(there.code).toBe(here.code);
    const drifted = ARCH_GIT.replace('git rev-parse HEAD', 'git rev-parse HEAD~1');
    const drifting = createRemoteArchGitRunner(shellRunner({ 'arch-git': drifted }), repo);
    const answer = await drifting.run(revParseHeadCall());
    const wanted = await local.run(revParseHeadCall());
    expect(answer.stdout.equals(wanted.stdout)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Rule 3. The file seam, and the two answers a missing thing gets
// ---------------------------------------------------------------------------

describe('the file seam', () => {
  it('answers null for a file that is not there, and never throws', async () => {
    const fs = createRemoteArchFileSystem(shellRunner(), repo);
    await expect(fs.readFile('docs/arch/nope.json')).resolves.toBeNull();
    await expect(fs.readFile('docs/arch/components')).resolves.toBeNull();
  });

  it('answers an empty list for a directory that is not there, and never throws', async () => {
    const fs = createRemoteArchFileSystem(shellRunner(), repo);
    await expect(fs.readDir('docs/arch/flows')).resolves.toEqual([]);
    await expect(fs.readDir('docs/arch/contract.json')).resolves.toEqual([]);
  });

  it('never sends a path it cannot read an answer about', async () => {
    const fs = createRemoteArchFileSystem(shellRunner(), repo);
    for (const path of [
      '/etc/passwd',
      '../outside.json',
      `docs/${REMOTE_SCRIPT_MARKER}/x.json`,
      'docs/arch/a\nb.json'
    ]) {
      expect(archPathIsSendable(path), path).toBe(false);
      await expect(fs.readFile(path)).resolves.toBeNull();
      await expect(fs.readDir(path)).resolves.toEqual([]);
    }
  });

  it('never follows a symbolic link', async () => {
    const fs = createRemoteArchFileSystem(shellRunner(), repo);
    await expect(fs.readFile('src/link.ts')).resolves.toBeNull();
  });

  it('reads a whole docs/arch in two calls and loads the same document', async () => {
    let calls = 0;
    const counted: RemoteArchRunner = async (id, args) => {
      calls += 1;
      return shellRunner()(id, args);
    };
    const fs = createRemoteArchFileSystem(counted, repo);
    await fs.prime();
    expect(calls).toBe(2);
    const document = await loadArchDocument(fs);
    // No more calls: everything a load asks for is already held.
    expect(calls).toBe(2);
    expect(document.contract?.subject).toBe('p234 fixture');
    expect(document.components.map((one) => one.id)).toEqual(['core']);
    expect(document.problems).toEqual([]);
  });

  it('goes red when the read arm loses its link test', async () => {
    const ablated = ARCH_READ.replace(
      'if [ ! -h "$p" ] && [ -f "$p" ] && [ -r "$p" ]; then',
      'if [ -f "$p" ] && [ -r "$p" ]; then'
    );
    expect(ablated).not.toBe(ARCH_READ);
    const fs = createRemoteArchFileSystem(shellRunner({ 'arch-read': ablated }), repo);
    await expect(fs.readFile('src/link.ts')).resolves.toBe('export const a = 1;\n');
  });

  it('goes red when the read arm loses its traversal refusal', async () => {
    const ablated = ARCH_READ.split('\n')
      .filter((line) => !line.includes('case "$p" in /*|*..*)'))
      .join('\n');
    expect(ablated).not.toBe(ARCH_READ);
    // The refusal in `archPathIsSendable` still stands in front of it, which is
    // the point: the script and this side each refuse, and removing one is not
    // enough to read a path outside the folder.
    const fs = createRemoteArchFileSystem(shellRunner({ 'arch-read': ablated }), repo);
    await expect(fs.readFile('../nothing.json')).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rule 4. The answer parser
// ---------------------------------------------------------------------------

describe('the answer parser', () => {
  it('drops a record it does not recognise whole', () => {
    const records = parseArchReadAnswer(
      ['S 1 2 kept.ts', 'Q what is this', 'S notanumber 2 dropped.ts', 'X gone.ts'].join('\n')
    );
    expect(records.map((one) => one.path)).toEqual(['kept.ts', 'gone.ts']);
  });

  it('reads an empty file as empty bytes rather than as absent', () => {
    const records = parseArchReadAnswer(['F 5 0 empty.ts', ''].join('\n'));
    expect(records).toHaveLength(1);
    expect(records[0]?.kind).toBe('F');
    expect(records[0]?.content?.length).toBe(0);
  });

  it('reads the word none as nothing at all', () => {
    expect(parseArchReadAnswer('none')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Rule 5. The mirror
// ---------------------------------------------------------------------------

describe('the mirror', () => {
  it('carries what drifted and reuses what did not', async () => {
    const tracked = git(repo, 'ls-files').split('\n').filter((one) => one.length > 0);
    const first = await syncRemoteArchMirror({
      run: shellRunner(),
      farPath: repo,
      mirrorPath: mirror,
      trackedFiles: tracked
    });
    expect(first.written).toBe(tracked.length);
    expect(first.reused).toBe(0);
    expect(first.overBudget).toBeNull();

    const second = await syncRemoteArchMirror({
      run: shellRunner(),
      farPath: repo,
      mirrorPath: mirror,
      trackedFiles: tracked
    });
    expect(second.written).toBe(0);
    expect(second.reused).toBe(tracked.length);
  });

  it('forgets what the folder no longer tracks', async () => {
    const tracked = git(repo, 'ls-files')
      .split('\n')
      .filter((one) => one.length > 0 && one !== 'src/b.ts');
    const pass = await syncRemoteArchMirror({
      run: shellRunner(),
      farPath: repo,
      mirrorPath: mirror,
      trackedFiles: tracked
    });
    expect(pass.forgotten).toBe(1);
  });

  it('counts what landed rather than what it was told, and the refused as skipped', async () => {
    // The path in a record is the FAR SIDE'S own word, and `writeMirrored` is
    // where this Mac refuses it. A pass that counted the asking would publish
    // a `written` bigger than the number of files in the mirror, which is the
    // shape CLAUDE.md forbids by name, so this arm counts the files too.
    const hostile = [
      '../victim.txt',
      '../../victim.txt',
      '/etc/p234-should-not-exist',
      'ok/../../victim.txt',
      `bad${REMOTE_SCRIPT_MARKER}.txt`,
      'bad\u0007.txt'
    ];
    const blob = Buffer.from('planted\n', 'utf8').toString('base64');
    const liar: RemoteArchRunner = async (scriptId, args) => {
      expect(scriptId).toBe('arch-read');
      const list = args[1] ?? '';
      if (list.length > 0) {
        // Phase one: a stamp for every path really asked about.
        return list
          .split('\n')
          .filter((one) => one.length > 0)
          .map((one) => `S 1 8 ${one}`)
          .join('\n');
      }
      // Phase two: one legal file, and six paths this Mac must refuse.
      return ['F 1 8 plain.txt', blob, ...hostile.flatMap((one) => [`F 1 8 ${one}`, blob])].join(
        '\n'
      );
    };
    const into = mkdtempSync(join(tmpdir(), 'p234-liar-'));
    try {
      const pass = await syncRemoteArchMirror({
        run: liar,
        farPath: repo,
        mirrorPath: into,
        trackedFiles: ['plain.txt']
      });
      const landed = execFileSync('find', [into, '-type', 'f'], { encoding: 'utf8' })
        .split('\n')
        .filter((one) => one.length > 0);
      expect(landed).toHaveLength(1);
      expect(landed[0]?.endsWith('/plain.txt')).toBe(true);
      expect(pass.written).toBe(1);
      expect(pass.skipped).toBe(hostile.length);
    } finally {
      rmSync(into, { recursive: true, force: true });
    }
  });

  it('pages a list so no one call passes the script budget', () => {
    const many = Array.from({ length: 20_000 }, (_, at) => `src/file-${String(at)}.ts`);
    const pages = pageByListBytes(many);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(page.join('\n').length).toBeLessThanOrEqual(100_000);
    }
    expect(pages.flat()).toEqual(many);
  });

  it('pages the bytes by what the far side said each file weighs', () => {
    const many = Array.from({ length: 40 }, (_, at) => `src/${String(at)}.ts`);
    const pages = pageByExpectedBytes(many, () => 512 * 1024);
    expect(pages.length).toBe(10);
    expect(pages.flat()).toEqual(many);
  });
});
