# 16 — Drag-and-drop (and ⌘V) an image into an agent prompt

Recommended implementation for **Phase 12 item 8**. Synthesis of two hands-on
probes plus this session's own verification, all on **2026-08-10**, against
**Electron 43.3.0**, **@xterm/xterm 6.0.0** (the copy in `node_modules`),
**tmux 3.6a**, and the agent CLIs installed on this machine
(Claude Code 2.1.226, Codex 0.147.0, Qwen Code 0.21.7, Muse 0.1.0, deepseek,
antigravity 1.1.11, pi 0.84.0, opencode 1.18.14, Copilot CLI 1.0.78).

Nothing below is recalled from memory. **VERIFIED** = observed in a probe run.
**INFERRED** = read out of upstream source or an unambiguous mechanism, not run.
**ASSUMED** = the safe default we ship because nobody could test it.

Probe artifacts live in the session scratchpads (`ptyclient3.py`, `eclip.js`,
`imgprobe/`, `bp.py`–`bp4.py`); no probe wrote inside `/Users/gdc/gmux`.
Hands-on agent work ran on private tmux sockets (`-L gmuximgprobe`,
`-L gmuxsynth*`), each killed by its own probe. The user's `-L gmux` server and
its live sessions were never touched.

---

## 0. Decisions at a glance

| Question | Decision | Confidence |
| --- | --- | --- |
| How does a reference reach the agent? | **`term.paste(text)` on the xterm instance.** Never hand-rolled `ESC[200~`, never `gmux.term.sendInput` directly | VERIFIED (bundle source + tmux chain, §1) |
| Does Claude Code need the clipboard for `[Image #N]`? | **No.** A bracketed paste of the bare absolute path produces the same `[Image #N]` attachment | VERIFIED (§2) |
| Ship `clipboard.writeImage()` on drop? | **Only for `deepseek` and `antigravity`**, and only behind the guarded snapshot/restore in §7. Everything else uses paste-path | VERIFIED evidence, §7 |
| Ship it for ⌘V? | **No writes at all.** On ⌘V the image is *already* on the pasteboard — forward `0x16` | VERIFIED (§6) |
| Shell-quote the path? | **No for agent panes** (prompt buffers are not shells); backslash-escape only when the path contains space/tab/backslash/quote. **Yes POSIX-quote for `shell` panes** | VERIFIED for claude/codex/qwen; reasoned for shell |
| Where do listeners go? | One **window-level file-drop router** that hit-tests `[data-surface-leaves]`, replacing today's `useFolderDrop` | VERIFIED (xterm registers zero drag listeners, §8) |
| Temp files | `<userData>/gmux/dropped-images/`, never `app.getPath('temp')` | reasoned, §5 |
| New runtime dependency | **none** | — |

**Verdict: build it, and build it smaller than the BACKLOG imagines.**
There is one mechanism (bracketed paste through xterm) and one fallback
(clipboard) for exactly two agents. No temp file is needed for the common case.
No pasteboard is clobbered in the common case.

**The one thing the BACKLOG assumes that is false.** Item 8 says Claude Code's
`[Image #N]` "appears when an image arrives via the CLIPBOARD, so the likely
mechanism is Electron `clipboard.writeImage()` + synthesizing the agent's paste
keybinding". The clipboard route does work — but so does simply bracket-pasting
the absolute path, which yields the identical `[Image #N]` chip with no
pasteboard write, no restore problem, and no temp file. The user's directive
("prefer the native attach path; path expansion is the FALLBACK") is *honored*:
we still get the native attachment. Only the transport changes. The literal
"insert a path as plain text" fallback is now reserved for the three agents that
genuinely cannot attach (`pi`, `cursor`, `droid`) and for non-image files.

---

## 1. The transport chain, verified end to end

Four links, each checked separately this session.

**1.1 `term.paste()` brackets correctly, by itself.** From the shipped bundle
`node_modules/@xterm/xterm/lib/xterm.js` (module 7861):

```js
function i(e){return e.replace(/\r?\n/g,"\r")}                       // newline → CR
function s(e,t){return t?"\x1b[200~"+e+"\x1b[201~":e}                // conditional wrap
r(e,t,r,n){ e = s(i(e), r.decPrivateModes.bracketedPasteMode && !0!==n.rawOptions.ignoreBracketedPasteMode);
            r.triggerDataEvent(e,!0); … }
```

So xterm wraps **only when the remote side has enabled DECSET 2004**, and the
result goes through `triggerDataEvent` → `onData`. Two consequences: we never
guess, and we never bypass the `onData` handler.

**1.2 tmux always enables 2004 on the attach client.** VERIFIED with a real
`tmux attach` client on a pty (`bp.py`): the client's very first output burst
contains `ESC[?2004h` **before any application in the pane enabled it**.
So `decPrivateModes.bracketedPasteMode` is `true` in every gmux pane, shell or
agent, from attach onward — `term.paste()` will always bracket.

