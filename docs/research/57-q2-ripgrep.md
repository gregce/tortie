# Research 57, question 2, the ripgrep question

## The answer

Do not send ripgrep to a machine, and do not ask a person to install it there. Build remote search
on `git ls-files` plus the machine's own `grep`, which every machine already has. Measured on the
operator's Mac Pro over Tailscale, that answers a search of a 33 MB tracked corpus in 0.21 s end to
end, of which 0.035 s is the connection. Ripgrep on the same corpus takes 0.019 s, so shipping it
would save 0.15 s and would cost a new write door, a second architecture problem and a new
confirmation surface. The saving is not worth any of those.

The operator named vendoring as the possible answer. It is not, and the reason is specific rather
than general. Tortie already vendors ripgrep for THIS Mac and that was right. The remote case is a
different problem, because the binary would have to run on the other computer.

## Part 1, how tmux is vendored today, measured

| Fact | Value | Where it is decided |
| --- | --- | --- |
| Source of the binary | built from source, not downloaded | `build/build-tmux.mjs` |
| Pin | tmux 3.7b, libevent 2.1.12-stable, utf8proc 2.10.0, each by SHA-256 | `build/tmux-release.json` |
| Who runs the build | the `beforePack` hook, and `npm run vendor:tmux` by hand | `build/before-pack.cjs`, `electron-builder.yml` key `beforePack` |
| Where electron-builder puts it | `extraResources` entry `build/vendor/tmux/bin/tmux` to `bin/tmux` | `electron-builder.yml` |
| Path in the shipped app | `Tortie.app/Contents/Resources/bin/tmux` | same entry |
| Who resolves it at run time | `planTmuxResolution` in `src/main/tmux/resolve.ts`, called by `resolveTmux` | that module |
| The packaged rule | a packaged app uses the bundle copy and nothing else. PATH is not read, Homebrew is not probed, `GMUX_TMUX_BIN` is refused | `planTmuxResolution`, the `if (packaged)` branch |
| Size, as built | 1,437,872 bytes | `build/tmux-release.json` note |
| Size, once signed | 1,456,160 bytes, measured this session | `release/mac-arm64/Tortie.app/Contents/Resources/bin/tmux` |
| Signing cost in bytes | 18,288 bytes, 1.27 percent | the two numbers above |
| Who signs it | `build/sign-nested-binaries.cjs`, at `afterPack`, inside out | `NESTED_BINARIES` in that file |
| Identity on the shipped copy | `Developer ID Application: Gregory Ceccarelli (4GRQMF5T5U)`, identifier `com.itavero.tortie.tmux`, hardened runtime flag `0x10000` | `codesign -dvv`, measured this session |
| What keeps the whole-bundle walk off it | `mac.signIgnore` entry `/Resources/bin/tmux$` | `electron-builder.yml` |
| Notarisation | env gated, never forced. The release gate is `build/verify-signed.mjs --expect-notarized` | `electron-builder.yml` header |
| Share of the DMG | 1,456,160 of 174,734,051 bytes, 0.83 percent | `release/Tortie-0.18.2-arm64.dmg` |

Ripgrep rides the same way and is already in the bundle. It is `@vscode/ripgrep` 1.18.0, resolved by
`rgBinaryPath` in `src/main/search/resolve.ts`, unpacked by the `asarUnpack` pattern
`**/@vscode/ripgrep-*/bin/*`, and signed by the same hook as identifier `com.itavero.tortie.rg`.
Measured this session: 4,528,512 bytes in `node_modules`, 4,546,784 bytes in the packed app, so
signing costs 18,272 bytes. It reports `ripgrep 15.0.0 (rev 3a612f88b8)` with `+pcre2` and NEON.

**The one fact that ends the vendoring analogy.** The bundled tmux and the bundled rg are both
`Mach-O 64-bit executable arm64`, and `electron-builder.yml` builds `arch: [arm64]` only. They run on
this Mac. A search on another machine runs on the other machine.

## Part 2, what the far side actually has, measured

Probed on 2026-08-19 at `gdc@gregs-mac-pro.tail2ddfe1.ts.net`, read only.

| Fact | Value |
| --- | --- |
| Kernel and arch | `Darwin 24.6.0 ... RELEASE_ARM64_T6020 arm64` |
| macOS | 15.7.7, build 24G720 |
| CPU and cores | Apple M2 Ultra, 24 cores, 68,719,476,736 bytes of memory |
| `command -v rg` | nothing. ripgrep is NOT installed |
| Homebrew | present, and `/opt/homebrew/bin` holds exactly 1 file, `brew`. No formula is installed |
| `command -v grep` | `/usr/bin/grep`, `grep (BSD grep, GNU compatible) 2.6.0-FreeBSD` |
| `command -v find` | `/usr/bin/find` |
| `git --version` | `git version 2.39.5 (Apple Git-154)` |
| PATH under a non-interactive ssh command | `/usr/bin:/bin:/usr/sbin:/sbin` |
| Login shell PATH | holds no `/opt/homebrew/bin` and no `rg` |
| Round trip latency | `ping` 5 packets, min 5.979 ms, avg 6.351 ms, max 7.131 ms |

