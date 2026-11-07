# Phase 359 — agents that can ask Tortie about itself and show you a file — build specification

Written from `/private/var/tmp/tortie-wt/wt-p359` on 2026-11-06. This report is the authoritative Phase 359 specification. It specifies production work but changes no production file, launches no Electron or agent, and touches no live Tortie, tmux, settings, or application data.

| | |
| --- | --- |
| Subject | `feat(agents): let a Tortie session use Tortie, through a sealed switch and a skill loaded for that one launch` |
| First body line | `Phase 359: agents that can ask Tortie about itself and show you a file` |
| Semver | **Minor**; one `Added` item under `## Unreleased`; no release, tag, archive, upload, or version bump in this phase |
| Lane | **Build**: Spec → Builder A → Builders B/C1/C2 in parallel → Integrate → Verify with two independent lenses → [one Fix → independent Reverify] → Commit |
| Tier | **3**. It changes launch/restore argv and pane environment, opens a local listener over session facts, and ships instructions agents discover. The verdict must name at least two independent methods, one an attack, and include a real-agent row for Claude Code, Pi, and omp (`docs/BACKLOG.md:44724`) |
| Menus | **No change.** No native menu row is added, renamed, removed, or reordered |
| User-visible surface | One switch on Settings → Agents, on this Mac’s page only |
| Public contract change | One sealed settings member, one `GMUX_*` pane environment name, one typed main→renderer event, one renderer→main completion invoke, and the versioned private-socket request/response contract in §2 |
| Probe obligation | `build/p359/probe-p359.mjs` reaches `build/electron-run.mjs`; raise `HELPER_USER_FLOOR` **181 → 182** (`build/assert-electron-teardown.mjs:584`) in the same commit |
| Banked research | Promote the git-ignored findings into `docs/research/144-agent-access-foundation.md`; do not leave the implementation dependent on `SCRATCH/` |

The charter is `docs/BACKLOG.md:44716-44760`. The measured delivery evidence is deliberately narrow: Claude Code 2.1.312, Pi 1.5.0, and omp 18.10.4 listed a launch-scoped skill in their own catalogs, but **no model prompt received it and no model followed it** (`SCRATCH/skill-injection-spike/RESULTS.md:5-19,26-44`). The phase therefore proves discovery, delivery composition, and callable operations without spending a model turn; it does not claim prompt inclusion or compliance (`docs/BACKLOG.md:44755-44757`).

---

## 1. Scope, invariants, and acceptance boundary

### 1.1 What Phase 359 adds

1. A global, off-by-default, sealed `agentAccess: boolean` setting.
2. A first-party bundled `tortie` skill, shipped outside the asar and injected only into launches of:
   - Claude Code: `--plugin-dir <Resources>/agent-skills/tortie`
   - Pi: `--skill <Resources>/agent-skills/tortie/skills/tortie`
   - omp: `--plugin-dir <Resources>/agent-skills/tortie`
3. A private Unix-domain socket at `<userData>/gmux/agent.sock`, exposed to eligible panes as `GMUX_AGENT_SOCKET`; the existing `GMUX_SESSION_ID` remains the caller identity field.
4. Four allowlisted operations through one dispatcher:
   - `capabilities`
   - `whoami`
   - `sessions`
   - `open`
5. A typed main→renderer handoff that switches to the containing project and emits the existing renderer-internal `gmux:open-file` request, followed by a typed renderer→main completion acknowledgment.

The source entry calls these “three read-only questions and opens a file”: `capabilities`, `whoami`, and `sessions` only read; `open` changes the visible UI but never a file, process, manifest row, status, or session (`docs/BACKLOG.md:44740-44741`).

### 1.2 Permanent invariants

- User-visible copy says **Tortie**. Existing durable names stay exact: `-L gmux`, `@gmux-*`, `GMUX_SESSION_ID`, `GMUX_MANAGED`, `<userData>/gmux/`, `window.gmux`, and the existing `gmux:*` renderer event remain unrenamed.
- No third-party code executes in Tortie. The skill is first-party Markdown/data. It declares no hook, MCP server, command bundle, or load-time script. The `/usr/bin/nc` client is a system executable the skill invokes only after the user asks the agent to act.
- Nothing is installed into personal or project skill folders. The bundle is passed by launch argument and is never copied into `~/.claude`, a repository, a context folder, or the existing user-managed skills system (`SCRATCH/agent-tortie-skills-IMPLEMENTATION-NOTES.md:11-19`; `docs/BACKLOG.md:44757`).
- No process starts merely because bytes in a configuration file changed. A valid sealed value can come only from the Settings surface; turning the switch on opens a listener in the already-running app, not another process. A forged or old-schema settings file cannot authorize delivery.
- No Apple Event is sent or received. The scratch sender required consent even as a direct child while the socket answered (`SCRATCH/automation-experiment/RESULTS.md:5-9,26-41`); `.sdef`/Apple Events are a later adapter.
- A session is addressed by immutable `GMUX_SESSION_ID`, never display name. The value is not a security token: another process under the same OS account can claim a known live id. This phase’s operations are read-only or show-only, and the skill states that threat model.
- No operation creates, restores, ends, removes, renames, focuses, types into, writes, or sets a status. `open` is editor source view only: no diff, Finder, preview, Settings navigation, or session navigation.
- No remote machine support. Delivery occurs only for a local pane; a remote agent receives neither the local socket path nor the bundle argument.
- The shell shim cap remains binding: no command or flag may start an agent (`docs/research/48-what-people-want.md:437-473`).

### 1.3 Acceptance boundary — what a passing phase may say

A passing phase may say:

> With Settings → Agents enabled, new local Claude Code, Pi, and omp launches receive Tortie’s bundled skill for that launch. The skill can query this Tortie process for capabilities, its claimed live session, and a bounded newest-first session list, and can ask Tortie to open a validated text file from an open local project at a line or first exact text match. Turning the switch off closes the door immediately; launch-scoped delivery is recomposed on later creates/restores and persisted nowhere.

It may **not** say the model saw, selected, obeyed, or automatically used the skill. Catalog presence is not prompt delivery (`SCRATCH/skill-injection-spike/RESULTS.md:11-19,26-33`). No model turn is an acceptance step.

---

## 2. Exact contracts and decisions

### 2.1 Shared source contract: `src/shared/agent-access.ts`

Builder A creates this file first. Every other builder imports it; nobody re-spells the operation list, limits, environment name, row projection, or wire union.

```ts
export const AGENT_ACCESS_PROTOCOL = 1 as const;
export const AGENT_ACCESS_SOCKET_ENV = 'GMUX_AGENT_SOCKET' as const;
export const AGENT_ACCESS_OPERATIONS = [
  'capabilities',
  'whoami',
  'sessions',
  'open'
] as const;
export type AgentAccessOperation = (typeof AGENT_ACCESS_OPERATIONS)[number];

export const AGENT_ACCESS_DELIVERY_AGENTS = ['claude', 'pi', 'omp'] as const;
export type AgentAccessDeliveryAgent =
  (typeof AGENT_ACCESS_DELIVERY_AGENTS)[number];

export const AGENT_ACCESS_MAX_REQUEST_BYTES = 64 * 1024;
export const AGENT_ACCESS_MAX_RESPONSE_BYTES = 256 * 1024;
export const AGENT_ACCESS_REQUEST_DEADLINE_MS = 2_000;
export const AGENT_ACCESS_MAX_SESSION_ROWS = 200;
export const AGENT_ACCESS_MAX_PATH_BYTES = 4_096;
export const AGENT_ACCESS_MAX_FIND_BYTES = 4_096;
```

`AgentAccessBaseRequest` is `{ version: 1; operation; session: string }`. `session` is 1–128 ASCII characters matching `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`; current UUID-shaped ids pass. The closed request union is:

```ts
export type AgentAccessRequest =
  | { version: 1; operation: 'capabilities'; session: string }
  | { version: 1; operation: 'whoami'; session: string }
  | { version: 1; operation: 'sessions'; session: string }
  | {
      version: 1;
      operation: 'open';
      session: string;
      pathBase64: string;
      line: number;
      endLine?: number;
    }
  | {
      version: 1;
      operation: 'open';
      session: string;
      pathBase64: string;
      findBase64: string;
    };
```

Rules:

- JSON member order is irrelevant; the hostile reordered-key control must succeed.
- Unknown members are refused as `bad-request`. The two `open` locator shapes are mutually exclusive and exhaustive: exactly `line` (with optional `endLine`) or exactly non-empty `findBase64`.
- `pathBase64` and `findBase64` are canonical standard Base64. Decode with fatal UTF-8 validation; refuse NUL, malformed Base64, over-bound decoded bytes, an empty path, or an empty find string.
- `line`/`endLine` are integers in `[1, 10_000_000]`; `endLine >= line`.
- One connection carries exactly one newline-terminated request. Bytes after the first newline may be ASCII whitespace only. A second request is `bad-request` and the connection closes.

The response union is one JSON line:

```ts
export type AgentAccessErrorCode =
  | 'disabled'
  | 'unknown-operation'
  | 'bad-request'
  | 'unavailable';

export type AgentAccessResponse =
  | {
      version: 1;
      ok: true;
      operation: AgentAccessOperation;
      value: AgentAccessOperationResult;
    }
  | {
      version: 1;
      ok: false;
      error: { code: AgentAccessErrorCode; message: string };
    };
```

No response echoes the raw request, find text, or rejected bytes.

### 2.2 Curated session view

The dispatcher never exposes manifest records, argv, resume argv, capture records, environment, conversation ids, terminal bytes, login names, or paths outside the project/session projection.

```ts
export interface AgentAccessProjectView {
  id: string;
  name: string;
  path: string;
}

export interface AgentAccessMachineView {
  id: string;       // 'local' for this Mac
  label: string;    // 'This Mac' for local; recorded machine label otherwise
}

export interface AgentAccessSessionView {
  id: string;
  name: string;
  agent: string;
  status: SessionStatus;
  phase: 'active' | 'finished';
  createdAt: number;
  project: AgentAccessProjectView | null;
  machine: AgentAccessMachineView;
}
```

`phase === 'finished'` exactly for `exited`, `restorable`, or `discarded`; all other existing statuses are `active`. This is only a projection and adds no `SessionStatus` member (`src/shared/types.ts:48-59,87-93`; the same finished set already exists in `src/main/capabilities.ts:190-202`).

Rows are sorted by `createdAt` descending, then `id` ascending, sliced to 200, and returned as `{ sessions, omitted }`. `whoami` accepts only a currently listed, local, Tortie-owned session with the claimed id and returns `{ session }`; otherwise the transport answer is `unavailable`. `sessions` also requires a currently listed local caller, then may project local and remote rows from the app’s current list.

### 2.3 Operation values

```ts
export interface AgentAccessCapabilitiesValue {
  protocol: 1;
  tortieVersion: string;
  enabled: true;
  operations: readonly ['capabilities', 'whoami', 'sessions', 'open'];
  deliveredTo: readonly ['claude', 'pi', 'omp'];
}

export interface AgentAccessWhoAmIValue {
  session: AgentAccessSessionView;
}

export interface AgentAccessSessionsValue {
  sessions: AgentAccessSessionView[];
  omitted: number;
}

export type AgentAccessOpenValue =
  | {
      state: 'opened';
      project: AgentAccessProjectView;
      path: string;
      selection: OpenFileSelection;
      matches?: number;
      chosen?: 1;
    }
  | { state: 'not-found'; matches: 0 }
  | {
      state: 'refused';
      reason:
        | 'no-project'
        | 'outside-projects'
        | 'missing'
        | 'not-file'
        | 'credential'
        | 'not-text'
        | 'too-large'
        | 'changed'
        | 'line-out-of-range'
        | 'renderer-unavailable';
    };
```

The implementation maps detailed filesystem/path-door exceptions into these closed reason words. It does not return errno, filesystem detail, or rejected path on a refusal.

### 2.4 `open` semantics

1. Decode the path and locator. The caller must be a live local session.
2. Read main’s current project rows from `GmuxCore.listProjects()` and keep only local rows (`machineId` absent or `local`).
3. Relative paths resolve only against the caller session’s current local project. Absolute paths are tried against local open projects in project-list order until one passes. This avoids an ambiguous relative path silently choosing another project.
4. For each candidate, use the existing filesystem authority in this order:
   - `resolveProjectRoot(project.path)` and `resolveInsideRoot(realRoot, input)` from `src/main/fs/paths.ts` (`:369-409,425-475,455-639`);
   - `answerPathDoor(resolved.abs, project.path)` from `src/main/fs/path-door.ts:287-336`;
   - accept only `door === 'editor'` **and** a present `underBase`. This second check keeps the path door’s regular-file, executable, bundle, mount, credential-name, and leaf-realpath decisions, and rejects a leaf symlink that escapes the project (`src/shared/path-doors.ts:52-133`).
5. Read the text through one extracted shared helper, `readTextCapped`, used by both `fs:readFile` and agent access. Existing reads are already capped at `READ_CAP_BYTES` and NUL-sniffed (`src/main/fs/ipc.ts:43-45,85-116`). Agent access uses strict options: reject before allocating when size exceeds `READ_CAP_BYTES`; compare the opened file’s dev/inode/size/mtime/ctime before/after; stat the path after the read and require the same identity/metadata. An atomic replace or in-place write during the read returns `changed`.
6. `line` locator:
   - valid through the file’s actual line count (`split('\n')`, so a final newline creates the final empty line);
   - selection `{ line, column: 0, endLine: endLine ?? line, endColumn: 0, highlight: true }`;
   - a line past the end returns `line-out-of-range` and sends no renderer event.
7. `find` locator:
   - exact, case-sensitive, non-overlapping UTF-16 `indexOf` matches over the bounded string;
   - count all matches, choose the first, and return only `matches` plus `chosen: 1`, never the search text;
   - convert offsets to the existing coordinate contract: lines 1-based, columns 0-based UTF-16, end exclusive (`src/renderer/state/open-file.ts:78-122`);
   - no match is `{ state: 'not-found', matches: 0 }`, not an error and not a renderer event.
8. Immediately before sending the renderer event, re-check the sealed switch and caller session. If the switch moved off while validation/read was in flight, answer `disabled` and send nothing.
9. Send one typed event to the ready main renderer. Never call `show`, `focus`, `restore`, `moveTop`, `app.focus`, or a native activation API.
10. Renderer behavior:
    - locate the exact project id in `useApp.getState().projects`;
    - if it differs, call the existing `setActiveProject` (`src/renderer/state/projects-slice.ts:68-74,195-203`), then emit the canonical `OpenFileRequest` on `gmux:open-file` (`src/renderer/state/open-file.ts:1-29`);
    - use `mode: 'file'`, `source: 'quickopen'`, `preview: false`, the validated absolute/relative/project paths, and the computed selection;
    - add optional `focus?: boolean` to `OpenFileRequest`; `shouldFocusFor` must return false when `focus === false` before applying its existing search rule (`src/renderer/editor/store.ts:475-483`). Set it true only when the window was already focused **and** the target project is the caller’s project. A cross-project open switches and opens but does not steal a terminal’s keyboard focus. A hidden/background Tortie stays hidden/background.
11. Renderer invokes `agent-access:openComplete` with `{ requestId, outcome: 'accepted' | 'project-missing' | 'failed' }`. Main accepts it only from the exact `webContents` sent the event and only for a pending id. A five-second timeout, destroyed renderer, wrong sender, or non-accepted outcome maps to `renderer-unavailable`.

