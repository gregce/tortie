# Research 59. The SpecStory entitlement spike

Charter, the "## Research 59" entry in docs/BACKLOG.md. All measurements in this document were made on 2026-08-20 on this machine (macOS 15.7.9 build 24G830, arm64), against copies of the vendored binary in scratch space with a scratch HOME. Nothing under the operator's HOME, manifest or installed app was touched, with two hygiene slips named in section 8. Where a line number appears it is a courtesy next to a symbol, and the symbol is the claim.

## 0. The answer

Sign the bundled SpecStory binary with exactly one entitlement, `com.apple.security.cs.allow-unsigned-executable-memory`, applied to `Resources/bin/specstory` only, with the hardened runtime flag kept on. The reproduction in question 1 succeeded. The ad hoc hardened copy of the vendored 2.8.0 binary dies on this machine with the exact crash fields of github issue 10, on both the `sync` path and the `run` wrapper path, and the same copy signed with that one entitlement survives both paths and writes redacted markdown. `allow-jit` alone does not stop the kill, measured. The cause is redaction. Every session save runs the betterleaks secret scanner, which runs re2 as wasm through wazero, and wazero turns writable anonymous memory into executable memory, which the hardened runtime forbids without that entitlement. The pin moves to v2.10.0 with no code change under src/main/specstory, because all three shapes Tortie depends on hold on 2.10.0 and it pins the identical wazero version. The wrapper failure diagnostics (the log line and the on-screen copy naming SpecStory instead of the agent) land inside Phase 115. The bare agent recovery verb is its own phase after 115, at Tier 3 because it edits restore and lifecycle code. One thing only the operator's signed notarized build can prove is the ticket's soak, and it stays a step in his promotion checklist. No decision in this document needs his word before the queue moves.

## 1. The reproduction, measured on this machine

The issue. `gh issue view 10 --repo gregce/tortie` plus both comments (author aronchick), read in full. Reporter on Tortie 0.31.0, macOS 26.5.2. Fields in his reports were `EXC_BAD_ACCESS`, `SIGKILL (Code Signature Invalid)`, `termination.namespace: CODESIGNING`, `termination.indicator: Invalid Page`, procPath the bundled specstory.

The binary. A copy of `/Users/gdc/gmux/build/vendor/specstory/bin/specstory` (materialised by `ensureSpecstoryBinary` in build/fetch-specstory.cjs). Its sha256 is `f26e94a1c8007a2de401aa5277eae386a7401905479baf5c68d19111bad64648` at 43189586 bytes, equal to `binarySha256` and `binaryBytes` in build/specstory-release.json (pin v2.8.0). As vendored it is only linker-signed ad hoc (`Identifier=a.out`, `flags=0x20002(adhoc,linker-signed)`), with no CS_RUNTIME flag, which is why `smoke:capture` can never see this kill.

The A/B. Five copies, each ad hoc signed, driven through the same two paths in a scratch HOME with a planted Claude session carrying test secrets. The `sync` drive was `specstory sync claude --no-cloud-sync --no-version-check` in a project directory. The `run` drive was the shape `wrapArgv` in src/main/specstory/wrap.ts composes, with a driver that appends a record to the watched session file so the save path fires.

| Signature on the copy | `sync` exit | `run` exit | Markdown written | Crash report |
|---|---|---|---|---|
| ad hoc, no hardened runtime (as vendored) | 0 | not driven | yes, with `[REDACTED:slack-bot-token]` | none |
| hardened runtime, no entitlements (shipped shape) | 137 (SIGKILL) | 137 (SIGKILL) | no | CODESIGNING, Invalid Page |
| hardened runtime plus allow-jit only | 137 (SIGKILL) | 137 (SIGKILL) | no | CODESIGNING, Invalid Page |
| hardened runtime plus allow-unsigned-executable-memory only | 0 | 0 | yes | none |
| hardened runtime plus both keys | 0 | not driven | yes | none |

The crash reports (8 `.ips` files this session under `~/Library/Logs/DiagnosticReports`, all read) carry `termination.namespace: CODESIGNING`, code 2, `indicator: Invalid Page`, `EXC_BAD_ACCESS` with `SIGKILL (Code Signature Invalid)`, `codeSigningID: com.itavero.tortie.specstory`, `codeSigningFlags: 0x23013311` with CS_RUNTIME set, and a faulting PC at byte 784 of an anonymous `VM_ALLOCATE` region belonging to no file-backed image. That matches the issue field for field. The `[REDACTED:slack-bot-token]` line in every surviving run proves the surviving copies executed the same generated code the killed copies died on.