Tortie sends every script as `/bin/sh -c` (`composeRemoteScriptCommand` in
`src/main/machines/remote-run.ts`), which is not an interactive shell, so a `grep` alias or shell
function in the person's profile cannot change what runs. The `grep` a script names is the one on
the four-directory PATH above.

## Part 3, the numbers

All times are medians of three or more runs with a warm page cache.

### Connection cost, warm and cold

| Shape | Time |
| --- | --- |
| ssh with no multiplexing, `true` | 186 to 269 ms |
| ssh opening the ControlMaster | 122 ms |
| ssh reusing the ControlMaster, `true` | 29 to 37 ms |
| ssh reusing it, `find -maxdepth 2` returning 27,541 bytes | 37 to 144 ms |

Tortie sets `ControlMaster=auto` with `ControlPersist=60s` in `sshOptions`
(`src/main/machines/ssh.ts`), so the steady state number is 29 to 37 ms.

### Scan cost, the same corpus on both machines

`/usr/share`, 243,436 KB, 15,581 files, searched for `getaddrinfo`, 26 matching lines on both.

| Machine | Tool | Time |
| --- | --- | --- |
| Mac Pro, M2 Ultra | `/usr/bin/grep -rIn` | 0.77 s on all three runs |
| This Mac, M4 Pro | `/usr/bin/grep -rIn` | 0.727 to 0.824 s |
| This Mac, M4 Pro | bundled `rg -n --no-ignore --hidden` | 0.25 to 0.28 s |

The two machines are within 5 percent of each other on the same corpus with the same tool, so a
number measured on this Mac carries to the Mac Pro.

### The measurement that decides it

Corpus: the Tortie repository, 1,571 tracked files, 33,023,414 bytes of tracked text, inside a
working tree of 4,029,196 KB and 33,234 files.

| Strategy | Time | Matching lines |
| --- | --- | --- |
| `git ls-files -z \| xargs -0 /usr/bin/grep -In` | 174 to 176 ms | 14 |
| bundled `rg -n` with its default ignore rules | 16 to 58 ms | 14 |
| `find` with hand written prunes, then `grep` | 366 to 753 ms | 19, and 5 of them are wrong |
| `/usr/bin/grep -rIn` over the whole tree | 3,651 to 7,141 ms | 24, and 10 of them are wrong |

`git ls-files` plus `grep` returns the SAME 14 lines ripgrep returns. The hand written prune list
does not, because it cannot know what `.gitignore` says. That is the whole reason ripgrep looks fast
on a working tree: it is not scanning faster, it is scanning less. Git already knows the same thing
and answers in 36 to 39 ms on the far side.

A broad pattern behaves the same. Searching the same corpus for `session` gives 14,108 lines and
1,976,075 bytes from `git ls-files` plus grep in 171 to 184 ms, against 14,104 lines and 2,003,879
bytes from ripgrep in 25 ms.

### Where grep stops being interactive

A synthetic corpus of the tracked text repeated, measured on this Mac.

| Corpus | `/usr/bin/grep -rIn` | bundled `rg --no-ignore` | ratio |
| --- | --- | --- | --- |
| 34.7 MB, 1,571 files | 170 ms | 19 ms | 8.8 |
| 174 MB, 7,855 files | 852 ms | 113 ms | 7.5 |
| 347 MB, 15,710 files | 1,699 ms | 387 ms | 4.4 |
| 1,041 MB, 47,130 files | 5,178 ms | 2,145 ms | 2.4 |

`grep` crosses one second at about 200 MB of tracked text. `rg` crosses it at about 700 MB. A
repository with more than 200 MB of tracked text exists, and none of the operator's do. How common
it is across a fleet is unmeasured.

### Link throughput, which prices option D

| Pull | Bytes | Time | Rate |
| --- | --- | --- | --- |
| `tar` of `/usr/share` | 528,640,000 | 41.42 s | 12.8 MB/s |
| `tar` of `/usr/share`, second run | 528,640,000 | 38.23 s | 13.8 MB/s |
| `tar` of one repository's tracked files | 8,028,160 | 398 to 702 ms | 11.4 to 20.2 MB/s |

### What sending a binary would cost through the door that exists

The exec plane sends one command as one argument of the far side's `/bin/sh`, capped at
`REMOTE_SCRIPT_MAX_BYTES = 131_072` in `src/main/machines/remote-scripts.ts`.

