# build/p331 — the wheel scrolls Codex again, and Codex and Claude Code keep their conversation in Tortie's scrollback

Phase 331, "you can't scroll up in the window" (docs/BACKLOG.md, `## Phase 331`; research 133 and 134; his ruling
"i like the inline mode lets do that" and his "ok great" to the two defaults). This is the phase's spec step: the
entry reconciled with the tree at `d8f5c261`, every file:line re-read there, every seam decided with its reason, and
the build split between three builders with disjoint files. Written 2026-09-29.

**What this document is not.** It is not the proof. Every number below is the spec step's own, measured in a scratch
clone of the tree or on a scratch tmux socket, so the builders start from facts rather than guesses. The verifiers
re-derive all of it by methods of their own (§9).

---

## 0. The phase in one paragraph

Tortie launches and resumes every Codex with `-c tui.fullscreen_transcript=false`, carried on BOTH the codex row's
`launch.argv` tail and its `resume.template` and spelled once in `CODEX_SCROLLBACK_ARGS`; it launches every Claude
Code on this Mac with `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` in the claude row's compiled `launch.env`, spelled once
in `CLAUDE_INLINE_ENV`, which Phase 275's rule then refuses on both passthrough lists. One helper,
`ownLaunchFlags(agent, agentArgv)`, sets a row's fixed launch tokens aside for the three readers that recompose a
resume argv or recover a person's flags (`agentExtrasOf`, `recoverLaunchExtras`, `writeRemoteHarvest`), so a
person's own flags are neither lost nor doubled and a row written before the phase still reads right. One boot pass,
`repairInlineSwitchesOnce`, beside Phase 215's codex repair in `resumeIdHarvests`, brings recorded rows across under
Phase 215's rules: every Codex resume argv, here and on another machine, gains the pair (and only the pair); every
local Claude row's `env` gains the variable unless it already names it. Every launchable row gains a compiled screen
record that nothing in the app reads, refused on the overlay. No wheel-router change, no tmux `mouse` change, no
Settings surface, no menu change, no schema migration, no contract move.

---

## 1. Where the entry disagrees with the tree, and what the spec step measured

### 1.1 Measured at this step, so no round re-derives it

All in the spec step's scratch directory (`scratchpad/p331b/spec/`, not in the tree). 0 model turns, 0 tokens, no
Electron. The scratch clone of the tree was an APFS clone with its `.git` file removed before any command ran, so
nothing reached his repository's worktree metadata; it was deleted afterwards. `git -C /private/tmp/wt-p331b status`
reads clean.

| What | Command | Exit | Reading |
| --- | --- | --- | --- |
| The registry change alone (pair on codex `launch.argv` and `resume.template`, the variable in claude `launch.env`), unit tests of every domain the phase touches | `vitest run src/main/{agents,sessions,restart,manifest,machines,settings,config,specstory,restore,conformance,activity} src/shared` in the clone | 1 | 228 files, **3 failed of 4,636**, and exactly these three: `registry.test.ts > argv helpers > injects a pre-assigned id only for agents that take one` (`:430`), `registry.test.ts > buildLaunchSpec registry wiring > codex keeps its harvest mechanics untouched` (`:464`), `codex-repair.test.ts > the row he reported > moves to the thread that spawned it…` (`:128`). Each moved by exactly the two tokens |
| The same change | `node build/conformance-agents.mjs` | 0 | Green: section 2 cannot see a switch come or go, as the entry says. R17 printed the shared refusal set as three names |
| The same change | `node build/contract-inventory.mjs --check` | 0 | Byte identical |
| The same change | `conformance-{derived,machines,logins,handback,choices,installs}.mjs` | 0 each | Green |
| The screen record's type (§2.2) on three rows, and `REFUSED_ROW_FIELDS.screen` | `npm run typecheck` in the clone | 0 | 21 s; import boundaries and cycles green |
| The same | `vitest run src/main/config src/shared src/main/agents` | 1 | 2 failed of 642: the two `registry.test.ts` pins above and nothing else, so `screen` in `REFUSED_ROW_FIELDS` moves no config test |
| The same | `conformance-agents`, `conformance-installs`, `contract-inventory --check` | 0 each | Green, so a new registry field and a new refused row field move no contract line |
| The installed Codex | `codex --version`, `--help`, `resume --help` under a scratch `HOME` and `CODEX_HOME` | 0 each | `codex-cli 0.158.0`. All six VERIFIED codex presets are on both help pages; `--yolo` and `--full-auto` are on neither; `-c/--config`, `--strict-config`, `--no-alt-screen`, `--no-daemon` and `--dangerously-bypass-hook-trust` are listed |
| **Codex 0.158's first-run folder question, in an UNTRUSTED fresh folder** (a case research 133 never measured, because its scratch config trusted the project) | `trust-arm.mjs plain` and `inline -c tui.fullscreen_transcript=false`, scratch `HOME`, dummy key, provider at a closed loopback port, vendored tmux 3.7b with a copy of `resources/gmux-tmux.conf`, socket `p331b-spec-<arm>`, ended in a `finally` | 0 each | **Parent spelling: `alternate_on` 1, `mouse_any_flag` 0, history 0, one `?1049h` and `?1007h`**, the screen `› 1. Trust and continue / 2. Quit / enter continue · esc quit`. **With the switch: `alternate_on` 0, no `?1049h`, no mouse mode, history 10.** So at the parent the wheel over a new folder's trust question is arrow keys too, and under the switch it is not. 2 pids ended per arm, both sockets gone, no process left |
| His Tortie settings file and agents file, NAME counts only | `grep -c` of `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` and `NO_FLICKER` | — | `settings.json`: 0. `agents.json`: absent. So §2.6's refusal and §2.5's patch limit cost him nothing |

### 1.2 Where the entry is wrong or loose, and the decision at each seam

1. **"These existing tests stay green unchanged"** is wrong for three pins (table above). They move because the
   composer's output is exactly what the phase changes. **Decision: Builder A edits exactly those three expectations,
   each by inserting the two tokens and nothing else**, and the verifier diffs them and confirms that is all that
   moved. Every other existing test named in the entry stays unchanged; a fourth that has to change is a finding.
2. **`resumeIdHarvests` does not run once per boot.** It is called at the end of `GmuxCore.refresh()`
   (`src/main/sessions/core.ts:2095`), and `refresh` runs on every `sessions-changed` and `connected` event through
   `scheduleRefresh` (`core.ts:1493-1505`, `:1939-1943`). Phase 215's "once per boot" header on
   `codex-repair.ts` is therefore true of its idempotence and not of its cadence. **Decision: the new pass is latched
   to once per process** (§2.4.2): it runs at the first refresh, sets the latch only when it returns without
   throwing, and does nothing on every refresh after. That makes the entry's "at the next Tortie launch" literally
   true and bounds its cost. `codex-repair.ts` is not changed; this is recorded, not fixed.
3. **There is no Restart dialog that shows flags.** Restart is a menu action that calls `sessions:restart` directly
   (`src/renderer/app/session-actions.tsx:1046`, `:1088`); `extras.ts:109-118`'s "what the restart dialog shows" is
   loose. **Decision: the observable is the replacement row's recorded `argv`**, read from the manifest: it must be
   `[<abs codex>, '-c', 'tui.fullscreen_transcript=false', '--yolo']` for a pre-phase `--yolo` row.
4. **The app runs cannot use a `p331b-*` socket.** `build/electron-run.mjs:264-275` refuses any socket not starting
   with `gmux-`, and `conformance:resume` runs through `build/harness-socket.mjs`, which composes
   `gmux-conformance-<cwd slug>-<pid>` (`package.json:244`). **Decision: raw tmux work by a builder or verifier stays
   on `-L p331b-<role>`; the probe's app runs use `gmux-p331b-<role>-<pid>`; the conformance runs use the harness's
   own composed name.** None is ever `gmux` or `default`, and each is ended by the mechanism that made it. The main
   session should read the task's "`-L p331b-<you>` only" with that exception.
5. **`conformance:resume` and `:capture` start an Electron** (`electron .` through `harness-socket.mjs`,
   `package.json:244`). **Every verifier run of either takes THE LOCK.**
6. **The entry contradicts itself on Codex under his sign-in.** "What is NOT" says "no Codex under his own sign-in";
   the proof's full `conformance:resume` runs codex (in the subset) under his sign-in with two real turns. **Decision:
   the full run includes codex, as the entry's proof and the task both say**, because it is the standing run CLAUDE.md
   owes after an agent-CLI upgrade and codex moved from 0.147 to 0.158. The refusal is research 133 question 3's
   separate zero-turn launch to test the background server, which stays unmade. The verdict says what the codex case
   leaves: a session record in his Codex store, and (because the harness answers Codex's trust question in a fresh
   scratch folder, `clearTrustGate`) one trust entry for that scratch folder in his `~/.codex/config.toml`, the cost
   every full run has always had.
7. **The update guards omit cursor.** Phase 321's fix round measured cursor-agent installing a new version 41 s after
   a launch (`build/p321/SPEC.md` §1.2 item 6). **Decision:** every run that creates agents points
   `AGENT_CLI_UPDATE_CHECK_URL` at a closed loopback port, the probe also passes cursor's own
   `--disable-auto-update` as a create extra, and every run records each agent install's realpath and mtime before
   and after; a moved install is reported in the verdict, never absorbed.
