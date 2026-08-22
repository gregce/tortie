// Research 62 mechanism lab: a deterministic, incremental, per-turn extractor.
// Node built-ins only. Zero dependencies. Read only.
//
// The contract, and it is the whole design:
//   fold(state, bytes) -> state'      and      fold(fold(s, a), b) === fold(s, a ++ b)
// Everything the extractor learns lives in `state`, `state` is plain JSON, and the
// byte offset is only advanced past a line that ended with a newline.

import { openSync, readSync, closeSync, fstatSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const PARSER_VERSION = 3

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------
const CLIP_ASK = 400
const CLIP_ANSWER = 400
const CLIP_CMD = 160
const MAX_FILES = 40
const MAX_CMDS = 40

const clip = (s, n) => {
  if (typeof s !== 'string') return null
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}
const push = (arr, v, cap) => { if (v && !arr.includes(v) && arr.length < cap) arr.push(v) }
const bump = (obj, k) => { if (k) obj[k] = (obj[k] || 0) + 1 }

// Claude Code writes its compaction handover as a user message. It is not a
// human ask, and a summary that shows it as one is wrong in the most misleading
// possible way, because the text reads like a person describing the work.
const CLAUDE_COMPACT = /^\s*(This session is being continued from a previous conversation|<summary>)/

// Claude Code records slash-command plumbing as extra user turns. These are not
// the human speaking. Research 44 established the rule; this is the same rule.
const SLASH_NOISE = /^\s*<(command-name|command-message|command-args|local-command-stdout|local-command-stderr|local-command-caveat|system-reminder|task-notification|user-prompt-submit-hook)/

function newTurn (ord, at) {
  return {
    ord,
    startedAt: at || null,
    endedAt: at || null,
    ask: null,
    askChars: 0,
    tools: {},
    toolCalls: 0,
    filesWritten: [],
    filesRead: [],
    commands: [],       // {cmd, exit}  exit: integer | null | 'err'
    failures: 0,
    firstFailure: null,
    outstandingQuestion: null,
    answer: null,
    tokensIn: 0,
    tokensOut: 0,
    contextTokens: 0,
    costUsd: 0,
    compacted: false,
    interrupted: false,
    synthetic: false,   // activity that arrived with no human ask attached to it
    open: true
  }
}

function blankState (agent) {
  return {
    parserVersion: PARSER_VERSION,
    agent,
    offset: 0,          // byte offset of the first UNCONSUMED byte
    fileSize: 0,
    partialTailBytes: 0, // a last line still being written, never parsed
    lines: 0,
    badLines: 0,
    meta: { sessionId: null, cwd: null, branch: null, model: null, title: null,
            firstAt: null, lastAt: null, agentRecap: null },
    ord: 0,
    turns: [],          // closed turns, in order
    open: null,         // the turn in flight, or null
    pending: {}         // per-agent scratch that must survive a chunk boundary
  }
}

// ---------------------------------------------------------------------------
// per agent record reducers.  Each takes (state, record) and mutates state.
// ---------------------------------------------------------------------------

const openTurn = (s, at) => {
  if (s.open) closeTurn(s)
  s.ord += 1
  s.open = newTurn(s.ord, at)
  return s.open
}
const closeTurn = (s) => {
  if (!s.open) return
  s.open.open = false
  s.turns.push(s.open)
  s.open = null
}
const cur = (s) => { if (s.open) return s.open; const t = openTurn(s, s.meta.lastAt); t.synthetic = true; return t }

function touchTime (s, ts) {
  if (!ts) return
  if (!s.meta.firstAt) s.meta.firstAt = ts
  s.meta.lastAt = ts
  const t = s.open
  if (t) { if (!t.startedAt) t.startedAt = ts; t.endedAt = ts }
}

// ---- claude ---------------------------------------------------------------
function claudeRecord (s, r) {
  touchTime(s, r.timestamp)
  if (r.sessionId && !s.meta.sessionId) s.meta.sessionId = r.sessionId
  if (r.cwd) s.meta.cwd = r.cwd
  if (r.gitBranch) s.meta.branch = r.gitBranch
  if (r.type === 'ai-title' && r.aiTitle) s.meta.title = r.aiTitle

  if (r.type === 'user' && !r.isMeta) {
    const c = r.message?.content
    if (typeof c === 'string') {
      if (CLAUDE_COMPACT.test(c)) { cur(s).compacted = true; return }
      if (SLASH_NOISE.test(c)) return
      const t = openTurn(s, r.timestamp)
      t.ask = clip(c, CLIP_ASK); t.askChars = c.length
      return
    }
    if (!Array.isArray(c)) return
    const results = c.filter(b => b.type === 'tool_result')
    if (results.length === 0) {
      const text = c.filter(b => b.type === 'text').map(b => b.text).join('\n')
      if (!text) return
      if (CLAUDE_COMPACT.test(text)) { cur(s).compacted = true; return }
      if (SLASH_NOISE.test(text)) return
      const t = openTurn(s, r.timestamp)
      t.ask = clip(text, CLIP_ASK); t.askChars = text.length
      return
    }
    // a tool result rides back into the open turn
    const t = cur(s)
    for (const b of results) {
      const body = typeof b.content === 'string' ? b.content
        : Array.isArray(b.content) ? b.content.map(x => x?.text || '').join('\n') : ''
      if (b.is_error) {
        t.failures += 1
        if (!t.firstFailure) t.firstFailure = clip(body, 200)
      }
      // exit code, when claude states it
      const m = /^Exit code (\d+)/.exec(body || '')
      const slot = s.pending.cmdByToolId?.[b.tool_use_id]
      if (slot != null && t.commands[slot]) {
        if (m) t.commands[slot].exit = Number(m[1])
        else if (b.is_error) t.commands[slot].exit = 'err'
        else t.commands[slot].exit = 0
      }
    }
    // the human answering an AskUserQuestion clears the outstanding question
    if (r.toolUseResult && typeof r.toolUseResult === 'object' && r.toolUseResult.answers) {
      t.outstandingQuestion = null
    }
    if (r.toolUseResult && typeof r.toolUseResult === 'object') {
      if (r.toolUseResult.interrupted === true) t.interrupted = true
      const rc = r.toolUseResult.returnCodeInterpretation
      if (typeof rc === 'string' && /error|fail/i.test(rc)) t.failures += 0 // recorded, not double counted
    }
    return
  }

  if (r.type === 'assistant') {
    const t = cur(s)
    const u = r.message?.usage
    if (u) {
      // input_tokens + cache_read is the SIZE OF THE CONTEXT on this request, not new
      // work. Summing it across messages double counts the whole conversation every
      // turn. Keep the largest observed context instead, and sum only output.
      const ctx = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0)
      if (ctx > t.contextTokens) t.contextTokens = ctx
      t.tokensOut += (u.output_tokens || 0)
    }
    if (r.message?.model) s.meta.model = r.message.model
    for (const b of r.message?.content ?? []) {
      if (b.type === 'text' && b.text && b.text.trim()) t.answer = clip(b.text, CLIP_ANSWER)
      if (b.type !== 'tool_use') continue
      bump(t.tools, b.name); t.toolCalls += 1
      const i = b.input ?? {}
      if (b.name === 'Read' && i.file_path) push(t.filesRead, i.file_path, MAX_FILES)
      if ((b.name === 'Edit' || b.name === 'Write' || b.name === 'NotebookEdit' || b.name === 'MultiEdit') && i.file_path)
        push(t.filesWritten, i.file_path, MAX_FILES)
      if (b.name === 'Bash' && i.command) {
        if (t.commands.length < MAX_CMDS) {
          s.pending.cmdByToolId ??= {}
          s.pending.cmdByToolId[b.id] = t.commands.length
          t.commands.push({ cmd: clip(i.command, CLIP_CMD), exit: null })
        }
      }
      if (b.name === 'AskUserQuestion') {
        const q = i.questions?.[0]?.question
        if (q) t.outstandingQuestion = clip(q, 240)
      }
    }
    return
  }

  if (r.type === 'system' && /compact/i.test(r.subtype || r.content || '')) cur(s).compacted = true
}

