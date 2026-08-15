# Research 47. Agent installs, the preflight, and the install map

**Decision document. Written 2026-08-15.** It rules on three investigations run the same day, being
a failure reproduction, an installer survey of every agent in the registry, and a field survey of
how other tools handle a dependency that is present but wrong.

**Provenance and safety.** Every claim marked MEASURED comes from one of those three investigations
and says which one. Every claim about the tree carries a file and a line, verified on 2026-08-15
against a working tree with three phase builds in flight, so the line numbers will drift and the
symbol names will not. No installer was executed. No agent binary on this machine was installed,
moved, upgraded or modified. `~/.local/bin`, the npm global prefix and every agent config directory
were read only. The `-L gmux` server was read with `list-sessions` and never written to. Every
reproduction ran in a scratch directory, on a scratch tmux socket, against fake shims built for the
purpose.

---

## 1. The incident, stated plainly

The operator installed Tortie on a second Mac. That machine already had `claude` on it, installed
through npm, which is the way Anthropic recommended before the native installer existed. Tortie
found that installation and launched it. The agent crashed at once. What the operator saw was a dead
pane with no explanation of what had gone wrong.

On the operator's main machine `claude` is the native install at `~/.local/bin/claude`, and
everything works. So the defect appears only on a machine whose agent was installed a different way
from the operator's own.

There are two separate defects inside that one report, and the second is worse than the first.

The first defect is that Tortie asks one question at launch, being does a file with this name exist,
and then launches a second thing, being whatever that file needs in order to run. A native install
is a single Mach-O file, so the two questions have the same answer. An npm install is a script whose
first line names an interpreter, so the two questions can disagree. When they disagree, tmux exits
127 and the process is gone before the user sees anything.

The second defect is that the pane does print the reason, and Tortie throws it away about one second
later. What replaces it is either "Session ended unexpectedly (exit 1)" or, for exit 127, a screen
that tells the user to install claude with `npm install -g @anthropic-ai/claude-code`. That is the
install kind that just failed. Tortie's only piece of install guidance points at the shape of the
problem.

---

## 2. The mechanism, verified against the tree

```
  Electron main, launched by launchd with a minimal PATH
        |
        | ensureServer()                          supervisor.ts:552
        |   userPath = await getUserPath()        resolve.ts:455  (cached for the process)
        |     spawn($SHELL -lic 'printf ...')     deadline 3000 ms, resolve.ts:54
        |     merge(captured, own PATH, extraBinDirs(), SYSTEM)   resolve.ts:190-200
        |     on timeout: fallbackPath()          resolve.ts:114
        |   process.env['PATH'] = userPath        supervisor.ts:558   <-- load bearing
        |   tmux set-environment -g PATH          supervisor.ts:591   <-- inert for PATH
        |
        | create session                          sessions/core.ts:2052
        |   probeDirs = expandDirs(entry.extraProbeDirs)
        |   resolveBinary(name, probeDirs)        resolve.ts:521 -> 486
        |     search userPath, then the entry's dirs, then extraBinDirs()
        |   null  -> AGENT_NOT_FOUND              core.ts:2069
        |   found -> ABSOLUTE path into the manifest, BARE NAME into argv   core.ts:2096
        |
        | tmux new-session -d -P -F ... -c <cwd> -e K=V ... -- <argv>   tmux/sessions.ts:174-184
        |   tmux execvps the argv itself. There is no shell in between.
```

Three facts about that diagram decide the design, and two of them contradict comments in the tree.

**The pane's PATH comes from the tmux CLIENT.** MEASURED independently by two of the three
investigations, on a pristine socket with the gmux conf, on tmux 3.6a. The server process
environment, the global session environment and the client environment were each given a distinct
marker directory. The pane received the client's. A non-PATH variable set with `set-environment -g`
did reach the pane in the same test, so the global environment applies in general and PATH is the
exception. A bare name launched with `-e PATH=<dir>` exits 127, while an absolute argv[0] with the
same `-e` runs. Tortie works only because supervisor.ts:558 makes Electron main the client that
carries the captured PATH. The comment at supervisor.ts:545 to 548 credits `set-environment -g PATH`
at line 591 instead. That comment is wrong, and the next person to tune boot latency will delete
line 558 as redundant and break every pane.

**The comment at core.ts:2079 is right about the symptom and wrong about the cause.** It says tmux
resolves a bare name against the server environment's PATH. It resolves it against the client's. The
exception the comment guards, being an absolute argv[0] when the binary lives only in an entry
directory, is still correct behaviour. Only the reasoning changes.

**`extraBinDirs()` is a list of install locations, not of runtimes.** It names `~/.local/bin`,
`/opt/homebrew/bin`, `/usr/local/bin`, `~/bin`, `~/.claude/local`, `~/.npm-global/bin`, `~/.bun/bin`
and `~/.cursor/bin` (resolve.ts:76). Three of those are places an npm installed agent lives. None of
them is a place a version managed node lives. There is no `~/.nvm/versions/node/*/bin`, no
`~/.local/state/fnm_multishells`, no `~/.volta/bin`, no `~/.asdf/shims` and no `~/.mise/shims`. So
when the login shell capture does not answer in time, Tortie can still find the agent and can no
longer find its interpreter. That is the incident.

### 2.1 The seven reproduced failure modes

MEASURED by the failure investigation, in an isolated scratch directory on a scratch socket, driving
Tortie's own `resolveBinary` and its own `createSession`. Each row is one fake shim. The interpreter
in the shims is named `tortienode` rather than `node`, because `/usr/local/bin/node` exists on this
machine and sits inside Tortie's own `extraBinDirs()`, so `node` could not be made absent without
touching the operator's system. That substitution changes the text of one error message and nothing
about the mechanism.

