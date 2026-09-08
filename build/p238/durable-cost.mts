/**
 * Re-derive research 83 A3.3's durable price on THIS tree and this disk,
 * through the SHIPPING `writeDurable`. Independent of the .p222 script the
 * research used: it writes its own fixtures, in its own scratch directory,
 * removed in a `finally`. Nothing under the person's home is read or written.
 */
import { mkdtempSync, rmSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeDurable } from '../../src/main/durable/write';

const dir = mkdtempSync(join(tmpdir(), 'p238-durable-'));
try {
  const fixtures: Array<[string, string]> = [
    ['ZEN-OF-TORTIE.md (a small doc)', readFileSync('docs/ZEN-OF-TORTIE.md', 'utf8')],
    ['CLAUDE.md (this tree p99)', readFileSync('CLAUDE.md', 'utf8')],
    ['docs/BACKLOG.md (this tree max)', readFileSync('docs/BACKLOG.md', 'utf8')]
  ];
  for (const [label, data] of fixtures) {
    const path = join(dir, 'baseline.txt');
    const ms: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      const t = process.hrtime.bigint();
      await writeDurable({ path, data });
      ms.push(Number(process.hrtime.bigint() - t) / 1e6);
    }
    ms.sort((a, b) => a - b);
    const bytes = Buffer.byteLength(data, 'utf8');
    console.log(
      `${label.padEnd(34)} bytes=${String(bytes).padStart(9)} min=${ms[0].toFixed(1)}ms median=${ms[5].toFixed(1)}ms max=${ms[9].toFixed(1)}ms`
    );
    if (statSync(path).size !== bytes) throw new Error('what was published is not the payload');
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