The sharp trigger. A clean session syncs fine under the shipped shape. The kill fires only when content carries secret-shaped text, because the scanner prefilters before invoking the wasm engine. This is why every static gate and `--version` probe passes, why the reporter's sessions ran for a while before dying, and why the kill recurs on every retry over the same content.

## 2. The mechanism, read from source

The vendored binary embeds `github.com/tetratelabs/wazero v1.12.0` and `github.com/betterleaks/go-re2 v1.11.0-betterleaks.3` (`go version -m`, corroborated by strings counts I re-measured myself, being 3311 lines matching `tetratelabs/wazero` and 1 fully qualified `platform.MmapCodeSegment` reference). The code path is redaction. `getDetector` in pkg/redact/redact.go of the specstory-cli source sets `regexp.SetEngine(re2.RE2{})`, `RedactContent` is called at every markdown save in pkg/session/session.go, and `IsRedactionEnabled` in pkg/config/config.go defaults to on. The redact call sites and the engine line exist at both the v2.8.0 and v2.10.0 tags.

Why `allow-jit` is inert here. In wazero v1.12.0 at the pinned version, `mmapCodeSegment` (internal/platform/mmap_other.go, the darwin build tag) maps anonymous memory read-write with no `MAP_JIT`, and `MprotectCodeSegment` (internal/platform/mmap_unix.go) then flips it to read-execute. The module has 0 hits for `MAP_JIT` or `pthread_jit` outside tests. `allow-jit` licenses only `MAP_JIT` mappings. `allow-unsigned-executable-memory` licenses exactly wazero's sequence, and the measurement in section 1 agrees with the source reading. The compiled wasm cache the lab HOME accumulated under `Library/Caches/com.github.wasilibs/wazero-v1.12.0-arm64-darwin/` is direct evidence wazero ran.

Why the sign hook believed zero entitlements were safe. The header of build/sign-nested-binaries.cjs argues from `otool -L` showing only Apple dylibs, which covers library validation and nothing else. The word "entitlements" appears on 2 lines of that file (the `ENTITLEMENTS: none` paragraph and the `ZERO entitlements are needed` note, verified by my own grep this session), and both lines are now false for specstory. Phase 115 rewrites both.

## 3. Notarization and the boundary

The hardened runtime flag stays on. Notarization requires it, and the surviving A/B copy ran with the flag on. The entitlement change is expected not to affect notarization, and that is an inference, not a measurement. The supporting facts are that `git show v0.31.0:build/entitlements.mac.plist` carries `allow-unsigned-executable-memory`, so Apple's service accepted this key for this app's own executables in the build the reporter runs, and that nothing here adds an unsigned or non-hardened Mach-O. Acceptance of the key on a nested Resources/bin binary is proven only at the operator's signed build step. Refusal 6 holds. The set contains no `disable-library-validation`, and it is applied per binary, never app wide. Do not copy the Electron plists. Their `allow-jit` and `allow-dyld-environment-variables` keys are Electron's needs, not this binary's.

## 4. The pin moves to v2.10.0

The verdict. Bump with no code change under src/main/specstory. The three measured shapes from the 2.8.0 era hold on the real 2.10.0 binary, driven in a scratch HOME with a scratch cwd.

| Shape | Symbol it backs | 2.10.0 result |
|---|---|---|
| `run --help --no-version-check` prints `Available provider IDs:` | `PROVIDER_MARKER` and `parseProviderIds` in src/main/specstory/capture.ts | Holds, exit 0, 10 ids |
| `list <sentinel> --no-version-check --no-usage-analytics` | `NO_ANALYTICS` and `probeByList` in capture.ts | Holds, exit 1, sentinel echoed, 10 line list on stderr, and a bogus flag correctly produces `Unknown flag:` with no list |
| sync exit codes, unknown id 1, cwd-wide 0 | `syncSession` fallback in src/main/specstory/sync.ts | Holds, same pair as measured on 2.8.0 |

