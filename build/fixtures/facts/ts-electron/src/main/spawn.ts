import * as child_process from 'node:child_process';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { Worker } from 'node:worker_threads';
import { utilityProcess } from 'electron';

export function run(): void {
  child_process.spawn('git', ['status']);
  spawnSync('ls');
  child_process.spawn('--upload-pack=/x', []);
  fs.writeFileSync('out.txt', 'x');
  new Worker('w.js');
  utilityProcess.fork('x.js');
  setInterval(() => undefined, 1000);
  const flag = process.env.GMUX_X;
  if (flag === undefined) throw new Error('no key found');
  if (flag === '') throw new Error('$(touch /tmp/p) in a message');
}
