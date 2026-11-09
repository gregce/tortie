# Phase 362 SPEC — the agent door grows hands: project-filtered discovery,
# stored summaries with honest freshness, open/create/rename/focus, and an
# optionally confirmed End

## 0. Status and scope ruling (operator, 2026-11-07/08 — binds this phase)

The switch is PLAIN and already unsealed; nothing in this phase re-seals it,
re-argues it, or adds a security dialog to it. The acting half is gated PER
OPERATION, never by leaning on that switch.

IN SCOPE — implement exactly these, all as thin adapters over the existing
dispatcher (`src/main/agent-access/dispatch.ts`) and the existing domain
verbs, grouped skill references by DOMAIN (never one file per operation):

1. Finish the `activity` / `summaries` production integration already in the
   worktree, WITH the corrected summary semantics in §4.
2. Project-filtered session discovery where already supported (an optional
   filter member on the existing list-shaped reads).
3. Open a project (select its tab; create the tab only through the existing
   open-target path).
4. Create a NAMED session (through `createSession`, never a parallel creator).
5. Rename a session (through `renameSessionAdmitted`, already the one Mac
   verb; phone's `renameVerdict` order is the model).
6. ONE focus action: select a project and optionally one of its sessions
   (through the existing `jumpToSession` outcome contract — switch, select,
   hand keyboard — without duplicating it).
7. Optionally End a session (NOT hard delete/discard): allowed only behind
   ONE NATIVE human confirmation bound to the exact target id, re-validated
   after the person answers (§7). No token protocol: one confirmation and one
   re-read is the whole mechanism. No new lifecycle confirmation dialogs for
   harmless rename/navigation.
8. A file range becomes a REAL mouse-style selection, and its end column is
   the END of the actual line rather than column 0: `line` alone (no
   `endLine`) must not produce an empty, inverted or column-zero range that
   only looks like a selection because of the flash wash. `MonacoHost`
   already calls `ce.setSelection(range)`; the range it is handed is what
   moves, plus the wash through the existing token. No new mechanism.
9. The earlier `.sdef` request remains a REQUEST and is investigation only
   (§8). The banked experiment measured a consent blocker on every Apple
   Events sender route; that is recorded as a measured, separate blocker and
   it does not block, delay or dilute the socket work in this phase. A
   decorative nonfunctional `.sdef` file is refused.

DROPPED — remove from the planned/current catalog, references, and code;
do not delete unrelated Tortie docs or phone messaging:

- `docs` operation (no bundled-docs read, no fetch, no outbound request).
- Any messaging/conversation-content read (turn text, transcripts, terminal
  bytes). `summaries` carries Tortie's kept sentence or `none`, nothing else.

## 1. Charter

His words: agents Tortie starts should be able to ask about the other
sessions — state, whether anything is running or waiting on him, and the
summary Tortie already calculated — and then act on the small set above,
with destructive End confirmed natively. Foundation: Phase 359 plus its
fix rounds; this phase adds no new transport and no new bundle.

## 2. Disjoint file boundaries (one builder per row, no file in two lists)

| Builder | Owns | May not touch |
|---|---|---|
| B1 contract | `src/shared/agent-access.ts` (new op names, filter member, result shapes); contract baseline regen | dispatcher, facts, bundle |
| B2 reads | `src/main/agent-access/facts.ts` (`activity` finalize, `summaries` rewrite per §4), `dispatch.ts` (new arms, filter validation), `service.ts` (`readSummary` required dep), `__tests__/p362-*.test.ts` | `capabilities.ts`, bundle, renderer |
| B3 verbs | new `src/main/agent-access/verbs.ts` (create/rename/focus/open-project adapters), `open.ts` (project leg), renderer `agent-access-open.ts` + `session-focus.ts` reuse shims | dispatcher, facts, selection |
| B4 end | `src/main/agent-access/end.ts` (two-step pending-confirm, §7), renderer confirm-surface reuse OR main `dialog.showMessageBox` call site (spec decides; exactly one), tests | kill path in `core.ts` (call, don't edit) |
| B5 bundle | `SKILL.md` table, grouped `references/*.md` (sessions/activity/summaries; navigation; lifecycle), `build/assert-agent-skills.cjs` fix (§6), gate sha256 updates | operations code |
| B6 select | `MonacoHost.tsx` selection path (no mechanism change), `editor.css` `.ed-flash` wash only | anything else |
| Integrator | `src/main/capabilities.ts` wiring, `electron-builder.yml` (only if §6 moves files), gate/probe wiring, seams between builders | builders' files |

`src/main/sessions/core.ts` (`createSession`, `renameSessionAdmitted`,
`killSessionAdmitted`, `endRefusal`), `jumpToSession`, `endSessionConfirm`,
and the overview store are CALLED, never edited, except `capabilities.ts`
wiring which is integrator-owned.

## 3. Operation names (closed; B1 pins in the registry, gate pins the list)

Reads (existing, finished): `capabilities`, `whoami`, `sessions`,
`activity`, `summaries`, `open` (file leg, unchanged).
New: `sessions` gains optional `project` filter member (project id; unknown
id reads `[]` with `omitted: 0`, never an error); `activity` and `summaries`
accept the same filter. `open-project` (select tab / open target),
`create` (named, §5), `rename` (§5), `focus` (project + optional session),
`end` (one native confirmation and one re-read, §7).

Validation mirrors the existing closed-union rule: unknown members are
`bad-request`; `sessions: [...]` stays `summaries`-only; the create name is
validated by `sessionNameRefusal` order (empty → long → character) before
anything is made.

## 4. Summary semantics correction (the existing worktree design is wrong)

The worktree installer reads `store.latestKeptSummary(sessionId)` and
`store.countTurns(sessionId)`. Both must change:

1. **No resurrection.** `latestKeptSummary` reaches PAST a newer refused
   row to an older kept one. The page (`writtenLineFor` in
   `src/main/overview/service.ts`) deliberately reads `latestSummary`
   (newest row, whatever its verdict) and draws NOTHING past a refusal.
   The door must answer the same: read `latestSummary`; verdict `kept`
   with non-empty text → `kept`; anything else (refused, failed, missing)
   → `state: 'none'`. A refused row is never hidden and never skipped over.
2. **Turn index is not countTurns.** Freshness compares the summary's
   `toTurn` against the newest STORED turn's index (the tail of
   `listTurns`, i.e. what `newestTurnIndex` reads), never `COUNT(*)`.
   `staleTurns = max(0, newestStoredIndex - toTurn)`; a turn in flight
   counts (the page says so), so a session mid-turn is stale by at least
   that turn.
3. **Missing answers `none`.** No store, no row, store-throw → `none`.
   The door NEVER starts a fold, never spends a token, never scans raw
   logs or transcripts, never re-reads a provider file. `readSummary` is
   the injected seam; B2 rewrites it against `latestSummary` + tail index.

Gate arms: kept-current (`staleTurns: 0`), kept-stale (exact count),
newest-row-refused-with-older-kept (answers `none`, the resurrection
regression), missing store (`none`), failed verdict (`none`).
Ablations: reach-past-refusal, countTurns-as-freshness, model-spawning
reader — each red on its own rule.

## 5. Create / rename reuse (no parallel verbs)

- `create`: validate name via `sessionNameRefusal`, then the ONE
  `createSession` path with the caller's project defaulted; answer the
  curated row. Never compose argv, never touch the manifest directly.
- `rename`: the phone's order is the model — shared `canRename`-equivalent
  gate, then `renameSessionAdmitted`, addressed by id only. No new
  confirmation dialog (harmless; operator ruling).
- `focus`: call through the `jumpToSession` contract (switch/select/
  keyboard or a refused sentence); the adapter translates its `JumpResult`
  to the door answer and adds no second tab-matching rule.
- `open-project`: project-id lookup in the renderer's list, `setActiveProject`
  when it differs (the `agent-access-open.ts` arrival pattern), else the
  existing open-target path; never raises Tortie over another app on a
  cross-project/background call keeps the open broker's `focus: false` rule;
  when the CALLER explicitly asked to focus, raising and focusing the window
  is allowed and is not treated as forbidden. That is what focus means.

## 6. Packaging assertion is stale (must-fix in B5, same commit)

`build/assert-agent-skills.cjs` `EXPECTED_FILES` names
`references/use-tortie.md` + `references/limits.md`; the tree holds
`references/sessions.md` + `references/editor.md` (since `a89ffd92`).
A pack from this tree throws on a missing file. B5 updates the allowlist
(and only the allowlist) to the grouped-domain files this phase ships,
byte-compare unchanged, and the gate's `EXPECTED_RESOURCE_SHA256` moves
in the same commit.

## 7. End: ONE native confirmation, exact id, re-validated after the answer

`end` is the only destructive operation and it is deliberately the simplest
thing that is honest:

1. validate the caller and the target id, and ask the existing `endRefusal`
   gate over the manifest row. A refusal answers the closed reason and nothing
   happens.
2. Ask the PERSON, in exactly one native surface, for that exact session by
   name. The surface is main's own `dialog.showMessageBox` on the window that
   asked, with the person's own words for End; there is no renderer dialog for
   this and no second path in the design.
3. If the answer is not the confirm button, nothing happens and the answer
   says so.
4. After the person answers, RE-READ the row by id and re-ask `endRefusal`.
   Only then call `killSessionAdmitted`. A row that went, a row that changed
   state, a row whose refusal now applies, or a gate that moved answers a
   refusal with nothing acted.
5. Report the per-item outcome.

There is NO token, no TTL, no single-use mint: a token protocol would add a
second state machine to protect a confirmation the person has already read,
and it could not make the confirmation stronger. The protection is the
re-read in step 4, which closes the only real race (the row moving between
the question and the act). Token reuse, a swapped id and a raced removal are
therefore all the same arm here: re-validation refuses and nothing is acted.

No hard delete and no discard verb exists in this phase.

## 8. `.sdef` (request recorded; blocked on a measured consent wall)

Measured, banked in `SCRATCH/automation-experiment/RESULTS.md` and its
`evidence/*.json`: an ad-hoc-signed native sender, as a direct child of the
target host, is refused `-1744` consent-required on send preflight with
`askUserIfNeeded=false`; nothing was received, so receipt is unexercised. The
same operation body reached by private socket answered three exact nonces, and
an external socket client answered too.

NOT measured: Developer ID / same-team signing, cold consent on a clean macOS
account, real tmux lifecycle, Codex TUI, Cursor/OpenCode catalogs, async
replies. Cold consent needs the operator's participation and is therefore a
SEPARATE measurement, recorded as `BLOCKED (measured: -1744)` in this phase's
report. It does not block the socket operations, which are complete without
it and are what internal agents use.

Decision: no Apple Events adapter and no `.sdef` ships in this phase, because
nothing could prove delivery and a file whose commands have no handler is
refused. If consent is ever measured on a real Developer ID build, the adapter
is thin: one dispatcher, one further transport, no second operation set.

## 9. Validators (extend, don't fork)

- `conformance:agentaccess`: new rules for filter member, §4 semantics
  arms, verb happy/refusal rows, End's re-validation arms, the half-open
  socket factory being what the service starts from, and the real selection
  range; every rule asked again over its broken copy + green control.
- `ablation:p359`: one plant per new clause (resurrection, countTurns,
  id swap after the confirm, decorative-sdef refusal), each red on its owner.
- `gate:contract` baseline regen (new ops/members), named lines in commit
  body; `assert-agent-skills` runs in the pack lane.
- `probe:p359` gains VERB arms (create/rename/focus/end with the native
  confirm pressed by the harness hand, and the re-read proven) — Electron
  only via `build/electron-run.mjs` (`withElectron` + its ACTUAL
  documented handle; no `ws` property — the predecessor's failure mode),
  fresh scratch profile/HOME/socket per launch, teardown in `finally`,
  never `-L gmux`, never the installed app, never the live demo.

## 10. Live verification plan (Tier 3: process creation + lifecycle + reads)

Method 1 — per-agent matrix over real launches (pi.dev model-turn tests):
Claude Code / Pi / omp via Tortie's real create path, switch on: composed
argv byte-equals the measured injection flags; pane carries socket + suicident
env; catalog lists the skill; then the agent, in a MODEL TURN, asks "what
are my other sessions doing" and quotes the answer; the verifier reads the
same board in the window. Disabled → byte-identical argv/env for all
thirteen rows. Missing installs are unverified, never passes.

Method 2 — attack: a `settings.json` written under the app (file,
rename-over) is never REFUSED for that alone, because the switch is not
sealed; socket requests from non-session
processes; oversized/malformed/reordered/slowloris bodies; switch off
mid-flight; stale socket; End's confirm answering after the row was removed
or swapped to another id; summary refused-newest fixture; filter naming
another machine's project.

Method 3 — runtime server proof: in the RUNNING app, `printf ... | nc -U`
pipeline calls (the half-close shape) against EVERY operation including a
slow one; all answer with bytes, none EOF-empty. This re-proves §9's
server wiring — the worktree's `service.ts` calls `createServer()`
directly (line ~405) rather than the `allowHalfOpen: true` factory
`createAgentAccessServer()` in `socket.ts`; B2/integrator MUST route the
service through the factory, and this method is the proof, not a repeat
of any predecessor's half-close diagnosis.

UI observation: two-project window; `open-project` selects the tab;
`create` names and lands the row; `rename` renames by id; `focus`
(project-only and project+session) lands the outlined pane + keyboard;
file-range open shows a REAL selection (compare against mouse-drag
selection colors) plus the brightened wash; End shows the native confirm
and ends only the named id on confirm.

## 11. Acceptance matrix

| Claim | Proof |
|---|---|
| No resurrection: refused-newest reads `none` | gate arm + ablation red/green |
| Freshness uses stored tail index, never `COUNT(*)` | gate arm with exact `staleTurns` |
| No model, no raw scan, missing → `none` | ablation (reader that would spawn) + store-absent arm |
| Filtered discovery equals the app's own list | real-data matrix vs attention list + window marks |
| create/rename/focus call the one existing verb | driven verb arms + argv/env byte-compare |
| End ends exactly the confirmed id or nothing | re-validation arms + native-confirm drive |
| Pipeline callers get answers, never empty EOF | live runtime proof, all ops |
| Bundle packs byte-identical, assertion green | `assert-agent-skills` in pack |
| `.sdef`: executable adapter or recorded blocker | §8 matrix or BLOCKED note |
| Switch stays plain, no new dialogs except End's native one | gate + UI observation |

## 12. What is NOT in this phase

No `docs` op; no turn/transcript/terminal-byte reads; no fold/model/token
spend in the door; no Codex/Cursor/OpenCode/Gemini/Droid/DeepSeek/
Antigravity/Muse/Qwen/Grok delivery; no remote-machine reach; no third-
party code in any process; no status-setting from any operation; no
process start on config change; no new renderer confirm dialogs; no
security dialog on the agent-access switch; no decorative `.sdef`; no
release by itself.

---


> 2026-11-08: SPEC superseded on two points: no agent End operation at all; `open` is absolute-path, caller-project-only.
