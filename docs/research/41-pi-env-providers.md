# 41. pi with the user environment and custom providers

Research 41. Written 2026-08-14. Sources are two trees on this machine, both read in place. /Users/gdc/gmux is the Tortie repo. /Users/gdc/pi is the pi CLI source. Line numbers refer to the trees as read on this date. This document feeds a queued phase for agent environment passthrough.

The operator's report, in their words.

> When Tortie launches pi natively, it does not first load the env variables a user set in .zshrc or equivalent. A user who configures a provider like Fireworks through env variables cannot use pi with custom backends inside Tortie.

## 1. The answer

The report is confirmed from both trees, and the cause is in Tortie, not in pi. Tortie starts a fresh agent pane with no shell of any kind, so no shell startup file ever runs, and the pane environment contains nothing from ~/.zshrc. The only login shell values Tortie injects are PATH and LANG. pi asks its process environment for FIREWORKS_API_KEY, finds nothing, and the Fireworks backend is unusable.

The recommended fix is option D in section 6. Each agent row in agents.json gains a list of environment variable names under a new field, launch.envPassthrough. The list of names joins the confirm hash and prints on the confirm sheet. At each launch and each restore, Tortie resolves the named variables with one login shell probe and injects the resolved pairs into the pane. The values never reach the manifest, the server globals, or any file.

A Fireworks user has a working route today, before any code lands. Running /login fireworks inside pi stores the key in ~/.pi/agent/auth.json, and auth.json beats environment variables in pi's credential order. Section 7 documents that route and its variants. It is the stopgap, not the decision, because only pi has a file surface this complete.

In this document, "rc file" means a shell startup file such as ~/.zshrc.

## 2. Why .zshrc never reaches pi

The chain, in order.

1. Tortie's own process inherits the environment it was launched with. A packaged Finder launch gets the minimal launchd set. That claim rests on code comments (src/main/tmux/resolve.ts lines 8 to 14) and on BACKLOG.md:81, and was not measured live. A dev launch from a terminal gets that terminal's full environment.
2. ensureServer() boots the private tmux server with `env: process.env` (execTmux, src/main/tmux/supervisor.ts lines 494 to 498). The server keeps that frozen environment for its whole life.
3. Tortie injects exactly two variables into the server. `set-environment -g PATH` at supervisor.ts:581 and `set-environment -g LANG` at supervisor.ts:585. These are the only two set-environment calls in the codebase.
4. The PATH value comes from captureLoginShellPath() (src/main/tmux/resolve.ts lines 163 to 255). The probe runs `$SHELL -lic 'printf __GMUX_PATH__%s__GMUX_PATH__' "$PATH"` with a 3 s deadline. The probe shell does read ~/.zshrc, so a key such as FIREWORKS_API_KEY exists inside that shell for a moment. Only the PATH string between the markers is kept. Every other export is discarded with the probe.
5. createSession() starts the pane with `new-session -d ... -e KEY=VAL ... -- <argv>` (src/main/tmux/sessions.ts lines 179 to 185). tmux 3.4 and later runs a multi word argv directly, with no shell in between. pi's launch argv is always at least 3 words because Tortie appends --session-id (src/main/agents/registry.ts lines 963 to 978). So no rc file ever runs in a native pi pane.
6. The explicit per pane variables today are GMUX_MANAGED=1 and GMUX_SESSION_ID (src/main/tmux/env.ts lines 48 to 50), plus the registry row's launch.env. pi's row has none. cursor's row has FORCE_COLOR=1 (registry.ts:457).
7. pi reads FIREWORKS_API_KEY from its process environment (/Users/gdc/pi/packages/ai/src/env-api-keys.ts:104 and packages/ai/src/providers/fireworks.ts:12). The variable is not there, so the provider has no key.

```
~/.zshrc, ~/.zprofile                    Tortie process env
      |                                  (launchd set on a packaged launch)
      | probe: $SHELL -lic                       |
      | 'printf ... "$PATH"'                     | env: process.env
      v                                          v
  PATH string only  ------------->  private tmux server (-L gmux)
  (everything else                  + set-environment -g PATH
   is discarded)                    + set-environment -g LANG
                                                 |
                                                 |  pane env = server env
                                                 |  + -e GMUX_MANAGED=1
                                                 |  + -e GMUX_SESSION_ID=<uuid>
                                                 |  + -e launch.env pairs
                                                 v
                                    pi --session-id <uuid>
                                    (direct exec, no shell, no rc file)
```

