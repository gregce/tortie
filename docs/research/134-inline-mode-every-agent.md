# 134. Inline mode for every agent: two switches Tortie compiles, and eleven agents it leaves alone

Phase 331. Written 2026-09-29 against the tree at `217f47e5` ("docs(backlog): the Funnel measurement passed"). Gemini,
Qwen, Antigravity and Grok were never started, not even for `--help`, because they update themselves. Their rows come
from their installed files, `strings` of their binaries and their public docs. Droid is not installed on this Mac. No
Electron was started and no model turn was spent. No config file of his, no credential, no keychain entry and no
agent's session store was opened by anyone in this round. His `-L gmux` server and his default tmux server were never
touched.

Five agents were run live on scratch tmux servers (`p331i-A`, `p331i-b`, `p331i-adv2` to `p331i-adv4`), each using a
copy of `resources/gmux-tmux.conf`, with `pipe-pane -o` into a file:

- Claude Code 2.1.284 and 2.1.285, under a scratch `HOME` and `CLAUDE_CONFIG_DIR`, with a fake `ANTHROPIC_API_KEY`, a
  seeded scratch `.claude.json` and a fabricated transcript. Claude updated itself between the two runs. It made one
  network call for remote managed settings, which the fake key failed with a 401.
- cursor-agent, under his `HOME`, because it cannot reach its main screen without sign-in. The agent read its own
  sign-in from his keychain through its normal path; nobody else read it. `CURSOR_CONFIG_DIR` and `CURSOR_DATA_DIR`
  pointed into scratch. The keys typed were `a` at the trust question and Ctrl+C twice.
- opencode, pi, omp, muse and deepseek-tui, each under a scratch `HOME`. Muse ran its binary directly with
  `MUSE_NO_AUTO_UPDATE=1` and its local echo provider, so his launcher and its update notice were never touched.
- SpecStory 2.8.0, bundled, wrapping Claude.

Codex is the reference row only. Research 133 (written in parallel) owns Codex in depth, including the live
reproduction and the app run.

The round had three agent investigators with disjoint agents (A: Claude, cursor and opencode; b: pi, omp, deepseek and
muse; c: Gemini, Qwen, Antigravity, Grok and Droid, all read only), one investigator (D) on Tortie's own side, reading
the tree and running its pure functions under node with an Electron stub, and one adversary who attacked all of it
before this was written. A synthesis ruled on every disagreement. Section 8 records what the attack killed, so no later
round re-derives it. The scratch files named below are under the session's scratchpad
(`scratchpad/p331/inline/{A,b,c,D,adv}/`) and are not in the tree.

Two slips are stated so they can be checked. Investigator A wrote its first `strings` dump of the opencode binary to
the scratchpad root, outside `p331/inline/`, and moved it in a few seconds later. One `ps` listing showed the command
line of a running Cursor IDE worker that was not ours, and that line carries a credential. It is recorded nowhere and
that process was not signalled.

This answers his ruling of 2026-09-29, in his words: "i like the inline mode lets do that". The context was Codex CLI
0.158.0, which now runs full-screen on the terminal's alternate screen by default, keeps its transcript in its own
memory and asks for no mouse. In Tortie the wheel therefore becomes up and down arrows and walks Codex's prompt history
instead of scrolling. Codex has a switch that keeps it inline. His ruling is: where an agent offers an inline switch,
Tortie launches and resumes it inline, so the conversation lives in the terminal's own scrollback and Tortie's wheel,
search, Read last lines and question detection keep working. The switch is compiled registry data per agent. It is
never a user setting and never configuration Tortie reads.

## 1. The answer first

Tortie compiles an inline switch for two agents, Codex and Claude Code. Every other agent is left exactly as it is.

- Codex: `-c tui.fullscreen_transcript=false` on the launch argv and the resume template, as research 133 §11 sets
  out. That spelling is Codex's own Scrollback mode. The spelling his context named, `-c tui.alternate_screen="never"`,
  takes Codex off its shared background server and shows a warning (research 133 §2.6).
- Claude Code: `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` in the row's compiled `launch.env`, the same field that already
  carries cursor's `FORCE_COLOR`. It was measured on create and on the exact resume shape Tortie types. It beats the
  person's saved `tui: fullscreen` and it beats `CLAUDE_CODE_NO_FLICKER=1`. A Claude older than 2.1.132 ignores it.

Five agents are inline already and need nothing: cursor, Gemini, Muse, pi and omp. Their conversation is in tmux
history today.

Four are full-screen and ask for the mouse: deepseek, Antigravity, Qwen and opencode. Tortie's wheel already reaches
them through the mouse pass-through (Phase 292 on this Mac, Phase 320 on another machine). Their transcript stays out of
tmux, so capture, saved output and Read last lines hold one screen of it, which is the limit research 130 §2.6 states.
Each has an inline switch of some kind, and each is refused for a named reason (section 2 and section 8).

Two are unknown. Droid is not installed. Grok was not run. Its inline flag, `--minimal`, is the right spelling, but its
own binary says both that it is sticky and that it is not, so it is held until it is measured.

No agent's default is in the broken class, meaning the alternate screen with no mouse, apart from Codex 0.158 under
Tortie. That is why the phase exists. Several agents fall into it if the person turns that agent's mouse off, and
section 3.3 names their own scroll keys.