**1.3 tmux gates the markers on the inner app.** VERIFIED both directions
(`bp2.py`, `bp4.py`), pane running `cat -v` so bytes are visible:

| pane application | what the pane received |
| --- | --- |
| `cat -v` (no DECSET 2004) | `/tmp/a b.png` — **markers stripped by tmux** |
| `sh -c 'printf "\033[?2004h"; cat -v'` | `^[[200~/tmp/a b.png^[[201~` — **markers forwarded verbatim** |

This kills the classic bracketed-paste hazard outright. gmux can call
`term.paste()` unconditionally: an agent in paste mode gets the brackets, a bare
shell gets clean text, and nobody ever sees a literal `[200~`.

**1.4 The pty write path is byte-safe for arbitrary UTF-8.**
`src/main/attach/attach-host.ts:241-247` accepts a string and calls
`client.pty.write(data)`; node-pty encodes UTF-8, and the attach client is
spawned with `-u` plus `withUtf8Locale(process.env)` (same file, ~180-210).
Spaces, CJK and emoji in a filename need no encoding work and no escaping for
transport. There is no chunk cap on `term:input` — irrelevant for paths, but do
not reuse this path for bulk content.

**1.5 Why routing through xterm is mandatory, not stylistic.**
`src/renderer/terminal/TerminalPane.tsx:170-177` wires
`term.onData(d => { useApp.getState().noteTerminalInput(sessionId); gmux.term.sendInput(sessionId, d); })`.
`noteTerminalInput` is the Bug-B suppression window: any BEL within ~2 s of user
input is treated as self-inflicted. Calling `gmux.term.sendInput` directly from
the drop handler would skip it, and an agent that beeps while ingesting the
image would be mis-flagged **needs input**. `term.paste()` and
`term.input()` both fire `onData`; `sendInput` does not.

---

## 2. Per-agent strategy table

Three strategies, not the BACKLOG's two.

- **`paste-path`** — bracket-paste one absolute path per file. The agent turns
  it into a real attachment. *No clipboard, no temp file, lands at the cursor.*
- **`clipboard-attach`** — put image data on the macOS pasteboard, then send
  `0x16`. The agent reads the pasteboard itself (via `osascript`); tmux does
  **not** intercept `C-v` (gmux's `resources/gmux-tmux.conf` binds nothing to it
  and default tmux has no root-table `C-v`).
- **`path-text`** — insert the path as ordinary text. No attachment; still
  useful, and the correct behavior for non-image files everywhere.

| agent | strategy | insert | outcome observed | verified | notes |
| --- | --- | --- | --- | --- | --- |
| **claude** | `paste-path` | paste | `[Image #N]` chip at the cursor | **VERIFIED** (both probes) | Also works via `0x16`+pasteboard — we don't need it. Counter is per-session monotonic. Paste the path **alone**: `"look at <path>"` in one paste renders as `[Image #5]look at` (chip hoisted, text reordered). |
| **codex** | `paste-path` | paste | `[Image #N]` | **VERIFIED** | Strictest matcher: **exactly one** path per paste, and a space in the path **must** be escaped or quoted. Two paths in one paste, or any surrounding prose, degrade to literal text. |
| **qwen** | `paste-path` | paste | `Attachments: [clipboard-<ts>-0.png]` tray | **VERIFIED** | Attachment goes to a tray, not inline. Copies land in `~/.qwen/tmp/clipboard/` and submit as `@…` — no repo litter (cwd verified unchanged). A pasted **non-image** path is auto-rewritten to `@<abspath> `. |
| **muse** | `paste-path` | paste | `[Image 1]` | **VERIFIED** (space-free paths only) | Quoting behavior for spaced paths untested. |
| **gemini** | `paste-path` | paste | attachment | **INFERRED** | Auth-blocked ("This client is no longer supported for Gemini Code Assist for individuals"). Upstream `packages/cli/src/ui/utils/clipboardUtils.ts` + `parsePastedPaths()` implement exactly the qwen behavior (qwen is a Gemini CLI fork). Ship as `verified: false`. |
| **deepseek** | `clipboard-attach` | paste | `[Attached image: 64x64 PNG (1KB) at ~/.deepseek/clipboard-images/…]` at the cursor | **VERIFIED** | Pasted and typed paths both stay literal — paste-path buys nothing. This is the agent used for the full end-to-end Electron-clipboard proof. |
| **antigravity** | `clipboard-attach` | **type** | `📎 1 media attached (clipboard, 209 B, image/png)` | **VERIFIED** | **Bracket-pasting a path opens a "No matches" completion popup that swallows the next keystroke.** A *typed* path does not. So its path fallback must be typed, and no popup may be open when `0x16` is sent. |
| **pi** | `path-text` | paste | literal text only | **VERIFIED (negative)** | `0x16` writes the pasteboard image to `/var/folders/…/T/pi-clipboard-<uuid>.png` and inserts *that path as plain text* — no chip. Whether pi resolves the path at submit is untested (would require making the agent work). |
| **cursor** | `path-text` | paste | — | **ASSUMED** | Blocked at "Press any key to sign in"; Cursor CLI docs mention no attachment support. |
| **droid** | `path-text` | paste | — | **ASSUMED** | Not installed on this machine. |
| **shell** | `path-text` | paste | POSIX-quoted path at the prompt | reasoned | A shell pane *is* a shell: single-quote it (§3). |