Live evidence from this machine. `tmux -L gmux show-environment -g`, read by names only, shows 67 global variables, including npm_*, NVM_* and ELECTRON_RENDERER_URL. The running server froze a dev terminal environment, not the launchd one. No provider key names are present in it. The server keeps its boot environment until it dies, and only PATH and LANG are ever re-asserted.

One smaller channel exists. At attach, tmux copies the 9 variables on the default update-environment list (e.g. SSH_AUTH_SOCK) from the attaching client into the session environment. The attach client's environment is Tortie's own process env with a UTF-8 locale and COLORTERM=truecolor added (src/main/attach/attach-host.ts lines 201 to 208). This adds no rc file values.

## 3. The four launch surfaces disagree today

This mismatch is why the failure can look intermittent to a user.

| Surface | What runs in the pane | Reads .zshrc | Reads .zprofile |
|---|---|---|---|
| Fresh agent create | The agent argv directly, no shell (sessions.ts lines 179 to 185) | No | No |
| Shell tab | $SHELL as a single word, so tmux wraps it and an interactive non login zsh starts (src/main/manifest/agents.ts lines 602 to 605) | Yes | No |
| Restore | The pane runs $SHELL, and the resume argv is typed but not executed (src/main/restore/restore.ts lines 740 to 752 and 850 to 852) | Yes | No |
| The PATH probe at server boot | An interactive login zsh that lives only for the probe (resolve.ts lines 187 to 189) | Yes, then discarded | Yes, then discarded |

Three consequences follow.

- Typing `pi` by hand in a Tortie shell tab works, because that pane sourced .zshrc.
- A restored pi sees .zshrc exports while a freshly created pi sees none. Fresh create and restore disagree.
- Exports placed in ~/.zprofile reach no pane at all today.

The restore row rests on zsh's documented startup rules for an interactive non login shell. It was not exercised against the live app.

## 4. How people configure pi

### 4.1 The credential order

pi resolves a provider credential in this order (pi docs/providers.md, Resolution Order).

1. The --api-key CLI flag.
2. ~/.pi/agent/auth.json.
3. The provider's environment variable.
4. Provider keys in ~/.pi/agent/models.json.

auth.json beats the environment. The stopgap in section 7 stands on that fact.

### 4.2 Configuration surfaces

In pi, a value that starts with "!" names a command. pi runs that command and uses its output as the value. This document calls those "!command" values.

| Surface | Path | What it holds |
|---|---|---|
| auth.json | ~/.pi/agent/auth.json | OAuth tokens and API keys, written by /login, created with mode 0600. A value may be a "!command" resolved at request time. An api_key entry may carry a provider scoped env block that pi consults before process.env (pi docs/providers.md lines 139 to 157; packages/ai/src/types.ts lines 108 and 132). |
| models.json | ~/.pi/agent/models.json | Custom providers and models. baseUrl, headers, and an api kind (openai-completions, openai-responses, anthropic-messages, google-generative-ai). An apiKey may be a literal, a "$VAR" that pi replaces with the variable from its process environment, or a "!command" (docs/models.md, Value Resolution). An unset "$VAR" leaves the model visible but unavailable (models.md line 145). |
| settings.json | ~/.pi/agent/settings.json, plus project .pi/settings.json | defaultProvider and defaultModel. A global httpProxy applied as HTTP_PROXY and HTTPS_PROXY (docs/settings.md). The project file overrides the global one and is gated by project trust. |
| Environment variables | The process environment | Provider keys (section 4.3) and process configuration (section 4.4). |
| Extensions | pi's extension mechanism | Custom API shapes and OAuth flows (docs/custom-provider.md). |

### 4.3 Provider key environment variables

The authoritative map is /Users/gdc/pi/packages/ai/src/env-api-keys.ts. getProviderEnvValue (packages/ai/src/utils/provider-env.ts) checks a credential's scoped env block first, then process.env.

