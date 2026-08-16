# Research 50. Grok as the thirteenth compiled agent

**Decision document. Written 2026-08-16.** It rules on four investigations run the same day, being
a source reading of the grok checkout at /Users/gdc/grok-build, a tree mapping of every place a
compiled agent lands in Tortie, a live probe series against the installed binary, and two
adversarial review passes over the resulting draft. The checkout builds version 1.0.4, which is
byte for byte the binary installed on this machine, so source citations describe the installed
binary exactly.

**Provenance and safety.** Grok is the operator's real, paid agent, so the whole research was
capped at 4 turns against it. 3 turns were spent, all by the probe investigation, all headless, all
in a scratch directory under /private/tmp. Section 9 accounts for each one. Every other measurement
cost zero turns. Operator tmux sessions on the `-L gmux` socket numbered 24 before the probes and
24 after. The operator's live grok session (pid 19991, cwd /Users/gdc/pi) was never touched and
remained the only entry in `~/.grok/active_sessions.json`. Nothing under `~/.grok` was modified
beyond what grok itself wrote when it ran. No keychain dialog appeared, and section 2.6 explains
why none can. No git command that writes was run. Phase 58 was being built in this checkout during
the research; its dirty files were not read as truth about HEAD, and the tree claims below were
verified against committed files. Line numbers will drift and the symbol names will not.

---

## 1. The answer

Grok can be a first class compiled agent, and it is the easiest integration since pi, because it
pre-assigns session ids at launch and resumes strictly by id from any directory. The one sentence
risk is that a resume against a session id grok no longer has locally does not fail fast but calls
grok.com first and exits 1 only after the network round trip, and nobody has measured what that
path does offline, so a restored pane on a machine without network has unknown behavior until open
question 2 closes.

Three properties decide the shape of the integration.

- `--session-id <uuid>` pre-assigns the id for a NEW session. Tortie generates the UUID before the
  process exists, so there is no harvest, no claim, and no identity race of the kind research 40
  documents. This is the same idCapture shape claude already uses.
- `--resume <uuid>` is strict. It never creates, and it finds the session even when the cwd
  changed, because the resolver scans every encoded cwd directory in the store. Both facts were
  measured with content recall, not file presence.
- The bare name `agent` is a permanently maintained grok entry point AND a Cursor installer name.
  Research 47 documented the collision. Any grok detection that probes `agent` is a fatal defect,
  and section 2.1 shows the name is stale on this machine even where it is grok's own.

---

## 2. The measured facts

### 2.1 Binary, names, versions

| Fact | Value | How measured |
|---|---|---|
| `command -v grok` | `/Users/gdc/.local/bin/grok` symlinked to `~/.grok/bin/grok` symlinked to `grok-1.0.4` | command -v, ls, realpath |
| The real file | 133,899,712 bytes, Mach-O 64-bit arm64 | file, stat |
| `grok --version` stdout | `grok 1.0.4 (d846eb93d94d) [stable]` exactly | 5 runs |
| `grok version --json` stdout | `{"currentVersion":"1.0.4 (d846eb93d94d)","channel":"stable"}` exactly | direct run |
| Probe cost | 0.01 s real, on all 5 runs | /usr/bin/time -p |
| `command -v agent` | `/Users/gdc/.local/bin/agent` resolving into `~/.grok/downloads/grok-macos-aarch64`, 133,563,584 bytes | same tools |
| `agent --version` | `grok 1.0.3 (1a29d5bc12d4) [stable]` | direct run |

The two names run DIFFERENT versions on this machine. The Aug 15 auto update rewrote
`~/.grok/bin/grok` and left `~/.grok/bin/agent` pointing at the Aug 12 download. The source's
updater swaps both names in lockstep (auto_update.rs:1706 to 1712), and that claim did not hold
here. Probing `agent` would therefore report a stale version even when the name is grok's, on top
of the Cursor collision.

### 2.2 The CLI surface a harness needs

The single clap root is `PagerArgs` in crates/codegen/xai-grok-pager/src/app/cli.rs, command name
"grok", and `parse_cli` accepts argv[0] of either `grok` or `agent` (cli.rs:858 to 869).

| Purpose | Flag | Source |
|---|---|---|
| Pre-assign an id at launch | `-s` / `--session-id <UUID>`, NEW sessions only, never an upsert | cli.rs:597 to 602, session_startup.rs:813 to 821 |
| Resume by id or title | `-r` / `--resume [ID_OR_TITLE]`, strict, never creates | cli.rs:556 to 576 |
| Continue most recent for cwd | `-c` / `--continue` | cli.rs:588 to 595 |
| Headless one turn | `-p` / `--single <PROMPT>` | cli.rs:483 to 492 |
| Output format | `--output-format plain\|json\|streaming-json\|streaming-messages-json` | cli.rs:513 to 524 |
| Model | `-m` / `--model` | cli.rs:525 to 527 |
| Auto approve | `--always-approve`, aliases `yolo` and `dangerously-skip-permissions` | cli.rs:457 to 463, also sighted in the live 1.0.4 `--help` |
| Disable self update | `--no-auto-update` | measured `--help` |