Not in the registry today but verified in passing, if they are ever added:
**opencode** → `paste-path` (`[Image 1]`), **copilot** → `paste-path`
(`[📷 name.png]`). **amp** could not be started on this machine.

### 2.1 Registry surface

`AgentRegistryEntry` (`src/main/agents/registry.ts:100`) gains one optional
field; absent means "use the default", which is `path-text`, satisfying the
BACKLOG's "default any unverified agent to the path fallback".

```ts
export type ImageDropStrategy = 'paste-path' | 'clipboard-attach' | 'path-text';

export interface AgentImageDrop {
  strategy: ImageDropStrategy;
  /** How path TEXT is inserted when we insert path text at all.
   *  'type' exists solely for antigravity's completion-popup quirk. */
  insert: 'paste' | 'type';
  /** true = observed hands-on 2026-08-10 (research 16); false = inherited. */
  verified: boolean;
  notes?: string;
}

export const DEFAULT_IMAGE_DROP: AgentImageDrop = {
  strategy: 'path-text', insert: 'paste', verified: false
};
```

**The renderer needs this data.** Two facts make it cheap:

1. `Session.agent` is typed `AgentKind = 'claude'|'codex'|'shell'`
   (`src/shared/types.ts:11`) but the runtime value is already the full registry
   id — VERIFIED by reading the live manifest: rows carry `pi`, `muse`,
   `antigravity`, `deepseek`. The type is a known lie with a single documented
   cast site (`src/renderer/state/store.ts:665`). Widen `Session.agent` to
   `LaunchableAgentKind` as part of this item, or reuse that one cast.
2. The renderer already has an agents store (`src/renderer/state/agents.ts`) fed
   by `agents:list`. Add `imageDrop` to the `DetectedAgent` row rather than
   duplicating the table in the renderer — **the table exists once, in the
   registry** (guardrail 3).

---

## 3. Escaping and quoting rules

Agent prompt buffers are **not shells**. The BACKLOG's "shell-escaped/quoted"
instruction is right for a shell pane and wrong for an agent pane — Claude Code
accepted `/…/test image.png` unquoted and unescaped (VERIFIED, both probes).
But Codex rejected the same unescaped-space path and kept it as literal text
(VERIFIED). Hence:

```ts
/** Reference text for one path, for one target pane. */
export function referenceText(path: string, agent: LaunchableAgentKind): string {
  if (agent === 'shell') return posixQuote(path);        // real shell: '…'\''…'
  return /[\s\\'"]/.test(path) ? backslashEscape(path) : path;
}

const backslashEscape = (p: string) => p.replace(/([\s\\'"])/g, '\\$1');
const posixQuote = (p: string) => `'${p.replace(/'/g, `'\\''`)}'`;
```

Why backslash and not `'…'`:

- Backslash escaping is **VERIFIED accepted by claude, codex and qwen** — the
  widest verified coverage. It is also the form gemini/qwen's own
  `parsePastedPaths()` emits, so it is the family's native convention.
- `'…'` quoting is verified only in claude and codex; unverified in
  qwen/muse/gemini. Do not make an unverified form the default.
- A bare path (no whitespace, no quotes, no backslash) is verified everywhere
  and is what most drops produce — send it untouched.

**Unicode, emoji, CJK:** no escaping, no transliteration. §1.4 proves the byte
path is UTF-8-clean end to end.

**`\r` / `\n` in a filename — the one hard rejection.** macOS permits both, and
xterm's own `prepareTextForTerminal` rewrites `\n` → `\r` *before* bracketing
(§1.1). Inside a bracketed paste most agents treat CR as a literal newline, but
we will not bet a submitted half-prompt on it. Rule: if
`/[\r\n]/.test(path)`, do not insert that path — copy the file into the drop
store (§5) under a sanitized name and insert the copy's path.

**Do not prepend `@`.** Claude's `@` file picker opens on a *typed* `@`; an
inserted `@path` leaves a completion armed, so the next Enter accepts the
completion instead of submitting (VERIFIED). Qwen adds its own `@` when it wants
one. gmux inserts bare paths only.

**One paste per file, always.** Codex matches at most one path per paste, and
Claude reorders text when prose shares a paste with a path (both VERIFIED). So
multi-file drops loop: `paste(ref)`, then `term.input(' ')` for the separator,
then the next `paste(ref)`, with a small gap between pastes so two bracketed
runs cannot arrive in one read chunk. 80 ms is the suggested gap (see §11 —
this specific interval is untested beyond two files).

---

## 4. The drop pipeline

```
dragover on window
  → file-drop router hit-tests [data-surface-leaves]           (§8)
  → arms layout.attachDrop = { leafId }                         (§9)