| # | Failure mode | Exit | What the pane printed | What Tortie showed | Caught by a shebang read |
|---|---|---|---|---|---|
| 1 | Script with `#!/usr/bin/env node`, interpreter absent from the pane PATH | 127 | `env: tortienode: No such file or directory` | "claude could not be found", plus an npm command | yes |
| 2 | Same, reached because the 3000 ms capture timed out and the agent was found in `~/.npm-global/bin`, a Tortie fallback directory | 127 | same as 1 | same as 1 | yes |
| 3 | Interpreter present, the CLI rejects a flag Tortie always passes | 1 | `error: unknown option '--settings'` | "Session ended unexpectedly (exit 1)" | no |
| 4 | Interpreter present but older than the package requires | 1 | `Claude Code requires Node.js ... You are on 22.23.1.` | same as 3 | no |
| 5 | Wrapper needs a login shell variable such as `NVM_DIR` | 1 | `claude: NVM_DIR is not set; cannot locate the node runtime` | same as 3 | no |
| 6 | Wrapper calls a shell function such as `nvm use` | 127 | `nvm: command not found`, then `exec: tortienode: not found` | same as 1 | yes |
| 7 | Hard coded shebang to a node that was removed | 126 | `bad interpreter: No such file or directory` | "Session ended unexpectedly (exit 126)" | yes |

Rows 3, 4 and 5 are agents that start and then exit, so no static check can predict them. They are
why section 6 keeps the pane text.

Two control cases ran in the same harness, so the comparison is honest. A Mach-O shim in
`~/.local/bin` launched cleanly even when the login shell capture timed out, which is the operator's
main machine. The same npm shim launched cleanly the moment the interpreter's directory was on the
captured PATH, which is the same machine on a good boot. Row 2 and that second control are the whole
incident in two runs of one harness with one variable changed.

Flag row 3 is not hypothetical. Tortie always sends claude `--settings <path>` (hooks.ts:335, applied
during create) and `--session-id <uuid>` (registry.ts:433). The registry itself already records the
risk in the droid row at registry.ts:663, in the words "gmux will not put an unverified flag on a
launch argv: a wrong one is a dead pane". An npm install pinned to an older CLI is the same hazard
arriving from the other direction.

### 2.2 The create path is the only path that bypasses the user's shell

MEASURED by the failure investigation. On one server, with one PATH and one shim,
`new-session -- claude-npm` died at 127, while `new-session -- /bin/zsh` followed by typing
`claude-npm --session-id abc` printed the shim's success line. The interactive shell sourced
`.zshrc` and got the interpreter's directory.

Restore already has that shape. It spawns `$SHELL` in the pane (restore.ts:753), replays the
snapshot, then types the resume command with send-keys and no Enter (restore.ts:892). So Tortie's
restore path already owns the property its create path lacks. This is worth knowing and it is not a
licence to change the create path. Creating through a login shell would break the argv contract the
manifest and the resume path both depend on.

### 2.3 The budget that made it fire

MEASURED by the field investigation, replicating `captureLoginShellPath` exactly and timing when the
marker lands. Five runs on the operator's main machine gave 2837, 3077, 3089, 3145 and 3511 ms.
`PATH_CAPTURE_TIMEOUT_MS` is 3000 ms at resolve.ts:54, so four of five runs miss it and
`getUserPath()` returns `fallbackPath()`. The docstring in the same file records 957 ms measured on
2026-08-11. The machine is now 3.2 times that.

The `-i` in `$SHELL -lic` is the cost and it is also the value. `zsh -lc` returns in 49 to 66 ms and
yields 34 PATH directories. `zsh -lic` takes 2837 to 3511 ms and yields 50. The extra 16 directories
include the head of the user's PATH, so dropping `-i` would change resolution order and not only
latency. The answer is a larger budget, not a cheaper probe.

---

## 3. The installer map

Every command below was read on 2026-08-15 from the provider's own page or the provider's own
installer script. None was executed. The registry holds twelve entries and `cursoride` and
`copilotide` carry `launchable: false` (registry.ts:1042 and 1068), so ten agents can ever occupy a
tmux pane and only those ten can produce a dead pane.