Two absences shape the design. There is no `--continue <id>` form, and no environment variable
resumes a session. `GROK_SESSION_ID` is exported BY grok to its hook and MCP children
(notifications/hooks.rs:24) and is never read to select a session, so Tortie must never set it.

`--resume` with no value opens the most recent session for the cwd (cli.rs:556 to 576). That is
gemini's exact failure mode, so the registry row marks bare resume dangerous and the template
never emits an empty slot.

### 2.3 The session store

A session is a DIRECTORY, not a file. The path shape, from xai-grok-config/src/paths.rs:149 to 157
and xai-grok-home/src/lib.rs:54 to 65, and confirmed live at the predicted path during the probes,
is the following.

```
$GROK_HOME (default ~/.grok)
  sessions/
    <urlencode(cwd)>/           percent encoding of the absolute cwd, paths.rs:70 to 84
      <session-id>/             UUIDv7 when grok generates it, any valid UUID when pre-assigned
        summary.json            index entry, atomic temp plus rename writes
        updates.jsonl           the durable source of truth
        chat_history.jsonl      derived cache, rebuilt from updates.jsonl
        events.jsonl, signals.json, prompt_context.json,
        rewind_points.jsonl, system_prompt.txt, *.lock siblings
```

Facts a builder relies on, all measured or source-verified with the file named.

- The session directory exists at launch, before the first turn completes, mode 0700
  (init_session, storage/jsonl/mod.rs:988 to 1003). There is no pi-style empty window.
- `summary.json` is written by atomic temp plus rename (storage/mod.rs:44 to 53). Appends to the
  jsonl files run under `.jsonl.lock` advisory siblings with F_FULLFSYNC on macOS
  (jsonl/mod.rs:468 to 477).
- During a turn the grok process durably holds a WRITE fd on `events.jsonl` (fd 33w in 69
  consecutive 0.5 s lsof samples of pid 13700). `updates.jsonl`, `chat_history.jsonl` and
  `summary.json` were never caught open. A future fd-owner harvest rule written against
  `updates.jsonl` would never confirm. The right file is `events.jsonl`.
- Grok has NO whole session lock. `active_sessions.json` is crash recovery bookkeeping, not mutual
  exclusion (xai-grok-active-sessions/src/lib.rs:1 to 50), and the docs call concurrent same-id use
  best effort. Tortie's one session one pane model is the actual guard, and the registry notes must
  say grok itself does not prevent double resume.

### 2.4 Resume, measured

Three turns produced these results, all with `--output-format json`, all exit 0.

- Create. `~/.grok/bin/grok -s <uuid> -p "<prompt>" --output-format json` in the scratch
  directory. A UUIDv4 from uuidgen (6a9355e0-e621-41d5-8eda-f24818062997) was ACCEPTED, so ids do
  not need to be UUIDv7. The session directory appeared at exactly the predicted encoded path. The
  JSON output carried sessionId, stopReason "end_turn", and total_cost_usd 0.00383996.
- Same cwd resume. `grok --resume <sid> -p ...` returned the marker "ZEBRA42" with the same
  sessionId. Content recall is the proof.
- Cross cwd resume. The same argv from a DIFFERENT directory also returned "ZEBRA42", with the
  stderr line `Session <sid> found locally (originally in <original cwd>)`. The session directory
  did not move. `requiresOriginalCwd` is false, measured, and the mechanism is
  `resolve_local_session_any_cwd`, which scans every encoded cwd directory
  (persistence.rs:543 to 576).

Two error paths were measured at zero token cost.

- `--resume <nonexistent uuid> -p` does NOT fail fast. It prints
  `Session "<id>" not found locally, restoring conversation from remote...`, makes a network call
  to grok.com, and exits 1 with a 404 error. A stale manifest id costs a network round trip, and
  offline behavior is unmeasured (open question 2).
- `-s <existing id>` refuses immediately with `Error: Error: Session ID <id> is already in use.`
  The double "Error:" is verbatim. Launch argv and resume argv are therefore different, unlike pi.

### 2.5 Config and context surfaces

- Instruction files, the exact recognized list from xai-grok-tools/src/types/compat.rs:401 to 415,
  are `Agents.md`, `Claude.md`, `CLAUDE.md`, `CLAUDE.local.md`, `AGENT.md` and `AGENTS.md`, plus
  the `.claude/` variants when claude compat is on, which it is by default. There is NO GROK.md
  anywhere in the source, and the Context panel must not invent one.
- Rules directories are `.grok/rules/`, `.claude/rules/` and `.cursor/rules/` per directory, plus
  `rules/` under each home root (agents_md.rs:177 to 251).
- Scope order is home roots first, then project roots from repo root down to cwd
  (agents_md.rs:253 to 256). User scope before project scope, root to leaf.