| Fact | Value |
| --- | --- |
| rg, as signed and shipped | 4,546,784 bytes |
| rg, base64 encoded | 6,038,016 bytes, a factor of 1.3333 |
| Largest base64 payload that fits one command | 130,960 bytes, measured against the real cap |
| Chunks needed | 47 |
| One full size chunk, round trip to the Mac Pro | 48 to 140 ms, median 55 ms |
| Serial cost of 47 chunks | 2.6 s |

The existing write script `image-put` cannot do this. It has one payload parameter, refuses a
destination that already exists (`[ -f "$f" ]`), and has no append. Moving a binary needs a new
`mode: 'write'` script with chunked append, which takes the count of write scripts from two to
three and changes what rule 6 of that file's header says.

Gatekeeper is not the obstacle. Measured this session by base64 encoding the packed rg, decoding it
to a fresh path and running it: the Developer ID signature survives, `codesign -dvv` still reports
`com.itavero.tortie.rg` and `Developer ID Application: Gregory Ceccarelli (4GRQMF5T5U)`, `xattr -l`
shows no `com.apple.quarantine`, and `rg --version` runs. The obstacles are architecture, the door
and the confirmation, not the signature.

## Part 4, the ruling, with the deciding reason on every row

| Option | Verdict | Deciding reason |
| --- | --- | --- |
| **A. Ship a ripgrep in the bundle and send it to the machine** | **Refused** | It buys 0.15 s on a real corpus and costs a third write script, a 47 chunk transfer protocol, a per architecture binary matrix, a sixth confirmation field and a directory of Tortie-placed executables on the person's computer. The one machine measured is arm64 macOS and would need the copy already in the bundle. Any other machine would need a binary that is not in the bundle at all, and the bundle is built `arch: [arm64]`. |
| **B. Require the person to install ripgrep there, and refuse honestly until they do** | **Refused as the primary mechanism, kept as an optional accelerator only if part 3's 200 MB line is ever crossed** | The machine measured has Homebrew installed with zero formulae, so the honest refusal would be the state the operator sees on his own hardware. Refusing a feature that `git ls-files` plus `grep` answers in 0.21 s is a worse product than shipping the 0.21 s answer. |
| **C. Use what every machine already has, being `git ls-files` and `grep`** | **Adopted** | It returns the same 14 lines ripgrep returns, in 174 to 176 ms of scan plus 29 to 37 ms of connection, on a machine with nothing installed. It adds one `mode: 'read'` script to a catalogue of twelve and no new write, no new binary, no new confirmation field and no architecture matrix. |
| **D. Run the search on this Mac over pulled file contents** | **Refused** | The link runs at 11.4 to 20.2 MB/s. Pulling the 33 MB tracked corpus once costs 2.4 s, which is 14 times the 0.176 s of searching it in place, and it must be repeated or invalidated every time the agent on the far side writes a file. It also copies a person's source onto a second computer to answer a question that did not need the bytes to move. |

### The fallback inside option C, and it is named rather than hidden

`git ls-files` answers only inside a git repository. A remote project directory that is not a
repository has two honest answers.

| Case | Behaviour |
| --- | --- |
| Directory is inside a git repository | `git ls-files` supplies the file list. 174 to 176 ms on 33 MB. This is the normal case, because a remote Tortie session is a project. |
| Directory is not a repository | Fall back to `find` with the same prune list `tree-list` already uses, then grep. Measured at 366 to 753 ms on the same tree, and the answer includes build output the person did not want. Show the result and say plainly that the folder is not a repository so nothing is being skipped. |
| Directory is not a repository and is large | The `head -n` cap the search script carries ends it. Say the search was cut short and give the number. |

### Regex dialect, which is a real difference and must be stated in the UI

| Pattern feature | bundled `rg` | far side `/usr/bin/grep -E` |
| --- | --- | --- |
| Alternation, classes, anchors | yes | yes |
| `\b` word boundary | yes | yes, measured |
| `\d` | yes | yes on this BSD grep, measured. Not guaranteed on a Linux `grep` |
| Lookahead `(?=…)` | no, `regex parse error` without `-P` | no |
| Non greedy `.*?` | yes | matched, but as ERE it is not the same operator |

The two engines are close but not identical. Local search must keep using ripgrep, because the local
search already shipped and is faster. A remote search runs a different engine, and the panel must say
which. The honest sentence is one line under the field, e.g. "This search runs on <machine> using its
own grep."

## Part 5, where a sent binary would land, who confirms it, and the refusal

This section answers the charter even though option A is refused, because a later round must not
reopen it by assuming the answer was never worked out.

**Where it would land.** The only precedent in the tree is `IMAGE_PUT` in
`src/main/machines/remote-scripts.ts`, which writes under `$HOME/.tortie/images`, creates the
directory with `chmod 700` and the file with `chmod 600`, decodes to `$f.part.$$` and moves it into
place. A binary would land at `$HOME/.tortie/bin/rg` with mode 700, and would need a SHA-256 check
before the move, because a truncated binary that is executable is worse than no binary.