The open acknowledgment means “the canonical editor open was accepted,” not “Monaco finished every asynchronous file/model read.” The live probe separately waits for and hashes the rendered model.

### 2.5 IPC domain for the renderer handoff

Builder C2 creates `src/shared/ipc/agent-access.ts` with:

- `EVT_AGENT_ACCESS_OPEN = 'agent-access:open'`
- event payload `[AgentAccessRendererOpen]`
- invoke map entry `'agent-access:openComplete'`
- `GmuxAgentAccessExtras`:

```ts
agentAccess: {
  onOpen(cb: (input: AgentAccessRendererOpen) => void): Unsubscribe;
  complete(input: AgentAccessOpenCompletion): Promise<void>;
}
```

`src/preload/agent-access.ts` implements only those two typed functions through the existing `on`/`invoke`. The integrator adds the domain once to the shared facade and once to the one preload assembly; no parallel bridge generation is allowed (`src/shared/ipc/index.ts:1-24`; `src/preload/index.ts:1-17`).

### 2.6 Socket ownership and framing

`src/main/agent-access/socket.ts` owns the socket; no other module calls `net.createServer` for this feature.

- Address: exactly `join(app.getPath('userData'), 'gmux', 'agent.sock')`.
- macOS `sun_path` guard: UTF-8 byte length must be **≤ 103**. A longer path is refused as unavailable and never truncated or hashed (`docs/BACKLOG.md:44740`). Delivery returns nothing for that launch because it cannot provide a truthful endpoint.
- Parent directory: create/narrow to `0700`.
- Socket: after `listen`, `chmod 0600`, then `lstat` and record `{dev, ino}`.
- Existing path:
  - non-socket: refuse; never unlink it;
  - live socket: refuse as another owner; never unlink it;
  - connect refusal consistent with stale socket: `lstat` again, require the same socket dev/inode, unlink that exact inode, then listen once;
  - no pattern deletion and no directory sweep.
- Shutdown/off: stop admission synchronously, destroy idle/partial sockets, await accepted dispatches for at most two seconds, then destroy remaining sockets. Unlink only when the path is still the exact dev/inode this service created.
- A single serialized reconciliation queue owns on/off races. Latest requested state wins; two starts cannot own two listeners.
- Absolute request deadline: two seconds from accept and **not reset by bytes**. A slowloris cannot keep the app open.
- Read at most 64 KiB plus one sentinel byte. On overflow, answer `bad-request`, end, and never parse.
- Serialize the response, assert ≤ 256 KiB, write one line, and end.
- `socket.ts` parses framing only. `dispatch.ts` validates the object, checks the switch before lookup and again before returning/side effects, and looks up the operation in one exhaustive `satisfies` registry. `facts.ts` owns only the curated session/capability projections.

Lifecycle API exported from C1:

```ts
installAgentAccess(deps: AgentAccessDeps): void;
reconcileAgentAccess(enabled: boolean): void;
beginAgentAccessShutdown(): void;
joinAgentAccess(): Promise<{
  accepted: number;
  joined: boolean;
  waitedMs: number;
}>;
```

The integrator installs it once in `installMainCapabilities`, subscribes once to `onSettingsUpdated`, and starts from `getSettings().agentAccess`. `disposeMainCapabilities()` calls `beginAgentAccessShutdown()` on its synchronous first lines and awaits `joinAgentAccess()` before `shutdownGmuxCore()`, because accepted operations read the core. The disposer logs counts/timing only.

### 2.7 Logging

Exactly one structured line per completed/refused request at scope `agent-access`:

```text
agent access request finished
{ operation, outcome, durationMs }
```

`operation` is one closed operation or `unknown`; `outcome` is the success state/error code/reason word. No session id, request bytes, path, project, session name, machine label, find text, response body, or error `.message` is logged. Listener lifecycle lines carry state/counts only and no socket path.

### 2.8 Sealed setting

Use the existing seal, not a sibling:

```ts
export interface GmuxSettings {
  agentAccess: boolean;
  // existing members unchanged
}

export interface DangerState {
  agentAccess: boolean;
  // existing members unchanged
}
```

Required changes in `src/main/settings/store.ts`:

- `defaultGmuxSettings().agentAccess = false` (`src/shared/settings.ts:834-865`).
- `sanitizeSettings`: only literal `true` survives as true; everything else false.
- `EMPTY_DANGER_STATE.agentAccess = false`.
- `dangerStateOf(settings).agentAccess = settings.agentAccess`.
- `isDangerStateEmpty` includes `state.agentAccess === false`; omitting this clause is a complete bypass because the common path skips opening the seal (`src/main/settings/store.ts:337-360`).
- `openDangerSeal` reads literal `true`, else false. A seal produced before Phase 359 has no member, still opens, and covers **no** access permission, exactly like older `arch`/`envShared` seals fail safe (`src/main/settings/store.ts:824-860`).
- `withSealedDangerState` sets `agentAccess: settings.agentAccess && sealed.agentAccess === true`; rejection is named `agentAccess`, with no payload.
- When `safeStorage` is unavailable, the existing write path strips all uncovered danger state before writing (`src/main/settings/store.ts:1340-1360`), so the switch returns to off rather than lying.
- The generic settings IPC/update/watch path remains the one path: `settings:set` persists and broadcasts (`src/main/settings/ipc.ts:126-151`); renderer `watchSettings()` loads once and subscribes for the window lifetime (`src/renderer/settings/settings-store.ts:270-305`). No new settings IPC channel.

Settings copy, exact:

- Label/accessible name: **Allow agents to use Tortie**
- One-line note: **New Claude Code, Pi, and omp sessions get Tortie’s skill; a session already running keeps what it started with.**

Draw it on this Mac’s Agents page, after the installed-agent card and before `ConfiguredAgents`; never on a remote-machine page (`src/renderer/settings/AgentsSection.tsx:139-204`). Use the existing `Switch`, normal rather than danger styling. A click calls `useSettingsStore.getState().update({ agentAccess: next })`; the returned sealed setting is authoritative, so a failed seal visibly returns the switch to off.

“Older seal replay” in this phase means a valid pre-359 seal that lacks `agentAccess`; it must not authorize the new field. The existing danger seal is not an anti-replay counter. Replaying a valid Phase-359-era seal that itself covered `agentAccess: true` remains an inherited same-machine settings limitation and is stated in §8 rather than falsely claimed fixed.

### 2.9 Bundled skill and resource contract

Exact source tree:

```text
resources/agent-skills/tortie/
  .claude-plugin/plugin.json
  .cursor-plugin/plugin.json
  skills/tortie/SKILL.md
  skills/tortie/references/use-tortie.md
  skills/tortie/references/limits.md
```

The second manifest preserves the measured spike fixture shape used by omp; Cursor Agent is not passed this directory and is not supported. Both manifests are data with exactly `name`, `version`, and `description`; they contain no hooks, MCP servers, commands, scripts, executable path, URL, or contribution registry. `name` is `tortie-agent-access`; `version` is `1.0.0`; description is one plain sentence.

`SKILL.md` frontmatter:

```yaml
---
name: tortie
description: Use Tortie’s local session door to identify this session, list Tortie sessions, or open a validated project file when the user asks.
---
```

Its body is a short table of contents into the two references. It must say:

- a how-to question is not authorization;
- first offer, in substance, “I can do that in Tortie now, or explain how. Which would you prefer?”, and wait;
- an explicit imperative to open is authorization for this show-only operation;
- never invent or offer unsupported lifecycle/write/session-focus actions;
- calls are local to this Mac, identity is same-user claimed, and no request content should be repeated into logs.

The references name the exact one-line client form, using only canonical Base64, the existing safe session id, fixed JSON, and macOS system tools:

```sh
printf '{"version":1,"operation":"whoami","session":"%s"}\n' \
  "$GMUX_SESSION_ID" | /usr/bin/nc -w 2 -U "$GMUX_AGENT_SOCKET"
```

`sessions`/`capabilities` differ only in the fixed operation word. `open` encodes dynamic path/text with `/usr/bin/base64` and substitutes only Base64 plus the validated session id; it never interpolates raw path or search text into JSON. The reference documents line and exact-text forms, result states, and the four transport errors.

`electron-builder.yml` copies `resources/agent-skills` to `Contents/Resources/agent-skills`. The resolver follows the existing packaged/development resource pattern (`src/main/skills/resolve.ts:166-191`): packaged builds use `process.resourcesPath` only; development may use `app.getAppPath()` then `process.cwd()` fallbacks. The packaged resolver never reaches the source checkout.

`build/assert-agent-skills.cjs`, called from `build/after-pack.cjs`, must byte-compare the packaged five-file allowlist with source, reject extra entries/symlinks/executable bits, parse both manifests, and fail on any prohibited manifest key. A package that omitted the bundle is red before signing, following the existing packaged-resource precedent in `electron-builder.yml:302-349` and `build/after-pack.cjs:1-35,74-105`.

### 2.10 Delivery composition and persistence rule

`src/main/agent-access/delivery.ts` exports:

```ts
export interface AgentAccessDelivery {
  argv: string[];
  env: Record<'GMUX_AGENT_SOCKET', string>;
}

export function agentAccessDelivery(
  agent: LaunchableAgentKind,
  enabled: boolean,
  socketPath: string
): AgentAccessDelivery | null;

export function applyAgentAccessArgv(
  argv: readonly string[],
  capture: SpecstoryCaptureRecord | undefined,
  delivery: AgentAccessDelivery | null
): string[];
```

Rules:

- Return null unless enabled, local, socket path valid, bundle complete, and agent exactly Claude Code/Pi/omp.
- Append the measured pair after existing agent args; preserve every existing byte/order. If the exact pair is already present, do not duplicate it. Other user plugin/skill flags remain.
- If `argv` is SpecStory-wrapped, use `isWrappedArgv`/`unwrapArgv`, append to the inner argv, then `wrapWithRecord(capture, inner)`; do not append to the outer SpecStory argv. If the rewrap unexpectedly fails, keep the original argv and return no delivery rather than breaking the launch. `wrapWithRecord` is the existing recorded-wrapper authority (`src/main/specstory/capture.ts:568-599`); captured rows otherwise hide the agent inside `-c` (`src/main/sessions/launch-plan.ts:269-293`).
- Return copies; never modify `spec.argv`, `rec.argv`, `resumeArgv`, `specstory.agentArgv`, a manifest record, or registry fields.
- `GMUX_AGENT_SOCKET` is merged **after** `paneEnvFor`, so it cannot be displaced by a configured row. Existing `GMUX_SESSION_ID`/`GMUX_MANAGED` remain produced by `paneEnvFor` and unchanged (`src/main/sessions/launch-plan.ts:309-368`).
- The registry confirm hash does not move: no registry/config execution field changes. `conformance:agents` must prove it.

Call sites:

1. `create-local.ts`: after `spawnArgvFor`, compose delivery from the current sealed setting; pass delivered argv to `tmux.createSession`, and merge env after `paneEnvFor`. The manifest continues to receive the pre-delivery `spec`/record (`src/main/sessions/create-local.ts:620-665,688-718`).
2. `restore.ts`: the new pane’s env is based on the current sealed setting. Before `buildArmedCommand`, apply delivery to `armable.argv`; never alter the record. Restore already re-resolves ephemeral environment at each new pane and types, rather than executes, the resume command (`src/main/restore/restore.ts:1046-1094,1177-1200`).
3. `resume-in-place.ts`: current sealed setting must be true **and** the retained pane’s recorded environment must already contain `GMUX_AGENT_SOCKET` equal to the current profile’s exact socket path. This keeps a session started before enablement byte-identical even if its agent later exits. Apply current bundle argv to `armableResume(rec)` only after that eligibility check (`src/main/sessions/resume-in-place.ts:1011-1048`).

A retained live process is never mutated. Turning off closes the socket immediately, but cannot remove skill instructions an already-running agent loaded. A later restore creates a new pane and follows the current switch. A later in-place restart follows the pane’s original access eligibility plus the current switch.

---

## 3. Four builders and one integrator — disjoint ownership

The workflow rule is one writer per file (`docs/method/HOW-WE-VERIFY-THIS.md:12-43`). Builder A lands the shared contract first. After A returns, B, C1, and C2 run in parallel. No builder edits an integrator file, and no file appears in two lists.

### Builder A — contract, sealed setting, Settings UI

Owned files only:

- `src/shared/agent-access.ts` **new**
- `src/shared/settings.ts`
- `src/main/settings/store.ts`
- `src/renderer/settings/AgentAccessSetting.tsx` **new**
- `src/renderer/settings/AgentsSection.tsx`
- `src/shared/__tests__/p359-agent-access-contract.test.ts` **new**
- `src/main/settings/__tests__/p359-agent-access-seal.test.ts` **new**
- `src/renderer/settings/__tests__/p359-agent-access-setting.test.tsx` **new**

Required tests:

- default/sanitizer/patch/watch shape;
- only-agentAccess danger state reaches the seal (the `isDangerStateEmpty` bypass ablation);
- pre-359 seal opens but covers false;
- forged/truncated/wrong-machine/missing seal with file true reads false;
- safeStorage unavailable strips false on write and broadcasts false;
- direct file and rename-over fixtures fail closed after cache reset/new store process;
- UI exact copy, accessible switch, this-Mac-only placement, optimistic update corrected by main response, live `onSettingsChanged` update.

Builder command:

```sh
npm run typecheck
npm test -- --run src/shared/__tests__/p359-agent-access-contract.test.ts \
  src/main/settings/__tests__/p359-agent-access-seal.test.ts \
  src/renderer/settings/__tests__/p359-agent-access-setting.test.tsx
```

### Builder B — first-party bundle and launch/restore delivery

Owned files only:

- `resources/agent-skills/tortie/.claude-plugin/plugin.json` **new**
- `resources/agent-skills/tortie/.cursor-plugin/plugin.json` **new**
- `resources/agent-skills/tortie/skills/tortie/SKILL.md` **new**
- `resources/agent-skills/tortie/skills/tortie/references/use-tortie.md` **new**
- `resources/agent-skills/tortie/skills/tortie/references/limits.md` **new**
- `src/main/agent-access/delivery.ts` **new**
- `src/main/agent-access/__tests__/p359-delivery.test.ts` **new**
- `src/main/sessions/create-local.ts`
- `src/main/sessions/resume-in-place.ts`
- `src/main/sessions/__tests__/p359-agent-access-create.test.ts` **new**
- `src/main/sessions/__tests__/p359-agent-access-restart.test.ts` **new**
- `src/main/restore/restore.ts`
- `src/main/restore/__tests__/p359-agent-access-restore.test.ts` **new**

Required tests:

- exact supported set/pairs and null for shell plus the other ten launchable ids;
- off is byte-identical argv/env for all thirteen launchable rows;
- additive existing flags, no duplicate exact pair, paths with spaces;
- Claude/Pi/omp captured wrapper has the pair inside and nowhere outside;
- fresh create stores no injected argv/env in the manifest record;
- restore uses current bundle/current switch and leaves record byte-identical;
- retained restart requires original pane env and current switch;
- pre-enable retained session receives nothing after switch-on;
- remote rows receive nothing;
- missing resource/overlong socket preserves the original launch and logs no argv/path.

Builder command:

```sh
npm run typecheck
npm test -- --run \
  src/main/agent-access/__tests__/p359-delivery.test.ts \
  src/main/sessions/__tests__/p359-agent-access-create.test.ts \
  src/main/sessions/__tests__/p359-agent-access-restart.test.ts \
  src/main/restore/__tests__/p359-agent-access-restore.test.ts
```

### Builder C1 — private socket, dispatcher, read-only facts

Owned files only:

- `src/main/agent-access/socket.ts` **new**
- `src/main/agent-access/dispatch.ts` **new**
- `src/main/agent-access/facts.ts` **new**
- `src/main/agent-access/service.ts` **new**
- `src/main/agent-access/__tests__/p359-socket.test.ts` **new**
- `src/main/agent-access/__tests__/p359-dispatch.test.ts` **new**
- `src/main/agent-access/__tests__/p359-facts.test.ts` **new**

C1 imports C2’s open operation only through an injected `AgentAccessOpenHandler` type from the shared contract; it does not edit C2 files or choose filesystem/UI policy.

Required tests:

- real scratch Unix socket mode/parent mode, one request per connection, arbitrary chunk boundaries, reordered JSON keys, absolute deadline, request/response caps;
- live socket vs stale socket vs foreign regular file/symlink; inode-safe cleanup; two sequential starts and on/off/start races;
- switch checked before dispatch and again before result;
- closed operation registry and exact transport codes;
- fake/nonlocal/gone caller refusal;
- newest-first/tie ordering, 200 cap/omitted, finished projection, local/remote machine projection;
- one log per request with canary session/path/find/name absent.

Builder command:

```sh
npm run typecheck
npm test -- --run \
  src/main/agent-access/__tests__/p359-socket.test.ts \
  src/main/agent-access/__tests__/p359-dispatch.test.ts \
  src/main/agent-access/__tests__/p359-facts.test.ts
```

### Builder C2 — validated open, stable bounded read, typed renderer arrival

Owned files only:

- `src/shared/ipc/agent-access.ts` **new**
- `src/preload/agent-access.ts` **new**
- `src/main/fs/read-text.ts` **new**
- `src/main/fs/ipc.ts`
- `src/main/agent-access/open.ts` **new**
- `src/main/agent-access/open-broker.ts` **new**
- `src/main/agent-access/open-ipc.ts` **new**
- `src/main/harness/agent-access-open.ts` **new**
- `src/renderer/state/agent-access-open.ts` **new**
- `src/renderer/state/open-file.ts`
- `src/renderer/state/subscriptions.ts`
- `src/renderer/editor/store.ts`
- `src/main/agent-access/__tests__/p359-open.test.ts` **new**
- `src/main/agent-access/__tests__/p359-open-broker.test.ts` **new**
- `src/main/fs/__tests__/p359-stable-read.test.ts` **new**
- `src/renderer/state/__tests__/p359-agent-access-open.test.ts` **new**
- `src/renderer/editor/__tests__/p359-agent-open-focus.test.ts` **new**

The harness seam exists only to deterministically pause the strict read after its first chunk for the live replacement race. It is armed only when `GMUX_SMOKE === 'agentaccess'`, the launch is isolated, `GMUX_HARNESS_DIR` is present, and the profile/checkpoint paths resolve under that directory. It starts no process and reads/writes only the fixed harness checkpoint files. Outside that exact shape it is a no-op; the conformance gate drives both refusal and honest arm.

Required tests:

- full path/open hostile matrix from §6.3;
- `resolveInsideRoot` plus path-door `editor`/`underBase` are both required;
- credential, executable, image/PDF/Mac door, directory, missing, symlink escape, project-root, relative climb refusals;
- strict oversize pre-read refusal, binary NUL, atomic replacement, in-place change;
- line/end-line coordinate conversion and out-of-range;
- exact find count/first range, CRLF, multi-line text, emoji/UTF-16 column, 0 and 300 matches;
- broker wrong sender/duplicate/timeout/destroyed renderer;
- renderer switches exact project, emits canonical request, sends completion, and honors focus false for background/cross-project.

Builder command:

```sh
npm run typecheck
npm test -- --run \
  src/main/agent-access/__tests__/p359-open.test.ts \
  src/main/agent-access/__tests__/p359-open-broker.test.ts \
  src/main/fs/__tests__/p359-stable-read.test.ts \
  src/renderer/state/__tests__/p359-agent-access-open.test.ts \
  src/renderer/editor/__tests__/p359-agent-open-focus.test.ts
```

### Integrator — composition, packaging, executable gates/probes, docs

Owned files only:

- `src/main/capabilities.ts`
- `src/shared/ipc/index.ts`
- `src/preload/index.ts`
- `electron-builder.yml`
- `build/after-pack.cjs`
- `build/assert-agent-skills.cjs` **new**
- `build/conformance-agent-access.mjs` **new**
- `build/ablation-p359.mjs` **new**
- `build/p359/probe-p359.mjs` **new**
- all other new files under `build/p359/**`
- `build/assert-electron-teardown.mjs` (floor 181 → 182)
- `build/background-fixtures.mjs` only if the new probe introduces a scanner-discovered starter shape
- `build/verification-checks.mjs` only if classification needs the new scripts named
- `package.json`
- `docs/audits/contract-baseline.txt`
- `docs/research/144-agent-access-foundation.md` **new**
- `CLAUDE.md`
- `CHANGELOG.md`
- `docs/BACKLOG.md` (append §As built and, after the phase commit exists, the newest-last running-log line; do not reorder)

Integration duties:

- fold the C2 domain once into `GmuxInvokeChannelMap`, `AllEventPayloadMap`, and `InstalledGmuxApi`;
- assemble preload `agentAccess` once;
- instantiate/register the broker and service in `installMainCapabilities`, subscribe/unsubscribe settings, and place synchronous shutdown/join in the ordered disposer before core shutdown;
- add the resource packaging assertion and extraResources row;
- add npm scripts:
  - `conformance:agentaccess`
  - `ablation:p359`
  - `probe:p359`
- regenerate the contract inventory on purpose. The body names the added `GMUX_AGENT_SOCKET`, `agent-access:open`, and `agent-access:openComplete` lines and any inventory-count movement; no baseline drift is silent.
- add the CLAUDE path-trigger row in §5.2.

No builder or integrator commits.

---

## 4. Integration sequence and seam checks

1. Run Builder A first. Review only its owned diff; ensure `src/shared/agent-access.ts` is the sole public spelling.
2. Run B, C1, and C2 concurrently after A. They may import A’s file but may not edit it.
3. Integrator scans the combined tree for:
   - duplicate constants/operation unions/finished-status sets longer than a one-line import;
   - duplicate resource resolvers;
   - duplicate JSON framing;
   - a second preload bridge or direct `ipcRenderer` use;
   - any production path importing from `SCRATCH/` or `build/p359/`;
   - any delivery byte written to manifest/session records;
   - any logger argument reaching request/response/path/find/session/project data.
4. Integrator wires main/preload/shared compositions and runs targeted tests before touching docs/baseline.
5. Build/package, run `build/assert-agent-skills.cjs` on the actual `.app`, then regenerate contract baseline.
6. Write `docs/research/144-agent-access-foundation.md` self-contained. It records:
   - the exact versions and measured catalog routes;
   - catalog presence vs prompt-delivery limitation;
   - Apple Events refusal/private-socket evidence;
   - fence/protocol method and no-fork/no-network boundaries;
   - unsupported rows and open research.
7. CHANGELOG `Added` item in operator style, one or two sentences, user outcome and limit, no build/gate/file names. The phase commit cannot link itself; the normal follow-up docs commit adds the commit link and running-log line.

---

## 5. Tests, conformance gate, ablations, and commands

### 5.1 `conformance:agentaccess`