- Config precedence, from user-guide/05-configuration.md:9 to 17, is CLI flags, then env vars, then
  requirements.toml and MDM, then the `GROK_CONFIG` overlay, then `~/.grok/config.toml`, then
  managed_config.toml, then built-ins. Project `.grok/config.toml` files layer over the global one.
- The docs state the default model is `grok-4.5` (05-configuration.md:49). The live store shows
  `current_model_id` of `grok-4.6` and headless usage keyed `grok-4.6-build`. Section 9 records the
  disagreement. The Context row records what the docs state and notes the live observation.
- Config files are watched (agent/config.rs:4675 to 4685). Instruction files are re-discovered per
  prompt injection, not only at launch.

### 2.6 Keychain and credentials

The binary imports zero SecItem, SecKeychain or SecAccessControl symbols (nm against the arm64
slice). Credentials live on disk in `~/.grok/auth.json`, and grok's own sandbox profiles deny the
`com.apple.security.keychaind` mach lookup. Grok cannot raise keychain dialogs. No env passthrough
is needed. `XAI_API_KEY` and `GROK_HOME` exist for users who want them, and that route is an
agents.json row through the confirm gate per the Phase 33 design, never a compiled field.

### 2.7 The installer

The live installer at https://x.ai/cli/install.sh was fetched read only and is byte identical to
crates/codegen/xai-grok-pager/scripts/install.sh (diff -q, 460 lines). It creates both
`~/.grok/bin/grok` and `~/.grok/bin/agent` (install.sh:277 to 279) and symlinks both names into
`~/.local/bin` or `/usr/local/bin`. There is no npm or brew path. Self update runs in the
background unless `--no-auto-update` or config disables it.

### 2.8 License

/Users/gdc/grok-build/LICENSE is Apache License 2.0 with the copyright line verbatim
"Copyright 2023-2026 SpaceXAI". Tortie only launches the user-installed binary, which imposes no
Apache obligation. Apache 2.0 section 6 explicitly excludes trademark rights, so nothing in the
checkout grants or restricts use of any xAI or SpaceX mark. THIRD-PARTY-NOTICES (18,898 lines)
covers grok's own Rust dependencies and constrains nothing in Tortie.

---

## 3. The Phase 59 specification

### 3.1 The registry row

The id union `AgentRegistryId` (src/shared/types.ts:686) gains `'grok'`. The frozen `AgentKind`
at types.ts:26 does not change. Widening the union forces every exhaustive Record in the tree to
gain a grok row at typecheck, which is the safety net for the whole phase.

The row in `AGENT_REGISTRY` (src/main/agents/registry.ts), with the evidence for each field.

| Field | Value | Evidence |
|---|---|---|
| id | `'grok'` | new union member |
| displayName | `'Grok'` | user-visible copy |
| kind | `'cli'` | one Mach-O, one process, no children observed in ps during the probes |
| launchable | `true` | launched headless 3 times |
| status | hands-on verified 2026-08-16, grok 1.0.4 (d846eb93d94d), no specstory provider | probe log |
| confidence | `'high'` | source and live probes agree on every load bearing claim |
| binaries | `['grok']` | FATAL RULE. Never `'agent'`. Cursor's installer claims that name (research 47), and on this machine `agent` is a stale 1.0.3 even though it is grok's. argv[0] mirrors binaries[0] per registry.test.ts |
| extraProbeDirs | `['~/.grok/bin']` | install.sh:277 to 279. `~/.local/bin` is already in `extraBinDirs()` (tmux/resolve.ts:115) |
| storeDirs | `['~/.grok/sessions']` | paths.rs:149 to 157, 11 encoded cwd dirs live today. `GROK_HOME` can move the base, and a moved home is the user's explicit choice, noted in the row |
| versionProbe | see 3.3 | |
| launch | `['grok']` bare name in the pane, absolute path in the manifest | Phase 12.7 F3, stated in full in 3.4 |
| resume | see the block in 3.2 | |
| reconstructionTarget | `false` | grok treats `updates.jsonl` as authoritative and rebuilds `chat_history.jsonl` from it (storage/mod.rs:130 to 132). Nothing proves foreign writes are safe. False is honest |
| iconKey | `'grok'` | section 3.7 |
| defaultHotkeyHint | `'r'` | free after c, u, x, g, d, k, a, m, q, p. Fallback `'o'` |
| unverified | `false` | the resume roundtrip was measured, not assumed |
| activity | tier `'screen'`, `animatesWhenIdle` pending open question 3, verified `'unverified'` | matches `DEFAULT_ACTIVITY` at registry.ts:1349 |
| imageDrop | absent | unmeasured, open question 3's sitting |
| multilineKey | absent | unmeasured, same sitting |
| specstory | absent | section 3.10 |

Notes the row must carry verbatim, because each one is a measured behavior a future builder would
otherwise rediscover the hard way.

- Grok has no whole session lock, so a user running `grok -c` in a terminal in the same cwd can
  co-write a Tortie session best effort. Tortie cannot prevent this.