drop
  → SYNCHRONOUS extraction from dataTransfer                    (§4.1)
  → per item: resolve an absolute path                          (§4.2)
  → focus the target session (it may not be the active one)     (§4.3)
  → insert via the agent's strategy                             (§4.4)
  → toast the outcome                                           (§9.3)
```

### 4.1 Extraction must be synchronous

VERIFIED in the Electron 43 probe: after the first `await` in a drop handler,
`dataTransfer.items.length` and `dataTransfer.files.length` both read **0** and
`getAsFile()` returns nothing. This is the single most likely implementation
bug.

```ts
function extract(e: DragEvent): { files: File[]; uriList: string; text: string } {
  const dt = e.dataTransfer!;
  return {
    files: Array.from(dt.files),            // sync
    uriList: dt.getData('text/uri-list'),   // sync
    text: dt.getData('text/plain')          // sync
  };
}
```

The `File` objects themselves survive the await — only the `DataTransfer` is
neutered.

### 4.2 Path acquisition ladder

1. **`webUtils.getPathForFile(file)`** → non-empty ⇒ done, zero I/O.
   VERIFIED on Electron 43.3.0 under gmux's exact
   `contextIsolation: true, nodeIntegration: false, sandbox: false`
   (`src/main/index.ts:120-125`): the path resolves when the `File` is passed
   directly, nested in an object, or inside an array; a JS-constructed `File`
   returns `""` (a clean discriminator, no throw); a directory drop resolves its
   path; two files at once both resolve. The folklore that contextBridge
   destroys a `File` is false for Electron 43 — `Blob` is a supported complex
   type. **Rule: never copy, wrap-and-unwrap, or `new File()` a dropped File
   before resolving it** — that is what actually broke for the people in
   electron#44600.
2. **`""`** (browser drag, synthetic File) → `await file.arrayBuffer()` →
   `gmux.dropFiles.persist({ name, mime, bytes })` → absolute path (§5).
3. **No files, but `text/uri-list` / `text/plain`** (dragging an `<img>` out of
   Chrome/Safari sometimes yields only a URL) → insert the URL verbatim. Do not
   build a downloader: agents fetch URLs themselves, and the renderer CSP
   (`src/renderer/index.html:7`, `default-src 'self'`) blocks renderer fetches
   anyway. *ASSUMED*: CDP could not faithfully synthesize a cross-app browser
   drag, so the exact payload Chrome hands us is untested. The ladder degrades
   safely either way.
4. **Directory drop** → path resolves but `file.arrayBuffer()` throws
   `NotFoundError` (VERIFIED). Do not sniff directories in the renderer: have
   main `stat()` the resolved path and branch — `isDirectory()` → the §6.1
   project-add flow, `isFile()` → insert a reference. This is the one place the
   folder feature and this feature share logic, and it belongs in main.

Preload addition (appended to the single typed bridge, guardrail 1):

```ts
import { contextBridge, ipcRenderer, webUtils } from 'electron';
// …
pathForFile: (file: File): string => {
  try { return webUtils.getPathForFile(file); } catch { return ''; }
},
```

`webUtils` is renderer-side only — it does not exist in main (electron#44982),
so this must live in the preload. Returning `''` on throw collapses the
error path into the existing no-path path.

### 4.3 Focus first

Per the BACKLOG, an unfocused pane accepts the drop and focuses itself first.
Order matters: `setActiveSession(id)` / select the leaf, `term.focus()`, *then*
paste. Pasting into an unfocused xterm still reaches the pty (paste does not
require DOM focus) but the user would not see the caret land, and for split
surfaces the focused-leaf highlight would lie.

### 4.4 Insertion

```ts
import { getTerminal } from '../terminal/registry';

async function insertReferences(sessionId: string, refs: string[], drop: AgentImageDrop) {
  const term = getTerminal(sessionId);
  if (!term) { toast('error', 'That session is not running'); return; }
  focusSession(sessionId); term.focus();
  for (const [i, ref] of refs.entries()) {
    if (i > 0) term.input(' ');                   // separator, fires onData
    if (drop.insert === 'type') term.input(ref);  // antigravity only
    else term.paste(ref);
    if (i < refs.length - 1) await delay(80);
  }
}
```

`Terminal.paste(data: string)` and `Terminal.input(data: string,
wasUserInput?: boolean)` are both public in `@xterm/xterm@6.0.0`
(`typings/xterm.d.ts:1275` and `:1025`) — VERIFIED in the installed copy. Both
fire `onData`, so `noteTerminalInput` runs (§1.5).

The `Terminal` instance is currently a `useRef` private to `TerminalPane`. Add
a small registry in the terminal feature and nothing else:

```ts
// src/renderer/terminal/registry.ts
const live = new Map<string, Terminal>();
export const registerTerminal = (id: string, t: Terminal) => { live.set(id, t); };
export const unregisterTerminal = (id: string) => { live.delete(id); };
export const getTerminal = (id: string) => live.get(id) ?? null;
```

Register right after `termRef.current = term`
(`src/renderer/terminal/TerminalPane.tsx:147`) and unregister in the cleanup
beside `termRef.current = null` (`:308`). Exited and restorable panes have no
`Terminal` — `getTerminal` returns `null` and the drop toasts instead of
silently doing nothing.

**Never reposition the cursor.** The agent's own line editor places the text;
bracketed paste mid-line was VERIFIED to insert exactly at the caret
(`look at[Image #3] [Image #4]  and tell me` after moving the cursor left 13
chars).