One rule decides which switches are compiled: a switch is compiled only when a build that lacks it is left exactly as
it is today. An environment variable passes. A config-override key the agent ignores when it does not know it passes.
A bare command-line flag never does, because an unknown flag kills the pane at create and at every later restore of
that conversation (section 5).

One mechanism carries both switches: compiled data in fields the row already has, two readers that agree on it, and
one boot pass that brings recorded rows up to it (section 4).

Claude's switch reaches this Mac only. Tortie sends no environment variable to another machine except its own two
identity stamps (`src/main/machines/remote-env.ts:85-88`). Whether it should send this one is his question 1.

The Phase 320 line "Tortie does not choose an agent's renderer" (`docs/BACKLOG.md:34153-34155`) is superseded by name
for these two rows.

On his Mac nothing visible changes for his own Claude, because it already runs the classic renderer (research 130
§2.3). What changes is for a person whose Claude runs full-screen: search, Read last lines and capture now hold the
whole conversation, and they give up Claude's in-app mouse, Focus view and the `/diff` side panel.

## 2. The table

"Class" is one of four: switch-to-inline (Tortie compiles a switch), inline-already, fullscreen-with-mouse (the wheel
works through the pass-through, the transcript is not in tmux) and unknown.

| Agent | Version measured | Default mode | Inline switch | On resume | Class | What Phase 331 does |
| --- | --- | --- | --- | --- | --- | --- |
| claude | 2.1.284, then 2.1.285 | Depends on the person's settings and Claude's own gates. Full-screen: `1049` and mouse `1000/1002/1003/1006`. Classic: neither. His Mac: classic | Env `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1`, since 2.1.132 | Holds on `claude --resume <id>`: 120 of 120 lines in tmux history, against 35 full-screen | switch-to-inline | Compile it in `launch.env`. The boot pass adds it to local rows |
| codex (reference) | 0.158.0 (research 133) | Full-screen on the alternate screen. Under Tortie's `mouse off` it asks for no mouse | `-c tui.fullscreen_transcript=false` | Holds before or after `resume <id>`, with `--yolo` kept (research 133 §2.6) | switch-to-inline | Research 133 §11 |
| cursor | 2026.09.18-9a7762b | Inline. No `1049`, no mouse | None exists, none needed | Inline on `--resume <id>` | inline-already | Nothing |
| gemini | 0.60.0, read only | Inline, no mouse. `ui.useAlternateBuffer` defaults to false. Opting in gives `1049` and `1002/1006` | None on the command line, none needed | Inline by default (read, not run) | inline-already | Nothing |
| droid | Not installed | UNMEASURED | None documented | UNMEASURED | unknown | Nothing |
| deepseek | deepseek-tui 0.8.26 run; CodeWhale 0.10.1 read | Full-screen. `1049` and `1000/1002/1003/1015/1006` | None usable. 0.8.26 ignores both. CodeWhale's `never` is a viewport, config file only | UNMEASURED | fullscreen-with-mouse | Nothing. Record the refusal in the row |
| antigravity | 1.2.8, read only | Full-screen in a `tmux-256color` pane (its own log, 7 of 7 starts). Mouse per its docs; mode numbers UNMEASURED | Settings file only: `altScreenMode: "never"` | Not applicable | fullscreen-with-mouse | Nothing |
| muse | 1.4.1-R4503.1 | Inline. No `1049`, no mouse | None exists, none needed | Inline on `resume <uuid>`: 40 of 40 exchanges | inline-already | Nothing |
| qwen | 0.22.0, read only | Full-screen. `1049`, and `1002` or `1003`, with `1006` | Settings file only: `ui.useTerminalBuffer: false` | Not applicable | fullscreen-with-mouse | Nothing. Record the refusals in the row |
| pi | 0.84.2 | Inline (regular mode), no mouse | `--tui-mode regular`, since 0.84.0 | Holds on `--session-id <uuid>`: 400 of 400 | inline-already | Nothing. Record the flag, do not compile it |
| omp | 18.0.11 | Inline. Its overlays borrow `1049` with `1000/1003/1006` | None exists, none needed | Inline on `--resume <path>`: 400 of 400 | inline-already | Nothing |
| grok | 1.0.41, read only | `auto`: full-screen with `1000/1002/1003/1015/1006` in normal tmux, an inline viewport in tmux control mode | `--minimal`, labelled Experimental | grok composes `grok --minimal --resume` itself. UNMEASURED | unknown | Nothing. Hold `--minimal` until measured |
| opencode | 1.18.32 | Full-screen. `1049` and `1000/1002/1003/1006` | `--mini`, since 1.17.10 | Inline on `--session <id> --mini`, measured | fullscreen-with-mouse | Nothing. Record `--mini` as refused |

Three registry rows name an older version than the one measured here: Gemini's row says 0.54.0, opencode's says
1.18.30 and 1.18.31, and Antigravity's says 1.2.7. None of those differences changes a class.

## 3. What each class means inside Tortie

### 3.1 Inline