`build/conformance-agent-access.mjs` runs under plain Node plus the pinned TypeScript runner. No Electron, tmux, vendor agent, network, token, home directory, or live app. It may create one scratch Unix socket and scratch files, all removed in `finally`.

It must drive, not merely grep, these rules:

| Rule | Proof |
| --- | --- |
| A1 | `agentAccess` defaults false, is a literal boolean, and only true with a covering current seal; old-schema seal covers false |
| A2 | the common no-danger shortcut asks `agentAccess`; safeStorage-unavailable write strips it |
| A3 | exact UI label/note/support rows and this-Mac-only placement |
| D1 | one delivery support set: Claude/Pi/omp, exact pairs, every other launchable row null |
| D2 | disabled composition is byte-identical for all thirteen registry rows; confirm hash unchanged |
| D3 | create/restore/restart call the one helper; manifest/registry/resume records never receive its result |
| D4 | captured argv pair is inside SpecStory `-c`, once; existing flags remain in order |
| D5 | retained restart requires the original exact socket env plus current switch |
| R1 | exact five resource files, exact manifest keys, no hook/MCP/commands/scripts/executable bits/symlinks |
| R2 | packaged resolver uses `process.resourcesPath`; package assertion is called by `afterPack` |
| S1 | exact socket location/103-byte refusal/0700 parent/0600 socket/inode-safe stale cleanup |
| S2 | one-request JSON-line framing, caps, absolute deadline, key-order independence |
| S3 | dispatch registry equals the four shared operations and checks enabled twice |
| S4 | fake/gone/remote caller cannot reach an operation; same-user claimed-id limitation remains explicit |
| F1 | curated fields only; newest-first/tie order; 200 cap; finished set exact |
| O1 | open calls both containment and path door, requires editor+underBase, uses local open projects only |
| O2 | open calls the strict shared bounded read; no second copy of the read loop |
| O3 | line/find rules and response/refusal closed sets match shared contract |
| O4 | typed event+completion are registered/exposed once; completion sender is checked |
| O5 | no show/focus/activate API in main; renderer focus predicate includes `focus === false` |
| L1 | request logs carry only operation/outcome/duration; AST/dataflow canaries for every payload field are rejected |
| H1 | read-race seam is unreachable outside isolated `GMUX_SMOKE=agentaccess` and its harness root |
| C1 | contract inventory includes the deliberate channel/env additions and no unrelated schema/storage/smoke movement |

Every rule is asked again against an in-memory or scratch copy with its clause broken; a control copy remains green. This is the gate’s own self-proof, not a substitute for the independent verifier attack.

Add this CLAUDE.md path-trigger row:

| Touching | Add | Cost | What it proves |
| --- | --- | --- | --- |
| `src/shared/agent-access.ts`, `src/main/agent-access/**`, `resources/agent-skills/**`, `agentAccess` in `src/shared/settings.ts`/`src/main/settings/store.ts`/`src/renderer/settings/**`, Phase 359’s create/restore/restart call sites, `src/shared/ipc/agent-access.ts`, `src/preload/agent-access.ts`, and the renderer arrival/focus files | `conformance:agentaccess` | ~2–4 s; no Electron, tmux, network, agent or token; one scratch Unix socket | The sealed permission, three-row launch delivery, persisted-nowhere rule, packaged first-party resource shape, bounded private socket, curated operations, validated editor-only open, payload-free logs, and harness-only race seam; `ablation:p359` is the attack beside it |

### 5.2 `ablation:p359`

`build/ablation-p359.mjs` makes a `cp -Rc` clone under phase scratch, applies one mutation at a time, runs `conformance:agentaccess`, and restores/removes in `finally`. At minimum these arms must each turn red on their owning rule while a control stays green:

1. remove `agentAccess` from `isDangerStateEmpty`;
2. default old seal field to true;
3. keep file true when sealed false;
4. keep true when sealing unavailable;
5. add Codex to delivery set;
6. change one delivery flag/path;
7. persist the delivered pair into a record;
8. put a captured pair outside the wrapper;
9. let retained pre-enable pane receive restart delivery;
10. let a remote row receive delivery;
11. add a hook or command key to a plugin manifest;
12. omit a packaged skill file;
13. truncate overlong socket path;
14. unlink a non-socket/stale replacement;
15. make request deadline sliding;
16. accept a second request on one connection;
17. remove the second enabled check;
18. accept a fake caller;
19. expose `argv` or `agentSessionId` in a session view;
20. remove newest-first order or cap;
21. omit `resolveInsideRoot`;
22. omit path-door `underBase` check;
23. let strict open read truncate an oversized file;
24. omit post-read identity check;
25. make find case-insensitive or overlapping;
26. send an open event on not-found/out-of-range;
27. accept completion from a wrong renderer;
28. call `show()`/`focus()` or force editor focus for cross-project/background;
29. log session/path/find/request bytes;
30. arm the race seam outside the isolated smoke shape;
31. remove the resource assertion from `afterPack`;
32. delete the contract baseline’s new environment/channel line.

### 5.3 Required gate commands

Builder-local commands are in §3. The integrator runs, in this order, preserving complete output:

```sh
npm run typecheck
npm test
npm run conformance:agentaccess
npm run ablation:p359
npm run conformance:agents
npm run conformance:context
npm run conformance:resume:capture
npm run conformance:pathdoors
npm run conformance:containment
npm run conformance:save
npm run conformance:redline
node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt
npm run gate:contract
npm run build
npm run smoke:t1
npm run smoke:t3
npm run package:dir
npm run package
```

Then run `node build/assert-agent-skills.cjs <package:dir .app>` explicitly and record its PASS line even though `afterPack` already ran it. `npm run build` also carries the structural Electron/background/check/simulator/docker/known-hosts/only-add/contract gates described in CLAUDE.md. `conformance:resume` is not run: Phase 359’s charter explicitly spends no model turn and names `conformance:resume:capture` as its restore gate (`docs/BACKLOG.md:44745-44756`).

The verifier reruns the battery once, not repeatedly; additional time goes to independent evidence (`CLAUDE.md`, “THE GOVERNING RULE”; `docs/method/HOW-WE-VERIFY-THIS.md:125-133`).

---

## 6. Tier-3 verification — run rather than read

Two independent verifier lenses are required. Neither verifier may be a builder/integrator/fixer. A verifier that only reads code or reruns builder checks is `needs_work`.

Verdict schema:

```json
{
  "verdict": "pass | needs_work",
  "independentMethods": ["real-agent matrix", "attack", "outside-app re-derivation"],
  "evidence": ["specific command/output/artifact/result"],
  "problems": ["specific failed claim"],
  "whatIsNotTrue": ["limits and unproved claims"]
}
```

A null/empty verdict is `needs_work`. One fix round only; an independent reverifier reruns every failed live item and everything the fix touched. A second `needs_work` stops and goes to the operator (`docs/method/HOW-WE-VERIFY-THIS.md:35-43`).

### 6.1 Verifier lens 1 — real-agent delivery/lifecycle matrix

**Independent methods:** real data across every claimed provider; re-derive actual pane process argv/env from outside Tortie rather than trusting its report.

Safety setup:

- One short phase scratch root, profile, `HOME`, `ZDOTDIR`, `TMPDIR`, and scratch tmux socket; never `-L gmux` except the helper’s read-only census.
- Closed PATH containing wrapper names for exactly Claude Code, Pi, and omp. Each wrapper `exec`s the installed real CLI under the committed no-network/no-fork/read-write fence adapted from the scratch method (`SCRATCH/agent-tortie-skills-IMPLEMENTATION-NOTES.md:48-60`). No inherited config, credential, keychain, agent store, or personal skill directory is readable. omp’s catalog arm may use only the documented fixed fake key and denied network.
- Hide all other registry rows and read `agents:list` back before any session. A real path outside the run makes the result UNREADABLE, never pass.
- No prompt/model turn. End every real agent and child by recorded pid/start-time/command, never name/pattern.