The wrap shape (`run claude --no-version-check --silent --no-cloud-sync -c '<cmd>'`, the tail `WRAP_FLAGS` composes) also runs on 2.10.0 and mirrors the inner exit code exactly (inner exit 3 gave outer exit 3), which is what the claude registry row's `exitCodeFidelity: 'exact'` asserts. Both provider probes report the identical 10 id set including `muse`, which the open-vocabulary parse from Phase 18.5 carries through unchanged. `go version -m` on the 2.10.0 binary reports the identical `wazero v1.12.0` pin, so the entitlement ruling carries to it, though the kill A/B itself drove 2.8.0.

The v2.9.0 and v2.10.0 changelog deltas, each checked against what Tortie actually reads. Tortie never reads statistics.json (0 hits for "statistics" under src/main and src/shared), never passes `--output-dir`, and uses neither `watch` nor `resume`.

| Change | Release | Code change needed |
|---|---|---|
| `--no-stats` flag | 2.9.0 | No, opt in, Tortie never reads the file |
| `--config-dir` flag | 2.9.0 | No, the default location Tortie relies on is unchanged without the flag |
| `--user-data-dir` flag | 2.9.0 | No, IDE providers only, which `providerIdFor` keeps out |
| statistics.json written during run and targeted sync | 2.9.0 | No, one more untracked file in a captured project, shown by SCM like any file |
| `.project.json` follows `--output-dir` | 2.9.0 | No, Tortie never passes the flag |
| `output_dir` honored by watch and resume | 2.10.0 | No, Tortie uses neither verb |
| Codex 0.147.0+ session format read | 2.10.0 | No, and this is the argument for bumping, because captured codex sessions stopped saving bodies under the 2.8.0 pin once the user upgraded Codex |
| No re-save of existing sessions at run startup | 2.10.0 | No, the wrap cares only that run execs the argv and mirrors the exit |
| Muse provider added | 2.10.0 | No, a muse agent with no registry row surfaces as discovered with collapsed fidelity by design |
| Windows and WSL assets | 2.9.0 | No, the pinned darwin-arm64 asset name is unchanged |

Stale prose to touch when the pin bumps, comments only. The three "verified on 2.5.0, 2.6.0 and 2.8.0" comments near `PROVIDER_MARKER`, `NO_ANALYTICS` and `parseProviderList` in capture.ts now also hold on 2.10.0. The `syncSession` doc in sync.ts quotes `no session found for UUID`, and 2.10.0 words that failure as `Session '<id>' not found in Claude Code`. `runSync` keys only on the exit code and forwards stderr opaquely, so this is prose drift, not behavior.

## 5. The wrapper failure, diagnostics and recovery

What is true today, checked in this tree. `newSession` in src/main/tmux/sessions.ts pushes `'--', ...argv`, so tmux execs `argv[0]` directly, and for a captured session `wrapArgv` puts specstory there. A `pane_dead_signal` on a captured pane therefore always describes the specstory process, never the agent, because the wrapper mirrors the inner exit as a code. The warn in `reapDeadSession` (src/main/sessions/core.ts) carries 7 fields and none names SpecStory, even though `rec.specstory` is on the same row. The renderer strings in src/renderer/app/status.ts (`endedTitle`, `statusVisual`, `fastDeathTitle`, and the `exitDetailNote` sentence that a restart "may well succeed") all blame the agent. `Session.capture` already crosses the bridge, so the renderer needs no new field to do better.

The death reason already survives the failed sync, by construction. The `SyncQueue` outcome handler in core.ts writes no manifest field on any arm. Note the handler's true shape, verified this session against an earlier misdescription. It returns early when the outcome is ok, logs one warn on failure, and returns before the toast broadcast when the session row is gone from the manifest or the outcome message is null. The pinning test must assert the absence of any `updateSession` call, not the presence of the toast.

Two corrections to how this half was first reported, both confirmed against the tree by me. The second harvest site that arms a wrapped resume is `relaunchWrapped` in src/main/sessions/launch-plan.ts, and the symbol `armLaunchPlan` does not exist. And "Restart dies identically" holds only when the bundled binary is the newest resolved copy, because `resolveSpecstory` prefers a newer installed CLI, so a user with a healthy Homebrew specstory would survive Restart today.

