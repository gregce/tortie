# 20 — Shift+Enter inserts a newline, for every supported CLI (Phase 12.5)

Status: **design settled, ready to implement.** Synthesis of two independent hands-on probes
(PROBE A = encoding/wire, PROBE B = per-agent behaviour) plus a third confirming spot-check run by
this document (PROBE C). All measurements 2026-08-10 on tmux 3.6a, @xterm/xterm 6.0.0, Electron 43,
macOS 15, private socket `-L gmux`.

Backlog item: `docs/BACKLOG.md` "Phase 12.5".

---

## 1. RECOMMENDATION

**Shift+Enter writes `LF` (`0x0a`, one byte) into the pane. Nothing else. No tmux option changes.**

`LF` is the only sequence that produced a newline on **10 of 10** installed agents, and it did so in
**two independent probes that disagree about every other candidate**. It is also the sequence those
agents document for exactly this purpose ("use Ctrl+J to insert a newline in any terminal" —
Claude Code, Amp, Antigravity, opencode).

Everything else fails somewhere: CSI-u submits on 6 of 10 (tmux downgrades it to a bare `CR` for any
pane that has not negotiated extended keys — measured again in §4), and `ESC CR` has an unresolved
conflict between the two probes on pi and on deepseek, one of which is a submit.

### 1.1 Where the handler lives

`src/renderer/terminal/keys.ts`, in the existing `terminalKeyHandler` returned to
`attachCustomKeyEventHandler` (wired at `src/renderer/terminal/TerminalPane.tsx:190`). The branch
goes **above** `if (!isPlainMeta(event)) return true;` (keys.ts:76) — Shift+Enter is not a ⌘ chord
and that early return would swallow it — and takes the same shape as the ⇧PageUp branch that already
sits there:

```ts
/** ASCII line feed — ⌃J. The one newline every agent understands (research 20 §3). */
const LF = '\n';

// inside the returned handler, before the isPlainMeta early-return:
if (
  event.key === 'Enter' &&
  event.shiftKey &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey
) {
  const seq = multilineKey();          // '' = this agent has no newline: leave Enter alone
  if (seq === '') return true;
  event.preventDefault();
  term.input(seq);                     // NOT gmux.term.sendInput — see §1.3
  return false;
}
```

`multilineKey` is a new closure passed into `terminalKeyHandler` from `TerminalPane.tsx`, mirroring
the existing `tmuxName: () => string` closure (keys.ts:54, TerminalPane.tsx:194) and resolving the
session's agent from the same store lookup the drop router uses
(`src/renderer/terminal/drop/target.ts:63`).

### 1.2 The bytes