| Provider | Variable |
|---|---|
| fireworks | FIREWORKS_API_KEY (env-api-keys.ts:104) |
| anthropic | ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_OAUTH_TOKEN |
| openai | OPENAI_API_KEY |
| google | GEMINI_API_KEY |
| openrouter | OPENROUTER_API_KEY |
| together | TOGETHER_API_KEY |
| baseten | BASETEN_API_KEY |
| groq | GROQ_API_KEY |
| cerebras | CEREBRAS_API_KEY |
| xai | XAI_API_KEY |
| deepseek | DEEPSEEK_API_KEY |
| mistral | MISTRAL_API_KEY |
| huggingface | HF_TOKEN |
| vercel gateway | AI_GATEWAY_API_KEY |
| zai | ZAI_API_KEY |
| kimi | KIMI_API_KEY |
| minimax | MINIMAX_API_KEY |
| cloudflare | CLOUDFLARE_API_KEY, plus CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GATEWAY_ID |
| azure | AZURE_OPENAI_* |
| bedrock | AWS_* |
| vertex | GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, GOOGLE_APPLICATION_CREDENTIALS |

### 4.4 Process configuration variables

Documented in pi docs/environment-variables.md, confirmed in source where noted.

| Variable | Effect |
|---|---|
| PI_CODING_AGENT_DIR | Moves the whole config dir, default ~/.pi/agent (packages/coding-agent/src/config.ts lines 495 and 515). |
| PI_CODING_AGENT_SESSION_DIR | Moves session storage. Beaten by --session-dir (main.ts:677). |
| PI_PACKAGE_DIR, PI_OFFLINE, PI_SKIP_VERSION_CHECK, PI_TELEMETRY, PI_CACHE_RETENTION, PI_SHARE_VIEWER_URL, PI_HARDWARE_CURSOR, PI_TUI_ESC_TIMEOUT | Documented in environment-variables.md. |
| VISUAL, EDITOR, HTTP_PROXY, HTTPS_PROXY | Standard meanings. |

pi picks its session directory in this order.

1. The --session-dir flag.
2. $PI_CODING_AGENT_SESSION_DIR.
3. $PI_CODING_AGENT_DIR/sessions.
4. ~/.pi/agent/sessions, in per directory subfolders named from the working directory.

The first two are flat, with no per directory key. Tortie pre-assigns the session id with --session-id, so an environment change that moves the store does not break id capture. It does move where the session JSONL lives, which is the hazard behind design point 7 in section 8.

pi also sets AI_AGENT=pi and PI_CODING_AGENT=true as process markers, and it injects PI_SESSION_ID and related variables into bash commands the model invokes, not into the user's own "!" commands (environment-variables.md). None of this affects Tortie.

### 4.5 The three routes to a Fireworks backend

- The built in fireworks provider, keyed by FIREWORKS_API_KEY or by /login fireworks.
- A models.json custom provider with a baseUrl and an api kind, keyed by a literal, a "$VAR", or a "!command".
- An extension, for a custom API shape or an OAuth flow.

Inside Tortie today, the env keyed forms of the first two routes fail identically, because both read the same empty process environment. The /login form, the literal and "!command" forms, and the extension route all work today.

## 5. What the Fireworks user sees today

- Fireworks models are unavailable in /model and in --list-models.
- If a saved session or the settings select fireworks, startup prints "Warning: Could not restore model fireworks/<id> (no auth configured)." and pi falls back to any other authenticated model (packages/coding-agent/src/core/model-resolver.ts near line 725).
- A prompt sent with no usable key fails with "No API key found for fireworks." plus the /login help (core/auth-guidance.ts lines 14 to 25, core/agent-session.ts lines 421 and 443, core/model-registry.ts line 70).
- Non interactive mode with no auth at all exits 1 with "No models available. Use /login..." (main.ts:907).

These strings come from source. No pi process was run to capture a screen.

## 6. The options

Tortie calls a configuration field execution bearing when it changes what process runs or what input it receives. Execution bearing fields are hashed by the confirm gate (src/main/config/confirm.ts lines 119 to 120), and a moved hash forces a fresh human confirmation. The Phase 23 boundary is one sentence. Configuration selects from choices the compiled world already contains, or names an executable the user has personally confirmed. Refusal 8 adds that no configuration change alone may decide what a process runs with, because ~/.zshrc is writable by every agent Tortie runs.