---

## 5. Files without a path — the drop store and temp-file policy

New, ~60 lines, main-side, mirroring `src/main/restore/snapshots.ts`:

```ts
// src/main/dropfiles/store.ts
export function droppedImagesDir(): string {
  return join(app.getPath('userData'), 'gmux', 'dropped-images'); // sibling of snapshots/
}
const MAX_BYTES     = 25 * 1024 * 1024;
const MAX_AGE_MS    = 7 * 24 * 3600_000;
const MAX_DIR_BYTES = 200 * 1024 * 1024;
```

- **`userData`, never `app.getPath('temp')`.** macOS purges `/var/folders` on
  its own schedule; a `path-text` agent may read the file minutes or hours
  later, and a resumed conversation may re-read it tomorrow. We own the
  lifetime, so we own the directory. This also matches the BACKLOG's own
  "temp file under userData".
- **Name:** `${Date.now()}-${randomUUID().slice(0,8)}-${sanitizedStem}${ext}`,
  mode `0o600`. Derive `ext` from **magic bytes**, not the claimed filename —
  agents sniff by extension, and a browser drag often supplies a junk name.
  Sanitize the stem to `[A-Za-z0-9._-]`, cap at 40 chars. This is also the
  escape hatch for the `\r`/`\n` filename case in §3.
- **Cleanup:** prune once at app ready and on a 24 h timer — delete files older
  than 7 days, then oldest-first until the directory is under 200 MB.
  **Never delete within the current session.** A `paste-path` agent reads the
  file when the chip is created, but a `path-text` agent may read it at submit
  time, and a resumed conversation may re-read it much later.
- **Reject early:** over `MAX_BYTES` → `gmuxError('DROP_TOO_LARGE')` → toast.

For the common case — a file dragged from Finder — **no file is written at
all**. The store exists only for pathless drops, ⌘V of raw image data, and the
newline-filename rescue.

---

## 6. ⌘V image paste

The BACKLOG requires "drag-drop and paste share one code path". They do, from
`referenceText()` down. Only acquisition differs, and it is *simpler*:

```
paste event (capture phase, on the surface root)
  → clipboardData.items has an image?    no → let xterm handle text paste
  → yes:
      agent.strategy === 'clipboard-attach' or 'paste-path' with clipboard support
         → term.input('\x16')       // the image is ALREADY on the pasteboard
      otherwise (path-text agents, shell panes)
         → persist bytes to the drop store → insert the path via §4.4
```

`0x16` with an image on the macOS pasteboard was VERIFIED to attach in
**claude, codex, qwen, muse, deepseek, antigravity** (plus opencode and
copilot). For ⌘V this is the whole feature: **zero Electron clipboard calls,
zero temp files, zero clobber**, because the user's own pasteboard already holds
exactly what the agent wants to read.

Implementation notes:

- Electron's Edit-menu `paste` role dispatches a DOM `paste` event to the
  focused element; xterm's helper textarea consumes it and pastes `text/plain`,
  ignoring image items. So gmux needs its own **capture-phase** `paste`
  listener on the surface root that inspects
  `e.clipboardData.items` / `.files`, and calls `preventDefault()` only when it
  finds an image. Text pastes must fall through untouched.
- This lands next to Phase 12 item 1's context-menu **Paste**. Both should call
  one exported `pasteIntoSession(sessionId)` so the menu item and ⌘V cannot
  diverge. Coordinate: item 1 owns the menu, item 8 owns the image branch.
- A pasteboard holding only a **file URL** (`«class furl»` — what a Finder
  *copy* produces) yields **nothing** in Claude Code (VERIFIED). Detect that
  case (`clipboardData` has a file with a path, no image data) and route it
  through the drop path instead of `0x16`.

---

## 7. Clipboard strategy verdict

**Ship `clipboard.writeImage()` — but only for `deepseek` and `antigravity`, and
only on the drop path.** Everywhere else it is strictly dominated.

Evidence for the narrow scope:

- Claude Code, Codex, Qwen, Muse all produce the *same* attachment from a
  bracket-pasted path (VERIFIED). Using the clipboard for them buys nothing and
  costs the user's pasteboard.