- A resume against an id with no local directory calls grok.com before exiting 1. After a
  reinstall, a TUI resume of a locally deleted session may silently restore the conversation FROM
  grok.com, so a dead session can come back over the network.
- Background self update retargets `~/.grok/bin/grok` while sessions run. Open question 6 decides
  whether Tortie passes `--no-auto-update`.

### 3.2 The resume block and the 15 recovery contract fields

```ts
resume: {
  strategy: 'flag-uuid',
  template: ['--resume', SESSION_ID_SLOT],
  idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] },
  // requiresOriginalCwd omitted: measured false. Cross cwd resume returned the
  // marker, and persistence.rs:543 to 576 scans every encoded cwd directory.
  bareResumeIsDangerous: true,
  // bare --resume opens the most recent session for the cwd (cli.rs:556 to 576),
  // gemini's failure mode. Never emit an empty slot.
  sessionStore: '~/.grok/sessions/<urlencode(cwd)>/<sessionId>/',
}
```

The `sessionStore` string is a pure path template, because contract field 10 copies it verbatim
into every manifest row and it surfaces in user-facing drift warnings. The facts that a session is
a directory and that `updates.jsonl` is the authoritative file go in the row notes, not in the
template. The first adversarial pass on the draft had them inside the template, and the review
moved them out (section 5, problem 5).

No harvest descriptor. Slot `DESCRIPTORS` in src/main/manifest/harvest/stores.ts:345 gets no grok
row, because pre-assignment means no id is ever read from disk and no claim is ever made. This is
the claude shape. If a future round needs harvest anyway, the fd-owner rule from research 40 works,
with the correction in section 2.3 that the durably held file is `events.jsonl`.

The 15 fields as `buildRecoveryContract` (src/main/manifest/agents.ts) composes them. No code edit
in that file. The row supplies everything.

| # | Field | Value for grok | Evidence |
|---|---|---|---|
| 1 | v | current contract version | mechanical |
| 2 | at | write time | mechanical |
| 3 | bin | the first PATH or probe dir hit, on this machine `/Users/gdc/.local/bin/grok` | `resolveBinaryAgainst` (src/main/tmux/resolve.ts:559 to 575) returns the hit verbatim and never calls realpath, so the stored path is the STABLE symlink, and auto update retargeting `~/.grok/bin/grok` underneath it changes nothing. Verified in committed code by the first adversary |
| 4 | requiresOriginalCwd | false | measured, section 2.4 |
| 5 | bareResumeIsDangerous | true | cli.rs:556 to 576 |
| 6 | resumeStrategy | 'flag-uuid' | |
| 7 | resumeTemplate | `['--resume', <id>]` | both roundtrips exited 0 with content recall |
| 8 | resumeExtrasPosition | 'trailing', the default | the measured resume argv carried trailing `-p` and `--output-format` and worked |
| 9 | idCapture | pre-assign via `--session-id` | UUIDv4 accepted, directory appeared at the predicted path |
| 10 | sessionStore | `~/.grok/sessions/<urlencode(cwd)>/<sessionId>/` | paths.rs:70 to 84 plus live observation |
| 11 | cwdReal | canonicalized cwd | mechanical |
| 12 | projectReal | canonicalized project | mechanical |
| 13 | captureRouteVerified | true, because `unverified` is false | the phase's roundtrip is the proof |
| 14 | flagsVerifiedVersion | `grok 1.0.4 (d846eb93d94d) [stable]`, the WHOLE distilled first line | This value is NOT taken from the row. It comes from `AGENT_FLAG_PRESETS[grok].helpVerifiedVersion` (flags.ts), and `flagVerificationState` (manifest/agents.ts:515 to 528) compares it with strict equality against the detected version, whose distill is the whole first line (detection.ts:188 to 204). Claude's preset `2.1.226 (Claude Code)` follows the same pattern. A shortened value such as `1.0.4 (d846eb93d94d)` would make every grok session read 'other-version' against the identical binary |
| 15 | flagsVerifiedAgainst | one of 'this-version', 'other-version', 'never', 'unknown' | This is an ENUM computed per session by `flagVerificationState` at create time (manifest/agents.ts:451 and 532 to 539), not a free string. With the preset above and the installed binary it evaluates to 'this-version'. The draft had a date and a source revision here, and a builder copying that would have written an invalid contract |

One consequence of field 14 is worth stating plainly. Grok updates itself in the background with no
user action, so `helpVerifiedVersion` goes stale faster than for npm agents, and sessions will read
'other-version' sooner. That is the mechanism working as designed, not a defect, and the phase brief
should say so.

### 3.3 Detection and the version probe

No code edit in src/main/agents/detection.ts. The scan walks the registry table. The row supplies
the probe.