The agent draws on the normal screen and asks for no mouse. Tortie's scroll router treats the pane as its own
(`owned = !innerAlt && !innerMouse`, `src/renderer/terminal/scroll/surface.ts:205-213` and `:262-285`). The wheel
enters tmux copy mode, and search, Read last lines and capture reach the conversation up to the history limit. That is
the world Tortie was built on: `src/main/tmux/scroll.ts:13-18` records Claude 2.1.226 and Codex both drawing in the
normal buffer with the mouse off.

Inline has one cost for Tortie's scrollback, and it is shared by most inline renderers. On a change of width, and for
some on mount, they send `CSI 3J`, which tmux treats as clear-history, and then print the conversation again.

- pi (regular mode), omp and muse replay the whole conversation. After a width change, 400 of 400, 400 of 400 and 40 of
  40 marker lines were back in tmux history.
- omp also borrows the alternate screen for about 120 ms on every resize, so a read taken inside that window sees
  `alternate_on=1`.
- cursor clears on mount and on every resize (`clearOnMount` defaults to true), then prints only its latest 10 turns
  until the person runs `/full-conversation`.
- Classic Claude: research 130 read a `CSI 3J` and a replay of up to 10,000 lines on 2.1.280. At an idle prompt on
  2.1.284 and 2.1.285, a resize sent no `CSI 3J` and kept every line. During streaming it is UNMEASURED.

A reader parked in copy mode can therefore have tmux history rewritten underneath them. That is exactly what
`probe:p292`'s arms d and f exist to catch, and they have never been run against one of these agents (section 7).

### 3.2 Full-screen with the mouse

The agent draws on the alternate screen and asks for the mouse. Tortie hands the wheel to the agent as ordinary mouse
reports, locally since Phase 292 and on another machine since Phase 320. Scrolling works. tmux holds one screen, so
capture, saved output and Read last lines hold one screen of the conversation. That is the same limit research 130 §2.6
states for full-screen Claude, and it is the reason his ruling prefers inline wherever it can be had.

### 3.3 The broken class: the alternate screen with no mouse

Here the wheel reaches the agent as arrow keys. Most agents read those as prompt history, which is what Codex 0.158 does
under Tortie by default. No other agent is in this class by default. These agents fall into it when the person turns
that agent's mouse off, and these are their own scroll keys:

| Agent | How a person gets here | Its own scroll keys |
| --- | --- | --- |
| opencode | `mouse: false` in its tui config, or `OPENCODE_DISABLE_MOUSE=1` (measured, o4) | PgUp/PgDn or Ctrl+Alt+B/F; Ctrl+Alt+U/D half a page; Ctrl+Alt+Y/E a line; Ctrl+G or Home for the first message, Ctrl+Alt+G or End for the last |
| deepseek | `--no-mouse-capture` or `tui.mouse_capture = false` (measured, ds-nomouse). Newer CodeWhale then asks for `1007`, so the wheel arrives as arrows | Up/Down with an empty composer, Alt+Up/Down, PgUp/PgDn, Alt+G and Alt+Shift+G, Ctrl+Home and Ctrl+End (CodeWhale docs; 0.8.26 UNMEASURED). Never Ctrl+Shift+U, which runs `/update install` |
| qwen | `ui.mouseTracking: false` | Shift+Up/Down a line, PgUp/PgDn a page, Ctrl+Home/End |
| gemini | Ctrl+S or F9 copy mode while in the opted-in alternate buffer | Shift+Up/Down, Page Up/Down, Ctrl+Home or Shift+Home, Ctrl+End or Shift+End |
| grok | Ctrl+R in the scrollback toggles mouse capture | After Tab moves focus to the scrollback: PgUp/PgDn, Ctrl+U/D, Ctrl+K/J, g and Shift+G |

Tortie does nothing about this class in Phase 331. It is the person's own choice inside the agent, and the wheel router
is not changed (section 4.6).

### 3.4 Unknown

Droid has not been observed at all. Grok's default under Tortie cannot be predicted from outside, because its `auto`
mode asks tmux which client is current, and the answer can be Tortie's own control-mode client (section 9).

## 4. The mechanism

Each agent's inline switch is compiled data in the registry, carried only in fields the row already has, and one boot
pass brings recorded rows up to it. His ruling extends research 133's Codex fix to every agent with a switch Tortie can
safely compile. Today that is Codex and Claude.

### 4.1 The row

There are two carriages and nothing else is used.

Argv, for Codex. The tokens go on both the `launch.argv` tail and `resume.template`, built from one constant (research
133 §11 item 1). Tokens in the template become arm-allowlist tokens (`src/main/machines/remote-arm.ts:193-199`) and are
copied into the recovery contract (`src/main/manifest/agents.ts:600`), so `conformance:agents` section 2 passes by
construction. Placing them in `launch.argv` alone is refuted: `resumeArgvFor` never reads it
(`src/main/agents/registry.ts:1999-2015`), so create would run inline and resume full-screen (D, `probe-tokens.out`).