The recovery half. `armableResumeArgv` in src/main/restore/restore.ts reaches its re-wrap and bare-agent arms only when the recorded `capture.bin` no longer exists, and the bundled bad binary always exists, so neither Restore nor Restart can decline capture by choice today. Making that a choice needs a change to the `sessions:restore` contract in src/shared/ipc, the derived preload bridge, an option on `restartSession`, a secondary action on the exited card, and the native menu edit the UI rules require. No honest file count exists yet, and the phase brief must enumerate the files rather than estimate them. One fact lowers the urgency. After Phase 115 the healed binary sits at the same recorded absolute path, so both verbs succeed with no recovery affordance. The affordance is insurance against the next bad wrapper.

## 6. The release gate, three layers

Why every existing gate is blind today, each checked in this tree. Both codesign branches of `signNestedBinaries` pass `--options runtime` and no `--entitlements`. `verifyApp` in build/verify-signed.mjs reads entitlements exactly once, on the app bundle only, as a containment check, and its nested loop asserts 4 properties per row with no entitlement read. durability.yml and gates.yml opt out of signing, never call verify-signed, and their packaged smoke is `GMUX_SMOKE=basic`, which has 0 specstory references. release.yml fires only on v tags and its artifact gate re-runs `verifyApp` on 3 copies, so a new nested check lands there with no workflow edit. `smoke:capture` resolves the vendored binary, which carries no CS_RUNTIME, so it structurally cannot witness this kill and must not be claimed as a gate for it.

| Layer | Can honestly assert | Cannot assert |
|---|---|---|
| Static, on the packaged bundle | The shipped specstory carries the exact minimal set and nothing broader, the other 2 nested binaries carry none, and disable-library-validation appears nowhere | Runtime survival, because codesign checks the sealed file, never a later anonymous mapping |
| Local ad hoc probe | The kill without the set and the survival with it, on the driven path, on this machine | Notarization acceptance, Gatekeeper on a real install, Developer ID behavior |
| Operator's notarized build | The ticket's soak in full, with real agent CLIs and the exact shipped bytes | Nothing further is needed |

Two honesty rules on the additions, both corrections of the first draft. The existing `existsSync` throw in the hook covers a missing nested binary only, so the guard for a missing entitlements plist must be built, not inherited. And the nested entitlement comparison must be set equality in both directions, because a containment check like the existing app-level `allow-jit` line would pass a blob that also carries `disable-library-validation`.

One cost stated plainly. Every required kill in the local probe writes a `.ips` report into `~/Library/Logs/DiagnosticReports` on the machine that runs it. This session alone left 8. The probe script should delete the reports it caused or say in its output that it left them.

## 7. Options and rulings

| Option | Ruling | Deciding reason |
|---|---|---|
| `allow-unsigned-executable-memory` alone, on `Resources/bin/specstory` only | Accepted | The only variant that survived the A/B with the smallest set, and it matches wazero's mmap then mprotect sequence exactly |
| `allow-jit` alone | Rejected | Killed with exit 137 on both paths, measured, because wazero never passes MAP_JIT |
| Both keys | Rejected | allow-jit buys nothing for this binary, measured, and the set must stay minimal |
| Copy the Electron entitlement plists to specstory | Rejected | They carry allow-jit and allow-dyld-environment-variables, which are Electron's needs, and a broader set than the binary needs |
| Any use of `disable-library-validation` | Rejected | Refusal 6, and the new verify check fails outright on it anywhere including the app |
| Drop the hardened runtime flag on specstory | Rejected | Notarization requires the flag, and check 5 of verifyApp asserts it per nested binary |
| Stay on the 2.8.0 pin | Rejected | 2.10.0 fixes codex 0.147.0+ capture, holds all three measured shapes, and changes nothing Tortie reads |
| Bump the pin to v2.10.0 | Accepted | All three shapes plus the wrap shape re-measured on the real binary, identical wazero pin |
| Diagnostics half inside Phase 115 | Accepted | Two source files plus one pinning test, no schema, IPC or bridge change |
| Bare agent recovery inside Phase 115 | Rejected | It adds a user-facing surface, an IPC contract change and native menu edits to a durability phase, and 115's own fix removes the urgent case |
| Recovery phase at Tier 2 | Rejected | It edits `armableResumeArgv` and `restartSession`, which are restore and lifecycle code, and the tier table sends those to Tier 3 without exception |
| Recovery as its own Tier 3 phase after 115 | Accepted | The insurance is real but not urgent, and the phase brief must enumerate its file list |
| Put the kill probe in CI now | Rejected | Nobody has measured whether hosted runners enforce the kill, and a probe that cannot observe its subject would pass vacuously |

## 8. What is not true and what nobody checked