| Agent | Canonical command, verbatim | Source, read 2026-08-15 | Other blessed routes | What lands, and the runtime | Canonical provable from disk |
|---|---|---|---|---|---|
| claude | `curl -fsSL https://claude.ai/install.sh \| bash` | code.claude.com/docs/en/setup, tab labelled "Native Install (Recommended)" | `brew install --cask claude-code`, `winget install Anthropic.ClaudeCode`, signed apt, dnf and apk repositories, `npm install -g @anthropic-ai/claude-code` | `~/.local/bin/claude` symlinked into `~/.local/share/claude/versions/<version>`. Self contained binary, no interpreter | Yes. Anthropic states the test itself, being a symlink into `~/.local/share/claude/versions/` |
| codex | `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` | learn.chatgpt.com/docs/codex/cli, listed first and also given as the update command | `npm install -g @openai/codex`, `brew install --cask codex`, GitHub release binaries | `~/.local/bin/codex` through `~/.codex/packages/standalone/current` into `releases/<version>-<target>/bin/codex`. Self contained binary | Yes. `~/.codex/packages/standalone/install.lock` exists |
| cursor | `curl https://cursor.com/install -fsS \| bash` | cursor.com/docs/cli/installation | none documented, no npm and no Homebrew | Files under `~/.local/share/cursor-agent/versions/<version>/`, with `agent` and `cursor-agent` symlinked into `~/.local/bin`. A bash launcher beside a bundled node | Yes. Symlink under `~/.local/share/cursor-agent/versions/` |
| gemini | `npm install -g @google/gemini-cli` | geminicli.com/docs/get-started/installation, listed first under "We recommend most users install Gemini CLI using one of the following installation methods" | `npx @google/gemini-cli`, `brew install gemini-cli`, `sudo port install gemini-cli`, a conda recipe | `<npm prefix>/bin/gemini` pointing at `bundle/gemini.js` with `#!/usr/bin/env node`. Needs system node 20 or newer | The question does not apply. npm is the canonical route |
| qwen | `curl -fsSL https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.sh \| bash` | github.com/QwenLM/qwen-code README, listed first | `npm install -g @qwen-code/qwen-code@latest` needing node 22 or newer, `brew install qwen-code` | A 71 byte `sh` wrapper at `~/.local/bin/qwen` that execs `~/.local/lib/qwen-code/bin/qwen`, with a bundled node at `~/.local/lib/qwen-code/node/bin/node`. Needs no system node | Yes, and it is the strongest of the ten. `~/.qwen/source.json` records the install source |
| muse | not confirmed, see section 13 | no public Meta page was reachable. The launcher at `https://api.meta.ai/muse-launcher.sh` is first party and is not a documented install command | unknown | The launcher keeps the binary as `muse-bin-<version>` beside itself and never edits PATH | Yes, by markers. `.muse-version` and `muse-bin-*` sit beside the launcher |
| pi | `curl -fsSL https://pi.dev/install.sh \| sh` | pi.dev home page, listed first | `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`, plus the pnpm and bun equivalents, all three with `--ignore-scripts` | The canonical script performs an npm install into the global prefix when writable and otherwise into `$HOME/.local`. Needs system node 22.19.0 or newer | No. The canonical installer is itself an npm install and writes no marker |
| deepseek, display name CodeWhale | `npm install -g codewhale` | github.com/Hmbown/CodeWhale `docs/INSTALL.md`, listed first and described as recommended | `curl -fsSL https://codewhale.net/install.sh \| sh`, `brew tap Hmbown/deepseek-tui && brew install deepseek-tui`, `cargo install codewhale-cli --locked`, prebuilt archives | `bin/codewhale.js` and `bin/codew.js` under the npm prefix. Needs system node 18 or newer | The question inverts. A Rust binary in `~/.local/bin` proves the alternative route, not the canonical one |
| antigravity | `curl -fsSL https://antigravity.google/cli/install.sh \| bash` | antigravity.google/docs/cli/install | none documented | A 176 MB Mach-O written straight to `~/.local/bin/agy`, with no version directory and no symlink. The installer edits the shell profile unless `--skip-path` is passed | Partly, by path only. A hand copied binary at the same path is indistinguishable |
| droid | `curl -fsSL https://app.factory.ai/cli \| sh` | docs.factory.ai/cli/getting-started/quickstart, listed first of four | `brew install --cask droid`, `npm install -g droid`, a PowerShell line on Windows | A SHA256 checked binary copied to `~/.local/bin/droid`. No marker, no symlink, no state file | No. It is the weakest of the ten |
| cursoride | not applicable, `launchable: false` | not applicable | not applicable | never a tmux pane | not applicable |
| copilotide | not applicable, `launchable: false` | not applicable | not applicable | never a tmux pane | not applicable |

Grok has no registry row, so it is not in the map. The survey mapped it anyway as a candidate. Its
canonical command is `curl -fsSL https://x.ai/cli/install.sh | bash` from the xai-org/grok-build
README, which documents no npm route, while an npm package `@xai-official/grok` exists and is
installed on this machine at 1.0.4.

### 3.1 Read the last column honestly

Canonical is provable from disk for five agents, provable by path alone for one, impossible for one,
and the question is malformed for three because npm is what the provider recommends. A design that
treated an npm install as a defect would flag gemini, pi and CodeWhale users who did exactly what
their provider told them to do.

The axis that decides whether a launch works is the runtime, not the route. Under their canonical
routes, four of the ten launchable agents are node scripts at run time, being gemini, pi, CodeWhale
on npm, and cursor which ships its own node beside the script. Five are self contained binaries,
being claude, codex, antigravity, droid and CodeWhale on the curl route. One, qwen, is a script with
a bundled interpreter and is immune either way.

### 3.2 Ground truth read from this machine, 2026-08-15

Gathered with `command -v`, `readlink`, `file`, `ls` and reads of wrapper scripts. No agent was
executed for this table.

| Binary | Resolves to | Real target | Kind | Verdict |
|---|---|---|---|---|
| claude | `~/.local/bin/claude` | `~/.local/share/claude/versions/2.1.233` | Mach-O arm64 | canonical native |
| codex | `~/.local/bin/codex` | `~/.codex/packages/standalone/releases/0.147.0-aarch64-apple-darwin/bin/codex` | Mach-O arm64 | canonical standalone |
| cursor-agent | `~/.local/bin/cursor-agent` | `~/.local/share/cursor-agent/versions/2026.08.11-e8db854/cursor-agent` | bash script plus bundled node | canonical script |
| gemini | `~/.npm-global/bin/gemini` | `@google/gemini-cli/bundle/gemini.js` 0.54.0 | node script | canonical route, shadowing a newer 0.55.1 |
| qwen | `~/.local/bin/qwen` | execs `~/.local/lib/qwen-code/bin/qwen` | 71 byte sh shim | canonical standalone |
| muse | `~/.local/bin/muse` | `muse-bin-0.1.0-R708.1` beside it | bash launcher plus binary | canonical launcher |
| pi | `~/.npm-global/bin/pi` | `@earendil-works/pi-coding-agent/dist/cli.js` 0.84.2 | node script | npm, indistinguishable from canonical |
| deepseek | `~/.npm-global/bin/deepseek` | `deepseek-tui/bin/deepseek.js` 0.8.26 | node script | the superseded package |
| agy | `~/.local/bin/agy` | itself, 176 MB | Mach-O arm64 | canonical, by path only |
| codewhale, codew, droid | not found | | | not installed here |