Env, for Claude. `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN: '1'` goes in the claude row's compiled `launch.env`
(`src/main/agents/registry.ts:554-559`). That is the hashed, recorded field cursor's `FORCE_COLOR` uses (`:637`). It
flows from `buildLaunchSpec` into the row's `env`, then into `paneEnvFor` as the base layer, then into `tmux new-session
-e` (`src/main/sessions/launch-plan.ts:299-361`, `src/main/tmux/sessions.ts:176-178`). Restore replays it from the row
(`src/main/restore/restore.ts:1026-1036`). Because the name is now in a compiled `launch.env`, `sharedRefusedEnvKeys`
refuses it on the shared passthrough list automatically (`src/main/settings/store.ts:192-215`), and the per-agent list
refuses it for Claude through `compiledLaunchEnvKeys` (`src/main/settings/ipc.ts:189`). The pinned list in
`src/main/settings/__tests__/p275-env-shared-seal.test.ts:458` and the comments that say "today exactly two"
(`store.ts:194`, `registry.ts:1847`) grow to three.

Every launchable row also gets a compiled screen class, as in section 2. It never executes anything. It is never on the
overlay type: it goes in `REFUSED_ROW_FIELDS` beside `activity` (`src/shared/agent-overlay.ts:632-651`), so a
configuration row that carries it is dropped whole with the field named. It is never in `ConfigExecutionFields`,
because a new hashed field would move the hash of every confirmed row: the canonical text emits every key even when it
is empty (D, `probe-hash.out`; `src/main/config/confirm.ts:174-209` and `:237-249`). With both switches in existing
fields, only a person holding an execution-bearing `agents.json` patch of codex or claude is asked to confirm again,
which the code already calls intended (`src/main/config/overlay.ts:139-180`).

### 4.2 The readers

`agentExtrasOf` (`src/main/sessions/launch-plan.ts:101-104`) and `recoverLaunchExtras`
(`src/main/restart/extras.ts:113-133`) share one helper that sets the row's fixed launch tokens aside and accepts the
shape written before the phase (research 133 §11 item 2). Without it, the harvest recompositions emit the Codex switch
twice (`src/main/sessions/id-harvest.ts:408`, `:438`, `:532` and `:639`; `src/main/sessions/codex-repair.ts:244`;
`src/main/machines/remote-record.ts:659-664`), and Restart silently drops the person's own flags on every row created
before the phase, because both of its shapes compare against today's registry prefix. Claude's env switch touches
neither reader.

### 4.3 The boot pass

It follows Phase 215's rules (the header of `src/main/sessions/codex-repair.ts`): once per boot, idempotent by
construction, never empties a row, leaves an already-right row byte identical, makes one durable write per row, writes
the manifest only and signals no process. It runs from `resumeIdHarvests` (`src/main/sessions/id-harvest.ts:319`)
after `repairCodexResumeIds`, in its own try and catch. It brings each row to exactly what a create of that agent
records today:

- Argv carriage: it recomposes the recorded resume argv through the one composer.
- Env carriage: it merges the compiled pair into the recorded `env` when the name is absent. A row that already names
  the variable, with any value, is left byte identical. `env` is patchable (`src/main/manifest/codecs.ts:282-292`), and
  the write goes through `updateSession` (`src/main/manifest/sessions-repository.ts:311`).

There is no schema migration, so `gate:contract` must not move.

### 4.4 Other machines

Argv carriage reaches another machine through `remoteLaunchArgv` and `resumeArgvFor`
(`src/main/machines/remote-sessions.ts:1316-1322` and `:1655-1663`), so the ruling includes remote Codex rows in the
pass. Env carriage does not reach another machine. `REMOTE_ENV_ALLOWED` is exactly `GMUX_MANAGED` and
`GMUX_SESSION_ID`, and `conformance:machines` and `conformance:shellenv` pin it. A remote Claude therefore stays as it
is today unless he answers question 1 yes.

### 4.5 What is superseded

- The Phase 320 line in `docs/BACKLOG.md:34153-34155`, "Tortie does not choose an agent's renderer", for the two
  compiled rows.
- Research 133 §7, "the phase is Codex only".
- Research 133 §12 question 4, which asked whether a verifier may read the Claude bundle, with the default no. This
  round did read the Claude 2.1.284 and 2.1.285 binaries and ran them under a scratch `HOME` and `CLAUDE_CONFIG_DIR`.
  It read no config and no credential of his. He should be told.

### 4.6 What is not in the phase

- No change to the wheel router and no change to tmux's `mouse` option.
- No Settings surface and no opt-back preset.
- No menu change, because no user-facing surface is added. The one visible change is Settings refusing one more
  passthrough name through the door that already exists.
- No `--settings` JSON for Claude. With two `--settings` the last wins, and `withClaudeSettingsFlag` skips Tortie's
  hook file whenever one is present (`src/main/activity/hooks.ts:969`), which would drop Phase 311's hook-sourced
  question.
- No per-spawn env layer.
- No command-line flag for pi, opencode or grok (section 5).
- No change to cursor's clear on mount, omp's resize borrow, or Antigravity's likely difference between this Mac and
  another machine.

## 5. The version guard

Phase 331 builds no semver gate. A switch is compiled only when a build that lacks it is left exactly as it is today.
That leaves two carriages.

1. An environment variable. Claude's `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` arrived in 2.1.132. An older Claude ignores
   it and stays full-screen, so the switch cannot kill a pane.
2. A config-override key the agent ignores when it does not know it. Codex's `-c tui.fullscreen_transcript=false` is
   ignored unless Codex runs with `--strict-config`, which Tortie never passes. Builds from 2026-09-11 to 2026-09-19
   print one warning line, and those builds had no full-screen view anyway (research 133 §2.6).

A bare command-line flag is never compiled, for two reasons.

- An unknown flag kills the pane at create. Because `resume_argv` is durable and replayed word for word, it also kills
  every later restore of that conversation, including after a future release that removes a flag labelled
  Experimental.
- Tortie reads no agent version on another machine (`src/main/machines/remote-record.ts:404-431`; research 54's row
  "Same agent, different version — Not handled"). Locally, versions are identity probes and never gates
  (`src/main/agents/flags.ts:8-15`; deepseek's floor is "not enforced", `registry.ts:980`).

That rule is why three switches are recorded and not compiled:

- pi `--tui-mode regular` is absent before 0.84.0. The adversary measured the death on an unknown flag, and it comes
  after pi's trust question, so a person answers trust and then watches the pane die.
- opencode `--mini` is absent before 1.17.10. That opencode prints only its help and exits 1, and none of Tortie's
  `ARGV_REJECTED_PATTERNS` (`src/main/conformance/cases.ts:260-273`) recognise that screen.
- grok `--minimal` is also unmeasured on whether it is sticky.

A later phase that wants any of the three builds a version floor first. The local cache knows the version
(`cachedAgentVersion`). Another machine would need a new read on the far side.

## 6. Running sessions

A running agent process is never touched. tmux keeps it across Tortie quits, and it keeps the screen it started with
until it is next restored or restarted. For a while, two sessions of the same agent can sit side by side in different
modes.

- At the first boot after the upgrade, the pass rewrites the recorded row: the resume argv for Codex, on this Mac and
  on another machine, and the env for Claude, on this Mac only. The next restore then comes back inline.
- Restart builds from the current registry, and the shared helper keeps the person's own flags on rows written before
  the phase.
- The local handback types the recorded argv into the existing pane. A Claude pane whose holder shell started before
  the pass keeps its old env until its next restore.
- Restore itself is unchanged. It arms `rec.resumeArgv` and replays `rec.env` (`src/main/restore/restore.ts:777` and
  `:1026-1036`), and it still reads compiled data only.

Two choices a person makes inside the agent are overridden at every launch and restore: Claude's `/tui fullscreen`
and Codex's `/tui` Fullscreen. That is the ruling's "never a user setting". Claude's `/tui fullscreen` relaunches Claude
with the variable dropped, so it holds for that process only, and the next launch or restore undoes it.

The person keeps one opt-out of their own. For Claude it is `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` set to `"0"` in their
Claude settings env block, which was measured to win (c12). For Codex it is a later `-c ...=true` in their own flags.

On this Mac nothing visible changes for his Claude, which already runs classic. Every other agent's sessions are
unchanged.

One stated edge. A person whose `agents.json` patch of codex or claude brings its own `launch` replaces the compiled
launch whole. Their create drops the switch, while their resume template still carries it (Codex) or the boot pass
adds it back (Claude). The spec step must either compose the switch from the one constant, independently of a launch
patch, or state that limit.

## 7. Gates and proof

Tier 3. The phase writes the manifest at boot, changes how restore comes back, spawns agents and claims results per
agent. The independent methods are these.

1. Measure the parent. One app run at the parent and at HEAD, one Electron at a time under the lock, extending research
   133's Codex run to Claude in the same session. It drives the wheel, the scrollbar, Read last lines and capture over
   an inline Claude and an inline Codex, reads `#{alternate_on}`, `#{mouse_any_flag}` and `#{history_size}`, and parks
   a copy-mode reader across a resize and a return to the session, which is what `probe:p292` arms d and f read.