- deepseek and antigravity produce an attachment **only** via `0x16`
  (VERIFIED); their pasted paths stay literal. Without the clipboard route they
  are permanently second-class.
- Electron compatibility is proven:
  `clipboard.writeImage(nativeImage.createFromPath(p))` reports
  `formats: image/png` and lands on the macOS pasteboard as
  `«class PNGf», «class 8BPS», TIFF picture, …` — exactly the flavors the
  agents' `osascript` readers ask for. The full chain (Electron write →
  `0x16` written to a real attach-client pty → `[Attached image: …]` in
  deepseek, inserted between "before" and "after") was VERIFIED end to end.

Required guards, all of which are the reason this is a **Stage 2** item and not
Stage 1:

```ts
async function withImageOnClipboard(file: string, send: () => void) {
  const snap = {                       // best-effort, lossy by nature
    text: clipboard.readText(), html: clipboard.readHTML(),
    rtf: clipboard.readRTF(),  image: clipboard.readImage()
  };
  clipboard.writeImage(nativeImage.createFromPath(file));
  send();                              // term.input('\x16')
  await delay(2000);                   // agents shell out to osascript; do not race them
  if (sameImage(clipboard.readImage(), file)) restore(snap);  // only if still ours
}
```

- The 2 s delay exists because the agent reads the pasteboard *asynchronously*
  via `osascript` after receiving `0x16`; restoring at 250 ms risks yanking the
  image out from under it. **UNVERIFIED: the actual read latency.** Measure it
  before tuning this number down.
- Restore is **lossy and must be documented as such**: promised data, file URLs
  and custom flavors cannot be reconstructed. Only restore when the pasteboard
  still holds our image (the user may have copied something else in those 2 s).
- Antigravity additionally requires that no completion popup be open when
  `0x16` lands — never bracket-paste anything into it first.
- Give it an off switch: `GmuxSettings.clipboardImageAttach: boolean`
  (default **on**), and when off these two agents degrade to `path-text`. Some
  users will not tolerate any pasteboard write, and the honest answer is a
  toggle, not a debate.

If Stage 2 is cut for time, the feature still ships complete for 8 of 10
registry agents; deepseek and antigravity get a path they can read but not
attach.

---

## 8. Where the listeners go

### 8.1 xterm does not compete for the drop — verified

- `node_modules/@xterm/xterm/lib/xterm.js` vendors a `DragAndDropObserver` class
  and a `DRAG_*`/`DROP` `EventType` map, **but grep finds zero instantiations**
  and this session's grep of the bundle finds **0** `addEventListener("drag…")`
  and **0** `'drop'` registrations. xterm never listens for drags.
- The one element that would natively accept a drop — the helper textarea — is
  parked off-screen by xterm's own CSS (`left:-9999em; width:0; height:0;
  z-index:-5`) and can never be under the cursor.
- xterm selection is painted (WebGL/canvas) or an overlay div, never a DOM
  `Selection`, so a drag starting on selected terminal text cannot begin a
  native HTML5 drag, and a drop cannot disturb the selection.
- gmux's own pointer-DnD cannot interfere: during an OS drag Chromium dispatches
  only drag events (no `pointerdown`), so `armPointerDrag`
  (`src/renderer/app/split/pointer-drag.ts:45`) never arms; and
  `grep -rnE 'draggable=\{?' src/renderer` returns zero hits, so no gmux element
  initiates a native drag either.

### 8.2 Attach to the region container, via one router

Do **not** attach to the terminal element. Attach to the existing surface root
`.term-body.surface-root[data-surface-leaves]`, rendered in both branches of
`src/renderer/app/TerminalRegion.tsx` (`:851-865` split group, `:933-951`
single pane), each already mounting `<SplitDropOverlay rootRef={surfaceRootRef} />`
and each containing `[data-split-leaf]` children. Drag events bubble there from
the canvas layers.

**There is an existing conflict, and it contains a live bug.**
`useFolderDrop` (`src/renderer/app/App.tsx:587-639`) installs *window-level*
`dragenter/dragover/dragleave/drop` for the §6.1 folder-add feature:

```ts
// App.tsx:618 — the bug
const path = (file as unknown as { path?: string } | undefined)?.path;
```

`File.path` was removed in Electron 32. It is **always `undefined`**, so every
folder drop today silently falls through to `openProject()` (the picker). The
comment above it even says a preload `webUtils` bridge is needed — §4.2 is that
bridge, so **item 8 fixes §6.1 as a side effect**. Beyond the bug: its
`dragenter` counter arms the dashed folder overlay for *any* file drag, and its
window `drop` fires after a region handler unless that handler stops
propagation.

Replace both with one router that owns the window listeners and dispatches by
hit-test, so the folder overlay and the attach overlay can never both arm:

```ts
// src/renderer/app/dnd/file-drop.ts — THE window-level file-drop router
const overTerminal = (x: number, y: number) =>
  document.elementFromPoint(x, y)?.closest('[data-surface-leaves]') ?? null;