// ---- codex ----------------------------------------------------------------
function codexRecord (s, r) {
  touchTime(s, r.timestamp)
  const p = r.payload ?? {}
  if (r.type === 'session_meta') {
    s.meta.sessionId ??= p.session_id ?? p.id ?? null
    if (p.cwd) s.meta.cwd = p.cwd
    if (p.model) s.meta.model = p.model
    if (p.git?.branch) s.meta.branch = p.git.branch
  }
  if (r.type === 'turn_context' && p.model) s.meta.model = p.model
  if (r.type === 'compacted') { cur(s).compacted = true; return }

  const it = p.item
  if (it) {
    if (it.type === 'UserMessage') {
      const text = (it.content || []).map(c => c.text || '').join('\n')
      if (SLASH_NOISE.test(text)) return
      const t = openTurn(s, r.timestamp)
      t.ask = clip(text, CLIP_ASK); t.askChars = text.length
      return
    }
    const t = cur(s)
    if (it.type === 'AgentMessage') {
      const text = (it.content || []).map(c => c.text || '').join('\n')
      if (text.trim()) t.answer = clip(text, CLIP_ANSWER)
    }
    if (it.type === 'CommandExecution') {
      bump(t.tools, 'exec'); t.toolCalls += 1
      const cmd = Array.isArray(it.command) ? String(it.command.at(-1)) : String(it.command || '')
      const exit = Number.isInteger(it.exit_code) ? it.exit_code : (it.status === 'failed' ? 'err' : null)
      if (t.commands.length < MAX_CMDS) t.commands.push({ cmd: clip(cmd, CLIP_CMD), exit })
      if (exit !== 0 && exit != null) { t.failures += 1; if (!t.firstFailure) t.firstFailure = clip(it.aggregated_output, 200) }
    }
    if (it.type === 'FileChange' && it.changes) for (const f of Object.keys(it.changes)) push(t.filesWritten, f, MAX_FILES)
    if (it.type === 'ContextCompaction') t.compacted = true
    if (it.type === 'SubAgentActivity' && it.kind === 'started') { bump(t.tools, 'subagent'); t.toolCalls += 1 }
    return
  }

  // 2025-12 vintage, and the event stream
  if (p.type === 'user_message') {
    const text = p.message || p.text || ''
    if (SLASH_NOISE.test(text)) return
    const t = openTurn(s, r.timestamp)
    t.ask = clip(text, CLIP_ASK); t.askChars = String(text).length
    return
  }
  if (p.type === 'function_call' || p.type === 'custom_tool_call') { const t = cur(s); bump(t.tools, p.name); t.toolCalls += 1; return }
  if (p.type === 'token_count' && p.info?.total_token_usage) {
    const t = cur(s)
    t.tokensIn = p.info.total_token_usage.input_tokens || t.tokensIn
    t.tokensOut = p.info.total_token_usage.output_tokens || t.tokensOut
    return
  }
  if (p.type === 'task_complete') {
    const t = cur(s)
    if (p.last_agent_message) t.answer = clip(p.last_agent_message, CLIP_ANSWER)
    closeTurn(s)
  }
}