2. Attack. Run the boot pass twice over a copy of his manifest and compare a digest over every row, which must be
   identical after pass 2. Add hostile rows: a remote Claude, a SpecStory-wrapped row, a row carrying the person's own
   flags, a patched-agent row, a pre-phase row through Restart and a row with no conversation id.
3. Real data. A per-row matrix over every installed agent through `GmuxCore.createSession` and resume, reading the
   screen class. `conformance:resume:capture` gains that reading, extended so every row records its class and a
   switched agent found on the alternate screen fails.

The gates: `npm run typecheck && npm run build && npm run smoke:t1`, with the full battery for the integrator.
`conformance:agents` gains clauses: every launchable row declares a screen class, an argv switch sits on both the launch
tail and the template, an env switch is in `launch.env` and in `sharedRefusedEnvKeys`, and the class is refused on the
overlay. Also `conformance:installs`, `conformance:resume:capture`, one full `conformance:resume` with real turns under
his sign-in, and `conformance:derived` and `conformance:handback` wherever the pass or restore files are touched.
`conformance:machines` runs only if question 1 is yes. `gate:contract` stays byte identical.

Question detection. Phase 311's Claude question comes from the hook and does not depend on the renderer. The verifier
re-reads Claude's named shape and the numbered verdict against a classic capture of a real permission request, by the
route `probe:p314`'s Claude arm already uses. The adversary measured Claude's folder trust question byte identical in
both modes.

The full list of files, tests and the matrix the build must run is in the Phase 331 entry.