Three live hazards were found on the operator's own main machine while reading this. All three are
read only findings and none was fixed.

1. Two gemini installs exist. `command -v gemini` gives `~/.npm-global/bin/gemini` at 0.54.0, while
   `npm prefix -g` is `~/.nvm/versions/node/v22.23.1` where `npm ls -g` reports 0.55.1. The older
   copy wins on PATH, so `npm install -g @google/gemini-cli` upgrades a copy that never runs.
2. Two codex installs exist, being 0.147.0 native at `~/.local/bin/codex` and 0.77.0 npm at
   `~/.npm-global/bin/codex`. PATH order alone decides which runs.
3. The command name `agent` is contested. Cursor's installer symlinks both `agent` and
   `cursor-agent`. On this machine `~/.local/bin/agent` was created on 2026-08-12 and points at
   `~/.grok/bin/agent`, while `cursor-agent` from 2026-08-11 still points at Cursor. Tortie probes
   `cursor-agent`, which is the name that survived, so the registry made the right call. Anyone who
   later modernises that probe to `agent`, because Cursor's docs now write `agent --version`, will
   launch grok.

---

## 4. What other tools do

MEASURED by the field investigation on this machine, warm cache, unless a row says otherwise.

### 4.1 Preflight and doctor patterns

| Tool | What the check runs | Measured here | What the user sees on failure |
|---|---|---|---|
| `gh auth status` | reads local config and the keyring | 688 ms logged in, 339 ms logged out, exit 1 | "You are not logged into any GitHub hosts. To log in, run: gh auth login" |
| `brew doctor` | 73 named checks, counted from `brew doctor --list-checks` | 16,429 ms, one run | a warning list, and a manpage line telling the user to ignore it if everything works |
| `docker info` | contacts the daemon socket | 1875 ms, exit 1 | "ERROR: Cannot connect to the Docker daemon at unix:///Users/gdc/.docker/run/docker.sock. Is the docker daemon running?" |
| VS Code shell environment resolution | launches the user's login shell when the app started from the Dock | budget is `application.shellEnvironmentResolutionTimeout`, default 10 s | "Shell environment startup error", advising the user to comment out slow startup lines or launch with `code .` |
| VS Code shell integration | injects a script and reports quality as None, Rich or Basic | not measured | nothing modal. The state sits on a terminal tab hover with a "Show Details" affordance |
| `mise doctor` | documented as "Check mise installation for possible problems" | not installed here | a warning list, e.g. "[WARN] plugin node is not installed" |
| asdf | `asdf which` prints the real target, `asdf reshim` rebuilds stale shims | not installed here | no automatic diagnosis |

Four properties are shared by every good example in that table.

- The check is a separate verb from the work. `gh auth status` is not `gh` failing at a task.
- The failure names the exact next command and does not run it.
- Heavy diagnosis is opt in and off the hot path. Nobody waits 16.4 s during a launch.
- The passive indicator is free. VS Code puts integration quality on a hover, not in a dialog.

### 4.2 Who asks, and how

| Tool | Exact wording | Who runs it | Shown before it runs |
|---|---|---|---|
| Corepack | `! Corepack is about to download ${input}` then `? Do you want to continue? [Y/n] ` | corepack | the full URL. It prompts only when `process.stdin.isTTY && !process.env.CI`, and only when the user did not type `corepack` themselves |
| npm exec and npx | `Need to install the following packages:\n<pkg>\nOk to proceed? `, default `y` | npm | package names. With no TTY or in CI it does not ask at all |
| Homebrew installer | the directories it will create, then "Press RETURN/ENTER to continue or any other key to abort" | the script | the whole list. `NONINTERACTIVE` skips the prompt |
| iTerm2 | the menu item TYPES `curl -L https://iterm2.com/shell_integration/install_shell_integration.sh \| bash` into the current session | the user, by pressing Return | the command itself, plus an offered "Internet-Free Install" alternative |
| `xcode-select --install` | "xcode-select: note: install requested for command line developer tools", and with no UI, an error naming developer.apple.com | a system service, after the user clicks Apple's own dialog | no command, because no command runs in the user's account |
| Cursor's own PATH shim | "Error: No Cursor IDE installation found." then "Or, install Cursor at https://cursor.com/download" | nobody. It refuses and names a URL | a URL, not a command |

Three rules fall out of that table.

- Everything that downloads shows what it will fetch first.
- The confirmation is asked when the user did not ask for the install and skipped when they did.
- Every one of them except iTerm2 and xcode-select degrades to unattended installation when there is
  no TTY.

That last rule matters for Phase 23. Tortie's refusal 8 is a stricter stance than any shipped
precedent this survey found, and the reason is a fact about Tortie rather than a preference. Tortie
runs many agent processes at once under one user account with write access to the home directory.

### 4.3 Version manager reality on macOS

- nvm's README states "Please note that `which nvm` will not work, since `nvm` is a sourced shell
  function, not an executable binary." Verified here, `zsh -lic 'type nvm'` prints "nvm is a shell
  function from /Users/gdc/.nvm/nvm.sh". `rbenv` is also a function on this machine.