The shipping default is `args: ['--version']` with `identitySubstring: 'grok '`, judged on stdout
alone per the Phase 48 rule. The first adversary found this the weakest identity token in the
registry after pi's none, because `grok` is a generic word (e.g. the Elastic pattern tool) and any
binary printing `grok <something>` passes. The stronger alternative is `args: ['version',
'--json']` gated on the token `"currentVersion"`, which a generic grok will not emit, with
`--version` as fallbackArgs (detection.ts:282 to 284 supports fallbackArgs). The two choices
interact with contract field 14, because `helpVerifiedVersion` must equal the distilled first line
of whatever the primary probe prints, byte for byte. Open question 8 closes this with a zero cost
read of detection.ts before the row is committed. Either way the probe costs 0.01 s.

`storeDirs` existence (11 encoded cwd directories live today) is the installed-and-in-use signal,
the same as pi.

### 3.4 Launch, the bare name rule stated in full

Grok inherits the Phase 12.7 F3 conversion with no special handling. The manifest stores the
ABSOLUTE bin path from field 3. The pane launches by BARE NAME `grok`, which tmux's execvp finds
because the login shell PATH is injected into the server env. The point of the split is that
`pkill -f "$(command -v grok)"` never matches Tortie's sessions. A builder must not execute the
absolute argv in the pane, and registry.test.ts:518 pins argv[0] to binaries[0].

### 3.5 Renderer seed

`SEED_AGENTS` (src/renderer/state/agents.ts:214) gains `{ id: 'grok', label: 'Grok', unverified:
false }`, in registry order. `AGENT_INSTALL_COMMANDS` is not touched. It is typed
`Record<'claude' | 'codex', string>` and research 47 phase C deletes it. Section 4 of
conformance:agents fails the seed list on ids, order or the unverified column.

### 3.6 Flag presets and the bypass row

flags.ts has its own id union `RegistryAgentId` (line 35), which gains `'grok'`, and both
`AGENT_FLAG_PRESETS` and `BYPASS_FLAGS` are exhaustive, so typecheck forces the rows.

The bypass row is real, not empty. `BYPASS_FLAGS` requires provenance 'VERIFIED', meaning the flag
was seen in that build's `--help` on this machine, and `assertBypassFlagsAreCataloged` enforces it
at run time (conformance/cases.ts:35 to 44, flags.ts:9 to 12). The provenance for grok is the
sighting, not the source line, and the sighting exists. The live 1.0.4 `--help` contains
`--always-approve` with aliases `yolo` and `dangerously-skip-permissions`. Danger styled.

Preset candidates from the measured `--help` are `--model`, `--reasoning-effort` and
`--no-auto-update`. The preset's `helpVerifiedVersion` is the exact string in field 14.

### 3.7 The icon, and what the operator must be told about it

The operator's instruction is the SpaceX mark. The mechanical work is one file at
src/renderer/assets/agents/grok.svg normalized to the set's contract (24 grid viewBox, 1em sizing,
currentColor fill so a monochrome mark tints), one import and one `LOGOS` row in
src/renderer/icons/AgentIcon.tsx, and alias rows `xai`, `grokcli` and `spacex` mapping to `grok`.
Native menus rasterize automatically via agent-menu-icon.ts. The simple-icons set carries the mark
under CC0 1.0, which imposes no attribution duty, and the set is not a dependency, so the phase
vendors the single SVG the way the other marks arrived.

The second adversary found the draft's legal framing below the repo's own standard, and the
operator should read this part before the phase ships the file.

- Research 38 section 6.2 gives every shipped mark a row with a READ brand policy and a verdict. No
  SpaceX brand policy has been read. The phase must read one and record a research 38 style row
  before the icon lands.
- Whether the SpaceX rocket company's mark and the "SpaceXAI" copyright holder of grok-build are
  the same mark of the same owner is unestablished. Research 38's deepseek verdict says one
  company's mark on a product it did not make is the exact confusion trademark law prevents.
- Research 38's mitigations for the marks already shipped, being the NOTICE marks line (item 3)
  and the README disclaimer (item 9), are still absent from NOTICE and README today, verified by
  the review. Grok would be a thirteenth unlicensed mark entering a bundle whose planned cover is
  unbuilt.
- `amp.svg` is not a precedent for shipping an icon ahead of an agent. Research 38 item 5 ordered
  that file deleted.
- The operator's instruction is the reason the mark is used. It is not a legal position, and this
  document does not present it as one.

A design caution separate from the legal one. The SpaceX mark is a wide wordmark, not a square
glyph, and at 16 px inside a 1em square it may be illegible. The Tier 1 screenshot decides between
the compressed wordmark and a crop to the swooped X letterform (open question 7).

### 3.8 Activity status

`activityProfileFor` gives any unknown id the floor, tier 'screen', and grok ships at the floor.
The one field that must be measured before commit is `animatesWhenIdle`, because deepseek and muse
paint at an idle prompt and a wrong value makes idle read as working (open question 3).

Grok offers two exact-tier mechanisms, and neither ships in this phase.

- The tab title oracle, the codex precedent. Default-on title writes carry a literal
  `⚠ Action Required` prefix when waiting and a braille spinner when busy (title.rs:20 to 27,
  config.rs:74 to 86), with zero configuration and zero writes under `~/.grok`. This is the right
  future candidate, and it requires a Tier 3 matrix before any tier claim. Codex's matrix was 0
  percent false negatives and 0 percent false positives over n=156. The title exists only in pager
  mode, not in `grok agent stdio`.