For each of Claude Code, Pi, and omp, record version and fill every cell:

| Cell | Required evidence |
| --- | --- |
| OFF fresh create | Real Tortie create path; external process-table/tmux-env read shows no delivery pair and no `GMUX_AGENT_SOCKET`; composed argv/env sha256 equals parent/off fixture |
| ON fresh create | Exact measured pair/path appears once, user control skill remains listed, pane has exact socket plus existing session id |
| Catalog control/treatment/missing | Re-run that agent’s measured catalog protocol with Tortie’s exact pair; Tortie skill name+description appears only treatment, the planted personal scratch skill remains in control+treatment, missing path omits Tortie skill |
| Captured create | If the registry/SpecStory provider supports the row, external argv shows the pair inside the inner `-c` command and not outside; no-cloud capture; unsupported provider is a named row failure unless the unit/gate establishes the registry cannot request it |
| Retained relaunch | Quit app through helper while tmux/agent stays; socket disappears; call fails within two seconds; relaunch same profile; same process pid reconnects through same path without restart |
| Restore | Kill only the scratch tmux server, relaunch, restore through Tortie, inspect the pretyped command, press Enter once (no prompt), and prove exact current delivery pair and socket env on the recreated pane |
| Retained restart | Original ON pane whose agent ended receives pair again while switch remains on; original OFF pane toggled on receives neither pair nor socket on resume-in-place |
| OFF after ON | Turn switch off while pane lives; next call returns/fails disabled/app-down bounded; later restore/restart receives no pair; running process is not mutated |
| Parallel | Two sessions of this row have distinct `GMUX_SESSION_ID`, the same profile socket path, and correct `whoami` result for each claimed id |

The catalog read remains catalog evidence, not model-prompt evidence. The verifier’s `whatIsNotTrue` must say so.

Parent/off comparison: independently compose every one of the thirteen launchable registry rows at the parent and HEAD with the switch off, for direct and captured shapes, and compare canonical argv/env sha256. All must be equal. The only allowed HEAD additions under ON are the three exact row pairs and `GMUX_AGENT_SOCKET`; `GMUX_SESSION_ID` already existed.

### 6.2 Verifier lens 2 — hostile transport/settings attack

**Independent method:** attack, do not confirm. Use an independently written raw Unix-socket client, not the bundled skill examples.

Attack matrix:

1. Directly edit scratch `settings.json` to true; restart: off/no delivery/no socket.
2. Atomically rename a forged file over it; restart: off.
3. Place a valid pre-359 seal beside `agentAccess: true`; restart: off and old fields still open as before.
4. Malformed JSON, array/null/scalar, wrong protocol, unknown operation, missing/extra keys, malformed/noncanonical Base64, invalid UTF-8/NUL, overlong session/path/find, line bounds.
5. Honest request with keys reordered and split at every byte boundary succeeds.
6. 64 KiB + 1 overflow refuses before parse; second request on one connection refuses.
7. Slowloris sends one byte just before each interval; absolute two-second deadline still closes.
8. Fake, gone, and remote session ids return unavailable and run no handler.
9. Turn switch off while the harness-paused strict open is in flight; result disabled, no renderer event/tab.
10. Leave stale socket by SIGKILLing only the helper-owned app main (never the Electron shim); first relaunch replaces only the stale socket, second sequential relaunch owns/cleans the same path; a planted regular file/symlink at the address is never removed.
11. Start two service owners against one profile in the plain-node harness: one listens; the other refuses and never unlinks the live owner.
12. App down: `/usr/bin/nc -w 2 -U` exits bounded; no process is started.
13. Scan `app.log` after canary names, ids, folders, path, and find text; none occur. Count exactly one operation/outcome/duration line per accepted/refused request.

### 6.3 Live open drive — one scratch Electron

Use one Electron session for all claims, two local open projects A/B, one local caller session in A, and fixed hostile fixtures. The raw client reads every socket answer; CDP reads project/tab/editor/selection/focus; an outside process hashes disk bytes. Cases:

| Case | Required result |
| --- | --- |
| file in caller/focused project, app focused | project unchanged; source tab opened; line/range exact; editor focused |
| file in project B while a terminal has focus | project switches to B; source tab opens; terminal keyboard focus is not moved to editor |
| Tortie hidden/background | request accepted/opened; `app.isHidden()`/window focus state unchanged; no activation |
| outside all projects | `outside-projects`, no event/tab |
| symlink leaf/ancestor out | refused, no tab |
| credential name (`.env`, key/pem fixture covered by path door) | `credential`, no tab |
| directory | `not-file` |
| missing | `missing` |
| 10 MiB file | `too-large`, no 5 MiB truncation tab |
| NUL/binary fixture | `not-text` |
| line past end | `line-out-of-range` |
| find absent | `not-found`, `matches: 0`, no tab |
| find present 300 non-overlapping times | `opened`, `matches: 300`, `chosen: 1`, first selection exact |
| multiline/emoji find | 1-based line and 0-based UTF-16 exclusive columns exact |
| git-ignored text file | opens normally; ignored is not a refusal |
| file atomically replaced after first read chunk | `changed`, no tab; deterministic harness checkpoint proves replacement fell inside read |
| switch off at same checkpoint | `disabled`, no tab/event |
| wrong renderer completion | ignored; request times out/refuses renderer-unavailable |

For every opened file, wait for the editor model and compare SHA-256 of its exact text bytes with the post-validation disk file. A response alone is not proof.

### 6.4 Real recorded session shape

Seed `build/p3167/seed-sessions.mts --shape his` into the scratch profile (counts/shape only; no personal data). Through `sessions`:

- compare ids/names/agents/status/project/machine/createdAt/phase/order/omitted with a separately captured `sessions:list` projection from the app;
- independently sort raw seeded rows by the specified comparator and compare byte-for-byte;
- assert no row’s name/id/folder appears anywhere in `app.log`.

A cap-induced omission must be computed, never guessed. If the recorded shape exceeds 200, the verifier compares the exact first 200 and exact omitted count.

### 6.5 Packaged proof

From `package:dir` and the full package build:

- run the packaged assertion against the `.app`;
- inspect exact resource paths/modes/file bytes from outside the app;
- launch the packaged `.app` only if the phase verifier’s package arm is included, through `withElectron`, and repeat one ON `capabilities`/`whoami` plus one open; otherwise source/app-run claims do not imply packaged resources and the phase is `needs_work`.

### 6.6 Required evidence in the final verdict

- exact PASS lines for the gate battery;
- per-agent table with installed version and every cell above;
- external process/tmux evidence for argv/env, not Tortie’s self-report;
- socket modes/identity/deadlines/counts;
- open matrix with socket answer, project/tab/selection/focus, and hashes;
- real-shape comparison counts;
- packaged resource assertion;
- final process/socket/tmux/Electron census;
- “what is not true”: no prompt/model proof, no unsupported agent, no remote agent, no mutating operation, same-user identity not authentication.

---

## 7. Machine discipline, cleanup, changelog, and commit

### 7.1 Probe discipline

- All scratch under `/private/var/tmp/tortie-wt/scratch/p359/<role>/`; short profile paths keep the Unix address under 103 bytes.
- Every Electron launch through `build/electron-run.mjs` and `build/harness-socket.mjs`, one at a time for this phase. The probe passes its scratch `tmuxSocket`; only the helper may perform its permitted read-only live-server census.
- Every child/process/socket/server/timer ends in `finally`; signal handlers installed before first start. No `pkill`, `killall`, pattern kill, negative pid, or SIGKILL to the Electron shim.
- Vendor CLIs run fenced, no-network/no-fork, scratch HOME, closed PATH, no inherited credentials or config, no model turn. A fence self-test runs first.
- No AppleScript, Automation prompt, Tailscale, ssh, Docker, Simulator, APNs, DNS, keychain, or real remote machine.
- Stat shell histories before/after any shell/app run; never read their contents.
- End scratch tmux by exact scratch socket; remove only files/directories in the run ledger after confirming no process names them.
- Final one-time Electron census uses the CLAUDE.md command and distinguishes the operator’s processes from this run’s.

