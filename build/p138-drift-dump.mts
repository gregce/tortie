/**
 * Phase 138 gate measurement 2 (fold drift). Dumps the kept slice of a real
 * session log using Phase 137's own reader, so the drift lab reads exactly
 * what the fold would read. It writes one JSON file and nothing else. It
 * spawns no agent, launches no Electron and starts no tmux server.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readerPath = resolve(process.cwd(), 'src/main/overview/reader/index.ts');
const mod: any = await import(readerPath);

const file = process.argv[2] as string;
const outFile = process.argv[3] as string;
const cwd = process.argv[4] ?? '/Users/gdc/gmux';

const r = mod.readSessionLog({
  provider: 'claude',
  file,
  sessionId: null,
  cwd,
  projectPath: cwd,
  watermark: null
});

const turns = r.turns.map((t: any) => ({
  index: t.index,
  askAt: t.ask.at,
  ask: t.ask.text,
  answerAt: t.answer ? t.answer.at : null,
  answer: t.answer ? t.answer.text : null,
  closed: t.closed,
  interrupted: t.interrupted,
  paths: t.paths.slice(0, 12).map((p: any) => p.path)
}));

writeFileSync(
  outFile,
  JSON.stringify({ file, provider: r.provider, work: r.work, acct: r.acct, turnCount: turns.length, turns }, null, 1)
);
console.log(JSON.stringify({ file, turns: turns.length, acct: r.acct }));