## 8. What the attack refuted

- Codex's `-c tui.alternate_screen="never"` as the reference switch. Research 133 §2.6 measured it taking Codex off
  its shared background server with a visible "1 warning" footer.
- A switch placed only in `launch.argv`. `resumeArgvFor` never reads it, so create runs inline and resume full-screen,
  and the harvest recompositions then emit it twice (D, `probe-tokens.out`).
- Claude's `--settings '{"tui":"default"}'` as the switch. With two `--settings` the last one wins and the other is
  dropped whole (adversary s1 to s3). `withClaudeSettingsFlag` skips the hook file whenever any `--settings` is present
  (`hooks.ts:969`). It also loses to `CLAUDE_CODE_NO_FLICKER=1` (c9, c11).
- Putting Claude's `tui` key into Tortie's own hook settings file. It is weaker than the variable, works only while
  hooks are on and never reaches another machine.
- Investigator A's Claude decision order. It left out two earlier checks: `Ud()==="local-agent"` gives classic, and
  `CLAUDE_CODE_SESSION_KIND="bg"` gives full-screen and beats the switch (2.1.285, byte offset 181917674). Tortie sets
  neither.
- The worry that Tortie's control-mode client pushes Claude into classic. Claude asks tmux only when `TERM_PROGRAM` is
  unset, and tmux always sets `TERM_PROGRAM=tmux` in a pane (adversary, `runs/envq.txt`).
- Research 130's classic-Claude `CSI 3J` with a replay of up to 10,000 lines, as a standing fact. It was not
  reproduced at idle on 2.1.284 or 2.1.285, and it is unmeasured during streaming. It is not refuted either, which is
  why arms d and f are a gate.
- opencode `--mini` as a safe switch. It regresses image drop (measured twice), dies silently below 1.17.10 and
  replays the whole session on every resize. `OTUI_USE_ALTERNATE_SCREEN=0` is not inline mode (o6).
- pi `--tui-mode regular` as safe to compile. An older pi dies on the unknown flag after its trust question (adversary
  piB), and 0.83.0 has no such flag.
- CodeWhale `tui.alternate_screen = "never"` as inline. It is a viewport, commits nothing to host scrollback and forces
  the mouse off, which is worse than today. On deepseek-tui 0.8.26, `--no-alt-screen` and the config key are both
  ignored (measured).
- grok `--no-alt-screen` as its inline switch. grok still counts it as full-screen and keeps its own full-height
  viewport.
- grok `--minimal` as "session-scoped, writes no config". The binary also says "Sticky", so this is not established
  until measured.
- Investigator c's claim that grok's pane title under `--minimal` could move a Tortie status. Tortie reads only Codex's
  pane title (`src/main/activity/state-machine.ts:288-289`; `oracles.ts:51-70`). What needs measuring again is grok's
  idle stillness and its dialog shapes.
- Investigator c's claim that Qwen has no inline lever outside its settings file. A truthy `CI_*` environment variable
  turns its viewport off (`startInteractiveUI-J2QSGWPU.js:34528-34549`). The lever exists and is rejected.
- Muse's bundled skill text calling Muse an alternate-screen agent. 1.4.1 is inline (measured).
- Levers rejected so no later round re-derives them: `--screen-reader` (Gemini, Qwen); `GEMINI_CLI_SYSTEM_SETTINGS_PATH`
  and `QWEN_CODE_SYSTEM_SETTINGS_PATH`; `QWEN_HOME` and Antigravity's `--gemini_dir`; a planted `SSH_CONNECTION` for
  Antigravity; the `CI_*` lever for Qwen; `env -u TMUX` (research 133 §5 d); tmux `mouse on` (research 133 §5 f).

## 9. What is not settled

- Grok, live. Whether `--minimal` is sticky, whether it combines with `--session-id`, whether a doubled `--minimal`
  errors, whether `GROK_SCREEN_MODE` is read at start, and what `auto` does under a control-mode client. The tmux half
  is measured: when a pane asks for `#{client_flags}` and no normal client was active more recently, Tortie's own
  control-mode client answers (adversary, `ctl.sh`). So a grok started while nobody watches may choose its inline
  viewport, which is neither full-screen nor `--minimal`. This needs his question 2.
- Antigravity's mode on a real remote machine. tmux copies `SSH_CONNECTION` into a pane created by a client that arrived
  over ssh (adversary, `sshenv.sh`, both cases), and Antigravity logs `ssh=%v` in its terminal detection. So a remote
  Antigravity probably runs inline while this Mac's runs full-screen. The Antigravity half is unmeasured.
- Antigravity's exact mouse mode numbers.
- Qwen's `CI_*` lever, live.
- Claude during streaming: whether a resize then sends `CSI 3J` and replays.
- Claude managed or policy settings against the variable.
- A person's shell start-up file exporting `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=0`. The login shell runs after tmux
  sets the pane env, so it would probably win, which would be the person's own opt-out. Not measured.
- Whether Phase 312 and Phase 321 dialog shapes still fire for classic Claude. The Phase 321 corpus does not record which
  screen mode each capture came from.