### 7.2 Probe cleanup acceptance

At the end:

- zero run-owned Electron/Tortie/helper/vendor/fence/nc processes;
- zero run-owned tmux servers/socket files except a harness marker the helper explicitly owns until its finalizer, then zero;
- no `agent.sock` under any removed scratch profile;
- all scratch socket/listener inode ledgers reconciled;
- shell-history size/mtime unchanged or a separately observed operator-caused move documented;
- no staged files (`git diff --cached --quiet`), no commit by builders/integrator/verifiers/fixer/reverifier.

### 7.3 CHANGELOG item

Under `## Unreleased` → `### Added`, in the operator’s style:

> Settings → Agents now has an off-by-default switch that lets new Claude Code, Pi, and omp sessions ask Tortie about their own session and the others, and open a project file in Tortie at a line or matching text; sessions already running keep the skill state they started with

The follow-up docs commit appends the phase commit link; no period before the link. No release note mentions sockets, argv, gates, files, or implementation.

### 7.4 Commit

Only the committer commits, after pass/reverify:

```text
feat(agents): let a Tortie session use Tortie through a sealed switch

Phase 359: agents that can ask Tortie about itself and show you a file
```

No trailers. No push or release. The body records:

- three supported rows and unsupported rows;
- new channels/env/baseline movement;
- `HELPER_USER_FLOOR` 181 → 182;
- packaged resource assertion;
- Tier-3 evidence and no-model limitation;
- any stated residual.

---

## 8. Risks, refusals, and decisions the operator may revisit

### 8.1 Residual risks stated honestly

1. **Same-user spoofing:** the socket’s filesystem permissions exclude other accounts, not another process under this account. A process that learns a current session id can claim it. This phase exposes only curated reads and show-only open; it is not an authorization design for later mutations.
2. **Prompt behavior unproved:** catalogs list the skill at measured versions; no evidence says a model receives, chooses, or follows it. A later explicitly approved prompt-level research round is required.
3. **Vendor drift:** Claude Code/Pi/omp flags/catalog protocols are version-specific. The conformance gate holds Tortie’s adapters; only the real-agent matrix catches a vendor changing behavior.
4. **Running instructions cannot be revoked:** switch-off closes the API immediately but cannot erase a skill already loaded into a running agent’s process/context.
5. **Danger-seal replay:** a pre-359 seal cannot authorize the new field. The existing seal has no freshness counter, so replaying a valid Phase-359-era seal that covered true is not solved here.
6. **Socket path length:** profiles whose exact `<userData>/gmux/agent.sock` exceeds 103 UTF-8 bytes cannot use the feature. It fails closed and is never shortened to a different authority path.
7. **Open acknowledgment granularity:** the socket success means the renderer accepted the canonical open request; model/file rendering completion is verified live but is not a second public protocol state.
8. **Exact find semantics:** case-sensitive, non-overlapping, first match. No regex, fuzzy search, replacement, or multi-file search.
9. **No remote:** even a remote session shown in `sessions` cannot call this Mac’s local door.
10. **No user notice for rare listener startup failure:** the switch remains the sealed preference; calls are unavailable and logs carry a reason word. A richer Settings health row is outside this phase.

### 8.2 What is not in Phase 359

- Codex, Cursor Agent, OpenCode, Gemini, Droid, DeepSeek, Antigravity, Muse, Qwen, Grok, capture-only IDE rows, or arbitrary configured executables.
- Model prompt/activation proof or a model turn.
- Any personal/project skill install or change to `src/main/skills/`, Context, or the bundled skills CLI.
- Apple Events, `.sdef`, external automation, TCP, loopback HTTP, WebSocket, MCP, or a public listener.
- Session create/end/remove/rename/focus/input/status; file write; project add/close; diff/history/summary/terminal reads; Settings navigation.
- A shell command capable of selecting/starting an agent.
- Remote-machine transport.
- A release.

### 8.3 **DECIDED BY SPEC, operator may revisit**

These choices bind the build. A later operator ruling may change them; builders must not improvise alternatives now.

1. **DECIDED BY SPEC, operator may revisit:** `agentAccess` rides the existing `DangerState` seal as a boolean, not a sibling seal.
2. **DECIDED BY SPEC, operator may revisit:** one global switch, default off; no per-agent/per-session checkbox.
3. **DECIDED BY SPEC, operator may revisit:** exact UI label/note in §2.8 and placement before `ConfiguredAgents` on this Mac’s page.
4. **DECIDED BY SPEC, operator may revisit:** only Claude Code, Pi, and omp receive launch delivery; all other rows are exact null adapters.
5. **DECIDED BY SPEC, operator may revisit:** both `.claude-plugin` and `.cursor-plugin` metadata ship because that is the measured plugin fixture shape; passing the bundle to Cursor remains forbidden.
6. **DECIDED BY SPEC, operator may revisit:** resource root `Resources/agent-skills/tortie`, exact five-file allowlist, plugin version `1.0.0`.
7. **DECIDED BY SPEC, operator may revisit:** client transport is `/usr/bin/nc -w 2 -U` plus Base64 dynamic values; no bundled executable/client script.
8. **DECIDED BY SPEC, operator may revisit:** socket path exactly `<userData>/gmux/agent.sock`, `0700` parent, `0600` socket, 103-byte maximum; no hash/short-path fallback.
9. **DECIDED BY SPEC, operator may revisit:** one JSON-line request per connection, protocol 1, 64 KiB request, 256 KiB response, absolute two-second request deadline.
10. **DECIDED BY SPEC, operator may revisit:** same-user claimed `GMUX_SESSION_ID` is accepted for read/show operations and explicitly is not authentication.
11. **DECIDED BY SPEC, operator may revisit:** four operations exactly: capabilities/whoami/sessions/open.
12. **DECIDED BY SPEC, operator may revisit:** session rows newest first, tie by id, cap 200, with exact omitted count.
13. **DECIDED BY SPEC, operator may revisit:** finished means exited/restorable/discarded; no new status/lifecycle member.
14. **DECIDED BY SPEC, operator may revisit:** relative open resolves only in the caller’s project; absolute open searches open local projects in list order.
15. **DECIDED BY SPEC, operator may revisit:** an open request has exactly one locator: line range or exact text; exact text matching is case-sensitive/non-overlapping and selects the first.
16. **DECIDED BY SPEC, operator may revisit:** open is text/source only and requires both containment and the path door; ignored files are allowed, credentials/executable/binary/oversized/changed files are refused.
17. **DECIDED BY SPEC, operator may revisit:** same-project + already-focused Tortie may focus the editor; cross-project/background opens never steal focus or activate Tortie.
18. **DECIDED BY SPEC, operator may revisit:** renderer completion acknowledges acceptance, not full Monaco load.
19. **DECIDED BY SPEC, operator may revisit:** delivery is persisted nowhere; restore follows current switch, while retained restart also requires the pane’s original exact socket env.
20. **DECIDED BY SPEC, operator may revisit:** switch-off closes access immediately but does not and cannot erase already-loaded instructions.
21. **DECIDED BY SPEC, operator may revisit:** no model turn and no `conformance:resume`; catalog discovery and real callable operations are the phase’s evidence boundary.
22. **DECIDED BY SPEC, operator may revisit:** one phase-specific gate plus 32 minimum ablations and the two-lens Tier-3 protocol above; a `needs_work` verdict gets one fix and an independent reverify, never a second fix loop.