Every option below gives the pi user a path. They differ on the criteria in the table.

| Option | Phase 23 side | Secret hygiene | Staleness | Covers the 9 other launchable agents | Verdict and deciding reason |
|---|---|---|---|---|---|
| A. Copy the whole login environment into the tmux server globals | Outside. An rc edit by any agent changes every session's credentials with no confirmation. | Worst. Keys become readable by every pane and by any same user process through `tmux -L gmux show-environment -g`. | Frozen at server boot. The server outlives app restarts, so a rotated key stays wrong until the server dies. | Yes | Reject. It puts provider keys where every pane and every same user process can read them, and an rc edit by any agent silently rewrites every session's credentials. |
| B. Capture the whole login environment per session, with a registry opt in | Outside. The opt in confirms the agent, not the values, and the value set is the whole rc output. | Keys land in the manifest SQLite in plain text, because spec.env is persisted (core.ts:2172) and replayed at restore (restore.ts:751). | Fresh at create, stale in the manifest copy replayed at restore. | Only opted in agents | Reject. It writes secrets into the manifest in plain text, where they outlive the session. |
| C. Wrap the launch in a login shell, e.g. `zsh -lc 'exec pi ...'` | Outside. Agent writable rc code runs on every launch, inside the agent's own environment. | Good. Values are never persisted. | Fresh at every launch. | Yes | Reject. It runs agent writable rc code on every launch, and the extra shell endangers the measured properties listed below. |
| D. A confirm hashed list of variable names per agent row, values resolved per launch | Inside. The name list is execution bearing and moves the hash. An agent editing ~/.zshrc can change a passed value, but it can never widen the set of names. | Values exist only in the pane's process environment, the same exposure as the user's own terminal export. | Re-resolved at every launch and every restore. | Yes | Accept. |
| E. No code change. Document pi's file routes | No configuration change at all. | auth.json is created 0600, and "!command" values resolve per request. Better than env. | Best. | No. Only pi has a file surface this complete. | Reject as the decision, because the other agents keep the same gap. Ship it as day one documentation. |

The extra shell in option C endangers three measured properties.

- The Phase 12.7 F3 rule launches agents by bare name (src/main/sessions/core.ts lines 2211 to 2229) so `pkill -f "$(command -v claude)"` cannot single out durable sessions. A wrapper moves the agent out of the pkill visible position unless it is built with care.
- Status detection for agents such as qwen matches descendant process ids, and a wrapper puts the agent one process deeper.
- pane_dead_status reports the exit code of the pane's direct child, and a wrapper makes that the shell, not the agent.

The closest prior art for option C is PROBE C in docs/research/18-agent-activity.md lines 675 to 696, a verified ZDOTDIR chain that runs the user's real rc files without writing to $HOME. It was built for OSC 133 and deliberately not shipped.

## 7. The stopgap that works today

These routes need no Tortie change, and they should be documented for pi users on day one.

- Run /login fireworks inside pi once. The key lands in ~/.pi/agent/auth.json with mode 0600, and auth.json beats the environment in pi's credential order. This works in a fresh Tortie pane today.
- For a keychain, set the auth.json value to a "!command", e.g. `!security find-generic-password -s fireworks -w`. pi runs the command at request time, so the key never sits in a file.
- An auth.json api_key entry can carry a provider scoped env block. pi consults it before process.env when it resolves the key and the provider settings, e.g. CLOUDFLARE_ACCOUNT_ID (docs/providers.md lines 139 to 157).
- A models.json custom provider with a literal or "!command" apiKey works for backends beyond the built in fireworks provider.
- Proxy configuration also has a file route, the httpProxy setting in settings.json.
- Running pi inside a Tortie shell tab works, because shell tabs source .zshrc. This is a workaround, not a fix, since such a session is not a native agent session.

## 8. The winning design in full

Option D, in the passthrough shape rather than the literal value shape. Configuration carries names. Tortie stores no values, anywhere.