- `probe:p292` arms d and f against any inline agent that replays on resize.
- deepseek's screen mode on resume, and 0.8.26's own scroll keys.
- cursor's 10-turn re-print on a real conversation (read from code, because making turns would have spent them), and
  the wheel inside its short-lived alternate-screen views.
- opencode `--mini`'s permission and question prompts.
- Droid, in every respect.

## 10. Found on the way, and not this phase

- The local handback composes nothing for a hook-enabled Claude session today. `composeArmedResumeText` refuses the
  `--settings <path>` that `src/main/sessions/create-local.ts:513-515` records on every hook-enabled Claude row, and
  nothing strips it in the local handback (`src/main/sessions/resume-in-place.ts:1025-1044`; `withoutHookSettings`
  exists only in `src/main/restart/extras.ts`). Measured on the pure function by D and confirmed by the adversary's
  reading, not driven in the app. Phase 331 adds no Claude argv token, so it neither widens nor fixes this. It is
  queued as its own entry.
- Muse treats an Enter that arrives right after a fast burst of typing as a newline. Thirty prompts sent with
  `send-keys -l` and an immediate Enter all stayed in the composer; a pause of about 0.35 s submitted. It is queued as
  its own entry.
- Full-screen Claude, under Tortie's `mouse off`, prints "tmux detected · scroll with PgUp/PgDn · or add 'set -g mouse
  on' to ~/.tmux.conf for wheel scroll" (captured in c1 and c2). That advice is false in Tortie, because Claude asks for
  the mouse itself and Tortie's server never reads that file. Research 130 §9 predicted it from the bundle; this round
  observed it. It goes away under the switch.
- Qwen's full-screen start writes `CSI 3J` inside the alternate screen, which wipes any earlier lines in that pane's
  tmux history. omp's first paint does the same on the normal screen.

## 11. Evidence per row

claude. Binary `~/.local/share/claude/versions/2.1.284` at byte offsets: the `NO_FLICKER` and
`DISABLE_ALTERNATE_SCREEN` test at 184129668, the decision function at 184130036, the `/tui` relaunch's dropped
variables at 205547050, Focus view's "needs the fullscreen renderer" at 78678472, the tmux hint at 184133205. Version
2.1.285 at 181917674 for the full decision order with `local-agent` and `bg`, and about 181915300 for the
`TERM_PROGRAM` gate. Docs: https://code.claude.com/docs/en/fullscreen. The 2.1.132 changelog line is quoted in
anthropics/claude-code#56881. Captures: `A/out/c1` to `c12` and `r1`, `r2` (with `r2...after-resize`); `adv/runs/clF`,
`clI`, `spC`, `spF`, `s1` to `s3`, `trF`, `trC`, `ciF`, `ciC`, `envq.txt`.

codex. Research 133. `/Users/gdc/codex` at `b1e72963c3`: `codex-rs/tui/src/lib.rs:2113-2133` and
`codex-rs/tui/src/cli.rs:77-81` (read by D).

cursor. `~/.local/share/cursor-agent/versions/2026.09.18-9a7762b/1218.index.js` at bytes 124766 and 499937 (`1049`),
48748 and 49616 (the clear, with `clearOnMount` defaulting to true), 1056273 (the truncation notice); `3368.index.js`
byte 60756; `index.js` byte 1992378. No `?1000h`, `?1002h`, `?1003h`, `?1006h`, `?1007h` or `?1015h` anywhere in the
bundle. Captures: `A/out/u1`, `u2`, `u2...resize`, `u3`.

gemini. Read, not run. `/usr/local/lib/node_modules/@google/gemini-cli/bundle/`: `chunk-OCLZG6C5.js:13004-13011` (the
default), `chunk-M6NSK26M.js:278899-278937` (the modes and the screen-reader condition), `interactiveCli-COQJBPC2.js:34792`
(mouse follows the buffer), `:33886-33890` (Ctrl+S), `:31716-31728` and `:32965-32970` (resume re-prints),
`gemini-LUNNHKPJ.js:17204-17207`. The adversary confirmed these chunks are the ones the entry loads. Shipped docs:
`docs/reference/configuration.md:418-423`, `docs/changelogs/index.md:694-695` and `:717-721`,
`docs/reference/keyboard-shortcuts.md:45-54`.

droid. https://docs.factory.ai/cli/configuration/settings and https://docs.factory.ai/changelog/release-notes, read
2026-09-29. The registry row is `unverified: true`.

deepseek. `deepseek --help` under a scratch `HOME`. `b/ds-tui-strings.txt:1360` (the hidden `--no-alt-screen`) and
`:15168` (the `alternate_screen` validation). CodeWhale via `gh api`: `crates/tui/src/tui/app/types.rs:465-520`
(`mouse_capture` forced off inline, `:494-495`), `docs/CONFIGURATION.md:2540-2541` and `:255-265`, commits
`df0921ebb8` and `67ad27718b`; `b/cw-changelog.md:5307-5309` (`1007`). Captures: `b/runs/ds-default`, `ds-noalt`,
`ds-nomouse`, `ds-cfg-never`, `ds-cfg-bogus`.