- Lifecycle hooks in the Claude Code settings.json schema (`~/.grok/hooks/*.json`, events
  including `Stop`, `PermissionDenied` and `Notification`, xai-grok-hooks/src/event.rs:89 to 197).
  Exact, but they require Tortie to WRITE configuration into `~/.grok` that causes grok to execute
  a Tortie-chosen command. That collides with the spirit of Phase 23 refusal 8 and needs its own
  decision with the operator. It is not folded into this phase.

Status semantics hold either way. `Action Required` and `approval_required` are session behavior,
never the user's own input.

### 3.9 Context view

`SKILLS_CLI_NAMES` (src/main/context/agent-context.ts:1120) is exhaustive over `AgentRegistryId`,
so typecheck forces a grok row. The value is null unless the bundled skills CLI names grok (open
question 5), and null is a valid, honest value.

A `BLOCKS` row (agent-context.ts:186, the record is Partial) is what makes grok appear in the
Context panel at all. Its content comes from section 2.5, being the instruction file list with no
GROK.md, the rules directories, the home-first root-to-leaf scope order, the config precedence
chain, the model line recording the documented `grok-4.5` default with the live `grok-4.6`
observation noted, and the reload cells (config watched, instruction files re-discovered per
prompt). `npm run conformance:context` fails a declared row missing its model, scope order or
reload cell. renderer groups.ts is generic and needs nothing.

### 3.10 SpecStory

No `specstory` row. The bundled specstory CLI has no grok provider today, and a row is added only
when exit code fidelity is measured against the bundled CLI. An absent row degrades cleanly, being
no capture toggle and uncaptured sessions. The vocabulary is open per Phase 18.5, so a future
bundled specstory reporting a `grok` provider matches by grok's own id with no code change, flagged
'discovered' with pessimistic 'collapsed' fidelity.

### 3.11 What needs nothing, stated so nobody adds it

| Surface | Why nothing |
|---|---|
| manifest/agents.ts code | `buildRecoveryContract` composes from the row |
| detection.ts code | the scan walks the registry table |
| harvest DESCRIPTORS | pre-assign, no claim ever made |
| envPassthrough | no compiled row sets it, grok's credentials are on disk, the confirm gate is the route for user overrides |
| `agents:availability` probe | frozen contract, claude and codex only |
| launch preflight (src/main/agents/health.ts) | the Phase 48 shebang check is agent generic and a Mach-O stops at the first two bytes with 'ok' |
| smoke:t3 shapes | stays claude plus one non-claude shape, grok is not swapped in |
| `AGENT_INSTALL_COMMANDS` | claude and codex only, scheduled for deletion |

### 3.12 Install info, recorded for research 47 phase C

Nothing lands in code today. The future `AgentInstallInfo` row, display strings only, never run.

| Field | Value |
|---|---|
| canonical | `curl -fsSL https://x.ai/cli/install.sh \| bash` |
| docUrl | https://x.ai, sourced from README.md:44 to 48 |
| readOn | 2026-08-16 |
| alternates | Windows `irm https://x.ai/cli/install.ps1 \| iex`, self update via `grok update` on channels stable, alpha and enterprise, and building from source as `xai-grok-pager` |
| signature | the live installer fetched 2026-08-16 is byte identical to the in-repo script, hash the fetched bytes when phase C defines the field |

### 3.13 Docs and counts

| Place | Change |
|---|---|
| src/shared/types.ts:686 | `AgentRegistryId` gains 'grok' |
| README.md:53 | fix two existing defects while counting. Grok is listed before support exists, and Muse appears twice, both confirmed byte for byte. After the phase, registry entries go 12 to 13 and launchable agents go 10 to 11 |
| registry.ts header prose | "The 12 entries" and "All 12 agents" become 13. Prose only, never identifiers |
| detection.ts prose | "the compiled twelve" becomes thirteen |
| build/conformance-agents.mjs prose | lines 8 and 52 say "twelve", found by the second adversary. The script itself is shape driven against claude's contract keys with no hardcoded list, so only prose changes |
| CHANGELOG.md:132 | historical, stays |
| docs/research/38-agent-licences.md | grok row per section 3.7, with a read brand policy |
| docs/BACKLOG.md | the Phase 59 entry |

---

## 4. The verification plan, Tier 3

Tier 3 is mandatory because resume claims are executable and the phase touches the manifest.