**Who confirms it.** `MachineExecutionFields` in `src/main/machines/confirm.ts` holds exactly five
fields today, being `host`, `user`, `port`, `remoteTmuxPath` and `acceptedTmuxVersion`. They are
hashed under `MACHINE_EXECUTION_HASH_ALGORITHM = 'sha256-machine-exec-v1'` and a person confirms the
hash once, out of band. `remoteTmuxPath` is the exact precedent: a path on the other computer that
decides what runs there is an execution bearing field, so a `remoteRipgrepPath` would be a sixth one,
and the confirmation would have to be taken again on every machine that already exists.

**How the refusal applies.** CLAUDE.md's refusal 8 is that nothing may cause a process to start on a
configuration change alone, and that a human confirms the bytes out of band of any agent turn. A
Tortie that places an executable on another computer and then runs it has done exactly the thing the
refusal names, and it has done it on a computer nobody is looking at. The refusal does not forbid it
outright, because a confirmed field is the sanctioned path. It forbids doing it without one. Option
A therefore cannot be a quiet convenience. It is a confirmation sheet, a hash change on every
existing machine, and a person agreeing that Tortie may put a program on their computer. That price
is correct for tmux, which is the durability layer and has no substitute. It is not correct for a
0.15 s saving over a program the machine already has.

**The architecture answer.** `@vscode/ripgrep` 1.18.0 publishes 12 platform packages, being
`darwin-x64`, `darwin-arm64`, `win32-x64`, `win32-arm64`, `win32-ia32`, `linux-x64`, `linux-arm64`,
`linux-arm`, `linux-ppc64`, `linux-riscv64`, `linux-s390x` and `linux-ia32`. Tortie's bundle contains
one of them, `darwin-arm64`, because npm installs the optional dependency for the build platform and
`electron-builder.yml` targets `arch: [arm64]`. So the product would either carry binaries for
machines it has never met, or discover the far side's platform first and then have nothing to send.
What the product does then, under option A, is refuse, which is option B wearing a heavier coat. The
sizes of the other 11 packages are unmeasured.

## Part 6, the phase this rules for

One phase, one script, `mode: 'read'`, five parameters.

| Item | Value |
| --- | --- |
| New script id | `repo-grep` |
| Mode | `read`, so rule 5 of `remote-scripts.ts` applies unchanged and no `>` appears outside `2>/dev/null` |
| Parameters | the directory, the pattern, the case flag, the match cap, the per line character cap |
| Shape | `cd "$1"`, then `git ls-files -z` if `git rev-parse` succeeds, else `find` with the `tree-list` prune, then `xargs -0 grep -In`, then `head -n "$4"` |
| Verbs it adds | `rev-parse` only, which rule 7 already permits |
| Write scripts after this phase | still two, `image-put` and `git-clone` |
| Measured budget | 0.21 s end to end on 33 MB, 0.89 s on 174 MB |
| Cap needed | a `head -n` cap and a per line character cap, because a broad pattern produced 1,976,075 bytes of answer and the link runs at 13 MB/s |

The renderer already caps a local search through `SEARCH_LIMITS` in `src/shared/ipc`, read by
`src/main/search/args.ts`. A remote search reuses those numbers rather than inventing new ones.

## What is not measured

1. **No Linux machine was contacted.** Every remote number is the operator's arm64 macOS Mac Pro. A
   Linux `grep` is GNU grep, which is faster than BSD grep and has a different escape dialect, so the
   scan numbers are a ceiling rather than a floor and the dialect table's `\d` row may differ.
2. **No repository larger than 33 MB of tracked text was searched over a real link.** The 174 MB and
   1,041 MB rows are a synthetic corpus on this Mac. The Mac Pro's largest git repository has 1,096
   tracked files and 7,073,526 bytes.
3. **The sizes of the other 11 `@vscode/ripgrep` platform packages are unmeasured.** Only
   `darwin-arm64` is installed.
4. **Notarisation was not run this session.** The signature facts come from
   `release/mac-arm64/Tortie.app`, which `codesign -dvv` reports as Developer ID signed with a
   timestamp of 2026-08-16. Whether that build was notarised was not checked, because
   `build/verify-signed.mjs --expect-notarized` was not run.
5. **The 47 chunk transfer was priced from one chunk, not run to completion.** One full size chunk
   was sent and its length echoed. No binary was written to the Mac Pro, and nothing was written
   there at all.
6. **The crossover at about 200 MB is interpolated between the 174 MB and 347 MB rows.** It was not
   measured at the crossing point.
7. **Concurrency was not measured.** Every number is one search at a time. What two searches to the
   same machine over one multiplexed connection cost is unknown.
