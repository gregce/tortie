import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { syncRemoteArchMirror, type RemoteArchRunner } from '../remote-arch';
import { REMOTE_SCRIPTS } from '../remote-scripts';
import { parseRemoteScriptAnswer, remoteScriptName } from '../remote-run';

it('refreshes a same-size change within the same timestamp second', async () => {
  const root = mkdtempSync(join(tmpdir(), 'audit-0908-mirror-'));
  try {
    const far = join(root, 'far');
    const mirror = join(root, 'mirror');
    mkdirSync(far);
    const file = join(far, 'a.ts');
    const run: RemoteArchRunner = async (id, args) => {
      const text = REMOTE_SCRIPTS.find((row) => row.id === id)!.text;
      const out = execFileSync('/bin/sh', ['-c', text, remoteScriptName(id), ...args], { encoding: 'utf8' });
      const answer = parseRemoteScriptAnswer(out);
      if (answer === null) throw new Error('No script answer');
      return answer;
    };
    const ask = { run, farPath: far, mirrorPath: mirror, trackedFiles: ['a.ts'] };
    writeFileSync(file, 'export const a = 1;\n');
    utimesSync(file, 1700000000.1, 1700000000.1);
    const first = await syncRemoteArchMirror(ask);
    writeFileSync(file, 'export const a = 2;\n');
    utimesSync(file, 1700000000.9, 1700000000.9);
    const second = await syncRemoteArchMirror(ask);
    const third = await syncRemoteArchMirror(ask);
    console.log(JSON.stringify({ first, second, third, far: readFileSync(file, 'utf8'), mirror: readFileSync(join(mirror, 'a.ts'), 'utf8') }));
    expect(readFileSync(join(mirror, 'a.ts'), 'utf8')).toBe(readFileSync(file, 'utf8'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
