/**
 * The received row over the committed recordings (Phase 374, row U7's second
 * half, and the hostile payloads of the entry).
 *
 * THE FIXTURES ARE INVENTED VALUES IN A RECORDED SHAPE (build/fixtures/p374,
 * made by build/p374/make-fixtures.mjs): which run changes, which one
 * alternates and which carries nothing. No time, plan or fraction of anybody's
 * is in them. What is read here is the line the script would leave after each
 * run, which `expect.json` states; that the script leaves it is
 * ../antigravity/__tests__'s to prove.
 *
 * The bar is 0 runs at which the held number is not the last payload's. The
 * Claude tap's fifteen second clock, replayed over the same recording, scores 2
 * (docs/research/146 §6.5).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { UsageSnapshot } from '@shared/usage';
import { antigravityRow, newestReading } from '../antigravity/receive';
import { createUsageService } from '../service';
import { HASH_A, fakeFolder } from './p374-receiver';

const DIR = join(process.cwd(), 'build/fixtures/p374');
/** The fixtures' own fixed epoch. */
const EPOCH = Date.UTC(2030, 0, 1, 0, 0, 0);

interface Expect {
  runs: number;
  writes: number;
  perRun: { run: number; wrote: boolean; held: string | null }[];
}
interface Bucket {
  f: number;
  r: string | null;
}

const full = (tail: string): string => `{"v":1,"h":"${HASH_A}",${tail}`;

/**
 * Does a drawn percent say what a tail's own text says is used? Arithmetic of
 * this file's own, to the tenth main rounds to; a value halfway between two
 * tenths may go either way.
 */
function says(percent: number | undefined, held: string, id: string): boolean {
  const doc = JSON.parse(`{${held}`) as { q: Record<string, Bucket | undefined> };
  const bucket = doc.q[id];
  if (bucket === undefined || percent === undefined) return false;
  const tenths = (1 - bucket.f) * 1000;
  return Math.abs(percent * 10 - tenths) <= 0.5 + 1e-6 && Number.isInteger(Math.round(percent * 1e6) / 1e5);
}

const expectations = JSON.parse(readFileSync(join(DIR, 'expect.json'), 'utf8')) as Record<
  string,
  Expect | string
>;

for (const name of ['launch', 'resume']) {
  const want = expectations[name] as Expect;
  const lines = readFileSync(join(DIR, `${name}.jsonl`), 'utf8')
    .trim()
    .split('\n')
    .map((one) => JSON.parse(one) as { run: number; t: number });

  describe(`the ${name} recording`, () => {
    it('holds the last payload at every run, through the service and its pulse', async () => {
      let now = EPOCH;
      const folder = fakeFolder(() => now);
      const told: UsageSnapshot[] = [];
      const logs: string[] = [];
      const service = createUsageService({
        credentials: { keychain: async () => null, readText: async () => null, env: {}, home: '/u' },
        transport: async () => {
          throw new Error('a request was sent');
        },
        settings: () => ({ claude: false, codex: false, antigravity: true, bar: 'five-hour' }),
        logins: () => {
          throw new Error('a login was asked for');
        },
        receiver: folder.port,
        now: () => now,
        log: (event) => logs.push(event),
        onChanged: (snapshot) => told.push(snapshot)
      });
      await service.read();
      expect(want.perRun.length).toBe(lines.length);
      let wrong = 0;
      let writes = 0;
      let wroteAt: number | null = null;
      for (const step of want.perRun) {
        const line = lines.find((one) => one.run === step.run);
        now = EPOCH + (line?.t ?? 0);
        if (step.wrote && step.held !== null) {
          writes += 1;
          wroteAt = now;
          folder.files = [{ id: 's', text: full(step.held), mtimeMs: now }];
          folder.mtime = now;
        }
        service.pulse();
        const row = service.current().providers[2];
        if (step.held === null) {
          if (row?.state !== 'waiting') wrong += 1;
          continue;
        }
        const same =
          says(row?.fiveHour?.percent, step.held, 'gemini-5h') &&
          says(row?.sevenDay?.percent, step.held, 'gemini-weekly') &&
          says(row?.second?.fiveHour?.percent, step.held, '3p-5h') &&
          says(row?.second?.sevenDay?.percent, step.held, '3p-weekly') &&
          // The age is the last CHANGE's and never the last run's.
          row?.readAt === wroteAt;
        if (!same) wrong += 1;
      }
      expect(wrong).toBe(0);
      expect(writes).toBe(want.writes);
      expect(logs).toEqual([]);
      // Nothing is said twice: at most one telling a write, and the minute's
      // ageing at most once more.
      const bodies = told.map((s) => JSON.stringify(s.providers[2]));
      for (let i = 1; i < bodies.length; i += 1) expect(bodies[i]).not.toBe(bodies[i - 1]);
    });
  });
}

describe('the hostile payloads', () => {
  const at = join(DIR, 'hostile.json');
  const hostile = JSON.parse(existsSync(at) ? readFileSync(at, 'utf8') : '{"payloads":[]}') as {
    payloads: { name: string; tail: string | null; draws: number | null }[];
  };

  it('are the ones the entry names', () => {
    expect(hostile.payloads.length).toBeGreaterThanOrEqual(36);
  });

  for (const one of hostile.payloads) {
    it(`draws ${one.draws === null ? 'nothing' : String(one.draws)} for ${one.name}`, () => {
      const text = one.tail === null ? '{}' : full(one.tail);
      const reading = newestReading([{ id: 's', text, mtimeMs: EPOCH }], EPOCH);
      expect(antigravityRow(reading, EPOCH).fiveHour?.percent ?? null).toBe(one.draws);
    });
  }
});