antigravity. Read, not run. `c/agy.strings` (the `altScreenMode` tag, the inline and altscreen help text, `:55434`
`SSH_CONNECTION`, `:56734` the terminal detection format). Its own log, grepped for the one line
`Terminal detection: TERM="tmux-256color" altScreen=true ssh=false`, 7 of 7 files. Docs:
https://antigravity.google/docs/settings?tab=cli, read 2026-09-29. Adversary `sshenv.sh`, `sshenv-a.txt`,
`sshenv-b.txt`.

muse. `muse-bin-1.4.1-R4503.1 --help` and `resume --help`. `b/muse-strings.txt:3860-3868`. The launcher
`~/.local/bin/muse:1085-1110` and `:1036-1057`. One `ESC[?1049h` in an escape table, no mouse modes. Captures:
`b/runs/muse-echo`, `muse-echo2`, `muse-resume`.

qwen. Read, not run. `/Users/gdc/.local/lib/qwen-code/lib/chunks/`: `chunk-7DMTAQJ6.js:901-908` and `:919-926` (the
defaults), `startInteractiveUI-J2QSGWPU.js:34528-34549` (the viewport decision and `isCiEnvKey`), `:48094`
(`alternateScreen: useVP`), `:45242-45247` (the inline clear and remount), `chunk-5Q372OFJ.js:18469-18475` and `:9918`
(`1049` and the clear), `chunk-4XPSVIED.js:123-126` and `:141` (the mouse modes). Research 64:253 measured 0.21.9 on the
alternate screen in tmux. https://github.com/QwenLM/qwen-code/pull/12518.

pi. `/Users/gdc/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent/dist/cli/args.js:170-185` and `:291`,
`dist/core/settings-manager.js:807-809`, `dist/modes/interactive/interactive-mode.js:342`,
`node_modules/@earendil-works/pi-tui/dist/tui-alt-screen.js:14-16` and `:131-143`, `tui-main-screen.js:184` and
`:236-262`, `docs/settings.md:68`, `CHANGELOG.md:181`. Upstream v0.83.0 `args.ts` has no `--tui-mode`
(`adv/pi-args-0830.ts:191-203`). Captures: `b/runs/pi-default`, `pi-full`, `pi-set-full`, `pi-set-full-override`,
`pi-hist-regular`, `pi-hist-full`, `pi-wheel`; `adv/runs/piA`, `piB`, `piC`.

omp. `b/omp-strings.txt` from `/opt/homebrew/Cellar/omp/18.0.11/bin/omp`: line 563768 (the overlay mouse modes),
564080-564121 (the resize borrow), 564868 (the first-paint clear), 564940-564980 (overlays enter `1049`),
599999-600025 (`tui.resizeScrollback`). https://github.com/can1357/oh-my-pi/issues/10232, open. Captures:
`b/runs/omp-default`, `omp-hist`.

grok. Read, not run. `c/grok.strings`: the `--minimal` and `--no-alt-screen` help, `:288263` (clap's "cannot be used
multiple times"), `:323445-323446` ("Sticky") against `:324241` and `:324565` ("session-scoped"), `:337309` (the
`#{client_flags}` probe). Binary `~/.grok/bin/grok-1.0.41` byte 118264677 (`GROK_SCREEN_MODE`, the relaunch text).
Shipped docs `~/.grok/docs/user-guide/01-getting-started.md:213-214`, `03-keyboard-shortcuts.md:27-46`,
`04-slash-commands.md:160`, `05-configuration.md:185`, `:193`, `:557`, `:677-683`, `26-config-reference.md:636`. tmux
`build/vendor/tmux/work/tmux-3.7b/cmd-find.c:113-131` and `:1258-1284`. Adversary `ctl.sh`.

opencode. `/Users/gdc/.opencode/bin/opencode` at byte offsets 63949175 and 63948364 (the screen mode default and the
`OTUI_USE_ALTERNATE_SCREEN` override), 76077495 (the mouse), 82382837 (`--mini`'s split footer with the mouse off),
65217845, 65221234 and 65221930 (the `--mini` text and its refusals). `opencode --help`.
https://github.com/anomalyco/opencode/releases/tag/v1.17.10. Upstream v1.17.9 `packages/opencode/src/index.ts:104-116`
(`.strict()` and the help-only exit). Captures: `A/out/o1`, `o2`, `o4` to `o8`, `or1`, `or2`, `or2...resize`;
`adv/runs/ocB`, `ocMM`, `imM`, `imF`.

Tortie's side. D's `probe-tokens.mts` and `probe-hash.mts` with their `.out` files ran the shipping pure functions over
copies of registry rows; the registry itself was not edited.

## 12. The rulings it needs from him

1. Claude's inline switch is an environment setting, and today Tortie sends no environment setting to another machine
   except its own two identity stamps. Should Tortie also send this one fixed Claude setting to your other machines, so
   a Claude there scrolls like a Claude here? Default: no. Claude on another machine stays full-screen, where its wheel
   already works through Phase 320, and the difference is stated as a limit.
2. Gemini, Qwen, Antigravity and Grok update themselves when started. May the Phase 331 verifier start them? The
   standing resume check starts every installed agent once, with no turns. One more no-turn Grok run under a scratch
   home would show whether Grok's inline flag `--minimal` rewrites Grok's own settings, which decides whether Grok can
   follow in a later round. Default: no. The check runs on the other agents only and says so, and Grok stays as it is.