// ---- grok -----------------------------------------------------------------
function grokRecord (s, r) {
  const ts = typeof r.timestamp === 'number' ? new Date(r.timestamp * 1000).toISOString() : r.timestamp
  touchTime(s, ts)
  const u = r.params?.update
  if (!u) return
  if (r.params?.sessionId) s.meta.sessionId ??= r.params.sessionId
  switch (u.sessionUpdate) {
    case 'user_message_chunk': {
      const text = u.content?.text || ''
      const idx = u._meta?.promptIndex
      // grok streams one user message as several chunks under one promptIndex
      if (s.pending.promptIndex === idx && s.open) { s.open.ask = clip((s.open.ask || '') + text, CLIP_ASK); s.open.askChars += text.length; return }
      s.pending.promptIndex = idx
      const t = openTurn(s, ts)
      t.ask = clip(text, CLIP_ASK); t.askChars = text.length
      if (u._meta?.modelId) s.meta.model = u._meta.modelId
      return
    }
    case 'agent_message_chunk': { const t = cur(s); const x = u.content?.text || ''; if (x.trim()) t.answer = clip((s.pending.ansBuf = (s.pending.ansBuf || '') + x), CLIP_ANSWER); return }
    case 'tool_call': {
      const t = cur(s); const name = u._meta?.['x.ai/tool']?.name || u.title || 'tool'
      bump(t.tools, name); t.toolCalls += 1
      const ri = u.rawInput || {}
      if (ri.target_file) push(t.filesRead, ri.target_file, MAX_FILES)
      if (ri.file_path && /write|edit|replace/i.test(name)) push(t.filesWritten, ri.file_path, MAX_FILES)
      if (ri.command && t.commands.length < MAX_CMDS) { s.pending.grokCmd ??= {}; s.pending.grokCmd[u.toolCallId] = t.commands.length; t.commands.push({ cmd: clip(ri.command, CLIP_CMD), exit: null }) }
      return
    }
    case 'tool_call_update': {
      const t = cur(s)
      const slot = s.pending.grokCmd?.[u.toolCallId]
      if (slot != null && t.commands[slot]) {
        if (u.status === 'failed') { t.commands[slot].exit = 'err'; t.failures += 1 }
        else if (u.status === 'completed') t.commands[slot].exit = 0
      } else if (u.status === 'failed') { t.failures += 1; if (!t.firstFailure) t.firstFailure = clip(u.title, 200) }
      for (const loc of u.locations || []) push(t.filesRead, loc.path, MAX_FILES)
      return
    }
    case 'turn_completed': {
      const t = cur(s)
      const us = u.usage || {}
      t.tokensIn += us.inputTokens || 0; t.tokensOut += us.outputTokens || 0
      if (us.costUsdTicks) t.costUsd += us.costUsdTicks / 1e9
      if (u.stop_reason === 'cancelled') t.interrupted = true
      s.pending.ansBuf = ''
      closeTurn(s)
      return
    }
    case 'session_recap': { s.meta.agentRecap = clip(u.summary, 400); return }
    case 'permission_requested': { cur(s).outstandingQuestion = clip(u.title || 'permission requested', 240); return }
  }
}