| Case | Bytes | Hex |
|---|---|---|
| Shift+Enter, default (every agent + shells) | `LF` | `0a` |
| Shift+Enter, agent registered `multilineKey: null` | *(nothing — handler returns true, xterm sends `CR`, i.e. exactly today's behaviour)* | `0d` |
| Plain Enter, Ctrl+Enter, ⌥Enter | *(untouched — xterm's own path)* | `0d`, `0d`, `1b 0d` |

Note that Shift+Enter and ⌃J deliberately produce identical bytes. That is not a compromise: ⌃J
**is** the newline gesture these TUIs implement, and Shift+Enter is the ergonomic alias users want.

### 1.3 Delivery — `term.input()`, never `gmux.term.sendInput` and never `send-keys -H`

`term.input(seq)` fires `onData` (xterm 6 typings, `xterm.d.ts:1010-1025`: "the data is treated the
same way input typed into the terminal would"), and `TerminalPane.tsx:225` already routes `onData`
through `noteTerminalInput()` and `scroll.sendInput()`. That is the whole reason to go through
xterm rather than the IPC bridge:

* **Copy-mode (Phase 12.3) is a hard dependency.** With a pane in copy-mode, `LF` from a real attach
  client is swallowed — the pane stays in copy-mode and nothing reaches the app (measured, §4).
  `scroll.sendInput()` (`src/renderer/terminal/scroll/surface.ts:208`) is what issues
  `send-keys -X cancel` first (`src/main/tmux/scroll.ts:176`) and then drains the queued keystroke.
* **Ordering.** `term.input()` puts the byte in the same `onData` queue as every typed character, so
  a fast typist cannot interleave the newline ahead of or behind their own text.
* **`noteTerminalInput()` for free**, which the Phase 13 activity detector needs.
* **`send-keys -H` (PROBE B's proposal) buys nothing here.** It does not dodge copy-mode either —
  measured: `send-keys -H 0a` into a copy-mode pane left `pane_in_mode=1` and the pending command
  unrun — and it adds an out-of-band IPC path that can race the pty stream.

Keep `wasUserInput` at its default `true`: this is genuine user input, and the precedent in the same
file is the ⌘C interrupt (`term.input(ETX)`, keys.ts:85), which ships today.

### 1.4 Registry: `multilineKey`

Mirror `imageDrop` exactly (`src/main/agents/registry.ts:159` + `DEFAULT_IMAGE_DROP:164`, cached in
the renderer by `src/renderer/terminal/drop/strategy.ts`). One field on `AgentRegistryEntry`, one
default constant, one IPC-primed renderer cache with a synchronous lookup:

```ts
/**
 * How Shift+Enter reaches this agent's prompt (Phase 12.5, research 20 §3).
 * `sequence` is the literal bytes; null = this agent has no multiline input,
 * so gmux leaves Enter/Shift+Enter alone rather than risk a stray submit.
 */
export interface AgentMultilineKey {
  sequence: string | null;
  verified: boolean;
  notes?: string;
}

/** LF (⌃J): 10/10 agents live-verified, and what shells already do with Enter. */
export const DEFAULT_MULTILINE_KEY: AgentMultilineKey = {
  sequence: '\n',
  verified: false
};
```

**Ship it with no per-agent overrides.** Every installed agent is verified on the default; amp and
droid are unverified but their own docs name Ctrl+J / Shift+Enter, so the default is the right
guess for them too. The field exists so that a future agent that binds ⌃J to something else is one
registry line, not a code change — which is exactly the `imageDrop` bargain.

Two rows are worth writing down as `notes` even though they take the default, because they are the
traps a future maintainer would otherwise re-discover: **cursor-agent submits on CSI-u** and
**deepseek no-ops on CSI-u**, both measured under forced extended keys (PROBE A §5).

### 1.5 Fallback rule

1. Look up `multilineKey` for the session's agent; unknown agent, shell, or missing table → the
   default, `LF`.
2. `sequence === null` → return `true` without `preventDefault()`. Shift+Enter then behaves exactly
   as it does today (xterm sends `CR`, the agent submits). This is the BACKLOG's "leave Enter
   behaviour untouched rather than breaking submit" — gmux never invents a sequence it has not
   measured.
3. **Never send CSI-u (`ESC[13;2u`) or `ESC[27;2;13~` down the client path**, ever, unless a future
   change first gates on `#{pane_key_mode} != "VT10x"`. For a VT10x pane tmux rewrites both to a
   bare `CR` — an unintended submit of the user's half-written prompt. That is the single worst
   failure this feature can produce, and §4 reproduces it.

### 1.6 Discoverability

Add one row to the "Sessions" group in `src/renderer/app/ShortcutsOverlay.tsx:16-28`, next to the
⇧⇞/⇧⇟ row:

```ts
{ keys: ['⇧↩'], action: 'New line in the prompt (Enter still sends)' }
```

---

## 2. What was actually broken — the mechanism

Two facts compose. Neither is an xterm.js bug and neither is a tmux bug.

**(a) xterm 6 does not encode the Shift on Enter.** `src/common/input/Keyboard.ts`,
`evaluateKeyboardEvent`, verified in this repo's `node_modules/@xterm/xterm/lib/xterm.js.map`:

```js
case 13:  // return/enter
  result.key = ev.altKey ? C0.ESC + C0.CR : C0.CR;
  result.cancel = true;
  break;
```

`modifiers` is computed at the top of the function and then never consulted for keyCode 13, so
Enter, Shift+Enter and Ctrl+Enter are all `\r`; only Alt+Enter differs. The bundle contains no
`modifyOtherKeys`, no XTMODKEYS, no CSI-u emitter and no kitty protocol — there is no mode to turn
on. `attachCustomKeyEventHandler` + `Terminal.input()` is the only lever, which is what the BACKLOG
guessed.

**(b) tmux re-encodes, and downgrades what the app never asked for.** tmux is not a pipe. With
`extended-keys on` (gmux's conf) an application "can request" mode 1 or 2; a pane that requests
nothing stays `VT10x`, and for a VT10x pane tmux rewrites any modified-Enter it receives into a bare
`CR`, because legacy VT has no encoding for one. So even a perfectly formed CSI-u Shift+Enter
arrives at the agent as a submit.

Corollary: **`#{pane_key_mode}` is the runtime oracle** for what a pane can receive
(`VT10x` / `Ext 1` / `Ext 2`), and gmux already runs a pane poll that could read it. The
recommendation does not need it — `LF` is safe in all three modes — but any future CSI-u work must
gate on it.

---

## 3. PROBE A — the wire evidence

What the inner application receives, by the pane's negotiated key mode. Rows are what gmux writes
into the attach client's pty. `extended-keys on` throughout; `extended-keys-format xterm` (tmux's
default and what the live server has). Ground truth = a raw-mode byte logger running inside the
pane, driven through a real `tmux attach-session` client on its own pty — byte-identical in shape to
`src/main/attach/attach-host.ts`.

| gmux emits | app = VT10x (requested nothing) | app = Ext 1 (`CSI>4;1m`) | app = Ext 2 (`CSI>4;2m`) |
|---|---|---|---|
| `\r` | `\r` | `\r` | `\r` |
| `\n` | `\n` | `\n` | `\x1b[27;5;106~` (⌃J) |
| `\x1b\r` | `\x1b\r` | `\x1b\r` | `\x1b[27;3;13~` |
| `\x1b[13;2u` | **`\r` — Shift stripped** | `\x1b[27;2;13~` | `\x1b[27;2;13~` |
| `\x1b[27;2;13~` | **`\r` — Shift stripped** | `\x1b[27;2;13~` | `\x1b[27;2;13~` |
| `\x1b[13;5u` (⌃Enter) | **`\r`** | `\x1b[27;5;13~` | `\x1b[27;5;13~` |
| `\x1b[13;3u` (⌥Enter) | `\x1b\r` | `\x1b\r` | `\x1b[27;3;13~` |
| `\x1b[13u` (no modifier param) | passed through raw — tmux does not parse it | raw | mangled to `\x1b[27;3;91~13u` |

Four consequences:

* **The wire form barely matters.** `\x1b[13;2u` and `\x1b[27;2;13~` are indistinguishable by the
  time they reach the app; tmux normalises them. tmux parses CSI-u from a client even though a real
  attach client's `client_termfeatures` is `bpaste,ccolour,clipboard,cstyle,focus,RGB,sixel,title`
  with **no `extkeys`** — so no terminal-features tinkering is needed, and adding `extkeys` would
  only make tmux emit `CSI>4;2m` at xterm.js, which has no parser for it.
* **Plain Enter is `\r` in every mode.** Submit is never at risk from any of this.
* **`\n` and `\x1b\r` are the only two candidates that survive with their meaning intact in all
  three modes** — literally in VT10x/Ext 1, and as the app's own requested encoding in Ext 2.
* **CSI-u is only safe above VT10x**, which is the §1.5 rule.

### 3.1 The two tmux options that look like fixes and are not

**`set -s extended-keys always`** does force `Ext 1` on every pane, and the modifier then reaches
every app (`xterm` format → `\x1b[27;2;13~`, `csi-u` format → `\x1b[13;2u`). Do not ship it.
Measured harms, on a throwaway socket:

* `zsh -f`, `echo hello` then two Shift+Enter → the command line becomes
  `echo hello;2;13~;2;13~` (or `echo hello3;2u3;2u` under csi-u). Literal junk in the user's shell.
* cursor-agent inserts the literal text `^[[27;2;13~` into its composer.
* And it does not even work: forced Ext 1 + xterm format newlines only on qwen; codex, muse and
  deepseek ignore it and cursor-agent corrupts.

**`set -s extended-keys-format csi-u`** is more interesting and is a real, if optional, finding.
Codex shells out at startup and reads the option — with a logging `tmux` shim first on PATH, a codex
launch inside a pane produces exactly:

```
tmux display-message -p #{client_termtype}
tmux display-message -p #{client_termname}
tmux display-message -p #{extended-keys-format}
```

and, reproduced 3/3 per format with plain `extended-keys on`:

| `extended-keys-format` | codex `pane_key_mode` | Shift+Enter (CSI-u) in codex |
|---|---|---|
| `xterm` (today) | `VT10x` | submits |
| `csi-u` | `Ext 2` | newline |

pi also warns at launch that it "works best with csi-u". So the option is a genuine
integration path, **but it is out of scope for this phase and must not be bundled with the `LF`
change** — see the risk in §6.3.

---

## 4. PROBE C — the synthesizer's confirming spot-check

Run for this document, because the two probes disagree (§5.1) and because the BACKLOG requires
claude and codex hands-on. Method: fresh `zzsyn-*` sessions on `-L gmux`; text typed with
`send-keys -l`; **the sequence under test written into the stdin of a real `tmux -L gmux attach`
client under a pty** (`scratchpad/zzclient.py`), which is gmux's actual path; then `capture-pane`.

| Pane | `pane_key_mode` | Sequence | Result |
|---|---|---|---|
| claude 2.1.x | `Ext 2` | `0a` | **newline** — `AAA1` line 16, `BBB2` line 17, nothing submitted |
| codex 0.147.0 | `VT10x` | `0a` | **newline** — `AAA1` line 11, `BBB2` line 12, nothing submitted |
| `zsh -f` | `VT10x` | `0a` | `echo ZZQ` **ran** (readline `accept-line`), no junk characters — identical to Enter |
| `zsh -f` | `VT10x` | `1b 5b 31 33 3b 32 75` (CSI-u) | `echo ZZR` **ran** — tmux collapsed CSI-u to `CR`. This is the unintended-submit hazard, reproduced. |
| `zsh -f` in copy-mode | — | `0a` via the client | **swallowed**: `pane_in_mode` stayed 1, the pending command did not run |
| `zsh -f` in copy-mode | — | `0a` via `send-keys -H` | **also swallowed**: `pane_in_mode` stayed 1, command did not run |

This independently reproduces: the claude/codex/shell key modes, the `LF` newline on both agents
through the real client path, the shells-unaffected claim, the CSI-u collapse, and the copy-mode
dependency — and it kills PROBE B's argument that `send-keys -H` is needed.

---

## 5. Per-agent matrix

Twelve registry agents; eleven binaries on this machine (`droid` is not installed). "live" = typed
text, sent the sequence through a real attach client, read the TUI, with plain `CR` as a negative
control confirming submit.

| Agent | `LF` (`0a`) | CSI-u `ESC[13;2u` | `ESC CR` | `pane_key_mode` | Agent's own binding | Verified |
|---|---|---|---|---|---|---|
| **claude** | **newline** | newline | newline | Ext 2 | `ctrl+j`, `shift+enter`, `\`+Enter, `/terminal-setup` | live, both probes + PROBE C |
| **codex** | **newline** | submits (newline only once codex has negotiated — §3.1) | newline | VT10x | `editor.insert_newline` (configurable) | live, both probes + PROBE C |
| **cursor** (`cursor-agent`) | **newline** | submits (and **submits** even at forced Ext 1) | newline, one probe saw a stray literal `^[` | VT10x | — | live, both probes |
| **gemini** | **newline** | submits | newline | VT10x | — | live, both probes |
| **qwen** | **newline** | submits | newline | VT10x | — | live, both probes |
| **deepseek** | **newline** | submits (**no-op** at forced Ext 1) | **conflict**: newline (B) vs submits (A) | VT10x | — | live, both probes |
| **muse** | **newline** | submits | newline | VT10x | — | live, both probes |
| **pi** | **newline** | newline | **conflict**: newline (A) vs submits (B) | Ext 2 | warns at launch: wants `extended-keys-format csi-u` | live, both probes |
| **antigravity** (`agy`) | **newline** | newline | newline | Ext 2 | `keybindings.json` → `prompt.insert_newline`: `alt+enter`, `ctrl+j`, `shift+enter` | live, both probes |
| **opencode** | **newline** | newline | newline | Ext 1 | `input_newline: shift+return,ctrl+return,alt+return,ctrl+j` | live, both probes |
| **amp** | assumed newline (docs: "use Ctrl+J to insert a newline in any terminal") | its key table maps `ESC[13;2u` → SHIFT_ENTER, enabled via `ESC[=1u` — which tmux ignores | ? | — | kitty protocol | **UNVERIFIED** — pane exits immediately on this machine (unauthenticated / `API request failed: 400`), in both probes |
| **droid** | assumed newline | ? | ? | — | docs mention only "Shift+Enter for new lines" | **UNVERIFIED** — not installed |
| plain shell (`zsh`) | `accept-line`, i.e. submits, no junk | collapses to `CR` → submits | inserts a literal newline into the buffer | VT10x | — | live, PROBE B + PROBE C |

`LF` is 10/10 live across ten agents and two independent probes, plus PROBE C on two of them.
No other column is clean.

### 5.1 Where the two probes disagree, and why it does not matter

| Claim | PROBE A | PROBE B | Resolution |
|---|---|---|---|
| pi + `ESC CR` | newline | **submits** | Unresolved. Ruled out by choosing `LF`. |
| deepseek + `ESC CR` | **submits** | newline | Unresolved. Ruled out by choosing `LF`. |
| cursor-agent + `ESC CR` | newline plus a stray literal `^[` | clean newline | Cosmetic; ruled out by choosing `LF`. |
| codex + CSI-u | newline, once `extended-keys-format csi-u` makes codex request extended keys | ignores CSI-u entirely (written directly with `send-keys -H`) | **Both are true.** B wrote CSI-u to a codex that was still `VT10x` and had therefore never enabled its own extended-key parser. Negotiation state, not a contradiction. |

Every conflict is on a candidate the recommendation does not use. That is the strongest argument for
`LF`: it is the only cell in the matrix that two probes measured the same way.

### 5.2 kitty keyboard protocol — closed

**tmux 3.6a does not implement it.** `CSI >1u` and `CSI >15u` pushed by an app leave
`pane_key_mode` at `VT10x`, and `CSI =1u` changes nothing; tmux answers nothing to a `CSI ? u`
query. Six of ten agents optimistically push kitty flags on a bare pty (codex, agy, pi, muse,
cursor-agent, deepseek) and inside tmux all of it is swallowed. xterm.js 6 does not implement the
protocol either. Kitty is off the table at both ends — which also explains amp, whose only
documented Shift+Enter route is a kitty-gated `ESC[13;2u`.

---

## 6. Must not break

Each of these was measured, not reasoned about.

1. **Plain Enter still submits, everywhere.** The handler matches `event.key === 'Enter' &&
   event.shiftKey` only; unmodified Enter never enters the branch, and tmux delivers `\r` unchanged
   in all three key modes (§3, row 1).
2. **⌥Enter and ⌃J keep working.** Neither is touched. ⌥Enter still leaves xterm as `\x1b\r`
   (Keyboard.ts, §2a); ⌃J still leaves xterm as `\n` — the same byte Shift+Enter will now send, so
   Shift+Enter can only ever behave exactly as ⌃J already does on that agent. Backslash-Enter,
   `/terminal-setup` keymaps and per-agent `keybindings.json` entries are all untouched because gmux
   writes no agent config.
3. **Shells are unaffected.** In a `VT10x` shell pane `LF` is readline's `accept-line` — measured:
   `echo ZZQ` ran, no stray characters. Shift+Enter in zsh therefore does today what it did before
   (submits the line). Note this is the same *outcome* by a different byte (`0a` instead of `0d`);
   the two are indistinguishable to readline. `^J` is also the historical newline synonym in `less`
   and vim insert mode, so full-screen non-agent apps degrade gracefully.
4. **Copy-mode (Phase 12.3).** Measured twice in §4: with the pane in copy-mode, `LF` is swallowed
   by tmux's copy-mode key table and never reaches the app — via the attach client *and* via
   `send-keys -H`. The newline **must** travel the existing cancel-then-write path
   (`term.input()` → `onData` → `ScrollSurface.sendInput()` → `send-keys -X cancel` → drain).
   Calling `gmux.term.sendInput` from the key handler would produce a Shift+Enter that silently does
   nothing whenever the user has scrolled up.
5. **Bracketed paste: no interaction.** `Terminal.input()` does not bracket — bracketing lives in
   xterm's paste path only. Every agent measured had `?2004h` active and the newlines landed anyway.
   ⌘V is still deliberately unhandled in `keys.ts` and still falls through to `role:'paste'`.
6. **No double submit.** `preventDefault()` is load-bearing, not cosmetic:
   `CoreBrowserTerminal._keyDown` short-circuits when the custom handler returns `false` but leaves
   `_keyDownHandled = false`, and `_keyPress` then re-consults the handler and would emit `\r` for
   charCode 13. The ⌘ branches in `keys.ts` already do `preventDefault(); … return false;` — the
   Shift+Enter branch must copy that shape exactly.
7. **Mouse, wheel and context menu: no interaction.** The keydown path is disjoint from
   `attachCustomWheelEventHandler` and the native menu. The one shared surface,
   `noteTerminalInput()`, is fed correctly by the `term.input()` route.
8. **⇧PageUp/⇧PageDown keep working.** The new branch tests `event.key === 'Enter'`, so it cannot
   shadow the existing shift-modified branch above it.

---

## 7. Risks and unverified

1. **amp and droid are UNVERIFIED.** amp exits immediately on this machine in a fresh pane
   (unauthenticated) and droid is not installed. Both get the `LF` default, which their own docs
   support. Mark both `verified: false` in the registry and re-check when an install exists. amp is
   the more interesting one: its only documented Shift+Enter route is kitty-gated CSI-u, which tmux
   will never deliver (§5.2), so `LF` is likely the *only* thing that will ever work for it inside
   gmux.
2. **A future agent could bind ⌃J to something else.** Nothing in the ten measured agents does, but
   this is the reason `multilineKey` is a registry field rather than a constant. Symptom would be
   Shift+Enter doing that other thing; fix is one registry line.
3. **Do not ship `extended-keys-format csi-u` in the same change.** It is attractive (it unlocks
   codex's native CSI-u Shift+Enter and silences pi's launch warning) but it flips codex from
   `VT10x` to `Ext 2`, which changes how tmux re-encodes **our** `LF` — from a raw `\n` to
   `\x1b[27;5;106~`. That re-encoding is verified for claude but **not** for codex. If it is ever
   adopted: it is a *server* option, the conf is read only at server start, so it must join
   `BOOT_SERVER_OPTIONS` in `src/main/ipc.ts:106` alongside `remain-on-exit`; and `LF` must be
   re-verified on all ten agents under it first.
4. **`extended-keys always` is a trap** (§3.1) — junk in shells, corruption in cursor-agent, and it
   does not fix codex. Recorded here so nobody re-proposes it.
5. **`pane_key_mode` is a live property, not a constant.** An agent can negotiate extended keys
   after startup, and a pane that was an agent can become a shell. Any future CSI-u gate must read
   it per keystroke from the existing poll, never cache it at session start. The `LF` design has no
   such hazard, which is a large part of why it is the recommendation.
6. **`LF` is semantically a lie**: it tells the agent "the user pressed Ctrl+J", not "the user
   pressed Shift+Enter". If an agent ever wants to distinguish them (say, Shift+Enter = newline but
   Ctrl+J = something else), gmux would have to move that agent to CSI-u behind a `pane_key_mode`
   gate. No measured agent does this today.
7. **Ctrl+Enter is out of scope.** xterm sends `\r` for it today (§2a), so it submits. Several
   agents (opencode, Antigravity) would accept it as a newline. Adding it is a one-line extension of
   the same branch but it was not measured, so it is not recommended here.
8. **Method note carried from PROBE B:** `~/.cursor/cli-config.json` had its model preference
   changed during probing (`Grok` → `Auto`) and was subsequently rewritten by a different
   cursor-agent build; a byte-exact backup is at
   `scratchpad/cursor-backup/cli-config.json` if `Grok` is wanted back. Unrelated to this
   recommendation, but it belongs in the record.

### Probe hygiene

PROBE C created `zzsyn-claude`, `zzsyn-codex`, `zzsyn-sh`, `zzsyn-sh2` on `-L gmux` and killed all
four; `zzsyn` sessions remaining: 0. The user's sessions and the sibling workflow's `zz-probe-*`
sessions were untouched, and the server options are unchanged
(`extended-keys on`, `extended-keys-format xterm`). claude was launched in a throwaway directory
under the scratchpad, so it wrote one scratch project entry under `~/.claude/projects/`.
No agent config file was modified by PROBE C, and no prompt was ever submitted to a model.

### Reusable harnesses

In `/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/`:
`zzclient.py` (real `tmux attach` client under a pty — the gmux path), `inner.py` (in-pane raw-mode
byte logger = ground truth), `outer.py`, `sniff.py` / `zzsniff.py` (bare-pty negotiation sniffers),
`matrix.py` (per-agent newline classifier), `zzprobe.sh`.