What is not true, said plainly.

- The header claim in build/sign-nested-binaries.cjs that none of the three binaries needs entitlements is false for specstory, on 2 lines, and Phase 115 rewrites both.
- The `exitDetailNote` sentence that a restart "may well succeed" is wrong for this failure whenever the bundled binary is the resolved copy.
- The sync.ts comment quoting `no session found for UUID` no longer matches what 2.10.0 prints.
- No existing verifier or smoke drives a killed wrapper. The probe script in section 10 is that gate, and it does not exist yet.
- The claim that `list` writes 0 files to cwd was reported as measured, but the preserved probe directory shared a cwd with the sync drives, so the artifacts cannot prove it. Treat it as unproven until re-driven in a fresh directory. `probeByList` exists precisely because `run` writes config.toml, so this is worth the 2 minutes.

Nobody checked the following.

- Developer ID signing and notarization. The whole A/B used ad hoc signatures with CS_RUNTIME, which is the flag the kernel enforces, and the field reports match every byte, but the same A/B under a real identity and Apple's acceptance of the key on a nested binary are proven only at the operator's build step.
- macOS 26. This machine is 15.7.9. The reporter's 26.5.2 reports carry identical fields, so enforcement spans both, but no macOS 26 machine was driven.
- The shipped default argv. `wrapArgv` and `runSync` append `--no-cloud-sync` only when `GMUX_SPECSTORY_NO_CLOUD` is set (verified at `cloudDisabledByEnv` in resolve.ts this session), so the reporter's default shape runs without the flag and with a cloud leg that also calls redaction. Every drive here used the opt-out flag, a scratch HOME and no auth. The kill mechanism does not depend on the flag.
- The A/B exit codes are not archived. The lab logs hold program output only, and no file records 137 or 0. The kills are corroborated by the 8 crash reports and the survivals by the redacted markdown, so the ruling stands, but the numbers cannot be re-derived from the evidence directory.
- The 2.10.0 binary was never driven through the kill A/B. The ruling carries on the identical wazero pin, read from both binaries.
- The sync exit code universe on 2.10.0. Only 0 and 1 were observed across four invocations, only the claude provider was driven, and exit mirroring was measured for claude only.
- Whether the sync spawned against a bad binary dies by SIGKILL, and which `SyncOutcome` arm it takes. Either arm logs and writes no manifest field, so the ruling does not depend on it.
- What tmux reports when the agent inside a healthy wrapper is killed by a signal. Expected an exit code from the mirror, not a signal. A scratch tmux server on a scratch socket can measure it.
- Whether the field death lands inside the 5000 ms `FAST_DEATH_MS` window, which decides which ended card the person sees.
- Whether hosted macos runners enforce the kill. One workflow_dispatch run of the probe script would measure it.
- Whether gates.yml's `--dir` package really runs the afterPack hook. That is documented electron-builder behavior, not demonstrated this session.
- The exact prefilter mechanism in betterleaks, inferred from clean versus secret behavior, and the fate of the inner agent PID when the wrapper dies.
- The x86_64 and Windows tarball member names. Only the pinned darwin-arm64 asset was opened.
- Hygiene. Two specstory invocations this session (one `version` by an investigator and one by an adversary) ran before the scratch HOME was exported and may have touched `~/.specstory` timestamps in the real HOME. Nothing else outside scratch was written.

## 9. Decisions that need the operator's word

None. Nothing in this document blocks the queue on a question to him. Two items are his to execute rather than to decide. The notarized candidate soak in section 10 runs only on his machine, and it is already the promotion checklist step the release notes point him at. And the local kill probe leaves crash reports in the DiagnosticReports folder of whatever machine runs it, which the script will state in its output. Ruling the recovery verb out of Phase 115 amends the backlog bundle, and that amendment is inside this research round's charter discretion, so it is stated in section 10 rather than asked.

## 10. Phase 115, ready to paste

The following replaces the entitlement and gate sections of the Phase 115 backlog entry. The reproduction succeeded, so the entitlement below is proven by A/B on this machine, not assumed.

**Entitlement file.** New file `build/entitlements.specstory.plist`, exactly this content and no other key.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.cs.allow-unsigned-executable-memory</key>
	<true/>