// ---- antigravity ----------------------------------------------------------
function antigravityRecord (s, r) {
  touchTime(s, r.created_at)
  if (r.type === 'USER_INPUT') {
    const t = openTurn(s, r.created_at)
    const text = typeof r.content === 'string' ? r.content : JSON.stringify(r.content || '')
    t.ask = clip(text, CLIP_ASK); t.askChars = text.length
    return
  }
  const t = cur(s)
  for (const tc of r.tool_calls || []) {
    bump(t.tools, tc.name || tc.tool_name || 'tool'); t.toolCalls += 1
    if (tc.status && /fail|error/i.test(tc.status)) t.failures += 1
  }
  if (r.type === 'AGENT_RESPONSE' && typeof r.content === 'string' && r.content.trim()) t.answer = clip(r.content, CLIP_ANSWER)
  if (r.status && /fail|error/i.test(r.status)) t.failures += 1
}

const REDUCERS = { claude: claudeRecord, codex: codexRecord, grok: grokRecord, antigravity: antigravityRecord }

// ---------------------------------------------------------------------------
// the fold
// ---------------------------------------------------------------------------
export function foldChunk (state, chunk) {
  const reduce = REDUCERS[state.agent]
  if (!reduce) throw new Error('no reducer for ' + state.agent)
  let buf = chunk
  let start = 0
  for (;;) {
    const nl = buf.indexOf('\n', start)
    if (nl === -1) break
    const line = buf.slice(start, nl)
    start = nl + 1
    if (line.length === 0) continue
    state.lines += 1
    let rec
    try { rec = JSON.parse(line) } catch { state.badLines += 1; continue }
    if (rec && typeof rec === 'object') reduce(state, rec)
  }
  // `chunk` always ends on a newline, so nothing is left over here.
  return state
}