function onDragOver(e: DragEvent) {
  const types = Array.from(e.dataTransfer?.types ?? []);
  if (!types.includes('Files') && !types.includes('text/uri-list')) return;
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';          // required for the macOS copy cursor
  const root = overTerminal(e.clientX, e.clientY);
  if (root) { setFolderDrop(false); armAttachDrop(root, e.clientX, e.clientY); }
  else      { clearAttachDrop();    setFolderDrop(true); }
}
```

Reuse `rectContains` and the `[data-split-leaf]` scan from
`src/renderer/app/split/surface-dnd.ts:34-127` verbatim — same geometry, same
selectors — but arm a **new** layout field, not `splitDrop`:

```ts
// src/renderer/state/layout.ts, beside splitDrop (:77, :271, :279-291)
attachDrop: { leafId: string } | null;
setAttachDrop(zone: { leafId: string } | null): void;   // same identity guard
// clearDragUi() must clear it too (:296-301)
```

It cannot reuse `splitDrop` because the attach overlay covers the **whole
leaf**, not an armed half, and because `splitDrop` carries split-specific
constraints (`MAX_LEAVES`, min pane size) that must not gate a drop.

### 8.3 Two hardening items in main

- **Add a `will-navigate` guard.** `grep` finds none anywhere in `src/main/`.
  If any drop path misses `preventDefault()`, Chromium navigates the window to
  `file:///…` and the app is gone with no way back. Put it beside the existing
  `setWindowOpenHandler` (`src/main/index.ts:131`):

  ```ts
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) e.preventDefault();
  });
  ```

- **Directory branching belongs in main** (§4.2 step 4) — one `stat()`, two
  outcomes, no renderer-side guessing.

**CSP note:** `src/renderer/index.html:7` allows `img-src 'self' data:`. A
thumbnail in the drop overlay must be a `data:` URL — `URL.createObjectURL`
produces a `blob:` URL and will be blocked unless `blob:` is added to `img-src`.
Recommendation: skip the thumbnail in v1 and keep the CSP as it is.

---

## 9. UX spec

### 9.1 The overlay

Sibling of `.split-drop-zone` (`src/renderer/styles/app.css:1971-1978`), same
material, different geometry and different copy:

```css
/* Attach-drop overlay (item 8): the WHOLE target leaf, distinct copy. */
.attach-drop-zone {
  position: absolute;
  background: var(--drop-wash);              /* tokens.css:31 */
  border: 1px solid var(--accent);
  box-shadow: inset 0 0 24px var(--accent-wash);
  pointer-events: none;                      /* load-bearing: keeps elementFromPoint honest */
  z-index: 4;
  display: grid;
  place-items: center;
}
.attach-drop-label {
  font: var(--font-ui-sm);
  color: var(--accent);
  background: var(--bg-elevated);
  padding: 4px 10px;
  border-radius: 6px;
}
```

Rendered by a new `AttachDropOverlay` next to `SplitDropOverlay`, using the same
rect math as `SplitSurface.tsx:380-414` minus the edge halving.

- **Only the leaf under the pointer lights.** Non-focused panes light too — they
  accept the drop and focus themselves first.
- **Copy**, chosen from the target agent's strategy so the promise matches the
  outcome:
  - `paste-path` / `clipboard-attach` → **"Drop to attach"**
  - `path-text` (incl. every unverified agent) → **"Drop to insert path"**
  - non-image file, any agent → **"Drop to insert path"**
  - exited / restorable pane → **"Session not running"**, wash rendered in
    `--fg-muted` rather than accent, drop rejected with a toast.
- **Motion:** none. `.split-drop-zone` already snaps on and off with no
  transition (DESIGN.md §5, "never fade over a live terminal"). Matching it
  satisfies `prefers-reduced-motion` with no media query — just do not add a
  transition. Do not animate the label either.
- **Accessibility:** `aria-hidden="true"` on the overlay, like
  `SplitDropOverlay`; announce the *result* through the existing toast, which is
  already in the live region.

### 9.2 Multi-file

Multiple files insert space-separated references in drop order (§3, one paste
per file). Cap at a sane number — **8 files** — and toast
`"Only the first 8 files were attached"` beyond it, rather than typing a
paragraph into someone's prompt.

### 9.3 Toasts

Use the existing `useApp(s => s.toast)`. Success is silent for the common case
(the chip or path is visible proof); toast only when the outcome is not
self-evident or something failed:

| situation | toast |
| --- | --- |
| dropped on an exited/restorable pane | error — "Restart the session to attach files" |
| file over 25 MB | error — "That image is too large (25 MB max)" |
| filename contained a newline | info — "Copied to a safe filename before attaching" |
| clipboard route with the setting off | info — "Inserted the file path — <agent> attaches images only via the clipboard" |
| >8 files | info — as above |

---

## 10. Build order

1. **Preload `pathForFile` + `will-navigate` guard.** Ships the §6.1 folder-drop
   bugfix on its own; small, independently testable.
