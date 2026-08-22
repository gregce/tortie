// Research 62: the three measurements the document reports, reproducible.
//
//   node resolve.mjs > fleet.tsv          # needs a COPY of manifest.db in cwd
//   grep '/Users/you/project' fleet.tsv | cut -f1,6 > project.tsv
//   node measure.mjs project.tsv /Users/you/project
//
// Column 1 of project.tsv is the agent id, column 2 is the absolute store path.
// Every read is read only. Nothing is written anywhere.

import { fresh, advance, snapshot } from './overview.mjs'
import { readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const [, , listPath, repo] = process.argv
if (!listPath) { console.error('usage: node measure.mjs <agent-and-path.tsv> [repo-path]'); process.exit(1) }

const S = readFileSync(listPath, 'utf8').trim().split('\n').map(l => l.split('\t'))
let bytes = 0
for (const [, p] of S) bytes += statSync(p).size

const cold = () => S.map(([a, p]) => { const s = fresh(a); advance(s, p); return s })

const t = []
let turns = 0
for (let i = 0; i < 7; i++) {
  const t0 = process.hrtime.bigint()
  const st = cold()
  t.push(Number(process.hrtime.bigint() - t0) / 1e6)
  if (i === 0) for (const s of st) turns += snapshot(s).turns.length
}
t.sort((a, b) => a - b)
console.log(`sessions ${S.length}  bytes ${bytes}  human turns ${turns}`)
console.log(`cold fold  median ${t[3].toFixed(1)} ms  min ${t[0].toFixed(1)}  max ${t[6].toFixed(1)}`)

const st = cold()
const w = []
for (let i = 0; i < 25; i++) {
  const t0 = process.hrtime.bigint()
  for (let k = 0; k < S.length; k++) advance(st[k], S[k][1])
  w.push(Number(process.hrtime.bigint() - t0) / 1e6)
}
w.sort((a, b) => a - b)
console.log(`warm recheck  median ${w[12].toFixed(3)} ms  min ${w[0].toFixed(3)}  max ${w[24].toFixed(3)}`)

if (!repo) process.exit(0)

// How much of what git says changed does the transcript layer know about.
const named = new Set()
for (const s of st) {
  for (const turn of snapshot(s).turns) {
    for (const f of turn.filesWritten) named.add(f.replace(repo.replace(/\/$/, '') + '/', ''))
  }
}
for (const win of ['2 days ago', '7 days ago']) {
  const out = execFileSync('git', ['log', '--since', win, '--name-only', '--pretty=format:'], { cwd: repo, encoding: 'utf8' })
  const changed = new Set(out.split('\n').map(x => x.trim()).filter(Boolean))
  let hit = 0
  for (const c of changed) if (named.has(c)) hit++
  console.log(`since ${win}: git changed ${changed.size} paths, sessions named ${named.size}, overlap ${hit} (${(100 * hit / changed.size).toFixed(1)}%)`)
}