1. A new overlay field, launch.envPassthrough, an array of environment variable names. It is validated with a count cap and a name pattern. An invalid row is dropped whole and surfaces as a visible error naming the field and the reason, per the standing overlay rule.
2. The field applies to compiled rows as well as configured rows. This was verified rather than assumed. patch() at src/main/config/overlay.ts lines 943 to 971 replaces launch wholesale on a compiled entry, and launchField (overlay.ts lines 394 to 409) requires the row to restate launch.argv with argv[0] equal to binaries[0] (overlay.ts lines 665 to 673). So a row for the compiled pi entry that restates the argv and adds the passthrough list is accepted, moves the hash, and passes the confirm gate.
3. The name list joins ConfigExecutionFields and moves the confirm hash, next to the existing launchEnv field (confirm.ts lines 119 to 120). The confirm sheet prints the names under a line such as "Values for these variables are read from your shell at each launch". The values never appear in agents.json or on the confirm sheet. The hash covers names only.
4. At create, Tortie runs one probe per launch in the exact shape of captureLoginShellPath (resolve.ts:187). The probe prints only the named variables between markers. It has a 3 s deadline and is group killed, per the Phase 13.5.1 lesson that a login shell probe can fork and deadlock (BACKLOG.md:366).
5. The resolved pairs merge into the pane's -e set before managedPaneEnv, so GMUX_MANAGED and GMUX_SESSION_ID stay last and cannot be shadowed (env.ts lines 48 to 50, core.ts lines 2233 to 2238). The pairs must not travel through spec.env, because spec.env is persisted into the manifest row (core.ts:2172). They go straight to the tmux -e arguments.
6. The manifest row stores the name list only. Restore runs the probe again and injects fresh values. Two mismatches close as a side effect. A restored pi and a fresh pi see the same environment, and ~/.zprofile exports start working on both surfaces, because the probe shell is a login shell.
7. Version 1 refuses the names PI_CODING_AGENT_DIR and PI_CODING_AGENT_SESSION_DIR, with a visible error naming the field and the reason. src/main/agents/detection.ts (about lines 90 to 160) expands the registry's store directories against Tortie's own process environment. A pane whose store moved while the harvester still looks in the old place loses session capture. Lifting the refusal later requires feeding the same resolved values to detection.
8. A variable that is unset or empty at probe time injects nothing and surfaces a per session notice. Never a silent empty string.

Secret hygiene, stated as the answer to the obvious objection. A passed value never appears in any of these places.

- Not in agents.json.
- Not in the confirm hash and not on the confirm sheet.
- Not in the manifest SQLite. The row carries names only. This is the exact failure of option B.
- Not in the tmux server global environment, so `tmux -L gmux show-environment -g` shows nothing. This is the exact failure of option A.

The value exists in the pane's process environment for the pane's lifetime. That is the same exposure the user accepts when they export the variable in their own terminal.

The confirm gate answer. The human confirms the set of names, and the confirmation is bound to the hash, so an agent cannot widen the set by editing any file Tortie reads without a fresh confirmation. What an agent can still do is change the value of an already named variable by editing ~/.zshrc. That power is identical to what the same agent already has against the user's own terminal sessions, and it grants no new name and no new credential surface. Options A, B and C fall outside the boundary because they hand the whole rc output, or rc execution itself, to configuration that agents can influence. Option D stays inside it.

One safety property carries over unchanged. tmux resolves a bare argv[0] against the server environment PATH and ignores per pane -e PATH entirely (measured, core.ts lines 2060 to 2071; BACKLOG.md:1925 row 3). So the passthrough can hand variables to a process, but it can never change which binary runs. The bare name launch and the byte equality of resume argv are untouched.

The same field fixes the same class of gap for the 9 other launchable agents (claude, cursor, codex, gemini, droid, deepseek, antigravity, muse, qwen). A codex row can name OPENAI_API_KEY the same way a pi row names FIREWORKS_API_KEY. A pi only fix would not generalize, which is a further reason option E is not the decision.

## 9. Hazards any implementation must respect