</dict>
</plist>
```

**Sign hook change, build/sign-nested-binaries.cjs.** The specstory row of `NESTED_BINARIES` gains an optional `entitlements` field naming the plist and the expected key set, and that row is the only home of the expectation. Both codesign branches, Developer ID and ad hoc, pass `--entitlements` for rows that carry the field, with `--options runtime` unchanged. After signing, the hook reads the blob back with `codesign -d --entitlements - --xml` and fails the pack unless the decoded key set equals the row's expectation exactly, in both directions, with the empty set expected for `rg` and `tmux`. Add a throw for a missing plist file, because the existing `existsSync` throw covers missing binaries only. Rewrite both header lines that claim zero entitlements, since issue 10 falsified them for specstory.

**Verify change, build/verify-signed.mjs.** Check 5 gains a per row entitlement assertion. Decode each nested blob, compare by set equality to the expectation imported from `NESTED_BINARIES` through the existing `createRequire`, and fail outright on `com.apple.security.cs.disable-library-validation` on any binary including the app. Via `--artifacts` this lands on the loose app, the ZIP copy and the DMG copy in release.yml with no workflow edit, and it catches signIgnore drift that strips the blob after the hook ran.

**Kill probe, new build/probe-specstory-entitlement.mjs, npm script `conformance:specstory:entitlement`.** Copy the vendored binary to scratch twice. Sign copy A ad hoc with `--options runtime` and no entitlements, drive a secret-bearing sync in a scratch HOME, and REQUIRE the SIGKILL. If copy A survives, exit with a distinct "enforcement not observed on this machine" failure, never a pass. Sign copy B with the plist above and require exit 0 plus redacted markdown. Local only, in this phase's gate list and the pre-release battery. It goes into CI only after one measured workflow_dispatch run proves hosted runners enforce the kill. The script deletes the crash reports it caused or names them in its output.

**Pin block, build/specstory-release.json.** Tarball verified against the release's own checksums file, then extracted and hashed independently. The sibling `note` and `repo` fields stay as they are, and `fetch-specstory.cjs` reads every field below.

```json
"tag": "v2.10.0",
"version": "2.10.0",
"assets": {
  "darwin-arm64": {
    "name": "SpecStoryCLI_Darwin_arm64.tar.gz",
    "member": "specstory",
    "assetSha256": "a084607a2bb2dcd318c0fa4fef745678f88fadd1f9c28c247229af03b7a75488",
    "binarySha256": "c8fa81efff373bc3c948df0c2a64cb732f4da1cc3cc1ebdbe118f9e7b5e63662",
    "binaryBytes": 43358082
  }
}
```

**Stale prose in the same commit, comments only.** The three version list comments in capture.ts near `PROVIDER_MARKER`, `NO_ANALYTICS` and `parseProviderList` gain 2.10.0, and the `syncSession` doc in sync.ts drops the quoted `no session found for UUID` wording.

**Wrapper failure UX, the question 4 ruling.** Inside Phase 115, three small pieces. The `reapDeadSession` warn gains `wrapper=specstory@<binVersion>` when the row's capture record is enabled. The signal branches of `endedTitle`, `fastDeathSentence` and `exitDetailNote` in src/renderer/app/status.ts say the stopped process was SpecStory when `end.capture` is present, using fields that already cross the bridge. And one pinning test asserts the `SyncQueue` outcome handler makes no `updateSession` call, so a failed flush can never overwrite the death reason, which is true today by construction. The bare agent recovery verb (Restore or Restart without the wrapper) is NOT in 115. It is its own Tier 3 phase after 115, because it changes the `sessions:restore` contract, the preload bridge, the exited card and the native menus, and its brief must enumerate the exact file list. This amends the Phase 115 backlog entry, whose "leaves a bare agent recovery path" item moves out to that phase.

**Operator soak, docs/research/27-release-and-updates.md section 3.7 step 5.** From the mounted notarized DMG candidate, run, end and sync a captured claude session and a captured codex session at least 3 times each with secret-bearing content, then check that `~/Library/Logs/DiagnosticReports` gained no specstory `.ips` file, that the log shows no CODESIGNING or Invalid Page line, and that the sync exit codes match what sync.ts documents. This is the only layer that proves notarization acceptance on the nested binary, and it is never simulated on CI.

**Evidence directories.** Lab artifacts at docs/research/assets/r59-lab/ (23 files, 2.6 MB, logs, plists, driver, redacted markdown, binary copies deleted) and the 2.10.0 probe outputs at docs/research/scratch-i3/ in the research worktree.