- nvm puts no shim on PATH. It puts a version directory on PATH, here
  `/Users/gdc/.nvm/versions/node/v22.23.1/bin`, added by a line in a startup file. A process that
  runs no startup file never sees it.
- mise's FAQ states that `mise activate` cannot work outside an interactive shell, that shims are
  best for IDEs for that reason, and that the alternatives are shims on PATH or prefixing with
  `mise x --`.
- VS Code built the same workaround Tortie did, launching the user's login shell at startup because
  it is not otherwise running in the context of a shell, with a 10 s default budget.

The standard fix, strongest first, is to resolve the real target rather than trust the shim, then
read the shebang and resolve the interpreter too, then capture the login shell environment once with
a budget nearer 10 s than 3 s.

### 4.4 The health check budget

Version flag cost on this machine, warm, medians of 5 to 6 runs.

| CLI | p50 | min | max |
|---|---|---|---|
| tmux `-V` | 10 ms | 10 | 16 |
| codex, native | 27 ms | 9 | 32 |
| gh | 44 ms | 39 | 315 |
| claude, native | 133 ms | 112 | 181 |
| qwen, sh wrapper | 150 ms | 128 | 451 |
| cursor-agent | 669 ms | 583 | 757 |
| opencode, native | 725 ms | 639 | 787 |
| amp | 814 ms | 733 | 955 |
| pi, npm and node | 1148 ms | 843 | 1690 |
| gemini, npm and node | 6937 ms | 1553 | 11,084 |

The spread matters more than the median. gemini measured a 1650 ms median at one point in the
session and 6937 ms twenty minutes later, same binary and same machine. Three of six runs exceeded
`VERSION_PROBE_TIMEOUT_MS`, which is 4000 ms at detection.ts:56, so detection reports
`version: null` for a correctly installed agent some of the time.

Whole scan cost for 8 agents, MEASURED. Name resolution with the filesystem only, across 12 names,
1.98 ms. The structural check with no subprocess, being realpath plus shebang plus interpreter
resolution, 4.05 ms in total and 0.137 to 1.358 ms per agent. Parallel `--version`, 9039 ms of wall
clock. Serial `--version`, 22,458 ms.

The conclusion is the design. A launch gate must never run `--version`, because the worst measured
single case is 11,084 ms and what it returns is a version string rather than the fact that failed. A
launch gate can afford the structural check, because it is under 1 ms for the single agent being
launched and it answers the question that actually broke.

---

## 5. The detection model

Tortie records six things per resolved agent. Five are free. One is not, and it moves off the launch
path.

| Field | How it is determined | Cost | Where it runs |
|---|---|---|---|
| `binPath` | Unchanged. `resolveBinaryAgainst` walks userPath, then the entry's dirs, then `extraBinDirs()` | 1.98 ms for all 12 names, MEASURED | detection scan and launch |
| `realPath` | `realpathSync(binPath)`, so a symlink chain reaches the file that actually runs | under 0.1 ms | both |
| `runtime` | Read the first two bytes. If they are `#!`, parse the line, expand a `/usr/bin/env X` form to `X`, and resolve `X` against the same PATH the pane will get. Otherwise report `binary` | 0.137 to 1.358 ms per agent, MEASURED | both |
| `installKind` | Match `realPath` against the entry's `install.signature` tests, which are path shapes only. One of `canonical`, `package-manager`, `unknown` | filesystem stat only, under 0.5 ms | detection scan only |
| `version` | Unchanged probe, `<bin> --version` through `runGuarded` | 10 ms to 11,084 ms, MEASURED | detection scan only, NEVER at launch |
| `health` | Derived from `runtime` alone. One of `ok`, `interpreter-missing`, `unreadable`, `unknown` | included above | both |

Three judgments inside that table.

**A version manager shim is not an install kind.** It was proposed as a fourth value of
`installKind` and it is rejected. What breaks a launch is the runtime, being whether the interpreter
named on the shebang line resolves, and that is a separate axis from how the agent reached the disk.
A qwen installed the canonical way carries its own bundled node and is immune. A gemini installed
the canonical way is a node script and is exposed. Folding the two axes into one field would say the
wrong thing about both agents.

**The version probe leaves the launch path entirely.** Its budget also rises from 4000 ms to
10,000 ms, matching what VS Code allows its own shell probe, because the scan is parallel and cached
so a larger budget costs nothing when nothing is slow.

**The registry gains one field, and it holds no executable strings.**

```ts
/** Where this agent comes from, and how to tell. Nothing here is ever run. */
export interface AgentInstallInfo {
  /** The provider's own first-listed command, verbatim. DISPLAY ONLY. */
  canonical: {
    command: string;      // e.g. 'curl -fsSL https://claude.ai/install.sh | bash'
    docUrl: string;       // the page it was read from
    readOn: string;       // ISO date the page was read
  };
  /** Other routes the provider blesses, named so Tortie can say "you used X". */
  alternates: { label: string; command?: string }[];
  /** True when the provider's own first choice IS a package manager. */
  canonicalIsPackageManager: boolean;
  /** Path shapes that prove the canonical route. null means not provable. */
  signature: InstallSignature[] | null;
}

export type InstallSignature =
  | { kind: 'realpath-under'; dir: string }    // ~/.local/share/claude/versions
  | { kind: 'marker-file'; path: string }      // ~/.qwen/source.json
  | { kind: 'sibling-glob'; glob: string };    // muse-bin-*
```