2. **Terminal registry + `insertReferences`** (§4.4) with `path-text` for
   everything. Verifiable with any agent.
3. **File-drop router + `attachDrop` + overlay** (§8, §9), replacing
   `useFolderDrop`.
4. **Registry `imageDrop` table + `paste-path`** (§2). 8 of 10 agents now
   attach.
5. **Drop store** (§5) for pathless drops.
6. **⌘V image paste** (§6), coordinated with item 1's context menu.
7. **Stage 2: `clipboard-attach`** (§7) with the setting and the guarded
   restore.

### Acceptance checks (all runnable by hand)

- Finder-drag a PNG onto a focused **claude** pane mid-sentence → `[Image #N]`
  appears **at the caret**, surrounding text intact, nothing submitted.
- Same onto **codex** with a spaced filename → `[Image #N]`, not literal text
  (this is the escaping regression test).
- Same onto a **shell** pane → a POSIX-quoted path at the prompt that
  round-trips through `ls`.
- Drop onto an **unfocused** split leaf → that leaf focuses, then attaches.
- Drop two files → two chips, space-separated, in drop order.
- Drop a **folder** on the terminal → project is added (not attached), and the
  §6.1 picker fallback never appears.
- Drag a file over the sidebar → folder overlay arms, attach overlay does not;
  drag over the terminal → the reverse. Never both.
- Drop a file with a `\n` in its name → safe copy attached, info toast.
- ⌘V with an image on the clipboard into claude → `[Image #N]`; ⌘V with text →
  ordinary text paste, unchanged.
- Drop onto an exited pane → error toast, no bytes written to any pty.
- Status-detector regression: attach an image, agent beeps → session does **not**
  flip to `needs_input` (proves `onData` was used, §1.5).

---

## 11. Risks

- **Agent TUIs change under us.** Every chip format here is a parser observation
  from 2026-08-10, not an API. Codex's one-path-per-paste matcher is the most
  brittle. Mitigation: the strategy table is data in one file, and every branch
  degrades to visible path text rather than to silence.
- **The 80 ms inter-paste gap is a guess.** Two files were verified; three or
  more, and whether an agent coalesces two bracketed runs arriving in one read,
  were not. If a multi-file drop ever produces one merged chip, raise the gap.
- **Clipboard restore is lossy and racy** (§7). This is why it is scoped to two
  agents, delayed 2 s, content-checked before restoring, and behind a setting.
- **Qwen writes temp copies** into `~/.qwen/tmp/clipboard/` and our drop store
  may hold another copy of the same bytes. Disk cost only; both prune.
- **`Session.agent` is typed narrower than reality.** If the widening in §2.1 is
  skipped, the strategy lookup silently falls to `path-text` for every non-claude
  /codex agent and the feature quietly under-delivers. Add a unit test that every
  `LAUNCHABLE_AGENT_IDS` entry resolves to a strategy.
- **pi's `extended-keys-format`.** pi warns
  `tmux extended-keys-format is xterm. Pi works best with csi-u`; gmux's
  `resources/gmux-tmux.conf:15` sets `extended-keys on` but never
  `set -g extended-keys-format csi-u`. Unrelated to this item, worth its own
  ticket.
- **Item 1 collision.** Context-menu Paste and this feature both want the paste
  path. Land one `pasteIntoSession()` or they will diverge.

---

## 12. What remains unverified

1. **gemini** — the whole strategy. Auth-blocked; inferred from upstream
   `clipboardUtils.ts` / `parsePastedPaths()` and from qwen (its fork) behaving
   exactly as that source predicts. Ships as `verified: false`.
2. **cursor** (`cursor-agent`) — blocked at the sign-in gate. Defaults to
   `path-text`.
3. **droid** — not installed on this machine. Defaults to `path-text`.
4. **amp** — exits immediately with "Unexpected error inside Amp CLI" here; not
   in the registry anyway.
5. **muse with spaced paths** — only space-free paths were tested, so its
   escaping tolerance is unknown. Backslash escaping is the safest guess.
6. **pi at submit time** — it inserts a plain path; whether it *reads* that path
   when the prompt is submitted was deliberately not tested (that would make the
   agent perform work).
7. **Whether any agent reads a `path-text` reference at all.** Same reason. In
   every agent tested, a typed path stays literal text in the composer; "type
   the path" is a safe universal fallback but is not an attach anywhere.
8. **Cross-app browser drags** (dragging an `<img>` out of Chrome/Safari into
   gmux) — CDP cannot synthesize them faithfully, so §4.2 step 3's exact payload
   is assumed.
9. **Clipboard read latency after `0x16`** — the 2 s restore delay in §7 is
   conservative, not measured.
10. **Three-or-more-file drops** and the 80 ms gap (§11).
11. **Windows/Linux** — everything here is macOS. `webUtils` and xterm are
    cross-platform; the pasteboard flavors and `osascript` readers are not.