| Gate | Cost | Evidence it must produce |
|---|---|---|
| typecheck, build, test, smoke:t1 | baseline | every exhaustive Record gained its grok row |
| `npm run conformance:agents` | 2 s, spawns nothing | the create path composes an absolute argv, a resume argv recomposed from the PARSED manifest row alone equals the registry's byte for byte, the seed list agrees, and the confirm hash moves for every execution bearing field and no presentation field |
| `npm run conformance:resume:capture` with grok in GMUX_CONF_AGENTS | 16 s, zero turns | the pre-assigned UUID appears as a session directory at the predicted path before any turn, and the 15 field row is complete. GMUX_CONF_AGENTS is read at src/main/conformance/resume.ts:187 and defaults to every launchable agent, so the plan works as written |
| full `npm run conformance:resume` roundtrip, once | 3 min, real grok turns and tokens | marker turn, kill the pane, relaunch `grok --resume <id>` from the manifest row, marker recalled. Content recall is the proof. This run is the phase's stated token spend |
| `npm run conformance:context` | 1 s | the grok BLOCKS row keeps its model, scope order and reload cells |
| live app drive | minutes | create a grok session in Tortie, quit, relaunch, restore. Sessions on `-L gmux` counted before and after, unchanged except the test session, and the operator's live grok session untouched |
| icon screenshot | Tier 1 | one capture, light and dark, tab plus native menu |
| activity matrix | none | not run, because no tier above 'screen' is claimed, and the brief says so |

Every gate named here exists in package.json, verified by the second adversary. The commit gates
follow CLAUDE.md, being conformance:resume:capture for the registry and manifest edits,
conformance:agents for the agent table, and conformance:context for the BLOCKS row.

---

## 5. What the adversaries found and what changed

Two independent passes ran against the draft, one attacking the design with seven failure
scenarios and one verifying every file, line and value claim against the committed tree. Neither
spent a grok turn. Their findings, and what this document changed because of them.

| # | Finding | Severity | What changed here |
|---|---|---|---|
| 1 | Contract field 15 is an enum computed by `flagVerificationState`, not a free string. The draft had a date and a source revision in it | high | field 15 rewritten in 3.2 with the four enum values and the computing function |
| 2 | Field 14 comes from `AGENT_FLAG_PRESETS[grok].helpVerifiedVersion` and must equal the WHOLE distilled version line under strict equality. The draft's shortened value would read 'other-version' against the identical binary | high | field 14 rewritten with the exact string `grok 1.0.4 (d846eb93d94d) [stable]` and the claude precedent |
| 3 | The draft's open question 1 cited src/main/agents/resolve.ts, which does not exist. The module is src/main/tmux/resolve.ts, it never calls realpath, and the stored symlink path survives auto update | high | question 1 is CLOSED with code evidence in field 3 of section 3.2. The blocker became a note |
| 4 | The icon section fell below research 38's own standard. No brand policy read, the SpaceXAI versus SpaceX identity unestablished, the NOTICE and README mitigations still unbuilt, and amp.svg is a file research 38 ordered deleted, not a precedent | high | section 3.7 rewritten around the required policy read, and the operator is told plainly |
| 5 | The proposed `sessionStore` string embedded commentary, and the field is copied verbatim into every manifest row and surfaced in drift warnings | medium | the template is now a pure path and the commentary moved to row notes |
| 6 | The bypass row's provenance was a source line, and `BYPASS_FLAGS` requires the flag seen in the live `--help`. The adversary ran the probe and `--always-approve` IS in the 1.0.4 `--help`, so the row is legal with the right provenance | medium | section 3.6 records the sighting as the provenance |
| 7 | The `identitySubstring: 'grok '` token is the weakest in the registry after pi's none | low | section 3.3 records the stronger json probe and its coupling with field 14, closed by open question 8 |
| 8 | The zero message resume edge. A session killed BEFORE its first turn leaves a directory with zero messages, and nobody measured whether `--resume` treats it as resumable or phones grok.com and 404s | new gap | promoted to open question 1, the designated use of the one unspent probe turn |
| 9 | After reinstall, a TUI resume of a locally deleted session may silently restore from grok.com | note | added to the row notes in 3.1 |
| 10 | The draft never stated the Phase 12.7 F3 bare name half explicitly | low | section 3.4 states both halves |
| 11 | build/conformance-agents.mjs prose says "twelve" at lines 8 and 52 | low | added to the prose sweep in 3.13 |

The design attacks that PASSED, so the synthesis does not weaken them, were the contested `agent`
name (no grok-side read of the name exists anywhere in the design), the two-install machine (PATH
resolution reaches 1.0.4 and the stale 1.0.3 shares the same store, so there is no split), the two
sessions in one folder race (pre-assignment removes it entirely), rewrite-in-place versus append
(Tortie reads nothing from the grok store except existence), /tmp versus /private/tmp (resume by
id is immune because the resolver scans every encoded cwd directory), and the manifest row after
uninstall (`existsSync` follows the dangling symlink, `binaryMissing` fires, the drift sentence
prints, verified in src/main/restore/restore.ts:855 to 895).

---

## 6. Open questions that block building