`AGENT_INSTALL_COMMANDS` at src/renderer/state/agents.ts:61 is deleted. It holds two npm lines, one
of which is the install kind that broke on the operator's second Mac, and it is what the exit 127
screen prints today.

---

## 6. The preflight

**A launch runs the structural check and never a subprocess.** It runs inside `createSession`
immediately after the resolve at core.ts:2060 and before anything is written or spawned, which is
where `AGENT_NOT_FOUND` already lives, so the failure gets a typed error and a modal rather than a
pane.

The probe is the same three steps for all twelve agents. Open the resolved file and read the first
two bytes. If they are not `#!`, the answer is `ok`. If they are, read to the end of the first line,
take the interpreter, expand `/usr/bin/env X` to a bare `X`, and resolve that name against
`userPath`, which is byte for byte the PATH the pane will get. Found is `ok`. Not found is
`interpreter-missing`, and that is the only answer that blocks a launch.

**There is no subprocess, so there is no probe timeout.** There is a wall clock guard on the check
itself. If the whole check exceeds 250 ms, or throws for any reason, it returns `unknown` and the
launch proceeds. Failing open is deliberate. A health check that can stop a working agent from
starting is worse than the bug it was written for.

**Caching.** An in-memory map keyed by the tuple `realPath | mtimeMs | size | pathEpoch`, where
`pathEpoch` is a counter bumped whenever `getUserPath()` is recaptured. A hit is a map read. A
healthy agent is checked once per process, and the check re-runs exactly when its answer could have
changed, being an upgrade in place or a new PATH. There is no timer, no disk cache and no
invalidation to get wrong across restarts.

**Keeping the pane text, which is the operator's second complaint.** The preflight cannot predict
rows 3, 4 and 5 of the table in section 2.1. For those, Tortie already has the sentence and destroys
it. `reapDeadSession` at sessions/core.ts:1764 calls `captureSessionSnapshot` at core.ts:1776, which
reaches `tmux.capturePane` at restore/snapshots.ts:591, and only then kills the session at
core.ts:1780. So the change is small. Take the last five non-empty lines of that captured text,
strip ANSI, cap at 500 bytes, and write them to a new `exitDetail` column on the manifest row beside
the `exitCode` already written at core.ts:1787. The renderer prints them. Nothing new is spawned and
nothing new is captured.

Two guards on `exitDetail`. It is truncated at 500 bytes so a chatty crash cannot bloat the
manifest. It is shown verbatim in a monospace block and never parsed, because parsing agent error
text is a maintenance burden with no upside.

---

## 7. The failure surface

Four states. None of them is a dead pane. The copy below is final text.

**A. Absent entirely.** Thrown before launch, as today, with new copy.

> ### Claude Code is not installed
>
> Tortie looked for a program named `claude` on your login shell's PATH and in the places Claude
> Code installs itself. It found nothing.
>
> Anthropic's own install command is below. Copy it and run it in a terminal. Tortie does not run
> install commands for you.
>
> ```
> curl -fsSL https://claude.ai/install.sh | bash
> ```
>
> Read from Anthropic's install page on 15 August 2026. [Open that page]
>
> `[Copy command]  [Try again]`

**B. Present but broken.** A new state. This is the incident, caught before anything spawns.

> ### claude is installed but cannot start
>
> The file at `/Users/you/.npm-global/bin/claude` is a script, not a program. Its first line asks
> for `node`, and `node` is not on the PATH this session would get. The session would open and
> close within a second, so Tortie did not start it.
>
> There are two ways forward.
>
> 1. Install Claude Code the way Anthropic recommends. That version needs no `node` at all.
> 2. Make `node` visible to Tortie by adding its directory to your login shell's startup file, then
>    quitting and reopening Tortie.
>
> ```
> curl -fsSL https://claude.ai/install.sh | bash
> ```
>
> Read from Anthropic's install page on 15 August 2026. [Open that page]
>
> `[Copy command]  [Start it anyway]`

`Start it anyway` is present and it matters. Tortie's check can be wrong, e.g. a wrapper that
re-execs through something Tortie cannot see. The button launches with the same argv the check
refused, and the resulting dead pane lands in state D with its text intact.

**C. Present, works, not the canonical route.** This never blocks, never opens and never appears at
launch. It is one line inside Settings then Agents, under the agent's path, following the VS Code
pattern of putting a quality answer on a passive surface.

> Installed with npm, at `~/.npm-global/bin/gemini`. Runs on Node from
> `~/.nvm/versions/node/v22.23.1/bin/node`.

and for an agent whose provider prefers something else:

> Installed with npm. Anthropic recommends the native install, which does not need Node.
> [Read Anthropic's install page]

There is no badge, no toast, no count and no nag. An install that works is not a problem, and the
only reason to mention it is that the user may be debugging something else.

**D. Started and then died.** Replaces both existing dead states.

> ### claude stopped right after it started
>
> The session ran for 0.4 seconds and exited with code 1. The last thing it printed was:
>
> ```
> error: unknown option '--settings'
> ```
>
> Restart runs the same command again. If the message above names a missing program or an option
> the agent does not know, restarting will not change the result.
>
> `[Restart]  [Copy message]`

The exit 127 special case at TerminalRegion.tsx:224 to 238 is deleted. It exists because Tortie had
nothing else to say. It currently says the wrong thing, being that the agent could not be found when
in fact the agent was found and its interpreter was not, followed by an npm command that would
reinstall the same broken shape. It also suppresses Restore, so its only action is Restart, and
Restart re-runs the identical create path and dies identically. State B catches that case before
launch now, and state D catches whatever B could not predict.

---

## 8. Install guidance, the ranked decision

**Recommendation: show the canonical command with a copy button and the provider's page link. Tortie
never runs it and never types it.**

| Option | Verdict | Deciding reason |
|---|---|---|
| Show the command, copy button, doc link | **Adopt** | The user's own terminal is the confirmation, and the bytes that run are bytes the user pasted. It hands over the exact string, which is the whole value of the survey, and it costs Tortie no new capability |
| Arm the command in a Tortie pane, human presses Enter | Reject | Any process that can reach the `-L gmux` socket can send Enter to that pane, and Tortie runs several agent processes under the same account with home directory write access. Arming a remote fetch turns one stray `send-keys` into a completed install. Restore's armed line does not carry this risk, because its payload is the user's own agent resuming rather than a fresh download |
| Run it after a native confirmation dialog | Reject | This is refusal 8 with a dialog on it. The agreement refusal 8 requires is bound to a hash of the fields that decide what runs, and the bytes behind an install URL change on every provider release, so the hash can never be computed. It would also make Tortie the party that ran the installer |
| Link the documentation and nothing else | Reject | It throws away the finding. The user is at a broken machine, and the specific string is what unblocks them. The link stays beside the command as the answer to staleness |

Three notes keep the rejections honest.

The arming option is genuinely close, and iTerm2 does exactly it for its own shell integration
installer. It is rejected on a fact that is true of Tortie and not of iTerm2, being the shared tmux
socket and the agent processes on it. If that ever stopped being true, the option becomes available
again.

Tortie's stance is stricter than every shipped precedent in section 4.2. Corepack, npm and the
Homebrew installer all prompt when a human is present and install unattended when one is not. Tortie
has no unattended mode here at all.

The copy in states A and B says the refusal out loud, in the words "Tortie does not run install
commands for you". Saying it once removes the question of whether there is a button the user has not
found.

---

## 9. Precedence

**The order.** First, an explicit path the user set for that agent in Settings then Agents. Second,
the first hit in the captured login shell PATH. Third, the entry's `extraProbeDirs`. Fourth,
`extraBinDirs()`. Levels two to four are today's behaviour at resolve.ts:486 and do not change.
Level one is new and it goes through the Phase 23 confirm gate unchanged, because it names an
executable and that is exactly the case the gate exists for.

**What changes is the record, not the pick.** `resolveBinaryAgainst` gains a sibling that collects
every hit instead of returning at the first. The walk is identical, so the cost is the same 1.98 ms
for twelve names. Settings then Agents then shows the shadowed copies.

> Two copies of `codex` are installed. Tortie uses `~/.local/bin/codex`, version 0.147.0, because it
> comes first on your PATH. There is also `~/.npm-global/bin/codex`, version 0.77.0.

That sentence is worth the whole item on the operator's main machine, where section 3.2 found three
shadowing hazards, including a gemini that `npm install -g` keeps upgrading and that never runs.

**The bare name invariant survives untouched.** Launch stays by bare name per Phase 12.7 F3, with
the existing exception at core.ts:2096 for a binary that lives only in an entry directory. A user
override is not a reason to break the invariant either. An overridden path is resolved, and if the
bare name on the pane PATH resolves to the same file, the launch is still by bare name.

---

## 10. Staleness

The map will rot. Three mechanisms keep it honest and none of them requires the network.

**Never store a command Tortie can run.** `AgentInstallInfo.canonical.command` is typed as a display
string, it is rendered into a code block and a clipboard write, and there is no call site that
passes it to a spawn. A reviewer can check that with one grep.

**A conformance gate that checks shape only.** `npm run conformance:installs`, in the pattern of
`conformance:agents`, spawning nothing and making no request, about 1 s, added to the gates for any
commit under `src/main/agents/registry.ts`. It asserts six things.

1. Every entry with `launchable: true` has an `install` row.
2. `canonical.command` is non-empty and contains no `sudo`.
3. `canonical.docUrl` uses `https:` and its host is on that agent's allowlist, so a bad edit cannot
   point a user at an unrelated domain.
4. `canonical.readOn` parses as a date and is not in the future.
5. `canonicalIsPackageManager` agrees with whether the command begins with a package manager name.
6. Every `signature` path is under the home directory and contains no `..`.

**A stated cadence, and a date the user can see.** The install table is re-read once per quarter and
after any agent CLI upgrade, and the re-read updates `readOn` even when the command did not change.
The surface prints the date with the link beside it. When `readOn` is older than 180 days the
surface adds one line, being "This was read some time ago. Check the page if the command does not
work." The user is never left holding a stale string with no way to tell.

**A signature that fails never blocks.** Its only effect is the advisory line in state C. A provider
moving its install directory should cost the user one wrong sentence in Settings, not a refused
launch.

---

## 11. Two defects found in the tree while judging

Both were found by reading, both are separate from the incident, and neither has been fixed.

**`core.ts:2096` tests the wrong thing.** The code is
`const onLoginPath = probeDirs.length === 0 ? abs : await tmux.resolveBinary(bare);` followed by
`bareName = onLoginPath === null ? undefined : bare;`. It checks `onLoginPath` for null when it
should compare it for equality with `abs`. The two can differ, because `abs` searched the entry's
`extraProbeDirs` before `extraBinDirs()` and `onLoginPath` did not, and both directory sets reach
the pane's PATH through the merge at resolve.ts:190 to 200. When they differ, the manifest records
one file and the pane runs another. The fix is one comparison, and it makes the invariant more
honest rather than less, because the absolute argv is then used only when the bare name would have
run a different file.

**Two comments credit the wrong line for the pane's PATH.** supervisor.ts:545 to 548 says
`set-environment -g PATH` at line 591 is what makes panes work, and core.ts:2079 says tmux resolves
a bare name against the server environment. Both were measured wrong, twice, independently. The load
bearing line is `process.env['PATH'] = userPath` at supervisor.ts:558.

---

## 12. The phase split

| Phase | What lands | Tier | The evidence that closes it |
|---|---|---|---|
| A. PATH truth | `PATH_CAPTURE_TIMEOUT_MS` 3000 to 10,000. Correct the supervisor.ts:545 comment and the core.ts:2079 comment. Log which PATH was used and how long the capture took | 3 | Five timed captures before and after on the operator's machine. A driven app launch showing the captured path in the log. This is durability, and it is a bug the operator reported |
| B. Preflight and exit detail | `src/main/agents/health.ts`, wired into `createSession`. The `exitDetail` column, filled from the pane text the reaper already captures. Failure states A, B and D, with the exit 127 branch deleted | 3 | The seven reproduced modes from section 2.1, re-run against the new build, as a per-mode table showing the sentence each one now produces. No mode may produce a bare exit code |
| C. The install map | `AgentInstallInfo` on all twelve rows. `conformance:installs`. `AGENT_INSTALL_COMMANDS` deleted. State C in Settings | 2 | Gates, the new conformance gate, one screenshot of Settings then Agents |
| D. Precedence | Collect-all resolution, the equality fix at core.ts:2096, the shadowed-copy line, the per-agent path override behind the Phase 23 gate | 2, with the bare name item at 3 | Tier 2 for the UI. Tier 3 for the invariant, being a `smoke:t3` case proving a session created with a shadowed binary launches the file the manifest recorded, and that a normal agent still launches by bare name |
| E. Version probe | `VERSION_PROBE_TIMEOUT_MS` 4000 to 10,000. Assert the probe cannot be reached from the create path | 1 | Gates, plus one detection scan showing a version for gemini on a machine where it currently returns null some of the time |

Order is A, B, C, D, E. A and B together are the incident and they are worth shipping alone. C, D
and E are the resilience around it.

---

## 13. What is not true

- **The second Mac was never observed.** Every reproduction in section 2.1 is a fake shim built in a
  scratch directory. The mechanisms are proven. Which one fired on the operator's second machine is
  not. The two strongest candidates by shape are the interpreter not resolving in the pane, which is
  exit 127 and would explain the misleading "could not be found" screen, and an older npm CLI
  rejecting `--settings` or `--session-id`, which is exit 1 and would explain a dead pane with no
  explanation at all.
- **No installer was executed and no agent binary was modified.** The current
  `@anthropic-ai/claude-code` npm package is not installed on this machine. Anthropic documents a
  failure where a skipped postinstall leaves `claude` as a placeholder that prints "Error: claude
  native binary not installed." and exits, which matches the symptom exactly and remains a
  hypothesis.
- **Whether the second Mac's claude was an old npm install running under node, or the current npm
  package that delivers a native binary through an optional dependency, is unknown.** The two have
  different failure modes and the fix Tortie should suggest differs between them.
- **Why tmux prefers the client's PATH over both the server global and `-e`** was measured six times
  across two investigations on tmux 3.6a and was not read out of tmux's source. Confirm it against
  `spawn.c` before building a fix on top of it.
- **All timings are warm cache** on the operator's main machine, which had already run these
  binaries in the same session. Cold start was not measured, and the file cache could not be purged
  without sudo.
- **The 0.137 to 1.358 ms structural check number** was measured over eight agents present on this
  machine, not over all twelve, because droid and CodeWhale are not installed here.
- **The claim that the structural check would have caught the incident** is an inference from the
  reproduced failure shape. It is proven for rows 1, 2, 6 and 7 of the table in section 2.1 and it
  is not proven against the second Mac.
- **muse's canonical command is unknown.** No public Meta page was reachable and `muse.meta.ai` does
  not resolve in DNS. The muse row is built from the launcher script served by `api.meta.ai`, which
  is first party and is not a documented install command. That row ships with `canonical.command`
  empty and a signature only, or it does not ship.
- **The `npm install -g @openai/codex` shape was not confirmed.** Whether it delivers a native
  binary through an optional dependency, the way claude's package now does, or a JS entry point,
  decides whether a codex npm install is exposed to the interpreter problem at all.
- **Update behaviour is undocumented for three agents.** antigravity and droid state no update
  command on their pages, and qwen's README does not describe self update. The antigravity row's
  update claim is inferred from `~/.gemini/antigravity-cli/updater/` on disk, which is evidence of
  behaviour and not documentation.
- **The exact wall clock of the login shell probe inside the running Tortie was not read.** The 2837
  to 3511 ms figures come from replicating `captureLoginShellPath` outside the app. The running
  app's logs were out of bounds.
- **No renderer behaviour was watched on screen.** Sections 6 and 7 describe copy read from
  `TerminalRegion.tsx` and `status.ts`. The one second flash before the reaper destroys the pane is
  inferred from the 1000 ms poll at core.ts:208 rather than filmed.
- **`mise` and `asdf` are not installed on this machine**, so their rows in section 4.1 are
  documentation rather than measurement. There is no wall clock number for `mise doctor`.
- **The gemini variance of 1650 ms to 6937 ms between two measurement rounds** is most likely a
  network call during startup. That cause was not confirmed by blocking the network. Only the
  variance is measured.
- **One accident is on the record.** During the field investigation the operator's real `claude` ran
  for about one second inside a scratch tmux pane on a scratch socket, before the investigator
  renamed a shim. It started and was killed with the server, and it may have touched its own state
  files. Nothing else of the operator's was written.