8. **Inherited Claude Code variables reach every pane.** The app does not strip `CLAUDECODE` or `CLAUDE_*` from its
   environment (no hit under `src/main`), a verifier runs inside a Claude Code session that carries eleven of them
   (the messaging token among them), and research 134 measured `CLAUDE_CODE_SESSION_KIND=bg` beating the switch.
   **Decision: the probe strips every `/^(?:CLAUDECODE|CLAUDE_)/` name and `ZDOTDIR` from the app's environment
   (`build/p321/probe-p321.mjs:218-221`'s `STRIPPED`), and every verifier runs `conformance:resume` and
   `:capture` with the same names removed** (`env -u …`). The probe reads each Claude pane's environment and a
   `CLAUDE_CODE_SESSION_KIND` there makes that arm UNREADABLE.
9. **Codex's trust question is fullscreen at the parent** (§1.1). The registry's 0.147 note quotes "Do you trust the
   contents of this directory?"; 0.158 says "Trust this folder?", which `TRUST_DIALOG_PATTERNS`'s second clause
   already matches (`src/main/conformance/cases.ts:235-238`). `conformance:resume`'s create reading for codex lands on
   that question in a fresh folder and must read `alternate_on` 0 at HEAD (measured above in tmux).
10. **Phase 270 carries passthrough NAMES to a session on another machine** (`src/main/machines/remote-env-carriage.ts`,
    `remote-sessions.ts:861-870`), and compiled `launch.env` never travels there (`REMOTE_ENV_ALLOWED`,
    `remote-env.ts:85-88`). So after this phase a person who routed `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` to a remote
    Claude through Settings loses that route (§2.6), and Claude's per-agent refusal sentence "This agent already sets
    … itself" is true on this Mac and not of a Claude elsewhere. **That is Phase 275's standing behaviour: it holds
    today for cursor's `FORCE_COLOR` and grok's `GROK_PRIVACY_NOTICE_ROLLOUT` in exactly the same way.** Stated, not
    fixed; his settings file names the variable 0 times.
11. `REFUSED_ROW_FIELDS` spans `src/shared/agent-overlay.ts:632-661` at this head, not `:632-651`.
12. `REFUSED_COMPILED` in `p275-env-shared-seal.test.ts:458` is a fixture fed to the sanitizer, not a pin against the
    registry, and the p275 union test (`:566-582`) is derived, so neither would notice a fourth name or a lost
    third. **The literal "exactly three" pin goes in Builder A's new test (A6).** `REFUSED_COMPILED` still gains the
    name, as the entry says.
13. The entry's line numbers otherwise hold at `d8f5c261`: `registry.ts:528`, `:554-559`, `:637-639`, `:697`, `:726`,
    `:731`, `:1836-1837`, `:1945`, `:1999-2017`; `launch-plan.ts:101-104`; `extras.ts:96-150` (Shape 1 `:135-136`);
    `restart.ts:141`; `remote-record.ts:659-664`; `codex-repair.ts:244`; `id-harvest.ts:319`, `:328-338`, `:408`,
    `:438`, `:532`, `:639`; `restore.ts:777`, `:1026-1036`; `remote-arm.ts:193-199`, `:286`;
    `remote-restore.ts:417`; `sessions-repository.ts:300`, `:311`, `:358-359`; `codecs.ts:282-292`;
    `confirm.ts:114`; `flags.ts:193`; `store.ts:192-196`; `ipc.ts:189`; `scroll.ts:13-18`;
    `assert-electron-teardown.mjs:326` (153).

---

## 2. The seams, decided

### 2.1 The two constants, and where the tokens are spelled

In `src/main/agents/registry.ts`, directly above `AGENT_REGISTRY`, and nowhere else in `src/`:

```ts
export const CODEX_SCROLLBACK_ARGS = ['-c', 'tui.fullscreen_transcript=false'] as const;
export const CLAUDE_INLINE_ENV = { CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN: '1' } as const;
```

The codex row, exactly these two lines (the ablation's needles, §2.10):

```ts
      argv: ['codex', ...CODEX_SCROLLBACK_ARGS],
      template: ['resume', SESSION_ID_SLOT, ...CODEX_SCROLLBACK_ARGS],
```

The claude row's `launch`, exactly this line between `argv` and `quirks`:

```ts
      env: { ...CLAUDE_INLINE_ENV },
```

Why these spellings, and the comment above each constant says so in a few lines:

- **Codex** (research 133 §2.6, §5): Codex's own named Scrollback mode; the Ctrl+T pager stays on the alternate
  screen and off tmux history; the background-server allowlist admits the key as a bool
  (`codex-rs/tui/src/daemon_startup.rs:63`, source only); a later `-c …=true` in the person's own flags undoes it; a
  Codex before 2026-09-11 ignores it silently and Tortie never passes `--strict-config`. `--no-alt-screen` is refused
  (a dead pane before 2026-01, no later flag undoes it, the pager draws inline and its close clears history) and
  `-c tui.alternate_screen="never"` is refused (drops the shared background server with a visible warning). The switch
  is on the template because `resumeArgvFor` never reads `launch.argv` (`registry.ts:1999-2017`) and `codex resume`
  restores no launch flag.
- **Claude** (research 134 §1, §4.1, §5): an environment variable a Claude before 2.1.132 ignores, so it cannot kill
  a pane; it holds on `claude --resume <id>`; it beats a saved `tui: fullscreen` and `CLAUDE_CODE_NO_FLICKER=1`; it
  loses to the person's settings env block saying `"0"` and to `CLAUDE_CODE_SESSION_KIND=bg`, which Tortie never sets;
  it reaches this Mac only. `--settings '{"tui":"default"}'` is refuted (two `--settings`, the last wins, and
  `withClaudeSettingsFlag` skips the hook file when one is present, `src/main/activity/hooks.ts:965-972`).
- Both comments say the Phase 320 line "Tortie does not choose an agent's renderer" (`docs/BACKLOG.md:34153-34155`)
  is superseded for these two rows by his ruling of 2026-09-29.

`AgentLaunchInfo.argv` stays `string[]` and `env` stays `Record<string, string>`; the typed spread compiles (§1.1).
Both constants are exported from `src/main/agents/index.ts` beside `SESSION_ID_SLOT`.

### 2.2 The screen record

**The type**, in `registry.ts` beside `AgentActivityProfile`. A discriminated union, so a carriage exists exactly on
a switch and the compiler holds that:

```ts
export type AgentScreenClass = 'switch-to-inline' | 'inline-already' | 'fullscreen-with-mouse' | 'unknown';

interface AgentScreenFacts {
  /** The version read and how, e.g. '0.84.2, 2026-09-29, live (research 134)'. */
  measured: string;
  /** Refused switches and known behaviour, each with its reason. Display only. */
  notes: readonly string[];
}

export type AgentScreenRecord =
  | (AgentScreenFacts & { class: 'switch-to-inline'; carriage: 'argv'; tokens: readonly string[] })
  | (AgentScreenFacts & { class: 'switch-to-inline'; carriage: 'env'; env: Readonly<Record<string, string>> })
  | (AgentScreenFacts & { class: 'inline-already' | 'fullscreen-with-mouse' | 'unknown' });
```

**The field**: `screen?: AgentScreenRecord` on `AgentRegistryEntry`, directly after `activity?`, optional for the
same reason `activity?` is: the two capture-only IDE rows carry none. `conformance:agents` 11.1 and test A7 require
it on every launchable compiled row. `MergedAgentEntry` and `LaunchableEntryLike` inherit it optionally; a patched
row keeps the compiled record through the spread (`overlay.ts:1098-1103`) and a configured agent (`fromRow`,
`overlay.ts:1048-1087`) has none, which reads as "no record", never as a class.

**Where it sits on each row**: directly after the row's `activity` property (`registry.ts:579`, `:665`, `:759`,
`:836`, `:897`, `:1009`, `:1110`, `:1187`, `:1272`, `:1359`, `:1441`, `:1574`, `:1687`). The two switches name their
tokens FROM the constants, so the record and the row cannot disagree without `conformance:agents` 11.2 or 11.3 going
red:

| Row | `class` | Carriage and payload | `measured` (exact string) | `notes` (one string each) |
| --- | --- | --- | --- | --- |
| claude | switch-to-inline | `carriage: 'env', env: CLAUDE_INLINE_ENV` | `'2.1.284 and 2.1.285, 2026-09-29, live (research 134)'` | beats a saved `tui: fullscreen` and `CLAUDE_CODE_NO_FLICKER=1`; loses to the person's settings env `"0"` and to `CLAUDE_CODE_SESSION_KIND=bg`; ignored before 2.1.132; reaches this Mac only; refused `--settings '{"tui":"default"}'` and why |
| codex | switch-to-inline | `carriage: 'argv', tokens: CODEX_SCROLLBACK_ARGS` | `'0.158.0, 2026-09-29, live (research 133)'` | refused `--no-alt-screen` and `-c tui.alternate_screen="never"`, each with its reason; the first-run folder question is fullscreen with no mouse without the switch |
| cursor | inline-already | — | `'2026.09.18, 2026-09-29, live (research 134)'` | clears with `ESC[H ESC[2J ESC[3J` on mount and on every resize, then prints its latest 10 turns until `/full-conversation` |
| gemini | inline-already | — | `'0.60.0, 2026-09-29, read only (research 134)'` | `ui.useAlternateBuffer` defaults to false, and opting in asks for `1002/1006`, which the pass-through serves; Ctrl+S turns the mouse on inline; refused `--screen-reader`, `GEMINI_CLI_SYSTEM_SETTINGS_PATH`, `--gemini_dir` |
| droid | unknown | — | `'not installed, 2026-09-29 (research 134)'` | Factory's docs name no screen or mouse setting |
| deepseek | fullscreen-with-mouse | — | `'0.8.26, 2026-09-29, live (research 134)'` | asks for `1049` and `1000/1002/1003/1015/1006`; `--no-alt-screen` and `tui.alternate_screen = "never"` are ignored on 0.8.26; refused CodeWhale's `never` (0.9.12+): a viewport that commits nothing to host scrollback, forces the mouse off, config file only |
| antigravity | fullscreen-with-mouse | — | `'1.2.8, 2026-09-29, read only (research 134)'` | full-screen in a `tmux-256color` pane by its own log, mouse mode numbers unmeasured; its only switch is `altScreenMode: "never"` in its settings file; refused a planted `SSH_CONNECTION`; over ssh it probably runs inline (unmeasured) |
| muse | inline-already | — | `'1.4.1, 2026-09-29, live (research 134)'` | inline on create and on `resume <uuid>`; its bundled skill text calling it an alternate-screen agent is wrong |
| qwen | fullscreen-with-mouse | — | `'0.22.0, 2026-09-29, read only (research 134)'` | asks for `1049`, and `1002` or `1003` with `1006`; its only real switch is `ui.useTerminalBuffer: false` in the person's settings; refused `--screen-reader`, `QWEN_CODE_SYSTEM_SETTINGS_PATH`, `QWEN_HOME` and any truthy `CI_*` variable |
| pi | inline-already | — | `'0.84.2, 2026-09-29, live (research 134)'` | `--tui-mode regular` (0.84.0+) beats `tuiMode: fullscreen` and is recorded, not compiled, because an older pi dies on the unknown flag after its trust question |
| omp | inline-already | — | `'18.0.11, 2026-09-29, live (research 134)'` | first paint sends `CSI H 2J 3J`; each resize borrows the alternate screen for about 120 ms (upstream can1357/oh-my-pi#10232) |
| grok | unknown | — | `'1.0.41, 2026-09-29, read only (research 134)'` | `--minimal` is the inline spelling and is held until measured (Experimental, a bare flag, and its binary says both sticky and session-scoped); `--no-alt-screen` is not inline; `auto` may depend on whether Tortie's control-mode client is the current client |
| opencode | fullscreen-with-mouse | — | `'1.18.32, 2026-09-29, live (research 134)'` | asks for `1049` and `1000/1002/1003/1006`; refused `--mini` (1.17.10+): image drop regresses, an older opencode prints only help and exits, every resize clears and replays; `OTUI_USE_ALTERNATE_SCREEN` in the pane kills it |

The pi record's `measured` string is the ablation's anchor for arm B2 and must be unique in the file.

**Nothing in the app reads `screen` at runtime.** Its readers are `conformance:agents`, `conformance:resume` (§2.8)
and the tests. The boot pass reads the two constants, never `screen`.

**Refused on the overlay.** `REFUSED_ROW_FIELDS` gains, as its last entry, exactly:

```ts
  screen:
    'Tortie does not read screen from configuration. It is Tortie’s own ' +
    'record of how each agent it ships draws its screen, and it runs nothing.'
```

`ROW_KEYS` (`overlay.ts:706-717`), `AgentOverlayV1` and `AGENT_OVERLAY_JSON_SCHEMA` do not change and must not name
it. Without the refusal entry the row would still be dropped, by `noUnknownKeys`, with the SAME field
(`agents[0].screen`) and the "check the spelling" sentence; test A9 therefore asserts the refusal SENTENCE, which is
what makes ablation B3 go red.

**Not in `ConfigExecutionFields`** (`confirm.ts:114`), not in `EMPTY_EXECUTION_FIELDS` (`:221`), and
`executionFieldsOf` (`overlay.ts:153-180`) reads no `.screen`, because the canonical text emits every key even when
empty and a new key would move the hash of every confirmed row (research 134 §4.1). With both switches in fields the
hash already covers (`launchArgv`, `resumeTemplate`, `launchEnv`), only a person holding an execution-bearing
`agents.json` patch of codex or claude is asked to confirm again, which `overlay.ts:139-180` calls intended.

### 2.3 One helper for the person's own flags

In `registry.ts`, beside `compiledLaunchEnvKeys`, exported and re-exported from `src/main/agents/index.ts`:

```ts
/** The tokens a COMPILED row fixes after argv[0]. Empty for every row but codex today. */
export function fixedLaunchTokens(agentId: string): readonly string[];

/**
 * The flags a person launched this agent with: `agentArgv` after its argv[0], with the
 * compiled row's fixed launch tokens set aside WHEN THEY LEAD, and unchanged when they do not
 * (a row written before its agent had fixed tokens).
 */
export function ownLaunchFlags(agentId: string, agentArgv: readonly string[]): string[];
```

`fixedLaunchTokens` reads `BY_ID` (the compiled table only, never the overlay, so no import cycle and no dependence
on a configuration file, the rule `compiledLaunchEnvKeys` already states) and answers `entry.launch.argv.slice(1)`,
or `[]` for an unknown id or a row with no launch. The body of `ownLaunchFlags` is three lines, and its middle line is
the ablation's needle for C3:

```ts
  const rest = agentArgv.slice(1);
  const fixed = fixedLaunchTokens(agentId);
  if (fixed.length > 0 && fixed.every((token, i) => rest[i] === token)) return rest.slice(fixed.length);
  return rest;
```

**Why the compiled row and not the merged one.** All three callers compose through the compiled registry
(`composeResumeArgv` → `registryResumeArgv`, `resume-argv.ts:65`; `writeRemoteHarvest` → `registryResumeArgv`,
`remote-record.ts:659`; `recoverLaunchExtras` → `registryLaunchArgv`, `extras.ts:135`), so the tokens set aside must be
the tokens that composer puts back.

**The pre-phase shapes it accepts**, each a row of test file F:

| Recorded agent argv | `ownLaunchFlags('codex', …)` |
| --- | --- |
| `[<abs>/codex, '--yolo']` (before the phase) | `['--yolo']` |
| `[<abs>/codex, '-c', 'tui.fullscreen_transcript=false', '--yolo']` (after) | `['--yolo']` |
| `[<abs>/codex, '-c', 'tui.fullscreen_transcript=false', '-c', 'tui.fullscreen_transcript=true']` | `['-c', 'tui.fullscreen_transcript=true']` |
| `[<abs>/codex, '--yolo', '-c', 'tui.fullscreen_transcript=false']` (a pre-phase person's own pair, not leading) | `['--yolo', '-c', 'tui.fullscreen_transcript=false']`, kept |
| `[<abs>/codex, '-c', 'tui.fullscreen_transcript=false', '--yolo']` written BEFORE the phase by a person | `['--yolo']`: the stated limit; nothing runs differently because the composer puts the same pair back |
| any argv for any other agent | `argv.slice(1)`, exactly today's answer |

**The three callers:**

1. `agentExtrasOf` (`launch-plan.ts:101-104`) becomes
   `return ownLaunchFlags(rec.agent, inner !== undefined && inner.length > 0 ? inner : rec.argv);`. It feeds
   `codex-repair.ts:244` and `id-harvest.ts:408`, `:438`, `:532`, `:639`, so the rescue, admission and repair paths
   compose what the create-time harvest composes (the harvest is handed the create's own extras, which never held the
   pair).
2. `recoverLaunchExtras` (`extras.ts:96-150`): after `withoutHookSettings(…)` and the shell early return, one new line
   (the needle for C4) and Shape 1 reads it instead of `argv`; Shape 2 keeps reading the original `argv`:
   ```ts
     const asLaunched = [bin, ...fixedLaunchTokens(agent), ...ownLaunchFlags(agent, argv)];
   ```
   For every agent without fixed tokens `asLaunched` has exactly `argv`'s elements, so nothing but codex moves. A
   pre-phase `[<abs>/codex, '--yolo']` row now matches Shape 1 and answers `['--yolo']` where today it answers null
   and Restart silently drops `--yolo`. The header comment's "WHY TWO CANDIDATE SHAPES" gains one sentence for it.
3. `writeRemoteHarvest` (`remote-record.ts:659-664`): the extras argument becomes exactly (needle for C5)
   ```ts
       ownLaunchFlags(input.agent, record.argv),
   ```
   with `record.argv[0]` still the bin. It is the one recomposition `agentExtrasOf` does not reach (research 134
   §4.2).

Claude's env switch touches none of them.

### 2.4 The boot pass

#### 2.4.1 The module and its API

New file `src/main/sessions/inline-repair.ts`, headed like `codex-repair.ts` (what it does, what it never does, the
rules it is judged on). Exports:

```ts
export type InlineRepairArm = 'argv-here' | 'argv-elsewhere' | 'env';
export type InlineRepairVerdict =
  | 'rewritten'          // one write of resumeArgv or env
  | 'already-right'      // byte identical
  | 'no-id'              // codex row with no conversation id
  | 'no-resume-argv'     // codex row with no recorded resume argv, or the composer declined
  | 'capture-lost'       // the wrap could not be rebuilt: left exactly as it is, never armed bare
  | 'unreadable'         // a wrapped argv whose inner command cannot be read back
  | 'binary-differs'     // the recorded resume argv names another program than the composer would
  | 'recorded-differs'   // the composition is not the recorded argv plus the pair
  | 'threw';             // this row's own read or write threw; the row keeps what it had

export interface InlineRepairOutcome {
  sessionId: string;
  name: string;
  agent: string;
  arm: InlineRepairArm;
  verdict: InlineRepairVerdict;
}

/** The narrow store the pass needs, so a test can wrap it. */
export type InlineRepairStore = Pick<ManifestStore, 'listSessions' | 'updateSession'>;

export function repairInlineSwitches(manifest: InlineRepairStore): InlineRepairOutcome[];
export function repairInlineSwitchesOnce(manifest: InlineRepairStore): InlineRepairOutcome[] | null;
export function resetInlineRepairForTests(): void;
```

`repairInlineSwitches` is the pure pass and has no latch. `repairInlineSwitchesOnce` returns null without reading
anything once a pass in this process has returned; it sets the latch only after `repairInlineSwitches` returned
without throwing.

It imports only: `../agents/registry` (`CODEX_SCROLLBACK_ARGS`, `CLAUDE_INLINE_ENV`, `ownLaunchFlags`,
`registryResumeArgv`), `./launch-plan` (`agentExtrasOf`), `./resume-argv` (`composeResumeArgv`), `../specstory`
(`isWrappedArgv`, `unwrapArgv`), `@shared/workspace-target` (`LOCAL_MACHINE_ID`), `../log`, and types from
`../manifest`. It opens no file, reads no agent store, spawns nothing and signals nothing.

#### 2.4.2 Where it runs, and its order

In `resumeIdHarvests` (`id-harvest.ts:319`), directly after the codex repair's `try`/`catch` (`:328-338`) and
before the claim seeding (`:346`), its own block (the call line is the needle for C6):

```ts
  // PHASE 331. …why, in a few lines…
  try {
    repairInlineSwitchesOnce(deps.manifest);
  } catch (err) {
    sessionsLog.warn(
      `the inline switch pass did not finish: ${(err as Error).message}. ` +
        'Every row it did not reach keeps its resume command and its environment.'
    );
  }
```

**After the codex repair, on purpose.** The repair recomposes a moved row through `composeResumeArgv` with
`agentExtrasOf` (§2.3), so a row it moves already carries the pair and this pass then finds it `already-right`: one
write per row across both passes. Run first, such a row would be written twice. **Before the claim seeding and the
rescue**, like the repair, so nothing below it reads a row mid-change. The pass changes no `agentSessionId`, so the
claim map is unaffected either way.

#### 2.4.3 The argv arm: Codex, on this Mac and on another machine

Rows: `rec.agent === 'codex'`, every status including `discarded` (a restore of a discarded row is the undo of a
Remove, `sessions-repository.ts:909-911`, so restore can reach the Past list), here and elsewhere.

1. No `agentSessionId` (or empty) → `no-id`. Its harvest or rescue composes with the new template and the helper.
2. No `resumeArgv` (or empty) → `no-resume-argv`. The pass never arms a row that was not armed.
3. `recorded = rec.resumeArgv`. `recordedInner = isWrappedArgv(recorded) ? unwrapArgv(recorded) : recorded`; a
   wrapped argv whose `unwrapArgv` answers `[]` → `unreadable`.
4. **Already right** (the needle for C8, written once, before the branch):
   ```ts
     if (carriesPair(recordedInner)) return left('already-right');
   ```
   `carriesPair(argv)` is true when some `i ≥ 1` has `argv[i] === '-c'` and `argv[i + 1] ===
   'tui.fullscreen_transcript=false'` (the constant's two tokens, read from the constant). Any position counts,
   leading or trailing, so a person's own pair, the repair's composition and a row this pass already wrote are all
   left byte identical. A `--config` spelling of the same value does not count and is recomposed; harmless, same
   value, stated.
5. **Here** (`(rec.machineId ?? LOCAL_MACHINE_ID) === LOCAL_MACHINE_ID`):
   `composed = composeResumeArgv(rec, 'codex', rec.agentSessionId, agentExtrasOf(rec))`. Null → `no-resume-argv`.
   `composed.captureLost` → `capture-lost` (the needle for C7 is
   `    if (composed.captureLost) return left('capture-lost');`): **never armed bare**, which is where this pass
   differs from `codex-repair.ts:258-263`, because a scroll fix is no reason to stop a person's capture.
6. **Elsewhere**: a row carrying `specstory` → `unreadable` (no remote row is captured today; the rule refuses to
   guess). Otherwise
   ```ts
     const composed = registryResumeArgv('codex', id, ownLaunchFlags('codex', rec.argv), recorded[0]);
   ```
   (the needle for C9 is its last argument, `recorded[0]);`). The recorded far `argv[0]` is kept by construction;
   `armedResumeTokens` already admits the pair because it is in the template (`remote-arm.ts:193-199`), so the arm
   types `[binOnMachine, …recordedResumeArgv.slice(1)]` (`:286`) with the pair in it. `[]` → `no-resume-argv`.
7. **The composition must be the recorded argv plus the pair and nothing else.** `composedInner` is the unwrapped
   composition. If `composedInner[0] !== recordedInner[0]` → `binary-differs` (a hand-edited binary is left alone;
   the composer never reads today's `PATH` anyway). If both are wrapped, `recorded.slice(0, -1)` must deep-equal
   `composed.argv.slice(0, -1)` (the wrapper's own words: bin, `run`, provider, flags, `-c`), else
   `recorded-differs`; a wrapped-versus-bare mismatch is `recorded-differs`. Then `composedInner` with its FIRST pair
   at `i ≥ 1` removed must deep-equal `recordedInner`, else `recorded-differs`. So the pass only ever inserts the two
   tokens, and a row whose resume argv an older build or a person shaped differently is reported, not rewritten.
8. Otherwise one write, `manifest.updateSession(rec.id, { resumeArgv: composed.argv })` → `rewritten`.

#### 2.4.4 The env arm: Claude, on this Mac only

Rows: `rec.agent === 'claude'` and local (the needle for L3 is the dispatch line
`  if (rec.agent === 'claude' && isLocalRow(rec)) return envArm(manifest, rec);`), every status, whatever the argv
(a SpecStory-wrapped Claude row gets the env and keeps its argv: restore puts `rec.env` on the pane
(`restore.ts:1035`) and the wrapper's child inherits it, measured by research 134).

- `const env = rec.env ?? {}`. **If the row's env already names the variable, with any value, `"0"` included, it is
  `already-right` and byte identical** (the needle for L4 and B1):
  ```ts
    if (Object.hasOwn(env, name)) return left('already-right');
  ```
- Otherwise `merged = { ...env, ...CLAUDE_INLINE_ENV }` (the variable appended last, every other key kept in its
  order; an absent `env` gains a one-key record, exactly what a create at HEAD records) and one write (the needle for
  L2): `  manifest.updateSession(rec.id, { env: merged });` → `rewritten`.

A Claude row on another machine, and every row of any other agent or of a shell, is never read past its `agent` and
`machineId` columns.

#### 2.4.5 The rules it is judged on

Phase 215's (`codex-repair.ts` header), plus the entry's two:

- **No row is ever emptied.** Every non-`rewritten` verdict leaves the row as it was; the argv arm writes only a
  non-empty composition; the env arm only adds.
- **A captured row is re-wrapped or left alone**, never armed bare.
- **A row already right is byte identical.**
- **A row with no id is left alone.**
- **Every Claude row on another machine, and every row of any other agent, is byte identical.**
- **One write per row, of `resumeArgv` or `env` alone**, through `updateSession` with a one-key patch. The pass
  writes the manifest and nothing else. It is a plain write, not `updateSessionDurably`: a write lost to a power cut
  is redone at the next launch, because the pass is idempotent. **Superseded by the fix round:** the write is one of
  two one-column statements, `setResumeArgvColumn` and `setEnvColumn`, because `updateSession` writes every column
  back from the decoded row (§As built — the fix round).
- **`agentContract`, `agentSessionId`, `argv`, `resumeCapture` and `resumeProvenance` never move.** The contract is
  write-once (`sessions-repository.ts:358-359`) and records the template in force at launch, which stays true.
- **No provenance note** (the entry left it to this step): the provenance describes where the conversation id came
  from and how strongly it is tied to the pane, and this pass touches neither; a new provenance field would also be a
  new shape in a manifest JSON column. The log line says what moved. The commit body says so.
- **Idempotent by construction.** After a write the argv arm's row carries the pair and the env arm's row names the
  variable, so step 4 and the `hasOwn` check answer `already-right` on the next pass. A digest over every row after
  pass 2 equals the digest after pass 1, and pass 2 makes no write.
- **One row's failure is that row's.** Each row's work is inside its own `try`; a throw is `threw` and the loop goes
  on. A throw from `listSessions` itself escapes, the latch stays unset, the next refresh tries again, and the caller's
  `catch` keeps the rescue running.
- **No schema migration**, so `gate:contract` does not move.
- **A pane whose holder shell started before the pass keeps its env or its view until its next restore.** Stated.

#### 2.4.6 What it says

One `sessionsLog.info` line per pass that wrote anything, counts only: Codex rows given the pair here and on other
machines, Claude rows given the variable, and rows left for each verdict. One `sessionsLog.warn` per row left
`capture-lost`, `unreadable`, `binary-differs`, `recorded-differs` or `threw`, naming the session's name and the
verdict and **no argv token and no env value**.

#### 2.4.7 The hostile rows, and the outcome each must have

| Row | Outcome |
| --- | --- |
| Codex, local, pre-phase, argv `[abs, '--yolo']`, resume `[abs, 'resume', id, '--yolo']` | `rewritten` to `[abs, 'resume', id, '-c', 'tui.fullscreen_transcript=false', '--yolo']` |
| Codex already carrying the pair, trailing (a HEAD create's harvest) or leading (`[abs, '-c', …, 'resume', id]`) | `already-right`, byte identical |
| Codex, pre-phase, a person's own pair after another flag (`argv [abs, '--yolo', '-c', 'tui…=false']`) | `already-right` (the person's pair counts), byte identical |
| Codex captured, pre-phase, wrap rebuildable | `rewritten`: the wrapper's own words unchanged, the pair inside specstory's single `-c` string, the capture record untouched |
| Codex captured, wrap not rebuildable (an empty inner element, `canWrapArgv` false) | `capture-lost`, byte identical |
| Codex on another machine, pre-phase | `rewritten`: tail recomposed, recorded far `argv[0]` kept |
| Codex whose recorded resume argv names another binary than its launch argv | `binary-differs`, byte identical |
| Codex with no id; Codex with an empty resume argv | `no-id`; `no-resume-argv` |
| Claude local, no `env` | `rewritten` to `{ CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN: '1' }` |
| Claude local, `env` with other keys | `rewritten`, other keys kept in order, variable last |
| Claude local, `env` naming the variable as `"0"` (or `"1"`) | `already-right`, byte identical |
| Claude on another machine | untouched |
| Claude SpecStory-wrapped | env `rewritten`, argv and resume argv byte identical |
| Claude patched with its own `launch` (row env from the patch) | `rewritten` (the pass reads no patch; §2.5) |
| Any row of cursor, gemini, droid, deepseek, antigravity, muse, qwen, pi, omp, grok, opencode, shell | untouched |
| A write that throws on the second row | that row `threw`, every other row as the table says |

### 2.5 An agent patched by the person's `agents.json` — the limit, stated rather than composed

**Decision: state the limit.** `patch()` replaces a present key wholesale and never merges into the compiled value
(`overlay.ts:1097-1128`), and the confirm gate hashes the MERGED entry the person agreed to. Composing the switch
into a restated `launch` would make the merged launch something neither the compiled row nor their file says and move
the hash they confirmed. What follows, and the commit body says it:

- **Codex** patched with its own `launch`: its create runs without the pair (fullscreen); its resume is composed by
  the harvest through the COMPILED template (`resume-argv.ts:65`), so its first restore is inline.
- **Claude** patched with its own `launch`: its create's row `env` is the patch's; the pass adds the variable at the
  next Tortie launch; its first restore after that is inline. A patch whose `launch.env` sets the variable itself
  (`"0"` included) keeps its value.
- Only people holding an `agents.json` patch of codex or claude that restates `launch` are affected. His
  `agents.json` does not exist.

### 2.6 The Claude variable on the passthrough lists

No code: the variable being in a compiled `launch.env` is what refuses it. `compiledLaunchEnvKeys('claude')`
(`registry.ts:1846`) now answers it, so Claude's own list refuses it (`ipc.ts:189`, `sanitizeEnvPassthrough`,
`store.ts:908-913`), and `sharedRefusedEnvKeys()` (`store.ts:210-217`) now answers three names, so the shared list
refuses it (`sanitizeEnvPassthroughShared`, `store.ts:920-923`) and `loadFile` reports a name already there. The
sentences are `envPassthroughRefusal`'s existing two (`src/shared/agent-overlay.ts:597-606`): shared "An agent Tortie
launches already sets CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN itself. Pick one source for each name.", Claude's own
"This agent already sets CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN itself. Pick one source for each name." Both are true
on this Mac; §1.2 item 10 is the standing limit for a Claude elsewhere. The p275 refused set grows from two to three:
`REFUSED_COMPILED` (`p275-env-shared-seal.test.ts:458`) gains the name, and test A6 pins the three literally.

### 2.7 Comments, notes and the catalog that move in the same commit (Builder A)

- `compiledLaunchEnvKeys`'s doc (`registry.ts:1836-1837`): "all but three, being cursor's `FORCE_COLOR`, grok's
  `GROK_PRIVACY_NOTICE_ROLLOUT` and Claude Code's `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` (Phase 331)".
- `sharedRefusedEnvKeys`'s doc (`store.ts:192-196`): "Today exactly three", naming the third.
- cursor's quirk (`registry.ts:639`): names Claude Code's variable, Phase 331.
- The claude row gains one `launch.quirks` line: research 134, the 2.1.132 floor, what the switch beats and loses to,
  this Mac only.
- The codex row: `launch.quirks` gains one line naming the fixed tokens and the constant; `resume.notes` gains the
  0.158 measurements: fullscreen by default since 2026-09-22; under Tortie's `mouse off` it asks tmux `#{mouse}`
  through a trusted-directory tmux and asks for no mouse; launch flags are still not restored by `codex resume`, which
  is why the pair is on the template; the first-run folder question reads "Trust this folder?" and is fullscreen with
  no mouse without the switch (§1.1). `activity`, `multilineKey`, `imageDrop` and `specstory` do not change on either
  row.
- `src/main/agents/flags.ts`, the codex catalog: `helpVerifiedVersion: 'codex-cli 0.158.0'`; the `--yolo` description
  says it is not in 0.158.0's help and is accepted on launch and resume (research 133 §4.4: `permissions: YOLO mode`
  after `resume <id> -c … --yolo`); the `--full-auto` description names 0.158.0; `resumeNote` names what 0.158.0's
  `resume --help` lists (`-c/--config`, `-s`, `-a`, `--approve-for-me`,
  `--dangerously-bypass-approvals-and-sandbox`, `--search`). **Every provenance stays what it is**: the six VERIFIED
  flags are on both 0.158.0 pages, `--yolo` and `--full-auto` on neither. No preset is added.
- `src/main/tmux/scroll.ts` header item 2 (`:13-18`), comment only: Codex and Claude draw in the normal buffer because
  Tortie launches Codex in Scrollback mode and Claude with `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` (Phase 331,
  research 133 and 134); Codex 0.158's own default is a fullscreen view that, under Tortie's `mouse off`, asks for no
  mouse. The diff must be comment-only (the verifier compares the file with comments blanked), so `probe:p292` is not
  owed for it.

### 2.8 `conformance:resume`'s screen reading (Builder C)

**GMUX_CONF_AGENTS is honoured** (`src/main/conformance/resume.ts:189-199`): the requested ids are filtered against
`LAUNCHABLE_AGENT_IDS`, and an unknown id is dropped SILENTLY, so a verdict lists the agents the report actually
contains.

- New pure module `src/main/conformance/screen-class.ts`:
  - `export interface ScreenReading { alternateOn: boolean; mouseAny: boolean; historySize: number }`
  - `export async function readScreen(tmuxId: string): Promise<ScreenReading | null>`, one `display-message -p`
    of `#{alternate_on}\t#{mouse_any_flag}\t#{history_size}` through `tmux.execTmux` (the harness's own socket);
    null on any failure.
  - `export function judgeScreen(agent: LaunchableAgentId, reading: ScreenReading | null): { class: AgentScreenClass | 'none'; fail: string | null; mismatch: string | null }`,
    reading `getLaunchableEntry(agent).screen`. **A `switch-to-inline` row fails when the reading says
    `alternate_on` 1, and when there is no reading at all** (a gate that could not look has not passed); the fail
    sentence names the agent and says its inline switch was renamed, dropped or overridden. The failure clause is
    the needle for B4 and is written as one line:
    `  if (record.class === 'switch-to-inline' && (reading === null || reading.alternateOn)) return failed(agent, reading);`.
    Every other class returns `fail: null` and a `mismatch` sentence when the reading disagrees with the class
    (`inline-already` expects 0/0, `fullscreen-with-mouse` expects 1/1, `unknown` expects nothing).
- `resume.ts`: the **create reading** is taken right after `stages.add('launch', true)` (after the boot
  `waitForQuiet`, `resume.ts:414`) and **before** the capture-mode early `SKIP` for first-turn harvesters
  (`:487-499`), so codex is read in `GMUX_CONF_MODE=capture` too. A fail there finishes the case `FAIL`. The **resume
  reading** is taken right after `stages.add('fire', true)` (`:625`), in the full run only. Both land on the result.
- `report.ts`: `AgentConformanceResult` gains
  `screen?: { class: string; create?: ScreenReading; resume?: ScreenReading; mismatch?: string[] }`, which reaches
  `GMUX_CONF_JSON` with the rest; `renderTable` gains a `SCREEN` column after `ROUNDTRIP` (class, then
  `create a/m`, then `resume a/m`, a `!` on a mismatch); `renderDetail` prints one `screen` line per agent. The four
  existing `report.test.ts` rows use `toContain` and stay green unchanged.

This is what makes the run owed after any agent-CLI upgrade catch the next Codex or Claude that renames, drops or
overrides its switch.

**Corrected by the fix round (§As built — the fix round).** As first built the gate could not fail for Claude: the
harness's scratch folder is new every run, Claude Code 2.1.285 draws its folder question on the NORMAL screen at every
build, and the create reading landed on that question, so a Claude with no switch read `0/0` and passed (lens 3,
measured). A switch row now has its trust question answered BEFORE the create reading, the harness answers Claude's
refusal-first shape with one Down, and a trust question it saw and could not answer leaves no reading, which fails the
switch. The sentence above holds for Codex as built and for Claude only since the fix round.

### 2.9 `conformance:agents` section 11 (Builder C)

`build/agents-conformance-probe.mts` emits a `p331` block, read from the registry's own exports: each compiled row's
`id`, `launchable`, `screen` (or null), `launch.argv`, `launch.env`, `resume.template`; `launchArgvFor(codex,
['--p331-own'], '/abs/codex')` and `resumeArgvFor(codex, 'P331-ID', ['--p331-own'], '/abs/codex')`;
`compiledLaunchEnvKeys` per launchable id; `sharedRefusedEnvKeys()`; `REFUSED_ROW_FIELDS.screen`; the confirm hash of
the merged codex and claude entries with and without `screen` deleted (`executionFieldsOf` + `executionHash`, the
section 4 seam); and one driven `parseAgentOverlay` per case below. `build/conformance-agents.mjs` gains **Section 11
— the screen record and the two switches (Phase 331)** in section 10's shape (a judge per row, in-memory attacks per
row that must each read red, a printed table), plus TypeScript-parser reads of `src/main/config/confirm.ts` and
`src/main/config/overlay.ts`:

| Row | Clause | In-memory attacks that must read red |
| --- | --- | --- |
| 11.1 | Every launchable compiled row declares `screen` with one of the four classes, a non-empty `measured` and a `notes` array; a carriage exists exactly on `switch-to-inline`; the two IDE rows declare none | pi's record deleted; a class `'inline'`; a carriage on an `inline-already` row |
| 11.2 | A `switch-to-inline` argv row's `launch.argv` ends with its `tokens` and so does its `resume.template`; the composed launch is `[bin, ...tokens, '--p331-own']` and the composed resume `[bin, 'resume', 'P331-ID', ...tokens, '--p331-own']`, the tokens once in each | the tokens off the template; the tokens off `launch.argv`; the tokens twice in the composed resume |
| 11.3 | A `switch-to-inline` env row's `launch.env` holds every pair of its `env`, and each name is in `compiledLaunchEnvKeys(<row>)` and in `sharedRefusedEnvKeys()` | the name off `launch.env`; the value `'0'`; the name off the shared refused set |
| 11.4 | `REFUSED_ROW_FIELDS.screen` stands with a sentence; `ROW_KEYS`, `AgentOverlayV1` and the schema name no `screen`; `ConfigExecutionFields` declares no `screen` member and `executionFieldsOf` reads no `.screen`; the confirm hash is equal with and without `screen`; DRIVEN, a new agent, codex patched and claude patched each carrying `screen` are dropped with field `agents[0].screen` and the refusal sentence, and two controls (a new agent without it, codex with a display name only) are kept | the refusal deleted (source copy); `'screen'` added to `ROW_KEYS` (source copy); `screen?: unknown;` added to `ConfigExecutionFields` (source copy); a refused row answered as kept; a control answered as refused; unequal hashes |
| 11.5 | Exactly two rows are `switch-to-inline`: codex with argv carriage and claude with env carriage | a third (pi) made a switch; claude's carriage made argv |

The printed line under the table says how many rows went through the shipping loader and that nothing was written
or started. CLAUDE.md's `conformance:agents` row gains one sentence for section 11 and names `ablation:p331` as the
attack beside it.

### 2.10 `ablation:p331` (Builder C)

`build/p331/ablation.mjs`, `npm run ablation:p331`, in `build/p321/ablation.mjs`'s shape: a `cp -Rc` clone of
`src/`, `build/` (without `build/vendor`, which is symlinked if needed) and the config files under
`/private/tmp/p331-ablation-<pid>-…`, `node_modules` symlinked; one clause broken at a time in the SHIPPING source; the
named owners must each go red BY NAME; every edited file restored and checked by sha256 before the next arm; an
UNEDITED CONTROL green first and last; the clone removed in a `finally` and on SIGINT, SIGTERM and SIGHUP; the
worktree's own bytes asserted unmoved at the end. Each needle must match its file EXACTLY ONCE (zero or two is a
failure of the arm, printed). Vitest runs only the owning files; `conformance:agents` runs in the clone for the arms
whose owners include an 11.x row, and its output must name that row failed. `P331_ONLY=C1,L2` runs named arms. No
Electron, no tmux, no agent, no token.

| Arm | File | Needle → replacement | Owners that must go red |
| --- | --- | --- | --- |
| C1 | registry.ts | `      argv: ['codex', ...CODEX_SCROLLBACK_ARGS],` → `      argv: ['codex'],` | A1, 11.2 |
| C2 | registry.ts | `      template: ['resume', SESSION_ID_SLOT, ...CODEX_SCROLLBACK_ARGS],` → `      template: ['resume', SESSION_ID_SLOT],` | A2, 11.2 |
| C3 | registry.ts | the `ownLaunchFlags` line `  if (fixed.length > 0 && fixed.every((token, i) => rest[i] === token)) return rest.slice(fixed.length);` → removed | F2, F6 |
| C4 | restart/extras.ts | `  const asLaunched = [bin, ...fixedLaunchTokens(agent), ...ownLaunchFlags(agent, argv)];` → `  const asLaunched = [...argv];` | F8 |
| C5 | machines/remote-record.ts | `    ownLaunchFlags(input.agent, record.argv),` → `    record.argv.slice(1),` | F7, F6 |
| C6 | sessions/id-harvest.ts | `    repairInlineSwitchesOnce(deps.manifest);` → removed | R18 |
| C7 | sessions/inline-repair.ts | `    if (composed.captureLost) return left('capture-lost');` → removed | R5 |
| C8 | sessions/inline-repair.ts | `  if (carriesPair(recordedInner)) return left('already-right');` → removed | R3 |
| C9 | sessions/inline-repair.ts | in the elsewhere composition, `recorded[0]);` → `undefined);` | R6 |
| L1 | registry.ts | `      env: { ...CLAUDE_INLINE_ENV },` → removed | A4, A6, 11.3 |
| L2 | sessions/inline-repair.ts | `  manifest.updateSession(rec.id, { env: merged });` → removed | R9 |
| L3 | sessions/inline-repair.ts | `  if (rec.agent === 'claude' && isLocalRow(rec)) return envArm(manifest, rec);` → `  if (rec.agent === 'claude') return envArm(manifest, rec);` | R12 |
| L4 | sessions/inline-repair.ts | `  if (Object.hasOwn(env, name)) return left('already-right');` → `  if (env[name] === '1') return left('already-right');` | R11 |
| B1 | sessions/inline-repair.ts | the same line → removed | R15 |
| B2 | registry.ts | pi's whole `screen: { … },` property (anchored on its unique `measured` string, braces matched) → removed | A7, 11.1 |
| B3 | shared/agent-overlay.ts | the `screen:` entry of `REFUSED_ROW_FIELDS` (two lines of text plus the key) → removed | A9, 11.4 |
| B4 | conformance/screen-class.ts | the `switch-to-inline` fail line → removed | S1 |
| CTRL | — | none | every owner above green |

If a builder writes a needle line differently, the integrator moves the arm's needle, not the code, and says so.

### 2.11 `probe:p331` (Builder C)

`build/p331/probe-p331.mjs`, `npm run probe:p331` (`node build/p331/probe-p331.mjs`). Its header says what it drives,
what it refuses and the variables it needs, in `build/p321/probe-p321.mjs`'s and `build/p292/probe-p292.mjs`'s shape.
It reaches `build/electron-run.mjs`, so `HELPER_USER_FLOOR` rises by one. Research 133's scratch harnesses
(`scratchpad/p331/b/probe-b.mjs` for the renderer's xterm `onData` hook through the React fiber of
`.gmux-terminal-mount`, `__gmuxShotDrive`, and CDP `Input.dispatchMouseEvent` wheel events; `scratchpad/p331/adv/
adv-arm.mjs` for the mock Responses provider and the Codex scratch config) are the starting shape while they last;
nothing in the tree may name their paths.

**Launches.** ONE Electron at the parent (`P331_PARENT_CHECKOUT`, a BUILT checkout of the phase's parent; absent or
unbuilt → exit 2 with one sentence), then ONE at HEAD (this checkout), one after the other, never at once, on the SAME
scratch profile, HOME, harness directory and socket `gmux-p331b-<pid>`. The parent launch passes no `tmuxSocket` to
`withElectron` so its server survives into the HEAD run; the HEAD launch passes it, and the probe's own `finally`
also kills that server and unlinks its socket file. No third launch: idempotence is proven over the manifest copy
(§9.2). Env for both: `withoutDevRenderer({...STRIPPED, HOME, GMUX_TMUX_SOCKET, GMUX_PROBES: '1', GMUX_LOG_FILE: '1',
GMUX_SPECSTORY_NO_CLOUD: '1', GMUX_CONFIG_ROOT, GMUX_HARNESS_DIR, GMUX_TMUX_BIN: <vendored tmux>, the guards})`.

**The scratch HOME.**
- A `.zprofile` and `.zshrc` that put `P331_AGENT_PATH` first on `PATH`. Its default is the directories, in the
  probe's own `PATH` order, that hold one of `claude`, `cursor-agent`, `codex`, `codewhale`/`codew`/`deepseek`, `muse`,
  `pi`, `omp`, `opencode`, plus the directory of the `node` Codex's launcher needs. Order matters: his
  `~/.npm-global/bin/codex` is broken and comes after `~/.local/bin` (research 133 §2.1).
- Codex (research 133's adversary shape): `auth.json` from `codex login --with-api-key` with a dummy key;
  `config.toml` with `check_for_update_on_startup = false`, `cli_auth_credentials_store = "file"`, the model provider
  pointed at the probe's in-process mock Responses server on `127.0.0.1`, `approval_policy = "on-request"`,
  `sandbox_mode = "workspace-write"`, `[features] daemon_auto_start = false`, each scratch project trusted,
  `[tui] screen_reader_detection_done = true`; `history.jsonl` seeded with three entries. The mock answers a marked
  prompt with one escalated `exec_command` (the approval) and anything else with an assistant message; it spends 0
  tokens and nothing leaves the Mac for a model. Codex's fetch of `https://github.com/openai/plugins.git` into the
  scratch HOME is stated in the report; if a config key turns it off, the probe sets it.
- Claude (research 134 A's shape): a fake `ANTHROPIC_API_KEY`; `~/.claude.json` with `hasCompletedOnboarding: true`,
  the fake key's last 20 characters approved, the scratch projects trusted; `~/.claude/settings.json`
  `{ "tui": "fullscreen" }`, so the parent's Claude is fullscreen whatever his own settings say.
- Guards reaching every pane: `DISABLE_AUTOUPDATER=1`, `MUSE_NO_AUTO_UPDATE=1`, `OPENCODE_DISABLE_AUTOUPDATE=1`,
  `AGENT_CLI_UPDATE_CHECK_URL=http://127.0.0.1:9/`, `OMP_SKIP_SETUP=1` (the conformance harness's own, so omp reaches
  its prompt), omp's `startup.checkUpdate` off in its scratch config. The probe reads each pane's environment and an
  arm whose pane lacks a guard, or carries `CLAUDE_CODE_SESSION_KIND`, is UNREADABLE.

**Before any arm, exit 2 as UNREADABLE rather than pass a defect it never saw:** the scratch login shell resolves
every one of the eight bare names, `codex --version` reads 0.158 or later and `claude -v` 2.1.132 or later; the
report records which of `/opt/homebrew/bin/tmux`, `/usr/local/bin/tmux` and `/opt/local/bin/tmux` exist; and if the
parent's Codex pane reads `mouse_any_flag` 1 (a Mac where Codex's tmux check cannot run), the reproduction arms are
UNREADABLE. Every agent install's realpath and mtime are recorded before the first launch and after the last.

**Codex arms.** At HEAD the probe first reads the Codex process command lines from the process table: exactly
`codex -c tui.fullscreen_transcript=false` at create and `codex resume <id> -c tui.fullscreen_transcript=false`
followed by the person's own flags at restore (the first in-app drive of this spelling).

| Arm | Parent (required) | HEAD (required) |
| --- | --- | --- |
| (a) three wheel notches over a fresh Codex composer after a `!seq` | xterm sends `\eOA` ×3, the composer recalls history, `pane_in_mode` 0 | xterm sends nothing, `pane_in_mode` 1, `scroll_position` > 0, the top row older, the composer unchanged |
| (b) three notches over an open approval (the mock's escalated `exec_command`) | the highlighted answer moves off `1. Yes, proceed`: recorded, **never pressed**; the approval is then declined with Esc | the highlighted answer unchanged, nothing reaches Codex, tmux history scrolls |
| (c) Ctrl+T, three notches, `q` | recorded | the pager on the alternate screen; tmux `history_size` equal before, during and after; nothing reaches the composer after close |
| (d) a Codex the PARENT created with extras `--yolo` and harvested (one mock turn), its tmux session ended out of band before the HEAD launch (the reboot) | made here | the pass rewrote its resume argv once (read from the manifest); restore arms it with the pair and `--yolo`; after the Enter: `alternate_on` 0, the header reads `permissions: YOLO mode`, and (a)'s readings hold on it |
| (e) Restart of that pre-phase row | not run | the replacement row's recorded argv is `[<abs codex>, '-c', 'tui.fullscreen_transcript=false', '--yolo']` (§1.2 item 3) and its pane is inline |
| (f) a Codex created with the person's own `-c tui.fullscreen_transcript=true` | not run | `alternate_on` 1: the person's choice wins, and the wheel over it reproduces the parent's arrows, the stated limit behind the no-preset default |
| (g) a SpecStory-captured Codex, created, then restored after an out-of-band end | as (a) | the wrapped argv carries the pair inside specstory's one `-c` string, the capture indicator holds, `alternate_on` 0, (a)'s readings hold |
| (h) controls: a plain shell, `vim` with no mouse, a stand-in (`build/p331/stand-in-sgr.mjs`) that asks for `1049` plus SGR mouse and echoes what arrives | shell: Tortie scrolls; vim: arrows; stand-in: SGR reports | identical to the parent, byte for byte on what xterm sent |
| (i) a new folder's Codex trust question (an untrusted scratch folder) | `alternate_on` 1, `mouse_any_flag` 0: recorded | `alternate_on` 0 (§1.1's tmux reading, now in the app); nothing pressed |

**Every agent.** claude, cursor, codex, deepseek, muse, pi, omp and opencode, each created through the app's own
create path (the preload bridge's `sessions:create`, which the renderer's store calls) in its own scratch folder, with
only the flags and keys needed to reach the main screen, the same at both builds (deepseek `--skip-onboarding`,
cursor `--disable-auto-update`). Cursor has no sign-in under a scratch HOME and stops at its login screen; the probe
says the main chat was not reached. Per agent and per build: the count of `ESC[?1049h` in a `pipe-pane -o` stream
from create until the screen settles; after settling `#{alternate_on}`, `#{mouse_any_flag}` and `#{history_size}`;
the mouse modes seen in the stream.

| Agent | Parent | HEAD |
| --- | --- | --- |
| claude | `1049` present, mouse on | `1049` absent, `mouse_any_flag` 0 |
| codex | as arm (a) | as arm (a) |
| cursor, muse, pi, omp | `1049` absent, mouse off | identical to the parent on every reading |
| deepseek, opencode | `1049` present, mouse on | identical to the parent on every reading |

**A non-switched agent whose HEAD reading differs from its parent reading fails the phase, whatever its class
says.**

**Claude arms.**
- (j) **Resume.** The probe ends a parent-made Claude row's tmux session out of band, plants a fabricated 120-line
  transcript at the row's own session file under the scratch HOME (`~/.claude/projects/<dashEncode(realpath(cwd))>/
  <id>.jsonl`, research 134 A's line shape, every word invented), and restores through the app. Parent:
  `alternate_on` 1 and history 0. HEAD: the pass merged the variable into the row (read from the manifest),
  `alternate_on` 0, mouse 0, and `capture-pane -S -1000` holds transcript line 001. Line 001 absent at HEAD because
  the plant did not take is UNREADABLE, not a pass.
- (k) **The wheel and the history surfaces** over the inline Claude and the inline Codex at HEAD: three notches
  (xterm sends nothing, copy mode moves), the scrollbar thumb, and the local capture of the last 1000 lines holding
  line 001.
- (l) **A reader parked in copy mode across a window resize made at least 33 s after the attach, and across a
  return to the session**, by `probe:p292`'s arms d and f methods. A classic Claude or an inline Codex that sends
  `CSI 3J` and replays would move the reader; that is recorded as found, not assumed.
- (m) **The tmux hint.** The parent's fullscreen Claude line "tmux detected · scroll with PgUp/PgDn …" is recorded,
  and HEAD's screen must not hold it.
- (n) **Settings.** Through the Settings IPC, `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` added to the shared list and to
  Claude's own list is dropped, and the sentence each scope composes is printed; both must be §2.6's two sentences.
- (o) **A running process keeps its view.** A Claude the parent created and never ended still reads `alternate_on`
  1 at HEAD until it is restored (the stated limit, measured).

Electrons are counted once, at the end, with CLAUDE.md's command. Every agent pid the probe saw is ended by pid in its
`finally` (TERM, then KILL). No Simulator, no photograph. The report is JSON under the harness directory;
`P331_KEEP=1` keeps it and the pane streams for the verifier; `P331_ARMS` runs named arms.

### 2.12 The words, the tables and the counters (Builder C)

- **`CHANGELOG.md`**, one item under `## Unreleased` → `### Fixed`, first in that list, one line, no link yet (the
  follow-up docs commit adds it):

  > - The trackpad and mouse wheel scroll a Codex session again instead of bringing back your earlier prompts or moving the answer picked when Codex asks permission, and capturing the last lines of a Codex or Claude Code session now holds its whole conversation rather than one screen. Tortie starts both in their scrollback view from now on, so Claude Code's own mouse scrolling, Focus view and diff panel are not available inside Tortie, a Claude Code on another machine keeps its full-screen view, a session already running keeps its view until it is next restored or restarted, and the Up and Down keys still bring back earlier prompts in Codex

- **`package.json`**: `"probe:p331": "node build/p331/probe-p331.mjs"` and `"ablation:p331": "node build/p331/ablation.mjs"`.
- **`build/verification-checks.mjs`**: `electron('probe:p331')` and `pure('ablation:p331')`, each with a comment in the
  file's style, so `gate:checks` classifies both ways.
- **`build/assert-electron-teardown.mjs`**: `HELPER_USER_FLOOR` from 153 to 154, with one sentence in its comment. If
  Phase 330 lands first and raises it, whoever commits second sets parent + 1 and says so in the body.
- **`CLAUDE.md`**, the gate table and the probe table only:
  - the `conformance:agents` row gains one sentence: since Phase 331 it also holds that every launchable row declares
    a compiled screen record of one of four classes, that exactly codex (argv) and claude (env) are switch-to-inline
    with the switch on both `launch.argv` and `resume.template` or in `launch.env` and `sharedRefusedEnvKeys()`, and
    that `screen` is refused on the overlay and absent from `ConfigExecutionFields`; `ablation:p331` is the attack
    beside it;
  - the `conformance:resume:capture` row gains "and each row's screen class (`#{alternate_on}` and
    `#{mouse_any_flag}` after create, a switch-to-inline row on the alternate screen failing)", and its trigger list
    gains `sessions/inline-repair.ts` and `conformance/screen-class.ts`;
  - the probe table gains a `probe:p331` row: triggers `CODEX_SCROLLBACK_ARGS` and `CLAUDE_INLINE_ENV` and the screen
    records in `src/main/agents/registry.ts`, `src/main/sessions/inline-repair.ts`, `ownLaunchFlags` and
    `recoverLaunchExtras`; cost "about 20 to 30 minutes, TWO Electrons one after the other on one profile, the parent's
    first (`P331_PARENT_CHECKOUT`), no model turn, no token"; one sentence on what it reads.
- **Menus**: none. No user-facing surface is added, renamed or removed.

---

## 3. The builders

Three builders, disjoint files. **No builder launches an Electron.** No builder runs `conformance:resume` in either
mode. Every builder runs `npm run typecheck` and the unit tests of its own files, then its path gates, before it
returns, and returns every file it changed, every command with its exit code, and anything this document got wrong.
Raw tmux, if any, on `-L p331b-<builder>` only, ended in a `finally`.

### Builder A — the row and the readers

**Owns:** `src/main/agents/registry.ts`, `src/main/agents/index.ts`, `src/main/agents/flags.ts`,
`src/shared/agent-overlay.ts`, `src/main/settings/store.ts` (comment only), `src/main/sessions/launch-plan.ts`,
`src/main/restart/extras.ts`, `src/main/machines/remote-record.ts`, `src/main/tmux/scroll.ts` (comment only),
`src/main/agents/__tests__/registry.test.ts` (the two pins, §1.2 item 1, plus a claude `launch.env` pin beside grok's
at `:155-162`), `src/main/settings/__tests__/p275-env-shared-seal.test.ts` (`REFUSED_COMPILED` only),
`src/main/sessions/__tests__/codex-repair.test.ts` (the `:128` expectation only), and two NEW test files.

**Builds** §2.1, §2.2, §2.3, §2.6 and §2.7.

**NEW `src/main/agents/__tests__/p331-inline-switch.test.ts`**, with these `it` titles exactly (the ablation's
owners):
- A1 `the codex launch argv carries the scrollback pair once, from the constant`
- A2 `the codex resume argv carries the scrollback pair once, from the constant`
- A3 `a person's own -c tui.fullscreen_transcript=true trails the pair on launch and on resume`
- A4 `the claude launch env carries CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1 from the constant, and create records it`
  (`buildLaunchSpec('claude', …).env` and `newSessionRecord(…).env`)
- A5 `the claude variable reaches the pane at create and at restore` (`paneEnvFor(rec.env, {}, id, {}, {})`, the one
  function both spawn sites call)
- A6 `both passthrough lists refuse the claude variable, with a true sentence` (the union of
  `compiledLaunchEnvKeys` over `LAUNCHABLE_AGENT_IDS` is exactly `['CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN',
  'FORCE_COLOR', 'GROK_PRIVACY_NOTICE_ROLLOUT']`; both sanitizers drop it; both `envPassthroughRefusal` sentences are
  §2.6's)
- A7 `every launchable row declares a screen record, and only the IDE pair declares none`
- A8 `exactly codex and claude are switch-to-inline`
- A9 `a configuration row carrying screen is dropped whole with the refusal sentence` (new agent, codex patch, claude
  patch; the problem's `field` is `agents[0].screen` and its `message` is `REFUSED_ROW_FIELDS.screen`)
- A10 `screen never reaches the confirm hash` (no `screen` key in `EMPTY_EXECUTION_FIELDS`; the hash of merged codex
  and claude with and without it is equal)
- A11 `every other launchable row composes the argv and env it composed before this phase`, against this literal
  table read at `d8f5c261`:

  | id | `launch.argv` | `launch.env` | `resume.template` | extras |
  | --- | --- | --- | --- | --- |
  | claude | `['claude']` | (now) `{CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN:'1'}` | `['--resume', SLOT]` | trailing |
  | cursor | `['cursor-agent']` | `{FORCE_COLOR:'1'}` | `['--resume', SLOT]` | trailing |
  | codex | (now) `['codex', '-c', 'tui.fullscreen_transcript=false']` | none | (now) `['resume', SLOT, '-c', 'tui.fullscreen_transcript=false']` | trailing |
  | gemini | `['gemini']` | none | `['--resume', SLOT]` | trailing |
  | droid | `['droid']` | none | `['--resume', SLOT]` | trailing |
  | deepseek | `['codewhale']` | none | `['resume', SLOT]` | leading |
  | antigravity | `['agy']` | none | `['--conversation', SLOT]` | trailing |
  | muse | `['muse']` | none | `['resume', SLOT]` | trailing |
  | qwen | `['qwen']` | none | `['--resume', SLOT]` | trailing |
  | pi | `['pi']` | none | `['--session-id', SLOT]` | trailing |
  | omp | `['omp']` | none | `['--resume', SLOT]` | trailing |
  | grok | `['grok']` | `{GROK_PRIVACY_NOTICE_ROLLOUT:'0'}` | `['--resume', SLOT]` | trailing |
  | opencode | `['opencode']` | none | `['--session', SLOT]` | trailing |

**NEW `src/main/sessions/__tests__/p331-own-flags.test.ts`**, `it` titles exactly:
- F1 `a row written before this phase: its own flags are everything after the binary`
- F2 `a row written after this phase: the pair is set aside and its own flags follow`
- F3 `a row whose own flags begin with the pair: the leading pair is read as the registry's (the stated limit)`
- F4 `a captured row reads its own flags from the capture record, before and after this phase`
- F5 `a pre-phase row whose own flags carry the pair after another flag keeps it`
- F6 `the harvest, the rescue and the remote harvest compose byte-identical resume argvs for the same row`
  (`composeResumeArgv` with the create's extras, `composeResumeArgv` with `agentExtrasOf`, and `writeRemoteHarvest`
  through `setRemoteManifest` over a temp `ManifestStore`, one bin)
- F7 `the remote harvest composes the pair once and keeps the far binary`
- F8 `Restart keeps --yolo on a row written before this phase`
- F9 `Restart keeps --yolo on a row written after this phase`
- F10 `the SpecStory wrap still finds its own -c around a codex argv carrying the pair` (`wrapArgv`,
  `isWrappedArgv`, `unwrapArgv` over a captured create and resume; `specstoryQuoteArg('tui.fullscreen_transcript=false')`
  needs no escape)
- F11 `commandRunsAgent still reads a captured codex carrying the pair as codex` (the `ps` line
  `<specstory> run codex --no-version-check --silent -c codex -c tui.fullscreen_transcript=false --yolo`)
- F12 `every other agent's own flags are what they were` (`agentExtrasOf` equals `argv.slice(1)` for a row of each
  other launchable agent, claude's `--settings` and `--session-id` included)

**Hermetic:** no test opens anything under the real HOME. **Gates:** `npm run typecheck`, the vitest files above
plus `src/main/restart`, `src/main/sessions`, `src/main/machines`, `src/main/config`, `src/main/settings`,
`src/main/specstory`, `src/main/agents`; `conformance:agents`, `:installs`, `:choices`, `:logins`, `:machines`,
`:phonecopy` (registry.ts is edited, `displayName` is not), `gate:checks`, `gate:contract`.

### Builder B — the boot pass

**Owns:** NEW `src/main/sessions/inline-repair.ts`, `src/main/sessions/id-harvest.ts` (one import and one block,
§2.4.2), NEW `src/main/sessions/__tests__/p331-inline-repair.test.ts`.

**Builds** §2.4, against Builder A's exports named in §2.1 and §2.3 (`CODEX_SCROLLBACK_ARGS`, `CLAUDE_INLINE_ENV`,
`ownLaunchFlags`, `registryResumeArgv`, and `agentExtrasOf` as §2.3 changes it). Until A lands, B's tests may be red on
the missing pair only; the integrator runs them green together.

**The test file**, over a temp `ManifestStore` (`codex-repair.test.ts:55-111`'s shape), `it` titles exactly:
- R1 `a codex row written before this phase gains the pair once and keeps --yolo`
- R2 `a codex row already carrying the pair, leading or trailing, is byte identical` (verdict `already-right`)
- R3 `a pre-phase codex row whose own flags already end with the pair is byte identical`
- R4 `a captured codex row is re-wrapped with the pair inside the capture command`
- R5 `a captured row whose wrap cannot be rebuilt is left exactly as it is`
- R6 `a codex row on another machine has its tail recomposed and keeps its far argv[0]`
- R7 `a codex row whose resume argv names another binary is left alone`
- R8 `a row with no conversation id, and a row with no resume argv, are left alone`
- R9 `a local claude row with no env gains a one-key record`
- R10 `a local claude row with other env keys keeps them and gains the variable`
- R11 `a claude row whose env holds "0" is byte identical`
- R12 `a claude row on another machine is byte identical`
- R13 `a SpecStory-wrapped claude row gains the variable and keeps its argv`
- R14 `every row of every other agent is byte identical` (one row of each other launchable agent and a shell)
- R15 `two passes: the second writes nothing and the digests are equal` (a spy on `updateSession`; the digest is
  `JSON.stringify(listSessions())`)
- R16 `each write is one patch of resumeArgv or env alone, and the id and the contract never move`
- R17 `a write that throws half way leaves every other row as it was` (a wrapper whose `updateSession` throws on its
  second call)
- R18 `resumeIdHarvests runs the pass after the codex repair and still runs the rescue when the pass throws`
  (`vi.mock('../codex-repair')` records its call, so no test opens a Codex store; the pass's first write comes after
  it; then a `listSessions` that throws on the pass's read: `resumeIdHarvests` returns, the claim seeding still reads
  the rows, and the latch stays unset)
- R19 `the pass runs once per process` (`repairInlineSwitchesOnce` twice: the second returns null and reads nothing;
  `resetInlineRepairForTests` in `beforeEach`)

**Gates:** `npm run typecheck`; the new file, `codex-repair.test.ts`, `launch-plan.test.ts`,
`p141-resume-in-place.test.ts`, `src/main/manifest/__tests__/harvest-claim-race.test.ts`,
`resume-capture.test.ts`; `conformance:derived`; `gate:checks`; `gate:contract`.

### Builder C — the gates, the attack, the probe and the words

**Owns:** `build/conformance-agents.mjs`, `build/agents-conformance-probe.mts`, NEW
`src/main/conformance/screen-class.ts`, `src/main/conformance/resume.ts`, `src/main/conformance/report.ts`, NEW
`src/main/conformance/__tests__/p331-screen.test.ts`, NEW `build/p331/ablation.mjs`, NEW `build/p331/probe-p331.mjs`,
NEW `build/p331/stand-in-sgr.mjs` (and a `build/p331/mock-responses.mjs` if the mock is kept out of the probe), and
**the shared files**: `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs`,
`CLAUDE.md`, `CHANGELOG.md`.

**Builds** §2.8, §2.9, §2.10, §2.11 and §2.12, reading A's and B's names and test titles from this document.

**`p331-screen.test.ts`**, `it` titles exactly:
- S1 `a switch-to-inline row on the alternate screen fails`
- S2 `a switch-to-inline row on the normal screen passes`
- S3 `any other row records a mismatch with its class and never fails`
- S4 `a missing reading fails a switch-to-inline row and is recorded for any other`

**Gates:** `npm run typecheck`; `p331-screen.test.ts` and `report.test.ts`; `conformance:agents` (section 11 green
with every self-test red, once A has landed); `node build/p331/probe-p331.mjs --self-test` if the probe carries grader
fixtures; `node build/p331/ablation.mjs` once A and B have landed (the integrator's otherwise); `gate:checks`,
`gate:electron`, `gate:background`, `gate:contract`. **C does not run the probe** (it starts Electrons) and does not
run `conformance:resume`.

---

## 4. The integrator

Reconciles the seams this document names: A's exports against B's and C's imports, every ablation needle matching
exactly once, every owner title existing. Runs `npm run typecheck && npm run build && npm run smoke:t1`, then the full
battery (`npm test`, `npm run smoke`, `npm run smoke:t3`, `npm run package`), then `conformance:agents`,
`:installs`, `:choices`, `:logins`, `:derived`, `:machines`, `:phonecopy`, `ablation:p331` (control green, every arm
red on its owners), `gate:checks`, `gate:electron`, `gate:background`, and `gate:contract` byte identical. States
whether `src/main/restore/restore.ts` or `src/main/sessions/resume-in-place.ts` was touched (the design touches
neither, so `conformance:handback` is owed only if one was). Launches no Electron and so does not run
`conformance:resume` or the probe. Diffs the three moved pins of §1.2 item 1 and confirms each moved by the two tokens.

---

## 5. Hard rules for every role

- Edit only the files this document assigns you. `/Users/gdc/gmux`, `/Users/gdc/codex`, `/Users/gdc/tortiedotsh` and
  `/Users/gdc/superset` are read only. Never commit, stage or stash.
- **Never start gemini, qwen, agy or grok in any form, not even `--help`.** Every run that creates agents sets
  `GMUX_CONF_AGENTS=claude,cursor,codex,deepseek,muse,pi,omp,opencode` (honoured, §2.8) or, for the probe, names
  exactly the eight. Droid is not installed.
- Every run that creates agents removes `CLAUDECODE`, every `CLAUDE_*` name and `ZDOTDIR` from the environment it
  hands the app, and exports the update guards of §2.11 (§1.2 items 7 and 8).
- Codex outside the full `conformance:resume` runs only under a scratch `HOME` and `CODEX_HOME` with a dummy key,
  `daemon_auto_start = false`, `check_for_update_on_startup = false` and a loopback mock provider. Claude outside it
  only under a scratch `HOME` with a fake key.
- **Model turns are spent in two places only, both by verifiers:** the one full `conformance:resume` (his sign-in,
  the eight) and the Claude question re-read through `probe:p314`'s Claude route. Every verdict says how many turns it
  spent.
- Never read his keychain, a credential or auth file, an agent's session store or conversation text, or his APNs
  key. His Tortie manifest may be COPIED read only (§9.2) and deleted in a `finally`; nothing beyond agent ids and
  counts is printed from it. Install nothing; decline any update. Never `-L gmux` and never his default server;
  sockets per §1.2 item 4. Never `pkill`; his Tortie is never signalled. `npm run shot` is forbidden. Every process a
  run starts ends in a `finally`, by pid.
- **Verifiers take THE LOCK** before any Electron, `conformance:resume` and `:capture` included:
  `mkdir <scratchpad>/electron.lock && echo p331 > <scratchpad>/electron.lock/owner`; on failure wait 60 s and retry
  in a new command; after 60 minutes report and stop; release with `rm -rf <scratchpad>/electron.lock` on the same
  command line as the run. Every Electron goes through `build/electron-run.mjs` (the conformance harness through
  `harness-socket.mjs`).

---

## 6. Stated limits (what cannot be proven here, and what the phase leaves as it is)

- Whether the Codex switch keeps Codex's shared background server rests on source (`daemon_startup.rs:63`).
- A Mac with no trusted-directory tmux: the parent arm there is UNREADABLE by design; this Mac has Homebrew's.
- A real session on another machine: the pass over the manifest copy's remote Codex rows is the evidence; remote
  scrolling is Phase 320.1's. A Claude on another machine stays as today; a person who routed the variable to one
  through Settings loses that route (§1.2 item 10).
- Any Codex but the installed 0.158.x and any Claude but the installed one; older builds rest on source, changelog and
  `git log`.
- Claude while it streams; Claude under managed or policy settings; a shell start-up file exporting `"0"` (the holder
  shell starts after tmux sets the pane env, so it probably wins, which is the person's own opt-out).
- Gemini, Qwen, Antigravity, Grok and Droid live; their records rest on installed files, strings and docs.
- A real trackpad's momentum rather than CDP wheel events.
- A patched codex or claude that restates `launch` (§2.5).
- A pre-phase row whose own extras began with the pair shows one flag fewer to Restart (§2.3); nothing runs
  differently.
- A running process keeps the view it started with until its next restore or restart; Tortie never ends or restarts a
  session.
- A Codex resume argv an older build or a person shaped differently from today's composition is left and reported
  (`recorded-differs`), not rewritten; the verifier counts how many his manifest holds.
- `codex-repair.ts` runs on every refresh, not once per boot (§1.2 item 2). Recorded, not fixed.

## 7. What is NOT in this phase

Everything under the entry's `### What is NOT in this phase` stands (`docs/BACKLOG.md`, Phase 331). Restated where a
builder could drift: no switch or fixed launch token for any agent but codex and claude; no `--settings` JSON and no
`tui` key in Tortie's hook file; no Claude variable on another machine (`REMOTE_ENV_ALLOWED` unchanged); no change to
the wheel router (`src/renderer/terminal/scroll/**`, `src/renderer/terminal/keys/index.ts`) or to tmux's `mouse`
option; no fullscreen preset, no opt-back setting, no Settings surface, no menu change; no write to any agent's own
configuration; no new field in `ConfigExecutionFields`; no change to any row's `agentContract`, no schema migration;
no change to any activity profile, dialog shape or `animatesWhenIdle`; no widening of `ARGV_REJECTED_PATTERNS`; no
edit to `codex-repair.ts`'s logic; no edit to `docs/BACKLOG.md` by a builder (the one-line pointer beside the Phase 320
line at `:34153-34155`, if added, is the main session's, as an edit to something that exists); nothing filed upstream;
no release.

---

## 8. Found on the way, not this phase

- Codex's first-run folder question is also in the broken class at the parent (§1.1): the wheel over it moves the
  choice between "Trust and continue" and "Quit". The switch fixes it with everything else; recorded so no round
  treats it as new.
- `codex-repair.ts`'s header says once per boot and it runs every refresh (§1.2 item 2).
- The conformance harness header still says "Private socket `-L gmux` only" (`resume.ts:36`); it has run on
  `harness-socket.mjs`'s composed socket since Phase 19. A comment for a later round.

---

## 9. Verification (Tier 3), for the main session's workflow

Tier 3, because it writes the manifest at boot and changes what restore arms, spawns agents with a different argv
and env, and claims a result per agent; he reported it, so the parent measurement is mandatory. Three independent
methods are named before the work starts, as the entry sets them: measure the parent, attack, and run over real data.
Two verifier lenses are suggested; each returns a typed verdict, names its independent step and says how many model
turns it spent.

### 9.1 Lens 1 — the app, the parent and the real agents

Under THE LOCK: `probe:p331` at the parent (a `cp -Rc` clone of the parent commit, `npm run build` in it,
`P331_PARENT_CHECKOUT` pointed at it) then at HEAD, every arm of §2.11 read and graded. Then one full
`conformance:resume` over the eight (Claude and Codex round-trip and read `alternate_on` 0 after create and after the
resume; every other row records its reading beside its class; Gemini, Qwen, Antigravity and Grok named as not
started and why, Droid as not installed; installs stat'd before and after). Then the Claude question re-read through
`probe:p314`'s Claude route, with its turn count; if classic Claude makes any question read worse than today, the
Claude half is dropped under his no-regression rule and Codex lands alone.

### 9.2 Lens 2 — the attack on the boot pass and the readers

- **His manifest, copied**: `sqlite3 'file:<his manifest>?mode=ro' '.backup <scratch>/m.db'`, deleted in a
  `finally`. **Before reading Builder B's code**, the verifier composes by its own method the expected resume argv of
  every Codex row and the expected `env` of every Claude row in the copy. Then the pass runs twice over the copy
  (the pinned tsx, `repairInlineSwitches` over a `ManifestStore` opened on the copy). Reported as counts and agent ids
  only: Codex rows rewritten here and elsewhere, Claude rows given the variable, each compared with the verifier's
  own expectation; every other agent's rows byte identical by raw column bytes; rows already right untouched; no row
  emptied; every captured row still captured; the digest after pass 2 equal to the digest after pass 1, and pass 2
  writing nothing; the `recorded-differs` and `binary-differs` counts.
- **Hostile rows planted in the copy**, §2.4.7's table, each with its required outcome; a pre-phase `--yolo` Codex row
  also taken through `recoverLaunchExtras`, which must answer `['--yolo']`; and a pass whose store throws half way.
- `ablation:p331` re-run by the verifier's own hand, plus at least one arm of its own the builders did not write.
- The three moved pins diffed (§1.2 item 1); `scroll.ts` compared with comments blanked; `gate:contract` byte
  identical.

A fix round follows any needs_work, and an independent reverify of that fix re-runs the failed items live. The fix
runs once.

---

## §As built (the integrator, 2026-09-29)

Reconciled in `/private/tmp/wt-p331b` at `d8f5c261`, nothing committed or staged. No Electron was launched by the
integrator, no agent was started, no tmux server was made, and 0 model turns were spent.

### What was built, by whom

- **Builder A** (§2.1, §2.2, §2.3, §2.6, §2.7): `src/main/agents/registry.ts`, `index.ts`, `flags.ts`,
  `src/shared/agent-overlay.ts`, `src/main/settings/store.ts` (comment), `src/main/sessions/launch-plan.ts`,
  `src/main/restart/extras.ts`, `src/main/machines/remote-record.ts`, `src/main/tmux/scroll.ts` (comment), the three
  moved pins plus the claude `launch.env` pin, `REFUSED_COMPILED`, and the new
  `src/main/agents/__tests__/p331-inline-switch.test.ts` (A1 to A11) and
  `src/main/sessions/__tests__/p331-own-flags.test.ts` (F1 to F12).
- **Builder B** (§2.4): the new `src/main/sessions/inline-repair.ts`, one import and one block in
  `src/main/sessions/id-harvest.ts`, and `src/main/sessions/__tests__/p331-inline-repair.test.ts` (R1 to R19, plus two
  extra rows for `recorded-differs` and `unreadable`, and one for a person's own `=true`).
- **Builder C** (§2.8 to §2.12): the new `src/main/conformance/screen-class.ts` and
  `src/main/conformance/__tests__/p331-screen.test.ts` (S1 to S4), `resume.ts` and `report.ts`,
  `build/agents-conformance-probe.mts` and `build/conformance-agents.mjs` (section 11), `build/p331/ablation.mjs`,
  `probe-p331.mjs`, `stand-in-sgr.mjs`, `mock-responses.mjs`, and the shared files `package.json`,
  `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 153 to 154), `CLAUDE.md`
  (the three rows) and `CHANGELOG.md` (the one Unreleased/Fixed item, first, no link yet).
- **The integrator**, in the builders' files and for reconciliation only:
  - `build/conformance-agents.mjs`: the row loop sections 10 (Phase 321) and 11 (Phase 331) each carried, the same
    twenty lines, is one helper `judgeRuleCases(phase, cases, findingsOf)`. The gate's stdout is byte identical
    before and after (diffed), and a clone with one planted finding in 10.1 and one in 11.2 printed
    `Phase 321 10.1 (…): planted …` and `Phase 331 11.2 (…): planted …` and exited 1, so both ablations' owner lines
    are still produced.
  - `build/p331/probe-p331.mjs`: arm (b) and arm (c) were written twice, once per build. They are now
    `approvalUnderWheel(app, folder)` and `pagerOverCodex(app, one)`; HEAD's (c) still leaves copy mode and waits
    600 ms first. `node --check` and `--self-test` pass. The probe has still never been run.
  - `build/agents-conformance-probe.mts`: the import comment "Two agents have any" says three, and a double blank
    line went.
  - Nothing else. No needle moved: all seventeen matched exactly once as written.

### The seams, read from both sides

- A's exports (`CODEX_SCROLLBACK_ARGS`, `CLAUDE_INLINE_ENV`, `fixedLaunchTokens`, `ownLaunchFlags`,
  `AgentScreenClass`, `AgentScreenRecord`) are what B imports (from the `../agents/registry` leaf) and C imports
  (`getLaunchableEntry`, `AgentScreenClass`, and through the tsx probe `launchArgvFor`, `resumeArgvFor`,
  `REFUSED_ROW_FIELDS`). Typecheck is clean.
- All 46 SPEC test titles exist exactly once at run time (read from vitest's JSON report, because F3's and F12's
  apostrophes are escaped in source). All 48 tests pass.
- The switch tokens are spelled in code in exactly two places, `registry.ts:598` and `:617`. Every other occurrence
  in `src/` is a comment or a quirk string. The constants are spread only into the codex `launch.argv` and
  `resume.template` and the claude `launch.env`, and referenced by the two screen records and the pass.
- `ownLaunchFlags` has exactly three callers (`agentExtrasOf`, `recoverLaunchExtras`, `writeRemoteHarvest`).
  `fixedLaunchTokens` has two (`ownLaunchFlags` and the `asLaunched` line). Every other composer of a codex resume
  argv is handed the create's own extras (`manifest/agents.ts:784`, `:847`, `id-harvest.ts:219`,
  `remote-sessions.ts:1659`), which never hold the pair.
- The remote arm admits the pair, because both tokens are in the template (`armedResumeTokens`).
  `composeArmedResumeText` accepts a remote row the pass rewrote, and still accepts the parent's shape (test I4
  below).
- `restore.ts` and `resume-in-place.ts` are untouched, so `conformance:handback` was not owed. It was run anyway and
  is green. No restore reader compares a contract's `resumeTemplate` against today's registry. The pass runs inside
  the boot's awaited `core.refresh()`. After a reboot the probe confirms the server is dead and
  `liveInfos = []`, so `resumeIdHarvests` is reached. Restore is reachable only through IPC or a harness, so no
  restore can arm a row before the pass has run.
- The three moved pins each moved by the two tokens and nothing else (`registry.test.ts:437-441`, `:473`;
  `codex-repair.test.ts:131-133`). A fourth pin was added beside grok's for claude's `launch.env`.
  `REFUSED_COMPILED` gained the name.
- `scroll.ts` and `store.ts` are byte identical to the parent once comments are removed
  (`ts.transpileModule`, `removeComments`).

### The integrator's own re-derivation (scratch only, never in the tree)

`scratchpad/p331b/integrator/rederive/integrator.test.ts` is run by vitest with a scratch config rooted at the
worktree. Every expected value in it is written by hand from §2.3 and §2.4. It passed 5 of 5:

- **I1** runs the REAL Phase 215 repair over real rollout files, then the REAL pass, over ONE store. The pre-phase
  row the repair moves comes out `[abs, 'resume', PARENT, '-c', 'tui.fullscreen_transcript=false', '--yolo']`. The
  pass answers `already-right`, makes no `updateSession` call, and the raw SQLite bytes (read through a second
  read-only connection) are unchanged. B's R18 mocks the repair, so this is the first test that crosses the seam.
- **I2** checks the composers on a pre-phase row and a post-phase row. The create-time harvest, the
  rescue/admission/repair composition, Restart's recovered extras, the replacement's launch
  `[abs, '-c', …, '--yolo']`, the replacement's harvest and rescue, the boot pass and the remote harvest (pre-phase
  and post-phase far rows, far `argv[0]` kept) all agree. Each answer holds the pair once and `--yolo` once. The pass
  then leaves both far rows `already-right` and byte identical.
- **I3** runs the pass twice over a mixed manifest. The fifteen hand-written verdicts of §2.4.7 hold, including
  `binary-differs`, `no-id`, `no-resume-argv`, a `discarded` row rewritten, env key order kept with the variable
  last, `"0"` kept, a remote Claude and every other agent and a shell absent and byte identical by raw row. On pass
  2, `updateSession` is never called and the raw digest is equal.
- **I4** checks what restore and the remote arm do with the result. `armableResume` arms the rewritten bare row as
  written. A captured row restored without capture arms `[abs, 'resume', id, '-c', …, '--yolo']`. The remote arm
  composes the rewritten far row with no refusal.
- **I5** covers a row whose capture was declined (Phase 119: record kept with `enabled: false`, resume bare, launch
  argv still wrapped). It gains the pair bare, its argv and capture record are untouched, and Restart still
  recovers `--yolo`.

The five tests can fail. A `cp -Rc` clone mutated seven ways turned at least one of them red each time, with the
control green:

| Mutation | Tests red |
| --- | --- |
| `agentExtrasOf` reverted to `.slice(1)` | I2 |
| `carriesPair` check dropped | I1, I2, I3 |
| remote harvest back to `record.argv.slice(1)` | I2 |
| Restart's `asLaunched` back to `argv` | I2 |
| the recorded-plus-pair check dropped | I3 |
| `hasOwn` narrowed to `=== '1'` | I3 |
| the pair off the template | all four |

The clone was removed in a trap.

### Commands, exit codes and numbers

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | import boundaries 0 violations, 0 runtime cycles |
| `vitest run` over agents, sessions, restart, machines, settings, conformance, config, shared, specstory, manifest, restore, activity (hermetic lane) | 0 | 229 files, 4,662 tests, 50 s |
| `vitest` `specstory/wrap.native.test.ts` (real specstory, scratch HOME) | 0 | 20 of 20 |
| `vitest run` whole suite, both lanes | 1 | 1,011 of 1,013 files passed, 1 skipped; 17,389 tests passed, 1 failed, 7 skipped. The one failure is `src/renderer/pierre/__tests__/inline-diff-agreement.test.ts > costs single digit milliseconds…` at 483 ms, taken while `ablation:p331` ran beside it. Alone it is 15 of 15 green, and `src/renderer` is untouched |
| `conformance:agents` | 0 | section 11 rows 11.1 to 11.5 yes, self-tests red 4/4, 3/3, 3/3, 7/7, 2/2; byte identical before and after the helper extraction |
| `conformance:installs`, `:derived`, `:handback`, `:machines`, `:choices`, `:logins`, `:phonecopy`, `:context` | 0 each | green |
| `node build/contract-inventory.mjs --check`, `gate:contract` | 0 | byte identical |
| `gate:checks` | 0 | 239 scripts classified |
| `gate:electron` | 0 | 154 users against a floor of 154 |
| `gate:background`, `gate:simulator`, `gate:knownhosts` | 0 each | green |
| `npm run ablation:p331`, before the integrator's edits | 0 | 17 of 17 arms red on their owners, control green first and last, 47 s |
| `npm run ablation:p331`, after them | 0 | 17 of 17, 224 s (run beside the full suite) |
| `node build/p331/probe-p331.mjs --self-test` | 0 | every grader answered its fixtures |
| `node build/p331/probe-p331.mjs` with no parent | 2 | refused, nothing launched |
| `npm run -s build` (once, at the end) | 0 | 44 s; every in-build gate green, `conformance:ios` PASS, contract byte identical |
| duplicate scan (own script: ten non-trivial lines, windows touching changed lines) | — | after the two extractions, three cross-phase shapes remain (see below) |

**Not run by the integrator, and why:**

- `conformance:resume:capture`, `conformance:resume`, `smoke:t1`, `smoke`, `smoke:t3` and `probe:p331` each start an
  Electron (`package.json:17-21`, `:246-247`). The task and §4 both say the integrator launches none. They are the
  verifiers', under THE LOCK, with `GMUX_CONF_AGENTS=claude,cursor,codex,deepseek,muse,pi,omp,opencode`, which
  `resume.ts:200-210` honours; an unset value runs every launchable agent, gemini, qwen, agy and grok included.
- `npm run package` was not run.

### Open concerns for the verifiers

1. **`probe:p331` has never run.** Its in-app assumptions are unmeasured:
   - Codex readiness under the mock provider.
   - The restore arming text.
   - Copy mode reached through CDP wheel events.
   - The scrollbar thumb.
   - That `withElectron` with no socket leaves the parent's tmux server alive for HEAD.
   - That nothing in a pane's command line names the profile (hooks are turned off for that reason).

   The integrator's refactor of arms (b) and (c) is mechanical, but it is also unrun.
2. **A captured Codex row already armed BARE by an older capture-lost harvest stays full screen for good.** The pass
   answers `capture-lost` (C7) even though rewriting a bare argv loses no capture. This is Builder B's point 2, and
   §2.4.3 step 5 is followed as written. The verifier should count such rows in his manifest copy. It is probably
   zero, because `canWrapArgv` refuses only unquotable arguments.
3. **R17's title** ("leaves every other row as it was") says less than the behaviour, which §2.4.7 fixes: the row that
   threw keeps its bytes and every other row gets its own outcome. The title was left because the spec fixes titles.
4. **Claude's `claude-trust-gate` shape (Phase 321, `tail: 0`) comes from full-screen recordings.** Research 134
   says the adversary measured the trust question byte identical in both modes, but no tree test re-reads the shape
   over an INLINE capture. Lens 1's `probe:p314` Claude route reads the permission question and not the trust gate.
   The verifier should re-read the trust gate at HEAD, inline, with the numbered verdict and `detectShapes`.
5. **Restore replays the pre-kill scrollback snapshot.** An inline Codex or Claude now holds its conversation in that
   snapshot, and the resumed agent then draws its own transcript below it. Duplicated history above a restored
   Codex or Claude is expected, as it already is for pi, muse and cursor today. The verifier should say so in
   words rather than read it as a defect.
6. **A comment made false by the phase, in a file no one owns:** `src/main/settings/ipc.ts:75`, "Empty for all but two
   agents". It is left for the main session or a fix round, because the integrator edits only files the spec
   assigns.
7. **Duplicated shapes left in place, because they cross phases:**
   - `build/p331/ablation.mjs` repeats the harness boilerplate of `build/p321/ablation.mjs`, 21 windows. The same
     13-line signal and clean block is in eight ablation scripts.
   - The CDP `attach` loop in `probe-p331.mjs:765-787` is in `probe-p313`, `p316` and `p321` as well.

   Extracting either means editing earlier phases' gates and probes, which is not this phase.
8. **Small and left alone:** `report.ts`'s two-line `pair` repeats `screen-class.ts`'s `screenPair`. It stays so that
   the pure `report.ts` does not import `../tmux`.
9. **Builder A's finding 6, not this phase:** Restart's Shape 1 always matches `[bin]` for cursor, so a cursor row
   `[bin, --resume, CHAT, --force]` recovers `--resume CHAT --force` as the person's own flags, and the replacement
   reopens the old chat. This was measured by A with tsx and was true at the parent too.
10. **The integrator ran `build/vendor/specstory/bin/specstory --version` once under his real HOME** (CLAUDE.md's
   worktree check). It printed a banner and read nothing the integrator saw. It is stated because the task forbids
   reading his agents' files.

### Where the entry or this SPEC was wrong, collected

- §2.2's table puts `--gemini_dir` on Gemini. Research 134 §8 makes it Antigravity's flag, and A put it there.
- §2.2's example comment would have quoted pi's `measured` string, which would break B2's uniqueness anchor. A
  replaced it with a pattern.
- §2.3 says `ownLaunchFlags` has three lines. It has four; the needle is the third.
- §2.7 did not mention the `--ask-for-approval never` choices. They are now "on-request, never", read from 0.158.0.
- §2.11 misses three things:
  - The environment the app needs: `CODEX_HOME`, `CLAUDE_CONFIG_DIR` and a fake `ANTHROPIC_API_KEY`.
  - Arm (o) needs Tortie's Claude hooks OFF (`GMUX_DISABLE_AGENT_HOOKS=1`), because the hook file under the profile
    puts the profile path on Claude's command line and `withElectron`'s teardown ends it.
  - The stream from the first byte needs tmux's `after-new-session` hook; `session-created` opened no pipe.
- R17's title (above). §2.4.1's import list forces B's module to repeat `isRemoteRecord` as a local `isLocalRow`.
- The task asks the integrator to run `conformance:resume:capture`, and §1.2 item 5 says it starts an Electron. The
  no-Electron rule was followed.

---

## §As built — the fix round (the fixer, 2026-09-30)

Three verdicts came back needs_work (lens 1, the attack on the boot pass and the readers; lens 2, the app at the parent
and HEAD; lens 3, the real agents and the harness). Every major and every minor is fixed below; no scenario any lens
measured is worse than today, so nothing was removed. The fixer launched no Electron, took no lock, spent 0 model turns
and 0 tokens, and never started gemini, qwen, agy or grok. **The fix is not its own proof: an independent reverify
re-runs the failed items live** (the list is at the end).

### What each problem was, and what changed

**1. The probe would start the four agents (lens 1 major, lens 2 major).** The app `probe:p331` launches version-probes
every agent its detection scan resolves (the boot warm on the empty profile, every `agents:list`), and the probe's
default PATH plus `/usr/local/bin` resolves gemini (3 copies), qwen, agy and grok (2). Fixed in
`build/p331/probe-p331.mjs`, the verifier's measured shape made part of the probe:

- `neverOverlay()` renames the binaries (and the launch argv[0]) of gemini, qwen, antigravity, grok and droid to
  `p331-never-<id>`, written to `<profile>/gmux/config/agents.json` before EACH launch (`writeNeverOverlay`). The app
  reads that file synchronously at boot, before the core and before the first scan (`src/main/index.ts`, the
  `initAgentOverlay` call), and detection walks the merged table whatever the confirm gate says
  (`src/main/config/store.ts`, `setAgentTableSource`), so a renamed row resolves nothing and nothing is probed.
- Before either launch, the probe runs THAT build's own `parseAgentOverlay`, `mergeAgentOverlay` and
  `resolveBinaryAllAgainst` over the file through the pinned tsx, in the parent checkout and in this one, and refuses,
  exit 2, unless both parse and merge with no problem, every hidden row carries exactly its renamed binary, and no copy
  resolves (`neverPrecheckVerdict`). A build whose parser refused the file would fall back to the real binaries; this is
  what finds that before anything starts. Dry-run by the fixer at HEAD, fs-only: 0 copies for all five with the file,
  and gemini 3, qwen 1, agy 1, grok 2 copies with an empty file (the control that proves the check can say no).
- After each launch boots and before any arm, `agents:list` is read back (`neverScanVerdict`): a hidden row with a
  `binPath`, a version or `installed` stops the run, exit 2, and the HEAD launch is not made.
- The header says what it does rather than what it avoids; the self-test gained 29 fixtures for its new graders.

**2. The guard check judged the holder shell (lens 2 major).** `envReading` judges the update guards on the processes
under the pane whose command names the agent (`isAgentCommand`: the first three words by basename, a stem such as
`muse-bin-…`, `deepseek-tui` or a `node` launcher's script counted, SpecStory's wrapper not), and the session-kind
variable on every process whose environment can be read (`judgeEnvRows`). A process whose `ps -E` shows no environment
at all (`envReadable`: no `PATH=` and no `HOME=`) is recorded HIDDEN and its guards are not judged: pi rewrites its
process title (its `dist/cli.js`), which is the stated limit, printed on its matrix row; its install is still compared
before and after.

**3. Manifest reads between the launches (lens 2 minor).** With no app holding the database there is no `-shm`, and
`mode=ro` fails. The fallback COPIES `manifest.db` and its `-wal` into the harness directory, opens the copy (which
replays the WAL) and removes it in a `finally`. `immutable=1`, the verifier's suggestion, was not taken: it ignores a
WAL the last app left, so it could read a row as it stood before its last write.

**4. Arm (l) compared "" with "" (lens 2 minor).** The ruler is `viewKey`, the first three non-blank rows of xterm's
view; a view with none is UNREADABLE. `#{scroll_position}` is not used as a ruler (lens 2's note).

**5. The report was written under `out/` (lens 2 minor).** It now goes beside the scratch directory,
`/private/tmp/p331-probe-<pid>.json`, or `P331_REPORT` outside this checkout and the scratch directory; `out/**` is what
electron-builder packs.

**6. The boot pass wrote the whole decoded row (lens 1 minor).** `updateSession` reads the row, decodes it and writes
every column back, so a column the codec refuses was written NULL (lens 1 planted three shapes; an earlier instance
twelve). The pass now writes through two new one-column statements, `setResumeArgvColumn` and `setEnvColumn`
(`src/main/manifest/sessions-repository.ts`, wrapped in `store.ts`), each `UPDATE sessions SET <column> = ? WHERE id = ?`
with `updateSession`'s own serialisation and SESSION_NOT_FOUND on no row. Of lens 1's three fixes this was chosen over a
round-trip check because it gives the row the pair AND keeps its bytes, where a check would leave such a row full
screen; `updateSession` is not touched. `InlineRepairStore` is now `listSessions` plus the two writes. The spec's
"through `updateSession` with a one-key patch" (§2.4.5) is therefore superseded; the rule it stated, one write of
`resumeArgv` or `env` alone, now holds at the SQL level. New row R20 plants refused `specstory`, `restore`,
`agent_contract`, `resume_provenance` and `context_snapshot` bytes and proves the target column moves and nothing else,
with a control that shows `updateSession` nulling the same bytes. R15 to R18 read the new writes through one recorder
that also records any `updateSession` call, and R16 requires none.

**7. The screen gate could not fail for Claude (lens 3 major), and the full run could not round-trip Claude on any build
(lens 3 major).** Claude Code 2.1.285 highlights "No, exit" on its folder question, so `SELECTED_AFFIRMATIVE` never
matched, the harness pressed nothing, the plant's Enter chose the refusal (status 1), and capture mode read the screen
AT the question, which Claude draws on the normal screen at every build. Fixed in `src/main/conformance/`:

- `cases.ts`: `SELECTED_REFUSAL_THEN_AFFIRMATIVE` (a highlighted refusal with the accept, unmarked, directly under it)
  and `trustGateStep`, the one decision `pane.ts` asks.
- `pane.ts`: `answerTrustGate` (what `clearTrustGate` now wraps) answers that shape with one Down and presses Enter
  only once `SELECTED_AFFIRMATIVE` reads the accept as highlighted; a Down that lands elsewhere presses nothing more. It
  reports whether a question was seen. The highlight after the Down, and the SECOND look, read the bottom of the pane
  through a new `bottomOfPane` (the last 24 lines that hold anything, the blank rows under the last drawn line taken
  off first): an inline agent keeps its answered question in scrollback, and the whole-pane second look pressed a
  second Enter into Codex's composer; `currentScreen` was tried first and keeps the blank rows, so Claude's question,
  drawn at the TOP of a 40-row screen, fell outside its window and the highlight was never seen (both measured,
  below). `currentScreen` itself is unchanged.
- `screen-class.ts`: `unreadBecause(gate)` answers a sentence when a trust question was seen and not answered, and
  `judgeScreen` takes it as a third argument: a switch row fails with "its screen was not read: …", every other class
  records it.
- `resume.ts`: a switch row has its trust question answered BEFORE the create reading, in both modes; a question it
  could not answer leaves no reading. The full run does not ask again before the plant when it already answered.
  In capture mode this is new: the agent records one trust entry for the harness's temporary folder in its own
  configuration, which the full run has always done.

**8. The harness's resumed Codex took its own update (lens 3 major).** `HARNESS_ONLY_ARGS` gives Codex
`-c check_for_update_on_startup=false` on every create, bypass or not (`harnessExtras`), so the harvest carries it onto
the recorded resume argv too; it is Codex's only switch for the check (`codex-rs/tui/src/updates.rs`,
`get_upgrade_version`, read only) and no environment variable reaches it. Every install the run may start is stamped
(realpath, mtime, size) before the core boots and after the last case; a moved one is printed `INSTALL MOVED` and listed
in the JSON (`installs`, `movedInstalls` in `report.ts`). **His Codex is 0.159.1 now, moved by the earlier full run, not
by this round; the full `conformance:resume` is owed again, and it spends turns, so it is his call.**

**9. Found by the fixer, the same class as item 1, in the harness: the run's detection scan started every installed
agent whatever `GMUX_CONF_AGENTS` said.** The harness's profile is empty, so the core's boot warm scans the whole
compiled table and runs `gemini --version`, `qwen --version`, `agy --version` and `grok --version`; the harness never
reads `agents.json` (its dispatch returns before `initAgentOverlay`), and the version read at run start was the same
scan. So the task's rule "set GMUX_CONF_AGENTS" did not keep the four from starting. `resume.ts` now points detection at
`conformanceDetectionTable(cfg.agents)` (`cases.ts`) before the core boots, so the warm and every later scan walk only
the agents asked for. An unset `GMUX_CONF_AGENTS` still means every launchable agent, as the header says.

**10. The nits.** `src/main/settings/ipc.ts:75` says three agents. `CHANGELOG.md` narrows the Claude half of the capture
claim to a Claude Code that ran full screen. `CLAUDE.md`: the `conformance:resume:capture` row says the reading is taken
past the folder question and a question it could not answer fails the switch, that the scan walks only
`GMUX_CONF_AGENTS`, Codex's update check is off and a moved install is named, and its trigger list is `conformance/**`;
the `probe:p331` row says how the four are kept hidden and where the report goes. Lens 1's V17 (`if (at === -1)`) is an
equivalent mutant at this build and was left. Lens 1's downgrade note stands as a limit, below.

### The fixer's own measurements

**The trust rule on the real agents, zero turns** (`scratchpad/p331b/fixer/trust-live.mts`, results in
`trust-live-2.json`). Claude 2.1.285 under a scratch HOME and `CLAUDE_CONFIG_DIR` with a fake key and
`ANTHROPIC_BASE_URL` at a closed loopback port, `settings.json` `{ "tui": "fullscreen" }`, an untrusted folder; Codex
0.159.1 under a scratch `CODEX_HOME` with a dummy key, update check and daemon off, provider at a closed port, an
untrusted folder; vendored tmux 3.7b with a copy of `resources/gmux-tmux.conf` on `-L p331b-fixer`; the shipping
`trustGateStep`, `SELECTED_AFFIRMATIVE`, `bottomOfPane`, `unreadBecause` and `judgeScreen`. No prompt was submitted.

| Arm | At the question | Keys the rule sent | After | Judged |
| --- | --- | --- | --- | --- |
| Claude with the variable (HEAD) | 0/0, step `down-then-enter`, the old rule would press nothing | Down, Enter | 0/0 | pass |
| Claude without it (lens 3's L1, the parent's env) | 0/0, which the OLD reading passed | Down, Enter | **1/1** | **FAIL**: "drew on the alternate screen" |
| Codex with the pair | 0/0, history 10, step `enter` | Enter | 0/0, history 32, composer drawn | pass |
| Codex without it | 1/0 | Enter | 1/0 | FAIL |

So the gate can now fail for Claude, which it could not. Four runs, each mirroring the pane.ts of its moment: run 1
started no agent (tmux gives a pane the CLIENT's PATH whatever `-e PATH=` says, and every pane died 127); run 2, with
the whole-pane second look, sent Enter, Enter to the Codex with the pair; run 3, reading the bottom through
`currentScreen`, sent only Down to BOTH Claudes and left them unanswered, which would have failed Claude at HEAD; run 4,
the shipped `bottomOfPane`, is the table. Run 4: 9 pids seen and ended, the socket gone, the scratch homes removed, and
both installs (realpath, mtime, size) identical before and after, as in every run. Each defect the runs showed is now a
unit row (H1) and an ablation arm (X8, X9).

### Commands, exit codes and numbers

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 0 import-boundary violations, 0 runtime cycles (final run after the last edit) |
| `vitest run` over agents, sessions, restart, machines, settings, conformance, config, shared, specstory, manifest, restore, activity | 0 | 233 files, 4,690 tests, 18 s |
| `vitest run` conformance, sessions, manifest, agents, after the last edit | 0 | 1,179 tests |
| `vitest run`, the whole suite, after the last edit | 0 | 1,013 files passed and 1 skipped; 17,396 tests passed, 7 skipped, 44 s |
| `conformance:agents` | 0 | 11.1 to 11.5 yes, self-tests red 4/4, 3/3, 3/3, 7/7, 2/2 |
| `conformance:installs`, `:derived`, `:handback`, `:machines`, `:choices`, `:logins`, `:phonecopy`, `:context` | 0 each | green |
| `node build/contract-inventory.mjs --check` | 0 | byte identical, so the one-column writes move no contract line and no schema |
| `gate:checks` | 0 | 239 check scripts classified, 1,014 test files reach no home |
| `gate:electron` | 0 | 154 users against a floor of 154 (no new launcher) |
| `gate:background`, `gate:simulator`, `gate:knownhosts` | 0 each | green |
| `node build/p331/probe-p331.mjs --self-test` | 0 | every grader answered its fixtures, 29 new ones among them |
| `node build/p331/probe-p331.mjs` with no parent | 2 | refused, nothing launched |
| `npm run -s build` (after the last edit) | 0 | every in-build gate green, contract byte identical |
| `npm run ablation:p331` (after the last edit) | 0 | 26 arms, 26 owners red by name, control green first and last, 36 s. B4 and L2 moved their needles with their clauses; X1 to X9 are new |
| the probe's pre-launch check, dry-run at HEAD through the pinned tsx | 0 | 0 copies of all five with the file; gemini 3, qwen 1, agy 1, grok 2 without it (fs-only) |
| `trust-live.mts`, run 4 | 0 | the table above; 0 turns |

### What the fixer could not do, and why

- No Electron: the fixer is not a verifier and took no lock, so `probe:p331` is still unrun as fixed,
  `conformance:resume:capture` did not run through the harness, and `smoke:t1`, `smoke`, `smoke:t3` and `package` were
  not run (each starts an Electron or builds a package the integrator also left).
- No turn: the full `conformance:resume` (his sign-in, the eight) and the `probe:p314` Claude re-read are the reverify's,
  and the full run is owed again because Codex moved to 0.159.1.
- The Claude bypass-permissions question: in a HOME that never accepted it, `--dangerously-skip-permissions` makes
  Claude ask it after the folder question, on the normal screen. The harness answers only TRUST questions, so a capture
  run in a scratch HOME with the bypass flags reads the screen at that question and a switch row passes it vacuously.
  Run a scratch-HOME proof with `GMUX_CONF_BYPASS=0`, or accept bypass mode in the scratch config first. His own HOME is
  unaffected: every full run before Claude 2.1.285 got past it.

### For the reverify (the failed items, live)

1. `probe:p331` at the parent and HEAD under THE LOCK: the pre-launch check passes at both builds, `scan-parent` and
   `scan-head` read all five hidden, the arms (d), (j) and the pi matrix row are READABLE, the between-launch `before`
   rows are read, and (l) compares non-blank keys. Stat the four agents' installs, atime included, before and after.
2. `conformance:resume:capture` (`GMUX_CONF_AGENTS=claude,cursor,codex,deepseek,muse,pi,omp,opencode`, `GMUX_CONF_BYPASS=0`
   in a scratch HOME) over HEAD and over a clone with the claude `launch.env` line removed (ablation L1): claude PASS at
   HEAD and FAIL in the clone, the create reading taken past the folder question. The run's detection line must read
   `agent detection: N/8 installed [...]` and name none of the four.
3. The boot pass over a copy of his manifest with lens 1's hostile columns planted: the target column moves and every
   other raw byte stays.
4. The full `conformance:resume` under his sign-in, his call: Claude round-trips, Codex's resumed argv carries
   `-c check_for_update_on_startup=false`, and no install moves.

### Stated limits added by the fix round

- A row the pass rewrote, read by an OLDER Tortie build (a downgrade), is armed word for word by plain restore, and the
  older handback and remote arm refuse its `-c` (lens 1's nit). A Codex row created at HEAD behaves the same.
- pi's own environment is unreadable to `ps`, so the probe does not judge its guards.
- The harness answers trust questions only; any other first-run question is read as the screen (above).