- spec.env persists verbatim into the manifest row (core.ts:2172) and replays at restore (restore.ts:751). Resolved values must bypass spec.env.
- GMUX_MANAGED and GMUX_SESSION_ID are the second identity source, read back by getSessionEnv (sessions.ts lines 367 to 385). They stay last in the env merge.
- The login shell probe can fork and deadlock, so it must be group killed on its deadline (Phase 13.5.1, BACKLOG.md:366).
- The store moving names must stay refused until detection.ts shares the resolved values (design point 7).
- The skills spawn path has a related promise. BACKLOG.md lines 1540 to 1560 say skills receive the recovered login shell environment, but skillsEnv (src/main/skills/resolve.ts lines 295 to 308) is process.env with only PATH replaced. A later phase may want to unify the two. This research does not decide that.

## 10. Verification plan

The phase is Tier 3, for these reasons.

- The manifest row gains a field and restore replays it, which is durability.
- The confirm gate hash changes.
- The operator personally reported the bug, so the phase ends with proof, not assurance.

The phase must run these gates.

- Extend `npm run conformance:agents` with 3 assertions. Adding or removing a passthrough name moves the confirm hash, and reordering the names does not. The manifest row round trip carries names only, and a scan of the row bytes finds no resolved value. The resume argv rebuilt from the manifest row alone stays byte equal to the registry's.
- `npm run conformance:resume:capture` on every commit, because manifest/agents.ts and restore/** are touched. The full `npm run conformance:resume` roundtrip once for the phase.
- Live evidence, not code reading, in this sequence.
  1. Export a test variable with a known value in a scratch rc include.
  2. Create a fresh pi session with that name in the passthrough list, type `env | grep` for it in the pane, and see the value.
  3. Read `tmux -L gmux show-environment -g` and confirm the test variable is absent.
  4. Read the manifest row and confirm it holds the name but not the value.
  5. Quit, restore, and see the freshly resolved value in the restored pane.
- `smoke:t3` must still pass both restore shapes.

## 11. What is not true, or not verified

- The packaged Finder launch environment was never measured. The minimal launchd claim rests on code comments (resolve.ts lines 8 to 14) and BACKLOG.md:81. A packaged launch capture should confirm the variable list before the fix is sized.
- No live pane environment was dumped by this research. The pane inherits server env chain is tmux documented behavior plus the repo's own measured comments. The server global environment was read live, by names only.
- The pi failure strings in section 5 come from source, not from a captured screen. No pi process was launched.
- The claim that a restored pane sees ~/.zshrc exports rests on zsh's documented startup rules plus restore.ts spawning $SHELL without -l. It was not exercised against the live app.
- Where the operator's FIREWORKS_API_KEY actually lives, .zshrc or .zprofile or elsewhere, was not established. The fresh create gap is the same in every case, and the recommended design works for both files, which is part of why restore must re-resolve rather than rely on the interactive shell.
- Provider key expectations for the 9 other launchable agents come from product knowledge. None of those CLI sources are on this machine, and the gmux registry records no credential env for any agent.
- The pi tree studied here matches pi docs of the 0.84.x era. The pi binary the operator runs inside Tortie was not version checked against this tree.
- The end to end claim that launch.env values reach a live pane was traced in source only, through overlay.ts, manifest/agents.ts, core.ts and the tmux -e flags. No live pane was created to print the variable.
- For a single word pane command, whether tmux 3.6a wraps it with /bin/sh -c or with the default-shell option was not measured. It does not change the pi finding, because pi's argv is never one word.

## 12. Key files for the implementer

| File | Why it matters |
|---|---|
| src/main/config/overlay.ts | launchField at 394, patch at 943. The new field parses and merges here. |
| src/main/config/confirm.ts | Execution fields at 119, sheet text at 258 and 285, hash at 346. |
| src/main/tmux/resolve.ts | The probe shape, lines 163 to 255. The new probe copies it. |
| src/main/sessions/core.ts | spec.env persistence at 2172, pane env merge at 2233 to 2238, bare name launch at 2211 to 2229. |
| src/main/restore/restore.ts | Pane creation at 740 to 752, typed resume at 850 to 852, env replay at 751. |
| src/main/tmux/env.ts | The managed pane stamps that must stay last. |
| src/main/agents/detection.ts | Store directory expansion, the reason the store moving names are refused. |
| src/main/tmux/sessions.ts | The -e application at 176 to 178 and the direct argv exec at 179 to 185. |