// Read [from, size) of a file, decode ONLY up to the last complete line, and
// report how many bytes were consumed.  The arithmetic is done on the raw bytes,
// never on the decoded string, because a read that lands inside a multi byte
// character would otherwise move the offset by the wrong amount.
export function readSlice (path, from) {
  const fd = openSync(path, 'r')
  try {
    const size = fstatSync(fd).size
    if (from >= size) return { text: '', consumed: 0, size, partial: 0 }
    const len = size - from
    const buf = Buffer.allocUnsafe(len)
    let got = 0
    while (got < len) {
      const n = readSync(fd, buf, got, len - got, from + got)
      if (n <= 0) break
      got += n
    }
    const region = buf.subarray(0, got)
    const lastNl = region.lastIndexOf(0x0a)
    if (lastNl === -1) return { text: '', consumed: 0, size, partial: got }
    return { text: region.subarray(0, lastNl + 1).toString('utf8'), consumed: lastNl + 1, size, partial: got - (lastNl + 1) }
  } finally { closeSync(fd) }
}

// One step of the incremental path. Returns the new state.
// `state` may be a fresh blankState(agent) for a cold pass.
export function advance (state, path) {
  const { text, consumed, size, partial } = readSlice(path, state.offset)
  if (text) foldChunk(state, text)
  state.offset += consumed
  state.fileSize = size
  state.partialTailBytes = partial   // a last line still being written, never parsed
  return state
}

export function fresh (agent) { return blankState(agent) }

// The rewrite test. A file whose prefix changed cannot be folded forward.
// The cheapest honest check is a hash of the first N bytes we already consumed.
export const PREFIX_PROBE = 65536
export function prefixHash (path, n = PREFIX_PROBE) {
  const { text } = readSlice(path, 0)
  return createHash('sha256').update(text.slice(0, n)).digest('hex').slice(0, 16)
}

// ---------------------------------------------------------------------------
// the record the rest of the system would see
// ---------------------------------------------------------------------------
export function snapshot (state) {
  const turns = state.open ? state.turns.concat([state.open]) : state.turns
  return {
    parserVersion: state.parserVersion,
    agent: state.agent,
    meta: state.meta,
    lines: state.lines,
    badLines: state.badLines,
    turnCount: turns.length,
    humanTurns: turns.filter(t => !t.synthetic).length,
    turns: turns.map(t => ({
      ord: t.ord,
      open: t.open,
      startedAt: t.startedAt,
      endedAt: t.endedAt,
      spanMs: (t.startedAt && t.endedAt) ? (Date.parse(t.endedAt) - Date.parse(t.startedAt)) : null,
      ask: t.ask,
      askChars: t.askChars,
      tools: t.tools,
      toolCalls: t.toolCalls,
      filesWritten: t.filesWritten,
      filesRead: t.filesRead,
      commands: t.commands,
      failures: t.failures,
      firstFailure: t.firstFailure,
      outstandingQuestion: t.outstandingQuestion,
      answer: t.answer,
      tokensIn: t.tokensIn,
      tokensOut: t.tokensOut,
      contextTokens: t.contextTokens,
      costUsd: Number(t.costUsd.toFixed(6)),
      compacted: t.compacted,
      interrupted: t.interrupted,
      synthetic: t.synthetic
    }))
  }
}

export function canon (obj) { return JSON.stringify(obj, null, 1) }