| # | Question | Why it blocks | Cheapest answer |
|---|---|---|---|
| 1 | Does `--resume` accept a session killed before its first turn, where the directory and summary.json exist with zero messages, or does it treat the session as not found and phone grok.com | a Tortie session created and killed immediately would then fail restore | one turn, the unspent budget. `grok -s <id>` killed before a turn, then `grok --resume <id> -p "say ZEBRA"` in the scratch directory |
| 2 | Offline behavior of the stale id remote fallback | restore error surfacing needs to know whether offline hangs, errors fast or errors slow | zero turns and zero tokens. sandbox-exec denying outbound network, scratch dir, dead UUID |
| 3 | `animatesWhenIdle` in the TUI, and the idle tab title | a wrong value makes idle read as working, the deepseek lesson | zero turns. One TUI launch in a scratch dir, observe the idle prompt for 30 s, read the tmux pane title. The same sitting answers multilineKey and imageDrop insertion without submitting anything |
| 4 | Does grok canonicalize a /tmp cwd to /private/tmp before percent encoding | cosmetic for resume by id, but the sessionStore template should be true | zero turns. Launch the TUI from a /tmp cwd and quit before any turn. The directory exists at init. Inspect the encoded name |
| 5 | Does the bundled skills CLI name grok for `SKILLS_CLI_NAMES` | typecheck forces the row, and null versus a name changes the Context panel | run the bundled skills CLI list command, no grok involvement |
| 6 | Does Tortie pass `--no-auto-update` at launch | a background update swapping `~/.grok/bin` under a live session is untested. tmux holds the old inode so it is probably safe, and probably is not evidence | a decision plus one observation during the phase's roundtrip, checking `~/.grok/bin` before and after |
| 7 | Wordmark legibility at 16 px | the icon may need cropping to the X letterform | the Tier 1 screenshot decides it |
| 8 | Version probe form, `['--version']` with the weak `'grok '` token or `['version', '--json']` gated on `"currentVersion"` | the choice couples to contract field 14, because `helpVerifiedVersion` must equal the distilled first line of the primary probe | zero cost. Read detection.ts:188 to 204 and 282 to 284 for the distill and fallbackArgs semantics, then set the preset string to match |
| 9 | The SpaceX brand policy read for the research 38 row | the repo's own standard requires a read policy and a verdict per mark | one web read of the published brand or media guidelines, recorded in docs/research/38-agent-licences.md |

Questions 1, 2, 3, 8 and 9 must close before the registry row is committed. Questions 4, 6 and 7
close inside the phase at no extra cost. Question 5 closes whenever the skills CLI is run once.

---

## 7. What is not true

**Unverified claims.** Each of these is stated nowhere above as fact.

- Offline behavior of the remote restore fallback is unmeasured (question 2).
- Resume of a zero message session is unmeasured (question 1).
- Whether grok canonicalizes a /tmp cwd is unmeasured, because the scratchpad already sits under
  /private/tmp (question 4).
- Every TUI behavior is unmeasured, being `animatesWhenIdle`, the live tab title transitions, hook
  firing, image drop, the multiline key, resume by title, and fork. No TUI session was ever
  launched.
- Whether headless runs register in `active_sessions.json` mid run was never sampled during a run.
- The first adversary did not read `liveAgentVersion`'s resolution path, so the claim that drift
  facts and detection use the same probe rests on the registry design, not on a read of that
  function.
- Whether the bundled skills CLI names grok is unknown (question 5).
- Whether a background self update under a live session is safe is untested (question 6).
- The safety of the stored symlink bin path is verified in code, not by living through an auto
  update with a session open.

**Turns spent.** The budget was 4. 3 were spent, all by the probe investigation.

| Turn | What it bought | Recorded cost |
|---|---|---|
| 1 | session creation with a pre-assigned UUIDv4, the store path confirmation, and the fd-owner sampling window | total_cost_usd 0.00383996 |
| 2 | same cwd resume with content recall | not recorded |
| 3 | cross cwd resume with content recall and the stderr provenance line | not recorded |

The mapping agent spent 0. Both adversaries spent 0, with two zero turn invocations of `--help`
and `--version` between them. 1 turn remains, earmarked for question 1.

**Where the source reading and the live machine disagreed.** Four disagreements were found, and
each one is why live probes exist.

- The updater swaps `~/.grok/bin/grok` and `~/.grok/bin/agent` in lockstep per
  auto_update.rs:1706 to 1712. On this machine the Aug 15 update moved `grok` to 1.0.4 and left
  `agent` at 1.0.3.
- The docs state the default model is `grok-4.5`. The live store shows `grok-4.6`, and headless
  usage is keyed `grok-4.6-build`.
- The documented `summary.json` field list omits six fields observed live, among them
  `num_chat_messages` and `chat_format_version`.
- The research brief said to expect 22 operator tmux sessions. The live count was 24, before and
  after, unchanged.

**What the draft got wrong before review.** Contract fields 14 and 15 were misdocumented, a cited
file did not exist, the sessionStore template carried commentary, the bypass provenance was the
wrong kind, and the icon section presented an editorial instruction as if it settled the trademark
question. Section 5 records each correction. The values for imageDrop, multilineKey and
animatesWhenIdle remain deliberately absent or floored because they are unmeasured.
