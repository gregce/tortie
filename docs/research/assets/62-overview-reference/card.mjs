// The zero model readout. The engine builds the whole string; nothing is generated.
import { fresh, advance, snapshot } from './overview.mjs'
const rel = (a, b) => { if (!a || !b) return '?'; const d = Math.abs(Date.parse(b) - Date.parse(a)) / 1000
  if (d < 90) return Math.round(d) + 's'; if (d < 5400) return Math.round(d / 60) + 'm'
  if (d < 172800) return (d / 3600).toFixed(1) + 'h'; return (d / 86400).toFixed(1) + 'd' }
const short = p => p ? p.replace(/^\/Users\/[^/]+\//, '~/') : p
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}×${v}`).join(' ')

export function card (snap, label) {
  const T = snap.turns, last = T[T.length - 1]
  const L = []
  L.push(`# ${label}  ·  ${snap.agent}${snap.meta.model ? ' ' + snap.meta.model : ''}  ·  ${short(snap.meta.cwd) || '?'}${snap.meta.branch ? ' @' + snap.meta.branch : ''}`)
  if (T.length === 0) { L.push('  no turn on record yet'); return L.join('\n') }
  L.push(`  ${T.length} turn${T.length > 1 ? 's' : ''} over ${rel(snap.meta.firstAt, snap.meta.lastAt)}, last activity ${rel(snap.meta.lastAt, new Date().toISOString())} ago`)
  if (snap.meta.title) L.push(`  agent's own title: ${snap.meta.title}`)
  L.push('')
  L.push('  ASKED (most recent first)')
  for (const t of T.slice(-4).reverse()) L.push(`   ${t.ord}. ${t.ask ?? '(no ask recorded)'}`.slice(0, 200))
  const allWritten = [...new Set(T.flatMap(t => t.filesWritten))]
  const root = snap.meta.cwd
  const written = root ? allWritten.filter(f => f.startsWith(root + '/')) : allWritten
  const outside = root ? allWritten.filter(f => !f.startsWith(root + '/')) : []
  const cmds = T.flatMap(t => t.commands)
  const failed = cmds.filter(c => c.exit !== 0 && c.exit != null)
  const tools = {}; for (const t of T) for (const [k, v] of Object.entries(t.tools)) tools[k] = (tools[k] || 0) + v
  L.push('')
  L.push('  CHANGED')
  L.push(written.length ? written.slice(0, 8).map(f => '   ' + short(f)).join('\n') + (written.length > 8 ? `\n   +${written.length - 8} more` : '') : '   nothing written inside the project')
  if (outside.length) L.push(`   ${outside.length} file${outside.length === 1 ? '' : 's'} written OUTSIDE ${short(root)}, e.g. ${short(outside[0])}`)
  L.push('')
  L.push('  RAN')
  L.push(`   ${cmds.length} shell command${cmds.length === 1 ? '' : 's'}, ${failed.length} did not exit 0`)
  for (const c of failed.slice(0, 3)) L.push(`   FAILED (${c.exit}) ${c.cmd}`)
  L.push(`   tools: ${top(tools, 6) || 'none'}`)
  const fails = T.reduce((a, t) => a + t.failures, 0)
  if (fails) { const ff = T.find(t => t.firstFailure)?.firstFailure
    L.push(`   ${fails} tool result${fails === 1 ? '' : 's'} came back an error` + (ff ? `; first was: ${ff}` : ' (no message recorded)')) }
  L.push('')
  L.push('  OUTSTANDING')
  const q = [...T].reverse().find(t => t.outstandingQuestion)
  if (q) L.push(`   the agent asked you: ${q.outstandingQuestion}`)
  else if (last.open) L.push(`   turn ${last.ord} is still open, ${rel(last.startedAt, last.endedAt)} of work so far`)
  else L.push('   nothing; the last turn closed')
  if (last.interrupted) L.push('   the last turn was interrupted or cancelled')
  L.push('')
  L.push('  LAST THING THE AGENT SAID')
  L.push('   ' + (last.answer ?? [...T].reverse().find(t => t.answer)?.answer ?? '(nothing)'))
  if (snap.meta.agentRecap) { L.push(''); L.push("  THE AGENT'S OWN RECAP (free, written by the agent)"); L.push('   ' + snap.meta.agentRecap) }
  // Token counts are deliberately NOT rendered. They mean a different thing in every
  // agent's store (claude reports the context size per request, codex reports a running
  // session total, grok reports a per turn sum across model calls), so a single number
  // across agents would be false. They are also exactly the rising counter the Zen refuses.
  L.push('')
  L.push(`  [record: ${snap.lines} lines read, ${snap.badLines} unparsable, parser v${snap.parserVersion}]`)
  return L.join('\n')
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, path, agent, label] = process.argv
  console.log(card(snapshot(advance(fresh(agent), path)), label || path))
}
